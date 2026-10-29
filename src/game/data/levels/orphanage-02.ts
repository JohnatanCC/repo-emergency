import type { LevelData } from '../types'
import { link, room } from './plan'

/**
 * Orfanato Santa Luzia — Nível 2
 *
 * Carro → entrada → Refeitório → corredores norte e sul, que contornam os dois
 * dormitórios (escuros) e chegam à Capela; dali, o extrator. Banheiro ao norte,
 * sala da diretora ao sul. Loops: corredor norte ↔ dormitórios ↔ corredor sul.
 */

const car = room('car', 'Carro', 'car', 'lit', 'metal', 'metal', [40, 230, 70, 60])
const entrance = room('entrance', 'Entrada', 'corridor', 'lit', 'wood', 'panel', [110, 240, 80, 40])
const refectory = room('refectory', 'Refeitório', 'room', 'dim', 'tile', 'panel', [190, 150, 140, 220])
const corrN = room('corrN', 'Corredor norte', 'corridor', 'dim', 'wood', 'panel', [330, 150, 260, 50])
const corrS = room('corrS', 'Corredor sul', 'corridor', 'dark', 'wood', 'panel', [330, 320, 260, 50])
const dormA = room('dormA', 'Dormitório A', 'room', 'dark', 'carpet', 'wallpaper', [330, 200, 130, 120])
const dormB = room('dormB', 'Dormitório B', 'room', 'dark', 'carpet', 'wallpaper', [460, 200, 130, 120])
const chapel = room('chapel', 'Capela', 'room', 'dim', 'wood', 'wallpaper', [590, 150, 90, 220])
const extract = room('extract', 'Extração', 'extraction', 'dark', 'metal', 'metal', [680, 235, 50, 50])
const bath = room('bath', 'Banheiro coletivo', 'room', 'dim', 'tile', 'tile', [400, 90, 110, 60], ['drip'])
const office = room('office', 'Sala da diretora', 'room', 'dim', 'carpet', 'wallpaper', [420, 370, 120, 90], ['clock'])

export const orphanage02: LevelData = {
  id: 'orphanage-02',
  name: 'Orfanato Santa Luzia · Nível 2',
  scale: 0.08,
  wallHeight: 3.2,
  enemyDelay: 18,
  relicQuota: 3,
  playerStart: { x: 75, y: 260 },

  rooms: [car, entrance, refectory, corrN, corrS, dormA, dormB, chapel, extract, bath, office],

  openings: [
    link('car-entrance', car, entrance, 'passage', { len: 32 }),
    link('D1', entrance, refectory, 'door', { firstDoor: true }),
    link('D2', refectory, corrN),
    link('D3', refectory, corrS),
    link('D4', corrN, dormA),
    link('D5', corrN, dormB),
    link('D6', corrS, dormA, 'door', { at: 0.3 }),
    link('D7', corrS, dormB, 'door', { at: 0.7 }),
    link('D8', dormA, dormB, 'door', { at: 0.25 }),
    link('D9', corrN, chapel),
    link('D10', corrS, chapel),
    link('D11', chapel, extract),
    link('D12', corrN, bath),
    link('D13', corrS, office),
  ],

  props: [
    { id: 'car-panel', type: 'monitor', x: 44, y: 260, rot: 90 },

    // refeitório: mesas compridas
    { id: 'ref-t1', type: 'table', x: 230, y: 190 },
    { id: 'ref-t2', type: 'table', x: 290, y: 190 },
    { id: 'ref-t3', type: 'table', x: 230, y: 260 },
    { id: 'ref-t4', type: 'table', x: 290, y: 260 },
    { id: 'ref-t5', type: 'table', x: 230, y: 330 },
    { id: 'ref-t6', type: 'table', x: 290, y: 330 },
    { id: 'ref-c1', type: 'chair', x: 212, y: 190, rot: 90 },
    { id: 'ref-c2', type: 'chair', x: 248, y: 260, rot: -90 },
    { id: 'ref-c3', type: 'chair', x: 272, y: 330, rot: 90 },

    // dormitórios: camas (bancos) e armários
    { id: 'dA-b1', type: 'bench', x: 370, y: 215 },
    { id: 'dA-b2', type: 'bench', x: 430, y: 215 },
    { id: 'dA-b3', type: 'bench', x: 400, y: 305 },
    { id: 'dA-b4', type: 'bench', x: 440, y: 305 },
    { id: 'dA-ward', type: 'wardrobe', x: 453, y: 290, rot: -90 },
    { id: 'dB-b1', type: 'bench', x: 500, y: 215 },
    { id: 'dB-b2', type: 'bench', x: 560, y: 215 },
    { id: 'dB-b3', type: 'bench', x: 490, y: 305 },
    { id: 'dB-b4', type: 'bench', x: 575, y: 305 },
    { id: 'dB-ward', type: 'wardrobe', x: 584, y: 255, rot: -90 },

    // capela: bancos em duas colunas e o altar
    { id: 'ch-p1', type: 'bench', x: 625, y: 220 },
    { id: 'ch-p2', type: 'bench', x: 655, y: 220 },
    { id: 'ch-p3', type: 'bench', x: 625, y: 250 },
    { id: 'ch-p4', type: 'bench', x: 655, y: 250 },
    { id: 'ch-p5', type: 'bench', x: 625, y: 280 },
    { id: 'ch-p6', type: 'bench', x: 655, y: 280 },
    { id: 'ch-p7', type: 'bench', x: 625, y: 310 },
    { id: 'ch-p8', type: 'bench', x: 655, y: 310 },
    { id: 'ch-altar', type: 'table', x: 640, y: 175 },

    { id: 'bath-tub', type: 'bathtub', x: 480, y: 112 },
    { id: 'bath-ward', type: 'wardrobe', x: 406, y: 120, rot: 90 },

    { id: 'off-t', type: 'table', x: 480, y: 415 },
    { id: 'off-c', type: 'chair', x: 480, y: 428, rot: 180 },
    { id: 'off-s', type: 'shelf', x: 480, y: 453, w: 60, h: 5 },
    { id: 'off-ward', type: 'wardrobe', x: 534, y: 400, rot: -90 },
  ],

  hidingSpots: [
    { id: 'h-ref-t1', type: 'under-table', propId: 'ref-t1' },
    { id: 'h-ref-t4', type: 'under-table', propId: 'ref-t4' },
    { id: 'h-ref-t5', type: 'under-table', propId: 'ref-t5' },
    { id: 'h-ref-c2', type: 'under-chair', propId: 'ref-c2' },
    { id: 'h-dA-w', type: 'wardrobe', propId: 'dA-ward' },
    { id: 'h-dB-w', type: 'wardrobe', propId: 'dB-ward' },
    { id: 'h-ch-altar', type: 'under-table', propId: 'ch-altar' },
    { id: 'h-bath-w', type: 'wardrobe', propId: 'bath-ward' },
    { id: 'h-off-t', type: 'under-table', propId: 'off-t' },
    { id: 'h-off-w', type: 'wardrobe', propId: 'off-ward' },
  ],

  itemSpawns: [
    { id: 'i-dA', x: 400, y: 260, accepts: ['relic', 'loot'] },
    { id: 'i-dB', x: 525, y: 260, accepts: ['relic', 'loot'] },
    { id: 'i-ch', x: 640, y: 195, accepts: ['relic', 'loot'] },
    { id: 'i-off', x: 450, y: 400, accepts: ['relic', 'loot'] },
    { id: 'i-bath', x: 445, y: 112, accepts: ['relic', 'loot'] },
    { id: 'i-ref1', x: 260, y: 225, accepts: ['loot'] },
    { id: 'i-ref2', x: 260, y: 295, accepts: ['loot'] },
    { id: 'i-corrN', x: 480, y: 175, accepts: ['loot'] },
    { id: 'i-corrS', x: 470, y: 345, accepts: ['loot'] },
    { id: 'i-ch2', x: 610, y: 340, accepts: ['loot'] },
    { id: 'i-dA2', x: 345, y: 260, accepts: ['loot'] },
    { id: 'i-dB2', x: 555, y: 265, accepts: ['loot'] },
  ],

  enemySpawns: [
    { id: 'e-guardia', enemy: 'guardia', x: 500, y: 400, phase: 'start' },
    { id: 'e-sombra', enemy: 'sombra', x: 400, y: 250, phase: 'start' },
    { id: 'eb-guardia', enemy: 'guardia', x: 260, y: 300, phase: 'blackout' },
    { id: 'eb-sombra', enemy: 'sombra', x: 250, y: 200, phase: 'blackout' },
  ],
}
