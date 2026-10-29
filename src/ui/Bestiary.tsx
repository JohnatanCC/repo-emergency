import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GuardiaModel } from '../enemies/models/GuardiaModel'
import { SombraModel } from '../enemies/models/SombraModel'
import { PossessorModel } from '../enemies/models/PossessorModel'
import { CoisaModel } from '../enemies/models/CoisaModel'
import { EspectroModel } from '../enemies/models/EspectroModel'
import { newPose, type Pose } from '../enemies/models/pose'
import { uiSound } from './uiSound'

/**
 * Bestiário do C.R.O.S: um caderno de campo com uma criatura por página dupla.
 * À esquerda, o modelo girando à luz de vela; à direita, a ficha: TIER
 * (letalidade, 0–4), aparência, comportamento e como evitar.
 */

interface Entry {
  name: string
  latin: string
  tier: number
  tierNote: string
  look: string
  behavior: string
  avoid: string[]
  model: typeof GuardiaModel
  pose: Partial<Pose>
  /** Altura do olhar da câmera e distância. */
  frame: [number, number]
  lift?: number
  /** Fundo da foto (a Sombra precisa de fundo claro para aparecer). */
  bg?: string
}

const ENTRIES: Entry[] = [
  {
    name: 'A Guardiã',
    latin: 'custos domus',
    tier: 2,
    tierNote: 'bote de 1,9 m com os braços · golpe de 30 · no Hospital, 50 e não larga o alvo',
    look: 'Alta e curvada, de vestido escuro com babados e mangas bufantes. O cabelo comprido cobre um rosto pálido e rachado, de olhos sem fundo. Os braços passam dos joelhos; os dedos são longos e se mexem sozinhos.',
    behavior:
      'Patrulha de cabeça baixa, arrastando os pés, e vai atrás de qualquer barulho. Sabe de onde saiu cada relíquia: pegar uma é chamá-la. Ao ver você, curva-se e corre de braços estendidos. De perto ela dá o bote: ergue os braços com um grito, levanta a cabeça — é a única vez que olha direto — e desce as mãos.',
    avoid: [
      'Ande agachado e com a lanterna desligada em salas claras: ela vê a luz de longe.',
      'Feche portas atrás de você, mas sem bater.',
      'Quebre a linha de visão e se esconda onde ela não viu você entrar.',
      'Quando ela erguer os braços, recue na hora: o golpe desce em meio segundo e erra quem saiu do alcance.',
      'Depois de um golpe ela recua um instante: é a hora de correr.',
    ],
    model: GuardiaModel,
    pose: { mode: 'calm' },
    frame: [1.55, 3.1],
  },
  {
    name: 'A Sombra',
    latin: 'umbra famelica',
    tier: 3,
    tierNote: 'toque de 35 · caça de quatro, em arrancadas',
    look: 'Um vazio preto de quase três metros, cabeça alongada sem rosto (só dois pontos de luz), espinhos nos ombros, braços enormes terminando em três garras, pernas que afinam em ponta. Deixa fumaça no ar por onde passa.',
    behavior:
      'Vive nas salas escuras e não sai delas. Vagando, anda ereta com passos longos e espasmos. Quando caça, cai de quatro e corre aos trancos — dispara, quase para, dispara de novo. Sob o facho da lanterna, congela na pose em que estava.',
    avoid: [
      'Mantenha a lanterna nela: parada no feixe ela não anda (mas a bateria gasta 4× mais rápido).',
      'Leve pilhas extras para salas escuras.',
      'Atravesse o território dela pelo caminho mais curto, nunca de costas para o escuro.',
    ],
    model: SombraModel,
    bg: '#8a7a5e',
    pose: { moving: 0.5 },
    frame: [1.45, 4.2],
  },
  {
    name: 'O Possessor',
    latin: 'spiritus inclusus',
    tier: 1,
    tierNote: 'drena a vida devagar · o toque possui (15 de dano)',
    look: 'Um espírito translúcido e esverdeado, magro e alongado, com tiras esfarrapadas no lugar das pernas e braços longos de três garras. O rosto está sempre gritando. Flutua e deixa um rastro pálido.',
    behavior:
      'Mora dentro de um objeto de saque. Carregado, murmura (fazendo barulho) e suga a vida aos poucos. Largado, sai do objeto e persegue por um tempo antes de voltar. Extrair o objeto possuído rende multa do C.R.O.S.',
    avoid: [
      'Desconfie do objeto que sussurra: ele tremula no inventário.',
      'O toque dele possui por alguns segundos: as pernas pesam, a cabeça é puxada e a lanterna falha. Afaste-se antes de ser tocado de novo.',
      'Largue-o longe do caminho e se afaste: a figura some sozinha.',
      'Nunca leve o objeto possuído ao extrator.',
    ],
    model: PossessorModel,
    pose: {},
    frame: [1.75, 3.0],
    lift: 0.35,
  },
  {
    name: 'A COISA',
    latin: 'portator capitis',
    tier: 0,
    tierNote: 'inofensiva — mas fugindo chama as outras',
    look: 'Um corpo pequeno de fumaça negra, curvado sobre duas pernas longas e finas de joelho para trás, com um olho aceso. Abraça a cabeça do investigador morto e deixa um rastro de fumaça roxa.',
    behavior:
      'Surge onde você morreu, segurando a sua cabeça. Não ataca: ronda o lugar olhando em volta aos trancos e foge quando você chega perto. Fugindo, sussurra alto — e o barulho atrai as outras criaturas.',
    avoid: [
      'Encurrale-a em vez de correr atrás.',
      'Alcançada, ela solta a cabeça: leve a cabeça ao caminhão para recuperar a vida perdida.',
    ],
    model: CoisaModel,
    pose: {},
    frame: [0.8, 2.2],
  },
  {
    name: 'O Espectro',
    latin: 'vagans sine oculis',
    tier: 3,
    tierNote: 'o toque mata (100) · atravessa paredes · esconder-se não adianta',
    look: 'Uma jovem pálida que flutua, de cabelo emo caindo em diagonal sobre o rosto, sem olhos — duas órbitas fundas escorrendo. Roupa clara de tiras e fivela, mãos sujas de sangue. A boca vai além do humano: a mandíbula se solta e o peito se abre ao meio, cheio de dentes.',
    behavior:
      'Vaga devagar pela casa, atravessando paredes, e cantarola baixinho — é assim que se sabe que está perto. Se você chegar perto demais, ela para, vira, abre a boca e grita. Depois vem em linha reta, por dentro das paredes, cada vez mais rápida, até alcançar. Quem ela pega, ela encara antes.',
    avoid: [
      'Escute: o cantarolar diz de onde ela vem. Não chegue a menos de quatro passos.',
      'Ela atravessa paredes e armários: esconder-se não salva.',
      'Corra e saia da casa: ela não passa da fachada, só fica olhando lá de dentro.',
      'O crucifixo e a granada de luz a seguram por um tempo — use para fugir.',
    ],
    model: EspectroModel,
    pose: { mode: 'alert', attack: 0.55 },
    frame: [1.45, 3.0],
    lift: 0.32,
    bg: '#2e2a34',
  },
]

/** Câmera em volta da criatura, à luz de uma vela que tremula. */
function Stage({ entry }: { entry: Entry }) {
  const group = useRef<THREE.Group>(null)
  const candle = useRef<THREE.PointLight>(null)
  const pose = useMemo(() => ({ ...newPose(), ...entry.pose }), [entry])
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime
    if (group.current) group.current.rotation.y = Math.sin(t * 0.4) * 0.7
    if (candle.current) candle.current.intensity = 4 + Math.sin(t * 9) * 0.5 + Math.sin(t * 23) * 0.3
    camera.position.set(0, entry.frame[0], entry.frame[1])
    camera.lookAt(0, entry.frame[0] - 0.25, 0)
  })
  return (
    <>
      <color attach="background" args={[entry.bg ?? '#3e3020']} />
      <ambientLight intensity={0.35} color="#d8b888" />
      <pointLight ref={candle} position={[0.8, 1.6, 1.4]} color="#ffb060" distance={6} />
      <group ref={group} position={[0, entry.lift ?? 0, 0]}>
        <entry.model pose={pose} />
      </group>
    </>
  )
}

export function Bestiary({ onBack }: { onBack: () => void }) {
  const [page, setPage] = useState(0)
  const [turning, setTurning] = useState(0)
  const entry = ENTRIES[page]
  const turn = (d: number) => {
    const next = (page + d + ENTRIES.length) % ENTRIES.length
    setPage(next)
    setTurning((t) => t + 1)
    uiSound.page()
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowRight' || e.code === 'KeyD') turn(1)
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') turn(-1)
      else if (e.code === 'Escape') {
        uiSound.back()
        onBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="bestiary">
      <div className="book" key={turning}>
        <div className="page left">
          <div className="plate">
            <Canvas dpr={0.45} className="retro" camera={{ fov: 40 }}>
              <Stage entry={entry} />
            </Canvas>
          </div>
          <div className="caption">
            fig. {page + 1} — <em>{entry.latin}</em>
          </div>
        </div>
        <div className="page right">
          <h3>{entry.name}</h3>
          <div className="tier">
            TIER <b>{entry.tier}</b>
            <span className="skulls">{'☠'.repeat(entry.tier) || '—'}</span>
            <small>{entry.tierNote}</small>
          </div>
          <h4>Aparência</h4>
          <p>{entry.look}</p>
          <h4>Comportamento</h4>
          <p>{entry.behavior}</p>
          <h4>Como evitar</h4>
          <ul>
            {entry.avoid.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <div className="folio">
            {page + 1} / {ENTRIES.length}
          </div>
        </div>
      </div>
      <div className="book-nav">
        <button onClick={() => turn(-1)}>◀ anterior</button>
        <button
          onClick={() => {
            uiSound.back()
            onBack()
          }}
        >
          fechar o caderno
        </button>
        <button onClick={() => turn(1)}>próxima ▶</button>
      </div>
    </div>
  )
}
