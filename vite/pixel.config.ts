import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fontRanges } from './fontRanges.ts'
import { phaseData } from './phaseData.ts'
import { pixelMarks } from './pixelMarks.ts'
import { pixelFigures } from './pixelFigures.ts'
import { pixelTerrain } from './pixelTerrain.ts'

// 픽셀 아트 지도(/pixel)의 빌드 — 지금 지도(vite.config.ts)와 따로 돌린다 (docs/pixel-plan.md).
// 한 빌드에 진입점 둘을 두면 두 페이지가 함께 쓰는 모듈이 공유 조각으로 빠져 지금 지도의 진입 조각이 바뀐다
// (entry-check·load.mjs 의 기준값이 흔들린다). 그래서 지금 지도를 먼저 빌드한 dist/ 에 이 빌드를 덧쓴다.
// 개발 서버는 vite.config.ts 하나로 두 페이지를 함께 낸다 (/pixel → pixel.html).
// 장소·카드·대륙의 이름과 자리만 담은 첫 조각 `virtual:pixel-marks` — vite/pixelMarks.ts
// 타일 Worker 가 그리는 바탕 지형 `virtual:pixel-terrain` — vite/pixelTerrain.ts (Worker 의 빌드는 worker.plugins 를 따로 쓴다).
// 시점별 지도(S6)의 주 스레드 몫(`virtual:pixel-times`·`virtual:pixel-period-notes`)도 같은 플러그인이 낸다. 페이즈 그림(S7)은 vite/pixelFigures.ts
/** 가상 조각의 이름은 '\0virtual:…' 이라 그대로면 '_virtual_…' 파일이 된다 — 밑줄로 시작하는 파일을 숨기는 호스트가 있어 이름을 고친다 */
const chunkFileNames = (c: { name: string }) => `assets/${c.name.replace(/^_*(virtual_)?/, '').replace(/-+$/, '')}-[hash].js`
export default defineConfig({
  root: fileURLToPath(new URL('..', import.meta.url)),
  plugins: [fontRanges(), phaseData(), pixelMarks(), pixelTerrain(), pixelFigures(), react()],
  // 타일 Worker 는 모듈 Worker — 깊은 확대의 기호 조각(virtual:pixel-terrain-fine)을 그 단계에서만 import() 로 받는다
  worker: {
    format: 'es',
    plugins: () => [pixelTerrain()],
    rollupOptions: { output: { chunkFileNames } },
  },
  build: {
    emptyOutDir: false,
    copyPublicDir: false,
    rollupOptions: { input: 'pixel.html', output: { chunkFileNames } },
  },
})
