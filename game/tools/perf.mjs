// 게임 성능 측정 — 실제 GPU 로 도는 Chrome 에서 /game/ 을 열어 정해진 입력 대본을 돌리고, 게임이 내는 성능 로그([perf] — F3 의 성능 표시와 같은 숫자)를 모아 표로 낸다.
//   pnpm dev 뒤: node game/tools/perf.mjs [--base http://localhost:5173] [--sizes 1280x720,1920x1080,3440x1440] [--seconds 8]
//                                          [--dpr 1] [--window] [--shots <폴더>] [--json <파일>] [--label <이름>] [--only start] [--tour]
// 대본: 메뉴 → 혼자 하기 → 시작 방(가만히 2 초 · 둘러보기·걷기·대시·발사 N 초) → 문을 찾아 포털을 넘는다 → 전투방 N 초(둘러보며 쏘고 옆걸음).
// 판의 시드는 시작할 때마다 달라 방의 틀과 문이 그때그때 다르다 — 같은 방을 다시 재는 대신 여러 번 돌려 본다 (틀은 넷뿐이다).
// 프레임 간격은 게임(Worker)이 제 프레임 콜백에서 잰 것, GPU 시간은 timestamp-query 로 잰 패스의 시간이다. 창 하나(1 초)마다의 요약을 모은 것이라
// 구간의 p50·p95 는 창들의 가운데 값, p99 는 가장 나쁜 창의 값, 최대와 '넘김'(그 주사율의 한 프레임을 넘긴 프레임 수)은 정확한 값이다.
// --window 는 창을 띄워 잰다 (화면의 실제 갱신에 묶인다 — 창이 가려지면 프레임이 멈춘다). 기본은 headless 다: GPU 는 같은 것을 쓰고 화면에 내보내는 일만 없다.
// --shots 를 주면 크기마다 시작 방의 첫 시점(움직이기 전 — 늘 같은 자리, 같은 쪽)과 전투방을 찍는다 (화질을 전후로 견줄 때).
// --tour 는 대본을 바꾼다: 게임이 시작되면 틀 둘러보기(F6 — app/client/main.cpp 의 tour_floor)를 열어 방 틀을 차례로 지나며 틀마다 찍는다 (--shots 와 함께 — 방의 생김새와 빛을 눈으로 볼 때).
// 걸음은 시간으로 잰다 (문에서 문까지 곧게 — 걷는 빠르기 6 m/s): 틀의 문 자리와 방 가운데가 바뀌면 이 대본도 고친다.
import fs from 'node:fs'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { launchChrome } from '../../scripts/qa/chrome.mjs'
import { waitForState } from './perf-events.mjs'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : fallback
}
const flag = (name) => process.argv.includes(`--${name}`)
const BASE = arg('base', 'http://localhost:5173')
const SIZES = arg('sizes', '1280x720,1920x1080,3440x1440')
  .split(',')
  .map((s) => s.split('x').map(Number))
const SECONDS = Number(arg('seconds', '8'))
const DPR = Number(arg('dpr', '1'))
const SHOTS = arg('shots', null)
const JSON_OUT = arg('json', null)
const LABEL = arg('label', '')
const ONLY = arg('only', null)
const TOUR = flag('tour')
const WINDOW = flag('window')
const TRACE = flag('trace')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
/** game/gameplay/presentation/menu.hpp 의 Screen */
const SCREEN_PLAYING = 1

const KEYS = {
  F3: { code: 'F3', key: 'F3', vk: 114 },
  F6: { code: 'F6', key: 'F6', vk: 117 },
  Enter: { code: 'Enter', key: 'Enter', vk: 13 },
  KeyW: { code: 'KeyW', key: 'w', vk: 87 },
  KeyA: { code: 'KeyA', key: 'a', vk: 65 },
  KeyS: { code: 'KeyS', key: 's', vk: 83 },
  KeyD: { code: 'KeyD', key: 'd', vk: 68 },
  ShiftLeft: { code: 'ShiftLeft', key: 'Shift', vk: 16 },
  Space: { code: 'Space', key: ' ', vk: 32 },
}

/** "[perf] a=1 b=2x3" → { a: 1, b: '2x3' } */
function parsePerf(line) {
  const out = {}
  for (const pair of line.replace('[perf] ', '').split(' ')) {
    const [name, value] = pair.split('=')
    out[name] = Number.isNaN(Number(value)) ? value : Number(value)
  }
  return out
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : NaN
}
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN)
const max = (values) => (values.length ? Math.max(...values) : NaN)

/** 한 구간에 모인 창들을 한 줄로 */
function summarize(name, windows) {
  const frames = windows.reduce((n, w) => n + w.frames, 0)
  const span = windows.reduce((n, w) => n + w.span, 0)
  const last = windows.at(-1) ?? {}
  return {
    phase: name,
    windows: windows.length,
    fps: span ? (frames * 1000) / span : NaN,
    p50: median(windows.map((w) => w.p50)),
    p95: median(windows.map((w) => w.p95)),
    p99: max(windows.map((w) => w.p99)),
    max: max(windows.map((w) => w.max)),
    over120: windows.reduce((n, w) => n + w.over120, 0),
    over60: windows.reduce((n, w) => n + w.over60, 0),
    over30: windows.reduce((n, w) => n + w.over30, 0),
    frames,
    gpu: mean(windows.filter((w) => w.gpun).map((w) => w.gpu)),
    gpuscene: mean(windows.filter((w) => w.gpun).map((w) => w.gpuscene)),
    gpumax: max(windows.filter((w) => w.gpun).map((w) => w.gpumax)),
    cpu: mean(windows.map((w) => w.cpu)),
    cpumax: max(windows.map((w) => w.cpumax)),
    tick: mean(windows.map((w) => w.tick)),
    sound: mean(windows.map((w) => w.sound)),
    soundmax: max(windows.map((w) => w.soundmax)),
    assetsmax: max(windows.map((w) => w.assetsmax)),
    scene: mean(windows.map((w) => w.scene)),
    hud: mean(windows.map((w) => w.hud)),
    submit: mean(windows.map((w) => w.submit)),
    draws: last.draws,
    tris: last.tris,
    surface: last.surface,
    render: last.render,
    // 구간 동안 프레임 예산이 고른 배율의 범위와, 끝날 때의 다중 표본·화면 갱신 몇 번에 한 프레임인가
    scaleMin: Math.min(...windows.map((w) => w.scale)),
    scaleMax: max(windows.map((w) => w.scale)),
    msaa: last.msaa,
    div: last.div,
    refresh: last.refresh,
    enemies: max(windows.map((w) => w.enemies)),
  }
}

async function measure(chrome, width, height) {
  const { sessionId, targetId } = await chrome.newPage(null, { w: width, h: height, scale: DPR })
  const windows = []
  const errors = []
  const events = new EventEmitter()
  const sessions = new Set([sessionId])
  let ready = false
  let assets = 'loading'
  const wait = (predicate, timeout, message) => waitForState(events, predicate, timeout, message)
  const off = chrome.on((m) => {
    // Worker(게임)의 콘솔도 듣는다
    if (m.method === 'Target.attachedToTarget' && sessions.has(m.sessionId)) {
      sessions.add(m.params.sessionId)
      chrome.send('Runtime.enable', {}, m.params.sessionId).catch(() => {})
    }
    if (m.method !== 'Runtime.consoleAPICalled' || !sessions.has(m.sessionId)) return
    const text = m.params.args.map((a) => a.value ?? a.description ?? '').join(' ')
    if (text.startsWith('[perf] ')) windows.push({ ...parsePerf(text), at: Date.now() })
    else if (text === '[app] 클라이언트 시작 — WebGPU / OffscreenCanvas') ready = true
    else if (text === '[game] assets ready') assets = 'ready'
    else if (text === '[game] assets failed') assets = 'failed'
    else if (m.params.type === 'error') errors.push(text)
    events.emit('change')
  })
  const evalJs = async (expression) => {
    const r = await chrome.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId)
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text)
    return r.result.value
  }
  const keyDown = (name) => chrome.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: KEYS[name].code, key: KEYS[name].key, windowsVirtualKeyCode: KEYS[name].vk }, sessionId)
  const keyUp = (name) => chrome.send('Input.dispatchKeyEvent', { type: 'keyUp', code: KEYS[name].code, key: KEYS[name].key, windowsVirtualKeyCode: KEYS[name].vk }, sessionId)
  const tap = async (name) => {
    await keyDown(name)
    await keyUp(name)
  }
  const hold = async (name, ms) => {
    await keyDown(name)
    await sleep(ms)
    await keyUp(name)
  }
  const fire = async () => {
    const at = { x: width / 2, y: height / 2, button: 'left', clickCount: 1 }
    await chrome.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...at }, sessionId)
    await chrome.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at }, sessionId)
  }
  // 포인터가 잡힌 동안의 마우스 — 호스트는 움직인 양(movementX·Y)만 본다. steps 번에 나눠 dx·dy 만큼
  // 움직인 양은 정수 픽셀이다 — 걸음마다 반올림하되 합이 정확히 dx·dy 가 되게 나눈다 (대본이 눈을 제자리로 돌려놓을 수 있게)
  const look = async (dx, dy, ms, steps = Math.max(1, Math.round(ms / 16))) => {
    for (let i = 0; i < steps; i++) {
      const stepX = Math.round((dx * (i + 1)) / steps) - Math.round((dx * i) / steps)
      const stepY = Math.round((dy * (i + 1)) / steps) - Math.round((dy * i) / steps)
      await evalJs(`document.dispatchEvent(new MouseEvent('mousemove', { movementX: ${stepX}, movementY: ${stepY} })), 0`)
      await sleep(ms / steps)
    }
  }
  const shot = async (name) => {
    if (!SHOTS) return
    fs.mkdirSync(SHOTS, { recursive: true })
    const r = await chrome.send('Page.captureScreenshot', { format: 'png' }, sessionId)
    fs.writeFileSync(path.join(SHOTS, `${LABEL ? `${LABEL}-` : ''}${width}x${height}-${name}.png`), Buffer.from(r.data, 'base64'))
  }
  const state = () => windows.at(-1) ?? {}
  /** fn 을 돌리는 동안 닫힌 창들 (첫 창은 앞 구간과 걸쳐 있어 버린다) */
  const during = async (fn) => {
    const from = windows.length
    await fn()
    const completed = windows.length
    await wait(() => windows.length > completed, 3000, '측정 구간 뒤의 성능 창이 닫히지 않았다')
    return windows.slice(from + 1)
  }

  const phases = []
  let failure = null
  try {
    await chrome.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true }, sessionId)
    await chrome.send('Page.navigate', { url: `${BASE}/game/` }, sessionId)
    // GPU 초기화가 실제로 끝난 통지 뒤에 성능 표시를 한 번 켠다
    await wait(() => ready, 20000, '게임 클라이언트의 시작 통지가 오지 않았다')
    await tap('F3')
    await wait(() => windows.length > 0, 3000, '게임이 성능 로그를 내지 않는다 (F3 가 닿지 않았다)')
    phases.push(summarize('menu', await during(() => sleep(2000))))
    // 에셋을 다 받아 푼 통지 뒤에 메뉴(혼자 하기) → 시작을 한 번씩 누른다
    await wait(() => assets !== 'loading', 20000, '게임 에셋의 완료 통지가 오지 않았다')
    if (assets === 'failed') throw new Error('게임 에셋을 받거나 풀지 못했다')
    await tap('Enter')
    await tap('Enter')
    await wait(() => state().screen === SCREEN_PLAYING, 3000, '게임이 시작되지 않았다 (메뉴가 바뀌었거나 포인터 잠금이 실패했다)')
    await sleep(1500)
    await shot('start')
    phases.push(summarize('start-still', await during(() => sleep(2000))))
    phases.push(
      summarize(
        'start',
        await during(async () => {
          const until = Date.now() + SECONDS * 1000
          // 걷기와 대시는 처음 보던 쪽(북)을 볼 때만 — 문을 찾는 걸음이 방 가운데 줄에서 시작하게 옆으로는 같은 만큼 오간다
          while (Date.now() < until) {
            await look(900, 0, 700)
            await fire()
            await look(-1800, 60, 1000)
            await fire()
            await look(900, -60, 700)
            await hold('KeyD', 400)
            await hold('KeyA', 400)
            await keyDown('KeyW')
            await tap('ShiftLeft')
            await sleep(300)
            await keyUp('KeyW')
            await tap('Space')
            await hold('KeyS', 500)
          }
        }),
      ),
    )
    if (TOUR) {
      // 틀 둘러보기 — 정해 둔 층을 문에서 문으로 곧게 걷는다. 마우스 714 px 이 90 도다 (감도 0.0022 rad/px)
      const QUARTER = 714
      const turn = (quarters) => look(QUARTER * quarters, 0, 300)
      const pitch = (px) => look(0, px, 150)
      // 방 가운데에서 문까지 15.7 m (2.6 초 남짓), 포털을 넘는 0.4 초, 문 안쪽 2.5 m 에서 가운데까지 13.5 m (2.25 초) — 가속하는 0.13 초를 얹는다
      const throughDoor = () => hold('KeyW', 2700 + 400 + 2250)
      // 걸음의 오차가 방마다 쌓이지 않게, 꺾이는 방에서는 벽(막힌 문)에 닿을 때까지 걸은 뒤 잰 만큼 물러선다: n 틱을 걷고 손을 떼면 0.1n − 0.327 + 0.45 m
      const back = (meters) => hold('KeyS', ((meters - 0.123) / 0.1) * (1000 / 60))
      const view = async (name, quarters = 0, up = 0) => {
        if (quarters) await turn(quarters)
        if (up) await pitch(-up)
        await sleep(500)
        await shot(`tour-${name}`)
        if (up) await pitch(up)
        if (quarters) await turn(-quarters)
      }
      await tap('F6')
      await sleep(1500)
      // 시작 방 — 북쪽을 보고 선다. 문은 동쪽
      await view('0-start-north')
      await view('0-start-up', 0.5, 260)
      await turn(1)
      await view('0-start-east')
      await throughDoor()
      // 정사각 홀 (한 번 돌린 것) — 동쪽을 보고 가운데에 선다
      await view('1-hall-east')
      await view('1-hall-southwest', 1.5)
      await view('1-hall-north', -1)
      await throughDoor()
      // 긴 홀 (동서로 누웠다)
      await view('2-nave-east')
      await view('2-nave-back', 2.2)
      // ㄱ 자 (서쪽 팔과 남쪽 팔) — 서쪽 문에서 들어와 모퉁이의 동쪽 벽(x 5.5 에서 막힌다)까지 걷고 가운데로 물러선다
      await hold('KeyW', 2700 + 400 + 2250 + 1500)
      await back(5.5)
      await view('3-ell-south', 1)
      await view('3-ell-west', 2)
      await view('3-ell-corner', 1.5, 120)
      await turn(1)
      await throughDoor()
      // 십자 — 북쪽 문에서 들어와 가운데의 단 위에 선다 (남쪽을 본다)
      await view('4-cross-south')
      await view('4-cross-east', -1)
      await view('4-cross-northwest', 1.5)
      // T 자 (가로대가 남북으로, 다리가 서쪽으로) — 북쪽 문에서 들어와 남쪽 끝의 막음돌(z 15.85 에서 막힌다)까지 걷고 갈림목으로 물러선다
      await hold('KeyW', 2700 + 400 + 5200)
      await view('5-tee-sealed')
      await back(15.85)
      await view('5-tee-south')
      await view('5-tee-west', 1)
      await turn(1)
      // 적이 있는 정사각 홀 — 동쪽 문 안쪽에 서서 다가오는 적을 본다
      await hold('KeyW', 2700 + 400 + 600)
      await sleep(900)
      await shot('tour-6-combat')
      await sleep(1500)
      await shot('tour-6-combat-near')
      phases.push(summarize('tour', await during(() => sleep(1500))))
    } else if (ONLY !== 'start') {
      // 문을 찾는다 — 처음 보던 쪽(북)을 그대로 보며 네 쪽으로 걸어 본다. 방이 바뀌면 포털을 넘은 것이다
      const room = state().room
      const moved = () => state().room !== room
      const from = windows.length
      const walk = async (name, ms) => {
        if (moved()) return
        await keyDown(name)
        try {
          await wait(moved, ms, '걸음의 시간이 끝났다')
        } catch (error) {
          if (error.message !== '걸음의 시간이 끝났다') throw error
        } finally {
          await keyUp(name)
        }
      }
      // 둘러보느라 돌아간 눈은 대본이 제자리로 돌려놓았다 (합이 0)
      // 북쪽 벽까지, 남쪽 벽까지, 다시 가운데로(벽에서 16 m — 걷는 빠르기 6 m/s), 동쪽 벽까지, 서쪽 벽까지
      await walk('KeyW', 4500)
      await walk('KeyS', 8000)
      await walk('KeyW', 2600)
      await walk('KeyD', 4500)
      await walk('KeyA', 8000)
      await sleep(1200)
      phases.push(summarize('transit', windows.slice(from + 1)))
      if (!moved()) {
        await shot('lost')
        throw new Error('문을 찾지 못했다 (대본의 걸음이 막혔다) — 다시 돌려 본다')
      }
      await shot('combat')
      phases.push(
        summarize(
          'combat',
          await during(async () => {
            const until = Date.now() + SECONDS * 1000
            while (Date.now() < until && state().screen === SCREEN_PLAYING) {
              await look(700, 0, 500)
              await fire()
              await hold('KeyA', 300)
              await look(-1400, 0, 800)
              await fire()
              await tap('ShiftLeft')
              await look(700, 0, 500)
              await fire()
              await hold('KeyD', 300)
            }
          }),
        ),
      )
      await shot('combat-end')
    }
  } catch (error) {
    // 잰 데까지는 낸다
    failure = error.message
  } finally {
    off()
    await chrome.send('Target.closeTarget', { targetId }).catch(() => {})
  }
  return { size: `${width}x${height}`, phases, errors, failure, windows }
}

const n = (value, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : '–')
function print(result) {
  console.log(`\n### ${result.size}${DPR !== 1 ? ` (dpr ${DPR})` : ''}${LABEL ? ` — ${LABEL}` : ''}`)
  console.log('| 구간 | fps | 간격 p50 | p95 | p99 | 최대 | 넘김 120/60/30 Hz (프레임 수) | GPU ms (장면, 최대) | CPU ms (최대) | 소리 (최대) | 그리기 | 삼각형 | 장면 해상도 (배율 최소–최대, 다중 표본, 갱신÷) | 적 |')
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
  for (const p of result.phases)
    console.log(
      `| ${p.phase} | ${n(p.fps, 0)} | ${n(p.p50)} | ${n(p.p95)} | ${n(p.p99)} | ${n(p.max)} | ${p.over120}/${p.over60}/${p.over30} (${p.frames}) | ${n(p.gpu)} (${n(p.gpuscene)}, ${n(p.gpumax)}) | ${n(p.cpu, 2)} (${n(p.cpumax)}) | ${n(p.sound, 2)} (${n(p.soundmax)}) | ${p.draws ?? '–'} | ${p.tris ?? '–'} | ${p.render ?? '–'} (${n(p.scaleMin, 2)}–${n(p.scaleMax, 2)}, ${p.msaa ? '4×' : '없음'}, ÷${p.div ?? 1}) | ${p.enemies ?? '–'} |`,
    )
  // --trace: 창(1 초)마다 한 줄 — 프레임 예산이 언제 무엇을 골랐는지
  if (TRACE) for (const w of result.windows) console.log(`  ${w.render} x${w.scale} ÷${w.div} msaa${w.msaa} | ${w.frames}f p50 ${w.p50} p95 ${w.p95} max ${w.max} | 넘김 ${w.over120}/${w.over60} | gpu ${w.gpu} (${w.gpumax}) | refresh ${w.refresh}`)
  for (const error of new Set(result.errors)) console.log(`오류 로그: ${error}`)
  if (result.failure) console.log(`끝까지 재지 못했다: ${result.failure}`)
}

const [firstWidth, firstHeight] = SIZES[0]
const chrome = await launchChrome({ width: WINDOW ? Math.max(...SIZES.map((s) => s[0])) : firstWidth, height: WINDOW ? Math.max(...SIZES.map((s) => s[1])) : firstHeight, headless: !WINDOW })
const results = []
let failed = false
try {
  const info = await chrome.send('SystemInfo.getInfo').catch(() => null)
  const gpu = info?.gpu?.devices?.[0]
  console.log(`Chrome: ${chrome.path} (${WINDOW ? '창' : 'headless'}) · GPU: ${gpu ? `${gpu.vendorString} ${gpu.deviceString}` : '알 수 없음'} · 구간마다 ${SECONDS} 초`)
  for (const [width, height] of SIZES) {
    try {
      const result = await measure(chrome, width, height)
      results.push(result)
      print(result)
      failed ||= Boolean(result.failure)
    } catch (error) {
      failed = true
      console.error(`${width}x${height}: ${error.message}`)
    }
  }
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ label: LABEL, dpr: DPR, window: WINDOW, seconds: SECONDS, results }, null, 2))
} finally {
  await chrome.close()
}
process.exit(failed ? 1 : 0)
