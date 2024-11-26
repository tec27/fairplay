import { css } from '@emotion/react'

export interface MaterialIconProps {
  icon: string
  size?: number
  filled?: boolean
  dark?: boolean
  className?: string
}

export function MaterialIcon({
  icon,
  size = 24,
  filled = true,
  dark = true,
  className,
}: MaterialIconProps) {
  return (
    <span
      css={css`
        font-family: 'Material Symbols Outlined';
        font-weight: normal;
        font-style: normal;
        font-size: ${size}px;
        line-height: 1;
        letter-spacing: normal;
        text-transform: none;
        display: inline-block;
        white-space: nowrap;
        word-wrap: normal;
        direction: ltr;
        -webkit-font-feature-settings: 'liga';
        -webkit-font-smoothing: antialiased;
        user-select: none;

        width: ${size}px;
        height: ${size}px;

        font-variation-settings:
          'FILL' ${filled ? 1 : 0},
          'opsz' ${Math.min(48, Math.max(20, size))},
          'GRAD' ${dark ? 0 : 1};

        transition: font-variation-settings 125ms ease-in-out;
      `}
      className={className}
      aria-hidden={true}>
      {icon}
    </span>
  )
}
