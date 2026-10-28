import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { onNoise, type Noise, type NoiseType } from '../game/systems/noise'

/**
 * Debug (tecla G): cada barulho vira um anel no chão do tamanho do raio de
 * alcance, que some em 1 s. Ajuda a calibrar o que as entidades vão ouvir.
 */

const POOL = 24
const LIFE = 1000
const COLOR: Record<NoiseType, string> = {
  footstep: '#9fd17a',
  door: '#e0c060',
  doorSlam: '#ff6a5a',
  item: '#6ab0ff',
}

export function NoiseRings() {
  const recent = useRef<Noise[]>([])
  const meshes = useRef<(THREE.Mesh | null)[]>([])
  const geometry = useMemo(() => new THREE.RingGeometry(0.96, 1, 48).rotateX(-Math.PI / 2), [])
  const materials = useMemo(
    () => Array.from({ length: POOL }, () => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })),
    [],
  )

  useEffect(
    () =>
      onNoise((n) => {
        recent.current.push(n)
        if (recent.current.length > POOL) recent.current.shift()
      }),
    [],
  )

  useFrame(() => {
    const now = performance.now()
    recent.current = recent.current.filter((n) => now - n.time < LIFE)
    meshes.current.forEach((m, i) => {
      if (!m) return
      const n = recent.current[i]
      m.visible = !!n
      if (!n) return
      const age = (now - n.time) / LIFE
      m.position.set(n.pos[0], 0.04, n.pos[2])
      m.scale.setScalar(n.radius * (0.3 + 0.7 * Math.min(1, age * 3)))
      materials[i].color.set(COLOR[n.type])
      materials[i].opacity = 0.8 * (1 - age)
    })
  })

  return (
    <>
      {materials.map((mat, i) => (
        <mesh key={i} ref={(m) => (meshes.current[i] = m)} geometry={geometry} material={mat} visible={false} />
      ))}
    </>
  )
}
