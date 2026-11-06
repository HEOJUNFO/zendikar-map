// 헤드론이 이름을 비켰는지 — 그린 헤드론(제자리·미끄러진 자리, 떠다니는 폭까지)이 그 tier 에 자리를 받은 이름의 글자 상자(그 tier 의 배율 걸음 상자를
// 모두 합친 것 — 지형 기호를 비우는 상자와 같다)를 사방으로 NAME_GAP_PX 넓힌 것에 걸리지 않는지 본다 (src/map/hedronYield.ts). 개발 서버(pnpm dev)의 window.__zmHedrons 를 읽는다.
//   node scripts/qa/hedron-names.mjs [--base http://localhost:5173] [--views off,L1,T6] [--lang en,ko] [--at tazeem,akoum,agadeem,sky-rock] [--to 9] [--json 결과.json]
// 보기마다(끔·데이터가 있는 사가 단계·보이는 시점) 그 자리(--at, 기본 tazeem)에서 tier 1 로 열고 휠로 한 tier 씩 --to 까지 확대하며 tier 마다 본다
// (tier 1–4 의 이름은 지도 전체라 한 자리로 모두, 깊은 tier 는 그 자리 둘레의 지역 상세 이름까지). 하나뿐인 거대 헤드론(Sky Rock·Ikiral — single)·
// 땅에 쓰러진 헤드론(Agadeem 의 묘지 — grounded)·
// 나와 있는 지역 상세의 마스크에 모두 가려진 헤드론(masked)·화면에서 큰 헤드론(KEEP_PX — big)은 비키지 않으니 걸려도 알리기만 하고, 그 밖의 것이 걸리면 1 로 끝난다.
// 그려진 헤드론(.hedrons > g)의 class·style 이 비킨 모습과 맞는지, tier 경계마다 몇 개가 바뀌는지도 보인다.
// headless Chrome 은 scripts/qa/chrome.mjs 의 launchChrome() 으로만 띄운다
import fs from 'node:fs'
import { launchChrome } from './chrome.mjs'
import { halfLength, hedronShape, KEEP_PX, NAME_GAP_PX, polyHitsBox } from '../../src/map/hedronYield.ts'

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`)
  return i > 0 ? process.argv[i + 1] : d
}
const BASE = arg('base', 'http://localhost:5173')
const LANGS = arg('lang', 'en,ko').split(',')
const TO = Number(arg('to', '9'))
const JSON_OUT = arg('json', '')
const AT = {
  tazeem: [984.2, 652.6],
  'sky-rock': [1113.8, 640],
  akoum: [1918, 358.6],
  agadeem: [387.8, 1607.2],
}
const ATS = arg('at', 'tazeem').split(',')
for (const a of ATS) if (!AT[a]) throw new Error(`--at 은 ${Object.keys(AT).join('·')} 가운데 — '${a}'`)
const { PHASE_SLOTS } = await import('../../src/data/sagas.ts')
const { SHOWN_TIMES } = await import('../../src/data/timeline.ts')
const ALL = [['off', ''], ...PHASE_SLOTS.map((p) => [`L${p.level}`, `saga=${p.saga}&phase=${p.local}`]), ...SHOWN_TIMES.map((x) => [`T${x.t}`, `time=${x.t}`])]
const PICK = arg('views', '')
  .split(',')
  .filter(Boolean)
const VIEWS = PICK.length ? ALL.filter(([n]) => PICK.includes(n)) : ALL
if (PICK.length && VIEWS.length !== PICK.length) throw new Error(`--views 는 ${ALL.map(([n]) => n).join('·')} 가운데`)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const W = 1440
const H = 900

const READ = `JSON.stringify((() => {
  const z = window.__zmHedrons
  if (!z) return null
  const dom = [...document.querySelectorAll('svg.zendikar-map .hedrons > .hedron')].map((g) => [g.getAttribute('class'), g.style.transform])
  const figs = document.querySelectorAll('svg.zendikar-map .figure').length
  return { ...z, dom, figs }
})())`

/** 그 tier 의 비킨 모습이 다 셈해지고 그림이 다 올 때까지 — 같은 값이 몇 번 이어질 때 */
async function settle(chrome, sessionId, tier) {
  let last = ''
  let same = 0
  for (let i = 0; i < 120; i++) {
    await sleep(400)
    const v = (await chrome.send('Runtime.evaluate', { expression: READ, returnByValue: true }, sessionId)).result.value
    const z = JSON.parse(v)
    if (z && z.on && (tier === undefined || z.tier === tier) && v === last) same++
    else same = 0
    last = v
    if (same >= 6) return z
  }
  throw new Error(`tier ${tier} 이 자리 잡지 않았다`)
}

/** 한 tier 의 검사 — 걸린 헤드론과 그려진 모습이 어긋난 것 */
function check(z) {
  const out = { hits: [], allowed: [], dom: [], moved: 0, hidden: 0 }
  z.hedrons.forEach((h, i) => {
    const m = h.move
    if (m === 'hide') out.hidden++
    else if (m) out.moved++
    // 그려진 모습: 지운 것은 is-yielded, 자리는 제자리(소수 한 자리) + 옮긴 몫(소수 두 자리)의 transform
    const [cls, tf] = z.dom[i] ?? [null, '']
    const want = m === 'hide' ? 'hedron is-yielded' : 'hedron'
    // 브라우저가 소수 끝의 0 을 지우므로 수로 견준다
    const nums = (s) => (s.match(/-?[\d.]+/g) ?? []).map(Number)
    const wantTf = m && m !== 'hide' ? [h.x + m.dx, h.y + m.dy] : [h.x, h.y]
    const got = nums(tf)
    const tfOk = got.length === wantTf.length && got.every((v, j) => Math.abs(v - wantTf[j]) < (m && m !== 'hide' ? 0.006 : 0.051))
    if (cls !== want || !tfOk) out.dom.push(`${h.key}: class ${cls} style '${tf}' — 바라는 것 ${want} ${JSON.stringify(wantTf)}`)
    if (m === 'hide') return
    const [poly] = hedronShape(h, m?.dx ?? 0, m?.dy ?? 0)
    // 몸통은 이름 상자와 NAME_GAP_PX(그 tier 의 px0 에서) 떨어져야 한다 — 셈과 같은 틈 (소수 오차만 봐준다)
    const g = (NAME_GAP_PX / z.px0) * 0.999
    const boxes = z.boxes.filter(([x0, y0, x1, y1]) => polyHitsBox(poly, { x0: x0 - g, y0: y0 - g, x1: x1 + g, y1: y1 + g }))
    if (!boxes.length) return
    const why = h.single ? 'single' : h.grounded ? 'grounded' : h.fixed ? 'masked' : !m && halfLength(h) * 2 * z.px0 > KEEP_PX ? 'big' : null
    ;(why ? out.allowed : out.hits).push({ key: h.key, why, boxes: boxes.length })
  })
  return out
}

async function wheelTo(chrome, sessionId, tier) {
  for (let i = 0; i < 60; i++) {
    const z = JSON.parse((await chrome.send('Runtime.evaluate', { expression: READ, returnByValue: true }, sessionId)).result.value)
    if (z && z.tier >= tier) return
    await chrome.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: W / 2, y: H / 2, deltaX: 0, deltaY: -60 }, sessionId)
    await sleep(120)
  }
  throw new Error(`tier ${tier} 까지 확대하지 못했다`)
}

const chrome = await launchChrome({ width: W, height: H, maxMinutes: 60 })
const report = []
let bad = 0
try {
  const jobs = VIEWS.flatMap(([name, q]) => LANGS.flatMap((lang) => ATS.map((at) => ({ name, q, lang, at }))))
  let next = 0
  const one = async ({ name, q, lang, at }) => {
    const [x, y] = AT[at]
    const url = `${BASE}/?${[q, lang === 'ko' ? 'lang=ko' : '', `view=${x},${y},1.2`].filter(Boolean).join('&')}`
    const { sessionId, targetId } = await chrome.newPage(url, { w: W, h: H })
    const errors = []
    const off = chrome.on((m) => {
      if (m.sessionId === sessionId && m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text)
    })
    try {
      let prev = null
      const lines = []
      for (let tier = 1; tier <= TO; tier++) {
        if (tier > 1) await wheelTo(chrome, sessionId, tier)
        const z = await settle(chrome, sessionId, tier)
        const c = check(z)
        // tier 경계에서 바뀐 헤드론 수 (옮김·지움이 달라진 것)
        const changed = prev ? z.hedrons.filter((h, i) => JSON.stringify(h.move) !== JSON.stringify(prev.hedrons[i].move)).length : 0
        prev = z
        report.push({ view: name, lang, at, tier, figs: z.figs, moved: c.moved, hidden: c.hidden, changed, hits: c.hits, allowed: c.allowed, dom: c.dom })
        if (c.hits.length || c.dom.length) bad++
        lines.push(
          `t${tier} 옮김 ${c.moved} 지움 ${c.hidden} 바뀜 ${changed}` +
            (c.hits.length ? ` ✗걸림 ${c.hits.map((h) => h.key).join(',')}` : '') +
            (c.allowed.length ? ` (그대로 ${c.allowed.map((h) => `${h.key}:${h.why}`).join(',')})` : '') +
            (c.dom.length ? ` ✗그림 ${c.dom.length}` : ''),
        )
      }
      if (errors.length) {
        bad++
        lines.push(`✗ 페이지 오류 ${errors[0]}`)
      }
      console.log(`${name}-${lang}@${at}: ${lines.join(' · ')}`)
    } finally {
      off()
      await chrome.send('Target.closeTarget', { targetId })
    }
  }
  await Promise.all(
    [0, 1, 2].map(async () => {
      while (next < jobs.length) await one(jobs[next++])
    }),
  )
} finally {
  await chrome.close()
}
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 1))
console.log(bad ? `✗ 이름에 걸린 헤드론이나 어긋난 그림이 있는 tier ${bad}` : '헤드론 — 이름에 걸린 것 없음')
process.exit(bad ? 1 : 0)
