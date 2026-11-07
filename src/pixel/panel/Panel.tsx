// 픽셀 지도의 패널 — 장소·대륙·대지 카드 (docs/pixel-plan.md S3). 지금 지도의 src/components/PlacePanel.tsx 와 같은 글을 같은 차례로 싣되,
// 픽셀 지도에 아직 없는 것(페이즈 카드·양면 카드의 대지 면·지도에 그린 지형·그 무렵 모습·지역 상세)은 싣지 않는다.
// 데이터 글은 한국어 원본이고, 영어 보기는 문장마다의 영어 사전(src/i18n/en/base.json)으로 옮긴다 — 사전에 없는 문장이 있으면 그 글은 한국어로 둔다 (useText 와 같다).
// '추정'(이 지도가 자리·연결을 고른 것)은 패널에만 보인다 — 지도 기호는 모양이 같다
import { Fragment, useEffect, useRef } from 'react'
import type { LandCard } from '../../data/cards'
import type { Location, Source } from '../../data/types'
import { MESSAGES } from '../../i18n/messages'
import { translate, type Dict } from '../../i18n/units'
import { displayName, type Lang } from '../labels/layout'
import type { Selection } from '../marks/MarksLayer'
import type { PeriodNoteSlim } from '../time'
import type { PanelData } from './data'

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

const sourceKey = (s: Source) => `${s.label}|${s.url ?? ''}`
function withCardSources(own: Source[], ...cards: (LandCard | null | undefined)[]): Source[] {
  const out = [...own]
  const seen = new Set(own.map(sourceKey))
  for (const c of cards)
    for (const s of c?.sources ?? []) {
      if (seen.has(sourceKey(s))) continue
      seen.add(sourceKey(s))
      out.push(s)
    }
  return out
}

export function Panel({ lang, data, dict, selection, onSelect, onClose, period }: Props) {
  const t = MESSAGES[lang]
  const tx = txOf(lang, dict)
  const headingRef = useRef<HTMLHeadingElement>(null)
  // 고른 것이 바뀌면 제목으로 초점을 옮긴다 (화면 읽기 프로그램이 새 패널을 읽는다)
  const key = `${selection.type}/${selection.id}`
  const ready = data !== null
  useEffect(() => {
    if (ready) headingRef.current?.focus({ preventScroll: true })
  }, [key, ready])

  const body = (() => {
    if (!data) return <p className="px-panel-wait">…</p>
    if (selection.type === 'location') {
      const l = data.location.get(selection.id)
      return l ? <LocationBody l={l} data={data} lang={lang} tx={tx} onSelect={onSelect} titleRef={headingRef} notes={period?.notes?.[l.id] ?? []} /> : null
    }
    if (selection.type === 'continent') {
      const c = data.continent.get(selection.id)
      if (!c) return null
      // 그 무렵 없던 곳은 따로 (지금 지도의 '이 무렵에는 없던 곳'), 폐허가 된 곳은 종류를 폐허로
      const all = data.placesOf.get(c.id) ?? []
      const places = all.filter((l) => period?.marks.get(l.id) !== null)
      const absent = period ? all.filter((l) => period.marks.get(l.id) === null) : []
      const kindOf = (l: Location) => (period?.marks.get(l.id) === 'ruin' ? 'ruin' : l.kind)
      const cards = data.cardsOf.get(c.id) ?? []
      return (
        <article>
          <Head name={c.name} nameKo={c.nameKo} lang={lang} titleRef={headingRef} />
          <p className="px-prose" {...tx(c.summary)} />
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
          {places.length > 0 && (
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
              </ul>
            </section>
          )}
          {absent.length > 0 && (
            <section className="px-section">
              <h3>{t.absentPlaces}</h3>
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
          {cards.length > 0 && (
            <section className="px-section">
              <h3>{t.cards}</h3>
              <ul className="px-list">
                {cards.map((x) => (
                  <li key={x.id}>
                    <button type="button" className="px-link-button" onClick={() => onSelect({ type: 'card', id: x.id })}>
                      {displayName(x, lang)}
                    </button>{' '}
                    <span className="px-muted">{t.landCard}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <Sources sources={c.sources} t={t} tx={tx} />
        </article>
      )
    }
    const c = data.card.get(selection.id)
    if (!c) return null
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
    <aside className="px-panel" aria-labelledby="px-panel-title">
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
}) {
  const { l, data, lang, tx, onSelect, titleRef, notes } = props
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
        {cardsHere.length > 0 && (
          <div>
            <dt>{t.cards}</dt>
            <dd>
              {cardsHere.map((c, i) => (
                <Fragment key={c.id}>
                  {i > 0 && ', '}
                  <button type="button" className="px-link-button" onClick={() => onSelect({ type: 'card', id: c.id })}>
                    {displayName(c, lang)}
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
            <span>{t.cardLine(placeCard.set.toUpperCase(), placeCard.number, t.landCard, t.rarity[placeCard.rarity], placeCard.artist)}</span>
            {placeCard.basis && <span {...tx(placeCard.basis)} />}
          </figcaption>
        </figure>
      )}
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
      {/* 그 시점에만 실리는, 이곳과 하나인 사가의 대지 카드 (지금 지도의 sagaPlaceCards — 2016 의 Ruins of Oran-Rief·Sea Gate Wreckage) */}
      {sagaCard && (
        <figure className="px-place-card">
          <CardImage card={sagaCard} lang={lang} />
          <figcaption>
            <span className="px-strong">
              {sagaCard.name}
              {sagaCard.nameKo && ` (${sagaCard.nameKo})`}
            </span>
            <span>{t.cardLine(sagaCard.set.toUpperCase(), sagaCard.number, t.landCard, t.rarity[sagaCard.rarity], sagaCard.artist)}</span>
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
      <Sources sources={withCardSources(l.sources, placeCard, sagaCard)} t={t} tx={tx} />
    </article>
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
        {sources.map((s) => (
          <li key={sourceKey(s)}>{s.url ? <a href={s.url} target="_blank" rel="noreferrer" {...tx(s.label)} /> : <span {...tx(s.label)} />}</li>
        ))}
      </ul>
    </section>
  )
}
