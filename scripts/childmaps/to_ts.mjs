// 자식 지도 원본(art/<id>.js)을 앱의 그림 파일 src/map/childmaps/<id>.ts 로 옮긴다: node scripts/childmaps/to_ts.mjs
// 지도마다 파일이 따로라 앱은 연 지도의 그림만 불러온다 (App.tsx 의 import.meta.glob).
// 원본은 앱에서 그대로 보며 고친다: pnpm dev 뒤 http://localhost:5173/?phase=1&child=<id>&childsrc=1 (원본을 바로 읽는다)
// 원본은 그리기 도구 kit.js(KIT.house·KIT.cliff…)를 쓸 수 있다 — 지침은 STYLE.md
// 검사(--check, 그리고 만들기 전에도 늘): 그림·대상·이름 쪽, 더 깊은 지역 상세(1–8), 세계 지도의 페이즈 바탕(src/data/periods)과의 이음(9–13 오류 —
// periods.mjs 로 읽고, 페이즈 바탕의 자체 검사와 표시 검사(check.ts 의 M1·M2)도 함께 돈다. 맞출 문과 붙여 넣을 칸은 context.mjs <id> 의 periods)
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
import { parsePath, pathBox } from './paths.mjs'
import { GATES, inPhase, levelOf, SAGAS, slotOf } from '../../src/data/sagas.ts'
import { checkTimes, drawnAt, movedAt, sagaSpanOf, timeInfo, timesOf, TIME_POINTS } from '../../src/data/timeline.ts'
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
const PHASE_CARDS = [PHASE1_CARDS, PHASE2_CARDS, PHASE3_CARDS, PHASE4_CARDS, PHASE5_CARDS]
/** 페이즈 문의 이름 (src/data/sagas.ts 의 GATES·PhaseGate — phase·phase2·phase3 은 사가1, phase4·phase5 는 사가2 의 페이즈1·2) */
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
    if (off) throw new Error(`${m.id}: '${id}' — phase1.ts~phase5.ts 를 그림에 맞춘다: at: [${at.join(', ')}], size: ${size}${spot.flip ? ', flip: true' : ' (flip 없음)'}`)
    if (spot.label !== undefined && !LABEL_SIDES.includes(spot.label)) throw new Error(`${m.id}: '${id}' 의 label '${spot.label}' — ${LABEL_SIDES.map((a) => `'${a}'`).join(' · ')} 가운데 하나`)
    if ((card.label ?? null) !== (spot.label ?? null))
      throw new Error(`${m.id}: '${id}' — phase1.ts~phase5.ts 의 label 을 그림에 맞춘다: ${spot.label ? `label: '${spot.label}'` : 'label 없음'}`)
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
checkTimeline()
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
  const gateKey = (o) => GATE_KEYS.filter((k) => o[k] !== undefined).map((k) => `${k}:${Boolean(o[k])}`).join(' ')
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
 * 시점별 보기(src/data/timeline.ts) — 함수 선언이라 위에서 먼저 부른다. 시점의 문은 sagas.ts 의 inView 와 같은 셈이다: 부분·빈터의 time 열쇠(t1…t4)가 있으면
 * 그 값, 없으면 timeOnly 가 아닐 때 inPhase(문, 그 시점의 바탕 단계). 사가 보기는 이 셈을 쓰지 않는다
 * - V1–V5: 카드의 time (timeline.ts 의 timeProblems)
 * - [14] (V10) 빈터의 시점 열쇠 — for(그 빈터가 자리를 비운 카드 id)가 있는 빈터는 시점마다 'for 의 카드 가운데 하나라도 그 시점에 그 자리에 그려지는가'
 *   (moved 로 옮긴 시점은 꺼짐)가 기본값과 다를 때 time 에 그 값이 있어야 하고, 적힌 time 열쇠는 그 값과 같아야 한다 (낡은 열쇠)
 * - [15]·[16] (V9) 그 시점에 그리는 대상 — 그 자리의 빈터가 있는데 그 시점에 하나도 켜지지 않거나([15]), 사가 보기가 그 대상을 그리는 어느 단계에도
 *   켜지지 않는 문 단 손그림 부분이 그 시점에 켜져 대상 상자에 걸리면([16]). 그 시점의 바탕 단계에 사가 보기도 그 대상을 그리고(세트 시점은 늘 그렇다)
 *   둘레에 시점 열쇠가 없으면 사가 보기와 같은 모습이라 보지 않는다. 그림의 timeReady 가 그 시점을 적은 대상은 오류, 손그림을 아직 맞추지 않은
 *   나머지(앱이 그 시점에 그리지 않는다 — S7)는 지도마다 세어 알린다
 */
function checkTimeline() {
  checkTimes(CARDS, true)
  const cardOf = new Map(CARDS.map((c) => [c.id, c]))
  const tk = (t) => `t${t}`
  const atTime = (o, t) => (o.time?.[tk(t)] !== undefined ? Boolean(o.time[tk(t)]) : !o.timeOnly && inPhase(o, timeInfo(t).periodLevel))
  const area = (b) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0)
  const inter = (a, b) => area({ x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) })
  const polyBox = (pts) => ({ x0: Math.min(...pts.map((q) => q[0])), y0: Math.min(...pts.map((q) => q[1])), x1: Math.max(...pts.map((q) => q[0])), y1: Math.max(...pts.map((q) => q[1])) })
  /** 사가 보기가 그 카드를 그리는 단계 (이어 센 번호) */
  const sagaLevelsOf = (id) => {
    const [a, b] = liveOf.get(id)
    return Array.from({ length: b - a + 1 }, (_, i) => a + i)
  }
  const errors = []
  const pending = new Map()
  for (const m of CHILD_MAPS.filter((c) => !only.length || only.includes(c.id))) {
    const art = CHILDMAPS.find((a) => a.id === m.id)
    if (!art) continue
    // [14] — 빈터의 시점 열쇠
    for (const [i, c] of (art.clearings ?? []).entries()) {
      if (c.for === undefined) {
        if (c.time) errors.push(`[14] ${m.id}: clearings ${i} 번에 time 열쇠가 있는데 for(자리를 비운 카드)가 없다 — 열쇠는 for 에서 셈한다`)
        continue
      }
      for (const id of c.for) if (!art.subjects[id]) errors.push(`[14] ${m.id}: clearings ${i} 번의 for '${id}' 는 이 지역 상세의 대상이 아니다`)
      for (const t of TIME_POINTS) {
        const want = c.for.some((id) => cardOf.has(id) && drawnAt(cardOf.get(id), t) && !movedAt(cardOf.get(id), t))
        const got = c.time?.[tk(t)]
        const base = inPhase(c, timeInfo(t).periodLevel)
        if (got !== undefined ? Boolean(got) !== want : base !== want)
          errors.push(`[14] ${m.id}: clearings ${i} 번(for ${c.for.join('·')})의 시점 ${t} 열쇠가 낡았다 — ${want === base ? `${tk(t)} 를 지운다` : `${tk(t)}: ${want}`}`)
      }
    }
    // [15]·[16] — 그 시점에 그리는 대상의 빈터와 손그림
    const parts = art.parts.map((p) => ({ p, box: pathBox(p.d) })).filter(({ box }) => Number.isFinite(box.x0))
    for (const [id, spot] of Object.entries(art.subjects)) {
      const card = cardOf.get(id)
      const f = frames[id]
      if (!card || !f) continue
      const [, vx, vy, vw, vh, ax, ay] = f
      const k = spot.size / Math.max(vw, vh)
      const [l, r] = spot.flip ? [vx + vw - ax, ax - vx] : [ax - vx, vx + vw - ax]
      const box = { x0: spot.at[0] - l * k, y0: spot.at[1] - (ay - vy) * k, x1: spot.at[0] + r * k, y1: spot.at[1] + (vy + vh - ay) * k }
      const own = sagaLevelsOf(id)
      const near = (art.clearings ?? []).filter((c) => c.points.length >= 3 && inter(polyBox(c.points), box) > 0.3 * area(box))
      const span = sagaSpanOf(card)
      for (const t of timesOf(card)) {
        // 그 시점에 다른 자리로 옮긴 대상은 이 자리를 보지 않는다 (옮긴 자리는 S6 의 몫)
        if (movedAt(card, t)) continue
        // 그 시점의 바탕 단계에 사가 보기도 이 대상을 그리고 둘레에 시점 열쇠가 없으면 문 셈이 사가 보기와 같다 — 사가 보기의 모습이라 여기서 보지 않는다
        const keyed = (o) => o.time !== undefined || o.timeOnly
        if (own.includes(timeInfo(t).periodLevel) && !near.some(keyed) && !parts.some(({ p, box: b }) => keyed(p) && inter(b, box) > 0)) continue
        const strict = (art.timeReady?.[id] ?? []).includes(t)
        const found = []
        if (near.length && !near.some((c) => atTime(c, t))) found.push(`[15] ${m.id}: '${id}' 가 시점 ${t} 에 그려지는데 그 자리의 빈터(${near.length}개)가 그 시점에 하나도 켜지지 않는다`)
        const hit = parts.filter(({ p, box: b }) => atTime(p, t) && !own.some((lv) => inPhase(p, lv)) && inter(b, box) > 0.05 * area(box))
        if (hit.length) found.push(`[16] ${m.id}: '${id}' 가 시점 ${t} 에 그려지는데 그 시점에 켜진 손그림 부분 ${hit.length}개가 대상 상자에 걸린다 (사가 보기가 이 대상을 그리는 단계에는 그리지 않는 부분)`)
        if (strict) errors.push(...found)
        else if (found.length && !span.includes(t)) {
          const p = pending.get(m.id) ?? new Set()
          p.add(`${id}@${t}`)
          pending.set(m.id, p)
        }
      }
    }
  }
  if (pending.size)
    console.warn(
      `경고 — 시점별 보기에서 손그림을 아직 맞추지 않은 지역 상세 대상 (그림의 timeReady 에 적기 전에는 앱이 그 시점에 그리지 않는다 — S7):
  ${[...pending]
        .sort((a, b) => b[1].size - a[1].size)
        .map(([id, set]) => `${id} ${set.size}: ${[...set].join(', ')}`)
        .join('\n  ')}`,
    )
  if (errors.length) {
    for (const msg of errors) console.error(`오류 — ${msg}`)
    throw new Error(`시점별 보기와 지역 상세가 어긋난다 — 위 ${errors.length}개 ([14]–[16])`)
  }
}
if (checkOnly) {
  console.log(`검사만 했다: ${CHILDMAPS.map((m) => m.id).join(', ')}`)
  process.exit(0)
}
const num = (s) => s.replace(/-?\d*\.\d+|-?\d+/g, (n) => String(Math.round(Number(n) * 10) / 10))
const pt = (p) => `[${p.map((v) => Math.round(v * 10) / 10).join(', ')}]`
const gates = (o) => GATE_KEYS.filter((k) => o[k] !== undefined).map((k) => `, ${k}: ${Boolean(o[k])}`).join('')
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
