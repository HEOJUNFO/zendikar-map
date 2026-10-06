import { pointInRing } from '../map/geometry'
import { ZEN_LANDS } from './cards'
import { continents as continentData } from './continents'
import { locations as locationData } from './locations'
import type { CardRef, Continent, HedronCluster, Location, TerrainArea } from './types'

/** 카드는 cards.ts 한곳에서 관리하고, 장소·대륙에는 여기서 이어 붙인다 */
function cardsOf(type: 'location' | 'continent', id: string): CardRef[] | undefined {
  const list = ZEN_LANDS.filter((c) => c.depicts?.type === type && c.depicts.id === id)
  return list.length > 0 ? list : undefined
}

export const locations: Location[] = locationData.map((l) => ({ ...l, cards: cardsOf('location', l.id) }))
export const continents: Continent[] = continentData.map((c) => ({ ...c, cards: cardsOf('continent', c.id) }))

// 카드가 가리키는 장소·대륙이 실제로 있는지 — 데이터를 고칠 때 바로 드러나게
for (const c of ZEN_LANDS) {
  const d = c.depicts
  if (!d) continue
  const ok = d.type === 'location' ? locationData.some((l) => l.id === d.id) : continentData.some((x) => x.id === d.id)
  if (!ok) throw new Error(`cards.ts: ${c.name} 이(가) 가리키는 ${d.type} '${d.id}' 가 없다`)
}

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
    note: '엘드라지 타이탄은 Akoum 고지대에서 헤드론 그물에 둘러싸여 잠들었다 (The Lithomancer, 2014; Revelation at the Eye, 2015)',
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
