import { Html } from '@react-three/drei'
import type { EnemyId, LevelData } from '../game/data/types'
import type { BuiltLevel } from './buildLevel'
import { useGameStore } from '../game/stores/gameStore'
import { useHidingStore } from '../player/hidingStore'

/** Marcadores de debug (tecla G): spawns, esconderijos, 1ª porta, início, mortes. */

const ENEMY_COLOR: Record<EnemyId, string> = {
  possessor: '#d8c23a',
  sombra: '#8a6ae0',
  guardia: '#d23a3a',
  espectro: '#e8e2f0',
}

const ENEMY_NAME: Record<EnemyId, string> = {
  possessor: 'Possessor',
  sombra: 'Sombra',
  guardia: 'Guardiã',
  espectro: 'Espectro',
}

function Label({ text, color }: { text: string; color: string }) {
  return (
    <Html center distanceFactor={40} style={{ pointerEvents: 'none' }}>
      <div style={{ color, fontSize: 14, whiteSpace: 'nowrap', textShadow: '0 0 3px #000, 1px 1px 0 #000' }}>{text}</div>
    </Html>
  )
}

export function Gizmos({ level, built }: { level: LevelData; built: BuiltLevel }) {
  const propById = new Map(level.props.map((p) => [p.id, p]))
  const deathSpots = useGameStore((s) => s.deathSpots)
  const marked = useHidingStore((s) => s.marked)
  const current = useHidingStore((s) => s.spot?.id)
  return (
    <group>
      {/* início do jogador */}
      <group position={built.toWorld(level.playerStart.x, level.playerStart.y, 0.05)}>
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.3, 0.45, 16]} />
          <meshBasicMaterial color="#6fd16f" />
        </mesh>
        <group position-y={1.6}>
          <Label text="início" color="#6fd16f" />
        </group>
      </group>

      {/* primeira porta (dispara o timer dos monstros) */}
      {built.openings
        .filter((o) => o.firstDoor)
        .map((o) => (
          <group key={o.id} position={built.toWorld(o.x + o.w / 2, o.y + o.h / 2, 2.6)}>
            <Label text={`1ª porta · ${level.enemyDelay}s`} color="#ff6a5a" />
          </group>
        ))}

      {/* portas (placeholder até a 0.2.0) */}
      {built.openings
        .filter((o) => o.kind === 'door')
        .map((o) => {
          const along = o.w >= o.h
          const len = (along ? o.w : o.h) * level.scale
          return (
            <mesh key={o.id} position={built.toWorld(o.x + o.w / 2, o.y + o.h / 2, 0.02)} rotation-x={-Math.PI / 2}>
              <planeGeometry args={along ? [len, 0.3] : [0.3, len]} />
              <meshBasicMaterial color="#c0392b" transparent opacity={0.7} />
            </mesh>
          )
        })}

      {/* pontos de item */}
      {level.itemSpawns.map((s) => {
        const special = s.accepts.includes('relic')
        const color = special ? '#f2c94c' : '#9a9a9a'
        return (
          <group key={s.id} position={built.toWorld(s.x, s.y, 0.6)}>
            <mesh rotation={[0, Math.PI / 4, Math.PI / 4]}>
              <boxGeometry args={[0.25, 0.25, 0.25]} />
              <meshBasicMaterial color={color} wireframe />
            </mesh>
            {special && (
              <group position-y={0.5}>
                <Label text="relíquia" color={color} />
              </group>
            )}
          </group>
        )
      })}

      {/* esconderijos: verde = livre · branco = você está nele · vermelho = marcado */}
      {level.hidingSpots.map((h) => {
        const p = propById.get(h.propId)
        if (!p) return null
        return (
          <mesh key={h.id} position={built.toWorld(p.x, p.y, 0.03)} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.55, 0.65, 20]} />
            <meshBasicMaterial color={marked.includes(h.id) ? '#ff4a3a' : current === h.id ? '#ffffff' : '#3fc1a5'} />
          </mesh>
        )
      })}

      {/* spawns de monstros */}
      {level.enemySpawns.map((e) => (
        <group key={e.id} position={built.toWorld(e.x, e.y, 0.5)}>
          <mesh>
            <coneGeometry args={[0.3, 0.8, 4]} />
            <meshBasicMaterial color={ENEMY_COLOR[e.enemy]} wireframe={e.phase === 'blackout'} />
          </mesh>
          <group position-y={0.8}>
            <Label text={`${ENEMY_NAME[e.enemy]}${e.phase === 'blackout' ? ' · apagão' : ''}`} color={ENEMY_COLOR[e.enemy]} />
          </group>
        </group>
      ))}

      {/* onde o investigador morreu (ali surgiu A COISA) */}
      {deathSpots.map((p, i) => (
        <group key={i} position={[p[0], p[1] + 0.5, p[2]]}>
          <mesh>
            <sphereGeometry args={[0.2, 8, 6]} />
            <meshBasicMaterial color="#e8e8e8" wireframe />
          </mesh>
          <group position-y={0.6}>
            <Label text="morte" color="#e8e8e8" />
          </group>
        </group>
      ))}
    </group>
  )
}
