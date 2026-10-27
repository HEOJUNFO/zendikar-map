// Affa — 자식 지도 (아쿰의 이빨 기슭, 세계 범위 x 1790–1920 · y 430–555, ×11.11).
// 아파는 2016년 이후의 모습이 알려지지 않아, 마지막으로 그려진 모습 — 이빨 기슭 '산기슭이라 할 만한 땅'에 돌과 벽돌 건물이
// 작게 모인 마을(Journey to the Eye 1부 2009 웹코믹의 'Affa Town' 그림, The Art of Magic: Zendikar 2016) — 으로 조용히 둔다.
// 성벽·문·망루는 없고(그림에도 없다), 불탄 자국·폐허·엘드라지 흔적도 없다. 열린 꼭대기의 둥근 통 건물 셋과 가는 굴뚝 탑 둘,
// 좁은 골목과 먼지 이는 작은 마당은 그 그림을 따랐다. 마당 남쪽의 노점은 아파 바자(PG: Akoum 2010)의 암시일 뿐 이름은 없다.
// 해석(공식 자리·모양 없음): 건물 배치, 마을을 둘러싼 낮은 언덕, 서쪽 바위 둔덕의 굴 입구 하나(2015–16년 주민이 옮겨 간
// 지하 폐허의 암시 — 입구 자리는 공식 자료에 없다, 안의 헤드론은 그리지 않는다), 마을에서 협곡 어귀로 들어 바닥을 조금 오르는 희미한 길,
// 페이즈 그림 일곱의 자리 — 고블린 셋(길잡이·Goblin Ruinblaster·횃불 던지는 이)은 마을 남·서쪽 맨땅, 지름길잡이는 강 남쪽 들판의 바위 둔덕,
// Lethargy Trap 은 Windblast Gorge 어귀 안 길 위(드레이크가 맴도는 협곡), Spire Barrage 는 가시지대 남쪽 끝(그 자리의 첨탑 무리는 비웠다),
// Plated Geopede 는 분화구 남동쪽 용암 들판 가장자리의 굴(굴 앞에서 들판 안쪽으로 이어지는 짧은 열린 용암 혀도 이 지도의 그림).
// 어느 것도 그 자리에 있다는 공식 서술은 없다. 바자 노점 바로 앞(남쪽)에는 바자라는 지점과 이어지는 Bazaar Trader(페이즈2)가 서고,
// 근거가 아파 마을까지만 닿는 고블린 길잡이는 그 한 줄 아래 맨땅에 선다.
// 고마 파다 — 범위는 남쪽으로 늘려(y 520 → 555) 이 지도가 고른 고마 파다 대상단의 대표 자리(세계 표시 1828, 535 — 그 자리부터 추정)를
// 띠 안쪽에 담았다. 표시 둘레에 덮개 수레 넷이 서쪽으로 늘어선 짧은 행렬을 그린다('The City that Walks' — 튼튼한 수레 수백 대로 이루어진
// 거대한 대상단, PG: Akoum 2010·The Art of Magic: Zendikar 2016). 수레의 수·모양·늘어선 방향은 이 지도의 해석이고, 짐승·허르다는 그리지 않는다
// (사가1 의 Caravan Hurda 그림은 범위 남쪽 바깥의 세계 지도에 있다). 카드 이름으로 고마 파다에 매인 Hero of Goma Fada(사가2 페이즈1)는
// 표시 바로 북쪽에, 이 지도가 대상단의 치유사로 읽은 Serene Steward 는 그 서쪽에 선다. 늘린 띠의 세계 지도 그림(Soulsurge Elemental,
// Basilisk Collar·Sparkmage's Gambit, Deathless Behemoth)과 그 이름 자리는 비워 둔다.
// 세계 지도의 바탕 지형(src/data/landscape/akoum.ts)을 그대로 옮긴 것: 이빨에서 아파로 흐르는 강(akoum-affa-river, 아파 남동쪽
// 끝에서 그친다), Windblast Gorge 협곡(akoum-windblast-gorge — Eye of Ugin 지도의 아래 끝과 같은 손), 가시지대 결정 들판의 남동쪽
// 쐐기(akoum-spikefields)와 그 협곡의 동쪽 끝(akoum-spikefields-chasm), 초화산의 분화구(akoum-supervolcano), 하늘거주지 아래
// 용암 들판의 서쪽 끝(akoum-lava-field, 2020년). 강·분화구·용암 들판·언덕·굴·길에는 이름을 달지 않는다.
//
// 페이즈별 모습 — 가시지대의 협곡은 엘드라지가 지나간 뒤에 생겼다. The Art of Magic: The Gathering – Zendikar(2016):
// 'The passage of the Eldrazi, while devastating to the land, sometimes leads to important revelations. Layers of volcanic rock crumble
// away at the Eldrazi's touch' / 'In the midst of the Spike Fields, a string of ruined fortresses have been unearthed in what is now a chasm
// stretching for miles across the desiccated land.' 그래서 엘드라지 타이탄이 풀려나기 전인 사가1 페이즈1·2(ZEN·WWK, 2009–10)에는
// 협곡 동쪽 끝(chasm())을 그리지 않고({ phase: true, phase3: false } 에서 숨김 — 그 부분은 { phase: false } 한 벌과 { phase3: true } 한 벌),
// 그 자리(가시지대 수정 칸들이 비워 둔 CHASM_HOLE)를 둘레와 같은 밀도의 결정 들판으로 메운다(FIELD.chasmFill, 세계 지도 페이즈 바탕
// 'spikefields-chasm-fill' 과 같은 문·같은 종류). 협곡이 생기기 전 그 자리의 모습은 공식 자료에 없어, 결정 들판으로 메운 것은 이 지도의 해석이다. 협곡 속 요새 폐허(BFZ 무렵의
// 피난처 Stone Havens — 같은 절 원문 'who are turning these ruins into shelters for people fleeing the swarms of Eldrazi broods. The stoneforge mystics bind the walls of
// the ruined fortresses to hedrons'; Ghostly Sentinel, BFZ #28 'Mystics of the Stone Havens call upon the spirits of fallen heroes to defend the refuges.')는
// 이 지도에 그리지 않으며, 페이즈1·2 에는 아직 땅속에 묻혀 있었다. 무너진 때를 원문이 밝히지 않아 페이즈3(ROE, 타이탄이 아쿰에서 풀려난 2010년)과
// 사가2·끔은 지금 그림(협곡) 그대로다. 협곡 가까이의 반짝임(glint)은 결정 들판의 것이라 페이즈1·2 에도 그대로 둔다.

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
/** 가장자리 띠(짧은 변 125 의 12% = 15 지도 단위, 약 167 단위) 안에서 0 — 손 떨림을 띠에서 거둬 세계 지도의 선과 겹쳐 하나로 보이게 */
const W_ = 1444
const H_ = 1389
const inner = (x, y) => clamp((Math.min(x, y, W_ - x, H_ - y) - 167) / 90, 0, 1)

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
/** 가시지대 협곡의 동쪽 끝 (akoum-spikefields-chasm, 너비 80) — 결정 칸의 구멍(CHASM_HOLE)과 반짝임이 비키는 기준선 */
const CHASM = [[-140, -73], [-18, 7], [115, 33], [209, 127]]
/** 그 협곡의 두 단애 선 — 세계 지도(src/data/landscape/akoum.ts 의 akoum-spikefields-chasm, 너비 7.2)를 terrain.ts 의 gorge 와 같은 셈으로
 *  (chaikin 두 번, 2 단위로 다시 찍기, 양 끝은 너비의 1.5 배 길이에 걸쳐 너비의 0.3 까지 좁아짐) 자식 좌표로 옮긴 것.
 *  이 지도에 드는 동쪽 끝은 모두 위·왼쪽 가장자리 띠(15 지도 단위) 안이라, 띠에서 세계 지도의 협곡과 한 모양으로 겹쳐야 한다.
 *  floor: 바닥 칠의 두 변(세계 지도의 바닥 칠과 같은 점), rim: 단애 선(세계 지도의 단애처럼 그 변을 chaikin 두 번 더) */
const CHASM_SIDES = (() => {
  const course = [[1720, 441.4], [1730.8, 433], [1741.6, 435.4], [1752.4, 427], [1765.6, 429.4], [1777.6, 423.4], [1788.4, 430.6], [1800.4, 433], [1808.8, 441.4]]
  const width = 7.2
  const center = resampleLine(chaikinOpen(course, 2), 2)
  const nm = normalsOf(center)
  const total = (center.length - 1) * 2
  const taper = Math.max(4, width * 1.5)
  const half = center.map((_, i) => (width / 2) * (0.3 + 0.7 * Math.sin((Math.min(1, (i * 2) / taper, (total - i * 2) / taper) * Math.PI) / 2)))
  const left = center.map(([x, y], i) => [x - nm[i][0] * half[i], y - nm[i][1] * half[i]])
  const right = center.map(([x, y], i) => [x + nm[i][0] * half[i], y + nm[i][1] * half[i]])
  const S = 1444 / 130
  const art = ([x, y]) => [(x - 1790) * S, (y - 430) * S]
  // 틀 왼쪽으로 조금 나간 데(지도 x 1776)부터 — 그 너머는 세계 지도의 협곡
  const keep = (pts) => pts.filter(([x]) => x >= 1776).map(art)
  return { floor: [keep(left), keep(right)], rim: [keep(chaikinOpen(left, 2)), keep(chaikinOpen(right, 2))] }
})()
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
/** 덮개 수레 — 두 바퀴 위 짐칸과 둥근 천 덮개, 땅에 내려놓은 끌채 (고마 파다 대상단의 'sturdy wagons'). (x, y) 는 바퀴 밑 가운데,
 *  dir 은 끌채 쪽(-1 서쪽, 1 동쪽) */
function wagon(x, y, w, dir) {
  const r = w * 0.17
  const bedB = y - r * 0.9
  const bedT = bedB - w * 0.26
  const L = x - w / 2
  const R = x + w / 2
  const bed = poly([[L, bedT], [R, bedT], [R - 1, bedB], [L + 1, bedB]])
  // 덮개 — 짐칸 위 둥근 천 (3차 곡선, 꼭대기 높이 ch)
  const cw = w * 0.44
  const ch = w * 0.42
  const k = ch * 4 / 3
  const cov = (t) => {
    const u = 1 - t
    return [u * u * u * (x - cw) + 3 * u * u * t * (x - cw) + 3 * u * t * t * (x + cw) + t * t * t * (x + cw), bedT - 3 * u * t * (u + t) * k]
  }
  const arc = Array.from({ length: 13 }, (_, i) => cov(i / 12))
  const cover = poly(arc)
  // 해를 등진 오른쪽 그늘 — 덮개 오른쪽 셋째와 짐칸 오른쪽 끝
  const sh = arc.slice(8)
  const shade = poly([[sh[0][0], bedT], ...sh]) + poly([[R - w * 0.22, bedT], [R, bedT], [R - 1, bedB], [R - w * 0.22, bedB]])
  // 덮개 테 둘(세로 결)과 짐칸 널 결 한 줄
  let hatch = ''
  for (const t of [0.3, 0.62]) {
    const [hx, hy] = cov(t)
    hatch += line([[hx, bedT], [hx, hy + 0.6]])
  }
  hatch += line([[L + 1.5, (bedT + bedB) / 2], [R - 1.5, (bedT + bedB) / 2]])
  // 바퀴 둘 — 살 넷
  const wheels = [x - w * 0.3, x + w * 0.3]
  const rim = wheels.map((wx) => ell(wx, y - r, r, r)).join('')
  const spokes = wheels.map((wx) => line([[wx - r * 0.7, y - r - r * 0.7], [wx + r * 0.7, y - r + r * 0.7]]) + line([[wx - r * 0.7, y - r + r * 0.7], [wx + r * 0.7, y - r - r * 0.7]])).join('')
  // 끌채 — 짐칸 앞에서 땅으로
  const ex = dir < 0 ? L : R
  const tongue = line([[ex, bedB - 1], [ex + dir * w * 0.42, y - 0.5]])
  return [P('fill', cover + bed), P('fill', rim), P('shade', shade), P('hatch', hatch + spokes), P('ink', cover + bed + rim + tongue)]
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

/** 가시지대 협곡의 동쪽 끝 — 세계 지도의 띠처럼 그늘진 바닥, 양쪽 가장자리에 짧은 빗금. 모양은 세계 지도의 협곡 그대로(CHASM_SIDES) —
 *  끝으로 갈수록 좁아지고, 세계 지도의 바닥 칠이 곧게 그치는 좁은 끝(너비 약 24)을 작은 반원으로 닫는다
 *  (예전처럼 넓은 둥근 끝을 그리면 가장자리 띠에서 세계 지도의 좁아지는 끝과 두 겹으로 보인다) */
function chasm() {
  const [fl, fr] = CHASM_SIDES.floor
  const [L, R] = CHASM_SIDES.rim
  const cap = chasmCap()
  const rimPath = [...L, ...cap, ...[...R].reverse()]
  return [P('shade', poly([...fl, ...cap, ...[...fr].reverse()])), ...wallFace(rimPath, () => 14, { step: 8, side: -1, mode: 'hachure', seed: 'chasm', bold: false })]
}
/** 협곡 좁은 끝의 반원 — 왼쪽(북) 단애 끝에서 끝 너머로 돌아 오른쪽(남) 단애 끝까지 (양 끝 점은 빼고) */
function chasmCap() {
  const [L, R] = CHASM_SIDES.rim
  const a = L[L.length - 1]
  const b = R[R.length - 1]
  const [cx, cy] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const r = Math.hypot(a[0] - b[0], a[1] - b[1]) / 2
  const n = [(a[0] - b[0]) / (2 * r), (a[1] - b[1]) / (2 * r)]
  const u = [-n[1], n[0]]
  const out = []
  for (let k = 1; k < 8; k++) {
    const t = (k / 8) * Math.PI
    out.push([cx + r * (n[0] * Math.cos(t) + u[0] * Math.sin(t)), cy + r * (n[1] * Math.cos(t) + u[1] * Math.sin(t))])
  }
  return out
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
// Plated Geopede 그림의 용암 자락에 잇던 용암 혀는 뺐다 — 범위를 남쪽으로 늘리기 전에는 그림이 아래 가장자리 띠 안(밑 y 905)이라, 이 지도의 칠은
// 띠에서 옅어져 들판 위에 반투명한 조각으로만 남았다 (그림 자락의 곧은 끝은 그림 쪽 일이다)
// 가시지대 협곡은 엘드라지가 지나간 뒤 생겼다 — 사가1 페이즈1·2 에서만 숨긴다 (끔·페이즈3·사가2 에서 그린다: 한 AND 문으로 쓸 수 없어 같은 그림 두 벌)
{
  const c = chasm()
  parts.push(...c.map((q) => ({ ...q, phase: false })), ...c.map((q) => ({ ...q, phase3: true })))
}
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
// 사가2 페이즈1 커먼 Cliffside Lookout — 가시지대 협곡 남동쪽 끝 바로 동쪽 벼랑에 선 코르 척후 (그림 x 223–319 · y 98–198, 밑의 이름 y ≈ 198–234).
// 협곡 끝(209, 127)의 테두리에 몸이 걸리지 않게 그 동쪽에 둔다
const LOOKOUT = [276, 184]
const LOOKOUT_BOX = [206, 92, 340, 236]
// 사가2 페이즈2(OGW) 언커먼 — Stoneforge Acolyte(가시지대 협곡 동쪽 끝 남쪽 기슭의 코르 암석술사)와 Weapons Trainer(굴 둔덕 바로 아래 맨땅의 인간 교관)의
// 그림과 밑의 이름 자리, 그리고 커먼 Isolation Zone(마을 남쪽 맨땅의 헤드론 고리 상징, 그림 x 552–618 · y 427–468, 밑의 이름).
// 이 안의 반짝임·풀포기·잔돌은 사가2 페이즈2 에서만 뺀다 (phase5: false, rng 차례는 그대로)
const S5_BOXES = [[92, 132, 226, 284], [386, 322, 500, 470], [546, 420, 624, 500]]
const inS5 = (x, y) => S5_BOXES.some((b) => inBox(b, x, y, 6))
{
  const g = rng('glints')
  let d = ''
  let dP4 = ''
  let dP5 = ''
  let n = 0
  for (let k = 0; k < 400 && n < 6; k++) {
    const x = 20 + g() * 600
    const y = 20 + g() * 260
    // 가장자리 띠(약 120 단위) 밖에만 — 세계 지도에는 반짝임이 없어 띠에서 옅어지며 끊기지 않게
    if (x < 130 || y < 130) continue
    if (spikeE(x, y) > 0.9 || nearTown(x, y) < 110 || inBox(SPIKE_LABEL, x, y, 20) || inBox(SPIRE_BOX, x, y, 16) || distTo(CHASM, [x, y]) < 46) continue
    const gl = glint([x, y], 2.6 + g() * 1.6)
    // 사가2 페이즈1 커먼 Cliffside Lookout 의 그림과 밑의 이름 자리(LOOKOUT_BOX)에 떨어진 반짝임은 그 페이즈에서 뺀다 (g 차례는 그대로)
    if (inBox(LOOKOUT_BOX, x, y, 6)) dP4 += gl
    else if (inS5(x, y)) dP5 += gl
    else d += gl
    n++
  }
  add(1001, [P('hatch', d), { cls: 'hatch', d: dP4, phase4: false }, ...(dP5 ? [{ cls: 'hatch', d: dP5, phase5: false }] : [])])
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
// 고마 파다 대상단 — 세계 지도의 고마 파다 표시(422, 1166) 둘레에 서쪽으로 늘어선 덮개 수레 넷 (모양·수·방향은 이 지도의 해석).
// 표시는 맨 끝(동쪽) 수레 위에 놓이고, 표시 오른쪽의 이름 자리(x ≥ 430)는 비운다
const CARAVAN = [[408, 1182], [368, 1187], [328, 1193], [288, 1200]]
for (const [x, y] of CARAVAN) add(y, wagon(x, y, 30, -1))

// 3. 길 — 마을 북동쪽에서 협곡 어귀로 들어 바닥을 조금 오르는 희미한 길 하나 (해석, 이름 없음). Lethargy Trap 의 디딤판이 이 길 위에 놓인다
parts.push(...KIT.dashed([[712, 190], [734, 196], [756, 190], [776, 178], [798, 170], [818, 168], [838, 170], [864, 150], [886, 122], [904, 94]], 7, 6))

// 4. 맨땅 — 화산암 땅에 뿌리내린 은빛·푸른 풀포기 무리와 낮은 돌, 잔돌 (세계 지도처럼 마을 남쪽·서쪽은 트인 땅)
// 그림·이름·분화구·용암 들판·화면 단추 자리는 비운다
const GUIDE_BOX = [648, 495, 772, 645] // 고블린 길잡이와 이름 — Bazaar Trader(페이즈2)가 선 노점 앞 자리 남쪽
const KEEP_OUT = [
  [262, 390, 400, 520], // Goblin Ruinblaster 와 이름
  GUIDE_BOX,
  [486, 556, 604, 700], // 횃불 던지는 고블린과 이름
  [912, 400, 1040, 548], // 지름길잡이 고블린과 이름
  [1218, 820, 1372, 962], // 땅지네와 이름
  [0, 820, 240, 1000], // 확대 단추
]
const inKeepOut = (x, y) => KEEP_OUT.slice(0, 5).some((b) => inBox(b, x, y, 10))
// KEEP_OUT 앞 다섯 자리의 대상 (시점별 보기의 KIT.dodge)
const KEEP_IDS = ['goblin-ruinblaster', 'goblin-guide', 'torch-slinger', 'goblin-shortcutter', 'plated-geopede']
// 사가2 페이즈1 언커먼 그림 자리 — Akoum Stonewaker(그림 x 1103–1213 · y 403–487, 이름 y ≈ 494–510).
// 이 안의 풀포기·잔돌·돌은 사가2 페이즈1 에서만 뺀다 (phase4: false — rand 차례는 그대로라 다른 풀포기의 자리·모양은 같다)
// 사가2 페이즈1 커먼 그림 자리 — Belligerent Whiptail(그림 x 637–836 · y 775–841, 이름 y ≈ 841–875)와 Lavastep Raider(그림 x 807–896 · y 550–610, 이름 y ≈ 610–645)
// (Hero of Goma Fada·Serene Steward 는 남쪽으로 늘린 띠의 고마 파다 표시 곁에 선다 — 그 자리는 아래 SOUTH_KEEP_OUT 이 비운다)
const S2_BOXES = [[1094, 396, 1222, 516], [630, 768, 846, 882], [800, 544, 904, 648]]
const inS2 = (x, y) => S2_BOXES.some((b) => inBox(b, x, y, 6))
// 시점별 보기 — 이 세 사가2 페이즈1 대상은 모든 시점에 그 자리에 그려지므로(엘드라지가 깨어나기 전과 깨어남에도 이어 그린다) 그 자리의 풀포기·잔돌·돌은 시점별 보기에서도 뺀다 (KIT.dodge)
const S2_IDS = ['akoum-stonewaker', 'belligerent-whiptail', 'lavastep-raider']
const NO_P4 = (q) => ({ ...q, phase4: false })
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
const edgeKeep = (x, y) => clamp((Math.min(x, y + 400, W_ - x, H_ - y) - 60) / 200, 0, 1)
{
  const rand = rng('tufts')
  let d = ''
  let dOff = ''
  let dP4 = ''
  let dOffP4 = ''
  let dP5 = ''
  let dOffP5 = ''
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
      const hero = inS2(x, y)
      const s5 = inS5(x, y)
      if (inKeepOut(x, y)) { if (hero) dOffP4 += tuft([x, y], s); else if (s5) dOffP5 += tuft([x, y], s); else dOff += tuft([x, y], s) }
      else if (hero) dP4 += tuft([x, y], s)
      else if (s5) dP5 += tuft([x, y], s)
      else d += tuft([x, y], s)
    }
  }
  // 사가1 페이즈1 그림 자리(KEEP_OUT 앞 다섯)의 풀포기 — 시점별 보기에서는 그 대상들이 그 자리에 그려지는 시점마다 뺀다 (KIT.dodge)
  parts.push(P('sea-ink', d), ...KIT.dodge(KEEP_IDS, [{ cls: 'sea-ink', d: dOff, phase: false }]))
  if (dP4) parts.push(...KIT.dodge(S2_IDS, [NO_P4(P('sea-ink', dP4))]))
  if (dOffP4) parts.push({ cls: 'sea-ink', d: dOffP4, phase: false, phase4: false })
  if (dP5) parts.push({ cls: 'sea-ink', d: dP5, phase5: false })
  if (dOffP5) parts.push({ cls: 'sea-ink', d: dOffP5, phase: false, phase5: false })
  // 잔돌 — 작은 타원 몇 개씩
  let peb = ''
  let pebP4 = ''
  let pebP5 = ''
  for (const [cx, cy] of [[520, 470], [680, 700], [340, 860], [900, 520], [560, 900], [1180, 470], [800, 760], [250, 700]]) {
    for (let k = 0; k < 7; k++) {
      const x = cx + (rand() - 0.5) * 60
      const y = cy + (rand() - 0.5) * 24
      if (openGround(x, y) && rand() < edgeKeep(x, y)) {
        const e = ell(x, y, 1.6 + rand() * 1.2, 1 + rand() * 0.6)
        if (inS2(x, y)) pebP4 += e
        else if (inS5(x, y)) pebP5 += e
        else peb += e
      }
    }
  }
  parts.push(P('hatch', peb))
  if (pebP4) parts.push(...KIT.dodge(S2_IDS, [NO_P4(P('hatch', pebP4))]))
  if (pebP5) parts.push({ ...P('hatch', pebP5), phase5: false })
}
for (const [x, y, sz, n, seed] of [[452, 628, 6, 3, 'r1'], [770, 770, 5, 2, 'r2'], [292, 700, 5, 3, 'r3'], [1010, 476, 5, 2, 'r4'], [560, 966, 5, 2, 'r5'], [880, 900, 5, 3, 'r6'], [1160, 410, 4.5, 2, 'r7'], [620, 520, 4.5, 2, 'r8'], [360, 800, 5, 3, 'r9'], [700, 640, 5, 2, 'r10'], [960, 860, 4.5, 2, 'r11'], [520, 780, 4.5, 3, 'r12'], [200, 590, 4.5, 2, 'r13']]) {
  // 고블린 길잡이 자리(GUIDE_BOX)의 돌은 페이즈1 에서만 뺀다 — 페이즈를 끈 그림은 그대로
  if (inBox(GUIDE_BOX, x, y, 10)) {
    if (openGround(x, y, true) && edgeKeep(x, y) > 0.5) add(y, KIT.dodge('goblin-guide', KIT.rocks(x, y, sz, n, seed).map((q) => ({ ...q, phase: false }))))
    continue
  }
  if (openGround(x, y) && edgeKeep(x, y) > 0.5) add(y, inS2(x, y) ? KIT.dodge(S2_IDS, KIT.rocks(x, y, sz, n, seed).map(NO_P4)) : inS5(x, y) ? KIT.rocks(x, y, sz, n, seed).map((q) => ({ ...q, phase5: false })) : KIT.rocks(x, y, sz, n, seed))
}

// 남쪽으로 늘린 띠(y 1000 아래) — 고마 파다 둘레의 트인 땅에도 풀포기·잔돌을 드물게 (따로 씨앗 — 위의 풀포기·잔돌의 차례는 그대로).
// 수레 행렬·고마 파다 표시와 이름, 사가2 의 Hero of Goma Fada·Serene Steward, 세계 지도 그림(Soulsurge Elemental·Basilisk Collar·
// Sparkmage's Gambit·Deathless Behemoth)과 그 이름 자리는 비운다
const SOUTH_KEEP_OUT = [
  [252, 1146, 428, 1206], // 수레 행렬
  [410, 1150, 520, 1182], // 고마 파다 표시와 이름
  [250, 1000, 486, 1136], // Hero of Goma Fada·Serene Steward 와 이름
  [872, 1000, 1028, 1186], // Soulsurge Elemental 과 이름 (세계 지도 그림, 사가1 페이즈3)
  [404, 1316, 512, 1389], // Basilisk Collar·Sparkmage's Gambit (세계 지도 그림)
  [118, 1330, 354, 1389], // Deathless Behemoth (세계 지도 그림)
]
{
  const rand = rng('tufts-south')
  let d = ''
  for (const [cx, cy] of [[560, 1060], [640, 1150], [760, 1080], [1100, 1060], [1180, 1150], [1060, 1200], [200, 1060], [520, 1210], [860, 1230], [700, 1250], [240, 1240]]) {
    const n = 2 + Math.floor(rand() * 4)
    for (let k = 0; k < n; k++) {
      const x = cx + (rand() - 0.5) * 60
      const y = cy + (rand() - 0.5) * 28
      const keep = rand() < edgeKeep(x, y)
      const sz = 6.5 + rand() * 4
      if (keep && openGround(x, y, true) && !SOUTH_KEEP_OUT.some((b) => inBox(b, x, y, 8))) d += tuft([x, y], sz)
    }
  }
  parts.push(P('sea-ink', d))
  for (const [x, y, sz, n, seed] of [[620, 1120, 5, 2, 'r14'], [980, 1210, 4.5, 2, 'r15'], [250, 1180, 4.5, 3, 'r16'], [1150, 1090, 4.5, 2, 'r17']]) {
    if (openGround(x, y) && edgeKeep(x, y) > 0.5 && !SOUTH_KEEP_OUT.some((b) => inBox(b, x, y, 8))) add(y, KIT.rocks(x, y, sz, n, seed))
  }
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
// (시점별 보기는 늘 Spire Barrage 자리도 채운 칸 — 그 자리는 그 카드를 그리는 시점에만 카드에 매인 빈터 SPIRE_CLEAR 가 연다)
FIELD.spikefields = { kind: 'crystal', points: withHoles(spikeField(true), [CHASM_HOLE]), density: 0.75, phase: true, time: { t1: false, t2: false } }
FIELD.spikefieldsOff = { kind: 'crystal', points: withHoles(spikeField(false), [CHASM_HOLE]), density: 0.75, phase: false, time: { t1: true, t2: true } }
/** 시점별 보기 — spikeField(true) 가 Spire Barrage 자리로 들인 남쪽 가장자리 밑 (그 곡선에서 아래로) */
const SPIRE_CLEAR = (() => {
  const top = []
  for (let x = 214; x <= 434; x += 12) top.push([x, r1(200 + 125 * (1 - Math.sin((Math.PI * (x - 214)) / 220)))])
  return { points: [...top, [434, 400], [214, 400]], for: ['spire-barrage'], timeOnly: true }
})()
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
// 사가1 페이즈1·2 — 협곡이 아직 없던 때(엘드라지가 지나간 뒤 생김). 수정 칸들이 협곡 자리로 비운 CHASM_HOLE 을 같은 밀도의 결정 들판으로 메운다
// (세계 지도 페이즈 바탕 'spikefields-chasm-fill' 과 같은 문·같은 종류). 칸 차례의 맨 끝에 두어 앞 칸들의 씨앗은 그대로다
FIELD.chasmFill = { kind: 'crystal', points: CHASM_HOLE, density: 0.75, phase: true, phase3: false }
// 앱(childTerrain.ts)은 칸의 차례(번호)로 기호의 씨앗을 정하고 시작점을 기호 간격×5 칸마다 한 번만 던진다 — 좁은 칸은 차례에 따라
// 통째로 빌 수 있어, 모든 칸이 차는 차례를 골랐다 (틀 가장자리에 닿는 칸은 틀 밖으로 넉넉히 내밀었다). 칸 모양을 고치면 다시 고른다
const FIELD_ORDER = ['gorgeNW', 'teethNE', 'teethE', 'foothillsE', 'foothills', 'spikefields', 'spikefieldsOff', 'lava', ...Object.keys(FIELD).filter((k) => k.startsWith('crystal')), 'chasmFill']

/** 바로 이웃한 같은 칠은 한 path 로 — 칠하는 차례는 그대로 */
function compact(list) {
  const out = []
  for (const p of list) {
    const last = out[out.length - 1]
    const gates = ['phase', 'phase2', 'phase3', 'phase4', 'phase5']
    if (last && last.cls === p.cls && gates.every((g) => last[g] === p[g]) && KIT.sameTimeKeys(last, p)) last.d += p.d
    else out.push({ cls: p.cls, d: p.d, ...Object.fromEntries(gates.filter((g) => p[g] !== undefined).map((g) => [g, p[g]])), ...KIT.timeKeysOf(p) })
  }
  return out
}

CHILDMAPS.push({
  id: 'affa',
  size: [W_, H_],
  glyphScale: 4,
  terrain: FIELD_ORDER.map((k) => FIELD[k]),
  parts: compact(parts),
  labels: [
    { text: 'Spikefields', textKo: '가시지대', at: [525, 82], size: 30, kind: 'area' },
    { text: 'Teeth of Akoum', textKo: '아쿰의 이빨', at: [1120, 204], size: 32, kind: 'area' },
  ],
  // 페이즈2(WWK) 대상의 빈터 — 페이즈2 에서만 이 안에 밑동이 떨어지는 지형 기호를 뺀다 (STYLE.md)
  clearings: [
    // 사가3 페이즈1(ZNR) 커먼 대상의 빈터 (그림과 이름 자리)
    { points: [[1294.6, 760.1], [1397.2, 760.1], [1397.2, 871.1], [1469.4, 871.1], [1469.4, 932.2], [1222.5, 932.2], [1222.5, 871.1], [1294.6, 871.1]], phase6: true }, // nissas-zendikon (세계 지도 그림)
    { points: [[700,727],[812,727],[812,815],[825,815],[825,839],[687,839],[687,815],[700,815]], phase6: true }, // stonework-packbeast
    // 사가3 페이즈1(ZNR) 언커먼 대상의 빈터 (그림과 이름 자리)
    { points: [[541, 1171], [599, 1171], [599, 1217], [650, 1217], [650, 1258], [490, 1258], [490, 1217], [541, 1217]], phase6: true }, // canyon-jerboa
    { points: [[516,1058],[652,1058],[652,1189],[516,1189]], phase6: true }, // goma-fada-vanguard
    { points: [[1184,806],[1309,806],[1309,965],[1184,965]], phase6: true }, // skyclave-geopede
    { points: [[417, 699], [414, 733], [400, 754], [379, 768], [344, 774], [309, 767], [287, 754], [269, 735], [264, 699], [269, 663], [282, 639], [306, 626], [344, 625], [381, 625], [404, 641], [414, 666]], phase3: true }, // glory-seeker
    { points: [[580, 435], [582, 464], [568, 482], [546, 491], [514, 492], [483, 489], [463, 479], [452, 462], [449, 435], [452, 409], [464, 392], [481, 376], [514, 378], [546, 379], [568, 388], [581, 406]], phase3: true }, // affa-guard-hound
    { points: [[908, 761], [906, 808], [889, 839], [861, 857], [816, 865], [774, 852], [748, 834], [729, 807], [720, 761], [724, 712], [749, 688], [773, 665], [816, 665], [862, 662], [888, 684], [899, 717]], phase2: true }, // cunning-sparkmage
    // Bazaar Trader — 바자 노점 바로 남쪽, 앞줄 집 밑의 언덕 기호 띠 (그림 x 649–723 · y 344–450, 밑의 이름 — 첫 배율에서 x ≈ 650–740 · y ≈ 450–470)
    { points: [[640, 338], [744, 338], [750, 400], [752, 478], [640, 478], [636, 400]], phase2: true }, // bazaar-trader
    // 사가2 페이즈1(BFZ) 대상의 빈터 — 고마 파다 표시 곁 (Hero of Goma Fada 그림 x 369–473 · y 1011–1114, Serene Steward 그림 x 279–334 · y 1010–1110, 밑의 이름)
    { points: [[362, 1004], [482, 1004], [486, 1060], [486, 1136], [358, 1136], [358, 1060]], phase4: true }, // hero-of-goma-fada
    { points: [[270, 1002], [344, 1002], [352, 1060], [352, 1130], [250, 1130], [262, 1060]], phase4: true }, // serene-steward
    { points: [[1098, 398], [1218, 398], [1226, 460], [1210, 516], [1094, 516], [1092, 460]], phase4: true }, // akoum-stonewaker
    // 사가2 페이즈1(BFZ) 커먼 대상의 빈터 — 그림과 밑의 이름 자리 (Cliffside Lookout 은 사가2 에서 결정 첨탑이 차는 가시지대 남쪽 끝이라 첨탑을 비운다)
    { points: [[219, 86], [327, 86], [337, 150], [349, 196], [345, 236], [197, 236], [193, 196], [211, 150]], phase4: true }, // cliffside-lookout
    { points: [[630, 768], [846, 768], [852, 845], [820, 882], [652, 882], [626, 845]], phase4: true }, // belligerent-whiptail
    { points: [[800, 544], [904, 544], [910, 610], [922, 648], [782, 648], [792, 610]], phase4: true }, // lavastep-raider
    // 사가2 페이즈2(OGW) 언커먼 대상의 빈터 — 그림과 밑의 이름 자리 (Stoneforge Acolyte 는 사가2 에서 결정 첨탑이 차는 가시지대 남쪽 끝, Weapons Trainer 는 굴 둔덕 아래 언덕 기호 자리)
    { points: [[92, 132], [210, 132], [210, 236], [226, 236], [226, 284], [92, 284]], phase5: true }, // stoneforge-acolyte (그림 x 101–201 · y 143–229, 밑의 이름 — 첫 배율의 이름 끝과 그 밑에 서는 첨탑 밑동까지)
    { points: [[386, 322], [500, 322], [500, 470], [386, 470]], phase5: true }, // weapons-trainer (그림 x 393–492 · y 329–434, 밑의 이름)
    // 사가2 페이즈2(OGW) 커먼 대상의 빈터 — 그림과 밑의 이름 자리 (첫 배율의 이름 폭까지, 북쪽 언덕 기호 띠의 남쪽 끝)
    { points: [[546, 418], [624, 418], [624, 466], [646, 466], [646, 504], [524, 504], [524, 466], [546, 466]], phase5: true }, // isolation-zone (그림 x 552–618 · y 427–468, 밑의 이름)
    // 가시지대 협곡의 좁은 끝(209, 127) 둘레 — 협곡을 그리는 페이즈(끔·사가2 와 페이즈3, chasm() 과 같은 두 벌)에만. 결정 칸의 구멍(CHASM_HOLE)은
    // 끝에서 곧게 그쳐 그 너머의 첨탑이 협곡 끝에 붙어 서고, 끝은 위 가장자리 띠 안이라 세계 지도(협곡선에서 9.6 안에는 기호를 두지 않는다)와도
    // 어긋난다. 칸을 다시 자르면 칸 전체의 첨탑이 다시 뿌려지므로 빈터로 뺀다
    { points: [[263, 134], [256, 159], [238, 177], [213, 184], [188, 177], [170, 159], [163, 134], [170, 109], [188, 91], [213, 84], [238, 91], [256, 109]], phase: false },
    { points: [[263, 134], [256, 159], [238, 177], [213, 184], [188, 177], [170, 159], [163, 134], [170, 109], [188, 91], [213, 84], [238, 91], [256, 109]], phase3: true },
    // 시점별 보기 — Spire Barrage 자리 (사가 보기는 결정 칸의 들인 가장자리가 비운다)
    SPIRE_CLEAR,
    // 사가3 페이즈1(ZNR) 미식 레어 — 세계 지도 그림 Nissa of Shadowed Boughs(동쪽 범위 밖 아쿰 하늘거주지 곁 — 그림 서쪽 끝과 밑의 이름만 이 범위의 띠에 든다)
    { points: [[1431, 543], [1526, 543], [1526, 662], [1582, 662], [1582, 694], [1375, 694], [1375, 662], [1431, 662]], phase6: true }, // nissa-of-shadowed-boughs (세계 지도 그림)
    // 사가3 페이즈1(ZNR) 레어 — 그림과 이름 자리 (세계 지도 그림은 이 범위에 드는 그림과 이름 자리)
    { points: [[941,796], [1033,796], [1033,909], [1067,909], [1067,941], [907,941], [907,909], [941,909]], phase6: true }, // magmatic-channeler
    { points: [[475, 835], [843, 835], [843, 913], [475, 913]], movedFor: ['belligerent-whiptail'] }, // belligerent-whiptail — 시점별 보기에서 시점 1·2 에만 옮긴 자리 · 2a (그림 x 637–837 · y 841–907, 왼쪽 이름까지 — Cunning Sparkmage 남쪽)
    { points: [[813, 752], [976, 752], [976, 906], [813, 906]], movedFor: ['cunning-sparkmage'] }, // cunning-sparkmage — 시점별 보기에서 시점 3·4 에만 옮긴 자리 · 2a (그림 x 852–937 · y 758–866, 밑 이름까지 — Belligerent Whiptail 남동쪽)
    { points: [[335, 510], [493, 510], [493, 634], [335, 634]], movedFor: ['affa-guard-hound'] }, // affa-guard-hound — 시점별 보기에서 시점 4 에만 옮긴 자리 · 2a (그림 x 372–456 · y 516–593, 밑 이름까지 — Weapons Trainer 남서쪽)
    { points: [[1201, 926], [1355, 926], [1355, 1068], [1201, 1068]], movedFor: ['plated-geopede'] }, // plated-geopede — 시점별 보기에서 시점 5 에만 옮긴 자리 (사가 보기 자리 상자 1218–1372 · 820–962 를 남쪽으로 — Nissa's Zendikon 세계 지도 그림과 Skyclave Geopede 를 비켜)
    { points: [[628, 841], [845, 841], [845, 962], [628, 962]], movedFor: ['belligerent-whiptail'] }, // belligerent-whiptail — 시점별 보기에서 시점 5 에만 옮긴 자리 (그림 x 636–836 · y 848–913, 밑 이름까지 — stonework-packbeast·cunning-sparkmage 를 비켜)
    { points: [[718, 951], [881, 951], [881, 1105], [718, 1105]], movedFor: ['cunning-sparkmage'] }, // cunning-sparkmage — 시점별 보기에서 시점 5 에만 옮긴 자리 (그림 x 757–842 · y 957–1065, 밑 이름까지 — stonework-packbeast·magmatic-channeler 를 비켜 마을 남쪽 들판의 더 남쪽)
    { points: [[956, 793], [1129, 793], [1129, 954], [956, 954]], movedFor: ['magmatic-channeler'] }, // magmatic-channeler — 시점별 보기에서 시점 3·4 에만 옮긴 자리 (그림 x 1001–1084 · y 800–905, 밑 이름까지 — 둘레 이름 자리를 비워)
    { points: [[1149, 642], [1436, 642], [1436, 785], [1149, 785]], movedFor: ['skyclave-geopede'] }, // skyclave-geopede — 시점별 보기에서 시점 2·3·4 에만 옮긴 자리 (그림 x 1310–1427 · y 648–770, 왼쪽 이름까지 — 2016년의 무너진 아쿰 하늘거주지를 비켜)
    { points: [[651, 654], [860, 654], [860, 791], [651, 791]], movedFor: ['stonework-packbeast'] }, // stonework-packbeast — 시점별 보기에서 시점 4 에만 옮긴 자리 (그림 x 706–806 · y 661–743, 밑 이름까지 — belligerent-whiptail 를 비켜),
    { points: [[714, 643], [1022, 643], [1022, 746], [714, 746]], movedFor: ['stonework-packbeast'] }, // stonework-packbeast — 시점별 보기에서 시점 3 에만 옮긴 자리 (그림 x 723–823 · y 649–731, 오른쪽 이름까지 — belligerent-whiptail 를 비켜)
  ],
  subjects: {
    // 사가3 페이즈1(ZNR) 커먼 — 대상 (자리는 phase6.ts 의 estimate)
    'stonework-packbeast': { at: [755.3, 810.9], size: 100.0, moved: { 4: { at: [755.3, 738.7] }, 3: { at: [772, 727.6], label: 'right' } } },
    // 사가3 페이즈1(ZNR) 언커먼 — 대상 (자리는 phase6.ts 의 estimate)
    'canyon-jerboa': { at: [577.6, 1210.7], size: 50.0 },
    'goma-fada-vanguard': { at: [577.6, 1155.2], size: 94.4 },
    'skyclave-geopede': { at: [1244.1, 888.6], size: 122.2, moved: { 4: { at: [1366.2, 726.4], label: 'left' }, 3: { at: [1366.2, 726.4], label: 'left' }, 2: { at: [1366.2, 726.4], label: 'left' } } },
    // Glory Seeker(ROE) — 아파 남서쪽 맨땅에서 칼을 뽑아 동쪽(이빨 쪽)으로 겨누며 한 걸음 내딛는 인간 지원병 (페이즈3)
    'glory-seeker': { at: [330, 745], size: 104 },
    // Affa Guard Hound(ROE) — 아파 마을 남서쪽 언덕 아래에서 네 발로 버티고 서서 귀를 세우고 바깥(서쪽)을 지켜보는 목줄 찬 경비견 (페이즈3)
    'affa-guard-hound': { at: [520, 470], size: 84, moved: { 4: { at: [420, 592] } } },
    // 페이즈2 — 아파 남쪽 맨땅, 손끝에서 불꽃을 튀기는 인간 주술사 (이 지도의 추정)
    'cunning-sparkmage': { at: [800, 790], size: 108, moved: { 3: { at: [878, 862] }, 4: { at: [878, 862] }, 5: { at: [783.1, 1061.2] } } },
    // 페이즈2 — 마을 남동쪽 모퉁이 바자 노점 바로 앞(남쪽), 앞줄 집 밑 — 무덤 지도와 물약을 권하는 고블린 행상
    'bazaar-trader': { at: [695, 448], size: 106 },
    // 마을 남쪽 맨땅, 바자 노점 앞에서 한 줄 아래 — 서쪽(가시지대와 폐허 쪽)을 보고 선다
    'goblin-guide': { at: [715, 605], size: 104 },
    // 마을 서쪽, 가시지대 가장자리 남쪽 맨땅 — 뒤집어 서쪽으로(마을 반대쪽으로) 던진다
    'goblin-ruinblaster': { at: [368, 478], size: 110, flip: true },
    // Windblast Gorge 어귀 안, 마을에서 오르는 길 위의 디딤판 — 드레이크 둘이 협곡 바닥 위를 돈다
    'lethargy-trap': { at: [836, 171], size: 92 },
    // 강 남쪽, 이빨 기슭의 트인 들판 — 길에서 벗어난 바위 둔덕 위에서 서쪽(마을 쪽)으로 손짓한다
    'goblin-shortcutter': { at: [977, 492], size: 100 },
    // 초화산 분화구 남동쪽, 용암 들판 서쪽 가장자리의 굴 — 몸이 용암 쪽으로 휜다
    'plated-geopede': { at: [1292, 905], size: 120, moved: { 5: { at: [1275.2, 1010.8] } } },
    // 가시지대 남쪽 끝 — 결정 첨탑이 부러져 쏟아지는 자리 (둘레의 지도 첨탑 무리는 비웠다)
    'spire-barrage': { at: [324, 306], size: 85 },
    // 마을 남쪽 트인 들판 — 뒤집어 서쪽으로(마을 반대쪽으로) 던진다
    'torch-slinger': { at: [548, 655], size: 96, flip: true },
    // 사가2 페이즈1 — Hero of Goma Fada(BFZ): 고마 파다 표시(422, 1166)와 그 수레 행렬 바로 북쪽에 방패를 들고 선 대상단의 인간 기사
    // (카드 이름이 고마 파다 사람으로 밝힌다 — 대상단의 대표 자리인 표시 곁. 표시의 이름은 오른쪽이라 그 위에 선다)
    'hero-of-goma-fada': { at: [428, 1110], size: 104 },
    // 사가2 페이즈1 — Serene Steward(BFZ): 기사 서쪽, 이 지도가 고마 파다 대상단의 치유사로 읽은 성직자가 동쪽(기사 쪽)으로 손을 내밀어 축복한다 (이 지도의 추정)
    'serene-steward': { at: [300, 1105], size: 100 },
    // 사가2 페이즈1 — Akoum Stonewaker(BFZ): 강 남쪽 이빨 기슭의 화산 비탈, 깨운 돌 정령 곁의 아쿰 주술사 (초화산 분화구 밖, 이 지도의 추정)
    'akoum-stonewaker': { at: [1150, 480], size: 110 },
    // 사가2 페이즈1 — Cliffside Lookout(BFZ): 가시지대 협곡 남동쪽 끝 바로 동쪽 벼랑에 서서 서쪽 협곡 너머 Stone Havens 쪽을 살피는 코르 척후 (이 지도의 추정)
    'cliffside-lookout': { at: LOOKOUT, size: 100 },
    // 사가2 페이즈1 — Belligerent Whiptail(BFZ): 아파 남쪽 트인 들판에 낮게 엎드려 마을 쪽(서쪽)으로 머리를 든 꼬리채찍 웜 (뒤집음, 이 지도의 추정)
    'belligerent-whiptail': { at: [750, 835], size: 200, flip: true, moved: { 1: { at: [750, 901], label: 'left' }, 2: { at: [750, 901], label: 'left' }, 5: { at: [749.8, 907.5] } } },
    // 사가2 페이즈1 — Lavastep Raider(BFZ): 초화산 분화구 북서쪽 바깥 맨땅, 낮은 화산 굴 어귀에서 헤드론 조각 창을 들고 뛰쳐나오는 용암발자국 고블린 (이 지도의 추정)
    'lavastep-raider': { at: [863, 606], size: 89 },
    // 사가2 페이즈2(OGW) 언커먼 (이 지도의 추정 자리)
    // Stoneforge Acolyte — 가시지대 협곡 동쪽 끝의 남쪽 기슭, 갈라진 낮은 바위에서 칼날을 끌어내는 코르 암석술사 (바위 피난처의 stoneforge mystic)
    'stoneforge-acolyte': { at: [146, 226], size: 100 },
    // Weapons Trainer — 서쪽 바위 둔덕의 굴(지하 폐허의 암시) 바로 아래 맨땅, 연장을 무기로 휘두르는 아파 수비대의 인간 교관. 동쪽(마을 쪽)을 본다
    'weapons-trainer': { at: [452, 432], size: 104.4 },
    // 사가2 페이즈2(OGW) 커먼 (이 지도의 추정 자리)
    // Isolation Zone — 굴 둔덕(지하 폐허의 암시) 남동쪽, 마을 남쪽 맨땅에 정렬해 세운 헤드론 고리(아파 지하 피난처의 헤드론 파수)
    'isolation-zone': { at: [585, 457], size: 66.6 },
    // 사가3 페이즈1(ZNR) 레어 — Magmatic Channeler (자리는 phase6.ts 의 estimate)
    'magmatic-channeler': { at: [977.5, 899.7], size: 105.5, moved: { 4: { at: [1033, 899.7] }, 3: { at: [1033, 899.7] } } },
  },
  markAnchors: { affa: 'right', 'windblast-gorge': 'right', 'goma-fada': 'right' },
  focus: [512, 440],
})
