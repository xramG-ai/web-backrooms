import { CHUNK, CELL, WALL_H, WALL_T, SEED } from './config'
import { hash3, mulberry32 } from './rng'

export interface Wall {
  x: number; z: number       // 중심 (월드 좌표)
  sx: number; sy: number; sz: number // 크기
}

/** state: 0=꺼짐, 1=켜짐, 2=플리커 (M0에서는 전부 1) */
export interface LightSpot { x: number; z: number; state: 0 | 1 | 2 }

export interface ChunkData {
  cx: number; cz: number
  walls: Wall[]
  lights: LightSpot[]
}

const N = CHUNK / CELL // 5

const cache = new Map<string, ChunkData>()

export function chunkKey(cx: number, cz: number) {
  return cx + ',' + cz
}

export function getChunk(cx: number, cz: number): ChunkData {
  const key = chunkKey(cx, cz)
  let c = cache.get(key)
  if (!c) {
    c = genChunk(cx, cz)
    cache.set(key, c)
  }
  return c
}

/** boolean 배열에서 연속 구간 추출 */
function runs(cells: boolean[]): Array<[number, number]> {
  const out: Array<[number, number]> = []
  let a = -1
  for (let j = 0; j <= cells.length; j++) {
    const solid = j < cells.length && cells[j]
    if (solid && a < 0) a = j
    if (!solid && a >= 0) {
      out.push([a, j - 1])
      a = -1
    }
  }
  return out
}

/**
 * 청크 생성 규칙 (M0):
 * - 내부 그리드 라인(1..N-1)에만 벽 배치, 청크 경계에는 벽 없음
 *   → 청크 간 연결이 항상 보장되어 전역적으로 갇히지 않음
 * - 벽 런은 2~4셀 길이, 대부분 1셀 폭 통로(gap)를 가짐
 * - 낮은 확률의 기둥
 * - 스폰 청크(0,0) 중앙 8×8m는 비움
 */
function genChunk(cx: number, cz: number): ChunkData {
  const rnd = mulberry32(hash3(cx, cz, SEED))
  const ox = cx * CHUNK
  const oz = cz * CHUNK
  let walls: Wall[] = []

  for (let i = 1; i < N; i++) {
    // 세로 벽 (z 방향으로 뻗음)
    if (rnd() < 0.55) {
      const len = 2 + Math.floor(rnd() * 3) // 2~4
      const start = Math.floor(rnd() * (N - len + 1))
      const gap = rnd() < 0.75 ? start + Math.floor(rnd() * len) : -1
      const cells = new Array<boolean>(N).fill(false)
      for (let j = start; j < start + len; j++) if (j !== gap) cells[j] = true
      for (const [a, b] of runs(cells)) {
        walls.push({
          x: ox + i * CELL,
          z: oz + a * CELL + ((b - a + 1) * CELL) / 2,
          sx: WALL_T, sy: WALL_H, sz: (b - a + 1) * CELL,
        })
      }
    }
    // 가로 벽 (x 방향으로 뻗음)
    if (rnd() < 0.55) {
      const len = 2 + Math.floor(rnd() * 3)
      const start = Math.floor(rnd() * (N - len + 1))
      const gap = rnd() < 0.75 ? start + Math.floor(rnd() * len) : -1
      const cells = new Array<boolean>(N).fill(false)
      for (let j = start; j < start + len; j++) if (j !== gap) cells[j] = true
      for (const [a, b] of runs(cells)) {
        walls.push({
          x: ox + a * CELL + ((b - a + 1) * CELL) / 2,
          z: oz + i * CELL,
          sx: (b - a + 1) * CELL, sy: WALL_H, sz: WALL_T,
        })
      }
    }
  }

  // 기둥
  for (let gx = 0; gx < N; gx++) {
    for (let gz = 0; gz < N; gz++) {
      if (rnd() < 0.05) {
        walls.push({
          x: ox + (gx + 0.5) * CELL,
          z: oz + (gz + 0.5) * CELL,
          sx: 0.7, sy: WALL_H, sz: 0.7,
        })
      }
    }
  }

  // 스폰 클리어링
  if (cx === 0 && cz === 0) {
    walls = walls.filter(w =>
      !(w.x - w.sx / 2 < 14 && w.x + w.sx / 2 > 6 &&
        w.z - w.sz / 2 < 14 && w.z + w.sz / 2 > 6))
  }

  // 형광등: 격자 절반, 전부 켜짐. 벽·기둥과 겹치는 자리는 설치하지 않음.
  const LIGHT_R = 0.55
  const lights: LightSpot[] = []
  for (let gx = 0; gx < N; gx++) {
    for (let gz = 0; gz < N; gz++) {
      if ((gx + gz) % 2 !== 0) continue
      const lx = ox + (gx + 0.5) * CELL
      const lz = oz + (gz + 0.5) * CELL
      const blocked = walls.some(w =>
        lx > w.x - w.sx / 2 - LIGHT_R && lx < w.x + w.sx / 2 + LIGHT_R &&
        lz > w.z - w.sz / 2 - LIGHT_R && lz < w.z + w.sz / 2 + LIGHT_R)
      if (blocked) continue
      lights.push({ x: lx, z: lz, state: 1 })
    }
  }

  return { cx, cz, walls, lights }
}
