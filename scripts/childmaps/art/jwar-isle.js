// 좌르 섬(Jwar Isle) — 온두 본토 남쪽 해안 가까이의 작은 섬. 자식 지도 1360×940 (세계 [160,1425]–[228,1472] × 20).
// Zendikar Rising(2020) 이후의 모습: 다시 떠올라 열린 온두 하늘거주지 조각(Things Have Changed; Hunger),
// 그 남서쪽의 돌 절벽과 밧줄 걸린 바위 발판(Hunger), 섬 곳곳과 둘레의 파둔(PG: Ondu; Art of Magic; Hunger),
// 섬 중앙 바닷물 구덩이와 희미한 Strand(PG: Ondu; Hunger), 섬을 에워싼 소용돌이 해류와 바다뱀(PG: Ondu; Art of Magic),
// 상륙 해변의 모래와 풀(Hunger). 각 지형지물의 자리·모양·크기는 공식 서술에 기댄 이 지도의 해석이다.
// 산·숲·언덕 기호는 없다 — 공식 서술에 없는 지형이다 (세계 지도의 산 기호는 주인 대륙이 없는 땅의 기본값).
// 세계 지도의 바탕 지형(src/data/landscape/ondu.ts)과 맞춘다: 돌 절벽(jwar-cliffs)은 세계 지도의 절벽선을 따라,
// Strand 구덩이(jwar-strand-pit)는 세계 지도의 구덩이 자리에, 섬 둘레 네 방위의 큰 소용돌이(jwar-currents-*)는
// 세계 지도 소용돌이 기호와 같은 중심·크기·감는 방향으로 그린다. 절벽이 어느 해안에 있는지는 여전히 이 지도(와 세계 지도)의 추정이다.

const K = KIT
const r1 = (v) => Math.round(v * 10) / 10
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`
const P = (cls, d) => ({ cls, d })
const W = 1360
const H = 940

// ── 세계 지도 해안 (context.mjs, 자식 지도 좌표) ───────────────────────────────────────────────
const COAST = [
  [1028.9, 482.8], [1017.6, 465.4], [1000.9, 458.3], [973, 458.6], [943.1, 474.4], [917.4, 457.5], [909.7, 434.3],
  [934.6, 368.1], [934, 323.5], [890.2, 267.9], [865.3, 255.3], [845.6, 253], [798, 265.2], [703.8, 326.6], [654.5, 348.4],
  [622.9, 352.6], [562, 347.5], [531.2, 354.7], [501.1, 370.6], [434.4, 428.4], [395.3, 452.3], [359.3, 457], [324.1, 443.5],
  [313, 444.6], [298.5, 466.9], [296.8, 493.9], [306.5, 516.5], [330, 533.2], [380.5, 537.3], [508.5, 532.9], [529.5, 536.7],
  [631.1, 574.4], [681.7, 603.4], [731.1, 662], [752.7, 673.3], [778.6, 677.4], [823.3, 669.4], [850, 654.9], [884, 620.8],
  [922.3, 567.3], [940.8, 552.9], [958.1, 547.3], [987.5, 551.8], [1005.2, 543.6], [1022.8, 517.3], [1029.8, 488],
]

function onLand(x, y) {
  let c = false
  for (let i = 0, j = COAST.length - 1; i < COAST.length; j = i++) {
    const [xi, yi] = COAST[i]
    const [xj, yj] = COAST[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}

function coastDist(x, y) {
  let m = Infinity
  for (let i = 0; i < COAST.length; i++) {
    const [ax, ay] = COAST[i]
    const [bx, by] = COAST[(i + 1) % COAST.length]
    const dx = bx - ax
    const dy = by - ay
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)))
    const ex = ax + t * dx - x
    const ey = ay + t * dy - y
    m = Math.min(m, ex * ex + ey * ey)
  }
  return Math.sqrt(m)
}

// ── 해안에서 같은 거리의 선 (바다 쪽 +, 땅 쪽 −) — 세계 지도의 해안 물결선과 같은 방식 ─────────────────
const CELL = 5
const GX0 = -40
const GY0 = -40
const NX = Math.ceil((W + 80) / CELL) + 1
const NY = Math.ceil((H + 80) / CELL) + 1
const FIELD = new Float32Array(NX * NY)
const CX0 = Math.min(...COAST.map((p) => p[0])) - 170
const CX1 = Math.max(...COAST.map((p) => p[0])) + 170
const CY0 = Math.min(...COAST.map((p) => p[1])) - 170
const CY1 = Math.max(...COAST.map((p) => p[1])) + 170
for (let j = 0; j < NY; j++)
  for (let i = 0; i < NX; i++) {
    const x = GX0 + i * CELL
    const y = GY0 + j * CELL
    // 가장 바깥 물결선(128)보다 훨씬 먼 바다는 거리를 재지 않는다
    FIELD[j * NX + i] = x < CX0 || x > CX1 || y < CY0 || y > CY1 ? 999 : (onLand(x, y) ? -1 : 1) * coastDist(x, y)
  }

/** marching squares — level 의 등거리선 꺾은선들 */
function contour(level) {
  const pos = new Map()
  const adj = new Map()
  const v = (i, j) => FIELD[j * NX + i] - level
  const at = (i, j) => [GX0 + i * CELL, GY0 + j * CELL]
  const cross = (key, va, vb, pa, pb) => {
    if (!pos.has(key)) {
      const t = va / (va - vb)
      pos.set(key, [pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t])
    }
    return key
  }
  const link = (a, b) => {
    if (!adj.has(a)) adj.set(a, [])
    if (!adj.has(b)) adj.set(b, [])
    adj.get(a).push(b)
    adj.get(b).push(a)
  }
  for (let j = 0; j < NY - 1; j++)
    for (let i = 0; i < NX - 1; i++) {
      const a = v(i, j)
      const b = v(i + 1, j)
      const c = v(i + 1, j + 1)
      const d = v(i, j + 1)
      const sa = a > 0
      const sb = b > 0
      const sc = c > 0
      const sd = d > 0
      if (sa === sb && sb === sc && sc === sd) continue
      const T = sa !== sb ? cross((j * NX + i) * 2, a, b, at(i, j), at(i + 1, j)) : null
      const R = sb !== sc ? cross((j * NX + i + 1) * 2 + 1, b, c, at(i + 1, j), at(i + 1, j + 1)) : null
      const B = sd !== sc ? cross(((j + 1) * NX + i) * 2, d, c, at(i, j + 1), at(i + 1, j + 1)) : null
      const L = sa !== sd ? cross((j * NX + i) * 2 + 1, a, d, at(i, j), at(i, j + 1)) : null
      const list = [T, R, B, L].filter((k) => k !== null)
      if (list.length === 2) link(list[0], list[1])
      else if (list.length === 4) {
        const cen = (a + b + c + d) / 4 > 0
        if (sa !== cen) link(L, T)
        if (sb !== cen) link(T, R)
        if (sc !== cen) link(R, B)
        if (sd !== cen) link(B, L)
      }
    }
  const seen = new Set()
  const walk = (start) => {
    const out = [start]
    seen.add(start)
    let cur = start
    for (;;) {
      const next = adj.get(cur).find((k) => !seen.has(k))
      if (next === undefined) break
      seen.add(next)
      out.push(next)
      cur = next
    }
    return out.map((k) => pos.get(k))
  }
  const lines = []
  for (const [k, ns] of adj) if (ns.length === 1 && !seen.has(k)) lines.push({ closed: false, pts: walk(k) })
  for (const k of adj.keys()) if (!seen.has(k)) lines.push({ closed: true, pts: walk(k) })
  return lines
}

function chaikin(pts, closed, n = 2) {
  let p = pts
  for (let k = 0; k < n; k++) {
    const out = closed ? [] : [p[0]]
    const m = closed ? p.length : p.length - 1
    for (let i = 0; i < m; i++) {
      const a = p[i]
      const b = p[(i + 1) % p.length]
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75])
    }
    if (!closed) out.push(p[p.length - 1])
    p = out
  }
  return p
}

function resample(pts, step, closed) {
  const src = closed ? [...pts, pts[0]] : pts
  const out = [src[0]]
  let carry = 0
  for (let i = 0; i < src.length - 1; i++) {
    const [x0, y0] = src[i]
    const [x1, y1] = src[i + 1]
    const len = Math.hypot(x1 - x0, y1 - y0)
    if (!len) continue
    let s = step - carry
    while (s <= len) {
      out.push([x0 + ((x1 - x0) * s) / len, y0 + ((y1 - y0) * s) / len])
      s += step
    }
    carry = len - (s - step)
  }
  return out
}

/** 획 끝을 안으로 말아 넣는 소용돌이 — 소용돌이치는 해류 */
function curlFrom(seg, side, R) {
  const p = seg[seg.length - 1]
  const q = seg[Math.max(0, seg.length - 3)]
  const L = Math.hypot(p[0] - q[0], p[1] - q[1]) || 1
  const u = [(p[0] - q[0]) / L, (p[1] - q[1]) / L]
  const c = [p[0] - u[1] * side * R, p[1] + u[0] * side * R]
  const a0 = Math.atan2(p[1] - c[1], p[0] - c[0])
  const sgn = Math.sign((p[0] - c[0]) * u[1] - (p[1] - c[1]) * u[0]) || 1
  const out = []
  for (let k = 1; k <= 10; k++) {
    const t = k / 10
    const a = a0 + sgn * t * Math.PI * 1.6
    const rr = R * (1 - 0.62 * t)
    out.push([c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr])
  }
  return out
}

// 바다뱀 자리 [x, y(물 높이), 길이, 머리 방향] — 해류 획이 몸에 닿지 않게 미리 둔다
const SERPENTS = [
  [172, 600, 110, 1],
  [1208, 428, 114, -1],
  [842, 800, 104, -1],
]
// 바다 글자와 바다뱀 자리 — 해류 획은 그 앞에서 끊는다 (옛 판화처럼 선이 글자 밑으로, 그림 속으로 지나가지 않게). [x0, y0, x1, y1]
const SEA_CLEAR = [
  [360, 256, 546, 324], // Jwar Isle
  ...SERPENTS.map(([x, y, L, dir]) => {
    const a = x + dir * -0.58 * L
    const b = x + dir * 0.55 * L
    return [Math.min(a, b) - 8, y - 0.44 * L - 8, Math.max(a, b) + 8, y + 0.14 * L + 8]
  }),
]
const clear = ([x, y]) => SEA_CLEAR.some(([x0, y0, x1, y1]) => x > x0 && x < x1 && y > y0 && y < y1)
/** 꺾은선을 글자·바다뱀 자리 밖의 토막들로 */
function cut(pts) {
  const runs = []
  let run = []
  for (const p of pts) {
    if (clear(p)) {
      if (run.length) runs.push(run)
      run = []
    } else run.push(p)
  }
  if (run.length) runs.push(run)
  return runs.filter((r) => r.length > 2)
}

function swirlRing(level, o) {
  const r = K.rng(`ring-${level}`)
  let d = ''
  for (const c of contour(level)) {
    const pts = resample(chaikin(c.pts, c.closed, 2), 8, c.closed)
    let i = Math.floor(r() * 6)
    while (i < pts.length - 3) {
      const n = Math.round((o.dash[0] + r() * (o.dash[1] - o.dash[0])) / 8)
      const seg = pts.slice(i, Math.min(pts.length, i + n))
      const curl = r() < o.curl
      const side = r() < 0.5 ? 1 : -1
      const cr = o.curlR * (0.75 + r() * 0.5)
      // 글자·바다뱀 자리에 든 점은 빼고 남은 토막만 — 말린 끝은 토막이 끊기지 않았고 말린 끝도 그 자리 밖일 때만
      const runs = cut(seg)
      for (const part of runs) {
        const tip = runs.length === 1 && part.length === seg.length && curl ? curlFrom(part, side, cr) : null
        d += K.smooth(tip && !tip.some(clear) ? [...part, ...tip] : part)
      }
      i += n + Math.max(1, Math.round((o.gap[0] + r() * (o.gap[1] - o.gap[0])) / 8))
    }
  }
  return d
}

/** 넓은 바다의 소용돌이 하나 — 납작한 나선과 꼬리 */
function eddy(cx, cy, R, dir, tail) {
  const pts = []
  for (let k = 0; k <= 36; k++) {
    const t = k / 36
    const a = dir * t * Math.PI * 3.2
    const rr = R * (0.12 + 0.88 * t)
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.62])
  }
  const last = pts[pts.length - 1]
  const prev = pts[pts.length - 2]
  const ux = last[0] - prev[0]
  const uy = last[1] - prev[1]
  const ul = Math.hypot(ux, uy) || 1
  pts.push([last[0] + (ux / ul) * R * tail * 0.5, last[1] + (uy / ul) * R * tail * 0.5 + R * 0.08])
  pts.push([last[0] + (ux / ul) * R * tail, last[1] + (uy / ul) * R * tail + R * 0.25])
  return K.smooth(pts)
}

/**
 * 세계 지도의 소용돌이 기호(landscapeGlyphs.ts whirlGlyph)를 이 축척으로 — 같은 중심·반지름·시작각·감는 방향의
 * 한 바퀴 반 나선(세로 0.7)과 접선 꼬리. 지역 지도답게 나란히 도는 끊긴 물결 세 가닥(안쪽 둘, 바깥 하나)을 더한다.
 * 중심·반지름·시작각·방향은 세계 지도에 그려진 기호 경로에서 맞춘 값이다 (세계 좌표 → 이 지도 좌표 ×20).
 */
function whirl(cx, cy, R, a0deg, dir, seed, outer) {
  const r = K.rng(seed)
  const a0 = (a0deg * Math.PI) / 180
  const turns = 1.6
  const at = (t, k = 1) => {
    const a = a0 + dir * t * turns * Math.PI * 2
    const rr = R * (0.12 + 0.88 * t) * k
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.7]
  }
  const run = (t0, t1, k, n) => Array.from({ length: n + 1 }, (_, i) => at(t0 + ((t1 - t0) * i) / n, k))
  // 본 나선과 꼬리 (세계 지도 기호와 같은 모양)
  const main = run(0, 1, 1, 64)
  const a = a0 + dir * turns * Math.PI * 2
  const tx = -Math.sin(a) * dir
  const ty = Math.cos(a) * dir
  const end = main[main.length - 1]
  const tail = [end, [end[0] + tx * R * 0.35, end[1] + ty * R * 0.35 * 0.7], [end[0] + tx * R * 0.7, end[1] + ty * R * 0.7 * 0.7]]
  let d = cut([...main, ...tail.slice(1)]).map((p) => K.smooth(p)).join('')
  // 나란히 도는 물결 — 끊긴 획 몇 개. 바깥 한 가닥(outer: [k, t0, t1])은 지도 안쪽을 향한 반 바퀴에만 —
  // 중심이 지도 가장자리 밖에 걸린 소용돌이도 소용돌이로 읽히게
  for (const [k, t0, t1] of [[0.8, 0.3, 0.97], [0.62, 0.5, 0.95], outer]) {
    let t = t0 + r() * 0.04
    while (t < t1 - 0.04) {
      const len = 0.1 + r() * 0.12
      const te = Math.min(t1, t + len)
      for (const p of cut(run(t, te, k, 12))) d += K.smooth(p)
      t = te + 0.03 + r() * 0.04
    }
  }
  return d
}

// ── 바다뱀 — 물 위로 솟은 몸 고리 둘, 목과 머리, 꼬리 지느러미. (x, y) 는 물 높이의 가운데, dir 1 이면 머리가 오른쪽 ──
function bez(p0, p1, p2, p3, s) {
  const u = 1 - s
  return [
    u * u * u * p0[0] + 3 * u * u * s * p1[0] + 3 * u * s * s * p2[0] + s * s * s * p3[0],
    u * u * u * p0[1] + 3 * u * u * s * p1[1] + 3 * u * s * s * p2[1] + s * s * s * p3[1],
  ]
}

function tube(p0, p1, p2, p3, w0, w1, n = 14) {
  const c = []
  for (let k = 0; k <= n; k++) c.push(bez(p0, p1, p2, p3, k / n))
  const left = []
  const right = []
  for (let k = 0; k <= n; k++) {
    const a = c[Math.max(0, k - 1)]
    const b = c[Math.min(n, k + 1)]
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const nx = -(b[1] - a[1]) / l
    const ny = (b[0] - a[0]) / l
    const w = (w0 + (w1 - w0) * (k / n)) / 2
    left.push([c[k][0] + nx * w, c[k][1] + ny * w])
    right.push([c[k][0] - nx * w, c[k][1] - ny * w])
  }
  return { c, left, right }
}

function serpent(x, y, L, dir) {
  const t = L * 0.068
  const T = ([px, py]) => [x + dir * px, y + py]
  const TT = (pts) => pts.map(T)
  const fills = []
  const hatch = []
  const inks = []
  const water = []
  const feet = []
  // 몸 고리 — 물에서 솟았다 들어가는 반고리
  const humps = [
    [-0.33 * L, -0.15 * L, 0.12 * L],
    [-0.1 * L, 0.08 * L, 0.145 * L],
  ]
  for (const [a, b, h] of humps) {
    const outer = []
    const inner = []
    for (let k = 0; k <= 18; k++) {
      const ang = Math.PI * (1 - k / 18)
      outer.push([(a + b) / 2 + (Math.cos(ang) * (b - a)) / 2, -Math.sin(ang) * h])
      inner.push([(a + b) / 2 + Math.cos(ang) * ((b - a) / 2 - t), -Math.sin(ang) * (h - t)])
    }
    const ring = [...outer, ...[...inner].reverse()]
    fills.push(K.poly(TT(ring)))
    inks.push(K.smooth(TT(outer)) + K.smooth(TT(inner)))
    // 아랫면 그늘 — 고리 안쪽의 오른쪽(뒤쪽) 반
    for (const s of [10, 12, 14, 16]) {
      const pi = inner[s]
      const po = outer[s]
      hatch.push(K.line(TT([pi, [pi[0] + (po[0] - pi[0]) * 0.55, pi[1] + (po[1] - pi[1]) * 0.55]])))
    }
    // 등지느러미 가시
    for (const s of [4, 7, 10, 13]) {
      const p = outer[s]
      const q = outer[s + 1]
      const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
      const cx = (a + b) / 2
      const nx = (m[0] - cx) / ((b - a) / 2)
      const ny = m[1] / h
      const nl = Math.hypot(nx, ny) || 1
      const tip = [m[0] + (nx / nl) * t * 0.75 - t * 0.25, m[1] + (ny / nl) * t * 0.75]
      const spine = [p, tip, q]
      fills.push(K.poly(TT(spine)))
      inks.push(K.line(TT(spine)))
    }
    feet.push(a, a + t, b - t, b)
  }
  // 목과 머리
  const n0 = [0.15 * L, 0]
  const n3 = [0.33 * L, -0.27 * L]
  const neck = tube([n0[0] + t / 2, 0], [n0[0] + t / 2, -0.2 * L], [0.22 * L, -0.31 * L], n3, t * 1.05, t * 0.85)
  fills.push(K.poly(TT([...neck.left, ...[...neck.right].reverse()])))
  // 목의 윤곽은 머리 뒤에서 멈춘다 — 머리 채움 위로 줄이 비치지 않게
  inks.push(K.smooth(TT(neck.left.slice(0, -1))) + K.smooth(TT(neck.right.slice(0, -1))))
  for (const k of [3, 5, 7]) hatch.push(K.line(TT([neck.right[k], [neck.right[k][0] - t * 0.35, neck.right[k][1] + t * 0.05]])))
  feet.push(n0[0], n0[0] + t)
  const e0 = neck.c[neck.c.length - 2]
  const el = Math.hypot(n3[0] - e0[0], n3[1] - e0[1]) || 1
  const ex = [(n3[0] - e0[0]) / el, (n3[1] - e0[1]) / el]
  const ey = [-ex[1], ex[0]]
  const HF = ([u, v]) => [n3[0] + (ex[0] * u + ey[0] * v) * t, n3[1] + (ex[1] * u + ey[1] * v) * t]
  const head = [[-0.35, -0.55], [0.3, -0.85], [1.0, -0.8], [1.7, -0.5], [2.5, -0.25], [2.75, -0.05], [1.25, 0.08], [2.35, 0.5], [2.1, 0.68], [1.4, 0.82], [0.5, 0.75], [-0.3, 0.5]].map(HF)
  const mouth = [[2.7, -0.03], [1.25, 0.08], [2.3, 0.46]].map(HF)
  const eye = [[0.95, -0.42], [1.2, -0.5], [1.32, -0.38], [1.05, -0.32]].map(HF)
  const frill = [[-0.25, -0.5], [-0.9, -1.25], [-0.05, -0.72], [-0.45, -1.55], [0.35, -0.82], [0.25, -1.45], [0.75, -0.82]].map(HF)
  // 겹치는 모양은 따로 채운다 — 한 경로에 넣으면 감긴 방향이 달라 겹친 곳이 비어(nonzero) 바다가 비친다
  const top = [K.poly(TT(frill)), K.poly(TT(head))]
  inks.push(K.line(TT(frill)), K.line(TT(head)))
  const darks = [K.poly(TT(mouth)), K.poly(TT(eye))]
  hatch.push(K.line(TT([[1.2, 0.35], [0.4, 0.45]].map(HF))) + K.line(TT([[1.6, 0.55], [0.8, 0.62]].map(HF))))
  // 꼬리 — 물에서 솟아 뒤로 굽은 꼬리와 갈라진 지느러미
  const tl = tube([-0.4 * L, 0], [-0.41 * L, -0.06 * L], [-0.44 * L, -0.09 * L], [-0.48 * L, -0.1 * L], t * 0.9, t * 0.4, 10)
  fills.push(K.poly(TT([...tl.left, ...[...tl.right].reverse()])))
  inks.push(K.smooth(TT(tl.left)) + K.smooth(TT(tl.right)))
  const te = [-0.48 * L, -0.1 * L]
  const fin = [te, [te[0] - 0.05 * L, te[1] - 0.075 * L], [te[0] - 0.035 * L, te[1] - 0.01 * L], [te[0] - 0.075 * L, te[1] + 0.035 * L], [te[0] + 0.005 * L, te[1] + 0.012 * L]]
  const finD = K.poly(TT(fin))
  inks.push(K.poly(TT(fin)))
  feet.push(-0.4 * L - t * 0.45, -0.4 * L + t * 0.45)
  // 물 높이 — 몸이 드나드는 자리의 잔물결과 몸을 따라 끌리는 물결
  for (let i = 0; i < feet.length; i += 2) {
    const fa = feet[i]
    const fb = feet[i + 1]
    water.push(K.smooth(TT([[fa - t * 1.1, 1.6], [fa - t * 0.55, 0.2], [fa - 0.5, 0.6]])))
    water.push(K.smooth(TT([[fb + 0.5, 0.6], [fb + t * 0.55, 0.2], [fb + t * 1.1, 1.6]])))
  }
  water.push(K.smooth(TT([[-0.42 * L, t * 0.6], [-0.1 * L, t * 0.75], [0.2 * L, t * 0.55]])))
  water.push(K.smooth(TT([[-0.3 * L, t * 1.25], [-0.05 * L, t * 1.35], [0.12 * L, t * 1.2]])))
  return [
    P('fill', fills.join('')),
    P('fill', finD),
    ...top.map((d) => P('fill', d)),
    P('hatch', hatch.join('')),
    P('dark', darks.join('')),
    P('ink', inks.join('')),
    P('sea-ink', water.join('')),
  ]
}

// ── 파둔 — 키 크고 가는 사람 얼굴의 화강암 두상, 크게 벌린 입. 땅·모래·얕은 물에 반쯤 묻혀 기운다 ─────────────
function clipAbove(poly, gy) {
  const out = []
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    const pin = p[1] <= gy
    const qin = q[1] <= gy
    if (pin) out.push(p)
    if (pin !== qin) {
      const t = (gy - p[1]) / (q[1] - p[1])
      out.push([p[0] + (q[0] - p[0]) * t, gy])
    }
  }
  return out
}

function clipLineAbove(pts, gy) {
  const runs = []
  let run = []
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const pin = p[1] <= gy
    if (i > 0) {
      const q = pts[i - 1]
      const qin = q[1] <= gy
      if (pin !== qin) {
        const t = (gy - q[1]) / (p[1] - q[1])
        run.push([q[0] + (p[0] - q[0]) * t, gy])
        if (!pin) {
          runs.push(run)
          run = []
        }
      }
    }
    if (pin) run.push(p)
  }
  if (run.length) runs.push(run)
  return runs.filter((x) => x.length > 1)
}

/** 잘린 다각형을 땅선(맨 아래 수평 변)에서 끊어 열린 윤곽으로 */
function openAtGround(poly, gy) {
  const n = poly.length
  for (let i = 0; i < n; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % n]
    if (Math.abs(a[1] - gy) < 0.01 && Math.abs(b[1] - gy) < 0.01) return [...poly.slice(i + 1), ...poly.slice(0, i + 1)]
  }
  return [...poly, poly[0]]
}

const ell = (cx, cy, rx, ry, n = 14) => Array.from({ length: n }, (_, k) => [cx + Math.cos((k / n) * Math.PI * 2) * rx, cy + Math.sin((k / n) * Math.PI * 2) * ry])

// 얼굴 (머리 높이 1, 턱 밑 (0,0), 정수리 (0,-1)) — 키 크고 가는 사람 얼굴, 무거운 눈썹뼈, 긴 코, 크게 벌린 입
const FRONT = (() => {
  const half = [[0, -1], [0.075, -0.99], [0.128, -0.958], [0.158, -0.9], [0.168, -0.8], [0.162, -0.725], [0.178, -0.645], [0.18, -0.53], [0.166, -0.41], [0.15, -0.29], [0.13, -0.16], [0.1, -0.055], [0.068, 0.02]]
  return [...half, ...half.slice(1).reverse().map(([x, y]) => [-x, y])]
})()
const PROFILE = [
  [-0.16, 0.02], [-0.18, -0.2], [-0.19, -0.45], [-0.18, -0.7], [-0.15, -0.86], [-0.09, -0.96], [0, -1], [0.08, -0.98], [0.13, -0.92],
  [0.15, -0.84], [0.163, -0.765], [0.205, -0.738], [0.168, -0.7], [0.176, -0.655], [0.212, -0.58], [0.262, -0.502], [0.236, -0.482],
  [0.2, -0.476], [0.206, -0.44], [0.196, -0.416], [0.098, -0.36], [0.172, -0.272], [0.196, -0.252], [0.19, -0.16], [0.165, -0.06], [0.12, 0.02],
]

const MOUTH_FRONT = [
  [-0.078, -0.404], [-0.04, -0.411], [0, -0.413], [0.04, -0.411], [0.078, -0.404], [0.075, -0.36],
  [0.064, -0.313], [0.042, -0.279], [0, -0.265], [-0.042, -0.279], [-0.064, -0.313], [-0.075, -0.36],
]
// 아래턱에 고인 빛 — 윗변이 둥글게 솟아 이빨 줄처럼 곧게 보이지 않게
const GLOW_FRONT = [[-0.054, -0.302], [-0.038, -0.322], [0, -0.336], [0.038, -0.322], [0.054, -0.302], [0.036, -0.286], [0, -0.278], [-0.036, -0.286]]

function faduun(o) {
  const { h, view } = o
  const [gx, gy] = o.at
  const a = ((o.rot ?? 0) * Math.PI) / 180
  const ca = Math.cos(a)
  const sa = Math.sin(a)
  const fl = view === 'left' ? -1 : 1
  const sink = o.sink ?? 0.3
  const T = ([lx, ly]) => {
    const px = lx * fl * h
    const py = (ly + sink) * h
    return [gx + px * ca - py * sa, gy + px * sa + py * ca]
  }
  const shape = clipAbove((view === 'front' ? FRONT : PROFILE).map(T), gy)
  if (shape.length < 3) return { y: gy, parts: [] }
  const darks = []
  const glow = []
  let hatch = ''
  const addPoly = (pts, list) => {
    const c = clipAbove(pts.map(T), gy)
    if (c.length > 2) list.push(K.poly(c))
  }
  const addLine = (pts) => {
    for (const run of clipLineAbove(pts.map(T), gy)) hatch += K.line(run)
  }
  let brow = ''
  if (view === 'front') {
    // 눈썹뼈 밑 그늘(가는 띠)과 깊은 눈
    addPoly([[-0.148, -0.742], [0.148, -0.742], [0.13, -0.727], [-0.13, -0.727]], darks)
    addPoly(ell(-0.074, -0.676, 0.046, 0.019, 10), darks)
    addPoly(ell(0.074, -0.676, 0.046, 0.019, 10), darks)
    // 크게 벌린 입 — 거의 곧은 윗입술 밑으로 아래턱이 둥글게 처진 구멍. 빛은 둥근 고리가 아니라 아래턱에 고인다
    addPoly(MOUTH_FRONT, darks)
    if (o.glow) addPoly(GLOW_FRONT, glow)
    for (const run of clipLineAbove([[-0.01, -0.705], [-0.038, -0.54], [0.002, -0.522], [0.044, -0.536]].map(T), gy)) brow += K.line(run)
    addPoly(ell(0.012, -0.531, 0.026, 0.009, 8), darks)
    addLine([[0.122, -0.88], [0.132, -0.77]])
    addLine([[0.15, -0.62], [0.148, -0.46]])
    addLine([[0.124, -0.22], [0.106, -0.09]])
  } else {
    addPoly([[0.206, -0.44], [0.098, -0.36], [0.184, -0.262]], darks)
    // 빛은 벌린 입의 앞쪽(열린 쪽)에 닿게 — 안쪽에 갇힌 고리로 보이지 않게
    if (o.glow) addPoly([[0.128, -0.352], [0.1976, -0.372], [0.1872, -0.288]], glow)
    addPoly(ell(0.128, -0.69, 0.03, 0.016, 8), darks)
    for (const run of clipLineAbove([[-0.03, -0.66], [-0.07, -0.6], [-0.064, -0.52], [-0.03, -0.5]].map(T), gy)) brow += K.smooth(run)
    addLine([[0.13, -0.58], [0.14, -0.49]])
    addLine([[0.07, -0.24], [0.11, -0.12]])
    addLine([[-0.11, -0.86], [-0.14, -0.72]])
    addLine([[0.04, -0.94], [0.1, -0.9]])
  }
  const outline = openAtGround(shape, gy)
  const xs = shape.filter((p) => Math.abs(p[1] - gy) < 0.01).map((p) => p[0])
  const xl = xs.length ? Math.min(...xs) : gx - h * 0.1
  const xr = xs.length ? Math.max(...xs) : gx + h * 0.1
  const parts = [P('stone', K.poly(shape)), P('hatch', hatch)]
  if (darks.length) parts.push(P('dark', darks.join('')))
  if (glow.length) parts.push(P('fill', glow.join('')), P('sea', glow.join('')))
  parts.push(P('ink', K.line(outline) + brow))
  if (o.water) {
    parts.push(
      P(
        'sea-ink',
        K.smooth([[xl - h * 0.42, gy + 1.2], [xl - h * 0.2, gy - 0.4], [xl - 0.6, gy + 0.3]]) +
          K.smooth([[xr + 0.6, gy + 0.3], [xr + h * 0.2, gy - 0.4], [xr + h * 0.42, gy + 1.2]]) +
          K.smooth([[xl - h * 0.22, gy + h * 0.16], [(xl + xr) / 2, gy + h * 0.12], [xr + h * 0.26, gy + h * 0.17]]),
      ),
    )
  } else {
    const m = h * 0.16
    parts.push(P('ink', K.smooth([[xl - m, gy + 0.9], [xl - m * 0.3, gy - 0.2], [(xl + xr) / 2, gy - 0.6], [xr + m * 0.3, gy - 0.2], [xr + m, gy + 0.9]])))
    parts.push(P('hatch', K.line([[xr - (xr - xl) * 0.2, gy + 2.2], [xr + m * 1.1, gy + 2.6]]) + K.line([[xl + (xr - xl) * 0.25, gy + 4], [xr + m * 0.6, gy + 4.3]])))
  }
  return { y: gy, parts }
}

// ── 지형지물 자리 (이 지도의 해석) ────────────────────────────────────────────────────────────
// 세계 지도 구덩이 기호(jwar-strand-pit, 세계 [195,1448])의 자리
const PIT = [700, 460]
const BEAM_TOP = 388
// 절벽 가장자리 — 세계 지도 절벽선(jwar-cliffs)을 따라 서쪽에서 동쪽 만의 해안까지, 이 축척에서 들쭉날쭉하게
const WORLD_CLIFF = [[764, 466], [800, 450], [838, 442], [876, 438], [912, 438]]
const cliffAt = (x) => {
  for (let i = 0; i < WORLD_CLIFF.length - 1; i++) {
    const [ax, ay] = WORLD_CLIFF[i]
    const [bx, by] = WORLD_CLIFF[i + 1]
    if (x <= bx) return ay + ((by - ay) * (x - ax)) / (bx - ax)
  }
  return WORLD_CLIFF[WORLD_CLIFF.length - 1][1]
}
const CLIFF = [764, 776, 786, 797, 810, 822, 836, 849, 861, 873, 886, 898, 912].map((x, i, a) => [
  x,
  r1(cliffAt(x) + (i === 0 || i === a.length - 1 ? 0 : i % 2 ? -1.8 : 1.2)),
])
// 바위 발판 — 절벽 위에서 하늘거주지 문까지 위·북동쪽으로 (Hunger: 'up and northeast') [x, y, 너비]
// 맨 위 발판은 하늘거주지 왼쪽 끝 바깥(밑면 아래가 아니라 옆)에 두어, 문까지의 밧줄이 매달린 줄로 보이지 않게 한다
const STEPS = [[764, 425, 24], [769, 396, 20], [777, 367, 20], [777, 338, 17]]
const GATE = [801, 317]

// 파둔 — [x, y(땅·물 높이), 높이, 보는 쪽, 기울기(도), 묻힌 정도, 물, 빛(0 이면 끔 — 기본은 모두 빛난다)].
// 둘레 해안 모래에 많이, 안쪽과 얕은 물에 몇. 함정 둘레의 머리는 함정 쪽을 보지 않는다 (둘을 잇는 서술이 없다)
const HEADS = [
  // 서쪽 꼬리 — 북쪽·서쪽·남쪽 해안 모래와 얕은 물
  [512, 377, 28, 'left', -14, 0.14],
  [470, 409, 26, 'left', -12, 0.14],
  [440, 414, 22, 'left', -16, 0.3, 1],
  [312, 476, 26, 'left', -18, 0.16],
  [290, 452, 22, 'left', 10, 0.3, 1],
  [352, 524, 24, 'front', -24, 0.2],
  [420, 525, 26, 'right', -10, 0.18],
  [486, 523, 28, 'left', 34, 0.22],
  [536, 530, 24, 'front', -22, 0.25],
  // Faduun 표시 둘레 — 가장 빽빽한 무리
  [430, 478, 32, 'front', -8, 0.1, 0, 1],
  [470, 488, 26, 'right', 20, 0.18],
  [392, 496, 26, 'left', -30, 0.2],
  // 함정 곁 — 저마다 다른 쪽을 보고, 함정 쪽으로 돌아서지 않는다 (둘을 잇는 서술이 없다)
  [546, 398, 28, 'left', -14, 0.14],
  [666, 414, 26, 'front', 14, 0.16],
  [600, 520, 30, 'front', -6, 0.12, 0, 1],
  // 본섬 북쪽 해안
  [592, 364, 24, 'right', 20, 0.2],
  [722, 300, 20, 'front', -8, 0.3, 1],
  // 남동쪽 곶
  [988, 477, 26, 'right', -12, 0.2],
  [1012, 522, 24, 'right', 34, 0.25],
  [1046, 503, 20, 'right', -10, 0.3, 1],
  [958, 534, 24, 'front', 6, 0.15],
  // 남쪽 해안
  [652, 580, 26, 'right', -30, 0.2],
  [706, 647, 22, 'front', 10, 0.3, 1],
  [874, 625, 26, 'right', 16, 0.18],
  [904, 587, 24, 'front', -52, 0.22],
  // 상륙 해변 — 모래와 풀에서 솟아 바다 쪽을 보는 두 얼굴 (Hunger)
  [752, 653, 46, 'front', -4, 0.1, 0, 1],
  [808, 655, 44, 'front', 5, 0.1, 0, 1],
  // 안쪽
  [640, 552, 24, 'right', 8, 0.18],
]

/** 벼랑 — KIT.cliff 와 같은 층(그늘 면·세로 빗금·굵은 가장자리)이되, 바위 면의 밑단을 완만하게 하고 양 끝에서 얕아지게 */
function cliffFace(pts, depth, seed) {
  const r = K.rng(seed)
  const ph = r() * 10
  const samples = K.along(pts, 4.5)
  const top = []
  const bot = []
  let ticks = ''
  samples.forEach(([[x, y]], i) => {
    const t = i / (samples.length - 1)
    const taper = Math.min(1, t * 5, (1 - t) * 7)
    const dd = depth * (0.72 + 0.2 * Math.sin(x * 0.075 + ph) + 0.1 * Math.sin(x * 0.21 + ph * 2)) * (0.3 + 0.7 * taper)
    top.push([x, y])
    bot.push([x, y + dd])
    ticks += K.line([[x, y + 1.2], [x + (r() - 0.5) * 0.8, y + dd * (0.5 + r() * 0.5)]])
  })
  return [P('shade', K.poly([...top, ...bot.reverse()])), P('hatch', ticks), P('ink-bold', K.smooth(pts))]
}

// ── 그리기 ──────────────────────────────────────────────────────────────────────────────
const parts = []

// 바다: 섬을 두른 소용돌이 해류. 앱이 해안에서 22·46·75 거리에 물결선을 그리므로, 끊긴 해류 고리는
// 그 선들 사이(34)와 바깥(104·136)에 둔다 — 같은 거리에 겹쳐 그리면 선이 두 겹으로 어긋나 보인다
parts.push(
  P(
    'sea-ink',
    swirlRing(34, { dash: [80, 170], gap: [26, 56], curl: 0.2, curlR: 7 }) +
      swirlRing(104, { dash: [90, 200], gap: [18, 40], curl: 0.32, curlR: 12 }) +
      swirlRing(136, { dash: [70, 170], gap: [30, 64], curl: 0.26, curlR: 14 }) +
      // 세계 지도의 네 소용돌이 (jwar-currents-n·w·e·s) — 세계 기호에 맞춘 중심·반지름·시작각·방향
      whirl(543, 53, 144, 176, -1, 'whirl-n', [1.13, 0.62, 0.93]) +
      whirl(10, 451, 102, 300, -1, 'whirl-w', [1.3, 0.38, 0.68]) +
      whirl(1374, 523, 148, 295, 1, 'whirl-e', [1.13, 0.8, 1]) +
      whirl(1136, 989, 142, 207, -1, 'whirl-s', [1.3, 0.36, 0.68]) +
      eddy(250, 395, 16, 1, 2.2) +
      eddy(1095, 330, 18, -1, 2.4) +
      eddy(1075, 625, 15, 1, 2) +
      eddy(395, 655, 14, -1, 2) +
      eddy(700, 175, 15, 1, 2.2) +
      eddy(975, 160, 13, -1, 2),
  ),
)
// 해안을 씻는 짧은 물결 (sea-swept)
{
  const r = K.rng('surf')
  let d = ''
  for (const c of contour(10)) {
    const pts = resample(chaikin(c.pts, c.closed, 2), 5, c.closed)
    let i = Math.floor(r() * 6)
    while (i < pts.length - 3) {
      const n = Math.round((14 + r() * 26) / 5)
      d += K.smooth(pts.slice(i, i + n + 1))
      i += n + Math.round((26 + r() * 60) / 5)
    }
  }
  parts.push(P('sea-ink', d))
}

// 바다뱀 — 섬을 에워싼 영역을 지키는 바다뱀
for (const [x, y, L, dir] of SERPENTS) parts.push(...serpent(x, y, L, dir))

// 상륙 해변 — 남쪽 끝의 모래와 풀 (Hunger: 'sand and grass')
{
  const r = K.rng('beach')
  let dots = ''
  for (let k = 0; k < 1400; k++) {
    const x = 696 + r() * 170
    const y = 600 + r() * 85
    if (!onLand(x, y)) continue
    const dd = coastDist(x, y)
    if (dd > 26 || r() > Math.pow(1 - dd / 26, 1.3) * 0.55) continue
    dots += `M${pt([x, y])}h0.4`
  }
  let grass = ''
  for (const [gx, gy, s] of [[716, 622, 5], [734, 637, 4.5], [780, 641, 5], [836, 635, 4.5], [852, 619, 5], [792, 627, 4], [724, 607, 4], [866, 601, 4.5], [770, 624, 4]]) {
    for (let k = -1.5; k <= 1.5; k += 1) {
      const lean = k * 0.16 + (r() - 0.5) * 0.25
      grass += K.line([[gx + k * 1.4, gy], [gx + k * 1.4 + lean * s, gy - s * (0.8 + r() * 0.4)]])
    }
  }
  parts.push(P('ink', dots), P('hatch', grass))
}

// Strand — 섬 가운데 바닷물 찬 깊은 구덩이와 하늘로 뻗는 희미한 푸른 빛줄기
{
  const [px, py] = PIT
  const rim = ell(px, py, 27, 15, 18).map(([x, y], k) => [x + Math.sin(k * 2.1) * 1.6, y + Math.cos(k * 1.7) * 1.1])
  const water = ell(px + 1, py + 4, 21, 9.5, 16)
  let wall = ''
  for (let k = -5; k <= 5; k++) {
    const x = px + k * 4
    const top = py - 15 * Math.sqrt(Math.max(0, 1 - (k * 4) ** 2 / 27 ** 2)) + 1
    const bot = py + 4 - 9.5 * Math.sqrt(Math.max(0, 1 - (k * 4 - 1) ** 2 / 21 ** 2)) - 0.5
    if (bot - top > 2) wall += K.line([[x, top + 0.5], [x + 0.4, bot]])
  }
  // 빛줄기 — 옛 판화의 빛살처럼 가는 물빛 선 몇 가닥이 위로 살짝 벌어지며(하늘로 뻗는 빛) 끊겨 사라진다.
  // 채운 띠로 그리면 물기둥처럼, 위로 모이면 첨탑처럼 보인다. 먼 쪽 테두리 앞에 서도록 테두리 다음에 그린다
  let beam = ''
  {
    const rr = K.rng('strand-beam')
    for (const d of [-2.5, -0.85, 0.85, 2.5]) {
      const reach = BEAM_TOP + rr() * 7
      const xAt = (yy) => px + d * (1 + 1.15 * ((py - yy) / (py - BEAM_TOP)))
      let y = py - 3 - rr() * 2.5
      let dash = 22 + rr() * 12
      let gap = 1.6 + rr() * 2
      while (y > reach) {
        const y1 = Math.max(reach, y - dash)
        beam += K.line([[xAt(y), y], [xAt(y1), y1]])
        y = y1 - gap
        dash = Math.max(2.5, dash * 0.64)
        gap = Math.min(9, gap * 1.35)
      }
    }
  }
  parts.push(
    P('shade', K.smooth(rim, true)),
    P('hatch', wall),
    P('fill', K.smooth(water, true)),
    P('sea', K.smooth(water, true)),
    P('sea-ink', K.smooth(water, true) + `M${pt([px - 12, py + 4])}q4 -1.6 8 0M${pt([px + 4, py + 7])}q4 -1.6 8 0`),
    P('ink', K.smooth(rim, true)),
    P('sea-ink', beam),
  )
}

// 돌 절벽 — 남쪽(해변 쪽)으로 바위 면, 동쪽 끝은 만의 해안에 닿는다 (Hunger: 'the stone cliffs')
parts.push(...cliffFace(CLIFF, 30, 'jwar-cliff'))
parts.push(...K.rocks(784, 491, 6, 3, 'cliff-r1'), ...K.rocks(852, 485, 5, 2, 'cliff-r2'), ...K.rocks(896, 476, 5, 3, 'cliff-r3'))

// 파둔 — 뒤(위)에서 앞(아래)으로
parts.push(...K.stack(HEADS.map(([x, y, h, view, rot, sink, water, glow]) => faduun({ at: [x, y], h, view, rot, sink, water: !!water, glow: glow !== 0 }))))

// ── 떠 있는 바위 — 평평하고 들쭉날쭉한 윗면, 깨져 뾰족한 밑면. 바위 발판과 하늘거주지 조각에 ─────────────────
function floatRock(cx, cy, w, seed, o = {}) {
  const r = K.rng(seed)
  const ry = w * 0.1
  const top = []
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2
    const j = 0.9 + r() * 0.16
    top.push([cx + Math.cos(a) * (w / 2) * j, cy + Math.sin(a) * ry * j])
  }
  const th = w * (o.band ?? 0.16)
  const depth = w * (o.depth ?? 0.62)
  const L = top[6]
  const R = top[0]
  const tip = cx + (r() - 0.5) * w * 0.3
  const j = () => (r() - 0.5) * w * 0.06
  const lo = [L[0] + w * 0.02, L[1] + th]
  const ro = [R[0] - w * 0.02, R[1] + th]
  const under = [
    L, lo,
    [cx - w * 0.36 + j(), cy + th + depth * 0.22],
    [cx - w * 0.24 + j(), cy + th + depth * 0.3],
    [cx - w * 0.16 + j(), cy + th + depth * 0.52],
    [tip - w * 0.05, cy + th + depth * 0.72],
    [tip, cy + th + depth],
    [tip + w * 0.08, cy + th + depth * 0.66],
    [cx + w * 0.2 + j(), cy + th + depth * 0.44],
    [cx + w * 0.3 + j(), cy + th + depth * 0.36],
    [cx + w * 0.38 + j(), cy + th + depth * 0.14],
    ro, R,
  ]
  const front = top.slice(0, 7).reverse() // 왼쪽 끝 → 앞 → 오른쪽 끝
  const body = K.poly([...front, ...[...under].reverse()])
  // 띠의 돌결과 밑면 줄무늬, 오른쪽 그늘
  let hatch = K.line([[lo[0] + w * 0.08, lo[1] - 0.2], [ro[0] - w * 0.06, ro[1] - 0.2]])
  hatch += K.line([[cx - w * 0.22, cy + th + depth * 0.3], [cx + w * 0.24, cy + th + depth * 0.32]])
  for (let k = 0; k < 3; k++) {
    const x = cx + w * (0.18 + k * 0.09)
    hatch += K.line([[x, cy + ry + 1], [x - 0.6, cy + th + depth * (0.4 - k * 0.1)]])
  }
  return [P('stone', body), P('hatch', hatch), P('fill', K.poly(top)), P('ink-bold', K.line(under)), P('ink', K.poly(top))]
}

/** 떠 있는 바위 덩이 — 옆에서 본 모습: 울퉁불퉁 평평한 윗선과 얇은 턱, 깨져 뾰족한 밑. (cx, cy) 는 윗선 가운데 */
function floatBoulder(cx, cy, w, seed, o = {}) {
  const r = K.rng(seed)
  const h = w * (o.h ?? 0.72)
  const tilt = o.tilt ?? 0
  const top = []
  for (let k = 0; k <= 5; k++) {
    const s = k / 5
    top.push([cx - w / 2 + w * s, cy + (k === 0 || k === 5 ? 1.2 : -r() * 1.8) + (s - 0.5) * tilt])
  }
  const tip = [cx + (r() - 0.5) * w * 0.24, cy + h]
  const j = () => (r() - 0.5) * w * 0.05
  const right = [[cx + w * 0.5, cy + h * 0.14 + tilt / 2], [cx + w * 0.41 + j(), cy + h * 0.3], [cx + w * 0.31, cy + h * 0.27], [cx + w * 0.22 + j(), cy + h * 0.52], [tip[0] + w * 0.08, cy + h * 0.7], tip]
  const left = [[tip[0] - w * 0.07, cy + h * 0.64], [cx - w * 0.17 + j(), cy + h * 0.48], [cx - w * 0.27, cy + h * 0.38], [cx - w * 0.35 + j(), cy + h * 0.42], [cx - w * 0.44, cy + h * 0.2], [cx - w * 0.5, cy + h * 0.1 - tilt / 2]]
  const outline = [...top, ...right, ...left]
  const ledge = top.map(([x, y]) => [x, y + w * 0.1])
  const shade = K.poly([[cx + w * 0.12, cy + 1.5], [cx + w * 0.5, cy + 1.5 + tilt / 2], ...right.slice(0, 4), [cx + w * 0.12, cy + h * 0.5]])
  let hatch = ''
  for (let k = 0; k < 3; k++) {
    const x = cx + w * (0.2 + k * 0.1)
    hatch += K.line([[x, cy + w * 0.13], [x - 0.6, cy + h * (0.48 - k * 0.1)]])
  }
  hatch += K.line([[cx - w * 0.3, cy + h * 0.3], [cx + w * 0.05, cy + h * 0.32]])
  return [P('stone', K.poly(outline)), P('shade', shade), P('fill', K.poly([...top, ...[...ledge].reverse()])), P('hatch', hatch), P('ink', K.line(ledge.slice(1, 5))), P('ink-bold', K.poly(outline))]
}

// 밧줄 걸린 바위 발판 (Hunger: 'raised rocks … nearest together and already cabled')
{
  const items = []
  for (const [i, [x, y, w]] of STEPS.entries()) items.push({ y: 1000 - y, parts: floatBoulder(x, y, w, `step-${i}`, { h: 0.62, tilt: i % 2 ? 1.5 : -1.5 }) })
  parts.push(...K.stack(items))
  // 밧줄 — 절벽 가장자리에서 발판들의 동쪽(오른쪽) 끝을 이어 오르는 살짝 처진 줄. 발판 밑면을 가로지르지 않게 한쪽 끝끼리 잇는다.
  // 마지막 발판에서 문까지는 하늘거주지를 그린 뒤에 (가려지지 않게)
  const ends = [CLIFF[1], ...STEPS.map(([x, y, w]) => [x + w * 0.42, y - 0.5])]
  let cable = ''
  for (let i = 0; i < ends.length - 1; i++) {
    const a = ends[i]
    const b = ends[i + 1]
    cable += `M${pt(a)}Q${pt([(a[0] + b[0]) / 2 + 2.5, (a[1] + b[1]) / 2 + 2])} ${pt(b)}`
  }
  parts.push(P('ink', cable))
}
const LAST_STEP = STEPS[STEPS.length - 1]

// ── 온두 하늘거주지 — 다시 떠올라 열린 반구 모양 돌 조각 (Hunger: 'Semicircular stone … hovering') ──────────────
function brokenTower(x, y, w, h, seed) {
  const r = K.rng(seed)
  const tw = w * 0.86
  const L = x - w / 2
  const Rr = x + w / 2
  const top = y - h
  const jag = [[x - tw / 2, top + h * 0.1 * r()], [x - tw * 0.18, top - h * 0.04], [x + tw * 0.02, top + h * 0.12], [x + tw * 0.2, top + h * 0.03], [x + tw / 2, top + h * (0.18 + r() * 0.08)]]
  const body = K.poly([[L, y], ...jag, [Rr, y]])
  const shade = K.poly([[x + w * 0.18, y], [x + tw * 0.18, top + h * 0.06], [x + tw / 2, jag[4][1]], [Rr, y]])
  let hatch = ''
  for (let i = 1; i <= 3; i++) {
    const t = i / 4
    hatch += K.line([[x + w * 0.18 + (Rr - x - w * 0.18) * t, y - h * 0.05], [x + tw * 0.18 + (x + tw / 2 - x - tw * 0.18) * t, jag[4][1] + h * 0.05]])
  }
  const win = K.poly([[x - w * 0.06, top + h * 0.3], [x + w * 0.06, top + h * 0.3], [x + w * 0.06, top + h * 0.3 + w * 0.4], [x - w * 0.06, top + h * 0.3 + w * 0.4]])
  return [P('fill', body), P('shade', shade), P('hatch', hatch), P('dark', win), P('ink-bold', body)]
}

/** 지붕 없이 열린 둥근 방 — 높은 발코니가 둘린 시험장 (Hunger: 'high balconies', 'open roof') */
function openDrum(x, y, w, h) {
  const rx = w / 2
  const ry = w * 0.16
  const top = y - h
  const body = `M${pt([x - rx, top])}V${r1(y)}A${r1(rx)} ${r1(ry)} 0 0 0 ${pt([x + rx, y])}V${r1(top)}Z`
  const rim = `M${pt([x - rx, top])}A${r1(rx)} ${r1(ry)} 0 1 1 ${pt([x + rx, top])}A${r1(rx)} ${r1(ry)} 0 1 1 ${pt([x - rx, top])}Z`
  const hole = `M${pt([x - rx * 0.78, top + 0.6])}A${r1(rx * 0.78)} ${r1(ry * 0.72)} 0 1 1 ${pt([x + rx * 0.78, top + 0.6])}A${r1(rx * 0.78)} ${r1(ry * 0.72)} 0 1 1 ${pt([x - rx * 0.78, top + 0.6])}Z`
  let hatch = ''
  for (let i = 1; i <= 3; i++) hatch += K.line([[x + rx * (0.25 + i * 0.2), top + ry * 0.9], [x + rx * (0.25 + i * 0.2), y + ry * 0.5]])
  let balc = ''
  for (let i = -3; i <= 3; i++) balc += K.line([[x + i * rx * 0.26, top + ry + h * 0.32], [x + i * rx * 0.26, top + ry + h * 0.55]])
  return [P('stone', body), P('hatch', hatch + balc), P('fill', rim), P('dark', hole), P('ink', body + rim)]
}

{
  // 땅에 진 엷은 그림자 — 가는 빗금 몇 줄
  // (표시 이름표가 그 위에 앉으므로 패널이 열려 지도가 작아진 때의 이름표 밑단 y≈425 보다 아래에서 시작한다)
  parts.push(P('hatch', [[426.5, 30], [429.5, 42], [432.5, 30]].map(([y, hw]) => K.line([[866 - hw, y], [866 + hw, y]])).join('')))

  const deckC = [883, 305]
  const deckRx = 95
  const deckRy = 10
  const tilt = (-4 * Math.PI) / 180
  const deckPt = (a) => {
    const x = Math.cos(a) * deckRx
    const y = Math.sin(a) * deckRy
    return [deckC[0] + x * Math.cos(tilt) - y * Math.sin(tilt), deckC[1] + x * Math.sin(tilt) + y * Math.cos(tilt)]
  }
  const front = []
  const back = []
  for (let k = 0; k <= 24; k++) {
    front.push(deckPt(Math.PI - (k / 24) * Math.PI)) // 왼쪽 끝 → 앞 → 오른쪽 끝
    back.push(deckPt(Math.PI + (k / 24) * Math.PI)) // 왼쪽 끝 → 뒤 → 오른쪽 끝
  }
  const left = front[0]
  const right = front[front.length - 1]
  // 깨진 밑면 — 왼쪽 끝에서 용골을 지나 오른쪽 끝으로. 표시 [900,380] 은 밑면 오른쪽 아래 끝에 걸린다.
  // 가장 깊은 뾰족 끝은 왼쪽(x≈841)에 두고 표시 밑(x 845–955, y>388)은 비운다 — 표시 이름표가 표시 밑, 절벽 위 빈 곳에 앉도록
  const under = [
    left, [791, 320], [796, 327], [803, 333], [809, 332], [815, 340], [823, 346], [829, 355], [833, 364], [837, 380],
    [841, 398], [846, 388], [851, 391], [857, 384], [866, 387], [872, 381], [881, 383], [888, 378], [895, 381], [903, 376],
    [908, 371], [911, 364], [915, 358], [919, 354], [925, 349], [934, 341], [943, 334], [952, 326], [961, 316], [970, 307], right,
  ]
  const band = front.map(([x, y], k) => [x, y + 9 * Math.pow(Math.sin((k / 24) * Math.PI), 0.45)])
  const shell = K.poly([...front, ...[...under].reverse()])
  // 밑면의 엷은 줄무늬 (pale striations) 와 오른쪽 그늘 빗금
  // 밑면 선의 높이 (x 에서 보간) — 줄무늬가 밑면 밖으로 새지 않게
  const underAt = (x) => {
    for (let i = 0; i < under.length - 1; i++) {
      const [ax, ay] = under[i]
      const [bx, by] = under[i + 1]
      if (x >= ax && x <= bx) return ay + ((by - ay) * (x - ax)) / (bx - ax || 1)
    }
    return x < under[0][0] ? under[0][1] : under[under.length - 1][1]
  }
  let striae = ''
  for (const f of [0.28, 0.5, 0.7]) {
    let run = []
    for (let k = 3; k <= 22; k++) {
      const [bx, by] = band[k]
      const gap = underAt(bx) - by
      if (gap > 7) run.push([bx, by + gap * f])
      else {
        if (run.length > 2) striae += K.smooth(run)
        run = []
      }
    }
    if (run.length > 2) striae += K.smooth(run)
  }
  for (let k = 0; k < 9; k++) {
    const x = 904 + k * 7.6
    const yTop = band[Math.min(24, Math.round(((x - left[0]) / (right[0] - left[0])) * 24))][1] + 2
    const yBot = underAt(x) - 3
    if (yBot - yTop > 5) striae += K.line([[x, yTop], [x - 1.2, yBot]])
  }
  let joints = ''
  for (let k = 2; k < 24; k += 2) {
    const [x, y] = front[k]
    const [, yb] = band[k]
    if (yb - y > 3) joints += K.line([[x, y + 1], [x, yb - 0.5]])
  }
  // 흑요석 — 깨진 밑면에 박히고 매달린 검은·붉은 조각 (Hunger: 'jagged red obsidian')
  const shard = (x, y, s, lean) => K.poly([[x - s * 0.2, y - 1], [x + s * 0.22, y - 1.5], [x + lean + s * 0.05, y + s], [x - s * 0.1, y + s * 0.5]])
  const darkShards = shard(857, 371, 9, 1) + shard(829, 352, 7, -1) + shard(918, 352, 6, 1.5) + shard(878, 352, 6, 0) + shard(952, 323, 6, 1)
  const redShards = shard(840, 385, 9, -1.2) + shard(846, 360, 6, 1) + shard(897, 366, 5, 0.5)
  const deck = K.poly([...front, ...[...back].reverse()])
  parts.push(
    P('stone', shell),
    P('hatch', striae),
    P('fill', K.poly([...front, ...[...band].reverse()])),
    P('hatch', joints),
    P('dark', darkShards),
    P('blood', redShards),
    P('ink', darkShards + redShards),
    P('fill', deck),
    P('ink', K.smooth(back) + K.smooth(front) + K.smooth(band.slice(2, 23))),
  )

  // 윗면의 폐허 — 두꺼운 벽의 방, 부서진 탑, 열린 시험장, 남서쪽 끝의 문
  const onDeck = (x) => {
    const k = Math.max(0, Math.min(24, Math.round(((x - left[0]) / (right[0] - left[0])) * 24)))
    return (front[k][1] + back[k][1]) / 2
  }
  const build = []
  build.push({ y: 0, parts: K.wall([[828, onDeck(828) - 5.5], [866, onDeck(866) - 8], [912, onDeck(912) - 8.5], [958, onDeck(958) - 6.5]], 8) })
  build.push({ y: 1, parts: brokenTower(874, onDeck(874) - 2, 15, 48, 'sky-tower') })
  build.push({ y: 2, parts: K.house(842, onDeck(842) + 1.5, 30, 16, { roof: 'flat', door: false }) })
  build.push({ y: 2, parts: openDrum(914, onDeck(914) + 2, 32, 14) })
  build.push({ y: 3, parts: K.ruin(952, onDeck(952) + 1.5, 20, 14, 'sky-ruin') })
  build.push({ y: 3, parts: K.house(969, onDeck(969) + 1, 11, 8, { roof: 'flat', door: false }) })
  // 문 — 낮은 두 탑 사이 어두운 아치 (Hunger: 'the gates of the Skyclave')
  const gy = onDeck(GATE[0]) + 2.5
  build.push({ y: 4, parts: K.tower(GATE[0] - 9, gy, 9, 22, { top: 'flat', windows: false }) })
  build.push({ y: 4, parts: K.tower(GATE[0] + 9, gy, 9, 26, { top: 'crenel', windows: false }) })
  build.push({
    y: 5,
    parts: [
      P('stone', K.poly([[GATE[0] - 5, gy], [GATE[0] - 5, gy - 15], [GATE[0] + 5, gy - 15], [GATE[0] + 5, gy]])),
      P('dark', `M${pt([GATE[0] - 3, gy])}V${r1(gy - 8)}A3 3 0 0 1 ${pt([GATE[0] + 3, gy - 8])}V${r1(gy)}Z`),
      P('ink', K.poly([[GATE[0] - 5, gy], [GATE[0] - 5, gy - 15], [GATE[0] + 5, gy - 15], [GATE[0] + 5, gy]])),
    ],
  })
  parts.push(...K.stack(build))
  parts.push(P('ink-bold', K.line(under)))
  // 마지막 발판에서 문루 왼쪽 탑 밑까지 걸린 밧줄 (Hunger: 'already cabled') — 매달린 줄이 아니라 문에 묶인 줄로 보이게 문루에 닿는다
  {
    const a = [LAST_STEP[0] + LAST_STEP[2] * 0.42, LAST_STEP[1] - 0.5]
    const b = [GATE[0] - 12, gy - 0.8]
    parts.push(P('ink', `M${pt(a)}Q${pt([(a[0] + b[0]) / 2 + 2.5, (a[1] + b[1]) / 2 + 2])} ${pt(b)}`))
  }

  // 흩어져 떠도는 조각들 (Things Have Changed: 'shattered fragments … drifting slowly')
  parts.push(...floatRock(762, 279, 32, 'frag-1', { depth: 0.5 }), ...K.ruin(758, 278, 12, 9, 'frag-1-ruin'))
  // 조각마다 쌓은 돌(폐허)이 남아 있어야 헤드론·떠도는 바위가 아니라 하늘거주지 조각으로 읽힌다
  parts.push(...floatRock(1004, 256, 28, 'frag-2', { depth: 0.5 }), ...K.ruin(1000, 256.6, 10, 8, 'frag-2-ruin'))
  parts.push(...floatBoulder(1006, 338, 18, 'frag-3', { h: 0.7, tilt: -2 }), ...brokenTower(1004, 338.6, 5.5, 11, 'frag-3-col'))
}

CHILDMAPS.push({
  id: 'jwar-isle',
  size: [1360, 940],
  glyphScale: 4,
  terrain: [],
  parts,
  labels: [
    { text: 'Jwar Isle', textKo: '좌르 섬', at: [452, 300], size: 36, kind: 'area' },
    { text: 'Silundi Sea', textKo: '실룬디의 바다', at: [1130, 800], size: 30, kind: 'water' },
    { text: 'Strand of Jwar', at: [694, 374], size: 20, kind: 'place' },
  ],
  subjects: {
    'mindbreak-trap': { at: [600, 420], size: 84 },
  },
  // 하늘거주지 이름표는 표시 밑(조각 밑과 절벽 위 사이 빈 곳)에 — 오른쪽에 두면 휴대폰 첫 보기에서 덫 이름과 함께 화면에 들지 않는다
  markAnchors: { 'ondu-skyclave': 'below' },
  // 휴대폰 첫 보기 — 덫과 하늘거주지가 함께 들도록 둘 사이를 가운데에
  focus: [770, 420],
})
