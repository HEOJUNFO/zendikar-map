// 장소·대지 카드 기호 — 7×7 픽셀 그림 (지금 지도의 src/map/glyphs.ts 의 MARKER_PATHS 와 같은 뜻: 집·무너진 아치·마름모·떠 있는 판석·땅속 입구).
// 둘레에 밝은 한 픽셀 테두리를 둘러(9×9) 바다·숲·땅 어디서나 보이게 한다. 한 기호 픽셀 = 화면 2px (지도의 한 픽셀과 같은 크기)
// 카드 표시는 장소 표시와 같은 기호다 (지금 지도와 같다). 이 지도가 자리를 고른(추정) 것도 모양이 같다 — '추정'은 패널에만
import type { MarkKind } from './slim'

// # 먹, o 칠, s 돌(하늘 판석의 몸통), . 빈칸
const ART: Record<MarkKind, string[]> = {
  settlement: ['...#...', '..#o#..', '.#ooo#.', '#######', '.#ooo#.', '.#o#o#.', '.#####.'],
  ruin: ['..##...', '.#..#..', '#.....#', '#.###.#', '#.#.#.#', '#.#.#.#', '#######'],
  landmark: ['...#...', '..###..', '.##o##.', '###o###', '.##o##.', '..###..', '...#...'],
  sky: ['.#####.', '.......', '#######', '#sssss#', '.#sss#.', '..###..', '.......'],
  underground: ['..###..', '.#####.', '###.###', '##...##', '##...##', '##...##', '#######'],
}

export const SPRITE_CELLS = 9
/** 기호 한 픽셀의 화면 크기 (CSS px) */
export const SPRITE_PX = 2

export interface SpriteColors {
  ink: string
  fill: string
  stone: string
  halo: string
}

/** 9×9 칸마다의 색 (없으면 빈칸) — 7×7 그림 둘레 8 이웃에 테두리 */
function cells(kind: MarkKind, c: SpriteColors): (string | null)[][] {
  const art = ART[kind]
  const grid: (string | null)[][] = Array.from({ length: SPRITE_CELLS }, () => Array(SPRITE_CELLS).fill(null))
  art.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch !== '.') grid[y + 1][x + 1] = ch === '#' ? c.ink : ch === 's' ? c.stone : c.fill
    }),
  )
  const solid = grid.map((r) => r.map((v) => v !== null))
  for (let y = 0; y < SPRITE_CELLS; y++)
    for (let x = 0; x < SPRITE_CELLS; x++) {
      if (solid[y][x]) continue
      let near = false
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1 && !near; dx++) near = Boolean(solid[y + dy]?.[x + dx])
      if (near) grid[y][x] = c.halo
    }
  return grid
}

const cache = new Map<string, string>()

/** 기호 그림의 data: 주소 (SVG — 칸마다 사각형, 가장자리를 흐리지 않는다) */
export function spriteUrl(kind: MarkKind, c: SpriteColors): string {
  const key = `${kind}|${c.ink}|${c.fill}|${c.stone}|${c.halo}`
  let url = cache.get(key)
  if (!url) {
    const rects: string[] = []
    cells(kind, c).forEach((row, y) => row.forEach((v, x) => v && rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${v}"/>`)))
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SPRITE_CELLS} ${SPRITE_CELLS}" shape-rendering="crispEdges">${rects.join('')}</svg>`
    url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
    cache.set(key, url)
  }
  return url
}
