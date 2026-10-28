/**
 * Manifesto de sons. Os arquivos ficam em public/audio/ (ex.: public/audio/guardia/passos01.ogg).
 * Use só sons próprios ou com licença livre (freesound.org, CC0 / CC-BY com crédito no README).
 * Na 0.5.0 isto vira áudio posicional (3D) ligado ao sistema de ruído;
 * por enquanto `playSound` toca em 2D para testar no painel.
 *
 * Exemplo:
 *   guardia: {
 *     idle: [`${AUDIO}guardia/murmurio01.ogg`, `${AUDIO}guardia/murmurio02.ogg`],
 *     alert: `${AUDIO}guardia/alerta.ogg`,
 *   },
 */

export const AUDIO = `${import.meta.env.BASE_URL}audio/`

export type SoundSrc = string | readonly string[]

export const SOUNDS: Record<string, Record<string, SoundSrc>> = {}

export function resolveSound(src: SoundSrc): string {
  return typeof src === 'string' ? src : src[Math.floor(Math.random() * src.length)]
}

export function playSound(src: SoundSrc, volume = 0.8): HTMLAudioElement {
  const audio = new Audio(resolveSound(src))
  audio.volume = volume
  void audio.play().catch(() => {})
  return audio
}
