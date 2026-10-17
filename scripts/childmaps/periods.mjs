// 세계 지도의 페이즈 바탕(src/data/periods)을 지역 상세 도구가 읽는 자리 — context.mjs 의 periods 묶음과 to_ts.mjs --check 의 9–13 이 함께 쓴다.
// 항목을 불러오고(src/data/periods/index.ts 의 자체 검사를 여기서 부른다), 범위(PeriodShape)를 앱과 같은 다듬기의 고리로 풀고(이름으로 가리킨 다각형은
// geo.ts 의 inked → 깊은 확대의 chaikin 2 = deepRings, 새 고리는 chaikin 2), 소속 판정과 그림에 붙여 넣을 다각형(칸·빈터는 고리 하나만 받으니
// 구멍은 열쇠 구멍으로 이어 붙인다)을 만든다. 좌표는 모두 세계 지도 단위 — 그림 좌표로 옮기는 것은 부르는 쪽이 한다.
// 픽스처로 시험할 때는 PERIODS_DIR=<폴더> (그 폴더의 index.ts, 없으면 대륙 파일들의 `period`)
import fs from 'node:fs'
import path from 'node:path'
import { chaikin, distanceToPolyline, hashSeed, inkWobble, pointInRing, ringBounds, simplifyRing } from '../../src/map/geometry.ts'
import { clipRing } from '../../src/map/periodClip.ts'
import { continents } from '../../src/data/continents.ts'
import { locations } from '../../src/data/locations.ts'
import { GATES, PHASE_SLOTS, gatesFor, levelsOf } from '../../src/data/sagas.ts'

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '../..')

/** 문이 셈하는 단계 — 0(끔)과 데이터가 있는 모든 페이즈 (이어 센 번호) */
export const LEVELS = [0, ...PHASE_SLOTS.map((p) => p.level)]
/** 그 단계 집합의 나머지 (끔 포함) */
export const complement = (levels) => LEVELS.filter((l) => !levels.includes(l))
/** 페이즈 문의 이름 */
export const GATE_KEYS = GATES.map(([k]) => k)
/** 붙은 문만 (to_ts.mjs·context.mjs 의 gatesOf 와 같은 강제 변환) */
export const gateOfPart = (o) => Object.fromEntries(GATE_KEYS.filter((k) => o[k] !== undefined).map((k) => [k, Boolean(o[k])]))
/** 그림 부분·칸·빈터가 그려지는 단계 */
export const partLevels = (o) => levelsOf(gateOfPart(o))
export { gatesFor, levelsOf }

/** 지역 상세의 새 칸 종류 — 페이즈 바탕을 옮겨 그리는 칸 (childMapArt.ts 의 PeriodTerrainKind). 끔(0)에 그려지면 안 된다 (검사 13) */
export const PERIOD_KINDS = ['dust', 'chalk', 'drybed', 'deadwood']
/** 지역 상세의 바탕 칸 종류 (childMapArt.ts 의 ChildTerrainKind 에서 페이즈 칸을 뺀 것) */
export const BASE_KINDS = ['mountain', 'snow', 'hill', 'forest', 'swamp', 'canyon', 'mangrove', 'tundra', 'crystal', 'ice', 'lava', 'mesa']
/** 세계 지도 기호 종류(ScatterKind) → 그 기호를 뿌리는 지역 상세 칸 종류 (수정 첨탑은 산 칸이 함께 뿌린다) */
export const CHILD_OF_SCATTER = {
  peak: 'mountain',
  hill: 'hill',
  snow: 'snow',
  'crystal-spire': 'mountain',
  mesa: 'mesa',
  crystal: 'crystal',
  tree: 'forest',
  mangrove: 'mangrove',
  marsh: 'swamp',
  ice: 'ice',
  canyon: 'canyon',
  lava: 'lava',
  tundra: 'tundra',
}
/** 그 무렵에만 있던 영역 기호(PeriodRelief.kind) → 지역 상세 칸 종류 */
export const CHILD_OF_RELIEF = { hills: 'hill', swamp: 'swamp', crystal: 'crystal' }
/** 죽은 나무로 남기는 몫 (periodTypes.ts 의 PeriodGlyphKit.DEAD_KEEP — 세계 지도와 지역 상세가 같은 hash01 로 가른다) */
export const DEAD_KEEP = 0.25
/** 지운 기호 종류 → 지역 상세 칸 종류 ('all' 이면 바탕 칸 모두) */
export const clearedKinds = (clears) => (clears === 'all' ? [...BASE_KINDS] : [...new Set((clears ?? []).map((k) => CHILD_OF_SCATTER[k]).filter(Boolean))])

// ------------------------------------------------------------------ 불러오기

const EMPTY_SET = { grounds: [], reliefs: [], drains: [], rivers: [], glyphs: [], hides: [], marks: [], labels: [] }
const CATS = Object.keys(EMPTY_SET)
const isSet = (o) => o && typeof o === 'object' && CATS.some((k) => Array.isArray(o[k]))
function merge(sets) {
  const out = Object.fromEntries(CATS.map((k) => [k, []]))
  for (const s of sets) for (const k of CATS) out[k].push(...(s?.[k] ?? []))
  return out
}

/**
 * 페이즈 바탕 항목을 불러온다 — src/data/periods/index.ts 의 PERIODS (그 자체 검사 checkPeriods 를 여기서 불러 어긋나면 던진다).
 * index.ts 가 아직 없으면 대륙 파일들(<대륙>.ts 의 period)을 합치고, 그것도 없으면 빈 묶음. PERIODS_DIR 로 다른 폴더(픽스처)를 읽는다
 */
export async function loadPeriods() {
  const dir = process.env.PERIODS_DIR ? path.resolve(process.env.PERIODS_DIR) : path.join(root, 'src/data/periods')
  const rel = path.relative(root, dir) || '.'
  if (!fs.existsSync(dir)) return { set: merge([]), source: `${rel} (없음)`, dir, index: null }
  const index = path.join(dir, 'index.ts')
  if (fs.existsSync(index)) {
    const mod = await import(index)
    // 자체 검사(P1–P6) — index.ts 는 빌드에 싣지 않으려고 불러올 때 검사하지 않아, 도구가 부른다
    if (typeof mod.checkPeriods === 'function') mod.checkPeriods()
    const p = mod.PERIODS
    const set = isSet(p) ? merge([p]) : Array.isArray(p) ? merge(p) : p && typeof p === 'object' ? merge(Object.values(p)) : null
    if (!set) throw new Error(`${rel}/index.ts 가 PERIODS(PeriodSet) 를 내지 않는다`)
    return { set, source: `${rel}/index.ts`, dir, index: mod }
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && !['types.ts', 'index.ts', 'check.ts'].includes(f))
    .sort()
  const sets = []
  for (const f of files) {
    const mod = await import(path.join(dir, f))
    if (!isSet(mod.period)) throw new Error(`${rel}/${f} 가 period(PeriodSet) 를 내지 않는다`)
    sets.push(mod.period)
  }
  return { set: merge(sets), source: files.length ? `${rel}/{${files.join(',')}}` : `${rel} (항목 파일 없음)`, dir, index: null }
}

/** src/data/periods/check.ts 의 checkPeriodMarks (M1·M2) — 아직 없으면 null */
export async function loadMarkCheck(dir) {
  const file = path.join(dir, 'check.ts')
  if (!fs.existsSync(file)) return null
  const mod = await import(file)
  return typeof mod.checkPeriodMarks === 'function' ? mod.checkPeriodMarks : null
}

/** 세계 지도 바탕 지형(src/data/landscape) — 영역·강·선·한 점 기호·바다 표시 (context.mjs 와 같은 읽기) */
let landscapeCache = null
export async function readLandscape() {
  if (landscapeCache) return landscapeCache
  const dir = path.join(root, 'src/data/landscape')
  const out = { areas: [], rivers: [], lines: [], glyphs: [], sea: [] }
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
    const { landscape: l } = await import(path.join(dir, file))
    for (const k of Object.keys(out)) out[k].push(...(l[k] ?? []))
  }
  return (landscapeCache = out)
}

// ------------------------------------------------------------------ 세계 지도 고리 (src/map/geo.ts 와 같은 다듬기, 깊은 확대의 chaikin 2)

const json = (f) => JSON.parse(fs.readFileSync(path.join(root, 'src/data/geo', f), 'utf8'))
const inked = (key, pts, wobble = 0.6) => inkWobble(chaikin(pts, 1), hashSeed(key), wobble)
let deepCache = null
/** 깊은 확대에서 그리는 모양 (geo.ts 의 deepRings) — 땅은 id, 물은 features.json 의 waters 키, 숲은 순번 */
export function deepRings() {
  if (deepCache) return deepCache
  const coast = json('coastlines.json')
  const features = json('features.json')
  const lands = new Map([
    ...Object.entries(coast.landmasses).map(([k, pts]) => [k, chaikin(inked(k, pts), 2)]),
    ...Object.entries(coast.islets).map(([k, pts]) => [k, chaikin(inked(k, pts, 0.3), 2)]),
  ])
  const waters = new Map(Object.entries(features.waters).map(([k, pts]) => [k, chaikin(pts.length <= 8 ? pts : inked(k, pts, 0.4), 2)]))
  const forests = features.forests.map((pts, i) => chaikin(inked(`forest-${i}`, pts, 1.2), 2))
  return (deepCache = { lands, waters, forests })
}

const ellipseRing = ([cx, cy], [rx, ry], n = 48) => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * rx, cy + Math.sin((i / n) * Math.PI * 2) * ry])
const inBox = (b, x, y) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1
const boxPad = (b, p) => ({ x0: b.x0 - p, y0: b.y0 - p, x1: b.x1 + p, y1: b.y1 + p })
const ringTest = (ring) => {
  const b = ringBounds(ring)
  return { bounds: b, inside: (x, y) => inBox(b, x, y) && pointInRing(x, y, ring) }
}
/** 풀린 범위(resolveShape)의 고리들 — 고리 하나(ring)든 여럿(rings, 대륙)이든, 띠면 빈 목록 */
export const ringsOf = (s) => s.rings ?? (s.ring ? [s.ring] : [])

/**
 * 범위 하나(PeriodShape)를 푼다 — { desc, bounds, inside(x, y), ring?, rings?, line?, width? }.
 * ring 은 그림에 보일 고리(깊은 확대 다듬기), rings 는 고리 여럿(대륙 — 그 대륙의 땅을 범위 다각형으로 자른 조각들, landIds 는 그 땅),
 * line·width 는 띠. 고리는 ringsOf 로 한꺼번에 읽는다
 */
export function resolveShape(shape, landscape) {
  const deep = deepRings()
  if ('ring' in shape) {
    const ring = chaikin(shape.ring, 2)
    return { desc: 'ring', ring, ...ringTest(ring) }
  }
  if ('band' in shape) {
    const r = shape.width / 2
    const b = ringBounds(shape.band)
    const bounds = boxPad(b, r)
    return { desc: 'band', line: shape.band, width: shape.width, bounds, inside: (x, y) => inBox(bounds, x, y) && distanceToPolyline(x, y, shape.band) <= r }
  }
  if ('water' in shape) {
    const ring = deep.waters.get(shape.water)
    if (!ring) throw new Error(`페이즈 바탕: water '${shape.water}' 가 features.json 에 없다`)
    return { desc: `water:${shape.water}`, ring, ...ringTest(ring) }
  }
  if ('forest' in shape) {
    const ring = deep.forests[shape.forest]
    if (!ring) throw new Error(`페이즈 바탕: forest ${shape.forest} 가 features.json 에 없다`)
    return { desc: `forest:${shape.forest}`, ring, ...ringTest(ring) }
  }
  if ('continent' in shape) {
    const c = continents.find((x) => x.id === shape.continent)
    if (!c) throw new Error(`페이즈 바탕: continent '${shape.continent}' 가 continents.ts 에 없다`)
    const landRings = [c.landmass, ...(c.islands ?? [])].map((id) => deep.lands.get(id)).filter(Boolean)
    const lands = landRings.map(ringTest)
    const area = c.area ? ringTest(c.area) : null
    const landBounds = lands.reduce((a, l) => ({ x0: Math.min(a.x0, l.bounds.x0), y0: Math.min(a.y0, l.bounds.y0), x1: Math.max(a.x1, l.bounds.x1), y1: Math.max(a.y1, l.bounds.y1) }), {
      x0: Infinity,
      y0: Infinity,
      x1: -Infinity,
      y1: -Infinity,
    })
    const bounds = area ? { x0: Math.max(area.bounds.x0, landBounds.x0), y0: Math.max(area.bounds.y0, landBounds.y0), x1: Math.min(area.bounds.x1, landBounds.x1), y1: Math.min(area.bounds.y1, landBounds.y1) } : landBounds
    const onLand = (x, y) => lands.some((l) => l.inside(x, y))
    // 칠과 같은 모양 — 그 대륙의 땅 고리를 범위 다각형으로 자른 고리들 (앱 periodTerrain.ts 와 같은 periodClip.ts 의 clipRing).
    // 범위 다각형 안에 든 이웃 대륙의 땅(발라 게드 범위 북쪽 변 밑의 아쿰 남동 끝)은 들지 않는다
    return {
      desc: `continent:${c.id}`,
      rings: c.area ? landRings.flatMap((r) => clipRing(r, c.area)) : landRings,
      landIds: [c.landmass, ...(c.islands ?? [])],
      bounds,
      inside: (x, y) => inBox(bounds, x, y) && (!area || area.inside(x, y)) && onLand(x, y),
    }
  }
  if ('place' in shape) {
    const l = locations.find((x) => x.id === shape.place)
    if (!l) throw new Error(`페이즈 바탕: place '${shape.place}' 가 locations.ts 에 없다`)
    if (!l.position || !l.extent) throw new Error(`페이즈 바탕: place '${shape.place}' 에 자리·extent 가 없다`)
    const [cx, cy] = l.position
    const [rx, ry] = l.extent
    const bounds = { x0: cx - rx, y0: cy - ry, x1: cx + rx, y1: cy + ry }
    return { desc: `place:${l.id}`, ring: ellipseRing(l.position, l.extent), bounds, inside: (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 }
  }
  if ('area' in shape) {
    const a = landscape.areas.find((x) => x.id === shape.area)
    if (!a) throw new Error(`페이즈 바탕: area '${shape.area}' 가 landscape 에 없다`)
    if (a.ring) {
      const ring = chaikin(a.ring, 2)
      return { desc: `area:${a.id}`, ring, ...ringTest(ring) }
    }
    const [cx, cy] = a.at
    const [rx, ry] = a.extent
    const bounds = { x0: cx - rx, y0: cy - ry, x1: cx + rx, y1: cy + ry }
    return { desc: `area:${a.id}`, ring: ellipseRing(a.at, a.extent), bounds, inside: (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 }
  }
  throw new Error(`페이즈 바탕: 모르는 범위 ${JSON.stringify(shape)}`)
}

const unionBounds = (list) =>
  list.reduce((a, s) => ({ x0: Math.min(a.x0, s.bounds.x0), y0: Math.min(a.y0, s.bounds.y0), x1: Math.max(a.x1, s.bounds.x1), y1: Math.max(a.y1, s.bounds.y1) }), {
    x0: Infinity,
    y0: Infinity,
    x1: -Infinity,
    y1: -Infinity,
  })

/**
 * 영역 항목(ground·relief·drain)의 범위 — { shapes, holes, bounds, inside(x, y) }. 범위들의 합에서 뺄 자리(minus, 내해 물 빼기는 남은 물)를 뺀 것.
 * 내해 물 빼기의 범위는 옛 물가 고리(water) 그대로다
 */
export function regionOf(cat, item, landscape) {
  const shapes = cat === 'drain' ? [resolveShape({ water: item.water }, landscape)] : item.shapes.map((s) => resolveShape(s, landscape))
  const holes = cat === 'drain' ? item.pools.map((ring) => resolveShape({ ring }, landscape)) : (item.minus ?? []).map((s) => resolveShape(s, landscape))
  const bounds = unionBounds(shapes)
  return { shapes, holes, bounds, inside: (x, y) => inBox(bounds, x, y) && shapes.some((s) => s.inside(x, y)) && !holes.some((h) => h.inside(x, y)) }
}

/** 영역 항목이 더하는 지역 상세 칸 종류 */
export function addedKind(cat, item) {
  if (cat === 'drain') return 'drybed'
  if (cat === 'relief') return CHILD_OF_RELIEF[item.kind]
  return item.kind
}
/**
 * 영역 항목이 지우는 지역 상세 칸 종류 (내해 물 빼기는 물 위라 없다). 더하는 종류와 같은 바탕 칸도 지운다 — 'all' 이면 바탕 늪 칸 위에 그 무렵의 늪을
 * 따로 뿌리므로(세계 지도는 바탕 기호를 빼고 항목마다 따로 시드한다) 바탕 칸을 그대로 두면 두 겹이 된다
 */
export function removedKinds(cat, item) {
  if (cat === 'drain') return []
  return clearedKinds(item.clears)
}

/** 페이즈 바탕 항목을 한 줄로 — { cat, item } (cat: ground·relief·drain·river·glyph·hide·mark·label) */
export function entriesOf(set) {
  const out = []
  for (const item of set.grounds) out.push({ cat: 'ground', item })
  for (const item of set.reliefs) out.push({ cat: 'relief', item })
  for (const item of set.drains) out.push({ cat: 'drain', item })
  for (const item of set.rivers) out.push({ cat: 'river', item })
  for (const item of set.glyphs) out.push({ cat: 'glyph', item })
  for (const item of set.hides) out.push({ cat: 'hide', item })
  for (const item of set.marks) out.push({ cat: 'mark', item })
  for (const item of set.labels) out.push({ cat: 'label', item })
  return out
}

/** 더한 강·폭포가 바탕 기호를 비우는 반지름 (landscape.ts 의 buildBlockedMask 와 같다 — 강 4.5 + 폭/2, 폭포 10·size) */
export const riverClear = (r) => 4.5 + (r.width ?? 1.6) / 2
export const glyphClear = (g) => 10 * (g.size ?? 1)

// ------------------------------------------------------------------ 소속 함수 → 고리 (그림에 붙여 넣을 다각형)

const EDGE_STEPS = 10
/**
 * 소속 함수 inside(x, y) 의 경계를 격자(step)로 따라 고리들로 — 상자(box) 둘레는 밖으로 본다(고리가 닫힌다).
 * 경계 점은 격자 변 위에서 이분법으로 다시 찾아(EDGE_STEPS 번) 격자보다 곱게 맞춘다. 구멍은 가장 가까운 꼭짓점끼리 이어(열쇠 구멍)
 * 바깥 고리 하나로 만든다 — 그림의 칸·빈터는 고리 하나만 받고, pointInRing 은 짝홀 셈이라 이은 고리도 구멍을 바르게 가른다.
 * simplify: 다듬는 폭 (지도 단위, 0 이면 그대로)
 */
export function traceRegion(inside, box, step, simplify = step * 0.25) {
  const nx = Math.max(2, Math.ceil((box.x1 - box.x0) / step))
  const ny = Math.max(2, Math.ceil((box.y1 - box.y0) / step))
  const sx = (box.x1 - box.x0) / nx
  const sy = (box.y1 - box.y0) / ny
  const X = (i) => box.x0 + i * sx
  const Y = (j) => box.y0 + j * sy
  const v = new Uint8Array((nx + 1) * (ny + 1))
  let any = false
  for (let j = 1; j < ny; j++) {
    for (let i = 1; i < nx; i++) {
      if (!inside(X(i), Y(j))) continue
      v[j * (nx + 1) + i] = 1
      any = true
    }
  }
  if (!any) return []
  const at = (i, j) => v[j * (nx + 1) + i]
  // 변 위의 경계 점 — 안 쪽 끝과 밖 쪽 끝 사이에서 이분법
  const points = new Map()
  const edgePoint = (key, [ax, ay], [bx, by], aIn) => {
    let hit = points.get(key)
    if (hit) return hit
    let [ix, iy, ox, oy] = aIn ? [ax, ay, bx, by] : [bx, by, ax, ay]
    for (let k = 0; k < EDGE_STEPS; k++) {
      const mx = (ix + ox) / 2
      const my = (iy + oy) / 2
      if (inside(mx, my)) [ix, iy] = [mx, my]
      else [ox, oy] = [mx, my]
    }
    hit = [(ix + ox) / 2, (iy + oy) / 2]
    points.set(key, hit)
    return hit
  }
  // 칸마다 선분 (변 열쇠 둘) — 안쪽 모서리 a(8)·b(4)·c(2)·d(1), 안장은 안쪽 모서리를 떼어 둔다
  const adj = new Map()
  const link = (p, q) => {
    ;(adj.get(p) ?? adj.set(p, []).get(p)).push(q)
    ;(adj.get(q) ?? adj.set(q, []).get(q)).push(p)
  }
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = at(i, j)
      const b = at(i + 1, j)
      const c = at(i + 1, j + 1)
      const d = at(i, j + 1)
      const code = a * 8 + b * 4 + c * 2 + d
      if (code === 0 || code === 15) continue
      const T = `h${i},${j}`
      const B = `h${i},${j + 1}`
      const L = `v${i},${j}`
      const R = `v${i + 1},${j}`
      // 변의 경계 점을 미리 만든다 (열쇠 → 자리)
      if (a !== b) edgePoint(T, [X(i), Y(j)], [X(i + 1), Y(j)], a === 1)
      if (d !== c) edgePoint(B, [X(i), Y(j + 1)], [X(i + 1), Y(j + 1)], d === 1)
      if (a !== d) edgePoint(L, [X(i), Y(j)], [X(i), Y(j + 1)], a === 1)
      if (b !== c) edgePoint(R, [X(i + 1), Y(j)], [X(i + 1), Y(j + 1)], b === 1)
      const segs = {
        1: [[L, B]],
        2: [[B, R]],
        3: [[L, R]],
        4: [[T, R]],
        5: [
          [T, R],
          [L, B],
        ],
        6: [[T, B]],
        7: [[T, L]],
        8: [[T, L]],
        9: [[T, B]],
        10: [
          [T, L],
          [B, R],
        ],
        11: [[T, R]],
        12: [[L, R]],
        13: [[B, R]],
        14: [[L, B]],
      }[code]
      for (const [p, q] of segs) link(p, q)
    }
  }
  // 이어 고리로
  const seen = new Set()
  const loops = []
  for (const start of adj.keys()) {
    if (seen.has(start)) continue
    const loop = []
    let prev = null
    let cur = start
    while (cur && !seen.has(cur)) {
      seen.add(cur)
      loop.push(points.get(cur))
      const next = adj.get(cur).find((n) => n !== prev && !seen.has(n))
      prev = cur
      cur = next
    }
    if (loop.length >= 3) loops.push(simplify > 0 ? simplifyRing(loop, simplify) : loop)
  }
  // 바깥 고리와 구멍 — 다른 고리 몇 겹 안에 드는지 (짝수면 바깥)
  const rings = loops.filter((r) => r.length >= 3)
  const depth = rings.map((r, i) => rings.reduce((n, o, k) => n + (k !== i && pointInRing(r[0][0], r[0][1], o) ? 1 : 0), 0))
  const outers = rings.map((r, i) => ({ r, i })).filter(({ i }) => depth[i] % 2 === 0)
  const out = outers.map(({ r }) => [...r])
  rings.forEach((h, i) => {
    if (depth[i] % 2 === 0) return
    // 이 구멍을 바로 감싼 바깥 고리 (깊이가 하나 얕은 것 가운데 이 구멍을 담은 것)
    const k = outers.findIndex(({ r, i: oi }) => depth[oi] === depth[i] - 1 && pointInRing(h[0][0], h[0][1], r))
    if (k < 0) return
    const o = out[k]
    let best = [0, 0, Infinity]
    for (let a = 0; a < o.length; a++) for (let b = 0; b < h.length; b++) {
      const dd = (o[a][0] - h[b][0]) ** 2 + (o[a][1] - h[b][1]) ** 2
      if (dd < best[2]) best = [a, b, dd]
    }
    const [a, b] = best
    const hole = [...h.slice(b), ...h.slice(0, b), h[b]]
    out[k] = [...o.slice(0, a + 1), ...hole, ...o.slice(a)]
  })
  return out
}

/** 꺾은선을 사각형으로 자른다 — 안에 드는 이어진 조각들 (끝은 경계까지 잇는다) */
export function clipLine(line, r) {
  const inR = ([x, y]) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1
  const runs = []
  let run = []
  for (let i = 0; i < line.length; i++) {
    const p = line[i]
    if (inR(p)) {
      if (!run.length && i > 0) run.push(line[i - 1])
      run.push(p)
    } else if (run.length) {
      run.push(p)
      runs.push(run)
      run = []
    }
  }
  if (run.length) runs.push(run)
  return runs.filter((x) => x.length >= 2)
}

/** 다각형 고리가 사각형에 닿는가 (상자로 먼저, 다음 꼭짓점·변) */
export const boxesMeet = (a, b) => a.x1 >= b.x0 && a.x0 <= b.x1 && a.y1 >= b.y0 && a.y0 <= b.y1
