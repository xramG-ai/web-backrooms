import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { getChunk } from '../game/chunks'
import { mats } from '../game/textures'
import { CHUNK, WALL_H } from '../game/config'

// 공유 지오메트리 (모든 청크가 재사용)
const floorGeo = new THREE.PlaneGeometry(CHUNK, CHUNK)
floorGeo.rotateX(-Math.PI / 2)
const ceilGeo = new THREE.PlaneGeometry(CHUNK, CHUNK)
ceilGeo.rotateX(Math.PI / 2)

/**
 * 벽 UV를 월드 크기에 맞춰 스케일 → 텍스처가 늘어나지 않음.
 * BoxGeometry 정점 순서: +x(0-3), -x(4-7), +y(8-11), -y(12-15), +z(16-19), -z(20-23)
 */
function scaleWallUVs(g: THREE.BoxGeometry, sx: number, sy: number, sz: number) {
  const uv = g.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < uv.count; i++) {
    let u = uv.getX(i)
    let v = uv.getY(i)
    if (i < 8) {
      u *= sz / 2; v *= sy / 3.2       // ±x면: 가로=sz
    } else if (i < 16) {
      u *= sx / 2; v *= sz / 2         // 윗면/아랫면
    } else {
      u *= sx / 2; v *= sy / 3.2       // ±z면: 가로=sx
    }
    uv.setXY(i, u, v)
  }
  uv.needsUpdate = true
}

export function ChunkMesh({ cx, cz }: { cx: number; cz: number }) {
  const data = useMemo(() => getChunk(cx, cz), [cx, cz])
  const ox = cx * CHUNK
  const oz = cz * CHUNK

  // 지오메트리는 청크 로컬 좌표로 베이크 — 플로팅 오리진과 결합해
  // GPU에는 항상 작은 좌표만 올라간다 (float32 정밀도 유지)
  const wallGeo = useMemo(() => {
    if (data.walls.length === 0) return null
    const gs = data.walls.map(w => {
      const g = new THREE.BoxGeometry(w.sx, w.sy, w.sz)
      scaleWallUVs(g, w.sx, w.sy, w.sz)
      g.translate(w.x - ox, w.sy / 2, w.z - oz)
      return g
    })
    const merged = mergeGeometries(gs)
    gs.forEach(g => g.dispose())
    return merged
  }, [data, ox, oz])

  const litGeo = useMemo(() => {
    if (data.lights.length === 0) return null
    const gs = data.lights.map(l => {
      // 원형 매립 조명
      const g = new THREE.CylinderGeometry(0.45, 0.45, 0.06, 20)
      g.translate(l.x - ox, WALL_H - 0.03, l.z - oz)
      return g
    })
    const merged = mergeGeometries(gs)
    gs.forEach(g => g.dispose())
    return merged
  }, [data, ox, oz])

  // 언마운트 시 병합 지오메트리 해제
  useEffect(() => () => {
    wallGeo?.dispose()
    litGeo?.dispose()
  }, [wallGeo, litGeo])

  return (
    <group position={[ox, 0, oz]}>
      <mesh geometry={floorGeo} material={mats.floor} position={[CHUNK / 2, 0, CHUNK / 2]} />
      <mesh geometry={ceilGeo} material={mats.ceil} position={[CHUNK / 2, WALL_H, CHUNK / 2]} />
      {wallGeo && <mesh geometry={wallGeo} material={mats.wall} />}
      {litGeo && <mesh geometry={litGeo} material={mats.lightOn} />}
    </group>
  )
}
