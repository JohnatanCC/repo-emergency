import { create } from 'zustand'
import { LIVES } from '../../player/config'

/**
 * Fases de um nível (a lógica de cada transição entra nas próximas versões):
 *  car        → jogador no carro, vê o painel com a meta de relíquias
 *  exploring  → saiu do carro; timer de spawn começa ao cruzar a 1ª porta
 *  hunted     → monstros ativos
 *  blackout   → extrator levou os itens: luzes apagam, monstros reaparecem no início
 *  results    → voltou ao carro
 *  shop       → loja entre níveis
 *  gameover   → acabaram as vidas
 */
export type GamePhase = 'car' | 'exploring' | 'hunted' | 'blackout' | 'results' | 'shop' | 'gameover'

/** player = primeira pessoa; editor = câmera livre do modo editor (F1). */
export type CameraMode = 'player' | 'editor'

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
  lives: number
  /** Onde o investigador morreu: ali surge A COISA segurando a cabeça (0.10.0). */
  deathSpots: [number, number, number][]
  money: number
  /** Muda a cada recomeço: os itens são sorteados de novo. */
  matchId: number
  /** performance.now() de quando a 1ª porta abriu (timer das entidades); null = ainda fechada. */
  enemyTimerStart: number | null
  cameraMode: CameraMode
  debug: DebugFlags
  /** Sala visitada pela câmera de editor (-1 = visão geral). Tecla V. */
  visitRoom: number
  setPhase: (phase: GamePhase) => void
  /** 1ª porta aberta: sai do carro e começa a contagem até as entidades. */
  startEnemyTimer: () => void
  /** Perde uma vida; sem vidas, fim de jogo. */
  loseLife: (at: [number, number, number]) => void
  /** Recomeça o nível depois do fim de jogo. */
  restart: () => void
  toggleCameraMode: () => void
  toggleDebug: (key: keyof DebugFlags) => void
  /** Atalho de teste: alterna entre a fase normal e o apagão */
  toggleBlackout: () => void
  cycleVisit: (roomCount: number) => void
}

export const useGameStore = create<GameState>((set) => ({
  levelIndex: 0,
  phase: 'car',
  lives: LIVES,
  deathSpots: [],
  money: 0,
  matchId: 0,
  enemyTimerStart: null,
  cameraMode: 'player',
  debug: { gizmos: true, fullbright: false, retro: true, fog: true },
  setPhase: (phase) => set({ phase }),
  startEnemyTimer: () =>
    set((s) => (s.enemyTimerStart !== null ? s : { enemyTimerStart: performance.now(), phase: s.phase === 'car' ? 'exploring' : s.phase })),
  loseLife: (at) =>
    set((s) => {
      const lives = s.lives - 1
      return { lives, deathSpots: [...s.deathSpots, at], phase: lives <= 0 ? 'gameover' : s.phase }
    }),
  restart: () => set((s) => ({ lives: LIVES, deathSpots: [], phase: 'car', enemyTimerStart: null, matchId: s.matchId + 1 })),
  toggleCameraMode: () => set((s) => ({ cameraMode: s.cameraMode === 'player' ? 'editor' : 'player' })),
  toggleDebug: (key) => set((s) => ({ debug: { ...s.debug, [key]: !s.debug[key] } })),
  toggleBlackout: () => set((s) => ({ phase: s.phase === 'blackout' ? 'car' : 'blackout' })),
  visitRoom: -1,
  cycleVisit: (roomCount) => set((s) => ({ visitRoom: s.visitRoom + 1 >= roomCount ? -1 : s.visitRoom + 1 })),
}))
