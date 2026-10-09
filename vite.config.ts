import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // references/ 의 참고 repo(FMG 등) HTML 을 의존성 스캔에서 빼고, 변경 감시도 하지 않는다
  // 게임(game/index.html)은 개발 서버에서 /game/ 으로 열린다 — 지도 빌드(index.html)에는 들어가지 않는다
  optimizeDeps: { entries: ['index.html', 'game/index.html'] },
  server: {
    watch: { ignored: ['**/references/**', '**/tools/**', '**/build/**'] },
    // VeilBind 의 private 등록 정보는 브라우저에 내주지 않는다 (앞의 넷은 Vite 기본값)
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/*.private.json'] },
  },
  // 게임 Worker (game/host) — Emscripten 글루가 ES 모듈이다
  worker: { format: 'es' },
})
