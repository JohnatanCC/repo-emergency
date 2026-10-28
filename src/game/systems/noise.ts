/**
 * Barramento de ruído. Quem faz barulho chama `emitNoise`; as entidades
 * (0.7.0+) vão escutar com `onNoise`. Por enquanto só os marcadores de debug ouvem.
 */

export type NoiseType = 'door' | 'doorSlam' | 'footstep' | 'item'

export interface Noise {
  pos: [number, number, number]
  /** Até onde dá para ouvir, em metros. */
  radius: number
  type: NoiseType
  /** performance.now() de quando aconteceu. */
  time: number
}

type Listener = (noise: Noise) => void

const listeners = new Set<Listener>()

export function emitNoise(noise: Omit<Noise, 'time'>) {
  const n = { ...noise, time: performance.now() }
  listeners.forEach((l) => l(n))
}

export function onNoise(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
