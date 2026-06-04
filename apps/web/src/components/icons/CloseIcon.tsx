import { StickerIcon, StickerIconProps } from './StickerIcon'

export function CloseIcon(props: StickerIconProps) {
  const color = 'var(--sq-ink)'

  return (
    <StickerIcon {...props} withShadow={false} title="Close / Dismiss">
      {({ keyline }) => {
        if (keyline) {
          return (
            <>
              <line x1="14" y1="14" x2="34" y2="34" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
              <line x1="34" y1="14" x2="14" y2="34" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
            </>
          )
        }

        return (
          <>
            <line x1="14" y1="14" x2="34" y2="34" stroke={color} strokeWidth="5.5" strokeLinecap="round" />
            <line x1="34" y1="14" x2="14" y2="34" stroke={color} strokeWidth="5.5" strokeLinecap="round" />
          </>
        )
      }}
    </StickerIcon>
  )
}
