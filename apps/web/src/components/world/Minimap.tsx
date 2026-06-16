// Minimap — a real Mapbox map (streets, labels, places) wearing the campfire
// theme. Mini mode is a locked top-down mirror of the player; expanded mode is
// an interactive, clamped panel that never covers the bottom nav.

import { useRef, useState } from 'react'
import Map, { Marker, Source, Layer, type MapRef } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { motion, AnimatePresence } from 'framer-motion'
import cozyStyle from '../map/fog/sidequest-cozy-style.json'

export interface WorldQuestMarker {
  id: string
  name: string
  lat: number
  lng: number
}

export interface FogShapes {
  fill: GeoJSON.Feature // world box with explored area carved out as holes
  line: GeoJSON.Feature // explored boundary, for the frontier glow
}

interface MinimapProps {
  playerGeo: { lat: number; lng: number }
  quests: WorldQuestMarker[]
  fog?: FogShapes | null
  onQuestClick: (questId: string) => void
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

// Warm desaturated grade over Mapbox so it sits inside the game world.
const COZY_FILTER = 'saturate(0.78) sepia(0.18) brightness(0.92) contrast(1.02)'

// Native GL fog-of-war: a warm dark veil over the whole world with the explored
// area cut out, plus a soft ember glow tracing the frontier. `prefix` keeps the
// source/layer ids unique between the mini and expanded map instances.
function FogLayers({ fog, prefix }: { fog?: FogShapes | null; prefix: string }) {
  if (!fog) return null
  return (
    <>
      <Source id={`${prefix}-fog-fill`} type="geojson" data={fog.fill}>
        <Layer id={`${prefix}-fog-fill-l`} type="fill" paint={{ 'fill-color': '#140D09', 'fill-opacity': 0.86 }} />
      </Source>
      <Source id={`${prefix}-fog-line`} type="geojson" data={fog.line}>
        <Layer id={`${prefix}-fog-glow`} type="line" paint={{ 'line-color': 'rgba(238,140,70,0.5)', 'line-width': 5, 'line-blur': 6 }} />
        <Layer id={`${prefix}-fog-edge`} type="line" paint={{ 'line-color': 'rgba(240,180,92,0.7)', 'line-width': 1.4 }} />
      </Source>
    </>
  )
}

function PlayerDot({ size = 16 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <span className="absolute inset-0 animate-ping rounded-full bg-[var(--sq-ember-500)]/50" />
      <span
        className="absolute inset-0 rounded-full border-2 border-[var(--sq-keyline)] bg-[var(--sq-ember-500)]"
        style={{ boxShadow: '0 0 10px rgba(242,116,30,0.8)' }}
      />
    </div>
  )
}

function QuestPin({ name, big, onClick }: { name: string; big?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      className={`group flex flex-col items-center ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      title={name}
    >
      <span
        className={`flex items-center justify-center rounded-full border border-[var(--sq-ink)] bg-[var(--sq-gold)] text-[var(--sq-ink)] shadow-[0_0_8px_rgba(246,166,35,0.7)] ${
          big ? 'h-6 w-6 text-[13px]' : 'h-4 w-4 text-[9px]'
        }`}
      >
        ⚑
      </span>
      {big && (
        <span className="mt-0.5 max-w-[120px] truncate rounded-full bg-[var(--sq-bg)]/90 px-2 py-0.5 text-[9px] font-bold text-[var(--sq-text)] opacity-0 transition-opacity group-hover:opacity-100">
          {name}
        </span>
      )}
    </button>
  )
}

export function Minimap({ playerGeo, quests, fog, onQuestClick }: MinimapProps) {
  const [expanded, setExpanded] = useState(false)
  const bigMapRef = useRef<MapRef>(null)

  return (
    <>
      {/* ── Mini map (top-right): locked, mirrors the player from above ── */}
      <div className="absolute right-4 top-4 z-20 pointer-events-auto">
        <div className="relative h-[148px] w-[148px] overflow-hidden rounded-[var(--sq-r-lg)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-bg)] shadow-[var(--sq-shadow-soft)]">
          <div className="absolute inset-0" style={{ filter: COZY_FILTER }}>
            <Map
              longitude={playerGeo.lng}
              latitude={playerGeo.lat}
              zoom={15.2}
              mapStyle={cozyStyle as any}
              mapboxAccessToken={MAPBOX_TOKEN}
              attributionControl={false}
              dragPan={false}
              dragRotate={false}
              scrollZoom={false}
              doubleClickZoom={false}
              touchZoomRotate={false}
              touchPitch={false}
              keyboard={false}
              style={{ width: '100%', height: '100%' }}
            >
              <FogLayers fog={fog} prefix="mini" />
              {quests.map((q) => (
                <Marker key={q.id} longitude={q.lng} latitude={q.lat} anchor="center">
                  <QuestPin name={q.name} />
                </Marker>
              ))}
              <Marker longitude={playerGeo.lng} latitude={playerGeo.lat} anchor="center">
                <PlayerDot size={14} />
              </Marker>
            </Map>
          </div>

          {/* warm vignette + expand hit-area (blocks map gestures in mini mode) */}
          <button
            onClick={() => setExpanded(true)}
            className="absolute inset-0 cursor-pointer"
            style={{ background: 'radial-gradient(circle at 50% 50%, transparent 55%, rgba(22,16,11,0.55) 100%)' }}
            title="Expand map"
          >
            <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-[var(--sq-bg)]/85 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-[var(--sq-text-muted)]">
              Tap to expand
            </span>
          </button>
        </div>
      </div>

      {/* ── Expanded map: clamped panel, interactive, nav stays clear ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-50 pointer-events-auto flex items-start justify-center bg-[#16100B]/80 backdrop-blur-sm"
            onClick={() => setExpanded(false)}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0.94, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="relative mt-[max(16px,env(safe-area-inset-top))] flex w-[min(92vw,560px)] flex-col overflow-hidden rounded-[var(--sq-r-xl)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-surface)] shadow-[var(--sq-shadow-soft)]"
              style={{ height: 'min(62dvh, 600px)' }}
            >
              {/* header */}
              <div className="flex items-center justify-between border-b border-[var(--sq-hairline)] px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🗺</span>
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--sq-text)]">Overview</span>
                  <span className="rounded-full bg-[var(--sq-gold)]/15 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-[var(--sq-gold-soft)]">
                    {quests.length} quest{quests.length === 1 ? '' : 's'} nearby
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => bigMapRef.current?.flyTo({ center: [playerGeo.lng, playerGeo.lat], zoom: 15, duration: 800 })}
                    className="cursor-pointer rounded-[var(--sq-r-pill)] border border-[var(--sq-hairline)] bg-[var(--sq-bg)] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[var(--sq-text-muted)] transition-colors hover:text-[var(--sq-text)]"
                  >
                    ◎ Recenter
                  </button>
                  <button
                    onClick={() => setExpanded(false)}
                    className="cursor-pointer rounded-[var(--sq-r-pill)] border border-[var(--sq-keyline)]/30 bg-[var(--sq-ember-500)] px-3 py-1 text-[9px] font-black uppercase tracking-wider text-[var(--sq-ink)] transition-transform hover:scale-105 active:scale-95"
                  >
                    ⬡ World
                  </button>
                </div>
              </div>

              {/* the real map — pan/zoom enabled here */}
              <div className="relative flex-1" style={{ filter: COZY_FILTER }}>
                <Map
                  ref={bigMapRef}
                  initialViewState={{ longitude: playerGeo.lng, latitude: playerGeo.lat, zoom: 14.6, pitch: 0, bearing: 0 }}
                  mapStyle={cozyStyle as any}
                  mapboxAccessToken={MAPBOX_TOKEN}
                  attributionControl={false}
                  style={{ width: '100%', height: '100%' }}
                >
                  <FogLayers fog={fog} prefix="big" />
                  {quests.map((q) => (
                    <Marker key={q.id} longitude={q.lng} latitude={q.lat} anchor="bottom">
                      <QuestPin name={q.name} big onClick={() => onQuestClick(q.id)} />
                    </Marker>
                  ))}
                  <Marker longitude={playerGeo.lng} latitude={playerGeo.lat} anchor="center">
                    <PlayerDot />
                  </Marker>
                </Map>
              </div>

              {/* legend footer */}
              <div className="flex items-center justify-center gap-4 border-t border-[var(--sq-hairline)] px-4 py-2">
                <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-[var(--sq-text-muted)]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--sq-ember-500)]" /> You
                </span>
                <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-[var(--sq-text-muted)]">
                  <span className="flex h-3 w-3 items-center justify-center rounded-full bg-[var(--sq-gold)] text-[7px] text-[var(--sq-ink)]">⚑</span> Quest — tap to open
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
