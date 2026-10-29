import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { aimTarget } from '../game/systems/aim'
import * as THREE from 'three'
import { HIGHLIGHT, RELIC_GLOW, type ItemDef } from './catalog'

/**
 * Modelos dos objetos, montados com peças simples (poucos lados, estilo PS1).
 * Cada um cabe na caixa do colisor (`def.dims`, centrada na origem): a física
 * não muda, só a aparência. Item sem modelo próprio usa a forma básica.
 */

type Mat = ((color: string, metal?: number, rough?: number) => THREE.Material) & {
  /** Todos os materiais criados (para o destaque da mira). */
  all: THREE.MeshStandardMaterial[]
}

/** Materiais do item: quebrado escurece; relíquia brilha de leve. */
function useMat(def: ItemDef, broken: boolean): Mat {
  return useMemo(() => {
    const cache = new Map<string, THREE.MeshStandardMaterial>()
    const relic = def.tag === 'relic' && !broken
    const fn = (color: string, metal = 0.1, rough = 0.7) => {
      const key = `${color}-${metal}-${rough}`
      let m = cache.get(key)
      if (!m) {
        m = new THREE.MeshStandardMaterial({
          color: broken ? new THREE.Color(color).multiplyScalar(0.35) : color,
          metalness: metal,
          roughness: rough,
          flatShading: true,
          emissive: relic ? RELIC_GLOW.color : '#000000',
          emissiveIntensity: relic ? RELIC_GLOW.intensity : 0,
        })
        cache.set(key, m)
        all.push(m)
      }
      return m
    }
    const all: THREE.MeshStandardMaterial[] = []
    return Object.assign(fn, { all })
  }, [def, broken])
}

const GOLD = '#b8923a'
const BRASS = '#8a6a2a'
const SILVER = '#b8bcc4'

function Parts({ def, m }: { def: ItemDef; m: Mat }): ReactNode {
  const [a, b, c] = def.dims
  switch (def.id) {
    // ---- relíquias
    case 'sino': {
      // sino de boca larga com cabo
      const bell = new THREE.LatheGeometry(
        [
          [a, -b / 2],
          [a * 0.9, -b / 2 + 0.01],
          [a * 0.6, -b * 0.1],
          [a * 0.45, b * 0.15],
          [0.001, b * 0.18],
        ].map(([x, y]) => new THREE.Vector2(x, y)),
        8,
      )
      return (
        <>
          <mesh geometry={bell} material={m(def.color, 0.6, 0.35)} />
          <mesh position={[0, b * 0.33, 0]} material={m('#3a2414')}>
            <cylinderGeometry args={[0.012, 0.016, b * 0.32, 5]} />
          </mesh>
          <mesh position={[0, -b / 2 + 0.012, 0]} material={m('#2a2018', 0.5)}>
            <sphereGeometry args={[0.014, 5, 4]} />
          </mesh>
        </>
      )
    }
    case 'relicario':
      // caixinha de prata com tampa em telhado e uma cruz
      return (
        <>
          <mesh position={[0, -b * 0.12, 0]} material={m(SILVER, 0.7, 0.35)}>
            <boxGeometry args={[a, b * 0.76, c]} />
          </mesh>
          <mesh position={[0, b * 0.32, 0]} rotation={[0, 0, Math.PI / 4]} scale={[1, 1, c / (a * 0.5)]} material={m(SILVER, 0.7, 0.35)}>
            <boxGeometry args={[a * 0.36, a * 0.36, a * 0.5]} />
          </mesh>
          <mesh position={[0, -b * 0.1, c / 2 + 0.002]} material={m('#5a2a6a', 0.2, 0.5)}>
            <boxGeometry args={[a * 0.5, b * 0.4, 0.004]} />
          </mesh>
          <mesh position={[0, b * 0.45, 0]} material={m(GOLD, 0.7, 0.3)}>
            <boxGeometry args={[0.008, 0.03, 0.008]} />
          </mesh>
        </>
      )
    case 'boneca':
      // boneca de porcelana: vestido, cabeça, cachos, olhos pretos
      return (
        <>
          <mesh position={[0, -b * 0.18, 0]} material={m('#7a2a3a', 0, 0.9)}>
            <coneGeometry args={[a * 0.48, b * 0.58, 7]} />
          </mesh>
          <mesh position={[0, b * 0.15, 0]} material={m(def.color, 0, 0.3)}>
            <cylinderGeometry args={[a * 0.16, a * 0.22, b * 0.12, 6]} />
          </mesh>
          <mesh position={[0, b * 0.32, 0]} material={m(def.color, 0, 0.3)}>
            <sphereGeometry args={[a * 0.32, 7, 6]} />
          </mesh>
          <mesh position={[0, b * 0.37, -0.012]} scale={[1.08, 0.9, 1]} material={m('#3a2214', 0, 1)}>
            <sphereGeometry args={[a * 0.32, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * a * 0.11, b * 0.33, a * 0.29]} material={m('#050404')}>
              <sphereGeometry args={[0.012, 4, 3]} />
            </mesh>
          ))}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * a * 0.36, b * 0.02, 0]} rotation={[0, 0, s * 0.3]} material={m(def.color, 0, 0.3)}>
              <cylinderGeometry args={[0.012, 0.01, b * 0.28, 4]} />
            </mesh>
          ))}
        </>
      )
    case 'espelho':
      // moldura de madeira entalhada, vidro escuro e um pano caído por cima
      return (
        <>
          <mesh material={m('#3a2416', 0.1, 0.8)}>
            <boxGeometry args={[a, b, c * 0.6]} />
          </mesh>
          <mesh position={[0, 0, c * 0.31]} material={m('#1a1c24', 0.9, 0.1)}>
            <boxGeometry args={[a * 0.8, b * 0.84, 0.005]} />
          </mesh>
          <mesh position={[0, b * 0.52, 0]} material={m(GOLD, 0.6, 0.4)}>
            <coneGeometry args={[a * 0.12, b * 0.08, 4]} />
          </mesh>
          {/* véu: um pano cobrindo a metade de cima */}
          <mesh position={[0, b * 0.18, c * 0.36]} rotation={[0.05, 0, 0.04]} material={m('#d8d0c0', 0, 1)}>
            <boxGeometry args={[a * 0.95, b * 0.62, 0.012]} />
          </mesh>
        </>
      )
    // ---- saque
    case 'castical':
      return (
        <>
          <mesh position={[0, -b / 2 + 0.01, 0]} material={m(def.color, 0.6, 0.4)}>
            <cylinderGeometry args={[a * 0.6, a, 0.02, 7]} />
          </mesh>
          <mesh material={m(def.color, 0.6, 0.4)}>
            <cylinderGeometry args={[a * 0.2, a * 0.3, b * 0.8, 6]} />
          </mesh>
          <mesh position={[0, b * 0.38, 0]} material={m(def.color, 0.6, 0.4)}>
            <cylinderGeometry args={[a * 0.55, a * 0.25, 0.02, 7]} />
          </mesh>
          <mesh position={[0, b * 0.45, 0]} material={m('#e8dcc0', 0, 0.9)}>
            <cylinderGeometry args={[a * 0.22, a * 0.22, b * 0.12, 6]} />
          </mesh>
        </>
      )
    case 'relogio':
      return (
        <>
          <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.5, 1]} material={m(def.color, 0.7, 0.3)}>
            <cylinderGeometry args={[a, a, a, 10]} />
          </mesh>
          <mesh position={[0, 0, a * 0.26]} material={m('#e8e0cc', 0, 0.5)}>
            <circleGeometry args={[a * 0.82, 10]} />
          </mesh>
          <mesh position={[0, 0, a * 0.27]} rotation={[0, 0, 0.6]} material={m('#1a1410')}>
            <boxGeometry args={[0.004, a * 0.6, 0.002]} />
          </mesh>
          <mesh position={[0, a * 1.05, 0]} rotation={[0, Math.PI / 2, 0]} material={m(def.color, 0.7, 0.3)}>
            <torusGeometry args={[a * 0.22, 0.004, 4, 8]} />
          </mesh>
        </>
      )
    case 'taca': {
      const glass = m(def.color, 0.2, 0.1)
      return (
        <>
          <mesh position={[0, -b / 2 + 0.005, 0]} material={glass}>
            <cylinderGeometry args={[a * 0.7, a * 0.8, 0.01, 8]} />
          </mesh>
          <mesh position={[0, -b * 0.15, 0]} material={glass}>
            <cylinderGeometry args={[0.006, 0.008, b * 0.55, 5]} />
          </mesh>
          <mesh position={[0, b * 0.25, 0]} material={glass}>
            <cylinderGeometry args={[a, a * 0.25, b * 0.5, 8, 1, true]} />
          </mesh>
        </>
      )
    }
    case 'vaso': {
      const body = new THREE.LatheGeometry(
        [
          [a * 0.55, -b / 2],
          [a * 0.95, -b * 0.2],
          [a, 0],
          [a * 0.7, b * 0.25],
          [a * 0.4, b * 0.4],
          [a * 0.55, b / 2],
        ].map(([x, y]) => new THREE.Vector2(x, y)),
        8,
      )
      return (
        <>
          <mesh geometry={body} material={m(def.color, 0, 0.35)} />
          {/* faixas pintadas */}
          {[-0.12, 0.08].map((y) => (
            <mesh key={y} position={[0, b * y, 0]} material={m('#d8c890', 0, 0.4)}>
              <cylinderGeometry args={[a * 1.0, a * 1.0, 0.02, 8, 1, true]} />
            </mesh>
          ))}
        </>
      )
    }
    case 'caixa':
      return (
        <>
          <mesh position={[0, -b * 0.15, 0]} material={m(def.color, 0, 0.6)}>
            <boxGeometry args={[a, b * 0.7, c]} />
          </mesh>
          {/* tampa abaulada e fecho */}
          <mesh position={[0, b * 0.22, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, c / (b * 0.6)]} material={m('#4a2414', 0, 0.6)}>
            <cylinderGeometry args={[b * 0.3, b * 0.3, a, 8, 1, false, 0, Math.PI]} />
          </mesh>
          <mesh position={[0, b * 0.05, c / 2 + 0.003]} material={m(GOLD, 0.7, 0.3)}>
            <boxGeometry args={[0.03, 0.035, 0.006]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * a * 0.44, -b * 0.15, 0]} material={m(GOLD, 0.7, 0.3)}>
              <boxGeometry args={[0.012, b * 0.72, c * 1.02]} />
            </mesh>
          ))}
        </>
      )
    case 'quadro':
      // moldura dourada e uma pintura escura de retrato
      return (
        <>
          <mesh material={m(GOLD, 0.5, 0.45)}>
            <boxGeometry args={[a, b, c]} />
          </mesh>
          <mesh position={[0, 0, c / 2 + 0.002]} material={m('#2a1c14', 0, 0.9)}>
            <boxGeometry args={[a * 0.84, b * 0.8, 0.004]} />
          </mesh>
          <mesh position={[0, b * 0.05, c / 2 + 0.005]} scale={[0.8, 1, 0.1]} material={m('#8a7058', 0, 0.9)}>
            <sphereGeometry args={[b * 0.14, 6, 5]} />
          </mesh>
          <mesh position={[0, -b * 0.25, c / 2 + 0.004]} material={m('#1a1410', 0, 0.9)}>
            <boxGeometry args={[a * 0.4, b * 0.28, 0.004]} />
          </mesh>
        </>
      )
    case 'gramofone':
      // caixa de madeira, prato, braço e a corneta de latão
      return (
        <>
          <mesh position={[0, -b * 0.3, 0]} material={m(def.color, 0, 0.7)}>
            <boxGeometry args={[a, b * 0.4, c]} />
          </mesh>
          <mesh position={[0, -b * 0.09, 0]} material={m('#111', 0, 0.4)}>
            <cylinderGeometry args={[a * 0.38, a * 0.38, 0.012, 10]} />
          </mesh>
          <mesh position={[a * 0.3, b * 0.02, -c * 0.3]} rotation={[0.5, 0, 0]} material={m(BRASS, 0.6, 0.4)}>
            <cylinderGeometry args={[0.012, 0.015, b * 0.4, 5]} />
          </mesh>
          <mesh position={[a * 0.05, b * 0.3, c * 0.05]} rotation={[-0.9, 0, 0.25]} material={m(BRASS, 0.6, 0.35)}>
            <coneGeometry args={[a * 0.42, b * 0.5, 9, 1, true]} />
          </mesh>
        </>
      )
    // ---- suprimentos, cabeça e ferramentas
    case 'pilhas':
      return (
        <>
          <mesh material={m('#2a2a2a', 0, 0.8)}>
            <boxGeometry args={[a, b, c]} />
          </mesh>
          {[-1.5, -0.5, 0.5, 1.5].map((i) => (
            <mesh key={i} position={[i * a * 0.22, b * 0.25, 0]} material={m(def.color, 0.4, 0.4)}>
              <cylinderGeometry args={[a * 0.09, a * 0.09, b * 0.6, 6]} />
            </mesh>
          ))}
        </>
      )
    case 'cabeca':
      return (
        <>
          <mesh scale={[0.9, 1.05, 1]} material={m(def.color, 0, 0.8)}>
            <sphereGeometry args={[a, 8, 6]} />
          </mesh>
          <mesh position={[0, a * 0.25, -a * 0.12]} scale={[0.98, 1, 1.02]} material={m('#2a1c12', 0, 1)}>
            <sphereGeometry args={[a, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * a * 0.35, a * 0.08, a * 0.88]} material={m('#3a2418')}>
              <boxGeometry args={[a * 0.25, 0.006, 0.01]} />
            </mesh>
          ))}
        </>
      )
    case 'crucifixo':
      return (
        <>
          <mesh material={m(def.color, 0.6, 0.35)}>
            <boxGeometry args={[a * 0.25, b, c]} />
          </mesh>
          <mesh position={[0, b * 0.2, 0]} material={m(def.color, 0.6, 0.35)}>
            <boxGeometry args={[a, a * 0.25, c]} />
          </mesh>
        </>
      )
    case 'kitP':
    case 'kitM':
    case 'kitG':
      return (
        <>
          <mesh material={m('#e0d8c8', 0, 0.7)}>
            <boxGeometry args={[a, b, c]} />
          </mesh>
          <mesh position={[0, b / 2 + 0.002, 0]} material={m(def.color, 0, 0.6)}>
            <boxGeometry args={[a * 0.5, 0.004, c * 0.16]} />
          </mesh>
          <mesh position={[0, b / 2 + 0.002, 0]} material={m(def.color, 0, 0.6)}>
            <boxGeometry args={[a * 0.16, 0.004, c * 0.6]} />
          </mesh>
          <mesh position={[0, b * 0.1, 0]} material={m('#8a2a2a', 0, 0.6)}>
            <boxGeometry args={[a * 1.02, b * 0.12, c * 1.02]} />
          </mesh>
        </>
      )
    case 'granada':
      return (
        <>
          <mesh material={m(def.color, 0.3, 0.6)}>
            <cylinderGeometry args={[a, a, b * 0.8, 7]} />
          </mesh>
          <mesh position={[0, b * 0.45, 0]} material={m('#9a9a8a', 0.6, 0.4)}>
            <cylinderGeometry args={[a * 0.45, a * 0.5, b * 0.12, 6]} />
          </mesh>
          <mesh position={[a * 0.6, b * 0.42, 0]} rotation={[Math.PI / 2, 0, 0]} material={m('#9a9a8a', 0.6, 0.4)}>
            <torusGeometry args={[a * 0.35, 0.004, 4, 8]} />
          </mesh>
          <mesh position={[0, -b * 0.05, 0]} material={m('#d8c040', 0, 0.6)}>
            <cylinderGeometry args={[a * 1.01, a * 1.01, b * 0.08, 7]} />
          </mesh>
        </>
      )
    case 'bastao':
      return (
        <>
          <mesh material={m(def.color, 0, 0.7)}>
            <cylinderGeometry args={[a, a * 0.6, b, 6]} />
          </mesh>
          {/* empunhadura enrolada em fita */}
          <mesh position={[0, -b * 0.36, 0]} material={m('#1a1410', 0, 1)}>
            <cylinderGeometry args={[a * 0.72, a * 0.72, b * 0.26, 6]} />
          </mesh>
        </>
      )
  }
  return null
}

/** Malha do item (no mundo e nas mãos). */
export function ItemModel({ def, broken, uid }: { def: ItemDef; broken: boolean; uid?: string }) {
  const m = useMat(def, broken)
  // na mira: brilho quente pulsando (some devagar ao tirar a mira)
  const glow = useRef({ h: 0, base: null as { color: THREE.Color; intensity: number }[] | null })
  // materiais novos (ex.: quebrou): guarda de novo o brilho original
  useLayoutEffect(() => {
    glow.current = { h: 0, base: null }
  }, [m])
  useFrame(({ clock }, dt) => {
    if (!uid) return
    const g = glow.current
    const target = aimTarget.id === uid ? 1 : 0
    if (target === 0 && g.h === 0) return
    g.base ??= m.all.map((x) => ({ color: x.emissive.clone(), intensity: x.emissiveIntensity }))
    g.h = target ? Math.min(1, g.h + dt * 8) : Math.max(0, g.h - dt * 4)
    const pulse = 0.75 + 0.25 * Math.sin(clock.elapsedTime * 6)
    m.all.forEach((x, i) => {
      const b = g.base![i]
      if (!b) return
      x.emissive.copy(b.color).lerp(HIGHLIGHT.color, g.h)
      x.emissiveIntensity = b.intensity + (HIGHLIGHT.intensity * pulse - b.intensity) * g.h
    })
  })
  const parts = useMemo(() => Parts({ def, m }), [def, m])
  const group = useRef<THREE.Group>(null)
  // todas as peças fazem e recebem sombra da lanterna
  useLayoutEffect(() => {
    group.current?.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = o.receiveShadow = true
    })
  }, [parts])
  const [a, b, c] = def.dims
  return (
    <group ref={group}>
      {parts ?? (
        <mesh material={m(def.color, 0.1, 0.6)}>
          {def.shape === 'box' && <boxGeometry args={[a, b, c]} />}
          {def.shape === 'cylinder' && <cylinderGeometry args={[a, a * 0.85, b, 10]} />}
          {def.shape === 'sphere' && <sphereGeometry args={[a, 10, 8]} />}
        </mesh>
      )}
    </group>
  )
}
