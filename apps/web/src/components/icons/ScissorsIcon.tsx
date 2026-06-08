import { StickerIcon, StickerIconProps } from './StickerIcon'

export function ScissorsIcon(props: StickerIconProps) {
  const color = 'var(--sq-ink)'

  return (
    <StickerIcon {...props} title="Scissors / Edit">
      {({ keyline }) => {
        if (keyline) {
          return (
            <>
              {/* Left Handle Loop */}
              <circle cx="18" cy="32" r="5" fill="none" stroke="currentColor" strokeWidth="11" />
              {/* Right Handle Loop */}
              <circle cx="30" cy="32" r="5" fill="none" stroke="currentColor" strokeWidth="11" />
              {/* Blades */}
              <path
                d="M18,32 L24,24 L30,12"
                fill="none"
                stroke="currentColor"
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M30,32 L24,24 L18,12"
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
            {/* Left Handle Loop */}
            <circle cx="18" cy="32" r="5" fill="none" stroke={color} strokeWidth="5" />
            {/* Right Handle Loop */}
            <circle cx="30" cy="32" r="5" fill="none" stroke={color} strokeWidth="5" />
            {/* Blades */}
            <path
              d="M18,32 L24,24 L30,12"
              fill="none"
              stroke={color}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M30,32 L24,24 L18,12"
              fill="none"
              stroke={color}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Pivot Dot */}
            <circle cx="24" cy="24" r="2.5" fill={color} />
          </>
        )
      }}
    </StickerIcon>
  )
}
