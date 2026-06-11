import { useEffect, useRef } from 'react'
import * as h3 from 'h3-js'
import type { Map as MapboxMap } from 'mapbox-gl'

/**
 * FogHexCanvas — the artistic hex fog-of-war, per the fog-v2 art direction.
 *
 * GAME-MAP TRUTH RULE: the revealed region is fixed geography. It is ALWAYS
 * the exact union of the fine explored cells (res 10), at every zoom level.
 * Zooming out shows your revealed blob getting smaller inside a sea of fog —
 * never more map than you have unlocked. Only the decorative fog patchwork
 * merges to coarser hexes as you zoom out.
 *
 * Render model (this is what makes zooming seamless):
 *  - Fog paints ONCE per camera rest onto an offscreen bitmap extending ~35%
 *    beyond the viewport: coarse warm hex patchwork over EVERYTHING, then the
 *    exact revealed polygon is erased out of it, then the frontier glow is
 *    stroked along the true revealed boundary.
 *  - During a gesture the cached bitmap is only TRANSFORMED (translate+scale),
 *    and the screen outside the bitmap is filled with the base fog tone, so
 *    no zoom speed can ever expose the unexplored map.
 *  - If the zoom drifts far from the cached bitmap mid-gesture, a throttled
 *    rebuild refreshes it; at rest the rebuild crossfades in over ~150ms so
 *    fog hexes visibly merge into bigger hexes.
 */

interface FogHexCanvasProps {
  map: MapboxMap
  revealSet: Set<string>
  userLat: number | null
  userLng: number | null
  onFirstFramePaint?: () => void
}

// LOD table from the fog-v2 spec — fog hexes stay a comfortable on-screen size
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
const FOG_BASE = '#1A110B' // underlay + out-of-bitmap cover tone
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

const MARGIN = 0.35            // bitmap margin beyond the viewport (each side)
const CROSSFADE_MS = 150       // LOD rebuild crossfade
const MAX_CELLS = 8000         // defensive cap for the patchwork pass
const DRIFT_REBUILD_ZOOM = 1.0 // rebuild mid-gesture when zoom drifts this far
const DRIFT_REBUILD_MS = 180   // ...at most this often

interface FogBitmap {
  canvas: HTMLCanvasElement
  centerLng: number
  centerLat: number
  zoom: number
  res: number
  cssWidth: number
  cssHeight: number
}

export function FogHexCanvas({ map, revealSet, userLat, userLng, onFirstFramePaint }: FogHexCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const currentRef = useRef<FogBitmap | null>(null)
  const previousRef = useRef<FogBitmap | null>(null)
  const fadeStartRef = useRef<number>(0)
  const rafRef = useRef<number | null>(null)
  const firstPaintRef = useRef(false)
  const lastRebuildRef = useRef(0)
  const rebuildRef = useRef<(() => void) | null>(null)

  // The revealed geometry cache: exact multipolygon of the FINE explored cells.
  // This is the single source of truth for what is visible, at every zoom.
  const revealedPolysRef = useRef<{ key: Set<string> | null; polys: number[][][][] }>({ key: null, polys: [] })

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

    const revealedPolys = (): number[][][][] => {
      const cache = revealedPolysRef.current
      if (cache.key !== revealRef.current) {
        cache.key = revealRef.current
        try {
          cache.polys = h3.cellsToMultiPolygon(Array.from(revealRef.current), true)
        } catch {
          cache.polys = []
        }
      }
      return cache.polys
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

      const cssW = w * (1 + MARGIN * 2)
      const cssH = h * (1 + MARGIN * 2)
      const mx = w * MARGIN
      const my = h * MARGIN

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
          true
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

      // 0. Base fog wash — guarantees zero gaps between hex fills
      ctx.fillStyle = FOG_BASE
      ctx.fillRect(0, 0, cssW, cssH)

      // 1. Warm hex patchwork over EVERYTHING (fog covers the world; the
      //    revealed hole is carved out afterwards from the FINE cells)
      cells.forEach(cell => {
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

        ctx.beginPath()
        boundary.forEach(([lng, lat], i) => {
          const [x, y] = project(lng, lat)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.closePath()
        ctx.fillStyle = warmCellColor(cell, lit)
        ctx.fill()
        ctx.strokeStyle = 'rgba(58, 42, 32, 0.45)' // soft warm charcoal, never sci-fi
        ctx.lineWidth = 1.25
        ctx.stroke()
      })

      // 2. Carve the EXACT revealed region out of the fog (fine cells only —
      //    the unlocked area never grows with zoom)
      const polys = revealedPolys()
      if (polys.length > 0) {
        const traceReveal = () => {
          ctx.beginPath()
          polys.forEach(polygon => {
            polygon.forEach(ring => {
              ring.forEach(([lng, lat], i) => {
                const [x, y] = project(lng, lat)
                if (i === 0) ctx.moveTo(x, y)
                else ctx.lineTo(x, y)
              })
              ctx.closePath()
            })
          })
        }

        ctx.save()
        ctx.globalCompositeOperation = 'destination-out'
        traceReveal()
        ctx.fill()
        ctx.restore()

        // 3. Frontier glow along the true revealed boundary — soft ember halo
        //    + thin foil-gold core. Light, never neon.
        ctx.save()
        ctx.lineCap = 'round'
        traceReveal()
        ctx.strokeStyle = 'rgba(238, 140, 70, 0.30)'
        ctx.lineWidth = 6
        ctx.stroke()
        traceReveal()
        ctx.strokeStyle = 'rgba(240, 180, 92, 0.55)'
        ctx.lineWidth = 1.4
        ctx.stroke()
        ctx.restore()
      }

      const prevBitmap = currentRef.current
      previousRef.current = prevBitmap
      currentRef.current = {
        canvas: bitmap,
        centerLng: center.lng,
        centerLat: center.lat,
        zoom,
        res,
        cssWidth: cssW,
        cssHeight: cssH
      }
      // Crossfade ONLY when the hex resolution changes (the merge moment).
      // Same-res rebuilds (reveal updates, drift refreshes) swap instantly —
      // repeated fades read as flicker.
      fadeStartRef.current = prevBitmap && prevBitmap.res !== res ? performance.now() : 0
      lastRebuildRef.current = performance.now()
      draw()
    }

    // Destination rect (CSS px) of a cached bitmap under the current camera
    const destRect = (fb: FogBitmap) => {
      const scale = Math.pow(2, map.getZoom() - fb.zoom)
      const p = map.project([fb.centerLng, fb.centerLat])
      const dw = fb.cssWidth * scale
      const dh = fb.cssHeight * scale
      return { x: p.x - dw / 2, y: p.y - dh / 2, w: dw, h: dh }
    }

    const drawBitmap = (ctx: CanvasRenderingContext2D, fb: FogBitmap, alpha: number) => {
      const r = destRect(fb)
      ctx.globalAlpha = alpha
      ctx.drawImage(fb.canvas, r.x, r.y, r.w, r.h)
      ctx.globalAlpha = 1
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
      if (!cur) {
        // Nothing built yet: full fog so the map never flashes uncovered
        ctx.fillStyle = FOG_BASE
        ctx.fillRect(0, 0, w, h)
        return
      }

      const t = Math.min(1, (performance.now() - fadeStartRef.current) / CROSSFADE_MS)
      const prev = previousRef.current

      if (prev && t < 1) {
        drawBitmap(ctx, prev, 1)
        drawBitmap(ctx, cur, t)
      } else {
        drawBitmap(ctx, cur, 1)
        previousRef.current = null
      }

      // Seal any screen area the bitmap doesn't cover (very fast zoom-out):
      // flat base-fog strips — the map can NEVER show through at the edges.
      const r = destRect(cur)
      ctx.fillStyle = FOG_BASE
      if (r.x > 0) ctx.fillRect(0, 0, r.x, h)
      if (r.y > 0) ctx.fillRect(0, 0, w, r.y)
      if (r.x + r.w < w) ctx.fillRect(r.x + r.w, 0, w - (r.x + r.w), h)
      if (r.y + r.h < h) ctx.fillRect(0, r.y + r.h, w, h - (r.y + r.h))

      // Mid-gesture LOD refresh: if the camera has drifted far from the cached
      // bitmap, rebuild (throttled) so long zooms stay detailed and covered.
      const drift = Math.abs(map.getZoom() - cur.zoom)
      if (drift > DRIFT_REBUILD_ZOOM && performance.now() - lastRebuildRef.current > DRIFT_REBUILD_MS) {
        rebuild()
        return
      }

      if (prev && t < 1) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(draw)
      }

      if (!firstPaintRef.current) {
        firstPaintRef.current = true
        firstPaintCb.current?.()
      }
    }

    const handleMove = () => draw()       // gesture: transform only — no flash
    const handleMoveEnd = () => rebuild() // at rest: rebuild at this zoom's LOD
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

  // Coverage changes (new cells revealed) → invalidate caches and repaint
  useEffect(() => {
    revealedPolysRef.current = { key: null, polys: [] }
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
