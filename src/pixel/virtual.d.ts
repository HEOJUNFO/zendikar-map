// vite/pixelMarks.ts 가 만드는 조각
declare module 'virtual:pixel-marks' {
  const marks: import('./marks/slim').PixelMarks
  export default marks
}

// vite/pixelTerrain.ts 가 만드는 조각
declare module 'virtual:pixel-terrain' {
  const terrain: import('./raster/terrain').PixelTerrain
  export default terrain
}

// vite/pixelTerrain.ts — 깊은 확대(한 픽셀 0.25 단위)의 다시 뿌린 기호
declare module 'virtual:pixel-terrain-fine' {
  const fine: import('./raster/terrain').PixelTerrainFine
  export default fine
}

// vite/pixelTerrain.ts — 시점별 바탕 (S6): Worker 가 받는 단계마다의 몫
declare module 'virtual:pixel-period-2' {
  const p: import('./raster/period').PixelPeriod
  export default p
}
declare module 'virtual:pixel-period-3' {
  const p: import('./raster/period').PixelPeriod
  export default p
}
declare module 'virtual:pixel-period-4' {
  const p: import('./raster/period').PixelPeriod
  export default p
}
declare module 'virtual:pixel-period-5' {
  const p: import('./raster/period').PixelPeriod
  export default p
}
declare module 'virtual:pixel-period-8' {
  const p: import('./raster/period').PixelPeriod
  export default p
}

// 시점(보이는 것)과 단계마다의 주 스레드 몫 — 바뀐 자리 상자, 장소 표시 바꿈, 물빛 테두리를 떼는 물 이름
declare module 'virtual:pixel-times' {
  const times: import('./time').PixelTimes
  export default times
}

// 장소마다의 '이 무렵' (패널을 열 때)
declare module 'virtual:pixel-period-notes' {
  const notes: Record<string, Record<string, import('./time').PeriodNoteSlim[]>>
  export default notes
}

// vite/pixelFigures.ts — 페이즈 그림 (S7): 카드·자리·시점마다의 그림 차례와 그림 조각을 불러오는 함수 표
declare module 'virtual:pixel-figures' {
  const meta: import('./figures/store').FigureMeta
  export default meta
  export const chunks: import('./figures/store').ChunkLoaders
}
