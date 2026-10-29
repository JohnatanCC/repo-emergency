import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import type { LevelData } from '../game/data/types'
import type { BuiltLevel } from './buildLevel'
import { useGameStore } from '../game/stores/gameStore'
import { playerFeet } from '../player/playerPos'
import { isCarried, useItemStore } from '../items/itemStore'
import { itemBodies } from '../items/bodies'
import { audio } from '../game/audio/engine'
import type { ToolId } from '../game/shop'

/**
 * Transições de fase que dependem do tempo ou de onde o jogador está:
 *  - exploring → hunted: `enemyDelay` segundos depois da 1ª porta
 *  - blackout → results: voltar ao carro depois da extração
 * E a cabeça do investigador: entrar no carro com ela (ou largá-la lá dentro) devolve uma vida.
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
    if (!car) return
    const inCar = (x: number, z: number) => x > car.x0 && x < car.x1 && z > car.z0 && z < car.z1
    if (g.phase === 'blackout' && inCar(playerFeet.x, playerFeet.z)) {
      // ferramentas com o jogador ou no carro voltam para o estoque; largadas na casa se perdem
      const back = Object.values(useItemStore.getState().items).filter((it) => {
        if (it.def.tag !== 'tool') return false
        const p = it.place === 'world' ? itemBodies.get(it.uid)?.translation() : undefined
        return isCarried(it) || (p && inCar(p.x, p.z))
      })
      g.returnEquipment(back.map((it) => it.def.id as ToolId))
      back.forEach((it) => useItemStore.getState().discard(it.uid))
      g.reachCar()
    }

    // cabeças entregues no carro
    const items = useItemStore.getState()
    for (const it of Object.values(items.items)) {
      if (it.def.tag !== 'head') continue
      const p = it.place === 'world' ? itemBodies.get(it.uid)?.translation() : undefined
      const delivered = (isCarried(it) && inCar(playerFeet.x, playerFeet.z)) || (p && inCar(p.x, p.z))
      if (!delivered) continue
      items.discard(it.uid)
      g.regainLife()
      audio.play('whoosh', { volume: 0.5, rate: 1.6 })
    }
  })
  return null
}
