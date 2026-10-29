/**
 * Sons gerados por código (sem arquivos). Cada gerador devolve algumas
 * variações em Float32Array mono, na taxa de amostragem pedida. Para trocar
 * um som por um arquivo, veja SOUND_FILES em sounds.ts.
 */

import type { FloorType } from '../data/types'

export type Synth = (sr: number) => Float32Array[]

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

const TAU = Math.PI * 2

/** Filtro passa-baixa de um polo (0 < k < 1; menor = mais abafado). */
function lowpass(x: Float32Array, k: number) {
  let y = 0
  for (let i = 0; i < x.length; i++) x[i] = y += k * (x[i] - y)
  return x
}

/** Filtro passa-faixa (biquad RBJ). */
function bandpass(x: Float32Array, sr: number, freq: number, q: number) {
  const w = (TAU * freq) / sr
  const alpha = Math.sin(w) / (2 * q)
  const a0 = 1 + alpha
  const b0 = alpha / a0
  const b2 = -alpha / a0
  const a1 = (-2 * Math.cos(w)) / a0
  const a2 = (1 - alpha) / a0
  let x1 = 0
  let x2 = 0
  let y1 = 0
  let y2 = 0
  for (let i = 0; i < x.length; i++) {
    const y = b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2
    x2 = x1
    x1 = x[i]
    y2 = y1
    y1 = y
    x[i] = y
  }
  return x
}

function normalize(x: Float32Array, peak = 0.9) {
  let m = 0
  for (const v of x) m = Math.max(m, Math.abs(v))
  if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= peak / m
  return x
}

function noise(n: number, r: () => number) {
  const x = new Float32Array(n)
  for (let i = 0; i < n; i++) x[i] = r() * 2 - 1
  return x
}

/** Batida grave que cai de tom (passos, porta, coração). */
function thump(sr: number, dur: number, f0: number, f1: number, decay: number) {
  const n = Math.floor(sr * dur)
  const x = new Float32Array(n)
  let ph = 0
  for (let i = 0; i < n; i++) {
    const t = i / sr
    ph += (TAU * (f1 + (f0 - f1) * Math.exp(-t * 30))) / sr
    x[i] = Math.sin(ph) * Math.exp(-t * decay)
  }
  return x
}

function mix(...parts: [Float32Array, number, number?][]) {
  const len = Math.max(...parts.map(([p, , off = 0]) => p.length + off))
  const out = new Float32Array(len)
  for (const [p, g, off = 0] of parts) for (let i = 0; i < p.length; i++) out[i + off] += p[i] * g
  return out
}

const variants = (count: number, make: (r: () => number, i: number) => Float32Array) =>
  Array.from({ length: count }, (_, i) => make(rng(101 + i * 977), i))

/** Como cada piso soa: brilho do ruído, peso da batida, ressonância metálica. */
const SURFACE: Record<FloorType, { bright: number; body: number; ring?: number; noise: number }> = {
  wood: { bright: 0.18, body: 0.9, noise: 0.5 },
  checker: { bright: 0.45, body: 0.5, noise: 0.6 },
  tile: { bright: 0.55, body: 0.4, noise: 0.6 },
  carpet: { bright: 0.05, body: 0.6, noise: 0.25 },
  grass: { bright: 0.35, body: 0.2, noise: 0.8 },
  metal: { bright: 0.4, body: 0.6, ring: 520, noise: 0.5 },
}

export function footstep(floor: FloorType): Synth {
  const s = SURFACE[floor]
  return (sr) =>
    variants(4, (r) => {
      const n = Math.floor(sr * 0.18)
      const scuff = noise(n, r)
      for (let i = 0; i < n; i++) scuff[i] *= Math.exp((-i / sr) * (floor === 'grass' ? 18 : 45))
      lowpass(scuff, s.bright)
      const body = thump(sr, 0.18, 110 + r() * 30, 60 + r() * 15, 38)
      const parts: [Float32Array, number][] = [
        [normalize(scuff), s.noise],
        [body, s.body],
      ]
      if (s.ring) parts.push([thump(sr, 0.18, s.ring, s.ring, 25), 0.25])
      return normalize(mix(...parts), 0.8)
    })
}

/** Rangido de dobradiça: atrito em pulsos excitando uma ressonância. */
export const creak: Synth = (sr) =>
  variants(3, (r) => {
    const dur = 0.7 + r() * 0.4
    const n = Math.floor(sr * dur)
    const x = new Float32Array(n)
    let ph = 0
    const base = 25 + r() * 15
    const wobble = 2.5 + r()
    for (let i = 0; i < n; i++) {
      const t = i / sr
      ph += (base + 20 * Math.sin(t * wobble) + 10 * Math.sin(t * 11)) / sr
      if (ph >= 1) {
        ph -= 1
        x[i] = 1
      }
    }
    bandpass(x, sr, 700 + r() * 300, 12)
    const y = bandpass(Float32Array.from(x), sr, 1400 + r() * 300, 8)
    const out = mix([x, 1], [y, 0.5])
    for (let i = 0; i < n; i++) {
      const t = i / sr
      out[i] *= Math.min(1, t * 8) * Math.min(1, (dur - t) * 5)
    }
    return normalize(out, 0.6)
  })

export const slam: Synth = (sr) =>
  variants(2, (r) => {
    const body = thump(sr, 0.5, 90, 45, 9)
    const hit = noise(Math.floor(sr * 0.12), r)
    for (let i = 0; i < hit.length; i++) hit[i] *= Math.exp((-i / sr) * 35)
    lowpass(hit, 0.3)
    const rattle = noise(Math.floor(sr * 0.25), r)
    bandpass(rattle, sr, 1800, 3)
    for (let i = 0; i < rattle.length; i++) rattle[i] *= Math.exp((-i / sr) * 18) * (Math.sin((i / sr) * TAU * 28) > 0 ? 1 : 0.3)
    return normalize(mix([body, 1], [normalize(hit), 0.7], [normalize(rattle), 0.25, Math.floor(sr * 0.02)]))
  })

/** Objeto batendo (madeira, metal, porcelana sem quebrar). */
export const thunk: Synth = (sr) =>
  variants(3, (r) => {
    const body = thump(sr, 0.2, 260 + r() * 120, 140 + r() * 40, 30)
    const click = noise(Math.floor(sr * 0.03), r)
    for (let i = 0; i < click.length; i++) click[i] *= Math.exp((-i / sr) * 120)
    return normalize(mix([body, 1], [click, 0.4]), 0.8)
  })

/** Vidro/porcelana estilhaçando. */
export const shatter: Synth = (sr) =>
  variants(2, (r) => {
    const n = Math.floor(sr * 0.8)
    const out = new Float32Array(n)
    for (let k = 0; k < 40; k++) {
      const f = 2000 + r() * 5000
      const start = Math.floor(r() * sr * 0.25)
      const decay = 20 + r() * 40
      const amp = 0.3 + r() * 0.7
      for (let i = start; i < n; i++) {
        const t = (i - start) / sr
        out[i] += Math.sin(TAU * f * t) * Math.exp(-t * decay) * amp
      }
    }
    const burst = noise(Math.floor(sr * 0.15), r)
    for (let i = 0; i < burst.length; i++) burst[i] *= Math.exp((-i / sr) * 25)
    return normalize(mix([normalize(out), 0.7], [burst, 0.6]), 0.75)
  })

/** Pegar/guardar um item: tecido roçando. */
export const rustle: Synth = (sr) =>
  variants(2, (r) => {
    const n = Math.floor(sr * 0.22)
    const x = noise(n, r)
    bandpass(x, sr, 2500 + r() * 800, 1.2)
    for (let i = 0; i < n; i++) {
      const t = i / sr
      x[i] *= Math.sin((Math.PI * t) / 0.22) * (0.6 + 0.4 * Math.sin(t * 90))
    }
    return normalize(x, 0.4)
  })

/** Botão da lanterna. */
export const click: Synth = (sr) =>
  variants(1, (r) => {
    const x = noise(Math.floor(sr * 0.03), r)
    for (let i = 0; i < x.length; i++) x[i] *= Math.exp((-i / sr) * 300)
    return normalize(mix([x, 0.6], [thump(sr, 0.03, 3200, 2800, 200), 0.6]), 0.5)
  })

/** Loop sem emenda: a cauda é misturada com o começo. */
function seamless(x: Float32Array, sr: number, fade = 0.5) {
  const f = Math.floor(sr * fade)
  const out = x.slice(0, x.length - f)
  for (let i = 0; i < f; i++) {
    const a = i / f
    out[i] = out[i] * Math.sqrt(a) + x[x.length - f + i] * Math.sqrt(1 - a)
  }
  return out
}

/**
 * Ambiência da casa (loop de 16 s): respiração grave da estrutura, dois tons
 * que batem devagar e, de tempos em tempos, uma ressonância metálica que incha
 * e some, como um cano vibrando longe.
 */
export const drone: Synth = (sr) =>
  variants(1, (r) => {
    const dur = 16
    const n = Math.floor(sr * dur)
    const room = noise(n, r)
    lowpass(room, 0.008)
    lowpass(room, 0.02)
    normalize(room)
    const ring = bandpass(noise(n, r), sr, 182, 40)
    normalize(ring)
    const air = bandpass(noise(n, r), sr, 900, 2)
    normalize(air)
    const x = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const t = i / sr
      // ciclos inteiros em 16 s: emenda sem estalo
      const breath = 0.55 + 0.45 * Math.sin((TAU * t) / 8 - 1)
      const swell = Math.max(0, Math.sin((TAU * t) / 16)) ** 6
      x[i] =
        room[i] * 0.6 * breath +
        0.16 * Math.sin(TAU * 36 * t) +
        0.12 * Math.sin(TAU * 36.5 * t) +
        0.05 * Math.sin(TAU * 54.25 * t) +
        ring[i] * 0.35 * swell +
        air[i] * 0.05 * breath
    }
    return normalize(seamless(x, sr), 0.5)
  })

/** Batidas secas numa parede ou porta, com espaços irregulares. */
export const knock: Synth = (sr) =>
  variants(3, (r) => {
    const parts: [Float32Array, number, number][] = []
    let t = 0.05
    const count = 2 + Math.floor(r() * 3)
    for (let k = 0; k < count; k++) {
      const click = noise(Math.floor(sr * 0.04), r)
      bandpass(click, sr, 900 + r() * 400, 2)
      for (let i = 0; i < click.length; i++) click[i] *= Math.exp((-i / sr) * 90)
      const off = Math.floor(t * sr)
      parts.push([thump(sr, 0.3, 160, 80, 28), 1, off], [normalize(click), 0.5, off])
      t += k === count - 2 ? 0.55 + r() * 0.4 : 0.2 + r() * 0.12
    }
    return normalize(mix(...parts), 0.9)
  })

/** Caixinha de música distante e desafinada: uma frase lenta em modo menor. */
export const musicbox: Synth = (sr) =>
  variants(2, (r) => {
    const scale = [0, 2, 3, 7, 8, 12, 14, 15]
    const dur = 5.5
    const n = Math.floor(sr * dur)
    const x = new Float32Array(n)
    let t = 0.1
    const base = 660 + r() * 60
    while (t < dur - 1.2) {
      const note = scale[Math.floor(r() * scale.length)]
      const f = base * Math.pow(2, note / 12)
      const s0 = Math.floor(t * sr)
      const len = Math.floor(sr * 1.4)
      for (let i = 0; i < len && s0 + i < n; i++) {
        const tt = i / sr
        // corda gasta: o tom escorrega para baixo ao longo da frase
        const warble = 1 - 0.035 * (t / dur) + 0.004 * Math.sin(TAU * 5 * tt)
        const env = Math.exp(-tt * 3.5)
        x[s0 + i] += (Math.sin(TAU * f * warble * tt) + 0.3 * Math.sin(TAU * f * 2.01 * warble * tt)) * env
      }
      t += 0.32 + r() * 0.45
    }
    // eco de sala
    const d = Math.floor(sr * 0.23)
    for (let i = d; i < n; i++) x[i] += x[i - d] * 0.35
    return normalize(x, 0.6)
  })

/** Algo pesado sendo arrastado (um móvel em outra sala). */
export const scrape: Synth = (sr) =>
  variants(2, (r) => {
    const dur = 1.4 + r() * 0.8
    const n = Math.floor(sr * dur)
    const out = new Float32Array(n)
    const src = noise(n, r)
    const step = Math.floor(sr * 0.04)
    for (let s0 = 0; s0 < n; s0 += step) {
      const t = s0 / sr
      out.set(bandpass(src.slice(s0, s0 + step), sr, 260 + 160 * Math.sin(t * 5) + r() * 60, 6), s0)
    }
    for (let i = 0; i < n; i++) {
      const t = i / sr
      // trepida: agarra e solta
      out[i] *= Math.sin((Math.PI * t) / dur) * (Math.sin(t * 38) > 0 ? 1 : 0.4)
    }
    return normalize(out, 0.7)
  })

/** Gemido grave sem palavras, com o tom caindo. */
export const moan: Synth = (sr) =>
  variants(2, (r) => {
    const dur = 2.6
    const n = Math.floor(sr * dur)
    const voice = new Float32Array(n)
    let ph = 0
    const f0 = 105 + r() * 25
    for (let i = 0; i < n; i++) {
      const t = i / sr
      ph += (f0 * (1 - 0.22 * (t / dur)) * (1 + 0.012 * Math.sin(TAU * 4.5 * t))) / sr
      voice[i] = (ph % 1) * 2 - 1
    }
    // vogal fechada: duas formantes
    const a = bandpass(Float32Array.from(voice), sr, 420, 6)
    const b = bandpass(Float32Array.from(voice), sr, 780, 8)
    const breath = bandpass(noise(n, r), sr, 1400, 1.2)
    const out = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const t = i / sr
      const env = Math.min(1, t * 2.5) * Math.min(1, (dur - t) * 1.5)
      out[i] = (a[i] + b[i] * 0.6 * (1 - t / dur) + breath[i] * 0.04) * env
    }
    return normalize(out, 0.7)
  })

/** Acorde de cordas raspadas e dissonantes: entra quando uma criatura começa a caçar. */
export const stinger: Synth = (sr) =>
  variants(2, (r) => {
    const dur = 1.8
    const n = Math.floor(sr * dur)
    const x = new Float32Array(n)
    const freqs = [220, 233, 311, 466, 494].map((f) => f * (1 + (r() - 0.5) * 0.01))
    const ph = freqs.map(() => r())
    for (let i = 0; i < n; i++) {
      const t = i / sr
      const env = Math.min(1, t * 25) * Math.exp(-t * 1.3)
      let v = 0
      freqs.forEach((f, k) => {
        ph[k] += (f * (1 + 0.006 * Math.sin(TAU * (5 + k) * t))) / sr
        v += (ph[k] % 1) * 2 - 1
      })
      x[i] = v * env
    }
    // arco raspando: ruído na faixa das cordas
    const bow = bandpass(noise(n, r), sr, 1600, 3)
    for (let i = 0; i < n; i++) bow[i] *= Math.min(1, (i / sr) * 25) * Math.exp((-i / sr) * 2)
    lowpass(x, 0.25)
    return normalize(mix([normalize(x), 0.8], [normalize(bow), 0.35]), 0.85)
  })

/** Renascer: uma parte do corpo encaixando (estalo úmido e osso). */
export const assemble: Synth = (sr) =>
  variants(3, (r) => {
    const crack = noise(Math.floor(sr * 0.08), r)
    bandpass(crack, sr, 2200 + r() * 1200, 1.5)
    for (let i = 0; i < crack.length; i++) crack[i] *= Math.exp((-i / sr) * 60)
    const wet = noise(Math.floor(sr * 0.25), r)
    lowpass(wet, 0.05)
    for (let i = 0; i < wet.length; i++) wet[i] *= Math.sin((Math.PI * i) / wet.length) ** 2
    return normalize(mix([normalize(crack), 0.8], [normalize(wet), 0.5, Math.floor(sr * 0.02)], [thump(sr, 0.2, 130, 70, 25), 0.6]), 0.8)
  })

/** Renascer: sopro ao contrário que sobe até um acorde e corta. */
export const revive: Synth = (sr) =>
  variants(1, (r) => {
    const dur = 3.4
    const n = Math.floor(sr * dur)
    const air = noise(n, r)
    const out = new Float32Array(n)
    const step = Math.floor(sr * 0.05)
    for (let s0 = 0; s0 < n; s0 += step) {
      const t = s0 / sr
      out.set(bandpass(air.slice(s0, s0 + step), sr, 200 + 2600 * (t / dur) ** 2, 3), s0)
    }
    for (let i = 0; i < n; i++) {
      const t = i / sr
      const rise = (t / dur) ** 2.5
      const cut = t > dur - 0.08 ? (dur - t) / 0.08 : 1
      const chord = Math.sin(TAU * 110 * t) + 0.6 * Math.sin(TAU * 164.8 * t) + 0.4 * Math.sin(TAU * 220.5 * t)
      out[i] = (out[i] * 0.7 + chord * 0.15) * rise * cut
    }
    return normalize(out, 0.8)
  })

/** Zumbido do extrator (loop). */
export const hum: Synth = (sr) =>
  variants(1, () => {
    const n = Math.floor(sr * 2)
    const x = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const t = i / sr
      const trem = 0.75 + 0.25 * Math.sin(TAU * 3 * t)
      x[i] = (Math.sin(TAU * 110 * t) * 0.5 + Math.sin(TAU * 165 * t) * 0.3 + Math.sin(TAU * 220 * t) * 0.2) * trem
    }
    return normalize(x, 0.5)
  })

/** Extrator carregando: tom subindo por 5 s. */
export const charge: Synth = (sr) =>
  variants(1, () => {
    const dur = 5
    const n = Math.floor(sr * dur)
    const x = new Float32Array(n)
    let ph = 0
    let ph2 = 0
    for (let i = 0; i < n; i++) {
      const t = i / sr
      const f = 180 * Math.pow(4, t / dur)
      ph += (TAU * f) / sr
      ph2 += (TAU * f * 1.5) / sr
      x[i] = (Math.sin(ph) * 0.6 + Math.sin(ph2) * 0.3) * Math.min(1, t * 2) * (0.7 + 0.3 * Math.sin(TAU * (4 + t * 3) * t))
    }
    return normalize(x, 0.6)
  })

/** Extração: sopro que desce + estrondo. */
export const whoosh: Synth = (sr) =>
  variants(1, (r) => {
    const dur = 1.6
    const n = Math.floor(sr * dur)
    const x = noise(n, r)
    const out = new Float32Array(n)
    const step = Math.floor(sr * 0.05)
    for (let s = 0; s < n; s += step) {
      const t = s / sr
      const seg = bandpass(x.slice(s, s + step), sr, 3000 * Math.exp(-t * 2.5) + 150, 2)
      out.set(seg, s)
    }
    for (let i = 0; i < n; i++) out[i] *= Math.exp((-i / sr) * 2.2)
    return normalize(mix([normalize(out), 0.8], [thump(sr, 1.2, 70, 35, 3), 0.9]))
  })

/** Batimento: tum-tum. */
export const heartbeat: Synth = (sr) =>
  variants(1, () => normalize(mix([thump(sr, 0.25, 70, 45, 22), 1], [thump(sr, 0.25, 65, 42, 26), 0.75, Math.floor(sr * 0.26)]), 0.9))

/** Vento em rajadas (loop). `indoor` = abafado pelas paredes. */
export function wind(indoor: boolean): Synth {
  return (sr) =>
    variants(1, (r) => {
      const dur = 12.5
      const n = Math.floor(sr * dur)
      const x = noise(n, r)
      lowpass(x, indoor ? 0.012 : 0.06)
      if (indoor) lowpass(x, 0.03)
      normalize(x)
      // assobio: faixa estreita que sobe e desce com as rajadas
      const whistle = bandpass(noise(n, r), sr, indoor ? 260 : 700, indoor ? 4 : 9)
      normalize(whistle)
      for (let i = 0; i < n; i++) {
        const t = i / sr
        // ciclos inteiros em 12 s: emenda sem estalo
        const gust = 0.45 + 0.3 * Math.sin((TAU * t) / 12) + 0.15 * Math.sin((TAU * 3 * t) / 12 + 1) + 0.1 * Math.sin((TAU * 7 * t) / 12)
        x[i] = (x[i] * 0.85 + whistle[i] * (indoor ? 0.1 : 0.25) * gust) * gust
      }
      return normalize(seamless(x, sr), indoor ? 0.35 : 0.6)
    })
}

/** Grilos: vários, cada um com seu tom e ritmo (loop). */
export const crickets: Synth = (sr) =>
  variants(1, (r) => {
    const dur = 6
    const n = Math.floor(sr * dur)
    const x = new Float32Array(n)
    for (let v = 0; v < 4; v++) {
      const f = 4000 + r() * 1200
      const gap = 0.45 + r() * 0.5
      const gain = 0.4 + r() * 0.6
      for (let start = r() * gap; start < dur - 0.2; start += gap * (0.85 + r() * 0.3)) {
        // um cri = 3 pulsos rápidos
        for (let p = 0; p < 3; p++) {
          const s0 = Math.floor((start + p * 0.028) * sr)
          for (let i = 0; i < sr * 0.016 && s0 + i < n; i++) {
            const t = i / sr
            x[s0 + i] += Math.sin(TAU * f * t) * Math.sin((Math.PI * t) / 0.016) * gain
          }
        }
      }
    }
    return normalize(x, 0.5)
  })

/** Gota caindo na água. */
export const drip: Synth = (sr) =>
  variants(3, (r) => {
    const n = Math.floor(sr * 0.25)
    const x = new Float32Array(n)
    const f0 = 1400 + r() * 900
    let ph = 0
    for (let i = 0; i < n; i++) {
      const t = i / sr
      ph += (TAU * f0 * (0.55 + 0.45 * Math.exp(-t * 40))) / sr
      x[i] = Math.sin(ph) * Math.exp(-t * 28)
    }
    return normalize(x, 0.6)
  })

/** Relógio de pêndulo: tic (0 s) e tac (1 s), loop de 2 s. */
export const tick: Synth = (sr) =>
  variants(1, (r) => {
    const n = Math.floor(sr * 2)
    const x = new Float32Array(n)
    for (const [at, f] of [
      [0, 2300],
      [1, 1800],
    ]) {
      const c = noise(Math.floor(sr * 0.04), r)
      bandpass(c, sr, f, 6)
      for (let i = 0; i < c.length; i++) x[Math.floor(at * sr) + i] += c[i] * Math.exp((-i / sr) * 90)
    }
    return normalize(x, 0.5)
  })

/** Trovão distante: estalo e ronco que vai sumindo. */
export const thunder: Synth = (sr) =>
  variants(2, (r) => {
    const dur = 6
    const n = Math.floor(sr * dur)
    const x = noise(n, r)
    lowpass(x, 0.015)
    lowpass(x, 0.03)
    normalize(x)
    const crack = noise(Math.floor(sr * 0.4), r)
    lowpass(crack, 0.2)
    for (let i = 0; i < n; i++) {
      const t = i / sr
      const roll = Math.min(1, t * 6) * Math.exp(-t * 0.7) * (0.7 + 0.3 * Math.sin(TAU * 1.3 * t))
      x[i] *= roll
      if (i < crack.length) x[i] += crack[i] * Math.exp(-t * 9) * 0.4
    }
    return normalize(x, 0.9)
  })

/** Guardiã: pé arrastando no chão. */
export const shuffle: Synth = (sr) =>
  variants(3, (r) => {
    const dur = 0.45
    const n = Math.floor(sr * dur)
    const x = noise(n, r)
    lowpass(x, 0.12)
    for (let i = 0; i < n; i++) {
      const t = i / sr
      // sobe devagar (arrasto) e corta
      x[i] *= Math.sin((Math.PI * t) / dur) ** 2 * (0.7 + 0.3 * Math.sin(t * 60 + r()))
    }
    return normalize(mix([x, 1], [thump(sr, 0.15, 90, 60, 30), 0.3, Math.floor(sr * 0.25)]), 0.6)
  })

/** Sussurro sem palavras: sílabas de ruído em duas formantes. */
const whispers =
  (dur: number, count: number): Synth =>
  (sr) =>
    variants(count, (r) => {
      const n = Math.floor(sr * dur)
      const out = new Float32Array(n)
      let t = 0.2
      while (t < dur - 0.6) {
        const len = 0.12 + r() * 0.22
        const s0 = Math.floor(t * sr)
        const m = Math.floor(len * sr)
        const a = noise(m, r)
        const b = Float32Array.from(a)
        bandpass(a, sr, 500 + r() * 400, 5)
        bandpass(b, sr, 1500 + r() * 900, 6)
        const hiss = noise(m, r)
        bandpass(hiss, sr, 5000, 1.5)
        for (let i = 0; i < m; i++) {
          const env = Math.sin((Math.PI * i) / m) ** 1.5
          out[s0 + i] += (a[i] * 0.9 + b[i] * 0.7 + hiss[i] * 0.25) * env
        }
        // pausas entre "palavras"
        t += len + (r() < 0.25 ? 0.5 + r() * 0.8 : 0.03 + r() * 0.08)
      }
      return normalize(out, 0.5)
    })

/** Guardiã: sussurro contínuo (loop). */
export const whisper = whispers(7, 1)

/** Possessor: murmúrio curto vindo do objeto. */
export const murmur = whispers(1.8, 3)

/** Guardiã: grito ao ver o jogador. */
export const shriek: Synth = (sr) =>
  variants(2, (r) => {
    const dur = 1.3
    const n = Math.floor(sr * dur)
    const x = new Float32Array(n)
    let ph = 0
    let ph2 = 0
    const base = 650 + r() * 150
    for (let i = 0; i < n; i++) {
      const t = i / sr
      const f = base * (1 + 0.6 * Math.min(1, t * 4)) * (1 + 0.04 * Math.sin(TAU * 7 * t))
      ph += (TAU * f) / sr
      ph2 += (TAU * f * 1.5 + 30) / sr
      const env = Math.min(1, t * 12) * Math.exp(-t * 1.6)
      x[i] = (Math.sin(ph) + 0.5 * Math.sin(ph2) + 0.3 * Math.sign(Math.sin(ph * 2))) * env
    }
    const rasp = noise(n, r)
    bandpass(rasp, sr, 2500, 2)
    for (let i = 0; i < n; i++) rasp[i] *= Math.min(1, (i / sr) * 12) * Math.exp((-i / sr) * 1.6)
    return normalize(mix([normalize(x), 0.8], [normalize(rasp), 0.4]), 0.85)
  })

/** Guardiã: golpe. */
export const hit: Synth = (sr) =>
  variants(2, (r) => {
    const swish = noise(Math.floor(sr * 0.2), r)
    bandpass(swish, sr, 1800, 1)
    for (let i = 0; i < swish.length; i++) swish[i] *= Math.sin((Math.PI * i) / swish.length) ** 2
    return normalize(mix([normalize(swish), 0.5], [thump(sr, 0.4, 120, 50, 12), 1, Math.floor(sr * 0.15)]))
  })

/** Sombra: respiração chiada (loop), só toca quando ela se move. */
export const hiss: Synth = (sr) =>
  variants(1, (r) => {
    const dur = 4
    const n = Math.floor(sr * dur)
    const air = noise(n, r)
    bandpass(air, sr, 1800, 1.2)
    normalize(air)
    const low = noise(n, r)
    lowpass(low, 0.01)
    normalize(low)
    for (let i = 0; i < n; i++) {
      const t = i / sr
      // inspira (2 s) e expira (2 s), ciclos inteiros: emenda sem estalo
      const breath = Math.abs(Math.sin((Math.PI * t) / 2)) ** 1.5
      air[i] = air[i] * breath * 0.8 + low[i] * 0.35
    }
    return normalize(air, 0.5)
  })

/** Jumpscare: estouro agudo e dissonante sobre um baque grave. */
export const scare: Synth = (sr) =>
  variants(1, (r) => {
    const n = Math.floor(sr * 1.6)
    const stab = new Float32Array(n)
    // acorde de serras desafinadas, caindo de tom
    const freqs = [311, 329, 466, 988, 1047]
    const ph = freqs.map(() => 0)
    for (let i = 0; i < n; i++) {
      const t = i / sr
      const env = Math.min(1, t * 80) * Math.exp(-t * 2.2)
      let v = 0
      freqs.forEach((f, k) => {
        ph[k] += (f * (1 - 0.18 * Math.min(1, t)) * (1 + 0.01 * Math.sin(TAU * 11 * t + k))) / sr
        v += (ph[k] % 1) * 2 - 1
      })
      stab[i] = v * env
    }
    const burst = noise(n, r)
    bandpass(burst, sr, 3200, 0.8)
    for (let i = 0; i < n; i++) burst[i] *= Math.min(1, (i / sr) * 100) * Math.exp((-i / sr) * 4)
    return normalize(mix([normalize(stab), 0.7], [normalize(burst), 0.5], [thump(sr, 1.2, 90, 32, 3), 0.9]), 0.95)
  })

/** Respiração do investigador (loop de 3 s: inspira e expira duas vezes), pela boca, ofegante. */
export const breath: Synth = (sr) =>
  variants(1, (r) => {
    const dur = 3
    const n = Math.floor(sr * dur)
    const air = bandpass(noise(n, r), sr, 1100, 1.4)
    const low = bandpass(noise(n, r), sr, 380, 2)
    normalize(air)
    normalize(low)
    const out = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const t = i / sr
      // ciclo de 1,5 s: inspira curto (mais agudo), expira mais longo e grave
      const c = (t % 1.5) / 1.5
      const inhale = c < 0.35 ? Math.sin((Math.PI * c) / 0.35) : 0
      const exhale = c >= 0.4 && c < 0.95 ? Math.sin((Math.PI * (c - 0.4)) / 0.55) : 0
      out[i] = air[i] * inhale * 0.7 + (air[i] * 0.4 + low[i] * 0.6) * exhale
    }
    return normalize(out, 0.6)
  })
