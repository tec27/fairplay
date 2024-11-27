import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

        // TODO(tec27): Show an error to the user and/or log out?
        console.error('Failed to fetch current user', err)
        setCurrentUser(undefined)
      })

    return () => {
      abortController.abort()
    }
  }, [spotifyAuth])

  return (
    <SpotifyCurrentUserContext.Provider value={currentUser}>
      {children}
    </SpotifyCurrentUserContext.Provider>
  )
}

export function SpotifyUserView() {
  const logOut = useLogOut()
  const currentUser = useCurrentUser()

  return (
    <div>
      {currentUser ? (
        <>
          <div>Logged in as {currentUser.displayName}</div>
          <button onClick={logOut}>Log out</button>
        </>
      ) : undefined}
    </div>
  )
}
