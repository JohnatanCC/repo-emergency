import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { BuiltLevel } from '../world/buildLevel'
import { beam } from '../game/systems/beam'
import { FLASHLIGHT } from './config'
import { usePlayerStore } from './playerStore'
import { playerFeet } from './playerPos'

/**
 * Lanterna de mão (tecla F). Um spot forte com sombras, preso a um grupo que
 * segue a câmera com um pequeno atraso: ao virar rápido, o feixe "arrasta".
 * (A câmera não fica na cena, por isso a luz não é filha dela.)
 *
 * Bateria: gasta ligada (mais rápido com o feixe na Sombra), recarrega no
 * carro. Fraca, a luz diminui e pisca; zerada, apaga.
 */
export function Flashlight({ built }: { built: BuiltLevel }) {
  const camera = useThree((s) => s.camera)
  const group = useRef<THREE.Group>(null)
  const light = useRef<THREE.SpotLight>(null)
  const spill = useRef<THREE.PointLight>(null)
  const target = useRef<THREE.Object3D>(null)
  /** Bateria acumulada aqui (o gasto por frame é minúsculo); o store só recebe de vez em quando. */
  const acc = useRef({ battery: usePlayerStore.getState().battery, written: usePlayerStore.getState().battery })

  useEffect(() => {
    if (light.current && target.current) light.current.target = target.current
    return () => {
      beam.lit = false
    }
  }, [])

  useFrame(({ clock }, dt) => {
    const g = group.current
    if (!g) return
    g.position.copy(camera.position)
    g.quaternion.slerp(camera.quaternion, 1 - Math.exp(-FLASHLIGHT.follow * dt))

    // bateria
    const player = usePlayerStore.getState()
    const a = acc.current
    // mudou por fora (pilhas, renascer): passa a valer o do store
    if (Math.abs(player.battery - a.written) > 0.001) a.battery = a.written = player.battery
    const on = player.flashlight && a.battery > 0
    let battery = a.battery
    if (on) battery -= FLASHLIGHT.drainPerSec * (beam.onShadow ? FLASHLIGHT.shadowDrain : 1) * dt
    if (built.roomAt(playerFeet.x, playerFeet.z)?.kind === 'car') battery += FLASHLIGHT.rechargePerSec * dt
    battery = Math.max(0, Math.min(100, battery))
    a.battery = battery
    // atualiza o HUD só quando muda o suficiente (ou quando zera/enche)
    if (
      Math.abs(battery - player.battery) > 0.1 ||
      (battery === 0) !== (player.battery === 0) ||
      (battery === 100 && player.battery !== 100)
    ) {
      player.setBattery(battery)
      a.written = battery
    }

    // fraca: diminui e pisca
    let k = 1
    if (on && battery < FLASHLIGHT.lowAt) {
      const t = clock.elapsedTime
      k = 0.35 + 0.65 * (battery / FLASHLIGHT.lowAt)
      if (Math.sin(t * 13) * Math.sin(t * 3.7) > 0.6) k *= 0.25
    }
    beam.lit = on
    if (light.current) {
      light.current.visible = on
      light.current.intensity = FLASHLIGHT.intensity * k
    }
    if (spill.current) {
      spill.current.visible = on
      spill.current.intensity = FLASHLIGHT.spill * k
    }
  })

  return (
    <group ref={group}>
      <spotLight
        ref={light}
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
      <pointLight ref={spill} color={FLASHLIGHT.color} intensity={FLASHLIGHT.spill} distance={3} decay={2} />
    </group>
  )
}
