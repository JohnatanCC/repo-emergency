import { create } from 'zustand'
import { audio } from '../audio/engine'

/** Preferências do jogador, guardadas no navegador. */
export interface Settings {
  /** 0–1, multiplica o volume geral. */
  volume: number
  /** Multiplica a velocidade do mouse. */
  sensitivity: number
}

export const SETTINGS_RANGE = {
  volume: { min: 0, max: 1, step: 0.05 },
  sensitivity: { min: 0.2, max: 2.5, step: 0.05 },
}

const KEY = 'relicario.settings'
const DEFAULTS: Settings = { volume: 0.8, sensitivity: 1 }

// o armazenamento pode faltar ou falhar (janela privada, bloqueio): segue com o padrão
function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    /* sem armazenamento */
  }
  return DEFAULTS
}
function save(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* sem armazenamento */
  }
}

interface SettingsStore extends Settings {
  set: (patch: Partial<Settings>) => void
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...load(),
  set: (patch) => {
    set(patch)
    const { volume, sensitivity } = get()
    save({ volume, sensitivity })
    audio.setVolume(volume)
  },
}))

audio.setVolume(useSettingsStore.getState().volume)
