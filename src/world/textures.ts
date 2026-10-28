import * as THREE from 'three'
import type { FloorType, WallType } from '../game/data/types'

/**
 * Texturas procedurais de baixa resolução (estilo retrô, filtro "nearest").
 * Servem de placeholder até entrarem texturas próprias. Para trocar por uma
 * imagem, basta devolver um THREE.Texture carregado em `getTexture`.
 */

export type TextureKey = FloorType | WallType | 'lintel' | 'ceiling' | 'books' | 'darkwood' | 'stone' | 'porcelain' | 'door'

const SIZE = 64

/** Texturas que cobrem um objeto inteiro em vez de repetir (largura × altura em px). */
const CUSTOM_SIZE: Partial<Record<TextureKey, [number, number]>> = {
  // ~1,0 × 2,2 m, mesma densidade de pixels das paredes
  door: [34, 76],
}

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

function grit(ctx: CanvasRenderingContext2D, amount: number, seed: number) {
  const r = rng(seed)
  const img = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * amount
    img.data[i] += n
    img.data[i + 1] += n
    img.data[i + 2] += n
  }
  ctx.putImageData(img, 0, 0)
}

type Painter = (ctx: CanvasRenderingContext2D) => void

const painters: Record<TextureKey, Painter> = {
  checker: (c) => {
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        c.fillStyle = (x + y) % 2 ? '#1c1a18' : '#cfc6b0'
        c.fillRect(x * 32, y * 32, 32, 32)
      }
    grit(c, 26, 3)
  },
  wood: (c) => {
    const r = rng(7)
    for (let i = 0; i < 4; i++) {
      const base = 70 + r() * 25
      c.fillStyle = `rgb(${base + 30},${base},${base * 0.55})`
      c.fillRect(0, i * 16, SIZE, 16)
      c.fillStyle = 'rgba(0,0,0,0.45)'
      c.fillRect(0, i * 16 + 15, SIZE, 1)
      c.fillRect(Math.floor(r() * SIZE), i * 16, 1, 16)
    }
    grit(c, 22, 8)
  },
  darkwood: (c) => {
    painters.wood(c)
    c.fillStyle = 'rgba(20,10,5,0.55)'
    c.fillRect(0, 0, SIZE, SIZE)
  },
  ceiling: (c) => {
    painters.wood(c)
    c.fillStyle = 'rgba(15,8,4,0.7)'
    c.fillRect(0, 0, SIZE, SIZE)
  },
  lintel: (c) => painters.darkwood(c),
  tile: (c) => {
    c.fillStyle = '#d8d2c2'
    c.fillRect(0, 0, SIZE, SIZE)
    c.fillStyle = '#8f887a'
    for (let i = 0; i < SIZE; i += 16) {
      c.fillRect(i, 0, 1, SIZE)
      c.fillRect(0, i, SIZE, 1)
    }
    c.fillStyle = '#b08a3c'
    for (let y = 0; y < SIZE; y += 32)
      for (let x = 0; x < SIZE; x += 32) {
        c.beginPath()
        c.moveTo(x, y - 3)
        c.lineTo(x + 3, y)
        c.lineTo(x, y + 3)
        c.lineTo(x - 3, y)
        c.fill()
      }
    grit(c, 18, 11)
  },
  grass: (c) => {
    c.fillStyle = '#3a4a1e'
    c.fillRect(0, 0, SIZE, SIZE)
    const r = rng(13)
    for (let i = 0; i < 500; i++) {
      c.fillStyle = r() > 0.5 ? '#4f6328' : '#2a3714'
      c.fillRect(Math.floor(r() * SIZE), Math.floor(r() * SIZE), 1, 2)
    }
    grit(c, 14, 14)
  },
  carpet: (c) => {
    c.fillStyle = '#4a1414'
    c.fillRect(0, 0, SIZE, SIZE)
    c.strokeStyle = '#7a5a22'
    c.lineWidth = 2
    c.strokeRect(6, 6, SIZE - 12, SIZE - 12)
    c.fillStyle = '#2c0a0a'
    c.fillRect(24, 24, 16, 16)
    grit(c, 18, 17)
  },
  metal: (c) => {
    c.fillStyle = '#4a4d50'
    c.fillRect(0, 0, SIZE, SIZE)
    c.fillStyle = '#2c2e30'
    c.fillRect(0, 31, SIZE, 2)
    c.fillRect(31, 0, 2, SIZE)
    c.fillStyle = '#6b6f73'
    for (const [x, y] of [
      [4, 4],
      [27, 4],
      [4, 27],
      [27, 27],
      [36, 36],
      [59, 36],
      [36, 59],
      [59, 59],
    ])
      c.fillRect(x, y, 2, 2)
    grit(c, 20, 19)
  },
  wallpaper: (c) => {
    c.fillStyle = '#7a5528'
    c.fillRect(0, 0, SIZE, SIZE)
    c.fillStyle = '#5c3d1a'
    for (let y = 0; y < SIZE; y += 16)
      for (let x = (y / 16) % 2 ? 8 : 0; x < SIZE; x += 16) {
        c.beginPath()
        c.ellipse(x + 4, y + 8, 3, 6, 0, 0, Math.PI * 2)
        c.fill()
      }
    grit(c, 20, 23)
  },
  panel: (c) => {
    c.fillStyle = '#5a4128'
    c.fillRect(0, 0, SIZE, SIZE)
    c.strokeStyle = '#2e2014'
    c.lineWidth = 2
    c.strokeRect(5, 5, SIZE - 10, SIZE - 10)
    c.strokeStyle = '#7a5a38'
    c.lineWidth = 1
    c.strokeRect(8, 8, SIZE - 16, SIZE - 16)
    grit(c, 20, 29)
  },
  brick: (c) => {
    c.fillStyle = '#4a4438'
    c.fillRect(0, 0, SIZE, SIZE)
    const r = rng(31)
    for (let row = 0; row < 8; row++) {
      const off = row % 2 ? 8 : 0
      for (let x = -off; x < SIZE; x += 16) {
        const v = 120 + r() * 30
        c.fillStyle = `rgb(${v},${v * 0.92},${v * 0.75})`
        c.fillRect(x + 1, row * 8 + 1, 14, 6)
      }
    }
    grit(c, 24, 32)
  },
  books: (c) => {
    c.fillStyle = '#2a1a0e'
    c.fillRect(0, 0, SIZE, SIZE)
    const r = rng(37)
    const colors = ['#5a1e1a', '#1e3a2a', '#2a2a4a', '#6a5a2a', '#3a2214', '#4a4a3a']
    for (let shelf = 0; shelf < 4; shelf++) {
      let x = 0
      while (x < SIZE) {
        const w = 2 + Math.floor(r() * 4)
        const h = 10 + Math.floor(r() * 4)
        c.fillStyle = colors[Math.floor(r() * colors.length)]
        c.fillRect(x, shelf * 16 + (14 - h), w - 1, h)
        x += w
      }
      c.fillStyle = '#1a0f07'
      c.fillRect(0, shelf * 16 + 14, SIZE, 2)
    }
    grit(c, 16, 38)
  },
  stone: (c) => {
    c.fillStyle = '#8a8676'
    c.fillRect(0, 0, SIZE, SIZE)
    grit(c, 40, 41)
  },
  porcelain: (c) => {
    c.fillStyle = '#d6d0c0'
    c.fillRect(0, 0, SIZE, SIZE)
    grit(c, 10, 43)
  },
  /** Porta de madeira com 4 almofadas (2 altas em cima, 2 baixas embaixo). */
  door: (c) => {
    const W = c.canvas.width
    const H = c.canvas.height
    const r = rng(47)
    // madeira com veios verticais
    c.fillStyle = '#4e321d'
    c.fillRect(0, 0, W, H)
    for (let x = 0; x < W; x++) {
      if (r() > 0.6) {
        c.fillStyle = r() > 0.5 ? 'rgba(30,16,8,0.35)' : 'rgba(120,80,45,0.25)'
        c.fillRect(x, 0, 1, H)
      }
    }
    const panel = (x: number, y: number, w: number, h: number) => {
      // rebaixo em volta da almofada
      c.fillStyle = '#2a190d'
      c.fillRect(x - 1, y - 1, w + 2, h + 2)
      // almofada
      c.fillStyle = '#5a3a22'
      c.fillRect(x, y, w, h)
      // luz em cima/esquerda, sombra embaixo/direita
      c.fillStyle = '#7a5434'
      c.fillRect(x, y, w, 1)
      c.fillRect(x, y, 1, h)
      c.fillStyle = '#301d0f'
      c.fillRect(x, y + h - 1, w, 1)
      c.fillRect(x + w - 1, y, 1, h)
      // chanfro interno
      c.strokeStyle = 'rgba(25,14,6,0.6)'
      c.lineWidth = 1
      c.strokeRect(x + 3.5, y + 3.5, w - 7, h - 7)
    }
    panel(5, 5, 10, 36)
    panel(19, 5, 10, 36)
    panel(5, 47, 10, 24)
    panel(19, 47, 10, 24)
    // borda da folha
    c.fillStyle = '#24150a'
    c.fillRect(0, 0, W, 1)
    c.fillRect(0, H - 1, W, 1)
    c.fillRect(0, 0, 1, H)
    c.fillRect(W - 1, 0, 1, H)
    grit(c, 14, 48)
  },
}

const cache = new Map<TextureKey, THREE.CanvasTexture>()

function base(key: TextureKey): THREE.CanvasTexture {
  let tex = cache.get(key)
  if (!tex) {
    const canvas = document.createElement('canvas')
    ;[canvas.width, canvas.height] = CUSTOM_SIZE[key] ?? [SIZE, SIZE]
    painters[key](canvas.getContext('2d')!)
    tex = new THREE.CanvasTexture(canvas)
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.NearestFilter
    tex.generateMipmaps = false
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.colorSpace = THREE.SRGBColorSpace
    cache.set(key, tex)
  }
  return tex
}

/** Textura repetida para cobrir `width` × `height` metros (1 repetição a cada `tile` metros). */
export function getTexture(key: TextureKey, width: number, height: number, tile = 1.6): THREE.Texture {
  const tex = base(key).clone()
  tex.repeat.set(Math.max(width / tile, 0.25), Math.max(height / tile, 0.25))
  tex.needsUpdate = true
  return tex
}
