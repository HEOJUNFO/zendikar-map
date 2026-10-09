// 게임의 호스트 — 브라우저와 게임(Worker 안의 C++) 사이의 배선만 한다.
// 캔버스를 만들어 넘기고, 화면 크기와 원시 입력(움직인 픽셀, 누른 버튼, 포인터가 잡혔는지)을 전한다.
// 게임 화면의 어떤 요소도 여기서 그리지 않고, 입력의 뜻도 여기서 정하지 않는다 — 모두 game/ 의 C++ 가 한다.
import { startEngine } from './engine-client'

/** game/gameplay/input/pointer_controls.hpp 의 HOST_CAPTURE_POINTER — 게임이 포인터를 잡아 달라고 했다 */
const HOST_CAPTURE_POINTER = 1

const canvas = document.createElement('canvas')
document.body.append(canvas)

try {
  const client = await startEngine(canvas)
  const { surface, input } = client.api

  let sentSize = ''
  const resize = () => {
    const scale = window.devicePixelRatio || 1
    const width = Math.max(1, Math.round(canvas.clientWidth * scale))
    const height = Math.max(1, Math.round(canvas.clientHeight * scale))
    const size = `${width}x${height}`
    if (size === sentSize) return
    sentSize = size
    void surface.resize(width, height)
  }
  new ResizeObserver(resize).observe(canvas)
  resize()

  // 포인터 이동은 화면 프레임마다 한 번으로 모아 보낸다 — 이벤트마다 RPC 를 부르지 않는다
  let moveX = 0
  let moveY = 0
  let flush = 0
  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== canvas) return
    moveX += e.movementX
    moveY += e.movementY
    if (flush) return
    flush = requestAnimationFrame(() => {
      flush = 0
      void input.pointerMove(moveX, moveY)
      moveX = 0
      moveY = 0
    })
  })
  canvas.addEventListener('mousedown', (e) => {
    void input.pointerPress(e.button).then((request) => {
      // 포인터 잠금은 사용자 동작에 이어서만 걸 수 있다 — 방금의 클릭이 그 동작이다
      if (request & HOST_CAPTURE_POINTER && document.pointerLockElement !== canvas) void canvas.requestPointerLock()
    })
  })
  document.addEventListener('pointerlockchange', () => void input.pointerCapture(document.pointerLockElement === canvas))
  window.addEventListener('pagehide', () => client.terminate())
} catch (error) {
  // 게임이 뜨지 못하면 게임이 그릴 화면도 없다 — 까닭만 글로 남긴다
  console.error('게임을 시작하지 못했다', error)
  canvas.remove()
  const notice = document.createElement('p')
  notice.role = 'alert'
  notice.textContent = error instanceof Error ? error.message : String(error)
  document.body.append(notice)
}
