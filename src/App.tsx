import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { World } from './components/World'
import { Player } from './components/Player'
import { Effects } from './components/Effects'
import { game } from './game/state'
import { initAudio, setVolume, ringClick, unlockSound } from './game/audio'
import { FOG_COLOR, FOG_DENSITY, FOV } from './game/config'

const INV_SLOTS = 8

// 크립텍스 자물쇠
const CHARS = '-abcdefghijklmnopqrstuvwxyz' // 27자
const ANSWER = '--backroom'                  // 10자 열쇠말

/** 10자 중 7자는 정답, 무작위 3자리만 오답으로 어긋난 초기 배열 */
function scrambledRings(): number[] {
  const target = ANSWER.split('').map(ch => CHARS.indexOf(ch))
  const r = [...target]
  const idxs = [...Array(ANSWER.length).keys()]
  for (let i = idxs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[idxs[i], idxs[j]] = [idxs[j], idxs[i]]
  }
  for (const i of idxs.slice(0, 3)) {
    let v: number
    do {
      v = Math.floor(Math.random() * CHARS.length)
    } while (v === target[i])
    r[i] = v
  }
  return r
}

/**
 * UI 상태 머신
 * start     시작 화면 (크립텍스)
 * playing   포인터 락 + 게임 중
 * inventory Tab → 포인터 락 해제, 커서 보임
 * menu      ESC → 일시 정지 메뉴
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

  const [manual, setManual] = useState(false)
  const [menuView, setMenuView] = useState<'main' | 'settings'>('main')
  const menuViewRef = useRef<'main' | 'settings'>('main')
  menuViewRef.current = menuView

  const [rings, setRings] = useState<number[]>(scrambledRings)
  const [solved, setSolved] = useState(false)
  const solvedRef = useRef(false)

  // 설정 값
  const [sens, setSens] = useState(1)
  const [dof, setDof] = useState(true)
  const [vol, setVol] = useState(1)
  const [fovv, setFovv] = useState(FOV)

  useEffect(() => {
    const onChange = () => {
      const locked = document.pointerLockElement === game.canvas
      if (locked) {
        intent.current = null
        setUi('playing')
      } else if (uiRef.current === 'playing') {
        // Tab으로 의도한 해제면 인벤토리, ESC 등 그 외에는 일시 정지 메뉴
        setMenuView('main')
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
      if (e.code === 'Escape') {
        if (uiRef.current === 'inventory') {
          setMenuView('main')
          setUi('menu')
        } else if (uiRef.current === 'menu') {
          if (menuViewRef.current === 'settings') {
            setMenuView('main') // 설정 → 뒤로
          } else {
            void lockAll()      // 메인 → 게임 재개
          }
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const enter = () => {
    initAudio()
    void lockAll()
  }

  /** 일시 정지 → 타이틀로. 자물쇠는 다시 잠긴다. */
  const exitToTitle = () => {
    solvedRef.current = false
    setSolved(false)
    setRings(scrambledRings())
    setMenuView('main')
    setUi('start')
    if (document.fullscreenElement) void document.exitFullscreen()
  }

  /** 링 하나를 dir(±1)만큼 회전. 열쇠말이 맞으면 잠금 해제. */
  const spin = (i: number, dir: number) => {
    if (solvedRef.current) return
    ringClick()
    setRings(prev => {
      const next = [...prev]
      next[i] = (next[i] + dir + CHARS.length) % CHARS.length
      if (next.map(n => CHARS[n]).join('') === ANSWER) {
        solvedRef.current = true
        setSolved(true)
        unlockSound()
        // 마지막 조작이 버튼 클릭이었다면 자동 진입이 되고,
        // 휠이었다면 (제스처 미인정) 진입 버튼을 눌러야 한다.
        setTimeout(() => enter(), 500)
      }
      return next
    })
  }

  return (
    <>
      <Canvas
        camera={{ fov: FOV, near: 0.05, far: 80 }}
        dpr={[1, 1.5]}
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
          <div className="plate pause">
            <div className="rivet tl" />
            <div className="rivet tr" />
            <div className="rivet bl" />
            <div className="rivet br" />
            <div className="plate-title small">일시 정지</div>
            {menuView === 'main' ? (
              <div className="pause-buttons">
                <button className="mbtn" onClick={() => void lockAll()}>계속하기</button>
                <button className="mbtn" onClick={() => setMenuView('settings')}>설정</button>
                <button className="mbtn" onClick={exitToTitle}>메뉴로 나가기</button>
              </div>
            ) : (
              <>
                <label className="man-row wide">
                  <span>시야각</span>
                  <input
                    type="range" min={70} max={110} step={5} value={fovv}
                    onChange={e => {
                      const v = Number(e.target.value)
                      setFovv(v)
                      game.fov = v
                    }}
                  />
                  <span className="val">{fovv}</span>
                </label>
                <label className="man-row wide">
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
                <label className="man-row wide">
                  <span>거리 블러</span>
                  <input
                    type="checkbox" checked={dof}
                    onChange={e => {
                      setDof(e.target.checked)
                      game.dof = e.target.checked
                    }}
                  />
                </label>
                <label className="man-row wide">
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
                <button className="mbtn" onClick={() => setMenuView('main')}>뒤로</button>
              </>
            )}
          </div>
        </div>
      )}

      {ui === 'start' && (
        <div className="start">
          <div className="plate">
            <div className="rivet tl" />
            <div className="rivet tr" />
            <div className="rivet bl" />
            <div className="rivet br" />
            <div className="plate-title">WEB BACKROOMS</div>
            <div className={'rings' + (solved ? ' solved' : '')}>
              {rings.map((v, i) => (
                <div
                  key={i}
                  className="ring"
                  onWheel={e => spin(i, e.deltaY > 0 ? 1 : -1)}
                >
                  <button className="ring-arrow" onClick={() => spin(i, -1)}>▲</button>
                  <div className="ring-window">
                    <div className="ring-letter dim">
                      {CHARS[(v + CHARS.length - 1) % CHARS.length].toUpperCase()}
                    </div>
                    <div className="ring-letter cur" key={'c' + v}>
                      {CHARS[v].toUpperCase()}
                    </div>
                    <div className="ring-letter dim">
                      {CHARS[(v + 1) % CHARS.length].toUpperCase()}
                    </div>
                  </div>
                  <button className="ring-arrow" onClick={() => spin(i, 1)}>▼</button>
                </div>
              ))}
            </div>
            <div className="plate-serial">
              {solved ? '잠금 해제' : '열쇠말을 맞추면 문이 열린다'}
            </div>
            <div className="plate-buttons">
              {solved ? (
                <button className="mbtn glow" onClick={enter}>진 입</button>
              ) : (
                <button className="mbtn" onClick={() => setManual(true)}>설명서</button>
              )}
            </div>
          </div>

          {manual && (
            <div className="manual-backdrop" onClick={() => setManual(false)}>
              <div className="plate manual" onClick={e => e.stopPropagation()}>
                <div className="rivet tl" />
                <div className="rivet tr" />
                <div className="rivet bl" />
                <div className="rivet br" />
                <div className="plate-title small">설명서</div>
                <div className="man-rows">
                  <div className="man-row"><span>이동</span><span className="cap">W A S D</span></div>
                  <div className="man-row"><span>달리기</span><span className="cap">SHIFT</span></div>
                  <div className="man-row"><span>점프</span><span className="cap">SPACE</span></div>
                  <div className="man-row"><span>앉기</span><span className="cap">CTRL / C</span></div>
                  <div className="man-row"><span>소지품</span><span className="cap">TAB</span></div>
                  <div className="man-row"><span>일시 정지</span><span className="cap">ESC</span></div>
                </div>
                <div className="man-note">
                  장치의 링을 돌려 열쇠말을 맞추면 진입한다.<br />
                  휠 또는 ▲▼로 링을 돌릴 수 있다.<br />
                  열쇠말은 어디에도 적혀 있지 않다.<br />
                  <br />
                  게임은 전체화면으로 실행된다.<br />
                  이 공간의 규칙은 문서화되어 있지 않다.<br />
                  걸어라. 기억하려 하지 마라.
                </div>
                <button className="mbtn" onClick={() => setManual(false)}>닫기</button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
