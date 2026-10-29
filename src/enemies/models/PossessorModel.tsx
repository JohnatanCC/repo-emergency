import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { psxBasic, raggedLathe } from './psx'
import { creatureTextures } from './textures'
import type { Pose } from './pose'
import { spring, stepSpring, turnLag } from './spring'
import { ANIM } from './config'

/**
 * A figura do Possessor (pés em y = 0): fantasma translúcido que flutua, de
 * cauda esfarrapada ondulando, rosto que grita e braços estendidos para a
 * frente. Tremula e, no fim, some (pose.fade).
 */
export function PossessorModel({ pose }: { pose: Pose }) {
  const body = useRef<THREE.Group>(null)
  const tail = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)

  const m = useMemo(() => {
    const t = creatureTextures()
    return {
      ghost: psxBasic({ color: '#cfe6da', transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }),
      face: psxBasic({ map: t.ghostFace, transparent: true, opacity: 0.85, depthWrite: false }),
    }
  }, [])
  const geo = useMemo(
    () => ({
      torso: raggedLathe(
        [
          [0.2, 0.95],
          [0.25, 1.15],
          [0.28, 1.36],
          [0.2, 1.5],
          [0.08, 1.56],
        ],
        7,
        0.25,
        3,
      ),
      tailSeg: raggedLathe(
        [
          [0.21, 0],
          [0.18, 0.2],
          [0.13, 0.42],
          [0.07, 0.62],
          [0.01, 0.85],
        ],
        7,
        0.45,
        11,
      ),
      head: new THREE.SphereGeometry(0.14, 6, 5),
      face: new THREE.PlaneGeometry(0.24, 0.3),
      arm: new THREE.CylinderGeometry(0.03, 0.012, 0.7, 4),
      finger: new THREE.ConeGeometry(0.008, 0.14, 3),
    }),
    [],
  )

  const sp = useMemo(
    () => ({ bob: spring(), tailX: spring(), tailZ: spring(), armL: spring(-1.35), armR: spring(-1.35), turn: spring() }),
    [],
  )

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const dt = Math.min(delta, 0.05)
    const b = body.current
    if (!b) return
    turnLag(sp.turn, b, dt, ANIM.turn)
    // flutua, tremula e some no fim
    m.ghost.opacity = (0.22 + 0.25 * Math.abs(Math.sin(t * 9) * Math.sin(t * 2.3))) * pose.fade
    m.face.opacity = 0.85 * pose.fade
    const bob = stepSpring(sp.bob, Math.sin(t * 2) * 0.08, dt, ANIM.soft)
    b.position.set((Math.random() - 0.5) * 0.03, bob, (Math.random() - 0.5) * 0.03)
    b.scale.setScalar(0.6 + 0.4 * pose.fade)
    b.rotation.z = pose.stunned ? Math.sin(t * 45) * 0.1 : 0
    // cauda: segue a velocidade de giro do corpo (chicoteia nas curvas) e ondula
    const tl = tail.current
    if (tl) {
      tl.rotation.x = stepSpring(sp.tailX, Math.sin(t * 3) * 0.25 + sp.bob.v * 1.5, dt, ANIM.head)
      tl.rotation.z = stepSpring(sp.tailZ, Math.cos(t * 2.4) * 0.15 + sp.turn.v * 0.25, dt, ANIM.head)
    }
    for (const [arm, s, side] of [
      [armL.current, sp.armL, -1],
      [armR.current, sp.armR, 1],
    ] as const) {
      // garras abrindo e fechando, cada braço num tempo
      if (arm) arm.rotation.x = stepSpring(s, -1.35 + (Math.sin(t * 2.2 + side) > 0.6 ? -0.4 : 0.1), dt, ANIM.limb)
    }
  })

  return (
    <group ref={body}>
      {/* cauda esfarrapada pendendo até perto do chão (de cabeça para baixo) */}
      <group position={[0, 0.96, 0]} rotation={[Math.PI, 0, 0]}>
        <group ref={tail}>
          <mesh geometry={geo.tailSeg} material={m.ghost} />
        </group>
      </group>
      <mesh geometry={geo.torso} material={m.ghost} />
      {[
        [armL, -1],
        [armR, 1],
      ].map(([ref, s]) => (
        <group key={s as number} ref={ref as React.RefObject<THREE.Group>} position={[(s as number) * 0.25, 1.38, 0]}>
          <mesh geometry={geo.arm} material={m.ghost} position={[0, -0.35, 0]} />
          {[-0.02, 0, 0.02].map((x, i) => (
            <mesh key={i} geometry={geo.finger} material={m.ghost} position={[x, -0.75, 0]} rotation={[Math.PI, 0, x * 5]} />
          ))}
        </group>
      ))}
      <group position={[0, 1.66, 0]}>
        <mesh geometry={geo.head} material={m.ghost} scale={[0.95, 1.2, 0.95]} />
        <mesh geometry={geo.face} material={m.face} position={[0, 0, 0.135]} />
      </group>
    </group>
  )
}
