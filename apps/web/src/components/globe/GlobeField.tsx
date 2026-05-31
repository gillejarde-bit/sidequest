import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GLOBE_CONFIG } from './GlobeConfig'

// Highly realistic land/ocean coordinate color mapping
function getGeographicColor(lngDeg: number, latDeg: number): { isLand: boolean; color: string } {
  // Checks continent boundaries
  let isLand = false

  // Eurasia
  if (latDeg >= 12 && latDeg <= 75 && lngDeg >= -20 && lngDeg <= 145) {
    isLand = true
  }
  // Africa
  else if (latDeg >= -35 && latDeg <= 35 && lngDeg >= -17 && lngDeg <= 51) {
    isLand = true
  }
  // North America
  else if (latDeg >= 15 && latDeg <= 72 && lngDeg >= -168 && lngDeg <= -52) {
    isLand = true
  }
  // South America
  else if (latDeg >= -55 && latDeg <= 12 && lngDeg >= -82 && lngDeg <= -34) {
    isLand = true
  }
  // Australia
  else if (latDeg >= -42 && latDeg <= -10 && lngDeg >= 113 && lngDeg <= 153) {
    isLand = true
  }
  // Antarctica
  else if (latDeg <= -60) {
    isLand = true
  }

  if (isLand) {
    // Distribute organic earth tones across landmasses
    const rand = Math.random()
    if (rand < 0.55) return { isLand: true, color: GLOBE_CONFIG.COLOR_EARTH_FOREST }
    if (rand < 0.82) return { isLand: true, color: GLOBE_CONFIG.COLOR_EARTH_EMERALD }
    return { isLand: true, color: GLOBE_CONFIG.COLOR_EARTH_SAND }
  } else {
    // Distribute depth water tones across oceans
    const rand = Math.random()
    if (rand < 0.75) return { isLand: false, color: GLOBE_CONFIG.COLOR_OCEAN_DEEP }
    return { isLand: false, color: GLOBE_CONFIG.COLOR_OCEAN_SHALLOW }
  }
}

interface GlobeFieldProps {
  progressRef: React.RefObject<number>
}

export function GlobeField({ progressRef }: GlobeFieldProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const count = GLOBE_CONFIG.INSTANCE_COUNT

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
      const lat = Math.asin(y)
      const lng = Math.atan2(z, x)
      const latDeg = (lat * 180) / Math.PI
      const lngDeg = (lng * 180) / Math.PI

      // Set position on sparse sphere shell
      const rA = GLOBE_CONFIG.RADIUS_A
      posA[idx * 3] = x * rA
      posA[idx * 3 + 1] = y * rA
      posA[idx * 3 + 2] = z * rA

      // Determine continent membership and color
      const { isLand, color } = getGeographicColor(lngDeg, latDeg)
      tempColor.set(color)
      colArray[idx * 3] = tempColor.r
      colArray[idx * 3 + 1] = tempColor.g
      colArray[idx * 3 + 2] = tempColor.b

      // Starting scales
      scA[idx] = isLand ? 1.0 : 0.8

      // 2. Generate Targets B (Dense Detailed Globe - Land & Water)
      const rB = GLOBE_CONFIG.RADIUS_B
      if (isLand) {
        // Land shards pack tight on the larger sphere shell
        posB[idx * 3] = x * rB
        posB[idx * 3 + 1] = y * rB
        posB[idx * 3 + 2] = z * rB
        scB[idx] = 1.15 // Terrestrial land is slightly larger/elevated
      } else {
        // Water shards pack tightly slightly lower than land for premium depth feel
        posB[idx * 3] = x * (rB * 0.98)
        posB[idx * 3 + 1] = y * (rB * 0.98)
        posB[idx * 3 + 2] = z * (rB * 0.98)
        scB[idx] = 0.85 // Tightly packed ocean floor
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
  }, [count])

  // Helper variables to prevent garbage collection inside the 60fps frame loop
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

    for (let i = 0; i < count; i++) {
      // 1. Calculate staggered local progress per shard
      // Stagger stretches the execution time based on the index to create a "transformer" effect
      const indexOffset = (i / count) * GLOBE_CONFIG.STAGGER_AMOUNT
      const localProgress = Math.max(0, Math.min(1, (rawProgress - indexOffset) / (1 - GLOBE_CONFIG.STAGGER_AMOUNT)))

      // 2. Capture endpoints positions
      posA.set(positionsA[i * 3], positionsA[i * 3 + 1], positionsA[i * 3 + 2])
      posB.set(positionsB[i * 3], positionsB[i * 3 + 1], positionsB[i * 3 + 2])

      // 3. Apply standard LERP positioning
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

      // 6. Interpolate scale factor (shrinks ocean shards slightly, expands land)
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
      <coneGeometry args={[0.02, 0.08, 4]} />
      <meshStandardMaterial 
        roughness={0.15} 
        metalness={0.85} 
        toneMapped={false}
      >
        <instancedBufferAttribute attach="attributes-color" args={[colors, 3]} />
      </meshStandardMaterial>
    </instancedMesh>
  )
}
