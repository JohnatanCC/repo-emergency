import { useEffect, useState } from 'react'
import { VERSION, VERSION_NAME } from '../game/version'
import { useGameStore, type DebugFlags } from '../game/stores/gameStore'
import { SOUNDS, playSound } from '../game/audio/sounds'
import type { LevelData } from '../game/data/types'
import { usePlayerStore } from '../player/playerStore'
import { PLAYER } from '../player/config'

const TOGGLES: { key: string; flag: keyof DebugFlags; label: string }[] = [
  { key: 'g', flag: 'gizmos', label: 'Marcadores' },
  { key: 'l', flag: 'fullbright', label: 'Luz total' },
  { key: 'r', flag: 'retro', label: 'Filtro retrô' },
  { key: 'f', flag: 'fog', label: 'Neblina' },
]

/** Dano da tecla K, para testar morte e renascimento. */
const DEBUG_DAMAGE = 25

/** Todos os sons do manifesto como "grupo: nome", para o teste no painel. */
const SOUND_LIST = Object.entries(SOUNDS).flatMap(([group, sounds]) =>
  Object.entries(sounds).map(([name, src]) => ({ id: `${group}.${name}`, label: `${group}: ${name}`, src })),
)

/** Vida, estamina e vidas restantes (canto inferior esquerdo). */
function Vitals() {
  const health = usePlayerStore((s) => s.health)
  const stamina = usePlayerStore((s) => s.stamina)
  const exhausted = usePlayerStore((s) => s.exhausted)
  const lives = useGameStore((s) => s.lives)
  return (
    <div className="hud-vitals">
      <div className="hud-lives">{'● '.repeat(Math.max(0, lives)).trim() || '—'}</div>
      <div className="bar health">
        <div style={{ width: `${(health / PLAYER.maxHealth) * 100}%` }} />
      </div>
      <div className={`bar stamina${exhausted ? ' exhausted' : ''}`}>
        <div style={{ width: `${(stamina / PLAYER.maxStamina) * 100}%` }} />
      </div>
    </div>
  )
}

export function Hud({ level }: { level: LevelData }) {
  const debug = useGameStore((s) => s.debug)
  const phase = useGameStore((s) => s.phase)
  const cameraMode = useGameStore((s) => s.cameraMode)
  const toggleDebug = useGameStore((s) => s.toggleDebug)
  const toggleBlackout = useGameStore((s) => s.toggleBlackout)
  const toggleCameraMode = useGameStore((s) => s.toggleCameraMode)
  const cycleVisit = useGameStore((s) => s.cycleVisit)
  const visitRoom = useGameStore((s) => s.visitRoom)
  const locked = usePlayerStore((s) => s.locked)
  const [sound, setSound] = useState(SOUND_LIST[0]?.id ?? '')
  const [panel, setPanel] = useState(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLSelectElement) return
      if (e.key === 'F1') {
        e.preventDefault()
        if (document.pointerLockElement) document.exitPointerLock()
        toggleCameraMode()
        return
      }
      const k = e.key.toLowerCase()
      const t = TOGGLES.find((t) => t.key === k)
      if (t) toggleDebug(t.flag)
      if (k === 'b') toggleBlackout()
      if (k === 'v' && useGameStore.getState().cameraMode === 'editor') cycleVisit(level.rooms.length)
      if (k === 'h') setPanel((v) => !v)
      if (k === 'k') usePlayerStore.getState().damage(DEBUG_DAMAGE)
      if (k === 'enter' && useGameStore.getState().phase === 'gameover') {
        useGameStore.getState().restart()
        usePlayerStore.getState().respawn()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleDebug, toggleBlackout, toggleCameraMode, cycleVisit, level.rooms.length])

  const playing = cameraMode === 'player' && phase !== 'gameover'

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-title">
          RELICÁRIO
          <small>
            v{VERSION} · {VERSION_NAME}
          </small>
        </div>
        <div className="hud-sub">
          {level.name} · fase: {phase} · meta: {level.relicQuota} relíquias
        </div>

        {!panel && (
          <div className="hud-sub">
            <kbd>H</kbd> mostrar painel
          </div>
        )}
        {panel && (
          <div className="hud-panel">
            <h3>{cameraMode === 'player' ? 'Investigador' : 'Modo editor'}</h3>
            {cameraMode === 'player' ? (
              <>
                <div className="row">
                  <span>
                    <kbd>W</kbd>
                    <kbd>A</kbd>
                    <kbd>S</kbd>
                    <kbd>D</kbd> andar
                  </span>
                  <span>
                    <kbd>Shift</kbd> correr
                  </span>
                </div>
                <div className="row">
                  <span>
                    <kbd>C</kbd> agachar (segurar)
                  </span>
                  <span>
                    <kbd>Esc</kbd> soltar mouse
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="row">
                  <span>Câmera</span>
                  <span>arrastar · scroll · botão direito</span>
                </div>
                <div className="row">
                  <span>
                    <kbd>V</kbd> Visitar sala
                  </span>
                  <span>{visitRoom < 0 ? 'visão geral' : level.rooms[visitRoom].name}</span>
                </div>
              </>
            )}
            <div className="row">
              <span>
                <kbd>F1</kbd> Câmera
              </span>
              <span>{cameraMode === 'player' ? 'investigador' : 'editor'}</span>
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
                <kbd>K</kbd> Tomar {DEBUG_DAMAGE} de dano
              </span>
            </div>
            {SOUND_LIST.length > 0 && (
              <div className="row" style={{ marginTop: 6 }}>
                <select value={sound} onChange={(e) => setSound(e.target.value)}>
                  {SOUND_LIST.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const s = SOUND_LIST.find((s) => s.id === sound)
                    if (s) playSound(s.src)
                  }}
                >
                  ▶ tocar
                </button>
              </div>
            )}
            <div className="row" style={{ marginTop: 4 }}>
              <span>
                <kbd>H</kbd> esconder painel
              </span>
            </div>
          </div>
        )}
      </div>

      {playing && locked && <div className="hud-crosshair" />}
      {playing && !locked && <div className="hud-center">clique para jogar</div>}
      {phase === 'gameover' && (
        <div className="hud-center gameover">
          FIM DE JOGO
          <small>
            <kbd>Enter</kbd> recomeçar
          </small>
        </div>
      )}

      {cameraMode === 'player' && <Vitals />}
    </div>
  )
}
