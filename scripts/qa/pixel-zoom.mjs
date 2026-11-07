// 픽셀 지도(/pixel)의 확대·축소 성능 — 빌드 뒤 `pnpm preview`(기본 :4173, 주소에 ?perf 를 붙인다) 또는 --dev 로 개발 서버(:5173).
//   node scripts/qa/pixel-zoom.mjs [--base URL] [--dev] [--phone|--desktop] [--seq single,burst,pinch,wheel] [--view x,y,k] [--json 파일]
// 개발 서버의 React 는 렌더가 2–3배 느려 --dev 의 수는 빌드보다 2–3배 나쁘다 (기준은 빌드로 본다).
// 휴대폰(390×844, DPR 3, CPU 4배 느리게 — 타일 Worker 는 CDP 의 CPU 제한이 닿지 않아 ?tileslow=4, 터치 흉내)과
// 데스크톱(1440×900, DPR 2, 제한 없음)에서 ?view=1050,760,1(개관)·980,700,40(깊은 확대 — 가장 고운 단계라 축소부터)을 몸짓 묶음마다 새 탭에 연다.
//   single — + 단추 세 번, − 단추 세 번 (한 번마다 선명해질 때까지 기다린다) · burst — + 셋을 약 50ms 간격, 그다음 − 셋
//   pinch(휴대폰) — 두 손가락 80→170px 를 약 200ms 에 여덟 번 움직여 확대, 80→30px 로 축소
//   wheel(데스크톱 — 휴대폰 흉내에서는 휠이 오지 않는다) — 휠 한 칸 세 번씩 안·밖, 그리고 16ms 간격 여섯 칸 몰아치기 안·밖
//   scroll(데스크톱) — 트랙패드 두 손가락 스크롤처럼 작은 휠 40번을 16ms 간격으로 (안·밖 — 모두 약 네 단계)
// 페이지에 새 문서마다 심는 기록기: rAF 프레임 간격, longtask, 입력 시각, 그리고 .pixel-canvas 에 그린 drawImage 마다
// (ctx 변환·캔버스 CSS 변환까지 셈한) 기기 픽셀 자리 — 그린 비트맵을 TileStore 의 열쇠(u|tx|ty)로 되짚어 지도 단위 → 기기 픽셀의 배율·원점을 얻는다.
// 그리기 한 번(같은 작업 안의 캔버스 그리기 — 전체를 칠하면 새로 시작)마다 화면∩지도를 16 기기 px 칸으로 나눠 어떤 타일에도 덮이지 않은 몫(빈칸 — 바탕색이 보인다)을 센다.
// 몸짓마다: 프레임 간격 p95·가장 긴 것(첫 입력부터 마지막 입력 뒤 500ms), 긴 작업 수·가장 긴 것(가라앉을 때까지),
// 첫 반응(첫 입력 — 핀치는 첫 touchmove — 에서 그린 배율·원점이나 캔버스·기호 층의 CSS 변환이 바뀐 첫 프레임까지),
// 선명까지(마지막 입력에서 window.__pixel.missing === 0 이고 anim 이 아닌 첫 프레임까지), 빈칸 최대, 옮긴 단계 수,
// 부드러움 — 한 그리기에서 다음 그리기로 배율이 가장 크게 뛴 몫(단계 — 두 배가 1)과, 입력이 이어지는 동안 배율이 그대로였던 가장 긴 사이(ms — 계단처럼 멈췄다 뛰는지).
// 기준을 넘으면 1 — 휴대폰 프레임 간격 p95 ≤ 20ms·50ms 넘는 긴 작업 없음, 빈칸은 모든 프레임에서 ≤ 1%, 핀치 첫 반응 ≤ 50ms,
// 휴대폰 single 의 선명까지 ≤ 400ms, 배율이 한 그리기에 0.35 단계 넘게 뛰지 않는다(몰아치기 burst·fling 은 빼고), scroll 은 배율이 50ms 넘게 멈추지 않는다. 페이지가 오류를 던졌거나 타일이 오지 않았거나 그리기를 하나도 잡지 못했으면 3 (믿을 수 없음).
// 페이지 고리: window.__pixel = { frames, store, missing, anim?, u? } (PixelApp.tsx — 개발 서버, 빌드는 ?perf). anim·u 가 없으면 단계 글로 대신한다.
// Chrome 은 scripts/qa/chrome.mjs 의 launchChrome 으로만 띄운다.
import fs from 'node:fs'
import { launchChrome } from './chrome.mjs'

const argv = process.argv.slice(2)
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d)
const DEV = argv.includes('--dev')
const BASE = opt('base', DEV ? 'http://localhost:5173' : 'http://localhost:4173').replace(/\/$/, '')
const DEVICES = argv.includes('--phone') ? ['phone'] : argv.includes('--desktop') ? ['desktop'] : ['phone', 'desktop']
const SEQS = opt('seq', 'single,burst,pinch,wheel,scroll').split(',').filter(Boolean)
const VIEWS = argv.includes('--view') ? [opt('view')] : ['1050,760,1', '980,700,40']
const JSON_OUT = opt('json', null)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const pct = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] : 0
}
const SIZES = {
  phone: { w: 390, h: 844, scale: 3, mobile: true, cpu: 4, slow: 4, label: '휴대폰 390×844 DPR3 · CPU 4배 · tileslow 4' },
  desktop: { w: 1440, h: 900, scale: 2, mobile: false, cpu: 1, slow: 1, label: '데스크톱 1440×900 DPR2' },
}
const LIMIT = { gapP95: 20, longTask: 50, blank: 0.01, pinchResp: 50, singleCrisp: 400, jump: 0.35, scrollStall: 50 }
const CELL = 16
const MAP_W = 2400
const MAP_H = 1700

// 새 문서마다 페이지 스크립트보다 먼저 심는 기록기
const RECORDER = `(() => {
  const R = (window.__zoomRec = { ticks: [], batches: [], inputs: [], lt: [], lastSig: null, cssId: 0 })
  const P = () => window.__pixel
  const uNow = () => { const p = P(); if (p && typeof p.u === 'number') return p.u; const m = /=\\s*([\\d.]+)/.exec(document.querySelector('.pixel-level')?.textContent || ''); return m ? Number(m[1]) : null }
  R.uNow = uNow
  R.idle = () => { const p = P(); if (!p || !p.frames.length) return false; const s = p.store; return !p.anim && p.missing === 0 && !(s.workers || []).some((w) => w.busy) && !((s.queue || []).length) && !((s.inflight && s.inflight.size) || 0) }
  // 비트맵 → 타일 열쇠 (TileStore.cache 를 되짚는다 — 모르는 비트맵이면 한 번 다시 훑는다)
  const keyOf = new WeakMap()
  const lookup = (b) => {
    if (!keyOf.has(b)) { const c = P()?.store?.cache; if (c) for (const [k, v] of c) keyOf.set(v, k) }
    return keyOf.get(b) || null
  }
  const isMap = (ctx) => ctx.canvas && ctx.canvas.classList && ctx.canvas.classList.contains('pixel-canvas')
  let cur = null
  const begin = (ctx) => { if (!cur) { cur = { t: performance.now(), full: false, rects: [], c: ctx.canvas }; queueMicrotask(end) } return cur }
  const end = () => {
    const b = cur; cur = null
    if (!b) return
    const p = P(), c = b.c, dpr = devicePixelRatio
    let aff = [1, 0, 1, 0]
    const css = c.style.transform
    if (css && css !== 'none') {
      const M = new DOMMatrix(css)
      const tok = (c.style.transformOrigin || '50% 50%').split(/\\s+/)
      const o = (s, full) => (s && s.endsWith('%') ? (parseFloat(s) / 100) * full : parseFloat(s) * dpr || 0)
      const Ox = o(tok[0], c.width), Oy = o(tok[1] || '50%', c.height)
      aff = [M.a, Ox * (1 - M.a) + M.e * dpr, M.d, Oy * (1 - M.d) + M.f * dpr]
    }
    const u = uNow()
    let map = null
    for (const r of b.rects) if (r[4] && (!map || (r[4][0] === u && map[0] !== u))) map = r[4]
    const sig = map ? [map[1] * aff[0], aff[0] * map[2] + aff[1], aff[2] * map[3] + aff[3]] : R.lastSig
    R.batches.push({ t: b.t, full: b.full, rects: b.rects.map((r) => [aff[0] * r[0] + aff[1], aff[2] * r[1] + aff[3], aff[0] * r[2], aff[2] * r[3]]), sig, u, anim: !!(p && p.anim), missing: p ? p.missing : null, W: c.width, H: c.height })
    R.lastSig = sig
  }
  const proto = CanvasRenderingContext2D.prototype
  const di = proto.drawImage
  proto.drawImage = function (img, ...a) {
    if (isMap(this)) {
      const b = begin(this), m = this.getTransform()
      let sx = 0, sy = 0, sw = img.width, sh = img.height, dx, dy, dw = img.width, dh = img.height
      if (a.length === 2) [dx, dy] = a
      else if (a.length === 4) [dx, dy, dw, dh] = a
      else [sx, sy, sw, sh, dx, dy, dw, dh] = a
      const X = m.a * dx + m.e, Y = m.d * dy + m.f, Wd = m.a * dw, Hd = m.d * dh
      const k = typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap ? lookup(img) : null
      let map = null
      if (k && sw > 0) { const [u, tx, ty] = k.split('|').map(Number); const s = Wd / (sw * u); map = [u, s, X - (tx * 256 + sx) * u * s, Y - (ty * 256 + sy) * u * s] }
      b.rects.push([X, Y, Wd, Hd, map])
    }
    return di.call(this, img, ...a)
  }
  for (const name of ['fillRect', 'clearRect']) {
    const f = proto[name]
    proto[name] = function (x, y, w, h) {
      if (isMap(this)) { const m = this.getTransform(), X = m.a * x + m.e, Y = m.d * y + m.f; if (X <= 0 && Y <= 0 && X + m.a * w >= this.canvas.width && Y + m.d * h >= this.canvas.height) { const b = begin(this); b.full = true; b.rects.length = 0 } }
      return f.call(this, x, y, w, h)
    }
  }
  for (const type of ['pointerdown', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'wheel', 'click', 'mousedown'])
    window.addEventListener(type, () => R.inputs.push([type, performance.now()]), { capture: true, passive: true })
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) R.lt.push([e.startTime, e.duration]) }).observe({ type: 'longtask', buffered: true }) } catch {}
  let last = 0, lastCss = ''
  const tick = (t) => {
    const p = P()
    const css = (document.querySelector('.pixel-canvas')?.style.transform || '') + '|' + (document.querySelector('.px-marks')?.style.transform || '')
    if (css !== lastCss) { R.cssId++; lastCss = css }
    if (last) R.ticks.push([t, t - last, p ? p.missing : null, !!(p && p.anim), R.cssId])
    last = t
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})()`

// 그리기 한 번의 빈칸 몫 — 화면∩지도의 16px 칸 가운데점이 어느 그린 사각형에도 들지 않는 몫
function blankOf(b, rects, sig) {
  if (!sig) return null
  const [s, ox, oy] = sig
  const x0 = Math.max(0, ox)
  const y0 = Math.max(0, oy)
  const x1 = Math.min(b.W, ox + MAP_W * s)
  const y1 = Math.min(b.H, oy + MAP_H * s)
  const nx = Math.ceil(b.W / CELL)
  const ny = Math.ceil(b.H / CELL)
  const g = new Uint8Array(nx * ny)
  for (const [X, Y, Wd, Hd] of rects) {
    const cx0 = Math.max(0, Math.ceil((X - CELL / 2) / CELL))
    const cx1 = Math.min(nx - 1, Math.floor((X + Wd - CELL / 2 - 1e-6) / CELL))
    const cy0 = Math.max(0, Math.ceil((Y - CELL / 2) / CELL))
    const cy1 = Math.min(ny - 1, Math.floor((Y + Hd - CELL / 2 - 1e-6) / CELL))
    for (let y = cy0; y <= cy1; y++) g.fill(1, y * nx + cx0, y * nx + cx1 + 1)
  }
  let n = 0
  let blank = 0
  for (let y = 0; y < ny; y++) {
    const py = y * CELL + CELL / 2
    if (py < y0 || py >= y1) continue
    for (let x = 0; x < nx; x++) {
      const px = x * CELL + CELL / 2
      if (px < x0 || px >= x1) continue
      n++
      if (!g[y * nx + x]) blank++
    }
  }
  return n ? blank / n : 0
}
const differs = (a, b) => !a || !b || Math.abs(a[0] - b[0]) / b[0] > 1e-3 || Math.abs(a[1] - b[1]) > 0.5 || Math.abs(a[2] - b[2]) > 0.5

/** 한 몸짓의 기록을 셈한다 */
function analyze(name, kind, snap, rec, settledAt) {
  const inp = rec.inputs
  const starts = inp.filter(([t]) => ['pointerdown', 'touchstart', 'wheel', 'mousedown', 'click'].includes(t))
  const first = (starts[0] ?? inp[0])?.[1]
  if (first === undefined) return { name, kind, noInput: true }
  const last = inp[inp.length - 1][1]
  const move = inp.find(([t]) => t === 'touchmove')?.[1]
  const t0 = kind === 'pinch' && move !== undefined ? move : first
  const gaps = rec.ticks.filter(([t]) => t > first && t <= last + 500).map(([, g]) => g)
  const lt = rec.lt.filter(([t]) => t >= first - 5 && t <= settledAt).map(([, d]) => d)
  // 빈칸 — 전체를 칠하지 않은 그리기는 앞 그리기 위에 덧그린 것으로 본다
  let prev = []
  let sig = snap.base
  let maxBlank = 0
  const frames = []
  for (const b of rec.batches) {
    const rects = b.full ? b.rects : prev.concat(b.rects)
    prev = rects
    sig = b.sig ?? sig
    if (b.t < first) continue
    const bl = blankOf(b, rects, sig)
    if (bl !== null) maxBlank = Math.max(maxBlank, bl)
    frames.push([+(b.t - first).toFixed(1), b.u, sig && +sig[0].toFixed(3), bl === null ? null : +(bl * 100).toFixed(1), b.rects.length, b.full ? 1 : 0])
  }
  const after = rec.batches.filter((b) => b.t >= t0)
  const respB = after.find((b) => differs(b.sig, snap.base))
  const respC = rec.ticks.find(([t, , , , id]) => t >= t0 && id !== snap.css)
  const resp = Math.min(respB ? respB.t : Infinity, respC ? respC[0] : Infinity)
  const changed = resp < Infinity
  const drewAfter = (t) => rec.batches.some((b) => b.t > last && b.t <= t) || rec.ticks.some(([tt, , , , id]) => tt > last && tt <= t && id !== snap.css)
  const crisp = rec.ticks.find(([t, , miss, anim]) => t > last && miss === 0 && !anim && drewAfter(t))
  // 부드러움 — 그리기마다의 배율(지도 단위당 기기 px)에서
  let jump = 0
  let stall = 0
  let prevS = snap.base?.[0] ?? null
  let lastChange = t0
  for (const b of rec.batches) {
    if (b.t < first || !b.sig) continue
    const sc = b.sig[0]
    if (prevS !== null && Math.abs(Math.log2(sc / prevS)) > 1e-4) {
      jump = Math.max(jump, Math.abs(Math.log2(sc / prevS)))
      if (b.t <= last) stall = Math.max(stall, b.t - lastChange)
      lastChange = b.t
    }
    prevS = sc
  }
  return {
    name,
    kind,
    noop: !changed && rec.u === snap.u,
    gapP95: +pct(gaps, 95).toFixed(1),
    gapMax: +Math.max(0, ...gaps).toFixed(1),
    gaps: gaps.length,
    longTasks: lt.length,
    longMax: +Math.max(0, ...lt).toFixed(0),
    respMs: changed ? +(resp - t0).toFixed(1) : null,
    crispMs: crisp ? +(crisp[0] - last).toFixed(1) : null,
    blankMax: +maxBlank.toFixed(4),
    jump: +jump.toFixed(2),
    stallMs: +stall.toFixed(0),
    levels: snap.u && rec.u ? Math.round(Math.log2(snap.u / rec.u)) : null,
    draws: rec.batches.length,
    u: [snap.u, rec.u],
    // 그리기마다 [첫 입력에서 ms, 단계 u, 지도 단위당 기기 px, 빈칸 %, 그린 사각형 수, 전체를 칠했나]
    frames,
  }
}

const rows = []
const errors = []
let unreliable = ''
for (const dev of DEVICES) {
  const size = SIZES[dev]
  const seqs = SEQS.filter((q) => (dev === 'phone' ? q !== 'wheel' && q !== 'scroll' : q !== 'pinch'))
  if (!seqs.length) continue
  const chrome = await launchChrome({ width: size.w, height: size.h })
  try {
    // 몸짓 묶음마다 새 탭 — 같은 탭에서 다시 이동하면 앞 문서의 핀치 뒤 터치가 새 문서에 닿지 않았다
    let s = null
    let target = null
    chrome.on((m) => {
      if (s && m.sessionId === s && m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text)
    })
    const ev = async (e) => {
      const r = await chrome.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }, s)
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
      return r.result.value
    }
    const load = async (view) => {
      if (target) await chrome.send('Target.closeTarget', { targetId: target }).catch(() => {})
      ;({ sessionId: s, targetId: target } = await chrome.newPage(null, size))
      if (size.cpu > 1) await chrome.send('Emulation.setCPUThrottlingRate', { rate: size.cpu }, s)
      if (size.mobile) await chrome.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, s)
      await chrome.send('Page.addScriptToEvaluateOnNewDocument', { source: RECORDER }, s)
      const loaded = new Promise((resolve) => {
        const off = chrome.on((m) => {
          if (m.sessionId === s && m.method === 'Page.loadEventFired') {
            off()
            resolve()
          }
        })
      })
      await chrome.send('Page.navigate', { url: `${BASE}/pixel?view=${view}&tileslow=${size.slow}&perf` }, s)
      await loaded
      if (!(await settle(40000, 400))) throw Object.assign(new Error(`타일이 40초 안에 다 오지 않았다 (${view})`), { unreliable: true })
      if (!(await ev('!!window.__zoomRec && window.__zoomRec.batches.length > 0')))
        throw Object.assign(new Error('캔버스 그리기를 잡지 못했다 (.pixel-canvas 의 drawImage)'), { unreliable: true })
    }
    // 가라앉음: 그리는 중·빠진 타일·Worker 일이 없는 채로 stable ms
    const settle = async (max, stable = 300) => {
      const t0 = Date.now()
      let since = 0
      while (Date.now() - t0 < max) {
        await sleep(80)
        if (await ev('!!window.__zoomRec && window.__zoomRec.idle()')) {
          if (!since) since = Date.now()
          if (Date.now() - since >= stable) return true
        } else since = 0
      }
      return false
    }
    // 단추 자리는 누를 때마다 다시 잰다 — 단계 글의 폭이 바뀌면 단추가 옆으로 밀린다
    const button = (i) => ev(`(() => { const b = document.querySelectorAll('.pixel-zoom button')[${i}]; const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2, b.disabled || b.getAttribute('aria-disabled') === 'true'] })()`)
    // 끝나지 않은 터치가 남아 다음 터치가 페이지에 닿지 않는 일이 있어 매번 먼저 거둔다
    const resetTouch = () => chrome.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }, s).catch(() => {})
    const tap = async (i) => {
      const [x, y, disabled] = await button(i)
      if (disabled) return
      if (size.mobile) {
        await resetTouch()
        await chrome.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] }, s)
        await chrome.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, s)
      } else {
        await chrome.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 }, s)
        await chrome.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 }, s)
      }
    }
    const wheel = (dir) =>
      chrome.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: size.w * 0.55, y: size.h * 0.5, deltaX: 0, deltaY: (dir > 0 ? -100 : 100) * size.scale }, s)
    const pinch = async (d1) => {
      const cx = size.w / 2
      const cy = size.h / 2
      const at = (d) => [{ x: cx - d / 2, y: cy, id: 1 }, { x: cx + d / 2, y: cy, id: 2 }]
      await resetTouch()
      await chrome.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(80) }, s)
      for (let i = 1; i <= 8; i++) {
        await sleep(25)
        await chrome.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(80 + ((d1 - 80) * i) / 8) }, s)
      }
      await chrome.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, s)
    }
    /** 몸짓 하나 — 기록을 비우고, 하고, 가라앉을 때까지(최소 600ms) 기다린 뒤 셈한다 */
    const gesture = async (view, seq, name, kind, act, btn) => {
      // 끝 단계에서 막힌 단추는 누르지 않는다 (막힌 단추에는 입력이 오지 않는다)
      if (btn !== undefined && (await button(btn))[2]) return rows.push({ device: dev, view, seq, name, kind, noop: true, clamped: true })
      const snap = await ev(`(() => { const R = window.__zoomRec; R.ticks.length = 0; R.batches.length = 0; R.inputs.length = 0; return { base: R.lastSig, css: R.cssId, u: R.uNow() } })()`)
      await act()
      await sleep(600)
      const ok = await settle(20000)
      const rec = await ev(`(() => { const R = window.__zoomRec; return { ticks: R.ticks, batches: R.batches, inputs: R.inputs, lt: R.lt, u: R.uNow(), now: performance.now() } })()`)
      const r = { device: dev, view, seq, settled: ok, ...analyze(name, kind, snap, rec, rec.now) }
      rows.push(r)
      return r
    }
    // 처음부터 가장 고운 단계면(깊은 보기) 축소부터 — 확대 몸짓이 모두 막혀 버려지지 않게
    let order = [['+', 1], ['−', -1]]
    const steps = async (view, seq, kind, n, act, between) => {
      for (const [dir, sign] of order) {
        const btn = kind === 'tap' ? (sign > 0 ? 0 : 1) : undefined
        if (between) for (let i = 0; i < n; i++) await gesture(view, seq, `${seq}${dir}${i + 1}`, kind, () => act(sign), btn)
        else await gesture(view, seq, `${seq}${dir}`, kind, () => act(sign), btn)
      }
    }
    const burst = (fn, n, gap) => async () => {
      for (let i = 0; i < n; i++) {
        const a = Date.now()
        await fn()
        const left = gap - (Date.now() - a)
        if (i < n - 1 && left > 0) await sleep(left)
      }
    }
    for (const view of VIEWS) {
      for (const seq of seqs) {
        await load(view)
        order = (await button(0))[2] ? [['−', -1], ['+', 1]] : [['+', 1], ['−', -1]]
        if (seq === 'single') await steps(view, seq, 'tap', 3, (d) => tap(d > 0 ? 0 : 1), true)
        if (seq === 'burst') await steps(view, seq, 'tap', 3, (d) => burst(() => tap(d > 0 ? 0 : 1), 3, 50)(), false)
        if (seq === 'pinch') await steps(view, seq, 'pinch', 1, (d) => pinch(d > 0 ? 170 : 30), false)
        if (seq === 'scroll') await steps(view, 'scroll', 'wheel', 1, (d) => burst(() => chrome.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: size.w * 0.55, y: size.h * 0.5, deltaX: 0, deltaY: (d > 0 ? -10 : 10) * size.scale }, s), 40, 16)(), false)
        if (seq === 'wheel') {
          await steps(view, 'wheel', 'wheel', 3, (d) => wheel(d), true)
          await steps(view, 'fling', 'wheel', 1, (d) => burst(() => wheel(d), 6, 16)(), false)
        }
      }
    }
  } catch (e) {
    // 뜻밖의 오류(CDP·페이지 평가)도 기준 실패(1)가 아니라 믿을 수 없음(3) — 표와 --json 은 그래도 남긴다
    unreliable = e.unreliable ? e.message : `뜻밖의 오류: ${e?.stack ?? e}`
  } finally {
    await chrome.close()
  }
  if (unreliable) break
}

// 기준
const fails = []
for (const r of rows) {
  const id = `${r.device} ${r.view} ${r.name}`
  if (r.noInput) {
    unreliable ||= `${id}: 입력이 페이지에 닿지 않았다`
    continue
  }
  if (r.noop) continue
  if (r.device === 'phone' && r.gapP95 > LIMIT.gapP95) fails.push(`${id}: 프레임 간격 p95 ${r.gapP95}ms > ${LIMIT.gapP95}ms`)
  if (r.device === 'phone' && r.longTasks) fails.push(`${id}: 긴 작업 ${r.longTasks}개 (가장 긴 ${r.longMax}ms > ${LIMIT.longTask}ms)`)
  if (r.blankMax > LIMIT.blank) fails.push(`${id}: 빈칸 ${(r.blankMax * 100).toFixed(1)}% > 1%`)
  if (r.kind === 'pinch' && !(r.respMs !== null && r.respMs <= LIMIT.pinchResp)) fails.push(`${id}: 핀치 첫 반응 ${r.respMs ?? '없음'}ms > ${LIMIT.pinchResp}ms (첫 touchmove 부터)`)
  if (r.device === 'phone' && r.seq === 'single' && !(r.crispMs !== null && r.crispMs <= LIMIT.singleCrisp)) fails.push(`${id}: 선명까지 ${r.crispMs ?? '없음'}ms > ${LIMIT.singleCrisp}ms`)
  // 몰아치기(burst·fling)는 여러 단계를 빨리 가 달라는 것이라 뜀 기준에서 뺀다
  if (r.seq !== 'burst' && r.name.indexOf('fling') !== 0 && r.jump > LIMIT.jump) fails.push(`${id}: 배율이 한 그리기에 ${r.jump} 단계 뛰었다 > ${LIMIT.jump}`)
  if (r.seq === 'scroll' && r.stallMs > LIMIT.scrollStall) fails.push(`${id}: 스크롤하는 동안 배율이 ${r.stallMs}ms 멈췄다 > ${LIMIT.scrollStall}ms`)
}

// 표
const f = (x, d = 0) => (x === null || x === undefined ? '—' : Number(x).toFixed(d))
console.log(`/pixel 확대 성능 · ${BASE}${DEV ? ' (개발 서버 — React 개발판이라 빌드보다 2–3배 나쁘다)' : ''}`)
for (const dev of DEVICES) {
  const rs = rows.filter((r) => r.device === dev)
  if (!rs.length) continue
  console.log(`\n${SIZES[dev].label}`)
  console.log('  보기          몸짓       단계      간격 p95/최대   긴작업 수/최대  첫반응   선명까지  빈칸최대  뜀    멈춤    그리기')
  for (const r of rs) {
    if (r.noInput) {
      console.log(`  ${r.view.padEnd(13)} ${r.name.padEnd(9)}  입력이 닿지 않았다`)
      continue
    }
    if (r.clamped) {
      console.log(`  ${r.view.padEnd(13)} ${r.name.padEnd(9)}  끝 단계 — 단추가 막혀 건너뛴다`)
      continue
    }
    const lv = r.noop ? '변화없음' : `${r.u[0]}→${r.u[1]}`
    console.log(
      `  ${r.view.padEnd(13)} ${r.name.padEnd(9)}  ${lv.padEnd(9)} ${`${f(r.gapP95, 1)}/${f(r.gapMax, 0)}ms`.padEnd(14)} ${`${r.longTasks}/${r.longMax}ms`.padEnd(14)} ${`${f(r.respMs)}ms`.padEnd(8)} ${`${f(r.crispMs)}ms${r.settled ? '' : '!'}`.padEnd(9)} ${`${f(r.blankMax * 100, 1)}%`.padEnd(9)} ${f(r.jump, 2).padEnd(5)} ${`${f(r.stallMs)}ms`.padEnd(7)} ${r.draws}`,
    )
  }
}
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ base: BASE, dev: DEV, rows, fails, errors, unreliable }, null, 1))
const uniqErr = [...new Set(errors)]
if (uniqErr.length) console.log(`\n페이지 오류 ${uniqErr.length}가지:\n  ${uniqErr.slice(0, 5).map((e) => e.split('\n')[0]).join('\n  ')}`)
if (unreliable) console.log(`\n믿을 수 없음: ${unreliable}`)
if (fails.length) console.log(`\n기준을 넘었다 (${fails.length}):\n  ${fails.join('\n  ')}`)
else if (!unreliable && !uniqErr.length) console.log('\n기준 통과')
process.exit(unreliable || uniqErr.length ? 3 : fails.length ? 1 : 0)
