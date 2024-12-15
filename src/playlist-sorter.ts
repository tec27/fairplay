import EventEmitter from 'eventemitter3'
import { ReadonlyDeep } from 'type-fest'
import {
  CurrentlyPlayingJson,
  fromCurrentlyPlayingJson,
  fromPlaylistItemsJson,
  PlaylistItem,
  PlaylistItemsJson,
  SpotifyAuthToken,
} from './spotify-api'
import { timeout } from './timeout'

/** How often to refresh the currently playing song when in continuous sort mode. */
const CURRENT_SONG_REFRESH_INTERVAL_MS = 30 * 1000
/** How many songs to keep ordered when in continuous mode. */
const CONTINUOUS_SONGS_TO_REORDER = 3
/** How long to keep checking for the playlist to be active (when inactive) before shutting off. */
const INACTIVE_TIMEOUT_MS = 60 * 60 * 1000

export interface ReorderOp {
  /** The index of the track to reorder. */
  from: number
  /** The index to insert the track before. */
  insertBefore: number
}

/**
 * Finds the next reordering to make the playlist more even. If the playlist is already even, then
 * `undefined` will be returned.
 */
export function findNextReorderOp(
  items: ReadonlyDeep<PlaylistItem[]>,
  startAt: number = 1,
): ReorderOp | undefined {
  if (startAt >= items.length) {
    return undefined
  }

  let pos = startAt
  do {
    // First, figure out how much each user has already played. While doing this, we also figure out
    // which users have remaining songs in the playlist and track where the first one is
    const playedTimes = new Map<string, number>()
    const firstRemainingSongs = new Map<string, number>()
    for (let i = 0; i < items.length; i++) {
      const user = items[i].addedBy.id
      if (i < pos) {
        playedTimes.set(user, (playedTimes.get(user) ?? 0) + items[i].track.durationMs)
      } else {
        if (!playedTimes.has(user)) {
          playedTimes.set(user, 0)
        }
        if (!firstRemainingSongs.has(user)) {
          firstRemainingSongs.set(user, i)
        }
      }
    }
    if (playedTimes.size === 1) {
      // Only one user in the list, nothing to sort
      return undefined
    }
    const sortedPlayedTimes = Array.from(playedTimes.entries())
      .sort((a, b) => a[1] - b[1])
      .filter(e => firstRemainingSongs.has(e[0]))

    let maxLookingIndex = 0
    for (let i = 1; i < sortedPlayedTimes.length; i++) {
      if (sortedPlayedTimes[i][1] === sortedPlayedTimes[0][1]) {
        maxLookingIndex = i
      } else {
        break
      }
    }
    // All of the users that we could move to the front of the playlist
    const lookingFor = new Set(sortedPlayedTimes.slice(0, maxLookingIndex + 1).map(e => e[0]))
    const nextUser = items[pos].addedBy.id
    if (lookingFor.has(nextUser)) {
      // The next track was from a user that needs more songs for the playlist to be "even", so
      // this is in the "correct" position already
      pos++
      continue
    } else {
      // This user already has more songs than other users, find the next track from any that
      // we're looking for and insert it here
      const sortedRemainingTracks = Array.from(lookingFor, u => firstRemainingSongs.get(u)!).sort()
      return { from: sortedRemainingTracks[0], insertBefore: pos }
    }
  } while (pos < items.length)

  return undefined
}

export interface PlaylistSorterEvents {
  activeChange: (active: boolean) => void
  statusChange: (status: string) => void
  complete: () => void
  error: (error: Error) => void
}

export enum PlaylistSortMode {
  OneTime = 'one-time',
  Continuous = 'continuous',
}

export class PlaylistSorter extends EventEmitter<PlaylistSorterEvents> {
  private operationPromise: Promise<void> = Promise.resolve()
  private abortController: AbortController = new AbortController()

  constructor(
    readonly authToken: SpotifyAuthToken,
    readonly playlistId: string,
    readonly mode: PlaylistSortMode,
  ) {
    super()
  }

  start() {
    this.abortController?.abort()
    this.abortController = new AbortController()
    const signal = this.abortController.signal
    this.emit('statusChange', 'initializing…')

    this.doOperation(async () => {
      signal.throwIfAborted()
      if (this.mode === PlaylistSortMode.OneTime) {
        const { playlistItems, snapshotId } = await this.retrievePlaylistItems(signal)
        this.doOperation(() => this.doOneTimeSort({ signal, playlistItems, snapshotId }))
      } else if (this.mode === PlaylistSortMode.Continuous) {
        this.doOperation(() => this.doContinuousSort({ signal }))
      } else {
        this.mode satisfies never
      }
    })
  }

  stop() {
    this.emit('statusChange', 'stopped')
    this.emit('activeChange', false)
    this.abortController?.abort()
  }

  private doOperation(fn: () => Promise<void>) {
    this.operationPromise = this.operationPromise
      .then(() => {
        this.emit('activeChange', true)
        return fn()
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          this.emit('error', err)
        } else {
          this.emit('statusChange', 'stopped')
        }
      })
      .finally(() => {
        this.emit('activeChange', false)
      })
  }

  private async doOneTimeSort({
    signal,
    playlistItems,
    snapshotId: lastSnapshotId,
  }: {
    signal: AbortSignal
    playlistItems: PlaylistItem[]
    snapshotId: string
  }) {
    let pos = 1
    const items = playlistItems.slice()
    const ops: ReorderOp[] = []
    this.emit('statusChange', 'planning operations…')
    while (true) {
      const op = findNextReorderOp(items, pos)
      if (!op) {
        break
      }

      ops.push(op)
      pos = op.insertBefore + 1

      const [removed] = items.splice(op.from, 1)
      items.splice(op.insertBefore, 0, removed)
    }

    let completed = 0
    const total = ops.length
    let snapshotId: string | undefined = lastSnapshotId
    for (const op of ops) {
      signal.throwIfAborted()
      if (completed > 0) {
        await timeout(200, signal)
      }
      this.emit('statusChange', `reordering ${completed + 1} of ${total}…`)

      // NOTE(tec27): No idea why TS is erroring on this without the type ??
      const response: { snapshot_id: string } | undefined = await this.authToken.fetch<{
        snapshot_id: string
      }>(`/playlists/${encodeURIComponent(this.playlistId)}/tracks`, {
        method: 'PUT',
        signal,
        body: JSON.stringify({
          range_start: op.from,
          range_length: 1,
          insert_before: op.insertBefore,
          snapshot_id: snapshotId,
        }),
      })

      snapshotId = response?.snapshot_id

      completed++
    }

    signal.throwIfAborted()

    this.emit('statusChange', 'done!')
    this.emit('complete')
  }

  private async doContinuousSort({ signal }: { signal: AbortSignal }): Promise<void> {
    let playlistLastActive = performance.now()
    while (true) {
      signal.throwIfAborted()

      this.emit('statusChange', 'fetching playlist items…')
      const { playlistItems, snapshotId: lastSnapshotId } = await this.retrievePlaylistItems(signal)
      this.emit('statusChange', 'checking current playback position…')
      const playlistPosition = await this.retrievePlaylistPosition({ signal, playlistItems })

      if (playlistPosition !== undefined) {
        playlistLastActive = performance.now()
        // Sort the next few songs
        let pos = playlistPosition + 1
        const items = playlistItems.slice()
        const ops: ReorderOp[] = []
        this.emit('statusChange', 'planning operations…')
        while (true) {
          const op = findNextReorderOp(items, pos)
          if (!op || op.insertBefore > playlistPosition + CONTINUOUS_SONGS_TO_REORDER) {
            break
          }

          ops.push(op)
          pos = op.insertBefore + 1

          const [removed] = items.splice(op.from, 1)
          items.splice(op.insertBefore, 0, removed)
        }

        let completed = 0
        const total = ops.length
        let snapshotId: string | undefined = lastSnapshotId
        for (const op of ops) {
          signal.throwIfAborted()
          if (completed > 0) {
            await timeout(200, signal)
          }
          this.emit('statusChange', `reordering ${completed + 1} of ${total}…`)

          // NOTE(tec27): No idea why TS is erroring on this without the type ??
          const response: { snapshot_id: string } | undefined = await this.authToken.fetch<{
            snapshot_id: string
          }>(`/playlists/${encodeURIComponent(this.playlistId)}/tracks`, {
            method: 'PUT',
            signal,
            body: JSON.stringify({
              range_start: op.from,
              range_length: 1,
              insert_before: op.insertBefore,
              snapshot_id: snapshotId,
            }),
          })

          snapshotId = response?.snapshot_id

          completed++
        }

        signal.throwIfAborted()
        this.emit(
          'statusChange',
          `playing #${playlistPosition + 1}, next ${CONTINUOUS_SONGS_TO_REORDER} songs in order, ` +
            `monitoring…`,
        )
      } else {
        if (performance.now() - playlistLastActive > INACTIVE_TIMEOUT_MS) {
          this.emit('statusChange', 'playlist inactive for too long, stopping…')
          break
        }
        this.emit('statusChange', 'waiting for playback to return to playlist…')
      }

      await timeout(CURRENT_SONG_REFRESH_INTERVAL_MS, signal)
    }
  }

  private async retrievePlaylistItems(
    signal: AbortSignal,
  ): Promise<{ playlistItems: PlaylistItem[]; snapshotId: string }> {
    let playlistItems: PlaylistItem[] = []
    let next: string | undefined =
      `/playlists/${encodeURIComponent(this.playlistId)}/tracks` +
      `?fields=next,total,items(added_by.id,track(id,duration_ms))&limit=100`

    // Annoyingly retrieving the tracks doesn't have a way to get the snapshot ID, so we have to
    // fetch the playlist first and hope it hasn't changed in the meantime
    const playlistResponse = await this.authToken.fetch<{ snapshot_id: string }>(
      `/playlists/${encodeURIComponent(this.playlistId)}`,
      { signal },
    )
    if (!playlistResponse || !playlistResponse.snapshot_id) {
      throw new Error('Failed to fetch playlist snapshot ID')
    }
    const snapshotId = playlistResponse.snapshot_id

    do {
      signal.throwIfAborted()

      this.emit('statusChange', 'fetching playlist items…')
      const responseJson = await this.authToken.fetch<PlaylistItemsJson>(next, {
        signal,
      })
      if (!responseJson) {
        break
      }
      const response = fromPlaylistItemsJson(responseJson)
      playlistItems = playlistItems.concat(response.items)
      next = response.next ?? undefined
    } while (next)

    return { playlistItems, snapshotId }
  }

  /**
   * Finds the current position within the playlist (if any). This will attempt to use the player
   * queue if the currently playing song has multiple instances in the playlist. If the player is
   * not currently playing a song from the playlist (e.g. because the playlist is not being played,
   * or a song as been added to queue above the playlist content, etc.), it will return undefined.
   *
   * No attempt is made to identify playlist position based on the queue alone (even though we
   * theoretically *could*) because the queue API always returns 20 songs regardless of how many
   * are left in the queue (and doesn't give context for those songs), so it is very annoying to
   * tell where the end of the playlist is once you're near the end. This shouldn't be a huge issue,
   * however, as once the playback returns to the playlist, the sorting will resume.
   */
  private async retrievePlaylistPosition({
    signal,
    playlistItems,
  }: {
    signal: AbortSignal
    playlistItems: PlaylistItem[]
  }): Promise<number | undefined> {
    // First we get the currently playing song
    const currentlyPlayingJson = await this.authToken.fetch<CurrentlyPlayingJson>(
      '/me/player/currently-playing',
      { signal },
    )
    if (!currentlyPlayingJson) {
      return undefined
    }

    const currentlyPlaying = fromCurrentlyPlayingJson(currentlyPlayingJson)
    if (!currentlyPlaying.item) {
      return undefined
    }

    const playlistUri = `spotify:playlist:${this.playlistId}`
    if (currentlyPlaying.context?.uri !== playlistUri || currentlyPlaying.shuffleState) {
      return undefined
    }

    const trackId = currentlyPlaying.item.id

    // Check if this id appears in the playlist multiple times
    const indexes = []
    for (let i = 0; i < playlistItems.length; i++) {
      const item = playlistItems[i]
      if (item.track.id === trackId) {
        indexes.push(i)
      }
    }

    if (indexes.length === 1) {
      // Only appears once in the playlist, so this is for sure where we're at
      return indexes[0]
    }

    // Appears multiple times, so try to determine the position from the queue
    const queueResponse = await this.authToken.fetch<{ queue: Array<{ id: string }> }>(
      '/me/player/queue',
      { signal },
    )

    if (!queueResponse) {
      return undefined
    }

    const { queue } = queueResponse

    const matchLengths = []
    for (const indexToCheck of indexes) {
      let matchLength = 0
      for (
        let i = indexToCheck + 1, j = 0;
        i < playlistItems.length && j < queue.length;
        i++, j++
      ) {
        if (playlistItems[i].track.id !== queue[j].id) {
          matchLength = -1
          break
        } else {
          matchLength++
        }
      }

      matchLengths.push(matchLength)
    }

    let maxMatchLength = -1
    let maxMatchLengthIndex = -1
    for (let i = 0; i < matchLengths.length; i++) {
      // NOTE(tec27): We prefer the later match if multiple match, just for safety in reordering
      // things that were already played
      if (matchLengths[i] >= maxMatchLength) {
        maxMatchLength = matchLengths[i]
        maxMatchLengthIndex = i
      }
    }

    return maxMatchLengthIndex >= 0 ? indexes[maxMatchLengthIndex] : undefined
  }
}
