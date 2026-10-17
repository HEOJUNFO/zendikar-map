import { useEffect, useRef } from 'react'
import { CHILD_MAP_ICON, CHILD_MAP_ICON_FOLD, HEDRON_LEGEND_PATH, MARKER_PATHS, type PointKind } from '../map/glyphs'
import { TERRAIN_LEGEND_LABEL, terrainLegendArt, type LegendArt, type TerrainLegendKey } from '../map/landscapeGlyphs'
import type { PeriodLegendKey } from '../map/periodTypes'
import { KIND_LABEL } from './labels'
import './Legend.css'

const KINDS: PointKind[] = ['settlement', 'ruin', 'landmark', 'underground', 'sky']

/** 페이즈 바탕의 '이 무렵의 지형' 줄 — 옅은 칠과 성긴 기호라 빈 땅·성긴 숲·땅으로 읽히기 쉬운 것만 (강·폭포·늪·언덕·폐허는 이미 줄이 있거나 원래 범례 밖) */
const PERIOD_LABEL: Record<PeriodLegendKey, string> = {
  blight: '엘드라지가 말려 버린 땅',
  deadwood: '죽은 숲',
  drybed: '물이 빠진 바닥',
}

function LegendRow({ art, label }: { art: LegendArt; label: string }) {
  return (
    <li>
      <svg viewBox={art.viewBox} aria-hidden="true" className="legend-glyph">
        {art.parts.map((p, i) => (
          <path key={i} d={p.d} className={p.cls} />
        ))}
      </svg>
      {label}
    </li>
  )
}

interface Props {
  era: string
  /** 페이즈를 켰을 때 그 그림의 시점 */
  phaseNote: string | null
  /** 지도에 그린 특별한 지형 기호 — 강·화산·폭포 등 */
  terrain: readonly TerrainLegendKey[]
  /** 켠 페이즈에 그린 그 무렵의 지형 (페이즈 바탕) — 그 페이즈에 켜진 종류만 */
  periodKeys?: readonly PeriodLegendKey[]
  /** 그 줄의 그림 — 늦게 받는 페이즈 조각의 기호 (지도와 같은 칠·기호) */
  periodArt?: (key: PeriodLegendKey) => LegendArt
}

export function Legend({ era, phaseNote, terrain, periodKeys, periodArt }: Props) {
  const ref = useRef<HTMLDetailsElement>(null)
  // 펼친 채로 지도를 누르면 접는다. 끌어서 옮긴 뒤의 click 은 d3-zoom 이 막으므로 옮기기만 해서는 접히지 않는다
  useEffect(() => {
    const close = (e: MouseEvent) => {
      const el = ref.current
      if (el?.open && e.target instanceof Element && e.target.closest('.zendikar-map')) el.open = false
    }
    document.addEventListener('click', close, true)
    return () => document.removeEventListener('click', close, true)
  }, [])

  return (
    <details className="legend" ref={ref}>
      <summary aria-label="범례" title="범례">
        {/* 기호와 설명이 줄지어 선 목록 — 범례 자체를 닮은 그림 */}
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 2.4 5.1 4 3.5 5.6 1.9 4ZM2.1 9.4H4.9V12.2H2.1Z" className="fill" />
          <path d="M7.5 4H14M7.5 10.8H14M7.5 7.4H12" />
        </svg>
      </summary>
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
          <li>
            {/* 패널의 '가까이 보기' 단추·지도의 이름 뒤 아이콘과 같은 접힌 지도 */}
            <svg viewBox="0 0 20 20" aria-hidden="true" className="legend-glyph child-map-icon">
              <path d={CHILD_MAP_ICON} />
              <path d={CHILD_MAP_ICON_FOLD} className="fold" />
              <path d={CHILD_MAP_ICON} className="ink" />
            </svg>
            확대하면 지역 상세가 있는 곳
          </li>
        </ul>
        {terrain.length > 0 && (
          <>
            <h3 className="legend-heading" id="legend-terrain">
              지형
            </h3>
            <ul className="legend-terrain" aria-labelledby="legend-terrain">
              {terrain.map((key) => (
                <LegendRow key={key} art={terrainLegendArt(key)} label={TERRAIN_LEGEND_LABEL[key]} />
              ))}
            </ul>
          </>
        )}
        {periodArt && periodKeys?.length ? (
          <>
            <h3 className="legend-heading" id="legend-period">
              이 무렵의 지형
            </h3>
            <ul className="legend-terrain" aria-labelledby="legend-period">
              {periodKeys.map((key) => (
                <LegendRow key={key} art={periodArt(key)} label={PERIOD_LABEL[key]} />
              ))}
            </ul>
          </>
        ) : null}
        <p className="legend-era">{era}</p>
        {phaseNote && <p className="legend-era">{phaseNote}</p>}
        <p className="legend-era">
          공식 세계 지도는 없습니다. 대륙 배치는 공식 서술(예: 온두는 남서쪽, 타짐과 굴 드라즈는 좁은 바다를 사이에 둔 이웃)에 맞춘
          해석입니다.
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
