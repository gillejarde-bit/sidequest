import { StickerIcon, StickerIconProps } from './StickerIcon'

export function SettingsIcon(props: StickerIconProps) {
  const activeColor = props.active ? 'var(--sq-sage-600)' : 'var(--sq-text-muted)'

  return (
    <StickerIcon {...props} withShadow={false} title="Settings">
      {({ keyline }) => {
        if (keyline) {
          return (
            <path 
              d="M24,14 A10,10 0 1,0 24,34 A10,10 0 1,0 24,14 M24,11 L24,14 M24,34 L24,37 M14,24 L11,24 M34,24 L37,24 M17,17 L15,15 M31,31 L33,33 M17,31 L15,33 M31,17 L33,15" 
              fill="currentColor" 
              stroke="currentColor"
              strokeWidth="12"
              strokeLinecap="round"
            />
          )
        }

        return (
          <>
            {/* Gear hub */}
            <circle cx="24" cy="24" r="7" fill={activeColor} stroke="var(--sq-ink)" strokeWidth="2.5" />
            <circle cx="24" cy="24" r="2.5" fill="var(--sq-keyline)" stroke="var(--sq-ink)" strokeWidth="1.5" />

            {/* Gear teeth/cogs */}
            <g stroke="var(--sq-ink)" strokeWidth="3" strokeLinecap="round">
              <line x1="24" y1="11" x2="24" y2="14" />
              <line x1="24" y1="34" x2="24" y2="37" />
              <line x1="14" y1="24" x2="11" y2="24" />
              <line x1="34" y1="24" x2="37" y2="24" />
              <line x1="17" y1="17" x2="15" y2="15" />
              <line x1="31" y1="31" x2="33" y2="33" />
              <line x1="17" y1="31" x2="15" y2="33" />
              <line x1="31" y1="17" x2="33" y2="15" />
            </g>
          </>
        )
      }}
    </StickerIcon>
  )
}
