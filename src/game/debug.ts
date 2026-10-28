import { advance } from '@react-three/fiber'
import { useGameStore } from './stores/gameStore'
import { usePlayerStore } from '../player/playerStore'
import { useItemStore } from '../items/itemStore'
import { useHidingStore } from '../player/hidingStore'

/**
 * Comandos de teste em `window.__relicario` (só em dev). Servem para testar
 * sem pointer lock, por exemplo no navegador automatizado. O Player preenche
 * `pos`, `look` e `tp` quando monta.
 */
/**
 * Avança o jogo por `ms` milissegundos desenhando frames à mão. Com o painel
 * do navegador escondido o requestAnimationFrame para, e sem isso nada se mexe.
 */
async function tick(ms: number) {
  const end = performance.now() + ms
  while (performance.now() < end) {
    advance(performance.now())
    await new Promise((r) => setTimeout(r, 16))
  }
}

export const debugApi = {
  game: useGameStore,
  player: usePlayerStore,
  items: useItemStore,
  hiding: useHidingStore,
  /** Simula o mouse travado. */
  play: () => usePlayerStore.getState().setLocked(true),
  tick,
  /** Segura uma tecla (KeyboardEvent.code) por `ms` milissegundos, avançando os frames. */
  hold: async (code: string, ms: number) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code }))
    await tick(ms)
    window.dispatchEvent(new KeyboardEvent('keyup', { code }))
  },
  /** Aperta uma tecla uma vez. */
  press: (code: string, key = '') => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, key }))
    window.dispatchEvent(new KeyboardEvent('keyup', { code, key }))
  },
  pos: (): [number, number, number] => [0, 0, 0],
  /** O que a mira acertou no último frame (distância e se é interagível). */
  aim: (): { dist: number; interactable: boolean } | null => null,
  look: (_yawDeg: number, _pitchDeg = 0) => {},
  tp: (_x: number, _z: number) => {},
}

export function installDebugApi() {
  if (import.meta.env.DEV) (window as unknown as { __relicario: typeof debugApi }).__relicario = debugApi
}
