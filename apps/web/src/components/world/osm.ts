// ─────────────────────────────────────────────────────────────────────────────
// Real-world data layer: Overpass (OpenStreetMap) → tile-binned POIs.
// One fetch per ~400m chunk, cached in localStorage for 24h so the
// Overpass API is hit once per area, not once per render.
// ─────────────────────────────────────────────────────────────────────────────

import { resolveOsmTags, type TemplateId } from './templates'

export const TILE_METERS = 26 // one board tile ≈ 26m of real city

export interface GeoOrigin {
  lat: number
  lng: number
}

export interface WorldPoi {
  template: TemplateId
  name: string
  osmId: string
  priority: number // 2 = tagged POI (amenity/shop/…), 1 = bare building
}

export interface OsmChunk {
  pois: Map<string, WorldPoi> // keyed by tileKey(wx,wz)
  count: number
}

export function tileKey(wx: number, wz: number): string {
  return `${wx},${wz}`
}

const M_PER_DEG_LAT = 110_540
const mPerDegLng = (lat: number) => 111_320 * Math.cos((lat * Math.PI) / 180)

/** World tile coordinates for a lat/lng, relative to the session origin. North = -z. */
export function geoToTile(origin: GeoOrigin, lat: number, lng: number): { wx: number; wz: number } {
  const dx = (lng - origin.lng) * mPerDegLng(origin.lat)
  const dy = (lat - origin.lat) * M_PER_DEG_LAT
  return { wx: Math.round(dx / TILE_METERS), wz: Math.round(-dy / TILE_METERS) }
}

/** Lat/lng of a tile center — used to know where a fetch chunk is anchored. */
export function tileToGeo(origin: GeoOrigin, wx: number, wz: number): { lat: number; lng: number } {
  return {
    lat: origin.lat + (-wz * TILE_METERS) / M_PER_DEG_LAT,
    lng: origin.lng + (wx * TILE_METERS) / mPerDegLng(origin.lat),
  }
}

// ── Overpass fetch ───────────────────────────────────────────────────────────

// Multiple public Overpass mirrors. We try them in order with a hard per-request
// timeout so one slow/dead mirror can't stall the whole fetch (which would drop us
// into the fantasy fallback). Order roughly by reliability.
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

const FETCH_TIMEOUT_MS = 18_000

async function postWithTimeout(url: string, body: string, ms: number): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: ctrl.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

const CACHE_PREFIX = 'sq-world-osm:'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

interface CachedChunk {
  at: number
  pois: Array<[string, WorldPoi]>
}

function cacheKey(lat: number, lng: number, radius: number): string {
  return `${CACHE_PREFIX}${lat.toFixed(3)},${lng.toFixed(3)}:r${radius}`
}

function readCache(key: string): OsmChunk | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const data = JSON.parse(raw) as CachedChunk
    if (Date.now() - data.at > CACHE_TTL_MS) return null
    return { pois: new Map(data.pois), count: data.pois.length }
  } catch {
    return null
  }
}

function writeCache(key: string, chunk: OsmChunk): void {
  try {
    const data: CachedChunk = { at: Date.now(), pois: [...chunk.pois.entries()] }
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    /* storage full / private mode — fine, just refetch next time */
  }
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

function buildQuery(lat: number, lng: number, radius: number): string {
  const around = `(around:${radius},${lat.toFixed(6)},${lng.toFixed(6)})`
  return `[out:json][timeout:25];(
nwr[amenity]${around};
nwr[shop]${around};
nwr[tourism]${around};
nwr[leisure]${around};
nwr[historic]${around};
way[building]${around};
);out center tags 700;`
}

/**
 * Fetch every interesting thing near (lat,lng) and bin it onto the tile grid.
 * Tagged POIs (cafés, shops…) beat anonymous building footprints for a tile.
 */
export async function fetchOsmChunk(
  origin: GeoOrigin,
  lat: number,
  lng: number,
  radius = 400,
): Promise<OsmChunk> {
  const key = cacheKey(lat, lng, radius)
  const cached = readCache(key)
  if (cached) return cached

  const query = buildQuery(lat, lng, radius)
  let elements: OverpassElement[] | null = null

  const body = `data=${encodeURIComponent(query)}`
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await postWithTimeout(endpoint, body, FETCH_TIMEOUT_MS)
      if (!res.ok) continue
      const json = (await res.json()) as { elements?: OverpassElement[] }
      if (json.elements) {
        elements = json.elements
        break
      }
    } catch {
      /* timed out or unreachable — try the next mirror */
    }
  }

  if (!elements) throw new Error('Overpass unreachable')

  const pois = new Map<string, WorldPoi>()
  for (const el of elements) {
    const tags = el.tags
    if (!tags) continue
    const template = resolveOsmTags(tags)
    if (!template) continue

    const elat = el.lat ?? el.center?.lat
    const elng = el.lon ?? el.center?.lon
    if (elat === undefined || elng === undefined) continue

    const { wx, wz } = geoToTile(origin, elat, elng)
    const k = tileKey(wx, wz)
    const priority =
      tags.amenity || tags.shop || tags.tourism || tags.leisure || tags.historic ? 2 : 1

    const existing = pois.get(k)
    if (existing && existing.priority >= priority) continue

    pois.set(k, {
      template,
      name: tags.name ?? '',
      osmId: `${el.type}/${el.id}`,
      priority,
    })
  }

  const chunk: OsmChunk = { pois, count: pois.size }
  writeCache(key, chunk)
  return chunk
}
