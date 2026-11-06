import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fontRanges } from './vite/fontRanges.ts'
import { phaseData } from './vite/phaseData.ts'

// https://vite.dev/config/
export default defineConfig({
  // 페이즈 카드 원본에서 지도 조각(?map)과 카드마다의 글(?cards), 양면 카드의 대지 면 목록(?lands) — vite/phaseData.ts
  // 고운바탕의 한국어 조각 범위에서 라틴 조각이 맡는 글자를 뺀다(영어 글만으로 한국어 조각을 받지 않게) — vite/fontRanges.ts
  plugins: [fontRanges(), phaseData(), react()],
  // references/ 의 참고 repo(FMG 등) HTML 을 의존성 스캔에서 빼고, 변경 감시도 하지 않는다
  optimizeDeps: { entries: ['index.html'] },
  server: { watch: { ignored: ['**/references/**'] } },
})
