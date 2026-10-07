// 마킨디 협곡 (Makindi Trenches) — 온두 본토를 가르는 높은 벽 협곡의 미로. 자식 지도 원본 (세계 x 240–380 · y 935–1035 ×10).
// 보는 법: 고원 윗면은 양피지, 협곡 바닥은 그늘(shade). 큰 협곡의 북쪽 벽(보는 쪽을 향한 면)만 지층 띠를 두른 벽으로 세우고,
// 나머지 갈래는 가장자리에서 협곡 안쪽으로 짧은 빗금 — 세계 지도의 협곡 기호(빗금 단 호)를 이 축척으로 푼 것.
// 근거(brief): 협곡의 미로·지층 벽·급류 또는 맨바위 바닥(PG: Ondu 2009, AoM 2016), 발굽에 다져진 바닥과 메사
// (ZNR Makindi Stampede // Makindi Mesas), 불안정한 봉우리(PG·AoM·ZEN 카드), 암벽 고블린 굴과 바위 틈 고블린(PG: Goblins, AoM),
// 코르의 매달린 임시 거처·닻줄·도르래(AoM), 벼랑 가장자리 마찻길(PG), 바람(PG), 떠도는 바위(AoM, ZNR 그림), 고모조아(Plane Shift),
// 닳아 자갈이 된 이름 없는 유적(AoM). 갈래의 모양과 이것들의 자리는 이 지도의 해석이다.

const K = KIT
const P = (cls, d) => ({ cls, d })
const r1 = (v) => Math.round(v * 10) / 10
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`
const lerp = (a, b, t) => a + (b - a) * t
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// ---------- 기하 도우미 ----------

/** 키 [[x, 값], …] 를 매끈하게 잇는 함수 */
function curve(keys) {
  const n = keys.length
  return (x) => {
    let i = 0
    while (i < n - 2 && x > keys[i + 1][0]) i++
    const k0 = keys[Math.max(0, i - 1)]
    const k1 = keys[i]
    const k2 = keys[i + 1]
    const k3 = keys[Math.min(n - 1, i + 2)]
    const d = k2[0] - k1[0]
    const t = clamp((x - k1[0]) / d, 0, 1)
    const m1 = ((k2[1] - k0[1]) / (k2[0] - k0[0] || 1)) * d
    const m2 = ((k3[1] - k1[1]) / (k3[0] - k1[0] || 1)) * d
    const t2 = t * t
    const t3 = t2 * t
    return (2 * t3 - 3 * t2 + 1) * k1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * k2[1] + (t3 - t2) * m2
  }
}

/** 1차원 값 잡음 */
function wobble(seed, scale, amp) {
  const r = K.rng(seed)
  const v = Array.from({ length: 512 }, () => r() * 2 - 1)
  const at = (i) => v[((i % 512) + 512) % 512]
  return (s) => {
    const u = s / scale + 256
    const i = Math.floor(u)
    const f = u - i
    const e = f * f * (3 - 2 * f)
    return amp * (at(i) * (1 - e) + at(i + 1) * e)
  }
}
const jag = (seed, a1, a2) => {
  const w1 = wobble(`${seed}:a`, 64, a1)
  const w2 = wobble(`${seed}:b`, 11, a2)
  return (s) => w1(s) + w2(s)
}

/** 조절점을 지나는 촘촘한 꺾은선 (Catmull-Rom, 간격 step) */
function dense(ctrl, step = 5) {
  const out = []
  const n = ctrl.length
  for (let i = 0; i < n - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)]
    const p1 = ctrl[i]
    const p2 = ctrl[i + 1]
    const p3 = ctrl[Math.min(n - 1, i + 2)]
    const m = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step))
    for (let k = 0; k < m; k++) {
      const t = k / m
      const t2 = t * t
      const t3 = t2 * t
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)))
    }
  }
  out.push([...ctrl[n - 1]])
  return out
}

/** 꺾은선을 법선 방향으로 잡음만큼 흔든다 (들쭉날쭉한 가장자리) */
function jagged(pts, seed, a1 = 4, a2 = 1.4) {
  const w = jag(seed, a1, a2)
  let s = 0
  return pts.map((p, i) => {
    if (i) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1])
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(pts.length - 1, i + 1)]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const d = w(s)
    return [p[0] + ((b[1] - a[1]) / len) * d, p[1] - ((b[0] - a[0]) / len) * d]
  })
}

/** x 가 늘어나는 꺾은선에서 x 의 y */
function yAt(pts, x) {
  if (x <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    if (pts[i][0] >= x) {
      const [x0, y0] = pts[i - 1]
      const [x1, y1] = pts[i]
      return x1 === x0 ? y1 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
    }
  }
  return pts[pts.length - 1][1]
}
/** y 가 늘어나는 꺾은선에서 y 의 x */
const xAt = (pts, y) => yAt(pts.map(([a, b]) => [b, a]), y)

/** 꺾은선을 끊어진 토막들로 (지층선) */
function broken(pts, rand, onR = [5, 13], offR = [1, 3]) {
  let d = ''
  let i = Math.floor(rand() * 3)
  while (i < pts.length - 1) {
    const n = Math.round(lerp(onR[0], onR[1], rand()))
    const seg = pts.slice(i, Math.min(pts.length, i + n + 1))
    if (seg.length > 1) d += K.line(seg)
    i += n + Math.round(lerp(offR[0], offR[1], rand()))
  }
  return d
}

/** 조건(skip)에 걸리지 않는 점들의 이어진 토막 */
function runs(pts, skip) {
  const out = []
  let cur = []
  for (const p of pts) {
    if (skip && skip(p)) {
      if (cur.length > 1) out.push(cur)
      cur = []
    } else cur.push(p)
  }
  if (cur.length > 1) out.push(cur)
  return out
}

// ---------- 협곡 ----------

/** 협곡 하나 — 두 가장자리(같은 방향으로 진행, 들쭉날쭉). close·headA·headB: 바닥을 이웃 협곡 바닥까지 잇는 점들 */
function trench(id, aCtrl, bCtrl, o = {}) {
  const A = jagged(dense(aCtrl), `${id}:a`, o.jagA ?? o.jag ?? 3.4, o.jagA ? o.jagA * 0.4 : 1.3)
  const B = jagged(dense(bCtrl), `${id}:b`, o.jag ?? 3.4, 1.3)
  return { id, A, B, floor: P('shade', K.poly([...(o.headA ?? []), ...A, ...(o.close ?? []), ...[...B].reverse(), ...(o.headB ?? [])])) }
}

/** 가장자리 하나를 그린다 — 선과 바닥 쪽 빗금. 빗금 길이는 맞은편 가장자리까지 너비의 몫 (좁은 협곡은 깊은 틈처럼). skip: 갈래 입구 */
function rim(pts, other, seed, o = {}) {
  const mid = Math.floor(pts.length / 2)
  const a = pts[Math.max(0, mid - 2)]
  const b = pts[Math.min(pts.length - 1, mid + 2)]
  const om = other[Math.floor(other.length / 2)]
  const sgn = Math.sign((b[1] - a[1]) * (om[0] - pts[mid][0]) - (b[0] - a[0]) * (om[1] - pts[mid][1])) || 1
  const rand = K.rng(`${seed}:t`)
  const near = (x, y) => {
    let best = 1e9
    for (const q of other) best = Math.min(best, (q[0] - x) ** 2 + (q[1] - y) ** 2)
    return Math.sqrt(best)
  }
  let ticks = ''
  let ink = ''
  for (const run of runs(pts, o.skip)) {
    ink += K.line(run)
    for (const [[x, y], [ux, uy]] of K.along(run, o.step ?? 7.5)) {
      const wid = near(x, y)
      const l = clamp(wid * (o.share ?? 0.3), 5, o.max ?? 18) * (0.5 + rand() * 0.5)
      ticks += K.line([[x, y], [x + uy * sgn * l, y - ux * sgn * l]])
    }
  }
  return [P('hatch', ticks), P(o.bold ? 'ink-bold' : 'ink', ink)]
}

/**
 * 보는 쪽을 향한 벽 — 북쪽 가장자리 N(서→동)에서 h(x) 만큼 내려온 밝은 벽. 지층선(끊긴 가로줄) 밑마다 짧은 그늘 빗금(턱),
 * 가장자리 밑의 늘어진 빗금(도구의 벼랑 모양), 그늘진 밑동. 밑선은 긋지 않아 바닥으로 스며든다
 */
function wallFace(id, N, h, o = {}) {
  const rand = K.rng(`${id}:face`)
  const bands = o.bands ?? 4
  const fw = wobble(`${id}:fw`, 9, 1.2)
  const F = N.map(([x, y]) => [x, y + Math.max(0, h(x) + (h(x) > 3 ? fw(x) : 0))])
  const out = []
  const groups = runs(N.map((p, i) => [...p, i]), (p) => h(p[0]) < 1)
  for (const g of groups) {
    const idx = g.map((p) => p[2])
    const n = idx.map((i) => N[i])
    const f = idx.map((i) => F[i])
    const fr = [0]
    for (let b = 1; b < bands; b++) fr.push(b / bands + (rand() - 0.5) * (0.4 / bands))
    fr.push(1)
    const sw = wobble(`${id}:sw${idx[0]}`, 46, 0.03)
    const at = (i, t) => [n[i][0], n[i][1] + (f[i][1] - n[i][1]) * t]
    let hatch = ''
    for (let b = 1; b < bands; b++) {
      const line = n.map((p, i) => at(i, clamp(fr[b] + sw(p[0] + b * 977), 0.06, 0.94)))
      hatch += broken(line, rand, [6, 18], [1, 2])
      // 턱 밑 그늘 — 드문드문
      for (let i = 0; i < line.length; i++) {
        if (rand() < 0.78) continue
        const hi = f[i][1] - n[i][1]
        const l = Math.min(6, hi * (0.04 + rand() * 0.06))
        if (l > 1.2) hatch += K.line([[line[i][0], line[i][1] + 0.8], [line[i][0] - 0.3, line[i][1] + 0.8 + l]])
      }
    }
    // 그늘진 밑동 — 맨 아래 지층에 세로 빗금(한 점 걸러), 밑으로 갈수록 바닥에 스민다
    for (let i = 0; i < n.length; i += 2) {
      const [x, ya] = at(i, fr[bands - 1] + 0.08 + rand() * 0.1)
      const yb = f[i][1] + 1 - rand() * 3
      if (yb - ya > 2) hatch += K.line([[x, ya], [x - 0.4, yb]])
    }
    for (let i = 0; i < n.length; i += 3) hatch += K.line([n[i], [n[i][0], n[i][1] + (f[i][1] - n[i][1]) * (0.06 + rand() * 0.1)]])
    out.push(P('fill', K.poly([...n, ...[...f].reverse()])), P('hatch', hatch), P('ink-bold', K.line(n)))
  }
  return { parts: out, F }
}

// ---------- 지형지물 도우미 ----------

/** 불안정한 봉우리 — 굵게 시작해 가늘어지는 울퉁불퉁한 바위 줄기 위에 넓적한 바위가 기울게 얹혔다 (ZEN 카드·AoM). (x, y) 는 밑동 */
function teeter(x, y, h, capW, seed, tilt = 0, over = 0) {
  const rand = K.rng(seed)
  const capH = capW * 0.46
  const hs = h - capH * 0.75
  const b = capW * 0.3
  const t = capW * 0.1
  const j = () => (rand() - 0.5) * capW * 0.07
  const L = [[x - b, y], [x - b * 0.8 + j(), y - hs * 0.16], [x - b * 0.55 + j(), y - hs * 0.36], [x - t * 1.9 + j(), y - hs * 0.58], [x - t * 1.3 + j(), y - hs * 0.8], [x - t, y - hs]]
  const R = [[x + t, y - hs], [x + t * 1.5 + j(), y - hs * 0.78], [x + t * 2.1 + j(), y - hs * 0.55], [x + b * 0.62 + j(), y - hs * 0.34], [x + b * 0.86 + j(), y - hs * 0.14], [x + b * 1.1, y]]
  const stem = K.poly([...L, ...R])
  const stemShade = K.poly([[x + b * 0.2, y], [x + t * 0.2, y - hs], ...R])
  let hatch = ''
  for (let i = 1; i <= 4; i++) {
    const f = i / 5
    hatch += K.line([[lerp(x + b * 0.35, x + t * 0.4, f), y - hs * f], [lerp(x + b * 0.95, x + t * 1.3, f), y - hs * f + capW * 0.05]])
  }
  hatch += K.line([[x - b * 0.62, y - hs * 0.3], [x - b * 0.05, y - hs * 0.33]])
  // 바위 — 윗면은 평평하고 밑은 울퉁불퉁, 한쪽으로 쏠려 기운다
  const cx = x + over * capW
  const cy = y - hs - capH * 0.4
  const rot = ((tilt + (rand() - 0.5) * 6) * Math.PI) / 180
  const T = ([px, py]) => [cx + px * Math.cos(rot) - py * Math.sin(rot), cy + px * Math.sin(rot) + py * Math.cos(rot)]
  const hw = capW / 2
  const cp = [[-hw, -capH * 0.08], [-hw * 0.9, -capH * 0.45], [-hw * 0.35, -capH * 0.56], [hw * 0.3, -capH * 0.55], [hw * 0.88, -capH * 0.42], [hw * 1.02, -capH * 0.05], [hw * 0.84, capH * 0.3], [hw * 0.3, capH * 0.48], [-hw * 0.2, capH * 0.42], [-hw * 0.74, capH * 0.3]]
    .map(([px, py]) => [px + (rand() - 0.5) * capW * 0.06, py + (rand() - 0.5) * capH * 0.1])
    .map(T)
  const cap = K.smooth(cp, true)
  const capShade = K.smooth([[hw * 0.2, -capH * 0.05], [hw * 0.9, -capH * 0.3], [hw * 1.02, -capH * 0.05], [hw * 0.84, capH * 0.3], [hw * 0.3, capH * 0.48], [-hw * 0.2, capH * 0.42], [-hw * 0.5, capH * 0.25], [-hw * 0.1, capH * 0.12]].map(T), true)
  const capHatch =
    K.line([[-hw * 0.82, -capH * 0.12], [hw * 0.86, -capH * 0.16]].map(T)) +
    K.line([[hw * 0.5, -capH * 0.02], [hw * 0.42, capH * 0.36]].map(T)) +
    K.line([[hw * 0.7, -capH * 0.04], [hw * 0.62, capH * 0.3]].map(T)) +
    K.line([[hw * 0.3, 0], [hw * 0.22, capH * 0.38]].map(T))
  const ground = K.line([[x - b * 1.8, y + 0.4], [x + b * 2.1, y + 0.4]])
  return [P('fill', stem + cap), P('shade', stemShade + capShade), P('hatch', hatch + capHatch + ground), P('ink', stem), P('ink-bold', cap), ...K.rocks(x + b * 1.5, y, capW * 0.08, 2, `${seed}:r`)]
}

/**
 * 메사 — 옆에서 본 모습 (세계 지도의 산 기호처럼): 거의 평평한 윗면과 닳은 어깨, 지층 턱 두 곳에서 조금씩 물러나는 벼랑 옆선,
 * 벼랑을 가로지르는 지층선, 오른쪽 그늘, 그 밑의 오목한 너덜 비탈. (cx, by) 는 비탈 밑 가운데, w 는 벼랑 밑 너비, h 는 전체 높이
 * (ZNR Makindi Mesas 그림의 지층 띠를 두른 평평한 꼭대기 바위산)
 */
function butte(cx, by, w, h, seed) {
  const rand = K.rng(seed)
  const j = (a) => (rand() - 0.5) * a
  const top = by - h
  const cb = by - h * 0.3
  const ch = cb - top
  const half = w / 2
  const f1 = 0.36 + j(0.08)
  const f2 = 0.68 + j(0.08)
  // 벼랑 옆선 — 위에서 아래로. 어깨는 닳아 둥글고, 지층 턱(f1·f2)마다 조금 밖으로 물러난다
  const side = (dir) => {
    const x0 = cx + dir * (half - w * 0.12)
    const s1 = w * 0.04 + 1
    const s2 = w * 0.085 + 1.5
    return [
      [x0 - dir * 3.5, top + j(0.8)],
      [x0 - dir * 0.6, top + ch * 0.07],
      [x0 + dir * j(1.4), top + ch * 0.2],
      [x0 + dir * (0.4 + j(1.2)), top + ch * f1],
      [x0 + dir * s1, top + ch * (f1 + 0.035)],
      [x0 + dir * (s1 + j(1.4)), top + ch * (f1 + f2) / 2],
      [x0 + dir * (s1 + 0.6), top + ch * f2],
      [x0 + dir * s2, top + ch * (f2 + 0.035)],
      [cx + dir * half, cb],
    ]
  }
  const L = side(-1)
  const R = side(1)
  const topPts = []
  for (let k = 1; k < 8; k++) topPts.push([lerp(L[0][0], R[0][0], k / 8) + j(2), top + j(1.6) + (k === 5 ? 1.6 : 0)])
  const sil = [...[...L].reverse(), ...topPts, ...R]
  const cliffD = K.poly(sil)
  // 그늘 — 벼랑 오른쪽 3 분의 1 남짓, 경계는 들쭉날쭉
  const edge = []
  for (let k = 0; k <= 6; k++) edge.push([cx + w * (0.12 + k * 0.012) + j(4), lerp(top + 1, cb, k / 6)])
  const shadeD = K.poly([...edge, [R[R.length - 1][0], cb], ...[...R].reverse().slice(1, -1), ...topPts.filter((p) => p[0] > edge[0][0] + 2).reverse()])
  // 지층선 — 턱 높이에서 벼랑을 가로지른다 (끊김 한두 곳), 그 사이에 짧은 선 하나
  const xAtSide = (pts, y) => {
    for (let i = 1; i < pts.length; i++) if (pts[i][1] >= y) return lerp(pts[i - 1][0], pts[i][0], (y - pts[i - 1][1]) / (pts[i][1] - pts[i - 1][1] || 1))
    return pts[pts.length - 1][0]
  }
  let hatch = ''
  // (빗금 좌표는 정수로 반올림되므로 마디를 길게 — 짧은 마디는 계단처럼 보인다)
  for (const [f, full] of [[f1, true], [f2, true], [(f1 + f2) / 2, false]]) {
    const y = top + ch * f
    const xl = xAtSide(L, y) + 1.5
    const xr = xAtSide(R, y) - 1.5
    const line = []
    for (let k = 0; k <= 8; k++) line.push([lerp(xl, xr, k / 8), y + j(0.8)])
    const gap = 2 + Math.floor(rand() * 4)
    hatch += full ? K.line(line.slice(0, gap + 1)) + K.line(line.slice(gap + 1)) : K.line(line.slice(1, 4)) + K.line(line.slice(5, 7))
  }
  // 그늘진 벼랑의 세로 빗금
  for (let x = edge[0][0] + 4; x < xAtSide(R, top + ch * 0.5) - 2; x += 4.4) hatch += K.line([[x, top + 3 + rand() * 4], [x - 0.3, cb - 2 - rand() * 6]])
  // 너덜 비탈 — 벼랑 밑에서 오목하게 퍼진다
  const lb = [cx - half - w * 0.3, by]
  const rb = [cx + half + w * 0.34, by]
  const lq = [cx - half - w * 0.04, by - (by - cb) * 0.14]
  const rq = [cx + half + w * 0.04, by - (by - cb) * 0.14]
  const lc = L[L.length - 1]
  const rc = R[R.length - 1]
  const slopeD = `M${pt(lc)}Q${pt(lq)} ${pt(lb)}M${pt(rc)}Q${pt(rq)} ${pt(rb)}`
  const apron = `M${pt(lc)}Q${pt(lq)} ${pt(lb)}L${pt(rb)}Q${pt(rq)} ${pt(rc)}Z`
  const apronShade = `M${pt([cx + w * 0.2, cb])}L${pt([cx + w * 0.3, by])}L${pt(rb)}Q${pt(rq)} ${pt(rc)}Z`
  // 비탈의 짧은 낙하선 — 그늘 쪽(오른쪽)에 많이
  for (let k = 0; k <= 12; k++) {
    const u = k / 12
    if (u < 0.55 && k % 2) continue
    const x0 = lerp(cx - half + 3, cx + half - 2, u)
    const out = (u - 0.45) * 1.6
    const len = (by - cb) * (u > 0.55 ? 0.45 + rand() * 0.3 : 0.22 + rand() * 0.2)
    hatch += K.line([[x0 + out * 2, cb + 2.5], [x0 + out * (2 + len * 0.6), cb + 2.5 + len]])
  }
  return [
    P('fill', apron),
    P('shade', apronShade),
    P('fill', cliffD),
    P('shade', shadeD),
    P('hatch', hatch),
    P('ink', slopeD),
    P('ink-bold', K.line(sil)),
    ...K.rocks(rb[0] - w * 0.12, by - 0.5, Math.max(2.4, w * 0.035), 3, `${seed}:r`),
  ]
}

/** 고블린 굴 — 벽에 판 어두운 구멍 */
function hole(x, y, w) {
  const h = w * 0.9
  return `M${pt([x - w / 2, y])}C${pt([x - w / 2, y - h * 1.25])} ${pt([x + w / 2, y - h * 1.25])} ${pt([x + w / 2, y])}Z`
}
/** 굴에서 내민 고블린 머리 — 어두운 구멍 앞의 밝은 머리(테두리 없이), 옆으로 뻗은 긴 귀, 작은 두 눈 */
function gobHead(x, y, s) {
  const head = `M${pt([x - s * 0.44, y])}C${pt([x - s * 0.54, y - s * 0.84])} ${pt([x + s * 0.54, y - s * 0.84])} ${pt([x + s * 0.44, y])}Z`
  const ears = K.poly([[x - s * 0.3, y - s * 0.5], [x - s * 0.92, y - s * 1.02], [x - s * 0.44, y - s * 0.26]]) + K.poly([[x + s * 0.3, y - s * 0.5], [x + s * 0.92, y - s * 1.02], [x + s * 0.44, y - s * 0.26]])
  const eye = (ex) => `M${pt([ex - 0.75, y - s * 0.4])}A0.75 0.75 0 1 0 ${pt([ex + 0.75, y - s * 0.4])}A0.75 0.75 0 1 0 ${pt([ex - 0.75, y - s * 0.4])}Z`
  return { fill: head + ears, ink: ears, eyes: eye(x - s * 0.15) + eye(x + s * 0.15) }
}
/** 굴 무리 — spots: [[x, y, w, 머리?]] (y 는 구멍 밑) */
function warren(spots) {
  let dark = ''
  let lip = ''
  let fill = ''
  let ink = ''
  let eyes = ''
  for (const [x, y, w, head] of spots) {
    dark += hole(x, y, w)
    lip += K.line([[x - w * 0.75, y + 0.8], [x + w * 0.75, y + 0.8]])
    if (head) {
      const g = gobHead(x, y + 0.2, w * 0.86)
      fill += g.fill
      ink += g.ink
      eyes += g.eyes
    }
  }
  return [P('dark', dark), P('ink', lip), P('fill', fill), P('ink', ink), P('dark', eyes)]
}

/** 코르의 임시 거처 — 천 한 장을 건 뾰족한 천막 */
function tent(x, y, w, h) {
  const body = K.poly([[x - w / 2, y], [x - w * 0.04, y - h], [x + w / 2, y]])
  const shade = K.poly([[x - w * 0.04, y - h], [x + w / 2, y], [x + w * 0.06, y]])
  return [P('fill', body), P('shade', shade), P('hatch', K.line([[x - w * 0.04, y - h], [x + w * 0.06, y]])), P('ink', body)]
}
/** 처진 줄 — a 에서 b 까지, 가운데가 sag 만큼 처진다 */
const sagMid = (a, b, sag) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag * 2]
const sagLine = (a, b, sag) => `M${pt(a)}Q${pt(sagMid(a, b, sag))} ${pt(b)}`
const sagAt = (a, b, sag, t) => {
  const m = sagMid(a, b, sag)
  const u = 1 - t
  return [u * u * a[0] + 2 * u * t * m[0] + t * t * b[0], u * u * a[1] + 2 * u * t * m[1] + t * t * b[1]]
}
/** 닻 갈고리 — 가장자리에 박은 말뚝, 끝이 갈고리로 굽는다 */
const anchor = ([x, y]) => K.line([[x, y + 1.5], [x, y - 4]]) + `M${pt([x, y - 4])}C${pt([x, y - 6.6])} ${pt([x + 3.2, y - 6.6])} ${pt([x + 3.2, y - 4.4])}`
/** 도르래 — 줄 위의 작은 바퀴 */
const pulley = ([x, y], r = 2.2) => `M${pt([x - r, y])}A${r} ${r} 0 1 0 ${pt([x + r, y])}A${r} ${r} 0 1 0 ${pt([x - r, y])}Z`

/** 바람 — 물결치는 흐름선 셋, 가운데 줄 끝이 말려 오른다 (옛 지도의 바람 표시). (x, y) 는 바람이 가는 쪽 끝, dir: 1 은 동쪽으로 분다 */
function wind(x, y, s, dir, seed) {
  const rand = K.rng(seed)
  let d = ''
  for (let k = -1; k <= 1; k++) {
    const yy = y + k * s * 0.3
    const x1 = x - dir * (k === 0 ? s * 0.3 : s * (0.6 + rand() * 0.3))
    const x0 = x1 - dir * s * (k === 0 ? 3 : 2 + rand() * 0.6)
    const q = (x1 - x0) / 4
    d += `M${pt([x0, yy])}Q${pt([x0 + q, yy - s * 0.11])} ${pt([x0 + q * 2, yy])}Q${pt([x0 + q * 3, yy + s * 0.11])} ${pt([x1, yy])}`
  }
  const r = s * 0.3
  const sx = x - dir * s * 0.3
  d += `M${pt([sx, y])}C${pt([sx + dir * r * 1.5, y])} ${pt([sx + dir * r * 1.6, y - r * 1.7])} ${pt([sx + dir * r * 0.5, y - r * 1.7])}C${pt([sx - dir * r * 0.3, y - r * 1.7])} ${pt([sx - dir * r * 0.3, y - r * 0.8])} ${pt([sx + dir * r * 0.4, y - r * 0.9])}`
  return [P('ink', d)]
}

/** 떠도는 바위 — 지층이 보이는 거친 땅 덩어리, 밑은 울퉁불퉁한 뿌리 (헤드론·하늘거주지 조각과 다르다). (x, y) 는 윗면 앞 가운데 */
function berg(x, y, w, h, lift, seed) {
  const rand = K.rng(seed)
  const n = 7
  const front = []
  const back = []
  for (let k = 0; k <= n; k++) {
    const u = k / n
    front.push([x - w / 2 + w * u + (k && k < n ? (rand() - 0.5) * 4 : 0), y + (rand() - 0.5) * 2.4])
    back.push([x - w / 2 + w * u + (rand() - 0.5) * 3, y - w * 0.09 * Math.sin(Math.PI * u) * (0.7 + rand() * 0.5)])
  }
  const topD = K.poly([...front, ...[...back].reverse().slice(1, -1)])
  const sideH = h * 0.3
  const side = front.map(([px, py], k) => [px + (k === 0 ? 2 : k === n ? -2 : 0), py + sideH * (0.85 + rand() * 0.3)])
  // 밑 — 울퉁불퉁 내려가 한쪽으로 쏠린 뿌리
  const under = [side[n], [x + w * 0.4, y + h * 0.5], [x + w * 0.3, y + h * 0.56], [x + w * 0.22, y + h * 0.78], [x + w * 0.08, y + h * 0.74], [x - w * 0.02, y + h], [x - w * 0.12, y + h * 0.7], [x - w * 0.28, y + h * 0.62], [x - w * 0.36, y + h * 0.46], side[0]]
  const body = K.poly([...front, ...under.slice(1, -1), side[0]])
  const underD = K.poly([...side, ...under.slice(1, -1)])
  const underShade = K.poly([[x + w * 0.02, y + sideH], ...under.slice(0, 6)])
  let hatch = K.line(front.map(([px, py], k) => [px, py + (side[k][1] - py) * 0.5]))
  for (let k = 0; k < 9; k++) {
    const px = x + w * 0.04 + (k * w * 0.36) / 8
    hatch += K.line([[px, y + sideH + 3], [px - 0.5, y + sideH + h * (0.16 + rand() * 0.22)]])
  }
  const sy = y + h + lift
  const shadow = `M${pt([x - w * 0.34, sy])}A${r1(w * 0.34)} ${r1(w * 0.06)} 0 1 0 ${pt([x + w * 0.34, sy])}A${r1(w * 0.34)} ${r1(w * 0.06)} 0 1 0 ${pt([x - w * 0.34, sy])}Z`
  return [P('shade', shadow), P('fill', body), P('shade', underShade), P('hatch', hatch), P('ink', underD + K.line(side)), P('fill', topD), P('ink-bold', topD)]
}

/** 고모조아 — 돌 껍질을 쓴 해파리, 길게 늘어진 촉수 (Plane Shift) */
function gomazoa(x, y, s, seed) {
  const rand = K.rng(seed)
  const bell = `M${pt([x - s / 2, y])}C${pt([x - s / 2, y - s * 0.9])} ${pt([x + s / 2, y - s * 0.9])} ${pt([x + s / 2, y])}Q${pt([x, y + s * 0.18])} ${pt([x - s / 2, y])}Z`
  let tentacles = ''
  for (let k = 0; k < 5; k++) {
    const tx = x - s * 0.36 + (k * s * 0.72) / 4
    const len = s * (1.8 + rand() * 1.2)
    tentacles += `M${pt([tx, y + s * 0.06])}C${pt([tx - s * 0.2, y + len * 0.35])} ${pt([tx + s * 0.22, y + len * 0.65])} ${pt([tx - s * 0.05, y + len])}`
  }
  const plates = K.line([[x - s * 0.32, y - s * 0.4], [x - s * 0.06, y - s * 0.1]]) + K.line([[x + s * 0.1, y - s * 0.64], [x + s * 0.24, y - s * 0.1]])
  return [P('stone', bell), P('hatch', plates), P('ink', bell + tentacles)]
}

/** 들소 — 털이 덥수룩하고 뿔이 말린 소 (ZNR Makindi Stampede 그림). (x, y) 는 발 밑, 서쪽(왼쪽)으로 달린다 */
function ox(x, y, s, seed) {
  const rand = K.rng(seed)
  const T = ([px, py]) => [x + px * s, y + py * s]
  const body = K.smooth([[0.55, -0.34], [0.46, -0.6], [0.12, -0.7], [-0.2, -0.86], [-0.42, -0.78], [-0.56, -0.56], [-0.62, -0.36], [-0.48, -0.26], [-0.2, -0.32], [0.16, -0.26], [0.5, -0.22]].map(T), true)
  const head = K.smooth([[-0.5, -0.66], [-0.72, -0.62], [-0.88, -0.44], [-0.84, -0.32], [-0.62, -0.34]].map(T), true)
  const horn = `M${pt(T([-0.58, -0.66]))}C${pt(T([-0.62, -0.96]))} ${pt(T([-0.9, -0.94]))} ${pt(T([-0.86, -0.72]))}L${pt(T([-0.78, -0.76]))}`
  const g = rand() * 0.12
  const legs = K.line([T([-0.44, -0.3]), T([-0.62 - g, 0])]) + K.line([T([-0.3, -0.3]), T([-0.16, 0])]) + K.line([T([0.3, -0.26]), T([0.1 + g, 0])]) + K.line([T([0.44, -0.26]), T([0.64, -0.02])])
  const shag = K.line([T([-0.14, -0.74]), T([-0.16, -0.5])]) + K.line([T([0.06, -0.66]), T([0.04, -0.44])]) + K.line([T([0.26, -0.6]), T([0.24, -0.4])]) + K.line([T([-0.4, -0.7]), T([-0.42, -0.5])])
  const tail = K.line([T([0.52, -0.38]), T([0.7, -0.3]), T([0.74, -0.2])])
  return [P('fill', body + head), P('shade', K.smooth([[0.16, -0.26], [0.5, -0.22], [0.55, -0.34], [0.44, -0.52], [0.22, -0.42]].map(T), true)), P('hatch', shag), P('ink', body + head + horn + legs + tail)]
}

/** 흙먼지 — 무리 뒤로 이는 둥근 먼지 */
function dust(x, y, s, n, seed) {
  const rand = K.rng(seed)
  let d = ''
  for (let k = 0; k < n; k++) {
    const cx = x + rand() * s * 1.6
    const cy = y - rand() * s * 0.6
    const r = s * (0.16 + rand() * 0.14)
    d += `M${pt([cx - r, cy])}A${r1(r)} ${r1(r * 0.8)} 0 0 1 ${pt([cx + r, cy])}`
  }
  return [P('hatch', d)]
}

/** 새 — 벼랑 둘레의 작은 새 */
function birds(spots) {
  let d = ''
  for (const [x, y, s] of spots) d += `M${pt([x - s, y - s * 0.2])}Q${pt([x - s * 0.5, y - s * 0.6])} ${pt([x, y])}Q${pt([x + s * 0.5, y - s * 0.6])} ${pt([x + s, y - s * 0.2])}`
  return [P('ink', d)]
}

/** 잔돌 — 맨바위 바닥과 무너진 돌 둘레의 짧은 점 */
function gravel(x0, y0, x1, y1, n, seed, keep) {
  const rand = K.rng(seed)
  let d = ''
  for (let k = 0; k < n; k++) {
    const x = lerp(x0, x1, rand())
    const y = lerp(y0, y1, rand())
    if (keep && !keep(x, y)) continue
    const l = 0.8 + rand() * 1.2
    d += K.line([[x, y], [x + l, y + 0.2]])
  }
  return [P('hatch', d)]
}

/** 급류 — 협곡 바닥 몇 군데에만 모인 잔물결 무리 (물줄기를 잇지 않는다). 바닥 가운데 x 에서 두 가장자리 사이 */
function rapids(A, B, xs, seed) {
  return xs.flatMap((x, i) => K.ripples(x, (yAt(A, x) + yAt(B, x)) / 2, 10, 5, `${seed}${i}`))
}

// ---------- 협곡의 미로 ----------

// 큰 협곡 (이 지도의 중심) — 서쪽 끝에서 동쪽 끝까지. 북쪽 벽이 지층 띠로 선다. 동쪽에서는 바닥이 넓어져 메사가 선다
const T1 = trench(
  't1',
  [[-40, 452], [150, 462], [300, 490], [440, 524], [600, 538], [730, 542], [860, 524], [990, 488], [1110, 456], [1260, 436], [1440, 424]],
  [[-40, 566], [180, 590], [380, 646], [560, 718], [700, 730], [850, 716], [970, 700], [1036, 712], [1068, 766], [1082, 860], [1090, 960], [1094, 1060]],
  { close: [[1460, 424], [1460, 1070], [1094, 1070]], jagA: 4.6 },
)
const h1v = wobble('t1:hv', 38, 7)
const h1k = curve([[-40, 56], [200, 70], [420, 96], [560, 112], [800, 114], [960, 98], [1110, 80], [1300, 68], [1440, 62]])
const h1 = (x) => h1k(x) + h1v(x) * clamp((Math.abs(x - 600) - 40) / 60, 0, 1)
const rimN1 = (x) => yAt(T1.A, x)
const sS1 = (x) => yAt(T1.B, x)

// 북쪽 끝에서 내려와 큰 협곡에 드는 갈래 (T2) — 불안정한 봉우리 무리의 동쪽
const T2 = trench(
  't2',
  [[452, -20], [446, 50], [424, 120], [430, 190], [404, 262], [382, 330], [392, 400], [374, 462], [366, rimN1(366)]],
  [[512, -20], [500, 50], [472, 120], [474, 190], [452, 262], [432, 330], [440, 400], [432, 462], [434, rimN1(434)]],
  { close: [[362, 606], [438, 606]] },
)
// 북쪽 좁은 협곡 (T4) — T2 에서 갈라져 동북동으로 굽이치며 동쪽 끝으로
const T4 = trench(
  't4',
  [[466, 222], [540, 212], [620, 232], [700, 250], [790, 248], [880, 226], [960, 198], [1050, 190], [1140, 170], [1240, 160], [1330, 138], [1440, 128]],
  [[456, 280], [540, 262], [620, 282], [700, 300], [790, 298], [880, 274], [960, 246], [1050, 232], [1140, 216], [1240, 204], [1330, 186], [1440, 178]],
  { headA: [[438, 224]], headB: [[428, 282]] },
)
const sN4 = (x) => yAt(T4.B, x)
// T4 에서 남으로 굽어 들다 막힌 갈래 (T5) — 코르의 줄이 걸린다
const T5 = trench('t5', [[838, sN4(838) - 8], [830, 320], [842, 360], [836, 400], [850, 436], [862, 454]], [[892, sN4(892) - 8], [884, 320], [880, 360], [868, 400], [866, 436], [862, 454]], { jag: 2.2 })
// 큰 협곡 북쪽 벽에서 북북동으로 올라가 T4 와 만나는 갈래 (T3)
const T3 = trench(
  't3',
  [[1096, sN4(1096) - 8], [1092, 268], [1066, 310], [1074, 358], [1050, 408], [1042, rimN1(1042)]],
  [[1146, sN4(1146) - 8], [1138, 268], [1112, 310], [1120, 358], [1098, 408], [1094, rimN1(1094)]],
  { close: [[1040, 570], [1096, 562]] },
)
// 남쪽 협곡 (T6) — 서쪽 끝에서 동남으로 내려가 메사의 바닥으로 열린다
const T6 = trench(
  't6',
  [[-40, 770], [100, 776], [220, 790], [340, 800], [470, 826], [600, 836], [720, 850], [850, 852], [970, 864], [1078, 868]],
  [[-40, 826], [100, 836], [220, 852], [340, 864], [470, 878], [600, 896], [720, 902], [850, 912], [970, 920], [1100, 926]],
  { close: [[1120, 870], [1120, 926]] },
)
const rimN6 = (x) => yAt(T6.A, x)
// 큰 협곡 남쪽 가장자리에서 남남서로 T6 에 드는 갈래 (T7)
const T7 = trench('t7', [[300, sS1(300) - 8], [292, 670], [266, 720], [252, rimN6(252) + 6]], [[352, sS1(352) - 8], [340, 676], [318, 730], [304, rimN6(304) + 6]])
// T6 남쪽 가장자리에서 아래 끝으로 (T8)
const T8 = trench('t8', [[744, yAt(T6.B, 744) - 8], [732, 950], [748, 1012]], [[796, yAt(T6.B, 796) - 8], [782, 955], [798, 1012]])

const parts = []
const add = (...ps) => parts.push(...ps.flat())

// 바닥 (그늘) — 갈래가 만나는 곳은 바닥이 이어진다
add(T1.floor, T2.floor, T4.floor, T5.floor, T3.floor, T6.floor, T7.floor, T8.floor)
// 맨바위 바닥 — 잔돌
add(gravel(0, 480, 1060, 760, 170, 'g1', (x, y) => y > rimN1(x) + h1(x) + 6 && y < sS1(x) - 10 && Math.abs(x - 600) > 70 && !(x < 110 && y < 570) && !(x > 960 && y < 700)))
// 급류 — 갈래 두 곳의 바닥에만, 짧은 잔물결 무리로 (벽 위에 걸린 골짜기에는 두지 않는다 — 폭포처럼 읽히지 않게)
add(rapids(T6.A, T6.B, [34, 128, 214], 'ww6'), rapids(T4.A, T4.B, [1186, 1286, 1378], 'ww4'))

// 큰 협곡의 북쪽 벽 — 지층 띠가 서쪽 끝에서 동쪽 끝까지 끊이지 않는다. 북쪽에서 온 갈래(T2·T3)는 벽 위에 걸린 골짜기로,
// 가장자리에 V 자로 팬 자리에서 끝난다 (물은 그리지 않는다 — 폭포가 아니다)
const notches = [[366, 434, 26], [1042, 1094, 22]]
const dip = (x) => {
  for (const [a, b, d] of notches) if (x > a && x < b) return d * Math.pow(1 - Math.abs((2 * (x - a)) / (b - a) - 1), 1.2)
  return 0
}
const N1v = T1.A.map(([x, y]) => [x, y + dip(x)])
const W1 = wallFace('t1', N1v, (x) => h1(x) - dip(x), { bands: 5 })
add(W1.parts)

// 가장자리 — 선과 바닥 쪽 빗금 (갈래가 만나는 곳은 비운다). 큰 협곡만 굵은 선
add(rim(T1.B, T1.A, 't1b', { skip: ([x, y]) => (x > 296 && x < 356 && y < 662) || (x > 1040 && y > 864 && y < 930), share: 0.22, max: 18, bold: true }))
add(rim(T2.A, T2.B, 't2a'), rim(T2.B, T2.A, 't2b', { skip: ([, y]) => y > 218 && y < 286 }))
add(rim(T4.A, T4.B, 't4a'), rim(T4.B, T4.A, 't4b', { skip: ([x]) => (x > 834 && x < 896) || (x > 1092 && x < 1150) }))
const between = (pts, lo, hi) => pts.filter((p) => p[1] > lo(p[0]) - 1 && p[1] < hi(p[0]) + 1)
add(rim(between(T5.A, sN4, () => 1e9), T5.B, 't5a', { share: 0.28 }), rim(between(T5.B, sN4, () => 1e9), T5.A, 't5b', { share: 0.28 }))
add(rim(between(T3.A, sN4, rimN1), T3.B, 't3a'), rim(between(T3.B, sN4, rimN1), T3.A, 't3b'))
add(rim(T6.A, T6.B, 't6a', { skip: ([x]) => x > 248 && x < 308 }), rim(T6.B, T6.A, 't6b', { skip: ([x]) => x > 740 && x < 800 }))
add(rim(between(T7.A, sS1, rimN6), T7.B, 't7a'), rim(between(T7.B, sS1, rimN6), T7.A, 't7b'))
add(rim(T8.A.filter((p) => p[1] > yAt(T6.B, p[0]) - 1), T8.B, 't8a'), rim(T8.B.filter((p) => p[1] > yAt(T6.B, p[0]) - 1), T8.A, 't8b'))
// 남쪽 협곡 동쪽 끝의 뱃머리 모서리
add(P('ink', K.line([T6.A[T6.A.length - 1], [xAt(T1.B.filter((p) => p[0] > 1040), 866), 866]])))

// 메사 (Makindi Mesas) — 넓은 바닥에 선 평평한 꼭대기 바위산 셋(옆에서 본 모습, 지층 턱과 너덜 비탈). 그리고 가는 바위 기둥 하나
add(K.stack([
  { y: 700, parts: butte(1342, 700, 56, 60, 'm3') },
  { y: 890, parts: butte(1240, 890, 102, 106, 'm1') },
  { y: 975, parts: butte(1342, 975, 60, 58, 'm2') },
  { y: 640, parts: K.spire(1196, 640, 13, 70, 'pillar') },
]))

// 불안정한 봉우리 — 카드 표시 둘레의 무리와 여기저기 몇. 표시 둘레(머리말 밑)의 셋은 머리말에 다 덮이거나 다 보이게 두고,
// 머리말 오른쪽과 아래로 넷이 나와 보인다. 표시 이름(밑)이 놓이는 줄은 비운다
add(K.stack([
  { y: 104, parts: teeter(150, 104, 76, 50, 'tp-a', -6, 0.08) },
  { y: 196, parts: teeter(228, 196, 62, 38, 'tp-b', 7, -0.1) },
  { y: 196, parts: teeter(118, 196, 50, 32, 'tp-c', 4, 0.12) },
  { y: 226, parts: teeter(344, 226, 70, 42, 'tp-d', -8, -0.08) },
  { y: 306, parts: teeter(322, 306, 54, 32, 'tp-e', 9, 0.1) },
  { y: 376, parts: teeter(120, 376, 52, 32, 'tp-f', -4, 0) },
  { y: 370, parts: teeter(246, 370, 60, 36, 'tp-f2', 5, -0.06) },
  { y: 508, parts: teeter(508, 508, 50, 30, 'tp-g', 6, 0.1) },
  { y: 712, parts: teeter(82, 712, 50, 30, 'tp-i', -6, -0.1) },
  { y: 402, parts: teeter(1172, 402, 56, 32, 'tp-h', 7, 0.08) },
]))

// 고블린 굴 — 작은 대상 오른쪽 벽 높이 굴 여섯, 셋은 머리를 내민다. 다른 벽에도 작은 무리
add(warren([[688, rimN1(688) + 30, 13], [716, rimN1(716) + 54, 12, true], [742, rimN1(742) + 26, 13], [772, rimN1(772) + 48, 13, true], [802, rimN1(802) + 28, 12, true], [830, rimN1(830) + 58, 11]]))
add(warren([[420, rimN6(420) + 15, 10], [446, rimN6(446) + 19, 10, true], [472, rimN6(472) + 14, 9]]))
add(warren([[596, yAt(T4.A, 596) + 14, 9], [620, yAt(T4.A, 620) + 17, 8]]))

// 마찻길 — 큰 협곡 북쪽 가장자리를 따라 오다가 벽을 갈지자로 내려가 바닥에 닿는다
add(K.dashed([[-30, 436], [60, 440], [150, 449], [206, 458], [262, 480], [214, 494], [270, 508], [222, 522], [278, 536], [244, 552]], 7, 5))

// 코르의 거처 — 막힌 갈래(T5) 위에 건 줄과 도르래, 매단 천막. 큰 협곡 벽에 붙인 천막
const lines = [[[832, 314], [886, 310], 6], [[838, 350], [882, 347], 6], [[840, 386], [872, 384], 5]]
let rope = ''
let anchors = ''
for (const [a, b, sag] of lines) {
  rope += sagLine(a, b, sag)
  anchors += anchor(a) + anchor(b)
}
rope += K.line([[878, 311], [876, 348]])
add(P('ink', rope + anchors + pulley([878, 314]) + pulley([876, 350])))
// 천막은 꼭짓점이 줄에 걸려 아래로 늘어진다
const hang = (a, b, sag, t, w, h) => {
  const [x, y] = sagAt(a, b, sag, t)
  return tent(x, y + h, w, h)
}
add(hang(lines[0][0], lines[0][1], 6, 0.42, 13, 11), hang(lines[1][0], lines[1][1], 6, 0.3, 12, 10), hang(lines[1][0], lines[1][1], 6, 0.7, 10, 9))
// 벽에 붙인 거처 — 지층 턱에 걸친 널 위의 천막, 꼭짓점에서 가장자리 닻까지 비스듬한 줄
for (const [x, f, w, h, ax] of [[930, 0.34, 10, 9, 9], [958, 0.6, 11, 10, -8], [986, 0.3, 9, 8, 8]]) {
  const yb = rimN1(x) + h1(x) * f
  const a = [x + ax, rimN1(x + ax)]
  add(P('hatch', K.line([[x - w * 0.04, yb - h], a])), P('ink', anchor(a)), tent(x, yb, w, h), P('ink', K.line([[x - w * 0.85, yb + 0.7], [x + w * 0.85, yb + 0.7]])))
}

// 떠도는 바위와 고모조아 — 동북 고원 위
add(berg(1250, 292, 64, 40, 28, 'berg1'), berg(1352, 352, 38, 23, 22, 'berg2'))
add(gomazoa(1302, 386, 12, 'goma'))

// 털 많고 뿔이 말린 소 떼 (ZNR Makindi Stampede) — 넓은 바닥을 서쪽으로 내닫는다, 뒤로 흙먼지
add(dust(1046, 672, 24, 10, 'dust'))
add(K.stack([[976, 676, 22], [1002, 664, 20], [1022, 686, 22], [1044, 670, 19]].map(([x, y, s], i) => ({ y, parts: ox(x, y, s, `ox${i}`) }))))

// 새 — 벼랑 둘레
add(birds([[466, 572, 4.2], [482, 562, 3.4], [455, 560, 3]]))

// 바람 — 협곡에서 불어 나오는 소용돌이
add(wind(1166, 560, 22, 1, 'w1'), wind(40, 546, 20, -1, 'w2'))

// 옛 유적 — 닳아 자갈이 된 낮은 벽 토막 (AoM 'nameless ruins worn to gravel')
add(K.ruin(166, 690, 26, 9, 'ru1'), K.ruin(200, 700, 18, 7, 'ru2'), gravel(140, 680, 236, 712, 44, 'g-ru'))

// 바위 틈 고블린 (PG: Goblins 'fissures between boulders and converging crags') — 두 바위가 서로 기대 ㅅ 자로 만나고,
// 그 밑이 좁고 어두운 틈. 옆에 작은 바위 하나, 앞에 돌 몇. 이름은 달지 않는다
const crag = (out, shade, hatch) => [P('fill', K.poly(out)), P('shade', K.poly(shade)), P('hatch', hatch.map((l) => K.line(l)).join('')), P('ink', K.poly(out))]
add(
  crag(
    [[548, 800], [546, 787], [551, 773], [557, 763], [562, 759], [566, 761], [571, 755], [579, 758], [577, 771], [576, 786], [576.5, 800]],
    [[568, 800], [570, 757], [579, 758], [577, 771], [576, 786], [576.5, 800]],
    [[[573, 765], [571, 795]]],
  ),
  crag(
    [[584, 801], [582.5, 786], [580.5, 771], [580, 757], [586, 751], [591, 754], [596, 749], [603, 755], [609, 766], [613, 783], [616, 801]],
    [[600, 801], [597, 750], [603, 755], [609, 766], [613, 783], [616, 801]],
    [[[603, 761], [605, 797]], [[607, 769], [610, 798]], [[611, 780], [613, 798]]],
  ),
  crag(
    [[621, 802], [622, 789], [625, 779], [630, 775], [634, 778], [638, 776], [642, 787], [644, 802]],
    [[633, 802], [634, 778], [638, 776], [642, 787], [644, 802]],
    [[[637, 782], [638, 799]], [[640, 788], [641, 799]]],
  ),
  P('dark', K.poly([[576.5, 800], [579, 759.5], [580.3, 758.5], [584, 801]])),
  K.rocks(562, 806, 4.5, 2, 'fk-r'),
)

CHILDMAPS.push({
  id: 'makindi-trenches',
  size: [1400, 1000],
  glyphScale: 4,
  terrain: [
    // 세계 지도의 협곡 기호 — 손으로 그린 협곡 밖의 고원에
    { kind: 'canyon', points: [[560, -10], [1420, -10], [1420, 90], [1240, 130], [1050, 165], [880, 192], [700, 192], [560, 186]], density: 0.75 },
    { kind: 'canyon', points: [[-10, 896], [700, 950], [700, 1400], [-10, 1400]], density: 0.75 },
    { kind: 'canyon', points: [[836, 962], [1060, 968], [1060, 1400], [836, 1400]], density: 0.75 },
  ],
  // 빗금은 정수로 — 가는 선의 0.1 단위는 보이지 않는다
  parts: parts.filter((p) => p.d).map((p) => (p.cls === 'hatch' ? { cls: p.cls, d: p.d.replace(/-?\d+\.\d+/g, (v) => String(Math.round(Number(v)))) } : p)),
  labels: [
    { text: 'Makindi Trenches', textKo: '마킨디 협곡', at: [640, 424], size: 34, kind: 'area', rotate: -3 },
    { text: 'Makindi Mesas', textKo: '마킨디 메사', at: [1188, 758], size: 24, kind: 'area' },
  ],
  subjects: {
    'warren-instigator': { at: [600, 650], size: 100 },
  },
  markAnchors: { 'card:teetering-peaks': 'below' },
})
