import type { LevelData } from '../types'
import { link, room } from './plan'

/**
 * Mansão Profunda — Nível 5
 *
 * A casa da Guardiã por dentro: Salão → galerias norte e sul, que cercam a
 * Biblioteca e a Sala de jantar e servem quartos, escritório, cozinha e adega.
 * No fim das galerias, o Corredor leste leva à Estufa (com o extrator) e à
 * Capela privada. Quase tudo escuro.
 */

const car = room('car', 'Carro', 'car', 'lit', 'metal', 'metal', [40, 330, 70, 60])
const entrance = room('entrance', 'Entrada', 'corridor', 'dim', 'wood', 'panel', [110, 340, 80, 40])
const salon = room('salon', 'Salão', 'room', 'dim', 'checker', 'wallpaper', [190, 250, 140, 220])
const galN = room('galN', 'Galeria norte', 'corridor', 'dark', 'wood', 'panel', [330, 250, 300, 50])
const galS = room('galS', 'Galeria sul', 'corridor', 'dark', 'wood', 'panel', [330, 420, 300, 50])
const library = room('library', 'Biblioteca', 'room', 'dark', 'wood', 'wallpaper', [330, 300, 150, 120])
const dining = room('dining', 'Sala de jantar', 'room', 'dim', 'checker', 'wallpaper', [480, 300, 150, 120])
const bedroom = room('bedroom', 'Quarto principal', 'room', 'dark', 'carpet', 'wallpaper', [330, 150, 150, 100])
const study = room('study', 'Escritório', 'room', 'dark', 'wood', 'panel', [480, 150, 150, 100], ['clock'])
const kitchen = room('kitchen', 'Cozinha', 'room', 'dim', 'tile', 'tile', [330, 470, 150, 100], ['drip'])
const cellar = room('cellar', 'Adega', 'room', 'dark', 'tile', 'brick', [480, 470, 150, 100])
const corrE = room('corrE', 'Corredor leste', 'corridor', 'dark', 'wood', 'panel', [630, 250, 50, 320])
const greenhouse = room('greenhouse', 'Estufa', 'outdoor', 'moon', 'grass', 'brick', [680, 250, 120, 150], ['crickets'])
const chapel = room('chapel', 'Capela privada', 'room', 'dark', 'carpet', 'wallpaper', [680, 400, 120, 170])
const extract = room('extract', 'Extração', 'extraction', 'dark', 'metal', 'metal', [800, 300, 50, 50])

export const deepManor05: LevelData = {
  id: 'deep-manor-05',
  name: 'Mansão Profunda · Nível 5',
  scale: 0.08,
  wallHeight: 3.2,
  enemyDelay: 12,
  relicQuota: 5,
  playerStart: { x: 75, y: 360 },

  rooms: [car, entrance, salon, galN, galS, library, dining, bedroom, study, kitchen, cellar, corrE, greenhouse, chapel, extract],

  openings: [
    link('car-entrance', car, entrance, 'passage', { len: 32 }),
    link('D1', entrance, salon, 'door', { firstDoor: true }),
    link('D2', salon, galN),
    link('D3', salon, galS),
    link('D4', galN, library, 'door', { at: 0.3 }),
    link('D5', galN, dining, 'door', { at: 0.6 }),
    link('D6', galS, library, 'door', { at: 0.6 }),
    link('D7', galS, dining, 'door', { at: 0.3 }),
    link('D8', library, dining),
    link('D9', galN, bedroom),
    link('D10', galN, study),
    link('D11', galS, kitchen),
    link('D12', galS, cellar),
    link('D13', galN, corrE),
    link('D14', galS, corrE),
    link('D15', corrE, greenhouse, 'door', { at: 0.3 }),
    link('D16', corrE, chapel),
    link('D17', greenhouse, extract),
  ],

  props: [
    { id: 'car-panel', type: 'monitor', x: 44, y: 360, rot: 90 },

    { id: 'sal-t1', type: 'table', x: 240, y: 300 },
    { id: 'sal-t2', type: 'table', x: 290, y: 300 },
    { id: 'sal-t3', type: 'table', x: 240, y: 420 },
    { id: 'sal-t4', type: 'table', x: 290, y: 420 },
    { id: 'sal-c1', type: 'chair', x: 222, y: 300, rot: 90 },
    { id: 'sal-c2', type: 'chair', x: 308, y: 420, rot: -90 },

    { id: 'bed-b', type: 'bench', x: 370, y: 175 },
    { id: 'bed-ward', type: 'wardrobe', x: 474, y: 190, rot: -90 },
    { id: 'bed-t', type: 'table', x: 440, y: 215 },

    { id: 'st-desk', type: 'table', x: 555, y: 190 },
    { id: 'st-chair', type: 'chair', x: 555, y: 203, rot: 180 },
    { id: 'st-shelf', type: 'shelf', x: 555, y: 157, w: 100, h: 5 },
    { id: 'st-ward', type: 'wardrobe', x: 624, y: 220, rot: -90 },

    { id: 'lib-s1', type: 'shelf', x: 405, y: 330, w: 100, h: 5 },
    { id: 'lib-s2', type: 'shelf', x: 405, y: 390, w: 100, h: 5 },
    { id: 'lib-t', type: 'table', x: 405, y: 360 },

    { id: 'din-t1', type: 'table', x: 530, y: 360 },
    { id: 'din-t2', type: 'table', x: 580, y: 360 },
    { id: 'din-c1', type: 'chair', x: 530, y: 345 },
    { id: 'din-c2', type: 'chair', x: 580, y: 375, rot: 180 },

    { id: 'kit-t', type: 'table', x: 405, y: 525 },
    { id: 'kit-s', type: 'shelf', x: 405, y: 563, w: 80, h: 5 },
    { id: 'kit-ward', type: 'wardrobe', x: 336, y: 525, rot: 90 },

    { id: 'cel-s1', type: 'shelf', x: 525, y: 520, w: 50, h: 5 },
    { id: 'cel-s2', type: 'shelf', x: 595, y: 520, w: 40, h: 5 },
    { id: 'cel-t', type: 'table', x: 590, y: 552 },

    { id: 'gh-t1', type: 'table', x: 725, y: 290 },
    { id: 'gh-t2', type: 'table', x: 760, y: 355 },
    { id: 'gh-bench', type: 'bench', x: 740, y: 385 },

    { id: 'cp-p1', type: 'bench', x: 720, y: 460 },
    { id: 'cp-p2', type: 'bench', x: 770, y: 460 },
    { id: 'cp-p3', type: 'bench', x: 720, y: 500 },
    { id: 'cp-p4', type: 'bench', x: 770, y: 500 },
    { id: 'cp-altar', type: 'table', x: 745, y: 548 },
    { id: 'cp-ward', type: 'wardrobe', x: 794, y: 430, rot: -90 },
  ],

  hidingSpots: [
    { id: 'h-sal-t1', type: 'under-table', propId: 'sal-t1' },
    { id: 'h-sal-t4', type: 'under-table', propId: 'sal-t4' },
    { id: 'h-bed-w', type: 'wardrobe', propId: 'bed-ward' },
    { id: 'h-st-desk', type: 'under-table', propId: 'st-desk' },
    { id: 'h-st-w', type: 'wardrobe', propId: 'st-ward' },
    { id: 'h-lib-t', type: 'under-table', propId: 'lib-t' },
    { id: 'h-din-t1', type: 'under-table', propId: 'din-t1' },
    { id: 'h-kit-w', type: 'wardrobe', propId: 'kit-ward' },
    { id: 'h-cel-t', type: 'under-table', propId: 'cel-t' },
    { id: 'h-gh-t1', type: 'under-table', propId: 'gh-t1' },
    { id: 'h-cp-w', type: 'wardrobe', propId: 'cp-ward' },
    { id: 'h-cp-altar', type: 'under-table', propId: 'cp-altar' },
  ],

  itemSpawns: [
    { id: 'i-bed', x: 400, y: 205, accepts: ['relic', 'loot'] },
    { id: 'i-study', x: 510, y: 215, accepts: ['relic', 'loot'] },
    { id: 'i-lib', x: 455, y: 360, accepts: ['relic', 'loot'] },
    { id: 'i-cellar', x: 510, y: 548, accepts: ['relic', 'loot'] },
    { id: 'i-chapel', x: 745, y: 430, accepts: ['relic', 'loot'] },
    { id: 'i-gh', x: 765, y: 275, accepts: ['relic', 'loot'] },
    { id: 'i-dining', x: 610, y: 330, accepts: ['relic', 'loot'] },
    { id: 'i-sal1', x: 215, y: 360, accepts: ['loot'] },
    { id: 'i-sal2', x: 310, y: 360, accepts: ['loot'] },
    { id: 'i-galN', x: 450, y: 275, accepts: ['loot'] },
    { id: 'i-galS', x: 550, y: 445, accepts: ['loot'] },
    { id: 'i-kit', x: 450, y: 500, accepts: ['loot'] },
    { id: 'i-corrE', x: 655, y: 400, accepts: ['loot'] },
    { id: 'i-dining2', x: 505, y: 395, accepts: ['loot'] },
    { id: 'i-lib2', x: 345, y: 410, accepts: ['loot'] },
  ],

  enemySpawns: [
    { id: 'e-guardia', enemy: 'guardia', x: 760, y: 530, phase: 'start' },
    { id: 'e-sombra', enemy: 'sombra', x: 560, y: 545, phase: 'start' },
    { id: 'eb-guardia', enemy: 'guardia', x: 250, y: 360, phase: 'blackout' },
    { id: 'eb-sombra', enemy: 'sombra', x: 400, y: 275, phase: 'blackout' },
    // o Espectro começa na capela privada, no fundo da casa
    { id: 'e-espectro', enemy: 'espectro', x: 740, y: 485, phase: 'start', delay: 30 },
    { id: 'eb-espectro', enemy: 'espectro', x: 405, y: 200, phase: 'blackout' },
  ],
}
