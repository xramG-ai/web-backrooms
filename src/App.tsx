import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { World } from './components/World'
import { Player } from './components/Player'
import { Effects } from './components/Effects'
import { game } from './game/state'
import { initAudio, setVolume } from './game/audio'
import { FOG_COLOR, FOG_DENSITY } from './game/config'

const INV_SLOTS = 8

/**
 * UI 상태 머신
 * start     시작 화면 (첫 진입)
 * playing   포인터 락 + 게임 중
 * inventory Tab → 포인터 락 해제, 커서 보임
 * menu      ESC → 설정 UI
 */
type Ui = 'start' | 'playing' | 'inventory' | 'menu'

async function lockAll() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
    }
    const kb = (navigator as unknown as {
      keyboard?: { lock?: (codes?: string[]) => Promise<void> }
    }).keyboard
    if (kb?.lock) {
      await kb.lock([
        'ControlLeft', 'ControlRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD',
        'KeyC', 'Space', 'ShiftLeft', 'ShiftRight', 'Tab',
      ])
    }
  } catch {
    // 전체화면 거부 등은 무시하고 진행
  }
  game.canvas?.requestPointerLock()
}

export default function App() {
  const [ui, setUi] = useState<Ui>('start')
  const uiRef = useRef<Ui>('start')
  uiRef.current = ui
  const intent = useRef<'inventory' | null>(null)

  // 설정 값
  const [sens, setSens] = useState(1)
  const [dof, setDof] = useState(true)
  const [vol, setVol] = useState(1)

  useEffect(() => {
    const onChange = () => {
      const locked = document.pointerLockElement === game.canvas
      if (locked) {
        intent.current = null
        setUi('playing')
      } else if (uiRef.current === 'playing') {
        // Tab으로 의도한 해제면 인벤토리, ESC 등 그 외에는 설정 메뉴
        setUi(intent.current === 'inventory' ? 'inventory' : 'menu')
        intent.current = null
      }
    }
    document.addEventListener('pointerlockchange', onChange)
    return () => document.removeEventListener('pointerlockchange', onChange)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        if (uiRef.current === 'playing') {
          e.preventDefault()
          intent.current = 'inventory'
          document.exitPointerLock()
        } else if (uiRef.current === 'inventory') {
          e.preventDefault()
          void lockAll()
        }
      }
      if (e.code === 'Escape' && uiRef.current === 'inventory') {
        setUi('menu')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const enter = () => {
    initAudio()
    void lockAll()
  }

  return (
    <>
      <Canvas
        camera={{ fov: 75, near: 0.05, far: 80 }}
        gl={{ antialias: true }}
        onCreated={({ gl, scene }) => {
          game.canvas = gl.domElement
          scene.background = new THREE.Color(FOG_COLOR)
          scene.fog = new THREE.FogExp2(FOG_COLOR, FOG_DENSITY)
        }}
      >
        <ambientLight color="#fff2cf" intensity={1.2} />
        <World />
        <Player />
        <Effects />
      </Canvas>

      {ui === 'inventory' && (
        <div className="inventory">
          <div className="inv-title">소지품</div>
          <div className="inv-grid">
            {Array.from({ length: INV_SLOTS }).map((_, i) => (
              <div key={i} className="inv-slot" />
            ))}
          </div>
          <div className="inv-hint">비어 있음</div>
          <button className="btn" onClick={() => void lockAll()}>닫기 (TAB)</button>
        </div>
      )}

      {ui === 'menu' && (
        <div className="menu-backdrop">
          <div className="menu">
            <div className="inv-title">설정</div>
            <label className="row">
              <span>마우스 감도</span>
              <input
                type="range" min={0.4} max={2} step={0.1} value={sens}
                onChange={e => {
                  const v = Number(e.target.value)
                  setSens(v)
                  game.sensMult = v
                }}
              />
              <span className="val">{sens.toFixed(1)}</span>
            </label>
            <label className="row">
              <span>거리 블러</span>
              <input
                type="checkbox" checked={dof}
                onChange={e => {
                  setDof(e.target.checked)
                  game.dof = e.target.checked
                }}
              />
            </label>
            <label className="row">
              <span>소리</span>
              <input
                type="range" min={0} max={1} step={0.05} value={vol}
                onChange={e => {
                  const v = Number(e.target.value)
                  setVol(v)
                  setVolume(v)
                }}
              />
              <span className="val">{Math.round(vol * 100)}%</span>
            </label>
            <button className="btn" onClick={() => void lockAll()}>계속하기</button>
            <div className="inv-hint">TAB 소지품 · ESC 설정</div>
          </div>
        </div>
      )}

      {ui === 'start' && (
        <div className="overlay" onClick={enter}>
          <div className="title">WEB BACKROOMS</div>
          <div className="hint">클릭하여 진입</div>
          <div className="keys">
            WASD 이동 · SHIFT 달리기 · SPACE 점프 · CTRL/C 앉기 · TAB 소지품 · ESC 설정
          </div>
        </div>
      )}
    </>
  )
}
