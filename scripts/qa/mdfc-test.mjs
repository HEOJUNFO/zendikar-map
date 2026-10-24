// 양면 카드(MDFC — 주문·생물 // 대지)의 모양 시험 — src/data/landFace.ts 의 셈과 검사(F1–F7), src/data/periods/check.ts 의 대지 면 M1·V6,
// vite/phaseData.ts 의 `?lands` 조각을 지어낸 카드로 본다 (실제 phaseN.ts 는 읽지 않는다 — 데이터가 바뀌어도 이 시험은 그대로다).
//   node scripts/qa/mdfc-test.mjs
// 장소·대지 카드는 실제 locations.ts·cards.ts 를 쓴다: 지도에 있는 장소 turntimber(범위 extent 가 있다), 자리가 없지만 표시가 있는 장소 emeria
// ('Emeria, the Sky Ruin' 카드 표시), 그리고 지어낸 자리 없는·표시 없는 장소. 하나라도 어긋나면 종료 코드 1.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { LAND_CARDS } from '../../src/data/cards.ts'
import { FACE_NEAR, faceBinding, faceEntriesOf, faceEntry, faceIsPlace, landFaceProblems, placeMarkOf } from '../../src/data/landFace.ts'
import { locations } from '../../src/data/locations.ts'
import { periodMarkProblems, timeMarkProblems } from '../../src/data/periods/check.ts'
import { PHASE_SLOTS, slotOf } from '../../src/data/sagas.ts'
import { landAt, TIMES } from '../../src/data/timeline.ts'
import { phaseData } from '../../vite/phaseData.ts'

let failed = 0
const ok = (cond, msg) => {
  if (cond) console.log(`✓ ${msg}`)
  else {
    failed++
    console.log(`✗ ${msg}`)
  }
}
const codes = (problems) => problems.map((p) => p.slice(0, p.indexOf(':')))

// 지어낸 카드 — 마지막 데이터 페이즈(지금 사가2 페이즈2 = 5)에 올린다 (사가3 은 아직 phases: 0 이라 셈할 수 없다)
const LEVEL = PHASE_SLOTS[PHASE_SLOTS.length - 1].level
const turntimber = locations.find((l) => l.id === 'turntimber')
const emeria = locations.find((l) => l.id === 'emeria')
const emeriaMark = placeMarkOf(emeria, LAND_CARDS)
const base = {
  id: 'test-symbiosis-test-wood',
  name: 'Test Symbiosis',
  nameKo: '시험 공생',
  set: 'znr',
  number: '999',
  rarity: 'mythic',
  typeLine: 'Sorcery',
  url: 'https://scryfall.com/card/znr/999/test-symbiosis-test-wood',
  image: 'https://cards.scryfall.io/normal/front/0/0/test.jpg',
  artist: 'Test Artist',
  subject: '시험',
  depicts: { type: 'location', id: 'turntimber' },
  at: turntimber.position,
  size: 20,
  basis: '시험',
  flavor: 'Front flavor.',
  land: { name: 'Turntimber', nameKo: '변화림', typeLine: 'Land', flavor: 'Back flavor.', image: 'https://cards.scryfall.io/normal/back/0/0/test.jpg' },
  sources: [],
}
const card = (over = {}, land = {}) => ({ ...base, ...over, land: { ...base.land, ...land } })
const ctx = { locations, landCards: LAND_CARDS }
const problemsOf = (c, extra = ctx) => landFaceProblems([faceEntry(c, LEVEL)], extra)

// 1. 목록 항목의 모양
{
  const e = faceEntry(card(), LEVEL)
  ok(faceEntry({ ...base, land: undefined }, LEVEL) === null, 'faceEntry: 대지 면이 없는 카드는 null')
  ok(e.id === base.id && e.level === LEVEL && e.front === 'Test Symbiosis' && e.frontKo === '시험 공생', 'faceEntry: 카드 id·페이즈·앞면 이름')
  ok(e.name === 'Turntimber' && e.nameKo === '변화림' && e.typeLine === 'Land' && e.flavor === 'Back flavor.' && e.image.includes('/back/'), 'faceEntry: 대지 면 이름·한국어 이름·유형·플레이버·뒷면 그림')
  ok(!('subject' in e) && !('sources' in e) && e.basis === undefined, 'faceEntry: 근거 글·출처는 싣지 않는다 (있는지만)')
  ok(faceEntry(card({}, { basis: '근거' }), LEVEL).basis === true, 'faceEntry: basis 는 있는지만 (true)')
  ok(faceEntriesOf([[], [card(), { ...base, id: 'x', land: undefined }]]).map((f) => f.level).join() === '2', 'faceEntriesOf: 페이즈 차례의 번호를 단다, 대지 면이 없는 카드는 뺀다')
}

// 2. 장소와 하나인지
ok(faceIsPlace({ name: 'Turntimber' }, turntimber), 'faceIsPlace: 장소 이름과 같으면 그 장소')
ok(faceIsPlace({ name: 'Emeria, Shattered Skyclave' }, emeria), "faceIsPlace: 별칭과 같아도 (emeria 의 'Emeria, Shattered Skyclave')")
ok(!faceIsPlace({ name: 'Test Wood' }, turntimber), 'faceIsPlace: 다르면 아니다')

// 3. 실리는 사가 — sagaBound 면 그 카드의 사가·페이즈, 아니면 늘 (대지 카드의 saga·sagaPhase 와 같은 셈)
{
  const slot = slotOf(LEVEL)
  const bound = faceBinding({ level: LEVEL, sagaBound: true })
  ok(bound.saga === slot.saga && bound.sagaPhase === slot.local, `faceBinding: sagaBound 면 사가${slot.saga} 페이즈${slot.local}`)
  ok(Object.keys(faceBinding({ level: LEVEL })).length === 0, 'faceBinding: 아니면 비었다 (늘)')
  ok(TIMES.every((x) => landAt(faceBinding({ level: LEVEL }), x.t)), 'landAt: 사가에 매이지 않은 면은 모든 시점')
  const at = TIMES.filter((x) => landAt(bound, x.t)).map((x) => x.t)
  ok(at.join() === '4', `landAt: 사가2 페이즈2 에 매인 면은 그 사가의 시점에만 (T${at.join('·T')})`)
  let threw = false
  try {
    faceBinding({ level: 6, sagaBound: true })
  } catch {
    threw = true
  }
  ok(slotOf(6) || threw, 'faceBinding: 열지 않은 사가(phases: 0)의 페이즈에 매인 면은 셈하지 않는다 (던진다)')
}

// 4. 검사 F1–F7
ok(problemsOf(card()).length === 0, '맞는 카드 — 장소와 하나인 면, 그림은 장소 자리')
ok(problemsOf(card({ at: [turntimber.position[0] + Math.max(...turntimber.extent) + FACE_NEAR - 1, turntimber.position[1]] })).length === 0, 'F6: 범위 바깥 FACE_NEAR 안이면 곁이다')
ok(codes(problemsOf(card({ at: [turntimber.position[0] + Math.max(...turntimber.extent) + FACE_NEAR + 1, turntimber.position[1]] }))).join() === 'F6', 'F6: 그보다 멀면 막는다')
ok(codes(problemsOf(card({ depicts: { type: 'continent', id: 'ondu' } }))).join() === 'F1', 'F1: 대륙에 이은 양면 카드는 막는다')
ok(codes(problemsOf(card({ depicts: { type: 'location', id: 'no-such-place' } }))).join() === 'F1', 'F1: 없는 장소')
ok(codes(problemsOf(card({ place: true }))).join() === 'F2', 'F2: place: true 와 함께 달지 않는다')
ok(codes(problemsOf(card({}, { typeLine: 'Sorcery' }))).join() === 'F3', 'F3: 대지 면은 Land')
ok(codes(problemsOf(card({}, { name: 'Test Wood' }))).join() === 'F4', 'F4: 장소 이름이 아닌 면은 이은 까닭이 있어야 한다')
ok(problemsOf(card({}, { name: 'Test Wood', basis: '근거' })).length === 0, 'F4: basis 가 있으면 된다')
ok(problemsOf(card({}, { name: 'Test Wood', estimate: '추정' })).length === 0, 'F4: estimate 가 있어도 된다')
// 자리가 없는 장소 — 표시(이어진 대지 카드의 표시)가 있으면 그 곁에, 없으면 막는다
ok(Array.isArray(emeriaMark) && emeria.placement === 'unplaced', "에메리아는 자리가 없고 표시('Emeria, the Sky Ruin' 카드)가 있다")
const atEmeria = card({ depicts: { type: 'location', id: 'emeria' }, at: [emeriaMark[0] + 10, emeriaMark[1] - 20] }, { name: 'Emeria, Shattered Skyclave', nameKo: '산산조각난 하늘거주지, 에메리아' })
ok(problemsOf(atEmeria).length === 0, '자리가 없는 장소(에메리아): 그 표시 곁의 그림은 맞다 — 그림은 표시가 되지 않고 표시를 같이 쓴다')
ok(codes(problemsOf(card({ depicts: { type: 'location', id: 'emeria' }, at: [emeriaMark[0] + 80, emeriaMark[1]] }, { name: 'Emeria, Shattered Skyclave' }))).join() === 'F6', 'F6: 자리가 없는 장소도 그 표시 곁이어야 한다')
{
  const lost = { id: 'test-lost', name: 'Test Lost', kind: 'ruin', continentId: 'ondu', description: '', prominence: 0, sources: [], placement: 'unplaced' }
  const p = problemsOf(card({ depicts: { type: 'location', id: 'test-lost' } }, { name: 'Test Lost' }), { locations: [...locations, lost], landCards: LAND_CARDS })
  ok(codes(p).join() === 'F5', 'F5: 자리도 표시도 없는 장소 — 앞면 그림이 그 표시가 되지 않으니 막는다')
}
ok(codes(problemsOf(card({}, { name: 'Turntimber Grove', basis: '근거' }))).join() === 'F7', 'F7: 대지 카드(cards.ts)와 같은 이름의 면')
ok(
  codes(landFaceProblems([faceEntry(card(), LEVEL), faceEntry(card({ id: 'other' }), LEVEL)], ctx)).join() === 'F7',
  'F7: 두 양면 카드가 같은 대지 면 이름',
)
ok(codes(landFaceProblems([faceEntry(card(), LEVEL), faceEntry(card({}, { name: 'Other Wood', basis: '근거' }), LEVEL)], ctx)).join() === 'F7', 'F7: 같은 카드 id')

// 5. 그 무렵 없던 곳(M1·V6) — 표시를 숨긴 단계에 그 장소를 가리키는 대지 면이 실리면
{
  const empty = { grounds: [], reliefs: [], drains: [], rivers: [], glyphs: [], hides: [], labels: [] }
  const hideAt = (levels) => ({ ...empty, marks: [{ id: 'test-hide', place: 'turntimber', kind: null, levels, basis: '시험' }] })
  const other = PHASE_SLOTS.find((p) => slotOf(p.level).saga !== slotOf(LEVEL).saga).level
  const input = (faces) => ({ phaseCards: [], phaseOf: new Map(), lastOf: new Map(), landCards: [], landPhase: () => undefined, sagaPlaceCards: new Map(), landFaces: faces })
  const unbound = faceEntry(card(), LEVEL)
  const bound = faceEntry(card({}, { sagaBound: true }), LEVEL)
  ok(periodMarkProblems(input([unbound]), hideAt([other])).some((p) => p.startsWith('M1') && p.includes('sagaBound')), 'M1: 사가에 매이지 않은 면은 모든 단계에 실려, 없던 곳을 가리키면 막는다')
  ok(periodMarkProblems(input([bound]), hideAt([other])).length === 0, 'M1: 사가에 매인 면은 그 사가 밖의 단계에서 숨겨도 된다')
  ok(periodMarkProblems(input([bound]), hideAt([LEVEL])).length === 1, 'M1: 사가에 매인 면도 그 단계에 숨기면 막는다')
  ok(periodMarkProblems(input([]), hideAt([LEVEL])).length === 0, 'M1: 대지 면이 없으면 그대로')
  // 그 카드의 사가 밖 시점 (바탕 단계가 다른 사가의 페이즈인 시점)
  const t = TIMES.find((x) => slotOf(x.periodLevel) && slotOf(x.periodLevel).saga !== slotOf(LEVEL).saga)
  const tInput = (faces) => ({ phaseCards: [], landCards: [], sagaPlaceCards: new Map(), landFaces: faces })
  ok(timeMarkProblems(tInput([unbound]), hideAt([t.periodLevel])).some((p) => p.startsWith('V6') && p.includes(base.land.name)), `V6: 시점 T${t.t} 의 바탕 단계에 숨긴 곳을 가리키는 늘 실리는 면`)
  ok(timeMarkProblems(tInput([bound]), hideAt([t.periodLevel])).length === 0, 'V6: 사가에 매인 면은 그 사가의 시점에만')
}

// 6. 조각 플러그인의 `?lands` — 지어낸 원본 파일에서 목록을 뽑는다 (faceEntry 와 같다)
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdfc-test-'))
  try {
    const data = path.join(dir, 'src', 'data')
    fs.mkdirSync(data, { recursive: true })
    const file = path.join(data, 'phase9.ts')
    fs.writeFileSync(file, `export const PHASE9_CARDS = ${JSON.stringify([card(), { ...base, id: 'plain', land: undefined }])}\n`)
    const plugin = phaseData()
    const out = await plugin.load.call({ addWatchFile() {} }, `${file}?lands`)
    const m = /^export const FACES = (.*)$/s.exec(out)
    const faces = m && JSON.parse(m[1])
    ok(Array.isArray(faces) && faces.length === 1, '?lands: 대지 면이 있는 카드만')
    ok(faces && JSON.stringify(faces[0]) === JSON.stringify(JSON.parse(JSON.stringify(faceEntry(card(), 9)))), '?lands: 항목은 faceEntry 와 같고, 페이즈 번호는 파일 이름에서 (9)')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

console.log(failed ? `\n${failed}개 어긋남` : '\n모두 맞다')
process.exit(failed ? 1 : 0)
