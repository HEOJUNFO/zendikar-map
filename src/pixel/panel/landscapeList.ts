// 패널의 바탕 지형 목록 — 대륙 지형 파일에서 패널이 쓰는 몫(이름·종류·추정·이은 곳·한 점 기호의 자리)만.
// 빌드할 때 vite/pixelTerrain.ts 가 이 셈을 Node 에서 돌려 `virtual:pixel-landscape-panel` 로 싣는다 (S25 — 패널 조각이 지형 파일의 좌표까지 끌어와 약 100KB 였다)
import type { ContinentId, Landscape } from '../../data/types'
import type { PanelFeature } from './data'

export function panelLandscape(landscapeFiles: [ContinentId, Landscape][]): PanelFeature[] {
  return landscapeFiles.flatMap(([continentId, l]) =>
    [
      ...(l.areas ?? []).map((f) => ({ f, kind: f.kind as string })),
      ...(l.rivers ?? []).map((f) => ({ f, kind: 'river' })),
      ...(l.lines ?? []).map((f) => ({ f, kind: f.kind as string })),
      ...(l.glyphs ?? []).map((f) => ({ f, kind: f.kind as string })),
      ...(l.sea ?? []).map((f) => ({ f, kind: f.kind as string })),
    ].map(({ f, kind }) => ({
      id: f.id,
      ...(f.label ? { label: f.label } : {}),
      kind,
      ...(f.estimate ? { estimate: f.estimate } : {}),
      ...(f.location ? { location: f.location } : {}),
      ...('at' in f && f.at && !('extent' in f && f.extent) ? { at: f.at as [number, number] } : {}),
      continentId,
    })),
  )
}

/** 지금 지도의 대륙 파일 차례 (src/data/index.ts 의 landscapeFiles) — 파일 이름과 대륙 id */
export const LANDSCAPE_FILES: [ContinentId, string][] = [
  ['sejiri', 'sejiri'],
  ['akoum', 'akoum'],
  ['tazeem', 'tazeem'],
  ['murasa', 'murasa'],
  ['ondu', 'ondu'],
  ['guul-draz', 'guul-draz'],
  ['bala-ged', 'bala-ged'],
]
