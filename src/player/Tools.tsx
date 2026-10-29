import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BallCollider, RigidBody, useRapier, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { ITEM_GROUPS, TOOL_GROUPS } from '../game/physics'
import { isPaused, useGameStore } from '../game/stores/gameStore'
import { allCreatures, creatureByCollider } from '../game/systems/creatures'
import { emitNoise } from '../game/systems/noise'
import { audio } from '../game/audio/engine'
import { TOOL_FX, type ToolId } from '../game/shop'
import { debugApi } from '../game/debug'
import { useItemStore } from '../items/itemStore'
import { PLAYER } from './config'
import { usePlayerStore } from './playerStore'
import { useHidingStore } from './hidingStore'

/**
 * Ferramentas da loja: clique esquerdo usa a do espaço escolhido do inventário.
 *  - kits: curam na hora
 *  - crucifixo: criatura na mira (até 4 m) fica presa e atordoada
 *  - granada de luz: arremessada; o clarão atordoa todas as criaturas perto
 *  - bastão: golpe que empurra e atordoa por pouco tempo (não gasta)
 */

type Vec3 = [number, number, number]

/** Granada arremessada: corpo físico; explode quando acaba o pavio. */
function Grenade({ from, vel, onExplode }: { from: Vec3; vel: Vec3; onExplode: (at: Vec3) => void }) {
  const body = useRef<RapierRigidBody>(null)
  const fuse = useRef(TOOL_FX.grenadeFuse)
  const done = useRef(false)
  useFrame((_, dt) => {
    if (done.current || (fuse.current -= dt) > 0) return
    done.current = true
    const p = body.current?.translation()
    onExplode(p ? [p.x, p.y, p.z] : from)
  })
  return (
    <RigidBody ref={body} position={from} linearVelocity={vel} colliders={false} ccd angularDamping={0.5}>
      <BallCollider args={[0.05]} mass={0.4} collisionGroups={ITEM_GROUPS} restitution={0.3} />
      <mesh castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.12, 8]} />
        <meshStandardMaterial color="#7a8a6a" />
      </mesh>
    </RigidBody>
  )
}

/** Clarão da granada: luz forte que se apaga rápido. */
function Flash({ at, onDone }: { at: Vec3; onDone: () => void }) {
  const light = useRef<THREE.PointLight>(null)
  const life = useRef(0.6)
  useFrame((_, dt) => {
    life.current -= dt
    if (light.current) light.current.intensity = 400 * Math.max(0, life.current / 0.6) ** 2
    if (life.current <= 0) onDone()
  })
  return <pointLight ref={light} position={at} color="#fff6e0" intensity={400} distance={18} decay={1.4} />
}

export function Tools() {
  const camera = useThree((s) => s.camera)
  const { world, rapier } = useRapier()
  const [grenades, setGrenades] = useState<{ id: number; from: Vec3; vel: Vec3 }[]>([])
  const [flashes, setFlashes] = useState<{ id: number; at: Vec3 }[]>([])
  const swing = useRef({ t: 0, cooldown: 0 })
  const bat = useRef<THREE.Group>(null)
  const tmp = useMemo(() => ({ dir: new THREE.Vector3() }), [])

  const toast = (text: string) => usePlayerStore.getState().showToast(text)

  /** Criatura na mira até `range` (paredes e portas bloqueiam). */
  const aimed = (range: number) => {
    camera.getWorldDirection(tmp.dir)
    const hit = world.castRay(new rapier.Ray(camera.position, tmp.dir), range, true, undefined, TOOL_GROUPS)
    return hit ? creatureByCollider(hit.collider.handle) : undefined
  }

  const explode = (at: Vec3) => {
    audio.play('slam', { pos: at, volume: 1, rate: 0.7 })
    audio.play('whoosh', { pos: at, volume: 0.8, rate: 2 })
    emitNoise({ pos: at, radius: TOOL_FX.grenadeNoise, type: 'item' })
    for (const c of allCreatures()) {
      const p = c.pos()
      if (Math.hypot(p.x - at[0], p.z - at[2]) <= TOOL_FX.grenadeRadius) c.stun(TOOL_FX.grenadeStun)
    }
    setFlashes((f) => [...f, { id: performance.now(), at: [at[0], at[1] + 0.5, at[2]] }])
  }

  const use = () => {
    const game = useGameStore.getState()
    if (game.cameraMode !== 'player' || isPaused(game.phase) || useHidingStore.getState().wardrobeId) return
    const items = useItemStore.getState()
    const uid = items.slots[items.selected]
    const item = uid ? items.items[uid] : undefined
    if (!item || item.def.tag !== 'tool') return
    const id = item.def.id as ToolId
    const player = usePlayerStore.getState()
    const p = camera.position

    if (id === 'kitP' || id === 'kitM' || id === 'kitG') {
      if (player.health >= PLAYER.maxHealth) return toast('vida cheia')
      player.damage(-TOOL_FX.heal[id])
      items.discard(uid!)
      audio.play('rustle', { volume: 0.6 })
      audio.play('click', { volume: 0.5, rate: 0.8 })
      return
    }

    if (id === 'crucifixo') {
      const c = aimed(TOOL_FX.crucifixRange)
      if (!c) return toast('nenhuma criatura na mira')
      c.stun(TOOL_FX.crucifixStun)
      items.discard(uid!)
      const at = c.pos()
      audio.play('charge', { pos: [at.x, 1.4, at.z], volume: 0.8, rate: 4 })
      audio.play('whoosh', { pos: [at.x, 1.4, at.z], volume: 0.6, rate: 2.5 })
      toast(`${c.name} presa`)
      return
    }

    if (id === 'granada') {
      camera.getWorldDirection(tmp.dir)
      const v = tmp.dir.clone().multiplyScalar(TOOL_FX.grenadeThrowSpeed)
      v.y += 2.5
      items.discard(uid!)
      audio.play('rustle', { volume: 0.6 })
      const from: Vec3 = [p.x + tmp.dir.x * 0.4, p.y - 0.15, p.z + tmp.dir.z * 0.4]
      setGrenades((g) => [...g, { id: performance.now(), from, vel: [v.x, v.y, v.z] }])
      return
    }

    if (id === 'bastao') {
      if (swing.current.cooldown > 0) return
      swing.current = { t: 0.25, cooldown: TOOL_FX.batCooldown }
      const c = aimed(TOOL_FX.batRange)
      if (!c) return audio.play('rustle', { volume: 0.4, rate: 1.6 })
      const at = c.pos()
      const dx = at.x - p.x
      const dz = at.z - p.z
      const d = Math.hypot(dx, dz) || 1
      c.stun(TOOL_FX.batStun, { x: (dx / d) * TOOL_FX.batKnockback, z: (dz / d) * TOOL_FX.batKnockback })
      audio.play('hit', { pos: [at.x, 1.2, at.z], volume: 0.9, rate: 0.9 })
    }
  }

  useEffect(() => {
    debugApi.useTool = use
    const onDown = (e: MouseEvent) => {
      if (e.button === 0 && usePlayerStore.getState().locked) use()
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  })

  // golpe do bastão: aparece na mão direita e varre da direita para a esquerda
  useFrame((_, dt) => {
    const s = swing.current
    s.cooldown -= dt
    s.t -= dt
    const g = bat.current
    if (!g) return
    g.visible = s.t > 0
    if (!g.visible) return
    g.position.copy(camera.position)
    g.quaternion.copy(camera.quaternion)
    const k = 1 - s.t / 0.25
    g.children[0].rotation.set(-1.2, 0, 1.2 - k * 2.6)
  })

  return (
    <>
      <group ref={bat} visible={false}>
        <group position={[0.15, -0.2, -0.45]}>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.035, 0.025, 0.6, 8]} />
            <meshStandardMaterial color="#5a3a1e" />
          </mesh>
        </group>
      </group>
      {grenades.map((g) => (
        <Grenade
          key={g.id}
          from={g.from}
          vel={g.vel}
          onExplode={(at) => {
            setGrenades((list) => list.filter((x) => x.id !== g.id))
            explode(at)
          }}
        />
      ))}
      {flashes.map((f) => (
        <Flash key={f.id} at={f.at} onDone={() => setFlashes((list) => list.filter((x) => x.id !== f.id))} />
      ))}
    </>
  )
}
