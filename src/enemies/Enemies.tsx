import { useEffect, useMemo, useState } from 'react'
import type { LevelData, Room } from '../game/data/types'
import type { BuiltLevel } from '../world/buildLevel'
import { useGameStore } from '../game/stores/gameStore'
import { buildNavGrid } from './nav'
import { Guardia } from './guardia/Guardia'
import { GUARDIA } from './guardia/config'
import { Sombra } from './sombra/Sombra'
import { SOMBRA } from './sombra/config'
import { Possessor } from './possessor/Possessor'
import { Coisas } from './coisa/Coisa'
import { Espectro } from './espectro/Espectro'
import { COISA } from './coisa/config'
import { EXTERIOR_ID } from '../game/data/levels/exterior'

/**
 * Entidades do nível (dados: `enemySpawns`).
 *  - fase hunted: aparecem nos pontos `start`
 *  - apagão: reaparecem nos pontos `blackout` (perto da entrada), já sabendo onde o jogador está
 * O Possessor não tem ponto de nascimento: mora num objeto de saque e sai dele quando é largado.
 */

/** Território da Sombra: salas escuras; no apagão, tudo menos o carro e o extrator (que continuam acesos). */
const darkRooms = (r: Room) => r.light === 'dark' && r.kind !== 'extraction'
const blackoutRooms = (r: Room) => r.kind !== 'car' && r.kind !== 'extraction' && r.id !== EXTERIOR_ID
/** As criaturas não saem da casa: o jardim e o caminhão são zona segura. */
const insideHouse = (r: Room) => r.id !== EXTERIOR_ID && r.kind !== 'car'
/** A COISA anda pela casa toda, menos o carro (onde a cabeça é entregue) e o extrator. */
const houseRooms = blackoutRooms

export function Enemies({ level, built }: { level: LevelData; built: BuiltLevel }) {
  const phase = useGameStore((s) => s.phase)
  const matchId = useGameStore((s) => s.matchId)
  const nav = useMemo(() => buildNavGrid(level, built, GUARDIA.radius, 0.25, GUARDIA.navMargin, insideHouse), [level, built])
  // grades da Sombra só nos níveis que têm Sombra (montar a grade custa)
  const hasSombra = level.enemySpawns.some((e) => e.enemy === 'sombra')
  const shadowNav = useMemo(
    () => (hasSombra ? buildNavGrid(level, built, SOMBRA.radius, 0.25, SOMBRA.navMargin, darkRooms) : null),
    [level, built, hasSombra],
  )
  const shadowNavBlackout = useMemo(
    () => (hasSombra ? buildNavGrid(level, built, SOMBRA.radius, 0.25, SOMBRA.navMargin, blackoutRooms) : null),
    [level, built, hasSombra],
  )
  const coisaNav = useMemo(() => buildNavGrid(level, built, COISA.radius, 0.25, COISA.navMargin, houseRooms), [level, built])

  const wave = phase === 'hunted' ? 'start' : phase === 'blackout' ? 'blackout' : null
  const enemyTimerStart = useGameStore((s) => s.enemyTimerStart)
  // entrada escalonada (`delay` de cada ponto): conta a partir do começo da caçada.
  // No apagão todos voltam juntos.
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    setElapsed(0)
    if (wave !== 'start' || enemyTimerStart === null) return
    const huntStart = enemyTimerStart + level.enemyDelay * 1000
    const id = setInterval(() => setElapsed(Math.floor((performance.now() - huntStart) / 1000)), 1000)
    return () => clearInterval(id)
  }, [wave, enemyTimerStart, level.enemyDelay])
  // com mais de uma Sombra, só a primeira aparece no debug (window.__relicario.sombra)
  const firstSombra = level.enemySpawns.find((e) => e.phase === wave && e.enemy === 'sombra')?.id
  return (
    <>
      {/* o objeto possuído e A COISA agem em qualquer fase (até antes da 1ª porta) */}
      <Possessor nav={nav} />
      <Coisas nav={coisaNav} />
      {wave &&
        level.enemySpawns
          .filter((e) => e.phase === wave && (wave === 'blackout' || (e.delay ?? 0) <= elapsed))
          .map((e) => {
            const [x, , z] = built.toWorld(e.x, e.y)
            const key = `${matchId}-${e.id}`
            if (e.enemy === 'guardia')
              return (
                <Guardia
                  key={key}
                  level={level}
                  built={built}
                  nav={nav}
                  spawn={{ x, z }}
                  hunting={wave === 'blackout'}
                  damage={e.damage}
                  lockTime={e.lockTime}
                  chaseMusic={e.chaseMusic}
                />
              )
            if (e.enemy === 'espectro') return <Espectro key={key} level={level} built={built} spawn={{ x, z }} />
            if (e.enemy === 'sombra' && shadowNav && shadowNavBlackout)
              return (
                <Sombra
                  key={key}
                  nav={wave === 'blackout' ? shadowNavBlackout : shadowNav}
                  spawn={{ x, z }}
                  primary={e.id === firstSombra}
                  damage={e.damage}
                  lockTime={e.lockTime}
                  chaseMusic={e.chaseMusic}
                />
              )
            return null
          })}
    </>
  )
}
