import { StickerIcon, StickerIconProps } from './StickerIcon'

export function CampfireIcon(props: StickerIconProps) {
  const activeColor = props.active ? 'var(--sq-ember-500)' : 'var(--sq-text-muted)'
  const highlightColor = props.active ? 'var(--sq-ember-300)' : 'var(--sq-text-faint)'

  return (
    <StickerIcon {...props} title="Campfire">
      {({ keyline }) => {
        if (keyline) {
          return (
            <>
              {/* Crossed Logs Silhouette */}
              <line x1="10" y1="38" x2="38" y2="30" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
              <line x1="10" y1="30" x2="38" y2="38" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
              
              {/* Flame Silhouette */}
              <path d="M24,6 C28,14 38,18 38,30 C38,38 30,40 24,40 C18,40 10,38 10,30 C10,18 20,14 24,6 Z" fill="currentColor" />
            </>
          )
        }

        return (
          <>
            {/* Logs in background */}
            <line x1="10" y1="38" x2="38" y2="30" stroke="var(--sq-ink)" strokeWidth="4" strokeLinecap="round" />
            <line x1="10" y1="30" x2="38" y2="38" stroke="var(--sq-ink)" strokeWidth="4" strokeLinecap="round" />
            <circle cx="10" cy="34" r="2" fill="var(--sq-text-faint)" />
            <circle cx="38" cy="34" r="2" fill="var(--sq-text-faint)" />

            {/* Main flame */}
            <path 
              d="M24,7 C27,15 37,19 37,29 C37,36 30,39 24,39 C18,39 11,36 11,29 C11,19 21,15 24,7 Z" 
              fill={activeColor} 
            />

            {/* Inner flame core highlight */}
            <path 
              d="M24,16 C26,21 32,23 32,29 C32,34 28,36 24,36 C20,34 16,34 16,29 C16,23 22,21 24,16 Z" 
              fill={highlightColor} 
            />

            {/* Flame inner detail lines */}
            <path 
              d="M24,22 C25,25 28,27 28,29 C28,31 26,32 24,32 C22,32 20,31 20,29 C20,27 23,25 24,22 Z" 
              fill="var(--sq-ink)" 
              opacity="0.25"
            />
          </>
        )
      }}
    </StickerIcon>
  )
}
