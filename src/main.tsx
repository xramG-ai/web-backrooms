import { createRoot } from 'react-dom/client'
import App from './App'
import { game } from './game/state'
import './style.css'

// 개발 검증용: ?debug 로 열면 콘솔에서 게임 상태 접근 가능
if (location.search.includes('debug')) {
  ;(window as unknown as { __wb: typeof game }).__wb = game
}

createRoot(document.getElementById('root')!).render(<App />)
