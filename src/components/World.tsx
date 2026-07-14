import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { game } from '../game/state'
import { CHUNK, LOAD_RADIUS, UNLOAD_RADIUS } from '../game/config'
import { ChunkMesh } from './ChunkMesh'

function computeList(cx: number, cz: number): string[] {
  const out: string[] = []
  for (let i = -LOAD_RADIUS; i <= LOAD_RADIUS; i++) {
    for (let j = -LOAD_RADIUS; j <= LOAD_RADIUS; j++) {
      out.push(cx + i + ',' + (cz + j))
    }
  }
  return out
}

/**
 * 플레이어 주변 청크 로드/언로드.
 * - 히스테리시스: LOAD_RADIUS 안이면 추가, UNLOAD_RADIUS 밖일 때만 제거
 *   → 경계에서 왔다갔다 해도 생성/해제가 반복되지 않음
 * - 프레임당 최대 2개만 새로 마운트 → 청크 생성 히치를 여러 프레임에 분산
 */
export function World() {
  const [list, setList] = useState<string[]>(() => computeList(0, 0))
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    // 플로팅 오리진: 월드 전체를 -origin 만큼 이동시켜 렌더 좌표를 작게 유지
    if (groupRef.current) {
      groupRef.current.position.set(-game.origin.x, 0, -game.origin.z)
    }
    const cx = Math.floor(game.pos.x / CHUNK)
    const cz = Math.floor(game.pos.z / CHUNK)
    setList(prev => {
      const have = new Set(prev)
      const needed: string[] = []
      for (let i = -LOAD_RADIUS; i <= LOAD_RADIUS; i++) {
        for (let j = -LOAD_RADIUS; j <= LOAD_RADIUS; j++) {
          const k = cx + i + ',' + (cz + j)
          if (!have.has(k)) needed.push(k)
        }
      }
      const kept = prev.filter(k => {
        const [x, z] = k.split(',').map(Number)
        return Math.abs(x - cx) <= UNLOAD_RADIUS && Math.abs(z - cz) <= UNLOAD_RADIUS
      })
      if (needed.length === 0 && kept.length === prev.length) return prev
      return [...kept, ...needed.slice(0, 2)]
    })
  })

  return (
    <group ref={groupRef}>
      {list.map(k => {
        const [cx, cz] = k.split(',').map(Number)
        return <ChunkMesh key={k} cx={cx} cz={cz} />
      })}
    </group>
  )
}
