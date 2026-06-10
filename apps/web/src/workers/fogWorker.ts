// Fog-of-war geometry worker.
// Receives the revealed H3 cells and computes, off the main thread, the fog
// polygon (world minus explored holes) and the line/fill features for every
// resolution LOD. Pure computation only — no React, no DOM.
import * as h3 from 'h3-js'
import type { Feature, FeatureCollection } from 'geojson'

interface ComputeMessage {
  type: 'COMPUTE'
  cells: string[]
}

export interface FogResultMessage {
  type: 'RESULT'
  fogData: Record<number, Feature>
  linesData: Record<number, FeatureCollection>
}

// Typed view of the worker global scope (tsconfig uses the DOM lib, so we
// avoid referencing the webworker lib to prevent global type conflicts)
const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<ComputeMessage>) => void) | null
  postMessage: (message: FogResultMessage) => void
}

const WORLD_RING: number[][] = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]
const ALL_RESOLUTIONS = [10, 8, 6, 4, 2, 1]

function computeFog(fineCells: string[]): { fogData: Record<number, Feature>; linesData: Record<number, FeatureCollection> } {
  const fogData: Record<number, Feature> = {}
  const linesData: Record<number, FeatureCollection> = {}

  if (fineCells.length === 0) {
    ALL_RESOLUTIONS.forEach(res => {
      fogData[res] = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [WORLD_RING]
        },
        properties: {}
      }
      linesData[res] = {
        type: 'FeatureCollection',
        features: []
      }
    })
    return { fogData, linesData }
  }

  // 1. Group explored fine cells into their respective resolution parents
  const exploredSets: Record<number, Set<string>> = {
    10: new Set(fineCells),
    8: new Set(),
    6: new Set(),
    4: new Set(),
    2: new Set(),
    1: new Set()
  }

  const parentResolutions = [8, 6, 4, 2, 1]
  fineCells.forEach(cell => {
    parentResolutions.forEach(res => {
      try {
        const parent = h3.cellToParent(cell, res)
        if (parent) exploredSets[res].add(parent)
      } catch {
        /* skip invalid cell */
      }
    })
  })

  // 2. Generate GeoJSON for each resolution (Polygon with holes + outlines/frontier)
  ALL_RESOLUTIONS.forEach(res => {
    const cellsArray = Array.from(exploredSets[res])

    let merged: number[][][][] = []
    try {
      merged = h3.cellsToMultiPolygon(cellsArray, true)
    } catch (e) {
      console.error('[fogWorker] cellsToMultiPolygon failed for res', res, e)
    }

    // Build fog polygon (World bounding box with explored MultiPolygon holes)
    const worldCoords: number[][][] = [WORLD_RING]
    merged.forEach(polygon => {
      polygon.forEach(ring => {
        if (ring.length > 0) {
          const closed = [...ring]
          const first = closed[0]
          const last = closed[closed.length - 1]
          if (first[0] !== last[0] || first[1] !== last[1]) {
            closed.push([first[0], first[1]])
          }
          worldCoords.push(closed)
        }
      })
    })

    fogData[res] = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: worldCoords
      },
      properties: {}
    }

    // Frontier lines only — the explored map itself stays clear.
    // (Per the fog-v2 art direction: explored = clear map, soft glow on the
    // frontier; the visible hex patchwork lives on the UNEXPLORED side and is
    // rendered by the ambient grid in map.tsx.)
    const features: Feature[] = []

    merged.forEach(polygon => {
      polygon.forEach(ring => {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: ring
          },
          properties: { type: 'frontier' }
        })
      })
    })

    linesData[res] = {
      type: 'FeatureCollection',
      features
    }
  })

  return { fogData, linesData }
}

ctx.onmessage = (event: MessageEvent<ComputeMessage>) => {
  const msg = event.data
  if (!msg || msg.type !== 'COMPUTE') return

  const { fogData, linesData } = computeFog(msg.cells)
  ctx.postMessage({ type: 'RESULT', fogData, linesData })
}
