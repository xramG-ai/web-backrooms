import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { game } from '../game/state'
import { CHUNK, LOAD_RADIUS } from '../game/config'
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

/** 플레이어 주변 청크만 로드/언로드 */
export function World() {
  const [list, setList] = useState<string[]>(() => computeList(0, 0))
  const last = useRef('0,0')

  useFrame(() => {
    const cx = Math.floor(game.pos.x / CHUNK)
    const cz = Math.floor(game.pos.z / CHUNK)
    const key = cx + ',' + cz
    if (key !== last.current) {
      last.current = key
      setList(computeList(cx, cz))
    }
  })

  return (
    <>
      {list.map(k => {
        const [cx, cz] = k.split(',').map(Number)
        return <ChunkMesh key={k} cx={cx} cz={cz} />
      })}
    </>
  )
}
