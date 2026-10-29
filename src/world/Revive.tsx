import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { LevelData } from '../game/data/types'
import type { BuiltLevel } from './buildLevel'
import { usePlayerStore } from '../player/playerStore'
import { useGameStore } from '../game/stores/gameStore'
import { investigatorParts } from '../player/InvestigatorModel'
import { audio } from '../game/audio/engine'
import { PLAYER, REVIVE } from '../player/config'

/**
 * Renascimento no carro: o C.R.O.S remonta o investigador parte por parte,
 * de baixo para cima, com a câmera girando em volta (cena). No fim a câmera
 * entra nos olhos dele e o controle volta.
 *
 *   partes voando até o lugar (mola) → corpo inteiro → câmera nos olhos → jogo
 */

/** Sai do lugar e volta passando um pouco (efeito mola). */
const backOut = (k: number) => {
  const c = 1.9
  return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2
}
const smooth = (k: number) => k * k * (3 - 2 * k)
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export function Revive({ level, built }: { level: LevelData; built: BuiltLevel }) {
  const reviving = usePlayerStore((s) => s.reviving)
  const matchId = useGameStore((s) => s.matchId)
  const camera = useThree((s) => s.camera)
  const parts = useMemo(investigatorParts, [])
  const group = useRef<THREE.Group>(null)
  const partRefs = useRef<(THREE.Group | null)[]>([])
  const light = useRef<THREE.PointLight>(null)

  const feet = useMemo(() => {
    const [x, , z] = built.toWorld(level.playerStart.x, level.playerStart.y)
    return new THREE.Vector3(x, 0, z)
  }, [level, built])

  const st = useRef({
    t: 0,
    yaw: 0,
    endQuat: new THREE.Quaternion(),
    placed: [] as boolean[],
    /** Para onde cada parte voa antes de encaixar (direção e giro), sorteado por cena. */
    from: [] as { off: THREE.Vector3; spin: THREE.Euler }[],
  }).current

  // começa uma cena: guarda para onde o jogador vai olhar e sorteia de onde vêm as partes
  useEffect(() => {
    if (reviving === null) return
    st.t = 0
    st.endQuat.copy(camera.quaternion)
    st.yaw = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ').y
    st.placed = parts.map(() => false)
    st.from = parts.map(() => ({
      off: new THREE.Vector3((Math.random() - 0.5) * 2, 0.6 + Math.random() * 0.9, (Math.random() - 0.5) * 2).multiplyScalar(
        REVIVE.scatter,
      ),
      spin: new THREE.Euler((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6),
    }))
    audio.play('revive', { volume: REVIVE.volume })
  }, [reviving, camera, parts, st])

  // nível novo ou recomeço no meio da cena: encerra
  useEffect(() => () => usePlayerStore.getState().endRevive(), [matchId])

  useFrame((_, delta) => {
    const g = group.current
    if (reviving === null || !g) {
      if (g) g.visible = false
      return
    }
    const dt = Math.min(delta, 0.05)
    st.t += dt
    const t = st.t
    g.visible = true
    g.position.copy(feet)
    // de frente para onde o jogador vai olhar (o modelo olha para +z)
    g.rotation.y = st.yaw + Math.PI

    // partes: cada uma voa e encaixa no seu tempo
    const assembleEnd = (parts.length - 1) * REVIVE.partGap + REVIVE.partTime
    parts.forEach((part, i) => {
      const ref = partRefs.current[i]
      if (!ref) return
      const k = clamp01((t - i * REVIVE.partGap) / REVIVE.partTime)
      ref.visible = k > 0
      const e = backOut(k)
      const from = st.from[i]
      ref.position.set(part.pos[0] + from.off.x * (1 - e), part.pos[1] + from.off.y * (1 - e), part.pos[2] + from.off.z * (1 - e))
      ref.rotation.set(from.spin.x * (1 - k), from.spin.y * (1 - k), from.spin.z * (1 - k))
      if (k >= 1 && !st.placed[i]) {
        st.placed[i] = true
        const w = ref.getWorldPosition(new THREE.Vector3())
        audio.play('assemble', { pos: [w.x, w.y, w.z], volume: REVIVE.volume * 0.8, rate: 0.85 + Math.random() * 0.3 })
      }
    })

    // brilho roxo do C.R.O.S enquanto monta
    if (light.current) {
      const glow = t < assembleEnd ? 0.6 + 0.4 * Math.sin(t * 22) : Math.max(0, 1 - (t - assembleEnd) * 2)
      light.current.intensity = glow * REVIVE.light
      light.current.position.set(feet.x, 1.1, feet.z)
    }

    // câmera: gira em volta do corpo enquanto monta; depois entra nos olhos
    const eye = feet.clone().setY(PLAYER.standEye)
    const p = clamp01(t / assembleEnd)
    const angle = st.yaw + Math.PI + REVIVE.orbitFrom + (REVIVE.orbitTo - REVIVE.orbitFrom) * smooth(p)
    const orbit = new THREE.Vector3(
      feet.x + Math.sin(angle) * REVIVE.radius,
      THREE.MathUtils.lerp(REVIVE.heightFrom, REVIVE.heightTo, smooth(p)),
      feet.z + Math.cos(angle) * REVIVE.radius,
    )
    const look = feet.clone().setY(THREE.MathUtils.lerp(0.7, 1.4, smooth(p)))
    const orbitQuat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(orbit, look, new THREE.Vector3(0, 1, 0)))
    const k = smooth(clamp01((t - assembleEnd - REVIVE.hold) / REVIVE.enter))
    camera.position.lerpVectors(orbit, eye, k)
    camera.quaternion.slerpQuaternions(orbitQuat, st.endQuat, k)
    // entrando nos olhos: o corpo some para a câmera não ver o próprio rosto por dentro
    if (k > 0.85) g.visible = false

    if (t >= assembleEnd + REVIVE.hold + REVIVE.enter) {
      camera.position.copy(eye)
      camera.quaternion.copy(st.endQuat)
      g.visible = false
      usePlayerStore.getState().endRevive()
    }
  })

  return (
    <>
      <group ref={group} visible={false}>
        {parts.map((part, i) => (
          <group
            key={part.name}
            ref={(el) => {
              partRefs.current[i] = el
            }}
          >
            {part.meshes.map((mesh, j) => (
              <mesh key={j} geometry={mesh.geo} material={mesh.mat} position={mesh.pos} rotation={mesh.rot} castShadow />
            ))}
          </group>
        ))}
      </group>
      <pointLight ref={light} color="#9a6aff" intensity={0} distance={5} />
    </>
  )
}
