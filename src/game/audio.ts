/** Web Audio 절차 생성 사운드 — 외부 오디오 파일 불필요 */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let volMult = 1

/** 전체 볼륨 (0~1) */
export function setVolume(v: number) {
  volMult = v
  if (master) master.gain.value = 0.05 * v
}

function noiseBuffer(dur: number): AudioBuffer {
  const b = ctx!.createBuffer(1, Math.ceil(ctx!.sampleRate * dur), ctx!.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return b
}

/** 형광등 험 + 노이즈 베드. 사용자 클릭 핸들러에서 호출해야 함. */
export function initAudio() {
  if (ctx) {
    void ctx.resume()
    return
  }
  ctx = new AudioContext()

  master = ctx.createGain()
  master.gain.value = 0.05 * volMult
  master.connect(ctx.destination)

  // 120Hz 기본 험 + 240Hz 배음
  const o1 = ctx.createOscillator()
  o1.type = 'sine'
  o1.frequency.value = 120
  const g1 = ctx.createGain()
  g1.gain.value = 0.5
  o1.connect(g1); g1.connect(master); o1.start()

  const o2 = ctx.createOscillator()
  o2.type = 'sine'
  o2.frequency.value = 240
  const g2 = ctx.createGain()
  g2.gain.value = 0.15
  o2.connect(g2); g2.connect(master); o2.start()

  // 전기 노이즈 베드
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(2)
  src.loop = true
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1600
  bp.Q.value = 0.8
  const g3 = ctx.createGain()
  g3.gain.value = 0.06
  src.connect(bp); bp.connect(g3); g3.connect(master); src.start()

  // 느린 LFO로 험이 미세하게 흔들리게
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.13
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.012
  lfo.connect(lfoGain); lfoGain.connect(master.gain); lfo.start()
}

/** 카펫 발소리: 로우패스 노이즈 버스트 */
export function footstep(running: boolean) {
  if (!ctx || ctx.state !== 'running' || volMult <= 0) return
  const t = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(0.12)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 380 + Math.random() * 260
  const g = ctx.createGain()
  g.gain.setValueAtTime((running ? 0.3 : 0.18) * volMult, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.13)
  src.connect(lp); lp.connect(g); g.connect(ctx.destination)
  src.start(t)
}
