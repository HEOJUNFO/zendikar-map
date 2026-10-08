// 하그라 수조 — 굴 드라즈 내륙 분지, 하그라 늪 가장자리에 가라앉는 고대 유적 (자식 지도, 1333×1000 = 세계 x1517–1717, y945–1095 의 6.665배).
// 시점: Zendikar Rising(2020) 이후. 2020년 이후 수조를 묘사한 글은 없어, 뒤집는 글이 없는 마지막 현재형 서술(Art of Magic, 2016)과
//       2009년의 생김새 서술을 따른다 — 무너지고 가라앉는 유적이지 되살린 건물이 아니다.
// 공식: 하그라 늪 가장자리의 거대한 고대 구조물(AoM), 진흙과 물속으로 서서히 가라앉는 거대한 유적 단지(PG 2009), 낡은 돌 구조물,
//       입구는 아찔하게 깊은 구덩이(Booster Quest! 2009), 늪의 물이 지금도 아주 느리게 수조 쪽으로 흐른다(AoM), 펠라카 카르스트가
//       분지를 둘러싸고(PG·Booster Quest!·AoM), 카르스트에서 남쪽으로 흐르는 강들이 Lake Jeft 로 든다(AoM), 늪의 바위 노두·웅덩이·
//       큰 수련·스냅 펜(갈대에 둘린 낮은 둔덕)·하늘에 뜬 흙바위 섬(AoM).
// 해석: 유적 건물들의 모양과 배치(구덩이가 열린 낮은 경사면 마당, 동·남동으로 갈수록 물에 잠기는 벽 토막과 지붕 없는 방들 —
//       모두 무너진 낮은 벽이고 문 구멍은 두지 않는다), 돌을 쌓은 수직 굴로 그린 구덩이의 모양, 구덩이를
//       표시 곁에 둔 것, 웅덩이·노두·스냅 펜·떠 있는 섬의 자리, 지도 밖 말라키르 쪽 화살표(세계 지도의 방위).
//       땅속 유적(방·통로·금고)은 자리가 알려지지 않아 그리지 않는다. 수로·관·길·다리·야영지도 그리지 않는다.
// 세계 지도의 풍경(src/data/landscape/guul-draz.ts, 모두 추정)을 이 축척으로 따른다: 두 강(pelakka-jeft-west·north)의 물길,
//       펠라카 카르스트의 위·왼쪽·오른쪽 위 띠(협곡 기호), 하그라의 늪숲(hagra-swamp-forest-west — 자식 지도 기호에 맹그로브가 없어
//       숲 기호와 늪 기호를 섞었다), 북쪽 강 동쪽의 트인 늪, 위 띠에 걸친 행잉 스웜프 가장자리의 늪 풀 몇 포기.
// 세계 지도에만 있는 그림(Ob Nixilis, the Fallen·Gigantiform)은 이 지도에 그리지 않는다.
// 페이즈1 그림의 자리(모두 이 지도의 해석): Hagra Diabolist 는 유적 동쪽 늪의 낮은 바위 노두 위에서 서쪽 구덩이를 본다,
//       Ravenous Trap 은 유적 남쪽 발치(땅속 방을 나타내는 표지 — 두 번째 입구가 아니고 구덩이와 잇지 않는다),
//       Marsh Casualties 는 유적 남동쪽, 나무 없는 트인 수렁 ('the grasping mire').
//       커먼: Grim Discovery 는 유적 서쪽 끝(땅속 석실을 나타내는 표지 — Ravenous Trap 처럼 구덩이와 잇지 않는다),
//       Desecrated Earth 는 수조 북쪽, 카르스트 아래 트인 늪, Heartstabber Mosquito 는 수조 북동쪽 늪의 작은 고인 웅덩이 위,
//       Hagra Crocodile 는 수조 동쪽, 남쪽으로 흐르는 북쪽 강이 굽는 자리에서 서쪽 물가로 넓어진 물목. 그림 둘레는 늪숲을 비웠다(웅덩이 둘은 이 지도의 해석).
// 이름: 그림의 카드는 모두 한국어판이 없어 그림 이름은 영어로만 나온다.
const K = KIT
const { line, poly, smooth, rng, stack } = K
const P = (cls, d) => ({ cls, d })
const r1 = (v) => Math.round(v * 10) / 10
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`
const closed = (pts) => line(pts) + 'Z'
const ell = (x, y, rx, ry) => `M${pt([x - rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x + rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x - rx, y])}Z`

// ---------- 기하 ----------
/** Catmull-Rom 고리를 촘촘한 꺾은선으로 */
function dense(pts, steps = 6) {
  const n = pts.length
  const at = (i) => pts[(i + n) % n]
  const out = []
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    for (let s = 0; s < steps; s++) {
      const t = s / steps
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t)
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])])
    }
  }
  return out
}
/** 고리의 i 번째 점에서 바깥쪽 법선 */
function normalAt(ring, i) {
  const n = ring.length
  const a = ring[(i - 1 + n) % n]
  const b = ring[(i + 1) % n]
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  return [(b[1] - a[1]) / len, -(b[0] - a[0]) / len]
}
/** 물가처럼 들쭉날쭉하게 — 고리를 촘촘히 하고 법선 방향으로 흔든다 */
function ragged(ctrl, seed, amp = 5, steps = 5) {
  const ring = dense(ctrl, steps)
  const rand = rng(seed)
  const n = ring.length
  const raw = ring.map(() => rand() - 0.5)
  const sm = raw.map((_, i) => (raw[(i - 1 + n) % n] + 2 * raw[i] + raw[(i + 1) % n]) / 4)
  const sm2 = sm.map((_, i) => (sm[(i - 1 + n) % n] + 2 * sm[i] + sm[(i + 1) % n]) / 4)
  return ring.map((p, i) => {
    const [nx, ny] = normalAt(ring, i)
    const k = sm2[i] * amp * 2.4
    return [p[0] + nx * k, p[1] + ny * k]
  })
}
/** 둥근 고리 (점 n 개) */
function ellipse(cx, cy, rx, ry, n = 12, seed = null, jit = 0) {
  const rand = seed ? rng(seed) : () => 0.5
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    const k = 1 + (rand() - 0.5) * 2 * jit
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]
  })
}
/** 점을 (cx, cy) 둘레로 deg 만큼 돌린다 */
const rot = ([x, y], [cx, cy], deg) => {
  const c = Math.cos((deg * Math.PI) / 180)
  const s = Math.sin((deg * Math.PI) / 180)
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]
}

// ---------- 물 ----------
/** 고리를 따라 이어졌다 끊겼다 하는 선 */
function brokenEdge(ring, seed, on = 34, off = 9) {
  const rand = rng(seed)
  let d = ''
  let cur = []
  let drawing = true
  let left = on * (0.5 + rand())
  const pts = [...ring, ring[0]]
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (drawing && !cur.length) cur.push(a)
    left -= len
    if (drawing) cur.push(b)
    if (left <= 0) {
      if (drawing && cur.length > 1) d += line(cur)
      cur = []
      drawing = !drawing
      left = drawing ? on * (0.5 + rand()) : off * (0.5 + rand())
    }
  }
  if (drawing && cur.length > 1) d += line(cur)
  return d
}
/** 고인 물 — 밑에 양피지를 깔아 늪 기호를 가리고 물빛을 칠한 뒤, 물가 선은 끊어 그린다(늪의 물가) */
function water(ring, seed, o = {}) {
  const d = closed(ring)
  const parts = [P('fill', d), P('sea', d)]
  if (o.edge !== false) parts.push(P('sea-ink', brokenEdge(ring, seed, o.on ?? 34, o.off ?? 9)))
  return parts
}
/** 물 위에 선 것의 밑동 물결 한 줄 */
const waterline = (x, y, w) => P('sea-ink', `M${pt([x - w / 2, y])}Q${pt([x - w / 4, y - 1.6])} ${pt([x, y])}Q${pt([x + w / 4, y + 1.6])} ${pt([x + w / 2, y])}`)

/** 갈대 포기 — 가는 줄기 몇 가닥, 몇은 끝에 부들 이삭 */
function reeds(x, y, w, n, seed, h = 15) {
  const rand = rng(seed)
  let d = ''
  let heads = ''
  for (let i = 0; i < n; i++) {
    const rx = x + (rand() - 0.5) * w
    const ry = y + (rand() - 0.5) * 3
    const rh = h * (0.55 + rand() * 0.5)
    const lean = (rand() - 0.5) * h * 0.4
    d += `M${pt([rx, ry])}Q${pt([rx + lean * 0.2, ry - rh * 0.6])} ${pt([rx + lean, ry - rh])}`
    if (rand() < 0.4) heads += poly([[rx + lean * 0.86 - 1.2, ry - rh * 0.92], [rx + lean * 0.86 + 1.2, ry - rh * 0.92], [rx + lean * 0.78 + 1.2, ry - rh * 0.66], [rx + lean * 0.78 - 1.2, ry - rh * 0.66]])
  }
  return [P('ink', d), ...(heads ? [P('dark', heads)] : [])]
}
/** 큰 수련 잎 — 물 위에 납작한 원, 한쪽이 갈라진 (AoM: 'Giant water lilies … completely covering the water surface') */
function lilies(x, y, w, n, seed) {
  const rand = rng(seed)
  let d = ''
  for (let i = 0; i < n; i++) {
    const cx = x + (rand() - 0.5) * w
    const cy = y + (rand() - 0.5) * w * 0.35
    const r = 4.2 + rand() * 3.2
    const a0 = rand() * Math.PI * 2
    const p0 = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r * 0.55]
    const p1 = [cx + Math.cos(a0 + 0.55) * r, cy + Math.sin(a0 + 0.55) * r * 0.55]
    d += `M${pt([cx, cy])}L${pt(p1)}A${r1(r)} ${r1(r * 0.55)} 0 1 1 ${pt(p0)}Z`
  }
  return [P('fill', d), P('forest', d), P('hatch', d)]
}

// ---------- 유적 ----------
/** 입구 구덩이 — 깨진 돌 테두리를 두른 깊은 수직 구멍. 세계 지도 'pit' 기호의 말(어두운 구멍, 테두리, 먼 안벽으로 떨어지는 빗금)을 크게.
 *  (cx, cy) 는 구멍 가운데, rx·ry 는 구멍 반지름 */
function pit(cx, cy, rx, ry, seed) {
  const rand = rng(seed)
  // 바깥 테두리 — 다듬은 돌을 둘렀지만 군데군데 떨어져 나갔다
  const lipRX = rx + 13
  const lipRY = ry + 7.5
  const outer = []
  const N = 30
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2
    const bite = rand() < 0.22 ? 0.82 + rand() * 0.08 : 1 + (rand() - 0.5) * 0.05
    outer.push([cx + Math.cos(a) * lipRX * bite, cy + Math.sin(a) * lipRY * bite])
  }
  const rimD = closed(outer)
  const hole = ell(cx, cy, rx, ry)
  // 테두리 돌의 이음매 — 둘레를 따라 짧은 지름 방향 선
  let joints = ''
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rand() * 0.12
    const i0 = [cx + Math.cos(a) * (rx + 1.2), cy + Math.sin(a) * (ry + 1)]
    const o0 = [cx + Math.cos(a) * (lipRX - 2.5), cy + Math.sin(a) * (lipRY - 2)]
    joints += line([i0, o0])
  }
  // 테두리 가운데 이음 줄 (돌을 두 겹으로 쌓았다)
  const mid = []
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI * 0.05 + (i / 24) * Math.PI * 0.9
    mid.push([cx + Math.cos(a) * (rx + 6.5), cy + Math.sin(a) * (ry + 3.6)])
  }
  joints += smooth(mid)
  // 먼 안벽(위쪽 반) — 테두리에서 어둠으로 떨어지는 빗금, 촘촘히
  let wall = ''
  for (let i = 0; i <= 22; i++) {
    const a = Math.PI * 1.04 + (i / 22) * Math.PI * 0.92
    const x0 = cx + Math.cos(a) * rx
    const y0 = cy + Math.sin(a) * ry
    const len = ry * (0.55 + rand() * 0.35) * (0.4 + 0.6 * Math.abs(Math.sin(a)))
    wall += line([[x0, y0], [x0 + Math.cos(a) * -1.2, y0 + len]])
  }
  // 앞쪽 테두리 밖의 짧은 빗금 — 둘레 땅이 꺼진 가장자리
  let lip = ''
  for (const t of [0.22, 0.36, 0.64, 0.78]) {
    const a = Math.PI * t
    const x0 = cx + Math.cos(a) * lipRX
    const y0 = cy + Math.sin(a) * lipRY
    lip += line([[x0, y0 + 1], [x0 + Math.cos(a) * 1.5, y0 + 5.5]])
  }
  // 먼 안벽에 쌓은 켜 두 줄 — 아래로 갈수록 좁아지며 물러나 깊이를 보인다 (돌을 쌓아 만든 수직 굴)
  for (const [k, dy] of [[0.94, 0.2], [0.87, 0.36]]) {
    const arc = []
    for (let i = 0; i <= 20; i++) {
      const a = Math.PI * 1.06 + (i / 20) * Math.PI * 0.88
      arc.push([cx + Math.cos(a) * rx * k, cy + ry * dy + Math.sin(a) * ry * k])
    }
    wall += smooth(arc)
  }
  // 어둠 — 앞쪽(아래)으로 치우친 깊은 구멍 (먼 안벽은 위에 밝게 남는다)
  const deep = ell(cx + rx * 0.02, cy + ry * 0.3, rx * 0.8, ry * 0.64)
  return [
    P('fill', rimD),
    P('stone', rimD),
    P('hatch', joints + lip),
    P('shade', hole),
    P('hatch', wall),
    P('dark', deep),
    P('ink', rimD),
    P('ink-bold', hole),
  ]
}

/** 경사면 단의 앞면 — 위 가장자리 선(굵은 잉크)에서 비스듬히 내려가는 돌 면. 쌓은 줄 둘과 기운 빗금.
 *  pts 는 위 가장자리(왼쪽→오른쪽), h 는 면의 높이, lean 은 밑동이 바깥(아래)으로 나간 정도 */
function batter(pts, h, seed, o = {}) {
  const rand = rng(seed)
  const base = pts.map(([x, y]) => [x + (o.dx ?? 0), y + h])
  const face = poly([...pts, ...[...base].reverse()])
  // 쌓은 줄 — 면을 가로지르는 두 줄 (군데군데 끊긴다)
  let courses = ''
  for (const t of [0.36, 0.7]) {
    const row = pts.map(([x, y], i) => [x + (base[i][0] - x) * t, y + h * t])
    courses += brokenEdge(row.concat([...row].reverse()), `${seed}-c${t}`, 30, 8)
  }
  // 세로 이음매 몇 개 — 위아래 줄이 엇갈리게
  let joints = ''
  let k = 0
  for (const [[x, y]] of K.along(pts, 13)) {
    if (k++ === 0) continue
    const j = (rand() - 0.5) * 3
    const lo = k % 2 ? 0.36 : 0.7
    const hi = k % 2 ? 0.7 : 1
    joints += line([[x + j, y + h * lo + 0.6], [x + j + (o.dx ?? 0) * 0.2, y + h * hi - 0.6]])
  }
  const parts = [P('stone', face), P('shade', face), P('hatch', courses + joints), P('ink', face), P('ink-bold', line(pts))]
  return parts
}

/**
 * 무너진 벽 한 줄 — 흉벽 없는 돌벽을 옆에서 본 띠(평면 자리는 맞고 높이만 세운다). 윗선은 쌓은 켜를 따라 계단처럼 떨어져 나갔고
 * 끝은 허물어졌다. a·b 는 벽 밑선의 두 끝(자식 좌표), h0·h1 은 두 끝의 본디 높이.
 * o.shade: 그늘진 면(동쪽을 보는 벽), o.door: 문 구멍 자리(0~1), o.wet: 밑동이 물에 잠겼다, o.crumble: [시작, 끝] 허물어짐
 * 칠 차례를 맞추려고 짧은 토막으로 나눠 [{ y, parts }] 로 돌려준다
 */
function wallRun(a, b, h0, h1, seed, o = {}) {
  const rand = rng(seed)
  const len = Math.hypot(b[0] - a[0], b[1] - a[1])
  const n = Math.max(2, Math.round(len / 6))
  const course = 3.4
  const [c0, c1] = o.crumble ?? [true, true]
  const H = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    let h = h0 + (h1 - h0) * t
    if (rand() < 0.16) h *= 0.55 + rand() * 0.2
    const d0 = (t * len) / 16
    const d1 = ((1 - t) * len) / 16
    if (c0) h *= Math.min(1, 0.25 + d0)
    if (c1) h *= Math.min(1, 0.25 + d1)
    H.push(Math.max(course * 0.8, Math.round(h / course) * course))
  }
  const P0 = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
  const pieces = []
  const per = Math.max(1, Math.round(22 / (len / n)))
  for (let s = 0; s < n; s += per) {
    const e = Math.min(n, s + per)
    const top = []
    for (let i = s; i < e; i++) {
      const p = P0(i / n)
      const q = P0((i + 1) / n)
      top.push([p[0], p[1] - H[i]], [q[0], q[1] - H[i]])
    }
    const pa = P0(s / n)
    const pb = P0(e / n)
    const face = poly([pa, ...top, pb])
    // 윗면 — 얇고 밝은 띠
    // 벽 두께만큼 물러난 윗면 — 동서 벽은 북쪽(오른쪽 위)으로, 남북 벽은 서쪽(왼쪽)으로
    const [ox, oy] = o.cap ?? (o.shade ? [-4.6, 0] : [2, -2.9])
    let cap = ''
    for (let k = 0; k < top.length; k += 2) {
      const [p, q] = [top[k], top[k + 1]]
      cap += poly([p, q, [q[0] + ox, q[1] + oy], [p[0] + ox, p[1] + oy]])
    }
    // 켜 줄 (가장 낮은 높이 아래로만) 과 엇갈린 이음매
    let hatch = ''
    const minH = Math.min(...H.slice(s, e + 1))
    for (let c = course; c < minH - 0.5; c += course) hatch += line([[pa[0], pa[1] - c], [pb[0], pb[1] - c]])
    for (let i = s; i < e; i++) {
      const p = P0((i + 0.5) / n)
      const lift = (i % 2) * course
      if (H[i] > course + lift) hatch += line([[p[0], p[1] - lift], [p[0], p[1] - lift - course]])
    }
    if (o.shade) {
      for (let i = s; i < e; i += 2) {
        const p = P0((i + 0.25) / n)
        hatch += line([[p[0], p[1] - 0.8], [p[0], p[1] - H[i] + 1]])
      }
    }
    // 금 — 높은 토막 몇에 윗선에서 아래로 갈지자 금 하나
    const tallest = Math.max(...H.slice(s, e))
    if (!o.shade && tallest >= 14 && rand() < 0.55) {
      const k = s + Math.floor(rand() * (e - s))
      const p = P0((k + 0.5) / n)
      const t = H[k]
      hatch += line([[p[0], p[1] - t], [p[0] + 1.6, p[1] - t * 0.78], [p[0] - 0.8, p[1] - t * 0.6], [p[0] + 1.2, p[1] - t * 0.4]])
    }
    const parts = [P('stone', face), ...(o.shade ? [P('shade', face)] : []), P('fill', cap), P('hatch', hatch)]
    if (o.door != null && o.door >= s / n && o.door < e / n) {
      const p = P0(o.door)
      const dh = Math.min(H[Math.round(o.door * n)] * 0.62, 12)
      parts.push(P('dark', poly([[p[0] - 3.6, p[1]], [p[0] - 3.6, p[1] - dh], [p[0] + 3.6, p[1] - dh], [p[0] + 3.6, p[1]]])))
    }
    parts.push(P(o.bold ? 'ink-bold' : 'ink', face), P('ink', cap))
    if (o.wet) parts.push(waterline((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2 + 1.4, Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) + 10))
    pieces.push({ y: Math.max(pa[1], pb[1]), parts })
  }
  // 허물어진 끝에 떨어진 돌
  if (o.rubble !== false) {
    if (c1) pieces.push({ y: b[1] + 2, parts: K.rocks(b[0] + 4, b[1] + 2, 3.2 + rand() * 1.5, 2, `${seed}-rb`) })
  }
  return pieces
}

/** 기울어 반쯤 잠긴 돌덩이 — 큰 다듬은 돌(앞·윗·옆면)이 기울어 밑이 물에 묻혔다 */
function sunkBlock(x, y, w, h, d, tilt, seed) {
  const rand = rng(seed)
  const c = [x, y]
  const R = (p) => rot(p, c, tilt)
  const L = x - w / 2
  const Rr = x + w / 2
  const T = y - h
  const dx = d * 0.55
  const dy = d * 0.5
  const chip = Math.min(w, h) * (0.15 + rand() * 0.1)
  const front = [[L, y], [L, T + chip * 0.6], [L + chip, T], [Rr, T], [Rr, y]].map(R)
  const top = [[L + chip, T], [L + dx, T - dy], [Rr + dx, T - dy], [Rr, T]].map(R)
  const side = [[Rr, y], [Rr, T], [Rr + dx, T - dy], [Rr + dx, y - dy]].map(R)
  let hatch = ''
  for (let k = 1; k <= 2; k++) {
    const t = k / 3
    hatch += line([R([Rr + dx * t, y - dy * t - 1]), R([Rr + dx * t, T - dy * t + 2])])
  }
  hatch += line([R([L + w * 0.3, T]), R([L + w * 0.36, T + h * 0.4])])
  // 밑동을 덮는 물 — 물에 잠긴 아랫부분
  const wy = y - h * 0.22
  const wl = [[x - w * 0.8, wy + 2], [x - w * 0.4, wy - 1], [x + w * 0.2, wy - 2.5], [x + w * 0.8 + dx, wy - 1.5], [x + w * 0.95 + dx, wy + 4], [x + w * 0.3, wy + 9], [x - w * 0.6, wy + 8]]
  const wd = smooth(wl, true)
  return {
    y,
    parts: [P('stone', poly(front) + poly(top)), P('fill', poly(top)), P('shade', poly(side)), P('hatch', hatch), P('ink', poly(front) + poly(top) + poly(side)), P('fill', wd), P('sea', wd), P('sea-ink', `M${pt([x - w * 0.72, wy + 1.5])}Q${pt([x, wy - 3])} ${pt([x + w * 0.88 + dx, wy - 0.5])}`)],
  }
}

/** 물로 기운 판석 — 얇은 돌판 한 끝이 물에 박혔다 */
function slab(x, y, len, thick, tilt) {
  const c = [x, y]
  const R = (p) => rot(p, c, tilt)
  const top = [[x - len / 2, y - thick], [x + len / 2, y - thick], [x + len / 2 + 4, y - thick - 5], [x - len / 2 + 4, y - thick - 5]].map(R)
  const face = [[x - len / 2, y], [x + len / 2, y], [x + len / 2, y - thick], [x - len / 2, y - thick]].map(R)
  const hatch = line([R([x - len * 0.1, y - thick - 4.5]), R([x - len * 0.16, y - thick])]) + line([R([x + len * 0.2, y - thick - 4.5]), R([x + len * 0.14, y - thick])])
  const lowEnd = R([x + (tilt > 0 ? len / 2 : -len / 2), y])
  return {
    y,
    parts: [P('fill', poly(top)), P('stone', poly(face)), P('hatch', hatch), P('ink', poly(top) + poly(face)), waterline(lowEnd[0], lowEnd[1] + 1, len * 0.7)],
  }
}

/** 낮은 바위 노두 — 늪에서 드러난 평평한 바위 등 (AoM: 'the occasional rocky outcropping') */
function outcrop(x, y, w, h, seed) {
  const rand = rng(seed)
  const pts = [[x - w / 2, y + h * 0.15]]
  const n = 9
  for (let i = 1; i < n; i++) {
    const t = i / n
    const hump = Math.sin(t * Math.PI) ** 0.6
    pts.push([x - w / 2 + w * t, y - h * hump * (0.85 + rand() * 0.25)])
  }
  pts.push([x + w / 2, y + h * 0.1])
  const outline = poly([...pts, [x + w * 0.3, y + h * 0.3], [x - w * 0.3, y + h * 0.28]])
  const shade = poly([[x + w * 0.08, y + h * 0.28], ...pts.slice(6), [x + w * 0.3, y + h * 0.3]])
  let hatch = ''
  for (let i = 0; i < 5; i++) {
    const sx = x + w * (0.12 + i * 0.075)
    hatch += line([[sx, y - h * 0.6 + i * h * 0.12], [sx - 2, y + h * 0.3]])
  }
  hatch += line([[x - w * 0.32, y - h * 0.4], [x - w * 0.26, y - h * 0.05]])
  return [P('fill', outline), P('stone', outline), P('shade', shade), P('hatch', hatch), P('ink', outline), ...K.rocks(x + w * 0.56, y + h * 0.2, h * 0.32, 2, `${seed}-r`), ...K.rocks(x - w * 0.6, y + h * 0.25, h * 0.26, 2, `${seed}-l`)]
}

/** 스냅 펜 — 갈대에 둘린 낮은 둔덕 (AoM: 'low rises that appear to be solid ground surrounded by reeds').
 *  얕은 물에 둘러싸인 둥근 흙 둔덕(그늘진 오른쪽 기슭에 털선), 둘레에 갈대 포기 */
function snapFen(x, y, rx, seed) {
  const rand = rng(seed)
  const water = ragged(ellipse(x, y + 2, rx * 1.6, rx * 0.6, 10, `${seed}-w`, 0.12), `${seed}-wr`, 2.2, 4)
  // 둔덕 — 둥근 윗선과 평평한 밑선
  const top = []
  for (let i = 0; i <= 10; i++) {
    const t = i / 10
    top.push([x - rx + 2 * rx * t, y - Math.sin(t * Math.PI) ** 0.8 * rx * 0.42 * (0.92 + rand() * 0.16)])
  }
  const mound = poly([...top, [x + rx, y + 1.5], [x - rx, y + 1.5]])
  let hatch = ''
  for (let i = 6; i <= 9; i++) hatch += line([[top[i][0], top[i][1] + 1.2], [top[i][0] - 1, y]])
  const parts = [P('fill', closed(water)), P('sea', closed(water)), P('sea-ink', brokenEdge(water, `${seed}-we`, 20, 7)), P('fill', mound), P('shade', poly([...top.slice(6), [x + rx, y + 1.5], [top[6][0], y + 1.5]])), P('hatch', hatch), P('ink', smooth(top))]
  // 둘레의 갈대 — 앞뒤 몇 포기
  for (const [dx, dy, w, n, h] of [[-1.15, 0.1, 0.36, 5, 15], [1.12, 0.05, 0.34, 5, 14], [-0.45, 0.5, 0.4, 4, 11], [0.5, 0.48, 0.36, 4, 12], [0.1, -0.42, 0.3, 3, 10]]) {
    parts.push(...reeds(x + dx * rx, y + dy * rx, w * rx * 2, n, `${seed}-${dx}`, h))
  }
  return parts
}

/** 떠 있는 흙바위 섬 — 풀 덮인 윗면, 울퉁불퉁 뾰족한 밑동, 늘어진 뿌리, 땅의 그림자 (흙·뿌리·바위 — 다듬은 돌은 없다) */
function clod(x, y, w, lift, seed) {
  const rand = rng(seed)
  const L = x - w / 2
  const R = x + w / 2
  const topPts = []
  for (let i = 0; i <= 8; i++) {
    const t = i / 8
    const dome = Math.sin(t * Math.PI) * w * 0.08
    topPts.push([L + w * t, y - (i > 0 && i < 8 ? dome + rand() * 2.2 : 0)])
  }
  const U = (u, v) => [x + u * w, y + v * w]
  const under = [U(0.44, 0.1), U(0.36, 0.16), U(0.3, 0.3), U(0.2, 0.26), U(0.1, 0.5), U(0.0, 0.34), U(-0.1, 0.42), U(-0.18, 0.24), U(-0.3, 0.2), U(-0.42, 0.09)]
  const body = poly([...topPts, ...under])
  const shade = poly([[x + w * 0.06, y + 1.5], [R, y], ...under.slice(0, 5)])
  let hatch = ''
  for (let i = 0; i < 5; i++) {
    const u = 0.12 + i * 0.07
    hatch += line([[x + u * w, y + w * 0.04], [x + (u - 0.04) * w, y + w * (0.2 + (i % 2) * 0.06)]])
  }
  hatch += line([[x - w * 0.22, y + w * 0.08], [x - w * 0.16, y + w * 0.17]]) + line([[x - w * 0.06, y + w * 0.1], [x - w * 0.02, y + w * 0.24]])
  let grass = ''
  for (let i = 0; i < 6; i++) {
    const gx = L + w * (0.1 + i * 0.16) + (rand() - 0.5) * 3
    const gy = topPts[Math.min(8, Math.round((gx - L) / (w / 8)))][1] - 0.5
    grass += `M${pt([gx - 2, gy])}l1 -3.4M${pt([gx, gy])}l0 -4.4M${pt([gx + 2, gy])}l-1 -3.4`
  }
  let roots = ''
  for (const [u, v, l] of [[0.2, 0.26, 0.16], [0.1, 0.5, 0.12], [-0.1, 0.42, 0.18], [-0.3, 0.2, 0.12]]) {
    const [rx, ry] = U(u, v)
    roots += `M${pt([rx, ry])}q${r1(-2.5)} ${r1(w * l * 0.5)} ${r1(1.5)} ${r1(w * l)}`
  }
  const sy = y + lift + 6
  return {
    ground: [P('shade', ell(x, sy, w * 0.4, w * 0.09))],
    air: [P('fill', body), P('stone', poly([...under, [L, y + 2], [R, y + 2]])), P('shade', shade), P('hatch', hatch + roots + grass), P('ink-bold', body)],
  }
}

/** 지도 밖을 가리키는 화살표 */
function arrow(tail, tip, head = 11) {
  const len = Math.hypot(tail[0] - tip[0], tail[1] - tip[1])
  const [bx, by] = [(tail[0] - tip[0]) / len, (tail[1] - tip[1]) / len]
  const arm = (a) => [tip[0] + (bx * Math.cos(a) - by * Math.sin(a)) * head, tip[1] + (bx * Math.sin(a) + by * Math.cos(a)) * head]
  return [P('ink', line([tail, tip]) + line([arm(0.45), tip, arm(-0.45)]))]
}

// =====================================================================
// 세계 지도의 물길 (자식 좌표) — 두 강 모두 남쪽(아래)으로 흘러 Lake Jeft 로 든다
const RIVER_W = [[-40, 94.6], [-8, 222.6], [-40, 350.6], [24, 478.5], [104, 574.5], [136, 702.5], [215.9, 798.5], [279.9, 926.4], [391.9, 1006.4], [455.9, 1134.4]]
const RIVER_N = [[1255.7, 30.7], [1207.7, 142.6], [1239.7, 254.6], [1175.7, 366.6], [1111.7, 462.6], [1143.7, 574.5], [1079.7, 686.5], [999.8, 782.5], [1031.7, 894.4], [967.8, 1006.4], [903.8, 1102.4]]
const rivers = [...K.river(RIVER_W, 7, 12), ...K.river(RIVER_N, 4, 11)]

// ---------- 1. 유적 ----------
// 옛 지도의 도시 그림처럼 비스듬히 내려다본 모습: 평면의 동쪽(u)은 오른쪽, 북쪽(w)은 오른쪽 위로 물러난다(D).
// 북서쪽은 아직 물 위(구덩이가 열린 마당과 북쪽 방들), 동·남동으로 갈수록 벽이 낮아지며 물에 잠긴다 — 'gradually sinking'.
// 표시 [400,502.5] 는 마당 북서 모서리 밖(구덩이 곁), 이름은 그 위 빈 땅에 놓인다
const D = [0.42, -0.62]
const O = [310, 630]
const at = (u, w) => [O[0] + u + D[0] * w, O[1] + D[1] * w]
const items = []
const add = (y, parts) => items.push({ y, parts })
const HK = 1.2
const run = (u0, w0, u1, w1, h0, h1, seed, o = {}) => items.push(...wallRun(at(u0, w0), at(u1, w1), h0 * HK, h1 * HK, seed, { shade: u0 === u1, ...o }))

// 마당 — 판석 바닥(양피지), 성긴 이음매. 남쪽 가장자리는 늪으로 비스듬히 내려가는 돌 면
// 가장자리는 깨져 나갔다 (모서리가 떨어지고 군데군데 이가 빠졌다)
const COURT_EDGE = [[0, 112], [-2, 132], [0, 150], [4, 158], [0, 166], [2, 182], [10, 194], [22, 200], [52, 200], [58, 195], [66, 197], [70, 200], [120, 200]].map(([u, w]) => at(u, w))
const COURT = [...COURT_EDGE, at(120, 112)]
const PIT = at(60, 160)
const court = []
{
  const d = closed(COURT)
  // 판석 이음매 — 몇 군데만, 짧게 엇갈려 (줄지어 놓으면 길처럼 읽힌다)
  const rand = rng('pave')
  let paving = ''
  for (let k = 0; k < 16; k++) {
    const u = 6 + rand() * 106
    const w = 118 + rand() * 76
    const p = at(u, w)
    if (Math.hypot((p[0] - PIT[0]) / 58, (p[1] - PIT[1]) / 31) < 1) continue
    paving += k % 3 ? line([p, at(u + 5 + rand() * 4, w)]) : line([p, at(u, w + 6 + rand() * 5)])
  }
  // 갈라진 금 — 구덩이 테두리에서 남동쪽으로
  const crack = line([[96, 146], [100, 138], [106, 134], [110, 124], [116, 118]].map(([u, w]) => at(u, w))) + line([[20, 124], [26, 130], [24, 138]].map(([u, w]) => at(u, w)))
  court.push(P('fill', d), P('hatch', paving + crack), P('ink', line(COURT_EDGE)))
}
// 마당 남쪽 면 — 땅속 유적의 경사면 윗부분 ('their sloping sides keeping out tons of water and earth')
const COURT_S1 = [at(0, 112), at(24, 112), at(44, 112)]
const COURT_S2 = [at(60, 112), at(90, 112), at(120, 112)]

// 북쪽 방들 (가장 덜 잠겼다) — 뒷벽, 칸막이벽, 앞벽. 모두 지붕 없는 낮은 벽 토막이고 동쪽으로 갈수록 낮다.
// 문 구멍은 그리지 않는다 — 어두운 문은 두 번째 입구로 읽힌다 (입구는 구덩이 하나). 벽이 무너져 끊긴 틈만 둔다
run(120, 200, 148, 200, 20, 15, 'n1', { crumble: [false, true], bold: true })
run(158, 200, 180, 200, 12, 15, 'n1b', { bold: true })
run(190, 200, 238, 200, 16, 13, 'n2', { bold: true })
run(252, 200, 290, 200, 11, 8, 'n3')
run(120, 112, 120, 200, 15, 19, 'x1', { crumble: [true, false], bold: true })
run(184, 128, 184, 200, 12, 15, 'x2')
run(244, 140, 244, 200, 8, 11, 'x3')
run(290, 150, 290, 200, 6, 8, 'x4', { wet: true })
run(120, 128, 144, 128, 14, 11, 'f1', { crumble: [false, true] })
run(154, 128, 168, 128, 9, 10, 'f1b')
run(196, 128, 236, 128, 10, 8, 'f2')
// 가운데 줄 — 낮고 군데군데 끊겼다, 밑동이 물에 잠겼다
run(150, 60, 150, 116, 6, 10, 'x5', { wet: true })
run(222, 66, 222, 120, 5, 7, 'x6', { wet: true })
run(64, 70, 124, 70, 8, 6, 'm1', { wet: true })
run(160, 64, 208, 64, 6, 5, 'm2', { wet: true })
run(236, 70, 280, 70, 4, 4, 'm3', { wet: true })
// 남쪽 줄 — 거의 잠겼다
run(0, 20, 0, 108, 6, 11, 'w1', { wet: true, crumble: [true, false] })
run(20, 12, 70, 12, 5, 4, 's1', { wet: true })
run(130, 6, 178, 6, 4, 4, 's2', { wet: true })
// 기운 돌덩이와 판석
items.push(sunkBlock(...at(214, 22), 28, 18, 14, 14, 'b1'))
items.push(slab(...at(98, 34), 36, 5, -12, 'sl1'))
items.push(sunkBlock(...at(300, 86), 18, 12, 9, -10, 'b2'))
// 무너진 자리의 돌무더기
add(at(184, 202)[1], K.rocks(...at(184, 204), 4.6, 3, 'gap1'))
add(at(152, 202)[1], K.rocks(...at(152, 203), 3.8, 2, 'gap3'))
add(at(149, 130)[1], K.rocks(...at(149, 131), 3.2, 2, 'gap4'))
add(at(140, 66)[1], K.rocks(...at(140, 66), 3.8, 2, 'gap2'))
add(at(92, 202)[1], K.rocks(...at(92, 204), 3.4, 2, 'pr1'))

// 유적 안팎의 물 — 남동쪽이 더 잠겼다. 물은 마당 남쪽 면과 방들의 밑동까지 차오른다. 수로는 없다
const RUIN_POOL = ragged([at(30, 100), at(110, 104), at(140, 118), at(196, 122), at(240, 132), at(284, 140), at(306, 118), at(300, 78), at(322, 40), at(330, -6), at(296, -30), at(250, -18), at(200, -36), at(150, -30), at(110, -40), at(60, -26), at(14, -16), at(-4, 20), at(4, 70)], 'rp', 6, 5)
// 물속의 진흙 둔덕 — 갈대 몇 포기
const ISLETS = [[at(70, 40), 16, 6], [at(262, 20), 14, 5]]
// 동쪽 방 하나는 물이 찼다
const NE_POOL = ragged([at(248, 140), at(286, 150), at(288, 192), at(250, 194)], 'nep', 2, 4)
const POOLS = [
  ragged(ellipse(330, 610, 34, 11, 9, 'p2', 0.2), 'p2r', 2.5, 4),
  ragged(ellipse(258, 744, 26, 9, 9, 'p3', 0.2), 'p3r', 2, 4),
  ragged(ellipse(890, 640, 40, 13, 9, 'p4', 0.2), 'p4r', 3, 4),
  ragged(ellipse(600, 370, 30, 10, 9, 'p5', 0.2), 'p5r', 2, 4),
  ragged(ellipse(918, 900, 34, 11, 9, 'p6', 0.2), 'p6r', 2.5, 4),
  ragged(ellipse(560, 900, 30, 10, 9, 'p7', 0.2), 'p7r', 2, 4),
]
// Marsh Casualties 자리 — 나무 없는 트인 수렁 한 자락
const MIRE = ragged([[618, 840], [656, 830], [716, 828], [764, 834], [780, 846], [744, 855], [676, 856], [628, 853]], 'mire', 2.4, 5)
// 커먼 그림의 자리 (모두 이 지도의 해석)
// Heartstabber Mosquito — 수조 북동쪽 늪의 작은 고인 웅덩이 위 (그림의 밑 물웅덩이를 둘러 웅덩이를 조금 넓힌다)
const HM_AT = [1020, 190]
const MOSQ_POOL = ragged(ellipse(HM_AT[0] + 10, HM_AT[1] + 50, 52, 11, 10, 'hm', 0.16), 'hmr', 2, 4)
// Hagra Crocodile — 북쪽 강(남쪽으로 흐른다)이 굽는 자리의 서쪽 물가로 넓어진 물목. 강물이 오른쪽 위에서 들어와 굽이를 돈다.
// 악어는 물목의 서쪽 반에 두어 그 이름이 굽이 아래로 내려가는 강줄기에 걸치지 않게 했다
const HC_AT = [936, 786]
const CROC_POOL = ragged([[870, 787], [884, 778], [912, 775], [944, 774], [976, 772], [998, 768], [1012, 776], [1010, 792], [990, 797], [952, 797], [912, 797], [882, 795]], 'hcr', 1.6, 4)
// Desecrated Earth — 수조 북쪽, 카르스트 아래 트인 늪
const DE_AT = [728, 248]
// Grim Discovery — 유적 서쪽 끝 (땅속 석실을 나타내는 표지 — 구덩이와 잇지 않는다)
const GD_AT = [242, 640]
const waters = [
  ...water(RUIN_POOL, 'e-rp', { on: 30, off: 8 }),
  ...water(NE_POOL, 'e-nep', { on: 18, off: 6 }),
  ...ISLETS.flatMap(([[x, y], rx, ry], i) => {
    const ring = ragged(ellipse(x, y, rx, ry, 9, `is${i}`, 0.18), `is${i}r`, 1.6, 4)
    return [P('fill', closed(ring)), P('sea-ink', brokenEdge(ring, `is${i}e`, 16, 5)), ...reeds(x - rx * 0.2, y + 1, rx * 0.9, 5, `is${i}a`, 11)]
  }),
  ...POOLS.flatMap((p, i) => water(p, `e-p${i}`, { on: 22, off: 7 })),
  ...water(MIRE, 'e-mire', { on: 26, off: 8 }),
  ...water(MOSQ_POOL, 'e-hm', { on: 20, off: 7 }),
  ...water(CROC_POOL, 'e-hc', { on: 26, off: 8 }),
]
// 물이 아주 느리게 수조(구덩이) 쪽으로 — 웅덩이의 잔물결이 북서쪽으로 휘어진다
const curl = (u, w, len) => {
  const p = at(u, w)
  const q = at(u - len, w + len * 0.5)
  const m = at(u - len * 0.5, w + len * 0.1)
  return `M${pt(p)}Q${pt(m)} ${pt(q)}`
}
const drift = [P('sea-ink', curl(280, 30, 30) + curl(200, -20, 34) + curl(90, -16, 28) + curl(290, 96, 20)), ...K.ripples(890, 642, 10, 2, 'p4r'), ...K.ripples(330, 612, 9, 2, 'p2r')]

// Ravenous Trap 둘레 — 유적 남쪽 발치에 떨어진 돌 (함정을 반쯤 감싼다)
items.push(sunkBlock(470, 688, 24, 16, 12, -16, 'tb1'))
add(690, K.rocks(578, 688, 6, 3, 'tr1'))
add(698, K.rocks(454, 698, 4.5, 2, 'tr2'))

// Hagra Diabolist 가 선 낮은 바위 노두
const OUTCROP = outcrop(738, 545, 96, 12, 'oc')

// 늪 — 갈대, 수련, 스냅 펜
add(at(10, -14)[1], reeds(...at(10, -14), 18, 5, 'r1', 13))
add(at(306, 30)[1], reeds(...at(306, 30), 14, 5, 'r2', 12))
add(616, reeds(352, 614, 14, 5, 'r3'))
add(748, reeds(272, 748, 12, 4, 'r4'))
add(650, reeds(912, 650, 14, 5, 'r5'))
add(856, reeds(628, 862, 12, 5, 'r6', 12))
add(866, reeds(772, 860, 12, 5, 'r7', 12))
add(906, reeds(578, 904, 12, 4, 'r8', 11))
add(374, reeds(620, 374, 10, 4, 'r9', 11))
add(640, lilies(882, 636, 46, 8, 'li1'))
add(790, lilies(988, 786, 16, 3, 'li3'))
// Grim Discovery 곁 — 유적 서쪽 끝에서 떨어져 나온 돌
add(652, K.rocks(GD_AT[0] + 54, GD_AT[1] + 6, 4.2, 3, 'gd1'))
add(HM_AT[1] + 54, reeds(HM_AT[0] - 40, HM_AT[1] + 54, 12, 4, 'r10', 12))
add(HM_AT[1] + 52, reeds(HM_AT[0] + 56, HM_AT[1] + 50, 10, 4, 'r11', 11))
add(898, lilies(916, 898, 34, 5, 'li2'))
add(600, snapFen(1268, 600, 26, 'sf1'))
add(904, snapFen(1250, 904, 22, 'sf2'))

// 떠 있는 흙바위 섬 (북쪽 강 동쪽의 트인 늪 위)
const C1 = clod(1238, 380, 54, 90, 'clod1')

// 말라키르 쪽 화살표 — 표시에서 동쪽으로 남쪽 13.8° (지도 밖, 말라키르 지도의 화살표와 마주 본다)
const pointer = arrow([1190, 696], [1322, 728])

const ruinParts = [
  ...court,
  ...batter(COURT_S1, 12, 'bat-s1'),
  ...batter(COURT_S2, 12, 'bat-s2'),
  // 무너진 앞면 — 돌이 물가로 쏟아졌다
  P('fill', poly([at(44, 112), at(60, 112), at(60, 106), at(44, 106)])),
  ...K.rocks(...at(50, 104), 5, 4, 'bat-gap'),
  ...pit(PIT[0], PIT[1], 34, 14.5, 'pit'),
]

const parts = [...C1.ground, ...rivers, ...waters, ...drift, ...ruinParts, ...stack(items), ...OUTCROP, ...C1.air, ...pointer]

// 이름 — 공식 이름만. 수조 이름은 앱의 표시가 단다
const LABELS = [
  { text: 'Hagra Swamp', textKo: '하그라', at: [960, 374], size: 34, kind: 'area' },
  { text: 'Pelakka Karst', textKo: '펠라카', at: [620, 72], size: 28, kind: 'area' },
  { text: 'Malakir', textKo: '말라키르', at: [1250, 684], size: 20, kind: 'place' },
]

// ---------- 지형 기호 칸 ----------
const withHoles = (outer, holes) => [...outer, outer[0], ...holes.flatMap((h) => [...h, h[0], outer[0]])]
const labelHole = (l, top = 6, bottom = 20) => {
  const w = l.size * l.text.length * (l.kind === 'place' ? 0.47 : 0.55)
  const [x, y] = l.at
  return [[x - w / 2 - 28, y - l.size * 0.9 - top], [x + w / 2 + 28, y - l.size * 0.9 - top], [x + w / 2 + 28, y + l.size * 0.36 + bottom], [x - w / 2 - 28, y + l.size * 0.36 + bottom]]
}
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]

// 펠라카 카르스트 — 위 띠(세계 지도 pelakka-karst 의 남쪽 가장자리)와 왼쪽 띠(pelakka-karst-west), 틀 밖으로 넉넉히 늘였다
const KARST_TOP_EDGE = [[1028, 0], [1000, 10], [952, 28], [857, 56], [762, 79], [571, 110], [381, 129], [190, 134], [0, 130]]
const KARST_W_EDGE = [[24, 223], [72, 383], [40, 558], [8, 734], [56, 910], [168, 1054]]
const KARST = withHoles([[-400, -300], [1028, -300], ...KARST_TOP_EDGE, ...KARST_W_EDGE, [168, 1400], [-400, 1400]], [[[470, -120], [772, -120], [772, 72], [762, 74], [571, 104], [470, 114]]])
// 오른쪽 위 띠 (pelakka-karst-north)
const KARST_NE = [[1110, -300], [1700, -300], [1700, 150], [1333, 150], [1280, 159], [1160, 47], [1120, 0]]

// 하그라의 늪숲 (세계 지도 hagra-swamp-forest-west 의 고리) — 유적(표시 이름 자리와 Hagra Diabolist 노두까지)·Marsh Casualties 수렁·이름 자리는 비운다
const FOREST_RING = [[104, 766.5], [168, 590.5], [279.9, 446.6], [407.9, 366.6], [519.9, 286.6], [663.8, 318.6], [807.8, 238.6], [951.8, 270.6], [1079.7, 222.6], [1175.7, 334.6], [1127.7, 462.6], [1207.7, 574.5], [1159.7, 718.5], [1223.7, 846.5], [1143.7, 974.4], [1159.7, 1102.4], [1063.7, 1230.4], [919.8, 1294.3], [759.8, 1326.3], [615.8, 1278.3], [487.9, 1182.4], [359.9, 1086.4], [231.9, 974.4], [152, 878.4]]
// 늪숲 고리의 북쪽 가장자리는 Desecrated Earth 와 Heartstabber Mosquito 의 자리만큼 남쪽으로 물렸다 (그림 둘레를 트인 늪으로)
const FOREST_EDGE = FOREST_RING.flatMap((p) => {
  if (p[0] === 807.8) return [[720, 342], [790, 328], [860, 268]]
  if (p[0] === 1079.7) return [[985, 302], [1035, 314], [1090, 298], [1122, 272]]
  return [p]
})
// 유적 둘레 — 서쪽 끝의 Grim Discovery 자리까지
const RUIN_HOLE = [[300, 440], [460, 432], [530, 430], [650, 416], [714, 418], [822, 424], [822, 604], [740, 604], [700, 640], [660, 690], [640, 700], [630, 760], [430, 760], [410, 700], [320, 692], [186, 688], [176, 600], [190, 530], [252, 522], [300, 540]]
const MIRE_HOLE = ellipse(700, 842, 100, 60, 14)
// Hagra Crocodile 의 강 웅덩이
const CROC_HOLE = rect(850, 728, 1050, 836)
// 웅덩이 둘레 — 나무 줄기가 물가 바로 밑에 서면 잎이 물에 잘려 보여, 웅덩이 아래쪽을 넉넉히 비운다
const poolHole = ([cx, cy], rx, ry) => [[cx - rx - 18, cy - ry - 12], [cx + rx + 18, cy - ry - 12], [cx + rx + 18, cy + ry + 30], [cx - rx - 18, cy + ry + 30]]
const POOL_HOLES = [poolHole([258, 744], 26, 9), poolHole([890, 640], 40, 13), poolHole([600, 370], 30, 10), poolHole([918, 900], 34, 11), poolHole([560, 900], 30, 10)]
const FOREST = withHoles(FOREST_EDGE, [RUIN_HOLE, MIRE_HOLE, CROC_HOLE, labelHole(LABELS[0], 8, 16), ...POOL_HOLES])
// 트인 늪 — 북쪽 강 동쪽 (세계 지도 hagra-swamp 의 북쪽 가장자리부터), 말라키르 이름·화살표와 떠 있는 섬 자리는 비운다
const OPEN = withHoles(
  [[1079.7, 222.6], [1143, 208], [1333, 189], [1700, 180], [1700, 1400], [1100, 1400], [1159.7, 1102.4], [1143.7, 974.4], [1223.7, 846.5], [1159.7, 718.5], [1207.7, 574.5], [1127.7, 462.6], [1175.7, 334.6]],
  [rect(1170, 648, 1333, 744), rect(1190, 330, 1290, 476), rect(1222, 566, 1316, 632), rect(1204, 872, 1298, 936)],
)

// 행잉 스웜프(hanging-swamp, 세계 지도 canon-hint [1607,922] ±36)의 남쪽 가장자리 — 세계 지도가 위 띠의 협곡 기호 사이에 늪 풀을
// 몇 포기 그리는 자리. 늪 풀만 옮기고 행잉 스웜프 자체(싱크홀 테두리·떠 있는 물방울)는 틀 밖이라 그리지 않는다
// 이름 자리는 구멍 대신 고리를 파고들어 비운다 (구멍이 고리 밖으로 나가면 짝홀 채우기가 거꾸로 된다)
const FRINGE = (() => {
  const [cx, cy, r] = [600, -153, 240]
  const [nx0, nx1, ny] = [486, 756, 22]
  const yAt = (x) => cy + Math.sqrt(r * r - (x - cx) ** 2)
  const out = []
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2
    const p = [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
    if (p[1] > ny && p[0] > nx0 && p[0] < nx1) {
      if (!out.notched) {
        out.push([nx1, yAt(nx1)], [nx1, ny], [nx0, ny], [nx0, yAt(nx0)])
        out.notched = true
      }
      continue
    }
    out.push(p)
  }
  return out.map(([x, y]) => [x, y])
})()

CHILDMAPS.push({
  id: 'hagra-cistern',
  size: [1333, 1000],
  glyphScale: 4,
  terrain: [
    { kind: 'canyon', points: KARST, density: 0.8 },
    { kind: 'canyon', points: KARST_NE, density: 0.8 },
    { kind: 'forest', points: FOREST, density: 0.16 },
    { kind: 'swamp', points: FOREST, density: 0.22 },
    { kind: 'swamp', points: OPEN, density: 0.4 },
    { kind: 'swamp', points: FRINGE, density: 0.3 },
  ],
  parts,
  labels: LABELS,
  subjects: {
    'desecrated-earth': { at: DE_AT, size: 100 },
    'grim-discovery': { at: GD_AT, size: 85 },
    'hagra-crocodile': { at: HC_AT, size: 88 },
    'heartstabber-mosquito': { at: HM_AT, size: 85 },
    'hagra-diabolist': { at: [736, 544], size: 100 },
    'marsh-casualties': { at: [700, 846], size: 96 },
    'ravenous-trap': { at: [522, 679], size: 80 },
  },
  markAnchors: { 'hagra-cistern': 'above' },
  focus: [566, 520],
})
