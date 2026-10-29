import type { RapierCollider, RapierRigidBody } from '@react-three/rapier'
import type { KinematicCharacterController } from '@dimforge/rapier3d-compat'

/**
 * Atordoamento comum às entidades (ferramentas da loja). Atordoada, a
 * entidade fica presa no lugar: não anda, não ataca e não decide nada; só o
 * empurrão do bastão a move.
 */

export interface StunState {
  /** Segundos restantes atordoada. */
  stun: number
  /** Empurrão restante (m), aplicado em `KNOCK_TIME`. */
  knock: { x: number; z: number }
  vy: number
  grounded: boolean
}

const KNOCK_TIME = 0.25

export const stunFields = (): Pick<StunState, 'stun' | 'knock'> => ({ stun: 0, knock: { x: 0, z: 0 } })

export function applyStun(s: StunState, seconds: number, knock?: { x: number; z: number }) {
  s.stun = Math.max(s.stun, seconds)
  if (knock) s.knock = { x: knock.x, z: knock.z }
}

/**
 * Passo de uma entidade atordoada. Devolve true se ela está atordoada (quem
 * chamou não deve fazer mais nada neste passo).
 */
export function stunStep(
  s: StunState,
  body: RapierRigidBody,
  col: RapierCollider,
  ctrl: KinematicCharacterController,
  dt: number,
): boolean {
  if (s.stun <= 0) return false
  s.stun -= dt
  // empurrão: espalhado em KNOCK_TIME
  const k = Math.min(1, dt / KNOCK_TIME)
  const mx = s.knock.x * k
  const mz = s.knock.z * k
  s.knock.x -= mx
  s.knock.z -= mz
  s.vy = s.grounded ? -1 : Math.max(s.vy - 9.81 * dt, -20)
  ctrl.computeColliderMovement(col, { x: mx, y: s.vy * dt, z: mz })
  const m = ctrl.computedMovement()
  s.grounded = ctrl.computedGrounded()
  const p = body.translation()
  body.setNextKinematicTranslation({ x: p.x + m.x, y: p.y + m.y, z: p.z + m.z })
  return true
}
