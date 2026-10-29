import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { LevelData } from '../game/data/types'
import type { BuiltLevel } from './buildLevel'
import { WALL_THICKNESS } from './buildLevel'
import { EXTRACTION } from '../game/config'
import { useGameStore, type ExtractorContents } from '../game/stores/gameStore'
import { emitNoise } from '../game/systems/noise'
import { useItemStore, isBroken } from '../items/itemStore'
import { itemBodies } from '../items/bodies'
import { audio, type LoopHandle } from '../game/audio/engine'
import { AUDIO } from '../game/audio/sounds'

/**
 * Extrator mágico (sala roxa). Itens largados dentro da sala ficam
 * depositados. Quando há relíquias inteiras suficientes para a meta,
 * ele carrega por alguns segundos e leva tudo de uma vez. Tirar uma
 * relíquia durante a carga cancela.
 */

const same = (a: ExtractorContents, b: ExtractorContents) =>
  a.relics === b.relics && a.relicValue === b.relicValue && a.loot === b.loot && a.lootValue === b.lootValue

export function Extractor({ level, built }: { level: LevelData; built: BuiltLevel }) {
  const light = useRef<THREE.PointLight>(null)
  const flash = useRef(0)
  const sound = useRef<{ hum: LoopHandle | null; charge: LoopHandle | null; status: string }>({
    hum: null,
    charge: null,
    status: 'idle',
  })

  const area = useMemo(() => {
    const room = level.rooms.find((r) => r.kind === 'extraction')
    if (!room) return null
    const [x0, , z0] = built.toWorld(room.x, room.y)
    const [x1, , z1] = built.toWorld(room.x + room.w, room.y + room.h)
    const t = WALL_THICKNESS
    return { x0: x0 + t, x1: x1 - t, z0: z0 + t, z1: z1 - t, center: built.toWorld(room.x + room.w / 2, room.y + room.h / 2, 1.2) }
  }, [level, built])

  // zumbido parado na sala enquanto o extrator existir
  useEffect(() => {
    if (!area) return
    const s = sound.current
    s.hum = audio.loop('hum', { pos: area.center, volume: AUDIO.extractor * 0.4 })
    return () => {
      s.hum?.stop()
      s.charge?.stop()
      s.hum = s.charge = null
    }
  }, [area])

  /** Sons quando o estado do extrator muda. */
  const onStatus = (status: string) => {
    const s = sound.current
    if (status === s.status || !area) return
    s.charge?.stop()
    s.charge = null
    if (status === 'charging') {
      s.charge = audio.loop('charge', { pos: area.center, volume: AUDIO.extractor })
      s.hum?.setRate(1.5)
      s.hum?.setVolume(AUDIO.extractor * 0.7)
    } else if (status === 'done') {
      audio.play('whoosh', { pos: area.center, volume: 1 })
      s.hum?.setVolume(0, 1.5)
    } else {
      s.hum?.setRate(1)
      s.hum?.setVolume(AUDIO.extractor * 0.4)
    }
    s.status = status
  }

  useFrame(({ clock }, dt) => {
    if (!area) return
    onStatus(useGameStore.getState().extractor.status)
    const game = useGameStore.getState()
    const items = useItemStore.getState()
    const ex = game.extractor

    if (ex.status !== 'done' && game.phase !== 'gameover') {
      // o que está dentro da sala agora
      const inside: ExtractorContents = { relics: 0, relicValue: 0, loot: 0, lootValue: 0 }
      const uids: string[] = []
      for (const it of Object.values(items.items)) {
        if (it.place !== 'world') continue
        const p = itemBodies.get(it.uid)?.translation()
        if (!p || p.x < area.x0 || p.x > area.x1 || p.z < area.z0 || p.z > area.z1) continue
        if (it.def.tag === 'supply') continue
        uids.push(it.uid)
        if (it.def.tag === 'relic') {
          if (!isBroken(it)) inside.relics++
          inside.relicValue += it.value
        } else {
          inside.loot++
          inside.lootValue += it.value
        }
      }
      if (!same(inside, ex.inside)) game.setExtractorInside(inside)

      const met = inside.relics >= level.relicQuota
      if (ex.status === 'idle' && met) game.startCharge()
      else if (ex.status === 'charging' && !met) game.cancelCharge()
      else if (
        ex.status === 'charging' &&
        ex.chargeStart !== null &&
        performance.now() - ex.chargeStart >= EXTRACTION.chargeSeconds * 1000
      ) {
        items.extract(uids)
        game.completeExtraction(inside)
        flash.current = EXTRACTION.flashSeconds
        const [x, y, z] = area.center
        emitNoise({ pos: [x, y, z], radius: 30, type: 'item' })
      }
    }

    // luz: parada, pulsando enquanto carrega, clarão ao extrair
    const l = light.current
    if (!l) return
    flash.current = Math.max(0, flash.current - dt)
    const status = useGameStore.getState().extractor.status
    let intensity = status === 'charging' ? EXTRACTION.lightCharging * (0.6 + 0.4 * Math.sin(clock.elapsedTime * 10)) : EXTRACTION.lightIdle
    if (flash.current > 0) intensity = EXTRACTION.lightFlash * (flash.current / EXTRACTION.flashSeconds)
    l.intensity = intensity
  })

  if (!area) return null
  return <pointLight ref={light} position={area.center} color="#9a5cff" intensity={EXTRACTION.lightIdle} distance={8} decay={1.6} />
}
