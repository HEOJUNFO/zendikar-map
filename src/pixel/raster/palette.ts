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
  /** 바탕 지형 (S4) — 지형 기호 그림판의 글자와 채색 영역·강·단애 */
  t: TerrainColors
  /** 페이지 바탕 (지도 밖) */
  page: string
  /** 머리말·단추 */
  uiBg: string
  uiInk: string
  uiEdge: string
}

export type PaletteId = 'a' | 'b' | 'c'

/** 바탕 지형의 색 (S4, docs/pixel-plan.md) — 그림판 글자는 src/pixel/raster/sprites.ts */
export interface TerrainColors {
  /** 윤곽 */
  ink: Rgb
  rockLight: Rgb
  rock: Rgb
  rockShade: Rgb
  snow: Rgb
  snowShade: Rgb
  leafLight: Rgb
  leaf: Rgb
  leafShade: Rgb
  trunk: Rgb
  reed: Rgb
  sand: Rgb
  sandSide: Rgb
  sandShade: Rgb
  crystalLight: Rgb
  crystal: Rgb
  crystalShade: Rgb
  ice: Rgb
  iceShade: Rgb
  lava: Rgb
  lavaHot: Rgb
  ember: Rgb
  /** 용암 들판 칠 (식은 겉) */
  lavaCrust: Rgb
  tuft: Rgb
  water: Rgb
  foam: Rgb
  steam: Rgb
  smoke: Rgb
  void: Rgb
  /** 협곡 바닥 칠 */
  gorge: Rgb
  /** 단애 빗금 */
  hatch: Rgb
  stoneLight: Rgb
  stone: Rgb
  stoneShade: Rgb
  rune: Rgb
  /** 시점별 바탕 (S6) — 흰 가루 평원·백악·죽은 금속 평원·물이 빠진 바닥·죽은 숲의 칠과 그 무늬 */
  dust: Rgb
  dustShade: Rgb
  dustInk: Rgb
  chalk: Rgb
  chalkShade: Rgb
  chalkInk: Rgb
  metal: Rgb
  metalShade: Rgb
  seam: Rgb
  sinew: Rgb
  oil: Rgb
  drybed: Rgb
  drybedShade: Rgb
  crack: Rgb
  salt: Rgb
  dead: Rgb
  deadShade: Rgb
  bark: Rgb
  barkShade: Rgb
}

const hex = (h: string): Rgb => {
  const v = parseInt(h.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

const T16: TerrainColors = {
  ink: hex('#3b2f22'),
  rockLight: hex('#e3d6b8'),
  rock: hex('#a8987a'),
  rockShade: hex('#6f604b'),
  snow: hex('#f6f7f2'),
  snowShade: hex('#b4c4cf'),
  leafLight: hex('#79a85a'),
  leaf: hex('#4f7d4a'),
  leafShade: hex('#2f5232'),
  trunk: hex('#5a3d24'),
  reed: hex('#6f8a3a'),
  sand: hex('#e6c387'),
  sandSide: hex('#b8804c'),
  sandShade: hex('#7d5332'),
  crystalLight: hex('#e4f6ff'),
  crystal: hex('#93bde8'),
  crystalShade: hex('#5a6fb0'),
  ice: hex('#e8f3f5'),
  iceShade: hex('#a6c3cf'),
  lava: hex('#e2572a'),
  lavaHot: hex('#ffcc4a'),
  ember: hex('#7a2a1a'),
  lavaCrust: hex('#5b3a30'),
  tuft: hex('#8f9663'),
  water: hex('#4f8fa6'),
  foam: hex('#cfe8e2'),
  steam: hex('#f2f1ea'),
  smoke: hex('#8c8781'),
  void: hex('#1a1410'),
  gorge: hex('#a68f62'),
  hatch: hex('#7a6748'),
  stoneLight: hex('#c9d2d6'),
  stone: hex('#8f9ba3'),
  stoneShade: hex('#5c6870'),
  rune: hex('#9fe3f0'),
  // 흰 가루는 눈(#f6f7f2)과 갈리게 순백을 피한다
  dust: hex('#e8e3d3'),
  dustShade: hex('#d3ccb8'),
  dustInk: hex('#a9a08a'),
  chalk: hex('#dcd8cc'),
  chalkShade: hex('#c4bfb0'),
  chalkInk: hex('#7d7566'),
  metal: hex('#c3c9c8'),
  metalShade: hex('#9fa7a8'),
  seam: hex('#5e676b'),
  sinew: hex('#a3352e'),
  oil: hex('#231f22'),
  drybed: hex('#b8a27a'),
  drybedShade: hex('#a08a63'),
  crack: hex('#6f5a3c'),
  salt: hex('#ebe3cf'),
  dead: hex('#9f9a7f'),
  deadShade: hex('#8a8569'),
  bark: hex('#7d7466'),
  barkShade: hex('#4f483f'),
}

/** 다른 팔레트의 지형 색 — 16비트 색을 그 팔레트 쪽으로 섞는다 (시험 스위치라 손으로 고르지 않았다) */
const tint = (t: TerrainColors, k: number, toward: Rgb): TerrainColors =>
  Object.fromEntries(
    Object.entries(t).map(([key, c]: [string, Rgb]) => [key, [0, 1, 2].map((i) => Math.round(c[i] * (1 - k) + toward[i] * k)) as unknown as Rgb]),
  ) as unknown as TerrainColors

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
    t: { ...tint(T16, 0.35, hex('#eae4d1')), ink: hex('#4a443a'), water: hex('#c4cec7') },
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
    t: T16,
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
    t: { ...tint(T16, 0.55, hex('#0d1322')), ink: hex('#08080d'), lava: hex('#e2572a'), lavaHot: hex('#ffcc4a'), rune: hex('#9fe3f0') },
    page: '#0d1322',
    uiBg: '#1c2a49',
    uiInk: '#dfe6f2',
    uiEdge: '#3f5f86',
  },
}

export const isPaletteId = (v: string | null): v is PaletteId => v === 'a' || v === 'b' || v === 'c'
