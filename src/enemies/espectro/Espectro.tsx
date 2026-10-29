import { useEffect, useMemo, useRef } from 'react'
import { BallCollider, RigidBody, useBeforePhysicsStep, type RapierCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import type { LevelData, Room } from '../../game/data/types'
import type { BuiltLevel } from '../../world/buildLevel'
import { SPECTRAL_GROUPS } from '../../game/physics'
import { useGameStore } from '../../game/stores/gameStore'
import { setDanger } from '../../game/systems/danger'
import { registerCreature } from '../../game/systems/creatures'
import { audio, type LoopHandle } from '../../game/audio/engine'
import { AUDIO } from '../../game/audio/sounds'
import { playerFeet } from '../../player/playerPos'
import { usePlayerStore } from '../../player/playerStore'
import { useHidingStore } from '../../player/hidingStore'
import { leaveWardrobe } from '../../world/HidingSpots'
import { EXTERIOR_ID } from '../../game/data/levels/exterior'
import { EspectroModel } from '../models/EspectroModel'
import { newPose } from '../models/pose'
import { ESPECTRO } from './config'

/**
 * O Espectro. Não usa a grade de navegação: vai em linha reta e atravessa
 * paredes, portas e móveis (o colisor é só um sensor, para as ferramentas).
 *
 *   wander ⇄ idle  →  (jogador perto) notice  →  chase  →  (alcançou) mata
 *                                                       →  (jogador saiu da casa) wait → wander
 */

type State = 'wander' | 'idle' | 'notice' | 'chase' | 'wait'

export const espectroDebug = {
  active: false,
  state: 'off' as State | 'off',
  pos: { x: 0, z: 0 },
  tp: (_x: number, _z: number) => {},
}

const UP = new THREE.Vector3(0, 1, 0)
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export function Espectro({ level, built, spawn }: { level: LevelData; built: BuiltLevel; spawn: { x: number; z: number } }) {
  const body = useRef<RapierRigidBody>(null)
  const collider = useRef<RapierCollider>(null)
  const pose = useRef(newPose()).current
  const id = useRef(`espectro-${spawn.x}-${spawn.z}`).current

  /** Salas da casa (ela não sai para o jardim nem entra no caminhão). */
  const rooms = useMemo(() => level.rooms.filter((r) => r.id !== EXTERIOR_ID && r.kind !== 'car'), [level])
  const insideHouse = (x: number, z: number) => {
    const r = built.roomAt(x, z)
    return !!r && r.id !== EXTERIOR_ID && r.kind !== 'car'
  }
  const randomPoint = (): { x: number; z: number } => {
    const r: Room = rooms[Math.floor(Math.random() * rooms.length)]
    const [x, , z] = built.toWorld(r.x + r.w * (0.2 + Math.random() * 0.6), r.y + r.h * (0.2 + Math.random() * 0.6))
    return { x, z }
  }

  const b = useRef({
    state: 'wander' as State,
    pos: { ...spawn },
    target: null as { x: number; z: number } | null,
    timer: 0,
    yaw: 0,
    speed: 0,
    chaseSpeed: ESPECTRO.chaseSpeed,
    stun: 0,
    /** Último ponto dentro da casa (onde para quando o jogador sai). */
    edge: { ...spawn },
  }).current

  const sounds = useRef<{ hum: LoopHandle | null; chase: LoopHandle | null }>({ hum: null, chase: null })
  useEffect(() => {
    const s = sounds.current
    s.hum = audio.loop('espectroHum', { pos: [spawn.x, 1.5, spawn.z], volume: AUDIO.espectro, ref: 2.5 })
    s.chase = audio.loop('espectroChase', { volume: 0 })
    espectroDebug.active = true
    espectroDebug.tp = (x, z) => {
      b.pos = { x, z }
      b.state = 'idle'
      b.timer = 2
      body.current?.setTranslation({ x, y: ESPECTRO.hover + 0.9, z }, true)
    }
    const unregister = registerCreature({
      id,
      name: 'Espectro',
      colliderHandle: () => collider.current?.handle,
      pos: () => b.pos,
      // atordoado (crucifixo, granada): para no lugar, de boca fechada
      stun: (seconds) => {
        b.stun = Math.max(b.stun, seconds)
      },
    })
    return () => {
      s.hum?.stop()
      s.chase?.stop()
      unregister()
      espectroDebug.active = false
      espectroDebug.state = 'off'
      setDanger(id, 0)
    }
  }, [])

  const setState = (state: State, timer = 0) => {
    b.state = state
    b.timer = timer
  }

  useBeforePhysicsStep((w) => {
    const rb = body.current
    if (!rb) return
    const dt = Math.min(w.timestep, 0.05)
    const game = useGameStore.getState()
    const player = usePlayerStore.getState()
    const active = game.phase === 'hunted' || game.phase === 'blackout'
    espectroDebug.pos = { ...b.pos }
    espectroDebug.state = b.state
    if (!active) {
      setDanger(id, 0)
      sounds.current.chase?.setVolume(0, 1)
      return
    }

    const p = { x: playerFeet.x, z: playerFeet.z }
    const dx = p.x - b.pos.x
    const dz = p.z - b.pos.z
    const dist = Math.hypot(dx, dz)
    const playerInside = insideHouse(p.x, p.z)
    // renascendo ou morto: deixa o jogador em paz
    const playerAvailable = player.reviving === null && player.health > 0 && player.jumpscare === null

    let move = { x: 0, z: 0 }
    let speed = 0
    let face: number | null = null

    if (b.stun > 0) {
      b.stun -= dt
      pose.stunned = true
    } else {
      pose.stunned = false
      switch (b.state) {
        case 'wander':
        case 'idle': {
          if (playerAvailable && playerInside && dist < ESPECTRO.noticeRadius) {
            setState('notice', ESPECTRO.noticeTime)
            audio.play('espectroScream', { pos: [b.pos.x, 1.6, b.pos.z], volume: AUDIO.espectro * 0.8, rate: 1.15 })
            break
          }
          if (b.state === 'idle') {
            if ((b.timer -= dt) <= 0) {
              b.target = randomPoint()
              setState('wander')
            }
            break
          }
          b.target ??= randomPoint()
          const tx = b.target.x - b.pos.x
          const tz = b.target.z - b.pos.z
          const d = Math.hypot(tx, tz)
          if (d < 0.3) {
            b.target = null
            setState('idle', ESPECTRO.idleMin + Math.random() * (ESPECTRO.idleMax - ESPECTRO.idleMin))
          } else {
            move = { x: tx / d, z: tz / d }
            speed = ESPECTRO.speedWander
          }
          break
        }
        case 'notice':
          // para, vira para o jogador e abre a boca
          face = Math.atan2(dx, dz)
          if ((b.timer -= dt) <= 0) {
            b.chaseSpeed = ESPECTRO.chaseSpeed
            setState('chase')
          }
          break
        case 'chase': {
          if (!playerAvailable) {
            setState('idle', 2)
            break
          }
          // o jogador saiu da casa: ela para na beira e fica encarando
          if (!playerInside) {
            setState('wait', ESPECTRO.waitOutside)
            break
          }
          b.chaseSpeed = Math.min(ESPECTRO.chaseMax, b.chaseSpeed + ESPECTRO.chaseAccel * dt)
          move = dist > 0.01 ? { x: dx / dist, z: dz / dist } : move
          speed = b.chaseSpeed
          face = Math.atan2(dx, dz)
          // alcançou: não adianta se esconder
          if (dist < ESPECTRO.catchRadius) {
            if (useHidingStore.getState().wardrobeId) leaveWardrobe()
            useHidingStore.getState().reset()
            player.damage(ESPECTRO.damage, 'espectro')
            // some e volta a vagar longe dali
            let at = randomPoint()
            for (let i = 0; i < 20 && Math.hypot(at.x - p.x, at.z - p.z) < ESPECTRO.respawnMinDist; i++) at = randomPoint()
            b.pos = { ...at }
            rb.setTranslation({ x: at.x, y: ESPECTRO.hover + 0.9, z: at.z }, true)
            b.target = null
            setState('idle', 4)
          }
          break
        }
        case 'wait':
          face = Math.atan2(dx, dz)
          if (playerAvailable && playerInside) setState('chase')
          else if ((b.timer -= dt) <= 0) setState('wander')
          break
      }
    }

    // anda em linha reta (atravessa tudo), mas não sai da casa
    b.speed += (speed - b.speed) * Math.min(1, dt * 3)
    const nx = b.pos.x + move.x * b.speed * dt
    const nz = b.pos.z + move.z * b.speed * dt
    if (insideHouse(nx, nz)) {
      b.pos.x = nx
      b.pos.z = nz
      b.edge = { ...b.pos }
    } else if (b.state === 'wander') b.target = null
    // vira para onde vai, ou para o jogador
    const look = face ?? (b.speed > 0.05 ? Math.atan2(move.x, move.z) : b.yaw)
    const dy = Math.atan2(Math.sin(look - b.yaw), Math.cos(look - b.yaw))
    b.yaw += Math.sign(dy) * Math.min(Math.abs(dy), ESPECTRO.turnSpeed * dt)
    rb.setNextKinematicTranslation({ x: b.pos.x, y: ESPECTRO.hover + 0.9, z: b.pos.z })
    rb.setNextKinematicRotation(new THREE.Quaternion().setFromAxisAngle(UP, b.yaw))

    // pose: a boca abre percebendo e conforme chega perto
    pose.moving = b.speed / ESPECTRO.speedWander
    pose.mode = b.state === 'chase' ? 'chase' : b.state === 'notice' || b.state === 'wait' ? 'alert' : 'calm'
    const near = clamp01(1 - (dist - ESPECTRO.catchRadius) / (ESPECTRO.mouthFrom - ESPECTRO.catchRadius))
    const target = b.state === 'notice' ? 0.35 + 0.3 * (1 - b.timer / ESPECTRO.noticeTime) : b.state === 'chase' ? 0.3 + near * 0.7 : 0
    pose.attack += (target - pose.attack) * Math.min(1, dt * 4)

    // som: cantarola vagando; lamento perseguindo (some a voz)
    const s = sounds.current
    const chasing = b.state === 'chase' || b.state === 'notice'
    s.hum?.setPos([b.pos.x, 1.5, b.pos.z])
    s.hum?.setVolume(chasing ? 0 : AUDIO.espectro, 0.6)
    s.chase?.setVolume(chasing ? AUDIO.espectroChase : 0, chasing ? 0.3 : 2)
    setDanger(id, chasing ? 0.7 + 0.3 * clamp01(1 - dist / 10) : b.state === 'wait' ? 0.5 : 0.3 * clamp01(1 - dist / 10))
  })

  // pés em y = 0 no modelo; o corpo físico fica no meio da altura
  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[spawn.x, ESPECTRO.hover + 0.9, spawn.z]}>
      <BallCollider ref={collider} args={[0.45]} sensor collisionGroups={SPECTRAL_GROUPS} />
      <group position={[0, -0.9, 0]}>
        <EspectroModel pose={pose} />
      </group>
    </RigidBody>
  )
}
