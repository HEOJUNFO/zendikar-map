import { pointInRing } from '../map/geometry'
import { LAND_CARDS, type LandCard } from './cards'
import { CHILD_MAPS } from './childMaps'
import { continents as continentData } from './continents'
import { locations as locationData } from './locations'
import { faceIsPlace, landFaceProblems, type LandFaceEntry } from './landFace'
import { LAND_FACES } from './landFaces'
import { levelOf } from './sagas'
import type { TimePoint } from './timeline'
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

/** 페이즈1 그림의 시점 — 지도 바탕(Zendikar Rising 무렵)과 다른 그 무렵 모습은 페이즈 바탕(src/data/periods)이 그린다 */
export const PHASE1_NOTE =
  '사가1(엘드라지의 깨어남)의 페이즈1은 Zendikar(2009) 세트의 미식 레어·레어·언커먼·커먼 카드가 그린 대상을 그 카드에 맞는 시기의 자리에 그립니다. 지도 바탕은 Zendikar Rising 무렵 모습이지만, 이 무렵 모습이 공식 자료로 뚜렷이 달랐던 곳은 그 무렵 모습으로 그렸습니다 — 뒤엉킨 계곡의 가파른 언덕과 Umung 강의 계단 물길·폭포, 발라 게드와 굴 드라즈 사이의 늪, 아직 협곡이 없던 가시지대. 아직 없던 Khalni Heart 꽃은 표시하지 않았고, 아직 세우지 않은 산호투구 피난처(소라 수도)는 지역 상세에 그리지 않았으며, 아직 떠오르지 않은 하늘거주지는 무너진 잔해로 그렸습니다. 그 뒤의 일은 카드 패널에 적었습니다. 사람만 한 대상은 세계 지도를 깊이 확대하면 나오는 지역 상세 안에 있고, 홀로 떨어진 작은 대상도 그 자리를 확대하면 보입니다.'

/** 페이즈2 그림의 시점 — 페이즈1 그림에 WWK 카드의 대상을 더한다 */
export const PHASE2_NOTE =
  '사가1(엘드라지의 깨어남)의 페이즈2는 페이즈1의 그림에 Worldwake(2010) 세트의 미식 레어·레어·언커먼·커먼 카드가 그린 대상을 더해, 그 카드에 맞는 시기의 자리에 그립니다. 이름이 곧 지도의 장소인 카드(Seer\'s Sundial)는 그 장소 패널에 실립니다. 지도 바탕은 Zendikar Rising 무렵 모습이지만, 이 무렵 모습이 공식 자료로 뚜렷이 달랐던 곳은 그 무렵 모습으로 그렸습니다 — 뒤엉킨 계곡의 가파른 언덕과 Umung 강의 계단 물길·폭포, 발라 게드와 굴 드라즈 사이의 늪, 아직 협곡이 없던 가시지대. 아직 없던 Khalni Heart 꽃은 표시하지 않았고, 아직 세우지 않은 산호투구 피난처(소라 수도)는 지역 상세에 그리지 않았으며, 아직 떠오르지 않은 하늘거주지는 무너진 잔해로 그렸습니다. 그 뒤의 일은 카드 패널에 적었습니다. 사람만 한 대상은 세계 지도를 깊이 확대하면 나오는 지역 상세 안에 있고, 홀로 떨어진 작은 대상도 그 자리를 확대하면 보입니다.'

/** 페이즈3 그림의 시점 — 페이즈2 그림에 ROE 카드의 대상을 더한다 */
export const PHASE3_NOTE =
  '사가1(엘드라지의 깨어남)의 페이즈3은 페이즈2의 그림에 Rise of the Eldrazi(2010) 세트의 미식 레어·레어·언커먼·커먼 카드가 그린 대상을 더해, 그 카드에 맞는 시기(우진의 눈에서 엘드라지 거신들이 풀려난 무렵)의 자리에 그립니다. 지도 바탕은 Zendikar Rising 무렵 모습이지만, 이 무렵 모습이 공식 자료로 뚜렷이 달랐던 곳은 그 무렵 모습으로 그렸습니다 — 뒤엉킨 계곡의 가파른 언덕과 Umung 강의 계단 물길·폭포, 발라 게드와 굴 드라즈 사이의 늪. 아직 없던 Khalni Heart 꽃은 표시하지 않았고, 아직 세우지 않은 산호투구 피난처(소라 수도)는 지역 상세에 그리지 않았으며, 아직 떠오르지 않은 하늘거주지는 무너진 잔해로 그렸습니다. 그 뒤의 일은 카드 패널에 적었습니다. 사람만 한 대상은 세계 지도를 깊이 확대하면 나오는 지역 상세 안에 있고, 홀로 떨어진 작은 대상도 그 자리를 확대하면 보입니다.'

/** 사가2 페이즈1(이어 센 번호 4) 그림의 시점 — 사가1의 그림을 비우고 BFZ 무렵으로 */
export const PHASE4_NOTE =
  '사가2(젠디카르 전투)의 페이즈1은 사가1의 그림을 비우고 Battle for Zendikar(2015) 무렵, 풀려난 엘드라지가 젠디카르를 휩쓸던 때로 넘어갑니다. BFZ 카드 가운데 대지가 아닌 카드(미식 레어·레어·언커먼·커먼)가 그린 대상과 엘드라지와 이어진 BFZ 대지 카드(역병에 걸린 땅, 부화지, 동맹 야영지, 버림받은 신들의 성소, 우진의 성소, 진화하는 야생지)를 그 카드 무렵의 자리에 그립니다. 지도 바탕은 Zendikar Rising 무렵 모습이지만, 이 무렵 모습이 공식 자료로 뚜렷이 달랐던 곳은 그 무렵 모습으로 그렸습니다 — 발라 게드는 흰 가루 평원, 오란리프 숲에는 백악 자국, Lake of Dust 는 백악 흉터와 먼지 찬 강바닥, Merfolk Enclave 는 폐허로 그렸고, 아직 떠오르지 않은 하늘거주지는 무너진 잔해로 그렸습니다. 사람만 한 대상은 세계 지도를 깊이 확대하면 나오는 지역 상세 안에 있고, 홀로 떨어진 작은 대상도 그 자리를 확대하면 보입니다.'

/** 사가2 페이즈2(이어 센 번호 5) 그림의 시점 — 사가2 페이즈1 에 OGW 무렵을 더하고, 그 무렵 자리에 없던 페이즈1 대상(until: 1)은 뺀다 */
export const PHASE5_NOTE =
  '사가2(젠디카르 전투)의 페이즈2는 페이즈1의 그림에 Oath of the Gatewatch(2016) 무렵, 코질렉이 솟아오르고 관문수호대가 맹세해 할리마르 유역에서 울라모그·코질렉과 마지막으로 싸우던 때를 더합니다. OGW 의 대지가 아닌 미식 레어·레어·언커먼·커먼 카드가 그린 대상과 엘드라지와 이어진 OGW 대지 카드를 더해, 그 카드에 맞는 시기의 자리에 그립니다. 페이즈1의 그림 가운데 이 무렵 그 자리에 없었다고 공식 자료가 밝힌 것(헤드론 고리에서 풀려난 울라모그, 무너진 헤드론 고리, 바다 관문 앞의 기디온·오브 닉실리스·키오라, 다른 곳으로 떠난 니사·드라나·문다·노얀 다르, 니사가 쓰러뜨린 쌍둥이 엘드라지 Desolation Twin)과 그 곁의 주문 상징, 그리고 이 무렵 그 자리 자체가 사라진 것(물이 빠진 할리마르의 물 위·물가에 그린 Wave-Wing Elemental·Roilmage\'s Trick·Roil Spout·Exert Influence·Courier Griffin·Halimar Tidecaller·Coralhelm Guide, 죽은 오란리프 숲의 Oran-Rief Hydra·Giant Mantis·Snapping Gnarlid·Undergrowth Champion·Rot Shambler 와 나무 위 마을의 Oran-Rief Invoker, 해일에 삼켜진 해안 줄라포트의 Zulaport Cutthroat)은 이 페이즈에서 빠지고, 그 대상의 OGW 무렵 모습은 그것을 그린 OGW 카드가 있을 때만 그 자리에 따로 그립니다(지금은 니사). 그 인물을 말하는 주문(맹세 카드 등)은 인물을 다시 그리지 않고, 이 페이즈에 그린 인물 곁이나 그 장면의 자리에 작은 상징으로 둡니다. 근거가 대륙·지역까지만 닿는 대상은 엘드라지가 몰린 할리마르 둘레를 피해 그 무렵 다른 대륙의 전선과 피난처에 흩어 두었습니다. 지도 바탕은 Zendikar Rising 무렵 모습이지만, 이 무렵 모습이 공식 자료로 뚜렷이 달랐던 곳은 그 무렵 모습으로 그렸습니다 — 페이즈1 의 흰 가루 평원, Lake of Dust 의 백악 흉터와 먼지 찬 강바닥, 폐허가 된 Merfolk Enclave 에 더해, 할리마르는 물이 빠진 바닥과 남은 물, 오란리프는 죽은 숲, 바다 관문은 폐허로 그렸습니다. 해일에 쓸려 간 줄라포트는 지역 상세(Beyeen)에 옛 해안 마을의 잔해와 그 앞바다에 새로 띄운 마을로 그렸고, 아직 떠오르지 않은 하늘거주지는 무너진 잔해로 그렸습니다. 그 뒤의 일은 카드 패널에 적었습니다. 사람만 한 대상은 세계 지도를 깊이 확대하면 나오는 지역 상세 안에 있고, 홀로 떨어진 작은 대상도 그 자리를 확대하면 보입니다.'

/** 사가3 페이즈1(이어 센 번호 6) 그림의 시점 — 사가2의 그림을 비우고 ZNR 무렵으로. 지금은 미식 레어만 (레어·언커먼·커먼은 다음 단계) */
export const PHASE6_NOTE =
  '사가3(젠디카르 라이징)의 페이즈1은 사가2의 그림을 비우고 Zendikar Rising(2020) 무렵, 엘드라지가 사라진 뒤 일곱 하늘거주지가 다시 떠오르고 다시 세운 바다 관문을 중심으로 탐험대가 그 폐허를 찾아 나서던 때로 넘어갑니다. 지금은 ZNR 의 미식 레어 카드가 그린 대상을 그 카드 무렵의 자리에 그립니다. 앞면이 주문·생물이고 뒷면이 대지인 양면 카드는 앞면을 그림으로 그리고, 대지 면은 그 면이 가리키는 장소 패널에 싣습니다 — 하늘거주지가 떠오르고 바다 관문을 다시 세운 2020년의 일과 이어진 면(산산조각난 하늘거주지, 에메리아·다시 태어난 바다 관문)은 이 사가에서만, 나머지는 늘 싣습니다. 앞 사가의 대상은 공식 자료가 2020년에도 그 자리에 있었다고 밝힌 것만 다시 싣습니다(아직 없습니다). 지도 바탕은 Zendikar Rising 무렵 모습이지만, 노래하는 도시는 2020년 이야기의 끝에 먼지가 되기 전의 모습, 아직 서 있던 폐허로 그렸습니다. 사람만 한 대상은 세계 지도를 깊이 확대하면 나오는 지역 상세 안에 있고, 홀로 떨어진 작은 대상도 그 자리를 확대하면 보입니다.'

/**
 * 시점별 보기(?time=t, src/data/timeline.ts)의 범례 글 — 시점마다. 사가 보기의 PHASE_NOTES 와 나란히 둔다.
 * 그 시점의 카드와, 오래 그 자리에 사는 대상(다른 세트의 카드 — 공식 근거나 이 지도의 추정)을 그린다. 주문·장면은 그 순간에만
 */
const TIME_COMMON =
  '다른 세트의 카드라도 오래 그 자리에 사는 대상(종·주민·지형지물·오래된 존재)은 이 무렵에도 그 자리에 있었다고 공식 자료가 밝혔거나 이 지도가 그렇게 본 것을 함께 그렸습니다 — 이 지도의 판단으로 그린 것은 카드 패널에 \'추정\'으로 적었습니다. 주문·장면·전투의 순간, 그 장면 때문에 그 자리에 있던 인물, 엘드라지와 그 여파는 그 순간의 시점에만 그립니다. 사가 보기와 달리 앞 시점의 장면을 쌓지 않습니다.'
const TIME_TAIL = '사람만 한 대상은 세계 지도를 깊이 확대하면 나오는 지역 상세 안에 있고, 홀로 떨어진 작은 대상도 그 자리를 확대하면 보입니다.'
export const TIME_NOTES: Readonly<Record<TimePoint, string>> = {
  1: `시점 2009는 엘드라지가 깨어나기 전, Zendikar(2009)·Worldwake(2010 초) 무렵의 젠디카르입니다. 두 세트의 카드가 그린 대상을 그 무렵의 자리에 그립니다. ${TIME_COMMON} 지도 바탕은 Zendikar Rising 무렵 모습이지만, 이 무렵 모습이 공식 자료로 뚜렷이 달랐던 곳은 그 무렵 모습으로 그렸습니다 — 뒤엉킨 계곡의 가파른 언덕과 Umung 강의 계단 물길·폭포, 발라 게드와 굴 드라즈 사이의 늪, 아직 협곡이 없던 가시지대. 아직 없던 Khalni Heart 꽃은 표시하지 않았고, 아직 세우지 않은 산호투구 피난처(소라 수도)는 지역 상세에 그리지 않았으며, 아직 떠오르지 않은 하늘거주지는 무너진 잔해로 그렸습니다. ${TIME_TAIL}`,
  2: `시점 2010은 우진의 눈에서 엘드라지 거신 셋이 풀려난 Rise of the Eldrazi(2010) 무렵입니다. ROE 카드가 그린 대상을 그 무렵의 자리에 그리고, Zendikar·Worldwake 의 장면과 주문은 그리지 않습니다. ${TIME_COMMON} 지도 바탕은 Zendikar Rising 무렵 모습이지만, 이 무렵 모습이 공식 자료로 뚜렷이 달랐던 곳은 그 무렵 모습으로 그렸습니다 — 뒤엉킨 계곡의 가파른 언덕과 Umung 강의 계단 물길·폭포, 발라 게드와 굴 드라즈 사이의 늪. 아직 없던 Khalni Heart 꽃은 표시하지 않았고, 아직 세우지 않은 산호투구 피난처(소라 수도)는 지역 상세에 그리지 않았으며, 아직 떠오르지 않은 하늘거주지는 무너진 잔해로 그렸습니다. ${TIME_TAIL}`,
  3: `시점 2015는 풀려난 엘드라지가 젠디카르를 휩쓸던 Battle for Zendikar(2015) 무렵입니다. BFZ 카드가 그린 대상과 엘드라지와 이어진 BFZ 대지 카드를 그 무렵의 자리에 그립니다. ${TIME_COMMON} 지도 바탕은 Zendikar Rising 무렵 모습이지만, 이 무렵 모습이 공식 자료로 뚜렷이 달랐던 곳은 그 무렵 모습으로 그렸습니다 — 발라 게드는 흰 가루 평원, 오란리프 숲에는 백악 자국, Lake of Dust 는 백악 흉터와 먼지 찬 강바닥, Merfolk Enclave 는 폐허로 그렸고, 아직 떠오르지 않은 하늘거주지는 무너진 잔해로 그렸습니다. ${TIME_TAIL}`,
  4: `시점 2016은 코질렉이 솟아오르고 관문수호대가 할리마르 유역에서 울라목·코질렉과 마지막으로 싸우던 Oath of the Gatewatch(2016) 무렵입니다. OGW 카드가 그린 대상과 엘드라지와 이어진 BFZ·OGW 대지 카드를 그 무렵의 자리에 그리고, BFZ 의 장면과 주문은 그리지 않습니다. ${TIME_COMMON} 지도 바탕은 Zendikar Rising 무렵 모습이지만, 이 무렵 모습이 공식 자료로 뚜렷이 달랐던 곳은 그 무렵 모습으로 그렸습니다 — 흰 가루 평원이 된 발라 게드, Lake of Dust 의 백악 흉터와 먼지 찬 강바닥, 폐허가 된 Merfolk Enclave 에 더해, 할리마르는 물이 빠진 바닥과 남은 물, 오란리프는 죽은 숲, 바다 관문은 폐허로 그렸고, 아직 떠오르지 않은 하늘거주지는 무너진 잔해로 그렸습니다. ${TIME_TAIL}`,
  5: `시점 2020은 하늘거주지가 다시 떠오른 Zendikar Rising(2020) 무렵입니다. ZNR 카드가 그린 대상을 그 무렵의 자리에 그립니다(지금은 미식 레어만). 앞 시점의 대상을 이 시점에도 이어 그릴지는 아직 정하는 중입니다. 지도 바탕은 Zendikar Rising 무렵 모습이지만, 노래하는 도시는 2020년 이야기의 끝에 먼지가 되기 전의 모습, 아직 서 있던 폐허로 그렸습니다. ${TIME_TAIL}`,
}

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
