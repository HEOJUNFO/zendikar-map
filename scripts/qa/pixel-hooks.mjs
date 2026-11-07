// 픽셀 지도(/pixel)의 원본을 Node 에서 읽게 하는 모듈 훅 — 지금 지도의 geo.ts 는 확장자 없는 import 와 속성 없는 JSON import 를 써서
// Node 가 그대로는 읽지 못한다 (Vite 만 읽는다). 고치지 않고(docs/pixel-plan.md D3) 여기서 맞춘다:
//   확장자 없는 상대 경로 → .ts (없으면 그 폴더의 index.ts — period.ts 의 '../data/periods'),  .json → JSON 을 기본 내보내기로 하는 모듈,
//   import.meta.env 를 읽는 src 의 .ts 는 { DEV: false, PROD: true } 를 앞에 둔다 (period.ts·terrain.ts — 빌드와 같은 갈래),
//   import.meta.glob 을 부르는 것(childDetail.ts 의 그림 파일 목록 — S9 는 그림을 따로 읽는다)은 빈 목록을 내는 함수를
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
        // .ts 가 아니면 폴더의 index.ts, 그것도 아니면 그대로
      }
      try {
        return next(`${spec}/index.ts`, ctx)
      } catch {
        // 그대로
      }
    }
    return next(spec, ctx)
  },
  load(url, ctx, next) {
    if (url.endsWith('.json')) return { format: 'module', source: `export default ${fs.readFileSync(fileURLToPath(url), 'utf8')}`, shortCircuit: true }
    const r = next(url, ctx)
    if (url.includes('/src/') && url.endsWith('.ts')) {
      const src = String(r.source)
      let pre = ''
      if (src.includes('import.meta.env')) pre += 'import.meta.env ??= { DEV: false, PROD: true };\n'
      if (src.includes('import.meta.glob')) pre += 'import.meta.glob ??= () => ({});\n'
      if (pre) return { ...r, source: pre + src }
    }
    return r
  },
})
