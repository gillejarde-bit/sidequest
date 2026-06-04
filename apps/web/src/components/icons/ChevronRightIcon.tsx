import { StickerIcon, StickerIconProps } from './StickerIcon'

export function ChevronRightIcon(props: StickerIconProps) {
  const color = 'var(--sq-ink)'

  return (
    <StickerIcon {...props} withShadow={false} title="Next / Chevron Right">
      {({ keyline }) => {
        if (keyline) {
          return (
            <path 
              d="M18,12 L30,24 L18,36" 
              fill="none"
              stroke="black"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        }

        return (
          <path 
            d="M18,12 L30,24 L18,36" 
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
