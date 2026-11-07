// 다각형을 픽셀 격자에 채운다 — 안티앨리어싱 없이, 픽셀 가운데가 다각형 안이면 칠한다 (짝홀 규칙).
// 줄마다 그 줄을 지나는 변만 보는 활성 변 목록(active edge table)이라 꼭짓점이 많아도 빠르다
// (pixelfx 의 painter.poly 는 픽셀마다 모든 꼭짓점을 보니 해안선에는 쓰지 않는다 — docs/pixel-plan.md).
// 고리(rings)는 밖에서 받는다 — geo.ts 를 직접 읽지 않아 Node 시험 도구도 같은 함수를 쓸 수 있다.
import type { Ring } from '../../map/geometry'

/** 지도 단위 → 픽셀: u 단위가 한 픽셀 (u = 4 면 2400×1700 지도가 600×425 픽셀) */
export interface Grid {
  w: number
  h: number
  /** 한 픽셀이 몇 지도 단위인가 */
  u: number
}

export const gridFor = (mapW: number, mapH: number, u: number): Grid => ({ w: Math.ceil(mapW / u), h: Math.ceil(mapH / u), u })

interface Edge {
  /** 이 변이 지나는 첫 줄과 마지막 줄 (픽셀 줄 번호, 끝 포함) */
  r0: number
  r1: number
  /** 줄 r 의 가운데 높이에서 x(지도 단위) = x0 + (yc - y0) * dxdy */
  x0: number
  y0: number
  dxdy: number
}

function edgesOf(ring: Ring, g: Grid): Edge[] {
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
  return out.sort((a, b) => a.r0 - b.r0)
}

/**
 * 고리 하나를 짝홀 규칙으로 채운다 — 안인 픽셀마다 paint(i) (i = 줄 × w + 칸).
 * 고리마다 따로 짝홀이라, 겹치는 고리(섬 위의 섬)는 뒤에 칠한 것이 이긴다.
 */
export function fillRing(ring: Ring, g: Grid, paint: (i: number) => void): void {
  const edges = edgesOf(ring, g)
  if (!edges.length) return
  const active: Edge[] = []
  const xs: number[] = []
  let next = 0
  const rEnd = Math.max(...edges.map((e) => e.r1))
  for (let r = edges[0].r0; r <= rEnd; r++) {
    while (next < edges.length && edges[next].r0 === r) active.push(edges[next++])
    for (let k = active.length - 1; k >= 0; k--) if (active[k].r1 < r) active.splice(k, 1)
    if (!active.length) {
      if (next >= edges.length) break
      continue
    }
    const yc = (r + 0.5) * g.u
    xs.length = 0
    for (const e of active) xs.push(e.x0 + (yc - e.y0) * e.dxdy)
    xs.sort((a, b) => a - b)
    const row = r * g.w
    for (let k = 0; k + 1 < xs.length; k += 2) {
      // 칸 c 의 가운데 (c + 0.5) u 가 [xa, xb) 안
      const c0 = Math.max(0, Math.ceil(xs[k] / g.u - 0.5))
      const c1 = Math.min(g.w - 1, Math.ceil(xs[k + 1] / g.u - 0.5) - 1)
      for (let c = c0; c <= c1; c++) paint(row + c)
    }
  }
}
