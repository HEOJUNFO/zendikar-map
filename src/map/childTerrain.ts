// 자식 지도의 지형 기호 — 화가가 그린 다각형 안에 세계 지도와 같은 산·언덕·숲·늪·협곡 기호를 흩뿌린다.
// 기호는 세계 지도의 모양 그대로, 자식 지도 축척에 맞게 glyphScale 배로 키워 그린다.
import { hashSeed, mulberry32, pointInRing, poissonDisk, valueNoise2D, type Point } from './geometry'
import { canyonGlyph, hillGlyph, marshGlyph, mountainGlyph, treeGlyph } from './terrain'

export type ChildTerrainKind = 'mountain' | 'hill' | 'forest' | 'swamp' | 'canyon'

export interface ChildTerrainArea {
  kind: ChildTerrainKind
  /** 자식 지도 단위의 다각형 */
  points: readonly Point[]
  /** 기호 밀도 배수 (1 = 기본) */
  density?: number
}

export interface ChildTerrain {
  /** 기호 공간(자식 단위 ÷ glyphScale)의 path — 그리는 쪽에서 scale(glyphScale) 로 키운다.
   *  산은 위에서 아래로 띠마다 채움·해칭·능선을 차례로 그려, 앞(아래)의 봉우리가 뒤를 가린다 */
  mountains: { fill: string; ridge: string; hatch: string }[]
  treeCrowns: string
  treeTrunks: string
  marsh: string
  canyons: string
}

/** 기호 사이 기본 간격 (기호 공간 단위) — 세계 지도와 비슷하게 */
const SPACING: Record<ChildTerrainKind, number> = { mountain: 13, hill: 14, forest: 6.5, swamp: 15, canyon: 17 }

export function buildChildTerrain(areas: readonly ChildTerrainArea[], seed: string, glyphScale: number): ChildTerrain {
  const out: ChildTerrain = { mountains: [], treeCrowns: '', treeTrunks: '', marsh: '', canyons: '' }
  const bands = new Map<number, { fill: string; ridge: string; hatch: string }>()
  const flow = valueNoise2D(hashSeed(`${seed}:flow`), 140)
  areas.forEach((area, i) => {
    const ring = area.points.map(([x, y]) => [x / glyphScale, y / glyphScale] as Point)
    if (ring.length < 3) return
    const xs = ring.map((p) => p[0])
    const ys = ring.map((p) => p[1])
    const bounds = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
    const rand = mulberry32(hashSeed(`${seed}:${i}:${area.kind}`))
    const spacing = SPACING[area.kind] / Math.sqrt(area.density ?? 1)
    const pts = poissonDisk(bounds, spacing, rand, (x, y) => pointInRing(x, y, ring))
    // 시작점은 기호 간격 5배마다 하나라, 좁은 칸은 시작점을 못 받아 통째로 비기도 한다 — 칸 모양·차례를 바꿔 다시 본다
    if (import.meta.env.DEV && pts.length === 0) console.warn(`자식 지도 '${seed}' 지형 칸 ${i}(${area.kind})에 기호가 하나도 없다`)
    // 위에서 아래로 그려야 앞(아래)의 기호가 뒤를 덮는다
    pts.sort((a, b) => a[1] - b[1])
    for (const [x, y] of pts) {
      if (area.kind === 'mountain' || area.kind === 'hill') {
        const g = area.kind === 'mountain' ? mountainGlyph(x, y, rand) : hillGlyph(x, y, rand)
        const key = Math.floor(y / 6)
        const band = bands.get(key) ?? { fill: '', ridge: '', hatch: '' }
        band.fill += g.fill
        band.ridge += g.ridge
        band.hatch += g.hatch
        bands.set(key, band)
      } else if (area.kind === 'forest') {
        const g = treeGlyph(x, y, rand)
        out.treeCrowns += g.crown
        out.treeTrunks += g.trunk
      } else if (area.kind === 'swamp') {
        out.marsh += marshGlyph(x, y, rand).join('')
      } else {
        out.canyons += canyonGlyph(x, y, flow(x, y) * Math.PI * 2.4, rand).join('')
      }
    }
  })
  out.mountains = [...bands.entries()].sort((a, b) => a[0] - b[0]).map(([, b]) => b)
  return out
}
