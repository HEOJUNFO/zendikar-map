// CPU 프로필 — 첫 그리기와 끌기·휠 확대 중 어느 함수가 시간을 쓰는지 본다 (self time 상위).
//   pnpm build && pnpm preview 뒤: node scripts/perf/profile.mjs [--base http://localhost:4173] [--view x,y,k] [--saga s] [--phase [n]] [--mobile] [--cpu 4] [--switch] [--top 30]
//   --saga s: 주소 ?saga=s&phase=n (--phase 를 빼면 그 사가의 페이즈1). --saga 를 빼면 예전 주소 ?phase=n (사가1)
//   --time t: 시점별 보기 ?time=t (보이는 시점, src/data/timeline.ts — --saga·--phase 보다 앞선다. --switch 면 그 시점 단추를 누른다)
//   --cpu n: CPU 를 n 배 느리게 (데스크톱·휴대폰 모두). 기다리는 시간도 함께 늘린다
//   --switch: 페이즈를 끈 채 열고, 다 그린 뒤 머리말의 그 페이즈 단추를 눌러 켜는 동안을 따로 잰다(switch) — 페이즈를 켤 때 더해지는 긴 작업(longtask)
//   --incl=함수,… 는 이름 붙은 함수의 포함 시간 (--minify false 빌드에서 이름이 읽힌다)
// 프로덕션 빌드에서 재야 React 개발 모드 비용이 섞이지 않는다. 함수 이름은 압축돼 있으니 --sourcemap 빌드를 쓰면 위치가 읽힌다.
import { launchChrome } from '../qa/chrome.mjs'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : fallback
}
const flag = (name) => process.argv.includes(`--${name}`)
const BASE = arg('base', 'http://localhost:4173')
const VIEW = arg('view', null)
const TOP = Number(arg('top', 30))
// --phase 만 쓰면 페이즈1, --phase 2 처럼 숫자를 붙이면 그 페이즈
const SAGA = Number(arg('saga', '0')) || 0
const PHASE = flag('phase') ? Number(arg('phase', '1')) || 1 : SAGA ? 1 : 0
const TIME = Number(arg('time', '0')) || 0
const phaseQuery = TIME ? `time=${TIME}` : !PHASE ? '' : SAGA ? `saga=${SAGA}&phase=${PHASE}` : `phase=${PHASE}`
const CPU = Number(arg('cpu', '1')) || 1
const SWITCH = flag('switch')
if (SWITCH && !PHASE && !TIME) throw new Error('--switch 는 켤 페이즈(--saga·--phase)가 있어야 한다')
/** 기다리는 시간 — CPU 를 늦추면 그만큼 (절반 비율로) 늘린다 */
const slow = (ms) => ms * Math.max(1, CPU / 2)
const MOBILE = flag('mobile')
const W = MOBILE ? 390 : 1440
const H = MOBILE ? 844 : 900
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const summarize = (label, profile, total) => {
  const self = new Map()
  const byId = new Map(profile.nodes.map((n) => [n.id, n]))
  const dt = profile.timeDeltas
  profile.samples.forEach((id, i) => {
    const n = byId.get(id)
    const f = n.callFrame
    const key = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber + 1}:${f.columnNumber + 1}`
    self.set(key, (self.get(key) ?? 0) + (dt[i] ?? 0) / 1000)
  })
  // 이름 붙은 함수의 포함 시간(그 함수 아래에서 쓴 시간 전부) — 재귀는 한 번만 센다
  const parent = new Map()
  for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id)
  const incl = new Map()
  profile.samples.forEach((id, i) => {
    const seen = new Set()
    for (let cur = id; cur != null; cur = parent.get(cur)) {
      const name = byId.get(cur).callFrame.functionName
      if (!name || seen.has(name)) continue
      seen.add(name)
      incl.set(name, (incl.get(name) ?? 0) + (dt[i] ?? 0) / 1000)
    }
  })
  const rows = [...self.entries()].sort((a, b) => b[1] - a[1])
  const sum = rows.reduce((a, r) => a + r[1], 0)
  console.log(`\n== ${label}: ${sum.toFixed(0)}ms sampled${total ? `, wall ${total.toFixed(0)}ms` : ''}`)
  for (const [k, v] of rows.slice(0, TOP)) console.log(`${v.toFixed(1).padStart(8)}ms  ${k}`)
  const want = (process.argv.find((a) => a.startsWith('--incl='))?.slice(7) ?? '').split(',').filter(Boolean)
  if (want.length) console.log('  inclusive: ' + want.map((n) => `${n}=${(incl.get(n) ?? 0).toFixed(1)}ms`).join('  '))
  // --callers=fn: fn 의 self 시간을 부른 쪽(이름 있는 첫 조상 둘)별로
  const who = process.argv.find((a) => a.startsWith('--callers='))?.slice(10)
  if (who) {
    const by = new Map()
    profile.samples.forEach((id, i) => {
      if (byId.get(id).callFrame.functionName !== who) return
      const chain = []
      for (let cur = parent.get(id); cur != null && chain.length < 3; cur = parent.get(cur)) {
        const name = byId.get(cur).callFrame.functionName
        if (name && name !== who) chain.push(name)
      }
      const k = chain.join(' < ')
      by.set(k, (by.get(k) ?? 0) + (dt[i] ?? 0) / 1000)
    })
    for (const [k, v] of [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`  ${who} ${v.toFixed(1)}ms  < ${k}`)
  }
}

const chrome = await launchChrome({ width: W, height: H })
try {
  // --switch 면 페이즈를 끈 채 열고 단추로 켠다
  const q = [SWITCH ? '' : phaseQuery, VIEW ? `view=${VIEW}` : ''].filter(Boolean).join('&')
  const { sessionId } = await chrome.newPage('about:blank', { mobile: MOBILE, w: W, h: H })
  const send = (m, p = {}) => chrome.send(m, p, sessionId)
  if (CPU > 1) await send('Emulation.setCPUThrottlingRate', { rate: CPU })
  // 긴 작업(50ms 넘는 일) — 언제 시작했는지와 길이
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `window.__long = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push([e.startTime, e.duration]) }).observe({ type: 'longtask', buffered: true })`,
  })
  const longSince = async (t) => {
    const r = await send('Runtime.evaluate', { returnByValue: true, expression: `window.__long.filter(([s]) => s >= ${t}).map(([, d]) => Math.round(d))` })
    const d = r.result.value ?? []
    return `longtask n=${d.length} sum=${d.reduce((a, b) => a + b, 0)}ms max=${Math.max(0, ...d)}ms [${d.join(', ')}]`
  }
  await send('Profiler.enable')
  await send('Profiler.setSamplingInterval', { interval: 200 })
  await send('Page.enable')
  await send('Profiler.start')
  const t0 = Date.now()
  await send('Page.navigate', { url: `${BASE}/${q ? `?${q}` : ''}` })
  await sleep(slow(PHASE && !SWITCH ? 5000 : 3500))
  summarize(`load${q ? ` ?${q}` : ''}${CPU > 1 ? ` cpu×${CPU}` : ''}`, (await send('Profiler.stop')).profile, Date.now() - t0)
  console.log('  ' + (await longSince(0)))

  if (SWITCH) {
    // 머리말의 사가 무리 → 그 페이즈 단추
    await send('Profiler.start')
    const t2 = Date.now()
    const r = await send('Runtime.evaluate', {
      returnByValue: true,
      // 시점은 셋째 무리(.timeline)의 해 단추
      expression: `(() => { const g = ${TIME ? `document.querySelector('.saga-list .timeline')` : `document.querySelectorAll('.saga-list .saga')[${(SAGA || 1) - 1}]`}; const b = g?.querySelectorAll('.phase-button')[${(TIME || PHASE) - 1}]; if (!b) return null; const t = performance.now(); b.click(); return t })()`,
    })
    const target = TIME ? `time=${TIME}` : `saga=${SAGA || 1}&phase=${PHASE}`
    if (r.result.value == null) throw new Error(`${target} 단추가 없다`)
    await sleep(slow(5000))
    summarize(`switch → ${target}`, (await send('Profiler.stop')).profile, Date.now() - t2)
    console.log('  ' + (await longSince(r.result.value)))
  }

  const cx = W / 2
  const cy = H / 2
  await send('Runtime.evaluate', { expression: `(window.__frames = [], (function tick(t){ window.__frames.push(t); if (!window.__stop) requestAnimationFrame(tick) })(performance.now()), 1)` })
  // 페인트·레이아웃·스타일 계산은 CPU 프로필에 '(program)' 으로만 잡히니 트레이스로 따로 모은다
  const events = []
  const offData = chrome.on((m) => {
    if (m.method === 'Tracing.dataCollected') events.push(...m.params.value)
  })
  await send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline', transferMode: 'ReportEvents' })
  await send('Profiler.start')
  const t1 = Date.now()
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 })
  for (let i = 1; i <= 40; i++) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx + i * 4, y: cy + i * 2, button: 'left', buttons: 1 })
    await sleep(16)
  }
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx + 160, y: cy + 80, button: 'left', clickCount: 1 })
  for (let i = 0; i < 20; i++) {
    await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: cx, y: cy, deltaX: 0, deltaY: i < 10 ? -120 : 120 })
    await sleep(40)
  }
  await sleep(slow(800))
  summarize('interact', (await send('Profiler.stop')).profile, Date.now() - t1)
  const done = new Promise((resolve) => {
    const off = chrome.on((m) => {
      if (m.method === 'Tracing.tracingComplete') {
        off()
        resolve()
      }
    })
  })
  await send('Tracing.end')
  await done
  offData()
  const main = new Set(events.filter((e) => e.name === 'thread_name' && e.args?.name === 'CrRendererMain').map((e) => `${e.pid}:${e.tid}`))
  const byName = new Map()
  for (const e of events) {
    if (e.ph !== 'X' || !main.has(`${e.pid}:${e.tid}`)) continue
    const v = byName.get(e.name) ?? { n: 0, ms: 0, max: 0 }
    v.n++
    v.ms += (e.dur ?? 0) / 1000
    v.max = Math.max(v.max, (e.dur ?? 0) / 1000)
    byName.set(e.name, v)
  }
  console.log('\n== main thread trace (interact)')
  for (const [k, v] of [...byName.entries()].sort((a, b) => b[1].ms - a[1].ms).slice(0, 15))
    console.log(`${v.ms.toFixed(1).padStart(8)}ms  n=${String(v.n).padEnd(5)} max=${v.max.toFixed(1).padStart(6)}  ${k}`)
  // 래스터(그림을 픽셀로 칠하기)는 다른 스레드에서 돈다 — 스레드별 바깥 작업 합
  const threadName = new Map(events.filter((e) => e.name === 'thread_name').map((e) => [`${e.pid}:${e.tid}`, e.args?.name]))
  const byThread = new Map()
  for (const e of events) {
    if (e.ph !== 'X' || !/RasterTask|RunTask|DrawFrame|ImageDecodeTask/.test(e.name)) continue
    const k = `${threadName.get(`${e.pid}:${e.tid}`) ?? e.tid} / ${e.name}`
    const v = byThread.get(k) ?? { n: 0, ms: 0, max: 0 }
    v.n++
    v.ms += (e.dur ?? 0) / 1000
    v.max = Math.max(v.max, (e.dur ?? 0) / 1000)
    byThread.set(k, v)
  }
  console.log('\n== by thread (interact)')
  for (const [k, v] of [...byThread.entries()].sort((a, b) => b[1].ms - a[1].ms).slice(0, 10))
    console.log(`${v.ms.toFixed(1).padStart(8)}ms  n=${String(v.n).padEnd(5)} max=${v.max.toFixed(1).padStart(6)}  ${k}`)
  const r = await send('Runtime.evaluate', { returnByValue: true, expression: `(() => { window.__stop = true; const f = window.__frames; const d = []; for (let i = 1; i < f.length; i++) d.push(f[i] - f[i-1]); const long = d.filter(x => x > 50); return { n: d.length, long: long.length, longSum: Math.round(long.reduce((a,b)=>a+b,0)), max: Math.round(Math.max(...d)) } })()` })
  console.log('\nframes', JSON.stringify(r.result.value))
} finally {
  await chrome.close()
}
