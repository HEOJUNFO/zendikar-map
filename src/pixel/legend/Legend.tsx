// 픽셀 지도의 범례 (S10, docs/pixel-plan.md) — 왼쪽 아래의 접히는 상자. 펼친 내용(LegendBody — 시점 글이 길다)은 처음 펼칠 때 받는다 (지금 지도의 Legend 와 같다)
import { lazy, Suspense, useState } from 'react'
import { MESSAGES } from '../../i18n/messages'
import type { Dict } from '../../i18n/units'
import type { Lang } from '../labels/layout'
import type { Palette } from '../raster/palette'

// 조각을 받지 못하면 한 줄로 (경계 없이 던지면 페이지 전체가 내려간다) — 다시 펼치면 다시 받지는 않는다
const LegendBody = lazy(() =>
  import('./LegendBody').catch(() => ({ default: () => <p className="px-legend-body">…</p> })),
)

interface Props {
  lang: Lang
  pal: Palette
  /** 시점 (끈 지도면 null) */
  time: number | null
  /** 그 시점의 바탕에 켜진 그 무렵의 지형 (virtual:pixel-times 의 legend) */
  periodKeys: readonly string[]
  /** 영어 사전 (데이터 글을 옮긴다 — 오기 전에는 한국어 원본) */
  dict: Dict | null
  /** 펼쳤는가 — 누르면 onOpenChange 로 (패널이 열리는 때 PixelApp 이 접는다) */
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function Legend({ lang, pal, time, periodKeys, dict, open, onOpenChange }: Props) {
  const t = MESSAGES[lang].legend
  // 한 번 펼치면 그 뒤로는 그대로 둔다
  const [shown, setShown] = useState(open)
  if (open && !shown) setShown(true)
  return (
    <details
      className="px-legend"
      open={open}
      onToggle={(e) => {
        const now = e.currentTarget.open
        if (now) setShown(true)
        if (now !== open) onOpenChange(now)
      }}
    >
      <summary aria-label={t.title} title={t.title}>
        {/* 기호와 설명이 줄지어 선 목록 — 7×7 픽셀 */}
        <svg viewBox="0 0 7 7" width={14} height={14} shapeRendering="crispEdges" aria-hidden="true">
          <path d="M1 0h1v1h1v1H2v1H1V2H0V1h1zM0 4h3v3H0zM4 1h3v1H4zM4 5h3v1H4zM4 3h2v1H4z" fill="currentColor" />
        </svg>
        <span className="px-legend-label">{t.title}</span>
      </summary>
      {shown && (
        <Suspense fallback={<p className="px-legend-body">…</p>}>
          <LegendBody lang={lang} pal={pal} time={time} periodKeys={periodKeys} dict={dict} />
        </Suspense>
      )}
    </details>
  )
}
