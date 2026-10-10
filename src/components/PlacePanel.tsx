import { Fragment, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import type { LandscapeFeature } from '../data'
import type { LandCard } from '../data/cards'
import type { PhaseCard } from '../data/phase1'
import { isPlaced, type Continent, type Location, type Source } from '../data/types'
import { CHILD_MAP_ICON } from '../map/glyphs'
import { KIND_LABEL, LANDSCAPE_KIND_LABEL, PLACEMENT_NOTE, TERRAIN_LABEL } from './labels'
import './PlacePanel.css'

interface Props {
  /** 패널이 지도를 얼마나 가리는지 App 이 잰다 */
  panelRef: RefObject<HTMLElement | null>
  location: Location | null
  continent: Continent | null
  /** 대륙 패널에서 보여 줄 소속 장소 */
  continentPlaces: Location[]
  /** 대륙 패널의 장소 목록에 함께 싣는 카드 — 장소로는 목록에 오르지 않지만 지도에 카드 표시가 있는 것 */
  continentCards: LandCard[]
  continentOf: (id: string | null) => Continent | null
  /** 카드 패널을 열었을 때 — 대지 카드, 또는 지도에 대상이 그려진 페이즈1 카드 */
  card: LandCard | PhaseCard | null
  /** 지금 장소와 하나인 카드 (카드 이름이 곧 이 장소의 이름이나 별칭) — 장소 패널에 그림과 함께 싣는다 */
  placeCard: LandCard | null
  /** 지금 장소에 이어진 다른 카드 (장소 패널에서 카드 패널로 가는 링크) */
  cardsHere: LandCard[]
  /** 지금 장소에 그려진 페이즈1 카드 (페이즈를 켰을 때만) */
  phaseCardsHere: PhaseCard[]
  /** 이 장소의 지역 상세 — 깊이 확대하면 나오는 그림. '가까이 보기'로 그 배율에 간다 (장소를 누른 다음 한 단계) */
  childDetailHere: { id: string; note?: string } | null
  onZoomToDetail: (id: string) => void
  /** 지도에 표시가 있는 장소인가 — 대륙 패널에서 '이 대륙의 장소'와 '위치가 알려지지 않은 곳'을 가른다 */
  onMap: (l: Location) => boolean
  /** 지금 장소와 하나인 바탕 지형 (지도에 그린 산줄기·절벽·폭포 등) */
  featuresHere: LandscapeFeature[]
  /** 지금 대륙의 바탕 지형 — 이 지도가 자리를 고른(추정) 것 가운데 장소에 매이지 않은 것만 패널에 싣는다 */
  continentFeatures: LandscapeFeature[]
  locationOf: (id: string) => Location | null
  onSelectCard: (id: string) => void
  onSelectLocation: (id: string) => void
  onSelectContinent: (id: string) => void
  /** byKey: Escape 로 닫았다 — 움직임 없이 */
  onClose: (byKey?: boolean) => void
  /** 닫히는 중 — 마지막 내용을 그린 채 나간다 (누를 수 없다) */
  closing: boolean
  /** 나가는 움직임이 끝났다 — App 이 패널을 내린다 */
  onClosed: () => void
}

const RARITY: Record<LandCard['rarity'], string> = { common: '커먼', uncommon: '언커먼', rare: '레어', mythic: '미식 레어' }

// 같은 카드의 Scryfall 주소는 하나로 친다 (…/card/zen/212 와 …/card/zen/212/crypt-of-agadeem)
const sourceKey = (s: Source) => s.url?.match(/scryfall\.com\/card\/[^/]+\/[^/?#]+/)?.[0] ?? s.url ?? s.label

/** 장소의 출처 뒤에 그 장소와 하나인 카드의 출처를 겹치지 않게 잇는다 */
function withCardSources(own: Source[], card: LandCard | null): Source[] {
  if (!card) return own
  const seen = new Set(own.map(sourceKey))
  return [...own, ...card.sources.filter((s) => !seen.has(sourceKey(s)))]
}

/** 그림이 오면(또는 못 오면) 보인다 — 이미 받아 둔 그림은 처음부터 보여 옅어지지 않는다 */
const markLoaded = (img: HTMLImageElement | null) => {
  if (img && img.complete) img.dataset.loaded = ''
}

/** 카드 그림 — Scryfall 에서 늦게 오면 카드 꼴 빈 자리 위에 옅게 떠오른다 */
function CardImage({ src, name }: { src: string; name: string }) {
  return (
    <img
      className="card-image"
      ref={markLoaded}
      src={src}
      alt={`${name} 카드 — Scryfall 에서 보기`}
      width={244}
      height={340}
      decoding="async"
      onLoad={(e) => markLoaded(e.currentTarget)}
      onError={(e) => markLoaded(e.currentTarget)}
    />
  )
}

/** 시트를 이만큼 빠르게 튕기면 거리와 상관없이 닫는다 (px/ms) */
const FLICK = 0.11
const SHEET_MEDIA = '(max-width: 767px)'

/** 놓기 직전 이만큼(ms)의 움직임으로 빠르기를 잰다 — 잡고 쉬다가 튕겨도 튕긴 것으로 읽게 */
const FLICK_WINDOW = 100

/** 끌고 있는 시트 — pointer 는 손잡이를 잡은 포인터, 내용에서 끈 터치면 null. trail 은 최근 움직임 */
interface SheetDrag {
  pointer: number | null
  y0: number
  dy: number
  trail: { dy: number; t: number }[]
}

function beginDrag(el: HTMLElement, pointer: number | null, y0: number): SheetDrag {
  el.style.transition = 'none'
  return { pointer, y0, dy: 0, trail: [{ dy: 0, t: performance.now() }] }
}

function followDrag(el: HTMLElement, d: SheetDrag, y: number) {
  d.dy = y - d.y0
  const now = performance.now()
  d.trail.push({ dy: d.dy, t: now })
  // 창보다 오래된 것은 하나만 남긴다 (창 안에 표본이 하나뿐이어도 빠르기를 잴 수 있게)
  while (d.trail.length > 2 && now - d.trail[1].t > FLICK_WINDOW) d.trail.shift()
  // 위로는 고무줄처럼 — 24px 너머로는 가지 않는다
  const shift = d.dy >= 0 ? d.dy : d.dy / (1 - d.dy / 24)
  el.style.transform = `translateY(${shift}px)`
}

/** 놓았다 — 닫을 만큼 끌었거나 튕겼으면 true */
function releaseDrag(el: HTMLElement, d: SheetDrag, cancelled: boolean): boolean {
  // 놓기 직전의 빠르기 — 그 창 안에서 움직이지 않았으면 0
  const now = performance.now()
  const from = d.trail.find((s) => now - s.t <= FLICK_WINDOW * 1.5)
  const v = from ? (d.dy - from.dy) / Math.max(1, now - from.t) : 0
  const dismiss = !cancelled && d.dy > 0 && (d.dy > el.offsetHeight * 0.3 || (d.dy > 12 && v > FLICK))
  el.style.transition = ''
  // 놓은 자리에서 CSS 전환이 이어받는다 — 닫으면 아래로, 아니면 제자리로.
  // 움직임을 줄였으면 미끄러지지 않고 놓은 자리에서 옅어진다
  if (!dismiss || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) el.style.transform = ''
  return dismiss
}

/**
 * 휴대폰 시트를 끌어 내려 닫기 — 손잡이에서, 또는 내용을 맨 위까지 올린 채 아래로 끌 때.
 * 끄는 동안은 시트에 transform 을 바로 쓰고, 놓으면 CSS 전환이 그 자리에서 이어받는다.
 * 위로 끌면 갈수록 덜 따라온다. 첫 손가락만 따른다
 */
function useSheetDrag(panelRef: RefObject<HTMLElement | null>, shown: boolean, closing: boolean, onDismiss: () => void) {
  const drag = useRef<SheetDrag | null>(null)
  const dismissRef = useRef(onDismiss)
  useEffect(() => {
    dismissRef.current = onDismiss
  }, [onDismiss])

  // 닫히기 시작하면 끌던 것을 잊는다 — 끄는 중에 Escape 등으로 닫혀 손을 뗀 소식을 못 받아도 다음 끌기가 막히지 않게.
  // 닫히다 다시 열리면 끌던 자리(움직임을 줄인 경우 남겨 둔 것)를 지운다
  useEffect(() => {
    const el = panelRef.current
    // 끄는 중에 닫히면 끌 때 막아 둔 전환을 풀어, 닫히는 움직임이 그 자리에서 이어지게 한다
    if (closing && drag.current && el) el.style.transition = ''
    if (closing || !shown) drag.current = null
    if (!closing && el) {
      el.style.transform = ''
      el.style.transition = ''
    }
  }, [closing, shown, panelRef])

  // 내용에서 끌기 — 터치만. 첫 움직임이 맨 위에서 아래로면 시트를, 아니면 내용 스크롤을 따른다
  useEffect(() => {
    const el = panelRef.current
    if (!shown || closing || !el) return
    let touch: { id: number; x0: number; y0: number } | null = null
    const own = (e: TouchEvent) => [...e.changedTouches].find((t) => t.identifier === touch?.id)
    const onStart = (e: TouchEvent) => {
      if (touch || drag.current || e.touches.length > 1 || !window.matchMedia(SHEET_MEDIA).matches) return
      if ((e.target as Element).closest('.sheet-handle')) return
      const t = e.changedTouches[0]
      touch = { id: t.identifier, x0: t.clientX, y0: t.clientY }
    }
    const onMove = (e: TouchEvent) => {
      const t = own(e)
      if (!touch || !t) return
      if (!drag.current) {
        const dx = t.clientX - touch.x0
        const dy = t.clientY - touch.y0
        if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return
        if (el.scrollTop > 0 || dy <= 0 || Math.abs(dy) < Math.abs(dx)) {
          touch = null
          return
        }
        drag.current = beginDrag(el, null, touch.y0)
      }
      if (drag.current.pointer !== null) return
      if (e.cancelable) e.preventDefault()
      followDrag(el, drag.current, t.clientY)
    }
    const onEnd = (e: TouchEvent) => {
      if (!touch || !own(e)) return
      touch = null
      const d = drag.current
      if (d?.pointer !== null || !d) return
      drag.current = null
      if (releaseDrag(el, d, e.type === 'touchcancel')) dismissRef.current()
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
      // 끄는 중에 내려가면 다음에 열 때 남지 않게
      if (drag.current?.pointer === null) drag.current = null
    }
  }, [shown, closing, panelRef])

  // 손잡이에서 끌기 — 마우스·펜·터치. 끄는 동안 시트 밖으로 나가도 놓치지 않게 붙잡는다
  const end = (e: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
    const d = drag.current
    const el = panelRef.current
    if (!d || d.pointer !== e.pointerId) return
    drag.current = null
    if (el && releaseDrag(el, d, cancelled)) dismissRef.current()
  }
  return {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      const el = panelRef.current
      if (drag.current || !el || !e.isPrimary || e.button !== 0) return
      drag.current = beginDrag(el, e.pointerId, e.clientY)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const el = panelRef.current
      if (el && drag.current?.pointer === e.pointerId) followDrag(el, drag.current, e.clientY)
    },
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => end(e, false),
    onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => end(e, true),
    // 붙잡은 것을 잃으면(시트가 내려가거나 시스템 몸짓) 끌기를 끝낸다 — 놓은 뒤에 오는 것은 이미 끝나 있어 넘어간다
    onLostPointerCapture: (e: ReactPointerEvent<HTMLElement>) => end(e, true),
  }
}

/** 장소와 하나인 카드 — 장소 패널에 카드 그림과 카드 정보를 싣는다. 그림을 누르면 Scryfall 카드 페이지 */
function PlaceCard({ card, place }: { card: LandCard; place: Location }) {
  // 카드 이름이 장소 이름과 다르면(별칭) 카드 이름을 따로 적는다
  const ownName = card.name !== place.name || (card.nameKo && card.nameKo !== place.nameKo)
  return (
    <figure className="place-card">
      <a className="card-figure" href={card.url} target="_blank" rel="noreferrer">
        <CardImage src={card.image} name={card.name} />
      </a>
      <figcaption className="card-caption">
        {ownName && (
          <span className="card-caption-name">
            {card.name}
            {card.nameKo && ` (${card.nameKo})`}
          </span>
        )}
        <span>
          {card.set.toUpperCase()} #{card.number} 대지 카드, {RARITY[card.rarity]} · 그림 {card.artist}
        </span>
        {card.basis && <span className="card-caption-basis">{card.basis}</span>}
      </figcaption>
    </figure>
  )
}

function Sources({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null
  return (
    <section className="panel-section">
      <h3>출처</h3>
      <ul className="sources">
        {sources.map((s) => (
          <li key={s.label + (s.url ?? '')}>
            {s.url ? (
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            ) : (
              s.label
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function PlaceList({
  title,
  note,
  places,
  onSelect,
  cards = [],
  cardKind,
  onSelectCard,
}: {
  title: string
  note?: string
  places: Location[]
  onSelect: (id: string) => void
  cards?: LandCard[]
  cardKind?: (card: LandCard) => string
  onSelectCard?: (id: string) => void
}) {
  if (places.length === 0 && cards.length === 0) return null
  return (
    <section className="panel-section">
      <h3>{title}</h3>
      {note && <p className="list-note">{note}</p>}
      <ul className="place-list">
        {places.map((l) => (
          <li key={l.id}>
            <button type="button" className="link" onClick={() => onSelect(l.id)}>
              {l.name}
            </button>
            <span className="place-kind">{KIND_LABEL[l.kind]}</span>
          </li>
        ))}
        {cards.map((c) => (
          <li key={`card/${c.id}`}>
            <button type="button" className="link" onClick={() => onSelectCard?.(c.id)}>
              {c.name}
            </button>
            <span className="place-kind">{cardKind?.(c)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** 여러 추정 메모가 함께 시작하는 문장들 — 문장 끝('. ')에서 자른다 */
function commonLead(texts: string[]): string {
  if (texts.length < 2) return ''
  let n = 0
  while (texts.every((t) => t[n] !== undefined && t[n] === texts[0][n])) n++
  const lead = texts[0].slice(0, n)
  // 한 메모가 통째로 다른 메모들의 앞부분이면 그 메모 전체가 함께 시작하는 부분이다
  if (texts.some((t) => t.length === n)) return lead
  const cut = lead.lastIndexOf('. ')
  return cut < 0 ? '' : lead.slice(0, cut + 1)
}

/** 한 점 기호를 한 무리로 치는 거리 (지도 단위) — 바짝 붙은 첨탑 두세 개는 한 곳이다 */
const GLYPH_CLUSTER = 19
const GLYPH_KINDS = new Set<LandscapeFeature['kind']>(['volcano', 'caldera', 'waterfall', 'geyser', 'pit', 'spire', 'floating-rock', 'urn'])

/**
 * 같은 이름으로 묶은 지형의 수 — 강·절벽·협곡은 '줄기', 그 밖은 '곳'. 한 점 기호는 바짝 붙은 것끼리 한 곳으로 센다.
 * 하나뿐이면 수를 달지 않는다
 */
function featureCount(items: LandscapeFeature[]): string {
  const lines = items.filter((f) => f.kind === 'river' || f.kind === 'cliff' || f.kind === 'gorge').length
  const glyphs = items.flatMap((f) => (GLYPH_KINDS.has(f.kind) && 'at' in f.feature && f.feature.at ? [f.feature.at] : []))
  // 한 점 기호 무리 — 가까운 것끼리 이어 붙인다
  const group = glyphs.map((_, i) => i)
  const root = (i: number): number => (group[i] === i ? i : (group[i] = root(group[i])))
  glyphs.forEach(([ax, ay], i) =>
    glyphs.forEach(([bx, by], j) => {
      if (j > i && Math.hypot(ax - bx, ay - by) < GLYPH_CLUSTER) group[root(j)] = root(i)
    }),
  )
  const clusters = new Set(glyphs.map((_, i) => root(i))).size
  const places = clusters + (items.length - lines - glyphs.length)
  const parts = [lines > 1 || (lines === 1 && places > 0) ? `${lines}줄기` : '', places > 1 || (places === 1 && lines > 0) ? `${places}곳` : '']
  const text = parts.filter(Boolean).join(' ')
  return text ? ` ${text}` : ''
}

/**
 * 바탕 지형 목록 — 같은 이름은 한 줄로 묶는다 (예: 첨탑 6곳, 강 2줄기).
 * 이 지도가 고른 것은 '추정'과 그 까닭을 장소의 추정 메모와 같은 모양으로 단다 — 함께 시작하는 문장은 한 번만, 저마다 다른 뒷부분은 그 밑에
 */
function FeatureList({ title, note, features }: { title: string; note?: string; features: LandscapeFeature[] }) {
  if (features.length === 0) return null
  const groups = new Map<string, { estimates: string[]; items: LandscapeFeature[] }>()
  for (const f of features) {
    const label = f.feature.label ?? LANDSCAPE_KIND_LABEL[f.kind]
    const g = groups.get(label) ?? { estimates: [], items: [] }
    g.estimates.push(f.feature.estimate ?? '')
    g.items.push(f)
    groups.set(label, g)
  }
  return (
    <section className="panel-section">
      <h3>{title}</h3>
      {note && <p className="list-note">{note}</p>}
      <ul className="feature-list">
        {[...groups.entries()].map(([label, { estimates, items }]) => {
          const texts = [...new Set(estimates.filter(Boolean))]
          const lead = commonLead(texts)
          const tails = [...new Set(texts.map((t) => t.slice(lead.length).trim()).filter(Boolean))]
          return (
            <li key={label}>
              <span className="feature-name">
                {label}
                {featureCount(items)}
              </span>
              {texts.length > 0 && (
                <div className="placement-note is-estimate">
                  <strong>추정</strong> {lead || (tails.length === 1 ? tails[0] : '')}
                  {lead && tails.length === 1 && ` ${tails[0]}`}
                  {tails.length > 1 && (
                    <ul className="feature-tails">
                      {tails.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function PlacePanel({
  panelRef,
  location,
  continent,
  continentPlaces,
  continentCards,
  continentOf,
  card,
  placeCard,
  cardsHere,
  phaseCardsHere,
  childDetailHere,
  onZoomToDetail,
  onMap,
  featuresHere,
  continentFeatures,
  locationOf,
  onSelectCard,
  onSelectLocation,
  onSelectContinent,
  onClose,
  closing,
  onClosed,
}: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const shown = Boolean(location || continent || card)
  const open = shown && !closing
  const key = location?.id ?? continent?.id ?? (card ? `card/${card.id}` : undefined)
  const handle = useSheetDrag(panelRef, shown, closing, onClose)

  useEffect(() => {
    if (!key || closing) return
    // 다른 곳으로 옮겨 가면 새 내용을 처음부터 읽는다
    panelRef.current?.scrollTo({ top: 0 })
    headingRef.current?.focus({ preventScroll: true })
  }, [key, closing, panelRef])

  // Escape 로 닫으면 나가는 움직임 없이 바로 내린다 — 키보드 동작에는 움직임을 붙이지 않는다
  const [instant, setInstant] = useState(false)
  if (instant && !closing && open) setInstant(false)

  // 실제 나가는 움직임이 끝나면 내린다. 전환이 없는 환경에서는 바로 내린다.
  useEffect(() => {
    if (!closing) return
    if (instant) {
      onClosed()
      return
    }
    const animations = panelRef.current?.getAnimations() ?? []
    if (!animations.length) {
      onClosed()
      return
    }
    let cancelled = false
    void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      if (!cancelled) onClosed()
    })
    return () => { cancelled = true }
  }, [closing, instant, onClosed, panelRef])

  useEffect(() => {
    if (!open) return
    // 검색창처럼 Escape 로 제 것을 먼저 닫은 경우(defaultPrevented)는 넘어간다
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      setInstant(true)
      onClose(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!shown) return null
  const owner = location ? continentOf(location.continentId) : null
  // 이 지도가 고른 자리면 그 판단을 적는다 — 자리가 없는 장소는 그와 하나인 카드 표시의 판단
  const markEstimate = !location
    ? undefined
    : isPlaced(location)
      ? location.placement === 'estimate'
        ? location.estimate
        : undefined
      : placeCard?.estimate
  // 카드가 이어진 장소와 그 대륙
  const cardPlace = card?.depicts.type === 'location' ? locationOf(card.depicts.id) : null
  const cardContinent = card
    ? continentOf(card.depicts.type === 'continent' ? card.depicts.id : cardPlace?.continentId ?? null)
    : null

  // 장소에 이은 카드는 그 장소의 종류, 대륙에 이은 카드는 카드 표시의 종류
  const cardKind = (c: LandCard) => {
    const place = c.depicts.type === 'location' ? locationOf(c.depicts.id) : null
    if (!place) return KIND_LABEL[c.kind]
    return KIND_LABEL[place.kind] + (place.terrain && place.kind === 'region' ? `, ${TERRAIN_LABEL[place.terrain]}` : '')
  }

  return (
    <aside
      className="panel"
      aria-labelledby="panel-title"
      ref={panelRef}
      data-closing={closing || undefined}
      data-instant={(closing && instant) || undefined}
      inert={closing}
    >
      {/* 시트 손잡이 — 닫기 단추가 같은 일을 하므로 읽어 주지 않는다 */}
      <div className="sheet-handle" aria-hidden="true" {...handle} />
      <button type="button" className="panel-close" onClick={() => onClose()} aria-label="닫기">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5" />
        </svg>
      </button>

      {card && (
        <article key={card.id}>
          <header className="panel-head">
            <h2 id="panel-title" ref={headingRef} tabIndex={-1}>
              {card.name}
            </h2>
            {card.nameKo && <p className="name-ko">{card.nameKo}</p>}
          </header>
          <dl className="facts">
            <div>
              <dt>종류</dt>
              <dd>{'typeLine' in card ? card.typeLine : '대지 카드'}, {RARITY[card.rarity]}</dd>
            </div>
            <div>
              <dt>대륙</dt>
              <dd>
                {cardContinent ? (
                  <button type="button" className="link" onClick={() => onSelectContinent(cardContinent.id)}>
                    {cardContinent.name}
                  </button>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            {cardPlace && (
              <div>
                <dt>이은 곳</dt>
                <dd>
                  <button type="button" className="link" onClick={() => onSelectLocation(cardPlace.id)}>
                    {cardPlace.name}
                  </button>
                </dd>
              </div>
            )}
            <div>
              <dt>카드</dt>
              <dd>
                {card.set.toUpperCase()} #{card.number} · 그림 {card.artist}
              </dd>
            </div>
          </dl>
          <a className="card-figure" href={card.url} target="_blank" rel="noreferrer">
            <CardImage src={card.image} name={card.name} />
          </a>
          {'subject' in card && <p className="prose">{card.subject}</p>}
          <p className="prose">{card.basis ?? '카드 이름이 곧 지명이다.'}</p>
          <p className={`placement-note ${card.estimate ? 'is-estimate' : ''}`}>
            {card.estimate ? (
              <>
                <strong>추정</strong> {card.estimate}
              </>
            ) : (
              `지도의 ${'typeLine' in card ? '그림은' : '카드 표시는'} 이 카드가 이어진 곳에 두었습니다.`
            )}
          </p>
          <Sources sources={card.sources} />
        </article>
      )}

      {location && (
        <article key={location.id}>
          <header className="panel-head">
            <h2 id="panel-title" ref={headingRef} tabIndex={-1}>
              {location.name}
            </h2>
            {location.nameKo && <p className="name-ko">{location.nameKo}</p>}
          </header>
          {childDetailHere && (
            <div className="open-child-row">
              <button type="button" className="open-child" onClick={() => onZoomToDetail(childDetailHere.id)}>
                {/* 접힌 지도 */}
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d={CHILD_MAP_ICON} />
                </svg>
                가까이 보기
              </button>
              {/* 해석 안내 — 이 지역 상세에서 공식 서술을 따른 것과 이 지도가 해석한 것 */}
              {childDetailHere.note && <p className="child-note">{childDetailHere.note}</p>}
            </div>
          )}
          <dl className="facts">
            <div>
              <dt>종류</dt>
              <dd>
                {KIND_LABEL[location.kind]}
                {location.terrain && location.kind === 'region' ? `, ${TERRAIN_LABEL[location.terrain]}` : ''}
              </dd>
            </div>
            <div>
              <dt>대륙</dt>
              <dd>
                {owner ? (
                  <button type="button" className="link" onClick={() => onSelectContinent(owner.id)}>
                    {owner.name}
                  </button>
                ) : (
                  '대륙 밖 바다'
                )}
              </dd>
            </div>
            {cardsHere.length > 0 && (
              <div>
                <dt>카드</dt>
                <dd>
                  {cardsHere.map((c, i) => (
                    <Fragment key={c.id}>
                      {i > 0 && ', '}
                      <button type="button" className="link" onClick={() => onSelectCard(c.id)}>
                        {c.name}
                      </button>
                    </Fragment>
                  ))}
                </dd>
              </div>
            )}
            {phaseCardsHere.length > 0 && (
              <div>
                <dt>페이즈1</dt>
                <dd>
                  {phaseCardsHere.map((c, i) => (
                    <Fragment key={c.id}>
                      {i > 0 && ', '}
                      <button type="button" className="link" onClick={() => onSelectCard(c.id)}>
                        {c.name}
                      </button>
                    </Fragment>
                  ))}
                </dd>
              </div>
            )}
          </dl>
          <p className="prose">{location.description}</p>
          {placeCard && <PlaceCard card={placeCard} place={location} />}
          {location.history && (
            <section className="panel-section">
              <h3>시대별 변화</h3>
              <p className="prose">{location.history}</p>
            </section>
          )}
          <p className={`placement-note ${markEstimate ? 'is-estimate' : ''}`}>
            {markEstimate ? (
              <>
                <strong>추정</strong> {markEstimate}
              </>
            ) : (
              <>
                {PLACEMENT_NOTE[location.placement]}
                {location.placement === 'canon-hint' && location.placementBasis && (
                  <>
                    <br />
                    근거: {location.placementBasis}
                  </>
                )}
              </>
            )}
          </p>
          <FeatureList title="지도에 그린 지형" features={featuresHere} />
          <Sources sources={withCardSources(location.sources, placeCard)} />
        </article>
      )}

      {continent && (
        <article key={continent.id}>
          <header className="panel-head">
            <h2 id="panel-title" ref={headingRef} tabIndex={-1}>
              {continent.name}
            </h2>
            <p className="name-ko">{continent.nameKo}</p>
          </header>
          <p className="prose">{continent.summary}</p>
          <dl className="facts stacked">
            <div>
              <dt>지형</dt>
              <dd>{continent.terrain}</dd>
            </div>
            <div>
              <dt>사는 이들</dt>
              <dd>{continent.peoples.join(', ')}</dd>
            </div>
          </dl>
          <section className="panel-section">
            <h3>시대별 변화</h3>
            <p className="prose">{continent.history}</p>
          </section>
          <PlaceList
            title="이 대륙의 장소"
            places={continentPlaces.filter(onMap)}
            onSelect={onSelectLocation}
            cards={continentCards}
            cardKind={cardKind}
            onSelectCard={onSelectCard}
          />
          <PlaceList
            title="위치가 알려지지 않은 곳"
            note="공식 설정이 대륙까지만 밝힌 곳이라 지도에 찍지 않았습니다."
            places={continentPlaces.filter((l) => !onMap(l))}
            onSelect={onSelectLocation}
          />
          <FeatureList
            title="지도가 자리를 고른 지형"
            note="공식 설정에 있는 지형이지만 자리나 범위는 밝히지 않아, 이 지도가 골라 그렸습니다."
            features={continentFeatures.filter((f) => f.feature.estimate && !f.feature.location)}
          />
          <Sources sources={continent.sources} />
        </article>
      )}
    </aside>
  )
}
