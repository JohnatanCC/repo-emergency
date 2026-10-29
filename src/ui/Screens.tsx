import { useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { isPaused, useGameStore } from '../game/stores/gameStore'
import { SETTINGS_RANGE, useSettingsStore } from '../game/stores/settingsStore'
import type { LevelData } from '../game/data/types'
import { usePlayerStore } from '../player/playerStore'
import { PLAYER } from '../player/config'
import { UI } from './config'

/** Já passou da tela de início? (Voltar ao início, na pausa, mostra de novo) */
export const useTitleStore = create<{ started: boolean; start: () => void; quit: () => void }>((set) => ({
  started: false,
  start: () => set({ started: true }),
  quit: () => set({ started: false }),
}))

function Slider({
  label,
  value,
  range,
  onChange,
  format,
}: {
  label: string
  value: number
  range: { min: number; max: number; step: number }
  onChange: (v: number) => void
  format: (v: number) => string
}) {
  return (
    <label className="setting">
      <span>{label}</span>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <b>{format(value)}</b>
    </label>
  )
}

export function Settings() {
  const { volume, sensitivity, set } = useSettingsStore()
  return (
    <div className="settings">
      <Slider
        label="Volume"
        value={volume}
        range={SETTINGS_RANGE.volume}
        onChange={(v) => set({ volume: v })}
        format={(v) => `${Math.round(v * 100)}%`}
      />
      <Slider
        label="Sensibilidade"
        value={sensitivity}
        range={SETTINGS_RANGE.sensitivity}
        onChange={(v) => set({ sensitivity: v })}
        format={(v) => `${v.toFixed(2)}×`}
      />
    </div>
  )
}

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
const pad = (n: number) => String(n).padStart(2, '0')

/** Moldura de câmera de mão: REC piscando, contador da fita e a data do contrato. */
export function VhsOverlay({ level }: { level: LevelData }) {
  const matchId = useGameStore((s) => s.matchId)
  const counter = useRef<HTMLSpanElement>(null)
  // contador da fita: só anda com o jogo rodando (atualiza o texto direto, sem re-render)
  useEffect(() => {
    let tape = 0
    let last = performance.now()
    let id = 0
    const loop = (now: number) => {
      const dt = now - last
      last = now
      const { locked } = usePlayerStore.getState()
      if (locked && !isPaused(useGameStore.getState().phase)) tape += dt
      const s = Math.floor(tape / 1000)
      if (counter.current) counter.current.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [matchId])

  // cada contrato tem a sua data, no fim dos anos 90
  const day = 1 + ((matchId * 7 + level.rooms.length * 3) % 28)
  const month = MONTHS[(matchId * 5 + 9) % 12]
  return (
    <div className="vhs">
      <div className="rec">
        <i>●</i> REC
      </div>
      <div className="tape">
        <span>PLAY ▶</span>
        <span ref={counter}>00:00:00</span>
      </div>
      <div className="date">
        {pad(day)} {month} 1998
      </div>
    </div>
  )
}

/** Clarão vermelho ao tomar dano e borda pulsando com a vida baixa. */
export function DamageFeedback() {
  const health = usePlayerStore((s) => s.health)
  const prev = useRef(health)
  const [flash, setFlash] = useState(0)
  useEffect(() => {
    if (health < prev.current - 0.5) setFlash((f) => f + 1)
    prev.current = health
  }, [health])
  const low = health > 0 && health <= PLAYER.maxHealth * UI.lowHealth
  return (
    <>
      {flash > 0 && <div key={flash} className="damage-flash" />}
      {low && <div className="low-health" />}
    </>
  )
}
