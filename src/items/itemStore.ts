import { create } from 'zustand'
import type { LevelData } from '../game/data/types'
import type { BuiltLevel } from '../world/buildLevel'
import { CARRY, ITEMS, SUPPLIES, SUPPLY_SPAWNS, type ItemDef } from './catalog'
import { useGameStore } from '../game/stores/gameStore'
import { toolInfo } from '../game/shop'

/** Prateleira do caminhão (exterior.ts): altura das tábuas (m), quantos por tábua e o espaço entre eles (u). */
const RACK = { shelves: [0.52, 1.02, 1.52], perShelf: 4, spacing: 7 }

type Vec3 = [number, number, number]

/**
 * Itens da partida. Um item está em um lugar só:
 *  - world: corpo físico no mapa (o Rapier guarda a posição; aqui fica só onde ele (re)nasce)
 *  - inventory: num dos 3 espaços (só pequenos)
 *  - hands: nas mãos (um por vez; médio ou grande, ou pequeno com o inventário cheio)
 *  - extracted: o extrator levou
 */
export type ItemPlace = 'world' | 'inventory' | 'hands' | 'extracted' | 'used'

export interface ItemInstance {
  uid: string
  def: ItemDef
  /** Valor atual (cai com impactos). */
  value: number
  place: ItemPlace
  /** Onde o corpo físico nasce quando volta ao mundo. */
  spawn: { pos: Vec3; yaw: number; vel: Vec3 }
  /** Muda a cada volta ao mundo, para recriar o corpo físico. */
  version: number
  /** Até quando (performance.now) impactos não estragam o item. */
  graceUntil: number
  /** Onde o item estava no começo da partida (a Guardiã sabe de onde saiu cada relíquia). */
  origin: Vec3
  /** Já foi pego alguma vez. */
  taken: boolean
  /** Objeto do Possessor (um saque por partida; continua amaldiçoado). */
  possessed: boolean
  /** O Possessor está fora do objeto agora (foi largado). */
  freed: boolean
  /** Já sussurrou uma vez: o jogador tem pistas de qual é. */
  revealed: boolean
}

/** O Possessor está dentro deste item agora. */
export function hasPossessor(item: ItemInstance) {
  return item.possessed && !item.freed
}

type FreedListener = (item: ItemInstance, at: Vec3) => void
const freedListeners = new Set<FreedListener>()

/** Avisa quando o objeto possuído é largado: o Possessor sai dele. */
export function onPossessorFreed(listener: FreedListener) {
  freedListeners.add(listener)
  return () => {
    freedListeners.delete(listener)
  }
}

type TakenListener = (item: ItemInstance) => void
const takenListeners = new Set<TakenListener>()

/** Avisa na primeira vez que cada item é pego (as entidades reagem às relíquias). */
export function onFirstTaken(listener: TakenListener) {
  takenListeners.add(listener)
  return () => {
    takenListeners.delete(listener)
  }
}

interface ItemState {
  items: Record<string, ItemInstance>
  slots: (string | null)[]
  selected: number
  hands: string | null
  /** Sorteia os itens do nível (início e recomeço). */
  roll: (level: LevelData, built: BuiltLevel) => void
  /** Onde o item iria ao pegar; null = não cabe. */
  wouldGo: (uid: string) => 'inventory' | 'hands' | null
  pickUp: (uid: string) => boolean
  /** Devolve ao mundo na posição dada. */
  drop: (uid: string, pos: Vec3, yaw: number, vel?: Vec3) => void
  /** Larga o que está nas mãos ou, com as mãos livres, o espaço selecionado. Devolve o uid largado. */
  dropCurrent: (pos: (item: ItemInstance) => Vec3, yaw: number) => string | null
  /** Morte: tudo o que carrega cai em volta da posição. */
  dropAll: (pos: Vec3) => void
  select: (slot: number) => void
  /** Impacto a `speed` m/s. */
  impact: (uid: string, speed: number) => void
  /** O extrator levou estes itens. */
  extract: (uids: string[]) => void
  /** Suprimento pego: some do mapa (o efeito é aplicado por quem chamou). */
  consume: (uid: string) => ItemDef | null
  /** O Possessor voltou para dentro do objeto. */
  repossess: (uid: string) => void
  /** Cria um item fora do sorteio (ex.: a cabeça que A COISA solta). */
  spawnItem: (def: ItemDef, uid: string, pos: Vec3) => void
  /** Some com o item de onde estiver (ex.: cabeça entregue no carro). */
  discard: (uid: string) => void
  /** Primeiro sussurro: o objeto passa a dar pistas. */
  reveal: (uid: string) => void
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)]

/** Metade da altura do item, para apoiar no chão. */
export function halfHeight(def: ItemDef) {
  return def.shape === 'box' ? def.dims[1] / 2 : def.shape === 'cylinder' ? def.dims[1] / 2 : def.dims[0]
}

export function isBroken(item: ItemInstance) {
  return item.value <= 0
}

export function isCarried(item: ItemInstance) {
  return item.place === 'inventory' || item.place === 'hands'
}

export const useItemStore = create<ItemState>((set, get) => {
  /** Tira o item de onde estiver (espaço ou mãos). */
  const release = (s: ItemState, uid: string) => ({
    slots: s.slots.map((u) => (u === uid ? null : u)),
    hands: s.hands === uid ? null : s.hands,
  })

  return {
    items: {},
    slots: Array(CARRY.slots).fill(null),
    selected: 0,
    hands: null,

    roll: (level, built) => {
      // relíquias: meta + 1 (se houver pontos), o resto vira saque
      const relicSpots = shuffle(level.itemSpawns.filter((s) => s.accepts.includes('relic')))
      const relicIds = new Set(relicSpots.slice(0, level.relicQuota + 1).map((s) => s.id))
      const relics = shuffle(ITEMS.filter((d) => d.tag === 'relic'))
      const loot = ITEMS.filter((d) => d.tag === 'loot')
      // alguns pontos de saque viram pilhas
      const supplyIds = new Set(
        shuffle(level.itemSpawns.filter((s) => !relicIds.has(s.id) && s.accepts.includes('loot')))
          .slice(0, SUPPLY_SPAWNS)
          .map((s) => s.id),
      )
      const items: Record<string, ItemInstance> = {}
      let r = 0
      for (const s of level.itemSpawns) {
        let def: ItemDef | undefined
        if (relicIds.has(s.id)) def = relics[r++ % relics.length]
        else if (supplyIds.has(s.id)) def = pick(SUPPLIES)
        else if (s.accepts.includes('loot')) def = pick(loot)
        if (!def) continue
        const [x, , z] = built.toWorld(s.x, s.y)
        items[s.id] = {
          uid: s.id,
          def,
          value: def.value,
          place: 'world',
          // cai de 1,2 m para assentar no chão ou no móvel embaixo
          spawn: { pos: [x, 1.2, z], yaw: Math.random() * Math.PI * 2, vel: [0, 0, 0] },
          version: 0,
          graceUntil: performance.now() + CARRY.spawnGrace,
          origin: [x, 0, z],
          taken: false,
          possessed: false,
          freed: false,
          revealed: false,
        }
      }
      // ferramentas compradas na loja: na prateleira do caminhão (4 por tábua, de baixo para cima);
      // sem prateleira, no chão do carro
      const car = level.rooms.find((r) => r.kind === 'car')
      const rack = level.props.find((p) => p.type === 'rack')
      if (car) {
        const stamp = performance.now().toFixed(0)
        useGameStore
          .getState()
          .takeEquipment()
          .forEach((id, i) => {
            const [x, y, z] = rack
              ? built.toWorld(
                  rack.x + ((i % RACK.perShelf) - (RACK.perShelf - 1) / 2) * RACK.spacing,
                  rack.y,
                  RACK.shelves[Math.floor(i / RACK.perShelf) % RACK.shelves.length] + 0.12,
                )
              : built.toWorld(car.x + car.w * 0.35 + (i % 4) * 5, car.y + car.h * 0.3 + Math.floor(i / 4) * 6, 0.4)
            const def = toolInfo(id).def
            const uid = `tool-${id}-${i}-${stamp}`
            items[uid] = {
              uid,
              def,
              value: 0,
              place: 'world',
              spawn: { pos: [x, y, z], yaw: rack ? 0 : Math.random() * Math.PI, vel: [0, 0, 0] },
              version: 0,
              graceUntil: performance.now() + CARRY.spawnGrace,
              origin: [x, 0, z],
              taken: false,
              possessed: false,
              freed: false,
              revealed: false,
            }
          })
      }
      // o Possessor entra num saque qualquer
      const cursed = shuffle(Object.values(items).filter((it) => it.def.tag === 'loot'))[0]
      if (cursed) cursed.possessed = true
      set({ items, slots: Array(CARRY.slots).fill(null), selected: 0, hands: null })
    },

    wouldGo: (uid) => {
      const { items, slots, hands } = get()
      const it = items[uid]
      if (!it || it.place !== 'world') return null
      if (it.def.size === 'small' && slots.includes(null)) return 'inventory'
      return hands === null ? 'hands' : null
    },

    pickUp: (uid) => {
      const to = get().wouldGo(uid)
      if (!to) return false
      const first = !get().items[uid].taken
      set((s) => {
        const items = { ...s.items, [uid]: { ...s.items[uid], place: to, taken: true } }
        if (to === 'hands') return { items, hands: uid }
        const free = s.slots.indexOf(null)
        const slots = [...s.slots]
        slots[free] = uid
        return { items, slots, selected: free }
      })
      if (first) takenListeners.forEach((l) => l(get().items[uid]))
      return true
    },

    drop: (uid, pos, yaw, vel = [0, 0, 0]) => {
      const before = get().items[uid]
      if (!before || !isCarried(before)) return
      // largar o objeto possuído liberta o Possessor
      const frees = hasPossessor(before)
      set((s) => ({
        ...release(s, uid),
        items: {
          ...s.items,
          [uid]: {
            ...before,
            place: 'world',
            spawn: { pos, yaw, vel },
            version: before.version + 1,
            graceUntil: 0,
            freed: before.freed || frees,
          },
        },
      }))
      if (frees) freedListeners.forEach((l) => l(get().items[uid], pos))
    },

    dropCurrent: (pos, yaw) => {
      const s = get()
      const uid = s.hands ?? s.slots[s.selected]
      if (!uid) return null
      s.drop(uid, pos(s.items[uid]), yaw)
      return uid
    },

    dropAll: ([x, y, z]) => {
      const s = get()
      const carried = Object.values(s.items).filter(isCarried)
      carried.forEach((it, i) => {
        const a = (i / Math.max(carried.length, 1)) * Math.PI * 2
        s.drop(it.uid, [x + Math.cos(a) * 0.4, y + halfHeight(it.def) + 0.3, z + Math.sin(a) * 0.4], a)
      })
    },

    select: (slot) => set({ selected: Math.max(0, Math.min(CARRY.slots - 1, slot)) }),

    impact: (uid, speed) =>
      set((s) => {
        const it = s.items[uid]
        if (!it || speed <= CARRY.safeImpact || performance.now() < it.graceUntil || isBroken(it)) return s
        const lost = it.def.value * it.def.fragility * (speed - CARRY.safeImpact) * CARRY.damagePerImpact
        let value = Math.max(0, Math.round(it.value - lost))
        if (value < it.def.value * CARRY.brokenAt) value = 0
        return value === it.value ? s : { items: { ...s.items, [uid]: { ...it, value } } }
      }),

    extract: (uids) =>
      set((s) => {
        const items = { ...s.items }
        for (const uid of uids) if (items[uid]) items[uid] = { ...items[uid], place: 'extracted' }
        return { items }
      }),

    consume: (uid) => {
      const it = get().items[uid]
      if (!it || it.place !== 'world' || it.def.tag !== 'supply') return null
      set((s) => ({ items: { ...s.items, [uid]: { ...it, place: 'used' } } }))
      return it.def
    },

    spawnItem: (def, uid, pos) =>
      set((s) => ({
        items: {
          ...s.items,
          [uid]: {
            uid,
            def,
            value: def.value,
            place: 'world',
            spawn: { pos, yaw: Math.random() * Math.PI * 2, vel: [0, 0, 0] },
            version: 0,
            graceUntil: performance.now() + CARRY.spawnGrace,
            origin: [pos[0], 0, pos[2]],
            taken: false,
            possessed: false,
            freed: false,
            revealed: false,
          },
        },
      })),

    discard: (uid) =>
      set((s) => (s.items[uid] ? { ...release(s, uid), items: { ...s.items, [uid]: { ...s.items[uid], place: 'used' } } } : s)),

    repossess: (uid) => set((s) => (s.items[uid] ? { items: { ...s.items, [uid]: { ...s.items[uid], freed: false } } } : s)),

    reveal: (uid) =>
      set((s) => (s.items[uid] && !s.items[uid].revealed ? { items: { ...s.items, [uid]: { ...s.items[uid], revealed: true } } } : s)),
  }
})
