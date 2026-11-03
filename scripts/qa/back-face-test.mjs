// 변신하는 양면 카드(MOM 의 배틀 // 생물, 변신 생물)의 모양 시험 — 배틀은 장면(timeline.ts 의 isEffect), 뒷면 PhaseCard.back 의 검사(src/data/cardBack.ts 의 B1–B6),
// 영어 글 모으기(src/i18n/collect.ts), 조각 플러그인(vite/phaseData.ts — 지도 조각에는 뒷면을 싣지 않고 카드마다의 조각에만)을 지어낸 카드로 본다.
//   node scripts/qa/back-face-test.mjs
// 실제 phaseN.ts 는 '지금 데이터가 이 검사를 지나는지'와 '배틀을 더해도 앞 세트 카드의 장면 셈이 그대로인지'만 본다. 하나라도 어긋나면 종료 코드 1.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { cardBackProblems } from '../../src/data/cardBack.ts'
import { locations } from '../../src/data/locations.ts'
import { isEffect } from '../../src/data/timeline.ts'
import { collectTexts, englishOfCard } from '../../src/i18n/collect.ts'
import { phaseData } from '../../vite/phaseData.ts'
import { SETS } from '../i18n/sources.mjs'

let failed = 0
const ok = (cond, msg) => {
  if (cond) console.log(`✓ ${msg}`)
  else {
    failed++
    console.log(`✗ ${msg}`)
  }
}
const codes = (problems) => problems.map((p) => p.slice(0, p.indexOf(':')))
const ctx = { locations }

// 지어낸 카드 — 그림 상자(frames.json)가 있는 실제 카드 id 를 빌려 지도 조각이 멈추지 않게 한다 (그 카드의 원본은 읽지 않는다)
const base = {
  id: 'lorthos-the-tidemaker',
  name: 'Test Invasion',
  set: 'mom',
  number: '999',
  rarity: 'uncommon',
  typeLine: 'Battle — Siege',
  url: 'https://scryfall.com/card/mom/999/test-invasion-test-awakened',
  image: 'https://cards.scryfall.io/normal/front/0/0/test.jpg',
  artist: 'Test Artist',
  subject: '시험 장면',
  depicts: { type: 'continent', id: 'tazeem' },
  at: [1000, 700],
  size: 20,
  basis: '시험 근거',
  estimate: '시험 추정',
  back: { name: 'Test Awakened', typeLine: 'Creature — Elemental', flavor: 'Back flavor.', image: 'https://cards.scryfall.io/normal/back/0/0/test.jpg' },
  sources: [{ label: '시험 출처', url: 'https://example.com' }],
}
const card = (over = {}, back = {}) => ({ ...base, ...over, back: { ...base.back, ...back } })

// 1. 배틀은 장면 — 앞면의 유형 줄로 센다
ok(isEffect({ typeLine: 'Battle — Siege' }), 'isEffect: 배틀(Battle — Siege)은 일어난 일(장면)')
ok(!isEffect({ typeLine: 'Creature — Merfolk Scout' }) && !isEffect({ typeLine: 'Legendary Creature — Vampire Angel' }), 'isEffect: 생물은 있는 것')
ok(isEffect({ typeLine: 'Instant' }) && isEffect({ typeLine: 'Sorcery' }) && isEffect({ typeLine: 'Enchantment — Aura' }), 'isEffect: 순간·집중·부여마법은 그대로 장면')
ok(!isEffect({ typeLine: 'Artifact — Equipment' }) && !isEffect({}), 'isEffect: 마법물체·유형 줄 없음은 있는 것')
{
  // 앞 세트(사가1–3)의 카드는 배틀이 없어 장면 셈이 그대로다 — 예전 셈(순간·집중·부여마법)과 견준다
  const OLD = /\b(?:Instant|Sorcery|Enchantment)\b/
  let n = 0
  let diff = 0
  for (const s of SETS.filter((x) => x !== 'base')) {
    const k = Number(s.replace('phase', ''))
    for (const c of (await import(`../../src/data/phase${k}.ts`))[`PHASE${k}_CARDS`]) {
      n++
      if (k <= 6 && isEffect(c) !== OLD.test(c.typeLine ?? '')) diff++
    }
  }
  ok(diff === 0, `isEffect: phase1–6 카드 ${n}장의 장면 셈이 예전과 같다 (다른 것 ${diff})`)
}

// 2. 뒷면 검사 B1–B6
ok(cardBackProblems([card()], ctx).length === 0, 'B: 맞는 뒷면은 그대로')
ok(cardBackProblems([{ ...base, back: undefined }], ctx).length === 0, 'B: 뒷면이 없는 카드는 보지 않는다')
ok(codes(cardBackProblems([card({ land: { name: 'X', typeLine: 'Land', image: 'https://cards.scryfall.io/normal/back/0/0/x.jpg' } })], ctx)).join() === 'B1', 'B1: 대지 면과 함께 달지 않는다')
ok(codes(cardBackProblems([card({ place: true })], ctx)).join() === 'B2', 'B2: 장소와 하나인 카드에는 달지 않는다')
ok(codes(cardBackProblems([card({}, { name: '' })], ctx)).join() === 'B3', 'B3: 뒷면 이름이 없다')
ok(codes(cardBackProblems([card({}, { name: 'Test Invasion' })], ctx)).join() === 'B3', 'B3: 뒷면 이름이 앞면과 같다')
ok(codes(cardBackProblems([card({}, { typeLine: '' })], ctx)).join() === 'B4', 'B4: 뒷면 유형 줄이 없다')
ok(codes(cardBackProblems([card({}, { typeLine: 'Land' })], ctx)).join() === 'B4', 'B4: 대지인 둘째 면은 land 에')
ok(codes(cardBackProblems([card({}, { image: 'https://cards.scryfall.io/normal/front/0/0/test.jpg' })], ctx)).join() === 'B5', 'B5: 뒷면 그림은 Scryfall 뒷면 그림')
ok(codes(cardBackProblems([card({}, { name: 'Emeria Skyclave' })], ctx)).join() === 'B6', "B6: 장소 별칭과 같은 뒷면 이름 (에메리아의 'Emeria Skyclave')")
ok(codes(cardBackProblems([card({}, { name: 'Sea Gate' })], ctx)).join() === 'B6', 'B6: 장소 이름과 같은 뒷면 이름')
{
  // 실제 원본 — 아직 열리지 않은 사가의 파일도 (sources.mjs 의 SETS)
  const all = []
  for (const s of SETS.filter((x) => x !== 'base')) {
    const k = Number(s.replace('phase', ''))
    all.push(...cardBackProblems((await import(`../../src/data/phase${k}.ts`))[`PHASE${k}_CARDS`], ctx, `phase${k}.ts`))
  }
  ok(all.length === 0, `B: 실제 phase 원본의 뒷면이 모두 맞다${all.length ? ` — ${all.join(' / ')}` : ''}`)
}

// 3. 영어 글 모으기 — 뒷면에는 한국어 글 칸이 없어 모으는 글이 그대로다 (이름·유형·플레이버는 영문 카드 그대로)
{
  const a = []
  const b = []
  collectTexts(card(), 'card', a)
  collectTexts({ ...base, back: undefined }, 'card', b)
  ok(JSON.stringify(a) === JSON.stringify(b) && a.length === 4, `collectTexts: 뒷면을 달아도 모으는 글(subject·basis·estimate·출처 ${a.length}개)이 같다`)
  ok(Object.keys(englishOfCard(card(), {})).length === 0, 'englishOfCard: 사전이 비면 비었다 (뒷면 때문에 던지지 않는다)')
}

// 4. 조각 플러그인 — 지도 조각(?map)은 뒷면을 싣지 않고, 카드마다의 조각(?card=)은 싣는다. 어긋난 뒷면이면 지도 조각이 멈춘다
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'back-face-test-'))
  try {
    const data = path.join(dir, 'src', 'data')
    fs.mkdirSync(data, { recursive: true })
    const file = path.join(data, 'phase9.ts')
    fs.writeFileSync(file, `export const PHASE9_CARDS = ${JSON.stringify([card()])}\n`)
    const plugin = phaseData()
    const self = { addWatchFile() {} }
    const map = await plugin.load.call(self, `${file}?map`)
    const slim = JSON.parse(/^export const CARDS = (.*)$/s.exec(map)[1])
    ok(slim.length === 1 && !('back' in slim[0]) && !('typeLine' in slim[0]), '?map: 지도 조각에는 뒷면·유형 줄이 없다')
    const one = await plugin.load.call(self, `${file}?card=${base.id}`)
    const full = JSON.parse(/^export const CARD = (.*)$/m.exec(one)[1])
    ok(JSON.stringify(full.back) === JSON.stringify(base.back), '?card=: 카드마다의 조각에는 뒷면이 그대로 있다')
    const lands = await plugin.load.call(self, `${file}?lands`)
    ok(lands === 'export const FACES = []', '?lands: 뒷면은 대지 면 목록에 들지 않는다')
    fs.writeFileSync(file, `export const PHASE9_CARDS = ${JSON.stringify([card({}, { typeLine: 'Land' })])}\n`)
    // 원본을 다시 읽도록 고친 시각을 옮긴다 (플러그인은 mtime 으로 다시 읽는다)
    const later = new Date(Date.now() + 5000)
    fs.utimesSync(file, later, later)
    let threw = ''
    try {
      await plugin.load.call(self, `${file}?map`)
    } catch (e) {
      threw = String(e.message)
    }
    ok(threw.startsWith('B4:'), `?map: 어긋난 뒷면이면 지도 조각이 멈춘다 (${threw.slice(0, 40)}…)`)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

console.log(failed ? `\n${failed}개 어긋남` : '\n모두 맞다')
process.exit(failed ? 1 : 0)
