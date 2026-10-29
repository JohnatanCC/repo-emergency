/**
 * Tipos dos dados de nível.
 *
 * Coordenadas em "unidades de planta" (u): as mesmas do desenho 2D do mapa.
 * x da planta → x do mundo, y da planta → z do mundo.
 * `LevelData.scale` converte unidades de planta em metros.
 */

export type LightLevel = 'lit' | 'dim' | 'dark' | 'moon'

export type FloorType = 'metal' | 'wood' | 'checker' | 'tile' | 'grass' | 'carpet'
/** none = parede invisível (só colisor): a barreira do lado de fora, escondida na névoa. */
export type WallType = 'metal' | 'wallpaper' | 'panel' | 'brick' | 'tile' | 'none'

/** drip = goteira · clock = relógio de pêndulo · crickets = grilos */
export type AmbientSound = 'drip' | 'clock' | 'crickets'

export type RoomKind = 'car' | 'corridor' | 'room' | 'outdoor' | 'extraction'

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
  /** Sons de ambiente que saem desta sala (posicionais). */
  ambient?: AmbientSound[]
  /** Parede diferente num lado (n = y menor, s = y maior, w = x menor, e = x maior). */
  wallSides?: Partial<Record<'n' | 's' | 'w' | 'e', WallType>>
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
  /** Porta dupla (duas folhas abrindo do meio), mais larga (FRONT_DOOR). */
  double?: boolean
  /** Altura do vão em metros (padrão DOOR_HEIGHT). */
  height?: number
}

export type PropType =
  | 'shelf'
  | 'table'
  | 'chair'
  | 'wardrobe'
  | 'bathtub'
  | 'bench'
  | 'monitor'
  // lado de fora e caminhão (data/levels/exterior.ts)
  | 'tree'
  | 'bush'
  | 'statue'
  | 'lamppost'
  | 'fountain'
  | 'column'
  | 'rack'

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

/**
 * - relic: relíquia paranormal pedida pelo C.R.O.S (conta para a meta do nível)
 * - loot: objeto comum da casa, roubado para vender
 */
export type ItemTag = 'relic' | 'loot'

/**
 * Pequeno cabe num dos 3 espaços do inventário; médio e grande
 * precisam ser carregados nas mãos (um por vez).
 */
export type ItemSize = 'small' | 'medium' | 'large'

export interface ItemSpawn {
  id: string
  x: number
  y: number
  /** Quais itens podem aparecer aqui. O sorteio por partida escolhe dentre eles. */
  accepts: ItemTag[]
}

/** Entidades da casa (detalhes no ROADMAP.md). */
export type EnemyId = 'guardia' | 'sombra' | 'possessor' | 'espectro'

export interface EnemySpawn {
  id: string
  enemy: EnemyId
  x: number
  y: number
  /** 'start' = após a primeira porta; 'blackout' = reaparecimento após a extração */
  phase: 'start' | 'blackout'
  /** Segundos a mais, depois do começo da fase, até aparecer (entrada escalonada). */
  delay?: number
  /** Dano por golpe (padrão: o do config da criatura). */
  damage?: number
  /** Marca o alvo: depois de perder de vista, continua indo atrás do jogador por estes segundos; depois patrulha. */
  lockTime?: number
  /** Toca a música de perseguição enquanto o jogador for o alvo. */
  chaseMusic?: boolean
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
  /** Quantas relíquias precisam estar no extrator para ele levar tudo. */
  relicQuota: number
  playerStart: { x: number; y: number }
  /** Segundos após cruzar a primeira porta até os monstros aparecerem. */
  enemyDelay: number
}
