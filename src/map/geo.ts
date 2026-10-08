// scripts/geo/extract_geo.py 가 만든 지형 데이터를 렌더링용 형태로 다듬는다.
import coastlines from '../data/geo/coastlines.json'
import features from '../data/geo/features.json'
import { chaikin, hashSeed, inkWobble, pointInRing, ringBounds, simplifyRing, type Bounds, type Point, type Ring } from './geometry'

export const MAP_WIDTH = coastlines.width
export const MAP_HEIGHT = coastlines.height

export type LandmassId = keyof typeof coastlines.landmasses

const toRing = (pts: number[][]): Ring => pts.map(([x, y]) => [x, y] as Point)

/** 계단을 펴고 펜 떨림을 아주 약하게 준 해안선 */
const inked = (id: string, pts: number[][], wobble = 0.6): Ring =>
  inkWobble(chaikin(toRing(pts), 1), hashSeed(id), wobble)

export interface Landmass {
  id: string
  ring: Ring
  /** 해안 물결선용 — 바깥 물결은 해안의 잔굴곡을 따르지 않는 편이 자연스럽다 */
  smooth: Ring
  bounds: Bounds
}

export const landmasses: Landmass[] = [
  ...Object.entries(coastlines.landmasses).map(([id, pts]) => ({ id, ring: inked(id, pts) })),
  ...Object.entries(coastlines.islets).map(([id, pts]) => ({ id, ring: inked(id, pts, 0.3) })),
].map((l) => {
  // 세지리처럼 지도 위로 이어지는 땅은 보이는 범위로 자른다 (확대 맞춤에 쓴다)
  const b = ringBounds(l.ring)
  return { ...l, smooth: chaikin(simplifyRing(l.ring, 3.5), 2), bounds: { ...b, y0: Math.max(0, b.y0) } }
})

export const landmassById = new Map(landmasses.map((l) => [l.id, l]))

export const forests: Ring[] = features.forests.map((pts, i) => inked(`forest-${i}`, pts, 1.2))

/** 육지 안의 물 (Halimar 분지, Bojuka Bay, Jeft 호수, Glasspool) */
export const inlandWaters: Ring[] = Object.entries(features.waters).map(([id, pts]) =>
  // 꼭짓점이 몇 개뿐인 도형(육각형 Glasspool)은 모서리를 살린다
  pts.length <= 8 ? toRing(pts) : inked(id, pts, 0.4),
)
const inlandWaterBounds = inlandWaters.map(ringBounds)
const inBounds = (b: Bounds, x: number, y: number) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1

/** 정확한 물 판정 — 해안선 다각형 밖이거나 육지 안의 물 안 (래스터는 2 단위 격자라 하구·물가 절벽 자리를 잡기엔 거칠다) */
export function wetAt(x: number, y: number): boolean {
  // 범위 상자로 먼저 거른다 (육지 상자의 위쪽은 지도 위로 잘려 있어 보지 않는다)
  const onLand = landmasses.some((l) => x >= l.bounds.x0 && x <= l.bounds.x1 && y <= l.bounds.y1 && pointInRing(x, y, l.ring))
  return !onLand || inlandWaters.some((w, i) => inBounds(inlandWaterBounds[i], x, y) && pointInRing(x, y, w))
}

/** 깊은 확대에서 그리는 모양 — 해안·숲·육지 안의 물을 한 번 더 다듬는다 (chaikin 2 번). 지역 상세(자식 지도였던 그림)가 이 모양에 맞춰 그려졌다 */
export interface DeepRings {
  /** landmasses 와 같은 차례 */
  lands: Ring[]
  forests: Ring[]
  inland: Ring[]
  landBounds: Bounds[]
  forestBounds: Bounds[]
  inlandBounds: Bounds[]
}
let deep: DeepRings | null = null
export function deepRings(): DeepRings {
  if (deep) return deep
  const lands = landmasses.map((l) => chaikin(l.ring, 2))
  const fs = forests.map((r) => chaikin(r, 2))
  const inland = inlandWaters.map((r) => chaikin(r, 2))
  deep = { lands, forests: fs, inland, landBounds: lands.map(ringBounds), forestBounds: fs.map(ringBounds), inlandBounds: inland.map(ringBounds) }
  return deep
}
