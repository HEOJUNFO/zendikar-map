// 픽셀 지도(/pixel)의 시점별 바탕 (S6, docs/pixel-plan.md) — 지금 지도의 페이즈 바탕 엔진(src/map/period.ts, 고치지 않는다)을 Node 에서 그대로 돌려
// 시점의 단계(timeline.ts 의 periodLevel — 2009 L2, 2010 L3, 2015 L4, 2016 L5, 2023 L8. 2020 L6 은 켠 항목이 없어 바탕과 같다)마다 바탕과 다른 몫만 뽑는다.
// scripts/pixel/terrain.mjs 의 buildPixelTerrain 이 바탕을 만든 뒤 부른다 — 바탕의 기록(terrainLogOf)으로 다시 잇는 것도 지금 지도와 같다 (replayTerrain).
//
// 내는 것 (좌표는 지도 단위 × 10 의 정수, 점 목록은 앞 점과의 차이):
// - glyphs/fine: 흩뿌린 기호의 drop(바탕에서 빠진 것)·add(더한 것) — [종류, x, y] 를 이어 붙인 것 (절대 좌표). 깊은 확대는 닿는 칸만 다시 뿌려 견준다
// - lineDrop·hatchDrop·gorgeDrop: 숨긴 선의 단애 위 선·빗금·협곡 바닥 — 바탕 목록의 차례 번호
// - world/deep: 칠(clear·keep·dust·chalk·metal·tint·bands)과 물이 빠진 내해(floor·pools)의 고리 — 세계 지도 다듬기(한 픽셀 ≥ 1 단위)와 깊은 확대 다듬기
// - rivers: 그 무렵의 강 (dry 면 마른 강바닥), marks: 그 무렵의 한 점 기호 (큰 것은 그림 몫 parts — 지금 지도의 landmarkParts 를 꺾은선으로)
// - dirty: 바뀐 자리 상자 [x0, y0, x1, y1, …] (지도 단위) — 이 상자에 닿지 않는 타일은 바탕 타일을 그대로 쓴다
// - placeMarks·dryLabels·notes: 주 스레드 몫 (장소 표시 바꿈 — 'ruin' 이나 null(그 무렵 없음), 물빛 테두리를 떼는 물 이름, 장소마다의 '이 무렵')
import { pathToFileURL } from 'node:url'

const ROOT = new URL('../../', import.meta.url).pathname
const src = (p) => pathToFileURL(`${ROOT}src/${p}`).href

/** 시점이 쓰는 단계 — src/data/timeline.ts 의 TIMES 의 periodLevel (숨긴 시점도). 바탕과 같은 단계(켠 항목이 없다 — periodOf 가 null)는 조각을 내지 않는다 */
export async function periodLevels() {
  const { TIMES } = await import(src('data/timeline.ts'))
  return [...new Set(TIMES.map((t) => t.periodLevel))].sort((a, b) => a - b)
}

const q = (v) => Math.round(v * 10)
const flat = (pts) => {
  const o = []
  let px = 0
  let py = 0
  for (const [x, y] of pts) {
    const ix = q(x)
    const iy = q(y)
    o.push(ix - px, iy - py)
    px = ix
    py = iy
  }
  return o
}

/** SVG path 글 → 하위 경로들 { pts, closed } (절대 좌표). M L H V Q T C A Z 와 소문자 — 곡선은 꺾은선으로 (2 차·3 차 곡선 12 마디, 호는 15° 마다).
 * T 는 앞 2 차 곡선의 조절점을 끝점에 대칭으로 (앞이 Q·T 가 아니면 조절점 = 지금 점) — 지역 상세 그림(S9)의 물결 몫이 쓴다 */
export function flattenPath(d) {
  const out = []
  const re = /([MLHVQTCAZmlhvqtcaz])([^MLHVQTCAZmlhvqtcaz]*)/g
  // 앞 2 차 곡선의 조절점 (T 가 대칭으로 쓴다) — Q·T 가 아닌 명령 뒤에는 없다
  let qc = null
  let cur = null
  let x = 0
  let y = 0
  let sx = 0
  let sy = 0
  let m
  const push = (px, py) => cur.pts.push([px, py])
  while ((m = re.exec(d))) {
    const c = m[1]
    const rel = c === c.toLowerCase()
    const n = (m[2].match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? []).map(Number)
    const C = c.toUpperCase()
    const lastQ = qc
    qc = null
    if (C === 'Z') {
      if (cur) cur.closed = true
      x = sx
      y = sy
      continue
    }
    if (C === 'M') {
      for (let i = 0; i < n.length; i += 2) {
        const px = rel ? x + n[i] : n[i]
        const py = rel ? y + n[i + 1] : n[i + 1]
        if (i === 0) {
          cur = { pts: [[px, py]], closed: false }
          out.push(cur)
          sx = px
          sy = py
        } else push(px, py)
        x = px
        y = py
      }
      continue
    }
    if (!cur) {
      cur = { pts: [[x, y]], closed: false }
      out.push(cur)
    }
    if (C === 'L')
      for (let i = 0; i < n.length; i += 2) {
        x = rel ? x + n[i] : n[i]
        y = rel ? y + n[i + 1] : n[i + 1]
        push(x, y)
      }
    else if (C === 'H')
      for (const v of n) {
        x = rel ? x + v : v
        push(x, y)
      }
    else if (C === 'V')
      for (const v of n) {
        y = rel ? y + v : v
        push(x, y)
      }
    else if (C === 'Q')
      for (let i = 0; i < n.length; i += 4) {
        const [cx, cy, ex, ey] = rel ? [x + n[i], y + n[i + 1], x + n[i + 2], y + n[i + 3]] : n.slice(i, i + 4)
        for (let k = 1; k <= 12; k++) {
          const t = k / 12
          const a = (1 - t) ** 2
          const b = 2 * (1 - t) * t
          push(a * x + b * cx + t * t * ex, a * y + b * cy + t * t * ey)
        }
        x = ex
        y = ey
        qc = [cx, cy]
      }
    else if (C === 'T') {
      let prev = lastQ
      for (let i = 0; i < n.length; i += 2) {
        const [cx, cy] = prev ? [2 * x - prev[0], 2 * y - prev[1]] : [x, y]
        const ex = rel ? x + n[i] : n[i]
        const ey = rel ? y + n[i + 1] : n[i + 1]
        for (let k = 1; k <= 12; k++) {
          const t = k / 12
          const a = (1 - t) ** 2
          const b = 2 * (1 - t) * t
          push(a * x + b * cx + t * t * ex, a * y + b * cy + t * t * ey)
        }
        x = ex
        y = ey
        prev = [cx, cy]
      }
      qc = prev
    } else if (C === 'C')
      for (let i = 0; i < n.length; i += 6) {
        const [c1x, c1y, c2x, c2y, ex, ey] = rel ? [x + n[i], y + n[i + 1], x + n[i + 2], y + n[i + 3], x + n[i + 4], y + n[i + 5]] : n.slice(i, i + 6)
        for (let k = 1; k <= 12; k++) {
          const t = k / 12
          const a = (1 - t) ** 3
          const b = 3 * (1 - t) ** 2 * t
          const e = 3 * (1 - t) * t * t
          const f = t ** 3
          push(a * x + b * c1x + e * c2x + f * ex, a * y + b * c1y + e * c2y + f * ey)
        }
        x = ex
        y = ey
      }
    else if (C === 'A')
      for (let i = 0; i < n.length; i += 7) {
        const [rx0, ry0, rot, large, sweep] = n.slice(i, i + 5)
        const ex = rel ? x + n[i + 5] : n[i + 5]
        const ey = rel ? y + n[i + 6] : n[i + 6]
        for (const p of arcPoints(x, y, rx0, ry0, rot, large, sweep, ex, ey)) push(p[0], p[1])
        x = ex
        y = ey
      }
  }
  return out.filter((p) => p.pts.length >= 2)
}

/** 끝점으로 적은 호 → 꺾은선 (SVG 구현 노트 F.6.5) */
function arcPoints(x1, y1, rx, ry, rotDeg, large, sweep, x2, y2) {
  if (rx === 0 || ry === 0) return [[x2, y2]]
  rx = Math.abs(rx)
  ry = Math.abs(ry)
  const phi = (rotDeg * Math.PI) / 180
  const cos = Math.cos(phi)
  const sin = Math.sin(phi)
  const dx = (x1 - x2) / 2
  const dy = (y1 - y2) / 2
  const xp = cos * dx + sin * dy
  const yp = -sin * dx + cos * dy
  const lam = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry)
  if (lam > 1) {
    rx *= Math.sqrt(lam)
    ry *= Math.sqrt(lam)
  }
  const num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp
  const den = rx * rx * yp * yp + ry * ry * xp * xp
  const co = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den))
  const cxp = (co * rx * yp) / ry
  const cyp = (-co * ry * xp) / rx
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2
  const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
  const t1 = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry)
  let dt = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry)
  if (!sweep && dt > 0) dt -= 2 * Math.PI
  else if (sweep && dt < 0) dt += 2 * Math.PI
  const steps = Math.max(2, Math.ceil(Math.abs(dt) / (Math.PI / 12)))
  const out = []
  for (let k = 1; k <= steps; k++) {
    const t = t1 + (dt * k) / steps
    out.push([cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos])
  }
  return out
}

/** path 글 → 닫힌 고리들 (칠) */
const ringsOf = (d) => (d ? flattenPath(d).filter((p) => p.pts.length >= 3).map((p) => p.pts) : [])
/** path 글 → 꺾은선들 (선) — 닫힌 하위 경로(Z)는 첫 점으로 돌아오는 변까지 (S6 검토 — 떨어진 하늘거주지 둥근 지붕의 밑변이 빠졌다) */
const linesOf = (d) =>
  d
    ? flattenPath(d).map((p) => {
        const [fx, fy] = p.pts[0]
        const [lx, ly] = p.pts[p.pts.length - 1]
        return p.closed && (fx !== lx || fy !== ly) ? [...p.pts, p.pts[0]] : p.pts
      })
    : []

/** 그림 몫의 종류 — 칠과 선 (지금 지도의 map.css .lm-*) */
const LM_FILL = new Set(['lm-shadow', 'lm-fill', 'lm-shade', 'lm-dark', 'lm-water', 'lm-blood', 'lm-snow', 'lm-fire-wash'])
const LM_STROKE = new Set(['lm-ink', 'lm-hatch', 'lm-fire-ink', 'lm-water-ink', 'lm-waterline', 'lm-smoke'])
/** 한 점 기호의 그림 몫 — 지금 지도의 landmarkParts 를 칠은 고리, 선은 꺾은선으로 (차이로 적은 0.1 단위) */
export function vectorParts(g, landmarkParts) {
  return landmarkParts(g).map((p) => {
    if (!LM_FILL.has(p.cls) && !LM_STROKE.has(p.cls)) throw new Error(`pixel: 그림 몫 ${p.cls} 를 모른다 (${g.id})`)
    const fill = LM_FILL.has(p.cls)
    return { c: p.cls.slice(3), f: fill ? 1 : 0, p: (fill ? ringsOf(p.d) : linesOf(p.d)).map(flat) }
  })
}

/** 픽셀 지도가 그림 몫(parts)으로 그리는 한 점 기호 — 나머지(폭포)는 바탕처럼 그림판의 그림 */
const VECTOR_KINDS = new Set(['crashed-skyclave', 'compleated-ground-oil', 'compleated-ground', 'compleated-skyclave', 'realmbreaker-sky', 'realmbreaker-sea'])

/** 칠 칸 (지도 단위) */
const WASH_CELL = 4
function washGrid(v, raster) {
  if (!v.washes || !raster) return null
  const W = Math.ceil(2400 / WASH_CELL)
  const H = Math.ceil(1700 / WASH_CELL)
  const rows = []
  const code = { dust: 1, chalk: 2, metal: 3 }
  for (let j = 0; j < H; j++) {
    const y = (j + 0.5) * WASH_CELL
    const vals = new Uint8Array(W)
    let any = false
    for (let i = 0; i < W; i++) {
      const x = (i + 0.5) * WASH_CELL
      if (raster.landAt(x, y) < 0 || raster.waterAt(x, y)) continue
      const k = v.washAt(x, y, false)
      if (k) {
        vals[i] = code[k]
        any = true
      }
    }
    if (!any) continue
    let i0 = vals.findIndex((x) => x)
    let i1 = W - 1
    while (!vals[i1]) i1--
    const out = [j, i0]
    let cur = vals[i0]
    let len = 0
    for (let i = i0; i <= i1 + 1; i++) {
      const x = i <= i1 ? vals[i] : -1
      if (x === cur) len++
      else {
        out.push(cur, len)
        cur = x
        len = 1
      }
    }
    rows.push(out)
  }
  return rows.length ? { cell: WASH_CELL, rows } : null
}

/**
 * 시점의 단계 L 하나의 바탕과 다른 몫.
 * @param base buildPixelTerrain 이 넘긴 것 — ctx(PeriodCtx 꼴), glyphsOf, cliffsOf, baseGlyphs·baseGlyphKeys, baseLines·baseHatch(절대)·baseGorges, fineCells, fineGeo
 */
export async function periodOf(L, base) {
  const { createPeriods } = await import(src('map/period.ts'))
  const { periodAt, checkPeriods } = await import(src('data/periods/index.ts'))
  const { periodRiversOf, periodGlyphsOf } = await import(src('map/periodTerrain.ts'))
  const Lm = await import(src('map/landscape.ts'))
  const { landmarkParts } = await import(src('map/landscapeGlyphs.ts'))
  const T = await import(src('map/terrain.ts'))
  const { ctx } = base
  if (!base.periods) {
    checkPeriods()
    base.periods = createPeriods()
  }
  const v = base.periods.at(L, ctx)
  const { continents } = await import(src('data/continents.ts'))
  if (!v) return null
  const set = periodAt(L)

  // 흩뿌린 기호 — 바탕과 같은 자리·종류의 기호는 그대로
  const glyphs = base.glyphsOf(v.terrain, { shapes: false })
  const keys = new Set(glyphs.map((g) => g.join(':')))
  const drop = base.baseGlyphs.filter((g) => !keys.has(g.join(':')))
  const add = glyphs.filter((g) => !base.baseGlyphKeys.has(g.join(':')))

  // 깊은 확대의 기호 — 닿는 칸만 그 칸의 페이즈로 다시 뿌려 바탕 칸과 견준다 (지금 지도의 fineTerrain 이 FineOverlay.keyFor 로 고르는 칸)
  const fineDrop = []
  const fineAdd = []
  let fineCells = 0
  for (const cell of base.fineCells ?? []) {
    // 지역 상세에 닿는 칸은 이 목록에 없다 — 보기마다 따로 뿌린 기호(terrain.mjs 의 cv)가 그 시점의 바탕까지 맡는다 (S9)
    if (!v.fine.keyFor(1, cell.region)) continue
    fineCells++
    const t = T.buildTerrain(ctx.input, { g: cell.g, region: cell.region, seed: cell.seed, geo: base.fineGeo, phase: v.fine.phaseFor(1, cell.region) })
    const cg = base.glyphsOf(t, { g: cell.g, shapes: false })
    const ck = new Set(cg.map((g) => g.join(':')))
    for (const g of cell.glyphs) if (!ck.has(g.join(':'))) fineDrop.push(g)
    for (const g of cg) if (!cell.keys.has(g.join(':'))) fineAdd.push(g)
  }

  // 단애 — 숨긴 선(협곡)의 위 선·빗금·협곡 바닥은 바탕 목록의 차례 번호로 뺀다 (빗금은 차례로 솎으니 목록을 줄이지 않고 건너뛴다).
  // 다시 이은 지형은 바탕에서 몫을 빼기만 한다 — 그 밖의 차이가 있으면 멈춘다
  const c = base.cliffsOf(v.terrain)
  const lineKey = (l) => `${l.w}:${l.p.join(',')}`
  const lineKeys = new Set(c.lines.map(lineKey))
  const lineDrop = base.baseLines.flatMap((l, i) => (lineKeys.has(lineKey(l)) ? [] : [i]))
  const hk = (h, i) => `${h[i]},${h[i + 1]},${h[i + 2]},${h[i + 3]}`
  const hatchKeys = new Set()
  for (let i = 0; i < c.hatch.length; i += 4) hatchKeys.add(hk(c.hatch, i))
  const hatchDrop = []
  for (let i = 0, n = 0; i < base.baseHatch.length; i += 4, n++) if (!hatchKeys.has(hk(base.baseHatch, i))) hatchDrop.push(n)
  const gorgeKeys = new Set(c.gorges.map((g) => g.join(',')))
  const gorgeDrop = base.baseGorges.flatMap((g, i) => (gorgeKeys.has(g.join(',')) ? [] : [i]))
  if (c.lines.length !== base.baseLines.length - lineDrop.length || c.hatch.length !== base.baseHatch.length - hatchDrop.length * 4 || c.gorges.length !== base.baseGorges.length - gorgeDrop.length)
    throw new Error(`pixel periods: 단계 ${L} 의 단애가 바탕에서 몫을 빼기만 한 것이 아니다`)

  // 칠·물이 빠진 내해
  const washesOf = (w) =>
    w && {
      clear: ringsOf(w.clear).map(flat),
      keep: ringsOf(w.keep).map(flat),
      dust: ringsOf(w.dust).map(flat),
      chalk: ringsOf(w.chalk).map(flat),
      metal: ringsOf(w.metal).map(flat),
      tint: ringsOf(w.tint).map(flat),
      bands: w.bands.map((b) => ({ fill: ringsOf(b.d).map(flat), ink: linesOf(b.ink).map(flat) })),
    }
  const basinOf = (b) => b && { floor: ringsOf(b.floor).map(flat), pools: ringsOf(b.pools).map(flat) }
  const ws = washesOf(v.washes?.world)
  const wd = washesOf(v.washes?.deep())
  const bs = basinOf(v.basin?.world)
  const bd = basinOf(v.basin?.deep())
  // 물이 빠진 바닥 무늬 가운데 기하 무늬의 몫 — drybed 기호의 그림을 고른다
  const craze = set.drains[0]?.craze ?? 0

  // 그 무렵의 강 (마른 강바닥은 dry)
  const dryIds = new Set(set.rivers.filter((r) => r.dry).map((r) => r.id))
  const rivers = Lm.shapeRivers(periodRiversOf(set), ctx.avoid).map((r) => ({
    id: r.id,
    p: flat(r.samples),
    w: r.widths.map((w, i, a) => Math.round(w * 100) - (i ? Math.round(a[i - 1] * 100) : 0)),
    dry: dryIds.has(r.id) ? 1 : 0,
  }))
  // 그 무렵의 한 점 기호 — 큰 것은 그림 몫(parts: 칠은 고리, 선은 꺾은선)
  const marks = periodGlyphsOf(set).map((g) => {
    const m = { id: g.id, k: g.kind, x: q(g.at[0]), y: q(g.at[1]), s: g.size ?? 1, a: g.angle ?? 0 }
    if (!VECTOR_KINDS.has(g.kind)) return m
    m.parts = vectorParts(g, landmarkParts)
    return m
  })

  // 바뀐 자리 상자 (지도 단위)
  const dirty = []
  const box = (x0, y0, x1, y1, pad) => dirty.push(x0 - pad, y0 - pad, x1 + pad, y1 + pad)
  const unflat = (p) => {
    const out = []
    for (let i = 0, x = 0, y = 0; i < p.length; i += 2) {
      x += p[i]
      y += p[i + 1]
      out.push([x / 10, y / 10])
    }
    return out
  }
  const ptsBox = (pts, pad) => {
    if (!pts.length) return
    let x0 = Infinity
    let y0 = Infinity
    let x1 = -Infinity
    let y1 = -Infinity
    for (const [x, y] of pts) {
      x0 = Math.min(x0, x)
      y0 = Math.min(y0, y)
      x1 = Math.max(x1, x)
      y1 = Math.max(y1, y)
    }
    box(x0, y0, x1, y1, pad)
  }
  // 기호는 40 단위 칸마다 묶는다 (기호 하나마다 상자를 내지 않게) — 기호 그림이 기준점에서 닿는 폭은 타일 쪽이 더한다
  const cells = new Set()
  for (const g of [...drop, ...add, ...fineDrop, ...fineAdd]) cells.add(`${Math.floor(g[1] / 400)}:${Math.floor(g[2] / 400)}`)
  for (const k of [...cells].sort()) {
    const [cx, cy] = k.split(':').map(Number)
    box(cx * 40, cy * 40, cx * 40 + 40, cy * 40 + 40, 0)
  }
  for (const w of [ws, wd]) {
    if (!w) continue
    for (const list of [w.clear, w.keep, w.dust, w.chalk, w.metal, w.tint, ...w.bands.map((b) => b.fill), ...w.bands.map((b) => b.ink)]) for (const r of list) ptsBox(unflat(r), 1)
  }
  for (const b of [bs, bd]) if (b) for (const r of [...b.floor, ...b.pools]) ptsBox(unflat(r), 1)
  for (const r of rivers) ptsBox(unflat(r.p), 4)
  for (const m of marks) {
    if (m.parts) ptsBox(m.parts.flatMap((p) => p.p.flatMap(unflat)), 1)
    else box(m.x / 10, m.y / 10, m.x / 10, m.y / 10, 12 * m.s)
  }
  for (const i of lineDrop) ptsBox(unflat(base.baseLines[i].p), 1)
  for (const n of hatchDrop) {
    const [x, y, dx, dy] = base.baseHatch.slice(n * 4, n * 4 + 4).map((v) => v / 10)
    box(Math.min(x, x + dx), Math.min(y, y + dy), Math.max(x, x + dx), Math.max(y, y + dy), 1)
  }
  for (const i of gorgeDrop) ptsBox(unflat(base.baseGorges[i]), 1)

  const notes = {}
  for (const l of ctx.locations) {
    const n = v.notesOf(l.id)
    if (n.length) notes[l.id] = n
  }
  return {
    worker: {
      v: 1,
      level: L,
      glyphs: { drop: drop.flat(), add: add.flat() },
      fine: { drop: fineDrop.flat(), add: fineAdd.flat() },
      lineDrop,
      hatchDrop,
      gorgeDrop,
      world: { washes: ws, basin: bs },
      deep: { washes: wd, basin: bd },
      craze,
      rivers,
      marks,
    },
    main: {
      level: L,
      dirty: dirty.map((x) => Math.round(x * 10) / 10),
      placeMarks: [...v.marks],
      dryLabels: [...v.dryLabels],
      legend: v.legend,
    },
    notes,
    // 이름 테두리를 칠 빛으로 바꾸는 칠 자리 (S23 — 지금 지도의 labelWash·washAt): 4 단위 칸마다 흰 가루 1·백악 2·죽은 금속 3 (땅 위만 — 물 위는 칠이 없다).
    // 칸이 있는 줄마다 [cy, cx0, 값, 길이, 값, 길이, …]
    wash: washGrid(v, base.raster),
    // 패널의 '지도에 그린 지형' (S22 — 지금 지도의 period.featuresOf·hiddenLines): 그 무렵에만 그린 지형(이름·종류·추정·장소)과 그 무렵 숨긴 바탕 선
    panel: {
      features: [...new Map(continents.flatMap((c) => v.featuresOf(c.id, 'continent')).map((f) => [f.feature.id, f])).values()].map((f) => ({
        id: f.feature.id,
        ...(f.feature.label ? { label: f.feature.label } : {}),
        kind: f.kind,
        ...(f.feature.estimate ? { estimate: f.feature.estimate } : {}),
        ...(f.feature.location ? { location: f.feature.location } : {}),
        ...(f.feature.alsoAt?.length ? { alsoAt: f.feature.alsoAt } : {}),
        continentId: f.continentId,
      })),
      hiddenLines: [...(v.hiddenLines ?? [])],
    },
    stats: { drop: drop.length, add: add.length, fineCells, fineDrop: fineDrop.length, fineAdd: fineAdd.length, lineDrop: lineDrop.length, hatchDrop: hatchDrop.length, gorgeDrop: gorgeDrop.length, rivers: rivers.length, marks: marks.length, dirty: dirty.length / 4 },
  }
}
