// 픽셀 지도가 채우는 고리 — 지금 지도의 geo.ts 를 그대로 쓴다 (고치지 않는다, docs/pixel-plan.md D3).
// 한 픽셀이 1 단위보다 작은 단계에서는 지금 지도의 깊은 확대처럼 한 번 더 다듬은 고리(deepRings — 지역 상세가 이 모양에 맞춰 그려졌다)를 쓴다.
import { deepRings, forests, inlandWaters, landmasses, MAP_HEIGHT, MAP_WIDTH } from '../map/geo'
import type { WorldRings } from './raster/world'

const NORMAL: WorldRings = {
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  lands: landmasses.map((l) => l.ring),
  forests,
  inland: inlandWaters,
}

let deep: WorldRings | null = null

/** 이 단계(u)가 채우는 고리 */
export function ringsFor(u: number): WorldRings {
  if (u >= 1) return NORMAL
  if (!deep) {
    const d = deepRings()
    deep = { width: MAP_WIDTH, height: MAP_HEIGHT, lands: d.lands, forests: d.forests, inland: d.inland }
  }
  return deep
}
