import { css, Global } from '@emotion/react'
import { useEffect, useRef, useState } from 'react'
import { AuthFlow } from './AuthFlow'
import { ChoosePlaylistDialog } from './PlaylistsList'
import { SpotifyAuthProvider, SpotifyCurrentUserProvider, SpotifyUserView } from './Spotify'
import {
  fromPlaylistDetailsJson,
  fromPlaylistItemsJson,
  PlaylistDetails,
  PlaylistDetailsJson,
  PlaylistItem,
  PlaylistItemsJson,
  useSpotifyAuthToken,
} from './spotify-api'

export function App() {
  return (
    <>
      <Global
        styles={css`
          *,
          *::before,
          *::after {
            box-sizing: border-box;
          }

          body {
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
          }

          img,
          picture,
          video,
          canvas,
          svg {
            display: block;
            max-width: 100%;
          }

          input,
          button,
          textarea,
          select {
            font: inherit;
          }

          p,
          h1,
          h2,
          h3,
          h4,
          h5,
          h6 {
            margin: 0;
            overflow-wrap: break-word;
          }

          #root {
            isolation: isolate;
          }

          html,
          body,
          #root {
            padding: 0;
            margin: 0;
          }
        `}
      />

      <SpotifyAuthProvider>
        <AppContent />
      </SpotifyAuthProvider>
    </>
  )
}

function AppContent() {
  const authToken = useSpotifyAuthToken()
  return authToken ? (
    <SpotifyCurrentUserProvider>
      <div>we're in 😎</div>
      <SpotifyUserView />
      <MainForm />
    </SpotifyCurrentUserProvider>
  ) : (
    <AuthFlow />
  )
}

function MainForm() {
  const spotifyAuth = useSpotifyAuthToken()
  const [isPlaylistDialogOpen, setIsPlaylistDialogOpen] = useState(false)
  const [playlistId, setPlaylistId] = useState<string | undefined>(undefined)

  const [playlist, setPlaylist] = useState<PlaylistDetails | undefined>(undefined)
  const abortRef = useRef<AbortController>()
  useEffect(() => {
    abortRef.current?.abort()

    if (!playlistId) {
      return
    }

    const abortController = new AbortController()
    abortRef.current = abortController
    spotifyAuth
      ?.fetch<PlaylistDetailsJson>(
        `/playlists/${encodeURIComponent(playlistId)}` +
          '?fields=description,id,images,name,owner,tracks.total,uri',
        {
          signal: abortController.signal,
        },
      )
      .then(json => {
        if (!abortController.signal.aborted) {
          setPlaylist(json ? fromPlaylistDetailsJson(json) : json)
        }
      })
      .catch(err => {
        if (err.name === 'AbortError') {
          return
        }

        // TODO(tec27): Show this to the user in some way
        console.error(err)
      })

    return () => {
      abortController.abort()
    }
  }, [spotifyAuth, playlistId])

  return (
    <div>
      <ChoosePlaylistDialog
        isOpen={isPlaylistDialogOpen}
        onClose={r => {
          setIsPlaylistDialogOpen(false)
          if (r) {
            setPlaylistId(r)
          }
        }}
      />
      <div
        css={css`
          display: flex;
          gap: 24px;
        `}>
        <div>{playlistId ?? 'No playlist chosen'}</div>
        <button onClick={() => setIsPlaylistDialogOpen(true)}>Choose playlist</button>
      </div>
      <div>{playlist ? JSON.stringify(playlist, null, 2) : undefined}</div>
      {playlistId ? <PlaylistItemsView playlistId={playlistId} /> : undefined}
    </div>
  )
}

function PlaylistItemsView({ playlistId }: { playlistId: string }) {
  const spotifyAuth = useSpotifyAuthToken()
  const [items, setItems] = useState<PlaylistItem[] | undefined>(undefined)
  const abortRef = useRef<AbortController>()
  useEffect(() => {
    abortRef.current?.abort()

    if (!spotifyAuth) {
      setItems(undefined)
      return
    }

    const abortController = new AbortController()
    abortRef.current = abortController

    Promise.resolve()
      .then(async () => {
        let playlistItems: PlaylistItem[] = []
        let next: string | undefined =
          `/playlists/${encodeURIComponent(playlistId)}/tracks` +
          `?fields=next,total,items(added_by.id,track(id,duration_ms))&limit=100`
        do {
          const responseJson = await spotifyAuth?.fetch<PlaylistItemsJson>(next, {
            signal: abortController.signal,
          })
          if (!responseJson) {
            break
          }
          const response = fromPlaylistItemsJson(responseJson)
          playlistItems = playlistItems.concat(response.items)
          next = response.next ?? undefined
        } while (next)

        setItems(playlistItems)
      })
      .catch(err => {
        if (err.name === 'AbortError') {
          return
        }

        // TODO(tec27): Show this to the user in some way
        console.error(err)
        setItems(undefined)
      })

    return () => {
      abortController.abort()
    }
  }, [spotifyAuth, playlistId])

  return (
    <div>
      <div>{playlistId}</div>
      <div>{items ? JSON.stringify(items, null, 2) : undefined}</div>
    </div>
  )
}
