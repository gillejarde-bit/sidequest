import { StickerIcon, StickerIconProps } from './StickerIcon'

export interface CheckIconProps extends StickerIconProps {
  color?: string
}

export function CheckIcon({ color, ...props }: CheckIconProps) {
  const iconColor = color || (props.active ? 'var(--sq-success)' : 'var(--sq-ink)')

  return (
    <StickerIcon {...props} title="Checkmark / Success">
      {({ keyline }) => {
        if (keyline) {
          return (
            <path
              d="M12,25 L20,33 L36,15"
              fill="none"
              stroke="currentColor"
              strokeWidth="11"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        }

        return (
          <path
            d="M12,25 L20,33 L36,15"
            fill="none"
            stroke={iconColor}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )
      }}
    </StickerIcon>
  )
}
