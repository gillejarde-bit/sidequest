import { StickerIcon, StickerIconProps } from './StickerIcon'

export function SunIcon(props: StickerIconProps) {
  const activeColor = props.active ? 'var(--sq-gold)' : 'var(--sq-text-muted)'
  const highlightColor = props.active ? '#FFEFA6' : 'var(--sq-text-faint)'

  return (
    <StickerIcon {...props} title="Light Theme">
      {({ keyline }) => {
        if (keyline) {
          return (
            <>
              <circle cx="24" cy="24" r="10" fill="currentColor" stroke="currentColor" strokeWidth="6" />
              {/* Sun Rays */}
              <path 
                d="M24,6 L24,10 M24,38 L24,42 M6,24 L10,24 M38,24 L42,24 M11.3,11.3 L14.1,14.1 M33.9,33.9 L36.7,36.7 M11.3,36.7 L14.1,33.9 M33.9,11.3 L36.7,14.1" 
                stroke="currentColor" 
                strokeWidth="7.5" 
                strokeLinecap="round" 
              />
            </>
          )
        }

        return (
          <>
            <circle cx="24" cy="24" r="10" fill={activeColor} stroke="var(--sq-ink)" strokeWidth="2.5" />
            <circle cx="22" cy="22" r="7" fill={highlightColor} opacity="0.4" />
            <path 
              d="M24,6 L24,10 M24,38 L24,42 M6,24 L10,24 M38,24 L42,24 M11.3,11.3 L14.1,14.1 M33.9,33.9 L36.7,36.7 M11.3,36.7 L14.1,33.9 M33.9,11.3 L36.7,14.1" 
              stroke="var(--sq-ink)" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
            />
          </>
        )
      }}
    </StickerIcon>
  )
}
