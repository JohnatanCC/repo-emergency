/**
 * Quem está perseguindo o jogador com música (criaturas com `chaseMusic`).
 * A música toca enquanto houver alguém aqui (AudioDirector).
 */
const chasers = new Set<string>()

export function setChasing(id: string, on: boolean) {
  if (on) chasers.add(id)
  else chasers.delete(id)
}

export const isChased = () => chasers.size > 0
