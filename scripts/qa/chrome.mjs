// 측정·스크린샷용 headless Chrome 실행기. 스크립트에서 Chrome 을 직접 spawn 하지 말고 이것을 쓴다.
//
//   import { launchChrome } from '<repo>/scripts/qa/chrome.mjs'
//   const chrome = await launchChrome({ width: 1600, height: 1000 })
//   const { sessionId } = await chrome.newPage('http://localhost:5173/?phase=1')
//   await chrome.send('Runtime.evaluate', { expression: '1+1' }, sessionId)
//   await chrome.close()
//
// Chrome 이 남지 않게 세 겹으로 막는다.
// 1. --remote-debugging-pipe 로 node 와 파이프를 잇는다. node 가 어떻게 죽든(오류, Bash 타임아웃의
//    SIGKILL 포함) 파이프가 닫히면 Chrome 도 스스로 꺼진다.
// 2. 정상 종료·오류·SIGINT/SIGTERM/SIGHUP 에서 close() 를 부른다.
// 3. maxMinutes(기본 15분)가 지나면 멈춘 스크립트째로 끝낸다.
// 그래도 남은 것은 scripts/qa/reap-chrome.sh 가 치운다(Claude Code 훅이 세션 시작·턴 끝마다 실행).
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function launchChrome({ width = 1600, height = 1000, args = [], maxMinutes = 15 } = {}) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'zm-chrome.'))
  const proc = spawn(
    CHROME,
    [
      '--headless=new',
      '--remote-debugging-pipe',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
      `--window-size=${width},${height}`,
      ...args,
      'about:blank',
    ],
    // fd 3·4 는 --remote-debugging-pipe 의 생명줄. 쓰지 않아도 열어 두기만 하면 된다.
    { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] },
  )

  let ws
  let closed = false
  const close = async () => {
    if (closed) return
    closed = true
    process.off('exit', killNow)
    for (const s of SIGNALS) process.off(s, onSignal)
    clearTimeout(deadline)
    try {
      ws?.close()
    } catch {}
    if (proc.exitCode === null && proc.signalCode === null) {
      proc.kill('SIGTERM')
      await Promise.race([new Promise((r) => proc.once('exit', r)), sleep(3000)])
      if (proc.exitCode === null && proc.signalCode === null) proc.kill('SIGKILL')
    }
    fs.rmSync(profile, { recursive: true, force: true })
  }
  // 'exit' 에서는 동기 작업만 된다.
  const killNow = () => {
    try {
      proc.kill('SIGKILL')
    } catch {}
    fs.rmSync(profile, { recursive: true, force: true })
  }
  const SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP']
  const onSignal = (sig) => {
    close().finally(() => process.exit(128 + (os.constants.signals[sig] ?? 1)))
  }
  process.on('exit', killNow)
  for (const s of SIGNALS) process.once(s, onSignal)
  const deadline = setTimeout(() => {
    console.error(`[chrome] ${maxMinutes}분이 지나 Chrome 과 스크립트를 끝냅니다.`)
    close().finally(() => process.exit(124))
  }, maxMinutes * 60_000)
  deadline.unref()

  try {
    const portFile = path.join(profile, 'DevToolsActivePort')
    for (let i = 0; i < 150 && !fs.existsSync(portFile); i++) {
      if (proc.exitCode !== null) throw new Error(`Chrome 이 바로 꺼졌습니다 (exit ${proc.exitCode})`)
      await sleep(100)
    }
    await sleep(100)
    const [port, wsPath] = fs.readFileSync(portFile, 'utf8').trim().split('\n')
    ws = new WebSocket(`ws://127.0.0.1:${port}${wsPath}`)
    await new Promise((resolve, reject) => {
      ws.onopen = resolve
      ws.onerror = () => reject(new Error('CDP 웹소켓 연결 실패'))
    })
  } catch (e) {
    await close()
    throw e
  }

  let nextId = 1
  const pending = new Map()
  const listeners = new Set()
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.code})`))
      else resolve(msg.result)
    } else if (msg.method) {
      for (const fn of listeners) fn(msg)
    }
  }
  ws.onclose = () => {
    for (const { reject } of pending.values()) reject(new Error('CDP 연결이 끊겼습니다'))
    pending.clear()
  }

  /** CDP 명령. sessionId 를 주면 그 탭에 보낸다. */
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = nextId++
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
    })

  /** CDP 이벤트 구독. 해제 함수를 돌려준다. */
  const on = (fn) => {
    listeners.add(fn)
    return () => listeners.delete(fn)
  }

  /** 새 탭을 열어 붙고 url 로 이동한다. load 이벤트까지 기다린다. */
  const newPage = async (url, { mobile = false, w = width, h = height, scale = 1 } = {}) => {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
    await send('Page.enable', {}, sessionId)
    await send('Runtime.enable', {}, sessionId)
    await send(
      'Emulation.setDeviceMetricsOverride',
      { width: w, height: h, deviceScaleFactor: scale, mobile },
      sessionId,
    )
    if (url) {
      const loaded = new Promise((resolve) => {
        const off = on((m) => {
          if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') {
            off()
            resolve()
          }
        })
      })
      await send('Page.navigate', { url }, sessionId)
      await loaded
    }
    return { targetId, sessionId }
  }

  return { pid: proc.pid, profile, send, on, newPage, close }
}
