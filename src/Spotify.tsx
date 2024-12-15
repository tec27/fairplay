import { css } from '@emotion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MaterialIcon } from './MaterialIcon'
import {
  SpotifyAuthContext,
  SpotifyAuthContextValue,
  SpotifyAuthToken,
  SpotifyCurrentUserContext,
  SpotifyUser,
  SpotifyUserJson,
  clearAuthToken,
  fromSpotifyUserJson,
  loadAuthToken,
  saveAuthToken,
  useCurrentUser,
  useLogOut,
  useSpotifyAuthToken,
} from './spotify-api'
import { SpotifyImageView } from './SpotifyImageView'
import { BUTTON_RESET } from './style'

export function SpotifyAuthProvider({ children }: { children: React.ReactNode }) {
  const [authToken, setAuthToken] = useState<SpotifyAuthToken | undefined>(loadAuthToken())
  const onNewAuthToken = useCallback((token: SpotifyAuthToken) => {
    saveAuthToken(token)
    setAuthToken(token)
  }, [])

  const logOut = useCallback(() => {
    clearAuthToken()
    setAuthToken(undefined)
  }, [])

  const value = useMemo<SpotifyAuthContextValue>(
    () => [authToken, logOut, onNewAuthToken],
    [authToken, logOut, onNewAuthToken],
  )

  return <SpotifyAuthContext.Provider value={value}>{children}</SpotifyAuthContext.Provider>
}

export function SpotifyCurrentUserProvider({ children }: { children: React.ReactNode }) {
  const spotifyAuth = useSpotifyAuthToken()
  const [currentUser, setCurrentUser] = useState<SpotifyUser | undefined>(undefined)

  const abortRef = useRef<AbortController>()

  useEffect(() => {
    abortRef.current?.abort()

    if (!spotifyAuth) {
      abortRef.current = undefined
      setCurrentUser(undefined)
      return
    }

    const abortController = new AbortController()
    abortRef.current = abortController

    spotifyAuth
      .fetch<SpotifyUserJson>('/me', { signal: abortController.signal })
      .then(json => {
        if (!abortController.signal.aborted) {
          setCurrentUser(json ? fromSpotifyUserJson(json) : json)
        }
      })
      .catch(err => {
        if (err.name === 'AbortError') {
          return
        }

        // TODO(tec27): Show an error to the user?
        console.error('Failed to fetch current user', err)
        setCurrentUser(undefined)
      })

    return () => {
      abortController.abort()
    }
  }, [spotifyAuth])

  return (
    <SpotifyCurrentUserContext.Provider value={currentUser}>
      {currentUser ? children : undefined}
    </SpotifyCurrentUserContext.Provider>
  )
}

export function SpotifyUserView() {
  const logOut = useLogOut()
  const currentUser = useCurrentUser()

  return (
    <div
      css={css`
        position: absolute;
        top: 0;
        right: 16px;
      `}>
      {currentUser ? (
        <>
          <button
            css={css`
              ${BUTTON_RESET}

              max-width: 240px;
              height: 48px;
              padding-right: 16px;

              display: flex;
              align-items: center;
              gap: 16px;

              background: #333944;
              border: 2px solid var(--spotify-green);
              border-radius: 9999px;
              color: #fff;
              font-size: 16px;
              font-weight: 500;

              &:hover,
              &:focus {
                background: oklch(from #333944 calc(l * 1.05) c h);
              }

              &:active {
                background: oklch(from #333944 calc(l * 1.1) c h);
              }

              & .hover-only {
                opacity: 0;
              }

              &:hover .hover-only,
              &:focus-visible .hover-only {
                opacity: 1;
              }
            `}
            onClick={logOut}
            title='Log out'>
            <div
              css={css`
                position: relative;
              `}>
              <SpotifyImageView
                css={css`
                  border-radius: 9999px;
                `}
                images={currentUser.images}
                alt=''
                width={44}
              />
              <MaterialIcon
                css={css`
                  width: 44px;
                  height: 44px;
                  line-height: 44px;

                  position: absolute;
                  top: 0;
                  left: 0;

                  background-color: rgba(0, 0, 0, 0.5);
                  border-radius: 9999px;

                  transition: opacity 75ms;
                `}
                className='hover-only'
                icon='logout'
                size={24}
              />
            </div>
            <span
              css={css`
                display: flex;
                align-items: center;
                gap: 16px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              `}>
              {currentUser.displayName}
            </span>
          </button>
        </>
      ) : undefined}
    </div>
  )
}
