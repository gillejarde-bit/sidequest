// The Map tab — the isometric World. The flat map now lives inside it as the
// expandable minimap (top right). Three.js is lazy-loaded to keep the main
// bundle lean.

import { lazy, Suspense } from 'react'

const WorldView = lazy(() => import('../components/world/WorldView'))

export function WorldMapPage() {
  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#16100B]">
      <Suspense fallback={<div className="h-full w-full bg-[#16100B]" />}>
        <WorldView />
      </Suspense>
    </div>
  )
}
