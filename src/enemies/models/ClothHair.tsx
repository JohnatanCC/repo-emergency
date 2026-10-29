import { useMemo, useRef } from 'react'
import { createPortal, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Cabelo de tecido ("malha e mola"): cada mecha é uma grade de pontos
 * (colunas × linhas) simulada com Verlet. A linha de cima fica presa no couro
 * cabeludo; as molas verticais seguram o comprimento, as horizontais seguram a
 * mecha unida (como pano) e as diagonais impedem que ela se dobre como sanfona.
 * Os pontos são empurrados para fora das esferas de colisão (cabeça, peito),
 * então o cabelo cai e desliza por cima do rosto e dos ombros.
 *
 * A simulação é no mundo (o cabelo atrasa quando a cabeça vira ou o corpo
 * dispara) e a malha é desenhada na cena (portal).
 */

export interface HairSheet {
  /** Pontos de fixação no couro cabeludo: [azimute (rad, 0 = frente), elevação (rad)]. */
  from: [number, number]
  to: [number, number]
  cols: number
  rows: number
  /** Comprimento de cada coluna (m): uma função para deixar pontas desiguais. */
  length: (col: number) => number
  red?: boolean
}

export interface HairCollider {
  /** Centro (no espaço do objeto `space`) e raio. */
  center: [number, number, number]
  radius: number
  space: React.RefObject<THREE.Object3D>
}

/** Gravidade mais fraca que a real (cabelo de fantasma) e força da brisa. */
const GRAVITY = new THREE.Vector3(0, -5, 0)
const WIND = 0.9
const DAMPING = 0.94
const ITERATIONS = 6

interface Sim {
  pos: Float32Array
  prev: Float32Array
  /** Âncoras no espaço da cabeça (só a linha de cima). */
  anchors: THREE.Vector3[]
  /** Pares [a, b, comprimento] das molas. */
  links: Float32Array
  geo: THREE.BufferGeometry
  cols: number
  rows: number
  ready: boolean
}

function hairTexture(red: boolean) {
  const c = document.createElement('canvas')
  c.width = 32
  c.height = 64
  const g = c.getContext('2d')!
  // fios verticais com pontas desiguais e falhas (transparente entre eles)
  let s = red ? 7 : 3
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  for (let x = 0; x < 32; x++) {
    const end = 40 + r() * 24
    const shade = red ? `rgb(${60 + r() * 50},${4 + r() * 8},${10 + r() * 12})` : `rgb(${4 + r() * 14},${3 + r() * 10},${6 + r() * 14})`
    g.fillStyle = shade
    if (r() < 0.85) g.fillRect(x, 0, 1, end)
  }
  const t = new THREE.CanvasTexture(c)
  t.magFilter = t.minFilter = THREE.NearestFilter
  t.generateMipmaps = false
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function ClothHair({
  head,
  radius,
  sheets,
  colliders,
  material,
}: {
  /** Objeto da cabeça: âncoras e colisão da cabeça ficam no espaço dele. */
  head: React.RefObject<THREE.Object3D>
  /** Raio do couro cabeludo (onde as mechas se prendem) e da colisão da cabeça. */
  radius: number
  sheets: HairSheet[]
  colliders?: HairCollider[]
  /** Material próprio (ex.: pano translúcido do Possessor) no lugar do cabelo. */
  material?: THREE.Material
}) {
  const scene = useThree((s) => s.scene)
  const mats = useMemo(() => {
    // fosco (só difusa): sob a lanterna, cabelo de verdade não tem riscos brancos de brilho
    const make = (red: boolean) => new THREE.MeshLambertMaterial({ map: hairTexture(red), alphaTest: 0.5, side: THREE.DoubleSide })
    return { black: make(false), red: make(true) }
  }, [])

  const sims = useMemo<Sim[]>(
    () =>
      sheets.map((sh) => {
        const { cols, rows } = sh
        const n = cols * rows
        const anchors: THREE.Vector3[] = []
        for (let c = 0; c < cols; c++) {
          const k = cols === 1 ? 0.5 : c / (cols - 1)
          const a = sh.from[0] + (sh.to[0] - sh.from[0]) * k
          const e = sh.from[1] + (sh.to[1] - sh.from[1]) * k
          anchors.push(new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)).multiplyScalar(radius))
        }
        const links: number[] = []
        const idx = (c: number, r: number) => r * cols + c
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols; c++) {
            const seg = sh.length(c) / (rows - 1)
            if (r > 0) links.push(idx(c, r - 1), idx(c, r), seg)
            if (c > 0) {
              const w = anchors[c].distanceTo(anchors[c - 1]) * (1 + (r / rows) * 0.4)
              links.push(idx(c - 1, r), idx(c, r), w)
              // diagonais: a mecha não dobra como sanfona
              if (r > 0) links.push(idx(c - 1, r - 1), idx(c, r), Math.hypot(w, seg))
            }
          }
        // malha: dois triângulos por quadrado da grade
        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
        const uv = new Float32Array(n * 2)
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols; c++) uv.set([cols === 1 ? 0.5 : c / (cols - 1), 1 - r / (rows - 1)], idx(c, r) * 2)
        geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
        const index: number[] = []
        for (let r = 0; r < rows - 1; r++)
          for (let c = 0; c < cols - 1; c++)
            index.push(idx(c, r), idx(c, r + 1), idx(c + 1, r), idx(c + 1, r), idx(c, r + 1), idx(c + 1, r + 1))
        geo.setIndex(index)
        return {
          pos: new Float32Array(n * 3),
          prev: new Float32Array(n * 3),
          anchors,
          links: Float32Array.from(links),
          geo,
          cols,
          rows,
          ready: false,
        }
      }),
    [sheets, radius],
  )

  const tmp = useMemo(() => ({ a: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3(), down: new THREE.Vector3() }), [])
  const lastHead = useRef(new THREE.Vector3(1e9, 0, 0))

  useFrame((_, delta) => {
    const h = head.current
    if (!h) return
    h.updateWorldMatrix(true, false)
    const headPos = tmp.c.setFromMatrixPosition(h.matrixWorld)
    // teleporte (renasceu longe): recomeça o cabelo pendurado
    const jumped = headPos.distanceTo(lastHead.current) > 1
    lastHead.current.copy(headPos)
    const dt = Math.min(delta, 1 / 30)
    // colisores no mundo
    const cols: { x: number; y: number; z: number; r: number }[] = [{ x: headPos.x, y: headPos.y, z: headPos.z, r: radius * 1.06 }]
    for (const col of colliders ?? []) {
      const o = col.space.current
      if (!o) continue
      o.updateWorldMatrix(true, false)
      const p = tmp.d.set(...col.center).applyMatrix4(o.matrixWorld)
      cols.push({ x: p.x, y: p.y, z: p.z, r: col.radius })
    }

    sims.forEach((sim, si) => {
      const { pos, prev, anchors, links, cols: nc, rows } = sim
      const len = sheets[si].length
      // linha de cima: presa nas âncoras
      if (!sim.ready || jumped) {
        for (let c = 0; c < nc; c++) {
          tmp.a.copy(anchors[c]).applyMatrix4(h.matrixWorld)
          for (let r = 0; r < rows; r++) {
            const i = (r * nc + c) * 3
            pos[i] = prev[i] = tmp.a.x
            pos[i + 1] = prev[i + 1] = tmp.a.y - (len(c) * r) / (rows - 1)
            pos[i + 2] = prev[i + 2] = tmp.a.z
          }
        }
        sim.ready = true
      }
      // Verlet: inércia + gravidade + uma brisa fantasma que nunca para
      const g2 = dt * dt
      const time = performance.now() / 1000
      const windX = Math.sin(time * 0.7 + si) * WIND
      const windZ = Math.cos(time * 0.9 + si * 2) * WIND * 0.7
      for (let i = nc * 3; i < pos.length; i += 3) {
        const x = pos[i]
        const y = pos[i + 1]
        const z = pos[i + 2]
        pos[i] += (x - prev[i]) * DAMPING + (GRAVITY.x + windX) * g2
        pos[i + 1] += (y - prev[i + 1]) * DAMPING + GRAVITY.y * g2
        pos[i + 2] += (z - prev[i + 2]) * DAMPING + (GRAVITY.z + windZ) * g2
        prev[i] = x
        prev[i + 1] = y
        prev[i + 2] = z
      }
      for (let c = 0; c < nc; c++) {
        tmp.a.copy(anchors[c]).applyMatrix4(h.matrixWorld)
        pos[c * 3] = prev[c * 3] = tmp.a.x
        pos[c * 3 + 1] = prev[c * 3 + 1] = tmp.a.y
        pos[c * 3 + 2] = prev[c * 3 + 2] = tmp.a.z
      }
      // molas (distância) e colisão, algumas vezes por quadro
      for (let it = 0; it < ITERATIONS; it++) {
        for (let k = 0; k < links.length; k += 3) {
          const a = links[k] * 3
          const b = links[k + 1] * 3
          const rest = links[k + 2]
          const dx = pos[b] - pos[a]
          const dy = pos[b + 1] - pos[a + 1]
          const dz = pos[b + 2] - pos[a + 2]
          const d = Math.hypot(dx, dy, dz) || 1e-6
          const diff = (d - rest) / d
          // a linha de cima não se move: a outra ponta corrige sozinha
          const wa = a < nc * 3 ? 0 : 0.5
          const wb = b < nc * 3 ? 0 : 0.5
          const sum = wa + wb || 1
          pos[a] += dx * diff * (wa / sum)
          pos[a + 1] += dy * diff * (wa / sum)
          pos[a + 2] += dz * diff * (wa / sum)
          pos[b] -= dx * diff * (wb / sum)
          pos[b + 1] -= dy * diff * (wb / sum)
          pos[b + 2] -= dz * diff * (wb / sum)
        }
        for (let i = nc * 3; i < pos.length; i += 3)
          for (const col of cols) {
            const dx = pos[i] - col.x
            const dy = pos[i + 1] - col.y
            const dz = pos[i + 2] - col.z
            const d = Math.hypot(dx, dy, dz)
            if (d < col.r && d > 1e-6) {
              const push = col.r / d
              pos[i] = col.x + dx * push
              pos[i + 1] = col.y + dy * push
              pos[i + 2] = col.z + dz * push
            }
          }
      }
      const attr = sim.geo.attributes.position as THREE.BufferAttribute
      ;(attr.array as Float32Array).set(pos)
      attr.needsUpdate = true
      sim.geo.computeVertexNormals()
      sim.geo.computeBoundingSphere()
    })
  })

  return createPortal(
    <group>
      {sims.map((sim, i) => (
        <mesh key={i} geometry={sim.geo} material={material ?? (sheets[i].red ? mats.red : mats.black)} frustumCulled={false} castShadow />
      ))}
    </group>,
    scene,
  )
}
