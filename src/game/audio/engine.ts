import type { FloorType } from '../data/types'
import { AUDIO, SOUND_FILES, type SoundId } from './sounds'
import * as S from './synth'

/**
 * Motor de áudio (Web Audio). Sons 3D usam um panner HRTF; o ouvinte é a
 * câmera (atualizado pelo AudioDirector). O navegador só libera o áudio
 * depois de um clique/tecla, então o contexto é retomado no primeiro gesto.
 */

const FLOORS: FloorType[] = ['metal', 'wood', 'checker', 'tile', 'grass', 'carpet']

const SYNTHS = {
  ...Object.fromEntries(FLOORS.map((f) => [`step-${f}`, S.footstep(f)])),
  creak: S.creak,
  slam: S.slam,
  thunk: S.thunk,
  shatter: S.shatter,
  rustle: S.rustle,
  click: S.click,
  drone: S.drone,
  hum: S.hum,
  charge: S.charge,
  whoosh: S.whoosh,
  heartbeat: S.heartbeat,
  wind: S.wind(false),
  windIndoor: S.wind(true),
  crickets: S.crickets,
  drip: S.drip,
  tick: S.tick,
  thunder: S.thunder,
  shuffle: S.shuffle,
  whisper: S.whisper,
  shriek: S.shriek,
  hit: S.hit,
  hiss: S.hiss,
  murmur: S.murmur,
} as Record<SoundId, S.Synth>

export const SOUND_IDS = Object.keys(SYNTHS) as SoundId[]

type Vec3 = [number, number, number]

export interface PlayOptions {
  /** Posição no mundo; sem posição = som "na cabeça" (2D). */
  pos?: Vec3
  volume?: number
  /** Velocidade/tom (1 = normal). */
  rate?: number
  /** Distância (m) com volume cheio; maior = som que preenche uma área. */
  ref?: number
}

export interface LoopHandle {
  setVolume: (v: number, seconds?: number) => void
  setRate: (r: number) => void
  /** Move um som 3D (ex.: preso a uma entidade). */
  setPos: (p: Vec3) => void
  stop: () => void
}

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private buffers = new Map<SoundId, AudioBuffer[]>()
  private loading = new Set<SoundId>()
  muted = false
  /** Volume do jogador (configurações), 0–1. */
  private volume = 1

  private context() {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.level()
      this.master.connect(this.ctx.destination)
      const resume = () => void this.ctx?.resume()
      window.addEventListener('pointerdown', resume)
      window.addEventListener('keydown', resume)
    }
    return { ctx: this.ctx, master: this.master! }
  }

  private variants(id: SoundId): AudioBuffer[] {
    const ready = this.buffers.get(id)
    if (ready) return ready
    const { ctx } = this.context()
    const files = SOUND_FILES[id]
    if (files?.length) {
      // arquivo: carrega em segundo plano; até lá, fica em silêncio
      if (!this.loading.has(id)) {
        this.loading.add(id)
        Promise.all(
          files.map((f) =>
            fetch(f)
              .then((r) => r.arrayBuffer())
              .then((b) => ctx.decodeAudioData(b)),
          ),
        )
          .then((list) => this.buffers.set(id, list))
          .catch((e) => console.warn(`som ${id}: não carregou`, e))
      }
      return []
    }
    const list = SYNTHS[id](ctx.sampleRate).map((data) => {
      const buf = ctx.createBuffer(1, data.length, ctx.sampleRate)
      buf.copyToChannel(data, 0)
      return buf
    })
    this.buffers.set(id, list)
    return list
  }

  private chain(id: SoundId, opts: PlayOptions, loop: boolean) {
    const { ctx, master } = this.context()
    const list = this.variants(id)
    if (!list.length) return null
    const src = ctx.createBufferSource()
    src.buffer = list[Math.floor(Math.random() * list.length)]
    src.loop = loop
    src.playbackRate.value = opts.rate ?? 1
    const gain = ctx.createGain()
    gain.gain.value = opts.volume ?? 1
    src.connect(gain)
    let panner: PannerNode | null = null
    if (opts.pos) {
      const p = (panner = ctx.createPanner())
      p.panningModel = 'HRTF'
      p.distanceModel = 'inverse'
      p.refDistance = opts.ref ?? AUDIO.refDistance
      p.rolloffFactor = AUDIO.rolloff
      p.maxDistance = AUDIO.maxDistance
      p.positionX.value = opts.pos[0]
      p.positionY.value = opts.pos[1]
      p.positionZ.value = opts.pos[2]
      gain.connect(p).connect(master)
    } else gain.connect(master)
    src.start()
    return { ctx, src, gain, panner }
  }

  play(id: SoundId, opts: PlayOptions = {}) {
    this.chain(id, opts, false)
  }

  /** Som contínuo. Começa em silêncio se o arquivo ainda está carregando. */
  loop(id: SoundId, opts: PlayOptions = {}): LoopHandle {
    let node = this.chain(id, opts, true)
    let volume = opts.volume ?? 1
    let rate = opts.rate ?? 1
    let pos = opts.pos
    let stopped = false
    // arquivo ainda carregando: tenta de novo daqui a pouco
    const retry = setInterval(() => {
      if (node || stopped) return clearInterval(retry)
      node = this.chain(id, { ...opts, volume, rate, pos }, true)
    }, 500)
    return {
      setVolume: (v, seconds = 0.3) => {
        volume = v
        if (node) node.gain.gain.setTargetAtTime(v, node.ctx.currentTime, seconds / 3)
      },
      setRate: (r) => {
        rate = r
        if (node) node.src.playbackRate.setTargetAtTime(r, node.ctx.currentTime, 0.1)
      },
      setPos: (p) => {
        pos = p
        const pn = node?.panner
        if (!pn || !node) return
        const t = node.ctx.currentTime
        pn.positionX.setTargetAtTime(p[0], t, 0.05)
        pn.positionY.setTargetAtTime(p[1], t, 0.05)
        pn.positionZ.setTargetAtTime(p[2], t, 0.05)
      },
      stop: () => {
        stopped = true
        clearInterval(retry)
        node?.src.stop()
      },
    }
  }

  setListener(pos: Vec3, forward: Vec3, up: Vec3) {
    const ctx = this.ctx
    if (!ctx) return
    const l = ctx.listener
    const t = ctx.currentTime
    if (l.positionX) {
      l.positionX.setTargetAtTime(pos[0], t, 0.02)
      l.positionY.setTargetAtTime(pos[1], t, 0.02)
      l.positionZ.setTargetAtTime(pos[2], t, 0.02)
      l.forwardX.setTargetAtTime(forward[0], t, 0.02)
      l.forwardY.setTargetAtTime(forward[1], t, 0.02)
      l.forwardZ.setTargetAtTime(forward[2], t, 0.02)
      l.upX.setTargetAtTime(up[0], t, 0.02)
      l.upY.setTargetAtTime(up[1], t, 0.02)
      l.upZ.setTargetAtTime(up[2], t, 0.02)
    } else {
      // Firefox antigo
      l.setPosition(...pos)
      l.setOrientation(...forward, ...up)
    }
  }

  private level() {
    return this.muted ? 0 : AUDIO.master * this.volume
  }

  toggleMute() {
    this.muted = !this.muted
    const { ctx, master } = this.context()
    master.gain.setTargetAtTime(this.level(), ctx.currentTime, 0.05)
    return this.muted
  }

  setVolume(v: number) {
    this.volume = v
    // ainda sem contexto: vale quando ele for criado
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(this.level(), this.ctx.currentTime, 0.05)
  }

  /** O navegador já liberou o áudio? */
  get running() {
    return this.ctx?.state === 'running'
  }
}

export const audio = new AudioEngine()
