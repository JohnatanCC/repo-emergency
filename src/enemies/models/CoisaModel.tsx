import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { psxBasic, psxStandard, raggedLathe } from './psx'
import { creatureTextures } from './textures'
import { HEAD } from '../../items/catalog'
import type { Pose } from './pose'
import { spring, stepSpring, turnLag } from './spring'
import { ANIM } from './config'

/**
 * A COISA (pés em y = 0): espírito negro de fumaça, curvado e pequeno, com
 * perninhas que correm quando foge e braços magros em volta da cabeça do
 * investigador (rosto de olhos fechados) apertada contra o peito.
 */
export function CoisaModel({ pose }: { pose: Pose }) {
  const body = useRef<THREE.Group>(null)
  const legs = useRef<THREE.Group>(null)

  const m = useMemo(() => {
    const t = creatureTextures()
    return {
      // não reflete luz (nem a lanterna), levemente translúcido como fumaça
      smoke: psxBasic({ color: '#000000', transparent: true, opacity: 0.9 }),
      skin: psxStandard({ color: HEAD.color }),
      face: psxBasic({ map: t.headFace, transparent: true, alphaTest: 0.5, color: '#c8b8a8' }),
      hair: psxStandard({ color: '#2a1c12' }),
    }
  }, [])
  const geo = useMemo(
    () => ({
      body: raggedLathe(
        [
          [0.06, 0.3],
          [0.26, 0.45],
          [0.3, 0.7],
          [0.24, 0.95],
          [0.12, 1.08],
        ],
        6,
        0.4,
        5,
      ),
      hood: new THREE.SphereGeometry(0.13, 5, 4),
      leg: new THREE.CylinderGeometry(0.02, 0.012, 0.32, 4),
      arm: new THREE.CylinderGeometry(0.022, 0.015, 0.42, 4),
      head: new THREE.SphereGeometry(HEAD.dims[0], 8, 6),
      hair: new THREE.SphereGeometry(HEAD.dims[0], 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
      face: new THREE.PlaneGeometry(0.2, 0.24),
    }),
    [],
  )

  const sp = useMemo(() => ({ run: spring(), lean: spring(0.35), hop: spring(), turn: spring() }), [])

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const dt = Math.min(delta, 0.05)
    const b = body.current
    if (!b) return
    const run = stepSpring(sp.run, pose.moving, dt, ANIM.snappy)
    turnLag(sp.turn, b, dt, ANIM.turn)
    m.smoke.opacity = 0.82 + 0.1 * Math.sin(t * 7)
    // curvada; correndo, mais baixa e quicando
    b.rotation.x = stepSpring(sp.lean, 0.35 + Math.min(run, 2) * 0.15, dt, ANIM.soft) + Math.sin(t * 3) * 0.03
    b.position.y = stepSpring(sp.hop, Math.abs(Math.sin(t * (run > 0.2 ? 14 : 4))) * (run > 0.2 ? 0.07 : 0.03), dt, ANIM.snappy)
    b.rotation.z = (pose.stunned ? Math.sin(t * 45) * 0.1 : 0) - sp.turn.v * 0.05
    legs.current?.children.forEach((l, i) => {
      l.rotation.x = Math.sin(t * 16 + i * Math.PI) * 0.8 * Math.min(run, 1)
    })
  })

  return (
    <group ref={body}>
      <group ref={legs} position={[0, 0.32, 0]}>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.08, 0, 0]}>
            <mesh geometry={geo.leg} material={m.smoke} position={[0, -0.16, 0]} />
          </group>
        ))}
      </group>
      <mesh geometry={geo.body} material={m.smoke} castShadow />
      <mesh geometry={geo.hood} material={m.smoke} position={[0, 1.12, 0.12]} scale={[1, 0.9, 1.1]} />
      {/* braços em volta da cabeça */}
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={geo.arm} material={m.smoke} position={[s * 0.15, 0.78, 0.22]} rotation={[1.25, 0, s * -0.55]} />
      ))}
      <group position={[0, 0.74, 0.3]} rotation={[0.25, 0.35, 0.2]}>
        <mesh geometry={geo.head} material={m.skin} castShadow />
        <mesh geometry={geo.hair} material={m.hair} position={[0, 0.03, -0.02]} scale={[1.08, 1.05, 1.08]} />
        <mesh geometry={geo.face} material={m.face} position={[0, -0.01, HEAD.dims[0] - 0.005]} />
      </group>
    </group>
  )
}
