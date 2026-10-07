// 말라키르 — 하그라 늪 한가운데 낮은 언덕 위의 흡혈귀 도시 (자식 지도, 1400×1000 = 세계 x1950–2090, y1070–1170 의 10배).
// 시점: Zendikar Rising(2020) 이후. 구역들의 모습은 마지막 서술(Art of Magic, 2016)을 따라 무너진 채로 그린다.
// 공식: 낮은 언덕 위, 가장 높은 칼라스트리아 구역, 낮은 Emevera 구역(제방이 무너져 늪이 됨), 그 사이 Urnaav 구역(돌길과 좁은 운하),
//       물 위의 니르카나 구역(썩은 운하), 침수된 폐허 게트 구역, 성문(위치 미상), 늪의 섬·바위·갈대.
// 해석: 언덕의 모양, 구역들의 방위와 경계, 게트 구역의 자리, 칼라스트리아 앞 성벽·성문·운하·제방의 배치, 말라키르 수렁의 범위.
const K = KIT
const { line, poly, smooth, rng, stack } = K
const P = (cls, d) => ({ cls, d })
const r1 = (v) => Math.round(v * 10) / 10
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`

// ---------- 기하 ----------
/** Catmull-Rom 곡선을 촘촘한 꺾은선으로 (닫힌 고리) — 그리기와 광선 계산이 같은 선을 쓰게 */
function dense(pts, steps = 6) {
  const n = pts.length
  const at = (i) => pts[(i + n) % n]
  const out = []
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    for (let s = 0; s < steps; s++) {
      const t = s / steps
      const t2 = t * t
      const t3 = t2 * t
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])])
    }
  }
  return out
}
/** 중심 c 에서 각도 a 로 쏜 광선이 고리에 닿는 거리 */
function rayHit(ring, c, a) {
  const dx = Math.cos(a)
  const dy = Math.sin(a)
  let best = Infinity
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i]
    const q = ring[(i + 1) % ring.length]
    const ex = q[0] - p[0]
    const ey = q[1] - p[1]
    const den = dx * ey - dy * ex
    if (Math.abs(den) < 1e-9) continue
    const t = ((p[0] - c[0]) * ey - (p[1] - c[1]) * ex) / den
    const s = ((p[0] - c[0]) * dy - (p[1] - c[1]) * dx) / den
    if (t > 0 && s >= 0 && s <= 1 && t < best) best = t
  }
  return best
}
/** 들쭉날쭉한 둥근 고리 */
function blob(cx, cy, rx, ry, seed, n = 11, jit = 0.2) {
  const rand = rng(seed)
  const pts = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const k = 1 + (rand() - 0.5) * 2 * jit
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
  }
  return pts
}
const closed = (pts) => line(pts) + 'Z'
const asStone = (parts) => parts.map((p) => (p.cls === 'fill' ? P('stone', p.d) : p))

// ---------- 물 ----------
/** 고인 물 — 밑에 양피지를 깔아 늪 기호를 가리고, 물빛 채움과 물가 선 */
function water(ring, o = {}) {
  const d = closed(ring)
  const parts = [P('fill', d), P('sea', d)]
  if (o.edge !== false) parts.push(P('sea-ink', d))
  return parts
}
/** 물 위에 선 것의 밑동 물결 한 줄 */
const waterline = (x, y, w) => P('sea-ink', `M${pt([x - w / 2, y])}Q${pt([x - w / 4, y - 1.6])} ${pt([x, y])}Q${pt([x + w / 4, y + 1.6])} ${pt([x + w / 2, y])}`)

/** 갈대 포기 — 가는 줄기 몇 가닥, 몇은 끝에 부들 이삭 */
function reeds(x, y, w, n, seed, h = 14) {
  const rand = rng(seed)
  let d = ''
  let heads = ''
  for (let i = 0; i < n; i++) {
    const rx = x + (rand() - 0.5) * w
    const ry = y + (rand() - 0.5) * 3
    const rh = h * (0.6 + rand() * 0.5)
    const lean = (rand() - 0.5) * h * 0.35
    d += `M${pt([rx, ry])}Q${pt([rx + lean * 0.2, ry - rh * 0.6])} ${pt([rx + lean, ry - rh])}`
    if (rand() < 0.35) heads += poly([[rx + lean * 0.86 - 1.1, ry - rh * 0.9], [rx + lean * 0.86 + 1.1, ry - rh * 0.9], [rx + lean * 0.8 + 1.1, ry - rh * 0.68], [rx + lean * 0.8 - 1.1, ry - rh * 0.68]])
  }
  return [P('hatch', d), ...(heads ? [P('dark', heads)] : [])]
}

/** 큰 수련 잎 — 물 위에 납작한 원, 한쪽이 갈라진 */
function lilies(x, y, w, n, seed) {
  const rand = rng(seed)
  let d = ''
  for (let i = 0; i < n; i++) {
    const cx = x + (rand() - 0.5) * w
    const cy = y + (rand() - 0.5) * w * 0.35
    const r = 3.2 + rand() * 2.6
    const a0 = rand() * Math.PI * 2
    const a1 = a0 + 0.5
    const p0 = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r * 0.55]
    const p1 = [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r * 0.55]
    d += `M${pt([cx, cy])}L${pt(p1)}A${r1(r)} ${r1(r * 0.55)} 0 1 1 ${pt(p0)}Z`
  }
  return [P('forest', d), P('hatch', d)]
}

// ---------- 건물 ----------
/** 꼭대기가 부서진 탑 — 들쭉날쭉한 윗선, 발치의 돌무더기 */
function brokenTower(x, y, w, h, seed, stone = true) {
  const rand = rng(seed)
  const tw = w * 0.88
  const L = x - w / 2
  const R = x + w / 2
  const tl = x - tw / 2
  const tr = x + tw / 2
  const top = [[tl, y - h]]
  const n = 4
  for (let i = 1; i < n; i++) top.push([tl + (tw * i) / n, y - h * (0.72 + rand() * 0.26)])
  top.push([tr, y - h * 0.66])
  const body = poly([[L, y], ...top, [R, y]])
  const shade = poly([[x + w * 0.16, y], [x + tw * 0.16, y - h * 0.8], [tr, y - h * 0.66], [R, y]])
  let hatch = ''
  for (let i = 1; i <= 3; i++) {
    const t = i / 4
    hatch += line([[x + w * 0.16 + (R - x - w * 0.16) * t, y - h * 0.06], [x + tw * 0.16 + (tr - x - tw * 0.16) * t, y - h * 0.6]])
  }
  const slit = poly([[x - w * 0.05, y - h * 0.62], [x + w * 0.05, y - h * 0.62], [x + w * 0.05, y - h * 0.62 + w * 0.4], [x - w * 0.05, y - h * 0.62 + w * 0.4]])
  return [P(stone ? 'stone' : 'fill', body), P('shade', shade), P('hatch', hatch), P('dark', slit), P('ink-bold', body), ...K.rocks(x + w * 0.7, y + 1, w * 0.18, 2, `${seed}-r`)]
}

/** 지붕 없는 벽 — 집의 벽만 남은 폐허 (창 구멍 둘) */
function shell(x, y, w, h, seed) {
  const rand = rng(seed)
  const L = x - w / 2
  const R = x + w / 2
  const n = 5
  const top = []
  for (let i = 0; i <= n; i++) top.push([L + (w * i) / n, y - h * (0.45 + rand() * 0.55)])
  const outline = poly([[L, y], ...top, [R, y]])
  const side = poly([[x + w * 0.24, y], [x + w * 0.24, top[Math.round(n * 0.62)][1]], ...top.slice(Math.round(n * 0.62) + 1), [R, y]])
  let hatch = ''
  for (let i = 1; i <= 2; i++) {
    const sx = x + w * 0.24 + ((R - x - w * 0.24) * i) / 3
    hatch += line([[sx, y - h * 0.4], [sx, y - h * 0.06]])
  }
  const win = (cx) => poly([[cx - w * 0.07, y - h * 0.42], [cx + w * 0.07, y - h * 0.42], [cx + w * 0.07, y - h * 0.18], [cx - w * 0.07, y - h * 0.18]])
  return [P('stone', outline), P('shade', side), P('hatch', hatch), P('dark', win(x - w * 0.22) + win(x + w * 0.06)), P('ink', outline)]
}

/** 물에 잠긴 지붕 — 박공 지붕만 물 위로 */
function drowned(x, y, w, rh) {
  const L = x - w / 2
  const R = x + w / 2
  const roof = poly([[L, y], [x, y - rh], [R, y]])
  const shade = poly([[x, y - rh], [R, y], [x, y]])
  const hatch = line([[x + w * 0.16, y - rh * 0.6], [x + w * 0.11, y]]) + line([[x + w * 0.32, y - rh * 0.3], [x + w * 0.28, y]])
  return [P('fill', roof), P('shade', shade), P('hatch', hatch), P('ink', roof), waterline(x, y + 1.5, w * 1.3)]
}

/** 기둥 위의 집 — 물 위에 선 낡은 집 (니르카나). y 는 물 높이 */
function stilt(x, y, w, h, legs, seed, o = {}) {
  const rand = rng(seed)
  const base = y - legs
  let st = ''
  const n = 3
  for (let i = 0; i < n; i++) {
    const sx = x - w * 0.42 + (w * 0.84 * i) / (n - 1)
    st += line([[sx, base], [sx + (rand() - 0.5) * 2, y + 1]])
  }
  const deck = poly([[x - w * 0.6, base], [x + w * 0.6, base], [x + w * 0.6, base + 2.4], [x - w * 0.6, base + 2.4]])
  const house = K.house(x, base, w, h, { roof: o.roof ?? 'gable', door: false, roofH: o.roofH })
  const parts = [P('ink', st), ...house.slice(0, -1)]
  // 낡은 집: 지붕에 뚫린 구멍
  if (o.hole) {
    const hx = x + (rand() - 0.5) * w * 0.3
    const top = base - h
    const rh = o.roofH ?? w * 0.5
    parts.push(P('dark', poly([[hx - w * 0.1, top - rh * 0.2], [hx + w * 0.06, top - rh * 0.42], [hx + w * 0.13, top - rh * 0.12], [hx - w * 0.02, top - rh * 0.02]])))
  }
  parts.push(house.at(-1), P('fill', deck), P('ink', deck), waterline(x, y + 1.5, w * 1.1))
  return parts
}

/** 제방 — 낮고 두꺼운 돌둑 (옆에서 본 띠, 위는 둑길). 마디마다 따로 쌓는다 */
function dike(pts, h, seed) {
  const items = []
  const rand = rng(seed)
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const face = poly([a, b, [b[0], b[1] - h], [a[0], a[1] - h]])
    const t = h * 0.55
    const top = poly([[a[0], a[1] - h], [b[0], b[1] - h], [b[0] - 1.5, b[1] - h - t], [a[0] + 1.5, a[1] - h - t]])
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    let hatch = ''
    const m = Math.max(1, Math.floor(len / 6))
    for (let k = 1; k < m; k++) {
      const s = k / m
      const px = a[0] + (b[0] - a[0]) * s
      const py = a[1] + (b[1] - a[1]) * s
      hatch += line([[px, py - h * (0.2 + rand() * 0.15)], [px, py - h * 0.85]])
    }
    items.push({ y: Math.max(a[1], b[1]), parts: [P('stone', face), P('fill', top), P('hatch', hatch), P('ink', face + top)] })
  }
  return items
}

/** 떠 있는 흙바위 섬 — 풀 덮인 윗면, 뾰족한 밑동, 늘어진 뿌리, 한쪽에서 쏟아지는 물줄기, 땅의 그림자 */
function clod(x, y, w, lift, seed) {
  const rand = rng(seed)
  const L = x - w / 2
  const R = x + w / 2
  const topPts = []
  for (let i = 0; i <= 6; i++) topPts.push([L + (w * i) / 6, y - (i > 0 && i < 6 ? 2 + rand() * 3 : 0)])
  const tip = [x + w * 0.08, y + w * 0.62]
  const under = [[R, y], [R - w * 0.12, y + w * 0.2], [x + w * 0.24, y + w * 0.34], tip, [x - w * 0.16, y + w * 0.38], [L + w * 0.14, y + w * 0.18], [L, y]]
  const body = poly([...topPts, ...under.slice(1, -1)])
  const shade = poly([[x + w * 0.02, y + 2], [R, y], [R - w * 0.12, y + w * 0.2], [x + w * 0.24, y + w * 0.34], tip])
  let hatch = ''
  for (let i = 1; i <= 4; i++) {
    const s = i / 5
    hatch += line([[x + w * 0.06 + w * 0.4 * s, y + 3], [x + w * 0.08 + w * 0.16 * s, y + w * 0.5 * (1 - s * 0.5)]])
  }
  // 윗면 풀포기
  let grass = ''
  for (let i = 0; i < 5; i++) {
    const gx = L + w * (0.12 + i * 0.19) + (rand() - 0.5) * 3
    const gy = y - 1.5
    grass += `M${pt([gx - 2.4, gy])}l1.2 -4.2M${pt([gx, gy])}l0 -5.4M${pt([gx + 2.4, gy])}l-1.2 -4.2`
  }
  // 늘어진 뿌리
  let roots = ''
  for (const [rx, ry, rl] of [[x - w * 0.12, y + w * 0.34, w * 0.2], [x + w * 0.12, y + w * 0.42, w * 0.26], [x + w * 0.3, y + w * 0.26, w * 0.14]]) {
    roots += `M${pt([rx, ry])}q${r1(-2)} ${r1(rl * 0.5)} ${r1(1)} ${r1(rl)}`
  }
  // 물줄기: 왼쪽 가장자리에서 땅까지
  const fx = L + w * 0.08
  const fall = `M${pt([fx, y + 1])}C${pt([fx - 5, y + 6])} ${pt([fx - 6, y + lift * 0.4])} ${pt([fx - 6, y + lift])}` + `M${pt([fx + 2.4, y + 3])}C${pt([fx - 1.5, y + 9])} ${pt([fx - 2.5, y + lift * 0.45])} ${pt([fx - 2.2, y + lift])}`
  const splash = K.ripples(fx - 4, y + lift + 2, 9, 2, `${seed}-s`)
  const sy = y + lift + 4
  const sh = `M${pt([x - w * 0.42, sy])}A${r1(w * 0.42)} ${r1(w * 0.1)} 0 1 0 ${pt([x + w * 0.42, sy])}A${r1(w * 0.42)} ${r1(w * 0.1)} 0 1 0 ${pt([x - w * 0.42, sy])}Z`
  return {
    ground: [P('fill', sh), P('shade', sh)],
    air: [P('sea-ink', fall), ...splash, P('fill', body), P('shade', shade), P('hatch', hatch + roots), P('forest', poly(topPts.concat([[R, y + 2.5], [L, y + 2.5]]))), P('ink', grass), P('ink-bold', body)],
  }
}

/** 갈대로 둘린 낮은 둔덕 (snap fen) */
function snapFen(x, y, w, seed) {
  const mound = `M${pt([x - w / 2, y])}Q${pt([x, y - w * 0.32])} ${pt([x + w / 2, y])}Z`
  const shade = `M${pt([x + w * 0.05, y - w * 0.15])}Q${pt([x + w * 0.3, y - w * 0.12])} ${pt([x + w / 2, y])}L${pt([x + w * 0.05, y])}Z`
  const hatch = line([[x + w * 0.2, y - w * 0.1], [x + w * 0.16, y - 1]]) + line([[x + w * 0.32, y - w * 0.06], [x + w * 0.29, y - 1]])
  return [
    ...reeds(x, y - w * 0.08, w * 0.5, 7, `${seed}-b`, w * 0.34),
    P('fill', mound), P('shade', shade), P('hatch', hatch), P('ink', mound),
    ...reeds(x - w * 0.52, y + 1, w * 0.3, 7, `${seed}-l`, w * 0.36),
    ...reeds(x + w * 0.52, y + 1, w * 0.3, 7, `${seed}-r`, w * 0.36),
    ...reeds(x, y + 3, w * 0.9, 9, `${seed}-f`, w * 0.3),
    waterline(x, y + 4, w * 1.6),
  ]
}

/** 늪 악어 — 물 위로 등과 머리만 (옆모습, 아주 작게) */
function croc(x, y, len, dir = 1) {
  const s = (px, py) => [x + px * len * dir, y + py * len]
  const back = poly([s(-0.5, 0), s(-0.32, -0.07), s(-0.05, -0.1), s(0.18, -0.08), s(0.3, -0.12), s(0.36, -0.08), s(0.5, -0.04), s(0.5, 0)])
  let scutes = ''
  for (let i = 0; i < 4; i++) scutes += line([s(-0.3 + i * 0.1, -0.075), s(-0.27 + i * 0.1, -0.12), s(-0.24 + i * 0.1, -0.08)])
  const eye = poly([s(0.3, -0.12), s(0.33, -0.12), s(0.33, -0.095), s(0.3, -0.095)])
  return [P('shade', back), P('ink', back + scutes), P('dark', eye), waterline(x, y + 1, len * 1.2)]
}
/** 비단뱀 — 물 위로 솟은 몸통 고리 셋과 머리 */
function python(x, y, len, seed) {
  let d = ''
  const n = 3
  const step = len / (n + 0.8)
  for (let i = 0; i < n; i++) {
    const a = x - len / 2 + i * step
    d += `M${pt([a, y])}C${pt([a + step * 0.05, y - step * 0.75])} ${pt([a + step * 0.75, y - step * 0.75])} ${pt([a + step * 0.8, y])}`
  }
  const hx = x - len / 2 + n * step + step * 0.25
  const head = `M${pt([hx - 2, y])}Q${pt([hx - 1.5, y - 4.5])} ${pt([hx + 3.6, y - 3.4])}Q${pt([hx + 5.2, y - 2.6])} ${pt([hx + 3, y - 1])}Z`
  return [P('ink', d), P('fill', head), P('ink', head), waterline(x + step * 0.3, y + 1.2, len * 1.25)]
}

/** 성문 — 무너진 문루와 양쪽에 짧게 남은 벽 */
function gatehouse(x, y, seed) {
  const w = 30
  const h = 24
  const L = x - w / 2
  const R = x + w / 2
  const rand = rng(seed)
  const top = [[L, y - h]]
  for (let i = 1; i < 5; i++) top.push([L + (w * i) / 5, y - h * (i === 3 ? 0.7 : 0.92 + rand() * 0.08)])
  top.push([R, y - h * 0.85])
  const body = poly([[L, y], ...top, [R, y]])
  const arch = `M${pt([x - 6, y])}V${r1(y - 9)}A6 6 0 0 1 ${pt([x + 6, y - 9])}V${r1(y)}Z`
  const shade = poly([[x + w * 0.22, y], [x + w * 0.22, y - h * 0.8], [R, y - h * 0.85], [R, y]])
  const hatch = line([[x + w * 0.3, y - h * 0.7], [x + w * 0.3, y - h * 0.1]]) + line([[x + w * 0.4, y - h * 0.68], [x + w * 0.4, y - h * 0.1]])
  return [P('stone', body), P('shade', shade), P('hatch', hatch), P('dark', arch), P('ink-bold', body), ...K.rocks(x + w * 0.62, y + 1, 3.5, 3, `${seed}-r`)]
}

// =====================================================================
// 1. 언덕 — 늪 위로 솟은 낮은 언덕 (이름도 높이도 없다). 둘레에 짧은 경사선, 그늘(남동)은 길고 촘촘히.
const RISE = dense([[626, 466], [640, 420], [668, 390], [722, 378], [786, 388], [836, 414], [866, 455], [878, 508], [872, 562], [856, 612], [832, 652], [798, 686], [756, 708], [712, 712], [684, 700], [656, 676], [618, 650], [586, 622], [566, 582], [562, 532], [584, 492]], 6)
const CREST = [706, 540]
const rise = []
{
  rise.push(P('fill', closed(RISE)))
  const rand = rng('rise')
  let hatch = ''
  for (let a = 0; a < Math.PI * 2; ) {
    const s = (Math.cos(a - Math.PI / 4) + 1) / 2 // 1 = 남동(그늘)
    const R = rayHit(RISE, CREST, a)
    const len = 10 + 20 * s + rand() * 6
    const r0 = R - len
    const r2 = R - 2
    const jx = (rand() - 0.5) * 0.02
    hatch += line([[CREST[0] + Math.cos(a + jx) * r0, CREST[1] + Math.sin(a + jx) * r0], [CREST[0] + Math.cos(a) * r2, CREST[1] + Math.sin(a) * r2]])
    a += (2.2 + (1 - s) * 3.6) * (Math.PI / 180)
  }
  rise.push(P('hatch', hatch))
}

// 2. 물 — 니르카나의 물, Emevera 분지, 게트의 침수, 수렁의 웅덩이, Piranha Marsh 의 물
const NIRKANA_W = dense([[446, 372], [500, 356], [560, 350], [612, 362], [636, 392], [630, 432], [612, 462], [566, 478], [512, 484], [466, 474], [438, 448], [430, 408]], 5)
const EMEVERA = dense(blob(620, 712, 62, 37, 'emevera', 12, 0.08), 5)
const GHET_W = dense([[394, 606], [440, 592], [502, 590], [548, 600], [566, 640], [572, 690], [556, 724], [508, 744], [446, 746], [400, 732], [380, 694], [380, 646]], 5)
const PIRANHA = dense([[150, 262], [164, 272], [160, 294], [138, 312], [100, 318], [68, 306], [60, 284], [80, 266], [116, 258]], 5)
const MIRE = [
  dense(blob(302, 424, 46, 16, 'm1', 9, 0.25), 4),
  dense(blob(354, 548, 34, 13, 'm2', 9, 0.25), 4),
  dense(blob(246, 612, 40, 13, 'm3', 9, 0.25), 4),
  dense(blob(420, 520, 22, 9, 'm4', 8, 0.25), 4),
  dense(blob(890, 300, 30, 10, 'm5', 8, 0.25), 4),
  dense(blob(1010, 610, 34, 11, 'm6', 8, 0.25), 4),
]
const waters = [
  ...water(NIRKANA_W),
  ...water(GHET_W),
  ...water(EMEVERA, { edge: false }),
  ...water(PIRANHA),
  ...MIRE.flatMap((m) => water(m)),
]
const ripples = [
  ...K.ripples(520, 470, 16, 2, 'nk1'),
  ...K.ripples(456, 396, 10, 2, 'nk2'),
  ...K.ripples(410, 680, 16, 2, 'gh1'),
  ...K.ripples(540, 662, 10, 2, 'gh2'),
  ...K.ripples(100, 300, 14, 2, 'pi1'),
  ...K.ripples(300, 426, 14, 2, 'm1r'),
  ...K.ripples(352, 550, 10, 1, 'm2r'),
  ...K.ripples(246, 614, 12, 2, 'm3r'),
]

// 3. 길 — Urnaav 의 돌길(두 줄)과 남동쪽에서 성문으로 오는 오솔길, 좁은 운하
const LANE = [[834, 676], [810, 664], [784, 655], [756, 646], [728, 636], [710, 622], [702, 608]]
const lane = [P('hatch', smooth(K.offset(LANE, 3)) + smooth(K.offset(LANE, -3)))]
const TRACK = [[846, 684], [872, 706], [908, 728], [952, 752], [994, 784], [1040, 818], [1096, 850], [1160, 884], [1222, 924], [1280, 966], [1312, 1004]]
const track = K.dashed(TRACK, 9, 7)
const canals = [...K.river([[748, 678], [724, 684], [700, 690], [684, 694]], 3.5, 5), ...K.river([[652, 640], [644, 656], [636, 672]], 3, 4.5)]

// 4. 서 있는 것들 — 뒤(위)에서 앞(아래)으로
const items = []
const add = (y, parts) => items.push({ y, parts })

// 칼라스트리아: 언덕마루의 돌 탑과 큰 집, 앞(남쪽)에 짧은 성벽. 표시 오른쪽은 비운 마당
add(512, asStone(K.tower(643, 512, 16, 80, { top: 'spire', capH: 34 })))
add(512, asStone(K.house(690, 512, 34, 24, { roof: 'dome', roofH: 14, door: false })))
add(506, brokenTower(736, 506, 16, 66, 'k-t2'))
add(515, asStone(K.tower(772, 515, 13, 52, { top: 'spire', capH: 26 })))
add(520, asStone(K.house(612, 520, 26, 18, { roof: 'hip', roofH: 12 })))
add(526, asStone(K.house(810, 526, 22, 15, { roof: 'gable' })))
add(552, asStone(K.house(630, 552, 26, 18, { roof: 'hip', roofH: 11 })))
add(556, asStone(K.house(780, 556, 22, 16, { roof: 'gable' })))
add(600, K.wall([[604, 590], [652, 600], [700, 604], [750, 600], [800, 588]], 13, { merlon: 6 }))
add(594, asStone(K.tower(602, 594, 15, 36, { top: 'crenel' })))
add(592, asStone(K.tower(802, 592, 15, 36, { top: 'crenel' })))
{
  const g = asStone(K.tower(700, 610, 22, 30, { top: 'crenel', windows: false }))
  g.splice(g.length - 1, 0, P('dark', `M${pt([694, 610])}V601A6 6 0 0 1 706 601V610Z`))
  add(610, g)
}

// Urnaav: 비탈의 수수한 집들, 돌길 양옆
const urnaav = [
  [804, 650, 18, 13, 'gable'], [776, 641, 20, 14, 'hip'], [750, 632, 18, 13, 'gable'], [726, 623, 17, 12, 'gable'],
  [790, 678, 20, 14, 'gable'], [762, 669, 18, 13, 'hip'], [734, 660, 20, 14, 'gable'], [708, 648, 17, 12, 'gable'],
  [640, 628, 18, 13, 'gable'], [618, 612, 16, 12, 'hip'], [720, 694, 18, 12, 'gable'], [752, 698, 16, 11, 'hip'],
]
urnaav.forEach(([x, y, w, h, roof]) => add(y, K.house(x, y, w, h, { roof })))
add(654, shell(668, 654, 18, 14, 'u-sh'))

// 성문 (남동) — 무너진 문루, 양쪽에 짧게 남은 벽
add(670, K.wall([[812, 662], [824, 676]], 11, { merlon: 5 }))
add(676, K.wall([[852, 676], [866, 660]], 11, { merlon: 5 }))
add(678, gatehouse(838, 678, 'gate'))

// Emevera: 무너진 둑 (세 군데 터짐), 잠긴 지붕, 악어와 비단뱀
{
  const ring = blob(620, 712, 62, 37, 'emevera', 12, 0.08)
  // 고리를 12 마디로 — 터진 곳(서쪽: 게트 쪽, 남동, 북동)은 빼고 잇는다
  // 터진 곳: 동남동(0–1, Urnaav 운하가 흘러드는 곳), 서(5–6, 게트 쪽), 북(9–10)
  const segs = [[1, 2, 3, 4, 5], [6, 7, 8, 9], [10, 11, 0]]
  segs.forEach((idx, i) => dike(idx.map((k) => ring[k]), 7, `dk${i}`).forEach((it) => add(it.y, it.parts)))
  for (const k of [0, 1, 5, 6, 9, 10]) add(ring[k][1] + 1, K.rocks(ring[k][0], ring[k][1] + 1, 3.2, 2, `dr${k}`))
}
;[[592, 702, 18, 9], [626, 694, 14, 7], [612, 726, 20, 10], [646, 716, 16, 8], [588, 732, 14, 7]].forEach(([x, y, w, rh]) => add(y, drowned(x, y, w, rh)))
add(734, croc(655, 734, 24, -1))
add(706, python(630, 708, 20, 'py'))

// 게트: 물에 잠긴 지붕 없는 벽들, 칼리타스가 선 마른 돌 단
add(634, shell(408, 634, 32, 24, 'g1'))
add(606, shell(552, 606, 22, 18, 'g2'))
add(718, shell(400, 718, 26, 18, 'g3'))
add(730, shell(532, 730, 20, 14, 'g4'))
;[[408, 634, 36], [552, 606, 26], [400, 718, 30], [532, 730, 24]].forEach(([x, y, w]) => add(y + 0.5, [waterline(x, y + 1.5, w)]))
{
  const top = poly([[440, 656], [524, 656], [530, 664], [434, 664]])
  const face = poly([[434, 664], [530, 664], [530, 669], [434, 669]])
  add(669, [P('fill', top), P('stone', face), P('hatch', line([[452, 665], [452, 668.5]]) + line([[476, 665], [476, 668.5]]) + line([[500, 665], [500, 668.5]]) + line([[516, 665], [516, 668.5]])), P('ink', top + face), waterline(482, 671, 110)])
}

// 니르카나: 물 위 기둥 집들, 사이로 물길
;[
  [462, 418, 18, 12, 9, 'gable', false], [488, 428, 20, 13, 10, 'gable', true], [474, 458, 16, 11, 8, 'hip', false],
  [530, 398, 20, 13, 10, 'gable', false], [556, 410, 18, 12, 9, 'gable', true], [538, 448, 18, 12, 9, 'hip', false],
  [588, 422, 18, 12, 9, 'gable', false], [600, 452, 16, 11, 8, 'gable', true],
].forEach(([x, y, w, h, legs, roof, hole], i) => add(y, stilt(x, y, w, h, legs, `st${i}`, { roof, hole })))

// 늪: Piranha Marsh 의 물가 갈대와 수련, 수렁의 반쯤 잠긴 돌, 갈대 둔덕, 바위
add(270, reeds(158, 300, 18, 6, 'pr1'))
add(318, reeds(84, 318, 30, 7, 'pr2'))
add(262, reeds(96, 262, 24, 6, 'pr3'))
add(300, lilies(104, 292, 34, 6, 'li1'))
add(432, reeds(338, 432, 16, 5, 'mr1'))
add(556, reeds(326, 556, 14, 5, 'mr2'))
add(620, reeds(212, 620, 16, 5, 'mr3'))
add(560, K.rocks(368, 552, 6, 2, 'ms1'))
add(428, K.rocks(286, 428, 5.5, 2, 'ms2'))
add(616, K.rocks(262, 616, 5, 2, 'ms3'))
add(440, snapFen(1236, 440, 46, 'sf'))
add(410, K.rocks(980, 412, 10, 4, 'outcrop'))
add(304, reeds(906, 304, 14, 5, 'mr5'))
add(614, reeds(1036, 614, 14, 5, 'mr6'))

// 5. 떠 있는 섬 — 하늘에 있으므로 맨 위에, 그림자는 땅에
const c1 = clod(1120, 262, 76, 130, 'clod1')
const c2 = clod(930, 168, 34, 70, 'clod2')

// 6. 하그라 수조 쪽 화살표 (지도 밖, 서쪽 약간 북)
const arrow = [P('ink', line([[176, 382], [22, 382]]) + line([[32, 376], [22, 382], [32, 388]]))]

const parts = [
  ...rise,
  ...c1.ground,
  ...c2.ground,
  ...waters,
  ...ripples,
  ...canals,
  ...lane,
  ...track,
  ...stack(items),
  ...c2.air,
  ...c1.air,
  ...arrow,
]

// 늪 기호 — 세계 지도의 늪 남쪽 가장자리 위, 도시와 큰 물웅덩이는 비운다 (고리를 잇는 틈으로 구멍을 낸다)
const SWAMP_OUT = [[0, 845], [0, 0], [1400, 0], [1400, 481], [1000, 664], [912, 688], [906, 610], [906, 520], [888, 428], [836, 368], [744, 340], [650, 330], [560, 322], [446, 330], [404, 376], [394, 470], [372, 560], [360, 650], [364, 760], [366, 801], [180, 823]]
const hole = (ring) => [...ring, ring[0]]
const SWAMP = [
  ...SWAMP_OUT,
  [0, 845],
  ...hole(blob(110, 288, 92, 50, 'h-pi', 10, 0)),
  [0, 845],
  ...hole(blob(300, 424, 76, 34, 'h-m1', 10, 0)),
  [0, 845],
  ...hole(blob(246, 612, 70, 32, 'h-m3', 10, 0)),
  [0, 845],
  ...hole(blob(890, 300, 58, 30, 'h-m5', 10, 0)),
  [0, 845],
  ...hole(blob(1010, 610, 62, 30, 'h-m6', 10, 0)),
  [0, 845],
  ...hole([[8, 345], [196, 345], [196, 398], [8, 398]]),
  [0, 845],
]

CHILDMAPS.push({
  id: 'malakir',
  size: [1400, 1000],
  glyphScale: 4,
  terrain: [
    { kind: 'swamp', points: SWAMP, density: 0.6 },
    { kind: 'forest', points: [...K.offset(TRACK.slice(2), 26), ...K.offset(TRACK.slice(2), 110).reverse()], density: 0.14 },
    { kind: 'forest', points: [...K.offset(TRACK.slice(2), -26), ...K.offset(TRACK.slice(2), -96).reverse()], density: 0.14 },
  ],
  parts,
  labels: [
    { text: 'Hagra Swamp', textKo: '하그라', at: [1050, 520], size: 36, kind: 'area' },
    { text: 'Malakir Mire', textKo: '말라키르 수렁', at: [290, 500], size: 24, kind: 'water' },
    { text: 'Kalastria District', at: [790, 358], size: 20, kind: 'area' },
    { text: 'Urnaav District', at: [760, 744], size: 19, kind: 'area' },
    { text: 'Emevera District', at: [612, 786], size: 19, kind: 'area' },
    { text: 'Ghet District', at: [352, 600], size: 19, kind: 'area' },
    { text: 'Nirkana District', at: [524, 336], size: 19, kind: 'area' },
    { text: 'Hagra Cistern', textKo: '하그라 수조', at: [100, 370], size: 19, kind: 'place' },
  ],
  subjects: {
    'kalitas-bloodchief-of-ghet': { at: [480, 660], size: 88 },
  },
  markAnchors: { malakir: 'right' },
})
