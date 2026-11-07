// 사전 점검 — node scripts/i18n/audit.mjs [set …] [--scryfall <texts.txt>]  (기본: 모든 묶음). 결과는 audit-out.json (지금 폴더)
// 빠진 문장, 따옴표 짝(한국어 원문과 홀짝이 다른 글 — 아포스트로피 때문에 오탐이 많다), 같은 문장 두 번, 알려진 오역,
// 저장소 영어 글(과 --scryfall 로 준 Scryfall 카드 글 모음 — 한 줄에 카드 하나)에 없는 인용을 센다
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const argv = process.argv.slice(2)
const si = argv.indexOf('--scryfall')
const scry = si < 0 ? '' : fs.readFileSync(argv.splice(si, 2)[1], 'utf8')
const m = await import(`${R}/scripts/i18n/sources.mjs`)
const { translate } = await import(`${R}/src/i18n/units.ts`)
const sets = argv.length ? argv : m.SETS
// 저장소의 영어 글 모음 — 인용이 원문 어딘가에 있는지
const corpus = [
  ...fs.readdirSync(`${R}/src/data`).filter((f) => f.endsWith('.ts')).map((f) => fs.readFileSync(`${R}/src/data/${f}`, 'utf8')),
  ...['landscape', 'periods'].flatMap((d) => fs.readdirSync(`${R}/src/data/${d}`).map((f) => fs.readFileSync(`${R}/src/data/${d}/${f}`, 'utf8'))),
  scry,
].join('\n').replace(/\\'/g, "'").replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s*—\s*/g, '—').replace(/\s+/g, ' ').toLowerCase()
// 인용 끝의 말한 이 앞 줄바꿈(Scryfall 플레이버)·띄어쓰기는 가리지 않는다
const norm = (s) => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s*—\s*/g, '—').replace(/\s+/g, ' ').toLowerCase()
// 따옴표 수 — 글자 사이(아포스트로피)는 세지 않는다
const quotes = (s) => (s.replace(/[’‘]/g, "'").match(/(?<![A-Za-z가-힣])'|'(?![A-Za-z])/g) ?? []).length + (s.match(/["“”]/g) ?? []).length
// 인용 찾기 — 큰따옴표 안("…")은 아포스트로피·작은따옴표를 품을 수 있고, 작은따옴표 인용('…')은 글자 사이의
// 아포스트로피(I'd, Ulamog's)와 큰따옴표를 품을 수 있다. 예전에는 따옴표가 든 인용을 아예 건너뛰거나
// 아포스트로피에서 끊어 엉뚱한 조각을 짝지었다
const DOUBLE_Q = /["“]([^"“”]+?)["”]/g
const SINGLE_Q = /(?<![A-Za-z0-9])['‘]((?:[^'‘’]|(?<=[A-Za-z])['’](?=[A-Za-z]))+?)['’](?![A-Za-z])/g
const quotesIn = (s) => [...s.matchAll(DOUBLE_Q), ...s.matchAll(SINGLE_Q)].map((q) => q[1])
const out = { missing: [], parity: [], dup: [], unverified: [], terms: [] }
// 'Battle for Zendikards, Part …'(Making Magic)를 잘못 옮긴 것을 잡는다 — Latest Developments 의 실제 칼럼 제목
// 'M-Files: Battle for Zendikar, Part 2'('The M Files: …')는 빼고
const TERMS = [/Wailing Pass/, /water-daya/i, /(?<!M[- ]Files: )Battle for Zendikar, Part (One|1|Two|2)/]
for (const set of sets) {
  const dict = m.readDict(set)
  for (const [where, ko] of await m.textsOf(set)) {
    const en = translate(ko, { ...m.readDict('base'), ...dict })
    if (en === null) { out.missing.push(where); continue }
    if (quotes(ko) % 2 !== quotes(en) % 2) out.parity.push({ where, en })
    const sents = en.split(/(?<=[.!?]['"]?)\s+/).filter((x) => x.length > 40)
    if (new Set(sents).size !== sents.length) out.dup.push({ where, en })
    for (const t of TERMS) if (t.test(en) && !(t.source.includes('Battle') && /Zendikards/.test(ko))) out.terms.push({ where, term: t.source })
    // 인용 — 한국어 원문에 그대로 있거나 저장소 영어 글에 있으면 확인된 것
    for (const q of quotesIn(en)) {
      const s = norm(q).replace(/^[\s.…]+|[\s.…,]+$/g, '')
      if (s.length < 25) continue
      if (norm(ko).includes(s) || corpus.includes(s)) continue
      out.unverified.push({ set, where, quote: q })
    }
  }
}
fs.writeFileSync('audit-out.json', JSON.stringify(out, null, 1))
console.log(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])))
