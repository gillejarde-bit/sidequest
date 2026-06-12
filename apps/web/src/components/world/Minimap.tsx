// Minimap + fullscreen flat map. Same world, seen from above — square tiles
// in the iso palette, rotated 45° so it matches what the player perceives on
// the isometric board. Fog is a single connected gray field; discovered tiles
// punch through it in color.

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { MapTile } from './WorldEngine'
import { TEMPLATES } from './templates'

export interface MinimapData {
  px: number
  pz: number
  tiles: MapTile[]
}

interface MinimapProps {
  getData: () => MinimapData | null
  version: number // bump to trigger redraw
}

const GROUND_HEX: Record<MapTile['ground'], string> = {
  grass: '#7C9A5E',
  park: '#6E945C',
  soil: '#9C7A55',
  plaza: '#A89274',
  water: '#3E7A66',
}

// Connected gray fog — desaturated, reads as "unknown", not "missing".
const FOG_FILL = '#4A443E'
const FOG_EDGE = '#3A3531'
const SEEN_DIM = 0.45

function drawMap(
  canvas: HTMLCanvasElement,
  data: MinimapData,
  sizePx: number,
  tilePx: number,
): void {
  const dpr = Math.min(window.devicePixelRatio, 2)
  canvas.width = sizePx * dpr
  canvas.height = sizePx * dpr
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, sizePx, sizePx)

  const half = sizePx / 2
  ctx.save()
  ctx.translate(half, half)
  ctx.rotate(-Math.PI / 4) // match the isometric orientation

  const span = Math.ceil(sizePx / tilePx / 1.2)

  // 1) connected fog field under everything
  ctx.fillStyle = FOG_FILL
  const fogExtent = span * tilePx
  ctx.fillRect(-fogExtent, -fogExtent, fogExtent * 2, fogExtent * 2)
  ctx.strokeStyle = FOG_EDGE
  ctx.lineWidth = 1
  for (let i = -span; i <= span; i++) {
    ctx.beginPath()
    ctx.moveTo(i * tilePx, -fogExtent)
    ctx.lineTo(i * tilePx, fogExtent)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-fogExtent, i * tilePx)
    ctx.lineTo(fogExtent, i * tilePx)
    ctx.stroke()
  }

  // 2) discovered tiles punch through in color
  for (const t of data.tiles) {
    if (t.zone === 'fog') continue
    const x = (t.wx - data.px) * tilePx
    const y = (t.wz - data.pz) * tilePx
    if (Math.abs(x) > fogExtent || Math.abs(y) > fogExtent) continue

    const fill = t.template ? TEMPLATES[t.template].color : GROUND_HEX[t.ground]
    ctx.globalAlpha = t.zone === 'seen' ? SEEN_DIM : 1
    ctx.fillStyle = fill
    ctx.fillRect(x - tilePx / 2 + 0.5, y - tilePx / 2 + 0.5, tilePx - 1, tilePx - 1)

    if (t.hasPath && tilePx >= 6) {
      ctx.fillStyle = '#86643F'
      const w = Math.max(2, tilePx * 0.3)
      ctx.fillRect(x - w / 2, y - w / 2, w, w)
    }
    ctx.globalAlpha = 1

    if (t.hasQuest) {
      ctx.fillStyle = '#FFCB6B'
      ctx.beginPath()
      ctx.arc(x, y, Math.max(2.5, tilePx * 0.22), 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#3A2A20'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }

  // 3) player
  ctx.fillStyle = '#F2741E'
  ctx.beginPath()
  ctx.arc(0, 0, Math.max(3, tilePx * 0.32), 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#F5E6D3'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.restore()

  // soft circular mask edge (drawn over, cheap vignette)
  const grad = ctx.createRadialGradient(half, half, half * 0.72, half, half, half)
  grad.addColorStop(0, 'rgba(30,20,14,0)')
  grad.addColorStop(1, 'rgba(30,20,14,0.9)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, sizePx, sizePx)
}

export function Minimap({ getData, version }: MinimapProps) {
  const smallRef = useRef<HTMLCanvasElement>(null)
  const bigRef = useRef<HTMLCanvasElement>(null)
  const [expanded, setExpanded] = useState(false)

  // Small map: redraw on every step
  useEffect(() => {
    const canvas = smallRef.current
    const data = getData()
    if (canvas && data) drawMap(canvas, data, 144, 9)
  }, [getData, version])

  // Big map: redraw when opened or on step while open
  useEffect(() => {
    if (!expanded) return
    const canvas = bigRef.current
    const data = getData()
    if (canvas && data) {
      const size = Math.min(window.innerWidth, window.innerHeight) - 48
      drawMap(canvas, data, size, Math.max(12, Math.floor(size / 42)))
    }
  }, [getData, version, expanded])

  return (
    <>
      {/* Mini map (top-right) */}
      <button
        onClick={() => setExpanded(true)}
        className="absolute right-4 top-4 z-20 cursor-pointer rounded-[var(--sq-r-lg)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-surface)]/90 p-1.5 shadow-[var(--sq-shadow-soft)] backdrop-blur-sm transition-transform hover:scale-[1.03] active:scale-95"
        title="Expand map"
      >
        <canvas ref={smallRef} style={{ width: 144, height: 144 }} className="block rounded-[var(--sq-r-md)]" />
        <div className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[var(--sq-bg)]/80 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-[var(--sq-text-muted)]">
          Tap to expand
        </div>
        {/* North marker — matches iso (up-right) */}
        <div className="pointer-events-none absolute right-1 top-0.5 text-[9px] font-black text-[var(--sq-ember-400)]">N</div>
      </button>

      {/* Fullscreen flat map */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#16100B]/96 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="relative"
            >
              <canvas ref={bigRef} className="block rounded-[var(--sq-r-xl)]" />
              <div className="pointer-events-none absolute right-3 top-2 text-xs font-black text-[var(--sq-ember-400)]">N ↗</div>
            </motion.div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-6">
              <LegendDot color="#F2741E" label="You" round />
              <LegendDot color="#FFCB6B" label="Quest" round />
              <LegendDot color={FOG_FILL} label="Unexplored" />
              <LegendDot color={GROUND_HEX.grass} label="Explored" />
              <LegendDot color="#86643F" label="Your paths" />
            </div>

            <button
              onClick={() => setExpanded(false)}
              className="mt-5 cursor-pointer rounded-[var(--sq-r-pill)] border border-[var(--sq-keyline)]/30 bg-[var(--sq-ember-500)] px-6 py-2.5 text-[11px] font-black uppercase tracking-wider text-[var(--sq-ink)] shadow-[var(--sq-shadow-glow)] transition-transform hover:scale-105 active:scale-95"
            >
              ⬡ Back to World
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function LegendDot({ color, label, round }: { color: string; label: string; round?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={round ? 'h-2.5 w-2.5 rounded-full' : 'h-2.5 w-2.5 rounded-[2px]'}
        style={{ background: color }}
      />
      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--sq-text-muted)]">{label}</span>
    </div>
  )
}
