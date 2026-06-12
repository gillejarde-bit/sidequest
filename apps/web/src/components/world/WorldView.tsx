// ─────────────────────────────────────────────────────────────────────────────
// WorldView — mounts the isometric world engine, feeds it GPS + OSM + quests,
// and renders the HUD: location, minimap, scale, stats, recent quests, toasts.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { WorldEngine, type DiscoverInfo, type QuestPin } from './WorldEngine'
import { fetchOsmChunk, geoToTile, tileKey, tileToGeo, TILE_METERS, type GeoOrigin, type WorldPoi } from './osm'
import { Minimap, type WorldQuestMarker } from './Minimap'
import { computeStats, formatArea, formatPct, reverseGeocode, type PlaceInfo } from './worldStats'
import { useGeolocation } from '../../hooks/useGeolocation'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import type { Database } from '../../types/database.types'

// Same fallback the flat map uses when no fix is available yet.
const FALLBACK: GeoOrigin = { lat: 36.1699, lng: -115.1398 }

type Source = 'loading' | 'osm' | 'fallback'

// Same RPC the flat map uses — quests come back with resolved location coords.
type QuestRow = Database['public']['Functions']['get_my_quests']['Returns'][number]

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

  const navigate = useNavigate()
  const gps = useGeolocation()
  const gpsRef = useRef(gps)
  gpsRef.current = gps

  const [resetKey, setResetKey] = useState(0)
  const [source, setSource] = useState<Source>('loading')
  const [toast, setToast] = useState<DiscoverInfo | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [tileCount, setTileCount] = useState(0)
  const [showHint, setShowHint] = useState(true)
  const [playerTile, setPlayerTile] = useState({ wx: 0, wz: 0 })
  const [place, setPlace] = useState<PlaceInfo | null>(null)
  const [statsOpen, setStatsOpen] = useState(false)

  // ── Recent quests (top 5 list + flags on the board) ───────────────────────
  const { data: recentQuests = [] } = useQuery({
    queryKey: ['world-recent-quests'],
    queryFn: async (): Promise<QuestRow[]> => {
      const { data, error } = await supabase.rpc('get_my_quests', { filter_status: undefined })
      if (error || !data) return []
      return [...data]
        .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
        .slice(0, 15)
    },
    staleTime: 60_000,
  })

  // Bind quests with coordinates onto board tiles
  useEffect(() => {
    const engine = engineRef.current
    const origin = originRef.current
    if (!engine || !origin) return
    const pins = new Map<string, QuestPin>()
    for (const q of recentQuests) {
      if (!Number.isFinite(q.location_lat) || !Number.isFinite(q.location_lng)) continue
      const { wx, wz } = geoToTile(origin, q.location_lat, q.location_lng)
      pins.set(tileKey(wx, wz), { id: q.id, name: q.name })
    }
    engine.setQuests(pins)
  }, [recentQuests, resetKey, source])

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
      onQuestTap: (questId) => {
        if (!cancelled) navigate({ to: '/quest/$id', params: { id: questId } })
      },
      onStep: (wx, wz, discovered) => {
        if (cancelled) return
        setTileCount(discovered)
        setPlayerTile({ wx, wz })
        const origin = originRef.current
        // Walked far from the last fetch center → next OSM chunk + new place name
        const last = lastFetchTile.current
        if (origin && Math.abs(wx - last.wx) + Math.abs(wz - last.wz) > 7) {
          lastFetchTile.current = { wx, wz }
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
          reverseGeocode(c.lat, c.lng).then((p) => { if (!cancelled) setPlace(p) }).catch(() => undefined)
        }
        // Keep walking toward the live GPS position if it's still ahead.
        const g = gpsRef.current
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
    setPlayerTile(engine.getPlayerTile())

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

    reverseGeocode(origin.lat, origin.lng).then((p) => { if (!cancelled) setPlace(p) }).catch(() => undefined)

    const hintTimer = setTimeout(() => setShowHint(false), 8000)

    return () => {
      cancelled = true
      clearTimeout(hintTimer)
      if (toastTimer.current) clearTimeout(toastTimer.current)
      ro.disconnect()
      engine.dispose()
      engineRef.current = null
    }
  }, [resetKey, navigate])

  // ── Live GPS → board steps (walking IS the movement) ──────────────────────
  useEffect(() => {
    if (gps.lat == null || gps.lng == null) return
    const origin = originRef.current
    const engine = engineRef.current
    if (!origin || !engine) return
    const here = { lat: gps.lat, lng: gps.lng }
    if (metersBetween(origin, here) > 5000) {
      setSource('loading')
      setResetKey((k) => k + 1)
      return
    }
    const t = geoToTile(origin, gps.lat, gps.lng)
    engine.stepToward(t.wx, t.wz)
  }, [gps.lat, gps.lng])

  // ── Keyboard movement (desktop testing) ────────────────────────────────────
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

  // ── Minimap + off-board quest indicator data ───────────────────────────────
  const questMarkers = useMemo<WorldQuestMarker[]>(
    () =>
      recentQuests
        .filter((q) => Number.isFinite(q.location_lat) && Number.isFinite(q.location_lng))
        .map((q) => ({ id: q.id, name: q.name, lat: q.location_lat, lng: q.location_lng })),
    [recentQuests],
  )

  const origin = originRef.current
  const playerGeo = origin
    ? tileToGeo(origin, playerTile.wx, playerTile.wz)
    : { lat: gps.lat ?? FALLBACK.lat, lng: gps.lng ?? FALLBACK.lng }

  interface OffBoardQuest {
    id: string
    name: string
    wx: number
    wz: number
    angle: number // screen-space angle in the iso projection
    meters: number
  }

  const offBoard = useMemo<OffBoardQuest[]>(() => {
    const o = originRef.current
    if (!o) return []
    const out: OffBoardQuest[] = []
    for (const q of questMarkers) {
      const t = geoToTile(o, q.lat, q.lng)
      const dx = t.wx - playerTile.wx
      const dz = t.wz - playerTile.wz
      // Inside the visible 8x8 window? The board itself shows the flag.
      if (dx >= -3 && dx <= 4 && dz >= -3 && dz <= 4) continue
      const meters = Math.hypot(dx, dz) * TILE_METERS
      // Iso projection: screen-x ∝ (dx − dz), screen-y ∝ (dx + dz)
      const angle = Math.atan2((dx + dz) * 0.5, (dx - dz) * 0.866)
      out.push({ id: q.id, name: q.name, wx: t.wx, wz: t.wz, angle, meters })
    }
    return out.sort((a, b) => a.meters - b.meters).slice(0, 4)
  }, [questMarkers, playerTile])

  const formatDistance = (m: number) =>
    m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1)} km`

  const stats = computeStats(tileCount, place?.state ?? null)
  const locationLabel = place
    ? [place.area, place.city].filter(Boolean).join(' · ') || place.state || null
    : null

  return (
    <div ref={holderRef} className="relative h-full w-full overflow-hidden touch-none select-none">
      {/* ── Warm fire backdrop (behind the transparent canvas) ── */}
      <div className="pointer-events-none absolute inset-0" style={{ background: '#16100B' }} />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(85% 60% at 50% 100%, rgba(242,116,30,0.22) 0%, rgba(216,90,48,0.10) 38%, transparent 70%),' +
            'radial-gradient(60% 45% at 18% 8%, rgba(246,166,35,0.07) 0%, transparent 60%),' +
            'radial-gradient(70% 55% at 85% 20%, rgba(226,101,91,0.05) 0%, transparent 60%)',
        }}
      />
      <div className="pointer-events-none absolute -bottom-24 left-1/2 h-72 w-[130%] -translate-x-1/2 rounded-[50%] bg-[var(--sq-ember-500)]/14 blur-3xl animate-pulse" style={{ animationDuration: '5s' }} />
      <div className="pointer-events-none absolute -bottom-10 left-[12%] h-40 w-56 rounded-full bg-[var(--sq-gold)]/10 blur-3xl animate-pulse" style={{ animationDuration: '7s' }} />

      <canvas
        ref={canvasRef}
        className="relative block h-full w-full"
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
        style={{ background: 'radial-gradient(ellipse at 50% 42%, transparent 55%, rgba(20,12,8,0.5) 100%)' }}
      />

      {/* ── Top-center: where you are ── */}
      <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2">
        <AnimatePresence mode="wait">
          {locationLabel && !toast && (
            <motion.div
              key={locationLabel}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2 rounded-[var(--sq-r-pill)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-surface)]/90 px-4 py-2 shadow-[var(--sq-shadow-soft)] backdrop-blur-sm"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--sq-ember-500)] animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--sq-text)] whitespace-nowrap">
                {locationLabel}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Top-left: title, source, exploration chip, recent quests ── */}
      <div className="absolute left-4 top-4 z-20 flex w-[190px] flex-col items-start gap-2">
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
          <button
            onClick={() => setStatsOpen(true)}
            className="cursor-pointer rounded-[var(--sq-r-pill)] border border-[var(--sq-gold)]/30 bg-[var(--sq-bg)]/85 px-2.5 py-1.5 text-left backdrop-blur-sm transition-transform hover:scale-[1.03] active:scale-95"
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--sq-gold-soft)]">
              ⬡ {tileCount} tiles uncovered
            </span>
            <span className="block text-[8px] font-bold uppercase tracking-wider text-[var(--sq-text-faint)]">
              ≈ {formatArea(stats)} · tap for stats
            </span>
          </button>
        )}

        {recentQuests.length > 0 && (
          <div className="w-full rounded-[var(--sq-r-md)] border border-[var(--sq-hairline)] bg-[var(--sq-bg)]/80 p-2 backdrop-blur-sm">
            <div className="mb-1 px-1 text-[8px] font-black uppercase tracking-[0.16em] text-[var(--sq-ember-400)]">
              Recent quests
            </div>
            {recentQuests.slice(0, 5).map((q) => (
              <button
                key={q.id}
                onClick={() => navigate({ to: '/quest/$id', params: { id: q.id } })}
                className="flex w-full cursor-pointer items-center gap-1.5 rounded-[var(--sq-r-sm)] px-1 py-1 text-left transition-colors hover:bg-[var(--sq-surface)]"
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${Number.isFinite(q.location_lat) ? 'bg-[var(--sq-gold)]' : 'bg-[var(--sq-text-faint)]'}`} />
                <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-[var(--sq-text)]">{q.name}</span>
                <span className="shrink-0 text-[8px] font-medium text-[var(--sq-text-faint)]">{format(new Date(q.starts_at), 'dd MMM')}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Off-board quest direction indicators ── */}
      <AnimatePresence>
        {offBoard.map((q) => {
          const xPct = Math.min(86, Math.max(14, 50 + Math.cos(q.angle) * 41))
          const yPct = Math.min(72, Math.max(18, 46 + Math.sin(q.angle) * 33))
          return (
            <motion.button
              key={q.id}
              initial={{ opacity: 0, scale: 0.8, left: `${xPct}%`, top: `${yPct}%` }}
              animate={{ opacity: 1, scale: 1, left: `${xPct}%`, top: `${yPct}%` }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 230, damping: 24 }}
              onClick={() => engineRef.current?.stepToward(q.wx, q.wz)}
              className="pointer-events-auto absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{ left: `${xPct}%`, top: `${yPct}%` }}
              title={`Walk toward ${q.name}`}
            >
              <div className="flex items-center gap-1.5 rounded-[var(--sq-r-pill)] border border-[var(--sq-gold)]/40 bg-[var(--sq-bg)]/88 py-1 pl-1.5 pr-2 shadow-[0_0_12px_rgba(246,166,35,0.25)] backdrop-blur-sm transition-transform hover:scale-105 active:scale-95">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--sq-gold)] text-[10px] text-[var(--sq-ink)]">⚑</span>
                <span className="max-w-[110px] truncate text-left text-[10px] font-bold leading-tight text-[var(--sq-text)]">
                  {q.name}
                  <span className="block text-[8px] font-black uppercase tracking-wider text-[var(--sq-gold-soft)]">{formatDistance(q.meters)}</span>
                </span>
                <span
                  className="shrink-0 text-[11px] text-[var(--sq-ember-400)]"
                  style={{ transform: `rotate(${q.angle}rad)` }}
                >
                  ➤
                </span>
              </div>
            </motion.button>
          )
        })}
      </AnimatePresence>

      {/* ── Top-right: minimap (real Mapbox, expandable) ── */}
      <Minimap
        playerGeo={playerGeo}
        quests={questMarkers}
        onQuestClick={(id) => navigate({ to: '/quest/$id', params: { id } })}
      />

      {/* ── Bottom-left: scale legend ── */}
      <div className="pointer-events-none absolute bottom-28 left-4 z-20 flex flex-col gap-1 rounded-[var(--sq-r-md)] border border-[var(--sq-hairline)] bg-[var(--sq-bg)]/80 px-3 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rotate-45 rounded-[2px] border border-[var(--sq-gold)]/60 bg-[var(--sq-gold)]/20" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--sq-text-muted)]">1 tile ≈ {TILE_METERS} m</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-[3px] w-10 rounded-full bg-gradient-to-r from-[var(--sq-ember-500)] to-transparent" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--sq-text-faint)]">board ≈ {8 * TILE_METERS} m across</span>
        </div>
      </div>

      {/* ── Discovery toast ── */}
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

      {/* ── Hover label ── */}
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

      {/* ── First-run hint ── */}
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
              Walk to explore — or tap the fog to wander
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Exploration stats modal ── */}
      <AnimatePresence>
        {statsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6"
            onClick={() => setStatsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 14, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-[var(--sq-r-xl)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-card)] p-5 shadow-[var(--sq-shadow-soft)]"
            >
              <div className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--sq-ember-400)]">Wanderer's ledger</div>
              <h3 className="mb-4 text-lg font-black text-[var(--sq-text)]">Your explored world</h3>

              <div className="mb-4 grid grid-cols-2 gap-2">
                <StatCard big={String(stats.tiles)} label="tiles uncovered" />
                <StatCard big={formatArea(stats)} label={`${stats.areaKm2 >= 0.01 ? `${stats.areaKm2.toFixed(2)} km² · ` : ''}real ground`} />
                <StatCard big={stats.footballFields >= 1 ? stats.footballFields.toFixed(1) : stats.footballFields.toFixed(2)} label="football fields" />
                <StatCard big={stats.cityBlocks >= 1 ? stats.cityBlocks.toFixed(1) : stats.cityBlocks.toFixed(2)} label="city blocks" />
              </div>

              {stats.statePct != null && stats.stateName && (
                <div className="mb-4 rounded-[var(--sq-r-md)] border border-[var(--sq-gold)]/25 bg-[var(--sq-gold)]/8 px-3.5 py-3">
                  <div className="text-[10px] font-black uppercase tracking-wider text-[var(--sq-gold-soft)]">
                    {stats.stateName} explored
                  </div>
                  <div className="mt-0.5 text-sm font-bold text-[var(--sq-text)]">
                    {formatPct(stats.statePct)}
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--sq-bg)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--sq-ember-500)] to-[var(--sq-gold)]"
                      style={{ width: `${Math.max(1.5, Math.min(100, stats.statePct * 1000))}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-[9px] font-medium leading-relaxed text-[var(--sq-text-muted)]">
                    Every tile is ~{TILE_METERS} m of real {stats.stateName}. Keep walking — the fog remembers.
                  </div>
                </div>
              )}

              <button
                onClick={() => setStatsOpen(false)}
                className="w-full cursor-pointer rounded-[var(--sq-r-pill)] border border-[var(--sq-keyline)]/30 bg-[var(--sq-ember-500)] py-2.5 text-[11px] font-black uppercase tracking-wider text-[var(--sq-ink)] transition-transform hover:scale-[1.02] active:scale-95"
              >
                Back to wandering
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatCard({ big, label }: { big: string; label: string }) {
  return (
    <div className="rounded-[var(--sq-r-md)] border border-[var(--sq-hairline)] bg-[var(--sq-surface)] px-3 py-2.5">
      <div className="text-base font-black text-[var(--sq-text)]">{big}</div>
      <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--sq-text-muted)]">{label}</div>
    </div>
  )
}
