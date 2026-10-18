// 첫 로딩 — 느린 망(기본 Fast 4G 근사)에서 FCP·LCP·지도가 그려지기까지·내려받은 바이트를 잰다.
//   pnpm build && pnpm preview 뒤: node scripts/perf/load.mjs [--base http://localhost:4173] [--saga s] [--phase [n]] [--mobile] [--runs 3] [--fast]
//   --saga s: 주소 ?saga=s&phase=n (--phase 를 빼면 그 사가의 페이즈1). --saga 를 빼면 예전 주소 ?phase=n (사가1)
//   chunks 는 페이즈·그림·페이즈 바탕(period) 조각이 다 온 때(ms), chunkKb 는 그 조각의 전송 크기(KB, 압축된 채)
import { launchChrome } from '../qa/chrome.mjs'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : fallback
}
const flag = (name) => process.argv.includes(`--${name}`)
const BASE = arg('base', 'http://localhost:4173')
const QUERY = arg('query', '')
const RUNS = Number(arg('runs', 3))
// --phase 만 쓰면 페이즈1, --phase 2 처럼 숫자를 붙이면 그 페이즈
const SAGA = Number(arg('saga', '0')) || 0
const PHASE = flag('phase') ? Number(arg('phase', '1')) || 1 : SAGA ? 1 : 0
const phaseQuery = !PHASE ? '' : SAGA ? `saga=${SAGA}&phase=${PHASE}` : `phase=${PHASE}`
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
        // 실제 DOM publication 때 기록하고 각 관측을 한 번 해제한다 (프레임 polling 없음).
        for (const [selector, key] of [['.zendikar-map path', '__map'], ['.zendikar-map .figures > *', '__figs']]) {
          const observer = new MutationObserver(record);
          function record() {
            if (!document.querySelector(selector)) return;
            window[key] = performance.now();
            observer.disconnect();
          }
          observer.observe(document, { childList: true, subtree: true });
          record();
          window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
        }`,
    })
    const q = [phaseQuery, QUERY].filter(Boolean).join('&')
    await send('Page.navigate', { url: `${BASE}/${q ? `?${q}` : ''}` })
    await sleep(PHASE ? 12000 : 9000)
    const r = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => { const p = performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint'); const fonts = [...document.fonts].filter(f => f.status === 'loaded').length;
        return { fcp: Math.round(p?.startTime ?? -1), lcp: Math.round(window.__lcp), map: Math.round(window.__map ?? -1), figs: Math.round(window.__figs ?? -1), longN: window.__long.length, longMs: Math.round(window.__long.reduce((a,b)=>a+b,0)), longMax: Math.round(Math.max(0, ...window.__long)), fontsLoaded: fonts, js: performance.getEntriesByType('resource').filter(e => e.name.endsWith('.js')).length,
          chunks: Object.fromEntries(performance.getEntriesByType('resource').filter(e => /\\/(phase\\d|world[\\w-]*|period[\\w-]*)-[\\w-]{8}\\.js$/.test(e.name)).map(e => [e.name.split('/').pop().replace(/\\.js$/, ''), Math.round(e.responseEnd)])),
          chunkKb: Object.fromEntries(performance.getEntriesByType('resource').filter(e => /\\/(phase\\d|period[\\w-]*|index)-[\\w-]{8}\\.(js|css)$/.test(e.name)).map(e => [e.name.split('/').pop(), Math.round(e.transferSize / 102.4) / 10])) } })()`,
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
console.log(`median fcp=${med('fcp')} lcp=${med('lcp')} map=${med('map')} figs=${med('figs')} long=${med('longMs')}ms(max ${med('longMax')}) kb=${med('kb')}`)
