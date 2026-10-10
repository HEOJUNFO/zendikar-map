// 자식 지도를 그릴 때 볼 세계 지도 맥락 — 그 범위의 해안·호수·숲, 장소·카드 표시, 헤드론, 작은 대상을 자식 지도 좌표로 옮겨 보인다.
// node scripts/childmaps/context.mjs <자식 지도 id> > context.json   (Node 23 이상 — .ts 를 그대로 읽는다)
// 해안·호수·숲은 앱(src/map/geo.ts)과 같은 방식으로 다듬은 고리를 범위 둘레만 잘라 꺾은선으로 준다.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { chaikin, hashSeed, inkWobble, simplifyRing } from '../../src/map/geometry.ts'
import { LAND_CARDS } from '../../src/data/cards.ts'
import { locations } from '../../src/data/locations.ts'
import { CHILD_MAPS } from '../../src/data/childMaps.ts'
import { PHASE1_CARDS } from '../../src/data/phase1.ts'
import { PHASE2_CARDS } from '../../src/data/phase2.ts'
import { PHASE3_CARDS } from '../../src/data/phase3.ts'
const CARDS = [...PHASE1_CARDS, ...PHASE2_CARDS, ...PHASE3_CARDS]

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '../..')
const id = process.argv[2]
const child = CHILD_MAPS.find((m) => m.id === id)
if (!child) throw new Error(`자식 지도 '${id}' 가 없다 — ${CHILD_MAPS.map((m) => m.id).join(', ')}`)

const CHILDMAPS = []
const ctx = vm.createContext({ CHILDMAPS })
vm.runInContext(fs.readFileSync(path.join(root, 'scripts/childmaps/kit.js'), 'utf8'), ctx)
vm.runInContext(fs.readFileSync(path.join(root, 'scripts/childmaps/art', `${id}.js`), 'utf8'), ctx)
const art = CHILDMAPS[0]
const [W] = art.size
const b = child.bounds
const scale = W / (b.x1 - b.x0)
const toChild = ([x, y]) => [Math.round((x - b.x0) * scale * 10) / 10, Math.round((y - b.y0) * scale * 10) / 10]
const inside = ([x, y], pad = 0) => x >= b.x0 - pad && x <= b.x1 + pad && y >= b.y0 - pad && y <= b.y1 + pad

// src/map/geo.ts 와 같은 다듬기
const json = (f) => JSON.parse(fs.readFileSync(path.join(root, 'src/data/geo', f), 'utf8'))
const coast = json('coastlines.json')
const features = json('features.json')
const inked = (key, pts, wobble = 0.6) => inkWobble(chaikin(pts, 1), hashSeed(key), wobble)
const lands = [
  ...Object.entries(coast.landmasses).map(([k, pts]) => [k, inked(k, pts)]),
  ...Object.entries(coast.islets).map(([k, pts]) => [k, inked(k, pts, 0.3)]),
]
const waters = Object.entries(features.waters).map(([k, pts]) => [k, pts.length <= 8 ? pts : inked(k, pts, 0.4)])
const forests = features.forests.map((pts, i) => [`forest-${i}`, inked(`forest-${i}`, pts, 1.2)])

/** 범위(둘레 pad 포함) 안에 드는 고리 조각 — 자식 지도 좌표의 꺾은선. 고리 전체가 들면 닫힌 다각형 */
function clip(rings, pad) {
  const out = []
  for (const [key, ring] of rings) {
    const r = chaikin(ring, 2)
    const ins = r.map((p) => inside(p, pad))
    if (!ins.some(Boolean)) continue
    if (ins.every(Boolean)) {
      out.push({ key, closed: true, points: simplifyRing(r, 0.15).map(toChild) })
      continue
    }
    // 밖에서 안으로 드는 자리부터 돌며 이어진 조각을 모은다
    const start = ins.findIndex((v, i) => v && !ins[(i - 1 + r.length) % r.length])
    let run = []
    for (let n = 0; n < r.length; n++) {
      const i = (start + n) % r.length
      if (ins[i]) run.push(r[i])
      else if (run.length) {
        out.push({ key, closed: false, points: run.map(toChild) })
        run = []
      }
    }
    if (run.length) out.push({ key, closed: false, points: run.map(toChild) })
  }
  return out
}

// 헤드론 무리 — src/data/index.ts 의 hedrons 글자를 읽는다 (index.ts 는 Node 에서 바로 읽히지 않는다)
const indexSrc = fs.readFileSync(path.join(root, 'src/data/index.ts'), 'utf8')
const hedronSrc = indexSrc.slice(indexSrc.indexOf('export const hedrons'))
const hedrons = [...hedronSrc.slice(0, hedronSrc.indexOf('\n]\n')).matchAll(/id: '([^']+)',\s*at: \[([\d.]+), ([\d.]+)\],\s*count: (\d+),\s*spread: ([\d.]+)[\s\S]*?note: '([^']*)'/g)]
  .map(([, hid, x, y, count, spread, note]) => ({ id: hid, at: [+x, +y], count: +count, spread: +spread, note }))
  .filter((h) => inside(h.at, h.spread))
  .map((h) => ({ ...h, childAt: toChild(h.at), childSpread: Math.round(h.spread * scale) }))

// 세계 지도의 바탕 지형(src/data/landscape) 가운데 범위에 닿는 것 — 강·절벽·협곡·화산·폭포·영역. 자식 지도는 이와 맞게 그린다
const near = (pts, pad = 0) => pts.some((p) => inside(p, pad))
const ellipse = ([cx, cy], [rx, ry]) => Array.from({ length: 24 }, (_, i) => [cx + Math.cos((i / 24) * Math.PI * 2) * rx, cy + Math.sin((i / 24) * Math.PI * 2) * ry])
const landscapeDir = path.join(root, 'src/data/landscape')
const landscape = { areas: [], rivers: [], lines: [], glyphs: [], sea: [] }
for (const file of fs.readdirSync(landscapeDir).filter((f) => f.endsWith('.ts'))) {
  const { landscape: l } = await import(path.join(landscapeDir, file))
  const meta = (x) => ({ id: x.id, location: x.location ?? null, label: x.label ?? null, estimate: x.estimate ? x.estimate.slice(0, 200) : null })
  for (const a of l.areas ?? []) {
    const ring = a.ring ?? (a.at && a.extent ? ellipse(a.at, a.extent) : [])
    if (near(ring, 5)) landscape.areas.push({ ...meta(a), kind: a.kind, ring: ring.map(toChild) })
  }
  for (const r of l.rivers ?? []) if (near(r.course, 5)) landscape.rivers.push({ ...meta(r), course: r.course.map(toChild), widthChild: Math.round((r.width ?? 1.6) * scale * 10) / 10 })
  for (const t of l.lines ?? []) if (near(t.line, 5)) landscape.lines.push({ ...meta(t), kind: t.kind, closed: !!t.closed, line: t.line.map(toChild), widthChild: t.width ? Math.round(t.width * scale) : null })
  for (const g of l.glyphs ?? []) if (inside(g.at, 10)) landscape.glyphs.push({ ...meta(g), kind: g.kind, child: toChild(g.at), size: g.size ?? 1, angle: g.angle ?? null })
  for (const m of l.sea ?? []) {
    const ring = m.ring ?? (m.at && m.extent ? ellipse(m.at, m.extent) : m.at ? [m.at] : [])
    if (near(ring, 5)) landscape.sea.push({ ...meta(m), kind: m.kind, ring: ring.map(toChild) })
  }
}

const FIGURES = []
for (const c of CARDS.filter((p) => p.childMap === id)) {
  vm.runInNewContext(fs.readFileSync(path.join(root, 'scripts/figures/art', `${c.id}.js`), 'utf8'), { FIGURES })
}

const out = {
  id,
  note: '자식 지도 좌표: (세계 x - bounds.x0) * scale, (세계 y - bounds.y0) * scale. 해안은 앱이 그리는 그대로(바꿀 수 없다).',
  size: art.size,
  bounds: b,
  scale: Math.round(scale * 1000) / 1000,
  coast: clip(lands, 30 / scale),
  inlandWater: clip(waters, 30 / scale),
  forestTint: clip(forests, 30 / scale),
  marks: [
    ...LAND_CARDS.filter((c) => c.at && inside(c.at)).map((c) => ({ key: `card:${c.id}`, name: c.name, kind: c.kind, world: c.at, child: toChild(c.at), estimate: c.estimate ?? null })),
    ...locations
      .filter((l) => l.placement !== 'unplaced' && l.kind !== 'region' && l.kind !== 'water' && inside(l.position))
      .map((l) => ({ key: l.id, name: l.name, nameKo: l.nameKo ?? null, kind: l.kind, world: l.position, child: toChild(l.position) })),
  ],
  areasNearby: locations
    .filter((l) => l.placement !== 'unplaced' && (l.kind === 'region' || l.kind === 'water') && inside(l.position, l.extent ? Math.max(...l.extent) : 0))
    .map((l) => ({ id: l.id, name: l.name, nameKo: l.nameKo ?? null, kind: l.kind, world: l.position, child: toChild(l.position), extentChild: l.extent ? l.extent.map((v) => Math.round(v * scale)) : null })),
  hedrons,
  landscape,
  subjects: CARDS.filter((c) => c.childMap === id).map((c) => {
    const f = FIGURES.find((x) => x.id === c.id)
    return { id: c.id, name: c.name, world: c.at, childOfWorldSpot: toChild(c.at), figure: f && { viewBox: f.viewBox, anchor: f.anchor }, current: art.subjects[c.id] ?? null }
  }),
}
process.stdout.write(JSON.stringify(out, null, 1) + '\n')
