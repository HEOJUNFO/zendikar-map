// 픽셀 지도가 쓰는 pixelfx core 의 형 (index.js — 원본은 JS 라 형이 없다). 효과 파일(src/pixel/fx/effects/*.js)은 JS 로 바로 부른다
export interface Frame {
  w: number
  h: number
  ox: number
  oy: number
  color: Uint32Array
  light: Uint32Array
}
export interface Painter {
  place(x: number, y: number, flip?: boolean, angle?: number): void
}
export function createFrame(w: number, h: number, ox?: number, oy?: number): Frame
export function clearFrame(f: Frame): Frame
export function painterFor(f: Frame): Painter
export function composite(f: Frame, out: Uint8ClampedArray, bg?: number | Uint32Array | null, lightK?: number): Uint8ClampedArray
export function hex(c: string): number
