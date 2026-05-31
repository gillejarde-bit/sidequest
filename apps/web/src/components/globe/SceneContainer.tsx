import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Line, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { GlobeField } from './GlobeField'
import { Effects } from './Effects'
import { GLOBE_CONFIG } from './GlobeConfig'

interface SceneContainerProps {
  progressRef: React.RefObject<number>
}

// Renders the faint orbital dashed background ring
function OrbitalRing() {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const segments = 64
    const radius = 4.8 // Renders slightly larger than the dense globe (3.8)
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, -0.6)) // Offset back slightly
    }
    return pts
  }, [])

  return (
    <Line
      points={points}
      color={GLOBE_CONFIG.COLOR_EARTH_FOREST}
      opacity={0.12}
      transparent
      dashed
      dashSize={0.15}
      gapSize={0.1}
      lineWidth={1.2}
    />
  )
}

export function SceneContainer({ progressRef }: SceneContainerProps) {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 7.5], fov: 60 }}
        gl={{ 
          antialias: true,
          alpha: true,
          powerPreference: "high-performance"
        }}
        dpr={[1, 2]} // Clamp dpr to 1-2 for performance
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
        <directionalLight position={[-10, -10, -10]} intensity={0.6} color="#0EA5E9" />
        
        {/* Immersive 3D Parallax Starfield Constellations */}
        <Stars 
          radius={120} 
          depth={60} 
          count={5000} 
          factor={7} 
          saturation={1.0} 
          fade 
          speed={1.5} 
        />

        {/* Orbital dashed ring */}
        <OrbitalRing />

        {/* 3D Morphing Globe InstancedMesh */}
        <GlobeField progressRef={progressRef} />

        {/* Dynamic Bloom & Chromatic Aberration */}
        <Effects progressRef={progressRef} />
      </Canvas>
    </div>
  )
}
