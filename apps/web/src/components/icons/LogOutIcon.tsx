import { StickerIcon, StickerIconProps } from './StickerIcon'

export function LogOutIcon(props: StickerIconProps) {
  return (
    <StickerIcon {...props} title="Sign Out">
      {({ keyline }) => {
        const doorPath = "M10,8 L24,8 L24,16 L20,16 L20,12 L14,12 L14,36 L20,36 L20,32 L24,32 L24,40 L10,40 Z"
        const arrowPath = "M22,24 L38,24 M32,18 L38,24 L32,30"
        
        if (keyline) {
          return (
            <>
              <path d={doorPath} fill="currentColor" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
              <path d={arrowPath} stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </>
          )
        }

        return (
          <>
            <path d={doorPath} fill="var(--sq-card)" stroke="var(--sq-ink)" strokeWidth="2.5" strokeLinejoin="round" />
            <path d={arrowPath} stroke="var(--sq-ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        )
      }}
    </StickerIcon>
  )
}
