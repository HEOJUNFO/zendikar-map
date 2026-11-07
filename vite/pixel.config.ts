import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fontRanges } from './fontRanges.ts'
import { phaseData } from './phaseData.ts'
import { pixelMarks } from './pixelMarks.ts'
import { pixelTerrain } from './pixelTerrain.ts'

// 픽셀 아트 지도(/pixel)의 빌드 — 지금 지도(vite.config.ts)와 따로 돌린다 (docs/pixel-plan.md).
// 한 빌드에 진입점 둘을 두면 두 페이지가 함께 쓰는 모듈이 공유 조각으로 빠져 지금 지도의 진입 조각이 바뀐다
// (entry-check·load.mjs 의 기준값이 흔들린다). 그래서 지금 지도를 먼저 빌드한 dist/ 에 이 빌드를 덧쓴다.
// 개발 서버는 vite.config.ts 하나로 두 페이지를 함께 낸다 (/pixel → pixel.html).
// 장소·카드·대륙의 이름과 자리만 담은 첫 조각 `virtual:pixel-marks` — vite/pixelMarks.ts
// 타일 Worker 가 그리는 바탕 지형 `virtual:pixel-terrain` — vite/pixelTerrain.ts (Worker 의 빌드는 worker.plugins 를 따로 쓴다)
export default defineConfig({
  root: fileURLToPath(new URL('..', import.meta.url)),
  plugins: [fontRanges(), phaseData(), pixelMarks(), react()],
  worker: { plugins: () => [pixelTerrain()] },
  build: {
    emptyOutDir: false,
    copyPublicDir: false,
    rollupOptions: { input: 'pixel.html' },
  },
})
