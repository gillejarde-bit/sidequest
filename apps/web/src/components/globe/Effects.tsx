import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { GLOBE_CONFIG } from './GlobeConfig'

export function Effects() {
  return (
    <EffectComposer>
      {/* Subtle, low-intensity glowing bloom overlay */}
      <Bloom 
        luminanceThreshold={0.5} 
        luminanceSmoothing={0.9} 
        intensity={GLOBE_CONFIG.BLOOM_INTENSITY} 
        mipmapBlur 
      />
    </EffectComposer>
  )
}
