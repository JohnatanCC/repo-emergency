import { audio } from '../game/audio/engine'
import { AUDIO } from '../game/audio/sounds'

/** Sons da interface (menus, bestiário, loja), todos no volume `AUDIO.ui`. */
export const uiSound = {
  /** Cursor passou para outra opção. */
  move: () => audio.play('uiMove', { volume: AUDIO.ui * 0.6, rate: 0.95 + Math.random() * 0.1 }),
  /** Escolheu uma opção. */
  select: () => audio.play('uiSelect', { volume: AUDIO.ui }),
  /** Voltou / fechou um painel. */
  back: () => audio.play('uiBack', { volume: AUDIO.ui * 0.8 }),
  /** Virou a página do caderno. */
  page: () => audio.play('pageTurn', { volume: AUDIO.ui, rate: 0.9 + Math.random() * 0.2 }),
}
