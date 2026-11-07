// 범례의 펼친 내용 (S10) — 지금 지도의 src/components/Legend.tsx 와 같은 줄·같은 글(src/i18n/messages.ts 의 legend, 범례 글 src/data/notes.ts)을
// 픽셀 지도의 그림으로: 장소·카드 기호(marks/sprites.ts), 헤드론, 지도에 그린 특별한 지형과 그 시점 바탕의 그 무렵 지형(그림판의 그림).
// 픽셀 지도에만 있는 줄은 지역 상세가 나오는 단계 하나 (지금 지도의 '확대하면 지역 상세가 있는 곳' 아이콘 대신 — 픽셀 지도는 이름 뒤에 아이콘을 달지 않는다)
import { ERA_NOTE, TIME_NOTES } from '../../data/notes'
import type { TimePoint } from '../../data/timeline'
import type { PeriodLegendKey } from '../../map/periodTypes'
import { MESSAGES } from '../../i18n/messages'
import { translate, type Dict } from '../../i18n/units'
import type { Lang } from '../labels/layout'
import { spriteUrl } from '../marks/sprites'
import type { Palette } from '../raster/palette'
import { artUrl, hedronArt, periodArt, TERRAIN_KEYS, terrainArt } from './art'

const KINDS = ['settlement', 'ruin', 'landmark', 'underground', 'sky'] as const
const PERIOD_KEYS: readonly PeriodLegendKey[] = ['blight', 'deadwood', 'drybed', 'metal']

/** 픽셀 지도에만 있는 줄 */
const LOCAL = {
  ko: { detail: '가장 깊이 확대하면(한 픽셀 = 0.25 단위) 나오는 지역 상세 — 장소 패널의 ‘가까이 보기’' },
  en: { detail: 'Regional detail appears at the deepest zoom (1 pixel = 0.25 units) — “Look closer” in a place panel' },
} satisfies Record<Lang, unknown>

function Row({ src, label, w }: { src: string; label: string; w: number }) {
  return (
    <li>
      <img src={src} alt="" width={(w + 2) * 2} className="px-legend-art" />
      <span>{label}</span>
    </li>
  )
}

export default function LegendBody({ lang, pal, time, periodKeys, dict }: { lang: Lang; pal: Palette; time: number | null; periodKeys: readonly string[]; dict: Dict | null }) {
  const m = MESSAGES[lang]
  const t = m.legend
  // 데이터 글 — 영어 보기는 base 사전으로 (옮기지 못하면 한국어 원본, lang 속성과 함께)
  const tx = (text: string) => {
    const en = lang === 'en' && dict ? translate(text, dict) : null
    return en === null ? { lang: 'ko', children: text } : { lang: 'en', children: en }
  }
  // 지도의 기호와 같은 빛 (PixelApp 의 spriteColors)
  const colors = { ink: pal.uiInk, fill: pal.uiBg, stone: '#a39a86', halo: pal.uiBg }
  const period = PERIOD_KEYS.filter((k) => periodKeys.includes(k))
  const widthOf = (rows: readonly string[]) => Math.max(...rows.map((r) => r.length))

  return (
    <div className="px-legend-body" lang={lang}>
      <ul className="px-legend-list">
        {KINDS.map((k) => (
          <li key={k}>
            <span className="px-legend-mark" style={{ backgroundImage: spriteUrl(k, colors) }} aria-hidden="true" />
            <span>{m.kind[k]}</span>
          </li>
        ))}
        <Row src={artUrl(hedronArt(), pal)} label={t.hedron} w={widthOf(hedronArt())} />
      </ul>
      <h3 className="px-legend-heading" id="px-legend-terrain">
        {t.terrainHeading}
      </h3>
      <ul className="px-legend-list" aria-labelledby="px-legend-terrain">
        {TERRAIN_KEYS.map((k) => (
          <Row key={k} src={artUrl(terrainArt(k), pal)} label={t.terrain[k]} w={widthOf(terrainArt(k))} />
        ))}
      </ul>
      {period.length > 0 && (
        <>
          <h3 className="px-legend-heading" id="px-legend-period">
            {t.periodHeading}
          </h3>
          <ul className="px-legend-list" aria-labelledby="px-legend-period">
            {period.map((k) => (
              <Row key={k} src={artUrl(periodArt(k), pal)} label={t.period[k]} w={widthOf(periodArt(k))} />
            ))}
          </ul>
        </>
      )}
      <p className="px-legend-text">{LOCAL[lang].detail}</p>
      {/* 지도가 그리는 시점, 켠 시점의 글 (지금 지도의 Legend 의 era·phaseNote) */}
      <p className="px-legend-text" {...tx(ERA_NOTE)} />
      {time !== null && <p className="px-legend-text" {...tx(TIME_NOTES[time as TimePoint])} />}
      <p className="px-legend-text">{t.noOfficialMap}</p>
      <blockquote className="px-legend-quote">
        <span lang="en">
          “A map is a brittle record; do not rely on images made of the past. The land makes itself new each day with the sun, so we celebrate its
          rebirth.”
        </span>
        <footer>{t.quoteBy}</footer>
      </blockquote>
      {/* 카드 그림을 보여 주므로 Wizards of the Coast 팬 콘텐츠 정책의 고지를 그대로 싣는다 (지금 지도와 같다) */}
      <p className="px-legend-notice">
        {t.scryfall}{' '}
        <span lang="en">
          Zendikar Map is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used
          are property of Wizards of the Coast. ©Wizards of the Coast LLC.
        </span>
      </p>
    </div>
  )
}
