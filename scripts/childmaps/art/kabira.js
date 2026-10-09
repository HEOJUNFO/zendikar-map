// 카비라 — 온두 앞바다 아가딤 섬, 헤드론 지대 곁의 정착지 (자식 지도, 1200×1000 = 세계 x290.6–463.4, y1496.8–1640.8 의 약 6.94배).
// 시점: Zendikar Rising(2020) 이후. 카비라는 사람이 사는 그대로(2020년 카드가 카비라 사람들을 부른다), 헤드론은 대부분 땅에 쓰러져
//       반쯤 묻힌 채(PG 2009, AoM 2016), 엘드라지 이후 떠올라 별 모양으로 모인 무리는 하나만(AoM 2016). Crypt 는 2016년 서술대로.
// 공식: 진흙 사바나, 헤드론 묘지(주먹만 한 것부터 작은 건물만 한 것까지), 헤드론의 모양과 문양을 본뜬 카비라 건물과 Kabira Conservatory,
//       카비라에서 북쪽으로 난 길(Javad, 협곡 훨씬 못 미쳐 끊긴다), 헤드론 들판과 습지를 가르는 깊은 협곡(미끄러운 벼랑), Crypt 를 둘러싼 습지,
//       협곡 속 선반 위의 큰 아치(조각한 기둥, 작은 헤드론 테, 협곡 벽에서 솟은 가시, 박쥐), 솟았다 비스듬히 내려앉는 흙 원반.
// 해석: 협곡 둘의 자리(세계 지도 추정), 카비라 건물의 모양·수·배치와 Conservatory 로 고른 건물, 교차로에서 갈라지는 길,
//       Crypt 로 드는 협곡 갈래, 헤드론·흙 원반·헤드론 별 무리의 자리·수·크기, 습지 웅덩이, 여덟 대상의 자리
//       (Quest for the Holy Relic 은 Crypt 입구 서쪽 습지, Quest for the Gravelord 는 Crypt 협곡 동쪽 습지의 물웅덩이,
//       Aether Figment 는 별 무리 밑 헤드론 들판, Hedron Crab 은 남쪽 반도 동쪽 바닷가의 작은 헤드론 곁,
//       Steppe Lynx 는 카비라 서쪽 곶의 헤드론이 흩어진 마른 풀밭(서쪽 길 곁), Cancel 은 Hedron Fields 이름 바로 밑
//       헤드론 들판 북쪽 자락 — 모두 연구 메모의 추정).
// 성벽·성문·신전·부두·다리, 습지나 협곡 북쪽의 헤드론, 강·샘, 나무·언덕, 해안 벼랑은 그리지 않는다 (브리프 mustNotInvent).
const K = KIT
const { line, poly, smooth, rng, stack, along, offset } = K
const P = (cls, d) => ({ cls, d })
const r1 = (v) => Math.round(v * 10) / 10
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`
const dot = ([x, y]) => `M${pt([x, y])}h0.1`
const ell = (x, y, rx, ry) => `M${pt([x - rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x + rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x - rx, y])}Z`

// ---------------------------------------------------------------- 기하
/** Catmull-Rom 을 촘촘한 꺾은선으로 — 그리기와 계산이 같은 선을 쓰게 */
function dense(pts, closed = false, per = 6) {
  const n = pts.length
  const at = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))])
  const out = []
  const last = closed ? n : n - 1
  for (let i = 0; i < last; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
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
/** 볼록 다각형을 y ≤ gy 쪽만 남긴다 (땅에 묻힌 헤드론) */
function clipY(pts, gy) {
  const out = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const ina = a[1] <= gy
    const inb = b[1] <= gy
    if (ina) out.push(a)
    if (ina !== inb) {
      const t = (gy - a[1]) / (b[1] - a[1])
      out.push([a[0] + (b[0] - a[0]) * t, gy])
    }
  }
  return out
}
/** 선분을 y ≤ gy 쪽만 */
function clipSeg(a, b, gy) {
  if (a[1] > gy && b[1] > gy) return ''
  if (a[1] <= gy && b[1] <= gy) return line([a, b])
  const t = (gy - a[1]) / (b[1] - a[1])
  const m = [a[0] + (b[0] - a[0]) * t, gy]
  return a[1] <= gy ? line([a, m]) : line([m, b])
}
/** 점과 꺾은선 사이 거리 */
function distToLine(x, y, pts) {
  let m = Infinity
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[i + 1]
    const dx = bx - ax
    const dy = by - ay
    const l2 = dx * dx + dy * dy || 1
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2))
    m = Math.min(m, Math.hypot(x - ax - dx * t, y - ay - dy * t))
  }
  return m
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

// ---------------------------------------------------------------- 해안 (context.mjs 의 세계 지도 해안선, 4점마다 하나) — 땅 판정에만 쓴다
const COAST = [[685,1026],[699,1006],[706,992],[702,986],[702,979],[711,970],[729,962],[756,954],[774,941],[781,922],[788,907],[797,897],[801,873],[798,835],[799,809],[804,799],[812,795],[820,797],[828,797],[837,794],[846,787],[854,777],[863,773],[875,777],[886,775],[896,761],[901,746],[903,733],[907,719],[917,702],[919,690],[914,680],[912,664],[911,641],[908,622],[900,612],[897,593],[903,563],[915,539],[931,524],[946,518],[958,518],[968,518],[973,520],[979,522],[987,520],[994,510],[994,494],[986,483],[974,478],[963,472],[956,463],[951,455],[949,447],[943,439],[934,430],[931,424],[932,419],[931,405],[931,382],[936,364],[944,355],[954,354],[963,360],[968,373],[968,389],[972,403],[983,412],[991,411],[991,400],[984,391],[972,383],[967,373],[969,364],[975,355],[985,342],[991,329],[991,317],[985,311],[975,311],[964,313],[956,321],[949,324],[944,318],[930,317],[908,321],[885,316],[864,302],[844,299],[827,308],[814,310],[804,305],[794,290],[786,267],[774,247],[756,232],[742,213],[732,190],[722,173],[714,165],[709,167],[706,181],[702,192],[696,199],[688,198],[675,186],[664,177],[655,175],[647,171],[638,164],[634,157],[637,152],[640,142],[642,127],[641,112],[636,100],[627,90],[616,81],[612,74],[614,69],[614,63],[611,55],[603,53],[592,57],[581,73],[574,103],[564,130],[549,152],[539,173],[538,194],[535,209],[528,218],[522,224],[514,226],[502,237],[486,259],[477,276],[481,286],[483,294],[478,298],[477,306],[480,317],[478,329],[472,342],[469,351],[471,356],[466,364],[452,375],[439,379],[430,378],[423,380],[415,387],[410,395],[409,403],[405,412],[397,420],[389,424],[380,426],[376,435],[375,453],[370,471],[359,484],[346,486],[334,478],[320,477],[308,486],[301,495],[300,503],[306,514],[316,526],[321,537],[314,547],[294,553],[263,553],[238,551],[225,548],[217,549],[212,559],[215,566],[225,568],[236,571],[245,578],[258,588],[277,598],[298,615],[319,641],[340,657],[362,659],[377,655],[388,649],[399,645],[414,643],[424,638],[425,630],[428,621],[436,613],[450,619],[468,638],[478,658],[477,678],[478,696],[486,709],[490,721],[489,734],[493,749],[502,765],[506,785],[502,809],[503,824],[511,827],[523,834],[537,849],[541,870],[532,897],[526,916],[528,924],[533,937],[541,958],[549,977],[559,992],[567,1002],[569,1011],[574,1026]]
const LAND = [...COAST, [574, 1100], [685, 1100]]
const coastDist = (x, y) => {
  let m = Infinity
  for (const [cx, cy] of COAST) m = Math.min(m, (cx - x) ** 2 + (cy - y) ** 2)
  return Math.sqrt(m)
}
const onLand = (x, y, margin = 0) => inPoly(x, y, LAND) && (margin <= 0 || coastDist(x, y) > margin)

// 비워 둘 곳 — 이름표·인물과 그 이름·카비라 마을 (흩뿌리는 작은 것들이 피한다)
const KEEP = []
const keep = (x0, y0, x1, y1) => KEEP.push([x0, y0, x1, y1])
const clear = (x, y, r = 0) => !KEEP.some(([a, b, c, d]) => x > a - r && x < c + r && y > b - r && y < d + r)


// ---------------------------------------------------------------- 1. 협곡 — 헤드론 들판과 습지를 가르는 깊은 협곡 (Javad 2009 'the deep ravine',
// 'the slimy cliffs of the ravine'). 세계 지도 agadeem-ravine 의 중심선 그대로, 너비 42. 서쪽 끝은 서쪽 바닷가로 열리고 동쪽 끝은 동쪽 바닷가 못 미쳐
// 가늘어지며 끝난다. 세계 지도의 협곡 기호처럼 두 가장자리에서 바닥 쪽으로 털선을 긋되, 볕이 들지 않는 북쪽 벽(남쪽을 보는 벼랑)은 길고 촘촘하게,
// 군데군데 바닥까지 흘러내린 자국으로 미끄러운 벼랑을. 물도 다리도 없다.
const RAV = [[383, 475], [450, 467], [517, 483], [583, 508], [650, 525], [717, 542], [783, 550], [850, 542], [900, 525]]
const RC = dense(RAV, false, 10)
const halfW = (t) => (t < 0.84 ? 21 : 21 * Math.max(0.08, 1 - (t - 0.84) / 0.16))
const RN = [[374.6, 454], ...offset(RC, halfW)] // 북쪽 가장자리 (서쪽 끝은 해안에 닿는다)
const RS = [[357, 487], [369, 494], ...offset(RC, (t) => -halfW(t))] // 남쪽 가장자리
const rimN = (x) => yAt(RN, x)
const rimS = (x) => yAt(RS, x)
// Crypt 협곡이 들어오는 자리 — 북쪽 가장자리를 끊는다
const GAP = [777, 810]
const RN_W = RN.filter(([x]) => x < GAP[0])
const RN_E = RN.filter(([x]) => x > GAP[1])
/** 가장자리에서 낮은 쪽으로 긋는 털선. side 1: 진행 방향 오른쪽이 낮다, -1: 왼쪽 */
function hachure(run, side, step, lenOf, seed, drip = 0) {
  const rand = rng(seed)
  let d = ''
  let ink = ''
  for (const [[x, y], [ux, uy]] of along(run, step)) {
    const nx = side > 0 ? -uy : uy
    const ny = side > 0 ? ux : -ux
    const l = lenOf(x, y, rand)
    d += line([[x + nx * 0.6, y + ny * 0.6], [x + nx * l + (rand() - 0.5) * 0.8, y + ny * l]])
    if (rand() < drip) ink += line([[x + nx * 0.6, y + ny * 0.6], [x + nx * l * 1.35, y + ny * l * 1.35]])
  }
  return { d, ink }
}
/** 벼랑 면 — 가장자리에서 아래(남쪽)로 늘어진 바위 면: 들쭉날쭉한 길이의 세로 빗금과 그 밑까지의 그늘 (KIT.cliff 의 면과 같은 손) */
function face(run, depthOf, step, seed, drip = 0) {
  const rand = rng(seed)
  const top = []
  const bot = []
  let d = ''
  let ink = ''
  for (const [[x, y]] of along(run, step)) {
    const D = depthOf(x)
    const l = D * (0.45 + rand() * 0.55)
    d += line([[x, y + 0.6], [x + (rand() - 0.5) * 0.8, y + l]])
    if (rand() < drip) ink += line([[x + 0.8, y + 0.6], [x + 0.8, y + D * (0.85 + rand() * 0.15)]])
    top.push([x, y])
    bot.push([x, y + l * 0.92])
  }
  return { shade: top.length > 1 ? poly([...top, ...bot.reverse()]) : '', d, ink }
}
const ravine = (() => {
  const W = (x) => Math.max(3, rimS(x) - rimN(x))
  // 볕이 들지 않는 북쪽 벽 (남쪽을 보는 벼랑) — 미끄러운 바위 면, 군데군데 바닥까지 흘러내린 자국
  // Crypt 협곡 어귀 양옆에서는 벽 면이 협곡 벽으로 돌아 들어가며 짧아진다
  const mouth = (x) => Math.min(1, Math.max(0.12, Math.min(Math.abs(x - GAP[0]), Math.abs(x - GAP[1])) / 34))
  const fW = face(RN_W, (x) => W(x) * 0.64 * mouth(x), 4.3, 'rv-f1', 0.1)
  const fE = face(RN_E, (x) => W(x) * 0.64 * mouth(x), 4.3, 'rv-f2', 0.1)
  // 남쪽 가장자리 — 협곡 쪽으로 짧은 털선 (그 벽은 보이지 않는다)
  const lip = hachure(RS.slice(2), -1, 5.5, (x, y, r) => 2.6 + r() * 2.4, 'rv-s')
  // 바닥 — 벽 밑자락의 진흙과 돌 부스러기 (점). 물줄기로 읽히지 않게 채움 없이 점만
  const rand = rng('rv-floor')
  let mud = ''
  for (let x = 372; x < 902; x += 2.4) {
    const w = W(x)
    const y0 = rimN(x) + w * 0.7
    const y1 = rimS(x) - 2.5
    for (let y = y0; y < y1; y += 2.6) if (rand() < 0.26 * (0.4 + (y - y0) / Math.max(1, y1 - y0))) mud += dot([x + (rand() - 0.5) * 2, y + (rand() - 0.5) * 2])
  }
  return [P('shade', fW.shade + fE.shade), P('hatch', fW.d + fE.d + lip.d), P('ink', fW.ink + fE.ink + mud), P('ink-bold', smooth(RN_W) + smooth(RN_E) + smooth(RS))]
})()

// ---------------------------------------------------------------- 2. Crypt of Agadeem — 협곡 속 선반 위의 동굴 입구 (PG 2009, AoM 2016)
// 세계 지도 agadeem-crypt-canyon (너비 29) 이 큰 협곡에서 북쪽으로 갈라져 머리 쪽으로 가늘어진다. 세계 표시 [750,450] 은 그 서쪽에 있어
// 협곡 머리에서 서쪽으로 꺾어 드는 짧은 갈래를 내고 ('nestled into the canyons'), 갈래의 막힌 끝을 아치 뒤로 둘러 아치가 벼랑 속에 들게 한다.
// 아치는 볕이 들지 않는 갈래 북쪽 벽(남쪽을 보는 바위 면)에 새겨 선반 위에 서고 ('on a shelf deep in a canyon where no sunlight
// penetrates'), 표시는 아치 앞 선반, 이름은 왼쪽(습지 위).
const CAN = [[786, 540], [808, 500], [817, 450], [800, 400]]
const CC = dense(CAN, false, 10)
const cw = (t) => 14.5 * (t < 0.7 ? 1 : 1 - ((t - 0.7) / 0.3) * 0.72)
const CW = offset(CC, cw).filter(([x, y]) => y < rimN(x) - 0.5) // 서쪽 가장자리
const CE = offset(CC, (t) => -cw(t)).filter(([x, y]) => y < rimN(x) - 0.5) // 동쪽 가장자리
/** 협곡 서쪽 가장자리에서 y 에 가장 가까운 점 — 갈래 가장자리가 거기서 이어진다 */
const wallAt = (y) => CW.reduce((a, p) => (Math.abs(p[1] - y) < Math.abs(a[1] - y) ? p : a), CW[0])
const J_S = wallAt(467)
const CE_TOP = CE.filter(([, y]) => y > 407).pop() // 협곡 동쪽 가장자리는 여기서 갈래 북쪽 가장자리로 둥글게 돈다
// 갈래 — 협곡 머리에서 서쪽으로 꺾어 들어가 아치 뒤에서 막힌다. 북쪽 가장자리(협곡 동쪽 가장자리 끝에서 이어 동→서), 막힌 끝(북→남),
// 남쪽 가장자리(서→동, 협곡 서쪽 벽으로 이어진다)
const AN = dense([CE_TOP, [806, 402], [798, 400.5], [788, 403.5], [775, 406.5], [762, 405], [749, 403.5], [737, 405], [728.5, 411]], false, 4)
const AH = dense([[728.5, 411], [723.5, 423], [724, 436], [729, 448]], false, 4)
const AS = dense([[729, 448], [739, 457], [754, 462], [771, 464.5], [787, 466.5], J_S], false, 4)
const CW_S = CW.filter(([, y]) => y > J_S[1] + 0.5) // 갈래 남쪽의 협곡 서쪽 벽
const canyon = (() => {
  const startW = [CW[0][0], rimN(CW[0][0])]
  const startE = [CE[0][0], rimN(CE[0][0])]
  const width = (x, y) => Math.max(4, distToLine(x, y, CC) * 2)
  // 양쪽 가장자리에서 안으로 짧은 털선 (북쪽으로 달리는 선: 서쪽 벽은 오른쪽, 동쪽 벽은 왼쪽이 낮다). 갈래로 꺾이는 머리 쪽으로 얕아진다
  const tipY = CE_TOP[1]
  const fade = (y) => Math.min(1, Math.max(0.3, (y - tipY) / 40))
  const w1 = hachure([startW, ...CW_S], 1, 3.4, (x, y, r) => width(x, y) * (0.22 + r() * 0.12), 'cc-w1')
  const e = hachure([startE, ...CE.filter(([, y]) => y > 407)], -1, 3.4, (x, y, r) => width(x, y) * (0.24 + r() * 0.12) * fade(y), 'cc-e')
  // 갈래 — 북쪽 벽은 해가 들지 않는 바위 면(아치 자리까지 깊게), 막힌 머리는 동쪽으로 짧은 털선, 남쪽 가장자리는 북쪽으로 짧은 털선
  const anY = (x) => yAt(AN, x)
  const an = face(AN, (x) => (441 - anY(x)) * (x < 776 ? 1 : Math.max(0.3, 1 - (x - 776) / 36)), 2.8, 'al-n', 0.14)
  const ah = hachure(AH, -1, 3.2, (x, y, r) => 4.5 + r() * 2.5, 'al-h')
  const as = hachure(AS, -1, 4.2, (x, y, r) => 2.4 + r() * 1.8, 'al-s')
  // 한 줄로 — 협곡 동쪽 가장자리 → 머리에서 서쪽으로 꺾여 갈래 북쪽 가장자리 → 막힌 끝 → 갈래 남쪽 가장자리 → 협곡 서쪽 가장자리
  const rims = smooth([startE, ...CE.filter(([, y]) => y > 407), ...AN.slice(1), ...AH.slice(1), ...AS.slice(1), ...[...CW_S].reverse(), startW])
  // 바닥의 점 — 해가 들지 않는 깊은 바닥 (협곡과 갈래)
  const rand = rng('cc-floor')
  let mud = ''
  for (const [[x, y], [ux, uy]] of along(CC.filter(([px, py]) => py < rimN(px) - 2 && py > tipY + 16), 2.2)) {
    const hw = distToLine(x, y, CW) * 0.5
    for (let k = -2; k <= 2; k++) if (rand() < 0.7 - Math.abs(k) * 0.18) mud += dot([x - uy * hw * k * 0.5 + (rand() - 0.5) * 1.5, y + ux * hw * k * 0.5 + (rand() - 0.5) * 1.5])
  }
  for (let x = 768; x < 800; x += 2.3) {
    const y0 = 441 + (x - 768) * 0.12
    const y1 = yAt(AS, x) - 2.5
    for (let y = y0; y < y1; y += 2.6) if (rand() < 0.42) mud += dot([x + (rand() - 0.5) * 2, y + (rand() - 0.5) * 2])
  }
  return [P('shade', an.shade), P('hatch', w1.d + e.d + an.d + ah.d + as.d), P('ink', an.ink + mud), P('ink-bold', rims)]
})()

/** 아치 — 갈래 북쪽 벽에 새긴 문: 조각한 두 기둥, 작은 헤드론을 촘촘히 두른 큰 아치, 어두운 입구 (PG 'a huge natural archway lined with
 *  innumerable small, etched hedrons'; AoM 'Elaborate carved pillars flank the enormous archway'). (x, y) 는 입구 밑 가운데 (선반 위) */
function cryptArch(x, y) {
  const ow = 16
  const oh = 24
  const pw = 5.5
  const ph = 17
  const L = x - ow / 2
  const R = x + ow / 2
  const sy = y - oh + ow / 2 // 아치가 휘기 시작하는 높이
  const rr = ow / 2 + 5.8
  // 벽 면을 깎아 낸 자리 — 벽의 빗금을 가리는 밝은 바위 (아치 테 바깥까지)
  const outR = rr + 3.6
  const carved = `M${pt([L - pw - 2.6, y])}V${r1(sy)}A${r1(outR)} ${r1(outR)} 0 0 1 ${pt([R + pw + 2.6, sy])}V${r1(y)}Z`
  const open = `M${pt([L, y])}V${r1(sy)}A${r1(ow / 2)} ${r1(ow / 2)} 0 0 1 ${pt([R, sy])}V${r1(y)}Z`
  const ring = `M${pt([L - 3.6, sy])}A${r1(ow / 2 + 3.6)} ${r1(ow / 2 + 3.6)} 0 0 1 ${pt([R + 3.6, sy])}L${pt([R, sy])}A${r1(ow / 2)} ${r1(ow / 2)} 0 0 0 ${pt([L, sy])}Z`
  const pillar = (cx) => {
    const body = poly([[cx - pw / 2, y], [cx - pw / 2, y - ph], [cx + pw / 2, y - ph], [cx + pw / 2, y]])
    const cap = poly([[cx - pw / 2 - 1.3, y - ph], [cx - pw / 2 - 1.3, y - ph - 2.4], [cx + pw / 2 + 1.3, y - ph - 2.4], [cx + pw / 2 + 1.3, y - ph]])
    const base = poly([[cx - pw / 2 - 1.1, y], [cx - pw / 2 - 1.1, y - 2.2], [cx + pw / 2 + 1.1, y - 2.2], [cx + pw / 2 + 1.1, y]])
    let carve = ''
    for (let k = 0; k < 3; k++) {
      const cy = y - 4.8 - k * 4.4
      carve += poly([[cx, cy - 1.7], [cx + 1.15, cy], [cx, cy + 1.7], [cx - 1.15, cy]])
    }
    return { body: body + cap + base, carve }
  }
  const pl = pillar(L - pw / 2)
  const pr = pillar(R + pw / 2)
  // 아치를 두른 작은 헤드론 — 반지름 방향으로 선 길쭉한 마름모
  let hed = ''
  for (let k = 0; k <= 10; k++) {
    const a = Math.PI + (k / 10) * Math.PI
    const ux = Math.cos(a)
    const uy = Math.sin(a)
    const c = [x + ux * rr, sy + uy * rr]
    const l = 2.8
    const w = 1.05
    hed += poly([[c[0] + ux * l, c[1] + uy * l], [c[0] - uy * w, c[1] + ux * w], [c[0] - ux * l, c[1] - uy * l], [c[0] + uy * w, c[1] - ux * w]])
  }
  // 선반 — 아치 앞 좁은 바위 턱
  const shelf = poly([[x - 19, y], [x + 20, y], [x + 18, y + 3.2], [x - 17, y + 3.2]])
  return [
    P('fill', carved),
    P('fill', shelf),
    P('stone', pl.body + pr.body + ring),
    P('shade', poly([[R + pw * 0.45, y], [R + pw * 0.45, y - ph], [R + pw + 1.3, y - ph], [R + pw + 1.3, y]])),
    P('fill', hed),
    P('hatch', pl.carve + pr.carve + hed + line([[x - 15, y + 1.6], [x + 16, y + 1.6]])),
    P('dark', open),
    P('ink', pl.body + pr.body + ring + open + shelf),
  ]
}
/** 벼랑에서 튀어나온 큰 가시 (AoM 'huge spikes jut from the canyon wall as if warning intruders away') — 밑동은 벽 면에 묻히고
 *  끝은 갈래 어귀(협곡 쪽)를 겨눈다. 아래쪽 반을 그늘로 */
function spike(bx, by, tx, ty, w) {
  const dx = tx - bx
  const dy = ty - by
  const l = Math.hypot(dx, dy)
  const nx = (-dy / l) * w
  const ny = (dx / l) * w
  const d = poly([[bx + nx, by + ny], [tx, ty], [bx - nx, by - ny]])
  const low = ny > 0 ? 1 : -1
  const half = poly([[bx, by], [tx, ty], [bx + nx * low, by + ny * low]])
  return [P('stone', d), P('shade', half), P('ink', d)]
}
/** 박쥐 — 작은 잉크 갈매기꼴 (PG 'home to thousands of bats') */
const bat = (x, y, s) => `M${pt([x - s, y - s * 0.2])}Q${pt([x - s * 0.55, y - s * 0.75])} ${pt([x - s * 0.15, y - s * 0.1])}L${pt([x, y + s * 0.15])}L${pt([x + s * 0.15, y - s * 0.1])}Q${pt([x + s * 0.55, y - s * 0.75])} ${pt([x + s, y - s * 0.2])}`
const ARCH = [750, 440]
const crypt = [
  ...cryptArch(ARCH[0], ARCH[1]),
  ...spike(770, 418, 789, 431, 2.3),
  ...spike(781, 421, 798, 435, 2.1),
  ...spike(791, 425, 805, 439, 1.8),
  P('ink', bat(745, 389, 4.4) + bat(760, 382, 3.8) + bat(731, 380, 3.4) + bat(773, 392, 3.2)),
]

// ---------------------------------------------------------------- 3. 습지 — Crypt 를 둘러싼 습지 (Javad 2009). 세계 지도 agadeem-marsh 처럼 협곡 북쪽 땅 전체.
// 늪 기호는 지형 칸이 흩뿌리고, 고인 물은 손으로 (협곡 남쪽에는 물을 두지 않는다). Quest for the Gravelord 그림은 제 발밑 웅덩이를
// 함께 그려 그 자리에는 웅덩이를 따로 두지 않고, Quest for the Holy Relic 둘레는 비운다
const POOLS = [
  [628, 326, 20, 7, 'p1'], // Marsh Flats 표시 곁 — 표시가 젖은 땅에 앉게
  [528, 350, 22, 8, 'p2'],
  [478, 431, 14, 5.5, 'p3'],
  [598, 150, 14, 5, 'p4'],
]
function marshPool(cx, cy, rx, ry, seed) {
  const rand = rng(seed)
  const ring = []
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const k = 1 + (rand() - 0.5) * 0.3
    ring.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
  }
  const d = smooth(ring, true)
  let rip = ''
  for (const [dx, dy, s] of [[-0.35, -0.1, 0.3], [0.25, 0.25, 0.26]]) {
    const x = cx + dx * rx
    const y = cy + dy * ry
    const w = rx * s
    rip += `M${pt([x - w, y])}Q${pt([x - w / 2, y - 1.4])} ${pt([x, y])}Q${pt([x + w / 2, y + 1.4])} ${pt([x + w, y])}`
  }
  return [P('fill', d), P('sea', d), P('sea-ink', d + rip)]
}
/** 물가 갈대 몇 가닥 */
function reeds(x, y, w, n, seed, h = 9) {
  const rand = rng(seed)
  let d = ''
  for (let i = 0; i < n; i++) {
    const rx = x + (rand() - 0.5) * w
    const rh = h * (0.6 + rand() * 0.5)
    const lean = (rand() - 0.5) * h * 0.4
    d += `M${pt([rx, y])}Q${pt([rx + lean * 0.2, y - rh * 0.6])} ${pt([rx + lean, y - rh])}`
  }
  return [P('ink', d)]
}
const marsh = [
  // 페이즈2 에서는 섬 북쪽 끝의 작은 웅덩이(p4)를 그리지 않는다 — Agadeem Occultist 가 그 자리에 선다 (phase2: false)
  ...POOLS.flatMap(([x, y, rx, ry, s]) => marshPool(x, y, rx, ry, s).map((part) => (s === 'p4' ? { ...part, phase2: false } : part))),
  ...reeds(612, 332, 10, 4, 'r1'),
  ...reeds(511, 355, 9, 4, 'r2'),
  ...reeds(466, 435, 8, 3, 'r3'),
]

// ---------------------------------------------------------------- 4. 길 — Kabira Crossroads 표시에서 갈라지는 흙길 (카드 이름; 'Rather than skirt the coast,
// we set out on the northern road'). 남동쪽은 카비라로, 서쪽은 서쪽 곶의 바닷가로, 남쪽은 작은 만의 물가로 (부두 없이 모래에서 끝난다),
// 북쪽 길은 협곡에 훨씬 못 미쳐 풀밭에서 흐려진다
const CROSS = [458, 525]
const TRACKS = [
  [CROSS, [474, 538], [489, 551], [500, 563]],
  [CROSS, [447, 541], [427, 547], [396, 549], [356, 552], [310, 556], [268, 559], [232, 559]],
  [CROSS, [458, 549], [452, 574], [442, 599]],
]
const NORTH_ROAD = [CROSS, [463, 516], [467, 509]]
const tracks = [
  ...TRACKS.flatMap((t) => K.dashed(dense(t, false, 6), 6, 4.5)),
  P('ink', line([[459.5, 520], [461.8, 516]]) + line([[464, 512.6], [465.3, 510.4]])),
]

// ---------------------------------------------------------------- 5. 헤드론 — 쓰러져 반쯤 묻힌 흰 돌 헤드론 (PG 'a veritable graveyard of ancient stone hedrons,
// some the size of a fist, others the size of small buildings… partially sunken in the earth'; Javad 'the white stone hedrons')
/** 땅에 누워 반쯤 묻힌 헤드론 — 세계 지도 헤드론과 같은 팔면체를 돌빛으로, 땅선 밑은 잘라 낸다. (x, y) 가운데, len 반 길이, sink 묻힌 비율 */
function lying(x, y, len, rot, sink = 0.2, seed = 'h') {
  const wid = len * 0.36
  const t = -len
  const b = len * 0.92
  const g = len * 0.08
  const c = Math.cos((rot * Math.PI) / 180)
  const s = Math.sin((rot * Math.PI) / 180)
  const T = ([px, py]) => [x + px * c - py * s, y + px * s + py * c]
  const top = T([0, t])
  const rgt = T([wid, g])
  const bot = T([0, b])
  const lft = T([-wid, g])
  const mid = T([wid * 0.28, g])
  const ys = [top, rgt, bot, lft].map((p) => p[1])
  const yMin = Math.min(...ys)
  const yMax = Math.max(...ys)
  const gy = yMax - (yMax - yMin) * sink
  const body = clipY([top, rgt, bot, lft], gy)
  if (body.length < 3) return []
  const facet = clipY([top, rgt, bot, mid], gy)
  let edge = ''
  for (let i = 0; i < body.length; i++) {
    const p = body[i]
    const q = body[(i + 1) % body.length]
    if (Math.abs(p[1] - gy) < 0.01 && Math.abs(q[1] - gy) < 0.01) continue
    edge += line([p, q])
  }
  const lines = clipSeg(top, mid, gy) + clipSeg(mid, bot, gy) + clipSeg(lft, mid, gy) + clipSeg(mid, rgt, gy)
  const rune = clipSeg(T([-wid * 0.12, t * 0.42]), T([-wid * 0.2, g * 0.3]), gy) + clipSeg(T([-wid * 0.2, g * 0.3]), T([-wid * 0.12, b * 0.4]), gy)
  const xs = body.filter((p) => Math.abs(p[1] - gy) < 0.01).map((p) => p[0])
  const parts = [P('stone', poly(body))]
  if (facet.length > 2) parts.push(P('shade', poly(facet)))
  parts.push(P('hatch', lines + rune), P('ink', edge))
  if (xs.length >= 2 && len > 6) {
    const rand = rng(seed)
    const x0 = Math.min(...xs) - len * 0.14
    const x1 = Math.max(...xs) + len * 0.14
    let ground = line([[x0, gy + 0.4], [x1, gy + 0.4]])
    for (const gx of [x0 + 1, x1 - 1]) ground += `M${pt([gx - 1.4, gy])}l${r1(-0.8)} ${r1(-2.4 - rand() * 1.5)}M${pt([gx, gy])}l0 ${r1(-3 - rand() * 1.5)}M${pt([gx + 1.4, gy])}l0.8 ${r1(-2.2 - rand() * 1.5)}`
    parts.push(P('ink', ground))
  }
  return parts
}
/** 아주 작은 헤드론 — 수백 수천 개의 점묘 */
function pebble(x, y, len, rot) {
  const c = Math.cos((rot * Math.PI) / 180)
  const s = Math.sin((rot * Math.PI) / 180)
  const w = len * 0.38
  const T = ([px, py]) => [x + px * c - py * s, y + px * s + py * c]
  return poly([T([0, -len]), T([w, len * 0.08]), T([0, len * 0.92]), T([-w, len * 0.08])])
}

// 큰 헤드론 [x, y, len, rot, sink] — 세계 지도 agadeem-graveyard 의 자리를 따르되 마을·인물·이름 자리는 비킨다.
// 몇은 한쪽 끝이 땅에 박혀 비스듬히 솟았다
const GREAT = [
  [416, 604, 12, 76, 0.22], // 서쪽 곶 밑동 (세계 [401,613]) — Steppe Lynx 앞발과 땅선이 이어지지 않게 동쪽 위로, 작게
  [268, 577, 8, 80, 0.2], // 서쪽 곶 끝 — 곶이 헤드론이 흩어진 풀밭으로 읽히게
  [470, 612, 15, 98, 0.22], // (세계 [482,597]) — 그 동쪽 끝에 기대 지은 집 한 채
  [850, 750, 22, 70, 0.2], // (세계 [784,667]) — Aether Figment 자리를 비켜 동쪽 바닷가 쪽으로
  [878, 708, 18, 84, 0.18], // (세계 [857,671])
  [558, 824, 30, 82, 0.22], // (세계 [574,833]) — Cancel 자리를 비켜 서쪽 위로, 조금 작게
  [686, 887, 27, 102, 0.2], // (세계 [697,878]·[708,859]) — 끝이 Hedron Crab 이름에 닿지 않게 서쪽으로
  // 남쪽 끝(가장자리 띠, y ≥ 880)에는 큰 헤드론을 두지 않는다 — 띠에서는 세계 지도의 헤드론(세계 [745,942] 등)이 이어받는다
  [770, 806, 13, 64, 0.16],
  [632, 716, 12, 110, 0.18],
  [530, 788, 9, 80, 0.16],
  [712, 812, 9, 136, 0.32],
  [662, 684, 8, 98, 0.16],
]

// ---------------------------------------------------------------- 6. 흙 원반 — 땅에서 솟아 제자리에서 돌다 비스듬히 내려앉은 흙 원반 (PG/AoM 'huge discs of earth
// thrust up from the ground, rotate in place, and settle down again at odd angles')
function disc(cx, cy, rx, ry, tilt, th, seed) {
  const rand = rng(seed)
  const c = Math.cos((tilt * Math.PI) / 180)
  const s = Math.sin((tilt * Math.PI) / 180)
  const raise = tilt < 0 ? 1 : -1 // 들린 쪽 (오른쪽 1, 왼쪽 -1)
  const N = 32
  const rim = []
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2
    const px = Math.cos(a) * rx
    const py = Math.sin(a) * ry
    rim.push([cx + px * c - py * s, cy + px * s + py * c])
  }
  // 앞(아래)쪽 둘레 밑으로 두꺼운 흙 단면 — 들린 쪽이 더 두껍고, 밑선은 뜯겨 나간 듯 들쭉날쭉
  let lo = 0
  let hi = 0
  rim.forEach((p, i) => {
    if (p[0] < rim[lo][0]) lo = i
    if (p[0] > rim[hi][0]) hi = i
  })
  const front = []
  for (let i = lo; ; i = (i - 1 + N) % N) {
    front.push(rim[i])
    if (i === hi) break
  }
  if (front.length < 3 || front[1][1] < front[0][1]) {
    front.length = 0
    for (let i = lo; ; i = (i + 1) % N) {
      front.push(rim[i])
      if (i === hi) break
    }
  }
  // 들린 쪽에서 두껍고 내려앉은 쪽으로 가며 땅속으로 사라지는 초승달 단면
  const depthAt = (p) => th * Math.pow(Math.min(1, Math.max(0, ((raise * (p[0] - cx)) / rx + 0.75) / 1.75)), 1.3)
  const under = front.map((p, i) => [p[0] + (rand() - 0.5) * 1.2, p[1] + depthAt(p) * (i === 0 || i === front.length - 1 ? 0.2 : 0.78 + rand() * 0.44)])
  const band = poly([...front, ...[...under].reverse()])
  let hatch = ''
  front.forEach((p, i) => {
    if (i === 0 || i === front.length - 1 || under[i][1] - p[1] < 3 || i % 2) return
    hatch += line([[p[0], p[1] + 0.8], [p[0] + (rand() - 0.5) * 1.2, p[1] + (under[i][1] - p[1]) * (0.5 + rand() * 0.4)]])
  })
  // 윗면의 풀
  let grass = ''
  for (let k = 0; k < 9; k++) {
    const u = (rand() - 0.5) * 1.4
    const v = (rand() - 0.5) * 1.0
    const gx = cx + u * rx * c - v * ry * s
    const gy = cy + u * rx * s + v * ry * c
    grass += `M${pt([gx - 1.5, gy])}l-0.8 -2.6M${pt([gx, gy])}l0 -3.4M${pt([gx + 1.5, gy])}l0.8 -2.6`
  }
  // 원반이 솟아 나온 자리 — 밑 땅의 그늘
  const shadow = ell(cx + raise * rx * 0.12, cy + ry * 0.55 + th * 0.85, rx * 1.02, ry * 0.5)
  const top = poly(rim)
  return [P('shade', shadow), P('stone', band), P('hatch', hatch), P('ink', band), P('fill', top), P('hatch', grass), P('ink-bold', top)]
}
// 남쪽 끝 가장자리 띠에 있던 큰 원반은 뺐다 (띠에서 반쯤 바래 유령처럼 남는다)
const DISCS = [
  [702, 846, 22, 8, 21, 12, 'd2'],
]

// ---------------------------------------------------------------- 7. 별 무리 — 엘드라지 이후 땅에서 떠올라 별 모양으로 모인 헤드론 (AoM 2016 'Sometimes they drift
// together and form into starlike configurations'). 섬 전체에 하나만, 땅의 그림자와 함께
function starKnot(cx, cy, r, lift) {
  const items = []
  const n = 7
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 - Math.PI / 2 + 0.2
    const hx = cx + Math.cos(a) * r
    const hy = cy + Math.sin(a) * r * 0.82
    const len = 8.5 + (k % 3) * 1.6
    items.push({ y: hy, parts: K.hedron(hx, hy, len, (a * 180) / Math.PI + 90, { shadow: false }) })
  }
  items.push({ y: cy, parts: K.hedron(cx, cy, 4.6, 30, { shadow: false }) })
  const shadow = ell(cx, cy + lift, r * 1.2, r * 0.3)
  return [P('shade', shadow), ...stack(items)]
}

// ---------------------------------------------------------------- 8. 카비라 — 헤드론의 모양과 문양을 본뜬 건물 (PG 'the architecture of Kabira mimics and incorporates
// the shapes and glyphs from the stone hedrons'). 성벽·성문·망루·신전·부두는 없다 (Plane Shift: 'Without the safety of walls and ramparts').
// 표시 [567,592] 와 오른쪽 이름 자리는 빈 마당으로 비운다
/** 헤드론 집 — 땅에 반쯤 묻혀 선 헤드론 모양 (밑이 좁고 허리가 넓고 끝이 뾰족하다), 면 선과 문양. (x, y) 는 밑 가운데 */
function hedronHouse(x, y, w, h, o = {}) {
  const L = x - w / 2
  const R = x + w / 2
  const gy = y - h * 0.4
  const apex = [x, y - h]
  const bl = [x - w * 0.37, y]
  const br = [x + w * 0.37, y]
  const rm = [x + w * 0.15, gy]
  const rb = [x + w * 0.11, y]
  const body = poly([bl, [L, gy], apex, [R, gy], br])
  const shade = poly([apex, [R, gy], br, rb, rm])
  let hatch = line([apex, rm, rb]) + line([[L, gy], rm, [R, gy]])
  hatch += line([[x + w * 0.31, gy + 1.4], [x + w * 0.27, y - 0.8]])
  // 문양 — 헤드론처럼 윗면에 새긴 짧은 금
  hatch += line([[x - w * 0.08, y - h * 0.84], [x - w * 0.16, gy - h * 0.12]]) + line([[x - w * 0.2, gy - h * 0.06], [x - w * 0.3, gy - h * 0.02]])
  const dw = Math.min(w * 0.22, 3.6)
  const dx = x - w * 0.1
  const door = `M${pt([dx - dw / 2, y])}V${r1(y - h * 0.2)}L${pt([dx, y - h * 0.27])}L${pt([dx + dw / 2, y - h * 0.2])}V${r1(y)}Z`
  const wy = gy - h * 0.18
  const win = o.window === false ? '' : poly([[dx, wy - 2], [dx + 1.2, wy], [dx, wy + 2], [dx - 1.2, wy]])
  return [P('fill', body), P('shade', shade), P('hatch', hatch), P('dark', door + win), P('ink', body)]
}
/** 헤드론 지붕 집 — 헤드론 윗반처럼 높고 모난 지붕(면 선 하나), 벽을 두른 문양 띠 */
function hedHouse(x, y, w, h, o = {}) {
  const rh = o.rh ?? w * 0.95
  const ov = w * 0.1
  const L = x - w / 2
  const R = x + w / 2
  const top = y - h
  const apex = [x, top - rh]
  const body = poly([[L, y], [L, top], [R, top], [R, y]])
  const roof = poly([[L - ov, top], apex, [R + ov, top]])
  const fx = x + w * 0.2
  const roofShade = poly([apex, [R + ov, top], [fx, top]])
  const side = poly([[x + w * 0.24, y], [x + w * 0.24, top], [R, top], [R, y]])
  let hatch = line([apex, [fx, top]])
  const by = top + h * 0.34
  hatch += line([[L + 0.4, by], [R - 0.4, by]])
  for (let gx = L + w * 0.18; gx < R - 1.5; gx += w * 0.28) hatch += poly([[gx, by - 1.5], [gx + 1, by], [gx, by + 1.5], [gx - 1, by]])
  hatch += line([[R - w * 0.12, by + 2.2], [R - w * 0.12, y - 0.8]])
  const parts = [P('fill', body + roof), P('shade', side + roofShade), P('hatch', hatch)]
  if (o.door !== false) {
    const dw = Math.min(w * 0.2, 3.4)
    const dx = x - w * 0.14
    parts.push(P('dark', `M${pt([dx - dw / 2, y])}V${r1(y - h * 0.42)}L${pt([dx, y - h * 0.56])}L${pt([dx + dw / 2, y - h * 0.42])}V${r1(y)}Z`))
  }
  parts.push(P('ink', body + roof))
  if (o.finial) parts.push(...K.hedron(apex[0], apex[1] - o.finial * 0.92 - 0.6, o.finial, 0, { shadow: false }))
  return parts
}
/** 천막 — 'encamped' (PG). 기둥 끝이 조금 솟은 세모 천막, 어두운 틈 */
function tent(x, y, w, h) {
  const L = x - w / 2
  const R = x + w / 2
  const body = poly([[L, y], [x, y - h], [R, y]])
  const shade = poly([[x, y - h], [R, y], [x + w * 0.12, y]])
  const slit = poly([[x - w * 0.08, y], [x - w * 0.02, y - h * 0.5], [x + w * 0.06, y]])
  return [P('fill', body), P('shade', shade), P('hatch', line([[x + w * 0.22, y - h * 0.55], [x + w * 0.3, y]])), P('dark', slit), P('ink', body + line([[x, y - h], [x - 0.6, y - h - 3]]))]
}
/** Kabira Conservatory — 헤드론 유적을 연구하는 작은 학당 (PG/AoM). 건물 모습은 서술이 없어, 마을에서 가장 큰 헤드론 집과 양쪽 날개로.
 *  마당 동쪽 끝, 헤드론 들판을 바라보는 자리에 따로 세우고 이름은 그 밑에 둔다 */
function conservatory(x, y) {
  return [
    ...hedHouse(x - 16, y - 1, 13, 10, { rh: 9, door: false }),
    ...hedHouse(x + 16, y - 1, 13, 10, { rh: 9, door: false }),
    ...hedronHouse(x, y, 26, 44),
  ]
}

const town = []
const TOWN_TOPS = [] // [x, 꼭대기 y] — 협곡 남쪽 가장자리 밑에 머무는지 확인용
const add = (y, parts, x, top) => {
  town.push({ y, parts })
  if (x !== undefined) TOWN_TOPS.push([x, top])
}
const hh = (x, y, w, h, rh, o = {}) => add(y, hedHouse(x, y, w, h, { rh, ...o }), x, y - h - rh - (o.finial ?? 0) * 1.95)
const hd = (x, y, w, h) => add(y, hedronHouse(x, y, w, h), x, y - h)
// 뒷줄 — 협곡 남쪽 가장자리 밑 (지붕이 가장자리를 넘지 않게)
hh(503, 552, 15, 10, 13, { finial: 4 })
hd(523, 557, 18, 33)
hh(545, 560, 17, 11, 15, { finial: 4 })
hd(567, 563, 16, 31)
hh(590, 566, 19, 11, 16)
hd(613, 572, 18, 27)
hh(636, 573, 16, 10, 13)
hh(657, 577, 15, 9, 12)
// 마당 서쪽 — 천막, 마을에서 가장 높은 헤드론 집, 쓰러진 헤드론에 기대 지은 집
add(584, tent(497, 584, 14, 12))
hd(527, 597, 21, 36)
hh(548, 605, 13, 9, 11)
add(611, tent(500, 611, 13, 11))
hh(486, 624, 13, 9, 11) // 쓰러진 헤드론 동쪽 끝에 붙여 지은 집
// 마당 동쪽 끝 — Kabira Conservatory (이름은 그 밑, 마당과 인물 사이)
add(610, conservatory(700, 610), 700, 610 - 44)
// 앞줄 — 마당 남쪽 (지붕이 마당과 이름 자리 밑에 머물게)
hh(514, 627, 16, 10, 14)
hd(537, 636, 16, 30)
hh(561, 643, 18, 11, 14)
hh(586, 646, 19, 11, 15, { finial: 4 })
hd(610, 647, 16, 28)
hh(600, 664, 15, 9, 12, { finial: 3.5 })
hh(628, 664, 15, 9, 12)
add(658, tent(651, 658, 12, 10))

// ---------------------------------------------------------------- 9. 이름 — 공식 이름만 (브리프 mayLabel). Kabira·Kabira Crossroads·Crypt of Agadeem·Marsh Flats 는 앱의 표시 이름
const LABELS = [
  { text: 'Agadeem', textKo: '아가딤', at: [640, 254], size: 26, kind: 'area' },
  { text: 'Hedron Fields of Agadeem', textKo: '아가딤의 다면체 지역', at: [664, 786], size: 18, kind: 'area' },
  { text: 'Silundi Sea', textKo: '실룬디의 바다', at: [222, 772], size: 22, kind: 'water' },
  { text: 'Kabira Conservatory', at: [706, 632], size: 13, kind: 'place' },
]
// Quest for the Gravelord 는 Crypt 협곡과 동쪽 바닷가 사이 좁은 땅이라 이름(가운데 정렬)이 협곡 동쪽 가장자리에 조금 걸린다. 뒤집어 더 동쪽에
// 두면 이름은 비지만 거인이 바다를 보고 휴대폰 첫 화면에 Kabira Evangel 과 함께 들지 않아, 거인이 Crypt 쪽을 보는 이 자리를 골랐다
const SUBJECTS = {
  // 페이즈2 — 섬 북쪽 끝 습지, Crypt 둘레의 두 원정 그림을 비켜 무덤에서 해골을 일으키는 아가딤 주술사. 이름표가 'Agadeem' 지역 이름에 닿지 않게 북쪽 웅덩이 자리까지 올렸다
  'agadeem-occultist': { at: [575, 189], size: 72 },
  'steppe-lynx': { at: [350, 612], size: 80 }, // 서쪽 곶의 헤드론이 흩어진 마른 풀밭, 서쪽 길 남쪽 (이름이 남쪽 바닷가에 닿지 않게 곶 가운데)
  'cancel': { at: [624, 880], size: 92 }, // Hedron Fields 이름 바로 밑 들판 북쪽 자락 — 카비라 남쪽 세 인물과 한 줄로 서지 않게
  'quest-for-the-holy-relic': { at: [596, 386], size: 85 }, // 이름이 Crypt of Agadeem 이름과 겹쳐 읽히지 않게 북쪽으로
  'aether-figment': { at: [814, 672], size: 74 },
  'hedron-crab': { at: [756, 866], size: 56 },
  'quest-for-the-gravelord': { at: [874, 486], size: 88 },
  'kabira-evangel': { at: [545, 730], size: 82 },
  'luminarch-ascension': { at: [718, 734], size: 86 },
}

// 비울 곳: 마을, 이름표, 인물과 그 이름, 표시 이름
keep(470, 524, 728, 668) // 카비라
keep(326, 512, 470, 538) // Kabira Crossroads 이름 (왼쪽)
keep(548, 236, 732, 266) // Agadeem
keep(540, 765, 790, 793) // Hedron Fields of Agadeem
keep(640, 616, 762, 640) // Kabira Conservatory
keep(500, 646, 592, 764) // Kabira Evangel + 이름 (이름 밑 풀포기가 글자에 닿지 않게)
keep(656, 640, 782, 768) // Luminarch Ascension + 이름
keep(768, 634, 862, 738) // Aether Figment + 이름
keep(718, 826, 800, 904) // Hedron Crab + 이름
keep(582, 798, 684, 916) // Cancel + 이름 (한국어 이름이 더 넓다)
keep(306, 552, 396, 646) // Steppe Lynx + 이름

// ---------------------------------------------------------------- 10. 헤드론 묘지를 펼친다
const knotAt = [866, 606]
const fieldItems = []
for (const [x, y, len, rot, sink] of GREAT) fieldItems.push({ y: y + len * 0.2, parts: lying(x, y, len, rot, sink, `g${x}`) })
for (const [x, y, rx, ry, tilt, th, s] of DISCS) fieldItems.push({ y: y + ry, parts: disc(x, y, rx, ry, tilt, th, s) })
fieldItems.push({ y: knotAt[1] + 26, parts: starKnot(knotAt[0], knotAt[1], 16, 26) })

// 작은 헤드론 점묘와 사바나 풀 — 협곡 남쪽 땅에만, 마을·이름·인물·길·큰 헤드론·원반을 비켜서. 큰 헤드론 둘레에 더 모인다
const nearBig = (x, y, pad) =>
  GREAT.some(([gx, gy, len]) => Math.hypot(x - gx, (y - gy) * 1.5) < len * 1.12 + pad) ||
  DISCS.some(([dx, dy, rx, ry, , th]) => Math.hypot((x - dx) / (rx + pad + 6), (y - dy - th * 0.5) / (ry + th + pad + 8)) < 1) ||
  Math.hypot(x - knotAt[0], (y - knotAt[1] - 12) * 0.85) < 36 + pad
const nearTrack = (x, y, pad) => [...TRACKS, NORTH_ROAD].some((t) => distToLine(x, y, t) < pad)
const southOfRavine = (x, y, pad) => y > rimS(Math.max(357, Math.min(905, x))) + pad || x > 912
const crowd = (x, y) => GREAT.reduce((a, [gx, gy, len]) => a + Math.exp(-(((x - gx) ** 2 + ((y - gy) * 1.6) ** 2) / (len * 3.2) ** 2)), 0)
let pebbles = ''
let tufts = ''
{
  const rand = rng('field-scatter')
  for (let gy = 470; gy < 1010; gy += 10) {
    for (let gx = 205; gx < 960; gx += 10) {
      const x = gx + (rand() - 0.5) * 9
      const y = gy + (rand() - 0.5) * 9
      const r = rand()
      const rl = rand()
      const rr = rand()
      if (!onLand(x, y, 9) || !southOfRavine(x, y, 6) || !clear(x, y, 3) || nearBig(x, y, 3) || nearTrack(x, y, 5)) continue
      // 카비라 남쪽·남동쪽이 가장 빽빽하고 바닷가로 갈수록 성기다 (서쪽 곶 밑동에 조금)
      const core = x > 520 && x < 890 && y > 640
      const armBase = x > 370 && x < 520 && y > 560
      let wgt = (core ? 0.09 : armBase ? 0.06 : 0.025) + Math.min(0.32, crowd(x, y) * 0.24)
      if (coastDist(x, y) < 34) wgt *= 0.5
      if (r < wgt * 0.85) {
        const len = 2 + rl * rl * 4.2
        pebbles += pebble(x, y, len, 64 + rr * 52)
      } else if (r > 0.958) {
        const s = 3.4 + rl * 2
        tufts += `M${pt([x - 1.4, y])}l${r1(-s * 0.35)} ${r1(-s * 0.72)}M${pt([x, y])}l0 ${r1(-s)}M${pt([x + 1.4, y])}l${r1(s * 0.35)} ${r1(-s * 0.72)}`
      }
    }
  }
}
const field = [P('stone', pebbles), P('hatch', pebbles + tufts)]

// ---------------------------------------------------------------- 11. 늪 기호 칸 — 협곡 북쪽 가장자리부터 섬 북쪽 끝까지 (세계 지도 agadeem-marsh), 바닷가 안쪽으로.
// 칸의 바깥 둘레는 기호 반 너비(약 28)만큼 바닷가 안쪽, 협곡 가장자리 위로 띄운다 (기호가 해안선·협곡에 걸치지 않게). Crypt 둘레(Marsh Flats
// 이름과 곁 웅덩이, 박쥐, 갈래·아치, Crypt 협곡, Crypt 이름 — 지도 칸을 줄였을 때의 큰 이름까지)는 둘레를 돌려 통째로 비우고, 그 동쪽 좁은 띠는
// Quest for the Gravelord 머리 위까지만 둔다. Quest for the Holy Relic 과 그 이름, 웅덩이 p2 도 둘레를 돌려 비우고(서쪽 바닷가 쪽 좁은 띠로
// 북쪽 칸과 협곡 곁 서쪽 칸을 잇는다), Agadeem 이름은 짝홀 구멍으로 비운다 (구멍과 둘레가 겹치지 않게)
const rimNorth = (x0, x1, lift) => RN.filter(([x]) => x >= x0 && x <= x1).map(([x, y]) => [x, y - lift])
const withHoles = (outer, holes) => [...outer, outer[0], ...holes.flatMap((h) => [...h, h[0], outer[0]])]
// 앱의 흩뿌리기는 다각형 상자의 왼쪽 위 모서리에서 기호 간격 5배마다 시작점을 하나씩 찾는데, 이 섬처럼 상자 대부분이 바다인 칸은 시작점이
// 모두 빗나가 통째로 빌 수 있다. 넓이 없는 가시 하나(나갔다 그대로 돌아오는 두 변 — 짝홀 판정에 영향이 없다)로 상자 모서리를 옮겨
// 시작점이 땅에 떨어지게 맞췄다 (SPIKE 는 앱과 같은 흩뿌리기를 돌려 고른 값 — 칸 모양을 바꾸면 다시 고른다)
const SPIKE = [374, 112]
const SWAMP_OUT = [
  [432, 432], SPIKE, [432, 432],
  [440, 405], [470, 396], [500, 372], [508, 330], [512, 295], [520, 262], [550, 240], [566, 200], [581, 160], [598, 122], [606, 110], [612, 140], [608, 168],
  [632, 198], [690, 226], [716, 222], [748, 258], [764, 292], [790, 326], [830, 338], [880, 342], [904, 346],
  [878, 352], [820, 356], [796, 360], [796, 304], [616, 304], [616, 326], [520, 326], [520, 384],
  [540, 384], [540, rimN(540) - 14],
  ...rimNorth(432, 538, 14).reverse(),
]
const SWAMP = withHoles(SWAMP_OUT, [
  [[562, 228], [700, 228], [726, 248], [726, 290], [556, 290], [552, 252]], // Agadeem
])

const parts = [
  ...ravine,
  ...canyon,
  ...marsh,
  ...crypt,
  ...field,
  ...tracks,
  ...stack([...fieldItems, ...town]),
]

CHILDMAPS.push({
  id: 'kabira',
  size: [1200, 1000],
  glyphScale: 4,
  terrain: [{ kind: 'swamp', points: SWAMP, density: 1.2 }],
  parts,
  labels: LABELS,
  // 페이즈2(WWK) 대상의 빈터 — 페이즈2 에서만 이 안에 밑동이 떨어지는 지형 기호를 뺀다 (STYLE.md)
  clearings: [
    { points: [[517, 124], [676, 124], [676, 242], [517, 242]], phase2: true }, // agadeem-occultist
  ],
  subjects: SUBJECTS,
  markAnchors: { kabira: 'right', 'card:kabira-crossroads': 'left', 'crypt-of-agadeem': 'left', 'card:marsh-flats': 'right' },
  focus: [720, 560],
})
