import { StickerIcon, StickerIconProps } from './StickerIcon'

export function ZoomInIcon(props: StickerIconProps) {
  const color = 'var(--sq-ink)'

  return (
    <StickerIcon {...props} title="Zoom In">
      {({ keyline }) => {
        if (keyline) {
          return (
            <>
              {/* Glass Rim */}
              <circle cx="21" cy="21" r="9" fill="none" stroke="currentColor" strokeWidth="11" />
              {/* Handle */}
              <line x1="27" y1="27" x2="38" y2="38" stroke="currentColor" strokeWidth="11" strokeLinecap="round" />
              {/* Plus Sign */}
              <line x1="16" y1="21" x2="26" y2="21" stroke="currentColor" strokeWidth="11" strokeLinecap="round" />
              <line x1="21" y1="16" x2="21" y2="26" stroke="currentColor" strokeWidth="11" strokeLinecap="round" />
            </>
          )
        }

        return (
          <>
            {/* Glass Rim */}
            <circle cx="21" cy="21" r="9" fill="none" stroke={color} strokeWidth="5" />
            {/* Handle */}
            <line x1="27" y1="27" x2="38" y2="38" stroke={color} strokeWidth="5" strokeLinecap="round" />
            {/* Plus Sign */}
            <line x1="16" y1="21" x2="26" y2="21" stroke={color} strokeWidth="4" strokeLinecap="round" />
            <line x1="21" y1="16" x2="21" y2="26" stroke={color} strokeWidth="4" strokeLinecap="round" />
          </>
        )
      }}
    </StickerIcon>
  )
}
