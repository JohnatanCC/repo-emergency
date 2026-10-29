import type { LevelData } from '../types'
import { link, room } from './plan'

/**
 * Igreja e Cemitério — Nível 4
 *
 * Carro → entrada → Adro (ao ar livre) → Nave. Do transepto: Sacristia,
 * Capela lateral e a Cripta, que dá no extrator. O Cemitério corre por fora,
 * ao sul do adro e da nave: um loop aberto (e iluminado só pela lua).
 */

const car = room('car', 'Carro', 'car', 'lit', 'metal', 'metal', [40, 230, 70, 60])
const entrance = room('entrance', 'Portão', 'corridor', 'lit', 'wood', 'panel', [110, 240, 60, 40])
const yard = room('yard', 'Adro', 'outdoor', 'moon', 'grass', 'brick', [170, 170, 140, 200], ['crickets'])
const nave = room('nave', 'Nave', 'room', 'dim', 'wood', 'panel', [310, 150, 200, 220])
const transept = room('transept', 'Transepto', 'corridor', 'dark', 'wood', 'panel', [510, 240, 90, 40])
const sacristy = room('sacristy', 'Sacristia', 'room', 'dark', 'wood', 'wallpaper', [510, 150, 90, 90], ['clock'])
const sideChapel = room('sideChapel', 'Capela lateral', 'room', 'dark', 'carpet', 'wallpaper', [510, 280, 90, 90])
const crypt = room('crypt', 'Cripta', 'room', 'dark', 'tile', 'brick', [600, 190, 120, 140], ['drip'])
const extract = room('extract', 'Extração', 'extraction', 'dark', 'metal', 'metal', [720, 235, 50, 50])
const graveyard = room('graveyard', 'Cemitério', 'outdoor', 'moon', 'grass', 'brick', [170, 370, 340, 100], ['crickets'])

export const church04: LevelData = {
  id: 'church-04',
  name: 'Igreja e Cemitério · Nível 4',
  scale: 0.08,
  wallHeight: 3.2,
  enemyDelay: 15,
  relicQuota: 4,
  playerStart: { x: 75, y: 260 },

  rooms: [car, entrance, yard, nave, transept, sacristy, sideChapel, crypt, extract, graveyard],

  openings: [
    link('car-entrance', car, entrance, 'passage', { len: 32 }),
    link('D1', entrance, yard, 'door', { firstDoor: true }),
    link('D2', yard, nave, 'door', { len: 30 }),
    link('yard-graves', yard, graveyard, 'passage', { len: 60 }),
    link('D3', nave, graveyard, 'door', { at: 0.7 }),
    link('nave-transept', nave, transept, 'passage', { len: 32 }),
    link('D4', transept, sacristy),
    link('D5', transept, sideChapel),
    link('D6', transept, crypt),
    link('D7', crypt, extract),
  ],

  props: [
    { id: 'car-panel', type: 'monitor', x: 44, y: 260, rot: 90 },

    // nave: duas colunas de bancos, corredor central e o altar
    ...[200, 230, 260, 290, 320].flatMap((y, i) => [
      { id: `nave-pl${i}`, type: 'bench' as const, x: 360, y },
      { id: `nave-pr${i}`, type: 'bench' as const, x: 460, y },
    ]),
    { id: 'nave-altar', type: 'table', x: 485, y: 200, rot: 90 },

    { id: 'sac-ward', type: 'wardrobe', x: 516, y: 190, rot: 90 },
    { id: 'sac-t', type: 'table', x: 565, y: 180 },
    { id: 'sac-s', type: 'shelf', x: 560, y: 157, w: 50, h: 5 },

    { id: 'sc-bench', type: 'bench', x: 555, y: 345 },
    { id: 'sc-ward', type: 'wardrobe', x: 594, y: 320, rot: -90 },
    { id: 'sc-t', type: 'table', x: 545, y: 310 },

    // cripta: túmulos (mesas) dos dois lados do corredor do meio
    { id: 'cr-t1', type: 'table', x: 640, y: 220 },
    { id: 'cr-t2', type: 'table', x: 690, y: 220 },
    { id: 'cr-t3', type: 'table', x: 640, y: 300 },
    { id: 'cr-t4', type: 'table', x: 690, y: 300 },

    { id: 'yard-bench', type: 'bench', x: 200, y: 200 },
    { id: 'yard-t', type: 'table', x: 280, y: 320 },

    // cemitério: lápides (mesas de pedra ao ar livre)
    { id: 'gr-1', type: 'table', x: 220, y: 420 },
    { id: 'gr-2', type: 'table', x: 280, y: 420 },
    { id: 'gr-3', type: 'table', x: 340, y: 440 },
    { id: 'gr-4', type: 'table', x: 400, y: 420 },
    { id: 'gr-5', type: 'table', x: 470, y: 440 },
  ],

  hidingSpots: [
    { id: 'h-altar', type: 'under-table', propId: 'nave-altar' },
    { id: 'h-sac-w', type: 'wardrobe', propId: 'sac-ward' },
    { id: 'h-sac-t', type: 'under-table', propId: 'sac-t' },
    { id: 'h-sc-w', type: 'wardrobe', propId: 'sc-ward' },
    { id: 'h-sc-t', type: 'under-table', propId: 'sc-t' },
    { id: 'h-cr-t1', type: 'under-table', propId: 'cr-t1' },
    { id: 'h-cr-t4', type: 'under-table', propId: 'cr-t4' },
    { id: 'h-yard-t', type: 'under-table', propId: 'yard-t' },
  ],

  itemSpawns: [
    { id: 'i-sac', x: 560, y: 215, accepts: ['relic', 'loot'] },
    { id: 'i-crypt', x: 665, y: 260, accepts: ['relic', 'loot'] },
    { id: 'i-sc', x: 530, y: 345, accepts: ['relic', 'loot'] },
    { id: 'i-altar', x: 470, y: 170, accepts: ['relic', 'loot'] },
    { id: 'i-graves', x: 370, y: 405, accepts: ['relic', 'loot'] },
    { id: 'i-nave1', x: 410, y: 250, accepts: ['loot'] },
    { id: 'i-nave2', x: 410, y: 330, accepts: ['loot'] },
    { id: 'i-yard', x: 240, y: 250, accepts: ['loot'] },
    { id: 'i-graves2', x: 250, y: 455, accepts: ['loot'] },
    { id: 'i-graves3', x: 480, y: 405, accepts: ['loot'] },
    { id: 'i-trans', x: 555, y: 260, accepts: ['loot'] },
    { id: 'i-crypt2', x: 705, y: 260, accepts: ['loot'] },
  ],

  enemySpawns: [
    { id: 'e-guardia', enemy: 'guardia', x: 560, y: 200, phase: 'start' },
    { id: 'e-sombra', enemy: 'sombra', x: 650, y: 260, phase: 'start' },
    { id: 'eb-guardia', enemy: 'guardia', x: 240, y: 300, phase: 'blackout' },
    { id: 'eb-sombra', enemy: 'sombra', x: 410, y: 180, phase: 'blackout' },
  ],
}
