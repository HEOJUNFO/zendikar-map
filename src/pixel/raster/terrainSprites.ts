// 바탕 지형의 손으로 찍은 그림 (S4, docs/pixel-plan.md) — 한 글자 = 지도 한 픽셀(화면 2px). 8×8 이 기본이다.
// 글자는 palette.ts 의 TerrainColors 를 가리킨다 (아래 INK). '.' 는 비움, '%' 는 그림자 — 윤곽색을 바둑판으로 한 칸 건너 찍는다.
// 기준점(ax, ay)이 기호의 밑동 자리 픽셀에 온다 — 흩뿌린 기호·한 점 기호는 밑동(대개 맨 아랫줄의 가운데), 바다 표시는 가운데.
// scripts/qa/pixel-terrain.mjs 의 --sheet 가 이 판을 한 장으로 그린다.
import type { TerrainColors } from './palette'

export interface Sprite {
  rows: readonly string[]
  ax: number
  ay: number
}

export const INK: Record<string, keyof TerrainColors> = {
  k: 'ink',
  R: 'rockLight',
  r: 'rock',
  d: 'rockShade',
  w: 'snow',
  W: 'snowShade',
  g: 'leafLight',
  G: 'leaf',
  q: 'leafShade',
  t: 'trunk',
  m: 'reed',
  s: 'sand',
  z: 'sandSide',
  Z: 'sandShade',
  c: 'crystalLight',
  C: 'crystal',
  x: 'crystalShade',
  i: 'ice',
  I: 'iceShade',
  l: 'lava',
  L: 'lavaHot',
  e: 'ember',
  u: 'tuft',
  b: 'water',
  f: 'foam',
  y: 'steam',
  o: 'smoke',
  K: 'void',
  '%': 'ink',
  // 시점별 바탕 (S6)
  a: 'dust',
  A: 'dustShade',
  h: 'dustInk',
  j: 'chalk',
  J: 'chalkShade',
  n: 'chalkInk',
  p: 'metal',
  P: 'metalShade',
  v: 'seam',
  V: 'sinew',
  O: 'oil',
  B: 'drybed',
  D: 'drybedShade',
  E: 'crack',
  S: 'salt',
  F: 'dead',
  H: 'deadShade',
  T: 'bark',
  U: 'barkShade',
}

// 기준점은 가운데 (짝수 폭이면 가운데 둘 가운데 왼쪽) — 1–3 픽셀의 작은 무늬도 그 기호의 픽셀에 온다
const ground = (rows: string[], ax = Math.floor((rows[0].length - 1) / 2)): Sprite => ({ rows, ax, ay: rows.length - 1 })
const middle = (rows: string[]): Sprite => ({ rows, ax: Math.floor((rows[0].length - 1) / 2), ay: Math.floor((rows.length - 1) / 2) })

/** 흩뿌린 기호 — 지금 지도의 GLYPH_KINDS (src/map/glyphSpans.ts) 마다. 둘 이상이면 자리로 하나를 고른다 */
export const GLYPH_SPRITES: Record<string, readonly Sprite[]> = {
  peak: [
    ground(['...kk...', '..kRdk..', '..kRrdk.', '.kRrrdk.', '.kRrrddk', 'kRrrrddk', 'kRrrdddk', 'kkkkkkkk']),
    ground(['....k...', '...kRk..', '.k.kRdk.', 'kRkRrdk.', 'kRRrrddk', 'kRrrrddk', 'kRrrdddk', 'kkkkkkkk']),
  ],
  snow: [ground(['...kk...', '..kwWk..', '..kwwWk.', '.kRwWdk.', '.kRrrddk', 'kRrrrddk', 'kRrrdddk', 'kkkkkkkk'])],
  hill: [ground(['..kkkk..', '.kRRrdk.', 'kRrrrddk', 'kkkkkkkk'])],
  mesa: [ground(['.kkkkkk.', 'kssssssk', 'kzzzzzZk', 'kzzzzZZk', 'kzzzZZZk', 'kkkkkkkk'])],
  'crystal-spire': [ground(['...k....', '..kck...', '..kcxk..', '..kcxk..', '.kccCxk.', '.kcCCxk.', '.kcCxxk.', '..kkkk..'])],
  crystal: [ground(['..k.....', '.kck.k..', '.kCkkck.', 'kcCxkCxk', 'kcCxkCxk', 'kcCxkCxk', '.kCxkCk.', '..kkkkk.'])],
  tree: [
    ground(['..kkkk..', '.kgggGk.', 'kgggGGqk', 'kggGGqqk', 'kgGGqqqk', '.kqqqqk.', '..kttk..', '...kk...']),
    ground(['...kk...', '..kggk..', '.kgGGqk.', '.kgGGqk.', 'kgGGqqqk', 'kGGqqqqk', '.kkttkk.', '...kk...']),
  ],
  mangrove: [ground(['.kkkkk..', 'kgGGGqk.', 'kGGqqqk.', '.kqqqk..', '..ktk...', '.kt.tk..', 'kt...tk.', 'b.bbb.b.'])],
  marsh: [ground(['..m.m...', 'm.m.m.m.', '.mmmmm..', '..mmm...', 'bbbbbbb.'])],
  ice: [ground(['iiiiii..', '.IIIIII.'], 1)],
  canyon: [middle(['kkkk....', '..dkkk..', '..d.dkkk', '....d.d.'])],
  lava: [middle(['...e....', '..eLe...', '.elLLle.', '..elle..', '...e....'])],
  tundra: [ground(['..u.u...', '.u.u.u..', '..uuu...'])],
  // 시점별 바탕 (S6) — 흰 가루의 바람결과 가루 점, 백악 갈라짐, 물이 빠진 바닥(갈라진 진흙 칸 셋에 기하 무늬 하나 — 데이터의 craze 0.25 만큼),
  // 죽은 나무(선 나무·쓰러진 줄기), 죽은 금속판의 이음매
  dust: [ground(['..hh....', 'hh..hhh.']), ground(['h...h...', '..h...h.'])],
  chalk: [ground(['n..n....', '.nn.nn.n', '.....n..'])],
  drybed: [
    ground(['.EEE.E.', 'E...E.E', 'E..EE.E', '.EE..E.']),
    ground(['E.EE.E.', '.E..E.E', 'EE.E..E', '..E.EE.']),
    ground(['.E.EEE.', 'E.E...E', '.E.E.E.', 'E...E..']),
    ground(['..E..E.', '.E.EE.E', 'E.E..E.', '.E.EE.E']),
  ],
  deadwood: [ground(['.T...T.', '..T.T.T', 'T.TTT..', '.T.T...', '...T...', '...U...', '..UTU..']), ground(['..T....', 'TTTTTU.', '.UUUU..'])],
  metal: [middle(['v...v...', 'vvvvvvvv', '..v...v.'])],
}

/**
 * 크게 보이는 단계(한 픽셀 ≤ 0.5 단위 — LARGE_FROM)의 흩뿌린 기호 — 지금 지도의 기호는 지도 단위로 커지는데 8 픽셀 그림은 그 단계에서 지금 지도의 절반이었다 (객체 다듬기 A7~).
 * 나무: 지금 지도의 treeGlyph 처럼 둥근 수관 세 덩이(위·왼쪽·오른쪽)와 가는 줄기 — 덩이 사이 경계는 잎 그늘, 바깥 둘레는 먹. 밑동은 지금 지도처럼 수관 가운데 아래
 * (scratchpad 의 생성기로 세 원에서 셈해 찍었다 — 왼쪽 위가 밝다)
 */
export const LARGE_FROM = 0.5
export const LARGE_GLYPH_SPRITES: Record<string, readonly Sprite[]> = {
  // 맹그로브 (A8 — mangroveGlyph: 나무처럼 수관 세 덩이, 무릎까지의 줄기와 바깥으로 휘어 물에 박히는 뿌리 셋). 밑동은 뿌리가 박힌 물 높이
  mangrove: [
    { rows: ['................', '......kkkk......', '.....kggGGk.....', '....kggGGGGk....', '...kqqqGGqqk....', '..kggGGqqggGkk..', '..kgGGGqggGGGk..', '..kGGGqqgGGGqk..', '..kGGqqqGGGqqk..', '...kqqkkkkqqk...', '....kk.t..kk....', '.......t........', '.......t........', '......ttt.......', '.....t.t.t......', '.b.btb.b.btb.b..'], ax: 7, ay: 15 },
    { rows: ['................', '......kkk.......', '.....kggGk......', '....kggGGGk.....', '...kqqGGqqqkk...', '..kggGqqggGGGk..', '..kgGGGggGGGGk..', '..kGGGqgGGGGqk..', '..kGGqqkGGGqqk..', '..kkqqk.kkqkk...', '....kk..t.k.....', '........t.......', '........t.......', '.......ttt......', '......t.t.t.....', '.b.b.t.b.b.t.b..'], ax: 8, ay: 15 },
  ],
  // 늪 풀 (A9 — marshGlyph: 물결선 두 줄과 바깥으로 벌어지는 풀잎 셋). 밑동은 윗 물결선
  marsh: [
    { rows: ['........m.......', '....m...m...m...', '....m...m...m...', '.....m..m..m....', '.....m..m..m....', '......m.m.m.....', '......m.m.m.....', '.......mmm......', '.bbbbbbbbbbbbbb.', '................', '................', '....bbbbbbbb....'], ax: 8, ay: 8 },
    { rows: ['.......m........', '...m...m...m....', '...m...m...m....', '....m..m..m.....', '....m..m..m.....', '.....m.m.m......', '.......m........', '..bbbbbbbbbbbb..', '................', '................', '.....bbbbbb.....'], ax: 7, ay: 7 },
  ],
  tree: [
    { rows: ['.......kk.......', '.....kkggkk.....', '....kgggGGGk....', '....kggGGGGk....', '...kggGGGGGqk...', '..kqqqqqGqqqqk..', '.kgggGGGqggGGk..', '.kggGGGqggGGGGk.', '.kgGGGGggGGGGqk.', '.kGGGGqgGGGGqqk.', '.kGGGqqqGGGqqqk.', '..kkqqkkkkqqkk..', '....kk.t..kk....', '.......t........', '.......t........', '................'], ax: 7, ay: 10 },
    { rows: ['................', '.....kkkkk......', '....kgggGGk.....', '....kggGGGGk....', '...kggGGGqqqk...', '...kqqGGqggGGk..', '..kggGqqggGGGGk.', '.kggGGGggGGGGGk.', '.kgGGGGgGGGGGqk.', '.kGGGGqGGGGGqqk.', '.kGGGqqkGGGqqqk.', '..kkqkk.kkqqkk..', '....k...t.kk....', '........t.......', '........t.......', '................'], ax: 8, ay: 10 },
  ],
}

/** 한 점 지형 기호 — LandmarkGlyph 의 kind 마다 (바탕 지형 데이터에 있는 것만) */
export const LANDMARK_SPRITES: Record<string, Sprite> = {
  volcano: ground(['..oo.o..', '...oo...', '..kLLk..', '..kdlk..', '.kRrddk.', '.kRrrdk.', 'kRrrrddk', 'kkkkkkkk']),
  caldera: middle(['..kkkk..', '.kddddk.', 'kdlLLldk', 'kRdlldRk', '.kRRrrk.', '..kkkk..']),
  geyser: ground(['..y.y...', '...yy...', '..yy.y..', '...yy...', '...yy...', '..fbbf..', '.kbbbbk.', '..kkkk..']),
  waterfall: { rows: ['kRRRRRk.', 'krbfbbrk', '.kbffbk.', '.kbfbbk.', '..bffb..', '..bfbb..', '.fbffbf.', 'f.f..f.f'], ax: 3, ay: 0 },
  pit: middle(['..kkkk..', '.kKKKKk.', '.kKKKKk.', '..kkkk..']),
  spire: ground(['...k....', '..kRk...', '..kRdk..', '..kRdk..', '.kRrdk..', '.kRrddk.', '.kRrddk.', 'kkkkkkkk']),
  'floating-rock': ground(['.kkkkk..', 'kRRrrdk.', '.kRrdk..', '..kdk...', '...k....', '........', '........', '..%%%%..']),
  urn: ground(['.kk.....', 'kRRk....', 'kRrdk...', '.kRrdkw.', '..kRdkww', '...kkwww', '....wwww']),
}

/**
 * 작은 한 점 기호 (데이터의 size < 0.6) — 지금 지도처럼 작게 그린다 (작은 화산은 연기가 없다 — landscapeGlyphs.ts 의 volcano).
 * 1.5 이상(Hanging Swamp 의 싱크홀 2.2)은 보통 그림을 두 배로 (scaleSprite)
 */
export const LANDMARK_SMALL: Record<string, Sprite> = {
  volcano: ground(['..kk..', '.kLlk.', '.kRdk.', 'kRrddk', 'kkkkkk']),
  geyser: ground(['.y..', '..y.', '.yy.', 'kbbk', '.kk.']),
  pit: middle(['kKKk', '.kk.']),
  spire: ground(['.k..', 'kRk.', 'kRdk', 'kRdk', 'kkkk']),
  'floating-rock': ground(['kRdk', '.kk.', '....', '.%%.']),
}

/** 한 점 기호의 크기 갈래 — 데이터의 size (LandmarkGlyph.size) */
export const sizeClass = (s: number): 'small' | 'normal' | 'large' => (s < 0.6 ? 'small' : s >= 1.5 ? 'large' : 'normal')

/** 그림을 정수 배로 (가장 가까운 픽셀) — 기준점은 그 칸 묶음의 왼쪽 아래 */
export function scaleSprite(s: Sprite, k: number): Sprite {
  const rows = s.rows.flatMap((r) => Array.from({ length: k }, () => [...r].map((c) => c.repeat(k)).join('')))
  return { rows, ax: s.ax * k, ay: s.ay * k + k - 1 }
}

/** 바다 표시 — SeaMark 의 kind 마다 */
export const SEA_SPRITES: Record<string, Sprite> = {
  whirl: middle(['..ffff..', '.f....f.', 'f..ff..f', 'f.f..f..', '.f..f...', '..ff....']),
  reef: middle(['..f.k...', '.kfk.f..', '..k.fkf.']),
  rough: middle(['.f..f..f', 'f.ff.ff.']),
  'sea-ice': middle(['..iiii..', '.iiiiII.', '.IiiIII.', '..IIII..']),
}

/** 넓은 배율(한 픽셀 = 4 단위)의 작은 무늬 — 기호의 자리에 2–3 픽셀 */
export const MICRO_SPRITES: Record<string, Sprite> = {
  peak: ground(['.k.', 'k.k']),
  snow: ground(['.w.', 'kwk']),
  hill: ground(['kkk']),
  mesa: ground(['sss', 'kzk']),
  'crystal-spire': ground(['.c.', 'cxc']),
  crystal: ground(['c.c', 'xcx']),
  mangrove: ground(['G']),
  marsh: ground(['m.m']),
  ice: ground(['ii']),
  canyon: ground(['kk']),
  lava: ground(['L']),
  tundra: ground(['u']),
  volcano: ground(['.L.', 'kdk']),
  caldera: middle(['kkk', 'kLk', 'kkk']),
  geyser: ground(['y', 'b']),
  waterfall: { rows: ['f', 'f'], ax: 0, ay: 0 },
  pit: ground(['K']),
  spire: ground(['k', 'k']),
  'floating-rock': ground(['kk']),
  urn: ground(['kw']),
  whirl: middle(['ff']),
  reef: middle(['k']),
  rough: middle(['f']),
  'sea-ice': middle(['i']),
  dust: ground(['h']),
  chalk: ground(['n']),
  drybed: ground(['E']),
  deadwood: ground(['T']),
  metal: ground(['v']),
}

/** 물이 떨어지는 방향으로 돌린 폭포 — angle 0 = 아래, 90 = 왼쪽, -90 = 오른쪽 (LandmarkGlyph.angle) */
export function turnSprite(s: Sprite, angle: number): Sprite {
  if (Math.abs(angle) <= 45) return s
  const h = s.rows.length
  const w = s.rows[0].length
  const rows: string[] = []
  if (angle < 0) {
    // 아래로 떨어지던 것을 오른쪽으로 — 새 (x, y) = (옛 y, w - 1 - 옛 x)
    for (let y = 0; y < w; y++) rows.push(Array.from({ length: h }, (_, x) => s.rows[x][w - 1 - y]).join(''))
    return { rows, ax: s.ay, ay: w - 1 - s.ax }
  }
  for (let y = 0; y < w; y++) rows.push(Array.from({ length: h }, (_, x) => s.rows[h - 1 - x][y]).join(''))
  return { rows, ax: h - 1 - s.ay, ay: s.ax }
}

/** 그림판의 그림 수 (같은 kind 의 다른 모양까지) — 보고·시험용 */
export const spriteCount = () =>
  Object.values(GLYPH_SPRITES).reduce((n, l) => n + l.length, 0) +
  Object.keys(LANDMARK_SPRITES).length +
  Object.keys(LANDMARK_SMALL).length +
  Object.keys(SEA_SPRITES).length
