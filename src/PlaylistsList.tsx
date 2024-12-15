import { css } from '@emotion/react'
import { useEffect, useRef, useState } from 'react'
import { Dialog } from './Dialog'
import { MaterialIcon } from './MaterialIcon'
import {
  fromSpotifyPlaylistsResponseJson,
  SimplePlaylist,
  SpotifyPlaylistsResponseJson,
  useCurrentUser,
  useSpotifyAuthToken,
} from './spotify-api'
import { AutoSpotifyImageView } from './SpotifyImageView'
import { BUTTON_RESET } from './style'

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
        max-width: min(calc(100vw - 96px), 480px);
        max-height: min(calc(100vh - 96px), 1024px);
        padding: 0;

        background: #2a303b;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        color: #fff;
        overflow: hidden;

        &::backdrop {
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(2px);
        }
      `}
      modal={true}
      isOpen={isOpen}
      onClose={onClose}>
      <form
        css={css`
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        `}>
        <div
          css={css`
            height: 48px;

            flex-grow: 0;
            flex-shrink: 0;

            display: flex;
            align-items: center;
            justify-content: space-between;
          `}>
          <div
            css={css`
              padding: 0 16px;
              font-size: 20px;
              font-weight: 500;
            `}>
            Choose a playlist
          </div>
          <button
            css={css`
              ${BUTTON_RESET};
              color: #fff;
              width: 48px;
              height: 48px;
              padding: 10px;
              border-radius: 8px;
              border: 2px solid transparent;
              outline: none;

              &:focus,
              &:hover {
                background-color: rgba(255, 255, 255, 0.1);
              }

              &:focus-visible {
                border-color: currentColor;
              }
            `}
            value=''
            formMethod='dialog'
            autoFocus={true}
            title={'Close'}>
            <MaterialIcon icon='close' />
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

  return (
    <div
      css={css`
        width: 100%;
        flex-grow: 1;
        overflow-y: auto;
        padding: 8px 0;
      `}>
      {isLoading ? (
        <div
          css={css`
            width: 100%;
            color: var(--text-secondary);
            font-size: 20px;
            text-align: center;
          `}>
          Loading&hellip;
        </div>
      ) : (
        playlists.map(p => <PlaylistItem playlist={p} key={p.id} />)
      )}
    </div>
  )
}

function PlaylistItem({ playlist }: { playlist: SimplePlaylist }) {
  return (
    <button
      css={css`
        ${BUTTON_RESET};

        width: 100%;
        height: 80px;
        padding: 4px 12px;

        display: flex;
        align-items: center;
        gap: 8px;

        border: 2px solid transparent;
        border-radius: 4px;
        color: #fff;
        outline: none;
        overflow: hidden;
        text-align: left;

        &:hover {
          background-color: rgba(255, 255, 255, 0.1);
          cursor: pointer;
        }

        &:focus {
          background-color: rgba(255, 255, 255, 0.1);
        }

        &:focus-visible {
          border-color: var(--spotify-green);
        }
      `}
      value={playlist.id}
      formMethod='dialog'>
      <AutoSpotifyImageView
        css={css`
          width: auto;
          height: 100%;
          flex-grow: 0;
          aspect-ratio: 1 / 1;
          object-fit: cover;
        `}
        images={playlist.images}
      />{' '}
      <div
        css={css`
          min-width: 0;
          flex: 1 1 0;

          display: flex;
          flex-direction: column;
          align-content: flex-start;
        `}>
        <div
          css={css`
            font-size: 20px;
            font-weight: 500;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}>
          {playlist.name}
        </div>
        <div
          css={css`
            color: var(--text-secondary);
          `}>
          {playlist.tracks.total} tracks
        </div>
      </div>
    </button>
  )
}
