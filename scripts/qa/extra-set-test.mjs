// 이야기 세트 밖의 제품의 카드(사용자 결정 2026-11-06 — src/data/extraSets.ts) 시험 — 지어낸 카드로 셈의 모양을 본다 (개발 서버가 필요 없다).
//   node scripts/qa/extra-set-test.mjs
// - 세트 검사 E0–E4 (src/data/extraCard.ts 의 setProblems): 이야기 세트의 카드에 era 를 달지 않는다(E1), 이야기 세트 밖의 카드는 EXTRA_SETS·sagaSet·era.released(E2),
//   그 무렵이 처음 인쇄된 날 뒤가 아니다(E3), era 글에 그 무렵의 해(E4), 그 무렵이 그 파일의 페이즈(E0)
// - 무렵의 기본값 defaultEraSet (처음 인쇄된 날까지 나온 가장 늦은 이야기 세트 — 같은 날은 든다, ZEN 앞이면 ZEN), isCarriedOver(다시 실은 앞 사가 카드만),
//   isEffect(모험 카드는 앞의 면으로), V1(같은 개체의 이야기 세트 카드가 그 해를 맡는 이야기 세트 밖의 카드는 time.at 을 비울 수 있다 — D3)
// - 실제 phaseN.ts: 모든 카드가 E0–E4 를 지나고, 이야기 세트 밖의 카드는 54장, 차원 카드(Plane)는 place 로 실린다
// 하나라도 어긋나면 종료 코드 1
import { BY_PHASE } from '../phase-cards.mjs'
import { continents } from '../../src/data/continents.ts'
import { setProblems } from '../../src/data/extraCard.ts'
import { defaultEraSet, EXTRA_SETS, isStorySet, STORY_RELEASED } from '../../src/data/extraSets.ts'
import { SAGAS } from '../../src/data/sagas.ts'
import { homeOf, isCarriedOver, isEffect, sagaSpanOf, timeProblems } from '../../src/data/timeline.ts'

let failed = 0
const ok = (cond, msg) => {
  if (cond) console.log(`✓ ${msg}`)
  else {
    failed++
    console.log(`✗ ${msg}`)
  }
}
const codes = (problems) => problems.map((p) => p.slice(0, p.indexOf(':')))
const has = (problems, code) => codes(problems).includes(code)

// ── 무렵의 기본값 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
ok(defaultEraSet('2020-09-25') === 'znr', "defaultEraSet — 같은 날 나온 이야기 세트는 든다 (ZNC 2020-09-25 → znr)")
ok(defaultEraSet('2009-09-04') === 'zen' && defaultEraSet('2009-09-30') === 'zen', 'defaultEraSet — ZEN 보다 먼저면 zen (Planechase 의 Murasa, DCI 의 Tazeem)')
ok(defaultEraSet('2019-07-12') === 'ogw' && defaultEraSet('2015-07-17') === 'roe' && defaultEraSet('2024-11-15') === 'mat', 'defaultEraSet — M20 → ogw, ORI → roe, FDN → mat')
ok(Object.keys(STORY_RELEASED).join() === SAGAS.flatMap((s) => s.sets).join(), 'STORY_RELEASED 는 sagas.ts 의 세트를 같은 차례로 담는다')
ok(Object.values(STORY_RELEASED).every((d, i, a) => i === 0 || a[i - 1] < d), 'STORY_RELEASED 의 날은 세트 차례대로 늘어난다')
ok(Object.keys(EXTRA_SETS).every((k) => k === k.toLowerCase() && !isStorySet(k)), 'EXTRA_SETS 는 소문자 코드이고 이야기 세트가 아니다')
let threw = false
try {
  defaultEraSet('2024')
} catch {
  threw = true
}
ok(threw, 'defaultEraSet — 날짜 꼴이 아니면 던진다')

// ── 세트 검사 E0–E4 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const extra = (over) => ({ name: 'Test Extra', set: 'mh3', sagaSet: 'ogw', era: { released: '2024-06-14', estimate: '시험 — 2016년' }, ...over })
ok(setProblems(extra(), 'phase5.ts', 5).length === 0, 'E — 이야기 세트 밖의 카드: 제품·무렵·처음 인쇄된 날·해가 맞으면 지난다')
ok(setProblems({ name: 'Story', set: 'ogw' }, 'phase5.ts', 5).length === 0, 'E — 이야기 세트의 카드는 sagaSet·era 없이 지난다')
ok(setProblems({ name: 'Carried', set: 'znr', sagaSet: 'mom' }, 'phase7.ts', 7).length === 0, 'E — 다시 실은 앞 사가 카드는 sagaSet 만으로 지난다')
ok(has(setProblems({ name: 'Story', set: 'ogw', era: { released: '2016-01-22', basis: '2016' } }, 'phase5.ts', 5), 'E1'), 'E1 — 이야기 세트의 카드에 era 를 달면 멈춘다')
ok(has(setProblems({ name: 'Story', set: 'mom', sagaSet: 'znr' }, 'phase6.ts', 6), 'E1'), 'E1 — 이야기 세트의 sagaSet 은 앞 사가의 카드에만')
ok(has(setProblems(extra({ sagaSet: undefined }), 'phase5.ts', 5), 'E2'), 'E2 — 이야기 세트 밖의 카드에 sagaSet 이 없으면 멈춘다 (m20 의 levelOfSet 으로 던지지 않는다)')
ok(has(setProblems(extra({ set: 'xyz' }), 'phase5.ts', 5), 'E2'), 'E2 — EXTRA_SETS 에 없는 세트는 멈춘다')
ok(has(setProblems(extra({ era: { released: '2024', estimate: '2016' } }), 'phase5.ts', 5), 'E2'), 'E2 — era.released 가 날짜가 아니면 멈춘다')
ok(has(setProblems(extra({ era: undefined }), 'phase5.ts', 5), 'E2'), 'E2 — era 가 없으면 멈춘다')
ok(has(setProblems(extra({ set: 'ori', sagaSet: 'mat', era: { released: '2015-07-17', estimate: '2023' } }), 'phase8.ts', 8), 'E3'), 'E3 — 처음 인쇄된 날(2015) 뒤의 무렵(2023)은 멈춘다')
ok(!has(setProblems(extra({ set: 'mh3', sagaSet: 'zen', era: { released: '2024-06-14', estimate: '2009년 앞의 장면' } }), 'phase1.ts', 1), 'E3'), 'E3 — 앞선 무렵(2009)은 지난다')
ok(has(setProblems(extra({ era: { released: '2024-06-14', estimate: '해가 없는 글' } }), 'phase5.ts', 5), 'E4'), 'E4 — era 글에 그 무렵의 해가 없으면 멈춘다')
ok(has(setProblems(extra({ era: { released: '2024-06-14' } }), 'phase5.ts', 5), 'E4'), 'E4 — era 에 basis·estimate 가 없으면 멈춘다')
ok(!has(setProblems(extra({ era: { released: '2024-06-14', basis: true } }), 'phase5.ts', 5), 'E4'), 'E4 — 지도 조각(글이 있는지만)은 해를 보지 않는다')
ok(has(setProblems(extra(), 'phase4.ts', 4), 'E0'), 'E0 — 무렵(ogw)이 그 파일의 페이즈(4)가 아니면 멈춘다')

// ── 다시 실은 카드·장면 셈 ──────────────────────────────────────────────────────────────────────────────────────────────────────────
ok(isCarriedOver({ set: 'znr', sagaSet: 'mom' }) && !isCarriedOver({ set: 'm20', sagaSet: 'ogw' }) && !isCarriedOver({ set: 'znr' }), 'isCarriedOver — 이야기 세트의 카드에 sagaSet 이 있을 때만')
ok(!isEffect({ typeLine: 'Creature — Kor Rogue // Sorcery — Adventure' }) && isEffect({ typeLine: 'Sorcery // Land' }), 'isEffect — 두 면을 적은 유형 줄은 앞의 면으로 센다')
const m20 = { id: 't-m20', name: 'Test M20', set: 'm20', sagaSet: 'ogw', typeLine: 'Creature — Test' }
ok(homeOf(m20) === 4 && sagaSpanOf(m20).join() === '4', '이야기 세트 밖의 카드도 그 무렵(sagaSet)의 시점·사가 보기로 센다 (M20 ⇢ OGW = 2016)')

// ── V1 — 같은 개체의 이야기 세트 카드가 그 해를 맡는 이야기 세트 밖의 카드 (D3) ─────────────────────────────────────────────────────
{
  const story = { id: 't-nissa-zen', name: 'Test Nissa', set: 'zen', typeLine: 'Planeswalker — Test', time: { at: [1, 2], same: 'test-nissa', estimate: '시험' } }
  const young = (time) => ({ id: 't-nissa-ori', name: 'Test Young Nissa', set: 'ori', sagaSet: 'zen', typeLine: 'Creature — Test', time })
  const said = { at: [], same: 'test-nissa', estimate: '2009년은 같은 개체의 카드가 맡는다' }
  const p = timeProblems([story, young(said)], true)
  ok(!p.some((x) => x.startsWith('V1:') || x.startsWith('V2:')), 'V1 — 같은 개체의 이야기 세트 카드가 그 해(2009)를 맡으면 이야기 세트 밖의 카드는 time.at 을 비울 수 있다')
  ok(timeProblems([story, young({ ...said, estimate: '해가 없는 글' })], true).some((x) => x.startsWith('V2:')), 'V2 — 그때도 그 해(2009)를 밝힌 까닭이 있어야 한다')
  ok(timeProblems([young(said)], true).some((x) => x.startsWith('V1:')), 'V1 — 그 해를 맡는 같은 개체의 카드가 없으면 멈춘다')
  const storyEmpty = { id: 't-story', name: 'Test Story', set: 'zen', typeLine: 'Creature — Test', time: { at: [], same: 'test-nissa', estimate: '2009' } }
  ok(timeProblems([story, storyEmpty], true).some((x) => x.startsWith('V1:') && x.includes('t-story')), 'V1 — 이야기 세트의 카드는 같은 개체가 있어도 (until 없이) 비울 수 없다')
}

// ── 실제 데이터 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const problems = BY_PHASE.flatMap((cards, i) => cards.flatMap((c) => setProblems(c, `phase${i + 1}.ts`, i + 1)))
  ok(problems.length === 0, `phaseN.ts — 모든 카드가 E0–E4 를 지난다${problems.length ? `\n  ${problems.slice(0, 8).join('\n  ')}` : ''}`)
  const extras = BY_PHASE.flat().filter((c) => !isStorySet(c.set))
  ok(extras.length === 54, `이야기 세트 밖의 카드 ${extras.length}장 (54)`)
  ok(!BY_PHASE.flat().some((c) => c.id === 'anowon-the-ruin-sage-2020'), '다시 실은 Anowon(anowon-the-ruin-sage-2020)은 내렸다 — Anowon, the Ruin Thief 가 그 자리를 맡는다 (D4)')
  const planes = extras.filter((c) => /\bPlane\b/.test(c.typeLine))
  ok(planes.length === 4 && planes.every((c) => c.place && c.size === 0), '차원 카드 4장은 그림 없이 그곳 패널에 (place)')
  const onLand = planes.filter((c) => c.depicts.type === 'continent')
  ok(onLand.every((c) => continents.find((x) => x.id === c.depicts.id)?.name === c.name), '대륙과 하나인 차원 카드는 대륙 이름과 같다 (Tazeem·Murasa·Akoum)')
  const judged = extras.filter((c) => c.era?.estimate && !c.era?.basis).length
  console.log(`  — 무렵이 이 지도의 판단인 카드 ${judged}장, 글이 밝힌 카드 ${extras.length - judged}장`)
}

console.log(failed ? `\n${failed}개 어긋남` : '\n모두 맞다')
process.exit(failed ? 1 : 0)
