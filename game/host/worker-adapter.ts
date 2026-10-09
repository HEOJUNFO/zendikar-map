// Worker 쪽 어댑터 — VeilBind 가 만든 Worker(generated/game.worker.generated.ts)가 이 파일을 불러 쓴다.
// Emscripten 모듈을 세우고, 주 스레드가 넘겨 준 OffscreenCanvas 와 소리 출력의 핸들을 클라이언트에 걸고, VeilBind 가 부를 다섯 export 를 내준다.
import {
  createEmscriptenRawRpcBoundary,
  type GeneratedWasmAdapterContext,
  type GeneratedWasmWorkerAdapter,
  type VeilWasmExports,
} from '@dentner-eng/veilbind/wasm'
import { policy } from './generated/game-client-policy.generated'
import createGameClientModule, { type GameClientModule } from './generated/game-client.mjs'

/** 주 스레드가 Worker 를 띄울 때 한 번 넘기는 것 (engine-client.ts 의 bootstrap) */
export interface ClientBootstrap {
  readonly canvas: OffscreenCanvas
  /** 소리 출력(오디오 스레드의 host/pcm-worklet.js)에 이어진 핸들 — 소리 출력을 열지 못했으면 없다 */
  readonly audio?: MessagePort
}

/** 엔진이 그릴 표면을 만들 때 찾는 이름 (engine/platform/frame_loop.hpp 의 CANVAS_TARGET) */
const CANVAS_TARGET = '#canvas'

let client: GameClientModule | undefined
let memory: WebAssembly.Memory | undefined
let booted = false

function dispose() {
  if (client && booted) client._app_shutdown()
  booted = false
  client = undefined
  memory = undefined
}

function runtime(): GameClientModule {
  if (!client) throw new Error('게임 클라이언트 런타임이 없다')
  return client
}

// VeilBind 가 q/z 를 부르기 전후로 스택을 지킨다 — Asyncify 는 쓰지 않는다
const rawRpcBoundary = createEmscriptenRawRpcBoundary({
  stackSave: () => runtime().stackSave(),
  stackRestore: (pointer) => runtime().stackRestore(pointer),
  canRestore: (pointer) => {
    if (!client || !memory) return false
    const address = BigInt(pointer)
    return address > 0n && address <= BigInt(memory.buffer.byteLength) && address % 16n === 0n
  },
  controlSignals: ['unwind'],
  terminate: dispose,
})

const adapter: GeneratedWasmWorkerAdapter<ClientBootstrap> = {
  policy,
  rawRpcBoundary,

  async instantiate(context: GeneratedWasmAdapterContext<ClientBootstrap>): Promise<VeilWasmExports> {
    let native: WebAssembly.Exports | undefined
    client = await createGameClientModule({
      // VeilBind 가 검증하고 컴파일해 둔 모듈로 인스턴스를 만든다 — Emscripten 이 WASM 을 따로 받지 않는다
      instantiateWasm(emscriptenImports, receiveInstance) {
        const imports: WebAssembly.Imports = { ...emscriptenImports }
        // x.r / x.e — 링크 때 넣은 자리 표시(tools/veilbind_host_imports.js)를 VeilBind 것으로 바꾼다
        for (const [name, bindings] of Object.entries(context.veilbindImports)) imports[name] = { ...imports[name], ...bindings }
        const instance = new WebAssembly.Instance(context.module, imports)
        native = instance.exports
        receiveInstance(instance, context.module)
        return instance.exports
      },
    })
    if (!native) throw new Error('게임 클라이언트 WASM 이 인스턴스화되지 않았다')
    const exports = native as unknown as Omit<VeilWasmExports, 'm'> & { memory: WebAssembly.Memory }
    memory = exports.memory
    // wasm64 — a/d/q/z 는 주소를 BigInt 로 주고받는다 (engine-client.ts 의 addressWidth: 64)
    return { m: exports.memory, a: exports.a, d: exports.d, q: exports.q, z: exports.z }
  },

  // 여기가 끝나야 RPC 가 열린다 — 넘겨받은 캔버스로 GPU 장치를 요청한다 (장치가 오면 게임이 프레임 루프를 건다)
  attach(bootstrap) {
    if (!(bootstrap?.canvas instanceof OffscreenCanvas)) throw new TypeError('게임 클라이언트는 OffscreenCanvas 를 넘겨받아야 한다')
    const module = runtime()
    module.specialHTMLTargets[CANVAS_TARGET] = bootstrap.canvas
    if (bootstrap.audio instanceof MessagePort) module.audioPort = bootstrap.audio
    module._app_boot()
    booted = true
  },

  dispose,
}

export default adapter
