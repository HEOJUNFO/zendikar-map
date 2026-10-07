// 바탕 지형의 새 기호 — 대지(메사)·수정 첨탑·용암 들판·툰드라·맹그로브, 한 점 기호(화산·폭포 등), 바다 표시.
// 좌표만 만드는 순수 함수라 지도(terrain.ts·landscape.ts)와 범례가 같은 모양을 쓴다. 좌표는 지도 단위 (y 는 아래로 자란다)
import type { Landscape, LandmarkGlyph, SeaMark, TerrainAreaKind } from '../data/types'
import { hashSeed, mulberry32, polylineToPath, rightNormals, type Point } from './geometry'

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
