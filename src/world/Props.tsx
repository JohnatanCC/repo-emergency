import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { WORLD_GROUPS } from '../game/physics'
import { CarPanel } from './CarPanel'
import type { LevelData, Prop } from '../game/data/types'
import type { BuiltLevel } from './buildLevel'
import { getTexture } from './textures'
import { StaticMerge } from './StaticMerge'
import { OutdoorPropMesh, outdoorColliders, useOutdoorMats } from './OutdoorProps'

/**
 * Móveis. A aparência é detalhada (molduras, pés torneados, livros soltos),
 * mas os colisores são caixas fixas por tipo (`colliders`): enfeite não muda a
 * física. Mesas e cadeiras têm colisor só no tampo e nas pernas (o vão por
 * baixo é o esconderijo de agachar).
 */

function useMats() {
  return useMemo(
    () => ({
      wood: new THREE.MeshStandardMaterial({ map: getTexture('darkwood', 1, 1, 1), roughness: 0.9 }),
      woodLight: new THREE.MeshStandardMaterial({ map: getTexture('wood', 1, 1, 1), color: '#8a6a4a', roughness: 0.9 }),
      books: new THREE.MeshStandardMaterial({ map: getTexture('books', 2, 2.4, 1.2), roughness: 1 }),
      bookColors: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }),
      stone: new THREE.MeshStandardMaterial({ map: getTexture('stone', 1, 1), roughness: 1 }),
      porcelain: new THREE.MeshStandardMaterial({ map: getTexture('porcelain', 1, 1), roughness: 0.4 }),
      dark: new THREE.MeshStandardMaterial({ color: '#120c08', roughness: 1 }),
      water: new THREE.MeshStandardMaterial({ color: '#1a1a12', roughness: 0.15, metalness: 0.3 }),
      brass: new THREE.MeshStandardMaterial({ color: '#8a6a2a', metalness: 0.6, roughness: 0.4 }),
      cloth: new THREE.MeshStandardMaterial({ color: '#5a4a3e', roughness: 1, side: THREE.DoubleSide }),
      wax: new THREE.MeshStandardMaterial({ color: '#d8ccb0', roughness: 0.8 }),
      flame: new THREE.MeshBasicMaterial({ color: '#ffb050' }),
    }),
    [],
  )
}

type Mats = ReturnType<typeof useMats>

/** Caixa de colisão: centro e meia-medida, no espaço do móvel. */
type Box = { p: [number, number, number]; h: [number, number, number] }

function colliders(prop: Prop, scale: number): Box[] {
  const legs = (x: number, z: number, h: number, t: number): Box[] =>
    [
      [-x, -z],
      [x, -z],
      [-x, z],
      [x, z],
    ].map(([lx, lz]) => ({ p: [lx, h / 2, lz], h: [t / 2, h / 2, t / 2] }))
  switch (prop.type) {
    case 'table':
      return [{ p: [0, 0.75, 0], h: [0.8, 0.03, 0.4] }, ...legs(0.7, 0.32, 0.72, 0.07)]
    case 'chair':
      return [{ p: [0, 0.45, 0], h: [0.25, 0.025, 0.25] }, { p: [0, 0.8, -0.23], h: [0.25, 0.325, 0.025] }, ...legs(0.2, 0.2, 0.44, 0.05)]
    case 'wardrobe':
      return [{ p: [0, 1.05, 0], h: [0.6, 1.05, 0.3] }]
    case 'shelf': {
      const w = (prop.w ?? 80) * scale
      const d = (prop.h ?? 5) * scale
      return [{ p: [0, 1.2, 0], h: [w / 2, 1.2, d / 2] }]
    }
    case 'bathtub':
      return [{ p: [0, 0.3, 0], h: [0.8, 0.3, 0.375] }]
    case 'bench':
      return [{ p: [0, 0.22, 0], h: [0.7, 0.22, 0.225] }]
    default:
      return outdoorColliders(prop, scale) ?? []
  }
}

/** Perna torneada: cilindros e um bojo no meio. */
function TurnedLeg({ m, x, z, h }: { m: THREE.Material; x: number; z: number; h: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]} material={m}>
        <cylinderGeometry args={[0.03, 0.022, h, 6]} />
      </mesh>
      <mesh position={[0, h * 0.62, 0]} material={m}>
        <sphereGeometry args={[0.045, 6, 4]} />
      </mesh>
      <mesh position={[0, h - 0.06, 0]} material={m}>
        <boxGeometry args={[0.07, 0.12, 0.07]} />
      </mesh>
    </group>
  )
}

function Table({ m, stone }: { m: Mats; stone?: boolean }) {
  const mat = stone ? m.stone : m.wood
  if (stone)
    return (
      <>
        <mesh position={[0, 0.75, 0]} material={mat}>
          <boxGeometry args={[1.6, 0.08, 0.8]} />
        </mesh>
        {[-0.55, 0.55].map((x) => (
          <mesh key={x} position={[x, 0.36, 0]} material={mat}>
            <boxGeometry args={[0.18, 0.72, 0.5]} />
          </mesh>
        ))}
      </>
    )
  return (
    <>
      {/* tampo com borda e saia por baixo */}
      <mesh position={[0, 0.755, 0]} material={mat}>
        <boxGeometry args={[1.64, 0.05, 0.84]} />
      </mesh>
      <mesh position={[0, 0.72, 0]} material={mat}>
        <boxGeometry args={[1.56, 0.03, 0.76]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`x${s}`} position={[0, 0.69, s * 0.33]} material={mat}>
          <boxGeometry args={[1.36, 0.06, 0.02]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`z${s}`} position={[s * 0.71, 0.69, 0]} material={mat}>
          <boxGeometry args={[0.02, 0.06, 0.6]} />
        </mesh>
      ))}
      {[
        [-0.7, -0.32],
        [0.7, -0.32],
        [-0.7, 0.32],
        [0.7, 0.32],
      ].map(([x, z], i) => (
        <TurnedLeg key={i} m={mat} x={x} z={z} h={0.72} />
      ))}
      {/* toalha puída caindo de um lado e um castiçal apagado */}
      <mesh position={[0.25, 0.785, 0.05]} material={m.cloth}>
        <boxGeometry args={[0.7, 0.008, 0.9]} />
      </mesh>
      <mesh position={[0.25, 0.62, 0.45]} rotation={[0.06, 0, 0]} material={m.cloth}>
        <boxGeometry args={[0.7, 0.32, 0.008]} />
      </mesh>
      <mesh position={[-0.45, 0.83, -0.1]} material={m.brass}>
        <cylinderGeometry args={[0.02, 0.05, 0.1, 6]} />
      </mesh>
      <mesh position={[-0.45, 0.92, -0.1]} material={m.wax}>
        <cylinderGeometry args={[0.018, 0.018, 0.1, 5]} />
      </mesh>
    </>
  )
}

function Chair({ m }: { m: Mats }) {
  return (
    <>
      <mesh position={[0, 0.45, 0]} material={m.wood}>
        <boxGeometry args={[0.5, 0.05, 0.5]} />
      </mesh>
      {/* encosto: travessa de cima e ripas */}
      <mesh position={[0, 1.08, -0.23]} material={m.wood}>
        <boxGeometry args={[0.52, 0.08, 0.05]} />
      </mesh>
      {[-0.12, 0, 0.12].map((x) => (
        <mesh key={x} position={[x, 0.78, -0.23]} material={m.wood}>
          <boxGeometry args={[0.05, 0.56, 0.03]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.22, 0.78, -0.23]} material={m.wood}>
          <boxGeometry args={[0.05, 0.62, 0.05]} />
        </mesh>
      ))}
      {[
        [-0.2, -0.2],
        [0.2, -0.2],
        [-0.2, 0.2],
        [0.2, 0.2],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.22, z]} material={m.wood}>
          <cylinderGeometry args={[0.025, 0.02, 0.44, 5]} />
        </mesh>
      ))}
      <mesh position={[0, 0.14, 0]} material={m.wood}>
        <boxGeometry args={[0.4, 0.025, 0.025]} />
      </mesh>
    </>
  )
}

function Wardrobe({ m }: { m: Mats }) {
  return (
    <>
      <mesh position={[0, 1.07, 0]} material={m.wood}>
        <boxGeometry args={[1.2, 1.9, 0.6]} />
      </mesh>
      {/* cornija e rodapé */}
      <mesh position={[0, 2.08, 0]} material={m.wood}>
        <boxGeometry args={[1.3, 0.1, 0.66]} />
      </mesh>
      <mesh position={[0, 2.17, 0]} material={m.wood}>
        <boxGeometry args={[1.2, 0.08, 0.6]} />
      </mesh>
      <mesh position={[0, 0.07, 0]} material={m.wood}>
        <boxGeometry args={[1.26, 0.14, 0.64]} />
      </mesh>
      {/* almofadas das portas */}
      {[-1, 1].map((s) =>
        [0.55, 1.45].map((y) => (
          <mesh key={`${s}${y}`} position={[s * 0.29, y, 0.305]} material={m.woodLight}>
            <boxGeometry args={[0.42, y < 1 ? 0.6 : 0.95, 0.02]} />
          </mesh>
        )),
      )}
      {/* fresta entre as portas: por onde o jogador espia (0.6.0) */}
      <mesh position={[0, 1.05, 0.301]} material={m.dark}>
        <boxGeometry args={[0.02, 1.9, 0.01]} />
      </mesh>
      <mesh position={[-0.07, 1.1, 0.32]} material={m.brass}>
        <boxGeometry args={[0.03, 0.12, 0.02]} />
      </mesh>
      <mesh position={[0.07, 1.1, 0.32]} material={m.brass}>
        <boxGeometry args={[0.03, 0.12, 0.02]} />
      </mesh>
    </>
  )
}

/** Livros soltos nas prateleiras: uma malha só, com cor por vértice. */
function booksGeometry(w: number, d: number, seed: number) {
  let s = seed
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  const colors = ['#4a1a14', '#1a2a3a', '#2a3a1a', '#5a4a2a', '#3a1a2a', '#6a5a3a', '#1a1a14']
  const parts: THREE.BufferGeometry[] = []
  const color = new THREE.Color()
  for (let shelf = 0; shelf < 5; shelf++) {
    const y0 = 0.1 + shelf * 0.46
    let x = -w / 2 + 0.06
    while (x < w / 2 - 0.08) {
      const bw = 0.03 + r() * 0.05
      // vãos: livros caídos ou faltando
      if (r() < 0.12) {
        x += 0.1 + r() * 0.25
        continue
      }
      const bh = 0.24 + r() * 0.14
      const g = new THREE.BoxGeometry(bw, bh, d * 0.8)
      const lean = r() < 0.08 ? 0.3 : 0
      g.rotateZ(lean)
      g.translate(x + bw / 2, y0 + bh / 2, 0)
      color.set(colors[Math.floor(r() * colors.length)]).multiplyScalar(0.7 + r() * 0.5)
      const n = g.attributes.position.count
      const c = new Float32Array(n * 3)
      for (let i = 0; i < n; i++) color.toArray(c, i * 3)
      g.setAttribute('color', new THREE.BufferAttribute(c, 3))
      parts.push(g.toNonIndexed())
      g.dispose()
      x += bw + 0.004
    }
  }
  return parts.length ? mergeGeometries(parts) : null
}

function Shelf({ m, w, d, seed }: { m: Mats; w: number; d: number; seed: number }) {
  const books = useMemo(() => booksGeometry(w, d, seed), [w, d, seed])
  return (
    <>
      {/* laterais e prateleiras, sem fundo: os dados não dizem qual lado fica para a parede */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * (w - 0.04)) / 2, 1.2, 0]} material={m.wood}>
          <boxGeometry args={[0.04, 2.4, d]} />
        </mesh>
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} position={[0, 0.07 + i * 0.46, 0]} material={m.wood}>
          <boxGeometry args={[w, 0.03, d]} />
        </mesh>
      ))}
      {books && <mesh geometry={books} material={m.bookColors} />}
    </>
  )
}

function Bathtub({ m }: { m: Mats }) {
  return (
    <>
      <mesh position={[0, 0.36, 0]} material={m.porcelain}>
        <boxGeometry args={[1.6, 0.48, 0.75]} />
      </mesh>
      {/* borda arredondada e água parada, escura */}
      <mesh position={[0, 0.6, 0]} material={m.porcelain}>
        <boxGeometry args={[1.66, 0.04, 0.8]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} material={m.water}>
        <boxGeometry args={[1.44, 0.02, 0.6]} />
      </mesh>
      {[
        [-0.68, -0.28],
        [0.68, -0.28],
        [-0.68, 0.28],
        [0.68, 0.28],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.07, z]} material={m.brass}>
          <sphereGeometry args={[0.07, 5, 4]} />
        </mesh>
      ))}
      <mesh position={[-0.74, 0.72, 0]} material={m.brass}>
        <cylinderGeometry args={[0.02, 0.02, 0.24, 5]} />
      </mesh>
    </>
  )
}

function Bench({ m }: { m: Mats }) {
  return (
    <>
      <mesh position={[0, 0.38, 0]} material={m.stone}>
        <boxGeometry args={[1.44, 0.1, 0.47]} />
      </mesh>
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} position={[x, 0.17, 0]} material={m.stone}>
          <boxGeometry args={[0.2, 0.34, 0.38]} />
        </mesh>
      ))}
    </>
  )
}

function PropMesh({
  prop,
  m,
  om,
  scale,
  isOutdoor,
  seed,
}: {
  prop: Prop
  m: Mats
  om: ReturnType<typeof useOutdoorMats>
  scale: number
  isOutdoor: boolean
  seed: number
}) {
  switch (prop.type) {
    case 'table':
      return <Table m={m} stone={isOutdoor} />
    case 'chair':
      return <Chair m={m} />
    case 'wardrobe':
      return <Wardrobe m={m} />
    case 'shelf':
      return <Shelf m={m} w={(prop.w ?? 80) * scale} d={(prop.h ?? 5) * scale} seed={seed} />
    case 'bathtub':
      return <Bathtub m={m} />
    case 'bench':
      return <Bench m={m} />
    case 'monitor':
      return (
        <>
          <mesh position={[0, 1.5, 0]} material={m.dark}>
            <boxGeometry args={[1.1, 0.7, 0.08]} />
          </mesh>
          {/* Painel do carro: meta do contrato, extrator e saldo */}
          <CarPanel />
        </>
      )
    default:
      return <OutdoorPropMesh prop={prop} m={om} scale={scale} seed={seed} />
  }
}

export function Props({ level, built }: { level: LevelData; built: BuiltLevel }) {
  const m = useMats()
  const om = useOutdoorMats()
  const outdoorRooms = level.rooms.filter((r) => r.kind === 'outdoor')

  // as peças de todos os móveis viram uma malha por material (StaticMerge); fazem e recebem sombra
  return (
    <StaticMerge version={level}>
      {level.props.map((p, i) => {
        const isOutdoor = outdoorRooms.some((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h)
        return (
          <RigidBody
            key={p.id}
            type="fixed"
            colliders={false}
            collisionGroups={WORLD_GROUPS}
            position={built.toWorld(p.x, p.y)}
            rotation={[0, ((p.rot ?? 0) * Math.PI) / 180, 0]}
          >
            {colliders(p, level.scale).map((c, k) => (
              <CuboidCollider key={k} position={c.p} args={c.h} collisionGroups={WORLD_GROUPS} />
            ))}
            <PropMesh prop={p} m={m} om={om} scale={level.scale} isOutdoor={isOutdoor} seed={i * 7919 + 13} />
          </RigidBody>
        )
      })}
    </StaticMerge>
  )
}
