import { useMemo } from 'react'
import * as THREE from 'three'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import type { BuiltLevel } from './buildLevel'
import { getTexture } from './textures'
import { WORLD_GROUPS } from '../game/physics'

/** Pisos, tetos e paredes do greybox + colisores fixos. Recebem a sombra da lanterna. */
export function Level({ built, wallHeight }: { built: BuiltLevel; wallHeight: number }) {
  const floorMats = useMemo(
    () =>
      built.floors.map((f) => {
        const tile = f.floor === 'checker' ? 1.2 : f.floor === 'grass' ? 2.5 : 1.6
        return new THREE.MeshStandardMaterial({ map: getTexture(f.floor, f.size[0], f.size[1], tile), roughness: 0.9 })
      }),
    [built],
  )
  const ceilingMats = useMemo(
    () => built.floors.map((f) => new THREE.MeshStandardMaterial({ map: getTexture('ceiling', f.size[0], f.size[1]), roughness: 1 })),
    [built],
  )
  const wallMats = useMemo(
    () =>
      built.walls.map((w) => {
        const len = Math.max(w.size[0], w.size[2])
        return new THREE.MeshStandardMaterial({ map: getTexture(w.material, len, w.size[1]), roughness: 0.95 })
      }),
    [built],
  )

  return (
    <group>
      {built.floors.map((f, i) => (
        <group key={f.key} position={f.pos}>
          <mesh rotation-x={-Math.PI / 2} material={floorMats[i]} receiveShadow>
            <planeGeometry args={f.size} />
          </mesh>
          {f.room.kind === 'extraction' && (
            <mesh rotation-x={-Math.PI / 2} position-y={0.01}>
              <planeGeometry args={[f.size[0] * 0.7, f.size[1] * 0.7]} />
              <meshBasicMaterial color="#6b3fa0" transparent opacity={0.35} />
            </mesh>
          )}
          {f.ceiling && (
            <mesh rotation-x={Math.PI / 2} position-y={wallHeight} material={ceilingMats[i]} receiveShadow>
              <planeGeometry args={f.size} />
            </mesh>
          )}
        </group>
      ))}

      {built.walls.map((w, i) => (
        <mesh key={w.key} position={w.pos} material={wallMats[i]} castShadow receiveShadow>
          <boxGeometry args={w.size} />
        </mesh>
      ))}

      <RigidBody type="fixed" colliders={false}>
        {built.floors.map((f) => (
          <CuboidCollider
            key={f.key}
            args={[f.size[0] / 2, 0.1, f.size[1] / 2]}
            position={[f.pos[0], -0.1, f.pos[2]]}
            collisionGroups={WORLD_GROUPS}
          />
        ))}
        {built.walls.map((w) => (
          <CuboidCollider
            key={w.key}
            args={[w.size[0] / 2, w.size[1] / 2, w.size[2] / 2]}
            position={w.pos}
            collisionGroups={WORLD_GROUPS}
          />
        ))}
      </RigidBody>
    </group>
  )
}
