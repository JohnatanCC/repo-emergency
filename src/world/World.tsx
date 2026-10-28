import { useMemo } from 'react'
import { Physics } from '@react-three/rapier'
import type { LevelData } from '../game/data/types'
import { useGameStore } from '../game/stores/gameStore'
import { buildLevel } from './buildLevel'
import { Level } from './Level'
import { Props } from './Props'
import { RoomLights } from './RoomLights'
import { Gizmos } from './Gizmos'
import { EditorCamera } from './EditorCamera'

/** Tudo que existe no nível: geometria, móveis, luz e (debug) marcadores. */
export function World({ level }: { level: LevelData }) {
  const built = useMemo(() => buildLevel(level), [level])
  const gizmos = useGameStore((s) => s.debug.gizmos)

  return (
    <Physics gravity={[0, -9.81, 0]}>
      <Level built={built} wallHeight={level.wallHeight} />
      <Props level={level} built={built} />
      <RoomLights level={level} built={built} />
      {gizmos && <Gizmos level={level} built={built} />}
      {/* Câmera de editor. Na 0.1.0 dá lugar à câmera em primeira pessoa do player. */}
      <EditorCamera level={level} built={built} />
      {/* 0.1.0: <Player /> · 0.3.0: <Items /> <Cart /> · 0.7.0+: <Enemies /> */}
    </Physics>
  )
}
