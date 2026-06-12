// Canvas-texture nametag sprites for buildings on the isometric board.
// Textures are cached per (text, accent) so repeated names cost one canvas.

import * as THREE from 'three'

interface LabelEntry {
  texture: THREE.CanvasTexture
  aspect: number // width / height
  refs: number
}

const cache = new Map<string, LabelEntry>()

function drawLabel(text: string, accent: string): { canvas: HTMLCanvasElement; aspect: number } {
  const dpr = 2
  const fontPx = 22
  const padX = 18
  const padY = 12
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  ctx.font = `700 ${fontPx}px 'Hanken Grotesk', system-ui, sans-serif`
  const textW = Math.ceil(ctx.measureText(text).width)
  const w = textW + padX * 2
  const h = fontPx + padY * 2
  canvas.width = w * dpr
  canvas.height = h * dpr
  ctx.scale(dpr, dpr)

  // chunky low-poly tag: flat fill, hard accent edge, cut corners
  const cut = 7
  ctx.beginPath()
  ctx.moveTo(cut, 0)
  ctx.lineTo(w - cut, 0)
  ctx.lineTo(w, cut)
  ctx.lineTo(w, h - cut)
  ctx.lineTo(w - cut, h)
  ctx.lineTo(cut, h)
  ctx.lineTo(0, h - cut)
  ctx.lineTo(0, cut)
  ctx.closePath()
  ctx.fillStyle = 'rgba(30, 20, 14, 0.88)'
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = accent
  ctx.globalAlpha = 0.85
  ctx.stroke()
  ctx.globalAlpha = 1

  ctx.font = `700 ${fontPx}px 'Hanken Grotesk', system-ui, sans-serif`
  ctx.fillStyle = '#F5E6D3'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillText(text, w / 2, h / 2 + 1)

  return { canvas, aspect: w / h }
}

export function truncateLabel(text: string, max = 20): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/** Create (or reuse) a floating nametag sprite. Call releaseLabel() when done. */
export function makeLabel(rawText: string, accent: string): THREE.Sprite {
  const text = truncateLabel(rawText)
  const key = `${accent}|${text}`
  let entry = cache.get(key)
  if (!entry) {
    const { canvas, aspect } = drawLabel(text, accent)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    entry = { texture, aspect, refs: 0 }
    cache.set(key, entry)
  }
  entry.refs++

  const mat = new THREE.SpriteMaterial({
    map: entry.texture,
    transparent: true,
    depthTest: false, // never clipped by rooftops
  })
  const sprite = new THREE.Sprite(mat)
  const height = 0.26
  sprite.scale.set(height * entry.aspect, height, 1)
  sprite.renderOrder = 50
  sprite.userData.labelKey = key
  sprite.userData.noTone = true
  return sprite
}

export function releaseLabel(sprite: THREE.Sprite): void {
  const key = sprite.userData.labelKey as string | undefined
  sprite.material.dispose()
  if (!key) return
  const entry = cache.get(key)
  if (!entry) return
  entry.refs--
  if (entry.refs <= 0) {
    entry.texture.dispose()
    cache.delete(key)
  }
}
