import { create } from 'zustand'
import { PLAYER } from './config'

/**
 * Estado do investigador que o HUD mostra. Separado do gameStore porque a
 * estamina muda a cada frame enquanto corre: só quem lê isto redesenha.
 */
interface PlayerState {
  health: number
  stamina: number
  /** Estamina zerou: não corre até chegar em PLAYER.staminaRecover. */
  exhausted: boolean
  crouching: boolean
  /** Mouse travado na tela (pointer lock). */
  locked: boolean
  /** Muda a cada renascimento; o Player teleporta para o carro quando muda. */
  respawnId: number
  damage: (amount: number) => void
  setStamina: (stamina: number, exhausted: boolean) => void
  setCrouching: (crouching: boolean) => void
  setLocked: (locked: boolean) => void
  respawn: () => void
}

export const usePlayerStore = create<PlayerState>((set) => ({
  health: PLAYER.maxHealth,
  stamina: PLAYER.maxStamina,
  exhausted: false,
  crouching: false,
  locked: false,
  respawnId: 0,
  damage: (amount) => set((s) => ({ health: Math.max(0, s.health - amount) })),
  setStamina: (stamina, exhausted) => set({ stamina, exhausted }),
  setCrouching: (crouching) => set({ crouching }),
  setLocked: (locked) => set({ locked }),
  respawn: () =>
    set((s) => ({
      health: PLAYER.maxHealth,
      stamina: PLAYER.maxStamina,
      exhausted: false,
      respawnId: s.respawnId + 1,
    })),
}))
