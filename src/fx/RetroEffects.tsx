import { useMemo } from 'react'
import * as THREE from 'three'
import { BlendFunction } from 'postprocessing'
import { ChromaticAberration, ColorDepth, EffectComposer, HueSaturation, Noise, Scanline, Vignette } from '@react-three/postprocessing'
import { RETRO_FX } from '../game/config'

/**
 * Visual retrô: a resolução baixa vem do `dpr` do Canvas (App.tsx);
 * aqui entram a redução de cores, o sangramento de cor de fita, as linhas de
 * varredura, o grão e a vinheta.
 */
export function RetroEffects() {
  const offset = useMemo(() => new THREE.Vector2(RETRO_FX.chroma, RETRO_FX.chroma * 0.4), [])
  return (
    <EffectComposer multisampling={0}>
      <HueSaturation saturation={-0.2} />
      <ColorDepth bits={21} />
      <ChromaticAberration offset={offset} radialModulation={false} modulationOffset={0} />
      <Scanline blendFunction={BlendFunction.MULTIPLY} density={RETRO_FX.scanDensity} opacity={RETRO_FX.scanOpacity} />
      <Noise premultiply blendFunction={BlendFunction.ADD} opacity={0.18} />
      <Vignette eskil={false} offset={0.25} darkness={0.85} />
    </EffectComposer>
  )
}
