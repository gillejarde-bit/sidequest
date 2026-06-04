import { ReactNode } from 'react'

export interface StickerIconProps {
  size?: number
  withShadow?: boolean
  title?: string
  className?: string
  onClick?: () => void
  active?: boolean
}

interface InternalStickerIconProps extends StickerIconProps {
  children: (props: { keyline: boolean }) => ReactNode
}

export function StickerIcon({
  size = 28,
  withShadow = true,
  title,
  className = '',
  onClick,
  children
}: InternalStickerIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={`select-none overflow-visible transition-transform duration-200 active:scale-95 ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      aria-label={title}
      role={title ? 'img' : 'presentation'}
    >
      {title && <title>{title}</title>}
      
      {/* 1. Flat Shadow Ellipse beneath (y42), no blur filters */}
      {withShadow && (
        <ellipse
          cx="24"
          cy="42"
          rx="15"
          ry="3"
          fill="#000000"
          opacity="0.16"
        />
      )}

      {/* 2. Keyline backing (drawn first with thick stroke) */}
      <g
        fill="var(--sq-keyline, #FBF3E4)"
        stroke="var(--sq-keyline, #FBF3E4)"
        strokeWidth="7"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {children({ keyline: true })}
      </g>

      {/* 3. Foreground Color Layer */}
      <g>
        {children({ keyline: false })}
      </g>
    </svg>
  )
}
