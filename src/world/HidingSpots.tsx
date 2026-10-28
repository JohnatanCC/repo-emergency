import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, type RapierCollider } from '@react-three/rapier'
import type { HidingSpot, LevelData, Prop } from '../game/data/types'
import type { BuiltLevel } from './buildLevel'
import { WORLD_GROUPS } from '../game/physics'
import { registerInteractable } from '../game/systems/interactables'
import { emitNoise } from '../game/systems/noise'
import { audio } from '../game/audio/engine'
import { useHidingStore } from '../player/hidingStore'
import { usePlayerStore } from '../player/playerStore'
import { playerFeet } from '../player/playerPos'
import { useItemStore } from '../items/itemStore'

/**
 * Esconderijos do nível (dados: `hidingSpots`, cada um preso a um móvel).
 *  - under-table: agachado dentro da área da mesa
 *  - under-chair: agachado colado na cadeira (o assento é baixo demais para caber embaixo); esconde menos
 *  - wardrobe: `E` entra; vê só pela fresta entre as portas; `E` sai pela frente
 */

type Vec3 = [number, number, number]

/** Medidas dos móveis (iguais às de Props.tsx). */
const TABLE_HALF = { x: 0.8, z: 0.4 }
const CHAIR_REACH = 0.65
const WARDROBE = { w: 1.2, h: 2.1, d: 0.6 }
/** Barulho ao entrar/sair do armário (raio em metros). */
const WARDROBE_NOISE = 3

export interface WardrobeInfo {
  id: string
  /** Onde ficam os olhos lá dentro. */
  eye: Vec3
  /** Para onde a câmera olha (yaw) lá dentro: para fora, pela fresta. */
  yaw: number
  /** Pés lá dentro / na frente ao sair. */
  inside: Vec3
  exit: Vec3
}

/** Armários do nível, para o Player posicionar corpo e câmera. */
export const wardrobes = new Map<string, WardrobeInfo>()

function frame(p: Prop, built: BuiltLevel) {
  const [x, , z] = built.toWorld(p.x, p.y)
  const rot = ((p.rot ?? 0) * Math.PI) / 180
  // frente do móvel = +z local girado
  return { x, z, rot, fx: Math.sin(rot), fz: Math.cos(rot) }
}

function Wardrobe({ spot, prop, built }: { spot: HidingSpot; prop: Prop; built: BuiltLevel }) {
  const collider = useRef<RapierCollider>(null)
  const f = useMemo(() => frame(prop, built), [prop, built])

  useEffect(() => {
    const out = (d: number, y: number): Vec3 => [f.x + f.fx * d, y, f.z + f.fz * d]
    wardrobes.set(spot.id, {
      id: spot.id,
      // logo à frente das portas: a malha do armário (e a faixa da fresta) fica atrás da câmera;
      // o HUD desenha as portas com a fresta
      eye: out(WARDROBE.d / 2 + 0.04, 1.55),
      yaw: Math.atan2(-f.fx, -f.fz),
      inside: [f.x, 0, f.z],
      exit: out(WARDROBE.d / 2 + 0.45, 0),
    })
    return () => {
      wardrobes.delete(spot.id)
    }
  }, [spot.id, f])

  useEffect(() => {
    const c = collider.current
    if (!c) return
    return registerInteractable(c.handle, {
      kind: 'hide',
      label: () => {
        const items = useItemStore.getState()
        const held = items.hands ? items.items[items.hands]?.def.size : undefined
        if (held === 'large') return { text: 'mãos ocupadas (Q larga)', ok: false }
        return { text: 'esconder no armário', ok: true }
      },
      use: () => {
        useHidingStore.getState().enter(spot.id, 'wardrobe')
        const pos: Vec3 = [f.x, 1, f.z]
        audio.play('creak', { pos, volume: 0.5, rate: 1.3 })
        emitNoise({ pos, radius: WARDROBE_NOISE, type: 'door' })
      },
    })
  }, [spot.id, f])

  // sensor um pouco maior que o armário: só para a mira achar
  return (
    <RigidBody type="fixed" colliders={false} position={[f.x, WARDROBE.h / 2, f.z]} rotation={[0, f.rot, 0]}>
      <CuboidCollider
        ref={collider}
        args={[WARDROBE.w / 2 + 0.02, WARDROBE.h / 2, WARDROBE.d / 2 + 0.03]}
        sensor
        collisionGroups={WORLD_GROUPS}
      />
    </RigidBody>
  )
}

/** Sai do armário pela frente. */
export function leaveWardrobe() {
  const h = useHidingStore.getState()
  const w = h.wardrobeId ? wardrobes.get(h.wardrobeId) : undefined
  h.leave()
  if (!w) return
  const pos: Vec3 = [w.inside[0], 1, w.inside[2]]
  audio.play('creak', { pos, volume: 0.5, rate: 1.3 })
  emitNoise({ pos, radius: WARDROBE_NOISE, type: 'door' })
}

export function HidingSpots({ level, built }: { level: LevelData; built: BuiltLevel }) {
  const spots = useMemo(() => {
    const props = new Map(level.props.map((p) => [p.id, p]))
    return level.hidingSpots.flatMap((s) => {
      const prop = props.get(s.propId)
      return prop ? [{ spot: s, prop, f: frame(prop, built) }] : []
    })
  }, [level, built])

  // embaixo da mesa / colado na cadeira: só agachado
  useFrame(() => {
    const hiding = useHidingStore.getState()
    if (hiding.wardrobeId) return
    let found: (typeof spots)[number] | undefined
    if (usePlayerStore.getState().crouching) {
      found = spots.find(({ spot, f }) => {
        const dx = playerFeet.x - f.x
        const dz = playerFeet.z - f.z
        if (spot.type === 'under-chair') return Math.hypot(dx, dz) < CHAIR_REACH
        if (spot.type !== 'under-table') return false
        // no espaço da mesa (gira o ponto para o eixo dela)
        const lx = dx * Math.cos(f.rot) - dz * Math.sin(f.rot)
        const lz = dx * Math.sin(f.rot) + dz * Math.cos(f.rot)
        return Math.abs(lx) < TABLE_HALF.x && Math.abs(lz) < TABLE_HALF.z
      })
    }
    if (found) hiding.enter(found.spot.id, found.spot.type)
    else if (hiding.spot) hiding.leave()
  })

  return (
    <>
      {spots
        .filter(({ spot }) => spot.type === 'wardrobe')
        .map(({ spot, prop }) => (
          <Wardrobe key={spot.id} spot={spot} prop={prop} built={built} />
        ))}
    </>
  )
}
