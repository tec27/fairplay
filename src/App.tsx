import { Global, css } from '@emotion/react'
import { useState } from 'react'
import { AuthFlow } from './AuthFlow'
import { ChoosePlaylistDialog } from './PlaylistsList'
import { SpotifyAuthProvider, SpotifyCurrentUserProvider, SpotifyUserView } from './Spotify'
import { useSpotifyAuthToken } from './spotify-api'

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
  const [isPlaylistDialogOpen, setIsPlaylistDialogOpen] = useState(false)
  const [playlistId, setPlaylistId] = useState<string | undefined>(undefined)

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
    </div>
  )
}
