import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { LevelData, Room } from '../game/data/types'
import { WALL_THICKNESS, type BuiltLevel } from './buildLevel'
import { EXTERIOR_ID, TRUCK_ID } from '../game/data/levels/exterior'
import { useGameStore } from '../game/stores/gameStore'
import { getTexture } from './textures'
import { FOG } from '../game/config'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { WORLD_GROUPS } from '../game/physics'
import { FRONT_DOOR } from './buildLevel'

/**
 * O que se vê do lado de fora e não é móvel: estrada, cascalho do caminho,
 * grade de ferro na barreira, fachada (janelas, cornija, telhado, varanda),
 * o caminhão por fora (cabine, rodas, portas abertas, logo do C.R.O.S) e a
 * névoa (rasteira, em placas, e a do horizonte, em `FogController`).
 * Tudo junto numa malha por material.
 */

function canvasTex(w: number, h: number, paint: (c: CanvasRenderingContext2D) => void, repeat = false) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  paint(canvas.getContext('2d')!)
  const t = new THREE.CanvasTexture(canvas)
  t.magFilter = t.minFilter = THREE.NearestFilter
  t.generateMipmaps = false
  t.colorSpace = THREE.SRGBColorSpace
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

interface FenceCollider {
  pos: [number, number, number]
  half: [number, number, number]
  yaw: number
}

function makeMaterials() {
  const logo = canvasTex(64, 24, (c) => {
    c.fillStyle = '#3a3a34'
    c.fillRect(0, 0, 64, 24)
    c.strokeStyle = '#8a7a4a'
    c.strokeRect(1.5, 1.5, 61, 21)
    c.fillStyle = '#c8b070'
    c.font = 'bold 11px monospace'
    c.textAlign = 'center'
    c.fillText('C.R.O.S', 32, 11)
    c.font = '6px monospace'
    c.fillText('RECUPERAÇÃO', 32, 19)
  })
  const gravel = canvasTex(
    16,
    16,
    (c) => {
      c.fillStyle = '#4a463e'
      c.fillRect(0, 0, 16, 16)
      for (let i = 0; i < 60; i++) {
        c.fillStyle = ['#5a564c', '#3a362e', '#6a6458'][i % 3]
        c.fillRect((i * 7) % 16, (i * 11) % 16, 1 + (i % 2), 1)
      }
    },
    true,
  )
  const asphalt = canvasTex(
    16,
    16,
    (c) => {
      c.fillStyle = '#1e1e20'
      c.fillRect(0, 0, 16, 16)
      for (let i = 0; i < 40; i++) {
        c.fillStyle = i % 2 ? '#262628' : '#18181a'
        c.fillRect((i * 5) % 16, (i * 13) % 16, 1, 1)
      }
    },
    true,
  )
  const mist = canvasTex(32, 32, (c) => {
    const g = c.createRadialGradient(16, 16, 0, 16, 16, 16)
    g.addColorStop(0, 'rgba(160,165,175,0.9)')
    g.addColorStop(1, 'rgba(160,165,175,0)')
    c.fillStyle = g
    c.fillRect(0, 0, 32, 32)
  })
  return {
    iron: new THREE.MeshStandardMaterial({ color: '#1c1a18', metalness: 0.5, roughness: 0.75 }),
    stone: new THREE.MeshStandardMaterial({ map: getTexture('stone', 1.6, 1.6), color: '#8a887c', roughness: 1 }),
    frame: new THREE.MeshStandardMaterial({ map: getTexture('darkwood', 1, 1, 1), roughness: 0.9 }),
    window: new THREE.MeshStandardMaterial({ color: '#0a0c10', roughness: 0.2, metalness: 0.4 }),
    windowLit: new THREE.MeshStandardMaterial({ color: '#2a2010', emissive: '#a8742e', emissiveIntensity: 0.3 }),
    roof: new THREE.MeshStandardMaterial({ color: '#16141a', roughness: 1, flatShading: true }),
    gravel: new THREE.MeshStandardMaterial({ map: gravel, roughness: 1 }),
    asphalt: new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.9 }),
    paint: new THREE.MeshBasicMaterial({ color: '#8a8470' }),
    truck: new THREE.MeshStandardMaterial({ color: '#4a4c44', metalness: 0.4, roughness: 0.6, flatShading: true }),
    tire: new THREE.MeshStandardMaterial({ color: '#111111', roughness: 1, flatShading: true }),
    glass: new THREE.MeshStandardMaterial({ color: '#10141a', metalness: 0.6, roughness: 0.15 }),
    headlight: new THREE.MeshBasicMaterial({ color: '#ffe8b0' }),
    taillight: new THREE.MeshBasicMaterial({ color: '#a01010' }),
    logo: new THREE.MeshStandardMaterial({ map: logo, roughness: 0.8 }),
    mist: new THREE.MeshBasicMaterial({ map: mist, transparent: true, opacity: FOG.mistOpacity, depthWrite: false, fog: true }),
  }
}
type MatKey = keyof ReturnType<typeof makeMaterials>

function buildExterior(level: LevelData, built: BuiltLevel) {
  const yard = level.rooms.find((r) => r.id === EXTERIOR_ID)
  const truck = level.rooms.find((r) => r.id === TRUCK_ID)
  const out = new Map<MatKey, THREE.BufferGeometry[]>()
  const colliders: FenceCollider[] = []
  if (!yard || !truck) return { meshes: out, colliders }
  const s = level.scale
  const H = level.wallHeight * 1.9
  const T = WALL_THICKNESS
  let seed = 3
  const r = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  const add = (
    mat: MatKey,
    g: THREE.BufferGeometry,
    pos: [number, number, number],
    rot: [number, number, number] = [0, 0, 0],
    uv?: number,
  ) => {
    if (uv) {
      // repetição da textura pelo tamanho (asfalto, cascalho)
      const a = g.attributes.uv
      for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * uv, a.getY(i) * uv)
    }
    g.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(...pos),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot, 'YXZ')),
        new THREE.Vector3(1, 1, 1),
      ),
    )
    const list = out.get(mat) ?? []
    list.push(g.index ? g.toNonIndexed() : g)
    out.set(mat, list)
  }
  const w = (x: number, y: number, h = 0) => built.toWorld(x, y, h)
  const pathY = truck.y + truck.h / 2
  const front = yard.x + yard.w

  // ---- chão: estrada atrás do caminhão (some na névoa) e cascalho até a porta
  const [rx, , rz] = w(truck.x - 30, pathY)
  const roadLen = 140
  add('asphalt', new THREE.PlaneGeometry(roadLen, 7.5), [rx, 0.005, rz], [-Math.PI / 2, Math.PI / 2, 0], 1)
  for (let d = -roadLen / 2; d < roadLen / 2; d += 4)
    add('paint', new THREE.PlaneGeometry(0.15, 2), [rx, 0.01, rz + d], [-Math.PI / 2, 0, 0])
  // chão em volta da estrada, para não ver o vazio por trás da névoa
  add('roof', new THREE.PlaneGeometry(roadLen, 60), [rx - 5, -0.01, rz], [-Math.PI / 2, 0, 0])
  const [px, , pz] = w((yard.x + front) / 2, pathY)
  const pathLen = yard.w * s
  add('gravel', new THREE.PlaneGeometry(pathLen, 2.6), [px, 0.012, pz], [-Math.PI / 2, 0, 0], 6)

  // ---- grade de ferro na barreira (norte, sul e oeste do jardim), com falhas e barras tortas.
  // Feita em trechos: o vão da traseira do caminhão fica livre (barras e trilhos), e cada trecho tem colisor.
  const fence = (ax: number, ay: number, bx: number, by: number, skip?: [number, number]) => {
    const a = new THREE.Vector3(...w(ax, ay))
    const b = new THREE.Vector3(...w(bx, by))
    const len = a.distanceTo(b)
    const dir = b.clone().sub(a).normalize()
    const yaw = Math.atan2(dir.x, dir.z)
    // trechos em metros ao longo da linha, sem o vão
    const toM = (u: number) => ((u - (ax === bx ? ay : ax)) / ((ax === bx ? by - ay : bx - ax) || 1)) * len
    const parts: [number, number][] = skip
      ? [
          [0, toM(skip[0])],
          [toM(skip[1]), len],
        ]
      : [[0, len]]
    for (const [d0, d1] of parts) {
      if (d1 - d0 < 0.2) continue
      for (let d = d0 + 0.1; d < d1; d += 0.16) {
        const p = a.clone().addScaledVector(dir, d)
        if (r() < 0.04) continue
        const tilt = r() < 0.06 ? (r() - 0.5) * 0.5 : 0
        add('iron', new THREE.BoxGeometry(0.025, 1.9, 0.025), [p.x, 0.95, p.z], [0, yaw, tilt])
        add('iron', new THREE.ConeGeometry(0.03, 0.1, 4), [p.x, 1.95, p.z], [0, 0, tilt])
      }
      const m = a.clone().addScaledVector(dir, (d0 + d1) / 2)
      for (const h of [0.25, 1.6]) add('iron', new THREE.BoxGeometry(0.04, 0.05, d1 - d0), [m.x, h, m.z], [0, yaw, 0])
      colliders.push({ pos: [m.x, 1, m.z], half: [0.06, 1, (d1 - d0) / 2], yaw })
    }
  }
  const inset = 0.6 / s
  fence(yard.x + inset, yard.y + inset, front - 2, yard.y + inset)
  fence(yard.x + inset, yard.y + yard.h - inset, front - 2, yard.y + yard.h - inset)
  fence(yard.x + inset, yard.y + inset, yard.x + inset, yard.y + yard.h - inset, [truck.y - 6, truck.y + truck.h + 6])

  // ---- fachada (parede leste do jardim, vista de oeste)
  const facadeX = front - T / s - 0.05 / s
  const [fx] = w(facadeX, 0)
  const [, , fz0] = w(0, yard.y)
  const [, , fz1] = w(0, yard.y + yard.h)
  const fzDoor = w(0, pathY)[2]
  // embasamento (interrompido na porta), cornija e telhado inclinado subindo para trás
  const doorGap = FRONT_DOOR.width / 2 + 0.5
  for (const [z0, z1] of [
    [fz0, fzDoor - doorGap],
    [fzDoor + doorGap, fz1],
  ])
    add('stone', new THREE.BoxGeometry(0.2, 0.6, z1 - z0), [fx - 0.1, 0.3, (z0 + z1) / 2])
  add('stone', new THREE.BoxGeometry(0.35, 0.25, fz1 - fz0), [fx - 0.15, H - 0.15, (fz0 + fz1) / 2])
  add('roof', new THREE.BoxGeometry(5, 0.25, fz1 - fz0 + 0.6), [fx + 2.1, H + 1.3, (fz0 + fz1) / 2], [0, 0, 0.62])
  for (const cz of [fz0 + (fz1 - fz0) * 0.22, fz0 + (fz1 - fz0) * 0.71])
    add('roof', new THREE.BoxGeometry(0.9, 2.4, 0.9), [fx + 2.6, H + 2.2, cz])
  // janelas em dois andares, longe da porta; algumas acesas fraco, algumas tapadas com tábuas
  for (let z = fz0 + 2.2; z < fz1 - 1.5; z += 3.2) {
    if (Math.abs(z - fzDoor) < 2.6) continue
    for (const y of [1.6, 4.1]) {
      const roll = r()
      add('frame', new THREE.BoxGeometry(0.12, 1.5, 1.0), [fx - 0.03, y, z])
      add(roll < 0.12 ? 'windowLit' : 'window', new THREE.PlaneGeometry(0.8, 1.3), [fx - 0.1, y, z], [0, -Math.PI / 2, 0])
      if (roll > 0.75)
        for (const dy of [-0.35, 0.05, 0.4])
          add('frame', new THREE.BoxGeometry(0.04, 0.18, 1.05), [fx - 0.13, y + dy, z], [(r() - 0.5) * 0.4, 0, 0])
      add('stone', new THREE.BoxGeometry(0.25, 0.08, 1.15), [fx - 0.1, y - 0.8, z])
      // cruz de madeira dividindo o vidro
      add('frame', new THREE.BoxGeometry(0.05, 1.3, 0.05), [fx - 0.12, y, z])
      add('frame', new THREE.BoxGeometry(0.05, 0.05, 0.8), [fx - 0.12, y + 0.15, z])
    }
  }
  // varanda: telhadinho sobre a porta (as colunas são móveis, com colisor) e degrau
  add('roof', new THREE.BoxGeometry(2.4, 0.2, 4.6), [fx - 1.1, 5.25, fzDoor], [0, 0, -0.12])
  add('stone', new THREE.BoxGeometry(2.2, 0.06, 3.4), [fx - 1.1, 0.03, fzDoor])

  // ---- caminhão por fora: cabine na frente (oeste), rodas, para-choque, lanternas, portas abertas e logo
  const [tx0, , tz] = w(truck.x, pathY)
  const [tx1] = w(truck.x + truck.w, pathY)
  const halfW = (truck.h * s) / 2
  const cab = tx0 - 1.05
  add('truck', new THREE.BoxGeometry(2.1, 2.3, halfW * 2 - 0.1), [cab, 1.35, tz])
  add('truck', new THREE.BoxGeometry(0.9, 1.1, halfW * 2 - 0.2), [cab - 1.4, 0.85, tz])
  add('glass', new THREE.PlaneGeometry(halfW * 2 - 0.5, 0.9), [cab - 1.06, 1.95, tz], [0, -Math.PI / 2, -0.25])
  for (const sz of [-1, 1]) {
    add('glass', new THREE.PlaneGeometry(1.0, 0.7), [cab - 0.2, 1.9, tz + sz * (halfW - 0.04)], [0, sz > 0 ? 0 : Math.PI, 0])
    add('headlight', new THREE.CircleGeometry(0.13, 8), [cab - 1.86, 0.95, tz + sz * (halfW - 0.4)], [0, -Math.PI / 2, 0])
    add('taillight', new THREE.BoxGeometry(0.05, 0.3, 0.15), [tx1 + 0.03, 0.9, tz + sz * (halfW - 0.15)])
    // logo nas laterais do baú
    add('logo', new THREE.PlaneGeometry(2.6, 1.0), [(tx0 + tx1) / 2, 1.9, tz + sz * (halfW + 0.01)], [0, sz > 0 ? 0 : Math.PI, 0])
    // portas traseiras abertas, dobradas para os lados
    add(
      'truck',
      new THREE.BoxGeometry(0.06, 2.6, halfW - 0.05),
      [tx1 + 0.1, 1.4, tz + sz * (halfW + (halfW - 0.05) / 2) * 0.98],
      [0, sz * 0.15, 0],
    )
    for (const wx of [cab - 0.6, tx0 + 1.2, tx1 - 1.0])
      add('tire', new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10), [wx, 0.38, tz + sz * (halfW - 0.12)], [Math.PI / 2, 0, 0])
  }
  add('iron', new THREE.BoxGeometry(0.15, 0.18, halfW * 2), [tx1 + 0.08, 0.25, tz])

  // ---- névoa rasteira: placas grandes e quase transparentes deitadas sobre o jardim e além da barreira
  const [yx0, , yz0] = w(yard.x - 120, yard.y - 60)
  const [yx1, , yz1] = w(front, yard.y + yard.h + 60)
  for (let i = 0; i < FOG.mistPatches; i++) {
    const x = yx0 + r() * (yx1 - yx0)
    const z = yz0 + r() * (yz1 - yz0)
    const size = 6 + r() * 8
    add('mist', new THREE.PlaneGeometry(size, size), [x, 0.25 + r() * 0.9, z], [-Math.PI / 2, r() * Math.PI, 0])
  }
  return { meshes: out, colliders }
}

export function Exterior({ level, built }: { level: LevelData; built: BuiltLevel }) {
  const mats = useMemo(makeMaterials, [])
  const { meshes, colliders } = useMemo(() => {
    const built_ = buildExterior(level, built)
    const list: { key: MatKey; geo: THREE.BufferGeometry }[] = []
    for (const [key, geos] of built_.meshes) {
      const geo = mergeGeometries(geos)
      geos.forEach((g) => g.dispose())
      if (geo) list.push({ key, geo })
    }
    return { meshes: list, colliders: built_.colliders }
  }, [level, built])
  useEffect(() => () => meshes.forEach((m) => m.geo.dispose()), [meshes])
  return (
    <group>
      {meshes.map(({ key, geo }) => (
        <mesh key={key} geometry={geo} material={mats[key]} castShadow={key !== 'mist'} receiveShadow={key !== 'mist'} />
      ))}
      {/* a grade segura o jogador (a barreira invisível fica logo atrás) */}
      <RigidBody type="fixed" colliders={false}>
        {colliders.map((c, i) => (
          <CuboidCollider key={i} args={c.half} position={c.pos} rotation={[0, c.yaw, 0]} collisionGroups={WORLD_GROUPS} />
        ))}
      </RigidBody>
    </group>
  )
}

/** Névoa: densa e azulada do lado de fora (esconde a barreira), a de sempre dentro da casa. */
export function FogController({ built }: { built: BuiltLevel }) {
  const { scene, camera } = useThree()
  const fogOn = useGameStore((s) => s.debug.fog)
  const st = useMemo(() => ({ k: 0, inside: new THREE.Color(FOG.inside.color), outside: new THREE.Color(FOG.outside.color) }), [])
  useFrame((_, dt) => {
    const room: Room | undefined = built.roomAt(camera.position.x, camera.position.z)
    const out = !room || room.kind === 'outdoor' || room.kind === 'car' ? 1 : 0
    st.k += (out - st.k) * Math.min(1, dt * FOG.blend)
    const fog = scene.fog as THREE.Fog | null
    const color = st.inside.clone().lerp(st.outside, st.k)
    if (fog && fogOn) {
      fog.near = THREE.MathUtils.lerp(FOG.inside.near, FOG.outside.near, st.k)
      fog.far = THREE.MathUtils.lerp(FOG.inside.far, FOG.outside.far, st.k)
      fog.color.copy(color)
    }
    // o fundo acompanha a névoa (senão o céu fica preto atrás da névoa clara)
    if (scene.background instanceof THREE.Color) scene.background.copy(color)
  })
  return null
}
