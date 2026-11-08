// 픽셀 지도의 패널 — 장소·대륙·대지 카드·페이즈 카드 (docs/pixel-plan.md S3·S7·S22). 지금 지도의 src/components/PlacePanel.tsx 와 같은 글을 같은 차례로 싣는다
// (양면 카드의 대지 면, 지도에 그린 지형, 이야기 세트 밖 카드의 무렵, 장소·대륙과 하나인 카드의 '이 시점' — S22). 시점별 보기만 있어 사가·페이즈의 글은 싣지 않는다.
// 데이터 글은 한국어 원본이고, 영어 보기는 문장마다의 영어 사전(src/i18n/en/base.json)으로 옮긴다 — 사전에 없는 문장이 있으면 그 글은 한국어로 둔다 (useText 와 같다).
// '추정'(이 지도가 자리·연결을 고른 것)은 패널에만 보인다 — 지도 기호는 모양이 같다
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { LandCard } from '../../data/cards'
import type { LandFaceEntry } from '../../data/landFace'
import type { PhaseCard } from '../../data/phase1'
import { slotOf } from '../../data/sagas'
import { levelOfSet, timeInfo, timeOfSet } from '../../data/timeline'
import { isPlaced, type Location, type Source } from '../../data/types'
import { MESSAGES } from '../../i18n/messages'
import { splitUnits, translate, type Dict } from '../../i18n/units'
import { displayName, type Lang } from '../labels/layout'
import type { Selection } from '../marks/MarksLayer'
import type { PeriodNoteSlim } from '../time'
import type { PanelData, PanelFeature, PeriodPanelSlim } from './data'
import { isSideways, loadPhaseCard, timeReasonOf, type PhaseCardText, type TimeReason } from './phaseCard'
import type { TimePoint } from '../../data/timeline'

/** 이 시점에 그리는 페이즈 카드 — 장소 패널의 줄 (지금 지도의 App.tsx 가 장소마다 그 시점의 카드를 싣는 것) */
export interface PhaseCardRow {
  id: string
  name: string
  nameKo?: string
  set: string
}

/** 픽셀 지도에만 있는 글 */
const LOCAL = {
  ko: { cardsHere: (n: number) => `이 시점의 카드 ${n}장`, faceShownIn: (years: string[]) => `패널에 ${years.join('·')}에 실립니다.` },
  en: { cardsHere: (n: number) => `Cards at this time (${n})`, faceShownIn: (years: string[]) => `Listed in the panel in ${years.join(', ')}.` },
} satisfies Record<Lang, unknown>

const NO_TEXTS: PhaseCardText[] = []

/** 면 이름 — 공식 한국어판 이름이 있으면 함께 */
const faceName = (name: string, nameKo?: string) => (nameKo ? `${name} (${nameKo})` : name)

/** 시점별 지도의 그 무렵 (S6) — 장소마다의 '이 무렵'(받기 전에는 null)과 장소 표시 바꿈 */
export interface PanelPeriod {
  notes: Record<string, PeriodNoteSlim[]> | null
  marks: ReadonlyMap<string, 'ruin' | null>
}

interface Props {
  lang: Lang
  data: PanelData | null
  dict: Dict | null
  selection: Selection
  onSelect: (s: Selection) => void
  onClose: () => void
  period?: PanelPeriod | null
  /** 시점별 지도의 시점 (S7 — 페이즈 카드의 '이 시점') */
  time?: number | null
  /** 고른 페이즈 카드의 원본 — undefined 면 페이즈 카드가 아니다, null 이면 받는 중, false 면 받지 못했다 (phaseStub 의 이름과 이은 곳만) */
  phaseCard?: PhaseCardText | null | false
  phaseStub?: { name: string; nameKo?: string; depicts: string }
  /** 장소와 하나인 페이즈 카드 (place) — 그 장소 패널에 장소의 카드로 (지금 지도의 phasePlaceCard) */
  phasePlaceCardsAt?: (placeId: string) => readonly { id: string; phase: number }[]
  /** 장소마다 이 시점에 그리는 페이즈 카드 (세계 지도 그림과 지역 상세의 대상 모두 — 지역 상세의 대상은 가장 깊은 단계에서만 그린다, S9) */
  phaseCardsAt?: (placeId: string) => readonly PhaseCardRow[]
  /** 지역 상세의 장소 패널에서 '가까이 보기' — 그 지역 상세가 나오는 단계로 (S9) */
  onCloser?: (childId: string) => void
  /** 그 시점의 바탕의 패널 몫 — 그 무렵에만 그린 지형과 숨긴 바탕 선 (S22, 받기 전에는 null) */
  periodFeatures?: PeriodPanelSlim | null
  /** 그해에 그리지 않는 페이즈 카드 대신 그 인물·카드를 맡는 그림 (S22 — 지금 지도의 drawnKinOf) */
  kinOf?: (card: PhaseCard) => { name: string; nameKo?: string; sameName: boolean } | undefined
  /** 그 페이즈 카드의 앞면 그림이 이 시점에 그려지는가 (대지 면의 앞면 링크 — S22) */
  frontDrawn?: (id: string) => boolean
}

/** 시점이 바꾼 것을 더한 이 장소·대륙의 바탕 지형 (지금 지도의 drawnLandscape·featuresOf) */
function featuresOf(base: readonly PanelFeature[], pf: PeriodPanelSlim | null | undefined, keep: (f: Omit<PanelFeature, 'period' | 'at'>) => boolean): PanelFeature[] {
  const hidden = pf?.hiddenLines.length ? new Set(pf.hiddenLines) : null
  return [...(hidden ? base.filter((f) => !hidden.has(f.id)) : base), ...(pf?.features.filter(keep).map((f) => ({ ...f, period: true })) ?? [])]
}

type Tx = (text: string) => { lang: Lang; children: string }

/** 사전마다 옮긴 글을 기억한다 (src/i18n/lang.ts 의 useText 와 같다) */
const translated = new WeakMap<Dict, Map<string, string | null>>()

const txOf =
  (lang: Lang, dict: Dict | null): Tx =>
  (text: string) => {
    if (lang !== 'en' || !dict) return { lang: 'ko', children: text }
    let m = translated.get(dict)
    if (!m) translated.set(dict, (m = new Map()))
    let en = m.get(text)
    if (en === undefined) m.set(text, (en = translate(text, dict)))
    return en === null ? { lang: 'ko', children: text } : { lang: 'en', children: en }
  }

const merged = new WeakMap<Dict, WeakMap<object, Dict>>()
function mergedDict(dict: Dict, en: Readonly<Record<string, string>>): Dict {
  let m = merged.get(dict)
  if (!m) merged.set(dict, (m = new WeakMap()))
  let d = m.get(en)
  if (!d) m.set(en, (d = { ...dict, ...en }))
  return d
}

// 같은 카드의 Scryfall 주소는 하나로 친다 (지금 지도의 PlacePanel — …/card/zen/212 와 …/card/zen/212/crypt-of-agadeem. S22: 이름표만 다른 같은 기사가 두 번 실렸다)
const sourceKey = (s: Source) => s.url?.match(/scryfall\.com\/card\/[^/]+\/[^/?#]+/)?.[0] ?? s.url ?? s.label
function withCardSources(own: Source[], ...cards: (Pick<LandCard, 'sources'> | null | undefined)[]): Source[] {
  const out = [...own]
  const seen = new Set<string>()
  for (const s of own) seen.add(sourceKey(s))
  for (const c of cards)
    for (const s of c?.sources ?? []) {
      if (seen.has(sourceKey(s))) continue
      seen.add(sourceKey(s))
      out.push(s)
    }
  return out
}

export function Panel({ lang, data, dict, selection, onSelect, onClose, period, time, phaseCard, phaseStub, phaseCardsAt, phasePlaceCardsAt, onCloser, periodFeatures, kinOf, frontDrawn }: Props) {
  const t = MESSAGES[lang]
  // 이 장소·대륙과 하나인 페이즈 카드 (Seer's Sundial·Hedron Fields·차원 카드) — 패널이 그 카드 조각을 받아 그림·카드 줄·이 시점과 출처를 싣는다 (S22)
  const placeList = selection.type === 'location' ? (phasePlaceCardsAt?.(selection.id) ?? []) : selection.type === 'continent' ? (phasePlaceCardsAt?.(`continent/${selection.id}`) ?? []) : []
  const placeKey = placeList.map((x) => `${x.id}@${x.phase}`).join(',')
  const [placeTexts, setPlaceTexts] = useState<{ key: string; texts: PhaseCardText[] }>({ key: '', texts: [] })
  useEffect(() => {
    if (!placeKey) return
    let live = true
    Promise.all(placeKey.split(',').map((k) => loadPhaseCard(k.split('@')[0], Number(k.split('@')[1])).catch(() => null))).then(
      (xs) => live && setPlaceTexts({ key: placeKey, texts: xs.filter((x): x is PhaseCardText => x !== null) }),
    )
    return () => {
      live = false
    }
  }, [placeKey])
  const texts = useMemo(() => (placeKey && placeTexts.key === placeKey ? placeTexts.texts : NO_TEXTS), [placeKey, placeTexts])
  // 페이즈 카드의 글은 그 카드 조각이 영어 문장을 함께 싣는다 (지금 지도의 App.tsx 가 사전에 더하는 것과 같다 — 장소·대륙과 하나인 카드의 것도. S22: 영어 보기에 한국어로 남았다)
  const en = useMemo(() => {
    const parts = [...(phaseCard ? [phaseCard.en] : []), ...texts.map((x) => x.en)].filter((x) => Object.keys(x).length)
    return parts.length === 0 ? null : parts.length === 1 ? parts[0] : Object.assign({}, ...parts)
  }, [phaseCard, texts])
  const tx = txOf(lang, dict && en ? mergedDict(dict, en) : dict)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  // 고른 것이 바뀌면 제목으로 초점을 옮긴다 (화면 읽기 프로그램이 새 패널을 읽는다)
  const key = `${selection.type}/${selection.id}`
  const ready = data !== null
  // 고른 것이 바뀌면 맨 위부터 (지금 지도의 PlacePanel — S21: 패널 안의 링크로 연 다음 패널이 앞 패널의 스크롤 자리에서 열렸다)
  useEffect(() => {
    if (!ready) return
    panelRef.current?.scrollTo({ top: 0 })
    headingRef.current?.focus({ preventScroll: true })
  }, [key, ready])

  const body = (() => {
    if (!data) return <p className="px-panel-wait">…</p>
    if (selection.type === 'location') {
      const l = data.location.get(selection.id)
      return l ? (
        <LocationBody
          l={l}
          data={data}
          lang={lang}
          tx={tx}
          onSelect={onSelect}
          titleRef={headingRef}
          notes={period?.notes?.[l.id] ?? []}
          phaseCards={phaseCardsAt?.(l.id) ?? []}
          placeTexts={texts}
          onCloser={onCloser}
          time={time ?? null}
          features={featuresOf(data.landscapeOfPlace(l.id), periodFeatures, (f) => f.location === l.id || Boolean(f.alsoAt?.includes(l.id)))}
          frontDrawn={frontDrawn}
        />
      ) : null
    }
    if (selection.type === 'continent') {
      const c = data.continent.get(selection.id)
      if (!c) return null
      // 그 무렵 없던 곳은 따로 (지금 지도의 '이 무렵에는 없던 곳'), 폐허가 된 곳은 종류를 폐허로
      const all = data.placesOf.get(c.id) ?? []
      // 지도에 표시가 없는 곳 (지금 지도의 '지도에 자리가 없는 곳')
      const unknown = [...data.location.values()].filter((l) => l.continentId === c.id && !isPlaced(l) && !all.includes(l)).sort((a, b) => b.prominence - a.prominence || a.name.localeCompare(b.name))
      const estimated = featuresOf(data.landscapeOfContinent(c.id), periodFeatures, (f) => f.continentId === c.id).filter((f) => f.estimate && (!f.location || f.period))
      const places = all.filter((l) => period?.marks.get(l.id) !== null)
      const absent = period ? all.filter((l) => period.marks.get(l.id) === null) : []
      const kindOf = (l: Location) => (period?.marks.get(l.id) === 'ruin' ? 'ruin' : l.kind)
      const cards = data.cardsOf.get(c.id) ?? []
      return (
        <article>
          <Head name={c.name} nameKo={c.nameKo} lang={lang} titleRef={headingRef} />
          <p className="px-prose" {...tx(c.summary)} />
          {/* 이 대륙과 하나인 차원 카드 (Planechase 의 Tazeem·Murasa·Akoum — 그 시점에만) */}
          {texts.map((x) => (
            <PhasePlaceCard key={x.card.id} card={x.card} place={c} lang={lang} tx={tx} time={time ?? null} setLabel={data.setLabel} />
          ))}
          <dl className="px-facts is-stacked">
            <div>
              <dt>{t.terrain}</dt>
              <dd {...tx(c.terrain)} />
            </div>
            <div>
              <dt>{t.peoples}</dt>
              <dd {...tx(c.peoples.map((x) => tx(x).children).join(', '))} />
            </div>
          </dl>
          <section className="px-section">
            <h3>{t.history}</h3>
            <p className="px-prose" {...tx(c.history)} />
          </section>
          {(places.length > 0 || cards.length > 0) && (
            <section className="px-section">
              <h3>{t.placesOnContinent}</h3>
              <ul className="px-list">
                {places.map((l) => (
                  <li key={l.id}>
                    <button type="button" className="px-link-button" onClick={() => onSelect({ type: 'location', id: l.id })}>
                      {displayName(l, lang)}
                    </button>{' '}
                    <span className="px-muted">{t.kind[kindOf(l)]}</span>
                  </li>
                ))}
                {/* 자리를 모르는 장소·대륙에 이은 대지 카드 — 그 표시가 장소의 표시라 장소 목록에, 종류는 이은 장소의 것 (지금 지도의 PlaceList·cardKind — S22 검토) */}
                {cards.map((x) => {
                  const at = x.depicts.type === 'location' ? data.location.get(x.depicts.id) : undefined
                  return (
                    <li key={`card/${x.id}`}>
                      <button type="button" className="px-link-button" onClick={() => onSelect({ type: 'card', id: x.id })}>
                        {displayName(x, lang)}
                      </button>{' '}
                      <span className="px-muted">{t.kind[at ? kindOf(at) : x.kind]}</span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
          {absent.length > 0 && (
            <section className="px-section">
              <h3>{t.absentPlaces}</h3>
              <p className="px-muted">{t.absentPlacesNote}</p>
              <ul className="px-list">
                {absent.map((l) => (
                  <li key={l.id}>
                    <button type="button" className="px-link-button" onClick={() => onSelect({ type: 'location', id: l.id })}>
                      {displayName(l, lang)}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {unknown.length > 0 && (
            <section className="px-section">
              <h3>{t.unknownPlaces}</h3>
              <p className="px-muted">{t.unknownPlacesNote}</p>
              <ul className="px-list">
                {unknown.map((l) => (
                  <li key={l.id}>
                    <button type="button" className="px-link-button" onClick={() => onSelect({ type: 'location', id: l.id })}>
                      {displayName(l, lang)}
                    </button>{' '}
                    <span className="px-muted">{t.kind[l.kind]}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <FeatureList title={t.estimatedFeatures} note={t.estimatedFeaturesNote} features={estimated} t={t} tx={tx} />
          <Sources sources={withCardSources(c.sources, ...texts.map((x) => x.card))} t={t} tx={tx} />
        </article>
      )
    }
    const c = data.card.get(selection.id)
    if (!c) {
      if (phaseCard === null) return <p className="px-panel-wait">…</p>
      if (phaseCard === false && phaseStub) {
        // 글을 받지 못했다 — 이름과 이은 곳만 (지금 지도와 같다)
        const place = data.location.get(phaseStub.depicts)
        const cont = phaseStub.depicts.startsWith('continent/') ? data.continent.get(phaseStub.depicts.slice(10)) : undefined
        const to = place ?? cont
        return (
          <article>
            <Head name={phaseStub.name} nameKo={phaseStub.nameKo} lang={lang} titleRef={headingRef} />
            {to && (
              <p className="px-prose">
                <button type="button" className="px-link-button" onClick={() => onSelect(place ? { type: 'location', id: place.id } : { type: 'continent', id: to.id })}>
                  {displayName(to, lang)}
                </button>
              </p>
            )}
          </article>
        )
      }
      return phaseCard ? <PhaseCardBody text={phaseCard} data={data} lang={lang} tx={tx} onSelect={onSelect} titleRef={headingRef} time={time ?? null} kinOf={kinOf} /> : null
    }
    const place = c.depicts.type === 'location' ? data.location.get(c.depicts.id) : undefined
    const continentId = c.depicts.type === 'continent' ? c.depicts.id : place?.continentId
    const continent = continentId ? data.continent.get(continentId) : undefined
    return (
      <article>
        <Head name={c.name} nameKo={c.nameKo} lang={lang} titleRef={headingRef} />
        <dl className="px-facts">
          <div>
            <dt>{t.type}</dt>
            <dd>
              {t.landCard}, {t.rarity[c.rarity]}
            </dd>
          </div>
          <div>
            <dt>{t.continent}</dt>
            <dd>
              {continent ? (
                <button type="button" className="px-link-button" onClick={() => onSelect({ type: 'continent', id: continent.id })}>
                  {displayName(continent, lang)}
                </button>
              ) : (
                '—'
              )}
            </dd>
          </div>
          {place && (
            <div>
              <dt>{t.linkedPlace}</dt>
              <dd>
                <button type="button" className="px-link-button" onClick={() => onSelect({ type: 'location', id: place.id })}>
                  {displayName(place, lang)}
                </button>
              </dd>
            </div>
          )}
          <div>
            <dt>{t.card}</dt>
            <dd>{t.cardNumber(c.set.toUpperCase(), c.number, c.artist)}</dd>
          </div>
        </dl>
        <CardImage card={c} lang={lang} />
        {c.basis ? <p className="px-prose" {...tx(c.basis)} /> : <p className="px-prose">{t.cardNamedForPlace}</p>}
        {c.estimate ? <Estimate text={c.estimate} t={t} tx={tx} /> : <p className="px-note">{t.cardPlacedAtLink(false)}</p>}
        {/* 두 면이 모두 대지인 양면 카드(Pathway) — 지도의 표시는 하나, 면마다 이름·플레이버와 둘째 면 그림 (지금 지도의 패널과 같다) */}
        {c.back && (
          <section className="px-section">
            <h3>{t.dfc}</h3>
            <p className="px-prose">
              {t.frontFace} · {c.name}
              {c.nameKo && ` (${c.nameKo})`}
              <br />
              Land — {t.bothLands}
            </p>
            {c.flavor && (
              <p className="px-prose px-flavor" lang="en">
                {c.flavor}
              </p>
            )}
            <p className="px-prose">
              {t.backFace} · {c.back.name}
              {c.back.nameKo && ` (${c.back.nameKo})`}
              <br />
              Land
            </p>
            {c.back.flavor && (
              <p className="px-prose px-flavor" lang="en">
                {c.back.flavor}
              </p>
            )}
            <a className="px-card-figure" href={c.url} target="_blank" rel="noreferrer">
              <img src={c.back.image} alt={t.cardAlt(c.back.name)} width={488} height={680} loading="lazy" decoding="async" />
            </a>
          </section>
        )}
        <Sources sources={c.sources} t={t} tx={tx} />
      </article>
    )
  })()

  return (
    <aside ref={panelRef} className="px-panel" aria-labelledby="px-panel-title">
      <button type="button" className="px-panel-close" onClick={onClose} aria-label={t.close}>
        ×
      </button>
      {body}
    </aside>
  )
}

function Head({ name, nameKo, titleRef }: { name: string; nameKo?: string; lang: Lang; titleRef: React.RefObject<HTMLHeadingElement | null> }) {
  // 공식 영문 이름이 제목, 한국어판 이름이 있으면 그 밑에 (지금 지도의 패널과 같다)
  return (
    <header className="px-panel-head">
      <h2 id="px-panel-title" ref={titleRef} tabIndex={-1} lang="en">
        {name}
      </h2>
      {nameKo && (
        <p className="px-name-ko" lang="ko">
          {nameKo}
        </p>
      )}
    </header>
  )
}

function LocationBody(props: {
  l: Location
  data: PanelData
  lang: Lang
  tx: Tx
  onSelect: (s: Selection) => void
  titleRef: React.RefObject<HTMLHeadingElement | null>
  notes: readonly PeriodNoteSlim[]
  phaseCards: readonly PhaseCardRow[]
  placeTexts: readonly PhaseCardText[]
  onCloser?: (childId: string) => void
  time: number | null
  features: PanelFeature[]
  frontDrawn?: (id: string) => boolean
}) {
  const { l, data, lang, tx, onSelect, titleRef, notes: rawNotes, placeTexts, onCloser, time, features, frontDrawn } = props
  // 이 무렵 — 이름·근거·추정이 같은 항목은 한 번만 (지금 지도와 같다)
  const notes = rawNotes.filter((n, i) => rawNotes.findIndex((m) => m.label === n.label && m.basis === n.basis && m.estimate === n.estimate && m.mark === n.mark) === i)
  // 양면 카드의 대지 면 (S22) — 면이 곧 이 장소면 면 그림과 함께, 아니면 '카드' 줄에. 그 면의 앞면은 '이 시점의 카드'에 따로 싣지 않는다 (한 카드는 한 번)
  const faces = data.facePlace.get(l.id) ?? []
  const faceLinks = data.faceLinks.get(l.id) ?? []
  const phaseCards = props.phaseCards.filter((c) => !faces.some((f) => f.id === c.id))
  const child = data.childAt.get(l.id)
  const t = MESSAGES[lang]
  const owner = l.continentId ? data.continent.get(l.continentId) : undefined
  const placeCard = data.placeCard.get(l.id)
  const sagaCard = data.sagaPlaceCard.get(l.id)
  const cardsHere = data.cardsAt.get(l.id) ?? []
  // 자리가 없는 장소는 그와 하나인 카드의 표시가 장소의 표시 — 그 자리를 고른 까닭이 '추정'
  const markEstimate = l.placement === 'estimate' ? l.estimate : l.placement === 'unplaced' && placeCard?.at ? placeCard.estimate : undefined
  const kindText = t.kind[l.kind] + (l.terrain && l.kind === 'region' ? `, ${t.terrainKind[l.terrain]}` : '')
  return (
    <article>
      <Head name={l.name} nameKo={l.nameKo} lang={lang} titleRef={titleRef} />
      {/* 지역 상세 (S9) — 그 지역 상세가 나오는 가장 깊은 단계로, 밑에 해석 안내 (지금 지도의 '가까이 보기') */}
      {child && onCloser && (
        <div className="px-closer-row">
          <button type="button" className="px-closer" onClick={() => onCloser(child.id)}>
            {t.closer}
          </button>
          {child.note && <p className="px-closer-note" {...tx(child.note)} />}
        </div>
      )}
      <dl className="px-facts">
        <div>
          <dt>{t.type}</dt>
          <dd>{kindText}</dd>
        </div>
        <div>
          <dt>{t.continent}</dt>
          <dd>
            {owner ? (
              <button type="button" className="px-link-button" onClick={() => onSelect({ type: 'continent', id: owner.id })}>
                {displayName(owner, lang)}
              </button>
            ) : (
              t.openSea
            )}
          </dd>
        </div>
        {cardsHere.length + faceLinks.length > 0 && (
          <div>
            <dt>{t.cards}</dt>
            <dd>
              {[...cardsHere.map((c) => ({ id: c.id, name: displayName(c, lang) })), ...faceLinks.map((f) => ({ id: f.id, name: displayName({ name: f.name, nameKo: f.nameKo }, lang) }))].map((c, i) => (
                <Fragment key={c.id}>
                  {i > 0 && ', '}
                  <button type="button" className="px-link-button" onClick={() => onSelect({ type: 'card', id: c.id })}>
                    {c.name}
                  </button>
                </Fragment>
              ))}
            </dd>
          </div>
        )}
      </dl>
      <p className="px-prose" {...tx(l.description)} />
      {placeCard && (
        <figure className="px-place-card">
          <CardImage card={placeCard} lang={lang} />
          <figcaption>
            {(placeCard.name !== l.name || (placeCard.nameKo && placeCard.nameKo !== l.nameKo)) && (
              <span className="px-strong">
                {placeCard.name}
                {placeCard.nameKo && ` (${placeCard.nameKo})`}
              </span>
            )}
            <span>{t.cardLine(data.setLabel(placeCard.set), placeCard.number, t.landCard, t.rarity[placeCard.rarity], placeCard.artist)}</span>
            {placeCard.basis && <span {...tx(placeCard.basis)} />}
          </figcaption>
        </figure>
      )}
      {/* 이곳과 하나인 페이즈 카드 (S7 — Seer's Sundial 처럼 카드가 곧 이 장소) — 그림 없이 장소의 카드로, 그 시점에 실은 까닭과 함께 (S22) */}
      {placeTexts.map((x) => (
        <PhasePlaceCard key={x.card.id} card={x.card} place={l} lang={lang} tx={tx} time={time} setLabel={data.setLabel} />
      ))}
      {/* 이곳과 하나인 양면 카드의 대지 면 (S22 — 지금 지도의 FaceCard) */}
      {faces.map((f) => (
        <FaceCard key={f.id} face={f} place={l} lang={lang} onSelect={onSelect} drawn={frontDrawn?.(f.id) ?? true} beyond={time !== null && data.faceBeyond(f, time) ? timeInfo(time as TimePoint).button : undefined} t={t} tx={tx} />
      ))}
      {/* 시점별 지도에서 이곳을 기본 지도(Zendikar Rising 무렵)와 다른 그 무렵 모습으로 그린 까닭 — 공식 근거와, 이 지도가 고른 것은 '추정' (S6) */}
      {notes.length > 0 && (
        <section className="px-section">
          <h3>{t.thisPeriod}</h3>
          <ul className="px-list is-notes">
            {notes.map((n) => (
              <li key={n.id}>
                {n.mark === null ? (
                  <span className="px-strong">{t.notYetHere}</span>
                ) : n.mark === 'ruin' ? (
                  <span className="px-strong">{t.ruinedHere}</span>
                ) : (
                  <span className="px-strong" {...tx(n.label)} />
                )}
                <p className="px-prose" {...tx(n.basis)} />
                {n.estimate && <Estimate text={n.estimate} t={t} tx={tx} />}
              </li>
            ))}
          </ul>
        </section>
      )}
      {/* 이 시점에 이곳을 그린 페이즈 카드 (S7) — 세트 차례 */}
      {phaseCards.length > 0 && (
        <section className="px-section">
          <h3>{LOCAL[lang].cardsHere(phaseCards.length)}</h3>
          <ul className="px-list">
            {phaseCards.map((c) => (
              <li key={c.id}>
                <button type="button" className="px-link-button" onClick={() => onSelect({ type: 'card', id: c.id })}>
                  {displayName(c, lang)}
                </button>{' '}
                <span className="px-muted">{c.set.toUpperCase()}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {/* 그 시점에만 실리는, 이곳과 하나인 사가의 대지 카드 (지금 지도의 sagaPlaceCards — 2016 의 Ruins of Oran-Rief·Sea Gate Wreckage) */}
      {sagaCard && (
        <figure className="px-place-card">
          <CardImage card={sagaCard} lang={lang} />
          <figcaption>
            <span className="px-strong">
              {sagaCard.name}
              {sagaCard.nameKo && ` (${sagaCard.nameKo})`}
            </span>
            <span>{t.cardLine(data.setLabel(sagaCard.set), sagaCard.number, t.landCard, t.rarity[sagaCard.rarity], sagaCard.artist)}</span>
            {sagaCard.basis && <span {...tx(sagaCard.basis)} />}
          </figcaption>
        </figure>
      )}
      {l.history && (
        <section className="px-section">
          <h3>{t.history}</h3>
          <p className="px-prose" {...tx(l.history)} />
        </section>
      )}
      {markEstimate ? (
        <Estimate text={markEstimate} t={t} tx={tx} />
      ) : (
        <p className="px-note">
          {t.placement[l.placement]}
          {l.placement === 'canon-hint' && l.placementBasis && (
            <>
              <br />
              {t.basisLead}
              <span {...tx(l.placementBasis)} />
            </>
          )}
        </p>
      )}
      <FeatureList title={t.featuresHere} features={features} periodNotes t={t} tx={tx} />
      <Sources
        sources={withCardSources(
          l.sources,
          placeCard,
          sagaCard,
          ...placeTexts.map((x) => x.card),
          ...faces.map((f) => ({ sources: [{ label: `Card: ${f.front} // ${f.name} (${f.set.toUpperCase()} #${f.number})`, url: f.url }] })),
        )}
        t={t}
        tx={tx}
      />
    </article>
  )
}

/** 페이즈 카드 (S7) — 지금 지도의 PlacePanel 의 카드 패널과 같은 차례: 이름·유형·이은 곳·카드 줄, 그림, 대상·플레이버·근거·추정, 이 시점, 뒷면·대지 면, 출처 */
function PhaseCardBody(props: {
  text: PhaseCardText
  data: PanelData
  lang: Lang
  tx: Tx
  onSelect: (s: Selection) => void
  titleRef: React.RefObject<HTMLHeadingElement | null>
  time: number | null
  kinOf?: (card: PhaseCard) => { name: string; nameKo?: string; sameName: boolean } | undefined
}) {
  const { text, data, lang, tx, onSelect, titleRef, time, kinOf } = props
  const c = text.card
  const t = MESSAGES[lang]
  // 양면 카드의 대지 면이 이은 장소의 패널에 실리는 해 (지금 지도의 cardFace — 시점별 보기만이라 해만)
  const face = c.land ? data.faceById(c.id) : undefined
  const faceYears = face ? data.faceYears(face) : null
  const era = c.era && c.sagaSet ? { slot: slotOf(levelOfSet(c.sagaSet)), year: timeInfo(timeOfSet(c.sagaSet)).button } : null
  const place = c.depicts.type === 'location' ? data.location.get(c.depicts.id) : undefined
  const continentId = c.depicts.type === 'continent' ? c.depicts.id : place?.continentId
  const continent = continentId ? data.continent.get(continentId) : undefined
  const reason0 = time === null ? null : timeReasonOf(c, time as TimePoint)
  // 그해에 그리지 않으면 그 인물·카드를 맡는 그림의 이름 (지금 지도의 TimeReason.kin)
  const kin = reason0?.never ? kinOf?.(c) : undefined
  return (
    <article>
      <Head name={c.name} nameKo={c.nameKo} lang={lang} titleRef={titleRef} />
      <dl className="px-facts">
        <div>
          <dt>{t.type}</dt>
          <dd lang="en">
            {c.typeLine}, <span lang={lang}>{t.rarity[c.rarity]}</span>
          </dd>
        </div>
        <div>
          <dt>{t.continent}</dt>
          <dd>
            {continent ? (
              <button type="button" className="px-link-button" onClick={() => onSelect({ type: 'continent', id: continent.id })}>
                {displayName(continent, lang)}
              </button>
            ) : (
              '—'
            )}
          </dd>
        </div>
        {place && (
          <div>
            <dt>{t.linkedPlace}</dt>
            <dd>
              <button type="button" className="px-link-button" onClick={() => onSelect({ type: 'location', id: place.id })}>
                {displayName(place, lang)}
              </button>
            </dd>
          </div>
        )}
        <div>
          <dt>{t.card}</dt>
          <dd>{t.cardNumber(c.set.toUpperCase(), c.number, c.artist)}</dd>
        </div>
        {/* 이야기 세트 밖의 제품의 카드 — 인쇄된 제품과 그 카드를 그린 무렵 (S22 — 지금 지도의 패널과 같다) */}
        {c.era && (
          <div>
            <dt>{t.cardProduct}</dt>
            <dd>{t.printedOutside(data.productName(c.set))}</dd>
          </div>
        )}
        {c.era && (
          <div>
            <dt>{t.cardFirstPrinted}</dt>
            <dd>{c.era.released}</dd>
          </div>
        )}
        {era?.slot && (
          <div>
            <dt>{t.cardEra}</dt>
            <dd>{t.eraOf(era.slot, era.year)}</dd>
          </div>
        )}
      </dl>
      <a className={`px-card-figure${isSideways(c.typeLine) ? ' is-sideways' : ''}`} href={c.url} target="_blank" rel="noreferrer">
        <img src={c.image} alt={t.cardAlt(c.name)} width={488} height={680} loading="lazy" decoding="async" />
      </a>
      {c.subject && <p className="px-prose" {...tx(c.subject)} />}
      {c.flavor && !c.land && !c.back && (
        <p className="px-prose px-flavor" lang="en">
          {c.flavor}
        </p>
      )}
      {c.basis ? <p className="px-prose" {...tx(c.basis)} /> : <p className="px-prose">{t.cardNamedForPlace}</p>}
      {c.estimate ? <Estimate text={c.estimate} t={t} tx={tx} /> : <p className="px-note">{t.cardPlacedAtLink(true)}</p>}
      {c.era && <EraNote era={c.era} t={t} tx={tx} />}
      {reason0 && <TimeNote reason={reason0} kin={kin} lang={lang} t={t} tx={tx} />}
      {/* 양면 카드 — 앞면(지도의 그림)과 뒷면(그리지 않는다)·대지 면(이은 장소의 패널에 실린다)을 면마다 (S22 — 지금 지도의 '양면 카드') */}
      {(c.back || c.land) && (
        <section className="px-section">
          <h3>{t.dfc}</h3>
          <ul className="px-list is-notes">
            <li>
              <span className="px-strong">
                {t.frontFace} · {faceName(c.name, c.nameKo)}
              </span>
              <p className="px-prose">
                <span lang="en">{c.typeLine}</span> — {t.drawnAsFigure}
              </p>
              {c.flavor && (
                <p className="px-prose px-flavor" lang="en">
                  {c.flavor}
                </p>
              )}
            </li>
            {c.back && (
              <li>
                <span className="px-strong">
                  {t.backFace} · {faceName(c.back.name, c.back.nameKo)}
                </span>
                <p className="px-prose">
                  <span lang="en">{c.back.typeLine}</span> — {t.backNotDrawn}
                </p>
                {c.back.flavor && (
                  <p className="px-prose px-flavor" lang="en">
                    {c.back.flavor}
                  </p>
                )}
                <a className="px-card-figure" href={c.url} target="_blank" rel="noreferrer">
                  <img src={c.back.image} alt={t.cardAlt(c.back.name)} width={488} height={680} loading="lazy" decoding="async" />
                </a>
              </li>
            )}
            {c.land && (
              <li>
                <span className="px-strong">
                  {t.landFace} · {faceName(c.land.name, c.land.nameKo)}
                </span>
                <p className="px-prose">
                  <span lang="en">{c.land.typeLine}</span>
                  {place && (
                    <>
                      {' — '}
                      <button type="button" className="px-link-button" onClick={() => onSelect({ type: 'location', id: place.id })}>
                        {displayName(place, lang)}
                      </button>
                      {face ? ` ${faceYears ? LOCAL[lang].faceShownIn(faceYears) : t.faceShownIn(null)}` : ''}
                    </>
                  )}
                </p>
                {c.land.flavor && (
                  <p className="px-prose px-flavor" lang="en">
                    {c.land.flavor}
                  </p>
                )}
                {c.land.basis && <p className="px-prose" {...tx(c.land.basis)} />}
                {c.land.estimate && <Estimate text={c.land.estimate} t={t} tx={tx} />}
                {/* 시점별 보기에서 그 사가의 시점 밖에도 싣는 까닭 (LandFace.time) */}
                {c.land.time?.basis && <p className="px-prose" {...tx(c.land.time.basis)} />}
                {c.land.time?.estimate && <Estimate text={c.land.time.estimate} t={t} tx={tx} />}
                <a className="px-card-figure" href={c.url} target="_blank" rel="noreferrer">
                  <img src={c.land.image} alt={t.cardAlt(c.land.name)} width={488} height={680} loading="lazy" decoding="async" />
                </a>
              </li>
            )}
          </ul>
        </section>
      )}
      <Sources sources={c.sources} t={t} tx={tx} />
    </article>
  )
}

/**
 * 장소·대륙과 하나인 페이즈 카드 — 그림과 카드 줄, 대상·근거·무렵, 그 시점에 실은 까닭 (S22 — 지금 지도의 PlaceCard 와 placeCardTime). 카드 이름이 장소 이름과 다를 때만 이름을 적는다
 */
function PhasePlaceCard({ card: c, place, lang, tx, time, setLabel }: { card: PhaseCard; place: { name: string; nameKo?: string }; lang: Lang; tx: Tx; time: number | null; setLabel: (set: string) => string }) {
  const t = MESSAGES[lang]
  const ownName = c.name !== place.name || (c.nameKo && c.nameKo !== place.nameKo)
  const reason = time === null ? null : timeReasonOf(c, time as TimePoint)
  return (
    <>
      <figure className="px-place-card">
        <a className={`px-card-figure${isSideways(c.typeLine) ? ' is-sideways' : ''}`} href={c.url} target="_blank" rel="noreferrer">
          <img src={c.image} alt={t.cardAlt(c.name)} width={488} height={680} loading="lazy" decoding="async" />
        </a>
        <figcaption>
          {ownName && (
            <span className="px-strong">
              {c.name}
              {c.nameKo && ` (${c.nameKo})`}
            </span>
          )}
          <span>{t.cardLine(setLabel(c.set), c.number, c.typeLine, t.rarity[c.rarity], c.artist)}</span>
          {c.subject && <span {...tx(c.subject)} />}
          {c.basis && <span {...tx(c.basis)} />}
          {c.era?.basis && <span {...tx(c.era.basis)} />}
          {c.era?.estimate && <Estimate text={c.era.estimate} t={t} tx={tx} />}
        </figcaption>
      </figure>
      {reason && <TimeNote reason={reason} lang={lang} t={t} tx={tx} />}
    </>
  )
}

/** 장소와 하나인 양면 카드의 대지 면 — 면 그림과 카드 줄, 플레이버, 앞면 링크 (지금 지도의 FaceCard — S22) */
function FaceCard(props: {
  face: LandFaceEntry
  place: Location
  lang: Lang
  onSelect: (s: Selection) => void
  /** 앞면 그림이 이 시점에 그려지는가 */
  drawn: boolean
  /** 그 사가의 시점 밖에 실은 해 — 이 지도의 판단이라 '추정' */
  beyond?: string
  t: (typeof MESSAGES)[Lang]
  tx: Tx
}) {
  const { face, place, lang, onSelect, drawn, beyond, t, tx } = props
  const front = faceName(face.front, face.frontKo)
  const ownName = face.name !== place.name || (face.nameKo && face.nameKo !== place.nameKo)
  return (
    <figure className="px-place-card">
      <a className="px-card-figure" href={face.url} target="_blank" rel="noreferrer">
        <img src={face.image} alt={t.cardAlt(face.name)} width={488} height={680} loading="lazy" decoding="async" />
      </a>
      <figcaption>
        {ownName && <span className="px-strong">{faceName(face.name, face.nameKo)}</span>}
        <span>{t.cardLine(face.set.toUpperCase(), face.number, t.landFaceOfDfc, t.rarity[face.rarity], face.artist)}</span>
        {face.flavor && (
          <span className="px-flavor" lang="en">
            {face.flavor}
          </span>
        )}
        <span>
          {t.frontFaceLead}{' '}
          <button type="button" className="px-link-button" onClick={() => onSelect({ type: 'card', id: face.id })}>
            {front}
          </button>
          {/* 시점별 보기만이라 사가·페이즈는 적지 않는다 — 앞면을 그리지 않는 시점이면 그 문장을 빼고 */}
          {drawn ? t.frontFaceTail(front, null) : lang === 'ko' ? '.' : '.'}
        </span>
        {beyond && <Estimate text={t.faceBeyondSaga(beyond)} t={t} tx={tx} />}
      </figcaption>
    </figure>
  )
}

/** 시점별 보기에서 그 시점에 그린(또는 그리지 않은) 까닭 — 지금 지도의 TimeNote */
function TimeNote({ reason, kin, lang, t, tx }: { reason: TimeReason; kin?: { name: string; nameKo?: string; sameName: boolean }; lang: Lang; t: (typeof MESSAGES)[Lang]; tx: Tx }) {
  return (
    <section className="px-section">
      <h3>{reason.never ? t.timeNeverTitle(reason.when, Boolean(reason.replaced)) : reason.notDrawn ? t.timeGoneTitle(reason.when) : t.timeTitle(reason.when)}</h3>
      {kin && <p className="px-prose">{t.timeNeverKin(displayName(kin, lang), kin.sameName)}</p>}
      {reason.basis && <p className="px-prose" {...tx(reason.basis)} />}
      {reason.estimate && <Estimate text={reason.estimate} t={t} tx={tx} />}
    </section>
  )
}

/** 이야기 세트 밖의 카드가 그 무렵에 오른 까닭 — 글이 밝혔으면 근거, 이 지도의 판단이면 '추정' (지금 지도의 EraNote) */
function EraNote({ era, t, tx }: { era: NonNullable<PhaseCard['era']>; t: (typeof MESSAGES)[Lang]; tx: Tx }) {
  return (
    <>
      {era.basis && <p className="px-prose" {...tx(era.basis)} />}
      {era.estimate && <Estimate text={era.estimate} t={t} tx={tx} />}
    </>
  )
}

/** 여러 추정 메모가 함께 시작하는 문장들과 저마다 다른 뒷부분 (지금 지도의 splitLead) */
function splitLead(texts: string[]): { lead: string; tails: string[] } {
  if (texts.length < 2) return { lead: '', tails: texts }
  const units = texts.map(splitUnits)
  let n = 0
  while (units.every((u) => u[n] !== undefined && u[n] === units[0][n])) n++
  return { lead: units[0].slice(0, n).join(' '), tails: units.map((u) => u.slice(n).join(' ')) }
}

/** 한 점 기호를 한 무리로 치는 거리 (지도 단위) — 지금 지도의 GLYPH_CLUSTER */
const GLYPH_CLUSTER = 19
const GLYPH_KINDS = new Set(['volcano', 'caldera', 'waterfall', 'geyser', 'pit', 'spire', 'floating-rock', 'urn'])

/** 같은 이름으로 묶은 지형의 수 — 강·절벽·협곡은 '줄기', 그 밖은 '곳', 한 점 기호는 바짝 붙은 것끼리 한 곳 (지금 지도의 featureCount) */
function featureCount(items: PanelFeature[], count: (lines: number, places: number) => string): string {
  const lines = items.filter((f) => f.kind === 'river' || f.kind === 'cliff' || f.kind === 'gorge').length
  const glyphs = items.flatMap((f) => (GLYPH_KINDS.has(f.kind) && f.at ? [f.at] : []))
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
 * 바탕 지형 목록 — 같은 이름은 한 줄로 묶고, 이 지도가 고른 것은 '추정'과 그 까닭 (함께 시작하는 문장은 한 번만). 그 무렵에만 그린 것은 '이 무렵' —
 * periodNotes 면 그 추정은 '이 무렵' 단락이 이미 실어 이름만 둔다 (지금 지도의 FeatureList)
 */
function FeatureList({ title, note, features, periodNotes = false, t, tx }: { title: string; note?: string; features: PanelFeature[]; periodNotes?: boolean; t: (typeof MESSAGES)[Lang]; tx: Tx }) {
  if (features.length === 0) return null
  const groups = new Map<string, { label: string; own: boolean; period: boolean; estimates: string[]; items: PanelFeature[] }>()
  for (const f of features) {
    const own = f.label !== undefined
    const label = f.label ?? t.landscapeKind[f.kind as keyof typeof t.landscapeKind] ?? f.kind
    const period = Boolean(f.period)
    const key = `${period ? '~' : ''}${label}`
    const g = groups.get(key) ?? { label, own, period, estimates: [], items: [] }
    g.estimates.push(period && periodNotes ? '' : (f.estimate ?? ''))
    g.items.push(f)
    groups.set(key, g)
  }
  return (
    <section className="px-section">
      <h3>{title}</h3>
      {note && <p className="px-muted">{note}</p>}
      <ul className="px-list is-notes">
        {[...groups.entries()].map(([key, { label, own, period, estimates, items }]) => {
          const { lead, tails: all } = splitLead([...new Set(estimates.filter(Boolean))])
          const tails = [...new Set(all.filter(Boolean))]
          return (
            <li key={key}>
              <span className="px-strong">
                {own ? <span {...tx(label)} /> : label}
                {featureCount(items, t.featureCount)}
              </span>
              {period && <span className="px-muted"> · {t.thisPeriod}</span>}
              {(lead || tails.length > 0) && (
                <div className="px-note is-estimate">
                  <strong>{t.estimate}</strong> {(lead || tails.length === 1) && <span {...tx(tails.length === 1 ? `${lead} ${tails[0]}`.trim() : lead)} />}
                  {tails.length > 1 && (
                    <ul className="px-list">
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

function CardImage({ card, lang }: { card: LandCard; lang: Lang }) {
  const t = MESSAGES[lang]
  return (
    <a className="px-card-figure" href={card.url} target="_blank" rel="noreferrer">
      <img src={card.image} alt={t.cardAlt(card.name)} width={488} height={680} loading="lazy" decoding="async" />
    </a>
  )
}

function Estimate({ text, t, tx }: { text: string; t: (typeof MESSAGES)[Lang]; tx: Tx }) {
  return (
    <p className="px-note is-estimate">
      <strong>{t.estimate}</strong> <span {...tx(text)} />
    </p>
  )
}

function Sources({ sources, t, tx }: { sources: Source[]; t: (typeof MESSAGES)[Lang]; tx: Tx }) {
  if (!sources.length) return null
  return (
    <section className="px-section">
      <h3>{t.sources}</h3>
      <ul className="px-sources">
        {sources.map((s, i) => (
          <li key={i}>{s.url ? <a href={s.url} target="_blank" rel="noreferrer" {...tx(s.label)} /> : <span {...tx(s.label)} />}</li>
        ))}
      </ul>
    </section>
  )
}
