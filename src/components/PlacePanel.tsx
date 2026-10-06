import { Fragment, useEffect, useRef, type RefObject } from 'react'
import type { LandCard } from '../data/cards'
import { isPlaced, type Continent, type Location, type Source } from '../data/types'
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
  /** 대지 카드 — 카드 패널을 열었을 때 */
  card: LandCard | null
  /** 지금 장소에 이어진 카드 (장소 패널에서 카드 패널로 가는 링크) */
  cardsHere: LandCard[]
  locationOf: (id: string) => Location | null
  onSelectCard: (id: string) => void
  onSelectLocation: (id: string) => void
  onSelectContinent: (id: string) => void
  onClose: () => void
}

const RARITY: Record<LandCard['rarity'], string> = { common: '커먼', uncommon: '언커먼', rare: '레어', mythic: '미식 레어' }

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
  card,
  cardsHere,
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
  // 카드가 이어진 장소와 그 대륙
  const cardPlace = card?.depicts.type === 'location' ? locationOf(card.depicts.id) : null
  const cardContinent = card
    ? continentOf(card.depicts.type === 'continent' ? card.depicts.id : cardPlace?.continentId ?? null)
    : null

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
              <dd>대지 카드, {RARITY[card.rarity]}</dd>
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
          <p className="prose">{card.basis ?? '카드 이름이 곧 지명이다.'}</p>
          <p className={`placement-note ${card.estimate ? 'is-estimate' : ''}`}>
            {card.estimate ? (
              <>
                <strong>추정</strong> {card.estimate}
              </>
            ) : (
              '지도의 카드 표시는 이 카드가 이어진 곳에 두었습니다.'
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
          </dl>
          <p className="prose">{location.description}</p>
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
