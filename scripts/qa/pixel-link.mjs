// 지금 지도 ↔ 픽셀 지도(/pixel) 왕복 시험 (S8, docs/pixel-plan.md) — 개발 서버(pnpm dev) 뒤.
//   node scripts/qa/pixel-link.mjs [--base http://localhost:5173]
// 지금 지도의 '픽셀 지도로 보기' 링크와 픽셀 지도의 '지금 지도로' 링크가 지금 보는 자리(?view)·언어(?lang)·시점(?time)·사가 보기(?saga·?phase — 픽셀 지도는
// 끈 지도로 열되 지우지 않는다)·고른 것(#)을 넘기는가, 픽셀 지도의 시험 스위치(?pal·?s·?shore·?terrain)는 지금 지도로 넘기지 않는가, 두 번 왕복해도 같은가.
// 지금 지도는 옮기거나 언어를 바꿔도 주소의 ?view·?lang 을 고치지 않으니, 연 뒤 확대·끌기·언어 바꾸기를 하고 링크를 읽어
// 화면 가운데의 지도 자리(지도 층의 화면 변환을 거꾸로 — 링크가 쓰는 셈과 따로)와 바꾼 언어에 견준다. 픽셀 지도에서도 방향키로 옮긴 뒤 링크를 읽는다
import { launchChrome } from './chrome.mjs'

const argv = process.argv.slice(2)
const BASE = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : 'http://localhost:5173'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const problems = []
const check = (ok, what) => {
  console.log(`  ${ok ? 'ok ' : 'NO '} ${what}`)
  if (!ok) problems.push(what)
}

const W = 1440
const H = 900
const chrome = await launchChrome({ width: W, height: H })
try {
  const { sessionId: s } = await chrome.newPage(null, { w: W, h: H, scale: 1, mobile: false })
  const ev = async (e) => (await chrome.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }, s)).result.value
  const mouse = (type, x, y, extra = {}) => chrome.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra }, s)
  const key = (k, code, vk) => chrome.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk }, s).then(() => chrome.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk }, s))
  const go = async (url, ready) => {
    await chrome.send('Page.navigate', { url }, s)
    for (let i = 0; i < 80; i++) {
      await sleep(250)
      if (await ev(ready)) break
    }
    await sleep(800)
  }
  const rel = (u) => {
    const x = new URL(u, BASE)
    return x.pathname + x.search + x.hash
  }
  const params = (u) => Object.fromEntries(new URL(u, BASE).searchParams)
  const near = (a, b) => {
    const [ax, ay, ak] = (a ?? '').split(',').map(Number)
    const [bx, by, bk] = (b ?? '').split(',').map(Number)
    return Math.abs(ax - bx) <= 2 && Math.abs(ay - by) <= 2 && Math.abs(ak / bk - 1) < 0.02
  }
  const MAIN_READY = `!!document.querySelector('.pixel-map-link') && !!document.querySelector('svg.zendikar-map')`
  const PIXEL_READY = `!!document.querySelector('.pixel-link') && document.querySelectorAll('.px-mark').length > 0`

  /** 지금 지도 — 화면 가운데의 지도 자리와 배율(세계를 화면에 맞춘 것에 견준)을 지도 층의 화면 변환에서 */
  const mainCenter = () =>
    ev(`(() => {
      const svg = document.querySelector('svg.zendikar-map')
      const layer = svg.querySelector(':scope > g[data-tier]')
      const m = layer.getScreenCTM().inverse()
      const r = svg.getBoundingClientRect()
      const p = new DOMPoint(r.left + r.width / 2, r.top + r.height / 2).matrixTransform(m)
      const fit = Math.min(r.width / 2400, r.height / 1700)
      const k = layer.getScreenCTM().a / fit
      return p.x.toFixed(1) + ',' + p.y.toFixed(1) + ',' + k
    })()`)
  /** 지금 지도의 링크 — 누르기(pointerdown)만 하고 떼지 않아 주소를 셈하게 한다 (떼면 넘어간다) */
  const mainLink = async () => {
    const r = await ev(`(() => { const a = document.querySelector('.pixel-map-link'); a.scrollIntoView(); const b = a.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2] })()`)
    await mouse('mousePressed', r[0], r[1])
    const href = await ev(`document.querySelector('.pixel-map-link').href`)
    // 떼기는 링크 밖에서 (누름이 클릭이 되지 않게)
    await mouse('mouseMoved', 5, H - 5)
    await mouse('mouseReleased', 5, H - 5)
    return rel(href)
  }
  const pixelLink = async () => rel(await ev(`document.querySelector('.pixel-link').href`))

  for (const c of [
    { name: '시점·영어·장소', q: '?lang=en&time=3&view=1100,700,2', hash: '#halimar', toLang: 'ko' },
    { name: '끈 지도·한국어·카드', q: '?lang=ko&view=2100,900,4', hash: '#card/eye-of-ugin', toLang: 'en' },
    { name: '사가 보기·주소에 자리·언어 없음', q: '?saga=2&phase=1', hash: '', toLang: 'ko' },
  ]) {
    console.log(c.name)
    await go(`${BASE}/${c.q}${c.hash}`, MAIN_READY)
    // 연 뒤 옮기기 — 확대 단추 한 번, 지도 끌기, 언어 바꾸기 (주소의 ?view·?lang 은 그대로 남는다)
    await ev(`document.querySelector('.zoom-buttons button').click()`)
    await sleep(900)
    await mouse('mousePressed', 900, 500)
    for (let i = 1; i <= 8; i++) await mouse('mouseMoved', 900 - i * 15, 500 - i * 8)
    await mouse('mouseReleased', 780, 436)
    await sleep(600)
    await ev(`document.querySelector('.lang-toggle').click()`)
    await sleep(600)
    const want = params(`/${c.q}`)
    const hash = await ev('location.hash')
    const live = await mainCenter()
    const toPixel = await mainLink()
    const got = params(toPixel)
    check(toPixel.startsWith('/pixel'), `지금 지도의 링크는 /pixel (${toPixel})`)
    check(got.lang === c.toLang, `→ 픽셀: ?lang 이 바꾼 언어 (${got.lang} / ${c.toLang})`)
    for (const k of ['time', 'saga', 'phase']) check(got[k] === want[k], `→ 픽셀: ?${k} 가 같다 (${got[k]} / ${want[k]})`)
    check(new URL(toPixel, BASE).hash === hash, `→ 픽셀: # 가 같다 (${new URL(toPixel, BASE).hash})`)
    check(near(got.view, live), `→ 픽셀: ?view 가 옮긴 뒤의 화면 가운데 (${got.view} / ${live})`)
    await go(`${BASE}${toPixel}`, PIXEL_READY)
    const pv = await ev(`new URLSearchParams(location.search).get('view')`)
    const [px, py] = (pv ?? '').split(',').map(Number)
    const [mx, my] = (got.view ?? '').split(',').map(Number)
    check(Math.abs(px - mx) <= 2 && Math.abs(py - my) <= 2, `픽셀 지도가 같은 자리를 연다 (${pv} / ${got.view})`)
    check((await ev('document.querySelector(".pixel-app").lang')) === c.toLang, `픽셀 지도가 같은 언어로 연다`)
    // 픽셀 지도에서 옮기기 — 방향키 셋
    await ev(`document.querySelector('.pixel-stage').focus()`)
    for (let i = 0; i < 3; i++) await key('ArrowRight', 'ArrowRight', 39)
    await sleep(600)
    const pv2 = await ev(`new URLSearchParams(location.search).get('view')`)
    check(pv2 !== pv, `픽셀 지도에서 옮기면 ?view 가 바뀐다 (${pv} → ${pv2})`)
    const back = await pixelLink()
    const bp = params(back)
    check(new URL(back, BASE).pathname === '/', `픽셀 지도의 링크는 지금 지도 (${back})`)
    check(bp.lang === c.toLang, `← 지금 지도: ?lang 이 같다 (${bp.lang})`)
    for (const k of ['time', 'saga', 'phase']) check(bp[k] === want[k], `← 지금 지도: ?${k} 가 같다 (${bp[k]} / ${want[k]})`)
    for (const k of ['pal', 's', 'shore', 'terrain']) check(bp[k] === undefined, `← 지금 지도: 시험 스위치 ?${k} 는 넘기지 않는다`)
    check(new URL(back, BASE).hash === hash, `← 지금 지도: # 가 같다 (${new URL(back, BASE).hash})`)
    check(bp.view === pv2, `← 지금 지도: ?view 가 옮긴 뒤의 픽셀 지도 자리 (${bp.view} / ${pv2})`)
    // 두 번째 왕복 — 지금 지도로 돌아가 그대로 다시 픽셀 지도로
    await go(`${BASE}${back}`, MAIN_READY)
    const live2 = await mainCenter()
    const [bx, by] = (bp.view ?? '').split(',').map(Number)
    const [lx, ly] = live2.split(',').map(Number)
    // 고른 것(#)이 있으면 지금 지도는 연 뒤 그곳을 패널 곁에 맞춰 보여 ?view 를 따르지 않는다 (지금 지도가 늘 하던 것 — 픽셀 지도는 ?view 를 지킨다)
    if (!hash) check(Math.abs(bx - lx) <= 2 && Math.abs(by - ly) <= 2, `지금 지도가 같은 자리를 연다 (${live2} / ${bp.view})`)
    const again = await mainLink()
    const ap = params(again)
    check(ap.lang === c.toLang, `두 번째 왕복: ?lang 이 같다 (${ap.lang})`)
    for (const k of ['time', 'saga', 'phase']) check(ap[k] === want[k], `두 번째 왕복: ?${k} 가 같다 (${ap[k]})`)
    check(near(ap.view, live2), `두 번째 왕복: ?view 가 같다 (${ap.view} / ${live2})`)
    check(new URL(again, BASE).hash === hash, `두 번째 왕복: # 가 같다`)
  }
} finally {
  await chrome.close()
}
if (problems.length) {
  console.log(`문제 ${problems.length}개`)
  process.exit(1)
}
console.log('통과')
