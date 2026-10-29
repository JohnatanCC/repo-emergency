import * as THREE from 'three'

/**
 * Cabeça do Espectro esculpida (sem rosto colado na frente): uma esfera mais
 * densa, achatada nos lados, com as órbitas afundadas, arcada da sobrancelha,
 * nariz, maçãs, bochechas fundas e queixo fino. A textura é projetada de frente
 * e cobre a cabeça inteira (pele, olheiras, escorrido, boca costurada).
 *
 * A cabeça é cortada na linha da boca: a parte de baixo é a mandíbula, que
 * gira numa dobradiça atrás da boca. A costura dos lábios passa por cima do
 * corte, então os pontos se rasgam ao meio quando ela abre.
 */

const R = 0.115
/** Achatada nos lados, um pouco alongada. */
const SCALE = new THREE.Vector3(0.86, 1.1, 0.95)
/** Altura da linha da boca e da dobradiça da mandíbula (atrás da boca). */
export const MOUTH_Y = -0.045
export const JAW_PIVOT = new THREE.Vector3(0, MOUTH_Y, -0.055)
/** Área do rosto na textura (projeção de frente). */
const FACE_W = 0.2
const FACE_H = 0.26

/** Calombo suave: 1 no centro, 0 na borda (raio rx × ry). */
const bump = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) => {
  const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
  return d >= 1 ? 0 : (1 - d) ** 2
}

/** Esculpe o rosto: só na frente (z > 0). */
function sculpt(g: THREE.BufferGeometry) {
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i) * SCALE.x
    const y = p.getY(i) * SCALE.y
    let z = p.getZ(i) * SCALE.z
    if (z > 0) {
      const front = Math.min(1, z / 0.06)
      // órbitas fundas
      z -= 0.026 * (bump(x, y, -0.036, 0.022, 0.03, 0.026) + bump(x, y, 0.036, 0.022, 0.03, 0.026)) * front
      // arcada acima delas
      z += 0.007 * (bump(x, y, -0.036, 0.052, 0.028, 0.012) + bump(x, y, 0.036, 0.052, 0.028, 0.012)) * front
      // nariz fino
      z += 0.016 * bump(x, y, 0, -0.01, 0.012, 0.032) * front
      // maçãs altas e bochechas fundas embaixo
      z += 0.006 * (bump(x, y, -0.052, -0.004, 0.022, 0.016) + bump(x, y, 0.052, -0.004, 0.022, 0.016)) * front
      z -= 0.009 * (bump(x, y, -0.046, -0.04, 0.02, 0.022) + bump(x, y, 0.046, -0.04, 0.02, 0.022)) * front
    }
    // queixo fino: o rosto afina para baixo
    if (y < -0.03) x *= 1 - Math.min(0.2, (-0.03 - y) * 1.6)
    p.setXYZ(i, x, y, z)
  }
}

/** UV de frente: o rosto fica na frente; atrás, um canto da textura só de pele. */
function projectUV(g: THREE.BufferGeometry) {
  const p = g.attributes.position
  const uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) {
    if (p.getZ(i) > -0.02) uv.setXY(i, p.getX(i) / FACE_W + 0.5, p.getY(i) / FACE_H + 0.5)
    else uv.setXY(i, 0.04, 0.96)
  }
}

export function buildEspectroHead() {
  // ângulo (a partir do topo) onde a esfera escalada cruza a linha da boca
  const cut = Math.acos(MOUTH_Y / (R * SCALE.y))
  const upper = new THREE.SphereGeometry(R, 18, 12, 0, Math.PI * 2, 0, cut)
  const lower = new THREE.SphereGeometry(R, 18, 4, 0, Math.PI * 2, cut, Math.PI - cut)
  for (const g of [upper, lower]) {
    sculpt(g)
    projectUV(g)
    g.computeVertexNormals()
  }
  // a mandíbula gira em volta da dobradiça: geometria relativa a ela
  lower.translate(-JAW_PIVOT.x, -JAW_PIVOT.y, -JAW_PIVOT.z)
  return { upper, lower }
}

/** Textura do rosto (64 × 64, em tons de cinza): olheiras, órbitas, escorrido, boca costurada. */
export function espectroFaceTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const px = (x: number) => (x / FACE_W + 0.5) * 64
  const py = (y: number) => (1 - (y / FACE_H + 0.5)) * 64
  // pele pálida com manchas
  g.fillStyle = '#dedede'
  g.fillRect(0, 0, 64, 64)
  let s = 5
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  for (let i = 0; i < 160; i++) {
    g.fillStyle = r() < 0.5 ? '#d2d2d2' : '#e8e8e8'
    g.fillRect(Math.floor(r() * 64), Math.floor(r() * 64), 1, 1)
  }
  // veias finas nas têmporas
  g.fillStyle = '#b8b8bc'
  for (const sx of [-1, 1]) {
    let x = px(sx * 0.07)
    for (let y = py(0.07); y < py(0.02); y++) {
      g.fillRect(Math.round(x), Math.round(y), 1, 1)
      x += (r() - 0.5) * 1.4
    }
  }
  for (const sx of [-1, 1]) {
    const cx = px(sx * 0.036)
    const cy = py(0.022)
    // olheira escura em volta, órbita preta no fundo
    const halo = g.createRadialGradient(cx, cy, 2, cx, cy, 10)
    halo.addColorStop(0, '#000000')
    halo.addColorStop(0.45, '#0a0a0a')
    halo.addColorStop(0.7, '#4a4a4e')
    halo.addColorStop(1, 'rgba(110,110,116,0)')
    g.fillStyle = halo
    g.beginPath()
    g.ellipse(cx, cy, 10, 9, 0, 0, Math.PI * 2)
    g.fill()
    // escorrido preto descendo pelas bochechas
    g.fillStyle = '#121212'
    for (const [dx, len] of [
      [-3, 16],
      [-1, 9],
      [2, 13],
      [4, 7],
    ])
      g.fillRect(Math.round(cx + dx * sx), Math.round(cy + 4), 1, len)
  }
  // sombra do nariz
  g.fillStyle = '#b4b4b4'
  g.fillRect(Math.round(px(-0.006)), Math.round(py(-0.03)), 3, 2)
  // boca costurada: linha escura com pontos atravessando (metade em cima, metade embaixo)
  const my = Math.round(py(MOUTH_Y))
  g.fillStyle = '#2a2a2a'
  g.fillRect(Math.round(px(-0.034)), my - 1, Math.round(px(0.034) - px(-0.034)), 2)
  g.fillStyle = '#141414'
  for (let x = px(-0.03); x <= px(0.03); x += 3) g.fillRect(Math.round(x), my - 4, 1, 8)
  const t = new THREE.CanvasTexture(c)
  t.magFilter = t.minFilter = THREE.NearestFilter
  t.generateMipmaps = false
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
