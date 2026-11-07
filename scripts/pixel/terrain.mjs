// 픽셀 지도(/pixel)의 바탕 지형 데이터 — 지금 지도의 지형 셈(src/map/terrain.ts·landscape.ts)을 고치지 않고 그대로 불러
// 지금 지도와 같은 입력(ZendikarMap.tsx 의 terrainInput)으로 한 번 셈해, 픽셀 타일 Worker 가 그릴 자리만 뽑는다 (docs/pixel-plan.md S4).
//
// 지금 지도는 땅·숲·물 판정 격자(src/map/raster.ts)를 브라우저 캔버스로 칠한다. Node 에는 캔버스가 없어 여기서는 픽셀 가운데를 보는
// 채우기(src/pixel/raster/fill.ts 와 같은 판정)로 대신한다 — 판정 격자의 가장자리 칸이 브라우저와 조금 달라 흩뿌린 기호의 자리는
// 지금 지도와 같지 않다(데이터·규칙·씨앗은 같다). 지금 지도도 브라우저마다 캔버스 가장자리가 달라 자리가 정해진 기준은 없다.
//
// 쓰는 법: node --import ./scripts/qa/pixel-hooks.mjs scripts/pixel/terrain.mjs [--json]   (vite/pixelTerrain.ts 가 빌드·개발 서버에서 부른다)
//          import { buildPixelTerrain } from './terrain.mjs' (pixel-hooks 를 먼저 — scripts/qa/pixel-regress.mjs)
import fs from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const src = (p) => pathToFileURL(`${ROOT}src/${p}`).href

/** 캔버스 대신 — 0 이 아닌 감기 수로 채우고, 칸 가운데가 다각형 안이면 그 칸 (알파 255) */
class Ctx {
  constructor(w, h) {
    this.w = w
    this.h = h
    this.d = new Uint8ClampedArray(w * h * 4)
    this.paths = []
    this.cur = null
    this.m = [1, 0, 0, 1, 0, 0]
  }
  setTransform(a, b, c, d, e, f) {
    this.m = [a, b, c, d, e, f]
  }
  scale(sx, sy) {
    this.m = [this.m[0] * sx, this.m[1], this.m[2], this.m[3] * sy, this.m[4], this.m[5]]
  }
  translate(x, y) {
    this.m = [this.m[0], this.m[1], this.m[2], this.m[3], this.m[4] + this.m[0] * x, this.m[5] + this.m[3] * y]
  }
  clearRect() {
    this.d.fill(0)
  }
  beginPath() {
    this.paths = []
    this.cur = null
  }
  tp(x, y) {
    const [a, b, c, d, e, f] = this.m
    return [a * x + c * y + e, b * x + d * y + f]
  }
  moveTo(x, y) {
    this.cur = [this.tp(x, y)]
    this.paths.push(this.cur)
  }
  lineTo(x, y) {
    if (!this.cur) this.moveTo(x, y)
    else this.cur.push(this.tp(x, y))
  }
  closePath() {}
  fill() {
    const edges = []
    for (const p of this.paths)
      for (let i = 0; i < p.length; i++) {
        const a = p[i]
        const b = p[(i + 1) % p.length]
        if (a[1] !== b[1]) edges.push(a[1] < b[1] ? [a, b, 1] : [b, a, -1])
      }
    for (let y = 0; y < this.h; y++) {
      const yc = y + 0.5
      const xs = []
      for (const [a, b, w] of edges) if (yc >= a[1] && yc < b[1]) xs.push([a[0] + ((yc - a[1]) * (b[0] - a[0])) / (b[1] - a[1]), w])
      if (!xs.length) continue
      xs.sort((p, q) => p[0] - q[0])
      let wn = 0
      for (let k = 0; k < xs.length - 1; k++) {
        wn += xs[k][1]
        if (wn === 0) continue
        const c0 = Math.max(0, Math.ceil(xs[k][0] - 0.5))
        const c1 = Math.min(this.w - 1, Math.ceil(xs[k + 1][0] - 0.5) - 1)
        for (let c = c0; c <= c1; c++) {
          const o = (y * this.w + c) * 4
          this.d[o] = this.d[o + 1] = this.d[o + 2] = this.d[o + 3] = 255
        }
      }
    }
  }
  getImageData(x0, y0, w, h) {
    const out = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.set(this.d.subarray(((y0 + y) * this.w + x0 + x) * 4, ((y0 + y) * this.w + x0 + x) * 4 + 4), (y * w + x) * 4)
    return { data: out }
  }
}

function installCanvas() {
  if (globalThis.document) return
  globalThis.document = {
    createElement: () => {
      const c = { width: 0, height: 0, getContext: () => (c._ctx ??= new Ctx(c.width, c.height)) }
      return c
    },
  }
}

/** 지금 지도의 대륙 파일 차례 (src/data/index.ts 의 landscapeFiles) — 영역이 뒤의 것이 앞을 덮고 난수 흐름이 이 차례를 따른다 */
const LANDSCAPE_ORDER = ['sejiri', 'akoum', 'tazeem', 'murasa', 'ondu', 'guul-draz', 'bala-ged']

/** 헤드론 무리 — src/data/index.ts 는 Vite 질의(?lands)를 import 해 Node 에서 바로 읽히지 않는다. 그 파일의 hedrons 배열 글을 그대로 읽는다 */
export function readHedrons() {
  const text = fs.readFileSync(`${ROOT}src/data/index.ts`, 'utf8')
  const start = text.indexOf('export const hedrons: HedronCluster[] = [')
  if (start < 0) throw new Error('pixel terrain: src/data/index.ts 에서 hedrons 를 찾지 못했다')
  const open = text.indexOf('[', text.indexOf('=', start))
  let depth = 0
  let end = -1
  let quote = null
  for (let i = open; i < text.length; i++) {
    const ch = text[i]
    if (quote) {
      if (ch === '\\') i++
      else if (ch === quote) quote = null
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch
    else if (ch === '[') depth++
    else if (ch === ']' && --depth === 0) {
      end = i + 1
      break
    }
  }
  return new Function(`return ${text.slice(open, end)}`)()
}

const q = (v) => Math.round(v * 10)
/** 점들을 앞 점과의 차이로 — 이웃한 점이 가까워 글자가 짧고 잘 눌린다 (src/pixel/raster/terrain.ts 의 undelta 가 되돌린다) */
const flat = (pts) => {
  const out = []
  let px = 0
  let py = 0
  for (const [x, y] of pts) {
    const ix = q(x)
    const iy = q(y)
    out.push(ix - px, iy - py)
    px = ix
    py = iy
  }
  return out
}
const deltas = (xs) => xs.map((v, i) => (i ? v - xs[i - 1] : v))

/** M/L/l/Z 만 쓰는 path 글 → 하위 경로들 (절대 좌표) */
function subpaths(d) {
  const out = []
  const re = /([MLlZz])([^MLlZz]*)/g
  let cur = null
  let m
  while ((m = re.exec(d))) {
    const nums = m[2].trim() ? m[2].trim().split(/[\s,]+/).map(Number) : []
    if (m[1] === 'M') {
      cur = { pts: [[nums[0], nums[1]]], rel: false }
      out.push(cur)
      for (let i = 2; i < nums.length; i += 2) cur.pts.push([nums[i], nums[i + 1]])
    } else if (m[1] === 'L') {
      for (let i = 0; i < nums.length; i += 2) cur.pts.push([nums[i], nums[i + 1]])
    } else if (m[1] === 'l') {
      cur.rel = true
      for (let i = 0; i < nums.length; i += 2) {
        const [px, py] = cur.pts[cur.pts.length - 1]
        cur.pts.push([px + nums[i], py + nums[i + 1]])
      }
    } else if (cur) cur.closed = true
  }
  return out
}

/** 깊은 배율의 땅·물 판정 — src/map/fineTerrain.ts 의 exactGeo 와 같은 셈 (해안까지 12 단위 안은 선분으로 정확히, 그 밖은 판정 격자) */
function exactGeo(G, raster, Geo) {
  const NEAR = 12
  const d = G.deepRings()
  const inB = (b, x, y) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1
  const cells = new Map()
  const segs = []
  const key = (cx, cy) => (cy + 1000) * 100000 + cx + 1000
  d.lands.forEach((ring) => {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [ax, ay] = ring[j]
      const [bx, by] = ring[i]
      const s = segs.length
      segs.push(ax, ay, bx, by)
      for (let cx = Math.floor(Math.min(ax, bx) / NEAR); cx <= Math.floor(Math.max(ax, bx) / NEAR); cx++)
        for (let cy = Math.floor(Math.min(ay, by) / NEAR); cy <= Math.floor(Math.max(ay, by) / NEAR); cy++) {
          const k = key(cx, cy)
          const list = cells.get(k)
          if (list) list.push(s)
          else cells.set(k, [s])
        }
    }
  })
  const nearCoast = (x, y) => {
    let best = NEAR
    const cx = Math.floor(x / NEAR)
    const cy = Math.floor(y / NEAR)
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const s of cells.get(key(cx + dx, cy + dy)) ?? []) {
          const ax = segs[s]
          const ay = segs[s + 1]
          const ex = segs[s + 2] - ax
          const ey = segs[s + 3] - ay
          const len = ex * ex + ey * ey
          const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / len))
          const dist = Math.hypot(x - (ax + t * ex), y - (ay + t * ey))
          if (dist < best) best = dist
        }
    return best
  }
  let lx = NaN
  let ly = NaN
  let li = -1
  const landAt = (x, y) => {
    if (x === lx && y === ly) return li
    lx = x
    ly = y
    li = -1
    for (let i = 0; i < d.lands.length; i++) {
      if (inB(d.landBounds[i], x, y) && Geo.pointInRing(x, y, d.lands[i])) {
        li = i
        break
      }
    }
    return li
  }
  return {
    landAt,
    coastDistance: (x, y) => {
      if (landAt(x, y) < 0) return 0
      const rd = raster.coastDistance(x, y)
      if (rd > NEAR + 2) return rd
      const near = nearCoast(x, y)
      return near < NEAR ? near : Math.max(NEAR, rd)
    },
    forestAt: (x, y) => d.forests.some((r, i) => inB(d.forestBounds[i], x, y) && Geo.pointInRing(x, y, r)),
    waterAt: (x, y) => d.inland.some((r, i) => inB(d.inlandBounds[i], x, y) && Geo.pointInRing(x, y, r)),
    landDepth: (i) => raster.landDepth(i),
  }
}

/** opts.fine — 깊은 확대(한 픽셀 0.25 단위)의 다시 뿌린 기호도 (Worker 가 그 단계에서만 따로 받는다) */
export async function buildPixelTerrain(opts = { fine: true, periods: false }) {
  installCanvas()
  const T = await import(src('map/terrain.ts'))
  const L = await import(src('map/landscape.ts'))
  const G = await import(src('map/geo.ts'))
  const S = await import(src('map/glyphSpans.ts'))
  const LB = await import(src('map/labels.ts'))
  const { TIER_PX_PER_UNIT } = await import(src('map/detailScale.ts'))
  const { locations } = await import(src('data/locations.ts'))
  const { continents } = await import(src('data/continents.ts'))
  const { LAND_CARDS, hasPin } = await import(src('data/cards.ts'))
  const { cliffDepth } = await import(src('map/scarpLine.ts'))
  const { getTerrainRaster } = await import(src('map/raster.ts'))
  const Geo = await import(src('map/geometry.ts'))
  const { SEA_SPACING } = await import(src('map/landscapeGlyphs.ts'))
  const files = await Promise.all(LANDSCAPE_ORDER.map((n) => import(src(`data/landscape/${n}.ts`))))
  const ls = files.map((m) => m.landscape)
  const landscape = {
    areas: ls.flatMap((l) => l.areas ?? []),
    rivers: ls.flatMap((l) => l.rivers ?? []),
    lines: ls.flatMap((l) => l.lines ?? []),
    glyphs: ls.flatMap((l) => l.glyphs ?? []),
    sea: ls.flatMap((l) => l.sea ?? []),
  }
  const hedrons = readHedrons()

  // ZendikarMap.tsx 의 terrainInput 과 같은 셈
  const placed = locations.filter((l) => l.placement !== 'unplaced')
  const points = placed.filter((l) => l.kind !== 'region' && l.kind !== 'water')
  const areas = placed.filter((l) => l.kind === 'region' || l.kind === 'water')
  const continentAt = (landmass, x, y) => {
    const owners = continents.filter((c) => c.landmass === landmass)
    if (owners.length === 0) return continents.find((c) => c.islands?.includes(landmass))?.id ?? null
    if (owners.length === 1) return owners[0].id
    return (owners.find((c) => c.area && Geo.pointInRing(x, y, c.area)) ?? owners[0]).id
  }
  const byLandmass = new Map()
  for (const c of continents) byLandmass.set(c.landmass, [...(byLandmass.get(c.landmass) ?? []), c])
  const relief = (land, x, y) => {
    const owners = byLandmass.get(land.id)
    if (!owners) return { mountains: 0.3 }
    if (owners.length === 1) return owners[0].relief
    const id = continentAt(land.id, x, y)
    return (owners.find((c) => c.id === id) ?? owners[0]).relief
  }
  const TERRAIN_PATCH = { forest: 'forest', mountain: 'mountain', swamp: 'swamp', ice: 'ice', plateau: 'plateau', canyon: 'canyon', volcanic: 'mountain', plain: 'plain' }
  /** 영역마다 그 데이터 id (장소 데이터의 대략적 범위는 장소 id) — 칠한 것이 어느 데이터에서 왔는지 */
  const patchIds = []
  const patches = [
    ...areas.flatMap((l) => {
      const kind = l.terrain ? TERRAIN_PATCH[l.terrain] : undefined
      const p = kind && l.extent && !l.bare ? T.makePatch(kind, { at: l.position, extent: l.extent }, { soft: true }) : null
      if (p) patchIds.push(l.id)
      return p ? [p] : []
    }),
    ...landscape.areas.flatMap((a) => {
      const p = T.makePatch(a.kind, a, { density: a.density })
      if (p) patchIds.push(a.id)
      return p ? [p] : []
    }),
  ]
  const avoid = points.map((l) => l.position)
  const riverShapes = L.shapeRivers(landscape.rivers, avoid)
  const TIER_PX = TIER_PX_PER_UNIT.map((px, i) => (i === 0 ? TIER_PX_PER_UNIT[1] : px))
  const AREA_STYLE = {
    3: { base: 24, minPx: 11.5, maxPx: 24, showPx: 0 },
    2: { base: 18, minPx: 11, maxPx: 19, showPx: 9 },
    1: { base: 15, minPx: 10.5, maxPx: 16, showPx: 9.5 },
    0: { base: 13, minPx: 10.5, maxPx: 14, showPx: 10.5 },
  }
  const labelBoxes = areas.map((l) => {
    const b = LB.areaLabelBox(l.name, l.position, LB.areaFontUnits(AREA_STYLE[l.prominence] ?? AREA_STYLE[0], TIER_PX[3]))
    const dy = l.extent ? l.extent[1] * 0.45 : 0
    return { ...b, y0: b.y0 - dy, y1: b.y1 + dy }
  })
  const raster = getTerrainRaster()
  const coastBreaks = []
  for (const r of riverShapes) {
    const k = r.samples.findIndex(([x, y]) => raster.landAt(x, y) < 0)
    if (k > 0) coastBreaks.push({ line: r.samples.slice(Math.max(0, k - 10), k + 3), r: r.widths[k] / 2 + 4 })
  }
  for (const l of landscape.lines) {
    if (l.kind !== 'gorge') continue
    const ends = [l.line[0], l.line[l.line.length - 1]]
    if (ends.some(([x, y]) => raster.coastDistance(x, y) < 17)) coastBreaks.push({ line: [...l.line], r: (l.width ?? 8) / 2 + 3 })
  }
  const input = {
    profileFor: relief,
    patches,
    avoid,
    pins: LAND_CARDS.filter(hasPin).map((c) => c.at),
    labelBoxes,
    blocked: L.buildBlockedMask(riverShapes, landscape.lines, landscape.glyphs),
    lines: landscape.lines,
    coastBreaks,
    cliffDepth,
    wetAt: G.wetAt,
  }
  const terrain = T.buildTerrain(input)

  // 흩뿌린 기호 — 칸·산 띠 문자열의 자리 기록에서 (같은 기호의 여러 조각 — 수관·줄기, 맹그로브의 수관·뿌리 — 은 하나로).
  // 페이즈 바탕(S6, periods.mjs)을 다시 이은 지형은 페이즈 층(가루·백악·마른 바닥·죽은 나무·금속)까지
  const glyphsOf = (t) => {
    const seen = new Set()
    const out = []
    const take = (k, x, y) => {
      const key = `${k}:${q(x)}:${q(y)}`
      if (seen.has(key)) return
      seen.add(key)
      out.push([k, q(x), q(y)])
    }
    for (const arr of [t.trees.crowns, t.trees.trunks, t.marsh, t.ice, t.lava, t.tundra, t.frost, t.canyons, ...Object.values(t.period ?? {})])
      for (const s of S.spansOfTiles(arr) ?? []) if (s) for (let i = 0; i < s.kind.length; i++) take(s.kind[i], s.x[i], s.y[i])
    for (const b of t.mountains) {
      const s = S.spansOfBand(b)
      if (s) for (let i = 0; i < s.kind.length; i++) take(s.kind[i], s.x[i], s.y[i])
    }
    return out
  }
  const glyphs = glyphsOf(terrain)
  const baseGlyphs = glyphs.map((g) => [...g])
  const encodeGlyphs = (list) => {
    list.sort((a, b) => a[2] - b[2] || a[1] - b[1] || a[0] - b[0])
    // y 는 앞 기호와의 차이 (y 차례라 작다)
    for (let i = list.length - 1; i > 0; i--) list[i][2] -= list[i - 1][2]
    return list.flat()
  }

  // 깊은 확대의 기호 — 지금 지도의 fineTerrain.ts 처럼 단계 1(반 크기·반 간격, tier 5 = 픽셀 지도의 한 픽셀 0.25 단위)을
  // 100 단위 칸마다 씨앗 `fine:1:tx:ty` 로 다시 뿌린다. 땅·물 판정은 깊은 배율의 해안(deepRings)으로 (fineTerrain.ts 의 exactGeo 를 옮겼다 — 그 파일은 React 를 끌어온다).
  // 지역 상세가 맡는 자리(claimed)는 픽셀 지도에 지역 상세가 없어 비우지 않는다 (docs/pixel-plan.md D4)
  let fine = null
  /** 깊은 확대 칸마다 (시점별 바탕이 닿는 칸만 다시 뿌려 견준다 — periods.mjs) */
  const fineCells = []
  let fineGeo = null
  if (opts.fine) {
    const geo = (fineGeo = exactGeo(G, raster, Geo))
    const d = G.deepRings()
    const FINE_LEVEL = 1
    const g = 2 ** -FINE_LEVEL
    const size = 200 * g
    const fineGlyphs = []
    const fineSeen = new Set()
    const overlaps = (b, r) => b.x1 > r.x0 && b.x0 < r.x1 && b.y1 > r.y0 && b.y0 < r.y1
    for (let ty = 0; ty * size < G.MAP_HEIGHT; ty++)
      for (let tx = 0; tx * size < G.MAP_WIDTH; tx++) {
        const region = { x0: tx * size, y0: ty * size, x1: (tx + 1) * size, y1: (ty + 1) * size }
        if (!d.landBounds.some((b) => overlaps(b, region)) && !patches.some((p) => overlaps(p.bounds, region))) continue
        const seed = `fine:${FINE_LEVEL}:${tx}:${ty}`
        const cg = glyphsOf(T.buildTerrain(input, { g, region, seed, geo }))
        if (opts.periods) fineCells.push({ region, seed, g, glyphs: cg, keys: new Set(cg.map((x) => x.join(':'))) })
        for (const x of cg) {
          const key = x.join(':')
          if (fineSeen.has(key)) continue
          fineSeen.add(key)
          fineGlyphs.push([...x])
        }
      }
    fine = { level: FINE_LEVEL, g: encodeGlyphs(fineGlyphs) }
  }

  // 단애 — 위 선(꺾은선)과 빗금(위 선의 한 점에서 낮은 쪽으로). 해안 절벽·바탕 지형 선·협곡의 두 단애가 모두 cliffs·waterCliffs 에 있다
  const cliffsOf = (t) => {
    const lines = []
    const hatch = []
    for (const [water, arr] of [
      [0, t.cliffs],
      [1, t.waterCliffs],
    ]) {
      for (const d of arr) {
        for (const p of subpaths(d)) {
          if (p.rel && p.pts.length === 2) hatch.push(q(p.pts[0][0]), q(p.pts[0][1]), q(p.pts[1][0]) - q(p.pts[0][0]), q(p.pts[1][1]) - q(p.pts[0][1]))
          else if (!p.rel && p.pts.length >= 2) lines.push({ w: water, p: flat(p.pts) })
          else throw new Error(`pixel terrain: 단애 path 의 모양을 모른다: ${d.slice(0, 60)}`)
        }
      }
    }
    return { lines, hatch, gorges: subpaths(t.gorgeFloors).map((p) => flat(p.pts)) }
  }
  const { lines, hatch: hatchAbs, gorges } = cliffsOf(terrain)
  const hatch = [...hatchAbs]
  // 빗금의 밑동은 앞 빗금과의 차이
  for (let i = hatch.length - 4; i > 0; i -= 4) {
    hatch[i] -= hatchAbs[i - 4]
    hatch[i + 1] -= hatchAbs[i - 3]
  }

  // 강 — 다듬은 물길(표본 약 1.5 단위 간격)과 표본마다의 폭
  const rivers = riverShapes.map((r) => ({ id: r.id, p: flat(r.samples), w: deltas(r.widths.map((w) => Math.round(w * 100))) }))
  // 한 점 지형 기호 — 데이터 그대로
  const marks = landscape.glyphs.map((g) => ({ id: g.id, k: g.kind, x: q(g.at[0]), y: q(g.at[1]), s: g.size ?? 1, a: g.angle ?? 0 }))

  // 바다 표시의 자리 — landscape.ts 의 seaMarkPaths 와 같은 셈 (모양을 그리는 난수는 쓰지 않는다 — 자리를 고른 뒤에 쓰인다)
  const where = (x, y, r) => {
    const lake = raster.landAt(x, y) >= 0 && raster.waterAt(x, y)
    const ok = (px, py) => (lake ? raster.landAt(px, py) >= 0 && raster.waterAt(px, py) : raster.landAt(px, py) < 0)
    if (!lake && raster.landAt(x, y) >= 0) return null
    return ok(x + r, y) && ok(x - r, y) && ok(x, y + r) && ok(x, y - r) ? (lake ? 'lake' : 'sea') : null
  }
  const sea = []
  for (const m of landscape.sea) {
    const shape = m.ring
      ? { bounds: Geo.ringBounds(m.ring), inside: (x, y) => Geo.pointInRing(x, y, m.ring) }
      : { bounds: { x0: m.at[0] - m.extent[0], y0: m.at[1] - m.extent[1], x1: m.at[0] + m.extent[0], y1: m.at[1] + m.extent[1] }, inside: (x, y) => ((x - m.at[0]) / m.extent[0]) ** 2 + ((y - m.at[1]) / m.extent[1]) ** 2 <= 1 }
    const rand = Geo.mulberry32(Geo.hashSeed(`sea:${m.id}`))
    const r = m.kind === 'sea-ice' ? 6 : m.kind === 'whirl' ? 8 : 4
    const b = shape.bounds
    const bounds = { x0: Math.max(b.x0, r), y0: Math.max(b.y0, r), x1: Math.min(b.x1, G.MAP_WIDTH - r), y1: Math.min(b.y1, G.MAP_HEIGHT - r) }
    if (bounds.x1 <= bounds.x0 || bounds.y1 <= bounds.y0) continue
    const pts = Geo.poissonDisk(bounds, SEA_SPACING[m.kind], rand, (x, y) => shape.inside(x, y) && where(x, y, r) !== null, { seedTries: 12 })
    sea.push({ id: m.id, k: m.kind, p: flat(pts) })
  }

  // 채색 영역 — ZendikarMap.tsx 의 washes: 숲은 바탕 지형의 숲 영역(soft 빼고), 용암·트인 땅은 모두. 다각형은 모서리를 둥글린다 (chaikin 2)
  const ellipse = (p) => Array.from({ length: 48 }, (_, i) => [p.x + Math.cos((i / 48) * Math.PI * 2) * p.rx, p.y + Math.sin((i / 48) * Math.PI * 2) * p.ry])
  const washRing = (p) => (p.ring ? Geo.chaikin(p.ring, 2) : ellipse(p))
  const washes = []
  patches.forEach((p, i) => {
    const kind = p.kind === 'forest' && !p.soft ? 'forest' : p.kind === 'lava' || p.kind === 'plain' ? p.kind : null
    if (!kind) return
    washes.push({ id: patchIds[i], k: kind, p: flat(washRing(p)) })
  })

  // 헤드론 — ZendikarMap.tsx 의 layoutHedrons 와 같은 셈 (자리·길이·기울기·띄움)
  const nearMarker = (x, y) => avoid.some(([ax, ay]) => (ax - x) ** 2 + (ay - y) ** 2 < 100)
  const hedronOut = []
  for (const c of hedrons) {
    const rand = Geo.mulberry32(Geo.hashSeed(c.id))
    const land = c.within ? G.landmassById.get(c.within) : undefined
    let n = 0
    for (let tries = 0; n < c.count && tries < c.count * 30; tries++) {
      const a = rand() * Math.PI * 2
      const r = Math.sqrt(rand()) * c.spread
      const x = c.at[0] + Math.cos(a) * r
      const y = c.at[1] + Math.sin(a) * r
      if (land && !Geo.pointInRing(x, y, land.ring)) continue
      if (c.inset && raster.coastDistance(x, y) < c.inset) continue
      if (c.count > 1 && nearMarker(x, y)) continue
      const len = (5 + rand() * 6) * (c.scale ?? 1)
      const rot = c.grounded ? 62 + rand() * 50 : (rand() - 0.5) * 50
      const lift = c.grounded ? 0 : 9 + rand() * 9
      rand()
      hedronOut.push({ id: `${c.id}-${n}`, c: c.id, x: q(x), y: q(y), len: q(len), rot: Math.round(rot * 10) / 10, lift: q(lift), gr: c.grounded ? 1 : 0, sp: c.split ? 1 : 0 })
      n++
    }
  }

  // 시점별 바탕 (S6) — 단계마다 바탕과 다른 몫 (scripts/pixel/periods.mjs)
  let periods = null
  if (opts.periods) {
    const { periodOf, periodLevels } = await import('./periods.mjs')
    const base = {
      ctx: { terrain, log: T.terrainLogOf(terrain), input, riverShapes, landscape, avoid, continents, locations },
      glyphsOf,
      cliffsOf,
      baseGlyphs,
      baseGlyphKeys: new Set(baseGlyphs.map((g) => g.join(':'))),
      baseLines: lines,
      baseHatch: hatchAbs,
      baseGorges: gorges,
      fineCells,
      fineGeo,
    }
    periods = {}
    for (const L of await periodLevels()) {
      const p = await periodOf(L, base)
      if (p) periods[L] = p
    }
  }

  return {
    ...(periods ? { periods } : {}),
    v: 2,
    kinds: [...S.GLYPH_KINDS],
    g: encodeGlyphs(glyphs),
    fine,
    lines,
    hatch,
    gorges,
    rivers,
    marks,
    sea,
    washes,
    hedrons: hedronOut,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const t0 = performance.now()
  const data = await buildPixelTerrain({ fine: true, periods: true })
  if (process.argv.includes('--json')) process.stdout.write(JSON.stringify(data))
  else if (process.argv.includes('--periods')) {
    for (const [L, p] of Object.entries(data.periods)) console.log(`L${L}`, JSON.stringify(p.stats), `worker ${JSON.stringify(p.worker).length}B main ${JSON.stringify(p.main).length}B notes ${JSON.stringify(p.notes).length}B`)
    console.log('ms', Math.round(performance.now() - t0))
  }
  else {
    const counts = {}
    for (let i = 0; i < data.g.length; i += 3) counts[data.kinds[data.g[i]]] = (counts[data.kinds[data.g[i]]] ?? 0) + 1
    console.log(
      JSON.stringify({
        ms: Math.round(performance.now() - t0),
        bytes: JSON.stringify(data).length,
        glyphs: data.g.length / 3,
        fine: data.fine ? data.fine.g.length / 3 : 0,
        counts,
        lines: data.lines.length,
        hatches: data.hatch.length / 4,
        gorges: data.gorges.length,
        rivers: data.rivers.length,
        marks: data.marks.length,
        sea: data.sea.map((s) => `${s.id}:${s.p.length / 2}`),
        washes: data.washes.map((w) => `${w.k}:${w.id}`),
        hedrons: data.hedrons.length,
      }),
    )
  }
}
