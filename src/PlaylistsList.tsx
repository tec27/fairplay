import { css } from '@emotion/react'
import { useEffect, useRef, useState } from 'react'
import {
  fromSpotifyPlaylistsResponseJson,
  SpotifyPlaylist,
  SpotifyPlaylistsResponseJson,
  useCurrentUser,
  useSpotifyAuthToken,
} from './spotify-api'
import { AutoSpotifyImageView } from './SpotifyImageView'

export function PlaylistsList() {
  const spotifyAuth = useSpotifyAuthToken()
  const currentUser = useCurrentUser()

  const [isLoading, setIsLoading] = useState(false)
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([])

  const abortRef = useRef<AbortController>()

  useEffect(() => {
    abortRef.current?.abort()

    if (!spotifyAuth || !currentUser) {
      setIsLoading(false)
      setPlaylists([])
      return
    }

    setIsLoading(true)
    const abortController = new AbortController()
    abortRef.current = abortController

    Promise.resolve()
      .then(async () => {
        let playlists: SpotifyPlaylist[] = []
        let next: string | undefined =
          `/users/${encodeURIComponent(currentUser.id)}/playlists?limit=50`
        do {
          const responseJson = await spotifyAuth.fetch<SpotifyPlaylistsResponseJson>(next)
          if (!responseJson) {
            break
          }
          const response = fromSpotifyPlaylistsResponseJson(responseJson)
          playlists = playlists.concat(response.items)

          next = response.next ?? undefined
        } while (next)

        setPlaylists(playlists)
      })
      .catch(err => {
        if (err.name === 'AbortError') {
          return
        }

        // FIXME: Show an error to the user
        console.error('Failed to fetch playlists', err)
        setPlaylists([])
      })
      .finally(() => {
        setIsLoading(false)
      })

    return () => {
      abortController.abort()
    }
  }, [spotifyAuth, currentUser])

  return isLoading ? (
    <div>loading&hellip;</div>
  ) : (
    <div>
      {playlists.map(p => (
        <PlaylistItem playlist={p} key={p.id} />
      ))}
    </div>
  )
}

function PlaylistItem({ playlist }: { playlist: SpotifyPlaylist }) {
  return (
    <div
      css={css`
        height: 80px;
        padding: 8px;

        display: flex;
        align-items: center;
        gap: 8px;
      `}>
      <AutoSpotifyImageView
        css={css`
          width: auto;
          height: 100%;
        `}
        images={playlist.images}
      />{' '}
      <div
        css={css`
          display: flex;
          flex-direction: column;
        `}>
        <div
          css={css`
            font-size: 16px;
            font-weight: 500;
          `}>
          {playlist.name}
        </div>
        <div>{playlist.tracks.total} tracks</div>
      </div>
    </div>
  )
}
