# SideQuest — Living Map: Identity & Season/Time Background Plan

> A plan for a map background (the 3D World's sky/light/air) that changes with the
> real **time of day** and **season**. Grounds the existing "perpetual cozy dusk"
> world (`WorldEngine.ts` lights + `WorldView.tsx` fire backdrop) into a living one.
> Source of intent: the iso-world note *"a tiny day/night or biome-tint toggle
> (reuse the palette)"* + the campfire brand identity.

---

## 0. The one rule (identity north-star)

**The campfire never goes out.** SideQuest is a warm hearth at the center of a
cool, breathing world. Time and season change the **world around the fire** — the
sky, the light, the air — but the things that *are* the fire stay warm and
constant. The fire is the anchor; everything else is weather.

**Always warm, never touched by time/season:** the player torch point-light, the
player medallion, quest-flag flames, the radial ember glow at the base of the
floating board, and the `--sq` ember/gold accent tokens in the UI.

**Modulated by time/season:** the backdrop sky gradient, the hemisphere +
directional light color and intensity, tone-mapping exposure, the ambient
particle (embers / fireflies / petals / leaves / snow), star + moon visibility,
and a subtle hue grade on ground and foliage.

This keeps the brand instantly recognizable at 3am in January and at noon in July.

---

## 1. Time-of-day system

Driven by the user's **real local clock**. Optional refinement: real sun altitude
from their GPS `lat/lng` + date (a small SunCalc-style function) so "golden hour"
is genuinely golden hour everywhere on earth, not a fixed wall-clock band.

Six phases. Each is a *target* the engine eases toward over ~60–90s when a
boundary is crossed (so the day visibly turns); on first load it snaps to the
current phase. Values below are starting points — tune against the hero moments in §4.

| Phase | Local time | Backdrop sky (CSS) | Hemisphere sky / ground | Dir light color / intensity | Exposure | Particle | Sky extras |
|---|---|---|---|---|---|---|---|
| **Dawn** | 05–07 | deep plum → peach horizon | `0xffc9a0` / `0x2a1f18`, 0.70 | `0xffd9b0` / 1.2 | 1.05 | slow embers + low mist | fading stars |
| **Day** | 07–16 | warm cream, faint blue top | `0xfff3d8` / `0x3a2c1e`, 1.00 | `0xffe6c0` / 1.7 | 1.15 | drifting dust motes | — |
| **Golden hour** | 16–18.5 | amber → rose | `0xffd2a0` / `0x2a1c12`, 0.85 | `0xffb060` / 1.6 | 1.20 | thick warm embers | long shadows |
| **Dusk** *(today's look)* | 18.5–20 | ember → indigo | `0xffb98a` / `0x241a12`, 0.70 | `0xffd9a8` / 1.4 | 1.12 | embers | first stars |
| **Night** | 20–23 | indigo → near-black | `0x8aa0c0` / `0x14110b`, 0.50 | `0x9fb3d8` / 0.9 *(moonlight)* | 1.00 | fireflies + embers | stars + moon |
| **Deep night** | 23–05 | near-black, faint ember floor | `0x6a7da0` / `0x100c08`, 0.40 | `0x8aa0d0` / 0.7 | 1.00 | sparse fireflies | dense stars / Milky Way wash |

The current build is permanently the **Dusk** row — it becomes one of six. Note how
the dir light shifts from warm sun (day) to cool moon (night); the *torch* fills the
warmth back in around the player, which is exactly the identity rule in action.

---

## 2. Season system

Driven by the **real date + hemisphere** (sign of GPS latitude, so the southern
hemisphere gets summer in December). Season is a **grade on top** of the time
palette: it tints hue, swaps the signature particle, and nudges foliage/ground.

| Season | Hue grade | Foliage / ground nudge | Signature particle | Accent moment |
|---|---|---|---|---|
| **Spring** | +green, +light | brighter sage, blossom dots | drifting petals (soft pink) | first firefly at dusk |
| **Summer** | warm, saturated | lush deep green, golden grass | heat-haze dust by day, heavy fireflies at night | long golden hour |
| **Autumn** | amber / rust grade | sage → amber trees, warmer soil | falling leaves (ember/gold) | richest golden hour, earlier dusk |
| **Winter** | cool desaturate, blue shadows | muted tones, frost on roofs, optional snow ground | falling snow (cream) | long deep-night; rare aurora wash |

All particles reuse the **existing ember `THREE.Points` system** in `WorldEngine`
— only color, gravity, count and update behavior change per season+time: embers
(warm, rise), fireflies (gold, hover + blink, night), petals (pink, fall + drift),
leaves (amber, fall + tumble), snow (cream, slow fall).

---

## 3. How time × season combine

Season sets the **base palette + particle**; time sets the **light level + sky +
star/moon**. They multiply. A handful of **hero moments** to hand-tune (and use for
marketing screenshots):

- **Autumn · golden hour** — the richest, most amber frame the app can produce.
- **Summer · night** — warm indigo sky, dense fireflies, the fire glowing.
- **Winter · deep night** — blue-black sky, dense stars, slow snow, fire the only warmth.
- **Spring · day** — bright, petals drifting, the most "alive" daytime look.

Everything else interpolates between these anchors.

---

## 4. Implementation

**New pure module `components/world/atmosphere.ts`** (no three.js, unit-testable):

```ts
type TimePhase = 'dawn'|'day'|'golden'|'dusk'|'night'|'deepNight'
type Season    = 'spring'|'summer'|'autumn'|'winter'
interface AtmosphereState {
  backdropCss: string            // for the WorldView fire <div>
  hemiSky: number; hemiGround: number; hemiIntensity: number
  dirColor: number; dirIntensity: number
  exposure: number
  particle: { kind: 'ember'|'firefly'|'petal'|'leaf'|'snow'; color: number; gravity: number; count: number }
  stars: number                  // 0..1 opacity
  moon: number                   // 0..1 opacity
  groundTint: number; groundTintAmt: number  // hue grade applied to GROUND_COLORS
}
getTimePhase(date, sunAltitude?) -> TimePhase
getSeason(date, lat) -> Season
getAtmosphere(date, lat, lng) -> AtmosphereState   // interpolates between adjacent phases
```

Key detail: **interpolate between adjacent phases** by fractional progress, so
17:30 is ~60% golden→dusk rather than a hard step. Same continuous blend across
season boundaries.

**Wiring:**

- `WorldEngine.setAtmosphere(state)` — apply `hemi*` to the `HemisphereLight`,
  `dir*` to the `DirectionalLight`, `exposure` to `renderer.toneMappingExposure`;
  swap the embers material color + per-particle update by `particle.kind`; show/fade
  a **star field** (a `Points` shell, opacity = `stars`) and a **moon** (lit sphere/
  billboard, opacity = `moon`); apply `groundTint` via the existing `setGroupTone`
  hue path. Tween all scalar/color changes with gsap (~1–1.5s) so nothing snaps.
- `WorldView` — compute `getAtmosphere(new Date(), gps.lat, gps.lng)` on mount and
  on a 60s interval; pass to the engine; drive the existing fire backdrop `<div>`
  from `backdropCss` with a CSS `transition`.
- **Minimap** — nudge `COZY_FILTER` by phase (dimmer + cooler at night) so the flat
  minimap matches the world's mood.

**Performance:** one 60s timer; gsap tweens only colors/scalars (cheap); particle
count stays capped (~60); star/moon are static geometry. No per-frame allocation.

**Accessibility:** honor `prefers-reduced-motion` (skip particle motion swaps, set
phases instantly). Day must never wash out the `--sq` overlay HUD (already on
overlay tokens — verify contrast at the brightest "Day · Summer" state).

**Testing / QA:** a hidden override — `?atmo=autumn-night` query param (or a
long-press on the "World" chip) — forces any time×season for screenshots and QA.
Nothing is persisted; the live state is always derived from the clock.

---

## 5. Rollout (shippable in slices)

1. **Time-of-day only** — `atmosphere.ts` + 6-phase lights/backdrop, no season. The single highest-impact slice; ship + screenshot.
2. **Season grade + per-season particles** (petals/leaves/snow/fireflies).
3. **Stars + moon**, hero-moment tuning, minimap filter sync.
4. **Optional polish** — SunCalc sun-altitude refinement; rare weather events (aurora in winter deep-night, light rain).

---

## 6. Drop-in first step (Phase 1 constants)

Replace the fixed lights in `WorldEngine.start()` and the fixed backdrop in
`WorldView` with a lookup keyed by `getTimePhase(new Date())`. Today's values are
exactly the **Dusk** row, so Phase 1 is "generalize what already exists to six
rows + a 60s re-evaluation," not a from-scratch rewrite. Estimated ~1 focused day
for Phase 1, ~1 more for seasons/particles.
