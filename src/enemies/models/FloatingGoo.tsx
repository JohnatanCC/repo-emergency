import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Gosma preta flutuando em volta de uma criatura: bolhas brilhantes que orbitam
 * em alturas diferentes, se deformam como líquido (incham num eixo, afinam no
 * outro) e de vez em quando esticam para baixo, como um pingo prestes a cair.
 * Fica no espaço do modelo (vai junto com ela). `agitation` (0–1, lido todo
 * quadro) acelera e espalha a gosma (ex.: perseguindo).
 */
export function FloatingGoo({
  count = 16,
  radius = [0.22, 0.42],
  height = [0.2, 1.9],
  size = [0.018, 0.045],
  agitation,
}: {
  count?: number
  radius?: [number, number]
  height?: [number, number]
  size?: [number, number]
  agitation?: () => number
}) {
  const group = useRef<THREE.Group>(null)
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#030303', roughness: 0.12, metalness: 0.35, flatShading: true }), [])
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), [])
  const blobs = useMemo(() => {
    let s = 17
    const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
    return Array.from({ length: count }, () => ({
      a: r() * Math.PI * 2,
      rad: radius[0] + r() * (radius[1] - radius[0]),
      h: height[0] + r() * (height[1] - height[0]),
      size: size[0] + r() * (size[1] - size[0]),
      speed: (0.25 + r() * 0.5) * (r() < 0.5 ? -1 : 1),
      wob: 2 + r() * 3,
      phase: r() * 10,
      drip: 0,
    }))
  }, [count, radius, height, size])

  useFrame(({ clock }, delta) => {
    const g = group.current
    if (!g) return
    const t = clock.elapsedTime
    const dt = Math.min(delta, 0.05)
    const ag = agitation ? agitation() : 0
    g.children.forEach((m, i) => {
      const b = blobs[i]
      b.a += b.speed * dt * (1 + ag * 2.5)
      // de vez em quando um pingo: estica para baixo e volta
      if (b.drip <= 0 && Math.random() < dt * 0.15) b.drip = 1
      b.drip = Math.max(0, b.drip - dt * 0.9)
      const drip = Math.sin(b.drip * Math.PI)
      const rad = b.rad * (1 + ag * 0.4)
      m.position.set(Math.cos(b.a) * rad, b.h + Math.sin(t * 0.8 + b.phase) * 0.08 - drip * 0.05, Math.sin(b.a) * rad)
      // líquido: incha num eixo, afina no outro
      const w = Math.sin(t * b.wob + b.phase) * 0.25
      m.scale.set(b.size * (1 + w), b.size * (1 - w * 0.8 + drip * 1.6), b.size * (1 + w * 0.5))
    })
  })

  return (
    <group ref={group}>
      {blobs.map((_, i) => (
        <mesh key={i} geometry={geo} material={mat} />
      ))}
    </group>
  )
}
