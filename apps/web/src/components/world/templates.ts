// ─────────────────────────────────────────────────────────────────────────────
// World tile templates — the 12 building archetypes from the map plan,
// plus seeded helpers and the procedural tile generator.
// Pure data + math. No three.js in this file.
// ─────────────────────────────────────────────────────────────────────────────

export type TemplateId =
  | 'hearth'
  | 'nightwatch'
  | 'lorehall'
  | 'marketplace'
  | 'waypost'
  | 'gatheringhall'
  | 'hearthstone'
  | 'forge'
  | 'trailpost'
  | 'watercourse'
  | 'lanternpost'
  | 'unknown'

export interface TemplateDef {
  id: TemplateId
  title: string // lore name
  subtitle: string // real-world category
  color: string // HUD accent
  xp: number
}

export const TEMPLATES: Record<TemplateId, TemplateDef> = {
  hearth:        { id: 'hearth',        title: 'The Hearth',     subtitle: 'café · food',          color: '#F2741E', xp: 12 },
  nightwatch:    { id: 'nightwatch',    title: 'Night Watch',    subtitle: 'bar · nightlife',      color: '#C2410C', xp: 12 },
  lorehall:      { id: 'lorehall',      title: 'Lore Hall',      subtitle: 'museum · library',     color: '#3E7A66', xp: 16 },
  marketplace:   { id: 'marketplace',   title: 'Marketplace',    subtitle: 'shop · market',        color: '#F6A623', xp: 10 },
  waypost:       { id: 'waypost',       title: 'Waypost',        subtitle: 'lodging · transit',    color: '#9C7A55', xp: 8 },
  gatheringhall: { id: 'gatheringhall', title: 'Gathering Hall', subtitle: 'community · worship',  color: '#FFCB6B', xp: 14 },
  hearthstone:   { id: 'hearthstone',   title: 'Hearthstone',    subtitle: 'residential',          color: '#C9B49C', xp: 4 },
  forge:         { id: 'forge',         title: 'The Forge',      subtitle: 'gym · industry',       color: '#8A5A36', xp: 10 },
  trailpost:     { id: 'trailpost',     title: 'Trail Post',     subtitle: 'park · nature',        color: '#5FA88F', xp: 10 },
  watercourse:   { id: 'watercourse',   title: 'Watercourse',    subtitle: 'water',                color: '#3E7A66', xp: 8 },
  lanternpost:   { id: 'lanternpost',   title: 'Lantern Post',   subtitle: 'landmark · historic',  color: '#FFCB6B', xp: 20 },
  unknown:       { id: 'unknown',       title: 'Unknown',        subtitle: 'unmapped',             color: '#8A7560', xp: 6 },
}

// ── OSM tag → template resolver ──────────────────────────────────────────────

const FOOD = new Set(['restaurant', 'cafe', 'fast_food', 'food_court', 'ice_cream', 'bakery', 'deli'])
const NIGHT = new Set(['bar', 'pub', 'nightclub', 'biergarten', 'casino'])
const LORE = new Set(['museum', 'library', 'school', 'university', 'college', 'arts_centre', 'theatre', 'cinema', 'gallery'])
const GATHER = new Set(['place_of_worship', 'community_centre', 'events_venue', 'townhall', 'social_centre', 'conference_centre'])
const TRANSIT = new Set(['bus_station', 'ferry_terminal', 'station'])
const RESIDENTIAL = new Set(['residential', 'house', 'apartments', 'detached', 'terrace', 'semidetached_house', 'bungalow', 'dormitory'])

export function resolveOsmTags(tags: Record<string, string>): TemplateId | null {
  const a = tags.amenity
  const s = tags.shop
  const t = tags.tourism
  const l = tags.leisure
  const b = tags.building

  if (tags.historic || t === 'attraction' || t === 'artwork' || t === 'viewpoint' || t === 'monument') return 'lanternpost'
  if (a && FOOD.has(a)) return 'hearth'
  if (s === 'bakery' || s === 'coffee' || s === 'confectionery') return 'hearth'
  if (a && NIGHT.has(a)) return 'nightwatch'
  if ((a && LORE.has(a)) || t === 'museum' || t === 'gallery') return 'lorehall'
  if (s) return 'marketplace'
  if (a === 'marketplace') return 'marketplace'
  if (t === 'hotel' || t === 'hostel' || t === 'guest_house' || t === 'motel' || (a && TRANSIT.has(a)) || tags.railway === 'station' || tags.public_transport === 'station') return 'waypost'
  if (a && GATHER.has(a)) return 'gatheringhall'
  if (l === 'fitness_centre' || l === 'sports_centre' || a === 'gym' || tags.industrial !== undefined || b === 'industrial' || b === 'warehouse') return 'forge'
  if (l === 'park' || l === 'garden' || l === 'playground' || l === 'nature_reserve' || l === 'dog_park' || tags.natural === 'wood' || tags.natural === 'tree') return 'trailpost'
  if (tags.natural === 'water' || tags.waterway !== undefined || l === 'swimming_pool' || a === 'fountain') return 'watercourse'
  if (b && RESIDENTIAL.has(b)) return 'hearthstone'
  if (b) return 'unknown'
  if (a) return 'unknown'
  return null
}

// ── Seeded randomness — stable per world coordinate ──────────────────────────

export function hash2(x: number, y: number, seed = 1337): number {
  let h = seed >>> 0
  h = Math.imul(h ^ (x | 0), 0x9e3779b1)
  h = (h << 13) | (h >>> 19)
  h = Math.imul(h ^ (y | 0), 0x85ebca6b)
  h = (h << 11) | (h >>> 21)
  h = Math.imul(h ^ (h >>> 16), 0xc2b2ae35)
  return (h ^ (h >>> 13)) >>> 0
}

export function mulberry(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Deterministic RNG for a tile — same tile, same world, every session. */
export function tileRng(wx: number, wz: number, salt = 0): () => number {
  return mulberry(hash2(wx, wz, 7919 + salt))
}

// ── Procedural tile generation ───────────────────────────────────────────────

export type GroundKind = 'grass' | 'soil' | 'plaza' | 'water' | 'park'
export type NatureKind = 'trees' | 'rocks' | 'bush' | null

export interface TileSpec {
  ground: GroundKind
  template: TemplateId | null
  nature: NatureKind
  name: string | null
  fromOsm: boolean
}

export interface PoiLike {
  template: TemplateId
  name: string
}

const FLAVOR: Partial<Record<TemplateId, string[]>> = {
  hearth: ['The Copper Kettle', 'Ember & Oat', 'Marrow’s Table', 'The Glowing Crumb'],
  nightwatch: ['The Tipsy Lantern', 'Last Call Hall', 'The Owl’s Flagon'],
  lorehall: ['Hall of Echoes', 'The Quiet Stacks', 'Wanderer’s Archive'],
  marketplace: ['Tinker’s Row', 'The Open Crate', 'Goods & Grain'],
  waypost: ['The Resting Flame', 'Mile Zero Inn', 'The Far Door'],
  gatheringhall: ['The Long Table', 'Commons Rest', 'The Warm Assembly'],
  hearthstone: ['A quiet home', 'Someone’s hearth', 'A lamplit house'],
  forge: ['The Iron Lung', 'Smelter’s Den', 'The Heavy Room'],
  trailpost: ['Whispering Copse', 'The Green Gap', 'Mosswalk'],
  lanternpost: ['An old lantern', 'The First Flame', 'Watcher’s Light'],
  unknown: ['Unmarked walls', 'A nameless place'],
}

export function flavorName(t: TemplateId, rng: () => number): string | null {
  const list = FLAVOR[t]
  if (!list) return null
  return list[Math.floor(rng() * list.length)]
}

const TOWN_WEIGHTS: Array<[TemplateId, number]> = [
  ['hearthstone', 30],
  ['hearth', 14],
  ['marketplace', 13],
  ['waypost', 8],
  ['nightwatch', 7],
  ['lorehall', 7],
  ['gatheringhall', 6],
  ['forge', 6],
  ['lanternpost', 4],
  ['unknown', 5],
]
const TOWN_TOTAL = TOWN_WEIGHTS.reduce((s, [, w]) => s + w, 0)

function pickWeighted(rng: () => number): TemplateId {
  let r = rng() * TOWN_TOTAL
  for (const [id, w] of TOWN_WEIGHTS) {
    r -= w
    if (r <= 0) return id
  }
  return 'hearthstone'
}

function isWater(wx: number, wz: number): boolean {
  // Coarse 4x4 lake cells with softened edges → reads as ponds, not noise.
  const lake = hash2(Math.floor(wx / 4), Math.floor(wz / 4), 911) % 100 < 11
  if (!lake) return false
  return hash2(wx, wz, 912) % 100 < 74
}

/**
 * Decide what lives on a tile.
 * If a real OSM POI is provided it always wins; otherwise seeded procedural.
 * `townMode` densifies the world (used as fallback when OSM is offline/sparse).
 */
export function generateTile(
  wx: number,
  wz: number,
  poi: PoiLike | undefined,
  townMode: boolean,
): TileSpec {
  const rng = tileRng(wx, wz)

  if (poi) {
    if (poi.template === 'watercourse') {
      return { ground: 'water', template: 'watercourse', nature: null, name: poi.name || null, fromOsm: true }
    }
    if (poi.template === 'trailpost') {
      return { ground: 'park', template: 'trailpost', nature: null, name: poi.name || null, fromOsm: true }
    }
    return { ground: 'soil', template: poi.template, nature: null, name: poi.name || null, fromOsm: true }
  }

  if (isWater(wx, wz)) {
    return { ground: 'water', template: null, nature: null, name: null, fromOsm: false }
  }

  // Streets every 5 tiles in town mode — gives the board urban structure.
  if (townMode && (((wx % 5) + 5) % 5 === 0 || ((wz % 5) + 5) % 5 === 0)) {
    return { ground: 'plaza', template: null, nature: null, name: null, fromOsm: false }
  }

  const roll = hash2(wx, wz, 5) % 100
  if (townMode && roll < 38) {
    const t = pickWeighted(tileRng(wx, wz, 1))
    return { ground: 'soil', template: t, nature: null, name: flavorName(t, tileRng(wx, wz, 2)), fromOsm: false }
  }

  // Nature filler
  const natRoll = hash2(wx, wz, 6) % 100
  const park = natRoll < 8
  let nature: NatureKind = null
  if (natRoll < 26) nature = 'trees'
  else if (natRoll < 34) nature = 'bush'
  else if (natRoll < 40) nature = 'rocks'

  const ground: GroundKind = park ? 'park' : rng() < 0.18 ? 'soil' : 'grass'
  return { ground, template: null, nature, name: null, fromOsm: false }
}
