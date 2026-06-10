import { useEffect, useRef } from 'react'
import * as h3 from 'h3-js'
import type { Map as MapboxMap } from 'mapbox-gl'

/**
 * FogHexCanvas — the artistic hex fog-of-war, per the fog-v2 art direction.
 *
 * The unexplored world is a VISIBLE warm hex patchwork; explored cells are
 * fully clear (the map shows through); a soft ember glow runs along the
 * frontier; the torch warms fog hexes near the user.
 *
 * Render model (this is what kills the flashing):
 *  - The fog is painted ONCE per camera rest onto an offscreen bitmap that
 *    extends ~35% beyond the viewport.
 *  - During an active gesture (pan / pinch / wheel) the cached bitmap is only
 *    TRANSFORMED (translate + scale about the camera) — never rebuilt — so
 *    zooming is one smooth, continuous motion with no flicker.
 *  - On 'moveend' the fog is rebuilt at the LOD resolution for the new zoom
 *    and crossfaded in over ~150ms, which reads as hexes merging into
 *    bigger hexes as you zoom out.
 */

interface FogHexCanvasProps {
  map: MapboxMap
  revealSet: Set<string>
  userLat: number | null
  userLng: number | null
  onFirstFramePaint?: () => void
}

// LOD table from the fog-v2 spec — hexes stay a comfortable on-screen size
const getResForZoom = (zoom: number): number => {
  if (zoom >= 15) return 10
  if (zoom >= 12) return 8
  if (zoom >= 9) return 6
  if (zoom >= 6) return 4
  if (zoom >= 4) return 2
  return 1
}

// Deterministic warm dark per cell — stable across frames, no flicker
const FOG_HEX_PALETTE = ['#1D130D', '#241A12', '#2B1D13', '#32220F', '#1A110B']
const TORCH_LIT_RGB = { r: 0x6a, g: 0x3a, b: 0x18 }

const warmCellColor = (cellId: string, lit: number): string => {
  let hash = 0
  for (let i = 0; i < cellId.length; i++) {
    hash = cellId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const base = FOG_HEX_PALETTE[Math.abs(hash) % FOG_HEX_PALETTE.length]
  if (lit <= 0) return base
  const r = parseInt(base.slice(1, 3), 16)
  const g = parseInt(base.slice(3, 5), 16)
  const b = parseInt(base.slice(5, 7), 16)
  const t = Math.min(1, lit)
  const mix = (a: number, c: number) => Math.round(a + (c - a) * t)
  return `rgb(${mix(r, TORCH_LIT_RGB.r)}, ${mix(g, TORCH_LIT_RGB.g)}, ${mix(b, TORCH_LIT_RGB.b)})`
}

const distanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const MARGIN = 0.35          // bitmap margin beyond the viewport (each side)
const CROSSFADE_MS = 150     // LOD rebuild crossfade
const MAX_CELLS = 8000       // defensive cap

interface FogBitmap {
  canvas: HTMLCanvasElement
  centerLng: number
  centerLat: number
  zoom: number
  cssWidth: number   // bitmap size in CSS px (includes margins)
  cssHeight: number
}

export function FogHexCanvas({ map, revealSet, userLat, userLng, onFirstFramePaint }: FogHexCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const currentRef = useRef<FogBitmap | null>(null)
  const previousRef = useRef<FogBitmap | null>(null)
  const fadeStartRef = useRef<number>(0)
  const rafRef = useRef<number | null>(null)
  const firstPaintRef = useRef(false)
  const exploredCacheRef = useRef<{ key: Set<string> | null; byRes: Map<number, Set<string>> }>({ key: null, byRes: new Map() })
  const rebuildRef = useRef<(() => void) | null>(null)

  // Latest props for use inside stable handlers
  const revealRef = useRef(revealSet)
  revealRef.current = revealSet
  const userRef = useRef<{ lat: number | null; lng: number | null }>({ lat: userLat, lng: userLng })
  userRef.current = { lat: userLat, lng: userLng }
  const firstPaintCb = useRef(onFirstFramePaint)
  firstPaintCb.current = onFirstFramePaint

  useEffect(() => {
    if (!map) return
    const container = map.getContainer()

    const exploredAtRes = (res: number): Set<string> => {
      const cache = exploredCacheRef.current
      if (cache.key !== revealRef.current) {
        cache.key = revealRef.current
        cache.byRes = new Map()
      }
      let set = cache.byRes.get(res)
      if (!set) {
        set = new Set<string>()
        revealRef.current.forEach(fine => {
          try {
            set!.add(res >= 10 ? fine : h3.cellToParent(fine, res))
          } catch { /* skip invalid */ }
        })
        cache.byRes.set(res, set)
      }
      return set
    }

    // ── Build the fog bitmap for the current camera ───────────────────────
    const rebuild = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      if (w === 0 || h === 0) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      const zoom = map.getZoom()
      const center = map.getCenter()
      const res = getResForZoom(zoom)
      const explored = exploredAtRes(res)

      const cssW = w * (1 + MARGIN * 2)
      const cssH = h * (1 + MARGIN * 2)
      const mx = w * MARGIN
      const my = h * MARGIN

      // Cells covering the extended viewport
      const bounds = map.getBounds()
      if (!bounds) return
      const lngSpan = bounds.getEast() - bounds.getWest()
      const latSpan = bounds.getNorth() - bounds.getSouth()
      const west = bounds.getWest() - lngSpan * MARGIN
      const east = bounds.getEast() + lngSpan * MARGIN
      const south = Math.max(-85, bounds.getSouth() - latSpan * MARGIN)
      const north = Math.min(85, bounds.getNorth() + latSpan * MARGIN)

      let cells: string[] = []
      try {
        cells = h3.polygonToCells(
          [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
          res,
          true // GeoJSON [lng, lat] coords
        )
      } catch {
        return
      }
      if (cells.length === 0 || cells.length > MAX_CELLS) return

      const bitmap = document.createElement('canvas')
      bitmap.width = Math.round(cssW * dpr)
      bitmap.height = Math.round(cssH * dpr)
      const ctx = bitmap.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)
      ctx.lineJoin = 'round'

      const project = (lng: number, lat: number): [number, number] => {
        const p = map.project([lng, lat])
        return [p.x + mx, p.y + my]
      }

      const torchRadiusM = h3.getHexagonEdgeLengthAvg(res, h3.UNITS.m) * 6
      const user = userRef.current
      const hasUser = user.lat !== null && user.lng !== null

      const tracePath = (boundary: [number, number][]) => {
        ctx.beginPath()
        boundary.forEach(([lng, lat], i) => {
          const [x, y] = project(lng, lat)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.closePath()
      }

      // 1. Unexplored cells: warm dark patchwork fill + soft warm-charcoal outline
      const exploredInView: string[] = []
      cells.forEach(cell => {
        if (explored.has(cell)) {
          exploredInView.push(cell)
          return
        }

        let boundary: [number, number][]
        try {
          boundary = h3.cellToBoundary(cell, true)
        } catch {
          return
        }
        if (boundary.length === 0) return

        let lit = 0
        if (hasUser) {
          const [cLat, cLng] = h3.cellToLatLng(cell)
          const d = distanceMeters(user.lat as number, user.lng as number, cLat, cLng)
          lit = Math.max(0, 1 - d / torchRadiusM)
          lit = lit * lit
        }

        tracePath(boundary)
        ctx.fillStyle = warmCellColor(cell, lit)
        ctx.fill()
        ctx.strokeStyle = 'rgba(58, 42, 32, 0.45)' // #3A2A20 — soft, never sci-fi
        ctx.lineWidth = 1.25
        ctx.stroke()
      })

      // 2. Frontier: soft ember glow on edges between explored and unexplored only
      ctx.lineCap = 'round'
      exploredInView.forEach(cell => {
        let edges: string[]
        try {
          edges = h3.originToDirectedEdges(cell)
        } catch {
          return
        }
        edges.forEach(edge => {
          try {
            const dest = h3.getDirectedEdgeDestination(edge)
            if (explored.has(dest)) return // interior edge — never stroked
            const eb = h3.directedEdgeToBoundary(edge, true)
            if (eb.length < 2) return

            ctx.beginPath()
            eb.forEach(([lng, lat], i) => {
              const [x, y] = project(lng, lat)
              if (i === 0) ctx.moveTo(x, y)
              else ctx.lineTo(x, y)
            })

            // wide soft glow + thin foil-gold core (light, never neon)
            ctx.strokeStyle = 'rgba(238, 140, 70, 0.30)'
            ctx.lineWidth = 6
            ctx.stroke()
            ctx.strokeStyle = 'rgba(240, 180, 92, 0.55)'
            ctx.lineWidth = 1.4
            ctx.stroke()
          } catch { /* skip bad edge */ }
        })
      })

      // Swap in with crossfade
      previousRef.current = currentRef.current
      currentRef.current = {
        canvas: bitmap,
        centerLng: center.lng,
        centerLat: center.lat,
        zoom,
        cssWidth: cssW,
        cssHeight: cssH
      }
      fadeStartRef.current = performance.now()
      draw()
    }

    // ── Composite a cached bitmap to the visible canvas under the current camera ──
    const drawBitmap = (ctx: CanvasRenderingContext2D, fb: FogBitmap, alpha: number) => {
      const zoom = map.getZoom()
      const scale = Math.pow(2, zoom - fb.zoom)
      const p = map.project([fb.centerLng, fb.centerLat]) // where the bitmap's center sits now
      ctx.globalAlpha = alpha
      ctx.translate(p.x, p.y)
      ctx.scale(scale, scale)
      ctx.drawImage(fb.canvas, -fb.cssWidth / 2, -fb.cssHeight / 2, fb.cssWidth, fb.cssHeight)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
    }

    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const w = container.clientWidth
      const h = container.clientHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const cur = currentRef.current
      if (!cur) return

      const t = Math.min(1, (performance.now() - fadeStartRef.current) / CROSSFADE_MS)
      const prev = previousRef.current

      ctx.save()
      if (prev && t < 1) {
        drawBitmap(ctx, prev, 1)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        drawBitmap(ctx, cur, t)
      } else {
        drawBitmap(ctx, cur, 1)
        previousRef.current = null
      }
      ctx.restore()
      ctx.globalAlpha = 1

      if (prev && t < 1) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(draw)
      }

      if (!firstPaintRef.current) {
        firstPaintRef.current = true
        firstPaintCb.current?.()
      }
    }

    const handleMove = () => draw()       // gesture: transform only — no rebuild, no flash
    const handleMoveEnd = () => rebuild() // at rest: rebuild at the LOD for this zoom
    const handleResize = () => rebuild()

    map.on('move', handleMove)
    map.on('moveend', handleMoveEnd)
    map.on('resize', handleResize)

    rebuildRef.current = rebuild
    rebuild()

    return () => {
      map.off('move', handleMove)
      map.off('moveend', handleMoveEnd)
      map.off('resize', handleResize)
      rebuildRef.current = null
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  // Coverage changes (new cells revealed) → invalidate cache and repaint
  useEffect(() => {
    exploredCacheRef.current = { key: null, byRes: new Map() }
    rebuildRef.current?.()
  }, [revealSet])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1 }}
    />
  )
}
