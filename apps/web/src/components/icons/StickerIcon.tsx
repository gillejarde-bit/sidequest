import React, { ReactNode } from 'react'

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

      {/* 2. Keyline backing (drawn first with thick stroke, forced to white/keyline via style) */}
      <g
        style={{
          color: 'var(--sq-keyline, #FFFFFF)',
          fill: 'var(--sq-keyline, #FFFFFF)',
          stroke: 'var(--sq-keyline, #FFFFFF)',
        }}
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

export interface StickerWrapperProps {
  children: React.ReactElement<any>
  withShadow?: boolean
  className?: string
  onClick?: () => void
  active?: boolean
}

export function StickerWrapper({
  children,
  withShadow = true,
  className = '',
  onClick
}: StickerWrapperProps) {
  const childStyle = children.props.style || {}
  const childClass = children.props.className || ''

  // Clone the SVG icon with a thick white border to represent the sticker paper backing
  const keylineElement = React.cloneElement(children, {
    stroke: 'var(--sq-keyline, #FFFFFF)',
    fill: children.props.fill && children.props.fill !== 'none' ? 'var(--sq-keyline, #FFFFFF)' : 'none',
    strokeWidth: (parseFloat(children.props.strokeWidth || 2) + 3.5),
    style: {
      ...childStyle,
      stroke: 'var(--sq-keyline, #FFFFFF)',
      fill: children.props.fill && children.props.fill !== 'none' ? 'var(--sq-keyline, #FFFFFF)' : 'none',
      overflow: 'visible'
    },
    className: `${childClass} overflow-visible text-[var(--sq-keyline)]`
  })

  // Clone the SVG icon as the foreground drawing with dark ink borders
  const foregroundElement = React.cloneElement(children, {
    stroke: 'var(--sq-ink, #3A2A20)',
    fill: children.props.fill && children.props.fill !== 'none' ? 'currentColor' : 'none',
    strokeWidth: children.props.strokeWidth || 2,
    className: `${childClass} text-current`
  })

  return (
    <div
      className={`relative inline-block overflow-visible ${className}`}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : undefined,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        verticalAlign: 'middle'
      }}
    >
      {/* 3D Sticker Drop Shadow */}
      {withShadow && (
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-[70%] h-1 bg-black/16 rounded-full blur-[0.5px] pointer-events-none" />
      )}
      {/* Sticker Paper Backing */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ transform: 'scale(1)' }}>
        {keylineElement}
      </div>
      {/* Sticker Art Foreground */}
      <div className="relative flex items-center justify-center">
        {foregroundElement}
      </div>
    </div>
  )
}
