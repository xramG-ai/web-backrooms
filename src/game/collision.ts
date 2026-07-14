import { CHUNK } from './config'
import { getChunk } from './chunks'

export interface Box {
  minx: number; maxx: number
  minz: number; maxz: number
}

/** 플레이어 주변 3×3 청크에서 가까운 벽 AABB 수집 */
export function gatherBoxes(x: number, z: number): Box[] {
  const cx = Math.floor(x / CHUNK)
  const cz = Math.floor(z / CHUNK)
  const out: Box[] = []
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      for (const w of getChunk(cx + i, cz + j).walls) {
        const hx = w.sx / 2
        const hz = w.sz / 2
        if (Math.abs(w.x - x) < hx + 2.5 && Math.abs(w.z - z) < hz + 2.5) {
          out.push({ minx: w.x - hx, maxx: w.x + hx, minz: w.z - hz, maxz: w.z + hz })
        }
      }
    }
  }
  return out
}

/** 축 분리 이동 + 슬라이드 충돌 (원 vs AABB 근사) */
export function moveXZ(
  px: number, pz: number,
  dx: number, dz: number,
  boxes: Box[], r: number,
): [number, number] {
  let nx = px + dx
  for (const b of boxes) {
    if (pz > b.minz - r && pz < b.maxz + r && nx > b.minx - r && nx < b.maxx + r) {
      nx = px < (b.minx + b.maxx) / 2 ? b.minx - r : b.maxx + r
    }
  }
  let nz = pz + dz
  for (const b of boxes) {
    if (nx > b.minx - r && nx < b.maxx + r && nz > b.minz - r && nz < b.maxz + r) {
      nz = pz < (b.minz + b.maxz) / 2 ? b.minz - r : b.maxz + r
    }
  }
  return [nx, nz]
}
