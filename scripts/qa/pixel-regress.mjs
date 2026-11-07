// 픽셀 지도(/pixel)의 타일 시험 — Node 만 (docs/pixel-plan.md S2).
//   node scripts/qa/pixel-regress.mjs                       # 이음매·차례 시험 (실패하면 종료 코드 1)
//   node scripts/qa/pixel-regress.mjs --save <파일.json>    # 타일 해시 기준선을 남긴다
//   node scripts/qa/pixel-regress.mjs --compare <파일.json> # 기준선과 견준다 (다른 타일이 있으면 1)
// 이음매: 타일을 따로 그려 이어 붙인 것이 그 범위를 한 번에 그린 것과 바이트까지 같은가 — 한 픽셀이 1 단위 이상인 단계는 세계 전체,
//   더 고운 단계는 해안이 많은 곳과 격자 끝(오른쪽·아래)의 3×3 타일 묶음. 차례: 거꾸로 그려도 같은 해시인가.
// 해시: 거친 세 단계(16·8·4)는 모든 타일, 고운 단계는 일곱 장마다 한 장 — 팔레트 b·물가 디더링(기본값)과 band 한 단계.
// 바탕 지형(S4)을 함께 그린다 — 흩뿌린 기호가 비키는 이름 상자는 영어·한 픽셀 2×·DPR 2 의 이름 배치에서 (앱처럼 타일마다 닿는 것만 넘긴다).
//   --no-terrain 이면 S2 의 바탕만 (기준선 .qa-baselines/pixel-tiles-s2.json 과 같아야 한다), --lang ko 면 한국어 이름 상자
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
const TILE = 256 // src/pixel/tiles/store.ts 의 TILE (그 파일은 Worker 를 만들어 Node 에서 읽지 않는다)

const argv = process.argv.slice(2)
const opt = (k) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : null)
const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16)
const pal = PALETTES.b
const TERRAIN = !argv.includes('--no-terrain')
const terrain = TERRAIN ? decodeTerrain(await buildPixelTerrain()) : undefined
/** 단계마다 이름 상자 — 앱과 같은 셈 (PixelApp.tsx 의 holes) */
const HOLES = await (async () => {
  if (!TERRAIN) return LEVELS.map(() => [])
  const { slimMarks } = await import(`${ROOT}src/pixel/marks/slim.ts`)
  const { layoutLevels } = await import(`${ROOT}src/pixel/labels/layout.ts`)
  const { levelHoles } = await import(`${ROOT}src/pixel/labels/holes.ts`)
  const { locations } = await import(`${ROOT}src/data/locations.ts`)
  const { LAND_CARDS } = await import(`${ROOT}src/data/cards.ts`)
  const { continents } = await import(`${ROOT}src/data/continents.ts`)
  const marks = slimMarks(locations, LAND_CARDS, continents)
  const lang = opt('lang') === 'ko' ? 'ko' : 'en'
  const pxAt = LEVELS.map((_, i) => cssPerUnit(i, 2, 2))
  return layoutLevels(marks, lang, pxAt, MAP_W).map((l, i) => levelHoles(marks, l, lang, pxAt[i]))
})()
const OPT = { shore: 'dither', terrain }
/** 타일 하나에 넘기는 이름 상자 — 앱처럼 그 타일(과 기호 몫 10 픽셀)에 닿는 것만 */
const holesFor = (u, t) => {
  const boxes = HOLES[LEVELS.indexOf(u)]
  const m = 10 * u
  const out = []
  for (const b of boxes)
    if (b.x1 > t.x0 * u - m && b.x0 < (t.x0 + t.w) * u + m && b.y1 > t.y0 * u - m && b.y0 < (t.y0 + t.h) * u + m) out.push(b.x0, b.y0, b.x1, b.y1)
  return Float32Array.from(out)
}
const tileOpt = (u, t) => (terrain ? { ...OPT, holes: holesFor(u, t) } : OPT)

/** 범위 r 을 한 번에 그린 RGBA (둘레 HALO 를 더해 세고 r 만 칠한다 — 타일과 같은 규칙). 이름 상자는 모두 */
function renderWhole(u, r) {
  const cells = rasterRegion(ringsFor(u), u, { x0: r.x0 - HALO, y0: r.y0 - HALO, w: r.w + 2 * HALO, h: r.h + 2 * HALO }, terrain)
  const out = paintRegion(cells, pal, OPT, r)
  if (terrain) paintTerrain(out, terrain, cells.grid, cells.region, cells.kind, r, pal, HOLES[LEVELS.indexOf(u)].flatMap((b) => [b.x0, b.y0, b.x1, b.y1]))
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
    process.exit(diff.length ? 1 : 0)
  }
  process.exit(0)
}

let fail = 0
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
}
console.log(fail ? `실패 ${fail}` : '통과')
process.exit(fail ? 1 : 0)
