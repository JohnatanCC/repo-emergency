import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import * as THREE from 'three'
import { SIGHT_GROUPS } from '../game/physics'
import { useGameStore } from '../game/stores/gameStore'
import { useItemStore } from '../items/itemStore'
import { itemBodies } from '../items/bodies'
import { mapInfo } from '../game/systems/mapInfo'
import { MAP } from '../ui/config'

/**
 * Anota no mapa os objetos que o investigador realmente viu: na frente da
 * câmera, perto o bastante e sem parede no meio. Roda poucas vezes por segundo.
 */
export function MapTracker() {
  const camera = useThree((s) => s.camera)
  const { world, rapier } = useRapier()
  const st = useRef({ next: 0, fwd: new THREE.Vector3(), to: new THREE.Vector3() }).current

  useFrame(({ clock }) => {
    const matchId = useGameStore.getState().matchId
    // partida nova: mapa limpo
    if (mapInfo.matchId !== matchId) {
      mapInfo.matchId = matchId
      mapInfo.seen.clear()
    }
    camera.getWorldDirection(st.fwd)
    mapInfo.yaw = Math.atan2(st.fwd.x, st.fwd.z)
    if (clock.elapsedTime < st.next) return
    st.next = clock.elapsedTime + MAP.seeEvery

    const cosView = Math.cos(THREE.MathUtils.degToRad(MAP.seeAngle))
    for (const item of Object.values(useItemStore.getState().items)) {
      if (mapInfo.seen.has(item.uid) || !MAP.tags.includes(item.def.tag)) continue
      // pegou na mão: viu
      if (item.place === 'inventory' || item.place === 'hands') {
        mapInfo.seen.add(item.uid)
        continue
      }
      const body = itemBodies.get(item.uid)
      if (item.place !== 'world' || !body) continue
      const p = body.translation()
      st.to.set(p.x - camera.position.x, p.y - camera.position.y, p.z - camera.position.z)
      const d = st.to.length()
      if (d > MAP.seeRange || d < 0.01) continue
      st.to.divideScalar(d)
      if (st.to.dot(st.fwd) < cosView) continue
      // paredes, portas e móveis tapam (o raio ignora os próprios itens)
      const hit = world.castRay(new rapier.Ray(camera.position, st.to), d, true, undefined, SIGHT_GROUPS)
      if (!hit || hit.timeOfImpact >= d - 0.3) mapInfo.seen.add(item.uid)
    }
  })
  return null
}
