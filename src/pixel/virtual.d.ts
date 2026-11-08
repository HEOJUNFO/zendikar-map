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
// 그 무렵 칠 자리 (S23 — 단계마다, 칠이 없으면 null)
declare module 'virtual:pixel-period-wash' {
  const wash: Record<string, { cell: number; rows: number[][] } | null>
  export default wash
}
// 패널의 '지도에 그린 지형' 가운데 그 무렵의 몫 (S22 — 단계마다)
declare module 'virtual:pixel-period-features' {
  const features: Record<string, import('./panel/data').PeriodPanelSlim>
  export default features
}
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

// vite/pixelTerrain.ts — 지역 상세 (S9): 범위·이름·칸, 지역 상세마다의 그림 조각을 불러오는 함수 표(Worker 만), 그림 조각 (보기마다의 몫 번호 그림)
declare module 'virtual:pixel-children' {
  const meta: import('./raster/child').ChildMeta
  export default meta
}
// 떠 있는 헤드론이 이름을 비키는 셈의 입력 (S20, scripts/pixel/terrain.mjs 의 hedronYield)
declare module 'virtual:pixel-hedrons' {
  const data: import('./hedrons').PixelHedronYield
  export default data
}
// 지역 상세 손그림의 잉크 자리 (S16, scripts/pixel/childink.mjs)
declare module 'virtual:pixel-ink' {
  const ink: import('./labels/ink').ChildInk
  export default ink
}
declare module 'virtual:pixel-child-images' {
  const images: import('./raster/child').ChildImageLoaders
  export default images
}
declare module 'virtual:pixel-child-*' {
  const images: string[]
  export default images
}
