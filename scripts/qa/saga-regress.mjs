// 사가 보기 바이트 회귀 — 시점별 보기(?time)나 새 사가를 더하는 동안 사가 보기(?saga=s&phase=p, 이어 센 단계 1–)와 페이즈를 끈 지도(단계 0)가
// 바이트까지 그대로인지 본다. 바꾸기 전(main)에 기준선을 남기고, 단계마다 견준다.
//
//   pnpm dev 뒤 (--base 로 그 주소):
//   node scripts/qa/saga-regress.mjs --save <폴더>     [--base http://localhost:5173]   # 기준선을 남긴다 — main 에서
//   node scripts/qa/saga-regress.mjs --compare <폴더>  [--base …] [--ref main]          # 지금 트리를 기준선과 견준다 (다르면 종료 코드 1)
//   [--only 이름,…]       화면 몇 개만 (이름은 아래 SHOTS 의 '<단계>-<시점>', 예: L3-sea-gate)
//   [--static-only]       화면은 건너뛰고 생성물만 견준다 (개발 서버가 없어도 된다)
//   [--w 1440 --h 900]    화면 크기 (기준선과 같아야 한다 — 기준선 폴더의 meta.json 에 적어 둔다)
//   [--settle 1200]       SVG 가 이만큼(ms) 바뀌지 않으면 다 그려진 것으로 본다 · [--timeout 45000] 한 화면을 기다리는 가장 긴 시간
//
// 두 가지를 본다.
// 1. 화면 — 단계 0–6(끔, 사가1 페이즈1–3, 사가2 페이즈1–2, 사가3 페이즈1 — 사가의 세트 차례로 센다) × 고정 시점(tier 0–6: 개관, 대륙, 할리마르,
//    지역 상세가 나오는 바다 관문·산호투구·말라키르·마킨디)마다 svg.zendikar-map 의 outerHTML. 그림 이름 묶음의 style(--inv-px)은 화면을 뜨는 때의
//    시점 경쟁이라 지운다(svgdiff.mjs 와 같다). 기준선 폴더에 <이름>.svg 로 남기고(meta.json 에 뜬 단계), 견줄 때 다르면 처음 다른 자리 앞뒤를 보인다
//    (자세한 차이는 svgdiff.mjs <기준.svg> <견줄.svg>).
//    - 아직 열리지 않는 단계(그 사가가 phases: 0 — 지금 사가3 의 L6)는 뜨지 않고 건너뛴다고 알린다.
//    - 기준선에 없는 단계(그 단계를 더하기 전에 남긴 기준선)는 기준선과 견주지 않는다고 알린다 (실패가 아니다).
//    - 그 사가에 그린 것이 아직 없는 단계(페이즈 카드·그 사가에 매인 대지 카드·그 단계의 페이즈 바탕 항목이 모두 없다 — 지금 L6)는 같은 시점의
//      L0(끔) 화면과 바이트까지 같아야 한다 — 그 단계가 기본 바탕을 그린다는 단언 (다르면 실패).
// 2. 생성물 — git --ref(기본 main)의 것과 견준다: src/map/childmaps/*.ts 는 시점별 보기만 쓰는 열쇠(time·timeOnly·for, 그림의 timeReady —
//    timeOnly 항목은 사가 보기가 그리지 않으니 줄째)를 지운 뒤, src/map/figures/*.ts·frames.json·src/map/figures.ts·src/map/childMapSizes.ts 는 그대로.
//    ref 뒤에 더한 단계(ref 의 FIGURE_GROUPS 묶음 이름 끝 '-n' 의 가장 큰 n 보다 뒤 — ref 가 main 이면 6 부터)의 생성물은 사가 보기 L0–(그 n)이
//    받지 않으니 지운 뒤 견준다 (새 단계 n 마다, 아래 stripNew):
//    - src/map/figures/<묶음>-n.ts 파일은 견주지 않는다 (ref 에 없는 파일로 세지 않는다)
//    - frames.json 의 그림 가운데 묶음이 '-n' 으로 끝나는 것 (JSON 으로 읽어 지운 뒤 같은 꼴로 다시 써서 견준다)
//    - src/map/figures.ts 의 FIGURE_GROUPS 의 '…-n' 항목, LEAD_GROUPS 의 n 항목, 머리 주석의 원본 범위 'phase1.ts~phase<k>.ts'
//    - src/map/childmaps/*.ts 의 phaseN 문: 'phaseN: true' 가 붙은 항목은 줄째(그 단계에서만 그린다), ', phaseN: false' 는 열쇠만(그 앞 단계에서는 늘 맞는다)
//    시점별 보기만 받는 그림 묶음 src/map/figures-time/(scripts/figures/to_ts.mjs 의 timeGroupOf)은 사가 보기가 받지 않으니 견주지 않는다.
//    (페이즈 카드의 지도 조각 ?map 은 time 필드를 더 싣지만 사가 보기는 읽지 않는다 — 화면 비교가 그것을 본다)
// headless Chrome 은 scripts/qa/chrome.mjs 의 launchChrome() 으로만 띄운다
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { launchChrome } from './chrome.mjs'
import { LAND_CARDS } from '../../src/data/cards.ts'
import { periodAt } from '../../src/data/periods/index.ts'
import { PHASE_SLOTS, SAGAS, slotOf } from '../../src/data/sagas.ts'
import { BY_PHASE } from '../phase-cards.mjs'

const argv = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i < 0 ? fallback : argv[i + 1]
}
const has = (name) => argv.includes(`--${name}`)
const SAVE = opt('save', null)
const COMPARE = opt('compare', null)
const BASE = opt('base', 'http://localhost:5173')
const REF = opt('ref', 'main')
const ONLY = opt('only', null)?.split(',')
const W = Number(opt('w', 1440))
const H = Number(opt('h', 900))
const SETTLE = Number(opt('settle', 1200))
const TIMEOUT = Number(opt('timeout', 45000))
const STATIC_ONLY = has('static-only')
if (!SAVE === !COMPARE) {
  console.error('사용법: node scripts/qa/saga-regress.mjs --save <폴더> | --compare <폴더> [--base 주소] [--ref main] [--only 이름,…] [--static-only]')
  process.exit(2)
}
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const DIR = path.resolve(SAVE ?? COMPARE)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 사가의 세트 차례로 센 단계 — [이어 센 번호, 사가, 그 사가 안의 페이즈] (아직 phases 에 들지 않은 세트도) */
const PLANNED = SAGAS.flatMap((s, i) => s.sets.map((_, j) => [i + 1, j + 1])).map(([saga, local], k) => ({ level: k + 1, saga, local }))
/** 이어 센 단계 → 주소 (0 은 페이즈를 끈 지도). 열리지 않는 단계(그 사가가 phases: 0)는 open: false */
const LEVELS = [
  ['L0', '', true],
  ...PLANNED.map((p) => [`L${p.level}`, `saga=${p.saga}&phase=${p.local}`, Boolean(slotOf(p.level))]),
]
for (const p of PHASE_SLOTS) if (PLANNED[p.level - 1]?.saga !== p.saga || PLANNED[p.level - 1]?.local !== p.local) throw new Error(`단계 ${p.level} 가 세트 차례와 다르다`)
/** 그 사가에 그린 것이 아직 없는 단계 — 그 단계에 그리는 페이즈 카드(그 사가의 첫 페이즈부터)·그 사가에 매인 대지 카드·그 단계의 페이즈 바탕 항목이 없다 */
const blankLevel = (level) => {
  const p = PLANNED[level - 1]
  if (!p) return false
  const cards = BY_PHASE.slice(level - p.local, level).flat()
  const set = periodAt(level)
  return !cards.length && !LAND_CARDS.some((c) => c.saga === p.saga) && Object.values(set).every((xs) => xs.length === 0)
}
const BLANK = new Set(LEVELS.filter(([n, , open]) => open && n !== 'L0' && blankLevel(Number(n.slice(1)))).map(([n]) => n))
/** 고정 시점 — 1440×900 에서 tier 0–6 을 지나고, 지역 상세(더 깊은 지역 상세 포함)가 나오는 곳 */
const VIEWS = [
  // 개관 (tier 1)
  ['overview', ''],
  // 대륙 — 타짐·온두 사이 (tier 2–3)
  ['tazeem', 'view=900,650,3'],
  // 할리마르 (tier 4)
  ['halimar', 'view=1019,558,6'],
  // 할리마르 지역 상세 (tier 5)
  ['halimar-detail', 'view=1019,558,11'],
  // 바다 관문 — 할리마르 안의 더 깊은 지역 상세 (tier 6)
  ['sea-gate', 'view=1134.5,574,22'],
  // 산호투구 — 할리마르 안의 더 깊은 지역 상세 (tier 6)
  ['coralhelm', 'view=995,581,22'],
  // 말라키르 (tier 5)
  ['malakir', 'view=1907,1096,12'],
  // 마킨디 참호 (tier 5)
  ['makindi', 'view=353,958,12'],
]
const SHOTS = LEVELS.filter(([, , open]) => open).flatMap(([l, q]) => VIEWS.map(([v, vq]) => [`${l}-${v}`, [q, vq].filter(Boolean).join('&'), l, v]))
for (const [l, q, open] of LEVELS) if (!open) console.log(`· ${l} (${q}) — 그 사가가 아직 열리지 않아(phases: 0) 건너뛴다`)

/** 시점별 보기만 쓰는 열쇠를 지운 생성물 (지역 상세 그림) — 시점별 보기만의 항목(timeOnly, 한 줄에 하나)은 사가 보기가 그리지 않으니 줄째 지운다 */
const stripTime = (s) =>
  s
    .replace(/^[^\n]*, timeOnly: true[^\n]*\n/gm, '')
    .replace(/, time: \{[^{}]*\}/g, '')
    .replace(/, timeOnly: true/g, '')
    .replace(/, for: \[[^\]]*\]/g, '')
    .replace(/^\s*timeReady: \{[^\n]*\},?\n/gm, '')

function gitShow(ref, file) {
  try {
    return execFileSync('git', ['show', `${ref}:${file}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return null
  }
}
/** ref 가 아는 가장 뒤 단계 — ref 의 FIGURE_GROUPS 묶음 이름 끝 '-n' 의 가장 큰 n (없으면 1). 그 뒤 단계의 생성물은 지운 뒤 견준다 */
const REF_LAST = (() => {
  const src = gitShow(REF, 'src/map/figures.ts') ?? ''
  const groups = /export const FIGURE_GROUPS[^=]*= \[([^\]]*)\]/.exec(src)?.[1] ?? ''
  return Math.max(1, ...[...groups.matchAll(/'[^']*?-(\d+)'/g)].map((m) => Number(m[1])))
})()
/** ref 뒤에 더한 단계 (세트 차례로 센 것 가운데) */
const NEW_LEVELS = PLANNED.map((p) => p.level).filter((l) => l > REF_LAST)
/** 그 단계의 그림 묶음 이름인가 ('…-n' — 시점별 묶음 '-t…' 와 겹치지 않는다) */
const newGroup = (g) => NEW_LEVELS.some((n) => g.endsWith(`-${n}`))
/** ref 뒤 단계의 생성물을 지운다 — 파일 종류마다 (머리 주석의 규칙) */
const stripNew = {
  childmap: (s) =>
    NEW_LEVELS.reduce((t, n) => t.replace(new RegExp(`^[^\\n]*, phase${n}: true[^\\n]*\\n`, 'gm'), '').replace(new RegExp(`, phase${n}: false`, 'g'), ''), s),
  frames: (s) => JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(s)).filter(([, v]) => !newGroup(v[0])))),
  figures: (s) =>
    s
      .replace(/(export const FIGURE_GROUPS[^=]*= \[)([^\]]*)\]/, (_, head, items) => `${head}${items.split(', ').filter((x) => !newGroup(x.slice(1, -1))).join(', ')}]`)
      .replace(/(const LEAD_GROUPS[^=]*= \{)([^}]*)\}/, (_, head, items) => `${head}${NEW_LEVELS.reduce((t, n) => t.replace(new RegExp(`, ${n}: \\['[^']*', \\d+\\]`), ''), items)}}`)
      .replace(/(자리·크기는 src\/data\/phase1\.ts~phase)\d+(\.ts 에)/, '$1·$2'),
}
const both = (...fs) => (s) => fs.reduce((t, f) => f(t), s)

/** 견줄 생성물 — [트리 안의 경로, 지울 것]. ref 뒤 단계의 그림 묶음 파일(<묶음>-n.ts)은 견주지 않는다 */
function staticFiles() {
  const list = []
  for (const f of fs.readdirSync(path.join(ROOT, 'src/map/childmaps')).filter((x) => x.endsWith('.ts')).sort()) list.push([`src/map/childmaps/${f}`, both(stripTime, stripNew.childmap)])
  for (const f of fs.readdirSync(path.join(ROOT, 'src/map/figures')).filter((x) => x.endsWith('.ts') || x.endsWith('.json')).sort()) {
    if (f.endsWith('.ts') && newGroup(f.slice(0, -3))) continue
    list.push([`src/map/figures/${f}`, f === 'frames.json' ? stripNew.frames : null])
  }
  list.push(['src/map/figures.ts', stripNew.figures], ['src/map/childMapSizes.ts', null])
  return list
}
/** 처음 다른 자리 앞뒤 */
function firstDiff(a, b, span = 160) {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return `글자 ${i}: 기준 …${a.slice(Math.max(0, i - 40), i + span)}…\n           지금 …${b.slice(Math.max(0, i - 40), i + span)}…`
}

let failed = 0
// 2. 생성물
if (COMPARE) {
  const seen = new Set()
  for (const [file, strip] of staticFiles()) {
    seen.add(file)
    const now = fs.readFileSync(path.join(ROOT, file), 'utf8')
    const was = gitShow(REF, file)
    if (was === null) {
      console.log(`✗ 생성물 ${file} — ${REF} 에 없는 파일`)
      failed++
      continue
    }
    const [a, b] = strip ? [strip(was), strip(now)] : [was, now]
    if (a !== b) {
      console.log(`✗ 생성물 ${file}${strip ? ` (시점별 보기의 열쇠·단계 ${NEW_LEVELS.join('·') || '없음'} 의 것을 지운 뒤)` : ''}\n  ${firstDiff(a, b)}`)
      failed++
    }
  }
  // ref 에 있는데 지금 없는 생성물
  for (const dir of ['src/map/childmaps', 'src/map/figures']) {
    const names = execFileSync('git', ['ls-tree', '--name-only', `${REF}:${dir}`], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean)
    for (const n of names) {
      if (seen.has(`${dir}/${n}`) || fs.existsSync(path.join(ROOT, dir, n))) continue
      console.log(`✗ 생성물 ${dir}/${n} — 지금 트리에 없다`)
      failed++
    }
  }
  console.log(failed ? `생성물: ${failed}개 다름` : `생성물: ${staticFiles().length}개 모두 ${REF} 와 같다${NEW_LEVELS.length ? ` (${REF} 뒤 단계 ${NEW_LEVELS.join('·')} 의 것은 지우고)` : ''}`)
}

// 1. 화면
if (!STATIC_ONLY) {
  fs.mkdirSync(DIR, { recursive: true })
  const metaFile = path.join(DIR, 'meta.json')
  const shotLevels = [...new Set(SHOTS.map(([, , l]) => l))]
  if (SAVE)
    fs.writeFileSync(
      metaFile,
      JSON.stringify({ w: W, h: H, at: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(), levels: shotLevels }, null, 1),
    )
  /** 기준선에 있는 단계 — meta.json 에 적은 것(예전 기준선은 L0–L5) */
  let savedLevels = shotLevels
  if (!SAVE && fs.existsSync(metaFile)) {
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'))
    if (meta.w !== W || meta.h !== H) throw new Error(`기준선은 ${meta.w}×${meta.h} 로 떴다 — --w ${meta.w} --h ${meta.h}`)
    savedLevels = meta.levels ?? ['L0', 'L1', 'L2', 'L3', 'L4', 'L5']
  }
  /** 같은 시점의 L0 화면 (그린 것이 없는 단계의 단언) */
  const offShot = new Map()
  let blankSame = 0
  let blankShots = 0
  const chrome = await launchChrome({ width: W, height: H, maxMinutes: 40 })
  try {
    // 그린 것이 없는 단계를 보면 그 시점의 L0 도 뜬다 (--only 로 골랐어도)
    const picked = SHOTS.filter(([n]) => !ONLY || ONLY.includes(n))
    const shots = SHOTS.filter(([n, , l, v]) => !ONLY || ONLY.includes(n) || (l === 'L0' && picked.some(([, , pl, pv]) => BLANK.has(pl) && pv === v)))
    let same = 0
    let compared = 0
    for (const [name, query, level, viewName] of shots) {
      const url = `${BASE}/${query ? `?${query}` : ''}`
      const { sessionId, targetId } = await chrome.newPage(url, { w: W, h: H })
      const errors = []
      const off = chrome.on((m) => {
        if (m.sessionId !== sessionId) return
        if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text)
        if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '))
      })
      const grab = async () =>
        (
          await chrome.send(
            'Runtime.evaluate',
            { returnByValue: true, expression: `(() => { const s = document.querySelector('svg.zendikar-map'); return s ? s.outerHTML : '' })()` },
            sessionId,
          )
        ).result.value
      // 다 그려질 때까지 — SVG 가 SETTLE ms 동안 바뀌지 않을 때
      const t0 = Date.now()
      let svg = ''
      let stableSince = Date.now()
      while (Date.now() - t0 < TIMEOUT) {
        await sleep(300)
        const next = await grab()
        if (next !== svg) {
          svg = next
          stableSince = Date.now()
        } else if (svg && Date.now() - stableSince >= SETTLE) break
      }
      off()
      await chrome.send('Target.closeTarget', { targetId })
      if (!svg) throw new Error(`${name}: 지도 SVG 가 없다 (${url})`)
      svg = svg.replace(/ style="--inv-px:[^"]*"/g, '')
      const file = path.join(DIR, `${name}.svg`)
      const warn = errors.length ? `  ⚠ ${errors.slice(0, 2).join(' | ')}` : ''
      if (level === 'L0') offShot.set(viewName, svg)
      // 그린 것이 없는 단계는 끔과 같아야 한다 (기준선과 따로)
      if (BLANK.has(level)) {
        blankShots++
        const off = offShot.get(viewName)
        if (off === svg) blankSame++
        else {
          failed++
          const out = path.join(DIR, 'now', `${name}.svg`)
          fs.mkdirSync(path.dirname(out), { recursive: true })
          fs.writeFileSync(out, svg)
          console.log(`✗ ${name} — 그린 것이 없는 단계인데 L0-${viewName} 와 다르다, 지금 것은 ${out}\n  ${off ? firstDiff(off, svg) : 'L0 화면이 없다'}`)
        }
      }
      if (SAVE) {
        fs.writeFileSync(file, svg)
        console.log(`기준선 ${name}  ${svg.length}B${warn}`)
        continue
      }
      if (!savedLevels.includes(level)) {
        if (!BLANK.has(level)) console.log(`· ${name} — 기준선에 없는 단계라 견주지 않는다`)
        continue
      }
      compared++
      if (!fs.existsSync(file)) {
        console.log(`✗ ${name} — 기준선이 없다 (${file})`)
        failed++
        continue
      }
      const was = fs.readFileSync(file, 'utf8')
      if (was === svg) {
        same++
        if (warn) console.log(`= ${name}${warn}`)
      } else {
        failed++
        const out = path.join(DIR, 'now', `${name}.svg`)
        fs.mkdirSync(path.dirname(out), { recursive: true })
        fs.writeFileSync(out, svg)
        console.log(`✗ ${name} (${url}) — ${was.length}B → ${svg.length}B, 지금 것은 ${out}\n  ${firstDiff(was, svg)}${warn}`)
      }
    }
    if (COMPARE) console.log(`화면: ${same}/${compared} 같다`)
    if (blankShots) console.log(`그린 것이 없는 단계 ${[...BLANK].join('·')}: ${blankSame}/${blankShots} 화면이 L0 와 같다`)
  } finally {
    await chrome.close()
  }
}
process.exit(failed ? 1 : 0)
