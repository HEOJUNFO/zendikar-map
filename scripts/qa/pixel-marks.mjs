// 픽셀 지도(/pixel)의 기호·패널 동작 시험 — 개발 서버(pnpm dev) 뒤 (docs/pixel-plan.md S3).
//   node scripts/qa/pixel-marks.mjs [--base http://localhost:5173]
// 데스크톱(1440×900)과 휴대폰(390×844 터치)에서: 기호를 누르면 그 장소 패널이 열리고 # 주소가 바뀌는가, 기호에서 시작한 끌기는 고르지 않는가,
// Tab 이 그려진 기호를 모두 지나는가(화면이 밀리지 않고 초점 기호가 화면 안에), Esc 가 패널을 닫는가, 영어 보기의 패널 글이 영어인가,
// #card/<장소와 하나인 카드> 가 장소 패널을 열고 그곳으로 가는가, 잘못된 # 에도 페이지가 서는가, 없는 id 는 패널을 열지 않는가,
// 손끝이 조금(6px) 밀린 누름도 고르기인가, 고른 이름의 테두리가 노랑인가 (2026-11-07 검토)
import { launchChrome } from './chrome.mjs'

const argv = process.argv.slice(2)
const BASE = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : 'http://localhost:5173'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const problems = []
const check = (ok, what) => {
  console.log(`  ${ok ? 'ok ' : 'NO '} ${what}`)
  if (!ok) problems.push(what)
}

const chrome = await launchChrome({ width: 1440, height: 900 })
try {
  for (const dev of [
    { name: '데스크톱', w: 1440, h: 900, scale: 1, mobile: false },
    { name: '휴대폰', w: 390, h: 844, scale: 3, mobile: true },
  ]) {
    console.log(dev.name)
    const { sessionId: s } = await chrome.newPage(null, { w: dev.w, h: dev.h, scale: dev.scale, mobile: dev.mobile })
    if (dev.mobile) await chrome.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, s)
    const ev = async (e) => (await chrome.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }, s)).result.value
    const open = async (q) => {
      await chrome.send('Page.navigate', { url: `${BASE}/pixel?${q}` }, s)
      for (let i = 0; i < 60; i++) {
        await sleep(200)
        if (await ev(`document.querySelectorAll('.px-mark').length > 0 && !!window.__pixel && window.__pixel.missing === 0`)) break
      }
    }
    const tap = async (x, y, moveTo) => {
      if (dev.mobile) {
        const t = (type, px, py) => chrome.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: px, y: py }] }, s)
        await t('touchStart', x, y)
        if (moveTo)
          for (let i = 1; i <= 8; i++) {
            await t('touchMove', x + ((moveTo[0] - x) * i) / 8, y + ((moveTo[1] - y) * i) / 8)
            await sleep(16)
          }
        await t('touchEnd')
      } else {
        const m = (type, px, py) => chrome.send('Input.dispatchMouseEvent', { type, x: px, y: py, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 }, s)
        await m('mousePressed', x, y)
        if (moveTo)
          for (let i = 1; i <= 8; i++) {
            await m('mouseMoved', x + ((moveTo[0] - x) * i) / 8, y + ((moveTo[1] - y) * i) / 8)
            await sleep(16)
          }
        await m('mouseReleased', ...(moveTo ?? [x, y]))
      }
      await sleep(400)
    }
    // 화면 가운데에 가장 가까운 기호
    const pickMark = () =>
      ev(`(() => {
        const w = innerWidth, h = innerHeight
        const all = [...document.querySelectorAll('.px-mark')].map((b) => { const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, label: b.getAttribute('aria-label') } })
          .filter((m) => m.x > 40 && m.x < w - 40 && m.y > 200 && m.y < h - 120)
        all.sort((a, b) => Math.hypot(a.x - w / 2, a.y - h / 2) - Math.hypot(b.x - w / 2, b.y - h / 2))
        return all[0] ?? null
      })()`)

    await open('view=1000,760,4')
    let m = await pickMark()
    check(m !== null, `기호가 화면에 있다 (${m?.label})`)
    await tap(m.x, m.y, [m.x - 120, m.y + 60])
    check((await ev('!!document.querySelector(".px-panel")')) === false, '기호에서 시작한 끌기는 패널을 열지 않는다')
    m = await pickMark()
    await tap(m.x, m.y, [m.x + 4, m.y + 4])
    await sleep(600)
    const title = await ev('document.querySelector(".px-panel h2")?.textContent ?? null')
    check(title !== null && m.label.startsWith(title), `기호를 누르면 그 패널이 열린다 (${title})`)
    check((await ev('location.hash.length > 1')) === true, `# 주소가 바뀐다 (${await ev('location.hash')})`)
    check((await ev('document.activeElement?.id')) === 'px-panel-title', '패널 제목으로 초점이 간다')
    const outline = await ev(`getComputedStyle(document.querySelector('.px-mark.is-selected .px-name') ?? document.body).textShadow`)
    check(/242, 201, 76/.test(outline ?? ''), `고른 이름의 테두리가 노랑이다 (${(outline ?? '').slice(0, 30)})`)
    const under = await ev(`(() => { const p = document.querySelector('.px-panel').getBoundingClientRect(); const b = document.querySelector('.px-mark.is-selected')?.getBoundingClientRect(); if (!b) return 'none'; const x = b.x + b.width / 2, y = b.y + b.height / 2; return x > p.left && x < p.right && y > p.top && y < p.bottom })()`)
    check(under === false, `고른 기호가 패널 밑에 숨지 않는다 (${under})`)
    const prose = await ev('document.querySelector(".px-panel .px-prose")?.textContent ?? ""')
    check(prose.length > 0 && !/[가-힣]{4}/.test(prose.slice(0, 40)), `영어 보기의 설명이 영어다 (${prose.slice(0, 40)}…)`)
    await chrome.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, s)
    await sleep(300)
    check((await ev('!document.querySelector(".px-panel") && location.hash === ""')) === true, 'Esc 가 패널을 닫고 # 를 지운다')

    // Tab — 그려진 기호·이름 단추를 모두 지난다
    const n = await ev('document.querySelectorAll(".px-mark, .px-area, .px-continent").length')
    await ev('document.querySelector(".pixel-stage").focus()')
    const seen = new Set()
    for (let i = 0; i < n + 5; i++) {
      await chrome.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }, s)
      const k = await ev('(() => { const a = document.activeElement; return a && a.closest(".px-marks") ? (a.getAttribute("aria-label") || a.textContent) : null })()')
      if (k) seen.add(k)
    }
    check(seen.size === n, `Tab 이 그려진 표시 ${n}개를 모두 지난다 (${seen.size})`)
    const scroll = await ev(`(() => { const st = document.querySelector('.pixel-stage'); const a = document.activeElement.getBoundingClientRect(); return { sx: st.scrollLeft, sy: st.scrollTop, ds: scrollX + scrollY, x: a.x, y: a.y } })()`)
    check(scroll.sx === 0 && scroll.sy === 0 && scroll.ds === 0, `Tab 이 화면을 스크롤하지 않는다 (${JSON.stringify(scroll)})`)
    check(scroll.x > -20 && scroll.x < dev.w && scroll.y > -20 && scroll.y < dev.h, '초점 기호가 화면 안에 있다')

    await open('#card/eye-of-ugin')
    await sleep(800)
    const eye = await ev(`(() => { const b = document.querySelector('.px-mark.is-selected')?.getBoundingClientRect(); return b ? { x: b.x, y: b.y, h: document.querySelector('.px-panel h2')?.textContent } : null })()`)
    check(eye !== null && eye.h === 'Eye of Ugin' && eye.x > 0 && eye.x < dev.w && eye.y > 0 && eye.y < dev.h, `#card/eye-of-ugin 은 그 장소로 간다 (${JSON.stringify(eye)})`)
    // 세계가 화면에 다 들어가는 개관에서도 고른 기호를 패널 밖으로 비킨다
    await open('#eye-of-ugin')
    await sleep(800)
    const hidden = await ev(`(() => { const p = document.querySelector('.px-panel').getBoundingClientRect(); const b = document.querySelector('.px-mark.is-selected')?.getBoundingClientRect(); if (!b) return 'none'; const x = b.x + 9, y = b.y + 9; return x > p.left && x < p.right && y > p.top && y < p.bottom })()`)
    check(hidden === false, `개관에서도 고른 기호가 패널 밑에 숨지 않는다 (${hidden})`)
    await open('#%E0%A4%A')
    check((await ev(`document.querySelectorAll('.px-mark').length > 0 && !document.querySelector('.px-panel')`)) === true, '잘못된 # 에도 페이지가 선다')
    await open('#no-such-place')
    await sleep(1200)
    check((await ev(`!document.querySelector('.px-panel')`)) === true, '없는 id 는 패널을 열지 않는다')

    // 장소와 하나인 카드 주소 — 자리가 없는 장소(에메리아)의 표시가 되는 카드, 지도에 있는 장소와 하나인 카드
    await open('lang=ko#card/emeria-the-sky-ruin')
    await sleep(800)
    check((await ev('document.querySelector(".px-panel h2")?.textContent')) === 'Emeria', `#card/emeria-the-sky-ruin 은 장소 패널 (${await ev('document.querySelector(".px-panel h2")?.textContent')})`)
    await chrome.send('Target.closeTarget', { targetId: (await chrome.send('Target.getTargets')).targetInfos.find((t) => t.type === 'page' && t.attached)?.targetId }).catch(() => {})
  }
} finally {
  await chrome.close()
}
if (problems.length) {
  console.log(`문제 ${problems.length}개`)
  process.exit(1)
}
console.log('통과')
