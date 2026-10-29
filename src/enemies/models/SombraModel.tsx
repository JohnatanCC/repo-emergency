import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { psxBasic, raggedLathe } from './psx'
import type { Pose } from './pose'
import { spring, stepSpring, turnLag } from './spring'
import { ANIM } from './config'
import { SmokeTrail } from './SmokeTrail'

/**
 * A Sombra (pés em y = 0). Um vazio preto bem mais alto que uma pessoa (~2,6 m),
 * cabeça alongada com dois pontos de luz, espinhos irregulares nos ombros,
 * braços enormes terminando em três garras, pernas finas que afinam em ponta, e
 * uma fumaça preta que fica no ar por onde passa.
 *
 * Posturas: de pé (vagando, passos longos e espasmos) e de quatro (caçando:
 * os braços viram patas da frente). No feixe da lanterna congela na pose em que
 * estava, tremendo. Perto de porta, se curva para passar.
 */

const THIGH = 0.62
const SHIN = 0.66
const UPPER = 0.6
const FORE = 0.62

export function SombraModel({ pose }: { pose: Pose }) {
  const root = useRef<THREE.Group>(null)
  const hips = useRef<THREE.Group>(null)
  const spine = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const chest = useRef<THREE.Group>(null)
  const legs = useRef<{ thigh: THREE.Group | null; shin: THREE.Group | null }[]>([
    { thigh: null, shin: null },
    { thigh: null, shin: null },
  ])
  const arms = useRef<{ upper: THREE.Group | null; fore: THREE.Group | null; claws: THREE.Group | null }[]>([
    { upper: null, fore: null, claws: null },
    { upper: null, fore: null, claws: null },
  ])
  const spikes = useRef<THREE.Group>(null)

  const m = useMemo(
    () => ({
      black: psxBasic({ color: '#000000' }),
      eyes: psxBasic({ color: '#c8c2b0' }),
    }),
    [],
  )
  const geo = useMemo(
    () => ({
      // tronco no espaço da coluna (y = 0 na cintura): fino embaixo, peito largo
      torso: raggedLathe(
        [
          [0.05, -0.05],
          [0.1, 0.15],
          [0.12, 0.45],
          [0.2, 0.75],
          [0.24, 0.88],
          [0.1, 0.98],
        ],
        6,
        0.4,
        7,
      ),
      thigh: new THREE.CylinderGeometry(0.06, 0.04, THIGH, 4),
      shin: new THREE.ConeGeometry(0.04, SHIN, 4),
      upper: new THREE.CylinderGeometry(0.04, 0.028, UPPER, 4),
      fore: new THREE.CylinderGeometry(0.028, 0.015, FORE, 4),
      claw: new THREE.ConeGeometry(0.014, 0.28, 3),
      spike: new THREE.ConeGeometry(0.04, 0.3, 3),
      neck: new THREE.CylinderGeometry(0.03, 0.05, 0.16, 4),
      head: new THREE.ConeGeometry(0.1, 0.42, 5),
      eye: new THREE.OctahedronGeometry(0.016),
    }),
    [],
  )
  // espinhos irregulares nos ombros e nas costas
  const spikeList = useMemo(() => {
    let s = 9
    const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
    return Array.from({ length: 9 }, (_, i) => {
      const side = i % 2 ? 1 : -1
      return {
        p: [side * (0.12 + r() * 0.14), 0.72 + r() * 0.2, -0.04 - r() * 0.08] as [number, number, number],
        rot: [-0.3 - r() * 0.5, 0, -side * (0.6 + r() * 0.7)] as [number, number, number],
        s: 0.6 + r() * 0.9,
      }
    })
  }, [])

  const sp = useMemo(
    () => ({
      walk: spring(),
      phase: 0,
      crawl: spring(),
      duck: spring(),
      lean: spring(0.1),
      roll: spring(),
      headX: spring(),
      headZ: spring(),
      hipY: spring(THIGH + SHIN),
      thigh: [spring(), spring()],
      knee: [spring(), spring()],
      arm: [spring(), spring()],
      armZ: [spring(), spring()],
      elbow: [spring(), spring()],
      claw: [spring(0.3), spring(0.3)],
      turn: spring(),
      jerk: 0,
      jerkAxis: 0,
    }),
    [],
  )

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const dt = Math.min(delta, 0.05)
    const r = root.current
    if (!r) return
    const lit = pose.lit
    // no feixe tudo congela: as molas param de correr (só o tremor continua)
    const k = lit ? 0 : dt
    const walk = stepSpring(sp.walk, Math.min(pose.moving, 2.5), k, ANIM.soft)
    const crawl = stepSpring(sp.crawl, pose.mode === 'chase' ? 1 : 0, k, ANIM.soft)
    const duck = stepSpring(sp.duck, pose.nearDoor * (1 - crawl), k, ANIM.soft)
    sp.phase += k * walk * (1.6 + crawl * 2.6)
    const ph = sp.phase
    if (!lit) turnLag(sp.turn, r, dt, ANIM.turn)

    // espasmo: de vez em quando uma parte dá um tranco
    sp.jerk = Math.max(0, sp.jerk - dt)
    if (!lit && sp.jerk === 0 && Math.random() < dt * (0.6 + crawl)) {
      sp.jerk = 0.18
      sp.jerkAxis = Math.random() < 0.5 ? -1 : 1
    }
    const jerk = sp.jerk > 0 ? sp.jerkAxis : 0
    const tremble = lit || pose.stunned ? Math.sin(t * 61) * 0.012 : 0

    // quadril: alto de pé, baixo de quatro, mais baixo ao se curvar na porta
    const hp = hips.current
    if (hp) {
      const hipY = THIGH + SHIN - crawl * 0.42 - duck * 0.3 + Math.abs(Math.sin(ph)) * 0.04 * walk
      hp.position.y = stepSpring(sp.hipY, hipY, k, ANIM.soft)
      hp.position.x = tremble
    }

    // pernas: passo longo de pé; galope curto de quatro (joelhos sempre dobrados)
    legs.current.forEach((leg, i) => {
      const side = i === 0 ? 0 : Math.PI
      const swing = Math.sin(ph + side) * (0.42 - crawl * 0.1) * Math.min(walk, 1.4)
      const bendBase = crawl * 0.9 + duck * 0.6
      if (leg.thigh) leg.thigh.rotation.x = stepSpring(sp.thigh[i], -swing - crawl * 0.7 - duck * 0.3, k, ANIM.limb)
      // o joelho dobra na volta da perna
      const knee = bendBase + Math.max(0, Math.sin(ph + side + 1.2)) * 0.7 * Math.min(walk, 1.4)
      if (leg.shin) leg.shin.rotation.x = stepSpring(sp.knee[i], knee, k, ANIM.limb)
    })

    // coluna: quase reta de pé, deitada para a frente de quatro, curvada na porta
    const sn = spine.current
    if (sn) {
      sn.rotation.x = stepSpring(sp.lean, 0.1 + walk * 0.08 + crawl * 1.25 + duck * 0.55, k, ANIM.soft) + tremble
      sn.rotation.z = stepSpring(sp.roll, Math.sin(ph) * 0.06 * walk + jerk * 0.15, k, ANIM.snappy)
    }
    // cabeça: de quatro olha para a frente (compensa a coluna deitada); tiques
    const h = head.current
    if (h) {
      h.rotation.x = stepSpring(sp.headX, -crawl * 1.05 - duck * 0.2 + Math.sin(t * 0.7) * 0.06, k, ANIM.head) + tremble * 3
      h.rotation.z = stepSpring(sp.headZ, jerk * 0.6 + Math.sin(t * 0.9) * 0.12, k, ANIM.snappy) + tremble * 4
    }

    // braços: pendurados e balançando de pé; viram patas da frente de quatro
    arms.current.forEach((arm, i) => {
      const side = i === 0 ? -1 : 1
      const gait = Math.sin(ph + (i === 0 ? Math.PI : 0) + 0.6)
      const standSwing = 0.05 + gait * 0.25 * Math.min(walk, 1.4)
      // de quatro: o braço aponta para o chão e "anda"
      const crawlSwing = -1.05 + gait * 0.45
      const ax = standSwing * (1 - crawl) + crawlSwing * crawl + (jerk && i === 0 ? -0.5 : 0)
      if (arm.upper) {
        arm.upper.rotation.x = stepSpring(sp.arm[i], ax, k, ANIM.limb) + tremble * 2
        arm.upper.rotation.z = stepSpring(sp.armZ[i], side * (0.12 + crawl * 0.12), k, ANIM.limb)
      }
      if (arm.fore) arm.fore.rotation.x = stepSpring(sp.elbow[i], -0.15 - crawl * 1.1 + Math.max(0, gait) * 0.35 * crawl, k, ANIM.limb)
      // garras: abrem caçando, fecham devagar vagando
      const open = stepSpring(sp.claw[i], crawl > 0.5 ? -0.25 : 0.35 + Math.sin(t * 2 + i) * 0.15, k, ANIM.snappy)
      arm.claws?.children.forEach((c, j) => (c.rotation.x = Math.PI + open * (j === 1 ? 1 : 0.8)))
    })

    // espinhos se arrepiam caçando
    spikes.current?.children.forEach((c, i) => {
      c.scale.y = spikeList[i].s * (1 + crawl * 0.4 + (lit ? Math.sin(t * 40 + i) * 0.05 : 0))
    })
    m.eyes.color.set(lit ? '#ffffff' : crawl > 0.5 ? '#ffe8c8' : '#a8a290')
  })

  return (
    <group ref={root}>
      <group ref={hips} position={[0, THIGH + SHIN, 0]}>
        {/* pernas finas que afinam em ponta */}
        {[0, 1].map((i) => (
          <group
            key={i}
            ref={(el) => {
              legs.current[i].thigh = el
            }}
            position={[(i === 0 ? -1 : 1) * 0.08, 0, 0]}
          >
            <mesh geometry={geo.thigh} material={m.black} position={[0, -THIGH / 2, 0]} />
            <group
              ref={(el) => {
                legs.current[i].shin = el
              }}
              position={[0, -THIGH, 0]}
            >
              <mesh geometry={geo.shin} material={m.black} position={[0, -SHIN / 2, 0]} rotation={[Math.PI, 0, 0]} />
            </group>
          </group>
        ))}
        <group ref={spine}>
          <mesh geometry={geo.torso} material={m.black} />
          <group ref={chest} position={[0, 0.7, 0]} />
          <group ref={spikes}>
            {spikeList.map((s, i) => (
              <mesh key={i} geometry={geo.spike} material={m.black} position={s.p} rotation={s.rot} scale={[1, s.s, 1]} />
            ))}
          </group>
          {[0, 1].map((i) => {
            const side = i === 0 ? -1 : 1
            return (
              <group
                key={i}
                ref={(el) => {
                  arms.current[i].upper = el
                }}
                position={[side * 0.24, 0.84, 0]}
              >
                <mesh geometry={geo.upper} material={m.black} position={[0, -UPPER / 2, 0]} />
                <group
                  ref={(el) => {
                    arms.current[i].fore = el
                  }}
                  position={[0, -UPPER, 0]}
                >
                  <mesh geometry={geo.fore} material={m.black} position={[0, -FORE / 2, 0]} />
                  {/* sempre três garras */}
                  <group
                    ref={(el) => {
                      arms.current[i].claws = el
                    }}
                    position={[0, -FORE, 0]}
                  >
                    {[-0.025, 0, 0.025].map((x) => (
                      <mesh key={x} geometry={geo.claw} material={m.black} position={[x, -0.12, 0.01]} rotation={[Math.PI, 0, x * 6]} />
                    ))}
                  </group>
                </group>
              </group>
            )
          })}
          <mesh geometry={geo.neck} material={m.black} position={[0, 1.0, 0.02]} />
          <group ref={head} position={[0, 1.06, 0.03]}>
            {/* cabeça alongada, sem rosto: só dois pontos de luz */}
            <mesh geometry={geo.head} material={m.black} position={[0, 0.2, 0]} scale={[0.9, 1, 0.8]} />
            {[-1, 1].map((s) => (
              <mesh key={s} geometry={geo.eye} material={m.eyes} position={[s * 0.03, 0.16, 0.07]} />
            ))}
          </group>
        </group>
      </group>
      <SmokeTrail anchor={chest} color="#000000" rate={16} life={1.8} size={0.55} opacity={0.5} spread={0.5} rise={0.25} />
    </group>
  )
}
