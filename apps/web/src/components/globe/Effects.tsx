import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing'
import * as THREE from 'three'

interface EffectsProps {
  progressRef: React.RefObject<number>
}

export function Effects({ progressRef }: EffectsProps) {
  const aberrationRef = useRef<any>(null)

  useFrame(() => {
    if (!aberrationRef.current) return

    const rawProgress = progressRef.current ?? 0
    // Chromatic aberration spikes at the peak of the morphing phase (progress = 0.5)
    // to simulate a high-energy particle warp effect
    const peakFactor = Math.sin(rawProgress * Math.PI)
    
    // Scale offset up to [0.005, 0.005] at peak, returns to 0 at endpoints
    const offsetVal = peakFactor * 0.005
    aberrationRef.current.offset.set(offsetVal, offsetVal)
  })

  return (
    <EffectComposer>
      {/* Premium glowing bloom overlay */}
      <Bloom 
        luminanceThreshold={0.4} 
        luminanceSmoothing={0.9} 
        intensity={1.2} 
        mipmapBlur 
      />
      {/* Scroll-driven warp aberration */}
      <ChromaticAberration 
        ref={aberrationRef} 
        offset={new THREE.Vector2(0, 0)} 
        radialModulation={false}
      />
    </EffectComposer>
  )
}
