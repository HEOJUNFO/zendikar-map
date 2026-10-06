import { useEffect, useRef, type RefObject } from 'react'
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
  onSelectLocation,
  onSelectContinent,
  onClose,
}: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const open = Boolean(location || continent)
  const key = location?.id ?? continent?.id

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
          <Cards title="이 대륙의 카드" cards={continent.cards} />
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
