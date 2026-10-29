import { canvasTexture } from './psx'

/**
 * Texturas das criaturas, pintadas por código em baixa resolução (estilo PS1).
 * Os rostos têm fundo transparente: ficam num plano na frente da cabeça.
 */

let cache: ReturnType<typeof build> | null = null

function build() {
  /** Guardiã: rosto pálido e rachado, olhos fundos, boca entreaberta. */
  const guardiaFace = canvasTexture(16, 20, (c) => {
    c.fillStyle = '#c9c0ae'
    c.beginPath()
    c.ellipse(8, 10, 7, 9.5, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#a89c88'
    c.fillRect(2, 13, 12, 6)
    c.fillStyle = '#140c0c'
    c.fillRect(3, 7, 4, 4) // olho esquerdo (fundo)
    c.fillRect(9, 7, 4, 4)
    c.fillStyle = '#3a2420'
    c.fillRect(3, 6, 4, 1)
    c.fillRect(9, 6, 4, 1)
    c.fillStyle = '#1a0e0e'
    c.fillRect(6, 15, 4, 2) // boca
    c.fillStyle = '#7a6e5e'
    c.fillRect(11, 2, 1, 5) // rachaduras
    c.fillRect(12, 4, 1, 1)
    c.fillRect(4, 12, 1, 3)
  })

  /** Vestido: tecido escuro com dobras verticais e renda na barra. */
  const dress = canvasTexture(16, 32, (c) => {
    c.fillStyle = '#1a1218'
    c.fillRect(0, 0, 16, 32)
    for (let x = 0; x < 16; x += 4) {
      c.fillStyle = '#100a0e'
      c.fillRect(x, 0, 1, 32)
      c.fillStyle = '#261a22'
      c.fillRect(x + 2, 0, 1, 32)
    }
    // renda e babados na barra
    c.fillStyle = '#3a3036'
    for (let x = 0; x < 16; x += 2) c.fillRect(x, 29 - (x % 4 === 0 ? 1 : 0), 1, 2)
    c.fillStyle = '#2c2228'
    c.fillRect(0, 26, 16, 1)
  })

  /** Pele morta (braços, mãos). */
  const skin = canvasTexture(8, 8, (c) => {
    c.fillStyle = '#9d9483'
    c.fillRect(0, 0, 8, 8)
    c.fillStyle = '#7d7466'
    c.fillRect(2, 0, 1, 8)
    c.fillRect(5, 3, 1, 5)
  })

  /** Possessor: rosto que grita. */
  const ghostFace = canvasTexture(16, 20, (c) => {
    c.fillStyle = 'rgba(225,240,232,0.9)'
    c.beginPath()
    c.ellipse(8, 10, 7, 9.5, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#000000'
    c.beginPath()
    c.ellipse(5, 8, 1.8, 2.6, 0.2, 0, Math.PI * 2)
    c.ellipse(11, 8, 1.8, 2.6, -0.2, 0, Math.PI * 2)
    c.fill()
    c.beginPath()
    c.ellipse(8, 15, 2.2, 3.6, 0, 0, Math.PI * 2)
    c.fill()
  })

  /** A cabeça do investigador: olhos fechados, cabelo escuro. */
  const headFace = canvasTexture(16, 20, (c) => {
    c.fillStyle = '#c8a888'
    c.beginPath()
    c.ellipse(8, 11, 7, 8.5, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#2a1c12'
    c.fillRect(1, 0, 14, 5)
    c.fillRect(1, 5, 2, 4)
    c.fillRect(13, 5, 2, 4)
    c.fillStyle = '#5a3a28'
    c.fillRect(4, 10, 3, 1) // olhos fechados
    c.fillRect(9, 10, 3, 1)
    c.fillStyle = '#8a5a48'
    c.fillRect(6, 16, 4, 1) // boca
    c.fillStyle = '#a88a70'
    c.fillRect(7, 12, 2, 3) // nariz
  })

  return { guardiaFace, dress, skin, ghostFace, headFace }
}

export function creatureTextures() {
  cache ??= build()
  return cache
}
