import { HEDRON_LEGEND_PATH, MARKER_PATHS, type PointKind } from '../map/glyphs'
import { KIND_LABEL } from './labels'
import './Legend.css'

const KINDS: PointKind[] = ['settlement', 'ruin', 'landmark', 'underground', 'sky']

interface Props {
  era: string
}

export function Legend({ era }: Props) {
  return (
    <details className="legend">
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
        </ul>
        <p className="legend-era">{era}</p>
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
