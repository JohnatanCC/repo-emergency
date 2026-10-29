import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, useBeforePhysicsStep, useRapier, type RapierCollider, type RapierRigidBody } from '@react-three/rapier'
import type { KinematicCharacterController } from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import { ENEMY_GROUPS } from '../../game/physics'
import { isPaused, useGameStore } from '../../game/stores/gameStore'
import { setDanger } from '../../game/systems/danger'
import { emitNoise } from '../../game/systems/noise'
import { audio, type LoopHandle } from '../../game/audio/engine'
import { AUDIO } from '../../game/audio/sounds'
import { playerFeet } from '../../player/playerPos'
import { usePlayerStore } from '../../player/playerStore'
import { useHidingStore } from '../../player/hidingStore'
import { hasPossessor, isCarried, onPossessorFreed, useItemStore } from '../../items/itemStore'
import type { NavGrid, P2 } from '../nav'
import { applyStun, stunFields, stunStep } from '../stun'
import { registerCreature } from '../../game/systems/creatures'
import { newWalkState, walkCheckStuck, walkResume, walkSteer, walkTo } from '../walker'
import { POSSESSOR } from './config'
import { PossessorModel } from '../models/PossessorModel'
import { newPose } from '../models/pose'

/**
 * O Possessor mora num objeto de saque (sorteado em itemStore.roll).
 *  - Carregando o objeto: murmúrios de tempo em tempo (fazem barulho) e a vida
 *    cai devagar, sem matar sozinha. Depois do primeiro murmúrio o objeto dá pistas.
 *  - Largando o objeto: a figura sai dele, persegue por um tempo e volta para o objeto.
 *  - Extrair o objeto possuído: o C.R.O.S multa (Extractor / payout).
 */

export const possessorDebug = { carrying: false, freed: 0, ghostState: 'off', ghostPos: { x: 0, z: 0 } }

const R = POSSESSOR.radius
const HALF = POSSESSOR.height / 2 - R
const UP = new THREE.Vector3(0, 1, 0)
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const dist = (a: P2, b: P2) => Math.hypot(a.x - b.x, a.z - b.z)

/** Efeitos do objeto possuído enquanto o jogador carrega. */
function Curse() {
  const st = useRef({ uid: '', timer: 0, drain: 0 }).current

  useFrame((_, dt) => {
    const game = useGameStore.getState()
    const items = useItemStore.getState()
    const cursed = Object.values(items.items).find((it) => hasPossessor(it) && isCarried(it))
    possessorDebug.carrying = !!cursed
    if (!cursed || isPaused(game.phase)) {
      st.uid = ''
      return
    }
    // pegou agora: o primeiro murmúrio vem mais cedo
    if (st.uid !== cursed.uid) {
      st.uid = cursed.uid
      st.timer = cursed.revealed ? POSSESSOR.whisperEvery : POSSESSOR.firstWhisper
    }
    if ((st.timer -= dt) <= 0) {
      st.timer = POSSESSOR.whisperEvery
      const at: [number, number, number] = [playerFeet.x, playerFeet.y + 1.2, playerFeet.z]
      audio.play('murmur', { pos: at, volume: AUDIO.possessor, rate: 0.9 + Math.random() * 0.2 })
      emitNoise({ pos: at, radius: POSSESSOR.whisperNoise, type: 'item' })
      items.reveal(cursed.uid)
    }
    // drena vida aos poucos (aplica em blocos para não redesenhar o HUD todo frame)
    st.drain += POSSESSOR.drainPerSec * dt
    if (st.drain >= 1) {
      const player = usePlayerStore.getState()
      const amount = Math.min(Math.floor(st.drain), Math.max(0, player.health - POSSESSOR.minHealth))
      if (amount > 0) player.damage(amount)
      st.drain -= Math.floor(st.drain)
    }
  })
  return null
}

/** A figura liberta: persegue o jogador por um tempo e volta para o objeto. */
function Ghost({ nav, spawn, onDone }: { nav: NavGrid; spawn: P2; onDone: () => void }) {
  const body = useRef<RapierRigidBody>(null)
  const collider = useRef<RapierCollider>(null)
  const controller = useRef<KinematicCharacterController>()
  const pose = useRef(newPose()).current
  const { world } = useRapier()
  const b = useRef({
    ...newWalkState(spawn),
    ...stunFields(),
    life: POSSESSOR.chaseTime,
    repath: 0,
    cooldown: 0.8,
    yaw: 0,
    vy: 0,
    grounded: false,
    fading: 0,
  }).current
  const sound = useRef<LoopHandle | null>(null)

  useEffect(() => {
    const c = world.createCharacterController(0.02)
    c.enableAutostep(0.3, 0.2, false)
    c.enableSnapToGround(0.3)
    c.setApplyImpulsesToDynamicBodies(true)
    c.setCharacterMass(40)
    controller.current = c
    return () => {
      world.removeCharacterController(c)
      controller.current = undefined
    }
  }, [world])

  useEffect(() => {
    audio.play('shriek', { pos: [spawn.x, 1.2, spawn.z], volume: AUDIO.possessor, rate: 1.45 })
    sound.current = audio.loop('whisper', { pos: [spawn.x, 1.2, spawn.z], volume: AUDIO.possessor * 0.8, rate: 1.5, ref: 2 })
    possessorDebug.freed++
    const unregister = registerCreature({
      id: `possessor-${performance.now()}`,
      name: 'Possessor',
      colliderHandle: () => collider.current?.handle,
      pos: () => b.pos,
      stun: (seconds, knock) => applyStun(b, seconds, knock),
    })
    return () => {
      unregister()
      sound.current?.stop()
      possessorDebug.freed--
      possessorDebug.ghostState = 'off'
      setDanger('possessor', 0)
    }
  }, [])

  useBeforePhysicsStep((w) => {
    const body_ = body.current
    const col = collider.current
    const ctrl = controller.current
    if (!body_ || !col || !ctrl) return
    const dt = Math.min(w.timestep, 0.05)
    const p = body_.translation()
    b.pos.x = p.x
    b.pos.z = p.z
    possessorDebug.ghostPos = { x: p.x, z: p.z }
    if (isPaused(useGameStore.getState().phase)) return

    // acabou o tempo: some e volta para o objeto
    if (b.fading > 0) {
      pose.fade = Math.max(0, b.fading / 0.8)
      if ((b.fading -= dt) <= 0) onDone()
      return
    }
    if ((b.life -= dt) <= 0) {
      b.fading = 0.8
      setDanger('possessor', 0)
      return
    }

    // atordoada (ferramentas): presa; o tempo dela continua correndo
    pose.stunned = b.stun > 0
    if (stunStep(b, body_, col, ctrl, dt)) return

    const player: P2 = { x: playerFeet.x, z: playerFeet.z }
    const dPlayer = dist(b.pos, player)
    const inWardrobe = useHidingStore.getState().spot?.type === 'wardrobe'
    b.cooldown -= dt
    if (!inWardrobe && dPlayer < POSSESSOR.touch && b.cooldown <= 0) {
      b.cooldown = POSSESSOR.hitCooldown
      audio.play('hit', { pos: [p.x, 1.2, p.z], volume: AUDIO.possessor, rate: 1.3 })
      usePlayerStore.getState().damage(POSSESSOR.damage)
    }

    walkResume(b, nav)
    if ((b.repath -= dt) <= 0) {
      b.repath = POSSESSOR.repath
      walkTo(b, nav, player)
    }
    // logo depois de acertar fica parada um instante (dá distância para fugir)
    const stunned = b.cooldown > POSSESSOR.hitCooldown - POSSESSOR.hitPause
    const { mx, mz } = walkSteer(b, stunned ? 0 : POSSESSOR.speed, dt)
    const look = Math.atan2(player.x - b.pos.x, player.z - b.pos.z)
    b.yaw += Math.atan2(Math.sin(look - b.yaw), Math.cos(look - b.yaw)) * Math.min(1, 8 * dt)

    b.vy = b.grounded ? -1 : Math.max(b.vy - 9.81 * dt, -20)
    ctrl.computeColliderMovement(col, { x: mx, y: b.vy * dt, z: mz })
    const m = ctrl.computedMovement()
    b.grounded = ctrl.computedGrounded()
    body_.setNextKinematicTranslation({ x: p.x + m.x, y: p.y + m.y, z: p.z + m.z })
    body_.setNextKinematicRotation(new THREE.Quaternion().setFromAxisAngle(UP, b.yaw))
    walkCheckStuck(b, nav, POSSESSOR, !stunned, dt)

    sound.current?.setPos([p.x, 1.2, p.z])
    setDanger('possessor', 0.45 + 0.45 * clamp01(1 - dPlayer / 10))
    possessorDebug.ghostState = 'chase'
    possessorDebug.ghostPos = { x: p.x, z: p.z }
  })

  const footY = -(HALF + R)
  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[spawn.x, HALF + R + 0.05, spawn.z]}>
      <CapsuleCollider ref={collider} args={[HALF, R]} collisionGroups={ENEMY_GROUPS} />
      <group position={[0, footY + POSSESSOR.hover, 0]}>
        <PossessorModel pose={pose} />
      </group>
    </RigidBody>
  )
}

/** O Possessor inteiro: efeitos do objeto carregado e a figura quando liberta. */
export function Possessor({ nav }: { nav: NavGrid }) {
  const [ghosts, setGhosts] = useState<{ uid: string; at: P2; id: number }[]>([])
  const matchId = useGameStore((s) => s.matchId)

  useEffect(() => setGhosts([]), [matchId])
  useEffect(
    () =>
      onPossessorFreed((item, at) => {
        setGhosts((g) => [...g, { uid: item.uid, at: { x: at[0], z: at[2] }, id: performance.now() }])
      }),
    [],
  )

  return (
    <>
      <Curse />
      {ghosts.map((g) => (
        <Ghost
          key={g.id}
          nav={nav}
          spawn={g.at}
          onDone={() => {
            // volta para o objeto (se ele ainda estiver por aqui)
            useItemStore.getState().repossess(g.uid)
            setGhosts((list) => list.filter((x) => x.id !== g.id))
          }}
        />
      ))}
    </>
  )
}
