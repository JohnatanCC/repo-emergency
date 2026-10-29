import type * as THREE from 'three'
import { RETRO_FX } from '../game/config'

/**
 * Textura "afim", como no PlayStation: a textura é interpolada na tela sem
 * correção de perspectiva, então entorta e nada levemente quando a câmera se
 * move. Truque: o UV vai multiplicado por w para o fragment shader e lá é
 * dividido pelo w interpolado — a interpolação correta das duas partes se
 * cancela e sobra a interpolação linear na tela.
 */
export function affine<T extends THREE.Material>(material: T): T {
  if (!RETRO_FX.affine) return material
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying float vAffineW;').replace(
      '#include <project_vertex>',
      `#include <project_vertex>
        #ifdef USE_MAP
          vMapUv *= gl_Position.w;
          vAffineW = gl_Position.w;
        #endif`,
    )
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vAffineW;').replace(
      '#include <map_fragment>',
      `#ifdef USE_MAP
          vec4 sampledDiffuseColor = texture2D( map, vMapUv / vAffineW );
          diffuseColor *= sampledDiffuseColor;
        #endif`,
    )
  }
  material.customProgramCacheKey = () => 'affine'
  return material
}
