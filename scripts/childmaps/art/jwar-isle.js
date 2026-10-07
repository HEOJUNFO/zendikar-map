// 좌르 섬(Jwar Isle) — 온두 본토 남쪽 해안 가까이의 작은 섬. 자식 지도 1360×940 (세계 [160,1425]–[228,1472] × 20).
// Zendikar Rising(2020) 이후의 모습: 다시 떠올라 열린 온두 하늘거주지 조각(Things Have Changed; Hunger),
// 그 남서쪽의 돌 절벽과 밧줄 걸린 바위 발판(Hunger), 섬 곳곳과 둘레의 파둔(PG: Ondu; Art of Magic; Hunger),
// 섬 중앙 바닷물 구덩이와 희미한 Strand(PG: Ondu; Hunger), 섬을 에워싼 소용돌이 해류와 바다뱀(PG: Ondu; Art of Magic),
// 상륙 해변의 모래와 풀(Hunger). 각 지형지물의 자리·모양·크기는 공식 서술에 기댄 이 지도의 해석이다.
// 산·숲·언덕 기호는 없다 — 공식 서술에 없는 지형이다 (세계 지도의 산 기호는 주인 대륙이 없는 땅의 기본값).

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
for (let j = 0; j < NY; j++)
  for (let i = 0; i < NX; i++) {
    const x = GX0 + i * CELL
    const y = GY0 + j * CELL
    FIELD[j * NX + i] = (onLand(x, y) ? -1 : 1) * coastDist(x, y)
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
  for (let k = 1; k <= 16; k++) {
    const t = k / 16
    const a = a0 + sgn * t * Math.PI * 1.6
    const rr = R * (1 - 0.62 * t)
    out.push([c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr])
  }
  return out
}

function swirlRing(level, o) {
  const r = K.rng(`ring-${level}`)
  let d = ''
  for (const c of contour(level)) {
    const pts = resample(chaikin(c.pts, c.closed, 2), 4, c.closed)
    let i = Math.floor(r() * 12)
    while (i < pts.length - 3) {
      const n = Math.round((o.dash[0] + r() * (o.dash[1] - o.dash[0])) / 4)
      const seg = pts.slice(i, Math.min(pts.length, i + n))
      if (seg.length > 3) {
        const path = r() < o.curl ? [...seg, ...curlFrom(seg, r() < 0.5 ? 1 : -1, o.curlR * (0.75 + r() * 0.5))] : seg
        d += K.smooth(path)
      }
      i += n + Math.round((o.gap[0] + r() * (o.gap[1] - o.gap[0])) / 4)
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

function serpent(x, y, L, dir, seed) {
  const r = K.rng(seed)
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
  inks.push(K.smooth(TT(neck.left)) + K.smooth(TT(neck.right)))
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
  fills.push(K.poly(TT(frill)), K.poly(TT(head)))
  inks.push(K.line(TT(frill)), K.line(TT(head)))
  const darks = [K.poly(TT(mouth)), K.poly(TT(eye))]
  hatch.push(K.line(TT([[1.2, 0.35], [0.4, 0.45]].map(HF))) + K.line(TT([[1.6, 0.55], [0.8, 0.62]].map(HF))))
  // 꼬리 — 물에서 솟아 뒤로 굽은 꼬리와 갈라진 지느러미
  const tl = tube([-0.4 * L, 0], [-0.41 * L, -0.06 * L], [-0.44 * L, -0.09 * L], [-0.48 * L, -0.1 * L], t * 0.9, t * 0.4, 10)
  fills.push(K.poly(TT([...tl.left, ...[...tl.right].reverse()])))
  inks.push(K.smooth(TT(tl.left)) + K.smooth(TT(tl.right)))
  const te = [-0.48 * L, -0.1 * L]
  const fin = [te, [te[0] - 0.05 * L, te[1] - 0.075 * L], [te[0] - 0.035 * L, te[1] - 0.01 * L], [te[0] - 0.075 * L, te[1] + 0.035 * L], [te[0] + 0.005 * L, te[1] + 0.012 * L]]
  fills.push(K.poly(TT(fin)))
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
  void r
  return [P('fill', fills.join('')), P('hatch', hatch.join('')), P('dark', darks.join('')), P('ink', inks.join('')), P('sea-ink', water.join(''))]
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

// 얼굴 (머리 높이 1, 턱 밑 (0,0), 정수리 (0,-1))
const FRONT = (() => {
  const half = [[0, -1], [0.09, -0.99], [0.155, -0.95], [0.195, -0.87], [0.205, -0.77], [0.195, -0.69], [0.21, -0.6], [0.205, -0.49], [0.185, -0.36], [0.155, -0.22], [0.12, -0.1], [0.085, 0.02]]
  return [...half, ...half.slice(1, -1).reverse().map(([x, y]) => [-x, y]), [-0.085, 0.02]].reverse()
})()
const PROFILE = [
  [-0.17, 0.02], [-0.19, -0.2], [-0.2, -0.45], [-0.19, -0.68], [-0.15, -0.86], [-0.08, -0.96], [0.02, -1], [0.1, -0.975], [0.15, -0.89],
  [0.165, -0.79], [0.2, -0.715], [0.172, -0.665], [0.182, -0.62], [0.214, -0.53], [0.248, -0.45], [0.2, -0.425], [0.206, -0.385],
  [0.19, -0.35], [0.1, -0.29], [0.18, -0.225], [0.2, -0.2], [0.19, -0.12], [0.15, -0.04], [0.12, 0.02],
]

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
    addPoly(ell(-0.085, -0.625, 0.05, 0.02, 10), darks)
    addPoly(ell(0.085, -0.625, 0.05, 0.02, 10), darks)
    addPoly(ell(0, -0.29, 0.085, 0.095, 14), darks)
    if (o.glow) addPoly(ell(0, -0.275, 0.042, 0.05, 12), glow)
    for (const run of clipLineAbove([[-0.17, -0.672], [0, -0.705], [0.17, -0.672]].map(T), gy)) brow += K.smooth(run)
    for (const run of clipLineAbove([[0, -0.66], [0.04, -0.47], [-0.03, -0.455]].map(T), gy)) brow += K.line(run)
    addLine([[0.13, -0.86], [0.145, -0.73]])
    addLine([[0.16, -0.56], [0.15, -0.4]])
    addLine([[0.12, -0.2], [0.105, -0.08]])
    addLine([[0.055, -0.43], [0.06, -0.38]])
  } else {
    addPoly([[0.206, -0.385], [0.1, -0.29], [0.2, -0.2]], darks)
    if (o.glow) addPoly([[0.19, -0.35], [0.125, -0.29], [0.185, -0.235]], glow)
    addPoly(ell(0.115, -0.635, 0.032, 0.018, 8), darks)
    for (const run of clipLineAbove([[-0.03, -0.62], [-0.07, -0.56], [-0.06, -0.48], [-0.03, -0.46]].map(T), gy)) brow += K.smooth(run)
    addLine([[0.12, -0.52], [0.13, -0.43]])
    addLine([[0.08, -0.25], [0.12, -0.14]])
    addLine([[-0.1, -0.85], [-0.14, -0.72]])
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
    const m = h * 0.2
    parts.push(P('ink', K.smooth([[xl - m, gy + 0.8], [xl - m * 0.35, gy - 0.6], [(xl + xr) / 2, gy - 0.9], [xr + m * 0.35, gy - 0.6], [xr + m, gy + 0.8]])))
    parts.push(P('hatch', K.line([[xr + m * 0.15, gy + 2], [xr + m * 0.75, gy + 2.6]]) + K.line([[xl + (xr - xl) * 0.3, gy + 3.2], [xr + m * 0.4, gy + 3.8]])))
  }
  return { y: gy, parts }
}

// ── 지형지물 자리 (이 지도의 해석) ────────────────────────────────────────────────────────────
const PIT = [706, 472]
const BEAM_TOP = 386
const CLIFF = [[766, 458], [790, 451], [818, 448], [846, 449], [872, 446], [894, 442], [912, 438]]
// 바위 발판 — 절벽 위에서 하늘거주지 문까지 위·북동쪽으로 (Hunger: 'up and northeast')
const STEPS = [[782, 430, 17], [787, 404, 16], [792, 378, 15], [797, 352, 14]]
const GATE = [804, 318]

// 파둔 — [x, y, 높이, 보는 쪽, 기울기, 묻힌 정도, 물, 빛]
const HEADS = [
  // Faduun 표시 둘레 (서쪽 꼬리)
  [432, 464, 26, 'front', -12, 0.3, 0, 1],
  [404, 488, 22, 'right', 14, 0.35],
  [452, 497, 24, 'left', -20, 0.4],
  [490, 488, 20, 'front', 9, 0.28],
  [372, 510, 20, 'left', -28, 0.45],
  [420, 518, 18, 'front', 22, 0.3],
  [438, 437, 18, 'right', -8, 0.3],
  // 꼬리 남쪽·서쪽 해안 모래
  [346, 527, 20, 'right', -18, 0.45],
  [472, 526, 22, 'left', 24, 0.5],
  [520, 529, 18, 'front', -30, 0.5],
  [316, 488, 22, 'left', -10, 0.35],
  [289, 448, 18, 'left', 12, 0.42, 1],
  // 꼬리 북쪽 해안
  [492, 392, 20, 'right', 20, 0.4],
  [452, 404, 16, 'left', -15, 0.4, 1],
  [536, 369, 18, 'front', -10, 0.3],
  // 함정 곁
  [548, 404, 22, 'right', -15, 0.35],
  [664, 406, 20, 'left', 18, 0.3],
  [612, 502, 22, 'front', -6, 0.3, 0, 1],
  // 본섬 북쪽 해안
  [592, 363, 18, 'left', -22, 0.4],
  [742, 289, 18, 'front', 8, 0.42, 1],
  // 남동쪽 곶
  [990, 474, 18, 'right', -12, 0.4],
  [1012, 520, 20, 'right', 20, 0.45],
  [1044, 500, 16, 'right', -10, 0.42, 1],
  [960, 532, 18, 'front', 6, 0.3],
  // 남쪽 해안
  [652, 577, 20, 'right', -14, 0.4],
  [700, 641, 16, 'front', 10, 0.42, 1],
  [872, 623, 20, 'right', 16, 0.35],
  [903, 581, 18, 'front', -20, 0.4],
  // 상륙 해변 — 모래와 풀에서 솟아 바다를 보는 두 얼굴 (Hunger)
  [752, 651, 34, 'front', -4, 0.24, 0, 1],
  [806, 653, 32, 'front', 5, 0.24, 0, 1],
  // 안쪽
  [548, 514, 20, 'left', 12, 0.3],
  [776, 570, 22, 'right', -10, 0.35],
  [850, 562, 18, 'front', 25, 0.45],
  [640, 544, 18, 'right', 8, 0.35],
]

// ── 그리기 ──────────────────────────────────────────────────────────────────────────────
const parts = []

// 바다: 섬을 두른 소용돌이 해류 (세계 지도의 해안 물결선을 이 축척으로)
parts.push(
  P(
    'sea-ink',
    swirlRing(30, { dash: [90, 210], gap: [14, 30], curl: 0.35, curlR: 9 }) +
      swirlRing(74, { dash: [80, 190], gap: [18, 40], curl: 0.45, curlR: 12 }) +
      swirlRing(128, { dash: [60, 150], gap: [26, 60], curl: 0.5, curlR: 14 }) +
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
    const pts = resample(chaikin(c.pts, c.closed, 2), 3, c.closed)
    let i = Math.floor(r() * 10)
    while (i < pts.length - 3) {
      const n = Math.round((14 + r() * 26) / 3)
      d += K.smooth(pts.slice(i, i + n))
      i += n + Math.round((26 + r() * 60) / 3)
    }
  }
  parts.push(P('sea-ink', d))
}

// 바다뱀 — 섬을 에워싼 영역을 지키는 바다뱀
parts.push(...serpent(170, 600, 128, 1, 'serpent-w'))
parts.push(...serpent(1212, 425, 136, -1, 'serpent-e'))
parts.push(...serpent(840, 800, 120, -1, 'serpent-s'))

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
  for (const [gx, gy, s] of [[716, 622, 7], [734, 636, 6], [778, 640, 7], [834, 634, 6], [852, 618, 7], [790, 626, 5], [722, 606, 5], [866, 600, 6]]) {
    for (let k = -2; k <= 2; k++) {
      const lean = k * 0.32 + (r() - 0.5) * 0.2
      grass += K.line([[gx + k * 1.6, gy], [gx + k * 1.6 + lean * s, gy - s * (0.75 + r() * 0.35) * (1 - Math.abs(k) * 0.15)]])
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
    const bot = py + 4 - 9.5 * Math.sqrt(Math.max(0, 1 - ((k * 4 - 1) ** 2) / 21 ** 2)) - 0.5
    if (bot - top > 2) wall += K.line([[x, top + 0.5], [x + 0.4, bot]])
  }
  // 빛줄기 — 위로 갈수록 끊겨 희미해지는 두 가는 선과 엷은 물빛
  let beam = ''
  for (const side of [-1, 1]) {
    let y = py - 2
    let dash = 30
    let gap = 3
    const x = px + side * 3.6
    while (y > BEAM_TOP) {
      const y1 = Math.max(BEAM_TOP, y - dash)
      beam += K.line([[x - side * ((py - y) / (py - BEAM_TOP)) * 1.6, y], [x - side * ((py - y1) / (py - BEAM_TOP)) * 1.6, y1]])
      y = y1 - gap
      dash = Math.max(3, dash * 0.62)
      gap = Math.min(10, gap * 1.35)
    }
  }
  parts.push(
    P('shade', K.smooth(rim, true)),
    P('hatch', wall),
    P('fill', K.smooth(water, true)),
    P('sea', K.smooth(water, true)),
    P('sea', K.poly([[px - 4.2, py - 1], [px + 4.2, py - 1], [px + 1.2, BEAM_TOP + 30], [px - 1.2, BEAM_TOP + 30]])),
    P('sea-ink', K.smooth(water, true) + `M${pt([px - 12, py + 4])}q4 -1.6 8 0M${pt([px + 4, py + 7])}q4 -1.6 8 0` + beam),
    P('ink', K.smooth(rim, true)),
  )
}

// 돌 절벽 — 남쪽(해변 쪽)으로 바위 면, 동쪽 끝은 만의 해안에 닿는다 (Hunger: 'the stone cliffs')
parts.push(...K.cliff(CLIFF, { depth: 30, step: 6, side: 1, mode: 'face', seed: 'jwar-cliff' }))

// 파둔 — 뒤(위)에서 앞(아래)으로
parts.push(...K.stack(HEADS.map(([x, y, h, view, rot, sink, water, glow]) => faduun({ at: [x, y], h, view, rot, sink, water: !!water, glow: !!glow }))))

// ── 떠 있는 돌 — 평평한 윗면과 깨진 밑면. 바위 발판과 하늘거주지 조각에 ────────────────────────────
function slab(cx, cy, w, h, seed, o = {}) {
  const r = K.rng(seed)
  const ry = w * 0.12
  const top = ell(cx, cy, w / 2, ry, 16)
  const under = [[cx - w / 2, cy]]
  const n = Math.max(5, Math.round(w / 4))
  for (let k = 1; k < n; k++) {
    const s = k / n
    const depth = h * Math.pow(Math.sin(Math.PI * s), 0.7) * (k % 2 ? 1 : 0.72 + r() * 0.2)
    under.push([cx - w / 2 + w * s + (r() - 0.5) * 1.2, cy + depth])
  }
  under.push([cx + w / 2, cy])
  const body = K.poly(under)
  let hatch = ''
  for (let k = 1; k <= 2; k++) {
    const yy = cy + (h * k) / 3.2
    hatch += K.line([[cx - w * (0.32 - k * 0.08), yy], [cx + w * (0.34 - k * 0.07), yy + 0.8]])
  }
  for (let k = 0; k < 3; k++) {
    const x = cx + w * (0.14 + k * 0.1)
    hatch += K.line([[x, cy + 2], [x - 0.6, cy + h * (0.62 - k * 0.15)]])
  }
  const parts = [P(o.fillCls ?? 'stone', body), P('hatch', hatch), P('fill', K.smooth(top, true)), P('ink-bold', body), P('ink', K.smooth(top, true))]
  return parts
}

// 밧줄 걸린 바위 발판 (Hunger: 'raised rocks … nearest together and already cabled')
{
  const items = []
  for (const [i, [x, y, w]] of STEPS.entries()) items.push({ y: y + 100, parts: slab(x, y, w, w * 0.62, `step-${i}`) })
  // 밧줄 — 절벽 가장자리에서 발판을 거쳐 문까지
  const anchors = [[778, 451], ...STEPS.map(([x, y]) => [x, y - 1]), GATE]
  let cable = ''
  for (let i = 0; i < anchors.length - 1; i++) {
    const [ax, ay] = anchors[i]
    const [bx, by] = anchors[i + 1]
    const a = [ax + (i ? STEPS[i - 1][2] * 0.38 : 0), ay]
    const b = [bx - (i < STEPS.length ? STEPS[i][2] * 0.38 : 4), by]
    cable += `M${pt(a)}Q${pt([(a[0] + b[0]) / 2 + 3, (a[1] + b[1]) / 2 + 2.5])} ${pt(b)}`
  }
  parts.push(...K.stack(items), P('ink', cable))
}

// ── 온두 하늘거주지 — 다시 떠올라 열린 반구 모양 돌 조각 (Hunger: 'Semicircular stone … hovering') ──────────────
{
  // 땅에 진 엷은 그림자
  parts.push(P('shade', `M${pt([818, 426])}A48 7.5 0 1 0 ${pt([914, 426])}A48 7.5 0 1 0 ${pt([818, 426])}Z`))
  parts.push(P('hatch', K.line([[830, 425], [902, 425]]) + K.line([[842, 429.5], [890, 429.5]])))

  const deckC = [873, 306]
  const deckRx = 84
  const deckRy = 9
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
  // 깨진 밑면 — 왼쪽 끝에서 용골을 지나 오른쪽 끝으로. 표시 [900,380] 은 오른쪽 아래 비탈 안에
  const under = [
    left, [792, 322], [796, 333], [802, 341], [806, 349], [812, 346], [818, 355], [825, 360], [829, 369], [835, 364], [842, 370],
    [850, 376], [855, 385], [861, 379], [868, 385], [874, 391], [879, 400], [885, 391], [891, 393], [896, 387], [902, 389],
    [905, 380], [907, 371], [912, 362], [917, 353], [925, 346], [931, 337], [939, 328], [945, 318], [951, 308], right,
  ]
  // 테 — 앞 가장자리 아래 다듬은 돌 띠
  const band = front.map(([x, y], k) => [x, y + 9 * Math.pow(Math.sin((k / 24) * Math.PI), 0.45)])
  const shell = K.poly([...front, ...[...under].reverse()])
  // 밑면의 엷은 줄무늬 (pale striations) 와 오른쪽 그늘
  let striae = ''
  for (const f of [0.3, 0.52, 0.72]) {
    const pts = []
    for (let k = 3; k <= 21; k++) {
      const [bx, by] = band[k]
      const s = k / 24
      const depth = (under.length - 1) * s
      const u = under[Math.round(depth)]
      pts.push([bx, by + (u[1] - by) * f])
    }
    striae += K.smooth(pts)
  }
  for (let k = 0; k < 7; k++) {
    const x = 902 + k * 7
    const yTop = 318 - k * 1.2
    const yBot = Math.min(384 - k * 9, 372 - k * 6)
    if (yBot - yTop > 6) striae += K.line([[x, yTop + 4], [x - 1.5, yBot - 2]])
  }
  let joints = ''
  for (let k = 2; k < 24; k += 2) {
    const [x, y] = front[k]
    const [, yb] = band[k]
    if (yb - y > 3) joints += K.line([[x, y + 1], [x, yb - 0.5]])
  }
  // 흑요석 — 검은 조각과 붉은 조각 몇 개 (Hunger: 'jagged red obsidian')
  const shard = (x, y, s, rot) => {
    const c = Math.cos((rot * Math.PI) / 180)
    const sn = Math.sin((rot * Math.PI) / 180)
    return K.poly([[0, -s * 0.5], [s * 0.28, 0], [0.4, s * 0.62], [-s * 0.22, 0.2]].map(([u, v]) => [x + u * c - v * sn, y + u * sn + v * c]))
  }
  const darkShards = shard(846, 360, 9, 12) + shard(914, 346, 8, -15) + shard(812, 337, 7, 20)
  const redShards = shard(879, 380, 10, -6) + shard(830, 352, 6, 25)

  const deck = K.poly([...front, ...[...back].reverse()])
  parts.push(
    P('stone', shell),
    P('shade', K.poly([[905, 380], [907, 371], [912, 362], [917, 353], [925, 346], [931, 337], [939, 328], [945, 318], [951, 308], right, [915, 312], [906, 330], [902, 352]])),
    P('hatch', striae),
    P('fill', K.poly([...front, ...[...band].reverse()])),
    P('hatch', joints),
    P('dark', darkShards),
    P('blood', redShards),
    P('ink', darkShards + redShards),
    P('fill', deck),
  )

  // 윗면의 폐허 — 두꺼운 벽의 방, 부서진 탑, 남서쪽 끝의 문
  const onDeck = (x) => {
    const k = Math.max(0, Math.min(24, Math.round(((x - left[0]) / (right[0] - left[0])) * 24)))
    return (front[k][1] + back[k][1]) / 2
  }
  const build = []
  build.push({ y: onDeck(884) - 6, parts: K.wall([[826, onDeck(826) - 5], [858, onDeck(858) - 7], [892, onDeck(892) - 7.5], [930, onDeck(930) - 6]], 8) })
  build.push({ y: onDeck(872) - 2, parts: K.ruin(872, onDeck(872) - 2, 13, 40, 'sky-tower') })
  build.push({ y: onDeck(850) + 1, parts: K.house(850, onDeck(850) + 1, 26, 15, { roof: 'flat', door: false }) })
  build.push({ y: onDeck(902) + 1, parts: K.ruin(902, onDeck(902) + 1, 24, 18, 'sky-hall') })
  build.push({ y: onDeck(934) + 1, parts: K.house(934, onDeck(934) + 1, 15, 10, { roof: 'flat', door: false }) })
  // 문 — 낮은 두 탑 사이 어두운 아치 (Hunger: 'the gates of the Skyclave')
  const gy = onDeck(GATE[0]) + 2
  build.push({ y: gy, parts: K.tower(GATE[0] - 9, gy, 8, 21, { top: 'flat', windows: false }) })
  build.push({ y: gy, parts: K.tower(GATE[0] + 9, gy, 8, 24, { top: 'crenel', windows: false }) })
  build.push({
    y: gy + 0.5,
    parts: [
      P('stone', K.poly([[GATE[0] - 5, gy], [GATE[0] - 5, gy - 15], [GATE[0] + 5, gy - 15], [GATE[0] + 5, gy]])),
      P('dark', `M${pt([GATE[0] - 3, gy])}V${r1(gy - 8)}A3 3 0 0 1 ${pt([GATE[0] + 3, gy - 8])}V${r1(gy)}Z`),
      P('ink', K.poly([[GATE[0] - 5, gy], [GATE[0] - 5, gy - 15], [GATE[0] + 5, gy - 15], [GATE[0] + 5, gy]])),
    ],
  })
  parts.push(...K.stack(build))
  parts.push(P('ink', K.smooth(front) + K.smooth(band.slice(2, 23))), P('ink-bold', K.line(under) + K.smooth(back)))

  // 흩어져 떠도는 조각들 (Things Have Changed: 'shattered fragments … drifting slowly')
  parts.push(...slab(764, 280, 30, 22, 'frag-1'), ...K.ruin(760, 279, 12, 9, 'frag-1-ruin'))
  parts.push(...slab(994, 262, 26, 18, 'frag-2'))
  parts.push(...slab(988, 334, 16, 12, 'frag-3'))
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
    { text: 'Strand of Jwar', at: [700, 374], size: 18, kind: 'place' },
  ],
  subjects: {
    'mindbreak-trap': { at: [600, 420], size: 84 },
  },
  markAnchors: {},
})
