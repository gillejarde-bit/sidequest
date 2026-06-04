import { StickerIcon, StickerIconProps } from './StickerIcon'

export function GemIcon(props: StickerIconProps) {
  const activeColor = props.active ? 'var(--sq-sage-500)' : 'var(--sq-text-muted)'
  const highlightColor = props.active ? 'var(--sq-sage-100)' : 'var(--sq-text-faint)'

  return (
    <StickerIcon {...props} title="Hidden Gem">
      {({ keyline }) => {
        if (keyline) {
          return (
            <polygon 
              points="24,8 38,20 24,38 10,20" 
              fill="black" 
              stroke="black"
              strokeWidth="6"
              strokeLinejoin="round"
            />
          )
        }

        return (
          <>
            {/* Main Diamond Facets */}
            <polygon 
              points="24,8 38,20 24,38 10,20" 
              fill={activeColor} 
              stroke="var(--sq-ink)" 
              strokeWidth="2.5" 
              strokeLinejoin="round" 
            />

            {/* Top highlight facet */}
            <polygon 
              points="24,8 38,20 24,20" 
              fill={highlightColor} 
              stroke="var(--sq-ink)" 
              strokeWidth="1.5" 
              strokeLinejoin="round" 
            />

            {/* Inner facet lines */}
            <line x1="24" y1="8" x2="24" y2="38" stroke="var(--sq-ink)" strokeWidth="1.5" />
            <line x1="10" y1="20" x2="38" y2="20" stroke="var(--sq-ink)" strokeWidth="1.5" />
          </>
        )
      }}
    </StickerIcon>
  )
}
