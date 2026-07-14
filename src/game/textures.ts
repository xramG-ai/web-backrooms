import * as THREE from 'three'

/** 캔버스로 절차 생성하는 텍스처 — 외부 자산 불필요 */
function canvasTex(draw: (c: CanvasRenderingContext2D, s: number) => void, size = 256): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const c = cv.getContext('2d')!
  draw(c, size)
  const t = new THREE.CanvasTexture(cv)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

function addNoise(c: CanvasRenderingContext2D, s: number, amount: number) {
  const img = c.getImageData(0, 0, s, s)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount
    d[i] += n
    d[i + 1] += n
    d[i + 2] += n * 0.8
  }
  c.putImageData(img, 0, 0)
}

// 벽지: 텍스처 1장 = 가로 2m × 세로 3.2m (UV 스케일 기준)
const wallTex = canvasTex((c, s) => {
  c.fillStyle = '#c9b46a'
  c.fillRect(0, 0, s, s)
  c.fillStyle = '#bda754'
  for (let x = 0; x < s; x += s / 8) c.fillRect(x, 0, s / 16, s)
  // 미세한 가로 얼룩
  c.fillStyle = 'rgba(90,75,30,0.06)'
  for (let i = 0; i < 14; i++) {
    c.fillRect(0, Math.random() * s, s, 1 + Math.random() * 3)
  }
  addNoise(c, s, 16)
})

// 카펫: 1장 = 2m × 2m
const floorTex = canvasTex((c, s) => {
  c.fillStyle = '#8a7a48'
  c.fillRect(0, 0, s, s)
  for (let i = 0; i < 40; i++) {
    c.fillStyle = `rgba(50,42,20,${0.03 + Math.random() * 0.05})`
    c.beginPath()
    c.arc(Math.random() * s, Math.random() * s, 8 + Math.random() * 30, 0, Math.PI * 2)
    c.fill()
  }
  addNoise(c, s, 34)
})
floorTex.repeat.set(10, 10) // 20m 평면 → 2m 주기

// 천장 타일: 1장 = 2m × 2m (1m 격자)
const ceilTex = canvasTex((c, s) => {
  c.fillStyle = '#d6d0b2'
  c.fillRect(0, 0, s, s)
  c.strokeStyle = '#9a946f'
  c.lineWidth = 2
  for (let i = 0; i <= 2; i++) {
    const p = (i * s) / 2
    c.beginPath(); c.moveTo(p, 0); c.lineTo(p, s); c.stroke()
    c.beginPath(); c.moveTo(0, p); c.lineTo(s, p); c.stroke()
  }
  addNoise(c, s, 10)
})
ceilTex.repeat.set(10, 10)

export const mats = {
  wall: new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.92 }),
  floor: new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.98 }),
  ceil: new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 0.95 }),
  lightOn: new THREE.MeshBasicMaterial({ color: '#fff6cd' }),
  lightDead: new THREE.MeshStandardMaterial({ color: '#45413a', roughness: 0.6 }),
}
