import { BlendFunction } from 'postprocessing'
import { ColorDepth, EffectComposer, HueSaturation, Noise, Vignette } from '@react-three/postprocessing'

/**
 * Visual retrô: a resolução baixa vem do `dpr` do Canvas (App.tsx);
 * aqui entram a redução de cores, o grão e a vinheta.
 */
export function RetroEffects() {
  return (
    <EffectComposer multisampling={0}>
      <HueSaturation saturation={-0.2} />
      <ColorDepth bits={21} />
      <Noise premultiply blendFunction={BlendFunction.ADD} opacity={0.18} />
      <Vignette eskil={false} offset={0.25} darkness={0.85} />
    </EffectComposer>
  )
}
