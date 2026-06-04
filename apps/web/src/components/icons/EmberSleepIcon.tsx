import { StickerIcon, StickerIconProps } from './StickerIcon'

export function EmberSleepIcon(props: StickerIconProps) {
  const activeColor = props.active ? 'var(--sq-ember-500)' : 'var(--sq-text-muted)'
  const highlightColor = props.active ? 'var(--sq-ember-300)' : 'var(--sq-text-faint)'

  return (
    <StickerIcon {...props} title="Sleeping Ember Mascot">
      {({ keyline }) => {
        if (keyline) {
          return (
            <>
              {/* Flame silhouette */}
              <path d="M24,10 C29,18 36,22 36,31 C36,38 29,41 24,41 C19,41 12,38 12,31 C12,22 19,18 24,10 Z" fill="currentColor" stroke="currentColor" strokeWidth="6" />
              {/* Sleep bubbles ZZZ outline */}
              <text x="32" y="16" fontSize="10" fontWeight="bold" fontFamily="sans-serif" stroke="currentColor" strokeWidth="6" fill="currentColor">Z</text>
              <text x="37" y="10" fontSize="7" fontWeight="bold" fontFamily="sans-serif" stroke="currentColor" strokeWidth="6" fill="currentColor">z</text>
            </>
          )
        }

        return (
          <>
            {/* Sleeping Ember Body */}
            <path 
              d="M24,11 C28.5,18.5 35,22 35,30.5 C35,37 29,40 24,40 C19,40 13,37 13,30.5 C13,22 19.5,18.5 24,11 Z" 
              fill={activeColor} 
              stroke="var(--sq-ink)" 
              strokeWidth="2.5" 
              strokeLinejoin="round" 
            />

            {/* Inner Belly area */}
            <path 
              d="M24,22 C27.5,27 30,29 30,32.5 C30,36.5 27,37.5 24,37.5 C21,37.5 18,36.5 18,32.5 C18,29 20.5,27 24,22 Z" 
              fill={highlightColor} 
              stroke="var(--sq-ink)" 
              strokeWidth="1.5" 
              strokeLinejoin="round" 
            />

            {/* Closed sleeping eyes (ink) */}
            <path d="M17,27 C18,29 19,29 20,27" fill="none" stroke="var(--sq-ink)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M28,27 C29,29 30,29 31,27" fill="none" stroke="var(--sq-ink)" strokeWidth="2.5" strokeLinecap="round" />

            {/* Sleeping ZZZ letters */}
            <text x="32" y="16" fontSize="10" fontWeight="black" fontFamily="var(--sq-font)" fill="var(--sq-ink)">Z</text>
            <text x="37" y="10" fontSize="7" fontWeight="black" fontFamily="var(--sq-font)" fill="var(--sq-ink)">z</text>
          </>
        )
      }}
    </StickerIcon>
  )
}
