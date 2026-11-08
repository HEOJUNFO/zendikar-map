// 다각형을 픽셀 격자에 채운다 — 안티앨리어싱 없이, 픽셀 가운데가 다각형 안이면 칠한다 (짝홀 규칙).
// 한 영역(타일과 그 둘레)만 채울 수 있다 — 그 영역의 줄을 지나는 변만 모아 줄마다 교차점을 센다.
// (pixelfx 의 painter.poly 는 픽셀마다 모든 꼭짓점을 보니 해안선에는 쓰지 않는다 — docs/pixel-plan.md)
// 고리(rings)는 밖에서 받는다 — Worker 와 Node 시험 도구도 같은 함수를 쓴다.
import { ringBounds, type Bounds, type Ring } from '../../map/geometry.ts'

/** 지도 단위 → 픽셀: u 단위가 한 픽셀 (u = 4 면 2400×1700 지도가 600×425 픽셀) */
export interface Grid {
  w: number
  h: number
  /** 한 픽셀이 몇 지도 단위인가 */
  u: number
}

export const gridFor = (mapW: number, mapH: number, u: number): Grid => ({ w: Math.ceil(mapW / u), h: Math.ceil(mapH / u), u })

/** 격자 안의 사각 영역 (픽셀 칸 번호) */
export interface Region {
  x0: number
  y0: number
  w: number
  h: number
}

interface Edge {
  /** 이 변이 지나는 첫 줄과 마지막 줄 (픽셀 줄 번호, 끝 포함) */
  r0: number
  r1: number
  /** 줄 r 의 가운데 높이에서 x(지도 단위) = x0 + (yc - y0) * dxdy */
  x0: number
  y0: number
  dxdy: number
}

/** 고리마다 단계마다 변 목록은 한 번만 만든다 */
const edgeCache = new WeakMap<Ring, Map<number, Edge[]>>()
const boundsCache = new WeakMap<Ring, Bounds>()

function edgesOf(ring: Ring, g: Grid): Edge[] {
  let byU = edgeCache.get(ring)
  if (!byU) edgeCache.set(ring, (byU = new Map()))
  const hit = byU.get(g.u)
  if (hit) return hit
  const out: Edge[] = []
  const n = ring.length
  for (let i = 0; i < n; i++) {
    const [ax, ay] = ring[i]
    const [bx, by] = ring[(i + 1) % n]
    if (ay === by) continue
    const [lx, ly, hx, hy] = ay < by ? [ax, ay, bx, by] : [bx, by, ax, ay]
    // 줄 r 의 가운데 yc = (r + 0.5) u 가 [ly, hy) 안인 줄만 — 꼭짓점이 두 번 세어지지 않는다
    const r0 = Math.max(0, Math.ceil(ly / g.u - 0.5))
    const r1 = Math.min(g.h - 1, Math.ceil(hy / g.u - 0.5) - 1)
    if (r1 < r0) continue
    out.push({ r0, r1, x0: lx, y0: ly, dxdy: (hx - lx) / (hy - ly) })
  }
  byU.set(g.u, out)
  return out
}

function boundsOf(ring: Ring): Bounds {
  let b = boundsCache.get(ring)
  if (!b) boundsCache.set(ring, (b = ringBounds(ring)))
  return b
}

/**
 * 고리 하나를 영역 안에서 짝홀 규칙으로 채운다 — 안인 픽셀마다 paint(i) (i = 영역 안의 줄 × 영역 폭 + 칸).
 * 고리마다 따로 짝홀이라, 겹치는 고리(섬 위의 섬)는 뒤에 칠한 것이 이긴다.
 * 영역 밖의 변도 그 줄을 지나면 센다 — 그래야 영역 안의 짝홀이 세계 전체를 한 번에 칠한 것과 같다.
 */
export function fillRing(ring: Ring, g: Grid, region: Region, paint: (i: number) => void): void {
  const { x0: rx, y0: ry, w: rw, h: rh } = region
  const b = boundsOf(ring)
  // 영역의 줄 범위와 고리의 높이가 겹치지 않으면 칠할 것이 없다 (가로로 영역 밖이면 칠할 칸이 없다)
  if (b.y1 < ry * g.u || b.y0 > (ry + rh) * g.u || b.x1 < rx * g.u || b.x0 > (rx + rw) * g.u) return
  const rEnd = ry + rh - 1
  const edges = edgesOf(ring, g).filter((e) => e.r1 >= ry && e.r0 <= rEnd)
  if (!edges.length) return
  const xs: number[] = []
  const cEnd = rx + rw - 1
  for (let r = ry; r <= rEnd; r++) {
    const yc = (r + 0.5) * g.u
    xs.length = 0
    for (const e of edges) if (e.r0 <= r && e.r1 >= r) xs.push(e.x0 + (yc - e.y0) * e.dxdy)
    if (xs.length < 2) continue
    xs.sort((a, b) => a - b)
    const row = (r - ry) * rw
    for (let k = 0; k + 1 < xs.length; k += 2) {
      // 칸 c 의 가운데 (c + 0.5) u 가 [xa, xb) 안
      const c0 = Math.max(rx, Math.ceil(xs[k] / g.u - 0.5))
      const c1 = Math.min(cEnd, Math.ceil(xs[k + 1] / g.u - 0.5) - 1)
      for (let c = c0; c <= c1; c++) paint(row + c - rx)
    }
  }
}
