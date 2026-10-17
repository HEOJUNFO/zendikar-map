// 페이즈 바탕의 데이터 모양 — 페이즈를 켜면 그 무렵 모습이 공식 자료로 뚜렷이 달랐던 곳만 세계 지도 바탕 위에 덧그린다.
// 바탕 데이터(landscape/*.ts·geo/*.json·locations.ts)와 지형 입력은 바꾸지 않고, 항목마다 켜지는 단계(levels)를 단다 — 끔(0)은 둘 수 없어 끔 지도는 늘 같다.
// 대륙별 파일 src/data/periods/<대륙>.ts 가 PeriodSet 을 낸다. 늦게 받는 조각이라 첫 로딩에는 실리지 않는다.
// Node 도구(scripts/childmaps)도 그대로 읽게 import 는 `import type` 과 .ts 확장자만 쓴다.
import type { Point } from '../types.ts'

/** 이어 센 페이즈 번호 (sagas.ts — 1·2·3 = 사가1, 4·5 = 사가2). 0(끔)은 둘 수 없다 (끔 지도를 지키는 첫 장치) */
export type PeriodLevel = 1 | 2 | 3 | 4 | 5
export type Ring = readonly Point[]

/**
 * 범위 하나 — 새 고리·띠는 좌표로, 기존 다각형은 이름으로 가리킨다 (기하는 늘지 않고 앱과 같은 다듬기를 쓴다).
 * - ring: 새 고리 / band: 가는 띠(자국) — 꺾은선과 폭
 * - water: features.json 의 waters 키 (geo.ts 의 inlandWaterIds)
 * - forest: features.json 의 forests 순번과 그 가운데가 들 대륙 (순번이 밀리면 검사가 멈춘다)
 * - continent: continents.ts 의 area (땅으로 잘라 그린다) / place: locations.ts 의 position·extent 타원 / area: landscape 영역 id
 */
export type PeriodShape =
  | { ring: Ring }
  | { band: readonly Point[]; width: number }
  | { water: string }
  | { forest: number; expect: string }
  | { continent: string }
  | { place: string }
  | { area: string }

/** 바탕 기호의 종류 — buildTerrain 이 기호를 내보내는 자리마다 붙인다 (판정 verdict 가 이것으로 남김·뺌·죽은 나무를 가른다) */
export type ScatterKind = 'peak' | 'hill' | 'snow' | 'crystal-spire' | 'mesa' | 'crystal' | 'tree' | 'mangrove' | 'marsh' | 'ice' | 'canyon' | 'lava' | 'tundra'

interface PeriodBase {
  /** 항목 id — 바탕 지형과 페이즈 항목을 통틀어 하나 */
  id: string
  /** research.json 의 조사 항목 key (같은 조사에서 나온 항목은 같은 op) */
  op: string
  /** 켜지는 단계 — OR ('사가1 페이즈1·2' = [1, 2]). 지역 상세의 페이즈 문으로는 sagas.ts 의 gatesFor 로 옮긴다 */
  levels: readonly PeriodLevel[]
  /** 패널·범례에 쓰는 이름 */
  label: string
  /** 이 항목과 하나인 장소 (패널의 '이 무렵'에 싣는다) */
  location?: string
  /** 이 항목이 함께 바꾼 다른 장소 — 그 장소 패널의 '이 무렵'과 '지도에 그린 지형'에도 싣는다 (흰 가루 평원에 덮인 뒤엉킨 계곡처럼) */
  alsoAt?: readonly string[]
  /** 공식 근거 — 인용 그대로 */
  basis: string
  /** 자리·범위·물길을 이 지도가 고른 까닭 — 패널에 '추정'. 좌표로 고른 항목(ring·band·course·at·pools)에는 있어야 한다 */
  estimate?: string
}

/** 땅 위 칠과 그 무늬 기호, 그리고 그 안 바탕 기호 빼기 — dust 흰 가루 평원 / chalk 백악 흉터·자국 / deadwood 죽은 숲(칠 없이 숲 채색을 걷는다) */
export interface PeriodGround extends PeriodBase {
  kind: 'dust' | 'chalk' | 'deadwood'
  shapes: readonly PeriodShape[]
  /** 범위에서 뺄 자리 (남는 숲 등) */
  minus?: readonly PeriodShape[]
  /** 범위 안에서 뺄 바탕 기호 — deadwood 는 ['tree', 'mangrove'] 만 (뺀 나무 가운데 일부를 죽은 나무로 그린다) */
  clears: readonly ScatterKind[] | 'all'
  /** 무늬 기호 밀도 (deadwood 는 없음) */
  density?: number
}

/** 그 무렵에만 있던 영역 기호 — 바탕에 없는 기호를 항목마다 따로 시드해 더한다 */
export interface PeriodRelief extends PeriodBase {
  kind: 'hills' | 'swamp' | 'crystal'
  shapes: readonly PeriodShape[]
  density: number
  /** 영역 안 바탕 기호 빼기 */
  clears?: readonly ScatterKind[] | 'all'
  /** 이 영역 기호가 막힘으로 보지 않을 바탕 선 id — 그 선은 이 항목의 모든 단계에서 hides 로 숨어 있어야 한다 */
  through?: readonly string[]
}

/** 내해의 물을 뺀다 — 옛 물가 고리 안을 마른 바닥으로 덮고, 낮은 곳에 남은 물을 다시 칠한다 */
export interface PeriodDrain extends PeriodBase {
  /** features.json 의 waters 키 */
  water: string
  /** 남은 물 (추정) */
  pools: readonly Ring[]
  /** 옛 물가에서 하구 물칠을 내지 않는 강 id (landscape 의 rivers) */
  dryMouths: readonly string[]
  /** 바닥 무늬 기호 밀도 */
  density: number
  /** 바닥 무늬 가운데 기하 무늬(craze)의 몫 (0..1) */
  craze: number
}

/** 그 무렵의 강 — dry 면 물 없는 강바닥(기슭만) */
export interface PeriodRiver extends PeriodBase {
  /** 상류 → 하류 (landscape 의 River 와 같다) */
  course: readonly Point[]
  width?: number
  dry?: true
}

/** 그 무렵의 한 점 기호 (landscape 의 LandmarkGlyph 와 같은 뜻 — size·angle) */
export interface PeriodGlyph extends PeriodBase {
  kind: 'waterfall'
  at: Point
  size?: number
  angle?: number
}

/** 그 무렵 없던 바탕 선 지형 (landscape 의 TerrainLine id) — 숨긴다 */
export interface PeriodHide extends PeriodBase {
  line: string
}

/** 장소에 붙는 항목 — 이름은 그 장소의 이름이라 label 이 없어도 된다 */
interface PeriodPlaceBase extends Omit<PeriodBase, 'label'> {
  label?: string
}

/** 장소 표시를 그 무렵 모습으로 — ruin: 폐허 기호로, null: 그 무렵 없던 곳이라 표시하지 않는다 (라벨 자리는 그대로) */
export interface PeriodMark extends PeriodPlaceBase {
  place: string
  kind: 'ruin' | null
}

/** 물 이름 라벨을 그 무렵 모습으로 — dry: 물빛 테두리를 뗀다 (글자는 그대로) */
export interface PeriodLabel extends PeriodPlaceBase {
  place: string
  dry: true
}

/** 대륙 파일 하나의 항목 묶음 */
export interface PeriodSet {
  grounds: readonly PeriodGround[]
  reliefs: readonly PeriodRelief[]
  drains: readonly PeriodDrain[]
  rivers: readonly PeriodRiver[]
  glyphs: readonly PeriodGlyph[]
  hides: readonly PeriodHide[]
  marks: readonly PeriodMark[]
  labels: readonly PeriodLabel[]
}
