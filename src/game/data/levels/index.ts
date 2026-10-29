import type { LevelData } from '../types'
import { mansion01 } from './mansion-01'
import { orphanage02 } from './orphanage-02'
import { hospital03 } from './hospital-03'
import { church04 } from './church-04'
import { deepManor05 } from './deep-manor-05'
import { withExterior } from './exterior'

/**
 * Os locais assombrados, em ordem: cada contrato cumprido avança um (o último se repete).
 * Todos ganham o mesmo lado de fora: caminhão, jardim e fachada (exterior.ts).
 */
export const LEVELS: LevelData[] = [mansion01, orphanage02, hospital03, church04, deepManor05].map(withExterior)

export function getLevel(index: number): LevelData {
  return LEVELS[Math.min(index, LEVELS.length - 1)]
}
