import * as THREE from 'three'
import { psxStandard } from '../enemies/models/psx'
import { HEAD } from '../items/catalog'

/**
 * O investigador (pés em y = 0, de frente para +z), dividido nas partes que o
 * renascimento monta uma por uma. A ordem da lista é a ordem da montagem:
 * de baixo para cima, a cabeça por último.
 */

export interface BodyPart {
  name: string
  /** Onde a parte fica no corpo montado. */
  pos: [number, number, number]
  meshes: { geo: THREE.BufferGeometry; mat: THREE.Material; pos?: [number, number, number]; rot?: [number, number, number] }[]
}

let cache: BodyPart[] | null = null

export function investigatorParts(): BodyPart[] {
  if (cache) return cache
  const m = {
    boot: psxStandard({ color: '#1a1410' }),
    pants: psxStandard({ color: '#2e2a24' }),
    coat: psxStandard({ color: '#3a3628' }),
    coatDark: psxStandard({ color: '#2a2618' }),
    skin: psxStandard({ color: HEAD.color }),
    hair: psxStandard({ color: '#2a1c12' }),
    brass: psxStandard({ color: '#8a6a2a', metalness: 0.6, roughness: 0.4 }),
    lens: new THREE.MeshBasicMaterial({ color: '#ffe0a0' }),
    eye: psxStandard({ color: '#140c08' }),
  }
  const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d)
  const cyl = (rt: number, rb: number, h: number, seg = 6) => new THREE.CylinderGeometry(rt, rb, h, seg)
  const leg = (side: number): BodyPart => ({
    name: side < 0 ? 'perna esquerda' : 'perna direita',
    pos: [side * 0.1, 0, 0],
    meshes: [
      { geo: box(0.12, 0.1, 0.24), mat: m.boot, pos: [0, 0.05, 0.03] },
      { geo: cyl(0.065, 0.055, 0.42), mat: m.pants, pos: [0, 0.3, 0] },
      { geo: cyl(0.075, 0.065, 0.4), mat: m.pants, pos: [0, 0.7, 0] },
    ],
  })
  const arm = (side: number): BodyPart => ({
    name: side < 0 ? 'braço esquerdo' : 'braço direito',
    pos: [side * 0.25, 1.4, 0],
    meshes: [
      { geo: cyl(0.06, 0.055, 0.32), mat: m.coat, pos: [0, -0.15, 0] },
      { geo: cyl(0.055, 0.045, 0.3), mat: m.coat, pos: [0, -0.45, 0.02] },
      { geo: box(0.07, 0.1, 0.05), mat: m.skin, pos: [0, -0.66, 0.03] },
    ],
  })
  cache = [
    leg(-1),
    leg(1),
    {
      name: 'quadril',
      pos: [0, 0.95, 0],
      meshes: [
        { geo: box(0.34, 0.16, 0.2), mat: m.pants },
        { geo: box(0.36, 0.04, 0.22), mat: m.boot, pos: [0, 0.06, 0] },
        { geo: box(0.05, 0.035, 0.01), mat: m.brass, pos: [0, 0.06, 0.115] },
      ],
    },
    {
      name: 'tronco',
      pos: [0, 1.25, 0],
      meshes: [
        { geo: box(0.4, 0.46, 0.22), mat: m.coat },
        // aba do sobretudo caindo até as coxas
        { geo: box(0.42, 0.32, 0.24), mat: m.coatDark, pos: [0, -0.34, 0] },
        { geo: box(0.08, 0.3, 0.01), mat: m.coatDark, pos: [0.06, 0.04, 0.115], rot: [0, 0, 0.2] },
      ],
    },
    arm(-1),
    arm(1),
    {
      name: 'lanterna',
      pos: [0.13, 1.38, 0.13],
      meshes: [
        { geo: cyl(0.025, 0.02, 0.12), mat: m.boot, rot: [Math.PI / 2, 0, 0] },
        { geo: cyl(0.03, 0.03, 0.02), mat: m.lens, pos: [0, 0, 0.06], rot: [Math.PI / 2, 0, 0] },
      ],
    },
    {
      name: 'pescoço',
      pos: [0, 1.52, 0],
      meshes: [
        { geo: cyl(0.05, 0.055, 0.1), mat: m.skin },
        { geo: box(0.3, 0.06, 0.2), mat: m.coatDark, pos: [0, -0.03, 0] },
      ],
    },
    {
      name: 'cabeça',
      pos: [0, 1.68, 0.01],
      meshes: [
        { geo: new THREE.SphereGeometry(0.11, 8, 6), mat: m.skin, rot: [0, 0, 0] },
        { geo: new THREE.SphereGeometry(0.115, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.5), mat: m.hair, pos: [0, 0.025, -0.012] },
        { geo: box(0.03, 0.012, 0.01), mat: m.eye, pos: [-0.04, 0.01, 0.105] },
        { geo: box(0.03, 0.012, 0.01), mat: m.eye, pos: [0.04, 0.01, 0.105] },
      ],
    },
  ]
  return cache
}
