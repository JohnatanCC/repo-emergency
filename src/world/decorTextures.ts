import * as THREE from 'three'

/** Texturas pequenas da decoração, pintadas por código (filtro "nearest", estilo retrô). */

function tex(w: number, h: number, paint: (c: CanvasRenderingContext2D, r: () => number) => void, seed = 1) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  let s = seed
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  paint(canvas.getContext('2d')!, r)
  const t = new THREE.CanvasTexture(canvas)
  t.magFilter = t.minFilter = THREE.NearestFilter
  t.generateMipmaps = false
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

let cache: ReturnType<typeof build> | null = null

function build() {
  /** Retrato escuro: fundo marrom, figura de rosto apagado. */
  const portrait = tex(16, 20, (c) => {
    c.fillStyle = '#2a1e14'
    c.fillRect(0, 0, 16, 20)
    c.fillStyle = '#1a120c'
    c.fillRect(3, 12, 10, 8)
    c.fillStyle = '#8a7258'
    c.beginPath()
    c.ellipse(8, 8, 3.5, 4.5, 0, 0, Math.PI * 2)
    c.fill()
    // olhos riscados
    c.fillStyle = '#0a0604'
    c.fillRect(5, 7, 6, 1)
    c.fillStyle = '#3a2a1a'
    c.fillRect(4, 3, 8, 2)
  })
  /** Paisagem: céu escuro, morro, uma casa com janela acesa. */
  const landscape = tex(24, 16, (c) => {
    c.fillStyle = '#1e2430'
    c.fillRect(0, 0, 24, 16)
    c.fillStyle = '#2a2a1e'
    c.beginPath()
    c.moveTo(0, 16)
    c.lineTo(0, 10)
    c.lineTo(9, 7)
    c.lineTo(24, 11)
    c.lineTo(24, 16)
    c.fill()
    c.fillStyle = '#120e0a'
    c.fillRect(14, 6, 5, 4)
    c.fillStyle = '#b08a3a'
    c.fillRect(16, 7, 1, 1)
    c.fillStyle = '#c8c0a0'
    c.fillRect(3, 2, 2, 2)
  })
  /** Natureza-morta escura. */
  const stillLife = tex(16, 16, (c) => {
    c.fillStyle = '#1a140e'
    c.fillRect(0, 0, 16, 16)
    c.fillStyle = '#5a2a1a'
    c.fillRect(3, 9, 4, 4)
    c.fillStyle = '#6a5a2a'
    c.fillRect(8, 7, 5, 6)
    c.fillStyle = '#2a1a10'
    c.fillRect(0, 13, 16, 3)
  })
  /** Tapete com borda e losango. */
  const rug = tex(24, 36, (c) => {
    c.fillStyle = '#4a1a16'
    c.fillRect(0, 0, 24, 36)
    c.fillStyle = '#2a0e0c'
    c.fillRect(2, 2, 20, 32)
    c.fillStyle = '#6a4a2a'
    c.strokeStyle = '#6a4a2a'
    c.strokeRect(3.5, 3.5, 17, 29)
    c.beginPath()
    c.moveTo(12, 8)
    c.lineTo(18, 18)
    c.lineTo(12, 28)
    c.lineTo(6, 18)
    c.closePath()
    c.fill()
    c.fillStyle = '#2a0e0c'
    c.fillRect(11, 16, 2, 4)
  })
  /** Teia de canto (transparente). */
  const web = tex(32, 32, (c) => {
    c.strokeStyle = 'rgba(210,205,190,0.7)'
    c.lineWidth = 1
    for (let i = 0; i < 7; i++) {
      const a = (i / 6) * (Math.PI / 2)
      c.beginPath()
      c.moveTo(0, 0)
      c.lineTo(Math.cos(a) * 32, Math.sin(a) * 32)
      c.stroke()
    }
    for (let k = 1; k < 6; k++) {
      c.beginPath()
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * (Math.PI / 2)
        const rr = k * 5.5 + (i % 2) * 1.5
        if (i === 0) c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
        else c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
      }
      c.stroke()
    }
  })
  /** Mancha de umidade / sujeira (transparente, borda irregular). */
  const stain = tex(
    16,
    16,
    (c, r) => {
      for (let i = 0; i < 40; i++) {
        c.fillStyle = `rgba(20,14,8,${0.15 + r() * 0.3})`
        const x = 3 + r() * 10
        const y = 2 + r() * 12
        c.fillRect(x, y, 1 + r() * 3, 1 + r() * 4)
      }
    },
    7,
  )
  /** Folha de papel velho com linhas. */
  const paper = tex(8, 10, (c) => {
    c.fillStyle = '#b8ac90'
    c.fillRect(0, 0, 8, 10)
    c.fillStyle = '#6a604c'
    for (let y = 2; y < 9; y += 2) c.fillRect(1, y, 5 + (y % 4 === 0 ? 1 : 0), 1)
  })
  /** Tufo de mato seco (transparente). */
  const grass = tex(
    16,
    16,
    (c, r) => {
      for (let i = 0; i < 14; i++) {
        c.strokeStyle = r() < 0.5 ? '#4a4a26' : '#5a5030'
        c.beginPath()
        const x = 2 + r() * 12
        c.moveTo(x, 16)
        c.lineTo(x + (r() - 0.5) * 8, 2 + r() * 8)
        c.stroke()
      }
    },
    3,
  )
  return { portrait, landscape, stillLife, rug, web, stain, paper, grass }
}

export function decorTextures() {
  cache ??= build()
  return cache
}
