import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../game/stores/gameStore'
import { getLevel } from '../game/data/levels'

/**
 * Tela do painel do carro: contrato do C.R.O.S, o que já está no extrator
 * e o que fazer agora. Desenhada num canvas pequeno (visual retrô) e
 * redesenhada só quando o texto muda.
 */

const W = 128
const H = 80

function lines(): string[] {
  const g = useGameStore.getState()
  const quota = getLevel(g.levelIndex).relicQuota
  const { inside, status } = g.extractor
  const head = 'C.R.O.S  CONTRATO'
  if (g.phase === 'results' || status === 'done') {
    const r = g.result
    return [
      head,
      'EXTRACAO OK',
      `RELIQ ${r?.relics ?? 0}  $${r?.relicValue ?? 0}`,
      `SAQUE $${r?.lootValue ?? 0}`,
      g.phase === 'results' ? 'PAGAMENTO >' : 'VOLTE AO CARRO',
    ]
  }
  return [
    head,
    `META: ${quota} RELIQUIAS`,
    `EXTRATOR: ${inside.relics}/${quota}`,
    `SAQUE: $${inside.lootValue}`,
    status === 'charging' ? 'EXTRAINDO...' : `SALDO $${g.money}`,
  ]
}

export function CarPanel() {
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const texture = new THREE.CanvasTexture(canvas)
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.colorSpace = THREE.SRGBColorSpace
    return { canvas, texture }
  }, [])
  const last = useRef('')
  const timer = useRef(0)

  useFrame((_, dt) => {
    if ((timer.current -= dt) > 0) return
    timer.current = 0.25
    const text = lines()
    const key = text.join('|')
    if (key === last.current) return
    last.current = key
    const c = canvas.getContext('2d')!
    c.fillStyle = '#071a0c'
    c.fillRect(0, 0, W, H)
    c.font = '12px VT323, monospace'
    c.textBaseline = 'top'
    text.forEach((t, i) => {
      c.fillStyle = i === 0 ? '#9fe8a8' : '#3fbf5a'
      c.fillText(t, 5, 4 + i * 15)
    })
    // linhas de varredura
    c.fillStyle = 'rgba(0,0,0,0.25)'
    for (let y = 0; y < H; y += 2) c.fillRect(0, y, W, 1)
    texture.needsUpdate = true
  })

  return (
    <mesh position={[0, 1.5, 0.045]}>
      <planeGeometry args={[0.95, 0.55]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}
