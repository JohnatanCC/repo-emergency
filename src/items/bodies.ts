import type { RapierRigidBody } from '@react-three/rapier'

/** Corpos físicos dos itens no mapa, por uid (o extrator lê as posições daqui). */
export const itemBodies = new Map<string, RapierRigidBody>()
