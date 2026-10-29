import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import type { BuiltLevel } from './buildLevel'
import { getTexture, type TextureKey } from './textures'
import { WORLD_GROUPS } from '../game/physics'
import { RETRO_FX } from '../game/config'
import { affine } from './affine'

/**
 * Pisos, tetos e paredes do greybox + colisores fixos. Recebem a sombra da lanterna.
 *
 * Desempenho: uma textura e um material por tipo (papel de parede, tijolo…), com
 * o UV de cada peça já escalado para o tamanho dela, e todas as peças do mesmo
 * tipo juntas numa malha só. Antes cada parede era um draw call com textura própria.
 */

/** Metros por repetição da textura, por tipo. */
const TILE: Partial<Record<TextureKey, number>> = { checker: 1.2, grass: 2.5 }
const tileOf = (key: TextureKey) => TILE[key] ?? 1.6

/** Caixa com o UV de cada face medido em repetições da textura. */
/** Divisões por metro: a textura que "entorta" (PS1) fica sutil em pedaços pequenos. */
const segs = (m: number) => Math.max(1, Math.ceil(m / RETRO_FX.affineCell))

export function wallGeometry(size: [number, number, number], pos: [number, number, number], tile: number) {
  const [sx, sy, sz] = size
  const [nx, ny, nz] = [segs(sx), segs(sy), segs(sz)]
  const g = new THREE.BoxGeometry(sx, sy, sz, nx, ny, nz)
  const uv = g.attributes.uv
  // faces: +x, −x, +y, −y, +z, −z → largura × altura da face e quantos vértices ela tem
  const faces: [number, number, number][] = [
    [sz, sy, (nz + 1) * (ny + 1)],
    [sz, sy, (nz + 1) * (ny + 1)],
    [sx, sz, (nx + 1) * (nz + 1)],
    [sx, sz, (nx + 1) * (nz + 1)],
    [sx, sy, (nx + 1) * (ny + 1)],
    [sx, sy, (nx + 1) * (ny + 1)],
  ]
  let i = 0
  for (const [w, h, count] of faces) for (let v = 0; v < count; v++, i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * h) / tile)
  g.translate(...pos)
  return g.toNonIndexed()
}

export function planeGeometry(size: [number, number], pos: [number, number, number], up: boolean, tile: number) {
  const g = new THREE.PlaneGeometry(size[0], size[1], segs(size[0]), segs(size[1]))
  const uv = g.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * size[0]) / tile, (uv.getY(i) * size[1]) / tile)
  g.rotateX(up ? -Math.PI / 2 : Math.PI / 2)
  g.translate(...pos)
  return g.toNonIndexed()
}

interface Batch {
  key: string
  geo: THREE.BufferGeometry
  mat: THREE.Material
  cast: boolean
}

export function Level({ built, wallHeight }: { built: BuiltLevel; wallHeight: number }) {
  const batches = useMemo(() => {
    const groups = new Map<string, { tex: TextureKey; roughness: number; cast: boolean; geos: THREE.BufferGeometry[] }>()
    const push = (key: string, tex: TextureKey, roughness: number, cast: boolean, g: THREE.BufferGeometry) => {
      const entry = groups.get(key) ?? { tex, roughness, cast, geos: [] }
      entry.geos.push(g)
      groups.set(key, entry)
    }
    for (const f of built.floors) {
      push(`floor-${f.floor}`, f.floor, 0.9, false, planeGeometry(f.size, [f.pos[0], 0, f.pos[2]], true, tileOf(f.floor)))
      if (f.ceiling) push('ceiling', 'ceiling', 1, false, planeGeometry(f.size, [f.pos[0], wallHeight, f.pos[2]], false, tileOf('ceiling')))
    }
    // paredes invisíveis (barreira do lado de fora) só têm colisor
    for (const w of built.walls.filter((w) => w.material !== 'none'))
      push(`wall-${w.material}`, w.material, 0.95, true, wallGeometry(w.size, w.pos, tileOf(w.material)))
    const out: Batch[] = []
    for (const [key, e] of groups) {
      const geo = mergeGeometries(e.geos)
      e.geos.forEach((g) => g.dispose())
      if (!geo) continue
      const t = tileOf(e.tex)
      out.push({
        key,
        geo,
        cast: e.cast,
        mat: affine(new THREE.MeshStandardMaterial({ map: getTexture(e.tex, t, t, t), roughness: e.roughness })),
      })
    }
    return out
  }, [built, wallHeight])
  useEffect(
    () => () =>
      batches.forEach((b) => {
        b.geo.dispose()
        b.mat.dispose()
      }),
    [batches],
  )

  return (
    <group>
      {batches.map((b) => (
        <mesh key={b.key} geometry={b.geo} material={b.mat} castShadow={b.cast} receiveShadow />
      ))}

      {built.floors
        .filter((f) => f.room.kind === 'extraction')
        .map((f) => (
          <mesh key={f.key} rotation-x={-Math.PI / 2} position={[f.pos[0], 0.01, f.pos[2]]}>
            <planeGeometry args={[f.size[0] * 0.7, f.size[1] * 0.7]} />
            <meshBasicMaterial color="#6b3fa0" transparent opacity={0.35} />
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
