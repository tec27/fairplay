import { useCallback, useEffect, useMemo, useState } from 'react'
import { useEmbedConfig, useIsEmbedded } from './embed-context'
import {
  SpotifyAuthContext,
  SpotifyAuthContextValue,
  SpotifyAuthToken,
  clearAuthToken,
  loadAuthToken,
} from './spotify-api'

export function SpotifyAuthProvider({ children }: { children: React.ReactNode }) {
  const isEmbedded = useIsEmbedded()
  const embedConfig = useEmbedConfig()
  const [authToken, setAuthToken] = useState<SpotifyAuthToken | undefined>(loadAuthToken())

  const logOut = useCallback(() => {
    clearAuthToken()
    setAuthToken(undefined)
  }, [])

  const embedId = embedConfig?.id
  useEffect(() => {
    if (!isEmbedded || !embedId) {
      return
    }

    setAuthToken(loadAuthToken())
  }, [isEmbedded, embedId])

  const value = useMemo<SpotifyAuthContextValue>(() => [authToken, logOut], [authToken, logOut])

  return <SpotifyAuthContext.Provider value={value}>{children}</SpotifyAuthContext.Provider>
}
