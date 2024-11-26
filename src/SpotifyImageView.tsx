import { forwardRef, useMemo } from 'react'
import { Except, ReadonlyDeep } from 'type-fest'
import { useObservedDimensions } from './dimension-hooks'
import { SpotifyImage } from './spotify-api'

export interface SpotifyImageViewProps {
  images: ReadonlyDeep<SpotifyImage[]>
  width?: number
  className?: string
  alt?: string
}

export const SpotifyImageView = forwardRef<HTMLImageElement, SpotifyImageViewProps>(
  ({ images, width, className, alt }, ref) => {
    const srcSet = useMemo(() => {
      return images
        .map(image => {
          const width = image.width ?? 300
          return `${image.url} ${width}w`
        })
        .join(', ')
    }, [images])

    return (
      <img
        ref={ref}
        className={className}
        src={images[0].url}
        srcSet={srcSet}
        sizes={width ? `${width}px` : undefined}
        alt={alt ?? ''}
      />
    )
  },
)

/**
 * A `SpotifyImageView` that determines which image width to request automatically based on its
 * rendered dimensions. */
export function AutoSpotifyImageView(imageProps: Except<SpotifyImageViewProps, 'width'>) {
  const [ref, dimens] = useObservedDimensions()
  return <SpotifyImageView ref={ref} {...imageProps} width={dimens?.width ?? undefined} />
}
