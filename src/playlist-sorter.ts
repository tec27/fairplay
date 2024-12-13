import EventEmitter from 'eventemitter3'
import { ReadonlyDeep } from 'type-fest'
import {
  fromPlaylistItemsJson,
  PlaylistItem,
  PlaylistItemsJson,
  SpotifyAuthToken,
} from './spotify-api'

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
  statusChange: (status: string) => void
  progressChange: (percentageComplete: number) => void
  complete: () => void
  error: (error: Error) => void
}

export enum PlaylistSortMode {
  OneTime,
  Continuous,
}

export class PlaylistSorter extends EventEmitter<PlaylistSorterEvents> {
  private operationPromise: Promise<void> = Promise.resolve()
  private abortController: AbortController = new AbortController()
  private lastSnapshotId: string | undefined = undefined
  private lastItems: PlaylistItem[] | undefined = undefined

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
    this.lastItems = undefined
    this.emit('statusChange', 'initializing...')

    this.doOperation(() =>
      this.updatePlaylistItems(this.abortController.signal).then(() => {
        if (this.abortController?.signal.aborted) {
          return
        }

        if (this.mode === PlaylistSortMode.OneTime) {
          this.doOperation(() => this.doOneTimeSort(this.abortController.signal))
        } else {
          // FIXME: implement
          throw new Error('oh no!')
        }
      }),
    )
  }

  stop() {
    this.abortController?.abort()
  }

  private doOperation(fn: () => Promise<void>) {
    this.operationPromise = this.operationPromise.then(
      () => fn(),
      () => {},
    )
  }

  private async updatePlaylistItems(signal: AbortSignal) {
    let playlistItems: PlaylistItem[] = []
    let next: string | undefined =
      `/playlists/${encodeURIComponent(this.playlistId)}/tracks` +
      `?fields=next,total,items(added_by.id,track(id,duration_ms))&limit=100`
    try {
      do {
        // Annoyingly retrieving the tracks doesn't have a way to get the snapshot ID, so we have to
        // fetch the playlist first and hope it hasn't changed in the meantime
        const playlistResponse = await this.authToken.fetch<{ snapshot_id: string }>(
          `/playlists/${encodeURIComponent(this.playlistId)}`,
          { signal },
        )
        if (!playlistResponse || !playlistResponse.snapshot_id) {
          throw new Error('Failed to fetch playlist snapshot ID')
        }
        this.lastSnapshotId = playlistResponse.snapshot_id

        if (signal.aborted) {
          return
        }
        this.emit('statusChange', 'fetching playlist items...')
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

      this.lastItems = playlistItems
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return
      }

      this.lastItems = undefined
      this.emit('error', err)
    }
  }

  private async doOneTimeSort(signal: AbortSignal) {
    if (!this.lastItems || !this.lastSnapshotId) {
      this.emit('error', new Error('No playlist items to sort'))
      return
    }

    let pos = 1
    const items = this.lastItems.slice()
    const ops: ReorderOp[] = []
    while (true) {
      this.emit('statusChange', 'planning operations...')
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
    let snapshotId: string | undefined = this.lastSnapshotId
    for (const op of ops) {
      if (completed > 0) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      this.emit('statusChange', `reordering ${completed + 1} of ${total}...`)
      this.emit('progressChange', completed / total)

      try {
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
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return
        }

        this.emit('error', err)
        return
      }

      completed++
    }

    this.emit('statusChange', 'done!')
    this.emit('progressChange', 100)
    this.emit('complete')
  }
}
