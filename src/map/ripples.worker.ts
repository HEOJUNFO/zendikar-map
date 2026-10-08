// 해안 물결선을 메인 스레드 밖에서 만든다 — 첫 화면을 그리는 동안 계산이 끌기·확대를 막지 않게 (ripples.ts 의 coastRipples)
import { coastOffsetPaths } from './ripples'
import type { Ring } from './geometry'

self.onmessage = (e: MessageEvent<{ rings: Ring[]; levels: number[]; minY: number }>) => {
  const { rings, levels, minY } = e.data
  self.postMessage(coastOffsetPaths(rings, levels, minY))
}
