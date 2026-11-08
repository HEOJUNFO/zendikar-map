// 패널의 글 — 장소·대륙·대지 카드 원본 (설명·근거·출처가 길어 패널을 처음 열 때 받는 조각이다, docs/pixel-plan.md '피할 것').
// src/data/index.ts 는 부르지 않는다 (검사가 돌고 바탕 지형·지역 상세까지 끌려온다) — 카드와 장소를 잇는 셈만 그 파일과 같게 옮겼다.
// 사가에 매인 대지 카드와 대지 면은 그 카드가 나오는 시점에만 (S6 — timeline.ts 의 landAt). 양면 카드의 대지 면·바탕 지형은 S22 — src/data/index.ts 의 facePlaceCards·faceLinks·landscapeOfPlace 와 같은 셈
import { LAND_CARDS, type LandCard } from '../../data/cards'
import { CHILD_MAPS } from '../../data/childMaps'
import { continents } from '../../data/continents'
import { isStorySet, productName } from '../../data/extraSets'
import { faceBeyondSaga, faceBinding, faceIsPlace, type LandFaceEntry } from '../../data/landFace'
import { LAND_FACES } from '../../data/landFaces'
import { locations } from '../../data/locations'
import landscapePanel from 'virtual:pixel-landscape-panel'
import { landAt, SHOWN_TIMES, type TimePoint } from '../../data/timeline'
import { isPlaced, type Continent, type Location } from '../../data/types'

/** 패널의 바탕 지형 하나 (지금 지도의 LandscapeFeature·PeriodFeature 를 패널에 쓰는 몫만) — period 면 그 무렵에만 그린 것 */
export interface PanelFeature {
  id: string
  label?: string
  kind: string
  estimate?: string
  location?: string
  alsoAt?: readonly string[]
  /** 한 점 기호의 자리 (같은 이름의 기호를 곳으로 셀 때) */
  at?: readonly [number, number]
  continentId: string
  period?: boolean
}

/** 시점별 바탕의 패널 몫 (scripts/pixel/periods.mjs 의 panel — virtual:pixel-period-features) */
export interface PeriodPanelSlim {
  features: Omit<PanelFeature, 'period' | 'at'>[]
  hiddenLines: string[]
}

const LANDSCAPE: PanelFeature[] = landscapePanel

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
  /** 지역 상세의 장소 → 그 지역 상세 (S9 — 패널의 '가까이 보기'와 해석 안내) */
  childAt: ReadonlyMap<string, { id: string; note?: string }>
  /** 양면 카드의 대지 면 — 면이 곧 그 장소면 면 그림과 함께(facePlace), 아니면 '카드' 줄에 링크로(faceLinks). 그 시점에 실리는 것만 (S22) */
  facePlace: ReadonlyMap<string, LandFaceEntry[]>
  faceLinks: ReadonlyMap<string, LandFaceEntry[]>
  /** 바탕 지형 — 이 장소의 것(location), 이 대륙 파일의 것 (S22 — 그 무렵 몫은 패널이 시점의 것을 더한다) */
  landscapeOfPlace: (id: string) => PanelFeature[]
  landscapeOfContinent: (id: string) => PanelFeature[]
  /** 양면 카드의 대지 면 (카드 id → 면) — 면 목록은 이 늦은 조각에만 둔다 (S22 검토: Panel.tsx 가 LAND_FACES 를 바로 읽어 첫 조각에 phase6 의 면 목록이 들었다) */
  faceById: (id: string) => LandFaceEntry | undefined
  /** 사가에 매인 면이 장소 패널에 실리는 해 (매이지 않은 면은 null — 지금 지도의 cardFace) */
  faceYears: (face: LandFaceEntry) => string[] | null
  /** 그 면이 사가 밖의 그 시점에도 실리는가 (지금 지도의 faceBeyondSaga) */
  faceBeyond: (face: LandFaceEntry, time: number) => boolean
  /** 카드 줄의 세트 — 이야기 세트 밖의 제품은 제품 이름, 이야기 세트는 대문자 코드 (지금 지도의 setLabel) */
  setLabel: (set: string) => string
  productName: (set: string) => string
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
    } else if (d.type === 'location') {
      cardsAt.set(d.id, [...(cardsAt.get(d.id) ?? []), c])
      // 자리를 모르는 장소에 이은 카드도 그 대륙의 목록에 (지금 지도의 continentCards — S22: Eldrazi Temple 이 타짐 목록에서 빠졌다)
      if (place?.continentId && !isPlaced(place)) cardsOf.set(place.continentId, [...(cardsOf.get(place.continentId) ?? []), c])
    } else cardsOf.set(d.id, [...(cardsOf.get(d.id) ?? []), c])
  }
  for (const list of cardsOf.values()) list.sort((a, b) => a.name.localeCompare(b.name))
  const facePlace = new Map<string, LandFaceEntry[]>()
  const faceLinks = new Map<string, LandFaceEntry[]>()
  for (const f of LAND_FACES) {
    const b = faceBinding(f)
    if (f.sagaBound && !(time !== null && landAt(b, time as TimePoint))) continue
    const into = faceIsPlace(f, location.get(f.depicts.id)) ? facePlace : faceLinks
    into.set(f.depicts.id, [...(into.get(f.depicts.id) ?? []), f])
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
    childAt: new Map(CHILD_MAPS.map((m) => [m.place, { id: m.id, ...(m.note ? { note: m.note } : {}) }])),
    facePlace,
    faceLinks,
    landscapeOfPlace: (id) => LANDSCAPE.filter((f) => f.location === id),
    landscapeOfContinent: (id) => LANDSCAPE.filter((f) => f.continentId === id),
    faceById: (id) => LAND_FACES.find((f) => f.id === id),
    faceYears: (face) => (face.sagaBound ? SHOWN_TIMES.filter((x) => landAt(faceBinding(face), x.t)).map((x) => x.button) : null),
    faceBeyond: (face, t) => faceBeyondSaga(face, t as TimePoint),
    setLabel: (set) => (isStorySet(set) ? set.toUpperCase() : productName(set)),
    productName,
  }
}
