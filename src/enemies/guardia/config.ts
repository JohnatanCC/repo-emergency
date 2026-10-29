/**
 * A Guardiã: a antiga dona da casa. Números de comportamento.
 * Distâncias em metros, velocidades em m/s, tempos em segundos.
 */
export const GUARDIA = {
  radius: 0.3,
  height: 2.1,
  /** kg; quanto empurra portas e itens. */
  mass: 90,

  speedPatrol: 1.3,
  speedInvestigate: 2,
  speedChase: 3,
  /** Mais rápida a cada relíquia que o jogador carrega (inventário + mãos). */
  speedPerRelic: 0.2,
  /** Quão rápido vira para onde anda (rad/s). */
  turnSpeed: 4,

  /** Visão: abertura do cone (graus) e alcance conforme a luz onde o jogador está. */
  fov: 110,
  sightLit: 15,
  sightDim: 10,
  sightDark: 6,
  /** Com a lanterna ligada ela vê de longe (a luz entrega). */
  sightFlashlight: 16,
  /** Agachado: multiplica o alcance. */
  sightCrouch: 0.6,
  /** Embaixo da mesa só é visto de muito perto. */
  sightUnderTable: 1.5,
  /** Intervalo entre checagens de visão. */
  sightEvery: 0.12,

  /** Perde o jogador de vista: vai até o último ponto visto e procura por este tempo. */
  searchTime: 6,
  searchRadius: 3,
  /** Esconderijo marcado a até esta distância do último ponto visto: vai direto nele. */
  markedReach: 5,
  /** Parada entre pontos de patrulha. */
  idleMin: 1,
  idleMax: 2.5,

  /** Ataque. */
  reach: 1.3,
  damage: 30,
  /** Depois de acertar, fica parada um tempo (chance de fugir). */
  recover: 3,
  /** Durante o recover ela recua até esta distância do jogador. */
  backOffDistance: 3.5,
  backOffSpeed: 1.2,

  /** Barulhos: só reage se estiver no alcance do barulho. */
  hearingBonus: 1,
  /** Barulho mais perto que isso é dela mesma (porta que empurrou): ignora. */
  ignoreNoiseWithin: 2.5,
  /**
   * Travada: este tempo sem se aproximar do próximo ponto. Aí ela tenta, nesta ordem:
   * 1) jogar portas próximas para longe dela, 2–3) dar um passo de lado e tentar de novo,
   * 4) desistir do destino.
   */
  stuckTime: 0.9,
  doorReach: 1.6,
  detourRadius: 1.5,
  /** Folga extra da grade de navegação longe de paredes e móveis (m). */
  navMargin: 0.1,
  /** Recalcula o caminho de perseguição a cada… */
  chaseRepath: 0.35,

  /** Intervalo entre passos arrastados (andando devagar). */
  stepEvery: 0.6,
}
