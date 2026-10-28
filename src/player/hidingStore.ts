import { create } from 'zustand'
import type { HidingType } from '../game/data/types'

/**
 * Esconderijo atual do investigador e esconderijos "marcados".
 *
 * Regra: se uma entidade vê o jogador entrar num esconderijo, ele fica marcado
 * e ela vai procurar ali (0.7.0+). As entidades escutam `onHide` e chamam
 * `mark` se estavam olhando na hora.
 */

export interface HideState {
  id: string
  type: HidingType
  /** Quanto esconde: 1 = totalmente (armário, mesa), menos = parcial (cadeira). */
  cover: number
}

/** Quanto cada tipo esconde. */
export const COVER: Record<HidingType, number> = {
  wardrobe: 1,
  'under-table': 0.85,
  'under-chair': 0.5,
}

type HideListener = (spot: HideState) => void
const listeners = new Set<HideListener>()

/** Avisa quando o jogador entra num esconderijo (para as entidades decidirem se viram). */
export function onHide(listener: HideListener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

interface HidingState {
  spot: HideState | null
  marked: string[]
  /** Muda ao entrar/sair do armário, para o Player mover o corpo. */
  wardrobeId: string | null
  enter: (id: string, type: HidingType) => void
  leave: () => void
  mark: (id: string) => void
  isMarked: (id: string) => boolean
  reset: () => void
}

export const useHidingStore = create<HidingState>((set, get) => ({
  spot: null,
  marked: [],
  wardrobeId: null,
  enter: (id, type) => {
    if (get().spot?.id === id) return
    const spot = { id, type, cover: COVER[type] }
    set({ spot, wardrobeId: type === 'wardrobe' ? id : null })
    listeners.forEach((l) => l(spot))
  },
  leave: () => {
    if (get().spot) set({ spot: null, wardrobeId: null })
  },
  mark: (id) => set((s) => (s.marked.includes(id) ? s : { marked: [...s.marked, id] })),
  isMarked: (id) => get().marked.includes(id),
  reset: () => set({ spot: null, marked: [], wardrobeId: null }),
}))
