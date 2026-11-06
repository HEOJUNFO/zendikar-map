import { useEffect, useRef, useState } from 'react'
import { CHILD_MAP_ICON, CHILD_MAP_ICON_FOLD, HEDRON_LEGEND_PATH, MARKER_PATHS, type PointKind } from '../map/glyphs'
import { useLang, useMessages, useText } from '../i18n/lang'
import { terrainLegendArt, type LegendArt, type TerrainLegendKey } from '../map/landscapeGlyphs'
import type { PeriodLegendKey } from '../map/periodTypes'
import './Legend.css'

const KINDS: PointKind[] = ['settlement', 'ruin', 'landmark', 'underground', 'sky']

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
  /**
   * 펼치거나 접을 때 — open 이 true 면 막 펼쳐지려는(단추를 누른 순간, 아직 열리기 전) 때나 펼쳐진 뒤, legend 는 범례 상자.
   * App 이 펼친 범례가 머리말 밑에 들어갈 자리를 보고 머리말을 저절로 접는다 (같은 값으로 두 번 불러도 된다)
   */
  onOpenChange?: (open: boolean, legend: HTMLDetailsElement) => void
}

// 글은 지명 언어를 따른다 — 이름표는 화면 글(src/i18n/messages.ts 의 legend), 페이즈·시점의 설명은 데이터 글이라 base 사전으로 옮긴다
// (App 이 LangContext·TextContext 로 감싼다. 사전이 오기 전이나 옮기지 못한 글은 한국어 원본 그대로, lang 속성과 함께)
export function Legend({ era, phaseNote, terrain, periodKeys, periodArt, onOpenChange }: Props) {
  const m = useMessages()
  const t = m.legend
  const tx = useText()
  const lang = useLang()
  const ref = useRef<HTMLDetailsElement>(null)
  // 펼친 내용은 처음 펼칠 때 그리고, 그 뒤로는 그대로 둔다. 접힌 범례의 글도 브라우저는 글꼴을 받는다 — 영어 보기에서 영어 사전이 오기 전의 한국어 설명이
  // 고운바탕 한국어 조각 10개(휴대폰 느린 망에서 약 190KB)를 받아 그림 묶음과 망을 나눠 썼다 (2026-11-05). 누르는 순간(열리기 전)에 그려 빈 상자가 비치지 않고,
  // 다른 길로 열려도(toggle) 그린다
  const [shown, setShown] = useState(false)
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
    <details
      className="legend"
      ref={ref}
      onToggle={(e) => {
        if (e.currentTarget.open) setShown(true)
        onOpenChange?.(e.currentTarget.open, e.currentTarget)
      }}
    >
      {/* 누르는 순간은 아직 열리기 전 — 펼쳐질 때를 미리 알려 머리말이 같은 그리기에서 접힌다(작게 열렸다가 커지며 깜박이지 않게) */}
      <summary
        aria-label={t.title}
        title={t.title}
        onClick={(e) => {
          setShown(true)
          const el = e.currentTarget.parentElement
          if (el instanceof HTMLDetailsElement) onOpenChange?.(!el.open, el)
        }}
      >
        {/* 기호와 설명이 줄지어 선 목록 — 범례 자체를 닮은 그림 */}
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 2.4 5.1 4 3.5 5.6 1.9 4ZM2.1 9.4H4.9V12.2H2.1Z" className="fill" />
          <path d="M7.5 4H14M7.5 10.8H14M7.5 7.4H12" />
        </svg>
      </summary>
      {/* 펼친 내용은 조작 줄 위에 따로 뜬다 — 줄 자체는 움직이지 않는다 */}
      {shown && (
        <div className="legend-body" lang={lang}>
          <ul>
            {KINDS.map((kind) => (
              <li key={kind}>
                <svg viewBox="-7 -7 14 14" aria-hidden="true" className={`legend-glyph kind-${kind}`}>
                  <path d={MARKER_PATHS[kind]} />
                </svg>
                {m.kind[kind]}
              </li>
            ))}
            <li>
              <svg viewBox="-7 -9 14 16" aria-hidden="true" className="legend-glyph hedron">
                <path d={HEDRON_LEGEND_PATH} />
              </svg>
              {t.hedron}
            </li>
            <li>
              {/* 패널의 '가까이 보기' 단추·지도의 이름 뒤 아이콘과 같은 접힌 지도 */}
              <svg viewBox="0 0 20 20" aria-hidden="true" className="legend-glyph child-map-icon">
                <path d={CHILD_MAP_ICON} />
                <path d={CHILD_MAP_ICON_FOLD} className="fold" />
                <path d={CHILD_MAP_ICON} className="ink" />
              </svg>
              {t.childMap}
            </li>
          </ul>
          {terrain.length > 0 && (
            <>
              <h3 className="legend-heading" id="legend-terrain">
                {t.terrainHeading}
              </h3>
              <ul className="legend-terrain" aria-labelledby="legend-terrain">
                {terrain.map((key) => (
                  <LegendRow key={key} art={terrainLegendArt(key)} label={t.terrain[key]} />
                ))}
              </ul>
            </>
          )}
          {periodArt && periodKeys?.length ? (
            <>
              <h3 className="legend-heading" id="legend-period">
                {t.periodHeading}
              </h3>
              <ul className="legend-terrain" aria-labelledby="legend-period">
                {periodKeys.map((key) => (
                  <LegendRow key={key} art={periodArt(key)} label={t.period[key]} />
                ))}
              </ul>
            </>
          ) : null}
          <p className="legend-era" {...tx(era)} />
          {phaseNote && <p className="legend-era" {...tx(phaseNote)} />}
          <p className="legend-era">{t.noOfficialMap}</p>
          <blockquote className="legend-quote">
            <span lang="en">
              “A map is a brittle record; do not rely on images made of the past. The land makes itself new each day with the sun, so we
              celebrate its rebirth.”
            </span>
            <footer>{t.quoteBy}</footer>
          </blockquote>
          {/* 카드 그림을 보여 주므로 Wizards of the Coast 팬 콘텐츠 정책의 고지를 그대로 싣는다 */}
          <p className="legend-notice">
            {t.scryfall}{' '}
            <span lang="en">
              Zendikar Map is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards.
              Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
            </span>
          </p>
        </div>
      )}
    </details>
  )
}
