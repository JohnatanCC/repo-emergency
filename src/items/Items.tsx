import { useEffect, useRef } from 'react'
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
import { audio } from '../game/audio/engine'
import { AUDIO } from '../game/audio/sounds'
import { registerInteractable } from '../game/systems/interactables'
import { useGameStore } from '../game/stores/gameStore'
import { CARRY, type ItemDef } from './catalog'
import { ItemModel } from './models'
import { isBroken, useItemStore, type ItemInstance } from './itemStore'
import { itemBodies } from './bodies'
import { usePlayerStore } from '../player/playerStore'

/** Nome com valor, para dicas e HUD. */
export function itemLabel(item: ItemInstance) {
  return `${item.def.name}${isBroken(item) ? ' (quebrado)' : ''} · $${item.value}`
}

/** Malha do item (no mundo e nas mãos): modelo próprio de cada objeto (models.tsx). */
export function ItemMesh({ def, broken, uid }: { def: ItemDef; broken: boolean; uid?: string }) {
  return <ItemModel def={def} broken={broken} uid={uid} />
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
    const b = body.current
    if (!b) return
    const v = b.linvel()
    st.speed = Math.hypot(v.x, v.y, v.z)
    // caiu para fora do mapa (atravessou o chão): volta para onde nasceu
    if (b.translation().y < -3) {
      const [x, , z] = item.origin
      b.setTranslation({ x, y: 1.2, z }, true)
      b.setLinvel({ x: 0, y: 0, z: 0 }, true)
      b.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }
  })

  useEffect(() => {
    const b = body.current
    if (!b) return
    itemBodies.set(uid, b)
    return () => {
      if (itemBodies.get(uid) === b) itemBodies.delete(uid)
    }
  }, [uid])

  useEffect(() => {
    const c = collider.current
    if (!c) return
    return registerInteractable(c.handle, {
      kind: 'item',
      highlight: uid,
      label: () => {
        const s = useItemStore.getState()
        const it = s.items[uid]
        if (!it) return { text: '', ok: false }
        if (it.def.tag === 'tool')
          return s.wouldGo(uid)
            ? { text: `pegar ${it.def.name} (ferramenta)`, ok: true }
            : { text: `${it.def.name} — sem espaço`, ok: false }
        if (it.def.tag === 'head' && s.wouldGo(uid)) return { text: `pegar ${it.def.name} (leve ao carro: +1 vida)`, ok: true }
        if (it.def.tag === 'supply') return { text: `pegar ${it.def.name} (+${it.def.battery}% bateria)`, ok: true }
        const go = s.wouldGo(uid)
        return go ? { text: `pegar ${itemLabel(it)}`, ok: true } : { text: `${itemLabel(it)} — mãos ocupadas`, ok: false }
      },
      use: () => {
        // suprimento: usa na hora (não ocupa espaço)
        const supply = useItemStore.getState().consume(uid)
        if (supply) {
          usePlayerStore.getState().addBattery(supply.battery ?? 0)
          audio.play('click', { volume: 0.6 })
          audio.play('rustle', { volume: 0.5 })
          return
        }
        if (useItemStore.getState().pickUp(uid)) audio.play('rustle', { volume: 0.6 })
      },
    })
  }, [uid])

  const onImpact = () => {
    const speed = st.speed
    const p = body.current?.translation()
    if (!p || speed < 1.2) return
    const pos: [number, number, number] = [p.x, p.y, p.z]
    // som em qualquer batida; frágil que bateu forte estilhaça
    const breaks = speed > CARRY.safeImpact && item.def.fragility >= 0.8
    audio.play(breaks ? 'shatter' : 'thunk', {
      pos,
      volume: AUDIO.items * Math.min(1, speed / 6),
      rate: breaks ? 1 : 1.3 - Math.min(item.def.mass, 10) / 20,
    })
    if (speed <= CARRY.safeImpact) return
    useItemStore.getState().impact(uid, speed)
    emitNoise({ pos, radius: speed * CARRY.noisePerImpact, type: 'item' })
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
      <ItemMesh def={item.def} broken={isBroken(item)} uid={item.uid} />
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
