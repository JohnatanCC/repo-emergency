/**
 * Manifesto de sons. Os arquivos ficam em public/audio/.
 * Na 0.5.0 isto vira áudio posicional (3D) ligado ao sistema de ruído;
 * por enquanto `playSound` toca em 2D para testar.
 */

const ROBE = `${import.meta.env.BASE_URL}audio/robe/`

export const SOUNDS = {
  esposa: {
    /** Rondando ao longe — tocar um aleatório de vez em quando */
    idle: [
      `${ROBE}Enemy_robe_noise01.ogg`,
      `${ROBE}Enemy_robe_noise02.ogg`,
      `${ROBE}Enemy_robe_noise03.ogg`,
      `${ROBE}Enemy_robe_noise04.ogg`,
    ],
    /** Perto, mas ainda não te viu */
    near: `${ROBE}Enemy_robe_cracking_fingers_slow.ogg`,
    /** Acabou de te notar. Depois disso: SILÊNCIO durante a perseguição */
    targeting: `${ROBE}Enemy_robe_targeting.ogg`,
    /** Vasculhando o esconderijo do jogador */
    searchHiding: `${ROBE}Enemy_robe_look_under_scream.ogg`,
    /** Golpe fatal */
    attack: `${ROBE}Enemy_robe_attack_short.ogg`,
    /** Atordoada por equipamento da loja */
    stunStart: `${ROBE}Enemy_robe_stun_start.ogg`,
    stunLoop: `${ROBE}Enemy_robe_stun_loop.ogg`,
  },
} as const

export type EsposaSound = keyof typeof SOUNDS.esposa

export function resolveSound(src: string | readonly string[]): string {
  return typeof src === 'string' ? src : src[Math.floor(Math.random() * src.length)]
}

export function playSound(src: string | readonly string[], volume = 0.8): HTMLAudioElement {
  const audio = new Audio(resolveSound(src))
  audio.volume = volume
  void audio.play().catch(() => {})
  return audio
}
