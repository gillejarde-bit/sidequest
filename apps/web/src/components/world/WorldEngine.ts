// ─────────────────────────────────────────────────────────────────────────────
// WorldEngine — the isometric Into-the-Breach-style board.
//
//  · 8x8 sliding window over an infinite seeded world (GRID offsets -3…+4)
//  · 4x4 discovered core (CORE offsets -1…+2); 2-tile fog ring around it
//  · step one tile → a new row pops in ahead, the far row sinks away
//  · three tile states: fog (never seen, cloud puffs) · memory (seen, dimmed)
//    · core (lit, torch-warmed, structures alive)
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three'
import { gsap } from 'gsap'
import { generateTile, TEMPLATES, tileRng, type TemplateId, type TileSpec } from './templates'
import { tileKey, type GeoOrigin, type WorldPoi } from './osm'
import {
  buildFogPuffs, buildNature, buildPathPad, buildPlayer, buildQuestFlag, buildStructure,
  disposeObject, setGroupTone, GROUND_COLORS,
} from './structures'
import { makeLabel, releaseLabel } from './labels'

const GRID_MIN = -3
const GRID_MAX = 4
const CORE_MIN = -1
const CORE_MAX = 2

type Zone = 'core' | 'memory' | 'fog'

interface Tile {
  wx: number
  wz: number
  spec: TileSpec
  root: THREE.Group
  ground: THREE.Mesh
  groundMat: THREE.MeshLambertMaterial
  content: THREE.Group | null
  puffs: THREE.Group | null
  path: THREE.Group | null
  flag: THREE.Group | null
  label: THREE.Sprite | null
  zone: Zone
  tone: { b: number; d: number }
  phase: number
}

export interface QuestPin {
  id: string
  name: string
}

export interface MapTile {
  wx: number
  wz: number
  ground: TileSpec['ground']
  template: TemplateId | null
  zone: 'core' | 'seen' | 'fog'
  hasQuest: boolean
  hasPath: boolean
}

export interface DiscoverInfo {
  template: TemplateId
  title: string
  subtitle: string
  color: string
  name: string | null
  xp: number
  isNew: boolean
}

export interface EngineEvents {
  onDiscover?: (info: DiscoverInfo) => void
  onHover?: (label: string | null) => void
  onStep?: (wx: number, wz: number, discoveredCount: number) => void
  onQuestTap?: (questId: string) => void
}

const STORE_KEY = 'sq-world-state:v1'

interface SavedState {
  origin: GeoOrigin
  discovered: string[]
  visits?: Array<[string, number]>
}

function metersBetween(a: GeoOrigin, b: GeoOrigin): number {
  const dy = (a.lat - b.lat) * 110_540
  const dx = (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180)
  return Math.hypot(dx, dy)
}

export class WorldEngine {
  private renderer!: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera!: THREE.OrthographicCamera
  private ctx = gsap.context(() => {})
  private raf = 0
  private clock = new THREE.Clock()
  private raycaster = new THREE.Raycaster()

  private tiles = new Map<string, Tile>()
  private pois = new Map<string, WorldPoi>()
  private townMode = true

  private px = 0
  private pz = 0
  private moving = false
  private disposed = false

  private player!: THREE.Group
  private torch!: THREE.PointLight
  private torchTip: THREE.Mesh | null = null
  private dirLight!: THREE.DirectionalLight
  private shadowPlane!: THREE.Mesh
  private camTarget = new THREE.Vector3()
  private isoOffset = new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(26)

  private embers!: THREE.Points
  private emberData: Array<{ x: number; y: number; z: number; v: number; phase: number }> = []

  private discovered = new Set<string>()
  private visits = new Map<string, number>()
  private quests = new Map<string, QuestPin>()
  private hovered: Tile | null = null
  private lanternLights = 0
  private wingL: THREE.Object3D | null = null
  private wingR: THREE.Object3D | null = null
  private tail: THREE.Object3D | null = null

  origin: GeoOrigin = { lat: 0, lng: 0 }

  private canvas: HTMLCanvasElement
  private events: EngineEvents

  constructor(canvas: HTMLCanvasElement, events: EngineEvents) {
    this.canvas = canvas
    this.events = events
  }

  /** Adopt a saved origin when it's nearby so discovered tiles stay aligned. */
  initOrigin(lat: number, lng: number): GeoOrigin {
    const wanted: GeoOrigin = { lat, lng }
    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as SavedState
        if (metersBetween(saved.origin, wanted) < 5000) {
          this.origin = saved.origin
          this.discovered = new Set(saved.discovered)
          this.visits = new Map(saved.visits ?? [])
          return this.origin
        }
      }
    } catch { /* fresh start */ }
    this.origin = wanted
    return this.origin
  }

  private persist(): void {
    try {
      const keys = [...this.discovered]
      const trimmed = keys.length > 4000 ? keys.slice(keys.length - 4000) : keys
      const visits = [...this.visits.entries()].slice(-4000)
      localStorage.setItem(STORE_KEY, JSON.stringify({ origin: this.origin, discovered: trimmed, visits } satisfies SavedState))
    } catch { /* fine */ }
  }

  start(width: number, height: number): void {
    // alpha:true — the warm fire backdrop is CSS behind the canvas
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.12

    this.scene.background = null
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 100)
    this.resize(width, height)

    // Lights — perpetual cozy dusk
    this.scene.add(new THREE.HemisphereLight(0xffd2a0, 0x241a12, 0.75))
    this.dirLight = new THREE.DirectionalLight(0xffd9a8, 1.6)
    this.dirLight.castShadow = true
    this.dirLight.shadow.mapSize.set(1024, 1024)
    const sc = this.dirLight.shadow.camera
    sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -8; sc.near = 1; sc.far = 50
    this.dirLight.shadow.bias = -0.0005
    this.scene.add(this.dirLight)
    this.scene.add(this.dirLight.target)

    // Shadow-catcher void plane under the floating board
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.28 })
    this.shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), shadowMat)
    this.shadowPlane.rotation.x = -Math.PI / 2
    this.shadowPlane.position.y = -0.6
    this.shadowPlane.receiveShadow = true
    this.scene.add(this.shadowPlane)

    // Player + torch
    this.player = buildPlayer()
    this.player.position.set(this.px, 0, this.pz)
    this.torchTip = this.player.getObjectByName('torch-tip') as THREE.Mesh | null
    this.wingL = this.player.getObjectByName('wing-l') ?? null
    this.wingR = this.player.getObjectByName('wing-r') ?? null
    this.tail = this.player.getObjectByName('tail') ?? null
    this.torch = new THREE.PointLight(0xff9a52, 5, 7, 1.8)
    this.torch.position.set(0, 0.8, 0.05)
    this.player.add(this.torch)
    this.scene.add(this.player)
    this.visits.set(tileKey(this.px, this.pz), Math.max(1, this.visits.get(tileKey(this.px, this.pz)) ?? 0))

    this.buildEmbers()
    this.rebuildWindow(true)
    this.updateCamera(true)

    this.clock.start()
    const loop = () => {
      if (this.disposed) return
      this.tick()
      this.renderer.render(this.scene, this.camera)
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  resize(width: number, height: number): void {
    if (!this.renderer) return
    const aspect = width / Math.max(1, height)
    const halfH = Math.max(5.9, 6.9 / aspect)
    const halfW = halfH * aspect
    this.camera.left = -halfW
    this.camera.right = halfW
    this.camera.top = halfH
    this.camera.bottom = -halfH
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  setPois(pois: Map<string, WorldPoi>, townMode: boolean): void {
    this.pois = pois
    this.townMode = townMode
    // Morph already-visible tiles whose reality changed — staggered wave out
    // from the player, so OSM data "arrives" as a visible pulse.
    for (const tile of this.tiles.values()) {
      const next = generateTile(tile.wx, tile.wz, this.pois.get(tileKey(tile.wx, tile.wz)), this.townMode)
      const changed =
        next.template !== tile.spec.template ||
        next.ground !== tile.spec.ground ||
        next.nature !== tile.spec.nature ||
        next.name !== tile.spec.name
      if (!changed) continue
      const delay = 0.04 * (Math.abs(tile.wx - this.px) + Math.abs(tile.wz - this.pz))
      this.morphTile(tile, next, delay)
    }
  }

  getPlayerTile(): { wx: number; wz: number } {
    return { wx: this.px, wz: this.pz }
  }

  // ── Board management ───────────────────────────────────────────────────────

  private specFor(wx: number, wz: number): TileSpec {
    return generateTile(wx, wz, this.pois.get(tileKey(wx, wz)), this.townMode)
  }

  private zoneFor(wx: number, wz: number): Zone {
    const dx = wx - this.px
    const dz = wz - this.pz
    if (dx >= CORE_MIN && dx <= CORE_MAX && dz >= CORE_MIN && dz <= CORE_MAX) return 'core'
    return this.discovered.has(tileKey(wx, wz)) ? 'memory' : 'fog'
  }

  private toneFor(zone: Zone): { b: number; d: number } {
    if (zone === 'core') return { b: 1, d: 0 }
    if (zone === 'memory') return { b: 0.48, d: 0.45 }
    return { b: 0.2, d: 0.75 }
  }

  private buildTile(wx: number, wz: number): Tile {
    const spec = this.specFor(wx, wz)
    const zone = this.zoneFor(wx, wz)
    const rng = tileRng(wx, wz, 99)

    const root = new THREE.Group()
    root.position.set(wx, 0, wz)

    const water = spec.ground === 'water'
    const gh = water ? 0.16 : 0.22
    const gColor = new THREE.Color(GROUND_COLORS[spec.ground])
    gColor.offsetHSL(0, (rng() - 0.5) * 0.04, (rng() - 0.5) * 0.05)
    const groundMat = new THREE.MeshLambertMaterial({ color: gColor, flatShading: true })
    const ground = new THREE.Mesh(new THREE.BoxGeometry(0.94, gh, 0.94), groundMat)
    ground.position.y = water ? -gh / 2 - 0.04 : -gh / 2
    ground.receiveShadow = true
    ground.castShadow = true
    ground.userData.baseColor = gColor.clone()
    ground.userData.tileKey = tileKey(wx, wz)
    root.add(ground)

    const tile: Tile = {
      wx, wz, spec, root, ground, groundMat,
      content: null, puffs: null, path: null, flag: null, label: null, zone,
      tone: this.toneFor(zone), phase: rng() * Math.PI * 2,
    }

    if (zone === 'fog') {
      tile.puffs = buildFogPuffs(rng)
      root.add(tile.puffs)
    } else {
      this.buildContent(tile, false)
      if (zone === 'core') this.discovered.add(tileKey(wx, wz))
    }

    this.refreshPath(tile)
    this.refreshFlag(tile)
    if (zone === 'core') this.refreshLabel(tile)

    setGroupTone(root, tile.tone.b, tile.tone.d)
    this.scene.add(root)
    this.tiles.set(tileKey(wx, wz), tile)
    return tile
  }

  // ── Paths, flags, labels ───────────────────────────────────────────────────

  /** Templates worth a floating nametag (homes and rocks stay quiet). */
  private static LABELED: Set<TemplateId> = new Set([
    'hearth', 'nightwatch', 'lorehall', 'marketplace', 'waypost',
    'gatheringhall', 'forge', 'lanternpost',
  ])

  private refreshLabel(tile: Tile): void {
    const wanted =
      tile.zone === 'core' && tile.spec.template &&
      (tile.spec.name || WorldEngine.LABELED.has(tile.spec.template))
    if (!wanted) {
      if (tile.label) {
        tile.root.remove(tile.label)
        releaseLabel(tile.label)
        tile.label = null
      }
      return
    }
    if (tile.label) return
    const def = TEMPLATES[tile.spec.template!]
    const text = tile.spec.name || def.title
    const label = makeLabel(text, def.color)
    label.position.set(0, 1.06, 0)
    label.scale.multiplyScalar(0.001) // pop in via gsap
    tile.root.add(label)
    tile.label = label
    const target = { x: label.scale.x * 1000, y: label.scale.y * 1000 }
    this.ctx.add(() => {
      gsap.to(label.scale, { x: target.x, y: target.y, duration: 0.45, ease: 'back.out(2)', delay: 0.25 })
    })
  }

  private refreshFlag(tile: Tile): void {
    const quest = this.quests.get(tileKey(tile.wx, tile.wz))
    if (!quest) {
      if (tile.flag) {
        tile.root.remove(tile.flag)
        disposeObject(tile.flag)
        tile.flag = null
      }
      return
    }
    if (tile.flag) return
    const flag = buildQuestFlag()
    flag.position.set(0.3, 0, -0.3)
    tile.root.add(flag)
    tile.flag = flag
    flag.scale.setScalar(0.01)
    this.ctx.add(() => {
      gsap.to(flag.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'elastic.out(1, 0.6)', delay: 0.15 })
    })
  }

  private refreshPath(tile: Tile): void {
    const k = tileKey(tile.wx, tile.wz)
    const v = this.visits.get(k) ?? 0
    if (tile.path) {
      tile.root.remove(tile.path)
      disposeObject(tile.path)
      tile.path = null
    }
    if (v < 2 || tile.spec.ground === 'water') return
    const connected = (dx: number, dz: number) =>
      (this.visits.get(tileKey(tile.wx + dx, tile.wz + dz)) ?? 0) >= 2
    const wear = Math.min(1, (v - 2) / 4 + 0.25)
    const path = buildPathPad(
      [connected(0, -1), connected(1, 0), connected(0, 1), connected(-1, 0)],
      wear,
      tileRng(tile.wx, tile.wz, 17),
    )
    tile.root.add(path)
    tile.path = path
    setGroupTone(path, tile.tone.b, tile.tone.d)
  }

  /** Bind quests (already geocoded to tiles by the view) onto the board. */
  setQuests(pins: Map<string, QuestPin>): void {
    this.quests = pins
    for (const tile of this.tiles.values()) this.refreshFlag(tile)
  }

  /** Flat-map snapshot: every remembered tile + the current fog ring. */
  getMapData(radius = 28): { px: number; pz: number; tiles: MapTile[] } {
    const out: MapTile[] = []
    const seen = new Set<string>()
    const push = (wx: number, wz: number, zone: MapTile['zone']) => {
      const k = tileKey(wx, wz)
      if (seen.has(k)) return
      seen.add(k)
      const spec = this.specFor(wx, wz)
      out.push({
        wx, wz, ground: spec.ground, template: spec.template, zone,
        hasQuest: this.quests.has(k),
        hasPath: (this.visits.get(k) ?? 0) >= 2,
      })
    }
    for (const k of this.discovered) {
      const [wx, wz] = k.split(',').map(Number)
      if (Math.abs(wx - this.px) > radius || Math.abs(wz - this.pz) > radius) continue
      const dx = wx - this.px
      const dz = wz - this.pz
      const inCore = dx >= CORE_MIN && dx <= CORE_MAX && dz >= CORE_MIN && dz <= CORE_MAX
      push(wx, wz, inCore ? 'core' : 'seen')
    }
    for (const tile of this.tiles.values()) {
      if (tile.zone === 'fog') push(tile.wx, tile.wz, 'fog')
    }
    return { px: this.px, pz: this.pz, tiles: out }
  }

  private buildContent(tile: Tile, pop: boolean): void {
    if (tile.content) return
    const rng = tileRng(tile.wx, tile.wz, 3)
    let group: THREE.Group | null = null
    if (tile.spec.template) {
      group = buildStructure(tile.spec.template, rng)
      if (tile.spec.template === 'lanternpost' && this.lanternLights < 4) {
        const lamp = new THREE.PointLight(0xffcb6b, 2.2, 3.5, 2)
        lamp.position.set(0.16, 0.6, 0)
        group.add(lamp)
        this.lanternLights++
      }
    } else if (tile.spec.nature) {
      group = buildNature(tile.spec.nature, rng)
    }
    if (!group) return
    tile.content = group
    tile.root.add(group)
    if (pop) {
      group.scale.setScalar(0.01)
      this.ctx.add(() => {
        gsap.to(group.scale, { x: 1, y: 1, z: 1, duration: 0.55, ease: 'elastic.out(1, 0.65)', delay: 0.08 })
      })
    }
  }

  private morphTile(tile: Tile, next: TileSpec, delay: number): void {
    this.ctx.add(() => {
      const old = tile.content
      if (old) {
        gsap.to(old.scale, {
          x: 0.01, y: 0.01, z: 0.01, duration: 0.22, ease: 'power2.in', delay,
          onComplete: () => { tile.root.remove(old); disposeObject(old) },
        })
      }
      gsap.delayedCall(delay + 0.2, () => {
        if (this.disposed) return
        tile.spec = next
        tile.content = null
        const gColor = new THREE.Color(GROUND_COLORS[next.ground])
        ;(tile.ground.userData as { baseColor?: THREE.Color }).baseColor = gColor.clone()
        gsap.to(tile.groundMat.color, {
          r: gColor.r * tile.tone.b, g: gColor.g * tile.tone.b, b: gColor.b * tile.tone.b, duration: 0.4,
        })
        if (tile.zone !== 'fog') {
          this.buildContent(tile, true)
          if (tile.content) setGroupTone(tile.content, tile.tone.b, tile.tone.d)
        }
        if (tile.label) {
          tile.root.remove(tile.label)
          releaseLabel(tile.label)
          tile.label = null
        }
        if (tile.zone === 'core') this.refreshLabel(tile)
      })
    })
  }

  private removeTile(tile: Tile, animated: boolean): void {
    this.tiles.delete(tileKey(tile.wx, tile.wz))
    if (this.hovered === tile) this.hovered = null
    if (tile.label) {
      tile.root.remove(tile.label)
      releaseLabel(tile.label)
      tile.label = null
    }
    if (!animated) {
      this.scene.remove(tile.root)
      disposeObject(tile.root)
      return
    }
    this.ctx.add(() => {
      gsap.to(tile.root.position, { y: -1.9, duration: 0.4, ease: 'power2.in', delay: Math.random() * 0.06 })
      gsap.to(tile.root.scale, {
        x: 0.7, y: 0.7, z: 0.7, duration: 0.4, ease: 'power2.in',
        onComplete: () => { this.scene.remove(tile.root); disposeObject(tile.root) },
      })
    })
  }

  private spawnTile(wx: number, wz: number, order: number): void {
    const tile = this.buildTile(wx, wz)
    tile.root.position.y = -1.7
    tile.root.scale.setScalar(0.01)
    const delay = order * 0.028 + Math.random() * 0.05
    this.ctx.add(() => {
      gsap.to(tile.root.position, { y: 0, duration: 0.5, ease: 'back.out(1.5)', delay })
      gsap.to(tile.root.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(1.5)', delay })
    })
  }

  private rebuildWindow(initial: boolean): void {
    for (let dx = GRID_MIN; dx <= GRID_MAX; dx++) {
      for (let dz = GRID_MIN; dz <= GRID_MAX; dz++) {
        const wx = this.px + dx
        const wz = this.pz + dz
        if (!this.tiles.has(tileKey(wx, wz))) {
          if (initial) this.spawnTile(wx, wz, Math.abs(dx) + Math.abs(dz))
          else this.buildTile(wx, wz)
        }
      }
    }
    this.persist()
  }

  private setZone(tile: Tile, zone: Zone, announce: boolean): void {
    if (tile.zone === zone) return
    tile.zone = zone
    const target = this.toneFor(zone)
    const k = tileKey(tile.wx, tile.wz)

    if (zone !== 'fog' && tile.puffs) {
      const puffs = tile.puffs
      tile.puffs = null
      this.ctx.add(() => {
        puffs.children.forEach((puff, i) => {
          gsap.to(puff.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.4, ease: 'power2.in', delay: i * 0.05 })
        })
        gsap.to(puffs.position, {
          y: 0.5, duration: 0.5, ease: 'power1.out',
          onComplete: () => { tile.root.remove(puffs); disposeObject(puffs) },
        })
      })
    }

    if (zone === 'core') {
      const isNew = !this.discovered.has(k)
      this.discovered.add(k)
      this.buildContent(tile, isNew)
      if (tile.content) setGroupTone(tile.content, tile.tone.b, tile.tone.d)
      if (announce && isNew && tile.spec.template) {
        const def = TEMPLATES[tile.spec.template]
        this.events.onDiscover?.({
          template: def.id, title: def.title, subtitle: def.subtitle,
          color: def.color, name: tile.spec.name, xp: def.xp, isNew: true,
        })
      }
    } else if (zone === 'memory') {
      this.buildContent(tile, false)
    }

    this.refreshLabel(tile)

    this.ctx.add(() => {
      gsap.to(tile.tone, {
        b: target.b, d: target.d, duration: 0.6, ease: 'power2.out',
        onUpdate: () => setGroupTone(tile.root, tile.tone.b, tile.tone.d),
      })
    })
  }

  // ── Movement ───────────────────────────────────────────────────────────────

  move(dx: number, dz: number): void {
    if (this.moving || this.disposed || (dx === 0 && dz === 0)) return
    this.moving = true
    this.px += Math.sign(dx)
    this.pz += Math.sign(dz)

    // Despawn tiles that left the window; spawn the incoming edge.
    for (const tile of [...this.tiles.values()]) {
      const ox = tile.wx - this.px
      const oz = tile.wz - this.pz
      if (ox < GRID_MIN || ox > GRID_MAX || oz < GRID_MIN || oz > GRID_MAX) {
        this.removeTile(tile, true)
      }
    }
    let order = 0
    for (let a = GRID_MIN; a <= GRID_MAX; a++) {
      for (let b = GRID_MIN; b <= GRID_MAX; b++) {
        const wx = this.px + a
        const wz = this.pz + b
        if (!this.tiles.has(tileKey(wx, wz))) this.spawnTile(wx, wz, order++)
      }
    }
    for (const tile of this.tiles.values()) {
      this.setZone(tile, this.zoneFor(tile.wx, tile.wz), true)
    }

    // Footsteps wear a path: count the visit, refresh this tile + neighbors
    const landedKey = tileKey(this.px, this.pz)
    this.visits.set(landedKey, Math.min(9, (this.visits.get(landedKey) ?? 0) + 1))
    for (const [ox, oz] of [[0, 0], [0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
      const t = this.tiles.get(tileKey(this.px + ox, this.pz + oz))
      if (t) this.refreshPath(t)
    }

    // Player hop
    const targetX = this.px
    const targetZ = this.pz
    this.player.rotation.y = Math.atan2(Math.sign(dx), Math.sign(dz))
    this.ctx.add(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          this.moving = false
          this.events.onStep?.(this.px, this.pz, this.discovered.size)
        },
      })
      tl.to(this.player.position, { x: targetX, z: targetZ, duration: 0.38, ease: 'power1.inOut' }, 0)
      tl.to(this.player.position, { y: 0.34, duration: 0.19, ease: 'power2.out' }, 0)
      tl.to(this.player.position, { y: 0, duration: 0.19, ease: 'power2.in' }, 0.19)
      tl.to(this.player.scale, { y: 0.82, x: 1.12, z: 1.12, duration: 0.09, ease: 'power1.out' }, 0.38)
      tl.to(this.player.scale, { y: 1, x: 1, z: 1, duration: 0.18, ease: 'elastic.out(1.2, 0.6)' }, 0.47)
    })

    this.updateCamera(false)
    this.persist()
  }

  /** One step toward a target tile (dominant axis first) — used by GPS sync. */
  stepToward(wx: number, wz: number): void {
    if (this.moving) return
    const dx = wx - this.px
    const dz = wz - this.pz
    if (dx === 0 && dz === 0) return
    if (Math.abs(dx) >= Math.abs(dz)) this.move(Math.sign(dx), 0)
    else this.move(0, Math.sign(dz))
  }

  private updateCamera(snap: boolean): void {
    const cx = this.px + (GRID_MIN + GRID_MAX) / 2
    const cz = this.pz + (GRID_MIN + GRID_MAX) / 2
    const apply = () => {
      this.camera.position.copy(this.camTarget).add(this.isoOffset)
      this.camera.lookAt(this.camTarget)
      this.dirLight.position.set(this.camTarget.x + 5, 9, this.camTarget.z + 2)
      this.dirLight.target.position.set(this.camTarget.x, 0, this.camTarget.z)
      this.shadowPlane.position.set(this.camTarget.x, -0.6, this.camTarget.z)
    }
    if (snap) {
      this.camTarget.set(cx, 0, cz)
      apply()
      return
    }
    this.ctx.add(() => {
      gsap.to(this.camTarget, { x: cx, z: cz, duration: 0.5, ease: 'power2.out', onUpdate: apply })
    })
  }

  // ── Pointer interaction (NDC coords from the view) ────────────────────────

  private pickTile(ndcX: number, ndcY: number): Tile | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera)
    const grounds: THREE.Object3D[] = []
    for (const t of this.tiles.values()) grounds.push(t.ground)
    const hits = this.raycaster.intersectObjects(grounds, false)
    if (!hits.length) return null
    const key = (hits[0].object.userData as { tileKey?: string }).tileKey
    return key ? this.tiles.get(key) ?? null : null
  }

  hoverAt(ndcX: number, ndcY: number): void {
    const tile = this.pickTile(ndcX, ndcY)
    if (tile === this.hovered) return
    if (this.hovered) {
      this.hovered.groundMat.emissive.setHex(0x000000)
      this.hovered.groundMat.emissiveIntensity = 0
    }
    this.hovered = tile
    if (!tile) {
      this.events.onHover?.(null)
      return
    }
    tile.groundMat.emissive.setHex(0xf2741e)
    tile.groundMat.emissiveIntensity = 0.22
    if (tile.zone !== 'fog' && tile.spec.template) {
      const def = TEMPLATES[tile.spec.template]
      this.events.onHover?.(tile.spec.name ? `${tile.spec.name} — ${def.title}` : `${def.title} · ${def.subtitle}`)
    } else {
      this.events.onHover?.(tile.zone === 'fog' ? 'Unexplored — tap to wander' : null)
    }
  }

  tapAt(ndcX: number, ndcY: number): void {
    const tile = this.pickTile(ndcX, ndcY)
    if (!tile) return
    const quest = this.quests.get(tileKey(tile.wx, tile.wz))
    if (quest && tile.zone !== 'fog') {
      this.events.onQuestTap?.(quest.id)
      return
    }
    const dx = tile.wx - this.px
    const dz = tile.wz - this.pz
    if (dx === 0 && dz === 0) return
    if (tile.zone === 'core' && tile.spec.template) {
      const def = TEMPLATES[tile.spec.template]
      this.events.onDiscover?.({
        template: def.id, title: def.title, subtitle: def.subtitle,
        color: def.color, name: tile.spec.name, xp: def.xp, isNew: false,
      })
      return
    }
    this.stepToward(tile.wx, tile.wz)
  }

  // ── Ambient life ───────────────────────────────────────────────────────────

  private buildEmbers(): void {
    const N = 60
    const positions = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      this.emberData.push({
        x: (Math.random() - 0.5) * 7,
        y: Math.random() * 2.2,
        z: (Math.random() - 0.5) * 7,
        v: 0.12 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
      })
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: 0xffcb6b, size: 0.05, transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    })
    this.embers = new THREE.Points(geo, mat)
    this.embers.frustumCulled = false
    this.scene.add(this.embers)
  }

  private tick(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05)
    const t = this.clock.elapsedTime

    // Torch flicker — sin stack per the map plan spec
    if (this.torch) {
      const f = Math.sin(t * 9.3) * 0.7 + Math.sin(t * 23.7) * 0.35
      this.torch.intensity = 5 + f
      if (this.torchTip) {
        (this.torchTip.material as THREE.MeshLambertMaterial).emissiveIntensity = 0.85 + f * 0.12
      }
    }

    // Thomas: idle hover-bob + wing flap (quick beats while hopping)
    if (!this.moving && this.player) {
      this.player.position.y = 0.04 + Math.sin(t * 2.1) * 0.03
    }
    const flap = this.moving ? Math.sin(t * 22) * 0.55 : Math.sin(t * 3.1) * 0.12
    if (this.wingL) this.wingL.rotation.z = -(Math.PI / 2 + 0.5) - flap
    if (this.wingR) this.wingR.rotation.z = (Math.PI / 2 + 0.5) + flap
    if (this.tail) this.tail.rotation.x = Math.sin(t * 1.7) * 0.08

    // Quest flags ripple
    for (const tile of this.tiles.values()) {
      if (tile.flag) {
        const banner = tile.flag.getObjectByName('quest-banner')
        if (banner) banner.rotation.y = Math.sin(t * 2.4 + tile.phase) * 0.22
        tile.flag.position.y = Math.sin(t * 1.6 + tile.phase) * 0.012
      }
    }

    // Drifting embers around the player
    if (this.embers) {
      const attr = this.embers.geometry.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < this.emberData.length; i++) {
        const e = this.emberData[i]
        e.y += e.v * dt
        e.x += Math.sin(t * 0.8 + e.phase) * 0.0025
        if (e.y > 2.4) {
          e.y = 0.05
          e.x = (Math.random() - 0.5) * 7
          e.z = (Math.random() - 0.5) * 7
          e.v = 0.12 + Math.random() * 0.3
        }
        attr.setXYZ(i, this.px + e.x, e.y, this.pz + e.z)
      }
      attr.needsUpdate = true
    }

    // Water shimmer + fog puff breathing
    for (const tile of this.tiles.values()) {
      if (tile.spec.ground === 'water') {
        tile.ground.position.y = -0.12 + Math.sin(t * 1.4 + tile.phase) * 0.015
      }
      if (tile.puffs) {
        tile.puffs.position.y = Math.sin(t * 0.9 + tile.phase) * 0.025
        tile.puffs.rotation.y = Math.sin(t * 0.22 + tile.phase) * 0.08
      }
    }
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.ctx.revert()
    for (const tile of [...this.tiles.values()]) this.removeTile(tile, false)
    if (this.player) { this.scene.remove(this.player); disposeObject(this.player) }
    if (this.embers) {
      this.scene.remove(this.embers)
      this.embers.geometry.dispose()
      ;(this.embers.material as THREE.Material).dispose()
    }
    if (this.shadowPlane) {
      this.shadowPlane.geometry.dispose()
      ;(this.shadowPlane.material as THREE.Material).dispose()
    }
    this.renderer?.dispose()
  }
}
