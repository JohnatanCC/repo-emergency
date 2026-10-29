/**
 * O que o cérebro de cada criatura conta para o modelo animar. Objeto
 * mutável (muda todo frame), lido no useFrame do modelo.
 */
export interface Pose {
  /** 0 = parada, 1 = andando no ritmo normal (pode passar de 1 correndo). */
  moving: number
  /** calma (patrulha), alerta (investigando) ou caçando. */
  mode: 'calm' | 'alert' | 'chase'
  /** Atordoada (ferramentas): treme. */
  stunned: boolean
  /** Sombra: no feixe da lanterna. */
  lit: boolean
  /** 0–1: some (Possessor voltando para o objeto). */
  fade: number
}

export const newPose = (): Pose => ({ moving: 0, mode: 'calm', stunned: false, lit: false, fade: 1 })
