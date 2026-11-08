// 지역 상세 손그림의 잉크 자리 (S16, docs/pixel-plan.md) — scripts/pixel/childink.mjs 가 구운 것을 풀어, 상자가 그 보기의 잉크 칸에 닿는지 본다.
// 가장 깊은 단계의 그림 이름이 손그림 건물·벼랑·물가 빗금 위를 비킨다 (layout.ts 의 LayoutOptions.ink)
import type { Box } from './layout'

/** 구운 꼴 — rows[i] = [cy, cx0, mask, len, mask, len, …] (mask 는 보기 비트, 0 은 빈 칸), 칸 한 변 cell 지도 단위 */
export interface ChildInk {
  cell: number
  rows: number[][]
}

export interface InkMask {
  /** 상자가 그 보기(0 끔, 1–6 시점)의 잉크 칸에 닿는가 */
  hits(b: Box, view: number): boolean
  /** 상자가 덮는 그 보기의 잉크 칸 수 */
  count(b: Box, view: number): number
}

export function inkMask(ink: ChildInk): InkMask {
  const cell = ink.cell
  const rows = new Map<number, { x0: number; m: Uint8Array }>()
  for (const r of ink.rows) {
    let n = 0
    for (let i = 3; i < r.length; i += 2) n += r[i]
    const m = new Uint8Array(n)
    let k = 0
    for (let i = 2; i + 1 < r.length; i += 2) {
      m.fill(r[i], k, k + r[i + 1])
      k += r[i + 1]
    }
    rows.set(r[0], { x0: r[1], m })
  }
  const scan = (b: Box, view: number, first: boolean) => {
    const bit = 1 << view
    const y0 = Math.floor(b.y0 / cell)
    const y1 = Math.ceil(b.y1 / cell) - 1
    const x0 = Math.floor(b.x0 / cell)
    const x1 = Math.ceil(b.x1 / cell) - 1
    let n = 0
    for (let y = y0; y <= y1; y++) {
      const row = rows.get(y)
      if (!row) continue
      const a = Math.max(x0, row.x0)
      const z = Math.min(x1, row.x0 + row.m.length - 1)
      for (let x = a; x <= z; x++)
        if (row.m[x - row.x0] & bit) {
          if (first) return 1
          n++
        }
    }
    return n
  }
  return {
    hits: (b, view) => scan(b, view, true) > 0,
    count: (b, view) => scan(b, view, false),
  }
}
