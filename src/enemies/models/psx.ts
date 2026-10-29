import * as THREE from 'three'

/**
 * Visual de PS1 para as criaturas:
 *  - `psx(material)`: os vértices "estalam" para uma grade de baixa resolução
 *    na tela (o tremor característico dos jogos de 1996–99)
 *  - `canvasTexture`: texturas pequenas desenhadas por código, sem suavizar
 *  - `lathe`: silhuetas de revolução com poucos lados (facetadas)
 */

/** Resolução da grade de vértices (menor = mais tremido). */
const SNAP = 140

export function psx<T extends THREE.Material>(material: T, snap = SNAP): T {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      {
        vec4 p = gl_Position;
        p.xyz /= p.w;
        p.xy = floor(p.xy * ${snap.toFixed(1)}) / ${snap.toFixed(1)};
        p.xyz *= p.w;
        gl_Position = p;
      }`,
    )
  }
  material.customProgramCacheKey = () => `psx-${snap}`
  return material
}

/** Material padrão das criaturas: facetado, sem brilho, com tremor PS1. */
export function psxStandard(params: THREE.MeshStandardMaterialParameters) {
  return psx(new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true, ...params }))
}

export function psxBasic(params: THREE.MeshBasicMaterialParameters) {
  return psx(new THREE.MeshBasicMaterial(params))
}

/** Textura pequena pintada por código (filtro "nearest": pixels grandes). */
export function canvasTexture(w: number, h: number, paint: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  paint(canvas.getContext('2d')!)
  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Silhueta de revolução: pontos [raio, altura] de baixo para cima, poucos lados. */
export function lathe(points: [number, number][], sides = 7) {
  return new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    sides,
  )
}

/** Silhueta irregular: raio com ruído fixo (bordas rasgadas). */
export function raggedLathe(points: [number, number][], sides: number, roughness: number, seed = 1) {
  const g = lathe(points, sides)
  const pos = g.attributes.position
  let s = seed
  const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  for (let i = 0; i < pos.count; i++) {
    const k = 1 + (rand() - 0.5) * roughness
    pos.setX(i, pos.getX(i) * k)
    pos.setZ(i, pos.getZ(i) * k)
  }
  g.computeVertexNormals()
  return g
}
