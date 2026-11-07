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
}

export function layoutLevels(marks: PixelMarks, lang: Lang, pxAt: readonly number[], mapW: number, opts: LayoutOptions = {}): LevelLayout[] {
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
  pxAt.forEach((px, level) => {
    const prev = out[level - 1]
    const showFrom = SHOW_FROM[level] ?? 0
    const shownPoints = pointOrder.filter((p) => p.prominence >= showFrom)
    const cont = new Map<string, Point>()
    const contBoxes: Box[] = []
    if (level <= CONTINENT_LAST_LEVEL)
      for (const c of continents) {
        const { at, box } = continentLabel(c, lang, px, mapW)
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
        const near = (q: Point) => Math.hypot(q[0] - c.at[0], q[1] - c.at[1]) < gap
        if (taken.some(near) || under(c.at)) continue
        taken.push(c.at)
        shownCards.add(c.id)
      }
    }
    const shownCardList = cardOrder.filter((c) => shownCards.has(c.id))
    const markBoxes = [...shownPoints.map((p) => markBox(p.at, px)), ...shownCardList.map((c) => markBox(c.at, px, 8))]
    // 페이즈 그림 — 그 단계 픽셀로 minPx 이상이고 화면에서 14px 이상 (지금 지도의 FIGURE_MIN_PX), 대륙명 밑이면 대륙명이 보이는 단계에서는 숨긴다
    const u = opts.uAt?.[level] ?? 1 / px
    const shownFigs = figs.flatMap((f) => {
      if (f.size / u < minPx || f.size * px < 14) return []
      const box = figurePixelBox(f.box, u)
      return contBoxes.some((b) => overlaps(b, box)) ? [] : [{ f, box }]
    })
    const figBoxes = shownFigs.map((x) => x.box)

    // 지역 이름 — 중요한 장소(prominence 2 이상)의 기호와 오른쪽 이름 자리를 먼저 비워 둔다
    const reserves = shownPoints.filter((p) => p.prominence >= 2).map((p) => ({ id: p.id, box: pointLabelBox(p.at, nameOf(p), 'right', px) }))
    const areaAt = new Map<string, AreaPlace>()
    const areaBoxes: Box[] = []
    const placeAreas = (list: AreaMark[], blocked: Box[]) => {
      const taken = gridAt(px)
      for (const b of blocked) taken.add(b)
      for (const b of areaBoxes) taken.add(b)
      for (const l of list) {
        const font = areaFontPx(l.prominence, px)
        if (font === null || areaAt.has(l.id)) continue
        const text = nameOf(l)
        for (const c of areaCandidates(l, text, font, px)) {
          const box = areaLabelBox(text, c, font, px)
          if (taken.hits(box)) continue
          taken.add(box)
          areaBoxes.push(box)
          areaAt.set(l.id, { at: c, fontPx: font })
          break
        }
      }
    }
    const blockedBase = [...contBoxes, ...markBoxes, ...reserves.map((r) => r.box), ...avoid, ...figBoxes]
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
    for (const b of [...contBoxes, ...areaBoxes, ...markBoxes, ...figBoxes]) placed.add(b)
    // 그림 상자는 빼고 이름·기호만 — 가장 깊은 단계에서 자리를 못 받은 그림 이름이 마지막으로 이웃 그림 위에 앉는 몫 (아래)
    const namesOnly = gridAt(px)
    for (const b of [...contBoxes, ...areaBoxes, ...markBoxes]) namesOnly.add(b)
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
    for (const l of queue) {
      const before = reservedSide.get(l.id) ?? prev?.anchors.get(l.id)
      const tries = before ? [before, ...SIDES.filter((s) => s !== before)] : SIDES
      for (const a of tries) {
        const box = pointLabelBox(l.at, l.text, a, px)
        if (placed.hits(box)) continue
        placed.add(box)
        namesOnly.add(box)
        anchors.set(l.id, a)
        break
      }
    }

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
    const missed: typeof figQueue = []
    for (const x of figQueue) {
      const { f, box } = x
      const text = nameOf(f)
      const before = prev?.anchors.get(f.key)
      const tries = [...new Set([f.prefer, before, 'below', 'right', 'left'].filter((a): a is Anchor => Boolean(a)))]
      let got = false
      for (const a of tries) {
        const b = figureLabelBox(box, text, a, px)
        if (placed.hits(b)) continue
        placed.add(b)
        namesOnly.add(b)
        figLabelBoxes.push(b)
        figureLabels.set(f.key, b)
        anchors.set(f.key, a)
        got = true
        break
      }
      if (!got) missed.push(x)
    }
    // 가장 깊은 단계 — 그림이 몰려 네 쪽이 모두 이웃 그림에 막힌 이름은 이웃 그림 위에라도 (이름끼리·기호와는 겹치지 않게, 제 그림은 덮지 않게).
    // 지금 지도는 256배까지 확대해 이름이 그림에 견줘 작아지지만 픽셀 지도의 가장 깊은 단계는 그만큼 깊지 않다 — 이름은 옮겨 앉아도 사라지면 안 된다
    if (deepest)
      for (const { f, box } of missed) {
        const text = nameOf(f)
        for (const a of [...new Set([f.prefer, 'below', 'right', 'left', 'above'].filter((v): v is Anchor => Boolean(v)))]) {
          const b = figureLabelBox(box, text, a, px)
          if (namesOnly.hits(b)) continue
          namesOnly.add(b)
          placed.add(b)
          figLabelBoxes.push(b)
          figureLabels.set(f.key, b)
          anchors.set(f.key, a)
          break
        }
      }

    // 비워 둔 오른쪽 자리에 그 이름이 앉지 않았으면 그 자리는 빈다 — 자리를 못 받은 지역 이름이 놓인 이름을 모두 비켜 한 번 더 찾는다
    const unused = new Set(reserves.filter((r) => anchors.get(r.id) !== 'right').map((r) => r.id))
    if (unused.size) {
      const used = inputs.flatMap((l) => {
        const a = anchors.get(l.id)
        return a ? [pointLabelBox(l.at, l.text, a, px)] : []
      })
      placeAreas(areaOrder, [...contBoxes, ...markBoxes, ...used, ...avoid, ...figBoxes, ...figLabelBoxes])
    }
    out.push({ points: new Set(shownPoints.map((p) => p.id)), cards: shownCards, anchors, areas: areaAt, continents: cont, figures: new Set(shownFigs.map((x) => x.f.key)), figureLabels })
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
