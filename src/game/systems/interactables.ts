/**
 * Coisas que a mira do jogador pode usar (portas agora, itens na 0.3.0).
 * Cada uma se registra pelo handle do seu colisor; a mira descobre o que está
 * na frente com um raio do Rapier e procura aqui.
 */

export interface UseContext {
  /** Posição da câmera no momento do uso. */
  from: [number, number, number]
  /** Usou correndo (Shift): portas abrem/fecham com força. */
  hard: boolean
}

/** Dica da mira: texto e se dá para usar agora (false = mostra sem a tecla E). */
export interface Hint {
  text: string
  ok: boolean
}

export interface Interactable {
  kind: 'door' | 'item'
  label: () => Hint
  use: (ctx: UseContext) => void
}

const registry = new Map<number, Interactable>()

export function registerInteractable(colliderHandle: number, item: Interactable) {
  registry.set(colliderHandle, item)
  return () => {
    registry.delete(colliderHandle)
  }
}

export function getInteractable(colliderHandle: number) {
  return registry.get(colliderHandle)
}
