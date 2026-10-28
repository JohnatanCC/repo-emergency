import { create } from 'zustand'
import type { LevelData } from '../game/data/types'
import type { BuiltLevel } from '../world/buildLevel'
import { CARRY, ITEMS, type ItemDef } from './catalog'

type Vec3 = [number, number, number]

/**
 * Itens da partida. Um item está em um lugar só:
 *  - world: corpo físico no mapa (o Rapier guarda a posição; aqui fica só onde ele (re)nasce)
 *  - inventory: num dos 3 espaços (só pequenos)
 *  - hands: nas mãos (um por vez; médio ou grande, ou pequeno com o inventário cheio)
 */
export type ItemPlace = 'world' | 'inventory' | 'hands'

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
}

interface ItemState {
  items: Record<string, ItemInstance>
  slots: (string | null)[]
  selected: number
  hands: string | null
  /** Sorteia os itens do nível (início e recomeço). */
  roll: (level: LevelData, built: BuiltLevel) => void
  /** Onde o item iria ao pegar; null = não cabe. */
  wouldGo: (uid: string) => Exclude<ItemPlace, 'world'> | null
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
      const items: Record<string, ItemInstance> = {}
      let r = 0
      for (const s of level.itemSpawns) {
        let def: ItemDef | undefined
        if (relicIds.has(s.id)) def = relics[r++ % relics.length]
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
        }
      }
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
      set((s) => {
        const items = { ...s.items, [uid]: { ...s.items[uid], place: to } }
        if (to === 'hands') return { items, hands: uid }
        const free = s.slots.indexOf(null)
        const slots = [...s.slots]
        slots[free] = uid
        return { items, slots, selected: free }
      })
      return true
    },

    drop: (uid, pos, yaw, vel = [0, 0, 0]) =>
      set((s) => {
        const it = s.items[uid]
        if (!it || it.place === 'world') return s
        return {
          ...release(s, uid),
          items: { ...s.items, [uid]: { ...it, place: 'world', spawn: { pos, yaw, vel }, version: it.version + 1, graceUntil: 0 } },
        }
      }),

    dropCurrent: (pos, yaw) => {
      const s = get()
      const uid = s.hands ?? s.slots[s.selected]
      if (!uid) return null
      s.drop(uid, pos(s.items[uid]), yaw)
      return uid
    },

    dropAll: ([x, y, z]) => {
      const s = get()
      const carried = Object.values(s.items).filter((it) => it.place !== 'world')
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
  }
})
