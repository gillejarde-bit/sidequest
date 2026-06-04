import { StickerIcon, StickerIconProps } from './StickerIcon'

export function SparkleIcon(props: StickerIconProps) {
  const activeColor = props.active ? 'var(--sq-gold)' : 'var(--sq-text-muted)'
  const highlightColor = props.active ? 'var(--sq-gold-soft)' : 'var(--sq-text-faint)'

  return (
    <StickerIcon {...props} title="Sparkle">
      {({ keyline }) => {
        if (keyline) {
          return (
            <polygon 
              points="24,8 29,19 40,24 29,29 24,40 19,29 8,24 19,19" 
              fill="currentColor" 
              stroke="currentColor"
              strokeWidth="6"
              strokeLinejoin="round"
            />
          )
        }

        return (
          <>
            <polygon 
              points="24,8 29,19 40,24 29,29 24,40 19,29 8,24 19,19" 
              fill={activeColor} 
              stroke="var(--sq-ink)" 
              strokeWidth="2.5" 
              strokeLinejoin="round" 
            />
            {/* Lighter highlight on the top left facets */}
            <polygon 
              points="24,8 29,19 24,24 19,19" 
              fill={highlightColor} 
              stroke="var(--sq-ink)" 
              strokeWidth="1.5" 
              strokeLinejoin="round" 
            />
          </>
        )
      }}
    </StickerIcon>
  )
}
