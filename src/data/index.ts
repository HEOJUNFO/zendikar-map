import { pointInRing } from '../map/geometry'
import { LAND_CARDS, type LandCard } from './cards'
import { continents as continentData } from './continents'
import { locations as locationData } from './locations'
import { PHASE1_CARDS, PHASE1_CHILD_MAPS } from './phase1'
import { isPlaced, type Continent, type HedronCluster, type Location, type Point, type TerrainArea } from './types'

export { hasPin, LAND_CARDS, type LandCard, type PinnedCard } from './cards'
export { PHASE1_CARDS, PHASE1_CHILD_MAPS, type ChildMap, type PhaseCard } from './phase1'

export const locations: Location[] = locationData

// 이 지도가 고른 자리(estimate)는 고른 까닭을 패널에 '추정'으로 보인다 — 까닭 없이 찍지 않는다
for (const l of locationData) {
  if (l.placement === 'estimate' && !l.estimate) throw new Error(`locations.ts: ${l.name} — estimate 자리는 고른 까닭(estimate)을 적는다`)
}
export const continents: Continent[] = continentData

/**
 * 장소와 하나인 카드 — 카드 이름이 이어진 장소의 이름이나 별칭과 같다 (Eye of Ugin, Khalni Garden = Ora Ondar 등).
 * 이런 카드는 지도·검색·대륙 목록에 따로 나오지 않고, 장소 패널에 실린다. 장소 id → 카드
 */
export const placeCards = new Map<string, LandCard>()
/** 장소와 하나인 카드 id → 그 장소 id */
export const cardPlaceIds = new Map<string, string>()

// 카드가 가리키는 장소·대륙이 실제로 있는지, 지도 표시가 하나씩인지 — 데이터를 고칠 때 바로 드러나게
for (const c of LAND_CARDS) {
  const d = c.depicts
  const place = d.type === 'location' ? locationData.find((l) => l.id === d.id) : undefined
  const ok = d.type === 'location' ? place : continentData.some((x) => x.id === d.id)
  if (!ok) throw new Error(`cards.ts: ${c.name} 이(가) 가리키는 ${d.type} '${d.id}' 가 없다`)
  const same = place && [place.name, ...(place.aliases ?? [])].includes(c.name) ? place : undefined
  if (same) {
    if (placeCards.has(same.id)) throw new Error(`cards.ts: '${same.id}' 와 하나인 카드가 둘이다`)
    placeCards.set(same.id, c)
    cardPlaceIds.set(c.id, same.id)
  }
  // 지도에 있는 장소와 하나인 카드는 장소 표시를 같이 쓴다 — 나머지는 카드 표시 자리가 있어야 한다
  const usesPlaceMark = Boolean(same && isPlaced(same))
  if (usesPlaceMark === Boolean(c.at)) {
    throw new Error(`cards.ts: ${c.name} — ${usesPlaceMark ? `장소 '${same!.id}' 의 표시를 쓰니 at 를 지운다` : 'at 가 없다'}`)
  }
  // 자리가 없는 장소와 하나인 카드는 그 표시가 곧 장소의 표시다 — 자리를 고른 까닭이 장소 패널에 '추정'으로 나와야 한다
  if (same && !isPlaced(same) && !c.estimate) {
    throw new Error(`cards.ts: ${c.name} — 자리가 없는 장소 '${same.id}' 의 표시가 되니 자리를 고른 까닭을 estimate 에 적는다`)
  }
}

// 페이즈1 카드도 가리키는 곳이 있어야 하고, 카드 패널 주소(#card/카드id)가 대지 카드와 겹치면 안 된다
for (const c of PHASE1_CARDS) {
  const d = c.depicts
  const ok = d.type === 'location' ? locationData.some((l) => l.id === d.id) : continentData.some((x) => x.id === d.id)
  if (!ok) throw new Error(`phase1.ts: ${c.name} 이(가) 가리키는 ${d.type} '${d.id}' 가 없다`)
  if (LAND_CARDS.some((l) => l.id === c.id)) throw new Error(`phase1.ts: '${c.id}' 가 대지 카드 id 와 겹친다`)
  const child = c.childMap ? PHASE1_CHILD_MAPS.find((m) => m.id === c.childMap) : undefined
  if (c.childMap && !child) throw new Error(`phase1.ts: ${c.name} 의 자식 지도 '${c.childMap}' 가 없다`)
  if (child) {
    const b = child.bounds
    if (c.at[0] < b.x0 || c.at[0] > b.x1 || c.at[1] < b.y0 || c.at[1] > b.y1) throw new Error(`phase1.ts: ${c.name} 의 자리가 자식 지도 '${child.id}' 범위 밖이다`)
  }
}
for (const m of PHASE1_CHILD_MAPS) {
  if (!locationData.some((l) => l.id === m.place)) throw new Error(`phase1.ts: 자식 지도 '${m.id}' 의 장소 '${m.place}' 가 없다`)
}

/** 장소를 지도에서 가리키는 지점 — 장소의 자리, 자리가 없으면 그 장소와 하나인 카드의 표시 */
export function placeMark(l: Location): Point | null {
  return isPlaced(l) ? l.position : placeCards.get(l.id)?.at ?? null
}

/** 페이즈1 그림의 시점 — 지도 바탕과 다를 수 있다 */
export const PHASE1_NOTE =
  '페이즈1은 Zendikar(2009) 세트의 미식 레어 카드가 그린 대상을 그 카드에 맞는 시기의 자리에 그립니다. 지도 바탕(Zendikar Rising 무렵)과 시기가 다를 수 있고, 그 뒤의 일은 카드 패널에 적었습니다. 사람만 한 대상은 그 지역을 따로 그린 지역 지도에 있습니다. 이름 뒤에 접힌 지도 아이콘이 붙은 곳(Eye of Ugin, Malakir, Tangled Vales, Makindi Trenches, Jwar Isle)을 누르면 패널에서 지역 지도를 열 수 있습니다.'

/** 지도가 그리는 시점 — docs/lore.md '시점' */
export const ERA_NOTE =
  'Zendikar Rising(2020) 무렵의 젠디카르입니다. 그 전후(엘드라지 전쟁, 2023년 피렉시아 침공)의 변화는 장소마다 적었습니다.'

/** 헤드론 — 모습과 자리는 설정에 근거가 있는 것만 (docs/lore.md '헤드론') */
export const hedrons: HedronCluster[] = [
  {
    id: 'tazeem-sky',
    at: [1226, 1063],
    count: 26,
    spread: 215,
    within: 'tazeem',
    inset: 60,
    note: 'Tazeem 하늘을 메운 헤드론 잔해 지대 — 끝없이 돌지만 대륙 경계를 넘지 못하고, 해변(Calcite Flats) 위로는 나가지 않는다 (PG: Tazeem and Merfolk, 2009; The Art of Magic: Zendikar, 2016)',
  },
  {
    id: 'sky-rock',
    at: [1334, 1062],
    count: 1,
    spread: 0,
    scale: 2.6,
    note: 'Sky Rock — Sea Gate 남쪽, 에메리아 아래쪽 가장자리에 떠 있는 거대한 헤드론 (Slaughter at the Refuge; The Survivors of Sky Rock, 2015; Zendikar Resurgent, 2016)',
  },
  {
    id: 'agadeem-graveyard',
    at: [339, 1526],
    count: 12,
    spread: 40,
    within: 'agadeem',
    grounded: true,
    scale: 0.75,
    note: 'Agadeem 사바나에 쓰러져 반쯤 묻힌 헤드론 묘지 (PG: Ondu, 2009)',
  },
  {
    id: 'akoum-eye',
    at: [1955, 418],
    count: 6,
    spread: 48,
    within: 'akoum',
    inset: 20,
    note: 'Eye of Ugin 둘레 — 엘드라지 타이탄은 Akoum 고지대에서 헤드론 그물에 둘러싸여 잠들었고(The Lithomancer, 2014), 2010년 타이탄들이 풀려난 뒤에는 무너진 석실 둘레에 쓰러지거나 떠도는 헤드론이 남았다 (The Art of Magic: Zendikar, 2016; Stone and Blood, 2016)',
  },
]

/** 이름은 없지만 설정에 근거가 있는 지형 */
export const terrainAreas: TerrainArea[] = []

/** 육지 덩어리 위의 한 점이 어느 대륙인지 — 덩어리를 나눠 쓰는 대륙은 area 다각형으로 가른다 */
export function continentAt(landmass: string, x: number, y: number): string | null {
  const owners = continentData.filter((c) => c.landmass === landmass)
  // 딸린 섬 (온두의 Agadeem·Beyeen·Jwar 등)
  if (owners.length === 0) return continentData.find((c) => c.islands?.includes(landmass))?.id ?? null
  if (owners.length === 1) return owners[0].id
  return (owners.find((c) => c.area && pointInRing(x, y, c.area)) ?? owners[0]).id
}
