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
  | 'murmur'
  | 'scare'
  | 'knock'
  | 'musicbox'
  | 'scrape'
  | 'moan'
  | 'stinger'
  | 'assemble'
  | 'revive'
  | 'breath'
  | 'chase'
  | 'menuTheme'
  | 'uiMove'
  | 'uiSelect'
  | 'uiBack'
  | 'pageTurn'
  | 'espectroHum'
  | 'espectroChase'
  | 'espectroScream'

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
  ambience: 0.2,
  heartbeat: 0.5,
  extractor: 0.6,
  /** Vento lá fora / abafado dentro da casa. */
  windOutside: 0.3,
  windInside: 0.12,
  crickets: 0.16,
  drip: 0.28,
  clock: 0.22,
  thunder: 0.45,
  /** Respiração ofegante (correndo, cansado ou com medo). */
  breath: 0.35,
  /** Música do menu (início; mais baixa na pausa) e sons da interface. */
  menuMusic: 0.45,
  menuMusicPause: 0.18,
  ui: 0.5,
  /** O Espectro: cantarolar (vagando), lamento (perseguindo) e grito. */
  espectro: 0.8,
  espectroChase: 0.6,
  /** Música de perseguição (criaturas com chaseMusic). */
  chase: 0.5,
  /** Acorde quando uma criatura começa a caçar. */
  stinger: 0.4,
  /** Guardiã. */
  guardia: 0.9,
  /** Sombra (respiração ao se mover). */
  sombra: 0.8,
  /** Possessor (murmúrio do objeto e a figura liberta). */
  possessor: 0.85,
}

/** Separação dentro × fora e eventos distantes (AudioDirector). */
export const AUDIO_ZONES = {
  /** Som do outro lado (fora ouvido de dentro, ou o contrário): volume e abafamento. */
  volume: 0.15,
  muffle: 0.85,
  /** Intervalo entre eventos distantes (s). */
  eventMin: 18,
  eventMax: 40,
}
