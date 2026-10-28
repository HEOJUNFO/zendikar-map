import { Fragment, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import type { LandscapeFeature } from '../data'
import type { LandCard } from '../data/cards'
import type { LandFaceEntry } from '../data/landFace'
import type { PhaseCard } from '../data/phase1'
import { slotOf } from '../data/sagas'
import { isPlaced, type Continent, type Location, type Source } from '../data/types'
import { useLang, useMessages, useText } from '../i18n/lang'
import type { FaceShownIn } from '../i18n/messages'
import { splitUnits } from '../i18n/units'
import { CHILD_MAP_ICON } from '../map/glyphs'
import { displayName } from '../map/names'
import type { PeriodFeature, PeriodNote } from '../map/periodTypes'
import './PlacePanel.css'

/** 패널에 싣는 지형 — 바탕 지형, 또는 켠 페이즈에만 그린 그 무렵의 지형 (period) */
type Feature = LandscapeFeature | PeriodFeature

/** 시점별 보기의 패널에 싣는 까닭 — when 은 그 시점(제목은 패널이 언어에 맞춰 짓는다), basis 는 공식 근거, estimate 는 이 지도의 판단('추정') */
export interface TimeReason {
  when: { name: string; nameEn: string; years: string }
  basis?: string
  estimate?: string
}
const isPeriod = (f: Feature): f is PeriodFeature => 'period' in f

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
  /** 카드 패널을 열었을 때 — 대지 카드, 또는 지도에 대상이 그려진 페이즈 카드 */
  card: LandCard | PhaseCard | null
  /** 원본(설명·근거 글)을 받지 못한 페이즈 카드 — 이름과 이어진 곳만 싣는다 */
  cardUnavailable: Pick<PhaseCard, 'id' | 'name' | 'nameKo' | 'depicts'> | null
  /** 지금 장소와 하나인 카드 (카드 이름이 곧 이 장소의 이름이나 별칭) — 장소 패널에 그림과 함께 싣는다 */
  placeCard: LandCard | null
  /** 지금 장소에 이어진 다른 카드 (장소 패널에서 카드 패널로 가는 링크) — 대지 카드, 그리고 이 장소를 이름으로 가리키지 않는 양면 카드의 대지 면 (이름은 그 면의 것) */
  cardsHere: Pick<LandCard, 'id' | 'name' | 'nameKo'>[]
  /**
   * 지금 장소와 하나인 양면 카드의 대지 면 (src/data/landFace.ts — 면 이름이 곧 이 장소) — 면 그림과 함께 싣고, 앞면(그림이 있는 카드)의 패널로 가는 링크를 단다.
   * phase 는 그 카드가 오른 사가 안의 페이즈 번호 ('페이즈1' 꼬리표 — 사가에 매인 면만, 시점별 보기는 달지 않는다)
   */
  facesHere: { phase?: number; face: LandFaceEntry; frontDrawn: boolean }[]
  /** 카드 패널을 연 카드가 양면 카드면 그 대지 면의 목록 항목 (어느 장소 패널에 언제 실리는지 — shownIn, 늘이면 null) */
  cardFace: { face: LandFaceEntry; shownIn: FaceShownIn | null } | null
  /**
   * 지금 장소에 그려진 페이즈 카드 — 사가 보기는 카드가 오른 페이즈('페이즈1')마다, 시점별 보기는 세트('ZEN')마다 한 줄 (페이즈·시점을 켰을 때만).
   * key 는 줄의 열쇠, 줄 이름은 set(시점별 보기의 세트) 또는 phase(사가 안의 페이즈 번호). 대지 면이 곧 이 장소인 양면 카드는 facesHere 의 항목 하나로만 싣고 여기서는 뺀다
   */
  phaseCardsHere: { key: string; set?: string; phase?: number; cards: Pick<PhaseCard, 'id' | 'name' | 'nameKo'>[] }[]
  /**
   * 지금 장소와 하나인 페이즈 카드 (Seer's Sundial), 또는 사가에 매인 장소 대지 카드 (Ruins of Oran-Rief) — 그림 없이 장소 패널에 카드로 싣는다
   * (그 페이즈·시점을 켰을 때만). phase 는 카드 줄 앞에 붙이는 그 카드가 오른 페이즈 ('페이즈1' — 시점별 보기는 바로 뒤에 세트가 나와 달지 않는다)
   */
  phasePlaceCard: { phase?: number; card: PhaseCard | LandCard } | null
  /**
   * 시점별 보기에서 이 카드를 세트 시점이 아닌 지금 시점에(또는 다른 자리에) 그린 까닭 — 공식 근거(basis)와 이 지도의 판단(estimate, '추정').
   * title 은 그 시점의 이름. 사가 보기·끔·세트 시점이면 null
   */
  cardTime: TimeReason | null
  /** 장소와 하나인 페이즈 카드(phasePlaceCard)를 세트 시점이 아닌 지금 시점에 장소 패널에 실은 까닭 — cardTime 과 같은 셈 */
  placeCardTime: TimeReason | null
  /** 이 장소의 지역 상세 — 깊이 확대하면 나오는 그림. '가까이 보기'로 그 배율에 간다 (장소를 누른 다음 한 단계) */
  childDetailHere: { id: string; note?: string } | null
  onZoomToDetail: (id: string) => void
  /** 지도에 표시가 있는 장소인가 — 대륙 패널에서 '이 대륙의 장소'와 '위치가 알려지지 않은 곳'을 가른다 */
  onMap: (l: Location) => boolean
  /** 지금 장소와 하나인 바탕 지형 (지도에 그린 산줄기·절벽·폭포 등) — 페이즈를 켜면 그 무렵에만 그린 지형도 */
  featuresHere: Feature[]
  /** 지금 대륙의 바탕 지형 — 이 지도가 자리를 고른(추정) 것 가운데 장소에 매이지 않은 것만 패널에 싣는다 (그 무렵의 지형은 장소에 매여도) */
  continentFeatures: Feature[]
  /** 켠 페이즈에 이 장소를 그 무렵 모습으로 그린 까닭 — 그 무렵의 지형, 표시를 바꾸거나 숨긴 것 (페이즈 바탕) */
  periodNotes: PeriodNote[]
  /** 켠 페이즈가 바꾼 장소 표시 — ruin: 폐허 기호, null: 그 무렵 없던 곳이라 표시하지 않음 (페이즈 바탕. 끔이면 비었다) — 대륙 패널의 장소 목록이 지도와 맞게 */
  periodMarks: ReadonlyMap<string, 'ruin' | null>
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

// 같은 카드의 Scryfall 주소는 하나로 친다 (…/card/zen/212 와 …/card/zen/212/crypt-of-agadeem)
const sourceKey = (s: Source) => s.url?.match(/scryfall\.com\/card\/[^/]+\/[^/?#]+/)?.[0] ?? s.url ?? s.label

/** 장소의 출처 뒤에 그 장소와 하나인 카드(대지 카드, 페이즈 카드)의 출처를 겹치지 않게 잇는다 */
function withCardSources(own: Source[], ...cards: (Pick<LandCard, 'sources'> | null)[]): Source[] {
  const out = [...own]
  const seen = new Set(own.map(sourceKey))
  for (const card of cards)
    for (const s of card?.sources ?? []) {
      if (seen.has(sourceKey(s))) continue
      seen.add(sourceKey(s))
      out.push(s)
    }
  return out
}

/** 그림이 오면(또는 못 오면) 보인다 — 이미 받아 둔 그림은 처음부터 보여 옅어지지 않는다 */
const markLoaded = (img: HTMLImageElement | null) => {
  if (img && img.complete) img.dataset.loaded = ''
}

/** 카드 그림 — Scryfall 에서 늦게 오면 카드 꼴 빈 자리 위에 옅게 떠오른다 */
function CardImage({ src, name }: { src: string; name: string }) {
  const t = useMessages()
  return (
    <img
      className="card-image"
      ref={markLoaded}
      src={src}
      alt={t.cardAlt(name)}
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
/** 장소와 하나인 카드 — 대지 카드, 또는 그림 없이 장소로 나오는 페이즈 카드(그 페이즈 이름을 붙인다) */
function PlaceCard({ card, place, phase }: { card: LandCard | PhaseCard; place: Location; phase?: number }) {
  const t = useMessages()
  const tx = useText()
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
          {phase ? `${t.phaseTag(phase)} · ` : ''}
          {t.cardLine(card.set.toUpperCase(), card.number, 'typeLine' in card ? card.typeLine : t.landCard, t.rarity[card.rarity], card.artist)}
        </span>
        {'subject' in card && (
          <span className="card-caption-basis" {...tx(card.subject)} />
        )}
        {card.basis && (
          <span className="card-caption-basis" {...tx(card.basis)} />
        )}
      </figcaption>
    </figure>
  )
}

/** 면 이름 — 공식 한국어판 이름이 있으면 함께 */
const faceName = (name: string, nameKo?: string) => (nameKo ? `${name} (${nameKo})` : name)

/**
 * 장소와 하나인 양면 카드의 대지 면 — 장소 패널에 면 그림과 정보를 싣는다 (PlaceCard 와 같은 꼴). 그림을 누르면 Scryfall, 앞면 링크는 그 카드 패널(그림이 있는 카드)
 */
function FaceCard({
  face,
  place,
  phase,
  frontDrawn,
  onSelectCard,
}: {
  face: LandFaceEntry
  place: Location
  phase?: number
  /** 앞면 그림이 지금 보기에 그려지는가 */
  frontDrawn: boolean
  onSelectCard: (id: string) => void
}) {
  const t = useMessages()
  const slot = slotOf(face.level)
  const front = faceName(face.front, face.frontKo)
  const ownName = face.name !== place.name || (face.nameKo && face.nameKo !== place.nameKo)
  return (
    <figure className="place-card">
      <a className="card-figure" href={face.url} target="_blank" rel="noreferrer">
        <CardImage src={face.image} name={face.name} />
      </a>
      <figcaption className="card-caption">
        {ownName && <span className="card-caption-name">{faceName(face.name, face.nameKo)}</span>}
        <span>
          {phase ? `${t.phaseTag(phase)} · ` : ''}
          {t.cardLine(face.set.toUpperCase(), face.number, t.landFaceOfDfc, t.rarity[face.rarity], face.artist)}
        </span>
        {face.flavor && (
          <span className="card-flavor" lang="en">
            {face.flavor}
          </span>
        )}
        <span className="card-caption-basis">
          {t.frontFaceLead}{' '}
          <button type="button" className="link" onClick={() => onSelectCard(face.id)}>
            {front}
          </button>
          {t.frontFaceTail(front, frontDrawn || !slot ? null : slot)}
        </span>
      </figcaption>
    </figure>
  )
}

/** 시점별 보기에서 페이즈 카드를 세트 시점이 아닌 지금 시점에(또는 다른 자리에) 그린 까닭 — 공식 근거는 글로, 이 지도의 판단은 '추정'으로 */
function TimeNote({ reason }: { reason: TimeReason }) {
  const t = useMessages()
  const tx = useText()
  return (
    <section className="panel-section">
      <h3>{t.timeTitle(reason.when)}</h3>
      {reason.basis && (
        <p className="prose" {...tx(reason.basis)} />
      )}
      {reason.estimate && <Estimate text={reason.estimate} />}
    </section>
  )
}

/** 이 지도의 판단 — '추정' 꼬리표와 그 까닭 (글은 한국어 원본) */
function Estimate({ text, as: Tag = 'div' }: { text: string; as?: 'div' | 'p' }) {
  const t = useMessages()
  const tx = useText()
  return (
    <Tag className="placement-note is-estimate">
      <strong>{t.estimate}</strong> <span {...tx(text)} />
    </Tag>
  )
}

function Sources({ sources }: { sources: Source[] }) {
  const t = useMessages()
  const tx = useText()
  if (sources.length === 0) return null
  return (
    <section className="panel-section">
      <h3>{t.sources}</h3>
      <ul className="sources">
        {sources.map((s) => (
          <li key={s.label + (s.url ?? '')}>
            {s.url ? <a href={s.url} target="_blank" rel="noreferrer" {...tx(s.label)} /> : <span {...tx(s.label)} />}
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
  kindOf,
}: {
  title: string
  note?: string
  places: Location[]
  onSelect: (id: string) => void
  cards?: LandCard[]
  cardKind?: (card: LandCard) => string
  onSelectCard?: (id: string) => void
  /** 장소 종류 이름 — 켠 페이즈가 폐허로 바꾼 표시는 '유적' */
  kindOf?: (l: Location) => string
}) {
  const lang = useLang()
  const t = useMessages()
  if (places.length === 0 && cards.length === 0) return null
  return (
    <section className="panel-section">
      <h3>{title}</h3>
      {note && <p className="list-note">{note}</p>}
      <ul className="place-list">
        {places.map((l) => (
          <li key={l.id}>
            <button type="button" className="link" onClick={() => onSelect(l.id)}>
              {displayName(l, lang)}
            </button>
            <span className="place-kind">{kindOf ? kindOf(l) : t.kind[l.kind]}</span>
          </li>
        ))}
        {cards.map((c) => (
          <li key={`card/${c.id}`}>
            <button type="button" className="link" onClick={() => onSelectCard?.(c.id)}>
              {displayName(c, lang)}
            </button>
            <span className="place-kind">{cardKind?.(c)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * 여러 추정 메모가 함께 시작하는 문장들과 저마다 다른 뒷부분 — 한국어 문장 끝에서 자른다 (src/i18n/units.ts 의 단위라 조각마다 영어가 있다).
 * 한 메모가 통째로 다른 메모들의 앞부분이면 그 메모 전체가 함께 시작하는 부분이다
 */
function splitLead(texts: string[]): { lead: string; tails: string[] } {
  if (texts.length < 2) return { lead: '', tails: texts }
  const units = texts.map(splitUnits)
  let n = 0
  while (units.every((u) => u[n] !== undefined && u[n] === units[0][n])) n++
  return { lead: units[0].slice(0, n).join(' '), tails: units.map((u) => u.slice(n).join(' ')) }
}

/** 한 점 기호를 한 무리로 치는 거리 (지도 단위) — 바짝 붙은 첨탑 두세 개는 한 곳이다 */
const GLYPH_CLUSTER = 19
const GLYPH_KINDS = new Set<Feature['kind']>(['volcano', 'caldera', 'waterfall', 'geyser', 'pit', 'spire', 'floating-rock', 'urn'])

/**
 * 같은 이름으로 묶은 지형의 수 — 강·절벽·협곡은 '줄기', 그 밖은 '곳'. 한 점 기호는 바짝 붙은 것끼리 한 곳으로 센다.
 * 하나뿐이면 수를 달지 않는다
 */
function featureCount(items: Feature[], count: (lines: number, places: number) => string): string {
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
  return count(lines > 1 || (lines === 1 && places > 0) ? lines : 0, places > 1 || (places === 1 && lines > 0) ? places : 0)
}

/**
 * 바탕 지형 목록 — 같은 이름은 한 줄로 묶는다 (예: 첨탑 6곳, 강 2줄기).
 * 이 지도가 고른 것은 '추정'과 그 까닭을 장소의 추정 메모와 같은 모양으로 단다 — 함께 시작하는 문장은 한 번만, 저마다 다른 뒷부분은 그 밑에.
 * 그 무렵에만 그린 지형(페이즈 바탕)은 '이 무렵'을 붙인다 — periodNotes 면 그 추정은 '이 무렵' 단락이 이미 실어 이름만 둔다
 */
function FeatureList({ title, note, features, periodNotes = false }: { title: string; note?: string; features: Feature[]; periodNotes?: boolean }) {
  const t = useMessages()
  const tx = useText()
  if (features.length === 0) return null
  const groups = new Map<string, { label: string; own: boolean; period: boolean; estimates: string[]; items: Feature[] }>()
  for (const f of features) {
    // 데이터의 이름(한국어 원본)이 없으면 종류 이름 — 화면 언어로
    const own = f.feature.label !== undefined
    const label = f.feature.label ?? t.landscapeKind[f.kind]
    const period = isPeriod(f)
    const key = `${period ? '~' : ''}${label}`
    const g = groups.get(key) ?? { label, own, period, estimates: [], items: [] }
    g.estimates.push(period && periodNotes ? '' : f.feature.estimate ?? '')
    g.items.push(f)
    groups.set(key, g)
  }
  return (
    <section className="panel-section">
      <h3>{title}</h3>
      {note && <p className="list-note">{note}</p>}
      <ul className="feature-list">
        {[...groups.entries()].map(([key, { label, own, period, estimates, items }]) => {
          const { lead, tails: all } = splitLead([...new Set(estimates.filter(Boolean))])
          const tails = [...new Set(all.filter(Boolean))]
          return (
            <li key={key}>
              <span className="feature-name">
                {own ? <span {...tx(label)} /> : label}
                {featureCount(items, t.featureCount)}
              </span>
              {period && <span className="feature-period">{t.thisPeriod}</span>}
              {(lead || tails.length > 0) && (
                <div className="placement-note is-estimate">
                  <strong>{t.estimate}</strong>{' '}
                  {(lead || tails.length === 1) && <span {...tx(tails.length === 1 ? `${lead} ${tails[0]}`.trim() : lead)} />}
                  {tails.length > 1 && (
                    <ul className="feature-tails">
                      {tails.map((tail) => (
                        <li key={tail} {...tx(tail)} />
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
  cardUnavailable,
  placeCard,
  cardsHere,
  facesHere,
  cardFace,
  phaseCardsHere,
  phasePlaceCard,
  cardTime,
  placeCardTime,
  childDetailHere,
  onZoomToDetail,
  onMap,
  featuresHere,
  continentFeatures,
  periodNotes,
  periodMarks,
  locationOf,
  onSelectCard,
  onSelectLocation,
  onSelectContinent,
  onClose,
  closing,
  onClosed,
}: Props) {
  const lang = useLang()
  const t = useMessages()
  const tx = useText()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const shown = Boolean(location || continent || card || cardUnavailable)
  const open = shown && !closing
  const cardHead = card ?? cardUnavailable
  const key = location?.id ?? continent?.id ?? (cardHead ? `card/${cardHead.id}` : undefined)
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

  // 나가는 움직임이 끝나지 않을 때(전환이 없는 환경 등) — 조금 뒤에 내린다
  useEffect(() => {
    if (!closing) return
    if (instant) {
      onClosed()
      return
    }
    const t = window.setTimeout(onClosed, 400)
    return () => window.clearTimeout(t)
  }, [closing, instant, onClosed])

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
  // 이 무렵 — 이름·근거·추정이 같은 항목(Umung 강의 단 둘 등)은 한 번만 (수는 '지도에 그린 지형'에 단다)
  const notes = periodNotes.filter(
    (n, i) => periodNotes.findIndex((m) => m.label === n.label && m.basis === n.basis && m.estimate === n.estimate && m.mark === n.mark) === i,
  )
  // 이 지도가 고른 자리면 그 판단을 적는다 — 자리가 없는 장소는 그와 하나인 카드 표시의 판단
  const markEstimate = !location
    ? undefined
    : isPlaced(location)
      ? location.placement === 'estimate'
        ? location.estimate
        : undefined
      : placeCard?.estimate
  // 카드가 이어진 장소와 그 대륙
  const cardPlace = cardHead?.depicts.type === 'location' ? locationOf(cardHead.depicts.id) : null
  const cardContinent = cardHead
    ? continentOf(cardHead.depicts.type === 'continent' ? cardHead.depicts.id : cardPlace?.continentId ?? null)
    : null
  const cardWhere = (
    <>
      <div>
        <dt>{t.continent}</dt>
        <dd>
          {cardContinent ? (
            <button type="button" className="link" onClick={() => onSelectContinent(cardContinent.id)}>
              {displayName(cardContinent, lang)}
            </button>
          ) : (
            '—'
          )}
        </dd>
      </div>
      {cardPlace && (
        <div>
          <dt>{t.linkedPlace}</dt>
          <dd>
            <button type="button" className="link" onClick={() => onSelectLocation(cardPlace.id)}>
              {displayName(cardPlace, lang)}
            </button>
          </dd>
        </div>
      )}
    </>
  )

  // 장소 종류 — 지역은 지형까지
  const kindText = (l: Location) => t.kind[l.kind] + (l.terrain && l.kind === 'region' ? `, ${t.terrainKind[l.terrain]}` : '')
  // 장소에 이은 카드는 그 장소의 종류, 대륙에 이은 카드는 카드 표시의 종류
  const cardKind = (c: LandCard) => {
    const place = c.depicts.type === 'location' ? locationOf(c.depicts.id) : null
    if (!place) return t.kind[c.kind]
    return kindText(place)
  }

  return (
    <aside
      className="panel"
      lang={lang}
      aria-labelledby="panel-title"
      ref={panelRef}
      data-closing={closing || undefined}
      data-instant={(closing && instant) || undefined}
      inert={closing}
      onTransitionEnd={(e) => {
        if (closing && e.target === e.currentTarget) onClosed()
      }}
    >
      {/* 시트 손잡이 — 닫기 단추가 같은 일을 하므로 읽어 주지 않는다 */}
      <div className="sheet-handle" aria-hidden="true" {...handle} />
      <button type="button" className="panel-close" onClick={() => onClose()} aria-label={t.close}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5" />
        </svg>
      </button>

      {card && (
        <article key={card.id}>
          <header className="panel-head">
            <h2 id="panel-title" ref={headingRef} tabIndex={-1} lang="en">
              {card.name}
            </h2>
            {card.nameKo && (
              <p className="name-ko" lang="ko">
                {card.nameKo}
              </p>
            )}
          </header>
          <dl className="facts">
            <div>
              <dt>{t.type}</dt>
              <dd>
                {'typeLine' in card ? card.typeLine : t.landCard}, {t.rarity[card.rarity]}
              </dd>
            </div>
            {cardWhere}
            <div>
              <dt>{t.card}</dt>
              <dd>{t.cardNumber(card.set.toUpperCase(), card.number, card.artist)}</dd>
            </div>
          </dl>
          <a className="card-figure" href={card.url} target="_blank" rel="noreferrer">
            <CardImage src={card.image} name={card.name} />
          </a>
          {'subject' in card && (
            <p className="prose" {...tx(card.subject)} />
          )}
          {/* 양면 카드는 앞면의 플레이버를 아래 '양면 카드'에 면마다 싣는다 */}
          {'flavor' in card && card.flavor && !('land' in card && card.land) && !('back' in card && card.back) && (
            <p className="prose card-flavor" lang="en">
              {card.flavor}
            </p>
          )}
          {card.basis ? (
            <p className="prose" {...tx(card.basis)} />
          ) : (
            <p className="prose">{t.cardNamedForPlace}</p>
          )}
          {card.estimate ? <Estimate as="p" text={card.estimate} /> : <p className="placement-note">{t.cardPlacedAtLink('typeLine' in card)}</p>}
          {/* 시점별 보기 — 이 카드의 세트 시점이 아닌 지금 시점에도(또는 다른 자리에) 그린 까닭. 공식 근거는 근거로, 이 지도의 판단은 '추정'으로 */}
          {cardTime && <TimeNote reason={cardTime} />}
          {/* 두 면이 모두 대지인 양면 카드(Pathway) — 지도의 표시는 하나, 면마다 이름·플레이버와 둘째 면 그림 */}
          {'back' in card && card.back && (
            <section className="panel-section">
              <h3>{t.dfc}</h3>
              <ul className="feature-list card-faces">
                <li>
                  <span className="feature-name">
                    {t.frontFace} · {faceName(card.name, card.nameKo)}
                  </span>
                  <p className="period-basis">Land — {t.bothLands}</p>
                  {card.flavor && (
                    <p className="period-basis card-flavor" lang="en">
                      {card.flavor}
                    </p>
                  )}
                </li>
                <li>
                  <span className="feature-name">
                    {t.backFace} · {faceName(card.back.name, card.back.nameKo)}
                  </span>
                  <p className="period-basis">Land</p>
                  {card.back.flavor && (
                    <p className="period-basis card-flavor" lang="en">
                      {card.back.flavor}
                    </p>
                  )}
                  <a className="card-figure card-face-back" href={card.url} target="_blank" rel="noreferrer">
                    <CardImage src={card.back.image} name={card.back.name} />
                  </a>
                </li>
              </ul>
            </section>
          )}
          {/* 양면 카드 — 앞면(지도의 그림)과 대지 면(이은 장소의 패널에 실린다)을 면마다 이름·플레이버와 함께 */}
          {'land' in card && card.land && (
            <section className="panel-section">
              <h3>{t.dfc}</h3>
              <ul className="feature-list card-faces">
                <li>
                  <span className="feature-name">
                    {t.frontFace} · {faceName(card.name, card.nameKo)}
                  </span>
                  <p className="period-basis">
                    {card.typeLine} — {t.drawnAsFigure}
                  </p>
                  {card.flavor && (
                    <p className="period-basis card-flavor" lang="en">
                      {card.flavor}
                    </p>
                  )}
                </li>
                <li>
                  <span className="feature-name">
                    {t.landFace} · {faceName(card.land.name, card.land.nameKo)}
                  </span>
                  <p className="period-basis">
                    {card.land.typeLine}
                    {cardPlace && (
                      <>
                        {' — '}
                        <button type="button" className="link" onClick={() => onSelectLocation(cardPlace.id)}>
                          {displayName(cardPlace, lang)}
                        </button>
                        {cardFace ? ` ${t.faceShownIn(cardFace.shownIn)}` : ''}
                      </>
                    )}
                  </p>
                  {card.land.flavor && (
                    <p className="period-basis card-flavor" lang="en">
                      {card.land.flavor}
                    </p>
                  )}
                  {card.land.basis && (
                    <p className="period-basis" {...tx(card.land.basis)} />
                  )}
                  {card.land.estimate && <Estimate text={card.land.estimate} />}
                  <a className="card-figure card-face-back" href={card.url} target="_blank" rel="noreferrer">
                    <CardImage src={card.land.image} name={card.land.name} />
                  </a>
                </li>
              </ul>
            </section>
          )}
          <Sources sources={card.sources} />
        </article>
      )}

      {!card && cardUnavailable && (
        <article key={cardUnavailable.id}>
          <header className="panel-head">
            <h2 id="panel-title" ref={headingRef} tabIndex={-1} lang="en">
              {cardUnavailable.name}
            </h2>
            {cardUnavailable.nameKo && (
              <p className="name-ko" lang="ko">
                {cardUnavailable.nameKo}
              </p>
            )}
          </header>
          <dl className="facts">{cardWhere}</dl>
          <p className="placement-note">{t.cardUnavailable}</p>
        </article>
      )}

      {location && (
        <article key={location.id}>
          <header className="panel-head">
            <h2 id="panel-title" ref={headingRef} tabIndex={-1} lang="en">
              {location.name}
            </h2>
            {location.nameKo && (
              <p className="name-ko" lang="ko">
                {location.nameKo}
              </p>
            )}
          </header>
          {childDetailHere && (
            <div className="open-child-row">
              <button type="button" className="open-child" onClick={() => onZoomToDetail(childDetailHere.id)}>
                {/* 접힌 지도 */}
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d={CHILD_MAP_ICON} />
                </svg>
                {t.closer}
              </button>
              {/* 해석 안내 — 이 지역 상세에서 공식 서술을 따른 것과 이 지도가 해석한 것 */}
              {childDetailHere.note && (
                <p className="child-note" {...tx(childDetailHere.note)} />
              )}
            </div>
          )}
          <dl className="facts">
            <div>
              <dt>{t.type}</dt>
              <dd>{kindText(location)}</dd>
            </div>
            <div>
              <dt>{t.continent}</dt>
              <dd>
                {owner ? (
                  <button type="button" className="link" onClick={() => onSelectContinent(owner.id)}>
                    {displayName(owner, lang)}
                  </button>
                ) : (
                  t.openSea
                )}
              </dd>
            </div>
            {cardsHere.length > 0 && (
              <div>
                <dt>{t.cards}</dt>
                <dd>
                  {cardsHere.map((c, i) => (
                    <Fragment key={c.id}>
                      {i > 0 && ', '}
                      <button type="button" className="link" onClick={() => onSelectCard(c.id)}>
                        {displayName(c, lang)}
                      </button>
                    </Fragment>
                  ))}
                </dd>
              </div>
            )}
            {phaseCardsHere.map((g) => (
              <div key={g.key}>
                <dt>{g.set ?? (g.phase ? t.phaseTag(g.phase) : '')}</dt>
                <dd>
                  {g.cards.map((c, i) => (
                    <Fragment key={c.id}>
                      {i > 0 && ', '}
                      <button type="button" className="link" onClick={() => onSelectCard(c.id)}>
                        {displayName(c, lang)}
                      </button>
                    </Fragment>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
          <p className="prose" {...tx(location.description)} />
          {placeCard && <PlaceCard card={placeCard} place={location} />}
          {phasePlaceCard && <PlaceCard card={phasePlaceCard.card} place={location} phase={phasePlaceCard.phase} />}
          {facesHere.map((f) => (
            <FaceCard key={f.face.id} face={f.face} place={location} phase={f.phase} frontDrawn={f.frontDrawn} onSelectCard={onSelectCard} />
          ))}
          {placeCardTime && <TimeNote reason={placeCardTime} />}
          {/* 켠 페이즈에 이곳을 지도 바탕(Zendikar Rising 무렵)과 다른 그 무렵 모습으로 그린 까닭 — 공식 근거와, 이 지도가 고른 것은 '추정' */}
          {notes.length > 0 && (
            <section className="panel-section">
              <h3>{t.thisPeriod}</h3>
              <ul className="feature-list period-notes">
                {notes.map((n) => (
                  <li key={n.id}>
                    {n.mark === null ? (
                      <span className="feature-name">{t.notYetHere}</span>
                    ) : n.mark === 'ruin' ? (
                      <span className="feature-name">{t.ruinedHere}</span>
                    ) : (
                      <span className="feature-name" {...tx(n.label)} />
                    )}
                    <p className="period-basis" {...tx(n.basis)} />
                    {n.estimate && <Estimate text={n.estimate} />}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {location.history && (
            <section className="panel-section">
              <h3>{t.history}</h3>
              <p className="prose" {...tx(location.history)} />
            </section>
          )}
          {markEstimate ? (
            <Estimate as="p" text={markEstimate} />
          ) : (
            <p className="placement-note">
              {t.placement[location.placement]}
              {location.placement === 'canon-hint' && location.placementBasis && (
                <>
                  <br />
                  {t.basisLead}
                  <span {...tx(location.placementBasis)} />
                </>
              )}
            </p>
          )}
          <FeatureList title={t.featuresHere} features={featuresHere} periodNotes />
          <Sources
            sources={withCardSources(
              location.sources,
              placeCard,
              phasePlaceCard?.card ?? null,
              ...facesHere.map((f) => ({ sources: [{ label: `Card: ${f.face.front} // ${f.face.name} (${f.face.set.toUpperCase()} #${f.face.number})`, url: f.face.url }] })),
            )}
          />
        </article>
      )}

      {continent && (
        <article key={continent.id}>
          <header className="panel-head">
            <h2 id="panel-title" ref={headingRef} tabIndex={-1} lang="en">
              {continent.name}
            </h2>
            <p className="name-ko" lang="ko">
              {continent.nameKo}
            </p>
          </header>
          <p className="prose" {...tx(continent.summary)} />
          <dl className="facts stacked">
            <div>
              <dt>{t.terrain}</dt>
              <dd {...tx(continent.terrain)} />
            </div>
            <div>
              <dt>{t.peoples}</dt>
              <dd {...tx(continent.peoples.map((x) => tx(x).children).join(', '))} />
            </div>
          </dl>
          <section className="panel-section">
            <h3>{t.history}</h3>
            <p className="prose" {...tx(continent.history)} />
          </section>
          <PlaceList
            title={t.placesOnContinent}
            places={continentPlaces.filter((l) => onMap(l) && periodMarks.get(l.id) !== null)}
            onSelect={onSelectLocation}
            cards={continentCards}
            cardKind={cardKind}
            onSelectCard={onSelectCard}
            kindOf={(l) => t.kind[periodMarks.get(l.id) === 'ruin' ? 'ruin' : l.kind]}
          />
          <PlaceList
            title={t.absentPlaces}
            note={t.absentPlacesNote}
            places={continentPlaces.filter((l) => onMap(l) && periodMarks.get(l.id) === null)}
            onSelect={onSelectLocation}
          />
          <PlaceList
            title={t.unknownPlaces}
            note={t.unknownPlacesNote}
            places={continentPlaces.filter((l) => !onMap(l))}
            onSelect={onSelectLocation}
          />
          <FeatureList
            title={t.estimatedFeatures}
            note={t.estimatedFeaturesNote}
            features={continentFeatures.filter((f) => f.feature.estimate && (!f.feature.location || isPeriod(f)))}
          />
          <Sources sources={continent.sources} />
        </article>
      )}
    </aside>
  )
}
