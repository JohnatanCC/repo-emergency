import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import {
  BallCollider,
  CuboidCollider,
  CylinderCollider,
  RigidBody,
  useBeforePhysicsStep,
  type RapierCollider,
  type RapierRigidBody,
} from '@react-three/rapier'
import type { LevelData } from '../game/data/types'
import type { BuiltLevel } from '../world/buildLevel'
import { ITEM_GROUPS } from '../game/physics'
import { emitNoise } from '../game/systems/noise'
import { registerInteractable } from '../game/systems/interactables'
import { useGameStore } from '../game/stores/gameStore'
import { CARRY, RELIC_GLOW, type ItemDef } from './catalog'
import { isBroken, useItemStore, type ItemInstance } from './itemStore'

/** Nome com valor, para dicas e HUD. */
export function itemLabel(item: ItemInstance) {
  return `${item.def.name}${isBroken(item) ? ' (quebrado)' : ''} · $${item.value}`
}

/** Malha do item (no mundo e nas mãos). Relíquias brilham de leve; quebrado fica escuro. */
export function ItemMesh({ def, broken }: { def: ItemDef; broken: boolean }) {
  const material = useMemo(() => {
    const relic = def.tag === 'relic'
    return new THREE.MeshStandardMaterial({
      color: broken ? new THREE.Color(def.color).multiplyScalar(0.35) : def.color,
      roughness: 0.6,
      metalness: def.color === '#b8bcc4' || def.color === '#c9a64a' || def.color === '#b08d3a' ? 0.5 : 0.1,
      emissive: relic && !broken ? RELIC_GLOW.color : '#000000',
      emissiveIntensity: relic && !broken ? RELIC_GLOW.intensity : 0,
    })
  }, [def, broken])
  const [a, b, c] = def.dims
  return (
    <mesh material={material} castShadow receiveShadow>
      {def.shape === 'box' && <boxGeometry args={[a, b, c]} />}
      {def.shape === 'cylinder' && <cylinderGeometry args={[a, a * 0.85, b, 10]} />}
      {def.shape === 'sphere' && <sphereGeometry args={[a, 10, 8]} />}
    </mesh>
  )
}

function ItemCollider({ def, colliderRef }: { def: ItemDef; colliderRef: React.RefObject<RapierCollider> }) {
  const [a, b, c] = def.dims
  const props = { ref: colliderRef, mass: def.mass, collisionGroups: ITEM_GROUPS, friction: 0.8, restitution: 0.1 }
  if (def.shape === 'box') return <CuboidCollider args={[a / 2, b / 2, c / 2]} {...props} />
  if (def.shape === 'cylinder') return <CylinderCollider args={[b / 2, a]} {...props} />
  return <BallCollider args={[a]} {...props} />
}

function WorldItem({ item }: { item: ItemInstance }) {
  const body = useRef<RapierRigidBody>(null)
  const collider = useRef<RapierCollider>(null)
  const st = useRef({ speed: 0 }).current
  const { uid } = item

  // velocidade antes do passo: é a do momento do impacto
  useBeforePhysicsStep(() => {
    const v = body.current?.linvel()
    if (v) st.speed = Math.hypot(v.x, v.y, v.z)
  })

  useEffect(() => {
    const c = collider.current
    if (!c) return
    return registerInteractable(c.handle, {
      kind: 'item',
      label: () => {
        const s = useItemStore.getState()
        const it = s.items[uid]
        if (!it) return { text: '', ok: false }
        const go = s.wouldGo(uid)
        return go ? { text: `pegar ${itemLabel(it)}`, ok: true } : { text: `${itemLabel(it)} — mãos ocupadas`, ok: false }
      },
      use: () => {
        useItemStore.getState().pickUp(uid)
      },
    })
  }, [uid])

  const onImpact = () => {
    const speed = st.speed
    if (speed <= CARRY.safeImpact) return
    useItemStore.getState().impact(uid, speed)
    const p = body.current?.translation()
    if (p) emitNoise({ pos: [p.x, p.y, p.z], radius: speed * CARRY.noisePerImpact, type: 'item' })
  }

  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={item.spawn.pos}
      rotation={[0, item.spawn.yaw, 0]}
      linearVelocity={item.spawn.vel}
      angularDamping={0.6}
      linearDamping={0.2}
      ccd
      onCollisionEnter={onImpact}
    >
      <ItemCollider def={item.def} colliderRef={collider} />
      <ItemMesh def={item.def} broken={isBroken(item)} />
    </RigidBody>
  )
}

/** Itens no mapa. Sorteia de novo a cada partida (início e recomeço). */
export function Items({ level, built }: { level: LevelData; built: BuiltLevel }) {
  const items = useItemStore((s) => s.items)
  const matchId = useGameStore((s) => s.matchId)

  useEffect(() => {
    useItemStore.getState().roll(level, built)
  }, [level, built, matchId])

  return (
    <>
      {Object.values(items)
        .filter((it) => it.place === 'world')
        .map((it) => (
          <WorldItem key={`${it.uid}-${it.version}`} item={it} />
        ))}
    </>
  )
}
