// 픽셀 지도(/pixel)의 끌기 성능 — 개발 서버(pnpm dev) 뒤 (docs/pixel-plan.md S2 의 기준: 휴대폰 끌기 p95 ≤ 16.7ms).
//   node scripts/qa/pixel-perf.mjs [--base http://localhost:5173] [--cpu 4] [--desktop] [--view x,y,k] [--time t]   (--time: 시점별 지도 S6 의 시점)
// 휴대폰(390×844, DPR 3, CPU 4배 느리게 — 페이지는 CDP 의 CPU 제한, 타일 Worker 는 CDP 가 걸지 못해 ?tileslow=4 로 같은 타일을 네 번 그린다)에서 그 자리를 열고 타일이 다 온 뒤,
// 한 방향으로 화면 폭의 0.8 만큼씩 여러 번 끌어(새 타일을 청하고 받고 붙이는 길까지) 지도를 화면 여러 장만큼 옮긴다.
// 끄는 동안(손을 뗀 뒤는 빼고) rAF 프레임 간격의 p50·p95·가장 긴 것, 그리기(draw) 한 번의 시간, 타일 한 장의 Worker 시간,
// 끄는 동안 새로 받은 타일 수, 붙잡은 타일 수(메모리)를 낸다.
// 개발 서버의 window.__pixel 을 읽는다 (PixelApp.tsx — DEV 에서만).
import { launchChrome } from './chrome.mjs'

const argv = process.argv.slice(2)
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d)
const BASE = opt('base', 'http://localhost:5173')
const CPU = Number(opt('cpu', '4'))
const desktop = argv.includes('--desktop')
const VIEW = opt('view', '1050,760,6')
const TIME = opt('time', null)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const pct = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] : 0
}

const size = desktop ? { w: 1440, h: 900, scale: 2, mobile: false } : { w: 390, h: 844, scale: 3, mobile: true }
const chrome = await launchChrome({ width: size.w, height: size.h })
let code = 0
try {
  const { sessionId: s } = await chrome.newPage(null, size)
  await chrome.send('Emulation.setCPUThrottlingRate', { rate: CPU }, s)
  // 타일 Worker 는 CDP 의 CPU 제한이 닿지 않아('only supported for pages') 개발 서버의 ?tileslow 로 같은 타일을 CPU 배만큼 그린다
  await chrome.send('Page.navigate', { url: `${BASE}/pixel?view=${VIEW}&tileslow=${CPU}${TIME ? `&time=${TIME}` : ''}` }, s)
  const ev = async (e) => (await chrome.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }, s)).result.value
  // 타일이 다 올 때까지 (화면에 빠진 타일이 0)
  let ready = false
  for (let i = 0; i < 100 && !ready; i++) {
    await sleep(200)
    ready = await ev('!!window.__pixel && window.__pixel.frames.length > 0 && window.__pixel.missing === 0')
  }
  if (!ready) throw new Error('타일이 20초 안에 다 오지 않았다')
  const first = await ev('({ tiles: window.__pixel.store.stats.drawn, ms: window.__pixel.store.stats.ms })')
  await ev('window.__pixel.frames.length = 0; window.__pixel.store.stats.ms.length = 0')
  const drawn0 = await ev('window.__pixel.store.stats.drawn')
  // 끄는 동안의 프레임 간격 — window.__dragging 인 동안만 센다
  await ev(`(() => { window.__gaps = []; window.__dragging = true; let last = performance.now(); const tick = (t) => { if (window.__dragging) { window.__gaps.push(t - last); last = t; requestAnimationFrame(tick) } }; requestAnimationFrame(tick) })()`)
  const mouse = (type, x, y) => chrome.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 }, s)
  const cy = size.h / 2
  // 오른쪽에서 왼쪽으로 화면 폭의 0.8 을 끄는 손짓 여섯 번 (지도는 오른쪽으로 화면 약 다섯 장 옮긴다), 손짓마다 약 0.4초
  for (let k = 0; k < 6; k++) {
    const x0 = size.w * 0.9
    const x1 = size.w * 0.1
    await mouse('mousePressed', x0, cy)
    for (let i = 1; i <= 24; i++) {
      await mouse('mouseMoved', x0 + ((x1 - x0) * i) / 24, cy + Math.sin(i / 4) * 12)
      await sleep(16)
    }
    await mouse('mouseReleased', x1, cy)
  }
  await ev('window.__dragging = false')
  const r = await ev('({ gaps: window.__gaps.slice(1), draws: window.__pixel.frames, ms: window.__pixel.store.stats.ms, cached: window.__pixel.store.size, drawn: window.__pixel.store.stats.drawn })')
  const p95 = pct(r.gaps, 95)
  console.log(`${desktop ? '데스크톱 1440×900 DPR 2' : '휴대폰 390×844 DPR 3'} · CPU ${CPU}배 (Worker 는 ?tileslow=${CPU}) · ?view=${VIEW}`)
  console.log(`  처음 화면: 타일 ${first.tiles}장, Worker 한 장 가운데값 ${pct(first.ms, 50).toFixed(1)}ms · 가장 긴 ${Math.max(0, ...first.ms).toFixed(1)}ms`)
  console.log(`  끌기: 프레임 ${r.gaps.length}개 — 간격 p50 ${pct(r.gaps, 50).toFixed(1)}ms · p95 ${p95.toFixed(1)}ms · 가장 긴 ${Math.max(...r.gaps).toFixed(1)}ms`)
  console.log(`  그리기 ${r.draws.length}번 — p50 ${pct(r.draws, 50).toFixed(2)}ms · p95 ${pct(r.draws, 95).toFixed(2)}ms`)
  console.log(`  끄는 동안 새로 받은 타일 ${r.drawn - drawn0}장 (Worker 한 장 가운데값 ${pct(r.ms, 50).toFixed(1)}ms · 가장 긴 ${Math.max(0, ...r.ms).toFixed(1)}ms) · 붙잡은 타일 ${r.cached}장 (약 ${((r.cached * 256 * 256 * 4) / 1048576).toFixed(0)}MB)`)
  if (p95 > 16.7 * 1.05) {
    console.log(`  기준(p95 ≤ 16.7ms)을 넘었다`)
    code = 1
  }
} finally {
  await chrome.close()
}
process.exit(code)
