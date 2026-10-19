// 자식 지도를 그릴 때 볼 세계 지도 맥락 — 그 범위의 해안·호수·숲, 장소·카드 표시, 헤드론, 작은 대상을 자식 지도 좌표로 옮겨 보인다.
// node scripts/childmaps/context.mjs <자식 지도 id> [--scale 10] [--level n] [--svg 미리보기.svg] > context.json   (Node 23 이상 — .ts 를 그대로 읽는다)
// 해안·호수·숲은 앱(src/map/geo.ts)과 같은 방식으로 다듬은 고리를 범위 둘레만 잘라 꺾은선으로 준다.
// 그림(art/<id>.js)이 아직 없으면 --scale(그림 단위 ÷ 지도 단위, 기본 10)로 셈한다.
// 더 깊은 지역 상세(childMaps.ts 의 parent)면 parent 묶음에 부모 그림의 이름·대상·빈터·지형 칸·이름 쪽·손그림 부분을 이 그림 좌표로 옮겨 준다
// (페이즈 문은 그대로 — 띠에서 두 그림이 함께 보이므로 같은 것을 같은 문으로 다시 그린다).
// periods 묶음은 세계 지도의 페이즈 바탕(src/data/periods — 마른 유역·흰 먼지·죽은 숲·그 무렵의 강·숨긴 협곡·표시)을 이 그림 좌표로 옮겨,
// 그림 부분·칸·빈터에 그대로 달 문(gates)과 붙여 넣을 칸·빈터(suggest)를 함께 준다 (scripts/childmaps/periods.mjs).
// worldFigures·subjects 의 levels, 대지 카드 표시의 levels 는 그려지는 단계(이어 센 번호), landscape 의 hiddenAt 은 페이즈 바탕이 숨기는 단계다.
// --level n 은 모든 묶음을 그 단계(0: 끔, 이어 센 번호)에서 실제로 그려지는 것만으로 문 없이 평평하게 낸다.
// --time t 는 시점별 보기(src/data/timeline.ts, ?time=1..4)의 시점 t 에서 그려지는 것만 — 페이즈 바탕은 그 시점의 바탕 단계, 그림·대상은 그 시점에
// 그리는 카드(timesOf, 옮긴 자리 time.moved), 대지 카드 표시는 landAt, 이 그림과 부모 그림의 칸·빈터·부분·이름은 시점 열쇠까지 셈한 문(sagas.ts 의 inView).
// 이 그림의 몫(own)도 낸다 — 그 시점에 켜진 빈터(와 for)·칸·부분·이름. 빈터의 시점 열쇠는 to_ts.mjs 와 같이 줄 끝 주석의 카드 id(for)에서 셈한다(timekeys.mjs).
// worldFigures·subjects 의 times 는 시점별 보기가 그리는 시점, moved 는 그 시점에만 옮긴 자리(지도 단위)다.
// --svg 는 해안·숲·물, 이 그림의 칸·빈터·부분, 부모 그림(더 깊은 지역 상세면), 페이즈 바탕을 이 그림 좌표로 미리 그린 SVG 를 쓴다 (--level·--time 이 있으면 그 모습).
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
import { GATES, gated, inView, levelOf, SAGAS, slotOf, TIME_KEYS } from '../../src/data/sagas.ts'
import { landAt, timeGateView, timesOf, TIME_POINTS } from '../../src/data/timeline.ts'
import { annotateClearings, deriveClearingTimes } from './timekeys.mjs'
import {
  LEVELS,
  addedKind,
  boxesMeet,
  clipLine,
  complement,
  deepRings,
  entriesOf,
  gatesFor,
  glyphClear,
  loadPeriods,
  readLandscape,
  regionOf,
  removedKinds,
  ringsOf,
  riverClear,
  traceRegion,
} from './periods.mjs'
const PHASE_CARDS = [PHASE1_CARDS, PHASE2_CARDS, PHASE3_CARDS, PHASE4_CARDS, PHASE5_CARDS]
const CARDS = PHASE_CARDS.flat()
const CARD_OF = new Map(CARDS.map((c) => [c.id, c]))

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '../..')
const id = process.argv[2]
/** --name 값 — 플래그가 없으면 undefined, 있는데 값이 없거나 다음 인자가 다른 플래그면 멈춘다 (`--level` 만 주면 모든 단계로 조용히 넘어가거나 `--svg --level 3` 이 '--level' 파일을 쓰지 않게) */
const flag = (name) => {
  const i = process.argv.indexOf(`--${name}`)
  if (i < 0) return undefined
  const v = process.argv[i + 1]
  if (v === undefined || v.startsWith('--')) throw new Error(`--${name} 에 값이 없다`)
  return v
}
const child = CHILD_MAPS.find((m) => m.id === id)
if (!child) throw new Error(`자식 지도 '${id}' 가 없다 — ${CHILD_MAPS.map((m) => m.id).join(', ')}`)
const levelFlag = flag('level')
const timeFlag = flag('time')
if (levelFlag !== undefined && timeFlag !== undefined) throw new Error('--level 과 --time 은 함께 쓰지 않는다')
/** --time 의 시점 (시점별 보기) — 없으면 undefined */
const time = timeFlag === undefined ? undefined : Number(timeFlag)
if (time !== undefined && !TIME_POINTS.includes(time)) throw new Error(`--time 은 ${TIME_POINTS.join('·')} 가운데 — '${timeFlag}'`)
/** 그리는 단계 — --level, 또는 --time 의 바탕 단계 (페이즈 바탕·문의 기본값) */
const level = time !== undefined ? timeGateView(time).level : levelFlag === undefined ? undefined : Number(levelFlag)
if (level !== undefined && !LEVELS.includes(level)) throw new Error(`--level 은 ${LEVELS.join('·')} 가운데 (0: 끔, 이어 센 번호) — '${levelFlag}'`)
/** 이 그림·부모 그림의 문 셈 (sagas.ts 의 inView) — --time 이면 시점 열쇠까지 */
const gateView = time !== undefined ? timeGateView(time) : { level: level ?? 0 }

/** 원본 그림 하나 — 그 그림만의 자리(vm)에서 kit.js 와 함께 실행해 id 로 찾는다. 없으면 null */
function loadArt(artId) {
  const file = path.join(root, 'scripts/childmaps/art', `${artId}.js`)
  if (!fs.existsSync(file)) return null
  const CHILDMAPS = []
  const ctx = vm.createContext({ CHILDMAPS })
  vm.runInContext(fs.readFileSync(path.join(root, 'scripts/childmaps/kit.js'), 'utf8'), ctx)
  // 빈터 줄 끝의 카드 id 주석을 for 로, for 에서 시점 열쇠를 (to_ts.mjs 와 같다)
  vm.runInContext(annotateClearings(fs.readFileSync(file, 'utf8'), (cid) => CARD_OF.has(cid)).src, ctx)
  const found = CHILDMAPS.find((a) => a.id === artId) ?? null
  if (found) {
    const problems = deriveClearingTimes(found, CARD_OF)
    if (problems.length) throw new Error(`${artId}: ${problems.join(' / ')}`)
  }
  return found
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

// 세계 지도의 페이즈 바탕 (src/data/periods — 불러올 때 던지는 자체 검사가 여기서도 드러난다)
const periodData = await loadPeriods()
const periodSet = periodData.set
/** 페이즈 바탕이 숨기는 바탕 선 → 숨는 단계 (이어 센 번호) */
const hiddenAt = new Map()
for (const h of periodSet.hides) hiddenAt.set(h.line, [...new Set([...(hiddenAt.get(h.line) ?? []), ...h.levels])].sort((x, y) => x - y))

// 세계 지도의 바탕 지형(src/data/landscape) 가운데 범위에 닿는 것 — 강·절벽·협곡·화산·폭포·영역. 자식 지도는 이와 맞게 그린다
const near = (pts, pad = 0) => pts.some((p) => inside(p, pad))
const ellipse = ([cx, cy], [rx, ry]) => Array.from({ length: 24 }, (_, i) => [cx + Math.cos((i / 24) * Math.PI * 2) * rx, cy + Math.sin((i / 24) * Math.PI * 2) * ry])
const landscapeDir = path.join(root, 'src/data/landscape')
const landscape = { areas: [], rivers: [], lines: [], glyphs: [], sea: [] }
for (const file of fs.readdirSync(landscapeDir).filter((f) => f.endsWith('.ts'))) {
  const { landscape: l } = await import(path.join(landscapeDir, file))
  // hiddenAt: 페이즈 바탕이 이 항목을 숨기는 단계 (그 단계에는 그리지 않는다 — periods.hidden)
  const meta = (x) => ({ id: x.id, location: x.location ?? null, label: x.label ?? null, estimate: x.estimate ? x.estimate.slice(0, 200) : null, ...(hiddenAt.has(x.id) ? { hiddenAt: hiddenAt.get(x.id) } : {}) })
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
/** 페이즈 문의 이름 (src/data/sagas.ts 의 GATES — phase·phase2·phase3 은 사가1, phase4·phase5 는 사가2 의 페이즈1·2) */
const GATE_KEYS = GATES.map(([k]) => k)
/** 붙은 문 — 페이즈 문과 시점별 보기의 열쇠(time·timeOnly), 빈터의 for */
const gatesOf = (o) => ({
  ...Object.fromEntries(GATE_KEYS.filter((k) => o[k] !== undefined).map((k) => [k, Boolean(o[k])])),
  ...(o.time ? { time: Object.fromEntries(TIME_KEYS.filter(([k]) => o.time[k] !== undefined).map(([k]) => [k, o.time[k]])) } : {}),
  ...(o.timeOnly ? { timeOnly: true } : {}),
  ...(o.for ? { for: [...o.for] } : {}),
})
/** 시점별 보기가 그 카드를 그리는 시점과 그 시점에만 옮긴 자리 (지도 단위 at·flip·label, 상자는 이 그림 좌표) */
const timesBlock = (c) => {
  const moved = Object.entries(c.time?.moved ?? {}).map(([t, mv]) => {
    const box = figureBox({ ...c, at: mv.at, flip: mv.flip ?? c.flip })
    return [t, { ...mv, ...(box ? { boxChild: boxToChild(box) } : {}) }]
  })
  return { times: timesOf(c), ...(moved.length ? { moved: Object.fromEntries(moved) } : {}) }
}
const range = (from, to) => Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i)
/**
 * 카드 그림이 그려지는 단계 (이어 센 번호 [처음..끝]) — 오른 페이즈부터 그 사가의 끝까지, until 이 있으면 그 사가의 그 페이즈까지 (to_ts.mjs 의 liveOf 와 같은 셈)
 */
const cardLevels = new Map(
  PHASE_CARDS.flatMap((list, i) =>
    list.map((c) => {
      const slot = slotOf(i + 1)
      return [c.id, range(i + 1, levelOf(slot.saga, c.until ?? SAGAS[slot.saga - 1].phases))]
    }),
  ),
)
/** 사가에 매인 대지 카드가 나오는 단계 (그 사가의 sagaPhase 부터 그 사가의 끝까지) — 늘 나오는 카드는 undefined */
const landLevels = (c) => (c.saga === undefined ? undefined : range(levelOf(c.saga, c.sagaPhase ?? 1), levelOf(c.saga, SAGAS[c.saga - 1].phases)))
/**
 * 세계 지도에 그리는 페이즈 그림(지역 상세에 살지 않는 대상) 가운데 범위에 닿는 것 — 지역 상세가 나와도 그 위에 그대로 그려지므로 비켜 그린다.
 * until 이 있는 그림은 그 사가의 그 페이즈까지만 그려진다 (뒤 페이즈의 대상은 그 자리를 함께 쓸 수 있다). levels 는 그려지는 단계
 */
const worldFigures = CARDS.filter((c) => !c.childMap)
  .map((c) => ({ c, box: figureBox(c) }))
  .filter(({ box }) => box && meets(box))
  // 이름 쪽 — 카드가 label 로 다른 쪽을 먼저 둔 그림은 caption 에 그 쪽 (막히면 밑 → 오른쪽 → 왼쪽)
  .map(({ c, box }) => ({ id: c.id, name: c.name, world: c.at, size: c.size, flip: !!c.flip, boxChild: boxToChild(box), captionBelow: !c.label || c.label === 'below', ...(c.label ? { caption: c.label } : {}), ...(c.until ? { until: c.until } : {}), levels: cardLevels.get(c.id), ...timesBlock(c) }))

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
    .map((l) => ({ text: l.text, textKo: l.textKo ?? null, kind: l.kind, rotate: l.rotate ?? null, at: Tr(l.at), size: r1(l.size * k), ...gatesOf(l) }))
    .filter((l) => l.at[0] >= range.x0 - 400 && l.at[0] <= range.x1 + 400 && l.at[1] >= range.y0 - 100 && l.at[1] <= range.y1 + 100)
  const subjects = CARDS.filter((c) => c.childMap === p.id)
    .map((c) => ({ c, box: figureBox(c) }))
    .filter(({ box }) => box && meets(box, band))
    // 이름 쪽 — 부모 그림이 label 로 다른 쪽을 먼저 둔 대상은 caption 에 그 쪽 (막히면 밑 → 오른쪽 → 왼쪽)
    .map(({ c, box }) => ({ id: c.id, name: c.name, world: c.at, size: c.size, flip: !!c.flip, boxChild: boxToChild(box), captionBelow: !c.label || c.label === 'below', ...(c.label ? { caption: c.label } : {}), ...(c.until ? { until: c.until } : {}), levels: cardLevels.get(c.id), ...timesBlock(c) }))
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

/**
 * 세계 지도의 페이즈 바탕 가운데 범위(와 띠, 그리고 30/scale)에 닿는 것을 이 그림 좌표로 — 묶음마다 levels(이어 센 단계)와
 * gates(그림 부분·칸·빈터에 그대로 다는 AND 문, 여럿이면 OR — 부분을 문마다 하나씩)를 함께 낸다.
 * - paint: 앱이 그리는 칠(마른 바닥·남은 물·흰 먼지·백악)과 숲 채색 걷기 — 다시 그리지 않고, 그 자리의 그림 부분(opposeCls)에 반대 문(oppose)을 단다
 * - terrain: 기호를 빼고·바꾸고·더하는 영역 — kinds 의 기존 칸을 고리로 잘라 안쪽 조각에 oppose 를, suggest.terrain 의 새 칸을 terrain 배열 끝에 붙인다
 * - redraw: 그 무렵의 강·폭포(앱은 지역 상세 범위에서 물러난다) — 같은 문으로 다시 그리고, suggest.clearings 로 그 둘레의 기호를 비운다. mouth 는 하구 물칠이 없는 강 끝
 * - hidden: 그 무렵 없던 바탕 선 — showGates 로 그 부분을 나눠 단다 / marks: 표시가 바뀌는 단계 / labels: 물빛 테두리를 떼는 이름
 */
function periodsBlock(geo) {
  const band = detailBandOf(b)
  const pad = band + 30 / scale
  const area = { x0: b.x0 - pad, y0: b.y0 - pad, x1: b.x1 + pad, y1: b.y1 + pad }
  const sorted = (levels) => [...new Set(levels)].sort((x, y) => x - y)
  const doors = (levels) => ({ levels: sorted(levels), gates: gatesFor(levels) })
  const oppose = (levels) => gatesFor(complement(levels))
  const est = (x) => (x.estimate ? { estimate: x.estimate.slice(0, 200) } : {})
  const childRing = (ring) => {
    const r = clipRing(ring, area)
    return r.length >= 3 ? simplifyRing(r, 0.15).map(toChild) : null
  }
  // 범위들을 그림 좌표로 — 고리(rings), 띠(bands). 대륙은 그 대륙의 땅을 범위 다각형으로 자른 고리들이다(앱의 칠과 같은 모양 — periods.mjs)
  const shapesOut = (shapes) => {
    const rings = []
    const bands = []
    const from = []
    for (const s of shapes) {
      if (!boxesMeet(s.bounds, area)) continue
      if (s.line) {
        const runs = clipLine(s.line, area)
        if (runs.length) {
          bands.push({ line: s.line.map(toChild), widthChild: r1(s.width * scale) })
          from.push(s.desc)
        }
        continue
      }
      const got = ringsOf(s).map(childRing).filter(Boolean)
      rings.push(...got)
      if (got.length) from.push(s.desc)
    }
    return { rings, bands, from }
  }
  // 소속 함수를 이 범위(와 격자 한 칸) 안에서 고리로 — 그림 칸·빈터에 붙여 넣을 다각형 (구멍은 열쇠 구멍으로 이었다)
  const minSide = Math.min(b.x1 - b.x0, b.y1 - b.y0)
  const polygons = (insideFn, featureWidth = Infinity) => {
    const step = Math.min(minSide / 120, featureWidth / 3)
    const box = { x0: b.x0 - 2 * step, y0: b.y0 - 2 * step, x1: b.x1 + 2 * step, y1: b.y1 + 2 * step }
    const near = { x0: b.x0 - step, y0: b.y0 - step, x1: b.x1 + step, y1: b.y1 + step }
    return traceRegion((x, y) => x >= near.x0 && x <= near.x1 && y >= near.y0 && y <= near.y1 && insideFn(x, y), box, step).map((r) => r.map(toChild))
  }
  const out = { paint: [], terrain: [], redraw: [], hidden: [], marks: [], labels: [] }
  const entries = entriesOf(periodSet)
  for (const { cat, item } of entries) {
    if (cat !== 'ground' && cat !== 'relief' && cat !== 'drain') continue
    const region = regionOf(cat, item, geo.landscape)
    if (!boxesMeet(region.bounds, area)) continue
    const shape = shapesOut(region.shapes)
    // 기호를 바꾸는 자리 — 범위(와 격자 한 칸) 안의 소속을 고리로. 대륙은 땅으로 자른 자리가 범위에 들어야 닿는다
    const width = Math.min(...region.shapes.filter((s) => s.width).map((s) => s.width), Infinity)
    const cells = polygons(region.inside, width)
    if (!cells.length && !shape.bands.length && !region.shapes.some((s) => boxesMeet(s.bounds, area) && ringsOf(s).some((r) => clipRing(r, area).length >= 3))) continue
    const holes = shapesOut(region.holes)
    const base = { id: item.id, label: item.label, location: item.location ?? null, ...doors(item.levels) }
    // 칠 — 내해 물 빼기의 마른 바닥과 남은 물, 땅 위 칠과 숲 채색 걷기
    if (cat === 'drain') {
      out.paint.push({ ...base, kind: 'drybed-floor', water: item.water, opposeCls: ['sea', 'sea-ink'], oppose: oppose(item.levels), rings: shape.rings, holes: holes.rings, ...est(item) })
      item.pools.forEach((pool, i) => {
        const ring = childRing(chaikin(pool, 2))
        if (ring) out.paint.push({ id: `${item.id}#pool${i}`, kind: 'pool', ...doors(item.levels), rings: [ring], ...est(item) })
      })
    } else if (cat === 'ground') {
      const opposeCls = item.kind === 'chalk' ? [] : ['forest']
      out.paint.push({
        ...base,
        kind: item.kind,
        effect: { dust: '흰 칠(옅은 덧칠)과 숲 채색 걷기', chalk: '백악 칠(옅은 덧칠)', deadwood: '숲 채색 걷기 (칠 없음)' }[item.kind],
        ...(opposeCls.length ? { opposeCls, oppose: oppose(item.levels) } : {}),
        rings: shape.rings,
        ...(shape.bands.length ? { bands: shape.bands } : {}),
        holes: holes.rings,
        from: shape.from,
        ...est(item),
      })
    }
    // 기호 — 지우는 칸 종류(kinds)와 더하는 칸 종류(childKind)
    const childKind = addedKind(cat, item)
    const kinds = removedKinds(cat, item)
    const suggest = {
      ...(kinds.length ? { oppose: oppose(item.levels) } : {}),
      terrain: gatesFor(item.levels).flatMap((g) => cells.map((points) => ({ kind: childKind, ...g, ...(childKind === 'deadwood' ? {} : { density: item.density }), points }))),
    }
    out.terrain.push({
      ...base,
      do: childKind === 'deadwood' ? 'dead' : 'add',
      childKind,
      ...(item.density !== undefined ? { density: item.density } : {}),
      ...(cat === 'drain' ? { craze: item.craze } : {}),
      ...(childKind === 'deadwood' ? { keep: 0.25, note: '숲·맹그로브 칸의 나무를 죽은 나무로 — 넷에 하나만 남는다 (hash01 < 0.25, 세계 지도와 같다)' } : {}),
      // kinds: 지울 지역 상세 칸 종류 (clears 는 세계 지도 기호 종류 그대로)
      ...(item.clears ? { clears: item.clears } : {}),
      kinds,
      ...(item.through ? { through: item.through } : {}),
      rings: shape.rings,
      ...(shape.bands.length ? { bands: shape.bands } : {}),
      holes: holes.rings,
      from: shape.from,
      suggest,
      ...est(item),
    })
  }
  // 다시 그릴 것 — 그 무렵의 강·폭포 (그 둘레의 기호는 세계 지도처럼 비운다)
  for (const { cat, item } of entries) {
    if (cat === 'river') {
      const r = riverClear(item)
      if (!lineNear(item.course, pad + r)) continue
      const ring = polygons((x, y) => distLine(x, y, item.course) <= r, r * 2)
      out.redraw.push({
        id: item.id,
        type: 'river',
        label: item.label,
        location: item.location ?? null,
        ...doors(item.levels),
        course: item.course.map(toChild),
        widthChild: r1((item.width ?? 1.6) * scale),
        ...(item.dry ? { dry: true } : {}),
        clearRadiusChild: r1(r * scale),
        suggest: { clearings: gatesFor(item.levels).flatMap((g) => ring.map((points) => ({ ...g, points }))) },
        ...est(item),
      })
    } else if (cat === 'glyph') {
      const r = glyphClear(item)
      if (!inside(item.at, pad + r)) continue
      const ring = polygons((x, y) => Math.hypot(x - item.at[0], y - item.at[1]) <= r, r * 2)
      out.redraw.push({
        id: item.id,
        type: 'glyph',
        kind: item.kind,
        label: item.label,
        location: item.location ?? null,
        ...doors(item.levels),
        child: toChild(item.at),
        size: item.size ?? 1,
        angle: item.angle ?? null,
        clearRadiusChild: r1(r * scale),
        suggest: { clearings: gatesFor(item.levels).flatMap((g) => ring.map((points) => ({ ...g, points }))) },
        ...est(item),
      })
    } else if (cat === 'drain') {
      // 옛 물가에서 끝나는 강 — 그 단계에는 하구 물칠이 없다
      for (const rid of item.dryMouths) {
        const river = geo.landscape.rivers.find((x) => x.id === rid)
        if (!river) continue
        const mouth = river.course.at(-1)
        if (!inside(mouth, pad)) continue
        out.redraw.push({ id: `${item.id}:${rid}`, type: 'mouth', river: rid, ...doors(item.levels), child: toChild(mouth), note: '이 단계에는 하구 물칠이 없다 — 강은 옛 물가에서 끝난다 (물이 빠진 바닥 위에 물을 그리지 않는다)' })
      }
    }
  }
  // 숨는 바탕 선 — 같은 선을 숨기는 항목은 하나로
  const hides = new Map()
  for (const h of periodSet.hides) {
    const line = geo.landscape.lines.find((x) => x.id === h.line)
    if (!line || !lineNear(line.line, pad)) continue
    const cur = hides.get(h.line) ?? { line, by: [], levels: [], label: h.label, estimate: h.estimate }
    cur.by.push(h.id)
    cur.levels.push(...h.levels)
    hides.set(h.line, cur)
  }
  for (const [lineId, h] of hides) {
    const hiddenLevels = sorted(h.levels)
    const showLevels = complement(hiddenLevels)
    out.hidden.push({
      id: lineId,
      type: 'line',
      kind: h.line.kind,
      by: h.by,
      label: h.label,
      hiddenLevels,
      hiddenGates: gatesFor(hiddenLevels),
      showLevels,
      showGates: gatesFor(showLevels),
      line: h.line.line.map(toChild),
      widthChild: h.line.width ? r1(h.line.width * scale) : null,
      ...est(h),
    })
  }
  // 장소 표시 — 범위 안의 표시가 바뀌는 단계 (null: 그 무렵 없던 곳이라 그리지 않는다, ruin: 폐허 기호)
  const marks = new Map()
  for (const m of periodSet.marks) {
    const l = locations.find((x) => x.id === m.place)
    if (!l || l.placement === 'unplaced' || !l.position || !inside(l.position)) continue
    const cur = marks.get(m.place) ?? { l, byLevel: {}, changes: [] }
    for (const lv of m.levels) cur.byLevel[lv] = m.kind
    cur.changes.push({ id: m.id, kind: m.kind, ...doors(m.levels), ...est(m) })
    marks.set(m.place, cur)
  }
  for (const [key, m] of marks) {
    const levels = Object.keys(m.byLevel).map(Number)
    out.marks.push({ key, name: m.l.name, base: m.l.kind, child: toChild(m.l.position), byLevel: m.byLevel, ...doors(levels), changes: m.changes })
  }
  // 물 이름 라벨 — 그 단계에 물빛 테두리를 뗀다 (글자는 그대로)
  for (const lb of periodSet.labels) {
    const l = locations.find((x) => x.id === lb.place)
    if (!l || l.placement === 'unplaced' || !l.position || !inside(l.position, l.extent ? Math.max(...l.extent) : 0)) continue
    out.labels.push({ id: lb.id, place: lb.place, name: l.name, ...doors(lb.levels), dry: true })
  }
  return {
    note: 'levels 는 이어 센 단계(0: 끔), gates 는 그림 부분·칸·빈터에 그대로 다는 AND 문 (여럿이면 OR — 부분·칸을 문마다 하나씩). paint 는 앱이 그리니 다시 그리지 말고 그 자리 opposeCls 부분에 반대 문(oppose)을 단다. terrain 은 kinds 의 기존 칸을 고리로 잘라 안쪽 조각에 suggest.oppose 를 달고(이미 문이 있으면 AND), suggest.terrain 의 새 칸을 terrain 배열 끝에 붙인다 (시드 번호를 지킨다). redraw 는 같은 문으로 다시 그리고 suggest.clearings 를 빈터로 붙인다. hidden 은 그 선을 그린 부분을 showGates 로 나눠 단다.',
    source: periodData.source,
    ...out,
  }
}
/** 꺾은선이 범위(둘레 pad)에 닿는가 — 변을 2 단위마다 찍어 본다 (꼭짓점이 모두 밖이어도 지나가는 선) */
function lineNear(pts, pad) {
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]
    const [bx, by] = pts[i]
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 2))
    for (let k = 0; k <= n; k++) if (inside([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n], pad)) return true
  }
  return pts.length === 1 && inside(pts[0], pad)
}
/** 점에서 꺾은선까지 거리 (geometry.ts 의 distanceToPolyline 과 같다) */
function distLine(x, y, pts) {
  let best = Infinity
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]
    const [bx, by] = pts[i]
    const dx = bx - ax
    const dy = by - ay
    const len = dx * dx + dy * dy
    const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len))
    best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)))
  }
  return best
}
const periods = periodsBlock({ landscape: await readLandscape() })

let out = {
  id,
  note: '자식 지도 좌표: (세계 x - bounds.x0) * scale, (세계 y - bounds.y0) * scale. 해안은 앱이 그리는 그대로(바꿀 수 없다).',
  size,
  bounds: b,
  scale: Math.round(scale * 1000) / 1000,
  coast: clip(lands, 30 / scale),
  inlandWater: clip(waters, 30 / scale),
  forestTint: clip(forests, 30 / scale),
  marks: [
    ...LAND_CARDS.filter((c) => c.at && inside(c.at)).map((c) => ({ key: `card:${c.id}`, name: c.name, kind: c.kind, world: c.at, child: toChild(c.at), estimate: c.estimate ?? null, ...(landLevels(c) ? { levels: landLevels(c), times: TIME_POINTS.filter((t) => landAt(c, t)) } : {}) })),
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
    return { id: c.id, name: c.name, world: c.at, childOfWorldSpot: toChild(c.at), figure: f && { viewBox: f.viewBox, anchor: f.anchor }, current: art?.subjects[c.id] ?? null, ...(c.until ? { until: c.until } : {}), levels: cardLevels.get(c.id), ...timesBlock(c) }
  }),
  worldFigures,
  periods,
  ...(parent ? { parent } : {}),
}

/**
 * --level n — 그 단계에서 실제로 그려지는 것만, 문 없이. 숨는 바탕 선을 빼고, 그 무렵의 강·폭포를 landscape 에 넣고, 표시 kind 를 바꾸고,
 * 그 단계에 없는 그림·대지 카드 표시를 뺀다. 부모 그림의 이름·빈터·칸·부분은 그 단계의 문이 맞는 것만
 */
function flatten(o, n, t) {
  const strip = (x) => Object.fromEntries(Object.entries(x).filter(([k]) => !GATE_KEYS.includes(k) && k !== 'time' && k !== 'timeOnly'))
  const live = (x) => !x.levels || x.levels.includes(n)
  const noLevels = ({ levels: _l, gates: _g, until: _u, ...rest }) => rest
  // 그림·대상·대지 카드 표시 — 시점별 보기면 그 시점에 그리는 것(times), 그 시점에 옮긴 것은 옮긴 자리로
  const liveCard = (x) => (t === undefined ? live(x) : !x.times || x.times.includes(t))
  const flatCard = (x) => {
    const { times: _t, moved, ...rest } = noLevels(x)
    const mv = t === undefined ? undefined : moved?.[t]
    return mv ? { ...rest, world: mv.at, ...(mv.boxChild ? { boxChild: mv.boxChild } : {}), ...(mv.flip !== undefined ? { flip: mv.flip } : {}), ...(mv.label ? { caption: mv.label, captionBelow: mv.label === 'below' } : {}), movedAt: t } : rest
  }
  const gateOn = (x) => inView(x, t === undefined ? { level: n } : timeGateView(t))
  const shown = (x) => !x.hiddenAt?.includes(n)
  const noHidden = ({ hiddenAt: _h, ...rest }) => rest
  const ls = o.landscape
  const p = o.periods
  const kindAt = new Map(p.marks.filter((m) => n in m.byLevel).map((m) => [m.key, m.byLevel[n]]))
  const flatLandscape = {
    areas: ls.areas.filter(shown).map(noHidden),
    rivers: [
      ...ls.rivers.filter(shown).map(noHidden),
      ...p.redraw.filter((r) => r.type === 'river' && live(r)).map((r) => ({ id: r.id, location: r.location, label: r.label, estimate: r.estimate ?? null, course: r.course, widthChild: r.widthChild, ...(r.dry ? { dry: true } : {}), period: true })),
    ],
    lines: ls.lines.filter(shown).map(noHidden),
    glyphs: [
      ...ls.glyphs.filter(shown).map(noHidden),
      ...p.redraw.filter((r) => r.type === 'glyph' && live(r)).map((r) => ({ id: r.id, location: r.location, label: r.label, estimate: r.estimate ?? null, kind: r.kind, child: r.child, size: r.size, angle: r.angle, period: true })),
    ],
    sea: ls.sea.filter(shown).map(noHidden),
  }
  const flatPeriods = {
    note: `단계 ${n} 에서 그려지는 페이즈 바탕 — 문 없이. paint 는 앱이 그린다(그 자리 그림 부분을 이 단계에 그리지 않는다), terrain 은 이 단계의 기호 바꿈, hidden 은 이 단계에 그리지 않는 선`,
    source: p.source,
    paint: p.paint.filter(live).map(({ oppose: _o, ...x }) => noLevels(x)),
    terrain: p.terrain.filter(live).map(({ suggest, ...x }) => ({ ...noLevels(x), cells: suggest.terrain.filter((c, i, all) => all.findIndex((d) => d.points === c.points) === i).map((c) => strip(c)) })),
    redraw: p.redraw.filter(live).map(({ suggest, ...x }) => ({ ...noLevels(x), ...(suggest ? { clearings: suggest.clearings.filter((c, i, all) => all.findIndex((d) => d.points === c.points) === i).map((c) => c.points) } : {}) })),
    hidden: p.hidden.filter((h) => h.hiddenLevels.includes(n)).map((h) => ({ id: h.id, type: h.type, kind: h.kind, label: h.label, line: h.line, widthChild: h.widthChild })),
    marks: p.marks.filter((m) => n in m.byLevel).map((m) => ({ key: m.key, name: m.name, base: m.base, kind: m.byLevel[n], child: m.child })),
    labels: p.labels.filter(live).map((x) => noLevels(x)),
  }
  const flatParent = o.parent && {
    ...o.parent,
    labels: o.parent.labels.filter(gateOn).map(strip),
    subjects: o.parent.subjects.filter(liveCard).map(flatCard),
    clearings: o.parent.clearings.filter(gateOn).map(strip),
    terrain: o.parent.terrain.filter(gateOn).map(strip),
    parts: o.parent.parts.filter(gateOn).map(strip),
  }
  // 이 그림의 몫 — 시점별 보기에서만 (그 시점에 켜진 빈터와 그 for, 칸·부분·이름)
  const own = t !== undefined && art && {
    clearings: (art.clearings ?? []).flatMap((c, index) => (gateOn(c) ? [{ index, ...(c.for ? { for: [...c.for] } : {}), ...(c.time?.[`t${t}`] !== undefined ? { keyed: true } : {}) }] : [])),
    clearingsOff: (art.clearings ?? []).flatMap((c, index) => (!gateOn(c) && (gated(c) || c.time) ? [{ index, ...(c.for ? { for: [...c.for] } : {}), ...(c.time?.[`t${t}`] !== undefined ? { keyed: true } : {}) }] : [])),
    terrain: art.terrain.flatMap((x, index) => (gateOn(x) ? [{ index, kind: x.kind }] : [])),
    parts: art.parts.filter(gateOn).length,
    partsGated: art.parts.filter((x) => gated(x) || x.time || x.timeOnly).filter(gateOn).length,
    labels: art.labels.filter(gateOn).map((l) => l.text),
  }
  return {
    ...o,
    level: n,
    ...(t !== undefined ? { time: t } : {}),
    note: t === undefined ? `${o.note} --level ${n}: 그 단계에서 그려지는 것만 문 없이 (0: 끔).` : `${o.note} --time ${t}: 시점별 보기의 시점 ${t}(바탕 단계 ${n})에서 그려지는 것만 문 없이.`,
    marks: o.marks.flatMap((m) => {
      if (t === undefined ? m.levels && (!n || !m.levels.includes(n)) : m.times && !m.times.includes(t)) return []
      const { levels: _l, times: _t, ...rest } = m
      if (!kindAt.has(m.key)) return [rest]
      const k = kindAt.get(m.key)
      return k === null ? [] : [{ ...rest, kind: k, period: true }]
    }),
    landscape: flatLandscape,
    subjects: o.subjects.filter(liveCard).map(flatCard),
    worldFigures: o.worldFigures.filter(liveCard).map(flatCard),
    periods: flatPeriods,
    ...(flatParent ? { parent: flatParent } : {}),
    ...(own ? { own } : {}),
  }
}
if (level !== undefined) out = flatten(out, level, time)

// --svg — 이 그림 좌표로 미리 보기 (--level 이 있으면 그 단계 모습)
const svgOut = flag('svg')
if (svgOut) fs.writeFileSync(svgOut, previewSvg())

function previewSvg() {
  const band = detailBandOf(b)
  const padW = parent ? parent.band : band
  const view = { x0: b.x0 - padW, y0: b.y0 - padW, x1: b.x1 + padW, y1: b.y1 + padW }
  const vx = -padW * scale
  const vw = size[0] + 2 * padW * scale
  const vh = size[1] + 2 * padW * scale
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const pts = (ring) => ring.map((p) => p.join(',')).join(' ')
  const poly = (ring, attrs, title) => `<polygon points="${pts(ring)}" ${attrs}>${title ? `<title>${esc(title)}</title>` : ''}</polygon>`
  const pline = (line, attrs, title) => `<polyline points="${pts(line)}" fill="none" ${attrs}>${title ? `<title>${esc(title)}</title>` : ''}</polyline>`
  const text = (at, s, attrs = '') => `<text x="${at[0]}" y="${at[1]}" font-size="${r1(Math.max(8, vw / 140))}" ${attrs}>${esc(s)}</text>`
  const worldRing = (ring) => {
    const r = clipRing(ring, view)
    return r.length >= 3 ? simplifyRing(r, 0.15).map(toChild) : null
  }
  const shown = (o) => level === undefined || inView(o, gateView)
  const liveAt = (levels) => !levels || level === undefined || levels.includes(level)
  const tag = (levels) => (level === undefined ? ` [${levels.join(',')}]` : '')
  const style = (cls) =>
    /^(fill|shade|stone|forest|sea|fire|blood|gold|dark)$/.test(cls)
      ? `fill="${{ fill: '#f3ecd8', shade: '#d8ccb0', stone: '#cfc6b2', forest: '#b9c7a8', sea: '#c4d3d4', fire: '#e0a070', blood: '#a04040', gold: '#d4b060', dark: '#333' }[cls]}" stroke="none"`
      : `fill="none" stroke="${cls.startsWith('sea') ? '#4a7080' : '#2a241c'}" stroke-width="${cls === 'hatch' ? 0.6 : cls === 'ink-bold' ? 1.5 : 1.1}"`
  const deep = deepRings()
  const landRings = [...deep.lands.values()].map(worldRing).filter(Boolean)
  const lines = []
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vx} ${vw} ${vh}">`)
  lines.push(`<defs><clipPath id="land">${landRings.map((r) => `<polygon points="${pts(r)}"/>`).join('')}</clipPath></defs>`)
  lines.push(`<rect x="${vx}" y="${vx}" width="${vw}" height="${vh}" fill="#c4d3d4"/>`)
  // 세계 지도 — 땅·숲 채색·내해 (깊은 확대 다듬기)
  for (const r of landRings) lines.push(poly(r, 'fill="#ebe3cc" stroke="#6a5a40" stroke-width="1"'))
  for (const r of deep.forests.map(worldRing).filter(Boolean)) lines.push(poly(r, 'fill="#b9c7a8" fill-opacity="0.45" stroke="none" clip-path="url(#land)"'))
  for (const r of [...deep.waters.values()].map(worldRing).filter(Boolean)) lines.push(poly(r, 'fill="#c4d3d4" stroke="#4a7080" stroke-width="1"'))
  // 바탕 지형의 강·선 (숨는 단계면 흐린 점선)
  for (const r of out.landscape.rivers) lines.push(pline(r.course, `stroke="${r.dry ? '#a08060' : '#4a7080'}" stroke-width="${r.widthChild}"${r.dry ? ' stroke-dasharray="6 4"' : ''} stroke-opacity="0.8"`, r.id))
  for (const t of out.landscape.lines) {
    const off = level !== undefined ? false : Boolean(t.hiddenAt)
    lines.push(pline(t.line, `stroke="${off ? '#c03030' : '#5a4a30'}" stroke-width="${t.widthChild ?? 2}" stroke-opacity="${off ? 0.5 : 0.35}"${off ? ' stroke-dasharray="10 6"' : ''}`, `${t.id}${t.hiddenAt ? ` 숨음 [${t.hiddenAt.join(',')}]` : ''}`))
  }
  // 이 그림 — 칸·빈터·부분 (--level 이면 그 단계에 그려지는 것만, 아니면 문 단 것은 흐리게)
  if (art) {
    for (const t of art.terrain) if (shown(t)) lines.push(poly(t.points, `fill="none" stroke="${['dust', 'chalk', 'drybed', 'deadwood'].includes(t.kind) ? '#c07020' : '#7a9a60'}" stroke-dasharray="6 4"`, `칸 ${t.kind}`))
    for (const c of art.clearings ?? []) if (shown(c)) lines.push(poly(c.points, 'fill="none" stroke="#c05050" stroke-dasharray="3 3"', `빈터${c.for ? ` ${c.for.join('·')}` : ''}${c.time ? ` ${JSON.stringify(c.time)}` : ''}`))
    // 시점별 보기 — 그 시점에 그리는 이 그림의 대상 상자 (옮긴 대상은 빼고)
    if (time !== undefined) lines.push(...out.subjects.filter((x) => x.movedAt === undefined && x.current).map((x) => `<circle cx="${x.current.at[0]}" cy="${x.current.at[1]}" r="${r1(x.current.size / 2)}" fill="none" stroke="#a040a0" stroke-width="2"><title>${esc(x.id)}</title></circle>`))
    for (const pp of art.parts) if (shown(pp)) lines.push(`<path d="${pp.d}" ${style(pp.cls)}${level === undefined && (GATE_KEYS.some((k) => pp[k] !== undefined) || pp.time || pp.timeOnly) ? ' opacity="0.6"' : ''}/>`)
  }
  // 부모 그림 (더 깊은 지역 상세)
  if (parent) {
    const pp = out.parent
    lines.push(...pp.terrain.map((t) => `<polygon points="${t.points.join(' ')}" fill="none" stroke="#7a9a60" stroke-dasharray="6 4"/>`))
    lines.push(...pp.clearings.map((c) => `<polygon points="${c.points.join(' ')}" fill="none" stroke="#c05050" stroke-dasharray="3 3"/>`))
    lines.push(...pp.parts.map((x) => `<path d="${x.d}" ${style(x.cls)}${Object.keys(x).some((k) => GATE_KEYS.includes(k)) ? ' opacity="0.6"' : ''}/>`))
    lines.push(...pp.subjects.map((s) => `<rect x="${s.boxChild.x0}" y="${s.boxChild.y0}" width="${s.boxChild.x1 - s.boxChild.x0}" height="${s.boxChild.y1 - s.boxChild.y0}" fill="none" stroke="#a040a0"/>`))
    lines.push(...pp.labels.map((l) => `<text x="${l.at[0]}" y="${l.at[1]}" font-size="${l.size}" text-anchor="middle"${l.rotate ? ` transform="rotate(${l.rotate} ${l.at[0]} ${l.at[1]})"` : ''}>${esc(l.text)}</text>`))
  }
  lines.push(...out.worldFigures.map((s) => `<rect x="${s.boxChild.x0}" y="${s.boxChild.y0}" width="${s.boxChild.x1 - s.boxChild.x0}" height="${s.boxChild.y1 - s.boxChild.y0}" fill="none" stroke="#4040c0"><title>${esc(s.id)}</title></rect>`))
  // 페이즈 바탕 — 그 단계 모습 (--level 이 없으면 모두, 단계 표시와 함께)
  const P = out.periods
  const PAINT = { 'drybed-floor': ['#ddd2b6', 0.9], pool: ['#c4d3d4', 1], dust: ['#f2eee2', 0.8], chalk: ['#ece8dc', 0.85] }
  for (const e of P.paint) {
    if (!liveAt(e.levels)) continue
    // 칠은 땅 위에만 (앱의 land-clip) — 대륙 범위는 이미 그 대륙의 땅으로 자른 고리다
    const clip = ' clip-path="url(#land)"'
    if (e.kind === 'deadwood') for (const r of e.rings) lines.push(poly(r, `fill="#7a5a3a" fill-opacity="0.12" stroke="#7a5a3a" stroke-dasharray="2 3"${clip}`, `${e.id} 죽은 숲${tag(e.levels)}`))
    else {
      const [fill, op] = PAINT[e.kind] ?? ['#ffffff', 0.6]
      for (const r of e.rings) lines.push(poly(r, `fill="${fill}" fill-opacity="${op}" stroke="#8a7a5a" stroke-width="0.8"${clip}`, `${e.id} ${e.kind}${tag(e.levels)}`))
      for (const bd of e.bands ?? []) lines.push(pline(bd.line, `stroke="${fill}" stroke-width="${bd.widthChild}" stroke-opacity="${op}"`, `${e.id}${tag(e.levels)}`))
    }
    for (const h of e.holes ?? []) lines.push(poly(h, 'fill="none" stroke="#2a7a2a" stroke-dasharray="4 3"', `${e.id} 뺀 자리`))
  }
  for (const e of P.terrain) {
    if (!liveAt(e.levels)) continue
    const cells = (e.cells ?? e.suggest.terrain).map((c) => c.points)
    for (const r of cells.filter((c, i) => cells.indexOf(c) === i)) lines.push(poly(r, 'fill="none" stroke="#b06020" stroke-width="1.2" stroke-dasharray="8 4"', `${e.id} → ${e.childKind}${e.kinds.length ? ` (지움: ${e.kinds.join(',')})` : ''}${tag(e.levels)}`))
    const at = cells[0]?.[0]
    if (at) lines.push(text(at, `${e.id}${tag(e.levels)}`, 'fill="#8a4010"'))
  }
  for (const e of P.redraw) {
    if (!liveAt(e.levels)) continue
    if (e.type === 'river') lines.push(pline(e.course, `stroke="${e.dry ? '#a08060' : '#2a5ea5'}" stroke-width="${e.widthChild}"${e.dry ? ' stroke-dasharray="6 4"' : ''}`, `${e.id}${tag(e.levels)}`))
    else if (e.type === 'glyph') lines.push(`<circle cx="${e.child[0]}" cy="${e.child[1]}" r="${e.clearRadiusChild}" fill="none" stroke="#2a5ea5" stroke-width="1.5"><title>${esc(`${e.id} ${e.kind}${tag(e.levels)}`)}</title></circle>`)
    else if (e.type === 'mouth') lines.push(`<circle cx="${e.child[0]}" cy="${e.child[1]}" r="${r1(2 * scale)}" fill="#ddd2b6" stroke="#8a6a3a"><title>${esc(`${e.id}${tag(e.levels)}`)}</title></circle>`)
  }
  for (const e of P.hidden) {
    // --level 이면 그 단계에 숨는 선만 남아 있다
    if (level === undefined ? false : e.hiddenLevels && !e.hiddenLevels.includes(level)) continue
    lines.push(pline(e.line, `stroke="#c03030" stroke-width="${e.widthChild ?? 2}" stroke-opacity="0.25" stroke-dasharray="4 4"`, `${e.id} 숨음${level === undefined ? ` [${e.hiddenLevels.join(',')}]` : ''}`))
  }
  for (const m of P.marks) {
    const k = level === undefined ? null : m.kind !== undefined ? m.kind : m.byLevel?.[level]
    const label = level === undefined ? `${m.key} ${Object.entries(m.byLevel).map(([lv, kd]) => `${lv}:${kd ?? '없음'}`).join(' ')}` : `${m.key} ${k ?? '없음'}`
    if (level !== undefined && !(m.kind !== undefined || level in (m.byLevel ?? {}))) continue
    lines.push(`<circle cx="${m.child[0]}" cy="${m.child[1]}" r="${r1(Math.max(6, vw / 200))}" fill="${k === 'ruin' ? '#a08060' : 'none'}" stroke="#c03030" stroke-width="2"/>`)
    lines.push(text([m.child[0] + 8, m.child[1] - 8], label, 'fill="#c03030"'))
  }
  // 범위와 띠
  lines.push(`<rect x="0" y="0" width="${size[0]}" height="${size[1]}" fill="none" stroke="#000" stroke-dasharray="10 6"/>`)
  lines.push(`<rect x="${band * scale}" y="${band * scale}" width="${size[0] - 2 * band * scale}" height="${size[1] - 2 * band * scale}" fill="none" stroke="#999" stroke-dasharray="4 6"/>`)
  if (parent) lines.push(`<rect x="${parent.band * scale}" y="${parent.band * scale}" width="${size[0] - 2 * parent.band * scale}" height="${size[1] - 2 * parent.band * scale}" fill="none" stroke="#999" stroke-dasharray="4 6"/>`)
  lines.push(text([vx + 8, vx + vw / 70], `${id}${level === undefined ? ' — 모든 단계 (페이즈 바탕에 [단계])' : time !== undefined ? ` — 시점 ${time} (바탕 단계 ${level})` : ` — 단계 ${level}`}`, 'fill="#000"'))
  lines.push('</svg>')
  return lines.join('\n')
}

process.stdout.write(JSON.stringify(out, null, 1) + '\n')
