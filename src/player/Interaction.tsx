import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import * as THREE from 'three'
import { AIM_GROUPS } from '../game/physics'
import { getInteractable, type Interactable } from '../game/systems/interactables'
import { useGameStore } from '../game/stores/gameStore'
import { PLAYER } from './config'
import { usePlayerStore } from './playerStore'

/**
 * Mira de interação: um raio do centro da tela até `PLAYER.interactRange`.
 * Se bater em algo registrado (porta, item), mostra a dica e `E` usa.
 * Paredes bloqueiam o raio, então não dá para abrir porta através da parede.
 */
export function Interaction() {
  const { world, rapier } = useRapier()
  const camera = useThree((s) => s.camera)
  const target = useRef<Interactable | null>(null)
  const dir = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const game = useGameStore.getState()
    const player = usePlayerStore.getState()
    let found: Interactable | null = null
    if (game.cameraMode === 'player' && game.phase !== 'gameover' && player.locked) {
      camera.getWorldDirection(dir)
      const hit = world.castRay(new rapier.Ray(camera.position, dir), PLAYER.interactRange, true, undefined, AIM_GROUPS)
      if (hit) found = getInteractable(hit.collider.handle) ?? null
    }
    target.current = found
    const hint = found ? found.label() : null
    if (hint !== player.hint) player.setHint(hint)
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyE' || e.repeat || !target.current) return
      const p = camera.position
      target.current.use({ from: [p.x, p.y, p.z], hard: e.shiftKey })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [camera])

  return null
}
