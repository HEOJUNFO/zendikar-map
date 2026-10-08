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

// ---------------------------------------------------------------- 세계 지도에서 온 자리 (context.mjs, 자식 좌표)
// 앱이 찍는 표시: 아파 (662,247) — 마을 가운데 마당, Windblast Gorge (955,60) — 협곡 바닥
/** Windblast Gorge (akoum-windblast-gorge, 너비 80) — 어귀(아파 북동쪽)에서 북동쪽으로 오른다. 위 끝은 Eye of Ugin 지도로 이어진다 */
const GORGE = [[755, 207], [822, 153], [889, 113], [942, 47], [982, -33], [1008, -84]]
const GORGE_HALF = 40
/** 이빨에서 아파로 흐르는 강 (akoum-affa-river) — 동쪽 끝(1444,127)으로 들어와 아파 남동쪽 가장자리(세계 끝 715,287 의 1.5 세계 단위 앞)에서 그친다 */
const RIVER = [[1542, 73], [1395, 153], [1262, 247], [1102, 327], [942, 380], [809, 353], [730, 297]]
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

/** 결정 첨탑 무리 — 세계 지도 가시지대의 수정 첨탑 기호를 기호 배율(×4)로 (Eye of Ugin·Tal Terig 지도와 같은 손) */
function crystalTuft(x, y, seed, k = 1) {
  const rand = rng(seed)
  const G = 4 * k
  const n = 3 + Math.floor(rand() * 3)
  const mid = (n - 1) / 2
  const spires = Array.from({ length: n }, (_, i) => {
    const ox = (i - mid) * (2 + rand() * 0.8) * G
    const hh = (6 + rand() * 6) * G * (1 - Math.abs(i - mid) * 0.22)
    return { ox, hh, lean: ox * 0.16 + (rand() - 0.5) * 0.8 * G, bw: (0.9 + rand() * 0.6) * G }
  }).sort((a, b) => b.hh - a.hh)
  const out = []
  for (const s of spires) {
    const bx = x + s.ox
    const tip = [bx + s.lean, y - s.hh]
    const pr = [bx + s.bw * 0.85 + s.lean * 0.7, y - s.hh * 0.7]
    const shape = poly([[bx - s.bw, y], [bx - s.bw * 0.85 + s.lean * 0.7, y - s.hh * 0.74], tip, pr, [bx + s.bw, y]])
    const face = poly([[bx + s.bw * 0.15, y], tip, pr, [bx + s.bw, y]])
    out.push(P('fill', shape), P('sea', face), P('hatch', line([tip, [bx + s.bw * 0.15, y]])), P('ink', shape))
  }
  return out
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
  const c = dense(GORGE, false, 8)
  const rand = rng('gorge')
  const jag = () => (rand() - 0.5) * 3
  // 어귀(처음 12%)는 조금 넓어지며 열린다
  const half = c.map((_, i) => {
    const t = i / (c.length - 1)
    return GORGE_HALF * (t < 0.12 ? 1 + (0.12 - t) * 0.9 : 1) + (rand() - 0.5) * 4
  })
  const at = (t) => half[Math.round(t * (c.length - 1))]
  const L = offset(c, at).map(([x, y]) => [x + jag(), y + jag()])
  const R = offset(c, (t) => -at(t)).map(([x, y]) => [x + jag(), y + jag()])
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
  const stones = [0.36, 0.52, 0.68, 0.84].flatMap((t, k) => {
    const [x, y] = c[Math.round(t * (c.length - 1))]
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

/** 용암 들판 — 세계 지도처럼 흐름을 따라 굽이치는 짧은 획과 갈라진 Y 자 금. 바탕은 그늘 칠, 군데군데 불빛 틈 */
function lavaField() {
  const ring = dense(LAVA, false, 6)
  const ringC = [...ring, [1470, 1030], [1470, 560]]
  const inside = (x, y) => inPoly(x, y, ringC)
  const rand = rng('lava')
  let flow = ''
  let seams = ''
  const pts = []
  for (let tries = 0; tries < 900 && pts.length < 60; tries++) {
    const x = 1270 + rand() * 180
    const y = 560 + rand() * 450
    if (!inside(x, y) || distTo(ring, [x, y]) < 10) continue
    if (pts.some(([px, py]) => Math.hypot(px - x, py - y) < 32)) continue
    pts.push([x, y])
  }
  for (const [x, y] of pts) {
    const a = 1.9 + Math.sin(y * 0.012 + x * 0.004) * 0.6
    const len = (3.2 + rand() * 2.6) * 4
    const c = Math.cos(a)
    const s = Math.sin(a)
    const bend = (0.9 + rand() * 0.6) * 4
    const p0 = [x - c * len, y - s * len]
    const p1 = [x - c * len * 0.5 - s * bend, y - s * len * 0.5 + c * bend]
    const p3 = [x + c * len, y + s * len]
    flow += `M${pt(p0)}Q${pt(p1)} ${pt([x, y])}T${pt(p3)}`
    // 몇 곳은 흐름 가운데가 벌어져 불빛이 비친다
    if (rand() < 0.3) {
      const q0 = [x - c * len * 0.55, y - s * len * 0.55]
      const q1 = [x + c * len * 0.5, y + s * len * 0.5]
      const w = 2 + rand() * 1.4
      seams += poly([q0, [x - s * w, y + c * w], q1, [x + s * w * 0.6, y - c * w * 0.6]])
    }
    if (rand() < 0.35) {
      const cx = x - s * (3 + rand() * 1.5) * 4
      const cy = y + c * (3 + rand() * 1.5) * 4
      const r0 = rand() * Math.PI * 2
      for (let k = 0; k < 3; k++) {
        const t = r0 + (k * Math.PI * 2) / 3 + (rand() - 0.5) * 0.6
        const l = (1.1 + rand() * 1.1) * 4
        flow += line([[cx, cy], [cx + Math.cos(t) * l, cy + Math.sin(t) * l]])
      }
    }
  }
  // 들판 전체의 옅은 불빛 — 점찍기 (세계 지도의 옅은 불빛 칠). 가장자리로 갈수록 성기다
  const dots = stipple(1262, 560, 1450, 1004, 8, 1.05, (px, py) => (inside(px, py) ? 0.24 + 0.4 * clamp(distTo(ring, [px, py]) / 60, 0, 1) : 0), 'lava-dots')
  return [P('shade', smooth(LAVA) + 'L1470 1030L1470 560Z'), P('fire', dots + seams), P('fire-ink', flow)]
}

// ---------------------------------------------------------------- 그림 모으기
const parts = []
// 1. 땅바닥에 낮게 깔리는 것 — 용암 들판, 가시지대 협곡, 강, Windblast Gorge, 분화구
parts.push(...lavaField())
{
  // Plated Geopede 그림의 용암 자락(그림 오른쪽 끝이 곧게 잘린다)을 들판 안쪽에서 흘러드는 열린 용암 줄기로 잇는다 —
  // 땅지네가 볕을 쬐는 굴 앞 용암이 동쪽 들판으로 이어져, 그림의 자락이 들판 위에 떨어진 조각으로 보이지 않게 한다
  const [gx, gy] = [1292, 905] // 땅지네 자리 (subjects 와 같게)
  const k = 1.2 // 그림 단위 → 자식 단위 (크기 120 / viewBox 너비 100)
  const fx = (u) => gx + (u - 39) * k
  const fy = (v) => gy + (v - 69.4) * k
  const xe = fx(102)
  const x0 = xe - 1.5
  // 둥근 혀 모양 — 위아래로 조금씩 부풀었다 오므라들고, 끝은 둥글게 (곧은 띠로 보이지 않게)
  const rim = [[x0, fy(63.4)], [xe + 8, fy(62.6)], [xe + 18, fy(63.6)], [xe + 27, fy(65.8)], [xe + 32, fy(71.4)], [xe + 30, fy(78)], [xe + 22, fy(83)], [xe + 11, fy(84.8)], [x0, fy(84)]]
  const body = smooth(rim) + 'Z'
  const crust = [[xe + 15, fy(73.6), 3.6]]
    .map(([x, y, s]) => poly([[x - s, y], [x - s * 0.1, y - s * 0.55], [x + s, y - s * 0.1], [x + s * 0.2, y + s * 0.55]]))
    .join('')
  const flow =
    smooth([[x0 + 3, fy(67.4)], [x0 + 12, fy(66.6)], [x0 + 24, fy(68.4)]]) +
    smooth([[x0 + 4, fy(79.8)], [x0 + 14, fy(79)], [x0 + 24, fy(80.4)]])
  parts.push(P('fill', body), P('fire', body), P('stone', crust), P('fire-ink', flow), P('ink', smooth(rim) + crust))
}
parts.push(...chasm())
{
  // 세계 지도의 물길 안에서 살짝 굽이치게. 동쪽 끝(너비 15)은 Eye of Ugin 지도의 끝 너비와 같고, 아래로 18 까지 넓어지다가
  // 마을 남동쪽 가장자리, 바자 노점 곁에서 가늘어지며 그친다 (못·물웅덩이·건물 없이 — 'drain away beneath the surface')
  const course = offset(dense(RIVER, false, 10), (t) => 5 * Math.sin(t * Math.PI * 6.4 + 0.4) * (1 - clamp((t - 0.88) / 0.12, 0, 1)))
  const W = (t) => (t < 0.85 ? 15 + (3 * t) / 0.85 : 18 - 12.5 * ((t - 0.85) / 0.15) ** 1.6)
  const left = offset(course, (t) => W(t) / 2)
  const right = offset(course, (t) => -W(t) / 2)
  const [ex, ey] = course[course.length - 1]
  const [px, py] = course[course.length - 2]
  const ul = Math.hypot(ex - px, ey - py) || 1
  const tip = [ex + ((ex - px) / ul) * 4.5, ey + ((ey - py) / ul) * 4.5]
  const re = right[right.length - 1]
  const cap = `Q${pt(tip)} ${pt(re)}`
  const body = smooth(left) + cap + 'L' + smooth([...right].reverse()).slice(1) + 'Z'
  parts.push(P('sea', body), P('sea-ink', smooth(left) + cap + smooth(right)))
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
const CRYS = []
{
  const rand = rng('spike-seeds')
  for (let tries = 0; tries < 1500 && CRYS.length < 46; tries++) {
    const x = 4 + rand() * 790
    const y = 18 + rand() * 360
    const e = spikeE(x, y)
    if (e > 0.985) continue
    if (nearTown(x, y) < 110) continue
    if (distTo(CHASM, [x, y]) < 64 || distTo(CHASM, [x, y - 42]) < 56) continue
    if (inBox(SPIKE_LABEL, x, y, 26) || (y > SPIKE_LABEL[1] - 4 && y < SPIKE_LABEL[3] + 46 && x > SPIKE_LABEL[0] - 26 && x < SPIKE_LABEL[2] + 26)) continue
    if (distTo(GORGE, [x, y]) < 66) continue
    if (Math.hypot(x - CAVE[0], (y - CAVE[1]) * 1.4) < 110) continue
    // 가장자리 쪽은 성기게
    const rim = clamp((e - 0.7) / 0.3, 0, 1)
    const minD = 52 + rim * 30
    if (CRYS.some(([cx, cy]) => Math.hypot((x - cx) * 1.1, y - cy) < minD)) continue
    CRYS.push([x, y, 0.95 - rim * 0.28 + rand() * 0.25])
  }
}
// Spire Barrage 그림 자리 — 그 그림이 제 결정 첨탑(부러져 쏟아지는 가시)을 그리므로, 그 둘레의 지도 첨탑 무리는 비운다
const SPIRE_BOX = [274, 220, 374, 348]
for (let i = CRYS.length - 1; i >= 0; i--) {
  const [x, y] = CRYS[i]
  if (x > SPIRE_BOX[0] - 30 && x < SPIRE_BOX[2] + 30 && y > SPIRE_BOX[1] && y < SPIRE_BOX[3] + 50) CRYS.splice(i, 1)
}
CRYS.forEach(([x, y, k], i) => add(y, crystalTuft(x, y, `ct${i}`, k)))
{
  const g = rng('glints')
  let d = ''
  let n = 0
  for (let k = 0; k < 120 && n < 9; k++) {
    const x = 20 + g() * 600
    const y = 20 + g() * 260
    if (spikeE(x, y) > 0.9 || nearTown(x, y) < 110 || inBox(SPIKE_LABEL, x, y, 20) || inBox(SPIRE_BOX, x, y, 16) || distTo(CHASM, [x, y]) < 46) continue
    if (CRYS.some(([cx, cy, ck]) => Math.abs(x - cx) < 26 * ck && y > cy - 52 * ck && y < cy + 6)) continue
    d += glint([x, y], 2.6 + g() * 1.6)
    n++
  }
  add(1001, [P('hatch', d)])
}
// 세계 지도의 동쪽 가장자리 수정 첨탑 (아쿰 기복의 결정 30%)
for (const [x, y, k, seed] of [[1262, 384, 0.85, 'e1'], [1170, 352, 0.7, 'e2']]) add(y, crystalTuft(x, y, seed, k))

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
const openGround = (x, y) =>
  !KEEP_OUT.some((b) => inBox(b, x, y, 10)) &&
  Math.hypot((x - CAL.x) / (CAL.RX + 30), (y - CAL.y) / (CAL.RY + 24)) > 1 &&
  !inPoly(x, y, [...dense(LAVA, false, 4), [1470, 1030], [1470, 560]]) &&
  distTo(RIVER, [x, y]) > 24 &&
  nearTown(x, y) > 40 &&
  spikeE(x, y) > 1.02
{
  const rand = rng('tufts')
  let d = ''
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
      if (openGround(x, y)) d += tuft([x, y], 6.5 + rand() * 4)
    }
  }
  parts.push(P('sea-ink', d))
  // 잔돌 — 작은 타원 몇 개씩
  let peb = ''
  for (const [cx, cy] of [[520, 470], [680, 700], [340, 860], [900, 520], [560, 900], [1180, 470], [800, 760], [250, 700]]) {
    for (let k = 0; k < 7; k++) {
      const x = cx + (rand() - 0.5) * 60
      const y = cy + (rand() - 0.5) * 24
      if (openGround(x, y)) peb += ell(x, y, 1.6 + rand() * 1.2, 1 + rand() * 0.6)
    }
  }
  parts.push(P('hatch', peb))
}
for (const [x, y, sz, n, seed] of [[452, 628, 6, 3, 'r1'], [770, 770, 5, 2, 'r2'], [292, 700, 5, 3, 'r3'], [1010, 476, 5, 2, 'r4'], [560, 966, 5, 2, 'r5'], [880, 900, 5, 3, 'r6'], [1160, 410, 4.5, 2, 'r7'], [620, 520, 4.5, 2, 'r8'], [360, 800, 5, 3, 'r9'], [700, 640, 5, 2, 'r10'], [960, 860, 4.5, 2, 'r11'], [520, 780, 4.5, 3, 'r12'], [200, 590, 4.5, 2, 'r13']]) {
  if (openGround(x, y)) add(y, KIT.rocks(x, y, sz, n, seed))
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
// 앱(childTerrain.ts)은 칸의 차례(번호)로 기호의 씨앗을 정하고 시작점을 기호 간격×5 칸마다 한 번만 던진다 — 좁은 칸은 차례에 따라
// 통째로 빌 수 있어, 모든 칸이 차는 차례를 골랐다 (틀 가장자리에 닿는 칸은 틀 밖으로 넉넉히 내밀었다). 칸 모양을 고치면 다시 고른다
const FIELD_ORDER = ['gorgeNW', 'teethNE', 'teethE', 'foothillsE', 'foothills']

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
  id: 'affa',
  size: [1444, 1000],
  glyphScale: 4,
  terrain: FIELD_ORDER.map((k) => FIELD[k]),
  parts: compact(parts),
  labels: [
    { text: 'Spikefields', textKo: '가시지대', at: [525, 82], size: 30, kind: 'area' },
    { text: 'Teeth of Akoum', textKo: '아쿰의 이빨', at: [1120, 204], size: 32, kind: 'area' },
  ],
  subjects: {
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
