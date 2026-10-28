/**
 * Quão perto do perigo o jogador está (0 = calmo, 1 = entidade em cima).
 * As entidades (0.7.0+) escrevem aqui; o batimento cardíaco e a tensão do
 * áudio leem. Fica fora do React porque muda todo frame.
 */
export const danger = { level: 0 }
