import { StickerIcon, StickerIconProps } from './StickerIcon'

export function MoonIcon(props: StickerIconProps) {
  const activeColor = props.active ? '#8B5CF6' : 'var(--sq-text-muted)'

  return (
    <StickerIcon {...props} title="Dark Theme">
      {({ keyline }) => {
        if (keyline) {
          return (
            <path 
              d="M32,14 C32,25 23,34 12,34 C10.5,34 9,33.5 7.5,33 C12.5,38.5 20,42 28,42 C37.5,42 45,34.5 45,25 C45,17 41.5,9.5 36,4.5 C34.5,9.5 32,14 32,14 Z" 
              fill="currentColor" 
              stroke="currentColor" 
              strokeWidth="6" 
              strokeLinejoin="round" 
            />
          )
        }

        return (
          <path 
            d="M32,14 C32,25 23,34 12,34 C10.5,34 9,33.5 7.5,33 C12.5,38.5 20,42 28,42 C37.5,42 45,34.5 45,25 C45,17 41.5,9.5 36,4.5 C34.5,9.5 32,14 32,14 Z" 
            fill={activeColor} 
            stroke="var(--sq-ink)" 
            strokeWidth="2.5" 
            strokeLinejoin="round" 
          />
        )
      }}
    </StickerIcon>
  )
}
