// 픽셀 지도(/pixel)의 기호·패널 동작 시험 — 개발 서버(pnpm dev) 뒤 (docs/pixel-plan.md S3).
//   node scripts/qa/pixel-marks.mjs [--base http://localhost:5173]
// 데스크톱(1440×900)과 휴대폰(390×844 터치)에서: 기호를 누르면 그 장소 패널이 열리고 # 주소가 바뀌는가, 기호에서 시작한 끌기는 고르지 않는가,
// Tab 이 그려진 기호를 모두 지나는가(화면이 밀리지 않고 초점 기호가 화면 안에), Esc 가 패널을 닫는가, 영어 보기의 패널 글이 영어인가,
// #card/<장소와 하나인 카드> 가 장소 패널을 열고 그곳으로 가는가, 잘못된 # 에도 페이지가 서는가, 없는 id 는 패널을 열지 않는가,
// 손끝이 조금(6px) 밀린 누름도 고르기인가, 고른 이름의 테두리가 노랑인가 (2026-11-07 검토).
// 시점별 지도(S6, 데스크톱): 시점 단추·?time·뒤로 가기, 그 무렵 없던 장소·폐허 기호, 사가에 매인 카드, 패널의 '이 무렵'.
// 페이즈 그림(S7, 데스크톱): 그림을 누르면 그 카드 패널, Tab 으로 닿는 그림 단추, 끈 지도에서 연 페이즈 카드 주소.
// 휴대폰 머리말(S8): 패널이 열린 동안 저절로 접고 닫히면 펼친다, 접어 둔 머리말은 패널이 열린 채 한 번에 펴지고, 모르는 # 로는 접지 않는다
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
    // 휴대폰은 패널이 열린 동안 머리말을 저절로 접는다 (S8 — 기억하지 않고, 패널이 닫히면 펼친다)
    if (dev.mobile) check((await ev(`document.querySelector('.pixel-head').hasAttribute('data-folded')`)) === true, '휴대폰에서 패널이 열리면 머리말이 저절로 접힌다')
    const outline = await ev(`getComputedStyle(document.querySelector('.px-mark.is-selected .px-name') ?? document.body).textShadow`)
    check(/242, 201, 76/.test(outline ?? ''), `고른 이름의 테두리가 노랑이다 (${(outline ?? '').slice(0, 30)})`)
    const under = await ev(`(() => { const p = document.querySelector('.px-panel').getBoundingClientRect(); const b = document.querySelector('.px-mark.is-selected')?.getBoundingClientRect(); if (!b) return 'none'; const x = b.x + b.width / 2, y = b.y + b.height / 2; return x > p.left && x < p.right && y > p.top && y < p.bottom })()`)
    check(under === false, `고른 기호가 패널 밑에 숨지 않는다 (${under})`)
    const prose = await ev('document.querySelector(".px-panel .px-prose")?.textContent ?? ""')
    check(prose.length > 0 && !/[가-힣]{4}/.test(prose.slice(0, 40)), `영어 보기의 설명이 영어다 (${prose.slice(0, 40)}…)`)
    await chrome.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, s)
    await sleep(300)
    check((await ev('!document.querySelector(".px-panel") && location.hash === ""')) === true, 'Esc 가 패널을 닫고 # 를 지운다')
    if (dev.mobile) check((await ev(`document.querySelector('.pixel-head').hasAttribute('data-folded')`)) === false, '패널이 닫히면 머리말이 다시 펼쳐진다')
    if (dev.mobile) {
      const folded = () => ev(`document.querySelector('.pixel-head').hasAttribute('data-folded')`)
      const press = async () => {
        await ev(`document.querySelector('.pixel-fold').click()`)
        await sleep(200)
      }
      // 접어 둔 머리말 + 패널 — 펴기 단추 첫 누름에 펴진다 (2026-11-07 검토: 저절로 접음이 바로 다시 켜져 첫 누름이 먹지 않았다)
      await press()
      check((await folded()) === true, '접기 단추로 머리말을 접는다')
      m = await pickMark()
      await tap(m.x, m.y, [m.x + 4, m.y + 4])
      await sleep(600)
      await press()
      check((await folded()) === false, '접어 둔 머리말을 패널이 열린 동안 한 번 누르면 펴진다')
      await chrome.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, s)
      await sleep(300)
      check((await folded()) === false, '편 머리말은 패널이 닫혀도 펼친 채')
      // 저절로 접은 머리말을 누르면 그 패널 동안만 편다
      m = await pickMark()
      await tap(m.x, m.y, [m.x + 4, m.y + 4])
      await sleep(600)
      check((await folded()) === true, '다시 연 패널에 머리말이 저절로 접힌다')
      await press()
      check((await folded()) === false, '저절로 접은 머리말을 누르면 편다')
      check((await ev(`localStorage.getItem('pixel-head-folded')`)) === '0', '저절로 접은 것을 편 것은 기억을 바꾸지 않는다')
      await chrome.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, s)
      await sleep(300)
      // 모르는 # — 패널이 없으니 접지 않는다
      await open('view=1000,760,4#no-such-place')
      await sleep(400)
      check((await folded()) === false && (await ev('!document.querySelector(".px-panel")')) === true, '모르는 # 로는 패널도 저절로 접음도 없다')
      // 제목(h1)의 이름에 접기 단추 글이 섞이지 않는다
      check((await ev(`!document.querySelector('.pixel-head h1 button')`)) === true, '접기 단추는 제목 밖에 있다')
      await open('view=1000,760,4')
    }

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
    // 기호에 초점이 있는 채 + 를 두 번 — 확대하는 동안 기호 층을 숨겨도 초점을 잃지 않아 두 번째 + 도 지도에 닿는다 (2026-11-07 검토)
    await ev(`document.querySelector('.px-mark:not(.is-far)').focus()`)
    const lv0 = await ev(`document.querySelector('.pixel-level').textContent`)
    for (const _ of [0, 1]) {
      await chrome.send('Input.dispatchKeyEvent', { type: 'keyDown', key: '+', text: '+', code: 'Equal', windowsVirtualKeyCode: 187 }, s)
      await chrome.send('Input.dispatchKeyEvent', { type: 'keyUp', key: '+', code: 'Equal', windowsVirtualKeyCode: 187 }, s)
      await sleep(350)
    }
    const kept = await ev(`({ inMarks: !!document.activeElement?.closest('.px-marks'), level: document.querySelector('.pixel-level').textContent })`)
    check(kept.inMarks, '키보드로 확대해도 기호의 초점이 남는다')
    check(kept.level !== lv0, `기호에 초점이 있어도 + 가 지도를 확대한다 (${lv0} → ${kept.level})`)

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
    // 시점별 지도 (S6, 데스크톱) — 단추·주소·뒤로 가기, 그 무렵 없던 장소·폐허 기호, 사가에 매인 카드, 패널의 '이 무렵'
    if (!dev.mobile) {
      const marksWith = (re) => ev(`[...document.querySelectorAll('.px-mark')].map((b) => b.getAttribute('aria-label')).filter((l) => ${re}.test(l))`)
      const pressed = () => ev(`[...document.querySelectorAll('.is-time button')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent)`)
      const timeParam = () => ev(`new URLSearchParams(location.search).get('time')`)
      await open('lang=en&time=1&view=2160,930,4')
      check(JSON.stringify(await pressed()) === '["2009"]', `?time=1 은 2009 단추를 켠다 (${await pressed()})`)
      check((await marksWith('/^Khalni Heart/')).length === 0, '2009 에는 그 무렵 없던 Khalni Heart 를 그리지 않는다')
      check((await marksWith('/^Bala Ged Skyclave — Ruin/i')).length === 1, `2009 의 발라 게드 하늘거주지는 폐허 기호 (${await marksWith('/^Bala Ged Skyclave/')})`)
      check((await marksWith('/^Blighted Woodland/')).length === 0, '2009 에는 BFZ 에 매인 대지 카드가 없다')
      await ev(`[...document.querySelectorAll('.is-time button')].find((b) => b.textContent === '2015').click()`)
      await sleep(600)
      check((await timeParam()) === '3' && JSON.stringify(await pressed()) === '["2015"]', `2015 단추가 ?time=3 으로 (${await timeParam()})`)
      check((await marksWith('/^Blighted Woodland/')).length === 1, '2015 에는 BFZ 에 매인 대지 카드가 나온다')
      check((await marksWith('/^Khalni Heart/')).length === 1, '2015 에는 Khalni Heart 를 다시 그린다')
      await ev(`[...document.querySelectorAll('.is-time button')].find((b) => b.textContent === '2015').click()`)
      await sleep(600)
      check((await timeParam()) === null && (await pressed()).length === 0, '켠 단추를 다시 누르면 시점을 끈다')
      await ev('history.back()')
      await sleep(800)
      check((await timeParam()) === '3' && JSON.stringify(await pressed()) === '["2015"]', `뒤로 가기가 앞 시점으로 돌아간다 (${await timeParam()})`)
      await open('lang=en&view=2160,930,4#card/blighted-woodland')
      await sleep(800)
      check((await timeParam()) === '3' && (await ev('document.querySelector(".px-panel h2")?.textContent')) === 'Blighted Woodland', `끈 지도에서 BFZ 에 매인 카드를 열면 그 카드의 첫 시점(2015)으로 (${await timeParam()})`)
      // 저절로 바꾼 시점은 새 항목을 쌓지 않는다 — 뒤로 가기가 앞 페이지로 간다 (S6 검토: 다시 그 시점으로 끌려왔다)
      await open('lang=en&view=2160,930,4')
      await ev(`location.hash = '#card/blighted-woodland'`)
      await sleep(1200)
      check((await timeParam()) === '3', `# 로 고른 BFZ 카드가 시점을 2015 로 (${await timeParam()})`)
      await ev('history.back()')
      await sleep(1000)
      check((await ev('location.hash')) === '' , `뒤로 가기가 카드를 고르기 전으로 간다 (${await ev('location.href')})`)
      // 사가에 매인, 장소와 하나인 카드 — 그 시점(2016)으로 가서 그 장소 패널에 장소의 카드와 함께
      await open('lang=en&time=5&view=1000,680,4#card/ruins-of-oran-rief')
      await sleep(1500)
      const figs = await ev(`[...document.querySelectorAll('.px-panel .px-place-card img')].map((i) => i.alt)`)
      check((await timeParam()) === '4' && (await ev('document.querySelector(".px-panel h2")?.textContent'))?.startsWith('Oran-Rief') && figs.length === 2, `#card/ruins-of-oran-rief 는 2016 의 오란리프 패널에 두 카드 (${await timeParam()} · ${figs})`)
      await ev(`[...document.querySelectorAll('.is-time button')].find((b) => b.textContent === '2020').click()`)
      await sleep(600)
      check((await ev('location.hash')) === '', `그 카드가 없는 시점으로 바꾸면 카드 # 를 지운다 (${await ev('location.hash')})`)
      await open('lang=en&time=4&view=1050,620,4#halimar')
      await sleep(1200)
      const heads = await ev(`[...document.querySelectorAll('.px-panel h3')].map((h) => h.textContent)`)
      check(heads.includes('This period'), `2016 의 할리마르 패널에 '이 무렵' (${heads})`)
      // 페이즈 그림 (S7) — 그림을 누르면 그 카드 패널, Tab 으로 닿는 그림 단추, 끈 지도에서 연 페이즈 카드 주소는 그 카드를 그리는 시점으로
      await open('lang=en&time=2&view=1050,640,4')
      for (let i = 0; i < 40 && !(await ev('(window.__pixel?.figs?.length ?? 0) > 20')); i++) await sleep(250)
      const figsDrawn = await ev('window.__pixel.figs.length')
      check(figsDrawn > 20, `2010 의 할리마르 둘레에 페이즈 그림이 그려진다 (${figsDrawn}장)`)
      // 기호·이름에 가리지 않은 그림 — 그 자리의 맨 위가 지도 캔버스인 것
      const target = await ev(`(() => { for (const f of window.__pixel.figs) { const el = document.elementFromPoint(f.x, f.y); if (el && !el.closest('button') && f.x > 600 && f.y > 200) return f } return null })()`)
      check(target !== null, `누를 그림이 있다 (${target?.id})`)
      if (target) {
        await tap(target.x, target.y)
        await sleep(1500)
        check((await ev('location.hash')) === `#card/${target.id}`, `그림을 누르면 #card/${target.id} (${await ev('location.hash')})`)
        const h2 = await ev('document.querySelector(".px-panel h2")?.textContent')
        check(Boolean(h2) && !(await ev('!!document.querySelector(".px-panel-wait")')), `그 카드의 패널이 열린다 (${h2})`)
        check((await ev(`[...document.querySelectorAll('.px-panel h3')].some((h) => /Sources/.test(h.textContent))`)) === true, '카드 패널에 출처가 있다')
      }
      const figButtons = await ev(`document.querySelectorAll('.px-fig').length`)
      check(figButtons >= figsDrawn, `그린 그림마다 Tab 으로 닿는 단추가 있다 (${figButtons} ≥ ${figsDrawn})`)
      await ev(`(() => { const b = [...document.querySelectorAll('.px-fig')].find((x) => !x.classList.contains('is-far')); b.focus(); b.click() })()`)
      await sleep(800)
      check(/^#card\//.test(await ev('location.hash')), `그림 단추를 누르면(Enter) 그 카드 (${await ev('location.hash')})`)
      await open('lang=en&view=1000,700,4#card/emrakul-the-aeons-torn')
      await sleep(2500)
      check((await timeParam()) === '2' && (await ev('document.querySelector(".px-panel h2")?.textContent')) === 'Emrakul, the Aeons Torn', `끈 지도에서 연 페이즈 카드는 그 카드를 그리는 첫 시점(2010)으로 (${await timeParam()})`)
      // 페이즈 카드 패널을 연 채 시점을 끄거나 그 카드를 그리지 않는 시점으로 바꾸면 패널을 닫는다 (S7 검토: 그 카드의 시점으로 되돌아왔다)
      await open('lang=en&time=2&view=1000,700,4#card/emrakul-the-aeons-torn')
      await sleep(1500)
      await ev(`[...document.querySelectorAll('.is-time button')].find((b) => b.textContent === '2010').click()`)
      await sleep(1000)
      check((await timeParam()) === null && (await ev('location.hash')) === '' && !(await ev('!!document.querySelector(".px-panel")')), `페이즈 카드 패널을 연 채 켠 시점을 누르면 시점이 꺼지고 패널이 닫힌다 (${await timeParam()} ${await ev('location.hash')})`)
      // 장소와 하나인 페이즈 카드는 그 장소 패널 — 장소의 카드로 싣고, '이 시점의 카드' 줄에는 없다
      await open('lang=en&time=2&view=1000,700,4#card/seers-sundial')
      await sleep(2000)
      const sund = await ev(`({ h: document.querySelector('.px-panel h2')?.textContent, img: document.querySelectorAll('.px-panel .px-place-card img').length, rows: [...document.querySelectorAll('.px-panel .px-list li')].map((li) => li.textContent).filter((x) => /Sundial/.test(x)).length })`)
      check(sund.h === "Seer's Sundial" && sund.img >= 1 && sund.rows === 0, `#card/seers-sundial 은 그 장소 패널에 장소의 카드로 (${JSON.stringify(sund)})`)
      await open('lang=en&saga=2&phase=1&view=2160,930,4')
      check((await pressed()).length === 0 && (await timeParam()) === null, '사가 주소(?saga)는 시점을 켜지 않는다 (픽셀 지도에 사가 보기는 없다)')
    }
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
