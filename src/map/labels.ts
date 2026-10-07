// 지점 라벨 겹침 정리 — 배율 단계(tier)마다 중요한 라벨부터 자리를 잡는다.
// 지점 라벨은 화면 크기가 고정이라, 배율이 커질수록 지도 단위로는 작아져 더 많이 들어간다.
import type { Point } from './geometry'

export type Anchor = 'right' | 'left' | 'above' | 'below'

export interface LabelInput {
  id: string
  at: Point
  text: string
  /** 0~3, 클수록 먼저·낮은 배율에서 자리를 받는다 */
  prominence: number
  fontPx: number
  /** 이 tier 부터 기호를 그린다 — 그 아래 tier 에서는 라벨도 자리를 받지 않는다 (작은 섬 위의 기호) */
  fromTier?: number
  /** 라벨을 둘 수 있는 쪽 (앞일수록 먼저) — 없으면 오른쪽·왼쪽·위·아래. 페이즈 그림의 이름은 그림 밑에 단다 */
  anchors?: Anchor[]
  /** 쪽마다 기준점을 달리 둘 때 — 페이즈 그림은 아래는 그림 밑 가운데, 옆은 그림 옆 가운데 */
  anchorAt?: Partial<Record<Anchor, Point>>
  /** 장소·카드 라벨이 모두 자리를 잡은 뒤 남는 자리에만 둔다 (자식 지도 틀 이름표·페이즈 그림 이름) — 장소 이름을 밀어내지 않게. 기준점에 기호 상자도 두지 않는다 */
  last?: boolean
  /** 이름 끝에 붙는 표시의 폭(px, 틈 포함) — 페이즈1에서 지역 지도가 있는 곳의 접힌 지도 아이콘. 왼쪽 라벨은 글자 앞(-x)에 붙는다 */
  suffixPx?: number
}

/** 지도 단위 상자 */
export interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface LabelPlacement {
  /** 이 tier 부터 보인다. 끝내 자리를 못 잡으면 Infinity */
  minTier: number
  /** tier 별 위치 */
  anchors: (Anchor | null)[]
  /** tier 별로 이름 끝 표시(suffixPx)까지 자리를 잡았는가 — 표시를 붙이면 자리가 없을 때는 표시 없이 이름만 둔다 */
  suffixed: boolean[]
}

/** 글자 폭 추정 — IM Fell 라틴 0.5em 안팎, 한글 1em */
export function textWidthEm(text: string): number {
  let w = 0
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0
    if (c >= 0xac00 && c <= 0xd7a3) w += 0.98
    else if (ch === ' ') w += 0.26
    else if (/[A-Z]/.test(ch)) w += 0.66
    else if (/[il'’.,]/.test(ch)) w += 0.26
    else w += 0.47
  }
  return w
}

const MARKER_GAP_PX = 7

function boxFor(l: LabelInput, anchor: Anchor, pxPerUnit: number, withSuffix = true) {
  const u = 1 / pxPerUnit
  const w = textWidthEm(l.text) * l.fontPx * u
  const h = l.fontPx * 1.15 * u
  const g = MARKER_GAP_PX * u
  // 이름 끝 표시 — 오른쪽·위·아래 라벨은 글자 끝(+x)에, 왼쪽 라벨은 글자 앞(-x)에 붙는다 (기호와 이름 사이에 끼지 않게)
  const s = withSuffix ? (l.suffixPx ?? 0) * u : 0
  const [x, y] = l.anchorAt?.[anchor] ?? l.at
  switch (anchor) {
    case 'right':
      return { x0: x + g, y0: y - h / 2, x1: x + g + w + s, y1: y + h / 2 }
    case 'left':
      return { x0: x - g - w - s, y0: y - h / 2, x1: x - g, y1: y + h / 2 }
    case 'above':
      return { x0: x - w / 2, y0: y - g - h, x1: x + w / 2 + s, y1: y - g }
    case 'below':
      return { x0: x - w / 2, y0: y + g, x1: x + w / 2 + s, y1: y + g + h }
  }
}

const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1

/**
 * @param obstacles tier 별로 피해야 할 상자 (지역 라벨, 대륙 라벨)
 * @param tierPx 각 tier 의 최소 px/단위 (가장 빽빽한 경우로 판정)
 * @param showFromProminence tier 별로 보여 줄 최소 prominence
 */
export function placeLabels(
  labels: LabelInput[],
  obstacles: Box[][],
  tierPx: number[],
  showFromProminence: number[],
): Map<string, LabelPlacement> {
  const result = new Map<string, LabelPlacement>()
  for (const l of labels) result.set(l.id, { minTier: Infinity, anchors: tierPx.map(() => null), suffixed: tierPx.map(() => false) })
  const order = [...labels].sort((a, b) => b.prominence - a.prominence || a.text.length - b.text.length)
  const ANCHORS: Anchor[] = ['right', 'left', 'above', 'below']

  tierPx.forEach((px, tier) => {
    const placed: Box[] = [...(obstacles[tier] ?? [])]
    // 마커 자체도 가린다 — 기호는 반지름 6~7px
    const markerR = 6 / px
    for (const l of labels) {
      if (l.last) continue
      const [x, y] = l.at
      placed.push({ x0: x - markerR, y0: y - markerR, x1: x + markerR, y1: y + markerR })
    }
    const prevVisible = (l: LabelInput) => tier > 0 && result.get(l.id)!.anchors[tier - 1] !== null
    // 앞 단계에 보이던 라벨이 먼저(단계가 바뀌어도 덜 흔들리게), 뒤로 미룬 라벨(last)은 언제나 맨 나중
    const main = order.filter((l) => !l.last)
    const late = order.filter((l) => l.last)
    const queue = [
      ...main.filter(prevVisible),
      ...main.filter((l) => !prevVisible(l)),
      ...late.filter(prevVisible),
      ...late.filter((l) => !prevVisible(l)),
    ]
    for (const l of queue) {
      if (l.prominence < showFromProminence[tier] || tier < (l.fromTier ?? 0)) continue
      const pl = result.get(l.id)!
      const prev = tier > 0 ? pl.anchors[tier - 1] : null
      const allowed = l.anchors ?? ANCHORS
      const tries = prev ? [prev, ...allowed.filter((a) => a !== prev)] : allowed
      // 쪽마다 이름 끝 표시까지 들어가는지 보고, 안 되면 그 쪽에 이름만 — 표시 때문에 라벨이 다른 쪽으로 옮겨 가지 않게.
      // 표시까지 자리를 잡은 라벨은 그 폭을 차지하므로, 뒤에 자리를 잡는 라벨은 그만큼 비켜 간다
      const passes = l.suffixPx ? [true, false] : [false]
      for (const a of tries) {
        const withSuffix = passes.find((s) => !placed.some((p) => overlaps(p, boxFor(l, a, px, s))))
        if (withSuffix === undefined) continue
        placed.push(boxFor(l, a, px, withSuffix))
        pl.anchors[tier] = a
        pl.suffixed[tier] = withSuffix
        pl.minTier = Math.min(pl.minTier, tier)
        break
      }
    }
  })
  return result
}

export interface AreaLabelInput {
  id: string
  at: Point
  /** 영역 반지름 — 라벨을 영역 안에서 옮길 수 있는 범위 */
  extent?: readonly [number, number]
  text: string
  prominence: number
  /** 이름 끝(오른쪽)에 붙는 표시의 폭(px, 틈 포함) — LabelInput.suffixPx 와 같다 */
  suffixPx?: number
}

export interface AreaLabelStyle {
  /** 지도 단위 기본 크기 — 지도와 함께 커진다 */
  base: number
  /** 화면 px 상한·하한 */
  minPx: number
  maxPx: number
  /** 이 화면 크기(px)보다 작아지면 보이지 않는다 */
  showPx: number
}

/** 화면 크기를 상한·하한 사이로 묶은 글자 크기 (지도 단위) */
export function areaFontUnits(style: AreaLabelStyle, pxPerUnit: number): number {
  const px = Math.min(style.maxPx, Math.max(style.minPx, style.base * pxPerUnit))
  return px / pxPerUnit
}

/** 지역 라벨의 자간 (map.css 의 .area-label letter-spacing) */
export const AREA_TRACKING = 0.12

/** 지역 라벨 글자 폭 추정 (지도 단위) — 자간까지 */
export function areaTextWidth(text: string, fontUnits: number, tracking = AREA_TRACKING): number {
  return textWidthEm(text) * fontUnits * (1 + tracking)
}

/** @param suffixUnits 이름 끝(오른쪽)에 붙는 표시의 폭 (지도 단위) — 가운데 맞춘 글자의 오른쪽으로만 늘어난다 */
export function areaLabelBox(text: string, at: Point, fontUnits: number, suffixUnits = 0): Box {
  const w = areaTextWidth(text, fontUnits) + fontUnits * 0.4
  const h = fontUnits * 1.25
  return { x0: at[0] - w / 2, y0: at[1] - h * 0.75, x1: at[0] + w / 2 + suffixUnits, y1: at[1] + h * 0.25 }
}

/** 라벨을 놓아 볼 자리 — 영역 가운데부터, 끝으로 영역 바로 아래·위 (작은 섬처럼 영역이 라벨보다 좁을 때) */
function candidates(l: AreaLabelInput, font: number): Point[] {
  const [x, y] = l.at
  if (!l.extent) return [l.at, [x, y + font * 1.3], [x, y - font * 1.1]]
  const [rx, ry] = l.extent
  return [
    l.at,
    [x, y + ry * 0.45],
    [x, y - ry * 0.45],
    [x - rx * 0.35, y + ry * 0.25],
    [x + rx * 0.35, y + ry * 0.25],
    [x, y + ry * 0.8],
    [x, y + ry + font * 0.95],
    [x, y - ry - font * 0.35],
  ]
}

/**
 * 지역·물 라벨 겹침 정리 — 중요한 것부터 영역 안의 빈 자리를 찾고, 끝내 못 찾으면 이 배율에서 숨긴다.
 * 라벨 크기가 화면 px 로 묶여 있어 확대할수록 지도 단위로는 작아지고, 숨었던 라벨이 나타난다.
 * reserved: 먼저 자리를 내줘야 하는 상자 (중요한 지점의 마커와 라벨)
 */
export function layoutAreaLabels(
  labels: AreaLabelInput[],
  styleFor: (prominence: number) => AreaLabelStyle,
  pxPerUnit: number,
  blocked: Box[],
): { at: Map<string, Point>; boxes: Box[]; suffixed: Set<string> } {
  const order = [...labels].sort((a, b) => b.prominence - a.prominence || a.text.length - b.text.length)
  const boxes: Box[] = []
  const at = new Map<string, Point>()
  // 이름 끝 표시까지 자리를 잡은 라벨
  const suffixed = new Set<string>()
  for (const l of order) {
    const style = styleFor(l.prominence)
    if (style.base * pxPerUnit < style.showPx) continue
    const font = areaFontUnits(style, pxPerUnit)
    // 자리마다 이름 끝 표시까지 들어가는지 보고, 안 되면 그 자리에 이름만 — 표시 때문에 라벨이 옮겨 가지 않게
    const passes = l.suffixPx ? [l.suffixPx / pxPerUnit, 0] : [0]
    const free = (box: Box) => !blocked.some((b) => overlaps(b, box)) && !boxes.some((b) => overlaps(b, box))
    for (const c of candidates(l, font)) {
      const suffix = passes.find((s) => free(areaLabelBox(l.text, c, font, s)))
      if (suffix === undefined) continue
      boxes.push(areaLabelBox(l.text, c, font, suffix))
      at.set(l.id, c)
      if (suffix) suffixed.add(l.id)
      break
    }
  }
  return { at, boxes, suffixed }
}

/** 중요한 지점이 차지할 자리 — 마커와 오른쪽 라벨 (이름 끝 표시는 넣지 않는다 — 표시는 지역 라벨에 자리를 양보한다) */
export function pointReserveBox(l: LabelInput, pxPerUnit: number): Box {
  const box = boxFor(l, 'right', pxPerUnit, false)
  const r = 6 / pxPerUnit
  return { x0: l.at[0] - r, y0: Math.min(box.y0, l.at[1] - r), x1: box.x1, y1: Math.max(box.y1, l.at[1] + r) }
}
