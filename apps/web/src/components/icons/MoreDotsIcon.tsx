import { StickerIcon, StickerIconProps } from './StickerIcon'

export function MoreDotsIcon(props: StickerIconProps) {
  const color = 'var(--sq-ink)'

  return (
    <StickerIcon {...props} withShadow={false} title="More Actions">
      {({ keyline }) => {
        if (keyline) {
          return (
            <>
              <circle cx="14" cy="24" r="6.5" fill="currentColor" stroke="currentColor" strokeWidth="4" />
              <circle cx="24" cy="24" r="6.5" fill="currentColor" stroke="currentColor" strokeWidth="4" />
              <circle cx="34" cy="24" r="6.5" fill="currentColor" stroke="currentColor" strokeWidth="4" />
            </>
          )
        }

        return (
          <>
            <circle cx="14" cy="24" r="3.5" fill={color} />
            <circle cx="24" cy="24" r="3.5" fill={color} />
            <circle cx="34" cy="24" r="3.5" fill={color} />
          </>
        )
      }}
    </StickerIcon>
  )
}
