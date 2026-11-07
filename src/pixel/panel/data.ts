// 패널의 글 — 장소·대륙·대지 카드 원본 (설명·근거·출처가 길어 패널을 처음 열 때 받는 조각이다, docs/pixel-plan.md '피할 것').
// src/data/index.ts 는 부르지 않는다 (검사가 돌고 바탕 지형·지역 상세까지 끌려온다) — 카드와 장소를 잇는 셈만 그 파일과 같게 옮겼다.
// 페이즈 카드·양면 카드의 대지 면·바탕 지형은 아직 싣지 않는다 (S7). 사가에 매인 대지 카드는 그 카드가 나오는 시점에만 (S6 — timeline.ts 의 landAt)
import { LAND_CARDS, type LandCard } from '../../data/cards'
import { continents } from '../../data/continents'
import { locations } from '../../data/locations'
import { landAt, type TimePoint } from '../../data/timeline'
import type { Continent, Location } from '../../data/types'

export interface PanelData {
  location: ReadonlyMap<string, Location>
  continent: ReadonlyMap<string, Continent>
  card: ReadonlyMap<string, LandCard>
  /** 장소와 하나인 카드 (카드 이름이 장소의 이름·별칭) — 장소 id → 카드. 사가에 매인 것은 빼고 (페이즈를 끈 지도) */
  placeCard: ReadonlyMap<string, LandCard>
  /** 장소와 하나인 카드 id → 그 장소 (#card/<id> 는 그 장소 패널을 연다) */
  cardPlace: ReadonlyMap<string, string>
  /** 사가에 매인, 장소와 하나인 카드 — 그 시점에만, 그 장소의 카드와 함께 실린다 (지금 지도의 sagaPlaceCards — 장소 id → 카드) */
  sagaPlaceCard: ReadonlyMap<string, LandCard>
  /** 장소마다 그곳을 가리키는 다른 대지 카드 (페이즈를 끈 지도에 나오는 것만) */
  cardsAt: ReadonlyMap<string, LandCard[]>
  /** 대륙마다 장소 (지도에 표시가 있는 것 — 중요한 것부터, 이름 차례) */
  placesOf: ReadonlyMap<string, Location[]>
  /** 대륙에 바로 이은 대지 카드 (페이즈를 끈 지도의 것) */
  cardsOf: ReadonlyMap<string, LandCard[]>
}

const same = (l: Location | undefined, c: LandCard) => l && [l.name, ...(l.aliases ?? [])].includes(c.name)

/** time: 시점별 지도의 시점 (없으면 페이즈를 끈 지도 — 사가에 매인 카드를 싣지 않는다) */
export function buildPanelData(time: number | null = null): PanelData {
  const shownCard = (c: LandCard) => c.saga === undefined || (time !== null && landAt(c, time as TimePoint))
  const location = new Map(locations.map((l) => [l.id, l]))
  const placeCard = new Map<string, LandCard>()
  const sagaPlaceCard = new Map<string, LandCard>()
  const cardPlace = new Map<string, string>()
  const cardsAt = new Map<string, LandCard[]>()
  const cardsOf = new Map<string, LandCard[]>()
  for (const c of LAND_CARDS) {
    if (!shownCard(c)) continue
    const d = c.depicts
    const place = d.type === 'location' ? location.get(d.id) : undefined
    if (place && same(place, c)) {
      // 사가에 매인 것은 장소의 카드를 갈아 치우지 않고 따로 (2016 의 오란리프 패널은 Oran-Rief, the Vastwood 와 Ruins of Oran-Rief 둘 다)
      ;(c.saga === undefined ? placeCard : sagaPlaceCard).set(place.id, c)
      cardPlace.set(c.id, place.id)
    } else if (d.type === 'location') cardsAt.set(d.id, [...(cardsAt.get(d.id) ?? []), c])
    else cardsOf.set(d.id, [...(cardsOf.get(d.id) ?? []), c])
  }
  const onMap = (l: Location) => l.placement !== 'unplaced' || Boolean(placeCard.get(l.id)?.at)
  const placesOf = new Map<string, Location[]>()
  for (const l of locations) if (l.continentId && onMap(l)) placesOf.set(l.continentId, [...(placesOf.get(l.continentId) ?? []), l])
  for (const list of placesOf.values()) list.sort((a, b) => b.prominence - a.prominence || a.name.localeCompare(b.name))
  return {
    location,
    continent: new Map(continents.map((c) => [c.id, c])),
    card: new Map(LAND_CARDS.filter(shownCard).map((c) => [c.id, c])),
    placeCard,
    cardPlace,
    sagaPlaceCard,
    cardsAt,
    placesOf,
    cardsOf,
  }
}
