import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { GlobeField } from './GlobeField'
import { Effects } from './Effects'
import { GLOBE_CONFIG } from './GlobeConfig'

interface SceneContainerProps {
  progressRef: React.RefObject<number>
}

// Renders a field of glowing orange/gold stars matching the Ember theme
function OrangeStars() {
  const count = 3000
  const [orangePositions, goldPositions] = useMemo(() => {
    const orangePos: number[] = []
    const goldPos: number[] = []
    
    for (let i = 0; i < count; i++) {
      const r = 80 + Math.random() * 120
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      
      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = r * Math.cos(phi)
      
      if (Math.random() < 0.7) {
        orangePos.push(x, y, z)
      } else {
        goldPos.push(x, y, z)
      }
    }
    
    return [
      new Float32Array(orangePos),
      new Float32Array(goldPos)
    ]
  }, [])

  return (
    <>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[orangePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.65}
          sizeAttenuation
          color="#EE6C1F"
          transparent
          opacity={0.75}
          depthWrite={false}
        />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[goldPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.65}
          sizeAttenuation
          color="#F0B45C"
          transparent
          opacity={0.75}
          depthWrite={false}
        />
      </points>
    </>
  )
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
      color={GLOBE_CONFIG.COLOR_LIME}
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
        <ambientLight intensity={0.08} color="#EE6C1F" />
        <pointLight position={[10, 10, 10]} intensity={0.45} color="#F0B45C" />
        <directionalLight position={[-10, -10, -10]} intensity={0.25} color="#EE6C1F" />
        
        {/* Custom Glowing Orange/Gold Stars */}
        <OrangeStars />

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
