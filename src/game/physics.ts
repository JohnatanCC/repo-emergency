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
} as const

export const WORLD_GROUPS = interactionGroups(GROUP.WORLD)
export const PLAYER_GROUPS = interactionGroups(GROUP.PLAYER)
export const DOOR_GROUPS = interactionGroups(GROUP.DOOR, [GROUP.PLAYER, GROUP.ITEM])
/** Raio da mira: bate em tudo menos no próprio jogador. */
export const AIM_GROUPS = interactionGroups(GROUP.PLAYER, [GROUP.WORLD, GROUP.DOOR, GROUP.ITEM])
