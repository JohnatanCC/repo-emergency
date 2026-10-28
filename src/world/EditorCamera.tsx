import { useEffect, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { LevelData } from '../game/data/types'
import type { BuiltLevel } from './buildLevel'
import { useGameStore } from '../game/stores/gameStore'

const OVERVIEW: [number, number, number] = [-6, 26, 30]
const EYE = 1.6

/**
 * Câmera de editor (até a 0.1.0 trazer a câmera do player).
 * Tecla V: passa por cada sala na altura dos olhos, para sentir a luz e a escala.
 */
export function EditorCamera({ level, built }: { level: LevelData; built: BuiltLevel }) {
  const controls = useRef<OrbitControlsImpl>(null)
  const camera = useThree((s) => s.camera)
  const visitRoom = useGameStore((s) => s.visitRoom)

  useEffect(() => {
    const c = controls.current
    if (!c) return
    const room = level.rooms[visitRoom]
    if (!room) {
      camera.position.set(...OVERVIEW)
      c.target.set(0, 0, 0)
    } else {
      // de um canto da sala olhando para o centro
      const pos = built.toWorld(room.x + room.w * 0.15, room.y + room.h * 0.85, EYE)
      const target = built.toWorld(room.x + room.w * 0.6, room.y + room.h * 0.35, EYE * 0.85)
      camera.position.set(...pos)
      c.target.set(...target)
    }
    c.update()
  }, [visitRoom, level, built, camera])

  return <OrbitControls ref={controls} makeDefault maxPolarAngle={Math.PI / 1.9} />
}
