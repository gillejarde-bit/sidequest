// ─────────────────────────────────────────────────────────────────────────────
// Living-map atmosphere — Phase 1: time of day.
//
// Pure + testable: given a Date, return the sky backdrop + light palette the
// World should ease toward. The campfire identity rule (MAP_ATMOSPHERE_PLAN.md):
// time changes the world AROUND the fire (sky + sun/moon light), never the fire
// itself (the torch, quest flames, ember glow stay warm and constant).
//
// Phase 2 (season grade + petals/leaves/snow/fireflies) and Phase 3 (stars/moon)
// build on this — see MAP_ATMOSPHERE_PLAN.md.
// ─────────────────────────────────────────────────────────────────────────────

export type TimePhase = 'dawn' | 'day' | 'golden' | 'dusk' | 'night' | 'deepNight'

export interface Atmosphere {
  phase: TimePhase
  /** CSS background for the WorldView sky layer (keeps a dark warm floor so the
   *  board + fire glow always read). */
  backdropCss: string
  hemiSky: number
  hemiGround: number
  hemiIntensity: number
  dirColor: number
  dirIntensity: number
  exposure: number
}

// Each row mirrors the table in MAP_ATMOSPHERE_PLAN.md. `dusk` is the look the
// app shipped with permanently — now it's just one of six.
const PHASES: Record<TimePhase, Atmosphere> = {
  dawn: {
    phase: 'dawn',
    backdropCss: 'linear-gradient(to bottom, #3a2740 0%, #6a4242 38%, #2a1a12 72%, #1e140e 100%)',
    hemiSky: 0xffc9a0, hemiGround: 0x2a1f18, hemiIntensity: 0.7,
    dirColor: 0xffd9b0, dirIntensity: 1.2, exposure: 1.05,
  },
  day: {
    phase: 'day',
    backdropCss: 'linear-gradient(to bottom, #6a7d96 0%, #7d6a50 46%, #2a1c14 80%, #1e140e 100%)',
    hemiSky: 0xfff3d8, hemiGround: 0x3a2c1e, hemiIntensity: 1.0,
    dirColor: 0xffe6c0, dirIntensity: 1.7, exposure: 1.15,
  },
  golden: {
    phase: 'golden',
    backdropCss: 'linear-gradient(to bottom, #c97a3a 0%, #9a4a2a 45%, #321e12 80%, #1e140e 100%)',
    hemiSky: 0xffd2a0, hemiGround: 0x2a1c12, hemiIntensity: 0.85,
    dirColor: 0xffb060, dirIntensity: 1.6, exposure: 1.2,
  },
  dusk: {
    phase: 'dusk',
    backdropCss: 'linear-gradient(to bottom, #2a1e30 0%, #3a2418 48%, #1d130c 82%, #16100b 100%)',
    hemiSky: 0xffb98a, hemiGround: 0x241a12, hemiIntensity: 0.7,
    dirColor: 0xffd9a8, dirIntensity: 1.4, exposure: 1.12,
  },
  night: {
    phase: 'night',
    backdropCss: 'linear-gradient(to bottom, #14182a 0%, #181410 55%, #100c08 100%)',
    hemiSky: 0x8aa0c0, hemiGround: 0x14110b, hemiIntensity: 0.5,
    dirColor: 0x9fb3d8, dirIntensity: 0.9, exposure: 1.0,
  },
  deepNight: {
    phase: 'deepNight',
    backdropCss: 'linear-gradient(to bottom, #0c1020 0%, #120e0a 60%, #0a0806 100%)',
    hemiSky: 0x6a7da0, hemiGround: 0x100c08, hemiIntensity: 0.4,
    dirColor: 0x8aa0d0, dirIntensity: 0.7, exposure: 1.0,
  },
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

export function getAtmosphere(date: Date = new Date()): Atmosphere {
  return PHASES[getTimePhase(date)]
}
