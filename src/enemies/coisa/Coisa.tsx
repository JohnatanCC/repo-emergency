import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { CapsuleCollider, RigidBody, useBeforePhysicsStep, useRapier, type RapierCollider, type RapierRigidBody } from '@react-three/rapier'
import type { KinematicCharacterController } from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import { ENEMY_GROUPS } from '../../game/physics'
import { isPaused, useGameStore } from '../../game/stores/gameStore'
import { audio } from '../../game/audio/engine'
import { AUDIO } from '../../game/audio/sounds'
import { playerFeet } from '../../player/playerPos'
import { useItemStore } from '../../items/itemStore'
import { HEAD } from '../../items/catalog'
import type { NavGrid, P2 } from '../nav'
import { newWalkState, walkCheckStuck, walkResume, walkSteer, walkStop, walkTo } from '../walker'
import { COISA } from './config'

/**
 * A COISA. Surge onde o investigador morreu, segurando a cabeça dele. É
 * pacífica: ronda o lugar e foge quando o jogador chega perto (mais rápido
 * quando ele corre). Alcançada, solta a cabeça e se desfaz; levar a cabeça
 * ao carro devolve a vida perdida (LevelFlow).
 */

export const coisaDebug = { list: [] as { id: string; state: string; x: number; z: number }[] }

const R = COISA.radius
const HALF = COISA.height / 2 - R
const UP = new THREE.Vector3(0, 1, 0)
const dist = (a: P2, b: P2) => Math.hypot(a.x - b.x, a.z - b.z)

function Coisa({ id, nav, spawn, onCaught }: { id: string; nav: NavGrid; spawn: P2; onCaught: (at: P2) => void }) {
  const body = useRef<RapierRigidBody>(null)
  const collider = useRef<RapierCollider>(null)
  const controller = useRef<KinematicCharacterController>()
  const figure = useRef<THREE.Group>(null)
  const label = useRef<HTMLDivElement>(null)
  const { world } = useRapier()
  const gizmos = useGameStore((s) => s.debug.gizmos)
  const b = useRef({
    ...newWalkState(spawn),
    state: 'idle' as 'wander' | 'idle' | 'flee',
    timer: 1,
    repath: 0,
    yaw: 0,
    vy: 0,
    grounded: false,
    caught: false,
    stepTimer: 0,
    /** Para medir a velocidade do jogador. */
    lastPlayer: { x: playerFeet.x, z: playerFeet.z },
    playerSpeed: 0,
  }).current

  useEffect(() => {
    const c = world.createCharacterController(0.02)
    c.enableAutostep(0.3, 0.2, false)
    c.enableSnapToGround(0.3)
    c.setApplyImpulsesToDynamicBodies(true)
    c.setCharacterMass(COISA.mass)
    controller.current = c
    return () => {
      world.removeCharacterController(c)
      controller.current = undefined
    }
  }, [world])

  useEffect(() => {
    coisaDebug.list.push({ id, state: 'wander', x: spawn.x, z: spawn.z })
    return () => {
      coisaDebug.list = coisaDebug.list.filter((c) => c.id !== id)
    }
  }, [id])

  /** Ponto alcançável perto que fica mais longe do jogador. */
  const fleeTarget = (player: P2): P2 | null => {
    let best: P2 | null = null
    let bestScore = -Infinity
    for (let i = 0; i < COISA.fleeCandidates; i++) {
      const p = nav.randomPoint({ x: b.pos.x, z: b.pos.z, radius: COISA.fleeSearch })
      if (!p) continue
      // longe do jogador e sem precisar passar por ele
      const score = dist(p, player) - 0.5 * dist(p, b.pos) * (dist(p, player) < dist(b.pos, player) ? 2 : 0)
      if (score > bestScore) {
        bestScore = score
        best = p
      }
    }
    return best
  }

  useBeforePhysicsStep((w) => {
    const body_ = body.current
    const col = collider.current
    const ctrl = controller.current
    if (!body_ || !col || !ctrl || b.caught) return
    const dt = Math.min(w.timestep, 0.05)
    const p = body_.translation()
    b.pos.x = p.x
    b.pos.z = p.z
    if (isPaused(useGameStore.getState().phase)) return

    const player: P2 = { x: playerFeet.x, z: playerFeet.z }
    // velocidade do jogador (suavizada): correndo, ela corre também
    const ps = dist(player, b.lastPlayer) / Math.max(dt, 1e-3)
    b.lastPlayer = player
    b.playerSpeed += (Math.min(ps, 10) - b.playerSpeed) * Math.min(1, 6 * dt)
    const dPlayer = dist(b.pos, player)

    // alcançada: solta a cabeça e se desfaz
    if (dPlayer < COISA.catchRadius) {
      b.caught = true
      audio.play('whoosh', { pos: [p.x, 1, p.z], volume: AUDIO.possessor * 0.6, rate: 1.8 })
      onCaught({ x: p.x, z: p.z })
      return
    }

    walkResume(b, nav)
    if (dPlayer < COISA.fleeRadius) {
      if (b.state !== 'flee' || (b.repath -= dt) <= 0 || b.path.length === 0) {
        b.repath = COISA.repath
        const t = fleeTarget(player)
        if (t) walkTo(b, nav, t)
        b.state = 'flee'
      }
    } else if (b.state === 'flee') {
      b.state = 'idle'
      b.timer = 1
      walkStop(b)
    } else if (b.state === 'idle') {
      // parada um pouco; depois ronda perto de onde nasceu
      if ((b.timer -= dt) <= 0) {
        const t = nav.randomPoint({ x: spawn.x, z: spawn.z, radius: COISA.wanderRadius })
        if (t) walkTo(b, nav, t)
        b.state = 'wander'
      }
    } else if (b.path.length === 0) {
      b.state = 'idle'
      b.timer = 1.5 + Math.random() * 2
    }

    const speed =
      b.state === 'flee'
        ? b.playerSpeed > COISA.playerRunning
          ? COISA.speedFleeRun
          : COISA.speedFlee
        : b.state === 'wander'
          ? COISA.speedWander
          : 0
    const { mx, mz } = walkSteer(b, speed, dt)

    const look = b.state === 'flee' ? Math.atan2(mx, mz) || b.yaw : Math.atan2(player.x - b.pos.x, player.z - b.pos.z)
    b.yaw += Math.atan2(Math.sin(look - b.yaw), Math.cos(look - b.yaw)) * Math.min(1, 8 * dt)

    b.vy = b.grounded ? -1 : Math.max(b.vy - 9.81 * dt, -20)
    ctrl.computeColliderMovement(col, { x: mx, y: b.vy * dt, z: mz })
    const m = ctrl.computedMovement()
    b.grounded = ctrl.computedGrounded()
    body_.setNextKinematicTranslation({ x: p.x + m.x, y: p.y + m.y, z: p.z + m.z })
    body_.setNextKinematicRotation(new THREE.Quaternion().setFromAxisAngle(UP, b.yaw))
    if (walkCheckStuck(b, nav, COISA, mx !== 0 || mz !== 0, dt) === 'giveup') walkStop(b)

    // passinhos apressados quando foge
    if (b.state === 'flee' && (mx || mz) && (b.stepTimer -= dt) <= 0) {
      b.stepTimer = 0.22
      audio.play('step-wood', { pos: [p.x, 0.1, p.z], volume: 0.35, rate: 1.6 + Math.random() * 0.2 })
    }

    const entry = coisaDebug.list.find((c) => c.id === id)
    if (entry) Object.assign(entry, { state: b.state, x: p.x, z: p.z })
  })

  // espírito negro: não reflete luz (nem a lanterna), levemente translúcido como fumaça
  const smoke = useMemo(() => new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.9 }), [])
  const skin = useMemo(() => new THREE.MeshStandardMaterial({ color: HEAD.color, roughness: 0.9 }), [])
  const hair = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a1c12', roughness: 1 }), [])

  // corpo enfumaçado oscilando
  useFrame(({ clock }) => {
    const f = figure.current
    if (!f) return
    const t = clock.elapsedTime
    smoke.opacity = 0.8 + 0.12 * Math.sin(t * 7)
    f.rotation.x = 0.35 + Math.sin(t * 3) * 0.05
    f.position.y = Math.abs(Math.sin(t * (b.state === 'flee' ? 14 : 4))) * 0.04
    if (label.current) label.current.textContent = `A COISA · ${b.state}`
  })

  const footY = -(HALF + R)
  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[spawn.x, HALF + R + 0.05, spawn.z]}>
      <CapsuleCollider ref={collider} args={[HALF, R]} collisionGroups={ENEMY_GROUPS} />
      {/* curvada para a frente, segurando a cabeça junto ao peito */}
      <group ref={figure}>
        <group position={[0, footY, 0]}>
          <mesh position={[0, 0.5, 0]} material={smoke} castShadow>
            <coneGeometry args={[0.32, 1, 9, 1, true]} />
          </mesh>
          <mesh position={[0, 0.95, 0.06]} material={smoke} castShadow>
            <sphereGeometry args={[0.22, 10, 8]} />
          </mesh>
          <mesh position={[0, 1.18, 0.14]} material={smoke}>
            <sphereGeometry args={[0.12, 8, 6]} />
          </mesh>
          {/* braços em volta da cabeça */}
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.16, 0.85, 0.22]} rotation={[1.3, 0, side * -0.5]} material={smoke}>
              <cylinderGeometry args={[0.035, 0.025, 0.4, 5]} />
            </mesh>
          ))}
          {/* a cabeça do investigador */}
          <group position={[0, 0.82, 0.3]} rotation={[0.3, 0.4, 0.2]}>
            <mesh material={skin} castShadow>
              <sphereGeometry args={[HEAD.dims[0], 12, 10]} />
            </mesh>
            <mesh position={[0, 0.03, -0.02]} scale={[1.08, 1.05, 1.08]} material={hair}>
              <sphereGeometry args={[HEAD.dims[0], 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            </mesh>
          </group>
        </group>
      </group>
      {gizmos && (
        <Html position={[0, HALF + R + 0.3, 0]} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
          <div ref={label} style={{ color: '#e8e8e8', fontSize: 14, whiteSpace: 'nowrap', textShadow: '0 0 3px #000' }} />
        </Html>
      )}
    </RigidBody>
  )
}

/**
 * Uma COISA por morte (gameStore.deathSpots). Alcançada, vira a cabeça como
 * item no chão. Partida nova (contrato ou recomeço) limpa tudo.
 */
export function Coisas({ nav }: { nav: NavGrid }) {
  const deathSpots = useGameStore((s) => s.deathSpots)
  const matchId = useGameStore((s) => s.matchId)
  const phase = useGameStore((s) => s.phase)
  const [caught, setCaught] = useState<Set<number>>(new Set())

  useEffect(() => setCaught(new Set()), [matchId])

  if (phase === 'gameover') return null
  return (
    <>
      {deathSpots.map((spot, i) => {
        if (caught.has(i)) return null
        const id = `${matchId}-${i}`
        return (
          <Coisa
            key={id}
            id={id}
            nav={nav}
            spawn={{ x: spot[0], z: spot[2] }}
            onCaught={(at) => {
              useItemStore.getState().spawnItem(HEAD, `cabeca-${id}`, [at.x, 0.9, at.z])
              setCaught((s) => new Set(s).add(i))
            }}
          />
        )
      })}
    </>
  )
}
