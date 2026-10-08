// 지역 상세의 손으로 그린 지형지물과 이름 — 세계 지도 안에 그림 단위 그대로 얹는다 (childDetail.ts)
import { memo, type CSSProperties } from 'react'
import { detailBand, type ChildDetail } from './childDetail'
import type { ChildMapArt } from './childMapArt'
import type { LabelLang } from './names'

/**
 * 사각형 가장자리 띠의 부드러운 마스크 — 띠 안쪽은 inner 색, 사각형 가장자리는 edge 색이고 그 사이를 고르게 잇는다.
 * 네 변은 모서리를 비스듬히 자른 사다리꼴 넷이라 모서리에서도 '가장자리까지 거리'로 이어진다 (필터 없이 — 확대해도 싸다).
 * 이웃한 사다리꼴은 조금 겹쳐 이음매에 실금이 생기지 않게 한다
 */
export function FeatherShapes({
  id,
  x0,
  y0,
  x1,
  y1,
  band,
  edge,
  inner,
}: {
  id: string
  x0: number
  y0: number
  x1: number
  y1: number
  band: number
  edge: string
  inner: string
}) {
  const b = Math.min(band, (x1 - x0) / 2, (y1 - y0) / 2)
  const e = b * 0.04
  const pts = (p: number[][]) => p.map(([x, y]) => `${x},${y}`).join(' ')
  const grad = (side: string, gx1: number, gy1: number, gx2: number, gy2: number) => (
    <linearGradient key={side} id={`${id}-${side}`} gradientUnits="userSpaceOnUse" x1={gx1} y1={gy1} x2={gx2} y2={gy2}>
      <stop offset="0" stopColor={edge} />
      <stop offset="0.5" stopColor="#808080" />
      <stop offset="1" stopColor={inner} />
    </linearGradient>
  )
  return (
    <>
      <defs>
        {grad('l', x0, 0, x0 + b, 0)}
        {grad('r', x1, 0, x1 - b, 0)}
        {grad('t', 0, y0, 0, y0 + b)}
        {grad('b', 0, y1, 0, y1 - b)}
      </defs>
      <rect x={x0 + b} y={y0 + b} width={Math.max(0, x1 - x0 - 2 * b)} height={Math.max(0, y1 - y0 - 2 * b)} fill={inner} />
      <polygon points={pts([[x0, y0], [x0 + b + e, y0 + b + e], [x0 + b + e, y1 - b - e], [x0, y1]])} fill={`url(#${id}-l)`} />
      <polygon points={pts([[x1, y0], [x1, y1], [x1 - b - e, y1 - b - e], [x1 - b - e, y0 + b + e]])} fill={`url(#${id}-r)`} />
      <polygon points={pts([[x0, y0], [x1, y0], [x1 - b - e, y0 + b + e], [x0 + b + e, y0 + b + e]])} fill={`url(#${id}-t)`} />
      <polygon points={pts([[x0, y1], [x0 + b + e, y1 - b - e], [x1 - b - e, y1 - b - e], [x1, y1]])} fill={`url(#${id}-b)`} />
    </>
  )
}

/**
 * 지역 상세의 손으로 그린 지형지물과 이름 — 그림 단위 그대로 얹는다. 범위 가장자리 띠(detailBand)에서 바깥쪽으로 옅어져
 * 사각형 경계가 선으로 드러나지 않는다 (세계 지도의 강·절벽 선은 같은 띠에서 거꾸로 짙어진다 — ZendikarMap 의 detail-holes).
 * 선 굵기는 화면 px(non-scaling), 이름 크기는 화면에서 11~34px 로 묶는다 (--inv-px 는 그림 단위 / 화면 px)
 */
export const ChildDetailArt = memo(function ChildDetailArt({
  detail,
  art,
  lang,
  hiddenLabels,
}: {
  detail: ChildDetail
  art: ChildMapArt
  lang: LabelLang
  /** 이웃한 지역 상세가 같은 이름을 달아 여기서는 빼는 이름 (labels 의 차례) */
  hiddenLabels?: ReadonlySet<number>
}) {
  const { bounds: b, s } = detail
  const [W, H] = art.size
  const maskId = `child-detail-${detail.id}`
  const band = detailBand(detail) * s
  return (
    <g
      className="child-detail"
      aria-hidden="true"
      transform={`translate(${b.x0} ${b.y0}) scale(${1 / s})`}
      style={{ '--inv-px': `calc(var(--inv-px-w, 1) * ${s})` } as CSSProperties}
      mask={`url(#${maskId})`}
    >
      <mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
        <FeatherShapes id={`${maskId}-f`} x0={0} y0={0} x1={W} y1={H} band={band} edge="black" inner="white" />
      </mask>
      <g className="child-parts">
        {art.parts.map((p, i) => (
          <path key={i} className={`fig-${p.cls}`} d={p.d} />
        ))}
      </g>
      <g className="child-labels">
        {art.labels.map((l, i) => {
          if (hiddenLabels?.has(i)) return null
          const ko = lang === 'ko' && l.textKo
          return (
            <text
              key={i}
              className={`child-label kind-${l.kind}${ko ? ' is-ko' : ''}`}
              x={l.at[0]}
              y={l.at[1]}
              textAnchor="middle"
              style={{ '--size': l.size } as CSSProperties}
              transform={l.rotate ? `rotate(${l.rotate} ${l.at[0]} ${l.at[1]})` : undefined}
            >
              {ko ? l.textKo : l.text}
            </text>
          )
        })}
      </g>
    </g>
  )
})
