import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { psxBasic, psxStandard, raggedLathe } from './psx'
import { creatureTextures } from './textures'
import type { Pose } from './pose'
import { spring, stepSpring, turnLag } from './spring'
import { ANIM } from './config'
import { ClothHair, type HairSheet } from './ClothHair'
import { buildEspectroHead, espectroFaceTexture, JAW_PIVOT, MOUTH_Y } from './espectroHead'
import { FloatingGoo } from './FloatingGoo'
import { SmokeTrail } from './SmokeTrail'

/**
 * O Espectro (pés em y = 0; a IA o faz flutuar). Uma jovem pálida e magra, de
 * brilho fraco, cabelo emo (franja em diagonal cobrindo metade do rosto,
 * camadas espetadas, uma mecha vermelha), sem olhos — duas órbitas fundas
 * escorrendo —, roupa clara com tiras e fivela, mãos sujas de sangue, pernas
 * pendendo.
 *
 * A boca: com `pose.attack` a mandíbula se solta e estica além do humano; da
 * metade para cima, o peito se divide ao meio e abre como duas portas,
 * mostrando uma garganta com fileiras de dentes nas bordas.
 *
 * Animação: flutua balançando, cabeça inclinada, braços e pernas pendurados
 * com atraso; percebendo, a cabeça se endireita de um tranco; perseguindo,
 * deita para a frente com braços e pernas para trás e o cabelo esticado, e a
 * imagem "pula" como fita com defeito.
 */

const TORSO = 0.14

/** Contorno do tronco (raio, altura) no espaço da coluna. */
const TORSO_POINTS: [number, number][] = [
  [0.115, 0],
  [0.1, 0.12],
  [TORSO, 0.3],
  [0.135, 0.44],
  [0.085, 0.55],
]

function latheSlice(points: [number, number][], scale: number, phiStart: number, phiLength: number, segs: number) {
  return new THREE.LatheGeometry(
    points.map(([x, y]) => new THREE.Vector2(x * scale, y)),
    segs,
    phiStart,
    phiLength,
  )
}

/**
 * Cabelo emo em mantas de tecido (ClothHair): azimute 0 = frente do rosto.
 * Franja em diagonal (mais longa de um lado, cobre metade do rosto), laterais
 * até o queixo, costas até os ombros e uma mecha vermelha.
 */
const HAIR: HairSheet[] = [
  { from: [-0.7, 0.62], to: [0.3, 0.5], cols: 6, rows: 5, length: (c) => 0.04 + c * 0.022 },
  { from: [0.45, 0.55], to: [1.6, 0.3], cols: 4, rows: 7, length: (c) => 0.3 - c * 0.02 },
  { from: [1.6, 0.42], to: [4.7, 0.42], cols: 9, rows: 7, length: (c) => 0.32 + ((c * 37) % 5) * 0.012 },
  { from: [-1.6, 0.3], to: [-0.8, 0.6], cols: 4, rows: 7, length: (c) => 0.24 + c * 0.015 },
  { from: [0.3, 0.68], to: [0.5, 0.62], cols: 2, rows: 7, length: () => 0.34, red: true },
]

export function EspectroModel({ pose }: { pose: Pose }) {
  const root = useRef<THREE.Group>(null)
  const dripFrom = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const spine = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const jaw = useRef<THREE.Group>(null)
  const upperTeeth = useRef<THREE.Group>(null)
  const skull = useRef<THREE.Group>(null)
  const doorL = useRef<THREE.Group>(null)
  const doorR = useRef<THREE.Group>(null)
  const arms = useRef<{ upper: THREE.Group | null; fore: THREE.Group | null }[]>([
    { upper: null, fore: null },
    { upper: null, fore: null },
  ])
  const legs = useRef<{ thigh: THREE.Group | null; shin: THREE.Group | null }[]>([
    { thigh: null, shin: null },
    { thigh: null, shin: null },
  ])

  const m = useMemo(() => {
    const t = creatureTextures()
    // brilho fraco próprio: aparece pálida mesmo no escuro
    const glow = { emissive: new THREE.Color('#2e2e2e'), emissiveIntensity: 1 }
    return {
      skin: psxStandard({ color: '#e2e2e2', ...glow }),
      // a cabeça leva o rosto na própria pele (espectroHead.ts)
      head: psxStandard({ map: espectroFaceTexture(), color: '#ffffff', ...glow }),
      gown: psxStandard({ map: t.gown, color: '#ffffff', side: THREE.DoubleSide, ...glow }),
      strap: psxStandard({ color: '#6c6c6c' }),
      buckle: psxStandard({ color: '#a0a0a0', metalness: 0.6, roughness: 0.4 }),
      hair: psxStandard({ color: '#060508', side: THREE.DoubleSide }),
      streak: psxStandard({ color: '#4a0a10', side: THREE.DoubleSide }),
      maw: psxBasic({ map: t.maw, side: THREE.DoubleSide }),
      throat: psxBasic({ color: '#0a0002' }),
      teeth: psxStandard({ color: '#d4d4cc', emissive: '#262624', emissiveIntensity: 1 }),
      blood: psxStandard({ color: '#9a9a9a', ...glow }),
      dirt: psxStandard({ color: '#2e2e2e' }),
    }
  }, [])

  const geo = useMemo(() => {
    // dente: cone curto apontando para +y (girado na hora de montar)
    const tooth = new THREE.ConeGeometry(0.012, 0.055, 3)
    return {
      back: latheSlice(TORSO_POINTS, 1, Math.PI / 2, Math.PI, 6),
      // metades da frente: a direita (φ 0 → π/2) e a esquerda (3π/2 → 2π), deslocadas para girar na lateral
      doorR: latheSlice(TORSO_POINTS, 1, 0, Math.PI / 2, 3).translate(-TORSO, 0, 0),
      doorL: latheSlice(TORSO_POINTS, 1, (3 * Math.PI) / 2, Math.PI / 2, 3).translate(TORSO, 0, 0),
      flesh: latheSlice(TORSO_POINTS, 0.86, 0, Math.PI * 2, 8),
      hem: raggedLathe(
        [
          [0.13, 0.05],
          [0.19, -0.12],
          [0.23, -0.32],
        ],
        9,
        0.45,
        13,
      ),
      tooth,
      bigTooth: new THREE.ConeGeometry(0.016, 0.08, 3),
      strap: new THREE.BoxGeometry(0.13, 0.025, 0.02),
      buckle: new THREE.BoxGeometry(0.035, 0.045, 0.012),
      seam: new THREE.BoxGeometry(0.006, 0.5, 0.006),
      thigh: new THREE.CylinderGeometry(0.045, 0.035, 0.4, 5),
      shin: new THREE.CylinderGeometry(0.034, 0.022, 0.4, 5),
      foot: new THREE.ConeGeometry(0.025, 0.14, 4),
      upper: new THREE.CylinderGeometry(0.036, 0.03, 0.3, 5),
      fore: new THREE.CylinderGeometry(0.03, 0.026, 0.3, 5),
      cuffStrap: new THREE.PlaneGeometry(0.032, 0.42),
      hand: new THREE.BoxGeometry(0.05, 0.07, 0.025),
      finger: new THREE.CylinderGeometry(0.006, 0.004, 0.08, 3),
      neck: new THREE.CylinderGeometry(0.035, 0.04, 0.09, 6),
      belt: new THREE.TorusGeometry(0.108, 0.014, 4, 10),
      looseStrap: new THREE.PlaneGeometry(0.03, 0.42),
      ...(() => {
        const h = buildEspectroHead()
        return { headUpper: h.upper, headJaw: h.lower }
      })(),
      // dentro da cabeça: escuro (aparece pela boca aberta)
      inner: new THREE.SphereGeometry(0.09, 8, 6),
      mouth: new THREE.PlaneGeometry(0.09, 0.13),
      // casco do cabelo aberto na frente (senão cobre o rosto)
      hairCap: new THREE.SphereGeometry(0.124, 8, 6, Math.PI / 2 + 0.85, Math.PI * 2 - 1.7, 0, Math.PI * 0.62),
      // franja de cima: só a testa
      bangs: new THREE.SphereGeometry(0.126, 6, 3, Math.PI / 2 - 0.9, 1.8, 0, Math.PI * 0.22),
      shoulder: new THREE.SphereGeometry(0.045, 6, 4),
      fringe: new THREE.PlaneGeometry(0.075, 0.24),
      spike: new THREE.ConeGeometry(0.035, 0.32, 3),
    }
  }, [])

  // dentes nas bordas das metades do peito (alternados, para encaixar fechados)
  const chestTeeth = useMemo(() => {
    const list: { y: number; big: boolean }[] = []
    // só na parte larga do tronco (onde afina, os dentes furariam a roupa)
    for (let y = 0.14; y < 0.44; y += 0.045) list.push({ y, big: Math.round(y * 100) % 3 === 0 })
    return list
  }, [])
  // raio do tronco numa altura (para pôr os dentes na borda)
  const radiusAt = (y: number) => {
    for (let i = 1; i < TORSO_POINTS.length; i++) {
      const [r0, y0] = TORSO_POINTS[i - 1]
      const [r1, y1] = TORSO_POINTS[i]
      if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0)
    }
    return TORSO_POINTS[TORSO_POINTS.length - 1][0]
  }

  // o cabelo encosta no peito e nos ombros em vez de atravessar
  const hairColliders = useMemo(
    () => [
      { center: [0, 0.38, 0.02] as [number, number, number], radius: 0.15, space: spine },
      { center: [0.15, 0.48, 0] as [number, number, number], radius: 0.065, space: spine },
      { center: [-0.15, 0.48, 0] as [number, number, number], radius: 0.065, space: spine },
    ],
    [],
  )

  const sp = useMemo(
    () => ({
      bob: spring(),
      lean: spring(0.08),
      roll: spring(),
      headX: spring(0.15),
      headZ: spring(0.35),
      jaw: spring(),
      chest: spring(),
      arm: [spring(0.1), spring(0.1)],
      armZ: [spring(), spring()],
      elbow: [spring(-0.2), spring(-0.2)],
      thigh: [spring(0.15), spring(0.15)],
      knee: [spring(0.25), spring(0.25)],
      turn: spring(),
      glitch: 0,
      nextGlitch: 1,
      tic: 0,
    }),
    [],
  )

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const dt = Math.min(delta, 0.05)
    const r = root.current
    const b = body.current
    if (!r || !b) return
    const chase = pose.mode === 'chase'
    const alert = pose.mode === 'alert'
    const speed = Math.min(pose.moving, 2.5)
    turnLag(sp.turn, r, dt, ANIM.turn)

    // flutua: sobe e desce devagar; a velocidade vertical puxa as pernas (atraso)
    const bob = stepSpring(sp.bob, Math.sin(t * 1.3) * 0.07, dt, ANIM.soft)
    b.position.y = bob
    // defeito de fita: perseguindo, a imagem pula para o lado por um instante
    sp.nextGlitch -= dt
    if (sp.nextGlitch <= 0) {
      sp.glitch = chase ? 0.07 : 0.04
      sp.nextGlitch = chase ? 0.25 + Math.random() * 0.6 : 2 + Math.random() * 4
    }
    sp.glitch = Math.max(0, sp.glitch - dt)
    const g = sp.glitch > 0 ? 1 : 0
    b.position.x = g * (chase ? 0.14 : 0.05) * (Math.random() < 0.5 ? -1 : 1)
    b.scale.x = 1 + g * 0.12

    // corpo: em pé balançando; perseguindo, deita para a frente
    const lean = stepSpring(sp.lean, chase ? 0.55 : alert ? 0.02 : 0.08 + speed * 0.06, dt, ANIM.soft)
    b.rotation.x = lean
    b.rotation.z = stepSpring(sp.roll, Math.sin(t * 0.7) * 0.06, dt, ANIM.soft) + (pose.stunned ? Math.sin(t * 45) * 0.08 : 0)

    // cabeça: inclinada de lado, vagando; percebendo, endireita de um tranco e treme; perseguindo, olha para a frente
    sp.tic = Math.max(0, sp.tic - dt)
    if (alert && sp.tic === 0 && Math.random() < dt * 2) sp.tic = 0.12
    const h = head.current
    if (h) {
      h.rotation.x = stepSpring(sp.headX, chase ? -lean * 0.8 : alert ? -0.05 : 0.18, dt, alert ? ANIM.snappy : ANIM.head)
      h.rotation.z = stepSpring(sp.headZ, alert ? (sp.tic > 0 ? 0.3 : 0) : chase ? Math.sin(t * 9) * 0.05 : 0.38, dt, ANIM.snappy)
    }
    // boca: a mandíbula solta e estica; da metade em diante o peito abre
    const open = pose.attack
    const pulse = chase ? Math.max(0, Math.sin(t * 7)) * 0.15 : 0
    const j = stepSpring(sp.jaw, Math.min(1, open * 1.6 + pulse), dt, ANIM.snappy)
    if (jaw.current) {
      // gira na dobradiça atrás da boca e estica para baixo, além do humano
      jaw.current.rotation.x = j * 0.85
      jaw.current.scale.set(1 + j * 0.12, 1 + j * 1.1, 1 + j * 0.1)
      // dentes só aparecem com a boca abrindo (fechada: costurada)
      jaw.current.children.forEach((c, k) => k > 0 && c.scale.setScalar(Math.min(1, j * 3) || 0.001))
      upperTeeth.current?.scale.setScalar(Math.min(1, j * 3) || 0.001)
    }
    const c = stepSpring(sp.chest, Math.max(0, (open - 0.45) / 0.55) + (open > 0.45 ? pulse : 0), dt, ANIM.limb)
    if (doorR.current) doorR.current.rotation.y = c * 1.35
    if (doorL.current) doorL.current.rotation.y = -c * 1.35
    if (spine.current) spine.current.rotation.x = -c * 0.25 // abrindo, arqueia para trás

    // braços: pendurados e moles; perseguindo, para trás e abertos
    arms.current.forEach((arm, i) => {
      const side = i === 0 ? -1 : 1
      const drift = Math.sin(t * 0.9 + i * 2) * 0.08
      const ax = chase ? 0.9 + Math.sin(t * 3 + i) * 0.1 : alert ? -0.15 : 0.08 + drift
      if (arm.upper) {
        arm.upper.rotation.x = stepSpring(sp.arm[i], ax, dt, ANIM.limb)
        arm.upper.rotation.z = stepSpring(sp.armZ[i], side * (chase ? 0.45 : -0.03 + c * 0.5), dt, ANIM.limb)
      }
      if (arm.fore) arm.fore.rotation.x = stepSpring(sp.elbow[i], chase ? -0.1 : -0.25 + drift, dt, ANIM.limb)
    })
    // pernas penduradas: ficam para trás ao avançar e balançam com a flutuação
    legs.current.forEach((leg, i) => {
      const sway = Math.sin(t * 1.3 + i * 1.7) * 0.08 - sp.bob.v * 0.8
      if (leg.thigh) leg.thigh.rotation.x = stepSpring(sp.thigh[i], 0.15 + speed * 0.25 + (chase ? 0.45 : 0) + sway, dt, ANIM.soft)
      if (leg.shin) leg.shin.rotation.x = stepSpring(sp.knee[i], 0.25 + (chase ? 0.4 : 0) + sway * 0.5, dt, ANIM.soft)
    })
  })

  const arm = (i: number) => {
    const side = i === 0 ? -1 : 1
    return (
      <group
        key={i}
        ref={(el) => {
          arms.current[i].upper = el
        }}
        position={[side * 0.155, 0.49, 0]}
      >
        <mesh geometry={geo.shoulder} material={m.gown} position={[0, -0.01, 0]} scale={[1.1, 0.9, 1]} />
        <mesh geometry={geo.upper} material={m.gown} position={[0, -0.15, 0]} castShadow />
        <group
          ref={(el) => {
            arms.current[i].fore = el
          }}
          position={[0, -0.3, 0]}
        >
          <mesh geometry={geo.fore} material={m.gown} position={[0, -0.15, 0]} castShadow />
          {/* tira solta pendendo do punho */}
          <mesh geometry={geo.cuffStrap} material={m.strap} position={[side * 0.03, -0.46, -0.02]} rotation={[0.08, 0, side * 0.06]} />
          <mesh geometry={geo.hand} material={m.blood} position={[0, -0.34, 0.005]} />
          {[-0.017, -0.006, 0.006, 0.017].map((x, k) => (
            <mesh key={k} geometry={geo.finger} material={m.dirt} position={[x, -0.41, 0.008]} rotation={[0.25, 0, x * 4]} />
          ))}
        </group>
      </group>
    )
  }

  const door = (side: 1 | -1) => (
    <group ref={side > 0 ? doorR : doorL} position={[side * TORSO, 0, 0]}>
      <mesh geometry={side > 0 ? geo.doorR : geo.doorL} material={m.gown} castShadow />
      {/* tiras e fivela da roupa, presas nesta metade */}
      {[0.2, 0.36].map((y) => (
        <mesh
          key={y}
          geometry={geo.strap}
          material={m.strap}
          position={[-side * (TORSO - 0.07), y, radiusAt(y) * 0.8 + 0.01]}
          rotation={[0, side * 0.5, 0]}
        />
      ))}
      {side > 0 && <mesh geometry={geo.buckle} material={m.buckle} position={[-TORSO + 0.03, 0.28, radiusAt(0.28) + 0.012]} />}
      {side > 0 && <mesh geometry={geo.seam} material={m.throat} position={[-TORSO + 0.004, 0.27, radiusAt(0.27) + 0.004]} />}
      {/* dentes na borda, virados para a outra metade */}
      {chestTeeth.map(({ y, big }, k) => (
        <mesh
          key={k}
          geometry={big ? geo.bigTooth : geo.tooth}
          material={m.teeth}
          position={[-side * TORSO + side * 0.012, y + (side > 0 ? 0 : 0.027), radiusAt(y) - 0.02]}
          rotation={[0, 0, (side * Math.PI) / 2]}
        />
      ))}
    </group>
  )

  return (
    <group ref={root}>
      <group ref={body}>
        <group position={[0, 0.82, 0]}>
          {/* pernas penduradas, pontas dos pés para baixo */}
          {[0, 1].map((i) => (
            <group
              key={i}
              ref={(el) => {
                legs.current[i].thigh = el
              }}
              position={[(i === 0 ? -1 : 1) * 0.07, -0.02, 0]}
            >
              <mesh geometry={geo.thigh} material={m.skin} position={[0, -0.2, 0]} />
              <group
                ref={(el) => {
                  legs.current[i].shin = el
                }}
                position={[0, -0.4, 0]}
              >
                <mesh geometry={geo.shin} material={m.skin} position={[0, -0.2, 0]} />
                <mesh geometry={geo.foot} material={m.skin} position={[0, -0.43, 0.02]} rotation={[Math.PI - 0.3, 0, 0]} />
              </group>
            </group>
          ))}
          <mesh geometry={geo.hem} material={m.gown} castShadow />
          <group ref={spine} position={[0, 0.04, 0]}>
            {/* costas do tronco + carne de dentro (aparece quando o peito abre) */}
            <mesh geometry={geo.back} material={m.gown} castShadow />
            <mesh geometry={geo.flesh} material={m.maw} />
            {chestTeeth.map(({ y, big }, k) =>
              [-1, 1].map((side) => (
                <mesh
                  key={`${k}${side}`}
                  geometry={big ? geo.bigTooth : geo.tooth}
                  material={m.teeth}
                  position={[side * 0.07, y + (side > 0 ? 0.022 : 0), radiusAt(y) * 0.5]}
                  rotation={[0, 0, (side * Math.PI) / 2]}
                />
              )),
            )}
            <mesh geometry={geo.seam} material={m.throat} position={[0, 0.27, 0]} scale={[8, 1, 8]} />
            <mesh geometry={geo.belt} material={m.strap} position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1.05, 1]} />
            <mesh geometry={geo.buckle} material={m.buckle} position={[0.02, 0.06, 0.112]} />
            {[-1, 1].map((sd) => (
              <mesh
                key={sd}
                geometry={geo.looseStrap}
                material={m.strap}
                position={[sd * 0.1, -0.15, 0.06]}
                rotation={[0.05, sd * 0.3, sd * 0.05]}
              />
            ))}
            {door(1)}
            {door(-1)}
            {arm(0)}
            {arm(1)}
            <mesh geometry={geo.neck} material={m.skin} position={[0, 0.58, 0.01]} />
            <group ref={head} position={[0, 0.63, 0.02]}>
              <group ref={skull} position={[0, 0.08, 0]}>
                {/* cabeça esculpida: o rosto é a própria pele */}
                <mesh geometry={geo.headUpper} material={m.head} castShadow />
                <mesh geometry={geo.inner} material={m.throat} scale={[0.8, 0.9, 0.85]} />
                {/* boca: garganta atrás, dentes de cima presos à cabeça */}
                <mesh geometry={geo.mouth} material={m.maw} position={[0, -0.07, 0.03]} />
                <group ref={upperTeeth} position={[0, MOUTH_Y, 0.075]}>
                  {[-0.026, -0.009, 0.008, 0.025].map((x, k) => (
                    <mesh key={k} geometry={geo.tooth} material={m.teeth} position={[x, -0.016, 0]} rotation={[Math.PI, 0, 0]} />
                  ))}
                </group>
                {/* mandíbula: a parte de baixo da mesma cabeça, que cai e estica */}
                <group ref={jaw} position={[JAW_PIVOT.x, JAW_PIVOT.y, JAW_PIVOT.z]}>
                  <mesh geometry={geo.headJaw} material={m.head} />
                  {[-0.022, -0.007, 0.008, 0.023].map((x, k) => (
                    <mesh key={k} geometry={geo.tooth} material={m.teeth} position={[x, 0.014, 0.125]} />
                  ))}
                </group>
                {/* cabelo emo */}
                <mesh geometry={geo.hairCap} material={m.hair} position={[0, 0.02, -0.006]} scale={[1.05, 1.12, 1.08]} />
                <mesh geometry={geo.bangs} material={m.hair} position={[0, 0.02, -0.004]} scale={[1.04, 1.1, 1.08]} />
              </group>
            </group>
          </group>
        </group>
      </group>
      <ClothHair head={skull} radius={0.118} sheets={HAIR} colliders={hairColliders} />
      <group position={[0, 0.25, 0]}>
        <FloatingGoo count={18} agitation={() => (pose.mode === 'chase' ? 1 : pose.mode === 'alert' ? 0.5 : 0)} />
      </group>
      <group ref={dripFrom} position={[0, 1.2, 0]} />
      <SmokeTrail anchor={dripFrom} color="#050505" count={30} rate={7} life={1.1} size={0.07} opacity={0.9} spread={0.45} rise={-0.9} />
    </group>
  )
}
