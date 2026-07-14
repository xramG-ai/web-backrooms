import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { DOF_FOCUS, DOF_APERTURE, DOF_MAXBLUR } from '../game/config'
import { game } from '../game/state'

/**
 * 심도 블러: 초점 ~5m, 10m 이상은 뚜렷하게 흐려짐.
 * 안개(감쇠)와 함께 "정면 유효 시야 10m"를 구현하는 두 번째 축.
 */
export function Effects() {
  const { gl, scene, camera, size } = useThree()

  const { composer, bokeh } = useMemo(() => {
    const c = new EffectComposer(gl)
    c.addPass(new RenderPass(scene, camera))
    const b = new BokehPass(scene, camera, {
      focus: DOF_FOCUS,
      aperture: DOF_APERTURE,
      maxblur: DOF_MAXBLUR,
    })
    c.addPass(b)
    c.addPass(new OutputPass())
    return { composer: c, bokeh: b }
  }, [gl, scene, camera])

  useEffect(() => {
    composer.setSize(size.width, size.height)
    composer.setPixelRatio(gl.getPixelRatio())
  }, [composer, size, gl])

  useEffect(() => () => composer.dispose(), [composer])

  // 우선순위 1: R3F 기본 렌더 대신 컴포저가 렌더
  useFrame(() => {
    bokeh.enabled = game.dof
    composer.render()
  }, 1)

  return null
}
