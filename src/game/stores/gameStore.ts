import { create } from 'zustand'
import { LIVES } from '../../player/config'
import { POSSESSOR } from '../../enemies/possessor/config'
import { toolInfo, type ToolId } from '../shop'
import { LEVELS } from '../data/levels'

/**
 * Fases de um nível:
 *  car        → jogador no carro, vê o painel com a meta de relíquias
 *  exploring  → abriu a 1ª porta; timer das entidades contando
 *  hunted     → entidades ativas
 *  blackout   → extrator levou os itens: luzes apagam, volta para o carro
 *  results    → chegou ao carro depois da extração: tela de pagamento
 *  shop       → loja entre níveis (0.11.0)
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

/** O que está dentro do extrator agora. */
export interface ExtractorContents {
  /** Relíquias inteiras (contam para a meta). */
  relics: number
  relicValue: number
  loot: number
  lootValue: number
  /** Objetos com o Possessor dentro (o C.R.O.S multa). */
  possessed: number
}

/**
 * idle      → esperando a meta de relíquias
 * charging  → meta cumprida, contagem até levar tudo (cancela se tirar uma relíquia)
 * done      → levou os itens
 */
export type ExtractorStatus = 'idle' | 'charging' | 'done'

const EMPTY: ExtractorContents = { relics: 0, relicValue: 0, loot: 0, lootValue: 0, possessed: 0 }

interface GameState {
  levelIndex: number
  phase: GamePhase
  lives: number
  /** Onde o investigador morreu: ali surge A COISA segurando a cabeça (0.10.0). */
  deathSpots: [number, number, number][]
  /** Saldo acumulado entre contratos. */
  money: number
  /** Ferramentas compradas que ainda não foram para o carro (estoque entre contratos). */
  equipment: Partial<Record<ToolId, number>>
  /** Muda a cada partida nova: itens são sorteados de novo e as portas fecham. */
  matchId: number
  /** performance.now() de quando a 1ª porta abriu (timer das entidades); null = ainda fechada. */
  enemyTimerStart: number | null
  extractor: { status: ExtractorStatus; chargeStart: number | null; inside: ExtractorContents }
  /** O que o extrator levou (pagamento na tela de resultado). */
  result: ExtractorContents | null
  cameraMode: CameraMode
  debug: DebugFlags
  /** Sala visitada pela câmera de editor (-1 = visão geral). Tecla V. */
  visitRoom: number
  setPhase: (phase: GamePhase) => void
  /** 1ª porta aberta: sai do carro e começa a contagem até as entidades. */
  startEnemyTimer: () => void
  /** Perde uma vida; sem vidas, fim de jogo. */
  loseLife: (at: [number, number, number]) => void
  setExtractorInside: (inside: ExtractorContents) => void
  startCharge: () => void
  cancelCharge: () => void
  /** O extrator levou os itens: começa o apagão. */
  completeExtraction: (result: ExtractorContents) => void
  /** Voltou ao carro depois da extração. */
  reachCar: () => void
  /** Cabeça entregue no carro: devolve uma vida. */
  regainLife: () => void
  /** Recebe o pagamento e começa um contrato novo. */
  /** Recebe o pagamento e vai para a loja. */
  toShop: () => void
  /** Compra uma ferramenta (se tiver saldo). */
  buy: (id: ToolId) => boolean
  /** Começa um contrato novo (saindo da loja). */
  nextContract: () => void
  /** Leva o estoque para o carro (início do contrato). */
  takeEquipment: () => ToolId[]
  /** Ferramentas que voltaram com o jogador no fim do contrato. */
  returnEquipment: (ids: ToolId[]) => void
  /** Recomeça o nível depois do fim de jogo. */
  restart: () => void
  toggleCameraMode: () => void
  toggleDebug: (key: keyof DebugFlags) => void
  /** Atalho de teste: alterna entre a fase normal e o apagão */
  toggleBlackout: () => void
  cycleVisit: (roomCount: number) => void
}

/** Fases em que o investigador não se mexe (telas por cima do jogo). */
export function isPaused(phase: GamePhase) {
  return phase === 'gameover' || phase === 'results' || phase === 'shop'
}

/** Índice do próximo local assombrado (o último se repete). */
export function nextLevel(index: number) {
  return Math.min(index + 1, LEVELS.length - 1)
}

/** Pagamento: o C.R.O.S paga as relíquias, o saque é vendido por fora. */
export function payout(r: ExtractorContents) {
  return r.relicValue + r.lootValue - penalty(r)
}

/** Multa do C.R.O.S por objetos possuídos entregues. */
export function penalty(r: ExtractorContents) {
  return r.possessed * POSSESSOR.penalty
}

/** Estado de uma partida nova (contrato novo ou recomeço). */
const freshMatch = (matchId: number) => ({
  lives: LIVES,
  deathSpots: [],
  phase: 'car' as GamePhase,
  enemyTimerStart: null,
  extractor: { status: 'idle' as ExtractorStatus, chargeStart: null, inside: EMPTY },
  result: null,
  matchId: matchId + 1,
})

export const useGameStore = create<GameState>((set, get) => ({
  levelIndex: 0,
  phase: 'car',
  lives: LIVES,
  deathSpots: [],
  money: 0,
  equipment: {},
  matchId: 0,
  enemyTimerStart: null,
  extractor: { status: 'idle', chargeStart: null, inside: EMPTY },
  result: null,
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
  setExtractorInside: (inside) => set((s) => ({ extractor: { ...s.extractor, inside } })),
  startCharge: () => set((s) => ({ extractor: { ...s.extractor, status: 'charging', chargeStart: performance.now() } })),
  cancelCharge: () => set((s) => ({ extractor: { ...s.extractor, status: 'idle', chargeStart: null } })),
  completeExtraction: (result) =>
    set((s) => ({
      extractor: { status: 'done', chargeStart: null, inside: EMPTY },
      result,
      phase: s.phase === 'gameover' ? s.phase : 'blackout',
    })),
  reachCar: () => set((s) => (s.phase === 'blackout' ? { phase: 'results' } : s)),
  regainLife: () => set((s) => ({ lives: Math.min(LIVES, s.lives + 1) })),
  toShop: () => set((s) => (s.phase === 'results' ? { phase: 'shop', money: s.money + (s.result ? payout(s.result) : 0) } : s)),
  buy: (id) => {
    const s = get()
    const price = toolInfo(id).price
    if (s.money < price) return false
    set({ money: s.money - price, equipment: { ...s.equipment, [id]: (s.equipment[id] ?? 0) + 1 } })
    return true
  },
  // contrato cumprido: próximo local (o último se repete)
  nextContract: () => set((s) => ({ ...freshMatch(s.matchId), levelIndex: nextLevel(s.levelIndex) })),
  takeEquipment: () => {
    const ids = Object.entries(get().equipment).flatMap(([id, n]) => Array(n ?? 0).fill(id as ToolId))
    set({ equipment: {} })
    return ids
  },
  returnEquipment: (ids) =>
    set((s) => {
      const equipment = { ...s.equipment }
      for (const id of ids) equipment[id] = (equipment[id] ?? 0) + 1
      return { equipment }
    }),
  restart: () => set((s) => freshMatch(s.matchId)),
  toggleCameraMode: () => set((s) => ({ cameraMode: s.cameraMode === 'player' ? 'editor' : 'player' })),
  toggleDebug: (key) => set((s) => ({ debug: { ...s.debug, [key]: !s.debug[key] } })),
  toggleBlackout: () => set((s) => ({ phase: s.phase === 'blackout' ? 'car' : 'blackout' })),
  visitRoom: -1,
  cycleVisit: (roomCount) => set((s) => ({ visitRoom: s.visitRoom + 1 >= roomCount ? -1 : s.visitRoom + 1 })),
}))
