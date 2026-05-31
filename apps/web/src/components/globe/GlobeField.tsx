import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GLOBE_CONFIG } from './GlobeConfig'

// Direct geographic classification for lime/cyan/orange continent colors
function getGeographicColor(lngDeg: number, latDeg: number): { isLand: boolean; color: string } {
  // Eurasia
  if (latDeg >= 12 && latDeg <= 75 && lngDeg >= -20 && lngDeg <= 145) {
    return { isLand: true, color: GLOBE_CONFIG.COLOR_CYAN }
  }
  // Africa
  if (latDeg >= -35 && latDeg <= 35 && lngDeg >= -17 && lngDeg <= 51) {
    return { isLand: true, color: GLOBE_CONFIG.COLOR_LIME }
  }
  // North America
  if (latDeg >= 15 && latDeg <= 72 && lngDeg >= -168 && lngDeg <= -52) {
    return { isLand: true, color: GLOBE_CONFIG.COLOR_CYAN }
  }
  // South America
  if (latDeg >= -55 && latDeg <= 12 && lngDeg >= -82 && lngDeg <= -34) {
    return { isLand: true, color: GLOBE_CONFIG.COLOR_LIME }
  }
  // Australia
  if (latDeg >= -42 && latDeg <= -10 && lngDeg >= 113 && lngDeg <= 153) {
    return { isLand: true, color: GLOBE_CONFIG.COLOR_ORANGE }
  }
  // Antarctica
  if (latDeg <= -60) {
    return { isLand: true, color: GLOBE_CONFIG.COLOR_ORANGE }
  }
  return { isLand: false, color: GLOBE_CONFIG.COLOR_OCEAN_DIM }
}

interface GlobeFieldProps {
  progressRef: React.RefObject<number>
}

export function GlobeField({ progressRef }: GlobeFieldProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null)

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

      // Starting scales (oceans slightly smaller, lands prominent in sparse sphere)
      scA[idx] = isLand ? 1.0 : 0.6

      // 2. Generate Targets B (Dense Detailed Globe - Land packed, Oceans shrunk to 0)
      const rB = GLOBE_CONFIG.RADIUS_B
      if (isLand) {
        // Land shards pack tight on the larger sphere shell
        posB[idx * 3] = x * rB
        posB[idx * 3 + 1] = y * rB
        posB[idx * 3 + 2] = z * rB
        scB[idx] = 1.1 // Detailed continents are prominent
      } else {
        // Ocean shards slide into the inside sphere and compress to 0 scale
        // This hides them completely in State B, revealing the dense continents in full relief
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

    // Adjust glossiness slightly without transmission so colors stay solid & extremely vibrant
    if (materialRef.current) {
      materialRef.current.roughness = THREE.MathUtils.lerp(0.25, 0.15, rawProgress)
      materialRef.current.metalness = THREE.MathUtils.lerp(0.7, 0.85, rawProgress)
      materialRef.current.clearcoat = THREE.MathUtils.lerp(0.2, 1.0, rawProgress)
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
