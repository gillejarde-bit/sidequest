import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GLOBE_CONFIG } from './GlobeConfig'

// Deterministic 3D spherical noise function for generating high-detail organic shorelines
function getSphericalNoise(x: number, y: number, z: number): number {
  let val = 0
  val += 0.250 * Math.sin(x * 3.0 + y * 2.0 + z * 1.5)
  val += 0.125 * Math.sin(x * 6.0 - z * 5.0 + y * 4.0)
  val += 0.062 * Math.sin(y * 12.0 + z * 10.0 + x * 8.0)
  val += 0.031 * Math.sin(z * 24.0 - x * 20.0 + y * 16.0)
  val += 0.015 * Math.sin(x * 48.0 + y * 40.0 - z * 32.0)
  return val
}

const CONTINENT_CENTERS = [
  // North America
  { lat: 48, lng: -100, rad: 28, color: GLOBE_CONFIG.COLOR_CYAN },
  { lat: 60, lng: -125, rad: 20, color: GLOBE_CONFIG.COLOR_CYAN },
  { lat: 70, lng: -40, rad: 15, color: GLOBE_CONFIG.COLOR_CYAN }, // Greenland
  { lat: 23, lng: -100, rad: 12, color: GLOBE_CONFIG.COLOR_CYAN }, // Mexico / Central America
  { lat: 64, lng: -155, rad: 14, color: GLOBE_CONFIG.COLOR_CYAN }, // Alaska

  // South America
  { lat: -5, lng: -60, rad: 22, color: GLOBE_CONFIG.COLOR_LIME },
  { lat: -22, lng: -60, rad: 18, color: GLOBE_CONFIG.COLOR_LIME },
  { lat: -42, lng: -70, rad: 10, color: GLOBE_CONFIG.COLOR_LIME },

  // Africa
  { lat: 18, lng: 12, rad: 24, color: GLOBE_CONFIG.COLOR_LIME },
  { lat: 2, lng: 22, rad: 20, color: GLOBE_CONFIG.COLOR_LIME },
  { lat: -18, lng: 22, rad: 16, color: GLOBE_CONFIG.COLOR_LIME },
  { lat: -19, lng: 46, rad: 6, color: GLOBE_CONFIG.COLOR_LIME }, // Madagascar

  // Eurasia (Europe & Asia)
  { lat: 62, lng: 95, rad: 32, color: GLOBE_CONFIG.COLOR_CYAN }, // Northern Asia / Siberia
  { lat: 55, lng: 60, rad: 22, color: GLOBE_CONFIG.COLOR_CYAN }, // Central Asia
  { lat: 52, lng: 15, rad: 18, color: GLOBE_CONFIG.COLOR_CYAN }, // Western Europe
  { lat: 36, lng: 105, rad: 22, color: GLOBE_CONFIG.COLOR_CYAN }, // Eastern Asia / China
  { lat: 22, lng: 78, rad: 14, color: GLOBE_CONFIG.COLOR_CYAN }, // India
  { lat: 24, lng: 45, rad: 12, color: GLOBE_CONFIG.COLOR_CYAN }, // Arabian Peninsula
  { lat: 4, lng: 102, rad: 8, color: GLOBE_CONFIG.COLOR_CYAN },  // Malaysia / Indochina
  { lat: -2, lng: 115, rad: 10, color: GLOBE_CONFIG.COLOR_CYAN }, // Indonesia
  { lat: 12, lng: 122, rad: 6, color: GLOBE_CONFIG.COLOR_CYAN },  // Philippines
  { lat: 38, lng: 138, rad: 7, color: GLOBE_CONFIG.COLOR_CYAN },  // Japan

  // Australia & New Zealand
  { lat: -25, lng: 134, rad: 16, color: GLOBE_CONFIG.COLOR_ORANGE },
  { lat: -41, lng: 172, rad: 6, color: GLOBE_CONFIG.COLOR_ORANGE }, // New Zealand

  // Antarctica
  { lat: -82, lng: 0, rad: 22, color: GLOBE_CONFIG.COLOR_ORANGE }
]

// Precompute 3D cartesian coordinates for centers to keep checking extremely fast
const PRECOMPUTED_CENTERS = CONTINENT_CENTERS.map(c => {
  const latRad = (c.lat * Math.PI) / 180
  const lngRad = (c.lng * Math.PI) / 180
  return {
    cx: Math.cos(latRad) * Math.cos(lngRad),
    cy: Math.sin(latRad),
    cz: Math.cos(latRad) * Math.sin(lngRad),
    cosRad: Math.cos((c.rad * Math.PI) / 180),
    color: c.color
  }
})

// Mathematical fallback for land/ocean classification while image loads
function getMathLandMask(x: number, y: number, z: number): { isLand: boolean; color: string } {
  const noiseVal = getSphericalNoise(x, y, z)
  
  // Antarctica latitude threshold check
  const lat = Math.asin(y)
  const latDeg = (lat * 180) / Math.PI
  if (latDeg <= -60) {
    const threshold = -60 + noiseVal * 12
    if (latDeg <= threshold) {
      return { isLand: true, color: GLOBE_CONFIG.COLOR_ORANGE }
    }
  }

  // Check each continent center
  for (const center of PRECOMPUTED_CENTERS) {
    const dot = x * center.cx + y * center.cy + z * center.cz
    // Shift threshold with our high-frequency spherical noise to create gorgeous organic coastlines
    const threshold = center.cosRad - noiseVal * 0.14
    if (dot > threshold) {
      return { isLand: true, color: center.color }
    }
  }

  return { isLand: false, color: GLOBE_CONFIG.COLOR_OCEAN_DIM }
}

// Assigns land colors by continent
function getContinentColor(lngDeg: number, latDeg: number): string {
  // Eurasia / North America -> Cyan
  if (lngDeg < -20 || lngDeg > 150) {
    return latDeg > 0 ? GLOBE_CONFIG.COLOR_CYAN : GLOBE_CONFIG.COLOR_LIME // North America vs South America
  }
  if (lngDeg >= -20 && lngDeg <= 150) {
    if (latDeg <= -60) return GLOBE_CONFIG.COLOR_ORANGE // Antarctica
    if (latDeg >= -42 && latDeg <= -10 && lngDeg >= 110) return GLOBE_CONFIG.COLOR_ORANGE // Australia
    return latDeg > 12 ? GLOBE_CONFIG.COLOR_CYAN : GLOBE_CONFIG.COLOR_LIME // Eurasia vs Africa
  }
  return GLOBE_CONFIG.COLOR_LIME
}

interface GlobeFieldProps {
  progressRef: React.RefObject<number>
}

export function GlobeField({ progressRef }: GlobeFieldProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null)
  const [maskData, setMaskData] = useState<{ data: Uint8Array; w: number; h: number } | null>(null)

  const count = GLOBE_CONFIG.INSTANCE_COUNT

  // Load the equirectangular land-mask once at startup and read pixels
  useEffect(() => {
    const img = new Image()
    img.src = '/earth-mask.png'
    // Do NOT set crossOrigin = 'anonymous' for local assets to prevent unnecessary CORS preflights which fail on standard local asset servers
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        const imgData = ctx.getImageData(0, 0, img.width, img.height)
        setMaskData({
          data: new Uint8Array(imgData.data.buffer),
          w: img.width,
          h: img.height
        })
      }
    }
    img.onerror = () => {
      console.warn('Failed to load earth-mask.png. Falling back to mathematical boundaries.')
    }
  }, [])

  // Precompute positions, targets, colors, and arc parameters
  const { positionsA, positionsB, colors, arcOffsets, scalesA, scalesB } = useMemo(() => {
    const posA = new Float32Array(count * 3)
    const posB = new Float32Array(count * 3)
    const colArray = new Float32Array(count * 3)
    const arcOff = new Float32Array(count * 3)
    const scA = new Float32Array(count)
    const scB = new Float32Array(count)

    const tempColor = new THREE.Color()

    // 1. Generate Targets A (Sparse Fibonacci Sphere)
    for (let i = 0; i < count; i++) {
      const idx = i
      // Fibonacci sphere coordinates
      const y = 1 - (idx / (count - 1)) * 2
      const radius = Math.sqrt(1 - y * y)
      const goldenRatio = Math.PI * (3 - Math.sqrt(5))
      const theta = idx * goldenRatio

      const x = Math.cos(theta) * radius
      const z = Math.sin(theta) * radius

      // Map to spherical degrees
      const phi = Math.asin(y)
      const lat = Math.asin(y)
      const lng = Math.atan2(z, x)
      const latDeg = (lat * 180) / Math.PI
      const lngDeg = (lng * 180) / Math.PI

      // Set position on sparse sphere shell
      const rA = GLOBE_CONFIG.RADIUS_A
      posA[idx * 3] = x * rA
      posA[idx * 3 + 1] = y * rA
      posA[idx * 3 + 2] = z * rA

      // High-precision geographic mask sampling if pixel data is loaded, else use math fallback
      let isLand = false
      let color: string = GLOBE_CONFIG.COLOR_OCEAN_DIM

      if (maskData) {
        // Normalize longitude and latitude to [0, 1] UV space
        const u = (lng + Math.PI) / (2 * Math.PI)
        const v = 1 - (phi + Math.PI / 2) / Math.PI
        
        const px = Math.min(Math.max(Math.floor(u * maskData.w), 0), maskData.w - 1)
        const py = Math.min(Math.max(Math.floor(v * maskData.h), 0), maskData.h - 1)
        const pixelIdx = (py * maskData.w + px) * 4
        
        // Read color and alpha channels to be robust to all mask styles
        const r = maskData.data[pixelIdx]
        const g = maskData.data[pixelIdx + 1]
        const b = maskData.data[pixelIdx + 2]
        const a = maskData.data[pixelIdx + 3]
        
        isLand = (r > 120 || g > 120 || b > 120) && a > 50
        color = isLand ? getContinentColor(lngDeg, latDeg) : GLOBE_CONFIG.COLOR_OCEAN_DIM
      } else {
        const mathRes = getMathLandMask(x, y, z)
        isLand = mathRes.isLand
        color = mathRes.color
      }

      if (!isLand) {
        const rand = Math.random()
        if (rand < 0.80) {
          color = '#030202' // Deep Matte Black (Ash/Soot)
        } else if (rand < 0.90) {
          color = '#EE6C1F' // Phoenix Orange
        } else if (rand < 0.97) {
          color = '#F0B45C' // Gold
        } else {
          color = '#F4862E' // Ember Bright
        }
      }

      tempColor.set(color)
      colArray[idx * 3] = tempColor.r
      colArray[idx * 3 + 1] = tempColor.g
      colArray[idx * 3 + 2] = tempColor.b

      // Starting scales (oceans slightly smaller, lands prominent)
      scA[idx] = isLand ? 1.0 : 0.6

      // 2. Generate Targets B (Dense Detailed Globe)
      const rB = GLOBE_CONFIG.RADIUS_B
      if (isLand) {
        // Land shards pack tight on the larger sphere shell, tracing detailed borders
        posB[idx * 3] = x * rB
        posB[idx * 3 + 1] = y * rB
        posB[idx * 3 + 2] = z * rB
        scB[idx] = 1.15 // Detailed continents stand out prominently
      } else {
        // Ocean shards slide into the inside sphere and compress to 0 scale
        // This completely eliminates ocean noise in State B, letting organic land shape pop!
        posB[idx * 3] = x * (rB * 0.9)
        posB[idx * 3 + 1] = y * (rB * 0.9)
        posB[idx * 3 + 2] = z * (rB * 0.9)
        scB[idx] = 0.0 
      }

      // 3. Precompute unique orthogonal Arc/Displacement offsets for the morph path
      const dirA = new THREE.Vector3(x * rA, y * rA, z * rA).normalize()
      const randomVec = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize()
      
      const orthoVec = new THREE.Vector3().crossVectors(dirA, randomVec).normalize()
      arcOff[idx * 3] = orthoVec.x
      arcOff[idx * 3 + 1] = orthoVec.y
      arcOff[idx * 3 + 2] = orthoVec.z
    }

    return {
      positionsA: posA,
      positionsB: posB,
      colors: colArray,
      arcOffsets: arcOff,
      scalesA: scA,
      scalesB: scB
    }
  }, [count, maskData])

  // Helper variables to prevent garbage collection inside the 60FPS frame loop
  const tempMatrix = useMemo(() => new THREE.Matrix4(), [])
  const posA = useMemo(() => new THREE.Vector3(), [])
  const posB = useMemo(() => new THREE.Vector3(), [])
  const currentPos = useMemo(() => new THREE.Vector3(), [])
  const aheadPos = useMemo(() => new THREE.Vector3(), [])
  const velocity = useMemo(() => new THREE.Vector3(), [])
  const upVec = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  const scaleVec = useMemo(() => new THREE.Vector3(), [])
  const orthoVec = useMemo(() => new THREE.Vector3(), [])

  useFrame((state) => {
    if (!meshRef.current) return

    const elapsed = state.clock.getElapsedTime()
    const rawProgress = progressRef.current ?? 0

    // Spin speed: rotates Y-axis, spins slightly faster during the morph transition
    const speedMult = GLOBE_CONFIG.ROTATION_SPEED_BASE + rawProgress * GLOBE_CONFIG.ROTATION_SPEED_MORPH
    const meshRotationY = elapsed * speedMult
    meshRef.current.rotation.y = meshRotationY

    // Adjust glossiness slightly without transmission so colors stay solid & extremely vibrant
    if (materialRef.current) {
      materialRef.current.roughness = 0.95 // Matte, stone-like texture to prevent gray specular wash
      materialRef.current.metalness = 0.05 // Non-metallic ash/lava rock
      materialRef.current.clearcoat = 0.0  // No clearcoat shine
    }

    for (let i = 0; i < count; i++) {
      // 1. Calculate staggered local progress per shard
      const indexOffset = (i / count) * GLOBE_CONFIG.STAGGER_AMOUNT
      const localProgress = Math.max(0, Math.min(1, (rawProgress - indexOffset) / (1 - GLOBE_CONFIG.STAGGER_AMOUNT)))

      // 2. Capture endpoints positions
      posA.set(positionsA[i * 3], positionsA[i * 3 + 1], positionsA[i * 3 + 2])
      posB.set(positionsB[i * 3], positionsB[i * 3 + 1], positionsB[i * 3 + 2])

      // 3. Apply LERP positioning
      currentPos.lerpVectors(posA, posB, localProgress)

      // 4. Inject Curl-Noise Arc displacement that peaks at progress = 0.5
      const arcFactor = Math.sin(localProgress * Math.PI) * GLOBE_CONFIG.ARC_HEIGHT
      orthoVec.set(arcOffsets[i * 3], arcOffsets[i * 3 + 1], arcOffsets[i * 3 + 2])
      currentPos.addScaledVector(orthoVec, arcFactor)

      // 5. Calculate ahead position to orient the shards towards velocity
      const lookAheadProgress = Math.min(1, localProgress + 0.01)
      aheadPos.lerpVectors(posA, posB, lookAheadProgress)
      const aheadArcFactor = Math.sin(lookAheadProgress * Math.PI) * GLOBE_CONFIG.ARC_HEIGHT
      aheadPos.addScaledVector(orthoVec, aheadArcFactor)

      velocity.subVectors(aheadPos, currentPos).normalize()

      // 6. Interpolate scale factor (shrinks ocean shards to 0 in State B)
      const currentScale = (1 - localProgress) * scalesA[i] + localProgress * scalesB[i]
      scaleVec.set(currentScale, currentScale, currentScale * 1.5) // Extrude slightly

      // 7. Compose transformation matrix
      tempMatrix.identity()
      tempMatrix.setPosition(currentPos)
      
      // Orient shard towards motion direction
      if (velocity.lengthSq() > 0.0001) {
        const rotationMatrix = new THREE.Matrix4().lookAt(currentPos, aheadPos, upVec)
        tempMatrix.multiply(rotationMatrix)
      }

      tempMatrix.scale(scaleVec)
      meshRef.current.setMatrixAt(i, tempMatrix)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      {/* Sleek Crystalline Shard geometry (cone/prism looks highly directional) */}
      <coneGeometry args={[0.025, 0.085, 4]} />
      
      {/* Glossy physical material which preserves solid color attributes */}
      <meshPhysicalMaterial 
        ref={materialRef}
        roughness={0.25} 
        metalness={0.7} 
        clearcoat={0.2}
        clearcoatRoughness={0.1}
        toneMapped={false}
      >
        <instancedBufferAttribute attach="attributes-color" args={[colors, 3]} />
      </meshPhysicalMaterial>
    </instancedMesh>
  )
}
