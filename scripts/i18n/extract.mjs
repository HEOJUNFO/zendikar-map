// 옮길 문장 세기와 옮길 묶음 만들기.
//   node scripts/i18n/extract.mjs                    — 묶음마다 문장 수, 사전에 있는 수, 남은 수, 쓰지 않는 사전 열쇠
//   node scripts/i18n/extract.mjs --todo <폴더> --set base [--chars 25000]
//        — 사전에 없는 문장을 글자 수로 나눈 batch-<n>.json ({ items: [{ where, text, units: {열쇠: 한국어 문장} }] }) 과 glossary.tsv(공식 한국어 이름 → 영어 이름)
//   node scripts/i18n/extract.mjs --check            — 남은 문장이 하나라도 있으면 1 로 끝난다 (한국어 원본을 고친 뒤 영어 보기에서 한국어로 남는 문장을 놓치지 않게)
import fs from 'node:fs'
import path from 'node:path'
import { readDict, SETS, unitsOf } from './sources.mjs'

const argv = process.argv.slice(2)
const opt = (name, d) => {
  const i = argv.indexOf(`--${name}`)
  return i < 0 ? d : argv[i + 1]
}
const todo = opt('todo')
const only = opt('set')
const chars = Number(opt('chars', 25000))
const check = argv.includes('--check')
let missingTotal = 0

for (const set of only ? [only] : SETS) {
  const units = await unitsOf(set)
  const dict = readDict(set)
  const missing = [...units].filter(([k]) => dict[k] === undefined)
  const unused = Object.keys(dict).filter((k) => !units.has(k))
  missingTotal += missing.length
  console.log(`${set}: 문장 ${units.size} · 옮김 ${units.size - missing.length} · 남음 ${missing.length} (${missing.reduce((a, [, u]) => a + u.ko.length, 0)}자) · 쓰지 않는 열쇠 ${unused.length}`)
  if (!todo) continue
  fs.mkdirSync(todo, { recursive: true })
  // 같은 글의 문장은 한 항목으로 — 옮기는 이가 앞뒤를 보게
  const items = new Map()
  for (const [k, u] of missing) {
    const it = items.get(u.text) ?? { where: u.where, text: u.text, units: {} }
    it.units[k] = u.ko
    items.set(u.text, it)
  }
  let batch = []
  let size = 0
  let n = 0
  const flush = () => {
    if (!batch.length) return
    fs.writeFileSync(path.join(todo, `${set}-batch-${++n}.json`), JSON.stringify({ items: batch }, null, 1))
    batch = []
    size = 0
  }
  for (const it of items.values()) {
    const len = Object.values(it.units).reduce((a, u) => a + u.length, 0)
    if (size + len > chars) flush()
    batch.push(it)
    size += len
  }
  flush()
  console.log(`  → ${n}개 묶음 (${todo})`)
}

if (todo) {
  // 공식 한국어 이름 → 영어 이름 (장소·대륙·대지 카드·페이즈 카드·양면 카드의 대지 면)
  const { locations } = await import('../../src/data/locations.ts')
  const { continents } = await import('../../src/data/continents.ts')
  const { LAND_CARDS } = await import('../../src/data/cards.ts')
  const { BY_PHASE } = await import('../phase-cards.mjs')
  const phase6 = (await import('../../src/data/phase6.ts')).PHASE6_CARDS
  const rows = new Map()
  const add = (ko, en, what) => ko && en && !rows.has(ko) && rows.set(ko, `${ko}\t${en}\t${what}`)
  for (const l of locations) add(l.nameKo, l.name, 'place')
  for (const c of continents) add(c.nameKo, c.name, 'continent')
  for (const c of LAND_CARDS) add(c.nameKo, c.name, 'land card')
  for (const c of [...BY_PHASE.flat(), ...phase6]) {
    add(c.nameKo, c.name, 'card')
    if (c.land) add(c.land.nameKo, c.land.name, 'land face')
  }
  fs.writeFileSync(path.join(todo, 'glossary.tsv'), 'korean\tenglish\tkind\n' + [...rows.values()].join('\n') + '\n')
  console.log(`  glossary.tsv ${rows.size}줄`)
}

if (check && missingTotal) {
  console.error(`영어가 없는 문장 ${missingTotal}개 — --todo 로 옮길 묶음을 만들어 scripts/i18n/BRIEF.md 대로 옮긴다`)
  process.exit(1)
}
