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
}

function fillMask(rings: Ring[]): Uint8Array {
  const canvas = document.createElement('canvas')
  canvas.width = GW
  canvas.height = GH
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('canvas 2d context unavailable')
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  for (const ring of rings) {
    ring.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x / CELL, y / CELL) : ctx.lineTo(x / CELL, y / CELL)))
    ctx.closePath()
  }
  ctx.fill()
  const data = ctx.getImageData(0, 0, GW, GH).data
  const mask = new Uint8Array(GW * GH)
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4] > 127 ? 1 : 0
  return mask
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
    const m = fillMask([l.ring])
    for (let i = 0; i < m.length; i++) {
      if (m[i]) {
        index[i] = li
        land[i] = 1
      }
    }
  })
  const dist = distanceToSea(land)
  const forest = fillMask(forests)
  const water = fillMask(inlandWaters)

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
  }
  return cached
}
