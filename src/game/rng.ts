/** 결정론적 시드 RNG (mulberry32) */
export function mulberry32(seed: number) {
  let a = seed | 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 3개 정수 → 32비트 해시 (청크 시드용) */
export function hash3(x: number, y: number, z: number): number {
  let h = 1779033703 ^ x
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul((h ^ y) ^ (h >>> 13), 3266489909)
  h = Math.imul((h ^ z) ^ (h >>> 16), 2246822507)
  h ^= h >>> 16
  return h >>> 0
}
