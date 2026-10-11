import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { phaseData } from './vite/phaseData.ts'

// https://vite.dev/config/
export default defineConfig({
  // 페이즈 카드 원본에서 지도 조각(?map)과 카드마다의 글(?cards) — vite/phaseData.ts
  plugins: [phaseData(), react()],
  // references/ 의 참고 repo(FMG 등) HTML 을 의존성 스캔에서 빼고, 변경 감시도 하지 않는다
  optimizeDeps: { entries: ['index.html'] },
  server: { watch: { ignored: ['**/references/**'] } },
})
