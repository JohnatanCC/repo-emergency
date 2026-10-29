import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { lathe, psxBasic, psxStandard, raggedLathe } from './psx'
import { creatureTextures } from './textures'
import type { Pose } from './pose'
import { spring, stepSpring, turnLag } from './spring'
import { ANIM } from './config'
import { ClothHair, type HairSheet } from './ClothHair'

/**
 * A Guardiã (pés em y = 0). Alta e curvada para a frente, vestido longo de
 * barra esfarrapada, mangas bufantes, gola de renda. Braços longos demais
 * (as mãos passam dos joelhos), dedos compridos de duas falanges. A cabeça
 * fica sempre caída, escondida por uma cortina de cabelo; ela quase nunca
 * olha direto — só quando dá o bote, aí a cabeça sobe e o rosto aparece.
 *
 * Animação: passo arrastado com balanço do quadril, saia e cabelo atrasados
 * (molas), braços pendurados como pêndulos; caçando, curva mais e estica os
 * braços; no bote (pose.attack), ergue os braços e desce num golpe.
 */

/**
 * Cabelo longo e liso em mantas de tecido (ClothHair): duas cortinas na frente
 * com uma fresta (o rosto aparece no meio) e uma manta longa em volta das costas.
 */
const HAIR: HairSheet[] = [
  { from: [-0.8, 0.7], to: [-0.04, 0.95], cols: 5, rows: 8, length: (c) => 0.66 - c * 0.03 },
  { from: [0.06, 0.95], to: [0.8, 0.7], cols: 5, rows: 8, length: (c) => 0.55 + c * 0.03 },
  { from: [0.85, 0.5], to: [5.43, 0.5], cols: 12, rows: 8, length: (c) => 0.72 + ((c * 37) % 5) * 0.02 },
]

export function GuardiaModel({ pose }: { pose: Pose }) {
  const root = useRef<THREE.Group>(null)
  const hips = useRef<THREE.Group>(null)
  const spine = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const skirt = useRef<THREE.Group>(null)
  const skull = useRef<THREE.Group>(null)
  const arms = useRef<{ upper: THREE.Group | null; fore: THREE.Group | null; fingers: (THREE.Group | null)[] }[]>([
    { upper: null, fore: null, fingers: [] },
    { upper: null, fore: null, fingers: [] },
  ])

  const m = useMemo(() => {
    const t = creatureTextures()
    return {
      dress: psxStandard({ map: t.dress, color: '#ffffff', side: THREE.DoubleSide }),
      under: psxStandard({ color: '#0a0608', side: THREE.DoubleSide }),
      bodice: psxStandard({ color: '#1a1016' }),
      lace: psxStandard({ color: '#5a5054' }),
      skin: psxStandard({ map: t.skin, color: '#e8e2d8' }),
      face: psxBasic({ map: t.guardiaFace, transparent: true, alphaTest: 0.5, color: '#b0a898' }),
      hair: psxStandard({ color: '#070506', side: THREE.DoubleSide }),
      eyes: psxBasic({ color: '#3a1a14' }),
    }
  }, [])

  const geo = useMemo(
    () => ({
      // saia longa: larga e esfarrapada na barra, fechando na cintura
      skirt: raggedLathe(
        [
          [0.6, 0],
          [0.56, 0.08],
          [0.5, 0.3],
          [0.4, 0.6],
          [0.28, 0.9],
          [0.17, 1.08],
        ],
        11,
        0.22,
        5,
      ),
      under: raggedLathe(
        [
          [0.5, 0.02],
          [0.45, 0.25],
          [0.32, 0.6],
        ],
        9,
        0.4,
        9,
      ),
      // corpete (no espaço da coluna: começa na cintura, y = 0)
      bodice: lathe(
        [
          [0.15, -0.02],
          [0.13, 0.12],
          [0.17, 0.3],
          [0.19, 0.42],
          [0.14, 0.52],
          [0.06, 0.58],
        ],
        8,
      ),
      sleeve: new THREE.SphereGeometry(0.1, 6, 5),
      collar: new THREE.ConeGeometry(0.16, 0.1, 10, 1, true),
      upper: new THREE.CylinderGeometry(0.03, 0.025, 0.42, 5),
      fore: new THREE.CylinderGeometry(0.025, 0.018, 0.46, 5),
      hand: new THREE.BoxGeometry(0.06, 0.09, 0.03),
      phalanx: new THREE.CylinderGeometry(0.007, 0.005, 0.11, 3),
      head: new THREE.SphereGeometry(0.105, 8, 6),
      face: new THREE.PlaneGeometry(0.18, 0.23),
      eye: new THREE.OctahedronGeometry(0.011),
      neck: new THREE.CylinderGeometry(0.035, 0.045, 0.14, 5),
    }),
    [],
  )

  // o cabelo encosta no peito e nos ombros
  const hairColliders = useMemo(
    () => [
      { center: [0, 0.32, 0.05] as [number, number, number], radius: 0.2, space: spine },
      { center: [0.2, 0.46, 0] as [number, number, number], radius: 0.1, space: spine },
      { center: [-0.2, 0.46, 0] as [number, number, number], radius: 0.1, space: spine },
    ],
    [],
  )

  const sp = useMemo(
    () => ({
      walk: spring(),
      phase: 0,
      lean: spring(0.22),
      roll: spring(),
      hipYaw: spring(),
      skirt: spring(),
      skirtX: spring(),
      headX: spring(0.6),
      headZ: spring(),
      armX: [spring(0.08), spring(0.08)],
      armZ: [spring(), spring()],
      elbow: [spring(-0.15), spring(-0.15)],
      curl: [spring(0.4), spring(0.4)],
      turn: spring(),
      twitch: 0,
      nextTwitch: 2,
      tic: 0,
    }),
    [],
  )

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const dt = Math.min(delta, 0.05)
    const r = root.current
    if (!r) return
    const chase = pose.mode === 'chase'
    const alert = pose.mode === 'alert'
    const atk = pose.attack
    const walk = stepSpring(sp.walk, Math.min(pose.moving, 2.2), dt, ANIM.soft)
    // fase do passo: anda conforme a velocidade (arrastado devagar, corrido caçando)
    sp.phase += dt * walk * (chase ? 3.4 : 2.2)
    const ph = sp.phase
    turnLag(sp.turn, r, dt, ANIM.turn)

    // quadril: sobe e desce a cada passo e gira de leve
    const hp = hips.current
    if (hp) {
      hp.position.y = Math.abs(Math.sin(ph)) * 0.025 * walk
      hp.rotation.y = stepSpring(sp.hipYaw, Math.sin(ph) * 0.12 * walk, dt, ANIM.soft)
    }
    // saia atrasada em relação ao quadril, e balançando para trás andando
    if (skirt.current) {
      skirt.current.rotation.y = stepSpring(sp.skirt, -(hp?.rotation.y ?? 0) * 0.8 - sp.turn.v * 0.08, dt, ANIM.head)
      skirt.current.rotation.x = stepSpring(sp.skirtX, -walk * 0.06 + Math.sin(ph * 2) * 0.02 * walk, dt, ANIM.head)
    }

    // coluna: curvada; caçando, mais; no bote, endireita para erguer os braços
    const sn = spine.current
    if (sn) {
      const leanTarget = (chase ? 0.42 : alert ? 0.3 : 0.24) - atk * 0.35 + Math.sin(ph) * 0.03 * walk
      sn.rotation.x = stepSpring(sp.lean, leanTarget, dt, ANIM.soft)
      const shake = pose.stunned ? Math.sin(t * 45) * 0.08 : 0
      sn.rotation.z = stepSpring(sp.roll, Math.sin(ph) * 0.05 * walk + (alert ? 0.12 : 0), dt, ANIM.soft) + shake
    }

    // cabeça: caída quase sempre; caçando, tiques bruscos; no bote ela olha direto
    sp.tic = Math.max(0, sp.tic - dt)
    if (chase && sp.tic === 0 && Math.random() < dt * 0.8) sp.tic = 0.25
    const h = head.current
    if (h) {
      const look = atk > 0.2 ? -0.15 : sp.tic > 0 ? 0.05 : chase ? 0.5 : alert ? 0.45 : 0.72
      h.rotation.x = stepSpring(sp.headX, look, dt, sp.tic > 0 || atk > 0.2 ? ANIM.snappy : ANIM.head)
      const roll = alert ? 0.45 : chase ? Math.sin(t * 1.7) * 0.12 : Math.sin(t * 0.6) * 0.06
      h.rotation.z = stepSpring(sp.headZ, roll, dt, ANIM.head)
    }

    // dedos se mexem sozinhos de vez em quando
    sp.nextTwitch -= dt
    if (sp.nextTwitch <= 0) {
      sp.twitch = 0.5
      sp.nextTwitch = 1.5 + Math.random() * 3
    }
    sp.twitch = Math.max(0, sp.twitch - dt)

    arms.current.forEach((arm, k) => {
      const side = k === 0 ? -1 : 1
      // pêndulo: balança com o passo, braço oposto à perna
      const swing = Math.sin(ph + (side > 0 ? Math.PI : 0)) * 0.22 * walk
      let ax = 0.1 + swing
      let elbow = -0.15
      let curl = 0.35 + (sp.twitch > 0 ? Math.sin(t * 30 + k) * 0.4 : 0)
      if (chase) {
        // estica os braços para a frente, dedos abertos
        ax = -1.15 + Math.sin(t * 5 + side) * 0.08
        elbow = -0.1
        curl = 0.05
      }
      if (atk > 0) {
        // bote: ergue (até 0,7) e desce rasgando (0,7 → 1)
        const up = Math.min(1, atk / 0.7)
        const down = Math.max(0, (atk - 0.7) / 0.3)
        ax = -2.7 * up + 1.9 * down
        elbow = -0.6 * up + 0.5 * down
        curl = 0.7 - down * 0.6
      }
      const fast = atk > 0.7 ? ANIM.snappy : ANIM.limb
      if (arm.upper) {
        arm.upper.rotation.x = stepSpring(sp.armX[k], ax, dt, fast)
        arm.upper.rotation.z = stepSpring(sp.armZ[k], side * (chase || atk > 0 ? 0.08 : 0.3), dt, ANIM.limb)
      }
      if (arm.fore) arm.fore.rotation.x = stepSpring(sp.elbow[k], elbow, dt, fast)
      const c = stepSpring(sp.curl[k], curl, dt, ANIM.snappy)
      arm.fingers.forEach((f, i) => {
        if (!f) return
        f.rotation.x = c * (1 + (i % 2) * 0.3)
        const tip = f.children[1] as THREE.Object3D | undefined
        if (tip) tip.rotation.x = c * 1.2
      })
    })

    const eyeColor = atk > 0 || chase ? '#ff2a18' : alert ? '#a03020' : '#3a1a14'
    m.eyes.color.set(eyeColor)
  })

  const arm = (k: number) => {
    const side = k === 0 ? -1 : 1
    return (
      <group
        ref={(el) => {
          arms.current[k].upper = el
        }}
        position={[side * 0.2, 0.47, 0.02]}
      >
        <mesh geometry={geo.sleeve} material={m.dress} scale={[1, 1.15, 1]} position={[0, -0.02, 0]} castShadow />
        <mesh geometry={geo.upper} material={m.skin} position={[0, -0.21, 0]} castShadow />
        <group
          ref={(el) => {
            arms.current[k].fore = el
          }}
          position={[0, -0.42, 0]}
        >
          <mesh geometry={geo.fore} material={m.skin} position={[0, -0.23, 0]} castShadow />
          <mesh geometry={geo.hand} material={m.skin} position={[0, -0.5, 0.005]} />
          {[-0.022, -0.008, 0.007, 0.021].map((x, i) => (
            <group
              key={i}
              ref={(el) => {
                arms.current[k].fingers[i] = el
              }}
              position={[x, -0.54, 0.008]}
            >
              <mesh geometry={geo.phalanx} material={m.skin} position={[0, -0.055, 0]} />
              <group position={[0, -0.11, 0]}>
                <mesh geometry={geo.phalanx} material={m.skin} position={[0, -0.05, 0]} scale={[0.85, 0.9, 0.85]} />
              </group>
            </group>
          ))}
        </group>
      </group>
    )
  }

  return (
    <group ref={root}>
      <group ref={hips}>
        <group ref={skirt}>
          <mesh geometry={geo.skirt} material={m.dress} castShadow receiveShadow />
          <mesh geometry={geo.under} material={m.under} />
        </group>
        {/* da cintura para cima: curvado para a frente */}
        <group ref={spine} position={[0, 1.06, 0]}>
          <mesh geometry={geo.bodice} material={m.bodice} castShadow />
          <mesh geometry={geo.collar} material={m.lace} position={[0, 0.55, 0]} rotation={[Math.PI, 0, 0]} />
          {arm(0)}
          {arm(1)}
          <mesh geometry={geo.neck} material={m.skin} position={[0, 0.62, 0.02]} />
          <group ref={head} position={[0, 0.68, 0.03]}>
            <group ref={skull} position={[0, 0.09, 0]}>
              <mesh geometry={geo.head} material={m.skin} scale={[0.92, 1.15, 0.98]} castShadow />
              <mesh geometry={geo.face} material={m.face} position={[0, -0.01, 0.1]} />
              {[-1, 1].map((s) => (
                <mesh key={s} geometry={geo.eye} material={m.eyes} position={[s * 0.032, 0.015, 0.108]} />
              ))}
              {/* cabelo: casco, volume atrás e mechas caindo na frente do rosto */}
              <mesh geometry={geo.head} material={m.hair} position={[0, 0.03, -0.012]} scale={[1.02, 1.08, 1.04]} />
            </group>
          </group>
        </group>
      </group>
      <ClothHair head={skull} radius={0.112} sheets={HAIR} colliders={hairColliders} />
    </group>
  )
}
