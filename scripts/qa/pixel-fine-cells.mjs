// 깊은 확대 칸 나누기 시험 — Worker 처럼 타일에 닿는 칸만 붙여 그린 타일이 깊은 확대의 기호를 모두 붙여 그린 타일과 바이트까지 같은가.
//   node scripts/qa/pixel-fine-cells.mjs [--stride 3] [--views 0,1,4,6] [--selfcheck]
// --selfcheck 는 닿는 칸 하나를 일부러 빼고 그려 다른 타일이 나오는지 본다 (시험이 빠진 칸을 잡는가)
// 칸은 scripts/pixel/terrain.mjs 의 fineCellsOf, 고르는 셈은 src/pixel/raster/terrain.ts 의 fineCellKeys (Worker 와 같은 함수). Node 만.
// 가장 깊은 단계의 타일 가운데 (tx + ty) 를 stride 로 나눈 나머지가 0 인 것과 지역 상세·칸 경계에 닿는 것을 보기(끔 0, 시점 t)마다 그린다
import './pixel-hooks.mjs'
import crypto from 'node:crypto'

const ROOT = new URL('../../', import.meta.url).pathname
const { ringsFor } = await import(`${ROOT}src/pixel/rings.ts`)
const { renderTile, HALO } = await import(`${ROOT}src/pixel/raster/world.ts`)
const { gridFor } = await import(`${ROOT}src/pixel/raster/fill.ts`)
const { PALETTES } = await import(`${ROOT}src/pixel/raster/palette.ts`)
const { MAP_W, MAP_H } = await import(`${ROOT}src/pixel/view.ts`)
const { decodeTerrain, withPeriod, attachFineParts, fineCellKeys, FINE_FROM } = await import(`${ROOT}src/pixel/raster/terrain.ts`)
const { decodePeriod } = await import(`${ROOT}src/pixel/raster/period.ts`)
const { decodeChildImage, touchesChildren } = await import(`${ROOT}src/pixel/raster/child.ts`)
const { buildPixelTerrain } = await import(`${ROOT}scripts/pixel/terrain.mjs`)
const { TIMES } = await import(`${ROOT}src/data/timeline.ts`)

const argv = process.argv.slice(2)
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d)
const STRIDE = Number(opt('stride', 3))
const VIEWS = opt('views', '0,1,4,6').split(',').map(Number)
const SELF = argv.includes('--selfcheck')
const TILE = 256 // src/pixel/tiles/store.ts 의 TILE
const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex')
const pal = PALETTES.b
const u = FINE_FROM

const t0 = performance.now()
const raw = await buildPixelTerrain({ fine: true, periods: true })
const cells = raw.fineCells
if (!cells || !raw.fine) throw new Error('깊은 확대의 칸 조각이 없다 (scripts/pixel/terrain.mjs 의 fineCellsOf)')
const full = decodeTerrain(raw)
// 같은 바탕을 깊은 확대 없이 따로 푼다 — 칸을 붙일 곳 (decodeTerrain 은 바탕 조각마다 한 번 푼다)
const rawPart = { ...raw, fine: undefined }
const part = decodeTerrain(rawPart)
const has = (k) => k in cells.parts
// 지역 상세 칸의 협곡 단애 기호가 빗금을 잃지 않았는가 (가독성 다듬기 R72 — 곡선과 빗금이 한 조각으로 와서 곡선만 적혔다). 모양 기록의 모양 숫자 여섯 뒤가 빗금 수
let hatchless = 0
{
  const C = raw.kinds.indexOf('canyon')
  for (const p of Object.values(cells.parts)) {
    if (!p.cv) continue
    for (let r = 0, j = 0; r < p.cv.length / 4; r++) {
      const n = p.cps[j++]
      if (p.cv[r * 4] === C && n && !p.cps[j + 6]) hatchless++
      j += n
    }
  }
  console.log(`지역 상세 칸의 빗금 없는 협곡 기호 ${hatchless}개`)
}

let fails = 0
let tiles = 0
const nCells = Object.keys(cells.parts).length
const g = gridFor(MAP_W, MAP_H, u)
const childMeta = raw.children.meta
for (const view of VIEWS) {
  const level = view ? TIMES.find((t) => t.t === view)?.periodLevel : null
  const per = level && raw.periods[level] ? decodePeriod(raw.periods[level].worker, raw.kinds, raw.hatch.length / 4) : null
  const child = { meta: childMeta, view, images: new Map(childMeta.maps.map((m) => [m.id, decodeChildImage(raw.children.images[m.id][m.img[view]], m.w * m.h)])) }
  let n = 0
  let bad = 0
  for (let ty = 0; ty * TILE < g.h; ty++)
    for (let tx = 0; tx * TILE < g.w; tx++) {
      const t = { x0: tx * TILE, y0: ty * TILE, w: Math.min(TILE, g.w - tx * TILE), h: Math.min(TILE, g.h - ty * TILE) }
      const m = 28 * u
      const onChild = touchesChildren(childMeta, t.x0 * u - m, t.y0 * u - m, (t.x0 + t.w) * u + m, (t.y0 + t.h) * u + m)
      const keys = fineCellKeys(cells.cell, has, u, t, HALO)
      // 칸 경계에 걸치는 타일(닿는 칸이 둘 이상)과 지역 상세 타일은 모두, 나머지는 걸러 본다
      if (!onChild && keys.length < 2 && (tx + ty) % STRIDE) continue
      if (!keys.length) continue
      attachFineParts(part, rawPart, (SELF ? keys.slice(1) : keys).map((k) => cells.parts[k]))
      const o = { shore: 'dither', ...(onChild ? { child } : {}) }
      const a = renderTile(ringsFor(u), u, t, pal, { ...o, terrain: per ? withPeriod(full, per, raw.kinds) : full })
      const b = renderTile(ringsFor(u), u, t, pal, { ...o, terrain: per ? withPeriod(part, per, raw.kinds) : part })
      n++
      if (sha(a) !== sha(b)) {
        bad++
        if (bad <= 5) console.log(`  다르다: 보기 ${view} 타일 ${tx},${ty} (칸 ${keys.join(' ')})`)
      }
    }
  console.log(`보기 ${view}${level ? ` (단계 ${level})` : ''}: 타일 ${n}장 가운데 다른 것 ${bad}장`)
  fails += bad
  tiles += n
}
console.log(`깊은 확대 칸 ${nCells}개 · 견준 타일 ${tiles}장 · ${((performance.now() - t0) / 1000).toFixed(0)}초`)
if (SELF) {
  console.log(fails ? `pixel-fine-cells --selfcheck: 칸을 빼면 다른 타일 ${fails}장 — 시험이 빠진 칸을 잡는다` : 'pixel-fine-cells --selfcheck: 칸을 빼도 같다 — 시험이 빠진 칸을 잡지 못한다')
  process.exit(fails ? 0 : 1)
}
console.log(fails || hatchless ? `pixel-fine-cells: 다른 타일 ${fails}장, 빗금 없는 협곡 ${hatchless}개` : 'pixel-fine-cells: 통과')
process.exit(fails || hatchless ? 1 : 0)
