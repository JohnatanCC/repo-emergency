/**
 * A COISA: surge onde o investigador morreu, segurando a cabeça dele.
 * Pacífica: só foge. Distâncias em metros, velocidades em m/s, tempos em segundos.
 */
export const COISA = {
  radius: 0.25,
  height: 1.3,
  mass: 30,

  /** Começa a fugir quando o jogador chega a esta distância. */
  fleeRadius: 7,
  /** Foge mais rápido que o jogador andando (3 m/s)… */
  speedFlee: 3.4,
  /** …e mais devagar que ele correndo (5,5 m/s): dá para alcançar gastando estamina. */
  speedFleeRun: 4.8,
  /** Velocidade do jogador (m/s) a partir da qual ela considera que ele está correndo. */
  playerRunning: 4,
  /** Rondando perto de onde nasceu. */
  speedWander: 0.8,
  wanderRadius: 2.5,
  /** Para onde fugir: sorteia pontos até esta distância e fica com o mais longe do jogador. */
  fleeSearch: 9,
  fleeCandidates: 14,
  repath: 0.5,

  /** Fugindo, sussurra alto de tempos em tempos: faz barulho que atrai as outras criaturas. */
  callEvery: 2.5,
  callNoise: 10,

  /** Encostar: ela solta a cabeça. */
  catchRadius: 1,

  /** Destravamento (walker.ts). */
  stuckTime: 0.9,
  doorReach: 1.6,
  detourRadius: 1.5,
  navMargin: 0.1,
}
