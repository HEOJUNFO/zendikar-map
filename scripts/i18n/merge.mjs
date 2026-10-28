// 옮긴 묶음을 사전에 넣는다 — node scripts/i18n/merge.mjs --set base <batch-…-en.json …> [--prune]
// 지금 데이터에 없는 열쇠(한국어 원본이 바뀐 문장)는 넣지 않고 센다. --prune 은 사전에서 쓰지 않는 열쇠를 지운다
import fs from 'node:fs'
import { readDict, unitsOf, writeDict } from './sources.mjs'

const argv = process.argv.slice(2)
const si = argv.indexOf('--set')
if (si < 0) throw new Error('--set <base|phase1…> 가 없다')
const set = argv[si + 1]
const prune = argv.includes('--prune')
const files = argv.filter((a, i) => !a.startsWith('--') && i !== si + 1)

const units = await unitsOf(set)
const dict = readDict(set)
let added = 0
const stale = []
const hangul = []
for (const f of files) {
  for (const [k, en] of Object.entries(JSON.parse(fs.readFileSync(f, 'utf8')))) {
    if (!units.has(k)) {
      stale.push(k)
      continue
    }
    if (typeof en !== 'string' || !en.trim()) throw new Error(`${f}: ${k} 의 영어가 비었다`)
    if (/[가-힣]/.test(en)) hangul.push(`${k}: ${en.slice(0, 80)}`)
    if (dict[k] === undefined) added++
    dict[k] = en.trim()
  }
}
let pruned = 0
if (prune)
  for (const k of Object.keys(dict))
    if (!units.has(k)) {
      delete dict[k]
      pruned++
    }
writeDict(set, dict)
console.log(`${set}: 더함 ${added} · 사전 ${Object.keys(dict).length}/${units.size} · 데이터에 없는 열쇠 ${stale.length}${prune ? ` · 지움 ${pruned}` : ''}`)
if (hangul.length) console.log(`한국어가 남은 영어 ${hangul.length}:\n  ${hangul.join('\n  ')}`)
