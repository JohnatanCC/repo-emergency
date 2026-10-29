import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { CapsuleCollider, RigidBody, useBeforePhysicsStep, useRapier, type RapierCollider, type RapierRigidBody } from '@react-three/rapier'
import type { KinematicCharacterController } from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import { ENEMY_GROUPS, SIGHT_GROUPS } from '../../game/physics'
import { useGameStore } from '../../game/stores/gameStore'
import { setDanger } from '../../game/systems/danger'
import { beam } from '../../game/systems/beam'
import { audio, type LoopHandle } from '../../game/audio/engine'
import { AUDIO } from '../../game/audio/sounds'
import { playerFeet } from '../../player/playerPos'
import { usePlayerStore } from '../../player/playerStore'
import { useHidingStore } from '../../player/hidingStore'
import { FLASHLIGHT } from '../../player/config'
import type { NavGrid, P2 } from '../nav'
import { newWalkState, walkCheckStuck, walkResume, walkSteer, walkStop, walkTo } from '../walker'
import { SOMBRA } from './config'

/**
 * A Sombra. Vive nas salas escuras (no apagão, a casa inteira) e só se move
 * fora do feixe da lanterna: iluminada, congela — e a bateria gasta mais
 * rápido enquanto você a encara. Encostar nela tira muita vida; depois ela se
 * desfaz e reaparece longe.
 *
 *   hunt  → jogador dentro do território: vai direto nele
 *   lurk  → jogador numa sala clara perto: espera na beira da escuridão
 *   wander/idle → jogador longe ou escondido
 *   gone  → depois de acertar, some e reaparece longe
 */

type State = 'hunt' | 'lurk' | 'wander' | 'idle' | 'gone'

export const sombraDebug = {
  active: false,
  state: 'off' as State | 'off',
  lit: false,
  pos: { x: 0, z: 0 },
  path: [] as P2[],
  unsticks: 0,
  tp: (_x: number, _z: number) => {},
}

const R = SOMBRA.radius
const HALF = SOMBRA.height / 2 - R
const UP = new THREE.Vector3(0, 1, 0)
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const dist = (a: P2, b: P2) => Math.hypot(a.x - b.x, a.z - b.z)

export function Sombra({ nav, spawn }: { nav: NavGrid; spawn: P2 }) {
  const body = useRef<RapierRigidBody>(null)
  const collider = useRef<RapierCollider>(null)
  const controller = useRef<KinematicCharacterController>()
  const figure = useRef<THREE.Group>(null)
  const label = useRef<HTMLDivElement>(null)
  const { world, rapier } = useRapier()
  const camera = useThree((s) => s.camera)
  const gizmos = useGameStore((s) => s.debug.gizmos)

  const b = useRef({
    ...newWalkState(spawn),
    state: 'wander' as State,
    timer: 0,
    repath: 0,
    yaw: 0,
    vy: 0,
    grounded: false,
    lit: false,
    moving: false,
  }).current

  const go = (target: P2) => walkTo(b, nav, target)
  const setState = (state: State, target?: P2) => {
    b.state = state
    b.timer = 0
    if (target) go(target)
    else walkStop(b)
  }

  useEffect(() => {
    const c = world.createCharacterController(0.02)
    c.enableAutostep(0.3, 0.2, false)
    c.enableSnapToGround(0.3)
    c.setApplyImpulsesToDynamicBodies(true)
    c.setCharacterMass(SOMBRA.mass)
    controller.current = c
    return () => {
      world.removeCharacterController(c)
      controller.current = undefined
    }
  }, [world])

  const sound = useRef<LoopHandle | null>(null)
  useEffect(() => {
    sound.current = audio.loop('hiss', { pos: [spawn.x, 1.5, spawn.z], volume: 0, ref: 2 })
    sombraDebug.active = true
    sombraDebug.tp = (x, z) => {
      body.current?.setTranslation({ x, y: HALF + R + 0.05, z }, true)
      b.pos = { x, z }
      setState('idle')
      b.timer = 1
    }
    return () => {
      sound.current?.stop()
      sombraDebug.active = false
      sombraDebug.state = 'off'
      beam.onShadow = false
      setDanger('sombra', 0)
    }
  }, [])

  /** O feixe da lanterna está em cima dela? (cone + alcance + nada no meio) */
  const inBeam = () => {
    if (!beam.lit) return false
    const head = new THREE.Vector3(b.pos.x, playerFeet.y + 1.3, b.pos.z)
    const to = head.clone().sub(camera.position)
    const d = to.length()
    if (d > SOMBRA.beamRange) return false
    const fwd = new THREE.Vector3()
    camera.getWorldDirection(fwd)
    // perto, o corpo ocupa boa parte do cone: soma o "tamanho" dela ao ângulo
    const angle = fwd.angleTo(to) - Math.atan2(R, d)
    if (angle > FLASHLIGHT.angle * SOMBRA.beamCone) return false
    to.normalize()
    const hit = world.castRay(new rapier.Ray(camera.position, to), d, true, undefined, SIGHT_GROUPS)
    return !hit || hit.timeOfImpact >= d - 0.3
  }

  /** Some e reaparece longe do jogador. */
  const vanish = () => {
    setState('gone')
    b.timer = SOMBRA.vanishTime
    collider.current?.setEnabled(false)
    if (figure.current) figure.current.visible = false
  }
  const reappear = () => {
    let at: P2 | null = null
    for (let i = 0; i < 40 && !at; i++) {
      const p = nav.randomPoint()
      if (p && dist(p, playerFeet) >= SOMBRA.reappearMinDist) at = p
    }
    at ??= nav.randomPoint() ?? spawn
    body.current?.setTranslation({ x: at.x, y: HALF + R + 0.05, z: at.z }, true)
    b.pos = { ...at }
    collider.current?.setEnabled(true)
    if (figure.current) figure.current.visible = true
    setState('wander')
  }

  useBeforePhysicsStep((w) => {
    const body_ = body.current
    const col = collider.current
    const ctrl = controller.current
    if (!body_ || !col || !ctrl) return
    const dt = Math.min(w.timestep, 0.05)
    const game = useGameStore.getState()
    const active = game.phase === 'hunted' || game.phase === 'blackout'
    const p = body_.translation()
    b.pos.x = p.x
    b.pos.z = p.z
    if (!active) {
      beam.onShadow = false
      setDanger('sombra', 0)
      sound.current?.setVolume(0)
      return
    }

    if (b.state === 'gone') {
      sombraDebug.state = 'gone'
      sombraDebug.lit = false
      beam.onShadow = false
      setDanger('sombra', 0)
      sound.current?.setVolume(0)
      if ((b.timer -= dt) <= 0) reappear()
      return
    }

    // ---- luz
    b.lit = inBeam()
    beam.onShadow = b.lit

    // ---- o jogador está ao alcance? (dentro do território ou perto da beira)
    const player: P2 = { x: playerFeet.x, z: playerFeet.z }
    const dPlayer = dist(b.pos, player)
    const hidden = !!useHidingStore.getState().spot

    // encostou: dano alto e some (iluminada ou não)
    if (!hidden && dPlayer < SOMBRA.touch) {
      audio.play('hit', { pos: [p.x, 1.2, p.z], volume: AUDIO.sombra, rate: 0.7 })
      usePlayerStore.getState().damage(SOMBRA.damage)
      vanish()
      return
    }

    walkResume(b, nav)
    if ((b.repath -= dt) <= 0) {
      b.repath = SOMBRA.repath
      const inside = !hidden && nav.nearestPoint(player, 0.6)
      const edge = !hidden && !inside && nav.nearestPoint(player, SOMBRA.lurkReach)
      if (inside) {
        b.state = 'hunt'
        go(player)
      } else if (edge) {
        b.state = 'lurk'
        if (!b.target || dist(b.target, edge) > 0.5) go(edge)
      } else if (b.state === 'hunt' || b.state === 'lurk') setState('wander')
    }

    // vagar / parar
    const arrived = b.path.length === 0
    if (b.state === 'wander' && arrived) {
      if (b.target) {
        setState('idle')
        b.timer = SOMBRA.idleMin + Math.random() * (SOMBRA.idleMax - SOMBRA.idleMin)
      } else {
        const next = nav.randomPoint()
        if (next && dist(next, b.pos) > 4) go(next)
      }
    } else if (b.state === 'idle' && (b.timer -= dt) <= 0) setState('wander')

    // ---- movimento: congela no feixe
    const base =
      b.state === 'hunt' ? SOMBRA.speedHunt : b.state === 'lurk' ? SOMBRA.speedLurk : b.state === 'wander' ? SOMBRA.speedWander : 0
    const speed = b.lit ? 0 : base
    const { mx, mz } = walkSteer(b, speed, dt)
    b.moving = mx !== 0 || mz !== 0

    const look =
      b.state === 'hunt' || b.state === 'lurk' || b.lit
        ? Math.atan2(player.x - b.pos.x, player.z - b.pos.z)
        : b.moving
          ? Math.atan2(mx, mz)
          : b.yaw
    const dy = Math.atan2(Math.sin(look - b.yaw), Math.cos(look - b.yaw))
    if (!b.lit) b.yaw += Math.sign(dy) * Math.min(Math.abs(dy), SOMBRA.turnSpeed * dt)

    b.vy = b.grounded ? -1 : Math.max(b.vy - 9.81 * dt, -20)
    ctrl.computeColliderMovement(col, { x: mx, y: b.vy * dt, z: mz })
    const m = ctrl.computedMovement()
    b.grounded = ctrl.computedGrounded()
    body_.setNextKinematicTranslation({ x: p.x + m.x, y: p.y + m.y, z: p.z + m.z })
    body_.setNextKinematicRotation(new THREE.Quaternion().setFromAxisAngle(UP, b.yaw))

    if (walkCheckStuck(b, nav, SOMBRA, speed > 0, dt, () => sombraDebug.unsticks++) === 'giveup') setState('wander')

    // respiração só quando se move
    sound.current?.setPos([p.x, 1.5, p.z])
    sound.current?.setVolume(b.moving ? AUDIO.sombra * (b.state === 'hunt' ? 1 : 0.6) : 0, 0.15)

    setDanger(
      'sombra',
      b.state === 'hunt'
        ? 0.5 + 0.5 * clamp01(1 - dPlayer / 10)
        : b.state === 'lurk'
          ? 0.3 * clamp01(1 - dPlayer / 12)
          : 0.2 * clamp01(1 - dPlayer / 12),
    )

    sombraDebug.state = b.state
    sombraDebug.lit = b.lit
    sombraDebug.pos = { x: p.x, z: p.z }
    sombraDebug.path = b.path
  })

  const black = useMemo(() => new THREE.MeshBasicMaterial({ color: '#000000' }), [])
  const eyes = useMemo(() => new THREE.MeshBasicMaterial({ color: '#8f8a80' }), [])

  // iluminada: olhos acendem e o corpo treme parado
  useFrame(({ clock }) => {
    const f = figure.current
    if (!f) return
    const t = clock.elapsedTime
    f.position.x = b.lit ? Math.sin(t * 60) * 0.008 : 0
    f.rotation.z = b.lit ? 0 : Math.sin(t * 1.7) * 0.04
    eyes.color.set(b.lit ? '#ffffff' : '#8f8a80')
    if (label.current) label.current.textContent = `Sombra · ${b.state}${b.lit ? ' · NA LUZ' : ''}`
  })

  const footY = -(HALF + R)
  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[spawn.x, HALF + R + 0.05, spawn.z]}>
      <CapsuleCollider ref={collider} args={[HALF, R]} collisionGroups={ENEMY_GROUPS} />
      <group ref={figure}>
        {/* corpo: preto puro (não reflete luz nem no feixe), magro e alongado */}
        <mesh position={[0, footY + 0.75, 0]} material={black}>
          <cylinderGeometry args={[0.16, 0.07, 1.5, 8]} />
        </mesh>
        <mesh position={[0, footY + 1.5, 0]} material={black}>
          <cylinderGeometry args={[0.2, 0.15, 0.45, 8]} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.25, footY + 1.15, 0.05]} rotation={[0.15, 0, side * 0.12]} material={black}>
            <cylinderGeometry args={[0.035, 0.015, 1.05, 5]} />
          </mesh>
        ))}
        <group position={[0, footY + 1.82, 0.02]}>
          <mesh material={black} scale={[1, 1.25, 1]}>
            <sphereGeometry args={[0.12, 10, 8]} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.04, 0.02, 0.105]} material={eyes}>
              <sphereGeometry args={[0.013, 6, 4]} />
            </mesh>
          ))}
        </group>
      </group>
      {gizmos && (
        <Html position={[0, HALF + R + 0.3, 0]} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
          <div ref={label} style={{ color: '#b99aff', fontSize: 14, whiteSpace: 'nowrap', textShadow: '0 0 3px #000' }} />
        </Html>
      )}
    </RigidBody>
  )
}
