// 픽셀 지도(/pixel)의 페이즈 그림 (S7, docs/pixel-plan.md) — 시점별 지도(?time=1..6)의 세계 지도 그림을 빌드할 때 단계마다 픽셀 그림으로 굽는다.
// 지금 지도의 그림 원본(src/map/figures/<묶음>.ts — scripts/figures/to_ts.mjs 의 생성물, 고치지 않는다)과 카드(scripts/phase-cards.mjs),
// 시점의 규칙(src/data/timeline.ts 의 shownAtTimeOf·movedAt·childMapAt — App.tsx 가 시점별 보기의 그림 목록을 고르는 셈과 같다)을 그대로 쓴다.
// 지역 상세에 사는 작은 대상(S9)은 지역 상세가 나오는 가장 깊은 단계(DETAIL_LEVEL)에서만 굽고 그린다 — 지금 지도도 그 지역 상세가 나온 뒤에 그린다.
//
// 굽는 규칙 (한 픽셀 = 그 단계의 u 단위, 그 단계 격자의 칸 번호에 바로 놓는다 — 타일과 같은 격자):
// - 그 단계에서 그림의 크기가 7 픽셀 이상일 때만 (화면 2× 에서 지금 지도의 FIGURE_MIN_PX 14 와 같다)
// - 칠(fill·shade·stone·forest·sea·sea-fill·fire·blood·gold·dark)은 몫마다 0 이 아닌 감기 수, 픽셀 가운데로. sea(흐린 물빛)는 바둑판 한 칸 건너
// - 선(ink·ink-bold·fire-ink·sea-ink)은 한 픽셀 선 — 굵은 윤곽(ink-bold)은 그림이 20 픽셀 이상, 나머지 선은 28 픽셀 이상일 때만 (작으면 선이 칠을 덮어 검은 덩이가 된다).
//   빗금(hatch)은 한 픽셀 ≤ 0.5 단위이고 30 픽셀 이상일 때만
// - 둘레에 한 픽셀 윤곽 (칠한 픽셀에 맞닿은 빈 픽셀)
// 그림은 색이 아니라 몫의 번호(0 빔, 1–15 몫, 16 윤곽)로 굽는다 — 팔레트(?pal)마다 색을 따로 굽지 않는다 (src/pixel/figures/layer.ts 가 칠한다).
//
// 쓰는 법: node --import ./scripts/qa/pixel-hooks.mjs scripts/pixel/figures.mjs [--json | --stats]   (vite/pixelFigures.ts 가 부른다)
import { applySprite } from './figureSprites.mjs'
import fs from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { flattenPath } from './periods.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const src = (p) => pathToFileURL(`${ROOT}src/${p}`).href

/** 몫의 번호 (1 부터) — 지금 지도의 FigurePart.cls (src/map/figures.ts) */
export const FIG_CLASSES = ['fill', 'shade', 'stone', 'forest', 'sea', 'sea-fill', 'fire', 'blood', 'gold', 'dark', 'ink', 'ink-bold', 'hatch', 'fire-ink', 'sea-ink']
export const OUTLINE = 16
/** 그림 안쪽의 먹선 — 한 단 밝게 칠한다 (객체 다듬기 B1: 가는 밝은 칠(Emrakul 의 촉수) 양쪽의 먹선이 칠을 덮어 그림이 검은 덩이로 읽혔다. 픽셀 그림의 '안쪽 선은 밝게') */
export const INNER_INK = 17
const INK = FIG_CLASSES.indexOf('ink') + 1
const FILL = FIG_CLASSES.indexOf('fill') + 1
/** 밝은 칠 위의 흐린 물빛 — 섞은 한 빛 (B93) */
export const SEA_TINT = 18
const TINTABLE = new Set([...['fill', 'shade', 'stone'].map((c) => FIG_CLASSES.indexOf(c) + 1), SEA_TINT])
/** 진한 칠 — 흐린 물빛이 덮지 않는다 (B85) */
const DEEP_FILLS = new Set(['forest', 'fire', 'blood', 'gold', 'dark'].map((c) => FIG_CLASSES.indexOf(c) + 1))
/**
 * 그림 밑의 땅 띠 — 밝은 칠(fill)의 하위 경로 가운데 그림 상자 밑 15% 안에 놓인 넓고 납작한 것(너비가 높이의 5 배 이상, 높이는 그림의 12% 이하).
 * 지금 지도의 fill 은 양피지와 같은 빛이라 땅 띠는 보이지 않고 그 윗선·빗금만 남는데, 픽셀 지도에서는 밝은 크림 판자에 둘레 윤곽까지 둘러
 * 그림 밑에 판이 깔린 것처럼 보였다(객체 다듬기 B62 Comet Storm) — 칠하지 않는다. 윗선·빗금·그림자(shade)는 그대로
 */
function groundStrip(sub, tx, ty, fb) {
  let x0 = Infinity
  let x1 = -Infinity
  let y0 = Infinity
  let y1 = -Infinity
  for (const [x, y] of sub) {
    const mx = tx(x)
    const my = ty(y)
    if (mx < x0) x0 = mx
    if (mx > x1) x1 = mx
    if (my < y0) y0 = my
    if (my > y1) y1 = my
  }
  const fh = fb.y1 - fb.y0
  const w = x1 - x0
  const h = y1 - y0
  return w >= 5 * h && h <= 0.12 * fh && y0 >= fb.y1 - 0.15 * fh
}
/**
 * 그림 밑동의 납작한 땅 띠(칠·그늘)와 그 안의 빗금을 뺀다 — 지금 지도에서 거의 보이지 않는 옅은 땅 그림자인데, 픽셀에서는 불투명한 칠에 둘레 윤곽이 둘러져
 * 타이탄이 테 두른 판자·물 위의 크림 서프보드 위에 섰다 (그림별 다듬기 F11 — 칠만 빼던 객체 다듬기 B62 를 그늘과 그 안의 빗금까지)
 */
function dropGround(parts, tx, ty, fb) {
  const strips = []
  for (const part of parts) if (part.c === FILL || part.c === SHADE_C) for (const sub of part.subs) if (groundStrip(sub, tx, ty, fb)) strips.push(boxOf(sub, tx, ty))
  if (!strips.length) return parts
  const inStrip = (sub) => {
    const q = boxOf(sub, tx, ty)
    return strips.some((t) => q.x0 >= t.x0 - 0.01 && q.x1 <= t.x1 + 0.01 && q.y0 >= t.y0 - 0.01 && q.y1 <= t.y1 + 0.01)
  }
  return parts
    .map((p) => ({ ...p, subs: p.subs.filter((sub) => !((p.c === FILL || p.c === SHADE_C) && groundStrip(sub, tx, ty, fb)) && !(p.c === HATCH_C && inStrip(sub))) }))
    .filter((p) => p.subs.length)
}
function boxOf(sub, tx, ty) {
  let x0 = Infinity
  let x1 = -Infinity
  let y0 = Infinity
  let y1 = -Infinity
  for (const [x, y] of sub) {
    const mx = tx(x)
    const my = ty(y)
    if (mx < x0) x0 = mx
    if (mx > x1) x1 = mx
    if (my < y0) y0 = my
    if (my > y1) y1 = my
  }
  return { x0, x1, y0, y1 }
}
const SHADE_C = FIG_CLASSES.indexOf('shade') + 1
const HATCH_C = FIG_CLASSES.indexOf('hatch') + 1
/** 촘촘한 빗금의 중간 톤 — 그늘 65%·먹 35% 를 섞은 빛 (R6) */
export const HATCH_TONE = 19
/**
 * 물로 된 몸통 — 밑에 칠이 없는 흐린 물빛을 물거품 쪽 옅은 물빛 한 빛으로 (가독성 다듬기 R14: 물빛 바둑판과 검은 윤곽이라 Living Tsunami 가 그물로,
 * 날개 막이 방충망으로 읽혔다). 그림 밑동의 납작한 물웅덩이는 B 의 바둑판 그대로 (바탕이 비친다)
 */
export const WAVE = 20
/**
 * 물 위의 둘레 윤곽 — 물거품빛 (가독성 다듬기 R14b: 16비트 팔레트의 짙은 바다는 지금 지도의 밝은 바다와 반대라 짙은 윤곽이 바다에 묻혀 Shoal Serpent 가
 * 짙은 얼룩이었다). 빌드할 때 그 단계 격자에서 세계 지도의 바다·호수 칸이면 (그 무렵 물이 빠진 바닥은 보지 않는다)
 */
export const WET_RIM = 21
/** 흐린 물빛 몫이 밑동의 물웅덩이인가 — 납작하고 상자 밑 1/4 안 */
function puddlePart(part, tx, ty, fb) {
  let x0 = Infinity
  let x1 = -Infinity
  let y0 = Infinity
  let y1 = -Infinity
  for (const sub of part.subs)
    for (const [x, y] of sub) {
      const mx = tx(x)
      const my = ty(y)
      if (mx < x0) x0 = mx
      if (mx > x1) x1 = mx
      if (my < y0) y0 = my
      if (my > y1) y1 = my
    }
  const fh = fb.y1 - fb.y0
  return x1 - x0 >= 2.5 * (y1 - y0) && y0 >= fb.y1 - 0.25 * fh
}
/** 그 단계 상자의 긴 변이 이만큼 아래인 그림만 촘촘한 빗금을 중간 톤으로 — 그보다 큰 그림(가장 깊은 단계의 날개 막)은 B19 의 25% 점 그대로 */
const TONE_PX = 56
const TONE_ON = new Set([...['fill', 'shade', 'stone'].map((c) => FIG_CLASSES.indexOf(c) + 1), 18, 20])
/** 촘촘한 빗금 — 5×5 안의 빗금 픽셀 수 (B19) */
const HATCH_DENSE = 8
/** 그 자체가 테두리가 되는 선 — 이것에만 맞닿은 빈 칸에는 둘레 윤곽을 두르지 않는다 (B2). 빗금도 (B62: 땅 띠를 칠하지 않자 그 밑 풀 빗금 점마다 윤곽이 둘려 검은 바둑판 띠가 됐다 — 지금 지도의 빗금은 가는 선 하나) */
const EDGE_LINES = new Set(['ink', 'ink-bold', 'fire-ink', 'sea-ink', 'hatch'].map((c) => FIG_CLASSES.indexOf(c) + 1))
/** 안쪽 먹선을 밝힐 때 곁에 있어야 하는 밝은 칠 (fill·shade·stone·gold) */
const LIGHT = new Set([...['fill', 'shade', 'stone', 'gold'].map((c) => FIG_CLASSES.indexOf(c) + 1), 18, 20])
const FILLS = new Set(FIG_CLASSES.slice(0, 10))
const SEA = FIG_CLASSES.indexOf('sea') + 1
/** 픽셀 지도의 단계 (src/pixel/view.ts 의 LEVELS) */
export const LEVELS = [16, 8, 4, 2, 1, 0.5, 0.25]
/** 그림을 그리는 가장 작은 크기 (그 단계 픽셀) */
export const MIN_PX = 7
/** 단계마다 그림 조각을 나누는 칸 (지도 단위) — 넓은 단계는 한 조각 */
export const CELL = { 4: 400, 5: 400, 6: 200 }
/** 지역 상세에 사는 대상을 그리는 단계 — 지역 상세가 나오는 단계 (scripts/pixel/childmaps.mjs 의 CHILD_U) */
export const DETAIL_LEVEL = LEVELS.indexOf(0.25)

const q = (v) => Math.round(v * 10)

/** 그림의 지도 위 상자 — ZendikarMap.tsx 의 figureBox 와 같은 셈 */
export function figureBox(frame, at, size, flip) {
  const [vx, vy, vw, vh, ax, ay] = frame
  const k = size / Math.max(vw, vh)
  const [l, r] = flip ? [vx + vw - ax, ax - vx] : [ax - vx, vx + vw - ax]
  return { x0: at[0] - l * k, y0: at[1] - (ay - vy) * k, x1: at[0] + r * k, y1: at[1] + (vy + vh - ay) * k }
}

/**
 * 그림 하나를 단계 u 의 픽셀로 — parts 는 [{c: 몫 번호, subs: 꺾은선(그림 좌표)[]}] (차례대로 덧그린다).
 * 돌려주는 것: 그 단계 격자의 칸 번호 gx0·gy0 와 w × h 의 몫 번호
 */
/**
 * 그림별 손질 (그림별 다듬기 F8) — 카드 id 마다 그림 원본의 몫(차례 번호)을 다른 몫으로 바꾸거나(null 이면 뺀다) 굽는다. 지금 지도의 그림은 그대로이고 픽셀 굽기만 바꾼다.
 * 규칙으로 살릴 수 없는 그림만, 까닭을 하나씩 적어 둔다 (docs/pixel-plan.md 의 F8)
 */
export const FIGURE_OVERRIDES = {
  // 진짜 제이스와 환영이 같은 물빛 칠(땅 위에서 회색)이라 두 개의 푸른 비석이었다 — 진짜 제이스의 물빛 겹칠(몫 9)을 빼 크림 몸에 먹선으로, 환영은 물빛 테의 흐린 회색 그대로
  'jace-mirror-mage': { 9: null },
  // 바위(몫 6)가 그림에서 가장 밝고 넓은 칠이라 악마가 바위 위 천막으로 읽혔다 — 바위를 돌빛으로 한 단 어둡게
  'ob-nixilis-the-fallen': { 6: 'stone' },
  // 그림 뒤를 채운 벽 판(F7) — 지금 지도에서는 양피지 칠이라 참호 벽에 녹는데, 픽셀에서는 밝은 크림 판에 굵은 윤곽이 둘러져 벼랑에 붙인 포스터·액자였다. 판을 비워
  // 지역 상세의 참호 바닥이 비치게 하고 벽의 결(먹선·빗금)만 남긴다
  'unstable-footing': { 0: null },
  'goblin-bushwhacker': { 0: null, 2: null },
  'reckless-bushwhacker': { 0: null, 2: null },
}

/**
 * 평평한 실루엣으로 굽는 작은 상징 물건 (그림별 다듬기 F3) — 9–27 픽셀에서 안쪽 먹선(바퀴살·빛살·고리)·그늘·빗금·돌이 바둑판으로 섞여 Warmonger's Chariot 이 부서진 덤불,
 * Keening Stone 이 허수아비, 세지리의 네 상징이 같은 회갈색 얼룩이었다. 작은 그림 경로(SMALL_PX 아래)에서만: 실루엣을 가장 많은 밝은 칠(돌이 많으면 돌)로 메우고,
 * 가장자리(4 방향 이웃이 빈 칸)는 먹, 빛 칠(금·불·물·피)은 그대로. 안쪽 표시가 그 물건을 알아보게 하는 것(Oath of Jace 의 눈 …)은 넣지 않는다
 */
export const FLAT_FIGURES = new Set(['warmongers-chariot', 'keening-stone', 'prophetic-prism', 'skyclave-relic', 'chilling-trap', 'negate', 'skyclave-plunder', 'aligned-hedron-network', 'repay-in-kind', 'pathway-arrows', 'hedron-archive', 'lay-bare', 'unity-of-purpose', 'reckless-handling'])
const FLAT_LIGHT = ['fill', 'shade', 'stone'].map((c) => FIG_CLASSES.indexOf(c) + 1)
const FLAT_KEEP = new Set(['fire', 'blood', 'gold', 'sea', 'sea-fill', 'forest'].map((c) => FIG_CLASSES.indexOf(c) + 1).concat([18, 20]))
function flatFigure(s) {
  const on = (i) => s.idx[i] && s.idx[i] !== SMALL_RIM
  const cnt = new Map()
  for (let i = 0; i < s.idx.length; i++) if (FLAT_LIGHT.includes(s.idx[i])) cnt.set(s.idx[i], (cnt.get(s.idx[i]) ?? 0) + 1)
  const body = [...cnt].sort((a, b) => b[1] - a[1])[0]?.[0] ?? FLAT_LIGHT[0]
  const idx = new Uint8Array(s.idx.length)
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      const i = y * s.w + x
      if (!on(i)) continue
      const edge = x === 0 || y === 0 || x === s.w - 1 || y === s.h - 1 || !on(i - 1) || !on(i + 1) || !on(i - s.w) || !on(i + s.w)
      idx[i] = FLAT_KEEP.has(s.idx[i]) ? s.idx[i] : edge ? FIG_CLASSES.indexOf('ink') + 1 : body
    }
  return { ...s, idx }
}

/** 그림 하나를 그 단계로 굽는다 — 규칙대로 굽고, 평평한 실루엣(F3)·손 그림(F14)이 있으면 그것 */
export function bakeFigure(id, parts, frame, at, size, flip, u) {
  let s = rasterFigure(parts, frame, at, size, flip, u)
  const fb = figureBox(frame, at, size, flip)
  if (FLAT_FIGURES.has(id) && Math.max(fb.x1 - fb.x0, fb.y1 - fb.y0) / u < SMALL_PX) s = flatFigure(s)
  return applySprite(id, u, s)
}

/** 그림 원본의 몫에 그림별 손질을 건다 — { cls, d } 목록 */
export function figureParts(id, parts) {
  const o = FIGURE_OVERRIDES[id]
  if (!o) return parts
  return parts.flatMap((p, i) => (!(i in o) ? [p] : o[i] === null ? [] : [{ ...p, cls: o[i] }]))
}

export function rasterFigure(parts, frame, at, size, flip, u, allLines = false, raw = null) {
  const [vx, vy, vw, vh, ax, ay] = frame
  const k = size / Math.max(vw, vh)
  const tx = (x) => at[0] + (flip ? -1 : 1) * (x - ax) * k
  const ty = (y) => at[1] + (y - ay) * k
  // 그림 상자(viewBox) 밖으로 나간 몫도 그린다 — 지금 지도의 그림은 자르지 않는다 (S7 검토: 날개 끝이 잘렸다)
  const fb = figureBox(frame, at, size, flip)
  parts = dropGround(parts, tx, ty, fb)
  const b = { ...fb }
  for (const part of parts)
    for (const sub of part.subs)
      for (const [x, y] of sub) {
        const mx = tx(x)
        const my = ty(y)
        if (mx < b.x0) b.x0 = mx
        if (mx > b.x1) b.x1 = mx
        if (my < b.y0) b.y0 = my
        if (my > b.y1) b.y1 = my
      }
  void vx
  void vy
  void vw
  void vh
  // 둘레 한 칸은 윤곽 몫
  const gx0 = Math.floor(b.x0 / u) - 1
  const gy0 = Math.floor(b.y0 / u) - 1
  const W = Math.floor(b.x1 / u) + 1 - gx0 + 1
  const H = Math.floor(b.y1 / u) + 1 - gy0 + 1
  const px = new Uint8Array(W * H)
  /** 흐린 물빛의 바둑판 구멍 — 칠한 자리라 둘레 윤곽이 되지 않는다 (S7 검토: 구멍이 모두 검은 윤곽이 되어 물이 검은 바둑판이었다) */
  const hole = new Uint8Array(W * H)
  const long = Math.max(fb.x1 - fb.x0, fb.y1 - fb.y0) / u
  if (!raw && !allLines && long < MID_PX) return rasterSmall(parts, frame, at, size, flip, u, gx0, gy0, W, H, long < SMALL_PX ? undefined : MID_TUNE)
  /** 칠 픽셀마다 그 칠의 몫 번호 (몫 차례 + 1) — 두 칠을 가르는 안쪽 먹선은 먹 그대로 둔다 (R18) */
  const fid = new Int32Array(W * H)
  let partNo = 0
  for (const part of parts) {
    partNo++
    const cls = FIG_CLASSES[part.c - 1]
    if (FILLS.has(cls)) {
      // 0 이 아닌 감기 수 — 몫의 하위 경로 모두를 한 path 로
      const edges = []
      for (const s of part.subs) {
        for (let i = 0; i < s.length; i++) {
          const A = s[i]
          const B = s[(i + 1) % s.length]
          const ay2 = ty(A[1])
          const by2 = ty(B[1])
          if (ay2 === by2) continue
          edges.push([tx(A[0]), ay2, tx(B[0]), by2])
        }
      }
      const cr = []
      const wave = part.c === SEA && !raw && !puddlePart(part, tx, ty, fb)
      for (let r = 0; r < H; r++) {
        const yc = (gy0 + r + 0.5) * u
        cr.length = 0
        for (const [x1, y1, x2, y2] of edges) {
          const lo = Math.min(y1, y2)
          const hi = Math.max(y1, y2)
          if (yc < lo || yc >= hi) continue
          cr.push([x1 + ((yc - y1) * (x2 - x1)) / (y2 - y1), y1 < y2 ? 1 : -1])
        }
        if (cr.length < 2) continue
        cr.sort((m, n) => m[0] - n[0])
        let w = 0
        for (let i = 0; i + 1 < cr.length; i++) {
          w += cr[i][1]
          if (!w) continue
          const c0 = Math.max(0, Math.ceil(cr[i][0] / u - 0.5) - gx0)
          const c1 = Math.min(W - 1, Math.ceil(cr[i + 1][0] / u - 0.5) - 1 - gx0)
          for (let c = c0; c <= c1; c++) {
            // 흐린 물빛은 바둑판 한 칸 건너 (그 단계 격자의 칸 번호로 — 이웃 그림과 무늬가 맞는다)
            // 밝은 칠(fill·shade·stone) 위의 흐린 물빛은 두 빛을 섞은 한 빛 (객체 다듬기 B93: 드레이크 날개 막이 16비트 팔레트의 짙은 물빛 바둑판이었다 —
            // 지금 지도는 양피지 위 불투명도 0.35 물빛이라 옅은 회청색 면)
            if (part.c === SEA && TINTABLE.has(px[r * W + c])) {
              px[r * W + c] = SEA_TINT
              fid[r * W + c] = partNo
              continue
            }
            if (wave && !px[r * W + c]) {
              px[r * W + c] = WAVE
              fid[r * W + c] = partNo
              hole[r * W + c] = 0
              continue
            }
            if (wave && px[r * W + c] === WAVE) continue
            if (part.c === SEA && !raw && ((gx0 + c + gy0 + r) & 1) === 1) {
              if (!px[r * W + c]) hole[r * W + c] = 1
              continue
            }
            // 흐린 물빛은 진한 칠(숲·불·피·금·어둠) 위에는 찍지 않는다 — 지금 지도의 불투명도 0.35 물빛은 그 위에서 거의 보이지 않는데,
            // 16비트 팔레트의 물빛 점이 붉은 몸에 파란 점선으로 드러났다 (객체 다듬기 B85 Ruin Processor)
            if (part.c === SEA && DEEP_FILLS.has(px[r * W + c])) continue
            px[r * W + c] = part.c
            fid[r * W + c] = partNo
            hole[r * W + c] = 0
          }
        }
      }
      // 한 몫 안의 하위 경로(천사의 옷과 날개, 소 셋)도 가른다 — 하위 경로마다 제 감기로 칠해지는 픽셀에 그 번호 (뒤의 것이 덮는다, R18)
      if (part.subs.length > 1)
        part.subs.forEach((sub, k) => {
          const se = []
          for (let i = 0; i < sub.length; i++) {
            const A = sub[i]
            const B = sub[(i + 1) % sub.length]
            const ay2 = ty(A[1])
            const by2 = ty(B[1])
            if (ay2 !== by2) se.push([tx(A[0]), ay2, tx(B[0]), by2])
          }
          const id = partNo * 4096 + k + 1
          for (let r = 0; r < H; r++) {
            const yc = (gy0 + r + 0.5) * u
            cr.length = 0
            for (const [x1, y1, x2, y2] of se) {
              if (yc < Math.min(y1, y2) || yc >= Math.max(y1, y2)) continue
              cr.push([x1 + ((yc - y1) * (x2 - x1)) / (y2 - y1), y1 < y2 ? 1 : -1])
            }
            if (cr.length < 2) continue
            cr.sort((m, n) => m[0] - n[0])
            let w = 0
            for (let i = 0; i + 1 < cr.length; i++) {
              w += cr[i][1]
              if (!w) continue
              const c0 = Math.max(0, Math.ceil(cr[i][0] / u - 0.5) - gx0)
              const c1 = Math.min(W - 1, Math.ceil(cr[i + 1][0] / u - 0.5) - 1 - gx0)
              for (let c = c0; c <= c1; c++) if (fid[r * W + c] === partNo || Math.floor(fid[r * W + c] / 4096) === partNo) fid[r * W + c] = id
            }
          }
        })
      continue
    }
    if (raw) {
      // 작은 그림의 부표본(rasterSmall) — 선은 지금 지도의 화면 굵기를 부표본 두께로, 빗금도 모두 긋는다
      const t = raw.width[cls] ?? 1
      const o = Math.floor((t - 1) / 2)
      for (const s of part.subs) {
        const pts = s.map(([x, y]) => [Math.floor(tx(x) / u) - gx0, Math.floor(ty(y) / u) - gy0])
        for (let i = 0; i + 1 < pts.length; i++) {
          let [x0, y0] = pts[i]
          const [x1, y1] = pts[i + 1]
          const dx = Math.abs(x1 - x0)
          const dy = -Math.abs(y1 - y0)
          const sx = x0 < x1 ? 1 : -1
          const sy = y0 < y1 ? 1 : -1
          let e = dx + dy
          for (;;) {
            for (let yy = y0 - o; yy < y0 - o + t; yy++) for (let xx = x0 - o; xx < x0 - o + t; xx++) if (xx >= 0 && yy >= 0 && xx < W && yy < H) px[yy * W + xx] = part.c
            if (x0 === x1 && y0 === y1) break
            const e2 = 2 * e
            if (e2 >= dy) {
              e += dy
              x0 += sx
            }
            if (e2 <= dx) {
              e += dx
              y0 += sy
            }
          }
        }
      }
      continue
    }
    if (!allLines && (cls === 'hatch' ? long < 30 : cls === 'ink-bold' ? long < 20 : long < 28)) continue
    // 한 픽셀이 0.5 단위보다 넓은 단계(u1·u2)에서는 빗금 획을 찍지 않고 촘촘한 자리만 중간 톤으로 (가독성 다듬기 R50: 빗금을 통째로 건너뛰어, 지금 지도에서 빗금으로 어두운
    // 짐승·악마의 몸과 날개 막이 끊긴 윤곽의 크림 덩이였다 — Soul of Zendikar 가 양·구름, Hellcarver 가 웅덩이, Terra Stomper 가 천막)
    const toneOnly = !allLines && cls === 'hatch' && u > 0.5
    // 빗금은 먼저 이 몫의 자리를 모아, 촘촘한 자리(5×5 안에 빗금 픽셀 8 개 이상 — 선 간격이 2 픽셀 아래)는 한 칸 더 건너 찍는다 (객체 다듬기 B19:
    // Hellcarver Demon 의 날개 막처럼 지금 지도가 가는 빗금을 촘촘히 그어 옅은 회색 면으로 보이는 곳이 한 칸 건너 바둑판으로 짙은 면이 되어 탁했다)
    const hm = cls === 'hatch' ? new Uint8Array(W * H) : null
    const put = hm ? (i) => (hm[i] = 1) : (i) => (px[i] = part.c)
    for (const s of part.subs) {
      const pts = s.map(([x, y]) => [Math.floor(tx(x) / u) - gx0, Math.floor(ty(y) / u) - gy0])
      for (let i = 0; i + 1 < pts.length; i++) {
        let [x0, y0] = pts[i]
        const [x1, y1] = pts[i + 1]
        const dx = Math.abs(x1 - x0)
        const dy = -Math.abs(y1 - y0)
        const sx = x0 < x1 ? 1 : -1
        const sy = y0 < y1 ? 1 : -1
        let e = dx + dy
        for (;;) {
          // 빗금은 한 칸 건너 (객체 다듬기 B1 — 지금 지도의 빗금은 화면 0.6px·불투명도 0.85 인데 한 픽셀(화면 2px) 선이라 세 배 넘게 짙었다. 그 단계 격자로 건너 이웃 그림과 무늬가 맞는다)
          if (x0 >= 0 && y0 >= 0 && x0 < W && y0 < H && (cls !== 'hatch' || ((gx0 + x0 + gy0 + y0) & 1) === 0)) put(y0 * W + x0)
          if (x0 === x1 && y0 === y1) break
          const e2 = 2 * e
          if (e2 >= dy) {
            e += dy
            x0 += sx
          }
          if (e2 <= dx) {
            e += dx
            y0 += sy
          }
        }
      }
    }
    if (hm) {
      // 중간 크기 그림(R1 의 작은 그림보다 크고 TONE_PX 아래)은 촘촘한 빗금 자리를 밝은 칠 위에서 중간 어두운 톤 한 빛으로 (가독성 다듬기 R6: 지금 지도는
      // 빗금이 촘촘한 몸이 어두운데, 건너 찍은 점만 남아 밝은 크림 몸이 되어 빛이 뒤집혔다 — Yarok's Fenlurker 가 빵, Zof Shade 가 양처럼 읽혔다)
      const tone = long < TONE_PX || toneOnly
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const on = hm[y * W + x]
          if (!on && !tone) continue
          let n = 0
          for (let yy = Math.max(0, y - 2); yy <= Math.min(H - 1, y + 2); yy++) for (let xx = Math.max(0, x - 2); xx <= Math.min(W - 1, x + 2); xx++) n += hm[yy * W + xx]
          if (tone && n >= HATCH_DENSE && TONE_ON.has(px[y * W + x])) px[y * W + x] = HATCH_TONE
          else if (toneOnly) continue
          // 성긴 빗금 획도 밝은 칠 위면 중간 톤 (가독성 다듬기 R21: 짙은 빗금 점이 사람 크기 그림의 옷·갑옷을 크림·먹 얼룩으로 만들어 얼굴·몸이 읽히지 않았다)
          else if (tone && on && TONE_ON.has(px[y * W + x])) px[y * W + x] = HATCH_TONE
          else if (on && (n < HATCH_DENSE || (((gx0 + x) | (gy0 + y)) & 1) === 0)) px[y * W + x] = part.c
        }
    }
  }
  if (raw) return { gx0, gy0, w: W, h: H, idx: px }
  // 칠이 픽셀 가운데에 하나도 걸리지 않은 가는 그림(선으로만 된 것)은 선을 모두 그린다 — 빈 그림이 되지 않게
  if (!allLines && !px.some((v) => v)) return rasterFigure(parts, frame, at, size, flip, u, true)
  // 둘레 윤곽 — 칠한 픽셀에 네 방향으로 맞닿은 빈 픽셀. 맞닿은 것이 그림 자신의 먹선뿐이면 두르지 않는다 (객체 다듬기 B2: 먹선 바깥에 윤곽을 한 겹 더 둘러
  // 테두리가 2 픽셀 검정이 되어 Lorthos 의 머리·촉수가 한 픽셀 2 단위에서 검은 덩이였다 — 지금 지도의 테두리는 먹선 하나다)
  const out = px.slice()
  const solid = (v) => v && !EDGE_LINES.has(v)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (px[i] || hole[i]) continue
      if ((x > 0 && solid(px[i - 1])) || (x < W - 1 && solid(px[i + 1])) || (y > 0 && solid(px[i - W])) || (y < H - 1 && solid(px[i + W]))) out[i] = OUTLINE
    }
  // 안쪽 먹선 — 네 이웃이 모두 그림 안이고(빈 칸·둘레 윤곽이 아니다) 그 가운데 밝은 칠이 있는 먹선. 그림의 바깥 둘레는 둘레 윤곽(16)이 짙게 맡는다
  const inner = out.slice()
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x
      if (out[i] !== INK) continue
      const n = [out[i - 1], out[i + 1], out[i - W], out[i + W]]
      if (!(n.every((v) => v && v !== OUTLINE) && n.some((v) => LIGHT.has(v)))) continue
      // 곁의 밝은 칠이 둘 넘는 몫이면 두 몸통(옷과 날개, 소 셋, 뱀과 말뚝)을 가르는 선 — 먹 그대로 (가독성 다듬기 R18: 밝히면 천사의 옷이 날개와 이어져 잎·불가사리로 읽혔다)
      let id = 0
      let split = false
      for (let dy = -1; dy <= 1 && !split; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const k = i + dy * W + dx
          if (!LIGHT.has(out[k]) || !fid[k]) continue
          if (id && fid[k] !== id) {
            split = true
            break
          }
          id = fid[k]
        }
      if (!split) inner[i] = INNER_INK
    }
  return { gx0, gy0, w: W, h: H, idx: inner }
}

/**
 * 작은 그림 (그 단계 상자의 긴 변이 SMALL_PX 픽셀 아래) — 가독성 다듬기 R1. 픽셀 가운데 한 점으로 몫을 고르면 칠이 거의 모든 픽셀을 이기고 1–1.15px 선은
 * 픽셀 가운데 사이로 빠져(또 20·28 픽셀 아래는 먹선을 아예 뺐다) 크림빛 덩이에 테두리만 남았다 — 콩·구름·숫자로 읽혔다. 지금 지도는 선 굵기가 화면 px 로 고정이라
 * 작게 그리면 먹이 모여 어두운 실루엣이 된다. 픽셀마다 SUB × SUB 부표본으로 몫마다 덮인 넓이를 세어: 그림이 덮은 넓이가 SMALL_COVER 아래면 빈 칸,
 * 먹(먹선·굵은 먹선·빗금·어둠·불 먹·물 먹)이 SMALL_INK 넘게 덮으면 가장 많이 덮은 먹 몫, 아니면 가장 많이 덮은 칠 몫. 안쪽 먹선 밝히기·빗금 건너 찍기는 하지 않고,
 * 둘레 윤곽은 칠에만 두른다(먹은 그 자체가 테두리)
 */
export const SMALL_PX = 28
/**
 * 사람 크기 그림 (그 단계 긴 변 SMALL_PX–MID_PX 픽셀) — 가독성 다듬기 R21: 픽셀 가운데 한 점으로 고르면 세부 먹선이 몸의 60% 를 덮어 인물(타즈리·제이스·소린)의
 * 옷·갑옷이 크림·먹 얼룩이었다. 같은 부표본으로 셈하되 선을 굵게(부표본 3)·먹 문턱을 낮게 — 작은 그림의 값으로는 먹이 빠져 희멀건 유령이 되었다
 */
const MID_PX = 50
/** 사람 크기 그림의 먹 비율 상한과 그때의 먹 문턱 (R27) */
const MID_INK_CAP = 0.25
const MID_INK_RETRY = 0.7
/** 다시 고르는 밝은 그림 — 칠 가운데 어두운 칠의 몫이 이 아래이고 먹·빗금 픽셀이 MID_DARK_RESULT 넘을 때, 그때의 빗금 문턱 (F1) */
const MID_LIGHT_SRC = 0.25
const MID_DARK_RESULT = 0.5
const DARK_FILL = FIG_CLASSES.indexOf('dark') + 1
const MID_RETRY_MID = 0.5
const MID_TUNE = { width: { ink: 3, 'ink-bold': 3, hatch: 1, 'fire-ink': 2, 'sea-ink': 2 }, ink: 0.4, mid: 0.25 }
const SUB = 4
const SMALL_COVER = 0.4
/** 먹이 이만큼 넘게 덮으면 먹, SMALL_MID 넘게 덮으면 중간 톤(빗금 빛) — 지금 지도의 화면에서 가는 먹선이 칠 위에 번져 보이는 회갈색 */
const SMALL_INK = 0.75
const SMALL_MID = 0.55
/** 빛 있는 칠이 이만큼 덮으면 먹보다 먼저 그 빛 (R1 검토: 붉은 옷·흰 새·푸른 몸이 먹에 묻혀 갈색 덩이가 됐다) */
const SMALL_HUE = 3 / 16
/** 테두리를 두르지 않는 작은 그림의 긴 변 (픽셀) — 점만 한 그림에 두르면 장소 기호와 같아 보였다 */
const SMALL_NO_RIM = 8
/** 선 몫의 부표본 두께 — 지금 지도의 화면 굵기(먹선 1.15·굵은 먹선 1.5·빗금 0.6·불 먹 1·물 먹 0.9 px)를 픽셀(화면 2px)의 SUB 칸으로 */
const SMALL_WIDTH = { ink: 2, 'ink-bold': 2, hatch: 1, 'fire-ink': 2, 'sea-ink': 2 }
const INKISH = new Set(['ink', 'ink-bold', 'hatch', 'dark', 'fire-ink', 'sea-ink'].map((c) => FIG_CLASSES.indexOf(c) + 1))
const HATCH = FIG_CLASSES.indexOf('hatch') + 1
/**
 * 작은 그림의 테 — 굽는 동안의 몫 (R22). 빌드가 세계 지도 칸을 보아 물 위면 SEA_TINT, 숲 위면 RIM_FOREST(옅은 올리브), 맨땅 위면 지운다
 * (모래 위의 회청 테가 웅덩이·물 고리로, 지역 상세 안에서는 푸른 빛무리로 읽혔다 — 짙은 실루엣은 모래와 이미 갈린다). 세계 지도를 보지 않는 곳에서는 SEA_TINT 빛
 */
export const SMALL_RIM = 22
export const RIM_FOREST = 23
/** 땅 위의 흐린 물빛 — 날개 막·안개·그림자의 차가운 회색 (R30) */
export const MEMBRANE = 24
const SMALL_HOLE = 3
/** 작은 그림에서 불·피 빛이 이기는 덮임과, 밝은 칠을 중간 톤으로 바꾸는 빗금 덮임 (R35) */
const SMALL_HOT = 6 / 16
/** 선만 지나는 픽셀을 칠하는 덮임과 그 규칙을 쓰는 작은 그림의 긴 변 (R36) */
const STROKE_ONLY = 0.6
const STROKE_ONLY_FROM = 16
const SMALL_HATCH_TONE = 0.35
const INK_BOLD = FIG_CLASSES.indexOf('ink-bold') + 1
/** 홀로 뻗은 획을 먹으로 남기는 먹선 덮임 (F12) */
const LONE_INK = 3 / 16
const FIRE = FIG_CLASSES.indexOf('fire') + 1
const FIRE_INK = FIG_CLASSES.indexOf('fire-ink') + 1
const HOT = new Set(['fire', 'blood'].map((c) => FIG_CLASSES.indexOf(c) + 1))
const STONE = FIG_CLASSES.indexOf('stone') + 1
const HUED = new Set(['forest', 'sea', 'fire', 'blood', 'gold'].map((c) => FIG_CLASSES.indexOf(c) + 1).concat([SEA_TINT]))
function rasterSmall(parts, frame, at, size, flip, u, gx0, gy0, W, H, tune) {
  let hi = rasterFigure(parts, frame, at, size, flip, u / SUB, true, { width: tune?.width ?? SMALL_WIDTH })
  let inkAt = tune?.ink ?? SMALL_INK
  const wide = Math.max(W, H) - 2 >= STROKE_ONLY_FROM
  let midAt = tune?.mid ?? SMALL_MID
  // 사람 크기에서 빗금 문턱을 넘은 칠 픽셀을 중간 톤으로 (그림별 다듬기 F1 — 다시 고를 때만)
  let toneMid = false
  const px = new Uint8Array(W * H)
  const cnt = new Uint16Array(32)
  const pick = (minCover) => {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        cnt.fill(0)
        let total = 0
        let ink = 0
        // 이 픽셀의 부표본 — 높은 격자의 칸 번호로 (gx0·hi.gx0 는 서로 다른 격자의 칸 번호)
        const hx0 = (gx0 + x) * SUB - hi.gx0
        const hy0 = (gy0 + y) * SUB - hi.gy0
        for (let sy = 0; sy < SUB; sy++)
          for (let sx = 0; sx < SUB; sx++) {
            const hx = hx0 + sx
            const hy = hy0 + sy
            if (hx < 0 || hy < 0 || hx >= hi.w || hy >= hi.h) continue
            let v = hi.idx[hy * hi.w + hx]
            if (!v) continue
            // 작은 그림에서는 불꽃의 불 먹 윤곽을 불로 센다 (그림별 다듬기 F9: 가는 불꽃 혀가 제 윤곽을 먹으로 세어 빗금빛·먹이 되어, 지금 지도에서 무리 가운데 가장 눈에 띄는
            // Chandra, Flamecaller 의 두 불꽃이 검은 그루터기에 붉은 점 하나였다). 피는 그대로 (R35 의 Ulamog 얼굴 '+')
            if (v === FIRE_INK && !tune) v = FIRE
            cnt[v]++
            total++
            // 빗금은 지금 지도에서 가늘고 옅어(0.6px·0.85) 반만 먹으로 센다
            if (v === HATCH) ink += 0.5
            else if (INKISH.has(v)) ink++
          }
        if (total < minCover * SUB * SUB) continue
        // 칠 없이 선만 지나는 픽셀은 선이 STROKE_ONLY 넘게 덮을 때만 (가독성 다듬기 R36: 나란한 획이 그 사이 빈 부표본까지 가져가 촉수·다리 사이 틈이 메워지고
        // 타이탄이 개관에서 그루터기·묘비 같은 검은 덩이였다). 작은 그림 가운데 긴 변 STROKE_ONLY_FROM 픽셀 이상만 — 더 작은 사람·물건은 점으로 흩어진다
        if (!tune && wide) {
          let strokes = 0
          for (const v of INKISH) strokes += cnt[v]
          if (strokes === total && strokes < STROKE_ONLY * SUB * SUB) continue
        }
        let best = 0
        let hue = 0
        for (const v of HUED) if (cnt[v] > cnt[hue]) hue = v
        // 불·피는 더 덮어야 빛이 이긴다 (가독성 다듬기 R35: 가는 붉은 무늬가 3/16 만 덮어도 픽셀을 통째로 가져 Ulamog 얼굴 한가운데 붉은 '+' 가 의료·과녁 표지로 읽혔다)
        // 돌·먹이 그 픽셀에 있으면 빛 칠은 더 덮어야 이긴다 (가독성 다듬기 R48: 뒤의 얇은 물빛 후광·금빛 줄기가 3/16 만 덮어도 가운데 돌·먹을 이겨 Hedron Archive 가
        // 푸른 서리 얼룩, Oath of Jace 가 민들레로 읽혔다). 빛만인 몸(숲·물 생물)은 그대로
        const core = cnt[STONE] > 0 || ink > 0
        if (hue && cnt[hue] >= (core && !tune ? SMALL_HOT : tune || !HOT.has(hue) ? SMALL_HUE : SMALL_HOT) * SUB * SUB) best = hue
        else if (ink > inkAt * SUB * SUB) {
          for (const v of INKISH) if (cnt[v] > cnt[best]) best = v
          // 사람 크기(tune)에서 빗금이 이긴 픽셀은 중간 톤 (가독성 다듬기 R27: 빗금이 촘촘한 Endbringer·천사의 몸이 검은 실루엣·매듭이었다). 먹은 먹선이 이긴 픽셀만
          if (best === HATCH) best = tune ? HATCH_TONE : INK
        } else {
          // 칠 가운데 가장 많이 덮은 것 — 빛 있는 칠(숲·물·불·피·금)이 그 픽셀의 1/4 넘게 덮으면 중간 톤보다 그 빛을 지킨다 (붉은 엘드라지·불 원소가 갈색 덩이가 됐다)
          for (let v = 1; v < cnt.length; v++) if (!INKISH.has(v) && cnt[v] > cnt[best]) best = v
          if (ink > midAt * SUB * SUB) best = toneMid ? HATCH_TONE : HATCH
          // 밝은 칠 위를 빗금이 촘촘히 덮으면 칠 대신 중간 톤 (R35: 빗금을 반만 먹으로 세어 크림 칠이 이겨, 어두운 빗금 실루엣인 Terastodon·Lorthos 가 크림 빵·유령이었다)
          else if (!tune && LIGHT.has(best) && cnt[HATCH] >= SMALL_HATCH_TONE * SUB * SUB) best = HATCH_TONE
        }
        if (!best) for (const v of INKISH) if (cnt[v] > cnt[best]) best = v === HATCH ? INK : v
        px[y * W + x] = best
      }
  }
  pick(SMALL_COVER)
  // 사람 크기 그림의 먹이 덮인 픽셀의 MID_INK_CAP 을 넘으면 그 그림만 먹 문턱을 올려 다시 고른다 (R27)
  const darkShare = () => {
    let on = 0
    let inky = 0
    for (const v of px) if (v) (on++, INKISH.has(v) && inky++)
    return on ? inky / on : 0
  }
  const capInk = () => {
    if (darkShare() > MID_INK_CAP) {
      inkAt = MID_INK_RETRY
      px.fill(0)
      pick(SMALL_COVER)
    }
  }
  if (tune) {
    capInk()
    // 밝은 그림이 어두운 실루엣으로 (그림별 다듬기 F1): 굵은 선(부표본 3)이 3 픽셀 남짓한 팔다리·옷자락·목을 거의 다 덮어 빗금 문턱(1/4)을 넘은 칠 픽셀이 짙은 갈색이 되었다 —
    // 린발라가 유목, 옴나스가 그루터기, 니사·타즈리·아키리가 검은 귀신, 코질렉이 검은 로봇. 몸빛이 밝은데(칠 가운데 어두운 칠이 MID_LIGHT_SRC 아래) 먹·빗금이 MID_DARK_RESULT 넘게 덮으면
    // 가는 선(SMALL_WIDTH)·높은 빗금 문턱(MID_RETRY_MID)으로 다시 고르고 빗금 문턱을 넘은 칠은 중간 톤으로 — 지금 지도처럼 밝은 몸에 먹 윤곽. 몸이 어두운 칠인 그림과 이미 밝은 그림은 그대로
    // 몸빛 — 칠 몫만 그려 어두운 칠(어둠·먹이 아닌 칠 가운데 'dark')이 덮은 몫. 선은 지금 지도에서 화면 굵기라 몸빛을 정하지 않는다
    const fills = rasterFigure(parts.filter((p) => p.c <= DARK_FILL), frame, at, size, flip, u / SUB, true, { width: SMALL_WIDTH })
    let cov = 0
    let darkFill = 0
    for (const v of fills.idx) if (v) (cov++, v === DARK_FILL && darkFill++)
    const ref = cov ? darkFill / cov : 1
    if (ref <= MID_LIGHT_SRC && darkShare() > MID_DARK_RESULT) {
      const was = px.slice()
      const wasDark = darkShare()
      hi = rasterFigure(parts, frame, at, size, flip, u / SUB, true, { width: SMALL_WIDTH })
      inkAt = tune.ink
      midAt = MID_RETRY_MID
      toneMid = true
      px.fill(0)
      pick(SMALL_COVER)
      capInk()
      if (darkShare() >= wasDark) px.set(was)
    }
  }
  // 홀로 뻗은 획 (그림별 다듬기 F12): 목·다리·더듬이·촉수 끝처럼 먹선 하나뿐인 몫은 덮임이 SMALL_COVER 에 못 미쳐 비워져 Brood Butcher 가 분홍 컵케이크, Lorthos 가
  // 촉수 없는 크림 유령이었다. 빈 칸 가운데 먹선(먹·굵은 먹)이 LONE_INK 넘게 지나고 이미 고른 이웃(8 방향)이 둘 이하인 칸 — 획의 끝이나 홀로 난 획 — 을 먹으로 (두 번, 한 칸씩 뻗는다).
  // 이웃이 많은 칸(나란한 획 사이)은 그대로 비워 둔다
  if (!tune && px.some((v) => v))
    for (let pass = 0; pass < 2; pass++) {
      const snap = px.slice()
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const i = y * W + x
          if (snap[i]) continue
          let n = 0
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              if (!dx && !dy) continue
              const xx = x + dx
              const yy = y + dy
              if (xx >= 0 && yy >= 0 && xx < W && yy < H && snap[yy * W + xx]) n++
            }
          if (!n || n > 2) continue
          let line = 0
          const hx0 = (gx0 + x) * SUB - hi.gx0
          const hy0 = (gy0 + y) * SUB - hi.gy0
          for (let sy = 0; sy < SUB; sy++)
            for (let sx = 0; sx < SUB; sx++) {
              const hx = hx0 + sx
              const hy = hy0 + sy
              if (hx < 0 || hy < 0 || hx >= hi.w || hy >= hi.h) continue
              const v = hi.idx[hy * hi.w + hx]
              if (v === INK || v === INK_BOLD) line++
            }
          if (line > LONE_INK * SUB * SUB) px[i] = INK
        }
    }
  // 덮인 넓이가 모자라 빈 그림이 되면 (가는 선뿐인 그림) 한 칸이라도 덮은 픽셀을 모두
  if (!px.some((v) => v)) pick(1 / (SUB * SUB))
  // 외톨이 픽셀 정리 — 그림 안(네 이웃이 모두 칠한 칸)에서 네 이웃 어디에도 같은 몫이 없는 픽셀은 이웃에 가장 많은 몫으로 (먹·중간 톤·칠이 한 칸씩 뒤섞여 얼룩졌다).
  // 빛 있는 칠(불·피·금 …)의 외톨이는 둔다 — 작은 그림의 눈·불꽃 한 점이 그 그림을 알아보게 한다
  const tidy = px.slice()
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x
      const v = px[i]
      if (!v || HUED.has(v)) continue
      const n = [px[i - 1], px[i + 1], px[i - W], px[i + W]]
      // 먹과 중간 톤은 한 무리로 — 어두운 몸 안의 중간 톤 한 칸·먹 한 칸은 얼룩이 아니다
      const g = (m) => (m === HATCH || INKISH.has(m) ? -1 : m)
      if (n.some((m) => !m) || n.some((m) => g(m) === g(v))) continue
      const c = new Map()
      for (const m of n) c.set(m, (c.get(m) ?? 0) + 1)
      tidy[i] = [...c].sort((a, b) => b[1] - a[1])[0][0]
    }
  px.set(tidy)
  // 둘레 — 어두운 실루엣이라 먹·중간 톤 곁에만 옅은 회록빛 테두리를 한 겹 두른다: 숲·물·어두운 땅 위에서도 그림이 떨어져 보이게. 이름 후광·장소 기호의 크림빛과
  // 갈리는 빛(밝은 칠 위 흐린 물빛 SEA_TINT)으로 — 크림 테두리는 스티커·장소 기호처럼 보였다(R1 검토). 밝은 칠 곁에는 두르지 않고(칠이 이미 밝다), 아주 작은 그림은 두르지 않는다
  const out = px.slice()
  const dark = (v) => v === HATCH || INKISH.has(v)
  const longPx = Math.max(...[0, 1].map((a) => {
    let lo = Infinity
    let hi2 = -Infinity
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px[y * W + x]) { const c = a ? y : x; if (c < lo) lo = c; if (c > hi2) hi2 = c }
    return hi2 - lo + 1
  }))
  // 사람 크기 그림(MID_TUNE)은 테를 두르지 않는다 — 모래 위의 옅은 테가 고른 표시처럼 빛났다 (R21). 그 크기부터는 먹 윤곽이 바탕과 가른다
  // 바깥 — 상자 가장자리에서 빈 칸으로 이어지는 칸 (가독성 다듬기 R22: 다리·촉수 사이 갇힌 빈 칸에도 테를 둘러 타이탄이 푸른 점 박힌 검은 덩이였다)
  const outside = new Uint8Array(W * H)
  const stack = []
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x)
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1)
  while (stack.length) {
    const i = stack.pop()
    if (outside[i] || px[i]) continue
    outside[i] = 1
    const x = i % W
    if (x > 0) stack.push(i - 1)
    if (x < W - 1) stack.push(i + 1)
    if (i >= W) stack.push(i - W)
    if (i < (H - 1) * W) stack.push(i + W)
  }
  // 갇힌 작은 구멍(SMALL_HOLE 픽셀 이하)은 이웃 몫으로 메운다 — 한두 픽셀 구멍이 바탕빛 점으로 비쳤다. 더 큰 구멍은 빈 칸 그대로
  const seen = new Uint8Array(W * H)
  for (let s0 = 0; s0 < W * H; s0++) {
    if (px[s0] || outside[s0] || seen[s0]) continue
    const cells = []
    const st = [s0]
    seen[s0] = 1
    while (st.length) {
      const i = st.pop()
      cells.push(i)
      const x = i % W
      for (const k of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) if (k >= 0 && k < W * H && !px[k] && !seen[k]) (seen[k] = 1), st.push(k)
    }
    if (cells.length > SMALL_HOLE) continue
    for (const i of cells) {
      const c = new Map()
      const x = i % W
      for (const k of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) if (k >= 0 && k < W * H && px[k] && !HUED.has(px[k])) c.set(px[k], (c.get(px[k]) ?? 0) + 1)
      if (c.size) out[i] = [...c].sort((a, b) => b[1] - a[1])[0][0]
    }
  }
  if (longPx > SMALL_NO_RIM && !tune)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x
        if (!outside[i]) continue
        if ((x > 0 && dark(px[i - 1])) || (x < W - 1 && dark(px[i + 1])) || (y > 0 && dark(px[i - W])) || (y < H - 1 && dark(px[i + W]))) out[i] = SMALL_RIM
      }
  return { gx0, gy0, w: W, h: H, idx: out }
}

/** 몫 번호를 (값, 길이 ≤ 255) 쌍으로 줄여 base64 로 — 거의 빈 칸이 길게 이어진다 */
export function encodeIdx(idx) {
  const out = []
  for (let i = 0; i < idx.length; ) {
    const v = idx[i]
    let n = 1
    while (i + n < idx.length && idx[i + n] === v && n < 255) n++
    out.push(v, n)
    i += n
  }
  return Buffer.from(out).toString('base64')
}

export async function buildPixelFigures() {
  const { BY_PHASE } = await import(pathToFileURL(`${ROOT}scripts/phase-cards.mjs`).href)
  const T = await import(src('data/timeline.ts'))
  const frames = JSON.parse(fs.readFileSync(`${ROOT}src/map/figures/frames.json`, 'utf8'))
  const groups = new Map()
  const artOf = async (id) => {
    const g = frames[id][0]
    if (!groups.has(g)) groups.set(g, (await import(src(`map/figures/${g}.ts`))).default)
    const a = groups.get(g)[id]
    if (!a) throw new Error(`pixel figures: 그림 묶음 ${g} 에 ${id} 가 없다`)
    return a
  }
  const cards = BY_PHASE.flat()
  const phaseOf = new Map(BY_PHASE.flatMap((list, i) => list.map((c) => [c.id, i + 1])))
  const byId = new Map(cards.map((c) => [c.id, c]))
  const lookup = (id) => byId.get(id)

  // 카드 — 시점 어느 하나에 그려지는 것(세계 지도 그림이든 지역 상세 대상이든 — 패널이 그곳의 카드를 싣는다)
  const cardIndex = new Map()
  const cardRows = []
  const ci = (c) => {
    if (!cardIndex.has(c.id)) {
      cardIndex.set(c.id, cardRows.length)
      cardRows.push([c.id, c.name, c.nameKo ?? 0, c.set, phaseOf.get(c.id), c.estimate ? 1 : 0, c.depicts.type === 'continent' ? `continent/${c.depicts.id}` : c.depicts.id, c.place ? 1 : 0])
    }
    return cardIndex.get(c.id)
  }
  // 자리 — 같은 카드라도 시점마다 자리(time.moved)가 다르면 따로
  const placeIndex = new Map()
  const places = []
  const times = {}
  const drawn = {}
  for (const t of T.SHOWN_TIME_POINTS) {
    const shown = cards.filter((c) => T.shownAtTimeOf(c, t, lookup))
    // 그 시점에 그리는 카드와 그 시점의 지역 상세 (세계 지도 그림이면 0) — 패널이 장소마다 싣는다 (App.tsx 의 phaseCardsHere)
    drawn[t] = shown.map((c) => [ci(c), T.childMapAt(c, t) ?? 0])
    // 세계 지도 그림과 지역 상세의 대상 (S9 — 지역 상세가 나오는 단계에서만)
    const world = shown.filter((c) => !c.place && T.childMapAt(c, t) === undefined)
    const inDetail = shown.filter((c) => !c.place && T.childMapAt(c, t) !== undefined)
    // 그리는 차례 — 밑에 까는 그림(under)이 먼저, 그다음 카드 차례 (ZendikarMap.tsx 의 FigureLayer). 지역 상세의 대상은 그 위에
    const order = [...world.filter((c) => c.under), ...world.filter((c) => !c.under), ...inDetail]
    times[t] = order.map((c) => {
      if (!frames[c.id]) throw new Error(`pixel figures: ${c.id} 의 그림 상자가 없다 (frames.json)`)
      const m = T.movedAt(c, t)
      const at = m?.at ?? c.at
      const flip = Boolean(m?.flip ?? c.flip)
      // 이름 쪽 — 그 시점에 옮긴 자리면 그 자리의 쪽(없으면 카드의 쪽), 아니면 그 시점의 쪽(time.label) — App.tsx 의 phaseCards 와 같다
      const label = (m ? (m.label ?? c.label) : (c.time?.label?.[t] ?? c.label)) ?? ''
      const detail = T.childMapAt(c, t) !== undefined
      const key = `${c.id}|${at[0]}|${at[1]}|${flip ? 1 : 0}|${detail ? 1 : 0}`
      if (!placeIndex.has(key)) {
        placeIndex.set(key, places.length)
        places.push({ c, at, flip, detail })
      }
      return [placeIndex.get(key), label]
    })
  }

  // 어느 시점에도 그리지 않는 카드(time.at 이 빈 것)도 — 패널이 '시점별 지도에는 그리지 않음'과 그 까닭을 싣는다
  for (const c of cards) ci(c)
  // 지역 상세 → 그 지역 상세와 그 위 지역 상세들의 장소 (App.tsx 의 detailInPlace)
  const { CHILD_MAPS } = await import(src('data/childMaps.ts'))
  const byDetail = new Map(CHILD_MAPS.map((d) => [d.id, d]))
  const details = {}
  for (const d of CHILD_MAPS) {
    const chain = []
    for (let x = d; x; x = x.parent === undefined ? undefined : byDetail.get(x.parent)) chain.push(x.place)
    details[d.id] = chain
  }

  // 굽기
  const flatCache = new Map()
  const flatOf = async (id) => {
    if (!flatCache.has(id)) {
      const a = await artOf(id)
      flatCache.set(
        id,
        figureParts(id, a.parts).map((p) => {
          const c = FIG_CLASSES.indexOf(p.cls) + 1
          if (!c) throw new Error(`pixel figures: ${id} 의 몫 ${p.cls} 를 모른다`)
          // 선 몫의 닫힌 하위 경로(Z)는 첫 점으로 돌아오는 변까지 (칠은 스캔이 고리로 잇는다) — S6 의 periods.mjs linesOf 와 같다
          const line = !FILLS.has(p.cls)
          return {
            c,
            subs: flattenPath(p.d).map((s) => {
              const [fx, fy] = s.pts[0]
              const [lx, ly] = s.pts[s.pts.length - 1]
              return line && s.closed && (fx !== lx || fy !== ly) ? [...s.pts, s.pts[0]] : s.pts
            }),
          }
        }),
      )
    }
    return flatCache.get(id)
  }
  const chunks = {}
  const placeRows = []
  // 물 위 윤곽 (R14b) — 그 단계 격자에서 세계 지도의 바다·호수 칸
  const { ringsFor } = await import(src('pixel/rings.ts'))
  const W_ = await import(src('pixel/raster/world.ts'))
  const wetRim = (s, u) => {
    if (!s.idx.includes(OUTLINE) && !s.idx.includes(SMALL_RIM) && !s.idx.includes(WAVE) && !s.idx.includes(SEA)) return
    const cells = W_.rasterRegion(ringsFor(u), u, { x0: s.gx0, y0: s.gy0, w: s.w, h: s.h })
    const { region, kind } = cells
    for (let i = 0; i < s.idx.length; i++) {
      const v = s.idx[i]
      if (v !== OUTLINE && v !== SMALL_RIM && v !== WAVE && v !== SEA) continue
      const gx = s.gx0 + (i % s.w) - region.x0
      const gy = s.gy0 + Math.floor(i / s.w) - region.y0
      const k = gx < 0 || gy < 0 || gx >= region.w || gy >= region.h ? W_.LAND : kind[gy * region.w + gx]
      const wet = k === W_.SEA || k === W_.LAKE
      if (v === OUTLINE) {
        if (wet) s.idx[i] = WET_RIM
      } else if (v === WAVE || v === SEA) {
        // 흐린 물빛은 물 위에서만 물 — 땅 위에서는 날개 막·안개·그림자의 회색 (가독성 다듬기 R30: 지금 지도는 불투명도 35% 바다 먹이라 땅 위에서 비치는 회색인데,
        // 물빛으로 칠해 Sky Ruin Drake 가 숲 위 연못, Endbringer·Reality Smasher 가 푸른 웅덩이에 서 있었다)
        if (!wet) s.idx[i] = MEMBRANE
      // 작은 그림의 테는 숲 위에만 (가독성 다듬기 R46: 물 위 옅은 테가 해안 물거품과 같아 바다 괴물·떠 있는 헤드론이 파도 두른 바위섬으로 읽혔다 — 짙은 실루엣은 바다와 갈린다)
      } else s.idx[i] = k === W_.FOREST && !wet ? RIM_FOREST : 0
    }
  }
  for (let pi = 0; pi < places.length; pi++) {
    const { c, at, flip, detail } = places[pi]
    const frame = frames[c.id].slice(1)
    const b = figureBox(frame, at, c.size, flip)
    placeRows.push([ci(c), q(at[0]), q(at[1]), q(c.size), flip ? 1 : 0, q(b.x0), q(b.y0), q(b.x1), q(b.y1), detail ? 1 : 0])
    const parts = await flatOf(c.id)
    for (let li = 0; li < LEVELS.length; li++) {
      const u = LEVELS[li]
      if (c.size / u < MIN_PX || (detail && li < DETAIL_LEVEL)) continue
      const s = bakeFigure(c.id, parts, frame, at, c.size, flip, u)
      wetRim(s, u)
      const cell = CELL[li]
      const key = cell ? `${li}-${Math.floor(at[0] / cell)}-${Math.floor(at[1] / cell)}` : `${li}`
      ;(chunks[key] ??= []).push([pi, li, s.gx0, s.gy0, s.w, s.h, encodeIdx(s.idx)])
    }
  }
  // 같은 개체의 묶음 (time.same) — 패널이 그해에 그 인물을 맡는 그림의 이름을 싣는다 (S22 — 지금 지도의 drawnKinOf)
  const same = Object.fromEntries(cards.flatMap((c) => (c.time?.same ? [[c.id, typeof c.time.same === 'string' ? [c.time.same] : c.time.same]] : [])))
  return { meta: { v: 2, levels: LEVELS, minPx: MIN_PX, cell: CELL, detailLevel: DETAIL_LEVEL, cards: cardRows, places: placeRows, times, drawn, details, same, chunks: Object.keys(chunks).sort() }, chunks }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const t0 = performance.now()
  const data = await buildPixelFigures()
  if (process.argv.includes('--json')) process.stdout.write(JSON.stringify(data))
  else {
    const zlib = await import('node:zlib')
    const sizeOf = (o) => {
      const s = JSON.stringify(o)
      return `${(s.length / 1024).toFixed(0)}KB/gz ${(zlib.gzipSync(s).length / 1024).toFixed(0)}KB`
    }
    const perLevel = LEVELS.map((_, li) => Object.entries(data.chunks).filter(([k]) => k.split('-')[0] === String(li)))
    console.log(`ms ${Math.round(performance.now() - t0)} · 카드 ${data.meta.cards.length} · 자리 ${data.meta.places.length} · meta ${sizeOf(data.meta)}`)
    for (const [t, list] of Object.entries(data.meta.times)) console.log(`T${t}: 세계 지도 그림 ${list.length} · 그려지는 카드 ${data.meta.drawn[t].length}`)
    perLevel.forEach((list, li) => {
      const n = list.reduce((s, [, v]) => s + v.length, 0)
      const all = list.flatMap(([, v]) => v)
      console.log(`u=${LEVELS[li]}: 조각 ${list.length} · 그림 ${n} · ${all.length ? sizeOf(all) : '-'}${list.length > 1 ? ` · 가장 큰 조각 ${sizeOf(list.reduce((a, b) => (JSON.stringify(a[1]).length > JSON.stringify(b[1]).length ? a : b))[1])}` : ''}`)
    })
  }
}
