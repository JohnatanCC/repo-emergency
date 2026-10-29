import * as THREE from 'three'

/**
 * Molas para animar as criaturas: em vez de pular direto para a pose nova,
 * cada parte segue o alvo com inércia (acelera, passa um pouco e volta).
 */

export interface Spring {
  x: number
  v: number
  /** Alvo atual (o giro usa para "desenrolar" o ângulo). */
  t: number
  started: boolean
}

/** k = rigidez (mais = mais rápido) · d = amortecimento (1 = não passa do ponto). */
export interface SpringParams {
  k: number
  d: number
}

export const spring = (x = 0): Spring => ({ x, v: 0, t: x, started: false })

export function stepSpring(s: Spring, target: number, dt: number, p: SpringParams) {
  // Euler semi-implícito: estável até dt ≈ 2/√k; passos grandes são divididos
  const steps = Math.max(1, Math.ceil(dt / 0.02))
  const h = dt / steps
  const c = 2 * Math.sqrt(p.k) * p.d
  for (let i = 0; i < steps; i++) {
    s.v += ((target - s.x) * p.k - s.v * c) * h
    s.x += s.v * h
  }
  s.t = target
  return s.x
}

const q = new THREE.Quaternion()
const e = new THREE.Euler()

/**
 * Giro com atraso: o corpo físico vira na hora e o modelo acompanha com mola
 * (gira um pouco além e volta). `obj` é a raiz do modelo.
 */
export function turnLag(s: Spring, obj: THREE.Object3D, dt: number, p: SpringParams) {
  if (!obj.parent) return
  obj.parent.getWorldQuaternion(q)
  const yaw = e.setFromQuaternion(q, 'YXZ').y
  if (!s.started) {
    s.started = true
    s.x = s.t = yaw
  }
  // segue o ângulo sem o salto de −π para π
  const d = Math.atan2(Math.sin(yaw - s.t), Math.cos(yaw - s.t))
  stepSpring(s, s.t + d, dt, p)
  obj.rotation.y = s.x - s.t
}
