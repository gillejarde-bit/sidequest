// ─────────────────────────────────────────────────────────────────────────────
// WorldView — mounts the isometric world engine, feeds it GPS + OSM data,
// and renders the HUD (discovery toasts, hover labels, source badge).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WorldEngine, type DiscoverInfo } from './WorldEngine'
import { fetchOsmChunk, geoToTile, tileToGeo, type GeoOrigin, type WorldPoi } from './osm'
import { useGeolocation } from '../../hooks/useGeolocation'

// Same fallback the flat map uses when no fix is available yet.
const FALLBACK: GeoOrigin = { lat: 36.1699, lng: -115.1398 }

type Source = 'loading' | 'osm' | 'fallback'

function metersBetween(a: GeoOrigin, b: GeoOrigin): number {
  const dy = (a.lat - b.lat) * 110_540
  const dx = (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180)
  return Math.hypot(dx, dy)
}

export default function WorldView() {
  const holderRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<WorldEngine | null>(null)
  const originRef = useRef<GeoOrigin | null>(null)
  const poisRef = useRef<Map<string, WorldPoi>>(new Map())
  const lastFetchTile = useRef({ wx: 0, wz: 0 })
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const gps = useGeolocation()
  const gpsRef = useRef(gps)
  gpsRef.current = gps

  const [resetKey, setResetKey] = useState(0)
  const [source, setSource] = useState<Source>('loading')
  const [toast, setToast] = useState<DiscoverInfo | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [tileCount, setTileCount] = useState(0)
  const [showHint, setShowHint] = useState(true)

  // ── Engine lifecycle ───────────────────────────────────────────────────────
  useEffect(() => {
    const holder = holderRef.current
    const canvas = canvasRef.current
    if (!holder || !canvas) return

    let cancelled = false

    const engine = new WorldEngine(canvas, {
      onDiscover: (info) => {
        if (cancelled) return
        setToast(info)
        if (toastTimer.current) clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToast(null), 3200)
      },
      onHover: (label) => {
        if (!cancelled) setHover(label)
      },
      onStep: (wx, wz, discovered) => {
        if (cancelled) return
        setTileCount(discovered)
        // Walked far from the last fetch center → pull the next OSM chunk.
        const last = lastFetchTile.current
        if (Math.abs(wx - last.wx) + Math.abs(wz - last.wz) > 7) {
          lastFetchTile.current = { wx, wz }
          const origin = originRef.current
          if (!origin) return
          const c = tileToGeo(origin, wx, wz)
          fetchOsmChunk(origin, c.lat, c.lng)
            .then((chunk) => {
              if (cancelled) return
              for (const [k, v] of chunk.pois) {
                if (!poisRef.current.has(k)) poisRef.current.set(k, v)
              }
              engine.setPois(poisRef.current, poisRef.current.size < 12)
            })
            .catch(() => undefined)
        }
        // Keep walking toward the live GPS position if it's still ahead.
        const g = gpsRef.current
        const origin = originRef.current
        if (g.lat != null && g.lng != null && origin) {
          const t = geoToTile(origin, g.lat, g.lng)
          if (t.wx !== wx || t.wz !== wz) engine.stepToward(t.wx, t.wz)
        }
      },
    })
    engineRef.current = engine

    const g = gpsRef.current
    const origin = engine.initOrigin(g.lat ?? FALLBACK.lat, g.lng ?? FALLBACK.lng)
    originRef.current = origin
    lastFetchTile.current = { wx: 0, wz: 0 }

    engine.start(holder.clientWidth, holder.clientHeight)

    const ro = new ResizeObserver(() => {
      engine.resize(holder.clientWidth, holder.clientHeight)
    })
    ro.observe(holder)

    fetchOsmChunk(origin, origin.lat, origin.lng)
      .then((chunk) => {
        if (cancelled) return
        poisRef.current = new Map(chunk.pois)
        engine.setPois(poisRef.current, chunk.count < 12)
        setSource('osm')
      })
      .catch(() => {
        if (!cancelled) setSource('fallback')
      })

    const hintTimer = setTimeout(() => setShowHint(false), 8000)

    return () => {
      cancelled = true
      clearTimeout(hintTimer)
      if (toastTimer.current) clearTimeout(toastTimer.current)
      ro.disconnect()
      engine.dispose()
      engineRef.current = null
    }
  }, [resetKey])

  // ── Live GPS → board steps (walking moves the world) ──────────────────────
  useEffect(() => {
    if (gps.lat == null || gps.lng == null) return
    const origin = originRef.current
    const engine = engineRef.current
    if (!origin || !engine) return
    const here = { lat: gps.lat, lng: gps.lng }
    if (metersBetween(origin, here) > 5000) {
      // Player is in a different part of the world — rebuild around them.
      setSource('loading')
      setResetKey((k) => k + 1)
      return
    }
    const t = geoToTile(origin, gps.lat, gps.lng)
    engine.stepToward(t.wx, t.wz)
  }, [gps.lat, gps.lng])

  // ── Keyboard movement ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      const engine = engineRef.current
      if (!engine) return
      const k = e.key.toLowerCase()
      if (k === 'arrowup' || k === 'w') engine.move(0, -1)
      else if (k === 'arrowdown' || k === 's') engine.move(0, 1)
      else if (k === 'arrowleft' || k === 'a') engine.move(-1, 0)
      else if (k === 'arrowright' || k === 'd') engine.move(1, 0)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Pointer → NDC ──────────────────────────────────────────────────────────
  const downPos = useRef<{ x: number; y: number; t: number } | null>(null)

  const toNdc = (e: ReactPointerEvent) => {
    const rect = holderRef.current?.getBoundingClientRect()
    if (!rect) return null
    return {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
    }
  }

  return (
    <div ref={holderRef} className="relative h-full w-full overflow-hidden bg-[var(--sq-bg)] touch-none select-none">
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        onPointerMove={(e) => {
          const ndc = toNdc(e)
          if (ndc) engineRef.current?.hoverAt(ndc.x, ndc.y)
        }}
        onPointerDown={(e) => {
          downPos.current = { x: e.clientX, y: e.clientY, t: performance.now() }
        }}
        onPointerUp={(e) => {
          const d = downPos.current
          downPos.current = null
          if (!d) return
          const dist = Math.hypot(e.clientX - d.x, e.clientY - d.y)
          if (dist > 10 || performance.now() - d.t > 500) return
          const ndc = toNdc(e)
          if (ndc) engineRef.current?.tapAt(ndc.x, ndc.y)
        }}
      />

      {/* Soft vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 42%, transparent 52%, rgba(20,12,8,0.55) 100%)' }}
      />

      {/* Top-left: title + data source */}
      <div className="absolute left-4 top-4 z-20 flex flex-col gap-2 items-start">
        <div className="flex items-center gap-2 rounded-[var(--sq-r-pill)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-surface)]/90 px-3.5 py-2 shadow-[var(--sq-shadow-soft)] backdrop-blur-sm">
          <span className="text-sm">⬡</span>
          <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--sq-text)]">World</span>
          <span className="rounded-full bg-[var(--sq-ember-500)]/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[var(--sq-ember-400)]">beta</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-[var(--sq-r-pill)] border border-[var(--sq-hairline)] bg-[var(--sq-bg)]/80 px-2.5 py-1 backdrop-blur-sm">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              source === 'osm' ? 'bg-[var(--sq-success)]' : source === 'loading' ? 'bg-[var(--sq-warning)] animate-pulse' : 'bg-[var(--sq-text-faint)]'
            }`}
          />
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--sq-text-muted)]">
            {source === 'osm' ? 'Live world data' : source === 'loading' ? 'Charting the area…' : 'Wander mode'}
          </span>
        </div>
        {tileCount > 0 && (
          <div className="rounded-[var(--sq-r-pill)] border border-[var(--sq-hairline)] bg-[var(--sq-bg)]/80 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--sq-text-faint)] backdrop-blur-sm">
            {tileCount} tiles uncovered
          </div>
        )}
      </div>

      {/* Discovery toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={`${toast.template}-${toast.name ?? ''}`}
            initial={{ opacity: 0, y: -24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="absolute left-1/2 top-5 z-30 -translate-x-1/2"
          >
            <div className="flex items-center gap-3 rounded-[var(--sq-r-lg)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-card)]/95 px-4 py-3 shadow-[var(--sq-shadow-soft)] backdrop-blur-md">
              <div
                className="h-9 w-9 shrink-0 rounded-[var(--sq-r-sm)] border border-[var(--sq-keyline)]/20"
                style={{ background: toast.color, boxShadow: `0 0 14px ${toast.color}66` }}
              />
              <div className="min-w-0">
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-[var(--sq-ember-400)]">
                  {toast.isNew ? 'Discovered' : 'You know this place'}
                </div>
                <div className="truncate text-sm font-bold text-[var(--sq-text)]">
                  {toast.name || toast.title}
                </div>
                <div className="text-[10px] text-[var(--sq-text-muted)]">
                  {toast.name ? `${toast.title} · ${toast.subtitle}` : toast.subtitle}
                </div>
              </div>
              {toast.isNew && (
                <div className="ml-1 shrink-0 rounded-full bg-[var(--sq-gold)]/15 px-2 py-1 text-[10px] font-black text-[var(--sq-gold-soft)]">
                  +{toast.xp} XP
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover label */}
      <AnimatePresence>
        {hover && !toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="pointer-events-none absolute bottom-36 left-1/2 z-20 -translate-x-1/2"
          >
            <div className="rounded-[var(--sq-r-pill)] border border-[var(--sq-hairline)] bg-[var(--sq-bg)]/85 px-3.5 py-1.5 text-[11px] font-semibold text-[var(--sq-text)] backdrop-blur-sm whitespace-nowrap">
              {hover}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* First-run hint */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1.2 }}
            className="pointer-events-none absolute bottom-28 left-1/2 z-20 -translate-x-1/2"
          >
            <div className="rounded-[var(--sq-r-pill)] border border-[var(--sq-ember-500)]/30 bg-[var(--sq-surface)]/90 px-4 py-2 text-[11px] font-medium text-[var(--sq-text-muted)] backdrop-blur-sm whitespace-nowrap shadow-[var(--sq-shadow-glow)]">
              Tap the fog to wander <span className="mx-1 text-[var(--sq-text-faint)]">·</span> WASD works too
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
