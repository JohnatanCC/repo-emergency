import { useEffect, useMemo, useRef, useState } from 'react'
import type { LevelData } from '../game/data/types'
import { buildLevel } from '../world/buildLevel'
import { useItemStore } from '../items/itemStore'
import { itemBodies } from '../items/bodies'
import { playerFeet } from '../player/playerPos'
import { mapInfo } from '../game/systems/mapInfo'
import { MAP } from './config'

/**
 * Mapa do contrato: segurando Tab, o investigador levanta uma folha com a
 * planta da casa. Mostra o carro, o ponto de extração (quadrado roxo), os
 * objetos que ele já viu (pontos amarelos) e onde ele está.
 */

const INK = '#2a1c10'

export function MapPanel({ level, enabled }: { level: LevelData; enabled: boolean }) {
  const [open, setOpen] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null)
  const built = useMemo(() => buildLevel(level), [level])

  // segurar Tab (o navegador usaria o Tab para trocar o foco)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Tab') return
      e.preventDefault()
      if (enabled && !e.repeat) setOpen(true)
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Tab') setOpen(false)
    }
    const blur = () => setOpen(false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [enabled])
  useEffect(() => {
    if (!enabled) setOpen(false)
  }, [enabled])

  // limites da planta (unidades de planta) e escala para caber na folha
  const frame = useMemo(() => {
    const xs = level.rooms.flatMap((r) => [r.x, r.x + r.w])
    const ys = level.rooms.flatMap((r) => [r.y, r.y + r.h])
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const w = Math.max(...xs) - minX
    const h = Math.max(...ys) - minY
    const k = Math.min((MAP.width - MAP.pad * 2) / w, (MAP.height - MAP.pad * 2) / h)
    const ox = (MAP.width - w * k) / 2 - minX * k
    const oy = (MAP.height - h * k) / 2 - minY * k
    return { k, ox, oy }
  }, [level])

  useEffect(() => {
    if (!open) return
    const c = canvas.current?.getContext('2d')
    if (!c) return
    const { k, ox, oy } = frame
    const px = (x: number) => ox + x * k
    const py = (y: number) => oy + y * k
    // mundo → planta (o inverso de built.toWorld)
    const fromWorld = (x: number, z: number) => [px(x / level.scale + built.center.x), py(z / level.scale + built.center.y)]

    const draw = () => {
      c.clearRect(0, 0, MAP.width, MAP.height)
      // salas: tom por iluminação, contorno a tinta
      for (const r of level.rooms) {
        c.fillStyle =
          r.kind === 'outdoor'
            ? '#b9b48a'
            : r.kind === 'car'
              ? '#b8ae98'
              : r.light === 'dark'
                ? '#a8987a'
                : r.light === 'dim'
                  ? '#c2b494'
                  : '#d4c6a4'
        c.fillRect(px(r.x), py(r.y), r.w * k, r.h * k)
        c.strokeStyle = INK
        c.lineWidth = 2
        c.strokeRect(px(r.x), py(r.y), r.w * k, r.h * k)
      }
      // portas e passagens: um vão na parede
      for (const o of built.openings) {
        c.fillStyle = o.kind === 'door' ? '#8a5a2a' : '#d4c6a4'
        c.fillRect(px(o.x) - 1, py(o.y) - 1, Math.max(o.w * k, 3) + 2, Math.max(o.h * k, 3) + 2)
      }
      // carro e extração
      for (const r of level.rooms) {
        if (r.kind !== 'car' && r.kind !== 'extraction') continue
        const cx = px(r.x + r.w / 2)
        const cy = py(r.y + r.h / 2)
        if (r.kind === 'extraction') {
          const s = Math.max(10, Math.min(r.w, r.h) * k * 0.7)
          c.fillStyle = '#7a3fd0'
          c.fillRect(cx - s / 2, cy - s / 2, s, s)
          c.strokeStyle = '#2a0e4a'
          c.strokeRect(cx - s / 2, cy - s / 2, s, s)
        }
        c.fillStyle = r.kind === 'extraction' ? '#4a1a8a' : INK
        c.font = '16px VT323, monospace'
        c.textAlign = 'center'
        c.fillText(r.kind === 'car' ? 'CARRO' : 'EXTRAÇÃO', cx, py(r.y) - 4)
      }
      // objetos já vistos, onde estão agora (os que estão com o jogador ou extraídos não aparecem)
      for (const item of Object.values(useItemStore.getState().items)) {
        if (!mapInfo.seen.has(item.uid) || item.place !== 'world') continue
        const body = itemBodies.get(item.uid)
        if (!body) continue
        const p = body.translation()
        const [x, y] = fromWorld(p.x, p.z)
        const relic = item.def.tag === 'relic'
        c.fillStyle = '#e8c020'
        c.strokeStyle = INK
        c.lineWidth = 1.5
        c.beginPath()
        c.arc(x, y, relic ? 5 : 3.5, 0, Math.PI * 2)
        c.fill()
        c.stroke()
      }
      // o investigador: seta vermelha para onde olha
      const [x, y] = fromWorld(playerFeet.x, playerFeet.z)
      const a = mapInfo.yaw
      c.save()
      c.translate(x, y)
      c.rotate(-a)
      c.fillStyle = '#b02a1a'
      c.beginPath()
      c.moveTo(0, 9)
      c.lineTo(-6, -6)
      c.lineTo(0, -2)
      c.lineTo(6, -6)
      c.closePath()
      c.fill()
      c.restore()
    }
    draw()
    const id = setInterval(draw, 120)
    return () => clearInterval(id)
  }, [open, frame, level, built])

  return (
    <div className={open ? 'map-panel open' : 'map-panel'}>
      <div className="map-sheet">
        <div className="map-title">
          C.R.O.S · CONTRATO — {level.name}
          <span>meta: {level.relicQuota} relíquias</span>
        </div>
        <canvas ref={canvas} width={MAP.width} height={MAP.height} />
        <div className="map-legend">
          <span>
            <i className="dot" /> objeto visto
          </span>
          <span>
            <i className="square" /> extração
          </span>
          <span>
            <i className="arrow">▲</i> você
          </span>
        </div>
      </div>
    </div>
  )
}
