import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { game } from '../game/state'
import { gatherBoxes, moveXZ } from '../game/collision'
import { footstep } from '../game/audio'
import {
  EYE, CROUCH_EYE, PLAYER_R, WALK, RUN, CROUCH_SPEED, JUMP, GRAV, WALL_H,
} from '../game/config'

const SENS = 0.0022

export function Player() {
  const keys = useRef<Record<string, boolean>>({})
  const grounded = useRef(true)
  const stepPhase = useRef(0)
  const eyeOff = useRef(EYE)
  const lightRef = useRef<THREE.PointLight>(null)
  const { camera } = useThree()

  useEffect(() => {
    const GAME_KEYS = new Set([
      'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyC',
      'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
    ])
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true
      // 게임 중에는 브라우저 단축키(Ctrl+S, Ctrl+D, 스크롤 등) 차단
      if (document.pointerLockElement === game.canvas &&
          (GAME_KEYS.has(e.code) || e.ctrlKey)) {
        e.preventDefault()
      }
    }
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false
    }
    const move = (e: MouseEvent) => {
      if (document.pointerLockElement !== game.canvas) return
      const sens = SENS * game.sensMult
      game.yaw -= e.movementX * sens
      game.pitch = Math.max(-1.45, Math.min(1.45, game.pitch - e.movementY * sens))
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('mousemove', move)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('mousemove', move)
    }
  }, [])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)

    // FOV 설정 반영
    const cam = camera as THREE.PerspectiveCamera
    if (cam.fov !== game.fov) {
      cam.fov = game.fov
      cam.updateProjectionMatrix()
    }
    const k = keys.current
    const locked = document.pointerLockElement === game.canvas

    // ── 앉기 (Ctrl 또는 C) ──
    const crouching = !!(k.ControlLeft || k.ControlRight || k.KeyC)
    const targetEye = crouching ? CROUCH_EYE : EYE
    eyeOff.current += (targetEye - eyeOff.current) * Math.min(1, dt * 10)

    // ── 입력 → 목표 속도 ──
    let f = 0
    let r = 0
    if (locked) {
      if (k.KeyW) f += 1
      if (k.KeyS) f -= 1
      if (k.KeyD) r += 1
      if (k.KeyA) r -= 1
    }
    const running = !!(k.ShiftLeft || k.ShiftRight) && !crouching
    const speed = crouching ? CROUCH_SPEED : running ? RUN : WALK
    let tx = 0
    let tz = 0
    const mag = Math.hypot(f, r)
    if (mag > 0) {
      const fx = -Math.sin(game.yaw)
      const fz = -Math.cos(game.yaw)
      const rx = Math.cos(game.yaw)
      const rz = -Math.sin(game.yaw)
      tx = ((fx * f + rx * r) / mag) * speed
      tz = ((fz * f + rz * r) / mag) * speed
    }
    const blend = Math.min(1, dt * 12)
    game.vel.x += (tx - game.vel.x) * blend
    game.vel.z += (tz - game.vel.z) * blend

    // ── 수직 이동 (앉는 중에는 점프 불가) ──
    if (locked && k.Space && grounded.current && !crouching) {
      game.vel.y = JUMP
      grounded.current = false
    }
    game.vel.y -= GRAV * dt
    let ny = game.pos.y + game.vel.y * dt
    const headMax = WALL_H - 0.15
    if (ny > headMax) {
      ny = headMax
      game.vel.y = Math.min(0, game.vel.y)
    }
    if (ny <= eyeOff.current) {
      ny = eyeOff.current
      game.vel.y = 0
      grounded.current = true
    }
    // 서 있다가 앉으면 눈높이를 따라 내려감
    if (grounded.current) ny = eyeOff.current

    // ── 수평 이동 + 벽 충돌 ──
    const boxes = gatherBoxes(game.pos.x, game.pos.z)
    const [nx, nz] = moveXZ(
      game.pos.x, game.pos.z,
      game.vel.x * dt, game.vel.z * dt,
      boxes, PLAYER_R,
    )
    game.pos.set(nx, ny, nz)

    // ── 헤드밥 + 발소리 ──
    const hSpeed = Math.hypot(game.vel.x, game.vel.z)
    let bobOff = 0
    if (grounded.current && hSpeed > 0.4) {
      const stride = crouching ? 0.5 : running ? 1.6 : 0.78
      const amp = crouching ? 0.02 : 0.045
      const prev = stepPhase.current
      stepPhase.current += (dt * hSpeed) / stride
      bobOff = Math.abs(Math.sin(stepPhase.current * Math.PI)) * amp - amp / 2
      if (Math.floor(stepPhase.current) !== Math.floor(prev)) footstep(running)
    }

    camera.position.set(nx, ny + bobOff, nz)
    camera.rotation.order = 'YXZ'
    camera.rotation.set(game.pitch, game.yaw, 0)

    if (lightRef.current) lightRef.current.position.set(nx, ny + 0.4, nz)
  })

  return (
    <pointLight
      ref={lightRef}
      color="#ffe6a8"
      intensity={9}
      distance={16}
      decay={1.6}
      position={[10, 2, 10]}
    />
  )
}
