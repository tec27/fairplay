import { css } from '@emotion/react'
import { useEffect, useRef, useState } from 'react'
import { Dialog } from './Dialog'
import {
  fromSpotifyPlaylistsResponseJson,
  SimplePlaylist,
  SpotifyPlaylistsResponseJson,
  useCurrentUser,
  useSpotifyAuthToken,
} from './spotify-api'
import { AutoSpotifyImageView } from './SpotifyImageView'

export function ChoosePlaylistDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: (playlistId?: string) => void
}) {
  return (
    <Dialog
      css={css`
        width: 100%;
        height: 100%;
        max-width: 768px;
        max-height: 1024px;
      `}
      modal={true}
      isOpen={isOpen}
      onClose={onClose}>
      <form>
        <div
          css={css`
            display: flex;
            justify-content: space-between;
          `}>
          <div>Choose a playlist</div>
          <button value='' formMethod='dialog' autoFocus={true}>
            Close
          </button>
        </div>
        <PlaylistsList />
      </form>
    </Dialog>
  )
}

function PlaylistsList() {
  const spotifyAuth = useSpotifyAuthToken()
  const currentUser = useCurrentUser()

  const [isLoading, setIsLoading] = useState(false)
  const [playlists, setPlaylists] = useState<SimplePlaylist[]>([])

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
        let playlists: SimplePlaylist[] = []
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

function PlaylistItem({ playlist }: { playlist: SimplePlaylist }) {
  return (
    <button
      css={css`
        height: 80px;
        padding: 8px;

        display: flex;
        align-items: center;
        gap: 8px;

        background: none;
        border: none;

        &:hover {
          cursor: pointer;
        }
      `}
      value={playlist.id}
      formMethod='dialog'>
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
    </button>
  )
}
