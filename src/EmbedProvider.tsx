import { useEffect, useMemo } from 'react'
import { EmbedConfig, EmbedContext, EmbedContextValue, NotEmbedContextValue } from './embed-context'
import { SpotifyAuthToken, saveAuthToken } from './spotify-api'
import { useForceUpdate } from './state-hooks'

const NOT_EMBEDDED: NotEmbedContextValue = { isEmbed: false }

export function EmbedProvider({ children }: { children: React.ReactNode }) {
  const forceUpdate = useForceUpdate()

  useEffect(() => {
    const handler = () => {
      forceUpdate()
    }

    window.addEventListener('hashchange', handler)

    return () => {
      window.removeEventListener('hashchange', handler)
    }
  }, [forceUpdate])

  const hash = window.location.hash
  const value = useMemo<EmbedContextValue | NotEmbedContextValue>(() => {
    if (!hash || !hash.startsWith('#embed')) {
      return NOT_EMBEDDED
    }

    const queryString = hash.slice('#embed'.length)
    try {
      const query = new URLSearchParams(queryString)
      const config = JSON.parse(query.get('config') ?? '{}') as EmbedConfig
      return { isEmbed: true, config }
    } catch (err) {
      console.error(`Failed to parse embed query ('${queryString}'): ${(err as any).stack ?? err}`)
      return NOT_EMBEDDED
    }
  }, [hash])

  useEffect(() => {
    if (!value.isEmbed) {
      return
    }

    const { id, accessToken, expiresAt, refreshToken } = value.config

    const prevId = localStorage.getItem('currentsong.embedId')
    if (prevId !== id) {
      console.log('embed ID changed, overwriting existing auth token')
      localStorage.setItem('currentsong.embedId', id)
      const authToken = new SpotifyAuthToken(accessToken, expiresAt, refreshToken)
      saveAuthToken(authToken)
    }
  }, [value])

  return <EmbedContext.Provider value={value}>{children}</EmbedContext.Provider>
}
