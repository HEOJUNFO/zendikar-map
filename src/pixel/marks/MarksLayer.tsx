// 장소·대지 카드 기호와 이름, 지역·물 이름, 대륙명 — 캔버스 위의 DOM 층 (docs/pixel-plan.md S3).
// 층 전체가 지도 원점에 붙어, 끌기는 층의 transform 만 바꾼다 (PixelApp 의 draw — React 로 다시 그리지 않는다). 단계가 바뀌면 자리를 다시 셈한다.
// 기호와 이름은 모두 단추라 Tab 으로 닿는다 — 그 단계에 그린 기호만 (그리지 않은 기호는 더 확대하면 나온다, scripts/qa/pixel-labels.mjs 가 모두 어느 단계에선가 그려지는지 본다)
import { memo } from 'react'
import { MESSAGES } from '../../i18n/messages'
import type { Point } from '../../data/types'
import {
  AREA_TRACKING_PX,
  LINE_PX,
  MARK_GAP_PX,
  continentFontPx,
  continentTrackingPx,
  displayName,
  figureLabelBox,
  figurePixelBox,
  textWidthPx,
  type Anchor,
  type DetailLabel,
  type Lang,
  type LevelLayout,
} from '../labels/layout'
import type { Fig } from '../figures/store'
import type { MarkKind, PixelMarks } from './slim'
import { SPRITE_CELLS, SPRITE_PX, spriteUrl, type SpriteColors } from './sprites'
import type { LabelWash } from '../wash'

export type Selection = { type: 'location' | 'card' | 'continent'; id: string }

interface Props {
  marks: PixelMarks
  layout: LevelLayout
  /**
   * 그릴 범위 (지도 단위) — 밖의 기호·이름은 그림·글자 없는 빈 단추로만 둔다 (Tab 으로는 닿고, 초점을 받으면 지도가 그곳으로 옮겨 다시 그린다).
   * 고른 것·초점이 있는 것은 늘 그린다. 없으면 모두
   */
  view: { x0: number; y0: number; x1: number; y1: number } | null
  lang: Lang
  /** 화면 CSS px / 지도 단위 */
  px: number
  /** 한 지도 픽셀의 크기 (지도 단위) — 기호를 그 픽셀 가운데에 둔다 */
  u: number
  dpr: number
  colors: SpriteColors
  selected: SpriteColors
  selection: Selection | null
  focusedId: string | null
  onSelect: (s: Selection) => void
  onFocusMark: (id: string | null, at: Point | null, keyboard: boolean) => void
  /** 시점별 지도(S6)에서 그 무렵 없던 장소 — 이름 자리는 배치에 남지만 기호·이름을 그리지 않는다 (Tab 에도 들지 않는다) */
  hidden?: ReadonlySet<string>
  /** 물빛 테두리를 떼는 물 이름 (물이 빠진 내해) */
  dry?: ReadonlySet<string>
  /**
   * 시점별 지도의 페이즈 그림 (S7) — 그림 자체는 캔버스(figures/store.ts)가 그리고, 여기에는 이름과 키보드로 닿는 단추만.
   * 단추는 그림 상자를 덮되 누름은 지나간다(pointer-events none — 그림 모양으로 판정한다, PixelApp 의 tap), 이름은 누를 수 있다
   */
  figures?: readonly Fig[]
  /** 지역 상세의 이름 (S9) — 자리는 배치(layout.details)가 낸다 */
  details?: readonly DetailLabel[]
  /** 그 무렵 칠 위의 이름 — 테두리를 칠 빛으로 (S23, wash.ts) */
  washOf?: LabelWash | null
}

const HALF = (SPRITE_CELLS * SPRITE_PX) / 2

/** 이름의 자리 — 기호 상자(왼쪽 위 0,0, 한 변 2·HALF) 안의 좌표. labels/layout.ts 의 pointLabelBox 와 같은 셈 */
function nameOffset(anchor: Anchor, w: number): { left: number; top: number } {
  const c = HALF
  switch (anchor) {
    case 'right':
      return { left: c + MARK_GAP_PX, top: c - LINE_PX / 2 }
    case 'left':
      return { left: c - MARK_GAP_PX - w, top: c - LINE_PX / 2 }
    case 'above':
      return { left: c - Math.round(w / 2), top: c - MARK_GAP_PX - LINE_PX }
    case 'below':
      return { left: c - Math.round(w / 2), top: c + MARK_GAP_PX }
  }
}

export const MarksLayer = memo(function MarksLayer(props: Props) {
  const { marks, layout, view, lang, px, u, dpr, colors, selected, selection, focusedId, onSelect, onFocusMark, hidden, dry, figures, details, washOf } = props
  /** 그 이름 줄(화면 좌표 — 층의 원점은 지도 원점)의 칠 class */
  const washClass = (left: number, w: number, midY: number) => {
    const k = washOf?.(left / px, (left + w) / px, midY / px)
    return k ? ` on-${k}` : ''
  }
  const near = (at: Point) => !view || (at[0] >= view.x0 && at[0] <= view.x1 && at[1] >= view.y0 && at[1] <= view.y1)
  const t = MESSAGES[lang]
  // 기호는 그 지도 픽셀의 가운데에 — 기기 픽셀에 맞춘다
  // 기호 상자의 왼쪽 위도 기기 픽셀에 — DPR 1.5 처럼 반 CSS px 가 기기 픽셀 사이에 걸리는 화면에서 흐리지 않게 (center 는 상자 가운데)
  const dev = px * u * dpr
  const snap = (at: number) => (Math.round((Math.floor(at / u) + 0.5) * dev - HALF * dpr) / dpr) + HALF
  const center = (at: Point) => ({ x: snap(at[0]), y: snap(at[1]) })
  const isSel = (type: Selection['type'], id: string) => selection?.type === type && selection.id === id

  const mark = (o: {
    key: string
    kind: MarkKind
    at: Point
    name: string
    hasKo: boolean
    aria: string
    sel: boolean
    pick: () => void
    far: boolean
  }) => {
    const shown = layout.anchors.get(o.key)
    const focused = focusedId === o.key
    const anchor = o.far ? null : shown ?? (focused ? 'right' : null)
    const c = center(o.at)
    const w = textWidthPx(o.name)
    const off = anchor ? nameOffset(anchor, w) : null
    return (
      <button
        key={o.key}
        type="button"
        className={`px-mark${o.sel ? ' is-selected' : ''}${o.far ? ' is-far' : ''}`}
        style={o.far ? { left: c.x - HALF, top: c.y - HALF } : { left: c.x - HALF, top: c.y - HALF, backgroundImage: spriteUrl(o.kind, o.sel ? selected : colors) }}
        aria-label={o.aria}
        aria-pressed={o.sel}
        onClick={o.pick}
        onFocus={(e) => onFocusMark(o.key, o.at, e.currentTarget.matches(':focus-visible'))}
        onBlur={() => onFocusMark(null, null, false)}
      >
        {off && (
          <span className={`px-name${washClass(c.x - HALF + off.left, w, c.y - HALF + off.top + LINE_PX / 2)}`} lang={o.hasKo ? 'ko' : 'en'} style={{ left: off.left, top: off.top }} aria-hidden="true">
            {o.name}
          </span>
        )}
      </button>
    )
  }

  const items: React.ReactNode[] = []
  for (const p of marks.points) {
    if (hidden?.has(p.id)) continue
    const sel = isSel('location', p.id)
    if (!sel && focusedId !== p.id && !layout.points.has(p.id)) continue
    const far = !sel && focusedId !== p.id && !near(p.at)
    const name = displayName(p, lang)
    items.push(
      mark({
        key: p.id,
        kind: p.kind,
        at: p.at,
        name,
        hasKo: lang === 'ko' && Boolean(p.nameKo),
        aria: `${name} — ${t.kind[p.kind]}`,
        sel,
        far,
        pick: () => onSelect({ type: 'location', id: p.id }),
      }),
    )
  }
  for (const c of marks.cards) {
    // 자리가 없는 장소와 하나인 카드는 그 장소의 표시 — 고르면 장소 패널을 연다
    const sel = c.place ? isSel('location', c.place) : isSel('card', c.id)
    if (!sel && focusedId !== c.id && !layout.cards.has(c.id)) continue
    const far = !sel && focusedId !== c.id && !near(c.at)
    const name = displayName(c, lang)
    items.push(
      mark({
        key: c.id,
        kind: c.kind,
        at: c.at,
        name,
        hasKo: lang === 'ko' && Boolean(c.nameKo),
        aria: `${name} — ${c.place ? t.kind[c.kind] : t.landCard}`,
        sel,
        far,
        pick: () => onSelect(c.place ? { type: 'location', id: c.place } : { type: 'card', id: c.id }),
      }),
    )
  }
  // 페이즈 그림 — 이름이 자리를 받은 단계의 이름과, 그 단계에 그리는 그림마다 키보드로 닿는 단추 (장소 기호 밑 차례 — 장소 기호가 먼저 눌린다)
  for (const f of figures ?? []) {
    const key = `f${f.pi}`
    const sel = isSel('card', f.id)
    if (!sel && focusedId !== key && !layout.figures.has(key)) continue
    const far = !sel && focusedId !== key && !near(f.at)
    const name = displayName(f, lang)
    const b = figurePixelBox(f.box, u)
    const left = Math.round(b.x0 * px)
    const top = Math.round(b.y0 * px)
    const w = Math.round((b.x1 - b.x0) * px)
    const h = Math.round((b.y1 - b.y0) * px)
    const anchor = far ? undefined : layout.anchors.get(key)
    let nameAt: { left: number; top: number } | null = null
    let figWash = ''
    if (anchor) {
      const nb = figureLabelBox(b, name, anchor, px)
      nameAt = { left: Math.round(nb.x0 * px) - left, top: Math.round(nb.y0 * px) - top }
      figWash = washClass(nb.x0 * px, (nb.x1 - nb.x0) * px, ((nb.y0 + nb.y1) / 2) * px)
    }
    const aria = lang === 'ko' ? `${name} — ${f.set.toUpperCase()} 카드${f.est ? ', 자리는 추정' : ''}` : `${name} — ${f.set.toUpperCase()} card${f.est ? ', position estimated' : ''}`
    items.push(
      <button
        key={key}
        type="button"
        className={`px-fig${sel ? ' is-selected' : ''}${far ? ' is-far' : ''}`}
        style={far ? { left, top } : { left, top, width: w, height: h }}
        aria-label={aria}
        aria-pressed={sel}
        title={far ? undefined : name}
        onClick={() => onSelect({ type: 'card', id: f.id })}
        onFocus={(e) => onFocusMark(key, f.at, e.currentTarget.matches(':focus-visible'))}
        onBlur={() => onFocusMark(null, null, false)}
      >
        {nameAt && (
          <span className={`px-name${figWash}`} lang={lang === 'ko' && f.nameKo ? 'ko' : 'en'} style={nameAt} aria-hidden="true">
            {name}
          </span>
        )}
      </button>,
    )
  }
  for (const a of marks.areas) {
    // 지역 상세가 다시 쓴 이름(S9)은 그 자리에 빈 단추로만 — 초점·고름이 그 단계에서 사라지지 않게 (그 이름은 지역 상세 이름으로 보인다)
    const hiddenAt = layout.areas.has(a.id) ? undefined : layout.hiddenAreas.get(a.id)
    const place = layout.areas.get(a.id) ?? hiddenAt
    if (!place) continue
    // 초점이 오면 그 자리에 이름을 보인다 — 빈 단추의 초점 테두리는 바다 위의 작은 점이었다 (접근성 검토)
    const far = focusedId !== a.id && (Boolean(hiddenAt) || (!isSel('location', a.id) && !near(place.at)))
    const name = displayName(a, lang)
    const n = [...name].length
    const track = AREA_TRACKING_PX * (place.fontPx / 12)
    const w = textWidthPx(name, place.fontPx) + track * n
    const h = Math.round(place.fontPx * 1.17)
    items.push(
      <button
        key={a.id}
        type="button"
        className={`px-area${a.water && !dry?.has(a.id) ? ' is-water' : ''}${place.fontPx > 12 ? ' is-big' : ''}${isSel('location', a.id) ? ' is-selected' : ''}${far ? ' is-far' : washClass(place.at[0] * px - w / 2, w, place.at[1] * px)}`}
        lang={lang === 'ko' && a.nameKo ? 'ko' : 'en'}
        style={{ left: Math.round(place.at[0] * px - w / 2), top: Math.round(place.at[1] * px - h / 2), letterSpacing: track }}
        aria-pressed={isSel('location', a.id)}
        aria-label={far ? name : undefined}
        onClick={() => onSelect({ type: 'location', id: a.id })}
        onFocus={(e) => onFocusMark(a.id, place.at, e.currentTarget.matches(':focus-visible'))}
        onBlur={() => onFocusMark(null, null, false)}
      >
        {far ? null : name}
      </button>,
    )
  }
  // 지역 상세의 이름 (S9) — 누르지 않는 글 (지금 지도의 .child-label 처럼). ±90° 는 글자째 돌린다 (픽셀이 흐려지지 않는 각만).
  // 같은 글의 이름이 한 화면에 둘 들면 화면 가운데에 가까운 것만 (지금 지도의 detailLabelHidden — 그릴 범위 view 는 화면의 2.5 배라 그 가운데·폭에서 화면을 센다)
  const screen = view && { cx: (view.x0 + view.x1) / 2, cy: (view.y0 + view.y1) / 2, hw: (view.x1 - view.x0) / 5, hh: (view.y1 - view.y0) / 5 }
  const onScreen = (at: Point) => !screen || (Math.abs(at[0] - screen.cx) <= screen.hw && Math.abs(at[1] - screen.cy) <= screen.hh)
  const nearest = new Map<string, { key: string; d: number }>()
  if (screen)
    for (const d of details ?? []) {
      const at = layout.details.get(d.key)?.at
      if (!at || !onScreen(at)) continue
      const dist = Math.hypot(at[0] - screen.cx, at[1] - screen.cy)
      const best = nearest.get(d.name)
      if (!best || dist < best.d) nearest.set(d.name, { key: d.key, d: dist })
    }
  for (const d of details ?? []) {
    const place = layout.details.get(d.key)
    if (!place || !near(place.at)) continue
    const best = nearest.get(d.name)
    if (best && best.key !== d.key && onScreen(place.at)) continue
    const name = displayName(d, lang)
    const n = [...name].length
    const track = d.kind === 'place' ? 0 : AREA_TRACKING_PX * (place.fontPx / 12)
    const w = textWidthPx(name, place.fontPx) + track * n
    const h = Math.round(place.fontPx * 1.17)
    items.push(
      <span
        key={`d:${d.key}`}
        className={`px-area px-detail is-${d.kind}${place.fontPx > 12 ? ' is-big' : ''}`}
        lang={lang === 'ko' && d.nameKo ? 'ko' : 'en'}
        style={{
          left: Math.round(place.at[0] * px - w / 2),
          top: Math.round(place.at[1] * px - h / 2),
          letterSpacing: track,
          ...(place.rot ? { transform: `rotate(${place.rot}deg)` } : {}),
        }}
      >
        {name}
      </span>,
    )
  }
  // 대륙명은 맨 밑에 (DOM 앞) — 휴대폰 개관에서 대륙명의 글자 테두리가 장소 기호를 덮었다 (검토)
  const conts: React.ReactNode[] = []
  for (const c of marks.continents) {
    // 그 단계에 놓이지 않은 대륙명도 초점·고름이 있으면 빈 단추로 남긴다 — 확대하면 초점이 있던 단추가 사라져 몸으로 빠졌다 (접근성 검토)
    const laid = layout.continents.get(c.id)
    const at = laid ?? (focusedId === c.id || isSel('continent', c.id) ? c.at : undefined)
    if (!at) continue
    const far = !laid || (focusedId !== c.id && !isSel('continent', c.id) && !near(at))
    const name = displayName(c, lang)
    const font = continentFontPx(px)
    const track = continentTrackingPx(px)
    const w = textWidthPx(name, font) + track * [...name].length
    const h = Math.round(font * 1.17)
    conts.push(
      <button
        key={c.id}
        type="button"
        className={`px-continent${font > 12 ? ' is-big' : ''}${isSel('continent', c.id) ? ' is-selected' : ''}${far ? ' is-far' : washClass(at[0] * px - w / 2, w, at[1] * px - h * 0.25)}`}
        lang={lang}
        style={{ left: Math.round(at[0] * px - w / 2), top: Math.round(at[1] * px - h * 0.75), letterSpacing: track }}
        aria-pressed={isSel('continent', c.id)}
        aria-label={far ? name : undefined}
        onClick={() => onSelect({ type: 'continent', id: c.id })}
        onFocus={(e) => onFocusMark(c.id, at, e.currentTarget.matches(':focus-visible'))}
        onBlur={() => onFocusMark(null, null, false)}
      >
        {far ? null : name}
      </button>,
    )
  }
  return (
    <>
      {conts}
      {items}
    </>
  )
})
