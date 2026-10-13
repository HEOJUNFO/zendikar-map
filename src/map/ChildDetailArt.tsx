// 지역 상세의 손으로 그린 지형지물과 이름 — 세계 지도 안에 그림 단위 그대로 얹는다 (childDetail.ts)
import { memo, type CSSProperties } from 'react'
import { detailBand, type ChildDetail } from './childDetail'
import { inPhase, type ChildMapArt } from './childMapArt'
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
  half,
}: {
  id: string
  x0: number
  y0: number
  x1: number
  y1: number
  band: number
  edge: string
  inner: string
  /** 띠의 반쪽에서만 바뀐다 — 'outer': 바깥 반쪽에서 다 바뀌고 안쪽 반은 inner, 'inner': 바깥 반은 edge 이고 안쪽 반쪽에서 바뀐다 */
  half?: 'outer' | 'inner'
}) {
  const b = Math.min(band, (x1 - x0) / 2, (y1 - y0) / 2)
  const e = b * 0.04
  const pts = (p: number[][]) => p.map(([x, y]) => `${x},${y}`).join(' ')
  const grad = (side: string, gx1: number, gy1: number, gx2: number, gy2: number) => (
    <linearGradient key={side} id={`${id}-${side}`} gradientUnits="userSpaceOnUse" x1={gx1} y1={gy1} x2={gx2} y2={gy2}>
      <stop offset={half === 'inner' ? 0.5 : 0} stopColor={edge} />
      <stop offset={half === 'outer' ? 0.25 : half === 'inner' ? 0.75 : 0.5} stopColor="#808080" />
      <stop offset={half === 'outer' ? 0.5 : 1} stopColor={inner} />
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
 * 선 굵기는 화면 px(non-scaling), 이름 크기는 화면에서 11~34px 로 묶는다 (--inv-px 는 그림 단위 / 화면 px).
 *
 * 더 깊은 지역 상세(nested)는 부모 그림 묶음 안에 함께 그려 부모 몫(부모의 띠 마스크)을 한 번만 받는다 — 부모의 띠에 들어간 변에서도
 * 둘을 합친 것이 부모 몫 그대로다. 그 안에서는 더 깊은 그림이 제 띠의 바깥 반쪽에서 다 짙어지고, 부모 그림은 안쪽 반쪽에서 물러난다
 * (어느 자리든 둘 중 하나는 다 짙어 겹친 채움이 비치지 않는다 — 두 겹을 맞바꾸어 옅게 하면 띠 가운데에서 밑의 세계 지도가 1/4 비친다)
 */
export const ChildDetailArt = memo(function ChildDetailArt({
  detail,
  art,
  lang,
  hiddenLabels,
  phase,
  nested,
  arts,
  hiddenOf,
  parent,
}: {
  detail: ChildDetail
  art: ChildMapArt
  lang: LabelLang
  /** 페이즈 단계 (0: 끔, 1, 2, 3, …) — 페이즈 문이 붙은 부분은 그 페이즈에서만 그린다 */
  phase: number
  /** 이웃한 지역 상세가 같은 이름을 달아 여기서는 빼는 이름 (labels 의 차례) */
  hiddenLabels?: ReadonlySet<number>
  /** 이 안에 나와 있는 더 깊은 지역 상세 — 이 묶음 안에 함께 그리고, 그 자리에서 이 그림은 물러난다 (없으면 undefined — 같은 배열을 넘겨야 memo 가 산다) */
  nested?: readonly ChildDetail[]
  /** nested 의 그림 (id → 그림) */
  arts?: Readonly<Record<string, ChildMapArt>>
  /** nested 의 빼는 이름 (id → labels 의 차례) */
  hiddenOf?: ReadonlyMap<string, ReadonlySet<number>>
  /** 이것이 더 깊은 지역 상세면 그 부모 — 부모 그림 묶음 안(부모 그림 단위)에 놓는다 */
  parent?: ChildDetail
}) {
  const { bounds: b, s } = detail
  const [W, H] = art.size
  const maskId = `child-detail-${detail.id}`
  const band = detailBand(detail) * s
  // 세계 지도 단위 → 이 그림 단위
  const local = (c: ChildDetail) => ({ x0: (c.bounds.x0 - b.x0) * s, y0: (c.bounds.y0 - b.y0) * s, x1: (c.bounds.x1 - b.x0) * s, y1: (c.bounds.y1 - b.y0) * s })
  const inner = nested?.filter((c) => arts?.[c.id])
  const transform = parent
    ? `translate(${(b.x0 - parent.bounds.x0) * parent.s} ${(b.y0 - parent.bounds.y0) * parent.s}) scale(${parent.s / s})`
    : `translate(${b.x0} ${b.y0}) scale(${1 / s})`
  const content = (
    <>
      <g className="child-parts">
        {art.parts.map((p, i) => (inPhase(p, phase) ? <path key={i} className={`fig-${p.cls}`} d={p.d} /> : null))}
      </g>
      <ChildLabels art={art} lang={lang} hiddenLabels={hiddenLabels} />
    </>
  )
  return (
    <g
      className="child-detail"
      aria-hidden="true"
      transform={transform}
      style={{ '--inv-px': `calc(var(--inv-px-w, 1) * ${s})` } as CSSProperties}
      mask={`url(#${maskId})`}
    >
      <mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
        <FeatherShapes id={`${maskId}-f`} x0={0} y0={0} x1={W} y1={H} band={band} edge="black" inner="white" half={parent ? 'outer' : undefined} />
      </mask>
      {inner?.length ? (
        <>
          <mask id={`${maskId}-holes`} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
            <rect x={0} y={0} width={W} height={H} fill="white" />
            {inner.map((c) => (
              <FeatherShapes key={c.id} id={`${maskId}-hole-${c.id}`} {...local(c)} band={detailBand(c) * s} edge="white" inner="black" half="inner" />
            ))}
          </mask>
          <g mask={`url(#${maskId}-holes)`}>{content}</g>
          {inner.map((c) => (
            <ChildDetailArt key={c.id} detail={c} art={arts![c.id]} lang={lang} hiddenLabels={hiddenOf?.get(c.id)} phase={phase} parent={detail} />
          ))}
        </>
      ) : (
        content
      )}
    </g>
  )
})

/** 지역 상세의 이름 (hiddenLabels 의 차례는 뺀다) */
function ChildLabels({ art, lang, hiddenLabels }: { art: ChildMapArt; lang: LabelLang; hiddenLabels?: ReadonlySet<number> }) {
  return (
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
  )
}
