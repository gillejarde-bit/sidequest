import { useEffect, useRef, useState } from 'react'
import type { FogResultMessage } from '../workers/fogWorker'

/**
 * Computes the fog-of-war GeoJSON (fog polygon with explored holes + cell
 * outline/fill/frontier lines) for every resolution LOD.
 *
 * The heavy H3 computation runs in a Web Worker (src/workers/fogWorker.ts) so
 * it never blocks the main thread, even as the explored area grows to
 * thousands of cells. Input changes are debounced 150ms.
 */
export function useFogGeometry(revealSet: Set<string>): {
  fogData: Record<number, GeoJSON.Feature>
  linesData: Record<number, GeoJSON.FeatureCollection>
} {
  const [fogData, setFogData] = useState<Record<number, GeoJSON.Feature>>({})
  const [linesData, setLinesData] = useState<Record<number, GeoJSON.FeatureCollection>>({})
  const workerRef = useRef<Worker | null>(null)

  // Create the worker once; terminate on unmount
  useEffect(() => {
    const worker = new Worker(new URL('../workers/fogWorker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<FogResultMessage>) => {
      if (event.data?.type === 'RESULT') {
        setFogData(event.data.fogData)
        setLinesData(event.data.linesData)
      }
    }
    workerRef.current = worker

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  // Post the revealed cells to the worker (150ms debounce, matching the
  // previous main-thread implementation's protection during DB load/writes)
  useEffect(() => {
    if (!revealSet) return

    const timer = setTimeout(() => {
      workerRef.current?.postMessage({ type: 'COMPUTE', cells: Array.from(revealSet) })
    }, 150)

    return () => clearTimeout(timer)
  }, [revealSet])

  return { fogData, linesData }
}
