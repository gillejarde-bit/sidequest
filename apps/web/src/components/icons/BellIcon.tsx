import { StickerIcon, StickerIconProps } from './StickerIcon'

export function BellIcon(props: StickerIconProps) {
  const activeColor = props.active ? 'var(--sq-gold)' : 'var(--sq-text-muted)'

  return (
    <StickerIcon {...props} title="Notifications">
      {({ keyline }) => {
        const bellPath = "M24,8 C17,8 14,13 14,19 L14,28 L10,32 L10,34 L38,34 L38,32 L34,28 L34,19 C34,13 31,8 24,8 Z"
        const clapperPath = "M20,34 C20,38 22,40 24,40 C26,40 28,38 28,34"
        
        if (keyline) {
          return (
            <>
              <path d={bellPath} fill="currentColor" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
              <path d={clapperPath} fill="currentColor" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
            </>
          )
        }

        return (
          <>
            <path d={clapperPath} fill="var(--sq-ink)" stroke="var(--sq-ink)" strokeWidth="2.5" strokeLinecap="round" />
            <path d={bellPath} fill={activeColor} stroke="var(--sq-ink)" strokeWidth="2.5" strokeLinejoin="round" />
            <circle cx="24" cy="6" r="2" fill="var(--sq-ink)" />
          </>
        )
      }}
    </StickerIcon>
  )
}
