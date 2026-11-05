import { pointInRing } from '../map/geometry'
import { LAND_CARDS, type LandCard } from './cards'
import { CHILD_MAPS } from './childMaps'
import { continents as continentData } from './continents'
import { locations as locationData } from './locations'
import { faceIsPlace, landFaceProblems, type LandFaceEntry } from './landFace'
import { LAND_FACES } from './landFaces'
import { levelOf } from './sagas'
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
export { LAND_FACES } from './landFaces'
export { faceBinding, type LandFaceEntry } from './landFace'
// 페이즈 카드 데이터(phase1.ts·phase2.ts·phase3.ts)는 따로 나뉜 조각(./phase)으로 필요할 때 불러온다 — 여기서는 모양만
export type { PhaseCard } from './phase1'
export { CHILD_MAPS, type ChildMap } from './childMaps'

export const locations: Location[] = locationData

// 지역 상세(자식 지도)마다 그 지역의 장소가 있어야 한다 — 이름과 패널이 그 장소의 것이다
// 장소는 지역 상세마다 하나 (장소 패널의 '가까이 보기'가 장소로 지역 상세를 찾는다). 더 깊은 지역 상세는 한 겹, 부모 뒤에, 부모 범위 안에
for (const [i, m] of CHILD_MAPS.entries()) {
  if (!locationData.some((l) => l.id === m.place)) throw new Error(`childMaps.ts: 지역 상세 '${m.id}' 의 장소 '${m.place}' 가 없다`)
  const twin = CHILD_MAPS.find((o) => o !== m && o.place === m.place)
  if (twin) throw new Error(`childMaps.ts: 지역 상세 '${m.id}' 와 '${twin.id}' 의 장소 '${m.place}' 가 같다 — 장소는 지역 상세마다 하나`)
  if (m.parent === undefined) continue
  const p = CHILD_MAPS.find((o) => o.id === m.parent)
  if (!p) throw new Error(`childMaps.ts: 지역 상세 '${m.id}' 의 부모 '${m.parent}' 가 없다`)
  if (p.parent !== undefined) throw new Error(`childMaps.ts: 지역 상세 '${m.id}' 의 부모 '${p.id}' 도 부모가 있다 — 한 겹만`)
  if (CHILD_MAPS.indexOf(p) > i) throw new Error(`childMaps.ts: 지역 상세 '${m.id}' 를 부모 '${p.id}' 뒤에 둔다`)
  const b = m.bounds
  const pb = p.bounds
  if (b.x0 < pb.x0 || b.y0 < pb.y0 || b.x1 > pb.x1 || b.y1 > pb.y1) throw new Error(`childMaps.ts: 지역 상세 '${m.id}' 의 범위가 부모 '${p.id}' 의 범위 밖으로 나간다`)
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
/**
 * 사가에 매인, 장소와 하나인 카드 (Ruins of Oran-Rief, Sea Gate Wreckage) — 장소는 늘 보이니 표시를 따로 두지 않고, 그 사가의 그 페이즈를 켰을 때만
 * 장소 패널에 실린다 (페이즈 카드의 place 와 같다). 장소 id → 카드
 */
export const sagaPlaceCards = new Map<string, LandCard>()
/** 사가에 매인 대지 카드가 처음 나오는 페이즈 (이어 센 번호) — 늘 나오는 카드는 undefined. 그 사가의 이 페이즈부터 그 사가의 끝까지 나온다 */
export const landPhase = (c: Pick<LandCard, 'saga' | 'sagaPhase'>) => (c.saga === undefined ? undefined : levelOf(c.saga, c.sagaPhase ?? 1))
/** 장소와 하나인 카드 id → 그 장소 id */
export const cardPlaceIds = new Map<string, string>()

// 카드가 가리키는 장소·대륙이 실제로 있는지, 지도 표시가 하나씩인지 — 데이터를 고칠 때 바로 드러나게
for (const c of LAND_CARDS) {
  const d = c.depicts
  const place = d.type === 'location' ? locationData.find((l) => l.id === d.id) : undefined
  const ok = d.type === 'location' ? place : continentData.some((x) => x.id === d.id)
  if (!ok) throw new Error(`cards.ts: ${c.name} 이(가) 가리키는 ${d.type} '${d.id}' 가 없다`)
  const same = place && [place.name, ...(place.aliases ?? [])].includes(c.name) ? place : undefined
  // 두 면이 모두 대지인 카드(back)는 카드 하나·표시 하나다 — 둘째 면이 어느 장소의 이름이면 그 장소가 두 번 나오니 막는다 (그런 카드가 생기면 규칙을 먼저 정한다)
  if (c.back) {
    const twin = locationData.find((l) => [l.name, ...(l.aliases ?? [])].includes(c.back!.name))
    if (twin) throw new Error(`cards.ts: ${c.name} // ${c.back.name} — 둘째 면 이름이 장소 '${twin.id}' 의 이름·별칭이다`)
    if (!c.flavor && c.back.flavor) throw new Error(`cards.ts: ${c.name} — 둘째 면에 플레이버가 있으면 앞면 플레이버도 flavor 에 적는다`)
  }
  if (c.flavor && !c.back) throw new Error(`cards.ts: ${c.name} — flavor 는 양면 카드(back)에만 단다 (한 면 카드의 플레이버는 basis 에 인용한다)`)
  // 사가에 매인 카드는 그 사가의 그 페이즈를 켰을 때만 나오니, 헤더에서 켤 수 있는 페이즈여야 한다
  if (c.sagaPhase !== undefined && c.saga === undefined) throw new Error(`cards.ts: ${c.name} — sagaPhase 는 saga 와 함께 단다`)
  if (c.saga !== undefined && !landPhase(c)) throw new Error(`cards.ts: ${c.name} 의 사가 ${c.saga} 페이즈 ${c.sagaPhase ?? 1} 이 sagas.ts 에 없다`)
  // 자리가 없는 장소와 하나인 카드는 그 표시가 곧 장소의 표시라 사가에 매일 수 없다 (장소는 늘 보인다)
  if (same && c.saga !== undefined && !isPlaced(same)) throw new Error(`cards.ts: ${c.name} — 자리가 없는 장소 '${same.id}' 의 표시가 되는 카드는 saga 를 달지 않는다`)
  if (same) {
    const into = c.saga === undefined ? placeCards : sagaPlaceCards
    if (into.has(same.id)) throw new Error(`cards.ts: '${same.id}' 와 하나인 ${c.saga === undefined ? '' : '사가 '}카드가 둘이다`)
    into.set(same.id, c)
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

/**
 * 양면 카드(MDFC)의 대지 면 (src/data/landFace.ts) — 앞면은 페이즈 그림이고, 대지 면은 이어진 장소의 패널에 실린다. 지도에 표시를 따로 두지 않는다.
 * 대지 면이 곧 그 장소면(이름이 장소의 이름이나 별칭) 면 그림과 함께(facePlaceCards), 아니면 '카드' 줄에 링크로(faceLinks). 장소 id → 대지 면 (카드 차례).
 * 실리는 보기는 대지 카드와 같은 셈이다 — sagaBound 면 그 카드의 사가·페이즈(시점별 보기는 landAt), 아니면 늘 (faceBinding)
 */
export const facePlaceCards = new Map<string, LandFaceEntry[]>()
export const faceLinks = new Map<string, LandFaceEntry[]>()
{
  const problems = landFaceProblems(LAND_FACES, { locations: locationData, landCards: LAND_CARDS })
  if (problems.length) throw new Error(problems.map((p) => `landFace: ${p}`).join('\n'))
  for (const f of LAND_FACES) {
    const place = locationData.find((l) => l.id === f.depicts.id)
    const into = faceIsPlace(f, place) ? facePlaceCards : faceLinks
    into.set(f.depicts.id, [...(into.get(f.depicts.id) ?? []), f])
  }
}
/** 장소를 지도에서 가리키는 지점 — 장소의 자리, 자리가 없으면 그 장소와 하나인 카드의 표시 */
export function placeMark(l: Location): Point | null {
  return isPlaced(l) ? l.position : placeCards.get(l.id)?.at ?? null
}

// 범례 글(페이즈·시점·지도 시점) — 영어 사전(base)이 Node 에서 모을 수 있게 따로 둔다 (index.ts 는 Node 에서 바로 읽히지 않는다)
export { ERA_NOTE, PHASE1_NOTE, PHASE2_NOTE, PHASE3_NOTE, PHASE4_NOTE, PHASE5_NOTE, PHASE6_NOTE, PHASE7_NOTE, PHASE8_NOTE, TIME_NOTES } from './notes'

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
