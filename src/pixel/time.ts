// 시점별 지도 (S6, docs/pixel-plan.md) — 픽셀 지도는 사가·페이즈 보기 없이 시점(?time=1..6, 2009 … 2023)만 연다.
// 시점마다 그 단계(timeline.ts 의 periodLevel)의 바탕을 그리고(타일 — raster/period.ts), 사가에 매인 대지 카드를 그 시점에만 싣고(CardMark.times),
// 장소 표시를 바꾸거나(폐허) 숨기고(그 무렵 없던 곳), 물이 빠진 내해의 이름은 물빛 테두리를 뗀다. 데이터는 virtual:pixel-times (vite/pixelTerrain.ts).
import type { PixelMarks } from './marks/slim'

export interface TimeEntry {
  t: number
  /** 헤더 묶음 제목·단추 설명 (지금 지도의 TIMES) */
  name: string
  nameEn: string
  years: string
  /** 단추 글자 (해) */
  button: string
  /** 그 시점의 바탕 단계 */
  level: number
}

/** 단계마다의 주 스레드 몫 (scripts/pixel/periods.mjs 의 main) */
export interface LevelInfo {
  level: number
  /** 바뀐 자리 상자 [x0, y0, x1, y1, …] (지도 단위) — 타일이 여기에 닿을 때만 그 시점의 타일이다 */
  dirty: number[]
  /** 장소 id → 'ruin'(폐허 기호) · null(그 무렵 없던 곳 — 표시와 이름을 그리지 않는다) */
  placeMarks: [string, 'ruin' | null][]
  /** 물빛 테두리를 떼는 물 이름 (물이 빠진 내해) */
  dryLabels: string[]
  legend: string[]
}

export interface PixelTimes {
  times: TimeEntry[]
  levels: Record<string, LevelInfo>
  /** 작은 섬 위 기호의 그 땅 크기 (지도 단위, 넓이의 제곱근 — S15). 없으면 넉넉한 땅 */
  landSizes: Record<string, number>
  /** 하나뿐인 거대 헤드론의 몸통 (S18 — 이름이 되도록 비킨다): 몸통 크기(지도 단위), 가로 띠 상자 [x0, y0, x1, y1], 몸통을 모두 가리는 지역 상세 */
  singleHedrons: { id: string; size: number; bands: number[][]; masked: string[] }[]
}

/** 단계마다 이름이 되도록 비킬 거대 헤드론 몸통 — 몸통이 화면 SINGLE_SOFT_PX 이상인 단계만, 가장 깊은 단계(지역 상세가 나온다)에서는 그 지역 상세가 다 가리는 것은 빼고 (지금 지도의 singleHedronSoft) */
export function singleHedronSoft(list: PixelTimes['singleHedrons'], pxAt: readonly number[], detailLevel: number): { x0: number; y0: number; x1: number; y1: number }[][] {
  const SINGLE_SOFT_PX = 20
  return pxAt.map((px, level) =>
    list
      .filter((h) => h.size * px >= SINGLE_SOFT_PX && !(level >= detailLevel && h.masked.length))
      .flatMap((h) => h.bands.map(([x0, y0, x1, y1]) => ({ x0, y0, x1, y1 }))),
  )
}

/** 장소 패널의 '이 무렵' 한 줄 (지금 지도의 PeriodNote) */
export interface PeriodNoteSlim {
  id: string
  label: string
  basis: string
  estimate?: string
  mark?: 'ruin' | null
}

/** 주소의 시점 — 보이는 시점만 (지금 지도의 readView 와 같다: ?time 은 사가보다 앞선다). 없으면 null (페이즈를 끈 지도) */
export function readTime(search: string, times: readonly TimeEntry[]): number | null {
  const t = Number(new URLSearchParams(search).get('time'))
  return times.some((x) => x.t === t) ? t : null
}

/** 그 시점의 보기 — 카드 표시·장소 표시의 종류와 숨긴 장소. 시점이 없으면 원본 그대로 (이름 배치가 끔과 같은 묶음을 쓴다) */
export interface TimeMarks {
  marks: PixelMarks
  /** 그 무렵 없던 장소 — 이름 배치에는 남기고(지금 지도와 같이 이름 자리가 그대로) 그리지 않는다 */
  hidden: ReadonlySet<string>
  dry: ReadonlySet<string>
}

const NONE: ReadonlySet<string> = new Set()

export function timeMarks(base: PixelMarks, time: number | null, info: LevelInfo | undefined): TimeMarks {
  if (time === null) return { marks: { ...base, cards: base.cards.filter((c) => !c.times) }, hidden: NONE, dry: NONE }
  const pm = new Map(info?.placeMarks ?? [])
  const hidden = new Set([...pm].flatMap(([id, k]) => (k === null ? [id] : [])))
  return {
    marks: {
      ...base,
      points: base.points.map((p) => (pm.get(p.id) === 'ruin' ? { ...p, kind: 'ruin' as const } : p)),
      // 자리가 없는 장소와 하나인 카드는 그 장소의 표시 — 장소가 폐허면 그 기호도 (숨기지는 않는다 — 지금 지도와 같다)
      cards: base.cards.flatMap((c) => {
        if (c.times && !c.times.includes(time)) return []
        return c.place && pm.get(c.place) === 'ruin' ? [{ ...c, kind: 'ruin' as const }] : [c]
      }),
    },
    hidden,
    dry: new Set(info?.dryLabels ?? []),
  }
}

/**
 * 타일이 그 시점의 바뀐 자리에 닿는가 — 타일(지도 단위 상자)을 그림이 기준점에서 닿는 폭(18 픽셀)과 칸을 채우는 둘레(HALO 10)만큼 넓혀 본다.
 * 닿지 않는 타일은 바탕과 같은 바이트라 바탕 타일을 함께 쓴다
 */
export function touchesDirty(dirty: readonly number[], u: number, x0: number, y0: number, x1: number, y1: number): boolean {
  // 한 픽셀 ≤ 1 단위는 모양대로 그리는 봉우리(객체 다듬기 A1 — 밑동 위로 16.6 단위까지)가 바뀐 칸에서 걸쳐 나온다
  const pad = Math.max(30 * u, u <= 1 ? 24 : 0)
  for (let i = 0; i + 3 < dirty.length; i += 4) if (dirty[i] < x1 + pad && dirty[i + 2] > x0 - pad && dirty[i + 1] < y1 + pad && dirty[i + 3] > y0 - pad) return true
  return false
}

/** 이름 상자 묶음의 짧은 지문 (타일 열쇠 — 이름 상자가 같은 타일은 시점이 달라도 같은 타일이다) */
export function holesHash(h: Float32Array): string {
  const v = new Uint32Array(h.buffer, h.byteOffset, h.length)
  let a = 0x811c9dc5
  for (let i = 0; i < v.length; i++) {
    a ^= v[i]
    a = Math.imul(a, 0x01000193)
  }
  return `${v.length}.${(a >>> 0).toString(36)}`
}
