// 말라키르 — 하그라 늪 한가운데 낮은 언덕 위의 흡혈귀 도시 (자식 지도, 1400×1000 = 세계 x1823–1991, y1036–1156 의 약 8.33배).
// 시점: Zendikar Rising(2020) 이후. 구역들의 모습은 마지막 서술(Art of Magic, 2016)을 따라 무너진 채로 그린다 — 되살린 도시가 아니다.
// 공식: 낮은 언덕 위, 가장 높은 칼라스트리아 구역, 낮은 Emevera 구역(제방이 무너져 늪이 됨, 악어·비단뱀), 그 사이 Urnaav 구역(돌길과
//       좁은 운하), 물 위의 니르카나 구역(썩은 운하 사이 낡은 집), 침수된 폐허 게트 구역, 성문(자리 미상), 늪(웅덩이·갈대·바위·떠 있는 섬).
// 해석: 언덕의 모양, 구역들의 방위와 경계, 게트 구역의 자리, 칼라스트리아 앞 성벽·성문·운하·제방의 배치, 말라키르 수렁의 범위, 칼리타스의 자리.
// 세계 지도의 풍경(src/data/landscape/guul-draz.ts, 모두 추정)을 이 축척으로 따른다: 하그라의 늪숲(hagra-swamp-forest-east)은
//       도시 둘레·북쪽·동쪽 늪에 선 맹그로브(세계 지도와 같은 기호), 남동쪽 해안의 정글
//       (guul-draz-jungle-southeast)은 남동 구석의 빽빽한 숲 — 성문으로 오는 길이 그 정글을 지난다(Pulse Tracker 'through the jungle
//       toward certain death at the gates of Malakir'). 펠라카 카르스트(pelakka-karst-south)는 고리 끝만 남서 구석에 걸치고
//       세계 지도의 협곡 기호는 틀 남쪽에 있어, 틀 안에는 그리지 않는다(조사 메모의 금지 목록: 틀 안의 카르스트 협곡).
// 페이즈1 그림의 자리(모두 이 지도의 해석): 피의 마녀는 도시 북쪽(니르카나와 칼라스트리아 사이) 늪 위 하늘, 혈족장의 칼은
//       언덕의 북동쪽 기슭.
// 언커먼 그림의 자리(모두 이 지도의 해석): 성문 밖 남동쪽 길을 따라 — Gatekeeper of Malakir 는 성문 바로 밖 길가(길로 오는 쪽을
//       본다), Needlebite Trap 은 그 아래 길 남쪽 가장자리(바늘이 길을 가로지른다, '말라키르 둘레의 함정') — 문지기와 함정은
//       2009년(ZEN) 무렵의 모습이지 지금의 성문 풍경이 아니다(문루는 무너진 채 둔다).
//       Feast of Blood(흡혈귀 사냥 무리)는 길이 정글로 드는 곳의 길가 빈터(Booster Quest! 의 '등불 빛에 번득이는 눈').
//       Vampire Nighthawk 는 칼라스트리아 북동쪽 하늘(작은 떠 있는 섬 곁).
// 커먼 그림의 자리(모두 이 지도의 해석): Vampire Lacerator 는 니르카나 구역 북쪽 늪에서 밤 사냥에 나서 도시를 등지고 서쪽으로
//       뛰어나가는 자리.
// 근거가 굴 드라즈 전체까지만 닿는 대상 열(Blood Tribute·Bloodghast·Sadistic Sacrament·Mind Sludge·Vampire Hexmage·Blazing Torch·
//       Blood Seeker·Guul Draz Vampire·Mindless Null·Pitfall Trap)은 이 범위에 모으지 않고 대륙 곳곳(Pitfall Trap 은 조프 늪 지역
//       상세)으로 옮겼다 (CLAUDE.md 의 붐빔 규칙 1). 그 자리에 곁들여 그렸던 웅덩이 둘(m8·m9)은 늪의 풍경으로 남긴다.
//       휴대폰에서는 머리말을 접어도 틀 위 끝 약 95 가 가려지므로, 그림의 머리를 모두 그 밑(y 120 넘게)에 둔다.
const K = KIT
const { line, poly, smooth, rng, stack } = K
const P = (cls, d) => ({ cls, d })
const r1 = (v) => Math.round(v * 10) / 10
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`
const closed = (pts) => line(pts) + 'Z'
const asStone = (parts) => parts.map((p) => (p.cls === 'fill' ? P('stone', p.d) : p))

// ---------- 기하 ----------
/** Catmull-Rom 고리를 촘촘한 꺾은선으로 — 그리기와 계산이 같은 선을 쓰게 */
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
/** 고리의 i 번째 점에서 바깥쪽 법선 (고리는 시계 방향) */
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
  // 두 번 이웃 평균 — 낮은 주파수의 굴곡
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

// ---------- 물 ----------
/** 고인 물 — 밑에 양피지를 깔아 늪 기호를 가리고 물빛을 칠한 뒤, 물가 선은 끊어 그린다(늪의 물가) */
function water(ring, seed, o = {}) {
  const d = closed(ring)
  const parts = [P('fill', d), P('sea', d)]
  if (o.edge !== false) parts.push(P('sea-ink', brokenEdge(ring, seed, o.on ?? 34, o.off ?? 9)))
  return parts
}
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

/** 큰 수련 잎 — 물 위에 납작한 원, 한쪽이 갈라진 */
function lilies(x, y, w, n, seed) {
  const rand = rng(seed)
  let d = ''
  for (let i = 0; i < n; i++) {
    const cx = x + (rand() - 0.5) * w
    const cy = y + (rand() - 0.5) * w * 0.35
    const r = 3.6 + rand() * 2.8
    const a0 = rand() * Math.PI * 2
    const p0 = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r * 0.55]
    const p1 = [cx + Math.cos(a0 + 0.55) * r, cy + Math.sin(a0 + 0.55) * r * 0.55]
    d += `M${pt([cx, cy])}L${pt(p1)}A${r1(r)} ${r1(r * 0.55)} 0 1 1 ${pt(p0)}Z`
  }
  return [P('fill', d), P('forest', d), P('hatch', d)]
}

// ---------- 건물 ----------
/** 꼭대기가 부서진 탑 — 들쭉날쭉한 윗선, 발치의 돌무더기 */
function brokenTower(x, y, w, h, seed) {
  const rand = rng(seed)
  const tw = w * 0.88
  const L = x - w / 2
  const R = x + w / 2
  const tl = x - tw / 2
  const tr = x + tw / 2
  const top = [[tl, y - h]]
  for (let i = 1; i < 4; i++) top.push([tl + (tw * i) / 4, y - h * (0.7 + rand() * 0.26)])
  top.push([tr, y - h * 0.64])
  const body = poly([[L, y], ...top, [R, y]])
  const shade = poly([[x + w * 0.16, y], [x + tw * 0.16, y - h * 0.78], [tr, y - h * 0.64], [R, y]])
  let hatch = ''
  for (let i = 1; i <= 3; i++) {
    const t = i / 4
    hatch += line([[x + w * 0.16 + (R - x - w * 0.16) * t, y - h * 0.06], [x + tw * 0.16 + (tr - x - tw * 0.16) * t, y - h * 0.58]])
  }
  const slit = (sy) => poly([[x - w * 0.05, sy], [x + w * 0.05, sy], [x + w * 0.05, sy + w * 0.42], [x - w * 0.05, sy + w * 0.42]])
  return [P('stone', body), P('shade', shade), P('hatch', hatch), P('dark', slit(y - h * 0.6) + slit(y - h * 0.32)), P('ink-bold', body), ...K.rocks(x + w * 0.74, y + 1, w * 0.2, 3, `${seed}-r`)]
}

/** 지붕 없는 벽 — 집의 벽만 남은 폐허 (창 구멍 둘) */
function shell(x, y, w, h, seed) {
  const rand = rng(seed)
  const L = x - w / 2
  const R = x + w / 2
  const n = 5
  const top = []
  for (let i = 0; i <= n; i++) top.push([L + (w * i) / n, y - h * (0.42 + rand() * 0.58)])
  const outline = poly([[L, y], ...top, [R, y]])
  const k = 3
  const side = poly([[top[k][0], y], ...top.slice(k), [R, y]])
  let hatch = ''
  for (let i = 1; i <= 2; i++) {
    const sx = top[k][0] + ((R - top[k][0]) * i) / 3
    hatch += line([[sx, y - h * 0.36], [sx, y - h * 0.06]])
  }
  const win = (cx) => poly([[cx - w * 0.07, y - h * 0.4], [cx + w * 0.07, y - h * 0.4], [cx + w * 0.07, y - h * 0.16], [cx - w * 0.07, y - h * 0.16]])
  return [P('stone', outline), P('shade', side), P('hatch', hatch), P('dark', win(x - w * 0.24) + win(x + w * 0.04)), P('ink', outline)]
}

/** 물에 잠긴 집 — 처마 밑 벽 조금과 지붕만 물 위로. 몇은 지붕이 꺼졌다 */
function drowned(x, y, w, rh, broken, seed) {
  const L = x - w / 2
  const R = x + w / 2
  const wall = 3.2
  const ey = y - wall
  const roof = poly([[L - w * 0.06, ey], [x, ey - rh], [R + w * 0.06, ey]])
  const body = poly([[L, y], [L, ey], [R, ey], [R, y]])
  const shade = poly([[x, ey - rh], [R + w * 0.06, ey], [x, ey]]) + poly([[x + w * 0.22, y], [x + w * 0.22, ey], [R, ey], [R, y]])
  const hatch = line([[x + w * 0.16, ey - rh * 0.6], [x + w * 0.1, ey]]) + line([[x + w * 0.32, ey - rh * 0.3], [x + w * 0.27, ey]])
  const parts = [P('fill', body + roof), P('shade', shade), P('hatch', hatch)]
  if (broken) {
    const rand = rng(seed)
    const hx = x - w * 0.12 + rand() * w * 0.1
    parts.push(P('dark', poly([[hx - w * 0.14, ey - rh * 0.18], [hx, ey - rh * 0.62], [hx + w * 0.12, ey - rh * 0.4], [hx + w * 0.06, ey - rh * 0.08]])))
  }
  parts.push(P('ink', body + roof), waterline(x, y + 1, w * 1.35))
  return parts
}

/** 기둥 위의 집 — 물 위에 선 낡은 집 (니르카나). y 는 물 높이 */
function stilt(x, y, w, h, legs, seed, o = {}) {
  const rand = rng(seed)
  const base = y - legs
  let st = ''
  for (let i = 0; i < 3; i++) {
    const sx = x - w * 0.42 + w * 0.42 * i
    st += line([[sx, base], [sx + (rand() - 0.5) * 2.4, y + 1]])
  }
  const deck = poly([[x - w * 0.62, base], [x + w * 0.62, base], [x + w * 0.62, base + 2.4], [x - w * 0.62, base + 2.4]])
  const roofH = o.roofH ?? w * 0.5
  const house = K.house(x, base, w, h, { roof: o.roof ?? 'gable', door: false, roofH })
  const parts = [P('ink', st), ...house.slice(0, -1)]
  if (o.hole) {
    const hx = x + (rand() - 0.5) * w * 0.3
    const top = base - h
    parts.push(P('dark', poly([[hx - w * 0.12, top - roofH * 0.16], [hx + w * 0.04, top - roofH * 0.5], [hx + w * 0.14, top - roofH * 0.16], [hx + w * 0.02, top - roofH * 0.02]])))
  }
  parts.push(house.at(-1), P('fill', deck), P('ink', deck), waterline(x, y + 1.5, w * 1.2))
  return parts
}

/** 제방 — 물가 선을 따라 한 덩어리로 쌓은 낮고 두꺼운 돌둑(옆에서 본 띠): 돌 벽면, 밝은 둑마루, 쌓은 줄 하나와 드문 이음매.
 *  한 줄기를 통째로 한 면으로 그려야 마디마다 세로선이 생기지 않는다 (울타리처럼 보이지 않게) */
function dike(pts, h, seed) {
  const rand = rng(seed)
  const t = h * 0.55
  const up = (d) => pts.map(([x, y]) => [x, y - d])
  const face = poly([...pts, ...up(h).reverse()])
  const walk = poly([...up(h), ...up(h + t).reverse()])
  let hatch = line(up(h * 0.48))
  let k = 0
  for (const [[x, y]] of K.along(pts, 11)) {
    if (k++ === 0) continue
    const j = (rand() - 0.5) * 3
    hatch += k % 2 ? line([[x + j, y - h * 0.5], [x + j, y - h * 0.94]]) : line([[x + j, y - h * 0.06], [x + j, y - h * 0.46]])
  }
  return [{ y: Math.max(...pts.map((p) => p[1])), parts: [P('stone', face), P('fill', walk), P('hatch', hatch), P('ink', face + walk)] }]
}

/** 떠 있는 흙바위 섬 — 풀 덮인 윗면, 울퉁불퉁 뾰족한 밑동, 늘어진 뿌리, 한쪽에서 쏟아지는 물줄기, 땅의 그림자 */
function clod(x, y, w, lift, seed, o = {}) {
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
  // 윗면 풀
  let grass = ''
  for (let i = 0; i < 6; i++) {
    const gx = L + w * (0.1 + i * 0.16) + (rand() - 0.5) * 3
    const gy = topPts[Math.min(8, Math.round((gx - L) / (w / 8)))][1] - 0.5
    grass += `M${pt([gx - 2, gy])}l1 -3.4M${pt([gx, gy])}l0 -4.4M${pt([gx + 2, gy])}l-1 -3.4`
  }
  // 늘어진 뿌리
  let roots = ''
  for (const [u, v, l] of [[0.2, 0.26, 0.16], [0.1, 0.5, 0.12], [-0.1, 0.42, 0.18], [-0.3, 0.2, 0.12]]) {
    const [rx, ry] = U(u, v)
    roots += `M${pt([rx, ry])}q${r1(-2.5)} ${r1(w * l * 0.5)} ${r1(1.5)} ${r1(w * l)}`
  }
  // 물줄기: 왼쪽 가장자리에서 땅까지
  const fx = L + w * 0.1
  const fall = `M${pt([fx, y + 1])}C${pt([fx - 6, y + 5])} ${pt([fx - 7, y + lift * 0.35])} ${pt([fx - 7, y + lift])}` + `M${pt([fx + 3, y + 2])}C${pt([fx - 2, y + 9])} ${pt([fx - 3, y + lift * 0.4])} ${pt([fx - 3, y + lift])}`
  const sy = y + lift + 6
  const sh = `M${pt([x - w * 0.4, sy])}A${r1(w * 0.4)} ${r1(w * 0.09)} 0 1 0 ${pt([x + w * 0.4, sy])}A${r1(w * 0.4)} ${r1(w * 0.09)} 0 1 0 ${pt([x - w * 0.4, sy])}Z`
  const extra = o.tree ? K.tree(x + w * 0.16, topPts[5][1] + 1, w * 0.42, `${seed}-t`) : []
  return {
    ground: [P('shade', sh), ...K.ripples(fx - 6, y + lift + 3, 10, 2, `${seed}-s`)],
    air: [P('sea-ink', fall), P('fill', body), P('stone', poly([...under, [L, y + 2], [R, y + 2]])), P('shade', shade), P('hatch', hatch + roots + grass), P('ink-bold', body), ...extra],
  }
}

/** 늪 악어 — 물 위로 등과 머리만 (옆모습) */
function croc(x, y, len, dir = 1) {
  const s = (px, py) => [x + px * len * dir, y + py * len]
  const back = poly([s(-0.5, 0), s(-0.34, -0.06), s(-0.08, -0.1), s(0.16, -0.09), s(0.26, -0.13), s(0.34, -0.1), s(0.5, -0.05), s(0.52, 0)])
  let scutes = ''
  for (let i = 0; i < 5; i++) scutes += line([s(-0.36 + i * 0.09, -0.065), s(-0.33 + i * 0.09, -0.12), s(-0.3 + i * 0.09, -0.085)])
  const eye = poly([s(0.27, -0.13), s(0.31, -0.13), s(0.31, -0.1), s(0.27, -0.1)])
  return [P('shade', back), P('hatch', scutes), P('ink', back), P('dark', eye), waterline(x, y + 1, len * 1.3)]
}
/** 비단뱀 — 물 위로 솟은 몸통 고리 셋과 머리 */
function python(x, y, len) {
  let d = ''
  const n = 3
  const step = len / (n + 0.9)
  for (let i = 0; i < n; i++) {
    const a = x - len / 2 + i * step
    d += `M${pt([a, y])}C${pt([a + step * 0.04, y - step * 0.8])} ${pt([a + step * 0.76, y - step * 0.8])} ${pt([a + step * 0.8, y])}`
  }
  const hx = x - len / 2 + n * step + step * 0.2
  const head = `M${pt([hx - 2.2, y])}Q${pt([hx - 1.6, y - 5])} ${pt([hx + 4, y - 3.8])}Q${pt([hx + 5.8, y - 2.8])} ${pt([hx + 3.4, y - 1])}Z`
  return [P('ink-bold', d), P('fill', head), P('ink', head), waterline(x + step * 0.3, y + 1.2, len * 1.3)]
}

/** 성문 — 무너진 문루 (가운데 아치, 한쪽 윗선이 무너졌다) */
function gatehouse(x, y, seed) {
  const w = 32
  const h = 26
  const L = x - w / 2
  const R = x + w / 2
  const rand = rng(seed)
  const top = [[L, y - h]]
  for (let i = 1; i < 5; i++) top.push([L + (w * i) / 5, y - h * (i >= 3 ? 0.62 + rand() * 0.12 : 0.94 + rand() * 0.06)])
  top.push([R, y - h * 0.7])
  const body = poly([[L, y], ...top, [R, y]])
  const arch = `M${pt([x - 6.5, y])}V${r1(y - 10)}A6.5 6.5 0 0 1 ${pt([x + 6.5, y - 10])}V${r1(y)}Z`
  const shade = poly([[x + w * 0.24, y], [x + w * 0.24, y - h * 0.68], [R, y - h * 0.7], [R, y]])
  const hatch = line([[x + w * 0.32, y - h * 0.6], [x + w * 0.32, y - h * 0.1]]) + line([[x + w * 0.42, y - h * 0.6], [x + w * 0.42, y - h * 0.1]])
  return [P('stone', body), P('shade', shade), P('hatch', hatch), P('dark', arch), P('ink-bold', body), ...K.rocks(x + w * 0.66, y + 1, 4, 3, `${seed}-r`)]
}

/** 물 속의 진흙 둔덕 — 양피지 땅, 끊긴 물가 선, 갈대 몇 포기 (물길이 그 사이로 굽이친다) */
function islet(cx, cy, rx, ry, seed) {
  const ring = ragged(ellipse(cx, cy, rx, ry, 9, seed, 0.18), `${seed}-r`, 2, 4)
  return [P('fill', closed(ring)), P('sea-ink', brokenEdge(ring, `${seed}-e`, 18, 6)), ...reeds(cx - rx * 0.3, cy + ry * 0.2, rx * 0.6, 4, `${seed}-a`, 11), ...reeds(cx + rx * 0.35, cy, rx * 0.4, 3, `${seed}-b`, 10)]
}
/** 운하 — 곧은 마디로 꺾인 좁은 물길 (사람이 판 것) */
function canal(pts, w) {
  const a = K.offset(pts, w / 2)
  const b = K.offset(pts, -w / 2)
  return [P('fill', poly([...a, ...[...b].reverse()])), P('sea', poly([...a, ...[...b].reverse()])), P('sea-ink', line(a) + line(b))]
}

// =====================================================================
// 1. 언덕 — 늪 위로 솟은 낮은 언덕 (이름도 높이도 없다). 양피지 채움으로 늪 기호를 비우고, 기슭은 아래 블록의 그늘 띠와 털선으로
const RISE = dense([[556, 560], [560, 515], [586, 488], [622, 462], [642, 428], [672, 404], [722, 392], [774, 398], [808, 418], [830, 452], [840, 500], [838, 552], [826, 604], [812, 646], [796, 680], [766, 702], [724, 712], [694, 708], [672, 698], [650, 676], [614, 652], [582, 622], [562, 592]], 6)
const rise = [P('fill', closed(RISE))]
{
  // 언덕의 기슭 — 빛은 북서에서. 언덕 가장자리 바깥으로 옅은 그늘 띠를 두르되 그늘진 동·남동 기슭은 넓게, 북쪽은 실처럼 가늘게
  // (양끝은 사라진다), 그 위에 내리막 쪽으로 등고선에 수직인 털선. 물에 닿은 서쪽과 집이 늘어선 남쪽 기슭은 비운다
  const rand = rng('rise-h')
  const keep = ([x, y], s) => s > -0.62 && x > 650 && !(y > 640 && x < 800)
  const marks = K.along([...RISE, RISE[0]], 4.4)
    .map(([p, [ux, uy]]) => [p, uy, -ux])
    .filter(([p, nx, ny]) => keep(p, (nx + ny) * Math.SQRT1_2))
  // 낮은 주파수로 흔들리는 폭 (매끈한 둑처럼 보이지 않게)
  const wob = marks.map(() => rand() - 0.5)
  const wob2 = wob.map((_, i) => (wob[Math.max(0, i - 2)] + wob[Math.max(0, i - 1)] + wob[i] + wob[Math.min(wob.length - 1, i + 1)] + wob[Math.min(wob.length - 1, i + 2)]) / 5)
  const width = marks.map(([, nx, ny], i) => {
    const s = (nx + ny) * Math.SQRT1_2
    const fade = Math.min(1, (i + 1) / 5, (marks.length - i) / 7)
    return (1.6 + 13.5 * Math.max(0, s) ** 1.2) * fade * (1 + wob2[i] * 1.1)
  })
  const inner = marks.map(([p]) => p)
  const outer = marks.map(([[x, y], nx, ny], i) => [x + nx * width[i], y + ny * width[i]])
  let d = ''
  marks.forEach(([[x, y], nx, ny], i) => {
    if (width[i] < 5.5) return
    if (i % 2 === 0 && width[i] < 10) return
    if (rand() < 0.14) return
    const len = width[i] * (0.55 + rand() * 0.5)
    const a = 0.8 + rand() * 1.2
    d += line([[x + nx * a, y + ny * a], [x + nx * (a + len), y + ny * (a + len)]])
  })
  rise.push(P('shade', smooth(inner) + 'L' + smooth([...outer].reverse()).slice(1) + 'Z'), P('hatch', d))
}

// 2. 물 — 니르카나의 물(언덕 북서 기슭, 진흙 둔덕 사이로 물길이 굽이친다), 게트의 침수, Emevera 분지, 수렁의 웅덩이, Piranha Marsh 의 물
const NIRKANA_W = ragged([[420, 490], [406, 446], [422, 404], [460, 372], [514, 354], [570, 350], [614, 362], [634, 384], [618, 406], [600, 434], [578, 462], [550, 484], [510, 498], [466, 502]], 'nkw', 7, 6)
// 서쪽 끝을 x 약 588 로 — 칼리타스 그림 이름(게트 물 위, 오른끝 x 약 586)이 첫 보기에서 분지 서쪽 물가에 얹히지 않게
const EMV = ellipse(634, 712, 46, 37, 12, 'emevera', 0.08)
const EMEVERA = dense(EMV, 5)
const GHET_W = ragged([[388, 612], [430, 596], [476, 594], [520, 596], [556, 604], [574, 636], [578, 690], [588, 716], [560, 732], [516, 746], [458, 748], [404, 736], [380, 700], [376, 650]], 'ghw', 8, 6)
const PIRANHA = ragged([[176, 262], [214, 259], [244, 268], [253, 289], [238, 311], [202, 321], [162, 317], [139, 301], [135, 281], [148, 266]], 'piw', 3, 5)
const MIRE = [
  ragged(ellipse(302, 424, 48, 15, 9, 'm1', 0.2), 'm1r', 3, 4),
  ragged(ellipse(352, 548, 36, 12, 9, 'm2', 0.2), 'm2r', 3, 4),
  ragged(ellipse(246, 612, 40, 13, 9, 'm3', 0.2), 'm3r', 3, 4),
  ragged(ellipse(424, 540, 24, 9, 8, 'm4', 0.2), 'm4r', 2, 4),
  // 흡혈귀 밤매 이름(그림 밑, x 약 770–915) 동쪽으로 비켜 — 첫 보기에서 이름이 웅덩이에 얹히지 않게
  ragged(ellipse(946, 312, 26, 9, 8, 'm5', 0.2), 'm5r', 2, 4),
  ragged(ellipse(1012, 614, 34, 11, 8, 'm6', 0.2), 'm6r', 2, 4),
  ragged(ellipse(300, 636, 30, 10, 8, 'm7', 0.2), 'm7r', 2, 4),
  // Emevera 구역 아래(남쪽)의 젖은 땅
  ragged(ellipse(652, 846, 30, 10, 8, 'm8', 0.2), 'm8r', 2, 4),
  // 니르카나 북서쪽 늪의 고인 물
  ragged(ellipse(398, 250, 64, 13, 9, 'm9', 0.16), 'm9r', 3, 4),
]
const waters = [
  ...water(NIRKANA_W, 'e-nk'),
  ...water(GHET_W, 'e-gh'),
  ...water(EMEVERA, 'e-em', { edge: false }),
  ...water(PIRANHA, 'e-pi'),
  ...MIRE.flatMap((m, i) => water(m, `e-m${i}`, { on: 22, off: 7 })),
  ...islet(512, 428, 30, 11, 'is1'),
  ...islet(560, 414, 16, 7, 'is2'),
  ...islet(468, 452, 14, 6, 'is3'),
  ...islet(434, 720, 20, 7, 'is4'),
]
const ripples = [
  ...K.ripples(430, 470, 10, 2, 'nk1'),
  ...K.ripples(536, 368, 12, 2, 'nk2'),
  ...K.ripples(408, 684, 16, 2, 'gh1'),
  ...K.ripples(548, 668, 9, 2, 'gh2'),
  ...K.ripples(228, 302, 12, 2, 'pi1'),
  ...K.ripples(300, 426, 14, 2, 'm1r'),
  ...K.ripples(246, 614, 12, 2, 'm3r'),
  ...K.ripples(640, 713, 9, 1, 'em1'),
]
// Emevera 의 둑 — 물가를 따라 선 낮고 두꺼운 돌둑(도시처럼 옆에서 본 띠). 세 군데 터짐: 동(0–1, Urnaav 운하),
// 서(5–6, 게트 쪽으로 물이 넘친다), 북(9–10, 위쪽 운하). 뒤(북)의 둑은 물 뒤에, 앞(남)의 둑은 물 앞에 쌓이도록 stack 에 넣는다
const DIKE_RUNS = [[5, 25], [30, 45], [50, 60]].map(([a, b]) => EMEVERA.concat(EMEVERA).slice(a, b + 1))
const dikeItems = DIKE_RUNS.flatMap((run, i) => dike(run, 6.5, `dk${i}`))

// 3. 길 — Urnaav 의 돌길(두 줄)과 남동쪽에서 성문으로 오는 오솔길, 좁은 운하 둘
const LANE = [[680, 616], [696, 630], [720, 644], [748, 658], [778, 672], [804, 686]]
const lane = [P('hatch', smooth(K.offset(LANE, 3.2)) + smooth(K.offset(LANE, -3.2)))]
const TRACK = [[818, 700], [846, 720], [884, 744], [930, 770], [978, 800], [1034, 832], [1094, 862], [1156, 896], [1214, 934], [1266, 972], [1294, 1004]]
const track = K.dashed(TRACK, 9, 7)
const canals = [...canal([[780, 698], [746, 704], [712, 710], [680, 713]], 5), ...canal([[652, 626], [650, 648], [644, 664], [641, 684]], 4.5)]

// 4. 서 있는 것들 — 뒤(위)에서 앞(아래)으로 쌓는다
const items = []
const add = (y, parts) => items.push({ y, parts })

// 칼라스트리아: 언덕마루의 돌 탑과 큰 집, 앞(남쪽)에 짧은 성벽. 말라키르 표시와 이름 자리는 비운 마당
add(506, asStone(K.tower(618, 506, 20, 90, { top: 'spire', capH: 36 })))
add(494, asStone(K.house(638, 494, 16, 14, { roof: 'hip', roofH: 9, door: false })))
add(496, asStone(K.house(694, 496, 20, 16, { roof: 'gable', door: false })))
add(500, asStone(K.house(738, 500, 16, 13, { roof: 'hip', roofH: 8, door: false })))
add(512, asStone(K.house(666, 512, 42, 26, { roof: 'gable', roofH: 30, door: false })))
add(504, brokenTower(716, 504, 18, 78, 'k-t2'))
add(512, asStone(K.tower(756, 512, 15, 62, { top: 'spire', capH: 30 })))
add(522, asStone(K.house(584, 522, 28, 19, { roof: 'hip', roofH: 12 })))
add(530, asStone(K.house(792, 530, 20, 15, { roof: 'gable' })))
add(554, asStone(K.house(610, 554, 28, 19, { roof: 'hip', roofH: 12 })))
add(600, K.wall([[580, 594], [630, 602], [680, 606], [730, 602], [738, 600.4]], 15, { merlon: 6 }))
add(598, K.wall([[753, 597.4], [780, 592]], 15, { merlon: 6 }))
add(603, K.rocks(745, 602, 4.2, 3, 'breach'))
add(608, asStone(K.tower(578, 598, 17, 40, { top: 'crenel' })))
add(608, asStone(K.tower(782, 596, 17, 40, { top: 'crenel' })))
{
  const g = asStone(K.tower(680, 614, 24, 32, { top: 'crenel', windows: false }))
  g.splice(g.length - 1, 0, P('dark', `M${pt([673.5, 614])}V604A6.5 6.5 0 0 1 686.5 604V614Z`))
  add(614, g)
}

// Urnaav: 비탈의 수수한 집들, 돌길 양옆과 운하 사이. 몇 채는 지붕이 없다
;[
  [706, 628, 16, 12, 'gable'], [732, 640, 17, 12, 'hip'], [758, 652, 18, 13, 'gable'], [784, 664, 16, 12, 'gable'],
  [694, 662, 17, 12, 'gable'], [720, 674, 18, 13, 'gable'], [748, 686, 18, 13, 'hip'], [776, 694, 16, 11, 'gable'],
  [600, 626, 16, 12, 'hip'], [624, 632, 16, 12, 'gable'], [668, 652, 16, 12, 'gable'],
  [804, 626, 15, 11, 'gable'], [810, 652, 15, 11, 'hip'], [806, 550, 15, 11, 'gable'],
].forEach(([x, y, w, h, roof]) => add(y, K.house(x, y, w, h, { roof })))
add(656, shell(614, 656, 16, 12, 'u-sh1'))
add(698, shell(702, 698, 14, 10, 'u-sh2'))

// 성문 (남동) — 무너진 문루와 양쪽에 짧게 남은 벽
add(688, K.wall([[792, 678], [801, 692]], 11, { merlon: 5 }))
add(692, K.wall([[830, 692], [842, 676]], 11, { merlon: 5 }))
add(696, gatehouse(815, 696, 'gate'))

// Emevera: 늪이 된 분지 — 잠긴 집, 갈대, 악어와 비단뱀
for (const it of dikeItems) items.push(it)
// 터진 자리의 돌무더기 — 둑 줄기(가장 낮은 점으로 쌓인다)보다 뒤에 그려 가려지지 않게
for (const k of [0, 1, 5, 6, 9, 10]) add(751, K.rocks(EMV[k][0], EMV[k][1] + 2, 3.6, 2, `dr${k}`))
;[[606, 700, 16, 8, true], [636, 694, 14, 7, false], [664, 708, 13, 7, false], [622, 722, 18, 9, true]].forEach(([x, y, w, rh, b], i) => add(y, drowned(x, y, w, rh, b, `dw${i}`)))
add(718, reeds(592, 716, 8, 4, 'em-r1', 11))
add(712, reeds(668, 716, 8, 4, 'em-r2', 11))
add(730, croc(652, 728, 30, -1))
add(732, python(610, 732, 18))

// 게트: 물에 잠긴 지붕 없는 벽들, 칼리타스가 선 마른 돌 단
;[[418, 640, 32, 24, 'g1'], [552, 604, 22, 18, 'g2'], [402, 722, 26, 18, 'g3'], [538, 736, 20, 14, 'g4'], [566, 664, 16, 12, 'g5'], [390, 668, 18, 14, 'g6'], [470, 742, 18, 12, 'g7']].forEach(([x, y, w, h, s]) => add(y, [...shell(x, y, w, h, s), waterline(x, y + 1.5, w * 1.15)]))
{
  const top = poly([[442, 656], [522, 656], [528, 663], [436, 663]])
  const face = poly([[436, 663], [528, 663], [528, 668], [436, 668]])
  let joints = ''
  for (const jx of [452, 470, 488, 506, 520]) joints += line([[jx, 664], [jx, 667.5]])
  // 칼리타스 그림을 받치려고 그린 단 — 페이즈1 에서만
  add(668, [P('fill', top), P('stone', face), P('hatch', joints), P('ink', top + face), waterline(482, 670, 112)].map((q) => ({ ...q, phase: true })))
}

// 니르카나: 물 위 기둥 집들, 사이로 물길. 낡아서 몇은 지붕이 뚫렸다
;[
  [438, 454, 16, 11, 8, 'gable', false], [448, 420, 18, 12, 9, 'gable', true], [478, 392, 18, 12, 9, 'hip', false],
  [520, 378, 20, 13, 10, 'gable', false], [562, 376, 18, 12, 9, 'gable', true], [588, 404, 16, 11, 8, 'gable', false],
  [476, 484, 18, 12, 9, 'hip', true], [516, 476, 16, 11, 8, 'gable', false], [556, 462, 18, 12, 9, 'gable', false], [584, 436, 16, 11, 8, 'hip', true],
].forEach(([x, y, w, h, legs, roof, hole], i) => add(y, stilt(x, y, w, h, legs, `st${i}`, { roof, hole })))
add(432, [P('ink', line([[506, 430], [507, 418]]) + line([[511, 431], [513, 422]]) + line([[540, 418], [539, 408]])), waterline(509, 431, 12), waterline(540, 419, 8)])

// 늪: Piranha Marsh 의 물가 갈대와 수련, 수렁의 갈대와 반쯤 잠긴 돌, 바위 무더기
add(322, reeds(196, 322, 30, 8, 'pr1'))
add(296, reeds(250, 296, 10, 5, 'pr2'))
add(266, reeds(238, 266, 14, 5, 'pr3'))
add(300, lilies(198, 290, 44, 7, 'li1'))
add(436, reeds(344, 432, 18, 6, 'mr1'))
add(440, reeds(258, 436, 16, 5, 'mr1b'))
add(556, reeds(326, 556, 14, 5, 'mr2'))
add(620, reeds(290, 620, 10, 5, 'mr3'))
add(548, reeds(444, 546, 14, 5, 'mr4'))
add(506, reeds(424, 504, 20, 6, 'nk-r1'))
add(360, reeds(560, 352, 18, 5, 'nk-r3'))
add(744, reeds(380, 744, 18, 6, 'gh-r1'))
add(560, K.rocks(368, 552, 6, 2, 'ms1'))
add(428, K.rocks(286, 428, 5.5, 2, 'ms2'))
add(616, K.rocks(262, 616, 5, 2, 'ms3'))
add(640, reeds(330, 640, 12, 5, 'mr7'))
add(588, K.rocks(232, 590, 4.5, 2, 'ms4'))
add(306, reeds(906, 306, 16, 6, 'mr5'))
add(618, reeds(1040, 618, 16, 6, 'mr6'))
add(257, reeds(458, 255, 12, 5, 'mr9'))
add(261, reeds(340, 259, 10, 4, 'mr9b'))
add(852, reeds(676, 852, 14, 6, 'mr8'))
add(846, reeds(626, 846, 10, 4, 'mr8b'))
add(334, K.rocks(1326, 334, 16, 5, 'outcrop'))
add(346, K.rocks(1302, 348, 9, 2, 'outcrop2'))

// 5. 떠 있는 섬 — 하늘에 있으므로 맨 위에, 그림자는 땅에 (굴 드라즈의 떠 있는 흙바위 섬)
const c1 = clod(1110, 250, 84, 136, 'clod1', { tree: true })
const c2 = clod(930, 160, 48, 80, 'clod2')

const parts = [...rise, ...c1.ground, ...c2.ground, ...waters, ...ripples, ...canals, ...lane, ...track, ...stack(items), ...c2.air, ...c1.air]

// 이름 — 공식 이름만. 구역 이름은 한국어판 인쇄가 없어 영어로만
const LABELS = [
  { text: 'Hagra Swamp', textKo: '하그라', at: [1050, 520], size: 36, kind: 'area' },
  { text: 'Malakir Mire', textKo: '말라키르 수렁', at: [280, 492], size: 24, kind: 'water' },
  { text: 'Kalastria District', at: [690, 362], size: 20, kind: 'area' },
  { text: 'Urnaav District', at: [764, 740], size: 19, kind: 'area' },
  { text: 'Emevera District', at: [598, 790], size: 19, kind: 'area' },
  { text: 'Ghet District', at: [358, 588], size: 19, kind: 'area' },
  { text: 'Nirkana District', at: [466, 334], size: 19, kind: 'area' },
]

// ---------- 지형 기호 칸 ----------
// 구멍은 짝홀 규칙의 고리로 낸다: 바깥 고리의 첫 점에서 구멍으로 갔다가 되돌아오는 틈(넓이 0)으로 잇는다.
// 구멍은 바깥 고리 안에만, 서로 겹치지 않게 (겹치거나 밖으로 나가면 그 자리가 다시 채워진다)
const withHoles = (outer, holes) => [...outer, outer[0], ...holes.flatMap((h) => [...h, h[0], outer[0]])]
const labelHole = (l, top = 6, bottom = 20) => {
  const w = l.size * l.text.length * (l.kind === 'place' ? 0.47 : 0.55)
  const [x, y] = l.at
  return [[x - w / 2 - 28, y - l.size * 0.9 - top], [x + w / 2 + 28, y - l.size * 0.9 - top], [x + w / 2 + 28, y + l.size * 0.36 + bottom], [x - w / 2 - 28, y + l.size * 0.36 + bottom]]
}

// 도시 둘레 — 늪 기호도 늪숲 나무도 들이지 않는다. 동쪽 기슭을 올라가 북쪽으로 서쪽까지(혈족장의 칼과 피의 마녀 자리도 감싼다)
const NOTCH = [[912, 688], [884, 610], [884, 520], [884, 476], [1012, 474], [1012, 372], [850, 372], [826, 326], [738, 322], [738, 196], [560, 196], [560, 286], [372, 286], [382, 384]]

// 하그라의 늪숲 (세계 지도 hagra-swamp-forest-east 의 고리, 이 축척) — 서쪽 트인 늪과 도시 둘레를 뺀 북쪽·동쪽 늪.
// 남쪽 가장자리는 세계 지도의 고리 ((1360,560)–(1180,580)–(1020,680)) 를 따른다. 세계 지도와 같은 맹그로브 칸
// (버팀뿌리 나무 사이에 늪 풀포기가 섞인다)
// 큰 떠 있는 섬(나무 포함)과 그 물줄기·그늘, 바위 무더기, 하그라 이름 — 페이즈와 상관없이 비운다
const ISLAND_HOLE = [[1050, 190], [1172, 190], [1172, 412], [1050, 412]]
const ROCKS_HOLE = [[1270, 296], [1366, 296], [1366, 372], [1270, 372]]
const HAGRA_LABEL_HOLE = labelHole(LABELS[0], 10, 24).map(([x, y], i) => [x + (i === 1 || i === 2 ? 22 : -10), y])
const MANGROVE_HOLES = [
  // 떠 있는 섬(작은 것)과 그 밑 웅덩이, 흡혈귀 밤도둑이 나는 하늘 — 한 구멍으로 (섬 위로 나무가 걸치지 않게 위쪽을 넉넉히)
  [[770, 196], [846, 180], [890, 112], [984, 110], [984, 264], [962, 300], [934, 326], [880, 326], [836, 318], [790, 318], [756, 244]],
  ellipse(1012, 614, 64, 32),
  ISLAND_HOLE,
  ROCKS_HOLE,
  // 니르카나 북서쪽의 고인 물과 그 갈대, 그 북동쪽의 흡혈귀 열상자 — 한 구멍으로. 늪 풀포기는 기준점 위로 자라고 나무는 위아래로
  // 걸치므로 그림·이름에서 넉넉히 비운다. 남쪽과 동쪽은 도시 자리((560,196)–(560,286)–(372,286))의 안쪽에 둔다.
  // 열상자 이름 동쪽 끝이 도시 자리 밖(x 560–618)으로 나가므로 그 위의 나무도 비운다. 서쪽 변은 위 칸 경계(MANGROVE_TOP_EDGE) 밑에
  [[322, 274], [320, 226], [400, 220], [412, 200], [420, 156], [452, 106], [618, 106], [618, 195.5], [556, 195.5], [556, 285.5], [482, 285.5], [480, 272], [400, 280]],
  HAGRA_LABEL_HOLE,
]
// 틀 위 끝 띠(세계 지도의 늪숲이 이어 들어오는 곳)는 따로 세계 지도의 맹그로브 밀도 그대로의 칸으로.
// 두 칸의 경계는 곧은 줄로 보이지 않게, 아래 칸의 구멍(그림·이름 자리) 위 끝에 바싹 붙어 내려갔다 올라왔다 한다 —
// 밀도가 바뀌는 곳이 대부분 그 빈 자리의 가장자리라 띠처럼 읽히지 않는다 (구멍은 모두 이 선 아래, 아래 칸 안에 든다)
const MANGROVE_TOP_EDGE = [
  [1440, 210], [1412, 150], [1396, 92], [1340, 84], [1270, 76], [1215, 86], [1210, 90], [1200, 150], [1180, 176], [1130, 164], [1080, 182],
  [1036, 168], [1004, 150], [984, 96], [940, 84], [896, 92], [872, 110], [840, 136], [800, 150], [762, 152], [728, 170], [690, 160],
  [652, 140], [624, 96], [580, 84], [520, 92], [470, 80], [446, 92], [428, 140], [390, 152], [340, 140], [290, 152], [240, 136], [207, 92],
]
const MANGROVE_TOP = [[244, -40], [1440, -40], ...MANGROVE_TOP_EDGE]
const MANGROVE = withHoles(
  [...[...MANGROVE_TOP_EDGE].reverse(), [1440, 510], [1360, 560], [1180, 580], [1020, 680], ...NOTCH, [273, 380], [300, 300], [200, 120]],
  MANGROVE_HOLES,
)
// 트인 늪 (세계 지도의 하그라 늪, 남쪽 가장자리 (0,845)–(500,785)) — 늪숲 서쪽의 말라키르 수렁과 Piranha Marsh 둘레.
// 웅덩이·이름 둘레는 비운다 (그림이 없어 페이즈와 상관없이 한 칸)
const SWAMP = withHoles(
  [[-30, 845], [-30, -40], [244, -40], [200, 120], [300, 300], [273, 380], [382, 384], [390, 440], [396, 500], [460, 520], [462, 560], [380, 590], [368, 640], [366, 700], [392, 758], [470, 780], [480, 790]],
  [
    // Piranha Marsh 의 물과 그 위의 표시 이름
    [[96, 226], [130, 206], [200, 204], [240, 212], [268, 250], [262, 320], [220, 338], [150, 336], [104, 316], [84, 280]],
    // 수렁의 큰 웅덩이와 그 갈대·바위
    [[240, 404], [300, 398], [356, 408], [368, 434], [320, 452], [250, 450], [234, 430]],
    labelHole(LABELS[1], 6, 27),
    // 게트 이름과 그 둘레 수렁의 웅덩이들
    [[300, 530], [350, 528], [420, 526], [450, 534], [436, 560], [400, 580], [372, 604], [352, 630], [340, 656], [300, 664], [250, 654], [196, 636], [186, 604], [230, 588], [264, 570], [300, 562]],
  ],
)

// 남동쪽 해안의 정글 (세계 지도 guul-draz-jungle-southeast 의 북서쪽 가장자리, 이 축척) — 성문으로 오는 길이 지나는 자리는 비운다.
// 함정(Needlebite Trap)이 놓인 길가(성문 밖 트인 땅)에서 가장자리를 내렸다(세계 지도보다 세계 단위 최대 약 16 — 작은 함정과
// 이름이 나무에 묻히지 않게). 길 북동쪽은 사냥 무리가 선 길가 빈터 뒤로 숲 띠가 남도록 가장자리를 세계 지도보다 조금(세계 단위
// 2–11) 올렸다
const J_EDGE = [[430, 1030], [460, 970], [520, 910], [590, 900], [650, 940], [720, 940], [780, 880], [860, 880], [920, 900], [984, 930], [1044, 942], [1100, 938], [1140, 900], [1166, 780], [1220, 716], [1300, 700], [1360, 676], [1430, 662]]
/** 두 선분의 교점 */
function segHit([ax, ay], [bx, by], [cx, cy], [dx, dy]) {
  const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx)
  if (!den) return null
  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den
  const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [ax + (bx - ax) * t, ay + (by - ay) * t] : null
}
/** 꺾은선 p 와 q 가 처음 만나는 곳 — { at, i: p 의 마디, j: q 의 마디 } */
function firstHit(p, q) {
  for (let i = 0; i < p.length - 1; i++) for (let j = 0; j < q.length - 1; j++) {
    const at = segHit(p[i], p[i + 1], q[j], q[j + 1])
    if (at) return { at, i, j }
  }
  throw new Error('no hit')
}
const TRACK_X = [...TRACK, [1330, 1050]]
const TRACK_NE = K.offset(TRACK_X, 26)
const TRACK_SW = K.offset(TRACK_X, -26)
const hw = firstHit(J_EDGE, TRACK_SW)
const he = firstHit(J_EDGE, TRACK_NE)
const JUNGLE_W = [...J_EDGE.slice(0, hw.i + 1), hw.at, ...TRACK_SW.slice(hw.j + 1), [430, 1050]]
// 길 북동쪽 정글은 길가 빈터(흡혈귀 사냥 무리 — 피의 잔치)를 비우고, 빈터 뒤(북쪽)의 띠, 동쪽의 띠(빈터를 숲이
// 감싸게 — 무리가 틀에 붙어 보이지 않게), 길이 정글로 드는 빈터 서쪽, 빈터 아래 남동 구석만 남긴다.
// 나무 기호는 기준점 위로 약 23, 아래로 약 17, 옆으로 약 20 걸치므로 빈터는 그림과 이름에서 그만큼 더 비운다
// 빈터 서쪽 끝 — 북쪽 띠에서 길 가장자리(TRACK_NE)로 내려간다
const FEAST_W = [[1238, 812], [1226, 852], [1206, 880], [1190, 904]]
const fw = firstHit(FEAST_W, TRACK_NE)
const JUNGLE_E = [he.at, ...J_EDGE.slice(he.i + 1), [1430, 924], [1384, 924], [1384, 812], ...FEAST_W.slice(0, fw.i + 1), fw.at, ...TRACK_NE.slice(he.j + 1, fw.j + 1).reverse()]
const JUNGLE_SE = [TRACK_NE.at(-2), [1330, 964], [1392, 962], [1430, 930], [1430, 1050], TRACK_NE.at(-1)]
// 조각들을 넓이 없는 틈으로 이어 한 칸으로 (길 양쪽에 따로 두면 한쪽이 시작점을 못 받아 비기도 한다)
const JUNGLE = [...JUNGLE_W, JUNGLE_W[0], ...JUNGLE_E, JUNGLE_E[0], ...JUNGLE_SE, JUNGLE_SE[0], JUNGLE_E[0], JUNGLE_W[0]]

// ---------- 페이즈1 이 꺼졌을 때의 칸 ----------
// 위의 늪숲·정글 칸에 낸 빈터 가운데 그림(과 그 이름) 자리는 페이즈1 에서만 비운다. 꺼지면 아래 칸이 쓰이고,
// 물·떠 있는 섬·바위 무더기·이름 자리만 비운다 (정글 가장자리는 세계 지도의 고리 그대로). 트인 늪은 그림이 없어 한 칸이다
const NOTCH_OFF = [[912, 688], [884, 610], [884, 520], [884, 440], [860, 380], [826, 326], [738, 316], [620, 310], [560, 286], [372, 286], [382, 384]]
const MANGROVE_OFF = withHoles(
  [...[...MANGROVE_TOP_EDGE].reverse(), [1440, 510], [1360, 560], [1180, 580], [1020, 680], ...NOTCH_OFF, [273, 380], [300, 300], [200, 120]],
  [
    // 작은 떠 있는 섬과 그 그늘, 그 밑 웅덩이
    [[886, 114], [984, 114], [984, 264], [966, 330], [920, 330], [900, 270], [880, 200]],
    ellipse(1012, 614, 64, 32),
    ISLAND_HOLE,
    ROCKS_HOLE,
    // 니르카나 북서쪽의 고인 물과 그 갈대
    [[320, 226], [400, 220], [476, 232], [480, 272], [400, 280], [322, 274]],
    HAGRA_LABEL_HOLE,
  ],
)
const J_EDGE_OFF = [[430, 1030], [460, 970], [520, 910], [590, 900], [650, 940], [720, 940], [780, 880], [860, 880], [920, 900], [1000, 880], [1060, 820], [1140, 790], [1220, 810], [1300, 780], [1360, 720], [1440, 700]]
const JUNGLE_OFF = (() => {
  const w = firstHit(J_EDGE_OFF, TRACK_SW)
  const e = firstHit(J_EDGE_OFF, TRACK_NE)
  const west = [...J_EDGE_OFF.slice(0, w.i + 1), w.at, ...TRACK_SW.slice(w.j + 1), [430, 1050]]
  const east = [e.at, ...J_EDGE_OFF.slice(e.i + 1), [1440, 1050], ...TRACK_NE.slice(e.j + 1).reverse()]
  return [...west, west[0], ...east, east[0], west[0]]
})()

// 펠라카 카르스트 남쪽 띠(세계 지도 pelakka-karst-south)는 고리의 북쪽 끝이 틀의 남서 구석에 조금 걸치지만, 세계 지도의 협곡
// 기호는 모두 틀 남쪽에 있고 조사 메모도 틀 안의 카르스트를 금한다 — 그 구석은 빈 땅으로 둔다

CHILDMAPS.push({
  id: 'malakir',
  size: [1400, 1000],
  glyphScale: 4,
  terrain: [
    { kind: 'forest', points: JUNGLE, density: 0.42, phase: true },
    // 하그라의 늪숲 — 세계 지도와 같은 맹그로브 기호(버팀뿌리 나무와 늪 풀포기). 도시 둘레는 그림이 읽히게 성기게
    { kind: 'mangrove', points: MANGROVE, density: 0.6, phase: true },
    // 트인 늪은 서쪽 틀 밖 세계 지도의 늪 풀포기만큼
    { kind: 'swamp', points: SWAMP, density: 0.62 },
    { kind: 'mangrove', points: MANGROVE_TOP, density: 1 },
    // 페이즈1 이 꺼졌을 때 — 그림 자리 빈터를 채운 같은 칸들
    { kind: 'forest', points: JUNGLE_OFF, density: 0.42, phase: false },
    { kind: 'mangrove', points: MANGROVE_OFF, density: 0.6, phase: false },
  ],
  parts,
  labels: LABELS,
  // 페이즈2(WWK)·페이즈3(ROE) 대상의 빈터 — 그 페이즈부터(phase2·phase3) 이 안에 밑동이 떨어지는 지형 기호를 뺀다 (STYLE.md)
  clearings: [
    { points: [[247, 419], [244, 443], [231, 459], [211, 469], [177, 473], [145, 467], [120, 462], [113, 442], [108, 419], [110, 394], [122, 378], [143, 367], [177, 368], [213, 366], [234, 377], [245, 394]], phase3: true }, // nirkana-cutthroat
    { points: [[1304, 672], [1295, 711], [1264, 733], [1225, 749], [1159, 754], [1094, 748], [1051, 735], [1035, 707], [1021, 672], [1032, 636], [1050, 610], [1097, 600], [1159, 595], [1225, 595], [1260, 614], [1292, 635]], phase3: true }, // drana-kalastria-bloodchief
    { points: [[632, 463], [623, 505], [611, 534], [581, 547], [540, 554], [497, 551], [474, 530], [454, 506], [453, 463], [458, 423], [471, 394], [497, 375], [540, 371], [581, 380], [610, 393], [629, 419]], phase3: true }, // nirkana-revenant
    { points: [[908, 463], [892, 503], [880, 531], [852, 549], [806, 553], [759, 551], [729, 534], [715, 504], [702, 463], [718, 424], [731, 395], [763, 384], [806, 369], [850, 381], [876, 399], [892, 424]], phase2: true }, // kalastria-highborn
    { points: [[536, 847], [536, 890], [518, 918], [489, 936], [442, 933], [396, 934], [365, 919], [354, 887], [341, 847], [347, 804], [363, 775], [399, 767], [442, 757], [488, 761], [515, 780], [538, 803]], phase2: true }, // butcher-of-malakir
  ],
  subjects: {
    // Nirkana Cutthroat(ROE) — 말라키르 수렁의 갈대 사이를 칼 두 자루를 낮게 쥐고 웅크려 내달리는 니르카나 흡혈귀 살인자. (페이즈3)
    'nirkana-cutthroat': { at: [160, 446], size: 90 },
    // Drana, Kalastria Bloodchief(ROE) — 도시 동쪽 하그라 늪 위 하늘(Hagra Swamp 이름 남쪽, 칼라스트리아 언덕에서 동쪽으로 한참 떨어진 곳)을 날개 없이 낮게 날며 칼을 휘두르는 혈족장 드라나. (페이즈3)
    'drana-kalastria-bloodchief': { at: [1160, 650], size: 84 },
    // Nirkana Revenant(ROE) — 니르카나 구역 운하 위에 뜬 흡혈귀 그림자 (페이즈3)
    'nirkana-revenant': { at: [540, 440], size: 90 },
    // 페이즈2 — 칼라스트리아 구역(도시에서 가장 높은 땅) 언덕마루 동쪽 끝, 동쪽 첨탑과 언덕 가장자리 사이에 null 둘을 거느린 Highborn
    'kalastria-highborn': { at: [794, 486], size: 90 },
    // 페이즈2 — 도시 남쪽 바로 밖 트인 땅 위 하늘, 게트 구역 물 남동쪽·Emevera 구역 이름 남서쪽 아래를 나는 처형자
    'butcher-of-malakir': { at: [455, 845], size: 92 },
    'vampire-lacerator': { at: [540, 198], size: 92 },
    'feast-of-blood': { at: [1308, 896], size: 98 },
    'gatekeeper-of-malakir': { at: [872, 776], size: 88, flip: true },
    'needlebite-trap': { at: [1050, 876], size: 72 },
    'vampire-nighthawk': { at: [842, 222], size: 92 },
    'malakir-bloodwitch': { at: [652, 258], size: 90 },
    'blade-of-the-bloodchief': { at: [904, 412], size: 60 },
    'kalitas-bloodchief-of-ghet': { at: [480, 660], size: 88 },
  },
  markAnchors: { malakir: 'right', 'card:piranha-marsh': 'above' },
  focus: [628, 560],
})
