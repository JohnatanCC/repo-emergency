import { useMemo, useRef } from 'react'
import { createPortal, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Rastro de fumaça no mundo: cada partícula nasce no ponto `anchor` (dentro do
 * modelo), fica onde nasceu, sobe um pouco, cresce e some. Desenhado na cena
 * (portal), não no modelo — assim o rastro fica para trás quando a criatura anda.
 */

const vertex = /* glsl */ `
  attribute float age;
  attribute float seed;
  uniform float uSize;
  varying float vAge;
  void main() {
    vAge = age;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.4 + age * 1.4) * (0.7 + seed * 0.6) * 300.0 / -mv.z;
  }
`
const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAge;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5 || vAge >= 1.0) discard;
    gl_FragColor = vec4(uColor, uOpacity * (1.0 - vAge) * (1.0 - d * 2.0));
  }
`

/** Visível de fato (ela e todos os pais): a criatura sumida não solta fumaça. */
function shown(o: THREE.Object3D | null) {
  for (; o; o = o.parent) if (!o.visible) return false
  return true
}

export function SmokeTrail({
  anchor,
  color = '#000000',
  count = 48,
  rate = 18,
  life = 1.6,
  size = 0.35,
  opacity = 0.55,
  spread = 0.25,
  rise = 0.35,
  additive = false,
  intensity,
}: {
  /** Onde nasce (um Object3D dentro do modelo). */
  anchor: React.RefObject<THREE.Object3D>
  color?: string
  count?: number
  /** Partículas por segundo. */
  rate?: number
  life?: number
  size?: number
  opacity?: number
  spread?: number
  rise?: number
  additive?: boolean
  /** 0–1 lido todo frame (ex.: só solta fumaça correndo). */
  intensity?: () => number
}) {
  const scene = useThree((s) => s.scene)
  const st = useRef({ next: 0, acc: 0 }).current
  const { geo, mat, vel } = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3).fill(-999), 3))
    g.setAttribute('age', new THREE.BufferAttribute(new Float32Array(count).fill(1), 1))
    g.setAttribute(
      'seed',
      new THREE.BufferAttribute(
        Float32Array.from({ length: count }, () => Math.random()),
        1,
      ),
    )
    const m = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { uSize: { value: size }, uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity } },
    })
    return { geo: g, mat: m, vel: new Float32Array(count * 3) }
  }, [count, size, color, opacity, additive])
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const pos = geo.attributes.position as THREE.BufferAttribute
    const age = geo.attributes.age as THREE.BufferAttribute
    // envelhece e flutua
    for (let i = 0; i < count; i++) {
      if (age.array[i] >= 1) continue
      ;(age.array as Float32Array)[i] = Math.min(1, age.array[i] + dt / life)
      const p = pos.array as Float32Array
      p[i * 3] += vel[i * 3] * dt
      p[i * 3 + 1] += vel[i * 3 + 1] * dt
      p[i * 3 + 2] += vel[i * 3 + 2] * dt
    }
    // nasce no ponto de origem
    const a = anchor.current
    if (a && shown(a)) {
      st.acc += dt * rate * (intensity ? intensity() : 1)
      while (st.acc >= 1) {
        st.acc -= 1
        const i = st.next
        st.next = (st.next + 1) % count
        a.getWorldPosition(tmp)
        pos.setXYZ(
          i,
          tmp.x + (Math.random() - 0.5) * spread,
          tmp.y + (Math.random() - 0.5) * spread,
          tmp.z + (Math.random() - 0.5) * spread,
        )
        vel.set([(Math.random() - 0.5) * 0.3, rise * (0.5 + Math.random()), (Math.random() - 0.5) * 0.3], i * 3)
        age.setX(i, 0)
      }
    }
    pos.needsUpdate = true
    age.needsUpdate = true
  })

  return createPortal(<points geometry={geo} material={mat} frustumCulled={false} />, scene)
}
