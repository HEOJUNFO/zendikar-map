import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './pixel.css'
import { PixelApp } from './PixelApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PixelApp />
  </StrictMode>,
)
