import { ReadonlyDeep } from 'type-fest'
import { PlaylistItem } from './spotify-api'

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
        playedTimes.set(user, playedTimes.get(user) ?? 0 + items[i].track.durationMs)
      } else {
        if (!playedTimes.has(user)) {
          playedTimes.set(user, 0)
        }
        if (!firstRemainingSongs.has(user)) {
          firstRemainingSongs.set(user, i)
        }
      }
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
    for (let i = pos; i < items.length; i++) {
      const user = items[i].addedBy.id
      if (lookingFor.has(user)) {
        // The next track was from a user that needs more songs for the playlist to be "even", so
        // this is in the "correct" position already
        lookingFor.delete(user)
        playedTimes.set(user, playedTimes.get(user)! + items[i].track.durationMs)
        pos = i + 1
      } else {
        // This user already has more songs than other users, find the next track from any that
        // we're looking for and insert it here
        const sortedRemainingTracks = Array.from(
          lookingFor,
          u => firstRemainingSongs.get(u)!,
        ).sort()
        return { from: sortedRemainingTracks[0], insertBefore: i }
      }

      if (!lookingFor.size) {
        break
      }
    }
  } while (pos < items.length)

  return undefined
}
