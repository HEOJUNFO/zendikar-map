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
/**
 * 기호마다 놓인 땅의 크기 (S15 — 지금 지도 ZendikarMap.tsx 의 landSizeAt: 땅 고리 넓이의 제곱근, 바다 위는 없음). 작은 섬의 기호는 그 섬이 화면에서 12px 가 될 때부터 그린다 (labels/layout.ts).
 * 넉넉한 땅(250 단위 넘게 — 가장 먼 개관에서도 12px 를 넘는다)은 싣지 않는다
 */
/** 바탕의 한 점 기호 가운데 그림 몫(parts)도 싣는 것 (S15 — 초화산 분화구, S17 — 아쿰 유리 첨탑: 가장 깊은 단계에서도 8 픽셀 점이었다) */
// 화산(객체 다듬기 A14 — 지금 지도는 크기 1 에서 약 19×12.5 단위의 원뿔, 그림판 그림은 한 픽셀 1 단위에서 1/3)도
// 구덩이·떠도는 바위·항아리(A18·A20·A21 — 항아리는 크기 1 에서 약 22×23 단위라 그림판 그림이 한 픽셀 1 단위에서 1/4)도. 간헐천·폭포는 움직이는 효과가 그림판 그림 자리에 붙어 그대로
const BASE_VECTOR = new Set(['caldera', 'spire', 'volcano', 'pit', 'floating-rock', 'urn'])

/**
 * 하나뿐인 거대 헤드론(Sky Rock·Ikiral)의 몸통 (S18 — 지금 지도의 singleHedronSoft): 이름이 되도록 비키는 무른 장애물. 몸통을 가로 띠로 나눈 상자(bodyBands)와 몸통 크기(extent 의 긴 변),
 * 몸통을 모두 가리는 지역 상세(maskedByDetail — 그 지역 상세가 나오는 단계에는 넣지 않는다)를 주 스레드가 단계마다 고른다 (time.ts 의 singleHedronSoft, labels/layout.ts 의 soft).
 * 자리·길이·기울기·띄움은 buildPixelTerrain 의 헤드론 배치와 같은 난수 차례 (하나뿐인 무리는 바다 거리를 보지 않아 땅 격자가 없어도 된다 — 다르면 buildPixelTerrain 이 멈춘다)
 */
export async function pixelSingleHedrons() {
  const G = await import(src('map/geo.ts'))
  const Geo = await import(src('map/geometry.ts'))
  const { bodyBands, HEDRON_DRIFT } = await import(src('map/hedronYield.ts'))
  const { detailBandOf } = await import(src('map/detailScale.ts'))
  const { CHILD_MAPS: childMaps } = await import(src('data/childMaps.ts'))
  const out = []
  for (const c of readHedrons().filter((c) => c.count === 1)) {
    if (c.inset) throw new Error(`pixel terrain: 거대 헤드론 ${c.id} 에 inset 이 있다 — 땅 격자가 있어야 센다`)
    const rand = Geo.mulberry32(Geo.hashSeed(c.id))
    const land = c.within ? G.landmassById.get(c.within) : undefined
    for (let tries = 0; tries < 30; tries++) {
      const a = rand() * Math.PI * 2
      const r = Math.sqrt(rand()) * c.spread
      const x = c.at[0] + Math.cos(a) * r
      const y = c.at[1] + Math.sin(a) * r
      if (land && !Geo.pointInRing(x, y, land.ring)) continue
      const len = q((5 + rand() * 6) * (c.scale ?? 1)) / 10
      const rot = Math.round((c.grounded ? 62 + rand() * 50 : (rand() - 0.5) * 50) * 10) / 10
      const lift = q(c.grounded ? 0 : 9 + rand() * 9) / 10
      const hx = q(x) / 10
      const hy = q(y) / 10
      const wid = len * 0.36 * (c.split ? 1.42 : 1)
      const ang = (rot * Math.PI) / 180
      const corners = [[0, -len], [wid, len * 0.08], [0, len * 0.92], [-wid, len * 0.08]].map(([px, py]) => [px * Math.cos(ang) - py * Math.sin(ang), px * Math.sin(ang) + py * Math.cos(ang)])
      const yh = { key: c.id, x: hx, y: hy, lift, grounded: Boolean(c.grounded), single: true, corners }
      const span = (i) => Math.max(...corners.map((p) => p[i])) - Math.min(...corners.map((p) => p[i]))
      const masked = childMaps
        .filter((d) => d.parent === undefined)
        .filter((d) => {
          const band = detailBandOf(d.bounds)
          const b = d.bounds
          return corners.every(([cx, cy]) => Math.min(hx + cx - b.x0, b.x1 - hx - cx, hy + cy - lift - HEDRON_DRIFT - b.y0, b.y1 - hy - cy + lift) >= band)
        })
        .map((d) => d.id)
      out.push({ id: `${c.id}-0`, at: [q(x), q(y)], size: Math.round(Math.max(span(0), span(1)) * 10) / 10, bands: bodyBands(yh).map((b) => [b.x0, b.y0, b.x1, b.y1].map((v) => Math.round(v * 100) / 100)), masked })
      break
    }
  }
  return out
}

export async function pixelLandSizes() {
  const G = await import(src('map/geo.ts'))
  const Geo = await import(src('map/geometry.ts'))
  const { locations } = await import(src('data/locations.ts'))
  const { LAND_CARDS, hasPin } = await import(src('data/cards.ts'))
  const out = {}
  const sizeOf = new Map(G.landmasses.map((l) => [l.id, Math.sqrt(Geo.ringArea(l.ring))]))
  const at = (id, [x, y]) => {
    const land = G.landmasses.find((l) => Geo.pointInRing(x, y, l.ring))
    const s = land ? sizeOf.get(land.id) : undefined
    if (s !== undefined && s < 250) out[id] = Math.round(s * 10) / 10
  }
  // 지역 이름도 (S19 — 개관에서 'Jwar Isle' 이름이 섬을 통째로 덮었다). 물 이름은 땅 위가 아니다
  for (const l of locations) if (l.placement !== 'unplaced' && l.kind !== 'water' && l.position) at(l.id, l.position)
  for (const c of LAND_CARDS.filter(hasPin)) at(c.id, c.at)
  return out
}

/**
 * 땅 격자 (가독성 다듬기 R52 — 땅의 지역 이름이 바다 위 자리에 앉지 않게, 주 스레드의 이름 배치가 쓴다): LAND_CELL 단위 칸마다 땅(호수가 아닌 땅)인지,
 * 줄마다 바다부터 번갈아 센 칸 수
 */
export const LAND_CELL = 8
export async function pixelLandGrid() {
  const G = await import(src('map/geo.ts'))
  const Geo = await import(src('map/geometry.ts'))
  const lands = G.landmasses.map((l) => ({ ring: l.ring, b: Geo.ringBounds(l.ring) }))
  const lakes = G.inlandWaters.map((ring) => ({ ring, b: Geo.ringBounds(ring) }))
  const inside = (list, x, y) => list.some(({ ring, b }) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && Geo.pointInRing(x, y, ring))
  const w = Math.ceil(2400 / LAND_CELL)
  const h = Math.ceil(1700 / LAND_CELL)
  const rows = []
  for (let j = 0; j < h; j++) {
    const y = (j + 0.5) * LAND_CELL
    const runs = []
    let cur = 0
    let len = 0
    for (let i = 0; i < w; i++) {
      const x = (i + 0.5) * LAND_CELL
      const v = inside(lands, x, y) && !inside(lakes, x, y) ? 1 : 0
      if (v === cur) len++
      else {
        runs.push(len)
        cur = v
        len = 1
      }
    }
    runs.push(len)
    rows.push(runs)
  }
  return { cell: LAND_CELL, w, h, rows }
}

/** 깊은 확대 칸의 크기 (지도 단위) — 가장 깊은 단계의 화면(약 175×110 단위)이 칸 네 개 안팎에 든다 */
export const FINE_CELL = 200
const cellKey = (x10, y10) => `${Math.floor(x10 / (FINE_CELL * 10))}_${Math.floor(y10 / (FINE_CELL * 10))}`

/**
 * 깊은 확대의 기호를 칸마다 (기호의 밑동 자리로) — 칸마다 PixelTerrainFine 과 같은 꼴 { g, ps, cv, cps } (g·cv 의 y 차이는 그 칸 안에서).
 * 가장 깊은 단계는 기호를 솎지 않아(src/pixel/raster/terrain.ts 의 spacing — 한 픽셀 ≤ 0.5 단위는 1) 타일에 닿는 칸만 붙여도 그 타일은 같다
 */
function fineCellsOf(abs, shapeMap, cvRows, shapeRows, encodeGlyphs) {
  const parts = {}
  const part = (k) => (parts[k] ??= { g: [], shapes: new Map(), cv: [] })
  for (const x of abs) part(cellKey(x[1], x[2])).g.push([...x])
  for (const [k, rec] of shapeMap) {
    const [, x, y] = k.split(':').map(Number)
    part(cellKey(x, y)).shapes.set(k, rec)
  }
  for (const r of cvRows) part(cellKey(r[1], r[2])).cv.push([...r])
  const out = {}
  for (const k of Object.keys(parts).sort()) {
    const p = parts[k]
    const cv = p.cv
    for (let i = cv.length - 1; i > 0; i--) cv[i][2] -= cv[i - 1][2]
    out[k] = {
      level: 1,
      g: encodeGlyphs(p.g),
      ps: shapeRows(p.shapes),
      ...(cv.length ? { cv: cv.flatMap((r) => r.slice(0, 4)), cps: cv.flatMap((r) => (r[4] ? [r[4].length, ...r[4]] : [0])) } : {}),
    }
  }
  return { cell: FINE_CELL, parts: out }
}

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
  // 꼭짓점이 몇 개뿐인 물(육각형 Glasspool) 안의 기호는 뺀다 — 지금 지도의 셈은 2 단위 격자·두 번 깎은 둥근 못으로 땅을 가려 모서리에 기호가 섰지만,
  // 픽셀 지도는 그 못을 늘 육각형으로 칠한다 (S26, src/pixel/rings.ts). 바탕·깊은 확대·시점별 바탕이 모두 이 셈을 지나 서로 맞는다
  const GeoM = await import(src('map/geometry.ts'))
  const fewLakes = G.inlandWaters.filter((r) => r.length <= 8)
  const inFewLake = (x, y) => fewLakes.some((r) => GeoM.pointInRing(x, y, r))
  // 봉우리의 모양 (객체 다듬기 A1 — docs/pixel-plan.md) — 산 띠의 채움·빗금 조각에서 봉우리마다의 꺾은선을 뽑는다. 지금 지도는 봉우리마다 너비·높이가 다른 삼각형을
  // 지도 단위로 그리는데 픽셀 지도는 어느 단계에서나 8 픽셀 그림이라, 한 픽셀 ≤ 1 단위에서 봉우리가 지금 지도의 1/2–1/4 로 작았다. Worker 가 그 단계에서 이 모양대로 그린다.
  // 기록은 밑동(glyph 의 x·y)에서의 차이 ×10 — 채움 꺾은선(왼쪽 밑동 → 꼭대기 → 오른쪽 밑동)과 빗금 꺾은선들. 깊은 확대(g < 1)의 것은 따로
  const SHAPED = new Set(['peak', 'snow', 'hill', 'mesa'].map((k) => S.GLYPH_KINDS.indexOf(k)))
  // 칸 문자열의 기호 가운데 모양을 적는 것 — 협곡 단애(canyonGlyph: 굽은 단애선과 빗금 셋, 객체 다듬기 A11). 모양 숫자 없이 꺾은선만
  // 그 무렵 무늬(A27–A31 — periodGlyphs.ts 의 drift·chalk·crack·deadTree·plate: 8–15 단위)도 — 시점별 바탕 조각(periods.mjs)이 그 단계의 것을 싣는다
  const PERIOD_SHAPED = new Set(['dust', 'chalk', 'drybed', 'deadwood', 'metal'].map((k) => S.GLYPH_KINDS.indexOf(k)))
  const TILE_SHAPED = new Set([S.GLYPH_KINDS.indexOf('canyon'), ...PERIOD_SHAPED])
  const CANYON = S.GLYPH_KINDS.indexOf('canyon')
  // 산 띠의 수정 (landscapeGlyphs.ts 의 crystalGlyph — 기둥 다각형 3–5 개와 결·빗금, 객체 다듬기 A5·A6): 수정 채움(lens 1)·수정 결(lens 5) 조각에서
  const CRYSTAL = new Set(['crystal', 'crystal-spire'].map((k) => S.GLYPH_KINDS.indexOf(k)))
  const recordCrystal = (b, s, i, co, cho, gIn, sink) => {
    const polys = polylines(b.crystal.slice(co, co + s.lens[i * 6 + 1])).filter((l) => l.length >= 3)
    if (!polys.length) return
    const nums = (b.crystal.slice(co, co + s.lens[i * 6 + 1]).match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number)
    // 기둥 밑동의 y 가 밑동 y 다 — 축척은 봉우리와 같이
    const g = gIn ?? (nums[1] && s.y[i] ? 2 ** Math.round(Math.log2(s.y[i] / nums[1])) : 1)
    const X = s.x[i]
    const Y = s.y[i]
    const rel = (l) => l.flatMap(([px, py]) => [Math.round((px * g - X) * 10), Math.round((py * g - Y) * 10)])
    const hatch = polylines(b.crystalHatch.slice(cho, cho + s.lens[i * 6 + 5])).filter((l) => l.length >= 2)
    // 모양 숫자 하나(기둥 수) 뒤에 기둥 다각형들과 결·빗금을 한 목록으로
    const lines = [...polys, ...hatch]
    const rec = [polys.length, lines.length, ...lines.flatMap((l) => [l.length, ...rel(l)])]
    ;(sink ?? (g < 0.75 ? shapes.fine : shapes.base)).set(`${s.kind[i]}:${q(X)}:${q(Y)}`, rec)
  }
  const shapes = { base: new Map(), fine: new Map() }
  /** M·L·l·Q 만 쓰는 path 를 꺾은선들로 (Q 는 여섯 토막) */
  const polylines = (d) => {
    const out = []
    let cur = null
    let x = 0
    let y = 0
    const re = /([MLlQhvHV])([^MLlQhvHVZz]*)/g
    let m
    while ((m = re.exec(d))) {
      const v = (m[2].match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number)
      if (m[1] === 'M') {
        x = v[0]
        y = v[1]
        cur = [[x, y]]
        out.push(cur)
        for (let i = 2; i + 1 < v.length; i += 2) cur.push([(x = v[i]), (y = v[i + 1])])
      } else if (m[1] === 'L') for (let i = 0; i + 1 < v.length; i += 2) cur.push([(x = v[i]), (y = v[i + 1])])
      else if (m[1] === 'l') for (let i = 0; i + 1 < v.length; i += 2) cur.push([(x += v[i]), (y += v[i + 1])])
      else if (m[1] === 'h') for (const d of v) cur.push([(x += d), y])
      else if (m[1] === 'v') for (const d of v) cur.push([x, (y += d)])
      else if (m[1] === 'H') for (const d of v) cur.push([(x = d), y])
      else if (m[1] === 'V') for (const d of v) cur.push([x, (y = d)])
      else
        for (let i = 0; i + 3 < v.length; i += 4) {
          const [cx, cy, ex, ey] = v.slice(i, i + 4)
          for (let k = 1; k <= 6; k++) {
            const tt = k / 6
            cur.push([(1 - tt) ** 2 * x + 2 * (1 - tt) * tt * cx + tt * tt * ex, (1 - tt) ** 2 * y + 2 * (1 - tt) * tt * cy + tt * tt * ey])
          }
          x = ex
          y = ey
        }
    }
    return out
  }
  // 채움 path 의 숫자 가운데 모양을 정하는 것 (terrain.ts 의 mountainGlyph 'M lx y Q cx cy ax ay L rx y Z', snowGlyph 'M lx y L ax ay L rx y Z',
  // hillGlyph 'M lx y Q cx cy rx y Z') — [x 인지, 숫자 차례]. Worker(src/pixel/raster/terrain.ts 의 shapeMap)가 같은 차례로 꺾은선을 다시 만든다
  // 대지(landscapeGlyphs.ts 의 mesaGlyph — 'M lx y Q … tl' yc L tl ty L 가운데 L tr ty L tr' yc Q … rx y')는 숫자 열여덟 모두 (객체 다듬기 A4)
  const CTRL = { peak: [0, 2, 3, 4, 5, 6], snow: [0, 2, 3, 4], hill: [0, 2, 3, 4], mesa: Array.from({ length: 18 }, (_, i) => i) }
  /** 칸 문자열 기호의 모양 — 같은 기호의 조각(path)들을 꺾은선으로, 밑동에서의 차이 ×10. g 는 그 지형의 축척 */
  const recordTileShape = (k, X, Y, paths, g, sink) => {
    // 첫 조각(굽은 단애선 'M x0 y0 Q cx cy x1 y1')은 모양 숫자 여섯, 나머지(빗금)는 꺾은선 — Worker 가 곡선을 다시 만든다 (꺾은선으로 담으면 깊은 확대 조각이 gz 70KB 커졌다)
    // 협곡만 — 그 무렵 무늬는 모양 숫자 없이 조각 모두를 꺾은선으로 (점은 한 점짜리 꺾은선)
    const canyon = k === CANYON
    const ctrl = canyon ? (paths[0]?.match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number) : []
    if (canyon && ctrl.length < 6) return
    const rel = (v, j) => Math.round((v * g - (j % 2 === 0 ? X : Y)) * 10)
    const lines = (canyon ? paths.slice(1) : paths).flatMap((d) => polylines(d)).filter((l) => l.length >= (canyon ? 2 : 1))
    if (!canyon && !lines.length) return
    const rec = [...ctrl.slice(0, 6).map(rel), lines.length, ...lines.flatMap((l) => [l.length, ...l.flatMap(([px, py]) => [rel(px, 0), rel(py, 1)])])]
    ;(sink ?? (g < 0.75 ? shapes.fine : shapes.base)).set(`${k}:${q(X)}:${q(Y)}`, rec)
  }
  const recordShape = (b, s, i, fo, ho, gIn, sink) => {
    const nums = (b.fill.slice(fo, fo + s.lens[i * 6]).match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number)
    const kind = S.GLYPH_KINDS[s.kind[i]]
    const ctrl = CTRL[kind]
    if (!ctrl || nums.length < Math.max(...ctrl) + 1) return
    // 그 띠의 축척 — 지금 지도는 깊은 확대의 기호를 1/g 로 그린 뒤 g 로 줄인다 (terrain.ts 의 gx). 부르는 쪽이 알면 그것, 아니면 path 의 밑동 y 로 셈해 2 의 거듭제곱에 맞춘다
    // (path 숫자는 0.1 로 반올림돼 셈한 g 가 조금 어긋나면 동쪽 봉우리가 옆으로 0.6 단위까지 밀렸다 — A1 검토)
    const g = gIn ?? (nums[1] && s.y[i] ? 2 ** Math.round(Math.log2(s.y[i] / nums[1])) : 1)
    const X = s.x[i]
    const Y = s.y[i]
    // 짝수 차례는 x, 홀수 차례는 y (path 숫자가 x y 쌍)
    const rel = (v, j) => Math.round((v * g - (j % 2 === 0 ? X : Y)) * 10)
    const hatch = polylines(b.hatch.slice(ho, ho + s.lens[i * 6 + 3])).filter((l) => l.length >= 2)
    const rec = [...ctrl.map((j) => rel(nums[j], j)), hatch.length, ...hatch.flatMap((l) => [l.length, ...l.flatMap(([px, py]) => [rel(px, 0), rel(py, 1)])])]
    ;(sink ?? (g < 0.75 ? shapes.fine : shapes.base)).set(`${s.kind[i]}:${q(X)}:${q(Y)}`, rec)
  }
  const shapeRows = (m) => [...m].flatMap(([k, rec]) => [...k.split(':').map(Number), ...rec])
  /** opt.g — 그 지형의 축척, opt.shapes — 봉우리 모양을 적을 곳 (false 면 적지 않는다 — 시점별 바탕을 견주는 셈, 없으면 바탕·깊은 확대의 표) */
  const glyphsOf = (t, opt = {}) => {
    const seen = new Set()
    const out = []
    const take = (k, x, y) => {
      const key = `${k}:${q(x)}:${q(y)}`
      if (seen.has(key) || inFewLake(x, y)) return
      seen.add(key)
      out.push([k, q(x), q(y)])
    }
    for (const arr of [t.trees.crowns, t.trees.trunks, t.marsh, t.ice, t.lava, t.tundra, t.frost, t.canyons, ...Object.values(t.period ?? {})]) {
      const spans = S.spansOfTiles(arr) ?? []
      spans.forEach((s, ti) => {
        if (!s) return
        // 모양을 적는 기호 — 같은 밑동의 조각들을 모은다 (조각 i 는 문자열의 [end[i-1], end[i]))
        const groups = opt.shapes === false ? null : new Map()
        const want = (k) => TILE_SHAPED.has(k) && (!opt.only || opt.only.has(k))
        for (let i = 0; i < s.kind.length; i++) {
          take(s.kind[i], s.x[i], s.y[i])
          if (groups && want(s.kind[i])) {
            const key = `${s.kind[i]}:${s.x[i]}:${s.y[i]}`
            const piece = arr[ti].slice(i ? s.end[i - 1] : 0, s.end[i])
            const gr = groups.get(key)
            if (gr) gr.paths.push(piece)
            else groups.set(key, { k: s.kind[i], x: s.x[i], y: s.y[i], paths: [piece] })
          }
        }
        if (groups) for (const gr of groups.values()) recordTileShape(gr.k, gr.x, gr.y, gr.paths, opt.g ?? 1, opt.shapes)
      })
    }
    for (const b of t.mountains) {
      const s = S.spansOfBand(b)
      if (!s) continue
      let fo = 0
      let ho = 0
      let co = 0
      let cho = 0
      for (let i = 0; i < s.kind.length; i++) {
        take(s.kind[i], s.x[i], s.y[i])
        if (SHAPED.has(s.kind[i]) && opt.shapes !== false && (!opt.only || opt.only.has(s.kind[i]))) recordShape(b, s, i, fo, ho, opt.g, opt.shapes)
        if (CRYSTAL.has(s.kind[i]) && opt.shapes !== false && !opt.only) recordCrystal(b, s, i, co, cho, opt.g, opt.shapes)
        fo += s.lens[i * 6]
        ho += s.lens[i * 6 + 3]
        co += s.lens[i * 6 + 1]
        cho += s.lens[i * 6 + 5]
      }
    }
    return out
  }
  const glyphs = glyphsOf(terrain)
  const baseGlyphs = glyphs.map((g) => [...g])
  // 기호 하나의 현은 들쭉날쭉해 획이 흩은 잔가지로 읽혔다 — 둘레 CANYON_DIR_R 단위 안의 협곡 기호와 방향을 (두 배 각으로) 평균해 지금 지도의 참호처럼 결이 이어지게 한다
  const CANYON_DIR_R = 40
  const canyonDirs = (list) => {
    const cs = [...list].sort((a, b) => a[2] - b[2] || a[1] - b[1] || a[0] - b[0]).filter((x) => x[0] === CANYON)
    const vec = cs.map(([k, x, y]) => {
      const rec = shapes.base.get(`${k}:${x}:${y}`)
      if (!rec) return null
      const a = 2 * Math.atan2(rec[5] - rec[1], rec[4] - rec[0])
      return [Math.cos(a), Math.sin(a)]
    })
    const R = CANYON_DIR_R * 10
    return cs
      .map(([, x, y], i) => {
        let sx = 0
        let sy = 0
        cs.forEach(([, x2, y2], j) => {
          const v = vec[j]
          if (v && (x2 - x) ** 2 + (y2 - y) ** 2 <= R * R) {
            sx += v[0]
            sy += v[1]
          }
        })
        if (!vec[i] && !sx && !sy) return '0'
        const deg = ((((Math.atan2(sy, sx) / 2) * 180) / Math.PI) + 180) % 180
        return deg < 22.5 || deg >= 157.5 ? '0' : deg < 67.5 ? '1' : deg < 112.5 ? '3' : '2'
      })
      .join('')
  }
  const encodeGlyphs = (list) => {
    list.sort((a, b) => a[2] - b[2] || a[1] - b[1] || a[0] - b[0])
    // y 는 앞 기호와의 차이 (y 차례라 작다)
    for (let i = list.length - 1; i > 0; i--) list[i][2] -= list[i - 1][2]
    return list.flat()
  }

  // 깊은 확대의 기호 — 지금 지도의 fineTerrain.ts 처럼 단계 1(반 크기·반 간격, tier 5 = 픽셀 지도의 한 픽셀 0.25 단위)을
  // 100 단위 칸마다 씨앗 `fine:1:tx:ty` 로 다시 뿌린다. 땅·물 판정은 깊은 배율의 해안(deepRings)으로 (fineTerrain.ts 의 exactGeo 를 옮겼다 — 그 파일은 React 를 끌어온다).
  // 지역 상세(S9 — scripts/pixel/childmaps.mjs)에 닿는 칸은 여기서 뿌리지 않고 보기마다 따로 뿌린다 (지역 상세가 맡은 자리를 비키고 그 지형 칸의 기호를 더해 — 아래 cv)
  let fine = null
  /** 깊은 확대의 기호 [종류, x, y] (×10 절대) — 칸 나누기(fineCellsOf)에 */
  let fineAbs = []
  /** 지역 상세에 닿는 칸의 줄 [종류, x, y(절대), 보기 비트, 모양] — 칸 나누기에 */
  let cvAbs = []
  /** 깊은 확대 칸마다 (시점별 바탕이 닿는 칸만 다시 뿌려 견준다 — periods.mjs). 지역 상세에 닿는 칸(child)은 periods.mjs 가 건너뛴다 */
  const fineCells = []
  /** 지역 상세에 닿는 칸 — 보기마다 다시 뿌린다 */
  const childCells = []
  const CM = opts.fine ? await import('./childmaps.mjs') : null
  const childSetup = CM ? await CM.childSetup() : null
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
        const seed = `fine:${FINE_LEVEL}:${tx}:${ty}`
        if (CM.touchesChild(childSetup, region)) {
          childCells.push({ region, seed, g })
          continue
        }
        if (!d.landBounds.some((b) => overlaps(b, region)) && !patches.some((p) => overlaps(p.bounds, region))) continue
        const cg = glyphsOf(T.buildTerrain(input, { g, region, seed, geo }), { g })
        if (opts.periods) fineCells.push({ region, seed, g, glyphs: cg, keys: new Set(cg.map((x) => x.join(':'))) })
        for (const x of cg) {
          const key = x.join(':')
          if (fineSeen.has(key)) continue
          fineSeen.add(key)
          fineGlyphs.push([...x])
        }
      }
    fineAbs = fineGlyphs.map((x) => [...x])
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
  // 큰 것(초화산 분화구 — 지금 지도에서 39×17 단위)은 그림 몫(parts)도 — 그림판의 그림이 실제 크기보다 작아지는 단계에서는 지도 단위 그대로 그린다 (S15)
  const { vectorParts } = await import('./periods.mjs')
  const { landmarkParts } = await import(src('map/landscapeGlyphs.ts'))
  const marks = landscape.glyphs.map((g) => {
    const m = { id: g.id, k: g.kind, x: q(g.at[0]), y: q(g.at[1]), s: g.size ?? 1, a: g.angle ?? 0 }
    if (BASE_VECTOR.has(g.kind)) m.parts = vectorParts(g, landmarkParts)
    return m
  })

  // 바다 표시의 자리 — landscape.ts 의 seaMarkPaths 와 같은 셈 (모양을 그리는 난수는 쓰지 않는다 — 자리를 고른 뒤에 쓰인다)
  const where = (x, y, r) => {
    const lake = raster.landAt(x, y) >= 0 && raster.waterAt(x, y)
    const ok = (px, py) => (lake ? raster.landAt(px, py) >= 0 && raster.waterAt(px, py) : raster.landAt(px, py) < 0)
    if (!lake && raster.landAt(x, y) >= 0) return null
    return ok(x + r, y) && ok(x - r, y) && ok(x, y + r) && ok(x, y - r) ? (lake ? 'lake' : 'sea') : null
  }
  const sea = []
  const seaShapes = []
  const { floeGlyph, whirlGlyph, roughGlyph, reefGlyph } = await import(src('map/landscapeGlyphs.ts'))
  const { flattenPath } = await import('./periods.mjs')
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
    // 지금 지도의 모양 (가독성 다듬기 R42a — 가까이에서는 지도 단위 모양대로): 자리를 고른 뒤 같은 난수로 점마다 (landscape.ts 의 seaMarkPaths 와 같은 차례)
    // [x, y(×10 절대), 꺾은선 수, (점 수, 점(×10, 기준점과의 차이)…)…] — 점 하나짜리(같은 점 둘)는 암초의 점
    for (const [x, y] of pts) {
      const d = m.kind === 'sea-ice' ? floeGlyph(x, y, rand) : m.kind === 'whirl' ? whirlGlyph(x, y, rand) : m.kind === 'rough' ? roughGlyph(x, y, rand) : reefGlyph(x, y, rand).join('')
      const lines = flattenPath(d).map((l) => l.pts)
      seaShapes.push(q(x), q(y), lines.length)
      for (const l of lines) {
        seaShapes.push(l.length)
        for (const [px, py] of l) seaShapes.push(q(px) - q(x), q(py) - q(y))
      }
    }
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

  const landSizes = await pixelLandSizes()
  const landGrid = await pixelLandGrid()

  // 떠 있는 헤드론이 이름을 비키는 셈의 입력 (S20 — 지금 지도의 hedronYield: 셈은 주 스레드가 단계마다 src/map/hedronYield.ts 의 yieldHedrons 로).
  // 무리마다 헤드론이 있어도 되는 자리(지금 지도의 ok — 대륙 땅 안, 해안에서 inset 넘게, 장소 마커와 10 단위 넘게)를 2 단위 칸의 비트로, 헤드론마다 몸통 귀퉁이와 그 몸통을 다 가리는 지역 상세
  const hedronYield = (() => {
    const CELL = 2
    const PAD = 90
    const clusters = []
    for (const c of hedrons) {
      if (c.count === 1 || c.grounded) continue
      const land = c.within ? G.landmassById.get(c.within) : undefined
      const x0 = Math.floor((c.at[0] - c.spread - PAD) / CELL) * CELL
      const y0 = Math.floor((c.at[1] - c.spread - PAD) / CELL) * CELL
      const w = Math.ceil((2 * (c.spread + PAD)) / CELL) + 1
      const h = Math.ceil((2 * (c.spread + PAD)) / CELL) + 1
      const bits = new Uint8Array(Math.ceil((w * h) / 8))
      for (let j = 0; j < h; j++)
        for (let i = 0; i < w; i++) {
          const x = x0 + (i + 0.5) * CELL
          const y = y0 + (j + 0.5) * CELL
          if (land && !Geo.pointInRing(x, y, land.ring)) continue
          if (c.inset && raster.coastDistance(x, y) < c.inset) continue
          if (nearMarker(x, y)) continue
          const k = j * w + i
          bits[k >> 3] |= 1 << (k & 7)
        }
      clusters.push({ id: c.id, x0, y0, w, h, bits: Buffer.from(bits).toString('base64') })
    }
    // 하나뿐인 것(Sky Rock·Ikiral)과 땅에 쓰러진 것도 — 비키지 않지만 지금 지도처럼 셈에 들어 옮겨 간 헤드론이 그 몸통과 떨어진다 (S20 검토)
    const items = hedronOut
      .map((o) => {
        const c = hedrons.find((x) => x.id === o.c)
        const len = o.len / 10
        const wid = len * 0.36 * (c.split ? 1.42 : 1)
        const ang = (o.rot * Math.PI) / 180
        const corners = [[0, -len], [wid, len * 0.08], [0, len * 0.92], [-wid, len * 0.08]].map(([px, py]) => [
          Math.round((px * Math.cos(ang) - py * Math.sin(ang)) * 100) / 100,
          Math.round((px * Math.sin(ang) + py * Math.cos(ang)) * 100) / 100,
        ])
        return { id: o.id, c: o.c, x: o.x / 10, y: o.y / 10, lift: o.lift / 10, corners, ...(c.count === 1 ? { single: 1 } : {}), ...(c.grounded ? { grounded: 1 } : {}) }
      })
    return { cell: CELL, clusters, items }
  })()

  // 하나뿐인 거대 헤드론의 몸통 (S18) — 따로 셈하고(pixelSingleHedrons — 시험이 땅 격자 없이 같은 값을 쓴다) 위의 헤드론 배치와 같은지 본다
  const singleHedrons = await pixelSingleHedrons()
  for (const h of singleHedrons) {
    const o = hedronOut.find((x) => x.id === h.id)
    if (!o || o.x !== h.at[0] || o.y !== h.at[1]) throw new Error(`pixel terrain: 거대 헤드론 ${h.id} 의 자리가 헤드론 배치와 다르다`)
    delete h.at
  }

  // 한 땅 덩어리를 나눠 쓰는 대륙 사이의 경계 (S14 — 지금 지도의 .continent-borders): 범위 다각형(area) 가운데 그 대륙이 놓인 땅 위의 몫만,
  // 0.5 단위마다 표본을 찍어 땅 안에 든 구간을 꺾은선으로 (지금 지도는 땅 고리로 자른다)
  const borders = []
  for (const c of continents) {
    const land = c.area && c.drawBorder ? G.landmassById.get(c.landmass) : undefined
    if (!land) continue
    let run = []
    const flush = () => {
      if (run.length >= 2) borders.push({ id: c.id, p: flat(run) })
      run = []
    }
    for (let i = 0; i < c.area.length; i++) {
      const [ax, ay] = c.area[i]
      const [bx, by] = c.area[(i + 1) % c.area.length]
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.5))
      for (let k = 0; k < n; k++) {
        const x = ax + ((bx - ax) * k) / n
        const y = ay + ((by - ay) * k) / n
        if (Geo.pointInRing(x, y, land.ring)) run.push([x, y])
        else flush()
      }
    }
    flush()
  }

  // 시점별 바탕 (S6) — 단계마다 바탕과 다른 몫 (scripts/pixel/periods.mjs)
  let periods = null
  const periodCtx = { terrain, log: T.terrainLogOf(terrain), input, riverShapes, landscape, avoid, continents, locations }
  /** 단계마다의 시점별 바탕 (지금 지도의 createPeriods — periods.mjs 가 만든 것을 함께 쓴다) */
  let periodMaker = null
  if (opts.periods) {
    const { periodOf, periodLevels } = await import('./periods.mjs')
    const base = {
      ctx: periodCtx,
      glyphsOf,
      shapeRows,
      // 그 무렵 바탕이 더한 산 띠의 기호(뒤엉킨 계곡의 그 무렵 언덕 — 가독성 다듬기 R34)도 모양을 적는다 — 조각에는 더한 기호의 것만 싣는다 (periods.mjs)
      periodShapeKinds: new Set([...PERIOD_SHAPED, ...SHAPED]),
      cliffsOf,
      baseGlyphs,
      baseGlyphKeys: new Set(baseGlyphs.map((g) => g.join(':'))),
      baseLines: lines,
      baseHatch: hatchAbs,
      baseGorges: gorges,
      fineCells,
      fineGeo,
      raster,
    }
    periods = {}
    for (const L of await periodLevels()) {
      const p = await periodOf(L, base)
      if (p) periods[L] = p
    }
    periodMaker = base.periods
  }

  // 지역 상세 (S9) — 닿는 깊은 확대 칸의 기호를 보기마다 (fine.cv), 그림·이름 (children)
  let children = null
  if (CM) {
    if (!periodMaker) {
      const { createPeriods } = await import(src('map/period.ts'))
      periodMaker = createPeriods()
    }
    const views = new Map()
    const periodAt = (L) => {
      if (!views.has(L)) views.set(L, periodMaker.at(L, periodCtx) ?? null)
      return views.get(L)
    }
    const cv = await CM.buildChildFine(childSetup, { T, input, geo: fineGeo, glyphsOf, cells: childCells, periodAt })
    // [종류, x, y(앞 기호와의 차이), 보기 비트] — y, x 차례. 봉우리 모양은 줄마다 따로(cps — 보기마다 같은 자리에 다른 모양이 설 수 있어 줄을 가른다, A1 검토)
    cv.sort((a, b) => a[2] - b[2] || a[1] - b[1] || a[0] - b[0] || a[3] - b[3])
    cvAbs = cv.map((r) => [...r])
    for (let i = cv.length - 1; i > 0; i--) cv[i][2] -= cv[i - 1][2]
    fine.cps = cv.flatMap((r) => (r[4] ? [r[4].length, ...r[4]] : [0]))
    fine.cv = cv.flatMap((r) => r.slice(0, 4))
    fine.ps = shapeRows(shapes.fine)
    const art = await CM.buildChildArt(childSetup)
    // 손그림 잉크 자리 (S16, childink.mjs) — 가장 깊은 단계의 그림 이름이 비킨다
    const { buildChildInk } = await import('./childink.mjs')
    children = { meta: { v: 1, u: CM.CHILD_U, maps: art.maps, cells: childCells.flatMap((c) => [c.region.x0, c.region.y0, c.region.x1, c.region.y1]) }, images: art.images, ink: buildChildInk(art) }
  }

  return {
    ...(periods ? { periods } : {}),
    ...(children ? { children } : {}),
    v: 2,
    kinds: [...S.GLYPH_KINDS],
    // 협곡 단애의 주 방향 (가독성 다듬기 R58) — g 의 차례(y, x, 종류)로 협곡 기호마다 한 글자. 단애선(첫 조각 'M x0 y0 Q …')의 현이 0 ─, 1 ╲, 2 ╱, 3 │ 가운데 어디에 가까운지
    cd: canyonDirs(glyphs),
    g: encodeGlyphs(glyphs),
    // 봉우리 모양 [종류, x, y(×10 절대), 모양 숫자(종류마다 CTRL — ×10 차이)…, 빗금 수, (점 수, 점…)…] (객체 다듬기 A1) — Worker 는 virtual:pixel-terrain-peaks 로 따로 받는다
    ps: shapeRows(shapes.base),
    // 바다 표시의 지도 단위 모양 (R42a) — 봉우리 모양과 함께 virtual:pixel-terrain-peaks 로
    ss: seaShapes,
    fine: fine && !fine.ps ? { ...fine, ps: shapeRows(shapes.fine) } : fine,
    // 깊은 확대의 기호를 칸마다 (Worker 는 타일에 닿는 칸만 받는다 — virtual:pixel-terrain-fine, src/pixel/tiles/worker.ts)
    fineCells: fine ? fineCellsOf(fineAbs, shapes.fine, cvAbs, shapeRows, encodeGlyphs) : null,
    lines,
    hatch,
    gorges,
    rivers,
    marks,
    sea,
    washes,
    hedrons: hedronOut,
    hedronYield,
    borders,
    landSizes,
    landGrid,
    singleHedrons,
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
