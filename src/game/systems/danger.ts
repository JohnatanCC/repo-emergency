/**
 * Quão perto do perigo o jogador está (0 = calmo, 1 = entidade em cima).
 * As entidades (0.7.0+) escrevem aqui; o batimento cardíaco e a tensão do
 * áudio leem. Fica fora do React porque muda todo frame.
 */
export const danger = { level: 0 }

const sources = new Map<string, number>()

/** Cada entidade informa o seu perigo; vale o maior (uma não apaga a outra). */
export function setDanger(source: string, value: number) {
  if (value > 0) sources.set(source, value)
  else sources.delete(source)
  danger.level = sources.size ? Math.max(...sources.values()) : 0
}
