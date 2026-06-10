/// <reference lib="webworker" />
// Fog-of-war geometry worker.
// Receives the revealed H3 cells and computes, off the main thread, the fog
// polygon (world minus explored holes) and the line/fill features for every
// resolution LOD. Pure computation only — no React, no DOM.
import * as h3 from 'h3-js'

interface ComputeMessage {
  type: 'COMPUTE'
  cells: string[]
}

export interface FogResultMessage {
  type: 'RESULT'
  fogData: Record<number, GeoJSON.Feature>
  linesData: Record<number, GeoJSON.FeatureCollection>
}

const WORLD_RING: number[][] = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]
const ALL_RESOLUTIONS = [10, 8, 6, 4, 2, 1]

// Deterministic warm patchwork color per cell (hues 15–45, golden/orange/amber)
const hashCellToWarmColor = (cellId: string): string => {
  let hash = 0
  for (let i = 0; i < cellId.length; i++) {
    hash = cellId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = 15 + Math.abs(hash % 30) // Hues 15 to 45 (warm golden/orange/amber tones)
  const s = 60 + Math.abs((hash >> 8) % 15) // Saturation 60% to 75%
  const l = 42 + Math.abs((hash >> 16) % 12) // Lightness 42% to 54%
  return `hsl(${h}, ${s}%, ${l}%)`
}

function computeFog(fineCells: string[]): { fogData: Record<number, GeoJSON.Feature>; linesData: Record<number, GeoJSON.FeatureCollection> } {
  const fogData: Record<number, GeoJSON.Feature> = {}
  const linesData: Record<number, GeoJSON.FeatureCollection> = {}

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
      } catch (e) { /* skip invalid cell */ }
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

    // Build outlines and frontier lines
    const features: GeoJSON.Feature[] = []

    // Explored hex cell outlines and fills (at all resolutions)
    cellsArray.forEach(cell => {
      try {
        const boundary = h3.cellToBoundary(cell, true)
        if (boundary.length > 0) {
          const closed = [...boundary]
          closed.push(closed[0])

          // Add outline
          features.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: closed
            },
            properties: { type: 'outline' }
          })

          // Add fill
          features.push({
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [closed]
            },
            properties: {
              type: 'cell-fill',
              color: hashCellToWarmColor(cell)
            }
          })
        }
      } catch (e) { /* skip invalid cell */ }
    })

    // Frontier glow lines (outer perimeter of explored regions)
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

self.onmessage = (event: MessageEvent<ComputeMessage>) => {
  const msg = event.data
  if (!msg || msg.type !== 'COMPUTE') return

  const { fogData, linesData } = computeFog(msg.cells)
  const result: FogResultMessage = { type: 'RESULT', fogData, linesData }
  self.postMessage(result)
}
