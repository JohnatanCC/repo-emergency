import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { audio, type LoopHandle } from '../game/audio/engine'
import { AUDIO } from '../game/audio/sounds'
import { danger } from '../game/systems/danger'
import { isPaused, useGameStore } from '../game/stores/gameStore'
import { useHidingStore } from './hidingStore'
import { possession, usePlayerStore } from './playerStore'
import { IMMERSION, PLAYER } from './config'
import { spring, stepSpring } from '../enemies/models/spring'
import { ANIM } from '../enemies/models/config'

/**
 * Corpo do investigador sentindo a casa:
 *  - respiração ofegante correndo, cansado ou com uma criatura perto
 *  - campo de visão que abre um pouco correndo e fecha com a tensão (visão de túnel)
 *  - câmera que inclina de leve ao andar de lado
 */
export function Immersion() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const breath = useRef<LoopHandle | null>(null)
  const st = useMemo(() => ({ last: new THREE.Vector3(), roll: spring(), fov: spring(IMMERSION.fov), breath: 0 }), [])
  const tmp = useMemo(() => ({ right: new THREE.Vector3(), e: new THREE.Euler(0, 0, 0, 'YXZ') }), [])

  useEffect(() => {
    breath.current = audio.loop('breath', { volume: 0 })
    st.last.copy(camera.position)
    return () => {
      breath.current?.stop()
      camera.fov = IMMERSION.fov
      camera.updateProjectionMatrix()
    }
  }, [camera, st])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const player = usePlayerStore.getState()
    const phase = useGameStore.getState().phase
    const active = player.locked && player.reviving === null && !isPaused(phase) && !useHidingStore.getState().wardrobeId

    // velocidade da câmera (m/s) e quanto disso é para o lado
    const vel = camera.position.clone().sub(st.last).divideScalar(Math.max(dt, 1e-3))
    st.last.copy(camera.position)
    const speed = Math.hypot(vel.x, vel.z)
    tmp.right.set(1, 0, 0).applyQuaternion(camera.quaternion)
    const lateral = vel.x * tmp.right.x + vel.z * tmp.right.z
    const running = active && speed > PLAYER.walkSpeed + 0.5

    // respiração: esforço (estamina gasta) + medo (perigo)
    const effort = 1 - player.stamina / PLAYER.maxStamina
    const target = active ? Math.min(1, effort * 1.2 + (player.exhausted ? 0.4 : 0) + danger.level * 0.6) : 0
    st.breath += (target - st.breath) * Math.min(1, dt * 1.5)
    breath.current?.setVolume(AUDIO.breath * st.breath, 0.2)
    breath.current?.setRate(0.85 + st.breath * 0.45)

    // campo de visão
    const fovTarget = IMMERSION.fov + (running ? IMMERSION.fovRun : 0) - (active ? danger.level * IMMERSION.fovDanger : 0)
    const fov = stepSpring(st.fov, fovTarget, dt, ANIM.soft)
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }

    // inclinação ao andar de lado (a cena do renascimento e o armário cuidam da própria câmera)
    if (!active) {
      st.roll.x = st.roll.v = 0
      return
    }
    // possuído: algo puxa a cabeça para os lados e a imagem inclina
    const p = possession()
    const t = performance.now() / 1000
    const roll = stepSpring(
      st.roll,
      THREE.MathUtils.clamp(-lateral * IMMERSION.strafeRoll, -0.05, 0.05) + p * Math.sin(t * 1.7) * 0.18,
      dt,
      ANIM.soft,
    )
    tmp.e.setFromQuaternion(camera.quaternion, 'YXZ')
    tmp.e.z = roll
    if (p > 0) {
      tmp.e.y += Math.sin(t * 0.9) * p * dt * 0.9
      tmp.e.x = THREE.MathUtils.clamp(tmp.e.x + Math.sin(t * 1.3 + 1) * p * dt * 0.5, -1.4, 1.4)
    }
    camera.quaternion.setFromEuler(tmp.e)
  })

  return null
}
