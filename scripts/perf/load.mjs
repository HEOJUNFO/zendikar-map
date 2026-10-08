// 첫 로딩 — 느린 망(기본 Fast 4G 근사)에서 FCP·LCP·지도가 그려지기까지·내려받은 바이트를 잰다.
//   pnpm build && pnpm preview 뒤: node scripts/perf/load.mjs [--base http://localhost:4173] [--phase] [--mobile] [--runs 3] [--fast]
import { launchChrome } from '../qa/chrome.mjs'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : fallback
}
const flag = (name) => process.argv.includes(`--${name}`)
const BASE = arg('base', 'http://localhost:4173')
const QUERY = arg('query', '')
const RUNS = Number(arg('runs', 3))
const PHASE = flag('phase')
const MOBILE = flag('mobile')
const W = MOBILE ? 390 : 1440
const H = MOBILE ? 844 : 900
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const chrome = await launchChrome({ width: W, height: H })
const results = []
try {
  for (let run = 0; run < RUNS; run++) {
    const { sessionId, targetId } = await chrome.newPage(null, { mobile: MOBILE, w: W, h: H })
    const send = (m, p = {}) => chrome.send(m, p, sessionId)
    await send('Network.enable')
    await send('Network.setCacheDisabled', { cacheDisabled: true })
    if (!flag('fast'))
      await send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 })
    if (MOBILE) await send('Emulation.setCPUThrottlingRate', { rate: 4 })
    let bytes = 0
    const off = chrome.on((m) => {
      if (m.sessionId === sessionId && m.method === 'Network.loadingFinished') bytes += m.params.encodedDataLength
    })
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `window.__lcp = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true });
        window.__long = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push(e.duration) }).observe({ type: 'longtask', buffered: true });
        // 지도 바탕(해안선 path)이 처음 DOM 에 들어온 때
        (function poll(){ if (document.querySelector('.zendikar-map path')) window.__map = performance.now(); else requestAnimationFrame(poll) })()`,
    })
    const q = [PHASE ? 'phase=1' : '', QUERY].filter(Boolean).join('&')
    await send('Page.navigate', { url: `${BASE}/${q ? `?${q}` : ''}` })
    await sleep(PHASE ? 12000 : 9000)
    const r = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => { const p = performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint'); const fonts = [...document.fonts].filter(f => f.status === 'loaded').length;
        return { fcp: Math.round(p?.startTime ?? -1), lcp: Math.round(window.__lcp), map: Math.round(window.__map ?? -1), longN: window.__long.length, longMs: Math.round(window.__long.reduce((a,b)=>a+b,0)), longMax: Math.round(Math.max(0, ...window.__long)), fontsLoaded: fonts, js: performance.getEntriesByType('resource').filter(e => e.name.endsWith('.js')).length } })()`,
    })
    off()
    const row = { ...r.result.value, kb: Math.round(bytes / 1024) }
    results.push(row)
    console.log(JSON.stringify(row))
    await chrome.send('Target.closeTarget', { targetId })
  }
} finally {
  await chrome.close()
}
const med = (k) => results.map((r) => r[k]).sort((a, b) => a - b)[Math.floor(results.length / 2)]
console.log(`median fcp=${med('fcp')} lcp=${med('lcp')} map=${med('map')} long=${med('longMs')}ms(max ${med('longMax')}) kb=${med('kb')}`)
