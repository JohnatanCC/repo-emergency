import type { FloorType } from '../game/data/types'

/**
 * Números do investigador. Ajuste aqui, sem mexer na lógica do Player.
 * Distâncias em metros, velocidades em m/s.
 */
export const PLAYER = {
  radius: 0.25,
  /** kg; quanto o corpo empurra portas e itens ao encostar. */
  mass: 70,
  /** Altura total em pé / agachado. O tampo das mesas fica a 0.72 m: agachado precisa caber embaixo. */
  standHeight: 1.7,
  crouchHeight: 0.65,
  /** Altura dos olhos acima dos pés. */
  standEye: 1.6,
  crouchEye: 0.5,

  walkSpeed: 3,
  runSpeed: 5.5,
  crouchSpeed: 1.5,
  /** Quanto mais alto, mais rápido acelera e freia. */
  acceleration: 12,
  gravity: 9.81,

  maxHealth: 100,
  /** Depois de um golpe de criatura, fica imune a outro por este tempo (s). */
  hitGrace: 1.5,
  /** Sem tomar dano por este tempo (s), a vida volta devagar até `regenCap`. */
  regenDelay: 8,
  regenPerSec: 2.5,
  regenCap: 70,
  maxStamina: 100,
  /** Correr gasta por segundo. */
  staminaDrain: 20,
  /** Recupera por segundo, depois de `staminaRegenDelay` segundos sem correr. */
  staminaRegen: 15,
  staminaRegenDelay: 1,
  /** Se a estamina zerar, só volta a correr depois de recuperar até aqui. */
  staminaRecover: 30,

  /** Balanço da câmera (amplitude em m). */
  bobWalk: 0.035,
  bobRun: 0.06,
  bobCrouch: 0.02,
  bobFrequency: 2.4,

  /** Alcance da mira para usar portas e itens. */
  interactRange: 2.2,

  /** Barulho de cada passo (raio em metros, antes do piso). */
  stepNoiseCrouch: 1.5,
  stepNoiseWalk: 6,
  stepNoiseRun: 12,
  /** Volume do passo por andar (0–1). */
  stepVolumeCrouch: 0.3,
  stepVolumeWalk: 0.65,
  stepVolumeRun: 1,
}

/** Quanto cada piso espalha o barulho dos passos. */
export const FLOOR_NOISE: Record<FloorType, number> = {
  carpet: 0.6,
  grass: 0.7,
  wood: 1,
  checker: 1,
  tile: 1.1,
  metal: 1.3,
}

/** Lanterna de mão (tecla F, começa ligada). Luz forte e estreita, com sombras. */
export const FLASHLIGHT = {
  intensity: 70,
  distance: 30,
  decay: 1.4,
  /** Abertura do cone em radianos (~24°). */
  angle: 0.42,
  penumbra: 0.45,
  color: '#fff1d6',
  /** Posição na mão, relativa à câmera (direita, baixo). */
  offset: [0.18, -0.2, 0] as [number, number, number],
  /** Atraso ao virar (maior = acompanha mais rápido). */
  follow: 18,
  /** Luz fraca em volta, para ver o que está bem perto. */
  spill: 0.5,
  shadowMapSize: 1024,

  /** Bateria (0–100): ligada gasta isto por segundo (~4 min de luz). */
  drainPerSec: 100 / 240,
  /** Com o feixe em cima da Sombra gasta este tanto de vezes mais rápido. */
  shadowDrain: 4,
  /** Recarga por segundo dentro do carro. */
  rechargePerSec: 25,
  /** Abaixo disto a luz enfraquece e pisca. */
  lowAt: 25,
}

/** Vidas por nível. Morrer custa uma; A COISA guarda a cabeça no local da morte (0.10.0). */
export const LIVES = 3

/** Renascimento no carro (world/Revive.tsx). Tempos em segundos, distâncias em metros, ângulos em radianos. */
export const REVIVE = {
  /** Intervalo entre uma parte e a próxima, e quanto cada uma leva para encaixar. */
  partGap: 0.3,
  partTime: 0.5,
  /** Quão longe as partes começam. */
  scatter: 0.9,
  /** Câmera girando em volta: raio, altura e ângulo (0 = de frente para o corpo). */
  radius: 1.7,
  heightFrom: 0.9,
  heightTo: 1.75,
  orbitFrom: 0.9,
  orbitTo: 2.6,
  /** Pausa com o corpo pronto e tempo da câmera entrando nos olhos. */
  hold: 0.35,
  enter: 0.8,
  light: 6,
  volume: 0.8,
}

/** Imersão (Flashlight.tsx, Immersion.tsx). Ângulos em radianos. */
export const IMMERSION = {
  /** Balanço da lanterna na mão. */
  handSway: 0.006,
  /** A partir deste perigo (0–1) a lanterna começa a falhar. */
  flickerFrom: 0.45,
  /** Poeira do ambiente (world/Dust.tsx): quantas, tamanho da caixa em volta do jogador (m), tamanho do grão. */
  dustCount: 700,
  dustBox: [9, 3, 9] as [number, number, number],
  dustSize: 0.026,
  /** Brilho no escuro (quase nada) e dentro do facho. */
  dustBase: 0.04,
  dustBeam: 0.32,
  /** Campo de visão: normal, a mais correndo, a menos com perigo máximo (graus). */
  fov: 60,
  fovRun: 4,
  fovDanger: 8,
  /** Inclinação da câmera ao andar de lado (rad por m/s). */
  strafeRoll: 0.012,
}
