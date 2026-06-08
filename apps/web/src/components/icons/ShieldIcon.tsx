import { StickerIcon, StickerIconProps } from './StickerIcon'

export function ShieldIcon(props: StickerIconProps) {
  const activeColor = props.active ? 'var(--sq-sage-500)' : 'var(--sq-text-muted)'

  return (
    <StickerIcon {...props} title="Security">
      {({ keyline }) => {
        const shieldPath = "M24,6 L8,11 L8,24 C8,33 14,40 24,43 C34,40 40,33 40,24 L40,11 L24,6 Z"
        
        if (keyline) {
          return (
            <path d={shieldPath} fill="currentColor" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
          )
        }

        return (
          <path d={shieldPath} fill={activeColor} stroke="var(--sq-ink)" strokeWidth="2.5" strokeLinejoin="round" />
        )
      }}
    </StickerIcon>
  )
}
