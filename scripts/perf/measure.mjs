// 지도 성능 기준선 — 배율별로 화면 안 SVG 요소 수와 끌기·휠 확대 중 프레임 간격을 잰다.
//   pnpm dev 뒤: node scripts/perf/measure.mjs [--base http://localhost:5173] [--out file.json]
// headless Chrome(GPU 없이 그린다)이라 절대값보다 단계 사이의 비교에 쓴다 (docs/deep-zoom-plan.md 0단계).
import fs from 'node:fs'
import { launchChrome } from '../qa/chrome.mjs'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : fallback
}
const BASE = arg('base', 'http://localhost:5173')
const OUT = arg('out', null)

/** 잴 시점 — 개관, 대륙 하나, 지역 하나, 아주 깊이 (깊은 배율은 MAX_ZOOM 이 허락하는 만큼만 들어간다) */
const VIEWS = [
  { name: 'overview', view: null },
  { name: 'k4-tazeem', view: '1000,560,4' },
  { name: 'k12-malakir', view: '1907,1096,12' },
  { name: 'k60-malakir', view: '1907,1096,60' },
  { name: 'k200-jwar', view: '214,1514,200' },
]
const SCREENS = [
  { name: 'desktop', w: 1440, h: 900, mobile: false },
  { name: 'phone', w: 390, h: 844, mobile: true },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const chrome = await launchChrome({ width: 1440, height: 900 })
const rows = []
try {
  for (const screen of SCREENS) {
    for (const phase of [false, true]) {
      for (const v of VIEWS) {
        const q = [phase ? 'phase=1' : '', v.view ? `view=${v.view}` : ''].filter(Boolean).join('&')
        const url = `${BASE}/${q ? `?${q}` : ''}`
        const { sessionId, targetId } = await chrome.newPage(url, { mobile: screen.mobile, w: screen.w, h: screen.h })
        const evalJs = async (expression) => {
          const r = await chrome.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId)
          if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + (r.exceptionDetails.exception?.description ?? ''))
          return r.result.value
        }
        // 페이즈 그림·지형이 다 그려질 때까지
        await sleep(phase ? 4000 : 2500)
        const counts = await evalJs(`(() => {
          const svg = document.querySelector('.zendikar-map')
          const all = svg ? svg.querySelectorAll('*').length : 0
          const r = svg.getBoundingClientRect()
          // 화면 안에 닿는 path (그리기 비용에 가까운 수)
          let onScreen = 0
          for (const el of svg.querySelectorAll('path, text, circle, rect, ellipse')) {
            const b = el.getBoundingClientRect()
            if (b.width + b.height > 0 && b.right > r.left && b.left < r.right && b.bottom > r.top && b.top < r.bottom) onScreen++
          }
          const z = svg.__zoom
          return { all, onScreen, k: z ? z.k : null }
        })()`)
        // 끌기 — 가운데에서 오른쪽 아래로 40 걸음
        const cx = screen.w / 2
        const cy = screen.h / 2
        await evalJs(`(window.__frames = [], (function tick(t){ window.__frames.push(t); if (!window.__stop) requestAnimationFrame(tick) })(performance.now()), 1)`)
        await chrome.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 }, sessionId)
        for (let i = 1; i <= 40; i++) {
          await chrome.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx + i * 4, y: cy + i * 2, button: 'left', buttons: 1 }, sessionId)
          await sleep(16)
        }
        await chrome.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx + 160, y: cy + 80, button: 'left', clickCount: 1 }, sessionId)
        // 휠 확대·축소 — 안으로 10번, 밖으로 10번
        for (let i = 0; i < 20; i++) {
          await chrome.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: cx, y: cy, deltaX: 0, deltaY: i < 10 ? -120 : 120 }, sessionId)
          await sleep(40)
        }
        await sleep(300)
        const frames = await evalJs(`(() => { window.__stop = true; const f = window.__frames; const d = []; for (let i = 1; i < f.length; i++) d.push(f[i] - f[i-1]); d.sort((a,b)=>a-b); const q = (p) => d.length ? d[Math.min(d.length-1, Math.floor(d.length*p))] : null; return { n: d.length, p50: q(0.5), p95: q(0.95), max: d.at(-1) ?? null } })()`)
        const row = { screen: screen.name, phase, view: v.name, ...counts, frames }
        rows.push(row)
        console.log(
          `${screen.name.padEnd(7)} phase=${phase ? 1 : 0} ${v.name.padEnd(12)} k=${String(counts.k?.toFixed?.(1)).padEnd(6)} dom=${String(counts.all).padEnd(6)} onScreen=${String(counts.onScreen).padEnd(6)} frames n=${frames.n} p50=${frames.p50?.toFixed(1)} p95=${frames.p95?.toFixed(1)} max=${frames.max?.toFixed(0)}`,
        )
        await chrome.send('Target.closeTarget', { targetId })
      }
    }
  }
} finally {
  await chrome.close()
}
if (OUT) fs.writeFileSync(OUT, JSON.stringify(rows, null, 2))
