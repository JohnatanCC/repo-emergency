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
import { audio } from '../game/audio/engine'
import { AUDIO } from '../game/audio/sounds'
import { registerInteractable } from '../game/systems/interactables'
import { useGameStore } from '../game/stores/gameStore'
import { getTexture } from './textures'

/**
 * Portas com dobradiça. Corpo dinâmico preso por uma junta de revolução;
 * só colide com o jogador e itens (as paredes ficam de fora, ver physics.ts).
 *
 * - Física livre (só atrito): qualquer corpo que encostar empurra a porta —
 *   investigador, itens e, depois, as entidades.
 * - `E` abre devagar, para o lado oposto ao jogador; `Shift+E` abre/fecha com
 *   força e faz barulho. Ao chegar, a porta volta a ficar solta.
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
  /** Atrito quando solta: maior = mais difícil de empurrar e para mais rápido. */
  friction: 2.5,
  /** Barulho (raio em metros). */
  noiseSoft: 4,
  noiseHard: 14,
  noiseSlam: 18,
  /** Velocidade angular (rad/s) que vira batida ao fechar. */
  slamSpeed: 3,
}

const UP = new THREE.Vector3(0, 1, 0)

/**
 * Portas para as entidades: centro do vão e `force`, que abre na força se
 * estiver fechada (para quando o empurrão do corpo não vence o atrito).
 */
export const doorHandles = new Map<string, { x: number; z: number; force: (from: [number, number, number]) => void }>()

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
    target: null as number | null,
    /** Atrito já configurado no motor (no primeiro passo da física). */
    ready: false,
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

  // a mira encontra a porta pelo colisor
  useEffect(() => {
    const c = collider.current
    if (!c) return
    /** Ângulo aberto para longe de quem está em `from`. */
    const awayFrom = (from: [number, number, number]) => {
      const v = new THREE.Vector3(from[0] - g.hinge[0], 0, from[2] - g.hinge[2]).applyAxisAngle(UP, -g.yaw0)
      return v.z >= 0 ? DOOR.openAngle : -DOOR.openAngle
    }
    const use = (
      { from, hard }: { from: [number, number, number]; hard: boolean },
      target = Math.abs(angle()) < 0.3 ? awayFrom(from) : 0,
    ) => {
      drive(target, hard)
      const [x, , z] = g.hinge
      emitNoise({ pos: [x, 1, z], radius: hard ? DOOR.noiseHard : DOOR.noiseSoft, type: hard ? 'doorSlam' : 'door' })
      // com força o rangido é curto e alto; a batida (se fechar) vem da detecção abaixo
      audio.play('creak', { pos: [x, 1.2, z], volume: AUDIO.doors * (hard ? 1 : 0.7), rate: hard ? 1.7 : 0.9 + Math.random() * 0.2 })
    }
    const along = g.yaw0 === 0 ? [1, 0] : [0, 1]
    doorHandles.set(opening.id, {
      x: g.start[0] + (along[0] * g.len) / 2,
      z: g.start[2] + (along[1] * g.len) / 2,
      // joga a porta para longe de quem empurra, em qualquer ângulo (inclusive aberta atravessada no caminho)
      force: (from) => {
        const target = awayFrom(from)
        if (Math.abs(angle() - target) > 0.3) use({ from, hard: true }, target)
      },
    })
    const unregister = registerInteractable(c.handle, {
      kind: 'door',
      label: () => ({ text: Math.abs(angle()) < 0.3 ? 'abrir porta' : 'fechar porta', ok: true }),
      use,
    })
    return () => {
      unregister()
      doorHandles.delete(opening.id)
    }
  }, [g])

  useBeforePhysicsStep((world) => {
    const j = joint.current
    if (!j || !door.current) return
    const a = angle()
    const speed = Math.abs(wrap(a - st.prevAngle)) / Math.max(world.timestep, 1e-3)
    // só fecha se o ângulo está diminuindo (abrir rápido a partir do fechado não é batida)
    const closing = Math.abs(a) < Math.abs(st.prevAngle)
    st.prevAngle = a

    // 1ª porta aberta: começa a contagem das entidades
    if (opening.firstDoor && !st.opened && Math.abs(a) > 0.25) {
      st.opened = true
      useGameStore.getState().startEnemyTimer()
    }

    // fechou rápido demais: batida
    const now = performance.now()
    if (closing && Math.abs(a) < 0.08 && speed > DOOR.slamSpeed && now - st.lastSlam > 600) {
      st.lastSlam = now
      const [x, , z] = g.hinge
      emitNoise({ pos: [x, 1, z], radius: DOOR.noiseSlam, type: 'doorSlam' })
      audio.play('slam', { pos: [x, 1.2, z], volume: AUDIO.doors })
    }

    // começa fechada e solta, só com atrito
    if (!st.ready) {
      st.ready = true
      j.configureMotorVelocity(0, DOOR.friction)
    }

    if (st.target === null) return
    // chegou onde o E mandou (ou desistiu): volta a ficar solta
    if (Math.abs(a - st.target) < 0.04 || now > st.until) drive(null, false)
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
