import { StickerIcon, StickerIconProps } from './StickerIcon'

export function UploadIcon(props: StickerIconProps) {
  const color = 'var(--sq-ink)'

  return (
    <StickerIcon {...props} title="Upload">
      {({ keyline }) => {
        if (keyline) {
          return (
            <>
              {/* Tray */}
              <path
                d="M12,34 L12,38 L36,38 L36,34"
                fill="none"
                stroke="currentColor"
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Arrow Shaft */}
              <line x1="24" y1="12" x2="24" y2="30" stroke="currentColor" strokeWidth="11" strokeLinecap="round" />
              {/* Arrow Head */}
              <path
                d="M16,20 L24,12 L32,20"
                fill="none"
                stroke="currentColor"
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )
        }

        return (
          <>
            {/* Tray */}
            <path
              d="M12,34 L12,38 L36,38 L36,34"
              fill="none"
              stroke={color}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Arrow Shaft */}
            <line x1="24" y1="12" x2="24" y2="30" stroke={color} strokeWidth="5" strokeLinecap="round" />
            {/* Arrow Head */}
            <path
              d="M16,20 L24,12 L32,20"
              fill="none"
              stroke={color}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )
      }}
    </StickerIcon>
  )
}
