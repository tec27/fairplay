import { css } from '@emotion/react'
import { ReadonlyDeep } from 'type-fest'
import { MaterialIcon } from './MaterialIcon'
import { AutoSpotifyImageView } from './SpotifyImageView'
import { SpotifyLayoutType } from './layout-type'
import { CurrentlyPlaying, SpotifyItem, getImages } from './spotify-api'

export function NowPlaying({
  info,
  layout,
}: {
  info: ReadonlyDeep<CurrentlyPlaying>
  layout: SpotifyLayoutType
}) {
  switch (layout) {
    case SpotifyLayoutType.SideBySide:
    default:
      return <SideBySide info={info} />
  }
}

interface NowPlayingLayoutProps {
  info: ReadonlyDeep<CurrentlyPlaying>
}

const singleLineEllipsis = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

function Title({ item, className }: { item: ReadonlyDeep<SpotifyItem>; className?: string }) {
  return (
    <div
      css={css`
        font-size: calc(var(--cs-font-size) * var(--cs-size-title, 1));
      `}
      className={className}>
      {item.name}
    </div>
  )
}

function ArtistsOrShow({
  item,
  className,
}: {
  item: ReadonlyDeep<SpotifyItem>
  className?: string
}) {
  return (
    <div
      css={css`
        font-size: calc(var(--cs-font-size) * var(--cs-size-artist, 1));
      `}
      className={className}>
      {item.type === 'track' ? item.artists.map(a => a.name).join(', ') : item.show.name}
    </div>
  )
}

function SideBySide({ info }: NowPlayingLayoutProps) {
  return (
    <div
      css={css`
        width: 100%;
        height: 100%;

        display: flex;
        align-items: center;
        gap: 16px;
        overflow: hidden;
      `}>
      <div
        css={css`
          height: 100%;
          aspect-ratio: 1 / 1;
          position: relative;
        `}>
        <AutoSpotifyImageView
          css={css`
            width: 100%;
            height: 100%;
            background-size: contain;
            border-radius: var(--cs-art-border-radius);
          `}
          images={getImages(info)}
        />
        {!info.isPlaying ? (
          <div
            css={css`
              position: absolute;
              left: calc(50% - 24px);
              top: calc(50% - 24px);
              width: 48px;
              height: 48px;
              display: flex;
              align-items: center;
              justify-content: center;

              background-color: var(--cs-background-color);
              border: 1px solid var(--cs-font-color);
              border-radius: 9999px;
              opacity: 0.8;
            `}>
            <MaterialIcon icon='pause' size={40} />
          </div>
        ) : undefined}
      </div>
      <div
        css={css`
          height: 100%;
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
        `}>
        <Title
          css={css`
            ${singleLineEllipsis};
          `}
          item={info.item}
        />
        <ArtistsOrShow
          css={css`
            ${singleLineEllipsis};
          `}
          item={info.item}
        />
      </div>
    </div>
  )
}
