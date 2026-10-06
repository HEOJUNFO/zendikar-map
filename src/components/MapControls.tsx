import type { ReactNode } from 'react'
import type { LabelLang } from '../map/names'
import './MapControls.css'

interface Props {
  children?: ReactNode
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  lang: LabelLang
  onLangChange: (lang: LabelLang) => void
}

export function MapControls({ children, onZoomIn, onZoomOut, onReset, lang, onLangChange }: Props) {
  return (
    <div className="controls">
      <div className="zoom-buttons" role="group" aria-label="확대·축소">
        <button type="button" onClick={onZoomIn} aria-label="확대">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 3v10M3 8h10" />
          </svg>
        </button>
        <button type="button" onClick={onZoomOut} aria-label="축소">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 8h10" />
          </svg>
        </button>
        <button type="button" onClick={onReset} aria-label="전체 지도 보기">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" />
          </svg>
        </button>
      </div>
      <fieldset className="lang-toggle">
        <legend>지명 표기</legend>
        <label>
          <input type="radio" name="lang" value="en" checked={lang === 'en'} onChange={() => onLangChange('en')} />
          <span>English</span>
        </label>
        <label>
          <input type="radio" name="lang" value="ko" checked={lang === 'ko'} onChange={() => onLangChange('ko')} />
          <span>한국어</span>
        </label>
      </fieldset>
      {children}
    </div>
  )
}
