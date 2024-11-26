import { createContext, useContext } from 'react'

export interface EmbedConfig {
  /**
   * A randomly generated id that will be used to know when the auth information is "new" and
   * should take precedence over any stored tokens.
   */
  id: string
  accessToken: string
  expiresAt: number
  refreshToken: string
}

export interface EmbedContextValue {
  isEmbed: boolean
  config: EmbedConfig
}

export type NotEmbedContextValue = { isEmbed: false; config?: undefined }

export const EmbedContext = createContext<EmbedContextValue | NotEmbedContextValue>({
  isEmbed: false,
})

export function useIsEmbedded() {
  const { isEmbed } = useContext(EmbedContext)
  return isEmbed
}

export function useEmbedConfig() {
  const { config } = useContext(EmbedContext)
  return config
}
