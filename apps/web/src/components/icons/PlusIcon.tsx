import { StickerIcon, StickerIconProps } from './StickerIcon'

export interface PlusIconProps extends StickerIconProps {
  color?: string
}

export function PlusIcon({ color, ...props }: PlusIconProps) {
  const iconColor = color || (props.active ? 'var(--sq-ink)' : 'var(--sq-text-muted)')

  return (
    <StickerIcon {...props} title="Create / Plus">
      {({ keyline }) => {
        if (keyline) {
          return (
            <>
              <line x1="12" y1="24" x2="36" y2="24" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
              <line x1="24" y1="12" x2="24" y2="36" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
            </>
          )
        }

        return (
          <>
            <line x1="12" y1="24" x2="36" y2="24" stroke={iconColor} strokeWidth="6" strokeLinecap="round" />
            <line x1="24" y1="12" x2="24" y2="36" stroke={iconColor} strokeWidth="6" strokeLinecap="round" />
          </>
        )
      }}
    </StickerIcon>
  )
}
