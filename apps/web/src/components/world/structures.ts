// ─────────────────────────────────────────────────────────────────────────────
// Low-poly structure builders. Every building is hand-assembled from
// boxes / cylinders / cones with flat-shaded Lambert materials — no textures,
// no external assets. You own every polygon.
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three'
import { hash2 } from './templates'
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

// ── Seamless fog bank ─────────────────────────────────────────────────────────
// One continuous rolling fog instead of per-tile cloud puffs. Each undiscovered
// tile gets a slice of the bank: a solid (slightly oversized) body so neighbours
// overlap with no vertical seams, topped by a crown whose vertex heights come
// from a value-noise field sampled in WORLD space — so adjacent tiles meet at the
// exact same height and read as a single unbroken sea of fog.

const FOG_BODY = 0x2b1e15
const FOG_CROWN = 0x3a2a1d

function fHash(ix: number, iz: number): number {
  return (hash2(ix, iz, 4242) % 10000) / 10000
}
function fSmooth(t: number): number {
  return t * t * (3 - 2 * t)
}
/** Continuous value noise in [0,1], identical for every fog tile. */
function fogNoise(x: number, z: number): number {
  const s = 0.55
  const X = x * s
  const Z = z * s
  const ix = Math.floor(X)
  const iz = Math.floor(Z)
  const fx = fSmooth(X - ix)
  const fz = fSmooth(Z - iz)
  const a = fHash(ix, iz)
  const b = fHash(ix + 1, iz)
  const c = fHash(ix, iz + 1)
  const d = fHash(ix + 1, iz + 1)
  const top = a + (b - a) * fx
  const bot = c + (d - c) * fx
  return top + (bot - top) * fz
}
/** World-space height of the top of the fog at a point. */
export function fogTopY(worldX: number, worldZ: number): number {
  return 0.26 + fogNoise(worldX, worldZ) * 0.22
}

/**
 * One tile's slice of the seamless fog bank. `noTone` keeps it dark regardless of
 * the tile's reveal tone. Materials are transparent so the engine can dissolve
 * the slice when the tile is discovered.
 */
export function buildFogCap(wx: number, wz: number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'fog-cap'

  // Body — fills below the crown; oversized 1.06 so neighbours fuse seamlessly.
  const bodyMat = new THREE.MeshLambertMaterial({ color: FOG_BODY, flatShading: true, transparent: true, opacity: 1 })
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.34, 1.06), bodyMat)
  body.position.y = 0.12
  body.castShadow = false
  body.receiveShadow = false
  ;(body.userData as ToneUserData).noTone = true
  g.add(body)

  // Crown — rolling top; heights from the shared world-noise field = no seams.
  const half = 0.54
  const N = 2
  const pos: number[] = []
  const idx: number[] = []
  const at = (i: number, j: number) => i * (N + 1) + j
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      const lx = -half + (i / N) * 2 * half
      const lz = -half + (j / N) * 2 * half
      pos.push(lx, fogTopY(wx + lx, wz + lz), lz)
    }
  }
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      idx.push(at(i, j), at(i, j + 1), at(i + 1, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1))
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  const crownMat = new THREE.MeshLambertMaterial({ color: FOG_CROWN, flatShading: true, transparent: true, opacity: 1, side: THREE.DoubleSide })
  const crown = new THREE.Mesh(geo, crownMat)
  crown.castShadow = false
  crown.receiveShadow = false
  ;(crown.userData as ToneUserData).noTone = true
  g.add(crown)

  return g
}

// ── Player avatar marker ──────────────────────────────────────────────────────
// A low-poly map pin whose medallion shows the user's profile picture. The photo
// lives on a camera-facing sprite (so it never turns away when the player pivots);
// the pin body is a faceted cone so its rotation is invisible.

/** Draw a circular profile medallion (photo or initial) with an ember ring. */
function drawAvatarCanvas(img: HTMLImageElement | null, initial: string): HTMLCanvasElement {
  const S = 168
  const c = document.createElement('canvas')
  c.width = S
  c.height = S
  const x = c.getContext('2d')!
  const cx = S / 2
  const cy = S / 2
  const r = S / 2 - 12
  // ember outer ring → ink keyline → photo
  x.beginPath(); x.arc(cx, cy, r + 9, 0, Math.PI * 2); x.fillStyle = '#F2741E'; x.fill()
  x.beginPath(); x.arc(cx, cy, r + 4, 0, Math.PI * 2); x.fillStyle = '#3A2A20'; x.fill()
  x.save()
  x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.clip()
  if (img && img.width > 0) {
    const ar = img.width / img.height
    let dw = 2 * r
    let dh = 2 * r
    let dx = cx - r
    let dy = cy - r
    if (ar > 1) { dw = 2 * r * ar; dx = cx - dw / 2 } else { dh = (2 * r) / ar; dy = cy - dh / 2 }
    x.drawImage(img, dx, dy, dw, dh)
  } else {
    x.fillStyle = '#33231A'; x.fillRect(cx - r, cy - r, 2 * r, 2 * r)
    x.fillStyle = '#F5E6D3'
    x.font = `700 ${Math.floor(r * 1.1)}px 'Hanken Grotesk', system-ui, sans-serif`
    x.textAlign = 'center'
    x.textBaseline = 'middle'
    x.fillText(initial.toUpperCase(), cx, cy + 2)
  }
  x.restore()
  return c
}

/**
 * Paint a medallion onto the avatar sprite. Shows the initial immediately, then
 * swaps in the real photo once it loads CORS-clean (errors keep the initial).
 */
export function applyAvatarToSprite(sprite: THREE.Sprite, url: string | null, initial: string): void {
  const mat = sprite.material as THREE.SpriteMaterial
  const placeholder = new THREE.CanvasTexture(drawAvatarCanvas(null, initial || '◆'))
  placeholder.colorSpace = THREE.SRGBColorSpace
  mat.map?.dispose()
  mat.map = placeholder
  mat.needsUpdate = true
  if (!url) return
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    const t = new THREE.CanvasTexture(drawAvatarCanvas(img, initial || '◆'))
    t.colorSpace = THREE.SRGBColorSpace
    mat.map?.dispose()
    mat.map = t
    mat.needsUpdate = true
  }
  img.onerror = () => { /* keep the initial medallion */ }
  img.src = url
}

/**
 * The player marker — a low-poly pin with the user's profile medallion.
 * (Swap point: everything else references the group + the 'avatar' / 'torch-tip'
 * named children, not the specific shapes.)
 */
export function buildPlayer(opts?: { avatarUrl?: string | null; initial?: string }): THREE.Group {
  const g = new THREE.Group()
  const initial = (opts?.initial || '◆').slice(0, 1)

  // Pin body — faceted cone tapering to a point at the ground (rotation-safe).
  const stem = cone(g, 0.18, 0.44, P.ember, [0, 0.27, 0], 6)
  stem.rotation.x = Math.PI // tip down

  // Collar ring under the medallion — a low-poly torus of ember.
  const collarMat = lambert(P.emberDeep)
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 5, 8), collarMat)
  collar.position.set(0, 0.5, 0)
  collar.rotation.x = Math.PI / 2
  register(collar, collarMat)
  g.add(collar)

  // Glow gem at the tip — carries the torch flicker.
  const gem = sphere(g, 0.05, P.goldSoft, [0, 0.06, 0], 0.9)
  gem.name = 'torch-tip'

  // Profile medallion — camera-facing sprite, always readable.
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }))
  sprite.name = 'avatar'
  sprite.scale.set(0.5, 0.5, 1)
  sprite.position.set(0, 0.62, 0)
  sprite.renderOrder = 60
  ;(sprite.userData as ToneUserData).noTone = true
  g.add(sprite)
  applyAvatarToSprite(sprite, opts?.avatarUrl ?? null, initial)

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
