/**
 * O que o mapa do contrato (Tab) sabe, fora do React: os objetos que o
 * investigador já viu nesta partida e para onde ele olha.
 */
export const mapInfo = {
  seen: new Set<string>(),
  /** Partida a que `seen` pertence (troca = mapa limpo). */
  matchId: -1,
  /** Direção do olhar, no plano (rad; 0 = +z do mundo). */
  yaw: 0,
}
