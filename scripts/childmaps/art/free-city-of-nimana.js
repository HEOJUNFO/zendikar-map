// 니마나의 자유도시 — 자식 지도 (굴 드라즈 남서 해안, 세계 범위 x 1442–1740 · y 1100–1325, ×4.443).
// 시점: Zendikar Rising(2020) 이후. 도시 자체를 묘사한 글은 Magic Story 'Hunger'(2020)뿐이라 그 모습 — 시장 거리, 거리 끝 용병
//       탐험가들의 천막, 그 둘레의 재건이 가장 더딘 무너진 집들(돌무더기는 치워졌다), 마을 가장자리의 야영지, 좌르로 가는 작은 배 —
//       을 그린다. 노예 시장·Septumvirate·House Ghet 는 2009·2016년 상태라 그리지 않는다(역사는 패널에만).
// 공식: 인간이 세운 해안 도시이자 주요 항구(PG: Guul Draz 2009), 인구 수천의 '도시라기엔 작은' 마을(Plane Shift 2016),
//       부두 노동자(Dock Keeper, AoM 2016), 시장 거리와 천막·무너진 집(Hunger 2020). Lake Jeft — 펠라카에서 남쪽으로 흐르는 강들이
//       드는 큰 민물 호수, 물풀과 녹조가 짙다(AoM). Lulea — 호수의 어두운 물가의 인어 정착지(AoM).
// 해석(공식 자리·모양 없음): 집들의 배치와 수, 동서로 난 시장 거리와 그 끝(땅 쪽 동쪽)의 천막·빈 집 껍데기·횃불, 만 머리와 양 기슭의
//       나무 잔교, 만 안의 작은 돛배 둘, Lulea 의 물가 오두막 몇 채, 호숫가의 갈대와 물풀, 남쪽 석호의 물웅덩이, 그림들의 자리.
//       성벽·문·망루·등대·회의당·학교·신전·노예 시장·흡혈귀 깃발·엘드라지 흔적·헤드론·길·다리는 그리지 않는다.
//       무너진 집들은 무엇에 무너졌는지 밝히지 않는다(흉터·백화 없음).
// 세계 지도의 바탕 지형(src/data/landscape/guul-draz.ts, 모두 추정)을 이 축척으로 따른다: nimana-river(만 머리로 드는 강 —
//       니마나와 잇는 이름·설명은 달지 않는다), pelakka-jeft-west·north(호수로 드는 두 강 — Hagra Cistern 지도에서 이어진다),
//       jeft-outflow-west·east(호수에서 석호를 지나 바다로), 펠라카 카르스트의 서쪽·남쪽 띠(협곡 기호), 하그라의 늪숲과 트인 늪,
//       남서쪽·니마나 동쪽의 정글(숲 기호), 남쪽 해안의 늪과 석호, 지열 늪의 김(hagra-steam-west).
// 세계 지도에만 있는 그림(Halo Hunter)은 이 지도에 그리지 않고 그 자리(1133,131)는 비워 둔다.
// 이름: 'Pelakka Karst'(한국어 '펠라카' — 펠라카 웜·펠라카 동굴 한국어판), 'Lake Jeft'(한국어판 없음). 도시와 Lulea 의 이름은
//       앱의 표시가 단다. 만·강·정글·석호·바다·거리·시장에는 이름을 달지 않는다.

const { line, poly, smooth, rng, offset, stack } = KIT
const r1 = (v) => Math.round(v * 10) / 10
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`
const P = (cls, d) => ({ cls, d })
const ell = (x, y, rx, ry) => `M${pt([x - rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x + rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x - rx, y])}Z`

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
const withHoles = (outer, holes) => [...outer, outer[0], ...holes.flatMap((h) => [...h, h[0], outer[0]])]

// ---------------------------------------------------------------- 세계 지도에서 온 자리 (context.mjs, 자식 좌표)
// 앱이 찍는 표시: 니마나의 자유도시 (365,270) — 시장 거리 서쪽 끝, 만 머리 바로 위. Lulea (1197,425) — 호수 남동쪽 물가 오두막들의 끝
/** 해안선 (앱이 그리는 그대로를 성기게) — 북쪽이 땅 */
const COAST = [[-27, 705], [-11, 709], [0, 707], [13, 708], [29, 713], [46, 719], [61, 723], [74, 724], [91, 727], [115, 734], [146, 745], [171, 751], [190, 751], [204, 748], [216, 747], [229, 748], [240, 751], [250, 757], [260, 763], [271, 772], [284, 786], [298, 800], [309, 810], [318, 815], [326, 817], [333, 817], [339, 815], [342, 801], [340, 777], [335, 748], [330, 727], [326, 714], [323, 695], [322, 664], [322, 622], [321, 579], [318, 538], [316, 496], [319, 449], [327, 397], [336, 355], [342, 331], [347, 324], [351, 320], [356, 318], [362, 321], [368, 333], [372, 354], [377, 379], [386, 406], [397, 433], [401, 458], [397, 480], [388, 500], [382, 518], [380, 534], [385, 551], [399, 573], [423, 597], [444, 616], [463, 630], [479, 638], [496, 644], [512, 647], [531, 652], [555, 664], [582, 680], [604, 692], [621, 699], [635, 704], [649, 711], [663, 723], [684, 739], [714, 758], [752, 779], [783, 791], [805, 793], [820, 789], [835, 788], [847, 789], [859, 793], [870, 799], [880, 807], [890, 820], [898, 837], [907, 856], [916, 871], [925, 885], [938, 896], [958, 905], [983, 913], [1007, 917], [1028, 917], [1048, 914], [1066, 915], [1082, 918], [1099, 920], [1116, 919], [1134, 915], [1155, 913], [1177, 914], [1200, 917], [1217, 917], [1231, 914], [1247, 911], [1269, 909], [1296, 907], [1320, 903], [1341, 896], [1352, 890]]
const LAND = [...COAST, [1800, 890], [1800, -1000], [-1000, -1000], [-1000, 705]]
/** Lake Jeft (세계 지도의 호수) */
const LAKE = [[1184, 330], [1178, 341], [1169, 351], [1154, 362], [1102, 384], [1069, 394], [1038, 399], [991, 403], [891, 404], [851, 399], [802, 391], [780, 384], [734, 365], [719, 356], [702, 336], [697, 326], [697, 320], [698, 314], [701, 307], [710, 298], [718, 290], [731, 282], [775, 265], [813, 253], [845, 248], [898, 243], [924, 243], [998, 245], [1038, 248], [1075, 255], [1102, 263], [1148, 281], [1154, 285], [1163, 291], [1177, 306], [1185, 319], [1185, 322], [1185, 328]]
const onLand = (x, y) => inPoly(x, y, LAND) && !inPoly(x, y, LAKE)

/** 세계 지도의 강 (guul-draz.ts) — 앱(landscape.ts shapeRivers)이 다듬은 물길의 점과 강폭 [x, y, 폭] 을 자식 좌표로 그대로.
 *  범위 가장자리 띠에서 세계 지도의 강과 겹쳐 바뀌므로 자리·폭이 같아야 이음매가 없다. 틀 밖에서 들어와 물에 닿는 곳에서 그친다 */
const RIVERS = {
  nimana: { samples: [[21.8,-37.5,4.03],[29.4,-26.6,4.09],[37.6,-16.2,4.15],[46.5,-6.4,4.21],[55.9,3,4.27],[65.6,12.1,4.32],[75.2,21.3,4.38],[84.3,31.1,4.44],[93.3,40.9,4.5],[102,50.9,4.56],[109.9,61.6,4.61],[117.8,72.2,4.67],[125.8,82.7,4.73],[133.9,93.4,4.79],[142.5,103.8,4.84],[151.8,113.6,4.9],[161.8,122.6,4.95],[171.9,131.3,5.01],[182.9,139.1,5.07],[194.6,145.6,5.12],[206,152.7,5.18],[216.5,161,5.23],[226.8,169.7,5.29],[236.6,178.9,5.34],[245.5,189,5.4],[253.3,199.9,5.45],[261.3,210.7,5.5],[270.4,220.4,5.56],[280,229.8,5.61],[288.6,240.1,5.67],[295.7,251.5,5.72],[302.1,263.2,5.77],[309,274.7,5.83],[316.2,285.9,5.88],[323.3,297.2,5.93],[330.4,308.4,5.98],[337.8,319.6,6.04],[345,330.8,6.09],[351.9,342.1,6.14],[358.8,353.6,6.19]] },
  jeftWest: { samples: [[572.4,-36.2,5.02],[577.4,-31.6,5.05],[582.3,-26.9,5.08],[586.9,-21.9,5.11],[591.3,-16.8,5.14],[595.5,-11.6,5.17],[599.5,-6.1,5.2],[603.4,-0.6,5.23],[606.8,5.2,5.25],[609.5,11.4,5.28],[611.7,17.9,5.31],[613.6,24.3,5.34],[615.7,30.8,5.37],[618.6,36.9,5.4],[621.9,42.7,5.43],[625.5,48.5,5.46],[629.1,54.1,5.48],[632.9,59.6,5.51],[636.8,65.1,5.54],[640.8,70.6,5.57],[644.9,75.9,5.6],[649,81.2,5.62],[653.3,86.4,5.65],[657.6,91.5,5.68],[662.1,96.5,5.71],[666.8,101.4,5.74],[671.7,105.9,5.76],[676.7,110.2,5.79],[681.7,114.6,5.82],[686.7,119.1,5.85],[691.3,124,5.88],[695.6,129.2,5.9],[699.2,134.7,5.93],[702.5,140.6,5.96],[705.6,146.5,5.99],[708.4,152.5,6.01],[711.2,158.6,6.04],[714.1,164.5,6.07],[716.9,170.5,6.1],[720,176.5,6.12],[723.1,182.4,6.15],[726.1,188.4,6.18],[728.9,194.4,6.21],[731.4,200.6,6.23],[733.5,207,6.26],[735.4,213.4,6.29],[737.2,219.8,6.32],[739,226.3,6.34],[740.9,232.6,6.37],[743.1,239,6.4],[745.4,245.2,6.42],[747.7,251.4,6.45],[750,257.7,6.48],[752.3,264,6.5],[754.5,270.3,6.53],[756.6,276.6,6.56],[758.7,282.9,6.58],[760.9,289.2,6.61],[762.9,295.5,6.64],[765,301.9,6.66]] },
  jeftNorth: { samples: [[986.8,-35.2,5.22],[983.4,-29.5,5.25],[979.9,-23.8,5.28],[976.5,-18.1,5.31],[973,-12.4,5.34],[969.4,-6.8,5.37],[966,-1.1,5.4],[962.7,4.7,5.43],[959.4,10.5,5.46],[956.1,16.3,5.49],[953.1,22.2,5.52],[950.3,28.2,5.55],[948,34.4,5.58],[946.6,40.8,5.61],[945.7,47.2,5.63],[945.4,53.7,5.66],[945.6,60.1,5.69],[946.1,66.5,5.72],[946.6,73,5.75],[947,79.6,5.78],[947.7,86.2,5.81],[948,93,5.84],[948.2,99.6,5.87],[948.5,106.2,5.9],[949,112.7,5.93],[949.8,119.3,5.96],[950.3,126.1,5.98],[950.3,132.9,6.01],[949.5,139.6,6.04],[947.9,146.2,6.07],[945.5,152.6,6.1],[942.7,158.7,6.13],[939.8,164.7,6.16],[937.3,170.8,6.19],[935.1,177,6.21],[933.4,183.4,6.24],[931.8,189.9,6.27],[930.4,196.4,6.3],[929.1,203,6.33],[928.3,209.6,6.36],[928,216.3,6.38],[928,223,6.41],[928.6,229.7,6.44],[929.5,236.3,6.47],[930.6,242.9,6.5],[931.6,249.5,6.52],[932.6,256.1,6.55],[933.4,262.7,6.58],[934.3,269.3,6.61],[935.1,276,6.64],[935.7,280.8,6.66]] },
  outWest: { samples: [[839.7,387.4,1.24],[836.5,400.4,1.52],[832.9,413.2,1.73],[829.2,426,1.91],[826.5,439,2.08],[825.5,452.2,2.25],[826.3,465.4,2.41],[828.4,478.4,2.56],[831.8,491.4,2.71],[836.5,503.7,2.85],[840.6,516.2,2.99],[843,529.3,3.13],[842.5,542.8,3.27],[838.3,555.7,3.4],[832.3,567.6,3.53],[827.6,580.2,3.66],[825.3,593.4,3.79],[824.9,606.7,3.92],[825.9,620,4.04],[828.3,633,4.16],[832,645.8,4.29],[834.2,659.1,4.41],[834.2,672.6,4.53],[832.1,685.9,4.65],[828.1,698.7,4.76],[822.1,710.6,4.88],[816.5,722.8,5],[813.1,735.9,5.11],[813.5,749.4,5.23],[816.5,762.5,5.34],[820.4,775.1,5.45],[823.5,788.1,5.56],[825.7,801.3,5.67],[827.7,814.6,5.78],[828.6,827.9,5.89],[828.6,841.2,6],[828.7,854.5,6.11],[829.1,867.3,6.22]], fromLake: true },
  outEast: { samples: [[1095.6,387.4,1.24],[1101.1,399.6,1.48],[1106.7,411.7,1.66],[1112.4,423.8,1.81],[1117.1,436.3,1.96],[1119.8,449.5,2.1],[1121,462.8,2.24],[1121.9,476.1,2.37],[1121.6,489.7,2.49],[1119.2,502.9,2.62],[1115.2,515.5,2.74],[1111.8,528.7,2.86],[1111.8,542.5,2.97],[1116.8,555.3,3.09],[1124.2,566.8,3.2],[1131.7,577.8,3.31],[1138.8,589,3.42],[1146.3,600.1,3.53],[1153.6,611.2,3.63],[1160.1,622.8,3.74],[1166.1,634.7,3.85],[1172.9,646.2,3.95],[1179.6,657.9,4.05],[1185.2,670.2,4.15],[1188.6,683.4,4.25],[1189.2,697,4.35],[1187.5,710.4,4.45],[1185.8,723.6,4.55],[1186.8,736.7,4.65],[1190.3,749.4,4.75],[1195.5,761.5,4.84],[1201.3,773.4,4.94],[1207.9,785.2,5.03],[1215.2,796.3,5.13],[1224.1,806.2,5.22],[1233.9,815.7,5.31],[1242.1,826.5,5.41],[1247.8,838.8,5.5],[1252.3,851.5,5.59],[1256.8,864.1,5.68],[1260.7,876.9,5.77],[1264,889.8,5.86],[1267.6,902.6,5.95],[1271.1,915.4,6.04],[1274.1,928.4,6.13],[1276.8,941.5,6.22]], fromLake: true },
}
for (const r of Object.values(RIVERS)) r.course = r.samples.map(([x, y]) => [x, y])

// ---------------------------------------------------------------- 그리기 도구 (KIT 에 없는 것)
/** 강 — 세계 지도의 물길 그대로. 물(바다·호수)에 닿는 곳에서 자르고 조금 밀어 넣는다 */
function riverParts({ samples, fromLake }) {
  let c = samples.map(([x, y]) => [x, y])
  let ws = samples.map((p) => p[2])
  // 물가의 정확한 자리 — 뭍(a)과 물(b) 사이를 반으로 나눠 찾는다
  const cross = (a, b) => {
    let [p, q] = [a, b]
    for (let k = 0; k < 14; k++) {
      const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
      if (onLand(m[0], m[1])) p = m
      else q = m
    }
    return q
  }
  let s = 0
  if (fromLake) while (s < c.length - 1 && !onLand(c[s][0], c[s][1])) s++
  let e = s + 1
  while (e < c.length && onLand(c[e][0], c[e][1])) e++
  const head = s > 0 ? [cross(c[s], c[s - 1])] : []
  const tail = e < c.length ? [cross(c[e - 1], c[e])] : []
  // 물속으로 조금 밀어 넣어 물가 선과 틈이 없게 (물가 선 굵기만큼)
  const push = (p, from) => {
    const L = Math.hypot(p[0] - from[0], p[1] - from[1]) || 1
    return [p[0] + ((p[0] - from[0]) / L) * 1.5, p[1] + ((p[1] - from[1]) / L) * 1.5]
  }
  const wHead = head.length ? [ws[s]] : []
  const wTail = tail.length ? [ws[e - 1]] : []
  c = [...head.map((p) => push(p, c[s])), ...c.slice(s, e), ...tail.map((p) => push(p, c[e - 1]))]
  ws = [...wHead, ...ws.slice(s, e), ...wTail]
  const W = (t) => ws[Math.round(t * (ws.length - 1))]
  const left = offset(c, (t) => W(t) / 2)
  const right = offset(c, (t) => -W(t) / 2)
  const body = line(left) + 'L' + line([...right].reverse()).slice(1) + 'Z'
  // 세계 지도의 강처럼 옅은 물빛 채움과 짙은 기슭 선 — 물가 쪽 끝은 기슭 선을 긋지 않는다
  return [P('sea', body), P('hatch', line(left) + line(right))]
}

/** 나무 잔교 — 기슭 (x0,y0) 에서 물 쪽 (x1,y1) 으로 뻗은 널판 다리, 가로 널 금과 물속 말뚝 */
function jetty(x0, y0, x1, y1, w = 6) {
  const len = Math.hypot(x1 - x0, y1 - y0)
  const ux = (x1 - x0) / len
  const uy = (y1 - y0) / len
  const nx = -uy * (w / 2)
  const ny = ux * (w / 2)
  const deck = poly([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]])
  let planks = ''
  for (let s = 3.2; s < len - 1; s += 3.2) {
    const px = x0 + ux * s
    const py = y0 + uy * s
    planks += line([[px + nx, py + ny], [px - nx, py - ny]])
  }
  // 말뚝 — 아래쪽 가장자리 밑으로 짧게
  let piles = ''
  for (let s = len * 0.3; s <= len; s += len * 0.35) {
    const px = x0 + ux * s
    const py = y0 + uy * s
    const lo = ny > 0 ? [px + nx, py + ny] : [px - nx, py - ny]
    piles += line([lo, [lo[0], lo[1] + 3.2]])
  }
  return [P('fill', deck), P('hatch', planks), P('ink', deck + piles)]
}

/** 작은 돛배 — (x, y) 는 물에 닿은 배 밑 가운데. L 은 배 길이, dir 은 이물 방향(1 = 오른쪽), furled 면 돛을 내린 배 */
function boat(x, y, L, dir = 1, furled = false) {
  const d = dir
  const bow = [x + d * L * 0.52, y - L * 0.2]
  const stern = [x - d * L * 0.46, y - L * 0.16]
  const hull = `M${pt(stern)}L${pt(bow)}Q${pt([x + d * L * 0.32, y + L * 0.02])} ${pt([x + d * L * 0.08, y])}L${pt([x - d * L * 0.3, y])}Q${pt([x - d * L * 0.44, y - L * 0.04])} ${pt(stern)}Z`
  const shadeHull = `M${pt([x - d * L * 0.3, y])}L${pt([x + d * L * 0.08, y])}Q${pt([x + d * L * 0.32, y + L * 0.02])} ${pt(bow)}L${pt([x + d * L * 0.36, y - L * 0.1])}L${pt([x - d * L * 0.36, y - L * 0.08])}Z`
  const mx = x - d * L * 0.02
  const mast = line([[mx, y - L * 0.17], [mx, y - L * 1.02]])
  const out = [P('fill', hull), P('shade', shadeHull)]
  let ink = hull + mast
  if (furled) {
    // 내린 돛 — 활대에 감긴 돛
    const boom = poly([[mx - d * L * 0.02, y - L * 0.3], [mx - d * L * 0.4, y - L * 0.27], [mx - d * L * 0.4, y - L * 0.33], [mx - d * L * 0.02, y - L * 0.36]])
    out.push(P('fill', boom))
    ink += boom + line([[mx, y - L * 1.0], [x + d * L * 0.5, y - L * 0.22]])
  } else {
    // 바람을 받은 세모 돛 하나와 작은 앞돛
    const sail = `M${pt([mx + d * 1, y - L * 0.98])}Q${pt([mx + d * L * 0.5, y - L * 0.62])} ${pt([mx + d * L * 0.42, y - L * 0.24])}L${pt([mx + d * 1, y - L * 0.24])}Z`
    const jib = poly([[mx - d * 1.2, y - L * 0.9], [mx - d * L * 0.36, y - L * 0.22], [mx - d * 1.2, y - L * 0.24]])
    let seams = ''
    for (const t of [0.4, 0.68]) seams += line([[mx + d * 1, y - L * (0.98 - 0.74 * t)], [mx + d * L * 0.36 * (0.45 + t * 0.5), y - L * (0.98 - 0.74 * t) + L * 0.06]])
    out.push(P('fill', sail + jib), P('shade', jib), P('hatch', seams))
    ink += sail + jib
  }
  out.push(P('hatch', line([[x - d * L * 0.4, y - L * 0.12], [x + d * L * 0.46, y - L * 0.15]])))
  out.push(P('ink', ink))
  // 배 밑 잔물결
  out.push(P('sea-ink', `M${pt([x - L * 0.7, y + 2.6])}Q${pt([x - L * 0.45, y + 1.4])} ${pt([x - L * 0.2, y + 2.6])}M${pt([x + L * 0.25, y + 2.8])}Q${pt([x + L * 0.5, y + 1.6])} ${pt([x + L * 0.75, y + 2.8])}`))
  return out
}

/** 천막 — 옆에서 본 두 기둥 천막(앞면 세모, 그늘진 옆면, 어두운 입구). big 이면 둥근 등의 큰 천막 */
function tent(x, y, w, h, big = false, seed = 't') {
  const rand = rng(seed)
  const L = x - w / 2
  const R = x + w / 2
  let body
  let shade
  if (big) {
    body = `M${pt([L, y])}L${pt([L + w * 0.08, y - h * 0.45])}Q${pt([x - w * 0.18, y - h * 1.08])} ${pt([x, y - h])}Q${pt([x + w * 0.18, y - h * 1.08])} ${pt([R - w * 0.08, y - h * 0.45])}L${pt([R, y])}Z`
    shade = `M${pt([x + w * 0.12, y])}L${pt([x + w * 0.04, y - h * 0.98])}Q${pt([x + w * 0.18, y - h * 1.08])} ${pt([R - w * 0.08, y - h * 0.45])}L${pt([R, y])}Z`
  } else {
    body = poly([[L, y], [x - w * 0.06, y - h], [x + w * 0.06, y - h], [R, y]])
    shade = poly([[x + w * 0.08, y], [x + w * 0.06, y - h], [R, y]])
  }
  const door = poly([[x - w * 0.1, y], [x - w * 0.02, y - h * 0.55], [x + w * 0.06, y]])
  let hatch = ''
  for (let k = 1; k <= 2; k++) {
    const t = k / 3
    hatch += line([[x + w * 0.12 + (R - x - w * 0.12) * t, y - 1], [x + w * 0.06 + (R - x - w * 0.12) * t * 0.55, y - h * (0.85 - t * 0.5)]])
  }
  const pole = line([[x, y - h], [x + (rand() - 0.5) * 1.5, y - h - 4.5]])
  // 버팀줄과 말뚝
  const guy = line([[L + w * 0.06, y - h * 0.3], [L - w * 0.22, y + 1]]) + line([[R - w * 0.06, y - h * 0.3], [R + w * 0.22, y + 1]])
  return [P('fill', body), P('shade', shade), P('hatch', hatch + guy), P('dark', door), P('ink', body + pole)]
}

/** 지붕이 무너진 집 껍데기 — 벽만 선 빈 집, 뚫린 창과 문. 돌무더기는 치워졌다(Hunger). (x, y) 는 밑 가운데 */
function shell(x, y, w, h, seed) {
  const rand = rng(seed)
  const L = x - w / 2
  const R = x + w / 2
  // 왼쪽 박공 끝이 반쯤 남고 오른쪽으로 갈수록 무너진 윗선
  const top = [[L, y - h], [L + w * 0.18, y - h - w * 0.22]]
  const n = 5
  for (let k = 1; k <= n; k++) {
    const t = k / n
    top.push([L + w * 0.18 + (w * 0.82 * t), y - h * (1 - t * 0.45) + (rand() - 0.5) * h * 0.35])
  }
  const outline = poly([[L, y], ...top, [R, y]])
  const side = poly([[x + w * 0.22, y], [x + w * 0.22, top[3][1] + 1], ...top.slice(4), [R, y]])
  let hatch = ''
  for (const t of [0.5, 0.78]) hatch += line([[x + w * 0.22 + (R - x - w * 0.22) * t, y - 1.5], [x + w * 0.22 + (R - x - w * 0.22) * t, y - h * 0.48]])
  // 뚫린 창 둘과 문 하나 — 안이 비어 어둡다
  const holes =
    poly([[L + w * 0.12, y - h * 0.7], [L + w * 0.26, y - h * 0.7], [L + w * 0.26, y - h * 0.45], [L + w * 0.12, y - h * 0.45]]) +
    poly([[x + w * 0.02, y - h * 0.62], [x + w * 0.16, y - h * 0.62], [x + w * 0.16, y - h * 0.4], [x + w * 0.02, y - h * 0.4]]) +
    poly([[x - w * 0.16, y], [x - w * 0.16, y - h * 0.48], [x - w * 0.04, y - h * 0.48], [x - w * 0.04, y]])
  return [P('stone', outline), P('shade', side), P('hatch', hatch), P('dark', holes), P('ink', outline)]
}

/** 횃불 기둥 — 'in the shared dim light of torches' */
function torch(x, y, h = 16) {
  const flame = `M${pt([x, y - h - 7])}Q${pt([x + 3.2, y - h - 2.5])} ${pt([x + 1.6, y - h])}L${pt([x - 1.6, y - h])}Q${pt([x - 3, y - h - 3])} ${pt([x, y - h - 7])}Z`
  const cup = poly([[x - 2, y - h], [x + 2, y - h], [x + 1.2, y - h + 2.4], [x - 1.2, y - h + 2.4]])
  return [P('fire', flame), P('fill', cup), P('fire-ink', flame), P('ink', line([[x, y], [x, y - h + 2.4]]) + cup)]
}

/** 노점 — 두 기둥 위 천 차양과 낮은 판대 (Affa 지도와 같은 손) */
function stall(x, y, w, striped) {
  const h = w * 0.62
  const L = x - w / 2
  const R = x + w / 2
  const awn = poly([[L - 2, y - h * 0.62], [L + 1.5, y - h], [R + 1.5, y - h], [R + 2, y - h * 0.62]])
  let scal = `M${pt([L - 2, y - h * 0.62])}`
  for (let k = 0; k < 4; k++) {
    const a = L - 2 + ((w + 4) * k) / 4
    const b = L - 2 + ((w + 4) * (k + 1)) / 4
    scal += `Q${pt([(a + b) / 2, y - h * 0.62 + 3])} ${pt([b, y - h * 0.62])}`
  }
  const counter = poly([[L, y], [L, y - h * 0.3], [R, y - h * 0.3], [R, y]])
  const posts = line([[L + 1, y - h * 0.3], [L + 1, y - h * 0.62]]) + line([[R - 1, y - h * 0.3], [R - 1, y - h * 0.62]])
  let stripes = ''
  if (striped) for (let k = 1; k < 4; k++) stripes += line([[L - 2 + ((w + 4) * k) / 4 + 0.6, y - h * 0.62], [L + 1.5 + (w * k) / 4, y - h]])
  return [P('fill', awn + counter), P('shade', awn), P('hatch', stripes + line([[x + w * 0.2, y - h * 0.28], [x + w * 0.2, y - 1]])), P('ink', awn + scal + counter + posts)]
}
function barrel(x, y, s = 4) {
  const d = `M${pt([x - s / 2, y])}L${pt([x - s / 2 - 0.4, y - s * 0.6])}L${pt([x - s / 2, y - s * 1.2])}L${pt([x + s / 2, y - s * 1.2])}L${pt([x + s / 2 + 0.4, y - s * 0.6])}L${pt([x + s / 2, y])}Z`
  return [P('fill', d), P('hatch', line([[x - s / 2, y - s * 0.6], [x + s / 2, y - s * 0.6]])), P('ink', d)]
}
function crate(x, y, s = 5) {
  const d = poly([[x - s / 2, y - s], [x + s / 2, y - s], [x + s / 2, y], [x - s / 2, y]])
  return [P('fill', d), P('hatch', line([[x - s / 2, y - s], [x + s / 2, y]])), P('ink', d)]
}

/** 물가 오두막 (Lulea) — 낮은 둥근 지붕, stilts 면 물 위에 말뚝을 박은 마루 위에 */
function hut(x, y, w, stilts = false) {
  const h = w * 0.5
  const base = stilts ? y - 6 : y
  const ps = KIT.house(x, base, w, h, { roof: 'dome', roofH: w * 0.36, door: true })
  if (!stilts) return ps
  const deck = poly([[x - w * 0.7, base], [x + w * 0.7, base], [x + w * 0.7, base + 1.8], [x - w * 0.7, base + 1.8]])
  let piles = ''
  for (const k of [-0.6, -0.2, 0.2, 0.6]) piles += line([[x + w * k, base + 1.8], [x + w * k, y + 1]])
  const rip = `M${pt([x - w * 0.8, y + 2])}Q${pt([x - w * 0.5, y + 0.6])} ${pt([x - w * 0.2, y + 2])}M${pt([x + w * 0.2, y + 2])}Q${pt([x + w * 0.5, y + 0.6])} ${pt([x + w * 0.8, y + 2])}`
  return [P('fill', deck), P('ink', deck + piles), P('sea-ink', rip), ...ps]
}

/** 갈대 한 포기 — 세 가닥 */
const reed = ([x, y], s = 7) => line([[x - s * 0.45, y - s * 0.75], [x - s * 0.1, y]]) + line([[x, y - s], [x, y]]) + line([[x + s * 0.5, y - s * 0.7], [x + s * 0.12, y]])
/** 물풀·녹조 — 물 위에 떠 있는 짧은 물결 획 몇 개 ('thick with weeds and algae') */
const weed = ([x, y], s = 6) => `M${pt([x - s, y])}Q${pt([x - s / 2, y - s * 0.3])} ${pt([x, y])}T${pt([x + s, y])}M${pt([x - s * 0.5, y + s * 0.45])}Q${pt([x - s * 0.1, y + s * 0.2])} ${pt([x + s * 0.35, y + s * 0.45])}`

/** 지열 늪의 김 — 세계 지도 'geyser' 기호를 이 축척으로 (뜨거운 웅덩이와 오르는 김 세 가닥) */
function steamVent(x, y, k = 4.4) {
  const C = (pts) => smooth(pts.map(([u, v]) => [x + u * k, y + v * k]))
  const smoke = C([[-0.2, -0.8], [0.3, -3.4], [-0.4, -6.6], [0.8, -9.4], [0.4, -12]]) + C([[-1.8, -0.6], [-2.4, -3], [-1.8, -5.4], [-2.6, -7.6], [-2.2, -9]]) + C([[1.6, -0.6], [2.2, -2.8], [1.8, -5], [2.8, -7], [2.6, -8.4]])
  let dots = ''
  for (const [u, v] of [[-4.6, 0.4], [4.5, -0.2], [-3.2, 1.9], [3.4, 1.8], [0.3, 2.2]]) dots += ell(x + u * k, y + v * k, 0.9, 0.9)
  return [P('sea', ell(x, y, 3.6 * k, 1.4 * k)), P('sea-ink', ell(x, y, 3.6 * k, 1.4 * k)), P('hatch', smoke + dots)]
}

// ---------------------------------------------------------------- 그림 모으기
const parts = []
// 1. 물길 — 강 다섯 (세계 지도의 물길)
for (const k of ['nimana', 'jeftWest', 'jeftNorth', 'outWest', 'outEast']) parts.push(...riverParts(RIVERS[k]))

// 남쪽 석호 — 늪 사이에 고인 얕은 물 몇 곳 (jeft-delta-lagoons, 'vast marshes and lagoons')
const LAGOON_POOLS = [
  [940, 650, 28, 8], [1050, 722, 30, 9], [975, 795, 24, 8], [1110, 830, 28, 9], [1290, 672, 20, 7], [1306, 752, 18, 6],
]
{
  const rand = rng('lagoons')
  let reeds = ''
  for (const [x, y, rx, ry] of LAGOON_POOLS) {
    // 둥글지 않게 — 테두리 점을 조금씩 흔든다
    const ring = []
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2
      const f = 0.82 + rand() * 0.3
      ring.push([x + Math.cos(a) * rx * f, y + Math.sin(a) * ry * f])
    }
    parts.push(...KIT.pool(ring, { ripples: false }), ...KIT.ripples(x, y, rx * 0.55, 2, `lr${x}`))
    // 물가의 갈대 몇 포기
    for (const sgn of [-1, 1]) reeds += reed([x + sgn * (rx + 3 + rand() * 4), y + ry * 0.4], 8 + rand() * 3)
  }
  parts.push(P('hatch', reeds))
}

// 지열 늪의 김 (hagra-steam-west) — 위 가장자리
parts.push(...steamVent(1202, 30))

// 2. 땅 위에 선 것들 — 뒤(위)에서 앞(아래)으로
const items = []
const add = (y, p) => items.push({ y, parts: p })

// --- 니마나 — 시장 거리(동서, y≈270–300)를 사이에 둔 집들. 표시는 거리 서쪽 끝, 이름은 거리 위 빈 자리에 놓인다.
// 줄마다 [밑 y, 서쪽 끝 x, 동쪽 끝 x, 채움 비율] — 집 크기·지붕·틈은 rng 로 조금씩 다르게 (인구 수천의 작은 항구, 말라키르보다 수수하게)
const ROWS = [
  [190, 330, 520, 0.7], // 북쪽 셋째 줄 (카르스트 기슭)
  [220, 300, 552, 0.92], // 북쪽 둘째 줄
  [250, 316, 556, 1], // 북쪽 첫째 줄 — 거리에 면한 집들
  [336, 430, 548, 1], // 남쪽 첫째 줄 — 거리에 면한 집들 (서쪽 끝은 부두 창고)
  [366, 412, 540, 0.9], // 남쪽 둘째 줄 (정글 앞)
]
{
  const rand = rng('town')
  for (const [y0, x0, x1, fill] of ROWS) {
    let x = x0
    while (x < x1) {
      const w = 27 + rand() * 9
      const tall = rand() < 0.18
      const h = (tall ? 25 : 17) + rand() * 5
      const r = rand()
      const roof = r < 0.46 ? 'gable' : r < 0.84 ? 'hip' : 'flat'
      const y = y0 + (rand() - 0.5) * 4
      const skip = rand() > fill
      if (!skip && x + w <= x1 + 8) {
        const cx = x + w / 2
        const roofH = roof === 'hip' ? w * 0.34 : roof === 'gable' ? w * 0.42 : 0
        const ps = KIT.house(cx, y, w, h, { roof, roofH, door: rand() < 0.7 })
        if (roof === 'flat') ps.push(P('ink', line([[cx - w / 2, y - h + 2.2], [cx + w / 2, y - h + 2.2]])))
        // 높은 집의 위층 창 둘
        if (tall) ps.splice(ps.length - 1, 0, P('dark', poly([[cx - w * 0.3, y - h * 0.78], [cx - w * 0.18, y - h * 0.78], [cx - w * 0.18, y - h * 0.62], [cx - w * 0.3, y - h * 0.62]]) + poly([[cx + w * 0.02, y - h * 0.78], [cx + w * 0.14, y - h * 0.78], [cx + w * 0.14, y - h * 0.62], [cx + w * 0.02, y - h * 0.62]])))
        add(y, ps)
      }
      x += w + 3 + rand() * 5
    }
  }
  // 부두 창고 — 만 머리 동쪽 기슭, 거리 남쪽 끝의 긴 모임지붕 집 둘
  add(332, KIT.house(408, 334, 38, 19, { roof: 'hip', roofH: 13, door: true }))
  add(362, KIT.house(400, 364, 24, 16, { roof: 'gable', roofH: 10, door: false }))
  // 만 서쪽 기슭의 작은 집 둘
  add(352, KIT.house(312, 352, 18, 12, { roof: 'gable', roofH: 7.5 }))
  add(380, KIT.house(306, 382, 16, 11, { roof: 'hip', roofH: 5.5 }))
}

// 부두 — 만 머리의 나무 둔치와 양 기슭의 잔교 ('the major port', Dock Keeper 의 부두 노동자)
add(318, [
  ...jetty(364, 324, 342, 320, 7), // 만 머리를 가로지르는 둔치
])
add(345, jetty(372, 345, 352, 349, 6))
add(388, jetty(381, 388, 360, 393, 6))
add(430, jetty(398, 432, 376, 438, 6))
add(372, jetty(332, 372, 349, 375, 5))
add(420, jetty(322, 420, 339, 424, 5))
// 부두 마당의 통과 상자
add(312, [...barrel(378, 312, 4.4), ...barrel(384, 313, 4), ...crate(392, 312, 5), ...crate(371, 313, 4.5)])
// 만 안의 작은 돛배 둘 — 잔교에 맨 배 하나, 만을 나가는 배 하나 (Hunger 의 좌르행 'small vessel')
add(452, boat(368, 452, 28, -1, true))
add(560, boat(352, 562, 36, -1, false))

// 시장 — 거리 동쪽의 노점 (이름 없음)
add(298, stall(540, 298, 16, true))
add(296, stall(562, 296, 15, false))
add(300, [...barrel(552, 300, 4), ...crate(574, 300, 4.5)])

// 거리 끝 — 재건이 가장 더딘 곳: 지붕 없는 집 껍데기(돌무더기는 치워진 빈터), 용병들의 천막, 횃불
add(242, shell(574, 242, 22, 15, 's1'))
add(236, shell(602, 236, 20, 14, 's2'))
add(340, shell(572, 340, 20, 14, 's3'))
const TENTS = [
  [596, 306, 22, 17, true], [620, 262, 18, 14, false], [650, 252, 16, 12, false], [680, 266, 20, 15, true],
]
TENTS.forEach(([x, y, w, h, big], i) => add(y, tent(x, y, w, h, big, `tent${i}`)))
add(314, torch(574, 314, 14))
add(262, torch(704, 262, 15))
add(250, torch(632, 248, 13))

// Lulea — 호수 남동쪽 물가의 오두막 몇 채 (말뚝 위 둘, 뭍에 셋). 표시는 무리의 남동쪽 끝에
add(372, hut(1144, 374, 16, true))
add(366, hut(1164, 366, 15, true))
add(392, hut(1178, 394, 15))
add(408, hut(1158, 408, 14))
add(416, hut(1188, 416, 13))

// 호숫가 — 갈대(물가 안쪽 땅에)와 물풀(물 위). 강 어귀·오두막·그림·이름 자리는 비운다
{
  const rand = rng('shore')
  let reeds = ''
  let weeds = ''
  const ring = dense(LAKE, true, 4)
  const cx = 941
  const cy = 323
  ring.forEach(([x, y], i) => {
    if (i % 4) return
    const dx = x - cx
    const dy = y - cy
    const L = Math.hypot(dx, dy)
    const out = [x + (dx / L) * (6 + rand() * 8), y + (dy / L) * (5 + rand() * 6)]
    const inn = [x - (dx / L) * (14 + rand() * 18), y - (dy / L) * (8 + rand() * 10)]
    const nearRiver = ['jeftWest', 'jeftNorth', 'outWest', 'outEast'].some((k) => distTo(RIVERS[k].course, [x, y]) < 22)
    const nearHuts = Math.hypot(x - 1160, y - 372) < 40
    const nearCosi = x > 1150 && y < 345 && y > 290
    if (!nearRiver && !nearHuts && !nearCosi && rand() < 0.7) reeds += reed(out, 8 + rand() * 4) + reed([out[0] + 6, out[1] + 1.5], 6 + rand() * 3)
    if (!nearRiver && rand() < 0.8 && Math.abs(inn[0] - cx) > 120) weeds += weed(inn, 6 + rand() * 3) + (rand() < 0.5 ? weed([inn[0] + 9, inn[1] + 5], 4.5) : '')
  })
  // Lulea 오두막 둘레의 어두운 물가 — 갈대 몇 포기
  for (const q of [[1128, 392], [1206, 384], [1140, 420], [1172, 428], [1214, 402]]) reeds += reed(q, 8 + rand() * 3)
  parts.push(P('hatch', reeds), P('sea-ink', weeds))
}

parts.push(...stack(items))

// ---------------------------------------------------------------- 지형 기호 (세계 지도의 칸을 이 축척으로)
// 기호가 강물·석호·바다 위에 얹히지 않게: 강은 칸에 좁은 홈(slot)을 파서 비우고, 석호 웅덩이는 구멍으로 비우고,
// 해안·만 기슭에서는 칸 가장자리를 물가에서 기호 크기만큼 안으로 들인다.
/** 강 물길을 따라 칸 밖으로 남기는 홈 — 물길의 [y0, y1] 구간을 half 만큼 양쪽으로. [한쪽 기슭 위→아래, 다른 기슭 아래→위] */
function slot(course, y0, y1, half) {
  const c = dense(course, false, 10).filter(([, y]) => y >= y0 && y <= y1)
  const a = offset(c, half)
  const b = offset(c, -half)
  return { a, b }
}
/** 웅덩이 둘레의 구멍 — 기호(늪 풀포기 폭 ±28, 위 26·아래 10)가 물 위에 얹히지 않을 만큼 */
const poolHole = ([x, y, rx, ry]) => [[x - rx - 30, y - ry - 12], [x + rx + 30, y - ry - 12], [x + rx + 30, y + ry + 28], [x - rx - 30, y + ry + 28]]
const NIM = slot(RIVERS.nimana.course, -260, 158, 38)
const JN = slot(RIVERS.jeftNorth.course, -175, 182, 34)
const OW = slot(RIVERS.outWest.course, 600, 790, 38)
const OE = slot(RIVERS.outEast.course, 596, 895, 38)
// 하그라 늪숲 — 남서쪽 가장자리는 pelakka-jeft-west 동쪽 기슭을 따라 들이고, pelakka-jeft-north 는 홈으로 비운다
const SWAMP_FOREST = [[400, -900], [1150, -900], [1100, 46], [1042, 131], [992, 172], ...[...JN.a].reverse(), ...JN.b, [890, 196], [840, 197], [770, 165], [738, 112], [672, 48], [628, -30], [560, -90], [470, -160]]
const FIELD = {
  // 펠라카 카르스트 서쪽 띠 — 왼쪽 위. 마을 위(x 330–585)에서는 y 44–62 까지만 (들쭉날쭉하게) 내려와 Pelakka Karst 이름과 마을 지붕 사이를 비우고,
  // nimana-river 는 홈으로 비운다
  karstW: { kind: 'canyon', points: [[-700, -700], [330, -700], [390, -120], [445, 14], [540, 34], [600, 44], [575, 56], [540, 48], [505, 58], [470, 52], [430, 60], [392, 54], [352, 62], [330, 56], [300, 112], [253, 142], ...[...NIM.a].reverse(), ...NIM.b, [93, 128], [-700, 70]], density: 0.9 },
  // 하그라의 늪숲 (hagra-swamp-forest-west) — 위 가운데. 자식 지도 기호에 맹그로브가 없어 Hagra Cistern 지도처럼 숲과 늪 기호를 섞는다.
  // 밀도는 세계 지도 맹그로브 칸(10g 포아송, 열에 여섯이 나무)과 같은 나무·풀포기 간격이 되게
  swampForest: { kind: 'forest', points: SWAMP_FOREST, density: 0.25 },
  swampForestMarsh: { kind: 'swamp', points: SWAMP_FOREST, density: 0.9 },
  // 하그라 늪의 트인 늪 — 오른쪽 위 (세계 지도의 장소 범위 늪과 같은 15g 간격)
  hagraOpen: { kind: 'swamp', points: [[1100, -420], [1700, -420], [1700, 180], [1420, 178], [1300, 172], [1200, 163], [1112, 148], [1104, 46]], density: 1 },
  // 펠라카 카르스트 남쪽 띠 — 오른쪽 가장자리 (Cosi's Trickster 와 Lulea 이름 자리는 비운다)
  karstS: { kind: 'canyon', points: [[1180, 205], [1280, 210], [1440, 214], [2100, 200], [2100, 900], [1440, 660], [1350, 570], [1300, 480], [1284, 400], [1272, 320], [1262, 240]], density: 0.85 },
  // 남서쪽 해안의 정글 — 만 서쪽. 해안·만 서쪽 기슭에서 기호 크기만큼 들인다
  jungleSW: { kind: 'forest', points: [[-120, 110], [93, 196], [147, 210], [189, 232], [232, 256], [262, 288], [274, 322], [272, 366], [270, 409], [278, 451], [278, 505], [283, 553], [288, 606], [292, 660], [296, 712], [298, 748], [282, 764], [262, 746], [240, 733], [204, 728], [170, 730], [146, 724], [115, 713], [90, 706], [60, 701], [29, 692], [0, 686], [-120, 684]], density: 0.4 },
  // 니마나 동쪽 해안의 정글 — 만과 서쪽 물길 사이. 마을 남쪽 둔덕과 Vampire's Bite 자리(그림과 이름을 둘러 굽은 숲 가장자리 — 네모로 도려내지 않는다)와
  // Nimana Sell-Sword 이름 밑은 비우고, 해안·만 동쪽 기슭·jeft-outflow-west 에서 들인다
  jungleE: { kind: 'forest', points: [[548, 404], [600, 414], [660, 418], [701, 441], [733, 473], [754, 505], [762, 558], [776, 601], [786, 650], [784, 700], [772, 738], [760, 752], [725, 737], [674, 702], [632, 678], [593, 659], [542, 631], [507, 623], [474, 617], [452, 598], [432, 578], [414, 553], [412, 534], [428, 526], [452, 516], [482, 514], [512, 508], [532, 488], [541, 458], [543, 428]], density: 0.4 },
  // 남쪽 해안의 늪과 석호 — 두 물길(jeft-outflow-west·east) 사이와 동쪽의 두 덩이. 물길 기슭과 해안에서 들이고, 웅덩이는 구멍으로 비운다
  lagoons: { kind: 'swamp', points: withHoles(
    [[866, 579], [973, 558], [1060, 566], ...OE.b, [1200, 900], [1150, 898], [1100, 905], [1050, 899], [1000, 902], [975, 898], [950, 890], [925, 870], [900, 823], [875, 785], ...[...OW.a].reverse()],
    [[...OE.a, [1250, 897], [1300, 893], [1340, 880], [1700, 880], [1700, 640], [1330, 640], [1224, 601]], ...LAGOON_POOLS.map(poolHole)],
  ), density: 0.65 },
}
const FIELD_ORDER = ['karstW', 'swampForest', 'swampForestMarsh', 'hagraOpen', 'karstS', 'jungleSW', 'jungleE', 'lagoons']

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
  id: 'free-city-of-nimana',
  size: [1324, 1000],
  glyphScale: 4,
  terrain: FIELD_ORDER.map((k) => FIELD[k]),
  parts: compact(parts),
  labels: [
    { text: 'Pelakka Karst', textKo: '펠라카', at: [455, 100], size: 28, kind: 'area' },
    { text: 'Lake Jeft', at: [935, 326], size: 30, kind: 'water' },
  ],
  subjects: {
    // 거리 끝 용병 천막들 사이 빈터 — 서쪽(마을 쪽)을 보고 선다
    'nimana-sell-sword': { at: [644, 358], size: 90, flip: true },
    // 마을 남동쪽, 만 동쪽 기슭 정글 가장자리의 빈터 — 북서쪽 마을을 향해 덤벼든다
    'vampires-bite': { at: [470, 474], size: 90, flip: true },
    // Lake Jeft 동쪽 끝 물가, Lulea 북쪽 — 서쪽 호수의 소용돌이를 본다
    'cosis-trickster': { at: [1222, 318], size: 90, flip: true },
  },
  markAnchors: { 'free-city-of-nimana': 'right', lulea: 'right' },
  focus: [515, 340],
})
