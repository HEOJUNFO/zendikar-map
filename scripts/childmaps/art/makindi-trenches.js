// 마킨디 협곡 (Makindi Trenches) — 온두 본토를 가르는 높은 벽 협곡의 미로. 자식 지도 원본 (세계 x 269–437 · y 898–1018 ×8.33).
// 보는 법: 고원 윗면은 양피지, 협곡 바닥은 그늘(shade). 큰 협곡의 북쪽 벽(보는 쪽을 향한 면)만 지층 띠를 두른 벽으로 세우고,
// 나머지 갈래는 가장자리에서 협곡 안쪽으로 짧은 빗금 — 세계 지도의 협곡 기호(빗금 단 호)를 이 축척으로 푼 것.
// 근거(brief): 협곡의 미로·지층 벽·급류 또는 맨바위 바닥(PG: Ondu 2009, AoM 2016), 발굽에 다져진 바닥
// (ZNR Makindi Stampede), 불안정한 봉우리(PG·AoM·ZEN 카드), 암벽 고블린 굴과 바위 틈 고블린(PG: Goblins, AoM),
// 코르의 매달린 임시 거처·닻줄·도르래(AoM), 벼랑 가장자리 마찻길과 턱길·갈지자(PG), 바람(PG), 떠도는 바위(AoM, ZNR 그림),
// 닳아 자갈이 된 이름 없는 유적(AoM). 갈래의 모양과 이것들의 자리는 이 지도의 해석이다.
// 페이즈 대상 가운데 고마조아(Plane Shift)는 떠도는 바위 사이에, Unstable Footing 그림(무너지는 턱길)은 큰 협곡 북쪽 벽에
// 박아 마찻길의 턱길과 잇는다. 코르 비행사는 동쪽 갈래(T3)를 건너뛰고, 코르 결투가는 지역 이름 서쪽 고원에 선다.
// ZEN 커먼 대상(모두 이 지도의 추정): 코르 정찰병은 지류 갈래(T2)를 밧줄로 건너고(그림의 두 벼랑 밑동이 두 가장자리에), 갈고리 명수는
// 그 서쪽 가장자리 끝에, 방패 동료는 북쪽 고원에, 장비 담당은 매단 거처(T5) 위 T4 가장자리의 천막 곁에, 스카이피셔는 큰 협곡
// 서쪽으로 내리꽂히고, 무너지는 옛 코르 마을(Demolish — 수도 마킨디가 아니다)은 동쪽 넓은 바닥에, 성직자 둘은 서남 고원에, 바위 틈 고블린
// (Goblin Bushwhacker)은 남쪽 곁협곡(S)의 곧은 목에 두 벽을 짚고 버틴다.
// 세계 지도와 맞춘 것 (src/data/landscape/ondu.ts — 모두 세계 지도의 추정): 급류 두 줄기(makindi-west-river 와 지류
// makindi-west-branch)는 세계 지도의 물길을 그대로 옮겨, 큰 협곡과 북쪽에서 내려오는 갈래의 바닥으로 흐르게 했다
// (예전 brief 의 '물길을 잇지 않는다'보다 세계 지도와 맞추는 쪽을 따랐다). 동남 끝은 Prison of Omnath 메사의 서쪽 벼랑과
// 꼭대기 숲 가장자리(prison-of-omnath-mesa·-forest). 세계 지도가 마킨디 메사(makindi-mesas)를 이 범위 밖 동남쪽에 두므로
// 여기서는 그 이름을 달지 않는다.

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
      // noTick: 빗금만 비우는 곳 (선은 남는다) — 대상 그림이 협곡 위에 걸친 자리
      if (o.noTick && o.noTick(x, y)) continue
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
  // 밑 그늘의 세로 빗금 — 작은 바위는 몇 줄만 (촘촘하면 글자처럼 보인다)
  const nh = clamp(Math.round(w / 7), 3, 9)
  for (let k = 0; k < nh; k++) {
    const px = x + w * 0.04 + (k * w * 0.36) / (nh - 1)
    hatch += K.line([[px, y + sideH + 3], [px - 0.5, y + sideH + h * (0.16 + rand() * 0.22)]])
  }
  const sy = y + h + lift
  const shadow = `M${pt([x - w * 0.34, sy])}A${r1(w * 0.34)} ${r1(w * 0.06)} 0 1 0 ${pt([x + w * 0.34, sy])}A${r1(w * 0.34)} ${r1(w * 0.06)} 0 1 0 ${pt([x - w * 0.34, sy])}Z`
  return [P('shade', shadow), P('fill', body), P('shade', underShade), P('hatch', hatch), P('ink', underD + K.line(side)), P('fill', topD), P('ink-bold', topD)]
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

/** 급류 표시 — 물길 위 몇 군데에 흐름을 따라 놓인 짧은 물결 둘 (물살이 빠른 곳). pts: 물길, every: 간격 */
function whitewater(pts, every, seed, skip) {
  const rand = K.rng(seed)
  let d = ''
  for (const [[x, y], [ux, uy]] of K.along(pts, every)) {
    if (skip && skip(x, y)) continue
    for (const k of [-1, 1]) {
      const s = 4.4 + rand() * 2
      const nx = -uy * k * (1.2 + rand() * 0.8)
      const ny = ux * k * (1.2 + rand() * 0.8)
      const cx = x + nx + ux * (rand() - 0.5) * 6
      const cy = y + ny + uy * (rand() - 0.5) * 6
      const a = [cx - ux * s, cy - uy * s]
      const b = [cx + ux * s, cy + uy * s]
      const m1 = [cx - ux * s * 0.5 - uy * 1.1, cy - uy * s * 0.5 + ux * 1.1]
      const m2 = [cx + ux * s * 0.5 + uy * 1.1, cy + uy * s * 0.5 - ux * 1.1]
      d += `M${pt(a)}Q${pt(m1)} ${pt([cx, cy])}Q${pt(m2)} ${pt(b)}`
    }
  }
  return [P('sea-ink', d)]
}

/** 점에서 꺾은선까지 거리 */
function distTo(pts, x, y) {
  let best = 1e9
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]
    const [bx, by] = pts[i]
    const vx = bx - ax
    const vy = by - ay
    const t = clamp(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1), 0, 1)
    best = Math.min(best, Math.hypot(ax + vx * t - x, ay + vy * t - y))
  }
  return best
}

// ---------- 세계 지도의 물길과 메사 (세계 좌표 → 자식 좌표, 세계 지도와 같은 다듬기) ----------

const W2C = ([x, y]) => [((x - 269) * 25) / 3, ((y - 898) * 25) / 3]
function chaikinOpen(pts, it) {
  for (let k = 0; k < it; k++) {
    const next = [pts[0]]
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i]
      const [bx, by] = pts[i + 1]
      next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75])
    }
    next.push(pts[pts.length - 1])
    pts = next
  }
  return pts
}
function chaikinClosed(pts, it) {
  for (let k = 0; k < it; k++) {
    const next = []
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i]
      const [bx, by] = pts[(i + 1) % pts.length]
      next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75])
    }
    pts = next
  }
  return pts
}
/** 세계 지도의 강처럼 가운데만 살짝 굽이친다 (양 끝 — 솟는 곳과 합류점 — 은 제자리) */
function meander(pts, seed, amp) {
  const w = wobble(seed, 70, amp)
  let s = 0
  const n = pts.length
  return pts.map((p, i) => {
    if (i) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1])
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(n - 1, i + 1)]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const t = i / (n - 1)
    const d = w(s) * Math.min(1, t * 6, (1 - t) * 6)
    return [p[0] + ((b[1] - a[1]) / len) * d, p[1] - ((b[0] - a[0]) / len) * d]
  })
}

// 협곡 바닥의 급류 (makindi-west-river) — 큰 협곡 바닥에서 솟아 서쪽 끝으로 흘러 나간다
const RIVER = meander(chaikinOpen([[365, 990.4], [350.6, 988], [336.2, 989.2], [320.6, 991.6], [307.4, 982], [293, 979.6], [277.4, 979.6], [261.8, 984.4], [248.6, 978.4]].map(W2C), 3), 'rv', 5)
// 지류 (makindi-west-branch) — 북쪽 끝에서 내려와 큰 협곡에서 본류에 든다. 마지막 점은 본류의 가장 가까운 점 (세계 지도와 같다)
const BR0 = [[338.6, 884.8], [331.4, 896.8], [326.6, 910], [313.4, 917.2], [306.2, 929.2], [302.6, 942.4], [296.6, 955.6], [288.2, 966.4], [283.4, 979.6]].map(W2C)
const dJ = (p) => Math.hypot(p[0] - BR0[8][0], p[1] - BR0[8][1])
const JOIN = RIVER.reduce((a, p) => (dJ(p) < dJ(a) ? p : a))
const BRANCH = meander(chaikinOpen([...BR0.slice(0, -1), JOIN], 3), 'br', 4)
// Prison of Omnath 메사 (prison-of-omnath-mesa) — 서쪽 벼랑만 이 범위에 든다. 꼭대기 숲 (prison-of-omnath-forest)
const MESA = chaikinClosed([[471.8, 973.6], [457.4, 973.6], [446.6, 980.8], [434.6, 985.6], [428.6, 995.2], [428.6, 1004.8], [428.6, 1014.4], [437, 1022.8], [444.2, 1031.2], [458.6, 1034.8], [471.8, 1034.8], [486.2, 1034.8], [499.4, 1031.2], [506.6, 1022.8], [515, 1014.4], [518.6, 1004.8], [512.6, 995.2], [507.8, 986.8], [498.2, 978.4], [485, 976]].map(W2C), 2)
const MESA_W = MESA.filter((p) => p[0] < 1480)
const FOREST = [[471.8, 978.4], [458.6, 979.6], [447.8, 985.6], [437, 991.6], [433.4, 1000], [434.6, 1009.6], [438.2, 1018], [447.8, 1024], [458.6, 1030], [471.8, 1031.2], [485, 1027.6], [497, 1025.2], [506.6, 1018], [509, 1009.6], [510.2, 1000], [506.6, 991.6], [495.8, 985.6], [485, 980.8]].map(W2C)

// ---------- 협곡의 미로 ----------

// 큰 협곡 (이 지도의 중심) — 서쪽 끝에서 동쪽 끝까지. 북쪽 벽이 지층 띠로 선다. 바닥은 넓어 남쪽 가장자리 가까이로 급류가 흐르고,
// 동쪽에서는 바닥이 Omnath 메사 발치까지 넓게 열린다
const T1 = trench(
  't1',
  [[-40, 488], [150, 494], [300, 508], [440, 526], [600, 538], [730, 542], [860, 524], [990, 488], [1110, 456], [1260, 436], [1440, 424]],
  [[-40, 760], [40, 752], [120, 740], [200, 740], [280, 752], [340, 774], [400, 802], [460, 820], [540, 818], [620, 810], [700, 806], [760, 802], [800, 792], [850, 786], [900, 760], [960, 724], [1036, 716], [1068, 766], [1082, 860], [1090, 960], [1094, 1060]],
  // 동쪽 바닥은 메사의 서쪽 벼랑에서 끝난다 (메사 꼭대기는 양피지 — 숲 기호가 보이게)
  { close: [[1460, 424], [1470, MESA_W[0][1]], ...MESA_W, [1470, 1110], [1094, 1110]], jagA: 4.6 },
)
const h1v = wobble('t1:hv', 38, 7)
const h1k = curve([[-40, 56], [200, 70], [420, 96], [560, 112], [800, 114], [960, 98], [1110, 80], [1300, 68], [1440, 62]])
const rimN1 = (x) => yAt(T1.A, x)
const sS1 = (x) => yAt(T1.B, x)

// 북쪽 끝에서 남서로 내려와 큰 협곡에 드는 갈래 (T2) — 지류가 흐른다. 세계 지도의 지류를 가운데 두고 양쪽 가장자리
const brIn = BRANCH.filter((p) => p[1] > -90 && p[1] < 560)
const brSub = brIn.filter((_, i) => i % 3 === 0 || i === brIn.length - 1)
const w2 = (t) => 31 + 7 * t
const cutAtRim = (pts) => {
  const out = []
  for (const p of pts) {
    if (p[1] >= rimN1(p[0]) - 2) {
      const q = out[out.length - 1]
      const f = (rimN1(q[0]) - q[1]) / (p[1] - q[1] - (rimN1(p[0]) - rimN1(q[0])) || 1)
      const x = lerp(q[0], p[0], clamp(f, 0, 1))
      out.push([x, rimN1(x)])
      break
    }
    out.push(p)
  }
  return out
}
const t2A = cutAtRim(K.offset(brSub, (t) => -w2(t)))
const t2B = cutAtRim(K.offset(brSub, w2))
const eA = t2A[t2A.length - 1]
const eB = t2B[t2B.length - 1]
const gapL = Math.min(eA[0], eB[0])
const gapR = Math.max(eA[0], eB[0])
const T2 = trench('t2', t2A, t2B, { close: [[eA[0], rimN1(eA[0]) + 60], [eB[0], rimN1(eB[0]) + 60]] })
const h1raw = (x) => h1k(x) + h1v(x) * clamp((Math.abs(x - 600) - 40) / 60, 0, 1)
// Unstable Footing (페이즈 대상)의 자리 — 그림 좌표(viewBox 1 5 98 92, 기준점 58 47.96)로 잡는다. 윗턱(그림 y 12.5)이 큰 협곡 가장자리에 온다.
// 그 밑에서는 벽 밑동(바닥 가장자리)을 그림 밑선까지 올려, 그림이 벽 중간에 걸린 액자가 아니라 바닥에 선 바위 토막으로 읽히게 한다
const FOOT_X = 420
const FOOT_SIZE = 118
const footS = FOOT_SIZE / 98
const FOOT_Y = rimN1(FOOT_X) + (47.96 - 12.5) * footS
const footAt = ([u, v]) => [FOOT_X + (u - 58) * footS, FOOT_Y + (v - 47.96) * footS]
const FOOT_L = footAt([1, 0])[0]
const FOOT_R = footAt([99, 0])[0]
const FOOT_BOT = footAt([0, 90])[1]
const h1 = (x) => {
  const h = h1raw(x)
  const d = x < FOOT_L ? FOOT_L - x : x > FOOT_R ? x - FOOT_R : 0
  const w = 1 - clamp(d / 26, 0, 1)
  return w > 0 ? Math.min(h, lerp(h, FOOT_BOT - rimN1(x) + 1.5, w * w * (3 - 2 * w))) : h
}
// 갈래가 큰 협곡에 드는 어귀 — 벽을 비스듬히 가르는 틈 (갈래가 남서로 들어오므로 틈도 밑으로 갈수록 서쪽으로 비낀다)
const SLANT = 46
const eastSgn = eB[0] > eA[0] ? 1 : -1

// 북쪽 좁은 협곡 (T4) — 서쪽 끝은 막혔고 동북동으로 굽이치며 동쪽 끝으로
const T4 = trench(
  't4',
  [[476, 272], [456, 258], [454, 236], [474, 222], [540, 212], [620, 232], [700, 250], [790, 248], [880, 226], [960, 198], [1050, 190], [1140, 170], [1240, 160], [1330, 138], [1440, 128]],
  [[480, 276], [506, 282], [540, 262], [620, 282], [700, 300], [790, 298], [880, 274], [960, 246], [1050, 232], [1140, 216], [1240, 204], [1330, 186], [1440, 178]],
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
// 큰 협곡 남쪽 가장자리에서 남으로 내려가는 마른 협곡 (S) — 맨바위 바닥
const S = trench('s', [[352, sS1(352) - 8], [358, 852], [344, 906], [312, 958], [300, 1016]], [[414, sS1(414) - 8], [418, 862], [402, 916], [368, 968], [356, 1016]])

const parts = []
const add = (...ps) => parts.push(...ps.flat())

// 바닥 (그늘) — 갈래가 만나는 곳은 바닥이 이어진다
add(T1.floor, T2.floor, T4.floor, T5.floor, T3.floor, S.floor)
// 맨바위 바닥 — 잔돌 (물길·작은 대상·소 떼 둘레는 비운다)
add(
  gravel(0, 520, 1080, 830, 300, 'g1', (x, y) =>
    y > rimN1(x) + h1(x) + 6 && y < sS1(x) - 10 && distTo(RIVER, x, y) > 16 && distTo(BRANCH, x, y) > 14 && !(x > 590 && x < 720 && y < 700) && !(x > 830 && x < 960 && y > 680 && y < 745) && !(x > FOOT_L - 6 && x < FOOT_R + 12 && y < FOOT_BOT + 42) && !(x > gapL - SLANT - 10 && x < gapR + 10 && y < rimN1(x) + h1(x) + 20)),
)
add(gravel(330, 830, 420, 1000, 26, 'g-s', (x, y) => y > sS1(x) + 8 && x > xAt(S.A, y) + 6 && x < xAt(S.B, y) - 6))

// 큰 협곡의 북쪽 벽 — 지층 띠가 서쪽 끝에서 동쪽 끝까지, 지류의 갈래가 드는 어귀에서만 갈린다. T3 은 벽 위에 걸린 골짜기로,
// 가장자리에 V 자로 팬 자리에서 끝난다 (물은 그리지 않는다 — 폭포가 아니다)
const notches = [[1042, 1094, 22]]
const dip = (x) => {
  for (const [a, b, d] of notches) if (x > a && x < b) return d * Math.pow(1 - Math.abs((2 * (x - a)) / (b - a) - 1), 1.2)
  return 0
}
const N1v = T1.A.map(([x, y]) => [x, y + dip(x)])
const W1 = wallFace('t1', N1v, (x) => h1(x) - dip(x), { bands: 5 })
add(W1.parts)
// 어귀의 틈 — 벽 위에 바닥 그늘을 덮고, 양쪽 벽 모서리를 긋는다. 동쪽 모서리 안쪽은 그늘 빗금
{
  const base = (x) => rimN1(x) + h1(x)
  const tl = [gapL, rimN1(gapL)]
  const tr = [gapR, rimN1(gapR)]
  const bl = [gapL - SLANT, base(gapL - SLANT)]
  const br = [gapR - SLANT, base(gapR - SLANT)]
  add(P('shade', K.poly([[tl[0], tl[1] - 3], [tr[0], tr[1] - 3], [br[0], br[1] + 3], [bl[0], bl[1] + 3]])))
  let sh = ''
  for (let k = 1; k <= 7; k++) {
    const u = k / 8
    const a = [lerp(tr[0], br[0], u), lerp(tr[1], br[1], u)]
    sh += K.line([a, [a[0] - 7 - (k % 2) * 3, a[1] + 2]])
  }
  add(P('hatch', sh), P('ink-bold', K.line([tl, bl])), P('ink', K.line([tr, br])))
}

// 급류 — 세계 지도의 두 물길. 솟는 곳(큰 협곡 남쪽 벽 밑)은 가늘고 하류로 갈수록 넓다. 지류는 갈래 바닥과 어귀의 틈을 지나 본류에 든다
const RIV = RIVER.filter((p) => p[0] > -60)
const BRV = BRANCH.filter((p) => p[1] > -60)
add(K.river(RIV, 4, 15), K.river(BRV, 4.5, 10))
add(whitewater(RIV.slice(3), 38, 'ww', (x) => x > 785), whitewater(BRV.slice(0, -4), 40, 'wwb'))

// 가장자리 — 선과 바닥 쪽 빗금 (갈래가 만나는 곳은 비운다). 큰 협곡만 굵은 선
// 마른 협곡(S)의 어귀 — 큰 협곡의 남쪽 가장자리는 S 의 두 가장자리가 시작하는 곳에서 끊기고, S 의 가장자리는 그 끊긴 끝에서 이어 시작한다
const between = (pts, lo, hi) => pts.filter((p) => p[1] > lo(p[0]) - 1 && p[1] < hi(p[0]) + 1)
const sRimA = between(S.A, sS1, () => 1e9)
const sRimB = between(S.B, sS1, () => 1e9)
const inMouth = ([x, y]) => x > sRimA[0][0] && x < sRimB[0][0] && y > 740 && y < 840
const t1Pre = T1.B.filter((p) => p[0] <= sRimA[0][0] && p[1] > 740).pop()
const t1Post = T1.B.find((p) => p[0] >= sRimB[0][0] && p[1] > 740 && p[1] < 840)
add(rim(T1.B, T1.A, 't1b', { skip: inMouth, share: 0.14, max: 18, bold: true }))
// 가장자리에 걸친 대상의 이름표 밑은 빗금을 비운다 (선은 남는다) — 갈고리 명수·코르 정찰병(T2), 바위 틈 고블린(S).
// 칸은 패널을 연 작은 배율(×0.6)에서 이름표가 넓어지는 만큼 넉넉히
const capBox = (x0, y0, x1, y1) => (x, y) => x > x0 && x < x1 && y > y0 && y < y1
const underT2Caps = (x, y) => capBox(128, 428, 262, 474)(x, y) || capBox(244, 288, 368, 332)(x, y)
const underSCaps = capBox(330, 874, 500, 918)
add(rim(T2.A, T2.B, 't2a', { noTick: underT2Caps }), rim(T2.B, T2.A, 't2b', { noTick: underT2Caps }))
add(rim(T4.A, T4.B, 't4a'), rim(T4.B, T4.A, 't4b', { skip: ([x]) => (x > 834 && x < 896) || (x > 1092 && x < 1150) }))
add(rim(between(T5.A, sN4, () => 1e9), T5.B, 't5a', { share: 0.28 }), rim(between(T5.B, sN4, () => 1e9), T5.A, 't5b', { share: 0.28 }))
// T3 위를 건너뛰는 코르 비행사(대상)와 그 이름표 밑은 빗금을 비워 깨끗이 읽히게 한다 (AERO 는 아래 subjects 와 같은 자리).
// 이름표(그림 밑 가운데)의 왼쪽 끝이 T3 서쪽 가장자리 선 밖에서 시작하도록 몸 가운데를 협곡 가운데보다 조금 동쪽에 둔다
const AERO = [1120, 262]
const underAero = (x, y) => x > AERO[0] - 54 && x < AERO[0] + 60 && y > AERO[1] - 24 && y < AERO[1] + 54
add(rim(between(T3.A, sN4, rimN1), T3.B, 't3a', { noTick: underAero }), rim(between(T3.B, sN4, rimN1), T3.A, 't3b', { noTick: underAero }))
add(rim([t1Pre, ...sRimA], S.B, 'sa', { noTick: underSCaps }), rim([t1Post, ...sRimB], S.A, 'sb', { noTick: underSCaps }))

// Prison of Omnath 의 메사 — 서쪽 벼랑 (세계 지도처럼 빗금이 바깥 아래로 떨어진다). 꼭대기는 숲 (지형 칸)
add(K.cliff(MESA_W, { mode: 'hachure', side: 1, depth: 40, step: 8, seed: 'mesa' }))

// 메사 — 넓은 바닥에 선 평평한 꼭대기 바위산 둘(옆에서 본 모습, 지층 턱과 너덜 비탈). 그리고 가는 바위 기둥 하나
add(K.stack([
  { y: 612, parts: butte(1290, 612, 54, 56, 'm3') },
  { y: 905, parts: butte(1206, 905, 96, 100, 'm1') },
  // 가는 바위 기둥 — 지층 턱이 있는 좁은 굴뚝 바위 (매끈한 첨탑은 오벨리스크처럼 보인다)
  { y: 640, parts: butte(1190, 640, 20, 74, 'pillar') },
]))

// 불안정한 봉우리 — 카드 표시가 밑동에 앉은 큰 봉우리를 가운데로 한 무리 넷, 그리고 다른 고원 셋에 작은 것 하나씩 ('throughout').
// 표시 이름(밑)이 놓이는 칸은 패널을 연 작은 배율(×0.6)에서도 비도록 x 65–235 · y 111–157 을 비운다
add(K.stack([
  { y: 104, parts: teeter(150, 104, 76, 50, 'tp-a', -6, 0.08) },
  { y: 68, parts: teeter(214, 68, 48, 30, 'tp-b', 8, -0.1) },
  { y: 106, parts: teeter(44, 106, 54, 34, 'tp-c', -4, 0.12) },
  { y: 148, parts: teeter(290, 148, 58, 36, 'tp-d', 6, -0.08) },
  { y: 372, parts: teeter(456, 372, 54, 33, 'tp-f2', 5, -0.06) },
  { y: 800, parts: teeter(160, 800, 48, 29, 'tp-i', -6, -0.1) },
  { y: 402, parts: teeter(1172, 402, 52, 31, 'tp-h', 7, 0.08) },
]))

// 고블린 굴 — 작은 대상 오른쪽 벽 높이 굴 여섯, 셋은 머리를 내민다. 다른 벽에도 작은 무리
add(warren([[688, rimN1(688) + 30, 13], [716, rimN1(716) + 54, 12, true], [742, rimN1(742) + 26, 13], [772, rimN1(772) + 48, 13, true], [802, rimN1(802) + 28, 12, true], [830, rimN1(830) + 58, 11]]))
add(warren([[22, rimN1(22) + 26, 10], [46, rimN1(46) + 38, 10, true], [70, rimN1(70) + 24, 9]]))
add(warren([[596, yAt(T4.A, 596) + 14, 9], [620, yAt(T4.A, 620) + 17, 8]]))

// Unstable Footing (페이즈 대상) — 벽에 붙은 좁은 턱길이 무너져 내리는 벼랑 그림. 큰 협곡 북쪽 벽(보는 쪽 면)에 윗턱을 가장자리에,
// 밑을 벽 밑동에 맞춰 박아 벽에서 조금 내민 바위 토막(오른쪽에 그늘)으로 읽히게 하고, 마찻길의 갈지자가 그 턱길로 들어가
// 무너진 곳을 지나 오른쪽 턱 끝에서 다시 내려가게 한다. 그림 좌표(viewBox 1 5 98 92, 기준점 58 47.96)로 자리를 잡는다
{
  // 내민 바위 토막의 오른쪽 그늘 — 그림의 오른쪽 가장자리를 따라 벽 면에 좁은 띠, 밑으로 갈수록 조금 넓다
  const edge = [[93.6, 18.6], [95, 26], [93.8, 40], [96, 54], [95.6, 70], [97.6, 84], [99, 90]].map(footAt)
  const out = edge.map(([x, y], i) => [x + 6 + i * 0.9, y + 3])
  out[out.length - 1][1] = edge[edge.length - 1][1]
  let hatch = ''
  for (let i = 0; i < edge.length - 1; i++) {
    const [ax, ay] = edge[i]
    const [bx, by] = edge[i + 1]
    for (const t of [0.25, 0.75]) {
      const x = lerp(ax, bx, t) + 2.5 + i * 0.3
      const y = lerp(ay, by, t)
      hatch += K.line([[x, y - 3], [x + 0.3, y + 4]])
    }
  }
  add(P('shade', K.poly([...edge, ...[...out].reverse()])), P('hatch', hatch))
  // 밑동의 너덜 — 무너진 턱에서 떨어진 돌이 토막의 양쪽 밑 모서리에 쌓여, 네모난 밑선이 바닥에 묻힌다 (이름표 위로는 오지 않게)
  const fr = (x) => rimN1(x) + h1(x)
  add(K.rocks(FOOT_L - 4, FOOT_BOT + 1, 5, 3, 'ft-l'), K.rocks(FOOT_R + 6, fr(FOOT_R + 6) + 1, 5, 3, 'ft-r'))
}

// 마찻길 — 북쪽에서 지류 갈래의 동쪽 가장자리를 따라 내려와, 큰 협곡 가장자리에서 벽을 갈지자로 내려가다 동쪽 턱길로 들어선다.
// 턱길이 무너진 곳(Unstable Footing) 너머 아래턱 끝에서 다시 갈지자로 내려가 바닥에 닿는다
{
  const top = K.offset(brSub, (t) => eastSgn * (w2(t) + 17)).filter((p) => p[1] > -24 && p[1] < rimN1(p[0]) - 18)
  const r = rimN1(322)
  const inA = footAt([6.2, 32.4])
  const outB = footAt([95.6, 57.6])
  // 가장자리에서 갈지자 둘 (지류 갈래 어귀의 틈과 그림 사이 벽), 마지막 다리는 턱길 들머리로
  const zig = [[298, r - 2], [342, r + 11], [280, r + 25], [inA[0] - 5, inA[1] + 1]]
  // 아래 갈지자 — 그림 이름표(그림 밑 가운데)를 비켜 동쪽으로, 마지막은 벽 밑동을 지나 바닥에 닿는다
  const down = [[outB[0] + 9, outB[1] + 1], [outB[0] + 44, outB[1] + 18], [outB[0] + 20, outB[1] + 38], [outB[0] + 50, rimN1(outB[0] + 50) + h1(outB[0] + 50) + 8]]
  add(K.dashed([...top, ...zig], 6, 4), K.dashed(down, 6, 4))
}

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

// 떠도는 바위 — 동북 고원 위. 고마조아(페이즈 대상)가 그 사이에 떠서 촉수를 큰 협곡 북쪽 가장자리로 늘어뜨린다.
// 큰 바위는 고마조아의 갓보다 왼쪽 위에 두어, 땅에 진 그림자가 갓에 붙지 않게 한다
add(berg(1234, 280, 64, 40, 26, 'berg1'), berg(1352, 352, 38, 23, 22, 'berg2'))

// 털 많고 뿔이 말린 소 떼 (ZNR Makindi Stampede) — 넓은 바닥을 서쪽으로 내닫는다, 뒤로 흙먼지
add(dust(924, 716, 24, 10, 'dust'))
add(K.stack([[852, 722, 22], [878, 710, 20], [898, 732, 22], [920, 716, 19]].map(([x, y, s], i) => ({ y, parts: ox(x, y, s, `ox${i}`) }))))

// 새 — 벼랑 둘레 (무너지는 턱길 그림의 동쪽, 가장자리 바로 밑 벽 앞)
add(birds([[526, 558, 4.2], [542, 549, 3.4], [512, 547, 3]]))

// 바람 — 협곡에서 불어 나오는 소용돌이
add(wind(1166, 560, 22, 1, 'w1'), wind(44, 618, 20, -1, 'w2'))

// 옛 유적 — 닳아 자갈이 된 낮은 벽 토막 (AoM 'nameless ruins worn to gravel')
// (창 구멍은 뺀다 — 구멍 난 벽은 서 있는 집처럼 읽힌다)
const worn = (...a) => K.ruin(...a).filter((p) => p.cls !== 'dark')
// (스카이피셔 이름표와 Unstable Footing 이름표 사이, 두 이름표보다 조금 아래 — 어느 쪽에도 닿지 않게)
add(worn(332, 668, 26, 8, 'ru1'), worn(357, 680, 16, 6, 'ru2'), gravel(312, 660, 368, 690, 44, 'g-ru', (x, y) => distTo(RIVER, x, y) > 14))

// 바위 틈 고블린 (PG: Goblins 'fissures between boulders and converging crags') — 두 바위가 서로 기대 ㅅ 자로 만나고,
// 그 밑이 좁고 어두운 틈. 옆에 작은 바위 하나, 앞에 돌 몇. 이름은 달지 않는다 — 남쪽 고원, 마른 협곡(S) 목의 Goblin Bushwhacker
// 바로 동쪽 (그 이름표 오른쪽 끝에 닿지 않게, 패널을 연 작은 배율에서도)
const CX = -36
const CY = 122
const mv = (pts) => pts.map(([x, y]) => [x + CX, y + CY])
const crag = (out, shade, hatch) => [P('fill', K.poly(mv(out))), P('shade', K.poly(mv(shade))), P('hatch', hatch.map((l) => K.line(mv(l))).join('')), P('ink', K.poly(mv(out)))]
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
  P('dark', K.poly(mv([[576.5, 800], [579, 759.5], [580.3, 758.5], [584, 801]]))),
  K.rocks(562 + CX, 806 + CY, 4.5, 2, 'fk-r'),
)

CHILDMAPS.push({
  id: 'makindi-trenches',
  size: [1400, 1000],
  glyphScale: 4,
  terrain: [
    // 세계 지도의 협곡 기호 — 손으로 그린 협곡 밖의 고원에
    // (마찻길·지류 갈래에서 떨어지게 서쪽 끝은 x 640, 기호 끝이 T4 가장자리에 닿지 않게 남쪽 끝은 가장자리에서 50 남짓 위.
    // 방패 동료와 장비 담당이 선 서쪽 칸(x 640–955)은 위쪽 띠만 남겨 두 사람과 이름표 둘레를 비운다)
    { kind: 'canyon', points: [[640, -10], [1420, -10], [1420, 62], [1240, 100], [1140, 112], [1050, 140], [960, 156], [955, 60], [640, 30]], density: 0.75 },
    // 남쪽 고원 — 마른 협곡(S)을 사이에 두고 서쪽과 동쪽 두 칸. 칸이 좁아 시작점을 못 받지 않게 틀 밖(서쪽·아래)으로 넉넉히 늘린다.
    // 서쪽 칸은 코르 성직자들과 그 이름표 밑으로, 동쪽 칸은 바위 틈 고블린의 바위들 밑으로 물려 둔다
    { kind: 'canyon', points: [[-400, 896], [150, 904], [210, 960], [282, 960], [276, 1000], [262, 1400], [-400, 1400]], density: 0.75 },
    // Omnath 메사 꼭대기의 숲 (세계 지도의 prison-of-omnath-forest) — 서쪽 가장자리만 이 범위에 든다
    { kind: 'forest', points: FOREST },
    { kind: 'canyon', points: [[452, 1000], [446, 966], [600, 972], [650, 890], [668, 890], [668, 2600], [452, 2600]], density: 0.75 },
    // 서북 고원 — 봉우리 무리 밑, 지류 갈래의 서쪽 (세계 지도가 이 둘레에 협곡 기호를 깐다). 틀 밖 서쪽으로 늘린다.
    // 동쪽 끝은 갈래 가장자리에 선 갈고리 명수와 그 이름표에서 물린다
    { kind: 'canyon', points: [[-800, 190], [60, 186], [250, 196], [236, 222], [190, 262], [130, 320], [100, 380], [90, 452], [-800, 452]], density: 0.7 },
  ],
  // 빗금은 정수로 — 가는 선의 0.1 단위는 보이지 않는다
  parts: parts.filter((p) => p.d).map((p) => (p.cls === 'hatch' ? { cls: p.cls, d: p.d.replace(/-?\d+\.\d+/g, (v) => String(Math.round(Number(v)))) } : p)),
  // 지역 이름 — 휴대폰 첫 화면(focus 중심, 폭 약 470 단위)에서 왼쪽 끝이 잘리지 않고 T5 와 Grappling Hook 이름표에 닿지 않는 자리
  labels: [{ text: 'Makindi Trenches', textKo: '마킨디 협곡', at: [704, 432], size: 28, kind: 'area', rotate: -3 }],
  subjects: {
    // 코르 정찰병 — 지류 갈래(T2)를 밧줄 하나로 건넌다. 그림의 두 바위 벼랑 밑동이 갈래의 두 가장자리에 걸린다
    'cliff-threader': { at: [305, 245], size: 100 },
    // 갈고리 명수 — 지류 갈래 서쪽 가장자리 끝에 서서 동쪽(협곡 쪽)으로 갈고리를 던진다. 그림의 바위 턱 끝이 가장자리 선에 닿는다
    'kor-hookmaster': { at: [192, 420], size: 95 },
    // 장비 담당 — 북쪽 좁은 협곡(T4) 북쪽 고원, 줄에 매단 거처가 걸린 막힌 갈래(T5) 위의 천막 곁 (AoM: 코르의 거처가 탐험가들의 발판이 된다).
    // 이름표가 T4 가장자리 선에 얹히지 않게 가장자리에서 조금 물러서고, 방패 동료와 이름표 줄을 맞춘다
    'kor-outfitter': { at: [870, 172], size: 100 },
    // 방패 동료 — 갈래 협곡 북쪽의 트인 고원
    'makindi-shieldmate': { at: [660, 170], size: 95 },
    // 코르 성직자 둘 — 서남 고원, 마른 협곡(S) 서쪽 (이름표 오른쪽 끝이 S 의 서쪽 가장자리 선과 Goblin Bushwhacker 이름표에 닿지 않게)
    'kor-sanctifiers': { at: [252, 905], size: 95 },
    // 스카이피셔 — 큰 협곡 서쪽, 북쪽 벽의 지층을 지나 바닥으로 내리꽂힌다 (연 돛 끝이 지류 갈래 어귀의 틈에도, 마찻길 갈지자에도 닿지 않는 자리)
    'kor-skyfisher': { at: [272, 592], size: 100 },
    // 무너지는 옛 코르 마을 — 큰 협곡 동쪽의 넓은 바닥, 바위 기둥과 메사 사이. 나히리가 찾은 이름 없는 도시(Stirring from Slumber)이며
    // 수도 마킨디가 아니다 — 이름을 달지 않고 그림 이름표만 둔다
    'demolish': { at: [1140, 722], size: 104 },
    // 바위 틈 고블린 — 남쪽 곁협곡(S)의 곧은 목, 그림의 두 바위 벽이 S 의 두 가장자리에 겹친다
    'goblin-bushwhacker': { at: [416, 852], size: 86 },
    // 코르 비행사 — 동쪽 갈래(T3)를 서쪽 가장자리에서 동쪽으로 건너뛴다 (몸이 두 가장자리에 걸친다)
    'kor-aeronaut': { at: AERO, size: 104 },
    // 코르 결투가 — 큰 협곡 북쪽, 지역 이름 서쪽의 트인 고원 (휴대폰 첫 화면의 왼쪽 끝에 사슬 끝만 걸리지 않게 조금 서쪽)
    'kor-duelist': { at: [516, 478], size: 96 },
    // 고마조아 — 떠도는 바위 둘 사이, 촉수가 큰 협곡 북쪽 가장자리 너머로 늘어진다
    'gomazoa': { at: [1288, 366], size: 100 },
    // 무너지는 턱길 — 큰 협곡 북쪽 벽, 마찻길 갈지자 동쪽 (위 FOOT_* 와 같은 값)
    'unstable-footing': { at: [FOOT_X, Math.round(FOOT_Y * 10) / 10], size: FOOT_SIZE },
    'armament-master': { at: [926, 910], size: 102 },
    'conquerors-pledge': { at: [790, 946], size: 112 },
    'devout-lightcaster': { at: [962, 424], size: 100, flip: true },
    'grappling-hook': { at: [764, 334], size: 68 },
    'warren-instigator': { at: [625, 650], size: 100 },
  },
  markAnchors: { 'card:teetering-peaks': 'below' },
  // 휴대폰 첫 화면(폭 약 468 단위) — 지역 이름과 가운데 대상 다섯이 들고, 코르 결투가는 조각 없이 밖에 남는 자리
  focus: [796, 640],
})
