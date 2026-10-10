// 주 스레드 쪽 클라이언트 — 캔버스의 그리기 권한과 소리 출력의 핸들을 Worker 로 넘기고, VeilBind RPC 로 화면 크기와 입력을 전한다.
import { createWasmClient, type GeneratedWasmClient } from './generated/game.generated'
import type { ClientBootstrap } from './worker-adapter'

export type EngineClient = GeneratedWasmClient

const WASM_URL = `${import.meta.env.BASE_URL}wasm/game-client.wasm`

/**
 * 게임을 띄운다. 캔버스와 소리 출력의 핸들(audio — 없으면 소리 없이 뜬다)은 이 호출 뒤로 Worker 것이다 (주 스레드에서 다시 그리거나 또 넘길 수 없다).
 * 다 쓰면 terminate() 로 Worker 를 내린다
 */
export async function startEngine(canvas: HTMLCanvasElement, audio?: MessagePort): Promise<EngineClient> {
  // 프로덕션은 서명된 session-plan provider 가 있어야 한다 (VeilBind README 7) — 아직 그 백엔드가 없다
  if (!import.meta.env.DEV) throw new Error('게임은 지금 개발 서버(pnpm dev)에서만 뜬다 — 프로덕션은 VeilBind provider 가 필요하다')
  const offscreen = canvas.transferControlToOffscreen()
  const bootstrap: ClientBootstrap = { canvas: offscreen, audio }
  return createWasmClient({
    wasm: WASM_URL,
    development: true,
    addressWidth: 64,
    bootstrap: { value: bootstrap, transfer: audio ? [offscreen, audio] : [offscreen] },
  })
}
