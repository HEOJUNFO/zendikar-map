import { useEffect, useRef } from 'react'
import { CHILD_MAP_ICON, CHILD_MAP_ICON_FOLD, HEDRON_LEGEND_PATH, MARKER_PATHS, type PointKind } from '../map/glyphs'
import { KIND_LABEL } from './labels'
import './Legend.css'

const KINDS: PointKind[] = ['settlement', 'ruin', 'landmark', 'underground', 'sky']

interface Props {
  era: string
  /** 페이즈를 켰을 때 그 그림의 시점 */
  phaseNote: string | null
  /** 페이즈1 — 지역 지도가 있는 곳의 아이콘 줄을 보인다 */
  childMaps: boolean
}

export function Legend({ era, phaseNote, childMaps }: Props) {
  const ref = useRef<HTMLDetailsElement>(null)
  // 펼친 채로 지도를 누르면 접는다. 끌어서 옮긴 뒤의 click 은 d3-zoom 이 막으므로 옮기기만 해서는 접히지 않는다
  useEffect(() => {
    const close = (e: MouseEvent) => {
      const el = ref.current
      if (el?.open && e.target instanceof Element && e.target.closest('.zendikar-map, .child-map')) el.open = false
    }
    document.addEventListener('click', close, true)
    return () => document.removeEventListener('click', close, true)
  }, [])

  return (
    <details className="legend" ref={ref}>
      <summary>범례</summary>
      {/* 펼친 내용은 조작 줄 위에 따로 뜬다 — 줄 자체는 움직이지 않는다 */}
      <div className="legend-body">
        <ul>
          {KINDS.map((kind) => (
            <li key={kind}>
              <svg viewBox="-7 -7 14 14" aria-hidden="true" className={`legend-glyph kind-${kind}`}>
                <path d={MARKER_PATHS[kind]} />
              </svg>
              {KIND_LABEL[kind]}
            </li>
          ))}
          <li>
            <svg viewBox="-7 -9 14 16" aria-hidden="true" className="legend-glyph hedron">
              <path d={HEDRON_LEGEND_PATH} />
            </svg>
            떠 있는 헤드론
          </li>
          {childMaps && (
            <li>
              {/* 패널의 '지역 지도 보기' 단추·지도의 이름 뒤 아이콘과 같은 접힌 지도 */}
              <svg viewBox="0 0 20 20" aria-hidden="true" className="legend-glyph child-map-icon">
                <path d={CHILD_MAP_ICON} />
                <path d={CHILD_MAP_ICON_FOLD} className="fold" />
                <path d={CHILD_MAP_ICON} className="ink" />
              </svg>
              지역 지도가 있는 곳
            </li>
          )}
        </ul>
        <p className="legend-era">{era}</p>
        {phaseNote && <p className="legend-era">{phaseNote}</p>}
        <p className="legend-era">
          공식 세계 지도는 없습니다. 대륙 배치는 공식 서술(예: 온두는 남서쪽, 타짐과 굴 드라즈는 좁은 바다를 사이에 둔 이웃)에 맞춘
          해석이며, 굴 드라즈–발라 게드 접점처럼 이 배치로 재현하지 못한 단서도 있습니다.
        </p>
        <blockquote className="legend-quote">
          <span lang="en">
            “A map is a brittle record; do not rely on images made of the past. The land makes itself new each day with the sun, so we
            celebrate its rebirth.”
          </span>
          <footer>— 타주루 대변인 Sutina (A Planeswalker's Guide to Zendikar: Bala Ged and Elves, 2009)</footer>
        </blockquote>
        {/* 카드 그림을 보여 주므로 Wizards of the Coast 팬 콘텐츠 정책의 고지를 그대로 싣는다 */}
        <p className="legend-notice">
          카드 그림과 카드 정보는 Scryfall 에서 가져왔습니다.{' '}
          <span lang="en">
            Zendikar Map is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards.
            Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
          </span>
        </p>
      </div>
    </details>
  )
}
