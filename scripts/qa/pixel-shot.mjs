// 픽셀 지도(/pixel) 스크린샷 — 개발 서버(pnpm dev) 뒤.
//   node scripts/qa/pixel-shot.mjs <폴더> 이름='?view=x,y,k&time=t' … [--w 1440 --h 900 --mobile --wait 2500 --base http://localhost:5173]
// 타일이 다 올 때까지(빈칸 표시가 숨을 때까지) 기다린 뒤 찍는다
import fs from 'node:fs'
import path from 'node:path'
import { launchChrome } from './chrome.mjs'

const argv = process.argv.slice(2)
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d)
const dir = argv[0]
const W = Number(opt('w', 1440))
const H = Number(opt('h', 900))
const BASE = opt('base', 'http://localhost:5173')
const WAIT = Number(opt('wait', 2500))
const mobile = argv.includes('--mobile')
const shots = argv.filter((a) => a.includes('='))
fs.mkdirSync(dir, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const chrome = await launchChrome({ width: W, height: H })
try {
  const { sessionId: s } = await chrome.newPage(null, { w: W, h: H, scale: mobile ? 3 : 1, mobile })
  const ev = async (e) => (await chrome.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }, s)).result.value
  for (const a of shots) {
    const [name, q] = [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1).replace(/^'|'$/g, '')]
    await chrome.send('Page.navigate', { url: `${BASE}/pixel${q}` }, s)
    for (let i = 0; i < 120; i++) {
      await sleep(250)
      if (await ev(`!!document.querySelector('.pixel-canvas') && document.querySelectorAll('.px-mark').length > 0`)) break
    }
    await sleep(WAIT)
    const { data } = await chrome.send('Page.captureScreenshot', { format: 'png' }, s)
    const file = path.join(dir, `${name}.png`)
    fs.writeFileSync(file, Buffer.from(data, 'base64'))
    console.log(file)
  }
} finally {
  await chrome.close()
}
