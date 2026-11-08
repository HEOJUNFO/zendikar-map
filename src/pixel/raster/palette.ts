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
  /**
   * 페이즈 그림 (S7) — 몫 번호(scripts/pixel/figures.mjs 의 FIG_CLASSES 차례, 1 부터)마다의 색. 0 은 비움, 16 은 둘레 윤곽.
   * 지금 지도의 map.css .fig-* (투명한 칠은 양피지 위에 섞은 색)
   */
  fig: readonly Rgb[]
  /** 그림 둘레 윤곽(16) 밖의 한 픽셀 테두리 — 밤만: 짙은 윤곽이 어두운 땅에 묻혀(1.6:1) 작은 그림이 얼룩으로 읽혔다 (S24). 윤곽·짙은 칠은 그대로 */
  figRim?: Rgb
  /** 페이지 바탕 (지도 밖) */
  page: string
  /** 머리말·단추 */
  uiBg: string
  uiInk: string
  uiEdge: string
  /** 지도 위 글자 — 대륙명, 물 이름의 글자·테두리 (S14 — 팔레트마다 바탕과 대비가 서게) */
  /** figInk — 그림 이름의 글빛 (가독성 다듬기 R24: 장소 이름과 같은 먹빛이라 주문 Sweep Away 가 호수 이름, Retreat to Coralhelm 이 마을 이름으로 읽혔다) */
  label: { continent: string; waterInk: string; waterEdge: string; figInk: string }
}

export type PaletteId = 'a' | 'b' | 'c'

/** 바탕 지형의 색 (S4, docs/pixel-plan.md) — 그림판 글자는 src/pixel/raster/sprites.ts */
export interface TerrainColors {
  /** 윤곽 */
  ink: Rgb
  /** 물 칸 위의 윤곽 (바다 표시·물 위 한 점 기호·헤드론) — 밤은 짙은 먹이 깊은 바다에 묻혀(1.08:1) 달빛 먹 (S24) */
  inkWet: Rgb
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

/** 그림 몫의 색 — fill shade stone forest sea sea-fill fire blood gold dark ink ink-bold hatch fire-ink sea-ink, 그리고 둘레 윤곽 */
const figColors = (hexes: readonly string[]): readonly Rgb[] => [[0, 0, 0], ...hexes.map((h) => hex(h))]
/** a — 지금 지도의 색 그대로 (투명한 칠은 양피지 #eae4d1 위에 섞었다) */
// 17 은 그림 안쪽의 먹선 (scripts/pixel/figures.mjs 의 INNER_INK — 객체 다듬기 B1), 18 은 밝은 칠 위의 흐린 물빛 (SEA_TINT — B93, 칠 65%·물빛 35%), 19 는 촘촘한 빗금의 중간 톤 (HATCH_TONE — 가독성 다듬기 R6, 그늘 65%·먹 35%)
const FIG_A = figColors(['#eae4d1', '#ddd3b8', '#c9c2b0', '#aac3b1', '#8d9c97', '#d9ded6', '#d19e7c', '#aa8378', '#d0bc8b', '#4a443a', '#4a443a', '#27231d', '#4a443a', '#8a4a2e', '#8d9c97', '#27231d', '#8a8170', '#cacbbd', '#a8a090', '#c2cac2', '#e6e8df', '#cacbbd', '#f0f1dc', '#bfc1b6'])
/** b — 16비트: 같은 몫을 그림판 색에 맞춰 조금 짙게 */
const FIG_B = figColors(['#f1e6c6', '#d4c094', '#b9ae98', '#6f9a6a', '#4f8fa6', '#a9cfd6', '#e2793a', '#9a3b32', '#e0b84a', '#3b2f22', '#3b2f22', '#1f170f', '#6f604b', '#8a3a1a', '#336a88', '#1f170f', '#7a6a4f', '#b2c5c2', '#95856a', '#8fbdc3', '#b9dcd6', '#b2c5c2', '#d6dcb4', '#9fa59c'])

const T16: TerrainColors = {
  ink: hex('#3b2f22'),
  inkWet: hex('#3b2f22'),
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
  // 대지 벼랑 — 땅보다 한 단 어두운 차분한 모래 그늘빛 (R31: 주황이 땅 기호 가운데 가장 짙어 사람이 만든 벽돌·그루터기로 읽혔다)
  sandSide: hex('#b39c74'),
  sandShade: hex('#87704f'),
  // 수정 — 옅은 청록 (가독성 다듬기 R15: 짙은 보랏빛 파랑이라 u1 의 Spikefields 가 푸른 풀·바코드로 읽혔다)
  crystalLight: hex('#eef9fb'),
  crystal: hex('#b5dbe6'),
  crystalShade: hex('#6f97b5'),
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
  // 헤드론 돌 — 지금 지도의 --stone(#c9c2b0)처럼 따뜻한 돌빛 (가독성 다듬기 R7: 차가운 청회색에 하늘빛 룬이라 곁의 푸른 수정과 같은 얼음·유리 조각으로 읽혔다)
  stoneLight: hex('#e0d6bf'),
  stone: hex('#b3a68a'),
  stoneShade: hex('#7c6f58'),
  // 룬 — 흐린 따뜻한 금빛 (R23: 하늘빛이라 곁의 수정과 같은 얼음·유리로 읽혔다)
  rune: hex('#ead9a6'),
  // 흰 가루는 눈(#f6f7f2)과 갈리게 순백을 피한다. 차가운 백악빛 (가독성 다듬기 R20: 이름 테·UI 의 크림과 같은 빛이라 빈 양피지로 읽히고 이름 테가 묻혔다), 바람결은 짙게
  dust: hex('#efede6'),
  dustShade: hex('#dcd9cf'),
  dustInk: hex('#8a8170'),
  chalk: hex('#dcd8cc'),
  chalkShade: hex('#c4bfb0'),
  chalkInk: hex('#7d7566'),
  // 죽은 금속 — 중성 강철빛 (가독성 다듬기 R13: 푸른 잿빛이라 할리마르 곁의 언 못으로, 떨어진 하늘거주지가 얼음에 갇힌 배로 읽혔다)
  metal: hex('#cfccc4'),
  metalShade: hex('#a9a59b'),
  seam: hex('#5f5b54'),
  sinew: hex('#a3352e'),
  oil: hex('#231f22'),
  drybed: hex('#b8a27a'),
  drybedShade: hex('#a08a63'),
  crack: hex('#6f5a3c'),
  salt: hex('#ebe3cf'),
  // 죽은 숲 — 바랜 밝은 잿빛 (가독성 다듬기 R8: 중간 올리브 잿빛이라 안개·갯벌·고원으로 읽히고 죽은 나무 획이 긁힌 자국 같았다. 지금 지도는 바랜 밝은 땅에 또렷한 먹 나무).
  // 흰 가루(#e8e3d3)보다 한 단 어둡고 푸르스름해 갈린다
  dead: hex('#d0ccb5'),
  deadShade: hex('#bdb89f'),
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
    // 양피지 — 강은 지금 지도의 물빛 먹 쪽으로(먼 바다 빛이면 땅과 1.27:1 이었다), 흰 가루·백악은 따뜻한 양피지와 갈리는 찬 잿빛 (S14)
    t: {
      ...tint(T16, 0.35, hex('#eae4d1')),
      ink: hex('#4a443a'),
      inkWet: hex('#4a443a'),
      water: hex('#5f8794'),
      // 작은 헤드론은 윤곽 없이 면만이라 섞은 돌빛이 양피지 바다에 묻혔다(1.29:1) — 짙은 돌빛 (S24). 따뜻한 돌로 (R7)
      stone: hex('#a1937a'),
      stoneShade: hex('#6c604f'),
      // 죽은 금속 땅 — 섞은 잿빛이 양피지 바다(#c4cec7…)와 같아 할리마르 곁의 못으로 읽혔다. 지금 지도의 --period-metal 처럼 바다보다 희고, 이음매는 짙게 (S24)
      metal: hex('#e6e4de'),
      metalShade: hex('#d6d3cb'),
      seam: hex('#5f5b54'),
      dust: hex('#cfcac0'),
      dustShade: hex('#bdb7aa'),
      dustInk: hex('#7d7566'),
      chalk: hex('#c2bcb0'),
      chalkShade: hex('#aea898'),
      chalkInk: hex('#7d7566'),
    },
    fig: FIG_A,
    page: '#c4cec7',
    uiBg: '#f1ece0', // --panel
    uiInk: '#27231d', // --ink
    uiEdge: '#c8bea5', // --panel-edge
    // 지금 지도의 --ink · --sea-label (S14 — 테두리 빛 #c8bea5 로는 땅과 1.45:1 이었다)
    label: { continent: '#4a443a', waterInk: '#425b5c', waterEdge: '#e6e8df', figInk: '#6a4326' },
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
    fig: FIG_B,
    page: '#29506d',
    uiBg: '#e8dcb8',
    uiInk: '#2b2117',
    uiEdge: '#3b2f22',
    label: { continent: '#3b2f22', waterInk: '#b9dcd6', waterEdge: '#29506d', figInk: '#6a3a18' },
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
    // 밤 — 단애 빗금과 강은 어두운 땅 위에서 보이게 밝게 (S14 — 섞은 빛은 땅과 1.02:1·1.2:1 이었다)
    // 나무·갈대 기호도 달빛에 (S19 — 섞은 빛은 어두운 땅에서 1.2–1.5:1 이라 하그라 늪이 빈 들로 읽혔다)
    t: {
      ...tint(T16, 0.55, hex('#0d1322')),
      ink: hex('#08080d'),
      inkWet: hex('#5b7aa3'),
      lava: hex('#e2572a'),
      lavaHot: hex('#ffcc4a'),
      rune: hex('#d9c48e'),
      hatch: hex('#b0a283'),
      water: hex('#5fa3bd'),
      leafLight: hex('#93bf7e'),
      leaf: hex('#649a5e'),
      leafShade: hex('#41704a'),
      trunk: hex('#8c6d4d'),
      reed: hex('#93ad62'),
    },
    // 밤 — 16비트 색을 밤빛으로 섞고, 그림의 먹선(ink·ink-bold)은 달빛 먹, 둘레 윤곽(16)과 짙은 칠(10 dark — 눈·입·구멍)은 그대로 짙게
    // (S14 — 검은 먹이 어두운 땅에 묻혔다. 검토: dark 는 칠이라 밝히면 구멍이 밝은 덩이로 읽혔다)
    fig: FIG_B.map((c, i) => (i === 16 || i === 10 ? hex('#08080d') : i === 11 || i === 12 ? hex('#c9d3e6') : i === 17 ? hex('#8d97ad') : ([0, 1, 2].map((j) => Math.round(c[j] * 0.6 + [13, 19, 34][j] * 0.4)) as unknown as Rgb))),
    figRim: hex('#7d88a3'),
    page: '#0d1322',
    uiBg: '#1c2a49',
    uiInk: '#dfe6f2',
    uiEdge: '#3f5f86',
    label: { continent: '#a9bdd9', waterInk: '#9fc3e6', waterEdge: '#0d1322', figInk: '#e8c58a' },
  },
}

export const isPaletteId = (v: string | null): v is PaletteId => v === 'a' || v === 'b' || v === 'c'
