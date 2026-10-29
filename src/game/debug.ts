import { advance } from '@react-three/fiber'
import { useGameStore } from './stores/gameStore'
import { usePlayerStore } from '../player/playerStore'
import { useItemStore } from '../items/itemStore'
import { useHidingStore } from '../player/hidingStore'
import { guardiaDebug } from '../enemies/guardia/Guardia'
import { sombraDebug } from '../enemies/sombra/Sombra'
import { possessorDebug } from '../enemies/possessor/Possessor'
import { coisaDebug } from '../enemies/coisa/Coisa'

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
  /** Estado da Guardiã (state, seeing, pos, path). */
  guardia: guardiaDebug,
  /** Estado da Sombra (state, lit, pos, path). */
  sombra: sombraDebug,
  /** Possessor: carregando o objeto? quantas figuras soltas, estado e posição. */
  possessor: possessorDebug,
  /** As COISAS em cena (id, estado, posição). */
  coisa: coisaDebug,
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
  /** Desempenho de um quadro (preenchido por world/DebugProbe.tsx): draw calls, triângulos, luzes, tempo. */
  stats: (): Record<string, number> => ({}),
  /** Usa a ferramenta do espaço escolhido (o mesmo que o clique esquerdo). */
  useTool: () => {},
  /** O que a mira acertou no último frame (distância e se é interagível). */
  aim: (): { dist: number; interactable: boolean } | null => null,
  look: (_yawDeg: number, _pitchDeg = 0) => {},
  tp: (_x: number, _z: number) => {},
}

export function installDebugApi() {
  if (import.meta.env.DEV) (window as unknown as { __relicario: typeof debugApi }).__relicario = debugApi
}
