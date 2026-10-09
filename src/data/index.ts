import { pointInRing } from '../map/geometry'
import { LAND_CARDS, type LandCard } from './cards'
import { CHILD_MAPS } from './childMaps'
import { continents as continentData } from './continents'
import { locations as locationData } from './locations'
import { landscape as akoum } from './landscape/akoum'
import { landscape as balaGed } from './landscape/bala-ged'
import { landscape as guulDraz } from './landscape/guul-draz'
import { landscape as murasa } from './landscape/murasa'
import { landscape as ondu } from './landscape/ondu'
import { landscape as sejiri } from './landscape/sejiri'
import { landscape as tazeem } from './landscape/tazeem'
import {
  isPlaced,
  type Continent,
  type ContinentId,
  type HedronCluster,
  type Landscape,
  type LandmarkGlyph,
  type Location,
  type Point,
  type River,
  type SeaMark,
  type TerrainArea,
  type TerrainLine,
} from './types'

export { hasPin, LAND_CARDS, type LandCard, type PinnedCard } from './cards'
// 페이즈 카드 데이터(phase1.ts·phase2.ts)는 따로 나뉜 조각(./phase)으로 필요할 때 불러온다 — 여기서는 모양만
export type { PhaseCard } from './phase1'
export { CHILD_MAPS, type ChildMap } from './childMaps'

export const locations: Location[] = locationData

// 지역 상세(자식 지도)마다 그 지역의 장소가 있어야 한다 — 이름과 패널이 그 장소의 것이다
for (const m of CHILD_MAPS) {
  if (!locationData.some((l) => l.id === m.place)) throw new Error(`childMaps.ts: 지역 상세 '${m.id}' 의 장소 '${m.place}' 가 없다`)
}

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

/** 장소를 지도에서 가리키는 지점 — 장소의 자리, 자리가 없으면 그 장소와 하나인 카드의 표시 */
export function placeMark(l: Location): Point | null {
  return isPlaced(l) ? l.position : placeCards.get(l.id)?.at ?? null
}

/** 페이즈1 그림의 시점 — 지도 바탕과 다를 수 있다 */
export const PHASE1_NOTE =
  '페이즈1은 Zendikar(2009) 세트의 미식 레어·레어·언커먼·커먼 카드가 그린 대상을 그 카드에 맞는 시기의 자리에 그립니다. 지도 바탕(Zendikar Rising 무렵)과 시기가 다를 수 있고, 그 뒤의 일은 카드 패널에 적었습니다. 사람만 한 대상은 세계 지도를 깊이 확대하면 나오는 지역 상세 안에 있고, 홀로 떨어진 작은 대상도 그 자리를 확대하면 보입니다.'

/** 페이즈2 그림의 시점 — 페이즈1 그림에 WWK 카드의 대상을 더한다 */
export const PHASE2_NOTE =
  '페이즈2는 페이즈1의 그림에 Worldwake(2010) 세트의 미식 레어·레어 카드가 그린 대상을 더해, 그 카드에 맞는 시기의 자리에 그립니다. 이름이 곧 지도의 장소인 카드(Seer\'s Sundial)는 그 장소 패널에 실립니다. 지도 바탕(Zendikar Rising 무렵)과 시기가 다를 수 있고, 그 뒤의 일은 카드 패널에 적었습니다. 사람만 한 대상은 세계 지도를 깊이 확대하면 나오는 지역 상세 안에 있고, 홀로 떨어진 작은 대상도 그 자리를 확대하면 보입니다.'

/** 지도가 그리는 시점 — docs/lore.md '시점' */
export const ERA_NOTE =
  'Zendikar Rising(2020) 무렵의 젠디카르입니다. 그 전후(엘드라지 전쟁, 2023년 피렉시아 침공)의 변화는 장소마다 적었습니다.'

/** 헤드론 — 모습과 자리는 설정에 근거가 있는 것만 (docs/lore.md '헤드론') */
export const hedrons: HedronCluster[] = [
  {
    id: 'tazeem-sky',
    at: [984.2, 652.6],
    count: 26,
    spread: 258,
    within: 'tazeem',
    inset: 72,
    note: 'Tazeem 하늘을 메운 헤드론 잔해 지대 — 끝없이 돌지만 대륙 경계를 넘지 못하고, 해변(Calcite Flats) 위로는 나가지 않는다 (PG: Tazeem and Merfolk, 2009; The Art of Magic: Zendikar, 2016)',
  },
  {
    id: 'sky-rock',
    at: [1113.8, 651.4],
    count: 1,
    spread: 0,
    scale: 2.6,
    note: 'Sky Rock — Sea Gate 남쪽, 에메리아 아래쪽 가장자리에 떠 있는 거대한 헤드론 (Slaughter at the Refuge; The Survivors of Sky Rock, 2015; Zendikar Resurgent, 2016)',
  },
  {
    id: 'agadeem-graveyard',
    at: [387.8, 1607.2],
    count: 12,
    spread: 48,
    within: 'agadeem',
    grounded: true,
    scale: 0.75,
    note: 'Agadeem 사바나에 쓰러져 반쯤 묻힌 헤드론 묘지 (PG: Ondu, 2009)',
  },
  {
    id: 'akoum-eye',
    at: [1918, 358.6],
    count: 6,
    spread: 57.6,
    within: 'akoum',
    inset: 24,
    note: 'Eye of Ugin 둘레 — 엘드라지 타이탄은 Akoum 고지대에서 헤드론 그물에 둘러싸여 잠들었고(The Lithomancer, 2014), 2010년 타이탄들이 풀려난 뒤에는 무너진 석실 둘레에 쓰러지거나 떠도는 헤드론이 남았다 (The Art of Magic: Zendikar, 2016; Stone and Blood, 2016)',
  },
  {
    id: 'ikiral',
    at: [1397.4, 49.2],
    count: 1,
    spread: 0,
    within: 'sejiri',
    grounded: true,
    split: true,
    scale: 2,
    note: 'Ikiral — 얼음 툰드라에 옆으로 쓰러져 반쯤 묻히고 한가운데가 쪼개진 거대 헤드론, 그 틈에 정착지가 있다 (\'The huge hedron lies awkwardly on its side, partly sunken into the icy tundra, split down the middle\', PG: Murasa and Sejiri, 2010). 정착지 자리(팬 지도)에 하나만 둔다. 엘드라지 전쟁(2015) 이후 상태는 공식 언급이 없다',
  },
]

/** 바탕 지형 — 대륙마다 src/data/landscape/<대륙>.ts (docs/lore.md '바탕 지형') */
const landscapeFiles: [ContinentId, Landscape][] = [
  ['sejiri', sejiri],
  ['akoum', akoum],
  ['tazeem', tazeem],
  ['murasa', murasa],
  ['ondu', ondu],
  ['guul-draz', guulDraz],
  ['bala-ged', balaGed],
]
const landscapes = landscapeFiles.map(([, l]) => l)
export const terrainAreas: TerrainArea[] = landscapes.flatMap((l) => l.areas ?? [])
export const rivers: River[] = landscapes.flatMap((l) => l.rivers ?? [])
export const terrainLines: TerrainLine[] = landscapes.flatMap((l) => l.lines ?? [])
export const landmarkGlyphs: LandmarkGlyph[] = landscapes.flatMap((l) => l.glyphs ?? [])
export const seaMarks: SeaMark[] = landscapes.flatMap((l) => l.sea ?? [])

// 바탕 지형도 근거 없이 그리지 않는다 — 데이터를 고칠 때 바로 드러나게
{
  const ids = new Set<string>()
  for (const f of [...terrainAreas, ...rivers, ...terrainLines, ...landmarkGlyphs, ...seaMarks]) {
    if (ids.has(f.id)) throw new Error(`landscape: id '${f.id}' 가 둘이다`)
    ids.add(f.id)
    if (!f.basis.trim()) throw new Error(`landscape: '${f.id}' 에 공식 근거(basis)가 없다`)
    if (f.location && !locationData.some((l) => l.id === f.location)) throw new Error(`landscape: '${f.id}' 의 장소 '${f.location}' 가 없다`)
    const shaped = 'ring' in f || 'at' in f || 'course' in f || 'line' in f
    if (!shaped) throw new Error(`landscape: '${f.id}' 에 자리가 없다`)
  }
  for (const a of [...terrainAreas, ...seaMarks]) {
    if (!a.ring && !(a.at && a.extent)) throw new Error(`landscape: '${a.id}' 는 ring 이나 at+extent 가 있어야 한다`)
  }
  for (const r of rivers) {
    if (r.course.length < 2) throw new Error(`landscape: 강 '${r.id}' 의 물길이 짧다`)
    if (r.tributaryOf && !rivers.some((m) => m.id === r.tributaryOf)) throw new Error(`landscape: 지류 '${r.id}' 의 본류 '${r.tributaryOf}' 가 없다`)
  }
}

/** 바탕 지형 하나 — 패널에 싣는다. kind 는 영역·선·기호·바다 표시의 kind, 강은 'river' */
export interface LandscapeFeature {
  feature: TerrainArea | River | TerrainLine | LandmarkGlyph | SeaMark
  kind: TerrainArea['kind'] | TerrainLine['kind'] | LandmarkGlyph['kind'] | SeaMark['kind'] | 'river'
  /** 데이터가 실린 대륙 파일 */
  continentId: ContinentId
}

const landscapeFeatures: LandscapeFeature[] = landscapeFiles.flatMap(([continentId, l]) => [
  ...(l.areas ?? []).map((feature) => ({ feature, kind: feature.kind, continentId })),
  ...(l.rivers ?? []).map((feature) => ({ feature, kind: 'river' as const, continentId })),
  ...(l.lines ?? []).map((feature) => ({ feature, kind: feature.kind, continentId })),
  ...(l.glyphs ?? []).map((feature) => ({ feature, kind: feature.kind, continentId })),
  ...(l.sea ?? []).map((feature) => ({ feature, kind: feature.kind, continentId })),
])

/** 이 장소와 하나인 바탕 지형 (location 이 이 장소) — 장소 패널의 '지도에 그린 지형' */
export const landscapeOfPlace = (id: string): LandscapeFeature[] => landscapeFeatures.filter((f) => f.feature.location === id)

/** 이 대륙 파일의 바탕 지형 */
export const landscapeOfContinent = (id: string): LandscapeFeature[] => landscapeFeatures.filter((f) => f.continentId === id)

/** 육지 덩어리 위의 한 점이 어느 대륙인지 — 덩어리를 나눠 쓰는 대륙은 area 다각형으로 가른다 */
export function continentAt(landmass: string, x: number, y: number): string | null {
  const owners = continentData.filter((c) => c.landmass === landmass)
  // 딸린 섬 (온두의 Agadeem·Beyeen·Jwar 등)
  if (owners.length === 0) return continentData.find((c) => c.islands?.includes(landmass))?.id ?? null
  if (owners.length === 1) return owners[0].id
  return (owners.find((c) => c.area && pointInRing(x, y, c.area)) ?? owners[0]).id
}
