// 자식 지도 원본(art/<id>.js)을 앱의 그림 파일 src/map/childmaps/<id>.ts 로 옮긴다: node scripts/childmaps/to_ts.mjs
// 지도마다 파일이 따로라 앱은 연 지도의 그림만 불러온다 (App.tsx 의 import.meta.glob).
// 원본은 앱에서 그대로 보며 고친다: pnpm dev 뒤 http://localhost:5173/?phase=1&child=<id>&childsrc=1 (원본을 바로 읽는다)
// 원본은 그리기 도구 kit.js(KIT.house·KIT.cliff…)를 쓸 수 있다 — 지침은 STYLE.md
// 검사(--check, 그리고 만들기 전에도 늘): 그림·대상·이름 쪽, 더 깊은 지역 상세(1–8), 세계 지도의 페이즈 바탕(src/data/periods)과의 이음(9–13 오류 —
// periods.mjs 로 읽고, 페이즈 바탕의 자체 검사와 표시 검사(check.ts 의 M1·M2)도 함께 돈다. 맞출 문과 붙여 넣을 칸은 context.mjs <id> 의 periods)
// 시점별 보기(src/data/timeline.ts, ?time=1..4): 빈터 줄 끝 주석의 카드 id 를 for 로 읽어 시점 열쇠(time)를 셈해 단다 (timekeys.mjs). 검사 14–18 과
// 카드의 time(V1–V5·V11)도 함께 — --check 면 생성물의 시점 열쇠가 지금 카드와 맞는지(낡지 않았는지)도 본다.
// 15–18(시점마다 대상 자리의 빈터·손그림 걸림)은 오류로 멈춘다 — 새로 이어 그린 시점의 자리를 아직 고르지 않은 단계에는 TIMELINE_LAYOUT=warn 으로
// 경고로만 보이고 만든다(숨기지 않는다)
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import vm from 'node:vm'
import { LAND_CARDS } from '../../src/data/cards.ts'
import { locations } from '../../src/data/locations.ts'
import { CHILD_MAPS } from '../../src/data/childMaps.ts'
import { BY_PHASE, PHASE_FILES } from '../phase-cards.mjs'
import { detailBandOf, detailTierOf, TIER_PX_PER_UNIT } from '../../src/map/detailScale.ts'
import { inkCells, parsePath, pathBox } from './paths.mjs'
import { GATES, inPhase, inView, levelOf, SAGAS, slotOf, TIME_KEYS } from '../../src/data/sagas.ts'
import { checkTimes, childMapAt, forTimeGate, leavesAt, movedAt, timeGateView, TIME_POINTS, timesOf } from '../../src/data/timeline.ts'
import { annotateClearings, deriveTimeKeys, drawsAtOf, timeKeyProblem, timelineFor } from './timekeys.mjs'
import { distanceToPolyline, pointInRing, ringBounds } from '../../src/map/geometry.ts'
import {
  LEVELS,
  PERIOD_KINDS,
  addedKind,
  boxesMeet,
  complement,
  entriesOf,
  gatesFor,
  glyphClear,
  loadMarkCheck,
  loadPeriods,
  loadTimeMarkCheck,
  partLevels,
  readLandscape,
  regionOf,
  removedKinds,
  riverClear,
} from './periods.mjs'
const PHASE_CARDS = BY_PHASE
/** 페이즈 문의 이름 (src/data/sagas.ts 의 GATES·PhaseGate — phase·phase2·phase3 은 사가1, phase4·phase5 는 사가2 의 페이즈1·2, phase6 은 사가3 의 페이즈1) */
const GATE_KEYS = GATES.map(([k]) => k)
const CARDS = PHASE_CARDS.flat()
/**
 * 카드가 그려지는 페이즈 (이어 센 번호 [처음, 끝]) — 오른 페이즈부터 그 사가의 끝까지, 그 사가 안에서 끝나는 카드(until)는 그 페이즈까지.
 * 다른 사가의 그림, 그리고 한쪽이 끝난 뒤에 오르는 그림은 함께 그려지지 않는다
 */
const liveOf = new Map(
  PHASE_CARDS.flatMap((list, i) =>
    list.map((c) => {
      const slot = slotOf(i + 1)
      return [c.id, [i + 1, levelOf(slot.saga, c.until ?? SAGAS[slot.saga - 1].phases)]]
    }),
  ),
)
const together = (a, b) => liveOf.get(a)[0] <= liveOf.get(b)[1] && liveOf.get(b)[0] <= liveOf.get(a)[1]
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
/**
 * 그림의 이름 자리 (지도 단위, px: 화면 px/단위) — 그림 밑, 또는 그 대상의 label 쪽 (아래·위는 ZendikarMap 의 figureLabelBox 에서 그 바깥 몫, 옆은 그대로). 글자는 13px
 */
function captionBox(box, name, px, side = 'below') {
  const font = 13
  const w = (textEm(name) * font * 1.25 + 4) / px
  if (side === 'right' || side === 'left') {
    const y = (box.y0 + box.y1) / 2
    const h = font / px
    return side === 'right' ? { x0: box.x1, y0: y - h, x1: box.x1 + 7 / px + w, y1: y + h } : { x0: box.x0 - 7 / px - w, y0: y - h, x1: box.x0, y1: y + h }
  }
  const x = (box.x0 + box.x1) / 2
  if (side === 'above') return { x0: x - w / 2 - 4 / px, y0: box.y0 - (6 + 2 * font) / px, x1: x + w / 2 + 4 / px, y1: box.y0 }
  return { x0: x - w / 2 - 4 / px, y0: box.y1, x1: x + w / 2 + 4 / px, y1: box.y1 + (6 + 2 * font) / px }
}
/** 대상 이름을 먼저 둘 쪽 (art 의 subjects 의 label, 카드의 label) */
const LABEL_SIDES = ['below', 'right', 'left', 'above']
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
const cardOf = new Map(CARDS.map((c) => [c.id, c]))
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js') && (!load.size || load.has(f.replace(/\.js$/, '')))).sort()) {
  const ctx = vm.createContext({ CHILDMAPS, TIMELINE: timelineFor(cardOf) })
  vm.runInContext(kit, ctx)
  const before = CHILDMAPS.length
  // 빈터 줄 끝의 카드 id 주석을 for 로 (timekeys.mjs) — 원본은 고치지 않고 실행할 글만
  vm.runInContext(annotateClearings(fs.readFileSync(path.join(dir, file), 'utf8'), (id) => cardOf.has(id)).src, ctx, { filename: path.join(dir, file) })
  if (CHILDMAPS.length !== before + 1) throw new Error(`${file}: CHILDMAPS.push 를 꼭 한 번 해야 한다 (${CHILDMAPS.length - before}번)`)
  const id = file.replace(/\.js$/, '')
  if (CHILDMAPS.at(-1).id !== id) throw new Error(`${file}: id 가 파일 이름과 다르다`)
  if (!CHILD_MAPS.some((m) => m.id === id)) throw new Error(`${file}: childMaps.ts 의 CHILD_MAPS 에 없는 지역 상세다`)
}
// 시점별 보기의 열쇠 — 빈터의 for·movedFor 와 부분·칸의 dodge 에서 시점 열쇠(time)를 셈해 달고(timekeys.mjs 의 deriveTimeKeys — 기본값과 다른 시점만), 원본이 손그림·칸·이름에
// 단 time·timeOnly 의 모양을 본다. 검사([14]–[18])와 생성물은 이 열쇠로 본다
{
  const problems = []
  for (const art of CHILDMAPS) {
    for (const p of deriveTimeKeys(art, cardOf)) problems.push(`${art.id}: ${p}`)
    for (const [what, list] of [['terrain', art.terrain], ['clearings', art.clearings ?? []], ['parts', art.parts], ['labels', art.labels]])
      for (const [i, o] of list.entries()) {
        const p = timeKeyProblem(o)
        if (p) problems.push(`${art.id}: ${what} ${i} 번 — ${p}`)
      }
  }
  if (problems.length) throw new Error(`시점별 보기의 열쇠가 어긋난다 —\n  ${problems.join('\n  ')}`)
}
// 이름 쪽(label) — 지역 상세에 사는 대상은 그 그림의 subjects 가 정하고 카드가 그와 같아야 한다(아래). 세계 지도 그림은 카드가 유일한 출처라 값만 본다
for (const c of CARDS)
  if (c.label !== undefined && !c.childMap && !LABEL_SIDES.includes(c.label))
    throw new Error(`'${c.id}': label '${c.label}' — ${LABEL_SIDES.map((a) => `'${a}'`).join(' · ')} 가운데 하나`)
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
  // 세계 지도는 카드의 at·size·flip·label 로 그리고 이름을 둔다 — 그림의 subjects 를 세계 지도 단위로 옮긴 값과 같아야 한다 (소수 한 자리)
  const s = w / (m.bounds.x1 - m.bounds.x0)
  const r1 = (v) => Math.round(v * 10) / 10
  for (const [id, spot] of Object.entries(art.subjects)) {
    const card = CARDS.find((p) => p.id === id)
    const at = [r1(m.bounds.x0 + spot.at[0] / s), r1(m.bounds.y0 + spot.at[1] / s)]
    const size = r1(spot.size / s)
    const off = Math.abs(card.at[0] - at[0]) > 0.15 || Math.abs(card.at[1] - at[1]) > 0.15 || Math.abs(card.size - size) > 0.15 || Boolean(card.flip) !== Boolean(spot.flip)
    if (off) throw new Error(`${m.id}: '${id}' — ${PHASE_FILES} 를 그림에 맞춘다: at: [${at.join(', ')}], size: ${size}${spot.flip ? ', flip: true' : ' (flip 없음)'}`)
    if (spot.label !== undefined && !LABEL_SIDES.includes(spot.label)) throw new Error(`${m.id}: '${id}' 의 label '${spot.label}' — ${LABEL_SIDES.map((a) => `'${a}'`).join(' · ')} 가운데 하나`)
    if ((card.label ?? null) !== (spot.label ?? null))
      throw new Error(`${m.id}: '${id}' — ${PHASE_FILES} 의 label 을 그림에 맞춘다: ${spot.label ? `label: '${spot.label}'` : 'label 없음'}`)
    // 시점별 보기에서 그 시점에만 옮긴 자리 — 그림의 subjects 의 moved(그림 좌표, 원본에만 — 생성물에는 싣지 않는다)를 세계 지도 단위로 옮긴 값이
    // 카드의 time.moved 와 같아야 한다 (소수 한 자리). 크기는 바꾸지 않는다
    // 다른 지역 상세·세계 지도로 옮긴 시점(time.moved 의 childMap)은 이 그림에 그리지 않으니 이 그림의 moved 에 두지 않는다
    const want = Object.fromEntries(Object.entries(card.time?.moved ?? {}).filter(([, v]) => v.childMap === undefined))
    const have = spot.moved ?? {}
    for (const t of Object.keys(have))
      if (card.time?.moved?.[t]?.childMap !== undefined)
        throw new Error(`${m.id}: '${id}' 는 시점 ${t} 에 다른 곳(${card.time.moved[t].childMap ?? '세계 지도'})에 그리는데 그림의 subjects 에 moved[${t}] 가 있다 — 지운다`)
    for (const t of new Set([...Object.keys(want), ...Object.keys(have)])) {
      const mv = have[t]
      if (!mv) throw new Error(`${m.id}: '${id}' 는 시점 ${t} 에 옮긴 자리(time.moved)가 있는데 그림의 subjects 에 moved[${t}] 가 없다 — 그림 좌표로 단다`)
      if (mv.at[0] < 0 || mv.at[0] > w || mv.at[1] < 0 || mv.at[1] > h) throw new Error(`${m.id}: '${id}' 의 시점 ${t} 자리가 지도 밖이다`)
      const mat = [r1(m.bounds.x0 + mv.at[0] / s), r1(m.bounds.y0 + mv.at[1] / s)]
      const cm = want[t]
      if (!cm || Math.abs(cm.at[0] - mat[0]) > 0.15 || Math.abs(cm.at[1] - mat[1]) > 0.15 || Boolean(cm.flip ?? card.flip) !== Boolean(mv.flip ?? spot.flip) || (cm.label ?? null) !== (mv.label ?? null))
        throw new Error(`${m.id}: '${id}' — ${PHASE_FILES} 의 time.moved[${t}] 를 그림에 맞춘다: { at: [${mat.join(', ')}]${mv.flip !== undefined ? `, flip: ${Boolean(mv.flip)}` : ''}${mv.label ? `, label: '${mv.label}'` : ''} }`)
    }
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
await checkPeriods()
await checkTimeline()
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
  // 시점 열쇠·timeOnly 도 — 띠에서 두 그림이 함께 보이니 시점별 보기에서도 같은 문이어야 한다
  const gateKey = (o) =>
    [
      ...GATE_KEYS.filter((k) => o[k] !== undefined).map((k) => `${k}:${Boolean(o[k])}`),
      ...TIME_KEYS.filter(([k]) => o.time?.[k] !== undefined).map(([k]) => `${k}:${o.time[k]}`),
      ...(o.timeOnly ? ['timeOnly'] : []),
    ].join(' ')
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
      const box = figureBox(c)
      if (!box) continue
      for (const o of others) {
        if (!together(c.id, o.id)) continue
        const ob = figureBox(o)
        if (!ob) continue
        if (meets(box, ob)) warn(`${m.id}: '${c.id}' 그림이 ${o.childMap ? `부모의 대상` : '세계 지도 그림'} '${o.id}' 와 겹친다`)
        else if (meets(box, captionBox(ob, name(o), px, o.label))) warn(`${m.id}: '${c.id}' 그림이 '${o.id}' 의 이름 자리와 겹친다`)
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
    // 8. 페이즈로 갈린 부모 빈터가 범위 안쪽에 들면, 그 자리를 옮겨 그린 빈터가 같은 페이즈 문을 달아야 페이즈마다 같은 기호가 빠진다
    //    (자리는 상자로 맞춘다 — 부모 빈터 상자의 범위 안쪽 부분과 반 넘게 겹치는 이 그림의 빈터)
    const boxOf = (pts, a, s) => {
      const xs = pts.map((q) => a.bounds.x0 + q[0] / s)
      const ys = pts.map((q) => a.bounds.y0 + q[1] / s)
      return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
    }
    const areaOf = (b) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0)
    const cut = (a, b) => ({ x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) })
    const mine = (art.clearings ?? []).map((c) => ({ box: boxOf(c.points, m, cs), key: gateKey(c) }))
    for (const pc of part.clearings ?? []) {
      const key = gateKey(pc)
      if (!key) continue
      const inside = cut(boxOf(pc.points, p, ps), m.bounds)
      if (areaOf(inside) <= 0) continue
      const near = mine.filter((c) => areaOf(cut(c.box, inside)) > 0.5 * Math.min(areaOf(c.box), areaOf(inside)))
      if (near.length && !near.some((c) => c.key === key))
        warn(`${m.id}: 부모 '${p.id}' 의 빈터('${key}', 상자 ${[inside.x0, inside.y0, inside.x1, inside.y1].map((v) => v.toFixed(1)).join(', ')})를 옮겨 그린 빈터의 페이즈 문이 다르다 ('${near.map((c) => c.key).join("' / '")}')`)
    }
  }
}
/** path 의 하위 경로 (M·m 마다) — 끝점과 조절점(지도 단위로 옮긴), 상자, 가운데, 닫혔나(Z). 호는 끝점만 */
function subpaths(d, W) {
  const out = []
  let cur = null
  let x = 0
  let y = 0
  let sx = 0
  let sy = 0
  const add = (px, py) => cur.pts.push(W([px, py]))
  for (const { c, a } of parsePath(d)) {
    const rel = c === c.toLowerCase()
    const lower = c.toLowerCase()
    const ox = rel ? x : 0
    const oy = rel ? y : 0
    if (lower === 'm') {
      x = ox + a[0]
      y = oy + a[1]
      sx = x
      sy = y
      cur = { pts: [], closed: false }
      out.push(cur)
      add(x, y)
      continue
    }
    if (!cur) {
      cur = { pts: [], closed: false }
      out.push(cur)
      add(x, y)
    }
    if (lower === 'z') {
      x = sx
      y = sy
      cur.closed = true
    } else if (lower === 'h') {
      x = ox + a[0]
      add(x, y)
    } else if (lower === 'v') {
      y = oy + a[0]
      add(x, y)
    } else if (lower === 'a') {
      x = ox + a[5]
      y = oy + a[6]
      add(x, y)
    } else {
      for (let j = 0; j < a.length; j += 2) add(ox + a[j], oy + a[j + 1])
      x = ox + a[a.length - 2]
      y = oy + a[a.length - 1]
    }
  }
  return out.map((sp) => {
    const xs = sp.pts.map((q) => q[0])
    const ys = sp.pts.map((q) => q[1])
    const box = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
    return { pts: sp.pts, closed: sp.closed, box, center: [(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2] }
  })
}
/** 사가에 매인, 장소와 하나인 대지 카드 (src/data/index.ts 의 sagaPlaceCards 와 같은 셈 — index.ts 는 Node 에서 바로 읽히지 않는다) */
function sagaPlaceCards() {
  const out = new Map()
  for (const c of LAND_CARDS) {
    if (c.saga === undefined || c.depicts.type !== 'location') continue
    const place = locations.find((l) => l.id === c.depicts.id)
    if (place && place.placement !== 'unplaced' && [place.name, ...(place.aliases ?? [])].includes(c.name)) out.set(place.id, c)
  }
  return out
}
/**
 * 세계 지도의 페이즈 바탕(src/data/periods)과 지역 상세가 맞는지 — 모두 오류다 (9–12 는 지역 상세 22곳을 맞춘 뒤 경고에서 올렸다. 한꺼번에 모아 알리고 멈춘다).
 * 9 칠: 그 단계에 마른 바닥 안에 그려지는 sea·sea-ink 부분, 흰 먼지·죽은 숲 안에 그려지는 forest 부분.
 *   떨어지는 물줄기(세로로 긴 열린 하위 경로 — 높이가 폭의 FALL_RATIO 배, FALL_MIN 단위 넘게)는 공중의 물이라 보지 않는다. 물이 닿는 자리의 물받이·잔물결은 그대로 본다
 * 10 기호: 범위(띠와 안쪽)의 표본 점마다, 그 단계에 지울 칸이 남거나 더할 칸이 없거나 다른 단계에도 그 칸이 나오는지 (빈터는 일부러 비운 자리로 본다)
 * 11 다시 그리기·숨김: 범위를 지나는 그 무렵의 강·폭포 둘레에 같은 단계의 부분이 없거나, 숨는 선을 따라 그린 부분이 숨는 단계에도 그려지는지.
 *   '따라 그린' 부분은 선 길 안(폭/2 + 1)에 놓인 하위 경로가 있거나, 선 둘레(폭/2 + 4)에 놓인 하위 경로들이 선을 따라 ALONG_MIN(둘레 폭의 두 배, 범위 안 선
 *   길이의 절반이 더 짧으면 그것) 넘게 이어진 것 — 선 둘레의 작은 반짝임·돌 하나처럼 선 밖 땅의 그림은 세지 않는다
 * 12 표시: 범위 안 표시가 바뀌는 단계에 맞춘 문 단 부분이 둘레에 없는지
 * 13 새 칸 종류(dust·chalk·drybed·deadwood)는 끔(0)에 그려지면 안 된다 — 기호는 페이즈 조각이 늦게 준다
 */
/** 떨어지는 물줄기 — 열린 하위 경로가 높이 FALL_MIN 단위 넘게, 폭의 FALL_RATIO 배 넘게 세로로 길다 (함수 선언 — 위의 checkPeriods 가 먼저 불린다) */
function isFalling(sp) {
  const FALL_MIN = 2
  const FALL_RATIO = 4
  const h = sp.box.y1 - sp.box.y0
  return !sp.closed && h >= FALL_MIN && h >= FALL_RATIO * (sp.box.x1 - sp.box.x0)
}
/** 꺾은선 위 가장 가까운 자리의 길이 (처음부터) */
function alongAt(line, [x, y]) {
  let best = Infinity
  let at = 0
  let acc = 0
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = line[i - 1]
    const [bx, by] = line[i]
    const ex = bx - ax
    const ey = by - ay
    const len = Math.hypot(ex, ey)
    const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / (len * len)))
    const d = Math.hypot(x - (ax + t * ex), y - (ay + t * ey))
    if (d < best) {
      best = d
      at = acc + t * len
    }
    acc += len
  }
  return at
}
/** 꺾은선이 상자 안을 지나는 길이 (0.5 단위마다 찍어 센다) */
function lengthIn(line, b) {
  let n = 0
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = line[i - 1]
    const [bx, by] = line[i]
    const k = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.5))
    for (let j = 0; j < k; j++) {
      const x = ax + ((bx - ax) * (j + 0.5)) / k
      const y = ay + ((by - ay) * (j + 0.5)) / k
      if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) n += Math.hypot(bx - ax, by - ay) / k
    }
  }
  return n
}
async function checkPeriods() {
  const { set, dir } = await loadPeriods()
  const markCheck = await loadMarkCheck(dir)
  if (markCheck) {
    markCheck({
      phaseCards: CARDS,
      phaseOf: new Map(PHASE_CARDS.flatMap((list, i) => list.map((c) => [c.id, i + 1]))),
      // 그 사가 안에서 끝나는 카드(until)만 — phase.ts 의 PhaseData.lastOf 와 같다
      lastOf: new Map(PHASE_CARDS.flatMap((list) => list.filter((c) => c.until !== undefined).map((c) => [c.id, liveOf.get(c.id)[1]]))),
      landCards: LAND_CARDS,
      landPhase: (c) => (c.saga === undefined ? undefined : levelOf(c.saga, c.sagaPhase ?? 1)),
      sagaPlaceCards: sagaPlaceCards(),
      periods: set,
    })
  }
  // 시점별 보기의 시점판 (V6) — 그 시점의 바탕 단계에서 숨긴 장소를 가리키는 카드, 장소와 하나인 사가 카드의 표시 종류
  const timeMarkCheck = await loadTimeMarkCheck(dir)
  if (timeMarkCheck) timeMarkCheck({ phaseCards: CARDS, landCards: LAND_CARDS, sagaPlaceCards: sagaPlaceCards(), periods: set })
  const landscape = await readLandscape()
  const entries = entriesOf(set)
  const areas = entries.filter((e) => e.cat === 'ground' || e.cat === 'relief' || e.cat === 'drain').map((e) => ({ ...e, region: regionOf(e.cat, e.item, landscape) }))
  const list = (levels) => levels.join('·')
  const json = (g) => JSON.stringify(g)
  // 9–12 — 모두 모아 알린 뒤 멈춘다 (오류)
  const problems = []
  const warn = (msg) => problems.push(msg)
  const depthIn = (b, [x, y]) => Math.min(x - b.x0, b.x1 - x, y - b.y0, b.y1 - y)
  const inBox = (b, [x, y]) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1
  const pad = (b, r) => ({ x0: b.x0 - r, y0: b.y0 - r, x1: b.x1 + r, y1: b.y1 + r })
  const sub = (a, b) => a.every((l) => b.includes(l))
  const same = (a, b) => sub(a, b) && sub(b, a)
  const more = (arr, n = 8) => `${arr.slice(0, n).join(', ')}${arr.length > n ? ` 외 ${arr.length - n}개` : ''}`
  for (const m of CHILD_MAPS.filter((c) => !only.length || only.includes(c.id))) {
    const art = CHILDMAPS.find((a) => a.id === m.id)
    if (!art) continue
    // 13 — 새 칸 종류는 끔(0)에 그려지지 않는 문이 있어야 한다 (끔 지도를 지킨다. 기호도 페이즈 조각에만 있다)
    art.terrain.forEach((t, index) => {
      if (PERIOD_KINDS.includes(t.kind) && partLevels(t).includes(0))
        throw new Error(`${m.id}: terrain ${index} 번(${t.kind})은 페이즈 바탕을 옮겨 그리는 칸이라 끔(0)에 그려지면 안 된다 — 페이즈 문을 단다 (지금 단계 ${list(partLevels(t))}, context.mjs ${m.id} 의 periods.terrain 의 gates)`)
    })
    const s = art.size[0] / (m.bounds.x1 - m.bounds.x0)
    const W = ([x, y]) => [m.bounds.x0 + x / s, m.bounds.y0 + y / s]
    const poly = (o, index) => {
      const ring = o.points.map(W)
      return { index, kind: o.kind, levels: partLevels(o), gated: GATE_KEYS.some((k) => o[k] !== undefined), ring, bounds: ringBounds(ring) }
    }
    const cells = art.terrain.filter((t) => t.points.length >= 3).map((t) => poly(t, art.terrain.indexOf(t)))
    const clearings = (art.clearings ?? []).filter((c) => c.points.length >= 3).map(poly)
    const covers = (list, p) => list.filter((c) => inBox(c.bounds, p) && pointInRing(p[0], p[1], c.ring))
    let partsCache = null
    const parts = () =>
      (partsCache ??= art.parts.map((pp, index) => ({ index, cls: pp.cls, levels: partLevels(pp), gated: GATE_KEYS.some((k) => pp[k] !== undefined), subs: subpaths(pp.d, W) })))
    const band = detailBandOf(m.bounds)
    const zone = (p) => (depthIn(m.bounds, p) < band ? '띠' : '안쪽')
    // 부모면 더 깊은 지역 상세가 다 맡은 자리(그 띠 안쪽)는 그쪽 몫이다
    const nested = CHILD_MAPS.filter((c) => c.parent === m.id).map((c) => ({ b: c.bounds, band: detailBandOf(c.bounds) }))
    const yielded = (p) => nested.some((n) => depthIn(n.b, p) >= n.band)

    for (const a of areas) {
      const { cat, item, region } = a
      if (!boxesMeet(region.bounds, m.bounds)) continue
      const what = `${item.id}' (${cat === 'drain' ? '마른 바닥' : item.kind}, 단계 ${list(item.levels)})`
      // 9 — 칠 (앱이 그 단계에 그리는 칠 위에 그림 부분이 그려지면 칠이 가린다)
      const paintCls = cat === 'drain' ? ['sea', 'sea-ink'] : cat === 'ground' && item.kind !== 'chalk' ? ['forest'] : null
      if (paintCls) {
        const hits = []
        for (const p of parts()) {
          if (!paintCls.includes(p.cls) || !p.levels.some((l) => item.levels.includes(l))) continue
          // 마른 바닥 위 공중에서 떨어지는 물줄기는 물 그림이 아니다 (떠 있는 바위·절벽의 폭포) — 바닥에 닿는 자리의 그림은 따로 본다
          const n = p.subs.filter((sp) => inBox(m.bounds, sp.center) && region.inside(sp.center[0], sp.center[1]) && !(cat === 'drain' && isFalling(sp))).length
          if (n) hits.push(`#${p.index} ${p.cls}(하위 경로 ${n}/${p.subs.length}, 단계 ${list(p.levels.filter((l) => item.levels.includes(l)))})`)
        }
        if (hits.length)
          warn(`[9] ${m.id}: '${what} 안에 그 단계에도 그려지는 부분이 있다 — ${more(hits)} → 그 부분(고리 안쪽 조각)에 ${gatesFor(complement(item.levels)).map(json).join(' 또는 ')} 를 단다 (context.mjs ${m.id} 의 periods.paint)`)
      }
      // 10 — 기호 (표본 점마다 단계별로)
      const added = addedKind(cat, item)
      const removed = removedKinds(cat, item)
      const others = areas.filter((o) => o !== a && addedKind(o.cat, o.item) === added)
      // 다른 단계에 나오는 칸은 새 칸 종류만 본다 — 언덕·늪·수정은 바탕 칸(페이즈 그림 때문에 문을 단 것도)과 가를 수 없다
      const periodKind = PERIOD_KINDS.includes(added)
      const width = Math.min(...region.shapes.filter((x) => x.width).map((x) => x.width), Infinity)
      const step = Math.min(Math.min(m.bounds.x1 - m.bounds.x0, m.bounds.y1 - m.bounds.y0) / 60, width / 3)
      // 가장자리 한 칸은 보지 않는다 — context.mjs 가 붙여 넣을 칸을 이 폭의 격자로 따라 그렸고(periods.mjs 의 traceRegion), 작가가 고리로 자른 경계도 그만큼 어긋날 수 있다
      const edge = Math.min(Math.min(m.bounds.x1 - m.bounds.x0, m.bounds.y1 - m.bounds.y0) / 120, width / 3)
      const onEdge = (x, y) => !(region.inside(x - edge, y) && region.inside(x + edge, y) && region.inside(x, y - edge) && region.inside(x, y + edge))
      const box = { x0: Math.max(m.bounds.x0, region.bounds.x0), y0: Math.max(m.bounds.y0, region.bounds.y0), x1: Math.min(m.bounds.x1, region.bounds.x1), y1: Math.min(m.bounds.y1, region.bounds.y1) }
      const tally = { left: new Map(), missing: new Map(), extra: new Map() }
      const kindsLeft = new Set()
      let samples = 0
      const note = (what, z, l) => {
        const t = tally[what].get(z) ?? { n: 0, levels: new Set() }
        t.n++
        t.levels.add(l)
        tally[what].set(z, t)
      }
      for (let y = box.y0 + step / 2; y < box.y1; y += step) {
        for (let x = box.x0 + step / 2; x < box.x1; x += step) {
          const p = [x, y]
          if (!region.inside(x, y) || yielded(p)) continue
          samples++
          if (onEdge(x, y)) continue
          const z = zone(p)
          const C = covers(cells, p)
          const K = covers(clearings, p)
          // 죽은 숲은 살아 있던 나무(숲·맹그로브 칸)가 있던 자리에만
          const need = added && (added !== 'deadwood' || C.some((c) => (c.kind === 'forest' || c.kind === 'mangrove') && c.levels.some((l) => !item.levels.includes(l))))
          const flagged = new Set()
          for (const l of LEVELS) {
            if (K.some((k) => k.levels.includes(l))) continue
            const act = C.filter((c) => c.levels.includes(l))
            if (item.levels.includes(l)) {
              const left = act.filter((c) => removed.includes(c.kind) && !(c.kind === added && sub(c.levels, item.levels)))
              if (left.length) {
                if (!flagged.has('left')) note('left', z, l)
                flagged.add('left')
                for (const c of left) kindsLeft.add(c.kind)
                tally.left.get(z).levels.add(l)
              }
              if (need && !act.some((c) => c.kind === added)) {
                if (!flagged.has('missing')) note('missing', z, l)
                flagged.add('missing')
                tally.missing.get(z).levels.add(l)
              }
            } else if (periodKind && act.some((c) => c.kind === added) && !others.some((o) => o.item.levels.includes(l) && o.region.inside(x, y))) {
              if (!flagged.has('extra')) note('extra', z, l)
              flagged.add('extra')
              tally.extra.get(z).levels.add(l)
            }
          }
        }
      }
      const say = (t) =>
        [...t]
          .map(([z, v]) => `${z} ${v.n}점`)
          .join('·') + ` (단계 ${list([...new Set([...t.values()].flatMap((v) => [...v.levels]))].sort((p, q) => p - q))})`
      const problems = []
      if (tally.left.size) problems.push(`그 단계에 지울 칸(${[...kindsLeft].join('·')})이 남는다: ${say(tally.left)}`)
      if (tally.missing.size) problems.push(`그 단계의 ${added} 칸이 없다: ${say(tally.missing)}`)
      if (tally.extra.size) problems.push(`다른 단계에도 ${added} 칸이 나온다: ${say(tally.extra)}`)
      if (problems.length)
        warn(
          `[10] ${m.id}: '${what} 표본 ${samples}점 — ${problems.join(' / ')} → ${removed.length ? `${removed.join('·')} 칸을 고리로 잘라 안쪽 조각에 ${gatesFor(complement(item.levels)).map(json).join(' 또는 ')}, ` : ''}새 ${added} 칸을 ${gatesFor(item.levels).map(json).join(' 또는 ')} 로 terrain 끝에 (context.mjs ${m.id} 의 periods.terrain 의 suggest)`,
        )
    }

    // 11 — 그 무렵의 강·폭포는 같은 단계의 부분으로 다시 그리고, 숨는 선을 따라 그린 부분은 그 단계에 그리지 않는다
    const redraw = (item, nearFn, kindName) => {
      const near = parts().filter((p) => p.gated && p.levels.length && sub(p.levels, item.levels) && p.subs.some((sp) => sp.pts.some((q) => inBox(m.bounds, q) && nearFn(q))))
      const got = [...new Set(near.flatMap((p) => p.levels))]
      if (!same(got, item.levels)) {
        const miss = item.levels.filter((l) => !got.includes(l))
        warn(`[11] ${m.id}: ${kindName} '${item.id}' (단계 ${list(item.levels)})이 범위 안인데 둘레에 그 단계에만 그리는 부분이 없다 (빠진 단계 ${list(miss)}) — ${gatesFor(item.levels).map(json).join(' 또는 ')} 로 다시 그린다 (context.mjs ${m.id} 의 periods.redraw)`)
      }
    }
    for (const r of set.rivers) {
      const rad = riverClear(r)
      const passes = (q) => distanceToPolyline(q[0], q[1], r.course) <= rad
      if (!boxesMeet(ringBounds(r.course), m.bounds)) continue
      // 범위 안을 지나는가 — 물길을 1 단위마다 찍어 본다 (범위 밖 강은 세계 지도가 그대로 그린다)
      let inside = false
      for (let i = 1; i < r.course.length && !inside; i++) {
        const [ax, ay] = r.course[i - 1]
        const [bx, by] = r.course[i]
        const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)))
        for (let k = 0; k <= n && !inside; k++) inside = inBox(m.bounds, [ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n])
      }
      if (inside) redraw(r, passes, r.dry ? '마른 강바닥' : '강')
    }
    for (const g of set.glyphs) {
      const rad = glyphClear(g)
      // 기호의 자리가 범위 안일 때만 (밖이면 세계 지도가 그대로 그린다)
      if (!inBox(m.bounds, g.at)) continue
      redraw(g, (q) => Math.hypot(q[0] - g.at[0], q[1] - g.at[1]) <= rad, g.kind === 'waterfall' ? '폭포' : '한 점 기호')
    }
    const hiddenLines = new Map()
    for (const h of set.hides) hiddenLines.set(h.line, [...new Set([...(hiddenLines.get(h.line) ?? []), ...h.levels])].sort((p, q) => p - q))
    for (const [lineId, hidden] of hiddenLines) {
      const line = landscape.lines.find((l) => l.id === lineId)
      if (!line) continue
      const r = (line.width ?? 2) / 2 + 4
      if (!boxesMeet(pad(ringBounds(line.line), r), m.bounds)) continue
      // 선을 따라 그린 부분 — 하위 경로 꼭짓점의 6할 넘게가 선 둘레에 들고, 선 길 안(폭/2 + 1)에 놓였거나 그런 하위 경로들이 선을 따라 길게 이어진다
      const corridor = (line.width ?? 2) / 2 + 1
      const alongMin = Math.min(2 * r, 0.5 * lengthIn(line.line, pad(m.bounds, r)))
      const nearLine = (sp) => sp.pts.length >= 2 && inBox(pad(m.bounds, r), sp.center) && sp.pts.filter((q) => distanceToPolyline(q[0], q[1], line.line) <= r).length >= 0.6 * sp.pts.length
      const follows = (p) => {
        const subs = p.subs.filter(nearLine)
        if (!subs.length) return false
        if (subs.some((sp) => distanceToPolyline(sp.center[0], sp.center[1], line.line) <= corridor)) return true
        const at = subs.flatMap((sp) => sp.pts.map((q) => alongAt(line.line, q)))
        return Math.max(...at) - Math.min(...at) >= alongMin
      }
      const along = parts().filter((p) => p.levels.some((l) => hidden.includes(l)) && follows(p))
      if (along.length)
        warn(`[11] ${m.id}: 숨는 선 '${lineId}' (단계 ${list(hidden)}에 없다)을 따라 그린 부분이 그 단계에도 그려진다 — ${more(along.map((p) => `#${p.index} ${p.cls}(단계 ${list(p.levels.filter((l) => hidden.includes(l)))})`))} → ${gatesFor(complement(hidden)).map(json).join(' 와 ')} 로 나눠 단다 (context.mjs ${m.id} 의 periods.hidden)`)
    }

    // 12 — 표시가 바뀌는 단계에 맞춘 문 단 부분 (폐허 그림, 또는 그 단계에 그리지 않는 원래 모습)
    const R = 5
    for (const mk of set.marks) {
      const l = locations.find((x) => x.id === mk.place)
      if (!l || l.placement === 'unplaced' || !l.position || !inBox(m.bounds, l.position)) continue
      const around = pad({ x0: l.position[0], y0: l.position[1], x1: l.position[0], y1: l.position[1] }, R)
      const fit = parts().some((p) => p.gated && p.subs.some((sp) => boxesMeet(sp.box, around)) && (!p.levels.some((x) => mk.levels.includes(x)) || sub(p.levels, mk.levels)))
      if (!fit)
        warn(`[12] ${m.id}: 표시 '${mk.place}' 가 단계 ${list(mk.levels)}에서 ${mk.kind === null ? '숨는다(그 무렵 없던 곳)' : `${mk.kind} 로 바뀐다`} — 둘레(${R} 단위)에 그 단계에 맞춘 문 단 부분이 없다 → 원래 모습은 ${gatesFor(complement(mk.levels)).map(json).join(' 또는 ')}${mk.kind ? `, 폐허 그림은 ${gatesFor(mk.levels).map(json).join(' 또는 ')}` : ''} (context.mjs ${m.id} 의 periods.marks)`)
    }
  }
  if (problems.length) {
    for (const msg of problems) console.error(`오류 — ${msg}`)
    throw new Error(`페이즈 바탕과 지역 상세가 어긋난다 — 위 ${problems.length}개 (9–12). 그 지역 상세를 context.mjs <id> 의 periods 대로 맞춘다`)
  }
}
/**
 * 시점별 보기(src/data/timeline.ts) — 함수 선언이라 위에서 먼저 부른다. 시점의 문은 sagas.ts 의 inView 와 같은 셈이다: 부분·빈터의 time 열쇠(t1… — sagas.ts 의 TIME_KEYS)가 있으면
 * 그 값, 없으면 timeOnly 가 아닐 때 inPhase(문, 그 시점의 바탕 단계). 사가 보기는 이 셈을 쓰지 않는다
 * - V1–V5: 카드의 time (timeline.ts 의 timeProblems)
 * - [14] (V10) 빈터의 시점 열쇠 — for(그 빈터가 자리를 비운 카드 id, 원본의 끝 주석에서)의 카드는 이 지역 상세나 그 부모·더 깊은 지역 상세의 대상,
 *   또는 세계 지도 그림이어야 한다. 시점 열쇠는 for 에서 셈하므로(timeline.ts 의 forTimeGate) 원본에 쓰지 않는다. --check 면 생성물(src/map/childmaps/<id>.ts)의
 *   빈터마다 for·time 이 원본과 카드에서 지금 셈한 것과 같은지 본다 — 카드의 time 을 고치고 다시 만들지 않으면 낡은 열쇠로 멈춘다.
 *   for 가 없는 빈터는 시점별 보기만의 빈터(timeOnly)일 때만 원본이 쓴 time 을 갖는다 (사가 보기의 빈터를 시점에 따라 나눈 몫 — tangled-vales 의 이름 자리).
 *   켜진 빈터는 그 시점에 앱이 그 자리에 그리는 for 의 카드(shownAtTimeOf)가 하나는 있어야 한다
 * 앱은 시점마다 그 시점의 카드를 모두 그린다 — 지역 상세 그림은 시점마다 그리는 대상의 자리를 비우고, 그리지 않는 대상의 자리는 메운다:
 * - [15] 그 시점에 그 자리에 그리는 대상 — 그 대상에 매였거나(for) 매이지 않은 빈터가 그 자리에 있는데 그 시점에 하나도 켜지지 않는다
 *   (사가 보기도 그 시점의 바탕 단계에 그 대상을 그리며 그 빈터를 켜지 않으면 — 그 단계에 비울 기호가 없다 — 넘어간다). 옮긴 자리는 movedFor 빈터가
 *   지역 상세가 나오는 배율의 이름 자리까지 덮고, 그림과 이름이 범위 안이어야 한다
 * - [16] 그 시점에 켜진 손그림의 잉크(4 단위 칸)가 대상 상자를, 사가 보기가 그 대상을 그리는 단계(그 시점의 바탕 단계, 아니면 가장 가까운 것)보다
 *   4% 넘게 더 덮는다 — 대상을 비킨 손그림은 KIT.dodge (옮긴 자리는 KIT.dodgeMoved, 그 시점에 그 상자에 걸린 작은 부분이면 오류 — 사가 보기에서
 *   제자리 상자에도 걸리는 부분(그 대상이 딛고 선 얕은 물 같은 바탕)은 넘어간다)
 * - [17] 그 시점에 켜진 지형 칸(빈터 밖)이 대상 자리를 사가 보기보다 15% 넘게 더 덮는다 — 그림 자리를 구멍으로 판 칸의 짝(구멍 없는 칸)은
 *   시점별 보기에서 늘 쓰고, 그 자리는 그 카드에 매인 시점별 보기만의 빈터(KIT.timeClear)가 연다
 * - [18] 그 시점에 그리지 않는 대상(사가 보기는 그 시점의 바탕 단계에 그린다 — 장면)의 자리 지형 기호가 끔(단계 0)보다 25% 넘게 비었다
 *   (그 시점에 그리는 다른 대상의 상자·빈터는 뺀다)
 * 그 단계에 사가 보기도 그 대상을 그리고 둘레에 시점 열쇠가 없으면 사가 보기와 같은 모습이라 [15]–[17] 은 보지 않는다
 */
async function checkTimeline() {
  checkTimes(CARDS, true)
  // 시점 t 에 그리는가 — sagas.ts 의 inView 그대로
  const atTime = (o, t) => inView(o, timeGateView(t))
  const area = (b) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0)
  const inter = (a, b) => area({ x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) })
  const polyBox = (pts) => ({ x0: Math.min(...pts.map((q) => q[0])), y0: Math.min(...pts.map((q) => q[1])), x1: Math.max(...pts.map((q) => q[0])), y1: Math.max(...pts.map((q) => q[1])) })
  /** 사가 보기가 그 카드를 그리는 단계 (이어 센 번호) */
  const sagaLevelsOf = (id) => {
    const [a, b] = liveOf.get(id)
    return Array.from({ length: b - a + 1 }, (_, i) => a + i)
  }
  // 앱이 그 시점에 그 카드를 그리는가 (timeline.ts 의 shownAtTimeOf)
  const drawsAt = drawsAtOf(cardOf)
  const errors = []
  for (const m of CHILD_MAPS.filter((c) => !only.length || only.includes(c.id))) {
    const art = CHILDMAPS.find((a) => a.id === m.id)
    if (!art) continue
    // [14] — 빈터의 시점 열쇠
    const kin = new Set([m.id, m.parent, ...CHILD_MAPS.filter((c) => c.parent === m.id).map((c) => c.id)].filter(Boolean))
    for (const [i, c] of (art.clearings ?? []).entries()) {
      if (c.for === undefined) {
        // 매지 않은 빈터의 시점 열쇠는 시점별 보기만의 빈터(timeOnly — 사가 보기의 빈터를 시점에 따라 나눈 몫, 이름 자리 …)에만 원본이 쓴다
        if (c.time && !c.timeOnly) errors.push(`[14] ${m.id}: clearings ${i} 번에 time 열쇠가 있는데 for(자리를 비운 카드)가 없다 — 빈터의 열쇠는 for 에서 셈한다 (줄 끝 주석을 카드 id 로). 시점별 보기만의 빈터면 timeOnly: true 를 단다`)
        continue
      }
      for (const id of c.for) {
        const card = cardOf.get(id)
        if (card?.childMap && !kin.has(card.childMap)) errors.push(`[14] ${m.id}: clearings ${i} 번의 for '${id}' 는 지역 상세 '${card.childMap}' 의 대상이다 — 이 그림·부모·더 깊은 지역 상세의 대상이나 세계 지도 그림만`)
      }
      // 켜진 빈터에는 앱이 그 시점에 그 자리에 그리는 카드가 하나는 있어야 한다 — 없으면 지형에 빈 구멍만 남는다 (곁의 상징은 그 그림도 그릴 때만)
      if (c.for.every((id) => cardOf.has(id)))
        for (const t of TIME_POINTS.filter((x) => atTime(c, x))) {
          const cards = c.for.map((id) => cardOf.get(id))
          if (!cards.some((card) => drawsAt(card, t) && !movedAt(card, t)))
            errors.push(`[14] ${m.id}: clearings ${i} 번(for ${c.for.join('·')})이 시점 ${t} 에 켜지는데 앱이 그 시점에 그 자리에 그리는 카드가 없다 — 빈 구멍 (forTimeGate 와 앱의 셈이 어긋난다)`)
        }
    }
    if (checkOnly) {
      const file = path.join(here, '../../src/map/childmaps', `${m.id}.ts`)
      const built = fs.existsSync(file) ? (await import(pathToFileURL(file).href)).default : null
      const show = (o) => (o ? JSON.stringify(o) : '없음')
      if (!built) errors.push(`[14] ${m.id}: 생성물 src/map/childmaps/${m.id}.ts 가 없다 — node scripts/childmaps/to_ts.mjs`)
      else if ((built.clearings ?? []).length !== (art.clearings ?? []).length)
        errors.push(`[14] ${m.id}: 생성물의 빈터 ${(built.clearings ?? []).length}개가 원본의 ${(art.clearings ?? []).length}개와 다르다 — 다시 만든다`)
      else
        for (const [i, c] of (built.clearings ?? []).entries()) {
          const src = art.clearings[i]
          if (show(c.for) !== show(src.for)) errors.push(`[14] ${m.id}: 생성물 clearings ${i} 번의 for ${show(c.for)} 가 원본(${show(src.for)})과 다르다 — 다시 만든다`)
          const want = c.for?.every((id) => cardOf.has(id)) ? forTimeGate(c, c.for.map((id) => cardOf.get(id)), drawsAt) : c.for === undefined && src.timeOnly ? src.time : undefined
          if (show(c.time) !== show(want)) errors.push(`[14] ${m.id}: 생성물 clearings ${i} 번(for ${c.for?.join('·') ?? '없음'})의 시점 열쇠 ${show(c.time)} 가 낡았다 — 지금 카드로는 ${show(want)} (다시 만든다)`)
        }
      // 손그림·칸·이름의 시점 열쇠 — 원본이 카드에서 셈한 것(KIT.dodge·bySubjects·withSubject)도 카드가 바뀌면 낡는다
      if (built)
        for (const what of ['terrain', 'parts', 'labels']) {
          const a = built[what] ?? []
          const b = art[what] ?? []
          if (a.length !== b.length) {
            errors.push(`[14] ${m.id}: 생성물의 ${what} ${a.length}개가 원본의 ${b.length}개와 다르다 — 다시 만든다`)
            continue
          }
          const bad = a.findIndex((o, i) => show(o.time) !== show(b[i].time) || Boolean(o.timeOnly) !== Boolean(b[i].timeOnly))
          if (bad >= 0) errors.push(`[14] ${m.id}: 생성물 ${what} ${bad} 번의 시점 열쇠 ${show(a[bad].time)} 가 낡았다 — 지금 카드로는 ${show(b[bad].time)} (다시 만든다)`)
        }
    }
    // [15]–[18] — 시점마다 그리는 대상과 그리지 않는 대상의 자리
    const parts = art.parts.map((p) => ({ p, box: pathBox(p.d) })).filter(({ box }) => Number.isFinite(box.x0))
    const fields = art.terrain.filter((f) => f.points.length >= 3).map((f) => ({ f, box: polyBox(f.points) }))
    const clears = (art.clearings ?? []).filter((c) => c.points.length >= 3).map((c) => ({ c, box: polyBox(c.points) }))
    // 그림 단위 ÷ 지도 단위, 가장자리 띠의 폭 (그림 단위) — 옮긴 자리의 이름·띠 검사([15])
    const perUnit = art.size[0] / (m.bounds.x1 - m.bounds.x0)
    const band = detailBandOf(m.bounds) * perUnit
    /** 상자(지형 기호가 위로 솟으니 밑으로 1/4 늘린다)의 표본 가운데 지형 기호의 밑점이 놓일 수 있는 몫 — 켜진 지형 칸 안이고 켜진 빈터 밖 */
    // keep(c): 이 빈터 안은 기호가 빠져도 이 대상 탓이 아니다 (그 시점에 그리는 다른 대상의 빈터 — [18])
    const exposure = (box, on, keep = () => false) => {
      const sb = { ...box, y1: box.y1 + (box.y1 - box.y0) * 0.25 }
      const fs_ = fields.filter(({ f, box: b }) => on(f) && inter(b, sb) > 0)
      if (!fs_.length) return 0
      const cs = clears.filter(({ c, box: b }) => on(c) && inter(b, sb) > 0)
      let n = 0
      let hit = 0
      for (let i = 0; i < 8; i++)
        for (let j = 0; j < 8; j++) {
          const x = sb.x0 + ((i + 0.5) / 8) * (sb.x1 - sb.x0)
          const y = sb.y0 + ((j + 0.5) / 8) * (sb.y1 - sb.y0)
          n++
          if (!fs_.some(({ f }) => pointInRing(x, y, f.points))) continue
          const inside = cs.filter(({ c }) => pointInRing(x, y, c.points))
          if (!inside.length || inside.some(({ c }) => keep(c))) hit++
        }
      return hit / n
    }
    const boxOf = (spot, f, at = spot.at, flip = spot.flip) => {
      const [, vx, vy, vw, vh, ax, ay] = f
      const k = spot.size / Math.max(vw, vh)
      const [l, r] = flip ? [vx + vw - ax, ax - vx] : [ax - vx, vx + vw - ax]
      return { x0: at[0] - l * k, y0: at[1] - (ay - vy) * k, x1: at[0] + r * k, y1: at[1] + (vy + vh - ay) * k }
    }
    // 그 시점에 이 그림이 그리는 대상의 상자 (옮긴 자리면 그 자리) — [18] 이 다른 대상의 자리를 빈 자리로 보지 않게
    // 다른 지역 상세의 카드가 그 시점에 이 그림으로 옮겨 오는 자리(time.moved 의 childMap 이 이 그림 — 세계 지도 단위를 그림 좌표로)
    const toArt = (p) => [(p[0] - m.bounds.x0) * perUnit, (p[1] - m.bounds.y0) * perUnit]
    const visitors = (t) =>
      CARDS.filter((c) => c.childMap !== m.id && timesOf(c).includes(t) && childMapAt(c, t) === m.id && drawsAt(c, t) && frames[c.id]).map((c) => {
        const mv = movedAt(c, t)
        return { card: c, spot: { at: toArt(mv.at), size: c.size * perUnit, flip: mv.flip ?? c.flip, label: mv.label ?? c.label } }
      })
    const drawnBoxes = (t) => [
      ...Object.entries(art.subjects).flatMap(([id, spot]) => {
        const card = cardOf.get(id)
        const f = frames[id]
        if (!card || !f || !drawsAt(card, t) || leavesAt(card, t)) return []
        const mv = movedAt(card, t) ? spot.moved?.[t] : undefined
        return [boxOf(spot, f, mv?.at ?? spot.at, mv?.flip ?? spot.flip)]
      }),
      ...visitors(t).map(({ card, spot }) => boxOf(spot, frames[card.id])),
    ]
    // 옮긴 자리 하나 — 그 시점에 켜진 빈터가 그 자리를 덮고([15]), 켜진 손그림 부분이 걸리지 않고([16]), 이름 자리까지 빈터와 범위 안에 든다([15]).
    // ground(부분, 상자): 그 대상이 딛고 선 바탕이라 넘어가는 부분 (다른 지역 상세에서 옮겨 온 카드는 없다)
    const checkMovedSpot = ({ id, card, t, mbox, side, ground, visitor = false }) => {
      const on = (o) => atTime(o, t)
      const who = visitor ? `'${id}'(${card.childMap ?? '세계 지도'} 에서 옮겨 옴)` : `'${id}'`
      const mnear = clears.filter(({ box: b }) => inter(b, mbox) > 0.3 * area(mbox)).map(({ c }) => c)
      if (!mnear.some(on)) errors.push(`[15] ${m.id}: ${who} 를 시점 ${t} 에 옮긴 자리에 그리는데 그 자리에 그 시점에 켜진 빈터가 없다 — movedFor: ['${id}'] 빈터를 둔다`)
      // 상자끼리가 아니라 그 부분의 잉크가 그림 상자에 닿는 칸(4 단위)으로 — 비스듬한 선의 상자만 걸치는 것은 넘어간다
      const hit = parts.filter(({ p, box: b }) => on(p) && area(b) < 4 * area(mbox) && inter(b, mbox) > 0.05 * area(mbox) && !ground(p, b) && inkCells(p.d, mbox, 4).size > 2)
      if (hit.length) errors.push(`[16] ${m.id}: ${who} 를 시점 ${t} 에 옮긴 자리에 그 시점에 켜진 손그림 부분 ${hit.length}개(${hit.slice(0, 4).map(({ p }) => `#${art.parts.indexOf(p)} ${p.cls}`).join(', ')})가 걸린다`)
      // 옮긴 자리의 이름 — 지역 상세가 나오는 가장 작은 배율(그림 1 단위가 가장 작은 화면 px)에서 이름 자리(영어·한국어 가운데 넓은 것, label 쪽)를
      // 그 시점에 켜진 빈터가 덮어야 하고([15] — 지형 기호가 이름에 얹히지 않게), 그림과 이름이 범위 안이어야 한다([15] — 범위 밖은 세계 지도의
      // 지형 기호가 빈터를 모른다. 가장자리 띠의 세계 지도 기호는 시점별 보기만의 빈터를 따른다 — childDetail.ts 의 claimedFor)
      const pxArt = TIER_PX_PER_UNIT[detailTierOf(perUnit)] / perUnit
      const caps = [card.name, card.nameKo].filter(Boolean).map((n) => captionBox(mbox, n, pxArt, side))
      const bare = Math.max(...caps.map((cb) => exposure(cb, on)))
      if (bare > 0.1) errors.push(`[15] ${m.id}: ${who} 를 시점 ${t} 에 옮긴 자리의 이름(${side}) 자리 ${(bare * 100) | 0}% 가 그 시점에 켜진 빈터 밖이다 — movedFor 빈터를 이름 쪽으로 넓힌다 (지역 상세가 나오는 배율에서 이름 상자 ${caps.map((cb) => [cb.x0, cb.y0, cb.x1, cb.y1].map(Math.round).join(',')).join(' / ')})`)
      const depth = Math.min(...[mbox, ...caps].flatMap((b) => [b.x0, b.y0, art.size[0] - b.x1, art.size[1] - b.y1]))
      if (depth < 0) errors.push(`[15] ${m.id}: ${who} 를 시점 ${t} 에 옮긴 자리(그림·이름)가 범위 밖으로 ${Math.round(-depth)} 단위 나간다 — 범위 밖의 세계 지도 기호는 빈터를 모른다. 안쪽으로 옮긴다 (가장자리 띠 ${Math.round(band)} 단위)`)
    }
    // 다른 지역 상세·세계 지도의 카드를 그 시점에 이 그림으로 옮겨 그리는 자리(time.moved 의 childMap) — 이 그림의 옮긴 자리와 같이 본다
    for (const t of TIME_POINTS)
      for (const { card, spot } of visitors(t))
        checkMovedSpot({ id: card.id, card, t, mbox: boxOf(spot, frames[card.id]), side: spot.label ?? 'below', ground: () => false, visitor: true })
    for (const [id, spot] of Object.entries(art.subjects)) {
      const card = cardOf.get(id)
      const f = frames[id]
      if (!card || !f) continue
      const box = boxOf(spot, f)
      const own = sagaLevelsOf(id)
      // 대상 상자 안의 손그림 잉크 (4 단위 칸) — 부분마다 한 번 셈한다
      const CELL = 4
      const cellCount = Math.ceil((box.x1 - box.x0) / CELL) * Math.ceil((box.y1 - box.y0) / CELL)
      const hereParts = parts.filter(({ box: b }) => inter(b, box) > 0).map(({ p }) => ({ p, i: art.parts.indexOf(p), cells: inkCells(p.d, box, CELL) })).filter(({ cells }) => cells.size)
      const inkAt = (pred) => new Set(hereParts.filter(({ p }) => pred(p)).flatMap(({ cells }) => [...cells]))
      // 이 대상의 자리를 비운 빈터 — 상자에 넉넉히 걸리고, 이 대상에 매였거나 어느 카드에도 매이지 않은 것 (다른 대상의 빈터는 그 대상의 시점을 따른다)
      const near = clears.filter(({ c, box: b }) => inter(b, box) > 0.3 * area(box) && !c.movedFor && (!c.for || c.for.includes(id))).map(({ c }) => c)
      // 사가 보기가 이 대상을 그리는 단계에서 지형 기호가 덮는 몫 — 그림이 받아들인 모습 (가장 적게 덮는 단계)
      const sagaExposure = Math.min(...own.map((lv) => exposure(box, (o) => inPhase(o, lv))))
      for (const t of TIME_POINTS) {
        const on = (o) => atTime(o, t)
        // 그리지 않는 시점, 또는 다른 지역 상세·세계 지도로 옮겨 그리는 시점(이 그림의 자리는 비지 않는다)
        if (!timesOf(card).includes(t) || leavesAt(card, t)) {
          // [18] 그리지 않는 대상의 자리 — 사가 보기는 그 시점의 바탕 단계에 그 대상을 그려 자리를 비우지만(장면 — T2 의 ZEN·WWK, T4 의 BFZ) 시점별 보기는
          // 그리지 않는다. 그 자리의 지형 기호는 끔(단계 0 — 아무 대상도 그리지 않는 바탕)만큼 다시 차야 한다 (그 시점에 그리는 다른 대상의 상자는 빼고)
          const level = timeGateView(t).level
          if (!own.includes(level)) continue
          const others = drawnBoxes(t)
          if (others.some((b) => inter(b, box) > 0.2 * area(box))) continue
          const base = exposure(box, (o) => inView(o, { level: 0 }))
          const forOther = (c) => [...(c.for ?? []), ...(c.movedFor ?? [])].some((x) => x !== id && cardOf.has(x) && drawsAt(cardOf.get(x), t))
          const now = exposure(box, on, forOther)
          if (base - now > 0.25) errors.push(`[18] ${m.id}: '${id}' 를 시점 ${t} 에 그리지 않는데 그 자리의 지형 기호가 끔보다 비었다 (끔 ${(base * 100) | 0}% → ${(now * 100) | 0}%) — 그 자리를 비운 지형 칸·빈터를 그 시점에 끄거나 대상을 그리는 칸에 시점 문을 단다`)
          continue
        }
        // 그 시점에 다른 자리로 옮긴 대상 — 옮긴 자리(그림의 subjects 의 moved)에 그 시점에 켜진 빈터가 있어야 하고([15]), 그 시점에 켜진 손그림 부분
        // (대상보다 작은 것 — 숲 띠·해안선 같은 긴 선의 상자는 넘어간다)이 대상 상자에 걸리면 안 된다([16])
        if (movedAt(card, t)) {
          const mv = spot.moved?.[t]
          if (!mv) {
            errors.push(`[15] ${m.id}: '${id}' 를 시점 ${t} 에 옮겨 그리는데 그림의 subjects 에 moved[${t}] 가 없다`)
            continue
          }
          checkMovedSpot({ id, card, t, mbox: boxOf(spot, f, mv.at, mv.flip ?? spot.flip), side: mv.label ?? spot.label ?? 'below', ground: (p, b) => inter(b, box) > 0.05 * area(box) && own.some((lv) => inPhase(p, lv)) })
          continue
        }
        // 그 시점의 바탕 단계에 사가 보기도 이 대상을 그리고 둘레에 시점 열쇠가 없으면 문 셈이 사가 보기와 같다 — 사가 보기의 모습이라 여기서 보지 않는다
        const keyed = (o) => o.time !== undefined || o.timeOnly
        if (own.includes(timeGateView(t).level) && !near.some(keyed) && !parts.some(({ p, box: b }) => keyed(p) && inter(b, box) > 0) && !fields.some(({ f, box: b }) => keyed(f) && inter(b, box) > 0)) continue
        // (사가 보기도 그 시점의 바탕 단계에 이 대상을 그리며 그 빈터를 하나도 켜지 않으면 — 그 단계에 비울 기호가 없는 빈터 — 그 모습 그대로다)
        const L = timeGateView(t).level
        if (near.length && !near.some(on) && !(own.includes(L) && !near.some((c) => inPhase(c, L))))
          errors.push(`[15] ${m.id}: '${id}' 가 시점 ${t} 에 그려지는데 그 자리의 빈터(${near.length}개)가 그 시점에 하나도 켜지지 않는다`)
        // 그 시점에 켜진 손그림의 잉크가 대상 상자를, 사가 보기가 이 대상을 그리는 단계(가장 가까운 것)보다 더 덮는가 — 칸(4 단위)으로 어림한다.
        // 같은 손그림의 두 변형(그림 자리를 비운 것·채운 것)이 대상 둘레에서 같은 모양이면 걸리지 않는다
        const more = Math.min(...own.map((lv) => [...inkAt(on)].filter((k) => !inkAt((o) => inPhase(o, lv)).has(k)).length))
        if (more > 0.04 * cellCount) {
          const lv = own.find((l) => [...inkAt(on)].filter((k) => !inkAt((o) => inPhase(o, l)).has(k)).length === more)
          const extra = new Set([...inkAt(on)].filter((k) => !inkAt((o) => inPhase(o, lv)).has(k)))
          const who = hereParts.filter(({ p, cells }) => on(p) && !inPhase(p, lv) && [...cells].some((k) => extra.has(k))).map(({ i, p }) => `#${i} ${p.cls}`)
          errors.push(`[16] ${m.id}: '${id}' 가 시점 ${t} 에 그려지는데 그 시점에 켜진 손그림이 대상 상자를 사가 보기(단계 ${lv})보다 ${((more / cellCount) * 100) | 0}% 더 덮는다 — 부분 ${who.slice(0, 6).join(', ')}${who.length > 6 ? ' …' : ''} (KIT.dodge 로 그 대상이 그 시점에 그려질 때 끈다)`)
        }
        // [17] 지형 칸 — 그 시점에 켜진 지형 칸이 사가 보기가 이 대상을 그리는 단계보다 대상 자리를 더 덮으면 (칸의 구멍이 페이즈 문만 따른다)
        const now = exposure(box, on)
        // 견줄 사가 보기 — 그 시점의 바탕 단계에 사가 보기도 이 대상을 그리면 그 단계, 아니면 가장 적게 덮는 단계
        const ref = own.includes(L) ? exposure(box, (o) => inPhase(o, L)) : sagaExposure
        if (now - ref > 0.15) errors.push(`[17] ${m.id}: '${id}' 가 시점 ${t} 에 그려지는데 그 시점에 켜진 지형 칸이 대상 자리를 사가 보기보다 덮는다 (${(ref * 100) | 0}% → ${(now * 100) | 0}%) — 빈터를 열거나 대상 자리를 비운 칸에 시점 문을 단다`)
      }
    }
  }
  // 자리 검사([15]–[18])는 TIMELINE_LAYOUT=warn 이면 경고로만 — 새로 이어 그린 시점의 자리를 아직 고르지 않은 단계. 열쇠 검사([14])는 늘 오류
  const layout = process.env.TIMELINE_LAYOUT === 'warn' ? errors.filter((msg) => /^\[1[5-8]\]/.test(msg)) : []
  for (const msg of layout) console.warn(`경고 (TIMELINE_LAYOUT=warn) — ${msg}`)
  const fatal = errors.filter((msg) => !layout.includes(msg))
  if (layout.length) console.warn(`경고 — 시점별 보기의 자리 검사 ${layout.length}개 ([15]–[18]) 를 경고로만 보였다 (TIMELINE_LAYOUT=warn)`)
  if (fatal.length) {
    for (const msg of fatal) console.error(`오류 — ${msg}`)
    throw new Error(`시점별 보기와 지역 상세가 어긋난다 — 위 ${fatal.length}개 ([14]–[18])`)
  }
}
if (checkOnly) {
  console.log(`검사만 했다: ${CHILDMAPS.map((m) => m.id).join(', ')}`)
  process.exit(0)
}
const num = (s) => s.replace(/-?\d*\.\d+|-?\d+/g, (n) => String(Math.round(Number(n) * 10) / 10))
const pt = (p) => `[${p.map((v) => Math.round(v * 10) / 10).join(', ')}]`
/**
 * 붙은 문 — 페이즈 문, 그리고 시점별 보기의 열쇠(for 는 빈터만 — 앱은 읽지 않고 --check 의 [14] 가 낡은 시점 열쇠를 찾을 때 쓴다).
 * scripts/qa/saga-regress.mjs 가 `, for: […]`·`, time: {…}`·`, timeOnly: true` 를 지우고 main 과 견주니 이 모양을 지킨다
 */
const gates = (o) =>
  GATE_KEYS.filter((k) => o[k] !== undefined).map((k) => `, ${k}: ${Boolean(o[k])}`).join('') +
  (o.for ? `, for: [${o.for.map(q).join(', ')}]` : '') +
  (o.time && Object.keys(o.time).length ? `, time: { ${TIME_KEYS.filter(([k]) => o.time[k] !== undefined).map(([k]) => `${k}: ${o.time[k]}`).join(', ')} }` : '') +
  (o.timeOnly ? ', timeOnly: true' : '')
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
    out.push(`      { text: ${q(l.text)}${l.textKo ? `, textKo: ${q(l.textKo)}` : ''}, at: ${pt(l.at)}, size: ${l.size}, kind: ${q(l.kind)}${l.rotate ? `, rotate: ${l.rotate}` : ''}${gates(l)} },`)
  out.push('    ],', '    subjects: {')
  for (const [id, s] of Object.entries(m.subjects))
    out.push(`      ${q(id)}: { at: ${pt(s.at)}, size: ${s.size}${s.flip ? ', flip: true' : ''}${s.label ? `, label: ${q(s.label)}` : ''} },`)
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
