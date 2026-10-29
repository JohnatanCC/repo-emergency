import { doorHandles } from '../world/Doors'
import type { NavGrid, P2 } from './nav'

/**
 * Andar pela grade de navegação, comum a todas as entidades: seguir o caminho,
 * perceber que travou e destravar em etapas. Cada entidade guarda um
 * `WalkState` e decide o resto (para onde ir, quando parar).
 */

export interface WalkState {
  pos: P2
  path: P2[]
  target: P2 | null
  /** Menor distância já alcançada até o próximo ponto (mede progresso). */
  best: number
  noProgress: number
  /** Referência para "não saiu do lugar" (não zera ao recalcular o caminho). */
  anchor: P2
  anchorTime: number
  /** Tentativas seguidas de destravar (porta → desvio → desvio → desiste). */
  unstick: number
  unstickAt: P2
  /** Andando até um ponto de desvio; depois retoma o destino. */
  detour: boolean
}

export interface WalkTuning {
  /** Tempo sem progresso até contar como travada. */
  stuckTime: number
  /** Portas a até esta distância são empurradas ao travar. */
  doorReach: number
  /** Raio do passo de lado. */
  detourRadius: number
}

const dist = (a: P2, b: P2) => Math.hypot(a.x - b.x, a.z - b.z)

export function newWalkState(at: P2): WalkState {
  return {
    pos: { ...at },
    path: [],
    target: null,
    best: Infinity,
    noProgress: 0,
    anchor: { ...at },
    anchorTime: 0,
    unstick: 0,
    unstickAt: { ...at },
    detour: false,
  }
}

export function walkTo(w: WalkState, nav: NavGrid, target: P2) {
  w.target = target
  w.path = nav.findPath(w.pos, target)
  w.best = Infinity
  w.noProgress = 0
  w.detour = false
}

/** Sem destino (esquece o antigo: senão a entidade "já chegou" de novo e fica parada). */
export function walkStop(w: WalkState) {
  w.path = []
  w.target = null
  w.detour = false
}

/** Terminou o desvio: retoma o destino. Chame antes de decidir se "chegou". */
export function walkResume(w: WalkState, nav: NavGrid) {
  if (!w.detour || w.path.length) return
  w.detour = false
  if (w.target) w.path = nav.findPath(w.pos, w.target)
  w.best = Infinity
}

/** Deslocamento deste passo em direção ao próximo ponto do caminho. */
export function walkSteer(w: WalkState, speed: number, dt: number) {
  while (w.path.length && dist(w.pos, w.path[0]) < 0.25) {
    w.path.shift()
    w.best = Infinity
  }
  if (!w.path.length || speed <= 0) return { mx: 0, mz: 0 }
  const n = w.path[0]
  const d = dist(w.pos, n)
  return { mx: ((n.x - w.pos.x) / d) * speed * dt, mz: ((n.z - w.pos.z) / d) * speed * dt }
}

/**
 * Depois de mover: mede o progresso e, se travou, destrava em etapas.
 * Devolve 'giveup' quando esgotou as tentativas (a entidade escolhe outro destino).
 */
export function walkCheckStuck(
  w: WalkState,
  nav: NavGrid,
  tuning: WalkTuning,
  wantsToMove: boolean,
  dt: number,
  onUnstick?: () => void,
): 'giveup' | null {
  let result: 'giveup' | null = null
  if (wantsToMove && w.path.length) {
    const d = dist(w.pos, w.path[0])
    if (d < w.best - 0.05) {
      w.best = d
      w.noProgress = 0
    } else w.noProgress += dt
    // não sai do lugar: vale também quando o caminho é recalculado toda hora (perseguição)
    if (dist(w.pos, w.anchor) > 0.4) {
      w.anchor = { ...w.pos }
      w.anchorTime = 0
    } else w.anchorTime += dt
    if (w.noProgress > tuning.stuckTime || w.anchorTime > tuning.stuckTime * 1.5) {
      w.noProgress = 0
      w.anchorTime = 0
      w.best = Infinity
      onUnstick?.()
      result = unstick(w, nav, tuning)
    }
  } else {
    w.noProgress = 0
    w.anchorTime = 0
    w.anchor = { ...w.pos }
  }
  // andou bem depois do último destravamento: zera as tentativas
  if (w.unstick && dist(w.pos, w.unstickAt) > 2) w.unstick = 0
  return result
}

function unstick(w: WalkState, nav: NavGrid, tuning: WalkTuning): 'giveup' | null {
  w.unstick++
  w.unstickAt = { ...w.pos }
  // 1) porta perto (fechada ou aberta atravessada): joga para longe, com estrondo
  let door = false
  for (const d of doorHandles.values()) {
    if (Math.hypot(d.x - w.pos.x, d.z - w.pos.z) < tuning.doorReach) {
      d.force([w.pos.x, 1, w.pos.z])
      door = true
    }
  }
  if (w.unstick === 1 && door) return null
  // 2–3) passo de lado até um ponto livre perto e tenta de novo
  if (w.unstick <= 3) {
    for (let i = 0; i < 6; i++) {
      const side = nav.randomPoint({ x: w.pos.x, z: w.pos.z, radius: tuning.detourRadius })
      if (!side || dist(side, w.pos) < 0.6) continue
      const path = nav.findPath(w.pos, side)
      if (path.length) {
        w.path = path
        w.detour = true
        return null
      }
    }
  }
  // 4) desiste
  w.unstick = 0
  return 'giveup'
}
