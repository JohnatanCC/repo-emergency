import { create } from 'zustand'
import { PLAYER } from './config'
import type { Hint } from '../game/systems/interactables'

/** Quem pode matar o investigador (define o jumpscare). */
export type Killer = 'guardia' | 'sombra' | 'possessor' | 'espectro'

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
  /** Aviso rápido na tela (ex.: "nenhuma criatura na mira"). */
  toast: { text: string; at: number } | null
  /** Último golpe de criatura: quem matou, se a vida zerar. */
  lastHit: Killer | null
  /** Quando levou o último dano (ms, performance.now). */
  lastHitAt: number
  /** Jumpscare em andamento (o id muda a cada morte). */
  jumpscare: { by: Killer; id: number } | null
  /** Renascendo no carro (cena do corpo sendo remontado): id da cena, ou null. */
  reviving: number | null
  startRevive: () => void
  endRevive: () => void
  damage: (amount: number, by?: Killer) => void
  /** Possuído pelo Possessor até este instante (performance.now, ms). */
  possessedUntil: number
  possess: (seconds: number) => void
  scare: (by: Killer) => void
  clearScare: () => void
  setStamina: (stamina: number, exhausted: boolean) => void
  setCrouching: (crouching: boolean) => void
  setLocked: (locked: boolean) => void
  setHint: (hint: Hint | null) => void
  toggleFlashlight: () => void
  setBattery: (battery: number) => void
  showToast: (text: string) => void
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
  toast: null,
  lastHit: null,
  lastHitAt: -1e9,
  possessedUntil: 0,
  possess: (seconds) => set({ possessedUntil: performance.now() + seconds * 1000 }),
  jumpscare: null,
  reviving: null,
  startRevive: () => set((s) => ({ reviving: (s.reviving ?? 0) + 1 })),
  endRevive: () => set({ reviving: null }),
  damage: (amount, by) =>
    set((s) => {
      const now = performance.now()
      // golpe de criatura logo depois de outro não conta (dá tempo de fugir)
      if (by && amount > 0 && (s.reviving !== null || now - s.lastHitAt < PLAYER.hitGrace * 1000)) return s
      return {
        health: Math.max(0, Math.min(PLAYER.maxHealth, s.health - amount)),
        lastHit: by && amount > 0 ? by : s.lastHit,
        lastHitAt: amount > 0 ? now : s.lastHitAt,
      }
    }),
  scare: (by) => set((s) => ({ jumpscare: { by, id: (s.jumpscare?.id ?? 0) + 1 } })),
  clearScare: () => set({ jumpscare: null }),
  setStamina: (stamina, exhausted) => set({ stamina, exhausted }),
  setCrouching: (crouching) => set({ crouching }),
  setLocked: (locked) => set({ locked }),
  setHint: (hint) => set({ hint }),
  toggleFlashlight: () => set((s) => ({ flashlight: !s.flashlight })),
  setBattery: (battery) => set({ battery }),
  showToast: (text) => set({ toast: { text, at: performance.now() } }),
  addBattery: (amount) => set((s) => ({ battery: Math.min(100, s.battery + amount) })),
  respawn: () =>
    set((s) => ({
      health: PLAYER.maxHealth,
      stamina: PLAYER.maxStamina,
      exhausted: false,
      battery: 100,
      respawnId: s.respawnId + 1,
      lastHit: null,
      possessedUntil: 0,
    })),
}))

/** Possuído agora? 0–1 (some aos poucos no último segundo). */
export function possession() {
  const left = (usePlayerStore.getState().possessedUntil - performance.now()) / 1000
  return Math.max(0, Math.min(1, left))
}
