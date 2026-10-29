import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { usePlayerStore, type Killer } from '../player/playerStore'
import { audio } from '../game/audio/engine'
import { useGameStore } from '../game/stores/gameStore'
import { GuardiaModel } from '../enemies/models/GuardiaModel'
import { SombraModel } from '../enemies/models/SombraModel'
import { PossessorModel } from '../enemies/models/PossessorModel'
import { newPose, type Pose } from '../enemies/models/pose'
import { EspectroModel } from '../enemies/models/EspectroModel'
import { ESPECTRO } from '../enemies/espectro/config'
import { POSSESSOR } from '../enemies/possessor/config'
import { JUMPSCARE } from './config'

const MODELS: Record<Killer, typeof GuardiaModel> = {
  guardia: GuardiaModel,
  sombra: SombraModel,
  possessor: PossessorModel,
  espectro: EspectroModel,
}
/** Quanto cada uma flutua (o modelo tem os pés em y = 0). */
const LIFT: Partial<Record<Killer, number>> = { possessor: POSSESSOR.hover, espectro: ESPECTRO.hover }

/**
 * Câmera avançando contra o rosto, tremendo, com a luz piscando. Com `stare`
 * (o Espectro), antes disso ela chega devagar e fica parada encarando; só no
 * fim a boca abre (pose.attack) e o avanço acontece.
 */
function Lunge({ by, pose, stare }: { by: Killer; pose: Pose; stare: number }) {
  const light = useRef<THREE.PointLight>(null)
  const frame = JUMPSCARE.framing[by]
  const start = useRef<number | null>(null)
  useFrame(({ camera, clock }) => {
    start.current ??= clock.elapsedTime
    const t = clock.elapsedTime - start.current
    if (t < stare) {
      // encarando: chega devagar, quase sem tremer; a luz respira
      const k = 1 - Math.exp(-t * 0.8)
      const z = frame.from + (JUMPSCARE.stareTo - frame.from) * k
      camera.position.set(Math.sin(t * 0.7) * 0.01, frame.eye + Math.sin(t * 0.5) * 0.008, z)
      camera.lookAt(0, frame.look, 0)
      pose.attack = 0
      if (light.current) light.current.intensity = JUMPSCARE.light * (0.35 + 0.1 * Math.sin(t * 2)) * (Math.random() < 0.03 ? 0.2 : 1)
      return
    }
    const tt = t - stare
    // a boca abre de uma vez
    if (stare > 0) pose.attack = Math.min(1, tt / 0.25)
    // avança rápido nos primeiros instantes e fica colado, tremendo
    const k = 1 - Math.exp(-tt * JUMPSCARE.lungeSpeed)
    const from = stare > 0 ? JUMPSCARE.stareTo : frame.from
    const z = from + (frame.to - from) * k
    const shake = JUMPSCARE.shake * (0.4 + k)
    camera.position.set((Math.random() - 0.5) * shake, frame.eye + (Math.random() - 0.5) * shake, z)
    // o Espectro abre o peito: a câmera desce o olhar um pouco
    camera.lookAt(0, frame.look - (stare > 0 ? pose.attack * 0.16 : 0), 0)
    if (light.current) light.current.intensity = Math.random() < 0.18 ? 0.3 : JUMPSCARE.light
  })
  return <pointLight ref={light} position={[0.25, frame.look + 0.3, 0.9]} color="#ffd9c0" distance={4} />
}

/**
 * Morte por uma criatura: o rosto dela avança contra a tela com um estouro de
 * som, e o sinal da fita cai. Roda num Canvas separado, por cima de tudo,
 * enquanto o jogo já renasce no carro por trás.
 */
export function Jumpscare() {
  const scare = usePlayerStore((s) => s.jumpscare)
  const clearScare = usePlayerStore((s) => s.clearScare)
  const [lost, setLost] = useState(false)
  const [staring, setStaring] = useState(false)
  // pose de caça: olhos acesos, braços estendidos
  // pose de cada uma no susto (a Guardiã no meio do bote, com o rosto à mostra; a Sombra de pé, enorme)
  const poses = useMemo(
    () => ({
      guardia: { ...newPose(), mode: 'chase' as const, attack: 0.6 },
      sombra: { ...newPose(), mode: 'calm' as const },
      possessor: { ...newPose(), mode: 'chase' as const, moving: 0.6 },
      // o Espectro encara de cabeça reta; a boca é aberta pelo Lunge no fim
      espectro: { ...newPose(), mode: 'alert' as const },
    }),
    [],
  )

  useEffect(() => {
    if (!scare) return
    setLost(false)
    const stare = JUMPSCARE.stare[scare.by] ?? 0
    const timers: ReturnType<typeof setTimeout>[] = []
    if (stare > 0) {
      // encarando: só o coração, cada vez mais rápido, e um chiado subindo
      setStaring(true)
      let beat = 0
      for (let at = 0; at < stare; at += Math.max(0.35, 0.95 - beat++ * 0.06))
        timers.push(setTimeout(() => audio.play('heartbeat', { volume: 0.5 + at / stare / 2, rate: 0.9 + at / stare / 4 }), at * 1000))
      timers.push(
        setTimeout(() => {
          setStaring(false)
          audio.play('espectroScream', { volume: JUMPSCARE.volume })
          audio.play('scare', { volume: JUMPSCARE.volume * 0.8 })
        }, stare * 1000),
      )
    } else audio.play('scare', { volume: JUMPSCARE.volume })
    const a = setTimeout(() => setLost(true), (stare + JUMPSCARE.duration) * 1000)
    const b = setTimeout(
      () => {
        clearScare()
        // perdeu a última vida: fica no fim de jogo, sem renascer
        if (useGameStore.getState().phase !== 'gameover') usePlayerStore.getState().startRevive()
      },
      (stare + JUMPSCARE.duration + JUMPSCARE.static) * 1000,
    )
    return () => {
      clearTimeout(a)
      clearTimeout(b)
      timers.forEach(clearTimeout)
    }
  }, [scare, clearScare])

  if (!scare) return null
  const Model = MODELS[scare.by]
  return (
    <div className="jumpscare">
      {!lost && (
        <Canvas
          key={scare.id}
          dpr={JUMPSCARE.dpr}
          className="retro"
          gl={{ preserveDrawingBuffer: import.meta.env.DEV }}
          camera={{ fov: 55, near: 0.02, far: 20 }}
        >
          <color attach="background" args={['#000000']} />
          <ambientLight intensity={0.25} />
          <Lunge by={scare.by} pose={poses[scare.by]} stare={JUMPSCARE.stare[scare.by] ?? 0} />
          <group position={[0, LIFT[scare.by] ?? 0, 0]}>
            <Model pose={poses[scare.by]} />
          </group>
        </Canvas>
      )}
      <div className={lost ? 'static lost' : staring ? 'static stare' : 'static'} />
      {lost && <div className="signal">▮▮ SINAL PERDIDO</div>}
    </div>
  )
}
