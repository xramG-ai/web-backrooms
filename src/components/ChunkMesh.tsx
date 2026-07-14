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

  const wallGeo = useMemo(() => {
    if (data.walls.length === 0) return null
    const gs = data.walls.map(w => {
      const g = new THREE.BoxGeometry(w.sx, w.sy, w.sz)
      scaleWallUVs(g, w.sx, w.sy, w.sz)
      g.translate(w.x, w.sy / 2, w.z)
      return g
    })
    const merged = mergeGeometries(gs)
    gs.forEach(g => g.dispose())
    return merged
  }, [data])

  const litGeo = useMemo(() => {
    if (data.lights.length === 0) return null
    const gs = data.lights.map(l => {
      // 원형 매립 조명
      const g = new THREE.CylinderGeometry(0.45, 0.45, 0.06, 20)
      g.translate(l.x, WALL_H - 0.03, l.z)
      return g
    })
    const merged = mergeGeometries(gs)
    gs.forEach(g => g.dispose())
    return merged
  }, [data])

  // 언마운트 시 병합 지오메트리 해제
  useEffect(() => () => {
    wallGeo?.dispose()
    litGeo?.dispose()
  }, [wallGeo, litGeo])

  const mx = cx * CHUNK + CHUNK / 2
  const mz = cz * CHUNK + CHUNK / 2

  return (
    <group>
      <mesh geometry={floorGeo} material={mats.floor} position={[mx, 0, mz]} />
      <mesh geometry={ceilGeo} material={mats.ceil} position={[mx, WALL_H, mz]} />
      {wallGeo && <mesh geometry={wallGeo} material={mats.wall} />}
      {litGeo && <mesh geometry={litGeo} material={mats.lightOn} />}
    </group>
  )
}
