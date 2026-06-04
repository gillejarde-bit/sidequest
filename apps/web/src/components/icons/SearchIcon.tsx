import { StickerIcon, StickerIconProps } from './StickerIcon'

export function SearchIcon(props: StickerIconProps) {
  const activeColor = props.active ? 'var(--sq-ember-500)' : 'var(--sq-text-muted)'

  return (
    <StickerIcon {...props} title="Search">
      {({ keyline }) => {
        if (keyline) {
          return (
            <>
              <circle cx="20" cy="20" r="9" fill="none" stroke="black" strokeWidth="12" />
              <line x1="26" y1="26" x2="38" y2="38" stroke="black" strokeWidth="12" strokeLinecap="round" />
            </>
          )
        }

        return (
          <>
            {/* Handle */}
            <line 
              x1="26" y1="26" x2="38" y2="38" 
              stroke="var(--sq-ink)" 
              strokeWidth="5.5" 
              strokeLinecap="round" 
            />
            <line 
              x1="28" y1="28" x2="36" y2="36" 
              stroke={activeColor} 
              strokeWidth="2.5" 
              strokeLinecap="round" 
            />

            {/* Lens Rim */}
            <circle 
              cx="20" cy="20" r="9" 
              fill="var(--sq-keyline)" 
              stroke="var(--sq-ink)" 
              strokeWidth="3" 
            />
            {/* Glass inside */}
            <circle 
              cx="20" cy="20" r="6" 
              fill="var(--sq-surface)" 
              opacity="0.6"
            />
          </>
        )
      }}
    </StickerIcon>
  )
}
