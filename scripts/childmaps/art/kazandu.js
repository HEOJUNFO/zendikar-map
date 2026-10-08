// 카잔두 — 무라사 동쪽, 꺼진 협곡 땅 카잔두와 Murasa's Wall 의 Glint Pass (자식 지도, 1174×1000 = 세계 x1222–1512, y1338–1585 의 약 4.05배).
// 시점: Zendikar Rising(2020) 이후 — 카잔두는 살아 있는 푸른 숲(카잔두 계곡의 풀 뜯는 짐승 떼, Kazandu Mammoth // Kazandu Valley 2020),
//       엘드라지·잿빛 황폐·잿더미는 그리지 않는다 (이 범위에 2020년의 황폐를 두는 공식 서술이 없고, 이야기는 땅이 낫는 것으로 끝난다).
// 공식: 대격변으로 꺼진 땅 — 불규칙한 협곡과 굽은 골짜기, 옛 지표 높이의 잔존 고원, 고원만큼 자란 자디 나무가 덮은 낮은 땅, 경계의 깎아지른
//       벼랑(PG 2010, 아트북 2016). 라이문자 강은 Na Plateau 기슭에서 카잔두 가장자리로 와 자디 가지 위로 떨어지고, 가지를 따라 흐르다
//       다른 가지의 물길로 떨어지기도 하며 마침내 늪 같은 검은꽃 연못으로 떨어진다. 자디 뿌리 골짜기의 세 틈 중 Doom Maw(뼈를 모으는 용)와
//       Silent Gap(흡혈귀들이 파고든다). Glint Pass 는 Murasa's Wall 동쪽 밑의 큰 바닷굴, 안쪽 끝은 마름모꼴 통로(물에 잠긴)로 열린다.
//       Murasa's Wall 은 바다에서 가파르게 솟은 산 같은 벼랑 띠, Pillar Plains 는 그 벽이 수천 개 돌기둥으로 갈라진 곳(꼭대기는 풀밭).
// 해석(공식 자리·모양 없음): 해안·호수·숲 색과 표시, 두 강 물길, 성벽 안쪽 단애와 카잔두 서쪽 벼랑, 두 잔존 고원은 세계 지도(그 추정 포함)를
//       따랐다. 자디 나무의 모양과 수·자리, 가지 위 물길의 가지 수와 낙차, 가지 위 길과 줄, 바닷굴 입구와 목, 마름모꼴 입구의 수와 자리,
//       뿌리 틈과 Verdant Catacombs 입구의 모양, 타주루 숲의 큰 나무 둘과 천막, 돌기둥의 수와 배치(Pillarfield Ox 양옆에 꼭대기를 맞춘 기둥 포함),
//       아홉 그림의 자리는 이 지도가 정했다.
// 그리지 않는 것 (브리프 mustNotInvent): Visimal 의 집·성벽·불빛, 미로의 길, 땅 위의 용암·수정, 부두·배, 엘드라지·황폐, 헤드론,
//       이름 없는 세 번째 뿌리 틈(브리프가 허락했지만 그리지 않았다)과 그 이상의 틈, 땅 위 마을·요새·Splinter 의 자리, 코르 야영지·다리, 짐승(그린 것은 계곡의 작은 풀 뜯는 짐승 셋과 Doom Maw 의 뼈뿐),
//       검은 꽃, Singing City, Vazi 와 연못의 연결.
const K = KIT
const { line, poly, smooth, rng, stack, along, offset } = K
const P = (cls, d) => ({ cls, d })
const r1 = (v) => Math.round(v * 10) / 10
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`
const ell = (x, y, rx, ry) => `M${pt([x - rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x + rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x - rx, y])}Z`

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
/** 꺾은선에서 x 에 해당하는 y (x 가 한 방향으로 늘어나는 선) */
function yAt(pts, x) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[i + 1]
    if ((x >= ax && x <= bx) || (x <= ax && x >= bx)) return ay + ((by - ay) * (x - ax)) / (bx - ax || 1)
  }
  return x < pts[0][0] ? pts[0][1] : pts[pts.length - 1][1]
}

// ---------------------------------------------------------------- 세계 지도에서 온 자리 (context.mjs, 이 지도 좌표)
// 해안 — 북동 해안(아래 오른쪽에서 위 왼쪽으로; 진행 방향 왼쪽(offset +)이 땅), 북서쪽 만의 기슭(같은 방향 규칙)
const COAST_NE = [[989,1028],[990,1021],[992,1013],[995,1005],[1001,996],[1004,988],[1006,982],[1007,976],[1011,969],[1018,961],[1023,952],[1026,944],[1025,936],[1026,929],[1030,922],[1034,913],[1036,897],[1036,876],[1038,856],[1045,841],[1055,830],[1062,822],[1064,817],[1061,813],[1050,809],[1031,804],[1012,798],[998,790],[987,782],[978,774],[972,767],[969,757],[968,739],[971,714],[972,690],[968,673],[961,661],[952,651],[943,644],[933,637],[924,626],[916,612],[903,595],[881,580],[851,565],[828,551],[813,537],[806,524],[798,513],[790,506],[781,496],[770,482],[759,462],[746,445],[732,434],[718,427],[704,424],[692,425],[682,425],[672,424],[663,421],[652,421],[639,424],[625,428],[612,429],[600,426],[584,413],[562,386],[536,348],[517,321],[506,308],[498,306],[487,306],[472,306],[458,304],[448,300],[440,294],[434,285],[426,275],[420,264],[415,254],[412,245],[409,237],[403,230],[395,224],[389,219],[387,214],[386,208],[382,197],[375,181],[364,167],[351,158],[335,153],[322,146],[311,137],[303,128],[298,122],[298,118],[297,114],[294,108],[289,103],[284,96],[280,88],[276,80],[272,74],[268,70],[261,66],[252,63],[239,61],[224,51],[206,34],[189,14],[179,0],[175,-9],[170,-15],[159,-20],[144,-26],[140,-28]]
const COAST_BAY = [[86,-28],[95,-18],[104,-8],[109,0],[113,8],[120,16],[130,24],[142,33],[148,41],[150,50],[149,58],[147,66],[144,73],[144,79],[146,83],[149,86],[150,92],[150,100],[150,108],[152,116],[155,121],[155,127],[152,133],[147,139],[144,143],[144,146],[142,151],[136,157],[127,164],[116,168],[104,169],[92,169],[86,172],[85,178],[83,183],[80,188],[74,192],[68,193],[62,192],[57,189],[50,189],[45,189],[39,189],[34,191],[30,194],[25,195],[19,194],[14,191],[8,186],[2,179],[-2,169],[-4,158],[-4,145],[-7,134],[-13,127],[-20,122],[-23,117],[-24,114],[-26,112],[-29,112]]
const coastDist = (x, y) => Math.min(distTo(x, y, COAST_NE), distTo(x, y, COAST_BAY))
// Murasa's Wall 의 안쪽 단애 — 서쪽(내륙 언덕 쪽으로 떨어진다)과 동쪽(x≈290 부터 카잔두 쪽으로 떨어지는 경계 벼랑)
const SCARP_W = [[-30,281],[27,285],[81,285],[134,285],[187,295],[241,300],[289,297]]
const SCARP_E = [[289,297],[304,295],[372,281],[396,319],[430,344],[474,353],[503,387],[532,426],[557,460],[600,480],[649,475],[693,475],[727,509],[751,548],[756,591],[765,640],[790,679],[824,713],[838,757],[848,800],[872,844],[897,878],[887,922],[863,965],[838,1009],[830,1040]]
// 카잔두 서쪽 경계 벼랑 (세계 지도 kazandu-west-cliffs, 위에서 아래로; 낮은 쪽은 동쪽)
const WCLIFF = [[289,297],[285,334],[280,402],[270,455],[260,509],[246,562],[231,616],[212,669],[192,723],[178,776],[168,829],[168,883],[178,936],[197,990],[210,1030]]
// Na Plateau 의 동쪽 끝 벼랑 (바깥으로 떨어진다)
const NA = [[-30,582],[13,577],[51,572],[85,562],[129,533],[163,494],[168,455],[149,417],[115,383],[71,363],[22,353],[-30,349]]
// 강 (세계 지도 물길)
const RAIM_UP = [[125,563],[159,563],[193,553],[222,558],[244,570]]
const VAZI = [[606,694],[586,728],[557,757],[518,776],[479,796],[450,825],[431,864],[421,908],[426,951],[440,990],[465,1024]]
const VAZI_W = [[440,990],[424,1006],[416,1019],[418,1040]]
// Pillar Plains 의 북쪽 가장자리 (세계 지도 pillar-plains-pillars)
const RIM_PP = [[230,1040],[275,1000],[334,971],[402,980],[470,946],[538,912],[615,893],[703,912],[780,951],[839,1010],[850,1040]]

// ---------------------------------------------------------------- 그림·이름 자리 (모든 손그림이 비켜 간다)
const SUBJECTS = {
  // 서쪽 벼랑 바깥 자디 숲, 큰 자디 밑 숲 바닥 (화자 Arhana 'Kazandu trapfinder' 를 따른 이 지도의 자리) — 둘레 나무 기호를 비운다
  'narrow-escape': { at: [104, 800], size: 108 },
  // Pillar Plains 의 기둥 꼭대기 — 세계 지도 가장자리 띠의 동쪽, 이웃 기둥 꼭대기와 같은 높이 (이 지도의 자리)
  'pillarfield-ox': { at: [700, 930], size: 80 },
  // 카잔두 계곡 동쪽, Murasa's Wall 안쪽 벼랑 발치 (화자 Arhana 를 따른 이 지도의 자리)
  'trapfinders-trick': { at: [692, 646], size: 86 },
  'quest-for-pure-flame': { at: [340, 242], size: 64 },
  'murasa-pyromancer': { at: [184, 374], size: 80, flip: true },
  'tajuru-archer': { at: [512, 603], size: 84 },
  'trusty-machete': { at: [424, 548], size: 56 },
  'frontier-guide': { at: [596, 648], size: 84 },
  'kazandu-blademaster': { at: [288, 722], size: 86 },
}
const LABELS = [
  { text: 'Kazandu', textKo: '카잔두', at: [590, 868], size: 34, kind: 'area' },
  { text: 'Kazandu Valley', textKo: '카잔두 계곡', at: [652, 540], size: 20, kind: 'area' },
  { text: 'Tajuru Grove', at: [408, 404], size: 16, kind: 'area' },
  { text: 'Blackbloom Lake', textKo: '검은꽃 연못', at: [462, 762], size: 15, kind: 'water' },
  { text: 'Raimunza River', textKo: '라이문자 강', at: [178, 594], size: 14, kind: 'water' },
  { text: 'Vazi River', at: [497, 812], size: 14, kind: 'water', rotate: -36 },
  { text: 'Pillar Plains', at: [570, 904], size: 16, kind: 'area' }, // 가장자리 띠(밑 경계에서 세계 24단위 ≈ 97) 위 — 띠 안에 두면 이름이 옅어진다
  { text: "Murasa's Wall", at: [842, 598], size: 18, kind: 'area', rotate: 42 },
  { text: 'Na Plateau', at: [62, 462], size: 15, kind: 'area' },
]
// 비울 상자 [x0, y0, x1, y1] — 이름, 표시와 그 이름, 그림과 그 이름 (앱이 그린 화면에서 잰 자리)
const KEEP = {
  kazandu: [512, 834, 668, 882],
  valley: [572, 520, 730, 550],
  grove: [348, 387, 466, 412],
  lakeLabel: [402, 747, 522, 770],
  raimLabel: [124, 579, 232, 600],
  vaziLabel: [464, 787, 536, 844],
  pillarLabel: [516, 886, 624, 912],
  wallLabel: [786, 540, 904, 648],
  naLabel: [16, 447, 108, 470],
  glint: [300, 162, 388, 187],
  cipher: [146, 186, 284, 212],
  visimal: [228, 220, 300, 246],
  doom: [218, 752, 300, 790],
  silent: [726, 852, 820, 879],
  refuge: [640, 690, 766, 734],
  verdant: [240, 900, 392, 926],
  quest: [300, 186, 380, 282],
  pyro: [128, 318, 262, 416],
  archer: [468, 532, 560, 650],
  machete: [376, 518, 470, 604],
  guide: [544, 579, 648, 693],
  trap: [668, 606, 760, 652],
  escape: [46, 740, 164, 826],
  ox: [652, 880, 748, 972],
  blade: [216, 636, 358, 746],
}
const kept = (x, y, pad = 0, skip = []) => Object.entries(KEEP).some(([k, b]) => !skip.includes(k) && inBox(x, y, b, pad))

// ---------------------------------------------------------------- 1. 바다 벼랑 — 'rises sharply from the sea' (PG). 세계 지도의 절벽 해안처럼
// 해안 조금 안쪽에 벼랑 위 선을 긋고 해안 쪽으로 짧은 빗금. 안쪽 단애와 너무 가까운 곳(북동 모서리)은 단애 털선에 맡기고 빗금만 짧게.
function seaCliff(coast, seed) {
  const rand = rng(seed)
  const C = dense(coast, false, 3)
  const D = 18
  let ticks = ''
  let edge = ''
  let run = []
  const flush = () => {
    if (run.length > 2) edge += smooth(run)
    run = []
  }
  for (const [[x, y], [ux, uy]] of along(C, 5.2)) {
    const nx = uy
    const ny = -ux
    const tx = x + nx * D
    const ty = y + ny * D
    const near = distTo(tx, ty, SCARP_E) < 16 || distTo(tx, ty, SCARP_W) < 10
    const off = x < -10 || x > 1184 || y < -10 || y > 1010 || Math.hypot(x - 325, y - 146) < 26 || coastDist(tx, ty) < D * 0.75 || inBox(tx, ty, KEEP.wallLabel, 2) || inBox((x + tx) / 2, (y + ty) / 2, KEEP.glint, 1)
    if (off) {
      flush()
      continue
    }
    const L = near ? D * 0.5 : D * (0.78 + rand() * 0.3)
    ticks += line([[x + nx * L, y + ny * L], [x + nx * 2.2, y + ny * 2.2]])
    if (near) flush()
    else run.push([tx, ty])
  }
  flush()
  return [P('hatch', ticks)]
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
    // 그늘 띠의 두 끝은 벼랑 선으로 좁혀 닫는다 (곧은 끝 자름이 크게 확대하면 칼로 자른 듯 보인다)
    const n = top.length
    if (n > 3) {
      for (const [i, k] of [[0, 0], [1, 0.5], [n - 2, 0.5], [n - 1, 0]]) bot[i] = [top[i][0] + (bot[i][0] - top[i][0]) * k, top[i][1] + (bot[i][1] - top[i][1]) * k]
    }
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
  return [P('shade', shade), P('hatch', ticks), P('ink', strong), P(o.bold === false ? 'ink' : 'ink-bold', line(C))]
}
// 카잔두를 두른 벼랑 — 가장 깊고 짙게 (focal: 'collapsed into the earth', 'sheer cliffs at Kazandu's borders')
const C_SCARP_E = rough(SCARP_E, 1.4, 'scarp-e')
const C_WCLIFF = rough(WCLIFF, 2.6, 'wcliff') // 'treacherous broken cliffs' — 서쪽 벼랑은 더 들쭉날쭉
const C_SCARP_W = rough(SCARP_W, 1.2, 'scarp-w')
const C_NA = rough(NA, 1.4, 'na')
const MESA_N = { cx: 343, cy: 500, rx: 66, ry: 33 }
const nearMesaN = (x, y) => Math.hypot((x - MESA_N.cx) / (MESA_N.rx + 6), (y - MESA_N.cy + 40) / 80) < 1
const bowl = [
  // Trapfinder's Trick 이름 옆(y≈652–684)에서는 털선을 짧게 — 그림 자리(KEEP.trap)는 거르고, 이름 옆은 벼랑 가까이에만
  ...rim(C_SCARP_E, 1, (x, y) => (y > 1015 ? 0 : 42 - 22 * Math.max(0, Math.min(1, 1 - (Math.abs(y - 668) - 16) / 14))), 'rim-e', { drip: 0.14, step: 5.4, skip: (x, y) => kept(x, y, 2, ['wallLabel']) }),
  ...rim(C_WCLIFF, -1, (x, y) => (y > 1015 ? 0 : nearMesaN(x + 30, y) ? 18 : 44), 'rim-w', { drip: 0.14, step: 5.4, skip: (x, y) => kept(x + 20, y, 2) }),
]
const outerCliffs = [
  // 내륙 언덕 쪽으로 떨어지는 단애 — 카잔두 벼랑보다 얕고 성기게 (초점이 아니다)
  ...rim(C_SCARP_W, 1, () => 14, 'rim-sw', { drip: 0.04, shadeK: 0.4, step: 6.2 }),
  // Murasa Pyromancer 의 이름 자리(벼랑 북동쪽 굽이 바깥)에서는 털선을 거른다
  ...rim(C_NA, 1, (x) => (x < -10 ? 0 : 24), 'rim-na', { drip: 0.06, shadeK: 0.45, skip: (x, y) => x > 118 && x < 178 && y > 378 && y < 432 }),
]
// 벼랑 밑 떨어진 돌 — 서쪽 벼랑 발치 몇 군데
const talus = [
  ...K.rocks(232, 652, 5, 3, 'tal1'),
  ...K.rocks(214, 708, 4.5, 2, 'tal2'),
  ...K.rocks(198, 846, 5, 3, 'tal3'),
  ...K.rocks(218, 940, 4.5, 2, 'tal4'),
]

// ---------------------------------------------------------------- 3. 잔존 고원 — 'plateaus that tower above the landscape—surviving pillars of the
// previous ground level' (PG). 세계 지도의 메사 기호처럼 옆에서 본 모습 — 양피지 바탕에 평평한 꼭대기 선, 턱이 있는 깎아지른 벽,
// 벽을 가로지르는 끊긴 두 켜, 그늘 쪽(오른쪽) 면에만 그늘과 세로 결, 밑의 너덜 비탈 (돌빛으로 온통 칠하고 세로 결만 두면 잘린 나무 밑동처럼 읽혔다). 자리와 너비는 세계 지도의 두 메사. 꼭대기는 서술이 없어 비워 둔다.
/** 옆모습 메사 — (cx, yb) 밑 가운데, w 밑너비, h 높이. 바위 벽(돌빛)과 그 밑의 너덜 비탈(양피지) */
function mesa(cx, yb, w, h, seed) {
  const rand = rng(seed)
  const hw = w / 2
  const yt = yb - h
  const foot = yb - h * 0.2 // 벽 밑 (너덜 비탈이 시작되는 높이)
  const j = (k = 1) => (rand() - 0.5) * k
  // 벽 — 왼쪽은 작은 턱 둘, 오른쪽은 버팀벽 하나. 꼭대기는 거의 평평하게 (옛 지표)
  const wallL = [[cx - hw * 0.66, foot], [cx - hw * 0.65 + j(2), yt + h * 0.62], [cx - hw * 0.6, yt + h * 0.6], [cx - hw * 0.6 + j(2), yt + h * 0.34], [cx - hw * 0.56, yt + h * 0.32], [cx - hw * 0.55 + j(1.5), yt + 2], [cx - hw * 0.5, yt]]
  const topL = []
  for (let i = 1; i < 9; i++) {
    const t = i / 9
    topL.push([cx - hw * 0.5 + hw * 0.96 * t, yt + j(1.6)])
  }
  const wallR = [[cx + hw * 0.46, yt], [cx + hw * 0.48 + j(1.5), yt + h * 0.28], [cx + hw * 0.55, yt + h * 0.3], [cx + hw * 0.57 + j(2), yt + h * 0.55], [cx + hw * 0.6, yt + h * 0.72], [cx + hw * 0.62, foot]]
  const cliff = [...wallL, ...topL, ...wallR]
  const cliffD = poly([...cliff, [cx + hw * 0.2, foot + 2], [cx - hw * 0.2, foot + 1.5]])
  // 너덜 비탈 — 벽 밑에서 바깥으로 오목하게 흘러내린다
  const skirt = [[cx - hw * 0.66, foot], [cx - hw * 0.74, foot + (yb - foot) * 0.5], [cx - hw * 0.9, yb - 1], [cx - hw * 0.3, yb + 2], [cx + hw * 0.3, yb + 2], [cx + hw * 0.9, yb - 1], [cx + hw * 0.72, foot + (yb - foot) * 0.48], [cx + hw * 0.62, foot]]
  const skirtD = smooth(skirt, true)
  const skirtShade = poly([[cx + hw * 0.18, foot + 1.5], [cx + hw * 0.62, foot], [cx + hw * 0.72, foot + (yb - foot) * 0.48], [cx + hw * 0.9, yb - 1], [cx + hw * 0.3, yb + 2]])
  // 바위 켜 — 옛 지표 아래 쌓인 층이 벽을 가로지르는 두 턱 (세로 결만 있으면 잘린 나무 밑동처럼 읽힌다)
  const ledgeAt = (k) => {
    const yy = yt + (foot - yt) * k
    const xl = cx - hw * (0.6 - (1 - k) * 0.06)
    const xr = cx + hw * (0.48 + k * 0.12)
    const pts = []
    for (let i = 0; i <= 6; i++) pts.push([xl + ((xr - xl) * i) / 6, yy + j(1.6)])
    return pts
  }
  const ledges = [ledgeAt(0.34), ledgeAt(0.66)]
  // 켜는 끊긴 짧은 선으로만 — 그늘 쪽(오른쪽)은 길게, 밝은 쪽은 한두 토막 (온 너비를 가로지르면 층층 케이크처럼 보인다)
  const ledgeD = ledges.map((l, li) => line(l.slice(li === 0 ? 3 : 2, 7)) + line(l.slice(li === 0 ? 0 : 1, li === 0 ? 2 : 2))).join('')
  // 그늘 — 오른쪽(햇빛 반대) 면에만 연한 그늘과 세로 결, 왼쪽 면은 밝게 비운다
  const sx = cx + hw * 0.12
  const faceShade = poly([[sx, yt + 1], ...wallR, [sx + hw * 0.04, foot + 1.5]])
  let flute = ''
  for (let x = sx + 2; x < cx + hw * 0.56; x += 2.6 + rand() * 1.4) {
    for (let b = 0; b < 3; b++) {
      const y0 = b === 0 ? yt + 2.2 : ledges[b - 1][3][1] + 2
      const y1 = b === 2 ? foot - 1 : ledges[b][3][1] - 1.5
      const L = (y1 - y0) * (0.45 + rand() * 0.5)
      flute += line([[x + j(0.8), y0 + rand() * 1.5], [x + j(1.2), y0 + L]])
    }
  }
  // 왼쪽 면은 켜 밑에 짧은 결 몇 줄만
  for (let x = cx - hw * 0.5; x < sx - 4; x += 9 + rand() * 6) flute += line([[x, ledges[0][1][1] + 2], [x + j(1), ledges[0][1][1] + 2 + (foot - yt) * 0.12]])
  let scree = ''
  for (let i = 0; i < 12; i++) {
    const t = (i + 0.5) / 12
    const x = cx - hw * 0.62 + hw * 1.24 * t
    const side = x < cx ? -1 : 1
    if (side < 0 && rand() < 0.4) continue
    scree += line([[x + j(2), foot + 2 + rand() * 2], [x + side * (3 + rand() * 4), foot + 5 + (yb - foot) * (0.3 + rand() * 0.5)]])
  }
  return [P('fill', skirtD), P('shade', skirtShade), P('hatch', scree), P('fill', cliffD), P('shade', faceShade), P('hatch', flute), P('hatch', ledgeD), P('hatch', skirtD), P('ink-bold', line(cliff))]
}

// ---------------------------------------------------------------- 4. 자디 나무 — 'mountainous jaddi trees', 'a massive web of branches', 'The wood of a jaddi
// tree is as hard as stone' (PG). 돌빛 껍질의 굵은 줄기와 뿌리 부채, 줄기에서 퍼져 이웃 쪽으로 뻗는 큰 가지, 넓게 퍼진 구름 같은 수관.
// 잎·수관 모양은 서술이 없어 세계 지도 나무 기호(둥근 덩어리)의 큰 꼴로.
function lobe(cx, cy, r, rand) {
  const rr = r * (0.9 + rand() * 0.2)
  const d = ell(cx, cy, rr, rr * 0.88)
  const hatch = line([[cx + rr * 0.32, cy - rr * 0.05], [cx + rr * 0.18, cy + rr * 0.48]]) + line([[cx + rr * 0.6, cy - rr * 0.02], [cx + rr * 0.46, cy + rr * 0.42]])
  return [P('fill', d), P('forest', d), P('hatch', hatch), P('ink', d)]
}
/** 큰 가지·뿌리 — 줄기 쪽(a)이 굵고 끝(b)으로 가늘어지는 띠. bend 는 가운데가 솟는 정도 */
function limb(a, b, t0, t1, bend = 0, cls = 'stone') {
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - bend]
  const c = dense([a, m, b], false, 6)
  const up = offset(c, (t) => (t0 + (t1 - t0) * t) / 2)
  const dn = offset(c, (t) => -(t0 + (t1 - t0) * t) / 2)
  const mi = Math.floor(c.length / 2)
  const lower = up[mi][1] > dn[mi][1] ? up : dn
  const upper = lower === up ? dn : up
  const body = poly([...up, ...[...dn].reverse()])
  const shadeD = poly([...c, ...[...lower].reverse()])
  let bark = ''
  for (let i = 3; i < c.length - 2; i += 4) bark += line([[c[i][0] + (upper[i][0] - c[i][0]) * 0.5, c[i][1] + (upper[i][1] - c[i][1]) * 0.5], [c[i + 1][0], c[i + 1][1]]])
  return { body, parts: [P(cls, body), P('shade', shadeD), P('hatch', bark), P('ink', body)], top: upper }
}
/**
 * 자디 한 그루 — (x, y) 밑동, h 높이.
 * o.cw 수관 반너비(h 비), o.cyK 수관 가운데 높이(h 비), o.fork 갈래 높이(h 비), o.lean 수관을 옆으로 미는 정도(h 비),
 * o.limbs [[각도(도, 위가 음수), 길이(h 비), 굵기(h 비)]]
 */
function jaddi(x, y, h, seed, o = {}) {
  const rand = rng(seed)
  const cw = (o.cw ?? 0.56) * h
  const lean = (o.lean ?? 0) * h
  const cy = y - h * (o.cyK ?? 0.76)
  const cry = h * 0.17
  const forkY = y - h * (o.fork ?? 0.44)
  const bw = h * 0.085
  const tw = h * 0.062
  const fl = h * 0.2
  const fx = x + lean * 0.35
  const trunk = `M${pt([x - bw - fl, y])}C${pt([x - bw - fl * 0.35, y - h * 0.008])} ${pt([x - bw, y - h * 0.05])} ${pt([x - bw * 0.96, y - h * 0.15])}L${pt([fx - tw, forkY])}L${pt([fx + tw, forkY])}L${pt([x + bw * 0.96, y - h * 0.15])}C${pt([x + bw, y - h * 0.05])} ${pt([x + bw + fl * 0.35, y - h * 0.008])} ${pt([x + bw + fl, y])}Z`
  const shadeD = poly([[x + bw * 0.1, y], [fx + tw * 0.1, forkY], [fx + tw, forkY], [x + bw * 0.96, y - h * 0.15], [x + bw + fl * 0.75, y]])
  let bark = ''
  for (const t of [-0.55, -0.15, 0.3, 0.7]) bark += `M${pt([x + bw * t, y - h * 0.03])}Q${pt([x + bw * t * 1.05 + h * 0.01, y - h * 0.22])} ${pt([fx + tw * t, forkY + h * 0.03])}`
  const roots = line([[x - bw * 0.5, y - h * 0.07], [x - bw - fl * 0.55, y + h * 0.012]]) + line([[x + bw * 0.55, y - h * 0.06], [x + bw + fl * 0.7, y + h * 0.015]]) + line([[x, y - h * 0.05], [x + bw * 0.25, y + h * 0.02]])
  const out = [P('stone', trunk), P('shade', shadeD), P('hatch', bark), P('ink', trunk + roots)]
  // 큰 가지 — 갈래에서 퍼진다 (아래 두 가지는 수관 밖으로 이웃 쪽까지)
  const limbs = o.limbs ?? [[-168, 0.66, 0.05], [-128, 0.36, 0.045], [-56, 0.38, 0.045], [-14, 0.66, 0.05]]
  for (const [ang, len, th] of limbs) {
    const r = (ang * Math.PI) / 180
    const a = [fx + Math.cos(r) * tw * 0.4, forkY + h * 0.02]
    const b = [fx + Math.cos(r) * len * h, forkY + Math.sin(r) * len * h]
    out.push(...limb(a, b, th * h, th * h * 0.32, h * 0.025).parts)
  }
  // 수관 — 뒤(위) 덩어리 줄부터 앞(아래) 줄로
  const ccx = x + lean
  const backRow = o.backRow ?? 4
  const frontRow = o.frontRow ?? 5
  const ls = o.ls ?? 1 // 잎 덩어리 크기 배수
  const lobesB = []
  for (let i = 0; i < backRow; i++) {
    const t = (i + 0.5) / backRow
    const arch = 1 - Math.pow(t * 2 - 1, 2)
    lobesB.push([ccx + (t - 0.5) * 2 * cw * 0.78, cy - cry * (0.45 + 0.75 * arch), h * ls * (0.13 + 0.03 * arch)])
  }
  const lobesF = []
  for (let i = 0; i < frontRow; i++) {
    const t = frontRow === 1 ? 0.5 : i / (frontRow - 1)
    const arch = 1 - Math.pow(t * 2 - 1, 2)
    lobesF.push([ccx + (t - 0.5) * 2 * cw, cy + cry * (0.35 + 0.35 * arch) + (rand() - 0.5) * h * 0.03, h * ls * (0.125 + 0.035 * arch)])
  }
  for (const [lx, ly, lr] of lobesB) out.push(...lobe(lx, ly, lr, rand))
  // 가운데 덩어리 — 앞줄 사이의 빈틈을 메운다
  out.push(...lobe(ccx, cy, h * ls * 0.17, rand))
  for (const [lx, ly, lr] of lobesF.sort((p, q) => p[1] - q[1])) out.push(...lobe(lx, ly, lr, rand))
  return out
}

// ---------------------------------------------------------------- 5. 라이문자 강 — Na Plateau 기슭에서 카잔두 가장자리로, 벼랑에서 자디 가지 위로
// 떨어져 가지의 물길을 따라 흐르다 다른 가지로 떨어지고, 마지막에 검은꽃 연못으로 떨어진다 (PG 2010, 아트북 2016; ZNR Blackbloom Bog).
/** 물길 — 하류로 갈수록 넓어지는 물 (채움·물빛·가장자리) */
function stream(pts, w0, w1, o = {}) {
  const c = dense(pts, false, 4)
  const left = offset(c, (t) => (w0 + (w1 - w0) * t) / 2)
  const right = offset(c, (t) => -(w0 + (w1 - w0) * t) / 2)
  const body = poly([...left, ...[...right].reverse()])
  const out = [P('fill', body), P('sea', body)]
  if (o.edges !== false) out.push(P('sea-ink', line(left) + line(right)))
  return out
}
/** 떨어지는 물 — 위(a)에서 아래(b)로 내리는 물 장막과 밑의 물보라 */
function fall(a, b, w, seed) {
  const rand = rng(seed)
  const L = [a[0] - w / 2, a[1]]
  const R = [a[0] + w / 2, a[1]]
  const BL = [b[0] - w * 0.6, b[1]]
  const BR = [b[0] + w * 0.6, b[1]]
  const body = poly([L, R, BR, BL])
  let lines = ''
  for (let i = 0; i <= 3; i++) {
    const t = i / 3
    const top = [L[0] + (R[0] - L[0]) * t, a[1] + 1]
    const bot = [BL[0] + (BR[0] - BL[0]) * t, b[1] - 1 - rand() * 2]
    lines += line([top, bot])
  }
  let spray = ''
  for (let i = 0; i < 3; i++) {
    const sx = b[0] + (i - 1) * w * 0.7
    spray += `M${pt([sx - w * 0.45, b[1] + 1.5])}Q${pt([sx, b[1] - 1.5])} ${pt([sx + w * 0.45, b[1] + 1.5])}`
  }
  return [P('fill', body), P('sea', body), P('sea-ink', lines + spray)]
}
// 물을 받는 자디 J1 — 벼랑 밑에서 솟아, 서쪽 큰 가지가 폭포를 받고 동쪽 아래 가지가 연못 쪽으로 물을 넘긴다
const J1 = { x: 350, y: 706, h: 150 }
const L1 = limb([347, 626], [249, 594], 13, 9, 6) // 서쪽 가지 — 폭포를 받는다 (줄기 쪽이 낮아 물이 줄기 쪽으로 흐른다)
const L2 = limb([352, 646], [420, 674], 12, 7, 3) // 동쪽 아래 가지 — 다른 가지의 물길 (PG 'caught by another channel in a different branch')
function raimunza() {
  const out = []
  // 위 물길 — Na Plateau 기슭에서 카잔두 서쪽 벼랑 끝까지 (세계 지도 물길)
  out.push(...stream(RAIM_UP, 3.4, 5.6))
  return out
}
function branchChannel() {
  const out = []
  // 벼랑에서 가지 위로 떨어지는 물 (세계 지도 raimunza-jaddi-fall 자리)
  out.push(...fall([245, 572], [251, 592], 6, 'f1'))
  // 가지 위 물길 — 가지 윗면을 따라 (조용한 구간)
  const ch1 = L1.top.map((p) => [p[0], p[1] + 2.6]).reverse() // 서 → 동
  out.push(...stream(ch1.slice(1, -1), 3.2, 4))
  // 줄기에서 아래 가지로 — 'others dive like waterslides or fall from a great height only to be caught by another channel'
  out.push(...fall([344, 624], [350, 643], 4.5, 'f2'))
  const ch2 = L2.top.map((p) => [p[0], p[1] + 2.4])
  out.push(...stream(ch2.slice(1, -2), 3.4, 3.8))
  // 마지막 낙차 — 연못으로 ('plunges into the marshy Blackbloom Lake')
  out.push(...fall([419, 672], [432, 692], 5, 'f3'))
  out.push(...K.ripples(437, 698, 9, 2, 'plunge'))
  return out
}

// ---------------------------------------------------------------- 6. 검은꽃 연못 둘레의 늪 — 연못(앱이 그린다) 위 잔물결, 늪 속 웅덩이 몇
function marshPools() {
  const out = []
  out.push(...K.ripples(470, 706, 14, 3, 'lake-r'))
  const pools = [
    [[376, 714], [388, 708], [400, 713], [398, 722], [384, 725], [374, 721]],
    [[530, 700], [546, 694], [560, 698], [556, 707], [540, 710], [529, 706]],
    [[372, 742], [384, 737], [396, 741], [392, 748], [377, 750]],
    [[520, 738], [534, 735], [544, 740], [538, 746], [523, 745]],
  ]
  // 양피지 바탕을 먼저 깔아 연못과 같은 물빛으로 (숲 색 위에 바로 칠하면 잿빛 돌처럼 읽힌다)
  for (const p of pools) out.push(P('fill', smooth(p, true)), ...K.pool(p))
  return out
}

// ---------------------------------------------------------------- 7. Vazi 강 — 'rushes down a sloping and twisting canyon' (PG). 세계 지도 물길을 따라
// 좁고 그늘진 협곡 바닥, 들쭉날쭉한 양 벽의 털선(햇빛 반대쪽 벽이 길다), 여울. 연못과 잇지 않고 세계 지도 머리보다 위로 늘이지 않는다.
function vazi() {
  const c = dense(VAZI, false, 5)
  const rand = rng('vz')
  const wob = c.map((_, i) => Math.sin(i * 0.7) * 1.6 + (rand() - 0.5) * 1.6)
  const half = (t) => 5 + t * 8
  const L = offset(c, (t) => half(t) + wob[Math.round(t * (c.length - 1))])
  const R = offset(c, (t) => -half(t) + wob[Math.min(c.length - 1, Math.round(t * (c.length - 1)) + 3)] * 0.8)
  const floor = poly([...L, ...[...R].reverse()])
  // 협곡 바닥은 그늘 — 양피지 띠만 두면 숲 사이 길처럼 읽힌다
  const out = [P('fill', floor), P('shade', floor)]
  // 벽 — 가장자리에서 물 쪽으로 떨어지는 털선과 그늘 (카잔두를 두른 벼랑과 같은 손, 작게)
  out.push(...rim(L, -1, (x, y) => Math.min(9, distTo(x, y, VAZI) - 2), 'vz-l', { drip: 0, step: 2.8, shadeK: 0.7, bold: false }))
  out.push(...rim(R, 1, (x, y) => Math.min(6, distTo(x, y, VAZI) - 2), 'vz-r', { drip: 0, step: 3.2, shadeK: 0.5, bold: false }))
  out.push(...stream(VAZI, 2.6, 6))
  out.push(...stream(VAZI_W, 2.2, 2.8))
  // 여울 — 물길을 가로지르는 하류 쪽으로 굽은 짧은 물결 ('thundering rapids')
  let rap = ''
  for (const [[x, y], [ux, uy]] of along(dense(VAZI.slice(3), false, 4), 26)) {
    const w = 5
    const a = [x - uy * w * 0.5, y + ux * w * 0.5]
    const b = [x + uy * w * 0.5, y - ux * w * 0.5]
    const m = [x + ux * w * 0.5, y + uy * w * 0.5]
    rap += `M${pt(a)}Q${pt(m)} ${pt(b)}`
  }
  out.push(P('sea-ink', rap))
  return out
}

// ---------------------------------------------------------------- 8. 뿌리 틈 — 'in the valleys created by the roots of the jaddis, crevasses open into
// the earth' (PG). 위에서 본 들쭉날쭉한 검은 틈, 가장자리의 짧은 털선, 틈 위로 걸친 굵은 자디 뿌리. 셋 가운데 이름 있는 둘만 그린다.
function crevasse(x, y, len, wid, rot, seed, o = {}) {
  const rand = rng(seed)
  const c = Math.cos((rot * Math.PI) / 180)
  const s = Math.sin((rot * Math.PI) / 180)
  const T = ([u, v]) => [x + u * c - v * s, y + u * s + v * c]
  const n = 9
  const upper = []
  const lower = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const u = (t - 0.5) * len
    const w = Math.sin(Math.PI * t) * wid * (0.75 + rand() * 0.5)
    upper.push([u + (rand() - 0.5) * 2, -w * 0.5])
    lower.push([u + (rand() - 0.5) * 2, w * 0.5])
  }
  const hole = poly([...upper, ...[...lower].reverse()].map(T))
  let ticks = ''
  for (let i = 1; i < n; i++) {
    const [u, v] = upper[i]
    ticks += line([T([u, v - 4 - rand() * 3]), T([u, v + 1])])
    const [u2, v2] = lower[i]
    ticks += line([T([u2, v2 + 3 + rand() * 2]), T([u2, v2])])
  }
  const out = [P('dark', hole), P('hatch', ticks), P('ink', hole)]
  for (const [u0, v0, u1, v1, th] of o.roots ?? []) out.push(...limb(T([u0, v0]), T([u1, v1]), th, th * 0.4, th * 0.5).parts)
  return out
}
/** Doom Maw 의 뼈 — 'bone-hoarding dragons' (PG). 틈 가장자리의 작은 뼈 몇 */
function bones(list) {
  let d = ''
  for (const [x, y, len, rot] of list) {
    const c = Math.cos((rot * Math.PI) / 180)
    const s = Math.sin((rot * Math.PI) / 180)
    const a = [x - (c * len) / 2, y - (s * len) / 2]
    const b = [x + (c * len) / 2, y + (s * len) / 2]
    d += line([a, b]) + ell(a[0], a[1], 1.1, 1.1) + ell(b[0], b[1], 1.1, 1.1)
  }
  return [P('fill', d), P('ink', d)]
}
/** 드러난 자디 뿌리 — 굽은 띠 (굵은 쪽 w0 에서 끝 w1 로), 길이 방향의 결 두 줄 */
function root(pts, w0, w1) {
  const c = dense(pts, false, 6)
  const half = (t) => (w0 + (w1 - w0) * t) / 2
  const A = offset(c, half)
  const B = offset(c, (t) => -half(t))
  const body = poly([...A, ...[...B].reverse()])
  const n = c.length
  const grain = line(offset(c, (t) => half(t) * 0.35).slice(1, Math.round(n * 0.7))) + line(offset(c, (t) => -half(t) * 0.4).slice(Math.round(n * 0.15), Math.round(n * 0.85)))
  const lowerSide = A[Math.floor(n / 2)][1] > B[Math.floor(n / 2)][1] ? A : B
  const shadeD = poly([...c, ...[...lowerSide].reverse()])
  return [P('stone', body), P('shade', shadeD), P('hatch', grain), P('ink', body)]
}
// Doom Maw — 벼랑 발치의 뿌리 골짜기, 표시가 틈의 위쪽 끝 가장자리에 오게. 위·아래 가장자리를 따라 굵은 뿌리, 틈을 가로지른 뿌리 하나
const doomMaw = [
  ...crevasse(251, 809, 58, 19, 34, 'doom'),
  ...root([[210, 794], [232, 797], [256, 801], [280, 812], [292, 822]], 7, 1.6),
  ...root([[214, 826], [236, 834], [258, 838], [276, 846]], 6, 1.6),
  ...bones([[268, 826, 5.5, 20], [276, 822, 4.5, -30], [232, 812, 4.5, 70]]),
]
const silentGap = (() => {
  const out = [
    ...crevasse(830, 880, 54, 17, 34, 'silent'),
    ...root([[876, 884], [854, 874], [834, 865], [818, 856]], 7, 1.6),
    ...root([[868, 912], [846, 903], [826, 893], [810, 882]], 6.5, 1.6),
  ]
  // 벽을 타고 내려간 밧줄 — 'plumbed by a group of vampires' (PG)
  out.push(P('ink', `M${pt([822, 868])}l-1 -3M${pt([822, 868])}Q${pt([826, 876])} ${pt([824, 884])}`))
  return out
})()

// ---------------------------------------------------------------- 9. Verdant Catacombs — 낮은 바위 턱 밑에 덩굴이 드리운 낮고 넓은 어두운 틈 (카드 표시의 자리, 뿌리 틈이 아니다).
// 표시가 턱의 왼쪽 끝에 앉고 틈은 그 오른쪽 — 표시 기호(아치)와 같은 꼴을 되풀이하지 않는다
const verdant = (() => {
  // 표시(아치 기호)가 바위 턱의 왼쪽 끝에 앉고, 그 오른쪽 턱 밑에 덩굴이 드리운 낮고 넓은 어두운 틈 — 표시 기호와 같은 아치꼴을 되풀이하지 않는다
  const out = K.cliff([[376, 909], [388, 906], [402, 907], [416, 911]], { depth: 10, step: 2.6, seed: 'verd' })
  const m = `M${pt([391, 917.5])}Q${pt([392, 911.5])} ${pt([400, 911.2])}Q${pt([409, 911.5])} ${pt([411, 917.5])}Q${pt([401, 919])} ${pt([391, 917.5])}Z`
  out.push(P('dark', m), P('ink', m))
  let vine = ''
  for (const [vx, vl] of [[393, 6], [397, 8.5], [402, 5.5], [406, 8], [410, 5]]) vine += `M${pt([vx, 908])}q1.4 ${r1(vl / 2)} 0 ${vl}`
  out.push(P('forest', ell(397, 908.2, 5, 1.8) + ell(406, 909, 4, 1.6)), P('hatch', vine))
  return out
})()

// ---------------------------------------------------------------- 10. Glint Pass — Murasa's Wall 동쪽 밑의 큰 바닷굴 (PG; 세계 지도 표시 자리 가까운 해안).
// 킷의 굴 아치(돌 테두리·어두운 입)를 바다 쪽으로 눕혀 해안 벼랑에 박고, 밀려드는 물결, 굴 안쪽 머리는 표시 바로 위.
// 미로의 길은 그리지 않는다. 굴 안에만 불꽃석영 두 점.
const glint = (() => {
  const out = []
  // 해안 벼랑에 뚫린 굴 어귀 — 킷의 굴 아치(돌 테두리·어두운 입)를 바다 쪽으로 눕혀, 두 다리가 물가에 닿고 안쪽 머리가
  // 표시 [309,174] 바로 위에 온다. 어귀 가운데는 해안 [325,145], U 는 해안을 따라, N 은 땅 안쪽(남서)
  const C = [325, 145]
  const U = [0.83, 0.555]
  const N = [-0.555, 0.83]
  const at = (u, v) => [C[0] + U[0] * u + N[0] * v, C[1] + U[1] * u + N[1] * v]
  const arc = (hw, dep, n = 14) => {
    const pts = [at(hw, -3.5)]
    for (let i = 0; i <= n; i++) {
      const th = (i / n) * Math.PI
      pts.push(at(hw * Math.cos(th), dep * Math.sin(th)))
    }
    pts.push(at(-hw, -3.5))
    return pts
  }
  const outer = arc(20, 23.5)
  const inner = arc(12.5, 16)
  const band = poly([...outer, ...[...inner].reverse()])
  const mouthD = poly(inner)
  let joints = ''
  for (const th of [0.2, 0.38, 0.5, 0.62, 0.8].map((k) => k * Math.PI)) joints += line([at(12.5 * Math.cos(th), 16 * Math.sin(th)), at(20 * Math.cos(th), 23.5 * Math.sin(th))])
  // 테두리 그늘 — 남동쪽(오른쪽 아래) 반쪽
  const bandShade = poly([...outer.slice(0, 8), ...[...inner.slice(0, 8)].reverse()])
  out.push(P('stone', band), P('shade', bandShade), P('dark', mouthD), P('hatch', joints), P('ink', line(inner)), P('ink-bold', line(outer)))
  // 불꽃석영 — 굴 안에만 ('flame-quartz, clusters of crystals that jut from the rock')
  const g1 = at(-3, 9.5)
  const g2 = at(4, 11.5)
  out.push(P('fire', poly([[g1[0] - 1.6, g1[1]], [g1[0], g1[1] - 2.8], [g1[0] + 1.6, g1[1]], [g1[0], g1[1] + 2.8]]) + poly([[g2[0] - 1.2, g2[1]], [g2[0], g2[1] - 2.1], [g2[0] + 1.2, g2[1]], [g2[0], g2[1] + 2.1]])))
  // 굴로 밀려드는 물결 (밀물이 드는 굴 — 'accessible when the tide is low')
  out.push(P('sea-ink', `M${pt(at(-7, -8))}q4 -2 8 0M${pt(at(4, -10))}q4 -2 8 0M${pt(at(-3, -15))}q3.5 -1.6 7 0`))
  return out
})()
// 마름모꼴 통로 — 'an ancient structure of flooded, diamond-shaped passages on the interior side of Murasa's Wall' (아트북).
// 안쪽 단애 면의 작은 입구 넷 (밑에 물빛 한 줄 — 물에 잠긴 통로)
const diamonds = (() => {
  let d = ''
  let water = ''
  for (const [x, y, s] of [[246, 310, 1], [257, 313, 0.85], [267, 309, 1], [275, 315, 0.8]]) {
    const w = 3.6 * s
    const h = 6 * s
    d += poly([[x, y - h], [x + w, y], [x, y + h], [x - w, y]])
    water += line([[x - w * 0.45, y + h * 0.45], [x + w * 0.45, y + h * 0.45]])
  }
  return [P('dark', d), P('ink', d), P('sea-ink', water)]
})()

// ---------------------------------------------------------------- 11. 카잔두 계곡 — 하늘이 열린 풀밭 ('where the trees welcome the sky and leave room for grazing
// herds', ZNR). 풀포기와 작은 풀 뜯는 짐승 셋 (브리프가 허락한 것).
const VALLEY = [[552, 486], [600, 498], [652, 494], [690, 500], [716, 532], [724, 570], [726, 606], [700, 606], [672, 616], [650, 640], [618, 676], [592, 690], [566, 680], [552, 650], [548, 600]]
const valley = (() => {
  const rand = rng('valley')
  let tufts = ''
  for (let gy = 500; gy < 690; gy += 13) {
    for (let gx = 552; gx < 730; gx += 13) {
      const x = gx + (rand() - 0.5) * 10
      const y = gy + (rand() - 0.5) * 10
      if (!inPoly(x, y, VALLEY) || kept(x, y, 6) || rand() > 0.42) continue
      const s = 3.2 + rand() * 2
      tufts += `M${pt([x - 1.3, y])}l${r1(-s * 0.35)} ${r1(-s * 0.7)}M${pt([x, y])}l0 ${r1(-s)}M${pt([x + 1.3, y])}l${r1(s * 0.35)} ${r1(-s * 0.7)}`
    }
  }
  // 풀 뜯는 짐승 — 머리를 숙인 네발짐승 (몸길이 약 11)
  let beast = ''
  for (const [x, y, dir] of [[660, 572], [676, 580, -1], [696, 569]].map(([x, y, d]) => [x, y, d ?? 1])) {
    const b = ell(x, y - 4, 5.5, 2.6)
    const head = poly([[x + dir * 4.5, y - 5], [x + dir * 8.5, y - 1.6], [x + dir * 7.4, y - 0.6], [x + dir * 4, y - 3]])
    beast += b + head
    beast += line([[x - 3.5, y - 2], [x - 3.6, y + 1.4]]) + line([[x - 1.8, y - 2], [x - 1.6, y + 1.4]]) + line([[x + 2, y - 2], [x + 2.1, y + 1.4]]) + line([[x + 3.6, y - 2], [x + 3.8, y + 1.4]])
  }
  return [P('hatch', tufts), P('fill', beast), P('ink', beast)]
})()

// ---------------------------------------------------------------- 12. Pillar Plains — 'cracked and broken into thousands of massive pillars, the tops of which
// are grassy plains' (PG). 세계 지도 가장자리 밑 띠에 꼭대기가 거의 같은 높이(옛 벽 꼭대기)인 모난 돌기둥을 빽빽이 — 세계 지도의 메사 기호처럼
// 양피지 바탕에 그늘진 오른쪽 면과 꼭대기 밑 세로 결, 꼭대기에 풀포기 (돌빛으로 칠하면 띠 전체가 무거운 잿빛 덩어리가 된다). 짐승·야영지·다리는 없다.
/** 돌기둥 하나 — 옆모습 (x, y) 밑 가운데. 들쭉날쭉한 바위 옆면, 평평한 꼭대기에 풀포기 */
function column(x, y, w, h, seed) {
  const rand = rng(seed)
  const j = (k = 1) => (rand() - 0.5) * k
  const yt = y - h
  const L = [[x - w / 2, y], [x - w * 0.48 + j(2), y - h * 0.35], [x - w * 0.46 + j(2), y - h * 0.7], [x - w * 0.43, yt]]
  const T = [[x - w * 0.15, yt + j(1.4)], [x + w * 0.18, yt + j(1.4)]]
  const R = [[x + w * 0.42, yt], [x + w * 0.45 + j(2), y - h * 0.66], [x + w * 0.47 + j(2), y - h * 0.32], [x + w / 2, y]]
  const out = [...L, ...T, ...R]
  const d = poly(out)
  // 세계 지도의 메사 기호처럼 양피지 바탕에 그늘진 오른쪽 면만 — 돌빛으로 칠하면 띠 전체가 무거운 잿빛 덩어리가 된다
  const sx0 = x + w * 0.14
  const shadeD = poly([[sx0, yt + 1], ...R, [sx0 + j(1.5), y]])
  let stria = ''
  for (const t of [0.0, 0.11, 0.22, 0.33]) {
    const sx = x + w * t + j(0.8)
    stria += line([[sx, yt + 1.6], [sx + j(0.6), yt + 1.6 + h * (t > 0.15 ? 0.3 + rand() * 0.45 : 0.16 + rand() * 0.12)]])
  }
  if (rand() < 0.45) stria += line([[x - w * 0.3, y - h * (0.45 + rand() * 0.15)], [x + w * 0.05, y - h * 0.47]])
  let tuft = ''
  for (let i = 0; i < 2; i++) {
    const tx = x + (i - 0.5) * w * 0.4 + j(2)
    const ty = yt + j(0.8)
    tuft += `M${pt([tx - 1, ty])}l-1.1 -2.6M${pt([tx, ty])}l0 -3.4M${pt([tx + 1, ty])}l1.1 -2.6`
  }
  return [P('fill', d), P('shade', shadeD), P('hatch', stria), P('ink', d), P('hatch', tuft)]
}
const pillars = (() => {
  const rand = rng('pillars')
  const items = []
  // 기둥의 상자(꼭대기 풀포기까지)가 이름·표시·그림 상자에 걸리면 세우지 않는다
  const hits = (x0, y0, x1, y1, b, pad) => x1 > b[0] - pad && x0 < b[2] + pad && y1 > b[1] - pad && y0 < b[3] + pad
  for (let row = 0; row < 3; row++) {
    for (let x = 290 + (row % 2) * 13; x < 846; ) {
      const w = 19 + rand() * 12
      const rimY = yAt(RIM_PP, x)
      const y = rimY + 34 + row * 24 + (rand() - 0.5) * 5
      const h = 24 + rand() * 12
      const box4 = [x - w / 2, y - h - 4, x + w / 2, y]
      const blocked = Object.entries(KEEP).some(([k, b]) => hits(...box4, b, k === 'pillarLabel' ? 5 : 2))
      const ok = y < 1034 && distTo(x, y - 12, VAZI) > 22 && distTo(x, y - 12, VAZI_W) > 15 && !blocked
      if (ok) items.push({ y, parts: column(x, y, w, h, `p${row}-${Math.round(x)}`) })
      x += w + 2 + rand() * 4.5
    }
  }
  // Pillarfield Ox 는 그림이 그린 풀 덮인 기둥 꼭대기에 서서 이웃 기둥 꼭대기와 줄을 맞춘다. 꼭대기 밑 몸통은 그리지 않는다
  // (그림 바로 밑에 이름이 오므로, 몸통을 그리면 이름이 받침대에 새긴 글씨처럼 읽힌다). 양옆에 꼭대기를 맞춘 기둥을 세워 그 꼭대기가 기둥들 사이의 하나로 읽히게
  for (const [x, y, w, h] of [[645, 965, 20, 38], [759, 973, 22, 39], [784, 989, 22, 38]]) items.push({ y, parts: column(x, y, w, h, `p-ox-${x}`) })
  return stack(items)
})()

// ---------------------------------------------------------------- 13. 자디 나무를 세운다 (뒤에서 앞으로)
const trees = [
  // 타주루 숲 — 단애 밑 골짜기의 가장 큰 자디 둘, 그 사이 그늘에 이름 (Reclamation 2016: 'A dense canopy … reached up into the cloud line')
  { y: 426, parts: jaddi(336, 426, 114, 'g1', { cw: 0.46, lean: 0.06, limbs: [[-170, 0.55, 0.05], [-128, 0.34, 0.045], [-58, 0.34, 0.045], [-16, 0.5, 0.05]] }) },
  { y: 420, parts: jaddi(478, 420, 118, 'g2', { cw: 0.52, limbs: [[-166, 0.52, 0.05], [-126, 0.34, 0.045], [-56, 0.36, 0.045], [-12, 0.6, 0.05]] }) },
  // 라이문자 강을 받는 자디 — 수관은 물 나르는 가지 위로 높이
  { y: J1.y, parts: jaddi(J1.x, J1.y, J1.h, 'j1', { cw: 0.25, cyK: 0.9, fork: 0.62, lean: -0.12, ls: 0.86, backRow: 3, frontRow: 4, limbs: [[-140, 0.3, 0.04], [-40, 0.3, 0.04]] }) },
  // 서남쪽 숲 — Doom Maw 와 Verdant Catacombs 사이
  { y: 886, parts: jaddi(356, 886, 96, 'j6', { cw: 0.5 }) },
  // 서쪽 — 카잔두 벼랑 바깥 무라사의 자디 숲 ('a continent of jaddi-tree forests', PG 2009)
  { y: 724, parts: jaddi(96, 724, 118, 'jw', { cw: 0.5 }) },
]
// 물을 나르는 가지 (J1 의 두 가지) — 줄기 앞에 그린다
const channelLimbs = { y: J1.y + 1, parts: [...L1.parts, ...L2.parts] }
/** 갈라진 바위 판 — 모난 판 두 쪽과 그 사이 틈 */
function slab(x, y, w, seed) {
  const rand = rng(seed)
  const h = w * 0.55
  const a = poly([[x - w, y], [x - w * 0.9, y - h * (0.7 + rand() * 0.3)], [x - w * 0.15, y - h], [x - w * 0.08, y]])
  const b = poly([[x + w * 0.08, y], [x + w * 0.12, y - h * 0.9], [x + w * 0.85, y - h * (0.6 + rand() * 0.3)], [x + w, y]])
  return [P('stone', a + b), P('hatch', line([[x + w * 0.4, y - h * 0.6], [x + w * 0.35, y - 1]])), P('ink', a + b)]
}
// 타주루 숲 — 높은 가지 위 천막 셋과 수관 위 구름 띠 ('reached up into the cloud line', 'tents of the settlement from their high perches')
const groveDetails = (() => {
  let tent = ''
  for (const [x, y, s] of [[290, 368, 1], [380, 364, 0.9], [536, 362, 1]]) tent += poly([[x - 5 * s, y], [x, y - 7 * s], [x + 5 * s, y]])
  let cloud = ''
  for (const [x, y, w] of [[308, 318, 44], [462, 314, 50], [518, 322, 32]]) cloud += `M${pt([x - w / 2, y])}q${r1(w / 4)} -3 ${r1(w / 2)} 0t${r1(w / 2)} 0`
  // 뿌리가 움켜쥔 갈라진 바위 판 ('splitting through earth and slowly dissolving slabs of rock beneath the unyielding grip of its roots')
  const slabs = []
  for (const [x, y, w, seed] of [[298, 430, 9, 'sl1'], [364, 431, 8, 'sl2'], [446, 424, 8, 'sl3'], [512, 425, 9, 'sl4']]) slabs.push(...slab(x, y, w, seed))
  return [P('fill', tent), P('ink', tent), P('hatch', cloud), ...slabs]
})()
// 가지 위 길 — 'the risky branch-top "roads" of Kazandu' (PG 2009). 타주루 숲에서 남쪽으로, 길잡이를 지나 카잔두 피난처 쪽으로
const roads = [
  ...K.dashed([[446, 420], [442, 470], [432, 514]], 5, 4),
  ...K.dashed([[546, 638], [554, 646], [563, 655]], 5, 4),
  ...K.dashed([[626, 662], [650, 676], [674, 689], [696, 697]], 5, 4),
]
// 줄 (zip-line) — 두 수관 사이에 살짝 처진 가는 선 ('zip lines', PG 2009)
const zip = [P('ink', `M${pt([388, 352])}Q${pt([406, 363])} ${pt([424, 352])}`)]
// 남쪽 빈 땅의 짧은 협곡 틈 — 'a mass of irregular canyons, twisting valleys, and high broken steppes' (PG). 세계 지도의 협곡 기호를 이 축척으로
const clefts = [
  ...rim(dense([[258, 958], [276, 950], [298, 953], [312, 948]], false, 4), 1, () => 9, 'cl1', { drip: 0, bold: false, step: 3.4 }),
  ...rim(dense([[452, 884], [468, 892], [486, 890]], false, 4), 1, () => 8, 'cl2', { drip: 0, bold: false, step: 3.4 }),
  ...rim(dense([[318, 936], [334, 928], [346, 930]], false, 4), 1, () => 7, 'cl3', { drip: 0, bold: false, step: 3.4 }),
]

// ---------------------------------------------------------------- 14. 지형 기호 칸
// Murasa's Wall 의 산 — 서쪽 곶과 Glint Pass 둘레(표시·이름·Quest 그림을 비운다), 동쪽 띠(이름 자리 아래부터)
// (산 기호는 밑점에서 좌우로 약 45, 위로 약 60 까지 그려진다 — 해안 털선·단애·이름에 걸치지 않게 그만큼 띄운 칸)
const MT_PROM = [[190, 104], [222, 100], [252, 116], [262, 140], [268, 176], [214, 178], [186, 158], [184, 128]]
const MT_STRIP = [[-20, 252], [92, 250], [92, 268], [-20, 268]]
const MT_EAST = [[858, 690], [904, 690], [918, 740], [944, 790], [966, 830], [972, 880], [968, 930], [952, 980], [926, 1018], [900, 1018], [912, 980], [930, 930], [928, 880], [900, 840], [892, 800], [880, 760], [866, 726]]
// 내륙 언덕 — 단애 밑과 Na Plateau 북쪽 벼랑 사이 ('steep, windy hills')
// (언덕 기호는 밑점에서 위로 약 18 — 단애 털선(밑 y≈309)과 Na Plateau 벼랑의 바깥 털선 사이 띠에 밑점을 둔다)
const HILLS = [[30, 322], [128, 318], [128, 348], [92, 352], [30, 340]]
// 숲 — 세계 지도 숲 색을 따라, 벼랑 털선과 늪·그림·이름을 비켜서
const F_BASIN_OUT = [[297,331],[312,328],[344,319],[364,314],[368,339],[392,361],[418,376],[445,383],[466,396],[476,407],[490,427],[504,445],[516,464],[535,486],[535,500],[533,560],[534,620],[548,662],[566,690],[590,716],[700,712],[712,660],[718,615],[726,622],[733,652],[747,679],[765,702],[784,720],[795,731],[800,745],[805,764],[809,786],[816,812],[829,839],[838,856],[846,870],[852,890],[846,927],[834,948],[820,971],[807,996],[800,1018],[610,1018],[596,1008],[541,960],[421,866],[391,848],[373,858],[284,943],[236,960],[231,949],[222,923],[217,901],[214,879],[213,856],[214,834],[217,811],[223,786],[229,761],[236,737],[245,712],[255,685],[265,658],[275,630],[283,601],[290,574],[298,547],[305,519],[310,490],[315,464],[321,438],[326,408],[329,370],[331,338]]
const F_BASIN_HOLES = [
  // 가운데 — 늪·연못·강 가지·활잡이·마체테·칼잡이와 이름들, Doom Maw 와 그 이름, 큰 이름 Kazandu
  [[280, 628], [300, 600], [300, 586], [372, 586], [372, 520], [384, 504], [470, 504], [480, 520], [533, 520], [532, 642], [556, 684], [588, 716], [604, 718], [604, 744], [586, 788], [574, 808], [690, 808], [690, 904], [650, 904], [650, 922], [497, 922], [490, 862], [446, 858], [426, 812], [400, 800], [352, 780], [346, 772], [336, 772], [332, 834], [222, 834], [226, 790], [234, 754], [242, 750], [246, 712], [256, 684], [266, 658], [272, 640]],
  // (구멍은 서로 겹치지 않고 바깥 고리 안에만 — 바깥으로 나간 구멍 자리는 짝홀 판정으로 도리어 숲이 된다.
  //  나무 기호는 밑점에서 위로 약 23, 아래로 약 17 까지 그려져, 이름 상자보다 위아래로 넉넉히 비운다)
  [[340, 376], [392, 366], [418, 377.5], [445, 384.5], [462, 396], [470, 405], [470, 432], [340, 432]], // Tajuru Grove 이름 (숲 칸 북쪽 끝까지)
  // Silent Gap 와 틈·뿌리, Pillarfield Ox 그림과 이름, Pillar Plains 이름 (한 구멍 — 가운데 구멍과는 x 690 의 변만 맞닿는다)
  [[690, 838], [826, 840], [834, 852], [842, 870], [847, 890], [840, 912], [812, 922], [806, 958], [762, 958], [758, 996], [540, 996], [520, 976], [510, 940], [650, 940], [650, 904], [690, 904]],
  [[634, 714.4], [700, 712], [706, 692], [710, 676], [744, 676], [756, 692], [766, 704], [778, 716], [778, 752], [634, 752]], // Kazandu Refuge 표시와 그 밑 이름 (단애 털선 앞까지)
  [[226, 880], [349, 880], [283, 942.5], [232, 944]], // Verdant Catacombs 이름 (숲 가장자리 안쪽만)
]
const F_BASIN = withHoles(F_BASIN_OUT, F_BASIN_HOLES)
const F_WEST = withHoles(
  [[-20, 606], [60, 604], [110, 616], [216, 618], [222, 622], [215, 640], [205, 665], [195, 690], [185, 718], [176, 745], [168, 772], [162, 800], [158, 828], [158, 856], [160, 884], [164, 912], [170, 939], [178, 968], [188, 1018], [124, 1004], [100, 986], [78, 978], [50, 975], [20, 984], [-20, 1000]],
  [[[30, 734], [172, 734], [164, 772], [158, 800], [154, 852], [30, 852]]], // Narrow Escape 그림과 이름 (자디 밑 숲 바닥)
)
const F_PLATEAU = withHoles(
  [[-20, 368], [24, 370], [70, 380], [100, 402], [126, 430], [150, 456], [146, 490], [118, 524], [80, 550], [40, 560], [-20, 566]],
  [box(10, 430, 114, 492)],
)
const SWAMP = withHoles(
  [[566, 716], [596, 730], [583, 750], [562, 767], [535, 780], [504, 788], [470, 791], [436, 788], [404, 780], [377, 767], [362, 750], [374, 730], [392, 700], [420, 684], [436, 666], [470, 668], [520, 672], [556, 672], [562, 690]],
  [[[414, 700], [430, 680], [458, 672], [490, 674], [512, 690], [516, 712], [500, 734], [470, 740], [436, 735], [418, 722]], [[388, 742], [548, 742], [548, 770], [520, 782], [470, 788], [402, 776]]],
)

// 앱의 흩뿌리기(src/map/childTerrain.ts → geometry.ts poissonDisk)는 칸의 상자 왼쪽 위에서 기호 간격 5배마다 시작점을 하나씩 찾는다.
// 좁은 칸은 시작점이 모두 빗나가 통째로 빌 수 있어, 넓이 없는 가시 하나(나갔다 그대로 돌아오는 두 변 — 짝홀 판정에 영향이 없다)로
// 상자 왼쪽 위 모서리를 옮겨 첫 시작점이 칸 안에 떨어지게 한다. 앱과 같은 난수(시드 '<지도 id>:<칸 차례>:<종류>')로 미리 계산한다.
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
function anchored(ring, index, kind, density) {
  const rand = mulberry32(hashSeed(`kazandu:${index}:${kind}`))
  const r1 = rand()
  const r2 = rand()
  const xs = ring.map((p) => p[0])
  const ys = ring.map((p) => p[1])
  const [minX, minY, maxX, maxY] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  // 밀도를 조금씩 바꿔 가며 (시작 칸 크기가 바뀐다) 칸 안에 떨어질 첫 시작점을 찾는다
  for (const k of [1, 0.9, 0.8, 1.15, 0.7, 1.3]) {
    const S = ((5 * SPACING[kind]) / Math.sqrt(density * k)) * 4
    const rx = r1 * S
    const ry = r2 * S
    let best = null
    for (let y = minY + 4; y < maxY; y += 5) {
      for (let x = minX + 4; x < maxX; x += 5) {
        if (x > minX + rx || y > minY + ry || !inPoly(x, y, ring)) continue
        const d = Math.hypot(x - cx, y - cy)
        if (!best || d < best[2]) best = [x, y, d]
      }
    }
    if (best) return { points: [ring[0], [best[0] - rx, best[1] - ry], ...ring], density: density * k }
  }
  return { points: ring, density }
}
/**
 * anchored 와 같은 일을 하되, 앱의 시작점 고르기(칸마다 한 번, 줄 순서)를 그대로 흉내 내어 probes 의 다각형마다 시작점이 하나 이상
 * 떨어지는 상자 모서리를 찾는다 — 구멍에 막혀 나머지와 이어지지 않는 숲 조각(카잔두 계곡 동쪽 숲)도 제 시작점을 받게.
 */
function seeded(ring, index, kind, density, probes) {
  const G = 4 // glyphScale — 앱은 기호 공간(자식 단위 ÷ 4)에서 흩뿌린다
  const xs = ring.map((p) => p[0])
  const ys = ring.map((p) => p[1])
  const [minX, minY, maxX, maxY] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
  const radius = SPACING[kind] / Math.sqrt(density)
  const step = radius * 5
  const S = step * G
  for (let oy = 0; oy < S; oy += 6) {
    for (let ox = 0; ox < S; ox += 6) {
      const x0 = (minX - ox) / G
      const y0 = (minY - oy) / G
      const rand = mulberry32(hashSeed(`kazandu:${index}:${kind}`))
      const seeds = []
      for (let gy = y0; gy < maxY / G; gy += step) {
        for (let gx = x0; gx < maxX / G; gx += step) {
          const x = gx + rand() * step
          const y = gy + rand() * step
          if (x > maxX / G || y > maxY / G || !inPoly(x * G, y * G, ring)) continue
          if (seeds.some(([sx, sy]) => (sx - x) ** 2 + (sy - y) ** 2 < radius * radius)) continue
          seeds.push([x, y])
        }
      }
      if (probes.every((pr) => seeds.some(([x, y]) => inPoly(x * G, y * G, pr)))) return { points: [ring[0], [minX - ox, minY - oy], ...ring], density }
    }
  }
  return anchored(ring, index, kind, density)
}
// 카잔두 계곡 동쪽·남쪽의 숲 — 가운데 구멍과 Silent Gap·황소 구멍 사이에 막혀 다른 숲과 이어지지 않는다
const PROBE_EAST = [[606, 720], [700, 714], [716, 640], [740, 676], [800, 744], [818, 828], [692, 830], [692, 806], [608, 790]]
const PROBE_WEST = [[230, 640], [290, 640], [290, 760], [230, 760]]
const FIELDS = [
  { kind: 'mountain', points: MT_PROM, density: 2.2 },
  { kind: 'mountain', points: MT_EAST, density: 1.5 },
  { kind: 'mountain', points: MT_STRIP, density: 1.8 },
  { kind: 'hill', points: HILLS, density: 1.2 },
  { kind: 'forest', points: F_PLATEAU, density: 0.8 },
  { kind: 'forest', points: F_WEST, density: 0.75 },
  { kind: 'forest', points: F_BASIN, density: 0.72, probes: [PROBE_EAST, PROBE_WEST] },
  { kind: 'swamp', points: SWAMP, density: 1.6 },
]
const TERRAIN = FIELDS.map((f, i) => ({ kind: f.kind, ...(f.probes ? seeded(f.points, i, f.kind, f.density, f.probes) : anchored(f.points, i, f.kind, f.density)) }))

// ---------------------------------------------------------------- 펼치기
const parts = [
  ...seaCliff(COAST_NE, 'sea-ne'),
  ...seaCliff(COAST_BAY, 'sea-bay'),
  ...outerCliffs,
  ...valley,
  ...vazi(),
  ...raimunza(),
  ...marshPools(),
  ...bowl,
  ...talus,
  ...diamonds,
  ...glint,
  ...pillars,
  ...clefts,
  ...verdant,
  ...doomMaw,
  ...silentGap,
  ...stack([
    ...trees,
    { y: 533, parts: mesa(343, 533, 146, 88, 'mesa-n') },
    { y: 834, parts: mesa(712, 834, 146, 88, 'mesa-e') },
    channelLimbs,
  ]),
  ...branchChannel(),
  ...groveDetails,
  ...roads,
  ...zip,
]

CHILDMAPS.push({
  id: 'kazandu',
  size: [1174, 1000],
  glyphScale: 4,
  terrain: TERRAIN,
  parts,
  labels: LABELS,
  subjects: SUBJECTS,
  markAnchors: { 'cipher-in-flames': 'left', 'silent-gap': 'left', 'card:verdant-catacombs': 'left', 'card:kazandu-refuge': 'below' },
  focus: [532, 660],
})
