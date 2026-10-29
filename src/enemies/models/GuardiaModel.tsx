import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { lathe, psxBasic, psxStandard } from './psx'
import { creatureTextures } from './textures'
import type { Pose } from './pose'
import { spring, stepSpring, turnLag } from './spring'
import { ANIM } from './config'

/**
 * A Guardiã (pés em y = 0): vestido longo com babados, corpete, gola,
 * cabelo comprido sobre o rosto pálido, braços longos de dedos compridos.
 * Patrulha de cabeça caída; caçando, ergue a cabeça, treme e estende os braços.
 */
export function GuardiaModel({ pose }: { pose: Pose }) {
  const body = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const skirt = useRef<THREE.Mesh>(null)

  const m = useMemo(() => {
    const t = creatureTextures()
    return {
      dress: psxStandard({ map: t.dress, color: '#ffffff', side: THREE.DoubleSide }),
      bodice: psxStandard({ color: '#1c1218' }),
      lace: psxStandard({ color: '#4a4044' }),
      skin: psxStandard({ map: t.skin, color: '#ffffff' }),
      face: psxBasic({ map: t.guardiaFace, transparent: true, alphaTest: 0.5, color: '#9a9488' }),
      hair: psxStandard({ color: '#0b0809', side: THREE.DoubleSide }),
      eyes: psxBasic({ color: '#3a2a20' }),
    }
  }, [])

  const geo = useMemo(
    () => ({
      // saia: larga embaixo, babados, afunila na cintura
      skirt: lathe(
        [
          [0.52, 0],
          [0.5, 0.06],
          [0.44, 0.1],
          [0.46, 0.18],
          [0.38, 0.42],
          [0.3, 0.72],
          [0.21, 1.0],
          [0.15, 1.18],
        ],
        9,
      ),
      bodice: lathe(
        [
          [0.15, 1.16],
          [0.18, 1.34],
          [0.17, 1.52],
          [0.13, 1.66],
          [0.06, 1.74],
        ],
        7,
      ),
      collar: new THREE.TorusGeometry(0.075, 0.03, 4, 8),
      upper: new THREE.CylinderGeometry(0.032, 0.026, 0.36, 5),
      lower: new THREE.CylinderGeometry(0.026, 0.02, 0.4, 5),
      finger: new THREE.ConeGeometry(0.008, 0.15, 3),
      head: new THREE.SphereGeometry(0.12, 7, 6),
      face: new THREE.PlaneGeometry(0.2, 0.25),
      hairBack: new THREE.PlaneGeometry(0.3, 0.8),
      hairSide: new THREE.PlaneGeometry(0.07, 0.42),
      eye: new THREE.OctahedronGeometry(0.012),
    }),
    [],
  )

  const sp = useMemo(
    () => ({
      walk: spring(),
      roll: spring(),
      lean: spring(),
      skirt: spring(),
      headX: spring(0.42),
      headZ: spring(),
      armL: spring(0.05),
      armR: spring(0.05),
      turn: spring(),
    }),
    [],
  )

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const dt = Math.min(delta, 0.05)
    const b = body.current
    if (!b) return
    const chase = pose.mode === 'chase'
    const walk = stepSpring(sp.walk, Math.min(pose.moving, 2), dt, ANIM.soft)
    turnLag(sp.turn, b, dt, ANIM.turn)
    // passo arrastado: balanço lateral (com mola), a saia atrasa e ondula
    const sway = Math.sin(t * 2.4 * Math.max(walk, 0.3)) * 0.04 * (0.4 + walk)
    const shake = pose.stunned ? Math.sin(t * 45) * 0.07 : 0
    b.rotation.z = stepSpring(sp.roll, sway, dt, ANIM.soft) + shake
    b.rotation.x = stepSpring(sp.lean, chase ? 0.12 : walk * 0.05, dt, ANIM.soft)
    b.position.y = Math.abs(Math.sin(t * 2.4)) * 0.02 * walk
    // a saia gira contra o giro do corpo (inércia do tecido)
    if (skirt.current)
      skirt.current.rotation.y = stepSpring(sp.skirt, Math.sin(t * 1.7) * 0.06 * (0.3 + walk) - sp.turn.v * 0.08, dt, ANIM.head)

    const h = head.current
    if (h) {
      h.rotation.x = stepSpring(sp.headX, chase ? -0.05 : pose.mode === 'alert' ? 0.15 : 0.42, dt, ANIM.head)
      // caçando: tiques bruscos que a mola faz balançar
      const tic = chase ? (Math.sin(t * 23) > 0.85 ? 0.35 : Math.sin(t * 3) * 0.05) : Math.sin(t * 0.8) * 0.04
      h.rotation.z = stepSpring(sp.headZ, tic, dt, ANIM.snappy)
    }
    // braços: caídos e balançando; caçando, esticados para a frente
    const reach = chase ? -1.25 : pose.mode === 'alert' ? -0.25 : 0.05
    for (const [arm, s, side] of [
      [armL.current, sp.armL, -1],
      [armR.current, sp.armR, 1],
    ] as const) {
      if (!arm) continue
      const swing = Math.sin(t * 2.4 + (side > 0 ? Math.PI : 0)) * 0.18 * walk
      arm.rotation.x = stepSpring(s, reach + swing, dt, ANIM.limb)
      arm.rotation.z = side * (chase ? 0.05 : 0.12)
    }
    m.eyes.color.set(chase ? '#ff3020' : pose.mode === 'alert' ? '#a04030' : '#2a1a14')
  })

  const arm = (side: number, ref: React.RefObject<THREE.Group>) => (
    <group ref={ref} position={[side * 0.19, 1.62, 0.01]}>
      <mesh geometry={geo.upper} material={m.skin} position={[0, -0.18, 0]} castShadow />
      <group position={[0, -0.36, 0]} rotation={[-0.12, 0, 0]}>
        <mesh geometry={geo.lower} material={m.skin} position={[0, -0.2, 0]} castShadow />
        {/* dedos compridos */}
        {[-0.022, -0.007, 0.008, 0.022].map((x, i) => (
          <mesh key={i} geometry={geo.finger} material={m.skin} position={[x, -0.47, 0.01]} rotation={[Math.PI, 0, x * 3]} />
        ))}
      </group>
    </group>
  )

  return (
    <group ref={body}>
      <mesh ref={skirt} geometry={geo.skirt} material={m.dress} castShadow receiveShadow />
      <mesh geometry={geo.bodice} material={m.bodice} castShadow />
      <mesh geometry={geo.collar} material={m.lace} position={[0, 1.74, 0]} rotation={[Math.PI / 2, 0, 0]} />
      {arm(-1, armL)}
      {arm(1, armR)}
      <group ref={head} position={[0, 1.88, 0.02]}>
        <mesh geometry={geo.head} material={m.skin} scale={[0.95, 1.18, 1]} castShadow />
        <mesh geometry={geo.face} material={m.face} position={[0, -0.01, 0.112]} />
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={geo.eye} material={m.eyes} position={[s * 0.034, 0.02, 0.118]} />
        ))}
        {/* cabelo: longo atrás e mechas caindo na frente do rosto */}
        <mesh geometry={geo.hairBack} material={m.hair} position={[0, -0.24, -0.1]} rotation={[0.12, 0, 0]} />
        <mesh geometry={geo.head} material={m.hair} position={[0, 0.04, -0.015]} scale={[1.02, 1.05, 1.02]} />
        <mesh geometry={geo.hairSide} material={m.hair} position={[-0.075, -0.1, 0.1]} rotation={[0.1, 0.25, 0.05]} />
        <mesh geometry={geo.hairSide} material={m.hair} position={[0.08, -0.12, 0.1]} rotation={[0.1, -0.25, -0.05]} />
      </group>
    </group>
  )
}
