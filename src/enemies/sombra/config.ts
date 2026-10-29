/**
 * A Sombra: vive nas salas escuras e só se move fora do feixe da lanterna.
 * Distâncias em metros, velocidades em m/s, tempos em segundos.
 */
export const SOMBRA = {
  radius: 0.3,
  height: 1.9,
  /** kg; quanto empurra portas e itens. */
  mass: 70,

  /** Indo atrás do jogador dentro do território (média: anda em arrancadas, ver `burst`). */
  speedHunt: 3.4,
  /** Caçando, a velocidade oscila entre `min` e `max` × speedHunt (para, dispara, para…). */
  burst: { min: 0.55, max: 1.5, speed: 2.6 },
  /** Perto de porta (m): se curva para passar. */
  duckDoor: 1.6,
  /** Esperando na beira da escuridão (jogador numa sala clara). */
  speedLurk: 2.5,
  /** Vagando (jogador longe ou escondido). */
  speedWander: 1.3,
  /** Jogador a até isto da beira do território: ela vai esperar ali. */
  lurkReach: 12,
  repath: 0.4,
  turnSpeed: 6,

  /** O feixe congela a Sombra se ela estiver no cone (× ângulo da lanterna) e até esta distância. */
  beamCone: 1.15,
  beamRange: 24,

  /** Encostar nela (ou ela em você). */
  touch: 0.85,
  damage: 35,
  /** Depois de acertar some por este tempo e reaparece longe. */
  vanishTime: 5,
  reappearMinDist: 12,

  /** Parada entre pontos ao vagar. */
  idleMin: 1,
  idleMax: 3,

  /** Destravamento (walker.ts). */
  stuckTime: 0.9,
  doorReach: 1.6,
  detourRadius: 1.5,
  navMargin: 0.1,
}
