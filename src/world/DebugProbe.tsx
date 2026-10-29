import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { debugApi } from '../game/debug'

/** Dev: `window.__relicario.stats()` desenha um quadro e conta o que pesou. */
export function DebugProbe() {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    debugApi.stats = () => {
      let meshes = 0
      let visible = 0
      let lights = 0
      let shadowLights = 0
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          meshes++
          if (o.visible) visible++
        }
        if (o instanceof THREE.Light && o.visible && o.intensity > 0 && !(o instanceof THREE.AmbientLight)) {
          lights++
          if (o.castShadow) shadowLights++
        }
      })
      const auto = gl.info.autoReset
      gl.info.autoReset = false
      gl.info.reset()
      const t0 = performance.now()
      gl.render(scene, camera)
      const ms = performance.now() - t0
      const out = {
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        meshes,
        visibleMeshes: visible,
        lights,
        shadowLights,
        programs: gl.info.programs?.length ?? 0,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        renderMs: Math.round(ms * 100) / 100,
      }
      gl.info.autoReset = auto
      return out
    }
  }, [gl, scene, camera])
  return null
}
