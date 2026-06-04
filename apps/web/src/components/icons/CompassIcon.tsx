import { StickerIcon, StickerIconProps } from './StickerIcon'

export function CompassIcon(props: StickerIconProps) {
  const activeColor = props.active ? 'var(--sq-ember-500)' : 'var(--sq-text-muted)'
  const highlightColor = props.active ? 'var(--sq-ember-300)' : 'var(--sq-text-faint)'
  const dialColor = props.active ? 'var(--sq-gold)' : 'var(--sq-text-faint)'

  return (
    <StickerIcon {...props} title="Quests Compass">
      {({ keyline }) => {
        if (keyline) {
          return (
            <circle cx="24" cy="24" r="17" fill="currentColor" stroke="currentColor" strokeWidth="6" />
          )
        }

        return (
          <>
            {/* Outer Ring */}
            <circle cx="24" cy="24" r="16" fill="var(--sq-surface)" stroke="var(--sq-ink)" strokeWidth="3" />
            <circle cx="24" cy="24" r="13" fill="var(--sq-keyline)" stroke="var(--sq-ink)" strokeWidth="1.5" />

            {/* Inner Dial markings */}
            <line x1="24" y1="9" x2="24" y2="12" stroke={dialColor} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="24" y1="36" x2="24" y2="39" stroke="var(--sq-ink)" strokeWidth="1.5" />
            <line x1="9" y1="24" x2="12" y2="24" stroke="var(--sq-ink)" strokeWidth="1.5" />
            <line x1="36" y1="24" x2="39" y2="24" stroke="var(--sq-ink)" strokeWidth="1.5" />

            {/* Compass Needle - Diagonal pointing to NE */}
            {/* North pointer (NE) */}
            <polygon 
              points="24,24 22,22 32,16 26,26" 
              fill={activeColor} 
              stroke="var(--sq-ink)" 
              strokeWidth="2" 
              strokeLinejoin="round" 
            />
            {/* South pointer (SW) */}
            <polygon 
              points="24,24 26,26 16,32 22,22" 
              fill={highlightColor} 
              stroke="var(--sq-ink)" 
              strokeWidth="2" 
              strokeLinejoin="round" 
            />

            {/* Center Pivot Point */}
            <circle cx="24" cy="24" r="3" fill="var(--sq-ink)" />
            <circle cx="24" cy="24" r="1" fill="var(--sq-keyline)" />
          </>
        )
      }}
    </StickerIcon>
  )
}
