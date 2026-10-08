// 지역 상세의 손으로 그린 지형지물과 이름 — 세계 지도 안에 그림 단위 그대로 얹는다 (childDetail.ts)
import { memo, type CSSProperties } from 'react'
import type { ChildDetail } from './childDetail'
import type { ChildMapArt } from './childMapArt'
import type { LabelLang } from './names'

/**
 * 지역 상세의 손으로 그린 지형지물과 이름 — 그림 단위 그대로 얹고 범위로 자른다.
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
  const clipId = `child-detail-${detail.id}`
  return (
    <g
      className="child-detail"
      aria-hidden="true"
      transform={`translate(${b.x0} ${b.y0}) scale(${1 / s})`}
      style={{ '--inv-px': `calc(var(--inv-px-w, 1) * ${s})` } as CSSProperties}
      clipPath={`url(#${clipId})`}
    >
      <clipPath id={clipId}>
        <rect x={0} y={0} width={W} height={H} />
      </clipPath>
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
