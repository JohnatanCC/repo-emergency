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
}
