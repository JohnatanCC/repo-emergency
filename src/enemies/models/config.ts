import type { SpringParams } from './spring'

/** Molas das animações das criaturas (spring.ts). */
export const ANIM: Record<'soft' | 'snappy' | 'head' | 'limb' | 'turn', SpringParams> = {
  /** Corpo: inclinação e balanço, pesado. */
  soft: { k: 35, d: 0.5 },
  /** Reações rápidas (tiques, congelar no feixe). */
  snappy: { k: 180, d: 0.4 },
  /** Cabeça: passa do ponto e volta, meio solta. */
  head: { k: 60, d: 0.3 },
  /** Braços e pernas. */
  limb: { k: 90, d: 0.45 },
  /** Atraso do corpo ao virar. */
  turn: { k: 45, d: 0.42 },
}
