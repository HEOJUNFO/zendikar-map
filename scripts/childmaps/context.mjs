// 자식 지도를 그릴 때 볼 세계 지도 맥락 — 그 범위의 해안·호수·숲, 장소·카드 표시, 헤드론, 작은 대상을 자식 지도 좌표로 옮겨 보인다.
// node scripts/childmaps/context.mjs <자식 지도 id> [--scale 10] [--svg parent.svg] > context.json   (Node 23 이상 — .ts 를 그대로 읽는다)
// 해안·호수·숲은 앱(src/map/geo.ts)과 같은 방식으로 다듬은 고리를 범위 둘레만 잘라 꺾은선으로 준다.
// 그림(art/<id>.js)이 아직 없으면 --scale(그림 단위 ÷ 지도 단위, 기본 10)로 셈한다.
// 더 깊은 지역 상세(childMaps.ts 의 parent)면 parent 묶음에 부모 그림의 이름·대상·빈터·지형 칸·이름 쪽·손그림 부분을 이 그림 좌표로 옮겨 준다
// (페이즈 문은 그대로 — 띠에서 두 그림이 함께 보이므로 같은 것을 같은 문으로 다시 그린다). --svg 는 옮긴 부모 부분을 미리 보는 SVG 를 쓴다.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { chaikin, hashSeed, inkWobble, simplifyRing } from '../../src/map/geometry.ts'
import { detailBandOf } from '../../src/map/detailScale.ts'
import { clipRing, mapPath, pathBox } from './paths.mjs'
import { LAND_CARDS } from '../../src/data/cards.ts'
import { locations } from '../../src/data/locations.ts'
import { CHILD_MAPS } from '../../src/data/childMaps.ts'
import { PHASE1_CARDS } from '../../src/data/phase1.ts'
import { PHASE2_CARDS } from '../../src/data/phase2.ts'
import { PHASE3_CARDS } from '../../src/data/phase3.ts'
import { PHASE4_CARDS } from '../../src/data/phase4.ts'
import { PHASE5_CARDS } from '../../src/data/phase5.ts'
const CARDS = [...PHASE1_CARDS, ...PHASE2_CARDS, ...PHASE3_CARDS, ...PHASE4_CARDS, ...PHASE5_CARDS]

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '../..')
const id = process.argv[2]
const flag = (name) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : undefined
}
const child = CHILD_MAPS.find((m) => m.id === id)
if (!child) throw new Error(`자식 지도 '${id}' 가 없다 — ${CHILD_MAPS.map((m) => m.id).join(', ')}`)

/** 원본 그림 하나 — 그 그림만의 자리(vm)에서 kit.js 와 함께 실행해 id 로 찾는다. 없으면 null */
function loadArt(artId) {
  const file = path.join(root, 'scripts/childmaps/art', `${artId}.js`)
  if (!fs.existsSync(file)) return null
  const CHILDMAPS = []
  const ctx = vm.createContext({ CHILDMAPS })
  vm.runInContext(fs.readFileSync(path.join(root, 'scripts/childmaps/kit.js'), 'utf8'), ctx)
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx)
  return CHILDMAPS.find((a) => a.id === artId) ?? null
}
const art = loadArt(id)
const b = child.bounds
const scale = art ? art.size[0] / (b.x1 - b.x0) : Number(flag('scale') ?? 10)
const size = art ? art.size : [Math.round((b.x1 - b.x0) * scale), Math.round((b.y1 - b.y0) * scale)]
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
  const file = path.join(root, 'scripts/figures/art', `${c.id}.js`)
  if (fs.existsSync(file)) vm.runInNewContext(fs.readFileSync(file, 'utf8'), { FIGURES })
}

// 페이즈 그림의 상자 (src/map/figures/frames.json — ZendikarMap 의 figureBox 와 같은 셈, 지도 단위)
const frames = JSON.parse(fs.readFileSync(path.join(root, 'src/map/figures/frames.json'), 'utf8'))
function figureBox(c) {
  const f = frames[c.id]
  if (!f) return null
  const [, vx, vy, vw, vh, ax, ay] = f
  const k = c.size / Math.max(vw, vh)
  const [l, r] = c.flip ? [vx + vw - ax, ax - vx] : [ax - vx, vx + vw - ax]
  return { x0: c.at[0] - l * k, y0: c.at[1] - (ay - vy) * k, x1: c.at[0] + r * k, y1: c.at[1] + (vy + vh - ay) * k }
}
const r1 = (v) => Math.round(v * 10) / 10
const boxToChild = (bx) => ({ x0: r1((bx.x0 - b.x0) * scale), y0: r1((bx.y0 - b.y0) * scale), x1: r1((bx.x1 - b.x0) * scale), y1: r1((bx.y1 - b.y0) * scale) })
const meets = (bx, pad = 0) => bx.x1 >= b.x0 - pad && bx.x0 <= b.x1 + pad && bx.y1 >= b.y0 - pad && bx.y0 <= b.y1 + pad
const GATES = ['phase', 'phase2', 'phase3', 'phase4', 'phase5']
const gatesOf = (o) => Object.fromEntries(GATES.filter((k) => o[k] !== undefined).map((k) => [k, Boolean(o[k])]))
/** 세계 지도에 그리는 페이즈 그림(지역 상세에 살지 않는 대상) 가운데 범위에 닿는 것 — 지역 상세가 나와도 그 위에 그대로 그려지므로 비켜 그린다 */
const worldFigures = CARDS.filter((c) => !c.childMap)
  .map((c) => ({ c, box: figureBox(c) }))
  .filter(({ box }) => box && meets(box))
  .map(({ c, box }) => ({ id: c.id, name: c.name, world: c.at, size: c.size, flip: !!c.flip, boxChild: boxToChild(box), captionBelow: true }))

/** 더 깊은 지역 상세 — 부모 그림 가운데 이 범위(와 이 그림의 띠)에 닿는 것을 이 그림 좌표로 */
function parentBlock() {
  const p = CHILD_MAPS.find((m) => m.id === child.parent)
  if (!p) throw new Error(`부모 지역 상세 '${child.parent}' 가 CHILD_MAPS 에 없다`)
  const part = loadArt(p.id)
  if (!part) throw new Error(`부모 그림 art/${p.id}.js 가 없다`)
  const ps = part.size[0] / (p.bounds.x1 - p.bounds.x0)
  const k = scale / ps
  // 부모 그림 좌표 → 지도 단위 → 이 그림 좌표
  const T = ([x, y]) => [(x / ps + p.bounds.x0 - b.x0) * scale, (y / ps + p.bounds.y0 - b.y0) * scale]
  const Tr = (pt) => T(pt).map(r1)
  const band = detailBandOf(b)
  // 이 그림 좌표의 범위와 띠 바깥 몫 — 띠에서는 부모 그림이 함께 보인다
  const pad = band * scale
  const range = { x0: -pad, y0: -pad, x1: size[0] + pad, y1: size[1] + pad }
  const touches = (bx) => bx.x1 >= range.x0 && bx.x0 <= range.x1 && bx.y1 >= range.y0 && bx.y0 <= range.y1
  const ringIn = (pts) => clipRing(pts.map(T), range).map((q) => q.map(r1))
  const labels = part.labels
    .map((l) => ({ text: l.text, textKo: l.textKo ?? null, kind: l.kind, rotate: l.rotate ?? null, at: Tr(l.at), size: r1(l.size * k) }))
    .filter((l) => l.at[0] >= range.x0 - 400 && l.at[0] <= range.x1 + 400 && l.at[1] >= range.y0 - 100 && l.at[1] <= range.y1 + 100)
  const subjects = CARDS.filter((c) => c.childMap === p.id)
    .map((c) => ({ c, box: figureBox(c) }))
    .filter(({ box }) => box && meets(box, band))
    .map(({ c, box }) => ({ id: c.id, name: c.name, world: c.at, size: c.size, flip: !!c.flip, boxChild: boxToChild(box), captionBelow: true }))
  const clearings = (part.clearings ?? []).flatMap((c, index) => {
    const points = ringIn(c.points)
    return points.length >= 3 ? [{ index, points, ...gatesOf(c) }] : []
  })
  const terrain = part.terrain.flatMap((t, index) => {
    const points = ringIn(t.points)
    return points.length >= 3 ? [{ index, kind: t.kind, density: t.density ?? 1, points, ...gatesOf(t) }] : []
  })
  const inRange = ([x, y]) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1
  const markAt = new Map([
    ...LAND_CARDS.filter((c) => c.at).map((c) => [`card:${c.id}`, c.at]),
    ...locations.filter((l) => l.placement !== 'unplaced' && l.kind !== 'region' && l.kind !== 'water').map((l) => [l.id, l.position]),
  ])
  const markAnchors = Object.fromEntries(Object.entries(part.markAnchors ?? {}).filter(([key]) => markAt.has(key) && inRange(markAt.get(key))))
  const parts = part.parts.flatMap((pp, index) => {
    const bx = pathBox(pp.d)
    if (!Number.isFinite(bx.x0)) return []
    const [x0, y0] = T([bx.x0, bx.y0])
    const [x1, y1] = T([bx.x1, bx.y1])
    if (!touches({ x0, y0, x1, y1 })) return []
    return [{ index, cls: pp.cls, d: mapPath(pp.d, T, k), ...gatesOf(pp) }]
  })
  return {
    id: p.id,
    note: '부모 그림 좌표를 이 그림 좌표로 옮겼다. 범위와 이 그림의 띠 바깥 몫까지 — 띠에서는 두 그림이 함께 보이니 같은 것을 같은 자리·같은 페이즈 문으로 다시 그린다.',
    scale: Math.round(ps * 1000) / 1000,
    band: r1(band),
    labels,
    subjects,
    clearings,
    terrain,
    markAnchors,
    parts,
  }
}
const parent = child.parent ? parentBlock() : null
const svgOut = flag('svg')
if (svgOut) {
  if (!parent) throw new Error('--svg 는 더 깊은 지역 상세(parent)에서만 — 옮긴 부모 그림을 미리 본다')
  const style = (cls) =>
    /^(fill|shade|stone|forest|sea|fire|blood|gold|dark)$/.test(cls)
      ? `fill="${{ fill: '#f3ecd8', shade: '#d8ccb0', stone: '#cfc6b2', forest: '#b9c7a8', sea: '#c4d3d4', fire: '#e0a070', blood: '#a04040', gold: '#d4b060', dark: '#333' }[cls]}" stroke="none"`
      : `fill="none" stroke="${cls.startsWith('sea') ? '#4a7080' : '#2a241c'}" stroke-width="${cls === 'hatch' ? 0.6 : cls === 'ink-bold' ? 1.5 : 1.1}"`
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-parent.band * scale} ${-parent.band * scale} ${size[0] + 2 * parent.band * scale} ${size[1] + 2 * parent.band * scale}">`,
    `<rect x="${-parent.band * scale}" y="${-parent.band * scale}" width="${size[0] + 2 * parent.band * scale}" height="${size[1] + 2 * parent.band * scale}" fill="#ebe3cc"/>`,
    ...parent.terrain.map((t) => `<polygon points="${t.points.join(' ')}" fill="none" stroke="#7a9a60" stroke-dasharray="6 4"/>`),
    ...parent.clearings.map((c) => `<polygon points="${c.points.join(' ')}" fill="none" stroke="#c05050" stroke-dasharray="3 3"/>`),
    ...parent.parts.map((pp) => `<path d="${pp.d}" ${style(pp.cls)}${Object.keys(pp).some((x) => GATES.includes(x)) ? ' opacity="0.6"' : ''}/>`),
    ...parent.subjects.map((s) => `<rect x="${s.boxChild.x0}" y="${s.boxChild.y0}" width="${s.boxChild.x1 - s.boxChild.x0}" height="${s.boxChild.y1 - s.boxChild.y0}" fill="none" stroke="#a040a0"/>`),
    ...worldFigures.map((s) => `<rect x="${s.boxChild.x0}" y="${s.boxChild.y0}" width="${s.boxChild.x1 - s.boxChild.x0}" height="${s.boxChild.y1 - s.boxChild.y0}" fill="none" stroke="#4040c0"/>`),
    ...parent.labels.map((l) => `<text x="${l.at[0]}" y="${l.at[1]}" font-size="${l.size}" text-anchor="middle"${l.rotate ? ` transform="rotate(${l.rotate} ${l.at[0]} ${l.at[1]})"` : ''}>${l.text}</text>`),
    `<rect x="0" y="0" width="${size[0]}" height="${size[1]}" fill="none" stroke="#000" stroke-dasharray="10 6"/>`,
    `<rect x="${parent.band * scale}" y="${parent.band * scale}" width="${size[0] - 2 * parent.band * scale}" height="${size[1] - 2 * parent.band * scale}" fill="none" stroke="#999" stroke-dasharray="4 6"/>`,
    '</svg>',
  ]
  fs.writeFileSync(svgOut, svg.join('\n'))
}

const out = {
  id,
  note: '자식 지도 좌표: (세계 x - bounds.x0) * scale, (세계 y - bounds.y0) * scale. 해안은 앱이 그리는 그대로(바꿀 수 없다).',
  size,
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
    return { id: c.id, name: c.name, world: c.at, childOfWorldSpot: toChild(c.at), figure: f && { viewBox: f.viewBox, anchor: f.anchor }, current: art?.subjects[c.id] ?? null }
  }),
  worldFigures,
  ...(parent ? { parent } : {}),
}
process.stdout.write(JSON.stringify(out, null, 1) + '\n')
