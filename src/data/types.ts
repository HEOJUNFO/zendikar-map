// 지도 데이터 모델. 좌표는 모두 src/data/geo 와 같은 2400×1700 지도 단위.
// 팬 지도 모자이크(2160×1520) 좌표를 가져올 때는 scripts/geo/relocate.py 로 대륙 배치(LAYOUT)에 맞춰 옮긴다.

export type Point = readonly [number, number]

export type ContinentId = 'akoum' | 'bala-ged' | 'guul-draz' | 'murasa' | 'ondu' | 'sejiri' | 'tazeem'

export type LocationKind =
  | 'settlement' // 도시·마을·거점·피난처
  | 'ruin' // 유적·폐허·사원·봉인지
  | 'landmark' // 눈에 띄는 지형 지물 (첨탑, 폭포, 고개 등)
  | 'sky' // 하늘에 떠 있는 폐허·섬 (하늘거주지 등)
  | 'underground' // 지하의 방·묘지·동굴 (Eye of Ugin 처럼 지표 건물이 아닌 곳)
  | 'region' // 하위 지역 — 숲·산맥·늪·평원 (라벨만)
  | 'water' // 강·호수·만·바다 (라벨만)

export type Terrain = 'forest' | 'mountain' | 'swamp' | 'plain' | 'plateau' | 'canyon' | 'ice' | 'volcanic' | 'sea' | 'river'

/**
 * 위치를 어디서 가져왔는지.
 * - fan-map: 팬 지도(asset/)에 그려진 자리. 공식 설정과 모순되지 않는 것만 쓴다.
 * - canon-hint: 공식 설명("북쪽 해안", "~ 근처")을 근거로 놓은 자리
 * - unplaced: 대륙까지만 확인된 곳 — 지도에 찍지 않고 대륙 설명에만 싣는다 (자리를 지어내지 않는다)
 */
export type Placement = 'fan-map' | 'canon-hint' | 'unplaced'

export interface Source {
  label: string
  url?: string
}

/**
 * 이곳을 그린 카드 — 장소 패널에 카드 그림과 함께 보여 준다 (그림·링크는 Scryfall).
 * 카드 이름이 곧 지명이 아니면 basis 에 이 카드가 이곳을 그렸다는 공식 근거를 적는다.
 */
export interface CardRef {
  name: string
  /** 공식 한국어판에 인쇄된 카드 이름 — 한국어판이 있을 때만 */
  nameKo?: string
  /** 세트 코드(소문자)와 수집 번호 — 예: zen 210 */
  set: string
  number: string
  /** Scryfall 카드 페이지 */
  url: string
  /** Scryfall 카드 이미지 (cards.scryfall.io) — normal 488×680, 작은 그림 146×204 */
  image: string
  thumb: string
  artist: string
  basis?: string
}

interface LocationBase {
  id: string
  /** 공식 영문 표기 */
  name: string
  /** 다른 공식 표기 (카드명 등) — 검색에 쓴다 */
  aliases?: string[]
  /** 공식 한국어 카드에 인쇄된 표기만. 없으면 비워 둔다 */
  nameKo?: string
  kind: LocationKind
  terrain?: Terrain
  /** 바다·대륙 밖이면 null */
  continentId: ContinentId | null
  /** 한국어 설명 — 공식 설정의 사실만 */
  description: string
  /** 시대별 변화 (파괴·재건·부상 등) */
  history?: string
  /** 라벨 우선순위 — 클수록 낮은 배율에서도 보인다 (0~3) */
  prominence: 0 | 1 | 2 | 3
  /** 이곳을 그린 카드 (ZEN 대지 등) */
  cards?: CardRef[]
  sources: Source[]
}

export interface PlacedLocation extends LocationBase {
  placement: 'fan-map' | 'canon-hint'
  position: Point
  /** canon-hint 일 때 근거가 된 공식 서술 */
  placementBasis?: string
  /** region/water 의 대략적 범위 (x, y 반지름) — 지형 기호 밀도에 쓴다 */
  extent?: readonly [number, number]
}

export interface UnplacedLocation extends LocationBase {
  placement: 'unplaced'
}

export type Location = PlacedLocation | UnplacedLocation

export const isPlaced = (l: Location): l is PlacedLocation => l.placement !== 'unplaced'

export interface Continent {
  id: ContinentId
  name: string
  nameKo: string
  /** 육지 덩어리 id (src/data/geo/coastlines.json). 발라 게드와 굴 드라즈는 한 덩어리를 나눠 쓴다 */
  landmass: string
  /**
   * 본토와 따로 그린 딸린 섬 덩어리 — 고르기·강조·화면 맞춤에 본토와 함께 쓴다.
   * (온두 = 본토 + Agadeem·Beyeen·Jwar, PG: Ondu). 지형 기호의 성격(relief)은 본토 서술이라 섬에는 쓰지 않는다.
   */
  islands?: readonly string[]
  /** 덩어리를 나눠 쓸 때 이 대륙에 속하는 범위 (덩어리와 겹치는 부분만 쓴다) */
  area?: readonly Point[]
  /** area 의 변 가운데 땅 위에 놓인 부분을 경계선으로 그린다 (맞닿은 두 대륙 중 한쪽만) */
  drawBorder?: boolean
  /** 대륙명 라벨 위치·기울기 */
  label: { at: Point; rotate?: number; size?: number }
  summary: string
  terrain: string
  peoples: string[]
  history: string
  /** 지형 기호 — 산 밀도(0..1), 눈 덮인 봉우리, 절벽 해안, 산 대신 낮은 언덕, 해안을 두른 고리 산맥 */
  relief: { mountains: number; snow?: boolean; cliffs?: boolean; hills?: boolean; ring?: readonly [number, number] }
  /** 특정 장소가 아니라 이 대륙의 풍경을 그렸다고 공식 자료가 밝힌 카드 */
  cards?: CardRef[]
  sources: Source[]
}

/** 이름은 없지만 설정에 근거가 있는 지형 (예: Guul Draz 와 Bala Ged 를 가르는 늪) */
export interface TerrainArea {
  kind: 'forest' | 'mountain' | 'swamp' | 'ice' | 'plateau'
  at: Point
  extent: readonly [number, number]
  note: string
}

/** 헤드론 무리 — 지도 장식이지만 자리와 모습은 설정 근거가 있는 것만 */
export interface HedronCluster {
  id: string
  at: Point
  count: number
  /** 흩어지는 반지름 (지도 단위) */
  spread: number
  /** 이 육지 덩어리 밖으로는 놓지 않는다 (예: Tazeem 의 헤드론은 대륙 경계를 넘지 않는다) */
  within?: string
  /** 해안에서 이만큼(지도 단위) 안쪽에만 둔다 — Tazeem 의 헤드론은 Bulwark 안쪽 하늘에만 있다 */
  inset?: number
  /** 땅에 쓰러져 반쯤 묻힌 헤드론 (Agadeem 의 헤드론 묘지) */
  grounded?: boolean
  /** 크기 배율 */
  scale?: number
  note: string
}
