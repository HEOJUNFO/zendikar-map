// 픽셀 지도(/pixel)의 원본을 Node 에서 읽게 하는 모듈 훅 — 지금 지도의 geo.ts 는 확장자 없는 import 와 속성 없는 JSON import 를 써서
// Node 가 그대로는 읽지 못한다 (Vite 만 읽는다). 고치지 않고(docs/pixel-plan.md D3) 여기서 맞춘다:
//   확장자 없는 상대 경로 → .ts,  .json → JSON 을 기본 내보내기로 하는 모듈
//   import './pixel-hooks.mjs' 를 맨 먼저 하고, 원본은 그 뒤에 동적 import 로 읽는다.
import fs from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'

registerHooks({
  resolve(spec, ctx, next) {
    if (/^\.\.?\//.test(spec) && !/\.[a-z]+$/i.test(spec)) {
      try {
        return next(`${spec}.ts`, ctx)
      } catch {
        // .ts 가 아니면 그대로
      }
    }
    return next(spec, ctx)
  },
  load(url, ctx, next) {
    if (url.endsWith('.json')) return { format: 'module', source: `export default ${fs.readFileSync(fileURLToPath(url), 'utf8')}`, shortCircuit: true }
    return next(url, ctx)
  },
})
