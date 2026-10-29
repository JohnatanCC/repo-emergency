import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { LevelData, Room } from '../game/data/types'
import { WALL_THICKNESS, type BuiltLevel } from './buildLevel'
import { getTexture } from './textures'
import { decorTextures } from './decorTextures'
import { DECOR } from '../game/config'

/**
 * Decoração gerada a partir da planta: quadros, arandelas, rodapés, teias,
 * manchas, tapetes, papéis no chão, vigas, lustres e mato lá fora. Só
 * aparência (sem colisor), longe das portas e dos móveis altos. Tudo que usa o
 * mesmo material vira uma malha só, para não pesar.
 */

type MatKey =
  | 'wood'
  | 'brass'
  | 'wax'
  | 'flame'
  | 'portrait'
  | 'landscape'
  | 'stillLife'
  | 'rug'
  | 'web'
  | 'stain'
  | 'paper'
  | 'grass'
  | 'iron'

interface Piece {
  geo: THREE.BufferGeometry
  mat: MatKey
}

function makeMaterials(): Record<MatKey, THREE.Material> {
  const t = decorTextures()
  const decal = (map: THREE.Texture, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.1, depthWrite: false, roughness: 1, ...extra })
  return {
    wood: new THREE.MeshStandardMaterial({ map: getTexture('darkwood', 1, 1, 1), roughness: 0.9 }),
    brass: new THREE.MeshStandardMaterial({ color: '#7a5a24', metalness: 0.6, roughness: 0.45 }),
    iron: new THREE.MeshStandardMaterial({ color: '#2a2622', metalness: 0.5, roughness: 0.7 }),
    wax: new THREE.MeshStandardMaterial({ color: '#d8ccb0', roughness: 0.8 }),
    flame: new THREE.MeshBasicMaterial({ color: '#ffb458' }),
    portrait: new THREE.MeshStandardMaterial({ map: t.portrait, roughness: 0.9 }),
    landscape: new THREE.MeshStandardMaterial({ map: t.landscape, roughness: 0.9 }),
    stillLife: new THREE.MeshStandardMaterial({ map: t.stillLife, roughness: 0.9 }),
    rug: new THREE.MeshStandardMaterial({ map: t.rug, roughness: 1 }),
    web: decal(t.web, { side: THREE.DoubleSide }),
    stain: decal(t.stain, { polygonOffset: true, polygonOffsetFactor: -2 }),
    paper: new THREE.MeshStandardMaterial({ map: t.paper, roughness: 1, side: THREE.DoubleSide }),
    grass: decal(t.grass, { side: THREE.DoubleSide, alphaTest: 0.4, depthWrite: true }),
  }
}

/** Gerador determinístico por nível: a mesma casa sempre tem a mesma decoração. */
function rng(text: string) {
  let s = 7
  for (const ch of text) s = (s * 31 + ch.charCodeAt(0)) % 2147483647
  s = s || 1
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

interface Side {
  /** Pontos de início e fim na parede (mundo), e a normal para dentro da sala. */
  a: THREE.Vector3
  b: THREE.Vector3
  n: THREE.Vector3
  /** Trechos livres (0–1 ao longo da parede), já sem portas. */
  free: [number, number][]
}

export function buildDecor(level: LevelData, built: BuiltLevel): Piece[] {
  const r = rng(level.id)
  const s = level.scale
  const H = level.wallHeight
  // cada sala tem a própria parede, inteira do lado de dentro da linha da planta
  const inset = WALL_THICKNESS
  const pieces: Piece[] = []
  const add = (geo: THREE.BufferGeometry, mat: MatKey, pos: THREE.Vector3, rotY = 0, rotX = 0, rotZ = 0, scale?: THREE.Vector3) => {
    const m = new THREE.Matrix4().compose(
      pos,
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, rotY, rotZ, 'YXZ')),
      scale ?? new THREE.Vector3(1, 1, 1),
    )
    pieces.push({ geo: geo.clone().applyMatrix4(m), mat })
  }

  // móveis altos (estante, armário) tapam a parede: nada pendurado atrás deles
  const tall = level.props
    .filter((p) => p.type === 'shelf' || p.type === 'wardrobe')
    .map((p) => {
      const [x, , z] = built.toWorld(p.x, p.y)
      return { x, z, r: p.type === 'shelf' ? ((p.w ?? 80) * s) / 2 + 0.4 : 1 }
    })
  const props = level.props.map((p) => {
    const [x, , z] = built.toWorld(p.x, p.y)
    return { x, z }
  })
  const nearTall = (p: THREE.Vector3) => tall.some((t) => Math.hypot(t.x - p.x, t.z - p.z) < t.r)
  const nearProp = (p: THREE.Vector3, d: number) => props.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < d)

  const sidesOf = (room: Room): Side[] => {
    const corners = {
      nw: built.toWorld(room.x, room.y),
      ne: built.toWorld(room.x + room.w, room.y),
      sw: built.toWorld(room.x, room.y + room.h),
      se: built.toWorld(room.x + room.w, room.y + room.h),
    }
    const v = (p: number[]) => new THREE.Vector3(p[0], 0, p[2])
    const raw: { a: THREE.Vector3; b: THREE.Vector3; n: THREE.Vector3; horizontal: boolean; line: number; from: number; to: number }[] = [
      {
        a: v(corners.nw),
        b: v(corners.ne),
        n: new THREE.Vector3(0, 0, 1),
        horizontal: true,
        line: room.y,
        from: room.x,
        to: room.x + room.w,
      },
      {
        a: v(corners.se),
        b: v(corners.sw),
        n: new THREE.Vector3(0, 0, -1),
        horizontal: true,
        line: room.y + room.h,
        from: room.x + room.w,
        to: room.x,
      },
      {
        a: v(corners.sw),
        b: v(corners.nw),
        n: new THREE.Vector3(1, 0, 0),
        horizontal: false,
        line: room.x,
        from: room.y + room.h,
        to: room.y,
      },
      {
        a: v(corners.ne),
        b: v(corners.se),
        n: new THREE.Vector3(-1, 0, 0),
        horizontal: false,
        line: room.x + room.w,
        from: room.y,
        to: room.y + room.h,
      },
    ]
    return raw.map((side) => {
      // trechos ocupados por portas e passagens nesta parede (com folga)
      const len = Math.abs(side.to - side.from)
      const gaps: [number, number][] = []
      for (const o of built.openings) {
        const onLine = side.horizontal
          ? o.y - 3 <= side.line && o.y + o.h + 3 >= side.line
          : o.x - 3 <= side.line && o.x + o.w + 3 >= side.line
        if (!onLine) continue
        const [o0, o1] = side.horizontal ? [o.x, o.x + o.w] : [o.y, o.y + o.h]
        const t0 = (o0 - side.from) / (side.to - side.from)
        const t1 = (o1 - side.from) / (side.to - side.from)
        const pad = DECOR.doorClearance / s / len
        const lo = Math.min(t0, t1) - pad
        const hi = Math.max(t0, t1) + pad
        if (hi > 0 && lo < 1) gaps.push([lo, hi])
      }
      gaps.sort((p, q) => p[0] - q[0])
      const free: [number, number][] = []
      let cur = 0.02
      for (const [lo, hi] of gaps) {
        if (lo > cur) free.push([cur, lo])
        cur = Math.max(cur, hi)
      }
      if (cur < 0.98) free.push([cur, 0.98])
      return { a: side.a, b: side.b, n: side.n, free }
    })
  }

  const at = (side: Side, t: number, y: number, off: number) =>
    side.a
      .clone()
      .lerp(side.b, t)
      .addScaledVector(side.n, inset + off)
      .setY(y)
  const yawOf = (n: THREE.Vector3) => Math.atan2(n.x, n.z)

  // geometrias base (clonadas e posicionadas em `add`)
  const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d)
  const plane = (w: number, h: number) => new THREE.PlaneGeometry(w, h)
  const cyl = (rt: number, rb: number, h: number, seg = 6) => new THREE.CylinderGeometry(rt, rb, h, seg)

  for (const room of level.rooms) {
    if (room.kind === 'car' || room.kind === 'extraction') continue
    const area = room.w * room.h * s * s
    const [cx, , cz] = built.toWorld(room.x + room.w / 2, room.y + room.h / 2)
    const center = new THREE.Vector3(cx, 0, cz)
    const half = { x: (room.w * s) / 2, z: (room.h * s) / 2 }
    const floorPoint = (margin: number) =>
      new THREE.Vector3(cx + (r() * 2 - 1) * (half.x - margin), 0, cz + (r() * 2 - 1) * (half.z - margin))

    // ---- lá fora: mato seco e folhas
    if (room.kind === 'outdoor') {
      const tufts = Math.min(DECOR.grassMax, Math.round(area * DECOR.grassPerM2))
      for (let i = 0; i < tufts; i++) {
        const p = floorPoint(0.3)
        if (nearProp(p, 0.8)) continue
        const size = 0.3 + r() * 0.35
        const g = plane(size, size)
        const yaw = r() * Math.PI
        add(g, 'grass', p.clone().setY(size / 2), yaw)
        add(g, 'grass', p.clone().setY(size / 2), yaw + Math.PI / 2)
      }
      continue
    }

    const sides = sidesOf(room)
    const decorWalls = room.wall === 'wallpaper' || room.wall === 'panel' || room.wall === 'brick'
    const dark = room.light === 'dark'

    for (const side of sides) {
      const len = side.a.distanceTo(side.b)
      const yaw = yawOf(side.n)
      for (const [t0, t1] of side.free) {
        // rodapé e (papel de parede) meia-cana
        const segLen = (t1 - t0) * len
        if (segLen < 0.2) continue
        const mid = (t0 + t1) / 2
        add(box(segLen, 0.13, 0.025), 'wood', at(side, mid, 0.065, 0.012), yaw)
        if (room.wall === 'wallpaper') add(box(segLen, 0.04, 0.02), 'wood', at(side, mid, 0.95, 0.01), yaw)

        // quadros e arandelas, espaçados ao longo do trecho
        if (!decorWalls) continue
        const step = DECOR.wallItemEvery
        const count = Math.floor(segLen / step)
        for (let k = 0; k < count; k++) {
          const t = t0 + ((k + 0.5) / count) * (t1 - t0)
          const p = at(side, t, 0, 0)
          if (nearTall(p)) continue
          const roll = r()
          if (roll < DECOR.paintingChance) {
            const kind = (['portrait', 'landscape', 'stillLife'] as const)[Math.floor(r() * 3)]
            const [w, h] = kind === 'portrait' ? [0.55, 0.7] : kind === 'landscape' ? [0.9, 0.6] : [0.6, 0.6]
            const y = 1.55 + r() * 0.2
            // alguns tortos
            const tilt = r() < 0.3 ? (r() - 0.5) * 0.25 : 0
            add(box(w + 0.1, h + 0.1, 0.04), 'wood', at(side, t, y, 0.02), yaw, 0, tilt)
            add(plane(w, h), kind, at(side, t, y, 0.042), yaw, 0, tilt)
          } else if (roll < DECOR.paintingChance + DECOR.sconceChance) {
            // arandela: placa, braço, vela (acesa só nas salas que não são escuras)
            const y = 1.75
            add(box(0.1, 0.18, 0.02), 'brass', at(side, t, y, 0.01), yaw)
            add(box(0.03, 0.03, 0.14), 'brass', at(side, t, y - 0.05, 0.08), yaw)
            add(cyl(0.035, 0.025, 0.03), 'brass', at(side, t, y - 0.02, 0.15), yaw)
            add(cyl(0.016, 0.016, 0.1), 'wax', at(side, t, y + 0.04, 0.15), yaw)
            if (!dark) add(new THREE.ConeGeometry(0.012, 0.035, 4), 'flame', at(side, t, y + 0.11, 0.15), yaw)
          }
        }

        // manchas de umidade e sujeira
        const stains = Math.round(segLen * (dark || room.wall === 'tile' ? DECOR.stainsDark : DECOR.stains))
        for (let k = 0; k < stains; k++) {
          const t = t0 + r() * (t1 - t0)
          const w = 0.4 + r() * 0.9
          const h = 0.5 + r() * 1.4
          const fromTop = r() < 0.5
          add(plane(w, h), 'stain', at(side, t, fromTop ? H - h / 2 : h / 2, 0.006), yaw)
        }
      }
    }

    // teias nos cantos de cima
    const corners = [
      [room.x, room.y],
      [room.x + room.w, room.y],
      [room.x, room.y + room.h],
      [room.x + room.w, room.y + room.h],
    ]
    for (const [px, py] of corners) {
      if (r() > (dark ? DECOR.webChanceDark : DECOR.webChance)) continue
      const [x, , z] = built.toWorld(px, py)
      const toCenter = Math.atan2(cx - x, cz - z)
      const size = 0.5 + r() * 0.4
      const p = new THREE.Vector3(x, H - size * 0.35, z).add(
        new THREE.Vector3(Math.sin(toCenter), 0, Math.cos(toCenter)).multiplyScalar(size * 0.35 + inset),
      )
      add(plane(size, size), 'web', p, toCenter, 0, -Math.PI / 4)
    }

    // tapete no meio das salas
    if (room.kind === 'room' && room.floor !== 'tile' && area > 12 && r() < DECOR.rugChance) {
      const w = Math.min(half.x * 1.2, 3.2)
      const d = Math.min(half.z * 1.2, 4.4)
      add(box(w, 0.012, d), 'rug', center.clone().setY(0.006), r() < 0.5 ? 0 : Math.PI)
    }

    // papéis espalhados (mais nos corredores e salas escuras)
    const papers = Math.round(area * (room.kind === 'corridor' || dark ? DECOR.papersDark : DECOR.papers))
    for (let i = 0; i < papers; i++) {
      const p = floorPoint(0.3)
      if (nearProp(p, 0.6)) continue
      add(plane(0.21, 0.28), 'paper', p.setY(0.004 + i * 0.0003), r() * Math.PI * 2, -Math.PI / 2)
    }

    // velas no chão nas salas escuras, encostadas na parede
    if (dark && room.kind === 'room') {
      const side = sides[Math.floor(r() * 4)]
      const span = side.free[Math.floor(r() * side.free.length)]
      if (span) {
        const base = at(side, (span[0] + span[1]) / 2, 0, 0.25)
        for (let k = 0; k < 4; k++) {
          const h = 0.08 + r() * 0.16
          const p = base.clone().add(new THREE.Vector3((r() - 0.5) * 0.4, h / 2, (r() - 0.5) * 0.4))
          add(cyl(0.025, 0.028, h), 'wax', p)
        }
      }
    }

    // corredores: vigas no teto
    if (room.kind === 'corridor') {
      const along = room.w >= room.h ? 'x' : 'z'
      const length = along === 'x' ? room.w * s : room.h * s
      const across = along === 'x' ? room.h * s : room.w * s
      for (let d = DECOR.beamEvery / 2; d < length; d += DECOR.beamEvery) {
        const p = center.clone().setY(H - 0.1)
        if (along === 'x') p.x += d - length / 2
        else p.z += d - length / 2
        add(box(0.18, 0.2, across), 'wood', p, along === 'x' ? 0 : Math.PI / 2)
      }
    }

    // lustre nas salas grandes e claras
    if (room.kind === 'room' && room.light !== 'dark' && area > DECOR.chandelierArea) {
      const y = H - 0.95
      add(cyl(0.01, 0.01, 0.95, 4), 'iron', center.clone().setY(H - 0.475))
      add(new THREE.TorusGeometry(0.45, 0.025, 4, 10), 'iron', center.clone().setY(y), 0, Math.PI / 2)
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2
        const p = center.clone().add(new THREE.Vector3(Math.cos(a) * 0.45, y + 0.06, Math.sin(a) * 0.45))
        add(cyl(0.035, 0.02, 0.03), 'brass', p.clone().setY(y + 0.02))
        add(cyl(0.015, 0.015, 0.1), 'wax', p)
        // velas apagadas, algumas quebradas: sem chama
      }
    }
  }
  return pieces
}

export function Decor({ level, built }: { level: LevelData; built: BuiltLevel }) {
  const materials = useMemo(makeMaterials, [])
  const meshes = useMemo(() => {
    const byMat = new Map<MatKey, THREE.BufferGeometry[]>()
    for (const p of buildDecor(level, built)) {
      const list = byMat.get(p.mat) ?? []
      // tudo sem índice: geometrias de tipos diferentes juntam sem conflito
      list.push(p.geo.index ? p.geo.toNonIndexed() : p.geo)
      byMat.set(p.mat, list)
    }
    return [...byMat].map(([mat, geos]) => ({ mat, geo: mergeGeometries(geos) }))
  }, [level, built])
  useEffect(() => () => meshes.forEach((m) => m.geo?.dispose()), [meshes])

  return <group>{meshes.map(({ mat, geo }) => geo && <mesh key={mat} geometry={geo} material={materials[mat]} receiveShadow />)}</group>
}
