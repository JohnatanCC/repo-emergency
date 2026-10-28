import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import {
  CuboidCollider,
  RigidBody,
  useBeforePhysicsStep,
  useRevoluteJoint,
  type RapierCollider,
  type RapierRigidBody,
} from '@react-three/rapier'
import type { LevelData, Opening } from '../game/data/types'
import type { BuiltLevel } from './buildLevel'
import { DOOR_HEIGHT, WALL_THICKNESS } from './buildLevel'
import { DOOR_GROUPS } from '../game/physics'
import { emitNoise } from '../game/systems/noise'
import { registerInteractable } from '../game/systems/interactables'
import { useGameStore } from '../game/stores/gameStore'
import { getTexture } from './textures'

/**
 * Portas com dobradiça. Corpo dinâmico preso por uma junta de revolução;
 * só colide com o jogador e itens (as paredes ficam de fora, ver physics.ts).
 *
 * - Fechada: fica trancada no lugar por um motor. `E` abre devagar, para o lado
 *   oposto ao jogador. `Shift+E` abre/fecha com força e faz barulho.
 * - Aberta: solta, o jogador consegue empurrar com o corpo.
 * - Fechar rápido demais conta como batida (barulho alto).
 */

export const DOOR = {
  thickness: 0.05,
  /** Folga entre a folha e o batente (cada lado e em cima), em metros. */
  clearance: 0.012,
  /** Largura da guarnição do batente, que cobre a emenda com a parede. */
  casing: 0.08,
  mass: 20,
  openAngle: (95 * Math.PI) / 180,
  limit: (100 * Math.PI) / 180,
  /** Motor (modelo por aceleração): rigidez e amortecimento. */
  soft: { stiffness: 14, damping: 7.5 },
  hard: { stiffness: 140, damping: 9 },
  latch: { stiffness: 60, damping: 15 },
  /** Atrito quando solta. */
  friction: 2.5,
  /** Barulho (raio em metros). */
  noiseSoft: 4,
  noiseHard: 14,
  noiseSlam: 18,
  /** Velocidade angular (rad/s) que vira batida ao fechar. */
  slamSpeed: 3,
}

const UP = new THREE.Vector3(0, 1, 0)

/** Ângulo (yaw) de um quaternion que só gira em Y. */
function yawOf(q: { y: number; w: number }) {
  return 2 * Math.atan2(q.y, q.w)
}
function wrap(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a))
}

function Door({ opening, level, built }: { opening: Opening; level: LevelData; built: BuiltLevel }) {
  const frame = useRef<RapierRigidBody>(null)
  const door = useRef<RapierRigidBody>(null)
  const collider = useRef<RapierCollider>(null)

  // geometria: dobradiça numa ponta da abertura, porta se estende ao longo dela
  const g = useMemo(() => {
    const horizontal = opening.w >= opening.h
    const s = level.scale
    const len = (horizontal ? opening.w : opening.h) * s
    // a folha ocupa o vão inteiro, menos a folga dos dois lados
    const width = len - 2 * DOOR.clearance
    const start = horizontal ? built.toWorld(opening.x, opening.y + opening.h / 2) : built.toWorld(opening.x + opening.w / 2, opening.y)
    const hinge: [number, number, number] = horizontal ? [start[0] + DOOR.clearance, 0, start[2]] : [start[0], 0, start[2] + DOOR.clearance]
    // local +x aponta ao longo da abertura
    const yaw0 = horizontal ? 0 : -Math.PI / 2
    return { len, width, height: DOOR_HEIGHT - 2 * DOOR.clearance, start, hinge, yaw0 }
  }, [opening, level, built])

  const joint = useRevoluteJoint(frame, door, [
    [0, 0, 0],
    [0, 0, 0],
    [0, 1, 0],
    [-DOOR.limit, DOOR.limit],
  ])

  const st = useRef({
    /** Ângulo alvo do motor; null = solta. */
    target: 0 as number | null,
    hard: false,
    until: 0,
    prevAngle: 0,
    lastSlam: 0,
    opened: false,
  }).current

  const angle = () => {
    const b = door.current
    return b ? wrap(yawOf(b.rotation()) - g.yaw0) : 0
  }

  const drive = (target: number | null, hard: boolean) => {
    const j = joint.current
    if (!j) return
    st.target = target
    st.hard = hard
    st.until = performance.now() + 2500
    door.current?.wakeUp()
    if (target === null) j.configureMotorVelocity(0, DOOR.friction)
    else {
      const m = hard ? DOOR.hard : DOOR.soft
      j.configureMotorPosition(target, m.stiffness, m.damping)
    }
  }

  // começa fechada e trancada
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      joint.current?.configureMotorPosition(0, DOOR.latch.stiffness, DOOR.latch.damping)
    })
    return () => cancelAnimationFrame(id)
  }, [joint])

  // a mira encontra a porta pelo colisor
  useEffect(() => {
    const c = collider.current
    if (!c) return
    return registerInteractable(c.handle, {
      kind: 'door',
      label: () => ({ text: Math.abs(angle()) < 0.3 ? 'abrir porta' : 'fechar porta', ok: true }),
      use: ({ from, hard }) => {
        const closed = Math.abs(angle()) < 0.3
        let target = 0
        if (closed) {
          // abre para longe de quem está usando
          const v = new THREE.Vector3(from[0] - g.hinge[0], 0, from[2] - g.hinge[2]).applyAxisAngle(UP, -g.yaw0)
          target = v.z >= 0 ? DOOR.openAngle : -DOOR.openAngle
        }
        drive(target, hard)
        const [x, , z] = g.hinge
        emitNoise({ pos: [x, 1, z], radius: hard ? DOOR.noiseHard : DOOR.noiseSoft, type: hard ? 'doorSlam' : 'door' })
      },
    })
  }, [g])

  useBeforePhysicsStep((world) => {
    const j = joint.current
    if (!j || !door.current) return
    const a = angle()
    const speed = Math.abs(wrap(a - st.prevAngle)) / Math.max(world.timestep, 1e-3)
    st.prevAngle = a

    // 1ª porta aberta: começa a contagem das entidades
    if (opening.firstDoor && !st.opened && Math.abs(a) > 0.25) {
      st.opened = true
      useGameStore.getState().startEnemyTimer()
    }

    // fechou rápido demais: batida
    const now = performance.now()
    if (Math.abs(a) < 0.08 && speed > DOOR.slamSpeed && now - st.lastSlam > 600) {
      st.lastSlam = now
      const [x, , z] = g.hinge
      emitNoise({ pos: [x, 1, z], radius: DOOR.noiseSlam, type: 'doorSlam' })
    }

    if (st.target === null) return
    const reached = Math.abs(a - st.target) < 0.04
    if (st.target === 0 && (reached || (Math.abs(a) < 0.1 && now > st.until))) {
      // fechou: tranca de novo
      j.configureMotorPosition(0, DOOR.latch.stiffness, DOOR.latch.damping)
    } else if (st.target !== 0 && (reached || now > st.until)) {
      // abriu: solta para poder ser empurrada
      drive(null, false)
    }
  })

  const mats = useMemo(
    () => ({
      // textura desenhada para a porta inteira (sem repetir)
      wood: new THREE.MeshStandardMaterial({ map: getTexture('door', 1, 1, 1), roughness: 0.8 }),
      brass: new THREE.MeshStandardMaterial({ color: '#8a6a2a', metalness: 0.6, roughness: 0.4 }),
      trim: new THREE.MeshStandardMaterial({ map: getTexture('darkwood', 0.3, 1, 0.6), roughness: 0.85 }),
    }),
    [g],
  )

  const cx = g.width / 2
  const cy = g.height / 2 + DOOR.clearance
  // batente: atravessa as duas paredes e sobra 2 cm de cada lado (guarnição)
  const depth = 2 * WALL_THICKNESS + 0.04
  const c = DOOR.casing
  return (
    <>
      <group position={[g.start[0], 0, g.start[2]]} rotation={[0, g.yaw0, 0]}>
        {/* entra 1 cm no vão para cobrir a ponta da parede */}
        <mesh position={[-(c - 0.01) / 2, (DOOR_HEIGHT + c) / 2, 0]} material={mats.trim} castShadow receiveShadow>
          <boxGeometry args={[c + 0.01, DOOR_HEIGHT + c, depth]} />
        </mesh>
        <mesh position={[g.len + (c - 0.01) / 2, (DOOR_HEIGHT + c) / 2, 0]} material={mats.trim} castShadow receiveShadow>
          <boxGeometry args={[c + 0.01, DOOR_HEIGHT + c, depth]} />
        </mesh>
        <mesh position={[g.len / 2, DOOR_HEIGHT + (c - 0.01) / 2, 0]} material={mats.trim} castShadow receiveShadow>
          <boxGeometry args={[g.len + 2 * c, c + 0.01, depth]} />
        </mesh>
      </group>
      <RigidBody ref={frame} type="fixed" colliders={false} position={g.hinge} rotation={[0, g.yaw0, 0]} />
      <RigidBody
        ref={door}
        type="dynamic"
        colliders={false}
        position={g.hinge}
        rotation={[0, g.yaw0, 0]}
        angularDamping={1.5}
        linearDamping={1}
        canSleep={false}
      >
        <CuboidCollider
          ref={collider}
          args={[g.width / 2, g.height / 2, DOOR.thickness / 2]}
          position={[cx, cy, 0]}
          mass={DOOR.mass}
          collisionGroups={DOOR_GROUPS}
        />
        <mesh position={[cx, cy, 0]} material={mats.wood} castShadow receiveShadow>
          <boxGeometry args={[g.width, g.height, DOOR.thickness]} />
        </mesh>
        {[1, -1].map((side) => (
          <mesh key={side} position={[g.width - 0.08, 1.0, (side * (DOOR.thickness + 0.04)) / 2]} material={mats.brass}>
            <boxGeometry args={[0.1, 0.04, 0.04]} />
          </mesh>
        ))}
      </RigidBody>
    </>
  )
}

export function Doors({ level, built }: { level: LevelData; built: BuiltLevel }) {
  return (
    <>
      {built.openings
        .filter((o) => o.kind === 'door')
        .map((o) => (
          <Door key={o.id} opening={o} level={level} built={built} />
        ))}
    </>
  )
}
