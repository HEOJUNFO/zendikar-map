// 세계 지도 바탕의 페이즈 문 — 렌더러와 늦게 받는 페이즈 조각(src/map/period.ts·periodTerrain.ts·periodGlyphs.ts)이 함께 쓰는 타입만.
// 메인 그래프(terrain.ts·fineTerrain.ts·childDetail.ts·ZendikarMap.tsx·App.tsx)는 이 파일을 `import type` 으로만 읽어,
// 페이즈 조각의 코드와 데이터(src/data/periods)는 페이즈를 켤 때에야 받는다. 끔이면 이 타입의 값은 하나도 만들어지지 않는다.
import type { LandscapeFeature } from '../data'
import type { ScatterKind } from '../data/periods/types'
import type { Continent, ContinentId, Landscape, Location } from '../data/types'
import type { Bounds, Point } from './geometry'
import type { LandmarkShape, RiverPaths, RiverShape } from './landscape'
import type { LegendArt } from './landscapeGlyphs'
import type { TerrainGeo, TerrainInput, TerrainLayers } from './terrain'

export type { ScatterKind }

/** 페이즈 바탕이 더하는 흩뿌린 기호 층 (TerrainLayers.period) — 칸(tiler)마다 path 조각. 바탕(끔)에서는 생기지 않는다 */
export interface PeriodLayers {
  /** 흰 가루 평원의 바람결 점 */
  dust: string[]
  /** 백악 흉터·자국의 갈라짐 */
  chalk: string[]
  /** 물이 빠진 바닥의 갈라짐·기하 무늬 */
  drybed: string[]
  /** 죽은 나무 */
  deadwood: string[]
}

/** 산 띠에 섞는 봉우리 기호 하나 (buildTerrain 의 glyphs 와 같은 모양 — y 로 안정 정렬해 16 단위 띠로 묶는다) */
export interface PeakGlyph {
  /** 밑동 y (지도 단위) — 앞뒤 가림의 차례 */
  y: number
  fill: string
  crystal: string
  ridge: string
  hatch: string
  crystalRidge: string
  crystalHatch: string
}

/**
 * buildTerrain 의 자리 판정 함수 묶음 (terrain.ts 의 terrainProbe — buildTerrain 이 쓰는 것과 같은 함수).
 * 더하는 기호도 바탕 기호와 같은 판정으로 자리를 고른다. 반지름·여백은 기호 크기 g 배 전 값
 */
export interface TerrainProbe {
  /** 기호 크기·간격 배수 (1 = 세계 지도) */
  g: number
  /** 지도 단위 → 기호 공간 (÷ g) */
  gx(v: number): number
  /** 이름 → 난수 씨앗 (깊은 확대 칸이면 칸 씨앗을 붙인다) */
  seedOf(name: string): number
  /** 뿌릴 범위 — 세계 지도는 지도 전체, 깊은 확대는 그 칸 */
  whole: Bounds
  /** 땅 위이고 해안에서 coast 넘게 안쪽인가 (작은 섬은 여백을 줄인다) */
  onLand(x: number, y: number, coast: number): boolean
  /** 장소 표시 r 안인가 */
  near(x: number, y: number, r: number): boolean
  free(x: number, y: number, r: number): boolean
  /** 높은 기호 — 밑동 위쪽(7·g)도 막히지 않아야 한다 */
  freeTall(x: number, y: number, r: number): boolean
  /** 낮은 기호 — 카드 표시 둘레도 비운다 */
  freeLow(x: number, y: number, r: number): boolean
  /** 지역 라벨 상자 m 안인가 */
  inLabel(x: number, y: number, m: number): boolean
  /** 강·단애선·한 점 기호 자리 (깊은 확대 칸이면 지역 상세가 맡은 자리까지) */
  blocked(x: number, y: number): boolean
  /** 지역 상세가 맡은 자리 (깊은 확대 칸에서만) */
  claimed?: (x: number, y: number) => boolean
  /** 놓인 땅의 크기에 맞춘 여백 배율 */
  fit(x: number, y: number): number
  raster: TerrainGeo
}

/** 페이즈 하나의 기호 계획 — 바탕 기호의 판정과 더하는 기호 */
export interface PhasePlan {
  /** 바탕 기호 하나(밑동 점)의 판정 — 0 남김, 1 뺌, 2 죽은 나무로 (기호 모양을 만든 뒤에 물어 rand 차례가 같다) */
  verdict(kind: ScatterKind, x: number, y: number): 0 | 1 | 2
  /** 산 띠에 섞는 봉우리 (y 안정 정렬 — 같은 y 면 바탕 뒤). 바탕 봉우리 격자에는 넣지 않는다 */
  peaks: readonly PeakGlyph[]
  /** 늪 칸 끝에 붙이는 풀포기 [x, y, path] */
  marsh: readonly [number, number, string][]
  /** 페이즈 층(PeriodLayers) 칸 끝에 붙이는 무늬 [x, y, path] */
  period: { dust: readonly [number, number, string][]; chalk: readonly [number, number, string][]; drybed: readonly [number, number, string][] }
  /** 그 자리의 죽은 나무 path (기호 공간) — 모양은 자리 해시 `dead:${x}:${y}` 로 따로 시드한다 */
  dead(x: number, y: number): string
}

/** buildTerrain 에 넘기는 페이즈 (세계 지도는 셋째 인자, 깊은 확대 칸은 TerrainLod.phase) — 없으면 바탕과 바이트까지 같다 */
export interface TerrainPhase {
  /** 닿는 켠 항목 id 를 정렬해 이은 것 — 같은 열쇠면 같은 변형 */
  key: string
  /** 숨기는 바탕 선 (landscape 의 TerrainLine id) */
  hideLines: ReadonlySet<string>
  /** 바탕 봉우리 자리가 정해진 뒤 한 번 — 더하는 기호를 만들고 판정을 낸다 (basePeakNear: 바탕 봉우리가 (x, y) 둘레 r 안에 있나) */
  prepare(probe: TerrainProbe, basePeakNear: (x: number, y: number, r: number) => boolean): PhasePlan
}

/** 페이즈 바탕의 기호 (periodGlyphs.ts, 기호 공간) — 깊은 확대의 지역 상세 칸(detailTerrain)도 같은 것을 쓴다 */
export interface PeriodGlyphKit {
  /** 흰 가루 평원 — 거의 수평으로 눕는 긴 바람결 한 줄(가끔 바람 쪽으로 비켜 놓은 짧은 한 줄)과 그 결을 따라 흩은 가루 점, 가끔 굳은 바닥의 옅은 금 */
  drift(x: number, y: number, rand: () => number): string
  /** 백악 — 바닥에 눕힌 모난 지그재그 금 한 줄(서너 마디)과 그 마디에서 갈라진 곁금, 작은 모난 부스러기, 점 하나 */
  chalk(x: number, y: number, rand: () => number): string
  /** 마른 바닥의 기하 무늬 — 직각으로 꺾인 네모 나선 토막 */
  craze(x: number, y: number, rand: () => number): string
  /** 마른 바닥의 갈라짐 — 변 하나가 트인 다각형 칸과 꼭짓점에서 이웃 칸으로 뻗는 금 두세 줄, 칸 안의 소금점 */
  crack(x: number, y: number, rand: () => number): string
  /** 죽은 나무 — 맨 줄기와 가지 (가끔 쓰러진 둥치) */
  deadTree(x: number, y: number, rand: () => number): string
  /** 자리(지도 단위)의 해시 0..1 — 이것이 DEAD_KEEP 보다 작은 나무만 죽은 나무로 남긴다. 세계 지도와 지역 상세가 같은 함수라 띠에서 비율이 끊기지 않는다 */
  hash01(x: number, y: number): number
  /** 죽은 숲에서 죽은 나무로 남기는 몫 (0.25) */
  DEAD_KEEP: number
}

/**
 * 깊은 확대 칸에 주는 kit (PeriodView.fine.kit — period.ts 가 단계마다 만든다) — 기호(PeriodGlyphKit)에 데이터에서 온 몫을 더한 것.
 * 지역 상세의 페이즈 바탕 칸(childDetail.ts 의 detailTerrain)이 세계 지도와 같은 기호·같은 몫으로 뿌린다
 */
export interface PeriodFineKit extends PeriodGlyphKit {
  /**
   * 물이 빠진 바닥(drybed)의 무늬 가운데 기하 무늬(craze)로 그리는 몫 0..1 (나머지는 갈라짐 crack) — 그 자리(지도 단위)의 내해 물 빼기 항목
   * (src/data/periods 의 drains)의 craze. 세계 지도의 마른 바닥 무늬(periodTerrain.ts)와 같은 값이라 가장자리 띠에서 몫이 끊기지 않는다
   */
  drybedCraze(x: number, y: number): number
}

/**
 * 땅 위 칠 (지도 단위 path) — 숲 채색 마스크의 걷기·남기기와 옅은 덧칠. 고리는 모두 같은 방향으로 맞춰 nonzero 로 칠하면 합집합이다.
 * 숲 채색 마스크(period-plain-mask)는 흰 바탕 → clear(검정) → keep(흰색) → 바탕 washes.plain(검정) 차례로 칠한다 —
 * keep 을 plain 뒤에 칠하면 남는 숲 자리에 트인 땅(plain)이 겹칠 때 숲 채색이 되살아난다
 */
export interface PeriodWashPaths {
  /** 숲 채색을 걷는 자리 (마스크에 검정 — 흰 먼지·죽은 숲·백악 고리. 띠는 넣지 않는다) */
  clear: string
  /** 그 안에서 다시 남기는 자리 (마스크에 흰색 — 범위에서 뺀 곳(minus), 오란리프의 남는 숲) */
  keep: string
  /** 흰 가루 칠 (period-dust-wash) — 대륙 범위는 그 대륙의 땅을 범위 다각형으로 자른 고리 (land-clip 안에 그린다) */
  dust: string
  /** 백악 칠 (period-chalk-wash) — 백악 흉터·빈터 고리 */
  chalk: string
  /** 죽은 숲의 백악 빛 옅은 덧칠 (period-tint) — 범위에서 뺀 곳(minus)을 이미 뺀 고리 (바깥 고리와 구멍은 방향이 반대라 nonzero 로 칠한다) */
  tint: string
  /** 가는 띠 (자국) — 끝이 가늘어지는 칠(period-band)과 가장자리의 끊긴 잉크(period-band-ink), 지도 단위 */
  bands: { d: string; ink: string }[]
}

/** 이름 테두리를 바꾸는 칠의 종류 — dust 흰 가루(period-dust-wash), chalk 백악(period-chalk-wash) */
export type PeriodWashKind = 'dust' | 'chalk'

/** 물이 빠진 내해 (지도 단위 path) */
export interface BasinPaths {
  /** 옛 물가 고리 안 바닥 (period-floor) — 내해 칠과 같은 고리라 내해 테두리의 바깥 반이 옛 물가 선으로 남는다 */
  floor: string
  /** 남은 물 (inland-sea 와 같은 칠, 물결은 이 모양으로 자른다) */
  pools: string
}

/**
 * 페이즈 바탕이 쓰는 그리는 클래스 (map.css 는 W4) — 기호: period-dust(흰 가루 바람결)·period-chalk(백악 갈라짐)·period-crack(마른 바닥 무늬)·
 * period-deadwood(죽은 나무, 수관 앞). 칠: period-dust-wash·period-chalk-wash·period-tint·period-band(그 가장자리 잉크 period-band-ink)·period-floor. 마른 강바닥: river-dry(기슭 점선)
 */
export type PeriodClass =
  | 'period-dust'
  | 'period-chalk'
  | 'period-crack'
  | 'period-deadwood'
  | 'period-dust-wash'
  | 'period-chalk-wash'
  | 'period-tint'
  | 'period-band'
  | 'period-band-ink'
  | 'period-floor'
  | 'river-dry'

/** 범례의 '이 무렵의 지형' 줄 — blight 엘드라지가 말려 버린 땅(먼지·백악), deadwood 죽은 숲, drybed 물이 빠진 바닥 */
export type PeriodLegendKey = 'blight' | 'deadwood' | 'drybed'

/** 장소·대륙 패널의 '이 무렵' 한 줄 */
export interface PeriodNote {
  /** 항목 id */
  id: string
  label: string
  basis: string
  /** 이 지도가 고른 자리·범위 — '추정' */
  estimate?: string
  /** 장소 표시를 바꾼 항목이면 그 종류 (null: 그 무렵 없던 곳이라 표시하지 않았다) */
  mark?: 'ruin' | null
}

/** 페이즈 바탕에만 있는 지형 종류 — 패널 이름(LANDSCAPE_KIND_LABEL)은 W4 가 넣는다: dust 흰 가루 평원, chalk 백악 흉터, drybed 물이 빠진 바닥, deadwood 죽은 숲 */
export type PeriodFeatureKind = 'dust' | 'chalk' | 'drybed' | 'deadwood'

/**
 * 패널의 '지도에 그린 지형'에 더하는 그 무렵의 지형 (장소·대륙) — LandscapeFeature 와 같은 모양에 period 표시.
 * 그 무렵 그린 것만 싣는다(칠·영역 기호·내해 물 빼기·강·폭포). 숨긴 선·장소 표시는 notesOf 로만
 */
export interface PeriodFeature {
  feature: { id: string; label?: string; basis: string; estimate?: string; location?: string; alsoAt?: readonly string[] }
  kind: LandscapeFeature['kind'] | PeriodFeatureKind
  /** 데이터가 실린 대륙 파일 */
  continentId: ContinentId
  /** 이 무렵에만 그린다 — 패널에 '이 무렵' */
  period: true
}

/**
 * 세계 지도 바탕 지형(lod·페이즈 없이 만든 buildTerrain)의 기록 — 기호마다 숫자만 남기고 문자열은 붙잡지 않는다.
 * 페이즈를 켜면 periodTerrain.ts 의 replayTerrain 이 바탕 문자열을 기호마다 잘라 판정대로 다시 잇는다(사용자 결정 D9 의 B — buildTerrain 을 다시 돌리지 않는다).
 * terrain.ts 가 기록해 terrainLogOf(바탕) 로 찾는다. 기호는 내보낸(emit) 차례, 조각은 칸에 넣은(tiler.add) 차례
 */
export interface TerrainLog {
  /** 기호의 종류·밑동 자리 (내보낸 차례 — 판정이 묻는 것과 같다). 자리는 반드시 Float64 (Float32 면 고리 경계에서 판정이 갈린다) */
  kinds: readonly ScatterKind[]
  xs: Float64Array
  ys: Float64Array
  /** 칸 층의 이름 (TerrainLayers 의 칸 층 — crowns·trunks·marsh·ice·canyons·lava·tundra·frost·cliffs·waterCliffs) */
  layers: readonly string[]
  /** 층마다 칸 열쇠 (칸이 생긴 차례 = 바탕 배열의 차례) */
  tileKeys: readonly (readonly string[])[]
  /** 칸 조각 — 어느 기호(sym, 선이면 -1 해안 절벽·-2-i 바탕 선 i)가 어느 층·칸의 문자열 어디(start, len)에 넣었나 */
  pieces: { sym: Int32Array; layer: Uint8Array; tile: Int32Array; start: Int32Array; len: Int32Array }
  /** 산 띠 — 정렬한(y 안정 정렬) 차례의 봉우리마다 기호 번호와 여섯 문자열(fill·crystal·ridge·hatch·crystalRidge·crystalHatch)의 길이 */
  glyphs: { sym: Int32Array; lens: Int32Array }
  /** 바탕 선 id (input.lines 차례) */
  lineIds: readonly string[]
  /** 협곡 바닥 — 선(번호)마다 gorgeFloors 안의 자리 */
  gorges: { line: Int32Array; start: Int32Array; len: Int32Array }
}

/** 페이즈 조각이 단계마다 셈하는 데 쓰는 지도 입력 — 메인 그래프가 이미 만든 것을 그대로 넘긴다 */
export interface PeriodCtx {
  /** 바탕 지형 (끔의 buildTerrain 결과) */
  terrain: TerrainLayers
  /**
   * 바탕 지형의 기록 (terrain.ts 의 terrainLogOf(terrain)) — 있으면 세계 지도 축척의 기호를 기록을 다시 이어 만들고(B, 몇 ms),
   * 없으면 buildTerrain 을 다시 돌린다(A — 같은 결과, cpu×4 에서 350 ms 남짓)
   */
  log?: TerrainLog
  input: TerrainInput
  riverShapes: readonly RiverShape[]
  landscape: Required<Landscape>
  avoid: readonly Point[]
  continents: readonly Continent[]
  locations: readonly Location[]
}

/** 단계 하나의 페이즈 바탕 — 그 단계에 켠 항목이 없으면 Periods.at 이 undefined 를 낸다 */
export interface PeriodView {
  /** 이어 센 단계 (1..5) */
  level: number
  /** 켠 항목 id 를 정렬해 이은 것 */
  key: string
  /** 세계 지도 축척의 흩뿌린 기호와 선 (단계마다 기억) — 바탕 terrain 대신 그린다 */
  terrain: TerrainLayers
  /** 깊은 확대 칸 — 닿는 켠 항목이 없는 칸은 phaseFor 가 undefined, keyFor 가 '' 라 바탕 칸과 같다 */
  fine: {
    phaseFor(level: number, region: Bounds): TerrainPhase | undefined
    /** 칸 열쇠 끝에 붙이는 말 — `~p<id>.<id>…`, 닿지 않으면 '' */
    keyFor(level: number, region: Bounds): string
    kit: PeriodFineKit
  }
  /** 땅 위 칠 — world: 세계 지도 다듬기, deep(): 깊은 확대 다듬기 (geo.ts 의 deepRings 순번) */
  washes: { world: PeriodWashPaths; deep(): PeriodWashPaths } | null
  /**
   * (x, y) 가 흰 가루·백악 칠(washes 의 dust·chalk — 겹치면 위에 칠한 백악) 안인가. 칠과 같은 모양(deep 이면 깊은 확대 다듬기)으로 보고,
   * 땅 위인지는 부르는 쪽이 본다 (칠은 land-clip 으로 잘린다). 칠 위 이름의 테두리를 칠 빛으로 바꾸는 데 쓴다 (map.css 의 on-dust·on-chalk)
   */
  washAt(x: number, y: number, deep: boolean): PeriodWashKind | null
  basin: { world: BasinPaths; deep(): BasinPaths } | null
  /** 하구를 옛 물가에서 끊은 바탕 강 (없으면 바탕 그대로) */
  rivers: RiverPaths | null
  /** 그 무렵의 강 — 물길·기슭, 마른 강바닥(기슭만) */
  extraRivers: { water: string[]; banks: string[]; dry: string[] } | null
  /** 그 무렵의 폭포 */
  landmarks: LandmarkShape[] | null
  /** 장소 id → 그 무렵 표시 종류 (null: 표시하지 않는다) */
  marks: ReadonlyMap<string, 'ruin' | null>
  /** 물빛 테두리를 떼는 물 이름 라벨의 장소 id */
  dryLabels: ReadonlySet<string>
  /** 그 무렵 숨긴 바탕 선 (landscape 의 TerrainLine id — 가시지대의 협곡 L1·L2 등). 지도에 긋지 않으니 패널의 지형 목록에서도 뺀다 (App) */
  hiddenLines: ReadonlySet<string>
  legend: readonly PeriodLegendKey[]
  /** 범례 줄의 그림 (periodGlyphs.ts — 지도와 같은 칠·기호) */
  legendArt(key: PeriodLegendKey): LegendArt
  /** 이 장소의 '이 무렵' — 장소와 하나인 항목(location)과 표시·이름 바꿈(place) */
  notesOf(id: string): PeriodNote[]
  /** 이 장소(location)·대륙(대륙 파일)의 그 무렵 지형 */
  featuresOf(id: string, by: 'place' | 'continent'): PeriodFeature[]
}

/** 페이즈 조각의 입구 (period.ts 의 createPeriods) */
export interface Periods {
  at(level: number, ctx: PeriodCtx): PeriodView | undefined
}
