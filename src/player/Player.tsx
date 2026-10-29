import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import { CapsuleCollider, RigidBody, useBeforePhysicsStep, useRapier, type RapierCollider, type RapierRigidBody } from '@react-three/rapier'
import type { KinematicCharacterController } from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import type { LevelData } from '../game/data/types'
import type { BuiltLevel } from '../world/buildLevel'
import { isPaused, useGameStore } from '../game/stores/gameStore'
import { PLAYER } from './config'
import { possession, usePlayerStore } from './playerStore'
import { PLAYER_GROUPS } from '../game/physics'
import { debugApi } from '../game/debug'
import { useItemStore } from '../items/itemStore'
import { CARRY } from '../items/catalog'
import { playerFeet } from './playerPos'
import { useHidingStore } from './hidingStore'
import { wardrobes } from '../world/HidingSpots'
import { FLOOR_NOISE } from './config'
import { emitNoise } from '../game/systems/noise'
import { audio } from '../game/audio/engine'
import { AUDIO } from '../game/audio/sounds'
import { useSettingsStore } from '../game/stores/settingsStore'

/**
 * Investigador em primeira pessoa: cápsula cinemática movida pelo controlador
 * de personagem do Rapier (desliza nas paredes, sobe degraus, gruda no chão).
 *
 * O movimento roda antes de cada passo da física; a câmera só copia a posição
 * calculada ali, somando a altura dos olhos e o balanço.
 */

const R = PLAYER.radius
/** Meia altura do cilindro da cápsula (sem as pontas). */
const STAND_HALF = (PLAYER.standHeight - 2 * R) / 2
const CROUCH_HALF = (PLAYER.crouchHeight - 2 * R) / 2
/** Quanto o centro da cápsula desce ao agachar. */
const CROUCH_DROP = STAND_HALF - CROUCH_HALF
/** Quanto dá para virar a cabeça dentro do armário (rad). */
const WARDROBE_LOOK = { yaw: 0.45, pitch: 0.35 }
/** De frente para a saída do carro (+x). */
const SPAWN_YAW = -Math.PI / 2
const UP = new THREE.Vector3(0, 1, 0)

function useKeys() {
  const keys = useRef(new Set<string>())
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current.add(e.code)
      // Ctrl agacha: bloqueia os atalhos do navegador com Ctrl enquanto joga
      // (Ctrl+W/T/N não dá para bloquear fora da tela cheia)
      if (e.ctrlKey && document.pointerLockElement) e.preventDefault()
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.code)
    const clear = () => keys.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [])
  return keys
}

export function Player({ level, built }: { level: LevelData; built: BuiltLevel }) {
  const body = useRef<RapierRigidBody>(null)
  const collider = useRef<RapierCollider>(null)
  const controller = useRef<KinematicCharacterController>()
  const { world, rapier } = useRapier()
  const camera = useThree((s) => s.camera)
  const keys = useKeys()
  const sensitivity = useSettingsStore((s) => s.sensitivity)
  const cameraMode = useGameStore((s) => s.cameraMode)
  const respawnId = usePlayerStore((s) => s.respawnId)

  const spawn = useMemo(() => {
    const [x, , z] = built.toWorld(level.playerStart.x, level.playerStart.y)
    return { x, y: STAND_HALF + R + 0.05, z }
  }, [level, built])

  // estado que muda a cada passo: fica fora do React
  const st = useRef({
    vel: new THREE.Vector3(),
    vy: 0,
    grounded: false,
    crouched: false,
    /** Levantando: a cápsula já subiu, falta crescer no próximo passo. */
    growNext: false,
    regenDelay: 0,
    exhausted: false,
    dead: false,
    regen: 0,
    eye: PLAYER.standEye,
    bob: 0,
    bobAmp: 0,
    /** Último meio ciclo do balanço que virou passo. */
    lastStep: 0,
    next: new THREE.Vector3(spawn.x, spawn.y, spawn.z),
  }).current
  const tmp = useMemo(() => ({ fwd: new THREE.Vector3(), right: new THREE.Vector3(), move: new THREE.Vector3() }), [])

  useEffect(() => {
    const c = world.createCharacterController(0.02)
    c.enableAutostep(0.3, 0.2, false)
    c.enableSnapToGround(0.3)
    c.setMaxSlopeClimbAngle((45 * Math.PI) / 180)
    // empurra portas e itens ao encostar
    c.setApplyImpulsesToDynamicBodies(true)
    c.setCharacterMass(PLAYER.mass)
    controller.current = c
    return () => {
      world.removeCharacterController(c)
      controller.current = undefined
    }
  }, [world])

  const faceSpawn = () => camera.quaternion.setFromEuler(new THREE.Euler(0, SPAWN_YAW, 0, 'YXZ'))

  // entrar/sair do armário: o corpo some lá dentro (colisor desligado) e a lanterna apaga
  useEffect(() => {
    let flashlightBefore = true
    return useHidingStore.subscribe((s, prev) => {
      if (s.wardrobeId === prev.wardrobeId) return
      const b = body.current
      const col = collider.current
      const player = usePlayerStore.getState()
      const entering = s.wardrobeId ? wardrobes.get(s.wardrobeId) : undefined
      const leaving = prev.wardrobeId ? wardrobes.get(prev.wardrobeId) : undefined
      if (st.crouched || st.growNext) {
        col?.setHalfHeight(STAND_HALF)
        st.crouched = st.growNext = false
        player.setCrouching(false)
      }
      const place = ([x, , z]: [number, number, number]) => {
        const y = STAND_HALF + R + 0.02
        b?.setTranslation({ x, y, z }, true)
        st.next.set(x, y, z)
        st.vel.set(0, 0, 0)
        st.bobAmp = 0
      }
      if (entering) {
        col?.setEnabled(false)
        place(entering.inside)
        camera.quaternion.setFromEuler(new THREE.Euler(0, entering.yaw, 0, 'YXZ'))
        flashlightBefore = player.flashlight
        if (player.flashlight) player.toggleFlashlight()
      } else if (leaving) {
        col?.setEnabled(true)
        place(leaving.exit)
        if (flashlightBefore && !usePlayerStore.getState().flashlight) usePlayerStore.getState().toggleFlashlight()
      }
    })
  }, [camera, st])

  // renascer no carro (início do nível, morte, recomeço)
  useEffect(() => {
    // sai de qualquer esconderijo antes de ir para o carro
    useHidingStore.getState().reset()
    collider.current?.setEnabled(true)
    const b = body.current
    if (b) b.setTranslation(spawn, true)
    if (st.crouched || st.growNext) collider.current?.setHalfHeight(STAND_HALF)
    Object.assign(st, { vy: 0, crouched: false, growNext: false, dead: false, eye: PLAYER.standEye, regenDelay: 0 })
    st.vel.set(0, 0, 0)
    st.next.set(spawn.x, spawn.y, spawn.z)
    usePlayerStore.getState().setCrouching(false)
    if (useGameStore.getState().cameraMode === 'player') faceSpawn()
  }, [respawnId, spawn])

  // comandos de teste (window.__relicario, só em dev)
  useEffect(() => {
    const half = () => (st.crouched ? CROUCH_HALF : STAND_HALF)
    debugApi.pos = () => [st.next.x, st.next.y - half() - R, st.next.z]
    debugApi.look = (yawDeg, pitchDeg = 0) =>
      camera.quaternion.setFromEuler(new THREE.Euler((pitchDeg * Math.PI) / 180, (yawDeg * Math.PI) / 180, 0, 'YXZ'))
    debugApi.tp = (x, z) => {
      const y = half() + R + 0.02
      body.current?.setTranslation({ x, y, z }, true)
      st.next.set(x, y, z)
      st.vel.set(0, 0, 0)
    }
  }, [camera, st])

  // voltando do modo editor: olhar na horizontal, mantendo a direção
  useEffect(() => {
    if (cameraMode !== 'player') return
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ')
    camera.quaternion.setFromEuler(new THREE.Euler(0, e.y, 0, 'YXZ'))
  }, [cameraMode, camera])

  /** Cabe em pé aqui? (nada em cima da cabeça) */
  const canStand = (feetY: number, x: number, z: number) => {
    let blocked = false
    const shape = new rapier.Capsule(STAND_HALF, R - 0.02)
    world.intersectionsWithShape(
      { x, y: feetY + STAND_HALF + R + 0.05, z },
      { x: 0, y: 0, z: 0, w: 1 },
      shape,
      () => {
        blocked = true
        return false
      },
      undefined,
      undefined,
      collider.current ?? undefined,
      body.current ?? undefined,
    )
    return !blocked
  }

  useBeforePhysicsStep((w) => {
    const b = body.current
    const col = collider.current
    const ctrl = controller.current
    if (!b || !col || !ctrl) return
    const dt = Math.min(w.timestep, 0.05)
    const game = useGameStore.getState()
    const player = usePlayerStore.getState()
    const k = keys.current
    // dentro do armário não se mexe (o corpo está parado lá dentro)
    if (useHidingStore.getState().wardrobeId) return
    // renascendo: a cena controla a câmera e o corpo fica parado no carro
    const active = game.cameraMode === 'player' && !isPaused(game.phase) && player.locked && player.reviving === null

    const pos = b.translation()
    let shiftY = 0
    const half = () => (st.crouched ? CROUCH_HALF : STAND_HALF)

    // levantar: a cápsula pequena subiu no passo anterior, agora cresce
    if (st.growNext) {
      col.setHalfHeight(STAND_HALF)
      st.growNext = false
    }

    // agachar (segurar C ou Ctrl)
    const wantCrouch = active && (k.has('KeyC') || k.has('ControlLeft') || k.has('ControlRight'))
    if (wantCrouch && !st.crouched) {
      col.setHalfHeight(CROUCH_HALF)
      st.crouched = true
      shiftY -= CROUCH_DROP
      player.setCrouching(true)
    } else if (!wantCrouch && st.crouched && canStand(pos.y - CROUCH_HALF - R, pos.x, pos.z)) {
      st.crouched = false
      st.growNext = true
      shiftY += CROUCH_DROP
      player.setCrouching(false)
    }

    // direção pela câmera (só o giro horizontal)
    const f = active ? (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0) : 0
    const r = active ? (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0) : 0
    const moving = f !== 0 || r !== 0
    const wantRun = active && (k.has('ShiftLeft') || k.has('ShiftRight'))
    // item nas mãos: médio deixa um pouco mais lento; grande não deixa correr
    const items = useItemStore.getState()
    const held = items.hands ? items.items[items.hands]?.def.size : undefined
    const carry = held === 'large' ? CARRY.speedLarge : held === 'medium' ? CARRY.speedMedium : 1
    const running = wantRun && moving && f >= 0 && !st.crouched && !st.exhausted && player.stamina > 0 && held !== 'large'

    camera.getWorldDirection(tmp.fwd)
    tmp.fwd.y = 0
    tmp.fwd.normalize()
    tmp.right.crossVectors(tmp.fwd, UP)
    tmp.move.set(0, 0, 0).addScaledVector(tmp.fwd, f).addScaledVector(tmp.right, r)
    // possuído: as pernas pesam
    const possessed = possession()
    const speed = (st.crouched ? PLAYER.crouchSpeed : running ? PLAYER.runSpeed : PLAYER.walkSpeed) * carry * (1 - possessed * 0.55)
    if (moving) tmp.move.normalize().multiplyScalar(speed)
    st.vel.lerp(tmp.move, 1 - Math.exp(-PLAYER.acceleration * dt))

    // gravidade
    st.vy = st.grounded ? -1 : Math.max(st.vy - PLAYER.gravity * dt, -20)

    ctrl.computeColliderMovement(col, { x: st.vel.x * dt, y: st.vy * dt + shiftY, z: st.vel.z * dt })
    const m = ctrl.computedMovement()
    st.grounded = ctrl.computedGrounded()
    st.next.set(pos.x + m.x, pos.y + m.y, pos.z + m.z)
    b.setNextKinematicTranslation(st.next)
    playerFeet.x = st.next.x
    playerFeet.y = st.next.y - half() - R
    playerFeet.z = st.next.z

    // estamina
    let stamina = player.stamina
    if (running) {
      stamina = Math.max(0, stamina - PLAYER.staminaDrain * dt)
      st.regenDelay = PLAYER.staminaRegenDelay
      if (stamina === 0) st.exhausted = true
    } else if ((st.regenDelay -= dt) <= 0) {
      stamina = Math.min(PLAYER.maxStamina, stamina + PLAYER.staminaRegen * dt)
    }
    if (st.exhausted && stamina >= PLAYER.staminaRecover) st.exhausted = false
    if (stamina !== player.stamina || st.exhausted !== player.exhausted) player.setStamina(stamina, st.exhausted)

    // balanço da câmera
    const hSpeed = Math.hypot(st.vel.x, st.vel.z)
    const ampTarget = st.grounded && hSpeed > 0.3 ? (st.crouched ? PLAYER.bobCrouch : running ? PLAYER.bobRun : PLAYER.bobWalk) : 0
    st.bobAmp += (ampTarget - st.bobAmp) * (1 - Math.exp(-8 * dt))
    st.bob += dt * hSpeed * PLAYER.bobFrequency

    // passo: cada meio ciclo do balanço (quando a cabeça desce) com o jogador andando no chão
    const stepIdx = Math.floor(st.bob / Math.PI)
    if (stepIdx !== st.lastStep) {
      st.lastStep = stepIdx
      if (st.grounded && hSpeed > 0.5) {
        const floor = built.roomAt(st.next.x, st.next.z)?.floor ?? 'wood'
        const [radius, volume] = st.crouched
          ? [PLAYER.stepNoiseCrouch, PLAYER.stepVolumeCrouch]
          : running
            ? [PLAYER.stepNoiseRun, PLAYER.stepVolumeRun]
            : [PLAYER.stepNoiseWalk, PLAYER.stepVolumeWalk]
        const feet: [number, number, number] = [st.next.x, st.next.y - half() - R + 0.05, st.next.z]
        emitNoise({ pos: feet, radius: radius * FLOOR_NOISE[floor], type: 'footstep' })
        audio.play(`step-${floor}`, { pos: feet, volume: AUDIO.steps * volume, rate: 0.9 + Math.random() * 0.2 })
      }
    }
    const eyeTarget = st.crouched ? PLAYER.crouchEye : PLAYER.standEye
    st.eye += (eyeTarget - st.eye) * (1 - Math.exp(-12 * dt))

    // vida volta devagar depois de um tempo sem apanhar (em passos de 1, para não redesenhar o HUD todo frame)
    if (player.health > 0 && player.health < PLAYER.regenCap && performance.now() - player.lastHitAt > PLAYER.regenDelay * 1000) {
      st.regen += PLAYER.regenPerSec * dt
      if (st.regen >= 1) {
        player.damage(-Math.min(Math.floor(st.regen), PLAYER.regenCap - player.health))
        st.regen -= Math.floor(st.regen)
      }
    }

    // morte: perde uma vida e renasce no carro
    if (player.health <= 0 && !st.dead) {
      st.dead = true
      const deathAt: [number, number, number] = [st.next.x, st.next.y - half() - R, st.next.z]
      // tudo o que carregava cai no local da morte
      items.dropAll(deathAt)
      game.loseLife(deathAt)
      // morto por uma criatura: o rosto dela na tela (ui/Jumpscare.tsx), depois o renascimento;
      // sem criatura (ex.: tecla K), vai direto para o renascimento
      // (na última vida o susto aparece, mas não há renascimento: Jumpscare.tsx confere)
      if (player.lastHit) player.scare(player.lastHit)
      else if (useGameStore.getState().phase !== 'gameover') player.startRevive()
      if (useGameStore.getState().phase !== 'gameover') player.respawn()
    }
  })

  useFrame(() => {
    if (useGameStore.getState().cameraMode !== 'player') return
    // renascendo: a câmera é da cena (world/Revive.tsx)
    if (usePlayerStore.getState().reviving !== null) return

    // no armário: olhos fixos atrás da fresta, dá para virar só um pouco
    const w = useHidingStore.getState().wardrobeId
    const wardrobe = w ? wardrobes.get(w) : undefined
    if (wardrobe) {
      camera.position.set(...wardrobe.eye)
      const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ')
      const dy = Math.atan2(Math.sin(e.y - wardrobe.yaw), Math.cos(e.y - wardrobe.yaw))
      const yaw = wardrobe.yaw + THREE.MathUtils.clamp(dy, -WARDROBE_LOOK.yaw, WARDROBE_LOOK.yaw)
      const pitch = THREE.MathUtils.clamp(e.x, -WARDROBE_LOOK.pitch, WARDROBE_LOOK.pitch)
      camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'))
      return
    }

    const feetY = st.next.y - (st.crouched ? CROUCH_HALF : STAND_HALF) - R
    const side = Math.cos(st.bob) * st.bobAmp * 0.6
    camera.getWorldDirection(tmp.fwd)
    tmp.right.crossVectors(tmp.fwd, UP).normalize()
    camera.position.set(
      st.next.x + tmp.right.x * side,
      feetY + st.eye + Math.abs(Math.sin(st.bob)) * st.bobAmp,
      st.next.z + tmp.right.z * side,
    )
  })

  const setLocked = usePlayerStore((s) => s.setLocked)

  return (
    <>
      <RigidBody
        ref={body}
        type="kinematicPosition"
        colliders={false}
        position={[spawn.x, spawn.y, spawn.z]}
        enabledRotations={[false, false, false]}
      >
        <CapsuleCollider ref={collider} args={[STAND_HALF, R]} collisionGroups={PLAYER_GROUPS} />
      </RigidBody>
      {cameraMode === 'player' && (
        <PointerLockControls
          selector="canvas"
          pointerSpeed={sensitivity}
          onLock={() => setLocked(true)}
          onUnlock={() => setLocked(false)}
        />
      )}
    </>
  )
}
