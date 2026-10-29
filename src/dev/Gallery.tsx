import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { GuardiaModel } from '../enemies/models/GuardiaModel'
import { SombraModel } from '../enemies/models/SombraModel'
import { PossessorModel } from '../enemies/models/PossessorModel'
import { CoisaModel } from '../enemies/models/CoisaModel'
import { EspectroModel } from '../enemies/models/EspectroModel'
import { newPose, type Pose } from '../enemies/models/pose'
import { RetroEffects } from '../fx/RetroEffects'

/**
 * Galeria das criaturas (só em dev: `?galeria`). Mostra os modelos lado a
 * lado, com controles de pose, para ajustar o visual sem caçar cada uma no mapa.
 */
/** Ordem na galeria, nome para o foco (?galeria=espectro) e quanto flutua. */
const MODELS = [
  { name: 'guardia', Model: GuardiaModel, lift: 0 },
  { name: 'sombra', Model: SombraModel, lift: 0 },
  { name: 'possessor', Model: PossessorModel, lift: 0.35 },
  { name: 'coisa', Model: CoisaModel, lift: 0 },
  { name: 'espectro', Model: EspectroModel, lift: 0.32 },
]

export function Gallery() {
  const pose = useMemo<Pose>(() => newPose(), [])
  // ?galeria=nome mostra só uma, de perto
  const focus = new URLSearchParams(location.search).get('galeria') || ''
  const shown = MODELS.filter((m) => !focus || m.name === focus)
  // &rosto: câmera colada no rosto
  const face = new URLSearchParams(location.search).has('rosto')
  const [, redraw] = useState(0)
  const set = (patch: Partial<Pose>) => {
    Object.assign(pose, patch)
    redraw((n) => n + 1)
  }
  return (
    <>
      <Canvas
        dpr={0.5}
        className="retro"
        gl={{ preserveDrawingBuffer: true }}
        camera={{ position: face ? [0, 1.93, 0.8] : focus ? [0, 1.85, 1.7] : [0, 1.3, 6.5], fov: 45 }}
      >
        <color attach="background" args={['#2a2420']} />
        <ambientLight intensity={0.6} />
        <spotLight position={[0, 2, 4]} angle={0.7} intensity={30} />
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[12, 6]} />
          <meshStandardMaterial color="#3a3028" />
        </mesh>
        {shown.map(({ name, Model, lift }, i) => (
          <group key={name} position={[focus ? 0 : -2.8 + i * 1.4, lift, 0]}>
            <Model pose={pose} />
          </group>
        ))}
        <OrbitControls target={[0, face ? 1.9 : focus ? 1.65 : 1, 0]} />
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
        <button onClick={() => set({ attack: pose.attack > 0 ? 0 : 1 })}>boca/bote {pose.attack > 0 ? '✓' : ''}</button>
      </div>
    </>
  )
}
