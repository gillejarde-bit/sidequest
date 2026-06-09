import React, { useEffect, useRef } from 'react'
import { Map as MapboxMap } from 'mapbox-gl'
import * as h3 from 'h3-js'
import { useMapStore } from '../../../stores/mapStore'
import { FOG_CONFIG } from './config'

interface FogLayerProps {
  map: MapboxMap | null
  userLocation: { lat: number; lng: number } | null
  onFirstFramePaint?: () => void
}

// ─── H3 Compat wrappers ────────────────────────────────────────────────────────
const cellToParent = (cell: string, res: number): string => {
  if (typeof h3.cellToParent === 'function') {
    return h3.cellToParent(cell, res)
  } else if (typeof (h3 as any)['h3ToParent'] === 'function') {
    return (h3 as any)['h3ToParent'](cell, res)
  }
  return ''
}

// ─── H3 Compat wrappers ────────────────────────────────────────────────────────
const polygonToCells = (coordinates: number[][][], res: number): string[] => {
  if (typeof h3.polygonToCells === 'function') {
    return h3.polygonToCells(coordinates, res)
  } else if (typeof (h3 as any)['polyfill'] === 'function') {
    return (h3 as any)['polyfill'](coordinates, res)
  }
  return []
}

const cellToBoundary = (cell: string, formatAsGeoJson: boolean): [number, number][] => {
  if (typeof h3.cellToBoundary === 'function') {
    return h3.cellToBoundary(cell, formatAsGeoJson)
  } else if (typeof (h3 as any)['h3ToGeoBoundary'] === 'function') {
    return (h3 as any)['h3ToGeoBoundary'](cell, formatAsGeoJson)
  }
  return []
}

const cellToLatLng = (cell: string): [number, number] => {
  if (typeof h3.cellToLatLng === 'function') {
    return h3.cellToLatLng(cell)
  } else if (typeof (h3 as any)['h3ToGeo'] === 'function') {
    return (h3 as any)['h3ToGeo'](cell)
  }
  return [0, 0]
}

const originToDirectedEdges = (cell: string): string[] => {
  if (typeof h3.originToDirectedEdges === 'function') {
    return h3.originToDirectedEdges(cell)
  }
  return []
}

const getDirectedEdgeDestination = (edge: string): string => {
  if (typeof h3.getDirectedEdgeDestination === 'function') {
    return h3.getDirectedEdgeDestination(edge)
  }
  return ''
}

const directedEdgeToBoundary = (edge: string, formatAsGeoJson: boolean): [number, number][] => {
  if (typeof h3.directedEdgeToBoundary === 'function') {
    return h3.directedEdgeToBoundary(edge, formatAsGeoJson)
  }
  return []
}

// ─── Utility Math and Color parsing ──────────────────────────────────────────
function metersToPixels(meters: number, map: MapboxMap): number {
  const center = map.getCenter()
  const zoom = map.getZoom()
  const latitude = center.lat
  // Standard Web Mercator resolution formula
  const metersPerPixel = (40075016.686 * Math.cos(latitude * Math.PI / 180)) / Math.pow(2, zoom + 8)
  return meters / metersPerPixel
}

function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '')
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}


interface EmberParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  pulseSpeed: number
  pulseOffset: number
}

export const FogLayer: React.FC<FogLayerProps> = ({ map, userLocation, onFirstFramePaint }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  
  // Zustand State
  const revealSet = useMapStore(s => s.revealSet)

  // Offscreen pre-rendered components
  const smokeTextureCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const cachedMaskCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const emberSpriteCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Caching coordinates & values to scale cached blurred bitmap on pan/zoom
  const cachedCenterRef = useRef<any>(null)
  const cachedZoomRef = useRef<number>(0)
  const needsReblurRef = useRef<boolean>(true)
  
  // Animation drift states
  const smokeOffsetXRef = useRef<number>(0)
  const smokeOffsetYRef = useRef<number>(0)
  const animationFrameIdRef = useRef<number | null>(null)
  const reducedMotionRef = useRef<boolean>(false)
  
  // Embers and visibility state
  const embersRef = useRef<EmberParticle[]>([])
  const isVisibleRef = useRef<boolean>(true)

  const isFirstPaintRef = useRef<boolean>(true)

  // Cache of explored sets per resolution
  const exploredSetsRef = useRef<Record<number, Set<string>>>({
    10: new Set(),
    8: new Set(),
    6: new Set(),
    4: new Set(),
    2: new Set(),
    1: new Set()
  })

  // Resolution crossfading refs
  const activeResRef = useRef<number>(10)
  const prevResRef = useRef<number | null>(null)
  const fadeStartTimeRef = useRef<number>(0)

  // Keep latest parameters in refs to avoid re-initializing the rendering loop
  const userLocationRef = useRef(userLocation)
  useEffect(() => {
    userLocationRef.current = userLocation
    needsReblurRef.current = true // Rebuild cache when user location updates (shifts torch glow)
  }, [userLocation])

  const revealSetRef = useRef(revealSet)
  useEffect(() => {
    revealSetRef.current = revealSet

    // Recompute parent explored sets for each resolution
    const fineCells = Array.from(revealSet)
    const newSets: Record<number, Set<string>> = {
      10: new Set(revealSet),
      8: new Set(),
      6: new Set(),
      4: new Set(),
      2: new Set(),
      1: new Set()
    }

    const resolutions = [8, 6, 4, 2, 1]
    fineCells.forEach(cell => {
      resolutions.forEach(res => {
        try {
          const parent = cellToParent(cell, res)
          if (parent) {
            newSets[res].add(parent)
          }
        } catch (e) {}
      })
    })

    exploredSetsRef.current = newSets
    needsReblurRef.current = true
  }, [revealSet])

  // Track app visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible'
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Build ember radial gradient sprite
  const buildEmberSprite = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const sctx = canvas.getContext('2d')
    if (!sctx) return
    
    const grad = sctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    grad.addColorStop(0, 'rgba(238, 108, 31, 0.75)') // Ember color
    grad.addColorStop(0.3, 'rgba(238, 108, 31, 0.35)')
    grad.addColorStop(1, 'transparent')
    
    sctx.fillStyle = grad
    sctx.beginPath()
    sctx.arc(16, 16, 16, 0, Math.PI * 2)
    sctx.fill()
    
    emberSpriteCanvasRef.current = canvas
  }

  // Initialize ember particles
  const initEmbers = (w: number, h: number) => {
    const count = 40
    const list: EmberParticle[] = []
    for (let i = 0; i < count; i++) {
      list.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: -0.05 - Math.random() * 0.1,
        vy: -0.03 - Math.random() * 0.08,
        size: 4 + Math.random() * 8,
        alpha: 0.1 + Math.random() * 0.4,
        pulseSpeed: 0.001 + Math.random() * 0.002,
        pulseOffset: Math.random() * Math.PI * 2
      })
    }
    embersRef.current = list
  }

  // Initialize offscreen canvases
  useEffect(() => {
    smokeTextureCanvasRef.current = document.createElement('canvas')
    cachedMaskCanvasRef.current = document.createElement('canvas')
    buildEmberSprite()
    rebuildSmokeTexture()
  }, [])

  // Build the textured smoke tile once (512x512)
  const rebuildSmokeTexture = () => {
    const smokeCanvas = smokeTextureCanvasRef.current
    if (!smokeCanvas) return
    
    smokeCanvas.width = 512
    smokeCanvas.height = 512
    
    const sctx = smokeCanvas.getContext('2d')
    if (!sctx) return
    
    // Fill deep base
    sctx.fillStyle = FOG_CONFIG.COLORS.FORGE_BLACK
    sctx.fillRect(0, 0, 512, 512)
    
    // 260 Soft radial cloud blobs
    const smokeColors = FOG_CONFIG.COLORS.SMOKE
    for (let i = 0; i < 260; i++) {
      const x = Math.random() * 512
      const y = Math.random() * 512
      const r = 40 + Math.random() * 80
      const color = smokeColors[Math.floor(Math.random() * smokeColors.length)]
      const opacity = 0.04 + Math.random() * 0.08
      
      const grad = sctx.createRadialGradient(x, y, 0, x, y, r)
      grad.addColorStop(0, hexToRgba(color, opacity))
      grad.addColorStop(0.5, hexToRgba(color, opacity * 0.4))
      grad.addColorStop(1, 'transparent')
      
      sctx.fillStyle = grad
      sctx.beginPath()
      sctx.arc(x, y, r, 0, Math.PI * 2)
      sctx.fill()
    }
    
    // 26 Faint warm embers
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * 512
      const y = Math.random() * 512
      const r = 15 + Math.random() * 25
      const opacity = 0.03 + Math.random() * 0.05
      
      const grad = sctx.createRadialGradient(x, y, 0, x, y, r)
      grad.addColorStop(0, hexToRgba(FOG_CONFIG.COLORS.EMBER_DEEP, opacity))
      grad.addColorStop(1, 'transparent')
      
      sctx.fillStyle = grad
      sctx.beginPath()
      sctx.arc(x, y, r, 0, Math.PI * 2)
      sctx.fill()
    }
  }

  // Helper function to calculate distance in meters (Haversine)
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3 // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const parseHex = (hex: string): { r: number; g: number; b: number } => {
    const clean = hex.replace('#', '')
    const r = parseInt(clean.substring(0, 2), 16)
    const g = parseInt(clean.substring(2, 4), 16)
    const b = parseInt(clean.substring(4, 6), 16)
    return { r, g, b }
  }

  const lerpColor = (color1: string, color2: string, factor: number): string => {
    const c1 = parseHex(color1)
    const c2 = parseHex(color2)
    const r = Math.round(c1.r + factor * (c2.r - c1.r))
    const g = Math.round(c1.g + factor * (c2.g - c1.g))
    const b = Math.round(c1.b + factor * (c2.b - c1.b))
    return `rgb(${r}, ${g}, ${b})`
  }

  const getResForZoom = (zoom: number): number => {
    if (zoom >= 15) return 10
    if (zoom >= 12) return 8
    if (zoom >= 9) return 6
    if (zoom >= 6) return 4
    if (zoom >= 4) return 2
    return 1
  }

  const getFrontierEdges = (viewportCells: string[], exploredSet: Set<string>): string[] => {
    const frontier: string[] = []
    viewportCells.forEach(cell => {
      if (!exploredSet.has(cell)) {
        try {
          const edges = originToDirectedEdges(cell)
          edges.forEach(edge => {
            const dest = getDirectedEdgeDestination(edge)
            if (dest && exploredSet.has(dest)) {
              frontier.push(edge)
            }
          })
        } catch (e) {}
      }
    })
    return frontier
  }

  // Draw H3 fog mosaic, outlines, and glowing frontier boundary for a specific resolution
  const drawFogAtResolution = (
    ctx: CanvasRenderingContext2D,
    mapInstance: MapboxMap,
    res: number,
    alpha: number,
    mainWidth: number,
    mainHeight: number,
    useCacheShift: boolean = false
  ) => {
    const bounds = mapInstance.getBounds()
    if (!bounds) return

    const north = bounds.getNorth()
    const south = bounds.getSouth()
    const east = bounds.getEast()
    const west = bounds.getWest()

    // Render slightly beyond viewport boundaries
    const margin = useCacheShift ? 0.35 : 0.15
    const latMargin = (north - south) * margin
    const lngMargin = (east - west) * margin

    const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val))
    const n = clamp(north + latMargin, -85, 85)
    const s = clamp(south - latMargin, -85, 85)
    const e = clamp(east + lngMargin, -180, 180)
    const w = clamp(west - lngMargin, -180, 180)

    const polygon = [
      [
        [n, w],
        [n, e],
        [s, e],
        [s, w],
        [n, w]
      ]
    ]

    let viewportCells: string[] = []
    try {
      viewportCells = polygonToCells(polygon, res)
    } catch (e) {
      return
    }

    const exploredSet = exploredSetsRef.current[res] || new Set()
    const userLoc = userLocationRef.current
    const torchRadius = 250 // meters
    const litColor = '#6A3A18'
    const palette = ['#1D130D', '#241A12', '#2B1D13', '#32220F', '#1A110B']

    const hashH3 = (h3Index: string): number => {
      let hash = 0
      for (let i = 0; i < h3Index.length; i++) {
        hash = h3Index.charCodeAt(i) + ((hash << 5) - hash)
      }
      return Math.abs(hash)
    }

    // Shift elements offset to cache coordinate space if pre-rendering
    const xOffset = useCacheShift ? Math.round(mainWidth * 0.3) : 0
    const yOffset = useCacheShift ? Math.round(mainHeight * 0.3) : 0

    ctx.save()
    ctx.globalAlpha = alpha

    // Pass 1: Fill unexplained warm hexes
    viewportCells.forEach(cell => {
      if (!exploredSet.has(cell)) {
        const baseColor = palette[hashH3(cell) % palette.length]
        let finalColor = baseColor

        // Torch glow cell warming
        if (userLoc && userLoc.lat !== null && userLoc.lng !== null) {
          try {
            const cellLatLng = cellToLatLng(cell)
            const dist = getDistance(cellLatLng[0], cellLatLng[1], userLoc.lat, userLoc.lng)
            if (dist < torchRadius) {
              const t = 1.0 - dist / torchRadius
              const falloff = Math.pow(t, 1.5)
              finalColor = lerpColor(baseColor, litColor, falloff)
            }
          } catch (e) {}
        }

        const boundary = cellToBoundary(cell, true)
        if (boundary.length > 0) {
          ctx.fillStyle = finalColor
          ctx.beginPath()
          boundary.forEach((coord, idx) => {
            const px = mapInstance.project([coord[0], coord[1]])
            if (idx === 0) {
              ctx.moveTo(px.x + xOffset, px.y + yOffset)
            } else {
              ctx.lineTo(px.x + xOffset, px.y + yOffset)
            }
          })
          ctx.closePath()
          ctx.fill()
        }
      }
    })

    // Pass 2: Draw soft warm-charcoal outlines in a single batch stroke
    ctx.strokeStyle = 'rgba(58, 42, 32, 0.4)' // #3A2A20 at 0.4 opacity
    ctx.lineWidth = 1
    ctx.lineJoin = 'round'
    ctx.beginPath()
    viewportCells.forEach(cell => {
      if (!exploredSet.has(cell)) {
        const boundary = cellToBoundary(cell, true)
        if (boundary.length > 0) {
          const px0 = mapInstance.project([boundary[0][0], boundary[0][1]])
          ctx.moveTo(px0.x + xOffset, px0.y + yOffset)
          for (let i = 1; i < boundary.length; i++) {
            const px = mapInstance.project([boundary[i][0], boundary[i][1]])
            ctx.lineTo(px.x + xOffset, px.y + yOffset)
          }
          ctx.closePath()
        }
      }
    })
    ctx.stroke()

    // Pass 3: Draw soft frontier glow along the explored boundaries
    const frontierEdges = getFrontierEdges(viewportCells, exploredSet)
    if (frontierEdges.length > 0) {
      const zoom = mapInstance.getZoom()
      const zoomScale = Math.max(0.5, Math.min(2.0, Math.pow(1.15, zoom - 15)))

      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.strokeStyle = 'rgba(238, 140, 70, 0.45)'
      ctx.lineWidth = 3.0 * zoomScale
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.shadowColor = 'rgba(238, 140, 70, 0.6)'
      ctx.shadowBlur = 4.0 * zoomScale

      ctx.beginPath()
      frontierEdges.forEach(edge => {
        try {
          const boundary = directedEdgeToBoundary(edge, true)
          if (boundary.length >= 2) {
            const px0 = mapInstance.project([boundary[0][0], boundary[0][1]])
            const px1 = mapInstance.project([boundary[1][0], boundary[1][1]])
            ctx.moveTo(px0.x + xOffset, px0.y + yOffset)
            ctx.lineTo(px1.x + xOffset, px1.y + yOffset)
          }
        } catch (e) {}
      })
      ctx.stroke()
      ctx.restore()
    }

    ctx.restore()
  }

  // Draw loop
  const drawEverything = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
      needsReblurRef.current = true
      initEmbers(width, height)
    }

    // 1) Clear screen
    ctx.clearRect(0, 0, width, height)

    // 2) Draw drifting textured smoke over the ENTIRE canvas
    const textCanvas = smokeTextureCanvasRef.current
    if (textCanvas) {
      const pattern = ctx.createPattern(textCanvas, 'repeat')
      if (pattern) {
        ctx.save()
        ctx.translate(smokeOffsetXRef.current, smokeOffsetYRef.current)
        ctx.fillStyle = pattern
        ctx.fillRect(-smokeOffsetXRef.current, -smokeOffsetYRef.current, width + 512, height + 512)
        ctx.restore()
      } else {
        ctx.fillStyle = FOG_CONFIG.COLORS.FORGE_BLACK
        ctx.fillRect(0, 0, width, height)
      }
    } else {
      ctx.fillStyle = FOG_CONFIG.COLORS.FORGE_BLACK
      ctx.fillRect(0, 0, width, height)
    }

    // If map is not initialized yet, just draw the drifting embers and return (covers raw style load)
    if (!map) {
      const emberSprite = emberSpriteCanvasRef.current
      if (emberSprite && embersRef.current.length > 0) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        embersRef.current.forEach(p => {
          const pulse = Math.sin(Date.now() * p.pulseSpeed + p.pulseOffset) * 0.15
          const currentAlpha = Math.max(0.05, Math.min(0.8, p.alpha + pulse))
          ctx.globalAlpha = currentAlpha
          ctx.drawImage(emberSprite, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
        })
        ctx.restore()
      }
      return
    }

    const zoom = map.getZoom()
    const targetRes = getResForZoom(zoom)

    // Manage H3 resolution band transitions with crossfade
    if (targetRes !== activeResRef.current) {
      prevResRef.current = activeResRef.current
      activeResRef.current = targetRes
      fadeStartTimeRef.current = performance.now()
    }

    let fadeRatio = 1.0
    if (prevResRef.current !== null) {
      const elapsed = performance.now() - fadeStartTimeRef.current
      fadeRatio = Math.min(1.0, elapsed / 150)
      if (fadeRatio >= 1.0) {
        prevResRef.current = null
        needsReblurRef.current = true // rebuild cache for target resolution
      }
    }

    // Draw fog layer (either crossfading real-time or using cached translated bitmap)
    if (prevResRef.current !== null && fadeRatio < 1.0) {
      // 1. Draw previous resolution fading out
      drawFogAtResolution(ctx, map, prevResRef.current, 1.0 - fadeRatio, width, height, false)
      // 2. Draw active resolution fading in
      drawFogAtResolution(ctx, map, activeResRef.current, fadeRatio, width, height, false)
    } else {
      // 3. Normal cached rendering
      if (needsReblurRef.current) {
        const success = rebuildFogCache(width, height)
        if (success) {
          needsReblurRef.current = false
        }
      }

      const cachedMask = cachedMaskCanvasRef.current
      if (cachedMask && cachedCenterRef.current) {
        const marginPct = 0.3
        const cWidth = width * (1 + 2 * marginPct)
        const cHeight = height * (1 + 2 * marginPct)

        // Translate and scale cached bitmap based on camera delta
        const currentPos = map.project(cachedCenterRef.current)
        const scale = Math.pow(2, map.getZoom() - cachedZoomRef.current)
        
        const cw = cWidth * scale
        const ch = cHeight * scale
        const cx = currentPos.x - (cWidth / 2) * scale
        const cy = currentPos.y - (cHeight / 2) * scale

        ctx.drawImage(cachedMask, cx, cy, cw, ch)
      }
    }

    // 6) Draw Warm Additive Torchlight Glow (around the user)
    const userLoc = userLocationRef.current
    if (userLoc && userLoc.lat !== null && userLoc.lng !== null) {
      const userPx = map.project([userLoc.lng, userLoc.lat])
      const torchGlowPx = Math.max(30.0, metersToPixels(FOG_CONFIG.TORCH_GLOW_METERS, map))
      
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      
      // Introduce subtle torch flickering animation (if reduced-motion is disabled)
      const flicker = reducedMotionRef.current 
        ? 1.0 
        : 0.96 + Math.sin(Date.now() / 120) * 0.04
        
      const grad = ctx.createRadialGradient(userPx.x, userPx.y, 0, userPx.x, userPx.y, torchGlowPx)
      grad.addColorStop(0, hexToRgba(FOG_CONFIG.COLORS.EMBER, 0.24 * flicker))
      grad.addColorStop(0.3, hexToRgba(FOG_CONFIG.COLORS.EMBER, 0.12 * flicker))
      grad.addColorStop(1, 'transparent')
      
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(userPx.x, userPx.y, torchGlowPx, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // 7) Draw drifting embers
    const emberSprite = emberSpriteCanvasRef.current
    if (emberSprite && embersRef.current.length > 0) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      
      embersRef.current.forEach(p => {
        const pulse = Math.sin(Date.now() * p.pulseSpeed + p.pulseOffset) * 0.15
        const currentAlpha = Math.max(0.05, Math.min(0.8, p.alpha + pulse))
        
        ctx.globalAlpha = currentAlpha
        ctx.drawImage(emberSprite, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
      })
      
      ctx.restore()
    }

    // Signal first frame painted once loaded
    if (isFirstPaintRef.current && map) {
      isFirstPaintRef.current = false
      setTimeout(() => {
        onFirstFramePaint?.()
      }, 0)
    }
  }

  // Pre-render unexplored hex fog, outlines and frontier onto offscreen cachedMaskCanvas
  const rebuildFogCache = (width: number, height: number): boolean => {
    if (!map) return false
    const maskCanvas = cachedMaskCanvasRef.current
    if (!maskCanvas) return false

    const marginPct = 0.3
    const cWidth = Math.round(width * (1 + 2 * marginPct))
    const cHeight = Math.round(height * (1 + 2 * marginPct))

    maskCanvas.width = cWidth
    maskCanvas.height = cHeight

    const mctx = maskCanvas.getContext('2d')
    if (!mctx) return false

    mctx.clearRect(0, 0, cWidth, cHeight)

    cachedCenterRef.current = map.getCenter()
    cachedZoomRef.current = map.getZoom()

    // Draw the active resolution fog onto the cache canvas
    drawFogAtResolution(mctx, map, activeResRef.current, 1.0, width, height, true)

    return true
  }

  // Register Mapbox movement listeners to trigger redrawing and cache invalidation
  useEffect(() => {
    if (!map) return

    const onMove = () => {
      const currentZoom = map.getZoom()
      if (Math.abs(currentZoom - cachedZoomRef.current) > 0.3) {
        needsReblurRef.current = true
      }
      drawEverything()
    }

    const onMoveEnd = () => {
      needsReblurRef.current = true
      drawEverything()
    }

    map.on('move', onMove)
    map.on('moveend', onMoveEnd)
    map.on('zoom', onMove)
    map.on('zoomend', onMoveEnd)
    
    // Force initial render when map is loaded
    needsReblurRef.current = true
    drawEverything()

    return () => {
      map.off('move', onMove)
      map.off('moveend', onMoveEnd)
      map.off('zoom', onMove)
      map.off('zoomend', onMoveEnd)
    }
  }, [map])

  // Setup loop for smoke drift animation
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotionRef.current = mediaQuery.matches
    
    const handleMotionChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches
    }
    mediaQuery.addEventListener('change', handleMotionChange)

    let lastTime = performance.now()
    const animLoop = (now: number) => {
      const delta = now - lastTime
      lastTime = now

      if (isVisibleRef.current) {
        let needsDraw = false

        // 1. Update embers
        if (!reducedMotionRef.current) {
          const w = canvasRef.current?.width || 0
          const h = canvasRef.current?.height || 0
          if (w > 0 && h > 0) {
            // Initialize embers if not yet done
            if (embersRef.current.length === 0) {
              initEmbers(w, h)
            }
            embersRef.current.forEach(p => {
              p.x = (p.x + p.vx * delta + w) % w
              p.y = (p.y + p.vy * delta + h) % h
            })
            needsDraw = true
          }
        }

        // 2. Update smoke drift offsets
        if (!reducedMotionRef.current) {
          smokeOffsetXRef.current = (smokeOffsetXRef.current + 0.012 * delta) % 512
          smokeOffsetYRef.current = (smokeOffsetYRef.current + 0.006 * delta) % 512
          needsDraw = true
        }

        if (needsDraw) {
          drawEverything()
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(animLoop)
    }

    animationFrameIdRef.current = requestAnimationFrame(animLoop)

    return () => {
      mediaQuery.removeEventListener('change', handleMotionChange)
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current)
      }
    }
  }, [map])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 3 }}
    />
  )
}
