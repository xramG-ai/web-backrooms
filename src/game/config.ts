// ── 공간 파라미터 ──────────────────────────────
export const CHUNK = 20        // 청크 한 변 (m)
export const CELL = 4          // 청크 내부 그리드 셀 (m)
export const WALL_H = 3.2      // 물리 층고 (m)
export const WALL_T = 0.24     // 벽 두께 (m)
export const LOAD_RADIUS = 2   // 로드 반경 (청크 수) → 5×5
export const UNLOAD_RADIUS = 3 // 이 반경 밖에서만 해제 (히스테리시스 — 경계 왕복 히치 방지)

// ── 카메라 ────────────────────────────────────
export const FOV = 90          // 기본 시야각 (설정에서 70~110 조절)

// ── 플레이어 ──────────────────────────────────
export const EYE = 1.62        // 눈높이 (m)
export const CROUCH_EYE = 0.95 // 앉았을 때 눈높이 (m)
export const PLAYER_R = 0.35   // 충돌 반경 (m)
export const WALK = 1.9        // 걷기 속도 (m/s)
export const RUN = 4.0         // 달리기 속도 (m/s)
export const CROUCH_SPEED = 0.9 // 앉아 이동 속도 (m/s)
export const JUMP = 4.2        // 점프 초속 (m/s)
export const GRAV = 13         // 중력 (m/s²)

// ── 분위기 ────────────────────────────────────
export const FOG_COLOR = '#4a3f1e'
export const FOG_DENSITY = 0.11 // 안개는 감쇠, 원거리 차폐는 심도 블러가 담당

// ── 심도 블러 (10m 이상 흐려짐) ────────────────
export const DOF_FOCUS = 5.0
export const DOF_APERTURE = 0.0016
export const DOF_MAXBLUR = 0.012

// ── 시드 ──────────────────────────────────────
export const SEED = 20260714
