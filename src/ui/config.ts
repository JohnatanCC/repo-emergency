/** Números da interface. */
export const UI = {
  /** Fração da vida máxima a partir da qual a borda da tela pulsa. */
  lowHealth: 0.3,
}

/** Tela de morte por criatura (Jumpscare.tsx). Tempos em segundos, distâncias em metros. */
export const JUMPSCARE = {
  /** Rosto na tela; depois, o chiado de "sinal perdido". */
  duration: 1.3,
  static: 0.7,
  volume: 1,
  /** Resolução interna (fração da tela): mais baixa = mais pixelado. */
  dpr: 0.3,
  lungeSpeed: 9,
  shake: 0.05,
  light: 3.5,
  /** Altura dos olhos e de onde até onde a câmera avança, por criatura. */
  framing: {
    guardia: { eye: 1.88, from: 1.5, to: 0.42 },
    sombra: { eye: 1.76, from: 1.6, to: 0.36 },
    possessor: { eye: 2.0, from: 1.4, to: 0.45 },
  },
}

/** Mapa do contrato (Tab): tamanho da folha em px e o que conta como "visto" (world/MapTracker.tsx). */
export const MAP = {
  width: 560,
  height: 380,
  pad: 24,
  /** Só estes objetos aparecem no mapa. */
  tags: ['relic', 'loot', 'supply'] as string[],
  /** Viu: na frente (até este ângulo do centro da tela, em graus), até esta distância (m) e sem parede no meio. */
  seeAngle: 38,
  seeRange: 14,
  /** Checagem a cada (s). */
  seeEvery: 0.25,
}
