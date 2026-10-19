// 이름 자리 검사 — 페이즈 그림 때문에 장소·지역·대지 카드 이름이 사라지지 않았는지 본다 (CLAUDE.md: 그림 때문에 이름이 옮겨 앉는 것은 괜찮지만 사라지면 안 된다).
// 개발 서버(pnpm dev)의 ?labelcheck 가 tier 마다 자리를 받은 이름을 window.__zmLabels 로 내놓는다(ZendikarMap.tsx). 이름 자리는 tier 마다 지도 전체로
// 정하므로(그 tier 에 보일 수 있는 그림을 모두 장애물로) 화면 하나로 모든 tier 를 본다.
//   node scripts/qa/labels-check.mjs [--base http://localhost:5173] [--time 1,2,3,4] [--lang en,ko] [--json 결과.json]
// 1. 페이즈를 끈 지도(기준)에서 자리를 받은 이름 가운데 각 보기(사가 단계 1–5, 시점 1–4)에서 사라진 것을 tier 마다 센다 — 사가 보기의 것은 기준선이다
//    (지금 그대로 둔다). 지역 이름은 그 보기에서도 자리를 찾는 이름(지역 상세가 맡지 않는 것)만, 대지 카드 이름은 두 보기 모두에 기호가 있는 것만 견준다.
// 2. 시점 t 에서 사라진 이름이 그 시점의 바탕 단계와 같은 사가 보기(T1 단계 2, T2 단계 3, T3 단계 4, T4 단계 5 — 시점의 periodLevel)에서는
//    사라지지 않았으면, 시점별 보기만의 그림(그 사가 보기가 그리지 않는 카드, 그 시점에만 옮긴 카드 — 개발 서버의 ?nofig 로 뺀다)을 모두 빼고 다시 본다.
//    그래야 돌아오면 그 그림 때문에 사라진 것이다(✗ — 하나라도 있으면 1 로 끝난다). 빼도 돌아오지 않으면 그림 때문이 아니라 사가 보기의 장면 그림이
//    빠져 이름의 자리 차례가 바뀐 것이다(그 대신 다른 이름이 자리를 받는다 — 알리기만 한다).
// headless Chrome 은 scripts/qa/chrome.mjs 의 launchChrome() 으로만 띄운다
import fs from 'node:fs'
import { launchChrome } from './chrome.mjs'

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`)
  return i > 0 ? process.argv[i + 1] : d
}
const BASE = arg('base', 'http://localhost:5173')
const JSON_OUT = arg('json', '')
const LANGS = arg('lang', 'en,ko').split(',')
const { TIMES, movedAt, sagaLookupOf, sagaShownAt, shownAtTimeOf } = await import('../../src/data/timeline.ts')
const CARDS = (await Promise.all([1, 2, 3, 4, 5].map((i) => import(`../../src/data/phase${i}.ts`)))).flatMap((m, i) => m[`PHASE${i + 1}_CARDS`])
const LOOKUP = sagaLookupOf(CARDS)
const BY_ID = new Map(CARDS.map((c) => [c.id, c]))
/** 시점 t 에 앱이 그리는 그림 가운데 그 시점의 바탕 단계의 사가 보기가 그 자리에 그리지 않는 것 — 그 사가 보기가 그리지 않는 카드와 그 시점에만 옮긴 카드 */
const timeOnlyFigures = (t) =>
  CARDS.filter((c) => !c.place && shownAtTimeOf(c, t, (id) => BY_ID.get(id)) && (!sagaShownAt(c.id, TIMES[t - 1].periodLevel, LOOKUP) || movedAt(c, t))).map((c) => c.id)
const TIMES_RUN = arg('time', TIMES.map((x) => x.t).join(',')).split(',').map(Number)
for (const t of TIMES_RUN) if (!TIMES.some((x) => x.t === t)) throw new Error(`--time 은 ${TIMES.map((x) => x.t).join('·')} 가운데 — '${t}'`)
const SAGA = { 1: 'saga=1&phase=1', 2: 'saga=1&phase=2', 3: 'saga=1&phase=3', 4: 'saga=2&phase=1', 5: 'saga=2&phase=2' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 보기 하나의 이름 자리 — 그림 목록이 몇 초 바뀌지 않을 때까지 기다린다 */
async function read(chrome, query, lang) {
  const url = `${BASE}/?${[query, 'labelcheck', lang === 'ko' ? 'lang=ko' : ''].filter(Boolean).join('&')}`
  const { sessionId, targetId } = await chrome.newPage(url, { w: 1440, h: 900 })
  const errors = []
  const off = chrome.on((m) => {
    if (m.sessionId !== sessionId) return
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text)
  })
  try {
    let last = ''
    let same = 0
    let value = null
    for (let i = 0; i < 80; i++) {
      await sleep(500)
      const r = await chrome.send('Runtime.evaluate', { expression: 'JSON.stringify(window.__zmLabels ?? null)', returnByValue: true }, sessionId)
      const v = r.result.value
      if (v !== 'null' && v === last) same++
      else same = 0
      last = v
      // 페이즈를 켠 보기는 그림이 들어온 뒤에 (지도 조각이 오기 전에는 그림이 없다)
      const parsed = JSON.parse(v)
      if (parsed && same >= 6 && (!query || parsed.figures.length)) {
        value = parsed
        break
      }
    }
    if (!value) throw new Error(`${url}: 이름 자리를 읽지 못했다 (?labelcheck — 개발 서버인가)`)
    if (errors.length) throw new Error(`${url}: ${errors[0]}`)
    return value
  } finally {
    off()
    await chrome.send('Target.closeTarget', { targetId })
  }
}

const isLoc = (id) => !id.startsWith('card:') && !id.startsWith('fig:')
/** 기준(off)에서 자리를 받았는데 그 보기에서 사라진 이름 — tier 마다 [이름] */
function lost(base, view) {
  return base.tiers.map((b, tier) => {
    const v = view.tiers[tier]
    const out = []
    const wanted = new Set(v.areaWanted)
    for (const id of b.area) if (wanted.has(id) && !v.area.includes(id)) out.push(`area:${id}`)
    const cards = new Set(v.cards)
    const now = new Set(v.points)
    for (const id of b.points) {
      if (id.startsWith('fig:')) continue
      if (!isLoc(id) && !(b.cards.includes(id) && cards.has(id))) continue
      if (!now.has(id)) out.push(id)
    }
    return out
  })
}

const chrome = await launchChrome({ width: 1440, height: 900, maxMinutes: 30 })
const report = { langs: {} }
let fail = 0
try {
  for (const lang of LANGS) {
    const base = await read(chrome, '', lang)
    const levels = [...new Set([1, 2, 3, 4, 5, ...TIMES_RUN.map((t) => TIMES[t - 1].periodLevel)])]
    const saga = {}
    for (const l of levels) saga[l] = lost(base, await read(chrome, SAGA[l], lang))
    const out = { saga, time: {} }
    for (const l of Object.keys(saga)) {
      const n = saga[l].reduce((s, x) => s + x.length, 0)
      console.log(`[${lang}] 사가 단계 ${l} (기준선): 끈 지도보다 사라진 이름 ${n}${n ? ` — ${saga[l].map((x, tier) => (x.length ? `tier ${tier}: ${x.join(' ')}` : '')).filter(Boolean).join(' / ')}` : ''}`)
    }
    for (const t of TIMES_RUN) {
      const level = TIMES[t - 1].periodLevel
      const mine = lost(base, await read(chrome, `time=${t}`, lang))
      const fresh = mine.map((x, tier) => x.filter((id) => !saga[level][tier].includes(id)))
      const n0 = fresh.reduce((s, x) => s + x.length, 0)
      // 시점별 보기만의 그림을 빼고 다시 — 돌아오는 이름만 그 그림 때문이다
      const bare = n0 ? lost(base, await read(chrome, `time=${t}&nofig=${timeOnlyFigures(t).join(',')}`, lang)) : mine.map(() => [])
      const caused = fresh.map((x, tier) => x.filter((id) => !bare[tier].includes(id)))
      const shuffled = fresh.map((x, tier) => x.filter((id) => bare[tier].includes(id)))
      const n = caused.reduce((s, x) => s + x.length, 0)
      const m = shuffled.reduce((s, x) => s + x.length, 0)
      out.time[t] = { lost: mine, fresh, caused, shuffled }
      const all = mine.reduce((s, x) => s + x.length, 0)
      const list = (xs) => xs.map((x, tier) => (x.length ? `tier ${tier}: ${x.join(' ')}` : '')).filter(Boolean).join(' / ')
      console.log(
        `[${lang}] 시점 ${t} (단계 ${level} 과 견줌): 끈 지도보다 사라진 이름 ${all}, 시점별 보기만의 그림 때문에 사라진 것 ${n}${n ? ` ✗ — ${list(caused)}` : ' ✓'}` +
          (m ? `\n   (그림 때문이 아니라 자리 차례가 바뀐 것 ${m} — ${list(shuffled)})` : ''),
      )
      fail += n
    }
    report.langs[lang] = out
  }
} finally {
  await chrome.close()
}
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 1))
console.log(fail ? `시점별 보기가 새로 지운 이름 ${fail}` : '시점별 보기가 새로 지운 이름이 없다')
process.exit(fail ? 1 : 0)
