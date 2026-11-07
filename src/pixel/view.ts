// 픽셀 지도의 보기 — 확대 단계, 한 픽셀의 화면 크기, 주소(?view·?lang 과 시험 스위치)
// ?view=x,y,k 는 지금 지도(useMapZoom.ts 의 readInitialView)와 같은 뜻이라 두 페이지를 오가도 같은 자리를 본다:
// k 는 세계 전체를 화면에 맞춘 배율에 대한 배수. 픽셀 지도는 정수 배율만 쓰니(소수 배율에서 픽셀이 고르지 않게 깨진다)
// k 에 가장 가까운 단계로 맞춘다.
import { isShoreStyle, type ShoreStyle } from './raster/world'
import { isPaletteId, type PaletteId } from './raster/palette'

export const MAP_W = 2400
export const MAP_H = 1700

/**
 * 확대 단계 — 한 픽셀이 몇 지도 단위인가. 한 걸음에 두 배씩, 상한은 한 픽셀 = 0.25 단위 (D4).
 * 16 은 휴대폰 개관용 (2× 픽셀로 세계가 300 CSS px). 휴대폰도 데스크톱과 같은 깊이까지 간다 (S2 결정).
 * 한 픽셀의 화면 크기(?s)는 고정이다 — 단계마다 크기를 바꾸면 픽셀 아트의 한 점 크기가 들쭉날쭉해진다
 */
export const LEVELS = [16, 8, 4, 2, 1, 0.5, 0.25] as const

/** 한 픽셀의 화면 크기 (CSS px) — 시험 스위치 ?s= */
export const PIXEL_SIZES = [1, 2, 3] as const
export type PixelSize = (typeof PIXEL_SIZES)[number]

export type Lang = 'ko' | 'en'

export interface Sandbox {
  palette: PaletteId
  size: PixelSize
  shore: ShoreStyle
  /** 바탕 지형(S4)을 그린다 — 시험 스위치 ?terrain=0 이면 S2 의 바탕만 (성능을 견줄 때) */
  terrain: boolean
}

/** 한 픽셀이 차지하는 기기 픽셀 — 정수로 맞춘다 (DPR 1.5 같은 화면에서 픽셀마다 폭이 달라지지 않게) */
export const devicePerPixel = (size: PixelSize, dpr: number) => Math.max(1, Math.round(size * dpr))

/** 화면 CSS px / 지도 단위 */
export const cssPerUnit = (level: number, size: PixelSize, dpr: number) => devicePerPixel(size, dpr) / dpr / LEVELS[level]

/** 지금 지도가 배율 1 에서 쓰는 화면 px / 지도 단위 (useMapZoom.ts 의 fitScale 과 같은 셈) */
export const fitScale = (w: number, h: number) => Math.min(w / MAP_W, h / MAP_H) || 1

export function readSandbox(search: string): Sandbox {
  const q = new URLSearchParams(search)
  const pal = q.get('pal')
  const s = Number(q.get('s'))
  const shore = q.get('shore')
  return {
    palette: isPaletteId(pal) ? pal : 'b', // S1 결정 2026-11-07 — 16비트 (docs/pixel-plan.md)
    size: (PIXEL_SIZES as readonly number[]).includes(s) ? (s as PixelSize) : 2,
    shore: isShoreStyle(shore) ? shore : 'dither',
    terrain: q.get('terrain') !== '0',
  }
}

export const readLang = (search: string): Lang => (new URLSearchParams(search).get('lang') === 'ko' ? 'ko' : 'en')

/** ?view=x,y,k — 지금 지도의 readInitialView 를 옮겨 왔다 (그 파일은 React·d3 를 끌어와 가져다 쓰지 않는다). k 의 아래 끝만 다르다 */
export function readView(search: string): { x: number; y: number; k: number } | null {
  const raw = new URLSearchParams(search).get('view')
  if (!raw) return null
  const [x, y, k] = raw.split(',').map(Number)
  if (![x, y, k].every(Number.isFinite)) return null
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  // 픽셀 지도는 세계를 다 담는 단계보다 더 축소할 수 있어 k < 1 도 쓴다 (지금 지도는 1 로 맞춘다)
  return { x: clamp(x, 0, MAP_W), y: clamp(y, 0, MAP_H), k: clamp(k, 0.01, 256) }
}

/** 화면 px / 지도 단위 가 want 에 가장 가까운 단계 (로그 거리) */
export function nearestLevel(want: number, size: PixelSize, dpr: number): number {
  let best = 0
  for (let i = 1; i < LEVELS.length; i++) {
    if (Math.abs(Math.log(cssPerUnit(i, size, dpr) / want)) < Math.abs(Math.log(cssPerUnit(best, size, dpr) / want))) best = i
  }
  return best
}

/** 세계가 화면에 다 들어오는 가장 큰 단계 (없으면 가장 작은 단계) */
export function overviewLevel(w: number, h: number, size: PixelSize, dpr: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    const c = cssPerUnit(i, size, dpr)
    if (MAP_W * c <= w && MAP_H * c <= h) return i
  }
  return 0
}

/** 지금 지도로 가는 주소 — 픽셀 지도만의 시험 스위치는 뺀다 */
export function mainMapHref(search: string, hash: string): string {
  const q = new URLSearchParams(search)
  for (const k of ['pal', 's', 'shore', 'terrain']) q.delete(k)
  // view 의 쉼표는 지금 지도가 그대로 읽으니 풀어 둔다
  const s = q.toString().replace(/%2C/g, ',')
  return `/${s ? `?${s}` : ''}${hash}`
}
