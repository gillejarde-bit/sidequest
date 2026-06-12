// Exploration stats + reverse geocoding (Nominatim, cached & polite).
// Turns "20 tiles uncovered" into something a human can feel proud of.

import { TILE_METERS } from './osm'

// ── Reverse geocode ──────────────────────────────────────────────────────────

export interface PlaceInfo {
  area: string | null // suburb / neighbourhood
  city: string | null
  state: string | null
  countryCode: string | null
}

const GEO_CACHE_PREFIX = 'sq-world-geo:'
const GEO_TTL_MS = 7 * 24 * 60 * 60 * 1000

interface NominatimAddress {
  suburb?: string
  neighbourhood?: string
  quarter?: string
  hamlet?: string
  village?: string
  town?: string
  city?: string
  county?: string
  state?: string
  country_code?: string
}

export async function reverseGeocode(lat: number, lng: number): Promise<PlaceInfo> {
  const key = `${GEO_CACHE_PREFIX}${lat.toFixed(3)},${lng.toFixed(3)}`
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const cached = JSON.parse(raw) as { at: number; place: PlaceInfo }
      if (Date.now() - cached.at < GEO_TTL_MS) return cached.place
    }
  } catch { /* refetch */ }

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}&zoom=14`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('geocode failed')
  const json = (await res.json()) as { address?: NominatimAddress }
  const a = json.address ?? {}
  const place: PlaceInfo = {
    area: a.suburb ?? a.neighbourhood ?? a.quarter ?? a.hamlet ?? a.village ?? null,
    city: a.city ?? a.town ?? a.county ?? null,
    state: a.state ?? null,
    countryCode: a.country_code ?? null,
  }
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), place }))
  } catch { /* fine */ }
  return place
}

// ── Region areas (mi²) for "% explored" ─────────────────────────────────────

const US_STATE_AREAS_MI2: Record<string, number> = {
  alabama: 52420, alaska: 665384, arizona: 113990, arkansas: 53179,
  california: 163695, colorado: 104094, connecticut: 5543, delaware: 2489,
  'district of columbia': 68, florida: 65758, georgia: 59425, hawaii: 10932,
  idaho: 83569, illinois: 57914, indiana: 36420, iowa: 56273, kansas: 82278,
  kentucky: 40408, louisiana: 52378, maine: 35380, maryland: 12406,
  massachusetts: 10554, michigan: 96714, minnesota: 86936, mississippi: 48432,
  missouri: 69707, montana: 147040, nebraska: 77348, nevada: 110572,
  'new hampshire': 9349, 'new jersey': 8723, 'new mexico': 121590,
  'new york': 54555, 'north carolina': 53819, 'north dakota': 70698,
  ohio: 44826, oklahoma: 69899, oregon: 98379, pennsylvania: 46054,
  'puerto rico': 5325, 'rhode island': 1545, 'south carolina': 32020,
  'south dakota': 77116, tennessee: 42144, texas: 268596, utah: 84897,
  vermont: 9616, virginia: 42775, washington: 71298, 'west virginia': 24230,
  wisconsin: 65496, wyoming: 97813,
}

export function stateAreaMi2(state: string | null): number | null {
  if (!state) return null
  return US_STATE_AREAS_MI2[state.toLowerCase()] ?? null
}

// ── Stats math ───────────────────────────────────────────────────────────────

export interface ExplorationStats {
  tiles: number
  areaM2: number
  areaMi2: number
  areaKm2: number
  footballFields: number // NFL field incl. end zones ≈ 5,351 m²
  cityBlocks: number // typical US block ≈ 6,475 m²
  statePct: number | null
  stateName: string | null
  walkedMeters: number // tiles * tile size — distance-equivalent of coverage
}

const TILE_AREA_M2 = TILE_METERS * TILE_METERS
const M2_PER_MI2 = 2_589_988.11

export function computeStats(tiles: number, state: string | null): ExplorationStats {
  const areaM2 = tiles * TILE_AREA_M2
  const areaMi2 = areaM2 / M2_PER_MI2
  const stArea = stateAreaMi2(state)
  return {
    tiles,
    areaM2,
    areaMi2,
    areaKm2: areaM2 / 1_000_000,
    footballFields: areaM2 / 5351,
    cityBlocks: areaM2 / 6475,
    statePct: stArea ? (areaMi2 / stArea) * 100 : null,
    stateName: stArea ? state : null,
    walkedMeters: tiles * TILE_METERS,
  }
}

/** Format tiny percentages so they read as progress, not zero. */
export function formatPct(pct: number): string {
  if (pct >= 0.01) return `${pct.toFixed(2)}%`
  if (pct >= 0.0001) return `${pct.toFixed(4)}%`
  return `1 / ${Math.round(100 / pct).toLocaleString()}th`
}

export function formatArea(stats: ExplorationStats): string {
  if (stats.areaMi2 >= 0.1) return `${stats.areaMi2.toFixed(2)} mi²`
  if (stats.areaMi2 >= 0.001) return `${stats.areaMi2.toFixed(3)} mi²`
  return `${Math.round(stats.areaM2).toLocaleString()} m²`
}
