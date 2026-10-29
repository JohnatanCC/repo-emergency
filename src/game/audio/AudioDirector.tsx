import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { LevelData } from '../data/types'
import type { BuiltLevel } from '../../world/buildLevel'
import { useGameStore, type GamePhase } from '../stores/gameStore'
import { danger } from '../systems/danger'
import { audio, type LoopHandle } from './engine'
import { AUDIO, AUDIO_ZONES } from './sounds'

/**
 * Áudio que não vem de um objeto: ouvinte na câmera, ambiência de dentro e de
 * fora da casa, sons de ambiente das salas (relógio, grilos, goteira),
 * trovões, eventos distantes (batidas, arrasto, gemido, caixinha de música),
 * o acorde quando a caçada começa e o batimento cardíaco.
 *
 * Dentro e fora são mundos separados: o que toca do outro lado da parede
 * chega baixo e abafado (AUDIO_ZONES).
 */

/** Eventos distantes: som, volume e peso no sorteio. A caixinha de música é rara. */
const EVENTS: { sound: 'knock' | 'scrape' | 'moan' | 'musicbox' | 'creak'; volume: number; weight: number }[] = [
  { sound: 'knock', volume: 0.5, weight: 3 },
  { sound: 'creak', volume: 0.3, weight: 3 },
  { sound: 'scrape', volume: 0.35, weight: 2 },
  { sound: 'moan', volume: 0.3, weight: 1.5 },
  { sound: 'musicbox', volume: 0.22, weight: 0.6 },
]

/** Ambiência da casa por fase: volume (× AUDIO.ambience) e tom. */
const AMBIENCE: Record<GamePhase, [number, number]> = {
  car: [0.5, 1],
  exploring: [1, 1],
  hunted: [1.2, 0.95],
  blackout: [1.6, 0.8],
  results: [0.3, 1],
  shop: [0.3, 1],
  gameover: [0.2, 0.7],
}

/** Tensão mínima por fase, enquanto não há entidades para medir o perigo. */
const PHASE_DANGER: Partial<Record<GamePhase, number>> = { hunted: 0.15, blackout: 0.4 }

type Vec3 = [number, number, number]

/** Lado de fora: área externa ou o carro (o resto é dentro da casa). */
const isOutside = (r: { kind: string }) => r.kind === 'outdoor' || r.kind === 'car'

export function AudioDirector({ level, built }: { level: LevelData; built: BuiltLevel }) {
  const camera = useThree((s) => s.camera)
  const loops = useRef<{ drone?: LoopHandle; wind?: LoopHandle; windIndoor?: LoopHandle }>({})
  const fixed = useRef<{ e: { pos: Vec3; outside: boolean }; base: number; h: LoopHandle }[]>([])
  const st = useRef({
    phase: '' as GamePhase | '',
    outside: null as boolean | null,
    nextBeat: 0,
    nextEvent: 15,
    nextStinger: 0,
    lastDanger: 0,
    nextThunder: 25,
    nextDrip: 0,
  }).current
  const tmp = useMemo(() => ({ fwd: new THREE.Vector3(), up: new THREE.Vector3() }), [])

  /** Fontes de ambiente das salas (data: `ambient` em cada sala). */
  const emitters = useMemo(() => {
    const list: { sound: 'drip' | 'clock' | 'crickets'; pos: Vec3; outside: boolean }[] = []
    for (const room of level.rooms) {
      for (const sound of room.ambient ?? []) {
        // relógio encostado num canto; goteira perto de uma parede; grilos no meio
        const at = sound === 'crickets' ? [0.5, 0.5, 0.4] : sound === 'clock' ? [0.15, 0.2, 1.8] : [0.8, 0.3, 0.3]
        list.push({ sound, pos: built.toWorld(room.x + room.w * at[0], room.y + room.h * at[1], at[2]), outside: isOutside(room) })
      }
    }
    return list
  }, [level, built])

  useEffect(() => {
    const l = loops.current
    l.drone = audio.loop('drone', { volume: 0 })
    l.wind = audio.loop('wind', { volume: 0 })
    l.windIndoor = audio.loop('windIndoor', { volume: 0 })
    // começam mudos: o volume certo depende de onde o jogador está (useFrame)
    fixed.current = emitters
      .filter((e) => e.sound !== 'drip')
      .map((e) => ({
        e,
        base: e.sound === 'clock' ? AUDIO.clock : AUDIO.crickets,
        h:
          e.sound === 'clock'
            ? audio.loop('tick', { pos: e.pos, volume: 0, ref: 2 })
            : audio.loop('crickets', { pos: e.pos, volume: 0, ref: 3 }),
      }))
    st.outside = null
    return () => {
      l.drone?.stop()
      l.wind?.stop()
      l.windIndoor?.stop()
      fixed.current.forEach((x) => x.h.stop())
      fixed.current = []
    }
  }, [emitters])

  useFrame(({ clock }) => {
    camera.getWorldDirection(tmp.fwd)
    tmp.up.set(0, 1, 0).applyQuaternion(camera.quaternion)
    const p = camera.position
    audio.setListener([p.x, p.y, p.z], [tmp.fwd.x, tmp.fwd.y, tmp.fwd.z], [tmp.up.x, tmp.up.y, tmp.up.z])

    const phase = useGameStore.getState().phase
    const room = built.roomAt(p.x, p.z)
    const outside = !room || isOutside(room)
    /** Volume e abafamento de um som que está do lado soundOutside. */
    const zone = (soundOutside: boolean) => (soundOutside === outside ? { v: 1, m: 0 } : { v: AUDIO_ZONES.volume, m: AUDIO_ZONES.muffle })

    // dentro ↔ fora: vento forte ou abafado, casa mais presente dentro
    if (phase !== st.phase || outside !== st.outside) {
      st.phase = phase
      st.outside = outside
      const [v, rate] = AMBIENCE[phase]
      const l = loops.current
      l.drone?.setVolume(AUDIO.ambience * v * (outside ? 0.3 : 1), 2)
      l.drone?.setMuffle(outside ? AUDIO_ZONES.muffle : 0, 1)
      l.drone?.setRate(rate)
      for (const x of fixed.current) {
        const z = zone(x.e.outside)
        x.h.setVolume(x.base * z.v, 1)
        x.h.setMuffle(z.m, 1)
      }
      l.wind?.setVolume(outside ? AUDIO.windOutside : 0, 1.2)
      l.windIndoor?.setVolume(outside ? 0 : AUDIO.windInside, 1.2)
    }

    const t = clock.elapsedTime

    // goteira: pingos irregulares
    if (t > st.nextDrip) {
      st.nextDrip = t + 0.7 + Math.random() * 1.8
      for (const e of emitters) {
        if (e.sound !== 'drip') continue
        const z = zone(e.outside)
        audio.play('drip', { pos: e.pos, volume: AUDIO.drip * z.v, muffle: z.m, rate: 0.9 + Math.random() * 0.25 })
      }
    }

    // trovão distante; dentro da casa chega abafado e mais grave
    if (t > st.nextThunder) {
      st.nextThunder = t + 35 + Math.random() * 45
      audio.play('thunder', { volume: AUDIO.thunder * (outside ? 1 : 0.5), rate: outside ? 1 : 0.85, muffle: outside ? 0 : 0.7 })
    }

    // eventos distantes: algo bate, arrasta ou geme numa sala longe do jogador
    const hunting = phase === 'exploring' || phase === 'hunted' || phase === 'blackout'
    if (hunting && t > st.nextEvent) {
      st.nextEvent = t + AUDIO_ZONES.eventMin + Math.random() * (AUDIO_ZONES.eventMax - AUDIO_ZONES.eventMin)
      const total = EVENTS.reduce((acc, e) => acc + e.weight, 0)
      let pick = Math.random() * total
      const ev = EVENTS.find((e) => (pick -= e.weight) < 0) ?? EVENTS[0]
      // sala a uma distância de ouvir sem ver
      const far = level.rooms.filter((r) => {
        if (r.kind === 'car') return false
        const [x, , rz] = built.toWorld(r.x + r.w / 2, r.y + r.h / 2)
        const d = Math.hypot(x - p.x, rz - p.z)
        return d > 6 && d < 18
      })
      const r = far[Math.floor(Math.random() * far.length)]
      if (r) {
        const pos = built.toWorld(r.x + Math.random() * r.w, r.y + Math.random() * r.h, 1.5)
        const zn = zone(isOutside(r))
        audio.play(ev.sound, { pos, volume: ev.volume * zn.v, muffle: Math.max(zn.m, 0.25), rate: 0.85 + Math.random() * 0.25, ref: 3 })
      }
    }

    // a caçada começou (perigo subiu de repente): acorde de cordas
    if (danger.level > 0.6 && st.lastDanger <= 0.6 && t > st.nextStinger) {
      st.nextStinger = t + 25
      audio.play('stinger', { volume: AUDIO.stinger })
    }
    st.lastDanger = danger.level

    // batimento: mais rápido e alto quanto maior o perigo
    const tension = Math.max(danger.level, PHASE_DANGER[phase] ?? 0)
    if (tension > 0.05 && t > st.nextBeat) {
      st.nextBeat = t + 1.3 - tension * 0.85
      audio.play('heartbeat', { volume: AUDIO.heartbeat * tension, rate: 0.9 + tension * 0.2 })
    }
  })

  return null
}
