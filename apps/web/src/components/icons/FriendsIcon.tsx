import { StickerIcon, StickerIconProps } from './StickerIcon'

export function FriendsIcon(props: StickerIconProps) {
  const activeColor = props.active ? 'var(--sq-sage-500)' : 'var(--sq-text-muted)'
  const highlightColor = props.active ? 'var(--sq-sage-100)' : 'var(--sq-text-faint)'

  return (
    <StickerIcon {...props} title="Friends">
      {({ keyline }) => {
        if (keyline) {
          return (
            <>
              {/* Back friend */}
              <circle cx="30" cy="18" r="7" fill="black" stroke="black" strokeWidth="6" />
              <path d="M20,38 C20,30 40,30 40,38 Z" fill="black" stroke="black" strokeWidth="6" strokeLinejoin="round" />
              
              {/* Front friend */}
              <circle cx="18" cy="22" r="7" fill="black" stroke="black" strokeWidth="6" />
              <path d="M8,41 C8,33 28,33 28,41 Z" fill="black" stroke="black" strokeWidth="6" strokeLinejoin="round" />
            </>
          )
        }

        return (
          <>
            {/* Back friend (Right) */}
            <circle cx="30" cy="18" r="6" fill={highlightColor} stroke="var(--sq-ink)" strokeWidth="2.5" />
            <path 
              d="M20,38 C20,31 40,31 40,38" 
              fill={highlightColor} 
              stroke="var(--sq-ink)" 
              strokeWidth="2.5" 
              strokeLinejoin="round" 
            />

            {/* Front friend (Left) */}
            <circle cx="18" cy="22" r="6" fill={activeColor} stroke="var(--sq-ink)" strokeWidth="2.5" />
            <path 
              d="M8,41 C8,34 28,34 28,41" 
              fill={activeColor} 
              stroke="var(--sq-ink)" 
              strokeWidth="2.5" 
              strokeLinejoin="round" 
            />
          </>
        )
      }}
    </StickerIcon>
  )
}
