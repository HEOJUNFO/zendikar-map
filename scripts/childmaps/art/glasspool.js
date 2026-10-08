// Glasspool — 자식 지도 (아쿰 동부, 세계 범위 x 2095–2275 · y 460–595, ×7.41).
// 거울연못: '이상하게 육각형인, 지름 2마일이 넘는 큰 호수', 물은 늘 차고 맑으며 수면은 지진에도 흔들리지 않는다(PG: Akoum 2010,
// 아트북 2016). 바닥에는 Ior Ruin — '긴 아케이드로 이어진 둥근 건물들이 반쯤 무너진 채 물속에 서 있고, 밑동은 모래에 묻혔다'
// (아트북 2016), 탐험가들은 '근처의 들쭉날쭉한 봉우리' 꼭대기에서 그것을 보았다(PG: Akoum). 'the peaks surrounding Glasspool',
// 'the mountain passes that access the lake'(Worldwake Player's Guide 2010 p.7). 2020년(ZNR 거울연못 모방자)에도 호수와 그 마법은 그대로다.
// 그리는 시대: Zendikar Rising(2020) 이후. 2010년 코르 정착지(봉우리에 판 집·대장간·고갯길 요새·밧줄 그물)는 그 뒤가 알려지지 않아
// 그리지 않는다. Glass Haven 도, 호수 위 헤드론(ZNR 그림에만 있고 세계 지도에 헤드론 무리가 없다)도 그리지 않는다.
// 해석(공식 자리·모양 없음): 호수를 두른 산의 배치와 두 고갯길(북쪽·서쪽 틈), 물속 유적의 자리·크기·모양(호수 남쪽 절반 —
// 세계 지도의 Ior Ruin 표시가 남쪽 기슭에 있어 그 가까이), 원정대가 선 바위 봉우리(호수 서남서쪽), 그림들의 자리.
// 세계 지도에서 옮긴 것: 호수 육각형(waters.glasspool — 앱이 고리를 다듬어 모서리가 둥글어지므로 같은 꼭짓점으로 다시 그린다),
// 동쪽 해안 벼랑의 빗금, 북쪽 결정 분지(akoum-basin-east, 추정), 그 안의 가스 분출구(akoum-vent-basin, 추정), 서·남서·남쪽 산과
// 그 사이 수정 첨탑(아쿰 기복의 결정 30%), 호수 동쪽의 트인 땅.
// 세계 지도의 Ior Ruin 표시는 호수 남쪽 기슭(물 밖)에 있어, 그 이름을 표시 위(호수 쪽)에 달아 바로 위 물속 유적을 가리키게 한다.

const { line, poly, smooth, rng, stack } = KIT
const r1 = (v) => Math.round(v * 10) / 10
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`
const P = (cls, d) => ({ cls, d })
const ell = (x, y, rx, ry) => `M${pt([x - rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x + rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x - rx, y])}Z`
function inPoly(x, y, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
const inBox = ([x0, y0, x1, y1], x, y, m = 0) => x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m

// ---------------------------------------------------------------- 세계 지도에서 온 자리 (context.mjs, 자식 좌표)
const S = 1333 / 180
const W2C = ([x, y]) => [(x - 2095) * S, (y - 460) * S]
/** 거울연못 — features.json waters.glasspool 의 여섯 꼭짓점 (E, SE, SW, W, NW, NE) */
const HEX = [[2215.6, 537.4], [2200, 565], [2166.4, 565], [2150.8, 537.4], [2166.4, 509.8], [2200, 509.8]].map(W2C)
const LAKE_C = W2C([2183.2, 537.4])
/** Ior Ruin 표시 (세계 지도 2192.8,571 — 호수 남쪽 기슭) */
/** 결정 분지 (akoum-basin-east, 추정 범위) */
const BASIN = [[-128.9, 4.4], [13.3, -57.8], [226.6, -13.3], [439.9, 13.3], [653.2, -31.1], [813.1, 22.2], [857.6, 146.6], [742, 253.3], [519.9, 297.7], [279.9, 279.9], [57.8, 244.4], [-84.4, 155.5]]
/** 가스 분출구 (akoum-vent-basin, 추정) */
const VENT = [333.3, 120]

// ---------------------------------------------------------------- 자리 (이 지도의 해석)
const SUBJ = {
  expedition: [348, 628], // 서남서쪽 바위 봉우리 꼭대기
  ritual: [646, 318], // 북쪽 기슭, 북쪽 고갯길로 들어선 순례 무리
  scholar: [934, 588], // 동쪽 모서리 물가
  gear: [884, 714], // 남동쪽 기슭의 바위 위
}
/** 원정대가 선 봉우리 — 밑 가운데와 크기 */
const CRAG = { x: 350, y: 800, w: 260, top: 648 }

// ---------------------------------------------------------------- 그리기 도구 (KIT 에 없는 것)
/** 다각형을 안쪽으로 d 만큼 — 변마다 평행하게 옮겨 이웃 변과 만나는 점 (볼록 다각형, 시계 방향 화면 좌표) */
function inset(pts, d) {
  const n = pts.length
  // 넓이 부호로 안쪽 방향을 정한다
  let area = 0
  for (let i = 0; i < n; i++) area += pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1]
  const sgn = area > 0 ? 1 : -1
  const lines = pts.map((a, i) => {
    const b = pts[(i + 1) % n]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    const nx = (-(b[1] - a[1]) / len) * sgn
    const ny = ((b[0] - a[0]) / len) * sgn
    return [[a[0] + nx * d, a[1] + ny * d], [b[0] + nx * d, b[1] + ny * d]]
  })
  return lines.map((L1, i) => {
    const L0 = lines[(i - 1 + n) % n]
    const [[x1, y1], [x2, y2]] = L0
    const [[x3, y3], [x4, y4]] = L1
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den
    return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)]
  })
}

/** 가스 분출구 — 세계 지도의 분출구 기호: 낮은 돌 테두리와 피어오르는 김 세 줄 */
function vent(x, y) {
  let steam = ''
  for (let k = 0; k < 3; k++) {
    const sx = x - 6 + k * 6
    steam += smooth([[sx, y - 4], [sx - 3.5, y - 13], [sx + 3, y - 22], [sx - 2, y - 32 - k * 4]])
  }
  return [P('stone', ell(x, y, 12, 4.4)), P('dark', ell(x, y - 0.6, 6.5, 2.2)), P('hatch', steam), P('ink', ell(x, y, 12, 4.4))]
}

/**
 * 들쭉날쭉한 바위 봉우리 — 원정대가 호수를 내려다본 '근처의 들쭉날쭉한 봉우리'. 꼭대기는 그림의 바위 받침 밑에 숨는다.
 * 세계 지도의 산 기호를 크게 그린 꼴: 밑선 없이 땅으로 사라지는 윤곽, 서쪽(왼쪽)은 볕, 동쪽(오른쪽) 면만 그늘과 성긴 빗금.
 * (x, y) 밑 가운데, w 밑 너비, top 꼭대기 높이(y)
 */
function crag({ x, y, w, top }, seed) {
  const rand = rng(seed)
  const h = y - top
  const at = ([fx, fh]) => [x + fx * w, y - fh * h]
  // 윤곽 [x 비율, 높이 비율] — 왼쪽 기슭 → 들쭉날쭉한 턱 → 꼭대기(그림 받침 밑, 평평) → 가파른 오른쪽 벼랑 → 기슭
  const SIL = [
    [-0.5, -0.02], [-0.42, 0.1], [-0.36, 0.22], [-0.33, 0.2], [-0.27, 0.4], [-0.21, 0.52], [-0.18, 0.5], [-0.14, 0.7],
    [-0.12, 0.86], [-0.09, 0.97], [0.0, 1.0], [0.12, 0.99], [0.14, 0.88], [0.18, 0.74], [0.21, 0.75], [0.25, 0.55],
    [0.31, 0.42], [0.34, 0.43], [0.4, 0.22], [0.45, 0.1], [0.5, -0.02],
  ]
  const sil = SIL.map(([fx, fh], i) => {
    const [px, py] = at([fx, fh])
    return i === 0 || i === SIL.length - 1 ? [px, py] : [px + (rand() - 0.5) * 2.5, py + (rand() - 0.5) * 2]
  })
  // 그늘 면의 능선 — 꼭대기 오른쪽 끝에서 비스듬히 오른쪽 기슭으로 좁아진다 (밑이 평평하게 잘리지 않게)
  const RIDGE = [[0.12, 0.99], [0.1, 0.82], [0.15, 0.62], [0.14, 0.45], [0.22, 0.25], [0.33, 0.1], [0.47, 0.0]]
  const ridge = RIDGE.map(at)
  const iR = SIL.findIndex(([fx, fh]) => fx === 0.12 && fh === 0.99)
  const shade = poly([...ridge, ...sil.slice(iR, -1).reverse()])
  // 그늘 면의 빗금 — 세계 지도 산 기호처럼 거의 곧추선 짧은 금, 오른쪽 윤곽 밑에서 능선 쪽으로
  const yAt = (pts, hx) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i]
      const [bx, by] = pts[i + 1]
      if (hx >= Math.min(ax, bx) && hx <= Math.max(ax, bx)) return ay + ((by - ay) * (hx - ax)) / (bx - ax || 1)
    }
    return null
  }
  let hatch = ''
  for (let k = 0; k < 12; k++) {
    const hx = x + w * (0.135 + k * 0.026) + (rand() - 0.5) * 2
    const ty = yAt(sil.slice(iR), hx)
    if (ty == null) continue
    const len = Math.min(h * (0.24 + rand() * 0.14), y - ty - 12)
    if (len < 12) continue
    hatch += line([[hx, ty + 4], [hx - len * 0.12, ty + 4 + len]])
  }
  // 볕 쪽 바위 결 — 턱 밑의 짧은 금 몇 개
  let cracks = ''
  for (const i of [2, 4, 6, 8]) {
    const [cx, cy] = sil[i]
    cracks += line([[cx + 4, cy + 5], [cx + 8, cy + 14 + rand() * 6]])
  }
  // 밑은 낮은 둔덕 곡선으로 닫아 뒤의 기호만 가린다 (선은 긋지 않는다)
  const base = [[x + 0.5 * w, y - 0.02 * h], [x + 0.25 * w, y + 10], [x - 0.25 * w, y + 10], [x - 0.5 * w, y - 0.02 * h]]
  return [P('fill', poly([...sil, ...base.slice(1, 3)])), P('shade', shade), P('hatch', hatch + cracks + line(ridge.slice(0, 5))), P('ink-bold', line(sil))]
}

/**
 * 물속에 잠긴 Ior — 위에서 내려다본 둥근 건물(무너진 둥근 벽, 반쯤 남은 둥근 지붕)과 그것들을 잇는 긴 아케이드,
 * 모래에 묻힌 밑동. 물을 통해 보이므로 돌 채움 없이 옅은 물빛 선과 해칭으로만 (아트북 2016 'Ior Ruin' 서술)
 */
function drowned() {
  const rand = rng('ior')
  // 둥근 건물 [x, y, 반지름, 무너진 정도]
  const ROT = [
    [704, 646, 44, 0.25],
    [592, 680, 31, 0.4],
    [740, 726, 25, 0.35],
    [634, 738, 18, 0.6],
    [548, 620, 15, 0.7],
  ]
  // 아케이드 [건물 a, 건물 b, 끊긴 구간들(0..1)]
  const ARC = [
    [1, 0, [[0.46, 0.6]]],
    [0, 2, []],
    [1, 3, [[0.2, 0.45]]],
    [3, 2, [[0.55, 0.7]]],
    [4, 1, [[0.1, 0.3]]],
  ]
  let mass = '' // 벽 두께 (물빛으로 짙게)
  let edge = '' // 벽 윤곽
  let dome = '' // 반쯤 남은 둥근 지붕의 해칭
  let piers = ''
  let sand = ''
  const arcAt = (x, y, r, a) => [x + Math.cos(a) * r, y + Math.sin(a) * r * 0.9]
  for (const [x, y, r, broken] of ROT) {
    // 무너진 틈 — 각도 구간
    const gaps = []
    const ng = 1 + Math.floor(rand() * 1.5 + broken * 2.2)
    for (let k = 0; k < ng; k++) {
      const a = rand() * Math.PI * 2
      gaps.push([a, a + 0.3 + broken * 0.8 * rand()])
    }
    const inGap = (a) => gaps.some(([g0, g1]) => (((a - g0) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) < g1 - g0)
    const ri = r * 0.78
    // 이어진 벽 토막마다 바깥 호 → 안쪽 호로 닫힌 띠
    const N = 72
    let run = []
    const flush = () => {
      if (run.length > 1) {
        const outer = run.map((a) => arcAt(x, y, r, a))
        const inner = run.map((a) => arcAt(x, y, ri, a)).reverse()
        const d = poly([...outer, ...inner])
        mass += d
        edge += d
      }
      run = []
    }
    for (let k = 0; k <= N; k++) {
      const a = (k / N) * Math.PI * 2
      if (inGap(a)) flush()
      else run.push(a)
    }
    flush()
    // 반쯤 남은 둥근 지붕 — 남동쪽(그늘) 반쪽에만 곧은 빗금. 무너진 정도만큼 빗금이 짧다.
    //    동심원 호를 쓰지 않는다 (물결처럼 읽히면 안 된다 — 수면의 고요함)
    const rd = ri * 0.84
    const A0 = -0.55 - broken * 0.3
    const A1 = 2.15 - broken * 0.9
    const sq = (px, py) => [x + px, y + py * 0.9]
    const th = (A0 + A1) / 2
    const nx = Math.cos(th)
    const ny = Math.sin(th)
    for (let t = rd * 0.05; t < rd * 0.95; t += 3.6) {
      const half = Math.sqrt(rd * rd - t * t) * (0.92 - broken * 0.35)
      const cx = nx * t
      const cy = ny * t
      dome += line([sq(cx - ny * half, cy + nx * half), sq(cx + ny * half, cy - nx * half)])
    }
    // 안쪽 기둥 고리
    const np = Math.max(5, Math.round(r / 5))
    for (let k = 0; k < np; k++) {
      const a = (k / np) * Math.PI * 2 + 0.2
      if (rand() < broken * 0.6) continue
      const [px, py] = arcAt(x, y, ri * 0.62, a)
      piers += ell(px, py, 1.7, 1.5)
    }
    // 모래에 묻힌 밑동 — 벽 바깥 둘레의 점
    for (let k = 0; k < 14; k++) {
      const a = rand() * Math.PI * 2
      const [sx, sy] = arcAt(x, y, r * (1.08 + rand() * 0.3), a)
      sand += ell(sx, sy, 1, 0.75)
    }
  }
  // 아케이드 — 기둥 두 줄과 그 바깥 벽선, 군데군데 끊김
  for (const [ia, ib, cuts] of ARC) {
    const [ax, ay, ar] = ROT[ia]
    const [bx, by, br] = ROT[ib]
    const len = Math.hypot(bx - ax, by - ay)
    const ux = (bx - ax) / len
    const uy = (by - ay) / len
    const nx = -uy
    const ny = ux
    const s0 = ar * 0.95
    const s1 = len - br * 0.95
    const half = 6.5
    const cut = (t) => cuts.some(([c0, c1]) => t > c0 && t < c1)
    for (const side of [-1, 1]) {
      let run = []
      const flush = () => {
        if (run.length > 1) edge += line(run)
        run = []
      }
      for (let s = s0; s <= s1; s += 2) {
        const t = (s - s0) / (s1 - s0)
        if (cut(t)) flush()
        else run.push([ax + ux * s + nx * (half + 2.5) * side, ay + uy * s + ny * (half + 2.5) * side])
      }
      flush()
    }
    for (let s = s0 + 5; s < s1 - 3; s += 8) {
      const t = (s - s0) / (s1 - s0)
      if (cut(t)) continue
      for (const side of [-1, 1]) {
        const px = ax + ux * s + nx * half * side
        const py = ay + uy * s + ny * half * side
        piers += poly([[px - 1.6, py - 1.6], [px + 1.6, py - 1.6], [px + 1.6, py + 1.6], [px - 1.6, py + 1.6]])
      }
    }
    for (let k = 0; k < 6; k++) {
      const s = s0 + rand() * (s1 - s0)
      const off = (rand() < 0.5 ? -1 : 1) * (half + 5 + rand() * 9)
      sand += ell(ax + ux * s + nx * off, ay + uy * s + ny * off, 1, 0.75)
    }
  }
  // 흩어진 돌덩이 — 무너져 내린 것
  let blocks = ''
  for (let k = 0; k < 18; k++) {
    const [x, y, r] = ROT[k % ROT.length]
    const a = rand() * Math.PI * 2
    const [bx, by] = arcAt(x, y, r * (1.1 + rand() * 0.4), a)
    const s = 1.8 + rand() * 1.8
    blocks += poly([[bx - s, by - s * 0.6], [bx + s, by - s * 0.8], [bx + s * 0.9, by + s * 0.6], [bx - s * 0.8, by + s * 0.7]])
  }
  return [P('sea', mass + blocks), P('sea-ink', sand), P('hatch', dome + edge + blocks), P('sea-ink', piers)]
}

// ---------------------------------------------------------------- 그리기
const parts = []

// 1. 해안 벼랑 — 아쿰의 붉은 벼랑, 영구 항구 없는 '죽음의 해안' (PG: Akoum; Stone and Blood). 세계 지도의 절벽 해안 그대로:
//    terrain.ts cliffHachure 가 akoum 해안(land.smooth)에 긋는 벼랑 위 선과 빗금을 범위 둘레만 이 지도 좌표로 옮겨 적었다
//    (같은 자리·같은 길이 — 가장자리 띠에서 세계 지도의 빗금과 겹쳐도 두 겹으로 보이지 않는다). 해안선은 앱이 그린다
const WORLD_CLIFF_TOP = [[1147.8,1047.3],[1145.6,1022.3],[1146.1,986.4],[1151.5,949.5],[1155.5,938.9],[1156.7,913.8],[1155.3,900.6],[1153.2,885.4],[1146.3,861.1],[1140.4,844.8],[1130.8,821.5],[1121.6,777.2],[1119.5,752.1],[1117.3,727],[1118.9,691.7],[1120.6,666.6],[1122.2,641.5],[1125.2,610.7],[1129.1,585.8],[1132.9,560.9],[1136.8,536],[1140.6,511.1],[1145.9,482.7],[1151.2,458.1],[1156.4,433.5],[1161.7,408.9],[1166.9,384.2],[1172.1,359.6],[1175.6,338.5],[1179.5,313.6],[1183.3,288.7],[1187.1,263.9],[1186.9,264.4],[1147.7,265.8],[1082.9,241.6],[1063.9,225],[1039.9,198.7],[1023.8,179.3],[1005.8,154.9],[991.3,134.3],[975.1,111.2],[961.6,89.9],[948,68.7],[934.4,47.5],[923,32],[907.6,12.1],[892.2,-7.8],[880.2,-21.4],[862.8,-39.6],[845.4,-57.8]]
const WORLD_CLIFF_TICKS = [[1147.8,1047.3,45.3,-3.9],[1145.6,1022.3,44.8,-3.9],[1146.1,986.4,39,2.9],[1151.5,949.5,52.5,13.9],[1155.5,938.9,52.6,2.6],[1156.7,913.8,58.5,2.9],[1155.3,900.6,58.4,-7.6],[1153.2,885.4,42.9,-12.2],[1146.3,861.1,49.2,-13.9],[1140.4,844.8,35,-14.5],[1130.8,821.5,38.1,-15.8],[1121.6,777.2,39.7,-3.4],[1119.5,752.1,43.9,-3.8],[1117.3,727,55.7,-4.8],[1118.9,691.7,51.4,3.4],[1120.6,666.6,41.3,2.8],[1122.2,641.5,53.2,3.6],[1125.2,610.7,37.8,5.9],[1129.1,585.8,42.3,6.6],[1132.9,560.9,55.2,8.6],[1136.8,536,51.7,8],[1140.6,511.1,38.8,6],[1145.9,482.7,48.7,10.4],[1151.2,458.1,38.7,8.2],[1156.4,433.5,38,8.1],[1161.7,408.9,45.6,9.7],[1166.9,384.2,45,9.6],[1172.1,359.6,47,10],[1175.6,338.5,57.9,8.9],[1179.5,313.6,44.6,6.9],[1183.3,288.7,43.2,6.7],[1187.1,263.9,54.9,8.5],[1186.9,264.4,-9.8,-56.6],[1147.7,265.8,2.4,-59.2],[1082.9,241.6,33.4,-38.1],[1063.9,225,37.8,-43],[1039.9,198.7,35.2,-29.2],[1023.8,179.3,40.3,-33.5],[1005.8,154.9,46.6,-32.9],[991.3,134.3,32.9,-23.2],[975.1,111.2,31.5,-20.1],[961.6,89.9,41.7,-26.7],[948,68.7,32.1,-20.5],[934.4,47.5,37.7,-24.1],[923,32,31.4,-24.3],[907.6,12.1,40.8,-31.5],[892.2,-7.8,42.8,-33.1],[880.2,-21.4,27.9,-26.7],[862.8,-39.6,32.8,-31.4],[845.4,-57.8,39.5,-37.8]]
{
  const ticks = WORLD_CLIFF_TICKS.map(([x, y, dx, dy]) => `M${pt([x, y])}l${r1(dx)} ${r1(dy)}`).join('')
  parts.push(P('hatch', line(WORLD_CLIFF_TOP) + ticks))
}

// 2. 거울연못 — 세계 지도와 같은 날카로운 육각형. 물가 안쪽 띠(세계 지도의 inland-sea-ripple), 가운데는 앱의 물빛, 잉크 테두리.
//    잔물결·물결·물길은 그리지 않는다 (수면의 고요함이 공식 설정)
const BAND = inset(HEX, 30)
{
  const hexD = poly(HEX)
  const ringD = hexD + poly([...BAND].reverse())
  // 물빛을 두 번 겹쳐 세계 지도의 띠만큼 짙게 — 따로 남긴다 (compact 가 합치지 않게)
  parts.push(P('fill', ringD), { ...P('sea', ringD), solo: true }, { ...P('sea', ringD), solo: true })
  parts.push(...drowned())
  parts.push(P('ink-bold', hexD))
}

// 3. 땅 위에 선 것들 — 뒤(위)에서 앞(아래)으로
const items = []
const add = (y, p) => items.push({ y, parts: p })

// 결정 분지와 산 사이의 수정 첨탑은 아래 지형 기호(crystal)로 — 세계 지도와 같은 기호·크기·간격이 되게 앱이 흩뿌린다
// 가스 분출구 (추정 자리)
add(VENT[1], vent(VENT[0], VENT[1]))

// 원정대의 봉우리
add(CRAG.y, crag(CRAG, 'crag'))

// 물가의 돌 — 학자와 장비가 놓인 동쪽 기슭, 그리고 몇 군데
add(SUBJ.gear[1] + 4, KIT.rocks(SUBJ.gear[0] + 2, SUBJ.gear[1] + 3, 12, 2, 'gear-rock'))
for (const [x, y, s, n, seed] of [[952, 524, 6, 3, 'r1'], [806, 352, 5, 2, 'r4'], [858, 790, 5, 2, 'r2']]) {
  add(y, KIT.rocks(x, y, s, n, seed))
}
parts.push(...stack(items))

// ---------------------------------------------------------------- 지형 기호
/** 짝홀 구멍 — 바깥 고리 안에 서로 겹치지 않는 구멍들을 낸다 */
const withHoles = (outer, holes) => [...outer, outer[0], ...holes.flatMap((h) => [...h, h[0], outer[0]])]
const blob = (cx, cy, r, n = 9) => Array.from({ length: n }, (_, i) => [r1(cx + Math.cos((i / n) * Math.PI * 2) * r), r1(cy + Math.sin((i / n) * Math.PI * 2) * r * 0.86)])
/** 세계 지도에서 아쿰의 산 가운데 30% 쯤은 수정 첨탑(작은 무리)이다 — 산 칸 안에 작은 구멍을 흩어 내고 그 자리를 수정 칸으로.
 *  구멍 하나는 앱의 기호 간격(수정 12·g)만 해서 어느 배율에서나 산 기호 서넛에 수정 하나꼴이 된다 */
function crystalSpots(ring, seed, avoid = []) {
  const rand = rng(seed)
  const xs = ring.map((p) => p[0])
  const ys = ring.map((p) => p[1])
  const out = []
  for (let y = Math.min(...ys) + 40; y < Math.max(...ys) - 20; y += 104) {
    for (let x = Math.min(...xs) + 40; x < Math.max(...xs) - 20; x += 112) {
      const cx = x + (rand() - 0.5) * 70
      const cy = y + (rand() - 0.5) * 60
      const r = 20 + rand() * 6
      if (rand() < 0.2) continue
      const pts = blob(cx, cy, r + 10, 12)
      if (!pts.every(([px, py]) => inPoly(px, py, ring))) continue
      if (avoid.some((b) => inBox(b, cx, cy, r + 14))) continue
      if (out.some((o) => Math.hypot(o.cx - cx, o.cy - cy) < o.r + r + 30)) continue
      out.push({ cx, cy, r })
    }
  }
  return out.map(({ cx, cy, r }) => blob(cx, cy, r))
}
const MTN_NW = [[-260, 300], [80, 270], [280, 300], [420, 318], [450, 360], [410, 420], [350, 466], [260, 482], [-260, 482]]
// 원정대의 봉우리 자리(x 214–490, y 572–870)는 비운다
const MTN_SW = [[-260, 576], [200, 572], [212, 640], [214, 760], [236, 868], [350, 880], [470, 870], [540, 856], [400, 1260], [-260, 1260]]
// Ior Ruin 표시와 이름 자리는 비운다
const MTN_S = [[540, 856], [620, 864], [660, 902], [800, 906], [860, 872], [920, 842], [1000, 826], [1120, 860], [1140, 1260], [400, 1260]]
// 그림·이름 자리 [x0, y0, x1, y1] — 수정 구멍을 두지 않는다
const KEEP = [[200, 560, 500, 880], [640, 800, 820, 900], [820, 640, 960, 760]]
const SPOTS_NW = crystalSpots(MTN_NW, 'cs-nw', KEEP)
const SPOTS_SW = crystalSpots(MTN_SW, 'cs-sw', KEEP)
const SPOTS_S = crystalSpots(MTN_S, 'cs-s', KEEP)
// 결정 분지 — 세계 지도 akoum-basin-east(결정, 밀도 0.6: 낮은 작은 무리). 북쪽 고갯길로 들어선 순례 무리 자리는 남쪽 변을 들여 비우고,
// 가스 분출구 둘레는 구멍으로 비운다
const BASIN_FIELD = withHoles(
  [...BASIN.slice(0, 8), [742, 253.3], [744, 196], [560, 196], [556, 292], ...BASIN.slice(8)],
  [blob(VENT[0], VENT[1] - 6, 40)],
)
const FIELD = {
  mtnNW: { kind: 'mountain', points: withHoles(MTN_NW, SPOTS_NW), density: 0.7 },
  mtnSW: { kind: 'mountain', points: withHoles(MTN_SW, SPOTS_SW), density: 0.72 },
  mtnS: { kind: 'mountain', points: withHoles(MTN_S, SPOTS_S), density: 0.75 },
  // 동쪽의 성긴 봉우리 띠 (세계 지도는 트인 땅 — 옅게)
  mtnE: { kind: 'mountain', points: [[960, 300], [1080, 286], [1160, 330], [1160, 430], [1090, 470], [1000, 440], [950, 370]], density: 0.3 },
  basin: { kind: 'crystal', points: BASIN_FIELD, density: 0.6 },
}
const FIELD_ORDER = ['mtnNW', 'mtnSW', 'mtnS', 'mtnE', 'basin']
const TERRAIN = [
  ...FIELD_ORDER.map((k) => FIELD[k]),
  ...[...SPOTS_NW, ...SPOTS_SW, ...SPOTS_S].map((points) => ({ kind: 'crystal', points, density: 0.5 })),
]

/** 바로 이웃한 같은 칠은 한 path 로 — 칠하는 차례는 그대로 */
function compact(list) {
  const out = []
  for (const p of list) {
    const last = out[out.length - 1]
    if (last && !last.solo && !p.solo && last.cls === p.cls) last.d += p.d
    else out.push({ cls: p.cls, d: p.d, solo: p.solo })
  }
  return out.map(({ cls, d }) => ({ cls, d }))
}

CHILDMAPS.push({
  id: 'glasspool',
  size: [1333, 1000],
  glyphScale: 4,
  terrain: TERRAIN,
  parts: compact(parts),
  labels: [{ text: 'Glasspool', textKo: '거울연못', at: [LAKE_C[0], 478], size: 36, kind: 'water' }],
  subjects: {
    // 북쪽 고갯길로 들어선 코르 순례 무리 — 호수 북쪽 기슭의 맨땅
    'landbind-ritual': { at: SUBJ.ritual, size: 116 },
    // 호수 서남서쪽 들쭉날쭉한 봉우리 꼭대기 — 동쪽, 물속 유적을 내려다본다
    'ior-ruin-expedition': { at: SUBJ.expedition, size: 96 },
    // 동쪽 모서리 물가 — 서쪽 물을 향해 무릎 꿇는다
    'reckless-scholar': { at: SUBJ.scholar, size: 96 },
    // 남동쪽 기슭의 바위 위에 놓인 짐
    'adventuring-gear': { at: SUBJ.gear, size: 60 },
  },
  markAnchors: { 'ior-ruin': 'above' },
  focus: [LAKE_C[0], 560],
})
