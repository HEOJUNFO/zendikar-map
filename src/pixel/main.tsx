import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './pixel.css'
import { PixelApp } from './PixelApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PixelApp />
  </StrictMode>,
)

// 개발 서버만 — 바탕 지형의 원본(지금 지도의 지형 셈·데이터)을 고치면 Worker 가 새 조각을 받도록 페이지를 다시 부른다 (vite/pixelTerrain.ts)
if (import.meta.hot) import.meta.hot.on('pixel-terrain', () => window.location.reload())
