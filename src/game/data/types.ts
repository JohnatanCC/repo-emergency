/**
 * Tipos dos dados de nível.
 *
 * Coordenadas em "unidades de planta" (u): as mesmas do desenho 2D do mapa.
 * x da planta → x do mundo, y da planta → z do mundo.
 * `LevelData.scale` converte unidades de planta em metros.
 */

export type LightLevel = 'lit' | 'dim' | 'dark' | 'moon'

export type FloorType = 'metal' | 'wood' | 'checker' | 'tile' | 'grass' | 'carpet'
export type WallType = 'metal' | 'wallpaper' | 'panel' | 'brick' | 'tile'

export type RoomKind = 'truck' | 'corridor' | 'room' | 'outdoor' | 'extraction'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Room extends Rect {
  id: string
  name: string
  kind: RoomKind
  light: LightLevel
  floor: FloorType
  wall: WallType
}

/**
 * Abertura entre duas salas. Desenhada como um retângulo fino sobre a
 * parede compartilhada (igual às portas vermelhas da planta).
 * - door: terá uma porta física (implementada na 0.2.0)
 * - passage: vão aberto, sem porta
 */
export interface Opening extends Rect {
  id: string
  kind: 'door' | 'passage'
  /** A porta que inicia o timer de spawn dos monstros. */
  firstDoor?: boolean
}

export type PropType = 'shelf' | 'table' | 'chair' | 'wardrobe' | 'bathtub' | 'bench' | 'monitor'

export interface Prop {
  id: string
  type: PropType
  x: number
  y: number
  /** Tamanho em u (para estantes). */
  w?: number
  h?: number
  /** Rotação em graus (eixo vertical). */
  rot?: number
}

export type HidingType = 'under-table' | 'under-chair' | 'wardrobe'

export interface HidingSpot {
  id: string
  type: HidingType
  /** Prop ao qual o esconderijo pertence. */
  propId: string
}

export type ItemTag = 'musicBox' | 'goldenChalice' | 'generic'

export interface ItemSpawn {
  id: string
  x: number
  y: number
  /** Quais itens podem aparecer aqui. O sorteio por partida escolhe dentre eles. */
  accepts: ItemTag[]
}

export type EnemyId = 'patofera' | 'ocopus' | 'esposa'

export interface EnemySpawn {
  id: string
  enemy: EnemyId
  x: number
  y: number
  /** 'start' = após a primeira porta; 'blackout' = reaparecimento após a extração */
  phase: 'start' | 'blackout'
}

export interface LevelData {
  id: string
  name: string
  /** metros por unidade de planta */
  scale: number
  wallHeight: number
  rooms: Room[]
  openings: Opening[]
  props: Prop[]
  hidingSpots: HidingSpot[]
  itemSpawns: ItemSpawn[]
  enemySpawns: EnemySpawn[]
  requiredItems: ItemTag[]
  playerStart: { x: number; y: number }
  /** Segundos após cruzar a primeira porta até os monstros aparecerem. */
  enemyDelay: number
}
