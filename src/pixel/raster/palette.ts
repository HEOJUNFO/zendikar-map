// 픽셀 지도의 팔레트 시험안 (S1 — 사용자가 휴대폰에서 보고 고른다, docs/pixel-plan.md).
// a 는 지금 지도의 양피지 토큰(src/index.css)에서 그대로 따 왔고, b·c 는 픽셀 아트다운 다른 길이다.
// S1 결정(2026-11-07): 기본은 b(16비트). a·c 는 ?pal= 로 남겨 둔다.

export type Rgb = readonly [number, number, number]

export interface Palette {
  id: PaletteId
  /** 시험 단추에 쓰는 이름 */
  name: { ko: string; en: string }
  /** 먼 바다 → 해안 쪽 (물가 띠 셋) */
  deep: Rgb
  mid: Rgb
  shallow: Rgb
  /** 해안 바로 앞 한 줄 (물거품) */
  foam: Rgb
  land: Rgb
  /** 땅 안의 얼룩 (디더링으로 섞는다) */
  landShade: Rgb
  /** 해안선 */
  coast: Rgb
  forest: Rgb
  forestShade: Rgb
  forestEdge: Rgb
  /** 페이지 바탕 (지도 밖) */
  page: string
  /** 머리말·단추 */
  uiBg: string
  uiInk: string
  uiEdge: string
}

export type PaletteId = 'a' | 'b' | 'c'

const hex = (h: string): Rgb => {
  const v = parseInt(h.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

export const PALETTES: Record<PaletteId, Palette> = {
  a: {
    id: 'a',
    name: { ko: '양피지', en: 'Parchment' },
    deep: hex('#c4cec7'),
    mid: hex('#cfd6cf'),
    shallow: hex('#d9ded6'), // --sea
    foam: hex('#e6e8df'),
    land: hex('#eae4d1'), // --vellum
    landShade: hex('#ddd3b8'), // --vellum-shade
    coast: hex('#4a443a'), // --ink-relief
    forest: hex('#8fb5a4'), // --forest
    forestShade: hex('#7aa391'),
    forestEdge: hex('#4d7364'), // --forest-ink
    page: '#c4cec7',
    uiBg: '#f1ece0', // --panel
    uiInk: '#27231d', // --ink
    uiEdge: '#c8bea5', // --panel-edge
  },
  b: {
    id: 'b',
    name: { ko: '16비트', en: '16-bit' },
    deep: hex('#29506d'),
    mid: hex('#336a88'),
    shallow: hex('#4f8fa6'),
    foam: hex('#b9dcd6'),
    land: hex('#cdb98a'),
    landShade: hex('#b8a372'),
    coast: hex('#3b2f22'),
    forest: hex('#4f7d4a'),
    forestShade: hex('#3f6a3d'),
    forestEdge: hex('#2c4a2e'),
    page: '#29506d',
    uiBg: '#e8dcb8',
    uiInk: '#2b2117',
    uiEdge: '#3b2f22',
  },
  c: {
    id: 'c',
    name: { ko: '밤', en: 'Night' },
    deep: hex('#0d1322'),
    mid: hex('#131c33'),
    shallow: hex('#1c2a49'),
    foam: hex('#3f5f86'),
    land: hex('#3b3a47'),
    landShade: hex('#33323e'),
    coast: hex('#08080d'),
    forest: hex('#244232'),
    forestShade: hex('#1c3628'),
    forestEdge: hex('#10201a'),
    page: '#0d1322',
    uiBg: '#1c2a49',
    uiInk: '#dfe6f2',
    uiEdge: '#3f5f86',
  },
}

export const isPaletteId = (v: string | null): v is PaletteId => v === 'a' || v === 'b' || v === 'c'
