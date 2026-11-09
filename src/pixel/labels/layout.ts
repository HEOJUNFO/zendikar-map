// 픽셀 지도의 이름 배치 — 지금 지도의 src/map/labels.ts(placeLabels·layoutAreaLabels)와 ZendikarMap.tsx 의 차례를 복사해 픽셀 지도에 맞췄다 (docs/pixel-plan.md D3 — 지금 지도의 모듈은 고치지 않는다).
// 다른 점: 확대가 단계뿐이라 단계마다 화면 px/단위가 하나다 (tier 안의 배율 범위가 없다). 글자는 픽셀 글꼴(12px·24px)이라 폭을 글꼴에서 잰 표로 정확히 센다.
// 바탕 지형·헤드론·페이즈 그림·지역 상세를 비키는 셈은 아직 없다 (그것을 그리는 S4·S7 에서 더한다).
// DOM 이 없어 Node 시험(scripts/qa/pixel-labels.mjs)도 그대로 부른다
import type { Point } from '../../data/types.ts'
import type { AreaMark, CardMark, ContinentMark, PixelMarks, PointMark } from '../marks/slim.ts'
import { ADVANCE_12 } from './advance.ts'

export type Lang = 'en' | 'ko'
export type Anchor = 'right' | 'left' | 'above' | 'below'

export interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

/** 한국어 표기는 공식 한국어 카드에 인쇄된 것이 있을 때만 (src/map/names.ts 의 displayName 과 같다) */
export const displayName = (l: { name: string; nameKo?: string }, lang: Lang) => (lang === 'ko' && l.nameKo ? l.nameKo : l.name)

/** 글자 폭 (px) — 글꼴 크기 12px 의 정수 배. 표에 없는 글자(한글 음절·자모 …)는 한 칸 12px */
export function textWidthPx(text: string, fontPx = POINT_FONT_PX): number {
  let w = 0
  for (const ch of text) w += ADVANCE_12.get(ch.codePointAt(0) ?? 0) ?? 12
  return (w * fontPx) / 12
}

/** 지점·카드 이름의 글꼴 크기 (px) — 픽셀 글꼴의 설계 크기 */
export const POINT_FONT_PX = 12
/** 이름 상자의 높이 — 글꼴의 줄 높이 (올림 12 + 내림 2) */
export const LINE_PX = 14
/** 기호 가운데에서 이름까지 (px) — 기호(7 픽셀 × 2)의 반 + 틈 */
export const MARK_GAP_PX = 9
/** 기호가 막는 자리의 반지름 (px) */
const MARK_R_PX = 7
/** 그린 기호의 반 (px) — .px-mark 18px (윤곽까지) */
const MARK_DRAWN_PX = 9
/** 카드 기호끼리, 또는 보이는 지점 기호와 이만큼(px) 가까우면 그 단계에서는 카드 기호를 숨긴다 (지금 지도의 CARD_GAP_PX 11 을 기호 크기에 맞춰) */
const CARD_GAP_PX = 14
/** 카드 이름은 이름 있는 장소보다 뒤에 자리를 잡는다 */
const CARD_PROMINENCE = 2
/** 대륙명 — 개관 가까이(한 픽셀이 4 단위 이상)에만. 24px, 세계가 화면에 작게 담기는 단계(휴대폰 개관 — 0.2 px/단위 아래)에서는 12px */
const CONTINENT_LAST_LEVEL = 2
export const continentFontPx = (px: number) => (px < 0.2 ? 12 : 24)
/** 대륙명 자간 (px) — 글꼴 크기의 1/6 */
export const continentTrackingPx = (px: number) => continentFontPx(px) / 6

/**
 * 단계마다 이름을 보여 줄 최소 prominence — 지금 지도의 SHOW_FROM([3, 3, 2, 1, 0], tier 경계 0.95·1.6·2.6 px/단위)을
 * 단계의 화면 배율(0.125 … 8 px/단위)에 옮겼다
 */
export const SHOW_FROM = [3, 3, 3, 2, 1, 0, 0]

/** 지역·물 이름 — 지금 지도의 AREA_STYLE 의 base·showPx (지도 단위 크기 × 배율이 showPx 보다 작으면 숨긴다). 글자는 12px, 지도에서 24px 를 넘게 커지면 24px */
const AREA_STYLE: Record<number, { base: number; showPx: number }> = {
  3: { base: 24, showPx: 0 },
  2: { base: 18, showPx: 9 },
  1: { base: 15, showPx: 9.5 },
  0: { base: 13, showPx: 10.5 },
}
export const areaFontPx = (prominence: number, px: number): number | null => {
  const s = AREA_STYLE[prominence] ?? AREA_STYLE[0]
  if (s.base * px < s.showPx) return null
  return s.base * px >= 24 ? 24 : 12
}
/** 지역 이름의 자간 (px, 글자마다) */
export const AREA_TRACKING_PX = 1

const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
/** a 의 넓이 가운데 b 가 덮는 몫 */
const coverOf = (a: Box, b: Box) =>
  (Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0))) / Math.max(1e-9, (a.x1 - a.x0) * (a.y1 - a.y0))
/** 대륙명 상자가 그림 상자를 이만큼 넘게 덮으면 그 그림은 글자 밑에 깔린다 — 그 단계에서 숨긴다 (R9) */
const UNDER_CONTINENT = 0.4

/** 상자 격자 — 가까운 칸의 상자만 본다 (labels.ts 의 boxGrid 와 같다) */
function boxGrid(cell: number) {
  const cells = new Map<number, Box[]>()
  const key = (cx: number, cy: number) => (cy + 32768) * 65536 + cx + 32768
  const range = (b: Box) => [Math.floor(b.x0 / cell), Math.floor(b.y0 / cell), Math.floor(b.x1 / cell), Math.floor(b.y1 / cell)]
  const big: Box[] = []
  return {
    add(b: Box) {
      const [x0, y0, x1, y1] = range(b)
      if ((x1 - x0 + 1) * (y1 - y0 + 1) > 256) {
        big.push(b)
        return
      }
      for (let cy = y0; cy <= y1; cy++)
        for (let cx = x0; cx <= x1; cx++) {
          const k = key(cx, cy)
          const list = cells.get(k)
          if (list) list.push(b)
          else cells.set(k, [b])
        }
    },
    hits(b: Box): boolean {
      if (big.some((p) => overlaps(p, b))) return true
      const [x0, y0, x1, y1] = range(b)
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) if (cells.get(key(cx, cy))?.some((p) => overlaps(p, b))) return true
      return false
    },
    /** 상자에 걸리는 것들 (한 번씩) */
    find(b: Box): Box[] {
      const out = new Set(big.filter((p) => overlaps(p, b)))
      const [x0, y0, x1, y1] = range(b)
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) for (const p of cells.get(key(cx, cy)) ?? []) if (overlaps(p, b)) out.add(p)
      return [...out]
    },
  }
}
const gridAt = (px: number) => boxGrid(120 / px)

/** 기호 곁 이름의 상자 (지도 단위) */
export function pointLabelBox(at: Point, text: string, anchor: Anchor, px: number): Box {
  const u = 1 / px
  const w = textWidthPx(text) * u
  const h = LINE_PX * u
  const g = MARK_GAP_PX * u
  const [x, y] = at
  switch (anchor) {
    case 'right':
      return { x0: x + g, y0: y - h / 2, x1: x + g + w, y1: y + h / 2 }
    case 'left':
      return { x0: x - g - w, y0: y - h / 2, x1: x - g, y1: y + h / 2 }
    case 'above':
      return { x0: x - w / 2, y0: y - g - h, x1: x + w / 2, y1: y - g }
    case 'below':
      return { x0: x - w / 2, y0: y + g, x1: x + w / 2, y1: y + g + h }
  }
}

/** 그림 상자 가장자리에서 이름까지 (px) — 지금 지도는 7 (그림 윤곽이 화면 크기로 묶인 선이라). 픽셀 그림은 둘레 윤곽이 그 상자 안에 있어 조금 좁게 */
export const FIG_GAP_PX = 5

/** 그림 곁 이름의 상자 (지도 단위) — 쪽의 기준점은 그림 상자의 가장자리 (지금 지도의 figure anchorAt: 오른쪽·왼쪽은 가운데 높이, 위·아래는 가운데) */
export function figureLabelBox(box: Box, text: string, anchor: Anchor, px: number): Box {
  const w = textWidthPx(text) / px
  const h = LINE_PX / px
  const g = FIG_GAP_PX / px
  const cx = (box.x0 + box.x1) / 2
  const cy = (box.y0 + box.y1) / 2
  switch (anchor) {
    case 'right':
      return { x0: box.x1 + g, y0: cy - h / 2, x1: box.x1 + g + w, y1: cy + h / 2 }
    case 'left':
      return { x0: box.x0 - g - w, y0: cy - h / 2, x1: box.x0 - g, y1: cy + h / 2 }
    case 'above':
      return { x0: cx - w / 2, y0: box.y0 - g - h, x1: cx + w / 2, y1: box.y0 - g }
    case 'below':
      return { x0: cx - w / 2, y0: box.y1 + g, x1: cx + w / 2, y1: box.y1 + g + h }
  }
}

/** 그 단계에 그려지는 그림의 상자 — 그 단계 격자로 바깥쪽에 맞추고 둘레 윤곽 한 픽셀까지 (픽셀 그림이 덮는 자리) */
export const figurePixelBox = (b: Box, u: number): Box => ({
  x0: (Math.floor(b.x0 / u) - 1) * u,
  y0: (Math.floor(b.y0 / u) - 1) * u,
  x1: (Math.floor(b.x1 / u) + 2) * u,
  y1: (Math.floor(b.y1 / u) + 2) * u,
})

const markBox = (at: Point, px: number, r = MARK_R_PX): Box => ({ x0: at[0] - r / px, y0: at[1] - r / px, x1: at[0] + r / px, y1: at[1] + r / px })

/** 지역 이름 상자 (가운데 at, 지도 단위) — 글자 폭 + 자간 + 양옆 여백 2px */
export function areaLabelBox(text: string, at: Point, fontPx: number, px: number): Box {
  const n = [...text].length
  const w = (textWidthPx(text, fontPx) + AREA_TRACKING_PX * (fontPx / 12) * n + 4) / px
  const h = (fontPx * 1.17) / px
  return { x0: at[0] - w / 2, y0: at[1] - h / 2, x1: at[0] + w / 2, y1: at[1] + h / 2 }
}

/** 대륙명 상자 — 지도 가장자리 밖으로 나가지 않게 안쪽으로 민다 (ZendikarMap.tsx 의 continentLabelPlace 와 같은 셈) */
export function continentLabel(c: ContinentMark, lang: Lang, px: number, mapW: number): { at: Point; box: Box } {
  const text = displayName(c, lang)
  const font = continentFontPx(px)
  const w = (textWidthPx(text, font) + continentTrackingPx(px) * [...text].length) / px
  const h = (font * 1.17) / px
  const margin = 8 / px
  const x = Math.min(Math.max(c.at[0], w / 2 + margin), mapW - w / 2 - margin)
  const y = c.at[1]
  return { at: [x, y], box: { x0: x - w / 2, y0: y - h * 0.75, x1: x + w / 2, y1: y + h * 0.25 } }
}

/** 지역 이름을 놓아 볼 자리 — 영역 가운데부터 (labels.ts 의 candidates 와 같다) */
function areaCandidates(l: AreaMark, text: string, fontPx: number, px: number): Point[] {
  const [x, y] = l.at
  const f = fontPx / px
  if (!l.extent) return [l.at, [x, y + f * 1.3], [x, y - f * 1.1]]
  const [rx, ry] = l.extent
  const inside: Point[] = [l.at, [x, y + ry * 0.45], [x, y - ry * 0.45], [x - rx * 0.35, y + ry * 0.25], [x + rx * 0.35, y + ry * 0.25], [x, y + ry * 0.8]]
  const box = areaLabelBox(text, l.at, fontPx, px)
  if (box.x1 - box.x0 <= rx * 2) return inside
  return [...inside, [x, y + ry + f * 0.95], [x, y - ry - f * 0.35]]
}

export interface AreaPlace {
  at: Point
  fontPx: number
}

/** 한 단계의 배치 */
export interface LevelLayout {
  /** 기호를 그리는 장소·카드 */
  points: Set<string>
  cards: Set<string>
  /** 이름이 놓인 쪽 (기호 id → 쪽, 그림은 그 열쇠 — LayoutFigure.key) — 없으면 그 단계에서는 기호·그림만 */
  anchors: Map<string, Anchor>
  /** 그 단계에 그리는 페이즈 그림 (S7 — LayoutFigure.key). 대륙명 밑의 그림은 대륙명이 보이는 단계에서 숨긴다 */
  figures: Set<string>
  /** 자리를 받은 그림 이름의 상자 (열쇠 → 상자) — 흩뿌린 기호가 비킨다 (labels/holes.ts) */
  figureLabels: Map<string, Box>
  areas: Map<string, AreaPlace>
  /** 지역 상세의 이름 (S9 — 열쇠 → 자리) — 그 단계(LayoutOptions.detail)에만. 자리는 그림이 정해 옮기지 않는다 */
  details: Map<string, DetailPlace>
  /** 지역 상세가 다시 써 숨긴 세계 지도 지역 이름의 자리 (S9) — 그리지 않고 초점만 받는다 */
  hiddenAreas: Map<string, AreaPlace>
  continents: Map<string, Point>
}

const byProminence = <T extends { prominence: number }>(text: (l: T) => string) => (a: T, b: T) =>
  b.prominence - a.prominence || text(a).length - text(b).length

/**
 * 모든 단계의 배치 — 단계마다 대륙명 → 지역 이름(중요한 장소의 오른쪽 이름 자리를 비워 두고) → 장소·카드 이름 → 남은 자리에 지역 이름 차례.
 * 장소·카드 이름은 앞 단계에 놓인 쪽을 먼저 본다 (단계를 바꿔도 덜 흔들리게)
 * @param pxAt 단계마다 화면 px/단위
 */
/**
 * 시점별 지도(S6)의 배치 몫 — 지금 지도의 src/data/labelAvoid.ts 그대로:
 * avoid 는 그 무렵 바탕의 큰 기호 상자 (지역 이름만 비킨다), prefer 는 그 위 표시(카드 id)의 이름 쪽 — 늘 먼저 두고, 지역 이름이 그 자리를 비워 둔다
 * (그 때문에 그 단계에 자리를 잃는 지역 이름이 생기면 비워 두지 않는다)
 */
export interface LayoutOptions {
  avoid?: readonly Box[]
  prefer?: Readonly<Record<string, Anchor>>
  /** 시점별 지도의 페이즈 그림 (S7) — 단계마다 그리는 그림의 상자를 모든 이름이 비키고, 그 곁에 그림 이름을 단다 (지금 지도의 figureArea·obstacles 와 그림 이름) */
  figures?: readonly LayoutFigure[]
  /** 단계마다 한 픽셀의 지도 단위 (src/pixel/view.ts 의 LEVELS) — 그림을 그리는지 셈한다 */
  uAt?: readonly number[]
  /** 그림을 그리는 가장 작은 크기 (그 단계 픽셀) */
  figureMinPx?: number
  /** 지역 상세 (S9) */
  detail?: DetailLayout
  /** 지역 상세 손그림의 잉크 자리 (S16 — labels/ink.ts, 그 보기로 묶은 것 — 상자가 덮는 잉크 칸 수): 가장 깊은 단계의 그림 이름은 잉크에 닿지 않는 쪽을 먼저, 없으면 가장 적게 덮는 쪽 */
  ink?: (b: Box) => number
  /** 단계마다 되도록 비킬 상자 (S18 — 하나뿐인 거대 헤드론의 몸통, time.ts 의 singleHedronSoft): 모든 쪽·자리가 막혔을 때만 그 위에 앉는다 — 이것 때문에 이름이 사라지지 않는다 */
  soft?: readonly (readonly Box[])[]
  /** 작은 섬 위 기호의 그 땅 크기 (S15 — 지금 지도의 glyphFrom): 그 땅이 화면에서 LAND_MIN_PX 가 될 때부터 기호를 그린다, 가장 깊은 단계에서는 늘 */
  landSizes?: Readonly<Record<string, number>>
  /** 땅 격자 (R52) — 땅의 지역 이름은 상자가 땅 위인 자리만 */
  landGrid?: { cell: number; w: number; h: number; rows: readonly (readonly number[])[] }
  /** 한 점 지형 기호의 자리 [x, y, …] — 지역 이름이 무른 장애물로 비킨다 (R75) */
  landmarks?: readonly number[]
}

/** 지역 상세의 이름 (S9) — 그림이 정한 자리 그대로 (지금 지도의 .child-label). 돌린 이름은 0·±90° 로만 (픽셀 글꼴이 흐려지지 않게) */
export interface DetailLabel {
  key: string
  name: string
  nameKo?: string
  at: Point
  /** 글자 크기 (지도 단위) */
  size: number
  kind: 'place' | 'area' | 'water'
  rot: 0 | 90 | -90
}

export interface DetailPlace {
  at: Point
  fontPx: number
  rot: 0 | 90 | -90
  box: Box
}

/** 기호를 그리기 시작하는 땅의 화면 크기 (px) — 지금 지도의 LAND_MIN_PX */
const LAND_MIN_PX = 12
/** 지역 이름을 달기 시작하는 땅의 화면 크기 (px) — 이름은 기호보다 넓어 그 두 배 */
const AREA_LAND_MIN_PX = 24

/** 위아래로 쌓인 그림 이름끼리의 틈 (화면 px) — 반 줄 넘게, 가로로 짧은 쪽 폭의 이만큼 넘게 겹치면 쌓인 것 (R83) */
const STACK_GAP_PX = 8
const STACK_OVERLAP = 0.4
/** 이름이 이웃 그림에 이만큼(화면 px) 안으로 다가가면 붙음으로 본다 (R78) */
const NEAR_FIG_PX = 6
/** 가장 깊은 단계에서 이웃 그림에 붙지 않는 쪽이면 지역 상세 손그림 잉크를 이만큼(잉크 칸 수 — labels/ink.ts 의 count)까지 덮어도 된다 — 꽃·풀포기 몇 개, 벼랑·집은 넘는다 (R78) */
const INK_OK_CELLS = 30
/** 한 점 지형 기호 그림의 반 (화면 px) — 지역 이름이 비킨다 (R75) */
const LANDMARK_HALF_PX = 5
/** 그림 이름이 다른 이름과 띄우는 틈 (화면 px) */
const NAME_GAP_PX = 3
/** 같은 줄에 옆으로 나란한 장소·카드 이름끼리의 가로 틈 (화면 px) — 글자 하나 폭. 3px 로는 두 이름의 크림 테가 한 띠로 이어져 'KabiraScalding Tarn' 이 한 이름으로 읽혔다 (가독성 다듬기 R57) */
export const SIDE_GAP_PX = 6

/** 같은 이름의 지역 상세 이름이 이만큼(화면 px) 안이면 세계 지도 지역 이름을 숨긴다 — 넓은 데스크톱 화면 폭 */
const NAME_NEAR_PX = 2560

/** 지역 상세 이름의 글자 크기 (px) — 지금 지도는 화면에서 11–34px. 픽셀 글꼴의 12·24px 가운데 지금 지도에서 24px 이상인 것만 24 (픽셀 글꼴이 넓어 20px 로 24 를 쓰면 그림이 정한 폭의 1.5 배가 되어 그곳의 대상 위로 나갔다 — 검토) */
export const detailFontPx = (size: number, px: number) => (size * px >= 24 ? 24 : 12)

/** 지역 상세 이름의 상자 (가운데 at) — 지역 이름과 같은 상자, ±90° 면 눕힌다 */
/**
 * 지역 상세 이름 글자 상자의 가운데 — 그림의 at 은 글자 밑줄의 가운데다 (지금 지도의 ChildDetailArt: text-anchor middle, 밑줄 그대로, 돌림은 그 점에서).
 * 줄 상자(글자 크기의 1.17 배 — MarksLayer)의 가운데는 밑줄에서 (0.585 − 내림 0.17) 배 위 (검토: 가운데로 읽어 반 줄 아래로 처져 Tajuru Grove 가 Tajuru Paragon 의 머리를 덮었다)
 */
export function detailCenter(l: DetailLabel, px: number): Point {
  const up = ((1.17 / 2 - 0.17) * detailFontPx(l.size, px)) / px
  if (l.rot === 90) return [l.at[0] + up, l.at[1]]
  if (l.rot === -90) return [l.at[0] - up, l.at[1]]
  return [l.at[0], l.at[1] - up]
}

export function detailLabelBox(l: DetailLabel, text: string, px: number): Box {
  const font = detailFontPx(l.size, px)
  const c = detailCenter(l, px)
  const b = areaLabelBox(text, c, font, px)
  if (!l.rot) return b
  const hw = (b.x1 - b.x0) / 2
  const hh = (b.y1 - b.y0) / 2
  return { x0: c[0] - hh, y0: c[1] - hw, x1: c[0] + hh, y1: c[1] + hw }
}

/** 가장 깊은 단계의 지역 상세 (S9) — 그 이름을 먼저 두고, 지역 상세가 다시 쓴 세계 지도 지역 이름은 숨기며, 장소·카드 이름은 그 지역 상세가 정한 쪽을 먼저 본다 */
export interface DetailLayout {
  level: number
  labels: readonly DetailLabel[]
  /** 지역 상세의 범위 — 그 안에 놓일 세계 지도 지역 이름은 숨긴다 (지금 지도의 inActiveDetail — 앞 단계에 놓인 적이 없는 이름은 두어 사라지지 않게) */
  bounds: readonly Box[]
  /** 장소·카드 기호 id → 이름 쪽 */
  anchors: ReadonlyMap<string, Anchor>
}

export interface LayoutFigure {
  /** 이 배치 안의 열쇠 (LevelLayout.figures·anchors) */
  key: string
  name: string
  nameKo?: string
  size: number
  box: Box
  /** 데이터가 정한 이름 쪽 — 늘 먼저 본다 */
  prefer?: Anchor
  /** 이 단계부터만 그린다 (지역 상세에 사는 그림 — S9) */
  fromLevel?: number
}

/** 땅 격자를 칸 읽기로 (R52) — 같은 격자면 한 번만 푼다 */
const landCache = new WeakMap<object, (x: number, y: number) => boolean>()
function landTest(g: LayoutOptions['landGrid']): ((x: number, y: number) => boolean) | undefined {
  if (!g) return undefined
  const hit = landCache.get(g)
  if (hit) return hit
  const bits = new Uint8Array(g.w * g.h)
  g.rows.forEach((runs, j) => {
    let i = 0
    runs.forEach((n, k) => {
      if (k & 1) bits.fill(1, j * g.w + i, j * g.w + i + n)
      i += n
    })
  })
  const f = (x: number, y: number) => {
    const i = Math.floor(x / g.cell)
    const j = Math.floor(y / g.cell)
    return i >= 0 && j >= 0 && i < g.w && j < g.h && bits[j * g.w + i] === 1
  }
  landCache.set(g, f)
  return f
}

export function layoutLevels(marks: PixelMarks, lang: Lang, pxAt: readonly number[], mapW: number, opts: LayoutOptions = {}): LevelLayout[] {
  const landAt = landTest(opts.landGrid)
  const avoid = opts.avoid ?? []
  const prefer = opts.prefer ?? {}
  const figs = opts.figures ?? []
  const minPx = opts.figureMinPx ?? 7
  const { points, cards, areas, continents } = marks
  const nameOf = (l: { name: string; nameKo?: string }) => displayName(l, lang)
  const pointOrder = [...points].sort(byProminence<PointMark>(nameOf))
  const areaOrder = [...areas].sort(byProminence<AreaMark>(nameOf))
  const cardOrder = [...cards].sort((a, b) => Number(a.est) - Number(b.est) || a.order.localeCompare(b.order))
  const out: LevelLayout[] = []
  // 한 단계의 배치 — drop 은 그 단계에 그리지 않을 그림 (R9: 대륙명 밑에 살린 그림이 이름을 밀어낼 때만 뺀다)
  const placeLevel = (px: number, level: number, drop: ReadonlySet<string>): { lv: LevelLayout; contBoxes: Box[]; finalBoxes: Box[] } => {
    const prev = out[level - 1]
    const showFrom = SHOW_FROM[level] ?? 0
    // 놓인 땅이 화면에서 LAND_MIN_PX 보다 작은 기호는 그 단계에 그리지 않는다 — 개관에서 좌르 섬 피난처 기호가 그 섬을 통째로 덮었다 (S15)
    const lastLevel = level === pxAt.length - 1
    const landOk = (id: string) => lastLevel || (opts.landSizes?.[id] ?? Infinity) * px >= LAND_MIN_PX
    const shownPoints = pointOrder.filter((p) => p.prominence >= showFrom && landOk(p.id))
    const softBoxes = opts.soft?.[level] ?? []
    const softGrid = softBoxes.length ? gridAt(px) : null
    for (const b of softBoxes) softGrid!.add(b)
    const onSoft = (b: Box) => Boolean(softGrid?.hits(b))
    const cont = new Map<string, Point>()
    const contBoxes: Box[] = []
    /** 대륙명이 비키기 전 자리 (R9 — 대륙명이 비킨 그림도 전에는 숨겼다) */
    const firstBoxes: Box[] = []
    const u = opts.uAt?.[level] ?? 1 / px
    // 그 단계에 그리는 그림 (크기로만 고른다 — 가독성 다듬기 R9: 전에는 대륙명 상자에 걸린 그림을 통째로 빼서 Terastodon·Ulamog 같은 큰 그림이 개관에서 사라졌다.
    // 이름은 옮겨 앉아도 되지만 그림은 사라지지 않는다 — 대륙명이 그림을 비키고, 비킬 자리가 없으면 그림을 그 밑에 그린다)
    const shownFigs = figs.flatMap((f) => {
      if (drop.has(f.key) || f.size / u < minPx || f.size * px < 14 || (f.fromLevel !== undefined && level < f.fromLevel)) return []
      return [{ f, box: figurePixelBox(f.box, u) }]
    })
    if (level <= CONTINENT_LAST_LEVEL)
      for (const c of continents) {
        const first = continentLabel(c, lang, px, mapW)
        let { at, box } = first
        firstBoxes.push(first.box)
        // 앞서 놓인 대륙명과 겹치면 위아래로 가장 가까운 빈 자리로 비킨다 — 휴대폰 개관에서 지도 끝으로 밀린 Bala Ged 가 Guul Draz 에 얹혔다 (검토).
        // 그 자리가 그 단계의 지역 이름(첫 자리)이나 보이는 장소 기호를 덮으면 쓰지 않는다 — 옮긴 대륙명이 Guum Wilds 이름을 밀어냈다. 빈 자리가 없으면 그대로 둔다
        // 보이는 장소 기호를 덮어도 — 휴대폰 개관에서 Murasa 대륙명의 글자가 Shatterskull Pass·Singing City 기호 밑에 가렸다 (QA). 기호만 걸리면 다른 이름을 덮지 않는 자리로만 옮긴다
        const pointBoxes = shownPoints.map((p) => markBox(p.at, px))
        const figHits = shownFigs.map((x) => x.box)
        const onCont = contBoxes.some((b) => overlaps(b, box))
        if (onCont || pointBoxes.some((b) => overlaps(b, box)) || figHits.some((b) => overlaps(b, box))) {
          const others = [
            ...pointBoxes,
            ...figHits,
            // 지역 이름이 앉아 볼 모든 자리 (첫 자리가 막혀 옆으로 앉는 이름도 밀어내지 않게)
            ...areas.flatMap((a) => {
              const f = areaFontPx(a.prominence, px)
              if (f === null) return []
              const text = nameOf(a)
              return areaCandidates(a, text, f, px).map((c) => areaLabelBox(text, c, f, px))
            }),
          ]
          // 화면 2px 씩, 글자 높이의 0.6 배까지만 (겹침은 글자 테두리 몇 px — 멀리 옮기면 그 대륙을 떠난다). 다른 이름을 덮지 않는 자리가 먼저, 없으면 대륙명끼리만 비키는 자리
          const step = 2 / px
          const reach = (box.y1 - box.y0) * 0.6
          const shift = (dy: number): Box => ({ x0: box.x0, y0: box.y0 + dy, x1: box.x1, y1: box.y1 + dy })
          const tries: number[] = []
          for (let d = step; d <= reach; d += step) tries.push(-d, d)
          const dy =
            tries.find((d) => !contBoxes.some((o) => overlaps(o, shift(d))) && !others.some((o) => overlaps(o, shift(d)))) ??
            (onCont
              ? tries.find((d) => !contBoxes.some((o) => overlaps(o, shift(d))))
              : // 기호만 걸리면 대륙명·기호만 비키는 자리도 (지역 이름은 대륙명을 비켜 앉는다 — 휴대폰 가장 먼 개관의 Murasa)
                tries.find((d) => !contBoxes.some((o) => overlaps(o, shift(d))) && !pointBoxes.some((o) => overlaps(o, shift(d)))))
          if (dy !== undefined) {
            at = [first.at[0], first.at[1] + dy]
            box = shift(dy)
          }
        }
        cont.set(c.id, at)
        contBoxes.push(box)
      }
    // 카드 기호 — 보이는 장소 기호나 다른 카드와 가까우면, 또는 대륙명 밑이면 숨긴다. 가장 먼 개관(단계 0)에는 두지 않는다
    const shownCards = new Set<string>()
    if (level > 0) {
      const gap = CARD_GAP_PX / px
      const taken: Point[] = shownPoints.map((p) => p.at)
      const r = 8 / px
      const under = (q: Point) => contBoxes.some((b) => q[0] + r > b.x0 && q[0] - r < b.x1 && q[1] + r > b.y0 && q[1] - r < b.y1)
      for (const c of cardOrder) {
        if (!landOk(c.id)) continue
        const near = (q: Point) => Math.hypot(q[0] - c.at[0], q[1] - c.at[1]) < gap
        if (taken.some(near) || under(c.at)) continue
        taken.push(c.at)
        shownCards.add(c.id)
      }
    }
    const shownCardList = cardOrder.filter((c) => shownCards.has(c.id))
    const markBoxes = [...shownPoints.map((p) => markBox(p.at, px)), ...shownCardList.map((c) => markBox(c.at, px, 8))]
    // 페이즈 그림 — 그 단계 픽셀로 minPx 이상이고 화면에서 14px 이상 (지금 지도의 FIGURE_MIN_PX), 대륙명 밑이면 대륙명이 보이는 단계에서는 숨긴다
    const figBoxes = shownFigs.map((x) => x.box)
    // 지역 상세의 이름 (S9) — 그림이 정한 자리라 먼저 둔다. 다른 이름이 모두 비킨다
    const det = opts.detail?.level === level ? opts.detail : undefined
    const details = new Map<string, DetailPlace>()
    for (const l of det?.labels ?? []) details.set(l.key, { at: detailCenter(l, px), fontPx: detailFontPx(l.size, px), rot: l.rot, box: detailLabelBox(l, nameOf(l), px) })
    const detailBoxes = [...details.values()].map((d) => d.box)
    // 숨기는 지역 이름 — 놓일 자리가 지역 상세 범위 안(앞 단계에 놓인 적이 있는 이름만 — 그 단계에서야 처음 나오는 이름은 둔다)이거나,
    // 같은 이름의 지역 상세 이름이 한 화면(가장 넓은 화면 폭 NAME_NEAR_PX) 안에 있으면 (지금 지도의 detailLabelTexts — 그 이름은 지역 상세 이름으로 보인다)
    const hiddenAreas = new Map<string, AreaPlace>()
    const sameNear = (l: AreaMark, at: Point) => {
      const near = NAME_NEAR_PX / px
      return Boolean(det?.labels.some((d) => d.name === l.name && Math.abs(d.at[0] - at[0]) < near && Math.abs(d.at[1] - at[1]) < near))
    }
    const hideArea = (l: AreaMark, at: Point) =>
      Boolean(det && (sameNear(l, at) || (det.bounds.some((b) => at[0] >= b.x0 && at[0] <= b.x1 && at[1] >= b.y0 && at[1] <= b.y1) && out.some((o) => o.areas.has(l.id)))))

    // 지역 이름 — 중요한 장소(prominence 2 이상)의 기호와 오른쪽 이름 자리를 먼저 비워 둔다
    const reserves = shownPoints.filter((p) => p.prominence >= 2).map((p) => ({ id: p.id, box: pointLabelBox(p.at, nameOf(p), 'right', px) }))
    const areaAt = new Map<string, AreaPlace>()
    const areaBoxes: Box[] = []
    // 지역·물 이름도 그린 기호(18px 와 테두리)와 다른 지역 이름·대륙명에서 화면 NAME_GAP_PX 띄운다 — 띄운 자리가 먼저, 없으면 띄우지 않고 (S24 — 'Bojuka BogBojuka Bay'·'Umara River▣Eldrazi Temple' 이 한 이름으로 읽혔다)
    const areaGap = NAME_GAP_PX / px
    const areaDrawnR = (MARK_DRAWN_PX + 1 + NAME_GAP_PX) / px
    const drawnMarkBoxes = [...shownPoints.map((p) => p.at), ...shownCardList.map((c) => c.at)].map((at) => ({ x0: at[0] - areaDrawnR, y0: at[1] - areaDrawnR, x1: at[0] + areaDrawnR, y1: at[1] + areaDrawnR }))
    // 한 점 지형 기호 (R75) — 그려지는 단계(한 픽셀 ≤ 4 단위)에서 그림판 그림(8 픽셀)의 반에 한 픽셀 더한 상자
    const markR = LANDMARK_HALF_PX / px
    const drawsMarks = (opts.uAt?.[level] ?? 1 / px) <= 4
    const onLandmark = (b: Box) => {
      const lm = opts.landmarks
      if (!lm || !drawsMarks) return false
      for (let i = 0; i + 1 < lm.length; i += 2) if (lm[i] + markR > b.x0 && lm[i] - markR < b.x1 && lm[i + 1] + markR > b.y0 && lm[i + 1] - markR < b.y1) return true
      return false
    }
    const placeAreas = (list: AreaMark[], blocked: Box[]) => {
      const taken = gridAt(px)
      for (const b of blocked) taken.add(b)
      for (const b of areaBoxes) taken.add(b)
      const near = gridAt(px)
      for (const b of drawnMarkBoxes) near.add(b)
      for (const b of [...contBoxes, ...areaBoxes]) near.add({ x0: b.x0 - areaGap, y0: b.y0 - areaGap, x1: b.x1 + areaGap, y1: b.y1 + areaGap })
      const onLand = (l: AreaMark, box: Box) => {
        if (l.water || !landAt) return true
        const cx = (box.x0 + box.x1) / 2
        const cy = (box.y0 + box.y1) / 2
        // 가운데는 꼭 땅, 네 귀퉁이 쪽(상자의 1/4 안쪽) 가운데 둘 넘게 땅
        if (!landAt(cx, cy)) return false
        const qx = (box.x1 - box.x0) / 4
        const qy = (box.y1 - box.y0) / 4
        return [landAt(cx - qx, cy - qy), landAt(cx + qx, cy - qy), landAt(cx - qx, cy + qy), landAt(cx + qx, cy + qy)].filter(Boolean).length >= 2
      }
      const placeArea = (l: AreaMark, text: string, font: number): boolean => {
        // 거대 헤드론 몸통을 비키는 자리가 먼저, 없으면 그 위라도 (S18)
        const cands = areaCandidates(l, text, font, px)
        const free = cands.filter((c) => {
          const box = areaLabelBox(text, c, font, px)
          return !taken.hits(box) && onLand(l, box)
        })
        const roomy = (c: Point) => !near.hits(areaLabelBox(text, c, font, px))
        // 한 점 지형 기호(R75 — 'Pelakka Kar■st')도 거대 헤드론처럼 무른 장애물 — 비킬 자리가 없으면 그 위라도
        const soft = (c: Point) => {
          const b = areaLabelBox(text, c, font, px)
          return onSoft(b) || onLandmark(b)
        }
        for (const c of [...free.filter((c) => roomy(c) && !soft(c)), ...free.filter((c) => !roomy(c) && !soft(c)), ...free.filter(soft)]) {
          const box = areaLabelBox(text, c, font, px)
          if (taken.hits(box)) continue
          // 지역 상세가 다시 쓴 이름 — 그 자리를 키보드 초점의 빈 단추로만 남긴다 (MarksLayer — 초점·고름이 그 단계에서 사라지지 않게)
          if (hideArea(l, c)) {
            hiddenAreas.set(l.id, { at: c, fontPx: font })
            return true
          }
          taken.add(box)
          near.add({ x0: box.x0 - areaGap, y0: box.y0 - areaGap, x1: box.x1 + areaGap, y1: box.y1 + areaGap })
          areaBoxes.push(box)
          areaAt.set(l.id, { at: c, fontPx: font })
          return true
        }
        return false
      }
      for (const l of list) {
        const font0 = areaFontPx(l.prominence, px)
        if (font0 === null || areaAt.has(l.id) || hiddenAreas.has(l.id)) continue
        // 작은 섬의 지역 이름은 그 섬이 화면에서 AREA_LAND_MIN_PX 가 될 때부터 (S19 — 이름이 섬보다 넓어 섬을 통째로 덮었다. 가장 깊은 단계에서는 늘)
        if (!lastLevel && (opts.landSizes?.[l.id] ?? Infinity) * px < AREA_LAND_MIN_PX) continue
        const text = nameOf(l)
        // 같은 이름을 곁의 지역 상세가 단다 — 자리를 찾지 않고 숨긴다 (그 자리가 막혔어도 이름은 지역 상세 이름으로 보인다)
        if (sameNear(l, l.at)) {
          hiddenAreas.set(l.id, { at: l.at, fontPx: font0 })
          continue
        }
        // 땅의 지역 이름은 상자가 땅 위인 자리만, 24px 자리가 없으면 12px 로 다시 (가독성 다듬기 R52: 영역 밖 자리가 바다 위라 Oran-Rief·Guum Wilds 가 해협 이름,
        // Lake of Dust 가 만 이름으로 읽혔고, 2023 의 Oran-Rief 는 24px 자리를 모두 잃어 사라졌다)
        const fonts = !l.water && landAt && font0 === 24 ? [24, 12] : [font0]
        for (const font of fonts) {
          if (placeArea(l, text, font)) break
        }
      }
    }
    const blockedBase = [...contBoxes, ...markBoxes, ...reserves.map((r) => r.box), ...avoid, ...figBoxes, ...detailBoxes]
    // 그 무렵 바탕의 큰 기호 위 표시의 이름 쪽(prefer)을 비워 둔다 — 그 때문에 자리를 잃는 지역 이름이 생기면 비우지 않는다
    const markReserves = shownCardList.flatMap((c) => (prefer[c.id] ? [{ id: c.id, box: pointLabelBox(c.at, nameOf(c), prefer[c.id], px), anchor: prefer[c.id] }] : []))
    placeAreas(areaOrder, [...blockedBase, ...markReserves.map((r) => r.box)])
    if (markReserves.length) {
      const kept = new Map(areaAt)
      const keptBoxes = [...areaBoxes]
      areaAt.clear()
      areaBoxes.length = 0
      placeAreas(areaOrder, blockedBase)
      if ([...areaAt.keys()].every((id) => kept.has(id))) {
        // 비워 두어도 잃는 이름이 없다 — 비워 둔 배치를 쓴다
        areaAt.clear()
        areaBoxes.length = 0
        for (const [k, v] of kept) areaAt.set(k, v)
        areaBoxes.push(...keptBoxes)
      } else markReserves.length = 0
    }

    // 장소·카드 이름 — 한꺼번에, 중요한 것부터. 앞 단계에 보이던 이름이 먼저
    const placed = gridAt(px)
    for (const b of [...contBoxes, ...areaBoxes, ...markBoxes, ...figBoxes, ...detailBoxes]) placed.add(b)
    // 그림 상자는 빼고 이름·기호만 — 가장 깊은 단계에서 자리를 못 받은 그림 이름이 마지막으로 이웃 그림 위에 앉는 몫 (아래)
    const namesOnly = gridAt(px)
    for (const b of [...contBoxes, ...areaBoxes, ...markBoxes, ...detailBoxes]) namesOnly.add(b)
    type In = { id: string; at: Point; text: string; prominence: number }
    const inputs: In[] = [
      ...shownPoints.map((p) => ({ id: p.id, at: p.at, text: nameOf(p), prominence: p.prominence })),
      ...shownCardList.map((c) => ({ id: c.id, at: c.at, text: nameOf(c), prominence: CARD_PROMINENCE })),
    ].sort(byProminence<In>((l) => l.text))
    const wasShown = (l: In) => prev?.anchors.has(l.id) ?? false
    // 그 무렵 바탕의 큰 기호 위 표시는 그 쪽을 늘 먼저 (앞 단계의 쪽보다도 — 지금 지도의 prefer)
    const reservedSide = new Map(shownCardList.flatMap((c) => (prefer[c.id] ? [[c.id, prefer[c.id]] as const] : [])))
    const queue = [...inputs.filter(wasShown), ...inputs.filter((l) => !wasShown(l))]
    const anchors = new Map<string, Anchor>()
    const SIDES: Anchor[] = ['right', 'left', 'above', 'below']
    // 지역 상세 이름을 빼고 센 자리 — 네 쪽이 모두 막힌 장소·카드 이름은 지역 상세 이름을 물리고 앉는다 (이름은 옮겨 앉아도 사라지면 안 된다)
    const noDetail = det ? gridAt(px) : null
    if (noDetail) for (const b of [...contBoxes, ...areaBoxes, ...markBoxes, ...figBoxes]) noDetail.add(b)
    const dropped = new Set<string>()
    // 장소·카드 이름끼리, 그리고 이웃 기호(그린 18px 에 글자 테두리)와는 화면 NAME_GAP_PX 띄운다 — 맞닿은 'ValakutVerdant Catacombs'·'마킨디 왕좌[기호]불안정한 봉우리' 가
    // 한 이름으로 읽혔다 (QA). 띄울 자리가 없으면 그 단계에서는 기호만 (지금 지도도 tier 마다 이름 없는 기호가 있다) — 가장 깊은 단계에서만 띄우지 않고라도 단다 (이름은 사라지면 안 된다)
    const nameGap = NAME_GAP_PX / px
    const grownBy = (b: Box, g: number, gx = g): Box => ({ x0: b.x0 - gx, y0: b.y0 - g, x1: b.x1 + gx, y1: b.y1 + g })
    const sideGap = SIDE_GAP_PX / px
    const pointNames = gridAt(px)
    const pointNameList: Box[] = []
    const drawnR = (MARK_DRAWN_PX + 1 + NAME_GAP_PX) / px
    const drawnMarks = [...shownPoints.map((p) => ({ id: p.id, at: p.at })), ...shownCardList.map((c) => ({ id: c.id, at: c.at }))]
    const markGrid = gridAt(px)
    const markOf = new Map<Box, string>()
    for (const m of drawnMarks) {
      const b = { x0: m.at[0] - drawnR, y0: m.at[1] - drawnR, x1: m.at[0] + drawnR, y1: m.at[1] + drawnR }
      markOf.set(b, m.id)
      markGrid.add(b)
    }
    const nearMark = (box: Box, id: string) => markGrid.find(box).some((b) => markOf.get(b) !== id)
    // 지역·물 이름·대륙명·지역 상세 이름과도 띄운다 (S24 — 장소 이름끼리만 띄워 'Bojuka Bog' 이 물 이름 'Bojuka Bay' 에 맞닿았다)
    const regionNames = gridAt(px)
    for (const b of [...contBoxes, ...areaBoxes, ...detailBoxes]) regionNames.add(b)
    const take = (l: In, a: Anchor, box: Box) => {
      placed.add(box)
      namesOnly.add(box)
      noDetail?.add(box)
      pointNames.add(box)
      pointNameList.push(box)
      anchors.set(l.id, a)
    }
    for (const l of queue) {
      // 지역 상세가 정한 쪽 (그 표시를 담은 가장 깊은 지역 상세 — 지금 지도의 detailAnchor) 이 앞 단계의 쪽보다 먼저
      const before = reservedSide.get(l.id) ?? det?.anchors.get(l.id) ?? prev?.anchors.get(l.id)
      const tries = before ? [before, ...SIDES.filter((s) => s !== before)] : SIDES
      let got = false
      // 거대 헤드론 몸통(S18)을 비키는 쪽이 먼저 — 틈을 두고, 그다음 틈을 두되 몸통 위, 가장 깊은 단계는 틈 없이 (몸통을 비켜, 그다음 위)
      const passes: [boolean, boolean][] = lastLevel ? [[true, true], [true, false], [false, true], [false, false]] : [[true, true], [true, false]]
      const passList = softGrid ? passes : passes.filter(([, v]) => !v)
      // 지역·물·대륙·지역 상세 이름과 띄운 자리가 먼저, 없으면 띄우지 않고 (그 때문에 그 단계에서 이름을 잃지 않게 — S24 검토: 개관의 Affa·Malakir 가 빠졌다)
      const fitsWith = (box: Box, spaced: boolean, avoidSoft: boolean, roomy: boolean) =>
        !(placed.hits(box) || (spaced && (pointNames.hits(grownBy(box, nameGap, sideGap)) || (roomy && regionNames.hits(grownBy(box, nameGap))) || nearMark(box, l.id))) || (avoidSoft && onSoft(box)))
      const roomyFirst = passList.flatMap(([sp, av]) => (sp ? [[sp, av, true] as const] : []))
      const allPasses = [...roomyFirst, ...passList.map(([sp, av]) => [sp, av, false] as const)]
      // 가장 깊은 단계는 지역 상세의 손그림(벼랑·물가 빗금·길)에 닿지 않는 쪽이 먼저, 없으면 처음 맞는 칸에서 잉크를 가장 적게 덮는 쪽 (S24 — 그림 이름(S16)만 비켜
      // Ikiral 의 'Brightclimb Pathway' 가 협곡 빗금 위에 앉았다). 그 무렵 바탕이 정한 쪽(reservedSide)은 그대로
      const inkAt = lastLevel && opts.ink && !reservedSide.has(l.id) ? opts.ink : null
      if (inkAt)
        for (const [spaced, avoidSoft, roomy] of allPasses) {
          for (const a of tries) {
            const box = pointLabelBox(l.at, l.text, a, px)
            if (!fitsWith(box, spaced, avoidSoft, roomy) || inkAt(box) > 0) continue
            take(l, a, box)
            got = true
            break
          }
          if (got) break
        }
      if (!got)
        for (const [spaced, avoidSoft, roomy] of allPasses) {
          let best: { a: Anchor; box: Box; c: number } | null = null
          for (const a of tries) {
            const box = pointLabelBox(l.at, l.text, a, px)
            if (!fitsWith(box, spaced, avoidSoft, roomy)) continue
            const c = inkAt ? inkAt(box) : 0
            if (!best || c < best.c) best = { a, box, c }
            if (!inkAt) break
          }
          if (best) {
            take(l, best.a, best.box)
            got = true
            break
          }
        }
      if (got) continue
      // 가장 깊은 단계 — 네 쪽이 모두 그림에 막힌 장소·카드 이름은 그림을 가장 적게 덮는 쪽에 (그림 이름과 같다 — QA: Affa 곁의 Riverglide Pathway 가 Bazaar Trader·Goblin Shortcutter 에 막혀 사라졌다)
      if (lastLevel) {
        let pick: { a: Anchor; box: Box; c: number } | null = null
        for (const a of tries) {
          const box = pointLabelBox(l.at, l.text, a, px)
          if (namesOnly.hits(box)) continue
          const c = figBoxes.reduce((sum, o) => (!overlaps(o, box) ? sum : sum + (Math.min(o.x1, box.x1) - Math.max(o.x0, box.x0)) * (Math.min(o.y1, box.y1) - Math.max(o.y0, box.y0))), 0)
          if (!pick || c < pick.c) pick = { a, box, c }
        }
        if (pick) {
          take(l, pick.a, pick.box)
          continue
        }
      }
      if (!noDetail) continue
      for (const a of tries) {
        const box = pointLabelBox(l.at, l.text, a, px)
        if (noDetail.hits(box)) continue
        noDetail.add(box)
        placed.add(box)
        namesOnly.add(box)
        pointNames.add(box)
        pointNameList.push(box)
        anchors.set(l.id, a)
        for (const [k, d] of details) if (overlaps(d.box, box)) dropped.add(k)
        break
      }
    }
    for (const k of dropped) details.delete(k)

    // 그림 이름 — 장소·카드 이름 뒤에 (지금 지도의 last). 앞 단계에 보이던 이름이 먼저, 큰 그림(크기 30 이상)이 먼저, 짧은 이름이 먼저.
    // 쪽은 데이터가 정한 쪽 → 앞 단계의 쪽 → 아래 · 오른쪽 · 왼쪽 (위는 데이터가 정할 때만 — 지금 지도와 같다)
    const figProm = (f: LayoutFigure) => (f.size >= 30 ? 2 : 1)
    const figQueue = shownFigs
      .filter((x) => figProm(x.f) >= showFrom)
      .sort((a, b) => {
        const wa = prev?.anchors.has(a.f.key) ? 0 : 1
        const wb = prev?.anchors.has(b.f.key) ? 0 : 1
        return wa - wb || figProm(b.f) - figProm(a.f) || nameOf(a.f).length - nameOf(b.f).length
      })
    const figLabelBoxes: Box[] = []
    const figureLabels = new Map<string, Box>()
    const deepest = level === pxAt.length - 1
    // 그림 이름끼리는 화면 NAME_GAP_PX 띄운다 — 맞닿은 두 이름이 한 이름으로 읽혔다 (검토). 그림 이름끼리만 잴 때 넓히고, 넣는 상자는 그대로
    const gap = NAME_GAP_PX / px
    const grown = (b: Box): Box => ({ x0: b.x0 - gap, y0: b.y0 - gap, x1: b.x1 + gap, y1: b.y1 + gap })
    // 가장 깊은 단계는 지역 상세의 손그림(건물·벼랑·물가 빗금·물결)이 보이니, 먼저 그 잉크에 닿지 않는 쪽만 보고 — 모든 그림을 한 번 돈 뒤 남은 것은 잉크를 가장 적게 덮는 쪽 (S16 — 지금 지도는
    // 데이터의 쪽(label)이 손그림을 비키지만 픽셀 지도의 이름은 그림에 견줘 2–4 배 커 그 쪽에서도 얹혔다)
    const inkOn = deepest && opts.ink ? opts.ink : null
    // 이름이 제 그림보다 다른 그림에 더 붙는가 (R78 — 'Nissa's Chosen' 이 이웃 Grotag 고블린 바로 위에 앉아 고블린의 이름으로 읽혔다)
    const figGrid = gridAt(px)
    for (const b of figBoxes) figGrid.add(b)
    const boxGap = (a: Box, b: Box) => Math.max(0, a.x0 - b.x1, b.x0 - a.x1) + Math.max(0, a.y0 - b.y1, b.y0 - a.y1)
    const stuckTo = (b: Box, own: Box) => {
      const g = NEAR_FIG_PX / px
      const mineGap = boxGap(b, own)
      return figGrid
        .find({ x0: b.x0 - g, y0: b.y0 - g, x1: b.x1 + g, y1: b.y1 + g })
        .some((o) => !(o.x0 === own.x0 && o.y0 === own.y0 && o.x1 === own.x1 && o.y1 === own.y1) && boxGap(b, o) <= g && boxGap(b, o) < mineGap)
    }
    const otherNames = gridAt(px)
    if (deepest) for (const b of [...pointNameList, ...[...details.values()].map((d) => d.box)]) otherNames.add(b)
    // 장소·카드·지역·물 이름과는 모든 단계에서 띄운다 — 옆으로는 글자 하나(SIDE_GAP_PX), 위아래는 NAME_GAP_PX (가독성 다듬기 R71: 그림 이름과 지역·물 이름 사이에 틈 규칙이 없어
    // 크림 테가 이어진 한 띠라 'Terra Stomper Vazi River' 가 한 지명으로 읽혔다). 띄울 자리가 없으면 띄우지 않고 다시 놓는다 (이름은 사라지면 안 된다)
    const sideNames = gridAt(px)
    for (const b of [...pointNameList, ...areaBoxes]) sideNames.add(b)
    const grownSide = (b: Box): Box => ({ x0: b.x0 - sideGap, y0: b.y0 - gap, x1: b.x1 + sideGap, y1: b.y1 + gap })
    type FigPick = { key: string; a: Anchor; b: Box }
    /** 그림 이름을 한 번 놓아 본다 — 앞에 놓인 이름(placed·namesOnly)은 읽기만 하고, 이번에 놓은 것은 따로 모아 돌려준다 (잉크를 비키다 이름이 사라지면 다시 놓으려고) */
    const runFigs = (queue: typeof figQueue, useInk: boolean, noInk: ReadonlySet<string> = new Set()): FigPick[] => {
      const picks: FigPick[] = []
      const mine = gridAt(px)
      const figNames = gridAt(px)
      // 가장 깊은 단계는 장소·카드·지역 상세 이름과도 띄운다 (QA: 좌르 섬에서 Strand of Jwar·Kor Spiritdancer·Jwari Disruption 이 틈 없이 쌓여 한 이름으로 읽혔다) — 띄울 자리가 없으면 마지막 비킴이 틈 없이 놓는다
      // 위아래로 쌓인 그림 이름 (가로로 짧은 쪽 폭의 STACK_OVERLAP 넘게 겹침)은 반 줄 넘게 띄운다 (가독성 다듬기 R83: 3px 위아래 틈이라 'Coralhelm Commander / Umara Entangler' 가 두 줄짜리 한 이름으로 읽혔다)
      const stackGap = STACK_GAP_PX / px
      const stacked = (b: Box) =>
        figNames.find({ x0: b.x0, y0: b.y0 - stackGap, x1: b.x1, y1: b.y1 + stackGap }).some((o) => {
          const over = Math.min(o.x1, b.x1) - Math.max(o.x0, b.x0)
          return over > STACK_OVERLAP * Math.min(o.x1 - o.x0, b.x1 - b.x0) && Math.max(o.y0 - b.y1, b.y0 - o.y1) < stackGap
        })
      const nearName = (b: Box, strict: boolean) => figNames.hits(grown(b)) || (strict && (sideNames.hits(grownSide(b)) || stacked(b))) || (deepest && otherNames.hits(grown(b)))
      const ink = useInk ? inkOn : null
      const take = (key: string, a: Anchor, b: Box) => {
        mine.add(b)
        figNames.add(b)
        picks.push({ key, a, b })
      }
      const placeFig = (x: (typeof figQueue)[number], pass: 'free' | 'least' | 'plain', strict = true) => {
        const inkOk = deepest ? INK_OK_CELLS : 0
        const { f, box } = x
        const text = nameOf(f)
        const before = prev?.anchors.get(f.key)
        const tries = [...new Set([f.prefer, before, 'below', 'right', 'left'].filter((a): a is Anchor => Boolean(a)))]
        let pick: { a: Anchor; b: Box; n: number; st: boolean } | null = null
        // 거대 헤드론 몸통(S18)을 비키는 쪽이 먼저, 없으면 그 위라도
        for (const avoidSoft of softGrid ? [true, false] : [false]) {
          for (const a of tries) {
            const b = figureLabelBox(box, text, a, px)
            if (placed.hits(b) || mine.hits(b) || nearName(b, strict) || (avoidSoft && onSoft(b))) continue
            const n = pass === 'plain' ? 0 : ink!(b)
            // 가장 깊은 단계 — 이웃 그림에 제 그림보다 더 붙는 쪽은 뒤로 (R78). 잉크가 조금(INK_OK_CELLS) 덮여도 붙지 않는 쪽이 잉크 없는 붙은 쪽을 이긴다
            const st = deepest && stuckTo(b, box)
            if (pass === 'free' && n > (st ? 0 : inkOk)) continue
            if (!pick || (pick.st && !st) || (pick.st === st && n < pick.n)) pick = { a, b, n, st }
            if (n === 0 && !st) break
          }
          if (pick) break
        }
        if (!pick) return false
        take(f.key, pick.a, pick.b)
        return true
      }
      const tight: typeof figQueue = []
      const inky: typeof figQueue = []
      for (const x of queue) {
        const own = ink && !noInk.has(x.f.key)
        if (!placeFig(x, own ? 'free' : 'plain')) (own ? inky : tight).push(x)
      }
      for (const x of inky) if (!placeFig(x, 'least')) tight.push(x)
      // 장소·지역 이름과 띄울 자리가 없던 것 — 띄우지 않고 (R71)
      const missed: typeof figQueue = []
      for (const x of tight) if (!placeFig(x, ink && !noInk.has(x.f.key) ? 'least' : 'plain', false)) missed.push(x)
      // 가장 깊은 단계 — 그림이 몰려 네 쪽이 모두 이웃 그림에 막힌 이름은 이웃 그림 위에라도 (이름끼리·기호와는 겹치지 않게, 제 그림은 덮지 않게).
      // 지금 지도는 256배까지 확대해 이름이 그림에 견줘 작아지지만 픽셀 지도의 가장 깊은 단계는 그만큼 깊지 않다 — 이름은 옮겨 앉아도 사라지면 안 된다
      // 먼저 위(데이터가 정하지 않아 앞에서 보지 않은 쪽)까지 그림을 비키는 자리를 보고, 그래도 없으면 이웃 그림을 가장 적게 덮는 쪽에 (검토: 빈 위쪽을 두고 이웃 그림을 통째로 덮었다)
      if (deepest)
        for (const { f, box } of missed) {
          const text = nameOf(f)
          const sides = [...new Set([f.prefer, 'below', 'right', 'left', 'above'].filter((v): v is Anchor => Boolean(v)))]
          const cover = (b: Box) =>
            figBoxes.reduce((sum, o) => (o === box || !overlaps(o, b) ? sum : sum + (Math.min(o.x1, b.x1) - Math.max(o.x0, b.x0)) * (Math.min(o.y1, b.y1) - Math.max(o.y0, b.y0))), 0)
          let pick: { a: Anchor; b: Box; c: number; k: number; spaced: boolean } | null = null
          // 다른 그림 이름과 틈을 두는 자리가 먼저, 없으면 틈 없이라도 (이름은 사라지면 안 된다) — 둘 가운데 이웃 그림을 가장 적게 덮는 것 (같으면 틈을 둔 것).
          // 손그림 잉크(S16)는 그다음에만 — 같은 덮음·같은 틈 가운데 잉크를 적게 덮는 쪽 (검토: 덮음에 더해 셈하니 잉크가 틈의 규칙을 이겨 그림 이름끼리 맞닿았다)
          for (const spaced of [true, false]) {
            for (const a of sides) {
              const b = figureLabelBox(box, text, a, px)
              if (namesOnly.hits(b) || mine.hits(b) || (spaced && nearName(b, false)) || overlaps(b, box)) continue
              const c = placed.hits(b) ? cover(b) : 0
              const k = ink ? ink(b) : 0
              if (!pick || c < pick.c || (c === pick.c && pick.spaced === spaced && k < pick.k)) pick = { a, b, c, k, spaced }
              if (c === 0 && k === 0) break
            }
            if (pick?.c === 0) break
          }
          if (pick) take(f.key, pick.a, pick.b)
        }
      return picks
    }
    let picks = runFigs(figQueue, Boolean(inkOn))
    // 잉크를 비키느라 옆 이름이 다른 쪽으로 옮겨 앉아 네 쪽이 모두 막힌 이름이 생기면 (Kor Spiritdancer, 2023) — 그 이름과, 그 쪽들을 막은 그림 이름은 잉크를 보지 않고 다시.
    // 몇 번 돌아도 남으면 잉크를 보지 않은 배치 (이름은 사라지면 안 된다 — 모두 잉크를 보지 않으면 그 배치와 같다)
    if (inkOn) {
      const plain = runFigs(figQueue, false)
      const inPlain = new Set(plain.map((p) => p.key))
      const noInk = new Set<string>()
      for (let round = 0; ; round++) {
        const got = new Set(picks.map((p) => p.key))
        const lost = figQueue.filter((x) => inPlain.has(x.f.key) && !got.has(x.f.key))
        if (!lost.length) break
        if (round === 6) {
          picks = plain
          break
        }
        for (const { f, box } of lost) {
          noInk.add(f.key)
          const sides = (['below', 'right', 'left', 'above'] as const).map((a) => figureLabelBox(box, nameOf(f), a, px))
          for (const p of picks) if (sides.some((b) => overlaps(grown(b), p.b))) noInk.add(p.key)
        }
        picks = runFigs(figQueue, true, noInk)
      }
    }
    for (const { key, a, b } of picks) {
      placed.add(b)
      namesOnly.add(b)
      figLabelBoxes.push(b)
      figureLabels.set(key, b)
      anchors.set(key, a)
    }

    // 비워 둔 오른쪽 자리에 그 이름이 앉지 않았으면 그 자리는 빈다 — 자리를 못 받은 지역 이름이 놓인 이름을 모두 비켜 한 번 더 찾는다
    const unused = new Set(reserves.filter((r) => anchors.get(r.id) !== 'right').map((r) => r.id))
    if (unused.size) {
      const used = inputs.flatMap((l) => {
        const a = anchors.get(l.id)
        return a ? [pointLabelBox(l.at, l.text, a, px)] : []
      })
      placeAreas(areaOrder, [...contBoxes, ...markBoxes, ...used, ...avoid, ...figBoxes, ...figLabelBoxes, ...detailBoxes])
    }
    return {
      lv: { points: new Set(shownPoints.map((p) => p.id)), cards: shownCards, anchors, areas: areaAt, continents: cont, figures: new Set(shownFigs.map((x) => x.f.key)), figureLabels, details, hiddenAreas },
      contBoxes: [...contBoxes, ...firstBoxes],
      finalBoxes: contBoxes,
    }
  }
  const markOf = new Map<string, { at: Point; text: string }>([...points, ...cards].map((m) => [m.id, { at: m.at, text: nameOf(m) }]))
  const areaById = new Map(areas.map((a) => [a.id, a]))
  /** 그 배치에 놓인 이름의 상자 (장소·카드·지역·그림) */
  const nameBoxes = (lv: LevelLayout, px: number) => {
    const m = new Map<string, Box>()
    for (const [id, a] of lv.anchors) {
      const k = markOf.get(id)
      if (k) m.set(id, pointLabelBox(k.at, k.text, a, px))
    }
    for (const [id, b] of lv.figureLabels) m.set(id, b)
    for (const [id, at] of lv.areas) {
      const a = areaById.get(id)
      if (a) m.set(id, areaLabelBox(nameOf(a), at.at, at.fontPx, px))
    }
    return m
  }
  const none = new Set<string>()
  pxAt.forEach((px, level) => {
    let { lv, contBoxes, finalBoxes } = placeLevel(px, level, none)
    const fig = new Map(figs.map((f) => [f.key, f]))
    const figBox = (k: string) => figurePixelBox(fig.get(k)!.box, opts.uAt?.[level] ?? 1 / px)
    // 대륙명 글자 밑에 깔리는 그림 (상자의 UNDER_CONTINENT 넘게 덮인다)은 전처럼 그 단계에서 숨긴다 — Guul Draz 글자 밑에 Hellcarver Demon 이 점처럼 비쳤다
    const under = new Set(level <= CONTINENT_LAST_LEVEL ? [...lv.figures].filter((k) => finalBoxes.some((b) => coverOf(figBox(k), b) > UNDER_CONTINENT)) : [])
    if (under.size) ({ lv, contBoxes } = placeLevel(px, level, under))
    // 대륙명이 보이는 단계 — 대륙명 상자에 걸린 그림(전에는 통째로 숨겼다)이 다른 이름의 자리를 빼앗으면 그 그림만 그 단계에서 뺀다 (이름은 사라지지 않는다)
    if (level <= CONTINENT_LAST_LEVEL && contBoxes.length) {
      const restored = [...lv.figures].filter((k) => contBoxes.some((b) => overlaps(b, figBox(k))))
      if (restored.length) {
        const drop = new Set<string>(under)
        for (let round = 0; round < 3; round++) {
          const base = placeLevel(px, level, new Set([...drop, ...restored])).lv
          const now = nameBoxes(lv, px)
          const lost = [...nameBoxes(base, px)].filter(([id]) => !now.has(id) && !restored.includes(id))
          if (!lost.length) break
          const left = restored.filter((k) => !drop.has(k))
          const hit = left.filter((k) => lost.some(([, b]) => overlaps(b, figBox(k))))
          for (const k of hit.length ? hit : left) drop.add(k)
          ;({ lv, contBoxes } = placeLevel(px, level, drop))
          if (!restored.some((k) => !drop.has(k))) break
        }
      }
    }
    out.push(lv)
  })
  return out
}

/** 이름마다 처음 보이는 단계 (끝내 자리를 못 받으면 Infinity) — 시험과 '그 장소로 가기'가 쓴다 */
export function firstLevels(layouts: readonly LevelLayout[]): Map<string, number> {
  const first = new Map<string, number>()
  const see = (id: string, level: number) => {
    if (!first.has(id)) first.set(id, level)
  }
  layouts.forEach((l, level) => {
    for (const id of l.anchors.keys()) see(id, level)
    for (const id of l.areas.keys()) see(id, level)
    for (const id of l.continents.keys()) see(id, level)
  })
  return first
}

/** 기호가 처음 그려지는 단계 */
export function firstMarkLevels(layouts: readonly LevelLayout[]): Map<string, number> {
  const first = new Map<string, number>()
  layouts.forEach((l, level) => {
    for (const id of [...l.points, ...l.cards]) if (!first.has(id)) first.set(id, level)
  })
  return first
}

export type { CardMark }
