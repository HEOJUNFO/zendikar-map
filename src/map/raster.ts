// 기호 배치용 래스터 — 폴리곤 판정을 격자 조회로 바꿔 수만 번의 point-in-polygon 을 피한다.
import { forests, inlandWaters, landmasses, MAP_HEIGHT, MAP_WIDTH } from './geo'
import type { Ring } from './geometry'

/** 격자 1칸 = 2 지도 단위 */
const CELL = 2
const GW = Math.ceil(MAP_WIDTH / CELL)
const GH = Math.ceil(MAP_HEIGHT / CELL)

export interface TerrainRaster {
  /** landmasses 배열 인덱스, 바다면 -1 */
  landAt(x: number, y: number): number
  /** 가장 가까운 해안까지 거리(지도 단위), 바다면 0 */
  coastDistance(x: number, y: number): number
  forestAt(x: number, y: number): boolean
  waterAt(x: number, y: number): boolean
  /** 육지 덩어리(landAt 의 인덱스)에서 해안까지 가장 먼 거리 — 작은 섬의 기호 여백을 줄이는 데 쓴다 */
  landDepth(index: number): number
}

/** 칠한 칸의 범위 — 마스크의 나머지는 모두 0 이다 */
interface MaskRegion {
  x0: number
  y0: number
  x1: number
  y1: number
}

let maskCtx: CanvasRenderingContext2D | null = null

/** 다각형들을 칠한 마스크 — 캔버스 하나를 지워 가며 다시 쓰고, 칠한 범위만 읽어 온다 */
function fillMask(rings: Ring[]): { mask: Uint8Array; region: MaskRegion } {
  if (!maskCtx) {
    const canvas = document.createElement('canvas')
    canvas.width = GW
    canvas.height = GH
    maskCtx = canvas.getContext('2d', { willReadFrequently: true })
    if (!maskCtx) throw new Error('canvas 2d context unavailable')
  }
  const ctx = maskCtx
  ctx.clearRect(0, 0, GW, GH)
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  let bx0 = Infinity
  let by0 = Infinity
  let bx1 = -Infinity
  let by1 = -Infinity
  for (const ring of rings) {
    ring.forEach(([x, y], i) => {
      const gx = x / CELL
      const gy = y / CELL
      if (gx < bx0) bx0 = gx
      if (gy < by0) by0 = gy
      if (gx > bx1) bx1 = gx
      if (gy > by1) by1 = gy
      if (i === 0) ctx.moveTo(gx, gy)
      else ctx.lineTo(gx, gy)
    })
    ctx.closePath()
  }
  ctx.fill()
  const mask = new Uint8Array(GW * GH)
  // 안티앨리어싱이 번지는 한 칸까지 넉넉히 — 그 밖은 칠해지지 않는다
  const region = {
    x0: Math.max(0, Math.floor(bx0) - 2),
    y0: Math.max(0, Math.floor(by0) - 2),
    x1: Math.min(GW, Math.ceil(bx1) + 2),
    y1: Math.min(GH, Math.ceil(by1) + 2),
  }
  const w = region.x1 - region.x0
  const h = region.y1 - region.y0
  if (w <= 0 || h <= 0) return { mask, region }
  const data = ctx.getImageData(region.x0, region.y0, w, h).data
  for (let y = 0; y < h; y++) {
    const row = (region.y0 + y) * GW + region.x0
    for (let x = 0; x < w; x++) mask[row + x] = data[(y * w + x) * 4] > 127 ? 1 : 0
  }
  return { mask, region }
}

/** 2-pass 챔퍼 거리 변환 — 육지 칸에서 가장 가까운 바다 칸까지 */
function distanceToSea(land: Uint8Array): Float32Array {
  const d = new Float32Array(GW * GH)
  const INF = 1e9
  for (let i = 0; i < d.length; i++) d[i] = land[i] ? INF : 0
  const a = 1
  const b = Math.SQRT2
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const i = y * GW + x
      if (d[i] === 0) continue
      if (x > 0) d[i] = Math.min(d[i], d[i - 1] + a)
      if (y > 0) {
        d[i] = Math.min(d[i], d[i - GW] + a)
        if (x > 0) d[i] = Math.min(d[i], d[i - GW - 1] + b)
        if (x < GW - 1) d[i] = Math.min(d[i], d[i - GW + 1] + b)
      }
    }
  }
  for (let y = GH - 1; y >= 0; y--) {
    for (let x = GW - 1; x >= 0; x--) {
      const i = y * GW + x
      if (d[i] === 0) continue
      if (x < GW - 1) d[i] = Math.min(d[i], d[i + 1] + a)
      if (y < GH - 1) {
        d[i] = Math.min(d[i], d[i + GW] + a)
        if (x < GW - 1) d[i] = Math.min(d[i], d[i + GW + 1] + b)
        if (x > 0) d[i] = Math.min(d[i], d[i + GW - 1] + b)
      }
    }
  }
  return d
}

let cached: TerrainRaster | null = null

export function getTerrainRaster(): TerrainRaster {
  if (cached) return cached
  const index = new Int16Array(GW * GH).fill(-1)
  const land = new Uint8Array(GW * GH)
  landmasses.forEach((l, li) => {
    const { mask, region } = fillMask([l.ring])
    for (let y = region.y0; y < region.y1; y++) {
      for (let i = y * GW + region.x0, end = y * GW + region.x1; i < end; i++) {
        if (mask[i]) {
          index[i] = li
          land[i] = 1
        }
      }
    }
  })
  const dist = distanceToSea(land)
  const depth = new Float32Array(landmasses.length)
  for (let i = 0; i < index.length; i++) if (index[i] >= 0) depth[index[i]] = Math.max(depth[index[i]], dist[i] * CELL)
  const forest = fillMask(forests).mask
  const water = fillMask(inlandWaters).mask

  const cell = (x: number, y: number) => {
    const gx = Math.floor(x / CELL)
    const gy = Math.floor(y / CELL)
    if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) return -1
    return gy * GW + gx
  }
  cached = {
    landAt: (x, y) => {
      const i = cell(x, y)
      return i < 0 ? -1 : index[i]
    },
    coastDistance: (x, y) => {
      const i = cell(x, y)
      return i < 0 ? 0 : dist[i] * CELL
    },
    forestAt: (x, y) => {
      const i = cell(x, y)
      return i >= 0 && forest[i] === 1
    },
    waterAt: (x, y) => {
      const i = cell(x, y)
      return i >= 0 && water[i] === 1
    },
    landDepth: (li) => depth[li] ?? 0,
  }
  return cached
}
