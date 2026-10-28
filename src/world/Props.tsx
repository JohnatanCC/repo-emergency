import { useMemo } from 'react'
import * as THREE from 'three'
import { RigidBody } from '@react-three/rapier'
import type { LevelData, Prop } from '../game/data/types'
import type { BuiltLevel } from './buildLevel'
import { getTexture } from './textures'

/**
 * Móveis de greybox. Mesas e cadeiras têm colisor só no tampo/pernas
 * (o vão por baixo é o esconderijo de agachar, 0.6.0).
 */

function useMats() {
  return useMemo(
    () => ({
      wood: new THREE.MeshStandardMaterial({ map: getTexture('darkwood', 1, 1, 1), roughness: 0.9 }),
      books: new THREE.MeshStandardMaterial({ map: getTexture('books', 2, 2.4, 1.2), roughness: 1 }),
      stone: new THREE.MeshStandardMaterial({ map: getTexture('stone', 1, 1), roughness: 1 }),
      porcelain: new THREE.MeshStandardMaterial({ map: getTexture('porcelain', 1, 1), roughness: 0.4 }),
      dark: new THREE.MeshStandardMaterial({ color: '#120c08', roughness: 1 }),
      brass: new THREE.MeshStandardMaterial({ color: '#8a6a2a', metalness: 0.6, roughness: 0.4 }),
      screen: new THREE.MeshBasicMaterial({ color: '#3fbf5a' }),
    }),
    [],
  )
}

type Mats = ReturnType<typeof useMats>

function Table({ m, stone }: { m: Mats; stone?: boolean }) {
  const mat = stone ? m.stone : m.wood
  const legs: [number, number][] = [
    [-0.7, -0.32],
    [0.7, -0.32],
    [-0.7, 0.32],
    [0.7, 0.32],
  ]
  return (
    <>
      <mesh position={[0, 0.75, 0]} material={mat}>
        <boxGeometry args={[1.6, 0.06, 0.8]} />
      </mesh>
      {legs.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.36, z]} material={mat}>
          <boxGeometry args={[0.07, 0.72, 0.07]} />
        </mesh>
      ))}
    </>
  )
}

function Chair({ m }: { m: Mats }) {
  const legs: [number, number][] = [
    [-0.2, -0.2],
    [0.2, -0.2],
    [-0.2, 0.2],
    [0.2, 0.2],
  ]
  return (
    <>
      <mesh position={[0, 0.45, 0]} material={m.wood}>
        <boxGeometry args={[0.5, 0.05, 0.5]} />
      </mesh>
      <mesh position={[0, 0.8, -0.23]} material={m.wood}>
        <boxGeometry args={[0.5, 0.65, 0.05]} />
      </mesh>
      {legs.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.22, z]} material={m.wood}>
          <boxGeometry args={[0.05, 0.44, 0.05]} />
        </mesh>
      ))}
    </>
  )
}

function Wardrobe({ m }: { m: Mats }) {
  return (
    <>
      <mesh position={[0, 1.05, 0]} material={m.wood}>
        <boxGeometry args={[1.2, 2.1, 0.6]} />
      </mesh>
      {/* fresta entre as portas: por onde o jogador espia (0.6.0) */}
      <mesh position={[0, 1.05, 0.301]} material={m.dark}>
        <boxGeometry args={[0.02, 1.9, 0.01]} />
      </mesh>
      <mesh position={[-0.07, 1.1, 0.31]} material={m.brass}>
        <boxGeometry args={[0.03, 0.12, 0.02]} />
      </mesh>
      <mesh position={[0.07, 1.1, 0.31]} material={m.brass}>
        <boxGeometry args={[0.03, 0.12, 0.02]} />
      </mesh>
    </>
  )
}

function PropMesh({ prop, m, scale, isOutdoor }: { prop: Prop; m: Mats; scale: number; isOutdoor: boolean }) {
  switch (prop.type) {
    case 'table':
      return <Table m={m} stone={isOutdoor} />
    case 'chair':
      return <Chair m={m} />
    case 'wardrobe':
      return <Wardrobe m={m} />
    case 'shelf': {
      const w = (prop.w ?? 80) * scale
      const d = (prop.h ?? 5) * scale
      return (
        <mesh position={[0, 1.2, 0]} material={m.books}>
          <boxGeometry args={[w, 2.4, d]} />
        </mesh>
      )
    }
    case 'bathtub':
      return (
        <>
          <mesh position={[0, 0.3, 0]} material={m.porcelain}>
            <boxGeometry args={[1.6, 0.6, 0.75]} />
          </mesh>
          <mesh position={[0, 0.61, 0]} material={m.dark}>
            <boxGeometry args={[1.4, 0.02, 0.55]} />
          </mesh>
        </>
      )
    case 'bench':
      return (
        <mesh position={[0, 0.22, 0]} material={m.stone}>
          <boxGeometry args={[1.4, 0.44, 0.45]} />
        </mesh>
      )
    case 'monitor':
      return (
        <>
          <mesh position={[0, 1.5, 0]} material={m.dark}>
            <boxGeometry args={[1.1, 0.7, 0.08]} />
          </mesh>
          {/* Painel do carro: dinheiro + relíquias da meta (0.4.0) */}
          <mesh position={[0, 1.5, 0.045]} material={m.screen}>
            <planeGeometry args={[0.95, 0.55]} />
          </mesh>
        </>
      )
  }
}

export function Props({ level, built }: { level: LevelData; built: BuiltLevel }) {
  const m = useMats()
  const outdoorRooms = level.rooms.filter((r) => r.kind === 'outdoor')
  return (
    <group>
      {level.props.map((p) => {
        const isOutdoor = outdoorRooms.some((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h)
        return (
          <RigidBody
            key={p.id}
            type="fixed"
            colliders={p.type === 'monitor' ? false : 'cuboid'}
            position={built.toWorld(p.x, p.y)}
            rotation={[0, ((p.rot ?? 0) * Math.PI) / 180, 0]}
          >
            <PropMesh prop={p} m={m} scale={level.scale} isOutdoor={isOutdoor} />
          </RigidBody>
        )
      })}
    </group>
  )
}
