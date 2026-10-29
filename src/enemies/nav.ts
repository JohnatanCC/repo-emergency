import type { LevelData, Prop } from '../game/data/types'
import type { BuiltLevel } from '../world/buildLevel'
import { WALL_THICKNESS } from '../world/buildLevel'

/**
 * Grade de navegação das entidades, gerada da planta (sem biblioteca externa).
 * Livre: o interior das salas (menos a parede e o raio do corpo) e os vãos de
 * portas/passagens. Bloqueado: a área dos móveis. Caminho por A* (8 direções,
 * sem cortar quina) e depois suavizado por linha de visão na grade.
 */

export type P2 = { x: number; z: number }

/** Tamanho (m) da base de cada móvel, igual a Props.tsx. */
function propSize(p: Prop, scale: number): [number, number] | null {
  switch (p.type) {
    case 'table':
      return [1.6, 0.8]
    case 'chair':
      return [0.5, 0.5]
    case 'wardrobe':
      return [1.2, 0.6]
    case 'shelf':
      return [(p.w ?? 80) * scale, (p.h ?? 5) * scale]
    case 'bathtub':
      return [1.6, 0.75]
    case 'bench':
      return [1.4, 0.45]
    default:
      return null
  }
}

export interface NavGrid {
  cell: number
  cols: number
  rows: number
  walkable: Uint8Array
  /** Caminho de `from` até `to` (pontos no mundo), ou [] se não houver. */
  findPath: (from: P2, to: P2) => P2[]
  /** Ponto livre aleatório; dentro de `near` (raio) se informado. */
  randomPoint: (near?: { x: number; z: number; radius: number }) => P2 | null
  isWalkable: (x: number, z: number) => boolean
  /** Linha reta livre entre dois pontos? */
  clear: (a: P2, b: P2) => boolean
}

/**
 * `radius`: raio do corpo. `margin`: folga extra longe de paredes e móveis (não
 * vale nos vãos de porta, que precisam continuar passáveis).
 */
export function buildNavGrid(level: LevelData, built: BuiltLevel, radius: number, cell = 0.25, margin = 0.1): NavGrid {
  const s = level.scale
  const corners = level.rooms.flatMap((r) => [built.toWorld(r.x, r.y), built.toWorld(r.x + r.w, r.y + r.h)])
  const minX = Math.min(...corners.map((c) => c[0]))
  const minZ = Math.min(...corners.map((c) => c[2]))
  const maxX = Math.max(...corners.map((c) => c[0]))
  const maxZ = Math.max(...corners.map((c) => c[2]))
  const cols = Math.ceil((maxX - minX) / cell)
  const rows = Math.ceil((maxZ - minZ) / cell)
  const walkable = new Uint8Array(cols * rows)
  const cx = (i: number) => minX + (i + 0.5) * cell
  const cz = (j: number) => minZ + (j + 0.5) * cell

  const fillRect = (x0: number, z0: number, x1: number, z1: number, v: number) => {
    for (let j = 0; j < rows; j++) {
      const z = cz(j)
      if (z < z0 || z > z1) continue
      for (let i = 0; i < cols; i++) {
        const x = cx(i)
        if (x >= x0 && x <= x1) walkable[j * cols + i] = v
      }
    }
  }

  // interior das salas
  const inset = WALL_THICKNESS + radius + margin
  for (const r of level.rooms) {
    const [x0, , z0] = built.toWorld(r.x, r.y)
    const [x1, , z1] = built.toWorld(r.x + r.w, r.y + r.h)
    fillRect(x0 + inset, z0 + inset, x1 - inset, z1 - inset, 1)
  }

  // vãos: atravessam a parede (dos dois lados) e ficam livres no meio
  for (const o of built.openings) {
    const horizontal = o.w >= o.h
    const [ax, , az] = built.toWorld(o.x, o.y)
    const [bx, , bz] = built.toWorld(o.x + o.w, o.y + o.h)
    const across = WALL_THICKNESS + inset + cell
    if (horizontal) {
      const mid = (az + bz) / 2
      fillRect(ax + radius, mid - across, bx - radius, mid + across, 1)
    } else {
      const mid = (ax + bx) / 2
      fillRect(mid - across, az + radius, mid + across, bz - radius, 1)
    }
  }

  // móveis bloqueiam (retângulo girado, aumentado pelo raio)
  for (const p of level.props) {
    const size = propSize(p, s)
    if (!size) continue
    const [px, , pz] = built.toWorld(p.x, p.y)
    const rot = ((p.rot ?? 0) * Math.PI) / 180
    const hx = size[0] / 2 + radius + margin
    const hz = size[1] / 2 + radius + margin
    const reach = Math.hypot(hx, hz)
    for (let j = 0; j < rows; j++) {
      const dz = cz(j) - pz
      if (Math.abs(dz) > reach) continue
      for (let i = 0; i < cols; i++) {
        const dx = cx(i) - px
        if (Math.abs(dx) > reach) continue
        const lx = dx * Math.cos(rot) - dz * Math.sin(rot)
        const lz = dx * Math.sin(rot) + dz * Math.cos(rot)
        if (Math.abs(lx) <= hx && Math.abs(lz) <= hz) walkable[j * cols + i] = 0
      }
    }
  }

  const idx = (x: number, z: number) => {
    const i = Math.floor((x - minX) / cell)
    const j = Math.floor((z - minZ) / cell)
    return i < 0 || j < 0 || i >= cols || j >= rows ? -1 : j * cols + i
  }
  const isWalkable = (x: number, z: number) => {
    const k = idx(x, z)
    return k >= 0 && walkable[k] === 1
  }

  /** Célula livre mais próxima (busca em anéis). */
  const nearest = (x: number, z: number) => {
    const i0 = Math.floor((x - minX) / cell)
    const j0 = Math.floor((z - minZ) / cell)
    for (let d = 0; d < 12; d++) {
      let best = -1
      let bestDist = Infinity
      for (let j = j0 - d; j <= j0 + d; j++)
        for (let i = i0 - d; i <= i0 + d; i++) {
          if (Math.max(Math.abs(i - i0), Math.abs(j - j0)) !== d) continue
          if (i < 0 || j < 0 || i >= cols || j >= rows || !walkable[j * cols + i]) continue
          const dist = (cx(i) - x) ** 2 + (cz(j) - z) ** 2
          if (dist < bestDist) {
            bestDist = dist
            best = j * cols + i
          }
        }
      if (best >= 0) return best
    }
    return -1
  }

  /** Linha livre com folga: confere o centro e duas linhas paralelas (meia célula de cada lado). */
  const clear = (a: P2, b: P2) => {
    const d = Math.hypot(b.x - a.x, b.z - a.z)
    if (d < 1e-6) return true
    const nx = (-(b.z - a.z) / d) * cell * 0.5
    const nz = ((b.x - a.x) / d) * cell * 0.5
    const steps = Math.ceil(d / (cell * 0.5))
    for (let k = 0; k <= steps; k++) {
      const t = k / steps
      const x = a.x + (b.x - a.x) * t
      const z = a.z + (b.z - a.z) * t
      if (!isWalkable(x, z) || !isWalkable(x + nx, z + nz) || !isWalkable(x - nx, z - nz)) return false
    }
    return true
  }

  // A* com heap binário
  const g = new Float32Array(cols * rows)
  const came = new Int32Array(cols * rows)
  const closed = new Uint8Array(cols * rows)
  const findPath = (from: P2, to: P2): P2[] => {
    const start = nearest(from.x, from.z)
    const goal = nearest(to.x, to.z)
    if (start < 0 || goal < 0) return []
    g.fill(Infinity)
    closed.fill(0)
    came.fill(-1)
    const gi = goal % cols
    const gj = Math.floor(goal / cols)
    const h = (k: number) => {
      const di = Math.abs((k % cols) - gi)
      const dj = Math.abs(Math.floor(k / cols) - gj)
      return (Math.max(di, dj) + 0.414 * Math.min(di, dj)) * cell
    }
    const heap: [number, number][] = []
    const push = (k: number, f: number) => {
      heap.push([f, k])
      let n = heap.length - 1
      while (n > 0) {
        const p = (n - 1) >> 1
        if (heap[p][0] <= heap[n][0]) break
        ;[heap[p], heap[n]] = [heap[n], heap[p]]
        n = p
      }
    }
    const pop = () => {
      const top = heap[0]
      const last = heap.pop()!
      if (heap.length) {
        heap[0] = last
        let n = 0
        for (;;) {
          const l = n * 2 + 1
          const r = l + 1
          let m = n
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r
          if (m === n) break
          ;[heap[m], heap[n]] = [heap[n], heap[m]]
          n = m
        }
      }
      return top[1]
    }
    g[start] = 0
    push(start, h(start))
    let found = false
    while (heap.length) {
      const k = pop()
      if (closed[k]) continue
      if (k === goal) {
        found = true
        break
      }
      closed[k] = 1
      const i = k % cols
      const j = Math.floor(k / cols)
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue
          const ni = i + di
          const nj = j + dj
          if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue
          const nk = nj * cols + ni
          if (!walkable[nk] || closed[nk]) continue
          // diagonal só se as duas laterais estiverem livres (não corta quina)
          if (di && dj && (!walkable[j * cols + ni] || !walkable[nj * cols + i])) continue
          const ng = g[k] + (di && dj ? 1.414 : 1) * cell
          if (ng < g[nk]) {
            g[nk] = ng
            came[nk] = k
            push(nk, ng + h(nk))
          }
        }
    }
    if (!found) return []
    const raw: P2[] = []
    for (let k = goal; k >= 0; k = came[k]) raw.push({ x: cx(k % cols), z: cz(Math.floor(k / cols)) })
    raw.reverse()
    raw[raw.length - 1] = isWalkable(to.x, to.z) ? { x: to.x, z: to.z } : raw[raw.length - 1]
    // suaviza: pula pontos enquanto a linha reta estiver livre
    const out: P2[] = []
    let a = 0
    while (a < raw.length - 1) {
      let b = raw.length - 1
      while (b > a + 1 && !clear(raw[a], raw[b])) b--
      out.push(raw[b])
      a = b
    }
    return out
  }

  const randomPoint = (near?: { x: number; z: number; radius: number }): P2 | null => {
    for (let tries = 0; tries < 200; tries++) {
      const x = near ? near.x + (Math.random() * 2 - 1) * near.radius : minX + Math.random() * (maxX - minX)
      const z = near ? near.z + (Math.random() * 2 - 1) * near.radius : minZ + Math.random() * (maxZ - minZ)
      if (isWalkable(x, z)) return { x, z }
    }
    return null
  }

  return { cell, cols, rows, walkable, findPath, randomPoint, isWalkable, clear }
}
