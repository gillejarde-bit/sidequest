import { StickerIcon, StickerIconProps } from './StickerIcon'

export function ChevronLeftIcon(props: StickerIconProps) {
  const color = 'var(--sq-ink)'

  return (
    <StickerIcon {...props} withShadow={false} title="Back / Chevron Left">
      {({ keyline }) => {
        if (keyline) {
          return (
            <path 
              d="M30,12 L18,24 L30,36" 
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        }

        return (
          <path 
            d="M30,12 L18,24 L30,36" 
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )
      }}
    </StickerIcon>
  )
}
