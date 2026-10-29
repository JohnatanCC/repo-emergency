import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { beam } from '../game/systems/beam'
import { FLASHLIGHT, IMMERSION } from '../player/config'

/**
 * Poeira suspensa no ar da casa. As partículas ficam paradas no mundo (só
 * flutuam um pouco) e existem só numa caixa em volta do jogador: quem sai de
 * um lado da caixa reaparece do outro, como uma grade que se repete — tudo no
 * shader, sem laço por partícula. Quase invisível no escuro; dentro do facho
 * da lanterna, brilha.
 */

const vertex = /* glsl */ `
  uniform vec3 uCenter;
  uniform vec3 uBox;
  uniform float uTime;
  uniform float uSize;
  attribute float seed;
  varying float vAlpha;
  uniform vec3 uCam;
  uniform vec3 uDir;
  uniform float uCos;
  uniform float uBeam;
  uniform float uBase;
  void main() {
    // grade que se repete em volta do jogador: a posição no mundo não muda ao andar
    vec3 p = mod(position - uCenter + uBox * 0.5, uBox) - uBox * 0.5 + uCenter;
    p += vec3(sin(uTime * 0.23 + seed), sin(uTime * 0.17 + seed * 1.7) * 0.6, cos(uTime * 0.19 + seed * 0.7)) * 0.12;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = length(p - uCam);
    // some perto da borda da caixa (não dá para ver a repetição) e muito perto da câmera
    float edge = 1.0 - smoothstep(uBox.x * 0.32, uBox.x * 0.5, dist);
    float near = smoothstep(0.25, 0.6, dist);
    float inBeam = smoothstep(uCos, uCos + 0.04, dot(normalize(p - uCam), uDir)) * uBeam;
    vAlpha = (uBase + inBeam * (1.0 - smoothstep(2.0, 7.0, dist))) * edge * near;
    gl_PointSize = uSize * 300.0 / -mv.z;
  }
`
const fragment = /* glsl */ `
  varying float vAlpha;
  uniform vec3 uColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(uColor, vAlpha * (1.0 - d * 2.0));
  }
`

export function Dust() {
  const camera = useThree((s) => s.camera)
  const { geo, mat } = useMemo(() => {
    const n = IMMERSION.dustCount
    const box = IMMERSION.dustBox
    const pos = new Float32Array(n * 3)
    const seed = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      pos.set([(Math.random() - 0.5) * box[0], Math.random() * box[1], (Math.random() - 0.5) * box[2]], i * 3)
      seed[i] = Math.random() * 100
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 1))
    const m = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uCenter: { value: new THREE.Vector3() },
        uBox: { value: new THREE.Vector3(...box) },
        uTime: { value: 0 },
        uSize: { value: IMMERSION.dustSize },
        uCam: { value: new THREE.Vector3() },
        uDir: { value: new THREE.Vector3(0, 0, -1) },
        uCos: { value: Math.cos(FLASHLIGHT.angle) },
        uBeam: { value: 0 },
        uBase: { value: IMMERSION.dustBase },
        uColor: { value: new THREE.Color('#ffe6c0') },
      },
    })
    return { geo: g, mat: m }
  }, [])

  useFrame(({ clock }) => {
    const u = mat.uniforms
    u.uTime.value = clock.elapsedTime
    // a caixa fica em volta da câmera, um pouco abaixo dos olhos (pega do chão ao teto)
    u.uCenter.value.set(camera.position.x, IMMERSION.dustBox[1] / 2, camera.position.z)
    u.uCam.value.copy(camera.position)
    u.uDir.value.copy(beam.dir)
    u.uBeam.value = beam.strength * IMMERSION.dustBeam
  })

  return <points geometry={geo} material={mat} frustumCulled={false} />
}
