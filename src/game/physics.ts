import { interactionGroups } from '@react-three/rapier'

/**
 * Grupos de colisão. O mundo fixo (paredes, pisos, móveis) fica só no grupo
 * WORLD, assim as portas podem ignorá-lo e girar rente às paredes sem travar.
 */
export const GROUP = {
  WORLD: 0,
  PLAYER: 1,
  DOOR: 2,
  ITEM: 3,
  ENEMY: 4,
} as const

export const WORLD_GROUPS = interactionGroups(GROUP.WORLD)
export const PLAYER_GROUPS = interactionGroups(GROUP.PLAYER)
/** Itens batem em tudo. */
export const ITEM_GROUPS = interactionGroups(GROUP.ITEM)
/** Entidades batem em tudo (e empurram portas e itens). */
export const ENEMY_GROUPS = interactionGroups(GROUP.ENEMY)
export const DOOR_GROUPS = interactionGroups(GROUP.DOOR, [GROUP.PLAYER, GROUP.ITEM, GROUP.ENEMY])
/** Linha de visão das entidades: paredes, móveis e portas bloqueiam; itens e corpos não. */
export const SIGHT_GROUPS = interactionGroups(GROUP.ITEM, [GROUP.WORLD, GROUP.DOOR])
/** Raio da mira: bate em tudo menos no próprio jogador. */
export const AIM_GROUPS = interactionGroups(GROUP.PLAYER, [GROUP.WORLD, GROUP.DOOR, GROUP.ITEM])
