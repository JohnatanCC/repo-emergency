import type { LevelData, Prop, Room } from '../types'
import { link, room } from './plan'
import { FRONT_DOOR } from '../../../world/buildLevel'

/**
 * O lado de fora, igual em todos os níveis (aplicado em levels/index.ts).
 *
 * Cada nível é desenhado com um "carro" quadrado colado na entrada. Aqui ele
 * vira o cenário de chegada:
 *
 *   estrada | caminhão (baú) → jardim morto → fachada → entrada da casa
 *
 *  - jardim: área externa na frente da casa; a parede do lado da casa é a
 *    fachada (tijolo) e as outras três são invisíveis, escondidas na névoa
 *  - caminhão: o baú é a sala do "carro" (kind car), de ré para o jardim, com a
 *    traseira aberta, o painel do C.R.O.S e a prateleira de equipamentos
 *  - árvores secas, arbustos, estátuas, postes e uma fonte, sorteados sempre do
 *    mesmo jeito para cada nível, longe do caminho
 *
 * Unidades de planta (1 u = 0,08 m).
 */

export const EXTERIOR_ID = 'exterior'
export const TRUCK_ID = 'car'

export const EXTERIOR = {
  /** Profundidade do jardim (da fachada até a estrada) e folga além da casa para os lados. */
  depth: 300,
  margin: 70,
  /** Baú do caminhão: comprimento × largura. */
  truckLength: 66,
  truckWidth: 36,
  /** Faixa livre em volta do caminho (sem árvores). */
  pathClear: 42,
  /** Grade do sorteio do jardim (u) e o que nasce em cada ponto. */
  grid: 34,
  chances: { tree: 0.3, bush: 0.32, statue: 0.05 },
}

function rng(seedText: string) {
  let s = 11
  for (const ch of seedText) s = (s * 31 + ch.charCodeAt(0)) % 2147483647
  s = s || 1
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

export function withExterior(level: LevelData): LevelData {
  const car = level.rooms.find((r) => r.kind === 'car')
  const carLink = level.openings.find((o) => o.id === 'car-entrance')
  if (!car || !carLink) return level
  const house = level.rooms.filter((r) => r !== car)
  // a entrada é a sala da casa que encostava no carro
  const entrance = house.find((r) => r.x === car.x + car.w && r.y < car.y + car.h && r.y + r.h > car.y)
  if (!entrance) return level

  const front = entrance.x
  const top = Math.min(...house.map((r) => r.y)) - EXTERIOR.margin
  const bottom = Math.max(...house.map((r) => r.y + r.h)) + EXTERIOR.margin
  const x0 = front - EXTERIOR.depth
  const pathY = entrance.y + entrance.h / 2

  const yard: Room = {
    ...room(EXTERIOR_ID, 'Jardim', 'outdoor', 'moon', 'grass', 'none', [x0, top, EXTERIOR.depth, bottom - top], ['crickets']),
    // só o lado da casa tem parede de verdade: a fachada
    wallSides: { e: 'brick' },
  }
  const truck: Room = room(TRUCK_ID, 'Caminhão', 'car', 'lit', 'metal', 'metal', [
    x0 - EXTERIOR.truckLength,
    pathY - EXTERIOR.truckWidth / 2,
    EXTERIOR.truckLength,
    EXTERIOR.truckWidth,
  ])

  const r = rng(level.id)
  const props: Prop[] = []
  const blocked: { x: number; y: number; r: number }[] = []
  const free = (x: number, y: number, rad: number) => blocked.every((b) => Math.hypot(b.x - x, b.y - y) > b.r + rad)
  const place = (p: Prop, rad: number) => {
    props.push(p)
    blocked.push({ x: p.x, y: p.y, r: rad })
  }

  // caminhão por dentro: painel na frente do baú, prateleira de equipamentos encostada num lado
  place({ id: 'car-panel', type: 'monitor', x: truck.x + 4, y: pathY, rot: 90 }, 0)
  place({ id: 'truck-rack', type: 'rack', x: truck.x + truck.w * 0.55, y: truck.y + 6, w: 32 }, 0)

  // varanda: duas colunas dos lados da porta
  for (const side of [-1, 1]) place({ id: `porch-col-${side}`, type: 'column', x: front - 22, y: pathY + side * 24 }, 12)
  // postes ao longo do caminho, alternando os lados
  for (let x = x0 + 50, i = 0; x < front - 50; x += 75, i++)
    place({ id: `lamp-${i}`, type: 'lamppost', x, y: pathY + (i % 2 ? 30 : -30) }, 10)
  // fonte seca num dos lados do caminho
  const fy = pathY + (r() < 0.5 ? -1 : 1) * 115
  if (fy - 30 > top && fy + 30 < bottom) place({ id: 'fountain', type: 'fountain', x: x0 + EXTERIOR.depth * 0.5, y: fy }, 40)

  // jardim abandonado: sorteio em grade, longe do caminho, da fachada e da barreira
  for (let gx = x0 + 28; gx < front - 40; gx += EXTERIOR.grid) {
    for (let gy = top + 26; gy < bottom - 26; gy += EXTERIOR.grid) {
      const x = gx + (r() - 0.5) * 20
      const y = gy + (r() - 0.5) * 20
      if (Math.abs(y - pathY) < EXTERIOR.pathClear) continue
      const roll = r()
      const { tree, bush, statue } = EXTERIOR.chances
      const type = roll < tree ? 'tree' : roll < tree + bush ? 'bush' : roll < tree + bush + statue ? 'statue' : null
      const rad = type === 'bush' ? 10 : 9
      if (!type || !free(x, y, rad)) continue
      place({ id: `ext-${type}-${props.length}`, type, x, y, rot: Math.round(r() * 360) }, rad)
    }
  }

  return {
    ...level,
    rooms: [truck, yard, ...house],
    openings: [
      // traseira do caminhão aberta para o jardim; a porta da frente da casa
      link('truck-yard', truck, yard, 'passage', { len: 28 }),
      // porta da frente: dupla, larga e alta
      { ...link('front-door', yard, entrance, 'door', { len: 30 }), double: true, height: FRONT_DOOR.height },
      ...level.openings.filter((o) => o !== carLink),
    ],
    // o painel antigo do carro sai (o caminhão tem o dele)
    props: [...props, ...level.props.filter((p) => !(p.x >= car.x && p.x <= car.x + car.w && p.y >= car.y && p.y <= car.y + car.h))],
    playerStart: { x: truck.x + truck.w * 0.45, y: pathY },
  }
}
