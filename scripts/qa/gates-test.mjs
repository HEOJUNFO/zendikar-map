// 페이즈 문 셈의 시험 — src/data/sagas.ts 의 levelsOf·gatesFor (명세 §3.1).
//   node scripts/qa/gates-test.mjs [모듈 경로 — 기본 src/data/sagas.ts. 같은 이름을 내는 다른 구현을 시험할 때]
// 문 열쇠(GATES)·단계(0 과 데이터가 있는 페이즈 PHASE_SLOTS)·시점 열쇠(TIME_KEYS)·시점(timeline.ts 의 TIMES, 숨긴 시점도)는 데이터에서 읽고, 셈의 수는
// 그로부터 낸다 — 지금 문 열쇠 8개(phase…phase8, 문 3^8 = 6561), 단계 0–8(부분집합 2^9 = 512), 시점 열쇠 6개(3^6 = 729),
// 보기 15개(끔·단계 1–8·T1–T6, 부분집합 32768)
// 1. levelsOf: 문(열쇠마다 없음·true·false) 모두에서, 이 시험이 따로 셈한 단계 집합
//    (inPhase 와 같은 규칙 — 이어 센 n 이 켜졌다 = sagaStart(단계) ≤ n ≤ 단계, 0 은 끔)과 같은가. sagas.ts 에 inPhase 가 있으면 그것과도 견준다
// 2. gatesFor: 단계의 부분집합 모두에서 결과 문들의 levelsOf 합집합이 입력과 같고(왕복), 문 하나하나가 입력 안이며,
//    문의 수가 가장 적은가(모든 문으로 셈한 최소 덮개). 입력 차례가 달라도 결과가 같은가
// 3. 명세 §3.1 의 표와 같은가 (0 을 담은 집합에는 사가2 뒤의 단계를 더한다 — 끔과 같은 문이 그 단계에도 맞으니)
// 4. inView (시점별 보기의 문, 시점 열쇠와 timeOnly): 문 × 시점 열쇠 × timeOnly 2 개 모두에서 보기(끔·단계·시점 — 시점은 그 시점의 바탕 단계,
//    그 시점 마지막 세트의 세트 차례 번호: T1 2, T2 3, T3 4, T4 5, T5 6, T6 8)마다 이 시험의 셈과 같은가. 사가 보기는 시점 열쇠를 읽지 않아 inPhase 와 같은가 (timeOnly 는 그리지 않는다).
//    inView 는 시점 열쇠를 그 보기가 읽어도 되는 열쇠의 값으로 가른 부류마다 대표 하나로 셈하고 부류 전체를 센다 — 읽은 것을 적어 하나하나 셈한 것과 같다고
//    보이고, 아니면 하나하나 (4 절의 '시점 열쇠의 부류' 주석). viewsOf (timeline.ts) 는 문마다 하나하나 이 시험의 셈과 견준다
// 5. gatesForViews (src/data/timeline.ts): 보기의 부분집합 모두에서 왕복·문 하나하나가 입력 안·가장 적은 수, 그리고 표
// 6. 데이터에서 읽은 수 곁의 글자 그대로의 수(LITERAL — 사가·세트·시점을 더하면 함께 고친다)와 셈에 기대지 않는 단언: sagaStart 의 표(단계 6 = 사가3 의 첫
//    페이즈 6, 단계 7·8 = 사가4 의 첫 페이즈 7), 시점 T5(바탕 단계 6)는 phase6·t5 가 없는 문에서, 시점 T6(바탕 단계 8)은 phase7·phase8·t6 이 없는 문에서 끔(L0)과 같다
// 시험할 모듈에 gatesFor·levelsOf 가 없으면(다른 구현을 시험할 때 등) 알리고 2 로 끝난다.
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const sagas = await import(process.argv[2] ? pathToFileURL(path.resolve(process.argv[2])).href : '../../src/data/sagas.ts')

const { sagaStart, gatesFor, levelsOf } = sagas
if (typeof gatesFor !== 'function' || typeof levelsOf !== 'function') {
  console.error('시험할 모듈에 gatesFor·levelsOf 가 없다 — 시험을 건너뛴다.')
  process.exit(2)
}

const { GATES, PHASE_SLOTS, SAGAS, TIME_KEYS } = sagas
/** 문 열쇠 — 이름은 phase(1)·phase<n>, 번호는 1 부터 빠짐없이 (데이터에서 읽고 이름 꼴만 따로 본다) */
const KEYS = GATES.map(([k, n]) => [k, n])
KEYS.forEach(([k, n], i) => {
  if (n !== i + 1 || k !== (n === 1 ? 'phase' : `phase${n}`)) throw new Error(`GATES 의 ${i + 1}번째 문 '${k}'(${n}) — phase·phase2·… 차례가 아니다`)
})
/** 단계 — 0(끔)과 데이터가 있는 페이즈 (1 부터 빠짐없이) */
const LEVELS = [0, ...PHASE_SLOTS.map((p) => p.level)]
LEVELS.forEach((l, i) => {
  if (l !== i) throw new Error(`PHASE_SLOTS 의 이어 센 번호가 1 부터 빠짐없지 않다: ${LEVELS.join('·')}`)
})
/** 글자 그대로의 수 — 데이터에서 읽은 수가 바뀌면(사가·세트·시점을 더하면) 여기도 고친다 */
const LITERAL = { keys: 8, levels: 9, timeKeys: 6, gates: 6561, views: 15 }
let failed = 0
/** 대표로 셈하는 동안(4 절)은 실패를 세지 않고 여기에만 적는다 — 실패한 부류는 문마다 다시 셈해 하나하나 셈할 때와 같은 수를 센다 */
let held = null
const fail = (msg) => {
  if (held) return void held.push(msg)
  failed++
  if (failed <= 30) console.error('✗ ' + msg)
}
const show = (g) => JSON.stringify(g)
const norm = (gs) => gs.map((g) => JSON.stringify(Object.fromEntries(Object.entries(g).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b))))).sort()
const maskOf = (levels) => levels.reduce((m, l) => m | (1 << l), 0)
const levelsOfMask = (m) => LEVELS.filter((l) => m & (1 << l))

/** 이 시험의 셈 — inPhase 와 같은 규칙 */
const lit = (g, level) => KEYS.every(([k, n]) => g[k] === undefined || g[k] === (sagaStart(level) <= n && n <= level))
const oracle = (g) => LEVELS.filter((l) => lit(g, l))

// 문 3^(열쇠 수)개
const ALL = [{}]
for (const [k] of KEYS) {
  const next = []
  for (const g of ALL) for (const v of [undefined, true, false]) next.push(v === undefined ? { ...g } : { ...g, [k]: v })
  ALL.splice(0, ALL.length, ...next)
}
if (ALL.length !== 3 ** KEYS.length) throw new Error(`문이 ${ALL.length}개`)
// 6. 글자 그대로의 수와 sagaStart 의 표 — 셈(lit)이 모듈의 sagaStart 에 기대므로 그것만은 따로 적어 둔다
if (KEYS.length !== LITERAL.keys) fail(`문 열쇠 ${KEYS.length}개 — 글자 그대로는 ${LITERAL.keys}개`)
if (LEVELS.length !== LITERAL.levels) fail(`단계 ${LEVELS.length}개(0 포함) — 글자 그대로는 ${LITERAL.levels}개`)
if (ALL.length !== LITERAL.gates) fail(`문 ${ALL.length}개 — 글자 그대로는 ${LITERAL.gates}개`)
for (const [level, start] of [[1, 1], [2, 1], [3, 1], [4, 4], [5, 4], [6, 6], [7, 7], [8, 7]])
  if (sagaStart(level) !== start) fail(`sagaStart(${level}) = ${sagaStart(level)}, 기대 ${start}`)
const SUBSETS = 1 << LEVELS.length

// 1. levelsOf
for (const g of ALL) {
  const want = oracle(g)
  const got = [...levelsOf(g)].sort((a, b) => a - b)
  if (show(got) !== show(want)) fail(`levelsOf(${show(g)}) = ${show(got)}, 기대 ${show(want)}`)
  if (typeof sagas.inPhase === 'function')
    for (const l of LEVELS) if (sagas.inPhase(g, l) !== want.includes(l)) fail(`inPhase(${show(g)}, ${l}) 가 levelsOf 와 다르다`)
}

// 최소 덮개 — 단계 집합(마스크)마다 그 안에 드는 문 마스크로 정확히 덮는 가장 적은 수
const gateMasks = [...new Set(ALL.map((g) => maskOf(oracle(g))))].filter((m) => m !== 0)
const minCover = new Map([[0, 0]])
for (let target = 1; target < SUBSETS; target++) {
  const usable = gateMasks.filter((m) => (m & ~target) === 0)
  // 너비 우선 — 덮은 마스크 → 문 수
  let frontier = new Set([0])
  const seen = new Set([0])
  let steps = 0
  while (!seen.has(target) && frontier.size) {
    steps++
    const next = new Set()
    for (const f of frontier)
      for (const m of usable) {
        const u = f | m
        if (!seen.has(u)) {
          seen.add(u)
          next.add(u)
        }
      }
    frontier = next
  }
  minCover.set(target, seen.has(target) ? steps : Infinity)
}

// 2. gatesFor — 단계의 부분집합 모두 왕복
for (let mask = 0; mask < SUBSETS; mask++) {
  const levels = levelsOfMask(mask)
  let gates
  try {
    gates = gatesFor(levels)
  } catch (e) {
    fail(`gatesFor(${show(levels)}) 가 던졌다: ${e.message}`)
    continue
  }
  let union = 0
  for (const g of gates) {
    for (const k of Object.keys(g)) if (!KEYS.some(([n]) => n === k) || typeof g[k] !== 'boolean') fail(`gatesFor(${show(levels)}) 의 문 ${show(g)} 에 모르는 열쇠·값`)
    const m = maskOf(levelsOf(g))
    if (m === 0) fail(`gatesFor(${show(levels)}) 의 문 ${show(g)} 은 어느 단계에도 맞지 않는다`)
    if ((m & ~mask) !== 0) fail(`gatesFor(${show(levels)}) 의 문 ${show(g)} 이 입력 밖 단계 ${show(levelsOfMask(m & ~mask))} 에도 맞는다`)
    union |= m
  }
  if (union !== mask) fail(`gatesFor(${show(levels)}) 의 합집합이 ${show(levelsOfMask(union))}`)
  if (gates.length !== minCover.get(mask)) fail(`gatesFor(${show(levels)}) 의 문이 ${gates.length}개 — 가장 적은 수는 ${minCover.get(mask)}`)
  const rev = gatesFor([...levels].reverse())
  if (show(norm(rev)) !== show(norm(gates))) fail(`gatesFor 가 입력 차례에 따라 다르다: ${show(levels)}`)
}

// 3. 명세 §3.1 의 표 — 0 을 담은 집합은 사가2(단계 5) 뒤의 데이터 단계도 담는다 (그 단계에서 phase…phase5 는 모두 꺼져 끔과 같다)
const LATER = LEVELS.filter((l) => l > 5)
const TABLE = [
  [[5], [{ phase5: true }]],
  [[4], [{ phase4: true, phase5: false }]],
  [[4, 5], [{ phase4: true }]],
  [[1, 2, 3], [{ phase: true }]],
  [[1, 2], [{ phase: true, phase3: false }]],
  [[1, 2, 3, 4, 5], [{ phase: true }, { phase4: true }]],
  [[0, 3, 4, 5, ...LATER], [{ phase: false }, { phase3: true }]],
]
for (const [levels, want] of TABLE) {
  const got = gatesFor(levels)
  if (show(norm(got)) !== show(norm(want))) fail(`gatesFor(${show(levels)}) = ${show(got)}, 명세 표는 ${show(want)}`)
}

// 4. inView — 시점별 보기의 문
const timeline = await import('../../src/data/timeline.ts')
const TKEYS = TIME_KEYS.map(([k, t]) => [k, t])
TKEYS.forEach(([k, t], i) => {
  if (t !== i + 1 || k !== `t${t}`) throw new Error(`TIME_KEYS 의 ${i + 1}번째 열쇠 '${k}'(${t}) — t1·t2·… 차례가 아니다`)
})
if (show(TKEYS.map(([, t]) => t)) !== show(timeline.TIMES.map((x) => x.t))) throw new Error('TIME_KEYS 와 timeline.ts 의 TIMES 가 다르다')
if (TKEYS.length !== LITERAL.timeKeys) fail(`시점 열쇠 ${TKEYS.length}개 — 글자 그대로는 ${LITERAL.timeKeys}개`)
/** 세트 차례의 이어 센 번호 — 사가의 세트를 차례로 (아직 phases 에 들지 않은 세트도) */
const SET_LEVEL = new Map(SAGAS.flatMap((s) => s.sets).map((set, i) => [set, i + 1]))
/** 시점의 바탕 단계 — 이 시험이 따로 셈한다 (명세 1절: 그 시점 마지막 세트의 세트 차례 번호) */
const PERIOD_LEVEL = Object.fromEntries(timeline.TIMES.map((x) => [x.t, SET_LEVEL.get(x.sets.at(-1))]))
for (const x of timeline.TIMES) if (x.periodLevel !== PERIOD_LEVEL[x.t]) fail(`시점 ${x.t} 의 periodLevel ${x.periodLevel} — 세트 차례로는 ${PERIOD_LEVEL[x.t]}`)
// 시점 열쇠 3^(시점 수)개 — 첫째는 {}(시점 열쇠 없음 — 문에 time 을 달지 않는다). 모든 문이 같은 시점 열쇠 객체를 나눠 쓰니 얼린다 (구현이 고치면 던진다)
const TIMES = [{}]
for (const [k] of TKEYS) {
  const next = []
  for (const t of TIMES) for (const v of [undefined, true, false]) next.push(v === undefined ? { ...t } : { ...t, [k]: v })
  TIMES.splice(0, TIMES.length, ...next)
}
TIMES.forEach((t) => Object.freeze(t))
/** 보기 — [이름, GateView] (끔·단계·시점) */
const VIEWS = [...LEVELS.map((l) => [`L${l}`, { level: l }]), ...TKEYS.map(([, t]) => [`T${t}`, { level: PERIOD_LEVEL[t], time: t }])]
if (VIEWS.length !== LITERAL.views) fail(`보기 ${VIEWS.length}개 — 글자 그대로는 ${LITERAL.views}개`)
/** 시점 T5 — 바탕 단계 6 (글자 그대로) */
const T5 = { level: 6, time: 5 }
let t5Cases = 0
/** 시점 T6 — 바탕 단계 8 (글자 그대로) */
const T6 = { level: 8, time: 6 }
let t6Cases = 0
const L0 = { level: 0 }
const litView = (g, v) => (v.time === undefined ? !g.timeOnly && lit(g, v.level) : (g.time?.[`t${v.time}`] ?? (!g.timeOnly && lit(g, v.level))))
/** 문(페이즈 열쇠 g·시점 열쇠 t·timeOnly) — 열쇠 차례는 페이즈 열쇠, time, timeOnly */
const gateOf = (g, t, only) => ({ ...g, ...(Object.keys(t).length ? { time: t } : {}), ...(only ? { timeOnly: true } : {}) })

// 보기 집합의 비트 (5 절과 같다) — 단계 l 은 l 번, 시점 t 는 (단계 수 + t - 1) 번
const TBIT = LEVELS.length - 1
const vmask = (vs) => vs.levels.reduce((m, l) => m | (1 << l), 0) | vs.times.reduce((m, t) => m | (1 << (TBIT + t)), 0)
const unmask = (m) => ({ levels: LEVELS.filter((l) => m & (1 << l)), times: TKEYS.map(([, t]) => t).filter((t) => m & (1 << (TBIT + t))) })
// 이 시험의 셈(litView)을 비트로 — 문이 맞는 보기 = (timeOnly 가 아니면 페이즈 열쇠만으로 맞는 보기) 에서 시점 열쇠가 붙은 시점을 지우고 true 인 시점을 더한 것.
// litView 를 그대로 옮긴 것이다: 사가 보기는 시점 열쇠를 보지 않고(!timeOnly && lit), 시점 t 는 열쇠가 있으면 그 값, 없으면 !timeOnly && lit(그 바탕 단계)
const phaseViews = ALL.map((g) => vmask({ levels: LEVELS.filter((l) => lit(g, l)), times: TKEYS.map(([, t]) => t).filter((t) => lit(g, PERIOD_LEVEL[t])) }))
const timeSet = TIMES.map((t) => vmask({ levels: [], times: TKEYS.filter(([k]) => t[k] !== undefined).map(([, n]) => n) }))
const timeTrue = TIMES.map((t) => vmask({ levels: [], times: TKEYS.filter(([k]) => t[k] === true).map(([, n]) => n) }))
const wantMask = (i, j, only) => ((only ? 0 : phaseViews[i]) & ~timeSet[j]) | timeTrue[j]
/** 보기 마스크 → viewsOf 가 내야 할 값 (처음 물을 때 짓는다) */
const wantViews = new Map()
const wantOf = (m) => {
  let w = wantViews.get(m)
  if (!w) wantViews.set(m, (w = unmask(m)))
  return w
}
const sameList = (a, b) => {
  if (!Array.isArray(a) || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}
/** viewsOf 의 값이 want 와 같은가 — show 로 견준 것과 같은 판정 (열쇠가 levels·times 차례로 둘뿐이고 배열이 원소마다 같다), 빠른 길이 아니면 show 로 */
const sameViews = (vs, want) => {
  const ks = vs && typeof vs === 'object' ? Object.keys(vs) : []
  if (ks.length === 2 && ks[0] === 'levels' && ks[1] === 'times' && sameList(vs.levels, want.levels) && sameList(vs.times, want.times)) return true
  return show(vs) === show(want)
}

// 시점 열쇠의 부류 — 4 절의 inView·inPhase 셈은 시점 열쇠를 부류의 대표 하나로 셈하고 부류 전체를 센다. 이것이 모든 문을 하나하나 셈한 것과 같은 까닭:
//   대표의 시점 열쇠 객체를 Proxy 로 감싸 셈(구현과 이 시험의 litView)이 그 객체에서 무엇을 읽는지(get·has·getOwnPropertyDescriptor 의 열쇠, ownKeys 는 '모두')
//   적는다. 구현은 결정적이고 문을 속성 읽기로만 본다 — 그러면 읽은 열쇠의 값이 같은 두 시점 열쇠 객체는 구현에게 구별되지 않아 같은 값을 낸다.
//   부류는 그 보기가 읽어도 되는 열쇠(사가 보기는 없음, 시점 t 는 t 의 열쇠, T5·T6 = 끔은 t5·t6)의 값이 같은 시점 열쇠 객체들(문의 다른 칸 — 페이즈 열쇠·
//   timeOnly·time 이 붙었는지 — 은 부류 안에서 같다)이라, 읽은 열쇠가 그 안이면 대표의 판정이 부류의 모든 문의 판정이다.
//   그 밖의 것을 읽거나(다른 시점 열쇠·열쇠 목록·hasOwnProperty 같은 이름 …) 대표가 실패하면 그 부류는 문마다 하나하나 셈한다 — 어느 구현이든 빠뜨리는 문이
//   없고, 실패의 수와 글도 하나하나 셈할 때와 같다.
//   time 이 붙지 않은 문({})은 따로 한 부류(대표 그대로). 그래서 센 경우의 수(inView 문 × 보기, T5·T6 = 끔)는 하나하나 셈할 때와 같다
//   시점 열쇠 객체가 같은 객체인지에 기대는 구현(시점 열쇠 객체로 결과를 붙잡아 두는 inView 등)은 이 부류 셈이 놓친다 — 부류마다 새 Proxy 를 넘기니. 그런 구현은
//   TIMES 의 같은 객체를 문마다 넘기는 viewsOf 의 하나하나 셈(checkViewsOf)이 잡는다 — 그래서 그 셈은 부류로 줄이지 않는다
const watched = (t) => {
  const reads = new Set()
  let all = false
  const proxy = new Proxy(t, {
    get: (o, k, r) => (reads.add(k), Reflect.get(o, k, r)),
    has: (o, k) => (reads.add(k), Reflect.has(o, k)),
    getOwnPropertyDescriptor: (o, k) => (reads.add(k), Reflect.getOwnPropertyDescriptor(o, k)),
    ownKeys: (o) => ((all = true), Reflect.ownKeys(o)),
  })
  return { proxy, within: (allowed) => !all && [...reads].every((k) => allowed.includes(k)) }
}
/**
 * 시점 열쇠의 부류 — 보기가 읽어도 되는 열쇠 key(없으면 부류 하나)의 값마다, time 이 붙는 시점 열쇠 객체들(TIMES 의 번호).
 * keep(t) 가 거짓인 시점 열쇠는 세지 않는다 (T5·T6 = 끔의 조건). plain: time 이 붙지 않은 문도 세는가
 */
const classesOf = (key, keep = () => true) => {
  const ok = TIMES.map((t, j) => j).filter((j) => j > 0 && keep(TIMES[j]))
  const classes = key === undefined ? [ok] : [true, false, undefined].map((v) => ok.filter((j) => TIMES[j][key] === v))
  return { allowed: key === undefined ? [] : [key], classes: classes.filter((c) => c.length), plain: keep(TIMES[0]) }
}
if (Object.keys(TIMES[0]).length || TIMES.slice(1).some((t) => !Object.keys(t).length)) throw new Error('TIMES 의 첫째만 {} 가 아니다')
/** 문 g·timeOnly 에서 부류마다 check(문) 를 대표 하나로 (위 주석) — 읽은 것이 allowed 밖이면 부류의 문마다. time 없는 문은 따로. 센 문의 수를 돌려준다 */
const overTimes = (g, only, { allowed, classes, plain }, check) => {
  let n = 0
  if (plain) {
    check(gateOf(g, TIMES[0], only))
    n++
  }
  for (const members of classes) {
    const w = watched(TIMES[members[0]])
    const mine = (held = [])
    try {
      check({ ...g, time: w.proxy, ...(only ? { timeOnly: true } : {}) })
    } finally {
      held = null
    }
    if (mine.length === 0 && w.within(allowed)) n += members.length
    else
      for (const j of members) {
        check(gateOf(g, TIMES[j], only))
        n++
      }
  }
  return n
}
const VIEW_CLASSES = VIEWS.map(([, v]) => classesOf(v.time === undefined ? undefined : `t${v.time}`))
const T5_CLASSES = classesOf('t5', (t) => t.t5 === undefined)
const T6_CLASSES = classesOf('t6', (t) => t.t6 === undefined)
/** 문들이 맞는 보기 마스크 (0 은 빼고 5 절의 문 마스크로) — 보기 집합마다 한 칸 */
const viewUnitSeen = new Uint8Array(1 << VIEWS.length)
/**
 * viewsOf (timeline.ts) 는 모든 시점 열쇠를 읽어 부류로 줄지 않는다 — 페이즈 열쇠 ALL[i]·timeOnly 의 문을 시점 열쇠마다 하나하나. time 이 붙는 문은
 * 하나를 지어 time 만 바꿔 넘긴다 (viewsOf 는 부르는 동안 문을 읽기만 하고 붙잡아 두지 않는다 — 문마다 새로 짓던 것과 같은 입력이다. viewsOf·inView 가 문 객체마다
 * 결과를 붙잡아 두게 바뀌면 거짓 실패가 나니 그때는 j 마다 새 문을 짓는다). 센 문의 수를 돌려준다
 */
function checkViewsOf(i, only) {
  const g = ALL[i]
  const timed = { ...g, time: TIMES[1], ...(only ? { timeOnly: true } : {}) }
  for (let j = 0; j < TIMES.length; j++) {
    let gate = timed
    if (j === 0) gate = gateOf(g, TIMES[0], only)
    else timed.time = TIMES[j]
    const m = wantMask(i, j, only)
    // 비트로 옮긴 셈이 litView 와 같은가 — 시점 열쇠가 없는 문에서 (시점 열쇠는 timeSet·timeTrue 가 litView 의 '열쇠가 있으면 그 값' 그대로다)
    if (j === 0 && m !== vmask({ levels: LEVELS.filter((l) => litView(gate, { level: l })), times: TKEYS.map(([, t]) => t).filter((t) => litView(gate, { level: PERIOD_LEVEL[t], time: t })) }))
      throw new Error(`이 시험의 비트 셈이 litView 와 다르다: ${show(gate)}`)
    const vs = timeline.viewsOf(gate)
    if (!sameViews(vs, wantOf(m))) fail(`viewsOf(${show(gate)}) = ${show(vs)}`)
    viewUnitSeen[m] = 1
  }
  return TIMES.length
}
let viewCases = 0
let viewsOfCases = 0
for (let i = 0; i < ALL.length; i++) {
  const g = ALL[i]
  for (const only of [false, true]) {
    VIEWS.forEach(([name, v], vi) => {
      viewCases += overTimes(g, only, VIEW_CLASSES[vi], (gate) => {
        const want = litView(gate, v)
        const got = sagas.inView(gate, v)
        if (got !== want) fail(`inView(${show(gate)}, ${name}) = ${got}, 기대 ${want}`)
        if (v.time === undefined && !only && got !== sagas.inPhase(gate, v.level)) fail(`inView(${show(gate)}, ${name}) 가 사가 보기에서 inPhase 와 다르다`)
      })
    })
    // 6. T5 는 phase6·t5 가 없는 문에서 끔(L0)과 같다 — 셈(litView·sagaStart)에 기대지 않는다
    if (g.phase6 === undefined)
      t5Cases += overTimes(g, only, T5_CLASSES, (gate) => {
        if (sagas.inView(gate, T5) !== sagas.inView(gate, L0)) fail(`inView(${show(gate)}, T5) 가 끔(L0)과 다르다`)
      })
    // 6. T6 은 phase7·phase8·t6 이 없는 문에서 끔(L0)과 같다 — 셈에 기대지 않는다
    if (g.phase7 === undefined && g.phase8 === undefined)
      t6Cases += overTimes(g, only, T6_CLASSES, (gate) => {
        if (sagas.inView(gate, T6) !== sagas.inView(gate, L0)) fail(`inView(${show(gate)}, T6) 가 끔(L0)과 다르다`)
      })
    viewsOfCases += checkViewsOf(i, only)
  }
}
for (const [, t] of TKEYS) if (show(timeline.timeGateView(t)) !== show({ level: PERIOD_LEVEL[t], time: t })) fail(`timeGateView(${t}) = ${show(timeline.timeGateView(t))}`)

// 5. gatesForViews — 보기의 부분집합 모두 (단계 l 은 l 번 비트, 시점 t 는 (단계 수 + t - 1) 번 비트)
const VBITS = VIEWS.length
/** 시점이 사가 보기에서 따르는 단계 — 그 바탕 단계, 그 단계가 사가 보기에 없으면(T6 의 8) 끔 (phase…phase6 이 모두 꺼진다) */
const followLevel = (t) => (LEVELS.includes(PERIOD_LEVEL[t]) ? PERIOD_LEVEL[t] : 0)
// 문 마스크 — 4 절에서 이 시험의 셈(wantMask)이 문마다 낸 보기 마스크들 (0 은 빼고). viewsOf 가 낸 것이 아니라서 가장 적은 수의 기준은 구현에 기대지 않는다 —
// 그래서 viewsOf 가 틀리면 5 절의 실패 수가 예전(viewsOf 의 마스크로 기준을 세우던) 시험과 다를 수 있다. 잡는지는 같다
const viewUnits = [...viewUnitSeen.keys()].filter((m) => m !== 0 && viewUnitSeen[m])
// 가장 적은 수 — 0 에서 문 마스크를 하나씩 더해 닿는 너비 우선 (정확히 덮는 길은 입력 안의 문만 쓴다)
// (보기 집합마다의 칸 — -1 은 닿지 않음. 닿지 않은 집합은 Infinity 로 읽는다)
const viewDepth = new Int8Array(1 << VIEWS.length).fill(-1)
viewDepth[0] = 0
const unitArr = Int32Array.from(viewUnits)
let layer = [0]
while (layer.length) {
  const next = []
  for (const f of layer)
    for (let k = 0; k < unitArr.length; k++) {
      const u = f | unitArr[k]
      if (viewDepth[u] < 0) {
        viewDepth[u] = viewDepth[f] + 1
        next.push(u)
      }
    }
  layer = next
}
const viewMin = { get: (m) => (viewDepth[m] < 0 ? Infinity : viewDepth[m]) }
for (let mask = 0; mask < 1 << VBITS; mask++) {
  const vs = unmask(mask)
  let gates
  try {
    gates = timeline.gatesForViews(vs)
  } catch (e) {
    fail(`gatesForViews(${show(vs)}) 가 던졌다: ${e.message}`)
    continue
  }
  let union = 0
  for (const g of gates) {
    const m = vmask(timeline.viewsOf(g))
    if (m === 0) fail(`gatesForViews(${show(vs)}) 의 문 ${show(g)} 은 어느 보기에도 맞지 않는다`)
    if ((m & ~mask) !== 0) fail(`gatesForViews(${show(vs)}) 의 문 ${show(g)} 이 입력 밖 보기에도 맞는다`)
    union |= m
  }
  if (union !== mask) fail(`gatesForViews(${show(vs)}) 의 합집합이 ${show(unmask(union))}`)
  if (gates.length !== viewMin.get(mask)) fail(`gatesForViews(${show(vs)}) 의 문이 ${gates.length}개 — 가장 적은 수는 ${viewMin.get(mask)}`)
  // 사가 보기만의 문(시점은 그 바탕 단계를 따르는 집합)은 gatesFor 와 같은 수
  const sagaOnly = TKEYS.every(([, t]) => vs.times.includes(t) === vs.levels.includes(followLevel(t)))
  if (sagaOnly && gates.length !== gatesFor(vs.levels).length) fail(`gatesForViews(${show(vs)}) 의 문 수가 gatesFor(${show(vs.levels)}) 와 다르다`)
}
const VIEW_TABLE = [
  [{ levels: [4, 5], times: [3] }, [{ phase4: true, time: { t4: false } }]],
  [{ levels: [], times: [1] }, [{ time: { t1: true }, timeOnly: true }]],
  [{ levels: [1, 2, 3], times: [1, 2] }, [{ phase: true }]],
  [{ levels: [1, 2, 3], times: [1] }, [{ phase: true, time: { t2: false } }]],
]
for (const [vs, want] of VIEW_TABLE) {
  const got = timeline.gatesForViews(vs)
  if (show(got) !== show(want)) fail(`gatesForViews(${show(vs)}) = ${show(got)}, 표는 ${show(want)}`)
}

if (failed) {
  console.error(`${failed}개 실패`)
  process.exit(1)
}
console.log(
  `문 ${ALL.length}개 levelsOf, 부분집합 ${SUBSETS}개 gatesFor 왕복·최소, 명세 표 ${TABLE.length}줄, inView ${viewCases}경우(문 ${viewsOfCases} × 보기 ${VIEWS.length}), 보기 부분집합 ${1 << VBITS}개 gatesForViews 왕복·최소, 표 ${VIEW_TABLE.length}줄, T5 = 끔 ${t5Cases}경우, T6 = 끔 ${t6Cases}경우 — 모두 맞다`,
)
