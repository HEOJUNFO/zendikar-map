// 시점별 보기(src/data/timeline.ts)의 시점 셈 — 원본 phase<n>.ts(데이터가 있는 페이즈)·cards.ts 를 바로 읽어 시점마다 그리는 카드를 세고 검사한다 (개발 서버가 필요 없다).
//   node scripts/qa/timeline-check.mjs [--expect 575,663,642,613[,0]] [--spans 기준.json] [--list n] [--json 결과.json]
// - 시점마다 그리는 페이즈 카드 수(세트별), 그중 사가 보기가 그 시점에 그리지 않는 카드(근거별: 공식 basis·추정 estimate), 나오는 대지 카드 수
// - 검사: V1–V5·V11(timeline.ts 의 timeProblems — V11 은 이어 그린 대상의 빈 시점에 까닭이 있는지, PER_CARD_FROM 부터의 시점은 앞 시점에 그린 있는 것마다 그 시점의 결정(time.at·time.gone)이 있는지.
//   숨긴 시점의 정하지 않은 카드는 오류가 아니라 남은 일로 따로 센다 — pendingDecisions), V6(src/data/periods/check.ts 의 timeMarkProblems), 시점별 그림 묶음(src/map/figures-time/groups.json —
//   세트 시점이 아닌 시점에 그리는 그림마다 그 시점들을 이름 끝에 단 묶음 하나, 파일이 있어야 한다. 낡았으면 node scripts/figures/to_ts.mjs) — 어긋나면 종료 코드 1
// - --expect: 시점마다의 카드 수가 이 값과 다르면 종료 코드 1 — 모든 시점(timeline.ts 의 TIMES 차례, 숨긴 시점도)의 값이거나, 보이는 시점(SHOWN_TIMES)만의 값
// - --spans: 카드마다의 기준 시점 목록 [{ id, points: ['T1', …] }, …] (분류 표)과 견줘 다른 카드를 보인다
import fs from 'node:fs'
import { LAND_CARDS } from '../../src/data/cards.ts'
import { BY_PHASE } from '../phase-cards.mjs'
import { timeMarkProblems } from '../../src/data/periods/check.ts'
import { locations } from '../../src/data/locations.ts'
import { drawnAt, extraTimesOf, homeOf, landAt, pendingDecisions, sagaSpanOf, SHOWN_TIMES, TIMES, timeProblems, timesOf } from '../../src/data/timeline.ts'

const arg = (n) => {
  const i = process.argv.indexOf(`--${n}`)
  return i > 0 ? process.argv[i + 1] : undefined
}
const EXPECT = arg('expect')?.split(',').map(Number)
const SPANS = arg('spans')
const LIST = Number(arg('list') ?? 0)
const JSON_OUT = arg('json')
const CARDS = BY_PHASE.flat()
let failed = false

// 검사
const problems = timeProblems(CARDS, true)
/** 사가에 매인, 장소와 하나인 대지 카드 (src/data/index.ts 의 sagaPlaceCards 와 같은 셈) */
const sagaPlaceCards = new Map()
for (const c of LAND_CARDS) {
  if (c.saga === undefined || c.depicts.type !== 'location') continue
  const place = locations.find((l) => l.id === c.depicts.id)
  if (place && place.placement !== 'unplaced' && [place.name, ...(place.aliases ?? [])].includes(c.name)) sagaPlaceCards.set(place.id, c)
}
problems.push(...timeMarkProblems({ phaseCards: CARDS, landCards: LAND_CARDS, sagaPlaceCards }))
// 시점별 그림 묶음 — scripts/figures/to_ts.mjs 의 timeGroupOf 가 만든 표가 지금 카드의 시점과 맞는가
{
  const dir = new URL('../../src/map/figures-time/', import.meta.url)
  const table = JSON.parse(fs.readFileSync(new URL('groups.json', dir), 'utf8'))
  const hasArt = new Set(fs.readdirSync(new URL('../figures/art/', import.meta.url)).map((f) => f.replace(/\.js$/, '')))
  for (const c of CARDS) {
    const extra = extraTimesOf(c)
    const g = table[c.id]
    if (!extra.length || !hasArt.has(c.id)) {
      if (g) problems.push(`시점별 그림 묶음: ${c.id} 는 세트 시점에만 그리는데 표에 '${g}' 가 있다 (node scripts/figures/to_ts.mjs > src/map/figures.ts)`)
      continue
    }
    if (!g || !g.endsWith(`-t${extra.join('')}`) || !fs.existsSync(new URL(`${g}.ts`, dir)))
      problems.push(`시점별 그림 묶음: ${c.id} (세트 시점이 아닌 시점 ${extra.join('·')}) 의 묶음이 '${g ?? '없음'}' 이다 (node scripts/figures/to_ts.mjs > src/map/figures.ts)`)
  }
}
for (const p of problems) console.log(`✗ ${p}`)
if (problems.length) failed = true
// 숨긴 시점(내용을 채우는 중)마다 아직 정하지 않은 카드 — 오류가 아니라 남은 일 (숨김을 풀면 V11 오류)
for (const [t, list] of pendingDecisions(CARDS)) {
  const n = LIST || 12
  console.log(
    `… T${t} 남은 결정 ${list.length} — 앞 시점에 그린 있는 것마다 이어 그릴지(time.at 에 ${t}), 사라졌는지(time.gone 에 ${t} 와 까닭)를 숨김을 풀기 전에 정한다: ${list
      .slice(0, n)
      .map((c) => c.id)
      .join(', ')}${list.length > n ? ` 외 ${list.length - n}` : ''}`,
  )
}

// 셈
const out = { times: {}, extended: {} }
for (const { t, name, years, hidden } of TIMES) {
  const shown = CARDS.filter((c) => drawnAt(c, t))
  const bySet = {}
  for (const c of shown) bySet[c.set.toUpperCase()] = (bySet[c.set.toUpperCase()] ?? 0) + 1
  const ext = shown.filter((c) => !sagaSpanOf(c).includes(t))
  const lands = LAND_CARDS.filter((c) => landAt(c, t)).length
  out.times[t] = { cards: shown.length, bySet, outsideSaga: ext.length, lands }
  console.log(`T${t} ${name}(${years})${hidden ? ' [숨김]' : ''}: 카드 ${shown.length} ${JSON.stringify(bySet)} · 사가 보기 밖 ${ext.length} · 대지 카드 ${lands}`)
  if (LIST) console.log(`   ${ext.slice(0, LIST).map((c) => c.id).join(', ')}${ext.length > LIST ? ` 외 ${ext.length - LIST}` : ''}`)
}
const ext = CARDS.filter((c) => timesOf(c).some((t) => !sagaSpanOf(c).includes(t)))
const bySet = {}
for (const c of ext) bySet[c.set.toUpperCase()] = (bySet[c.set.toUpperCase()] ?? 0) + 1
const official = ext.filter((c) => c.time?.basis).length
const judgment = ext.filter((c) => !c.time?.basis).length
const narrower = CARDS.filter((c) => sagaSpanOf(c).some((t) => !timesOf(c).includes(t))).length
const homed = CARDS.filter((c) => c.time?.home !== undefined).map((c) => `${c.id}→T${homeOf(c)}`)
out.extended = { total: ext.length, bySet, official, judgmentOnly: judgment, narrower, homed }
console.log(`사가 보기 밖의 시점에도 그리는 카드 ${ext.length} ${JSON.stringify(bySet)} — 공식 근거 ${official}(추정을 함께 단 것 포함) · 추정만 ${judgment}`)
console.log(`사가 보기보다 좁게 그리는 카드 ${narrower} · 세트 시점이 아닌 시점(home) ${homed.join(', ') || '없음'}`)

if (EXPECT) {
  // 모든 시점의 값이거나 보이는 시점만의 값
  const list = EXPECT.length === TIMES.length ? TIMES : EXPECT.length === SHOWN_TIMES.length ? SHOWN_TIMES : undefined
  if (!list) {
    console.log(`✗ --expect 의 값 ${EXPECT.length}개 — 모든 시점 ${TIMES.length}개나 보이는 시점 ${SHOWN_TIMES.length}개의 카드 수를 준다`)
    process.exit(1)
  }
  const got = list.map(({ t }) => out.times[t].cards)
  if (got.join() !== EXPECT.join()) {
    console.log(`✗ 시점마다의 카드 수 ${got.join('/')} ≠ 기대 ${EXPECT.join('/')}`)
    failed = true
  } else console.log(`시점마다의 카드 수가 기대와 같다 (${got.join('/')})`)
}
if (SPANS) {
  const rows = JSON.parse(fs.readFileSync(SPANS, 'utf8'))
  const want = new Map(rows.map((r) => [r.id, r.points.map((p) => Number(String(p).replace(/^T/, '')))]))
  const diff = CARDS.filter((c) => want.has(c.id) && want.get(c.id).join() !== timesOf(c).join())
  const missing = CARDS.filter((c) => !want.has(c.id))
  for (const c of diff) console.log(`  ≠ ${c.id}: 기준 [${want.get(c.id).join(', ')}] · 지금 [${timesOf(c).join(', ')}]`)
  console.log(`기준 시점 목록과 다른 카드 ${diff.length}${missing.length ? ` · 기준에 없는 카드 ${missing.length}` : ''}`)
}
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 1))
process.exit(failed ? 1 : 0)
