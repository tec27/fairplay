import { css } from '@emotion/react'
import { useEffect, useRef, useState } from 'react'
import { NowPlaying } from './NowPlaying'
import { SpotifyAuthProvider } from './Spotify'
import { SpotifyLayoutType } from './layout-type'
import {
  CurrentlyPlaying,
  CurrentlyPlayingJson,
  fromCurrentlyPlayingJson,
  useSpotifyAuthToken,
} from './spotify-api'

export function EmbedLayout() {
  return (
    <SpotifyAuthProvider>
      <EmbedContent />
    </SpotifyAuthProvider>
  )
}

function EmbedContent() {
  const authToken = useSpotifyAuthToken()

  if (!authToken) {
    // TODO(tec27): style this
    return <div>Spotify login expired, visit https://currentsong.app to get a new link</div>
  }

  return <ConnectedNowPlaying />
}

export function ConnectedNowPlaying() {
  const spotifyAuth = useSpotifyAuthToken()
  const [currentlyPlaying, setCurrentlyPlaying] = useState<CurrentlyPlaying | undefined>(undefined)
  const [error, setError] = useState<Error | undefined>(undefined)

  const abortRef = useRef<AbortController>()
  useEffect(() => {
    abortRef.current?.abort()

    if (!spotifyAuth) {
      setCurrentlyPlaying(undefined)
      setError(undefined)
      return
    }

    const updateNowPlaying = () => {
      const abortController = new AbortController()
      abortRef.current = abortController
      Promise.resolve()
        .then(async () => {
          const json = await spotifyAuth.fetch<CurrentlyPlayingJson | undefined>(
            '/me/player/currently-playing?additional_types=track,episode',
            {
              signal: abortController.signal,
            },
          )
          setCurrentlyPlaying(json ? fromCurrentlyPlayingJson(json) : undefined)
          setError(undefined)
        })
        .catch(err => {
          if (err.name === 'AbortError') {
            return
          }
          setError(err)
        })
    }

    const interval = setInterval(() => {
      updateNowPlaying()
    }, 5000)
    updateNowPlaying()

    return () => {
      clearInterval(interval)
    }
  }, [spotifyAuth])

  return (
    <div
      css={css`
        --cs-inner-padding: 8px;
        --cs-outer-padding: 8px;

        --cs-background-color: #fafafa;
        --cs-border-radius: 12px;

        --cs-font-size: 20px;
        --cs-font-color: rgba(0, 0, 0, 0.87);

        --cs-size-title: 1;
        --cs-size-artist: 0.8;

        width: 100%;
        height: 100%;
      `}>
      <div
        css={css`
          padding: var(--cs-outer-padding);
        `}>
        <div
          css={css`
            --cs-art-border-radius: calc(var(--cs-border-radius) - var(--cs-inner-padding));

            height: 104px;
            padding: var(--cs-inner-padding);

            background-color: var(--cs-background-color);
            border-radius: var(--cs-border-radius);
            color: var(--cs-font-color);
            font-size: var(--cs-font-size);
            overflow: hidden;
          `}>
          {error ? <div>Error: {error.message}</div> : undefined}
          {currentlyPlaying ? (
            <NowPlaying layout={SpotifyLayoutType.SideBySide} info={currentlyPlaying} />
          ) : (
            <div>Nothing playing</div>
          )}
        </div>
      </div>
    </div>
  )
}
