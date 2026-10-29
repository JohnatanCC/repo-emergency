/**
 * O Espectro: vaga devagar atravessando paredes; perto demais, percebe o
 * jogador e persegue até matar. Distâncias em metros, velocidades em m/s,
 * tempos em segundos.
 */
export const ESPECTRO = {
  /** Flutua a esta altura acima do chão. */
  hover: 0.32,
  /** Vagando: velocidade e parada entre um ponto e outro. */
  speedWander: 0.65,
  idleMin: 2,
  idleMax: 5,
  /** Jogador mais perto que isso (mesmo atrás de parede): ela percebe. */
  noticeRadius: 4.5,
  /** Ao perceber: para, vira e abre a boca por este tempo antes de ir atrás. */
  noticeTime: 1.3,
  /** Perseguindo: começa nesta velocidade e acelera até `chaseMax` (andar = 3; correr = 5,5). */
  chaseSpeed: 3.2,
  chaseAccel: 0.12,
  chaseMax: 4.6,
  /** A boca começa a abrir a esta distância e está toda aberta ao alcançar. */
  mouthFrom: 6,
  /** Alcançou: mata (não adianta se esconder). */
  catchRadius: 0.85,
  damage: 100,
  /** Jogador saiu da casa: ela fica encarando da beira por este tempo e volta a vagar. */
  waitOutside: 8,
  /** Depois de matar, reaparece longe e calma. */
  respawnMinDist: 14,
  /** Volta da perseguição: vira aos poucos (rad/s). */
  turnSpeed: 5,
}
