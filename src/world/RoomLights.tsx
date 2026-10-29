import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { LevelData, LightLevel, Room } from '../game/data/types'
import type { BuiltLevel } from './buildLevel'
import { useGameStore } from '../game/stores/gameStore'
import { LIGHTING } from '../game/config'

/**
 * Luz por zona: "claro" perto do carro, "penumbra" no meio, "escuro" no fundo.
 * No apagão (após a extração) só o carro e o extrator continuam acesos.
 * A luz de fundo (LIGHTING em game/config.ts) evita o preto total.
 *
 * Desempenho: cada luz de verdade encarece todo pixel do jogo. Por isso toda
 * lâmpada tem só a "bolinha" acesa, e um pool fixo de `LIGHTING.pool` luzes
 * segue as lâmpadas mais perto da câmera (a quantidade nunca muda, então os
 * shaders não recompilam). Trocar de lâmpada acende a luz aos poucos.
 */

const PRESETS: Record<Exclude<LightLevel, 'dark'>, { color: string; intensity: number; distance: number; flicker: boolean }> = {
  lit: { color: '#ffc47a', intensity: 22, distance: 16, flicker: false },
  dim: { color: '#ffaa55', intensity: 8, distance: 11, flicker: true },
  moon: { color: '#7d8fc4', intensity: 26, distance: 24, flicker: false },
}

interface LampInfo {
  pos: THREE.Vector3
  preset: (typeof PRESETS)['lit']
  seed: number
  car: boolean
  /** Intensidade do momento (0–1, com o pisca). */
  k: number
}

function lampPositions(room: Room, level: LevelData, built: BuiltLevel, height: number): [number, number, number][] {
  const s = level.scale
  const long = Math.max(room.w, room.h) * s
  const n = Math.max(1, Math.round(long / 8))
  const out: [number, number, number][] = []
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n
    const x = room.w >= room.h ? room.x + room.w * t : room.x + room.w / 2
    const y = room.w >= room.h ? room.y + room.h / 2 : room.y + room.h * t
    out.push(built.toWorld(x, y, height))
  }
  return out
}

export function RoomLights({ level, built }: { level: LevelData; built: BuiltLevel }) {
  const phase = useGameStore((s) => s.phase)
  const fullbright = useGameStore((s) => s.debug.fullbright)
  const blackout = phase === 'blackout'

  const lamps = useMemo(() => {
    const out: LampInfo[] = []
    for (const room of level.rooms) {
      // a luz roxa do extrator fica em Extractor.tsx (pulsa ao carregar)
      if (room.kind === 'extraction' || room.light === 'dark') continue
      const preset = PRESETS[room.light]
      const h = room.kind === 'outdoor' ? level.wallHeight * 1.8 : level.wallHeight - 0.35
      lampPositions(room, level, built, h).forEach((p, i) =>
        out.push({ pos: new THREE.Vector3(...p), preset, seed: i + room.x, car: room.kind === 'car', k: 1 }),
      )
    }
    return out
  }, [level, built])

  const bulbs = useRef<(THREE.MeshBasicMaterial | null)[]>([])
  const pool = useRef<(THREE.PointLight | null)[]>([])
  const slots = useRef(Array.from({ length: LIGHTING.pool }, () => ({ lamp: -1, fade: 0 }))).current
  const tmpColor = useMemo(() => new THREE.Color(), [])

  useFrame(({ clock, camera }, delta) => {
    const t0 = clock.elapsedTime
    // pisca das lâmpadas fracas: de vez em quando, não o tempo todo
    lamps.forEach((l, i) => {
      const on = !blackout || l.car
      if (!on) l.k = 0
      else if (!l.preset.flicker) l.k = 1
      else {
        const t = t0 + l.seed * 13.7
        const glitch = Math.sin(t * 0.7) > 0.93 ? (Math.sin(t * 47) > 0 ? 0.15 : 1) : 1
        l.k = (0.85 + Math.sin(t * 3.1) * 0.08 + Math.sin(t * 11.3) * 0.05) * glitch
      }
      const bulb = bulbs.current[i]
      if (bulb) bulb.color.copy(tmpColor.set(l.preset.color)).multiplyScalar(l.k)
    })

    // as N lâmpadas acesas mais próximas ganham luz de verdade
    const order = lamps
      .map((l, i) => ({ i, d: l.k > 0 ? l.pos.distanceToSquared(camera.position) : Infinity }))
      .filter((x) => x.d < Infinity)
      .sort((a, b) => a.d - b.d)
      .slice(0, slots.length)
      .map((x) => x.i)
    // mantém no mesmo slot quem continua entre as mais próximas (sem piscar)
    const free = slots.map((s, i) => (order.includes(s.lamp) ? -1 : i)).filter((i) => i >= 0)
    for (const lampIndex of order) {
      if (slots.some((s) => s.lamp === lampIndex)) continue
      const slot = free.shift()
      if (slot === undefined) break
      slots[slot] = { lamp: lampIndex, fade: 0 }
    }
    slots.forEach((s, i) => {
      const light = pool.current[i]
      if (!light) return
      const lamp = order.includes(s.lamp) ? lamps[s.lamp] : undefined
      if (!lamp) {
        s.lamp = -1
        light.intensity = 0
        return
      }
      s.fade = Math.min(1, s.fade + delta / LIGHTING.poolFade)
      light.position.copy(lamp.pos)
      light.color.set(lamp.preset.color)
      light.distance = lamp.preset.distance
      light.intensity = lamp.preset.intensity * LIGHTING.lampScale * lamp.k * s.fade
    })
  })

  return (
    <group>
      {fullbright ? (
        <hemisphereLight args={['#ffffff', '#444444', 3]} />
      ) : (
        <hemisphereLight args={[LIGHTING.fillSky, LIGHTING.fillGround, blackout ? LIGHTING.fillBlackout : LIGHTING.fill]} />
      )}
      {slots.map((_, i) => (
        <pointLight
          key={i}
          ref={(el) => {
            pool.current[i] = el
          }}
          intensity={0}
          decay={1.6}
        />
      ))}
      {lamps.map((l, i) => (
        <mesh key={i} position={l.pos}>
          <sphereGeometry args={[0.08, 6, 4]} />
          <meshBasicMaterial
            ref={(el) => {
              bulbs.current[i] = el
            }}
            color={l.preset.color}
          />
        </mesh>
      ))}
    </group>
  )
}
