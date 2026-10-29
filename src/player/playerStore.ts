import { create } from 'zustand'
import { PLAYER } from './config'
import type { Hint } from '../game/systems/interactables'

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
  /** Dica da mira, ex.: "abrir porta" (null = nada na frente). */
  hint: Hint | null
  flashlight: boolean
  /** Bateria da lanterna (0–100). */
  battery: number
  damage: (amount: number) => void
  setStamina: (stamina: number, exhausted: boolean) => void
  setCrouching: (crouching: boolean) => void
  setLocked: (locked: boolean) => void
  setHint: (hint: Hint | null) => void
  toggleFlashlight: () => void
  setBattery: (battery: number) => void
  addBattery: (amount: number) => void
  respawn: () => void
}

export const usePlayerStore = create<PlayerState>((set) => ({
  health: PLAYER.maxHealth,
  stamina: PLAYER.maxStamina,
  exhausted: false,
  crouching: false,
  locked: false,
  respawnId: 0,
  hint: null,
  flashlight: true,
  battery: 100,
  damage: (amount) => set((s) => ({ health: Math.max(0, s.health - amount) })),
  setStamina: (stamina, exhausted) => set({ stamina, exhausted }),
  setCrouching: (crouching) => set({ crouching }),
  setLocked: (locked) => set({ locked }),
  setHint: (hint) => set({ hint }),
  toggleFlashlight: () => set((s) => ({ flashlight: !s.flashlight })),
  setBattery: (battery) => set({ battery }),
  addBattery: (amount) => set((s) => ({ battery: Math.min(100, s.battery + amount) })),
  respawn: () =>
    set((s) => ({
      health: PLAYER.maxHealth,
      stamina: PLAYER.maxStamina,
      exhausted: false,
      battery: 100,
      respawnId: s.respawnId + 1,
    })),
}))
