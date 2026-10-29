import type { LevelData } from '../types'
import { link, room } from './plan'

/**
 * Hospital de Isolamento — Nível 3
 *
 * Carro → entrada → Recepção → um corredor longo e escuro com enfermarias dos
 * dois lados e o Centro cirúrgico; no fim do corredor, o extrator. Pouca rota
 * alternativa: o corredor é o ponto de encontro com tudo o que anda pela casa.
 */

const car = room('car', 'Carro', 'car', 'lit', 'metal', 'metal', [40, 230, 70, 60])
const entrance = room('entrance', 'Entrada', 'corridor', 'lit', 'tile', 'tile', [110, 240, 80, 40])
const lobby = room('lobby', 'Recepção', 'room', 'dim', 'tile', 'tile', [190, 190, 110, 140], ['clock'])
const hall = room('hall', 'Corredor do isolamento', 'corridor', 'dark', 'tile', 'tile', [300, 240, 380, 40])
const w1 = room('w1', 'Enfermaria 1', 'room', 'dim', 'tile', 'tile', [300, 150, 95, 90])
const w2 = room('w2', 'Enfermaria 2', 'room', 'dark', 'tile', 'tile', [395, 150, 95, 90])
const w3 = room('w3', 'Enfermaria 3', 'room', 'dark', 'tile', 'tile', [490, 150, 95, 90], ['drip'])
const w4 = room('w4', 'Enfermaria 4', 'room', 'dark', 'tile', 'tile', [585, 150, 95, 90])
const s1 = room('s1', 'Consultório', 'room', 'dim', 'tile', 'tile', [300, 280, 95, 90])
const surgery = room('surgery', 'Centro cirúrgico', 'room', 'dark', 'tile', 'tile', [395, 280, 190, 90])
const s3 = room('s3', 'Depósito', 'room', 'dark', 'tile', 'tile', [585, 280, 95, 90])
const extract = room('extract', 'Extração', 'extraction', 'dark', 'metal', 'metal', [680, 235, 50, 50])

const HUNTERS = { damage: 50, lockTime: 6, chaseMusic: true }

export const hospital03: LevelData = {
  id: 'hospital-03',
  name: 'Hospital de Isolamento · Nível 3',
  scale: 0.08,
  wallHeight: 3.2,
  enemyDelay: 16,
  relicQuota: 3,
  playerStart: { x: 75, y: 260 },

  rooms: [car, entrance, lobby, hall, w1, w2, w3, w4, s1, surgery, s3, extract],

  openings: [
    link('car-entrance', car, entrance, 'passage', { len: 32 }),
    link('D1', entrance, lobby, 'door', { firstDoor: true }),
    link('D2', lobby, hall),
    link('D3', hall, w1),
    link('D4', hall, w2),
    link('D5', hall, w3),
    link('D6', hall, w4),
    link('D7', hall, s1),
    link('D8', hall, surgery, 'door', { at: 0.3 }),
    link('D9', hall, s3),
    link('D10', hall, extract),
  ],

  props: [
    { id: 'car-panel', type: 'monitor', x: 44, y: 260, rot: 90 },

    // recepção: balcão, cadeiras de espera e armário de fichas
    { id: 'lob-t', type: 'table', x: 245, y: 215 },
    { id: 'lob-s', type: 'shelf', x: 245, y: 322, w: 60, h: 5 },
    { id: 'lob-c1', type: 'chair', x: 210, y: 300 },
    { id: 'lob-c2', type: 'chair', x: 280, y: 300 },

    // enfermarias: leitos (bancos) dos dois lados da porta
    { id: 'w1-b1', type: 'bench', x: 315, y: 190, rot: 90 },
    { id: 'w1-b2', type: 'bench', x: 380, y: 190, rot: 90 },
    { id: 'w2-b1', type: 'bench', x: 410, y: 195, rot: 90 },
    { id: 'w2-ward', type: 'wardrobe', x: 442, y: 156 },
    { id: 'w3-tub', type: 'bathtub', x: 537, y: 170 },
    { id: 'w3-b1', type: 'bench', x: 570, y: 200, rot: 90 },
    { id: 'w4-b1', type: 'bench', x: 600, y: 195, rot: 90 },
    { id: 'w4-ward', type: 'wardrobe', x: 632, y: 156 },

    { id: 's1-b', type: 'bench', x: 315, y: 325, rot: 90 },
    { id: 's1-t', type: 'table', x: 370, y: 345 },

    // centro cirúrgico: mesa de operação, armário e prateleira de instrumentos
    { id: 'sur-t', type: 'table', x: 490, y: 325 },
    { id: 'sur-c', type: 'chair', x: 470, y: 325, rot: 90 },
    { id: 'sur-s', type: 'shelf', x: 490, y: 363, w: 80, h: 5 },
    { id: 'sur-ward', type: 'wardrobe', x: 579, y: 320, rot: -90 },

    { id: 's3-ward', type: 'wardrobe', x: 632, y: 364, rot: 180 },
    { id: 's3-b', type: 'bench', x: 600, y: 320, rot: 90 },
  ],

  hidingSpots: [
    { id: 'h-lob-t', type: 'under-table', propId: 'lob-t' },
    { id: 'h-w2-w', type: 'wardrobe', propId: 'w2-ward' },
    { id: 'h-w4-w', type: 'wardrobe', propId: 'w4-ward' },
    { id: 'h-s1-t', type: 'under-table', propId: 's1-t' },
    { id: 'h-sur-t', type: 'under-table', propId: 'sur-t' },
    { id: 'h-sur-w', type: 'wardrobe', propId: 'sur-ward' },
    { id: 'h-s3-w', type: 'wardrobe', propId: 's3-ward' },
  ],

  itemSpawns: [
    { id: 'i-w2', x: 442, y: 205, accepts: ['relic', 'loot'] },
    { id: 'i-w3', x: 510, y: 215, accepts: ['relic', 'loot'] },
    { id: 'i-w4', x: 650, y: 210, accepts: ['relic', 'loot'] },
    { id: 'i-sur', x: 430, y: 320, accepts: ['relic', 'loot'] },
    { id: 'i-s3', x: 650, y: 320, accepts: ['relic', 'loot'] },
    { id: 'i-lob1', x: 270, y: 255, accepts: ['loot'] },
    { id: 'i-lob2', x: 220, y: 265, accepts: ['loot'] },
    { id: 'i-hall1', x: 450, y: 260, accepts: ['loot'] },
    { id: 'i-hall2', x: 600, y: 260, accepts: ['loot'] },
    { id: 'i-w1', x: 347, y: 185, accepts: ['loot'] },
    { id: 'i-s1', x: 350, y: 315, accepts: ['loot'] },
    { id: 'i-sur2', x: 545, y: 345, accepts: ['loot'] },
  ],

  // as criaturas do hospital são caçadoras: dano 50, marcam o alvo e trazem música de perseguição
  enemySpawns: [
    { id: 'e-guardia', enemy: 'guardia', x: 530, y: 345, phase: 'start', ...HUNTERS },
    { id: 'e-sombra', enemy: 'sombra', x: 545, y: 215, phase: 'start', ...HUNTERS },
    { id: 'eb-guardia', enemy: 'guardia', x: 240, y: 260, phase: 'blackout', ...HUNTERS },
    { id: 'eb-sombra', enemy: 'sombra', x: 230, y: 230, phase: 'blackout', ...HUNTERS },
  ],
}
