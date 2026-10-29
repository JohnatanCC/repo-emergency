import type { ItemDef } from '../items/catalog'

/**
 * Loja do C.R.O.S (entre contratos). As ferramentas compradas aparecem no
 * chão do carro no começo do contrato e ocupam espaço no inventário.
 */

export type ToolId = 'crucifixo' | 'kitP' | 'kitM' | 'kitG' | 'granada' | 'bastao'

export interface ToolInfo {
  id: ToolId
  name: string
  price: number
  /** O que aparece na loja. */
  description: string
  /** Gasta ao usar? (o bastão não) */
  consumable: boolean
  def: ItemDef
}

const tool = (id: ToolId, name: string, color: string, dims: number[], shape: ItemDef['shape'] = 'box'): ItemDef => ({
  id,
  name,
  tag: 'tool',
  size: 'small',
  value: 0,
  fragility: 0,
  mass: 0.5,
  shape,
  dims,
  color,
})

export const TOOLS: ToolInfo[] = [
  {
    id: 'crucifixo',
    name: 'Crucifixo',
    price: 400,
    description: 'Mire numa criatura (até 4 m): fica presa e atordoada por 20 s.',
    consumable: true,
    def: tool('crucifixo', 'Crucifixo', '#c9b070', [0.08, 0.2, 0.03]),
  },
  {
    id: 'kitP',
    name: 'Kit médico pequeno',
    price: 100,
    description: 'Cura 25 de vida.',
    consumable: true,
    def: tool('kitP', 'Kit médico pequeno', '#c03a3a', [0.12, 0.06, 0.08]),
  },
  {
    id: 'kitM',
    name: 'Kit médico médio',
    price: 180,
    description: 'Cura 50 de vida.',
    consumable: true,
    def: tool('kitM', 'Kit médico médio', '#c03a3a', [0.16, 0.08, 0.1]),
  },
  {
    id: 'kitG',
    name: 'Kit médico grande',
    price: 300,
    description: 'Cura 100 de vida.',
    consumable: true,
    def: tool('kitG', 'Kit médico grande', '#c03a3a', [0.2, 0.1, 0.13]),
  },
  {
    id: 'granada',
    name: 'Granada de luz',
    price: 350,
    description: 'Arremesse: clarão que atordoa todas as criaturas a até 6 m por 12 s.',
    consumable: true,
    def: tool('granada', 'Granada de luz', '#7a8a6a', [0.05, 0.12], 'cylinder'),
  },
  {
    id: 'bastao',
    name: 'Bastão',
    price: 250,
    description: 'Golpeie (até 2,2 m): empurra a criatura e atordoa por 1,5 s. Não gasta.',
    consumable: false,
    def: tool('bastao', 'Bastão', '#5a3a1e', [0.04, 0.6], 'cylinder'),
  },
]

export const toolInfo = (id: ToolId) => TOOLS.find((t) => t.id === id)!

/** Efeitos das ferramentas. */
export const TOOL_FX = {
  heal: { kitP: 25, kitM: 50, kitG: 100 } as Record<string, number>,
  crucifixRange: 4,
  crucifixStun: 20,
  grenadeRadius: 6,
  grenadeStun: 12,
  /** Segundos até explodir depois de arremessada. */
  grenadeFuse: 1.2,
  grenadeThrowSpeed: 9,
  grenadeNoise: 14,
  batRange: 2.2,
  batStun: 1.5,
  /** Quanto o golpe empurra a criatura (m). */
  batKnockback: 1.6,
  batCooldown: 0.8,
}
