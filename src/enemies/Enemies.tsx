import { useMemo } from 'react'
import type { LevelData } from '../game/data/types'
import type { BuiltLevel } from '../world/buildLevel'
import { useGameStore } from '../game/stores/gameStore'
import { buildNavGrid } from './nav'
import { Guardia } from './guardia/Guardia'
import { GUARDIA } from './guardia/config'

/**
 * Entidades do nível (dados: `enemySpawns`).
 *  - fase hunted: aparecem nos pontos `start`
 *  - apagão: reaparecem nos pontos `blackout` (perto da entrada), já sabendo onde o jogador está
 * Por enquanto só a Guardiã; Sombra (0.8.0) e Possessor (0.9.0) entram aqui.
 */
export function Enemies({ level, built }: { level: LevelData; built: BuiltLevel }) {
  const phase = useGameStore((s) => s.phase)
  const matchId = useGameStore((s) => s.matchId)
  const nav = useMemo(() => buildNavGrid(level, built, GUARDIA.radius, 0.25, GUARDIA.navMargin), [level, built])

  const wave = phase === 'hunted' ? 'start' : phase === 'blackout' ? 'blackout' : null
  if (!wave) return null
  return (
    <>
      {level.enemySpawns
        .filter((e) => e.phase === wave && e.enemy === 'guardia')
        .map((e) => {
          const [x, , z] = built.toWorld(e.x, e.y)
          return <Guardia key={`${matchId}-${e.id}`} level={level} built={built} nav={nav} spawn={{ x, z }} hunting={wave === 'blackout'} />
        })}
    </>
  )
}
