// 빌드한 WASM 의 실제 import/export 목록으로 VeilBind 어댑터 policy 를 쓴다.
// VeilBind Worker 는 이 목록과 한 글자라도 다른 WASM 을 인스턴스화하기 전에 거절한다.
// 사용: node write_wasm_policy.mjs <client.wasm> <policy.generated.ts>
import { readFileSync, writeFileSync } from 'node:fs'

const [wasmPath, outputPath] = process.argv.slice(2)
if (!wasmPath || !outputPath) throw new Error('usage: write_wasm_policy.mjs WASM OUTPUT')
const module = new WebAssembly.Module(readFileSync(wasmPath))
const policy = {
  version: 2,
  // Emscripten 글루를 거치는 모듈 — 어댑터가 rawRpcBoundary 를 함께 준다
  execution: { controlSignals: 'emscripten' },
  imports: WebAssembly.Module.imports(module).map(({ module, name, kind }) => ({ module, name, kind })),
  exports: WebAssembly.Module.exports(module).map(({ name, kind }) => ({ name, kind })),
}
writeFileSync(
  outputPath,
  `// tools/write_wasm_policy.mjs 가 만든 파일 — 직접 고치지 않는다
import type { GeneratedWasmWorkerAdapter } from '@dentner-eng/veilbind/wasm'

export const policy = ${JSON.stringify(policy, null, 2)} as const satisfies GeneratedWasmWorkerAdapter['policy']
`,
)
