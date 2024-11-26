import { css } from '@emotion/react'
import { useEffect, useRef, useState } from 'react'
import { NowPlaying } from './NowPlaying'
import { toBase64UrlSafe } from './base64'
import { DEMO_DATA } from './demo-data'
import { EmbedConfig } from './embed-context'
import { SpotifyLayoutType } from './layout-type'
import { SPOTIFY_CLIENT_ID, SPOTIFY_SCOPE, SpotifyAuthToken } from './spotify-api'

function getRandomDemoData() {
  const dataIndex = Math.floor(Math.random() * DEMO_DATA.length)
  return DEMO_DATA[dataIndex]
}

export function EditorLayout() {
  const [currentlyPlaying, setCurrentlyPlaying] = useState(getRandomDemoData)

  return (
    <div>
      <HandleAuthCallback />
      <div
        css={css`
          padding: 8px 16px;
          font-size: 32px;
          font-weight: 500;
        `}>
        currentsong.app
      </div>
      <div>
        <button onClick={() => setCurrentlyPlaying(getRandomDemoData())}>Random song</button>
        <div
          css={css`
            padding: 32px;

            display: flex;
            align-items: center;
            justify-content: center;

            background-image: linear-gradient(
              35deg,
              hsl(281deg 82% 22%) 0%,
              hsl(300deg 100% 20%) 15%,
              hsl(313deg 100% 25%) 23%,
              hsl(322deg 100% 29%) 31%,
              hsl(329deg 100% 33%) 37%,
              hsl(338deg 82% 40%) 43%,
              hsl(349deg 66% 47%) 49%,
              hsl(0deg 63% 53%) 54%,
              hsl(12deg 69% 53%) 60%,
              hsl(21deg 74% 51%) 66%,
              hsl(30deg 79% 49%) 72%,
              hsl(38deg 89% 46%) 79%,
              hsl(45deg 97% 43%) 87%,
              hsl(52deg 87% 44%) 100%
            );
          `}>
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

              width: 360px;

              border: 1px dashed #ddd;
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
                {currentlyPlaying ? (
                  <NowPlaying layout={SpotifyLayoutType.SideBySide} info={currentlyPlaying} />
                ) : (
                  <div>Nothing playing</div>
                )}
              </div>
            </div>
          </div>
        </div>
        <GenerateLinkButton />
      </div>
    </div>
  )
}

function getOrCreateCodeVerifier(): string {
  if (!localStorage.getItem('currentsong.codeVerifier')) {
    const bytes = window.crypto.getRandomValues(new Uint8Array(64))
    const codeVerifier = toBase64UrlSafe(bytes)
    localStorage.setItem('currentsong.codeVerifier', codeVerifier)
  }

  return localStorage.getItem('currentsong.codeVerifier')!
}

function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  return window.crypto.subtle.digest('SHA-256', data)
}

export function GenerateLinkButton() {
  const [inProgress, setInProgress] = useState(false)

  return (
    <button
      onClick={() => {
        setInProgress(true)
        Promise.resolve()
          .then(async () => {
            const codeChallenge = toBase64UrlSafe(
              new Uint8Array(await sha256(getOrCreateCodeVerifier())),
            )
            const redirectUri = window.location.origin + window.location.pathname
            const authUrl = new URL('https://accounts.spotify.com/authorize')
            authUrl.search = new URLSearchParams({
              response_type: 'code',
              client_id: SPOTIFY_CLIENT_ID,
              scope: SPOTIFY_SCOPE,
              code_challenge_method: 'S256',
              code_challenge: codeChallenge,
              redirect_uri: redirectUri,
            }).toString()
            window.location.href = authUrl.toString()
          })
          .catch(err => {
            console.error(err)
          })
          .finally(() => {
            setInProgress(false)
          })
      }}
      disabled={inProgress}>
      Generate link for Spotify Account
    </button>
  )
}

function HandleAuthCallback() {
  const abortRef = useRef<AbortController>()

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const code = searchParams.get('code')

    if (!code) {
      return
    }

    abortRef.current?.abort()

    const abortController = new AbortController()
    abortRef.current = abortController
    Promise.resolve()
      .then(async () => {
        const codeVerifier = getOrCreateCodeVerifier()
        if (abortController.signal.aborted) {
          return
        }

        const res = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          signal: abortController.signal,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: SPOTIFY_CLIENT_ID,
            grant_type: 'authorization_code',
            scope: SPOTIFY_SCOPE,
            code,
            redirect_uri: window.location.origin + window.location.pathname,
            code_verifier: codeVerifier,
          }),
        })

        if (abortController.signal.aborted) {
          return
        }

        if (!res.ok) {
          throw new Error(`Failed to exchange code for token: ${res.status} ${res.statusText}`)
        }

        const body = await res.json()
        if (abortController.signal.aborted) {
          return
        }

        const token = new SpotifyAuthToken(
          body.access_token,
          Date.now() + body.expires_in * 1000,
          body.refresh_token,
        )
        window.history.replaceState({}, '', window.location.pathname)
        // TODO(tec27): Show a dialog or whatever with the link
        const config: EmbedConfig = {
          id: (Math.random() * 0xffffffff).toString(36),
          accessToken: token.accessToken,
          expiresAt: token.expiresAt,
          refreshToken: token.refreshToken,
        }
        const configParam = encodeURIComponent(JSON.stringify(config))
        const link = `${window.location.origin + window.location.pathname}#embed?config=${configParam}`
        console.log(link)
      })
      .catch(err => {
        if (err.name === 'AbortError') {
          return
        } else {
          console.error(err)
          window.history.replaceState({}, '', window.location.pathname)
        }
      })

    return () => {
      abortController.abort()
    }
  }, [])

  return null
}
