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
//
// Chrome 은 환경 변수 CHROME_PATH 가 가리키는 것, 없으면 플랫폼의 기본 자리에서 찾는다 (macOS·Windows·Linux — Windows 는 Chrome 이 없으면 Edge).
// Windows 에서는 reap-chrome.sh 가 프로세스를 보지 못한다(ps 가 다르다) — 그 몫(부모 잃은 Chrome, 묵은 프로필 폴더)은 launchChrome 이 뜰 때마다 여기서 치운다.
//
// 옵션: headless: false 면 창을 띄운다 (화면의 실제 주사율로 도는 프레임을 잴 때 — 창은 가려지거나 최소화되면 프레임이 멈춘다).
import { execFile, spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const WINDOWS = process.platform === 'win32'
const PROFILE_PREFIX = 'zm-chrome.'

/** 쓸 Chrome 의 실행 파일 — CHROME_PATH, 없으면 플랫폼의 기본 자리 가운데 처음 있는 것 */
export function findChrome() {
  const env = process.env
  const candidates = env.CHROME_PATH
    ? [env.CHROME_PATH]
    : process.platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
      : WINDOWS
        ? [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA]
            .filter(Boolean)
            .flatMap((root) => [path.join(root, 'Google/Chrome/Application/chrome.exe'), path.join(root, 'Microsoft/Edge/Application/msedge.exe')])
            // Chrome 이 Edge 보다 먼저
            .sort((a, b) => a.endsWith('msedge.exe') - b.endsWith('msedge.exe'))
        : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser']
  const found = candidates.find((file) => fs.existsSync(file))
  if (!found) throw new Error(`Chrome 을 찾지 못했습니다 (CHROME_PATH 로 알려 주세요). 찾아본 곳: ${candidates.join(', ')}`)
  return found
}

/**
 * Windows 에서 reap-chrome.sh 의 몫 — 이 실행기의 프로필(zm-chrome.*)로 떠 있는데 부모가 죽은 Chrome 을 끝내고,
 * 어느 프로세스도 쓰지 않는 10분 넘은 프로필 폴더를 지운다. 기다리지 않고 뒤에서 돈다 (실패해도 조용히 지나간다)
 */
function reapWindows() {
  const tmp = os.tmpdir()
  const script = `
    $all = Get-CimInstance Win32_Process
    $ids = @{}; foreach ($p in $all) { $ids[[int]$p.ProcessId] = $true }
    $mine = $all | Where-Object { $_.CommandLine -and $_.CommandLine.Contains('${PROFILE_PREFIX}') -and ($_.Name -eq 'chrome.exe' -or $_.Name -eq 'msedge.exe') }
    foreach ($p in $mine) { if ($p.CommandLine -notmatch '--type=' -and -not $ids.ContainsKey([int]$p.ParentProcessId)) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue } }
    $used = ($mine | ForEach-Object { $_.CommandLine }) -join ' '
    Get-ChildItem -LiteralPath $env:ZM_TMP -Directory -Filter '${PROFILE_PREFIX}*' -ErrorAction SilentlyContinue |
      Where-Object { $_.LastWriteTime -lt (Get-Date).AddMinutes(-10) -and -not $used.Contains($_.Name) } |
      ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }`
  const child = execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { env: { ...process.env, ZM_TMP: tmp }, windowsHide: true, timeout: 30_000 }, () => {})
  child.unref()
}

/** 프로필 폴더를 지운다 — Windows 는 막 끝난 Chrome 이 파일을 잠깐 더 쥐고 있어 몇 번 다시 해 본다. 그래도 남으면 다음 실행의 reapWindows 가 치운다 */
function removeProfile(profile) {
  try {
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: WINDOWS ? 10 : 0, retryDelay: 200 })
  } catch {}
}

export async function launchChrome({ width = 1600, height = 1000, args = [], maxMinutes = 15, headless = true } = {}) {
  const chromePath = findChrome()
  if (WINDOWS) reapWindows()
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), PROFILE_PREFIX))
  const proc = spawn(
    chromePath,
    [
      ...(headless ? ['--headless=new'] : ['--window-position=0,0']),
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
    const running = () => proc.exitCode === null && proc.signalCode === null
    const exited = new Promise((r) => proc.once('exit', r))
    // Windows 의 kill 은 곧바로 죽여 자식 프로세스와 잠긴 파일이 남기 쉽다 — 먼저 스스로 닫게 한다
    if (WINDOWS && running() && ws?.readyState === 1) {
      try {
        ws.send(JSON.stringify({ id: 0x7fffffff, method: 'Browser.close' }))
        await Promise.race([exited, sleep(3000)])
      } catch {}
    }
    try {
      ws?.close()
    } catch {}
    if (running()) {
      proc.kill('SIGTERM')
      await Promise.race([exited, sleep(3000)])
      if (running()) proc.kill('SIGKILL')
    }
    removeProfile(profile)
  }
  // 'exit' 에서는 동기 작업만 된다.
  const killNow = () => {
    try {
      proc.kill('SIGKILL')
    } catch {}
    try {
      fs.rmSync(profile, { recursive: true, force: true })
    } catch {}
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

  return { pid: proc.pid, profile, path: chromePath, send, on, newPage, close }
}
