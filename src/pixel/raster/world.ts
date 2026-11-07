// 세계 지도 한 단계(u)를 픽셀로 그린다 — 칸 종류(바다·땅·숲·육지 안의 물)를 채우고, 물가 띠·해안선·숲 가장자리·땅 얼룩을 칠한다.
// S1(docs/pixel-plan.md)은 타일 없이 단계마다 세계 전체를 한 장으로 그린다 (u ≥ 1 이면 많아야 2400×1700 = 4.1M 픽셀).
// 모든 무늬는 지도 좌표와 픽셀 칸 번호에서만 정해져 같은 단계는 매번 같은 그림이 된다.
import { valueNoise2D, type Ring } from '../../map/geometry'
import { fillRing, gridFor, type Grid } from './fill'
import type { Palette, Rgb } from './palette'

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

export interface WorldCells {
  grid: Grid
  /** 칸 종류 (SEA·LAND·FOREST·LAKE) */
  kind: Uint8Array
  /** 물 칸에서 가장 가까운 땅까지의 거리 (픽셀, 3-4 챔퍼 ÷ 3), 땅 칸은 0 */
  shore: Float32Array
}

/** 칸 종류 채우기 — 땅, 그 위 숲(땅 위만), 육지 안의 물 차례 */
export function rasterCells(rings: WorldRings, u: number): WorldCells {
  const grid = gridFor(rings.width, rings.height, u)
  const kind = new Uint8Array(grid.w * grid.h)
  for (const r of rings.lands) fillRing(r, grid, (i) => (kind[i] = LAND))
  for (const r of rings.forests) fillRing(r, grid, (i) => kind[i] === LAND && (kind[i] = FOREST))
  for (const r of rings.inland) fillRing(r, grid, (i) => (kind[i] = LAKE))
  return { grid, kind, shore: shoreDistance(grid, kind) }
}

const isWet = (k: number) => k === SEA || k === LAKE

/** 물 칸마다 땅까지의 거리 — 두 번 훑는 3-4 챔퍼 (팔각형에 가까운 띠가 되어 네모난 계단이 덜 보인다) */
function shoreDistance(g: Grid, kind: Uint8Array): Float32Array {
  const { w, h } = g
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

/** 4×4 바이어 행렬 — 문턱 (v + 0.5) / 16 */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const bayer = (x: number, y: number) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16

export type ShoreStyle = 'dither' | 'band' | 'none'
export const isShoreStyle = (v: string | null): v is ShoreStyle => v === 'dither' || v === 'band' || v === 'none'

/** 물가 띠의 경계 (해안에서 픽셀 거리) — 물거품 | 얕은 물 | 중간 | 먼 바다 */
const FOAM = 1
const SHALLOW = 3.5
const MID = 7

export interface PaintOptions {
  shore: ShoreStyle
}

/** 칸 종류를 팔레트로 칠한 RGBA */
export function paintCells(cells: WorldCells, pal: Palette, opt: PaintOptions): Uint8ClampedArray<ArrayBuffer> {
  const { grid, kind, shore } = cells
  const { w, h, u } = grid
  const out = new Uint8ClampedArray(new ArrayBuffer(w * h * 4))
  // 얼룩은 지도 좌표에 붙인다 — 단계가 바뀌어도 같은 자리에 같은 얼룩이 있다 (작은 단계에서는 작게 보일 뿐)
  const landBlot = valueNoise2D(0x51ab, 46)
  const forestBlot = valueNoise2D(0x7f0e, 22)
  const set = (i: number, c: Rgb) => {
    const o = i * 4
    out[o] = c[0]
    out[o + 1] = c[1]
    out[o + 2] = c[2]
    out[o + 3] = 255
  }
  /** d 가 경계 b 를 지나는 자리를 폭 2 픽셀에 걸쳐 바이어로 섞는다 — 안쪽이면 true */
  const inside = (d: number, b: number, x: number, y: number) => {
    if (opt.shore !== 'dither') return d <= b
    const t = (d - (b - 1)) / 2
    return t <= 0 ? true : t >= 1 ? false : t < bayer(x, y)
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const k = kind[i]
      const mx = (x + 0.5) * u
      const my = (y + 0.5) * u
      if (isWet(k)) {
        const d = shore[i]
        if (opt.shore === 'none') set(i, pal.deep)
        else if (d <= FOAM) set(i, pal.foam)
        else if (inside(d, SHALLOW, x, y)) set(i, pal.shallow)
        else if (inside(d, MID, x, y)) set(i, pal.mid)
        else set(i, pal.deep)
        continue
      }
      // 땅: 물에 맞닿은 칸은 해안선
      const wetN =
        (x > 0 && isWet(kind[i - 1])) ||
        (x < w - 1 && isWet(kind[i + 1])) ||
        (y > 0 && isWet(kind[i - w])) ||
        (y < h - 1 && isWet(kind[i + w]))
      if (wetN) {
        set(i, pal.coast)
        continue
      }
      if (k === FOREST) {
        const edge =
          (x > 0 && kind[i - 1] !== FOREST) ||
          (x < w - 1 && kind[i + 1] !== FOREST) ||
          (y > 0 && kind[i - w] !== FOREST) ||
          (y < h - 1 && kind[i + w] !== FOREST)
        if (edge) set(i, pal.forestEdge)
        else set(i, forestBlot(mx, my) - 0.5 > bayer(x, y) * 0.5 ? pal.forestShade : pal.forest)
        continue
      }
      // 땅 얼룩 — 노이즈가 높은 곳만, 가장자리는 바이어로 성기게
      const n = landBlot(mx, my)
      set(i, n > 0.66 || (n > 0.56 && (n - 0.56) / 0.1 > bayer(x, y)) ? pal.landShade : pal.land)
    }
  }
  return out
}
