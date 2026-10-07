// 마킨디 협곡 (Makindi Trenches) — 온두 본토를 가르는 높은 벽 협곡의 미로. 자식 지도 원본 (세계 x 240–380 · y 935–1035 ×10).
// 보는 법: 고원 윗면은 양피지, 협곡 바닥은 그늘(shade), 보는 쪽(남쪽)을 향한 벽은 지층 띠를 두른 바위 면, 먼 쪽 가장자리는
// 협곡 안쪽으로 짧은 빗금 — 세계 지도의 협곡 기호(빗금 단 호)를 이 축척으로 푼 것.
// 근거(scratchpad brief): 협곡의 미로·지층 벽·급류 또는 맨바위 바닥(PG: Ondu 2009, AoM 2016), 발굽에 다져진 바닥과
// 메사(ZNR Makindi Stampede // Makindi Mesas), 불안정한 봉우리(PG·AoM·ZEN 카드), 암벽 고블린 굴(PG: Goblins, AoM),
// 코르의 매달린 거처·닻줄(AoM), 벼랑 가장자리 마찻길(PG), 바람(PG), 떠도는 바위(AoM, ZNR 그림), 고모조아(Plane Shift).
// 협곡 갈래의 모양, 메사·급류·마찻길·굴·거처·봉우리·유적·짐승의 자리는 이 지도의 해석이다.

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

/** 1차원 값 잡음 — 가장자리를 들쭉날쭉하게 */
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
function dense(ctrl, step = 4) {
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

/** 꺾은선을 법선 방향으로 잡음만큼 흔든다 */
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

/** 꺾은선을 끊어진 토막들로 (지층선·잔물결) */
function broken(pts, rand, onR = [6, 16], offR = [1, 3]) {
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

/** 가장자리에서 한쪽(sgn: 진행 방향 왼쪽 +1 / 오른쪽 -1)으로 내린 짧은 빗금 — 세계 지도의 협곡 기호처럼 */
function rimTicks(pts, sgn, len, seed, step = 7) {
  const rand = K.rng(seed)
  let d = ''
  for (const [[x, y], [ux, uy]] of K.along(pts, step)) {
    const l = len * (0.45 + rand() * 0.55)
    d += K.line([[x, y], [x + uy * sgn * l, y - ux * sgn * l]])
  }
  return d
}

// ---------- 협곡 ----------

/**
 * 동서로 달리는 협곡. N·S: 북·남 가장자리 꺾은선(서→동, 촘촘), h(x): 북쪽 벽(보는 쪽을 향한 면)의 높이.
 * 돌려주는 것: floor(바닥 다각형), face(벽 띠의 윗선·아랫선)
 */
function ewTrench(id, nCtrl, sCtrl, h, o = {}) {
  const Nraw = dense(nCtrl)
  const N = jagged(Nraw, `${id}:n`, o.jag ?? 4, 1.4)
  const S = jagged(dense(sCtrl), `${id}:s`, o.jag ?? 4, 1.4)
  const fw = wobble(`${id}:f`, 9, 1.3)
  const F = Nraw.map(([x, y], i) => [N[i][0], Math.max(N[i][1] + 2, Math.min(y + h(x) + fw(x), yAt(S, x) - (o.minFloor ?? 12)))])
  return { id, N, S, F, close: o.close ?? [] }
}

/** 바닥 — 그늘진 협곡 바닥 */
function floorPart(t) {
  return P('shade', K.poly([...t.N, ...t.close, ...[...t.S].reverse()]))
}

/**
 * 보는 쪽을 향한 벽 — 바위 띠, 지층선(끊긴 가로줄), 어두운 지층의 세로 빗금, 가장자리에서 늘어진 짧은 빗금(도구의 벼랑 모양),
 * 벽 밑선. from·to: 벽을 그릴 x 범위
 */
function faceParts(t, o = {}) {
  const rand = K.rng(`${t.id}:face`)
  const lo = o.from ?? -1e9
  const hi = o.to ?? 1e9
  const idx = t.N.map((p, i) => i).filter((i) => t.N[i][0] >= lo && t.N[i][0] <= hi && t.F[i][1] - t.N[i][1] > 1.5)
  if (idx.length < 2) return []
  const N = idx.map((i) => t.N[i])
  const F = idx.map((i) => t.F[i])
  const bands = o.bands ?? 4
  const fr = [0]
  for (let b = 1; b < bands; b++) fr.push(b / bands + (rand() - 0.5) * (0.5 / bands))
  fr.push(1)
  const sw = wobble(`${t.id}:sw`, 50, 0.035)
  const at = (i, f) => [N[i][0], N[i][1] + (F[i][1] - N[i][1]) * f]
  let strata = ''
  for (let b = 1; b < bands; b++) {
    strata += broken(N.map((p, i) => at(i, clamp(fr[b] + sw(p[0] + b * 977), 0.06, 0.94))), rand)
  }
  // 어두운 지층 — 하나 걸러 세로 빗금, 맨 아래 지층은 그늘이라 촘촘히
  let dark = ''
  for (let b = 0; b < bands; b++) {
    const deep = b === bands - 1
    if (!deep && b % 2 === 0) continue
    for (let i = 0; i < N.length; i += deep ? 1 : 2) {
      const top = fr[b] + 0.04 + rand() * 0.05
      const bot = fr[b + 1] - 0.03 - rand() * (deep ? 0.04 : 0.12)
      const [x, ya] = at(i, top)
      const yb = at(i, bot)[1]
      if (yb - ya < 2.5) continue
      dark += K.line([[x, ya], [x - 0.4, yb]])
    }
  }
  // 가장자리에서 늘어진 빗금 (도구의 벼랑 면)
  let fringe = ''
  for (let i = 0; i < N.length; i += 2) {
    const l = (F[i][1] - N[i][1]) * (0.1 + rand() * 0.16)
    fringe += K.line([N[i], [N[i][0], N[i][1] + l]])
  }
  return [P('stone', K.poly([...N, ...[...F].reverse()])), P('hatch', strata + dark + fringe), P('ink', K.line(F)), P('ink-bold', K.line(N))]
}

/** 먼 쪽 가장자리 — 굵은 선과 협곡 쪽 짧은 빗금. skip 에 걸린 곳(갈래 협곡의 입구)은 비운다 */
function farRimParts(pts, sgn, seed, o = {}) {
  let ticks = ''
  let ink = ''
  for (const run of runs(pts, o.skip)) {
    ink += K.line(run)
    ticks += rimTicks(run, sgn, o.len ?? 15, `${seed}:t`)
  }
  return [P('hatch', ticks), P('ink-bold', ink)]
}

/** 남북으로 달리는 갈래 협곡 — 두 가장자리 모두 안쪽 빗금. 끝이 한 점으로 모이면 막다른 협곡 */
function nsTrench(id, wCtrl, eCtrl) {
  return { id, W: jagged(dense(wCtrl), `${id}:w`, 3, 1.1), E: jagged(dense(eCtrl), `${id}:e`, 3, 1.1) }
}

// ---------- 지형지물 도우미 ----------

/** 불안정한 봉우리 — 가는 바위 줄기 위에 얹힌 넓적한 바위 (ZEN 카드 그림·AoM 서술). (x, y) 는 밑동 */
function teeter(x, y, h, capW, seed, tilt = 0) {
  const rand = K.rng(seed)
  const capH = capW * 0.4
  const hs = h - capH * 0.8
  const lean = (rand() - 0.5) * capW * 0.18
  const b = capW * 0.22
  const tw = capW * 0.075
  const L = [[x - b, y], [x - lerp(b, tw, 0.55) + lean * 0.4, y - hs * 0.45], [x - tw * 1.2 + lean * 0.8, y - hs * 0.82], [x - tw + lean, y - hs]]
  const R = [[x + tw + lean, y - hs], [x + tw * 1.3 + lean * 0.8, y - hs * 0.8], [x + lerp(b, tw, 0.5) + lean * 0.4, y - hs * 0.42], [x + b * 1.05, y]]
  const stem = K.poly([...L, ...R])
  const stemShade = K.poly([[x + b * 0.25, y], [x + lean * 0.9 + tw * 0.2, y - hs], ...R])
  let hatch = ''
  for (let i = 1; i <= 3; i++) {
    const f = i / 4
    const ax = lerp(x + b * 0.35, x + lean + tw * 0.35, f)
    const bx = lerp(x + b * 0.9, x + lean + tw * 0.9, f)
    hatch += K.line([[ax, y - hs * f], [bx, y - hs * f + capW * 0.06]])
  }
  // 위는 평평하고 밑은 둥근 바위 — 살짝 기운다
  const cx = x + lean
  const cy = y - hs - capH * 0.42
  const rot = ((tilt + (rand() - 0.5) * 8) * Math.PI) / 180
  const T = ([px, py]) => [cx + px * Math.cos(rot) - py * Math.sin(rot), cy + px * Math.sin(rot) + py * Math.cos(rot)]
  const hw = capW / 2
  const capPts = [[-hw, -capH * 0.05], [-hw * 0.86, -capH * 0.42], [-hw * 0.3, -capH * 0.52], [hw * 0.4, -capH * 0.5], [hw * 0.95, -capH * 0.22], [hw, capH * 0.12], [hw * 0.62, capH * 0.42], [0, capH * 0.52], [-hw * 0.66, capH * 0.38]].map(T)
  const cap = K.smooth(capPts, true)
  const capShade = K.smooth([[hw * 0.25, -capH * 0.42], [hw * 0.95, -capH * 0.2], [hw, capH * 0.12], [hw * 0.62, capH * 0.42], [0, capH * 0.52], [-hw * 0.66, capH * 0.38], [-hw * 0.2, capH * 0.18], [hw * 0.45, 0]].map(T), true)
  const capHatch = K.line([[-hw * 0.7, capH * 0.02], [hw * 0.75, -capH * 0.04]].map(T)) + K.line([[hw * 0.5, -capH * 0.3], [hw * 0.38, capH * 0.3]].map(T)) + K.line([[hw * 0.72, -capH * 0.22], [hw * 0.6, capH * 0.26]].map(T))
  const base = K.line([[x - b * 1.9, y + 0.5], [x + b * 2.2, y + 0.5]])
  return [P('fill', stem + cap), P('shade', stemShade + capShade), P('hatch', hatch + capHatch + base), P('ink', stem), P('ink-bold', cap)]
}

/** 메사 — 넓고 평평한 윗면과 지층 띠를 두른 벽 (ZNR Makindi Mesas 그림). (cx, by) 는 벽 밑 가운데 */
function butte(cx, by, w, h, seed) {
  const rand = K.rng(seed)
  const top = by - h
  const d = w * 0.16
  // 윗면 — 비스듬히 본 평평한 고원
  const tp = []
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2
    const rr = 1 + (rand() - 0.5) * 0.14
    tp.push([cx + Math.cos(a) * (w / 2) * rr, top - d / 2 + Math.sin(a) * (d / 2) * rr])
  }
  // 앞쪽 가장자리(아래 반) — 0..π
  const front = tp.filter((p, k) => k <= 7).map((p) => [...p])
  front.sort((a, b) => b[0] - a[0])
  const left = front[front.length - 1]
  const right = front[0]
  const flare = w * 0.05
  const baseCtrl = [[right[0] + flare, by + (rand() - 0.5) * 4], [cx + w * 0.2, by + 3], [cx - w * 0.15, by + 2], [left[0] - flare, by + (rand() - 0.5) * 4]]
  const base = dense(baseCtrl, 4)
  const frontD = dense(front.reverse(), 4)
  // 벽: 왼쪽 위 → 앞 가장자리(왼→오) → 오른쪽 아래 → 밑선(오→왼)
  const face = K.poly([...frontD, ...base])
  // 지층 — 앞 가장자리와 밑선 사이를 나눈 끊긴 가로줄
  const m = 40
  const at = (u, f) => {
    const a = frontD[Math.round(u * (frontD.length - 1))]
    const bpt = base[Math.round((1 - u) * (base.length - 1))]
    return [lerp(a[0], bpt[0], f), lerp(a[1], bpt[1], f)]
  }
  let strata = ''
  const fr = [0.24, 0.43, 0.6, 0.78]
  for (const f of fr) {
    const line = []
    for (let k = 0; k <= m; k++) line.push(at(k / m, f + (rand() - 0.5) * 0.02))
    strata += broken(line, rand, [4, 12], [1, 2])
  }
  let ticks = ''
  for (let k = 0; k <= m; k++) {
    const u = k / m
    // 오른쪽(그늘)으로 갈수록 빗금이 길고 촘촘하다
    if (u < 0.45 && k % 2) continue
    const [x0, y0] = at(u, 0.02)
    const l = u > 0.62 ? 0.96 : 0.12 + rand() * 0.18
    const [, y1] = at(u, l)
    ticks += K.line([[x0, y0], [x0 - 0.3, y1]])
  }
  const shadeR = K.poly([...frontD.filter((p) => p[0] > cx + w * 0.18), ...base.filter((p) => p[0] > cx + w * 0.18 + flare)])
  const topD = K.smooth(tp, true)
  const talus = K.rocks(cx + w * 0.3, by + 2, 5, 3, `${seed}:r`).concat(K.rocks(cx - w * 0.36, by + 1, 4, 2, `${seed}:r2`))
  return [P('stone', face), P('shade', shadeR), P('hatch', strata + ticks), P('ink', K.line(base)), P('fill', topD), P('ink-bold', topD + K.line([[left[0], left[1]], [left[0] - flare, base[base.length - 1][1]]]) + K.line([[right[0], right[1]], [right[0] + flare, base[0][1]]])), ...talus]
}

/** 고블린 굴 — 벽에 판 작은 어두운 구멍 */
function hole(x, y, w) {
  const h = w * 0.85
  return `M${pt([x - w / 2, y])}C${pt([x - w / 2, y - h * 1.2])} ${pt([x + w / 2, y - h * 1.2])} ${pt([x + w / 2, y])}Z`
}
/** 굴에서 내민 고블린 머리 — 둥근 머리와 옆으로 뻗은 뾰족한 귀 */
function gobHead(x, y, s) {
  const head = `M${pt([x - s * 0.42, y])}C${pt([x - s * 0.46, y - s * 0.62])} ${pt([x + s * 0.46, y - s * 0.62])} ${pt([x + s * 0.42, y])}Z`
  const ears = K.poly([[x - s * 0.36, y - s * 0.28], [x - s * 1.05, y - s * 0.52], [x - s * 0.4, y - s * 0.1]]) + K.poly([[x + s * 0.36, y - s * 0.28], [x + s * 1.05, y - s * 0.52], [x + s * 0.4, y - s * 0.1]])
  return { fill: head + ears, ink: head + ears, eyes: K.line([[x - s * 0.16, y - s * 0.26], [x - s * 0.06, y - s * 0.26]]) + K.line([[x + s * 0.06, y - s * 0.26], [x + s * 0.16, y - s * 0.26]]) }
}
/** 굴 무리 — spots: [[x, y, w, 머리?]] */
function warren(spots) {
  let dark = ''
  let rim = ''
  let fill = ''
  let ink = ''
  let eyes = ''
  for (const [x, y, w, head] of spots) {
    dark += hole(x, y, w)
    rim += K.line([[x - w * 0.7, y + 0.6], [x + w * 0.7, y + 0.6]])
    if (head) {
      const g = gobHead(x, y + 0.2, w * 0.62)
      fill += g.fill
      ink += g.ink
      eyes += g.eyes
    }
  }
  return [P('dark', dark), P('hatch', rim), P('fill', fill), P('ink', ink), P('hatch', eyes)]
}

/** 코르의 임시 거처 — 천막 한 채 (뾰족한 천, 가운데 솔기) */
function tent(x, y, w, h) {
  const body = K.poly([[x - w / 2, y], [x, y - h], [x + w / 2, y]])
  const shade = K.poly([[x, y - h], [x + w / 2, y], [x + w * 0.08, y]])
  return [P('fill', body), P('shade', shade), P('hatch', K.line([[x, y - h], [x + w * 0.08, y]])), P('ink', body)]
}
/** 처진 줄 — a 에서 b 까지, 가운데가 sag 만큼 처진다 */
function sagLine(a, b, sag) {
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag * 2]
  return `M${pt(a)}Q${pt(m)} ${pt(b)}`
}
const sagAt = (a, b, sag, t) => {
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag * 2]
  const u = 1 - t
  return [u * u * a[0] + 2 * u * t * m[0] + t * t * b[0], u * u * a[1] + 2 * u * t * m[1] + t * t * b[1]]
}
/** 닻 갈고리 — 가장자리에 박은 말뚝 */
const anchor = ([x, y]) => K.line([[x, y + 1], [x, y - 5]]) + K.line([[x - 2, y - 3.5], [x, y - 5], [x + 2, y - 3.5]])

/** 바람 — 협곡 입구에서 불어 나오는 소용돌이 한 줄과 흐름선 (dir: 1 동쪽, -1 서쪽) */
function wind(x, y, s, dir, seed) {
  const rand = K.rng(seed)
  // 소용돌이
  const spiral = []
  for (let k = 0; k <= 26; k++) {
    const a = (k / 26) * Math.PI * 2.1
    const r = s * (0.55 - (k / 26) * 0.42)
    spiral.push([x + dir * (Math.cos(a + Math.PI) * r), y + Math.sin(a + Math.PI) * r])
  }
  let d = K.smooth(spiral)
  // 흐름선 — 소용돌이 뒤로 길게
  for (let k = 0; k < 3; k++) {
    const yy = y - s * 0.55 + k * s * 0.42 + (rand() - 0.5) * 2
    const x0 = x - dir * s * (0.2 + k * 0.15)
    const x1 = x0 - dir * s * (2.2 + rand() * 1.4)
    d += `M${pt([x0, yy])}Q${pt([(x0 + x1) / 2, yy - s * 0.12])} ${pt([x1, yy + s * 0.05])}`
  }
  return [P('hatch', d)]
}

/** 떠도는 바위 — 평평한 윗면, 뾰족한 밑, 지층 (헤드론·하늘거주지 조각과 다른 거친 덩어리). (x, y) 는 윗면 가운데 */
function slab(x, y, w, h, lift, seed) {
  const rand = K.rng(seed)
  const pts = [[x - w / 2, y + h * 0.05], [x - w * 0.3, y - h * 0.08], [x + w * 0.12, y - h * 0.06], [x + w / 2, y + h * 0.04], [x + w * 0.34, y + h * 0.42], [x + w * 0.16, y + h * 0.58], [x + w * 0.02, y + h], [x - w * 0.12, y + h * 0.62], [x - w * 0.36, y + h * 0.38]].map(([px, py]) => [px + (rand() - 0.5) * w * 0.04, py])
  const body = K.poly(pts)
  const shade = K.poly([[x + w * 0.1, y + h * 0.14], [x + w / 2, y + h * 0.04], [x + w * 0.34, y + h * 0.42], [x + w * 0.16, y + h * 0.58], [x + w * 0.02, y + h], [x - w * 0.02, y + h * 0.5]])
  const strata = K.line([[x - w * 0.44, y + h * 0.14], [x + w * 0.44, y + h * 0.13]]) + K.line([[x - w * 0.33, y + h * 0.36], [x + w * 0.3, y + h * 0.33]])
  const top = K.line([[x - w / 2, y + h * 0.05], [x - w * 0.3, y + h * 0.1], [x + w * 0.14, y + h * 0.08], [x + w / 2, y + h * 0.04]])
  const sy = y + h + lift
  const shadow = `M${pt([x - w * 0.36, sy])}A${r1(w * 0.36)} ${r1(w * 0.07)} 0 1 0 ${pt([x + w * 0.36, sy])}A${r1(w * 0.36)} ${r1(w * 0.07)} 0 1 0 ${pt([x - w * 0.36, sy])}Z`
  return [P('shade', shadow), P('stone', body), P('shade', shade), P('hatch', strata + top), P('ink', body)]
}

/** 고모조아 — 돌 껍질을 쓴 해파리, 길게 늘어진 촉수 (Plane Shift) */
function gomazoa(x, y, s, seed) {
  const rand = K.rng(seed)
  const bell = `M${pt([x - s / 2, y])}C${pt([x - s / 2, y - s * 0.85])} ${pt([x + s / 2, y - s * 0.85])} ${pt([x + s / 2, y])}Q${pt([x, y + s * 0.16])} ${pt([x - s / 2, y])}Z`
  let tent = ''
  for (let k = 0; k < 5; k++) {
    const tx = x - s * 0.36 + (k * s * 0.72) / 4
    const len = s * (1.6 + rand() * 1.1)
    tent += `M${pt([tx, y + s * 0.05])}C${pt([tx - s * 0.18, y + len * 0.35])} ${pt([tx + s * 0.2, y + len * 0.65])} ${pt([tx - s * 0.05, y + len])}`
  }
  const plates = K.line([[x - s * 0.3, y - s * 0.38], [x - s * 0.05, y - s * 0.12]]) + K.line([[x + s * 0.12, y - s * 0.6], [x + s * 0.22, y - s * 0.12]])
  return [P('stone', bell), P('hatch', plates), P('ink', bell + tent)]
}

/** 들소 — 털이 덥수룩하고 뿔이 말린 소 (ZNR Makindi Stampede 그림). (x, y) 발 밑 가운데, 서쪽(왼쪽)을 보고 달린다 */
function ox(x, y, s, seed) {
  const rand = K.rng(seed)
  const T = ([px, py]) => [x + px * s, y + py * s]
  const body = K.smooth([[0.55, -0.32], [0.42, -0.62], [0.05, -0.72], [-0.22, -0.82], [-0.42, -0.7], [-0.6, -0.52], [-0.68, -0.34], [-0.56, -0.24], [-0.3, -0.3], [0.1, -0.24], [0.5, -0.2]].map(T), true)
  const head = K.smooth([[-0.5, -0.62], [-0.72, -0.58], [-0.86, -0.4], [-0.82, -0.3], [-0.64, -0.32]].map(T), true)
  const horn = `M${pt(T([-0.6, -0.62]))}C${pt(T([-0.68, -0.86]))} ${pt(T([-0.9, -0.84]))} ${pt(T([-0.84, -0.66]))}`
  const g = rand() * 0.1
  const legs = K.line([T([-0.42, -0.28]), T([-0.56 - g, 0])]) + K.line([T([-0.3, -0.28]), T([-0.2, 0])]) + K.line([T([0.28, -0.24]), T([0.12 + g, 0])]) + K.line([T([0.42, -0.24]), T([0.6, -0.02])])
  const shag = K.line([T([-0.1, -0.7]), T([-0.12, -0.5])]) + K.line([T([0.1, -0.64]), T([0.08, -0.44])]) + K.line([T([0.3, -0.56]), T([0.28, -0.38])])
  const tail = K.line([T([0.52, -0.36]), T([0.66, -0.28])])
  return [P('fill', body + head), P('shade', K.smooth([[0.1, -0.24], [0.5, -0.2], [0.55, -0.32], [0.42, -0.5], [0.2, -0.4]].map(T), true)), P('hatch', shag), P('ink', body + head + horn + legs + tail)]
}

/** 먼지 — 무리 뒤로 이는 흙먼지 */
function dust(x, y, s, n, seed) {
  const rand = K.rng(seed)
  let d = ''
  for (let k = 0; k < n; k++) {
    const cx = x + rand() * s * 1.6
    const cy = y - rand() * s * 0.6
    const r = s * (0.18 + rand() * 0.14)
    d += `M${pt([cx - r, cy])}A${r1(r)} ${r1(r * 0.8)} 0 0 1 ${pt([cx + r, cy])}`
  }
  return [P('hatch', d)]
}

/** 새 — 벼랑 둘레의 작은 새 몇 */
function birds(spots) {
  let d = ''
  for (const [x, y, s] of spots) d += `M${pt([x - s, y - s * 0.2])}Q${pt([x - s * 0.5, y - s * 0.6])} ${pt([x, y])}Q${pt([x + s * 0.5, y - s * 0.6])} ${pt([x + s, y - s * 0.2])}`
  return [P('ink', d)]
}

/** 잔돌 — 맨바위 바닥과 무너진 돌 둘레의 점 */
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

/** 급류 — 바닥 가운데선 둘레의 끊긴 물결 (줄기를 잇지 않는다) */
function whitewater(center, seed, every = 3) {
  const rand = K.rng(seed)
  let d = ''
  for (let i = 0; i < center.length; i += every) {
    const [x, y] = center[i]
    const s = 4 + rand() * 3
    const ox2 = (rand() - 0.5) * 5
    const oy = (rand() - 0.5) * 4
    d += `M${pt([x + ox2 - s, y + oy])}Q${pt([x + ox2 - s / 2, y + oy - s * 0.4])} ${pt([x + ox2, y + oy])}Q${pt([x + ox2 + s / 2, y + oy + s * 0.4])} ${pt([x + ox2 + s, y + oy])}`
  }
  return [P('sea-ink', d)]
}

// ---------- 배치 ----------

// 큰 협곡 (이 지도의 중심) — 서쪽 끝에서 동쪽 끝까지. 동쪽에서는 바닥이 넓어져 메사가 선 평평한 바닥이 된다
const T1 = ewTrench(
  't1',
  [[-40, 448], [150, 458], [330, 492], [480, 526], [600, 537], [720, 541], [850, 523], [980, 486], [1100, 452], [1250, 432], [1440, 420]],
  [[-40, 588], [200, 610], [400, 660], [560, 724], [700, 736], [850, 722], [960, 706], [1028, 716], [1064, 768], [1080, 860], [1088, 960], [1094, 1060]],
  curve([[-40, 64], [250, 78], [450, 100], [560, 112], [800, 116], [950, 100], [1100, 84], [1300, 72], [1440, 66]]),
  { close: [[1460, 420], [1460, 1070], [1094, 1070]] },
)
// 북쪽 좁은 협곡 — 서쪽은 막다른 머리, 동쪽 끝으로 열린다
const T4 = ewTrench(
  't4',
  [[418, 262], [470, 246], [560, 238], [680, 246], [800, 252], [920, 238], [1040, 210], [1160, 178], [1300, 150], [1440, 132]],
  [[418, 262], [470, 290], [560, 302], [680, 312], [800, 316], [920, 302], [1040, 276], [1160, 244], [1300, 212], [1440, 196]],
  curve([[418, 0], [470, 30], [560, 44], [800, 50], [1100, 48], [1440, 44]]),
  { minFloor: 10, jag: 3.2 },
)
// 남쪽 협곡 — 서쪽 끝에서 동남으로 내려가 메사의 바닥으로 열린다
const T6 = ewTrench(
  't6',
  [[-40, 760], [120, 772], [300, 800], [480, 828], [650, 848], [820, 860], [960, 866], [1076, 868]],
  [[-40, 860], [120, 872], [300, 902], [480, 930], [650, 948], [820, 958], [960, 962], [1120, 966]],
  curve([[-40, 50], [300, 58], [600, 64], [900, 58], [1076, 48]]),
  { close: [[1120, 868]] },
)
// 북쪽 협곡에서 남으로 갈라져 막힌 갈래 — 코르의 줄이 걸린다
const T5 = nsTrench('t5', [[846, 300], [842, 340], [850, 390], [866, 432]], [[894, 296], [896, 338], [886, 392], [866, 432]])

const parts = []
const add = (...ps) => parts.push(...ps.flat())

// 바닥 (그늘) — 갈래가 만나는 곳은 바닥이 이어진다
add(floorPart(T4), P('shade', K.poly([...T5.W, ...[...T5.E].reverse()])), floorPart(T1), floorPart(T6))
// 바닥 무늬 — 맨바위 잔돌, 급류
add(gravel(0, 600, 560, 740, 70, 'g1', (x, y) => y > yAt(T1.F, x) + 6 && y < yAt(T1.S, x) - 6))
add(whitewater(dense([[-30, 838], [120, 846], [300, 870], [440, 893]], 4).map(([x, y]) => [x, y + 2]), 'ww6', 3))
add(whitewater(dense([[1180, 205], [1300, 186], [1430, 170]], 4), 'ww4', 4))

// 벽 (보는 쪽을 향한 면)
add(faceParts(T4, { bands: 3 }), faceParts(T1, { bands: 5 }), faceParts(T6, { bands: 3, to: 1076 }))
// 남쪽 협곡 벽의 동쪽 끝 모서리
add(P('ink', K.line([T6.N[T6.N.length - 1], T6.F[T6.F.length - 1]])))
// 먼 쪽 가장자리
const inT5 = ([x, y]) => x > 842 && x < 898 && y < 330
add(farRimParts(T4.S, 1, 't4s', { skip: inT5, len: 12 }))
add(farRimParts(T5.W.filter((p) => p[1] > yAt(T4.S, p[0]) - 1), 1, 't5w', { len: 11 }), farRimParts(T5.E.filter((p) => p[1] > yAt(T4.S, p[0]) - 1), -1, 't5e', { len: 11 }))
const inT6 = ([x, y]) => y > 862 && y < 972 && x > 1040
add(farRimParts(T1.S, 1, 't1s', { skip: inT6, len: 16 }))
add(farRimParts(T6.S, 1, 't6s', { len: 13 }))

// 메사 (Makindi Mesas) — 넓은 바닥에 선 지층 띠의 메사와 가는 바위 기둥
add(K.stack([
  { y: 690, parts: butte(1300, 690, 92, 66, 'm3') },
  { y: 858, parts: butte(1186, 858, 168, 118, 'm1') },
  { y: 944, parts: butte(1352, 944, 120, 96, 'm2') },
  { y: 800, parts: K.spire(1262, 800, 15, 72, 'pillar') },
]))

// 불안정한 봉우리 — 카드 표시 둘레의 무리와 여기저기 몇
add(K.stack([
  { y: 104, parts: teeter(150, 104, 84, 46, 'tp-a', -4) },
  { y: 172, parts: teeter(106, 172, 60, 34, 'tp-b', 5) },
  { y: 214, parts: teeter(232, 214, 76, 42, 'tp-c', 3) },
  { y: 178, parts: teeter(320, 178, 70, 40, 'tp-d', -6) },
  { y: 262, parts: teeter(292, 262, 54, 30, 'tp-e', 6) },
  { y: 244, parts: teeter(52, 244, 46, 26, 'tp-f', -3) },
  { y: 372, parts: teeter(474, 372, 52, 30, 'tp-g', 4) },
  { y: 706, parts: teeter(78, 706, 48, 28, 'tp-i', -5) },
  { y: 640, parts: teeter(1392, 640, 56, 30, 'tp-h', 5) },
]))

// 고블린 굴 — 작은 대상 오른쪽 벽 높이 굴 여섯, 둘은 머리를 내민다. 다른 벽에도 작은 무리
const rim1 = (x) => yAt(T1.N, x)
add(warren([[676, rim1(676) + 24, 10], [702, rim1(702) + 44, 9, true], [728, rim1(728) + 20, 10], [758, rim1(758) + 38, 10, true], [790, rim1(790) + 22, 9, true], [814, rim1(814) + 50, 9]]))
const rim6 = (x) => yAt(T6.N, x)
add(warren([[388, rim6(388) + 22, 8], [410, rim6(410) + 34, 8], [434, rim6(434) + 20, 8]]))
const rim4 = (x) => yAt(T4.N, x)
add(warren([[560, rim4(560) + 18, 7], [580, rim4(580) + 30, 7]]))

// 마찻길 — 큰 협곡 북쪽 가장자리를 따라 오다가 벽을 갈지자로 내려간다
const trail = [[-30, 430], [80, 436], [200, 448], [300, 470], [330, 484], [372, 492], [338, 512], [384, 522], [346, 544], [398, 556], [362, 576], [414, 588]]
add(K.dashed(trail, 7, 5))

// 코르의 거처 — 갈래 협곡 위에 건 줄에 매단 천막, 큰 협곡 벽에 붙인 천막
const lines = [[[842, 316], [896, 312], 7], [[844, 352], [894, 350], 8], [[848, 384], [888, 384], 6]]
let rope = ''
let anchors = ''
for (const [a, b, sag] of lines) {
  rope += sagLine(a, b, sag)
  anchors += anchor(a) + anchor(b)
}
// 도르래 줄 — 위 가장자리에서 아래 줄로
rope += K.line([[880, 313], [878, 352]])
add(P('hatch', rope), P('ink', anchors))
add(K.stack([
  { y: 1, parts: tent(...sagAt([842, 316], [896, 312], 7, 0.45), 10, 9) },
  { y: 2, parts: tent(...sagAt([844, 352], [894, 350], 8, 0.38), 9, 8) },
  { y: 3, parts: tent(...sagAt([844, 352], [894, 350], 8, 0.7), 8, 7) },
].map((it) => ({ ...it, parts: it.parts.map((p) => (p.cls === 'fill' || p.cls === 'shade' || p.cls === 'ink' || p.cls === 'hatch' ? p : p)) }))))
// 큰 협곡 벽에 붙인 천막 — 위 가장자리에서 내린 줄
let rope2 = ''
for (const [x, dy] of [[936, 34], [956, 52], [978, 30]]) {
  const r = rim1(x)
  rope2 += K.line([[x, r], [x, r + dy - 8]])
}
add(P('hatch', rope2), P('ink', anchor([936, rim1(936)]) + anchor([956, rim1(956)]) + anchor([978, rim1(978)])))
add(tent(936, rim1(936) + 34, 9, 8), tent(956, rim1(956) + 52, 10, 9), tent(978, rim1(978) + 30, 8, 7))

// 떠도는 바위와 고모조아
add(slab(1080, 318, 62, 26, 46, 'slab1'), slab(1196, 352, 34, 15, 30, 'slab2'))
add(gomazoa(1140, 376, 12, 'goma'))

// 무리 — 넓은 바닥을 서쪽으로 내닫는 들소 떼와 흙먼지
add(dust(1052, 676, 22, 9, 'dust'))
add(K.stack([[994, 672, 17], [1016, 664, 16], [1030, 680, 18], [1050, 668, 15], [1072, 682, 16]].map(([x, y, s], i) => ({ y, parts: ox(x, y, s, `ox${i}`) }))))

// 새 — 벼랑 둘레
add(birds([[452, 560, 4], [466, 552, 3.2], [440, 548, 3]]))

// 바람 — 협곡에서 불어 나오는 소용돌이
add(wind(1120, 600, 16, 1, 'w1'), wind(170, 520, 14, -1, 'w2'))

// 옛 유적 — 바람과 물에 닳아 자갈이 된 낮은 벽 토막 (AoM 'nameless ruins worn to gravel')
add(K.ruin(222, 690, 26, 9, 'ru1'), K.ruin(256, 700, 18, 7, 'ru2'), gravel(196, 680, 290, 712, 40, 'g-ru'))

// 바위 틈 고블린 — 바위 무더기와 모인 바위 사이의 좁은 틈
add(K.rocks(512, 784, 11, 4, 'fk1'), K.rocks(540, 792, 9, 3, 'fk2'))
add(P('dark', K.poly([[521, 790], [526, 772], [529, 790]]) + K.poly([[535, 797], [539, 783], [542, 797]])))

CHILDMAPS.push({
  id: 'makindi-trenches',
  size: [1400, 1000],
  glyphScale: 4,
  terrain: [
    // 세계 지도의 협곡 기호 — 손으로 그린 협곡 밖의 고원에
    { kind: 'canyon', points: [[460, -10], [1420, -10], [1420, 100], [1160, 150], [920, 205], [680, 215], [520, 214]], density: 0.8 },
    { kind: 'canyon', points: [[-10, 290], [360, 300], [400, 420], [-10, 420]], density: 0.8 },
    { kind: 'canyon', points: [[-10, 900], [1040, 990], [1040, 1010], [-10, 1010]], density: 0.8 },
    { kind: 'canyon', points: [[620, 760], [960, 760], [960, 820], [640, 820]], density: 0.7 },
  ],
  parts: parts.filter((p) => p.d),
  labels: [
    { text: 'Makindi Trenches', textKo: '마킨디 협곡', at: [640, 432], size: 34, kind: 'area', rotate: -3 },
    { text: 'Makindi Mesas', textKo: '마킨디 메사', at: [1210, 600], size: 24, kind: 'area' },
  ],
  subjects: {
    'warren-instigator': { at: [600, 650], size: 92 },
  },
  markAnchors: { 'card:teetering-peaks': 'right' },
})
