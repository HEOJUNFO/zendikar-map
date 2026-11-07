// vite/pixelMarks.ts 가 만드는 조각
declare module 'virtual:pixel-marks' {
  const marks: import('./marks/slim').PixelMarks
  export default marks
}
