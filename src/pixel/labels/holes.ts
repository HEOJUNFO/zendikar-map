// 흩뿌린 지형 기호가 비키는 상자 (S4, docs/pixel-plan.md) — 단계마다 자리를 받은 이름(장소·카드 이름, 지역·물 이름)과 장소·카드 기호.
// 지금 지도의 captionHoles·cutGlyphs 와 같은 몫이다: 기호를 뿌리는 셈은 건드리지 않고 그린 뒤 걸리는 것만 뺀다 (이름 자리는 그대로).
// 대륙명은 넣지 않는다 (개관에만 나오는 큰 글자라 상자를 비우면 대륙 한복판의 산맥·숲이 띠째 빈다 — 지금 지도와 같다).
// 고른 것·초점 때문에 단 이름도 넣지 않는다 (타일을 다시 그리게 된다).
import { SPRITE_CELLS, SPRITE_PX } from '../marks/sprites.ts'
import type { PixelMarks } from '../marks/slim.ts'
import { areaLabelBox, displayName, pointLabelBox, type Box, type Lang, type LevelLayout } from './layout.ts'

/** 기호 단추의 반폭 (화면 CSS px) — 그 테두리 한 칸까지 */
const MARK_HALF_PX = (SPRITE_CELLS * SPRITE_PX) / 2 + 1

/** 단계 하나의 상자들 (지도 단위). hidden: 그 무렵 없던 장소 (S6) — 그리지 않으니 기호를 비키게 하지 않는다 (지금 지도와 같다) */
export function levelHoles(marks: PixelMarks, layout: LevelLayout, lang: Lang, px: number, hidden?: ReadonlySet<string>, withMarks = true): Box[] {
  const out: Box[] = []
  const r = MARK_HALF_PX / px
  // 이름 글자 둘레 3px 까지 (지금 지도의 CAPTION_HOLE_PAD_PX — 모든 이름. S19: 장소·지역 이름은 글자 상자 그대로라 산 기호가 'Akoum Skyclave' 의 끝 글자에 붙었다)
  const pad = 3 / px
  const padded = (b: Box): Box => ({ x0: b.x0 - pad, y0: b.y0 - pad, x1: b.x1 + pad, y1: b.y1 + pad })
  const pointAt = new Map(marks.points.map((p) => [p.id, p]))
  const cardAt = new Map(marks.cards.map((c) => [c.id, c]))
  // 기호 없이 이름만 (S20 — 떠 있는 헤드론이 비키는 상자, 지금 지도의 captionHoles)
  if (withMarks) for (const id of layout.points) {
    if (hidden?.has(id)) continue
    const p = pointAt.get(id)
    if (p) out.push({ x0: p.at[0] - r, y0: p.at[1] - r, x1: p.at[0] + r, y1: p.at[1] + r })
  }
  if (withMarks) for (const id of layout.cards) {
    const c = cardAt.get(id)
    if (c) out.push({ x0: c.at[0] - r, y0: c.at[1] - r, x1: c.at[0] + r, y1: c.at[1] + r })
  }
  for (const [id, anchor] of layout.anchors) {
    if (hidden?.has(id)) continue
    const m = pointAt.get(id) ?? cardAt.get(id)
    if (m) out.push(padded(pointLabelBox(m.at, displayName(m, lang), anchor, px)))
  }
  for (const a of marks.areas) {
    const place = layout.areas.get(a.id)
    if (place) out.push(padded(areaLabelBox(displayName(a, lang), place.at, place.fontPx, px)))
  }
  // 그림 이름 (S7) — 그림 몸은 기호를 비키게 하지 않는다 (그 위에 그린다 — 지금 지도와 같다)
  for (const b of layout.figureLabels.values()) out.push(padded(b))
  // 지역 상세의 이름 (S9) — 지금 지도도 나와 있는 지역 상세의 이름 밑 기호를 뺀다
  for (const d of layout.details.values()) out.push(padded(d.box))
  return out
}

/**
 * 타일마다 넘기는 이름 상자의 여유 (지도 단위) — 흩뿌린 기호 그림은 8 픽셀이라 10 픽셀, 한 픽셀 ≤ 1 단위에서는 지금 지도의 모양대로 그리는 봉우리(객체 다듬기 A1 —
 * 너비 23·높이 16 단위까지)가 이웃 타일의 이름 상자에도 걸려 빠지니 24 단위 (좁으면 한쪽 타일에서만 빠져 이음매가 생겼다)
 */
export const holeMargin = (u: number) => Math.max(10 * u, u <= 1 ? 24 : 0)

/** 타일(지도 단위의 상자에 기호 몫 margin 을 더한 것)에 닿는 상자만 [x0, y0, x1, y1, …] */
export function holesIn(boxes: readonly Box[], x0: number, y0: number, x1: number, y1: number): Float32Array {
  const hit: number[] = []
  for (const b of boxes) if (b.x1 > x0 && b.x0 < x1 && b.y1 > y0 && b.y0 < y1) hit.push(b.x0, b.y0, b.x1, b.y1)
  return Float32Array.from(hit)
}
