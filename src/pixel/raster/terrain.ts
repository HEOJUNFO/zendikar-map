// 바탕 지형을 타일에 그린다 (S4, docs/pixel-plan.md) — 데이터는 scripts/pixel/terrain.mjs 가 지금 지도의 지형 셈에서 뽑은 것(virtual:pixel-terrain).
// 칸 종류에 더하는 것(채색 영역·협곡 바닥·강)은 rasterRegion 이 칸을 채울 때(addTerrainKinds), 위에 얹는 것(단애·바다 표시·흩뿌린 기호·한 점 기호·헤드론)은
// 칠한 뒤(paintTerrain) 그린다. 무엇을 그릴지·어느 모양인지는 모두 지도 좌표와 단계에서만 정해져(솎기도 세계 전체를 한 차례로 훑는다)
// 타일을 어떤 차례로 그려도 세계 한 장과 같다. 이름 자리(holes)만 화면마다 다르다 — 흩뿌린 기호만 그 상자를 비킨다 (지금 지도의 cutGlyphs 와 같은 몫).
import { pointInRing, type Ring } from '../../map/geometry.ts'
import { fillRing, type Grid, type Region } from './fill.ts'
import type { Palette, Rgb, TerrainColors } from './palette.ts'
import { addPeriodKinds, CHALK, DEAD, DUST, METAL, type PeriodDecoded, type VectorPart } from './period.ts'
import { GLYPH_SPRITES, INK, LANDMARK_SMALL, LANDMARK_SPRITES, MICRO_SPRITES, scaleSprite, SEA_SPRITES, sizeClass, turnSprite, type Sprite } from './terrainSprites.ts'

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
  if (!adds) addCache.set(p, (adds = { items: decodeAbs(kinds, p.add), fine: decodeAbs(kinds, p.fineAdd) }))
  const marks = [...base.marks, ...p.marks.map(({ parts: _parts, ...m }) => m)].sort((a, b) => a.y - b.y || a.x - b.x)
  const out: Decoded = { ...base, marks, period: p, base, vector: new Map(p.marks.flatMap((m) => (m.parts ? [[m.id, { kind: m.kind, parts: m.parts }] as const] : []))) }
  byP.set(p, out)
  return out
}

/** 깊은 확대의 기호를 붙인다 — 기호 종류 이름은 바탕 조각의 것 (raw 에 fine 이 같이 실려 오면 decodeTerrain 이 붙인다) */
export function attachFine(d: Decoded, t: PixelTerrain, fine: PixelTerrainFine): void {
  d.fine = decodeGlyphs(t.kinds, fine.g)
  tagLava(d, d.fine)
  if (fine.cv) {
    const items: Item[] = []
    const mask: number[] = []
    let gy = 0
    for (let i = 0; i + 3 < fine.cv.length; i += 4) {
      gy += fine.cv[i + 2]
      const kind = t.kinds[fine.cv[i]]
      const group = GROUP[kind]
      if (!group || !GLYPH_SPRITES[kind]) continue
      items.push({ kind, x: fine.cv[i + 1] / 10, y: gy / 10, group, pick: hash(fine.cv[i + 1], gy) % GLYPH_SPRITES[kind].length })
      mask.push(fine.cv[i + 3])
    }
    tagLava(d, items)
    d.childFine = { items, mask: Uint8Array.from(mask) }
  }
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
const periodThin = new WeakMap<Item[], Map<string, Item[]>>()

/**
 * 시점의 솎은 차례 — 바탕의 솎은 목록에서 빠진 기호만 빼고, 더한 기호는 남은 기호와 서로를 비켜 끼운다. 세계 전체를 다시 솎지 않는다:
 * 기호 하나가 빠져 그 이웃이 되살아나고 그것이 또 다른 이웃을 빼는 일이 바뀐 자리 밖까지 번지면 바탕 타일과 이음매가 생긴다
 */
function thinnedPeriod(base: Item[], adds: Item[], drop: ReadonlySet<string>, name: string, u: number, dist: (g: Group) => number): Item[] {
  const key = `${name}|${u}`
  let byKey = periodThin.get(adds)
  if (!byKey) periodThin.set(adds, (byKey = new Map()))
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
    if (mode === 'micro') return g === 'tree' ? -1 : 3
    if (u <= 0.5) return 1
    return g === 'tall' ? 6 : 5
  }
}

const DOT_INK: Record<string, string> = { snow: 'w', 'crystal-spire': 'c', crystal: 'c', mesa: 'z' }
const DOT: Record<string, Sprite> = {}
const dotSprite = (kind: string): Sprite => (DOT[kind] ??= { rows: [DOT_INK[kind] ?? 'd'], ax: 0, ay: 0 })

function spriteOf(it: Item, mode: Mode): Sprite | undefined {
  if (mode === 'dot') return dotSprite(it.kind)
  if (mode === 'micro') return MICRO_SPRITES[it.kind]
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
  const put = hidden ? (gx: number, gy: number, c: Rgb) => !hidden(gx, gy, u) && putAny(gx, gy, c) : putAny
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
      if (!nearTile(it.x, it.y)) continue
      const s = spriteOf(it, mode)
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
          paintVector(vec.kind, vec.parts, u, tc, put, line, inner)
          continue
        }
        const s = landmarkSprite(m.kind, m.angle, m.size, mode)
        // 큰 한 점 기호(초화산 분화구)는 그림판의 그림이 실제 크기보다 작아지는 단계에서 지도 단위 그대로 (S15 — 개관 가까이에서 8 픽셀 점이었다가 끝 단계에서 갑자기 커졌다)
        const big = d.scaled.get(m.id)
        // 가로나 세로 가운데 하나라도 그림판 그림보다 크면 (첨탑은 좁고 높다)
        if (big && mode === 'sprite' && (big.span / u > (s?.rows[0].length ?? 0) || big.tall / u > (s?.rows.length ?? 0))) {
          const [bx0, by0, bx1, by1] = big.box
          if (bx1 / u < ix - 1 || bx0 / u > ix + iw + 1 || by1 / u < iy - 1 || by0 / u > iy + ih + 1) continue
          if (hidden?.(Math.floor(m.x / u), Math.floor(m.y / u), u)) continue
          serial++
          paintVector(big.kind, big.parts, u, tc, put, line, inner)
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
    paintHedron(mv ? { ...h, x: h.x + mv[1], y: h.y + mv[2] } : h, u, tc, put, ix, iy, iw, ih)
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

/** 그림 몫의 칠 — 지금 지도의 map.css .lm-* 에 맞춘 지형 색 (그림자는 윤곽색을 바둑판으로) */
const VECTOR_FILL: Record<string, keyof TerrainColors> = {
  shadow: 'ink',
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
      const checker = part.c === 'shadow'
      for (const ring of part.paths)
        fillRing(ring, grid, inner, (i) => {
          const gx = ix + (i % iw)
          const gy = iy + Math.floor(i / iw)
          if (!checker || ((gx + gy) & 1) === 0) put(gx, gy, c)
        })
      if (thin(part)) for (const ring of part.paths) for (let i = 0; i < ring.length; i++) line(ring[i][0], ring[i][1], ring[(i + 1) % ring.length][0], ring[(i + 1) % ring.length][1], c, true)
    } else {
      if (part.c === 'hatch' && u > 1) continue
      const c = tc[VECTOR_STROKE[part.c] ?? 'ink']
      for (const l of part.paths) for (let i = 0; i + 1 < l.length; i++) line(l[i][0], l[i][1], l[i + 1][0], l[i + 1][1], c, true)
    }
  }
}

/** 헤드론 — 길쭉한 팔면체(연)를 그 단계 픽셀로 채운다: 왼쪽 면은 밝게, 오른쪽 면은 어둡게, 가장자리는 윤곽. 떠 있는 것은 띄운 만큼 위에, 밑에 그림자 */
function paintHedron(h: Hedron, u: number, tc: TerrainColors, put: (gx: number, gy: number, c: Rgb) => void, ix: number, iy: number, iw: number, ih: number) {
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
  // 그림자 — 띄운 헤드론 밑 (지금 지도의 rx 5.5, ry 1.8 타원, 오른쪽으로 2)
  if (!h.grounded) {
    for (let gy = Math.floor((h.y - 2) / u); gy <= Math.floor((h.y + 2) / u); gy++)
      for (let gx = Math.floor((h.x - 4) / u); gx <= Math.floor((h.x + 8) / u); gx++) {
        const dx = ((gx + 0.5) * u - h.x - 2) / 5.5
        const dy = ((gy + 0.5) * u - h.y) / 1.8
        if (dx * dx + dy * dy <= 1 && ((gx + gy) & 1) === 0) put(gx, gy, tc.ink)
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
  // 작게 보이면(폭이 몇 픽셀) 윤곽을 두르지 않는다 — 윤곽만 남아 검은 빗금처럼 보였다. 그때는 면을 한 단 어둡게
  const small = (wid * 2) / u < 6
  const light = h.grounded || small ? tc.stone : tc.stoneLight
  const dark = h.grounded || small ? tc.stoneShade : tc.stone
  for (let gy = Math.max(gy0, iy); gy <= Math.min(gy1, iy + ih - 1); gy++)
    for (let gx = Math.max(gx0, ix); gx <= Math.min(gx1, ix + iw - 1); gx++) {
      const s = at(gx, gy)
      if (!s) continue
      const edge = !small && (!at(gx - 1, gy) || !at(gx + 1, gy) || !at(gx, gy - 1) || !at(gx, gy + 1))
      put(gx, gy, edge ? tc.ink : s < 0 ? light : dark)
    }
  // 룬 — 크게 보일 때만, 띄운 헤드론의 가운데 줄 곁
  if (!h.grounded && len / u >= 10) {
    for (let t = -0.4; t <= 0.4; t += u / len / 2) {
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
