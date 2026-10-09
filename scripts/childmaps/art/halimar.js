// 할리마르 — 자식 지도 (타짐의 내해와 바다 관문, 아래 우마라 협곡. 세계 범위 x 869–1169 · y 433–682.6, ×4.007).
// 시점: Zendikar Rising(2020). 바다 관문은 1년 만에 다시 세워졌고(Zendikar: Things Have Changed; Episode 2, 2020) 할리마르에는
// 다시 물이 찼다(The Magosi Steps; Red Route, 2020). 등대는 다시 섰고(Episode 2), 마고시 폭포 곁에 계단과 육로 거점이 있다(Red Route).
// 2020년 모습이 서술되지 않은 곳(Merfolk Enclave·Tikal Harborage·Wren Grotto·산호투구·Sky Rock)은 마지막 공식 묘사(2015–16)를 따랐다.
// 해석(공식 자리·모양 없음): 등대와 성문·기념비의 자리, 댐 위 거리의 배치, 협곡 벽·섬·웅덩이·갈라진 틈의 모양, 물에 잠긴 유적의 모습,
// 떠 있는 헤드론과 뱃길의 자리, 인물·짐승·주문 그림 아홉의 자리. 숲은 세계 지도처럼 살아 있는 오란리프로 그렸다.
// 언커먼 셋(모두 추정 자리): River Boa 는 하늘폭포 밑 웅덩이에서 협곡 머리로 가는 물줄기(그래서 웅덩이를 세계 지도의 물길 높이로
// 내려 그렸다), Merfolk Seastalkers 는 산호투구 동쪽 할리마르 북서쪽 물 위, Merfolk Wayfinder 는 할리마르 위 하늘에서 서쪽(Enclave 쪽)으로.
// 커먼 넷(모두 추정 자리): Umara Raptor 는 Wren Grotto 동북쪽 고원 위 하늘, Explorer's Scope 는 바다 관문 북서쪽 Calcite Flats,
// Paralyzing Grasp 는 바다 동굴 절벽 발치의 물(그림의 동굴 바위가 표시 바로 밑 절벽에 붙어 동굴 어귀가 된다), Nimbus Wings 는 에메리아
// 서쪽 오란리프 위 하늘의 헤드론 곁. 그림 밑 나무는 비웠다.
// 근거가 장소에 닿지 않는 대상 여덟(Rite of Replication·Windborne Charge·Seascape Aerialist 등)은 이 지역에 모으지 않고 타짐 곳곳의
// 세계 지도 자리로 옮겼다 (CLAUDE.md 의 붐빔 규칙 1).

const { line, poly, smooth, rng, offset, along, stack } = KIT
const r1 = (v) => Math.round(v * 10) / 10
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`
const P = (cls, d) => ({ cls, d })
const ell = (x, y, rx, ry) => `M${pt([x - rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x + rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x - rx, y])}Z`
const dot = ([x, y]) => `M${pt([x, y])}h0.1`
const asStone = (parts) => parts.map((p) => (p.cls === 'fill' ? P('stone', p.d) : p))
const toCls = (parts, cls) => parts.map((p) => P(cls, p.d))

/** Catmull-Rom 을 촘촘한 꺾은선으로 — 같은 곡선을 여러 도형이 나눠 쓸 때 */
function dense(pts, closed = false, per = 5) {
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
/** 점에서 꺾은선까지 거리 */
function distTo(p, pts) {
  let best = Infinity
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[i + 1]
    const dx = bx - ax
    const dy = by - ay
    const t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / (dx * dx + dy * dy || 1)))
    best = Math.min(best, Math.hypot(p[0] - ax - t * dx, p[1] - ay - t * dy))
  }
  return best
}

// ---------------------------------------------------------------- 세계 지도의 해안과 할리마르 (context.mjs, 자식 좌표)
const COAST_E = [[1231,584],[1228,584],[1225,583],[1222,582],[1218,580],[1215,578],[1212,576],[1208,574],[1205,572],[1202,570],[1200,568],[1197,566],[1195,564],[1193,562],[1191,560],[1188,558],[1186,556],[1183,554],[1180,552],[1176,550],[1172,548],[1168,546],[1164,544],[1161,542],[1158,541],[1155,539],[1153,538],[1151,536],[1149,535],[1148,534],[1147,532],[1146,530],[1145,528],[1144,525],[1143,522],[1143,518],[1142,514],[1142,510],[1140,506],[1138,503],[1135,500],[1131,498],[1126,496],[1121,494],[1114,493],[1107,492],[1100,491],[1094,490],[1088,489],[1082,488],[1077,487],[1072,486],[1067,485],[1062,483],[1058,482],[1055,480],[1051,478],[1048,476],[1045,475],[1043,473],[1041,470],[1040,468],[1038,466],[1037,464],[1036,461],[1034,459],[1033,456],[1032,453],[1031,450],[1030,448],[1028,445],[1027,442],[1026,438],[1026,435],[1025,432],[1024,428],[1024,425],[1024,421],[1023,417],[1022,412],[1020,407],[1018,401],[1015,395],[1012,388],[1008,380],[1004,371],[1001,363],[998,355],[996,348],[996,341],[996,334],[996,328],[998,322],[1000,317],[1002,312],[1004,307],[1006,302],[1007,298],[1008,294],[1008,291],[1009,288],[1009,285],[1009,281],[1008,278],[1008,274],[1007,270],[1006,266],[1006,262],[1005,257],[1004,253],[1002,248],[1001,244],[1000,241],[999,238],[998,235],[997,233],[996,232],[994,230],[993,229],[992,228],[991,226],[990,224],[989,222],[989,220],[989,218],[989,215],[989,213],[989,211],[988,209],[988,207],[987,205],[986,204],[984,202],[983,200],[981,199],[979,198],[977,198],[975,197],[973,197],[972,198],[970,198],[968,199],[966,200],[964,200],[962,200],[959,200],[957,200],[955,198],[952,197],[950,195],[948,192],[946,190],[944,186],[942,182],[940,178],[938,173],[937,168],[935,163],[933,158],[931,153],[929,150],[926,146],[924,143],[922,140],[919,138],[917,136],[915,135],[913,133],[911,132],[910,130],[909,129],[908,127],[908,126],[907,125],[907,123],[906,121],[904,118],[902,114],[899,110],[895,105],[891,100],[887,93],[882,88],[878,83],[874,79],[871,75],[868,72],[864,70],[862,68],[859,67],[857,66],[854,65],[851,66],[848,66],[845,67],[842,69],[838,71],[835,73],[831,76],[827,78],[823,80],[819,81],[815,82],[810,83],[805,84],[800,84],[796,84],[792,83],[787,83],[784,82],[780,80],[777,79],[774,77],[772,75],[769,72],[767,70],[765,66],[762,62],[760,58],[758,54],[755,49],[753,43],[751,39],[748,34],[746,31],[745,28],[743,26],[742,24],[740,23],[740,22],[738,22],[737,22],[735,23],[733,24],[731,25],[728,28],[726,30],[723,34],[719,37],[714,40],[709,44],[702,47],[695,50],[687,53],[678,56],[668,60],[660,63],[652,65],[646,68],[640,70],[636,72],[632,74],[630,76],[629,77],[628,79],[627,81],[627,83],[626,85],[626,88],[626,91],[626,94],[625,98],[625,101],[624,105],[624,108],[622,110],[621,113],[619,115],[617,117],[614,119],[612,120],[609,120],[606,120],[604,119],[600,118],[597,116],[594,113],[591,110],[587,107],[584,104],[582,101],[579,97],[577,94],[575,90],[573,86],[572,82],[570,78],[567,74],[563,70],[559,66],[554,62],[548,58],[542,53],[534,49],[528,45],[521,40],[516,35],[511,30],[506,24],[502,19],[499,13],[496,6],[493,0],[488,-6],[483,-12],[477,-17],[470,-23],[462,-28]]
const LAKE = [[592,405],[590,409],[590,414],[591,420],[598,434],[598,441],[595,449],[591,453],[573,469],[566,478],[565,482],[565,495],[561,507],[555,521],[550,530],[536,544],[527,551],[509,560],[467,575],[458,582],[458,585],[462,595],[472,606],[478,609],[489,608],[503,613],[519,622],[527,630],[535,649],[542,657],[544,660],[545,668],[544,684],[546,691],[550,698],[547,708],[548,713],[554,720],[580,738],[587,746],[592,757],[606,768],[610,776],[617,795],[622,804],[629,811],[634,821],[637,832],[638,845],[633,874],[636,880],[639,883],[653,889],[673,892],[693,891],[723,884],[731,885],[736,888],[739,896],[744,904],[753,910],[764,912],[774,910],[792,897],[798,896],[800,897],[805,902],[814,915],[818,917],[826,919],[835,926],[839,933],[846,953],[852,965],[869,986],[874,990],[879,992],[882,989],[884,974],[889,964],[895,958],[918,940],[923,934],[928,923],[932,920],[934,919],[938,920],[945,928],[951,932],[958,932],[962,929],[966,918],[971,878],[975,866],[979,862],[984,860],[990,860],[1012,869],[1032,871],[1047,868],[1064,864],[1079,858],[1088,853],[1092,846],[1092,843],[1089,830],[1088,818],[1089,778],[1088,763],[1084,745],[1075,724],[1074,714],[1074,697],[1067,667],[1068,659],[1071,652],[1085,634],[1089,624],[1089,610],[1084,576],[1084,552],[1080,544],[1072,535],[1047,515],[1033,501],[1028,493],[1024,480],[1019,470],[1008,455],[995,446],[960,432],[950,425],[948,421],[948,418],[949,413],[954,406],[954,392],[948,381],[940,372],[929,363],[915,355],[901,350],[887,350],[872,354],[850,363],[836,367],[825,368],[810,368],[794,371],[783,377],[755,395],[736,402],[727,403],[716,402],[709,400],[694,392],[686,391],[681,392],[675,394],[668,403],[665,405],[657,404],[640,397],[627,396],[609,398],[601,400],[594,404]]
const inLake = (x, y) => inPoly(x, y, LAKE)

// ---------------------------------------------------------------- 물 — 강은 양피지 밑깔개 위에 물빛 (숲 기호를 가린다)
/** 강 — 처음 w0, 끝 w1 너비. 하류로 넓어진다 */
function stream(pts, w0, w1, o = {}) {
  const c = dense(pts, false, 4)
  const left = offset(c, (t) => (w0 + (w1 - w0) * t) / 2)
  const right = offset(c, (t) => -(w0 + (w1 - w0) * t) / 2)
  const body = poly([...left, ...[...right].reverse()])
  const out = [P('fill', body), P('sea', body)]
  if (o.edges !== false) out.push(P('sea-ink', line(left) + line(right)))
  return out
}
/** 여울 — 물길을 가로지르는 하류 쪽으로 굽은 짧은 물결 */
function rapids(pts, step, w, seed) {
  const rand = rng(seed)
  let d = ''
  for (const [[x, y], [ux, uy]] of along(dense(pts, false, 4), step)) {
    const nx = -uy
    const ny = ux
    const a = [x + nx * w * 0.5, y + ny * w * 0.5]
    const b = [x - nx * w * 0.5, y - ny * w * 0.5]
    const m = [x + ux * w * (0.35 + rand() * 0.2), y + uy * w * (0.35 + rand() * 0.2)]
    d += `M${pt(a)}Q${pt(m)} ${pt(b)}`
  }
  return [P('sea-ink', d)]
}

// ---------------------------------------------------------------- 벼랑
/** 벼랑 털선 — 가장자리(굵은 잉크)에서 낮은 쪽으로 수직 빗금. len(p) 로 빗금 길이를 정한다 */
function hachure(pts, side, len, seed, o = {}) {
  const rand = rng(seed)
  const c = dense(pts, false, 4)
  let ticks = ''
  const top = []
  const bot = []
  for (const [[x, y], [ux, uy]] of along(c, o.step ?? 5)) {
    const nx = -uy * side
    const ny = ux * side
    const L = len([x, y]) * (0.62 + rand() * 0.38)
    if (L < 2) continue
    ticks += line([[x, y], [x + nx * L, y + ny * L]])
    top.push([x, y])
    bot.push([x + nx * L * 0.92, y + ny * L * 0.92])
  }
  const out = []
  if (o.shade !== false && top.length > 1) out.push(P('shade', poly([...top, ...bot.reverse()])))
  out.push(P('hatch', ticks))
  if (o.edge !== false) out.push(P(o.bold === false ? 'ink' : 'ink-bold', smooth(c)))
  return out
}

// ---------------------------------------------------------------- 우마라 협곡 (세계 지도의 물길·협곡 띠를 따라)
// 강 — 하늘폭포 밑 웅덩이에서 정글을 지나 협곡 머리로, 마고시 폭포를 넘어 할리마르 서쪽 끝으로
// 하늘폭포 밑 웅덩이에서 나와 협곡 머리로 (웅덩이와 River Boa 는 세계 지도의 물길 높이에)
const RIVER_UP = [[288, 226], [300, 224.5], [316, 222], [346, 222], [366, 230], [378, 248], [388, 270], [394, 292], [394, 317], [386, 338], [376, 358], [371, 382]]
const RIVER_LO = [[369, 404], [374, 412], [383, 424], [396, 436], [405, 452], [408, 470], [404, 490], [400, 506]]
const RIVER_MOUTH = [[403, 566], [414, 577], [434, 586], [452, 589], [466, 588]]
// 협곡 가장자리 — 위 협곡(폭포 위)은 좁게, 아래 협곡은 넓게, 어귀 가까이에서 가장 넓다 (Enclave 의 섬, 산호투구의 그물)
const WR_UP = [[300, 229], [320, 239], [342, 242], [355, 249], [364, 265], [372, 290], [373, 318], [365, 340], [354, 362], [347, 387]]
const ER_UP = [[300, 214], [322, 205], [348, 203], [374, 210], [392, 227], [404, 253], [415, 287], [416, 318], [407, 342], [398, 366], [395, 376]]
// 폭포 단애 — 협곡을 가로질러 양쪽 둔덕까지 곧게 (위가 북쪽, 아래가 남쪽 낮은 땅. Red Route: 'a single, sheer step')
const SCARP = [[324, 393], [347, 387], [371, 382], [395, 376], [418, 371], [440, 366]]
// 서쪽 벽(아래) — 지류가 드는 틈, Tikal 웅덩이가 든 움푹한 자리, 어귀
const WR_LO_A = [[347, 388], [349, 400], [353, 411]]
const WR_LO_B = [[365, 425], [373, 436], [380, 446], [366, 450], [358, 461], [357, 478], [361, 491], [371, 498], [374, 510], [366, 524], [360, 540], [362, 556], [372, 570], [390, 584], [414, 596], [438, 603], [458, 604]]
// 동쪽 벽(아래) — Wren Grotto 의 굽이, 어귀 가까이 넓게 벌어진 곳, 할리마르 북서쪽 절벽으로 이어진다
const ER_LO = [[395, 377], [402, 390], [414, 401], [428, 400], [440, 407], [444, 420], [438, 434], [430, 442], [432, 458], [436, 476], [446, 490], [462, 499], [476, 509], [481, 523], [475, 538], [477, 550], [489, 554], [500, 548]]
const TIKAL_POOL = [[373, 457], [385, 461], [391, 472], [387, 484], [375, 489], [364, 485], [361, 472], [365, 461]]
const REACH = [[401, 502], [410, 506], [418, 516], [424, 530], [427, 546], [421, 560], [410, 570], [398, 574], [386, 568], [376, 556], [371, 540], [373, 524], [381, 512], [391, 505]]

/** 벼랑 가장자리를 바위처럼 거칠게 — 촘촘히 하고 법선 쪽으로 낮은 주파수로 흔든다 */
function rough(pts, amp, seed, per = 4) {
  const c = dense(pts, false, per)
  const rand = rng(seed)
  const raw = c.map(() => rand() - 0.5)
  const sm = raw.map((_, i) => (raw[Math.max(0, i - 1)] + 2 * raw[i] + raw[Math.min(raw.length - 1, i + 1)]) / 4)
  return offset(c, (t) => {
    const i = Math.round(t * (c.length - 1))
    const ends = Math.min(1, i / 3, (c.length - 1 - i) / 3)
    return sm[i] * amp * 2.2 * ends
  })
}
const R_WR_UP = rough(WR_UP, 1.6, 'r-wr-up')
const R_ER_UP = rough(ER_UP, 1.6, 'r-er-up')
const R_WR_A = rough(WR_LO_A, 1.2, 'r-wr-a')
const R_WR_B = rough(WR_LO_B, 1.8, 'r-wr-b')
const R_ER_LO = rough(ER_LO, 1.8, 'r-er-lo')
const GORGE_UP = poly([...R_WR_UP, ...[...R_ER_UP].reverse()])
const GORGE_LO = poly([...R_WR_A, [359, 418], ...R_WR_B, [462, 595], [467, 576], ...[...R_ER_LO].reverse(), [371, 382]])
const RIVER_ALL = [...RIVER_UP, [371, 392], ...RIVER_LO, [398, 520], [398, 550], ...RIVER_MOUTH]
const toRiver = (p, half) => Math.max(0, distTo(p, RIVER_ALL) - half)

/** 벼랑 털선 (꺾은선 그대로) — 가장자리에서 낮은 쪽으로, 바위처럼 들쭉날쭉한 길이 */
function wallTicks(c, side, len, seed, step = 4) {
  const rand = rng(seed)
  let ticks = ''
  const top = []
  const bot = []
  for (const [[x, y], [ux, uy]] of along(c, step)) {
    const nx = -uy * side
    const ny = ux * side
    const L = len([x, y]) * (0.5 + rand() * 0.5)
    if (L < 2) continue
    ticks += line([[x, y], [x + nx * L, y + ny * L]])
    top.push([x, y])
    bot.push([x + nx * L * 0.85, y + ny * L * 0.85])
  }
  return [P('shade', top.length > 1 ? poly([...top, ...bot.reverse()]) : ''), P('hatch', ticks), P('ink-bold', line(c))]
}

/** 협곡 바닥·강·벽 */
function gorge() {
  const out = []
  // 바닥 — 양피지 위에 옅게 (벽 털선이 깊이를 준다)
  out.push(P('fill', GORGE_UP + GORGE_LO))
  // 서쪽 지류 (세계 지도 물길) — 협곡 서쪽 벽의 틈으로 들어 폭포 아래에서 합류.
  // 물길은 세계 지도가 다듬어 그린 중심선(굽이 포함)의 점, 폭도 세계 지도와 같게 — 서쪽 가장자리 띠에서 세계 지도의 강과 한 줄로 겹친다
  out.push(...stream([
    [-28.9, 503.5], [-11.8, 509.2], [6.2, 511.2], [23.9, 510], [41.3, 507.3], [58.5, 501.9], [76.3, 501.2], [93, 506.5], [110.3, 511.7],
    [128.1, 514.8], [145.9, 515.7], [163.2, 512.8], [180.7, 509.2], [198.1, 503.9], [214.1, 495.5], [229.9, 486.8], [246.3, 479.3],
    [262.8, 472.1], [278.7, 463.5], [294.6, 454.8], [311.5, 448.4], [327.9, 441], [343.4, 431.8], [358.9, 422.5], [369.4, 416.7], [376, 413],
  ], 2.4, 4.6))
  // Enclave 의 넓은 물목 — 강이 가장 넓게 벌어진 곳의 섬 (PG: 'one of the widest sections of the Umara River')
  const reach = dense(REACH, true, 4)
  out.push(P('fill', poly(reach)), P('sea', poly(reach)), P('sea-ink', poly(reach)))
  // Tikal Harborage 웅덩이 — 강 서쪽에 붙은 둥근 물 (아트북: 'half-submerged in a pool')
  const tikal = dense(TIKAL_POOL, true, 4)
  out.push(P('fill', poly(tikal)), P('sea', poly(tikal)), P('sea-ink', poly(tikal)))
  out.push(...stream([[388, 472], [398, 471], [407, 470]], 6, 7, { edges: false }))
  // 본류
  out.push(...stream(RIVER_UP, 5, 8))
  out.push(...stream(RIVER_LO, 9, 11))
  out.push(...stream(RIVER_MOUTH, 12, 18))
  // 여울 (위 협곡과 어귀 — 'white-water rapids', 'tumbling into Halimar')
  out.push(...rapids(RIVER_UP.slice(4, 11), 18, 6, 'rap-up')) // [366, 230] … [376, 358]
  out.push(...rapids(RIVER_LO.slice(3, 8), 20, 8, 'rap-lo'))
  out.push(...rapids(RIVER_MOUTH.slice(0, 4), 9, 11, 'rap-mouth'))
  // 벽 털선 — 가장자리에서 강(또는 바닥) 쪽으로
  const lenTo = (half, cap) => (p) => Math.min(cap, toRiver(p, half) - 1.5)
  out.push(...wallTicks(R_WR_UP, -1, lenTo(5, 17), 'wr-up'))
  out.push(...wallTicks(R_ER_UP, 1, lenTo(5, 17), 'er-up'))
  out.push(...wallTicks(R_WR_A, -1, lenTo(6, 20), 'wr-a'))
  out.push(...wallTicks(R_WR_B, -1, (p) => Math.min(20, toRiver(p, 6) - 1.5, distTo(p, [...TIKAL_POOL, TIKAL_POOL[0]]) - 1, distTo(p, [...REACH, REACH[0]]) - 1), 'wr-b'))
  out.push(...wallTicks(R_ER_LO, 1, (p) => Math.min(20, toRiver(p, 6) - 1.5, distTo(p, [...REACH, REACH[0]]) - 1), 'er-lo'))
  return out
}

/** 마고시 폭포 — 협곡을 가로지른 단애, 넓은 물 장막, 장막 뒤의 동굴, 물보라, 벽에 새긴 갈지자 계단 */
function magosi() {
  const out = []
  // 단애 — 위(북)가 높고 아래(남)가 낮다. 협곡 밖 둔덕에도 이어진다
  {
    const S = rough(SCARP, 1.2, 'r-scarp')
    const rand = rng('scarp')
    let ticks = ''
    const top = []
    const bot = []
    for (const [[x, y]] of along(S, 3.2)) {
      const L = (x > 348 && x < 394 ? 24 : 12 + rand() * 12) * (0.62 + rand() * 0.38)
      ticks += line([[x, y + 0.5], [x + (rand() - 0.5) * 1.6, y + L]])
      top.push([x, y])
      bot.push([x, y + L * 0.9])
    }
    out.push(P('shade', poly([...top, ...[...bot].reverse()])), P('hatch', ticks), P('ink-bold', line(S)))
    // 단애 발치의 돌무더기
    out.push(...KIT.rocks(334, 414, 3.2, 3, 'scarp-r1'), ...KIT.rocks(430, 391, 3, 3, 'scarp-r2'))
  }
  // 장막 뒤 동굴 (Legends of ZNR: 'a deep, aquatic cave behind the cascade') — 장막보다 먼저
  out.push(P('dark', `M${pt([362, 405])}C${pt([362, 395])} ${pt([374, 395])} ${pt([374, 405])}Z`))
  // 물 장막 — 단애 위 가장자리에서 떨어지는 굵고 가는 물줄기 (카드 그림의 넓은 폭포)
  const lip = (x) => 382 + (371 - x) * 0.24
  const rand = rng('veil')
  let veil = ''
  let body = ''
  const xs = []
  for (let x = 352; x <= 390; x += 2.6) xs.push(x)
  body = poly([[352, lip(352)], [390, lip(390)], [391, 407], [351, 409]])
  for (const x of xs) {
    const y0 = lip(x) + 0.5
    const y1 = 403 + rand() * 6
    veil += `M${pt([x, y0])}C${pt([x + 0.6, y0 + 6])} ${pt([x - 0.6, y1 - 8])} ${pt([x + (rand() - 0.5) * 1.4, y1])}`
  }
  out.push(P('fill', body), P('sea', body), P('sea-ink', veil))
  // 물보라 (The Magosi Steps: 'Mists peeled off the Magosi')
  let mist = ''
  for (let i = 0; i < 46; i++) {
    const a = rand() * Math.PI
    const r = 4 + rand() * 16
    mist += dot([371 + Math.cos(a) * r * 1.5, 409 + Math.sin(a) * r * 0.45])
  }
  out.push(P('hatch', mist + `M${pt([346, 414])}Q${pt([358, 410])} ${pt([370, 414])}Q${pt([382, 418])} ${pt([394, 413])}`))
  // 계단 — 폭포 옆 벽에 새긴 갈지자 (Red Route: 'a series of switchbacks into the wall')
  out.push(...toCls(KIT.dashed([[399, 377], [411, 381], [400, 386], [412, 391], [401, 396], [411, 401]], 2.6, 1.8), 'ink'))
  return out
}

/** 마고시 육로 거점 — 긴 회관 하나와 딸린 건물 둘, 짐 꾸리는 마당, 벼랑 위로 내민 마루 (Red Route; The Magosi Steps) */
function portage() {
  const items = []
  const add = (y, p) => items.push({ y, parts: p })
  // 긴 회관
  {
    const L = 413
    const R = 445
    const y = 334
    const h = 7
    const body = poly([[L, y], [L, y - h], [R, y - h], [R, y]])
    const roof = poly([[L - 2, y - h], [L + 4, y - h - 6], [R - 4, y - h - 6], [R + 2, y - h]])
    const sh = poly([[R - 9, y], [R - 9, y - h], [R, y - h], [R, y]]) + poly([[L + 4, y - h - 6], [R - 4, y - h - 6], [R + 2, y - h], [L - 2, y - h]])
    let hatch = ''
    for (let x = L + 6; x < R - 4; x += 4) hatch += line([[x + 1, y - h - 5], [x - 1, y - h - 0.5]])
    add(y, [P('fill', body + roof), P('shade', sh), P('hatch', hatch), P('dark', poly([[L + 7, y], [L + 7, y - 4], [L + 10, y - 4], [L + 10, y]]) + poly([[R - 15, y - 2.5], [R - 13, y - 2.5], [R - 13, y - 4.5], [R - 15, y - 4.5]])), P('ink', body + roof)])
  }
  add(325, KIT.house(452, 325, 8, 6, { roof: 'gable', roofH: 4.5, door: false }))
  add(322, KIT.house(426, 322, 7, 5, { roof: 'gable', roofH: 4, door: false }))
  // 짐 꾸리는 마당 — 말뚝 울타리
  {
    let posts = ''
    const yard = [[434, 312], [460, 309], [462, 318], [436, 321]]
    const edge = [...yard, yard[0]]
    for (const [[x, y]] of along(edge, 3.4)) posts += line([[x, y], [x, y - 2.6]])
    add(318, [P('ink', posts + line(edge.map(([x, y]) => [x, y - 1.6])))])
  }
  // 벼랑 위로 내민 마루 ('the Portage's cliffside deck')
  {
    const deck = poly([[401, 338], [413, 335], [413, 337.5], [401, 340.5]])
    add(341, [P('ink', line([[403, 340], [405, 346]]) + line([[409, 338.5], [410, 344]])), P('fill', deck), P('ink', deck)])
  }
  // 계단 머리로 가는 길
  add(300, KIT.dashed([[414, 338], [408, 352], [404, 364], [400, 375]], 3, 2.4))
  return stack(items)
}

/** Wren Grotto — 벽에 뚫린 작은 동굴들, 금칠한 정면, 계단처럼 층진 바위 턱 (아트북; PG 2009) */
function wren() {
  const out = []
  const caves = [[417, 410], [429, 406], [415, 423], [423, 433], [435, 440]]
  for (const [x, y] of caves) {
    const w = 5.2
    const h = 6.2
    const mouth = `M${pt([x - w / 2, y])}V${r1(y - h + w / 2)}A${r1(w / 2)} ${r1(w / 2)} 0 0 1 ${pt([x + w / 2, y - h + w / 2])}V${r1(y)}Z`
    const facade = poly([[x - w / 2 - 1.6, y], [x - w / 2 - 1.6, y - h + 0.6], [x, y - h - 3.4], [x + w / 2 + 1.6, y - h + 0.6], [x + w / 2 + 1.6, y]])
    out.push(P('gold', facade), P('ink', facade), P('dark', mouth), P('ink', line([[x - w, y + 1.6], [x + w + 1.5, y + 1.6]])))
  }
  // 새 둥지 쪽 작은 새 셋 ('train giant falcons')
  out.push(P('ink', 'M447 396q2 -1.6 3.4 0q1.4 -1.6 3.4 0M452 388q1.6 -1.3 2.8 0q1.2 -1.3 2.8 0'))
  return out
}

/** Tikal Harborage — 웅덩이에 반쯤 잠긴 낮은 지붕들과 끌어내려 매어 둔 헤드론 둘 (아트북) */
function tikal() {
  const out = []
  const roof = (x, y, w, rh) => {
    const r = poly([[x - w / 2, y], [x, y - rh], [x + w / 2, y]])
    return [P('fill', r), P('shade', poly([[x, y - rh], [x + w / 2, y], [x, y]])), P('ink', r), P('sea-ink', `M${pt([x - w * 0.7, y + 0.8])}Q${pt([x, y - 0.6])} ${pt([x + w * 0.7, y + 0.8])}`)]
  }
  out.push(...roof(381, 469, 7, 3.5), ...roof(366, 479, 8, 4), ...roof(379, 482, 8.5, 4.2), ...roof(372, 487, 6, 3))
  return out
}
const tikalSky = () => [
  P('hatch', line([[354, 453], [365, 462]]) + line([[387, 447], [384, 461]])),
  ...KIT.hedron(352, 443, 11, -16, { shadow: false }),
  ...KIT.hedron(388, 438, 10, 18, { shadow: false }),
]

/** 소라 껍데기 하나 — 뾰족한 나선 끝, 어깨의 가시, 가장 굵은 몸통, 입술이 벌어진 입과 뾰족한 관 끝
 *  (Retreat to Coralhelm 그림; 아트북 'enormous conch shells'). (x, y) 는 가운데, s 는 반 길이, rot 은 나선 끝이 가리키는 쪽 */
function conch(x, y, s, rot) {
  const c = Math.cos((rot * Math.PI) / 180)
  const si = Math.sin((rot * Math.PI) / 180)
  const T = ([px, py]) => [x + (px * c - py * si) * s, y + (px * si + py * c) * s]
  const body = [[-1, 0], [-0.74, -0.12], [-0.56, -0.16], [-0.5, -0.26], [-0.3, -0.3], [-0.24, -0.42], [0.05, -0.5], [0.42, -0.44], [0.74, -0.2], [1, 0.02], [0.72, 0.16], [0.36, 0.38], [0.0, 0.42], [-0.3, 0.3], [-0.52, 0.2], [-0.76, 0.1]]
  const d = poly(body.map(T))
  let hatch = line([[-0.56, -0.16], [-0.6, 0.18]].map(T)) + line([[-0.3, -0.3], [-0.34, 0.28]].map(T))
  for (const k of [0.12, 0.3, 0.48]) hatch += line([[k, 0.36 - k * 0.2], [k + 0.08, 0.12]].map(T))
  let spikes = ''
  for (const k of [-0.18, 0.08, 0.34]) spikes += poly([[k - 0.08, -0.47 + k * 0.02], [k, -0.74], [k + 0.08, -0.46 + k * 0.02]].map(T))
  const lip = smooth([[-0.05, 0.4], [0.3, 0.3], [0.62, 0.12], [0.86, 0.04]].map(T))
  const shade = poly([[-0.3, 0.3], [0.0, 0.42], [0.36, 0.38], [0.72, 0.16], [1, 0.02], [0.5, 0.08], [0.0, 0.16]].map(T))
  return [P('fill', d + spikes), P('shade', shade), P('hatch', hatch), P('ink', d + spikes + lip)]
}
/** 줄 — 두 점 사이에 늘어진 밧줄 (sag: 가운데가 처진 깊이) */
const rope = (a, b, sag) => `M${pt(a)}Q${pt([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag * 2])} ${pt(b)}`
/** 산호투구 — 어귀 가까이 넓게 벌어진 협곡의 두 벽 사이에 그물과 줄로 매단 소라 껍데기 셋 (아트북) */
function coralhelm() {
  const out = []
  let net = ''
  // 협곡 서쪽 벽에서 동쪽 벽으로 건넌 밧줄 셋, 그 사이를 엮은 그물
  // 줄은 둘만 — 셋째 줄이 아래 Enclave 섬의 무너진 돔을 가로지르지 않게 (가장 낮은 껍데기는 둘째 줄에 매달린다)
  net += rope([373, 503], [470, 504], 7) + rope([375, 512], [478, 516], 7)
  for (const x of [424, 436, 448, 460]) net += line([[x, 508.5 - (x > 440 ? 0 : 0.5)], [x + 4, 520]]) + line([[x + 6, 508.5], [x + 1, 520]])
  net += line([[446, 521], [446, 524.5]])
  out.push(P('hatch', net))
  out.push(...conch(433, 517, 11, 104), ...conch(458, 510, 10, 76), ...conch(446, 532, 8.5, 96))
  return out
}
const coralhelmSky = () => {
  // 작은 떠 있는 바위 — 벼랑 가장자리에 줄로 맸다 (Shaping an Army: 'their floating landmass was roped to the edges of the cliffs')
  const x = 496
  const y = 482
  return [P('hatch', line([[486, 484], [466, 498]]) + line([[494, 492], [478, 507]])), ...floater(x, y, 22, 'ch-rock')]
}
/** 떠 있는 흙바위 — 풀 덮인 윗면, 울퉁불퉁 뾰족한 밑동, 나무 한두 그루 */
function floater(x, y, w, seed) {
  const rand = rng(seed)
  const topPts = []
  for (let i = 0; i <= 6; i++) topPts.push([x - w / 2 + (w * i) / 6, y - (i > 0 && i < 6 ? Math.sin((i / 6) * Math.PI) * w * 0.08 + rand() * 1.2 : 0)])
  const U = (u, v) => [x + u * w, y + v * w]
  const under = [U(0.46, 0.06), U(0.32, 0.16), U(0.24, 0.3), U(0.12, 0.26), U(0.02, 0.48), U(-0.1, 0.32), U(-0.2, 0.36), U(-0.3, 0.18), U(-0.46, 0.06)]
  const body = poly([...topPts, ...under])
  let hatch = ''
  for (let i = 0; i < 4; i++) hatch += line([[x + (0.08 + i * 0.09) * w, y + w * 0.05], [x + (0.04 + i * 0.09) * w, y + w * (0.18 + (i % 2) * 0.06)]])
  const tufts = ell(x - w * 0.12, y - w * 0.14, w * 0.14, w * 0.09) + ell(x + w * 0.14, y - w * 0.13, w * 0.11, w * 0.08)
  return [P('fill', body), P('stone', poly(under.concat([[x - w / 2, y + 1.5], [x + w / 2, y + 1.5]]))), P('hatch', hatch), P('ink-bold', body), P('forest', tufts), P('ink', tufts)]
}

/** Merfolk Enclave — 넓은 물목의 긴 섬, 무너진 둥근 지붕과 버팀벽 그루터기 (PG 2009; 아트북 'its graceful dome and buttressed walls lie in ruin') */
function enclave() {
  const out = []
  const isle = dense([[395, 522], [403, 528], [405, 544], [401, 560], [394, 564], [387, 556], [385, 538], [388, 526]], true, 4)
  out.push(P('fill', poly(isle)), P('shade', poly([[397, 523], [403, 528], [405, 544], [401, 560], [397, 563]])), P('sea-ink', poly(isle)))
  // 무너진 둥근 지붕 — 반쯤 남은 껍데기
  const x = 395
  const y = 538
  const dome = `M${pt([x - 7, y])}V${r1(y - 4)}C${pt([x - 7, y - 11])} ${pt([x + 1, y - 13])} ${pt([x + 3, y - 10])}L${pt([x + 1.5, y - 7.5])}L${pt([x + 4, y - 6.5])}L${pt([x + 3.2, y - 4])}L${pt([x + 7, y - 3.2])}V${r1(y)}Z`
  out.push(P('stone', dome), P('shade', poly([[x + 1.5, y - 7.5], [x + 4, y - 6.5], [x + 3.2, y - 4], [x + 7, y - 3.2], [x + 7, y], [x + 2, y]])), P('hatch', line([[x - 4, y - 8], [x - 4.5, y - 1]]) + line([[x - 1.5, y - 10], [x - 2, y - 1]])), P('dark', poly([[x - 1, y], [x - 1, y - 3.4], [x + 1.4, y - 3.4], [x + 1.4, y]])), P('ink', dome))
  for (const [bx, by, h] of [[388, 547, 5], [402, 547, 4], [391, 528, 4], [401, 530, 3.4]]) {
    const b = poly([[bx - 1.6, by], [bx - 1.2, by - h], [bx + 1.2, by - h + 1], [bx + 1.8, by]])
    out.push(P('stone', b), P('ink', b))
  }
  return out
}

/** Ysterid 의 깊은 수직 동굴 — 테두리 두른 어두운 구멍, 김 몇 가닥 (PG 2009) · 작은 수직 동굴 */
function pit(x, y, rx, steam, seed) {
  const rand = rng(seed)
  const rim = ell(x, y, rx + 3, (rx + 3) * 0.48)
  const hole = ell(x, y + 0.6, rx, rx * 0.4)
  let hatch = ''
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.05 + (i / 8) * 0.9)
    hatch += line([[x + Math.cos(a) * rx, y + Math.sin(a) * rx * 0.4], [x + Math.cos(a) * (rx + 3), y + Math.sin(a) * (rx + 3) * 0.48]])
  }
  let wisps = ''
  for (let k = 0; k < steam; k++) {
    const sx = x - rx * 0.5 + k * rx * 0.5
    wisps += smooth([[sx, y - 2], [sx - 3 - rand() * 2, y - 8], [sx + 1, y - 13], [sx - 4, y - 19 - rand() * 3]])
  }
  return [P('fill', rim), P('stone', rim), P('hatch', hatch + wisps), P('dark', hole), P('ink', rim + hole)]
}

/** 하다 북부 — 산 사이 틈의 거친 말뚝 울타리와 판잣집 몇 채 (아트북; 건물 묘사는 없다) */
function hada() {
  const items = []
  const cx = 330
  const cy = 98
  const ring = []
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2
    ring.push([cx + Math.cos(a) * 21, cy + Math.sin(a) * 10])
  }
  const rand = rng('hada')
  let back = ''
  let front = ''
  for (const [x, y] of ring) {
    const h = 4.4 + rand() * 1.6
    const s = line([[x, y], [x + (rand() - 0.5) * 0.8, y - h]])
    if (y < cy) back += s
    else front += s
  }
  items.push({ y: cy - 10, parts: [P('ink', back + line(ring.filter((p) => p[1] < cy).map(([x, y]) => [x, y - 2.6])))] })
  items.push({ y: 96, parts: KIT.house(322, 96, 8, 5, { roof: 'flat', door: false }) })
  items.push({ y: 100, parts: KIT.house(334, 100, 7, 5, { roof: 'gable', roofH: 3.6, door: false }) })
  items.push({ y: 93, parts: KIT.house(340, 93, 6, 4, { roof: 'flat', door: false }) })
  items.push({ y: cy + 11, parts: [P('ink', front + line(ring.filter((p) => p[1] >= cy).map(([x, y]) => [x, y - 2.6])))] })
  return stack(items)
}

/** Bulwark 마루의 허물어진 성벽 토막과 망루 (아트북: 'most of it has eroded away… empty shells still stand… a few remain more or less intact') */
function bulwarkRuins() {
  const items = []
  // 허물어진 성벽 토막 — 짧은 흉벽과 끊긴 끝의 돌무더기
  const piece = (pts, h, seed) => ({ y: Math.max(...pts.map((p) => p[1])), parts: [...KIT.wall(pts, h, { merlon: 2.4 }), ...KIT.rocks(pts.at(-1)[0] + 4, pts.at(-1)[1] + 1, 2.6, 3, `${seed}-r`)] })
  items.push(piece([[104, 134], [120, 131], [136, 132]], 6, 'bw1'))
  items.push(piece([[452, 76], [468, 78], [480, 77]], 6, 'bw2'))
  items.push(piece([[608, 154], [624, 151], [638, 152]], 6, 'bw3'))
  items.push({ y: 128, parts: asStone(KIT.tower(172, 128, 10, 22, { top: 'crenel' })) })
  // 허물어진 망루 그루터기
  {
    const x = 662
    const y = 168
    const body = poly([[x - 5.5, y], [x - 5, y - 15], [x - 2, y - 11], [x + 1, y - 14], [x + 5, y - 8.5], [x + 5.5, y]])
    items.push({ y, parts: [P('stone', body), P('shade', poly([[x + 1.2, y], [x + 1, y - 14], [x + 5, y - 8.5], [x + 5.5, y]])), P('dark', poly([[x - 1.6, y - 6.5], [x - 0.2, y - 6.5], [x - 0.2, y - 3.6], [x - 1.6, y - 3.6]])), P('ink', body), ...KIT.rocks(x + 7, y + 1, 2.2, 2, 'bt2')] })
  }
  return stack(items)
}

// ---------------------------------------------------------------- 하늘폭포 (Umara Skyfalls 그림: 떠 있는 바위에서 쏟아지는 물 장막)
function skyfalls() {
  const x = 246
  const y = 126
  const w = 34
  const rand = rng('skyfalls')
  let veil = ''
  for (let i = 0; i < 6; i++) {
    const vx = x - 9 + i * 3.4
    const y0 = y + 6 + Math.abs(i - 2.5) * 1.6
    const y1 = 224 + rand() * 4
    veil += `M${pt([vx, y0])}C${pt([vx - 1, y0 + 26])} ${pt([vx + 1.5, y1 - 30])} ${pt([vx + (rand() - 0.5) * 2, y1])}`
  }
  let mist = ''
  for (let i = 0; i < 22; i++) mist += dot([x + (rand() - 0.5) * 26, 225 + rand() * 9])
  // 폭포 밑 웅덩이 — 동쪽 끝이 강으로 열린다 (테두리는 물목에서 끊는다). River Boa 가 이 물에 있다
  const rim = [[301, 227.3], [294, 239], [276, 246], [256, 245.5], [242, 240], [238, 231.5], [245, 225], [261, 222.5], [281, 222.5], [301, 221.8]]
  const pool = poly(dense(rim, true, 4))
  return {
    ground: [P('fill', pool), P('sea', pool), P('sea-ink', line(dense(rim, false, 4)))],
    air: [P('sea-ink', veil), P('hatch', mist), ...floater(x, y, w, 'skyfalls-rock')],
  }
}

// ---------------------------------------------------------------- 할리마르 기슭
// 세계 지도의 절벽 선 (북서 기슭, 남서·남 기슭) — 물 쪽으로 털선
const CLIFF_NW = [[500, 548], [524, 539], [539, 519], [548, 500], [553, 466], [577, 447], [582, 428], [577, 409], [587, 389], [620, 380], [649, 385], [668, 380]]
const CLIFF_S = [[832, 947], [813, 928], [798, 918], [784, 923], [750, 923], [731, 904], [712, 904], [683, 909], [649, 904], [620, 875], [620, 846], [615, 822], [601, 798], [591, 774], [577, 755], [553, 740]]
const toLake = (p) => {
  let best = Infinity
  for (let i = 0; i < LAKE.length; i++) {
    const a = LAKE[i]
    const b = LAKE[(i + 1) % LAKE.length]
    best = Math.min(best, distTo(p, [a, b]))
  }
  return best
}
// 바다 관문 대양 쪽 절벽 (세계 지도의 선) — 바다 쪽으로
const SEA_CLIFF_N = [[995, 284], [990, 303], [986, 327], [986, 351], [995, 375], [1005, 399], [1012, 418]]
const SEA_CLIFF_S = [[1106, 506], [1125, 515], [1135, 529], [1149, 548], [1173, 563], [1192, 577], [1212, 587]]

/** 할리마르 바다 동굴 — 북쪽 기슭의 짧은 바위 벽 (Paralyzing Grasp; 자리는 세계 지도의 추정) */
function seaCaves() {
  const edge = [[734, 388], [748, 382], [762, 377], [776, 372], [790, 366]]
  // 동굴 어귀는 Paralyzing Grasp 그림의 동굴 바위가 맡는다 (표시 바로 밑 물가) — 지도에 아치를 따로 그리면 동굴이 둘로 읽힌다
  return KIT.cliff(edge, { depth: 18, step: 3.4, seed: 'seacave' })
}

/** 물에 잠긴 것 — 물빛 가는 선만, 끊어 그려 물밑으로 읽히게 */
const under = (d) => P('sea-ink', d)
function brokenLine(pts, on, off, seed) {
  const rand = rng(seed)
  let d = ''
  let drawing = true
  let left = on
  const c = pts
  for (let i = 0; i < c.length - 1; i++) {
    const a = c[i]
    const b = c[i + 1]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    let s = 0
    while (s < len) {
      const step = Math.min(left, len - s)
      const p0 = [a[0] + ((b[0] - a[0]) * s) / len, a[1] + ((b[1] - a[1]) * s) / len]
      const p1 = [a[0] + ((b[0] - a[0]) * (s + step)) / len, a[1] + ((b[1] - a[1]) * (s + step)) / len]
      if (drawing) d += line([p0, p1])
      s += step
      left -= step
      if (left <= 0) {
        drawing = !drawing
        left = drawing ? on * (0.7 + rand() * 0.6) : off * (0.7 + rand() * 0.6)
      }
    }
  }
  return d
}
/** 물밑 헤드론 윤곽 */
function sunkHedron(x, y, len, rot) {
  const c = Math.cos((rot * Math.PI) / 180)
  const s = Math.sin((rot * Math.PI) / 180)
  const T = ([px, py]) => [x + px * c - py * s, y + px * s + py * c]
  const w = len * 0.36
  const body = [[0, -len], [w, len * 0.08], [0, len * 0.92], [-w, len * 0.08], [0, -len]].map(T)
  return brokenLine(body, 5, 2.2, `sh${x}`) + brokenLine([[0, -len], [w * 0.28, len * 0.08], [0, len * 0.92]].map(T), 3, 2.5, `shf${x}`)
}
function sunken() {
  let d = ''
  // Ula Temple — 우마라 어귀 가까이 가라앉은 신전 (아트북). 모양 서술이 없어 벽과 기둥 자리만
  // 표시를 둘러싼 자리에 — 이름(표시 아래)과 뱃길(표시 위) 사이
  d += brokenLine([[512, 584], [541, 578], [549, 597], [520, 603], [512, 584]], 5, 2.4, 'ula1')
  d += brokenLine([[506, 588], [512, 584]], 3, 2, 'ula3') + brokenLine([[549, 597], [556, 595], [559, 603]], 3.5, 2.2, 'ula4')
  for (const [x, y] of [[510, 596], [507, 590], [553, 589], [556, 584]]) d += `M${pt([x, y])}v-3`
  // Eldrazi Temple 카드 자리 곁 — 바닥에 누운 헤드론 (아트북: 'Hedrons… lie all across Halimar's floor')
  d += sunkHedron(626, 628, 10, 74) + sunkHedron(604, 640, 7, -58)
  // Halimar Depths — 기둥 위 둥근 단과 기슭으로 뻗은 긴 둑길, 해초 (카드 그림)
  d += brokenLine(dense([[668, 848], [680, 852], [682, 862], [670, 867], [658, 862], [657, 852]], true, 3).concat([[668, 848]]), 5, 2, 'dp1')
  d += brokenLine([[658, 864], [646, 872], [640, 880]], 4, 2.4, 'dp2') + brokenLine([[662, 868], [650, 876], [645, 883]], 4, 2.4, 'dp3')
  d += brokenLine([[688, 842], [702, 838], [706, 850]], 4, 2.6, 'dp4')
  d += sunkHedron(712, 868, 8, 64)
  let weed = ''
  for (const [x, y] of [[694, 874], [699, 872], [651, 852], [646, 855]]) weed += `M${pt([x, y])}q-1.5 -3 0 -5.5q1.5 -2.5 0 -5`
  return [under(d), P('hatch', weed)]
}

// ---------------------------------------------------------------- 바다 관문 (Zendikar Rising 때 다시 세운 도시)
// 댐 — 할리마르 북동 모서리와 대양 사이 목. 가운데 선과 너비 (안쪽은 물이 댐 꼭대기까지 찰랑, 바깥쪽이 높은 벽)
const DAM_C = [[999, 428], [1015, 447], [1028, 465], [1040, 481], [1054, 494], [1070, 505]]
const DAM_W = 16
const DAM_D = dense(DAM_C, false, 6)
const damN = (() => {
  const a = DAM_C[0]
  const b = DAM_C[DAM_C.length - 1]
  const len = Math.hypot(b[0] - a[0], b[1] - a[1])
  return [(b[1] - a[1]) / len, -(b[0] - a[0]) / len] // 북동(대양) 쪽
})()
/** 댐 위의 자리 — t: 북서 끝 0 → 남동 끝 1, s: -1 할리마르 쪽 … +1 대양 쪽 */
const damAt = (t, s) => {
  const i = Math.max(0, Math.min(DAM_D.length - 1, Math.round(t * (DAM_D.length - 1))))
  return [DAM_D[i][0] + damN[0] * s * DAM_W, DAM_D[i][1] + damN[1] * s * DAM_W]
}

/** 댐 — 흰 돌의 넓은 둑마루, 할리마르 쪽 낮은 부두 가장자리, 대양 쪽으로 높이 떨어지는 벽(털선) */
function dam() {
  const c = DAM_D
  const ne = offset(c, DAM_W) // offset 의 + 는 진행 방향 왼쪽 — 북서→남동으로 가는 댐에서는 북동(대양) 쪽
  const sw = offset(c, -DAM_W)
  const out = []
  const top = poly([...sw, ...[...ne].reverse()])
  // 대양 쪽 벽 — 둑마루 가장자리에서 바다로 (아트북: 'The dam towers high above the level of the ocean on its outer side')
  const foot = offset(c, DAM_W + 14)
  const face = poly([...ne, ...[...foot].reverse()])
  let ticks = ''
  const rand = rng('dam-face')
  for (const [[x, y]] of along(ne, 1.9)) {
    const L = 7 + rand() * 7
    ticks += line([[x, y], [x + damN[0] * L, y + damN[1] * L]])
  }
  out.push(P('shade', face), P('hatch', ticks), P('sea-ink', line(offset(c, DAM_W + 15.5))))
  out.push(P('fill', top), P('ink', line(sw)), P('ink-bold', line(ne)))
  // 할리마르 쪽 부두 가장자리 — 물이 둑마루까지 닿는다 (높은 면은 그리지 않는다)
  out.push(P('sea-ink', line(offset(sw, -2.2))))
  return out
}

/** 대리석 열주 건물 — 평지붕, 기둥 줄 (2023: 'Sea Gate's marble columns') */
function colonnade(x, y, w, h) {
  const L = x - w / 2
  const R = x + w / 2
  const ent = h * 0.22
  const body = poly([[L, y], [L, y - h], [R, y - h], [R, y]])
  const ped = poly([[L - 1, y - h], [x, y - h - h * 0.38], [R + 1, y - h]])
  let cols = ''
  const n = Math.max(3, Math.round(w / 3.2))
  for (let i = 0; i <= n; i++) {
    const cx = L + 1 + ((w - 2) * i) / n
    cols += line([[cx, y - 0.4], [cx, y - h + ent]])
  }
  return [P('fill', body + ped), P('shade', poly([[R - w * 0.18, y], [R - w * 0.18, y - h + ent], [R, y - h + ent], [R, y]])), P('hatch', cols + line([[L, y - h + ent], [R, y - h + ent]])), P('ink', body + ped)]
}
/** 전쟁 기념비 — 둥근 단에 고르게 선 큰 헤드론 여섯, 둘레의 옛 바다 관문 잔해 (Episode 2, 2020) */
function memorial(x, y) {
  const rx = 8.5
  const ry = 3.4
  const plat = ell(x, y, rx, ry)
  const side = `M${pt([x - rx, y])}V${r1(y + 1.6)}A${r1(rx)} ${r1(ry)} 0 0 0 ${pt([x + rx, y + 1.6])}V${r1(y)}`
  const items = []
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6
    const hx = x + Math.cos(a) * rx * 0.72
    const hy = y + Math.sin(a) * ry * 0.72
    // 세계 지도 헤드론과 같은 비례(가운데가 가장 넓은 긴 팔면체)로 곧추 세운다 — 뾰족한 나무로 읽히지 않게
    const len = 3.1
    const h = poly([[hx, hy - len * 1.92], [hx + len * 0.4, hy - len * 0.84], [hx, hy], [hx - len * 0.4, hy - len * 0.84]])
    items.push({ y: hy, parts: [P('stone', h), P('hatch', line([[hx, hy - len * 1.92], [hx + len * 0.12, hy - len * 0.84], [hx, hy]])), P('ink', h)] })
  }
  const rand = rng('memorial')
  let debris = ''
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2
    const r = rx + 2 + rand() * 3
    const px = x + Math.cos(a) * r
    const py = y + Math.sin(a) * r * 0.45 + 1
    debris += poly([[px - 1, py], [px - 0.4, py - 1.2], [px + 1, py - 0.6], [px + 0.8, py + 0.2]])
  }
  return [P('stone', plat + side), P('ink', plat + side), P('fill', debris), P('ink', debris), ...stack(items)]
}
/** 장터 차양 — 작은 천막 지붕 */
function stall(x, y) {
  const r = poly([[x - 2.6, y - 2.4], [x, y - 4.6], [x + 2.6, y - 2.4]])
  return [P('ink', line([[x - 2, y - 2.4], [x - 2, y]]) + line([[x + 2, y - 2.4], [x + 2, y]])), P('fill', r), P('shade', poly([[x, y - 4.6], [x + 2.6, y - 2.4], [x, y - 2.4]])), P('ink', r)]
}

/** 등대 — 가늘고 위로 좁아지는 흰 돌 원통 탑, 창 줄, 난간 두른 맨 위 등실 (2010 웹코믹; PG 'a white-stone cylindrical tower') */
function lighthouse(x, y, h) {
  const w0 = 13
  const w1 = 8.6
  const top = y - h
  const L0 = x - w0 / 2
  const R0 = x + w0 / 2
  const L1 = x - w1 / 2
  const R1 = x + w1 / 2
  const body = poly([[L0, y], [L1, top], [R1, top], [R0, y]])
  const shade = poly([[x + w0 * 0.16, y], [x + w1 * 0.16, top], [R1, top], [R0, y]])
  let hatch = ''
  for (let i = 1; i <= 3; i++) {
    const t = i / 4
    hatch += line([[x + w0 * 0.16 + (R0 - x - w0 * 0.16) * t, y - 3], [x + w1 * 0.16 + (R1 - x - w1 * 0.16) * t, top + 4]])
  }
  // 층 띠 둘
  for (const f of [0.34, 0.66]) {
    const yy = y - h * f
    const hw = (w0 + (w1 - w0) * f) / 2
    hatch += line([[x - hw, yy], [x + hw, yy]])
  }
  // 창 — 층마다 작은 창 (위로 갈수록 촘촘)
  let win = ''
  for (let k = 0; k < 7; k++) {
    const f = 0.12 + k * 0.12
    const yy = y - h * f
    const ox = k % 2 ? 1.2 : -1.2
    win += poly([[x + ox - 0.8, yy], [x + ox + 0.8, yy], [x + ox + 0.8, yy - 2.6], [x + ox - 0.8, yy - 2.6]])
  }
  // 난간 두른 발코니와 등실, 둥근 지붕, 꼭대기 장식
  const gal = poly([[x - 7.2, top], [x + 7.2, top], [x + 6.4, top + 2.4], [x - 6.4, top + 2.4]])
  let rail = line([[x - 7, top - 2.6], [x + 7, top - 2.6]])
  for (let i = 0; i <= 6; i++) rail += line([[x - 7 + (14 * i) / 6, top], [x - 7 + (14 * i) / 6, top - 2.6]])
  const lamp = poly([[x - 3.8, top - 2.6], [x - 3.8, top - 9.5], [x + 3.8, top - 9.5], [x + 3.8, top - 2.6]])
  const cap = `M${pt([x - 5, top - 9.5])}Q${pt([x - 4.4, top - 15.5])} ${pt([x, top - 16.5])}Q${pt([x + 4.4, top - 15.5])} ${pt([x + 5, top - 9.5])}Z`
  const fin = line([[x, top - 16.5], [x, top - 21]])
  // 빛 — 등실에서 사방으로 짧은 선 (2020 'the distant light of Sea Gate')
  let rays = ''
  for (const a of [-170, -150, -128, -52, -30, -10, 8, 172]) {
    const rad = (a * Math.PI) / 180
    rays += line([[x + Math.cos(rad) * 8, top - 6 + Math.sin(rad) * 8], [x + Math.cos(rad) * 17, top - 6 + Math.sin(rad) * 17]])
  }
  // 발치의 바위 (웹코믹: 'on rock at the water's edge')
  const foot = KIT.rocks(x - 2, y + 2, 5, 3, 'lh-rock')
  return [
    ...foot,
    P('fill', body + gal + cap),
    P('shade', shade + poly([[x + 1.4, top - 15.8], [x + 5, top - 9.5], [x + 1.4, top - 9.5]])),
    P('hatch', hatch + rays),
    P('sea', lamp),
    P('dark', win),
    P('ink', rail + lamp + fin),
    P('ink-bold', body + gal + cap),
  ]
}

/** 성문 — 남쪽 어깨를 가로지른 짧은 성벽과 높은 문루 (Episode 2: 'Sea Gate's towering entrance') */
function gate() {
  const items = []
  items.push(...[{ y: 545, parts: KIT.wall([[1080, 546], [1092, 529]], 6, { merlon: 2.6 }) }])
  items.push({ y: 518, parts: KIT.wall([[1104, 513], [1114, 498]], 6, { merlon: 2.6 }) })
  // 문루 — 두 탑 사이 아치 (등대보다 훨씬 낮게)
  const x = 1098
  const y = 524
  const L = x - 10
  const R = x + 10
  const h = 17
  const body = poly([[L, y], [L, y - h], [R, y - h], [R, y]])
  let mer = ''
  for (let i = 0; i < 5; i++) {
    const mx = L + 0.5 + i * 4.3
    mer += poly([[mx, y - h], [mx, y - h - 2.6], [mx + 2.4, y - h - 2.6], [mx + 2.4, y - h]])
  }
  const arch = `M${pt([x - 3.6, y])}V${r1(y - 7)}A3.6 3.6 0 0 1 ${pt([x + 3.6, y - 7])}V${r1(y)}Z`
  const shade = poly([[x + 4.5, y], [x + 4.5, y - h], [R, y - h], [R, y]])
  let hatch = ''
  for (const hx of [x + 6.5, x + 8.4]) hatch += line([[hx, y - h + 2], [hx, y - 2]])
  items.push({ y, parts: [P('fill', body + mer), P('shade', shade), P('hatch', hatch), P('dark', arch + poly([[x - 7, y - 12], [x - 5.6, y - 12], [x - 5.6, y - 9], [x - 7, y - 9]])), P('ink-bold', body + mer)] })
  return stack(items)
}

/** 배 — 작은 돛배 (돛대 하나, 세모 돛) */
function boat(x, y, s, dir = 1) {
  const hull = `M${pt([x - s, y - s * 0.18])}Q${pt([x, y + s * 0.42])} ${pt([x + s * 1.05, y - s * 0.24])}Z`
  const sail = poly([[x + s * 0.06 * dir, y - s * 0.22], [x + s * 0.06 * dir, y - s * 1.45], [x + s * 0.72 * dir, y - s * 0.3]])
  return [P('fill', hull + sail), P('shade', hull), P('ink', hull + sail + line([[x + s * 0.06 * dir, y - s * 0.22], [x + s * 0.06 * dir, y - s * 1.6]])), P('sea-ink', `M${pt([x - s * 1.3, y + s * 0.3])}Q${pt([x, y + s * 0.05])} ${pt([x + s * 1.3, y + s * 0.3])}`)]
}

function seaGate() {
  const items = []
  const add = (y, p) => items.push({ y, parts: p })
  // 대양 쪽 흉벽 — 둑마루 바다 쪽 가장자리를 따라 (The Liberation of Sea Gate: 'archers along the oceanside wall')
  {
    const ne = offset(DAM_D, DAM_W - 1.5).slice(1, -1)
    add(Math.min(...ne.map((p) => p[1])) - 1, KIT.wall(ne, 3.4, { merlon: 1.9 }))
  }
  // 거리 — 둑마루 위 작은 집들 (옆에서 본 모습). 가운데(바다 관문 표시)는 비운 장터, 그 북서에 기념비, 북서쪽은 좁은 길드 거리
  const rand = rng('city')
  const rows = [
    // [s, t 목록]
    [0.5, [0.03, 0.1, 0.17, 0.24, 0.31, 0.38, 0.45, 0.52, 0.59, 0.66, 0.73, 0.8, 0.87, 0.94]],
    [0.02, [0.06, 0.13, 0.2, 0.27, 0.34, 0.66, 0.73, 0.8, 0.87]],
    [-0.5, [0.04, 0.11, 0.25, 0.7, 0.85, 0.92]],
  ]
  for (const [s, ts] of rows) {
    for (const t of ts) {
      const [x, y] = damAt(t, s + (rand() - 0.5) * 0.12)
      const w = 8.5 + rand() * 3.2
      const h = 6.8 + rand() * 2.8
      const k = rand()
      // 표시 남동쪽 장터 자리는 비운다 (난수는 그대로 써서 다른 집 모양이 바뀌지 않게)
      if ((s === 0.02 && t === 0.66) || (s === -0.5 && t === 0.7)) continue
      add(y, KIT.house(x, y, w, h, { roof: k < 0.22 ? 'flat' : k < 0.4 ? 'hip' : 'gable', roofH: k < 0.4 ? 3.6 : 4.2, door: w > 9 }))
    }
  }
  // 대리석 열주 건물 둘 (2023: 'Sea Gate's marble columns') — 할리마르 쪽 앞줄
  for (const t of [0.18, 0.78]) {
    const [x, y] = damAt(t, -0.5)
    add(y, colonnade(x, y, 15, 7.5))
  }
  // 장터 차양 (Episode 2: 'its open-air markets')
  // 표시의 남동쪽에 — 표시 아이콘과 왼쪽 이름('Sea Gate')을 비킨다
  for (const [t, s] of [[0.6, 0.2], [0.645, -0.22], [0.68, -0.64], [0.56, -0.86]]) {
    const [x, y] = damAt(t, s)
    add(y, stall(x, y))
  }
  // 기념비 — 장터와 길드 거리 사이
  {
    const [x, y] = damAt(0.42, -0.12)
    add(y, memorial(x, y))
  }
  add(507, lighthouse(1079, 507, 104))
  add(524, gate())
  return stack(items)
}

/** Sky Rock — 에메리아 아래쪽 가장자리의 거대한 헤드론, 넓고 평평한 윗면 (Slaughter at the Refuge; Survivors 2015). 천막·다리는 없다 */
function skyRock(x, y, len) {
  const h = len * 0.13
  const L = [x - len, y + len * 0.1]
  const R = [x + len, y + len * 0.04]
  const TL0 = [x - len * 0.8, y]
  const TL1 = [x - len * 0.58, y - h]
  const TR1 = [x + len * 0.6, y - h - 0.5]
  const TR0 = [x + len * 0.82, y - 0.5]
  const K = [x + len * 0.06, y + len * 0.56]
  const M = [x + len * 0.04, y]
  const top = poly([TL0, TL1, TR1, TR0])
  const body = poly([L, TL0, TR0, R, K])
  const shadeR = poly([M, TR0, R, K])
  let hatch = line([TL0, K]) + line([M, K]) + line([TR0, K])
  for (let i = 1; i <= 5; i++) {
    const t = i / 6
    const a = [M[0] + (TR0[0] - M[0]) * t, M[1] + (TR0[1] - M[1]) * t]
    hatch += line([[a[0] + 1, a[1] + 1.5], [a[0] + (K[0] - a[0]) * 0.55, a[1] + (K[1] - a[1]) * 0.55]])
  }
  // 룬 한 줄 (세계 지도 헤드론처럼 새긴 선)
  hatch += line([[x - len * 0.42, y + len * 0.1], [x - len * 0.3, y + len * 0.2], [x - len * 0.18, y + len * 0.12]])
  // 윗면의 풀 (Resurgent 2016 'pitted turf')
  const rand = rng('skyrock-grass')
  let grass = ''
  for (let i = 0; i < 14; i++) {
    const gx = TL1[0] + 3 + ((TR1[0] - TL1[0] - 6) * i) / 13 + (rand() - 0.5) * 2
    const gy = y - h * 0.45 + (rand() - 0.5) * h * 0.5
    grass += `M${pt([gx - 1.2, gy])}l0.6 -2.2M${pt([gx, gy])}l0 -2.8M${pt([gx + 1.2, gy])}l-0.6 -2.2`
  }
  return [P('sea', ell(x - 4, y + len * 1.32, len * 0.66, len * 0.085)), P('stone', body), P('shade', shadeR), P('fill', top), P('forest', top), P('hatch', hatch), P('ink', grass), P('ink-bold', body + top)]
}
/** 떠 있는 헤드론 — 물 위면 그림자를 물빛으로 */
function floatHedron(x, y, len, rot, lift) {
  const sy = y + len * lift
  const overWater = inLake(x, sy)
  const sh = ell(x, sy, len * 0.55, len * 0.16)
  return [P(overWater ? 'sea' : 'shade', sh), ...KIT.hedron(x, y, len, rot, { shadow: false })]
}
/** 작은 떠 있는 바위와 가는 물 장막 (Survivors 2015: 'a nearby floating rock carried a waterfall') —
 *  하늘폭포·산호투구의 떠 있는 바위와 같은 꼴, 바위 가장자리에서 물로 떨어지는 가는 줄기 셋과 물보라 */
function smallRock(x, y, w, fall) {
  const rand = rng(`sr${x}`)
  const fx = x - w * 0.36
  const y0 = y + w * 0.06
  const y1 = y + fall
  let veil = ''
  for (let i = 0; i < 3; i++) {
    const vx = fx + i * 1.7
    veil += `M${pt([vx, y0 + i * 0.6])}C${pt([vx - 0.8, y0 + fall * 0.35])} ${pt([vx + 0.6, y1 - fall * 0.3])} ${pt([vx + (rand() - 0.5) * 1.2, y1])}`
  }
  let mist = ''
  for (let i = 0; i < 12; i++) mist += dot([fx + 1.7 + (rand() - 0.5) * 12, y1 + 0.5 + rand() * 3])
  return [P('sea-ink', veil), P('hatch', mist), ...KIT.ripples(fx + 1.7, y1 + 3, 6, 2, `srr${x}`), ...floater(x, y, w, `sr-rock${x}`)]
}

// ---------------------------------------------------------------- 그림 모으기
const parts = []
// 협곡 위 평원 — 세계 지도처럼 숲 채색을 걷어 낸 트인 땅
const PLAINS = [[337, 197], [308, 207], [312, 240], [293, 269], [298, 308], [317, 341], [308, 375], [332, 404], [365, 418], [404, 428], [438, 414], [462, 389], [495, 385], [529, 365], [562, 356], [582, 327], [606, 298], [596, 260], [615, 226], [587, 207], [548, 202], [510, 202], [471, 197], [433, 197], [394, 197], [361, 197]]
parts.push(P('fill', smooth(PLAINS, true)))
// 풀포기 몇 — 평원
{
  const rand = rng('grass')
  let d = ''
  for (const [x, y] of [[470, 230], [530, 250], [560, 300], [500, 330], [455, 280], [330, 300], [320, 260], [520, 360], [575, 240], [470, 380], [430, 240], [550, 330]]) {
    const s = 4 + rand() * 2
    d += line([[x - s * 0.55, y - s * 0.6], [x - s * 0.1, y]]) + line([[x, y - s], [x, y]]) + line([[x + s * 0.55, y - s * 0.65], [x + s * 0.1, y]])
  }
  parts.push(P('hatch', d))
}
// 칼사이트 평원 — 북쪽 해안의 트인 띠 (아트북: 'crunchy, white sand made of calcite crystals')
{
  const strip = COAST_E.filter(([x]) => x > 640 && x < 905)
  const inner = offset(strip, 22)
  const rand = rng('calcite')
  let dots = ''
  let glints = ''
  for (let i = 0; i < 200; i++) {
    const k = Math.floor(rand() * (strip.length - 1))
    const f = rand()
    const a = strip[k]
    const b = inner[k]
    const p = [a[0] + (b[0] - a[0]) * (0.15 + f * 0.85) + (rand() - 0.5) * 4, a[1] + (b[1] - a[1]) * (0.15 + f * 0.85) + (rand() - 0.5) * 4]
    if (rand() < Math.pow(1 - f, 1.4) * 0.9) dots += dot(p)
    else if (rand() < 0.05) glints += line([[p[0] - 1.6, p[1]], [p[0] + 1.6, p[1]]]) + line([[p[0], p[1] - 1.6], [p[0], p[1] + 1.6]])
  }
  parts.push(P('ink', dots), P('hatch', glints))
}
// 강·협곡·폭포
parts.push(...gorge(), ...magosi())
// 할리마르로 드는 다른 두 강 (세계 지도의 물길, 이름 없음)
parts.push(...stream([[60, 920], [96, 894], [139, 865], [178, 841], [216, 813], [260, 784], [298, 750], [337, 726], [385, 707], [433, 697], [481, 688], [529, 683], [550, 686]], 4, 7))
// 남쪽 강의 어귀 — 세계 지도가 다듬어 그린 중심선 그대로 (남쪽 가장자리 띠에서 세계 지도의 강과 겹친다), 호수 서쪽 물가에서 끝난다
// 끝은 물가 선에서 비스듬히 잘라 — 네모난 끝이 물가 선을 넘어 호수 안에 옅은 조각으로 남지 않게 (물가 선은 context.mjs 의 할리마르 물가)
{
  const SHORE_SW = [[840.5, 935.3], [845.7, 953.3], [852.2, 965], [868.8, 985.9], [874, 990.5], [879.2, 992.6]]
  const cross = (a, b, c, d) => {
    const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0])
    if (!den) return null
    const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den
    const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] : null
  }
  /** 꺾은선을 물가 선과 처음 만나는 곳에서 끊는다 */
  const cut = (pl) => {
    for (let i = 0; i < pl.length - 1; i++)
      for (let j = 0; j < SHORE_SW.length - 1; j++) {
        const x = cross(pl[i], pl[i + 1], SHORE_SW[j], SHORE_SW[j + 1])
        if (x) return [...pl.slice(0, i + 1), x]
      }
    return pl
  }
  const c = dense([[853.7, 1014], [856.3, 1005.6], [859.5, 994], [862.7, 982.4], [864.8, 975], [866.9, 967.6]], false, 4)
  const L = cut(offset(c, (t) => (5.6 + 0.3 * t) / 2))
  const R = cut(offset(c, (t) => -(5.6 + 0.3 * t) / 2))
  const body = poly([...L, ...[...R].reverse()])
  parts.push(P('fill', body), P('sea', body), P('sea-ink', line(L) + line(R)))
}
// 할리마르 절벽과 대양 쪽 절벽
parts.push(...hachure(CLIFF_NW, 1, (p) => Math.max(5, Math.min(18, toLake(p) + 2)), 'cliff-nw', { step: 4.6 }))
parts.push(...hachure(CLIFF_S, 1, (p) => Math.max(5, Math.min(18, toLake(p) + 2)), 'cliff-s', { step: 4.6 }))
parts.push(...hachure(SEA_CLIFF_N, -1, (p) => Math.max(6, Math.min(20, distTo(p, COAST_E) + 1)), 'sea-cliff-n', { step: 4.4 }))
parts.push(...hachure(SEA_CLIFF_S, -1, (p) => Math.max(6, Math.min(20, distTo(p, COAST_E) + 1)), 'sea-cliff-s', { step: 4.4 }))
parts.push(...seaCaves())
// 페이즈1 이 꺼지면 Paralyzing Grasp 그림(동굴 어귀를 맡는 바위)이 없으므로, 표시 밑 절벽 발치에 동굴 어귀 하나를 그린다
parts.push(...KIT.cave(773, 393, 13, 9).map((p) => ({ ...p, phase: false })))
// 물에 잠긴 유적
parts.push(...sunken())
// 남쪽 어깨 할리마르 쪽 모래톱과 매어 둔 배 (The Liberation of Sea Gate: 'a gentle slope down to a quiet beach')
{
  const beach = [[1084, 556], [1085, 576], [1088, 596], [1089, 614]]
  const rand = rng('beach')
  let dots = ''
  for (let i = 0; i < 40; i++) {
    const k = Math.floor(rand() * (beach.length - 1))
    const f = rand()
    const a = beach[k]
    const b = beach[k + 1]
    dots += dot([a[0] + (b[0] - a[0]) * f + 1.5 + rand() * 6, a[1] + (b[1] - a[1]) * f])
  }
  parts.push(P('ink', dots))
}
// 뱃길 — 바다 관문 부두에서 우마라 어귀까지 (아트북: 'ships carry explorers… across the Inland Sea')
// 엘드라지 신전·울라 신전 표시와 이름 위쪽으로 어귀에 든다
const ROUTE = dense([[1012, 504], [992, 538], [958, 570], [910, 588], [850, 596], [780, 596], [710, 592], [650, 587], [595, 580], [545, 571], [508, 571], [486, 581]], false, 6)
parts.push(P('sea-ink', brokenLine(ROUTE, 7, 5, 'route')))
// 넓은 물의 잔물결 몇
for (const [x, y, w, n] of [[728, 462, 10, 2], [892, 432, 13, 3], [1010, 716, 12, 2], [700, 560, 10, 2], [668, 790, 11, 2], [884, 902, 11, 2], [1032, 812, 10, 2], [560, 668, 8, 2]]) parts.push(...KIT.ripples(x, y, w, n, `lr${x}`))
// Red Route — 위 협곡 동쪽 벽의 밝게 칠한 닻 자리 (Red Route 2020: 'the best of them painted in bright colors')
{
  let d = ''
  let k = 0
  for (const [[x, y]] of along(R_ER_UP, 10)) {
    if (y < 236 || y > 326) continue
    if (k++ % 1 === 0) d += ell(x - 4.5, y + 1, 1.2, 1.2)
  }
  parts.push(P('fire', d), P('fire-ink', d))
}
// 서쪽 수직 동굴 (세계 지도의 본보기 자리)
parts.push(...pit(144, 625, 5, 0, 'pit-w'))

// 서 있는 것들 — 뒤(위)에서 앞(아래)으로
const items = []
const add = (y, p) => items.push({ y, parts: p })
add(390, pit(264, 389, 7.5, 3, 'ysterid'))
add(340, portage())
add(420, wren())
add(480, tikal())
add(530, coralhelm())
add(545, enclave())
add(100, hada())
add(140, bulwarkRuins())
add(500, dam())
add(510, seaGate())
// 등대 둘레를 도는 독수리 (Tazeem Raptor 플레이버: 'the eagles circling the Lighthouse')
// (등대 이름이 등실 위에 앉으므로 둘 다 그 밑, 탑 양옆에)
add(390, [P('ink', 'M1052 394q1.6 -1.9 3.2 0q1.6 -1.9 3.2 0M1099 398q1.4 -1.6 2.8 0q1.4 -1.6 2.8 0')])
// 배 — 뱃길 위 둘, 바다 관문 바다 쪽 부두 곁 둘, 남쪽 어깨 모래톱 곁 하나
add(573, boat(956, 573, 5.5, -1))
add(594, boat(742, 595, 5.5, -1))
add(462, boat(1082, 462, 4.6, 1))
add(450, boat(1066, 448, 4, 1))
add(588, boat(1074, 588, 4.2, -1))
parts.push(...stack(items))

// 하늘 — 떠 있는 것은 맨 위에 (세계 지도 헤드론 자리에서 고름)
const sky = skyfalls()
parts.push(...sky.ground, ...sky.air)
parts.push(...tikalSky(), ...coralhelmSky())
for (const [x, y, len, rot, lift] of [
  [736, 528, 18, -4, 2.2], [728, 662, 17, 7, 2.1], [626, 700, 15, 7, 2.3], [786, 706, 20, 20, 2.0], [946, 688, 18, 5, 2.1],
  [212, 712, 17, 15, 2.0], [258, 818, 19, -17, 2.0], [718, 768, 18, 6, 2.1],
]) parts.push(...floatHedron(x, y, len, rot, lift))
parts.push(...smallRock(902, 814, 20, 44))
// Sky Rock — 표시(980.8, 875.1)가 몸통 아래쪽 용골 가까이에 앉게. 이름은 표시 아래 (markAnchors)
parts.push(...skyRock(972, 858, 47))

// ---------------------------------------------------------------- 지형 기호 (세계 지도의 Bulwark·오란리프·평원)
/** 바깥 고리에 구멍 고리를 이어 붙인다 (짝홀 규칙 — 구멍끼리 겹치지 않게) */
const withHoles = (outer, holes) => [...outer, outer[0], ...holes.flatMap((h) => [...h, h[0], outer[0]])]
/** 그림 자리의 나무를 비우는 둥근 구멍 — 가장자리를 조금 흔들어 숲 틈처럼 */
function clearing(cx, cy, rx, ry, seed, n = 18) {
  const rand = rng(seed)
  const out = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const k = 0.9 + rand() * 0.18
    out.push([r1(cx + Math.cos(a) * rx * k), r1(cy + Math.sin(a) * ry * k)])
  }
  return out
}
// Nimbus Wings 밑 — 그림이 숲 기호에 묻히지 않게 (다른 자식 지도처럼 그림 자리의 나무는 비운다)
const NIMBUS_CLEAR = clearing(146, 764, 60, 70, 'clr-nimbus')
const FIELD = {
  nwHeights: { kind: 'mountain', points: [[0, 96], [40, 100], [70, 112], [100, 112], [128, 94], [158, 80], [186, 60], [208, 34], [226, 12], [240, 0], [298, 0], [304, 60], [296, 112], [280, 150], [236, 160], [180, 166], [100, 168], [30, 164], [0, 160]] },
  neHeights: { kind: 'mountain', points: [[384, 0], [478, 0], [494, 30], [514, 54], [540, 76], [560, 94], [574, 118], [598, 140], [628, 140], [638, 158], [600, 166], [560, 162], [520, 156], [470, 150], [420, 150], [386, 144], [376, 80]] },
  foothills: { kind: 'hill', points: [[262, 152], [300, 150], [340, 150], [400, 152], [460, 152], [520, 160], [562, 172], [562, 202], [510, 206], [452, 202], [394, 200], [337, 200], [300, 202], [270, 192]] },
  northShoulder: { kind: 'hill', points: [[716, 182], [702, 216], [697, 255], [697, 298], [712, 341], [726, 362], [769, 356], [813, 344], [851, 338], [880, 318], [885, 284], [856, 250], [837, 216], [803, 190], [760, 188]] },
  southShoulder: { kind: 'hill', points: [[1104, 694], [1098, 730], [1104, 770], [1102, 808], [1104, 850], [1086, 890], [1072, 916], [1090, 946], [1116, 971], [1149, 1000], [1202, 1000], [1202, 690], [1170, 686], [1136, 688]] },
  southEast: { kind: 'forest', points: [[908, 966], [930, 950], [972, 944], [1010, 932], [1056, 922], [1066, 950], [1060, 1000], [904, 1000]], density: 0.5 },
  // 하늘폭포 밑 웅덩이 둘레(River Boa 와 그 이름 자리)는 비운다 — 정글은 웅덩이 서쪽과 남쪽에
  jungle: { kind: 'forest', points: [[125, 216], [130, 255], [149, 288], [183, 317], [221, 332], [260, 322], [288, 293], [300, 284], [292, 276], [264, 280], [238, 270], [226, 248], [222, 222], [216, 204], [196, 196], [154, 202]], density: 1.1 },
  // 페이즈1 — 그림 자리(Archmage Ascension 밑 오목한 들임, Nimbus Wings 밑 구멍)를 비운다
  oranRief: {
    kind: 'forest',
    phase: true,
    points: withHoles([
      [0, 182], [112, 184], [125, 216], [130, 255], [149, 288], [183, 317], [221, 332], [260, 322], [286, 304], [298, 330], [306, 352], [298, 380], [318, 404], [334, 420], [338, 448], [330, 468], [334, 492],
      [242, 494], [234, 560], [236, 632], [330, 634], [380, 626], [420, 618], [462, 628], [500, 648], [512, 700], [526, 740],
      [536, 754], [548, 770], [560, 787], [574, 804], [588, 820], [600, 836], [630, 872], [680, 912], [740, 940], [800, 962], [834, 976], [836, 1000],
      [0, 1000],
    ], [NIMBUS_CLEAR]),
    density: 0.42,
  },
  // 페이즈1 이 꺼지면 그림 자리도 숲으로 — 동쪽 경계는 세계 지도의 숲 채색 가장자리를 따른다
  oranRiefNoPhase: {
    kind: 'forest',
    phase: false,
    points: [
      [0, 182], [112, 184], [125, 216], [130, 255], [149, 288], [183, 317], [221, 332], [260, 322], [286, 304], [298, 330], [306, 352], [298, 380], [318, 404], [334, 420], [338, 448], [330, 468], [334, 492],
      [334, 560], [330, 634], [380, 626], [420, 618], [462, 628], [500, 648], [512, 700], [526, 740],
      [536, 754], [548, 770], [560, 787], [574, 804], [588, 820], [600, 836], [630, 872], [680, 912], [740, 940], [800, 962], [834, 976], [836, 1000],
      [0, 1000],
    ],
    density: 0.42,
  },
  eastRim: { kind: 'forest', points: [[470, 432], [520, 412], [560, 396], [574, 410], [566, 440], [548, 462], [520, 468], [492, 466], [474, 452]], density: 0.6 },
}
const FIELD_ORDER = ['foothills', 'eastRim', 'northShoulder', 'southEast', 'neHeights', 'jungle', 'nwHeights', 'oranRief', 'southShoulder', 'oranRiefNoPhase']

/** 바로 이웃한 같은 칠은 한 path 로 — 칠하는 차례는 그대로 */
function compact(list) {
  const out = []
  for (const p of list) {
    if (!p.d) continue
    const last = out[out.length - 1]
    if (last && last.cls === p.cls && last.phase === p.phase && last.phase2 === p.phase2) last.d += p.d
    else out.push({ cls: p.cls, d: p.d, ...(p.phase === undefined ? {} : { phase: p.phase }), ...(p.phase2 === undefined ? {} : { phase2: p.phase2 }) })
  }
  return out
}

CHILDMAPS.push({
  id: 'halimar',
  size: [1202, 1000],
  glyphScale: 4,
  terrain: FIELD_ORDER.map((k) => FIELD[k]),
  parts: compact(parts),
  labels: [
    { text: 'Halimar', textKo: '할리마르', at: [872, 772], size: 40, kind: 'water' },
    { text: 'Umara River', textKo: '우마라 강', at: [492, 268], size: 22, kind: 'water' },
    { text: 'Oran-Rief', textKo: '오란리프', at: [446, 938], size: 32, kind: 'area' },
    { text: 'The Bulwark', at: [506, 146], size: 28, kind: 'area' },
    { text: 'Calcite Flats', at: [786, 124], size: 18, kind: 'area' },
    // 등실 위에 — 탑 오른쪽에 두면 동쪽 가장자리 띠(x ≥ 1106)에 걸려 이름 끝이 옅어진다
    { text: 'Lighthouse', textKo: '등대', at: [1068, 368], size: 14, kind: 'place' },
  ],
  // 페이즈2(WWK) 대상의 빈터 — 페이즈2 에서만 이 안에 밑동이 떨어지는 지형 기호를 뺀다 (STYLE.md)
  clearings: [
    { points: [[506, 99], [496, 135], [484, 160], [458, 173], [421, 177], [385, 169], [356, 162], [342, 137], [344, 99], [348, 65], [359, 39], [384, 28], [421, 23], [460, 23], [485, 37], [498, 62]], phase2: true }, // hada-freeblade
    { points: [[961, 235], [958, 278], [946, 309], [920, 327], [878, 330], [839, 323], [811, 309], [802, 277], [790, 235], [797, 191], [816, 167], [839, 149], [878, 140], [916, 152], [944, 163], [961, 191]], phase2: true }, // lodestone-golem
    { points: [[520, 491], [512, 525], [491, 547], [463, 565], [409, 565], [355, 563], [324, 548], [302, 527], [297, 491], [303, 456], [325, 434], [355, 418], [409, 411], [464, 415], [501, 428], [517, 455]], phase2: true }, // thada-adel-acquisitor
    { points: [[707, 575], [697, 609], [677, 631], [648, 650], [593, 648], [542, 644], [507, 633], [479, 613], [475, 575], [484, 539], [506, 516], [536, 497], [593, 498], [646, 502], [680, 516], [695, 541]], phase2: true }, // quest-for-ulas-temple
  ],
  subjects: {
    // 페이즈2 — North Hada 울타리 동쪽 언덕길을 지팡이를 짚고 내려서는 젊은 인간 프리블레이드 (카드 이름의 Hada, 이 지도의 추정). North Hada 이름표(오른쪽)와 The Bulwark 이름 사이
    'hada-freeblade': { at: [418, 110], size: 70 },
    // 페이즈2 — 바다 관문 댐 북서쪽 끝과 이어진 북쪽 곶의 해안 평지(Calcite Flats), Explorer's Scope 위: 바다 관문 인어 마법사가 빚은 lodestone 골렘 (아트북 2016)
    'lodestone-golem': { at: [886, 256], size: 96 },
    // 페이즈2 — Tikal 웅덩이 물이 우마라 강으로 빠지는 여울, Enclave 물목 위 — 뒷날 이끈 곳과 공부한 곳 사이 (아트북 2016)
    'thada-adel-acquisitor': { at: [407, 501], size: 70 },
    // 페이즈2 — 울라 신전 표시 바로 북동쪽 물 위, 신전을 찾아 잠수하는 인어 탐험대 (카드 이름의 Ula's Temple = 아트북의 Ula Temple)
    'quest-for-ulas-temple': { at: [593, 545], size: 70 },
    // 커먼 넷 (모두 추정 자리)
    'umara-raptor': { at: [602, 326], size: 70 },
    'explorers-scope': { at: [930, 340], size: 70 },
    'paralyzing-grasp': { at: [760, 427], size: 80 },
    'nimbus-wings': { at: [148, 738], size: 85 },
    // 언커먼 셋과 레어 둘
    'merfolk-seastalkers': { at: [661, 497], size: 85 },
    'merfolk-wayfinder': { at: [850, 640], size: 92 },
    'river-boa': { at: [278, 234], size: 85 },
    'archmage-ascension': { at: [300, 590], size: 88 },
    'sea-gate-loremaster': { at: [1124, 652], size: 88, flip: true },
  },
  markAnchors: {
    // 하다 북부 이름은 울타리 오른쪽 — 왼쪽은 손으로 그린 울타리와 집 위다
    'north-hada': 'right',
    'sea-gate': 'left',
    'umara-skyfalls': 'right',
    'ruins-of-ysterid': 'left',
    'card:magosi-the-waterveil': 'above',
    'magosi-portage': 'right',
    'wren-grotto': 'right',
    'tikal-harborage': 'left',
    coralhelm: 'right',
    'merfolk-enclave': 'below',
    'ula-temple': 'below',
    'card:eldrazi-temple': 'right',
    'halimar-sea-caves': 'right',
    'sky-rock': 'below',
    'card:halimar-depths': 'right',
  },
  focus: [948, 560],
})
