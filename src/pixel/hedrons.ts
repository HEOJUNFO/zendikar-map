// 떠 있는 헤드론이 이름을 비킨다 (S20, docs/pixel-plan.md) — 지금 지도의 hedronYield 를 단계마다 주 스레드에서 그대로 돌린다 (src/map/hedronYield.ts 의 yieldHedrons —
// 순수한 셈). 이름 자리는 그대로이고 되먹이지 않는다. 비킨 모습은 타일마다 그 타일에 닿는 헤드론 몫만 Worker 에 넘기고 타일 열쇠에 붙인다
// (Worker 는 그 타일에 닿는 이름 상자만 받아 스스로 셈하면 타일 경계에 걸친 헤드론을 두 타일이 다르게 비킨다).
// 입력은 scripts/pixel/terrain.mjs 의 hedronYield (virtual:pixel-hedrons — 무리마다 있어도 되는 자리의 비트, 헤드론마다 몸통 귀퉁이)
import { glyphHoles } from '../map/glyphSpans'
import { HEDRON_DRIFT, yieldHedronsJob, type HedronMove, type YieldHedron } from '../map/hedronYield'
import type { Box } from './labels/layout'
import type { ChildMeta } from './raster/child'

export interface PixelHedronYield {
  /** 비트 칸 (지도 단위) */
  cell: number
  clusters: { id: string; x0: number; y0: number; w: number; h: number; bits: string }[]
  /** 모든 헤드론 — 하나뿐인 것·땅에 쓰러진 것은 비키지 않지만 옮겨 간 헤드론이 그 몸통과 떨어지게 셈에 든다 */
  items: { id: string; c: string; x: number; y: number; lift: number; corners: [number, number][]; single?: 1; grounded?: 1 }[]
}

/** 타일에 넘기는 비킨 모습 — 헤드론 id → 옮김(지도 단위), 'hide' 옅어져 사라짐 */
export type HedronMoves = ReadonlyMap<string, HedronMove>

/** 지금 지도의 HOLE_CELL */
const HOLE_CELL = 48
/** 헤드론을 그리는 단계 — 한 픽셀이 이만큼(지도 단위) 이하 (raster/terrain.ts 의 TERRAIN_FROM.hedrons — 그 모듈은 Worker 쪽이라 가져오지 않는다) */
export const HEDRON_FROM_U = 2

export interface HedronYielder {
  /**
   * 단계 하나의 비킨 모습을 셈하는 일 — next() 한 번이 헤드론 하나만큼이라 한가한 틈마다 조금씩 (지금 지도의 yieldHedronsJob — 한 번에 셈하면 한 단계에 20ms 남짓).
   * names: 그 단계의 이름 상자, marks: 장소·카드 기호 자리, shun: 그 단계에 그리는 그림 상자, px: 그 단계의 화면 px/단위, deepest: 지역 상세가 나오는 단계
   */
  movesJob(names: readonly Box[], marks: readonly (readonly [number, number])[], shun: readonly Box[], px: number, deepest: boolean): Generator<void, Map<string, HedronMove>, void>
  /** 헤드론이 그리는 자리(옮기기 전과 뒤, 그림자까지)가 상자에 닿는 헤드론 */
  touching(moves: HedronMoves, x0: number, y0: number, x1: number, y1: number): string[]
}

/** 일을 끝까지 (Node 시험) */
export function runJob<T>(job: Generator<void, T, void>): T {
  for (;;) {
    const r = job.next()
    if (r.done) return r.value
  }
}

export function hedronYielder(data: PixelHedronYield, childMeta: ChildMeta): HedronYielder {
  const bits = new Map(
    data.clusters.map((c) => {
      const raw = atob(c.bits)
      const b = new Uint8Array(raw.length)
      for (let i = 0; i < raw.length; i++) b[i] = raw.charCodeAt(i)
      return [c.id, { ...c, b }] as const
    }),
  )
  const items: (YieldHedron & { c: string })[] = data.items.map((h) => ({ key: h.id, c: h.c, x: h.x, y: h.y, lift: h.lift, grounded: Boolean(h.grounded), single: Boolean(h.single), corners: h.corners }))
  // 무리의 테두리 (지금 지도의 ok — 셈은 빌드에서 구운 비트로)
  const ok = (x: number, y: number, h: YieldHedron) => {
    const c = bits.get((h as YieldHedron & { c: string }).c)
    if (!c) return false
    const i = Math.floor((x - c.x0) / data.cell)
    const j = Math.floor((y - c.y0) / data.cell)
    if (i < 0 || j < 0 || i >= c.w || j >= c.h) return false
    const k = j * c.w + i
    return ((c.b[k >> 3] >> (k & 7)) & 1) === 1
  }
  // 지역 상세가 나오는 단계에서 그 가장자리 띠 안쪽에 몸통이 다 든 헤드론은 가려지니 그대로 (지금 지도의 maskedByDetail)
  const masked = new Set(
    items
      .filter((h) => !h.single && !h.grounded)
      .filter((h) =>
        childMeta.maps.some(
          (m) =>
            m.parent === null &&
            h.corners.every(([cx, cy]) => {
              const x = h.x + cx
              const y = h.y + cy - h.lift
              return Math.min(x - m.b[0], m.b[2] - x, y - HEDRON_DRIFT - m.b[1], m.b[3] - y) >= m.band
            }),
        ),
      )
      .map((h) => h.key),
  )
  // 그리는 자리 — 몸통(띄운 만큼 위, 떠다니는 폭까지)과 그림자 (paintHedron 의 reach 와 같은 몫으로 넉넉히)
  const reach = new Map(
    items.map((h) => {
      const xs = h.corners.map((p) => p[0])
      const ys = h.corners.map((p) => p[1])
      // 그림자 (paintHedron — 가운데 (x+2, y), 반지름 5.5×1.8) 까지 (검토: 몸통 상자만으로는 그림자 오른쪽이 빠졌다)
      return [
        h.key,
        {
          x0: Math.min(h.x + Math.min(...xs), h.x - 3.5) - 3,
          y0: h.y + Math.min(...ys) - h.lift - HEDRON_DRIFT - 3,
          x1: Math.max(h.x + Math.max(...xs), h.x + 7.5) + 3,
          y1: Math.max(h.y + Math.max(...ys), h.y + 1.8) + 3,
        },
      ] as const
    }),
  )
  return {
    movesJob(names, marks, shun, px, deepest) {
      const r = 8 / px
      const markBoxes = marks.map(([x, y]) => ({ x0: x - r, y0: y - r, x1: x + r, y1: y + r }))
      const fixed = (h: YieldHedron) => deepest && masked.has(h.key)
      return yieldHedronsJob(items, glyphHoles(names, HOLE_CELL), px, ok, fixed, glyphHoles(markBoxes, HOLE_CELL), glyphHoles(shun, HOLE_CELL))
    },
    touching(moves, x0, y0, x1, y1) {
      const out: string[] = []
      for (const [id, m] of moves) {
        const b = reach.get(id)
        if (!b) continue
        const dx = m === 'hide' ? 0 : m.dx
        const dy = m === 'hide' ? 0 : m.dy
        const hit = (ox: number, oy: number) => b.x1 + ox > x0 && b.x0 + ox < x1 && b.y1 + oy > y0 && b.y0 + oy < y1
        if (hit(0, 0) || hit(dx, dy)) out.push(id)
      }
      return out.sort()
    },
  }
}
