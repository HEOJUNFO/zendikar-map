// Affa — 자식 지도 (아쿰의 이빨 기슭, 세계 범위 x 1790–1920 · y 430–520, ×11.11).
// 아파는 2016년 이후의 모습이 알려지지 않아, 마지막으로 그려진 모습 — 이빨 기슭 '산기슭이라 할 만한 땅'에 돌과 벽돌 건물이
// 작게 모인 마을(Journey to the Eye 1부 2009 웹코믹의 'Affa Town' 그림, The Art of Magic: Zendikar 2016) — 으로 조용히 둔다.
// 성벽·문·망루는 없고(그림에도 없다), 불탄 자국·폐허·엘드라지 흔적도 없다. 열린 꼭대기의 둥근 통 건물 셋과 가는 굴뚝 탑 둘,
// 좁은 골목과 먼지 이는 작은 마당은 그 그림을 따랐다. 마당 남쪽의 노점은 아파 바자(PG: Akoum 2010)의 암시일 뿐 이름은 없다.
// 해석(공식 자리·모양 없음): 건물 배치, 마을을 둘러싼 낮은 언덕, 서쪽 바위 둔덕의 굴 입구 하나(2015–16년 주민이 옮겨 간
// 지하 폐허의 암시 — 입구 자리는 공식 자료에 없다, 안의 헤드론은 그리지 않는다), 마을에서 협곡 어귀로 들어 바닥을 조금 오르는 희미한 길,
// 페이즈 그림 일곱의 자리 — 고블린 셋(길잡이·폭파꾼·횃불 던지는 이)은 마을 남·서쪽 맨땅, 지름길잡이는 강 남쪽 들판의 바위 둔덕,
// Lethargy Trap 은 Windblast Gorge 어귀 안 길 위(드레이크가 맴도는 협곡), Spire Barrage 는 가시지대 남쪽 끝(그 자리의 첨탑 무리는 비웠다),
// Plated Geopede 는 분화구 남동쪽 용암 들판 가장자리의 굴(굴 앞에서 들판 안쪽으로 이어지는 짧은 열린 용암 혀도 이 지도의 그림).
// 어느 것도 그 자리에 있다는 공식 서술은 없다.
// 세계 지도의 바탕 지형(src/data/landscape/akoum.ts)을 그대로 옮긴 것: 이빨에서 아파로 흐르는 강(akoum-affa-river, 아파 남동쪽
// 끝에서 그친다), Windblast Gorge 협곡(akoum-windblast-gorge — Eye of Ugin 지도의 아래 끝과 같은 손), 가시지대 결정 들판의 남동쪽
// 쐐기(akoum-spikefields)와 그 협곡의 동쪽 끝(akoum-spikefields-chasm), 초화산의 분화구(akoum-supervolcano), 하늘거주지 아래
// 용암 들판의 서쪽 끝(akoum-lava-field, 2020년). 강·분화구·용암 들판·언덕·굴·길에는 이름을 달지 않는다.

const { line, poly, smooth, rng, offset, along, stack } = KIT
const r1 = (v) => Math.round(v * 10) / 10
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`
const P = (cls, d) => ({ cls, d })
const ell = (x, y, rx, ry) => `M${pt([x - rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x + rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x - rx, y])}Z`
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
/** 판화의 점찍기 — 엇갈린 격자에 작은 점 (불빛을 옅게 깔 때). keep(x, y) 가 0..1 의 남길 비율 */
function stipple(x0, y0, x1, y1, gap, r, keep, seed) {
  const rand = rng(seed)
  let d = ''
  let row = 0
  for (let y = y0; y <= y1; y += gap * 0.87, row++) {
    for (let x = x0 + (row % 2 ? gap / 2 : 0); x <= x1; x += gap) {
      const px = x + (rand() - 0.5) * gap * 0.5
      const py = y + (rand() - 0.5) * gap * 0.5
      if (rand() > keep(px, py)) continue
      const rr = r * (0.75 + rand() * 0.5)
      d += `M${r1(px - rr)} ${r1(py)}a${r1(rr)} ${r1(rr)} 0 1 0 ${r1(rr * 2)} 0a${r1(rr)} ${r1(rr)} 0 1 0 ${r1(-rr * 2)} 0`
    }
  }
  return d
}

/** Catmull-Rom 을 촘촘한 꺾은선으로 */
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
/** 점에서 꺾은선까지의 거리 */
function distTo(pts, [x, y]) {
  let best = Infinity
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[i + 1]
    const L2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2))
    best = Math.min(best, Math.hypot(x - ax - t * (bx - ax), y - ay - t * (by - ay)))
  }
  return best
}
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
/** 세계 지도(src/map/geometry.ts)의 chaikinOpen·resample 과 같은 계산 — 틀을 넘는 협곡·강이 세계 지도의 선과 꼭 맞게 */
function chaikinOpen(pts, it) {
  for (let k = 0; k < it && pts.length > 2; k++) {
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
function resampleLine(pts, step) {
  const out = []
  let carry = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[i + 1]
    const len = Math.hypot(bx - ax, by - ay)
    if (!len) continue
    let t = carry
    while (t < len) {
      out.push([ax + ((bx - ax) * t) / len, ay + ((by - ay) * t) / len])
      t += step
    }
    carry = t - len
  }
  const last = pts[pts.length - 1]
  const prev = out[out.length - 1]
  if (!prev || Math.hypot(prev[0] - last[0], prev[1] - last[1]) > step * 0.3) out.push(last)
  return out
}
const normalsOf = (pts) =>
  pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(pts.length - 1, i + 1)]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    return [-(b[1] - a[1]) / len, (b[0] - a[0]) / len]
  })
/** 가장자리 띠(약 120 단위) 안에서 0 — 손 떨림을 띠에서 거둬 세계 지도의 선과 겹쳐 하나로 보이게 */
const W_ = 1444
const H_ = 1000
const inner = (x, y) => clamp((Math.min(x, y, W_ - x, H_ - y) - 120) / 90, 0, 1)

// ---------------------------------------------------------------- 세계 지도에서 온 자리 (context.mjs, 자식 좌표)
// 앱이 찍는 표시: 아파 (662,247) — 마을 가운데 마당, Windblast Gorge (955,60) — 협곡 바닥
/** Windblast Gorge (akoum-windblast-gorge, 너비 80) — 어귀(아파 북동쪽)에서 북동쪽으로 오른다. 세계 지도의 선 그대로(틀 밖까지) —
 *  세계 지도처럼 chaikin 두 번으로 다듬어, 위 가장자리 띠에서 세계 지도의 협곡 단애와 한 선으로 겹친다 */
const GORGE = [[755.3, 206.6], [822, 153.3], [888.6, 113.3], [941.9, 46.7], [981.9, -33.3], [1035.2, -113.3], [1101.9, -166.6]]
const GORGE_HALF = 40
/** 이빨에서 아파로 흐르는 강 (akoum-affa-river) — 동쪽 끝(1444,132)으로 들어와 아파 남동쪽 가장자리에서 그친다 (풀포기 비켜 두기용 대강의 물길) */
const RIVER = [[1542, 73], [1395, 153], [1262, 247], [1102, 327], [942, 380], [809, 353], [750, 309]]
/** 세계 지도의 아파 강 (src/data/landscape/akoum.ts 의 akoum-affa-river) — landscape.ts 의 shapeRivers 와 같은 계산 (Eye of Ugin 지도와 같은 손),
 *  자식 좌표로. 오른쪽 띠에서 세계 지도의 강과 물길·폭이 꼭 같아 두 갈래로 보이지 않는다 */
const WORLD_AFFA = (() => {
  const course = [[1955.2, 405.4], [1946.8, 416.2], [1937.2, 425.8], [1928.8, 436.6], [1915.6, 443.8], [1903.6, 452.2], [1889.2, 459.4], [1874.8, 464.2], [1862.8, 461.8], [1854.4, 455.8]]
  let seed = 2166136261
  for (const ch of 'river:akoum-affa-river') seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619)
  seed >>>= 0
  const lattice = (ix, iy) => {
    let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + seed) | 0
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
  }
  const sm = (t) => t * t * (3 - 2 * t)
  const noise = (x, y) => {
    const gx = x / 9
    const gy = y / 9
    const ix = Math.floor(gx)
    const iy = Math.floor(gy)
    const tx = sm(gx - ix)
    const ty = sm(gy - iy)
    const a = lattice(ix, iy) + (lattice(ix + 1, iy) - lattice(ix, iy)) * tx
    const b = lattice(ix, iy + 1) + (lattice(ix + 1, iy + 1) - lattice(ix, iy + 1)) * tx
    return a + (b - a) * ty
  }
  const smooth0 = resampleLine(chaikinOpen(course, 3), 1.5)
  const nm = normalsOf(smooth0)
  let samples = smooth0.map(([x, y], i) => {
    const t = i / (smooth0.length - 1)
    const a = (noise(i * 1.5, 0) - 0.5) * 1.6 * Math.min(1, t * 6, (1 - t) * 6)
    return [x + nm[i][0] * a, y + nm[i][1] * a]
  })
  // 땅에서 끝나는 강 — 아파 표시(1849.6, 452.2) 앞 9 단위에서 멈춘다
  let k = samples.length
  while (k > 2 && Math.hypot(samples[k - 1][0] - 1849.6, samples[k - 1][1] - 452.2) < 9) k--
  samples = samples.slice(0, k)
  const n = samples.length
  const S = 1444 / 130
  return samples.map(([x, y], i) => {
    const t = i / (n - 1)
    const w = 1.3 * (0.2 + 0.8 * t ** 0.8) * (0.25 + 0.75 * Math.min(1, (1 - t) / 0.2))
    return [(x - 1790) * S, (y - 430) * S, w * S]
  })
})()
/** 가시지대 결정 들판 (akoum-spikefields 타원) */
const SPIKE = { cx: -57.8, cy: -339.9, rx: 960, ry: 706 }
const spikeE = (x, y) => Math.hypot((x - SPIKE.cx) / SPIKE.rx, (y - SPIKE.cy) / SPIKE.ry)
/** 가시지대 협곡의 동쪽 끝 (akoum-spikefields-chasm, 너비 80) */
const CHASM = [[-140, -73], [-18, 7], [115, 33], [209, 127]]
/** 초화산 분화구 (akoum-supervolcano, 크기 1.3 — 테두리 반지름 15×6.5, 바닥 10.5×4.2 를 ×14.44) */
const CAL = { x: 1088.6, y: 699.8, RX: 216.6, RY: 93.9, rx: 151.6, ry: 60.6, dy: 10.1 }
/** 용암 들판의 서쪽 끝 (akoum-lava-field 고리의 틀 안 부분) */
const LAVA = [[1470, 560], [1421.8, 566.5], [1341.8, 606.5], [1288.5, 659.8], [1275.2, 739.8], [1275.2, 819.7], [1315.2, 899.7], [1355.1, 966.4], [1421.8, 1019.7], [1470, 1030]]

// ---------------------------------------------------------------- 그리기 도구 (KIT 에 없는 것)
/** 벼랑 면 — KIT.cliff 와 같은 손이되 깊이가 자리마다 달라진다 (협곡 어귀로 갈수록 낮아지는 벽) */
function wallFace(pts, depthAt, o = {}) {
  const rand = rng(o.seed ?? 'wall')
  const step = o.step ?? 7
  const side = o.side ?? 1
  const all = along(pts, step)
  let ticks = ''
  const top = []
  const bot = []
  all.forEach(([[x, y], [ux, uy]], i) => {
    const t = i / Math.max(1, all.length - 1)
    const len = depthAt(t) * (0.45 + rand() * 0.55)
    let dx = 0
    let dy = len
    if (o.mode === 'hachure') {
      dx = -uy * side * len
      dy = ux * side * len
    }
    if (len > 1.5) ticks += line([[x, y], [x + dx, y + dy]])
    top.push([x, y])
    bot.push([x + dx * 0.9, y + dy * 0.9])
  })
  const face = top.length > 1 ? poly([...top, ...bot.reverse()]) : ''
  return [P('shade', face), P('hatch', ticks), P(o.bold === false ? 'ink' : 'ink-bold', smooth(pts))]
}

/** 반짝임 ('the crystalline fields shimmer in every imaginable color beneath the sun') */
const glint = ([x, y], r) =>
  line([[x - r, y], [x + r, y]]) + line([[x, y - r], [x, y + r]]) + line([[x - r * 0.45, y - r * 0.45], [x + r * 0.45, y + r * 0.45]]) + line([[x - r * 0.45, y + r * 0.45], [x + r * 0.45, y - r * 0.45]])
/** 은빛·푸른 풀포기 ('Aggressive silver and blue grasses take root in volcanic stone') */
const tuft = ([x, y], s = 6) => line([[x - s * 0.55, y - s * 0.65], [x - s * 0.12, y]]) + line([[x, y - s], [x, y]]) + line([[x + s * 0.55, y - s * 0.7], [x + s * 0.12, y]])

/** 열린 꼭대기의 둥근 통 건물 (2009년 그림의 낮고 둥근 원통 서넛) — (x, y) 는 밑 가운데 */
function drum(x, y, w, h) {
  const rx = w / 2
  const ry = w * 0.2
  const top = y - h
  const body = `M${pt([x - rx, top])}L${pt([x - rx, y])}A${r1(rx)} ${r1(ry)} 0 0 0 ${pt([x + rx, y])}L${pt([x + rx, top])}A${r1(rx)} ${r1(ry)} 0 0 1 ${pt([x - rx, top])}Z`
  const rim = ell(x, top, rx, ry)
  const hole = ell(x, top + ry * 0.12, rx * 0.74, ry * 0.62)
  const sx = x + rx * 0.3
  const side = `M${pt([sx, top + ry * 0.95])}L${pt([sx, y + ry * 0.95])}A${r1(rx)} ${r1(ry)} 0 0 0 ${pt([x + rx, y])}L${pt([x + rx, top])}Z`
  let hatch = ''
  for (const t of [0.45, 0.72]) {
    const hx = sx + (x + rx - sx) * t
    hatch += line([[hx, top + ry + h * 0.1], [hx, y + ry * 0.55]])
  }
  // 돌 줄눈 한 줄
  hatch += `M${pt([x - rx, top + h * 0.48])}A${r1(rx)} ${r1(ry)} 0 0 0 ${pt([x + rx, top + h * 0.48])}`
  return [P('fill', body + rim), P('shade', side), P('stone', hole), P('hatch', hatch), P('dark', ell(x, top + ry * 0.3, rx * 0.6, ry * 0.42)), P('ink', body + rim)]
}

/** 가는 굴뚝 같은 탑 (2009년 그림의 가늘고 높은 탑 하나둘) — 꼭대기에 살짝 넓은 갓돌 */
function chimney(x, y, w, h) {
  const tw = w * 0.78
  const top = y - h
  const body = poly([[x - w / 2, y], [x - tw / 2, top], [x + tw / 2, top], [x + w / 2, y]])
  const lip = poly([[x - tw / 2 - 1.6, top], [x - tw / 2 - 1.6, top - 3.4], [x + tw / 2 + 1.6, top - 3.4], [x + tw / 2 + 1.6, top]])
  const shade = poly([[x + w * 0.12, y], [x + tw * 0.12, top], [x + tw / 2, top], [x + w / 2, y]])
  let hatch = ''
  for (const t of [0.4, 0.75]) hatch += line([[x + w * 0.12 + (w / 2 - w * 0.12) * t, y - 2], [x + tw * 0.12 + (tw / 2 - tw * 0.12) * t, top + 3]])
  return [P('fill', body + lip), P('shade', shade), P('hatch', hatch), P('dark', poly([[x - tw * 0.32, top - 3.4], [x + tw * 0.32, top - 3.4], [x + tw * 0.32, top - 2.2], [x - tw * 0.32, top - 2.2]])), P('ink', body + lip)]
}

/** 노점 — 두 기둥 위 천막 차양과 낮은 판대 (2009년 그림의 붉은 천 차양). red 면 차양에 피빛 칠 */
function stall(x, y, w, red) {
  const h = w * 0.62
  const L = x - w / 2
  const R = x + w / 2
  const awn = poly([[L - 2, y - h * 0.62], [L + 1.5, y - h], [R + 1.5, y - h], [R + 2, y - h * 0.62]])
  let scal = `M${pt([L - 2, y - h * 0.62])}`
  const n = 4
  for (let k = 0; k < n; k++) {
    const a = L - 2 + ((w + 4) * k) / n
    const b = L - 2 + ((w + 4) * (k + 1)) / n
    scal += `Q${pt([(a + b) / 2, y - h * 0.62 + 3])} ${pt([b, y - h * 0.62])}`
  }
  const counter = poly([[L, y], [L, y - h * 0.3], [R, y - h * 0.3], [R, y]])
  const posts = line([[L + 1, y - h * 0.3], [L + 1, y - h * 0.62]]) + line([[R - 1, y - h * 0.3], [R - 1, y - h * 0.62]])
  let stripes = ''
  if (!red) for (let k = 1; k < 4; k++) stripes += line([[L - 2 + ((w + 4) * k) / 4 + 0.6, y - h * 0.62], [L + 1.5 + ((w) * k) / 4, y - h]])
  return [P('fill', awn + counter), P(red ? 'blood' : 'shade', awn), P('hatch', stripes + line([[x + w * 0.2, y - h * 0.28], [x + w * 0.2, y - 1]])), P('ink', awn + scal + counter + posts)]
}
/** 통 하나 — 짐 부리는 마당의 작은 통·상자 */
function barrel(x, y, s = 4) {
  const d = `M${pt([x - s / 2, y])}L${pt([x - s / 2 - 0.4, y - s * 0.6])}L${pt([x - s / 2, y - s * 1.2])}L${pt([x + s / 2, y - s * 1.2])}L${pt([x + s / 2 + 0.4, y - s * 0.6])}L${pt([x + s / 2, y])}Z`
  return [P('fill', d), P('hatch', line([[x - s / 2, y - s * 0.6], [x + s / 2, y - s * 0.6]])), P('ink', d)]
}
function crate(x, y, s = 5) {
  const d = poly(rect(x - s / 2, y - s, x + s / 2, y))
  return [P('fill', d), P('hatch', line([[x - s / 2, y - s], [x + s / 2, y]])), P('ink', d)]
}

/** 낮은 바위 둔덕 — 모난 마루, 오른쪽 그늘 면, 면을 가르는 결 (2009년 그림의 마을 뒤 바위 둔덕). (x, y) 는 밑 가운데 */
function knoll(x, y, w, h, seed) {
  const rand = rng(seed)
  const n = 7
  const pts = [[x - w / 2, y]]
  for (let k = 1; k < n; k++) {
    const t = k / n
    const a = Math.PI + t * Math.PI
    const rr = 0.82 + rand() * 0.22
    pts.push([x + Math.cos(a) * (w / 2) * rr, y + Math.sin(a) * h * rr * (0.75 + 0.25 * Math.sin(t * Math.PI))])
  }
  pts.push([x + w / 2, y])
  let top = 1
  for (let k = 2; k < pts.length - 1; k++) if (pts[k][1] < pts[top][1]) top = k
  const foot = [x + (pts[top][0] - x) * 0.5 + w * 0.1, y]
  const shadeP = poly([...pts.slice(top), foot])
  // 꼭짓점에서 내리긋는 면 결과 그늘 면의 짧은 빗금
  let hatch = line([pts[top], foot])
  for (let k = 1; k < pts.length - 1; k++) {
    if (k === top) continue
    const [px, py] = pts[k]
    hatch += line([[px, py], [px + (x - px) * 0.18, py + (y - py) * 0.45]])
  }
  for (let k = 1; k <= 4; k++) {
    const t = k / 5
    const px = foot[0] + (x + w / 2 - foot[0]) * t
    hatch += line([[px, y - h * (0.62 - t * 0.45)], [px - 2, y - 2]])
  }
  return [P('fill', poly(pts)), P('shade', shadeP), P('hatch', hatch), P('ink', poly(pts))]
}

// ---------------------------------------------------------------- 큰 지형지물
/** Windblast Gorge — 바닥은 그늘 칠, 북서 벽은 바위 면, 남동 가장자리는 안쪽으로 짧은 빗금 (Eye of Ugin 지도와 같은 손).
 *  남서 끝은 어귀 — 벽이 낮아지며 아파 쪽 맨땅으로 열린다 */
function gorge() {
  // 틀 위쪽으로 조금 나간 데서 자른다 (그 너머는 세계 지도의 협곡)
  const full = resampleLine(chaikinOpen(GORGE, 2), 6)
  const c = full.slice(0, full.findIndex(([, y]) => y < -40) + 1)
  const rand = rng('gorge')
  // 손 떨림은 띠 밖에서만 — 띠 안의 벽 선은 세계 지도의 단애 선 그대로
  const jag = (x, y) => (rand() - 0.5) * 3 * inner(x, y)
  // 어귀(처음 12%)는 조금 넓어지며 열린다
  const half = c.map(([x, y], i) => {
    const t = i / (c.length - 1)
    return GORGE_HALF * (t < 0.12 ? 1 + (0.12 - t) * 0.9 : 1) + (rand() - 0.5) * 4 * inner(x, y)
  })
  const at = (t) => half[Math.round(t * (c.length - 1))]
  const L = offset(c, at).map(([x, y]) => [x + jag(x, y), y + jag(x, y)])
  // 남동 가장자리는 어귀 쪽에서 조금 더 물러 Lethargy Trap 그림의 이름(디딤판 밑) 자리를 바닥 안에 둔다
  const R = offset(c, (t) => -(at(t) + 18 * clamp((0.3 - t) / 0.12, 0, 1))).map(([x, y]) => [x + jag(x, y), y + jag(x, y)])
  // 바닥 칠은 어귀에서 맨땅 쪽으로 둥글게 그친다 (벽 선은 그 앞에서 끊겨 열린 어귀로 보인다)
  const [mx, my] = c[0]
  const ul = Math.hypot(c[1][0] - mx, c[1][1] - my)
  const [ux, uy] = [(c[1][0] - mx) / ul, (c[1][1] - my) / ul]
  const [nx, ny] = [uy, -ux]
  const mouth = []
  const h0 = half[0]
  for (let k = 1; k < 10; k++) {
    const a = (k / 10) * Math.PI
    const r = h0 * (0.92 + (rand() - 0.5) * 0.1)
    // 오른쪽(남동) 끝에서 앞(남서)으로 돌아 왼쪽(북서) 끝으로 — 앞쪽으로는 반지름의 0.38 만큼만 부푼다
    mouth.push([mx - nx * r * Math.cos(a) - ux * r * 0.38 * Math.sin(a), my - ny * r * Math.cos(a) - uy * r * 0.38 * Math.sin(a)])
  }
  const floor = poly([...L, ...[...R].reverse(), ...mouth])
  // 벽 높이 — 어귀에서 낮다가 35% 지점부터 다 높아진다
  const ramp = (t) => clamp((t - 0.03) / 0.32, 0, 1)
  const cut = Math.round(c.length * 0.07)
  // 어귀의 낮은 둑 — 벽이 끝난 자리부터 앞을 돌아 맞은편 벽까지, 가는 선과 안쪽으로 짧은 빗금 (세계 지도의 띠 끝처럼 닫힌다)
  const lowRim = [...R.slice(0, cut + 1).reverse(), ...mouth, ...L.slice(0, cut + 1)]
  // 바닥의 잔돌 — Windblast Gorge 표시(955,60)와 그 이름 자리는 비킨다
  const stones = [0.3, 0.46, 0.62, 0.9].flatMap((t, k) => {
    const [x, y] = c[Math.round(t * (c.length - 1))]
    if (Math.hypot(x - 955, y - 60) < 50) return []
    return KIT.rocks(x + 6 + k * 2, y + 8, 5, 2, `gorge-r${k}`)
  })
  return [
    P('shade', floor),
    ...wallFace(lowRim, () => 6.5, { step: 7, side: 1, mode: 'hachure', seed: 'gorge-mouth', bold: false }),
    ...wallFace(L.slice(cut), (t) => 30 * Math.max(0.12, ramp(t * 0.93 + 0.07)), { step: 7, seed: 'gorge-far' }),
    ...wallFace([...R.slice(cut)].reverse(), (t) => 13 * Math.max(0.12, ramp((1 - t) * 0.93 + 0.07)), { step: 8, side: 1, mode: 'hachure', seed: 'gorge-near' }),
    ...stones,
  ]
}

/** 가시지대 협곡의 동쪽 끝 — 세계 지도의 띠처럼 그늘진 바닥, 양쪽 가장자리에서 안쪽으로 빗금, 둥글게 닫힌 끝 */
function chasm() {
  const c = dense(CHASM, false, 8)
  const half = 40
  const L = offset(c, half)
  const R = offset(c, -half)
  const [hx, hy] = c[c.length - 1]
  const [px, py] = c[c.length - 2]
  const ul = Math.hypot(hx - px, hy - py)
  const u = [(hx - px) / ul, (hy - py) / ul]
  const n = [u[1], -u[0]]
  const cap = []
  for (let k = 0; k <= 10; k++) {
    const a = (k / 10) * Math.PI
    const r = half * 0.95
    cap.push([hx + r * (n[0] * Math.cos(a) + u[0] * Math.sin(a)), hy + r * (n[1] * Math.cos(a) + u[1] * Math.sin(a))])
  }
  const rimPath = [...L, ...cap, ...[...R].reverse()]
  return [P('shade', poly(rimPath)), ...wallFace(rimPath, () => 14, { step: 8, side: -1, mode: 'hachure', seed: 'chasm', bold: false })]
}

/** 초화산 분화구 — 넓고 낮은 테두리, 안쪽 바닥으로 떨어지는 빗금, 바닥의 작은 분기공 셋. 원뿔·연기 기둥은 없다
 *  ('not precisely dormant… few major eruptions'). 바닥에만 옅은 불빛 */
function caldera() {
  const { x, y, RX, RY, rx, ry, dy } = CAL
  const fy = y + dy
  let hatch = ''
  const jr = rng('cal-hatch')
  const N = 64
  for (let i = 0; i < N; i++) {
    const t = ((i + (jr() - 0.5) * 0.4) / N) * Math.PI * 2 + 0.05
    // 빗금은 그늘진 안벽에 몰린다 — 해를 등진 서쪽 안벽과 마주 보이는 북쪽 안벽은 촘촘히, 동·남쪽은 성기게
    const dark = clamp(0.5 - Math.cos(t) * 0.42 - Math.sin(t) * 0.3, 0, 1)
    if (jr() > 0.55 + 0.45 * dark) continue
    const ou = x + Math.cos(t) * RX
    const ov = y + Math.sin(t) * RY
    const iu = x + Math.cos(t) * rx
    const iv = fy + Math.sin(t) * ry
    // 먼 쪽(북쪽) 안벽은 길게 보이고, 가까운 쪽(남쪽)은 짧게
    const k = (i % 2 ? 0.42 : 0.7) + (Math.sin(t) < 0 ? 0.16 : 0) + (jr() - 0.5) * 0.12
    hatch += line([[ou, ov], [ou + (iu - ou) * k, ov + (iv - ov) * k]])
  }
  // 굳은 바닥 껍질의 금 — 분기공마다 짧게 갈라진 가는 불빛 금 (분기공끼리 잇지 않는다: 'few major eruptions')
  const vents = [[x - 50.5, fy + 7.2, 13, 5.8], [x + 37.5, fy - 10, 10, 4.3], [x + 69.3, fy + 18.8, 8.7, 4.3]]
  const cracks =
    smooth([[x - 66, fy + 6], [x - 80, fy + 2], [x - 94, fy + 5]]) +
    smooth([[x - 36, fy + 9], [x - 22, fy + 5], [x - 12, fy + 7]]) +
    smooth([[x - 50, fy + 14], [x - 46, fy + 24], [x - 38, fy + 30]]) +
    smooth([[x + 27, fy - 11], [x + 14, fy - 7], [x + 4, fy - 9]]) +
    smooth([[x + 44, fy - 15], [x + 50, fy - 26], [x + 47, fy - 34]]) +
    smooth([[x + 79, fy + 20], [x + 92, fy + 17], [x + 104, fy + 20]])
  // 금 하나둘이 가늘게 벌어져 불빛이 비친다
  const seams = [
    [[x - 92, fy + 4], [x - 72, fy + 4]],
    [[x + 84, fy + 19], [x + 100, fy + 18]],
  ].map(([a, b]) => {
    const mx = (a[0] + b[0]) / 2
    const my = (a[1] + b[1]) / 2
    return poly([a, [mx, my - 1.8], b, [mx, my + 1.8]])
  })
  // 바닥 전체의 옅은 불빛 — 점찍기 (분기공 둘레가 더 촘촘하다)
  const floorDots = stipple(x - rx, fy - ry, x + rx, fy + ry, 7.5, 0.95, (px, py) => {
    const e = Math.hypot((px - x) / rx, (py - fy) / ry)
    if (e > 0.93) return 0
    const v = Math.min(...vents.map(([vx, vy]) => Math.hypot((px - vx) / 60, (py - vy) / 26)))
    return 0.38 + 0.5 * clamp(1 - v, 0, 1)
  }, 'cal-dots')
  return [
    P('shade', ell(x, y, RX, RY)),
    P('fill', ell(x, fy, rx, ry)),
    P('fire', floorDots),
    P('hatch', hatch),
    P('fire', vents.map(([vx, vy, a, b]) => ell(vx, vy, a * 1.3, b * 1.35)).join('') + seams.join('')),
    P('fire-ink', cracks),
    P('dark', vents.map(([vx, vy, a, b]) => ell(vx, vy, a, b)).join('')),
    P('hatch', ell(x, fy, rx, ry)),
    P('ink', ell(x, y, RX, RY)),
  ]
}

// ---------------------------------------------------------------- 그림 모으기
const parts = []
// 1. 땅바닥에 낮게 깔리는 것 — 용암 들판, 가시지대 협곡, 강, Windblast Gorge, 분화구
// 용암 들판은 아래 지형 기호(lava)로 — 세계 지도의 용암 기호·간격 그대로 (바탕의 옅은 용암 칠도 세계 지도 것)
// Plated Geopede 그림의 용암 자락에 잇던 용암 혀는 뺐다 — 그림이 아래 가장자리 띠 안(밑 y 905)에 있어, 이 지도의 칠은 띠에서 옅어져
// 들판 위에 반투명한 조각으로만 남았다 (그림 자락의 곧은 끝은 그림 쪽 일이다)
parts.push(...chasm())
{
  // 세계 지도의 강 그대로 — 물길·폭이 같아 오른쪽 띠에서 세계 지도의 강과 한 줄기로 겹친다. 마을 남동쪽 가장자리, 바자 노점 곁에서
  // 가늘어지며 그친다 (못·물웅덩이·건물 없이 — 'drain away beneath the surface'). 틀 오른쪽 밖으로 조금 나간 데서 자른다
  const pts = WORLD_AFFA.filter(([x]) => x < 1470)
  const course = pts.map(([x, y]) => [x, y])
  const nm = normalsOf(course)
  const left = course.map(([x, y], i) => [x + (nm[i][0] * pts[i][2]) / 2, y + (nm[i][1] * pts[i][2]) / 2])
  const right = course.map(([x, y], i) => [x - (nm[i][0] * pts[i][2]) / 2, y - (nm[i][1] * pts[i][2]) / 2])
  const [ex, ey] = course[course.length - 1]
  const [px, py] = course[course.length - 2]
  const ul = Math.hypot(ex - px, ey - py) || 1
  const tip = [ex + ((ex - px) / ul) * 3, ey + ((ey - py) / ul) * 3]
  const lc = left[left.length - 1]
  const rc = right[right.length - 1]
  const cap = `Q${pt([tip[0] + (lc[0] - ex), tip[1] + (lc[1] - ey)])} ${pt(tip)}Q${pt([tip[0] + (rc[0] - ex), tip[1] + (rc[1] - ey)])} ${pt(rc)}`
  const body = line(left) + cap + 'L' + line([...right].reverse()).slice(1) + 'Z'
  parts.push(P('sea', body), P('sea-ink', line(left) + cap + line([...right].reverse()).replace(/^M/, 'L')))
}
parts.push(...gorge())
parts.push(...caldera())

// 2. 땅 위에 선 것들 — 뒤(위)에서 앞(아래)으로
const items = []
const add = (y, p) => items.push({ y, parts: p })

// 가시지대 — 결정 첨탑 무리. 북서쪽이 빽빽하고 가장자리로 갈수록 성기다. 마을 둘레 100 단위 안, 협곡, 이름 자리에는 두지 않는다
const TOWN_BOX = [510, 130, 736, 340]
const CAVE = [446, 300] // 서쪽 바위 둔덕의 굴 입구 (밑 가운데)
const nearTown = (x, y) => Math.hypot(Math.max(TOWN_BOX[0] - x, 0, x - TOWN_BOX[2]), Math.max(TOWN_BOX[1] - y, 0, y - TOWN_BOX[3]))
const SPIKE_LABEL = [440, 52, 610, 100]
const inBox = ([x0, y0, x1, y1], x, y, m = 0) => x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m
// 결정 첨탑은 아래 지형 기호(crystal)로 — 세계 지도 akoum-spikefields 와 같은 기호·크기·간격. 그 칸은 마을 둘레, 굴 둔덕, Spire Barrage 그림
// 자리를 비켜 남쪽 가장자리를 들이고(SPIKE_FIELD), 가시지대 협곡 자리는 구멍으로 비운다
// Spire Barrage 그림 자리 — 그 그림이 제 결정 첨탑(부러져 쏟아지는 가시)을 그린다
const SPIRE_BOX = [274, 220, 374, 348]
{
  const g = rng('glints')
  let d = ''
  let n = 0
  for (let k = 0; k < 400 && n < 6; k++) {
    const x = 20 + g() * 600
    const y = 20 + g() * 260
    // 가장자리 띠(약 120 단위) 밖에만 — 세계 지도에는 반짝임이 없어 띠에서 옅어지며 끊기지 않게
    if (x < 130 || y < 130) continue
    if (spikeE(x, y) > 0.9 || nearTown(x, y) < 110 || inBox(SPIKE_LABEL, x, y, 20) || inBox(SPIRE_BOX, x, y, 16) || distTo(CHASM, [x, y]) < 46) continue
    d += glint([x, y], 2.6 + g() * 1.6)
    n++
  }
  add(1001, [P('hatch', d)])
}
// 서쪽 바위 둔덕과 굴 입구 하나 — 2015–16년 주민이 옮겨 간 지하 폐허의 암시 (자리는 이 지도의 해석, 이름 없음)
add(CAVE[1], [...knoll(CAVE[0] + 6, CAVE[1], 82, 42, 'knoll'), ...KIT.cave(CAVE[0] - 8, CAVE[1], 19, 14), ...KIT.rocks(CAVE[0] + 44, CAVE[1] + 3, 4.5, 2, 'kn-r'), ...KIT.rocks(CAVE[0] - 40, CAVE[1] + 4, 4, 2, 'kn-l')])

// 아파 — 돌과 벽돌 건물이 작게 모인 마을 (2009년 그림: 박공·모임지붕 몇, 평지붕 몇, 열린 둥근 통 셋, 가는 탑 둘, 좁은 골목,
// 먼지 이는 작은 마당). 표시는 마당 가운데에, 이름은 그 오른쪽 빈 마당에 놓인다. 성벽·문·망루는 없다
// [x, 밑 y, 너비, 높이, 꼴, 문]  (drum: 열린 둥근 통, chimney: 가는 탑)
const TOWN = [
  // 뒤(북쪽) 줄
  [566, 176, 30, 24, 'gable', 0], [592, 168, 10, 44, 'chimney'], [626, 178, 32, 25, 'hip', 0], [660, 172, 28, 22, 'gable', 0], [694, 176, 26, 16, 'drum'],
  // 둘째 줄 — 마당 북쪽 (서쪽 끝에 둥근 통)
  [540, 206, 26, 16, 'drum'], [572, 204, 32, 25, 'gable', 1], [606, 208, 28, 21, 'flat', 0], [640, 205, 26, 21, 'hip', 1], [704, 206, 26, 21, 'gable', 1],
  // 셋째 줄 — 마당 서쪽
  [526, 238, 28, 22, 'gable', 0], [558, 236, 30, 24, 'hip', 1], [594, 240, 28, 17, 'drum'], [626, 238, 24, 20, 'flat', 1],
  // 넷째 줄
  [536, 268, 30, 23, 'gable', 1], [568, 266, 28, 21, 'hip', 0], [600, 270, 30, 24, 'gable', 1], [630, 268, 24, 19, 'hip', 1],
  // 다섯째 줄 — 마당 남쪽 (강이 그치는 남동쪽 모퉁이는 노점 자리로 비운다)
  [548, 302, 30, 23, 'hip', 0], [580, 300, 28, 22, 'gable', 1], [604, 294, 10, 40, 'chimney'], [630, 304, 32, 24, 'gable', 1],
  [694, 306, 24, 19, 'flat', 1],
  // 앞(남쪽) 줄
  [566, 332, 30, 22, 'gable', 1], [598, 334, 30, 23, 'hip', 1], [630, 331, 28, 21, 'gable', 0], [662, 334, 30, 22, 'gable', 1],
]
for (const [x, y, w, h, kind, door] of TOWN) {
  if (kind === 'drum') add(y, drum(x, y, w, h))
  else if (kind === 'chimney') add(y, chimney(x, y, w, h))
  else {
    const roofH = kind === 'hip' ? w * 0.34 : kind === 'gable' ? w * 0.4 : 0
    const ps = KIT.house(x, y, w, h, { roof: kind, roofH, door: !!door })
    // 벽돌 집의 작은 창 하나 — 문이 없는 앞면에
    if (!door && kind !== 'flat') ps.splice(ps.length - 1, 0, P('dark', poly(rect(x - w * 0.22, y - h * 0.62, x - w * 0.08, y - h * 0.4))))
    if (kind === 'flat') {
      // 평지붕 — 낮은 난간 턱
      ps.push(P('ink', line([[x - w / 2, y - h + 2.2], [x + w / 2, y - h + 2.2]])))
    }
    add(y, ps)
  }
}
// 바자 — 마당 남쪽 가장자리의 노점 셋과 통·상자 (2009년 그림의 붉은 천 차양·통. 이름 없음)
add(292, stall(658, 292, 19, true))
add(290, stall(684, 290, 17, false))
add(286, stall(708, 286, 15, false))
add(298, [...barrel(670, 296, 4.4), ...barrel(675, 297, 4), ...barrel(650, 299, 4.2), ...crate(714, 296, 5), ...barrel(719, 297, 4)])

// 3. 길 — 마을 북동쪽에서 협곡 어귀로 들어 바닥을 조금 오르는 희미한 길 하나 (해석, 이름 없음). Lethargy Trap 의 디딤판이 이 길 위에 놓인다
parts.push(...KIT.dashed([[712, 190], [734, 196], [756, 190], [776, 178], [798, 170], [818, 168], [838, 170], [864, 150], [886, 122], [904, 94]], 7, 6))

// 4. 맨땅 — 화산암 땅에 뿌리내린 은빛·푸른 풀포기 무리와 낮은 돌, 잔돌 (세계 지도처럼 마을 남쪽·서쪽은 트인 땅)
// 그림·이름·분화구·용암 들판·화면 단추 자리는 비운다
const KEEP_OUT = [
  [262, 390, 400, 520], // 고블린 폭파꾼과 이름
  [640, 400, 776, 550], // 고블린 길잡이와 이름
  [486, 556, 604, 700], // 횃불 던지는 고블린과 이름
  [912, 400, 1040, 548], // 지름길잡이 고블린과 이름
  [1218, 820, 1372, 962], // 땅지네와 이름
  [0, 820, 240, 1000], // 확대 단추
]
const inKeepOut = (x, y) => KEEP_OUT.slice(0, 5).some((b) => inBox(b, x, y, 10))
// 그림 자리(KEEP_OUT 앞 다섯)는 페이즈1 에서만 비운다 — 그 자리의 풀포기·잔돌은 페이즈1 을 끄면 그린다
const openGround = (x, y, any = false) =>
  !KEEP_OUT.slice(any ? 5 : 0).some((b) => inBox(b, x, y, 10)) &&
  Math.hypot((x - CAL.x) / (CAL.RX + 30), (y - CAL.y) / (CAL.RY + 24)) > 1 &&
  !inPoly(x, y, [...dense(LAVA, false, 4), [1470, 1030], [1470, 560]]) &&
  distTo(RIVER, [x, y]) > 24 &&
  nearTown(x, y) > 40 &&
  spikeE(x, y) > 1.02
// 세계 지도에는 풀포기·잔돌이 없다 — 범위 가장자리(아래·왼쪽·오른쪽) 260 단위 안에서 차츰 성겨져 띠에 닿기 전에 그친다
// (띠에서 한꺼번에 옅어져 '여기까지'처럼 끊겨 보이지 않게)
const edgeKeep = (x, y) => clamp((Math.min(x, y + 400, 1444 - x, 1000 - y) - 60) / 200, 0, 1)
{
  const rand = rng('tufts')
  let d = ''
  let dOff = ''
  const centres = [
    [470, 560], [604, 604], [536, 712], [392, 648], [292, 572], [728, 650], [852, 598], [646, 828], [446, 806], [842, 846],
    [760, 930], [300, 760], [984, 470], [862, 470], [1118, 440], [1196, 560], [552, 384], [820, 416], [210, 640], [1000, 900],
    [1150, 880], [940, 370], [1060, 380], [180, 470], [380, 930],
    // 남쪽 트인 땅 — 풀이 번진 자리 몇 군데 더 ('spread rapidly'), 그래도 드물게 ('plant life is sporadic')
    [150, 560], [520, 860], [700, 880], [420, 720], [910, 720], [1010, 800], [190, 760], [560, 640],
  ]
  for (const [cx, cy] of centres) {
    const n = 2 + Math.floor(rand() * 4)
    for (let k = 0; k < n; k++) {
      const x = cx + (rand() - 0.5) * 60
      const y = cy + (rand() - 0.5) * 28
      const keep = rand() < edgeKeep(x, y)
      const s = 6.5 + rand() * 4
      if (!keep || !openGround(x, y, true)) continue
      if (inKeepOut(x, y)) dOff += tuft([x, y], s)
      else d += tuft([x, y], s)
    }
  }
  parts.push(P('sea-ink', d), { cls: 'sea-ink', d: dOff, phase: false })
  // 잔돌 — 작은 타원 몇 개씩
  let peb = ''
  for (const [cx, cy] of [[520, 470], [680, 700], [340, 860], [900, 520], [560, 900], [1180, 470], [800, 760], [250, 700]]) {
    for (let k = 0; k < 7; k++) {
      const x = cx + (rand() - 0.5) * 60
      const y = cy + (rand() - 0.5) * 24
      if (openGround(x, y) && rand() < edgeKeep(x, y)) peb += ell(x, y, 1.6 + rand() * 1.2, 1 + rand() * 0.6)
    }
  }
  parts.push(P('hatch', peb))
}
for (const [x, y, sz, n, seed] of [[452, 628, 6, 3, 'r1'], [770, 770, 5, 2, 'r2'], [292, 700, 5, 3, 'r3'], [1010, 476, 5, 2, 'r4'], [560, 966, 5, 2, 'r5'], [880, 900, 5, 3, 'r6'], [1160, 410, 4.5, 2, 'r7'], [620, 520, 4.5, 2, 'r8'], [360, 800, 5, 3, 'r9'], [700, 640, 5, 2, 'r10'], [960, 860, 4.5, 2, 'r11'], [520, 780, 4.5, 3, 'r12'], [200, 590, 4.5, 2, 'r13']]) {
  if (openGround(x, y) && edgeKeep(x, y) > 0.5) add(y, KIT.rocks(x, y, sz, n, seed))
}

parts.push(...stack(items))

// ---------------------------------------------------------------- 지형 기호
const withHoles = (outer, holes) => [...outer, outer[0], ...holes.flatMap((h) => [...h, h[0], outer[0]])]
const FIELD = {
  // 아쿰의 이빨 — 북동쪽 위 가장자리 (세계 지도의 이빨 골짜기 띠와 협곡·강 사이 산). Windblast Gorge·이빨 이름 자리는 비운다
  // (틀 밖으로 넉넉히 내민 부분은 그려지지 않는다 — 시작점이 칸 안에 떨어질 자리를 넓힌다)
  teethNE: { kind: 'mountain', points: [[1000, -320], [1700, -320], [1700, 60], [1444, 92], [1390, 120], [1330, 146], [1270, 164], [1200, 160], [1150, 140], [1146, 92], [1120, 24], [1000, 18]] },
  // 동쪽 가장자리의 산 (강 남쪽, 용암 들판 북쪽)
  teethE: { kind: 'mountain', points: [[1340, 262], [1444, 240], [1700, 240], [1700, 548], [1340, 548], [1318, 420], [1322, 320]], density: 0.8 },
  // 협곡 북서쪽 기슭 — 위 가장자리
  gorgeNW: { kind: 'hill', points: [[700, -320], [930, -320], [905, 6], [872, 34], [830, 44], [796, 26], [790, -10]] },
  // 산기슭이라 할 만한 언덕 — 마을을 북서·서·남에서 감싼다. 마을과 굴 둔덕 자리는 구멍으로 비운다
  foothills: { kind: 'hill', points: withHoles(
    [[372, 340], [384, 250], [440, 196], [510, 146], [596, 104], [690, 86], [742, 100], [722, 130], [740, 230], [760, 320], [800, 372], [770, 412], [640, 420], [500, 414], [404, 392]],
    [[[384, 232], [500, 232], [500, 126], [740, 126], [746, 262], [776, 300], [776, 356], [500, 356], [500, 318], [384, 318]]],
  ), density: 0.75 },
  // 협곡과 강 사이 이빨 기슭
  // (이빨 이름 자리 — 오른쪽 위 — 는 비운다)
  foothillsE: { kind: 'hill', points: [[836, 224], [900, 178], [956, 152], [962, 256], [1150, 262], [1172, 270], [1100, 298], [1000, 324], [900, 336], [836, 302]], density: 0.7 },
}
// 가시지대 결정 들판 — 세계 지도 akoum-spikefields(결정, 밀도 0.75) 고리의 남쪽 가장자리를 따르되, 마을 둘레 100 단위, 굴 둔덕,
// Spire Barrage 그림 자리는 들여 비운다 (세계 지도도 마을 표시·이름 둘레에는 첨탑을 세우지 않는다). 위·왼쪽은 틀 밖으로 넉넉히
const SPIKE_RING = [[901.9,-339.9],[869.2,-157.1],[773.4,13.3],[620.9,159.6],[422.1,271.9],[190.6,342.5],[-57.8,366.6],[-306.1,342.5],[-537.6,271.9],[-736.4,159.6],[-888.9,13.3],[-984.8,-157.1],[-1017.5,-339.9],[-984.8,-522.7],[-888.9,-693.1],[-736.4,-839.4],[-537.6,-951.7],[-306.1,-1022.3],[-57.8,-1046.3],[190.6,-1022.3],[422.1,-951.7],[620.9,-839.4],[773.4,-693.1],[869.2,-522.7]]
/** 고리의 x 에서의 가장 남쪽 y */
function ringBottom(ring, x) {
  let best = -Infinity
  for (let i = 0; i < ring.length; i++) {
    const [ax, ay] = ring[i]
    const [bx, by] = ring[(i + 1) % ring.length]
    if ((x - ax) * (x - bx) > 0 || ax === bx) continue
    best = Math.max(best, ay + ((by - ay) * (x - ax)) / (bx - ax))
  }
  return best
}
const spikeField = (spire) => {
  const south = []
  for (let x = -260; x <= 880; x += 12) {
    let y = ringBottom(SPIKE_RING, x)
    // 마을 둘레
    const dx = Math.max(TOWN_BOX[0] - x, 0, x - TOWN_BOX[2])
    if (dx < 100) y = Math.min(y, TOWN_BOX[1] - Math.sqrt(100 * 100 - dx * dx))
    // 굴 둔덕
    if (Math.abs(x - CAVE[0]) < 110) y = Math.min(y, CAVE[1] - Math.sqrt(110 * 110 - (x - CAVE[0]) ** 2) / 1.4)
    // Spire Barrage (페이즈1 에서만 비운다)
    if (spire && x > 214 && x < 434) y = Math.min(y, 200 + 125 * (1 - Math.sin((Math.PI * (x - 214)) / 220)))
    south.push([x, r1(y)])
  }
  const last = south[south.length - 1]
  return [[-260, -360], [last[0], -360], ...south.reverse()]
}
// 가시지대 협곡 자리 — 첨탑 꼭대기가 협곡에 걸리지 않게 남쪽을 더 넓게
const CHASM_HOLE = (() => {
  const c = dense(CHASM, false, 6)
  return [...offset(c, -60), ...offset(c, 96).reverse()].map(([x, y]) => [r1(x), r1(y)])
})()
/** 산 칸 안의 작은 수정 자리 — 세계 지도는 아쿰 기복의 산 30% 쯤을 수정 첨탑(작은 무리)으로 그린다 (이빨 골짜기 영역은 산만) */
function crystalSpots(ring, seed, ok) {
  const rand = rng(seed)
  const xs = ring.map((p) => p[0])
  const ys = ring.map((p) => p[1])
  const blob = (cx, cy, r) => Array.from({ length: 9 }, (_, i) => [r1(cx + Math.cos((i / 9) * Math.PI * 2) * r), r1(cy + Math.sin((i / 9) * Math.PI * 2) * r * 0.86)])
  const out = []
  for (let y = Math.min(...ys) + 30; y < Math.max(...ys) - 20; y += 92) {
    for (let x = Math.min(...xs) + 30; x < Math.max(...xs) - 20; x += 100) {
      const cx = x + (rand() - 0.5) * 60
      const cy = y + (rand() - 0.5) * 50
      const r = 17 + rand() * 5
      if (rand() < 0.2 || !ok(cx, cy)) continue
      if (!blob(cx, cy, r + 8).every(([px, py]) => inPoly(px, py, ring))) continue
      if (out.some((o) => Math.hypot(o[0] - cx, o[1] - cy) < o[2] + r + 26)) continue
      out.push([cx, cy, r])
    }
  }
  return out.map(([cx, cy, r]) => blob(cx, cy, r))
}
// Spire Barrage 그림 자리는 페이즈1 에서만 비우고, 페이즈1 을 끄면 그 자리도 첨탑으로 채운다
FIELD.spikefields = { kind: 'crystal', points: withHoles(spikeField(true), [CHASM_HOLE]), density: 0.75, phase: true }
FIELD.spikefieldsOff = { kind: 'crystal', points: withHoles(spikeField(false), [CHASM_HOLE]), density: 0.75, phase: false }
// 용암 들판 — 세계 지도 akoum-lava-field 고리 그대로
FIELD.lava = { kind: 'lava', points: [[1341.8,606.5],[1421.8,566.5],[1501.8,566.5],[1595.1,579.8],[1675,566.5],[1768.3,539.8],[1861.6,526.5],[1941.6,553.2],[2034.9,593.2],[2101.6,646.5],[2154.9,713.1],[2194.9,779.8],[2181.6,846.4],[2141.6,913.1],[2128.2,979.7],[2168.2,1046.3],[2154.9,1113],[2088.2,1179.6],[2021.6,1193],[1928.3,1166.3],[1848.3,1179.6],[1755,1219.6],[1675,1233],[1581.7,1193],[1515.1,1153],[1475.1,1073],[1421.8,1019.7],[1355.1,966.4],[1315.2,899.7],[1275.2,819.7],[1275.2,739.8],[1288.5,659.8]] }
{
  // 이빨 칸의 수정 자리 — 이빨 골짜기 영역(위 가장자리 북쪽) 밖, 이빨 이름 자리 밖
  const okE = (x, y) => y > 60 && !inBox([980, 150, 1270, 250], x, y, 30)
  const spotsE = crystalSpots(FIELD.teethE.points, 'cs-e', okE)
  const spotsNE = crystalSpots(FIELD.teethNE.points, 'cs-ne', okE)
  FIELD.teethE = { ...FIELD.teethE, points: withHoles(FIELD.teethE.points, spotsE) }
  FIELD.teethNE = { ...FIELD.teethNE, points: withHoles(FIELD.teethNE.points, spotsNE) }
  ;[...spotsE, ...spotsNE].forEach((points, i) => {
    FIELD[`crystal${i}`] = { kind: 'crystal', points, density: 0.5 }
  })
}
// 앱(childTerrain.ts)은 칸의 차례(번호)로 기호의 씨앗을 정하고 시작점을 기호 간격×5 칸마다 한 번만 던진다 — 좁은 칸은 차례에 따라
// 통째로 빌 수 있어, 모든 칸이 차는 차례를 골랐다 (틀 가장자리에 닿는 칸은 틀 밖으로 넉넉히 내밀었다). 칸 모양을 고치면 다시 고른다
const FIELD_ORDER = ['gorgeNW', 'teethNE', 'teethE', 'foothillsE', 'foothills', 'spikefields', 'spikefieldsOff', 'lava', ...Object.keys(FIELD).filter((k) => k.startsWith('crystal'))]

/** 바로 이웃한 같은 칠은 한 path 로 — 칠하는 차례는 그대로 */
function compact(list) {
  const out = []
  for (const p of list) {
    const last = out[out.length - 1]
    if (last && last.cls === p.cls && last.phase === p.phase && last.phase2 === p.phase2) last.d += p.d
    else out.push({ cls: p.cls, d: p.d, ...(p.phase === undefined ? {} : { phase: p.phase }), ...(p.phase2 === undefined ? {} : { phase2: p.phase2 }) })
  }
  return out
}

CHILDMAPS.push({
  id: 'affa',
  size: [1444, 1000],
  glyphScale: 4,
  terrain: FIELD_ORDER.map((k) => FIELD[k]),
  parts: compact(parts),
  labels: [
    { text: 'Spikefields', textKo: '가시지대', at: [525, 82], size: 30, kind: 'area' },
    { text: 'Teeth of Akoum', textKo: '아쿰의 이빨', at: [1120, 204], size: 32, kind: 'area' },
  ],
  // 페이즈2(WWK) 대상의 빈터 — 페이즈2 에서만 이 안에 밑동이 떨어지는 지형 기호를 뺀다 (STYLE.md)
  clearings: [
    { points: [[908, 761], [906, 808], [889, 839], [861, 857], [816, 865], [774, 852], [748, 834], [729, 807], [720, 761], [724, 712], [749, 688], [773, 665], [816, 665], [862, 662], [888, 684], [899, 717]], phase2: true }, // cunning-sparkmage
    { points: [[955, 299], [952, 346], [937, 374], [916, 394], [880, 397], [843, 396], [821, 376], [811, 344], [804, 299], [810, 254], [820, 220], [847, 211], [880, 195], [913, 211], [935, 228], [947, 256]], phase2: true }, // bazaar-trader
  ],
  subjects: {
    // 페이즈2 — 아파 남쪽 맨땅, 손끝에서 불꽃을 튀기는 인간 주술사 (이 지도의 추정)
    'cunning-sparkmage': { at: [800, 790], size: 108 },
    // 페이즈2 — 마을 남동쪽 바자 노점 동쪽, 강이 그치는 곳 너머 북쪽 둑 — 노점과 마을 쪽(서쪽)을 보고 무덤 지도와 물약을 권하는 고블린 행상
    'bazaar-trader': { at: [889, 329], size: 106 },
    // 마을 바로 남쪽 맨땅 — 서쪽(가시지대와 폐허 쪽)을 보고 선다
    'goblin-guide': { at: [706, 512], size: 104 },
    // 마을 서쪽, 가시지대 가장자리 남쪽 맨땅 — 뒤집어 서쪽으로(마을 반대쪽으로) 던진다
    'goblin-ruinblaster': { at: [368, 478], size: 110, flip: true },
    // Windblast Gorge 어귀 안, 마을에서 오르는 길 위의 디딤판 — 드레이크 둘이 협곡 바닥 위를 돈다
    'lethargy-trap': { at: [836, 171], size: 92 },
    // 강 남쪽, 이빨 기슭의 트인 들판 — 길에서 벗어난 바위 둔덕 위에서 서쪽(마을 쪽)으로 손짓한다
    'goblin-shortcutter': { at: [977, 492], size: 100 },
    // 초화산 분화구 남동쪽, 용암 들판 서쪽 가장자리의 굴 — 몸이 용암 쪽으로 휜다
    'plated-geopede': { at: [1292, 905], size: 120 },
    // 가시지대 남쪽 끝 — 결정 첨탑이 부러져 쏟아지는 자리 (둘레의 지도 첨탑 무리는 비웠다)
    'spire-barrage': { at: [324, 306], size: 85 },
    // 마을 남쪽 트인 들판 — 뒤집어 서쪽으로(마을 반대쪽으로) 던진다
    'torch-slinger': { at: [548, 655], size: 96, flip: true },
  },
  markAnchors: { affa: 'right', 'windblast-gorge': 'right' },
  focus: [512, 440],
})
