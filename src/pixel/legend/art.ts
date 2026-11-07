// 범례의 그림 (S10, docs/pixel-plan.md) — 지도와 같은 그림판(raster/terrainSprites.ts)의 그림을 그 팔레트 빛으로, 한 글자 = 화면 2px.
// 지도에 없는 범례만의 그림(강의 물길·헤드론·그 무렵 칠의 견본)도 같은 글자로 찍는다
import type { TerrainLegendKey } from '../../map/landscapeGlyphs'
import type { PeriodLegendKey } from '../../map/periodTypes'
import type { Palette, Rgb, TerrainColors } from '../raster/palette'
import { GLYPH_SPRITES, INK, LANDMARK_SPRITES } from '../raster/terrainSprites'

/** 지도에 그린 특별한 지형 (지금 지도의 Legend 의 지형 줄 — 모두 지도에 있다: scripts/qa/pixel-terrain.mjs 가 본다) */
export const TERRAIN_KEYS: readonly TerrainLegendKey[] = ['river', 'volcano', 'waterfall', 'geyser', 'lava', 'crystal', 'mesa', 'urn']

/** 범례만의 글자 — 1·2·3 은 헤드론의 돌빛 */
const EXTRA: Record<string, keyof TerrainColors> = { '1': 'stoneLight', '2': 'stone', '3': 'stoneShade' }

const RIVER = ['......bb', '....bbb.', '...bb...', '.bbb....', 'bb......']
const HEDRON = ['...k....', '..k1k...', '.k112k..', '.k112k..', 'k11122k.', '.k122k..', '..k2k...', '...k....', '........', '..%%%%..']
const SWATCH: Record<Exclude<PeriodLegendKey, 'deadwood'>, string[]> = {
  // 흰 가루(왼쪽)·백악(오른쪽) — 지도의 칠과 그 위 무늬 (지금 지도의 범례도 둘을 한 줄에)
  blight: ['aaAaJjjj', 'aaahjjnj', 'Aaaajjjn', 'aaaaJjjj', 'ahaajnjj', 'aaaAjjjJ'],
  drybed: ['BBBDBBBB', 'BEBBBBDB', 'BBEEBBBB', 'DBBBEBBS', 'BBBBBEBB', 'BBDBBBBB'],
  metal: ['pppvpppp', 'ppPvpppp', 'vvvvvvvv', 'pppppvpP', 'pPpppvpp', 'pppppvpp'],
}

export function terrainArt(key: TerrainLegendKey): readonly string[] {
  switch (key) {
    case 'river':
      return RIVER
    case 'lava':
      return GLYPH_SPRITES.lava[0].rows
    case 'crystal':
      // 수정 들판의 기호 (지도가 그리는 것 — crystal-spire 는 수정으로 바뀐 산봉우리)
      return GLYPH_SPRITES.crystal[0].rows
    case 'mesa':
      return GLYPH_SPRITES.mesa[0].rows
    default:
      return LANDMARK_SPRITES[key].rows
  }
}
export const hedronArt = (): readonly string[] => HEDRON
export const periodArt = (key: PeriodLegendKey): readonly string[] => (key === 'deadwood' ? GLYPH_SPRITES.deadwood[0].rows : SWATCH[key])

const hexOf = (c: Rgb) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
const cache = new Map<string, string>()

/** 글자 그림의 data: 주소 (SVG — 칸마다 사각형, 가장자리를 흐리지 않는다). '%' 는 그림자 — 바둑판으로 한 칸 건너 */
export function artUrl(rows: readonly string[], pal: Palette): string {
  const key = `${pal.id}|${rows.join('/')}`
  let url = cache.get(key)
  if (!url) {
    const rects: string[] = []
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch === '.' || (ch === '%' && ((x + y) & 1) === 1)) return
        const k = EXTRA[ch] ?? INK[ch]
        if (k) rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${hexOf(pal.t[k])}"/>`)
      }),
    )
    const w = Math.max(...rows.map((r) => r.length))
    // 지도의 땅 위에 — 범례 상자 빛 위에서는 그 팔레트의 옅은·짙은 기호가 묻혔다 (S14)
    const ground = `<rect x="-1" y="-1" width="${w + 2}" height="${rows.length + 2}" fill="${hexOf(pal.land)}"/>`
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ${w + 2} ${rows.length + 2}" shape-rendering="crispEdges">${ground}${rects.join('')}</svg>`
    url = `data:image/svg+xml,${encodeURIComponent(svg)}`
    cache.set(key, url)
  }
  return url
}
