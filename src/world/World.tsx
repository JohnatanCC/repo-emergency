import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import type { LevelData } from '../game/data/types'
import { useGameStore } from '../game/stores/gameStore'
import { Player } from '../player/Player'
import { Interaction } from '../player/Interaction'
import { Flashlight } from '../player/Flashlight'
import { Doors } from './Doors'
import { Items } from '../items/Items'
import { HeldItem, ItemControls } from '../items/HeldItem'
import { buildLevel } from './buildLevel'
import { Level } from './Level'
import { Props } from './Props'
import { RoomLights } from './RoomLights'
import { Gizmos } from './Gizmos'
import { EditorCamera } from './EditorCamera'

/** Depois da 1ª porta, conta `enemyDelay` segundos e passa para a fase das entidades. */
function EnemyClock({ delay }: { delay: number }) {
  useFrame(() => {
    const g = useGameStore.getState()
    if (g.phase === 'exploring' && g.enemyTimerStart !== null && performance.now() - g.enemyTimerStart >= delay * 1000) {
      g.setPhase('hunted')
    }
  })
  return null
}

/** Tudo que existe no nível: geometria, móveis, luz, investigador e (debug) marcadores. */
export function World({ level }: { level: LevelData }) {
  const built = useMemo(() => buildLevel(level), [level])
  const gizmos = useGameStore((s) => s.debug.gizmos)
  const cameraMode = useGameStore((s) => s.cameraMode)

  return (
    // "vary": um passo de física por frame, para a câmera do player não tremer em telas de 120/144 Hz
    <Physics gravity={[0, -9.81, 0]} timeStep="vary">
      <Level built={built} wallHeight={level.wallHeight} />
      <Props level={level} built={built} />
      <Doors level={level} built={built} />
      <Items level={level} built={built} />
      <RoomLights level={level} built={built} />
      {gizmos && <Gizmos level={level} built={built} />}
      <Player level={level} built={built} />
      <Interaction />
      <ItemControls />
      {cameraMode === 'player' && <HeldItem />}
      {cameraMode === 'player' && <Flashlight />}
      <EnemyClock delay={level.enemyDelay} />
      {/* F1: câmera livre do modo editor */}
      {cameraMode === 'editor' && <EditorCamera level={level} built={built} />}
      {/* 0.4.0: <Extractor /> · 0.7.0+: <Enemies /> · 0.10.0: <ACoisa /> */}
    </Physics>
  )
}
