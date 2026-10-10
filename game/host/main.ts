// 게임의 호스트 — 브라우저와 게임(Worker 안의 C++) 사이의 배선만 한다.
// 캔버스를 만들어 넘기고, 화면 크기와 원시 입력(포인터의 자리와 움직인 픽셀, 누르고 뗀 버튼·글쇠, 휠, 포인터가 잡혔는지)을 전한다.
// 소리도 같다: 출력에 이어진 핸들을 캔버스와 함께 넘기고, 출력이 도는지와 그 표본율·지연만 알린다.
// 저장도 같다: 게임이 적어 준 옵션의 글을 뜻을 모르는 채 localStorage 한 키에 간직했다가, 다음에 띄울 때 그대로 돌려준다.
// 게임 화면의 어떤 요소도 여기서 그리지 않고, 입력의 뜻도 여기서 정하지 않고, 소리를 섞지도 고르지도 않는다 — 모두 game/ 의 C++ 가 한다.
import { openAudioOut } from './audio-out'
import { latest, mergeMove, replace, type PointerMove } from './coalesce'
import { startEngine } from './engine-client'

/** game/gameplay/input/controls.hpp 의 HOST_CAPTURE_POINTER — 게임이 포인터를 잡아 달라고 했다 */
const HOST_CAPTURE_POINTER = 1
/** 같은 곳의 HOST_RESUME_AUDIO — 소리 출력을 켜 달라고 했다 */
const HOST_RESUME_AUDIO = 2
/** 같은 곳의 HOST_SAVE_OPTIONS — 저장할 글(옵션)이 바뀌었으니 받아 가 간직해 달라고 했다 */
const HOST_SAVE_OPTIONS = 4
/** 게임이 적은 옵션의 글을 간직하는 자리 — 글의 형식과 뜻은 게임만 안다 */
const OPTIONS_KEY = 'zk-game-options'
/** game/engine/hud/interaction.hpp 의 KEY_* — 글쇠와 함께 눌린 보조 글쇠 */
const KEY_SHIFT = 1
const KEY_CTRL = 2
const KEY_ALT = 4
const KEY_META = 8

const canvas = document.createElement('canvas')
document.body.append(canvas)
let sound: Awaited<ReturnType<typeof openAudioOut>> = null

try {
  sound = await openAudioOut()
  const client = await startEngine(canvas, sound?.port)
  const { surface, input, audio, options } = client.api

  // 게임이 앞의 것을 처리하는 동안 생긴 원시 입력은 줄 세우지 않고 하나로 합쳐 둔다 (coalesce.ts) — 실패는 까닭만 남긴다
  const failed = (error: unknown) => console.error('게임에 입력을 전하지 못했다', error)

  // 소리 출력의 상태 — 바뀌었을 때만 알린다. 지연(outputLatency)은 출력이 돌기 시작한 순간에는 0 이고 조금 뒤에야 정해지며 그 뒤로도 바뀔 수 있어,
  // 화면 프레임(포인터 이동을 보낼 때)과 버튼·글쇠마다 다시 본다 — 값이 같으면 아무것도 보내지 않는다
  const audioState = latest((s: { running: boolean; rate: number; base: number; output: number }) => audio.state(s.running, s.rate, s.base, s.output), replace, failed)
  let sentAudio = ''
  const reportAudio = () => {
    if (!sound) return
    const { state, sampleRate, baseLatency, outputLatency } = sound.context
    const report = `${state} ${sampleRate} ${baseLatency} ${outputLatency}`
    if (report === sentAudio) return
    sentAudio = report
    audioState.push({ running: state === 'running', rate: sampleRate, base: baseLatency || 0, output: outputLatency || 0 })
  }
  sound?.context.addEventListener('statechange', reportAudio)
  reportAudio()

  // 간직해 둔 옵션의 글을 그대로 돌려준다 — 읽고 믿을지는 게임이 정한다. 간직할 곳이 막혀 있으면(시크릿 창) 넘기지 않는다: 게임은 기본값으로 뜬다
  try {
    const kept = localStorage.getItem(OPTIONS_KEY)
    if (kept !== null) void options.load(kept).catch(failed)
  } catch {
    // localStorage 를 쓸 수 없다 — 저장 없이 돈다
  }
  // 게임이 저장해 달라고 하면 지금의 글을 받아 와 그대로 넣는다 — 받아 오는 동안 또 달라고 하면 하나로 합친다 (끝난 뒤 한 번 더)
  const keepOptions = latest(
    async () => {
      const text = await options.text()
      try {
        localStorage.setItem(OPTIONS_KEY, text)
      } catch {
        // 간직하지 못했다 — 새로 띄우면 기본값이다
      }
    },
    replace<void>,
    failed,
  )

  const surfaceSize = latest((size: { width: number; height: number }) => surface.resize(size.width, size.height), replace, failed)
  let sentSize = ''
  const resize = () => {
    const scale = window.devicePixelRatio || 1
    const width = Math.max(1, Math.round(canvas.clientWidth * scale))
    const height = Math.max(1, Math.round(canvas.clientHeight * scale))
    const size = `${width}x${height}`
    if (size === sentSize) return
    sentSize = size
    surfaceSize.push({ width, height })
  }
  new ResizeObserver(resize).observe(canvas)
  resize()

  /** 게임이 입력의 답으로 해 달라고 한 일을 한다 */
  const follow = (request: number) => {
    // 포인터 잠금은 사용자 동작에 이어서만 걸 수 있다 — 방금의 클릭·글쇠가 그 동작이다
    if (request & HOST_CAPTURE_POINTER && document.pointerLockElement !== canvas) void canvas.requestPointerLock()
    // 소리는 사용자가 무언가 누른 뒤에야 켤 수 있다 — 켜지면 statechange 가 게임에 알린다
    if (request & HOST_RESUME_AUDIO && sound) {
      if (sound.context.state === 'suspended') void sound.context.resume()
      reportAudio()
    }
    if (request & HOST_SAVE_OPTIONS) keepOptions.push()
  }

  // 포인터 이동은 화면 프레임마다 한 번으로 모아 보낸다 — 이벤트마다 RPC 를 부르지 않는다.
  // 게임이 앞의 이동을 아직 처리하고 있으면 그것도 보내지 않고 합쳐 둔다 (자리는 최신, 움직인 양은 합)
  const pointerMove = latest((m: PointerMove) => input.pointerMove(m.x, m.y, m.deltaX, m.deltaY), mergeMove, failed)
  let pointerX = 0
  let pointerY = 0
  let moveX = 0
  let moveY = 0
  let flush = 0
  const sendMove = () => {
    cancelAnimationFrame(flush)
    flush = 0
    reportAudio()
    pointerMove.push({ x: pointerX, y: pointerY, deltaX: moveX, deltaY: moveY })
    moveX = 0
    moveY = 0
  }
  const track = (e: MouseEvent) => {
    // 자리는 그리는 버퍼의 픽셀로 (surface.resize 와 같은 눈금)
    const bounds = canvas.getBoundingClientRect()
    const scale = window.devicePixelRatio || 1
    pointerX = (e.clientX - bounds.left) * scale
    pointerY = (e.clientY - bounds.top) * scale
  }
  document.addEventListener('mousemove', (e) => {
    track(e)
    moveX += e.movementX
    moveY += e.movementY
    flush ||= requestAnimationFrame(sendMove)
  })
  // 버튼은 그 사건의 자리를 먼저 알리고 보낸다 — 모아 둔 이동보다 앞서지 않고, 움직임 없이 온 누름(터치·합성 사건)도 제자리에 닿는다
  // 박자에 묶이는 입력에는 그 사건이 일어난 시각을 찍어 보낸다 (1970 년부터의 ms — Worker 의 시계로 옮길 수 있는 원시 값). 판정은 게임이 한다
  const stamp = (e: Event) => performance.timeOrigin + e.timeStamp
  const button = (send: (e: MouseEvent) => Promise<number>) => (e: MouseEvent) => {
    track(e)
    sendMove()
    // 합쳐 둔 이동이 있으면 이 버튼보다 먼저 닿게 지금 보낸다
    pointerMove.flush()
    void send(e).then(follow)
  }
  document.documentElement.addEventListener('mouseleave', () => void input.pointerInside(false))
  canvas.addEventListener('mousedown', button((e) => input.pointerPress(e.button, stamp(e))))
  window.addEventListener('mouseup', button((e) => input.pointerRelease(e.button)))
  // 휠도 합쳐 둔다 — 굴린 양은 더한다 (단위가 바뀌면 앞의 것을 먼저 보낸다)
  const wheel = latest((w: { deltaY: number; mode: number }) => input.wheel(w.deltaY, w.mode), (waiting, next) => ({ deltaY: waiting.deltaY + next.deltaY, mode: next.mode }), failed)
  let wheelMode = 0
  canvas.addEventListener(
    'wheel',
    (e) => {
      if (e.deltaMode !== wheelMode) wheel.flush()
      wheelMode = e.deltaMode
      wheel.push({ deltaY: e.deltaY, mode: e.deltaMode })
    },
    { passive: true },
  )
  // 글쇠는 브라우저가 준 그대로 넘긴다 — 어느 글쇠가 무슨 뜻인지(이동, 포커스, 글자 입력)는 게임이 정한다
  const key = (pressed: boolean) => (e: KeyboardEvent) => {
    const modifiers = (e.shiftKey ? KEY_SHIFT : 0) | (e.ctrlKey ? KEY_CTRL : 0) | (e.altKey ? KEY_ALT : 0) | (e.metaKey ? KEY_META : 0)
    // 화면 전체가 게임이다 — 브라우저 단축키(Ctrl·Meta 조합, F1–F12)가 아니면 글쇠는 게임만 받는다 (Tab 이 캔버스 밖으로 나가지 않는다)
    if (!e.ctrlKey && !e.metaKey && !/^F\d+$/.test(e.code)) e.preventDefault()
    reportAudio()
    void input.key(e.code, e.key, modifiers, pressed, e.repeat, stamp(e)).then(follow)
  }
  document.addEventListener('keydown', key(true))
  document.addEventListener('keyup', key(false))
  document.addEventListener('pointerlockchange', () => void input.pointerCapture(document.pointerLockElement === canvas))
  window.addEventListener('pagehide', () => {
    client.terminate()
    void sound?.context.close()
  })
} catch (error) {
  void sound?.context.close().catch(() => {})
  // 게임이 뜨지 못하면 게임이 그릴 화면도 없다 — 까닭만 글로 남긴다
  console.error('게임을 시작하지 못했다', error)
  canvas.remove()
  const notice = document.createElement('p')
  notice.role = 'alert'
  notice.textContent = error instanceof Error ? error.message : String(error)
  document.body.append(notice)
}
