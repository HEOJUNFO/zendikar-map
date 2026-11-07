import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fontRanges } from './vite/fontRanges.ts'
import { phaseData } from './vite/phaseData.ts'
import { pixelMarks } from './vite/pixelMarks.ts'
import { pixelTerrain } from './vite/pixelTerrain.ts'

// https://vite.dev/config/
export default defineConfig({
  // 페이즈 카드 원본에서 지도 조각(?map)과 카드마다의 글(?cards), 양면 카드의 대지 면 목록(?lands) — vite/phaseData.ts
  // 고운바탕의 한국어 조각 범위에서 라틴 조각이 맡는 글자를 뺀다(영어 글만으로 한국어 조각을 받지 않게) — vite/fontRanges.ts
  // 픽셀 지도(/pixel)의 장소·카드 이름 조각 `virtual:pixel-marks` — vite/pixelMarks.ts, 타일 Worker 의 바탕 지형 `virtual:pixel-terrain` — vite/pixelTerrain.ts
  // (둘 다 개발 서버만 — 지금 지도는 부르지 않는다)
  plugins: [fontRanges(), phaseData(), pixelMarks(), pixelTerrain(), react()],
  // references/ 의 참고 repo(FMG 등) HTML 을 의존성 스캔에서 빼고, 변경 감시도 하지 않는다
  // pixel.html 은 픽셀 아트 지도(/pixel) — 빌드는 vite/pixel.config.ts 가 따로 한다 (여기서는 개발 서버만)
  optimizeDeps: { entries: ['index.html', 'pixel.html'] },
  server: { watch: { ignored: ['**/references/**'] } },
})
