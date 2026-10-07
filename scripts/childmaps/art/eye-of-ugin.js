// Eye of Ugin — 자식 지도 (아쿰의 이빨 북부, 세계 범위 x 1895–2035 · y 365–475, ×10).
// Eye 는 마지막 공식 묘사(2015–16년)의 모습으로 그린다: 산이 부서진 자리의 구덩이, 그 둘레의 잔해 더미와 쓰러진 헤드론,
// 떠도는 헤드론과 붉은 화산암 조각, 사람이 다듬은 모난 동굴 입구, 생명을 잃고 가루가 된 땅 (The Art of Magic: Zendikar,
// Stone and Blood, Revelation at the Eye). 2020년 이후 모습은 알려지지 않았다. 나머지 아쿰의 이빨은 지도의 기준 시대(ZNR 이후).
// 해석(공식 자리·모양 없음): 산줄기·협곡·절벽·첨탑의 생김새, 동굴 입구의 모양, 가루 땅의 너비, 떠 있는 유적 지대와
// 아노원 연맹 천막의 모습, 인물 그림의 자리. 신전 터·석실 단면·여백 화살표는 그리지 않았다.

const { line, poly, smooth, rng, offset, along, stack } = KIT
const r1 = (v) => Math.round(v * 10) / 10
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`
const P = (cls, d) => ({ cls, d })
const ell = (x, y, rx, ry) => `M${pt([x - rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x + rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x - rx, y])}Z`
const dot = ([x, y]) => `M${pt([x, y])}h0.1`

/** Catmull-Rom 을 촘촘한 꺾은선으로 — 같은 곡선을 여러 도형이 나눠 쓸 때 */
function dense(pts, closed, per = 5) {
  const n = pts.length
  const at = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))])
  const out = []
  const last = closed ? n : n - 1
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    for (let s = 0; s < per; s++) {
      const t = s / per
      const t2 = t * t
      const t3 = t2 * t
      out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)))
    }
  }
  if (!closed) out.push(pts[n - 1])
  return out
}

function inPoly(x, y, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** 꺾은선이 스스로 엇갈려 생긴 고리를 잘라낸다 (좁은 만 안쪽으로 민 물결선) */
function trimLoop(pts) {
  const cross = (a, b, c, d) => {
    const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0])
    if (!den) return null
    const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den
    const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] : null
  }
  for (let i = 0; i < pts.length - 1; i++) {
    for (let j = pts.length - 2; j > i + 1; j--) {
      const x = cross(pts[i], pts[i + 1], pts[j], pts[j + 1])
      if (x) return [...pts.slice(0, i + 1), x, ...pts.slice(j + 1)]
    }
  }
  return pts
}

// ---------------------------------------------------------------- 바다와 해안 (세계 지도 해안선 그대로)
// context.mjs 가 주는 해안선 (자식 지도 좌표) — 앱이 그리는 해안과 같다
const COAST = [[934,-25],[907,-21],[877,-18],[843,-17],[807,-17],[775,-16],[748,-13],[725,-9],[707,-4],[693,3],[683,11],[678,21],[677,32],[676,42],[674,52],[671,60],[668,68],[664,75],[660,81],[655,85],[650,89],[645,92],[641,96],[638,99],[636,102],[634,104],[632,107],[631,109],[631,112],[630,114],[629,117],[627,119],[624,122],[621,125],[618,128],[615,131],[611,135],[608,139],[605,143],[603,147],[602,151],[601,155],[601,160],[602,164],[603,168],[602,172],[601,177],[599,181],[596,186],[591,191],[586,196],[580,200],[574,205],[567,209],[560,211],[553,211],[545,210],[538,208],[531,204],[524,199],[516,192],[510,185],[505,179],[500,172],[497,165],[495,158],[493,151],[492,143],[492,136],[490,129],[488,122],[485,115],[480,108],[475,102],[469,96],[462,90],[454,84],[447,79],[441,73],[436,68],[431,62],[428,58],[425,53],[423,49],[422,45],[420,41],[417,37],[413,33],[408,29],[402,25],[394,20],[385,16],[375,12],[366,9],[358,7],[350,6],[343,5],[337,5],[331,6],[327,8],[323,10],[319,12],[315,13],[311,14],[307,14],[302,14],[297,13],[293,12],[288,10],[282,9],[275,10],[267,11],[259,13],[249,17],[239,22],[227,28],[214,35],[202,40],[191,45],[181,47],[172,49],[163,49],[155,48],[148,46],[142,42],[136,40],[131,37],[125,36],[120,35],[115,35],[111,36],[107,36],[103,38],[99,38],[94,39],[90,38],[84,37],[79,35],[73,33],[67,30],[61,26],[54,23],[47,21],[40,20],[32,19],[23,20],[14,22],[4,25],[-6,30],[-16,33],[-25,36]]
const SEA = [...COAST, [-25, -90], [934, -90]]
const inSea = (x, y) => inPoly(x, y, SEA)

/** 붉은 해안 벼랑 — 세계 지도처럼 해안 안쪽 띠에 바다 쪽으로 내리긋는 빗금 */
function coastCliffs() {
  const inner = offset(COAST, 3.5)
  const outer = offset(COAST, 30)
  const rand = rng('coast-cliff')
  let ticks = ''
  for (const [[x, y], [ux, uy]] of along(outer, 12)) {
    const len = 21 + rand() * 4
    ticks += line([[x, y], [x - uy * len, y + ux * len]])
  }
  return [P('shade', poly([...inner, ...[...outer].reverse()])), P('hatch', ticks)]
}

/** 만 안의 물결선 두 줄 (세계 지도의 해안 물결선) — 만 끝에서 V 로 만난다 */
function inletRipples() {
  const arm = COAST.slice(7, 110)
  return [P('sea-ink', smooth(trimLoop(offset(arm, -15))) + smooth(trimLoop(offset(arm, -38))))]
}

/** 바다에서 솟은 화산 유리 바늘 (The Art of Magic 'Spires of volcanic glass jut from the sea') */
function needle(x, y, w, h, seed) {
  const parts = KIT.spire(x, y, w, h, seed).map((p) => (p.cls === 'fill' ? P('stone', p.d) : p))
  return [...parts, P('sea-ink', `M${pt([x - w * 1.1, y + 1.5])}Q${pt([x, y - 2])} ${pt([x + w * 1.1, y + 1.5])}`)]
}

/** 물밑 결정 암초 — 해도의 '+' 표 */
const reef = ([x, y]) => line([[x - 3.2, y], [x + 3.2, y]]) + line([[x, y - 3.2], [x, y + 3.2]])

// ---------------------------------------------------------------- Eye of Ugin 자리
const C = [600, 570] // 구덩이 가운데
const RX = 160
const RYN = 114 // 북쪽 반지름 — 먼 쪽 테두리 y 456
const RYS = 100 // 남쪽 반지름 — 앞쪽 테두리 y 670
const WALL = 64 // 먼 쪽(북쪽) 안벽 높이 — 동굴 입구 밑(바닥선)이 y 520, 세계 표시 [600,530]은 그 문턱
const pitE = (x, y) => Math.hypot((x - C[0]) / RX, (y - C[1]) / (y < C[1] ? RYN : RYS))
const DRAIN = { cx: 600, cy: 580, rx: 320, ry: 240 } // 생명을 잃고 가루가 된 땅 (넓이는 이 지도의 해석)
const drainE = (x, y) => Math.hypot((x - DRAIN.cx) / DRAIN.rx, (y - DRAIN.cy) / DRAIN.ry)

/** 가루가 된 땅 — 구덩이에서 멀어질수록 성기게 찍은 점 */
function powder() {
  const rand = rng('powder')
  let d = ''
  for (let y = DRAIN.cy - DRAIN.ry; y <= DRAIN.cy + DRAIN.ry; y += 9) {
    for (let x = DRAIN.cx - DRAIN.rx; x <= DRAIN.cx + DRAIN.rx; x += 9) {
      const px = x + (rand() - 0.5) * 8
      const py = y + (rand() - 0.5) * 8
      const e = drainE(px, py)
      if (e > 1 || pitE(px, py) < 1.07) continue
      if (rand() < Math.pow(1 - e, 1.15) * 0.62) d += dot([px, py])
    }
  }
  return [P('ink', d)]
}

/** 구덩이 — 테두리, 먼 쪽 안벽(바위 면)과 그 그늘, 바닥. 앞쪽 테두리 안으로 짧은 빗금 */
function pit() {
  const rand = rng('pit')
  const N = 32
  const ring = []
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2
    const j = i === (N * 3) / 4 ? 1 : 1 + (rand() - 0.5) * 0.12 + Math.sin(a * 3 + 0.7) * 0.035
    ring.push([C[0] + Math.cos(a) * RX * j, C[1] + Math.sin(a) * (Math.sin(a) < 0 ? RYN : RYS) * j])
  }
  const rim = dense(ring, true, 5)
  const M = rim.length
  // 북쪽 반(서→동)
  const north = []
  for (let k = M / 2; k <= M; k++) north.push(rim[k % M])
  const floorLine = north.map(([x, y], k) => {
    const a = Math.PI + (k / (north.length - 1)) * Math.PI
    return [x, y + WALL * Math.pow(Math.max(0, -Math.sin(a)), 0.8)]
  })
  const south = rim.slice(0, M / 2 + 1) // 동→서
  const wallPoly = poly([...north, ...[...floorLine].reverse()])
  let hatch = ''
  north.forEach(([x, y], k) => {
    if (k % 2) return
    const fy = floorLine[k][1]
    if (fy - y < 6) return
    hatch += line([[x, y + 2], [x + (rand() - 0.5) * 2, fy - 2 - rand() * 4]])
  })
  // 안벽 밑 바닥의 그늘 — 벽이 높은 가운데일수록 길게 내리긋는 짧은 빗금
  floorLine.forEach(([x, y], k) => {
    const hgt = y - north[k][1]
    if (k % 2 || hgt < 14 || Math.abs(x - C[0]) < 34) return
    const l = 4 + hgt * 0.22
    hatch += line([[x + 1, y + 2], [x - l * 0.45, y + 2 + l]])
  })
  // 앞쪽(남쪽) 테두리 안으로 짧은 빗금 — 땅이 꺼져 내려가는 쪽
  south.forEach(([x, y], k) => {
    if (k % 2 || k < 2 || k > south.length - 3) return
    const dx = C[0] - x
    const dy = C[1] - y
    const len = Math.hypot(dx, dy)
    const l = 9 + rand() * 5
    hatch += line([[x, y], [x + (dx / len) * l, y + (dy / len) * l * 0.8]])
  })
  // 바닥도 가루가 된 돌 — 성긴 점
  let dust = ''
  for (let k = 0; k < 260; k++) {
    const px = C[0] + (rand() - 0.5) * RX * 1.9
    const py = C[1] - 30 + rand() * (RYS + 26)
    // 표시와 그 밑 이름(세계 표시 [600,530], 이름은 아래) 자리는 비운다
    const underLabel = px > 548 && px < 652 && py < 576
    if (pitE(px, py) < 0.93 && py > 532 && !underLabel) dust += dot([px, py])
  }
  return [P('shade', poly(rim)), P('stone', wallPoly), P('hatch', hatch), P('ink', line(floorLine) + dust), P('ink-bold', poly(rim))]
}

/** 사람이 다듬은 모난 동굴 입구 — 먼 쪽 안벽에 파인 거석 문틀(위가 좁은 사다리꼴, 미끄러져 금 간 상인방).
 *  테두리 위로는 아무것도 솟지 않는다 (Revelation at the Eye: 'the ominous, angular mouth of a cave that certainly was not natural stone') */
function caveMouth(x, y) {
  const open = poly([[x - 16, y], [x - 10, y - 37], [x + 10, y - 37], [x + 16, y]])
  const jl = poly([[x - 30, y + 1], [x - 22, y - 39], [x - 10, y - 37], [x - 16, y]])
  const jr = poly([[x + 16, y], [x + 10, y - 37], [x + 22, y - 40], [x + 31, y + 1]])
  const lt = poly([[x - 27, y - 37], [x - 25, y - 50], [x + 28, y - 55], [x + 28, y - 41], [x + 10, y - 37], [x - 10, y - 37]])
  const crack = line([[x + 7, y - 53], [x + 4, y - 47], [x + 8, y - 43], [x + 5, y - 38]])
  let hatch = crack
  for (let k = 1; k <= 3; k++) hatch += line([[x + 13 + k * 4, y - 36 - k * 0.8], [x + 17 + k * 4, y - 2]])
  for (let k = 1; k <= 2; k++) hatch += line([[x - 24 + k * 6, y - 47 - k * 0.6], [x - 25 + k * 6, y - 40]])
  return [
    P('fill', jl + lt),
    P('shade', jr),
    P('hatch', hatch),
    P('dark', open),
    P('ink', open),
    P('ink-bold', jl + jr + lt),
    ...KIT.rocks(x - 34, y + 3, 4, 2, 'cm1'),
    ...KIT.rocks(x + 36, y + 4, 4.5, 2, 'cm2'),
  ]
}

/** 모난 돌덩이 하나 — (x, y) 는 밑 가운데. 곧게 선 벽도 가운데 솟은 꼭지도 없이 꺾인 면이 한쪽으로 쏠린
 *  깨진 돌 (작게 그려도 오두막처럼 읽히지 않게) */
function chunk(x, y, sz, rand) {
  const w = sz * (0.6 + rand() * 0.28)
  const h = sz * (0.5 + rand() * 0.32)
  const n = 4 + Math.floor(rand() * 2)
  const pts = [[x - w, y]]
  for (let k = 1; k < n; k++) {
    const a = Math.PI + (k / n) * Math.PI + (rand() - 0.5) * 0.36
    const rr = 0.72 + rand() * 0.34
    pts.push([x + Math.cos(a) * w * rr, y + Math.sin(a) * h * rr * 1.12])
  }
  pts.push([x + w * (0.8 + rand() * 0.2), y - h * (0.08 + rand() * 0.18)], [x + w, y])
  let top = 1
  for (let k = 2; k < pts.length - 1; k++) if (pts[k][1] < pts[top][1]) top = k
  const foot = [x + (pts[top][0] - x) * 0.4 + w * 0.12, y]
  const face = poly([...pts.slice(top), foot])
  return [P('fill', poly(pts)), P('shade', face), P('hatch', line([pts[top], foot])), P('ink', poly(pts))]
}
/** 잔해 더미 — 모난 돌덩이를 아무렇게나 쌓은 무더기 (앞의 돌이 뒤를 가린다) */
function heap(x, y, w, h, seed) {
  const rand = rng(seed)
  const items = []
  for (const [n, lev] of [[3 + Math.round(rand()), 0], [2 + Math.round(rand() * 0.7), 0.4], [1, 0.72]]) {
    const rowW = w * (1 - lev * 0.7)
    for (let k = 0; k < n; k++) {
      const cx = x - rowW / 2 + (rowW * (k + 0.5)) / n + (rand() - 0.5) * rowW * 0.22
      const cy = y - h * lev + (rand() - 0.5) * h * 0.18
      const sz = (h * 0.55 + rand() * h * 0.45) * (1 - lev * 0.25)
      items.push({ y: cy, parts: chunk(cx, cy, sz, rand) })
    }
  }
  return stack(items)
}

/** 꼭대기가 부서져 나간 봉우리와 그 밑 돌무더기 비탈 ('witnesses watched the peaks transform, crumbling into dust') */
function stump(x, y, w, h, seed) {
  const rand = rng(seed)
  const lx = x - w
  const rx = x + w * 0.9
  const ax = x + (rand() - 0.5) * w * 0.2
  // 원래 꼭대기의 60% 남짓에서 부러진 선
  const cl = 0.6 + rand() * 0.08
  const cr = 0.52 + rand() * 0.08
  const pl = [lx + (ax - lx) * cl, y - h * cl]
  const pr = [rx + (ax - rx) * cr, y - h * cr]
  const brk = [pl]
  const teeth = [0.16, 0.06, 0.2, 0.04, 0.12]
  for (let i = 1; i < 6; i++) {
    const t = i / 6
    brk.push([pl[0] + (pr[0] - pl[0]) * t, pl[1] + (pr[1] - pl[1]) * t - teeth[i - 1] * h * (0.6 + rand() * 0.8)])
  }
  brk.push(pr)
  const bulge = [lx + (pl[0] - lx) * 0.42, y - h * cl * 0.66]
  // 세계 지도 산 기호처럼 바닥선은 긋지 않는다 (채움만 닫는다)
  const open = `M${pt([lx, y])}Q${pt(bulge)} ${pt(pl)}` + brk.slice(1).map((p) => `L${pt(p)}`).join('') + `L${pt([rx, y])}`
  const outline = open + 'Z'
  const shadeP = poly([[ax + (pr[0] - ax) * 0.3, y], brk[4], brk[5], pr, [rx, y]])
  let hatch = ''
  for (let i = 1; i <= 4; i++) {
    const t = i / 5
    const px = brk[3][0] + (rx - brk[3][0]) * t
    const py = brk[3][1] + (y - brk[3][1]) * t
    hatch += line([[px - 1, py + 3], [px - (y - py) * 0.28, y - 2]])
  }
  // 부러진 면 — 꼭대기 이빨에서 짧게 내리긋는 금
  for (let i = 1; i < brk.length - 1; i++) hatch += line([brk[i], [brk[i][0] + 1.5, brk[i][1] + h * 0.1]])
  // 돌무더기 비탈 (점과 잔돌)
  let scree = ''
  for (let i = 0; i < 60; i++) {
    const t = Math.sqrt(rand())
    const spread = (rand() - 0.5) * (w * 1.1 + t * w * 1.3)
    scree += dot([x + w * 0.1 + spread, y + 3 + t * h * 0.42])
  }
  return [P('ink', scree), P('fill', outline), P('shade', shadeP), P('hatch', hatch), P('ink', open), ...KIT.rocks(x + w * 0.55, y + h * 0.16, 5, 3, `${seed}-r`)]
}

/** 들쭉날쭉한 능선 — 세계 지도 산 기호처럼 바닥선 없이 톱니 마루만 긋고, 내리막(오른쪽) 비탈에서 왼쪽 아래로 빗금
 *  (Stone and Blood: Nahiri 'climbed a ridge') */
function ridge(x0, x1, y, h, seed) {
  const rand = rng(seed)
  const n = 9
  const crest = [[x0, y]]
  for (let i = 1; i < n; i++) {
    const t = i / n
    const env = Math.pow(Math.sin(Math.PI * t), 0.5)
    const peak = i % 2 === 1
    crest.push([x0 + (x1 - x0) * t + (rand() - 0.5) * 8, y - h * env * (peak ? 0.82 + rand() * 0.3 : 0.38 + rand() * 0.18)])
  }
  crest.push([x1, y])
  let hatch = ''
  for (let i = 0; i < crest.length - 1; i++) {
    const [ax, ay] = crest[i]
    const [bx, by] = crest[i + 1]
    if (by <= ay) continue
    for (let k = 1; k <= 3; k++) {
      const t = k / 4
      const px = ax + (bx - ax) * t
      const py = ay + (by - ay) * t
      const len = (y - py) * (0.5 + rand() * 0.3)
      hatch += line([[px - 0.6, py + 1.5], [px - len * 0.3, py + len]])
    }
  }
  return [P('fill', poly([...crest, [x1, y + 3], [x0, y + 3]])), P('hatch', hatch), P('ink', line(crest))]
}

/** 붉은 화산암 조각 (Stone and Blood: 'shards of red volcanic rock spinning lazily through the air') */
function shard(x, y, s, rot) {
  const c = Math.cos((rot * Math.PI) / 180)
  const si = Math.sin((rot * Math.PI) / 180)
  const T = ([px, py]) => [x + px * c - py * si, y + px * si + py * c]
  const d = poly([[-s, 0], [-s * 0.2, -s * 0.7], [s, -s * 0.2], [s * 0.3, s * 0.6]].map(T))
  return [P('fire', d), P('fire-ink', d)]
}

/** 떠도는 헤드론 (룬은 새긴 선만 — 빛나지 않는다) */
const drift = (x, y, len, rot, lift) => KIT.hedron(x, y, len, rot, { lift })
/** 쓰러진 헤드론 */
const fallen = (x, y, len, rot) => KIT.hedron(x, y, len, rot, { grounded: true })

// ---------------------------------------------------------------- 아쿰의 이빨의 지형지물
/** 자연 바위 아치 ('gravity-defying arches and spires') */
function arch(x, y, w, h, t, seed) {
  const rand = rng(seed)
  const outer = []
  const inner = []
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI - (i / 12) * Math.PI
    const jo = (rand() - 0.5) * t * 0.3
    outer.push([x + Math.cos(a) * (w / 2) + jo, y - Math.sin(a) * h + jo])
    inner.push([x + Math.cos(a) * (w / 2 - t), y - Math.sin(a) * (h - t * 1.15)])
  }
  const shape = poly([[x - w / 2 - t * 0.35, y], ...outer, [x + w / 2 + t * 0.35, y], ...[...inner].reverse()])
  const shadeP = poly([[x + w / 2 - t, y], ...outer.slice(9), [x + w / 2 + t * 0.35, y]])
  let hatch = ''
  for (let k = 1; k <= 3; k++) {
    const px = x + w / 2 - t + (t * 1.3 * k) / 4
    hatch += line([[px, y - h * 0.45], [px - 1, y - 2]])
  }
  return [P('fill', shape), P('shade', shadeP), P('hatch', hatch), P('ink', shape)]
}

/** 용암 줄기 ('Rock. Lava. Gravity.') */
function lava(pts, w, seed) {
  const rand = rng(seed)
  const a = offset(pts, (t) => (w / 2) * Math.sin(Math.PI * t) * (0.55 + rand() * 0.45))
  const b = offset(pts, (t) => -(w / 2) * Math.sin(Math.PI * t) * (0.55 + rand() * 0.45))
  const body = poly([...a, ...b.reverse()])
  return [P('fire', body), P('fire-ink', body)]
}

/** 은빛·푸른 풀포기 ('Aggressive silver and blue grasses take root in volcanic stone') */
const tuft = ([x, y], s = 6) => line([[x - s * 0.55, y - s * 0.65], [x - s * 0.12, y]]) + line([[x, y - s], [x, y]]) + line([[x + s * 0.55, y - s * 0.7], [x + s * 0.12, y]])

/** 가스 구멍과 그 둘레에 모인 기이한 풀 ('bizarre vegetation clusters around gas vents') */
function vent(x, y, seed) {
  const rand = rng(seed)
  let steam = ''
  for (let k = 0; k < 3; k++) {
    const sx = x - 4 + k * 4
    steam += smooth([[sx, y - 3], [sx - 3, y - 10], [sx + 2.5, y - 17], [sx - 1.5, y - 25 - k * 4]])
  }
  let blobs = ''
  let tufts = ''
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + rand() * 0.6
    const bx = x + Math.cos(a) * (11 + rand() * 5)
    const by = y + Math.sin(a) * (4.5 + rand() * 2.5)
    if (k % 2) blobs += ell(bx, by - 2, 2.6 + rand(), 2.4)
    else tufts += tuft([bx, by], 5)
  }
  return [P('dark', ell(x, y, 5.5, 2.2)), P('forest', blobs), P('hatch', blobs + steam), P('sea-ink', tufts)]
}

/** 천막 */
function tent(x, y, w, h) {
  const body = poly([[x - w / 2, y], [x, y - h], [x + w / 2, y]])
  return [
    P('fill', body),
    P('shade', poly([[x, y - h], [x + w / 2, y], [x + w * 0.06, y]])),
    P('dark', poly([[x - w * 0.09, y], [x - w * 0.01, y - h * 0.48], [x + w * 0.06, y]])),
    P('ink', body + line([[x, y - h], [x + w * 0.05, y - h - h * 0.28]])),
  ]
}

/** 결정 가시 하나 — 위로 솟거나(rot 0) 처마에 거꾸로 매달린(rot 180) */
function crystal(x, y, len, wid, rot) {
  const c = Math.cos((rot * Math.PI) / 180)
  const s = Math.sin((rot * Math.PI) / 180)
  const T = ([px, py]) => [x + px * c - py * s, y + px * s + py * c]
  const shape = poly([[-wid / 2, 0], [-wid / 2, -len * 0.8], [0, -len], [wid / 2, -len * 0.8], [wid / 2, 0]].map(T))
  const shadeP = poly([[wid * 0.08, 0], [0, -len], [wid / 2, -len * 0.8], [wid / 2, 0]].map(T))
  return [P('fill', shape), P('shade', shadeP), P('hatch', line([[wid * 0.08, -1], [0, -len]].map(T))), P('ink', shape)]
}
/** 결정 가시 무리 — 한 바위 밑동에서 같은 쪽으로 기울어 솟은 각진 기둥들. 크게 기운 것은 이웃 위로 처마처럼 걸린다 */
function spikes(x, y, s, lean, seed) {
  const rand = rng(seed)
  const n = 3 + Math.floor(rand() * 2)
  const items = []
  for (let k = 0; k < n; k++) {
    const ox = (k - (n - 1) / 2) * s * 0.3 + (rand() - 0.5) * 3
    const len = s * (0.55 + rand() * 0.6) * (k === 1 ? 1.25 : 1)
    items.push({ y: -len, parts: crystal(x + ox, y, len, s * (0.13 + rand() * 0.05), lean + (rand() - 0.5) * 16) })
  }
  const base = poly([[x - s * 0.62, y + 2], [x - s * 0.4, y - s * 0.12], [x + s * 0.1, y - s * 0.16], [x + s * 0.55, y - s * 0.06], [x + s * 0.68, y + 2]])
  return [...stack(items), P('fill', base), P('shade', poly([[x + s * 0.1, y - s * 0.16], [x + s * 0.55, y - s * 0.06], [x + s * 0.68, y + 2], [x + s * 0.1, y + 2]])), P('ink', base)]
}

// ---------------------------------------------------------------- 떠 있는 유적 지대 (Monument to a Lost Age, 2009)
/** 떠 있는 정육면체 돌덩이 — (x, y) 는 앞면 밑 가운데. 앞면에 알 수 없는 새김. far: 안개 속 먼 줄(가는 선) */
function block(x, y, w, h, d, seed, far = false) {
  const rand = rng(seed)
  const dx = d * 0.55
  const dy = d * 0.5
  const L = x - w / 2
  const Rr = x + w / 2
  const T = y - h
  // 오래되어 모서리가 떨어져 나가고 금 간 돌 ('ancient, cracked')
  const chip = h > 12 ? Math.min(w, h) * (0.12 + rand() * 0.1) : 0
  const front = chip ? poly([[L, y], [L, T + chip * 0.6], [L + chip, T], [Rr, T], [Rr, y]]) : poly([[L, y], [L, T], [Rr, T], [Rr, y]])
  const top = chip ? poly([[L + chip, T], [L + dx, T - dy], [Rr + dx, T - dy], [Rr, T]]) : poly([[L, T], [L + dx, T - dy], [Rr + dx, T - dy], [Rr, T]])
  const side = poly([[Rr, y], [Rr, T], [Rr + dx, T - dy], [Rr + dx, y - dy]])
  let carve = ''
  if (!far && w > 20 && h > 14) {
    // 새김 띠 — 두 줄 사이의 톱니 무늬 (글자처럼 읽히지 않게)
    const a = T + h * (0.2 + rand() * 0.1)
    const b = a + h * 0.2
    carve += line([[L + w * 0.08, a], [Rr - w * 0.08, a]]) + line([[L + w * 0.08, b], [Rr - w * 0.08, b]])
    const zz = []
    const n = 6 + 2 * Math.floor(rand() * 2)
    for (let k = 0; k <= n; k++) zz.push([L + w * 0.08 + (w * 0.84 * k) / n, k % 2 ? a + 1 : b - 1])
    carve += line(zz)
    if (rand() < 0.5) carve += line([[L + w * 0.5, b + h * 0.12], [L + w * 0.5, y - h * 0.12]])
    else carve += line([[Rr - w * 0.2, T], [Rr - w * 0.26, T + h * 0.3], [Rr - w * 0.18, T + h * 0.55], [Rr - w * 0.24, y]])
  }
  let hatch = ''
  for (let k = 1; k <= 2; k++) {
    const t = k / 3
    hatch += line([[Rr + dx * t, y - dy * t - 1], [Rr + dx * t, T - dy * t + 2]])
  }
  return [P('fill', front + top), P('shade', side), P('hatch', hatch + carve), P(far ? 'hatch' : 'ink', front + top + side)]
}

/** 안개 — 위 가장자리를 구름처럼 둥글게 두른 둑. lines: 안에 긋는 가로 안개 선 줄 수 */
function fogBank(x0, x1, yTop, yBot, seed, lines = 1) {
  const rand = rng(seed)
  let edge = `M${pt([x0, yTop + 5])}`
  let x = x0
  while (x < x1 - 1) {
    const r = 9 + rand() * 12
    const nx = Math.min(x1, x + r * 2)
    edge += `A${r1((nx - x) / 2)} ${r1(r * 0.5)} 0 0 1 ${pt([nx, yTop + 3 + rand() * 5])}`
    x = nx
  }
  const body = `${edge}L${pt([x1, yBot])}L${pt([x0, yBot])}Z`
  let wisps = ''
  for (let k = 0; k < lines; k++) {
    const ly = yTop + 13 + (k * (yBot - yTop - 16)) / Math.max(1, lines)
    let lx = x0 + 10 + rand() * 30
    while (lx < x1 - 30) {
      const len = 34 + rand() * 50
      const ex = Math.min(x1 - 10, lx + len)
      wisps += `M${pt([lx, ly])}Q${pt([(lx + ex) / 2, ly - 2.5])} ${pt([ex, ly + (rand() - 0.5) * 2])}`
      lx = ex + 22 + rand() * 40
    }
  }
  return [P('fill', body), P('hatch', edge + wisps)]
}

/** 떠 있는 유적 지대 — 앞에서 뒤(북동)로 물러나며 작아지는 돌덩이 줄 ('converging at the horizon like the rows of some
 *  eldritch crop'), 먼 줄은 안개에 잠긴다. 돌덩이는 헤드론이 아닌 정육면체 ('cubical stone slabs') */
const VP = [1045, 640]
const ROW_T = [1, 0.74, 0.585, 0.485]
const COLS = [785, 870, 955, 1040]
const FRONT_Y = 952
const STATUE = [1, 0] // [열, 줄] — 석상이 선 앞줄 판석
const STATUE_AT = [872, 940] // 석상(Eldrazi Monument) 발밑
const SLAB = [STATUE_AT[0] - 2, STATUE_AT[1] + 4] // 판석 앞면 밑 가운데
const rowXY = (c, r) => [VP[0] + (COLS[c] - VP[0]) * ROW_T[r], VP[1] + (FRONT_Y - VP[1]) * ROW_T[r]]
function ruinField() {
  const out = []
  // 돌덩이 밑 땅을 가리는 안개 바탕 ('through a blanket of fog')
  out.push(P('fill', poly([[742, 1014], [1112, 1014], [1112, 770], [1000, 760], [900, 770], [800, 860]])))
  const rows = ROW_T.map((t, r) => {
    const items = []
    COLS.forEach((cx, c) => {
      const [x, y] = rowXY(c, r)
      const rand = rng(`blk-${r}-${c}`)
      if (c === STATUE[0] && r === STATUE[1]) {
        // 석상이 선 얇은 판석 — 앞면 밑선이 석상 발밑 바로 아래라서 그림 이름(그림 밑)이 판석에 겹치지 않는다
        items.push(...block(SLAB[0], SLAB[1], 80, 5, 34, 'slab'))
        return
      }
      if (r > 0 && rand() < 0.14) return
      const w = (50 + rand() * 10) * t
      const lift = (rand() - 0.5) * 9 * t
      items.push(...block(x + (rand() - 0.5) * 6 * t, y + lift, w, w * (0.74 + rand() * 0.12), w * 0.55, `blk-${r}-${c}`, r === 3))
    })
    return items
  })
  out.push(...rows[3])
  out.push(...fogBank(905, 1100, 776, 800, 'fog-far', 1))
  out.push(...rows[2])
  out.push(...fogBank(852, 1106, 826, 842, 'fog-mid', 0))
  out.push(...rows[1])
  out.push(...fogBank(760, 1108, 880, 900, 'fog-near', 0))
  out.push(...rows[0])
  // 앞줄 밑 안개 둑 — 돌덩이들이 그 위 빈 하늘에 떠 있다 (석상 이름이 들어갈 틈을 두고)
  out.push(...fogBank(744, 1110, 986, 1014, 'fog-front', 1))
  return out
}
/** 거꾸로 떠오르는 자갈 ('Pebbles tend to roll the wrong way around here') */
function pebbles(list) {
  let d = ''
  let dash = ''
  for (const [x, y, r] of list) {
    d += ell(x, y, r * 1.3, r)
    dash += line([[x, y - r - 3], [x, y - r - 8]]) + line([[x - 2.5, y - r - 11], [x - 2.5, y - r - 14]])
  }
  return [P('fill', d), P('ink', d), P('hatch', dash)]
}

// ---------------------------------------------------------------- 그림 모으기
const parts = []
// 해안
parts.push(...coastCliffs(), ...inletRipples())
parts.push(P('sea-ink', [[516, 64], [585, 36], [610, 112], [548, 150], [455, 18], [640, 18]].filter(([x, y]) => inSea(x, y)).map(reef).join('')))
parts.push(...needle(503, 116, 9, 26, 'n1'), ...needle(648, 66, 8, 22, 'n2'), ...needle(576, 186, 7, 18, 'n3'))

// 땅바닥 — 가루 땅, 용암 줄기, 가스 구멍, 풀포기
parts.push(...powder())
parts.push(...lava([[1030, 430], [1084, 434], [1146, 426], [1208, 434], [1258, 428]], 7, 'lava-ne'))
parts.push(...lava([[62, 772], [96, 780], [132, 774], [170, 784]], 5, 'lava-w'))
parts.push(...vent(176, 704, 'vent-w'), ...vent(1086, 706, 'vent-e'))
{
  const rand = rng('tufts')
  const spots = [
    [60, 610], [120, 650], [250, 700], [300, 790], [90, 820], [140, 900], [235, 925], [100, 960], [262, 960], [60, 940], [118, 1004],
    [902, 252], [1180, 250], [1330, 220], [1010, 690], [1150, 700], [1330, 760], [1250, 860], [770, 1050], [1010, 1040],
    [360, 360], [880, 330],
  ]
  let d = ''
  for (const [x, y] of spots) d += tuft([x + (rand() - 0.5) * 10, y], 5 + rand() * 2.5)
  parts.push(P('sea-ink', d))
}

// 구덩이와 동굴 입구 (지면보다 낮다 — 둘레의 것들보다 먼저)
parts.push(...pit())
parts.push(...caveMouth(600, 520))
// 구덩이 바닥의 돌·헤드론 조각 (Revelation: 'picking his way among enormous fallen hedrons')
{
  const rand = rng('pit-floor')
  const floorItems = []
  // 무너진 안벽 밑에 쌓인 돌 무더기(문 양옆) — 바닥 가운데와 앞쪽은 성기게. 문 앞(표시와 이름 자리)은 비운다
  for (const [x, y, sz] of [
    [474, 556, 7], [494, 548, 9], [516, 541, 7], [537, 538, 5], [486, 570, 5], [508, 561, 5],
    [664, 539, 5], [685, 541, 8], [707, 547, 9], [729, 557, 7], [695, 562, 5], [718, 572, 5],
    [566, 636, 8], [638, 648, 6], [604, 608, 4], [530, 632, 5], [690, 628, 6], [742, 606, 6], [600, 664, 5], [478, 604, 5],
  ]) {
    floorItems.push({ y, parts: chunk(x, y, sz, rand) })
  }
  // 바닥의 갈라진 금
  floorItems.push({ y: 500, parts: [P('hatch', line([[520, 572], [528, 588], [522, 602], [532, 616]]) + line([[664, 566], [656, 582], [666, 598]]) + line([[700, 640], [690, 652], [698, 662]]) + line([[492, 630], [506, 640], [500, 654]]))] })
  floorItems.push({ y: 604, parts: fallen(526, 600, 14, 96) }, { y: 594, parts: fallen(682, 590, 11, -48) }, { y: 632, parts: fallen(640, 628, 9, 70) })
  parts.push(...stack(floorItems))
}

// 땅 위에 선 것들 — 뒤(위)에서 앞(아래)으로
const items = []
const add = (y, p) => items.push({ y, parts: p })
// 둘레 잔해 더미 (The Art of Magic: 'a pit surrounded by heaps of rubble and fallen hedrons')
for (const [x, y, w, h, s] of [
  [512, 470, 62, 21, 'h1'], [676, 468, 56, 19, 'h2'], [728, 496, 42, 16, 'h3'], [450, 504, 46, 17, 'h4'],
  [430, 554, 38, 15, 'h5'], [754, 616, 34, 13, 'h6'], [718, 672, 46, 15, 'h7'], [624, 688, 62, 17, 'h8'],
  [448, 642, 32, 12, 'h9'],
]) add(y, heap(x, y, w, h, s))
// 쓰러진 헤드론 — 가지런한 고리가 아니라 흩어져 (Zada: 'A scrambled mess doesn't have a center')
for (const [x, y, len, rot] of [
  [482, 464, 24, 102], [708, 456, 21, -68], [806, 650, 16, 62], [422, 560, 19, -112], [560, 694, 18, 78],
  [676, 706, 15, -96], [740, 646, 13, 124], [524, 414, 14, 36], [356, 520, 21, 82], [884, 606, 19, -58],
  [646, 770, 17, 102], [930, 476, 15, 24], [318, 650, 14, -70],
]) add(y + len * 0.3, fallen(x, y, len, rot))
// 부서진 봉우리 그루터기 둘과 곁의 능선 (Stone and Blood: Nahiri 'climbed a ridge').
// 그루터기는 셋으로 두지 않는다 — 세 타이탄이 따로 솟은 자리처럼 읽히면 안 된다 (솟은 자리는 Eye 위의 산 하나)
add(474, stump(368, 474, 36, 74, 'st1'))
add(392, stump(458, 392, 28, 58, 'st2'))
add(424, ridge(694, 866, 424, 36, 'ridge'))
// 서쪽: 벼랑 위 들판과 첨탑 (Revelation: 'a vast expanse of jagged volcanic rocks and treacherous canyons', 'precarious spires')
add(880, KIT.cliff([[-10, 872], [90, 884], [190, 870], [290, 882], [380, 862], [430, 840]], { depth: 30, step: 8, seed: 'cliff-w' }))
add(612, KIT.spire(330, 612, 18, 74, 'sp1'))
add(598, KIT.spire(362, 598, 13, 52, 'sp2'))
add(640, KIT.spire(290, 640, 15, 58, 'sp3'))
add(560, KIT.spire(250, 560, 12, 44, 'sp4'))
add(600, arch(220, 600, 46, 52, 10, 'arch-w'))
add(760, KIT.rocks(240, 760, 9, 4, 'rk1'))
add(690, KIT.rocks(90, 690, 8, 3, 'rk2'))
add(820, KIT.rocks(330, 820, 8, 3, 'rk3'))
// 동쪽 골짜기의 첨탑과 아치
add(250, KIT.spire(1310, 250, 14, 60, 'sp5'))
add(240, KIT.spire(1290, 240, 10, 40, 'sp6'))
add(252, arch(1176, 252, 40, 44, 9, 'arch-ne'))
// 아노원 연맹의 천막 (2009년 그림의 천막 — 지금 모습은 공식 묘사가 없다)
add(974, tent(152, 974, 24, 18))
add(954, tent(172, 954, 20, 15))
add(956, tent(210, 956, 18, 14))
// 가시지대의 북쪽 끝 — 크게 기울어 이웃 위로 걸린 결정 가시들 (Spikefield Hazard: 'You'll only bring down more spikes')
add(1058, spikes(40, 1058, 46, 24, 'cr1'))
add(1080, spikes(118, 1080, 40, -30, 'cr2'))
add(1096, spikes(196, 1096, 34, 34, 'cr3'))
add(1104, spikes(222, 1102, 26, -12, 'cr4'))
// 결정 들판의 반짝임 ('crystalline fields shimmer in a rainbow of colors beneath the harsh sun')
{
  const glint = ([x, y], r) => line([[x - r, y], [x + r, y]]) + line([[x, y - r], [x, y + r]]) + line([[x - r * 0.45, y - r * 0.45], [x + r * 0.45, y + r * 0.45]]) + line([[x - r * 0.45, y + r * 0.45], [x + r * 0.45, y - r * 0.45]])
  add(1110, [P('hatch', [[[84, 1010], 5], [[160, 1046], 4], [[232, 1060], 4.5], [[20, 1036], 3.5], [[178, 1026], 3.5]].map(([q, r]) => glint(q, r)).join(''))])
}
parts.push(...stack(items))

// 떠 있는 유적 지대와 그 밑 비탈의 자갈
parts.push(...ruinField())
parts.push(...pebbles([[732, 1034, 2.5], [758, 1026, 1.9], [744, 1052, 2.2], [770, 1046, 1.7]]))

// 공중에 떠도는 헤드론과 붉은 바위 조각 — 맨 위에
for (const [x, y, len, rot, lift] of [
  [330, 190, 28, 24, 2.0], [505, 300, 26, 16, 2.2], [552, 322, 17, -14, 2.6], [655, 402, 20, -24, 2.8],
  [604, 392, 12, 36, 3.6], [560, 800, 22, 10, 2.2], [702, 772, 18, -18, 2.5],
]) parts.push(...drift(x, y, len, rot, lift))
for (const [x, y, s, rot] of [[575, 362, 7, 20], [474, 420, 6, -30], [736, 448, 5, 60], [640, 348, 6, 110], [536, 778, 5, 40]]) parts.push(...shard(x, y, s, rot))

// ---------------------------------------------------------------- 지형 기호 (아쿰의 이빨 — 동서로 끊긴 여러 산줄기, 사이는 골짜기와 협곡)
const FIELD = {
  nwCoast: { kind: 'mountain', points: [[0, 95], [110, 88], [220, 78], [320, 88], [400, 128], [440, 190], [432, 262], [380, 318], [290, 330], [190, 318], [90, 330], [0, 322]] },
  neNorth: { kind: 'mountain', points: [[728, 30], [760, 8], [900, 0], [1400, 0], [1400, 150], [1270, 160], [1120, 146], [980, 156], [850, 146], [740, 132], [700, 96]] },
  neSouth: { kind: 'mountain', points: [[830, 300], [980, 296], [1130, 300], [1280, 290], [1400, 282], [1400, 408], [1260, 416], [1110, 404], [980, 398], [880, 380], [815, 338]] },
  east: { kind: 'mountain', points: [[930, 512], [1100, 504], [1250, 506], [1300, 520], [1290, 580], [1300, 656], [1250, 668], [1130, 652], [1010, 624], [930, 590]], density: 1.3 },
  south: { kind: 'mountain', points: [[430, 836], [560, 824], [700, 836], [770, 856], [772, 960], [730, 1030], [600, 1040], [480, 1030], [446, 960]] },
  southEast: { kind: 'mountain', points: [[1140, 900], [1270, 884], [1400, 874], [1400, 1100], [1150, 1100], [1120, 1000]] },
  west: { kind: 'mountain', points: [[0, 388], [140, 378], [270, 392], [300, 446], [268, 520], [150, 532], [0, 526]] },
  uplandCanyons: { kind: 'canyon', points: [[20, 640], [200, 618], [340, 650], [370, 740], [330, 830], [180, 848], [30, 838]] },
}
// 앱(childTerrain.ts)은 필드 차례(번호)로 기호의 씨앗을 정하고, poissonDisk 는 반지름×5 격자마다 씨앗을 한 번만 던진다.
// 그래서 좁은 띠 모양 필드는 차례에 따라 기호가 하나도 안 생길 수 있다 — 모든 필드가 고루 채워지는 차례를 골랐다.
// 필드 모양을 고치면 이 차례도 다시 골라야 한다.
const FIELD_ORDER = ['uplandCanyons', 'east', 'nwCoast', 'neSouth', 'neNorth', 'south', 'west', 'southEast']

/** 바로 이웃한 같은 칠은 한 path 로 — 칠하는 차례는 그대로 */
function compact(list) {
  const out = []
  for (const p of list) {
    const last = out[out.length - 1]
    if (last && last.cls === p.cls) last.d += p.d
    else out.push({ cls: p.cls, d: p.d })
  }
  return out
}

CHILDMAPS.push({
  id: 'eye-of-ugin',
  size: [1400, 1100],
  glyphScale: 4,
  terrain: FIELD_ORDER.map((k) => FIELD[k]),
  parts: compact(parts),
  labels: [
    { text: 'Teeth of Akoum', textKo: '아쿰의 이빨', at: [862, 208], size: 40, kind: 'area' },
    { text: 'Kargan tribal lands', textKo: '카르간 부족의 대지', at: [1366, 566], size: 27, kind: 'area', rotate: -90 },
    { text: 'Spikefields', textKo: '가시지대', at: [316, 1082], size: 26, kind: 'area' },
  ],
  subjects: {
    'sorin-markov': { at: [496, 702], size: 92, flip: true },
    'chandra-ablaze': { at: [812, 556], size: 92, flip: true },
    'eldrazi-monument': { at: STATUE_AT, size: 96 },
  },
  markAnchors: { 'eye-of-ugin': 'below' },
})
