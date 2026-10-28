import type { FloorType, LevelData, Opening, Room, WallType } from '../game/data/types'

/**
 * Converte os dados de planta (2D) em peças 3D de greybox.
 * Funções puras: nada de React aqui, para ser fácil de testar e reaproveitar
 * (ex.: gerar navmesh dos monstros na 0.7.0).
 */

export type Vec3 = [number, number, number]

export interface Box {
  key: string
  pos: Vec3
  size: Vec3
  material: WallType | 'lintel'
}

export interface FloorPiece {
  key: string
  room: Room
  pos: Vec3
  size: [number, number]
  floor: FloorType
  ceiling: boolean
}

export interface BuiltLevel {
  walls: Box[]
  floors: FloorPiece[]
  /** Aberturas do nível, com as portas já no tamanho padrão. */
  openings: Opening[]
  /** Converte coordenada de planta em posição do mundo (y = altura). */
  toWorld: (x: number, y: number, height?: number) => Vec3
  center: { x: number; y: number }
  size: { w: number; d: number }
}

export const WALL_THICKNESS = 0.15
/** Toda porta tem o mesmo tamanho (m), centralizada no vão desenhado na planta. */
export const DOOR_WIDTH = 1.0
export const DOOR_HEIGHT = 2.2
const OUTDOOR_WALL_FACTOR = 1.9

type Interval = [number, number]

function subtract(range: Interval, cuts: Interval[]): Interval[] {
  let parts: Interval[] = [range]
  for (const [c0, c1] of cuts) {
    const next: Interval[] = []
    for (const [a, b] of parts) {
      if (c1 <= a || c0 >= b) {
        next.push([a, b])
        continue
      }
      if (c0 > a) next.push([a, c0])
      if (c1 < b) next.push([c1, b])
    }
    parts = next
  }
  return parts.filter(([a, b]) => b - a > 0.01)
}

/** Encolhe uma porta para DOOR_WIDTH, mantendo o centro. Passagens ficam como estão. */
export function standardOpening(o: Opening, scale: number): Opening {
  if (o.kind !== 'door') return o
  const len = DOOR_WIDTH / scale
  return o.w >= o.h ? { ...o, x: o.x + (o.w - len) / 2, w: len } : { ...o, y: o.y + (o.h - len) / 2, h: len }
}

/** Aberturas que cortam uma aresta da sala. */
function openingsOnEdge(
  openings: Opening[],
  horizontal: boolean,
  line: number,
  from: number,
  to: number,
): { cut: Interval; kind: Opening['kind'] }[] {
  const result: { cut: Interval; kind: Opening['kind'] }[] = []
  for (const o of openings) {
    const isHorizontal = o.w >= o.h
    if (isHorizontal !== horizontal) continue
    if (horizontal) {
      if (line < o.y - 0.5 || line > o.y + o.h + 0.5) continue
      const a = Math.max(from, o.x)
      const b = Math.min(to, o.x + o.w)
      if (b > a) result.push({ cut: [a, b], kind: o.kind })
    } else {
      if (line < o.x - 0.5 || line > o.x + o.w + 0.5) continue
      const a = Math.max(from, o.y)
      const b = Math.min(to, o.y + o.h)
      if (b > a) result.push({ cut: [a, b], kind: o.kind })
    }
  }
  return result
}

export function buildLevel(level: LevelData): BuiltLevel {
  const s = level.scale
  const minX = Math.min(...level.rooms.map((r) => r.x))
  const maxX = Math.max(...level.rooms.map((r) => r.x + r.w))
  const minY = Math.min(...level.rooms.map((r) => r.y))
  const maxY = Math.max(...level.rooms.map((r) => r.y + r.h))
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2

  const toWorld = (x: number, y: number, height = 0): Vec3 => [(x - cx) * s, height, (y - cy) * s]

  const openings = level.openings.map((o) => standardOpening(o, s))
  const walls: Box[] = []
  const floors: FloorPiece[] = []
  const T = WALL_THICKNESS

  for (const room of level.rooms) {
    const outdoor = room.kind === 'outdoor'
    const H = outdoor ? level.wallHeight * OUTDOOR_WALL_FACTOR : level.wallHeight

    // Piso (e teto, exceto área externa)
    const [fx, , fz] = toWorld(room.x + room.w / 2, room.y + room.h / 2)
    floors.push({
      key: `floor-${room.id}`,
      room,
      pos: [fx, 0, fz],
      size: [room.w * s, room.h * s],
      floor: room.floor,
      ceiling: !outdoor,
    })

    // 4 arestas: [horizontal?, linha, de, até, deslocamento para dentro]
    const edges: [boolean, number, number, number, number][] = [
      [true, room.y, room.x, room.x + room.w, +T / 2],
      [true, room.y + room.h, room.x, room.x + room.w, -T / 2],
      [false, room.x, room.y, room.y + room.h, +T / 2],
      [false, room.x + room.w, room.y, room.y + room.h, -T / 2],
    ]

    edges.forEach(([horizontal, line, from, to, inset], ei) => {
      const cuts = openingsOnEdge(openings, horizontal, line, from, to)
      const segments = subtract(
        [from, to],
        cuts.map((c) => c.cut),
      )

      const pushBox = (key: string, a: number, b: number, y0: number, y1: number, material: Box['material']) => {
        const mid = (a + b) / 2
        const len = (b - a) * s
        const [wx, , wz] = horizontal ? toWorld(mid, line) : toWorld(line, mid)
        walls.push({
          key,
          pos: horizontal ? [wx, (y0 + y1) / 2, wz + inset] : [wx + inset, (y0 + y1) / 2, wz],
          size: horizontal ? [len, y1 - y0, T] : [T, y1 - y0, len],
          material,
        })
      }

      segments.forEach(([a, b], si) => pushBox(`w-${room.id}-${ei}-${si}`, a, b, 0, H, room.wall))

      // Verga acima das aberturas (portas e passagens internas)
      cuts.forEach(({ cut: [a, b] }, ci) => {
        pushBox(`l-${room.id}-${ei}-${ci}`, a, b, DOOR_HEIGHT, H, outdoor ? room.wall : 'lintel')
      })
    })
  }

  return {
    walls,
    floors,
    openings,
    toWorld,
    center: { x: cx, y: cy },
    size: { w: (maxX - minX) * s, d: (maxY - minY) * s },
  }
}
