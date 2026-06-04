import { StickerIcon, StickerIconProps } from './StickerIcon'

export function CalendarIcon(props: StickerIconProps) {
  const activeColor = props.active ? 'var(--sq-ember-500)' : 'var(--sq-text-muted)'
  const cardColor = props.active ? 'var(--sq-keyline)' : 'var(--sq-surface)'

  return (
    <StickerIcon {...props} title="Calendar">
      {({ keyline }) => {
        if (keyline) {
          return (
            <rect x="9" y="11" width="30" height="28" rx="4" fill="black" stroke="black" strokeWidth="6" />
          )
        }

        return (
          <>
            {/* Calendar card board */}
            <rect 
              x="9" y="11" width="30" height="28" rx="4" 
              fill={cardColor} 
              stroke="var(--sq-ink)" 
              strokeWidth="3" 
            />

            {/* Red accent top band */}
            <path 
              d="M10.5,12.5 L37.5,12.5 L37.5,19 L10.5,19 Z" 
              fill={activeColor} 
              stroke="var(--sq-ink)" 
              strokeWidth="2" 
              strokeLinejoin="round" 
            />

            {/* Grid markers (dots or lines) */}
            <circle cx="15" cy="24" r="1.5" fill="var(--sq-ink)" />
            <circle cx="24" cy="24" r="1.5" fill="var(--sq-ink)" />
            <circle cx="33" cy="24" r="1.5" fill="var(--sq-ink)" />

            <circle cx="15" cy="32" r="1.5" fill="var(--sq-ink)" />
            {/* Highlighted today circle */}
            <circle cx="24" cy="32" r="3.5" fill="none" stroke="var(--sq-heart)" strokeWidth="2.5" />
            <circle cx="33" cy="32" r="1.5" fill="var(--sq-ink)" />

            {/* Binder rings at the top */}
            <path d="M15,7 L15,13" fill="none" stroke="var(--sq-ink)" strokeWidth="3" strokeLinecap="round" />
            <path d="M33,7 L33,13" fill="none" stroke="var(--sq-ink)" strokeWidth="3" strokeLinecap="round" />
          </>
        )
      }}
    </StickerIcon>
  )
}
