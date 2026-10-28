import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { LevelData } from '../data/types'
import type { BuiltLevel } from '../../world/buildLevel'
import { useGameStore, type GamePhase } from '../stores/gameStore'
import { danger } from '../systems/danger'
import { audio, type LoopHandle } from './engine'
import { AUDIO } from './sounds'

/**
 * Áudio que não vem de um objeto: ouvinte na câmera, ambiência de dentro e de
 * fora da casa, sons de ambiente das salas (relógio, grilos, goteira),
 * trovões, rangidos distantes e batimento cardíaco.
 */

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

export function AudioDirector({ level, built }: { level: LevelData; built: BuiltLevel }) {
  const camera = useThree((s) => s.camera)
  const loops = useRef<{ drone?: LoopHandle; wind?: LoopHandle; windIndoor?: LoopHandle }>({})
  const st = useRef({
    phase: '' as GamePhase | '',
    outside: null as boolean | null,
    nextBeat: 0,
    nextCreak: 10,
    nextThunder: 25,
    nextDrip: 0,
  }).current
  const tmp = useMemo(() => ({ fwd: new THREE.Vector3(), up: new THREE.Vector3() }), [])

  /** Fontes de ambiente das salas (data: `ambient` em cada sala). */
  const emitters = useMemo(() => {
    const list: { sound: 'drip' | 'clock' | 'crickets'; pos: Vec3 }[] = []
    for (const room of level.rooms) {
      for (const sound of room.ambient ?? []) {
        // relógio encostado num canto; goteira perto de uma parede; grilos no meio
        const at = sound === 'crickets' ? [0.5, 0.5, 0.4] : sound === 'clock' ? [0.15, 0.2, 1.8] : [0.8, 0.3, 0.3]
        list.push({ sound, pos: built.toWorld(room.x + room.w * at[0], room.y + room.h * at[1], at[2]) })
      }
    }
    return list
  }, [level, built])

  useEffect(() => {
    const l = loops.current
    l.drone = audio.loop('drone', { volume: 0 })
    l.wind = audio.loop('wind', { volume: 0 })
    l.windIndoor = audio.loop('windIndoor', { volume: 0 })
    const fixed = emitters
      .filter((e) => e.sound !== 'drip')
      .map((e) =>
        e.sound === 'clock'
          ? audio.loop('tick', { pos: e.pos, volume: AUDIO.clock, ref: 2 })
          : audio.loop('crickets', { pos: e.pos, volume: AUDIO.crickets, ref: 7 }),
      )
    return () => {
      l.drone?.stop()
      l.wind?.stop()
      l.windIndoor?.stop()
      fixed.forEach((h) => h.stop())
    }
  }, [emitters])

  useFrame(({ clock }) => {
    camera.getWorldDirection(tmp.fwd)
    tmp.up.set(0, 1, 0).applyQuaternion(camera.quaternion)
    const p = camera.position
    audio.setListener([p.x, p.y, p.z], [tmp.fwd.x, tmp.fwd.y, tmp.fwd.z], [tmp.up.x, tmp.up.y, tmp.up.z])

    const phase = useGameStore.getState().phase
    const room = built.roomAt(p.x, p.z)
    const outside = !room || room.kind === 'outdoor' || room.kind === 'car'

    // dentro ↔ fora: vento forte ou abafado, casa mais presente dentro
    if (phase !== st.phase || outside !== st.outside) {
      st.phase = phase
      st.outside = outside
      const [v, rate] = AMBIENCE[phase]
      const l = loops.current
      l.drone?.setVolume(AUDIO.ambience * v * (outside ? 0.4 : 1), 2)
      l.drone?.setRate(rate)
      l.wind?.setVolume(outside ? AUDIO.windOutside : 0, 1.2)
      l.windIndoor?.setVolume(outside ? 0 : AUDIO.windInside, 1.2)
    }

    const t = clock.elapsedTime

    // goteira: pingos irregulares
    if (t > st.nextDrip) {
      st.nextDrip = t + 0.7 + Math.random() * 1.8
      for (const e of emitters)
        if (e.sound === 'drip') audio.play('drip', { pos: e.pos, volume: AUDIO.drip, rate: 0.9 + Math.random() * 0.25 })
    }

    // trovão distante; dentro da casa chega abafado e mais grave
    if (t > st.nextThunder) {
      st.nextThunder = t + 35 + Math.random() * 45
      audio.play('thunder', { volume: AUDIO.thunder * (outside ? 1 : 0.55), rate: outside ? 1 : 0.8 })
    }

    // rangidos distantes em salas aleatórias, de vez em quando
    if ((phase === 'exploring' || phase === 'hunted' || phase === 'blackout') && t > st.nextCreak) {
      st.nextCreak = t + 12 + Math.random() * 25
      const r = level.rooms[Math.floor(Math.random() * level.rooms.length)]
      const pos = built.toWorld(r.x + Math.random() * r.w, r.y + Math.random() * r.h, 2)
      audio.play('creak', { pos, volume: 0.35, rate: 0.55 + Math.random() * 0.25 })
    }

    // batimento: mais rápido e alto quanto maior o perigo
    const tension = Math.max(danger.level, PHASE_DANGER[phase] ?? 0)
    if (tension > 0.05 && t > st.nextBeat) {
      st.nextBeat = t + 1.3 - tension * 0.85
      audio.play('heartbeat', { volume: AUDIO.heartbeat * tension, rate: 0.9 + tension * 0.2 })
    }
  })

  return null
}
