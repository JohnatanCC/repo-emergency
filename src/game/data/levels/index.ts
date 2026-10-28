import type { LevelData } from '../types'
import { mansion01 } from './mansion-01'

/** Os 5 níveis da Mansão. Os níveis 2–5 entram na versão 0.12.0. */
export const LEVELS: LevelData[] = [mansion01]

export function getLevel(index: number): LevelData {
  return LEVELS[Math.min(index, LEVELS.length - 1)]
}
