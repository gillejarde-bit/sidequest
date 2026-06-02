import React, { useId } from 'react'

export type StampKind = 'food' | 'outdoors' | 'nightlife' | 'culture' | 'fitness' | 'gem'

interface StampProps {
  kind: StampKind
  isFoil?: boolean
  className?: string
  style?: React.CSSProperties
  size?: number
}

const STAMP_STYLES: Record<StampKind, {
  border: string
  bg: string
  color: string
  label: string
}> = {
  food: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    color: '#D97706', // Amber-600
    label: 'GASTRONOMY'
  },
  outdoors: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    color: '#059669', // Emerald-600
    label: 'THE WILDS'
  },
  nightlife: {
    border: 'border-violet-500/30',
    bg: 'bg-violet-50 dark:bg-violet-950/20',
    color: '#7C3AED', // Violet-600
    label: 'REVELRY'
  },
  culture: {
    border: 'border-indigo-500/30',
    bg: 'bg-indigo-50 dark:bg-indigo-950/20',
    color: '#4F46E5', // Indigo-600
    label: 'LORE & TRADITION'
  },
  fitness: {
    border: 'border-blue-500/30',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    color: '#2563EB', // Blue-600
    label: 'ATHLETICS'
  },
  gem: {
    border: 'border-yellow-600/30',
    bg: 'bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-950/30 dark:to-amber-950/20',
    color: '#D97706', // Gold-600
    label: 'PIONEER GEM'
  }
}

export function Stamp({ kind, isFoil = false, className = '', style, size = 120 }: StampProps) {
  const gradientId = useId()
  const info = STAMP_STYLES[kind] || STAMP_STYLES.food

  // Clean SVG icons for stamps (Duolingo-style, rounded shapes, bold paths)
  const renderIcon = () => {
    switch (kind) {
      case 'food':
        return (
          <g transform="translate(10, 10)">
            {/* Bowl / Ramen bowl */}
            <path
              d="M 10,40 Q 10,70 40,70 Q 70,70 70,40 Z"
              fill={isFoil ? `url(#${gradientId})` : info.color}
              opacity="0.85"
            />
            {/* Soup line */}
            <path
              d="M 10,40 L 70,40"
              stroke="#FFF"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Steam rising */}
            <path
              d="M 25,25 Q 30,15 25,5"
              fill="none"
              stroke={isFoil ? `url(#${gradientId})` : info.color}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M 40,28 Q 45,18 40,8"
              fill="none"
              stroke={isFoil ? `url(#${gradientId})` : info.color}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M 55,25 Q 60,15 55,5"
              fill="none"
              stroke={isFoil ? `url(#${gradientId})` : info.color}
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
        )
      case 'outdoors':
        return (
          <g transform="translate(10, 10)">
            {/* Two mountain peaks */}
            <polygon
              points="10,65 35,20 60,65"
              fill={isFoil ? `url(#${gradientId})` : info.color}
              opacity="0.6"
            />
            <polygon
              points="30,65 50,30 70,65"
              fill={isFoil ? `url(#${gradientId})` : info.color}
              opacity="0.9"
            />
            {/* Tiny Pine Tree */}
            <polygon
              points="30,65 35,50 40,65"
              fill="#FFF"
            />
            {/* Sun */}
            <circle
              cx="55"
              cy="20"
              r="6"
              fill={isFoil ? `url(#${gradientId})` : info.color}
            />
          </g>
        )
      case 'nightlife':
        return (
          <g transform="translate(10, 10)">
            {/* Large Crescent Moon */}
            <path
              d="M 25,15 A 25,25 0 1,0 65,55 A 18,18 0 1,1 25,15 Z"
              fill={isFoil ? `url(#${gradientId})` : info.color}
              opacity="0.9"
            />
            {/* Sparkle/Star */}
            <path
              d="M 50,20 L 52,25 L 57,27 L 52,29 L 50,34 L 48,29 L 43,27 L 48,25 Z"
              fill={isFoil ? `url(#${gradientId})` : info.color}
            />
            <path
              d="M 35,40 L 36.5,43 L 39.5,44 L 36.5,45 L 35,48 L 33.5,45 L 30.5,44 L 33.5,43 Z"
              fill="#FFF"
            />
          </g>
        )
      case 'culture':
        return (
          <g transform="translate(10, 10)">
            {/* Open Book */}
            <path
              d="M 40,55 Q 25,48 10,55 L 10,20 Q 25,13 40,20 Q 55,13 70,20 L 70,55 Q 55,48 40,55 Z"
              fill={isFoil ? `url(#${gradientId})` : info.color}
              opacity="0.85"
            />
            {/* Book Spine Center Gutter */}
            <line
              x1="40"
              y1="20"
              x2="40"
              y2="55"
              stroke="#FFF"
              strokeWidth="4.5"
            />
            {/* Ancient Mask details */}
            <circle cx="25" cy="35" r="4.5" fill="#FFF" />
            <circle cx="55" cy="35" r="4.5" fill="#FFF" />
            <path
              d="M 20,45 Q 25,48 30,45"
              fill="none"
              stroke="#FFF"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              d="M 50,45 Q 55,48 60,45"
              fill="none"
              stroke="#FFF"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </g>
        )
      case 'fitness':
        return (
          <g transform="translate(10, 10)">
            {/* Laurel Wreath */}
            <path
              d="M 12,35 C 12,60 30,62 40,62 C 50,62 68,60 68,35"
              fill="none"
              stroke={isFoil ? `url(#${gradientId})` : info.color}
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* Strong Bolt / Lightning Bolt */}
            <polygon
              points="45,8 25,38 38,38 35,62 55,32 42,32"
              fill={isFoil ? `url(#${gradientId})` : info.color}
              stroke="#FFF"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          </g>
        )
      case 'gem':
      default:
        return (
          <g transform="translate(10, 10)">
            {/* Hexagonal faceted diamond */}
            <polygon
              points="40,10 65,30 65,55 40,70 15,55 15,30"
              fill={isFoil ? `url(#${gradientId})` : '#F59E0B'}
              stroke={isFoil ? '#D97706' : '#B45309'}
              strokeWidth="4"
              strokeLinejoin="round"
            />
            {/* Facet lines */}
            <line x1="40" y1="10" x2="40" y2="70" stroke={isFoil ? '#FFF' : '#FEF3C7'} strokeWidth="3.5" opacity="0.6" />
            <line x1="15" y1="30" x2="65" y2="30" stroke={isFoil ? '#FFF' : '#FEF3C7'} strokeWidth="3.5" opacity="0.6" />
            <line x1="15" y1="55" x2="65" y2="55" stroke={isFoil ? '#FFF' : '#FEF3C7'} strokeWidth="3.5" opacity="0.6" />
            <polygon
              points="40,25 53,38 40,50 27,38"
              fill="none"
              stroke={isFoil ? '#FFF' : '#FEF3C7'}
              strokeWidth="3"
              opacity="0.8"
            />
          </g>
        )
    }
  }

  const wrapperClasses = `
    relative select-none flex flex-col items-center justify-center rounded-full border-4 border-dashed transition-all
    ${info.border} ${info.bg} ${className}
  `

  return (
    <div
      className={wrapperClasses}
      style={{
        width: size,
        height: size,
        transform: 'rotate(-4deg)',
        boxShadow: isFoil 
          ? '0 10px 25px -5px rgba(217, 119, 6, 0.3), inset 0 2px 4px rgba(255,255,255,0.4)' 
          : '0 4px 8px -2px rgba(0,0,0,0.06)',
        ...style
      }}
    >
      {/* Dynamic Foil Sheen Overlay */}
      {isFoil && (
        <div 
          className="absolute inset-0 rounded-full overflow-hidden pointer-events-none mix-blend-color-dodge z-10"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0) 70%)',
            backgroundSize: '300% 300%',
            animation: 'foilSweep 4s ease-in-out infinite'
          }}
        />
      )}

      {/* Embedded CSS for Foil Animation keyframes */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes foilSweep {
          0% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
          100% { background-position: 0% 0%; }
        }
      `}} />

      {/* SVG Canvas */}
      <svg
        viewBox="0 0 100 100"
        className="w-[80%] h-[80%]"
        style={{ filter: isFoil ? 'drop-shadow(0 2px 3px rgba(0,0,0,0.15))' : 'none' }}
      >
        <defs>
          {isFoil && (
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFE066" />
              <stop offset="35%" stopColor="#F59E0B" />
              <stop offset="70%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          )}
        </defs>
        
        {/* Render Outer Stamp scallop edges */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={isFoil ? '#D97706' : info.color}
          strokeWidth="3.5"
          strokeDasharray="6 3"
        />

        {/* Dynamic graphic icon */}
        {renderIcon()}
      </svg>

      {/* Circular Pressed Stamp Label */}
      <div 
        className="absolute bottom-2 font-black tracking-widest text-[7px]"
        style={{ color: isFoil ? '#D97706' : info.color, transform: 'scaleX(0.95)' }}
      >
        {isFoil ? 'PIONEER' : info.label}
      </div>
    </div>
  )
}
