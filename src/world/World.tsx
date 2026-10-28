import { useMemo } from 'react'
import { Physics } from '@react-three/rapier'
import type { LevelData } from '../game/data/types'
import { useGameStore } from '../game/stores/gameStore'
import { Player } from '../player/Player'
import { buildLevel } from './buildLevel'
import { Level } from './Level'
import { Props } from './Props'
import { RoomLights } from './RoomLights'
import { Gizmos } from './Gizmos'
import { EditorCamera } from './EditorCamera'

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
      <RoomLights level={level} built={built} />
      {gizmos && <Gizmos level={level} built={built} />}
      <Player level={level} built={built} />
      {/* F1: câmera livre do modo editor */}
      {cameraMode === 'editor' && <EditorCamera level={level} built={built} />}
      {/* 0.3.0: <Items /> · 0.7.0+: <Enemies /> · 0.10.0: <ACoisa /> */}
    </Physics>
  )
}
