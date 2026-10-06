import { useEffect, useRef, type RefObject } from 'react'
import type { LandCard } from '../data/cards'
import { isPlaced, type CardRef, type Continent, type Location, type Source } from '../data/types'
import { KIND_LABEL, PLACEMENT_NOTE, TERRAIN_LABEL } from './labels'
import './PlacePanel.css'

interface Props {
  /** 패널이 지도를 얼마나 가리는지 App 이 잰다 */
  panelRef: RefObject<HTMLElement | null>
  location: Location | null
  continent: Continent | null
  /** 대륙 패널에서 보여 줄 소속 장소 */
  continentPlaces: Location[]
  continentOf: (id: string | null) => Continent | null
  /** ZEN 대지 카드 모아보기 — 열려 있을 때만 */
  landCards: LandCard[] | null
  locationOf: (id: string) => Location | null
  onPickCard: (card: LandCard) => void
  /** 카드 모아보기에서 온 장소일 때 — 모아보기로 돌아간다 */
  onBackToCards?: () => void
  onSelectLocation: (id: string) => void
  onSelectContinent: (id: string) => void
  onClose: () => void
}

/** 이곳을 그린 카드 — 그림은 Scryfall 에서 불러오고, 누르면 Scryfall 카드 페이지로 간다 */
function Cards({ title, cards }: { title: string; cards?: CardRef[] }) {
  if (!cards || cards.length === 0) return null
  return (
    <section className="panel-section">
      <h3>{title}</h3>
      <ul className="card-list">
        {cards.map((c) => (
          <li key={`${c.set}-${c.number}`}>
            <a className="card-link" href={c.url} target="_blank" rel="noreferrer">
              {/* 카드 이름은 아래 글자로 읽히므로 그림은 장식으로 둔다 */}
              <img className="card-image" src={c.image} alt="" width={244} height={340} loading="lazy" decoding="async" />
              <span className="card-name">{c.name}</span>
              {c.nameKo && <span className="card-name-ko">{c.nameKo}</span>}
              <span className="card-meta">
                {c.set.toUpperCase()} #{c.number} · 그림 {c.artist}
              </span>
            </a>
            {c.basis && <p className="card-basis">{c.basis}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** 카드가 그린 곳의 이름 — 장소면 '장소, 대륙', 대륙이면 대륙 이름 */
function depictedName(
  c: LandCard,
  locationOf: (id: string) => Location | null,
  continentOf: (id: string | null) => Continent | null,
): string | null {
  if (!c.depicts) return null
  if (c.depicts.type === 'continent') return continentOf(c.depicts.id)?.name ?? null
  const l = locationOf(c.depicts.id)
  if (!l) return null
  const owner = continentOf(l.continentId)
  return owner ? `${l.name}, ${owner.name}` : l.name
}

function CardIndex({
  cards,
  locationOf,
  continentOf,
  onPick,
}: {
  cards: LandCard[]
  locationOf: (id: string) => Location | null
  continentOf: (id: string | null) => Continent | null
  onPick: (c: LandCard) => void
}) {
  const placedHere = (c: LandCard) => {
    if (c.depicts?.type !== 'location') return false
    const l = locationOf(c.depicts.id)
    return Boolean(l && isPlaced(l))
  }
  const groups: { title: string; note?: string; items: LandCard[] }[] = [
    { title: '지도에 있는 곳', items: cards.filter(placedHere) },
    {
      title: '위치가 알려지지 않은 곳',
      note: '공식 설정이 대륙까지만 밝힌 곳이라 지도에 찍지 않았습니다. 누르면 그 대륙을 보여 줍니다.',
      items: cards.filter((c) => c.depicts?.type === 'location' && !placedHere(c)),
    },
    {
      title: '대륙의 풍경',
      note: '특정 장소가 아니라 그 대륙의 풍경을 그렸다고 공식 자료가 밝힌 카드입니다.',
      items: cards.filter((c) => c.depicts?.type === 'continent'),
    },
    {
      title: '지도에 잇지 않은 카드',
      note: '지명이 아닌 지형 이름이고, 어디를 그렸는지 밝힌 공식 자료를 찾지 못했습니다. 누르면 Scryfall 카드 페이지로 갑니다.',
      items: cards.filter((c) => !c.depicts),
    },
  ]
  return (
    <>
      {groups
        .filter((g) => g.items.length > 0)
        .map((g) => (
          <section className="panel-section" key={g.title}>
            <h3>
              {g.title} <span className="count">{g.items.length}</span>
            </h3>
            {g.note && <p className="list-note">{g.note}</p>}
            <ul className="card-tiles">
              {g.items.map((c) => {
                const where = depictedName(c, locationOf, continentOf)
                const body = (
                  <>
                    <img className="card-thumb" src={c.thumb} alt="" width={146} height={204} loading="lazy" decoding="async" />
                    <span className="card-tile-name">{c.name}</span>
                    {where ? <span className="card-tile-place">{where}</span> : c.note && <span className="card-tile-place">{c.note}</span>}
                  </>
                )
                return (
                  <li key={c.number}>
                    {c.depicts ? (
                      <button type="button" className="card-tile" onClick={() => onPick(c)}>
                        {body}
                      </button>
                    ) : (
                      <a className="card-tile" href={c.url} target="_blank" rel="noreferrer">
                        {body}
                      </a>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
    </>
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
}: {
  title: string
  note?: string
  places: Location[]
  onSelect: (id: string) => void
}) {
  if (places.length === 0) return null
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
      </ul>
    </section>
  )
}

export function PlacePanel({
  panelRef,
  location,
  continent,
  continentPlaces,
  continentOf,
  landCards,
  locationOf,
  onPickCard,
  onBackToCards,
  onSelectLocation,
  onSelectContinent,
  onClose,
}: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const open = Boolean(location || continent || landCards)
  const key = location?.id ?? continent?.id ?? (landCards ? 'cards' : undefined)

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

  return (
    <aside className="panel" aria-labelledby="panel-title" ref={panelRef}>
      <button type="button" className="panel-close" onClick={onClose} aria-label="닫기">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5" />
        </svg>
      </button>

      {landCards && (
        <article key="cards">
          <header className="panel-head">
            <h2 id="panel-title" ref={headingRef} tabIndex={-1}>
              ZEN 대지 카드
            </h2>
            <p className="name-ko">Zendikar(2009)의 기본대지가 아닌 대지 {landCards.length}장</p>
          </header>
          <p className="prose">
            카드 그림이 그린 곳을 공식 자료로 확인해 지도의 장소에 이었습니다. 카드를 누르면 그곳으로 갑니다.
          </p>
          <CardIndex cards={landCards} locationOf={locationOf} continentOf={continentOf} onPick={onPickCard} />
        </article>
      )}

      {onBackToCards && (location || continent) && (
        <button type="button" className="link back-to-cards" onClick={onBackToCards}>
          ← ZEN 대지 카드
        </button>
      )}

      {location && (
        <article key={location.id}>
          <header className="panel-head">
            <h2 id="panel-title" ref={headingRef} tabIndex={-1}>
              {location.name}
            </h2>
            {location.nameKo && <p className="name-ko">{location.nameKo}</p>}
          </header>
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
          </dl>
          <p className="prose">{location.description}</p>
          <Cards title="이곳을 그린 카드" cards={location.cards} />
          {location.history && (
            <section className="panel-section">
              <h3>시대별 변화</h3>
              <p className="prose">{location.history}</p>
            </section>
          )}
          <p className="placement-note">
            {PLACEMENT_NOTE[location.placement]}
            {location.placement === 'canon-hint' && location.placementBasis && (
              <>
                <br />
                근거: {location.placementBasis}
              </>
            )}
          </p>
          <Sources sources={location.sources} />
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
          <Cards title="이 대륙을 그린 카드" cards={continent.cards} />
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
          <PlaceList title="이 대륙의 장소" places={continentPlaces.filter(isPlaced)} onSelect={onSelectLocation} />
          <PlaceList
            title="위치가 알려지지 않은 곳"
            note="공식 설정이 대륙까지만 밝힌 곳이라 지도에 찍지 않았습니다."
            places={continentPlaces.filter((l) => !isPlaced(l))}
            onSelect={onSelectLocation}
          />
          <Sources sources={continent.sources} />
        </article>
      )}
    </aside>
  )
}
