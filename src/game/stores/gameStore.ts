import { create } from 'zustand'

/**
 * Fases de um nível (a lógica de cada transição entra nas próximas versões):
 *  car        → jogador no carro, vê o painel com a meta de relíquias
 *  exploring  → saiu do carro; timer de spawn começa ao cruzar a 1ª porta
 *  hunted     → monstros ativos
 *  blackout   → carrinho extraído: luzes apagam, monstros reaparecem no início
 *  results    → voltou ao carro
 *  shop       → loja entre níveis
 *  gameover   → o investigador morreu
 */
export type GamePhase = 'car' | 'exploring' | 'hunted' | 'blackout' | 'results' | 'shop' | 'gameover'

export interface DebugFlags {
  /** Marcadores de spawn, esconderijos, portas */
  gizmos: boolean
  /** Ilumina tudo (para editar o mapa) */
  fullbright: boolean
  /** Filtro retrô (baixa resolução + pós-processamento) */
  retro: boolean
  fog: boolean
}

interface GameState {
  levelIndex: number
  phase: GamePhase
  money: number
  debug: DebugFlags
  /** Sala visitada pela câmera de editor (-1 = visão geral). Tecla V. */
  visitRoom: number
  setPhase: (phase: GamePhase) => void
  toggleDebug: (key: keyof DebugFlags) => void
  /** Atalho de teste: alterna entre a fase normal e o apagão */
  toggleBlackout: () => void
  cycleVisit: (roomCount: number) => void
}

export const useGameStore = create<GameState>((set) => ({
  levelIndex: 0,
  phase: 'car',
  money: 0,
  debug: { gizmos: true, fullbright: false, retro: true, fog: true },
  setPhase: (phase) => set({ phase }),
  toggleDebug: (key) => set((s) => ({ debug: { ...s.debug, [key]: !s.debug[key] } })),
  toggleBlackout: () => set((s) => ({ phase: s.phase === 'blackout' ? 'car' : 'blackout' })),
  visitRoom: -1,
  cycleVisit: (roomCount) => set((s) => ({ visitRoom: s.visitRoom + 1 >= roomCount ? -1 : s.visitRoom + 1 })),
}))
