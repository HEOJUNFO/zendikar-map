// 바탕 지형의 새 기호 — 대지(메사)·수정 첨탑·용암 들판·툰드라·맹그로브, 한 점 기호(화산·폭포 등), 바다 표시.
// 좌표만 만드는 순수 함수라 지도(terrain.ts·landscape.ts)와 범례가 같은 모양을 쓴다. 좌표는 지도 단위 (y 는 아래로 자란다)
import type { Landscape, LandmarkGlyph, SeaMark, TerrainAreaKind } from '../data/types'
// geometry 는 .ts 까지 적는다 — 지역 상세 도구(scripts/childmaps/context.mjs·periods.mjs)가 Node 로 이 파일을 바로 읽는다 (types 는 import type 이라 지워진다)
import { distanceToPolyline, hashSeed, mulberry32, pointInRing, polylineToPath, rightNormals, type Point } from './geometry.ts'

const f = (v: number) => (Math.round(v * 10) / 10).toString()

/** 한 기호를 이루는 path 하나 — cls 는 map.css 의 lm-* 클래스 */
export interface GlyphPart {
  cls: LandmarkPartClass
  d: string
}

export type LandmarkPartClass =
  | 'lm-shadow'
  | 'lm-fill'
  | 'lm-shade'
  | 'lm-dark'
  | 'lm-water'
  | 'lm-snow'
  | 'lm-fire-wash'
  | 'lm-hatch'
  | 'lm-ink'
  | 'lm-fire-ink'
  | 'lm-water-ink'
  | 'lm-smoke'
  | 'lm-waterline'
  | 'lm-blood'

/** 타원 path (a 두 번) */
export function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(rx * 2)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-rx * 2)} 0Z`
}

/**
 * 대지(臺地, 메사) — 꼭대기가 평평한 탁상지. 산 기호처럼 옆에서 본 모습으로, 평평한 윗면에서 거의 곧게 떨어지는 벼랑과
 * 그 밑에서 퍼지는 비탈(애추). 벼랑면에는 세로 결 빗금 — 그늘진 오른쪽이 더 촘촘하고 길다
 */
export function mesaGlyph(x: number, y: number, rand: () => number) {
  const w = 8 + rand() * 5
  const h = 5.5 + rand() * 3
  const lx = x - w
  const rx = x + w * (0.9 + rand() * 0.15)
  const tl = x - w * (0.6 + rand() * 0.1)
  const tr = x + w * (0.55 + rand() * 0.1)
  const ty = y - h
  // 벼랑 밑 — 여기서 비탈이 퍼진다
  const yc = y - h * 0.4
  const dip = (rand() - 0.5) * 0.6
  const ridge =
    `M${f(lx)} ${f(y)}Q${f(tl - 0.9)} ${f(y - 0.5)} ${f(tl - 0.35)} ${f(yc)}L${f(tl)} ${f(ty)}` +
    `L${f((tl + tr) / 2)} ${f(ty + dip)}L${f(tr)} ${f(ty)}L${f(tr + 0.35)} ${f(yc)}Q${f(tr + 0.9)} ${f(y - 0.5)} ${f(rx)} ${f(y)}`
  let hatch = ''
  const cliff = yc - ty
  for (let px = tl + 0.9; px < tr - 0.3; px += 0.95 + rand() * 0.5) {
    const t = (px - tl) / (tr - tl)
    // 빛을 받는 왼쪽은 듬성듬성 짧게
    if (t < 0.4 && rand() < 0.55) continue
    const len = cliff * (0.35 + t * 0.55) * (0.8 + rand() * 0.3)
    hatch += `M${f(px)} ${f(ty + 0.5)}l0 ${f(len)}`
  }
  // 오른쪽 비탈의 짧은 빗금
  hatch += `M${f(tr + 0.9)} ${f(yc + 0.7)}l${f(0.9)} ${f((y - yc) * 0.6)}M${f(tr + 2.2)} ${f(yc + 1.4)}l${f(0.8)} ${f((y - yc) * 0.4)}`
  return { fill: `${ridge}Z`, ridge, hatch }
}

/**
 * 수정 첨탑 무리 — 가늘고 모난 기둥 서너 개가 바깥으로 살짝 기운다. 가운데가 가장 높다.
 * fill 은 수정빛(옅은 돌색), hatch 는 기둥마다 가운데 결 선과 그늘진 오른쪽 면의 빗금.
 * small 이면 기둥 두세 개의 낮은 무리 — 성긴 들판과 대륙 산 기호 사이에 섞는 첨탑
 */
export function crystalGlyph(x: number, y: number, rand: () => number, small = false) {
  const n = small ? 2 + Math.floor(rand() * 2) : 3 + Math.floor(rand() * 3)
  const mid = (n - 1) / 2
  const tall = small ? 0.8 : 1
  // 높은 기둥을 먼저(뒤에) 그린다
  const spires = Array.from({ length: n }, (_, i) => {
    const ox = (i - mid) * (2 + rand() * 0.8)
    const hh = (6 + rand() * 6) * tall * (1 - Math.abs(i - mid) * 0.22)
    return { ox, hh, lean: ox * 0.16 + (rand() - 0.5) * 0.8, bw: 0.9 + rand() * 0.6 }
  }).sort((a, b) => b.hh - a.hh)
  let fill = ''
  let ridge = ''
  let hatch = ''
  for (const s of spires) {
    const bx = x + s.ox
    const tip: [number, number] = [bx + s.lean, y - s.hh]
    const pts = [
      [bx - s.bw, y],
      [bx - s.bw * 0.85 + s.lean * 0.7, y - s.hh * 0.74],
      tip,
      [bx + s.bw * 0.85 + s.lean * 0.7, y - s.hh * 0.7],
      [bx + s.bw, y],
    ]
    const d = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${f(px)} ${f(py)}`).join('')
    fill += `${d}Z`
    ridge += `${d}Z`
    hatch += `M${f(tip[0])} ${f(tip[1])}L${f(bx + s.bw * 0.15)} ${f(y)}`
    // 그늘진 오른쪽 면에 짧은 빗금 둘
    for (const t of [0.45, 0.7]) {
      const px = bx + s.lean * (1 - t) * 0.9 + s.bw * 0.45
      hatch += `M${f(px)} ${f(y - s.hh * (1 - t))}l${f(s.bw * 0.4)} ${f(s.hh * 0.12)}`
    }
  }
  return { fill, ridge, hatch }
}

/**
 * 용암 들판 — 흐름 방향(a, 라디안)을 따라 굽이치는 짧은 흐름 획. 가끔 굳은 껍질이 갈라진 Y 자 금
 */
export function lavaGlyph(x: number, y: number, a: number, rand: () => number): string {
  const len = 3.2 + rand() * 2.6
  const c = Math.cos(a)
  const s = Math.sin(a)
  const bend = 0.9 + rand() * 0.6
  // 두 번 굽이치는 흐름 획
  const p0 = [x - c * len, y - s * len]
  const p1 = [x - c * len * 0.5 - s * bend, y - s * len * 0.5 + c * bend]
  const p2 = [x, y]
  const p3 = [x + c * len, y + s * len]
  let d = `M${f(p0[0])} ${f(p0[1])}Q${f(p1[0])} ${f(p1[1])} ${f(p2[0])} ${f(p2[1])}T${f(p3[0])} ${f(p3[1])}`
  if (rand() < 0.35) {
    // 갈라진 껍질 — 흐름 옆에 작은 Y
    const cx = x + -s * (3 + rand() * 1.5)
    const cy = y + c * (3 + rand() * 1.5)
    const r0 = rand() * Math.PI * 2
    for (let k = 0; k < 3; k++) {
      const t = r0 + (k * Math.PI * 2) / 3 + (rand() - 0.5) * 0.6
      const l = 1.1 + rand() * 1.1
      d += `M${f(cx)} ${f(cy)}l${f(Math.cos(t) * l)} ${f(Math.sin(t) * l)}`
    }
  }
  return d
}

/** 툰드라 — 드문 작은 풀포기(path 하나)와 그 곁의 서리 점(둥근 끝 0 길이 획) */
export function tundraGlyph(x: number, y: number, rand: () => number): [string, string] {
  const h = 2 + rand() * 0.9
  // 풀잎 셋과 그 밑 땅 선
  const tuft = `M${f(x)} ${f(y)}l-1 ${f(-h * 0.7)}M${f(x)} ${f(y)}l0.1 ${f(-h)}M${f(x)} ${f(y)}l1 ${f(-h * 0.72)}M${f(x - 1.8)} ${f(y + 0.2)}h3.6`
  let frost = ''
  const n = 2 + Math.floor(rand() * 2)
  for (let i = 0; i < n; i++) {
    const t = rand() * Math.PI * 2
    const r = 3 + rand() * 2.5
    frost += `M${f(x + Math.cos(t) * r)} ${f(y - 1 + Math.sin(t) * r * 0.6)}h0`
  }
  return [tuft, frost]
}

/**
 * 맹그로브 — 물 위로 활처럼 뻗은 버팀뿌리에 선 나무. 수관(숲 기호와 같은 구름 모양), 줄기와 뿌리, 그 아래 물결 두 줄
 */
export function mangroveGlyph(x: number, y: number, rand: () => number) {
  const r = 2.3 + rand() * 1
  const cy = y - 4.2 - r * 0.4
  const lobes = [
    [x - r * 0.55, cy + r * 0.15, r * 0.66],
    [x + r * 0.55, cy + r * 0.2, r * 0.62],
    [x, cy - r * 0.45, r * 0.72],
  ] as const
  let crown = ''
  for (const [cx, ly, cr] of lobes) crown += `M${f(cx - cr)} ${f(ly)}a${f(cr)} ${f(cr)} 0 1 0 ${f(cr * 2)} 0a${f(cr)} ${f(cr)} 0 1 0 ${f(-cr * 2)} 0`
  const top = cy + r * 0.7
  const knee = y - 2
  // 줄기 + 바깥으로 휘어 물에 박히는 뿌리 셋
  const roots =
    `M${f(x)} ${f(top)}L${f(x)} ${f(knee)}` +
    `M${f(x)} ${f(knee)}Q${f(x - 2)} ${f(knee - 0.4)} ${f(x - 2.6)} ${f(y)}` +
    `M${f(x)} ${f(knee)}Q${f(x + 2)} ${f(knee - 0.4)} ${f(x + 2.6)} ${f(y)}` +
    `M${f(x)} ${f(knee - 0.6)}l${f(-0.4)} ${f(y - knee + 0.6)}`
  const w = 3.6 + rand() * 1.2
  const water = `M${f(x - w)} ${f(y + 0.3)}l${f(w * 2)} 0M${f(x - w * 0.5)} ${f(y + 2)}l${f(w)} 0`
  return { crown, roots, water }
}

// --- 한 점 기호 (LandmarkGlyph) — 크기 1 에서 산 기호와 비슷한 10~16 단위 ---

type Pt = readonly [number, number]

/** 한 점 기호의 path 들. at 을 기준점(대개 밑동 가운데)으로, 이미 크기·회전을 적용한 지도 좌표 */
/**
 * 떨어진 하늘거주지(crashed-skyclave) 기호가 둘레의 바탕 기호를 비우는 원 — 가운데는 기준점에서 dy(위가 음수), 반지름 r (크기 1 의 지도 단위).
 * 그림은 이 원 안에 든다. 막힘(landscape.ts 의 buildBlockedMask), 페이즈 칸이 닿는 범위(periodTerrain.ts 의 GLYPH_REACH — |dy| + r),
 * 지역 상세 도구의 빈터 반지름(scripts/childmaps/periods.mjs 의 glyphClear — 같은 |dy| + r, Node 라 값을 옮겨 적었다)이 함께 쓴다 —
 * 맞는지는 scripts/qa/period-mark-test.mjs --base 가 본다
 */
export const SKYCLAVE_WRECK_CLEAR = { dy: -3, r: 17 } as const

/**
 * 한 점 기호가 둘레의 바탕 기호를 비우는 원 — 표에 있는 종류만 (나머지는 buildBlockedMask 의 옛 셈 그대로). 가운데는 기준점에서 dy(위가 음수), 반지름 r (크기 1).
 * 막힘(landscape.ts 의 buildBlockedMask), 페이즈 칸이 닿는 범위(periodTerrain.ts 의 GLYPH_REACH — |dy| + r), 지역 상세 도구의 빈터 반지름
 * (scripts/childmaps/periods.mjs 의 glyphClear), svgdiff 상자(src/data/periods/qa.ts)가 함께 쓴다.
 * - crashed-skyclave·compleated-ground(-oil): 그림 전체가 이 원 안에 든다
 * - compleated-skyclave: 떠 있는 밑동 가운데만 — 하늘에 떠 있어 그 밑의 숲을 비우지 않고 그 앞에 그린다 (그 밑의 바뀐 땅은 compleated-ground 가 비운다)
 * - realmbreaker-sky·realmbreaker-sea: 가지가 땅·물에 닿는 밑동 둘레만 비운다 — 가지와 차원문은 하늘에 있어 그 밑의 숲·땅을 비우지 않고 그 앞에 그린다
 */
export const GLYPH_CLEAR: Partial<Record<LandmarkGlyph['kind'], { readonly dy: number; readonly r: number }>> = {
  'crashed-skyclave': SKYCLAVE_WRECK_CLEAR,
  'compleated-ground': { dy: 0, r: 14.5 },
  'compleated-ground-oil': { dy: 0, r: 14.5 },
  'compleated-skyclave': { dy: -10, r: 6 },
  'realmbreaker-sky': { dy: 0, r: 5.5 },
  'realmbreaker-sea': { dy: 0, r: 7 },
}
/** 그림 둘레에 맞춘 빈자리의 여백 (지도 단위) — 막힘 격자(2 단위 칸의 가운데로 찍는다)와 둘레 기호의 밑동이 그림 가장자리에 붙지 않을 만큼 */
const CLEAR_MARGIN = 1.5

/**
 * 표(GLYPH_CLEAR)에 있는 기호가 둘레의 바탕 기호를 비우는 자리 — (x, y) 를 비우는가. 표에 없는 종류는 undefined.
 * - compleated-ground(-oil): 그 그림의 가장자리 안과 그 둘레 CLEAR_MARGIN — 원으로 비우면 고르지 않은 가장자리 둘레에 나무 없는 띠가 남았다 (2026-11-03 검토)
 * - crashed-skyclave: 그림(선체·둥근 지붕·파편)의 볼록 껍질 안과 그 둘레 CLEAR_MARGIN
 * - 나머지(떠 있는 하늘거주지, Invasion Tree 가지): 표의 원 그대로
 * 어느 것이든 표의 원 안으로 자른다 — 원(|dy| + r 로 기준점 둘레를 덮는 범위)은 GLYPH_REACH·glyphClear·svgdiff 상자가 그대로 쓴다.
 * 막힘(landscape.ts 의 buildBlockedMask)과 지역 상세 도구의 빈터(scripts/childmaps/context.mjs 의 periods.redraw)가 함께 쓴다
 */
export function glyphClearTest(g: Pick<LandmarkGlyph, 'kind' | 'at' | 'size' | 'angle'>): ((x: number, y: number) => boolean) | undefined {
  const c = GLYPH_CLEAR[g.kind]
  if (!c) return undefined
  const s = g.size ?? 1
  const cx = g.at[0]
  const cy = g.at[1] + c.dy * s
  const r = c.r * s
  const inCircle = (x: number, y: number) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r
  let ring: Pt[] | null = null
  if (g.kind === 'compleated-ground' || g.kind === 'compleated-ground-oil') ring = pathPoints(landmarkParts(g)[0].d)
  else if (g.kind === 'crashed-skyclave') ring = convexHull(drawnPoints(landmarkParts(g)))
  if (!ring) return inCircle
  const shape = ring
  return (x, y) => inCircle(x, y) && (pointInRing(x, y, shape) || distanceToPolyline(x, y, shape, true) <= CLEAR_MARGIN)
}

const PATH_ARGS: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 }

/**
 * path 가 지나는 점들 — 끝점·조절점 차례로, 호는 반 타원(지름의 두 끝을 잇는 호 — ellipsePath·E 가 쓰는 꼴)으로 보고 그 네 끝까지.
 * 상자·볼록 껍질·가장자리 다각형을 셀 때 (호의 깃발은 떼어 쓴 것만 읽는다 — landmarkParts 가 그렇게 쓴다)
 */
export function pathPoints(d: string): Pt[] {
  const out: Pt[] = []
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? []
  let x = 0
  let y = 0
  let sx = 0
  let sy = 0
  let cmd = ''
  let i = 0
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++]
    const lower = cmd.toLowerCase()
    const k = PATH_ARGS[lower]
    if (k === undefined) break
    if (k === 0) {
      x = sx
      y = sy
      cmd = ''
      continue
    }
    const a = tokens.slice(i, i + k).map(Number)
    if (a.length < k || a.some((v) => !Number.isFinite(v))) break
    i += k
    const rel = cmd === lower
    const ox = rel ? x : 0
    const oy = rel ? y : 0
    if (lower === 'h') x = ox + a[0]
    else if (lower === 'v') y = oy + a[0]
    else if (lower === 'a') {
      // 반 타원 (ellipsePath·E 가 쓰는 꼴 — 지름의 두 끝을 잇는 호) — 가운데는 시작점과 끝점의 가운데, 그 둘레 네 끝
      const ex = ox + a[5]
      const ey = oy + a[6]
      const mx = (x + ex) / 2
      const my = (y + ey) / 2
      const rx = Math.abs(a[0])
      const ry = Math.abs(a[1])
      out.push([x, y], [mx - rx, my], [mx + rx, my], [mx, my - ry], [mx, my + ry])
      x = ex
      y = ey
    } else {
      for (let j = 0; j < k - 2; j += 2) out.push([ox + a[j], oy + a[j + 1]])
      x = ox + a[k - 2]
      y = oy + a[k - 1]
    }
    out.push([x, y])
    if (lower === 'm') {
      sx = x
      sy = y
      cmd = rel ? 'l' : 'L'
    }
  }
  return out
}

/** 기호 그림(흐린 그림자 lm-shadow 는 빼고)의 점들 — pathPoints */
export const drawnPoints = (parts: readonly GlyphPart[]): Pt[] => parts.filter((p) => p.cls !== 'lm-shadow').flatMap((p) => pathPoints(p.d))

/**
 * 기호 그림(흐린 그림자는 빼고)이 닿는 상자 — drawnPoints 의 상자. 사가4 의 큰 기호(GLYPH_CLEAR)를 이름이 비키는 상자
 * (src/data/labelAvoid.ts 에 적어 둔 값 — scripts/qa/period-mark-test.mjs 가 이것으로 맞는지 본다)
 */
export function landmarkBox(parts: readonly GlyphPart[]): { x0: number; y0: number; x1: number; y1: number } {
  const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
  for (const [x, y] of drawnPoints(parts)) {
    b.x0 = Math.min(b.x0, x)
    b.y0 = Math.min(b.y0, y)
    b.x1 = Math.max(b.x1, x)
    b.y1 = Math.max(b.y1, y)
  }
  return b
}

/** 볼록 껍질 (monotone chain, 시계 반대 방향) */
function convexHull(points: readonly Pt[]): Pt[] {
  const pts = [...points].sort((p, q) => p[0] - q[0] || p[1] - q[1])
  if (pts.length < 3) return pts
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: Pt[] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: Pt[] = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}

/** 비우는 원의 기준점에서 가장 먼 거리 (|dy| + r, 크기 1) — 표에 없는 종류는 undefined */
export const glyphClearReach = (kind: string): number | undefined => {
  const c = GLYPH_CLEAR[kind as LandmarkGlyph['kind']]
  return c ? Math.abs(c.dy) + c.r : undefined
}

/** 가는 꺾은선을 따라 폭이 바뀌는 띠 (닫힌 path 의 점들) — 가운데 선 pts, 점마다의 폭 w */
function ribbon(pts: readonly Pt[], w: readonly number[]): Pt[] {
  const n = pts.length
  const nrm = pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(n - 1, i + 1)]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    return [-(b[1] - a[1]) / len, (b[0] - a[0]) / len] as const
  })
  const side = (k: number) => pts.map(([x, y], i): Pt => [x + (nrm[i][0] * k * w[i]) / 2, y + (nrm[i][1] * k * w[i]) / 2])
  return [...side(1), ...side(-1).reverse()]
}
/** 3차 베지에 위의 점 */
const cubicAt = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const a = (1 - t) ** 3
  const b = 3 * t * (1 - t) ** 2
  const c = 3 * t * t * (1 - t)
  const d = t ** 3
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]
}

export function landmarkParts(g: Pick<LandmarkGlyph, 'kind' | 'at' | 'size' | 'angle'>): GlyphPart[] {
  const s = g.size ?? 1
  const [x0, y0] = g.at
  const rot = ((g.angle ?? 0) * Math.PI) / 180
  const cos = Math.cos(rot)
  const sin = Math.sin(rot)
  // 기호 좌표(가로 u, 세로 v, 크기 1)를 지도 좌표로 — 회전은 폭포만 (SVG rotate 와 같이 화면에서 시계 방향)
  const P = (u: number, v: number): Pt =>
    g.kind === 'waterfall' ? [x0 + (u * cos - v * sin) * s, y0 + (u * sin + v * cos) * s] : [x0 + u * s, y0 + v * s]
  const M = (u: number, v: number) => {
    const [x, y] = P(u, v)
    return `M${f(x)} ${f(y)}`
  }
  const L = (u: number, v: number) => {
    const [x, y] = P(u, v)
    return `L${f(x)} ${f(y)}`
  }
  const Q = (cu: number, cv: number, u: number, v: number) => {
    const [cx, cy] = P(cu, cv)
    const [x, y] = P(u, v)
    return `Q${f(cx)} ${f(cy)} ${f(x)} ${f(y)}`
  }
  const C = (au: number, av: number, bu: number, bv: number, u: number, v: number) => {
    const [ax, ay] = P(au, av)
    const [bx, by] = P(bu, bv)
    const [x, y] = P(u, v)
    return `C${f(ax)} ${f(ay)} ${f(bx)} ${f(by)} ${f(x)} ${f(y)}`
  }
  const E = (u: number, v: number, rx: number, ry: number) => {
    const [x, y] = P(u, v)
    return ellipsePath(x, y, rx * s, ry * s)
  }
  /** 0 길이 획 — 둥근 끝으로 점이 된다 */
  const dot = (u: number, v: number) => `${M(u, v)}h0`

  switch (g.kind) {
    case 'volcano': {
      const H = 12.5
      const cw = 2.3
      const cone = `${M(-9.5, 0)}${Q(-4.4, -7.5, -cw, -H)}${L(cw, -H)}${Q(4.6, -6.5, 9.5, 0)}`
      let hatch = ''
      for (const t of [0.22, 0.45, 0.68]) {
        const u = cw + (9.5 - cw) * t
        const v = -H + H * t * 1.05
        hatch += `${M(u - 0.3, v + 0.6)}${L(u - 1.6 - t, v + 3 + t * 2.4)}`
      }
      return [
        { cls: 'lm-fill', d: `${cone}Z` },
        { cls: 'lm-hatch', d: hatch },
        // 분화구에서 흘러내리는 용암 줄기 둘
        { cls: 'lm-fire-ink', d: `${M(-0.8, -H + 0.5)}${Q(-2, -H + 4.5, -1.2, -H + 7.5)}${M(1, -H + 0.6)}${Q(2.4, -H + 3.6, 3.4, -H + 6)}` },
        { cls: 'lm-ink', d: cone },
        { cls: 'lm-dark', d: E(0, -H, cw, 0.75) },
        // 분화구 위로 오르며 오른쪽으로 흐르는 연기 — 작은 화산(고리처럼 모인 봉우리)은 짧은 한 줄기, 더 작으면 없앤다
        ...(s >= 0.8
          ? [
              {
                cls: 'lm-smoke' as const,
                d:
                  `${M(-0.4, -H - 1)}${C(-2, -H - 3, 1.6, -H - 4.2, 0.2, -H - 6.2)}${C(-1, -H - 8, 2.8, -H - 8.8, 2.6, -H - 11)}` +
                  `${E(3.4, -H - 12.4, 1.5, 1.2)}${E(5.4, -H - 13.6, 1.1, 0.9)}`,
              },
            ]
          : s >= 0.6
            ? [{ cls: 'lm-smoke' as const, d: `${M(-0.4, -H - 1)}${C(-2, -H - 3, 1.6, -H - 4.2, 0.6, -H - 6)}` }]
            : []),
      ]
    }
    case 'caldera': {
      // 초화산의 큰 분화구 — 바깥 테두리에서 안쪽 바닥으로 빗금이 떨어진다
      const RX = 15
      const RY = 6.5
      const rx = 10.5
      const ry = 4.2
      let hatch = ''
      const N = 30
      for (let i = 0; i < N; i++) {
        const t = (i / N) * Math.PI * 2 + 0.07
        const ou = Math.cos(t) * RX
        const ov = Math.sin(t) * RY
        const iu = Math.cos(t) * rx
        const iv = Math.sin(t) * ry + 0.7
        const k = i % 2 ? 0.55 : 0.8
        hatch += `${M(ou, ov)}${L(ou + (iu - ou) * k, ov + (iv - ov) * k)}`
      }
      return [
        { cls: 'lm-shade', d: E(0, 0, RX, RY) },
        { cls: 'lm-fill', d: E(0, 0.7, rx, ry) },
        { cls: 'lm-fire-wash', d: E(0, 0.7, rx, ry) },
        { cls: 'lm-hatch', d: hatch },
        { cls: 'lm-ink', d: E(0, 0, RX, RY) },
        // 바닥의 작은 분기공 셋
        { cls: 'lm-dark', d: `${E(-3.5, 1.2, 0.9, 0.4)}${E(2.6, 0, 0.7, 0.3)}${E(4.8, 2, 0.6, 0.3)}` },
      ]
    }
    case 'waterfall': {
      // 물이 떨어지는 방향을 +v 로 그린다 — 두 단으로 떨어져 물보라가 인다
      const fall = (u0: number, v0: number, v1: number) => `${M(u0, v0)}${Q(u0 + 0.25, (v0 + v1) / 2, u0 - 0.1, v1)}`
      let water = ''
      for (const u of [-2.6, -1, 0.6, 2.2]) water += fall(u, 0.4, 4.4)
      for (const u of [-1.9, -0.3, 1.4]) water += fall(u, 5.2, 8.2)
      let spray = ''
      for (const [u, v] of [[-2.8, 9.2], [-1.2, 9.8], [0.4, 9.3], [2, 9.9], [-0.4, 10.8], [1.3, 10.9], [-2, 10.6]] as const) spray += dot(u, v)
      return [
        { cls: 'lm-water', d: `${M(-3.4, 0)}${L(3.2, 0)}${L(2.4, 4.6)}${L(2.2, 8.3)}${L(-2.4, 8.3)}${L(-2.8, 4.6)}Z` },
        { cls: 'lm-water-ink', d: water },
        { cls: 'lm-water-ink', d: spray },
        // 위 단 벼랑 끝과 가운데 바위턱
        { cls: 'lm-ink', d: `${M(-5.2, 0.2)}${L(-3.4, 0)}${L(3.2, 0)}${L(5, 0.3)}${M(-3.6, 4.7)}${L(-2.6, 4.6)}${M(2.4, 4.6)}${L(3.5, 4.8)}` },
        { cls: 'lm-hatch', d: `${M(-4.8, 0.4)}${L(-5.1, 2.6)}${M(-4, 0.4)}${L(-4.2, 2)}${M(4.4, 0.5)}${L(4.6, 2.7)}${M(3.6, 0.4)}${L(3.8, 2.1)}` },
      ]
    }
    case 'geyser': {
      // 뜨거운 웅덩이와 그 위로 오르는 김
      return [
        { cls: 'lm-water', d: E(0, 0, 3.6, 1.4) },
        { cls: 'lm-ink', d: E(0, 0, 3.6, 1.4) },
        {
          cls: 'lm-smoke',
          d:
            `${M(-0.2, -0.8)}${C(-1.6, -3, 1.4, -4.4, 0, -6.6)}${C(-1.4, -8.6, 1.6, -9.6, 0.6, -12)}` +
            `${M(-1.8, -0.6)}${C(-3, -2.4, -1, -3.6, -2.2, -5.4)}${C(-3.2, -6.8, -1.6, -7.6, -2.4, -9)}` +
            `${M(1.6, -0.6)}${C(2.8, -2.2, 1.2, -3.4, 2.4, -5)}${C(3.4, -6.4, 2, -7.2, 2.8, -8.4)}`,
        },
        // 웅덩이 둘레에 쌓인 침전물 — 작은 점
        { cls: 'lm-hatch', d: `${dot(-4.6, 0.4)}${dot(4.5, -0.2)}${dot(-3.2, 1.9)}${dot(3.4, 1.8)}${dot(0.3, 2.2)}` },
      ]
    }
    case 'pit': {
      // 수직 동굴·싱크홀 — 크기 1 에서 폭 4 단위. 어두운 구멍, 그 둘레 테두리, 안쪽 먼 벽(위쪽 반)으로 떨어지는 빗금.
      // 산 기호 한 획 굵기의 작은 기호라 라벨·마커 곁에서도 묻히지 않는다
      const RX = 2
      const RY = 0.95
      let hatch = ''
      for (let i = 0; i <= 6; i++) {
        const t = Math.PI * 1.08 + (i / 6) * Math.PI * 0.84
        hatch += `${M(Math.cos(t) * RX, Math.sin(t) * RY)}${L(Math.cos(t) * RX * 0.62, Math.sin(t) * RY * 0.5 + 0.12)}`
      }
      // 앞쪽 테두리 밖으로 짧은 빗금 둘 — 꺼진 땅의 가장자리
      hatch += `${M(-1.2, RY * 0.85)}${L(-1.35, RY + 0.55)}${M(1.1, RY * 0.88)}${L(1.25, RY + 0.5)}`
      return [
        { cls: 'lm-shade', d: E(0, 0, RX, RY) },
        { cls: 'lm-dark', d: E(0, 0.18, RX * 0.55, RY * 0.48) },
        { cls: 'lm-hatch', d: hatch },
        { cls: 'lm-ink', d: E(0, 0, RX, RY) },
      ]
    }
    case 'spire': {
      const body = `${M(-2.5, 0)}${L(-1.3, -7.5)}${L(-0.6, -13.5)}${L(0.3, -17)}${L(1, -12)}${L(1.6, -6)}${L(2.7, 0)}`
      let hatch = `${M(0.3, -17)}${L(0.5, -9)}${L(0.2, 0)}`
      for (const [v, l] of [[-12, 0.5], [-9, 0.8], [-6, 1.1], [-3, 1.4]] as const) hatch += `${M(0.6, v)}${L(0.6 + l, v + 1.6)}`
      return [
        { cls: 'lm-fill', d: `${body}Z` },
        { cls: 'lm-hatch', d: hatch },
        { cls: 'lm-ink', d: `${body}${M(-3.8, 0.2)}${L(4, 0.2)}` },
        // 밑동의 떨어진 돌
        { cls: 'lm-ink', d: `${E(3.7, -0.5, 0.9, 0.55)}${E(-3.4, -0.4, 0.6, 0.4)}` },
      ]
    }
    case 'floating-rock': {
      // 땅에서 떠 있는 바위 — 평평한 윗면 아래로 울퉁불퉁 좁아지는 밑동, 매달린 뿌리, 아래 땅에 흐린 그림자
      const body =
        `${M(-6.5, -12)}${L(-3, -13.2)}${L(1, -12.5)}${L(5.6, -13.3)}${L(6.8, -11.8)}${L(5.2, -10)}${L(4.4, -8.4)}` +
        `${L(2.8, -7.6)}${L(1.8, -5.2)}${L(0.6, -3.4)}${L(-0.5, -5.8)}${L(-2.1, -6.9)}${L(-3.2, -9)}${L(-5.3, -10.1)}Z`
      // 윗면 앞 가장자리와 그늘진 오른쪽 밑동의 빗금
      let hatch = `${M(-6.5, -12)}${Q(0, -10.7, 6.8, -11.8)}`
      for (const [u, v, l] of [[1.4, -10.6, 3.4], [2.8, -10.7, 2.6], [4.2, -10.9, 1.8]] as const) hatch += `${M(u, v)}${L(u - 0.8, v + l)}`
      return [
        { cls: 'lm-shadow', d: E(0.6, 1.2, 5, 1.5) },
        { cls: 'lm-fill', d: body },
        { cls: 'lm-hatch', d: hatch },
        { cls: 'lm-ink', d: body },
        // 매달린 뿌리와 윗면의 풀포기
        {
          cls: 'lm-hatch',
          d:
            `${M(-2.1, -6.9)}${Q(-2.6, -5.8, -2.2, -4.8)}${M(2.8, -7.6)}${Q(3.3, -6.6, 3, -5.8)}` +
            `${M(-3.4, -12.8)}${L(-3.8, -14.2)}${M(-3.4, -12.8)}${L(-3, -14.4)}${M(2.4, -12.7)}${L(2.2, -14)}${M(2.4, -12.7)}${L(2.9, -13.9)}`,
        },
      ]
    }
    case 'crashed-skyclave': {
      // 땅에 떨어진 하늘거주지 — 왼쪽 끝이 땅에 박혀 기운 선체, 그 위의 깨진 둥근 지붕(위 오른쪽이 무너져 안이 검게 보인다),
      // 둘레에 튄 조각과 패인 땅의 빗금, 밑의 흐린 그림자. 크기 1 에서 폭 31·높이 15 단위 — 그림은 SKYCLAVE_WRECK_CLEAR 의 원 안에 든다
      // 띠(선체 테두리)와 갑판 선의 기울기 — 왼쪽이 낮다
      const deck = (u: number) => -3.2 - (u + 9.5) * 0.1576
      const band = (u: number) => -1.6 - (u + 10.5) * 0.1267
      const hull = `${M(-12.5, 0.6)}${L(-9.5, -3.2)}${L(10.8, -6.4)}${L(12.6, -4.6)}${L(11.6, 0.9)}${Q(0, 1.6, -12.5, 0.6)}Z`
      // 테두리 띠 아래(선체 옆구리)의 그늘
      const side = `${M(-10.5, band(-10.5))}${L(11.6, band(11.6))}${L(11.6, 0.9)}${Q(0, 1.6, -12.5, 0.6)}Z`
      const dome =
        `${M(-5, deck(-5))}${C(-5.2, -9, -1, -11.6, 2, -11.4)}${L(3, -10)}${L(4.2, -11)}${L(5, -9.2)}${L(6.2, -9.4)}${Q(7.2, -7.5, 7, deck(7))}Z`
      // 무너진 지붕 구멍 — 깨진 끝 안쪽
      const hole = `${M(2, -11.4)}${L(3, -10)}${L(4.2, -11)}${L(5, -9.2)}${L(4, -8.4)}${L(2.8, -9)}Z`
      let hatch = ''
      // 옆구리 빗금 — 오른쪽(그늘 쪽)으로 갈수록 촘촘하게
      for (const u of [-1, 2, 4.5, 6.5, 8.5, 10.3]) hatch += `${M(u, band(u) + 0.5)}${L(u - 0.6, 0.7)}`
      // 둥근 지붕의 갈빗대와 오른쪽 그늘
      hatch += `${M(-2, deck(-2) - 0.3)}${Q(-2.2, -9, 0.6, -11.2)}${M(1.4, deck(1.4) - 0.3)}${Q(1.6, -7.6, 2.4, -9.2)}`
      hatch += `${M(5.6, -8.6)}${L(6.1, -6.6)}${M(4.7, -8.2)}${L(5.1, -6)}`
      // 선체의 금 — 떨어지며 갈라진 자리
      hatch += `${M(-3, -2.4)}${L(-2.2, -0.9)}${L(-2.8, 0.5)}${M(6, -4.4)}${L(6.8, -2.7)}`
      // 패인 땅 — 선체 두 끝 둘레로 바깥을 향한 짧은 빗금
      hatch += `${M(-12.8, 1.6)}${L(-14.2, 2.4)}${M(-10.5, 1.9)}${L(-11.4, 3)}${M(11, 1.9)}${L(12.2, 2.9)}${M(9, 2.1)}${L(9.6, 3.2)}`
      // 둘레에 튄 조각
      const debris =
        `${M(-15.6, 1.4)}${L(-15, 0)}${L(-13.6, 0.2)}${L(-13.4, 1.4)}Z` + `${M(13.2, 1.6)}${L(13.6, 0.4)}${L(14.8, 0.6)}${L(15, 1.6)}Z` + E(8.5, 2.5, 0.9, 0.5)
      return [
        { cls: 'lm-shadow', d: E(0, 1.2, 14, 2.2) },
        { cls: 'lm-fill', d: hull },
        { cls: 'lm-shade', d: side },
        { cls: 'lm-fill', d: dome },
        { cls: 'lm-dark', d: hole },
        { cls: 'lm-hatch', d: hatch },
        { cls: 'lm-fill', d: debris },
        { cls: 'lm-ink', d: `${hull}${M(-10.5, band(-10.5))}${L(11.6, band(11.6))}${dome}${debris}` },
      ]
    }
    case 'compleated-ground':
    case 'compleated-ground-oil': {
      // 피렉시아의 흰 금속으로 바뀐 땅 (2023) — 'the land transforms into cracked white metal, broken by thick red sinew-like veins'
      // (Battles in the Field and in the Mind). 가장자리가 고르지 않은 흰 땅(양피지 칠 — 숲 위에서 희게 읽힌다)에 모난 금(갈라진 금속판의 이음매),
      // 가운데 가까이에서 바깥으로 뻗는 붉은 힘줄 같은 줄기. -oil 은 그 위로 기름의 강 둘과 고인 기름 ('Sinew and metal … warped and rent with
      // rivers of oil' — Beyond Repair)와 고인 기름. 모양은 기준점으로 시드해 크기와 상관없이 같다. 크기 1 에서 반지름 14.2 안 — GLYPH_CLEAR 의 원 안에 든다
      const rand = mulberry32(hashSeed(`compleated-ground:${f(x0)},${f(y0)}`))
      const N = 22
      const R = 14.5
      // 가장자리 — 두 겹의 굴곡(크게 드나드는 혀와 잔 굴곡)으로 메달처럼 둥글게 읽히지 않게
      const ph0 = rand() * Math.PI * 2
      const rad = Array.from({ length: N }, (_, i) => R * Math.min(0.98, 0.8 + 0.12 * Math.sin(ph0 + (i / N) * Math.PI * 6) + (rand() - 0.5) * 0.16))
      const SQ = 0.82
      const radAt = (a: number) => {
        const t = ((((a / (Math.PI * 2)) % 1) + 1) % 1) * N
        const i = Math.floor(t)
        const k = t - i
        return rad[i % N] * (1 - k) + rad[(i + 1) % N] * k
      }
      const polar = (a: number, frac: number): Pt => [Math.cos(a) * radAt(a) * frac, Math.sin(a) * radAt(a) * frac * SQ]
      const rim = rad.map((r, i): Pt => [Math.cos((i / N) * Math.PI * 2) * r, Math.sin((i / N) * Math.PI * 2) * r * SQ])
      const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
      let edge = M(...mid(rim[N - 1], rim[0]))
      for (let i = 0; i < N; i++) edge += Q(rim[i][0], rim[i][1], ...mid(rim[i], rim[(i + 1) % N]))
      edge += 'Z'
      const shape = (pts: readonly Pt[]) => pts.map(([u, v], i) => (i ? L(u, v) : M(u, v))).join('') + 'Z'
      const line = (pts: readonly Pt[]) => pts.map(([u, v], i) => (i ? L(u, v) : M(u, v))).join('')
      // 갈라진 금속판의 이음매 — 모난 금 아홉 줄 (세 마디, 가끔 곁금)
      let cracks = ''
      for (let k = 0; k < 9; k++) {
        const a0 = rand() * Math.PI * 2
        let p = polar(a0, 0.12 + rand() * 0.6)
        let dir = rand() * Math.PI * 2
        const pts: Pt[] = [p]
        for (let j = 0; j < 3; j++) {
          dir += (rand() - 0.5) * 1.3
          const len = 2.2 + rand() * 1.8
          const q: Pt = [p[0] + Math.cos(dir) * len, p[1] + Math.sin(dir) * len * SQ]
          if (Math.hypot(q[0], q[1] / SQ) > radAt(Math.atan2(q[1] / SQ, q[0])) * 0.86) break
          pts.push(q)
          p = q
        }
        if (pts.length > 1) cracks += line(pts)
        if (pts.length > 2 && rand() < 0.5) {
          const [bu, bv] = pts[1]
          const ba = dir + (rand() < 0.5 ? 1.2 : -1.2)
          cracks += `${M(bu, bv)}${L(bu + Math.cos(ba) * 1.4, bv + Math.sin(ba) * 1.4 * SQ)}`
        }
      }
      // 붉은 힘줄 같은 줄기 — 가운데 가까이에서 바깥 가장자리 조금 안까지, 물결치며 가늘어진다. 둘째 줄기에서 곁줄기 하나
      let veins = ''
      const a00 = rand() * Math.PI * 2
      for (let k = 0; k < 4; k++) {
        const a = a00 + (k / 4) * Math.PI * 2 + (rand() - 0.5) * 0.9
        const start = 0.08 + rand() * 0.2
        const end = 0.78 + rand() * 0.12
        const amp = 0.5 + rand() * 0.6
        const ph = rand() * Math.PI * 2
        const pts: Pt[] = []
        const ws: number[] = []
        for (let j = 0; j <= 10; j++) {
          const t = j / 10
          const [u, v] = polar(a, start + (end - start) * t)
          const wob = Math.sin(ph + t * Math.PI * 2.4) * amp
          pts.push([u - Math.sin(a) * wob, v + Math.cos(a) * wob * SQ])
          ws.push(1.25 * (1 - t) + 0.25)
        }
        veins += shape(ribbon(pts, ws))
        if (k === 1) {
          const [bu, bv] = pts[5]
          const ba = a + 0.9
          const tip: Pt = [bu + Math.cos(ba) * 3.6, bv + Math.sin(ba) * 3.6 * SQ]
          veins += shape(ribbon([[bu, bv], mid([bu, bv], tip), tip], [0.7, 0.45, 0.15]))
        }
      }
      const parts: GlyphPart[] = [
        { cls: 'lm-fill', d: edge },
        { cls: 'lm-hatch', d: cracks + edge },
        { cls: 'lm-blood', d: veins },
      ]
      if (g.kind === 'compleated-ground-oil') {
        // 기름의 강 둘 — 땅을 가로질러 굽이치고 양 끝이 가늘다. 고인 기름 하나
        let oil = ''
        for (let k = 0; k < 2; k++) {
          // 가운데를 비켜 가는 현 — 두 강이 한 점에서 엇갈리지 않게 서로 다른 쪽으로
          const a = a00 + Math.PI / 4 + k * Math.PI + (rand() - 0.5) * 0.4
          const from = polar(a, 0.86)
          const to = polar(a + Math.PI * 0.62 + (rand() - 0.5) * 0.3, 0.84)
          const amp = 0.9 + rand() * 0.8
          const pts: Pt[] = []
          const ws: number[] = []
          for (let j = 0; j <= 14; j++) {
            const t = j / 14
            const bx = from[0] + (to[0] - from[0]) * t
            const by = from[1] + (to[1] - from[1]) * t
            const len = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1
            const wob = Math.sin(t * Math.PI * 2 + k) * amp * Math.sin(t * Math.PI)
            pts.push([bx - ((to[1] - from[1]) / len) * wob, by + ((to[0] - from[0]) / len) * wob])
            ws.push(0.2 + 0.85 * Math.sin(t * Math.PI))
          }
          oil += shape(ribbon(pts, ws))
        }
        // 고인 기름 하나 — 첫 강의 끝 가까이
        {
          const [u, v] = polar(a00 + Math.PI / 4 + 0.35, 0.66)
          oil += E(u, v, 1.1, 0.6)
        }
        parts.push({ cls: 'lm-dark', d: oil })
      }
      return parts
    }
    case 'compleated-skyclave': {
      // 흰 금속으로 다시 지어진 하늘거주지 (2023, 아직 떠 있다) — 'the Skyclave's broken stone mend and transform into white metal … oil now seeping from
      // the cracks of the reforged stones' (Battles in the Field and in the Mind). 기준점은 그 밑의 땅(흐린 그림자)이고 하늘거주지는 그 위에 뜬다:
      // 평평한 윗면 밑으로 거꾸로 선 모난 바위 뿌리(떠 있는 도시의 밑동), 윗면의 둥근 지붕과 양쪽의 뾰족한 탑 둘, 밑동의 이음매 금과 그늘,
      // 밑동 끝과 금에서 떨어지는 기름 방울, 둘레의 헤드론 다섯('a floating city. Hedrons surround it like the feathers of a withdrawn bird. Stark white
      // against the sky' — Episode 1: Triumph of the Fleshless). 크기 1 에서 폭 32·높이 22 (헤드론까지)
      const shape = (pts: readonly Pt[]) => pts.map(([u, v], i) => (i ? L(u, v) : M(u, v))).join('') + 'Z'
      const TOP = -14
      const root: Pt[] = [[-12, TOP], [-10.4, -11.8], [-7.6, -10.9], [-5.2, -8.4], [-2.4, -7.6], [-0.4, -5.2], [1.8, -7.3], [4.6, -8.2], [7.4, -10.6], [10.4, -11.6], [12, TOP]]
      const body = shape(root)
      // 그늘 — 밑동의 오른쪽 반
      const shade = shape([[0.4, -12.6], [11.2, -12.6], [10.4, -11.6], [7.4, -10.6], [4.6, -8.2], [1.8, -7.3], [-0.4, -5.2]])
      const deck = `${M(-12, TOP)}${L(12, TOP)}`
      const dome = `${M(-4.6, TOP)}${C(-4.8, -19.6, 4.8, -19.6, 4.6, TOP)}Z`
      const tower = (u: number, h: number) => shape([[u - 1, TOP], [u - 1, TOP - h], [u, TOP - h - 2.2], [u + 1, TOP - h], [u + 1, TOP]])
      const towers = tower(-8.2, 3.2) + tower(8.4, 2.6)
      let hatch = `${M(-2, TOP - 0.1)}${Q(-2.4, -17, -0.4, -18.2)}${M(2, TOP - 0.1)}${Q(2.4, -17, 0.4, -18.2)}`
      // 메운 금 — 밑동 바위의 결
      hatch += `${M(-8.6, -13)}${L(-7.8, -11.6)}${M(-4.4, -12.8)}${L(-3.6, -10.8)}${L(-4, -9.6)}${M(2.8, -12.9)}${L(3.4, -10.4)}${M(6.6, -12.9)}${L(7, -11.4)}`
      hatch += `${M(-9.2, TOP - 0.4)}${L(-9.2, -16.6)}${M(7.4, TOP - 0.4)}${L(7.4, -16)}`
      // 기름 — 밑동 끝과 금에서 떨어지는 방울
      const drip = (u: number, top: number, len: number) => {
        const b = top + len
        return `${M(u - 0.35, top)}${L(u + 0.35, top)}${L(u + 0.18, b - 1.1)}${Q(u + 0.75, b - 0.2, u, b)}${Q(u - 0.75, b - 0.2, u - 0.18, b - 1.1)}Z`
      }
      const oil = drip(-0.4, -5.6, 3.4) + drip(-5.4, -8.6, 2.6) + drip(5, -8.4, 2.2) + E(-0.6, -0.9, 0.4, 0.5)
      const hedron = (u: number, v: number, h: number) => `${M(u, v - h)}${L(u + h * 0.42, v)}${L(u, v + h)}${L(u - h * 0.42, v)}Z`
      const hedrons = hedron(-15, -15.6, 1.6) + hedron(-14, -9.8, 1.3) + hedron(14.8, -16, 1.6) + hedron(14.2, -10.2, 1.3) + hedron(-10.4, -20.2, 1.1)
      return [
        { cls: 'lm-shadow', d: E(0, 0, 8.5, 1.6) },
        { cls: 'lm-fill', d: hedrons },
        { cls: 'lm-fill', d: body + towers },
        { cls: 'lm-shade', d: shade },
        { cls: 'lm-fill', d: dome },
        { cls: 'lm-hatch', d: hatch },
        { cls: 'lm-dark', d: oil },
        { cls: 'lm-ink', d: `${body}${towers}${dome}${deck}${hedrons}` },
      ]
    }
    case 'realmbreaker-sky':
    case 'realmbreaker-sea': {
      // Invasion Tree(Realmbreaker)의 가지 (2023) — 'White, cracked, metallic, and massive, the branches burst from the portals opening in the sky, and in the
      // sea' (Battles in the Field and in the Mind). 흰 금속의 굵은 가지에 모난 금, 곁가지 하나, 붉게 열린 차원문과 그 안의 검은 틈.
      // sky: 기준점은 가지가 땅에 꽂힌 자리 — 그 위 약 27 단위 하늘의 차원문에서 내리꽂혀 밑동이 세 갈래로 땅을 판다.
      // sea: 기준점은 물 위의 차원문 — 거기서 솟아 굽어 오르는 가지, 둘레 물결. 비우는 원(GLYPH_CLEAR)은 밑동 둘레만
      const sky = g.kind === 'realmbreaker-sky'
      const shape = (pts: readonly Pt[]) => pts.map(([u, v], i) => (i ? L(u, v) : M(u, v))).join('') + 'Z'
      const along = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, w: (t: number) => number, n = 16) => {
        const pts: Pt[] = []
        const ws: number[] = []
        for (let i = 0; i <= n; i++) {
          pts.push(cubicAt(p0, p1, p2, p3, i / n))
          ws.push(w(i / n))
        }
        return { pts, d: shape(ribbon(pts, ws)) }
      }
      const portal: Pt = sky ? [-3.5, -27] : [0, 0]
      const trunk = sky
        ? along([-3.2, -26.3], [-5.4, -17], [0.6, -10], [0, -1.6], (t) => 4.2 * (1 - t) + 2 * t)
        : along([0, -0.2], [2.8, -9], [0.6, -19], [-5.8, -21.8], (t) => 4.2 * (1 - t) ** 0.85 + 0.4)
      const twigAt = trunk.pts[sky ? 7 : 8]
      const twig = sky
        ? shape(ribbon([twigAt, [twigAt[0] + 2.8, twigAt[1] - 1.2], [twigAt[0] + 5.4, twigAt[1] - 3.8]], [1.6, 0.9, 0.2]))
        : shape(ribbon([twigAt, [twigAt[0] + 2.8, twigAt[1] - 1.6], [twigAt[0] + 5.6, twigAt[1] - 2.4]], [1.6, 0.9, 0.2]))
      // 밑동의 세 갈래 (sky) — 땅을 판다
      const tines = sky
        ? shape(ribbon([[-0.4, -2.4], [-2, -0.6], [-3.8, 0.8]], [1.6, 1, 0.25])) +
          shape(ribbon([[0, -2.4], [0.2, -0.3], [0.5, 1.5]], [1.6, 1, 0.25])) +
          shape(ribbon([[0.4, -2.4], [2, -0.8], [3.6, 0.4]], [1.6, 1, 0.25]))
        : ''
      // 모난 금 — 가지 가운데 선 둘레에 짧은 지그재그
      let hatch = ''
      for (const i of sky ? [3, 6, 10, 13] : [2, 5, 9, 12]) {
        const [u, v] = trunk.pts[i]
        hatch += `${M(u - 1, v - 0.3)}${L(u - 0.2, v + 0.5)}${L(u + 0.7, v + 0.1)}`
      }
      if (sky) hatch += `${M(-3.6, 1.6)}${L(-5, 2.3)}${M(3.4, 1.1)}${L(4.7, 1.8)}${M(0.7, 2)}${L(0.9, 3)}`
      const glow = E(portal[0], portal[1], 6.2, sky ? 2.4 : 1.7)
      const rift = E(portal[0], portal[1], 4, sky ? 1 : 0.8)
      const parts: GlyphPart[] = []
      if (!sky) parts.push({ cls: 'lm-waterline', d: `${M(-9.6, 1)}${L(-6.6, 1)}${M(6.4, 1.2)}${L(9.6, 1.2)}${M(-6.8, 2.6)}${L(-4.2, 2.6)}${M(4, 2.7)}${L(6.4, 2.7)}` })
      parts.push({ cls: 'lm-blood', d: glow }, { cls: 'lm-dark', d: rift })
      parts.push({ cls: 'lm-fill', d: trunk.d + twig + tines }, { cls: 'lm-hatch', d: hatch }, { cls: 'lm-ink', d: trunk.d + twig + tines + glow })
      return parts
    }
    case 'urn': {
      // 떠 있는 돌 항아리 — 오른쪽으로 기울어 아가리에서 얼음·눈사태가 쏟아져 내린다. 아래 땅에 흐린 그림자.
      // 항아리는 제 좌표(가운데 0,0, 똑바로 섰을 때 아가리가 위)로 그린 뒤 TILT 만큼 기울여 (0, -12) 에 띄운다
      const TILT = (35 * Math.PI) / 180
      const tc = Math.cos(TILT)
      const ts = Math.sin(TILT)
      const R = (u: number, v: number): Pt => [u * tc - v * ts, -12 + u * ts + v * tc]
      const Mu = (u: number, v: number) => M(...R(u, v))
      const Lu = (u: number, v: number) => L(...R(u, v))
      const Cu = (au: number, av: number, bu: number, bv: number, u: number, v: number) => C(...R(au, av), ...R(bu, bv), ...R(u, v))
      const Qu = (cu: number, cv: number, u: number, v: number) => Q(...R(cu, cv), ...R(u, v))
      const body =
        `${Mu(-2.5, -5.4)}${Lu(2.5, -5.4)}${Lu(2.1, -4.5)}${Lu(1.6, -4.1)}${Cu(4.7, -3.1, 5.1, 2.3, 2, 4.4)}` +
        `${Lu(2.3, 5.3)}${Lu(-2.3, 5.3)}${Lu(-2, 4.4)}${Cu(-5.1, 2.3, -4.7, -3.1, -1.6, -4.1)}${Lu(-2.1, -4.5)}Z`
      // 그늘진 오른쪽 몸통의 빗금, 몸통을 두른 띠, 아가리 테
      let hatch = `${Mu(-4, -1.2)}${Qu(0, 0.2, 4, -1.2)}${Mu(-2.1, -4.5)}${Lu(2.1, -4.5)}`
      for (const [u, l] of [[1, 3], [2.2, 2.8], [3.3, 2.2]] as const) hatch += `${Mu(u, 0.2)}${Lu(u - 0.2, 0.2 + l)}`
      // 쏟아지는 눈사태 — 아가리 두 끝(lipL·lipR)에서 넘쳐 몸통 오른쪽으로 퍼지며 떨어지고, 끝은 눈보라로 흩어진다
      const [lx, ly] = R(-2.3, -5.6)
      const [rx, ry] = R(2.3, -5.6)
      const outer = `${M(lx, ly)}${C(lx + 3.2, ly - 2.8, 9.4, -18.6, 10.4, -13.4)}${Q(11.2, -9, 12.4, -4.6)}`
      const inner = `${M(rx, ry)}${Q(7.6, -13.4, 8.1, -9.6)}${L(7.7, -4.8)}`
      const spill =
        `${outer}${L(11.4, -3.6)}${L(10.5, -4.6)}${L(9.5, -3.4)}${L(8.6, -4.4)}${L(7.7, -4.8)}` +
        `${L(8.1, -9.6)}${Q(7.6, -13.4, rx, ry)}Z`
      let flow = ''
      for (const [u, v, du, dv] of [[6.2, -17.2, 2.4, 2.4], [8.8, -15.4, 0.9, 4.2], [9.6, -11.8, 0.6, 4.6], [8.9, -9.4, 0.3, 3.8], [10.8, -10.6, 0.8, 4.2]] as const) {
        flow += `${M(u, v)}${L(u + du, v + dv)}`
      }
      let powder = ''
      for (const [u, v] of [[8.3, -2.4], [9.8, -1.5], [11.2, -2.2], [12.7, -3], [10.4, -0.2], [12, -0.8], [8.9, -0.4]] as const) powder += dot(u, v)
      return [
        { cls: 'lm-shadow', d: E(1.8, 1.2, 5.5, 1.5) },
        { cls: 'lm-snow', d: spill },
        { cls: 'lm-hatch', d: flow + powder },
        { cls: 'lm-hatch', d: inner },
        { cls: 'lm-ink', d: outer },
        { cls: 'lm-fill', d: body },
        { cls: 'lm-hatch', d: hatch },
        { cls: 'lm-ink', d: body },
      ]
    }
  }
}

// --- 바다 표시 (SeaMark) — 물 위에 흩뿌리는 작은 기호 ---

/** 기호 사이 간격 (지도 단위) */
export const SEA_SPACING: Record<SeaMark['kind'], number> = { 'sea-ice': 10, whirl: 26, reef: 8, rough: 13 }

/** 떠다니는 얼음 조각 — 모난 다각형 */
export function floeGlyph(x: number, y: number, rand: () => number): string {
  const n = 5 + Math.floor(rand() * 3)
  const r = 1.8 + rand() * 2.6
  const a0 = rand() * Math.PI * 2
  let d = ''
  for (let i = 0; i < n; i++) {
    const t = a0 + (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.5
    const rr = r * (0.7 + rand() * 0.45)
    d += `${i ? 'L' : 'M'}${f(x + Math.cos(t) * rr)} ${f(y + Math.sin(t) * rr * 0.75)}`
  }
  return `${d}Z`
}

/** 소용돌이 해류 — 한 바퀴 반 도는 나선과 바깥으로 빠지는 꼬리 */
export function whirlGlyph(x: number, y: number, rand: () => number): string {
  const R = 5 + rand() * 3
  const dir = rand() < 0.5 ? 1 : -1
  const turns = 1.6
  const steps = 26
  const a0 = rand() * Math.PI * 2
  let d = ''
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const a = a0 + dir * t * turns * Math.PI * 2
    const r = R * (0.12 + 0.88 * t)
    d += `${i ? 'L' : 'M'}${f(x + Math.cos(a) * r)} ${f(y + Math.sin(a) * r * 0.7)}`
  }
  // 꼬리 — 나선 끝의 접선 방향
  const a = a0 + dir * turns * Math.PI * 2
  const tx = -Math.sin(a) * dir
  const ty = Math.cos(a) * dir
  d += `l${f(tx * R * 0.7)} ${f(ty * R * 0.7 * 0.7)}`
  return d
}

/** 암초·물속 수정 초 — 작은 십자와 점 무리 (path 둘: 십자, 점) */
export function reefGlyph(x: number, y: number, rand: () => number): [string, string] {
  let cross = ''
  let dots = ''
  const n = 2 + Math.floor(rand() * 3)
  for (let i = 0; i < n; i++) {
    const px = x + (rand() - 0.5) * 5
    const py = y + (rand() - 0.5) * 3.6
    if (rand() < 0.45) cross += `M${f(px - 1)} ${f(py)}h2M${f(px)} ${f(py - 1)}v2`
    else dots += `M${f(px)} ${f(py)}h0`
  }
  return [cross, dots]
}

/** 거친 물결 — 뾰족한 물결 두세 개를 엇갈린 두 줄로 */
export function roughGlyph(x: number, y: number, rand: () => number): string {
  const w = 1.4 + rand() * 0.5
  const h = 1.3 + rand() * 0.5
  const wave = (sx: number, sy: number, n: number) => {
    let d = `M${f(sx)} ${f(sy)}`
    for (let i = 0; i < n; i++) d += `l${f(w / 2)} ${f(-h)}l${f(w / 2)} ${f(h)}`
    return d
  }
  return wave(x - w * 1.5, y, 3) + (rand() < 0.6 ? wave(x - w * 0.4, y + 2.4, 2) : '')
}

// --- 범례 ---

/** 범례 '지형' 목록에 오르는 특별한 기호 — 산·숲·늪처럼 늘 보던 기호는 싣지 않는다 */
export type TerrainLegendKey = 'river' | 'volcano' | 'waterfall' | 'geyser' | 'lava' | 'crystal' | 'mesa' | 'urn'

/** 지도에 실제로 그린 것만 범례에 싣는다 */
export function terrainLegendKeys(l: Required<Landscape>): TerrainLegendKey[] {
  const area = (k: TerrainAreaKind) => l.areas.some((a) => a.kind === k)
  const glyph = (k: LandmarkGlyph['kind']) => l.glyphs.some((g) => g.kind === k)
  const keys: [TerrainLegendKey, boolean][] = [
    ['river', l.rivers.length > 0],
    ['volcano', glyph('volcano') || glyph('caldera')],
    ['waterfall', glyph('waterfall')],
    ['geyser', glyph('geyser')],
    ['lava', area('lava')],
    ['crystal', area('crystal')],
    ['mesa', area('mesa')],
    ['urn', glyph('urn')],
  ]
  return keys.filter(([, on]) => on).map(([k]) => k)
}

/** 범례 그림 하나 — viewBox 와 path 들 (cls 는 lm-* 또는 지도 기호 클래스) */
export interface LegendArt {
  viewBox: string
  parts: { cls: string; d: string }[]
}

/** 범례 '지형' 줄의 그림 — 지도와 같은 모양을 작은 상자에 */
export function terrainLegendArt(key: TerrainLegendKey): LegendArt {
  const rand = mulberry32(hashSeed(`legend:${key}`))
  switch (key) {
    case 'river': {
      // 왼쪽 아래 가는 물줄기가 오른쪽 위로 가며 굵어진다 — 물칠과 양쪽 기슭
      const pts: Point[] = []
      for (let i = 0; i <= 16; i++) {
        const t = i / 16
        pts.push([-9 + 18 * t, 5 - 10 * t + Math.sin(t * Math.PI * 2) * 2.2])
      }
      const normals = rightNormals(pts)
      const w = (i: number) => 0.5 + 2.8 * (i / 16) ** 0.8
      const left = pts.map(([x, y], i) => [x - (normals[i][0] * w(i)) / 2, y - (normals[i][1] * w(i)) / 2] as const)
      const right = pts.map(([x, y], i) => [x + (normals[i][0] * w(i)) / 2, y + (normals[i][1] * w(i)) / 2] as const)
      return {
        viewBox: '-10 -8 20 16',
        parts: [
          { cls: 'river-water', d: `${polylineToPath([...left, ...[...right].reverse()])}Z` },
          { cls: 'river-bank', d: polylineToPath(left) + polylineToPath(right) },
        ],
      }
    }
    case 'volcano':
      return { viewBox: '-11 -23 22 24', parts: landmarkParts({ kind: 'volcano', at: [0, 0] }) }
    case 'waterfall':
      return { viewBox: '-7 -1.5 14 13.5', parts: landmarkParts({ kind: 'waterfall', at: [0, 0] }) }
    case 'geyser':
      return { viewBox: '-7 -13 14 16', parts: landmarkParts({ kind: 'geyser', at: [0, 0] }) }
    case 'lava': {
      let d = ''
      for (const [x, y] of [[-5, -3.5], [3, -4], [-2, 1], [5.5, 2.5], [-6, 5], [1.5, 6]] as const) d += lavaGlyph(x, y, 0.5 + rand() * 0.6, rand)
      return { viewBox: '-10 -9 20 18', parts: [{ cls: 'lava-wash', d: 'M-10 -9H10V9H-10Z' }, { cls: 'lava', d }] }
    }
    case 'crystal': {
      const g = crystalGlyph(0, 6, rand)
      return { viewBox: '-8 -7.5 16 14', parts: [{ cls: 'crystal-fill', d: g.fill }, { cls: 'crystal-hatch', d: g.hatch }, { cls: 'crystal-ink', d: g.ridge }] }
    }
    case 'urn':
      return { viewBox: '-7 -21 22 23', parts: landmarkParts({ kind: 'urn', at: [0, 0] }) }
    case 'mesa': {
      const g = mesaGlyph(0, 4, rand)
      return { viewBox: '-13 -6.5 26 11.5', parts: [{ cls: 'mtn-fill', d: g.fill }, { cls: 'mtn-hatch', d: g.hatch }, { cls: 'mtn-ink', d: g.ridge }] }
    }
  }
}

/** 범례 '지형' 줄의 이름 */
export const TERRAIN_LEGEND_LABEL: Record<TerrainLegendKey, string> = {
  river: '강',
  volcano: '화산',
  waterfall: '폭포',
  geyser: '간헐천·온천',
  lava: '용암 들판',
  crystal: '수정 첨탑',
  mesa: '대지(메사)',
  urn: '떠 있는 돌 항아리',
}
