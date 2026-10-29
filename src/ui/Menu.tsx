import { useEffect, useState, type ReactNode } from 'react'
import { VERSION, VERSION_NAME } from '../game/version'
import { useGameStore } from '../game/stores/gameStore'
import { getLevel } from '../game/data/levels'
import { uiSound } from './uiSound'
import { usePlayerStore } from '../player/playerStore'
import { Settings, useTitleStore } from './Screens'
import { Bestiary } from './Bestiary'

/**
 * Menus do jogo: tela de início e pausa. Os dois usam a mesma lista (mouse ou
 * setas + Enter; Esc volta) e os mesmos painéis de configurações, controles e
 * créditos.
 */

export const lockCanvas = () => {
  const canvas = document.querySelector('canvas')
  // o navegador pode recusar (ex.: logo depois de soltar o mouse); um novo clique resolve
  canvas?.requestPointerLock()?.catch?.(() => {})
}

interface Item {
  label: string
  action: () => void
  /** Texto pequeno ao lado (ex.: o contrato atual). */
  note?: string
}

type Panel = 'main' | 'settings' | 'controls' | 'credits' | 'bestiary'

function MenuList({ items, onBack }: { items: Item[]; onBack?: () => void }) {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        setIndex((i) => (i + 1) % items.length)
        uiSound.move()
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        setIndex((i) => (i - 1 + items.length) % items.length)
        uiSound.move()
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault()
        // voltar tem som próprio
        if (items[index]?.label === 'voltar') uiSound.back()
        else uiSound.select()
        items[index]?.action()
      } else if (e.code === 'Escape' && onBack) {
        uiSound.back()
        onBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [items, index, onBack])

  return (
    <ul className="menu-list">
      {items.map((it, i) => (
        <li
          key={it.label}
          className={i === index ? 'selected' : ''}
          onMouseEnter={() => {
            if (i !== index) uiSound.move()
            setIndex(i)
          }}
          onClick={(e) => {
            e.stopPropagation()
            if (it.label === 'voltar') uiSound.back()
            else uiSound.select()
            it.action()
          }}
        >
          <span className="cursor">{i === index ? '▸' : ''}</span>
          {it.label}
          {it.note && <small>{it.note}</small>}
        </li>
      ))}
    </ul>
  )
}

/** Painel secundário com "voltar" (Esc também volta). */
function SubPanel({ title, children, onBack }: { title: string; children: ReactNode; onBack: () => void }) {
  return (
    <div className="menu-panel">
      <h3>{title}</h3>
      {children}
      <MenuList items={[{ label: 'voltar', action: onBack }]} onBack={onBack} />
    </div>
  )
}

const CONTROLS: [string, string][] = [
  ['W A S D', 'andar'],
  ['Shift', 'correr'],
  ['Ctrl / C', 'agachar'],
  ['F', 'lanterna'],
  ['E', 'usar (Shift+E: com força)'],
  ['1 2 3', 'espaço do inventário'],
  ['Q', 'largar'],
  ['clique', 'usar a ferramenta'],
  ['Tab (segurar)', 'mapa do contrato'],
  ['Esc', 'pausa'],
  ['M', 'som ligado / mudo'],
]

function Controls() {
  return (
    <table className="menu-controls">
      <tbody>
        {CONTROLS.map(([k, v]) => (
          <tr key={k}>
            <td>
              <kbd>{k}</kbd>
            </td>
            <td>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Credits() {
  return (
    <div className="menu-credits">
      <p>RELICÁRIO — um jogo original de investigação paranormal.</p>
      <p>Sons e texturas gerados por código.</p>
      <p>Fonte VT323 (Peter Hull, SIL Open Font License).</p>
      <p>Feito com React Three Fiber, Rapier e Zustand.</p>
    </div>
  )
}

function Panels({ panel, setPanel, main }: { panel: Panel; setPanel: (p: Panel) => void; main: ReactNode }) {
  const back = () => setPanel('main')
  // o caderno ocupa a tela toda e tem a própria navegação
  if (panel === 'bestiary') return <Bestiary onBack={back} />
  if (panel === 'settings')
    return (
      <SubPanel title="Configurações" onBack={back}>
        <Settings />
      </SubPanel>
    )
  if (panel === 'controls')
    return (
      <SubPanel title="Controles" onBack={back}>
        <Controls />
      </SubPanel>
    )
  if (panel === 'credits')
    return (
      <SubPanel title="Créditos" onBack={back}>
        <Credits />
      </SubPanel>
    )
  return <>{main}</>
}

/** Tela de início: o carro parado na frente da casa, por trás do menu. */
export function MainMenu() {
  const start = useTitleStore((s) => s.start)
  const levelIndex = useGameStore((s) => s.levelIndex)
  const money = useGameStore((s) => s.money)
  const [panel, setPanel] = useState<Panel>('main')
  const level = getLevel(levelIndex)
  const items: Item[] = [
    {
      label: 'Iniciar investigação',
      note: level.name,
      action: () => {
        start()
        lockCanvas()
      },
    },
    { label: 'Bestiário', note: 'caderno de campo', action: () => setPanel('bestiary') },
    { label: 'Configurações', action: () => setPanel('settings') },
    { label: 'Controles', action: () => setPanel('controls') },
    { label: 'Créditos', action: () => setPanel('credits') },
  ]
  return (
    <div className="screen main-menu">
      <div className="menu-head">
        <h1 data-text="RELICÁRIO">RELICÁRIO</h1>
        <div className="subtitle">Centro de Recuperação de Objetos Sobrenaturais</div>
      </div>
      <Panels panel={panel} setPanel={setPanel} main={<MenuList items={items} />} />
      <div className="menu-foot">
        <span>
          v{VERSION} · {VERSION_NAME}
        </span>
        <span>saldo ${money}</span>
      </div>
    </div>
  )
}

/** Mouse solto durante a partida: o jogo para (World pausa a física). */
export function PauseMenu() {
  const quit = useTitleStore((s) => s.quit)
  const [panel, setPanel] = useState<Panel>('main')
  // o cronômetro das entidades usa o relógio real: empurra para frente o tempo parado
  useEffect(() => {
    const t0 = performance.now()
    return () => {
      const { enemyTimerStart } = useGameStore.getState()
      if (enemyTimerStart !== null) useGameStore.setState({ enemyTimerStart: enemyTimerStart + performance.now() - t0 })
    }
  }, [])
  const restart = () => {
    useGameStore.getState().restart()
    usePlayerStore.getState().respawn()
  }
  const items: Item[] = [
    { label: 'Continuar', action: lockCanvas },
    { label: 'Configurações', action: () => setPanel('settings') },
    { label: 'Controles', action: () => setPanel('controls') },
    {
      label: 'Recomeçar contrato',
      action: () => {
        restart()
        lockCanvas()
      },
    },
    {
      label: 'Voltar ao início',
      action: () => {
        restart()
        quit()
      },
    },
  ]
  return (
    <div className="screen pause-screen">
      <h2>PAUSA</h2>
      <Panels panel={panel} setPanel={setPanel} main={<MenuList items={items} />} />
    </div>
  )
}
