/**
 * O Possessor: mora num objeto de saque. Números de comportamento.
 * Distâncias em metros, velocidades em m/s, tempos em segundos.
 */
export const POSSESSOR = {
  /** Carregando o objeto: um murmúrio a cada… (faz barulho e atrai a Guardiã). */
  whisperEvery: 7,
  /** O primeiro murmúrio vem mais cedo, para o jogador perceber. */
  firstWhisper: 4,
  whisperNoise: 9,
  /** Vida drenada por segundo enquanto carrega; nunca abaixo de `minHealth` (o objeto sozinho não mata). */
  drainPerSec: 1.2,
  minHealth: 15,

  /** Liberto (objeto largado): persegue por este tempo e depois volta para o objeto. */
  chaseTime: 15,
  /** Um pouco mais devagar que o jogador andando (3 m/s): andando você se afasta devagar; correndo, foge. */
  speed: 2.6,
  radius: 0.3,
  height: 1.7,
  /** Flutua um pouco acima do chão. */
  hover: 0.35,
  touch: 0.8,
  damage: 25,
  hitCooldown: 2,
  /** Depois de acertar, fica parada este tempo. */
  hitPause: 1,
  repath: 0.4,

  /** Multa do C.R.O.S por extrair o objeto possuído. */
  penalty: 300,

  /** Destravamento (walker.ts). */
  stuckTime: 0.9,
  doorReach: 1.6,
  detourRadius: 1.5,
}
