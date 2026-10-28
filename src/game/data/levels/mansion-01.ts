import type { LevelData } from '../types'

/**
 * Mansão — Nível 1
 *
 * Mesma planta do diagrama (unidades de planta, 1u = 0.08 m).
 * Fluxo: Caminhão → entrada → Salão → (corredores / pátio) → bibliotecas
 *        → sala de Leitura → Extração (roxo).
 * Loops de fuga: Salão ↔ Norte ↔ Bib. A ↔ Leitura ↔ Bib. B ↔ Sul ↔ Salão.
 */
export const mansion01: LevelData = {
  id: 'mansion-01',
  name: 'Mansão · Nível 1',
  scale: 0.08,
  wallHeight: 3.2,
  enemyDelay: 20,
  requiredItems: ['musicBox', 'goldenChalice'],
  playerStart: { x: 75, y: 260 },

  rooms: [
    { id: 'truck', name: 'Caminhão', kind: 'truck', light: 'lit', floor: 'metal', wall: 'metal', x: 40, y: 230, w: 70, h: 60 },
    { id: 'entrance', name: 'Entrada', kind: 'corridor', light: 'lit', floor: 'wood', wall: 'panel', x: 110, y: 240, w: 90, h: 40 },
    { id: 'hall', name: 'Salão', kind: 'room', light: 'lit', floor: 'checker', wall: 'wallpaper', x: 200, y: 150, w: 100, h: 220 },
    { id: 'corrN', name: 'Corredor norte', kind: 'corridor', light: 'dim', floor: 'wood', wall: 'panel', x: 200, y: 100, w: 280, h: 50 },
    { id: 'corrS', name: 'Corredor sul', kind: 'corridor', light: 'dim', floor: 'wood', wall: 'panel', x: 200, y: 370, w: 280, h: 50 },
    { id: 'bath', name: 'Banheiro', kind: 'room', light: 'dim', floor: 'tile', wall: 'tile', x: 330, y: 50, w: 80, h: 50 },
    { id: 'patio', name: 'Pátio', kind: 'outdoor', light: 'moon', floor: 'grass', wall: 'brick', x: 300, y: 170, w: 170, h: 180 },
    { id: 'nook', name: 'Passagem', kind: 'corridor', light: 'dark', floor: 'wood', wall: 'panel', x: 470, y: 245, w: 30, h: 30 },
    { id: 'libA', name: 'Biblioteca A', kind: 'room', light: 'dim', floor: 'wood', wall: 'wallpaper', x: 480, y: 70, w: 130, h: 130 },
    { id: 'reading', name: 'Leitura', kind: 'room', light: 'dark', floor: 'carpet', wall: 'wallpaper', x: 500, y: 200, w: 90, h: 120 },
    { id: 'libB', name: 'Biblioteca B', kind: 'room', light: 'dark', floor: 'wood', wall: 'wallpaper', x: 480, y: 320, w: 130, h: 130 },
    { id: 'extract', name: 'Extração', kind: 'extraction', light: 'dark', floor: 'metal', wall: 'metal', x: 590, y: 235, w: 50, h: 50 },
    { id: 'backV', name: 'Fundos', kind: 'corridor', light: 'dark', floor: 'wood', wall: 'panel', x: 400, y: 420, w: 40, h: 30 },
    {
      id: 'backH',
      name: 'Corredor dos fundos',
      kind: 'corridor',
      light: 'dark',
      floor: 'wood',
      wall: 'panel',
      x: 400,
      y: 450,
      w: 210,
      h: 40,
    },
  ],

  openings: [
    { id: 'truck-entrance', kind: 'passage', x: 106, y: 242, w: 8, h: 36 },
    { id: 'D1', kind: 'door', firstDoor: true, x: 196, y: 248, w: 8, h: 24 },
    { id: 'D2', kind: 'door', x: 230, y: 146, w: 40, h: 8 },
    { id: 'D3', kind: 'door', x: 230, y: 366, w: 40, h: 8 },
    { id: 'D4', kind: 'door', x: 476, y: 110, w: 8, h: 30 },
    { id: 'D5', kind: 'door', x: 355, y: 96, w: 30, h: 8 },
    { id: 'D6', kind: 'door', x: 296, y: 248, w: 8, h: 24 },
    { id: 'patio-nook', kind: 'passage', x: 466, y: 247, w: 8, h: 26 },
    { id: 'D7', kind: 'door', x: 496, y: 248, w: 8, h: 24 },
    { id: 'D8', kind: 'door', x: 525, y: 196, w: 40, h: 8 },
    { id: 'D9', kind: 'door', x: 525, y: 316, w: 40, h: 8 },
    { id: 'D10', kind: 'door', x: 586, y: 248, w: 8, h: 24 },
    { id: 'D11', kind: 'door', x: 476, y: 380, w: 8, h: 30 },
    { id: 'D12', kind: 'door', x: 405, y: 416, w: 30, h: 8 },
    { id: 'back-corner', kind: 'passage', x: 402, y: 446, w: 36, h: 8 },
    { id: 'D13', kind: 'door', x: 540, y: 446, w: 40, h: 8 },
  ],

  props: [
    { id: 'truck-monitor', type: 'monitor', x: 44, y: 260, rot: 90 },

    { id: 'hall-t1', type: 'table', x: 240, y: 195 },
    { id: 'hall-t2', type: 'table', x: 265, y: 300 },
    { id: 'hall-t3', type: 'table', x: 230, y: 340 },
    { id: 'hall-c1', type: 'chair', x: 222, y: 195, rot: 90 },
    { id: 'hall-c2', type: 'chair', x: 258, y: 195, rot: -90 },
    { id: 'hall-c3', type: 'chair', x: 283, y: 300, rot: -90 },
    { id: 'hall-c4', type: 'chair', x: 285, y: 230, rot: -90 },

    { id: 'bath-tub', type: 'bathtub', x: 392, y: 72 },
    { id: 'bath-ward', type: 'wardrobe', x: 339, y: 54 },

    { id: 'libA-s1', type: 'shelf', x: 545, y: 130, w: 80, h: 5 },
    { id: 'libA-s2', type: 'shelf', x: 545, y: 160, w: 80, h: 5 },
    { id: 'libA-t1', type: 'table', x: 590, y: 180 },
    { id: 'libA-ward', type: 'wardrobe', x: 604, y: 85, rot: -90 },

    { id: 'libB-s1', type: 'shelf', x: 545, y: 385, w: 80, h: 5 },
    { id: 'libB-s2', type: 'shelf', x: 545, y: 415, w: 80, h: 5 },
    { id: 'libB-t1', type: 'table', x: 510, y: 435 },
    { id: 'libB-ward', type: 'wardrobe', x: 604, y: 340, rot: -90 },

    { id: 'patio-bench', type: 'bench', x: 340, y: 320 },
    { id: 'patio-table', type: 'table', x: 430, y: 300 },

    { id: 'reading-t1', type: 'table', x: 530, y: 290 },
    { id: 'reading-c1', type: 'chair', x: 515, y: 290, rot: 90 },
    { id: 'reading-ward', type: 'wardrobe', x: 584, y: 300, rot: -90 },

    { id: 'back-ward1', type: 'wardrobe', x: 520, y: 486, rot: 180 },
    { id: 'back-ward2', type: 'wardrobe', x: 596, y: 486, rot: 180 },
  ],

  hidingSpots: [
    { id: 'h-hall-t1', type: 'under-table', propId: 'hall-t1' },
    { id: 'h-hall-t2', type: 'under-table', propId: 'hall-t2' },
    { id: 'h-hall-t3', type: 'under-table', propId: 'hall-t3' },
    { id: 'h-hall-c4', type: 'under-chair', propId: 'hall-c4' },
    { id: 'h-bath', type: 'wardrobe', propId: 'bath-ward' },
    { id: 'h-libA-t', type: 'under-table', propId: 'libA-t1' },
    { id: 'h-libA-w', type: 'wardrobe', propId: 'libA-ward' },
    { id: 'h-libB-t', type: 'under-table', propId: 'libB-t1' },
    { id: 'h-libB-w', type: 'wardrobe', propId: 'libB-ward' },
    { id: 'h-patio', type: 'under-table', propId: 'patio-table' },
    { id: 'h-reading-t', type: 'under-table', propId: 'reading-t1' },
    { id: 'h-reading-w', type: 'wardrobe', propId: 'reading-ward' },
    { id: 'h-back1', type: 'wardrobe', propId: 'back-ward1' },
    { id: 'h-back2', type: 'wardrobe', propId: 'back-ward2' },
  ],

  itemSpawns: [
    { id: 'i-patio', x: 385, y: 255, accepts: ['musicBox', 'generic'] },
    { id: 'i-libA', x: 545, y: 145, accepts: ['musicBox', 'generic'] },
    { id: 'i-libB', x: 545, y: 400, accepts: ['goldenChalice', 'generic'] },
    { id: 'i-bath', x: 368, y: 82, accepts: ['goldenChalice', 'generic'] },
    { id: 'i-hall', x: 285, y: 165, accepts: ['generic'] },
    { id: 'i-corrN', x: 440, y: 125, accepts: ['generic'] },
    { id: 'i-corrS', x: 440, y: 395, accepts: ['generic'] },
    { id: 'i-reading', x: 565, y: 250, accepts: ['generic'] },
    { id: 'i-libA2', x: 500, y: 90, accepts: ['generic'] },
    { id: 'i-libB2', x: 500, y: 340, accepts: ['generic'] },
    { id: 'i-back', x: 450, y: 470, accepts: ['generic'] },
    { id: 'i-patio2', x: 320, y: 190, accepts: ['generic'] },
  ],

  enemySpawns: [
    { id: 'e-pato', enemy: 'patofera', x: 400, y: 330, phase: 'start' },
    { id: 'e-ocopus', enemy: 'ocopus', x: 520, y: 100, phase: 'start' },
    { id: 'e-esposa', enemy: 'esposa', x: 590, y: 470, phase: 'start' },
    { id: 'eb-pato', enemy: 'patofera', x: 250, y: 350, phase: 'blackout' },
    { id: 'eb-ocopus', enemy: 'ocopus', x: 230, y: 125, phase: 'blackout' },
    { id: 'eb-esposa', enemy: 'esposa', x: 160, y: 260, phase: 'blackout' },
  ],
}
