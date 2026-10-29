/** Números do fluxo do nível. */
export const EXTRACTION = {
  /** Segundos entre cumprir a meta e o extrator levar tudo. */
  chargeSeconds: 5,
  /** Luz roxa do extrator: parado / carregando (pulsa) / clarão ao extrair. */
  lightIdle: 3,
  lightCharging: 12,
  lightFlash: 60,
  flashSeconds: 0.6,
}

/**
 * Iluminação geral. A luz de fundo (céu azulado em cima, chão escuro embaixo)
 * garante que nunca fique preto total, mesmo sem lanterna: dá para ver os
 * contornos. As lâmpadas das salas são multiplicadas por `lampScale`.
 */
export const LIGHTING = {
  /** Luz de fundo normal / no apagão. */
  fill: 1.4,
  fillBlackout: 0.9,
  fillSky: '#5a6690',
  fillGround: '#1c1814',
  /** Multiplicador das lâmpadas (1 = valores originais de RoomLights). */
  lampScale: 0.62,
  /** Quantas lâmpadas viram luz de verdade ao mesmo tempo (as mais perto da câmera). */
  pool: 6,
  /** Segundos para uma luz do pool acender ao trocar de lâmpada. */
  poolFade: 0.4,
}

/** Filtro retrô (RetroEffects). */
export const RETRO_FX = {
  /** Deslocamento do vermelho/azul, como fita VHS gasta. */
  chroma: 0.0012,
  /** Linhas de varredura: densidade e força. */
  scanDensity: 1.4,
  scanOpacity: 0.18,
  /** Textura que entorta com a câmera (mapeamento afim do PS1) nas paredes e pisos. */
  affine: true,
  /** Tamanho dos pedaços (m) em que paredes e pisos são divididos: menor = entorta menos. */
  affineCell: 1.2,
}

/** Decoração gerada a partir da planta (world/Decor.tsx). Distâncias em metros. */
export const DECOR = {
  /** Folga de cada lado das portas sem nada pendurado. */
  doorClearance: 0.35,
  /** Um quadro ou arandela a cada tantos metros de parede livre. */
  wallItemEvery: 2.2,
  paintingChance: 0.45,
  sconceChance: 0.3,
  /** Manchas por metro de parede (salas escuras e banheiros têm mais). */
  stains: 0.12,
  stainsDark: 0.35,
  webChance: 0.3,
  webChanceDark: 0.8,
  rugChance: 0.7,
  /** Papéis no chão por m². */
  papers: 0.03,
  papersDark: 0.08,
  beamEvery: 2.6,
  /** Salas maiores que isso (m²) ganham lustre. */
  chandelierArea: 35,
  grassPerM2: 0.6,
  grassMax: 220,
}

/** Névoa (world/Exterior.tsx): dentro da casa e do lado de fora (densa, esconde a barreira). */
export const FOG = {
  inside: { color: '#050403', near: 18, far: 60 },
  outside: { color: '#181b20', near: 2.5, far: 17 },
  /** Velocidade da troca ao entrar/sair. */
  blend: 1.5,
  /** Placas de névoa rasteira no jardim. */
  mistPatches: 70,
  mistOpacity: 0.09,
}
