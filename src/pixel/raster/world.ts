// 세계 지도 한 단계(u)의 한 영역을 픽셀로 그린다 — 칸 종류(바다·땅·숲·육지 안의 물)를 채우고, 물가 띠·해안선·숲 가장자리·땅 얼룩을 칠한다.
// S2(docs/pixel-plan.md)부터 타일로 그린다: 타일과 그 둘레(HALO)를 채우고 거리를 센 뒤 타일만 칠한다.
// 모든 무늬는 지도 좌표와 단계 격자의 칸 번호에서만 정해져, 타일을 어떤 차례로 그려도 세계 한 장을 한 번에 그린 것과 바이트까지 같다
// (scripts/qa/pixel-regress.mjs 가 본다).
import { valueNoise2D, type Ring } from '../../map/geometry.ts'
import { childrenIn, paintChildren, worldHiddenFn, type ChildPaint } from './child.ts'
import { fillRing, gridFor, type Grid, type Region } from './fill.ts'
import type { Palette, Rgb } from './palette.ts'
import { CHALK, DEAD, DRYBED, DUST, METAL } from './period.ts'
import { addTerrainKinds, GORGE, LAVA, paintTerrain, RIVER, RIVER_WIDE, type Decoded, type FxBoxOf, type FxSpot } from './terrain.ts'

export const SEA = 0
export const LAND = 1
export const FOREST = 2
export const LAKE = 3

export interface WorldRings {
  width: number
  height: number
  lands: readonly Ring[]
  forests: readonly Ring[]
  inland: readonly Ring[]
}

/** 물가 띠의 경계 (해안에서 픽셀 거리) — 물거품 | 얕은 물 | 중간 | 먼 바다 */
const FOAM = 1
const SHALLOW = 3.5
const MID = 7
/** 디더링 폭 — 경계의 앞뒤 1 픽셀 */
const DITHER = 1
/**
 * 타일 둘레에 더 채우는 폭 (픽셀). 물가 띠는 거리 MID + DITHER = 8 픽셀까지만 쓰이고, 그보다 먼 칸은 모두 먼 바다다.
 * 8 픽셀 안의 땅은 둘레 안에 있고, 3-4 챔퍼의 길은 두 칸을 담는 상자 안을 지나니 둘레 안에서 센 거리가 세계 전체에서 센 것과 같다.
 */
export const HALO = 10

export interface RegionCells {
  grid: Grid
  region: Region
  /** 칸 종류 (SEA·LAND·FOREST·LAKE), 영역 안 줄 × 폭 */
  kind: Uint8Array
  /** 물 칸에서 가장 가까운 땅까지의 거리 (픽셀, 3-4 챔퍼 ÷ 3, 영역 안에서 센다), 땅 칸은 0 */
  shore: Float32Array
}

/** 영역을 격자 안으로 자른다 */
export function clipRegion(g: Grid, r: Region): Region {
  const x0 = Math.max(0, r.x0)
  const y0 = Math.max(0, r.y0)
  return { x0, y0, w: Math.min(g.w, r.x0 + r.w) - x0, h: Math.min(g.h, r.y0 + r.h) - y0 }
}

/** 칸 종류 채우기 — 땅, 그 위 숲(땅 위만), 육지 안의 물 차례. 바탕 지형(S4)이 있으면 채색 영역·협곡 바닥·강을 더한다 (terrain.ts) */
export function rasterRegion(rings: WorldRings, u: number, want: Region, terrain?: Decoded, hidden?: (gx: number, gy: number, u: number) => boolean): RegionCells {
  const grid = gridFor(rings.width, rings.height, u)
  const region = clipRegion(grid, want)
  const kind = new Uint8Array(Math.max(0, region.w * region.h))
  for (const r of rings.lands) fillRing(r, grid, region, (i) => (kind[i] = LAND))
  for (const r of rings.forests) fillRing(r, grid, region, (i) => kind[i] === LAND && (kind[i] = FOREST))
  for (const r of rings.inland) fillRing(r, grid, region, (i) => (kind[i] = LAKE))
  if (terrain) addTerrainKinds(terrain, grid, region, kind, hidden)
  return { grid, region, kind, shore: shoreDistance(region.w, region.h, kind) }
}

const isWet = (k: number) => k === SEA || k === LAKE

/** 물 칸마다 땅까지의 거리 — 두 번 훑는 3-4 챔퍼 (팔각형에 가까운 띠가 되어 네모난 계단이 덜 보인다) */
function shoreDistance(w: number, h: number, kind: Uint8Array): Float32Array {
  const BIG = 1e9
  const d = new Float32Array(w * h)
  for (let i = 0; i < d.length; i++) d[i] = isWet(kind[i]) ? BIG : 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (d[i] === 0) continue
      let v = d[i]
      if (x > 0) v = Math.min(v, d[i - 1] + 3)
      if (y > 0) {
        v = Math.min(v, d[i - w] + 3)
        if (x > 0) v = Math.min(v, d[i - w - 1] + 4)
        if (x < w - 1) v = Math.min(v, d[i - w + 1] + 4)
      }
      d[i] = v
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x
      if (d[i] === 0) continue
      let v = d[i]
      if (x < w - 1) v = Math.min(v, d[i + 1] + 3)
      if (y < h - 1) {
        v = Math.min(v, d[i + w] + 3)
        if (x < w - 1) v = Math.min(v, d[i + w + 1] + 4)
        if (x > 0) v = Math.min(v, d[i + w - 1] + 4)
      }
      d[i] = v
    }
  }
  for (let i = 0; i < d.length; i++) d[i] = d[i] >= BIG ? 999 : d[i] / 3
  return d
}

/** 4×4 바이어 행렬 — 문턱 (v + 0.5) / 16. 단계 격자의 칸 번호로 읽는다 (타일 사이에 무늬가 끊기지 않게) */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const bayer = (x: number, y: number) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16

export type ShoreStyle = 'dither' | 'band' | 'none'
export const isShoreStyle = (v: string | null): v is ShoreStyle => v === 'dither' || v === 'band' || v === 'none'

export interface PaintOptions {
  shore: ShoreStyle
  /** 바탕 지형 (S4) — 없으면 S2 의 해안·내해·숲만 */
  terrain?: Decoded
  /** 흩뿌린 기호가 비키는 이름 상자 [x0, y0, x1, y1] (지도 단위) — terrain.ts 의 paintTerrain */
  holes?: ArrayLike<number>
  /** 이름을 비킨 떠 있는 헤드론 (S20) [id, dx, dy, 사라짐 1] */
  hedrons?: readonly [string, number, number, number][]
  /** 움직이는 효과(S5)가 붙는 자리를 여기에 모은다 (Worker 가 타일과 함께 보낸다) */
  fx?: FxSpot[]
  /** 효과 상자 — 있으면 효과 자리마다 그 바탕을 뜬다 */
  fxBox?: FxBoxOf
  /** 지역 상세 (S9) — 가장 깊은 단계에서 그 타일에 닿는 지역 상세의 그림과 보기. 그 범위의 세계 지도 것은 물린다 */
  child?: ChildPaint
}

// 얼룩은 지도 좌표에 붙인다 — 단계가 바뀌어도 같은 자리에 같은 얼룩이 있다 (작은 단계에서는 작게 보일 뿐)
const landBlot = valueNoise2D(0x51ab, 46)
const forestBlot = valueNoise2D(0x7f0e, 22)
const lavaBlot = valueNoise2D(0x1a7a, 9)
// 시점별 바탕(S6)의 칠 얼룩 — 칠마다 다른 씨앗
const dustBlot = valueNoise2D(0xd057, 30)
const metalBlot = valueNoise2D(0x3e7a, 18)
const bedBlot = valueNoise2D(0xbed0, 14)

/**
 * 영역의 칸 종류를 팔레트로 칠한 RGBA — inner(격자 칸 번호, 영역 안)만 낸다.
 * 가장자리 판정(해안선·숲 가장자리)은 이웃 칸을 보니 inner 둘레에 한 칸 넘게 영역이 있어야 세계 한 장과 같다 (격자 끝은 빼고).
 */
export function paintRegion(cells: RegionCells, pal: Palette, opt: PaintOptions, inner: Region): Uint8ClampedArray<ArrayBuffer> {
  const { grid, region, kind, shore } = cells
  const { u } = grid
  const rw = region.w
  const out = new Uint8ClampedArray(new ArrayBuffer(inner.w * inner.h * 4))
  let o = 0
  const put = (c: Rgb) => {
    out[o] = c[0]
    out[o + 1] = c[1]
    out[o + 2] = c[2]
    out[o + 3] = 255
  }
  /** d 가 경계 b 를 지나는 자리를 폭 2 픽셀에 걸쳐 바이어로 섞는다 — 안쪽이면 true */
  const inside = (d: number, b: number, x: number, y: number) => {
    if (opt.shore !== 'dither') return d <= b
    const t = (d - (b - DITHER)) / (2 * DITHER)
    return t <= 0 ? true : t >= 1 ? false : t < bayer(x, y)
  }
  // 영역 안의 이웃 — 격자 끝(영역의 끝이기도 하다)에서는 이웃이 없다
  const lx0 = inner.x0 - region.x0
  const ly0 = inner.y0 - region.y0
  for (let ly = ly0; ly < ly0 + inner.h; ly++) {
    const gy = region.y0 + ly
    for (let lx = lx0; lx < lx0 + inner.w; lx++, o += 4) {
      const gx = region.x0 + lx
      const i = ly * rw + lx
      const k = kind[i]
      const mx = (gx + 0.5) * u
      const my = (gy + 0.5) * u
      if (isWet(k)) {
        const d = shore[i]
        if (opt.shore === 'none') put(pal.deep)
        else if (d <= FOAM) put(pal.foam)
        else if (inside(d, SHALLOW, gx, gy)) put(pal.shallow)
        else if (inside(d, MID, gx, gy)) put(pal.mid)
        else put(pal.deep)
        continue
      }
      if (k === RIVER || k === RIVER_WIDE) {
        put(pal.t.water)
        continue
      }
      // 이웃 칸 종류 — 격자 끝(영역의 끝이기도 하다)에서는 이웃이 없다 (-1)
      const kL = lx > 0 ? kind[i - 1] : -1
      const kR = lx < rw - 1 ? kind[i + 1] : -1
      const kU = ly > 0 ? kind[i - rw] : -1
      const kD = ly < region.h - 1 ? kind[i + rw] : -1
      // 땅: 물에 맞닿은 칸은 해안선, 굵은 강에 맞닿은 칸은 기슭. 물이 빠진 바닥(S6)에 맞닿은 땅 칸도 — 옛 물가가 남는다 (지금 지도는 바닥을 물가 선 안쪽 반에만 칠한다)
      if (
        isWet(kL) || isWet(kR) || isWet(kU) || isWet(kD) ||
        kL === RIVER_WIDE || kR === RIVER_WIDE || kU === RIVER_WIDE || kD === RIVER_WIDE ||
        (k !== DRYBED && (kL === DRYBED || kR === DRYBED || kU === DRYBED || kD === DRYBED))
      ) {
        put(pal.coast)
        continue
      }
      if (k >= DUST) {
        const t = pal.t
        // 칠의 가장자리 — 이웃이 다른 땅 칸이면 (격자 끝은 빼고)
        const other = (n: number) => n >= 0 && n !== k && n !== RIVER
        const edge = other(kL) || other(kR) || other(kU) || other(kD)
        // 흰 가루·백악·죽은 숲·금속은 고른 면에 그늘빛 드문 점만 (가독성 다듬기 R5: 큰 바둑판 얼룩이 흰 가루를 모래 언덕·안개로, 죽은 숲을 구름 그림자로,
        // 금속 평원을 언 못으로 읽히게 하고 그 위의 가는 무늬 기호(A27–A31)를 흐렸다 — 지금 지도의 그 무렵 칠은 고르다. 결은 무늬 기호가 맡는다)
        const speck = (f: (x: number, y: number) => number) => f(mx, my) > 0.75 && bayer(gx, gy) < 0.12
        if (k === DUST) put(edge || speck(dustBlot) ? t.dustShade : t.dust)
        else if (k === CHALK) put(edge || speck(dustBlot) ? t.chalkShade : t.chalk)
        else if (k === METAL) put(edge ? t.seam : speck(metalBlot) ? t.metalShade : t.metal)
        else if (k === DEAD) put(edge ? t.barkShade : speck(forestBlot) ? t.deadShade : t.dead)
        // 마른 바닥 — 다른 그 무렵 칠처럼 고른 진흙에 그늘빛 드문 점, 가장자리는 한 단 어둡게 (가독성 다듬기 R29: 노이즈 봉우리마다 흰 소금 점을 흩어 눈 더미·서리·자갈밭으로
        // 읽히고 금과 그 위의 작은 그림을 덮었다 — 지금 지도는 갈라진 금이 있는 고른 황갈 바닥. 결은 무늬 기호(갈라짐)가 맡는다)
        else if (k === DRYBED) put(edge || speck(bedBlot) ? t.drybedShade : t.drybed)
        else put(pal.land)
        continue
      }
      if (k === LAVA) {
        // 용암 들판 — 식은 겉에 노이즈가 높은 곳만 흐르는 용암, 가장 높은 곳은 뜨겁게 (바이어로 가장자리를 섞는다). 들판 가장자리는 불씨 빛
        const n = lavaBlot(mx, my)
        // 식은 재빛 땅에 노이즈가 가장 높은 몇 곳만 용암 웅덩이 (R33 — 노이즈 등고선으로 금을 그으면 닫힌 고리라 지형도의 등고선으로 읽혔다. 금은 흩뿌린 용암 기호가 맡는다). 가장자리는 재 그늘
        if ((kL >= 0 && kL !== LAVA) || (kR >= 0 && kR !== LAVA) || (kU >= 0 && kU !== LAVA) || (kD >= 0 && kD !== LAVA)) put(pal.t.ashShade)
        else if (n > 0.9) put(pal.t.lavaHot)
        else if (n > 0.86) put(pal.t.lava)
        else put(n > 0.72 && bayer(gx, gy) < 0.12 ? pal.t.ashShade : pal.t.ash)
        continue
      }
      if (k === GORGE) {
        put(pal.t.gorge)
        continue
      }
      if (k === FOREST) {
        // 숲 가장자리 — 강(한 픽셀)은 숲을 가르지 않는다
        const edge = (kL >= 0 && kL !== FOREST && kL !== RIVER) || (kR >= 0 && kR !== FOREST && kR !== RIVER) || (kU >= 0 && kU !== FOREST && kU !== RIVER) || (kD >= 0 && kD !== FOREST && kD !== RIVER)
        if (edge) put(pal.forestEdge)
        else put(forestBlot(mx, my) - 0.5 > bayer(gx, gy) * 0.5 ? pal.forestShade : pal.forest)
        continue
      }
      // 땅 얼룩 — 노이즈가 높은 곳만, 가장자리는 바이어로 성기게
      const n = landBlot(mx, my)
      put(n > 0.66 || (n > 0.56 && (n - 0.56) / 0.1 > bayer(gx, gy)) ? pal.landShade : pal.land)
    }
  }
  return out
}

/** 타일 한 장 — 둘레 HALO 를 더 채워 거리를 세고 타일만 칠한 뒤, 바탕 지형이 있으면 그 위에 얹는다 */
export function renderTile(rings: WorldRings, u: number, tile: Region, pal: Palette, opt: PaintOptions): Uint8ClampedArray<ArrayBuffer> {
  const want = { x0: tile.x0 - HALO, y0: tile.y0 - HALO, w: tile.w + 2 * HALO, h: tile.h + 2 * HALO }
  // 지역 상세가 맡은 칸 — 둘레(HALO)까지 닿는 지역 상세만 본다 (그림의 단계에서만)
  const c = opt.child && u === opt.child.meta.u ? opt.child : undefined
  const hidden = c ? worldHiddenFn(childrenIn(c.meta, want.x0 * u, want.y0 * u, (want.x0 + want.w) * u, (want.y0 + want.h) * u)) : undefined
  const cells = rasterRegion(rings, u, want, opt.terrain, hidden)
  const out = paintRegion(cells, pal, opt, tile)
  if (opt.terrain) paintTerrain(out, opt.terrain, cells.grid, cells.region, cells.kind, tile, pal, opt.holes, opt.fx, opt.fxBox, c ? { view: c.view, hidden } : undefined, opt.hedrons)
  if (c) {
    const { region, kind } = cells
    const k = (gx: number, gy: number) => kind[(gy - region.y0) * region.w + (gx - region.x0)]
    paintChildren(out, c, tile, pal, (gx, gy) => isWet(k(gx, gy)), (gx, gy) => k(gx, gy) === FOREST, (gx, gy) => k(gx, gy) === LAND)
  }
  return out
}
