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
// 지금 없는 카드의 이름(card:·fig:)은 알리기만 한다. 그림 이름(fig:)이 빠진 자리에 같은 이름의 카드나 같은 time.same 묶음의 카드(timeline.ts V4 —
// 한 시점에 하나)가 지금 그 보기·tier 에 이름 자리를 받았으면 그 카드가 시점을 넘겨받은 것이라 '넘겨받음'으로 알리기만 한다(예: 2020년의 Anowon). 이름 쪽(sides)·지역 이름 자리(areaAt)가 바뀐 것은 실패가 아니라 목록으로 보인다
// (기준이 sides·areaAt 를 내놓지 않는 트리에서 남긴 것이면 그 견주기는 건너뛴다 — 그 트리에 ZendikarMap.tsx 의 ?labelcheck 두 줄을 붙여 남기면 된다).
// 그림을 받지 못한 보기: 페이즈 데이터·그림 조각이 늦거나 오지 않으면 그 보기의 그림 이름이 통째로 빠져 수백·수천 개가 '사라진 이름'으로 나온다.
// 그래서 보기마다 무너졌는지 본다 — 그림을 그리는 보기(그 단계의 페이즈 카드가 있는 사가 단계, 시점. 견줄 때는 기준에도 그림 이름이 있는 보기)에 그림이 0장이거나,
// 견줄 때 그림 이름(fig:)·모든 이름의 수가 기준의 반도 안 되면
// (기준에 그림 이름이 20개 넘게, 이름이 50개 넘게 있을 때) 그 보기를 더 오래 기다려(이름 자리가 8초 그대로일 때까지, 그림 0장은 30초까지) 두 번까지 다시 읽는다.
// 그래도 무너지면 그 보기는 '사라진 이름'이 아니라 '믿을 수 없음'으로 적고 견주지 않는다 (--save 면 기준의 meta.unreliable 에 남겨 그 보기는 뒤의 견주기에서 건너뛴다).
// 무너짐은 반 넘게 빠질 때만이라 이름 하나·몇 개가 사라진 것은 그대로 실패다. 페이지가 던진 오류(Runtime.exceptionThrown)는 무너짐이 아니라 실패다 — 다시 읽지 않는다.
// 종료 코드: 사라진 이름·열리지 않는 보기·오류를 던진 보기가 있으면 1, 그 밖에 믿을 수 없는 보기가 있으면 3, 아니면 0.
// [--block-figures 보기-언어:번,…] 시험용 — 그 보기를 앞의 그 번만큼 읽을 때 페이즈 데이터·그림 조각 요청을 막는다 (예: L4-ko:1 은 한 번 다시 읽어 낫고, L4-ko:3 은 믿을 수 없음)
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
/** 무너진 보기를 다시 읽는 번 수 */
const RETRIES = 2
/** --block-figures — 보기-언어 → 막을 읽기 번 수 (시험용) */
const BLOCK = new Map(
  (opt('block-figures', null)?.split(',') ?? []).map((x) => {
    const [key, n] = x.split(':')
    return [key, Number(n ?? 1)]
  }),
)
/** 막을 요청 — 페이즈 카드의 지도 조각(src/data/phase<n>.ts?map — 고친 뒤의 개발 서버는 ?t=…&map)과 그림 묶음(src/map/figures/…, figures-time/…) */
const BLOCK_URLS = ['*/src/data/phase*.ts?*map*', '*/src/map/figures/*', '*/src/map/figures-time/*']
const W = 1440
const H = 900

const { PHASE_SLOTS } = await import(path.join(ROOT, 'src/data/sagas.ts'))
const { SHOWN_TIMES } = await import(path.join(ROOT, 'src/data/timeline.ts'))
const { LAND_CARDS } = await import(path.join(ROOT, 'src/data/cards.ts'))
const { BY_PHASE } = await import(path.join(ROOT, 'scripts/phase-cards.mjs'))
const CARD_IDS = [...new Set([...LAND_CARDS.map((c) => c.id), ...BY_PHASE.flat().map((c) => c.id)])].sort()
/** 페이즈 카드 id → 같은 이름의 카드·같은 time.same 묶음의 다른 카드 id (timeline.ts V4 — 한 시점에 하나라 그 시점은 다른 카드가 맡는다) */
const HEIRS = (() => {
  const cards = [...new Map(BY_PHASE.flat().map((c) => [c.id, c])).values()]
  const keys = (c) => [`이름 ${c.name}`, ...(c.time?.same ? [`same ${c.time.same}`] : [])]
  const groups = new Map()
  for (const c of cards) for (const k of keys(c)) groups.set(k, [...(groups.get(k) ?? []), c.id])
  return new Map(cards.map((c) => [c.id, [...new Set(keys(c).flatMap((k) => groups.get(k)))].filter((id) => id !== c.id)]))
})()
const VIEWS = [
  ['off', ''],
  ...PHASE_SLOTS.map((p) => [`L${p.level}`, `saga=${p.saga}&phase=${p.local}`]),
  ...SHOWN_TIMES.map((x) => [`T${x.t}`, `time=${x.t}`]),
].filter(([name]) => !ONLY || ONLY.includes(name))
if (ONLY) for (const v of ONLY) if (!VIEWS.some(([name]) => name === v)) throw new Error(`--views: 없는 보기 '${v}'`)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 읽기 한 번의 기다림 — settle: 이름 자리가 그대로인 0.5초 칸 수, empty: 그림이 0장일 때 받아들이는 칸 수, polls: 모두 몇 칸까지 */
const SETTLE = { settle: 6, empty: 20, polls: 120 }
const SETTLE_LONG = { settle: 16, empty: 60, polls: 240 }

/** 보기 하나의 이름 자리 — __zmLabels 가 몇 초 바뀌지 않을 때까지 (페이즈를 켠 보기는 그림이 들어온 뒤에). block 이면 그림 조각을 막는다 (시험용) */
async function read(chrome, query, lang, { settle, empty, polls } = SETTLE, block = false) {
  const url = `${BASE}/?${[query, 'labelcheck', lang === 'ko' ? 'lang=ko' : ''].filter(Boolean).join('&')}`
  const { sessionId, targetId } = await chrome.newPage('', { w: W, h: H })
  const errors = []
  const off = chrome.on((m) => {
    if (m.sessionId === sessionId && m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text)
  })
  try {
    if (block) {
      await chrome.send('Network.enable', {}, sessionId)
      await chrome.send('Network.setBlockedURLs', { urls: BLOCK_URLS }, sessionId)
    }
    const loaded = new Promise((resolve) => {
      const stop = chrome.on((m) => {
        if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') {
          stop()
          resolve()
        }
      })
    })
    await chrome.send('Page.navigate', { url }, sessionId)
    await loaded
    let last = ''
    let same = 0
    for (let i = 0; i < polls; i++) {
      await sleep(500)
      const r = await chrome.send('Runtime.evaluate', { expression: 'JSON.stringify(window.__zmLabels ?? null)', returnByValue: true }, sessionId)
      const v = r.result.value
      if (v !== 'null' && v === last) same++
      else same = 0
      last = v
      const parsed = JSON.parse(v)
      // 그림이 없는 단계(그린 것이 아직 없는 사가)도 있으니 오래 그대로면 받아들인다
      if (parsed && same >= settle && (!query || parsed.figures.length || same >= empty)) {
        if (errors.length) throw Object.assign(new Error(`${url}: ${errors[0]}`), { pageError: true })
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

/** 그림을 그리는 보기인가 — 그 단계의 페이즈 카드가 있는 사가 단계(그린 것이 아직 없는 사가는 그림 0장이 맞다), 시점 */
const drawsFigures = (name) => name[0] === 'T' || (name[0] === 'L' && (BY_PHASE[Number(name.slice(1)) - 1]?.length ?? 0) > 0)
const figCount = (s) => s.reduce((n, t) => n + Object.keys(t.points).filter((id) => id.startsWith('fig:')).length, 0)
const nameCount = (s) => s.reduce((n, t) => n + Object.keys(t.points).length + Object.keys(t.area).length, 0)
/**
 * 보기가 무너졌는가 (그림을 받지 못했다) — 까닭, 아니면 null. 그림을 그리는 보기(끔 밖)에 그림이 0장, 또는 기준(ref — 견줄 때)보다 그림 이름이나
 * 모든 이름이 반도 안 된다 (기준에 그림 이름이 20개, 이름이 50개 넘을 때만 — 이름 몇 개가 사라진 것은 무너짐이 아니라 사라진 이름이다)
 */
function collapseOf(name, z, s, ref) {
  if (drawsFigures(name) && (!ref || figCount(ref) > 0) && !z.figures.length) return '그림 0장 — 페이즈 데이터를 받지 못했다'
  if (!ref) return null
  const [fa, fb, na, nb] = [figCount(ref), figCount(s), nameCount(ref), nameCount(s)]
  if (fa > 20 && fb < fa / 2) return `그림 이름 ${fb} — 기준 ${fa} 의 반도 안 된다 (그림 ${z.figures.length}장)`
  if (na > 50 && nb < na / 2) return `이름 ${nb} — 기준 ${na} 의 반도 안 된다`
  return null
}

/**
 * 보기마다 이름 자리를 읽는다. 무너진 보기(collapseOf)는 더 오래 기다려 RETRIES 번까지 다시 읽고, 그래도 무너지면 unreliable 에 까닭을 적는다.
 * refViews: 견줄 기준의 보기들 (--save 면 없다)
 */
async function dump(refViews) {
  const chrome = await launchChrome({ width: W, height: H, maxMinutes: 60 })
  const out = {}
  const unreliable = {}
  const retried = {}
  const failed = {}
  const jobs = VIEWS.flatMap(([name, query]) => LANGS.map((lang) => [`${name}-${lang}`, name, query, lang]))
  try {
    // 탭 몇 개를 함께 — 결과는 보기 차례로 담는다
    const done = new Map()
    let next = 0
    const worker = async () => {
      while (next < jobs.length) {
        const [key, name, query, lang] = jobs[next++]
        let why = null
        for (let attempt = 0; attempt <= RETRIES; attempt++) {
          try {
            const z = await read(chrome, query, lang, attempt ? SETTLE_LONG : SETTLE, attempt < (BLOCK.get(key) ?? 0))
            const s = shape(z)
            done.set(key, s)
            why = collapseOf(name, z, s, refViews?.[key])
          } catch (e) {
            // 페이지가 던진 오류는 늦은 그림이 아니라 고장이다 — 다시 읽지 않고 실패로
            if (e.pageError) {
              failed[key] = String(e.message ?? e).split('\n')[0]
              why = null
              break
            }
            why = `읽지 못했다 — ${String(e.message ?? e).split('\n')[0]}`
          }
          if (!why) break
          ;(retried[key] ??= []).push(why)
          process.stderr.write(`\n${key}: 무너졌다 (${why})${attempt < RETRIES ? ' — 더 오래 기다려 다시 읽는다' : ''}\n`)
        }
        if (why) unreliable[key] = why
        process.stderr.write(`${key} `)
      }
    }
    await Promise.all(Array.from({ length: JOBS }, worker))
    for (const [key] of jobs) if (done.has(key)) out[key] = done.get(key)
  } finally {
    await chrome.close()
    process.stderr.write('\n')
  }
  return { views: out, unreliable, retried, failed }
}

const commitOf = () => {
  try {
    return execFileSync('git', ['-C', ROOT, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

if (SAVE) {
  const { views, unreliable, retried, failed } = await dump()
  for (const [key, e] of Object.entries(failed)) console.log(`[${key}] 페이지가 오류를 던졌다 ✗ — ${e}`)
  if (Object.keys(failed).length) {
    console.log('기준을 남기지 않았다 — 오류를 던진 보기가 있다')
    process.exit(1)
  }
  fs.mkdirSync(SAVE, { recursive: true })
  const meta = { base: BASE, root: ROOT, commit: commitOf(), saved: new Date().toISOString(), w: W, h: H, langs: LANGS, views: VIEWS.map((v) => v[0]), cards: CARD_IDS, unreliable, retried }
  fs.writeFileSync(path.join(SAVE, 'labels.json'), JSON.stringify({ meta, views }))
  console.log(`${SAVE}/labels.json — 보기 ${VIEWS.length} × 언어 ${LANGS.length} (트리 ${meta.commit ?? ROOT})`)
  for (const [key, whys] of Object.entries(retried)) console.log(`다시 읽은 보기 ${key}: ${whys.join(' / ')}${unreliable[key] ? ' — 믿을 수 없음 ✗' : ' — 다시 읽어 나았다'}`)
  if (Object.keys(unreliable).length) console.log(`믿을 수 없는 보기 ${Object.keys(unreliable).join(' ')} — 기준에 적어 두어 뒤의 견주기에서 건너뛴다. 다시 남기는 것이 낫다`)
  process.exit(Object.keys(unreliable).length ? 3 : 0)
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
const { views: now, unreliable, retried, failed } = await dump(ref.views)
const refUnreliable = ref.meta.unreliable ?? {}
const report = { ref: ref.meta.commit, views: {}, unreliable, refUnreliable, retried, failed }
for (const [key, e] of Object.entries(failed)) console.log(`[${key}] 페이지가 오류를 던졌다 ✗ — ${e}`)
let losses = 0
let changes = 0
let exempted = 0
let handed = 0
const missingViews = []
for (const name of ref.meta.views.filter((v) => !ONLY || ONLY.includes(v)))
  for (const lang of LANGS_CMP) {
    const key = `${name}-${lang}`
    const a = ref.views[key]
    const b = now[key]
    // 무너진 보기 — 그림을 받지 못해 이름이 통째로 빠졌다. 사라진 이름으로 세지 않고 믿을 수 없음으로 (기준이 무너진 보기도)
    if (unreliable[key] || refUnreliable[key]) {
      const why = unreliable[key] ? `지금 ${unreliable[key]}` : `기준 ${refUnreliable[key]}`
      // 견주었다면 사라진 이름으로 셌을 수 (기준에 있고 지금 그 tier 에 없는 이름 — 알리기만 한다)
      const gone = b ? a.reduce((n, ta, tier) => n + [...Object.keys(ta.points), ...Object.keys(ta.area).map((id) => `area:${id}`)].filter((id) => !(b[tier] && (id.startsWith('area:') ? id.slice(5) in b[tier].area : id in b[tier].points))).length, 0) : null
      console.log(`[${key}] 믿을 수 없음 ✗ — ${why}${retried[key] ? ` (${retried[key].length}번 읽어도)` : ''} — 견주지 않았다${gone !== null ? ` (견주었다면 빠진 이름 ${gone})` : ''}`)
      report.views[key] = { unreliable: why, wouldBeLost: gone }
      continue
    }
    if (failed[key]) continue
    if (!b) {
      missingViews.push(key)
      continue
    }
    if (retried[key]) console.log(`[${key}] 처음 읽기가 무너져 다시 읽었다 (${retried[key].join(' / ')})`)
    const r = { lost: [], exempt: [], moved: [], handover: [] }
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
          // 넘겨받음은 시점별 지도(T*)에서만 — V4 가 한 시점에 한 장을 약속하는 곳은 그곳뿐이라, 사가 보기에서 같은 묶음의 두 카드가 함께 그려지는 날에도 진짜 사라짐을 넘겨받음으로 숨기지 않는다
          const heir = name.startsWith('T') && id.startsWith('fig:') ? HEIRS.get(id.slice(4))?.map((h) => `fig:${h}`).find((h) => h in tb.points && !(h in ta.points)) : undefined
          if (exempt(id)) r.exempt.push({ tier, id })
          else if (heir) r.handover.push({ tier, id, to: heir })
          else r.lost.push({ tier, id, why: '' })
        } else if (side && tb.points[id] && side !== tb.points[id]) r.moved.push({ tier, id, from: side, to: tb.points[id] })
      }
    })
    losses += r.lost.length
    changes += r.moved.length
    exempted += r.exempt.length
    handed += r.handover.length
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
        (r.handover.length ? `\n   같은 이름·같은 개체의 카드가 넘겨받은 이름 ${r.handover.length} — ${fmt(r.handover, (x) => ` → ${x.to}`)}` : '') +
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
const fail = losses + missingViews.length + Object.keys(failed).length
const shaky = [...new Set([...Object.keys(unreliable), ...Object.keys(refUnreliable)])].filter((k) => ref.meta.views.some((v) => k.startsWith(`${v}-`) && (!ONLY || ONLY.includes(v))))
console.log(
  `기준 ${ref.meta.commit ?? COMPARE} 과 견줌: 사라진 이름 ${losses}, 쪽·자리가 바뀐 이름 ${changes}, 넘겨받은 이름 ${handed}, 새로 생긴·없어진 카드의 이름 ${exempted}` +
    `, 다시 읽은 보기 ${Object.keys(retried).length}, 믿을 수 없는 보기 ${shaky.length}${shaky.length ? ` (${shaky.join(' ')})` : ''}, 오류를 던진 보기 ${Object.keys(failed).length}`,
)
process.exit(fail ? 1 : shaky.length ? 3 : 0)
