import * as THREE from 'three'

/** 렌더 루프에서 매 프레임 갱신되는 전역 상태 (React state 밖) */
export const game = {
  canvas: null as HTMLCanvasElement | null,
  pos: new THREE.Vector3(10, 1.62, 10), // 스폰: 청크(0,0) 중앙
  vel: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  origin: new THREE.Vector3(),  // 플로팅 오리진 (렌더 기준점, 월드 좌표)
  walked: 0,                    // 누적 보행 거리 (m) — 논리 셀 전이·문 스케줄러용
  // 설정
  sensMult: 1,   // 마우스 감도 배율
  dof: true,     // 거리 블러 on/off
  fov: 90,       // 시야각
}
