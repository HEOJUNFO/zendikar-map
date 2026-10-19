// 사가 보기 바이트 회귀 — 시점별 보기(?time)를 더하는 동안 사가 보기(?saga=s&phase=p, 이어 센 단계 1–5)와 페이즈를 끈 지도(단계 0)가
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
// 1. 화면 — 단계 0–5(끔, 사가1 페이즈1–3, 사가2 페이즈1–2) × 고정 시점(tier 0–6: 개관, 대륙, 할리마르, 지역 상세가 나오는 바다 관문·산호투구·
//    말라키르·마킨디)마다 svg.zendikar-map 의 outerHTML. 그림 이름 묶음의 style(--inv-px)은 화면을 뜨는 때의 시점 경쟁이라 지운다(svgdiff.mjs 와 같다).
//    기준선 폴더에 <이름>.svg 로 남기고, 견줄 때 다르면 처음 다른 자리 앞뒤를 보인다 (자세한 차이는 svgdiff.mjs <기준.svg> <견줄.svg>).
// 2. 생성물 — git --ref(기본 main)의 것과 견준다: src/map/childmaps/*.ts 는 시점별 보기만 쓰는 열쇠(time·timeOnly·for, 그림의 timeReady)를
//    지운 뒤, src/map/figures/*.ts·frames.json·src/map/figures.ts·src/map/childMapSizes.ts 는 그대로.
//    (페이즈 카드의 지도 조각 ?map 은 time 필드를 더 싣지만 사가 보기는 읽지 않는다 — 화면 비교가 그것을 본다)
// headless Chrome 은 scripts/qa/chrome.mjs 의 launchChrome() 으로만 띄운다
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { launchChrome } from './chrome.mjs'

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

/** 이어 센 단계 → 주소 (0 은 페이즈를 끈 지도) */
const LEVELS = [
  ['L0', ''],
  ['L1', 'saga=1&phase=1'],
  ['L2', 'saga=1&phase=2'],
  ['L3', 'saga=1&phase=3'],
  ['L4', 'saga=2&phase=1'],
  ['L5', 'saga=2&phase=2'],
]
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
const SHOTS = LEVELS.flatMap(([l, q]) => VIEWS.map(([v, vq]) => [`${l}-${v}`, [q, vq].filter(Boolean).join('&')]))

/** 시점별 보기만 쓰는 열쇠를 지운 생성물 (지역 상세 그림) */
const stripTime = (s) =>
  s
    .replace(/, time: \{[^{}]*\}/g, '')
    .replace(/, timeOnly: true/g, '')
    .replace(/, for: \[[^\]]*\]/g, '')
    .replace(/^\s*timeReady: \{[^\n]*\},?\n/gm, '')

/** 견줄 생성물 — [트리 안의 경로, 지울 것] */
function staticFiles() {
  const list = []
  for (const f of fs.readdirSync(path.join(ROOT, 'src/map/childmaps')).filter((x) => x.endsWith('.ts')).sort()) list.push([`src/map/childmaps/${f}`, stripTime])
  for (const f of fs.readdirSync(path.join(ROOT, 'src/map/figures')).filter((x) => x.endsWith('.ts') || x.endsWith('.json')).sort()) list.push([`src/map/figures/${f}`, null])
  list.push(['src/map/figures.ts', null], ['src/map/childMapSizes.ts', null])
  return list
}
function gitShow(ref, file) {
  try {
    return execFileSync('git', ['show', `${ref}:${file}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return null
  }
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
      console.log(`✗ 생성물 ${file}${strip ? ' (time·timeOnly·for 를 지운 뒤)' : ''}\n  ${firstDiff(a, b)}`)
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
  console.log(failed ? `생성물: ${failed}개 다름` : `생성물: ${staticFiles().length}개 모두 ${REF} 와 같다`)
}

// 1. 화면
if (!STATIC_ONLY) {
  fs.mkdirSync(DIR, { recursive: true })
  const metaFile = path.join(DIR, 'meta.json')
  if (SAVE) fs.writeFileSync(metaFile, JSON.stringify({ w: W, h: H, at: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim() }, null, 1))
  else if (fs.existsSync(metaFile)) {
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'))
    if (meta.w !== W || meta.h !== H) throw new Error(`기준선은 ${meta.w}×${meta.h} 로 떴다 — --w ${meta.w} --h ${meta.h}`)
  }
  const chrome = await launchChrome({ width: W, height: H, maxMinutes: 40 })
  try {
    const shots = SHOTS.filter(([n]) => !ONLY || ONLY.includes(n))
    let same = 0
    for (const [name, query] of shots) {
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
      if (SAVE) {
        fs.writeFileSync(file, svg)
        console.log(`기준선 ${name}  ${svg.length}B${warn}`)
        continue
      }
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
    if (COMPARE) console.log(`화면: ${same}/${shots.length} 같다`)
  } finally {
    await chrome.close()
  }
}
process.exit(failed ? 1 : 0)
