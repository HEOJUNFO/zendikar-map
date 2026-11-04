// 시점별 보기의 시점 셈(src/data/timeline.ts) 시험 — 지어낸 카드로 셈의 모양을 본다 (개발 서버가 필요 없다).
//   node scripts/qa/timeline-test.mjs
// - 같은 개체 묶음 여럿(time.same 목록 — 두 인물을 함께 그린 카드): V1(목록의 모양), V4(어느 묶음으로든 한 시점에 하나), 정하지 않은 시점(pendingDecisions — 묶음
//   하나라도 같은 카드가 그 시점을 맡으면 정할 것이 없다)
// 실제 phaseN.ts 는 '지금 데이터가 이 검사를 지나는지'만 본다. 하나라도 어긋나면 종료 코드 1
import { BY_PHASE } from '../phase-cards.mjs'
import { pendingDecisions, sameOf, timeProblems, TIMES } from '../../src/data/timeline.ts'

let failed = 0
const ok = (cond, msg) => {
  if (cond) console.log(`✓ ${msg}`)
  else {
    failed++
    console.log(`✗ ${msg}`)
  }
}
/** 문제 글 가운데 그 검사(V1 …)이고 그 카드 id 를 말하는 것 */
const hits = (problems, code, id) => problems.filter((p) => p.startsWith(`${code}:`) && p.includes(id))
/** 숨긴 시점(지금 T6)마다 정하지 않은 카드 id */
const pendingIds = (cards) => new Map([...pendingDecisions(cards)].map(([t, list]) => [t, list.map((c) => c.id)]))
const HIDDEN = TIMES.find((x) => x.hidden)?.t

// 지어낸 카드 — 유형 줄이 있어 '있는 것'으로 센다 (V11·정할 일)
const thing = (id, name, set, time) => ({ id, name, set, typeLine: 'Legendary Creature — Test', ...(time ? { time } : {}) })

// ── 같은 개체 묶음 여럿 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const a = thing('t-a-2020', 'Test A', 'znr', { at: [5], same: 'test-a', estimate: '시험' })
  const b = thing('t-b-2020', 'Test B', 'znr', { at: [5], same: 'test-b', estimate: '시험' })
  const pair = thing('t-a-and-b', 'Test A and B', 'mom', { at: [6], same: ['test-a', 'test-b'], estimate: '시험' })
  const p = timeProblems([a, b, pair], true)
  ok(sameOf(pair).join() === 'test-a,test-b' && sameOf(a).join() === 'test-a' && sameOf(thing('x', 'X', 'znr')).length === 0, 'sameOf — 문자열은 하나, 목록은 그대로, 없으면 빈 목록')
  ok(!p.some((x) => x.startsWith('V4:')), 'V4 — 두 묶음에 든 카드가 저마다의 카드와 다른 시점이면 겹치지 않는다')
  if (HIDDEN === 6) {
    const pend = pendingIds([a, b, pair]).get(6) ?? []
    ok(!pend.includes('t-a-2020') && !pend.includes('t-b-2020'), 'pendingDecisions — 두 묶음에 든 카드가 그 시점을 맡으면 두 인물 저마다의 카드는 정할 것이 없다')
    const alone = pendingIds([a, b]).get(6) ?? []
    ok(alone.includes('t-a-2020') && alone.includes('t-b-2020'), 'pendingDecisions — 맡는 카드가 없으면 두 카드 모두 정할 일로 남는다')
  } else console.log('… 숨긴 시점 6 이 없어 정할 일 시험은 건너뛴다')
  const clash = thing('t-b-2023', 'Test B Again', 'mom', { at: [6], same: 'test-b', estimate: '시험' })
  const q = timeProblems([a, b, pair, clash], true)
  ok(q.some((x) => x.startsWith('V4: same test-b') && x.includes('t-a-and-b') && x.includes('t-b-2023')), 'V4 — 둘째 묶음으로도 한 시점에 둘이면 멈춘다')
  ok(!q.some((x) => x.startsWith('V4: same test-a')), 'V4 — 겹치지 않은 첫째 묶음은 말하지 않는다')
  for (const [same, why] of [
    [[], '빈 목록'],
    [['test-a', 'test-a'], '겹친 id'],
    [['test-a', ''], '빈 id'],
    [['test-a'], '하나뿐인 목록(문자열로 쓴다)'],
  ]) {
    const bad = thing('t-bad', 'Test Bad', 'mom', { at: [6], same, estimate: '시험' })
    ok(hits(timeProblems([bad], false), 'V1', 't-bad').some((x) => x.includes('.same')), `V1 — same 목록: ${why} → 멈춘다`)
  }
}

// ── 지금 데이터 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const cards = BY_PHASE.flat()
  const p = timeProblems(cards, true)
  ok(!p.length, `지금 phaseN.ts 가 V1–V5·V11 을 지난다${p.length ? ` — ${p.slice(0, 3).join(' / ')}` : ''}`)
  const pair = cards.find((c) => c.id === 'drana-and-linvala')
  ok(pair && sameOf(pair).join() === 'drana,linvala', 'Drana and Linvala 는 drana·linvala 두 묶음에 든다')
}

console.log(failed ? `✗ ${failed} 개 어긋남` : '✓ 모두 맞다')
process.exit(failed ? 1 : 0)
