import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import * as THREE from 'three'
import { AIM_GROUPS } from '../game/physics'
import { getInteractable, type Hint, type Interactable } from '../game/systems/interactables'
import { useItemStore } from '../items/itemStore'
import { useGameStore } from '../game/stores/gameStore'
import { PLAYER } from './config'
import { usePlayerStore } from './playerStore'
import { debugApi } from '../game/debug'

/**
 * Mira de interação: um raio do centro da tela até `PLAYER.interactRange`.
 * Se bater em algo registrado (porta, item), mostra a dica e `E` usa.
 * Paredes bloqueiam o raio, então não dá para abrir porta através da parede.
 * Com um item grande nas mãos, portas ficam bloqueadas.
 */

function handsFull() {
  const s = useItemStore.getState()
  return s.hands !== null && s.items[s.hands]?.def.size === 'large'
}

function hintFor(target: Interactable): Hint {
  if (target.kind === 'door' && handsFull()) return { text: 'mãos ocupadas (Q larga)', ok: false }
  return target.label()
}

export function Interaction() {
  const { world, rapier } = useRapier()
  const camera = useThree((s) => s.camera)
  const target = useRef<Interactable | null>(null)
  const dir = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const game = useGameStore.getState()
    const player = usePlayerStore.getState()
    let found: Interactable | null = null
    let aim: ReturnType<typeof debugApi.aim> = null
    if (game.cameraMode === 'player' && game.phase !== 'gameover' && player.locked) {
      camera.getWorldDirection(dir)
      const hit = world.castRay(new rapier.Ray(camera.position, dir), PLAYER.interactRange, true, undefined, AIM_GROUPS)
      if (hit) found = getInteractable(hit.collider.handle) ?? null
      if (hit) aim = { dist: hit.timeOfImpact, interactable: !!found }
    }
    debugApi.aim = () => aim
    target.current = found
    const hint = found ? hintFor(found) : null
    if (hint?.text !== player.hint?.text || hint?.ok !== player.hint?.ok) player.setHint(hint)
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyE' || e.repeat || !target.current || !hintFor(target.current).ok) return
      const p = camera.position
      target.current.use({ from: [p.x, p.y, p.z], hard: e.shiftKey })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [camera])

  return null
}
