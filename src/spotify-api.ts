import { createContext, useContext } from 'react'
import { CamelCasedPropertiesDeep, ReadonlyDeep } from 'type-fest'

export const SPOTIFY_CLIENT_ID = '20175aa01aeb4f3882e9d585c2fa24d5'
export const SPOTIFY_SCOPE = [
  'playlist-modify-public',
  'playlist-modify-private',
  'playlist-read-collaborative',
  'playlist-read-private',
  'user-read-currently-playing',
  'user-read-playback-state',
].join(' ')

export interface SpotifyImage {
  url: string
  width?: number
  height?: number
}

export interface SpotifyUserJson {
  display_name: string
  id: string
  images: SpotifyImage[]
}

export type SpotifyUser = CamelCasedPropertiesDeep<SpotifyUserJson>

export function fromSpotifyUserJson(json: SpotifyUserJson): SpotifyUser {
  return {
    displayName: json.display_name,
    id: json.id,
    images: json.images,
  }
}

export interface SpotifyArtist {
  id: string
  name: string
}

export interface SpotifyTrackJson {
  album: {
    id: string
    images: SpotifyImage[]
    name: string
    release_date: string
    release_date_precision: 'year' | 'month' | 'day'
    artists: SpotifyArtist[]
  }
  artists: SpotifyArtist[]
  duration_ms: number
  id: string
  name: string
  type: 'track'
}

export type SpotifyTrack = CamelCasedPropertiesDeep<SpotifyTrackJson>

export interface SpotifyEpisodeJson {
  duration_ms: number
  id: string
  images: SpotifyImage[]
  name: string
  release_date: string
  release_date_precision: 'year' | 'month' | 'day'
  show: {
    id: string
    name: string
    images: SpotifyImage[]
  }
  type: 'episode'
}

export type SpotifyEpisode = CamelCasedPropertiesDeep<SpotifyEpisodeJson>

export interface CurrentlyPlayingJson {
  progress_ms: number
  is_playing: boolean
  item: SpotifyTrackJson | SpotifyEpisodeJson
}

export type SpotifyItem = SpotifyTrack | SpotifyEpisode

export type CurrentlyPlaying = CamelCasedPropertiesDeep<CurrentlyPlayingJson>

export function fromTrackJson(json: SpotifyTrackJson): SpotifyTrack {
  return {
    album: {
      id: json.album.id,
      images: json.album.images,
      name: json.album.name,
      releaseDate: json.album.release_date,
      releaseDatePrecision: json.album.release_date_precision,
      artists: json.album.artists,
    },
    artists: json.artists,
    durationMs: json.duration_ms,
    id: json.id,
    name: json.name,
    type: 'track',
  }
}

export function fromEpisodeJson(json: SpotifyEpisodeJson): SpotifyEpisode {
  return {
    durationMs: json.duration_ms,
    id: json.id,
    images: json.images,
    name: json.name,
    releaseDate: json.release_date,
    releaseDatePrecision: json.release_date_precision,
    show: {
      id: json.show.id,
      name: json.show.name,
      images: json.show.images,
    },
    type: 'episode',
  }
}

export function fromCurrentlyPlayingJson(json: CurrentlyPlayingJson): CurrentlyPlaying {
  return {
    progressMs: json.progress_ms,
    isPlaying: json.is_playing,
    item: json.item.type === 'track' ? fromTrackJson(json.item) : fromEpisodeJson(json.item),
  }
}

export function getImages(info: ReadonlyDeep<CurrentlyPlaying>): ReadonlyDeep<SpotifyImage[]> {
  if (info.item.type === 'episode') {
    return info.item.images
  } else {
    return info.item.album.images
  }
}

export interface SpotifyPlaylistJson {
  collaborative: boolean
  description: string
  href: string
  id: string
  images: SpotifyImage[]
  name: string
  owner: SpotifyUserJson
  public: boolean
  tracks: {
    href: string
    total: number
  }
}

export type SpotifyPlaylist = CamelCasedPropertiesDeep<SpotifyPlaylistJson>

export function fromSpotifyPlaylistJson(json: SpotifyPlaylistJson): SpotifyPlaylist {
  return {
    collaborative: json.collaborative,
    description: json.description,
    href: json.href,
    id: json.id,
    images: json.images,
    name: json.name,
    owner: fromSpotifyUserJson(json.owner),
    public: json.public,
    tracks: {
      href: json.tracks.href,
      total: json.tracks.total,
    },
  }
}

export interface SpotifyPlaylistsResponseJson {
  next: string | null
  total: number
  items: SpotifyPlaylistJson[]
}

export type SpotifyPlaylistsResponse = CamelCasedPropertiesDeep<SpotifyPlaylistsResponseJson>

export function fromSpotifyPlaylistsResponseJson(
  json: SpotifyPlaylistsResponseJson,
): SpotifyPlaylistsResponse {
  return {
    next: json.next,
    total: json.total,
    items: json.items.map(fromSpotifyPlaylistJson),
  }
}

export class FetchError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message)
  }
}

export class SpotifyAuthToken {
  private refreshPromise: Promise<Response> | undefined = undefined

  constructor(
    public accessToken: string,
    public expiresAt: number,
    public refreshToken: string,
  ) {}

  async refreshIfNeeded(signal?: AbortSignal) {
    if (Date.now() < this.expiresAt - 30 * 1000) {
      return
    }

    if (this.refreshPromise) {
      let tryAgain = false
      try {
        await this.refreshPromise
      } catch (_err) {
        tryAgain = true
      }

      if (!tryAgain) {
        return
      }
    }

    this.refreshPromise = fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: SPOTIFY_CLIENT_ID,
      }).toString(),
      signal,
    })

    const response = await this.refreshPromise

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    this.accessToken = data.access_token
    this.refreshToken = data.refresh_token
    this.expiresAt = Date.now() + data.expires_in * 1000
    saveAuthToken(this)
  }

  async fetch<T>(path: string, opts?: { signal?: AbortSignal }): Promise<T | undefined> {
    let fullUrl: string
    if (path.startsWith('http://') || path.startsWith('https://')) {
      fullUrl = path
    } else {
      const slashedPath = path.startsWith('/') ? path : `/${path}`
      fullUrl = `https://api.spotify.com/v1${slashedPath}`
    }

    await this.refreshIfNeeded(opts?.signal)

    const response = await fetch(fullUrl, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      signal: opts?.signal,
    })

    // TODO(tec27): Handle 429 responses (Retry-After header usage probably)
    // TODO(tec27): Report errors to users better?
    if (!response.ok) {
      throw new FetchError(
        `Failed to fetch ${path}: ${response.status} ${response.statusText}`,
        response.status,
      )
    }

    if (response.status === 204) {
      return undefined
    }

    const body = await response.json()
    return body as T
  }
}

export function loadAuthToken(): SpotifyAuthToken | undefined {
  const encoded = localStorage.getItem('fairplay.authToken')
  if (!encoded) {
    return undefined
  }

  try {
    const data = JSON.parse(encoded)
    if (data.accessToken && data.expiresAt && data.refreshToken) {
      return new SpotifyAuthToken(data.accessToken, data.expiresAt, data.refreshToken)
    }
  } catch (err) {
    console.error(err)
  }

  return undefined
}

export function saveAuthToken(token: SpotifyAuthToken) {
  localStorage.setItem(
    'fairplay.authToken',
    JSON.stringify({
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
      refreshToken: token.refreshToken,
    }),
  )
}

export function clearAuthToken() {
  localStorage.removeItem('fairplay.authToken')
}

export type SpotifyAuthContextValue = [
  token: SpotifyAuthToken | undefined,
  logOut: () => void,
  saveAuthToken: (token: SpotifyAuthToken) => void,
]

export const SpotifyAuthContext = createContext<SpotifyAuthContextValue>([
  undefined,
  () => {},
  () => {},
])

export function useSpotifyAuth() {
  return useContext(SpotifyAuthContext)
}

export function useSpotifyAuthToken() {
  const [token, _logOut] = useContext(SpotifyAuthContext)
  return token
}

export function useLogOut() {
  const [, logOut] = useContext(SpotifyAuthContext)
  return logOut
}

export const SpotifyCurrentUserContext = createContext<SpotifyUser | undefined>(undefined)

export function useCurrentUser() {
  return useContext(SpotifyCurrentUserContext)
}
