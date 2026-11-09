// 카드 색으로 칠한 가장 깊은 단계의 그림 (카드 그림 대조 C25 — 사용자 결정 2026-11-09 '1차 방식').
// 끝까지 확대해도 먹선·빗금만 짙은 한 빛 그림이라 무엇인지 알아보기 힘들었다 — 같은 그림 원본(모양)을, 카드 원본 그림의 주된 빛에서 고른
// pixelfx 램프(src/pixel/figures/ramps.ts, 카드마다 scripts/pixel/figureRamps.json)로 칠한다:
//  - 4 배 고운 격자에 칠(몫 1–10)과 모든 몫을 따로 굽고, 한 픽셀(4×4 칸)마다 칠이 5/16 넘게 덮으면 가장 많은 칠의 재료, 아니면 선만 5/16 넘으면 선
//  - 빗금(hatch)은 버리고, 칠 안을 지나는 짙은 먹선은 그 재료의 두 단 어두운 빛
//  - 빛은 왼쪽 위에서 — 위·왼쪽이 비면 한 단 밝게, 오른쪽·아래가 비거나 두 칸 밑이 비면 한 단 어둡게 (칸마다 딱 떨어지는 세 단)
//  - 가장자리는 안쪽 살이 곁에 있으면 램프의 윤곽 빛, 가는 띠(살이 없는 것)는 한 단 어두운 그 재료 빛 — 먹 테로 메우지 않는다
//  - 손 그림(scripts/pixel/figureSprites.mjs)이 있는 단계는 그 손 그림의 몫을 같은 규칙으로 칠한다
import { RAMPS, rampClass, rampOutline } from '../../src/pixel/figures/ramps.ts'

/** 이 단계(한 픽셀의 지도 단위)부터 카드 색으로 굽는다 */
export const COLOR_LEVELS = new Set([0.25])
const SUB = 4
const COVER = 5
const INKY = 7
/** 재료 — 카드 램프(main …)와 따로 칠하는 몫 */
const MAT_OF = { 1: 'main', 2: 'main-', 3: 'stone', 4: 'leaf', 5: 'sea', 6: 'water', 7: 'fire', 8: 'blood', 9: 'gold', 10: 'dark' }
const MAT_RAMP = { stone: ['stone', 5], leaf: ['leaf', 4], water: ['water', 4], fire: ['fire', 5], blood: ['blood', 4], gold: ['gold', 4] }
const INK_CLASSES = new Set([11, 12, 14, 15])
const LINE_WIDTH = { ink: 2, 'ink-bold': 3, hatch: 1, 'fire-ink': 2, 'sea-ink': 2 }

function shade(mat, ink, W, H, ramp, base) {
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H && mat[y * W + x] && mat[y * W + x] !== 'line'
  const tone = (m, k) => {
    if (m === 'main' || m === 'main-' || m === 'main+') return rampClass(ramp, base + k + (m === 'main-' ? -1 : m === 'main+' ? 1 : 0))
    if (m === 'dark') return rampClass(ramp, 1 + k)
    const [r, b] = MAT_RAMP[m]
    return rampClass(r, b + k)
  }
  const outline = rampOutline(ramp)
  const N4 = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]
  const core = (x, y) => inside(x, y) && N4.every(([ex, ey]) => inside(x + ex, y + ey))
  const idx = new Uint8Array(W * H)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const m = mat[y * W + x]
      if (!m) continue
      if (m === 'line') {
        idx[y * W + x] = rampClass(ramp, Math.max(1, base - 2))
        continue
      }
      if (!N4.every(([dx, dy]) => inside(x + dx, y + dy))) {
        let c = false
        for (let dy = -1; dy <= 1 && !c; dy++) for (let dx = -1; dx <= 1 && !c; dx++) c = core(x + dx, y + dy)
        idx[y * W + x] = c ? outline : tone(m, -1)
        continue
      }
      if (ink[y * W + x]) {
        idx[y * W + x] = tone(m, -2)
        continue
      }
      let k = 0
      if (!inside(x - 1, y) || !inside(x, y - 1) || !inside(x - 1, y - 1)) k = 1
      else if (!inside(x + 1, y) || !inside(x, y + 1) || !inside(x + 1, y + 1) || !inside(x, y + 2)) k = -1
      idx[y * W + x] = tone(m, k)
    }
  return idx
}

/** 물빛(몫 5 — 지금 지도의 흐린 바다 칠)은 물 위에서만 물, 땅 위에서는 날개 막·안개라 그 카드 빛의 밝은 단 (가독성 다듬기 R30 과 같은 까닭) */
const seaMat = (wet) => (wet ? 'water' : 'main+')

/**
 * 그림 원본에서 카드 색 그림을 굽는다. rasterFigure 는 scripts/pixel/figures.mjs 의 것(고운 격자로 부른다), wetGrid(box) 는 그 단계 격자의 물 칸 판정
 * @returns {{ gx0: number, gy0: number, w: number, h: number, idx: Uint8Array }}
 */
export function colorBake(rasterFigure, parts, frame, at, size, flip, u, ramp, base, wetGrid) {
  if (!RAMPS[ramp]) throw new Error(`pixel figures: 모르는 램프 ${ramp}`)
  const U = u / SUB
  const raw = { width: LINE_WIDTH }
  const A = rasterFigure(parts, frame, at, size, flip, U, true, raw)
  const fillParts = parts.filter((p) => p.c <= 10)
  const F = fillParts.length ? rasterFigure(fillParts, frame, at, size, flip, U, true, raw) : null
  const get = (G, x, y) => {
    const xx = x - G.gx0
    const yy = y - G.gy0
    return xx >= 0 && yy >= 0 && xx < G.w && yy < G.h ? G.idx[yy * G.w + xx] : 0
  }
  const gx0 = Math.floor(A.gx0 / SUB)
  const gy0 = Math.floor(A.gy0 / SUB)
  const W = Math.floor((A.gx0 + A.w) / SUB) + 1 - gx0
  const H = Math.floor((A.gy0 + A.h) / SUB) + 1 - gy0
  const wet = wetGrid ? wetGrid({ x0: gx0, y0: gy0, w: W, h: H }) : () => false
  const mat = new Array(W * H).fill(null)
  const ink = new Uint8Array(W * H)
  const fc = new Map()
  for (let Y = 0; Y < H; Y++)
    for (let X = 0; X < W; X++) {
      fc.clear()
      let cov = 0
      let inks = 0
      let lines = 0
      for (let sy = 0; sy < SUB; sy++)
        for (let sx = 0; sx < SUB; sx++) {
          const x = (gx0 + X) * SUB + sx
          const y = (gy0 + Y) * SUB + sy
          const v = F ? get(F, x, y) : 0
          if (v) {
            fc.set(v, (fc.get(v) ?? 0) + 1)
            cov++
          }
          const a = get(A, x, y)
          if (INK_CLASSES.has(a)) inks++
          // 빗금(13)은 선으로 세지 않는다 — 고운 격자의 빗금은 한 단계 굵게 읽혀 그림을 거친 얼룩으로 만들었다
          if (a > 10 && a !== 13) lines++
        }
      const i = Y * W + X
      if (cov >= COVER) {
        let best = 0
        let n = -1
        for (const [v, c] of fc) if (c > n) [best, n] = [v, c]
        mat[i] = best === 5 ? seaMat(wet(gx0 + X, gy0 + Y)) : MAT_OF[best]
        ink[i] = inks >= INKY ? 1 : 0
      } else if (lines >= COVER) mat[i] = 'line'
    }
  return { gx0, gy0, w: W, h: H, idx: shade(mat, ink, W, H, ramp, base) }
}

/** 손 그림의 몫(scripts/pixel/figureSprites.mjs 의 SPRITE_CLASS)을 같은 규칙으로 칠한다 — 먹(K·h·y)은 그 자리 재료의 먹선이라 가장자리면 윤곽, 안이면 두 단 어둡게 */
const SPRITE_MAT = { 1: 'main', 2: 'main-', 3: 'stone', 4: 'leaf', 7: 'fire', 8: 'blood', 9: 'gold', 19: 'main-' }
export function colorSprite(s, ramp, base) {
  const { w: W, h: H } = s
  const mat = new Array(W * H).fill(null)
  const ink = new Uint8Array(W * H)
  for (let i = 0; i < s.idx.length; i++) {
    const v = s.idx[i]
    if (!v || v === 22) continue
    if (SPRITE_MAT[v]) {
      mat[i] = SPRITE_MAT[v]
      ink[i] = v === 19 ? 1 : 0
    } else {
      // 먹 — 곁의 칠 재료를 따른다 (불 먹 y 는 물빛 손 그림에서 물)
      mat[i] = v === 15 ? 'water' : 'main'
      ink[i] = 1
    }
  }
  return { ...s, idx: shade(mat, ink, W, H, ramp, base) }
}

const lab = ([r, g, b]) => {
  const f = (v) => ((v /= 255) > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92)
  const [R, G, B] = [f(r), f(g), f(b)]
  const g3 = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const x = g3((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047)
  const y = g3(R * 0.2126 + G * 0.7152 + B * 0.0722)
  const z = g3((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883)
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}
/** 바탕과 이만큼(Lab 거리)도 다르지 않은 카드 색 그림은 그 바탕 위에서 한 픽셀 테를 두른다 */
const RIM_DE = 26
/**
 * 바탕에 묻히는 카드 색 그림의 테 (C25 — 숲 위의 잎빛 그림, 깊은 바다 위의 쇳빛 그림이 바탕과 같은 빛이라 윤곽만 남았다).
 * 그림 둘레를 한 칸 넓히고, 그림 바로 곁(4 방향)의 빈 칸 가운데 그 바탕(숲·물)인 칸에 테 몫(숲 rimForest·물 rimWet)을 놓는다.
 * fig 은 16비트 팔레트의 몫 빛, ground 는 { forest, water } 의 빛, kindAt(gx, gy) 는 'forest'|'water'|null
 */
export function contrastRim(s, fig, ground, kindAt, rimForest, rimWet) {
  let n = 0
  const m = [0, 0, 0]
  for (const v of s.idx)
    if (v) {
      const c = lab(fig[v])
      for (let k = 0; k < 3; k++) m[k] += c[k]
      n++
    }
  if (!n) return s
  for (let k = 0; k < 3; k++) m[k] /= n
  const dist = (c) => Math.hypot(...lab(c).map((x, k) => x - m[k]))
  const want = { forest: dist(ground.forest) < RIM_DE, water: dist(ground.water) < RIM_DE }
  if (!want.forest && !want.water) return s
  const W = s.w + 2
  const H = s.h + 2
  const idx = new Uint8Array(W * H)
  for (let y = 0; y < s.h; y++) idx.set(s.idx.subarray(y * s.w, (y + 1) * s.w), (y + 1) * W + 1)
  const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && idx[y * W + x] && idx[y * W + x] !== rimForest && idx[y * W + x] !== rimWet
  const gx0 = s.gx0 - 1
  const gy0 = s.gy0 - 1
  let any = false
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (idx[y * W + x] || !(on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) continue
      const k = kindAt(gx0 + x, gy0 + y)
      if (k && want[k]) {
        idx[y * W + x] = k === 'forest' ? rimForest : rimWet
        any = true
      }
    }
  return any ? { gx0, gy0, w: W, h: H, idx } : s
}
