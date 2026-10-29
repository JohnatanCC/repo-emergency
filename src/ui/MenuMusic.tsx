import { useEffect, useRef } from 'react'
import { audio, type LoopHandle } from '../game/audio/engine'
import { AUDIO } from '../game/audio/sounds'

/**
 * Música do menu: cheia na tela de início, baixinha na pausa, some no jogo.
 * O loop fica sempre montado e só muda de volume (sem recomeçar a música).
 */
export function MenuMusic({ mode }: { mode: 'menu' | 'pause' | 'off' }) {
  const loop = useRef<LoopHandle | null>(null)
  useEffect(() => {
    loop.current = audio.loop('menuTheme', { volume: 0 })
    return () => loop.current?.stop()
  }, [])
  useEffect(() => {
    const v = mode === 'menu' ? AUDIO.menuMusic : mode === 'pause' ? AUDIO.menuMusicPause : 0
    // entra devagar; ao começar a jogar, sai rápido
    loop.current?.setVolume(v, mode === 'off' ? 1.2 : 2.5)
  }, [mode])
  return null
}
