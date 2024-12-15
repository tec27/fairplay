import { css } from '@emotion/react'
import { useEffect, useRef, useState } from 'react'
import { toBase64UrlSafe } from './base64'
import { SPOTIFY_CLIENT_ID, SPOTIFY_SCOPE, SpotifyAuthToken, useSpotifyAuth } from './spotify-api'
import SpotifyLogo from './spotify.svg?react'
import { BUTTON_RESET } from './style'

export function AuthFlow() {
  return (
    <div
      css={css`
        padding-top: 24px;
      `}>
      <HandleAuthCallback />
      <LogInButton />
    </div>
  )
}

function getOrCreateCodeVerifier(): string {
  if (!localStorage.getItem('fairplay.codeVerifier')) {
    const bytes = window.crypto.getRandomValues(new Uint8Array(64))
    const codeVerifier = toBase64UrlSafe(bytes)
    localStorage.setItem('fairplay.codeVerifier', codeVerifier)
  }

  return localStorage.getItem('fairplay.codeVerifier')!
}

function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  return window.crypto.subtle.digest('SHA-256', data)
}

export function LogInButton() {
  const [inProgress, setInProgress] = useState(false)

  return (
    <button
      css={css`
        ${BUTTON_RESET}

        padding: 8px 12px;
        margin: 8px 0;

        display: flex;
        align-items: center;
        gap: 16px;

        background-color: var(--spotify-green);
        border-radius: 9999px;
        color: #fff;
        font-size: 20px;
        font-weight: 500;

        &:hover {
          background-color: oklch(from var(--spotify-green) calc(l * 1.05) c h);
        }

        &:active {
          background-color: oklch(from var(--spotify-green) calc(l * 1.1) c h);
        }
      `}
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
      <SpotifyLogo
        css={css`
          width: 40px;
          height: auto;
        `}
      />
      <span>Log in with Spotify</span>
    </button>
  )
}

function HandleAuthCallback() {
  const abortRef = useRef<AbortController>()
  const [, , saveAuthToken] = useSpotifyAuth()

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
        saveAuthToken(token)
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
  }, [saveAuthToken])

  return null
}
