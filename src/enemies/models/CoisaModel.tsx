import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { psxBasic, psxStandard, raggedLathe } from './psx'
import { creatureTextures } from './textures'
import { HEAD } from '../../items/catalog'
import type { Pose } from './pose'
import { spring, stepSpring, turnLag } from './spring'
import { ANIM } from './config'
import { SmokeTrail } from './SmokeTrail'

/**
 * A COISA (pés em y = 0): um corpo pequeno de fumaça negra, curvado sobre duas
 * pernas longas e finas de joelho para trás, um olho aceso, braços magros
 * abraçando a cabeça do investigador. Deixa um rastro de fumaça roxa.
 *
 * Animação: parada, olha em volta aos trancos; fugindo, passadas rápidas e
 * desajeitadas, o corpo baixo e balançando, a cabeça apertada contra o peito.
 */

const THIGH = 0.38
const SHIN = 0.42

export function CoisaModel({ pose }: { pose: Pose }) {
  const root = useRef<THREE.Group>(null)
  const hips = useRef<THREE.Group>(null)
  const torso = useRef<THREE.Group>(null)
  const hood = useRef<THREE.Group>(null)
  const core = useRef<THREE.Group>(null)
  const legs = useRef<{ thigh: THREE.Group | null; shin: THREE.Group | null }[]>([
    { thigh: null, shin: null },
    { thigh: null, shin: null },
  ])

  const m = useMemo(() => {
    const t = creatureTextures()
    return {
      // não reflete luz (nem a lanterna), levemente translúcido como fumaça
      smoke: psxBasic({ color: '#000000', transparent: true, opacity: 0.92 }),
      skin: psxStandard({ color: HEAD.color }),
      face: psxBasic({ map: t.headFace, transparent: true, alphaTest: 0.5, color: '#c8b8a8' }),
      hair: psxStandard({ color: '#2a1c12' }),
      blood: psxStandard({ color: '#4a0a08' }),
      eye: psxBasic({ color: '#e8e0ff' }),
    }
  }, [])
  const geo = useMemo(
    () => ({
      // corpo no espaço do tronco (y = 0 no quadril)
      body: raggedLathe(
        [
          [0.08, -0.05],
          [0.2, 0.1],
          [0.25, 0.3],
          [0.2, 0.5],
          [0.1, 0.6],
        ],
        6,
        0.45,
        5,
      ),
      hood: new THREE.SphereGeometry(0.13, 5, 4),
      thigh: new THREE.CylinderGeometry(0.03, 0.02, THIGH, 4),
      shin: new THREE.CylinderGeometry(0.02, 0.01, SHIN, 4),
      foot: new THREE.ConeGeometry(0.02, 0.12, 3),
      arm: new THREE.CylinderGeometry(0.02, 0.013, 0.38, 4),
      eye: new THREE.OctahedronGeometry(0.018),
      head: new THREE.SphereGeometry(HEAD.dims[0], 8, 6),
      hair: new THREE.SphereGeometry(HEAD.dims[0], 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
      face: new THREE.PlaneGeometry(0.2, 0.24),
      neck: new THREE.CylinderGeometry(0.05, 0.06, 0.04, 6),
    }),
    [],
  )

  const sp = useMemo(
    () => ({
      run: spring(),
      phase: 0,
      lean: spring(0.4),
      hipY: spring(THIGH + SHIN - 0.08),
      hoodY: spring(),
      thigh: [spring(), spring()],
      knee: [spring(0.6), spring(0.6)],
      turn: spring(),
      lookAt: 0,
      nextLook: 1,
    }),
    [],
  )

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const dt = Math.min(delta, 0.05)
    const r = root.current
    if (!r) return
    const run = stepSpring(sp.run, Math.min(pose.moving, 6), dt, ANIM.snappy)
    const fleeing = run > 2
    sp.phase += dt * Math.min(run, 6) * 2.4
    const ph = sp.phase
    turnLag(sp.turn, r, dt, ANIM.turn)
    m.smoke.opacity = 0.84 + 0.1 * Math.sin(t * 7)

    // quadril baixo correndo, quica a cada passada
    const hp = hips.current
    if (hp) {
      hp.position.y = stepSpring(
        sp.hipY,
        THIGH + SHIN - 0.08 - (fleeing ? 0.12 : 0) + Math.abs(Math.sin(ph)) * 0.05 * Math.min(run, 2),
        dt,
        ANIM.snappy,
      )
      hp.rotation.z = (pose.stunned ? Math.sin(t * 45) * 0.1 : Math.sin(ph) * 0.06 * Math.min(run, 2)) - sp.turn.v * 0.05
    }
    // pernas de joelho para trás: a coxa vai para a frente, a canela dobra para trás
    legs.current.forEach((leg, i) => {
      const side = i === 0 ? 0 : Math.PI
      const amp = Math.min(run, 2.5) * 0.3
      if (leg.thigh) leg.thigh.rotation.x = stepSpring(sp.thigh[i], -0.5 + Math.sin(ph + side) * amp, dt, ANIM.limb)
      const knee = 0.9 + Math.max(0, Math.sin(ph + side - 1)) * amp * 1.4
      if (leg.shin) leg.shin.rotation.x = stepSpring(sp.knee[i], knee, dt, ANIM.limb)
    })
    // tronco curvado; correndo, quase deitado para a frente
    if (torso.current) torso.current.rotation.x = stepSpring(sp.lean, 0.45 + (fleeing ? 0.35 : 0) + Math.sin(t * 3) * 0.03, dt, ANIM.soft)
    // parada: olha em volta aos trancos
    sp.nextLook -= dt
    if (sp.nextLook <= 0) {
      sp.lookAt = (Math.random() - 0.5) * 1.6
      sp.nextLook = 0.6 + Math.random() * 1.4
    }
    if (hood.current) hood.current.rotation.y = stepSpring(sp.hoodY, fleeing ? 0 : sp.lookAt, dt, ANIM.snappy)
  })

  return (
    <group ref={root}>
      <group ref={hips} position={[0, THIGH + SHIN - 0.08, 0]}>
        {[0, 1].map((i) => (
          <group
            key={i}
            ref={(el) => {
              legs.current[i].thigh = el
            }}
            position={[(i === 0 ? -1 : 1) * 0.07, 0, 0]}
          >
            <mesh geometry={geo.thigh} material={m.smoke} position={[0, -THIGH / 2, 0]} />
            <group
              ref={(el) => {
                legs.current[i].shin = el
              }}
              position={[0, -THIGH, 0]}
            >
              <mesh geometry={geo.shin} material={m.smoke} position={[0, -SHIN / 2, 0]} />
              <mesh geometry={geo.foot} material={m.smoke} position={[0, -SHIN, 0.05]} rotation={[Math.PI / 2, 0, 0]} />
            </group>
          </group>
        ))}
        <group ref={torso}>
          <mesh geometry={geo.body} material={m.smoke} castShadow />
          <group ref={core} position={[0, 0.3, 0]} />
          {/* capuz com um olho só, aceso */}
          <group ref={hood} position={[0, 0.62, 0.06]}>
            <mesh geometry={geo.hood} material={m.smoke} scale={[1, 0.95, 1.15]} />
            <mesh geometry={geo.eye} material={m.eye} position={[0.035, 0.01, 0.13]} />
          </group>
          {/* braços magros apertando a cabeça contra o peito */}
          {[-1, 1].map((s) => (
            <mesh key={s} geometry={geo.arm} material={m.smoke} position={[s * 0.13, 0.32, 0.17]} rotation={[1.3, 0, s * -0.65]} />
          ))}
          <group position={[0, 0.26, 0.27]} rotation={[0.2, 0.35, 0.15]}>
            <mesh geometry={geo.head} material={m.skin} castShadow />
            <mesh geometry={geo.hair} material={m.hair} position={[0, 0.03, -0.02]} scale={[1.08, 1.05, 1.08]} />
            <mesh geometry={geo.face} material={m.face} position={[0, -0.01, HEAD.dims[0] - 0.005]} />
            <mesh geometry={geo.neck} material={m.blood} position={[0, -HEAD.dims[0] + 0.01, -0.01]} />
          </group>
        </group>
      </group>
      <SmokeTrail
        anchor={core}
        color="#6a3aa8"
        rate={12}
        life={1.4}
        size={0.4}
        opacity={0.35}
        spread={0.3}
        rise={0.2}
        additive
        intensity={() => Math.min(1, 0.3 + pose.moving / 4)}
      />
    </group>
  )
}
