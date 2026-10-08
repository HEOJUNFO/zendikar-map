// 지도 스크린샷 — 주소마다 PNG 하나. pnpm dev 뒤:
//   node scripts/qa/shots.mjs <출력 폴더> <이름>=<주소 뒤쪽> ... [--w 1440 --h 900 --wait 3000 --mobile]
// 예) node scripts/qa/shots.mjs /tmp/shots malakir='?phase=1&view=1907,1096,60'
import fs from 'node:fs'
import path from 'node:path'
import { launchChrome } from './chrome.mjs'

const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  if (i < 0) return fallback
  const v = argv[i + 1]
  argv.splice(i, v === undefined || v.startsWith('--') ? 1 : 2)
  return v === undefined || v.startsWith('--') ? true : v
}
const W = Number(flag('w', 1440))
const H = Number(flag('h', 900))
const WAIT = Number(flag('wait', 3000))
const mobile = Boolean(flag('mobile', false))
const BASE = flag('base', 'http://localhost:5173')
const [outDir, ...shots] = argv
if (!outDir || !shots.length) {
  console.error('사용법: node scripts/qa/shots.mjs <출력 폴더> <이름>=<주소 뒤쪽> ...')
  process.exit(2)
}
fs.mkdirSync(outDir, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const chrome = await launchChrome({ width: W, height: H })
try {
  for (const shot of shots) {
    const eq = shot.indexOf('=')
    const name = shot.slice(0, eq)
    const tail = shot.slice(eq + 1)
    const { sessionId, targetId } = await chrome.newPage(`${BASE}/${tail}`, { mobile, w: W, h: H })
    const errors = []
    const off = chrome.on((m) => {
      if (m.sessionId !== sessionId) return
      if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text)
      if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning'))
        errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '))
    })
    await sleep(WAIT)
    const { data } = await chrome.send('Page.captureScreenshot', { format: 'png' }, sessionId)
    const file = path.join(outDir, `${name}.png`)
    fs.writeFileSync(file, Buffer.from(data, 'base64'))
    console.log(file + (errors.length ? `  ⚠ ${errors.slice(0, 3).join(' | ')}` : ''))
    off()
    await chrome.send('Target.closeTarget', { targetId })
  }
} finally {
  await chrome.close()
}
