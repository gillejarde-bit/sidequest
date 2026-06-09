import React, { useEffect, useRef } from 'react'
import { Map as MapboxMap } from 'mapbox-gl'
import * as h3 from 'h3-js'
import { useMapStore } from '../../../stores/mapStore'
import { FOG_CONFIG } from './config'

interface FogLayerProps {
  map: MapboxMap | null
  userLocation: { lat: number; lng: number } | null
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

function drawCellHexagon(ctx: CanvasRenderingContext2D, cell: string, map: MapboxMap, overlapPx: number) {
  const boundary = cellToBoundary(cell, true)
  if (boundary.length === 0) return

  const centerLatLng = cellToLatLng(cell)
  const centerPx = map.project([centerLatLng[1], centerLatLng[0]])

  ctx.beginPath()
  boundary.forEach((coord, idx) => {
    // coord is [lng, lat]
    const px = map.project([coord[0], coord[1]])
    const dx = px.x - centerPx.x
    const dy = px.y - centerPx.y
    const len = Math.sqrt(dx * dx + dy * dy)

    if (len > 0) {
      // Scale vertex outward along the ray from the hexagon center to ensure perfect zero-seam coverage
      const ox = px.x + (dx / len) * overlapPx
      const oy = px.y + (dy / len) * overlapPx
      if (idx === 0) {
        ctx.moveTo(ox, oy)
      } else {
        ctx.lineTo(ox, oy)
      }
    } else {
      if (idx === 0) {
        ctx.moveTo(px.x, px.y)
      } else {
        ctx.lineTo(px.x, px.y)
      }
    }
  })
  ctx.closePath()
  ctx.fill()
}

export const FogLayer: React.FC<FogLayerProps> = ({ map, userLocation }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  
  // Zustand State
  const revealSet = useMapStore(s => s.revealSet)

  // Offscreen pre-rendered components
  const smokeTextureCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const cachedMaskCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Caching coordinates & values to scale cached blurred bitmap on pan/zoom
  const cachedCenterRef = useRef<any>(null)
  const cachedZoomRef = useRef<number>(0)
  const needsReblurRef = useRef<boolean>(true)
  
  // Animation drift states
  const smokeOffsetXRef = useRef<number>(0)
  const smokeOffsetYRef = useRef<number>(0)
  const animationFrameIdRef = useRef<number | null>(null)
  const reducedMotionRef = useRef<boolean>(false)

  // Keep latest parameters in refs to avoid re-initializing the rendering loop
  const userLocationRef = useRef(userLocation)
  useEffect(() => {
    userLocationRef.current = userLocation
  }, [userLocation])

  const revealSetRef = useRef(revealSet)
  useEffect(() => {
    revealSetRef.current = revealSet
    needsReblurRef.current = true
  }, [revealSet])

  // Initialize offscreen canvases
  useEffect(() => {
    smokeTextureCanvasRef.current = document.createElement('canvas')
    cachedMaskCanvasRef.current = document.createElement('canvas')
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

  // Draw loop
  const drawEverything = () => {
    const canvas = canvasRef.current
    if (!canvas || !map) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
      needsReblurRef.current = true
    }

    // 1) Re-blur mask canvas if the cache was invalidated (e.g. revealSet changed or move ended)
    if (needsReblurRef.current) {
      rebuildMaskCache(canvas.width, canvas.height)
      needsReblurRef.current = false
    }

    // 2) Clear screen
    ctx.clearRect(0, 0, width, height)

    // 3) Draw drifting textured smoke
    const textCanvas = smokeTextureCanvasRef.current
    if (textCanvas) {
      const pattern = ctx.createPattern(textCanvas, 'repeat')
      if (pattern) {
        ctx.save()
        ctx.translate(smokeOffsetXRef.current, smokeOffsetYRef.current)
        ctx.fillStyle = pattern
        ctx.fillRect(-smokeOffsetXRef.current, -smokeOffsetYRef.current, width, height)
        ctx.restore()
      } else {
        ctx.fillStyle = FOG_CONFIG.COLORS.FORGE_BLACK
        ctx.fillRect(0, 0, width, height)
      }
    } else {
      ctx.fillStyle = FOG_CONFIG.COLORS.FORGE_BLACK
      ctx.fillRect(0, 0, width, height)
    }

    // 4) Composite Mask (keeps smoke ONLY in unexplored areas)
    ctx.globalCompositeOperation = 'destination-in'
    const cachedMask = cachedMaskCanvasRef.current
    if (cachedMask) {
      const cachedCenter = cachedCenterRef.current
      const cachedZoom = cachedZoomRef.current
      
      // Calculate scale & offset between current map view and cached map view
      const currentPos = map.project(cachedCenter)
      const scale = Math.pow(2, map.getZoom() - cachedZoom)
      const cx = currentPos.x - (width / 2) * scale
      const cy = currentPos.y - (height / 2) * scale
      const cw = width * scale
      const ch = height * scale

      // Draw the cached blurred mask stretched/panned via GPU-backed translation
      ctx.drawImage(cachedMask, cx, cy, cw, ch)
    }
    ctx.globalCompositeOperation = 'source-over'

    // 5) Draw Warm Additive Torchlight Glow (around the user)
    const userLoc = userLocationRef.current
    if (userLoc && userLoc.lat !== null && userLoc.lng !== null) {
      const userPx = map.project([userLoc.lng, userLoc.lat])
      const torchGlowPx = Math.max(30.0, metersToPixels(FOG_CONFIG.TORCH_GLOW_METERS, map))
      
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
      ctx.globalCompositeOperation = 'source-over'
    }
  }

  // Re-build mask cache by rendering viewport cells on offscreen canvas and applying blur filter ONCE
  const rebuildMaskCache = (width: number, height: number) => {
    const maskCanvas = cachedMaskCanvasRef.current
    if (!maskCanvas || !map) return
    maskCanvas.width = width
    maskCanvas.height = height

    const mctx = maskCanvas.getContext('2d')
    if (!mctx) return

    cachedCenterRef.current = map.getCenter()
    cachedZoomRef.current = map.getZoom()

    // Create a temporary canvas to render raw crisp shapes
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = width
    tempCanvas.height = height
    const tctx = tempCanvas.getContext('2d')
    if (!tctx) return

    // 1) Start with completely opaque white (represents unrevealed fog coverage)
    tctx.fillStyle = '#FFFFFF'
    tctx.fillRect(0, 0, width, height)

    // 2) Cut out the explored cells using destination-out
    tctx.globalCompositeOperation = 'destination-out'
    tctx.fillStyle = '#000000'

    // Retrieve H3 cells within viewport bounds plus a safety border margin
    const bounds = map.getBounds()
    if (!bounds) return
    const north = bounds.getNorth()
    const south = bounds.getSouth()
    const east = bounds.getEast()
    const west = bounds.getWest()
    const latMargin = (north - south) * 0.15
    const lngMargin = (east - west) * 0.15

    const polygon = [
      [
        [north + latMargin, west - lngMargin],
        [north + latMargin, east + lngMargin],
        [south - latMargin, east + lngMargin],
        [south - latMargin, west - lngMargin],
        [north + latMargin, west - lngMargin]
      ]
    ]

    let viewportCells: string[] = []
    try {
      viewportCells = polygonToCells(polygon, FOG_CONFIG.H3_RESOLUTION)
    } catch (e) {
      console.warn('[FogLayer] H3 viewport generation failed:', e)
    }

    const overlapPx = Math.max(1.5, metersToPixels(FOG_CONFIG.HEX_OVERLAP_METERS, map))
    const currentRevealSet = revealSetRef.current

    viewportCells.forEach(cell => {
      if (currentRevealSet.has(cell)) {
        drawCellHexagon(tctx, cell, map, overlapPx)
      }
    })

    tctx.globalCompositeOperation = 'source-over'

    // 3) Apply gaussian blur filter and draw raw crisp mask onto cached mask canvas
    mctx.clearRect(0, 0, width, height)
    const blurPx = Math.max(8.0, metersToPixels(FOG_CONFIG.BLUR_RADIUS_METERS, map))
    
    // Cap blur pixels to prevent performance issues with huge blur operations
    const finalBlurPx = Math.min(64.0, blurPx)

    mctx.filter = `blur(${finalBlurPx}px)`
    mctx.drawImage(tempCanvas, 0, 0)
    mctx.filter = 'none'
  }

  // Register Mapbox movement listeners to trigger redrawing and cache invalidation
  useEffect(() => {
    if (!map) return

    const onMove = () => {
      // Redraw immediately (will draw cached blurred mask with scale/translation)
      drawEverything()
    }

    const onMoveEnd = () => {
      // User finished dragging/zooming: invalidate cache to re-project and re-blur at the new view
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
    // Media query to respect prefers-reduced-motion OS accessibility
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

      if (!reducedMotionRef.current) {
        // Increment offset (pixels per frame) and wrap at texture width (512)
        smokeOffsetXRef.current = (smokeOffsetXRef.current + 0.012 * delta) % 512
        smokeOffsetYRef.current = (smokeOffsetYRef.current + 0.006 * delta) % 512
      }

      drawEverything()
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
