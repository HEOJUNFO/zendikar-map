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
