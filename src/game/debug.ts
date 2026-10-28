import { useGameStore } from './stores/gameStore'
import { usePlayerStore } from '../player/playerStore'

/**
 * Comandos de teste em `window.__relicario` (só em dev). Servem para testar
 * sem pointer lock, por exemplo no navegador automatizado. O Player preenche
 * `pos`, `look` e `tp` quando monta.
 */
export const debugApi = {
  game: useGameStore,
  player: usePlayerStore,
  /** Simula o mouse travado. */
  play: () => usePlayerStore.getState().setLocked(true),
  /** Segura uma tecla (KeyboardEvent.code) por `ms` milissegundos. */
  hold: (code: string, ms: number) =>
    new Promise<void>((resolve) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code }))
      setTimeout(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { code }))
        resolve()
      }, ms)
    }),
  /** Aperta uma tecla uma vez. */
  press: (code: string, key = '') => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, key }))
    window.dispatchEvent(new KeyboardEvent('keyup', { code, key }))
  },
  pos: (): [number, number, number] => [0, 0, 0],
  look: (_yawDeg: number, _pitchDeg = 0) => {},
  tp: (_x: number, _z: number) => {},
}

export function installDebugApi() {
  if (import.meta.env.DEV) (window as unknown as { __relicario: typeof debugApi }).__relicario = debugApi
}
