import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GLOBE_CONFIG } from './GlobeConfig'

// Mathematical fallback for land/ocean classification while image loads
function getMathLandMask(lngDeg: number, latDeg: number): boolean {
  // Eurasia
  if (latDeg >= 12 && latDeg <= 75 && lngDeg >= -20 && lngDeg <= 145) return true
  // Africa
  if (latDeg >= -35 && latDeg <= 35 && lngDeg >= -17 && lngDeg <= 51) return true
  // North America
  if (latDeg >= 15 && latDeg <= 72 && lngDeg >= -168 && lngDeg <= -52) return true
  // South America
  if (latDeg >= -55 && latDeg <= 12 && lngDeg >= -82 && lngDeg <= -34) return true
  // Australia
  if (latDeg >= -42 && latDeg <= -10 && lngDeg >= 113 && lngDeg <= 153) return true
  // Antarctica
  if (latDeg <= -60) return true
  return false
}

interface TileData {
  id: number
  center: THREE.Vector3 // 3D coordinate on sphere
  theta: number         // Longitude in radians
  phi: number           // Latitude in radians
  normLng: number       // Normalized longitude [0, 1]
  isLand: boolean       // Classification from mask
  quaternion: THREE.Quaternion // Orientation matching normal
}

interface GlobeFieldProps {
  progressRef: React.RefObject<number>
}

export function GlobeField({ progressRef }: GlobeFieldProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const [maskData, setMaskData] = useState<{ data: Uint8Array; w: number; h: number } | null>(null)
  
  const count = GLOBE_CONFIG.TILE_COUNT

  // Load the equirectangular land-mask once at startup and read pixels
  useEffect(() => {
    const img = new Image()
    img.src = '/earth-mask.png'
    img.crossOrigin = 'anonymous'
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
      console.warn('Failed to load earth-mask.png. Falling back to mathematical geometry.')
    }
  }, [])

  // Generate Hexasphere points (evenly spaced tiles using Fibonacci Sphere)
  const tiles: TileData[] = useMemo(() => {
    const arr: TileData[] = []
    const tempUp = new THREE.Vector3(0, 1, 0)

    for (let i = 0; i < count; i++) {
      const idx = i
      // Fibonacci sphere distribution coordinates
      const y = 1 - (idx / (count - 1)) * 2
      const radius = Math.sqrt(1 - y * y)
      const goldenRatio = Math.PI * (3 - Math.sqrt(5))
      const theta = idx * goldenRatio
      
      const x = Math.cos(theta) * radius
      const z = Math.sin(theta) * radius

      const center = new THREE.Vector3(x, y, z).normalize()

      // Calculate latitude and longitude angles
      const phi = Math.asin(y)
      const latDeg = (phi * 180) / Math.PI
      const lngDeg = (theta * 180) / Math.PI

      // Normalize longitude to [0, 1] for terminator sweep
      // Math.atan2(z, x) is in [-PI, PI], normalize to [0, 1]
      const actualLng = Math.atan2(z, x)
      const normLng = (actualLng + Math.PI) / (2 * Math.PI)

      // Initialize orientation quaternion so the hexagon prism sits flush with surface normal
      const quat = new THREE.Quaternion().setFromUnitVectors(tempUp, center)

      // Classify tile as LAND or OCEAN (initially use math fallback)
      let isLand = getMathLandMask(lngDeg, latDeg)

      // If mask image pixel data is loaded, perform high-precision lookups
      if (maskData) {
        const u = (actualLng + Math.PI) / (2 * Math.PI)
        const v = 1 - (phi + Math.PI / 2) / Math.PI
        
        const px = Math.min(Math.max(Math.floor(u * maskData.w), 0), maskData.w - 1)
        const py = Math.min(Math.max(Math.floor(v * maskData.h), 0), maskData.h - 1)
        const pixelIdx = (py * maskData.w + px) * 4
        
        // White pixel (>128 R value) denotes landmass
        isLand = maskData.data[pixelIdx] > 128
      }

      arr.push({
        id: idx,
        center,
        theta: actualLng,
        phi,
        normLng,
        isLand,
        quaternion: quat
      })
    }
    return arr
  }, [count, maskData])

  // Precompute static colors for both states
  const colorsA = useMemo(() => new THREE.Color(GLOBE_CONFIG.COLOR_BLACK_STATE), [])
  const colorsB = useMemo(() => {
    return tiles.map((tile) => {
      const col = new THREE.Color()
      if (tile.isLand) {
        col.set(GLOBE_CONFIG.COLOR_LAND_TARGET)
      } else {
        col.set(GLOBE_CONFIG.COLOR_OCEAN_TARGET)
      }
      return col
    })
  }, [tiles])

  // Setup auxiliary matrices to avoid GC allocation inside 60FPS tick
  const tempMatrix = useMemo(() => new THREE.Matrix4(), [])
  const tempColor = useMemo(() => new THREE.Color(), [])
  const scaleVec = useMemo(() => new THREE.Vector3(), [])
  const posVec = useMemo(() => new THREE.Vector3(), [])

  useFrame((state) => {
    if (!meshRef.current) return

    const elapsed = state.clock.getElapsedTime()
    const rawProgress = progressRef.current ?? 0

    // Constant slow Y-axis auto-rotation (0.03 rad/s)
    meshRef.current.rotation.y = elapsed * GLOBE_CONFIG.ROTATION_SPEED

    tiles.forEach((tile) => {
      // 1. Stagger reveal progress by longitude (sunrise terminator sweep)
      const delay = tile.normLng * GLOBE_CONFIG.SWEEP_SPEED
      const t_local = Math.max(0, Math.min(1, (rawProgress - delay) / (1 - GLOBE_CONFIG.SWEEP_SPEED)))
      // Apply clean smoothstep ease
      const t_eased = t_local * t_local * (3 - 2 * t_local)

      // 2. Interpolate tile colors (BLACK_STATE -> TARGET)
      const targetCol = colorsB[tile.id]
      tempColor.lerpColors(colorsA, targetCol, t_eased)
      meshRef.current!.setColorAt(tile.id, tempColor)

      // 3. Interpolate land extrusion height slightly as they color in (~15% uplift)
      let currentHeight = GLOBE_CONFIG.HEX_HEIGHT
      if (tile.isLand) {
        currentHeight += GLOBE_CONFIG.LAND_EXTRUSION_ADD * t_eased
      }

      // Hexagon sits flush on the sphere surface (radius = 3.5)
      // Translate slightly outward by half the height so cylinder bottom sits on surface
      const offsetRadius = GLOBE_CONFIG.RADIUS + currentHeight / 2
      posVec.copy(tile.center).multiplyScalar(offsetRadius)

      scaleVec.set(1, 1, 1)

      // Compose instance matrix
      tempMatrix.compose(posVec, tile.quaternion, scaleVec)
      
      // Update scale and geometry matrix
      meshRef.current!.setMatrixAt(tile.id, tempMatrix)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <group>
      {/* ONE THREE.InstancedMesh of low hex prisms */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        {/* Hex Prism cylinder sits flush (radial segments = 6, height customizable) */}
        <cylinderGeometry args={[GLOBE_CONFIG.HEX_RADIUS, GLOBE_CONFIG.HEX_RADIUS, GLOBE_CONFIG.HEX_HEIGHT, 6]} />
        <meshPhysicalMaterial 
          roughness={0.25}
          metalness={0.1}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          toneMapped={false}
        />
      </instancedMesh>

      {/* Subtle thin blue Fresnel atmosphere rim around the planet silhouette */}
      <mesh>
        <sphereGeometry args={[GLOBE_CONFIG.RADIUS + 0.06, 32, 32]} />
        <shaderMaterial
          attach="material"
          transparent
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          vertexShader={`
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            void main() {
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              vNormal = normalize(normalMatrix * normal);
              vViewPosition = -mvPosition.xyz;
              gl_Position = projectionMatrix * mvPosition;
            }
          `}
          fragmentShader={`
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            uniform vec3 color;
            void main() {
              vec3 normal = normalize(vNormal);
              vec3 viewDir = normalize(vViewPosition);
              // Thin smooth Fresnel glow calculations
              float intensity = pow(1.0 - dot(normal, viewDir), 3.2);
              gl_FragColor = vec4(color, intensity * 0.5);
            }
          `}
          uniforms={{
            color: { value: new THREE.Color(GLOBE_CONFIG.COLOR_ATMOSPHERE) }
          }}
        />
      </mesh>
    </group>
  )
}
