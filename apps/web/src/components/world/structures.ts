// ─────────────────────────────────────────────────────────────────────────────
// Low-poly structure builders. Every building is hand-assembled from
// boxes / cylinders / cones with flat-shaded Lambert materials — no textures,
// no external assets. You own every polygon.
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three'
import type { TemplateId } from './templates'
import type { GroundKind, NatureKind } from './templates'

// SideQuest palette (mirrors styles/tokens.css)
export const P = {
  bg: 0x1e140e,
  surface: 0x2a1c14,
  card: 0x33231a,
  cream: 0xf5e6d3,
  banner: 0xf5dfa8,
  ember: 0xf2741e,
  emberSoft: 0xff9a52,
  emberDeep: 0xd85a30,
  gold: 0xf6a623,
  goldSoft: 0xffcb6b,
  sage: 0x5fa88f,
  sageDeep: 0x3e7a66,
  heart: 0xe2655b,
  ink: 0x3a2a20,
  wood: 0x8a5a36,
  woodDark: 0x6b4a2e,
  brick: 0xc98a5b,
  sand: 0xb08860,
  stone: 0x8a7560,
} as const

export const GROUND_COLORS: Record<GroundKind, number> = {
  grass: 0x7c9a5e,
  park: 0x6e945c,
  soil: 0x9c7a55,
  plaza: 0xa89274,
  water: 0x3e7a66,
}

// Every mesh remembers its true colors so the engine can dim/desaturate
// whole tiles for the fog + memory zones, then restore them on reveal.
export interface ToneUserData {
  baseColor?: THREE.Color
  baseEmissive?: number
  noTone?: boolean
}

function lambert(color: number, emissive = 0x000000, emissiveIntensity = 0): THREE.MeshLambertMaterial {
  const m = new THREE.MeshLambertMaterial({ color, flatShading: true })
  if (emissiveIntensity > 0) {
    m.emissive = new THREE.Color(emissive)
    m.emissiveIntensity = emissiveIntensity
  }
  return m
}

function register(mesh: THREE.Mesh, mat: THREE.MeshLambertMaterial): void {
  const ud = mesh.userData as ToneUserData
  ud.baseColor = mat.color.clone()
  ud.baseEmissive = mat.emissiveIntensity
  mesh.castShadow = true
  mesh.receiveShadow = true
}

type V3 = [number, number, number]

function box(g: THREE.Group, size: V3, color: number, pos: V3, ry = 0, glow = 0, glowColor = 0xffb870): THREE.Mesh {
  const mat = lambert(color, glowColor, glow)
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat)
  mesh.position.set(...pos)
  mesh.rotation.y = ry
  register(mesh, mat)
  g.add(mesh)
  return mesh
}

function cyl(g: THREE.Group, rTop: number, rBot: number, h: number, color: number, pos: V3, seg = 8, glow = 0, glowColor = 0xffb870): THREE.Mesh {
  const mat = lambert(color, glowColor, glow)
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat)
  mesh.position.set(...pos)
  register(mesh, mat)
  g.add(mesh)
  return mesh
}

function cone(g: THREE.Group, r: number, h: number, color: number, pos: V3, seg = 8, ry = 0): THREE.Mesh {
  const mat = lambert(color)
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat)
  mesh.position.set(...pos)
  mesh.rotation.y = ry
  register(mesh, mat)
  g.add(mesh)
  return mesh
}

/** 4-sided pyramid roof, rotated so faces align with the box under it. */
function pyramid(g: THREE.Group, r: number, h: number, color: number, pos: V3): THREE.Mesh {
  return cone(g, r, h, color, pos, 4, Math.PI / 4)
}

function sphere(g: THREE.Group, r: number, color: number, pos: V3, glow = 0, glowColor = 0xffcb6b, detail = 1): THREE.Mesh {
  const mat = lambert(color, glowColor, glow)
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), mat)
  mesh.position.set(...pos)
  register(mesh, mat)
  g.add(mesh)
  return mesh
}

function windowPair(g: THREE.Group, x: number, y: number, z: number, w = 0.09): void {
  box(g, [w, w, 0.02], P.banner, [x - 0.1, y, z], 0, 0.85)
  box(g, [w, w, 0.02], P.banner, [x + 0.1, y, z], 0, 0.85)
}

function tree(g: THREE.Group, x: number, z: number, rng: () => number): void {
  const s = 0.75 + rng() * 0.5
  cyl(g, 0.035 * s, 0.05 * s, 0.18 * s, P.woodDark, [x, 0.09 * s, z], 6)
  cone(g, 0.16 * s, 0.26 * s, P.sageDeep, [x, 0.3 * s, z], 7)
  cone(g, 0.12 * s, 0.22 * s, P.sage, [x, 0.46 * s, z], 7)
}

// ── The 12 templates ─────────────────────────────────────────────────────────

type Builder = (g: THREE.Group, rng: () => number) => void

const BUILDERS: Record<TemplateId, Builder> = {
  hearth(g, rng) {
    box(g, [0.6, 0.42, 0.52], P.brick, [0, 0.21, 0])
    box(g, [0.64, 0.07, 0.56], P.cream, [0, 0.45, 0]) // eave
    pyramid(g, 0.46, 0.3, P.emberDeep, [0, 0.63, 0])
    box(g, [0.1, 0.2, 0.1], P.sand, [0.18, 0.85, -0.12]) // chimney
    // striped awning
    for (let i = -1; i <= 1; i++) {
      const m = box(g, [0.14, 0.025, 0.2], i % 2 === 0 ? P.ember : P.cream, [i * 0.15, 0.34, 0.34])
      m.rotation.x = -0.45
    }
    box(g, [0.13, 0.2, 0.03], P.ink, [0, 0.1, 0.265]) // door
    windowPair(g, 0, 0.28, 0.27)
    if (rng() > 0.5) box(g, [0.12, 0.12, 0.12], P.wood, [-0.36, 0.06, 0.3], 0.5) // crate outside
  },

  nightwatch(g, rng) {
    const h = 0.55 + rng() * 0.15
    box(g, [0.46, h, 0.46], 0x5c3a2e, [0, h / 2, 0])
    box(g, [0.5, 0.06, 0.5], P.ink, [0, h + 0.03, 0])
    box(g, [0.16, 0.12, 0.03], P.goldSoft, [0.12, h - 0.12, 0.235], 0, 0.9) // glowing sign
    box(g, [0.12, 0.18, 0.03], P.ink, [-0.1, 0.09, 0.235]) // door
    cyl(g, 0.09, 0.1, 0.16, P.wood, [0.3, 0.08, 0.28], 8) // barrel
    box(g, [0.2, 0.02, 0.02], P.woodDark, [0.3, 0.13, 0.28])
    windowPair(g, -0.05, h * 0.66, 0.235, 0.08)
  },

  lorehall(g, rng) {
    box(g, [0.7, 0.4, 0.5], P.sageDeep, [0, 0.2, 0])
    box(g, [0.78, 0.06, 0.58], P.cream, [0, 0.43, 0]) // entablature
    pyramid(g, 0.52, 0.26, 0x2f5f52, [0, 0.59, 0])
    for (let i = 0; i < 4; i++) {
      cyl(g, 0.035, 0.035, 0.36, P.banner, [-0.255 + i * 0.17, 0.18, 0.27], 6)
    }
    box(g, [0.8, 0.06, 0.64], P.stone, [0, 0.03, 0.02]) // steps
    if (rng() > 0.4) sphere(g, 0.05, P.goldSoft, [0, 0.78, 0], 0.6) // finial
  },

  marketplace(g, rng) {
    box(g, [0.66, 0.05, 0.56], P.wood, [0, 0.025, 0]) // deck
    for (const [px, pz] of [[-0.28, -0.22], [0.28, -0.22], [-0.28, 0.22], [0.28, 0.22]] as const) {
      cyl(g, 0.02, 0.02, 0.4, P.woodDark, [px, 0.22, pz], 5)
    }
    const c1 = box(g, [0.74, 0.03, 0.34], P.gold, [0, 0.45, -0.15])
    c1.rotation.x = 0.18
    const c2 = box(g, [0.74, 0.03, 0.34], P.cream, [0, 0.45, 0.15])
    c2.rotation.x = -0.18
    box(g, [0.2, 0.14, 0.14], P.wood, [-0.12, 0.12, 0.05], 0.3) // crates
    box(g, [0.14, 0.1, 0.14], P.brick, [0.16, 0.1, -0.05], -0.2)
    if (rng() > 0.5) sphere(g, 0.045, P.heart, [0.16, 0.18, -0.05], 0, 0xffcb6b, 0) // produce
  },

  waypost(g, rng) {
    const h = 0.8 + rng() * 0.25
    box(g, [0.5, h, 0.44], P.sand, [0, h / 2, 0])
    box(g, [0.54, 0.05, 0.48], P.ink, [0, h + 0.025, 0])
    box(g, [0.5, 0.16, 0.46], P.brick, [0, 0.08, 0.01]) // lit ground floor
    for (let r = 0; r < 3; r++) windowPair(g, 0, 0.3 + r * 0.2, 0.221, 0.07)
    cyl(g, 0.012, 0.012, 0.5, P.ink, [0.32, 0.25, 0.26], 5) // sign pole
    box(g, [0.12, 0.08, 0.02], P.goldSoft, [0.32, 0.44, 0.26], 0, 0.8)
  },

  gatheringhall(g) {
    box(g, [0.56, 0.4, 0.5], P.sand, [0, 0.2, 0])
    pyramid(g, 0.44, 0.42, P.emberDeep, [0, 0.61, 0])
    cyl(g, 0.025, 0.035, 0.22, P.emberDeep, [0, 0.9, 0], 6) // spire
    sphere(g, 0.045, P.goldSoft, [0, 1.03, 0], 0.9)
    cyl(g, 0.07, 0.07, 0.03, P.banner, [0, 0.3, 0.252], 8, 0.8).rotation.x = Math.PI / 2 // round window
    box(g, [0.16, 0.22, 0.03], P.ink, [0, 0.11, 0.252])
  },

  hearthstone(g, rng) {
    const w = 0.42 + rng() * 0.08
    box(g, [w, 0.3, 0.4], 0xd9c4a5, [0, 0.15, 0])
    pyramid(g, w * 0.78, 0.26, P.wood, [0, 0.43, 0])
    box(g, [0.07, 0.16, 0.07], P.stone, [w * 0.28, 0.52, -0.08])
    box(g, [0.1, 0.16, 0.02], P.ink, [-0.08, 0.08, 0.201]) // door
    box(g, [0.08, 0.08, 0.02], P.banner, [0.1, 0.18, 0.201], 0, 0.8) // window
    if (rng() > 0.55) cone(g, 0.07, 0.12, P.sage, [w / 2 + 0.12, 0.06, 0.14], 6) // shrub
  },

  forge(g, rng) {
    box(g, [0.6, 0.36, 0.5], 0x4a3a30, [0, 0.18, 0])
    const r = box(g, [0.64, 0.05, 0.54], P.ink, [0, 0.385, 0])
    r.rotation.z = 0.04
    cyl(g, 0.07, 0.09, 0.42, P.ink, [0.2, 0.55, -0.12], 7)
    cyl(g, 0.075, 0.075, 0.03, P.ember, [0.2, 0.77, -0.12], 7, 1) // glowing rim
    box(g, [0.2, 0.14, 0.03], P.ember, [-0.1, 0.08, 0.252], 0, 0.7) // furnace mouth
    box(g, [0.16, 0.08, 0.1], P.ink, [-0.3, 0.04, 0.3], 0.3) // anvil block
    if (rng() > 0.5) box(g, [0.1, 0.1, 0.1], P.woodDark, [0.32, 0.05, 0.28], 0.6)
  },

  trailpost(g, rng) {
    tree(g, -0.18, -0.1, rng)
    tree(g, 0.2, 0.12, rng)
    if (rng() > 0.45) tree(g, 0.05, -0.28, rng)
    cyl(g, 0.015, 0.015, 0.3, P.woodDark, [-0.28, 0.15, 0.26], 5)
    box(g, [0.16, 0.07, 0.02], P.banner, [-0.28, 0.27, 0.26], -0.3)
    sphere(g, 0.05, P.stone, [0.3, 0.035, -0.3], 0, 0xffcb6b, 0)
  },

  watercourse(g, rng) {
    // The water look lives in the tile itself; this adds life on top.
    const lily = cyl(g, 0.09, 0.09, 0.015, P.sage, [0.15, 0.015, 0.1], 7)
    lily.castShadow = false
    cone(g, 0.02, 0.16, P.sageDeep, [-0.2, 0.08, -0.15], 5)
    cone(g, 0.02, 0.12, P.sageDeep, [-0.26, 0.06, -0.1], 5)
    if (rng() > 0.5) sphere(g, 0.03, P.cream, [0.18, 0.05, 0.12], 0, 0xffcb6b, 0) // duck-ish
  },

  lanternpost(g) {
    cyl(g, 0.1, 0.13, 0.1, P.stone, [0, 0.05, 0], 6)
    cyl(g, 0.022, 0.028, 0.55, P.ink, [0, 0.38, 0], 6)
    box(g, [0.2, 0.02, 0.02], P.ink, [0.07, 0.62, 0])
    sphere(g, 0.06, P.goldSoft, [0.16, 0.56, 0], 1)
    cone(g, 0.05, 0.05, P.ink, [0.16, 0.63, 0], 6)
  },

  unknown(g, rng) {
    const h = 0.3 + rng() * 0.4
    box(g, [0.46, h, 0.42], P.stone, [0, h / 2, 0], rng() * 0.1)
    box(g, [0.5, 0.04, 0.46], 0x6e5d4c, [0, h + 0.02, 0])
  },
}

export function buildStructure(t: TemplateId, rng: () => number): THREE.Group {
  const g = new THREE.Group()
  BUILDERS[t](g, rng)
  g.rotation.y = (Math.floor(rng() * 4) * Math.PI) / 2 // seeded facing
  return g
}

// ── Nature, fog, player ──────────────────────────────────────────────────────

export function buildNature(kind: NatureKind, rng: () => number): THREE.Group {
  const g = new THREE.Group()
  if (kind === 'trees') {
    tree(g, -0.12 + rng() * 0.1, -0.08 + rng() * 0.1, rng)
    if (rng() > 0.4) tree(g, 0.18, 0.15, rng)
  } else if (kind === 'bush') {
    sphere(g, 0.1 + rng() * 0.04, P.sage, [0.05, 0.07, 0.02], 0, 0xffcb6b, 0)
    sphere(g, 0.07, P.sageDeep, [-0.13, 0.05, -0.08], 0, 0xffcb6b, 0)
  } else if (kind === 'rocks') {
    sphere(g, 0.08, P.stone, [0, 0.04, 0], 0, 0xffcb6b, 0).scale.y = 0.6
    sphere(g, 0.05, 0x76624e, [0.16, 0.025, 0.1], 0, 0xffcb6b, 0).scale.y = 0.6
  }
  return g
}

/** Soft dark cloud puffs that sit on undiscovered tiles. */
export function buildFogPuffs(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  const n = 3 + Math.floor(rng() * 2)
  for (let i = 0; i < n; i++) {
    const r = 0.16 + rng() * 0.12
    const mat = new THREE.MeshLambertMaterial({
      color: i % 2 === 0 ? 0x423125 : 0x37281e,
      transparent: true,
      opacity: 0.96,
      flatShading: true,
    })
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat)
    m.position.set(-0.22 + rng() * 0.44, 0.1 + rng() * 0.08, -0.22 + rng() * 0.44)
    m.scale.y = 0.55
    m.rotation.y = rng() * Math.PI
    ;(m.userData as ToneUserData).noTone = true
    m.castShadow = false
    m.receiveShadow = false
    g.add(m)
  }
  return g
}

/**
 * Thomas the Phoenix — the player marker. A simple orange fiery low-poly bird:
 * ember body, gold chest, flame crest, swept wings, glowing three-feather tail.
 * (Swap point: if a custom player icon/model is provided later, replace this
 * builder — everything else references the group, not the parts.)
 */
export function buildPlayer(): THREE.Group {
  const g = new THREE.Group()

  // Body — plump teardrop, leaning slightly forward
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), lambert(P.ember))
  body.position.set(0, 0.26, 0)
  body.scale.set(1, 1.15, 1.3)
  body.rotation.x = -0.18
  register(body, body.material as THREE.MeshLambertMaterial)
  g.add(body)

  // Chest — warm gold glow
  const chest = sphere(g, 0.1, P.gold, [0, 0.22, 0.1], 0.25, 0xffcb6b, 0)
  chest.scale.set(0.9, 1, 0.7)

  // Head + beak
  sphere(g, 0.105, P.emberSoft, [0, 0.47, 0.1], 0, 0xffcb6b, 0)
  cone(g, 0.035, 0.09, P.goldSoft, [0, 0.46, 0.23], 5).rotation.x = Math.PI / 2

  // Flame crest — three little fire tongues
  cone(g, 0.035, 0.12, P.emberDeep, [0, 0.58, 0.04], 5)
  const c2 = cone(g, 0.03, 0.14, P.ember, [0, 0.6, 0.09], 5)
  c2.rotation.x = 0.25
  const c3 = sphere(g, 0.028, P.goldSoft, [0, 0.64, 0.12], 0.9)
  c3.name = 'torch-tip' // crest tip carries the torch glow

  // Wings — swept flame triangles (named for flap animation)
  const wingGeo = new THREE.ConeGeometry(0.07, 0.26, 4)
  for (const side of [-1, 1] as const) {
    const mat = lambert(P.emberDeep)
    const wing = new THREE.Mesh(wingGeo, mat)
    wing.position.set(side * 0.16, 0.3, -0.02)
    wing.rotation.z = side * (Math.PI / 2 + 0.5)
    wing.rotation.y = side * 0.25
    register(wing, mat)
    wing.name = side === -1 ? 'wing-l' : 'wing-r'
    g.add(wing)
  }

  // Tail — three trailing flame feathers, gold → ember
  const tail = new THREE.Group()
  tail.name = 'tail'
  const t1 = cone(tail, 0.035, 0.24, P.goldSoft, [0, 0, 0], 5)
  t1.rotation.x = -2.3
  const t2 = cone(tail, 0.03, 0.2, P.ember, [0.05, 0.01, -0.02], 5)
  t2.rotation.x = -2.5
  t2.rotation.z = -0.2
  const t3 = cone(tail, 0.03, 0.2, P.ember, [-0.05, 0.01, -0.02], 5)
  t3.rotation.x = -2.5
  t3.rotation.z = 0.2
  tail.position.set(0, 0.3, -0.16)
  g.add(tail)

  // Tiny feet
  cyl(g, 0.014, 0.014, 0.08, P.gold, [0.05, 0.04, 0.02], 4)
  cyl(g, 0.014, 0.014, 0.08, P.gold, [-0.05, 0.04, 0.02], 4)

  return g
}

/** Quest flag — an ember pennant planted on a tile that has a quest. */
export function buildQuestFlag(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'quest-flag'
  cyl(g, 0.012, 0.016, 0.5, P.ink, [0, 0.25, 0], 5)
  const banner = box(g, [0.2, 0.11, 0.015], P.ember, [0.11, 0.42, 0], 0, 0.35, 0xff9a52)
  banner.name = 'quest-banner'
  sphere(g, 0.025, P.goldSoft, [0, 0.52, 0], 0.9)
  cyl(g, 0.05, 0.06, 0.04, P.stone, [0, 0.02, 0], 6)
  return g
}

/**
 * Worn footpath overlay — appears once a tile has been walked repeatedly.
 * `conns` = [N(-z), E(+x), S(+z), W(-x)] connections to neighboring path tiles.
 * `wear` 0..1 widens and darkens the trail the more you walk it.
 */
export function buildPathPad(conns: [boolean, boolean, boolean, boolean], wear: number, rng: () => number): THREE.Group {
  const g = new THREE.Group()
  const w = 0.1 + wear * 0.08 // half-width of the trail
  const trail = 0x86643f
  const padMat = lambert(trail)
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(w * 1.5, w * 1.6, 0.02, 7), padMat)
  pad.position.y = 0.012
  pad.rotation.y = rng() * Math.PI
  pad.castShadow = false
  pad.receiveShadow = true
  register(pad, padMat)
  pad.castShadow = false
  g.add(pad)

  const dirs: Array<[number, number]> = [[0, -1], [1, 0], [0, 1], [-1, 0]]
  conns.forEach((on, i) => {
    if (!on) return
    const [dx, dz] = dirs[i]
    const segMat = lambert(trail)
    const seg = new THREE.Mesh(new THREE.BoxGeometry(dx !== 0 ? 0.5 : w * 2, 0.018, dz !== 0 ? 0.5 : w * 2), segMat)
    seg.position.set(dx * 0.25, 0.01, dz * 0.25)
    seg.castShadow = false
    seg.receiveShadow = true
    register(seg, segMat)
    seg.castShadow = false
    g.add(seg)
  })

  // a few pressed-in pebbles
  for (let i = 0; i < 2 + Math.floor(wear * 3); i++) {
    const p = sphere(g, 0.014 + rng() * 0.012, 0x9c8568, [(rng() - 0.5) * 0.5, 0.015, (rng() - 0.5) * 0.5], 0, 0xffcb6b, 0)
    p.scale.y = 0.4
    p.castShadow = false
  }
  return g
}

// ── Tone control (fog / memory / lit zones) ──────────────────────────────────

const _gray = new THREE.Color()

/**
 * brightness 1 + desat 0 → full color. The engine tweens these per tile:
 * fog ≈ (0.18, 0.8) · memory ≈ (0.45, 0.5) · discovered core = (1, 0).
 */
export function setGroupTone(root: THREE.Object3D, brightness: number, desat: number): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!(mesh as THREE.Mesh).isMesh) return
    const ud = mesh.userData as ToneUserData
    if (ud.noTone || !ud.baseColor) return
    const mat = mesh.material as THREE.MeshLambertMaterial
    const lum = ud.baseColor.r * 0.299 + ud.baseColor.g * 0.587 + ud.baseColor.b * 0.114
    _gray.setRGB(lum, lum, lum)
    mat.color.copy(ud.baseColor).lerp(_gray, desat).multiplyScalar(brightness)
    if (ud.baseEmissive !== undefined && ud.baseEmissive > 0) {
      mat.emissiveIntensity = ud.baseEmissive * Math.max(0, brightness * 1.4 - 0.4)
    }
  })
}

export function disposeObject(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.geometry.dispose()
    const m = mesh.material
    if (Array.isArray(m)) m.forEach((mm) => mm.dispose())
    else m.dispose()
  })
}
