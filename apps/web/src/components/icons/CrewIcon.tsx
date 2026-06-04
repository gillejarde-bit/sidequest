import { StickerIcon, StickerIconProps } from './StickerIcon'

export function CrewIcon(props: StickerIconProps) {
  const activeColor = props.active ? 'var(--sq-ember-500)' : 'var(--sq-text-muted)'
  const highlightColor = props.active ? 'var(--sq-ember-300)' : 'var(--sq-text-faint)'
  const extraColor = props.active ? 'var(--sq-gold)' : 'var(--sq-text-faint)'

  return (
    <StickerIcon {...props} title="Crew / Group">
      {({ keyline }) => {
        if (keyline) {
          return (
            <>
              {/* Center Head */}
              <circle cx="24" cy="16" r="6" fill="black" stroke="black" strokeWidth="6" />
              <path d="M14,35 C14,27 34,27 34,35 Z" fill="black" stroke="black" strokeWidth="6" />
              {/* Left Head */}
              <circle cx="15" cy="24" r="5" fill="black" stroke="black" strokeWidth="6" />
              <path d="M7,40 C7,33 23,33 23,40 Z" fill="black" stroke="black" strokeWidth="6" />
              {/* Right Head */}
              <circle cx="33" cy="24" r="5" fill="black" stroke="black" strokeWidth="6" />
              <path d="M25,40 C25,33 41,33 41,40 Z" fill="black" stroke="black" strokeWidth="6" />
            </>
          )
        }

        return (
          <>
            {/* Center Person (Background) */}
            <circle cx="24" cy="16" r="5.5" fill={highlightColor} stroke="var(--sq-ink)" strokeWidth="2" />
            <path 
              d="M14,35 C14,28 34,28 34,35" 
              fill={highlightColor} 
              stroke="var(--sq-ink)" 
              strokeWidth="2" 
              strokeLinejoin="round" 
            />

            {/* Left Person */}
            <circle cx="15" cy="24" r="4.5" fill={activeColor} stroke="var(--sq-ink)" strokeWidth="2" />
            <path 
              d="M7,40 C7,34 23,34 23,40" 
              fill={activeColor} 
              stroke="var(--sq-ink)" 
              strokeWidth="2" 
              strokeLinejoin="round" 
            />

            {/* Right Person */}
            <circle cx="33" cy="24" r="4.5" fill={extraColor} stroke="var(--sq-ink)" strokeWidth="2" />
            <path 
              d="M25,40 C25,34 41,34 41,40" 
              fill={extraColor} 
              stroke="var(--sq-ink)" 
              strokeWidth="2" 
              strokeLinejoin="round" 
            />
          </>
        )
      }}
    </StickerIcon>
  )
}
