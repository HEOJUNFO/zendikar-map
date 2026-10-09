// Emscripten 이 만든 game-client.mjs 의 타입 — 빌드가 이 파일을 그 옆에 복사한다 (원본: tools/game-client.d.mts)

export interface GameClientModule {
  /** 캔버스를 찾는 이름표 — '#canvas' 에 OffscreenCanvas 를 건다 */
  specialHTMLTargets: Record<string, unknown>
  /** 소리 출력에 이어진 핸들 — 게임이 섞은 소리를 여기에 직접 쓴다 (engine/audio/port.cpp). 없으면 소리 없이 돈다 */
  audioPort?: MessagePort
  /** GPU 장치를 요청한다 — 결과는 나중에 온다 (app/client/main.cpp 의 app_boot) */
  _app_boot(): void
  _app_shutdown(): void
  stackSave(): bigint | number
  stackRestore(pointer: bigint | number): void
}

export interface GameClientModuleOptions {
  /** WASM 인스턴스를 직접 만든다 — 만든 인스턴스의 exports 를 돌려준다 */
  instantiateWasm?(
    imports: WebAssembly.Imports,
    receiveInstance: (instance: WebAssembly.Instance, module?: WebAssembly.Module) => unknown,
  ): WebAssembly.Exports
}

export default function createGameClientModule(options?: GameClientModuleOptions): Promise<GameClientModule>
