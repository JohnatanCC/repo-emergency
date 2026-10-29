import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { psxBasic, raggedLathe } from './psx'
import type { Pose } from './pose'

/**
 * A Sombra (pés em y = 0): silhueta preta, esguia e irregular — ombros
 * pontudos, braços longos até os joelhos com garras, cabeça alongada e fios de
 * fumaça em volta. Preto puro: nem a lanterna clareia; só os olhos aparecem.
 * Avançando, inclina para a frente; no feixe, congela e treme.
 */
export function SombraModel({ pose }: { pose: Pose }) {
  const body = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const wisps = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)

  const m = useMemo(
    () => ({
      black: psxBasic({ color: '#000000' }),
      smoke: psxBasic({ color: '#000000', transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
      eyes: psxBasic({ color: '#8f8a80' }),
    }),
    [],
  )
  const geo = useMemo(
    () => ({
      torso: raggedLathe(
        [
          [0.05, 0.75],
          [0.13, 0.9],
          [0.17, 1.2],
          [0.22, 1.45],
          [0.12, 1.58],
          [0.05, 1.62],
        ],
        6,
        0.35,
        7,
      ),
      leg: new THREE.ConeGeometry(0.07, 0.8, 4),
      spike: new THREE.ConeGeometry(0.05, 0.22, 3),
      arm: new THREE.CylinderGeometry(0.03, 0.015, 0.95, 4),
      claw: new THREE.ConeGeometry(0.01, 0.2, 3),
      head: new THREE.SphereGeometry(0.11, 5, 4),
      eye: new THREE.OctahedronGeometry(0.014),
      wisp: new THREE.PlaneGeometry(0.06, 0.7),
    }),
    [],
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const b = body.current
    if (!b) return
    const run = Math.min(pose.moving, 1.6)
    // avançando: inclina para a frente; no feixe congela (e treme)
    b.rotation.x = pose.lit ? 0 : run * 0.28
    b.position.x = pose.lit || pose.stunned ? Math.sin(t * 60) * 0.01 : 0
    b.rotation.z = pose.lit ? 0 : Math.sin(t * 1.7) * 0.05
    if (head.current) head.current.rotation.z = pose.lit ? Math.sin(t * 31) * 0.08 : Math.sin(t * 0.9) * 0.15
    for (const [arm, side] of [
      [armL.current, -1],
      [armR.current, 1],
    ] as const) {
      if (!arm) continue
      arm.rotation.x = pose.lit ? -0.2 : -run * 0.5 + Math.sin(t * 6 * run + side) * 0.3 * run
    }
    // fumaça: ondula e some/aparece
    const w = wisps.current
    if (w) {
      w.rotation.y = t * 0.6
      w.children.forEach((c, i) => {
        c.rotation.z = Math.sin(t * 2 + i) * 0.35
        c.scale.y = 0.6 + 0.4 * Math.abs(Math.sin(t * 1.3 + i * 1.7))
      })
    }
    m.eyes.color.set(pose.lit ? '#ffffff' : '#8f8a80')
  })

  return (
    <group ref={body}>
      <mesh geometry={geo.torso} material={m.black} />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={geo.leg} material={m.black} position={[s * 0.07, 0.4, 0]} rotation={[Math.PI, 0, s * 0.05]} />
      ))}
      {/* ombros pontudos */}
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={geo.spike} material={m.black} position={[s * 0.2, 1.52, 0]} rotation={[0, 0, -s * 0.9]} />
      ))}
      {[
        [armL, -1],
        [armR, 1],
      ].map(([ref, s]) => (
        <group key={s as number} ref={ref as React.RefObject<THREE.Group>} position={[(s as number) * 0.24, 1.45, 0]}>
          <mesh geometry={geo.arm} material={m.black} position={[0, -0.47, 0]} />
          {[-0.02, 0, 0.02].map((x, i) => (
            <mesh key={i} geometry={geo.claw} material={m.black} position={[x, -1.02, 0.02]} rotation={[Math.PI, 0, x * 4]} />
          ))}
        </group>
      ))}
      <group ref={head} position={[0, 1.75, 0.03]}>
        <mesh geometry={geo.head} material={m.black} scale={[0.8, 1.6, 0.9]} />
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={geo.eye} material={m.eyes} position={[s * 0.035, 0.03, 0.095]} />
        ))}
      </group>
      <group ref={wisps} position={[0, 1.1, 0]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            geometry={geo.wisp}
            material={m.smoke}
            position={[Math.cos(i * 1.26) * 0.24, 0, Math.sin(i * 1.26) * 0.24]}
            rotation={[0, i * 1.26, 0]}
          />
        ))}
      </group>
    </group>
  )
}
