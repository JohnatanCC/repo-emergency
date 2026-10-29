/**
 * Criaturas em cena, para as ferramentas (crucifixo, granada, bastão)
 * acharem e atordoarem. Cada entidade se registra ao entrar em cena.
 */

export interface Creature {
  id: string
  name: string
  /** Handle do colisor (para achar pela mira). */
  colliderHandle: () => number | undefined
  pos: () => { x: number; z: number }
  /** Atordoa (presa no lugar) por `seconds`; `knock` empurra na horizontal (m). */
  stun: (seconds: number, knock?: { x: number; z: number }) => void
}

const creatures = new Map<string, Creature>()

export function registerCreature(c: Creature) {
  creatures.set(c.id, c)
  return () => {
    if (creatures.get(c.id) === c) creatures.delete(c.id)
  }
}

export const allCreatures = () => [...creatures.values()]

export function creatureByCollider(handle: number) {
  return allCreatures().find((c) => c.colliderHandle() === handle)
}
