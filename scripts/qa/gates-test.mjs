// 페이즈 문 셈의 시험 — src/data/sagas.ts 의 levelsOf·gatesFor (명세 §3.1).
//   node scripts/qa/gates-test.mjs [모듈 경로 — 기본 src/data/sagas.ts. 같은 이름을 내는 다른 구현을 시험할 때]
// 1. levelsOf: 문 243개(phase·phase2·phase3·phase4·phase5 가 각각 없음·true·false) 모두에서, 이 시험이 따로 셈한 단계 집합
//    (inPhase 와 같은 규칙 — 이어 센 n 이 켜졌다 = sagaStart(단계) ≤ n ≤ 단계, 0 은 끔)과 같은가. sagas.ts 에 inPhase 가 있으면 그것과도 견준다
// 2. gatesFor: 0..5 의 부분집합 64개 모두에서 결과 문들의 levelsOf 합집합이 입력과 같고(왕복), 문 하나하나가 입력 안이며,
//    문의 수가 가장 적은가(243개 문으로 셈한 최소 덮개). 입력 차례가 달라도 결과가 같은가
// 3. 명세 §3.1 의 표와 같은가
// 시험할 모듈에 gatesFor·levelsOf 가 없으면(다른 구현을 시험할 때 등) 알리고 2 로 끝난다.
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const sagas = await import(process.argv[2] ? pathToFileURL(path.resolve(process.argv[2])).href : '../../src/data/sagas.ts')

const { sagaStart, gatesFor, levelsOf } = sagas
if (typeof gatesFor !== 'function' || typeof levelsOf !== 'function') {
  console.error('시험할 모듈에 gatesFor·levelsOf 가 없다 — 시험을 건너뛴다.')
  process.exit(2)
}

const KEYS = [
  ['phase', 1],
  ['phase2', 2],
  ['phase3', 3],
  ['phase4', 4],
  ['phase5', 5],
]
const LEVELS = [0, 1, 2, 3, 4, 5]
let failed = 0
const fail = (msg) => {
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

// 문 243개
const ALL = [{}]
for (const [k] of KEYS) {
  const next = []
  for (const g of ALL) for (const v of [undefined, true, false]) next.push(v === undefined ? { ...g } : { ...g, [k]: v })
  ALL.splice(0, ALL.length, ...next)
}
if (ALL.length !== 243) throw new Error(`문이 ${ALL.length}개`)

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
for (let target = 1; target < 64; target++) {
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

// 2. gatesFor — 64 부분집합 왕복
for (let mask = 0; mask < 64; mask++) {
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

// 3. 명세 §3.1 의 표
const TABLE = [
  [[5], [{ phase5: true }]],
  [[4], [{ phase4: true, phase5: false }]],
  [[4, 5], [{ phase4: true }]],
  [[1, 2, 3], [{ phase: true }]],
  [[1, 2], [{ phase: true, phase3: false }]],
  [[1, 2, 3, 4, 5], [{ phase: true }, { phase4: true }]],
  [[0, 3, 4, 5], [{ phase: false }, { phase3: true }]],
]
for (const [levels, want] of TABLE) {
  const got = gatesFor(levels)
  if (show(norm(got)) !== show(norm(want))) fail(`gatesFor(${show(levels)}) = ${show(got)}, 명세 표는 ${show(want)}`)
}

if (failed) {
  console.error(`${failed}개 실패`)
  process.exit(1)
}
console.log(`문 243개 levelsOf, 부분집합 64개 gatesFor 왕복·최소, 명세 표 ${TABLE.length}줄 — 모두 맞다`)
