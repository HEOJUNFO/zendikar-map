import { Fragment, useEffect, useRef, type RefObject } from 'react'
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
  /** 이 장소를 따로 그린 자식 지도 (페이즈를 켰고 아직 열지 않았을 때) — 장소를 누른 다음 한 단계로 연다 */
  childMapHere: string | null
  onOpenChildMap: (id: string) => void
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
  onClose: () => void
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

/** 장소와 하나인 카드 — 장소 패널에 카드 그림과 카드 정보를 싣는다. 그림을 누르면 Scryfall 카드 페이지 */
function PlaceCard({ card, place }: { card: LandCard; place: Location }) {
  // 카드 이름이 장소 이름과 다르면(별칭) 카드 이름을 따로 적는다
  const ownName = card.name !== place.name || (card.nameKo && card.nameKo !== place.nameKo)
  return (
    <figure className="place-card">
      <a className="card-figure" href={card.url} target="_blank" rel="noreferrer">
        <img
          className="card-image"
          src={card.image}
          alt={`${card.name} 카드 — Scryfall 에서 보기`}
          width={244}
          height={340}
          decoding="async"
        />
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
  childMapHere,
  onOpenChildMap,
  onMap,
  featuresHere,
  continentFeatures,
  locationOf,
  onSelectCard,
  onSelectLocation,
  onSelectContinent,
  onClose,
}: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const open = Boolean(location || continent || card)
  const key = location?.id ?? continent?.id ?? (card ? `card/${card.id}` : undefined)

  useEffect(() => {
    if (key) headingRef.current?.focus({ preventScroll: true })
  }, [key])

  useEffect(() => {
    if (!open) return
    // 검색창처럼 Escape 로 제 것을 먼저 닫은 경우(defaultPrevented)는 넘어간다
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !e.defaultPrevented && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
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
    <aside className="panel" aria-labelledby="panel-title" ref={panelRef}>
      <button type="button" className="panel-close" onClick={onClose} aria-label="닫기">
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
            <img
              className="card-image"
              src={card.image}
              alt={`${card.name} 카드 — Scryfall 에서 보기`}
              width={244}
              height={340}
              decoding="async"
            />
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
          {childMapHere && (
            <button type="button" className="open-child" onClick={() => onOpenChildMap(childMapHere)}>
              {/* 접힌 지도 */}
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d={CHILD_MAP_ICON} />
              </svg>
              지역 지도 보기
            </button>
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
