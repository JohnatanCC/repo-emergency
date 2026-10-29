import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { psxBasic, raggedLathe } from './psx'
import { creatureTextures } from './textures'
import type { Pose } from './pose'
import { spring, stepSpring, turnLag } from './spring'
import { ANIM } from './config'
import { SmokeTrail } from './SmokeTrail'
import { ClothHair, type HairSheet } from './ClothHair'

/**
 * A figura do Possessor (pés em y = 0): espírito translúcido e esverdeado que
 * flutua, tronco magro e alongado, tiras esfarrapadas no lugar das pernas
 * ondulando como pano na água, braços longos com três garras que abrem e
 * fecham, e o rosto alongado num grito (a mandíbula desce, a cabeça treme).
 * Deixa um rastro pálido. Tremula e, no fim, some (pose.fade).
 */

/** Pano esfarrapado no lugar das pernas: quatro mantas presas na cintura, com frestas entre elas. */
const TATTERS: HairSheet[] = [0, 1, 2, 3].map((k) => ({
  from: [k * (Math.PI / 2) + 0.12, -0.25] as [number, number],
  to: [(k + 1) * (Math.PI / 2) - 0.12, -0.25] as [number, number],
  cols: 4,
  rows: 7,
  length: (c: number) => 0.62 + ((c * 7 + k * 3) % 5) * 0.06,
}))

export function PossessorModel({ pose }: { pose: Pose }) {
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const jaw = useRef<THREE.Mesh>(null)
  const waist = useRef<THREE.Group>(null)
  const chest = useRef<THREE.Group>(null)
  const arms = useRef<{ upper: THREE.Group | null; fore: THREE.Group | null; claws: THREE.Group | null }[]>([
    { upper: null, fore: null, claws: null },
    { upper: null, fore: null, claws: null },
  ])

  const m = useMemo(() => {
    const t = creatureTextures()
    return {
      ghost: psxBasic({ color: '#bfe0cf', transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }),
      face: psxBasic({ map: t.ghostFace, transparent: true, opacity: 0.9, depthWrite: false }),
      mouth: psxBasic({ color: '#020403', transparent: true, opacity: 0.9, depthWrite: false }),
    }
  }, [])
  const geo = useMemo(
    () => ({
      torso: raggedLathe(
        [
          [0.12, 0.85],
          [0.16, 1.05],
          [0.24, 1.35],
          [0.27, 1.5],
          [0.16, 1.62],
          [0.07, 1.68],
        ],
        7,
        0.3,
        3,
      ),
      // tiras de pano rasgado: pendem da cintura e ondulam
      head: new THREE.SphereGeometry(0.13, 7, 5),
      face: new THREE.PlaneGeometry(0.24, 0.32),
      mouth: new THREE.PlaneGeometry(0.07, 0.16),
      upper: new THREE.CylinderGeometry(0.035, 0.025, 0.45, 4),
      fore: new THREE.CylinderGeometry(0.025, 0.014, 0.48, 4),
      claw: new THREE.ConeGeometry(0.01, 0.24, 3),
    }),
    [],
  )
  const sp = useMemo(
    () => ({
      bob: spring(),
      lean: spring(0.15),
      headX: spring(),
      jaw: spring(1),
      arm: [spring(-1.2), spring(-1.2)],
      elbow: [spring(-0.2), spring(-0.2)],
      claw: [spring(0.3), spring(0.3)],
      turn: spring(),
      scream: 0,
    }),
    [],
  )

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const dt = Math.min(delta, 0.05)
    const r = root.current
    const b = body.current
    if (!r || !b) return
    turnLag(sp.turn, r, dt, ANIM.turn)
    // tremula (e some no fim)
    const flicker = Math.abs(Math.sin(t * 9) * Math.sin(t * 2.3))
    m.ghost.opacity = (0.22 + 0.25 * flicker + (Math.random() < 0.02 ? 0.3 : 0)) * pose.fade
    m.face.opacity = 0.9 * pose.fade
    m.mouth.opacity = 0.9 * pose.fade
    // flutua, inclinado para a frente quando avança
    b.position.y = stepSpring(sp.bob, Math.sin(t * 2) * 0.09, dt, ANIM.soft)
    b.rotation.x = stepSpring(sp.lean, 0.15 + Math.min(pose.moving, 1.5) * 0.18, dt, ANIM.soft)
    b.rotation.z = pose.stunned ? Math.sin(t * 45) * 0.1 : Math.sin(t * 1.1) * 0.05
    b.scale.setScalar(0.6 + 0.4 * pose.fade)

    // grito: a cada poucos segundos a cabeça vai para trás, a boca desce e treme
    sp.scream = Math.max(0, sp.scream - dt)
    if (sp.scream === 0 && Math.random() < dt * 0.35) sp.scream = 1.2
    const screaming = sp.scream > 0
    const h = head.current
    if (h) {
      h.rotation.x = stepSpring(sp.headX, screaming ? -0.35 : 0.1, dt, ANIM.head) + (screaming ? Math.sin(t * 50) * 0.05 : 0)
      h.rotation.z = screaming ? Math.sin(t * 37) * 0.06 : Math.sin(t * 0.8) * 0.08
    }
    const j = stepSpring(sp.jaw, screaming ? 2.1 : 1, dt, ANIM.snappy)
    if (jaw.current) {
      jaw.current.scale.y = j
      jaw.current.position.y = -0.06 - (j - 1) * 0.06
    }

    // braços: alcançam para a frente, alternando como quem nada no ar; garras abrem e fecham
    arms.current.forEach((arm, i) => {
      const off = i === 0 ? 0 : Math.PI
      const reach = -1.25 + Math.sin(t * 2.4 + off) * 0.25
      if (arm.upper) arm.upper.rotation.x = stepSpring(sp.arm[i], reach, dt, ANIM.limb)
      if (arm.fore) arm.fore.rotation.x = stepSpring(sp.elbow[i], -0.15 - Math.max(0, Math.sin(t * 2.4 + off)) * 0.5, dt, ANIM.limb)
      const open = stepSpring(sp.claw[i], Math.sin(t * 2.4 + off + 1) > 0.3 ? -0.3 : 0.5, dt, ANIM.snappy)
      arm.claws?.children.forEach((c, k) => (c.rotation.x = Math.PI + open * (k === 1 ? 1 : 0.8)))
    })
  })

  return (
    <group ref={root}>
      <group ref={body}>
        {/* cintura: onde o pano esfarrapado se prende */}
        <group ref={waist} position={[0, 0.95, 0]} />
        <mesh geometry={geo.torso} material={m.ghost} />
        <group ref={chest} position={[0, 1.3, 0]} />
        {[0, 1].map((i) => {
          const side = i === 0 ? -1 : 1
          return (
            <group
              key={i}
              ref={(el) => {
                arms.current[i].upper = el
              }}
              position={[side * 0.26, 1.52, 0]}
              rotation={[0, 0, side * 0.12]}
            >
              <mesh geometry={geo.upper} material={m.ghost} position={[0, -0.22, 0]} />
              <group
                ref={(el) => {
                  arms.current[i].fore = el
                }}
                position={[0, -0.45, 0]}
              >
                <mesh geometry={geo.fore} material={m.ghost} position={[0, -0.24, 0]} />
                <group
                  ref={(el) => {
                    arms.current[i].claws = el
                  }}
                  position={[0, -0.48, 0]}
                >
                  {[-0.022, 0, 0.022].map((x) => (
                    <mesh key={x} geometry={geo.claw} material={m.ghost} position={[x, -0.1, 0]} rotation={[Math.PI, 0, x * 6]} />
                  ))}
                </group>
              </group>
            </group>
          )
        })}
        <group ref={head} position={[0, 1.82, 0.02]}>
          <mesh geometry={geo.head} material={m.ghost} scale={[0.9, 1.45, 0.9]} />
          <mesh geometry={geo.face} material={m.face} position={[0, 0.02, 0.12]} scale={[1, 1.2, 1]} />
          {/* boca que se abre no grito */}
          <mesh ref={jaw} geometry={geo.mouth} material={m.mouth} position={[0, -0.06, 0.125]} />
        </group>
      </group>
      <SmokeTrail
        anchor={chest}
        color="#9fd8bf"
        rate={14}
        life={1.2}
        size={0.35}
        opacity={0.25 * pose.fade}
        spread={0.35}
        rise={0.4}
        additive
      />
      <ClothHair head={waist} radius={0.16} sheets={TATTERS} material={m.ghost} />
    </group>
  )
}
