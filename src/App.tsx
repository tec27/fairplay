import { Global, css } from '@emotion/react'
import { AuthFlow } from './AuthFlow'
import { PlaylistsList } from './PlaylistsList'
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

          * {
            margin: 0;
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
            overflow-wrap: break-word;
          }

          #root {
            isolation: isolate;
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
      <PlaylistsList />
    </SpotifyCurrentUserProvider>
  ) : (
    <AuthFlow />
  )
}
