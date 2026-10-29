import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { GuardiaModel } from '../enemies/models/GuardiaModel'
import { SombraModel } from '../enemies/models/SombraModel'
import { PossessorModel } from '../enemies/models/PossessorModel'
import { CoisaModel } from '../enemies/models/CoisaModel'
import { newPose, type Pose } from '../enemies/models/pose'
import { RetroEffects } from '../fx/RetroEffects'

/**
 * Galeria das criaturas (só em dev: `?galeria`). Mostra os modelos lado a
 * lado, com controles de pose, para ajustar o visual sem caçar cada uma no mapa.
 */
export function Gallery() {
  const pose = useMemo<Pose>(() => newPose(), [])
  const [, redraw] = useState(0)
  const set = (patch: Partial<Pose>) => {
    Object.assign(pose, patch)
    redraw((n) => n + 1)
  }
  return (
    <>
      <Canvas dpr={0.5} className="retro" gl={{ preserveDrawingBuffer: true }} camera={{ position: [0, 1.3, 6.5], fov: 45 }}>
        <color attach="background" args={['#2a2420']} />
        <ambientLight intensity={0.6} />
        <spotLight position={[0, 2, 4]} angle={0.7} intensity={30} />
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[12, 6]} />
          <meshStandardMaterial color="#3a3028" />
        </mesh>
        {[GuardiaModel, SombraModel, PossessorModel, CoisaModel].map((Model, i) => (
          <group key={i} position={[-2.1 + i * 1.4, i === 2 ? 0.35 : 0, 0]}>
            <Model pose={pose} />
          </group>
        ))}
        <OrbitControls target={[0, 1, 0]} />
        <RetroEffects />
      </Canvas>
      <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 6, fontSize: 18 }}>
        {(['calm', 'alert', 'chase'] as const).map((m) => (
          <button key={m} onClick={() => set({ mode: m })}>
            {m}
          </button>
        ))}
        <button onClick={() => set({ moving: pose.moving ? 0 : 1 })}>andar {pose.moving ? '✓' : ''}</button>
        <button onClick={() => set({ lit: !pose.lit })}>luz {pose.lit ? '✓' : ''}</button>
        <button onClick={() => set({ stunned: !pose.stunned })}>atordoada {pose.stunned ? '✓' : ''}</button>
      </div>
    </>
  )
}
