import { StickerIcon, StickerIconProps } from './StickerIcon'

export function VolumeIcon(props: StickerIconProps) {
  const activeColor = props.active ? 'var(--sq-ember-500)' : 'var(--sq-text-muted)'

  return (
    <StickerIcon {...props} title="Sounds">
      {({ keyline }) => {
        const speakerPath = "M12,18 L18,18 L26,10 L26,38 L18,30 L12,30 Z"
        
        if (keyline) {
          return (
            <>
              <path d={speakerPath} fill="currentColor" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
              <path d="M32,16 C34,18 36,21 36,24 C36,27 34,30 32,32" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" />
            </>
          )
        }

        return (
          <>
            <path d={speakerPath} fill={activeColor} stroke="var(--sq-ink)" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M32,16 C34,18 36,21 36,24 C36,27 34,30 32,32" stroke="var(--sq-ink)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </>
        )
      }}
    </StickerIcon>
  )
}
