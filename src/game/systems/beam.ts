import * as THREE from 'three'

/**
 * Estado do feixe da lanterna neste frame, para quem não é React.
 *  - lit: a lanterna está acesa (ligada e com bateria)
 *  - strength, dir: força e direção do facho (poeira do ambiente)
 *  - onShadow: o feixe está em cima de alguma Sombra (ela congela; a bateria gasta mais rápido)
 */
export const beam = {
  lit: false,
  onShadow: false,
  /** 0–1: força do facho agora (fraca/piscando = menos). */
  strength: 0,
  /** Para onde o facho aponta (mundo). */
  dir: new THREE.Vector3(0, 0, -1),
}

// pode haver mais de uma Sombra: o feixe está "em cima" se estiver em qualquer uma
const litShadows = new Set<string>()
export function setShadowLit(id: string, lit: boolean) {
  if (lit) litShadows.add(id)
  else litShadows.delete(id)
  beam.onShadow = litShadows.size > 0
}
