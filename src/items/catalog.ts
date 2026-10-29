import type { ItemSize, ItemTag } from '../game/data/types'

/**
 * Catálogo de itens. Relíquias contam para a meta do C.R.O.S; saque é o que
 * o investigador rouba para vender por fora.
 *
 * - small: cabe num dos 3 espaços do inventário
 * - medium: vai nas mãos (uma mão), ainda abre portas
 * - large: vai nas mãos (duas mãos), não corre e não abre portas
 */

export type ItemShape = 'box' | 'cylinder' | 'sphere'

export interface ItemDef {
  id: string
  name: string
  /** relic / loot vêm do sorteio; supply = suprimento que é usado ao pegar (não vai para o inventário). */
  tag: ItemTag | 'supply'
  size: ItemSize
  /** Valor inteiro, em dinheiro. */
  value: number
  /** 0 = inquebrável, 1 = muito frágil. */
  fragility: number
  /** kg */
  mass: number
  shape: ItemShape
  /** Dimensões em metros: box [l, a, p] · cylinder [raio, altura] · sphere [raio]. */
  dims: number[]
  color: string
  /** Suprimento: quanto de bateria da lanterna devolve ao pegar (0–100). */
  battery?: number
}

export const ITEMS: ItemDef[] = [
  // relíquias
  {
    id: 'sino',
    name: 'Sino de exorcismo',
    tag: 'relic',
    size: 'small',
    value: 300,
    fragility: 0.2,
    mass: 0.6,
    shape: 'cylinder',
    dims: [0.06, 0.12],
    color: '#b08d3a',
  },
  {
    id: 'relicario',
    name: 'Relicário de prata',
    tag: 'relic',
    size: 'small',
    value: 400,
    fragility: 0.3,
    mass: 0.4,
    shape: 'box',
    dims: [0.1, 0.07, 0.08],
    color: '#b8bcc4',
  },
  {
    id: 'boneca',
    name: 'Boneca de porcelana',
    tag: 'relic',
    size: 'medium',
    value: 600,
    fragility: 0.9,
    mass: 1.5,
    shape: 'box',
    dims: [0.2, 0.4, 0.14],
    color: '#e6dccb',
  },
  {
    id: 'espelho',
    name: 'Espelho velado',
    tag: 'relic',
    size: 'large',
    value: 900,
    fragility: 0.8,
    mass: 12,
    shape: 'box',
    dims: [0.7, 1.0, 0.08],
    color: '#2a2630',
  },
  // saque
  {
    id: 'castical',
    name: 'Castiçal de bronze',
    tag: 'loot',
    size: 'small',
    value: 80,
    fragility: 0.05,
    mass: 1.2,
    shape: 'cylinder',
    dims: [0.05, 0.25],
    color: '#8a6a2a',
  },
  {
    id: 'relogio',
    name: 'Relógio de bolso',
    tag: 'loot',
    size: 'small',
    value: 120,
    fragility: 0.4,
    mass: 0.2,
    shape: 'sphere',
    dims: [0.05],
    color: '#c9a64a',
  },
  {
    id: 'taca',
    name: 'Taça de cristal',
    tag: 'loot',
    size: 'small',
    value: 90,
    fragility: 1,
    mass: 0.3,
    shape: 'cylinder',
    dims: [0.05, 0.18],
    color: '#c8dce6',
  },
  {
    id: 'vaso',
    name: 'Vaso pintado',
    tag: 'loot',
    size: 'medium',
    value: 250,
    fragility: 0.9,
    mass: 3,
    shape: 'cylinder',
    dims: [0.14, 0.45],
    color: '#3a5a8a',
  },
  {
    id: 'caixa',
    name: 'Caixa de joias',
    tag: 'loot',
    size: 'medium',
    value: 200,
    fragility: 0.3,
    mass: 1.5,
    shape: 'box',
    dims: [0.25, 0.12, 0.18],
    color: '#5a2a1a',
  },
  {
    id: 'quadro',
    name: 'Quadro a óleo',
    tag: 'loot',
    size: 'large',
    value: 350,
    fragility: 0.5,
    mass: 4,
    shape: 'box',
    dims: [0.8, 0.6, 0.05],
    color: '#6a4a2a',
  },
  {
    id: 'gramofone',
    name: 'Gramofone',
    tag: 'loot',
    size: 'large',
    value: 500,
    fragility: 0.6,
    mass: 9,
    shape: 'box',
    dims: [0.45, 0.45, 0.45],
    color: '#3a2a1a',
  },
]

/** Suprimentos: usados na hora em que são pegos. */
export const SUPPLIES: ItemDef[] = [
  {
    id: 'pilhas',
    name: 'Pilhas',
    tag: 'supply',
    size: 'small',
    value: 0,
    fragility: 0,
    mass: 0.3,
    // pacote de pilhas: caixa (um cilindro de 3 cm atravessava o chão)
    shape: 'box',
    dims: [0.12, 0.06, 0.08],
    color: '#c9a020',
    battery: 50,
  },
]

/** Quantos pontos de saque viram pilhas a cada partida. */
export const SUPPLY_SPAWNS = 2

/** Regras de carregar e de dano. */
export const CARRY = {
  slots: 3,
  /** Multiplicador da velocidade com o item nas mãos. */
  speedMedium: 0.92,
  speedLarge: 0.75,
  /** Impacto abaixo disso (m/s) não estraga nada. */
  safeImpact: 3,
  /** Fração do valor original perdida por m/s acima do seguro, multiplicada pela fragilidade. */
  damagePerImpact: 0.15,
  /** Abaixo desta fração do valor original, o item quebra e passa a valer 0. */
  brokenAt: 0.1,
  /** Itens recém-sorteados caem de 1,2 m: ficam imunes por este tempo (ms). */
  spawnGrace: 2500,
  /** Raio do barulho por m/s de impacto. */
  noisePerImpact: 2.5,
}

/** Uma relíquia brilha de leve, para dar para achar no escuro. */
export const RELIC_GLOW = { color: '#8a5cff', intensity: 0.35 }
