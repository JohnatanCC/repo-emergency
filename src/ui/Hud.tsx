import { useEffect, useState } from 'react'
import { VERSION, VERSION_NAME } from '../game/version'
import { useGameStore, type DebugFlags } from '../game/stores/gameStore'
import { SOUNDS, playSound, type EsposaSound } from '../game/audio/sounds'
import type { LevelData } from '../game/data/types'

const TOGGLES: { key: string; flag: keyof DebugFlags; label: string }[] = [
  { key: 'g', flag: 'gizmos', label: 'Marcadores' },
  { key: 'l', flag: 'fullbright', label: 'Luz total' },
  { key: 'r', flag: 'retro', label: 'Filtro retrô' },
  { key: 'f', flag: 'fog', label: 'Neblina' },
]

const SOUND_LABELS: Record<EsposaSound, string> = {
  idle: 'Rondando (aleatório)',
  near: 'Perto (dedos)',
  targeting: 'Te viu',
  searchHiding: 'Vasculhando esconderijo',
  attack: 'Ataque',
  stunStart: 'Atordoada',
  stunLoop: 'Atordoada (loop)',
}

export function Hud({ level }: { level: LevelData }) {
  const debug = useGameStore((s) => s.debug)
  const phase = useGameStore((s) => s.phase)
  const lives = useGameStore((s) => s.lives)
  const toggleDebug = useGameStore((s) => s.toggleDebug)
  const toggleBlackout = useGameStore((s) => s.toggleBlackout)
  const cycleVisit = useGameStore((s) => s.cycleVisit)
  const visitRoom = useGameStore((s) => s.visitRoom)
  const [sound, setSound] = useState<EsposaSound>('targeting')
  const [panel, setPanel] = useState(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLSelectElement) return
      const k = e.key.toLowerCase()
      const t = TOGGLES.find((t) => t.key === k)
      if (t) toggleDebug(t.flag)
      if (k === 'b') toggleBlackout()
      if (k === 'v') cycleVisit(level.rooms.length)
      if (k === 'h') setPanel((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleDebug, toggleBlackout, cycleVisit, level.rooms.length])

  return (
    <div className="hud">
      <div>
        <div className="hud-title">
          R.E.P.O: EMERGENCY
          <small>
            v{VERSION} · {VERSION_NAME}
          </small>
        </div>
        <div className="hud-sub">
          {level.name} · fase: {phase} · vidas: {lives} · itens: {level.requiredItems.join(', ')}
        </div>
      </div>

      {!panel && (
        <div className="hud-sub">
          <kbd>H</kbd> mostrar painel
        </div>
      )}
      {panel && (
        <div className="hud-panel">
          <h3>Modo editor</h3>
          <div className="row">
            <span>Câmera</span>
            <span>arrastar · scroll · botão direito</span>
          </div>
          {TOGGLES.map((t) => (
            <div className="row" key={t.flag}>
              <span>
                <kbd>{t.key.toUpperCase()}</kbd> {t.label}
              </span>
              <span className={debug[t.flag] ? 'on' : 'off'}>{debug[t.flag] ? 'ligado' : 'desligado'}</span>
            </div>
          ))}
          <div className="row">
            <span>
              <kbd>B</kbd> Apagão (prévia)
            </span>
            <span className={phase === 'blackout' ? 'on' : 'off'}>{phase === 'blackout' ? 'ligado' : 'desligado'}</span>
          </div>
          <div className="row">
            <span>
              <kbd>V</kbd> Visitar sala
            </span>
            <span>{visitRoom < 0 ? 'visão geral' : level.rooms[visitRoom].name}</span>
          </div>
          <div className="row" style={{ marginTop: 6 }}>
            <select value={sound} onChange={(e) => setSound(e.target.value as EsposaSound)}>
              {(Object.keys(SOUNDS.esposa) as EsposaSound[]).map((k) => (
                <option key={k} value={k}>
                  Esposa: {SOUND_LABELS[k]}
                </option>
              ))}
            </select>
            <button onClick={() => playSound(SOUNDS.esposa[sound])}>▶ tocar</button>
          </div>
          <div className="row" style={{ marginTop: 4 }}>
            <span>
              <kbd>H</kbd> esconder painel
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
