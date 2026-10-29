import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { usePlayerStore, type Killer } from '../player/playerStore'
import { audio } from '../game/audio/engine'
import { useGameStore } from '../game/stores/gameStore'
import { GuardiaModel } from '../enemies/models/GuardiaModel'
import { SombraModel } from '../enemies/models/SombraModel'
import { PossessorModel } from '../enemies/models/PossessorModel'
import { newPose } from '../enemies/models/pose'
import { POSSESSOR } from '../enemies/possessor/config'
import { JUMPSCARE } from './config'

const MODELS: Record<Killer, typeof GuardiaModel> = { guardia: GuardiaModel, sombra: SombraModel, possessor: PossessorModel }

/** Câmera avançando contra o rosto, tremendo, com a luz piscando. */
function Lunge({ by }: { by: Killer }) {
  const light = useRef<THREE.PointLight>(null)
  const frame = JUMPSCARE.framing[by]
  const start = useRef<number | null>(null)
  useFrame(({ camera, clock }) => {
    start.current ??= clock.elapsedTime
    const t = clock.elapsedTime - start.current
    // avança rápido nos primeiros instantes e fica colado, tremendo
    const k = 1 - Math.exp(-t * JUMPSCARE.lungeSpeed)
    const z = frame.from + (frame.to - frame.from) * k
    const shake = JUMPSCARE.shake * (0.4 + k)
    camera.position.set((Math.random() - 0.5) * shake, frame.eye + (Math.random() - 0.5) * shake, z)
    camera.lookAt(0, frame.eye - 0.02, 0)
    if (light.current) light.current.intensity = Math.random() < 0.18 ? 0.3 : JUMPSCARE.light
  })
  return <pointLight ref={light} position={[0.25, frame.eye + 0.3, 0.9]} color="#ffd9c0" distance={4} />
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
  // pose de caça: olhos acesos, braços estendidos
  const pose = useMemo(() => ({ ...newPose(), mode: 'chase' as const, moving: 0.6 }), [])

  useEffect(() => {
    if (!scare) return
    setLost(false)
    audio.play('scare', { volume: JUMPSCARE.volume })
    const a = setTimeout(() => setLost(true), JUMPSCARE.duration * 1000)
    const b = setTimeout(
      () => {
        clearScare()
        // perdeu a última vida: fica no fim de jogo, sem renascer
        if (useGameStore.getState().phase !== 'gameover') usePlayerStore.getState().startRevive()
      },
      (JUMPSCARE.duration + JUMPSCARE.static) * 1000,
    )
    return () => {
      clearTimeout(a)
      clearTimeout(b)
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
          <Lunge by={scare.by} />
          <group position={[0, scare.by === 'possessor' ? POSSESSOR.hover : 0, 0]}>
            <Model pose={pose} />
          </group>
        </Canvas>
      )}
      <div className={lost ? 'static lost' : 'static'} />
      {lost && <div className="signal">▮▮ SINAL PERDIDO</div>}
    </div>
  )
}
