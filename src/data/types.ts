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
 * - estimate: 공식 설정이 대륙(과 지형·이웃 같은 단서)까지만 밝힌 곳 — 사용자 요청으로 이 지도가 자리를 골라 찍는다.
 *   고른 까닭을 estimate 에 적어 패널에 '추정'으로 보인다
 * - unplaced: 대륙까지만 확인된 곳 — 지도에 찍지 않고 대륙 설명에만 싣는다
 */
export type Placement = 'fan-map' | 'canon-hint' | 'estimate' | 'unplaced'

export interface Source {
  label: string
  url?: string
}

/**
 * 카드 — 카드 패널에 그림과 함께 보여 준다 (그림·링크는 Scryfall).
 * 카드 이름이 곧 지명이 아니면 basis 에 이어진 곳과의 공식 근거를 적는다.
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
  /** Scryfall 카드 이미지 (cards.scryfall.io, normal 488×680) */
  image: string
  artist: string
  /** 이곳과 잇는 공식 근거 (카드 이름이 곧 지명이면 생략) */
  basis?: string
  /** 공식 근거가 닿지 않아 이 지도가 판단한 것 — 연결이나 지도 위 자리. 패널에 '추정'으로 보인다 */
  estimate?: string
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
  sources: Source[]
}

export interface PlacedLocation extends LocationBase {
  placement: 'fan-map' | 'canon-hint' | 'estimate'
  position: Point
  /** canon-hint 일 때 근거가 된 공식 서술 */
  placementBasis?: string
  /** estimate 일 때 — 공식 자료가 밝힌 것과, 이 지도가 이 자리를 고른 까닭 (패널에 '추정') */
  estimate?: string
  /** region/water 의 대략적 범위 (x, y 반지름) — 지형 기호 밀도에 쓴다 */
  extent?: readonly [number, number]
  /** extent 범위에 terrain 기호를 깔지 않는다 — 지금 모습을 공식 자료로 알 수 없는 곳 (이름만) */
  bare?: boolean
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
  /**
   * 지형 기호 — 산 밀도(0..1), 눈 덮인 봉우리, 절벽 해안, 산 대신 낮은 언덕, 해안을 두른 고리 산맥,
   * 봉우리 사이 툰드라(드문 풀포기와 서리 점, 대륙 전체), 산 기호 가운데 수정 첨탑으로 그리는 몫(0..1).
   * 모두 그 대륙의 공식 서술이 근거다 (continents.ts 의 주석)
   */
  relief: {
    mountains: number
    snow?: boolean
    cliffs?: boolean
    hills?: boolean
    ring?: readonly [number, number]
    tundra?: boolean
    crystal?: number
  }
  sources: Source[]
}

/**
 * 바탕 그림의 지형 — 장소 데이터(region/water 의 extent)로는 그릴 수 없는 공식 서술을 지도에 옮긴다.
 * 모두 basis(공식 근거)를 적고, 자리·범위·물길을 이 지도가 고른 것이면 estimate 에 그 까닭을 적는다.
 * 공식 자료에 없는 지형은 그리지 않는다. 데이터는 src/data/landscape/<대륙>.ts.
 */
interface LandscapeBase {
  /** 공식 근거 — 자료 이름과 그 서술 (영문 인용 가능) */
  basis: string
  /** 공식 자료가 자리·범위·물길까지 밝히지 않아 이 지도가 고른 것 — 고른 까닭 */
  estimate?: string
  /** 이 지형과 하나인 장소 (있으면) */
  location?: string
  /** 패널에 보일 짧은 한국어 이름 (예: '스카이팽 산줄기'). 없으면 종류 이름을 쓴다 */
  label?: string
}

/**
 * 이름은 없거나 장소 데이터로는 모양을 담을 수 없는 지형 영역.
 * 영역 안에서는 kind 가 대륙의 지형 기호(relief) 를 덮어쓴다 — 고리 산맥(ring) 띠와 팬 지도 숲 채색도 덮는다.
 * 목록에서 뒤에 오는 영역이 앞의 영역을 덮는다.
 * - forest: 숲 채색 + 나무 / swamp: 늪 풀포기 / mangrove: 물에 뿌리박은 나무 + 늪
 * - mountain: 빽빽한 산 / hills: 산 대신 낮은 언덕 / plain: 트인 땅 (산·나무·숲 채색을 걷어 낸다)
 * - mesa: 꼭대기가 평평한 대지(臺地) 기호 / canyon: 단애선 / ice: 빙원
 * - crystal: 수정 첨탑 들판 (Akoum) / lava: 용암 들판 / tundra: 툰드라·영구동토 스텝 (드문 풀포기와 서리 점)
 */
export type TerrainAreaKind =
  | 'forest'
  | 'swamp'
  | 'mangrove'
  | 'mountain'
  | 'hills'
  | 'plain'
  | 'mesa'
  | 'canyon'
  | 'ice'
  | 'crystal'
  | 'lava'
  | 'tundra'

export interface TerrainArea extends LandscapeBase {
  id: string
  kind: TerrainAreaKind
  /** 영역 다각형 (지도 단위). 없으면 at + extent 타원 */
  ring?: readonly Point[]
  at?: Point
  extent?: readonly [number, number]
  /** 기호 밀도 0..1 (산·언덕·대지·수정 — 생략하면 kind 마다 기본값) */
  density?: number
}

/** 강 — 물길을 선으로 그린다 */
export interface River extends LandscapeBase {
  id: string
  /** 상류 → 하류. 하구는 바다·호수 안쪽까지 조금 들어가게 둔다 (해안선이 덮는다) */
  course: readonly Point[]
  /** 하구 쪽 굵기 (지도 단위, 기본 1.6) — 상류로 갈수록 가늘어진다 */
  width?: number
  /** 지류면 본류 id — 끝점이 본류 위에 놓인다 */
  tributaryOf?: string
}

/**
 * 선 지형 — 절벽·협곡처럼 해안선이 아닌 곳에 긋는 단애.
 * - cliff: line 은 절벽 위 가장자리. 빗금은 진행 방향의 오른쪽(낮은 쪽)으로 떨어진다. 닫힌 고리면 closed
 * - gorge: line 은 협곡 가운데 선. 양쪽 단애가 안쪽(골짜기)으로 빗금을 내린다. width 는 협곡 폭
 */
export interface TerrainLine extends LandscapeBase {
  id: string
  kind: 'cliff' | 'gorge'
  line: readonly Point[]
  closed?: boolean
  /** gorge 의 폭 (지도 단위, 기본 8) */
  width?: number
}

/**
 * 한 점에 그리는 지형 기호.
 * - volcano: 연기 나는 화산 / caldera: 큰 분화구(초화산) / waterfall: 폭포 (angle 은 물이 떨어지는 방향)
 * - geyser: 증기·간헐천·뜨거운 웅덩이 / pit: 수직 동굴·싱크홀 / spire: 우뚝 선 바위·수정 첨탑
 * - floating-rock: 떠 있는 바위 / urn: 떠 있는 기울어진 돌 항아리 — 아가리에서 얼음·눈사태가 쏟아진다 (Sejiri)
 */
export interface LandmarkGlyph extends LandscapeBase {
  id: string
  kind: 'volcano' | 'caldera' | 'waterfall' | 'geyser' | 'pit' | 'spire' | 'floating-rock' | 'urn'
  at: Point
  /** 기호 크기 배율 (기본 1) */
  size?: number
  /** waterfall: 물이 떨어지는 방향 (도, 0 = 아래쪽, 90 = 왼쪽, -90 = 오른쪽) */
  angle?: number
}

/** 바다·호수 위의 표시 */
export interface SeaMark extends LandscapeBase {
  id: string
  /** sea-ice: 떠다니는 얼음 / whirl: 소용돌이 해류 / reef: 암초·물속 수정 초 / rough: 거친 물결 */
  kind: 'sea-ice' | 'whirl' | 'reef' | 'rough'
  ring?: readonly Point[]
  at?: Point
  extent?: readonly [number, number]
}

/** 대륙 하나의 바탕 지형 데이터 (src/data/landscape/<대륙>.ts) */
export interface Landscape {
  areas?: TerrainArea[]
  rivers?: River[]
  lines?: TerrainLine[]
  glyphs?: LandmarkGlyph[]
  sea?: SeaMark[]
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
  /** 한가운데가 쪼개져 좁은 틈을 둔 두 쪽 (Ikiral — 쓰러진 헤드론에만) */
  split?: boolean
  /** 크기 배율 */
  scale?: number
  note: string
}
