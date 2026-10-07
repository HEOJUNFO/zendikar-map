// 바탕 지형 데이터(src/data/landscape)를 그릴 모양으로 — 강, 바다 표시, 기호를 비켜 둘 자리.
// 지형 영역·단애선은 terrain.ts 가 산·숲 기호와 함께 흩뿌린다.
import type { LandmarkGlyph, River, SeaMark, TerrainLine } from '../data/types'
import { MAP_HEIGHT, MAP_WIDTH, wetAt } from './geo'
import {
  chaikin,
  chaikinOpen,
  hashSeed,
  mulberry32,
  pointInRing,
  poissonDisk,
  polylineToPath,
  resample,
  rightNormals,
  ringBounds,
  valueNoise2D,
  type Bounds,
  type Point,
} from './geometry'
import { floeGlyph, landmarkParts, reefGlyph, roughGlyph, SEA_SPACING, whirlGlyph, type GlyphPart } from './landscapeGlyphs'
import { getTerrainRaster } from './raster'
import { tiler } from './terrain'

/** 강 하구의 기본 굵기 (지도 단위) — types.ts 의 River.width */
export const RIVER_WIDTH = 1.6
/** 강물 칠이 바다·호수 쪽으로 이만큼 더 나가 해안선·호숫가 선을 끊는다 */
const MOUTH_OVERLAP = 1.6

// --- 기호를 비켜 둘 자리 ---

const CELL = 2
const GW = Math.ceil(MAP_WIDTH / CELL)
const GH = Math.ceil(MAP_HEIGHT / CELL)

/**
 * 강·단애선·한 점 기호가 차지한 자리 — 산·나무 같은 흩뿌린 기호를 여기 두지 않는다.
 * 2 단위 격자에 원을 찍어 두고 조회만 한다
 */
export function buildBlockedMask(
  rivers: readonly RiverShape[],
  lines: readonly TerrainLine[],
  glyphs: readonly LandmarkGlyph[],
): (x: number, y: number) => boolean {
  const mask = new Uint8Array(GW * GH)
  const stamp = (x: number, y: number, r: number) => {
    const g0 = Math.max(0, Math.floor((x - r) / CELL))
    const g1 = Math.min(GW - 1, Math.floor((x + r) / CELL))
    const h0 = Math.max(0, Math.floor((y - r) / CELL))
    const h1 = Math.min(GH - 1, Math.floor((y + r) / CELL))
    for (let gy = h0; gy <= h1; gy++) {
      for (let gx = g0; gx <= g1; gx++) {
        if (((gx + 0.5) * CELL - x) ** 2 + ((gy + 0.5) * CELL - y) ** 2 <= r * r) mask[gy * GW + gx] = 1
      }
    }
  }
  // 강은 기슭에서 4~5 단위
  for (const r of rivers) r.samples.forEach(([x, y], i) => stamp(x, y, 4.5 + r.widths[i] / 2))
  // 협곡은 양쪽 단애 바깥까지. 절벽은 선 위와 빗금이 떨어지는 낮은 쪽만 — 높은 쪽(닫힌 고리의 안쪽 숲 등)은 선 바로 곁까지 기호를 둔다
  for (const l of lines) {
    const closed = Boolean(l.closed)
    const pts = resample(closed ? chaikin(l.line, 1) : chaikinOpen(l.line, 1), 2, closed)
    if (l.kind === 'gorge') {
      for (const [x, y] of pts) stamp(x, y, (l.width ?? 8) / 2 + 6)
      continue
    }
    const depth = cliffDepth(l)
    const normals = rightNormals(pts, closed)
    pts.forEach(([x, y], i) => {
      stamp(x, y, 2.5)
      stamp(x + normals[i][0] * depth * 0.55, y + normals[i][1] * depth * 0.55, depth * 0.6)
    })
  }
  // 한 점 기호는 대개 기준점 위로 솟는다 — 기호 가운데쯤을 비운다
  for (const g of glyphs) {
    const s = g.size ?? 1
    const [x, y] = g.at
    if (g.kind === 'caldera') stamp(x, y, 17 * s)
    else if (g.kind === 'waterfall') stamp(x, y, 10 * s)
    else if (g.kind === 'pit') stamp(x, y, 4.5 * s)
    else if (g.kind === 'urn') stamp(x + 3 * s, y - 9 * s, 12 * s)
    else stamp(x, y - 6 * s, 13 * s)
  }
  return (x, y) => {
    const gx = Math.floor(x / CELL)
    const gy = Math.floor(y / CELL)
    return gx >= 0 && gy >= 0 && gx < GW && gy < GH && mask[gy * GW + gx] === 1
  }
}

/**
 * 단애선의 빗금 길이 — 기본 7. 아주 짧은 선(Jwar 섬의 7 단위 절벽)은 선 길이에 맞춰 줄인다
 */
export function cliffDepth(l: Pick<TerrainLine, 'line' | 'closed'>): number {
  let len = 0
  for (let i = 1; i < l.line.length; i++) len += Math.hypot(l.line[i][0] - l.line[i - 1][0], l.line[i][1] - l.line[i - 1][1])
  return 7 * Math.max(0.2, Math.min(1, len / 35))
}

// --- 강 ---

/** 다듬은 물길 — 점마다 강폭 */
export interface RiverShape {
  id: string
  samples: Point[]
  widths: number[]
  /** 지류·갈래면 본류 — 본류 물 안에 들어간 구간은 기슭 선을 긋지 않는다 */
  main?: RiverShape
}

/** 물길이 지도 밖으로 나가는 자리에서 자른다 (세지리의 강은 지도 위쪽 끝으로 흘러 나간다) — 잘렸으면 true */
function clipToMap(pts: Point[]): boolean {
  const inside = ([x, y]: Point) => x >= 0 && y >= 0 && x <= MAP_WIDTH && y <= MAP_HEIGHT
  const k = pts.findIndex((p) => !inside(p))
  if (k < 0) return false
  if (k === 0) {
    pts.length = 0
    return true
  }
  // 안쪽 점과 바깥 점 사이에서 지도 끝을 찾아 거기서 끊는다
  const [ax, ay] = pts[k - 1]
  const [bx, by] = pts[k]
  let t = 1
  if (by < 0) t = Math.min(t, ay / (ay - by))
  if (bx < 0) t = Math.min(t, ax / (ax - bx))
  if (by > MAP_HEIGHT) t = Math.min(t, (MAP_HEIGHT - ay) / (by - ay))
  if (bx > MAP_WIDTH) t = Math.min(t, (MAP_WIDTH - ax) / (bx - ax))
  pts.length = k
  pts.push([ax + (bx - ax) * t, ay + (by - ay) * t])
  return true
}

/** 다듬은 물길 위에서 (x, y) 에 가장 가까운 점의 번호와 거리 */
function nearestSample(samples: readonly Point[], x: number, y: number): { i: number; d: number } {
  let i = 0
  let d = Infinity
  samples.forEach(([px, py], k) => {
    const dd = Math.hypot(px - x, py - y)
    if (dd < d) {
      d = dd
      i = k
    }
  })
  return { i, d }
}

/**
 * 물길을 다듬는다 — 꺾인 점을 펴고 손으로 그은 듯 아주 약하게 굽이치게 한 뒤, 상류(가늘다)에서 하구(width)로 굵어진다.
 * 지류의 끝은 다듬은 본류 위의 가장 가까운 점에 붙이고, 하구 굵기는 그 자리 본류보다 가늘게 둔다
 */
export function shapeRivers(rivers: readonly River[], markers: readonly Point[] = []): RiverShape[] {
  const raster = getTerrainRaster()
  const out = new Map<string, RiverShape>()
  // 본류를 먼저 — 지류가 붙을 자리를 알아야 한다
  const order = [...rivers].sort((a, b) => depth(a, rivers) - depth(b, rivers))
  for (const r of order) {
    const main = r.tributaryOf ? out.get(r.tributaryOf) : undefined
    let course = [...r.course]
    let mainWidth = Infinity
    // 갈래 — 본류에서 갈라졌다가(첫 점도 본류 위) 다시 만난다 (Vazi 강의 곁 물길, Halimar 남쪽 강의 땋은 물길)
    let braid = false
    if (main) {
      const [ex, ey] = course[course.length - 1]
      const end = nearestSample(main.samples, ex, ey)
      const [sx, sy] = course[0]
      const start = nearestSample(main.samples, sx, sy)
      braid = start.d < 4.8
      course = [...(braid ? [main.samples[start.i]] : [course[0]]), ...course.slice(1, -1), main.samples[end.i]]
      mainWidth = Math.min(main.widths[end.i], braid ? main.widths[start.i] : Infinity)
    }
    const smooth = resample(chaikinOpen(course, 3), 1.5)
    // 지도 밖으로 흘러 나가는 강은 지도 끝에서 그냥 자른다 — 하구도, 끝의 가늘어짐도 없다
    const offEdge = clipToMap(smooth)
    if (smooth.length < 2) continue
    // 굽이 — 양 끝에서는 0 이라 하구·합류점은 데이터 자리 그대로
    const noise = valueNoise2D(hashSeed(`river:${r.id}`), 9)
    const normals = rightNormals(smooth)
    let samples = smooth.map(([x, y], i) => {
      const t = i / (smooth.length - 1)
      const a = (noise(i * 1.5, 0) - 0.5) * 1.6 * Math.min(1, t * 6, (1 - t) * 6)
      return [x + normals[i][0] * a, y + normals[i][1] * a] as const
    })
    // 바다·호수·본류에 닿지 않고 땅 위에서 끝나는 강 (Akoum 의 물은 땅 밑으로 빠진다) — 끝 마커 밑으로 들어가지 않게 그 앞에서 멈춘다
    const [lx, ly] = samples[samples.length - 1]
    const inlandEnd = !main && !offEdge && raster.landAt(lx, ly) >= 0 && !raster.waterAt(lx, ly)
    if (inlandEnd) {
      const MARKER_GAP = 9
      let k = samples.length
      while (k > 2 && markers.some(([mx, my]) => Math.hypot(samples[k - 1][0] - mx, samples[k - 1][1] - my) < MARKER_GAP)) k--
      samples = samples.slice(0, k)
    }
    const n = samples.length
    const W = Math.min(r.width ?? RIVER_WIDTH, mainWidth * 0.8)
    const widths = samples.map((_, i) => {
      const t = i / (n - 1)
      // 갈래는 고른 폭의 가는 물길 — 양 끝만 본류 속으로 살짝 좁아진다
      if (braid) return W * (0.75 + 0.25 * Math.min(1, t * 5, (1 - t) * 5))
      const w = W * (0.2 + 0.8 * t ** 0.8)
      // 땅에서 끝나는 강은 끝 20% 에서 눈에 띄게 가늘어진다
      return inlandEnd ? w * (0.25 + 0.75 * Math.min(1, (1 - t) / 0.2)) : w
    })
    out.set(r.id, { id: r.id, samples, widths, main })
  }
  return [...out.values()]
}

/** 지류의 깊이 — 본류 0, 지류 1, 지류의 지류 2 … */
function depth(r: River, all: readonly River[], seen = 0): number {
  if (!r.tributaryOf || seen > all.length) return 0
  const main = all.find((m) => m.id === r.tributaryOf)
  return main ? 1 + depth(main, all, seen + 1) : 0
}

export interface RiverPaths {
  /** 강물 — 물빛으로 칠한다. 바다·호수 쪽 끝은 MOUTH_OVERLAP 만큼 더 나가 해안선을 끊는다 */
  water: string[]
  /** 양쪽 기슭 선 — 땅 위에만 */
  banks: string[]
}


/**
 * 강을 땅 위 구간마다 그린다 — 바다나 호수에 닿으면 기슭 선을 물가에서 끊고(하구), 물칠만 물 쪽으로 조금 더 내어 해안선을 덮는다.
 * 호수를 지나는 강은 호수 앞뒤 두 구간이 된다
 */
export function riverPaths(shapes: readonly RiverShape[]): RiverPaths {
  const raster = getTerrainRaster()
  const wet = (p: Point) => raster.landAt(p[0], p[1]) < 0 || raster.waterAt(p[0], p[1])
  const water = tiler()
  const banks = tiler()
  for (const r of shapes) {
    const { samples, widths } = r
    const normals = rightNormals(samples)
    const n = samples.length
    let i = 0
    while (i < n) {
      if (wet(samples[i])) {
        i++
        continue
      }
      let j = i
      while (j + 1 < n && !wet(samples[j + 1])) j++
      // 땅 위 구간 i..j. 격자 판정은 거칠어 물가 쪽 끝 점이 실제로는 물일 수 있다 — 정확한 판정으로 안쪽으로 당긴다
      let a = i
      let b = j
      if (a > 0) while (a < b && wetAt(samples[a][0], samples[a][1])) a++
      if (b < n - 1) while (b > a && wetAt(samples[b][0], samples[b][1])) b--
      // 구간의 한 점: 중심선 위 자리, 진행 방향, 강폭
      type Station = { p: Point; w: number; nx: number; ny: number }
      const stations: Station[] = []
      for (let k = a; k <= b; k++) stations.push({ p: samples[k], w: widths[k], nx: normals[k][0], ny: normals[k][1] })
      /** 마른 점 k 와 젖은 점 k+dir 사이 물가 — 반으로 나눠 찾는다 */
      const shore = (k: number, dir: 1 | -1): { at: Station; out: Station } | null => {
        const q = k + dir
        if (q < 0 || q >= n) return null
        let [lo, hi] = [0, 1]
        const lerp = (t: number): Point => [samples[k][0] + (samples[q][0] - samples[k][0]) * t, samples[k][1] + (samples[q][1] - samples[k][1]) * t]
        for (let it = 0; it < 10; it++) {
          const m = (lo + hi) / 2
          const [x, y] = lerp(m)
          if (wetAt(x, y)) hi = m
          else lo = m
        }
        const at = lerp(hi)
        const len = Math.hypot(samples[q][0] - samples[k][0], samples[q][1] - samples[k][1]) || 1
        const ux = (samples[q][0] - samples[k][0]) / len
        const uy = (samples[q][1] - samples[k][1]) / len
        const w = widths[k]
        const base = { w, nx: normals[k][0], ny: normals[k][1] }
        return { at: { p: at, ...base }, out: { p: [at[0] + ux * MOUTH_OVERLAP, at[1] + uy * MOUTH_OVERLAP], ...base } }
      }
      const head = a > 0 ? shore(a, -1) : null
      const tail = b < n - 1 ? shore(b, 1) : null
      const bankLine = [...(head ? [head.at] : []), ...stations, ...(tail ? [tail.at] : [])]
      const waterLine = [...(head ? [head.out, head.at] : []), ...stations, ...(tail ? [tail.at, tail.out] : [])]
      const offset = (st: Station[], s: 1 | -1) => st.map(({ p, w, nx, ny }) => [p[0] + (nx * s * w) / 2, p[1] + (ny * s * w) / 2] as const)
      if (bankLine.length < 2) {
        i = j + 1
        continue
      }
      const [ax, ay] = bankLine[0].p
      water.add(ax, ay, `${polylineToPath([...offset(waterLine, -1), ...offset(waterLine, 1).reverse()])}Z`)
      // 지류·갈래가 본류 물 안으로 들어간 구간은 기슭 선을 끊는다 — 합류점에 선 토막이 남지 않게
      const main = r.main
      const inMain = (st: Station) => {
        if (!main) return false
        const { i: mi, d } = nearestSample(main.samples, st.p[0], st.p[1])
        return d < main.widths[mi] / 2 + st.w / 2 + 0.2
      }
      let run: Station[] = []
      const flush = () => {
        if (run.length >= 2) banks.add(run[0].p[0], run[0].p[1], polylineToPath(offset(run, -1)) + polylineToPath(offset(run, 1)))
        run = []
      }
      for (const st of bankLine) {
        if (inMain(st)) flush()
        else run.push(st)
      }
      flush()
      i = j + 1
    }
  }
  return { water: water.paths(), banks: banks.paths() }
}

// --- 한 점 기호 ---

export interface LandmarkShape {
  id: string
  parts: GlyphPart[]
}

/** 바다·호수 위에 선 기호(Akoum 앞바다의 화산 유리 첨탑)는 밑동에 짧은 물결선 두 줄을 단다 */
export function landmarkShapes(glyphs: readonly LandmarkGlyph[]): LandmarkShape[] {
  const raster = getTerrainRaster()
  return glyphs.map((g) => {
    const parts = landmarkParts(g)
    const [x, y] = g.at
    const floating = g.kind === 'floating-rock' || g.kind === 'urn'
    if (!floating && (raster.landAt(x, y) < 0 || raster.waterAt(x, y))) {
      const s = g.size ?? 1
      const w = 5.5 * s
      const line = (dy: number, half: number) => `M${(x - half).toFixed(1)} ${(y + dy).toFixed(1)}h${(half * 2).toFixed(1)}`
      parts.unshift({ cls: 'lm-waterline', d: line(0.9 * s, w) + line(2.5 * s, w * 0.55) })
    }
    return { id: g.id, parts }
  })
}

// --- 바다 표시 ---

export interface SeaMarkPaths {
  floes: string[]
  currents: string[]
  reefCross: string[]
  reefDots: string[]
  rough: string[]
}

const emptySea = (): SeaMarkPaths => ({ floes: [], currents: [], reefCross: [], reefDots: [], rough: [] })

/**
 * 바다·호수 위의 표시 — 바다 쪽(땅 아래에 그린다)과 호수 쪽(호수 위에 그린다)을 나눈다.
 * 해안에 바짝 붙은 점은 건너뛰어 해안선과 물결선을 덮지 않게 한다
 */
export function seaMarkPaths(marks: readonly SeaMark[]): { sea: SeaMarkPaths; lake: SeaMarkPaths } {
  const raster = getTerrainRaster()
  const layers = { sea: { floes: tiler(), currents: tiler(), reefCross: tiler(), reefDots: tiler(), rough: tiler() }, lake: { floes: tiler(), currents: tiler(), reefCross: tiler(), reefDots: tiler(), rough: tiler() } }
  const where = (x: number, y: number, r = 4): 'sea' | 'lake' | null => {
    const lake = raster.landAt(x, y) >= 0 && raster.waterAt(x, y)
    const ok = (px: number, py: number) => (lake ? raster.landAt(px, py) >= 0 && raster.waterAt(px, py) : raster.landAt(px, py) < 0)
    if (!lake && raster.landAt(x, y) >= 0) return null
    return ok(x + r, y) && ok(x - r, y) && ok(x, y + r) && ok(x, y - r) ? (lake ? 'lake' : 'sea') : null
  }
  for (const m of marks) {
    const shape = m.ring
      ? { bounds: ringBounds(m.ring), inside: (x: number, y: number) => pointInRing(x, y, m.ring!) }
      : m.at && m.extent
        ? {
            bounds: { x0: m.at[0] - m.extent[0], y0: m.at[1] - m.extent[1], x1: m.at[0] + m.extent[0], y1: m.at[1] + m.extent[1] } as Bounds,
            inside: (x: number, y: number) => ((x - m.at![0]) / m.extent![0]) ** 2 + ((y - m.at![1]) / m.extent![1]) ** 2 <= 1,
          }
        : null
    if (!shape) continue
    const rand = mulberry32(hashSeed(`sea:${m.id}`))
    // 기호가 지도 밖으로 나가지 않게, 얼음 조각은 조각 전체가 물 위에 오게 (조각 반지름 5 남짓)
    const r = m.kind === 'sea-ice' ? 6 : m.kind === 'whirl' ? 8 : 4
    const b = shape.bounds
    const bounds: Bounds = { x0: Math.max(b.x0, r), y0: Math.max(b.y0, r), x1: Math.min(b.x1, MAP_WIDTH - r), y1: Math.min(b.y1, MAP_HEIGHT - r) }
    if (bounds.x1 <= bounds.x0 || bounds.y1 <= bounds.y0) continue
    const pts = poissonDisk(bounds, SEA_SPACING[m.kind], rand, (x, y) => shape.inside(x, y) && where(x, y, r) !== null, 4000, 12)
    for (const [x, y] of pts) {
      const out = layers[where(x, y, r)!]
      if (m.kind === 'sea-ice') out.floes.add(x, y, floeGlyph(x, y, rand))
      else if (m.kind === 'whirl') out.currents.add(x, y, whirlGlyph(x, y, rand))
      else if (m.kind === 'rough') out.rough.add(x, y, roughGlyph(x, y, rand))
      else {
        const [cross, dots] = reefGlyph(x, y, rand)
        if (cross) out.reefCross.add(x, y, cross)
        if (dots) out.reefDots.add(x, y, dots)
      }
    }
  }
  const done = (l: (typeof layers)['sea']): SeaMarkPaths => ({
    floes: l.floes.paths(),
    currents: l.currents.paths(),
    reefCross: l.reefCross.paths(),
    reefDots: l.reefDots.paths(),
    rough: l.rough.paths(),
  })
  return marks.length ? { sea: done(layers.sea), lake: done(layers.lake) } : { sea: emptySea(), lake: emptySea() }
}
