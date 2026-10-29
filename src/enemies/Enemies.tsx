import { useMemo } from 'react'
import type { LevelData, Room } from '../game/data/types'
import type { BuiltLevel } from '../world/buildLevel'
import { useGameStore } from '../game/stores/gameStore'
import { buildNavGrid } from './nav'
import { Guardia } from './guardia/Guardia'
import { GUARDIA } from './guardia/config'
import { Sombra } from './sombra/Sombra'
import { SOMBRA } from './sombra/config'

/**
 * Entidades do nível (dados: `enemySpawns`).
 *  - fase hunted: aparecem nos pontos `start`
 *  - apagão: reaparecem nos pontos `blackout` (perto da entrada), já sabendo onde o jogador está
 * O Possessor (0.9.0) entra aqui.
 */

/** Território da Sombra: salas escuras; no apagão, tudo menos o carro e o extrator (que continuam acesos). */
const darkRooms = (r: Room) => r.light === 'dark' && r.kind !== 'extraction'
const blackoutRooms = (r: Room) => r.kind !== 'car' && r.kind !== 'extraction'

export function Enemies({ level, built }: { level: LevelData; built: BuiltLevel }) {
  const phase = useGameStore((s) => s.phase)
  const matchId = useGameStore((s) => s.matchId)
  const nav = useMemo(() => buildNavGrid(level, built, GUARDIA.radius, 0.25, GUARDIA.navMargin), [level, built])
  const shadowNav = useMemo(() => buildNavGrid(level, built, SOMBRA.radius, 0.25, SOMBRA.navMargin, darkRooms), [level, built])
  const shadowNavBlackout = useMemo(() => buildNavGrid(level, built, SOMBRA.radius, 0.25, SOMBRA.navMargin, blackoutRooms), [level, built])

  const wave = phase === 'hunted' ? 'start' : phase === 'blackout' ? 'blackout' : null
  if (!wave) return null
  return (
    <>
      {level.enemySpawns
        .filter((e) => e.phase === wave)
        .map((e) => {
          const [x, , z] = built.toWorld(e.x, e.y)
          const key = `${matchId}-${e.id}`
          if (e.enemy === 'guardia')
            return <Guardia key={key} level={level} built={built} nav={nav} spawn={{ x, z }} hunting={wave === 'blackout'} />
          if (e.enemy === 'sombra') return <Sombra key={key} nav={wave === 'blackout' ? shadowNavBlackout : shadowNav} spawn={{ x, z }} />
          return null
        })}
    </>
  )
}
