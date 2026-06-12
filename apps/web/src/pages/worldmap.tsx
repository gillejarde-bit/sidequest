// The Map tab — World (isometric 3D) by default, with a toggle back to the
// flat fog Overview. Three.js code is lazy-loaded so the main bundle stays lean.

import { lazy, Suspense, useState } from 'react'
import { MapPage } from './map'

const WorldView = lazy(() => import('../components/world/WorldView'))

type MapMode = 'world' | 'overview'

function readMode(): MapMode {
  try {
    return localStorage.getItem('sq-map-mode') === 'overview' ? 'overview' : 'world'
  } catch {
    return 'world'
  }
}

export function WorldMapPage() {
  const [mode, setModeState] = useState<MapMode>(readMode)

  const setMode = (m: MapMode) => {
    setModeState(m)
    try {
      localStorage.setItem('sq-map-mode', m)
    } catch {
      /* fine */
    }
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[var(--sq-bg)]">
      {mode === 'world' ? (
        <Suspense fallback={<div className="h-full w-full bg-[var(--sq-bg)]" />}>
          <WorldView />
        </Suspense>
      ) : (
        <MapPage />
      )}

      {/* World / Overview toggle */}
      <div
        className="absolute right-4 top-4 flex items-center gap-1 rounded-[var(--sq-r-pill)] border border-[var(--sq-hairline-strong)] bg-[var(--sq-surface)]/90 p-1 shadow-[var(--sq-shadow-soft)] backdrop-blur-sm"
        style={{ zIndex: 60 }}
      >
        <button
          onClick={() => setMode('world')}
          className={`cursor-pointer rounded-[var(--sq-r-pill)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
            mode === 'world'
              ? 'bg-[var(--sq-ember-500)] text-[var(--sq-ink)]'
              : 'text-[var(--sq-text-muted)] hover:text-[var(--sq-text)]'
          }`}
        >
          ⬡ World
        </button>
        <button
          onClick={() => setMode('overview')}
          className={`cursor-pointer rounded-[var(--sq-r-pill)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
            mode === 'overview'
              ? 'bg-[var(--sq-ember-500)] text-[var(--sq-ink)]'
              : 'text-[var(--sq-text-muted)] hover:text-[var(--sq-text)]'
          }`}
        >
          Overview
        </button>
      </div>
    </div>
  )
}
