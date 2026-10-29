import type { FloorType } from '../data/types'

/**
 * Lista de sons do jogo. Todos são gerados por código (synth.ts); para
 * trocar um por arquivo, coloque o .ogg em public/audio/ e registre em
 * SOUND_FILES (várias variações = sorteia uma por vez).
 * Use só sons próprios ou com licença livre (freesound.org, CC0 / CC-BY com crédito no README).
 */

export type SoundId =
  | `step-${FloorType}`
  | 'creak'
  | 'slam'
  | 'thunk'
  | 'shatter'
  | 'rustle'
  | 'click'
  | 'drone'
  | 'hum'
  | 'charge'
  | 'whoosh'
  | 'heartbeat'
  | 'wind'
  | 'windIndoor'
  | 'crickets'
  | 'drip'
  | 'tick'
  | 'thunder'
  | 'shuffle'
  | 'whisper'
  | 'shriek'
  | 'hit'
  | 'hiss'

export const AUDIO_DIR = `${import.meta.env.BASE_URL}audio/`

/**
 * Arquivos que substituem o som gerado. Exemplo:
 *   creak: [`${AUDIO_DIR}portas/rangido01.ogg`, `${AUDIO_DIR}portas/rangido02.ogg`],
 */
export const SOUND_FILES: Partial<Record<SoundId, string[]>> = {}

/** Mixagem e espacialização. */
export const AUDIO = {
  master: 0.8,
  /** Distância (m) até onde o som está no volume cheio. */
  refDistance: 1.5,
  rolloff: 1.1,
  maxDistance: 50,
  /** Volumes relativos. */
  steps: 0.5,
  doors: 0.8,
  items: 0.8,
  ambience: 0.35,
  heartbeat: 0.7,
  extractor: 0.6,
  /** Vento lá fora / abafado dentro da casa. */
  windOutside: 0.5,
  windInside: 0.35,
  crickets: 0.35,
  drip: 0.5,
  clock: 0.45,
  thunder: 0.7,
  /** Guardiã. */
  guardia: 0.9,
  /** Sombra (respiração ao se mover). */
  sombra: 0.8,
}
