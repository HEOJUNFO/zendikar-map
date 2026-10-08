// 하늘이빨 — 무라사 북서쪽 모서리: Murasa's Wall 의 산 띠와 카줄의 절벽, 대륙 서쪽 절반을 가르는 하늘이빨 산줄기와 그 위의 떠 있는
// '이빨', 산줄기 남동쪽 끝의 해골분쇄 협곡, 동쪽의 Na Plateau 와 Raimunza Falls (자식 지도, 1200×1000 = 세계 x 920–1220, y 1255–1505 의 4배).
// 시점: Zendikar Rising(2020). 하늘이빨과 해골분쇄 협곡은 2020년에도 위험한 길(ZNR Shatterskull, the Hammer Pass), 카줄의 절벽은 지그재그 길과
//       흔들리는 승강기(ZNR Kazuul's Cliffs), Na Plateau 는 금 간 벼랑과 굴, 꼭대기의 빽빽한 자디 숲(ZNR Episode 4). 노래하는 도시는 2020년에
//       '먼지로 납작해졌고' 그 자리에 어린 싹이 돋는다(Episode 5) — 서 있는 탑·성문·유적은 그리지 않는다.
//       Raimunza Hive(벼랑의 얕은 광산 굴, 폭포 꼭대기의 벽돌 마을, 폭포로 돌리는 도르래 권양기)와 카줄의 광산(Wall 안쪽에서 판 굴)은
//       마지막 서술(PG 2010, 아트북 2016)대로 그렸다.
// 공식: 'high, steep-sided mountains … covered in forests', 'huge stalactite-like shards of rock that float above the mountains when the sun
//       shines on them'(PG 2010). 해골분쇄 협곡: 'A wide trail passes through on a relatively shallow incline', 'dozens of "fangs" hang above
//       the pass, their bottoms blunted into flat surfaces'(PG 2010, 아트북 2016). 카줄의 절벽: 'steep zig-zagging trails cut into the cliffs
//       between each harrowing vertical ascent using log-and-rope elevators'(PG 2010). Raimunza Falls 는 Na Plateau 남쪽 면으로 쏟아진다.
// 해석(공식 자리·모양 없음): 해안·Wall 의 산 띠와 안쪽 단애·산줄기 띠·Na Plateau 벼랑·폭포·다섯 이빨의 자리는 세계 지도(그 추정 포함)를
//       따랐다. 협곡 길의 방향과 두 끝, 더 그린 작은 이빨들, 카줄의 절벽 길과 승강기의 모양, 검은 바위 봉우리, 광산 굴과 마을의 모양,
//       다섯 그림의 자리는 이 지도가 정했다.
// 그리지 않는 것 (브리프 mustNotInvent): 이름 없는 지형의 이름, Zektar Shrine·Carnage Altar 지도 이름(그림 이름이 대신한다), 카줄의 집·성문·요새,
//       카줄·오우거·노예, 절벽 밑 부두·배·모래톱, 절벽 위에서 협곡·고원·라이문자로 가는 길, 폭포에서 흘러가는 물줄기·못, 용암·수정·헤드론·
//       엘드라지 황폐, 서 있는 노래하는 도시, 고원의 석상, 짐승 무리, 쓰러진 이빨을 헤드론처럼 그리기.
const K = KIT
const { line, poly, smooth, rng, stack, along, offset } = K
const P = (cls, d) => ({ cls, d })
const r1 = (v) => Math.round(v * 10) / 10
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`
const ell = (x, y, rx, ry) => `M${pt([x - rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x + rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x - rx, y])}Z`
const dot = ([x, y]) => `M${pt([x, y])}h0.1`

// ---------------------------------------------------------------- 기하
/** Catmull-Rom 을 촘촘한 꺾은선으로 */
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
function distTo(x, y, pts) {
  let best = Infinity
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[i + 1]
    const dx = bx - ax
    const dy = by - ay
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)))
    best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy))
  }
  return best
}
const box = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
const inBox = (x, y, [x0, y0, x1, y1], pad = 0) => x > x0 - pad && x < x1 + pad && y > y0 - pad && y < y1 + pad
/** 짝홀 구멍 — 바깥 고리 안에 서로 겹치지 않는 구멍들을 낸다 */
const withHoles = (outer, holes) => [...outer, outer[0], ...holes.flatMap((h) => [...h, h[0], outer[0]])]
/** 이동 평균으로 다듬은 선 (끝점은 그대로) */
function relax(pts, k = 3) {
  return pts.map((p, i) => {
    if (i === 0 || i === pts.length - 1) return p
    let sx = 0
    let sy = 0
    let n = 0
    for (let j = Math.max(0, i - k); j <= Math.min(pts.length - 1, i + k); j++) {
      sx += pts[j][0]
      sy += pts[j][1]
      n++
    }
    return [sx / n, sy / n]
  })
}
/** 벼랑 가장자리를 바위처럼 거칠게 — 촘촘히 하고 법선 쪽으로 낮은 주파수로 흔든다 */
function rough(pts, amp, seed, per = 5) {
  const c = dense(pts, false, per)
  const rand = rng(seed)
  const raw = c.map(() => rand() - 0.5)
  const sm = raw.map((_, i) => (raw[Math.max(0, i - 2)] + 2 * raw[Math.max(0, i - 1)] + 3 * raw[i] + 2 * raw[Math.min(raw.length - 1, i + 1)] + raw[Math.min(raw.length - 1, i + 2)]) / 9)
  return offset(c, (t) => {
    const i = Math.round(t * (c.length - 1))
    const ends = Math.min(1, i / 3, (c.length - 1 - i) / 3)
    return sm[i] * amp * 3 * ends
  })
}
/** 해안을 땅 쪽(진행 방향 왼쪽)으로 d(x, y, 땅 쪽 법선) 만큼 들인 선 — 지형 칸의 바깥 테두리 */
function inset(pts, d) {
  const c = relax(pts, 4)
  return c.map((p, i) => {
    const a = c[Math.max(0, i - 2)]
    const b = c[Math.min(c.length - 1, i + 2)]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const nx = (b[1] - a[1]) / len
    const ny = -(b[0] - a[0]) / len
    const k = d(p[0], p[1], nx, ny)
    return [r1(p[0] + nx * k), r1(p[1] + ny * k)]
  })
}

// ---------------------------------------------------------------- 세계 지도에서 온 자리 (context.mjs, 이 지도 좌표)
// 해안 — 진행 방향 왼쪽이 땅. 북서쪽 바다 틈의 기슭, 남서 해안(대각선), 북쪽 해안(북동쪽 만에서 서쪽 끝까지)
const COAST_NW = [[-29,175],[-27,178],[-22,184],[-18,186],[-13,186],[-7,185],[2,182],[14,184],[29,191],[44,198],[56,201],[64,200],[70,199],[76,203],[82,210],[86,218],[86,228],[86,238],[88,246],[90,252],[92,258],[94,267],[95,278],[96,290],[95,301],[94,312],[96,320],[102,325],[106,329],[106,335],[103,340],[102,348],[103,358],[103,370],[101,381],[98,393],[95,404],[96,414],[96,422],[94,429],[90,434],[84,436],[79,437],[73,435],[68,434],[62,434],[56,435],[45,432],[30,425],[12,417],[-1,414],[-10,416],[-19,418],[-27,419]]
const COAST_SW = [[-28,472],[-25,474],[-16,480],[-8,488],[-1,498],[6,509],[18,521],[34,534],[47,546],[56,554],[60,559],[62,565],[63,572],[64,580],[70,591],[80,605],[88,616],[92,624],[93,627],[91,631],[85,635],[79,640],[75,644],[73,648],[74,654],[82,664],[94,676],[104,685],[113,690],[120,691],[127,690],[133,687],[139,687],[146,690],[155,696],[163,702],[167,708],[170,714],[172,717],[176,718],[181,719],[186,722],[191,727],[195,737],[198,753],[201,771],[201,783],[198,789],[195,794],[193,799],[193,805],[197,812],[204,819],[213,825],[218,830],[219,833],[217,836],[211,841],[202,847],[193,854],[186,860],[181,868],[178,874],[177,880],[180,887],[188,896],[200,907],[216,918],[237,928],[259,938],[274,947],[282,953],[290,959],[300,966],[312,973],[323,977],[332,979],[339,980],[346,982],[354,985],[364,989],[377,993],[394,998],[412,1002],[433,1005],[453,1006],[466,1008],[474,1012],[478,1017],[481,1023],[481,1028]]
const COAST_N = [[1229,524],[1227,523],[1222,520],[1216,516],[1210,509],[1206,499],[1204,488],[1204,475],[1201,465],[1195,457],[1188,452],[1185,448],[1184,444],[1182,442],[1178,442],[1171,442],[1163,440],[1156,435],[1150,428],[1147,419],[1146,408],[1145,399],[1143,393],[1140,390],[1138,386],[1137,382],[1139,376],[1144,366],[1151,350],[1157,334],[1159,320],[1158,309],[1154,302],[1150,300],[1145,301],[1140,304],[1136,309],[1131,314],[1123,319],[1114,323],[1104,324],[1092,322],[1080,319],[1070,316],[1063,312],[1059,306],[1057,296],[1057,283],[1057,273],[1056,267],[1054,262],[1051,259],[1046,257],[1043,253],[1042,248],[1043,242],[1048,231],[1058,214],[1070,194],[1077,175],[1080,158],[1078,144],[1074,135],[1066,130],[1061,125],[1059,120],[1057,114],[1051,108],[1042,102],[1034,96],[1030,90],[1029,83],[1028,77],[1026,73],[1024,69],[1024,62],[1024,53],[1024,46],[1021,42],[1016,41],[1012,44],[1009,50],[1007,57],[1003,63],[996,69],[990,75],[986,82],[984,89],[980,95],[975,101],[968,107],[963,111],[958,113],[954,114],[947,113],[940,110],[932,111],[922,115],[912,123],[904,132],[897,144],[889,153],[881,157],[872,158],[863,160],[853,164],[844,168],[835,169],[828,169],[819,172],[809,179],[798,189],[789,194],[781,194],[776,189],[771,181],[769,170],[765,160],[759,152],[752,146],[746,135],[741,120],[737,103],[733,93],[730,90],[725,91],[716,96],[704,104],[693,108],[686,108],[679,107],[673,109],[665,113],[656,116],[649,114],[644,110],[639,104],[634,98],[629,91],[624,86],[616,81],[610,77],[607,73],[607,69],[606,65],[603,62],[599,59],[595,59],[592,60],[590,62],[589,65],[588,68],[586,72],[583,75],[580,79],[578,84],[578,91],[579,97],[582,102],[585,107],[588,113],[588,121],[589,130],[593,142],[600,156],[603,168],[601,177],[595,182],[588,184],[581,183],[574,181],[568,182],[563,184],[558,186],[552,184],[545,180],[537,178],[529,178],[521,180],[517,183],[516,187],[515,190],[513,194],[510,196],[506,198],[500,198],[493,199],[487,201],[482,204],[475,203],[464,198],[449,189],[437,180],[430,173],[426,168],[420,164],[413,162],[406,158],[397,152],[389,142],[384,132],[382,122],[380,113],[378,107],[374,103],[371,101],[367,101],[364,102],[360,102],[355,100],[350,98],[345,99],[341,101],[336,102],[332,101],[327,98],[322,96],[315,96],[308,97],[300,99],[292,102],[282,103],[272,102],[261,97],[251,94],[244,94],[238,95],[230,93],[222,88],[215,84],[210,83],[208,84],[207,89],[208,98],[209,108],[208,116],[203,121],[198,124],[192,124],[186,121],[180,120],[175,120],[169,122],[163,121],[156,117],[150,110],[146,102],[142,92],[135,81],[125,68],[112,57],[102,54],[93,58],[85,66],[75,72],[65,79],[55,82],[46,79],[39,75],[30,75],[21,77],[11,78],[1,76],[-7,70],[-13,63],[-17,56],[-21,48],[-30,41]]
const COASTS = [COAST_NW, COAST_SW, COAST_N]
const coastDist = (x, y) => Math.min(...COASTS.map((c) => distTo(x, y, c)))
// Murasa's Wall 의 안쪽 단애 (세계 지도 murasas-wall-inner, 아래 가장자리에서 서쪽을 올라 북쪽을 지나 동쪽 가장자리로; 진행 방향 오른쪽이 낮은 안쪽)
const SCARP = [[634,1030],[630,1013],[621,965],[592,917],[554,883],[510,864],[458,854],[405,845],[366,816],[357,763],[342,715],[333,662],[299,619],[261,586],[227,552],[227,504],[242,456],[251,403],[251,350],[251,302],[261,259],[309,274],[352,302],[395,331],[443,350],[496,350],[549,341],[597,331],[650,322],[693,312],[741,336],[794,346],[846,336],[894,312],[918,350],[938,394],[976,432],[1014,470],[1048,514],[1086,557],[1130,590],[1182,610],[1235,614]]
// Na Plateau 의 벼랑 (세계 지도 na-plateau-cliffs — 오른쪽 가장자리에서 서쪽으로, 남쪽으로 돌아 폭포 틈까지 / 폭포 틈 동쪽에서 가장자리까지; 진행 방향 오른쪽이 바깥)
const NA_W = [[1232,682],[1178,677],[1125,672],[1072,672],[1034,701],[1010,739],[1000,782],[1005,826],[1029,859],[1062,883],[1096,898],[1132,903]]
const NA_E = [[1176,906],[1221,902]]
const FALLS = [1154, 902] // 세계 지도 raimunza-falls 폭포 기호
// 떠 있는 이빨 (세계 지도 floating-rock 기호 다섯: 땅 위 그림자 자리)
const WORLD_FANGS = [
  { at: [856, 648], s: 0.9, blunt: true }, // shatterskull-fang-1
  { at: [966, 658], s: 0.7, blunt: true, lift: 0.34 }, // shatterskull-fang-2
  { at: [875, 778], s: 0.7, blunt: true }, // shatterskull-fang-3
  { at: [395, 562], s: 0.8 }, // skyfang-fang-west
  { at: [587, 610], s: 0.7 }, // skyfang-fang-middle
]
// 해골분쇄 협곡 길 — 북동쪽 언덕에서 들어와 표시 바로 서쪽을 지나 남서쪽 트인 골짜기로 (방향과 두 끝은 이 지도의 해석)
const TRAIL = [[1080,598],[1048,608],[1018,624],[990,646],[962,670],[934,696],[910,722],[886,752],[862,786],[838,820],[816,852],[798,884],[782,918],[766,954],[752,992],[746,1012]]

// ---------------------------------------------------------------- 그림·이름 자리
const SUBJECTS = {
  'kazuul-warlord': { at: [501, 302], size: 88 },
  'zektar-shrine-expedition': { at: [480, 500], size: 100 },
  'carnage-altar': { at: [540, 762], size: 96 },
  'shatterskull-giant': { at: [806, 880], size: 98 },
  'ruinous-minotaur': { at: [994, 550], size: 90, flip: true },
}
const LABELS = [
  { text: 'Skyfang Mountains', textKo: '하늘이빨', at: [752, 478], size: 32, kind: 'area' },
  { text: 'Na Plateau', at: [1098, 760], size: 22, kind: 'area' },
  { text: 'Raimunza Falls', at: [1118, 966], size: 16, kind: 'water' },
]
// 비울 상자 [x0, y0, x1, y1]
const KEEP = {
  skyfang: [572, 458, 932, 494],
  na: [1024, 748, 1172, 772],
  fallsLabel: [1064, 956, 1172, 976],
  kazuul: [458, 212, 548, 324],
  kazuulLabel: [580, 204, 690, 228],
  zektar: [428, 398, 532, 520],
  carnage: [490, 698, 592, 790],
  giant: [754, 780, 860, 904],
  minotaur: [946, 458, 1044, 570],
  minotaurCap: [940, 570, 1050, 592],
  passLabel: [922, 704, 1036, 728],
  aridLabel: [1084, 696, 1162, 716],
  singing: [1090, 796, 1200, 818],
  hiveLabel: [1070, 920, 1180, 942],
  wallLabel: [344, 944, 444, 966],
}
const kept = (x, y, pad = 0, skip = []) => Object.entries(KEEP).some(([k, b]) => !skip.includes(k) && inBox(x, y, b, pad))

// ---------------------------------------------------------------- 1. 바다 벼랑 — 'a vast, steep-walled plateau that rises sharply from the sea' (PG).
// 해안 조금 안쪽에 벼랑 위 선을 긋고 해안 쪽으로 짧은 빗금. depth(x, y) 로 카줄의 절벽 자리만 깊게.
function seaCliff(coast, seed, depth) {
  const rand = rng(seed)
  const C = dense(coast, false, 2)
  let ticks = ''
  let edge = ''
  let shade = ''
  let run = []
  let runB = []
  const flush = () => {
    if (run.length > 2) {
      edge += smooth(run)
      shade += poly([...run, ...[...runB].reverse()])
    }
    run = []
    runB = []
  }
  for (const [[x, y], [ux, uy]] of along(C, 4.6)) {
    const nx = uy
    const ny = -ux
    const D = depth(x, y)
    const tx = x + nx * D
    const ty = y + ny * D
    const off = x < -12 || x > 1212 || y < -12 || y > 1012 || coastDist(tx, ty) < D * 0.7 || kept(tx, ty, 2)
    if (off || D < 1) {
      flush()
      continue
    }
    const L = D * (0.72 + rand() * 0.3)
    ticks += line([[x + nx * L, y + ny * L], [x + nx * 2, y + ny * 2]])
    run.push([tx, ty])
    runB.push([x + nx * D * 0.45, y + ny * D * 0.45])
  }
  flush()
  return [P('shade', shade), P('hatch', ticks), P('ink', edge)]
}

// ---------------------------------------------------------------- 2. 벼랑 — 가장자리(굵은 잉크)에서 낮은 쪽으로 털선과 그늘
/** side 1: 진행 방향 오른쪽이 낮다. depth(x, y) 는 털선 길이, skip(x, y) 는 털선을 거르는 자리 */
function rim(C, side, depth, seed, o = {}) {
  const rand = rng(seed)
  let ticks = ''
  let strong = ''
  const top = []
  const bot = []
  let shade = ''
  const flush = () => {
    if (top.length > 1) shade += poly([...top, ...[...bot].reverse()])
    top.length = 0
    bot.length = 0
  }
  for (const [[x, y], [ux, uy]] of along(C, o.step ?? 4.4)) {
    const D = depth(x, y)
    const nx = -uy * side
    const ny = ux * side
    if (D < 3 || (o.skip && (o.skip(x, y) || o.skip(x + nx * D, y + ny * D) || o.skip(x + nx * D * 0.5, y + ny * D * 0.5)))) {
      flush()
      continue
    }
    const L = D * (0.42 + rand() * 0.58)
    const j = (rand() - 0.5) * 0.2
    ticks += line([[x + nx * 0.8, y + ny * 0.8], [x + (nx + ux * j) * L, y + (ny + uy * j) * L]])
    if (rand() < (o.drip ?? 0.1)) strong += line([[x + nx, y + ny], [x + nx * D * 1.05, y + ny * D * 1.05]])
    top.push([x, y])
    bot.push([x + nx * D * (o.shadeK ?? 0.55), y + ny * D * (o.shadeK ?? 0.55)])
  }
  flush()
  const edge = o.edgeSkip ? C.filter(([x, y]) => !o.edgeSkip(x, y)) : C
  return [P('shade', shade), P('hatch', ticks), P('ink', strong), P(o.bold === false ? 'ink' : 'ink-bold', line(edge))]
}
// Wall 의 안쪽 단애 — 'Inland from these cliffs, the land drops off sharply' (PG). 털선은 안쪽으로.
const C_SCARP = rough(SCARP, 1.3, 'scarp')
const scarp = rim(C_SCARP, 1, (x, y) => (y > 1012 ? 0 : 20), 'rim-scarp', { drip: 0.06, shadeK: 0.45, step: 5, skip: (x, y) => kept(x, y, 2) })

// ---------------------------------------------------------------- 3. 이빨 — 'huge stalactite-like shards of rock that float above the mountains when the sun
// shines on them' (PG). 위는 깨진 윗면, 아래로 좁아지는 종유석 꼴의 돌, 땅에 흐린 그림자. 협곡 위의 것은 밑이 납작하게 닳았다
// ('their bottoms blunted into flat surfaces by countless ground shuddering impacts'). (x, y) 는 땅 위 그림자 자리, len 은 돌 길이.
function fang(x, y, len, seed, o = {}) {
  const rand = rng(seed)
  const lift = o.lift ?? len * 0.6
  const w = len * (0.5 + rand() * 0.12)
  const yb = y - lift
  const yt = yb - len
  const lean = (rand() - 0.5) * len * 0.14
  const j = (k) => (rand() - 0.5) * k
  const U = (u, v) => [x + u * w + lean * v, yt + v * len]
  // 깨진 윗면, 꺾인 턱이 있는 두 옆면, 밑은 뾰족하거나(산줄기 위) 닳아 납작하다(협곡 위)
  const top = [U(-0.5, 0.06), U(-0.26 + j(0.06), -0.03), U(-0.04, 0.05), U(0.2 + j(0.06), -0.05), U(0.5, 0.05)]
  const right = [U(0.46, 0.22), U(0.3, 0.34), U(0.33, 0.46), U(0.16, 0.76)]
  const left = [U(-0.12, 0.74), U(-0.3, 0.46), U(-0.37, 0.4), U(-0.45, 0.2)]
  const bw = o.blunt ? 0.12 + rand() * 0.04 : 0
  const bottom = o.blunt ? [U(bw, 1), U(-bw, 1)] : [U(0.02, 1.04)]
  const body = poly([...top, ...right, ...bottom, ...left])
  // 결 — 윗면 앞 가장자리, 가운데 모서리, 그늘 쪽 짧은 결
  const ridgeTop = U(0.04, 0.12)
  const ridgeBot = o.blunt ? U(bw * 0.4, 1) : U(0.02, 1.04)
  const shadeD = poly([ridgeTop, U(0.5, 0.05), ...right, ...(o.blunt ? [U(bw, 1)] : []), ridgeBot])
  let hatch = `M${pt(U(-0.5, 0.06))}Q${pt(U(-0.1, 0.16))} ${pt(ridgeTop)}Q${pt(U(0.3, 0.1))} ${pt(U(0.5, 0.05))}`
  hatch += line([ridgeTop, ridgeBot])
  for (const [u, v, l] of [[0.16, 0.24, 0.2], [0.26, 0.3, 0.12], [0.12, 0.5, 0.18], [0.2, 0.52, 0.1]]) hatch += line([U(u, v), U(u - 0.04, v + l)])
  const shadow = ell(x + lean * 0.4, y, w * 0.42, w * 0.11)
  return [P('shade', shadow), P('fill', body), P('stone', body), P('shade', shadeD), P('hatch', hatch), P('ink', body)]
}
// 더 그린 이빨 — 협곡 위에 수십 개('dozens'), 산줄기 위에 몇 개. 자리는 이 지도의 해석.
const MORE_FANGS = [
  // 협곡 위 (밑이 닳은 것)
  [900, 642, 34], [818, 664, 28], [1012, 690, 30], [826, 712, 32], [884, 694, 24], [956, 782, 28], [1004, 772, 24],
  [846, 758, 26], [918, 800, 24], [1036, 664, 24], [884, 852, 24], [774, 696, 22], [794, 746, 22], [934, 664, 20],
  // 산줄기 위
  [704, 604, 30], [300, 500, 32], [800, 568, 28], [650, 420, 26],
]
function fangs() {
  const items = []
  WORLD_FANGS.forEach((f, i) => items.push({ y: f.at[1], parts: fang(f.at[0], f.at[1], 66 * f.s, `wf${i}`, { blunt: f.blunt, lift: f.lift ? f.lift * 66 * f.s : undefined }) }))
  MORE_FANGS.forEach(([x, y, len], i) => items.push({ y, parts: fang(x, y, len, `mf${i}`, { blunt: i < 14 }) }))
  return stack(items)
}

// ---------------------------------------------------------------- 4. 해골분쇄 협곡 길 — 'A wide trail passes through on a relatively shallow incline' (PG).
// 넓은 두 줄 길, 길 위에 이빨이 떨어져 팬 납작한 자국('countless ground shuddering impacts'), 거인 곁에 떨어진 돌('Rocks fell all night').
function passTrail() {
  const c = dense(TRAIL, false, 5)
  const half = (t) => 10 + t * 3
  const L = offset(c, (t) => half(t))
  const R = offset(c, (t) => -half(t))
  const body = poly([...L, ...[...R].reverse()])
  const out = [P('fill', body)]
  // 가장자리 — 북동쪽 끝은 언덕으로 흐려진다
  const n = c.length
  const fadeAt = Math.floor(n * 0.1)
  out.push(P('hatch', line(L.slice(0, fadeAt + 1)) + line(R.slice(0, fadeAt + 1))))
  out.push(P('ink', line(L.slice(fadeAt)) + line(R.slice(fadeAt))))
  // 팬 자국
  let dents = ''
  let dentShade = ''
  const rand = rng('dents')
  for (const [[x, y]] of along(c.slice(fadeAt), 34)) {
    const dx = x + (rand() - 0.5) * 6
    const dy = y + (rand() - 0.5) * 3
    if (kept(dx, dy, 2, ['passLabel'])) continue
    const rx = 2.6 + rand() * 1.6
    dents += ell(dx, dy, rx, rx * 0.45)
    dentShade += `M${pt([dx - rx * 0.8, dy - rx * 0.1])}Q${pt([dx, dy - rx * 0.55])} ${pt([dx + rx * 0.8, dy - rx * 0.1])}`
  }
  out.push(P('shade', dents), P('hatch', dentShade))
  return out
}
const trailRocks = [...K.rocks(838, 892, 4.5, 3, 'tr1'), ...K.rocks(760, 860, 4, 2, 'tr2'), ...K.rocks(818, 818, 3.6, 2, 'tr3')]

// ---------------------------------------------------------------- 5. 카줄의 절벽 — 'steep zig-zagging trails cut into the cliffs between each harrowing
// vertical ascent using log-and-rope elevators' (PG). 표시 바로 북쪽 바다 벼랑에 지그재그 길과 통나무·밧줄 승강기 둘. 위에는 아무것도 짓지 않는다.
function lift(x, y0, y1, dir = 1) {
  // 통나무 기둥 하나와 내민 들보, 늘어진 밧줄과 매달린 발판 — y0 위 마당, y1 아래 마당. dir: 들보를 내민 쪽
  const top = Math.min(y0, y1) - 5
  const bx = x + dir * 5
  const post = line([[x, Math.max(y0, y1) + 1], [x, top]]) + line([[x - dir * 0.6, top], [bx + dir * 0.8, top]]) + line([[x, top + 2.4], [x + dir * 2.4, top]])
  const py = (y0 + y1) / 2 + 1
  const rope = line([[bx, top], [bx, py - 1.2]])
  const plat = poly([[bx - 2.2, py - 1.2], [bx + 2.2, py - 1.2], [bx + 2.2, py + 0.6], [bx - 2.2, py + 0.6]])
  return [P('fill', plat), P('stone', plat), P('ink', post + plat), P('hatch', rope)]
}
// 벼랑 면 — 물가(북쪽)에서 벼랑 위(남쪽, 표시)까지. 세계 해안선 그대로 두고 그 안쪽에 더 깊은 면을 그린다.
const K_SHORE = [[512, 194], [516, 187], [521, 180], [529, 178], [537, 178], [545, 180], [552, 184], [558, 186], [563, 184], [568, 182], [574, 181], [581, 183], [588, 184], [595, 182]]
// 동쪽 끝은 표시 이름(오른쪽) 앞에서 바다 쪽으로 접어 이름과 겹치지 않게
const K_TOP = [[506, 206], [520, 214], [540, 220], [558, 223], [569, 220], [576, 212], [582, 202], [588, 192], [595, 182]]
function kazuulCliffs() {
  const out = []
  const rand = rng('kz')
  const face = poly([...K_SHORE, ...[...K_TOP].reverse()])
  const shoreY = (x) => {
    for (let i = 0; i < K_SHORE.length - 1; i++) {
      const [ax, ay] = K_SHORE[i]
      const [bx, by] = K_SHORE[i + 1]
      if (x >= ax && x <= bx) return ay + ((by - ay) * (x - ax)) / (bx - ax)
    }
    return null
  }
  // 벼랑 면의 결 — 위 가장자리에서 물 쪽(북쪽)으로 곧게 떨어지는 빗금
  let ticks = ''
  for (const [[x, y]] of along(dense(K_TOP, false, 3), 3.4)) {
    const sy = shoreY(x)
    if (sy === null || sy > y - 3) continue
    const k = 0.62 + rand() * 0.34
    ticks += line([[x, y - 0.6], [x + (rand() - 0.5) * 0.8, y - (y - sy) * k]])
  }
  out.push(P('shade', face), P('hatch', ticks))
  // 지그재그 길 — 가로 길 셋을 벼랑에 깎아 내고, 곧추선 오름 둘에 통나무·밧줄 승강기
  // 물가에서 시작해 셋째 길이 표시(벼랑 위) 바로 앞에서 끝난다
  const legs = [[[530, 189], [574, 191]], [[575, 201], [535, 202]], [[537, 212], [568, 216]]]
  out.push(P('fill', legs.map((l) => poly([...offset(l, 2.3), ...offset(l, -2.3).reverse()])).join('')))
  out.push(P('ink-bold', legs.map((l) => line(l)).join('')))
  out.push(...lift(575, 201, 191, 1), ...lift(535, 212, 202, -1))
  out.push(P('ink', smooth(K_TOP)))
  return out
}

// ---------------------------------------------------------------- 6. Na Plateau — 'Roughly a quarter mile high … Wurms dwell in the cracked cliffs' (PG),
// 'towering cliffs, as tall as Murasa's Wall … the cliffs' caves' (ZNR Ep. 4). 깊은 털선의 벼랑, 금, 서쪽 면의 굴 몇.
const C_NA_W = rough(NA_W, 1.6, 'na-w')
const C_NA_E = rough(NA_E, 1.2, 'na-e')
const naSkip = (x, y) => kept(x, y, 1, ['na', 'singing'])
const naCliff = [...rim(C_NA_W, 1, (x) => (x > 1205 ? 0 : 30), 'rim-na', { drip: 0.16, shadeK: 0.6, step: 3.8, skip: naSkip }), ...rim(C_NA_E, 1, (x) => (x > 1205 ? 0 : 26), 'rim-na-e', { drip: 0.16, shadeK: 0.6, step: 3.8 })]
function cracks() {
  // 벼랑 면을 가로지르는 금 — 가장자리에서 아래로 갈라져 내린다
  let d = ''
  for (const [x, y, dx, dy] of [[1012, 760, -18, 6], [1004, 806, -20, 2], [1040, 872, -10, 18], [1090, 900, -6, 22], [1066, 676, -4, -20], [1140, 674, 2, -18]]) {
    d += `M${pt([x, y])}L${pt([x + dx * 0.4 + 2, y + dy * 0.4 + 1])}L${pt([x + dx * 0.7 - 1, y + dy * 0.7])}L${pt([x + dx, y + dy])}`
  }
  return [P('ink', d)]
}
const naCaves = [...K.cave(986, 772, 7, 6), ...K.cave(990, 820, 6, 5), ...K.cave(1036, 884, 6, 5)]

// ---------------------------------------------------------------- 7. Raimunza Falls 와 Raimunza Hive — 'a raging torrent of water that cascades off the southern
// side of the Na Plateau … used to propel log-and-pulley winches' (PG), 'At the top of the falls is a scattering of brick shops and dwellings … The mines
// themselves are crude, shallow caves dug into the cliff face' (아트북 2016). 물줄기는 폭포 밑에서 물보라로 끝난다 (세계 지도처럼 강과 잇지 않는다).
function falls() {
  const [x, y] = FALLS
  const rand = rng('falls')
  const top = y - 3
  const bot = y + 17
  // 위가 좁고 아래로 퍼지는 물 장막 (세계 지도 폭포 기호처럼 두 단, 가운데 바위턱)
  const body = `M${pt([x - 7, top])}L${pt([x + 7, top])}C${pt([x + 8, top + 8])} ${pt([x + 10, bot - 6])} ${pt([x + 11, bot])}L${pt([x - 11, bot])}C${pt([x - 10, bot - 6])} ${pt([x - 8, top + 8])} ${pt([x - 7, top])}Z`
  let veil = ''
  for (let i = 0; i < 6; i++) {
    const u = -5.5 + i * 2.2
    veil += `M${pt([x + u, top + 1])}C${pt([x + u * 1.05, top + 6])} ${pt([x + u * 1.35, bot - 7])} ${pt([x + u * 1.5 + (rand() - 0.5), bot - 0.5])}`
  }
  const ledge = line([[x - 9, y + 7], [x - 6.5, y + 6.6]]) + line([[x + 6.5, y + 6.6], [x + 9, y + 7]])
  let spray = ''
  for (let i = 0; i < 4; i++) {
    const sx = x - 10 + i * 6.6
    spray += `M${pt([sx - 3.6, bot + 1.6])}Q${pt([sx, bot - 1.6])} ${pt([sx + 3.6, bot + 1.6])}`
  }
  let mist = ''
  for (let i = 0; i < 14; i++) mist += dot([x + (rand() - 0.5) * 30, bot - 1 + rand() * 3.5])
  // 윗물 — 고원 위에서 폭포 머리로 드는 짧은 물목
  const lip = poly([[x - 7, top], [x - 5, top - 8], [x + 5, top - 8], [x + 7, top]])
  return [P('fill', body + lip), P('sea', body + lip), P('sea-ink', veil + spray + line([[x - 5, top - 8], [x - 7, top]]) + line([[x + 5, top - 8], [x + 7, top]])), P('ink', ledge), P('hatch', mist)]
}
function hive() {
  const out = []
  // 벼랑 면을 벌집처럼 뚫은 얕은 굴 — 폭포 양옆 벼랑 면에 두 줄
  const rand = rng('hive')
  let holes = ''
  for (const [x, y] of [[1104, 906], [1116, 909], [1128, 910], [1110, 917], [1122, 918], [1098, 914], [1176, 912], [1188, 914], [1182, 921], [1196, 918]]) {
    const w = 2.6 + rand() * 1
    holes += `M${pt([x - w, y + 1.4])}Q${pt([x - w, y - w * 1.3])} ${pt([x, y - w * 1.3])}Q${pt([x + w, y - w * 1.3])} ${pt([x + w, y + 1.4])}Z`
  }
  out.push(P('dark', holes))
  // 폭포 곁 벼랑 끝의 도르래 권양기 — 폭포 힘으로 광부와 광석을 오르내린다
  out.push(...lift(1136, 908, 900, -1))
  // 폭포 꼭대기의 벽돌 마을 (작은 집 다섯)
  const houses = [[1122, 884, 9, 7], [1135, 880, 8, 6], [1174, 885, 9, 7], [1187, 879, 8, 6], [1164, 878, 7, 6]]
  out.push(...stack(houses.map(([x, y, w, h], i) => ({ y, parts: K.house(x, y, w, h, { roof: i % 2 ? 'hip' : 'gable', door: false }) }))))
  return out
}

// ---------------------------------------------------------------- 8. 노래하는 도시 — 2020년 'Flattened into dust … vines and young shoots were sprouting up from the
// destruction' (Episode 5). 표시 둘레의 작은 먼지 빈터에 어린 싹 몇. 탑·성문·무너진 벽은 그리지 않는다.
function singingDust() {
  const rand = rng('dust')
  const cx = 1184
  const cy = 808
  let dust = ''
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI * 2
    const r = 6 + rand() * 18
    dust += dot([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6])
  }
  // 어린 싹 — 짧은 줄기에 작은 잎 둘
  let stems = ''
  let leaves = ''
  for (const [x, y] of [[1172, 818], [1196, 822], [1192, 794], [1170, 798], [1184, 826]]) {
    stems += `M${pt([x, y])}q0.5 -2.6 0 -4.6`
    leaves += `M${pt([x + 0.2, y - 2.6])}q-1.4 -1.6 -3.2 -1.2q1 1.6 3.2 1.2Z`
    leaves += `M${pt([x + 0.1, y - 3.8])}q1.4 -1.6 3.2 -1.2q-1 1.6 -3.2 1.2Z`
  }
  return [P('hatch', dust), P('forest', leaves), P('ink', stems + leaves)]
}

// ---------------------------------------------------------------- 9. 카줄의 광산 — 'a network of mines inside Murasa's Wall, dug from the inland side of the mountains'
// (아트북 2016). 자리는 서술이 없어, 절벽 길과 먼 서쪽 단애의 안쪽 면에 이름 없는 작은 굴 둘.
const adits = [...K.cave(264, 600, 6, 5), ...K.cave(360, 784, 6, 5)]

// ---------------------------------------------------------------- 10. Zektar Shrine 밑의 검은 바위 봉우리 — 'high in the black-stone Shatterskull Mountains'
// (The Moment of Discovery 2009; 하늘이빨로 본 것은 이 지도의 해석). 그림의 봉우리가 서는 높은 어깨, 짙은 돌빛과 빽빽한 결.
function blackSummit() {
  const rand = rng('black')
  const base = 552
  // 그림의 봉우리 밑동(y≈500, x 432–528)에서 양옆으로 흘러내리는 들쭉날쭉한 어깨
  const L = [[384, base], [394, base - 12], [402, base - 16], [410, base - 26], [418, base - 30], [424, 514], [432, 501]]
  const R = [[528, 501], [536, 512], [542, 516], [548, base - 30], [556, base - 22], [562, base - 20], [572, base - 10], [584, base]]
  const pts = [...L, [480, 499], ...R]
  const body = poly(pts)
  const shadeD = poly([[482, 499], ...R, [496, base]])
  let hatch = ''
  // 밝은 왼쪽 어깨 — 성긴 결, 그늘진 오른쪽 어깨 — 빽빽한 결 (그림 이름 자리는 비운다)
  for (let x = 388; x < 582; x += x < 430 ? 5 : 3) {
    const yTop = x < 432 ? base - ((x - 384) / 48) * 51 : x > 528 ? base - ((584 - x) / 56) * 51 : 501
    const len = (base - yTop) * (0.55 + rand() * 0.4)
    if (len < 4) continue
    const y0 = yTop + 2.5
    const y1 = y0 + len
    if (x > 418 && x < 546 && y1 > 502) {
      if (y0 < 502) hatch += line([[x + 1, y0], [x + 1 - (502 - y0) * 0.2, 502]])
      if (y1 > 530) hatch += line([[x + 1 - (530 - y0) * 0.2, 530], [x + 1 - len * 0.2, y1]])
      continue
    }
    hatch += line([[x + 1, y0], [x + 1 - len * 0.2, y1]])
  }
  // 그늘진 오른쪽 어깨에 엇갈린 결을 하나 더 — 판화에서 검은 돌을 짙게 보이는 방식
  for (let x = 534; x < 580; x += 3.6) {
    const yTop = base - ((584 - x) / 56) * 51
    const len = (base - yTop) * (0.5 + rand() * 0.3)
    const y0 = Math.max(yTop + 4, x < 548 ? 531 : 0)
    const y1 = yTop + 4 + len
    if (y1 - y0 < 3) continue
    hatch += line([[x, y0], [x + (y1 - y0) * 0.45, y1]])
  }
  // 바위 턱 — 어깨를 가로지르는 짧은 금
  const crags = line([[398, 538], [408, 534], [414, 538]]) + line([[552, 532], [562, 536], [570, 534]]) + line([[540, 544], [548, 542]])
  return [P('fill', body), P('stone', body), P('shade', shadeD), P('shade', shadeD), P('hatch', hatch), P('ink', crags), P('ink-bold', line(pts))]
}

// ---------------------------------------------------------------- 11. 하늘이빨 산줄기 — 'These high, steep-sided mountains are covered in forests. They extend from the
// western side of Murasa and wind deep into its interior' (PG). 세계 지도 skyfang-range 띠(서쪽은 Wall 의 단애에서 자름) 안에 세계 지도 산 기호와
// 같은 꼴(볼록한 왼쪽 비탈, 곧은 오른쪽 비탈, 오른쪽 결)을 더 크고 가파르게, 산마루(SPINE)로 갈수록 높게. 협곡 길 자리는 비워 고갯마루가 트인다.
const RANGE_RING = [[238,504],[248,456],[256,400],[290,384],[400,402],[520,376],[640,356],[760,342],[862,374],[938,440],[986,524],[1022,600],[1000,677],[971,744],[952,792],[894,811],[827,782],[760,736],[683,710],[597,710],[501,690],[405,690],[344,682],[336,662],[303,622],[266,590],[240,556]]
const SPINE = [[230, 548], [330, 560], [420, 556], [520, 552], [640, 566], [760, 590], [860, 624], [940, 664], [1000, 700]]
const spineY = (x) => {
  for (let i = 0; i < SPINE.length - 1; i++) {
    const [ax, ay] = SPINE[i]
    const [bx, by] = SPINE[i + 1]
    if (x >= ax && x <= bx) return ay + ((by - ay) * (x - ax)) / (bx - ax)
  }
  return x < SPINE[0][0] ? SPINE[0][1] : SPINE[SPINE.length - 1][1]
}
/** 세계 지도 산 기호(terrain.ts mountainGlyph)의 큰 꼴 — (x, y) 밑 가운데, w 반너비, h 높이 */
function peak(x, y, w, h, rand, o = {}) {
  const ax = x + (rand() - 0.5) * w * 0.4
  const ay = y - h
  const lx = x - w
  const rx = x + w * (0.85 + rand() * 0.2)
  const slope = `M${pt([lx, y])}Q${pt([lx + w * 0.45, y - h * 0.62])} ${pt([ax, ay])}L${pt([rx, y])}`
  let hatch = ''
  const n = 3 + Math.floor(rand() * 3)
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1)
    const px = ax + (rx - ax) * t
    const py = ay + (y - ay) * t
    const len = (y - py) * (0.55 + rand() * 0.3)
    hatch += line([[px - 1.2, py + 1.6], [px - len * 0.3, py + len]])
  }
  const out = [P('fill', slope + 'Z')]
  if (o.shade) out.push(P('shade', poly([[ax, ay], [rx, y], [ax + (rx - ax) * 0.05 - w * 0.25, y]])))
  out.push(P('hatch', hatch), P('ink', slope))
  return out
}
const LABEL_BOX = [576, 456, 928, 494] // 하늘이빨 이름 — 꼭대기만 비킨다
const RANGE_KEEP = [
  [384, 386, 586, 556], // Zektar 의 검은 봉우리와 그림
  [940, 454, 1050, 594], // Ruinous Minotaur
  [754, 780, 862, 904], // Shatterskull Giant
  [916, 700, 1044, 730], // 해골분쇄 협곡 이름
]
function range() {
  const rand = rng('range')
  const items = []
  let row = 0
  for (let y = 384; y < 820; y += 32, row++) {
    for (let x = 236 + (row % 2) * 28; x < 1030; x += 56) {
      const bx = x + (rand() - 0.5) * 22
      const by = y + (rand() - 0.5) * 12
      const r = rand()
      const r2 = rand()
      if (!inPoly(bx, by, RANGE_RING) || !inPoly(bx, by - 14, RANGE_RING)) continue
      const f = Math.max(0.45, Math.min(1, 1 - Math.abs(by - spineY(bx)) / 190))
      const w = (25 + r * 10) * (0.78 + 0.34 * f)
      const h = w * (1.75 + r2 * 0.5) * (0.62 + 0.52 * f)
      // 비울 자리 — 밑동, 몸통 가운데, 꼭대기 어디든 걸리면 뺀다
      const probes = [[bx, by], [bx - w * 0.6, by], [bx + w * 0.6, by], [bx, by - h * 0.5], [bx, by - h * 0.95]]
      if (probes.some(([px, py]) => RANGE_KEEP.some((b) => inBox(px, py, b, 4)))) continue
      if (inBox(bx, by - h, LABEL_BOX, 6)) continue
      if (distTo(bx, by, TRAIL) < w + 14 || distTo(bx, by - h * 0.5, TRAIL) < w * 0.6 + 12) continue
      items.push({ y: by, parts: peak(bx, by, w, h, rand) })
    }
  }
  items.push({ y: 548, parts: blackSummit() })
  return stack(items)
}

// ---------------------------------------------------------------- 지형 칸 — 앱이 세계 지도와 같은 기호를 흩뿌린다
// Murasa's Wall 의 산 띠 — 해안(들인 선)과 안쪽 단애 사이. 북쪽을 보는 해안은 봉우리가 바다로 솟지 않게 더 들인다.
const coastIn = (x, y, nx, ny) => {
  let d = 24 + Math.max(0, ny) * 40
  if (x > 500 && x < 650 && y < 260) d = 66 // 카줄의 절벽 둘레
  if (x > 300 && x < 470 && y > 900) d = 50 // Murasa's Wall 표시 이름
  return d
}
const IN_N = inset(COAST_N, coastIn).filter(([x]) => x < 1236 && x > -40)
const IN_NW = inset(COAST_NW, coastIn)
const IN_SW = inset(COAST_SW, coastIn)
// 띠는 셋으로 나눈다. 카줄의 절벽 둘레(x 400–741)는 기호를 흩뿌리지 않고 봉우리 몇을 손으로 둔다 — 흩뿌린 기호는 구멍 가장자리의
// 좁은 틈에서도 솟아 Kazuul Warlord 와 그 이름, 절벽 이름을 가렸다.
const CUT = 760
const iCut = SCARP.findIndex(([x, y]) => y < 400 && x >= 741)
/** 반평면 자르기 (Sutherland–Hodgman) — keep(p) 쪽만 남기고, 경계 x = at 에서 자른다 */
function clipX(ring, at, west) {
  const inside = ([x]) => (west ? x <= at : x >= at)
  const out = []
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    if (inside(a)) out.push(a)
    if (inside(a) !== inside(b)) {
      const t = (at - a[0]) / (b[0] - a[0])
      out.push([at, r1(a[1] + (b[1] - a[1]) * t)])
    }
  }
  return out
}
const WALL_W = clipX([...SCARP.slice(1, iCut + 1), ...IN_N.filter(([x]) => x < CUT), [-40, 30], [-40, 150], ...IN_NW, [-40, 430], [-40, 470], ...IN_SW, [500, 1040], [636, 1040]], 400, true)
// 카줄의 절벽 둘레의 Wall 봉우리 — 세계 지도 산 기호 크기 그대로, 그림·이름·절벽 면을 비켜 둔다 [x, 밑 y, 반너비, 높이]
const WALL_PEAKS = [[412, 262, 28, 42], [416, 322, 30, 46], [590, 318, 32, 54], [652, 312, 34, 58], [700, 300, 30, 50], [742, 262, 30, 48], [668, 182, 26, 40], [726, 196, 28, 46]]
function wallPeaks() {
  const rand = rng('wall-peaks')
  return stack(WALL_PEAKS.map(([x, y, w, h]) => ({ y, parts: peak(x, y, w, h, rand) })))
}
const WALL_E = [...SCARP.slice(iCut, -1), [1236, 612], [1236, 540], ...IN_N.filter(([x]) => x >= CUT)]
// 북동쪽 언덕 — 단애 밑과 Na Plateau 북쪽 벼랑 사이 ('steep, windy hills')
const HILLS_NE = [[1092, 604], [1130, 604], [1180, 620], [1206, 622], [1206, 666], [1160, 666], [1120, 652], [1094, 632]]
// 트인 골짜기 — 협곡 길 남서쪽 (세계 지도의 숲 채색이 없는 땅). 길 동쪽만 성글게.
const HILLS_SW = [[862, 836], [892, 842], [900, 870], [870, 900], [846, 940], [826, 990], [806, 1010], [784, 1010], [794, 968], [812, 926], [834, 884], [848, 856]]
// 정글 — 산줄기 남쪽, 단애 안쪽 ('precipitous jungle valleys'). Carnage Altar 둘레는 빈터로.
const JUNGLE = withHoles(
  [[346,694],[420,696],[500,698],[597,716],[683,716],[738,740],[752,776],[738,826],[722,870],[698,924],[672,982],[656,1012],[632,1012],[623,965],[594,918],[556,886],[510,868],[458,858],[405,849],[368,818],[360,764],[348,716]],
  [[[478, 712], [600, 712], [612, 760], [600, 800], [478, 800], [468, 760]]],
)
// 산줄기 동쪽을 덮은 숲 — 'covered in forests' (PG). 세계 지도 skyfang-forest 채색 자리. 손그림 봉우리가 덮고 골짜기 사이로만 보인다.
const RANGE_FOREST = withHoles(
  [[590, 400], [590, 560], [635, 581], [741, 696], [750, 734], [827, 782], [846, 770], [868, 740], [892, 710], [918, 684], [940, 664], [940, 470], [942, 437], [866, 370], [755, 336], [640, 352]],
  [box(606, 446, 936, 520)],
)
// 남동쪽 숲 조각 (세계 지도 forest-4 채색)
const FOREST_SE = [[870, 866], [912, 834], [956, 836], [978, 862], [982, 930], [978, 1012], [850, 1012], [862, 960], [858, 910]]
// Na Plateau 꼭대기의 숲 — 'dense forest … the jaddi trees became denser and darker as they neared the city' (Ep. 4)
const PLATEAU_FOREST = withHoles(
  [[1206, 694], [1178, 692], [1125, 688], [1080, 690], [1050, 712], [1028, 746], [1020, 782], [1024, 822], [1044, 850], [1072, 868], [1104, 872], [1120, 866], [1150, 862], [1206, 864]],
  [[[1062, 690], [1166, 690], [1166, 790], [1030, 790], [1030, 734], [1062, 734]], [[1084, 794], [1204, 794], [1204, 842], [1084, 842]]],
)
// 폭포 밑 서쪽 숲 (세계 지도 forest-3)
const FOREST_FOOT = [[996, 912], [1040, 924], [1060, 944], [1056, 1012], [988, 1012]]

const SPACING = { mountain: 13, hill: 14, forest: 6.5, swamp: 15, canyon: 17 }
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function hashSeed(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
/**
 * 앱의 흩뿌리기(src/map/childTerrain.ts → geometry.ts poissonDisk)는 칸의 상자 왼쪽 위에서 기호 간격 5배마다 시작점을 하나씩
 * (같은 난수 '<지도 id>:<칸 차례>:<종류>'로) 고른다. 시작점이 모두 칸 밖에 떨어지면 칸이 통째로 빈다. 넓이 없는 가시 하나(나갔다 그대로
 * 돌아오는 두 변 — 짝홀 판정에 영향이 없다)로 상자 왼쪽 위 모서리를 옮겨, 칸 안에 떨어지는 시작점이 가장 많은 자리를 고른다.
 */
function anchored(ring, index, kind, density) {
  const g = 4
  const R = ring.map(([x, y]) => [x / g, y / g])
  const xs = R.map((p) => p[0])
  const ys = R.map((p) => p[1])
  const [minX, minY, maxX, maxY] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
  const ss = (SPACING[kind] / Math.sqrt(density)) * 5
  let best = { n: -1, dx: 0, dy: 0 }
  for (let dy = 0; dy < ss; dy += ss / 10) {
    for (let dx = 0; dx < ss; dx += ss / 10) {
      const rand = mulberry32(hashSeed(`skyfang-mountains:${index}:${kind}`))
      let n = 0
      for (let gy = minY - dy; gy < maxY; gy += ss) {
        for (let gx = minX - dx; gx < maxX; gx += ss) {
          const x = gx + rand() * ss
          const y = gy + rand() * ss
          if (x <= maxX && y <= maxY && inPoly(x, y, R)) n++
        }
      }
      if (n > best.n) best = { n, dx, dy }
      if (dx === 0 && dy === 0 && n >= 2) return { points: ring, density }
    }
  }
  if (best.dx === 0 && best.dy === 0) return { points: ring, density }
  return { points: [ring[0], [r1((minX - best.dx) * g), r1((minY - best.dy) * g)], ...ring], density }
}
const FIELDS = [
  { kind: 'mountain', points: WALL_W, density: 0.85 },
  { kind: 'mountain', points: WALL_E, density: 0.85 },
  { kind: 'forest', points: JUNGLE, density: 0.75 },
  { kind: 'forest', points: FOREST_SE, density: 0.7 },
  { kind: 'forest', points: PLATEAU_FOREST, density: 0.85 },
  { kind: 'forest', points: FOREST_FOOT, density: 0.6 },
  { kind: 'forest', points: RANGE_FOREST, density: 0.7 },
  { kind: 'hill', points: HILLS_NE, density: 1.1 },
  { kind: 'hill', points: HILLS_SW, density: 0.9 },
]
const TERRAIN = FIELDS.map((f, i) => ({ kind: f.kind, ...anchored(f.points, i, f.kind, f.density) }))

// ---------------------------------------------------------------- 펼치기
const seaDepth = (x, y) => (x > 506 && x < 597 && y > 170 && y < 200 ? 0 : 15)
const parts = [
  ...COASTS.flatMap((c, i) => seaCliff(c, `sea${i}`, seaDepth)),
  ...wallPeaks(),
  ...scarp,
  ...adits,
  ...naCliff,
  ...cracks(),
  ...naCaves,
  ...passTrail(),
  ...trailRocks,
  ...range(),
  ...kazuulCliffs(),
  ...falls(),
  ...hive(),
  ...singingDust(),
  ...fangs(),
]

CHILDMAPS.push({
  id: 'skyfang-mountains',
  size: [1200, 1000],
  glyphScale: 4,
  terrain: TERRAIN,
  parts,
  labels: LABELS,
  subjects: SUBJECTS,
  markAnchors: { 'singing-city': 'left', 'raimunza-hive': 'left' },
  focus: [824, 600],
})
