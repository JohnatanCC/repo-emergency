import type { AmbientSound, FloorType, LightLevel, Opening, Room, RoomKind, WallType } from '../types'

/**
 * Ajudantes para desenhar níveis em unidades de planta (1 u = 0,08 m) sem
 * errar coordenada de porta: `link` acha a parede comum entre duas salas
 * vizinhas e põe a abertura nela.
 */

export function room(
  id: string,
  name: string,
  kind: RoomKind,
  light: LightLevel,
  floor: FloorType,
  wall: WallType,
  [x, y, w, h]: [number, number, number, number],
  ambient?: AmbientSound[],
): Room {
  return { id, name, kind, light, floor, wall, x, y, w, h, ...(ambient ? { ambient } : {}) }
}

/**
 * Abertura na parede comum entre `a` e `b` (precisam encostar).
 * `at` = posição ao longo da parede comum (0 = começo, 1 = fim); `len` = tamanho do vão em u
 * (portas viram 1 m no jogo; passagens usam o tamanho inteiro).
 */
export function link(
  id: string,
  a: Room,
  b: Room,
  kind: Opening['kind'] = 'door',
  opts: { at?: number; len?: number; firstDoor?: boolean } = {},
): Opening {
  const len = opts.len ?? 24
  const at = opts.at ?? 0.5
  const extra = opts.firstDoor ? { firstDoor: true } : {}
  // parede vertical (uma sala à esquerda da outra)
  if (a.x + a.w === b.x || b.x + b.w === a.x) {
    const x = a.x + a.w === b.x ? b.x : a.x
    const y0 = Math.max(a.y, b.y)
    const y1 = Math.min(a.y + a.h, b.y + b.h)
    if (y1 - y0 >= len + 8) return { id, kind, x: x - 4, y: y0 + 4 + (y1 - y0 - 8 - len) * at, w: 8, h: len, ...extra }
  }
  // parede horizontal (uma sala acima da outra)
  if (a.y + a.h === b.y || b.y + b.h === a.y) {
    const y = a.y + a.h === b.y ? b.y : a.y
    const x0 = Math.max(a.x, b.x)
    const x1 = Math.min(a.x + a.w, b.x + b.w)
    if (x1 - x0 >= len + 8) return { id, kind, x: x0 + 4 + (x1 - x0 - 8 - len) * at, y: y - 4, w: len, h: 8, ...extra }
  }
  throw new Error(`nível: ${id} — ${a.id} e ${b.id} não têm parede comum grande o bastante`)
}
