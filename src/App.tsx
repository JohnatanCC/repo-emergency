import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { World } from './world/World'
import { RetroEffects } from './fx/RetroEffects'
import { Hud } from './ui/Hud'
import { useGameStore } from './game/stores/gameStore'
import { getLevel } from './game/data/levels'

/** Resolução interna no modo retrô (fração da resolução da tela). */
const RETRO_DPR = 0.4

export default function App() {
  const levelIndex = useGameStore((s) => s.levelIndex)
  const debug = useGameStore((s) => s.debug)
  const level = getLevel(levelIndex)

  return (
    <>
      <Canvas
        shadows
        className={debug.retro ? 'retro' : undefined}
        dpr={debug.retro ? RETRO_DPR : [1, 2]}
        // dev: guarda o último quadro para dar para copiar o canvas nos testes (toDataURL)
        gl={{ antialias: !debug.retro, preserveDrawingBuffer: import.meta.env.DEV }}
        camera={{ position: [-6, 26, 30], fov: 60, near: 0.05, far: 200 }}
      >
        <color attach="background" args={['#050403']} />
        {debug.fog && <fog attach="fog" args={['#050403', 18, 60]} />}
        <Suspense fallback={null}>
          <World level={level} />
        </Suspense>
        {debug.retro && <RetroEffects />}
      </Canvas>
      <Hud level={level} />
    </>
  )
}
