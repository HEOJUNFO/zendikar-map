// 이름 자리 비교 — 앞 트리(main 등)에서 자리를 받은 이름이 지금 트리에서 사라지지 않았는지, 이름 쪽·자리가 바뀌지 않았는지 본다
// (CLAUDE.md: 이름은 옮겨 앉아도 되지만 사라지면 안 된다). labels-check.mjs 는 한 트리 안에서 각 보기를 페이즈를 끈 지도와만 견주고,
// saga-regress.mjs 는 고정 화면(en)만 뜨니, 새 표시가 기존 이름의 자리를 가져가는 것은 이것으로 본다.
//   pnpm dev 뒤 (--base 로 그 주소):
//   node scripts/qa/labels-diff.mjs --save <폴더>    [--base http://localhost:5173] [--root <트리>] [--lang en,ko]   # 기준을 남긴다 (예: main 의 worktree)
//   node scripts/qa/labels-diff.mjs --compare <폴더> [--base …] [--json 결과.json]                                 # 지금 트리를 기준과 견준다
//   [--jobs 3] 함께 여는 탭 수 · [--views off,L3,T2]  보기 몇 개만 (이름은 off·L<단계>·T<시점>) · [--track 이름 id,…] 보기마다 그 이름이 자리를 받은 tier 와 쪽을 보인다
//   (id 는 __zmLabels 의 것 — 장소 id, card:<대지 카드 id>, fig:<페이즈 카드 id>, area:<지역 id>. 새 표시의 이름이 언제부터 보이는지 볼 때)
// 보기: 끔, 데이터가 있는 사가 단계 모두(PHASE_SLOTS — 지금 1–6), 열리는 시점 모두(SHOWN_TIMES — 지금 T1–T5).
// 보기 × 언어(en·ko)마다 개발 서버의 ?labelcheck 가 내놓는 window.__zmLabels(ZendikarMap.tsx — tier 마다 지도 전체의 이름 자리)를 남긴다:
// 지역 이름(area, 자리 areaAt), 지점·카드·그림 이름(points, 쪽 sides). --root 는 보기와 카드 목록을 읽을 트리(기본은 이 스크립트의 트리) —
// 다른 트리의 서버로 기준을 남길 때 그 트리를 준다. 기준에는 그 트리의 카드 id(대지 카드·페이즈 카드)도 남긴다.
// 견주기: 같은 보기·tier·언어에서 기준에 자리를 받았는데 지금 받지 못한 이름은 모두 사라진 것이다(종료 코드 1) — 다만 기준 뒤에 새로 생긴 카드나
// 지금 없는 카드의 이름(card:·fig:)은 알리기만 한다. 이름 쪽(sides)·지역 이름 자리(areaAt)가 바뀐 것은 실패가 아니라 목록으로 보인다
// (기준이 sides·areaAt 를 내놓지 않는 트리에서 남긴 것이면 그 견주기는 건너뛴다 — 그 트리에 ZendikarMap.tsx 의 ?labelcheck 두 줄을 붙여 남기면 된다).
// headless Chrome 은 scripts/qa/chrome.mjs 의 launchChrome() 으로만 띄운다
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { launchChrome } from './chrome.mjs'

const argv = process.argv.slice(2)
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`)
  return i < 0 ? d : argv[i + 1]
}
const SAVE = opt('save', null)
const COMPARE = opt('compare', null)
if (!SAVE === !COMPARE) {
  console.error('사용법: node scripts/qa/labels-diff.mjs --save <폴더> | --compare <폴더> [--base 주소] [--root 트리] [--lang en,ko] [--json 결과.json]')
  process.exit(2)
}
const BASE = opt('base', 'http://localhost:5173')
const ROOT = path.resolve(opt('root', path.join(path.dirname(fileURLToPath(import.meta.url)), '../..')))
const JSON_OUT = opt('json', '')
const LANGS = opt('lang', 'en,ko').split(',')
const ONLY = opt('views', null)?.split(',')
const TRACK = opt('track', null)?.split(',') ?? []
const JOBS = Number(opt('jobs', 3))
const W = 1440
const H = 900

const { PHASE_SLOTS } = await import(path.join(ROOT, 'src/data/sagas.ts'))
const { SHOWN_TIMES } = await import(path.join(ROOT, 'src/data/timeline.ts'))
const { LAND_CARDS } = await import(path.join(ROOT, 'src/data/cards.ts'))
const { BY_PHASE } = await import(path.join(ROOT, 'scripts/phase-cards.mjs'))
const CARD_IDS = [...new Set([...LAND_CARDS.map((c) => c.id), ...BY_PHASE.flat().map((c) => c.id)])].sort()
const VIEWS = [
  ['off', ''],
  ...PHASE_SLOTS.map((p) => [`L${p.level}`, `saga=${p.saga}&phase=${p.local}`]),
  ...SHOWN_TIMES.map((x) => [`T${x.t}`, `time=${x.t}`]),
].filter(([name]) => !ONLY || ONLY.includes(name))
if (ONLY) for (const v of ONLY) if (!VIEWS.some(([name]) => name === v)) throw new Error(`--views: 없는 보기 '${v}'`)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 보기 하나의 이름 자리 — __zmLabels 가 몇 초 바뀌지 않을 때까지 (페이즈를 켠 보기는 그림이 들어온 뒤에) */
async function read(chrome, query, lang) {
  const url = `${BASE}/?${[query, 'labelcheck', lang === 'ko' ? 'lang=ko' : ''].filter(Boolean).join('&')}`
  const { sessionId, targetId } = await chrome.newPage(url, { w: W, h: H })
  const errors = []
  const off = chrome.on((m) => {
    if (m.sessionId === sessionId && m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text)
  })
  try {
    let last = ''
    let same = 0
    for (let i = 0; i < 120; i++) {
      await sleep(500)
      const r = await chrome.send('Runtime.evaluate', { expression: 'JSON.stringify(window.__zmLabels ?? null)', returnByValue: true }, sessionId)
      const v = r.result.value
      if (v !== 'null' && v === last) same++
      else same = 0
      last = v
      const parsed = JSON.parse(v)
      // 그림이 없는 단계(그린 것이 아직 없는 사가)도 있으니 오래 그대로면 받아들인다
      if (parsed && same >= 6 && (!query || parsed.figures.length || same >= 20)) {
        if (errors.length) throw new Error(`${url}: ${errors[0]}`)
        return parsed
      }
    }
    throw new Error(`${url}: 이름 자리를 읽지 못했다 (?labelcheck — 개발 서버인가)`)
  } finally {
    off()
    await chrome.send('Target.closeTarget', { targetId })
  }
}

/** __zmLabels → 견줄 꼴: tier 마다 { area: {id: [x,y]|null}, points: {id: 쪽|null} } */
const shape = (z) =>
  z.tiers.map((t) => ({
    px: t.px,
    area: Object.fromEntries(t.area.map((id) => [id, t.areaAt?.[id] ?? null])),
    areaWanted: t.areaWanted,
    points: Object.fromEntries(t.points.map((id) => [id, t.sides?.[id] ?? null])),
  }))

async function dump() {
  const chrome = await launchChrome({ width: W, height: H, maxMinutes: 40 })
  const out = {}
  const jobs = VIEWS.flatMap(([name, query]) => LANGS.map((lang) => [`${name}-${lang}`, query, lang]))
  try {
    // 탭 몇 개를 함께 — 결과는 보기 차례로 담는다
    const done = new Map()
    let next = 0
    const worker = async () => {
      while (next < jobs.length) {
        const [key, query, lang] = jobs[next++]
        done.set(key, shape(await read(chrome, query, lang)))
        process.stderr.write(`${key} `)
      }
    }
    await Promise.all(Array.from({ length: JOBS }, worker))
    for (const [key] of jobs) out[key] = done.get(key)
  } finally {
    await chrome.close()
    process.stderr.write('\n')
  }
  return out
}

const commitOf = () => {
  try {
    return execFileSync('git', ['-C', ROOT, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

if (SAVE) {
  const views = await dump()
  fs.mkdirSync(SAVE, { recursive: true })
  const meta = { base: BASE, root: ROOT, commit: commitOf(), saved: new Date().toISOString(), w: W, h: H, langs: LANGS, views: VIEWS.map((v) => v[0]), cards: CARD_IDS }
  fs.writeFileSync(path.join(SAVE, 'labels.json'), JSON.stringify({ meta, views }))
  console.log(`${SAVE}/labels.json — 보기 ${VIEWS.length} × 언어 ${LANGS.length} (트리 ${meta.commit ?? ROOT})`)
  process.exit(0)
}

const ref = JSON.parse(fs.readFileSync(path.join(COMPARE, 'labels.json'), 'utf8'))
const refCards = new Set(ref.meta.cards)
const nowCards = new Set(CARD_IDS)
const cardOf = (id) => (id.startsWith('card:') || id.startsWith('fig:') ? id.slice(id.indexOf(':') + 1) : null)
/** 기준 뒤에 새로 생긴 카드, 또는 지금 없는 카드의 이름 — 사라져도 실패로 세지 않는다 */
const exempt = (id) => {
  const c = cardOf(id)
  return c !== null && (!refCards.has(c) || !nowCards.has(c))
}
const LANGS_CMP = ref.meta.langs.filter((l) => LANGS.includes(l))
const now = await dump()
const report = { ref: ref.meta.commit, views: {} }
let losses = 0
let changes = 0
let exempted = 0
const missingViews = []
for (const name of ref.meta.views.filter((v) => !ONLY || ONLY.includes(v)))
  for (const lang of LANGS_CMP) {
    const key = `${name}-${lang}`
    const a = ref.views[key]
    const b = now[key]
    if (!b) {
      missingViews.push(key)
      continue
    }
    const r = { lost: [], exempt: [], moved: [] }
    a.forEach((ta, tier) => {
      const tb = b[tier]
      if (!tb) return
      for (const [id, at] of Object.entries(ta.area)) {
        const lab = `area:${id}`
        if (!(id in tb.area)) {
          const why = tb.areaWanted.includes(id) ? '' : ' (지금 그 tier 에서 자리를 찾지 않는다 — 지역 상세가 맡는가)'
          if (exempt(lab)) r.exempt.push({ tier, id: lab })
          else r.lost.push({ tier, id: lab, why })
        } else if (at && tb.area[id] && (at[0] !== tb.area[id][0] || at[1] !== tb.area[id][1])) r.moved.push({ tier, id: lab, from: at, to: tb.area[id] })
      }
      for (const [id, side] of Object.entries(ta.points)) {
        if (!(id in tb.points)) {
          if (exempt(id)) r.exempt.push({ tier, id })
          else r.lost.push({ tier, id, why: '' })
        } else if (side && tb.points[id] && side !== tb.points[id]) r.moved.push({ tier, id, from: side, to: tb.points[id] })
      }
    })
    losses += r.lost.length
    changes += r.moved.length
    exempted += r.exempt.length
    report.views[key] = r
    // 같은 이름·같은 바뀜은 tier 를 묶어 한 번 — 't3–9 affa "right"→"below"'
    const fmt = (xs, f) => {
      const groups = new Map()
      for (const x of xs) {
        const k = `${x.id}${f(x)}`
        groups.set(k, [...(groups.get(k) ?? []), x.tier])
      }
      const span = (ts) => (ts.length > 1 && ts.at(-1) - ts[0] === ts.length - 1 ? `${ts[0]}–${ts.at(-1)}` : ts.join(','))
      return [...groups].map(([k, ts]) => `t${span(ts)} ${k}`).join(', ')
    }
    console.log(
      `[${key}] 사라진 이름 ${r.lost.length}${r.lost.length ? ` ✗ — ${fmt(r.lost, (x) => x.why)}` : ''}` +
        (r.moved.length ? `\n   쪽·자리가 바뀐 이름 ${r.moved.length} — ${fmt(r.moved, (x) => ` ${JSON.stringify(x.from)}→${JSON.stringify(x.to)}`)}` : '') +
        (r.exempt.length ? `\n   (새로 생긴·없어진 카드의 이름 ${r.exempt.length} — ${fmt(r.exempt, () => '')})` : ''),
    )
  }
for (const id of TRACK)
  for (const [key, tiers] of Object.entries(now)) {
    const [kind, rest] = id.startsWith('area:') ? ['area', id.slice(5)] : ['points', id]
    const at = tiers.map((t, tier) => (rest in t[kind] ? `t${tier}${kind === 'points' ? `:${t.points[rest]}` : ''}` : null)).filter(Boolean)
    console.log(`[${key}] ${id}: ${at.length ? at.join(' ') : '자리 없음'}`)
  }
const newViews = Object.keys(now).filter((k) => !(k in ref.views))
if (missingViews.length) console.log(`기준에 있는데 지금 열리지 않는 보기: ${missingViews.join(' ')} ✗`)
if (newViews.length) console.log(`기준에 없는 보기 (견주지 않는다): ${newViews.join(' ')}`)
if (!ref.views[Object.keys(ref.views)[0]]?.[0] || Object.values(ref.views).every((v) => v.every((t) => Object.values(t.points).every((s) => s === null))))
  console.log('기준에 이름 쪽(sides)이 없다 — 쪽·자리 견주기는 건너뛰었다')
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 1))
const fail = losses + missingViews.length
console.log(`기준 ${ref.meta.commit ?? COMPARE} 과 견줌: 사라진 이름 ${losses}, 쪽·자리가 바뀐 이름 ${changes}, 새로 생긴·없어진 카드의 이름 ${exempted}`)
process.exit(fail ? 1 : 0)
