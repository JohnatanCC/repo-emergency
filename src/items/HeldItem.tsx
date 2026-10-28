import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import * as THREE from 'three'
import { AIM_GROUPS } from '../game/physics'
import { useGameStore } from '../game/stores/gameStore'
import { usePlayerStore } from '../player/playerStore'
import { useHidingStore } from '../player/hidingStore'
import { ItemMesh } from './Items'
import { halfHeight, isBroken, useItemStore, type ItemInstance } from './itemStore'
import type { ItemSize } from '../game/data/types'

/** Onde o item aparece na frente da câmera (direita, baixo, frente). A lanterna fica na mão direita. */
const HOLD_OFFSET: Record<ItemSize, [number, number, number]> = {
  small: [-0.22, -0.25, -0.45],
  medium: [-0.25, -0.32, -0.55],
  large: [0, -0.5, -0.75],
}
/** Distância à frente onde o item é largado. */
const DROP_DISTANCE: Record<ItemSize, number> = { small: 0.5, medium: 0.6, large: 0.8 }

/**
 * Item nas mãos: desenhado na frente da câmera, sem física.
 * Com um item grande, ele ocupa boa parte da visão (de propósito).
 */
export function HeldItem() {
  const camera = useThree((s) => s.camera)
  const hands = useItemStore((s) => (s.hands ? s.items[s.hands] : null))
  const group = useRef<THREE.Group>(null)

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    g.position.copy(camera.position)
    g.quaternion.slerp(camera.quaternion, 1 - Math.exp(-14 * dt))
  })

  if (!hands) return null
  return (
    <group ref={group}>
      <group position={HOLD_OFFSET[hands.def.size]} rotation={[0.15, 0.3, 0]}>
        <ItemMesh def={hands.def} broken={isBroken(hands)} />
      </group>
    </group>
  )
}

/**
 * Teclas do inventário: `1`–`3` escolhem o espaço, `Q` larga o que está nas mãos
 * (ou, com as mãos livres, o item do espaço escolhido). O item é apoiado no chão
 * na frente do jogador, sem atravessar paredes.
 */
export function ItemControls() {
  const camera = useThree((s) => s.camera)
  const { world, rapier } = useRapier()
  const tmp = useMemo(() => ({ fwd: new THREE.Vector3() }), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useGameStore.getState().cameraMode !== 'player' || !usePlayerStore.getState().locked) return
      const store = useItemStore.getState()
      const digit = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code)
      if (digit >= 0) store.select(digit)
      if (e.code !== 'KeyQ' || e.repeat || useHidingStore.getState().wardrobeId) return

      camera.getWorldDirection(tmp.fwd)
      tmp.fwd.y = 0
      tmp.fwd.normalize()
      const yaw = Math.atan2(-tmp.fwd.x, -tmp.fwd.z)
      const dropPos = (item: ItemInstance): [number, number, number] => {
        // não larga dentro da parede: encurta se algo estiver no caminho
        const hit = world.castRay(new rapier.Ray(camera.position, tmp.fwd), 2, true, undefined, AIM_GROUPS)
        const r = Math.max(...item.def.dims) / 2 + 0.05
        const dist = Math.max(0.15, Math.min(DROP_DISTANCE[item.def.size], hit ? hit.timeOfImpact - r : Infinity))
        // apoia perto do chão (todos os pisos estão em y = 0), para não estragar ao largar
        return [camera.position.x + tmp.fwd.x * dist, halfHeight(item.def) + 0.12, camera.position.z + tmp.fwd.z * dist]
      }
      store.dropCurrent(dropPos, yaw)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [camera, world, rapier, tmp])

  return null
}
