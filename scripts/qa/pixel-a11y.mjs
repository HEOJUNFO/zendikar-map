// 픽셀 지도(/pixel)의 키보드·초점 시험 (S13, docs/pixel-plan.md) — 개발 서버(pnpm dev) 뒤.
//   node scripts/qa/pixel-a11y.mjs [--base http://localhost:5173]
// Tab 이 머리말부터인가, 기호에서 Enter 로 연 패널을 Esc·닫기 단추로 닫으면 초점이 그 기호로 돌아오는가, 패널 밖(범례)에 있던 초점은 Esc 에 그대로인가,
// 끝 단계에서 확대 단추를 눌러도 초점이 단추에 남는가, 초점이 있던 대륙명이 확대해도 사라지지 않는가, 초점을 받은 기호가 머리말·패널 밑에 남지 않는가
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
  const { sessionId: s } = await chrome.newPage(null, { w: 1440, h: 900 })
  const ev = async (e) => (await chrome.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }, s)).result.value
  const key = async (k, code, vk, mod = 0) => {
    // Enter 는 글자(\r)까지 보내야 단추가 눌린다 (CDP 의 keyDown 만으로는 click 이 오지 않는다)
    await chrome.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers: mod, ...(k === 'Enter' ? { text: '\r' } : {}) }, s)
    await chrome.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers: mod }, s)
  }
  const tab = () => key('Tab', 'Tab', 9)
  const go = async (q) => {
    await chrome.send('Page.navigate', { url: `${BASE}/pixel${q}` }, s)
    for (let i = 0; i < 60; i++) {
      await sleep(250)
      if (await ev(`document.querySelectorAll('.px-mark').length > 0`)) break
    }
    await sleep(1000)
  }
  // 초점이 있는 것의 이름 — 화면에 이름이 보이는 단추는 aria-label 없이 글자가 이름이다
  const active = () => ev(`(() => { const a = document.activeElement; return a ? (a.getAttribute('aria-label') || a.textContent || a.tagName) : null })()`)
  // 같은 기호를 다시 — 이름으로
  const focusByName = (name) => ev(`[...document.querySelectorAll('.px-mark')].find((b) => b.getAttribute('aria-label') === ${JSON.stringify(name)})?.focus()`)
  const waitPanel = async () => {
    for (let i = 0; i < 40; i++) {
      await sleep(200)
      if (await ev(`!!document.querySelector('.px-panel h2')`)) return true
    }
    return false
  }

  // 1. Tab 차례 — 머리말의 단추가 지도 기호보다 먼저
  await go('?lang=en&view=1000,760,4')
  await ev(`document.activeElement?.blur()`)
  const order = []
  for (let i = 0; i < 6; i++) {
    await tab()
    order.push(await ev(`(() => { const a = document.activeElement; return a?.closest('.pixel-head') ? 'head' : a?.closest('.pixel-stage') ? 'map' : 'other' })()`))
  }
  check(order[0] === 'head', `Tab 이 머리말부터 (${order.join(',')})`)

  // 2. 기호에서 Enter 로 연 패널을 Esc 로 닫으면 그 기호로
  await ev(`document.querySelector('.px-mark:not(.is-far)').focus()`)
  const opener = await active()
  await key('Enter', 'Enter', 13)
  check(await waitPanel(), 'Enter 로 패널이 열린다')
  await key('Escape', 'Escape', 27)
  await sleep(600)
  check((await active()) === opener, `Esc 로 닫으면 초점이 연 기호로 (${await active()} / ${opener})`)
  // 닫기 단추로도
  await focusByName(opener)
  await key('Enter', 'Enter', 13)
  await waitPanel()
  await ev(`document.querySelector('.px-panel-close').focus()`)
  await key('Enter', 'Enter', 13)
  await sleep(600)
  check((await active()) === opener, `닫기 단추로 닫아도 연 기호로 (${await active()})`)
  // 패널 밖(범례)의 초점은 Esc 에 그대로
  await focusByName(opener)
  await key('Enter', 'Enter', 13)
  await waitPanel()
  await ev(`document.querySelector('.px-legend summary').focus()`)
  await key('Escape', 'Escape', 27)
  await sleep(600)
  check(await ev(`document.activeElement === document.querySelector('.px-legend summary')`), 'Esc 에 범례의 초점은 그대로')

  // 3. 끝 단계의 확대 단추 — 초점이 단추에 남는다
  await go('?lang=en&view=1000,760,32')
  await ev(`document.querySelector('.pixel-zoom button').focus()`)
  for (let i = 0; i < 3; i++) {
    await key('Enter', 'Enter', 13)
    await sleep(700)
  }
  check(await ev(`document.activeElement === document.querySelector('.pixel-zoom button')`), `끝 단계에서도 초점이 확대 단추에 (${await active()})`)
  check(await ev(`document.querySelector('.pixel-zoom button').getAttribute('aria-disabled') === 'true'`), '끝 단계의 확대 단추는 aria-disabled')

  // 4. 초점이 있던 대륙명이 확대해도 남는다
  await go('?lang=en')
  // 대륙명이 놓이지 않는 단계(CONTINENT_LAST_LEVEL 2 뒤)까지 확대
  await ev(`document.querySelector('.px-continent').focus()`)
  const cont = await active()
  for (let i = 0; i < 4; i++) {
    await key('+', 'Equal', 187)
    await sleep(900)
  }
  check(await ev(`document.activeElement?.classList.contains('px-continent')`) && (await active()) === cont, `확대해도 대륙명의 초점이 남는다 (${await active()} / ${cont})`)

  // 5. 초점을 받은 기호가 머리말·패널 밑에 남지 않는다 — 기호를 하나씩 Tab 으로
  await go('?lang=en&view=1000,760,4#halimar')
  await sleep(1500)
  await ev(`document.querySelector('.pixel-stage').focus()`)
  let hidden = 0
  let seen = 0
  for (let i = 0; i < 60; i++) {
    await tab()
    await sleep(120)
    const r = await ev(`(() => {
      const a = document.activeElement
      if (!a?.matches('.px-mark, .px-area, .px-continent, .px-fig') || a.classList.contains('is-far')) return null
      const b = a.getBoundingClientRect()
      const x = b.left + b.width / 2, y = b.top + b.height / 2
      return ['.pixel-head', '.px-panel', '.pixel-zoom', '.px-legend'].some((q) => { const r = document.querySelector(q)?.getBoundingClientRect(); return r && x > r.left && x < r.right && y > r.top && y < r.bottom })
    })()`)
    if (r === null) continue
    seen++
    if (r) hidden++
  }
  await sleep(500)
  check(seen > 10 && hidden === 0, `초점을 받은 기호 ${seen} 가운데 머리말·패널 밑에 남은 것 ${hidden}`)
} finally {
  await chrome.close()
}
if (problems.length) {
  console.log(`문제 ${problems.length}개`)
  process.exit(1)
}
console.log('통과')
