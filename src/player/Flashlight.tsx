import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { FLASHLIGHT } from './config'
import { usePlayerStore } from './playerStore'

/**
 * Lanterna de mão (tecla F). Um spot forte com sombras, preso a um grupo que
 * segue a câmera com um pequeno atraso: ao virar rápido, o feixe "arrasta".
 * (A câmera não fica na cena, por isso a luz não é filha dela.)
 */
export function Flashlight() {
  const on = usePlayerStore((s) => s.flashlight)
  const camera = useThree((s) => s.camera)
  const group = useRef<THREE.Group>(null)
  const light = useRef<THREE.SpotLight>(null)
  const target = useRef<THREE.Object3D>(null)

  useEffect(() => {
    if (light.current && target.current) light.current.target = target.current
  }, [])

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    g.position.copy(camera.position)
    g.quaternion.slerp(camera.quaternion, 1 - Math.exp(-FLASHLIGHT.follow * dt))
  })

  return (
    <group ref={group}>
      <spotLight
        ref={light}
        visible={on}
        position={FLASHLIGHT.offset}
        color={FLASHLIGHT.color}
        intensity={FLASHLIGHT.intensity}
        distance={FLASHLIGHT.distance}
        decay={FLASHLIGHT.decay}
        angle={FLASHLIGHT.angle}
        penumbra={FLASHLIGHT.penumbra}
        castShadow
        shadow-mapSize={[FLASHLIGHT.shadowMapSize, FLASHLIGHT.shadowMapSize]}
        shadow-bias={-0.0004}
        shadow-camera-near={0.1}
        shadow-camera-far={FLASHLIGHT.distance}
      />
      <object3D ref={target} position={[FLASHLIGHT.offset[0] * 0.3, FLASHLIGHT.offset[1] * 0.3, -6]} />
      <pointLight visible={on} color={FLASHLIGHT.color} intensity={FLASHLIGHT.spill} distance={3} decay={2} />
    </group>
  )
}
