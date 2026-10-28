import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { LevelData, LightLevel, Room } from '../game/data/types'
import type { BuiltLevel } from './buildLevel'
import { useGameStore } from '../game/stores/gameStore'

/**
 * Luz por zona: "claro" perto do carro, "penumbra" no meio, "escuro" no fundo.
 * No apagão (após a extração) só o carro e o extrator continuam acesos.
 *
 * Orçamento: three.js fica pesado com muitas point lights. Este nível usa ~15.
 * Se crescer, a 0.5.0 troca por um "pool" que acende só as lâmpadas mais
 * próximas do jogador.
 */

const PRESETS: Record<Exclude<LightLevel, 'dark'>, { color: string; intensity: number; distance: number; flicker: boolean }> = {
  lit: { color: '#ffc47a', intensity: 22, distance: 16, flicker: false },
  dim: { color: '#ffaa55', intensity: 8, distance: 11, flicker: true },
  moon: { color: '#7d8fc4', intensity: 26, distance: 24, flicker: false },
}

function Lamp({ position, preset, seed }: { position: [number, number, number]; preset: (typeof PRESETS)['lit']; seed: number }) {
  const light = useRef<THREE.PointLight>(null)
  const bulb = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    if (!preset.flicker || !light.current) return
    const t = clock.elapsedTime + seed * 13.7
    // pisca de vez em quando, não o tempo todo
    const glitch = Math.sin(t * 0.7) > 0.93 ? (Math.sin(t * 47) > 0 ? 0.15 : 1) : 1
    const k = (0.85 + Math.sin(t * 3.1) * 0.08 + Math.sin(t * 11.3) * 0.05) * glitch
    light.current.intensity = preset.intensity * k
    if (bulb.current) bulb.current.color.setScalar(k).multiply(new THREE.Color(preset.color))
  })
  return (
    <group position={position}>
      <pointLight ref={light} color={preset.color} intensity={preset.intensity} distance={preset.distance} decay={1.6} />
      <mesh>
        <sphereGeometry args={[0.08, 6, 4]} />
        <meshBasicMaterial ref={bulb} color={preset.color} />
      </mesh>
    </group>
  )
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

  return (
    <group>
      <ambientLight color="#4a5070" intensity={fullbright ? 2.2 : blackout ? 0.02 : 0.06} />
      {fullbright && <hemisphereLight args={['#ffffff', '#444444', 1.2]} />}

      {level.rooms.map((room) => {
        // a luz roxa do extrator fica em Extractor.tsx (pulsa ao carregar)
        if (room.kind === 'extraction') return null
        if (room.light === 'dark') return null
        if (blackout && room.kind !== 'car') return null
        const preset = PRESETS[room.light]
        const h = room.kind === 'outdoor' ? level.wallHeight * 1.8 : level.wallHeight - 0.35
        return lampPositions(room, level, built, h).map((pos, i) => (
          <Lamp key={`${room.id}-${i}`} position={pos} preset={preset} seed={i + room.x} />
        ))
      })}
    </group>
  )
}
