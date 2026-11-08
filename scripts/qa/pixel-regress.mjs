// 픽셀 지도(/pixel)의 타일 시험 — Node 만 (docs/pixel-plan.md S2).
//   node scripts/qa/pixel-regress.mjs                       # 이음매·차례 시험 (실패하면 종료 코드 1)
//   node scripts/qa/pixel-regress.mjs --save <파일.json>    # 타일 해시 기준선을 남긴다
//   node scripts/qa/pixel-regress.mjs --compare <파일.json> # 기준선과 견준다 (다른 타일이 있으면 1)
// 이음매: 타일을 따로 그려 이어 붙인 것이 그 범위를 한 번에 그린 것과 바이트까지 같은가 — 한 픽셀이 1 단위 이상인 단계는 세계 전체,
//   더 고운 단계는 해안이 많은 곳과 격자 끝(오른쪽·아래)의 3×3 타일 묶음. 차례: 거꾸로 그려도 같은 해시인가.
// 해시: 거친 세 단계(16·8·4)는 모든 타일, 고운 단계는 일곱 장마다 한 장 — 팔레트 b·물가 디더링(기본값)과 band 한 단계.
// 바탕 지형(S4)을 함께 그린다 — 흩뿌린 기호가 비키는 이름 상자는 영어·한 픽셀 2×·DPR 2 의 이름 배치에서 (앱처럼 타일마다 닿는 것만 넘긴다).
//   --no-terrain 이면 S2 의 바탕만 (기준선 .qa-baselines/pixel-tiles-s2.json 과 같아야 한다), --lang ko 면 한국어 이름 상자
//   --time t (1–6, S6) 면 그 시점의 바탕 — 이음매는 바뀐 자리 둘레의 3×3 타일 묶음(한 픽셀 1 단위 이상은 세계 전체), 그리고 바뀐 자리에 닿지 않는
//   타일(앱이 바탕 타일을 함께 쓰는 타일)이 바탕으로 그린 것과 바이트까지 같은가. 이름 상자는 그 시점의 이름 배치에서 (사가에 매인 카드·숨긴 장소·피할 상자)
// 지역 상세(S9): 가장 깊은 단계에서 지역 상세에 닿는 타일은 앱처럼 그 보기(끔 0, 시점 t)의 그림을 얹는다 (PixelApp 의 tileInfo — 닿지 않는 타일은 얹지 않는다).
//   지역 상세마다 범위 모서리의 3×3 타일 묶음 이음매(닿는 타일과 닿지 않는 타일이 맞닿는 곳)와, 닿지 않는다고 본 둘레 타일이 얹어 그린 것과 같은지(열쇠의 몫이 넉넉한지)
import './pixel-hooks.mjs'
import crypto from 'node:crypto'
import fs from 'node:fs'

const ROOT = new URL('../../', import.meta.url).pathname
const { ringsFor } = await import(`${ROOT}src/pixel/rings.ts`)
const { renderTile, rasterRegion, paintRegion, HALO } = await import(`${ROOT}src/pixel/raster/world.ts`)
const { gridFor } = await import(`${ROOT}src/pixel/raster/fill.ts`)
const { PALETTES } = await import(`${ROOT}src/pixel/raster/palette.ts`)
const { LEVELS, MAP_W, MAP_H } = await import(`${ROOT}src/pixel/view.ts`)
const { cssPerUnit } = await import(`${ROOT}src/pixel/view.ts`)
const { decodeTerrain, paintTerrain } = await import(`${ROOT}src/pixel/raster/terrain.ts`)
const { buildPixelTerrain } = await import(`${ROOT}scripts/pixel/terrain.mjs`)
const { decodePeriod } = await import(`${ROOT}src/pixel/raster/period.ts`)
const { withPeriod } = await import(`${ROOT}src/pixel/raster/terrain.ts`)
const { timeMarks, touchesDirty } = await import(`${ROOT}src/pixel/time.ts`)
const TILE = 256 // src/pixel/tiles/store.ts 의 TILE (그 파일은 Worker 를 만들어 Node 에서 읽지 않는다)

const argv = process.argv.slice(2)
const opt = (k) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : null)
const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16)
const pal = PALETTES.b
const TERRAIN = !argv.includes('--no-terrain')
const TIME = opt('time') === null ? null : Number(opt('time'))
const raw = TERRAIN ? await buildPixelTerrain({ fine: true, periods: TIME !== null }) : null
const baseTerrain = raw ? decodeTerrain(raw) : undefined
const { TIMES, landAt, SHOWN_TIME_POINTS } = await import(`${ROOT}src/data/timeline.ts`)
const LEVEL = TIME === null ? null : TIMES.find((t) => t.t === TIME)?.periodLevel
if (TIME !== null && LEVEL === undefined) throw new Error(`시점 ${TIME} 이 없다`)
const period = LEVEL && raw?.periods[LEVEL]
/** 그 시점의 바뀐 자리 상자 (없으면 바탕과 같은 시점 — 2020) */
const DIRTY = period ? period.main.dirty : []
const terrain = period ? withPeriod(baseTerrain, decodePeriod(period.worker, raw.kinds, raw.hatch.length / 4), raw.kinds) : baseTerrain
if (TIME !== null) console.log(`시점 ${TIME} (단계 ${LEVEL}) — 바뀐 자리 상자 ${DIRTY.length / 4}개${period ? '' : ' (바탕과 같다)'}`)
/** 단계마다 이름 상자 — 앱과 같은 셈 (PixelApp.tsx 의 holes) */
/** 떠 있는 헤드론이 비킨 모습 (S20) — 단계마다, 셈하는 쪽 */
let MOVES = []
let YIELDER = null
const HOLES = await (async () => {
  if (!TERRAIN) return LEVELS.map(() => [])
  const { slimMarks } = await import(`${ROOT}src/pixel/marks/slim.ts`)
  const { layoutLevels } = await import(`${ROOT}src/pixel/labels/layout.ts`)
  const { levelHoles } = await import(`${ROOT}src/pixel/labels/holes.ts`)
  const { locations } = await import(`${ROOT}src/data/locations.ts`)
  const { LAND_CARDS } = await import(`${ROOT}src/data/cards.ts`)
  const { continents } = await import(`${ROOT}src/data/continents.ts`)
  const { PERIOD_LABEL_AVOID, PERIOD_MARK_ANCHOR } = await import(`${ROOT}src/data/labelAvoid.ts`)
  const all = slimMarks(locations, LAND_CARDS, continents, (c) => SHOWN_TIME_POINTS.filter((t) => landAt(c, t)))
  // 앱(PixelApp.tsx 의 tm·layouts·holes)과 같은 셈 — 끔이면 사가에 매인 카드를 빼고
  const tm = timeMarks(all, TIME, period ? period.main : undefined)
  const lang = opt('lang') === 'ko' ? 'ko' : 'en'
  const pxAt = LEVELS.map((_, i) => cssPerUnit(i, 2, 2))
  // 시점의 페이즈 그림(S7) — 그 이름도 기호가 비킨다 (앱의 layouts 와 같은 입력)
  let figOpts = {}
  if (TIME !== null) {
    const { buildPixelFigures } = await import(`${ROOT}scripts/pixel/figures.mjs`)
    const { figuresAt } = await import(`${ROOT}src/pixel/figures/store.ts`)
    const fm = (await buildPixelFigures()).meta
    const figures = figuresAt(fm, TIME).map((f) => ({ key: `f${f.pi}`, name: f.name, nameKo: f.nameKo, size: f.size, box: f.box, prefer: f.label, fromLevel: f.fromLevel }))
    figOpts = { figures, uAt: LEVELS, figureMinPx: fm.minPx }
  }
  // 지역 상세의 이름 (S9) — 앱의 detail 과 같은 셈
  const { detailLayout, detailLevelOf } = await import(`${ROOT}src/pixel/detail.ts`)
  const detail = raw.children ? { detail: detailLayout(raw.children.meta, tm.marks, TIME ?? 0, detailLevelOf(raw.children.meta, LEVELS)) } : {}
  // 손그림 잉크 자리 (S16) — 앱과 같은 셈
  const { inkMask } = await import(`${ROOT}src/pixel/labels/ink.ts`)
  const inkM = raw.children?.ink ? inkMask(raw.children.ink) : null
  if (inkM) detail.ink = (b) => inkM.count(b, TIME ?? 0)
  // 거대 헤드론 몸통 (S18) — 앱과 같은 셈
  if (raw?.singleHedrons) {
    const { singleHedronSoft } = await import(`${ROOT}src/pixel/time.ts`)
    detail.soft = singleHedronSoft(raw.singleHedrons, pxAt, detailLevelOf(raw.children.meta, LEVELS))
  }
  const lo = { ...(LEVEL ? { avoid: PERIOD_LABEL_AVOID[LEVEL], prefer: PERIOD_MARK_ANCHOR[LEVEL] } : {}), ...figOpts, ...detail, landSizes: raw?.landSizes }
  const lays = layoutLevels(tm.marks, lang, pxAt, MAP_W, lo)
  // 떠 있는 헤드론이 이름을 비킨 모습 (S20) — 앱(PixelApp 의 hedronMovesAt)과 같은 셈
  if (raw?.hedronYield) {
    const { hedronYielder, HEDRON_FROM_U, runJob } = await import(`${ROOT}src/pixel/hedrons.ts`)
    const { figurePixelBox } = await import(`${ROOT}src/pixel/labels/layout.ts`)
    YIELDER = hedronYielder(raw.hedronYield, raw.children.meta)
    const marksAt = [...tm.marks.points.map((p) => p.at), ...tm.marks.cards.map((c) => c.at)]
    const figs = lo.figures ?? []
    MOVES = lays.map((lay, lv) => {
      if (LEVELS[lv] > HEDRON_FROM_U) return null
      const names = levelHoles(tm.marks, lay, lang, pxAt[lv], tm.hidden, false)
      const shun = figs.filter((f) => lay.figures.has(f.key)).map((f) => figurePixelBox(f.box, LEVELS[lv]))
      return runJob(YIELDER.movesJob(names, marksAt, shun, pxAt[lv], lv === detailLevelOf(raw.children.meta, LEVELS)))
    })
  }
  if (MOVES.length) console.log(`떠 있는 헤드론이 이름을 비킨 것 — 단계마다 ${MOVES.map((m) => (m ? `${[...m.values()].filter((v) => v !== 'hide').length}/${[...m.values()].filter((v) => v === 'hide').length}` : '-')).join(' · ')} (옮김/사라짐)`)
  return lays.map((l, i) => levelHoles(tm.marks, l, lang, pxAt[i], tm.hidden))
})()
/** 타일에 닿는 헤드론의 비킨 모습 — 앱(PixelApp 의 tileInfo)과 같은 셈. 없으면 모두 */
function hedronsFor(u, t) {
  const moves = MOVES[LEVELS.indexOf(u)]
  if (!moves) return undefined
  const ids = t ? YIELDER.touching(moves, t.x0 * u - 10 * u, t.y0 * u - 10 * u, (t.x0 + t.w) * u + 10 * u, (t.y0 + t.h) * u + 10 * u) : [...moves.keys()]
  const out = ids.map((k) => {
    const v = moves.get(k)
    return v === 'hide' ? [k, 0, 0, 1] : [k, Math.round(v.dx * 100) / 100, Math.round(v.dy * 100) / 100, 0]
  })
  return out.length ? out : undefined
}
// 지역 상세 (S9) — 그 보기의 그림을 모두 풀어 둔다 (Worker 는 타일에 닿는 것만 푼다 — 같은 그림)
const { decodeChildImage, touchesChildren } = await import(`${ROOT}src/pixel/raster/child.ts`)
const VIEW = TIME ?? 0
const CHILD = raw?.children
  ? { meta: raw.children.meta, view: VIEW, images: new Map(raw.children.meta.maps.map((m) => [m.id, decodeChildImage(raw.children.images[m.id][m.img[VIEW]], m.w * m.h)])) }
  : undefined
/** 앱이 그 타일에 지역 상세를 얹는가 (PixelApp 의 tileInfo — 기호 그림·둘레가 걸쳐 들어오는 몫까지) */
const childTile = (u, t) => {
  if (!CHILD || u !== CHILD.meta.u) return false
  const m = (18 + 10) * u
  return touchesChildren(CHILD.meta, t.x0 * u - m, t.y0 * u - m, (t.x0 + t.w) * u + m, (t.y0 + t.h) * u + m)
}
const OPT = { shore: 'dither', terrain, child: CHILD }
const BASE_OPT = { shore: 'dither', terrain: baseTerrain }
/** 타일 하나에 넘기는 이름 상자 — 앱처럼 그 타일(과 기호 몫 10 픽셀)에 닿는 것만 */
const holesFor = (u, t) => {
  const boxes = HOLES[LEVELS.indexOf(u)]
  const m = 10 * u
  const out = []
  for (const b of boxes)
    if (b.x1 > t.x0 * u - m && b.x0 < (t.x0 + t.w) * u + m && b.y1 > t.y0 * u - m && b.y0 < (t.y0 + t.h) * u + m) out.push(b.x0, b.y0, b.x1, b.y1)
  return Float32Array.from(out)
}
const tileOpt = (u, t) => {
  const { child, ...o } = OPT
  return terrain ? { ...o, holes: holesFor(u, t), hedrons: hedronsFor(u, t), ...(childTile(u, t) ? { child } : {}) } : o
}

/** 범위 r 을 한 번에 그린 RGBA (둘레 HALO 를 더해 세고 r 만 칠한다 — 타일과 같은 규칙). 이름 상자는 모두 */
function renderWhole(u, r) {
  if (CHILD && u === CHILD.meta.u) return renderTile(ringsFor(u), u, r, pal, { ...OPT, holes: HOLES[LEVELS.indexOf(u)].flatMap((b) => [b.x0, b.y0, b.x1, b.y1]), hedrons: hedronsFor(u) })
  const cells = rasterRegion(ringsFor(u), u, { x0: r.x0 - HALO, y0: r.y0 - HALO, w: r.w + 2 * HALO, h: r.h + 2 * HALO }, terrain)
  const out = paintRegion(cells, pal, OPT, r)
  if (terrain) paintTerrain(out, terrain, cells.grid, cells.region, cells.kind, r, pal, HOLES[LEVELS.indexOf(u)].flatMap((b) => [b.x0, b.y0, b.x1, b.y1]), undefined, undefined, undefined, hedronsFor(u))
  return out
}

/** 범위 r 을 덮는 타일을 따로 그려 r 크기 RGBA 로 이어 붙인다 */
function renderTiled(u, r, reverse = false) {
  const g = gridFor(MAP_W, MAP_H, u)
  const out = new Uint8ClampedArray(r.w * r.h * 4)
  const tiles = []
  for (let ty = Math.floor(r.y0 / TILE); ty * TILE < r.y0 + r.h; ty++)
    for (let tx = Math.floor(r.x0 / TILE); tx * TILE < r.x0 + r.w; tx++) tiles.push([tx, ty])
  if (reverse) tiles.reverse()
  const ms = []
  for (const [tx, ty] of tiles) {
    const t = { x0: tx * TILE, y0: ty * TILE, w: Math.min(TILE, g.w - tx * TILE), h: Math.min(TILE, g.h - ty * TILE) }
    const t0 = performance.now()
    const px = renderTile(ringsFor(u), u, t, pal, tileOpt(u, t))
    ms.push(performance.now() - t0)
    for (let y = 0; y < t.h; y++) {
      const gy = t.y0 + y
      if (gy < r.y0 || gy >= r.y0 + r.h) continue
      for (let x = 0; x < t.w; x++) {
        const gx = t.x0 + x
        if (gx < r.x0 || gx >= r.x0 + r.w) continue
        const s = (y * t.w + x) * 4
        const d = ((gy - r.y0) * r.w + (gx - r.x0)) * 4
        out[d] = px[s]
        out[d + 1] = px[s + 1]
        out[d + 2] = px[s + 2]
        out[d + 3] = px[s + 3]
      }
    }
  }
  return { out, ms }
}

function firstDiff(a, b, w) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return `(${(i / 4) % w | 0}, ${Math.floor(i / 4 / w)})`
  return null
}

const median = (xs) => [...xs].sort((a, b) => a - b)[xs.length >> 1] ?? 0

if (opt('save') || opt('compare')) {
  const hashes = {}
  for (const u of LEVELS) {
    const g = gridFor(MAP_W, MAP_H, u)
    const ntx = Math.ceil(g.w / TILE)
    const nty = Math.ceil(g.h / TILE)
    let n = 0
    for (let ty = 0; ty < nty; ty++)
      for (let tx = 0; tx < ntx; tx++) {
        if (u < 4 && n++ % 7) continue
        const t = { x0: tx * TILE, y0: ty * TILE, w: Math.min(TILE, g.w - tx * TILE), h: Math.min(TILE, g.h - ty * TILE) }
        hashes[`${u}|${tx}|${ty}`] = sha(renderTile(ringsFor(u), u, t, pal, tileOpt(u, t)))
      }
  }
  const t4 = gridFor(MAP_W, MAP_H, 4)
  hashes['band|4|whole'] = sha(paintRegion(rasterRegion(ringsFor(4), 4, { x0: 0, y0: 0, w: t4.w, h: t4.h }, terrain), pal, { shore: 'band', terrain }, { x0: 0, y0: 0, w: t4.w, h: t4.h }))
  if (opt('save')) {
    fs.writeFileSync(opt('save'), JSON.stringify(hashes, null, 0))
    console.log(`타일 해시 ${Object.keys(hashes).length}개 → ${opt('save')}`)
  } else {
    const base = JSON.parse(fs.readFileSync(opt('compare'), 'utf8'))
    const diff = Object.keys({ ...base, ...hashes }).filter((k) => base[k] !== hashes[k])
    console.log(diff.length ? `다른 타일 ${diff.length}개: ${diff.slice(0, 12).join(', ')}${diff.length > 12 ? ' …' : ''}` : `타일 ${Object.keys(hashes).length}개 모두 같다`)
    // 지역 상세(S9) 앞의 기준선과 견줄 때 — 다른 타일이 모두 지역 상세에 닿는 타일인가
    if (diff.length && CHILD) {
      const other = diff.filter((k) => {
        const [u, tx, ty] = k.split('|').map(Number)
        if (Number.isNaN(tx)) return true
        const g = gridFor(MAP_W, MAP_H, u)
        return !childTile(u, { x0: tx * TILE, y0: ty * TILE, w: Math.min(TILE, g.w - tx * TILE), h: Math.min(TILE, g.h - ty * TILE) })
      })
      console.log(`  그 가운데 지역 상세에 닿지 않는 타일 ${other.length}개${other.length ? `: ${other.slice(0, 12).join(', ')}` : ''}`)
    }
    process.exit(diff.length ? 1 : 0)
  }
  process.exit(0)
}

let fail = 0

if (TIME !== null) {
  // 바뀐 자리에 닿지 않는 타일 — 바탕으로 그린 것과 같아야 한다 (앱은 이 타일을 끔·다른 시점과 함께 쓴다). 한 픽셀 1 단위 이상은 모든 타일, 더 고운 단계는 바뀐 자리 둘레 고리
  let same = 0
  let bad = 0
  let touched = 0
  for (const u of LEVELS) {
    const g = gridFor(MAP_W, MAP_H, u)
    const ntx = Math.ceil(g.w / TILE)
    const nty = Math.ceil(g.h / TILE)
    const tilesAt = new Set()
    if (u >= 1) for (let ty = 0; ty < nty; ty++) for (let tx = 0; tx < ntx; tx++) tilesAt.add(`${tx},${ty}`)
    else
      for (let i = 0; i < DIRTY.length; i += 4) {
        const ax = Math.max(0, Math.floor((DIRTY[i] - 30 * u) / u / TILE) - 1)
        const bx = Math.min(ntx - 1, Math.floor((DIRTY[i + 2] + 30 * u) / u / TILE) + 1)
        const ay = Math.max(0, Math.floor((DIRTY[i + 1] - 30 * u) / u / TILE) - 1)
        const by = Math.min(nty - 1, Math.floor((DIRTY[i + 3] + 30 * u) / u / TILE) + 1)
        // 고운 단계는 상자가 커 타일이 많다 — 상자 둘레의 고리(닿지 않는 첫 타일)만
        for (let ty = ay; ty <= by; ty++) for (let tx = ax; tx <= bx; tx++) if (tx === ax || tx === bx || ty === ay || ty === by) tilesAt.add(`${tx},${ty}`)
      }
    for (const k of tilesAt) {
      const [tx, ty] = k.split(',').map(Number)
      const t = { x0: tx * TILE, y0: ty * TILE, w: Math.min(TILE, g.w - tx * TILE), h: Math.min(TILE, g.h - ty * TILE) }
      if (touchesDirty(DIRTY, u, t.x0 * u, t.y0 * u, (t.x0 + t.w) * u, (t.y0 + t.h) * u) || childTile(u, t)) {
        touched++
        continue
      }
      const holes = holesFor(u, t)
      const a = renderTile(ringsFor(u), u, t, pal, { ...OPT, child: undefined, holes })
      const b = renderTile(ringsFor(u), u, t, pal, { ...BASE_OPT, holes })
      if (sha(a) === sha(b)) same++
      else {
        bad++
        if (bad <= 8) console.log(`다르다  u=${u} 타일 ${tx},${ty} — 바뀐 자리에 닿지 않는데 바탕과 다르다 (첫 차이 ${firstDiff(a, b, t.w)})`)
      }
    }
  }
  console.log(`${bad ? '다르다' : '같다'}  바뀐 자리에 닿지 않는 타일 ${same + bad}장 가운데 바탕과 다른 것 ${bad}장 (닿는 타일 ${touched}장은 그 시점의 타일)`)
  if (bad) fail++
}

const check = (name, u, r) => {
  const t0 = performance.now()
  const whole = renderWhole(u, r)
  const tWhole = performance.now() - t0
  const { out, ms } = renderTiled(u, r)
  const rev = renderTiled(u, r, true).out
  const d = firstDiff(whole, out, r.w)
  const dr = sha(rev) === sha(out) ? null : firstDiff(out, rev, r.w)
  const ok = !d && !dr
  if (!ok) fail++
  console.log(
    `${ok ? '같다' : '다르다'}  u=${u} ${name} ${r.w}×${r.h}  타일 ${ms.length}장 (가운데값 ${median(ms).toFixed(1)}ms, 가장 긴 ${Math.max(...ms).toFixed(1)}ms) · 한 번에 ${tWhole.toFixed(0)}ms` +
      (d ? `  — 이음매 첫 차이 ${d}` : '') +
      (dr ? `  — 거꾸로 그린 첫 차이 ${dr}` : ''),
  )
}

for (const u of LEVELS) {
  const g = gridFor(MAP_W, MAP_H, u)
  if (u >= 1) {
    check('세계 전체', u, { x0: 0, y0: 0, w: g.w, h: g.h })
    continue
  }
  if (TIME !== null) {
    // 시점 — 바뀐 자리 상자마다 그 가운데의 3×3 타일 (상자가 많으면 8 개까지 고르게)
    const n = DIRTY.length / 4
    const pickN = Math.min(8, n)
    for (let j = 0; j < pickN; j++) {
      const i = Math.floor((j * n) / pickN) * 4
      const cx = Math.floor((DIRTY[i] + DIRTY[i + 2]) / 2 / u / TILE)
      const cy = Math.floor((DIRTY[i + 1] + DIRTY[i + 3]) / 2 / u / TILE)
      const x0 = Math.max(0, (cx - 1) * TILE)
      const y0 = Math.max(0, (cy - 1) * TILE)
      check(`바뀐 자리 ${i / 4} 3×3`, u, { x0, y0, w: Math.min(3 * TILE, g.w - x0), h: Math.min(3 * TILE, g.h - y0) })
    }
    continue
  }
  // 할리마르 분지 둘레 (해안·내해·숲이 몰린 곳) — 지도 좌표 (1000, 700) 근처의 3×3 타일
  const cx = Math.floor(1000 / u / TILE)
  const cy = Math.floor(700 / u / TILE)
  check('할리마르 3×3', u, { x0: (cx - 1) * TILE, y0: (cy - 1) * TILE, w: 3 * TILE, h: 3 * TILE })
  // 격자 끝 — 오른쪽 아래 모서리 (마지막 타일은 256 보다 작을 수 있다)
  const ntx = Math.ceil(g.w / TILE)
  const nty = Math.ceil(g.h / TILE)
  const x0 = (ntx - 3) * TILE
  const y0 = (nty - 3) * TILE
  check('격자 끝 3×3', u, { x0, y0, w: g.w - x0, h: g.h - y0 })
  // 격자 위 끝 — 세지리가 지도 위로 이어진다
  check('위 끝 3×3', u, { x0: Math.floor(ntx / 2) * TILE, y0: 0, w: 3 * TILE, h: 3 * TILE })
  // 지역 상세 (S9) — 범위의 네 모서리마다 3×3 타일 (닿는 타일과 닿지 않는 타일이 맞닿는 이음매)
  if (CHILD && u === CHILD.meta.u)
    for (const m of CHILD.meta.maps) {
      if (m.parent) continue
      for (const [x, y] of [
        [m.b[0], m.b[1]],
        [m.b[2], m.b[3]],
      ]) {
        const tx = Math.floor(x / u / TILE)
        const ty = Math.floor(y / u / TILE)
        const x0 = Math.max(0, (tx - 1) * TILE)
        const y0 = Math.max(0, (ty - 1) * TILE)
        check(`지역 상세 ${m.id} 모서리 3×3`, u, { x0, y0, w: Math.min(3 * TILE, g.w - x0), h: Math.min(3 * TILE, g.h - y0) })
      }
    }
}

// 지역 상세에 닿지 않는다고 본 타일 가운데 닿는 타일에 맞닿은 것 — 지역 상세를 얹어 그려도 같아야 한다 (열쇠의 몫이 모자라면 기호·둘레가 그 타일에 걸친다)
if (CHILD) {
  const u = CHILD.meta.u
  const g = gridFor(MAP_W, MAP_H, u)
  const ntx = Math.ceil(g.w / TILE)
  const nty = Math.ceil(g.h / TILE)
  const tileOf = (tx, ty) => ({ x0: tx * TILE, y0: ty * TILE, w: Math.min(TILE, g.w - tx * TILE), h: Math.min(TILE, g.h - ty * TILE) })
  let ring = 0
  let bad = 0
  for (let ty = 0; ty < nty; ty++)
    for (let tx = 0; tx < ntx; tx++) {
      const t = tileOf(tx, ty)
      if (childTile(u, t)) continue
      let next = false
      for (let j = -1; j <= 1 && !next; j++) for (let i = -1; i <= 1 && !next; i++) if (tx + i >= 0 && ty + j >= 0 && tx + i < ntx && ty + j < nty) next = childTile(u, tileOf(tx + i, ty + j))
      if (!next) continue
      ring++
      const holes = holesFor(u, t)
      const a = renderTile(ringsFor(u), u, t, pal, { shore: 'dither', terrain, holes })
      const b = renderTile(ringsFor(u), u, t, pal, { shore: 'dither', terrain, holes, child: CHILD })
      if (sha(a) !== sha(b)) {
        bad++
        if (bad <= 8) console.log(`다르다  지역 상세 둘레 타일 ${tx},${ty} — 열쇠에 보기를 붙이지 않았는데 지역 상세가 걸친다 (첫 차이 ${firstDiff(a, b, t.w)})`)
      }
    }
  console.log(`${bad ? '다르다' : '같다'}  지역 상세 둘레의 닿지 않는 타일 ${ring}장 가운데 지역 상세가 걸친 것 ${bad}장`)
  if (bad) fail++
}
console.log(fail ? `실패 ${fail}` : '통과')
process.exit(fail ? 1 : 0)
