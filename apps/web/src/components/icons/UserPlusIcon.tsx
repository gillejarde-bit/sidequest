import { StickerIcon, StickerIconProps } from './StickerIcon'

export function UserPlusIcon(props: StickerIconProps) {
  const color = 'var(--sq-ink)'
  const accentColor = 'var(--sq-ember-500)'

  return (
    <StickerIcon {...props} title="Add Friend">
      {({ keyline }) => {
        if (keyline) {
          return (
            <>
              {/* User Head */}
              <circle cx="18" cy="18" r="6" fill="currentColor" stroke="currentColor" strokeWidth="11" />
              {/* User Shoulders */}
              <path
                d="M6,38 C6,30 30,30 30,38"
                fill="none"
                stroke="currentColor"
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Plus Sign */}
              <path
                d="M32,20 L42,20 M37,15 L37,25"
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
            {/* User Head */}
            <circle cx="18" cy="18" r="6" fill="var(--sq-sage-100)" stroke={color} strokeWidth="2.5" />
            {/* User Shoulders */}
            <path
              d="M6,38 C6,30 30,30 30,38"
              fill="var(--sq-sage-500)"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Plus Sign */}
            <path
              d="M32,20 L42,20 M37,15 L37,25"
              fill="none"
              stroke={accentColor}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )
      }}
    </StickerIcon>
  )
}
