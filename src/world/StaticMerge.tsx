import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Junta as malhas paradas dos filhos numa malha por material (menos draw
 * calls, na tela e na sombra da lanterna). Os filhos continuam montados
 * (colisores, componentes), só as malhas originais ficam escondidas.
 * Malha com `userData.keep = true` não entra (ex.: algo que se mexe).
 */
export function StaticMerge({ children, version, castShadow = true }: { children: ReactNode; version: unknown; castShadow?: boolean }) {
  const group = useRef<THREE.Group>(null)
  const [merged, setMerged] = useState<{ geo: THREE.BufferGeometry; mat: THREE.Material }[]>([])

  useLayoutEffect(() => {
    const g = group.current
    if (!g) return
    g.updateWorldMatrix(true, true)
    const toLocal = g.matrixWorld.clone().invert()
    const byMat = new Map<THREE.Material, { geos: THREE.BufferGeometry[]; sources: THREE.Mesh[] }>()
    g.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || o.userData.keep || Array.isArray(o.material)) return
      const geo = o.geometry.clone().applyMatrix4(toLocal.clone().multiply(o.matrixWorld))
      const entry = byMat.get(o.material) ?? { geos: [], sources: [] }
      entry.geos.push(geo.index ? geo.toNonIndexed() : geo)
      entry.sources.push(o)
      byMat.set(o.material, entry)
    })
    const out: { geo: THREE.BufferGeometry; mat: THREE.Material }[] = []
    for (const [mat, { geos, sources }] of byMat) {
      // só junta geometrias com os mesmos atributos (ex.: cor por vértice)
      const names = (x: THREE.BufferGeometry) => Object.keys(x.attributes).sort().join()
      const ok = geos.every((x) => names(x) === names(geos[0]))
      const geo = ok ? mergeGeometries(geos.map((x) => (x.groups.length ? (x.clearGroups(), x) : x))) : null
      if (!geo) continue
      out.push({ geo, mat })
      sources.forEach((m) => (m.visible = false))
    }
    setMerged(out)
    return () => {
      out.forEach((m) => m.geo.dispose())
      g.traverse((o) => {
        if (o instanceof THREE.Mesh) o.visible = true
      })
    }
  }, [version])

  return (
    <>
      <group ref={group}>{children}</group>
      {merged.map((m, i) => (
        <mesh key={i} geometry={m.geo} material={m.mat} castShadow={castShadow} receiveShadow />
      ))}
    </>
  )
}
