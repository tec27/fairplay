import { Global, css } from '@emotion/react'
import { EditorLayout } from './EditorLayout'
import { EmbedLayout } from './EmbedLayout'
import { EmbedProvider } from './EmbedProvider'
import { SpotifyAuthProvider } from './Spotify'
import { useIsEmbedded } from './embed-context'

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
      <EmbedProvider>
        <AppContent />
      </EmbedProvider>
    </>
  )
}

function AppContent() {
  const isEmbedded = useIsEmbedded()

  // TODO(tec27): Remove auth provider from the editor stuff and just handle the code things
  // specifically when generating a link
  return isEmbedded ? (
    <EmbedLayout />
  ) : (
    <SpotifyAuthProvider>
      <EditorLayout />
    </SpotifyAuthProvider>
  )
}
