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
