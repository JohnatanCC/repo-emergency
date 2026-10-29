import { useMemo } from 'react'
import * as THREE from 'three'
import type { Prop } from '../game/data/types'
import { getTexture } from './textures'

/**
 * Enfeites do lado de fora e a prateleira do caminhão (tipos novos de móvel,
 * gerados em data/levels/exterior.ts). Cada um varia pelo `seed` (galhos,
 * inclinação, estátua sem cabeça…). Os colisores ficam em `outdoorColliders`.
 */

export function useOutdoorMats() {
  return useMemo(
    () => ({
      bark: new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 1, flatShading: true }),
      barkDark: new THREE.MeshStandardMaterial({ color: '#1a140e', roughness: 1, flatShading: true }),
      bush: new THREE.MeshStandardMaterial({ color: '#3a3622', roughness: 1, flatShading: true }),
      bushDry: new THREE.MeshStandardMaterial({ color: '#4a3e26', roughness: 1, flatShading: true }),
      stone: new THREE.MeshStandardMaterial({ map: getTexture('stone', 1, 1), color: '#9a988a', roughness: 1, flatShading: true }),
      moss: new THREE.MeshStandardMaterial({ color: '#3a4228', roughness: 1, flatShading: true }),
      iron: new THREE.MeshStandardMaterial({ color: '#1e1c1a', metalness: 0.5, roughness: 0.7 }),
      glass: new THREE.MeshStandardMaterial({ color: '#2a2820', emissive: '#6a5020', emissiveIntensity: 0.25, roughness: 0.3 }),
      dirt: new THREE.MeshStandardMaterial({ color: '#1e1a14', roughness: 1 }),
      steel: new THREE.MeshStandardMaterial({ color: '#4a4c50', metalness: 0.6, roughness: 0.5 }),
    }),
    [],
  )
}
type OM = ReturnType<typeof useOutdoorMats>

/** Gerador por móvel: o mesmo móvel sempre sai igual. */
function rng(seed: number) {
  let s = Math.floor(Math.abs(seed)) % 2147483646 || 7
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

type Box = { p: [number, number, number]; h: [number, number, number] }
export function outdoorColliders(prop: Prop, scale: number): Box[] | null {
  switch (prop.type) {
    case 'tree':
      return [{ p: [0, 1.6, 0], h: [0.22, 1.6, 0.22] }]
    case 'bush':
      return [{ p: [0, 0.45, 0], h: [0.5, 0.45, 0.5] }]
    case 'statue':
      return [{ p: [0, 1.1, 0], h: [0.42, 1.1, 0.42] }]
    case 'lamppost':
      return [{ p: [0, 1.6, 0], h: [0.1, 1.6, 0.1] }]
    case 'column':
      return [{ p: [0, 2.6, 0], h: [0.2, 2.6, 0.2] }]
    case 'fountain':
      return [{ p: [0, 0.35, 0], h: [1.6, 0.35, 1.6] }]
    case 'rack': {
      // tábuas e laterais de verdade: os equipamentos ficam em cima das prateleiras
      const w = ((prop.w ?? 30) * scale) / 2
      return [
        ...[0.5, 1.0, 1.5].map((y): Box => ({ p: [0, y, 0], h: [w, 0.02, 0.21] })),
        { p: [-w, 0.9, 0], h: [0.03, 0.9, 0.21] },
        { p: [w, 0.9, 0], h: [0.03, 0.9, 0.21] },
        // fundo, para nada rolar para trás
        { p: [0, 0.9, -0.2], h: [w, 0.9, 0.01] },
      ]
    }
  }
  return null
}

/** Árvore seca: tronco torto e galhos nus abrindo para cima. */
function Tree({ m, seed }: { m: OM; seed: number }) {
  const parts = useMemo(() => {
    const r = rng(seed)
    const h = 3.2 + r() * 1.8
    const lean = (r() - 0.5) * 0.18
    const branches: { y: number; yaw: number; tilt: number; len: number; thick: number }[] = []
    const n = 5 + Math.floor(r() * 4)
    for (let i = 0; i < n; i++)
      branches.push({
        y: h * (0.45 + 0.5 * (i / n)),
        yaw: r() * Math.PI * 2,
        tilt: 0.5 + r() * 0.7,
        len: 0.8 + r() * 1.3,
        thick: 0.05 + r() * 0.04,
      })
    return { h, lean, branches }
  }, [seed])
  return (
    <group rotation={[0, 0, parts.lean]}>
      <mesh position={[0, parts.h / 2, 0]} material={m.bark}>
        <cylinderGeometry args={[0.1, 0.24, parts.h, 6]} />
      </mesh>
      {/* raízes saltando do chão */}
      {[0, 2.1, 4.2].map((a) => (
        <mesh key={a} position={[Math.cos(a) * 0.25, 0.08, Math.sin(a) * 0.25]} rotation={[0, -a, 1.2]} material={m.barkDark}>
          <cylinderGeometry args={[0.04, 0.09, 0.5, 4]} />
        </mesh>
      ))}
      {parts.branches.map((b, i) => (
        <group key={i} position={[0, b.y, 0]} rotation={[0, b.yaw, b.tilt]}>
          <mesh position={[0, b.len / 2, 0]} material={m.bark}>
            <cylinderGeometry args={[b.thick * 0.4, b.thick, b.len, 4]} />
          </mesh>
          {/* gravetos na ponta */}
          <mesh position={[0.1, b.len * 0.95, 0]} rotation={[0, 0, -0.7]} material={m.barkDark}>
            <cylinderGeometry args={[0.005, b.thick * 0.4, b.len * 0.45, 3]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Arbusto morto: tufos baixos e gravetos espetados. */
function Bush({ m, seed }: { m: OM; seed: number }) {
  const blobs = useMemo(() => {
    const r = rng(seed)
    return Array.from({ length: 5 + Math.floor(r() * 3) }, () => ({
      p: [(r() - 0.5) * 0.7, 0.2 + r() * 0.35, (r() - 0.5) * 0.7] as [number, number, number],
      s: 0.25 + r() * 0.25,
      dry: r() < 0.5,
    }))
  }, [seed])
  return (
    <>
      {blobs.map((b, i) => (
        <mesh key={i} position={b.p} scale={[b.s, b.s * 0.8, b.s]} material={b.dry ? m.bushDry : m.bush}>
          <icosahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
      {[0, 1.3, 2.6, 3.9, 5.2].map((a) => (
        <mesh
          key={a}
          position={[Math.cos(a) * 0.3, 0.55, Math.sin(a) * 0.3]}
          rotation={[Math.sin(a) * 0.6, 0, Math.cos(a) * 0.6]}
          material={m.barkDark}
        >
          <cylinderGeometry args={[0.004, 0.015, 0.6, 3]} />
        </mesh>
      ))}
    </>
  )
}

/** Anjo de pedra rezando num pedestal, coberto de musgo. Às vezes sem cabeça. */
function Statue({ m, seed }: { m: OM; seed: number }) {
  const r = rng(seed)
  const headless = r() < 0.35
  return (
    <>
      <mesh position={[0, 0.4, 0]} material={m.stone}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
      </mesh>
      <mesh position={[0, 0.82, 0]} material={m.moss}>
        <boxGeometry args={[0.86, 0.06, 0.86]} />
      </mesh>
      <mesh position={[0, 1.4, 0]} material={m.stone}>
        <coneGeometry args={[0.32, 1.1, 7]} />
      </mesh>
      <mesh position={[0, 1.95, 0]} material={m.stone}>
        <cylinderGeometry args={[0.13, 0.18, 0.3, 6]} />
      </mesh>
      {!headless && (
        <mesh position={[0, 2.22, 0.02]} rotation={[0.3, 0, 0]} material={m.stone}>
          <sphereGeometry args={[0.13, 6, 5]} />
        </mesh>
      )}
      {/* mãos juntas e asas */}
      <mesh position={[0, 1.85, 0.16]} rotation={[0.9, 0, 0]} material={m.stone}>
        <boxGeometry args={[0.09, 0.22, 0.08]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.24, 1.9, -0.14]} rotation={[0.2, s * 0.5, s * -0.35]} material={m.stone}>
          <boxGeometry args={[0.04, 0.85, 0.42]} />
        </mesh>
      ))}
    </>
  )
}

/** Poste de ferro antigo, com a lanterna quebrada (apagada). */
function Lamppost({ m, seed }: { m: OM; seed: number }) {
  const bend = (rng(seed)() - 0.5) * 0.12
  return (
    <group rotation={[bend, 0, bend * 0.5]}>
      <mesh position={[0, 0.12, 0]} material={m.iron}>
        <cylinderGeometry args={[0.14, 0.18, 0.24, 6]} />
      </mesh>
      <mesh position={[0, 1.6, 0]} material={m.iron}>
        <cylinderGeometry args={[0.04, 0.06, 3.0, 5]} />
      </mesh>
      <mesh position={[0, 3.2, 0]} material={m.glass}>
        <boxGeometry args={[0.24, 0.32, 0.24]} />
      </mesh>
      <mesh position={[0, 3.42, 0]} material={m.iron}>
        <coneGeometry args={[0.22, 0.16, 4]} />
      </mesh>
    </group>
  )
}

/** Fonte seca: bacia octogonal, coluna e taça, com lodo no fundo. */
function Fountain({ m }: { m: OM }) {
  return (
    <>
      <mesh position={[0, 0.3, 0]} material={m.stone}>
        <cylinderGeometry args={[1.6, 1.7, 0.6, 8, 1, true]} />
      </mesh>
      <mesh position={[0, 0.62, 0]} rotation={[Math.PI / 2, 0, Math.PI / 8]} material={m.stone}>
        <torusGeometry args={[1.6, 0.08, 4, 8]} />
      </mesh>
      <mesh position={[0, 0.12, 0]} material={m.dirt}>
        <cylinderGeometry args={[1.55, 1.55, 0.04, 8]} />
      </mesh>
      <mesh position={[0, 0.9, 0]} material={m.stone}>
        <cylinderGeometry args={[0.18, 0.28, 1.6, 6]} />
      </mesh>
      <mesh position={[0, 1.75, 0]} material={m.stone}>
        <cylinderGeometry args={[0.7, 0.2, 0.25, 8]} />
      </mesh>
      <mesh position={[0, 1.86, 0]} material={m.moss}>
        <cylinderGeometry args={[0.62, 0.62, 0.02, 8]} />
      </mesh>
    </>
  )
}

/** Coluna da varanda, com base e capitel. */
function Column({ m }: { m: OM }) {
  return (
    <>
      <mesh position={[0, 0.15, 0]} material={m.stone}>
        <boxGeometry args={[0.6, 0.3, 0.6]} />
      </mesh>
      <mesh position={[0, 2.6, 0]} material={m.stone}>
        <cylinderGeometry args={[0.18, 0.22, 4.6, 8]} />
      </mesh>
      <mesh position={[0, 5.0, 0]} material={m.stone}>
        <boxGeometry args={[0.6, 0.3, 0.6]} />
      </mesh>
    </>
  )
}

/** Prateleira de aço do baú do caminhão: três tábuas e fundo de tela. */
function Rack({ m, w }: { m: OM; w: number }) {
  return (
    <>
      {[0.5, 1.0, 1.5].map((y) => (
        <mesh key={y} position={[0, y, 0]} material={m.steel}>
          <boxGeometry args={[w, 0.04, 0.42]} />
        </mesh>
      ))}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[(sx * w) / 2, 0.9, sz * 0.19]} material={m.iron}>
            <boxGeometry args={[0.05, 1.8, 0.05]} />
          </mesh>
        )),
      )}
      <mesh position={[0, 0.9, -0.2]} material={m.iron}>
        <boxGeometry args={[w, 1.8, 0.01]} />
      </mesh>
    </>
  )
}

export function OutdoorPropMesh({ prop, m, scale, seed }: { prop: Prop; m: OM; scale: number; seed: number }) {
  switch (prop.type) {
    case 'tree':
      return <Tree m={m} seed={seed} />
    case 'bush':
      return <Bush m={m} seed={seed} />
    case 'statue':
      return <Statue m={m} seed={seed} />
    case 'lamppost':
      return <Lamppost m={m} seed={seed} />
    case 'fountain':
      return <Fountain m={m} />
    case 'column':
      return <Column m={m} />
    case 'rack':
      return <Rack m={m} w={(prop.w ?? 30) * scale} />
  }
  return null
}
