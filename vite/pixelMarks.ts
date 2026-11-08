import { statSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { Plugin } from 'vite'

/**
 * 픽셀 지도(/pixel)의 `virtual:pixel-marks` — 장소·대지 카드·대륙의 이름과 자리만 담은 작은 조각 (src/pixel/marks/slim.ts).
 * 원본(src/data/locations.ts·cards.ts·continents.ts)은 설명·근거 글이 길어 첫 화면에 싣지 않는다 — 패널을 열 때 받는다.
 * 원본을 고치면 다시 뽑는다 (개발 서버는 그 파일을 지켜보다 이 조각을 다시 싣는다). 지금 지도는 이 조각을 쓰지 않는다
 */
export function pixelMarks(): Plugin {
  const ID = 'virtual:pixel-marks'
  const RESOLVED = '\0' + ID
  const file = (p: string) => fileURLToPath(new URL(`../src/${p}`, import.meta.url))
  const SOURCES = ['data/locations.ts', 'data/cards.ts', 'data/continents.ts', 'pixel/marks/slim.ts', 'data/timeline.ts', 'data/sagas.ts'].map(file)
  const load = async (path: string) => import(`${pathToFileURL(path).href}?t=${statSync(path).mtimeMs}`)
  return {
    name: 'pixel-marks',
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    async load(id) {
      if (id !== RESOLVED) return
      for (const f of SOURCES) this.addWatchFile(f)
      const [{ locations }, { LAND_CARDS }, { continents }, { slimMarks }, { landAt, SHOWN_TIME_POINTS }] = await Promise.all(SOURCES.map(load))
      // 사가에 매인 대지 카드는 그 카드가 나오는 시점에만 (S6 — 보이는 시점)
      const timesOf = (c: { saga?: number; sagaPhase?: number }) => SHOWN_TIME_POINTS.filter((t: number) => landAt(c, t))
      return `export default ${JSON.stringify(slimMarks(locations, LAND_CARDS, continents, timesOf))}`
    },
  }
}
