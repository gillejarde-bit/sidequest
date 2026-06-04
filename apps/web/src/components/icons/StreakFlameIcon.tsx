import { StickerIcon, StickerIconProps } from './StickerIcon'

export function StreakFlameIcon(props: StickerIconProps) {
  const activeColor = props.active ? 'var(--sq-ember-500)' : 'var(--sq-text-muted)'
  const highlightColor = props.active ? 'var(--sq-ember-300)' : 'var(--sq-text-faint)'

  return (
    <StickerIcon {...props} title="Streak Flame">
      {({ keyline }) => {
        if (keyline) {
          return (
            <path 
              d="M24,7 C33,18 36,25 36,33 C36,39 30,41 24,41 C18,41 12,39 12,33 C12,25 15,18 24,7 Z" 
              fill="currentColor" 
              stroke="currentColor"
              strokeWidth="6"
              strokeLinejoin="round"
            />
          )
        }

        return (
          <>
            {/* Outer flame */}
            <path 
              d="M24,8 C32.5,18.5 35,25 35,32 C35,38 29.5,40 24,40 C18.5,40 13,38 13,32 C13,25 15.5,18.5 24,8 Z" 
              fill={activeColor} 
              stroke="var(--sq-ink)" 
              strokeWidth="2.5" 
              strokeLinejoin="round" 
            />

            {/* Inner core */}
            <path 
              d="M24,19 C28,26 30,29 30,33 C30,36.5 27,37.5 24,37.5 C21,37.5 18,36.5 18,33 C18,29 20,26 24,19 Z" 
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
