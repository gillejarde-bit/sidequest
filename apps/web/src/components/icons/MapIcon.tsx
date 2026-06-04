import { StickerIcon, StickerIconProps } from './StickerIcon'

export function MapIcon(props: StickerIconProps) {
  const activeColor = props.active ? 'var(--sq-sage-500)' : 'var(--sq-text-muted)'
  const highlightColor = props.active ? 'var(--sq-sage-100)' : 'var(--sq-text-faint)'

  return (
    <StickerIcon {...props} title="Explore Map">
      {({ keyline }) => {
        if (keyline) {
          return (
            <path 
              d="M9,11 L20,15 L28,11 L39,15 L39,39 L28,35 L20,39 L9,35 Z" 
              fill="black" 
              stroke="black"
              strokeWidth="6"
              strokeLinejoin="round"
            />
          )
        }

        return (
          <>
            {/* Base map panels */}
            <path 
              d="M9,11 L20,15 L20,39 L9,35 Z" 
              fill={activeColor} 
              stroke="var(--sq-ink)" 
              strokeWidth="2.5" 
              strokeLinejoin="round" 
            />
            <path 
              d="M20,15 L28,11 L28,35 L20,39 Z" 
              fill={highlightColor} 
              stroke="var(--sq-ink)" 
              strokeWidth="2.5" 
              strokeLinejoin="round" 
            />
            <path 
              d="M28,11 L39,15 L39,39 L28,35 Z" 
              fill={activeColor} 
              stroke="var(--sq-ink)" 
              strokeWidth="2.5" 
              strokeLinejoin="round" 
            />

            {/* Minor map trail line */}
            <path 
              d="M13,20 C16,22 18,18 22,22 C24,24 26,20 30,22 C33,24 35,22 36,26" 
              fill="none" 
              stroke="var(--sq-ink)" 
              strokeWidth="2" 
              strokeDasharray="2 2"
              strokeLinecap="round" 
            />
          </>
        )
      }}
    </StickerIcon>
  )
}
