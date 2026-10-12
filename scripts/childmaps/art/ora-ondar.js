// 오라 온다르 — 자식 지도 (아쿰 북동부, 세계 범위 x 2080–2316 · y 205–405, ×5).
// 시점: Zendikar Rising(2020) 이후 — ZNR 카드(Tajuru Blightblade, Khalni Ambush // Khalni Territory)가 여전히 무성하고 위험한
//       숲으로 그린다. 모양은 PG: Akoum(2010)과 The Art of Magic: Zendikar(2016)의 마지막 서술을 따른다.
// 공식: 결정 분지에서 우뚝 솟은 다섯 단 바위(PG 2010), 숲 한가운데의 큰 바위 언덕(2016), 단마다 다른 시대의 식물 — 거대한 꽃과 고사리,
//       가시 덩굴, 거대한 벌레잡이통풀과 파리지옥, 꼭대기 단의 kolya 나무 숲(PG 2010; 2016) — 돌 틈의 거처(PG 2010; 2016),
//       숲 한가운데 폭포 속에서 자라는 연꽃 같은 거대한 꽃 Khalni Heart(2016, 이름은 달지 않는다), 아쿰의 해안 절벽, 북쪽의 아쿰의 이빨.
// 해석: 다섯 단의 모양(세계 지도의 추정 단애선 그대로), 단마다 나눈 식물(꼭대기의 kolya 만 공식), 바위틈 거처의 수와 자리,
//       폭포(바위 무더기 위의 짧은 물줄기)·소(沼)·꽃의 모양과 자리, 맨땅의 결정 가시와 풀포기, 여덟 그림의 자리(Zendikar Farguide·Khalni Heart Expedition 둘레 숲의 빈터 포함).
// 그리지 않는 것: Khalni Stone, 헤드론, 집·지붕·성벽·다리·계단, 물길, 바다 안의 것, 여덟 그림 밖의 생물, 엘드라지·폐허.
// Khalni Heart 주의: 2016년 아트북의 마지막 서술('폭포 속, 숲 한가운데')대로 그렸을 뿐 2016년 이후의 모습은 알려지지 않았다.
//       옮겨 심기는 드루이드의 바람일 뿐이고, Any Cost(2015)의 'the relocated Khalni Heart'는 발라 게드의 새 꽃을 가리킨다
//       (아트북은 그 뒤에도 '아쿰에서 자라는 거대한 꽃'이라 쓴다). docs/reference.md 의 Khalni Heart 줄과 함께 손볼 것.

const { line, poly, smooth, rng, along, stack } = KIT
const r1 = (v) => Math.round(v * 10) / 10
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`
const P = (cls, d) => ({ cls, d })
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const D2R = Math.PI / 180
/** 짧은 빗금 하나 — 시작점에서 상대 좌표로 (파일을 가볍게) */
const tick = (x, y, dx, dy) => `M${Math.round(x)} ${Math.round(y)}l${r1(dx)} ${r1(dy)}`
/** 꺾은선(닫으면 다각형)을 상대 좌표로 — 작은 풀잎처럼 점이 많은 모양을 가볍게 */
function rel(pts, close) {
  let [cx, cy] = [r1(pts[0][0]), r1(pts[0][1])]
  let d = `M${cx} ${cy}l`
  for (let i = 1; i < pts.length; i++) {
    const nx = r1(pts[i][0])
    const ny = r1(pts[i][1])
    d += `${i > 1 ? ' ' : ''}${r1(nx - cx)} ${r1(ny - cy)}`
    cx = nx
    cy = ny
  }
  return close ? d + 'Z' : d
}

// ---------------------------------------------------------------- 세계 지도에서 가져온 선 (context.mjs, 자식 좌표)
// 숲 채색(forest-5)의 가장자리 — 이 선의 서쪽·남쪽이 숲이다 (바위 전체가 숲 안에 있다)
const FOREST_EDGE = [[749,1030],[795,1015],[836,1001],[873,987],[906,975],[934,962],[958,951],[978,940],[993,929],[1004,919],[1014,909],[1023,898],[1031,887],[1039,876],[1045,865],[1051,853],[1056,841],[1060,829],[1063,814],[1065,797],[1066,778],[1066,757],[1064,733],[1062,707],[1058,678],[1053,648],[1046,618],[1039,588],[1030,559],[1020,531],[1009,503],[997,475],[983,448],[968,421],[949,394],[928,366],[902,337],[873,307],[841,277],[806,246],[767,214],[725,182],[686,153],[651,127],[620,105],[592,86],[567,70],[545,58],[527,49],[513,43],[497,39],[479,36],[460,34],[440,34],[418,34],[395,36],[370,38],[344,42],[320,47],[297,52],[276,58],[257,64],[240,72],[224,80],[211,89],[199,99],[186,112],[172,128],[157,147],[141,169],[124,195],[106,223],[87,255],[66,290],[48,325],[33,359],[20,394],[8,428],[0,462],[-7,496],[-11,529],[-12,563],[-16,595],[-20,626],[-26,655]]
// 아쿰의 이빨 — 세계 지도의 북동쪽 끝 줄기(akoum-teeth-far-northeast, 추정). 남쪽 기슭만 틀 위 가장자리에 걸친다
const TEETH = [[642,90],[726,90],[810,60],[888,36],[960,-18],[1032,-60],[1092,-120],[990,-198],[906,-174],[840,-132],[762,-102],[696,-66],[624,-24]]
// 다섯 단의 가장자리 — 세계 지도의 akoum-ora-ondar-tier-1..5 (추정) 그대로. 모두 진행 방향의 오른쪽(-uy, ux)이 바깥(내리막)
const TIER1 = [[888,648],[864,564],[906,486],[870,408],[798,336],[732,264],[648,246],[564,270],[468,240],[372,276],[282,276],[210,348],[168,438],[222,522],[180,588],[132,654],[162,744],[240,798],[336,834],[420,864],[516,846],[612,882],[708,858],[792,816],[864,744]]
const TIER2 = [[840,456],[780,402],[714,336],[648,306],[564,330],[468,300],[378,336],[300,342],[252,396],[228,456]]
const TIER3 = [[798,738],[810,684],[792,600],[810,522],[762,456],[666,390],[564,390],[468,360],[378,396],[312,432],[282,516],[276,612],[276,666],[246,738]]
const TIER4 = [[744,498],[678,474],[594,456],[516,444],[432,456],[372,486],[342,522]]
const TIER5 = [[738,672],[726,588],[678,528],[594,516],[516,504],[432,522],[366,558],[336,630],[360,696],[420,732],[492,732],[570,720],[642,744],[702,720]]

// ---------------------------------------------------------------- 기하
/** KIT.smooth 와 같은 곡선(Catmull-Rom → 3차 베지에)을 촘촘한 꺾은선으로 — 그리기와 계산이 같은 선을 쓰게 */
function dense(pts, closed, seg = 12) {
  const n = pts.length
  const at = (i) => (closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)])
  const out = []
  const last = closed ? n : n - 1
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    for (let k = 0; k < seg; k++) {
      const t = k / seg
      const u = 1 - t
      const a = u * u * u
      const b = 3 * u * u * t
      const c = 3 * u * t * t
      const d = t * t * t
      out.push([a * p1[0] + b * c1[0] + c * c2[0] + d * p2[0], a * p1[1] + b * c1[1] + c * c2[1] + d * p2[1]])
    }
  }
  out.push(closed ? pts[0] : pts[n - 1])
  return out
}
/** 꺾은선이 스스로 엇갈려 생긴 고리를 잘라낸다 */
function trimLoop(pts) {
  const cross = (a, b, c, d) => {
    const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0])
    if (!den) return null
    const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den
    const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] : null
  }
  let out = pts
  for (let guard = 0; guard < 30; guard++) {
    let hit = null
    for (let i = 0; i < out.length - 1 && !hit; i++) {
      for (let j = Math.min(out.length - 2, i + 60); j > i + 1; j--) {
        const x = cross(out[i], out[i + 1], out[j], out[j + 1])
        if (x) {
          hit = [i, j, x]
          break
        }
      }
    }
    if (!hit) break
    const [i, j, x] = hit
    out = [...out.slice(0, i + 1), x, ...out.slice(j + 1)]
  }
  return out
}
/** 점에서 방향 (dx, dy) 로 쏜 반직선이 꺾은선과 처음 만나는 거리 */
function rayHit(p, dx, dy, pts) {
  let best = Infinity
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const ex = b[0] - a[0]
    const ey = b[1] - a[1]
    const den = dx * ey - dy * ex
    if (Math.abs(den) < 1e-9) continue
    const t = ((a[0] - p[0]) * ey - (a[1] - p[1]) * ex) / den
    const u = ((a[0] - p[0]) * dy - (a[1] - p[1]) * dx) / den
    if (t > 0.5 && u >= 0 && u <= 1) best = Math.min(best, t)
  }
  return best
}
/** 짝홀 규칙의 구멍 — 바깥 고리에 구멍 고리들을 이어 붙인다 */
function withHoles(outer, holes) {
  const ring = [...outer, outer[0]]
  for (const h of holes) ring.push(...h, h[0], outer[0])
  return ring
}

// ---------------------------------------------------------------- 해안 벼랑 (세계 지도의 아쿰 해안 빗금 띠 그대로)
/**
 * 붉은 해안 벼랑 (The Art of Magic 'The Coastal Cliffs', Stone and Blood 'the red cliffs of Akoum') — 세계 지도의 절벽 해안
 * (src/map/terrain.ts cliffHachure — 아쿰의 다듬은 해안(land.smooth)에서 9 단위 안쪽의 절벽 위 선과 3.4 단위마다의 빗금, 시드 'cliff:akoum')을
 * 같은 계산으로 미리 구해 자식 지도 좌표로 옮긴 것. 가장자리 띠에서 세계 지도의 빗금과 한 선으로 겹친다 (해안선에서 따로 민 선은
 * 세계 지도의 선과 몇 단위 어긋나 북서쪽 만과 북동쪽 만의 띠에서 두 겹으로 보였다). 세계 지도 해안·절벽 식이 바뀌면 같은 식으로 다시 구한다.
 */
const WORLD_CLIFF_TOP = [[[1245.5,396],[1229,412.5],[1211,426],[1192,437],[1155.5,443],[1130,441.5],[1113,439],[1092,435],[1076,430.5],[1059.5,426.5],[1040.5,421],[1024.5,415.5],[1008,410.5],[992,405],[973,398],[957.5,391.5],[937,382.5],[922,374.5],[898,359],[886,347.5],[867.5,307.5],[869,276],[878,249.5],[890.5,228],[903.5,209.5],[914.5,196.5],[920.5,186],[927.5,175],[935.5,160],[942,147.5],[949,132],[956,116.5],[961.5,103],[967.5,87],[974.5,69.5],[981.5,54],[990,35],[998,20],[1012,-0.5],[1042,-24],[1084,-27.5],[1108,-33],[1112,-49.5],[1116,-65.5]],[[588,-61],[574.5,-51],[562.5,-41.5],[549.5,-30.5],[536.5,-20],[525.5,-10.5],[513.5,1],[501,12.5],[483.5,26.5],[469.5,36.5],[449.5,49.5],[434,57.5],[410,67.5],[393.5,72],[366,75.5],[349,76],[325.5,74],[300.5,68],[274,56],[267.5,52.5],[253.5,62],[243.5,68.5],[230,79],[217,90],[204,100.5],[191,111.5],[180,121.5],[167.5,133],[155,144.5],[142.5,156],[130,167.5],[114.5,180.5],[101.5,191],[88,202],[74.5,212.5],[61.5,223],[44.5,235.5],[30.5,245],[16,254],[2,263.5],[-12.5,272.5],[-31.5,283.5],[-46.5,291],[-62,299]],[[555,1058],[577.5,1049],[597.5,1043.5],[614,1040],[633.5,1036.5],[650,1034],[674,1031.5],[691,1031.5],[708,1031.5],[731,1034],[748,1036.5],[770,1041],[786,1045.5],[802.5,1050],[823,1057.5],[839,1064],[854.5,1070]],[[964,1066.5],[973,1060],[982,1053.5],[994.5,1042],[1002.5,1033.5],[1013.5,1020.5],[1017.5,1012.5],[1021,1005.5],[1026.5,989.5],[1027,981.5],[1028.5,972.5],[1027.5,955.5],[1030,926.5],[1033.5,910],[1048,881.5],[1069,858],[1093,841],[1108.5,834],[1114.5,831.5],[1128,821.5],[1134,815.5],[1145.5,803],[1152,795],[1161.5,781],[1168,771.5],[1175.5,756],[1183.5,741],[1193.5,723],[1202.5,708.5],[1215,690],[1226,676.5],[1243,658.5]]]
// [x, y, dx, dy] — 절벽 위 선의 점에서 해안 쪽으로 내리는 빗금
const WORLD_CLIFF_TICKS = [[1245.5,396,-30.5,-26],[1229,412.5,-19.5,-22],[1211,426,-19.5,-28.5],[1192,437,-12.5,-23],[1155.5,443,-1,-29.5],[1130,441.5,5.5,-35.5],[1113,439,4.5,-29],[1092,435,9,-34.5],[1076,430.5,10,-38],[1059.5,426.5,7.5,-30],[1040.5,421,9,-28],[1024.5,415.5,11.5,-35.5],[1008,410.5,9.5,-28.5],[992,405,9,-28.5],[973,398,11,-27],[957.5,391.5,11,-27],[937,382.5,19,-34.5],[922,374.5,14,-25.5],[898,359,17,-18],[886,347.5,20,-21.5],[867.5,307.5,31,-6],[869,276,32,4],[878,249.5,33,13],[890.5,228,22,13.5],[903.5,209.5,30.5,24.5],[914.5,196.5,27.5,22.5],[920.5,186,31,20],[927.5,175,32,17],[935.5,160,28.5,15],[942,147.5,31,14],[949,132,28.5,13],[956,116.5,36.5,16.5],[961.5,103,28.5,11],[967.5,87,30.5,11.5],[974.5,69.5,34.5,15.5],[981.5,54,32.5,14.5],[990,35,26,14],[998,20,33.5,18.5],[1012,-0.5,27.5,21.5],[1042,-24,11.5,26],[1084,-27.5,-6,38],[1108,-33,35,8.5],[1112,-49.5,38.5,9.5],[1116,-65.5,33.5,7.5],[588,-61,-22.5,-30],[574.5,-51,-22.5,-30],[562.5,-41.5,-23.5,-29],[549.5,-30.5,-19.5,-23.5],[536.5,-20,-18,-21.5],[525.5,-10.5,-23,-24.5],[513.5,1,-17.5,-18.5],[501,12.5,-19.5,-21],[483.5,26.5,-18,-24.5],[469.5,36.5,-22,-30],[449.5,49.5,-16,-31],[434,57.5,-18,-35],[410,67.5,-9.5,-34.5],[393.5,72,-10,-37],[366,75.5,-0.5,-28],[349,76,-0.5,-33.5],[325.5,74,3.5,-29],[300.5,68,11,-33.5],[274,56,19,-27.5],[267.5,52.5,-16.5,-25],[253.5,62,-16,-24.5],[243.5,68.5,-25,-30.5],[230,79,-18.5,-22.5],[217,90,-24.5,-30],[204,100.5,-17.5,-21.5],[191,111.5,-16.5,-20],[180,121.5,-21,-22.5],[167.5,133,-24,-26],[155,144.5,-26,-28.5],[142.5,156,-25.5,-28],[130,167.5,-21.5,-23.5],[114.5,180.5,-25,-31.5],[101.5,191,-20,-25.5],[88,202,-15.5,-19.5],[74.5,212.5,-17.5,-22.5],[61.5,223,-22.5,-28.5],[44.5,235.5,-17.5,-27],[30.5,245,-16,-24.5],[16,254,-21.5,-33],[2,263.5,-17,-26],[-12.5,272.5,-16,-25],[-31.5,283.5,-12.5,-24.5],[-46.5,291,-12.5,-25],[-62,299,-13.5,-26.5],[555,1058,15,31],[577.5,1049,11,37.5],[597.5,1043.5,5.5,28.5],[614,1040,6.5,33],[633.5,1036.5,5.5,36],[650,1034,4,27.5],[674,1031.5,-0.5,40],[691,1031.5,-0.5,39],[708,1031.5,0,26],[731,1034,-5,32.5],[748,1036.5,-6,39.5],[770,1041,-9.5,34.5],[786,1045.5,-8,29.5],[802.5,1050,-9.5,35],[823,1057.5,-12,30],[839,1064,-14,36],[854.5,1070,-13,33],[964,1066.5,13,24.5],[973,1060,20.5,28.5],[982,1053.5,21.5,23.5],[994.5,1042,20.5,22.5],[1002.5,1033.5,21.5,18.5],[1013.5,1020.5,29.5,25.5],[1017.5,1012.5,32.5,18.5],[1021,1005.5,24.5,8],[1026.5,989.5,30,10],[1027,981.5,39,5],[1028.5,972.5,25.5,-1.5],[1027.5,955.5,39.5,-2],[1030,926.5,28,6],[1033.5,910,32,7],[1048,881.5,32.5,20],[1069,858,18,22.5],[1093,841,11,26],[1108.5,834,11.5,27],[1114.5,831.5,22.5,30],[1128,821.5,20,27],[1134,815.5,23,21],[1145.5,803,21.5,19.5],[1152,795,27,18],[1161.5,781,33,22],[1168,771.5,25,12.5],[1175.5,756,32,16.5],[1183.5,741,29.5,15],[1193.5,723,27,16.5],[1202.5,708.5,33,20.5],[1215,690,23.5,19],[1226,676.5,22,17.5],[1243,658.5,20.5,23.5]]
function worldCliffs() {
  let d = ''
  for (const run of WORLD_CLIFF_TOP) d += KIT.line(run)
  for (const [x, y, dx, dy] of WORLD_CLIFF_TICKS) d += `M${r1(x)} ${r1(y)}l${r1(dx)} ${r1(dy)}`
  return [P('hatch', d)]
}

// ---------------------------------------------------------------- 다섯 단의 벼랑
/**
 * 단 하나의 가장자리 — 굵은 잉크 테두리, 바깥(내리막)으로 떨어지는 바위 면.
 * 북쪽을 보는 곳은 세계 지도처럼 테두리에 수직인 짧은 빗금, 남쪽을 보는 곳은 옛 지도의 입면처럼 아래로 내린 바위 면
 * (PG: Akoum 'juts dramatically'). o.hach: 북쪽 빗금 길이, o.depth(x): 남쪽 바위 면 깊이.
 * 돌려주는 것: parts, 남쪽 바위 면의 [윗점, 아랫점] 목록(거처 자리), 바깥 둘레(숲 기호를 비울 고리)
 */
function tier(raw, closed, o) {
  const pts = dense(raw, closed)
  const rand = rng(o.seed)
  const S = along(pts, o.step ?? 6)
  const n = S.length
  const idx = (i) => (closed ? (i + n) % n : clamp(i, 0, n - 1))
  // 진행 방향을 이웃 몇 점으로 고르게 — 빗금이 모퉁이에서 갑자기 꺾이지 않게
  const U = S.map((_, i) => {
    let ux = 0
    let uy = 0
    for (let k = -3; k <= 3; k++) {
      ux += S[idx(i + k)][1][0]
      uy += S[idx(i + k)][1][1]
    }
    const l = Math.hypot(ux, uy) || 1
    return [ux / l, uy / l]
  })
  let hatch = ''
  const top = []
  const bot = []
  const faces = []
  const hull = []
  let v = 0.5
  S.forEach(([[x, y]], i) => {
    const [ux, uy] = U[i]
    const nx = -uy
    const ny = ux
    let w = clamp((ny - 0.38) / 0.42, 0, 1)
    w = w * w * (3 - 2 * w)
    let dx = nx * (1 - w)
    let dy = ny * (1 - w) + w
    const dl = Math.hypot(dx, dy) || 1
    dx /= dl
    dy /= dl
    // 바깥쪽이 오목한 모퉁이(선이 바깥으로 굽는 곳)에서는 빗금이 모여 엇갈리므로 짧게
    const [ax, ay] = U[idx(i - 4)]
    const [bx, by] = U[idx(i + 4)]
    const turn = ax * by - ay * bx
    const squeeze = turn > 0 ? clamp(1 - turn * 1.5, 0.35, 1) : 1
    const depth = typeof o.depth === 'function' ? o.depth(x, y) : o.depth
    // 열린 단의 두 끝은 띠를 끝점 쪽으로 좁혀 닫는다 (네모난 끝 자름이 크게 확대하면 드러난다)
    const endF = closed ? 1 : clamp(Math.min(i, n - 1 - i) / 6, 0.12, 1)
    const L = (o.hach + (depth - o.hach) * w) * squeeze * (0.4 + 0.6 * endF)
    v = v * 0.55 + rand() * 0.45 // 천천히 흔들리는 바위 면 밑선
    const base = L * (0.72 + 0.28 * v)
    const len = w > 0.3 ? base * (0.8 + rand() * 0.3) : L * (0.6 + rand() * 0.4)
    hatch += tick(x, y, dx * len, dy * len)
    hull.push([x + dx * L, y + dy * L])
    // 바위 면(그늘 띠) — 북쪽의 짧은 빗금 밑에도 깔아, 단마다 바위 띠와 초록 바닥이 번갈아 읽히게
    const k = (w > 0.05 ? base * 0.95 : L * (0.55 + 0.25 * v)) * endF
    top.push([x, y])
    bot.push([x + dx * k, y + dy * k])
    if (w > 0.85) faces.push({ top: [x, y], bot: [x + dx * base * 0.95, y + dy * base * 0.95] })
  })
  // 그늘 띠의 위·아래 변 모두 점을 다 쓴다 (둘에 하나만 쓰면 크게 확대했을 때 곧은 마디가 보인다)
  const face = poly([...top, ...[...bot].reverse()])
  return { parts: [P('shade', face), P('hatch', hatch), P('ink-bold', smooth(raw, closed))], faces, hull, pts }
}

// 남쪽의 합쳐진 벽(2–5단이 남쪽에서 한 벽)과 가장 바깥 1단 벽이 가장 높다. 서남쪽 끝은 낮아진다
const T1 = tier(TIER1, true, { seed: 't1', hach: 26, depth: (x) => 74 - Math.max(0, 300 - x) * 0.22 })
const T2 = tier(TIER2, false, { seed: 't2', hach: 17, depth: 30 })
const T3 = tier(TIER3, false, { seed: 't3', hach: 17, depth: 30 })
const T4 = tier(TIER4, false, { seed: 't4', hach: 17, depth: 30 })
const T5 = tier(TIER5, true, { seed: 't5', hach: 17, depth: (x) => 46 - Math.max(0, 430 - x) * 0.25 })

// ---------------------------------------------------------------- 돌 틈의 거처 (PG 2010 'homes into the stone crannies'; 2016 'among the stone crannies')
/** 바위 면에 판 작은 아치 입구, 그 밑의 짧은 턱. 집·지붕은 없다 */
function cranny(x, y, s, o = {}) {
  s += 1.5
  const w = s * 0.62
  const h = s
  const mouth = `M${pt([x - w / 2, y])}V${r1(y - h + w / 2)}A${r1(w / 2)} ${r1(w / 2)} 0 0 1 ${pt([x + w / 2, y - h + w / 2])}V${r1(y)}Z`
  const out = [P('dark', mouth)]
  let ink = line([[x - w * 1.05, y + 0.8], [x + w * 1.15, y + 0.8]])
  if (o.win) {
    // 작은 아치 창 — 입구와 같은 꼴로 (네모난 점은 멀리서 얼룩처럼 보인다)
    const wx = x + o.win * s * 1.2
    const wb = y - h * 0.34
    const ww = s * 0.3
    const wh = s * 0.46
    out.push(P('dark', `M${pt([wx - ww / 2, wb])}V${r1(wb - wh + ww / 2)}A${r1(ww / 2)} ${r1(ww / 2)} 0 0 1 ${pt([wx + ww / 2, wb - wh + ww / 2])}V${r1(wb)}Z`))
  }
  if (o.ledge) ink += line([[x + w * 1.15, y + 0.8], [x + w * 1.15 + o.ledge, y + 0.8 + o.ledge * 0.12]])
  out.push(P('ink', ink))
  return out
}
/** 바위 면 목록에서 x 에 가장 가까운 면, 깊이의 비율 t 자리 */
function onFace(faces, x, t) {
  let best = faces[0]
  for (const f of faces) if (Math.abs(f.top[0] - x) < Math.abs(best.top[0] - x)) best = f
  return [best.top[0] + (best.bot[0] - best.top[0]) * t, best.top[1] + (best.bot[1] - best.top[1]) * t]
}

// ---------------------------------------------------------------- 식물 (모두 세계 지도 나무보다 작은 손그림, 이름 없음)
/** 2차 베지에 위의 점 */
const qb = (a, c, b, t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]]
/** 휘어진 잎 하나 — 밑에서 끝으로 가늘어지는 창 모양, zig 이면 가장자리가 톱니(고사리 잎) */
function leaf(base, ctrl, tip, wid, zig, n = 6) {
  const sp = []
  for (let k = 0; k <= n; k++) sp.push(qb(base, ctrl, tip, k / n))
  const L = []
  const R = []
  for (let k = 0; k <= n; k++) {
    const a = sp[Math.max(0, k - 1)]
    const b = sp[Math.min(n, k + 1)]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const nx = -(b[1] - a[1]) / len
    const ny = (b[0] - a[0]) / len
    const t = k / n
    const ww = wid * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (zig ? (k % 2 ? 1 : 0.4) : 1)
    L.push([sp[k][0] + nx * ww, sp[k][1] + ny * ww])
    R.push([sp[k][0] - nx * ww, sp[k][1] - ny * ww])
  }
  return { body: rel([...L, ...R.reverse()], true), rib: rel(sp.slice(0, n)) }
}
/** 고사리 덤불 — 위로 부채처럼 펴져 끝이 처지는 잎 몇 장 (art book 'Thick clusters of ferns cover the ground') */
function fern(x, y, s, seed) {
  const rand = rng(seed)
  const n = 4 + Math.floor(rand() * 2)
  let body = ''
  let rib = ''
  for (let i = 0; i < n; i++) {
    const a = (-162 + (144 * (i + 0.5)) / n + (rand() - 0.5) * 14) * D2R
    const L = s * (0.75 + rand() * 0.3) * (1 - Math.abs(Math.cos(a)) * 0.2)
    const tip = [x + Math.cos(a) * L, y + Math.sin(a) * L * 0.62 + L * 0.12]
    const ctrl = [x + Math.cos(a) * L * 0.42, y + Math.sin(a) * L * 1.05]
    const lf = leaf([x, y], ctrl, tip, s * 0.12, true, 6)
    body += lf.body
    rib += lf.rib
  }
  return [P('forest', body), P('hatch', body + rib)]
}
/** 별 모양 큰 꽃 — 줄기 위의 다섯 갈래 꽃, 가운데가 빛난다 (Khalni Garden 그림의 'star-shaped blooms with glowing centres';
 *  PG 'gigantic flowers', 2016 'gigantic flowers rising above them to catch the sun') */
function starFlower(x, y, s, seed) {
  const rand = rng(seed)
  const lean = (rand() - 0.5) * s * 0.3
  const top = [x + lean, y - s]
  const stem = smooth([[x, y], [x + lean * 0.3, y - s * 0.5], top])
  const r = s * 0.3
  const ri = r * 0.42
  const rot = rand() * 72
  const star = []
  for (let k = 0; k < 10; k++) {
    const a = (rot + k * 36 - 90) * D2R
    const rr = k % 2 ? ri : r
    star.push([top[0] + Math.cos(a) * rr, top[1] + Math.sin(a) * rr * 0.72])
  }
  const lf1 = leaf([x + lean * 0.15, y - s * 0.3], [x - s * 0.2, y - s * 0.42], [x - s * 0.34, y - s * 0.36], s * 0.06, false)
  const lf2 = leaf([x + lean * 0.25, y - s * 0.45], [x + s * 0.2, y - s * 0.58], [x + s * 0.32, y - s * 0.5], s * 0.06, false)
  const core = `M${pt([top[0] - r * 0.22, top[1]])}A${r1(r * 0.22)} ${r1(r * 0.17)} 0 1 0 ${pt([top[0] + r * 0.22, top[1]])}A${r1(r * 0.22)} ${r1(r * 0.17)} 0 1 0 ${pt([top[0] - r * 0.22, top[1]])}Z`
  const shadeHalf = poly([top, ...star.filter((p) => p[0] > top[0] + 0.5)])
  return [P('forest', lf1.body + lf2.body), P('hatch', lf1.body + lf2.body), P('ink', stem), P('fill', poly(star)), P('shade', shadeHalf), P('gold', core), P('ink', poly(star))]
}
/** 가시 덩굴이 감아 오른 높은 줄기 (PG 'thorned vines'; 2016 'Thorny vines twist up the stems of the taller plants') */
function thornVine(x, y, s, seed) {
  const rand = rng(seed)
  const lean = (rand() - 0.5) * s * 0.18
  const stemPts = [[x, y], [x + lean * 0.5, y - s * 0.5], [x + lean, y - s]]
  const stem = smooth(stemPts)
  let vine = ''
  let thorns = ''
  const amp = s * 0.11
  const vp = []
  for (let k = 0; k <= 24; k++) {
    const t = k / 24
    const cx = x + lean * t
    const cy = y - s * 0.95 * t
    vp.push([cx + Math.sin(t * Math.PI * 4.2 + 0.6) * amp * (1 - t * 0.35), cy])
  }
  vine = smooth(vp)
  for (let k = 2; k < 24; k += 3) {
    const [px, py] = vp[k]
    const side = px > x + lean * (k / 24) ? 1 : -1
    thorns += line([[px, py], [px + side * s * 0.07, py - s * 0.04]])
  }
  // 꼭대기 잎 — 작은 둥근 잎 둘
  const T = [x + lean, y - s]
  const lf1 = leaf(T, [T[0] - s * 0.12, T[1] - s * 0.14], [T[0] - s * 0.24, T[1] - s * 0.08], s * 0.07, false)
  const lf2 = leaf(T, [T[0] + s * 0.1, T[1] - s * 0.16], [T[0] + s * 0.22, T[1] - s * 0.12], s * 0.07, false)
  return [P('ink', stem), P('forest', lf1.body + lf2.body), P('ink', lf1.body + lf2.body), P('ink', vine), P('hatch', thorns)]
}
/** 거대한 벌레잡이통풀 — 불룩한 항아리, 벌어진 입, 위에 걸린 뚜껑 (PG 'giant pitcher plants'; Khalni Garden 그림) */
function pitcher(x, y, s, flip = 1) {
  const w = s * 0.5
  const F = ([px, py]) => [x + px * flip, y + py]
  const body = smooth([[-0.16 * w, 0], [-0.46 * w, -0.25 * s], [-0.48 * w, -0.5 * s], [-0.28 * w, -0.74 * s], [-0.36 * w, -0.86 * s], [0.38 * w, -0.86 * s], [0.3 * w, -0.74 * s], [0.5 * w, -0.5 * s], [0.46 * w, -0.25 * s], [0.16 * w, 0]].map(F), true)
  const mouthC = F([0.01 * w, -0.86 * s])
  const mouth = `M${pt([mouthC[0] - 0.35 * w, mouthC[1]])}A${r1(0.35 * w)} ${r1(0.07 * s)} 0 1 0 ${pt([mouthC[0] + 0.35 * w, mouthC[1]])}A${r1(0.35 * w)} ${r1(0.07 * s)} 0 1 0 ${pt([mouthC[0] - 0.35 * w, mouthC[1]])}Z`
  const lid = smooth([F([0.3 * w, -0.88 * s]), F([0.42 * w, -1.06 * s]), F([0.1 * w, -1.12 * s]), F([-0.12 * w, -1.02 * s]), F([0.12 * w, -0.94 * s])], true)
  const veins = line([F([0.22 * w, -0.2 * s]), F([0.3 * w, -0.5 * s]), F([0.18 * w, -0.74 * s])]) + line([F([0.36 * w, -0.3 * s]), F([0.4 * w, -0.52 * s])])
  const lf = leaf(F([0, 0]), F([0.6 * w, -0.08 * s]), F([0.95 * w, -0.02 * s]), s * 0.06, false)
  return [P('forest', body + lid + lf.body), P('dark', mouth), P('hatch', veins), P('ink', body + lid + lf.body)]
}
/** 파리지옥 — 짧은 줄기 위에 벌린 두 턱, 가장자리의 가시 이 (PG 'flytraps'; Khalni Garden 그림의 벌린 꼬투리) */
function flytrap(x, y, s, seed) {
  const rand = rng(seed)
  const H = [x, y - s * 0.38]
  const jaw = (side) => {
    const a = (-90 + side * (38 + rand() * 10)) * D2R
    const L = s * 0.62
    const tip = [H[0] + Math.cos(a) * L, H[1] + Math.sin(a) * L]
    const nx = -Math.sin(a) * side
    const ny = Math.cos(a) * side
    const c1 = [H[0] + Math.cos(a) * L * 0.5 + nx * s * 0.26, H[1] + Math.sin(a) * L * 0.5 + ny * s * 0.26]
    const shape = `M${pt(H)}Q${pt(c1)} ${pt(tip)}L${pt(H)}Z`
    let teeth = ''
    for (let k = 1; k <= 4; k++) {
      const t = k / 5
      const rimP = [H[0] + (tip[0] - H[0]) * t, H[1] + (tip[1] - H[1]) * t]
      teeth += line([rimP, [rimP[0] - nx * s * 0.13, rimP[1] - ny * s * 0.13]])
    }
    return { shape, teeth }
  }
  const L = jaw(-1)
  const R = jaw(1)
  const stem = line([[x, y], [x, H[1]]])
  const lf = leaf([x, y], [x - s * 0.3, y - s * 0.1], [x - s * 0.48, y - s * 0.02], s * 0.06, false)
  return [P('ink', stem), P('forest', L.shape + R.shape + lf.body), P('ink', L.shape + R.shape + lf.body + L.teeth + R.teeth)]
}
/**
 * kolya 나무 — 가는 줄기 위에 좁은 잎 다발, 그 밑에 매달린 작은 열매 (2016 'The small kolya trees, their slender trunks topped with
 * narrow leaves hung with glowing green fruit, are the tallest plants here'; Zendikar Resurgent 'slender trunk')
 */
function kolya(x, y, h, seed) {
  const rand = rng(seed)
  const lean = (rand() - 0.5) * h * 0.16
  const T = [x + lean, y - h * 0.66]
  const trunk = smooth([[x, y], [x + lean * 0.35 + (rand() - 0.5) * 2, y - h * 0.34], T])
  const trunk2 = smooth([[x + 1.6, y], [x + lean * 0.35 + 1.3, y - h * 0.34], [T[0] + 0.8, T[1] + 2]])
  let leaves = ''
  const n = 8
  for (let i = 0; i < n; i++) {
    const a = (-176 + (172 * i) / (n - 1) + (rand() - 0.5) * 10) * D2R
    const L = h * (0.28 + rand() * 0.1) * (1 - Math.abs(Math.cos(a)) * 0.12)
    const tip = [T[0] + Math.cos(a) * L, T[1] + Math.sin(a) * L * 0.8 + L * 0.28]
    const ctrl = [T[0] + Math.cos(a) * L * 0.5, T[1] + Math.sin(a) * L * 0.85]
    leaves += leaf(T, ctrl, tip, h * 0.035, false, 4).body
  }
  let fruit = ''
  let stalks = ''
  const nf = 3 + Math.floor(rand() * 2)
  for (let k = 0; k < nf; k++) {
    const fx = T[0] + (k - (nf - 1) / 2) * h * 0.11 + (rand() - 0.5) * 2
    const fy = T[1] + h * (0.1 + rand() * 0.06)
    const rr = h * 0.042
    stalks += line([[fx, T[1] + 2], [fx, fy - rr]])
    fruit += `M${pt([fx - rr, fy])}A${r1(rr)} ${r1(rr * 1.25)} 0 1 0 ${pt([fx + rr, fy])}A${r1(rr)} ${r1(rr * 1.25)} 0 1 0 ${pt([fx - rr, fy])}Z`
  }
  // 열매는 '빛나는 초록 열매'(2016) — 잎과 같은 초록으로
  return [P('ink', trunk), P('hatch', trunk2), P('forest', leaves), P('ink', leaves), P('hatch', stalks), P('fill', fruit), P('forest', fruit), P('ink', fruit)]
}

// ---------------------------------------------------------------- Khalni Heart — 폭포 속의 연꽃 같은 거대한 꽃 (2016, 이름 없음)
/** 뾰족한 꽃잎 하나 — 밑점 B 에서 각도 a 로 길이 L, 너비 W */
function petal(B, a, L, W) {
  const dx = Math.cos(a)
  const dy = Math.sin(a)
  const nx = -dy
  const ny = dx
  const tip = [B[0] + dx * L, B[1] + dy * L]
  const c1 = [B[0] + dx * L * 0.42 + nx * W * 0.78, B[1] + dy * L * 0.42 + ny * W * 0.78]
  const c2 = [B[0] + dx * L * 0.42 - nx * W * 0.78, B[1] + dy * L * 0.42 - ny * W * 0.78]
  return { d: `M${pt(B)}Q${pt(c1)} ${pt(tip)}Q${pt(c2)} ${pt(B)}Z`, rib: line([[B[0] + dx * L * 0.12, B[1] + dy * L * 0.12], [B[0] + dx * L * 0.78, B[1] + dy * L * 0.78]]), tip }
}
/** 거대한 꽃 — 소(沼) 가운데 바위에서 솟아 뾰족한 꽃잎을 활짝 연다. 가운데가 빛나고, 가는 곁줄기 둘이 감겨 올라 봉오리를 단다
 *  (Khalni Heart Expedition 그림, PG: Akoum·Nissa's Quest 에 실린 그 꽃의 모습). (x, y) 는 바위 밑, H 는 온 높이 */
function lotus(x, y, H) {
  const out = []
  // 소 가운데 바위
  out.push(...KIT.rocks(x, y + 1, H * 0.1, 2, 'heart-rock'))
  // 곁줄기 둘 — 바위에서 바깥으로 감겨 올라 봉오리
  const side = (s) => {
    const S0 = [x + s * 4, y - 6]
    const bud = [x + s * H * 0.5, y - H * 0.5]
    const d = `M${pt(S0)}C${pt([x + s * H * 0.12, y - H * 0.3])} ${pt([x + s * H * 0.56, y - H * 0.12])} ${pt([bud[0] - s * 1, bud[1] + 6])}`
    const b = petal([bud[0] - s * 1, bud[1] + 6], -90 * D2R + s * 8 * D2R, H * 0.16, H * 0.085)
    return { stem: d, bud: b.d, rib: b.rib }
  }
  const sl = side(-1)
  const sr = side(1)
  out.push(P('ink', sl.stem + sr.stem), P('fill', sl.bud + sr.bud), P('forest', sl.bud + sr.bud), P('hatch', sl.rib + sr.rib), P('ink', sl.bud + sr.bud))
  // 줄기
  const C = [x, y - H * 0.3]
  out.push(P('ink', line([[x - 2, y - 4], [C[0] - 2, C[1] + 4]]) + line([[x + 2, y - 4], [C[0] + 2, C[1] + 4]])))
  // 뒷줄 꽃잎 (높고 좁다) → 빛나는 가운데 → 앞줄 꽃잎 (넓게 벌어진다)
  const back = [-90, -112, -68, -132, -48].map((deg, i) => petal(C, deg * D2R, H * (i === 0 ? 0.7 : i < 3 ? 0.64 : 0.52), H * 0.15))
  out.push(P('fill', back.map((p) => p.d).join('')), P('shade', back.filter((_, i) => i === 2 || i === 4).map((p) => p.d).join('')), P('hatch', back.map((p) => p.rib).join('')), P('ink', back.map((p) => p.d).join('')))
  // 빛나는 가운데 (금빛은 아주 작게) — 둘레로 가는 빛살
  const g = [x, C[1] - H * 0.2]
  const gr = H * 0.085
  out.push(P('gold', `M${pt([g[0] - gr, g[1]])}A${r1(gr)} ${r1(gr * 0.6)} 0 1 0 ${pt([g[0] + gr, g[1]])}A${r1(gr)} ${r1(gr * 0.6)} 0 1 0 ${pt([g[0] - gr, g[1]])}Z`))
  let rays = ''
  for (let k = 0; k < 7; k++) {
    const a = (-160 + k * 23.3) * D2R
    rays += line([[g[0] + Math.cos(a) * gr * 1.35, g[1] + Math.sin(a) * gr * 0.85], [g[0] + Math.cos(a) * gr * 2.1, g[1] + Math.sin(a) * gr * 1.4]])
  }
  out.push(P('hatch', rays))
  // 앞줄은 가운데를 비워, 빛나는 가운데가 앞줄 꽃잎 사이로 보이게 한다
  const front = [[-118, 0.46, 0.16], [-62, 0.46, 0.16], [-152, 0.44, 0.13], [-28, 0.44, 0.13]].map(([deg, l, w]) => petal(C, deg * D2R, H * l, H * w))
  out.push(P('fill', front.map((p) => p.d).join('')), P('shade', [front[1], front[3]].map((p) => p.d).join('')), P('hatch', front.map((p) => p.rib).join('')), P('ink-bold', front.map((p) => p.d).join('')))
  return out
}
/** 둥근 돌 — KIT.rocks 를 돌 빛으로 */
const stoneRocks = (x, y, size, n, seed) => KIT.rocks(x, y, size, n, seed).map((p) => (p.cls === 'fill' ? P('stone', p.d) : p))
/** 바위 무더기 위로 짧게 쏟아지는 넓은 폭포와 그 밑의 소 (2016 'in the midst of a waterfall'). 이어진 턱이 아니라 둥근 돌 무더기다
 *  — 여섯째 단으로 읽히지 않게. 물은 소에서 그친다(나가는 물길 없음) */
function heart(cx, cy) {
  const out = []
  const top = cy - 60
  const bot = cy - 13
  // 폭포 — 돌 틈 셋에서 소로 쏟아지는 물줄기 (가운데 줄기는 꽃 뒤). 물줄기 윗끝은 바위 무더기 밑에 숨겨, 돌 틈에서 물이
  // 넘쳐 나오게 한다 (윗끝에 테두리를 두르면 기둥처럼 읽힌다). 옆선과 안쪽 물살만 물빛 잉크로
  const rand = rng('fall')
  let fill = ''
  let lines = ''
  for (const [ox, w] of [[-31, 15], [0, 18], [31, 15]]) {
    const x0 = cx + ox
    const y0 = top - 3 + Math.abs(ox) * 0.12
    const sx = ox * 0.08
    const L = [[x0 - w / 2, y0], [x0 - w * 0.56 + sx * 0.5, (y0 + bot) / 2], [x0 - w * 0.64 + sx, bot]]
    const Rr = [[x0 + w / 2, y0], [x0 + w * 0.56 + sx * 0.5, (y0 + bot) / 2], [x0 + w * 0.64 + sx, bot]]
    fill += poly([...L, ...[...Rr].reverse()])
    lines += line(L) + line(Rr)
    for (let k = 0; k < 3; k++) {
      const t = (k + 0.5) / 3
      const xt = x0 - w * 0.4 + w * 0.8 * t
      const xb = x0 - w * 0.55 + w * 1.1 * t + sx
      lines += `M${pt([xt, y0 + 6 + rand() * 4])}Q${pt([(xt + xb) / 2 + (rand() - 0.5) * 2.4, (y0 + bot) / 2])} ${pt([xb, bot - 1 - rand() * 3])}`
    }
  }
  out.push(P('fill', fill), P('sea', fill), P('sea-ink', lines))
  // 뒤쪽 바위 무더기 — 둥근 돌을 낮게 쌓은 둔덕. 물줄기 윗끝을 덮는다
  out.push(...stoneRocks(cx - 2, top - 8, 12, 3, 'heap-g'))
  out.push(...stoneRocks(cx - 46, top + 6, 14, 3, 'heap-a'))
  out.push(...stoneRocks(cx + 46, top + 6, 14, 3, 'heap-b'))
  out.push(...stoneRocks(cx - 15, top - 1, 13, 3, 'heap-c'))
  out.push(...stoneRocks(cx + 16, top, 13, 2, 'heap-f'))
  // 폭포 양옆 앞쪽 돌
  out.push(...stoneRocks(cx - 60, cy - 20, 12, 2, 'heap-d'))
  out.push(...stoneRocks(cx + 50, cy - 21, 12, 2, 'heap-e'))
  // 소 — 물 채움과 잔물결
  const pool = []
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2
    const wob = 1 + Math.sin(a * 3 + 0.7) * 0.05
    pool.push([cx + Math.cos(a) * 62 * wob, cy + Math.sin(a) * 23 * wob])
  }
  out.push(P('fill', smooth(pool, true)), ...KIT.pool(pool, { ripples: false }))
  // 물줄기 밑 거품과 잔물결
  let foam = ''
  for (const ox of [-31, 31, 0]) {
    const fx = cx + ox * 1.08
    const fy = cy - 11
    foam += `M${pt([fx - 11, fy])}Q${pt([fx - 6, fy - 4])} ${pt([fx - 1, fy])}Q${pt([fx + 4, fy - 4])} ${pt([fx + 10, fy])}`
  }
  foam += `M${pt([cx - 54, cy + 4])}Q${pt([cx - 47, cy + 1])} ${pt([cx - 40, cy + 4])}M${pt([cx - 46, cy + 12])}Q${pt([cx - 39, cy + 9])} ${pt([cx - 32, cy + 12])}M${pt([cx + 36, cy + 6])}Q${pt([cx + 43, cy + 3])} ${pt([cx + 50, cy + 6])}M${pt([cx + 28, cy + 14])}Q${pt([cx + 35, cy + 11])} ${pt([cx + 42, cy + 14])}`
  out.push(P('sea-ink', foam))
  return out
}

// ---------------------------------------------------------------- 맨땅 — 결정 분지의 결정 가시와 은빛·푸른 풀포기 (PG: Akoum)
/** 결정 첨탑 무리 — 세계 지도 수정 기호의 큰 꼴 (Tal Terig·Eye of Ugin 지도와 같은 손) */
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
/** 은빛·푸른 풀포기 ('Aggressive silver and blue grasses take root in volcanic stone') */
const tuft = ([x, y], s = 7) => line([[x - s * 0.55, y - s * 0.65], [x - s * 0.12, y]]) + line([[x, y - s], [x, y]]) + line([[x + s * 0.55, y - s * 0.7], [x + s * 0.12, y]])

// ---------------------------------------------------------------- 단마다의 식물 자리 — 안쪽 단의 빗금 끝과 바깥 단 테두리 사이 바닥
/**
 * 안쪽 단 선을 따라 간격 step 마다, 바깥(내리막)으로 쏜 반직선이 바깥 단 테두리와 만나기 전의 바닥 가운데.
 * keep(x, y) 가 거짓인 자리는 뺀다. [바닥 가운데 x, y, 바닥 너비]
 */
function bandSpots(inner, outer, hach, step, keep, offsetT = 0.5) {
  const out = []
  const rand = rng(`band-${inner.pts[0]}-${step}`)
  for (const [[x, y], [ux, uy]] of along(inner.pts, step)) {
    const nx = -uy
    const ny = ux
    if (ny > 0.25) continue // 남쪽은 합쳐진 벽
    const d = rayHit([x, y], nx, ny, outer.pts)
    if (!isFinite(d) || d < hach + 14) continue
    const r = rand()
    if (r < 0.14) continue // 드문드문 비워 고르게 찍은 듯하지 않게
    const t = hach + (d - hach) * (offsetT + (rand() - 0.5) * 0.24)
    const p = [x + nx * t, y + ny * t]
    if (keep && !keep(p[0], p[1])) continue
    // 그림·이름 자리는 페이즈1 이 켜졌을 때만 비운다 (넷째 값 true — 꺼졌을 때만 그린다)
    out.push([p[0], p[1], d - hach, !clearOf(p[0], p[1] + 10, 24)])
  }
  return out
}

// ---------------------------------------------------------------- 자리
// 커먼 넷 — Disfigure 는 북쪽 단(3·4단 사이, 북쪽에서 가장 넓은 바닥), Zendikar Farguide 는 북서쪽 숲(바위 발치), Khalni Heart Expedition 은
// 그 아래 북서쪽 숲 빈터에서 1단 벽을 오른다(가운데 꽃 쪽으로; 북서쪽의 좁은 단 바닥에는 무리가 들어가지 않는다 — 원정대가 정령이 지나간
// 길을 따른다는 플레이버와도 맞는다), Goblin War Paint 는 꼭대기 단 동쪽의 kolya 곁.
// 고블린 자리를 내느라 Lullmage Mentor 를 조금 남쪽으로 옮겼고, Lotus Cobra 는 한국어 이름이 고블린 이름과 폭포 앞 돌 사이에 들게 두었다.
// 휴대폰 첫 화면(focus)에 고블린부터 Quest for the Gemblades 까지 이름이 다 들어오게 Quest for the Gemblades 를 조금 동쪽으로 옮겼다.
// 원정대는 그림의 돌계단이 1단 벽 발치에 붙고 이름이 1단 테두리를 넘지 않는 자리(벽이 동쪽으로 물러나는 곳), 정령은 이름이 1단 벼랑 면에
// 닿지 않게 조금 서쪽에 둔다
const SUBJ = {
  // 페이즈2 — 오라 온다르 바위 단 동쪽 기슭의 숲 바닥에 선 등가죽 발로스 (이 지도의 추정)
  'leatherback-baloth': { at: [970, 725], size: 85 },
  'disfigure': { at: [458, 418], size: 70 },
  'goblin-war-paint': { at: [678, 614], size: 70 },
  'khalni-heart-expedition': { at: [126, 476], size: 78 },
  'zendikar-farguide': { at: [164, 306], size: 100 },
  'lotus-cobra': { at: [581, 590], size: 66 },
  'lullmage-mentor': { at: [642, 700], size: 90 },
  'quest-for-the-gemblades': { at: [354, 770], size: 90, flip: true },
  'khalni-gem': { at: [405, 676], size: 44 },
}
/** 그림 틀(scripts/figures/art 의 viewBox·anchor)과 그 밑 이름 — 식물·나무가 그림과 이름 밑에 깔리지 않게 비울 자리 */
const FIG = {
  'disfigure': [[1, 18, 98, 82], [40, 92], 'Disfigure'],
  'goblin-war-paint': [[11, 16.4, 56, 66], [45, 78.4], 'Goblin War Paint'],
  'khalni-heart-expedition': [[0, 4, 100, 76.2], [50, 70], 'Khalni Heart Expedition'],
  'zendikar-farguide': [[0, 0, 100, 100], [58, 96.6], 'Zendikar Farguide'],
  'lotus-cobra': [[2, 5, 76, 96], [43, 97], 'Lotus Cobra'],
  'lullmage-mentor': [[1, 12, 100, 70], [40, 79.6], 'Lullmage Mentor'],
  'quest-for-the-gemblades': [[0, 0, 100, 80], [40, 70.4], 'Quest for the Gemblades'],
  'khalni-gem': [[0, 0, 100, 88], [48, 82], 'Khalni Gem'],
}
// 페이즈1 그림만 — 페이즈2(WWK) 대상은 FIG 에 없고 그 자리는 빈터(clearings, phase2)로 비운다 (식물을 페이즈1·끔에서 그대로 두려고)
const KEEP_OUT = Object.entries(SUBJ).filter(([id]) => FIG[id]).flatMap(([id, { at, size, flip }]) => {
  const [[vx, vy, vw, vh], [ax, ay], name] = FIG[id]
  const k = size / Math.max(vw, vh)
  const xs = [(vx - ax) * k, (vx + vw - ax) * k].map((d) => at[0] + (flip ? -d : d))
  const below = at[1] + (vy + vh - ay) * k
  const cw = name.length * 3.1
  return [
    [Math.min(...xs), at[1] + (vy - ay) * k, Math.max(...xs), below],
    [at[0] - cw, below, at[0] + cw, below + 26],
  ]
})
/** (x, y) 에 밑동을 둔 높이 h 의 식물이 그림·이름 둘레 pad 안에 들지 않는가 */
const clearOf = (x, y, h = 20, pad = 6) =>
  !KEEP_OUT.some(([x0, y0, x1, y1]) => x > x0 - pad - h * 0.4 && x < x1 + pad + h * 0.4 && y > y0 - pad && y - h < y1 + pad)
/** 그림·이름 자리에 든 식물 — 페이즈1 이 꺼졌을 때만 그린다 (켜지면 그 자리를 그림이 쓴다) */
const offOnly = (item) => ({ ...item, parts: item.parts.map((q) => ({ ...q, phase: false })) })
/** 식물 하나를 쌓는다 — 그림 자리에 들면 페이즈1 이 꺼졌을 때만 */
const plant = (items, hidden, item) => items.push(hidden ? offOnly(item) : item)
const HEART = [476, 624] // 소의 가운데 — 숲 채색의 무게중심(461, 641)과 꼭대기 단 가운데(540, 625) 사이

// ---------------------------------------------------------------- 지형 칸
// 숲 — 숲 채색 전체에서 바위(벼랑 면 포함)와 그 둘레를 비운다. 북쪽 작은 만 가장자리의 나무는 바다로 넘지 않게 내린다
const forestOuter = [
  ...FOREST_EDGE.map(([x, y]) => [x, x > 220 && x < 560 ? Math.max(y, 70) : y]),
  [-30, 1040],
  [760, 1040],
]
const CLEARINGS = [
  [SUBJ['zendikar-farguide'].at[0] - 8, SUBJ['zendikar-farguide'].at[1] - 32, 68, 84],
  [SUBJ['khalni-heart-expedition'].at[0] - 2, SUBJ['khalni-heart-expedition'].at[1], 70, 62],
]
const hullOf = (clearings) => {
  const H = T1.hull
  const cx = 520
  const cy = 560
  return trimLoop(
    H.filter((_, i) => i % 3 === 0).map(([x, y]) => {
      const dx = x - cx
      const dy = y - cy
      const L = Math.hypot(dx, dy) || 1
      const m = dy > 0 ? 30 : 16
      return [x + (dx / L) * m, y + (dy / L) * m]
    }),
  ).map(([x, y]) => {
    // Zendikar Farguide 와 Khalni Heart Expedition 둘레 — 바위 발치의 빈 띠를 북서쪽 숲으로 둥글게 넓혀(바위 가운데에서 본
    // 반직선이 타원 끝까지), 나무 사이를 걷는 정령과 1단 벽을 오르는 원정대가 나무 기호에 묻히지 않게
    const dx = x - cx
    const dy = y - cy
    const L = Math.hypot(dx, dy)
    const ux = dx / L
    const uy = dy / L
    let best = L
    for (const [ex, ey, rx, ry] of clearings) {
      // 반직선 C + t·u 와 타원의 먼 교점
      const ox = (cx - ex) / rx
      const oy = (cy - ey) / ry
      const vx = ux / rx
      const vy = uy / ry
      const A = vx * vx + vy * vy
      const B = 2 * (ox * vx + oy * vy)
      const D = B * B - 4 * A * (ox * ox + oy * oy - 1)
      if (D <= 0) continue
      best = Math.max(best, (-B + Math.sqrt(D)) / (2 * A))
    }
    return best > L ? [cx + ux * best, cy + uy * best] : [x, y]
  })
}
// 정령·원정대 둘레의 빈터는 페이즈1 이 켜졌을 때만 (꺼지면 바위 발치까지 숲)
const hull = hullOf(CLEARINGS)
const hullOff = hullOf([])

const FIELD = [
  { kind: 'forest', points: withHoles(forestOuter, [hull]), density: 0.44, phase: true },
  { kind: 'forest', points: withHoles(forestOuter, [hullOff]), density: 0.44, phase: false },
  // 아쿰의 이빨 — 세계 지도의 줄기 테두리 그대로 (기슭을 옮기지 않는다). 범위 안에는 남쪽 기슭만, 모두 위 경계의 가장자리 띠 안에 걸친다.
  // 띠에서는 세계 지도의 산 기호와 자리를 나눠 맡는데 두 배치가 따로 뿌려져 서로 바짝 붙은 봉우리가 생기므로, 세계 지도 값(0.95)보다
  // 성기게 둔다 — 같은 값이면 경계를 따라 산이 몰린 줄이 생겼다
  { kind: 'mountain', points: TEETH, density: 0.4 },
]

// ---------------------------------------------------------------- 그림 쌓기
const parts = []
const add = (p) => parts.push(...p)

// 해안 벼랑
add(worldCliffs())

// 맨땅 — 결정 가시 몇 무리와 풀포기 (아주 드물게). 모두 숲 채색 밖, 바다와 해안 벼랑 띠 밖의 맨땅에만
// (가장자리 띠 안에는 두지 않는다 — 띠에서 옅어지는 큰 결정 무리는 세계 지도에 없는 유령처럼 보였다)
// 크기는 둘레 세계 지도의 잘게 뿌린 결정 기호와 같게 (손그림 크기면 세계 지도 기호의 네 배쯤으로 튀었다), 동쪽 무리는 숲 채색 가장자리에서 떨어진 맨땅에
add(crystalTuft(1026, 372, 'cr-e1', 0.34))
add(crystalTuft(905, 150, 'cr-n1', 0.32))
parts.push(
  P(
    'hatch',
    [[70, 236], [20, 262], [140, 140], [196, 84], [760, 150], [840, 210], [700, 120], [878, 256], [1060, 460], [1150, 610], [1090, 820], [1160, 470], [1010, 440], [1120, 660]]
      .map((p) => tuft(p, 8))
      .join(''),
  ),
)

// 다섯 단 — 바깥 단부터 (안쪽 단의 빗금이 바깥 단의 바닥 위로 떨어진다)
add(T1.parts)
add(T2.parts)
add(T3.parts)
add(T4.parts)
add(T5.parts)

// 바위 발치의 고사리와 벌레잡이통풀 (숲 기호를 비운 띠) — 2016 'giant pitcher plants and flytraps catch and devour the smaller animals that venture into the wood'
{
  const items = []
  const rand = rng('foot')
  const foot = along(T1.hull, 70)
  foot.forEach(([[x, y]], i) => {
    if (y < 120 || y > 990 || x < 20) return
    const k = rand()
    const yy = y + 8
    // 가장자리 띠(경계에서 세계 24단위 = 120) 안의 발치 식물은 두지 않는다 — 띠에서 옅어져 세계 지도의 나무와 겹친 유령처럼 보였다
    // (난수는 그대로 써서 다른 자리의 식물은 바뀌지 않게)
    const inBand = yy > 880 || x < 120 || x > 1060
    if (i % 3 === 1 && y > 400) {
      const s = 17 + rand() * 4
      const f = rand() > 0.5 ? 1 : -1
      if (!inBand) plant(items, !clearOf(x, yy, s), { y: yy, parts: pitcher(x, yy, s, f) })
    } else if (k > 0.25) {
      const s = 15 + rand() * 6
      if (!inBand) plant(items, !clearOf(x, yy, s), { y: yy, parts: fern(x, yy, s, `ff${i}`) })
    }
  })
  add(stack(items))
}

// 단마다의 식물 (해석: PG 의 네 무리를 아래 단부터 차례로; 꼭대기의 kolya 만 공식)
{
  const items = []
  // 1단 윗면(북쪽·동쪽·서쪽) — 고사리, 그 위로 솟은 별꽃 몇
  const notUI = (x, y) => !(x < 300 && y < 230)
  bandSpots(T2, T1, 17, 46, notUI).forEach(([x, y, , h], i) => plant(items, h, { y: y + 10, parts: i % 3 === 1 ? starFlower(x, y + 10, 22, `s1-${i}`) : fern(x, y + 8, 14, `f1-${i}`) }))
  // 1단 윗면 동·서쪽 (2단이 없는 곳: 3단 바깥)
  bandSpots(T3, T1, 17, 40, (x, y) => y > 470).forEach(([x, y, , h], i) => plant(items, h, { y: y + 10, parts: i % 3 === 0 ? starFlower(x, y + 10, 22, `s1e-${i}`) : fern(x, y + 8, 15, `f1e-${i}`) }))
  // 2단 윗면(북쪽) — 가시 덩굴이 감은 높은 줄기
  //   밑동은 3단 빗금 끝 바로 앞에 두어, 줄기 끝이 2단 가장자리를 넘지 않게 (넘으면 단 사이 경계가 흐려진다)
  bandSpots(T3, T2, 17, 62, (x, y) => y < 470, 0.14).forEach(([x, y, w, h], i) => plant(items, h, { y, parts: thornVine(x, y, clamp(w * 0.72 - 4, 18, 26), `v2-${i}`) }))
  // 3단 윗면 — 북쪽(4단 바깥)과 동·서쪽(5단 바깥): 벌레잡이통풀과 파리지옥
  bandSpots(T4, T3, 17, 50).forEach(([x, y, , h], i) => plant(items, h, { y: y + 10, parts: i % 2 ? flytrap(x, y + 10, 18, `ft3-${i}`) : pitcher(x, y + 10, 20, i % 4 ? 1 : -1) }))
  bandSpots(T5, T3, 17, 44, (x, y) => y > 520 && y < 720).forEach(([x, y, , h], i) => plant(items, h, { y: y + 10, parts: i % 2 ? flytrap(x, y + 10, 18, `ft3e-${i}`) : pitcher(x, y + 10, 20, x > 500 ? -1 : 1) }))
  // 4단 윗면(북쪽) — 거대한 꽃
  bandSpots(T5, T4, 17, 50, (x, y) => y < 520).forEach(([x, y, , h], i) => plant(items, h, { y: y + 10, parts: starFlower(x, y + 10, 21, `s4-${i}`) }))
  // 넓은 남쪽 단(1단 윗면) — 고사리와 별꽃 몇, 이름 자리와 그림 자리는 비운다
  ;[[250, 735], [462, 815], [540, 790], [720, 800], [770, 770], [400, 832]].forEach(([x, y], i) =>
    plant(items, !clearOf(x, y), { y, parts: i % 3 === 2 ? starFlower(x, y, 22, `ss-${i}`) : fern(x, y, 15, `fs-${i}`) }),
  )
  add(stack(items))
}

// 돌 틈의 거처 — 합쳐진 남쪽 벽(5단)과 바깥 벽(1단)의 남쪽·남동쪽 면에 작은 입구 열둘
{
  const c = []
  ;[[452, 0.42, 10, { win: 1 }], [520, 0.5, 11, {}], [588, 0.38, 10, { ledge: 10 }], [700, 0.45, 10, { win: -1 }], [618, 0.62, 9, {}]].forEach(([x, t, s, o]) => {
    const [px, py] = onFace(T5.faces, x, t)
    c.push(...cranny(px, py, s, o))
  })
  ;[[300, 0.4, 11, {}], [372, 0.55, 12, { win: 1 }], [470, 0.42, 11, { ledge: 12 }], [560, 0.48, 12, {}], [660, 0.4, 11, { win: -1 }], [755, 0.5, 11, {}], [836, 0.45, 10, { ledge: 8 }]].forEach(([x, t, s, o]) => {
    const [px, py] = onFace(T1.faces, x, t)
    c.push(...cranny(px, py, s, o))
  })
  add(c)
}

// 꼭대기 단 — Khalni Heart, kolya 숲, 낮은 고사리
{
  const items = []
  items.push({ y: HEART[1] - 30, parts: heart(HEART[0], HEART[1]) })
  items.push({ y: HEART[1] + 18, parts: lotus(HEART[0] + 2, HEART[1] + 16, 84) })
  const K = [
    // 북서 무리
    [366, 590, 46], [392, 566, 42], [388, 616, 48],
    // 남쪽 무리
    [486, 712, 46], [514, 700, 50], [544, 716, 44], [572, 703, 48],
    // 북동 — 고블린 곁의 한 그루 (Goblin War Paint: 'War paint made from kolya fruit')
    [628, 575, 42, true],
  ]
  K.forEach(([x, y, h, placed], i) => plant(items, !(placed || clearOf(x, y, h, 2)), { y, parts: kolya(x, y, h, `k${i}`) }))
  ;[[360, 642], [430, 572], [534, 586], [700, 612], [592, 652], [455, 708], [714, 700], [356, 540], [530, 653]].forEach(([x, y], i) => plant(items, !clearOf(x, y, 13), { y, parts: fern(x, y, 13, `ft-${i}`) }))
  add(stack(items))
}

CHILDMAPS.push({
  id: 'ora-ondar',
  size: [1180, 1000],
  glyphScale: 4,
  terrain: FIELD,
  parts,
  labels: [{ text: 'Ora Ondar', textKo: '오라 온다르', at: [612, 836], size: 34, kind: 'area' }],
  // 페이즈2(WWK)·페이즈3(ROE) 대상의 빈터 — 그 페이즈부터(phase2·phase3) 이 안에 밑동이 떨어지는 지형 기호를 뺀다 (STYLE.md)
  clearings: [
    { points: [[1073, 726], [1068, 756], [1049, 775], [1015, 782], [971, 788], [924, 785], [898, 772], [875, 756], [868, 726], [878, 696], [898, 679], [928, 670], [971, 667], [1017, 666], [1047, 677], [1060, 697]], phase2: true }, // leatherback-baloth
    { points: [[1082, 488], [1074, 515], [1061, 540], [1035, 552], [1008, 560], [979, 557], [957, 537], [939, 516], [934, 488], [941, 461], [955, 436], [981, 423], [1008, 416], [1037, 419], [1058, 439], [1077, 460]], phase3: true }, // khalni-hydra (세계 지도 그림 — 1단 벼랑 동쪽 숲 가장자리의 히드라와 그 이름표 밑을 비운다)
  ],
  subjects: SUBJ,
  markAnchors: {},
  focus: [504, 640],
})
