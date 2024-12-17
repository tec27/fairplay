import { css, Global } from '@emotion/react'
import { useEffect, useId, useRef, useState } from 'react'
import { AuthFlow } from './AuthFlow'
import { MaterialIcon } from './MaterialIcon'
import { PlaylistSorter, PlaylistSortMode } from './playlist-sorter'
import { ChoosePlaylistDialog } from './PlaylistsList'
import { SpotifyAuthProvider, SpotifyCurrentUserProvider, SpotifyUserView } from './Spotify'
import {
  fromPlaylistDetailsJson,
  PlaylistDetails,
  PlaylistDetailsJson,
  useCurrentUser,
  useSpotifyAuthToken,
} from './spotify-api'
import { AutoSpotifyImageView } from './SpotifyImageView'
import { useLocalStorageState } from './state-hooks'
import { BUTTON_RESET } from './style'

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
            margin: 0;
            overflow-wrap: break-word;
          }

          #root {
            isolation: isolate;
          }

          html,
          body,
          #root {
            width: 100%;
            height: 100%;
            padding: 0;
            margin: 0;
            background: #212732;
            color: #fff;
          }

          #root {
            --spotify-green: rgb(29, 185, 84);
            --color-error: #ff616e;
            --text-secondary: #a0c0d8;
          }

          a,
          a:visited {
            color: #86cbff;
            text-decoration: underline;
          }

          a:hover {
            color: oklch(from #86cbff calc(l * 1.05) c h);
            text-decoration: dotted underline;
          }

          a:active {
            color: oklch(from #86cbff calc(l * 1.1) c h);
          }
        `}
      />

      <SpotifyAuthProvider>
        <div
          css={css`
            position: relative;
            min-height: 100%;
            max-width: 960px;
            margin: 0 auto;
            padding: 16px 0;

            display: grid;
            grid-template-rows: auto 1fr auto;
            grid-template-columns: 100%;
          `}>
          <header>
            <div
              css={css`
                font-size: 32px;
                font-weight: 500;
                text-align: center;
              `}>
              fairplay
            </div>
            <div
              css={css`
                padding: 16px 16px;
                color: var(--text-secondary);
                font-size: 20px;
                text-align: center;
              `}>
              Sort a collaborative Spotify playlist for even playtime between all users.
            </div>
          </header>
          <AppContent />
          <AuthorFooter />
        </div>
      </SpotifyAuthProvider>
    </>
  )
}

function AuthorFooter() {
  return (
    <footer
      css={css`
        padding: 16px;
        text-align: center;
        color: var(--text-secondary);
        font-size: 16px;
      `}>
      <div>
        created by{' '}
        <a href='https://bsky.app/profile/tec27.com' target='_blank' rel='noopener'>
          tec27
        </a>
      </div>
    </footer>
  )
}

function AppContent() {
  const authToken = useSpotifyAuthToken()
  return authToken ? (
    <SpotifyCurrentUserProvider>
      <div>
        <SpotifyUserView />
        <MainForm />
      </div>
    </SpotifyCurrentUserProvider>
  ) : (
    <AuthFlow />
  )
}

function MainForm() {
  const spotifyUser = useCurrentUser()
  const spotifyAuth = useSpotifyAuthToken()
  const [isPlaylistDialogOpen, setIsPlaylistDialogOpen] = useState(false)
  const [playlistId, setPlaylistId] = useLocalStorageState<string | undefined>(
    `fairplay.${spotifyUser?.id ?? ''}:playlist`,
    undefined,
  )
  const [error, setError] = useState<Error | undefined>(undefined)

  const [playlist, setPlaylist] = useState<PlaylistDetails | undefined>(undefined)
  const abortRef = useRef<AbortController>()
  useEffect(() => {
    abortRef.current?.abort()

    if (!playlistId) {
      return
    }

    const abortController = new AbortController()
    abortRef.current = abortController
    spotifyAuth
      ?.fetch<PlaylistDetailsJson>(
        `/playlists/${encodeURIComponent(playlistId)}` +
          '?fields=description,id,images,name,owner,tracks.total,uri',
        {
          signal: abortController.signal,
        },
      )
      .then(json => {
        if (!abortController.signal.aborted) {
          setPlaylist(json ? fromPlaylistDetailsJson(json) : json)
        }
      })
      .catch(err => {
        if (err.name === 'AbortError') {
          return
        }

        setError(err)
        setPlaylistId(undefined)
      })

    return () => {
      abortController.abort()
    }
  }, [spotifyAuth, playlistId, setPlaylistId])

  return (
    <>
      <ChoosePlaylistDialog
        isOpen={isPlaylistDialogOpen}
        onClose={r => {
          setIsPlaylistDialogOpen(false)
          if (r) {
            setPlaylistId(r)
          }
        }}
      />
      <button
        css={css`
          ${BUTTON_RESET};
          min-width: 240px;
          max-width: min(480px, 100%);
          margin: 32px auto 40px;

          display: block;

          background: #292e3a;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          color: #fff;

          &:hover,
          &:focus {
            background: oklch(from #292e3a calc(l * 1.05) c h);
          }

          &:active {
            background: oklch(from #292e3a calc(l * 1.1) c h);
          }
        `}
        onClick={() => setIsPlaylistDialogOpen(true)}
        title={'Choose playlist'}>
        <PlaylistPreview playlistId={playlistId} playlist={playlist} />
      </button>
      {error ? (
        <div
          css={css`
            color: var(--color-error);
            font-size: 20px;
            text-align: center;
          `}>
          Error: {error.message}
        </div>
      ) : undefined}
      {playlistId ? <PlaylistSorterView playlistId={playlistId} /> : undefined}
    </>
  )
}

function PlaylistPreview({
  playlistId,
  playlist,
}: {
  playlistId?: string
  playlist?: PlaylistDetails
}) {
  return (
    <div
      css={css`
        width: 100%;
        height: 80px;

        display: flex;
        align-items: center;
        justify-content: ${playlist && playlistId ? 'flex-start' : 'center'};
        gap: 8px;

        color: ${playlist && playlistId ? '#fff' : 'var(--text-secondary)'};
      `}>
      {playlistId && !playlist ? <div>Loading&hellip;</div> : undefined}
      {playlist ? (
        <>
          <AutoSpotifyImageView
            css={css`
              width: auto;
              height: 100%;
              flex-grow: 0;
              aspect-ratio: 1 / 1;
              object-fit: cover;
            `}
            images={playlist.images}
          />
          <div
            css={css`
              min-width: 0;
              flex: 1 1 0;
              padding-left: 8px;
              padding-right: 16px;
              font-size: 20px;
              font-weight: 500;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            `}>
            {playlist.name}
          </div>
        </>
      ) : undefined}
      {!playlistId && !playlist ? (
        <>
          <MaterialIcon
            css={css`
              padding-left: 16px;
            `}
            icon='playlist_add'
            size={48}
          />
          <div
            css={css`
              padding-left: 16px;
              padding-right: 16px;
            `}>
            Choose playlist
          </div>
        </>
      ) : undefined}
    </div>
  )
}

function PlaylistSorterView({ playlistId }: { playlistId: string }) {
  const spotifyAuth = useSpotifyAuthToken()
  const [sortMode, setSortMode] = useLocalStorageState<PlaylistSortMode>(
    'fairplay.sortMode',
    PlaylistSortMode.Continuous,
  )
  const playlistSorterRef = useRef<PlaylistSorter | undefined>(undefined)
  const [sortActive, setSortActive] = useState(false)
  const [sortStatus, setSortStatus] = useState<string | undefined>(undefined)
  const [error, setError] = useState<Error | undefined>(undefined)

  useEffect(() => {
    if (!spotifyAuth) {
      return
    }

    const playlistSorter = new PlaylistSorter(spotifyAuth, playlistId, sortMode)
    playlistSorterRef.current = playlistSorter

    playlistSorter
      .on('activeChange', setSortActive)
      .on('statusChange', setSortStatus)
      .on('error', setError)

    return () => {
      playlistSorterRef.current = undefined
      playlistSorter.stop()
      playlistSorter
        .off('activeChange', setSortActive)
        .off('statusChange', setSortStatus)
        .off('error', setError)
    }
  }, [spotifyAuth, playlistId, sortMode])

  return (
    <div
      css={css`
        text-align: center;
      `}>
      <fieldset
        css={css`
          width: 320px;
          margin: 0 auto;
          padding: 0 16px;

          display: block;

          border: none;
          text-align: left;
        `}>
        <legend
          css={css`
            margin: 0 0 8px;
            padding: 0;
            font-size: 16px;
            text-align: left;
          `}>
          Sort mode:
        </legend>
        <div
          css={css`
            width: 100%;

            display: flex;
            align-items: stretch;
            justify-content: center;

            text-align: center;
          `}>
          <ToggleSwitch
            name='sortMode'
            value={PlaylistSortMode.Continuous}
            checked={sortMode === PlaylistSortMode.Continuous}
            onChange={e => setSortMode(e.target.value as PlaylistSortMode)}
            label='Continuous'
          />
          <ToggleSwitch
            name='sortMode'
            value={PlaylistSortMode.OneTime}
            checked={sortMode === PlaylistSortMode.OneTime}
            onChange={e => setSortMode(e.target.value as PlaylistSortMode)}
            label='One time'
          />
        </div>
      </fieldset>

      <div
        css={css`
          margin: 16px 0 64px;

          display: inline-block;

          color: var(--text-secondary);
        `}>
        {sortMode === PlaylistSortMode.Continuous ? (
          <>
            <p>Sort the selected playlist during playback, from the current playback point.</p>
            <p>
              Make sure this Spotify account is the one playing the playlist, and that shuffle is
              disabled.
            </p>
          </>
        ) : (
          <>Sort the selected playlist once in its entirety.</>
        )}
      </div>

      <div
        css={css`
          margin-bottom: 24px;
        `}>
        <button
          css={css`
            ${BUTTON_RESET};
            width: 128px;
            height: 48px;

            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;

            border: 2px solid currentColor;
            border-radius: 8px 0 0 8px;
            color: #62ff89;
            font-size: 20px;

            transition:
              border-color 100ms ease-out,
              color 100ms ease-out,
              opacity 100ms ease-out;

            &:disabled {
              border-right: 2px solid transparent;
              color: #fff;
              opacity: 0.5;
              cursor: not-allowed;
            }
          `}
          onClick={() => playlistSorterRef.current?.start()}
          disabled={sortActive}>
          <MaterialIcon icon='play_arrow' size={24} />
          <span>Start</span>
        </button>
        <button
          css={css`
            ${BUTTON_RESET};
            width: 128px;
            height: 48px;

            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;

            border: 2px solid currentColor;
            border-radius: 0 8px 8px 0;
            color: #ff616e;
            font-size: 20px;

            transition:
              border-color 100ms ease-out,
              color 100ms ease-out,
              opacity 100ms ease-out;

            &:disabled {
              border-left: 2px solid transparent;
              color: #fff;
              opacity: 0.5;
              cursor: not-allowed;
            }
          `}
          onClick={() => playlistSorterRef.current?.stop()}
          disabled={!sortActive}>
          <MaterialIcon icon='stop' size={24} />
          <span>Stop</span>
        </button>
      </div>
      {error ? (
        <div
          css={css`
            color: var(--color-error);
            font-size: 20px;
            padding-bottom: 16px;
          `}>
          Error: {error.message}
        </div>
      ) : undefined}
      <div>
        <span
          css={css`
            color: var(--text-secondary);
          `}>
          Status:{' '}
        </span>
        {sortStatus}
      </div>
    </div>
  )
}

function ToggleSwitch({
  name,
  value,
  checked,
  onChange,
  label,
}: {
  name: string
  value: string
  checked: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  label: React.ReactNode
}) {
  const id = useId()

  return (
    <>
      <input
        css={css`
          width: 0;
          height: 0;
          position: absolute;
          left: -9999px;

          &:checked + label {
            background-color: #084d75;
            border-color: #2581b6;
          }
        `}
        type='radio'
        name={name}
        value={value}
        checked={checked}
        id={id}
        onChange={onChange}
      />
      <label
        htmlFor={id}
        css={css`
          width: 50%;
          padding: 16px;

          border: solid 1px rgba(255, 255, 255, 0.12);
          cursor: pointer;
          transition:
            border-color 150ms ease-out,
            color 150ms ease-out,
            background-color 150ms ease-out;

          &:first-of-type {
            border-radius: 8px 0 0 8px;
            border-right: none;
          }
          &:last-of-type {
            border-radius: 0 8px 8px 0;
            border-left: none;
          }

          &:hover {
            background-color: oklch(from #084d75 calc(l * 1.1) c h);
            border-color: oklch(from #2581b6 calc(l * 1.1) c h);
          }
        `}>
        {label}
      </label>
    </>
  )
}
