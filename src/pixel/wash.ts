// 그 무렵 칠(흰 가루·백악·죽은 금속) 위의 이름 — 테두리를 칠 빛으로 (S23, docs/pixel-plan.md — 지금 지도의 labelWash·map.css 의 on-dust·on-chalk·on-metal).
// 칠 자리는 scripts/pixel/periods.mjs 의 washGrid 가 4 단위 칸으로 구운 것(땅 위만 — virtual:pixel-period-wash)
export type WashKind = 'dust' | 'chalk' | 'metal'

export interface WashGrid {
  cell: number
  rows: number[][]
}

/** 이름 한 줄(가운데 줄, 지도 단위)의 칠 — 다섯 곳 가운데 셋 넘게 칠 위면 가장 많은 쪽(같으면 금속, 백악, 흰 가루 차례), 아니면 null */
export type LabelWash = (x0: number, x1: number, y: number) => WashKind | null

export function labelWashOf(grid: WashGrid): LabelWash {
  const rows = new Map<number, { x0: number; v: Uint8Array }>()
  for (const r of grid.rows) {
    let n = 0
    for (let i = 3; i < r.length; i += 2) n += r[i]
    const v = new Uint8Array(n)
    let k = 0
    for (let i = 2; i + 1 < r.length; i += 2) {
      v.fill(r[i], k, k + r[i + 1])
      k += r[i + 1]
    }
    rows.set(r[0], { x0: r[1], v })
  }
  const at = (x: number, y: number) => {
    const row = rows.get(Math.floor(y / grid.cell))
    if (!row) return 0
    const i = Math.floor(x / grid.cell) - row.x0
    return i >= 0 && i < row.v.length ? row.v[i] : 0
  }
  return (x0, x1, y) => {
    const n = 5
    const c = [0, 0, 0, 0]
    for (let i = 0; i < n; i++) c[at(x0 + ((i + 0.5) / n) * (x1 - x0), y)]++
    if ((c[1] + c[2] + c[3]) * 2 <= n) return null
    return c[3] >= c[2] && c[3] >= c[1] ? 'metal' : c[2] > c[1] ? 'chalk' : 'dust'
  }
}

/** '#rrggbb' 의 밝기 (0–255) */
export const luma = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)
}
