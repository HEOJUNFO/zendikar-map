// 시점별 보기의 시점 셈(src/data/timeline.ts) 시험 — 지어낸 카드로 셈의 모양을 본다 (개발 서버가 필요 없다).
//   node scripts/qa/timeline-test.mjs
// - 같은 개체 묶음 여럿(time.same 목록 — 두 인물을 함께 그린 카드): V1(목록의 모양), V4(어느 묶음으로든 한 시점에 하나), 정하지 않은 시점(pendingDecisions — 묶음
//   하나라도 같은 카드가 그 시점을 맡으면 정할 것이 없다)
// - 시점별 보기가 그리지 않는 카드(time.at 이 빈 것): 사가 보기가 until 로 끝내 세트 시점의 바탕 단계에 그리지 않는 카드만(V1), 그 해를 밝힌 까닭(V2),
//   다른 시점 필드를 달지 않는다(V1). 어느 시점에도 그리지 않고, 고르면 지금 시점에 머문다(timeToShow)
// - 장소의 '바로 곁'(src/data/landFace.ts 의 nearPlace — V7 이 폐허가 된 장소를 가리키는 그림이 그 장소에 섰는지 본다): 표시에서 FACE_NEAR 안,
//   자리가 없는 장소(에메리아)는 그 장소와 하나인 대지 카드의 표시에서
// 실제 phaseN.ts 는 '지금 데이터가 이 검사를 지나는지'만 본다. 하나라도 어긋나면 종료 코드 1
import { BY_PHASE } from '../phase-cards.mjs'
import { LAND_CARDS } from '../../src/data/cards.ts'
import { FACE_NEAR, nearPlace, placeMarkOf } from '../../src/data/landFace.ts'
import { locations } from '../../src/data/locations.ts'
import { drawnAt, pendingDecisions, sameOf, timeProblems, TIME_POINTS, TIMES, timeToShow } from '../../src/data/timeline.ts'

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

// ── 시점별 보기가 그리지 않는 카드 (time.at: []) ─────────────────────────────────────────────────────────────────────────────────────
{
  // MOM(사가4 페이즈1, 단계 7)의 장면 — until: 1 로 단계 8(MAT) 에서 끝난다. 세트 시점 6 의 바탕은 단계 8 이라 그 무렵 모습과 모순된다
  const scene = { id: 't-scene', name: 'Test Scene', set: 'mom', until: 1, typeLine: 'Sorcery', time: { at: [], basis: '2023년(전쟁 뒤)의 바탕에는 이 장면의 하늘거주지가 떨어져 없다.' } }
  ok(!timeProblems([scene], true).length, 'until 로 끝난 MOM 장면 — at: [] 와 그 해(2023)를 밝힌 까닭이면 지난다')
  ok(TIME_POINTS.every((t) => !drawnAt(scene, t)), '그리지 않는 카드는 어느 시점에도 그리지 않는다')
  ok(timeToShow(scene, 3, []) === 3 && timeToShow(scene, undefined, []) === 6, 'timeToShow — 그리는 시점이 없으면 지금 시점에 머물고, 시점 밖에서는 세트 시점')
  const noYear = { ...scene, id: 't-no-year', time: { at: [], basis: '전쟁 뒤의 바탕과 모순된다.' } }
  ok(hits(timeProblems([noYear], false), 'V2', 't-no-year').length === 1, 'V2 — 까닭에 그 해(2023)가 없으면 멈춘다')
  const noUntil = { ...scene, id: 't-no-until', until: undefined }
  ok(hits(timeProblems([noUntil], false), 'V1', 't-no-until').some((x) => x.includes('.at 이 비었다')), 'V1 — until 이 없는 카드는 at 을 비울 수 없다')
  const znr = thing('t-znr', 'Test ZNR', 'znr', { at: [], estimate: '2020년' })
  ok(hits(timeProblems([{ ...znr, until: 1 }], false), 'V1', 't-znr').some((x) => x.includes('.at 이 비었다')), 'V1 — 사가 보기가 세트 시점의 바탕 단계에 그리는 카드(ZNR 단계 6)는 at 을 비울 수 없다')
  const extra = { ...scene, id: 't-extra', time: { ...scene.time, moved: { 6: { at: [0, 0] } }, aloft: true } }
  ok(hits(timeProblems([extra], false), 'V1', 't-extra').some((x) => x.includes('moved·aloft')), 'V1 — at 이 빈 카드에 moved·aloft 를 달면 멈춘다')
  ok(!timeProblems([{ ...scene, time: { at: [], basis: true } }], true).length, '지도 조각(basis: true)도 지난다 — 그 해는 원본에서 본다')
  ok(hits(timeProblems([{ ...scene, id: 't-bare', time: { at: [] } }], false), 'V2', 't-bare').length === 1, 'V2 — 까닭이 없으면 멈춘다')
  const person = { ...thing('t-person', 'Test Person', 'mom', { at: [], basis: '2023년(전쟁 뒤)에는 이 자리에 없다.' }), until: 1 }
  ok(!timeProblems([person], true).length, '있는 것도 — 까닭이 있으면 V11 이 빈 시점을 묻지 않는다')
  // same 의 모양은 at 이 빈 카드도 본다 (Drana and Linvala 처럼 여러 묶음을 맡는 카드가 at: [] 이다)
  for (const [same, why] of [
    [['test-a', 'test-a'], '겹친 id'],
    [['test-a'], '하나뿐인 목록'],
  ]) {
    const bad = { ...person, id: 't-bad-empty', time: { ...person.time, same } }
    ok(hits(timeProblems([bad], false), 'V1', 't-bad-empty').some((x) => x.includes('.same')), `V1 — at: [] 카드의 same 목록: ${why} → 멈춘다`)
  }
}

// ── 장소의 바로 곁 (nearPlace) ───────────────────────────────────────────────────────────────────────────────────────────────────
{
  const emeria = locations.find((l) => l.id === 'emeria')
  const mark = placeMarkOf(emeria, LAND_CARDS)
  ok(mark && mark.join() === '967.4,634.6', `자리가 없는 에메리아의 표시는 Emeria, the Sky Ruin 카드 표시다 (${mark?.join(', ')})`)
  ok(nearPlace([mark[0] - 9, mark[1] + 5.4], emeria, LAND_CARDS) === true, '표시 곁(약 11)의 Archpriest of Iona 자리는 그 장소다')
  ok(nearPlace([mark[0] + FACE_NEAR + 1, mark[1]], emeria, LAND_CARDS) === false, `표시에서 ${FACE_NEAR} 넘게 떨어진 자리는 그 장소가 아니다`)
  ok(nearPlace([812, 522], emeria, LAND_CARDS) === false, 'Shepherd of the Lost 의 자리(표시에서 약 192)는 에메리아가 아니다')
  const placed = locations.find((l) => l.placement !== 'unplaced' && l.extent)
  const far = placed.position[0] + Math.max(...placed.extent) + FACE_NEAR - 1
  ok(nearPlace([far, placed.position[1]], placed, LAND_CARDS) === true, `범위 extent 가 있는 장소(${placed.id})는 그 바깥으로 ${FACE_NEAR} 안까지`)
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
