import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { CapsuleCollider, RigidBody, useBeforePhysicsStep, useRapier, type RapierCollider, type RapierRigidBody } from '@react-three/rapier'
import type { KinematicCharacterController } from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import type { LevelData } from '../../game/data/types'
import type { BuiltLevel } from '../../world/buildLevel'
import { ENEMY_GROUPS, SIGHT_GROUPS } from '../../game/physics'
import { useGameStore } from '../../game/stores/gameStore'
import { onNoise } from '../../game/systems/noise'
import { setDanger } from '../../game/systems/danger'
import { beam } from '../../game/systems/beam'
import { audio, type LoopHandle } from '../../game/audio/engine'
import { AUDIO } from '../../game/audio/sounds'
import { playerFeet } from '../../player/playerPos'
import { usePlayerStore } from '../../player/playerStore'
import { onHide, useHidingStore } from '../../player/hidingStore'
import { isCarried, onFirstTaken, useItemStore } from '../../items/itemStore'
import { leaveWardrobe, wardrobes } from '../../world/HidingSpots'
import type { NavGrid, P2 } from '../nav'
import { applyStun, stunFields, stunStep } from '../stun'
import { registerCreature } from '../../game/systems/creatures'
import { newWalkState, walkCheckStuck, walkResume, walkSteer, walkStop, walkTo } from '../walker'
import { GUARDIA } from './config'

/**
 * A Guardiã. Patrulha a casa, vai atrás de barulhos, persegue quando vê o
 * investigador e ataca de perto. Sabe de onde saiu cada relíquia: quando uma é
 * pega, vai até lá e segue o rastro. Se viu o jogador se esconder, marca o
 * esconderijo e vai direto nele.
 *
 *   patrol → idle → patrol …
 *   (barulho / relíquia) → investigate → search → patrol
 *   (vê) → chase → (perde) → investigate último ponto / checkHiding → search
 *   (encosta) → ataque → recover → chase / search
 */

type State = 'patrol' | 'idle' | 'investigate' | 'chase' | 'search' | 'checkHiding' | 'recover'

/** Estado para o debug (marcadores G e window.__relicario.guardia). */
export const guardiaDebug = {
  active: false,
  state: 'off' as State | 'off',
  seeing: false,
  /** Por que viu / não viu na última checagem. */
  sight: '',
  pos: { x: 0, z: 0 },
  path: [] as P2[],
  /** Quantas vezes precisou se destravar (portas, desvios, desistências). */
  unsticks: 0,
  /** Teste: teleporta / manda investigar um ponto. */
  tp: (_x: number, _z: number) => {},
  goTo: (_x: number, _z: number) => {},
}

const R = GUARDIA.radius
const HALF = GUARDIA.height / 2 - R
const HEAD_Y = 1.9
const UP = new THREE.Vector3(0, 1, 0)
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const dist = (a: P2, b: P2) => Math.hypot(a.x - b.x, a.z - b.z)

export function Guardia({
  level,
  built,
  nav,
  spawn,
  hunting,
}: {
  level: LevelData
  built: BuiltLevel
  nav: NavGrid
  spawn: P2
  /** Começa já indo atrás do jogador (apagão). */
  hunting?: boolean
}) {
  const body = useRef<RapierRigidBody>(null)
  const collider = useRef<RapierCollider>(null)
  const controller = useRef<KinematicCharacterController>()
  const figure = useRef<THREE.Group>(null)
  const label = useRef<HTMLDivElement>(null)
  const pathLine = useRef<THREE.Line>(null)
  const { world, rapier } = useRapier()
  const gizmos = useGameStore((s) => s.debug.gizmos)
  const respawnId = usePlayerStore((s) => s.respawnId)
  const firstRespawnId = useRef(respawnId)

  const b = useRef({
    // caminho, destino e destravamento (walker.ts)
    ...newWalkState(spawn),
    ...stunFields(),
    state: 'patrol' as State,
    timer: 0,
    now: 0,
    yaw: 0,
    vy: 0,
    grounded: false,
    seeing: false,
    sightTimer: 0,
    lastSeen: null as P2 | null,
    lastSeenAt: -1e9,
    alertedAt: -1e9,
    repath: 0,
    lastPos: { x: spawn.x, z: spawn.z },
    hideSpot: null as string | null,
    /** Chegou na origem da relíquia: depois segue o rastro até o jogador. */
    trail: false,
    stepTimer: 0,
    cooldown: 0,
  }).current

  /** Onde ficar para checar cada esconderijo. */
  const approach = useMemo(() => {
    const props = new Map(level.props.map((p) => [p.id, p]))
    const map = new Map<string, P2>()
    for (const h of level.hidingSpots) {
      const w = wardrobes.get(h.id)
      if (w) map.set(h.id, { x: w.exit[0], z: w.exit[2] })
      else {
        const p = props.get(h.propId)
        if (p) {
          const [x, , z] = built.toWorld(p.x, p.y)
          map.set(h.id, { x, z })
        }
      }
    }
    return map
  }, [level, built])

  const go = (target: P2) => walkTo(b, nav, target)
  const setState = (state: State, target?: P2) => {
    b.state = state
    b.timer = 0
    if (target) go(target)
    else walkStop(b)
  }
  const investigate = (p: P2) => setState('investigate', p)
  const search = (around: P2) => {
    setState('search')
    b.target = around
    b.timer = GUARDIA.searchTime
  }

  useEffect(() => {
    const c = world.createCharacterController(0.02)
    c.enableAutostep(0.3, 0.2, false)
    c.enableSnapToGround(0.3)
    c.setApplyImpulsesToDynamicBodies(true)
    c.setCharacterMass(GUARDIA.mass)
    controller.current = c
    return () => {
      world.removeCharacterController(c)
      controller.current = undefined
    }
  }, [world])

  // sons presos a ela
  const sounds = useRef<{ whisper: LoopHandle | null }>({ whisper: null })
  useEffect(() => {
    const s = sounds.current
    s.whisper = audio.loop('whisper', { pos: [spawn.x, HEAD_Y, spawn.z], volume: AUDIO.guardia * 0.55, ref: 2.5 })
    guardiaDebug.active = true
    const unregister = registerCreature({
      id: `guardia-${spawn.x}-${spawn.z}`,
      name: 'Guardiã',
      colliderHandle: () => collider.current?.handle,
      pos: () => b.pos,
      stun: (seconds, knock) => applyStun(b, seconds, knock),
    })
    guardiaDebug.tp = (x, z) => {
      body.current?.setTranslation({ x, y: HALF + R + 0.05, z }, true)
      b.pos = { x, z }
      b.lastPos = { x, z }
      setState('idle')
      b.timer = 999
    }
    guardiaDebug.goTo = (x, z) => investigate({ x, z })
    if (hunting) investigate({ ...playerFeet })
    return () => {
      s.whisper?.stop()
      unregister()
      guardiaDebug.active = false
      guardiaDebug.state = 'off'
      setDanger('guardia', 0)
    }
  }, [])

  // jogador morreu e voltou ao carro: ela esquece e volta a patrulhar
  useEffect(() => {
    // só reage a mortes que acontecem com ela já em cena
    if (respawnId === firstRespawnId.current) return
    b.lastSeen = null
    b.seeing = false
    setState('patrol')
  }, [respawnId])

  // ouve barulhos
  useEffect(
    () =>
      onNoise((n) => {
        if (b.state === 'chase' || b.state === 'recover' || b.state === 'checkHiding') return
        const d = Math.hypot(n.pos[0] - b.pos.x, n.pos[2] - b.pos.z)
        // barulho colado nela (ex.: a porta que ela mesma empurrou) não a desvia
        if (d > GUARDIA.ignoreNoiseWithin && d <= n.radius * GUARDIA.hearingBonus) investigate({ x: n.pos[0], z: n.pos[2] })
      }),
    [],
  )

  // sabe de onde saiu cada relíquia
  useEffect(
    () =>
      onFirstTaken((item) => {
        if (item.def.tag !== 'relic' || b.state === 'chase') return
        investigate({ x: item.origin[0], z: item.origin[2] })
        b.trail = true
      }),
    [],
  )

  // viu o jogador entrar no esconderijo: marca
  useEffect(
    () =>
      onHide((spot) => {
        if (b.seeing || b.now - b.lastSeenAt < 0.6) useHidingStore.getState().mark(spot.id)
      }),
    [b],
  )

  /** Consegue ver o jogador agora? */
  const canSee = () => {
    const hiding = useHidingStore.getState().spot
    if (hiding?.type === 'wardrobe') return (guardiaDebug.sight = 'armário'), false
    const player = usePlayerStore.getState()
    const chestY = playerFeet.y + (player.crouching ? 0.45 : 1.2)
    const d = Math.hypot(playerFeet.x - b.pos.x, playerFeet.z - b.pos.z)

    let range: number = GUARDIA.sightLit
    // lanterna acesa de verdade (ligada e com bateria) entrega o jogador
    if (beam.lit) range = GUARDIA.sightFlashlight
    else {
      const light = built.roomAt(playerFeet.x, playerFeet.z)?.light ?? 'dark'
      range = light === 'lit' ? GUARDIA.sightLit : light === 'dark' ? GUARDIA.sightDark : GUARDIA.sightDim
    }
    if (player.crouching) range *= GUARDIA.sightCrouch
    if (hiding?.type === 'under-table') range = GUARDIA.sightUnderTable
    if (hiding?.type === 'under-chair') range *= hiding.cover
    if (d > range) return (guardiaDebug.sight = `longe ${d.toFixed(1)}>${range.toFixed(1)}`), false

    // dentro do cone (bem de perto ela "sente" mesmo de costas)
    if (d > 1.5) {
      const ang = Math.atan2(playerFeet.x - b.pos.x, playerFeet.z - b.pos.z)
      const diff = Math.abs(Math.atan2(Math.sin(ang - b.yaw), Math.cos(ang - b.yaw)))
      if (diff > ((GUARDIA.fov / 2) * Math.PI) / 180)
        return (guardiaDebug.sight = `fora do cone ${((diff * 180) / Math.PI).toFixed(0)}°`), false
    }

    // linha de visão: paredes, móveis e portas bloqueiam
    const from = { x: b.pos.x, y: playerFeet.y + HEAD_Y, z: b.pos.z }
    const to = new THREE.Vector3(playerFeet.x - from.x, chestY - from.y, playerFeet.z - from.z)
    const len = to.length()
    to.normalize()
    const hit = world.castRay(new rapier.Ray(from, to), len, true, undefined, SIGHT_GROUPS)
    const clear = !hit || hit.timeOfImpact >= len - 0.25
    guardiaDebug.sight = clear ? `vê ${d.toFixed(1)}` : `bloqueado em ${hit!.timeOfImpact.toFixed(1)}/${len.toFixed(1)}`
    return clear
  }

  const strike = () => {
    const pos: [number, number, number] = [b.pos.x, 1.4, b.pos.z]
    audio.play('hit', { pos, volume: AUDIO.guardia })
    usePlayerStore.getState().damage(GUARDIA.damage)
    b.cooldown = GUARDIA.recover
    setState('recover')
    b.timer = GUARDIA.recover
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
    guardiaDebug.pos = { x: p.x, z: p.z }
    if (!active) {
      setDanger('guardia', 0)
      return
    }
    b.now += dt
    b.cooldown -= dt

    // atordoada (ferramentas): presa no lugar
    if (stunStep(b, body_, col, ctrl, dt)) {
      setDanger('guardia', 0.2)
      return
    }

    // ---- sentidos
    if ((b.sightTimer -= dt) <= 0) {
      b.sightTimer = GUARDIA.sightEvery
      b.seeing = canSee()
    }
    const player: P2 = { x: playerFeet.x, z: playerFeet.z }
    if (b.seeing) {
      b.lastSeen = player
      b.lastSeenAt = b.now
      if (b.state !== 'chase' && b.state !== 'recover') {
        if (b.now - b.alertedAt > 8) audio.play('shriek', { pos: [p.x, HEAD_Y, p.z], volume: AUDIO.guardia })
        b.alertedAt = b.now
        setState('chase', player)
      }
    }
    const dPlayer = dist(b.pos, player)

    // terminou o desvio: retoma o destino antes de decidir qualquer coisa
    walkResume(b, nav)

    // ---- decisões
    const arrived = b.path.length === 0
    switch (b.state) {
      case 'patrol':
        if (arrived) {
          if (b.target) {
            // chegou (ou não deu para chegar): para um pouco e depois escolhe outro ponto
            setState('idle')
            b.timer = GUARDIA.idleMin + Math.random() * (GUARDIA.idleMax - GUARDIA.idleMin)
          } else {
            const next = nav.randomPoint()
            if (next && dist(next, b.pos) > 5) go(next)
          }
        }
        break
      case 'idle':
        if ((b.timer -= dt) <= 0) setState('patrol')
        break
      case 'investigate':
        if (arrived) {
          if (b.trail) {
            // achou a origem da relíquia: segue o rastro até onde o jogador está
            b.trail = false
            investigate(player)
          } else search(b.target ?? b.pos)
        }
        break
      case 'chase':
        if (b.seeing) {
          if ((b.repath -= dt) <= 0) {
            b.repath = GUARDIA.chaseRepath
            go(player)
          }
          if (dPlayer < GUARDIA.reach && b.cooldown <= 0) strike()
        } else if (b.now - b.lastSeenAt > 0.4) {
          // perdeu de vista: viu entrar num esconderijo perto? vai direto nele
          const hide = useHidingStore.getState()
          const spot = hide.spot
          const at = spot ? approach.get(spot.id) : undefined
          if (spot && at && hide.isMarked(spot.id) && b.lastSeen && dist(at, b.lastSeen) < GUARDIA.markedReach) {
            b.hideSpot = spot.id
            setState('checkHiding', at)
          } else investigate(b.lastSeen ?? player)
        }
        break
      case 'checkHiding':
        if (arrived) {
          const spot = useHidingStore.getState().spot
          if (spot && spot.id === b.hideSpot) {
            // achou: puxa para fora e ataca
            if (spot.type === 'wardrobe') leaveWardrobe()
            strike()
          } else search(b.pos)
          b.hideSpot = null
        }
        break
      case 'search':
        if ((b.timer -= dt) <= 0) setState('patrol')
        else if (arrived && b.target) {
          const next = nav.randomPoint({ x: b.target.x, z: b.target.z, radius: GUARDIA.searchRadius })
          if (next) b.path = nav.findPath(b.pos, next)
        }
        break
      case 'recover':
        if ((b.timer -= dt) <= 0) {
          if (b.seeing) setState('chase', player)
          else search(b.lastSeen ?? b.pos)
        }
        break
    }

    // ---- movimento
    const relics = Object.values(useItemStore.getState().items).filter((it) => it.def.tag === 'relic' && isCarried(it)).length
    const base =
      b.state === 'chase'
        ? GUARDIA.speedChase
        : b.state === 'investigate' || b.state === 'checkHiding'
          ? GUARDIA.speedInvestigate
          : GUARDIA.speedPatrol
    const speed = b.state === 'idle' || b.state === 'recover' ? 0 : base + (b.state === 'patrol' ? 0 : relics * GUARDIA.speedPerRelic)

    let { mx, mz } = walkSteer(b, speed, dt)
    // depois do golpe recua devagar, de frente para o jogador: janela para fugir
    if (b.state === 'recover' && dPlayer > 0.01 && dPlayer < GUARDIA.backOffDistance) {
      mx = ((b.pos.x - player.x) / dPlayer) * GUARDIA.backOffSpeed * dt
      mz = ((b.pos.z - player.z) / dPlayer) * GUARDIA.backOffSpeed * dt
      if (!nav.isWalkable(b.pos.x + mx * 10, b.pos.z + mz * 10)) mx = mz = 0
    }
    // vira para onde anda (ou para o jogador quando o vê de perto)
    const look =
      (b.seeing && dPlayer < 4) || b.state === 'recover'
        ? Math.atan2(player.x - b.pos.x, player.z - b.pos.z)
        : mx || mz
          ? Math.atan2(mx, mz)
          : b.yaw
    const dy = Math.atan2(Math.sin(look - b.yaw), Math.cos(look - b.yaw))
    b.yaw += Math.sign(dy) * Math.min(Math.abs(dy), GUARDIA.turnSpeed * dt)

    b.vy = b.grounded ? -1 : Math.max(b.vy - 9.81 * dt, -20)
    ctrl.computeColliderMovement(col, { x: mx, y: b.vy * dt, z: mz })
    const m = ctrl.computedMovement()
    b.grounded = ctrl.computedGrounded()
    body_.setNextKinematicTranslation({ x: p.x + m.x, y: p.y + m.y, z: p.z + m.z })
    body_.setNextKinematicRotation(new THREE.Quaternion().setFromAxisAngle(UP, b.yaw))

    const moved = Math.hypot(p.x - b.lastPos.x, p.z - b.lastPos.z)
    b.lastPos.x = p.x
    b.lastPos.z = p.z

    // travou: destrava em etapas (walker.ts); se esgotou, na perseguição recalcula, fora dela outro destino
    if (walkCheckStuck(b, nav, GUARDIA, speed > 0 && b.state !== 'recover', dt, () => guardiaDebug.unsticks++) === 'giveup') {
      if (b.state === 'chase') b.path = b.target ? nav.findPath(b.pos, b.target) : []
      else if (b.state === 'search') b.path = []
      else setState('patrol')
    }

    // passos arrastados e sussurro acompanhando
    if (moved > 0.001 && (b.stepTimer -= dt * (speed / GUARDIA.speedPatrol)) <= 0) {
      b.stepTimer = GUARDIA.stepEvery
      audio.play('shuffle', { pos: [p.x, 0.1, p.z], volume: AUDIO.guardia * 0.8, rate: 0.85 + Math.random() * 0.2 })
    }
    const s = sounds.current
    s.whisper?.setPos([p.x, HEAD_Y, p.z])
    s.whisper?.setRate(b.state === 'chase' ? 1.35 : 1)

    // perigo (batimento cardíaco)
    setDanger(
      'guardia',
      b.state === 'chase' ? 0.6 + 0.4 * clamp01(1 - dPlayer / 12) : clamp01(1 - dPlayer / 16) * (b.state === 'investigate' ? 0.55 : 0.35),
    )

    guardiaDebug.state = b.state
    guardiaDebug.seeing = b.seeing
    guardiaDebug.pos = { x: p.x, z: p.z }
    guardiaDebug.path = b.path
  })

  // aparência: balanço, olhos acendem na perseguição, debug
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const f = figure.current
    if (f) {
      f.position.y = Math.sin(t * 1.3) * 0.02
      f.rotation.z = b.stun > 0 ? Math.sin(t * 45) * 0.08 : Math.sin(t * 0.7) * 0.03
    }
    eyes.color.set(b.state === 'chase' ? '#ff3020' : b.state === 'investigate' ? '#a05030' : '#3a2a20')
    if (label.current) label.current.textContent = `Guardiã · ${b.state}${b.seeing ? ' · VENDO' : ''}`
    const line = pathLine.current
    if (line) {
      const pts = [new THREE.Vector3(b.pos.x, 0.1, b.pos.z), ...b.path.map((q) => new THREE.Vector3(q.x, 0.1, q.z))]
      line.geometry.setFromPoints(pts)
      line.visible = gizmos
    }
  })

  const dress = useMemo(() => new THREE.MeshStandardMaterial({ color: '#070509', roughness: 1, side: THREE.DoubleSide }), [])
  const skin = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8f887d', roughness: 0.95 }), [])
  const eyes = useMemo(() => new THREE.MeshBasicMaterial({ color: '#3a2a20' }), [])
  const lineObj = useMemo(() => new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#d23a3a' })), [])

  // pés em y = 0; o corpo físico tem o centro na metade da altura
  const footY = -(HALF + R)
  return (
    <>
      <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[spawn.x, HALF + R + 0.05, spawn.z]}>
        <CapsuleCollider ref={collider} args={[HALF, R]} collisionGroups={ENEMY_GROUPS} />
        <group ref={figure}>
          {/* vestido longo */}
          <mesh position={[0, footY + 0.8, 0]} material={dress} castShadow>
            <coneGeometry args={[0.45, 1.6, 12, 1, true]} />
          </mesh>
          {/* tronco estreito */}
          <mesh position={[0, footY + 1.62, 0]} material={dress} castShadow>
            <cylinderGeometry args={[0.15, 0.2, 0.5, 10]} />
          </mesh>
          {/* braços compridos caídos */}
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.24, footY + 1.4, 0.02]} rotation={[0.05, 0, side * 0.06]} material={skin} castShadow>
              <cylinderGeometry args={[0.03, 0.025, 0.85, 6]} />
            </mesh>
          ))}
          {/* cabeça um pouco caída para a frente, com véu escuro */}
          <group position={[0, footY + HEAD_Y + 0.05, 0.03]} rotation={[0.35, 0, 0]}>
            <mesh material={skin} castShadow>
              <sphereGeometry args={[0.13, 12, 10]} />
            </mesh>
            <mesh position={[0, 0.03, -0.03]} scale={[1.12, 1.15, 1.1]} material={dress}>
              <sphereGeometry args={[0.13, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
            </mesh>
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * 0.045, 0.01, 0.115]} material={eyes}>
                <sphereGeometry args={[0.018, 6, 4]} />
              </mesh>
            ))}
          </group>
        </group>
        {gizmos && (
          <Html position={[0, HALF + R + 0.4, 0]} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
            <div ref={label} style={{ color: '#ff6a5a', fontSize: 14, whiteSpace: 'nowrap', textShadow: '0 0 3px #000' }} />
          </Html>
        )}
      </RigidBody>
      <primitive object={lineObj} ref={pathLine} />
    </>
  )
}
