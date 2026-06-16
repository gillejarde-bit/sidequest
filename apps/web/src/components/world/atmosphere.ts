// ─────────────────────────────────────────────────────────────────────────────
// Living-map atmosphere — time of day (Phase 1) + season (Phase 2) + sky
// (Phase 3: stars/moon). Pure + testable: given a Date (+ latitude for the
// hemisphere) it returns the sky backdrop, light palette, ambient particle, and
// star/moon visibility the World should ease toward.
//
// Identity rule (MAP_ATMOSPHERE_PLAN.md): time + season change the world AROUND
// the fire (sky, light, air, particles) — never the fire itself (torch, quest
// flames, ember glow stay warm and constant).
// ─────────────────────────────────────────────────────────────────────────────

export type TimePhase = 'dawn' | 'day' | 'golden' | 'dusk' | 'night' | 'deepNight'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type ParticleKind = 'ember' | 'firefly' | 'petal' | 'leaf' | 'snow'

export interface Atmosphere {
  phase: TimePhase
  season: Season
  backdropCss: string
  hemiSky: number
  hemiGround: number
  hemiIntensity: number
  dirColor: number
  dirIntensity: number
  exposure: number
  stars: number // 0..1 (CSS star-field opacity)
  moon: number // 0..1 (CSS moon opacity)
  particle: { kind: ParticleKind; color: number }
}

interface PhaseDef {
  backdropCss: string
  hemiSky: number
  hemiGround: number
  hemiIntensity: number
  dirColor: number
  dirIntensity: number
  exposure: number
  stars: number
  moon: number
}

// Time-of-day rows — mirror MAP_ATMOSPHERE_PLAN.md. `dusk` is the look the app
// shipped with permanently; now it's one of six.
const PHASES: Record<TimePhase, PhaseDef> = {
  dawn: {
    backdropCss: 'linear-gradient(to bottom, #3a2740 0%, #6a4242 38%, #2a1a12 72%, #1e140e 100%)',
    hemiSky: 0xffc9a0, hemiGround: 0x2a1f18, hemiIntensity: 0.7, dirColor: 0xffd9b0, dirIntensity: 1.2, exposure: 1.05, stars: 0.25, moon: 0.15,
  },
  day: {
    backdropCss: 'linear-gradient(to bottom, #6a7d96 0%, #7d6a50 46%, #2a1c14 80%, #1e140e 100%)',
    hemiSky: 0xfff3d8, hemiGround: 0x3a2c1e, hemiIntensity: 1.0, dirColor: 0xffe6c0, dirIntensity: 1.7, exposure: 1.15, stars: 0, moon: 0,
  },
  golden: {
    backdropCss: 'linear-gradient(to bottom, #c97a3a 0%, #9a4a2a 45%, #321e12 80%, #1e140e 100%)',
    hemiSky: 0xffd2a0, hemiGround: 0x2a1c12, hemiIntensity: 0.85, dirColor: 0xffb060, dirIntensity: 1.6, exposure: 1.2, stars: 0, moon: 0,
  },
  dusk: {
    backdropCss: 'linear-gradient(to bottom, #2a1e30 0%, #3a2418 48%, #1d130c 82%, #16100b 100%)',
    hemiSky: 0xffb98a, hemiGround: 0x241a12, hemiIntensity: 0.7, dirColor: 0xffd9a8, dirIntensity: 1.4, exposure: 1.12, stars: 0.35, moon: 0.45,
  },
  night: {
    backdropCss: 'linear-gradient(to bottom, #14182a 0%, #181410 55%, #100c08 100%)',
    hemiSky: 0x8aa0c0, hemiGround: 0x14110b, hemiIntensity: 0.5, dirColor: 0x9fb3d8, dirIntensity: 0.9, exposure: 1.0, stars: 0.95, moon: 0.9,
  },
  deepNight: {
    backdropCss: 'linear-gradient(to bottom, #0c1020 0%, #120e0a 60%, #0a0806 100%)',
    hemiSky: 0x6a7da0, hemiGround: 0x100c08, hemiIntensity: 0.4, dirColor: 0x8aa0d0, dirIntensity: 0.7, exposure: 1.0, stars: 1, moon: 0.8,
  },
}

const SEASON_TINT: Record<Season, number> = {
  spring: 0x9fd89a, // fresh green
  summer: 0xffe6b0, // warm gold
  autumn: 0xff9e4d, // amber/rust
  winter: 0xb8cdf0, // cool blue
}

function blend(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return (r << 16) | (g << 8) | bl
}

/** Phase from the local wall clock. (Phase 4 may refine with real sun altitude.) */
export function getTimePhase(date: Date = new Date()): TimePhase {
  const h = date.getHours() + date.getMinutes() / 60
  if (h >= 5 && h < 7) return 'dawn'
  if (h >= 7 && h < 16) return 'day'
  if (h >= 16 && h < 18.5) return 'golden'
  if (h >= 18.5 && h < 20) return 'dusk'
  if (h >= 20 && h < 23) return 'night'
  return 'deepNight'
}

/** Season from the date, flipped for the southern hemisphere. */
export function getSeason(date: Date = new Date(), lat = 40): Season {
  const m = date.getMonth() // 0=Jan
  let s: Season = m === 11 || m <= 1 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn'
  if (lat < 0) {
    const opp: Record<Season, Season> = { winter: 'summer', summer: 'winter', spring: 'autumn', autumn: 'spring' }
    s = opp[s]
  }
  return s
}

function particleFor(season: Season, phase: TimePhase): { kind: ParticleKind; color: number } {
  const night = phase === 'dusk' || phase === 'night' || phase === 'deepNight'
  if (season === 'winter') return { kind: 'snow', color: 0xe6edf5 }
  if (season === 'autumn') return { kind: 'leaf', color: 0xf2a23a }
  if (season === 'spring') return night ? { kind: 'firefly', color: 0xffe08a } : { kind: 'petal', color: 0xffc9d8 }
  // summer
  return night ? { kind: 'firefly', color: 0xffd56b } : { kind: 'ember', color: 0xffcb6b }
}

export function getAtmosphere(date: Date = new Date(), lat?: number): Atmosphere {
  const phase = getTimePhase(date)
  const base = PHASES[phase]
  const season = getSeason(date, lat ?? 40)
  const tint = SEASON_TINT[season]
  return {
    phase,
    season,
    backdropCss: base.backdropCss,
    hemiSky: blend(base.hemiSky, tint, 0.14),
    hemiGround: base.hemiGround,
    hemiIntensity: base.hemiIntensity,
    dirColor: blend(base.dirColor, tint, 0.2),
    dirIntensity: base.dirIntensity,
    exposure: base.exposure,
    stars: base.stars,
    moon: base.moon,
    particle: particleFor(season, phase),
  }
}
