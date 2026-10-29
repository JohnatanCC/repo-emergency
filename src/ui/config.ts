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
  /** Altura da câmera, para onde ela olha (altura do rosto) e de onde até onde avança, por criatura. */
  framing: {
    guardia: { eye: 1.75, look: 1.82, from: 1.6, to: 0.62 },
    // a Sombra é mais alta que o investigador: a câmera olha para cima
    sombra: { eye: 1.6, look: 2.35, from: 2.0, to: 0.7 },
    possessor: { eye: 2.0, look: 2.15, from: 1.5, to: 0.55 },
    espectro: { eye: 1.86, look: 1.86, from: 0.75, to: 0.55 },
  },
  /**
   * O Espectro não ataca de surpresa: encara o jogador de perto, em silêncio,
   * por `stare` segundos (a câmera chega devagar de `from` a `stareTo`), e só
   * então abre a boca e avança.
   */
  stare: { espectro: 5 } as Partial<Record<'guardia' | 'sombra' | 'possessor' | 'espectro', number>>,
  stareTo: 0.58,
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
