// 자식 지도 원본(art/<id>.js)을 앱의 그림 파일 src/map/childmaps/<id>.ts 로 옮긴다: node scripts/childmaps/to_ts.mjs
// 지도마다 파일이 따로라 앱은 연 지도의 그림만 불러온다 (App.tsx 의 import.meta.glob).
// 원본은 앱에서 그대로 보며 고친다: pnpm dev 뒤 http://localhost:5173/?phase=1&child=<id>&childsrc=1 (원본을 바로 읽는다)
// 원본은 그리기 도구 kit.js(KIT.house·KIT.cliff…)를 쓸 수 있다 — 지침은 STYLE.md
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { LAND_CARDS } from '../../src/data/cards.ts'
import { locations } from '../../src/data/locations.ts'
import { CHILD_MAPS } from '../../src/data/childMaps.ts'
import { PHASE1_CARDS } from '../../src/data/phase1.ts'
import { PHASE2_CARDS } from '../../src/data/phase2.ts'
import { PHASE3_CARDS } from '../../src/data/phase3.ts'
import { PHASE4_CARDS } from '../../src/data/phase4.ts'
import { PHASE5_CARDS } from '../../src/data/phase5.ts'
import { detailBandOf, detailTierOf, TIER_PX_PER_UNIT } from '../../src/map/detailScale.ts'
import { pathBox } from './paths.mjs'
import { slotOf } from '../../src/data/sagas.ts'
const PHASE_CARDS = [PHASE1_CARDS, PHASE2_CARDS, PHASE3_CARDS, PHASE4_CARDS, PHASE5_CARDS]
const CARDS = PHASE_CARDS.flat()
/** 카드가 오른 사가 (sagas.ts) — 다른 사가의 그림은 함께 그려지지 않는다 */
const sagaOfCard = new Map(PHASE_CARDS.flatMap((list, i) => list.map((c) => [c.id, slotOf(i + 1)?.saga])))
const here = path.dirname(new URL(import.meta.url).pathname)
// 그림 크기 목록(생성물) — 검사만 할 때 읽지 않은 그림의 크기
const sizes = Object.fromEntries(
  [...fs.readFileSync(path.join(here, '../../src/map/childMapSizes.ts'), 'utf8').matchAll(/'([^']+)': \[(\d+(?:\.\d+)?), (\d+(?:\.\d+)?)\]/g)].map(([, id, w, h]) => [id, [Number(w), Number(h)]]),
)
// 페이즈 그림의 상자 (src/map/figures/frames.json — ZendikarMap 의 figureBox 와 같은 셈)
const frames = JSON.parse(fs.readFileSync(path.join(here, '../../src/map/figures/frames.json'), 'utf8'))
function figureBox(c) {
  const f = frames[c.id]
  if (!f) return null
  const [, vx, vy, vw, vh, ax, ay] = f
  const k = c.size / Math.max(vw, vh)
  const [l, r] = c.flip ? [vx + vw - ax, ax - vx] : [ax - vx, vx + vw - ax]
  return { x0: c.at[0] - l * k, y0: c.at[1] - (ay - vy) * k, x1: c.at[0] + r * k, y1: c.at[1] + (vy + vh - ay) * k }
}
/** 글자 폭 (em) — src/map/labels.ts 의 textWidthEm 과 같은 어림 */
function textEm(text) {
  let w = 0
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0
    if (c >= 0xac00 && c <= 0xd7a3) w += 0.98
    else if (ch === ' ') w += 0.26
    else if (/[A-Z]/.test(ch)) w += 0.66
    else if (/[il'’.,]/.test(ch)) w += 0.26
    else w += 0.47
  }
  return w
}
/** 그림 밑의 이름 자리 (지도 단위, px: 화면 px/단위) — ZendikarMap 의 figureLabelBox(아래)와 같은 셈, 글자는 13px */
function captionBox(box, name, px) {
  const font = 13
  const w = (textEm(name) * font * 1.25 + 4) / px
  const x = (box.x0 + box.x1) / 2
  return { x0: x - w / 2 - 4 / px, y0: box.y1, x1: x + w / 2 + 4 / px, y1: box.y1 + (6 + 2 * font) / px }
}
const dir = path.join(here, 'art')
// 그리기 도구(kit.js)를 먼저 실행한 같은 자리에서 원본을 실행한다
const kit = fs.readFileSync(path.join(here, 'kit.js'), 'utf8')
// --check [id …] — 원본을 검사만 하고 아무것도 쓰지 않는다 (id 를 주면 그 그림만)
const checkAt = process.argv.indexOf('--check')
const checkOnly = checkAt >= 0
const only = checkOnly ? process.argv.slice(checkAt + 1) : []
// 더 깊은 지역 상세를 검사할 때는 부모 그림도, 부모를 검사할 때는 그 더 깊은 지역 상세도 읽는다 (서로 맞는지 본다)
const parentOf = (id) => CHILD_MAPS.find((m) => m.id === id)?.parent
const nestedOf = (id) => CHILD_MAPS.filter((m) => m.parent === id).map((m) => m.id)
const load = new Set([...only, ...only.map(parentOf).filter(Boolean), ...only.flatMap(nestedOf)])
const CHILDMAPS = []
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js') && (!load.size || load.has(f.replace(/\.js$/, '')))).sort()) {
  const ctx = vm.createContext({ CHILDMAPS })
  vm.runInContext(kit, ctx)
  const before = CHILDMAPS.length
  vm.runInContext(fs.readFileSync(path.join(dir, file), 'utf8'), ctx)
  if (CHILDMAPS.length !== before + 1) throw new Error(`${file}: CHILDMAPS.push 를 꼭 한 번 해야 한다 (${CHILDMAPS.length - before}번)`)
  const id = file.replace(/\.js$/, '')
  if (CHILDMAPS.at(-1).id !== id) throw new Error(`${file}: id 가 파일 이름과 다르다`)
  if (!CHILD_MAPS.some((m) => m.id === id)) throw new Error(`${file}: childMaps.ts 의 CHILD_MAPS 에 없는 지역 상세다`)
}
// 지역 상세 목록(childMaps.ts)과 그림이 맞아야 한다 — 빠진 자리의 작은 대상은 어디에도 그려지지 않는다
for (const m of CHILD_MAPS.filter((c) => !load.size || load.has(c.id))) {
  const art = CHILDMAPS.find((a) => a.id === m.id)
  if (!art) throw new Error(`자식 지도 '${m.id}' 그림(art/${m.id}.js)이 없다`)
  const [w, h] = art.size
  const aspect = (m.bounds.x1 - m.bounds.x0) / (m.bounds.y1 - m.bounds.y0)
  if (Math.abs(w / h - aspect) > 0.01) throw new Error(`${m.id}: size ${w}×${h} 가 범위의 가로세로 비율(${aspect.toFixed(3)})과 다르다`)
  for (const c of CARDS.filter((p) => p.childMap === m.id)) {
    const s = art.subjects[c.id]
    if (!s) throw new Error(`${m.id}: '${c.id}' 의 자리(subjects)가 없다`)
    if (s.at[0] < 0 || s.at[0] > w || s.at[1] < 0 || s.at[1] > h) throw new Error(`${m.id}: '${c.id}' 의 자리가 지도 밖이다`)
  }
  for (const id of Object.keys(art.subjects)) {
    if (!CARDS.some((p) => p.id === id && p.childMap === m.id)) throw new Error(`${m.id}: subjects 의 '${id}' 는 이 자식 지도의 카드가 아니다`)
  }
  // 세계 지도는 카드의 at·size·flip 으로 그린다 — 그림의 subjects 를 세계 지도 단위로 옮긴 값과 같아야 한다 (소수 한 자리)
  const s = w / (m.bounds.x1 - m.bounds.x0)
  const r1 = (v) => Math.round(v * 10) / 10
  for (const [id, spot] of Object.entries(art.subjects)) {
    const card = CARDS.find((p) => p.id === id)
    const at = [r1(m.bounds.x0 + spot.at[0] / s), r1(m.bounds.y0 + spot.at[1] / s)]
    const size = r1(spot.size / s)
    const off = Math.abs(card.at[0] - at[0]) > 0.15 || Math.abs(card.at[1] - at[1]) > 0.15 || Math.abs(card.size - size) > 0.15 || Boolean(card.flip) !== Boolean(spot.flip)
    if (off) throw new Error(`${m.id}: '${id}' — phase1.ts~phase5.ts 를 그림에 맞춘다: at: [${at.join(', ')}], size: ${size}${spot.flip ? ', flip: true' : ' (flip 없음)'}`)
  }
  if (art.focus && (art.focus[0] < 0 || art.focus[0] > w || art.focus[1] < 0 || art.focus[1] > h)) throw new Error(`${m.id}: focus 가 지도 밖이다`)
  // 이름 쪽(markAnchors)은 범위 안의 장소·카드 표시에만
  const inside = ([x, y]) => x >= m.bounds.x0 && x <= m.bounds.x1 && y >= m.bounds.y0 && y <= m.bounds.y1
  const marks = new Set([
    ...LAND_CARDS.filter((c) => c.at && inside(c.at)).map((c) => `card:${c.id}`),
    ...locations.filter((l) => l.placement !== 'unplaced' && l.kind !== 'region' && l.kind !== 'water' && inside(l.position)).map((l) => l.id),
  ])
  for (const key of Object.keys(art.markAnchors ?? {})) if (!marks.has(key)) throw new Error(`${m.id}: markAnchors 의 '${key}' 는 이 지도 범위의 표시가 아니다`)
}
checkNesting()
/**
 * 더 깊은 지역 상세(parent 가 있는 것) — 부모 지역 상세 안에 놓이고 더 깊은 배율에서 나오며, 부모 그림은 그 범위에서 물러난다.
 * 렌더러(childDetail.ts·ChildDetailArt.tsx·ZendikarMap.tsx)가 기대하는 것을 여기서 본다. 틀리면 멈추고(오류), 그릴 때 볼 것은 알린다(경고)
 */
function checkNesting() {
  const byId = new Map(CHILD_MAPS.map((m) => [m.id, m]))
  // 장소는 지역 상세마다 하나 — App 의 detailOfPlace 가 장소로 지역 상세를 찾는다
  const places = new Map()
  for (const m of CHILD_MAPS) {
    if (places.has(m.place)) throw new Error(`${m.id}: 장소 '${m.place}' 는 지역 상세 '${places.get(m.place)}' 의 장소이기도 하다 — 장소는 지역 상세마다 하나`)
    places.set(m.place, m.id)
  }
  const sizeOf = (id) => CHILDMAPS.find((a) => a.id === id)?.size ?? sizes[id]
  const tierOf = (m) => detailTierOf(sizeOf(m.id)[0] / (m.bounds.x1 - m.bounds.x0))
  const warn = (msg) => console.warn(`경고 — ${msg}`)
  const meets = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0
  const within = (a, b) => a.x0 >= b.x0 && a.x1 <= b.x1 && a.y0 >= b.y0 && a.y1 <= b.y1
  const depthIn = (b, [x, y]) => Math.min(x - b.x0, b.x1 - x, y - b.y0, b.y1 - y)
  const GATES = ['phase', 'phase2', 'phase3', 'phase4', 'phase5']
  const gateKey = (o) => GATES.filter((k) => o[k] !== undefined).map((k) => `${k}:${Boolean(o[k])}`).join(' ')
  for (const m of CHILD_MAPS.filter((c) => c.parent && (!only.length || only.includes(c.id) || only.includes(c.parent)))) {
    // 1. 부모·사슬·범위
    const p = byId.get(m.parent)
    if (!p) throw new Error(`${m.id}: 부모 '${m.parent}' 가 CHILD_MAPS 에 없다`)
    if (p.parent) throw new Error(`${m.id}: 부모 '${p.id}' 도 부모('${p.parent}')가 있다 — 한 겹만`)
    if (CHILD_MAPS.indexOf(p) > CHILD_MAPS.indexOf(m)) throw new Error(`${m.id}: CHILD_MAPS 에서 부모 '${p.id}' 보다 앞에 있다 — 부모 뒤에 둔다`)
    if (!within(m.bounds, p.bounds)) throw new Error(`${m.id}: 범위가 부모 '${p.id}' 의 범위 밖으로 나간다`)
    // 2. 부모보다 깊은 tier
    if (!sizeOf(m.id) || !sizeOf(p.id)) throw new Error(`${m.id}: 그림 크기를 모른다 (art/${m.id}.js·art/${p.id}.js)`)
    const tier = tierOf(m)
    const ptier = tierOf(p)
    if (tier <= ptier) {
      const need = TIER_PX_PER_UNIT[ptier] / 0.6
      throw new Error(`${m.id}: tier ${tier} 가 부모 '${p.id}' 의 tier ${ptier} 보다 깊지 않다 — 그림 폭을 범위 폭의 ${need.toFixed(2)} 배보다 크게 (지금 ${(sizeOf(m.id)[0] / (m.bounds.x1 - m.bounds.x0)).toFixed(2)})`)
    }
    // 3. 같은 부모의 더 깊은 지역 상세끼리 겹치지 않는다
    for (const o of CHILD_MAPS) if (o !== m && o.parent === m.parent && meets(o.bounds, m.bounds)) throw new Error(`${m.id}: 같은 부모의 '${o.id}' 와 범위가 겹친다`)
    const art = CHILDMAPS.find((a) => a.id === m.id)
    const part = CHILDMAPS.find((a) => a.id === p.id)
    if (!art || !part) continue
    const ps = part.size[0] / (p.bounds.x1 - p.bounds.x0)
    const cs = art.size[0] / (m.bounds.x1 - m.bounds.x0)
    const band = detailBandOf(m.bounds)
    const pband = detailBandOf(p.bounds)
    // 이름이 읽히는 자리 — 이 그림의 띠 안쪽(0.75·띠), 부모의 띠에 들어간 변이면 부모의 띠 안쪽도 (부모 몫만큼 옅어진다. ZendikarMap 이 그 밖의 이름을 뺀다)
    const readable = (at) => depthIn(m.bounds, at) >= band * 0.75 && depthIn(p.bounds, at) >= pband * 0.75
    const toWorld = (pt, a, s) => [a.bounds.x0 + pt[0] / s, a.bounds.y0 + pt[1] / s]
    // 4. 이름 — 부모 이름은 앵커가 더 깊은 지역 상세 안이면 물러나므로 더 깊은 쪽이 같은 이름을 띠 안쪽(0.75·띠)에 다시 단다. 상자가 경계에 걸치면 반만 옅어진다
    const px = TIER_PX_PER_UNIT[tier]
    for (const l of part.labels) {
      const at = toWorld(l.at, p, ps)
      // 화면 글자 크기 11~34px 로 묶인 크기 (그림 단위 → 지도 단위). 가장 얕은 배율(이 tier 의 시작)에서 가장 크다
      const font = Math.min(34 / px, Math.max(11 / px, l.size / ps))
      const ls = l.kind === 'area' ? 0.12 : l.kind === 'water' ? 0.08 : 0
      const w = Math.max(textEm(l.text) + ls * [...l.text].length, l.textKo ? textEm(l.textKo) + 0.04 * [...l.textKo].length : 0) * font
      const corners = [
        [-w / 2, -0.8 * font],
        [w / 2, -0.8 * font],
        [w / 2, 0.25 * font],
        [-w / 2, 0.25 * font],
      ].map(([dx, dy]) => {
        const r = ((l.rotate ?? 0) * Math.PI) / 180
        return [at[0] + dx * Math.cos(r) - dy * Math.sin(r), at[1] + dx * Math.sin(r) + dy * Math.cos(r)]
      })
      const box = { x0: Math.min(...corners.map((c) => c[0])), y0: Math.min(...corners.map((c) => c[1])), x1: Math.max(...corners.map((c) => c[0])), y1: Math.max(...corners.map((c) => c[1])) }
      const inside = depthIn(m.bounds, at) > 0
      if (inside) {
        const again = art.labels.find((c) => c.text === l.text && (c.textKo ?? null) === (l.textKo ?? null) && readable(toWorld(c.at, m, cs)))
        if (!again) throw new Error(`${m.id}: 부모 '${p.id}' 의 이름 '${l.text}' 가 이 범위 안이라 물러난다 — 같은 text·textKo 로 경계에서 ${(band * 0.75).toFixed(1)} 단위(부모와 겹친 변은 ${(pband * 0.75).toFixed(1)} 단위) 안쪽에 다시 단다`)
      } else if (meets(box, m.bounds)) throw new Error(`${m.id}: 부모 '${p.id}' 의 이름 '${l.text}' 상자가 이 범위의 경계에 걸친다 — 부모 그림에서 이름을 옮긴다`)
    }
    for (const l of art.labels)
      if (!readable(toWorld(l.at, m, cs))) warn(`${m.id}: 이름 '${l.text}' 가 띠에 놓여 옅어지므로 지도에 나오지 않는다 — 경계에서 ${(band * 0.75).toFixed(1)} 단위(부모와 겹친 변은 ${(pband * 0.75).toFixed(1)} 단위) 안쪽으로`)
    // 5. 이름 쪽 — 표시의 이름 쪽은 그 표시를 담은 가장 깊은 지역 상세가 정한다
    const inChild = (pt) => depthIn(m.bounds, pt) > 0
    const markAt = new Map([
      ...LAND_CARDS.filter((c) => c.at).map((c) => [`card:${c.id}`, c.at]),
      ...locations.filter((l) => l.placement !== 'unplaced' && l.kind !== 'region' && l.kind !== 'water').map((l) => [l.id, l.position]),
    ])
    for (const key of Object.keys(part.markAnchors ?? {}))
      if (markAt.has(key) && inChild(markAt.get(key)) && !art.markAnchors?.[key])
        throw new Error(`${m.id}: 부모 '${p.id}' 가 이름 쪽을 정한 '${key}' 가 이 범위 안이다 — markAnchors 에 다시 적는다`)
    for (const [key, at] of markAt)
      if (depthIn(m.bounds, at) >= band && !art.markAnchors?.[key] && !part.markAnchors?.[key]) warn(`${m.id}: 표시 '${key}' 의 이름 쪽(markAnchors)이 없다 — 그림을 비켜 둘 쪽을 적는다`)
    // 6. 더 깊은 지역 상세의 대상은 부모의 대상·세계 지도 그림과 그 이름을 비킨다 (둘 다 그 위에 그대로 그려진다)
    const name = (c) => c.name
    const others = CARDS.filter((c) => c.childMap !== m.id && (c.childMap === undefined || c.childMap === p.id))
    for (const c of CARDS.filter((x) => x.childMap === m.id)) {
      const saga = sagaOfCard.get(c.id)
      const box = figureBox(c)
      if (!box) continue
      for (const o of others) {
        if (sagaOfCard.get(o.id) !== saga) continue
        const ob = figureBox(o)
        if (!ob) continue
        if (meets(box, ob)) warn(`${m.id}: '${c.id}' 그림이 ${o.childMap ? `부모의 대상` : '세계 지도 그림'} '${o.id}' 와 겹친다`)
        else if (meets(box, captionBox(ob, name(o), px))) warn(`${m.id}: '${c.id}' 그림이 '${o.id}' 의 이름 자리와 겹친다`)
      }
    }
    // 7. 페이즈로 갈린 부모 그림 부분이 범위에 닿으면, 같은 페이즈 문을 단 부분이 이 그림에도 있어야 페이즈마다 띠에서 맞는다
    const childGates = new Set(art.parts.map(gateKey).filter(Boolean))
    const missing = new Map()
    for (const pp of part.parts) {
      const key = gateKey(pp)
      if (!key || childGates.has(key)) continue
      const b = pathBox(pp.d)
      if (!Number.isFinite(b.x0)) continue
      const wb = { x0: p.bounds.x0 + b.x0 / ps, y0: p.bounds.y0 + b.y0 / ps, x1: p.bounds.x0 + b.x1 / ps, y1: p.bounds.y0 + b.y1 / ps }
      if (meets(wb, m.bounds)) missing.set(key, (missing.get(key) ?? 0) + 1)
    }
    for (const [key, n] of missing) warn(`${m.id}: 부모 '${p.id}' 의 '${key}' 부분 ${n}개가 범위에 닿는데 이 그림에는 그 페이즈 문을 단 부분이 없다`)
  }
}
if (checkOnly) {
  console.log(`검사만 했다: ${CHILDMAPS.map((m) => m.id).join(', ')}`)
  process.exit(0)
}
const num = (s) => s.replace(/-?\d*\.\d+|-?\d+/g, (n) => String(Math.round(Number(n) * 10) / 10))
const pt = (p) => `[${p.map((v) => Math.round(v * 10) / 10).join(', ')}]`
/** 페이즈 문 (src/map/childMapArt.ts 의 PhaseGate — phase·phase2·phase3 은 사가1, phase4·phase5 는 사가2 의 페이즈1·2) */
const GATES = ['phase', 'phase2', 'phase3', 'phase4', 'phase5']
const gates = (o) => GATES.filter((k) => o[k] !== undefined).map((k) => `, ${k}: ${Boolean(o[k])}`).join('')
const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`
const outDir = path.join(here, '../../src/map/childmaps')
fs.mkdirSync(outDir, { recursive: true })
for (const f of fs.readdirSync(outDir)) if (f.endsWith('.ts') && !CHILDMAPS.some((m) => `${m.id}.ts` === f)) fs.rmSync(path.join(outDir, f))
// 그림 크기 목록 — 앱은 그림을 불러오기 전에도 지역 상세가 나올 배율을 안다 (그림 크기 ÷ 범위 폭)
fs.writeFileSync(
  path.join(here, '../../src/map/childMapSizes.ts'),
  [
    '// 지역 상세 그림 크기 — 생성물. scripts/childmaps/to_ts.mjs 가 만든다.',
    'export const CHILD_MAP_SIZES: Readonly<Record<string, readonly [number, number]>> = {',
    ...CHILDMAPS.map((m) => `  ${q(m.id)}: [${m.size.join(', ')}],`),
    '}',
    '',
  ].join('\n'),
)
for (const m of CHILDMAPS) {
  const out = [
    `// 자식 지도 '${m.id}' 그림 — 생성물. scripts/childmaps/art/${m.id}.js 를 고친 뒤 \`node scripts/childmaps/to_ts.mjs\` 로 다시 만든다.`,
    "import type { ChildMapArt } from '../childMapArt'",
    '',
    'const art: ChildMapArt = {',
  ]
  out.push(`    id: ${q(m.id)},`, `    size: [${m.size.join(', ')}],`, `    glyphScale: ${m.glyphScale},`, '    terrain: [')
  for (const t of m.terrain)
    out.push(`      { kind: ${q(t.kind)}, points: [${t.points.map(pt).join(', ')}]${t.density ? `, density: ${t.density}` : ''}${gates(t)} },`)
  out.push('    ],')
  if (m.clearings?.length) {
    out.push('    clearings: [')
    for (const c of m.clearings) out.push(`      { points: [${c.points.map(pt).join(', ')}]${gates(c)} },`)
    out.push('    ],')
  }
  out.push('    parts: [')
  for (const p of m.parts) out.push(`      { cls: ${q(p.cls)}, d: ${q(num(p.d.replace(/\s+/g, ' ').trim()))}${gates(p)} },`)
  out.push('    ],', '    labels: [')
  for (const l of m.labels)
    out.push(`      { text: ${q(l.text)}${l.textKo ? `, textKo: ${q(l.textKo)}` : ''}, at: ${pt(l.at)}, size: ${l.size}, kind: ${q(l.kind)}${l.rotate ? `, rotate: ${l.rotate}` : ''} },`)
  out.push('    ],', '    subjects: {')
  for (const [id, s] of Object.entries(m.subjects)) out.push(`      ${q(id)}: { at: ${pt(s.at)}, size: ${s.size}${s.flip ? ', flip: true' : ''} },`)
  out.push('    },')
  if (m.focus) out.push(`    focus: ${pt(m.focus)},`)
  if (m.ripples === false) out.push('    ripples: false,')
  if (m.markAnchors && Object.keys(m.markAnchors).length) {
    out.push('    markAnchors: {')
    for (const [id, a] of Object.entries(m.markAnchors)) out.push(`      ${q(id)}: ${q(a)},`)
    out.push('    },')
  }
  out.push('}', '', 'export default art', '')
  fs.writeFileSync(path.join(outDir, `${m.id}.ts`), out.join('\n').replace(/^ {2}/gm, ''))
  console.log(`src/map/childmaps/${m.id}.ts`)
}
