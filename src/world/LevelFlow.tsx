import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import type { LevelData } from '../game/data/types'
import type { BuiltLevel } from './buildLevel'
import { useGameStore } from '../game/stores/gameStore'
import { playerFeet } from '../player/playerPos'

/**
 * Transições de fase que dependem do tempo ou de onde o jogador está:
 *  - exploring → hunted: `enemyDelay` segundos depois da 1ª porta
 *  - blackout → results: voltar ao carro depois da extração
 */
export function LevelFlow({ level, built }: { level: LevelData; built: BuiltLevel }) {
  const car = useMemo(() => {
    const room = level.rooms.find((r) => r.kind === 'car')
    if (!room) return null
    const [x0, , z0] = built.toWorld(room.x, room.y)
    const [x1, , z1] = built.toWorld(room.x + room.w, room.y + room.h)
    return { x0, x1, z0, z1 }
  }, [level, built])

  useFrame(() => {
    const g = useGameStore.getState()
    if (g.phase === 'exploring' && g.enemyTimerStart !== null && performance.now() - g.enemyTimerStart >= level.enemyDelay * 1000) {
      g.setPhase('hunted')
    }
    if (g.phase === 'blackout' && car) {
      const { x, z } = playerFeet
      if (x > car.x0 && x < car.x1 && z > car.z0 && z < car.z1) g.reachCar()
    }
  })
  return null
}
