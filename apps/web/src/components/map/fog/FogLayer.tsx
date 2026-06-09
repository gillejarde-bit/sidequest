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

export const FogLayer: React.FC<FogLayerProps> = ({ map, userLocation }) => {
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
      initEmbers(width, height)
    }

    // 1) Rebuild fog mask cache if it was invalidated (e.g. revealSet changed or move ended)
    if (needsReblurRef.current) {
      const success = rebuildFogCache(width, height)
      if (success) {
        needsReblurRef.current = false
      }
    }

    // 1b) Only draw the fog overlay if we have a valid cache and center
    const cachedMask = cachedMaskCanvasRef.current
    if (!cachedMask || !cachedCenterRef.current) {
      return
    }

    // 2) Clear screen
    ctx.clearRect(0, 0, width, height)

    // 3) Draw drifting textured smoke over the ENTIRE canvas
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

    // 4) Composite Mask (carves explored holes out of the smoke)
    ctx.globalCompositeOperation = 'destination-out'
    if (cachedMask && cachedCenterRef.current) {
      const marginPct = 0.3
      const cWidth = width * (1 + 2 * marginPct)
      const cHeight = height * (1 + 2 * marginPct)

      // Project the center where the cache was built onto the current map view
      const currentPos = map.project(cachedCenterRef.current)
      const scale = Math.pow(2, map.getZoom() - cachedZoomRef.current)
      
      const cw = cWidth * scale
      const ch = cHeight * scale
      const cx = currentPos.x - (cWidth / 2) * scale
      const cy = currentPos.y - (cHeight / 2) * scale

      ctx.drawImage(cachedMask, cx, cy, cw, ch)
    }
    ctx.globalCompositeOperation = 'source-over'

    // 5) Draw the Die-Cut Crisp Keyline in real-time (frontier only, stays crisp on zoom)
    const bounds = map.getBounds()
    if (bounds) {
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
      } catch (e) {}

      const currentRevealSet = revealSetRef.current
      const frontierEdges = getFrontierEdges(viewportCells, currentRevealSet)
      if (frontierEdges.length > 0) {
        const zoom = map.getZoom()
        const zoomScale = Math.max(0.5, Math.min(2.0, Math.pow(1.15, zoom - 15)))
        const creamWidth = 1.6 * zoomScale
        const underlineWidth = 3.0 * zoomScale

        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        // Pass 1: Dark underline
        ctx.strokeStyle = '#241608'
        ctx.lineWidth = underlineWidth
        ctx.beginPath()
        frontierEdges.forEach(edge => {
          const boundary = directedEdgeToBoundary(edge, true)
          if (boundary.length >= 2) {
            const px0 = map.project([boundary[0][0], boundary[0][1]])
            const px1 = map.project([boundary[1][0], boundary[1][1]])
            ctx.moveTo(px0.x, px0.y)
            ctx.lineTo(px1.x, px1.y)
          }
        })
        ctx.stroke()

        // Pass 2: Cream line
        ctx.strokeStyle = '#F6EAD4'
        ctx.lineWidth = creamWidth
        ctx.beginPath()
        frontierEdges.forEach(edge => {
          const boundary = directedEdgeToBoundary(edge, true)
          if (boundary.length >= 2) {
            const px0 = map.project([boundary[0][0], boundary[0][1]])
            const px1 = map.project([boundary[1][0], boundary[1][1]])
            ctx.moveTo(px0.x, px0.y)
            ctx.lineTo(px1.x, px1.y)
          }
        })
        ctx.stroke()
      }
    }

    // 6) Draw Warm Additive Torchlight Glow (around the user)
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
  }

const getFrontierEdges = (viewportCells: string[], currentRevealSet: Set<string>): string[] => {
  const frontier: string[] = []
  viewportCells.forEach(cell => {
    if (currentRevealSet.has(cell)) {
      const edges = originToDirectedEdges(cell)
      edges.forEach(edge => {
        const dest = getDirectedEdgeDestination(edge)
        if (!dest || !currentRevealSet.has(dest)) {
          frontier.push(edge)
        }
      })
    }
  })
  return frontier
}

  // Re-build mask cache by rendering viewport cells on offscreen canvas and applying Gaussian blur ONCE
  const rebuildFogCache = (width: number, height: number): boolean => {
    if (!map) return false
    const maskCanvas = cachedMaskCanvasRef.current
    if (!maskCanvas) return false

    // Calculate cache dimensions with 30% margin on all sides (total size 1.6x screen)
    const marginPct = 0.3
    const cWidth = Math.round(width * (1 + 2 * marginPct))
    const cHeight = Math.round(height * (1 + 2 * marginPct))
    const xOffset = width * marginPct
    const yOffset = height * marginPct

    maskCanvas.width = cWidth
    maskCanvas.height = cHeight

    const mctx = maskCanvas.getContext('2d')
    if (!mctx) return false

    cachedCenterRef.current = map.getCenter()
    cachedZoomRef.current = map.getZoom()

    // Build the REVEALED mask offscreen (transparent base)
    // Explored holes are drawn as white (alpha=1), unexplored remains transparent (alpha=0)
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = cWidth
    tempCanvas.height = cHeight
    const tctx = tempCanvas.getContext('2d')
    if (!tctx) return false

    tctx.clearRect(0, 0, cWidth, cHeight)
    tctx.fillStyle = '#FFFFFF'

    // Get bounds with expanded margins to cover the 30% cache boundary
    const bounds = map.getBounds()
    if (!bounds) return false
    const north = bounds.getNorth()
    const south = bounds.getSouth()
    const east = bounds.getEast()
    const west = bounds.getWest()
    const latMargin = (north - south) * 0.35
    const lngMargin = (east - west) * 0.35

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
        // Draw the hexagon shifted to the cache canvas space
        const boundary = cellToBoundary(cell, true)
        if (boundary.length === 0) return

        const centerLatLng = cellToLatLng(cell)
        const centerPx = map.project([centerLatLng[1], centerLatLng[0]])

        tctx.beginPath()
        boundary.forEach((coord, idx) => {
          const px = map.project([coord[0], coord[1]])
          const dx = px.x - centerPx.x
          const dy = px.y - centerPx.y
          const len = Math.sqrt(dx * dx + dy * dy)

          let ox = px.x
          let oy = px.y
          if (len > 0) {
            ox = px.x + (dx / len) * overlapPx
            oy = px.y + (dy / len) * overlapPx
          }
          
          // Shift to cache coordinates
          if (idx === 0) {
            tctx.moveTo(ox + xOffset, oy + yOffset)
          } else {
            tctx.lineTo(ox + xOffset, oy + yOffset)
          }
        })
        tctx.closePath()
        tctx.fill()
      }
    })

    // Apply Gaussian blur to the revealed mask onto maskCanvas
    mctx.clearRect(0, 0, cWidth, cHeight)
    const blurPx = Math.max(8.0, metersToPixels(FOG_CONFIG.BLUR_RADIUS_METERS, map))
    const finalBlurPx = Math.min(64.0, blurPx)

    mctx.filter = `blur(${finalBlurPx}px)`
    mctx.drawImage(tempCanvas, 0, 0)
    mctx.filter = 'none'
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
