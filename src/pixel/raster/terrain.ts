// 바탕 지형을 타일에 그린다 (S4, docs/pixel-plan.md) — 데이터는 scripts/pixel/terrain.mjs 가 지금 지도의 지형 셈에서 뽑은 것(virtual:pixel-terrain).
// 칸 종류에 더하는 것(채색 영역·협곡 바닥·강)은 rasterRegion 이 칸을 채울 때(addTerrainKinds), 위에 얹는 것(단애·바다 표시·흩뿌린 기호·한 점 기호·헤드론)은
// 칠한 뒤(paintTerrain) 그린다. 무엇을 그릴지·어느 모양인지는 모두 지도 좌표와 단계에서만 정해져(솎기도 세계 전체를 한 차례로 훑는다)
// 타일을 어떤 차례로 그려도 세계 한 장과 같다. 이름 자리(holes)만 화면마다 다르다 — 흩뿌린 기호만 그 상자를 비킨다 (지금 지도의 cutGlyphs 와 같은 몫).
import { pointInRing, type Ring } from '../../map/geometry.ts'
import { fillRing, type Grid, type Region } from './fill.ts'
import type { Palette, Rgb, TerrainColors } from './palette.ts'
import { addPeriodKinds, CHALK, DEAD, DUST, METAL, type PeriodDecoded, type VectorPart } from './period.ts'
import { GLYPH_SPRITES, INK, LARGE_FROM, LARGE_GLYPH_SPRITES, LANDMARK_SMALL, LANDMARK_SPRITES, MICRO_SPRITES, scaleSprite, SEA_SPRITES, sizeClass, turnSprite, type Sprite } from './terrainSprites.ts'

/**
 * scripts/pixel/terrain.mjs 가 내는 꼴 — 좌표는 모두 지도 단위 × 10 의 정수이고, 점 목록은 앞 점과의 차이다 (첫 점은 그대로).
 * 흩뿌린 기호의 y 와 빗금의 밑동도 앞 것과의 차이, 강의 폭도 앞 표본과의 차이
 */
export interface PixelTerrain {
  v: number
  /** 흩뿌린 기호 종류 이름 (src/map/glyphSpans.ts 의 GLYPH_KINDS) */
  kinds: string[]
  /** 흩뿌린 기호 [종류, x, y] 를 이어 붙인 것 — y, x 차례 */
  g: number[]
  /** 깊은 확대의 기호 — 빌드의 Worker 조각에는 없고(null) virtual:pixel-terrain-fine 으로 따로 온다 (attachFine) */
  fine: PixelTerrainFine | null
  /** 봉우리 모양 (객체 다듬기 A1 — scripts/pixel/terrain.mjs 의 recordShape): [종류, x, y(×10 절대), 채움 점 수, 점(×10 차이)…, 빗금 수, (점 수, 점…)…] */
  ps?: number[]
  /** 단애 위 선 (w: 물가 절벽) */
  lines: { w: number; p: number[] }[]
  /** 단애 빗금 [x, y, dx, dy] 를 이어 붙인 것 */
  hatch: number[]
  /** 협곡 바닥 다각형 */
  gorges: number[][]
  /** 강 — 다듬은 물길과 표본마다의 폭 (× 100) */
  rivers: { id: string; p: number[]; w: number[] }[]
  /** 한 점 지형 기호 (데이터 그대로) */
  marks: { id: string; k: string; x: number; y: number; s: number; a: number; parts?: { c: string; f: number; p: number[][] }[] }[]
  /** 바다 표시의 자리 */
  sea: { id: string; k: string; p: number[] }[]
  /** 채색 영역 — 숲(바탕 지형의 숲 영역)·트인 땅(숲 채색을 걷는다)·용암 들판 */
  washes: { id: string; k: 'forest' | 'plain' | 'lava'; p: number[] }[]
  /** 헤드론 (ZendikarMap.tsx 의 layoutHedrons 와 같은 셈) */
  hedrons: { id: string; c: string; x: number; y: number; len: number; rot: number; lift: number; gr: number; sp: number }[]
  /** 한 땅을 나눠 쓰는 대륙 사이의 경계 (S14 — 대륙 id 와 땅 위의 꺾은선) */
  borders?: { id: string; p: number[] }[]
}

/** 깊은 확대(지금 지도의 fineTerrain 단계 level — 반 크기·반 간격)로 다시 뿌린 기호. 한 픽셀이 FINE_FROM 단위 이하인 단계에서 세계 지도 축척의 기호 대신 그린다 */
export interface PixelTerrainFine {
  level: number
  g: number[]
  /**
   * 지역 상세에 닿는 칸의 기호 (S9 — scripts/pixel/childmaps.mjs): [종류, x, y(앞 기호와의 차이), 보기 비트] — 보기(0 끔, t 시점)마다 지금 지도의 fineOverlay 로
   * 다시 뿌린 것 (세계 지도 기호는 지역 상세가 맡은 자리를 비키고, 지역 상세의 지형 칸 기호가 더해진다). 그 칸의 기호는 g 에 없다
   */
  cv?: number[]
  /** 깊은 확대의 봉우리 모양 (PixelTerrain.ps 와 같은 꼴) */
  ps?: number[]
  /** cv 의 줄마다 봉우리 모양 — [모양 숫자의 수(0 이면 없음), 모양…]… (보기마다 같은 자리에 다른 모양이 설 수 있어 줄마다, A1 검토) */
  cps?: number[]
}

/** 다시 뿌린 기호를 쓰는 단계 — 한 픽셀 0.25 단위 (화면 2× 에서 지금 지도의 tier 5, 깊은 확대의 첫 단계) */
export const FINE_FROM = 0.25

/** 칸 종류 — world.ts 의 SEA·LAND·FOREST·LAKE 뒤 */
export const LAVA = 4
export const GORGE = 5
/** 한 픽셀 굵기의 강 (기슭 선 없음) */
export const RIVER = 6
/** 두 픽셀 넘게 굵은 강 — 기슭에 윤곽 */
export const RIVER_WIDE = 7

/** 땅 칸 — 시점별 바탕(S6)의 흰 가루·백악·죽은 금속·죽은 숲도 (물이 빠진 바닥·마른 강바닥은 아니다) */
const landish = (k: number) => k === 1 || k === 2 || k === LAVA || k === GORGE || k === DUST || k === CHALK || k === METAL || k === DEAD

/** 단계마다 그리는 것 (한 픽셀 = u 단위) */
export const TERRAIN_FROM = {
  /** 강 */
  rivers: 8,
  /** 협곡 바닥·단애 위 선 */
  lines: 4,
  /** 단애 빗금 */
  hatch: 2,
  /** 흩뿌린 기호 — 8 은 높은 기호의 점 한 개, 4 는 작은 무늬, 2 부터 그림 */
  dots: 8,
  micro: 4,
  sprites: 2,
  /** 헤드론 — 하나뿐인 거대 헤드론은 4 부터 */
  hedrons: 2,
  bigHedrons: 4,
} as const

type Group = 'tall' | 'tree' | 'low' | 'sea' | 'dead'
const GROUP: Record<string, Group> = {
  peak: 'tall',
  hill: 'tall',
  snow: 'tall',
  'crystal-spire': 'tall',
  mesa: 'tall',
  crystal: 'tall',
  tree: 'tree',
  mangrove: 'low',
  marsh: 'low',
  ice: 'low',
  canyon: 'low',
  lava: 'low',
  tundra: 'low',
  // 시점별 바탕 (S6) — 칠 위의 무늬는 낮은 기호, 죽은 나무는 나무처럼 솎되 넓은 배율에서도 그린다 (숲이 아니게 된 자리라)
  dust: 'low',
  chalk: 'low',
  drybed: 'low',
  metal: 'low',
  deadwood: 'dead',
}

interface Item {
  kind: string
  x: number
  y: number
  group: Group
  /** 자리로 고른 모양 (같은 kind 의 그림이 둘 이상일 때) */
  pick: number
  /** 움직이는 효과(S5)가 붙는 기호의 데이터 id — 바다 표시는 그 표시, 용암 기호는 그 용암 들판 영역 */
  id?: string
  /** 지금 지도의 봉우리 모양 (객체 다듬기 A1) — 있으면 크게 보이는 단계에서 이 모양대로 */
  shape?: PeakShape
}

/** 봉우리 하나의 모양 — 밑동에서의 차이 (지도 단위). fill 은 왼쪽 밑동 → 꼭대기 → 오른쪽 밑동 */
interface PeakShape {
  fill: [number, number][]
  hatch: [number, number][][]
  /** 꼭대기의 x 차이 (왼쪽·오른쪽 면을 가른다) */
  apex: number
  /** 대지 — [꼭대기 y, 벼랑 밑 y, 꼭대기 왼쪽 x, 오른쪽 x] (차이) */
  band?: [number, number, number, number]
  /** 수정 — 기둥 다각형들 (뒤의 것부터) */
  polys?: [number, number][][]
  box: [number, number, number, number]
}

/** 지금 지도의 모양대로 그리는 봉우리 종류와 그 단계 (한 픽셀 ≤ 1 단위 — 8 픽셀 그림이 지금 지도의 1/2–1/4 로 작아지는 단계) */
const SHAPED_KINDS = new Set(['peak', 'snow', 'hill', 'canyon', 'mesa', 'crystal', 'crystal-spire', 'dust', 'chalk', 'drybed', 'deadwood', 'metal'])
export const SHAPED_FROM = 1
/** 협곡 단애는 한 픽셀 ≤ 2 단위부터 기록된 꺾은선대로 (가독성 다듬기 R28 — u2 에서 같은 기울기 그림판 토막이 지역 전체에 찍혀 Makindi 참호·Pelakka 카르스트가 빗줄기·밭고랑으로 읽혔다) */
const CANYON_SHAPED_FROM = 2
/** 모양 조각(봉우리·협곡 꺾은선)을 받는 단계 — Worker 가 이 단계부터 받는다 */
export const SHAPES_FROM = CANYON_SHAPED_FROM
/** 수정은 한 픽셀 ≤ 0.5 단위부터 모양대로 (R15 — u1 에서는 기둥 하나가 2–3 픽셀이라 짙은 덩이·바코드였다. u1 은 그림판의 그림) */
const CRYSTAL_SHAPED_FROM = 1
const CRYSTAL_KINDS = new Set(['crystal', 'crystal-spire'])

/** 모양 숫자의 수 (scripts/pixel/terrain.mjs 의 CTRL) */
const CTRL_N: Record<string, number> = { peak: 6, snow: 4, hill: 4, canyon: 6, mesa: 18, crystal: 1, 'crystal-spire': 1, dust: 0, chalk: 0, drybed: 0, deadwood: 0, metal: 0 }
/** 그 무렵 무늬의 선 빛 (객체 다듬기 A27–A31 — 그림판 그림의 먹 글자와 같다) */
const PERIOD_LINE: Record<string, keyof TerrainColors> = { dust: 'dustInk', chalk: 'chalkInk', drybed: 'crack', deadwood: 'barkShade', metal: 'seam' }

/** 이차 곡선을 여섯 토막으로 (a 는 넣지 않는다) */
const quad = (a: [number, number], c: [number, number], b: [number, number]): [number, number][] =>
  Array.from({ length: 6 }, (_, k) => {
    const t = (k + 1) / 6
    return [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]] as [number, number]
  })

/** 모양 숫자 하나(ps[i] 부터 — 모양 숫자, 빗금 수, 빗금들) → 모양과 다음 차례. 채움 꺾은선은 지금 지도의 path 그대로 다시 만든다 (terrain.ts 의 mountainGlyph·snowGlyph·hillGlyph) */
function shapeAt(kind: string, ps: readonly number[], i: number): [PeakShape, number] {
  const n = CTRL_N[kind]
  if (n === undefined) throw new Error(`봉우리 모양: '${kind}' 의 꼴을 모른다`)
  const v = Array.from({ length: n }, (_, k) => ps[i + k] / 10)
  i += n
  let fill: [number, number][]
  // 협곡 단애 — 굽은 단애선을 첫 꺾은선으로 (paintLines 가 먹으로), 빗금이 뒤따른다
  const curve: [number, number][][] = kind === 'canyon' ? [[[v[0], v[1]], ...quad([v[0], v[1]], [v[2], v[3]], [v[4], v[5]])]] : []
  let band: [number, number, number, number] | undefined
  // 수정은 칠 꼴이 없다 — 기둥 다각형(polys)이 칠이다 (가독성 다듬기 R2: 언덕의 칠 꼴을 셈하다 없는 모양 숫자를 읽어 상자가 NaN 이 되어, 이름 상자를 비키는 셈이 늘 거짓이었다)
  if (kind === 'canyon' || kind === 'crystal' || kind === 'crystal-spire') fill = []
  else if (kind === 'mesa') {
    // 비탈(이차 곡선) → 벼랑 밑 → 꼭대기 왼쪽 → 가운데 → 꼭대기 오른쪽 → 벼랑 밑 → 비탈 — 벼랑 면을 칠하려 꼭대기 높이·벼랑 밑 높이·꼭대기의 두 끝을 둔다
    fill = [[v[0], v[1]], ...quad([v[0], v[1]], [v[2], v[3]], [v[4], v[5]]), [v[6], v[7]], [v[8], v[9]], [v[10], v[11]], [v[12], v[13]], ...quad([v[12], v[13]], [v[14], v[15]], [v[16], v[17]])]
    band = [v[7], v[5], v[6], v[10]]
  } else if (kind === 'peak') fill = [[v[0], 0], ...quad([v[0], 0], [v[1], v[2]], [v[3], v[4]]), [v[5], 0]]
  else if (kind === 'snow') fill = [[v[0], 0], [v[1], v[2]], [v[3], 0]]
  else fill = [[v[0], 0], ...quad([v[0], 0], [v[1], v[2]], [v[3], 0])]
  const nh = ps[i++]
  let hatch: [number, number][][] = [...curve]
  for (let h = 0; h < nh; h++) {
    const m = ps[i++]
    hatch.push(Array.from({ length: m }, (_, k) => [ps[i + k * 2] / 10, ps[i + k * 2 + 1] / 10] as [number, number]))
    i += m * 2
  }
  // 수정 — 모양 숫자 하나(기둥 수)만큼이 기둥 다각형, 나머지가 결·빗금 (v 는 10 으로 나눈 값이라 다시 곱한다)
  let polys: [number, number][][] | undefined
  if (kind === 'crystal' || kind === 'crystal-spire') {
    const np = Math.round(v[0] * 10)
    polys = hatch.slice(0, np)
    hatch = hatch.slice(np)
  }
  let apex = fill[0] ?? [0, 0]
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const p of [...fill, ...hatch.flat(), ...(polys ?? []).flat()]) {
    if (p[1] < apex[1]) apex = p
    x0 = Math.min(x0, p[0])
    y0 = Math.min(y0, p[1])
    x1 = Math.max(x1, p[0])
    y1 = Math.max(y1, p[1])
  }
  return [{ fill, hatch, apex: apex[0], box: [x0, y0, x1, y1], ...(band ? { band } : {}), ...(polys ? { polys } : {}) }, i]
}

/** 봉우리 모양 기록 [종류, x, y, 모양…]… → (종류:x:y ×10 → 모양) */
function shapeMap(kinds: readonly string[], ps: readonly number[] | undefined): Map<string, PeakShape> {
  const out = new Map<string, PeakShape>()
  if (!ps) return out
  for (let i = 0; i < ps.length; ) {
    const kind = kinds[ps[i]]
    const key = `${kind}:${ps[i + 1]}:${ps[i + 2]}`
    const [sh, next] = shapeAt(kind, ps, i + 3)
    out.set(key, sh)
    i = next
  }
  return out
}

/** 세계 지도 축척의 봉우리 모양을 붙인다 — Worker 는 한 픽셀 ≤ 1 단위의 타일을 처음 그릴 때 따로 받는다 (virtual:pixel-terrain-peaks) */
export function attachPeaks(d: Decoded, t: PixelTerrain, ps: readonly number[]): void {
  attachShapes(d.items, shapeMap(t.kinds, ps))
}

const attachShapes = (items: readonly Item[], ...maps: Map<string, PeakShape>[]) => {
  if (!maps.some((m) => m.size)) return
  for (const it of items) {
    if (!SHAPED_KINDS.has(it.kind)) continue
    const key = `${it.kind}:${Math.round(it.x * 10)}:${Math.round(it.y * 10)}`
    for (const m of maps) {
      const sh = m.get(key)
      if (sh) {
        it.shape = sh
        break
      }
    }
  }
}

/** 움직이는 효과가 붙는 자리 (S5, src/pixel/fx) — 타일이 그 효과의 그림을 그린 자리. 기준점 픽셀이 그 타일 안인 것만 낸다 (이웃 타일과 겹치지 않게) */
export interface FxSpot {
  /** 효과 — 폭포·간헐천(한 점 기호), 소용돌이(바다 표시), 용암(흩뿌린 용암 기호) */
  k: 'waterfall' | 'geyser' | 'whirl' | 'lava'
  /** 기준점 픽셀 (그 단계 격자) */
  x: number
  y: number
  /** 모양 — 폭포는 떨어지는 쪽(0 아래, 1 오른쪽, 2 왼쪽), 간헐천은 크기(0 보통, 1 작음) */
  v: number
  /** 데이터 id — 한 점 기호·바다 표시·용암 들판 영역 */
  id: string
  /** 효과 상자(fxBox)의 바탕 중 이 타일에 든 몫 — 기호를 찍기 전의 RGBA, 타일 밖의 픽셀은 알파 0 */
  bg?: { w: number; h: number; px: Uint8ClampedArray }
  /** 기준점이 이 타일 안 — 효과의 프레임은 이 자리가 그린다. 아니면 상자가 이 타일에 걸쳐 바탕의 몫만 낸다 */
  main: boolean
  /**
   * 이 타일의 상자 몫에 다른 것이 없다 — 그 기호 뒤에 찍은 것(다른 기호·한 점 기호·헤드론)이나 다른 효과의 기호가 상자에 들면 false.
   * 효과는 그 자리의 몫이 모두 깨끗할 때만 움직인다 (아니면 타일의 멈춘 그림 — 바탕을 깔면 뒤에 찍은 것이 지워지거나 다른 효과의 멈춘 그림이 되살아난다, S5 검토)
   */
  clean: boolean
}

/**
 * 간헐천의 솟구침 (S5 검토) — 데이터의 근거가 솟구친다고 한 것만, FxSpot.v 의 비트로 (2 끓는 물, 4 마그마). 나머지 간헐천 기호는 김만 오른다:
 * tazeem-geyser-pit 'geysers that blast boiling water into the air' (PG Tazeem 'Pit Caves'), akoum-vent-lava '… causing magma geysers to erupt unexpectedly' (PG 2009 아쿰 개요).
 * 아쿰의 다른 가스 분출구('Gases occasionally spew from the ground')·굴 드라즈 지열 늪의 김·베이인의 김 나는 조수 웅덩이는 솟구친다는 서술이 없다
 */
const GEYSER_ERUPT: Record<string, number> = { 'tazeem-geyser-pit': 2, 'akoum-vent-lava': 4 }

/** 효과 상자 — src/pixel/fx/effects.ts 의 fxBox (Worker 가 넘긴다 — 효과 모듈을 이 파일이 부르지 않게) */
export type FxBoxOf = (k: FxSpot['k'], v: number) => { w: number; h: number; ox: number; oy: number }

interface Hedron {
  id: string
  x: number
  y: number
  len: number
  /** 기울기 (라디안) */
  rot: number
  lift: number
  grounded: boolean
  split: boolean
  /** 하나뿐인 거대 헤드론 (Sky Rock·Ikiral) */
  single: boolean
}

export interface Decoded {
  items: Item[]
  /** 깊은 확대의 기호 (attachFine 이 붙인다) — 없으면 그 단계도 items. 지역 상세에 닿는 칸은 빠져 있다 (childFine) */
  fine?: Item[]
  /** 지역 상세에 닿는 칸의 기호와 그 보기 비트 (S9) — 보기마다 fine 에 섞는다 (fineFor) */
  childFine?: { items: Item[]; mask: Uint8Array }
  sea: Item[]
  lines: { water: boolean; pts: [number, number][] }[]
  hatch: Float64Array
  gorges: Ring[]
  rivers: { pts: [number, number][]; w: number[] }[]
  washes: { id: string; k: 'forest' | 'plain' | 'lava'; ring: Ring }[]
  marks: { id: string; kind: string; x: number; y: number; angle: number; size: number }[]
  hedrons: Hedron[]
  /** 대륙 사이의 경계 (S14) */
  borders: { id: string; pts: [number, number][] }[]
  /** 시점별 바탕 (S6) — 있으면 그 시점의 타일 (withPeriod) */
  period?: PeriodDecoded
  /** period 가 있을 때 그 바탕 */
  base?: Decoded
  /** 그 무렵의 한 점 기호 가운데 그림 몫이 있는 것 (id → 기호 종류와 몫) */
  vector?: Map<string, { kind: string; parts: VectorPart[] }>
  /** 바탕의 큰 한 점 기호의 그림 몫 (S15 — 초화산 분화구): 그림판의 그림보다 크게 보이는 단계에서만 이것으로. span 은 몫의 가로 폭 (지도 단위) */
  scaled: Map<string, { kind: string; parts: VectorPart[]; span: number; tall: number; box: [number, number, number, number] }>
}

/** 차이로 적은 점 목록 → 지도 단위의 점 */
const pairs = (p: readonly number[]): [number, number][] => {
  const out: [number, number][] = []
  let x = 0
  let y = 0
  for (let i = 0; i < p.length; i += 2) {
    x += p[i]
    y += p[i + 1]
    out.push([x / 10, y / 10])
  }
  return out
}
const hash = (x: number, y: number) => (Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663)) >>> 0

const decodedCache = new WeakMap<PixelTerrain, Decoded>()

/** 흩뿌린 기호 [종류, x, y(앞 기호와의 차이)] → 그릴 것 */
function decodeGlyphs(kinds: readonly string[], g: readonly number[]): Item[] {
  const items: Item[] = []
  let gy = 0
  for (let i = 0; i < g.length; i += 3) {
    gy += g[i + 2]
    const kind = kinds[g[i]]
    const group = GROUP[kind]
    if (!group || !GLYPH_SPRITES[kind]) continue
    items.push({ kind, x: g[i + 1] / 10, y: gy / 10, group, pick: hash(g[i + 1], gy) % GLYPH_SPRITES[kind].length })
  }
  return items
}

/** [종류 번호, x, y] 를 이어 붙인 것(절대 좌표) → 그릴 것 (y, x 차례) */
function decodeAbs(kinds: readonly string[], g: readonly number[]): Item[] {
  const items: Item[] = []
  for (let i = 0; i < g.length; i += 3) {
    const kind = kinds[g[i]]
    const group = GROUP[kind]
    if (!group || !GLYPH_SPRITES[kind]) continue
    items.push({ kind, x: g[i + 1] / 10, y: g[i + 2] / 10, group, pick: hash(g[i + 1], g[i + 2]) % GLYPH_SPRITES[kind].length })
  }
  return items.sort((a, b) => a.y - b.y || a.x - b.x)
}

const withCache = new WeakMap<Decoded, WeakMap<PeriodDecoded, Decoded>>()
const addCache = new WeakMap<PeriodDecoded, { items: Item[]; fine: Item[] }>()

/**
 * 시점의 타일이 그리는 바탕 — 바탕(base)에 그 단계의 몫을 얹는다. 흩뿌린 기호의 목록(items·fine)은 바탕 것을 그대로 두고 그릴 때 빠짐·더함을 본다
 * (솎은 차례가 바탕과 같게 — thinnedPeriod). 깊은 확대의 기호가 나중에 붙으면(attachFine) 다시 부른다
 */
export function withPeriod(base: Decoded, p: PeriodDecoded, kinds: readonly string[]): Decoded {
  let byP = withCache.get(base)
  if (!byP) withCache.set(base, (byP = new WeakMap()))
  const hit = byP.get(p)
  if (hit && hit.fine === base.fine) return hit
  let adds = addCache.get(p)
  if (!adds) {
    addCache.set(p, (adds = { items: decodeAbs(kinds, p.add), fine: decodeAbs(kinds, p.fineAdd) }))
    // 그 무렵 무늬의 모양 (객체 다듬기 A27–A31)
    attachShapes(adds.items, shapeMap(kinds, p.addPs))
    attachShapes(adds.fine, shapeMap(kinds, p.fineAddPs))
  }
  const marks = [...base.marks, ...p.marks.map(({ parts: _parts, ...m }) => m)].sort((a, b) => a.y - b.y || a.x - b.x)
  const out: Decoded = { ...base, marks, period: p, base, vector: new Map(p.marks.flatMap((m) => (m.parts ? [[m.id, { kind: m.kind, parts: m.parts }] as const] : []))) }
  byP.set(p, out)
  return out
}

/** 깊은 확대 조각 하나를 푼 것 — 그 칸의 기호와 지역 상세 칸의 기호(보기 비트) */
interface FinePart {
  items: Item[]
  child: Item[]
  mask: number[]
  cv: boolean
}
const finePartCache = new WeakMap<PixelTerrainFine, FinePart>()

function decodeFinePart(d: Decoded, t: PixelTerrain, fine: PixelTerrainFine): FinePart {
  const hit = finePartCache.get(fine)
  if (hit) return hit
  const items = decodeGlyphs(t.kinds, fine.g)
  attachShapes(items, shapeMap(t.kinds, fine.ps))
  tagLava(d, items)
  const child: Item[] = []
  const mask: number[] = []
  if (fine.cv) {
    let gy = 0
    const cps = fine.cps
    let ci = 0
    for (let i = 0; i + 3 < fine.cv.length; i += 4) {
      gy += fine.cv[i + 2]
      const kind = t.kinds[fine.cv[i]]
      // 그 줄의 봉우리 모양 (차례를 지키려 그리지 않는 줄도 넘긴다)
      let shape: PeakShape | undefined
      if (cps) {
        const n = cps[ci++]
        if (n) {
          if (SHAPED_KINDS.has(kind)) shape = shapeAt(kind, cps, ci)[0]
          ci += n
        }
      }
      const group = GROUP[kind]
      if (!group || !GLYPH_SPRITES[kind]) continue
      child.push({ kind, x: fine.cv[i + 1] / 10, y: gy / 10, group, pick: hash(fine.cv[i + 1], gy) % GLYPH_SPRITES[kind].length, ...(shape ? { shape } : {}) })
      mask.push(fine.cv[i + 3])
    }
    tagLava(d, child)
  }
  const out = { items, child, mask, cv: !!fine.cv }
  finePartCache.set(fine, out)
  return out
}

const byYX = (a: Item, b: Item) => a.y - b.y || a.x - b.x

/**
 * 깊은 확대의 기호를 붙인다 — 칸마다 나뉜 조각(scripts/pixel/terrain.mjs 의 fineCellsOf)을 받은 만큼 (y, x) 차례로 합친다. 가장 깊은 단계는 기호를 솎지 않아
 * (spacing) 타일에 닿는 칸만 붙어 있으면 그 타일은 전부를 붙였을 때와 같다 — scripts/qa/pixel-fine-cells.mjs. 붙일 때마다 새 목록이라 목록에 걸린 저장(fineFor·thinned)은 새로 센다
 */
export function attachFineParts(d: Decoded, t: PixelTerrain, fines: readonly PixelTerrainFine[]): void {
  const parts = fines.map((f) => decodeFinePart(d, t, f))
  const items = parts.flatMap((p) => p.items)
  // 칸 안은 이미 (y, x, 종류) 차례 — 같은 (y, x) 는 같은 칸이라 안정 정렬이 그 차례를 지킨다
  if (parts.length > 1) items.sort(byYX)
  d.fine = items
  if (parts.some((p) => p.cv)) {
    const rows = parts.flatMap((p) => p.child.map((it, i) => [it, p.mask[i]] as const))
    if (parts.length > 1) rows.sort((a, b) => byYX(a[0], b[0]))
    d.childFine = { items: rows.map((r) => r[0]), mask: Uint8Array.from(rows.map((r) => r[1])) }
  } else d.childFine = undefined
}

/** 타일에 닿는 깊은 확대 칸에 더하는 몫 (지도 단위) — 칸 밖에 밑동이 있고 타일 안으로 그려 들어오는 가장 큰 기호(대지·봉우리 모양 약 13 단위)보다 넉넉히 */
export const FINE_PAD = 40

/** 타일(단계 격자 칸 x0·y0·w·h, 둘레 halo 칸)에 닿는 깊은 확대 칸의 열쇠 '<cx>_<cy>' — 있는 칸만 (src/pixel/tiles/worker.ts, scripts/qa/pixel-fine-cells.mjs) */
export function fineCellKeys(cell: number, has: (k: string) => boolean, u: number, t: { x0: number; y0: number; w: number; h: number }, halo: number): string[] {
  const cx0 = Math.floor(((t.x0 - halo) * u - FINE_PAD) / cell)
  const cy0 = Math.floor(((t.y0 - halo) * u - FINE_PAD) / cell)
  const cx1 = Math.floor(((t.x0 + t.w + halo) * u + FINE_PAD) / cell)
  const cy1 = Math.floor(((t.y0 + t.h + halo) * u + FINE_PAD) / cell)
  const keys: string[] = []
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) if (has(`${cx}_${cy}`)) keys.push(`${cx}_${cy}`)
  return keys
}

/** 깊은 확대의 기호를 한꺼번에 붙인다 — 기호 종류 이름은 바탕 조각의 것 (raw 에 fine 이 같이 실려 오면 decodeTerrain 이 붙인다) */
export function attachFine(d: Decoded, t: PixelTerrain, fine: PixelTerrainFine): void {
  attachFineParts(d, t, [fine])
}

const fineCache = new WeakMap<Item[], Map<number, Item[]>>()

/** 보기(0 끔, t 시점)의 깊은 확대 기호 — 지역 상세에 닿지 않는 칸의 기호에 그 보기의 지역 상세 칸 기호를 섞어 (y, x) 차례로 (S9) */
export function fineFor(d: Decoded, view: number): Item[] {
  const base = d.fine!
  const cf = d.childFine
  if (!cf) return base
  let byView = fineCache.get(base)
  if (!byView) fineCache.set(base, (byView = new Map()))
  const hit = byView.get(view)
  if (hit) return hit
  const bit = 1 << view
  const out = [...base, ...cf.items.filter((_, i) => cf.mask[i] & bit)].sort((a, b) => a.y - b.y || a.x - b.x)
  byView.set(view, out)
  return out
}

/** 지역 상세가 맡은 칸 (S9 — child.ts 의 worldHiddenFn): 세계 지도의 강·협곡·단애·빗금·한 점 기호·바다 표시·헤드론을 그리지 않는다. view 는 깊은 확대 기호의 보기 */
export interface ChildTerrainView {
  view: number
  hidden?: (gx: number, gy: number, u: number) => boolean
}

/** 용암 기호마다 그것이 든 용암 들판 영역의 id — 그 자리의 용암 효과가 그 데이터에서 왔다 (영역 밖의 용암 기호는 효과가 없다) */
function tagLava(d: Decoded, items: Item[]): void {
  const fields = d.washes.filter((w) => w.k === 'lava')
  for (const it of items) if (it.kind === 'lava') it.id = fields.find((f) => pointInRing(it.x, it.y, f.ring))?.id
}

export function decodeTerrain(t: PixelTerrain): Decoded {
  const hit = decodedCache.get(t)
  if (hit) return hit
  if (t.v !== 2) throw new Error(`virtual:pixel-terrain 의 꼴(v${t.v})을 모른다`)
  const items = decodeGlyphs(t.kinds, t.g)
  attachShapes(items, shapeMap(t.kinds, t.ps))
  const hatch = new Float64Array(t.hatch.length)
  for (let i = 0, hx = 0, hy = 0; i < t.hatch.length; i += 4) {
    hx += t.hatch[i]
    hy += t.hatch[i + 1]
    hatch[i] = hx / 10
    hatch[i + 1] = hy / 10
    hatch[i + 2] = t.hatch[i + 2] / 10
    hatch[i + 3] = t.hatch[i + 3] / 10
  }
  const sea: Item[] = []
  for (const m of t.sea) for (const [x, y] of pairs(m.p)) sea.push({ kind: m.k, x, y, group: 'sea', pick: 0, id: m.id })
  sea.sort((a, b) => a.y - b.y || a.x - b.x)
  const out: Decoded = {
    items,
    sea,
    lines: t.lines.map((l) => ({ water: l.w === 1, pts: pairs(l.p) })),
    hatch,
    gorges: t.gorges.map(pairs),
    rivers: t.rivers.map((r) => {
      let w = 0
      return { pts: pairs(r.p), w: r.w.map((v) => (w += v) / 100) }
    }),
    washes: t.washes.map((w) => ({ id: w.id, k: w.k, ring: pairs(w.p) })),
    marks: [...t.marks].sort((a, b) => a.y - b.y || a.x - b.x).map((m) => ({ id: m.id, kind: m.k, x: m.x / 10, y: m.y / 10, angle: m.a, size: m.s })),
    scaled: new Map(
      t.marks.flatMap((m) => {
        if (!m.parts) return []
        const parts: VectorPart[] = m.parts.map((part) => ({ c: part.c, fill: part.f === 1, paths: part.p.map(pairs) }))
        const pts = parts.flatMap((p) => p.paths.flat())
        const box: [number, number, number, number] = [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))]
        return [[m.id, { kind: m.k, parts, span: box[2] - box[0], tall: box[3] - box[1], box }] as const]
      }),
    ),
    borders: (t.borders ?? []).map((b) => ({ id: b.id, pts: pairs(b.p) })),
    hedrons: t.hedrons.map((h) => ({
      id: h.id,
      x: h.x / 10,
      y: h.y / 10,
      len: h.len / 10,
      rot: (h.rot * Math.PI) / 180,
      lift: h.lift / 10,
      grounded: h.gr === 1,
      split: h.sp === 1,
      single: t.hedrons.filter((o) => o.c === h.c).length === 1,
    })),
  }
  if (t.fine) attachFine(out, t, t.fine)
  tagLava(out, out.items)
  decodedCache.set(t, out)
  return out
}

/** 칸 종류를 채운 뒤 더한다 — 숲 채색 영역, 트인 땅(숲을 걷는다), 용암 들판, 협곡 바닥, 강 (world.ts 의 rasterRegion 이 부른다) */
export function addTerrainKinds(d: Decoded, grid: Grid, region: Region, kind: Uint8Array, hidden?: ChildTerrainView['hidden']): void {
  const u = grid.u
  // 지역 상세가 맡은 칸에는 세계 지도의 협곡 바닥·강을 넣지 않는다 (지역 상세가 다시 그렸다 — S9)
  const shown = hidden ? (i: number) => !hidden(region.x0 + (i % region.w), region.y0 + Math.floor(i / region.w), u) : () => true
  for (const w of d.washes) if (w.k === 'forest') fillRing(w.ring, grid, region, (i) => kind[i] === 1 && (kind[i] = 2))
  for (const w of d.washes) if (w.k === 'plain') fillRing(w.ring, grid, region, (i) => kind[i] === 2 && (kind[i] = 1))
  for (const w of d.washes) if (w.k === 'lava') fillRing(w.ring, grid, region, (i) => landish(kind[i]) && (kind[i] = LAVA))
  const p = d.period
  if (p) addPeriodKinds(p, grid, region, kind)
  if (u <= TERRAIN_FROM.lines) d.gorges.forEach((r, n) => !p?.gorgeDrop.has(n) && fillRing(r, grid, region, (i) => landish(kind[i]) && shown(i) && (kind[i] = GORGE)))
  if (u <= TERRAIN_FROM.rivers) {
    for (const r of d.rivers) addRiver(r, grid, region, kind, hidden)
    // 마른 강바닥은 칸을 바꾸지 않는다 — paintTerrain 이 그 땅 위에 점선으로
    if (p) for (const r of p.rivers) if (!r.dry) addRiver(r, grid, region, kind, hidden)
  }
}

/** 강 하나 — 가는 몫은 한 픽셀 선(표본을 이은 브레젠험), 두 픽셀 넘게 굵은 몫은 물길에서 반폭 안의 픽셀. 땅 칸만 바꾼다 (하구는 바다가 덮는다) */
function addRiver(r: { pts: [number, number][]; w: number[] }, g: Grid, reg: Region, kind: Uint8Array, hidden?: ChildTerrainView['hidden']) {
  const u = g.u
  const { x0: rx, y0: ry, w: rw, h: rh } = reg
  const set = (gx: number, gy: number, k: number) => {
    const lx = gx - rx
    const ly = gy - ry
    if (lx < 0 || ly < 0 || lx >= rw || ly >= rh) return
    if (hidden?.(gx, gy, u)) return
    const i = ly * rw + lx
    if (landish(kind[i]) || (k === RIVER_WIDE && kind[i] === RIVER)) kind[i] = k
  }
  for (let s = 0; s + 1 < r.pts.length; s++) {
    const [ax, ay] = r.pts[s]
    const [bx, by] = r.pts[s + 1]
    const half = Math.max(r.w[s], r.w[s + 1]) / 2
    const reach = half / u + 2
    if (Math.max(ax, bx) / u + reach < rx || Math.min(ax, bx) / u - reach > rx + rw || Math.max(ay, by) / u + reach < ry || Math.min(ay, by) / u - reach > ry + rh) continue
    if ((half * 2) / u < 1.5) {
      // 브레젠험 — 끝점은 그 표본이 든 픽셀
      let x0 = Math.floor(ax / u)
      let y0 = Math.floor(ay / u)
      const x1 = Math.floor(bx / u)
      const y1 = Math.floor(by / u)
      const dx = Math.abs(x1 - x0)
      const dy = -Math.abs(y1 - y0)
      const sx = x0 < x1 ? 1 : -1
      const sy = y0 < y1 ? 1 : -1
      let err = dx + dy
      for (;;) {
        set(x0, y0, RIVER)
        if (x0 === x1 && y0 === y1) break
        const e2 = 2 * err
        if (e2 >= dy) {
          err += dy
          x0 += sx
        }
        if (e2 <= dx) {
          err += dx
          y0 += sy
        }
      }
      continue
    }
    const vx = bx - ax
    const vy = by - ay
    const len2 = vx * vx + vy * vy || 1
    const gx0 = Math.max(rx, Math.floor((Math.min(ax, bx) - half) / u))
    const gx1 = Math.min(rx + rw - 1, Math.floor((Math.max(ax, bx) + half) / u))
    const gy0 = Math.max(ry, Math.floor((Math.min(ay, by) - half) / u))
    const gy1 = Math.min(ry + rh - 1, Math.floor((Math.max(ay, by) + half) / u))
    for (let gy = gy0; gy <= gy1; gy++) {
      const my = (gy + 0.5) * u
      for (let gx = gx0; gx <= gx1; gx++) {
        const mx = (gx + 0.5) * u
        const t = Math.max(0, Math.min(1, ((mx - ax) * vx + (my - ay) * vy) / len2))
        const w = r.w[s] + (r.w[s + 1] - r.w[s]) * t
        if ((mx - ax - vx * t) ** 2 + (my - ay - vy * t) ** 2 <= (w / 2) ** 2) set(gx, gy, RIVER_WIDE)
      }
    }
  }
}

/** 솎은 차례 — 단계마다 한 번, 세계 전체를 기호 차례(y, x)대로 훑어 같은 무리의 기호와 d 픽셀(체비쇼프) 안이면 뺀다 */
const thinCache = new WeakMap<Item[], Map<string, Item[]>>()

function thinned(list: Item[], name: string, u: number, dist: (g: Group) => number): Item[] {
  const key = `${name}|${u}`
  let byKey = thinCache.get(list)
  if (!byKey) thinCache.set(list, (byKey = new Map()))
  const hit = byKey.get(key)
  if (hit) return hit
  // 칸 열쇠는 수 — 무리(2 비트)·칸 줄·칸 번호 (칸 번호는 2^14 = 16384 칸 안 — 가장 고운 단계의 지도 폭 9600 픽셀)
  const cells = new Map<number, number[]>()
  const out: Item[] = []
  for (const it of list) {
    const d = dist(it.group)
    if (d < 0) continue
    const px = Math.floor(it.x / u)
    const py = Math.floor(it.y / u)
    if (d > 1) {
      const cx = Math.floor(px / d)
      const cy = Math.floor(py / d)
      const g = GI[it.group] * 2 ** 28
      let near = false
      for (let j = cy - 1; j <= cy + 1 && !near; j++)
        for (let i = cx - 1; i <= cx + 1 && !near; i++) {
          const c = cells.get(g + (j + 1) * 16384 + (i + 1))
          if (c) for (let n = 0; n < c.length && !near; n += 2) near = Math.abs(c[n] - px) < d && Math.abs(c[n + 1] - py) < d
        }
      if (near) continue
      const k = g + (cy + 1) * 16384 + (cx + 1)
      const c = cells.get(k)
      if (c) c.push(px, py)
      else cells.set(k, [px, py])
    }
    out.push(it)
  }
  byKey.set(key, out)
  return out
}

const GI: Record<Group, number> = { tall: 0, tree: 1, low: 2, sea: 3, dead: 4 }
const keyOf = (it: Item) => `${it.kind}:${Math.round(it.x * 10)}:${Math.round(it.y * 10)}`
const periodThin = new WeakMap<Item[], WeakMap<Item[], Map<string, Item[]>>>()

/**
 * 시점의 솎은 차례 — 바탕의 솎은 목록에서 빠진 기호만 빼고, 더한 기호는 남은 기호와 서로를 비켜 끼운다. 세계 전체를 다시 솎지 않는다:
 * 기호 하나가 빠져 그 이웃이 되살아나고 그것이 또 다른 이웃을 빼는 일이 바뀐 자리 밖까지 번지면 바탕 타일과 이음매가 생긴다
 */
function thinnedPeriod(base: Item[], adds: Item[], drop: ReadonlySet<string>, name: string, u: number, dist: (g: Group) => number): Item[] {
  const key = `${name}|${u}`
  // 바탕 목록에도 건다 — 깊은 확대의 기호는 칸을 받을 때마다 새 목록이 된다 (attachFineParts)
  let byBase = periodThin.get(adds)
  if (!byBase) periodThin.set(adds, (byBase = new WeakMap()))
  let byKey = byBase.get(base)
  if (!byKey) byBase.set(base, (byKey = new Map()))
  const hit = byKey.get(key)
  if (hit) return hit
  const kept = thinned(base, name, u, dist).filter((it) => !drop.has(keyOf(it)))
  const cells = new Map<number, number[]>()
  const cellOf = (it: Item, d: number) => GI[it.group] * 2 ** 28 + (Math.floor(Math.floor(it.y / u) / d) + 1) * 16384 + (Math.floor(Math.floor(it.x / u) / d) + 1)
  const mark = (it: Item, d: number) => {
    const k = cellOf(it, d)
    const c = cells.get(k)
    const px = Math.floor(it.x / u)
    const py = Math.floor(it.y / u)
    if (c) c.push(px, py)
    else cells.set(k, [px, py])
  }
  for (const it of kept) {
    const d = dist(it.group)
    if (d > 1) mark(it, d)
  }
  const accepted: Item[] = []
  for (const it of adds) {
    const d = dist(it.group)
    if (d < 0) continue
    if (d > 1) {
      const px = Math.floor(it.x / u)
      const py = Math.floor(it.y / u)
      const cx = Math.floor(px / d)
      const cy = Math.floor(py / d)
      const g = GI[it.group] * 2 ** 28
      let near = false
      for (let j = cy - 1; j <= cy + 1 && !near; j++)
        for (let i = cx - 1; i <= cx + 1 && !near; i++) {
          const c = cells.get(g + (j + 1) * 16384 + (i + 1))
          if (c) for (let n = 0; n < c.length && !near; n += 2) near = Math.abs(c[n] - px) < d && Math.abs(c[n + 1] - py) < d
        }
      if (near) continue
      mark(it, d)
    }
    accepted.push(it)
  }
  const out = [...kept, ...accepted].sort((a, b) => a.y - b.y || a.x - b.x)
  byKey.set(key, out)
  return out
}

type Mode = 'dot' | 'micro' | 'sprite'
const modeAt = (u: number): Mode | null => (u <= TERRAIN_FROM.sprites ? 'sprite' : u <= TERRAIN_FROM.micro ? 'micro' : u <= TERRAIN_FROM.dots ? 'dot' : null)

/** 무리마다 솎는 거리 (픽셀) — 음수면 그 단계에 그리지 않는다 */
function spacing(mode: Mode, u: number) {
  return (g: Group): number => {
    if (mode === 'dot') return g === 'tall' ? 2 : -1
    // 높은 기호는 5 — 봉우리 그림(5×3)이 떨어진 덩어리로 읽히게 (R25)
    if (mode === 'micro') return g === 'tree' ? -1 : g === 'tall' ? 5 : 3
    if (u <= 0.5) return 1
    return g === 'tall' ? 6 : 5
  }
}

// 수정은 그늘빛 (R15 — 밝은 수정빛 점은 눈의 흰 점과 같았다)
const DOT_INK: Record<string, string> = { snow: 'wd', peak: 'rd', 'crystal-spire': 'x', crystal: 'x', mesa: 'sZ' }
const DOT: Record<string, Sprite> = {}
const dotSprite = (kind: string): Sprite => (DOT[kind] ??= { rows: [DOT_INK[kind] ?? 'd'], ax: 0, ay: 0 })

function spriteOf(it: Item, mode: Mode, u = 1): Sprite | undefined {
  if (mode === 'dot') return dotSprite(it.kind)
  if (mode === 'micro') return MICRO_SPRITES[it.kind]
  const large = u <= LARGE_FROM ? LARGE_GLYPH_SPRITES[it.kind] : undefined
  if (large) return large[it.pick % large.length]
  return it.group === 'sea' ? SEA_SPRITES[it.kind] : GLYPH_SPRITES[it.kind]?.[it.pick]
}

const shaped = new Map<string, Sprite | undefined>()
/** 한 점 기호의 그림 — 크기 갈래(작은 것은 따로 찍은 그림, 큰 것은 두 배)와 폭포의 방향 */
function landmarkSprite(kind: string, angle: number, size: number, mode: Mode): Sprite | undefined {
  const cls = sizeClass(size)
  const key = `${mode}|${kind}|${cls}|${kind === 'waterfall' ? angle : 0}`
  if (shaped.has(key)) return shaped.get(key)
  let s: Sprite | undefined
  if (mode === 'micro') s = MICRO_SPRITES[kind]
  else if (mode === 'sprite') {
    s = cls === 'small' ? (LANDMARK_SMALL[kind] ?? LANDMARK_SPRITES[kind]) : LANDMARK_SPRITES[kind]
    if (s && cls === 'large') s = scaleSprite(s, 2)
  }
  if (s && kind === 'waterfall') s = turnSprite(s, angle)
  shaped.set(key, s)
  return s
}

/** 칠한 타일 위에 얹는다 — out 은 inner 영역의 RGBA, kind 는 region 의 칸 종류 (inner ⊂ region) */
export function paintTerrain(
  out: Uint8ClampedArray,
  d: Decoded,
  grid: Grid,
  region: Region,
  kind: Uint8Array,
  inner: Region,
  pal: Palette,
  holes?: ArrayLike<number>,
  fx?: FxSpot[],
  fxBox?: FxBoxOf,
  child?: ChildTerrainView,
  hedronMoves?: readonly [string, number, number, number][],
): void {
  const u = grid.u
  const hidden = child?.hidden
  const tc = pal.t
  const { x0: ix, y0: iy, w: iw, h: ih } = inner
  const kindAt = (gx: number, gy: number) => kind[(gy - region.y0) * region.w + (gx - region.x0)]
  // 누가 마지막으로 찍었나 (효과 자리를 모을 때만) — 찍은 차례 번호. 단애·빗금은 0, 기호·헤드론은 찍을 때마다 하나씩 는다
  const owner = fx ? new Int32Array(iw * ih) : null
  let serial = 0
  const putAny = (gx: number, gy: number, c: Rgb) => {
    const lx = gx - ix
    const ly = gy - iy
    if (lx < 0 || ly < 0 || lx >= iw || ly >= ih) return
    if (owner) owner[ly * iw + lx] = serial
    const o = (ly * iw + lx) * 4
    out[o] = c[0]
    out[o + 1] = c[1]
    out[o + 2] = c[2]
  }
  // 세계 지도 것(단애·빗금·바다 표시·한 점 기호·헤드론)은 지역 상세가 맡은 칸에 찍지 않는다 (S9). 흩뿌린 기호는 그 칸의 보기 기호라 그대로 (putAny)
  // 물 칸 위의 먹(바다 표시·물 위 한 점 기호·헤드론 윤곽)은 물 위 먹 — 밤은 짙은 먹이 깊은 바다에 묻혔다 (S24). 다른 팔레트는 같은 빛이라 바이트가 같다
  const sameInk = tc.inkWet.every((v, i) => v === tc.ink[i])
  const putInk = sameInk ? putAny : (gx: number, gy: number, c: Rgb) => putAny(gx, gy, c === tc.ink && isWetAt(gx, gy) ? tc.inkWet : c)
  const put = hidden ? (gx: number, gy: number, c: Rgb) => !hidden(gx, gy, u) && putInk(gx, gy, c) : putInk
  // 그림자 (가독성 다듬기 R10) — 먹 바둑판 대신 이미 칠한 땅·물 빛을 어둡게 (숲 위는 짙은 초록, 모래 위는 짙은 모래, 물 위는 깊은 물). 그 픽셀만 읽어 타일 차례와 상관없다
  const shade: Shade = (gx, gy) => {
    const lx = gx - ix
    const ly = gy - iy
    if (lx < 0 || ly < 0 || lx >= iw || ly >= ih || hidden?.(gx, gy, u)) return
    if (owner) owner[ly * iw + lx] = serial
    const o = (ly * iw + lx) * 4
    out[o] = Math.round(out[o] * SHADOW_DIM)
    out[o + 1] = Math.round(out[o + 1] * SHADOW_DIM)
    out[o + 2] = Math.round(out[o + 2] * SHADOW_DIM)
  }
  // 금속판 이음매의 밝은 가장자리는 죽은 금속 땅 위에만 (R13 — 평원 가장자리의 이음매에서 숲으로 삐져나왔다)
  const onMetal = (gx: number, gy: number) => gx >= region.x0 && gy >= region.y0 && gx < region.x0 + region.w && gy < region.y0 + region.h && kindAt(gx, gy) === METAL
  const isWetAt = (gx: number, gy: number) => {
    const k = kindAt(gx, gy)
    return k === 0 || k === 3
  }
  const line = (ax: number, ay: number, bx: number, by: number, c: Rgb, onWater = false, dotted = false, dash = false) => {
    let x0 = Math.floor(ax / u)
    let y0 = Math.floor(ay / u)
    const x1 = Math.floor(bx / u)
    const y1 = Math.floor(by / u)
    if (Math.max(x0, x1) < ix || Math.min(x0, x1) >= ix + iw || Math.max(y0, y1) < iy || Math.min(y0, y1) >= iy + ih) return
    const dx = Math.abs(x1 - x0)
    const dy = -Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    for (;;) {
      if (x0 >= ix && y0 >= iy && x0 < ix + iw && y0 < iy + ih && (onWater || !isWetAt(x0, y0)) && (!dotted || ((x0 + y0) & 1) === 0) && (!dash || (x0 + y0) % 6 < 3)) put(x0, y0, c)
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * err
      if (e2 >= dy) {
        err += dy
        x0 += sx
      }
      if (e2 <= dx) {
        err += dx
        y0 += sy
      }
    }
  }
  const stamp = (s: Sprite, px: number, py: number, glyph = false) => {
    const putS = glyph ? putAny : put
    serial++
    const x0 = px - s.ax
    const y0 = py - s.ay
    if (x0 >= ix + iw || y0 >= iy + ih || x0 + s.rows[0].length <= ix || y0 + s.rows.length <= iy) return
    for (let r = 0; r < s.rows.length; r++) {
      const row = s.rows[r]
      for (let c = 0; c < row.length; c++) {
        const ch = row[c]
        if (ch === '.') continue
        const gx = x0 + c
        const gy = y0 + r
        if (ch === '%' && ((gx + gy) & 1) === 1) continue
        // 금속판 이음매의 밝은 가장자리는 죽은 금속 땅 위에만 (R13)
        if (ch === 'S' && !onMetal(gx, gy)) continue
        const key = INK[ch]
        if (key) putS(gx, gy, tc[key as keyof TerrainColors])
      }
    }
  }

  // 단애 — 위 선과 빗금 (물 칸에는 찍지 않는다)
  const per = d.period
  if (u <= TERRAIN_FROM.lines) {
    d.lines.forEach((l, n) => {
      if (per?.lineDrop.has(n)) return
      for (let i = 0; i + 1 < l.pts.length; i++) line(l.pts[i][0], l.pts[i][1], l.pts[i + 1][0], l.pts[i + 1][1], tc.ink)
    })
    // 마른 강바닥 — 그 땅(백악·흰 가루 …) 위에 한 픽셀 점선 (지금 지도의 .river-dry — 물칠 없이 점선 기슭만)
    if (per) for (const r of per.rivers) if (r.dry) for (let i = 0; i + 1 < r.pts.length; i++) line(r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1], tc.crack, false, true)
    // 시점별 바탕의 띠(자국)의 끊긴 잉크
    if (per) for (const b of (u >= 1 ? per.world : per.deep).bands) for (const l of b.ink) for (let i = 0; i + 1 < l.length; i++) line(l[i][0], l[i][1], l[i + 1][0], l[i + 1][1], tc.chalkInk)
  }
  // 대륙 사이의 경계 — 끊긴 한 픽셀 선 (지금 지도의 .continent-borders 의 점선). 칸 번호로 끊어 타일 차례와 상관없다
  if (u <= TERRAIN_FROM.rivers) for (const b of d.borders) for (let i = 0; i + 1 < b.pts.length; i++) line(b.pts[i][0], b.pts[i][1], b.pts[i + 1][0], b.pts[i + 1][1], tc.hatch, false, false, true)
  if (u <= TERRAIN_FROM.hatch) {
    // 빗금 간격이 3 픽셀쯤 되게 차례로 건너뛴다 (해안 절벽 빗금 간격 3.4 단위)
    const every = Math.max(1, Math.ceil((3 * u) / 3.4))
    const h = d.hatch
    for (let i = 0, n = 0; i < h.length; i += 4, n++) {
      if (n % every || per?.hatchSkip[n]) continue
      line(h[i], h[i + 1], h[i] + h[i + 2], h[i + 1] + h[i + 3], tc.hatch)
    }
  }

  const mode = modeAt(u)
  // 그림이 기준점에서 닿는 폭 — 가장 큰 것은 두 배로 그린 8 픽셀 그림 (16)
  const margin = 18
  const nearTile = (x: number, y: number) => {
    const px = x / u
    const py = y / u
    return px >= ix - margin && px < ix + iw + margin && py >= iy - margin && py < iy + ih + margin
  }
  // 움직이는 효과가 붙는 자리 — 그림(sprite)을 그리는 단계에서, 효과 상자가 이 타일에 걸치는 것. 기호를 찍기 전에 부르고, 그때의 바탕을 상자의 이 타일 몫만큼 뜬다.
  // 깨끗한지(clean)는 다 찍은 뒤에 본다 (아래 — 그 기호 뒤에 상자 안에 찍힌 것이 있는지)
  const spots: { s: FxSpot; serial: number; box: { x0: number; y0: number; w: number; h: number } }[] = []
  const spot = (k: FxSpot['k'], px: number, py: number, v: number, id: string | undefined) => {
    if (!fx || !id || mode !== 'sprite') return
    const b = fxBox?.(k, v) ?? { w: 1, h: 1, ox: 0, oy: 0 }
    const bx0 = px - b.ox
    const by0 = py - b.oy
    if (bx0 >= ix + iw || by0 >= iy + ih || bx0 + b.w <= ix || by0 + b.h <= iy) return
    const s: FxSpot = { k, x: px, y: py, v, id, main: px >= ix && px < ix + iw && py >= iy && py < iy + ih, clean: true }
    if (fxBox) {
      const bg = new Uint8ClampedArray(b.w * b.h * 4)
      for (let y = 0; y < b.h; y++)
        for (let x = 0; x < b.w; x++) {
          const lx = bx0 + x - ix
          const ly = by0 + y - iy
          if (lx < 0 || ly < 0 || lx >= iw || ly >= ih) continue
          bg.set(out.subarray((ly * iw + lx) * 4, (ly * iw + lx) * 4 + 4), (y * b.w + x) * 4)
        }
      s.bg = { w: b.w, h: b.h, px: bg }
    }
    // 이 자리의 기호는 바로 다음에 찍힌다 — 그 차례 번호
    spots.push({ s, serial: serial + 1, box: { x0: bx0, y0: by0, w: b.w, h: b.h } })
  }
  if (mode) {
    // 바다 표시 — 이름을 비키지 않는다 (지금 지도도 빼지 않는다)
    if (mode !== 'dot') for (const it of thinned(d.sea, 'sea', u, () => (mode === 'micro' ? 4 : u <= 1 ? 4 : 6))) {
      if (!nearTile(it.x, it.y)) continue
      const s = spriteOf(it, mode)
      if (!s) continue
      // 지역 상세가 맡은 자리의 바다 표시는 그 효과도 두지 않는다 (S9)
      if (hidden?.(Math.floor(it.x / u), Math.floor(it.y / u), u)) continue
      if (it.kind === 'whirl') spot('whirl', Math.floor(it.x / u), Math.floor(it.y / u), 0, it.id)
      stamp(s, Math.floor(it.x / u), Math.floor(it.y / u))
    }
    // 흩뿌린 기호 — 이름 상자에 걸리는 것만 뺀다
    const hp: number[] = []
    if (holes) for (let i = 0; i + 3 < holes.length; i += 4) hp.push(Math.floor(holes[i] / u), Math.floor(holes[i + 1] / u), Math.ceil(holes[i + 2] / u), Math.ceil(holes[i + 3] / u))
    // 깊은 확대는 그 단계에 다시 뿌린 기호 (반 크기·반 간격 — 화면에서 기호 사이가 한 단계 얕은 곳과 비슷하다)
    // 지역 상세에 닿는 칸의 기호는 보기마다 (S9 — fineFor). 솎는 차례도 보기마다
    const deep = u <= FINE_FROM && d.fine
    const view = child?.view ?? 0
    const glyphs = deep ? fineFor(d, view) : d.items
    const thinName = deep ? `glyph:${view}` : 'glyph'
    let list: Item[]
    if (per) {
      const adds = addCache.get(per)!
      list = thinnedPeriod(glyphs, deep ? adds.fine : adds.items, deep ? per.fineDrop : per.drop, thinName, u, spacing(mode, u))
    } else list = thinned(glyphs, thinName, u, spacing(mode, u))
    for (const it of list) {
      // 지금 지도의 모양대로 그리는 봉우리 (객체 다듬기 A1) — 타일 둘레 여유(margin)보다 커서 그 모양의 상자로 타일에 닿는지 본다. 상자가 이름 상자에 걸리면 뺀다
      const sh = mode === 'sprite' && u <= (CRYSTAL_KINDS.has(it.kind) ? CRYSTAL_SHAPED_FROM : it.kind === 'canyon' ? CANYON_SHAPED_FROM : SHAPED_FROM) ? it.shape : undefined
      if (!sh && !nearTile(it.x, it.y)) continue
      if (sh) {
        const bx0 = Math.floor((it.x + sh.box[0]) / u)
        const by0 = Math.floor((it.y + sh.box[1]) / u)
        const bx1 = Math.ceil((it.x + sh.box[2]) / u)
        const by1 = Math.ceil((it.y + sh.box[3]) / u)
        if (bx1 < ix - 1 || bx0 > ix + iw + 1 || by1 < iy - 1 || by0 > iy + ih + 1) continue
        const hits = (x0: number, y0: number, x1: number, y1: number) => {
          for (let i = 0; i < hp.length; i += 4) if (x0 < hp[i + 2] && x1 > hp[i] && y0 < hp[i + 3] && y1 > hp[i + 1]) return true
          return false
        }
        if (sh.polys) {
          // 수정은 기둥마다 — 이름 상자에 걸린 기둥은 칠·빗금째 빼고, 남은 기둥의 테두리가 무리 전체의 반을 넘을 때만 무리를 남긴다 (지금 지도의 cutGlyphs, 2026-11-03)
          const keep = sh.polys.map((poly) => {
            let x0 = Infinity
            let y0 = Infinity
            let x1 = -Infinity
            let y1 = -Infinity
            for (const [px, py] of poly) {
              x0 = Math.min(x0, px)
              y0 = Math.min(y0, py)
              x1 = Math.max(x1, px)
              y1 = Math.max(y1, py)
            }
            return !hits(Math.floor((it.x + x0) / u), Math.floor((it.y + y0) / u), Math.ceil((it.x + x1) / u), Math.ceil((it.y + y1) / u))
          })
          if (!keep.every(Boolean)) {
            const perim = (poly: readonly (readonly [number, number])[]) => poly.reduce((a, p, i) => a + Math.hypot(p[0] - poly[(i + 1) % poly.length][0], p[1] - poly[(i + 1) % poly.length][1]), 0)
            const all = sh.polys.reduce((a, poly) => a + perim(poly), 0)
            const left = sh.polys.reduce((a, poly, i) => a + (keep[i] ? perim(poly) : 0), 0)
            if (left <= all / 2) continue
          }
          serial++
          paintCrystal(it, sh, u, tc, putAny, inner, keep)
          continue
        }
        if (hits(bx0, by0, bx1, by1)) continue
        serial++
        if (it.kind === 'canyon' || PERIOD_LINE[it.kind]) paintLines(it, sh, u, tc, putAny, onMetal)
        else paintPeak(it, sh, u, tc, putAny, inner, it.kind === 'snow')
        continue
      }
      // 개관의 언덕·협곡 단애는 둘에 하나만, 점 단계에서는 그리지 않는다 — 봉우리만 먹 점 (R19: 3 픽셀 간격의 고른 무늬가 흙 뿌린 듯했다). 솎은 자리는 그대로라 봉우리가 옮기지 않는다
      if ((it.kind === 'hill' || it.kind === 'canyon') && (mode === 'dot' || (mode === 'micro' && (Math.floor(it.x * 7 + it.y * 13) & 1)))) continue
      const s = spriteOf(it, mode, u)
      if (!s) continue
      const px = Math.floor(it.x / u)
      const py = Math.floor(it.y / u)
      const bx0 = px - s.ax
      const by0 = py - s.ay
      const bx1 = bx0 + s.rows[0].length
      const by1 = by0 + s.rows.length
      let cut = false
      for (let i = 0; i < hp.length && !cut; i += 4) cut = bx0 < hp[i + 2] && bx1 > hp[i] && by0 < hp[i + 3] && by1 > hp[i + 1]
      if (cut) continue
      if (it.kind === 'lava') spot('lava', px, py, 0, it.id)
      stamp(s, px, py, true)
    }
    // 한 점 지형 기호 — 기호마다 데이터가 있다, 이름을 비키지 않는다
    if (mode !== 'dot')
      for (const m of d.marks) {
        const vec = d.vector?.get(m.id)
        if (vec) {
          serial++
          paintVector(vec.kind, vec.parts, u, tc, put, line, inner, shade)
          continue
        }
        const s = landmarkSprite(m.kind, m.angle, m.size, mode)
        // 큰 한 점 기호(초화산 분화구)는 그림판의 그림이 실제 크기보다 작아지는 단계에서 지도 단위 그대로 (S15 — 개관 가까이에서 8 픽셀 점이었다가 끝 단계에서 갑자기 커졌다)
        const big = d.scaled.get(m.id)
        // 가로나 세로 가운데 하나라도 그림판 그림보다 크면 (첨탑은 좁고 높다)
        if (big && mode === 'sprite' && (big.span / u > (s?.rows[0].length ?? 0) || big.tall / u > (s?.rows.length ?? 0))) {
          const [bx0, by0, bx1, by1] = big.box
          if (bx1 / u < ix - 1 || bx0 / u > ix + iw + 1 || by1 / u < iy - 1 || by0 / u > iy + ih + 1) continue
          // 밑동 한 칸이 지역 상세의 몫이라고 통째로 빼지 않는다 — 띠 안의 첨탑이 토막만 남았다 (S24). 픽셀마다의 put 이 띠를 따라 옅게 물린다
          serial++
          paintVector(big.kind, big.parts, u, tc, put, line, inner, shade)
          continue
        }
        if (!nearTile(m.x, m.y)) continue
        if (!s) continue
        // 지역 상세가 맡은 자리의 한 점 기호는 그 효과도 두지 않는다 — 지역 상세가 다시 그렸다 (S9)
        if (hidden?.(Math.floor(m.x / u), Math.floor(m.y / u), u)) continue
        if (m.kind === 'waterfall') spot('waterfall', Math.floor(m.x / u), Math.floor(m.y / u), Math.abs(m.angle) <= 45 ? 0 : m.angle < 0 ? 1 : 2, m.id)
        // 큰 간헐천(size ≥ 1.5)은 데이터에 없다 — 보통 그림의 효과로. 솟구침은 데이터가 솟구친다고 한 곳만 (GEYSER_ERUPT)
        if (m.kind === 'geyser') spot('geyser', Math.floor(m.x / u), Math.floor(m.y / u), (sizeClass(m.size) === 'small' ? 1 : 0) | (GEYSER_ERUPT[m.id] ?? 0), m.id)
        stamp(s, Math.floor(m.x / u), Math.floor(m.y / u))
      }
  }

  // 이름을 비킨 떠 있는 헤드론 (S20 — 주 스레드가 단계마다 셈한 것, src/pixel/hedrons.ts): 옮긴 자리에, 사라진 것은 그리지 않는다
  const moved = hedronMoves?.length ? new Map(hedronMoves.map((m) => [m[0], m] as const)) : null
  for (const h of d.hedrons) {
    if (u > (h.single ? TERRAIN_FROM.bigHedrons : TERRAIN_FROM.hedrons)) continue
    const mv = moved?.get(h.id)
    if (mv?.[3]) continue
    serial++
    paintHedron(mv ? { ...h, x: h.x + mv[1], y: h.y + mv[2] } : h, u, tc, put, ix, iy, iw, ih, shade)
  }

  // 효과 자리가 깨끗한가 — 상자의 이 타일 몫에서 그 기호보다 뒤에 찍은 픽셀이나 다른 효과 기호의 픽셀이 있으면 아니다
  if (fx && owner && spots.length) {
    const fxSerials = new Set(spots.map((p) => p.serial))
    for (const p of spots) {
      const { x0, y0, w, h } = p.box
      for (let y = Math.max(y0, iy); y < Math.min(y0 + h, iy + ih) && p.s.clean; y++)
        for (let x = Math.max(x0, ix); x < Math.min(x0 + w, ix + iw); x++) {
          const o = owner[(y - iy) * iw + (x - ix)]
          // 지역 상세가 맡은 칸(S9 — 그 위에 지역 상세 그림이 얹힌다)에 걸친 효과는 움직이지 않는다 (효과의 프레임이 그 그림과 띠의 디더링을 덮는다)
          if (o > p.serial || (o !== p.serial && fxSerials.has(o)) || hidden?.(x, y, u)) {
            p.s.clean = false
            break
          }
        }
      fx.push(p.s)
    }
  }
}

/** 그림자가 밑의 땅·물 빛에 곱하는 몫 (R10 — 전에는 먹 바둑판이라 쇠창살·맨홀처럼 읽히고 그림자를 드리운 것보다 짙었다) */
const SHADOW_DIM = 0.82
/** 그림자의 가장자리 몫 — 타원 바깥쪽 이만큼(반지름 제곱의 몫)은 바이어 25% 만 */
const SHADOW_RIM = 0.55
/** 이보다 작은(그 단계 픽셀) 헤드론에는 그림자를 두지 않는다 — 개관에서 두 픽셀 몸통 밑의 그림자가 몸통보다 컸다 */
const SHADOW_MIN_PX = 8
/** 이보다 작은 헤드론은 그림자 토막도 없다 (R23 — 4–8 픽셀은 토막 하나) */
const SHADOW_SMALL_PX = 4
type Shade = (gx: number, gy: number) => void
const bayer4 = (x: number, y: number) => ([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][(y & 3) * 4 + (x & 3)] + 0.5) / 16

/** 그림 몫의 칠 — 지금 지도의 map.css .lm-* 에 맞춘 지형 색 (그림자는 칠하지 않고 밑의 빛을 어둡게 — R10) */
const VECTOR_FILL: Record<string, keyof TerrainColors> = {
  fill: 'rockLight',
  shade: 'rock',
  dark: 'ink',
  water: 'water',
  blood: 'sinew',
  snow: 'snow',
  'fire-wash': 'ember',
}
const VECTOR_STROKE: Record<string, keyof TerrainColors> = { ink: 'ink', hatch: 'rockShade', 'fire-ink': 'lava', 'water-ink': 'water', waterline: 'foam', smoke: 'smoke' }
/** 칠이 가늘어 픽셀 가운데로는 빠지기 쉬운 몫 — 테두리도 같은 색으로, 선 뒤에 (피렉시아의 땅의 힘줄·기름의 강만 — 떨어진 하늘거주지의 어두운 구멍은 지금 지도처럼 잉크 테두리 밑) */
const VECTOR_THIN = new Set(['blood', 'dark'])
const THIN_KINDS = new Set(['compleated-ground-oil', 'compleated-ground'])

/**
 * 그 무렵의 큰 한 점 기호(S6 — 떨어진 하늘거주지, 죽은 금속 평원의 힘줄과 기름의 강)를 그 단계의 픽셀로 — 지금 지도의 landmarkParts 를 꺾은선으로 바꾼 몫을
 * 칠(픽셀 가운데가 안이면)과 한 픽셀 선으로. 그림판의 그림을 키우면 깊은 확대에서 네모난 덩이가 되어 지도 단위 그대로 그린다. 빗금은 한 픽셀이 1 단위 이하일 때만
 */
function paintVector(
  kind: string,
  parts: readonly VectorPart[],
  u: number,
  tc: TerrainColors,
  put: (gx: number, gy: number, c: Rgb) => void,
  line: (ax: number, ay: number, bx: number, by: number, c: Rgb, onWater?: boolean) => void,
  inner: Region,
  shade: Shade,
) {
  const { x0: ix, y0: iy, w: iw } = inner
  const grid: Grid = { w: Infinity, h: Infinity, u }
  // 가는 칠(힘줄·기름의 강)은 선 뒤에 — 그 잉크 테두리가 한두 픽셀 폭의 칠을 덮어 넓은 배율에서 붉은 힘줄이 보이지 않았다
  const thin = (p: VectorPart) => THIN_KINDS.has(kind) && p.fill && VECTOR_THIN.has(p.c)
  const order = [...parts.filter((p) => !thin(p)), ...parts.filter(thin)]
  for (const part of order) {
    if (part.fill) {
      // 기름의 강은 기름빛 (지금 지도의 lm-dark 는 잉크 — 피렉시아의 땅에서만 기름으로 읽히게)
      const c = tc[part.c === 'dark' && THIN_KINDS.has(kind) ? 'oil' : (VECTOR_FILL[part.c] ?? 'rockLight')]
      const shadow = part.c === 'shadow'
      for (const ring of part.paths)
        fillRing(ring, grid, inner, (i) => {
          const gx = ix + (i % iw)
          const gy = iy + Math.floor(i / iw)
          if (shadow) shade(gx, gy)
          else put(gx, gy, c)
        })
      if (thin(part)) for (const ring of part.paths) for (let i = 0; i < ring.length; i++) line(ring[i][0], ring[i][1], ring[(i + 1) % ring.length][0], ring[(i + 1) % ring.length][1], c, true)
    } else {
      if (part.c === 'hatch' && u > 1) continue
      const c = tc[VECTOR_STROKE[part.c] ?? 'ink']
      for (const l of part.paths) for (let i = 0; i + 1 < l.length; i++) line(l[i][0], l[i][1], l[i + 1][0], l[i + 1][1], c, true)
    }
  }
}

/**
 * 지금 지도의 봉우리 모양대로 (객체 다듬기 A1 — terrain.ts 의 mountainGlyph): 꼭대기 왼쪽 면은 밝은 돌빛, 오른쪽 면은 돌빛, 그늘 빗금은 짙은 돌빛,
 * 두 비탈은 한 픽셀 먹선 (지금 지도처럼 밑변에는 선을 긋지 않는다). 뒤(위)의 봉우리부터 그려 앞의 것이 덮는다 — 기호는 y 차례로 온다
 */
function paintPeak(it: Item, sh: PeakShape, u: number, tc: TerrainColors, put: (gx: number, gy: number, c: Rgb) => void, inner: Region, snow = false) {
  const ring: Ring = sh.fill.map(([dx, dy]) => [it.x + dx, it.y + dy])
  const apex = it.x + sh.apex
  const { x0: ix, y0: iy, w: iw } = inner
  // 눈산 (객체 다듬기 A2 — terrain.ts 의 snowGlyph): 빗금 자리의 꺾은선은 눈 경계선이라, 그 위는 눈빛·아래는 돌빛 (경계선 밖의 x 는 가까운 끝의 높이)
  const cap = snow ? sh.hatch[0]?.map(([dx, dy]) => [it.x + dx, it.y + dy] as const) : undefined
  const capY = (x: number) => {
    if (!cap?.length) return -Infinity
    if (x <= cap[0][0]) return cap[0][1]
    for (let k = 0; k + 1 < cap.length; k++) if (x <= cap[k + 1][0]) return cap[k][1] + ((cap[k + 1][1] - cap[k][1]) * (x - cap[k][0])) / (cap[k + 1][0] - cap[k][0] || 1)
    return cap[cap.length - 1][1]
  }
  fillRing(ring, { w: Infinity, h: Infinity, u }, inner, (i) => {
    const gx = ix + (i % iw)
    const gy = iy + Math.floor(i / iw)
    const x = (gx + 0.5) * u
    const left = x < apex
    if (sh.band) {
      // 대지 (객체 다듬기 A4): 꼭대기 한 줄은 밝은 모래, 벼랑 면은 모래 옆빛(꼭대기 오른쪽 30% 는 그늘), 비탈은 밝은 모래
      const y = (gy + 0.5) * u - it.y
      const [ty, yc, tl, tr] = sh.band
      const rx = x - it.x
      put(gx, gy, y < ty + u ? tc.sand : y < yc ? (rx > tl + (tr - tl) * 0.7 ? tc.sandShade : tc.sandSide) : tc.sand)
      return
    }
    put(gx, gy, snow && (gy + 0.5) * u < capY(x) ? (left ? tc.snow : tc.snowShade) : left ? tc.rockLight : tc.rock)
  })
  const seg = (a: readonly [number, number], b: readonly [number, number], c: Rgb) => {
    let x0 = Math.floor(a[0] / u)
    let y0 = Math.floor(a[1] / u)
    const x1 = Math.floor(b[0] / u)
    const y1 = Math.floor(b[1] / u)
    const dx = Math.abs(x1 - x0)
    const dy = -Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    for (;;) {
      put(x0, y0, c)
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * err
      if (e2 >= dy) {
        err += dy
        x0 += sx
      }
      if (e2 <= dx) {
        err += dx
        y0 += sy
      }
    }
  }
  // 산의 그늘 빗금 (눈산은 눈 경계선을 칠의 갈림으로만 — 선을 긋지 않는다)
  if (!snow) for (const l of sh.hatch) for (let i = 0; i + 1 < l.length; i++) seg([it.x + l[i][0], it.y + l[i][1]], [it.x + l[i + 1][0], it.y + l[i + 1][1]], sh.band ? tc.sandShade : tc.rockShade)
  for (let i = 0; i + 1 < ring.length; i++) seg(ring[i], ring[i + 1], tc.ink)
}

/** 지금 지도의 수정 모양대로 (객체 다듬기 A5·A6 — crystalGlyph): 기둥마다 꼭대기 왼쪽은 밝은 수정빛, 오른쪽은 수정빛, 먹 테두리, 결·빗금은 수정 그늘빛. 뒤의(높은) 기둥부터 */
function paintCrystal(it: Item, sh: PeakShape, u: number, tc: TerrainColors, put: (gx: number, gy: number, c: Rgb) => void, inner: Region, keep?: readonly boolean[]) {
  const { x0: ix, y0: iy, w: iw } = inner
  const seg = (a: readonly [number, number], b: readonly [number, number], c: Rgb) => {
    let x0 = Math.floor(a[0] / u)
    let y0 = Math.floor(a[1] / u)
    const x1 = Math.floor(b[0] / u)
    const y1 = Math.floor(b[1] / u)
    const dx = Math.abs(x1 - x0)
    const dy = -Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    for (;;) {
      put(x0, y0, c)
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * err
      if (e2 >= dy) {
        err += dy
        x0 += sx
      }
      if (e2 <= dx) {
        err += dx
        y0 += sy
      }
    }
  }
  const at = (p: readonly [number, number]): [number, number] => [it.x + p[0], it.y + p[1]]
  const polys = sh.polys!
  // 뺀 기둥에 든 결·빗금도 뺀다 — 빗금의 가운데가 남은 기둥 어디에도 들지 않으면
  const inPoly = (p: readonly [number, number], poly: readonly (readonly [number, number])[]) => {
    let inside = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i]
      const [xj, yj] = poly[j]
      if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
  }
  // u1 (R15): 기둥이 2–3 픽셀이라 기둥마다의 먹 테두리와 결 빗금이 바코드·푸른 풀로 읽혔다 — 면만 칠하고 무리 바깥에만 먹 한 줄, 결은 긋지 않는다
  if (u >= 1) {
    const cells = new Map<number, Rgb>()
    const key = (gx: number, gy: number) => gx * 65536 + gy
    const box: Region = { x0: Math.floor((it.x + sh.box[0]) / u) - 1, y0: Math.floor((it.y + sh.box[1]) / u) - 1, w: 0, h: 0 }
    box.w = Math.ceil((it.x + sh.box[2]) / u) + 2 - box.x0
    box.h = Math.ceil((it.y + sh.box[3]) / u) + 2 - box.y0
    polys.forEach((poly, k) => {
      if (keep && !keep[k]) return
      const ring: Ring = poly.map(at)
      let tip = ring[0]
      for (const p of ring) if (p[1] < tip[1]) tip = p
      fillRing(ring, { w: Infinity, h: Infinity, u }, box, (i) => {
        const gx = box.x0 + (i % box.w)
        const gy = box.y0 + Math.floor(i / box.w)
        cells.set(key(gx, gy), (gx + 0.5) * u < tip[0] ? tc.crystalLight : tc.crystal)
      })
    })
    const edge = new Set<number>()
    for (const k of cells.keys()) {
      const gx = Math.floor(k / 65536)
      const gy = k - gx * 65536
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!cells.has(key(gx + dx, gy + dy))) edge.add(key(gx + dx, gy + dy))
    }
    for (const [k, c] of cells) put(Math.floor(k / 65536), k % 65536, c)
    for (const k of edge) put(Math.floor(k / 65536), k % 65536, tc.ink)
    return
  }
  polys.forEach((poly, k) => {
    if (keep && !keep[k]) return
    const ring: Ring = poly.map(at)
    let tip = ring[0]
    for (const p of ring) if (p[1] < tip[1]) tip = p
    fillRing(ring, { w: Infinity, h: Infinity, u }, inner, (i) => {
      const gx = ix + (i % iw)
      const gy = iy + Math.floor(i / iw)
      put(gx, gy, (gx + 0.5) * u < tip[0] ? tc.crystalLight : tc.crystal)
    })
    // 테두리는 닫힌 다각형 (지금 지도의 ridge 도 Z 로 밑변까지)
    for (let i = 0; i < ring.length; i++) seg(ring[i], ring[(i + 1) % ring.length], tc.ink)
  })
  for (const l of sh.hatch) {
    if (keep && !keep.every(Boolean)) {
      const mid: [number, number] = [(l[0][0] + l[l.length - 1][0]) / 2, (l[0][1] + l[l.length - 1][1]) / 2]
      if (!polys.some((poly, k) => keep[k] && inPoly(mid, poly))) continue
    }
    for (let i = 0; i + 1 < l.length; i++) seg(at(l[i]), at(l[i + 1]), tc.crystalShade)
  }
}

/** 기호의 꺾은선이 지나는 픽셀마다 (paintLines 와 같은 선 긋기) */
function walkLines(it: Item, sh: PeakShape, u: number, at: (gx: number, gy: number) => void) {
  for (const l of sh.hatch) {
    if (l.length === 1) at(Math.floor((it.x + l[0][0]) / u), Math.floor((it.y + l[0][1]) / u))
    for (let i = 0; i + 1 < l.length; i++) {
      let x0 = Math.floor((it.x + l[i][0]) / u)
      let y0 = Math.floor((it.y + l[i][1]) / u)
      const x1 = Math.floor((it.x + l[i + 1][0]) / u)
      const y1 = Math.floor((it.y + l[i + 1][1]) / u)
      const dx = Math.abs(x1 - x0)
      const dy = -Math.abs(y1 - y0)
      const sx = x0 < x1 ? 1 : -1
      const sy = y0 < y1 ? 1 : -1
      let err = dx + dy
      for (;;) {
        at(x0, y0)
        if (x0 === x1 && y0 === y1) break
        const e2 = 2 * err
        if (e2 >= dy) {
          err += dy
          x0 += sx
        }
        if (e2 <= dx) {
          err += dx
          y0 += sy
        }
      }
    }
  }
}

/** 지금 지도의 협곡 단애 모양대로 (객체 다듬기 A11 — terrain.ts 의 canyonGlyph): 첫 꺾은선(굽은 단애선)은 먹, 나머지(빗금)는 짙은 돌빛 */
function paintLines(it: Item, sh: PeakShape, u: number, tc: TerrainColors, put: (gx: number, gy: number, c: Rgb) => void, onMetal?: (gx: number, gy: number) => boolean) {
  // 그 무렵 무늬는 모든 획이 그 무늬의 먹 (A27–A31), 점은 한 점짜리 꺾은선
  const period = PERIOD_LINE[it.kind]
  // 금속판 이음매는 홈 바로 밑을 밝게 — 아래 판의 위 가장자리가 빛을 받아 솟은 판으로 읽힌다 (가독성 다듬기 R13: 끊긴 먹 눈금뿐이라 얼음 금처럼 보였다)
  if (it.kind === 'metal') {
    const groove = new Set<number>()
    const lit: [number, number][] = []
    const at = (x: number, y: number) => {
      groove.add(x * 65536 + y)
      lit.push([x, y + 1])
    }
    walkLines(it, sh, u, at)
    for (const [x, y] of lit) if (!groove.has(x * 65536 + y) && (!onMetal || onMetal(x, y))) put(x, y, tc.salt)
  }
  sh.hatch.forEach((l, k) => {
    const c = period ? tc[period] : k === 0 ? tc.ink : tc.rockShade
    // 흰 가루의 점·짧은 토막(3 픽셀 아래)은 u1 에서 빼고 바람결 획만 (R20 — 획 곁의 점이 흩어진 쓰레기처럼 읽혔다)
    if (it.kind === 'dust' && u >= 1) {
      const xs = l.map((p) => Math.floor((it.x + p[0]) / u))
      const ys = l.map((p) => Math.floor((it.y + p[1]) / u))
      if (Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) < 2) return
    }
    if (l.length === 1) put(Math.floor((it.x + l[0][0]) / u), Math.floor((it.y + l[0][1]) / u), c)
    for (let i = 0; i + 1 < l.length; i++) {
      let x0 = Math.floor((it.x + l[i][0]) / u)
      let y0 = Math.floor((it.y + l[i][1]) / u)
      const x1 = Math.floor((it.x + l[i + 1][0]) / u)
      const y1 = Math.floor((it.y + l[i + 1][1]) / u)
      const dx = Math.abs(x1 - x0)
      const dy = -Math.abs(y1 - y0)
      const sx = x0 < x1 ? 1 : -1
      const sy = y0 < y1 ? 1 : -1
      let err = dx + dy
      for (;;) {
        put(x0, y0, c)
        if (x0 === x1 && y0 === y1) break
        const e2 = 2 * err
        if (e2 >= dy) {
          err += dy
          x0 += sx
        }
        if (e2 <= dx) {
          err += dx
          y0 += sy
        }
      }
    }
  })
}

/** 헤드론 — 길쭉한 팔면체(연)를 그 단계 픽셀로 채운다: 왼쪽 면은 밝게, 오른쪽 면은 어둡게, 가장자리는 윤곽. 떠 있는 것은 띄운 만큼 위에, 밑에 그림자 */
function paintHedron(h: Hedron, u: number, tc: TerrainColors, put: (gx: number, gy: number, c: Rgb) => void, ix: number, iy: number, iw: number, ih: number, shade: Shade) {
  const len = h.len
  const wid = len * 0.36
  const gap = h.split ? wid * 0.42 : 0
  const top = -len
  const mid = len * 0.08
  const bot = len * 0.92
  const reach = len + wid + gap + 2
  const cx = h.x
  const cy = h.y - h.lift
  const gx0 = Math.floor((cx - reach) / u)
  const gx1 = Math.floor((cx + reach) / u)
  const gy0 = Math.floor((cy - reach) / u)
  const gy1 = Math.floor((h.y + reach) / u)
  if (gx1 < ix || gx0 >= ix + iw || gy1 < iy || gy0 >= iy + ih) return
  const cos = Math.cos(h.rot)
  const sin = Math.sin(h.rot)
  // 그림자 — 띄운 헤드론 밑 (지금 지도의 rx 5.5, ry 1.8 타원, 오른쪽으로 2). 속은 고르게, 가장자리는 바이어로 성기게 밑의 빛을 어둡게 (R10)
  // 작은 떠 있는 헤드론 (R23) — 몸통 밑 한 픽셀 넘게 띄운 2–4 픽셀 그림자 토막 (몸통과 그림자 사이 틈이 '떠 있다'를 말한다)
  if (!h.grounded && len / u < SHADOW_MIN_PX && len / u >= SHADOW_SMALL_PX) {
    const row = Math.floor(h.y / u)
    const bodyBottom = Math.floor((cy + bot) / u)
    if (row - bodyBottom >= 2) {
      const half = Math.max(1, Math.round((len * 0.18) / u))
      const c = Math.floor((h.x + 1) / u)
      for (let gx = c - half; gx < c + half; gx++) shade(gx, row)
    }
  }
  if (!h.grounded && len / u >= SHADOW_MIN_PX) {
    for (let gy = Math.floor((h.y - 2) / u); gy <= Math.floor((h.y + 2) / u); gy++)
      for (let gx = Math.floor((h.x - 4) / u); gx <= Math.floor((h.x + 8) / u); gx++) {
        const dx = ((gx + 0.5) * u - h.x - 2) / 5.5
        const dy = ((gy + 0.5) * u - h.y) / 1.8
        const r = dx * dx + dy * dy
        if (r <= SHADOW_RIM || (r <= 1 && bayer4(gx, gy) < 0.25)) shade(gx, gy)
      }
  }
  /** 지도 단위의 한 점이 몸통 안인가 — 안이면 왼쪽 면 -1, 오른쪽 면 1, 밖이면 0 */
  const side = (mx: number, my: number): number => {
    const dx = mx - cx
    const dy = my - cy
    // 기울기를 되돌린다
    let lx = dx * cos + dy * sin
    const ly = -dx * sin + dy * cos
    if (ly < top || ly > bot) return 0
    const s = lx < 0 ? -1 : 1
    if (gap) {
      // 쪼개진 헤드론 — 두 쪽이 가운데 줄에서 gap/2 씩 벌어진다
      lx = Math.abs(lx) - gap / 2
      if (lx < 0) return 0
    }
    const hw = ly < mid ? (wid * (ly - top)) / (mid - top) : (wid * (bot - ly)) / (bot - mid)
    return Math.abs(lx) <= hw ? s : 0
  }
  const at = (gx: number, gy: number) => side((gx + 0.5) * u, (gy + 0.5) * u)
  // 작게 보이면(폭이 몇 픽셀) 둘레 윤곽을 두르지 않는다 — 윤곽만 남아 검은 빗금처럼 보였다. 대신 그늘쪽(오른쪽·아래가 밖인 칸)에만 먹 한 줄과 밝은·그늘 두 면
  // (가독성 다듬기 R23: 테도 그림자도 없는 납작한 돌빛 방추라 봉우리에 묻히고 죽은 숲·마른 바닥에서 깃털·종이 조각으로 읽혔다). 폭 3 픽셀 아래는 두 면만
  const small = (wid * 2) / u < 6
  const shadeEdge = small && (wid * 2) / u >= 3 && !h.grounded
  const light = h.grounded ? tc.stone : tc.stoneLight
  const dark = h.grounded ? tc.stoneShade : small ? tc.stoneShade : tc.stone
  for (let gy = Math.max(gy0, iy); gy <= Math.min(gy1, iy + ih - 1); gy++)
    for (let gx = Math.max(gx0, ix); gx <= Math.min(gx1, ix + iw - 1); gx++) {
      const s = at(gx, gy)
      if (!s) continue
      const edge = small ? shadeEdge && (!at(gx + 1, gy) || !at(gx, gy + 1)) : !at(gx - 1, gy) || !at(gx + 1, gy) || !at(gx, gy - 1) || !at(gx, gy + 1)
      put(gx, gy, edge ? tc.ink : s < 0 ? light : dark)
    }
  // 룬 — 크게 보일 때만, 띄운 헤드론의 가운데 줄 곁
  // 룬 — 16 픽셀 넘게 보일 때만 (R7: 작게 보일 때 하늘빛 줄이 얼음 결처럼 읽혔다)
  if (!h.grounded && len / u >= 16) {
    // 띄엄띄엄 점 (R23 — 걸음마다 찍어 끊김 없는 하늘빛 줄이 고드름·유리 조각으로 읽혔다)
    for (let t = -0.3; t <= 0.3; t += Math.max(0.2, (3 * u) / len)) {
      const ly = t * len
      const lx = wid * 0.18
      const mx = cx + lx * cos - ly * sin
      const my = cy + lx * sin + ly * cos
      const gx = Math.floor(mx / u)
      const gy = Math.floor(my / u)
      if (at(gx, gy) && at(gx - 1, gy) && at(gx + 1, gy) && at(gx, gy - 1) && at(gx, gy + 1)) put(gx, gy, tc.rune)
    }
  }
}
