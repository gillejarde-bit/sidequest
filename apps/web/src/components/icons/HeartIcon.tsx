import { StickerIcon, StickerIconProps } from './StickerIcon'

export function HeartIcon(props: StickerIconProps) {
  const activeColor = props.active ? 'var(--sq-heart)' : 'var(--sq-text-muted)'

  return (
    <StickerIcon {...props} title="Heart / Life">
      {({ keyline }) => {
        if (keyline) {
          return (
            <path 
              d="M24,13 C21,8 12,8 12,18 C12,27 24,36 24,36 C24,36 36,27 36,18 C36,8 27,8 24,13 Z" 
              fill="currentColor" 
              stroke="currentColor"
              strokeWidth="6"
              strokeLinejoin="round"
            />
          )
        }

        return (
          <>
            <path 
              d="M24,14 C21.5,9 13.5,9 13.5,18.5 C13.5,26.5 24,35 24,35 C24,35 34.5,26.5 34.5,18.5 C34.5,9 26.5,9 24,14 Z" 
              fill={activeColor} 
              stroke="var(--sq-ink)" 
              strokeWidth="2.5" 
              strokeLinejoin="round" 
            />
            {/* Soft sticker highlight spot */}
            {props.active && (
              <path 
                d="M17,14 C15.5,16 15.5,18.5 16.5,20 C16,19 16,16 17,14 Z" 
                fill="var(--sq-keyline)" 
                opacity="0.6"
              />
            )}
          </>
        )
      }}
    </StickerIcon>
  )
}
