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

/** Ambiência da casa: ruído grave e dois tons que batem devagar. */
export const drone: Synth = (sr) =>
  variants(1, (r) => {
    const dur = 8.5
    const n = Math.floor(sr * dur)
    const x = noise(n, r)
    lowpass(x, 0.01)
    lowpass(x, 0.02)
    normalize(x)
    for (let i = 0; i < n; i++) {
      const t = i / sr
      x[i] = x[i] * 0.7 + 0.18 * Math.sin(TAU * 41 * t) + 0.12 * Math.sin(TAU * 41.5 * t) + 0.06 * Math.sin(TAU * 82.25 * t)
    }
    return normalize(seamless(x, sr), 0.5)
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

/** Guardiã: sussurro sem palavras (loop). Sílabas de ruído em duas formantes. */
export const whisper: Synth = (sr) =>
  variants(1, (r) => {
    const dur = 7
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
