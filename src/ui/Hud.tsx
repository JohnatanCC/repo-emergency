import { useEffect, useState } from 'react'
import { VERSION, VERSION_NAME } from '../game/version'
import { isPaused, nextLevel, payout, penalty, useGameStore, type DebugFlags } from '../game/stores/gameStore'
import { getLevel } from '../game/data/levels'
import { EXTRACTION } from '../game/config'
import { TOOLS } from '../game/shop'
import { audio, SOUND_IDS } from '../game/audio/engine'
import type { SoundId } from '../game/audio/sounds'
import type { LevelData } from '../game/data/types'
import { usePlayerStore } from '../player/playerStore'
import { useHidingStore } from '../player/hidingStore'
import { FLASHLIGHT, LIVES, PLAYER } from '../player/config'
import { DamageFeedback, useTitleStore, VhsOverlay } from './Screens'
import { lockCanvas, MainMenu, PauseMenu } from './Menu'
import { MapPanel } from './MapPanel'
import { MenuMusic } from './MenuMusic'
import { uiSound } from './uiSound'
import { Jumpscare } from './Jumpscare'
import { hasPossessor, isBroken, isCarried, useItemStore, type ItemInstance } from '../items/itemStore'

const TOGGLES: { key: string; flag: keyof DebugFlags; label: string }[] = [
  { key: 'g', flag: 'gizmos', label: 'Marcadores' },
  { key: 'l', flag: 'fullbright', label: 'Luz total' },
  { key: 'r', flag: 'retro', label: 'Filtro retrô' },
  { key: 'n', flag: 'fog', label: 'Neblina' },
]

/** Quantos corações aparecem (vidas do começo da partida). */
const LIVES_SHOWN = LIVES

/** Dano da tecla K, para testar morte e renascimento. */
const DEBUG_DAMAGE = 25

/** Contagem da 1ª porta até as entidades (só informativo enquanto elas não existem). */
function EnemyTimer({ delay }: { delay: number }) {
  const start = useGameStore((s) => s.enemyTimerStart)
  const [, tick] = useState(0)
  useEffect(() => {
    if (start === null) return
    const id = setInterval(() => tick((t) => t + 1), 250)
    return () => clearInterval(id)
  }, [start])
  if (start === null) return <> · entidades: 1ª porta fechada</>
  const left = Math.ceil(delay - (performance.now() - start) / 1000)
  return <> · entidades {left > 0 ? `em ${left}s` : 'ativas'}</>
}

/** Quantas relíquias já estão no extrator. */
function ExtractorCount({ quota }: { quota: number }) {
  const relics = useGameStore((s) => s.extractor.inside.relics)
  const status = useGameStore((s) => s.extractor.status)
  if (status === 'done') return <> · extração feita</>
  return (
    <>
      {' '}
      · extrator {relics}/{quota}
    </>
  )
}

/** Canto superior direito: a meta do contrato em destaque, o dinheiro e o local. */
function Objective({ level }: { level: LevelData }) {
  const relics = useGameStore((s) => s.extractor.inside.relics)
  const status = useGameStore((s) => s.extractor.status)
  const phase = useGameStore((s) => s.phase)
  const money = useGameStore((s) => s.money)
  const items = useItemStore((s) => s.items)
  const carried = Object.values(items)
    .filter(isCarried)
    .reduce((sum, it) => sum + it.value, 0)
  const done = status === 'done' || phase === 'blackout'
  const goal = done ? 'volte ao caminhão' : status === 'charging' ? 'aguarde a extração' : 'relíquias no extrator'
  return (
    <div className="hud-objective">
      <div className={`count${relics >= level.relicQuota ? ' met' : ''}`}>
        <b>{relics}</b>
        <span>/{level.relicQuota}</span>
      </div>
      <div className={`goal${done ? ' urgent' : ''}`}>{goal}</div>
      <div className="money">
        <b>${carried}</b>
        <span> carregando · saldo ${money}</span>
      </div>
      <div className="place">{level.name}</div>
    </div>
  )
}

/** Aviso no topo: extrator carregando / apagão. */
function Banner() {
  const status = useGameStore((s) => s.extractor.status)
  const chargeStart = useGameStore((s) => s.extractor.chargeStart)
  const phase = useGameStore((s) => s.phase)
  const [, tick] = useState(0)
  useEffect(() => {
    if (status !== 'charging') return
    const id = setInterval(() => tick((t) => t + 1), 200)
    return () => clearInterval(id)
  }, [status])
  if (status === 'charging' && chargeStart !== null) {
    const left = Math.max(0, Math.ceil(EXTRACTION.chargeSeconds - (performance.now() - chargeStart) / 1000))
    return <div className="hud-banner charging">EXTRATOR ATIVANDO · {left}s</div>
  }
  if (phase === 'blackout') return <div className="hud-banner blackout">APAGÃO · VOLTE AO CARRO</div>
  return null
}

/** Loja do C.R.O.S entre contratos. As ferramentas aparecem no carro no próximo contrato. */
function Shop() {
  const money = useGameStore((s) => s.money)
  const equipment = useGameStore((s) => s.equipment)
  const next = getLevel(nextLevel(useGameStore((s) => s.levelIndex)))
  const buy = (id: (typeof TOOLS)[number]['id']) => {
    if (useGameStore.getState().buy(id)) uiSound.select()
  }
  return (
    <div className="hud-shop">
      <h2>LOJA DO C.R.O.S</h2>
      <div className="money">saldo ${money}</div>
      <div className="next">
        próximo contrato: {next.name} · meta {next.relicQuota} relíquias
      </div>
      {TOOLS.map((t, i) => (
        <button key={t.id} className="tool" disabled={money < t.price} onClick={() => buy(t.id)}>
          <kbd>{i + 1}</kbd>
          <span className="name">
            {t.name}
            <small>{t.description}</small>
          </span>
          <span className="owned">{equipment[t.id] ? `×${equipment[t.id]}` : ''}</span>
          <span className="price">${t.price}</span>
        </button>
      ))}
      <small className="foot">
        As ferramentas ficam no chão do carro e ocupam espaço no inventário. <kbd>Enter</kbd> começar contrato
      </small>
    </div>
  )
}

/** Tela de pagamento ao voltar ao carro. */
function Results() {
  const result = useGameStore((s) => s.result)
  const money = useGameStore((s) => s.money)
  if (!result) return null
  const total = payout(result)
  return (
    <div className="hud-results">
      <h2>CONTRATO CUMPRIDO</h2>
      <div className="row">
        <span>Relíquias entregues ao C.R.O.S ({result.relics})</span>
        <span>${result.relicValue}</span>
      </div>
      <div className="row">
        <span>Saque vendido ({result.loot})</span>
        <span>${result.lootValue}</span>
      </div>
      {result.possessed > 0 && (
        <div className="row fine">
          <span>Multa: objeto possuído ({result.possessed})</span>
          <span>-${penalty(result)}</span>
        </div>
      )}
      <div className="row total">
        <span>Total</span>
        <span>${total}</span>
      </div>
      <div className="row">
        <span>Saldo</span>
        <span>
          ${money} → ${money + total}
        </span>
      </div>
      <small>
        <kbd>Enter</kbd> loja do C.R.O.S
      </small>
    </div>
  )
}

/** Dica da mira, logo abaixo dela. */
/** Aviso rápido (ferramentas): some sozinho. */
function Toast() {
  const toast = usePlayerStore((s) => s.toast)
  const [, tick] = useState(0)
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => tick((t) => t + 1), 1800)
    return () => clearTimeout(id)
  }, [toast])
  if (!toast || performance.now() - toast.at > 1700) return null
  return <div className="hud-toast">{toast.text}</div>
}

function AimHint() {
  const hint = usePlayerStore((s) => s.hint)
  if (!hint) return null
  return (
    <div className={`hud-hint${hint.ok ? '' : ' blocked'}`}>
      {hint.ok && <kbd>E</kbd>} {hint.text}
    </div>
  )
}

function SlotItem({ item }: { item: ItemInstance | undefined }) {
  if (!item) return <span className="empty">vazio</span>
  return (
    <>
      {/* depois do primeiro murmúrio, o objeto possuído tremula */}
      <span className={`${item.def.tag === 'relic' ? 'relic' : ''}${hasPossessor(item) && item.revealed ? ' possessed' : ''}`}>
        {item.def.name}
        {isBroken(item) && ' (quebrado)'}
      </span>
      <small>{item.def.tag === 'tool' ? 'clique' : `${item.value}`}</small>
    </>
  )
}

/** Inventário (3 espaços), item nas mãos e total carregado (embaixo, no centro). */
function Inventory() {
  const items = useItemStore((s) => s.items)
  const slots = useItemStore((s) => s.slots)
  const selected = useItemStore((s) => s.selected)
  const hands = useItemStore((s) => s.hands)
  return (
    <div className="hud-inventory">
      <div className="hands">
        {hands ? (
          <>
            nas mãos: <SlotItem item={items[hands]} />
          </>
        ) : (
          <span className="empty">mãos livres</span>
        )}
      </div>
      <div className="slots">
        {slots.map((uid, i) => (
          <div key={i} className={`slot${i === selected ? ' selected' : ''}`}>
            <kbd>{i + 1}</kbd>
            <SlotItem item={uid ? items[uid] : undefined} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Vida, estamina e vidas restantes (canto inferior esquerdo). */
const HIDE_LABEL = { wardrobe: 'no armário', 'under-table': 'embaixo da mesa', 'under-chair': 'atrás da cadeira (parcial)' }

/** Escondido? (aparece acima das vidas) */
function HideStatus() {
  const spot = useHidingStore((s) => s.spot)
  const marked = useHidingStore((s) => (s.spot ? s.marked.includes(s.spot.id) : false))
  if (!spot) return null
  return (
    <div className={`hud-hide${marked ? ' marked' : ''}`}>
      escondido · {HIDE_LABEL[spot.type]}
      {marked && ' · MARCADO'}
    </div>
  )
}

/** Visão de dentro do armário: escuro, só a fresta entre as portas. */
function WardrobeView() {
  const inside = useHidingStore((s) => !!s.wardrobeId)
  return inside ? <div className="hud-wardrobe" /> : null
}

/** Canto superior esquerdo: vida, estamina, bateria da lanterna e vidas, em números grandes. */
function Vitals() {
  const health = usePlayerStore((s) => Math.round(s.health))
  const stamina = usePlayerStore((s) => Math.round(s.stamina))
  const exhausted = usePlayerStore((s) => s.exhausted)
  const battery = usePlayerStore((s) => Math.round(s.battery))
  const lives = useGameStore((s) => s.lives)
  return (
    <div className="hud-vitals">
      <div className={`stat health${health <= PLAYER.maxHealth * 0.3 ? ' low' : ''}`}>
        <i>✚</i>
        <b>{health}</b>
        <span>/{PLAYER.maxHealth}</span>
      </div>
      <div className={`stat stamina${exhausted ? ' low' : ''}`}>
        <i>ϟ</i>
        <b>{stamina}</b>
        <span>/{PLAYER.maxStamina}</span>
      </div>
      {/* bateria da lanterna: fica vermelha quando fraca */}
      <div className={`stat battery${battery < FLASHLIGHT.lowAt ? ' low' : ''}`}>
        <i>◐</i>
        <b>{battery}</b>
        <span>% luz</span>
      </div>
      <div className="hud-lives">
        {Array.from({ length: LIVES_SHOWN }, (_, i) => (
          <i key={i} className={i < lives ? 'on' : ''}>
            ♥
          </i>
        ))}
      </div>
    </div>
  )
}

export function Hud({ level }: { level: LevelData }) {
  const debug = useGameStore((s) => s.debug)
  const phase = useGameStore((s) => s.phase)
  const cameraMode = useGameStore((s) => s.cameraMode)
  const toggleDebug = useGameStore((s) => s.toggleDebug)
  const toggleBlackout = useGameStore((s) => s.toggleBlackout)
  const toggleCameraMode = useGameStore((s) => s.toggleCameraMode)
  const cycleVisit = useGameStore((s) => s.cycleVisit)
  const visitRoom = useGameStore((s) => s.visitRoom)
  const locked = usePlayerStore((s) => s.locked)
  const reviving = usePlayerStore((s) => s.reviving)
  const [sound, setSound] = useState<SoundId>('creak')
  const [muted, setMuted] = useState(false)
  const [panel, setPanel] = useState(false)
  const started = useTitleStore((s) => s.started)
  const startTitle = useTitleStore((s) => s.start)
  const entered = useTitleStore((s) => s.entered)
  const enter = useTitleStore((s) => s.enter)
  // travou o mouse depois do início: a partir daqui, soltar é pausa
  useEffect(() => {
    if (locked && started && !entered) enter()
  }, [locked, started, entered, enter])
  // mouse travado por outro caminho (ex.: teste) também passa do título
  useEffect(() => {
    if (locked && !started) startTitle()
  }, [locked, started, startTitle])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLSelectElement) return
      if (e.key === 'F1') {
        e.preventDefault()
        if (document.pointerLockElement) document.exitPointerLock()
        toggleCameraMode()
        return
      }
      const k = e.key.toLowerCase()
      const t = TOGGLES.find((t) => t.key === k)
      if (t) toggleDebug(t.flag)
      if (k === 'b') toggleBlackout()
      if (k === 'v' && useGameStore.getState().cameraMode === 'editor') cycleVisit(level.rooms.length)
      if (k === 'h') setPanel((v) => !v)
      if (k === 'k') usePlayerStore.getState().damage(DEBUG_DAMAGE)
      if (k === 'm') setMuted(audio.toggleMute())
      if (k === 'f' && useGameStore.getState().cameraMode === 'player') {
        usePlayerStore.getState().toggleFlashlight()
        audio.play('click', { volume: 0.5 })
      }
      if (k === 'enter' && useGameStore.getState().phase === 'gameover') {
        useGameStore.getState().restart()
        usePlayerStore.getState().respawn()
      }
      const game = useGameStore.getState()
      if (k === 'enter' && game.phase === 'results') {
        // pagamento → loja (solta o mouse para clicar nos itens)
        game.toShop()
        if (document.pointerLockElement) document.exitPointerLock()
      } else if (k === 'enter' && game.phase === 'shop') {
        game.nextContract()
        usePlayerStore.getState().respawn()
      } else if (game.phase === 'shop') {
        const n = Number(e.key)
        if (n >= 1 && n <= TOOLS.length && game.buy(TOOLS[n - 1].id)) uiSound.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleDebug, toggleBlackout, toggleCameraMode, cycleVisit, level.rooms.length])

  const playing = cameraMode === 'player' && !isPaused(phase)

  return (
    <div className="hud">
      {started && !isPaused(phase) && <Objective level={level} />}
      <div className="hud-top">
        {panel && !isPaused(phase) && (
          <div className="hud-sub">
            v{VERSION} · {VERSION_NAME} · fase: {phase}
            <ExtractorCount quota={level.relicQuota} />
            <EnemyTimer delay={level.enemyDelay} />
          </div>
        )}

        {/* nas telas de pagamento e loja o painel de debug sai da frente */}
        {panel && !isPaused(phase) && (
          <div className="hud-panel">
            <h3>{cameraMode === 'player' ? 'Investigador' : 'Modo editor'}</h3>
            {cameraMode === 'player' ? (
              <>
                <div className="row">
                  <span>
                    <kbd>W</kbd>
                    <kbd>A</kbd>
                    <kbd>S</kbd>
                    <kbd>D</kbd> andar
                  </span>
                  <span>
                    <kbd>Shift</kbd> correr
                  </span>
                </div>
                <div className="row">
                  <span>
                    <kbd>C</kbd>/<kbd>Ctrl</kbd> agachar
                  </span>
                  <span>
                    <kbd>F</kbd> lanterna
                  </span>
                </div>
                <div className="row">
                  <span>
                    <kbd>E</kbd> usar · <kbd>Shift</kbd>+<kbd>E</kbd> com força
                  </span>
                  <span>
                    <kbd>Esc</kbd> soltar mouse
                  </span>
                </div>
                <div className="row">
                  <span>
                    <kbd>1</kbd>
                    <kbd>2</kbd>
                    <kbd>3</kbd> espaço do inventário
                  </span>
                  <span>
                    <kbd>Q</kbd> largar
                  </span>
                </div>
                <div className="row">
                  <span>clique esquerdo: usar a ferramenta do espaço escolhido</span>
                </div>
              </>
            ) : (
              <>
                <div className="row">
                  <span>Câmera</span>
                  <span>arrastar · scroll · botão direito</span>
                </div>
                <div className="row">
                  <span>
                    <kbd>V</kbd> Visitar sala
                  </span>
                  <span>{visitRoom < 0 ? 'visão geral' : level.rooms[visitRoom].name}</span>
                </div>
              </>
            )}
            <div className="row">
              <span>
                <kbd>F1</kbd> Câmera
              </span>
              <span>{cameraMode === 'player' ? 'investigador' : 'editor'}</span>
            </div>
            {TOGGLES.map((t) => (
              <div className="row" key={t.flag}>
                <span>
                  <kbd>{t.key.toUpperCase()}</kbd> {t.label}
                </span>
                <span className={debug[t.flag] ? 'on' : 'off'}>{debug[t.flag] ? 'ligado' : 'desligado'}</span>
              </div>
            ))}
            <div className="row">
              <span>
                <kbd>B</kbd> Apagão (prévia)
              </span>
              <span className={phase === 'blackout' ? 'on' : 'off'}>{phase === 'blackout' ? 'ligado' : 'desligado'}</span>
            </div>
            <div className="row">
              <span>
                <kbd>K</kbd> Tomar {DEBUG_DAMAGE} de dano
              </span>
            </div>
            <div className="row">
              <span>
                <kbd>M</kbd> Som
              </span>
              <span className={muted ? 'off' : 'on'}>{muted ? 'mudo' : 'ligado'}</span>
            </div>
            <div className="row" style={{ marginTop: 6 }}>
              <select value={sound} onChange={(e) => setSound(e.target.value as SoundId)}>
                {SOUND_IDS.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
              <button onClick={() => audio.play(sound)}>▶ tocar</button>
            </div>
            <div className="row" style={{ marginTop: 4 }}>
              <span>
                <kbd>H</kbd> esconder painel
              </span>
            </div>
          </div>
        )}
      </div>

      {playing && locked && reviving === null && <div className="hud-crosshair" />}
      {playing && locked && reviving === null && <AimHint />}
      {reviving !== null && (
        <div className="revive-caption">
          <i>●</i> C.R.O.S · RECONSTITUIÇÃO DO INVESTIGADOR
        </div>
      )}
      {playing && <Toast />}
      {playing && started && entered && !locked && <PauseMenu />}
      {playing && started && !entered && !locked && (
        <div className="screen enter-prompt" onClick={lockCanvas}>
          <div className="blink">— clique para entrar —</div>
        </div>
      )}
      <MenuMusic mode={!started ? 'menu' : playing && !locked ? 'pause' : 'off'} />
      <Banner />
      {phase === 'results' && <Results />}
      {phase === 'shop' && <Shop />}
      {phase === 'gameover' && (
        <div className="hud-center gameover">
          FIM DE JOGO
          <small>
            <kbd>Enter</kbd> recomeçar
          </small>
        </div>
      )}

      {cameraMode === 'player' && <WardrobeView />}
      {cameraMode === 'player' && <HideStatus />}
      {cameraMode === 'player' && started && <Vitals />}
      {cameraMode === 'player' && started && <Inventory />}
      {cameraMode === 'player' && started && debug.retro && <VhsOverlay level={level} />}
      {cameraMode === 'player' && <DamageFeedback />}
      {cameraMode === 'player' && !started && <MainMenu />}
      {cameraMode === 'player' && <MapPanel level={level} enabled={playing && started && locked && reviving === null} />}
      <Jumpscare />
    </div>
  )
}
