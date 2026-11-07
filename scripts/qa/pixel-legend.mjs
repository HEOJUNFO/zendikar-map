// 픽셀 지도(/pixel)의 범례 시험 (S10, docs/pixel-plan.md) — 개발 서버(pnpm dev) 뒤.
//   node scripts/qa/pixel-legend.mjs [--base http://localhost:5173]
// 접혀서 열리고, 펼치면 기호 다섯·헤드론·지형 여덟 줄과 그 시점의 그 무렵 지형 줄(virtual:pixel-times 의 legend)·시점 글이 나오는가, 영어 보기에서 시점 글이 영어로 옮겨지는가,
// 패널이 열리면 접히는가(다시 펴지 않는다), 패널이 열린 채로도 펼치고 접을 수 있는가(펼친 내용이 그려지고 접은 것이 그대로 남는가),
// 데스크톱·휴대폰(좁은·가로로 누운 것까지)에서 범례가 화면 밖으로 나가거나 머리말·확대 단추와 겹치지 않는가 (낮은 화면은 범례를 펴는 동안 머리말이 접힌다)
import { launchChrome } from './chrome.mjs'

const argv = process.argv.slice(2)
const BASE = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : 'http://localhost:5173'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const problems = []
const check = (ok, what) => {
  console.log(`  ${ok ? 'ok ' : 'NO '} ${what}`)
  if (!ok) problems.push(what)
}
const overlap = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

for (const dev of [
  { name: '데스크톱', w: 1440, h: 900, mobile: false },
  { name: '휴대폰', w: 390, h: 844, mobile: true },
  { name: '낮은 휴대폰', w: 375, h: 667, mobile: true },
  { name: '좁은 휴대폰', w: 320, h: 568, mobile: true },
  { name: '가로 휴대폰', w: 740, h: 360, mobile: true },
]) {
  const chrome = await launchChrome({ width: dev.w, height: dev.h })
  try {
    const { sessionId: s } = await chrome.newPage(null, { w: dev.w, h: dev.h, scale: dev.mobile ? 2 : 1, mobile: dev.mobile })
    const ev = async (e) => (await chrome.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }, s)).result.value
    const rect = (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })()`)
    const go = async (q) => {
      await chrome.send('Page.navigate', { url: `${BASE}/pixel${q}` }, s)
      for (let i = 0; i < 60; i++) {
        await sleep(250)
        if (await ev(`!!document.querySelector('.px-legend')`)) break
      }
      await sleep(800)
    }
    console.log(dev.name)
    for (const c of [
      { q: '?lang=ko', time: null, period: 0 },
      { q: '?time=4&lang=en', time: 4, period: 3, en: true },
      { q: '?time=6&lang=ko', time: 6, period: 1 },
    ]) {
      await go(c.q)
      check(!(await ev(`document.querySelector('.px-legend').open`)), `${c.q}: 처음에는 접혀 있다`)
      await ev(`document.querySelector('.px-legend summary').click()`)
      await sleep(1500)
      const n = await ev(`document.querySelectorAll('.px-legend-list li').length`)
      check(n === 6 + 8 + c.period, `${c.q}: 줄 ${n} — 기호 5·헤드론·지형 8·그 무렵 ${c.period}`)
      const imgs = await ev(`[...document.querySelectorAll('.px-legend-art')].every((i) => i.complete && i.naturalWidth > 0)`)
      check(imgs, `${c.q}: 그림이 모두 그려진다`)
      const text = await ev(`[...document.querySelectorAll('.px-legend-text')].map((p) => [p.lang, p.textContent])`)
      // 지도가 그리는 시점(ERA_NOTE) 다음 줄이 켠 시점의 글
      const note = c.time === null ? text[1] : text[2]
      check(Boolean(note?.[1]?.length > 40), `${c.q}: 시점 글이 있다`)
      if (c.en) check(note?.[0] === 'en' && !/[가-힣]/.test(note[1]), `${c.q}: 시점 글이 영어로 옮겨졌다 (${note?.[0]})`)
      const lg = await rect('.px-legend')
      check(lg.x >= 0 && lg.y >= 0 && lg.x + lg.w <= dev.w + 0.5 && lg.y + lg.h <= dev.h + 0.5, `${c.q}: 범례가 화면 안 (${Math.round(lg.x)},${Math.round(lg.y)} ${Math.round(lg.w)}×${Math.round(lg.h)})`)
      check(!overlap(lg, await rect('.pixel-head')), `${c.q}: 펼친 범례가 머리말과 겹치지 않는다`)
      check(!overlap(lg, await rect('.pixel-zoom')), `${c.q}: 펼친 범례가 확대 단추와 겹치지 않는다`)
    }
    // 패널이 열리면 접히고, 닫으면 다시 펼쳐진다
    await go('?lang=ko')
    await ev(`document.querySelector('.px-legend summary').click()`)
    await sleep(800)
    await ev(`(() => { const b = [...document.querySelectorAll('.px-mark')].find((x) => !x.classList.contains('is-far')); b?.click() })()`)
    await sleep(1500)
    const withPanel = await ev(`[!!document.querySelector('.px-panel'), document.querySelector('.px-legend').open]`)
    check(withPanel[0] && !withPanel[1], `패널이 열리면 범례가 접힌다 (${withPanel})`)
    // 패널이 열린 채로 펼치면 내용이 그려지고, 다시 접으면 패널을 닫은 뒤에도 접힌 채
    await ev(`document.querySelector('.px-legend summary').click()`)
    await sleep(1200)
    check(await ev(`document.querySelector('.px-legend').open && document.querySelectorAll('.px-legend-list li').length > 0`), '패널이 열린 채로 펼친 범례에 내용이 있다')
    await ev(`document.querySelector('.px-legend summary').click()`)
    await sleep(500)
    await ev(`document.querySelector('.px-panel-close').click()`)
    await sleep(800)
    check(!(await ev(`document.querySelector('.px-legend').open`)), '패널이 열린 채로 접은 범례는 패널을 닫아도 접힌 채')
    // 다시 펼치고 패널을 닫아도 그대로 — 그다음 접는다
    await ev(`document.querySelector('.px-legend summary').click()`)
    await sleep(500)
    // 접은 범례가 확대 단추와 겹치지 않는다 (휴대폰은 같은 줄)
    await ev(`document.querySelector('.px-legend summary').click()`)
    await sleep(500)
    check(!overlap(await rect('.px-legend'), await rect('.pixel-zoom')), '접은 범례가 확대 단추와 겹치지 않는다')
  } finally {
    await chrome.close()
  }
}
if (problems.length) {
  console.log(`문제 ${problems.length}개`)
  process.exit(1)
}
console.log('통과')
