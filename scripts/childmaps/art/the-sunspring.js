// The Sunspring — 자식 지도 (타짐 서쪽 해안, 세계 범위 x 680–868 · y 505–664, ×6.287).
// 왼쪽에서 오른쪽으로 아트북(The Art of Magic: Zendikar, 2016)의 차례 그대로 — 바다 → 방해석 모래 평원 Calcite Flats →
// 갑자기 솟는 바위 고리 The Bulwark → 그 안쪽의 숲 오란리프. 세계 지도와 같은 해안·숲 빛깔·산 띠·지류 물길을 큰 축척으로 옮겼다.
// 공식 묘사를 따른 것: Sunspring 은 Calcite Flats 의 외딴 곳, 우뚝 솟은 Bulwark 아래의 흰 대리석 샘이고, 이끼 낀 큰 돌독수리가
// 샘 위에 얹혀 그 발치로 물이 넘친다(아트북). 둘레에는 바위 노두가 없고 땅이 무르다. 노두는 평원 곳곳에 솟은, 나무가 자라는
// 바위 덩어리다. 헤드론은 평원 위로 나오지 않고 가끔 하나가 떨어져 모래에 박힌다. Bulwark 의 성벽은 거의 다 닳았고 망루는
// 빈 껍데기로 남았다. 오란리프는 페이즈를 끈 지도(2020년 이후)에서 살아 있는 숲(Umara Skyfalls, ZNR)이다 — 사가2 페이즈2 는 아래 '페이즈별 모습'.
// 해석(공식 자리·모양 없음): 샘 자리(세계 지도의 추정), 샘 그릇·받침·독수리 자세와 옅은 초록 빛, 벼랑 면의 선, 성벽 토막과
// 망루 껍데기의 자리, 노두·무른 땅·떨어진 헤드론의 자리, 오란리프의 산호 바위(가시 탑·뿌리 감긴 아치), 여덟 그림의 자리.
// Dread Statuary 자리는 표시만 — 플레이버대로 '걸어가 버린' 석상이라 아무것도 그리지 않는다.
//
// 페이즈별 모습 — 바뀌는 것은 오란리프뿐이다.
// · 사가2 페이즈2(OGW, 2016 초): 오란리프는 죽은 숲이다 — My Favorite Flavor: Ruins of Oran-Rief(Chas Andres, 2015-12-29, OGW 카드를 소개하는
//   공식 칼럼): "Oran-Rief is dead now. The trees are gone. The creatures are gone. The rocks are brittle and chalky. The Eldrazi sucked
//   the land dry." 세계 지도의 페이즈 바탕(src/data/periods/tazeem.ts 'oran-rief-l5-dead')이 이 지도의 숲 전체를 덮으므로, 숲 칸 둘(끔·사가2 의
//   숲 칸, 남동쪽 구석 숲 칸)에 { phase5: false } 를 달고 같은 다각형·밀도의 죽은 숲 칸(deadwood — 세계 지도처럼 넷에 하나만 죽은 나무로 남는다)을
//   { phase5: true } 로 terrain 끝에 더했다. 숲 채색은 앱이 걷는다. 산호 바위(가시 탑·뿌리 감긴 아치)는 얹힌 덩굴 잎·덤불 잎을 떼고(LIVE),
//   돌빛(stone)을 걷어 희게 하고 금과 발치의 부스러기를 더해 '부서지기 쉬운 백악질' 바위로, 아치 위에는 잎 진 덤불의 마른 줄기를 남긴다(DEAD).
//   감긴 뿌리는 마른 채 그대로 둔다. 산 띠·지류는 그대로다(세계 지도도 산·언덕·강은 두고 나무만 죽인다).
// · 사가2 페이즈1(BFZ, 2015): 숲은 아직 서 있었다 — Slaughter at the Refuge(2015-08-19): "the tangled trees of the Vastwood shielded Sea Gate
//   from view". 그 무렵 숲을 가로지른 백악 자국과 심장나무 빈터('oran-rief-l4-trails')는 세계 지도가 할리마르 쪽 숲(이 범위 밖)에 그었으므로
//   이 지도는 끔과 같다.
// · 사가1(ZEN·WWK·ROE): 야생의 큰 숲이라 끔과 같다.
// · 태양샘·돌독수리·Calcite Flats·Bulwark 는 BFZ·OGW 무렵 바뀌었다는 서술이 없어 모든 페이즈에서 같다.
// 해석: 죽은 숲을 이 지도의 숲 칸 그대로(산호 바위 자리만 비운 채) 덮은 것, 산호 바위를 희게 그리고 금·부스러기를 더한 것, 아치 위의 마른 줄기와
// 남긴 뿌리. 칼럼은 바위가 '부서지기 쉬운 백악질'이라고만 하고 이 두 바위를 따로 말하지 않는다.

const { line, poly, smooth, rng, along, stack } = KIT
const r1 = (v) => Math.round(v * 10) / 10
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`
const P = (cls, d) => ({ cls, d })
const ell = (x, y, rx, ry) => `M${pt([x - rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x + rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x - rx, y])}Z`

/** 다각형 안인가 */
function inPoly(x, y, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
/** 위에서 아래로 가는 꺾은선의 y 에서의 x */
function xAt(pts, y) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[i + 1]
    if (y >= y0 && y <= y1) return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0 || 1)
  }
  return y < pts[0][1] ? pts[0][0] : pts[pts.length - 1][0]
}
/** 바깥 고리에 구멍 고리를 이어 붙인다 (짝홀 규칙 — 구멍끼리 겹치지 않게) */
const withHoles = (outer, holes) => [...outer, outer[0], ...holes.flatMap((h) => [...h, h[0], outer[0]])]
/** 둥근 빈터 고리 — 가장자리를 조금 흔든다 */
function clearing(cx, cy, rx, ry, seed, n = 16) {
  const rand = rng(seed)
  const out = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const k = 0.9 + rand() * 0.18
    out.push([r1(cx + Math.cos(a) * rx * k), r1(cy + Math.sin(a) * ry * k)])
  }
  return out
}

// ---------------------------------------------------------------- 세계 지도에서 온 자리 (context.mjs, 자식 좌표)
// 앱이 찍는 표시: The Sunspring (411.2, 347.1) — 샘 그릇 앞 모래, Dread Statuary (886.5, 829.9) — Bulwark 비탈
/** 해안 (앱이 그리는 선을 간추린 것 — 모래 점찍기를 뭍 안에만 두려고) */
const COAST = [
  [240, -10], [238, 10], [244, 25], [258, 44], [278, 69], [292, 86], [298, 97], [293, 107], [282, 119], [266, 136], [256, 153], [253, 170], [254, 188],
  [260, 206], [271, 225], [280, 247], [284, 279], [282, 305], [277, 335], [271, 356], [266, 378], [265, 396], [268, 411], [274, 422], [283, 431], [290, 444],
  [295, 463], [297, 487], [297, 514], [299, 537], [301, 554], [305, 567], [311, 580], [318, 589], [326, 596], [331, 602], [335, 611], [336, 623], [337, 637],
  [340, 650], [347, 661], [359, 670], [374, 676], [389, 682], [402, 688], [417, 696], [427, 704], [433, 711], [434, 718], [432, 723], [427, 731], [418, 740],
  [406, 751], [395, 761], [387, 770], [383, 777], [383, 782], [385, 788], [390, 795], [399, 804], [411, 813], [421, 825], [429, 838], [434, 852], [437, 868],
  [438, 883], [438, 895], [437, 904], [433, 911], [429, 917], [426, 926], [425, 934], [426, 941], [429, 948], [435, 957], [441, 962], [446, 968], [450, 976],
  [454, 984], [456, 994], [456, 1010],
]
/** 우마라 강 서쪽 지류 (umara-west-tributary) — 머리는 Bulwark 안쪽 기슭, 동쪽 끝으로 나가 할리마르 지도로 이어진다. 이름 없음.
 *  세계 지도가 그리는 물길 그대로 (landscape.ts shapeRivers: chaikin 3번·1.5 단위로 다시 찍기·굽이, 상류에서 하구로 굵어지는 폭) —
 *  [x, y, 폭] 을 이 지도 좌표로 옮겨 적었다. 가장자리 띠에서 세계 지도의 강과 같은 자리·같은 폭으로 겹쳐 두 줄로 보이지 않는다 */
const TRIB = [[901.6,309.3,1.38],[909.5,314.5,1.52],[917.3,319.7,1.63],[925.2,324.9,1.72],[933.2,330,1.8],[941.5,334.6,1.89],[950.1,338.5,1.97],[959.1,341.7,2.04],[968.4,343.9,2.12],[977.9,345.3,2.19],[987.5,345.7,2.26],[997,345.3,2.33],[1006.5,344.3,2.4],[1015.9,342.9,2.46],[1025.2,340.9,2.53],[1034.4,338.4,2.6],[1043.4,335.6,2.66],[1052.4,332.6,2.72],[1061.4,329.6,2.79],[1070.3,326.8,2.85],[1079.5,324.9,2.91],[1088.8,323.9,2.97],[1098.2,324,3.03],[1107.5,325,3.09],[1116.7,327,3.15],[1125.6,329.9,3.21],[1134.2,333.7,3.27],[1142.9,337.4,3.32],[1151.7,340.7,3.38],[1160.7,343.7,3.44],[1169.8,346.3,3.49],[1179.1,348.1,3.55],[1188.5,349.1,3.61],[1198,349.4,3.66],[1207.3,349.2,3.72],[1216.6,348.6,3.77]]
/** 세계 지도의 강 그리기(landscape.ts riverPaths)와 같은 꼴 — 점마다 법선으로 폭의 반씩 민 물칠과 두 기슭 선 */
function worldRiver(st) {
  const L = []
  const R = []
  st.forEach(([x, y, w], i) => {
    const a = st[Math.max(0, i - 1)]
    const b = st[Math.min(st.length - 1, i + 1)]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const nx = -(b[1] - a[1]) / len
    const ny = (b[0] - a[0]) / len
    L.push([x - (nx * w) / 2, y - (ny * w) / 2])
    R.push([x + (nx * w) / 2, y + (ny * w) / 2])
  })
  return [P('sea', poly([...L, ...[...R].reverse()])), P('sea-ink', line(L) + line(R))]
}

/** Bulwark 벼랑 마루 (위에서 아래로) — 바다 쪽(서쪽)으로 떨어지는 면의 윗선. 샘 앞에서 가장 깊다 */
const CREST = [
  [446, -12], [470, 60], [484, 130], [482, 200], [500, 262], [540, 322], [556, 400], [553, 470], [552, 540], [560, 610], [562, 670], [546, 730], [532, 790],
  [550, 860], [568, 930], [586, 1012],
]
const faceDepth = (y) => 36 + 21 * Math.exp(-(((y - 390) / 120) ** 2))
/** 벼랑 밑 (모래 평원의 동쪽 끝) */
const FOOT = CREST.map(([x, y]) => [x - faceDepth(y), y])

// ---------------------------------------------------------------- 그리기 도구 (KIT 에 없는 것)
/** 판화의 점찍기 — 엇갈린 격자에 작은 점. keep(x, y) 가 0..1 의 남길 비율 */
function stipple(x0, y0, x1, y1, gap, r, keep, seed) {
  const rand = rng(seed)
  let d = ''
  let row = 0
  for (let y = y0; y <= y1; y += gap * 0.87, row++) {
    for (let x = x0 + (row % 2 ? gap / 2 : 0); x <= x1; x += gap) {
      const px = x + (rand() - 0.5) * gap * 0.7
      const py = y + (rand() - 0.5) * gap * 0.7
      if (rand() > keep(px, py)) continue
      const rr = r * (0.7 + rand() * 0.6)
      d += `M${r1(px - rr)} ${r1(py)}a${r1(rr)} ${r1(rr)} 0 1 0 ${r1(rr * 2)} 0a${r1(rr)} ${r1(rr)} 0 1 0 ${r1(-rr * 2)} 0`
    }
  }
  return d
}
/** 덤불·이끼 포기 — 짧은 획 셋 */
const tuft = ([x, y], s = 6) => line([[x - s * 0.6, y - s * 0.55], [x - s * 0.15, y]]) + line([[x, y - s * 0.85], [x, y]]) + line([[x + s * 0.6, y - s * 0.6], [x + s * 0.15, y]])

/** 매끈한 꺾은선을 촘촘한 점들로 (Catmull-Rom) */
function dense(pts, per = 6) {
  const n = pts.length
  const at = (i) => pts[Math.max(0, Math.min(n - 1, i))]
  const out = []
  for (let i = 0; i < n - 1; i++) {
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
  out.push(pts[n - 1])
  return out
}

/**
 * 바다 쪽으로 떨어지는 Bulwark 벼랑 — 판화의 선묘(hachure): 마루선에서 서쪽으로 내린 빗금이 버팀벽(spur)마다 길고
 * 그 사이 골짜기에서 짧다. 버팀벽의 남쪽(오른쪽 아래) 면에만 그늘. KIT.cliff 의 'hachure' 와 같은 손.
 */
/** 벼랑이 살아 있는 정도 — 위·아래 가장자리 띠(약 120 단위)에 닿기 전에 사그라든다. 세계 지도에는 이 벼랑이 없어,
 *  띠에서 옅어지며 끊긴 선으로 보이지 않게 평원과 산 비탈 사이에서 낮아지다 그친다 */
const SCARP_Y0 = 150
const SCARP_Y1 = 820
const scarpLive = (y) => {
  const a = Math.min(1, Math.max(0, (y - SCARP_Y0) / 110))
  const b = Math.min(1, Math.max(0, (SCARP_Y1 - y) / 130))
  const t = Math.min(a, b)
  return t * t * (3 - 2 * t)
}
function scarp(pts, depthAt, seed) {
  const rand = rng(seed)
  const crest = dense(pts, 8).filter(([, y]) => y > SCARP_Y0 - 4 && y < SCARP_Y1 + 4)
  const all = along(crest, 4.2)
  // 마루선은 조금 들쭉날쭉
  const edge = all.map(([[x, y]], i) => [x + (i % 3 === 1 ? (rand() - 0.5) * 2.4 : 0), y])
  let ticks = ''
  let shade = ''
  let spurInk = ''
  const PER = 34
  let phase = rand() * PER
  all.forEach(([[, y], [ux, uy]], i) => {
    phase += 4.2
    const u = (phase % PER) / PER // 0..1 버팀벽 한 주기
    const prof = Math.pow(Math.sin(Math.PI * u), 0.8) // 가운데 길고 양끝 짧다
    const live = scarpLive(y)
    const dep = depthAt(y) * (0.42 + 0.58 * prof) * (0.9 + rand() * 0.2) * live
    // 진행 방향(남쪽)의 오른쪽 = 서쪽(바다 쪽)
    const nx = -uy
    const ny = ux
    // 버팀벽 끝으로 갈수록 살짝 남쪽으로 기울어 내린다
    const sx = nx + ux * 0.18
    const sy = ny + uy * 0.18
    const [ex, ey] = edge[i]
    // 샘에서 먼 곳은 빗금을 하나 걸러 — 벼랑이 중심 그림보다 무겁지 않게
    const far = Math.abs(ey - 390) > 230
    if (dep < 3) return
    if (!far || i % 2 === 0 || prof > 0.85) ticks += line([[ex, ey], [ex + sx * dep, ey + sy * dep]])
    if (u > 0.52 && u < 0.84) shade += poly([[ex, ey], [ex + sx * dep, ey + sy * dep], [ex + sx * dep + ux * 4.4, ey + sy * dep + uy * 4.4], [ex + ux * 4.4, ey + uy * 4.4]])
    if (Math.abs(u - 0.5) < 4.2 / PER / 2 + 1e-6) {
      // 버팀벽 등줄기
      spurInk += line([[ex, ey], [ex + sx * dep * 0.96, ey + sy * dep * 0.96]])
    }
  })
  // 마루선 — 다 높은 곳은 굵게, 사그라드는 양 끝은 가는 선으로
  const keep = edge.filter((_, i) => i % 2 === 0)
  const live = keep.map(([, y]) => scarpLive(y))
  const bold = keep.filter((_, i) => live[i] > 0.45)
  const thinTop = keep.filter((_, i) => live[i] <= 0.5 && keep[i][1] < 500 && live[i] > 0.04)
  const thinBot = keep.filter((_, i) => live[i] <= 0.5 && keep[i][1] > 500 && live[i] > 0.04)
  return [P('shade', shade), P('hatch', ticks), P('ink', spurInk + (thinTop.length > 1 ? smooth(thinTop) : '') + (thinBot.length > 1 ? smooth(thinBot) : '')), P('ink-bold', smooth(bold))]
}

/** 벼랑 밑 굴러 내린 돌 몇 개 (평원 쪽) */
function scree(seed) {
  const rand = rng(seed)
  const out = []
  for (let y = SCARP_Y0 + 40; y < SCARP_Y1 - 30; y += 46 + rand() * 40) {
    if (y > 250 && y < 520) continue // 샘 둘레에는 단단한 바위가 없다
    const x = xAt(FOOT, y) - 6 - rand() * 8
    out.push({ y, parts: KIT.rocks(x, y, 4 + rand() * 3, 2, `${seed}-${Math.round(y)}`) })
  }
  return out
}

/** 노두 — 조수에 깎여 밑동이 파인, 사람보다 훨씬 큰 바위 덩어리. 꼭대기에 나무 몇 그루. (x, y) 는 밑 가운데 */
function outcrop(x, y, w, h, seed) {
  const rand = rng(seed)
  const J = (v) => v + (rand() - 0.5) * 0.05
  const prof = [
    [-0.26, 0], [-0.29, -0.1], [-0.22, -0.19], [-0.4, -0.3], [-0.47, -0.48], [-0.41, -0.62], [-0.45, -0.78], [-0.34, -0.9],
    [-0.2, -0.95], [-0.08, -1.02], [0.06, -0.97], [0.2, -1.01], [0.34, -0.9], [0.43, -0.76], [0.39, -0.6], [0.47, -0.44], [0.38, -0.28], [0.27, -0.17], [0.31, -0.07], [0.28, 0],
  ]
  const pts = prof.map(([u, v]) => [x + J(u) * w, y + J(v) * h])
  const outline = poly(pts)
  // 그늘 — 오른쪽 면과 파인 밑동
  const right = pts.slice(11)
  const shade = poly([[x + w * 0.12, y], [x + w * 0.08, y - h * 0.4], [x + w * 0.16, y - h * 0.94], ...right])
  const notch = poly([[x - w * 0.26, y], [x - w * 0.29, y - h * 0.1], [x - w * 0.22, y - h * 0.19], [x + w * 0.27, y - h * 0.17], [x + w * 0.31, y - h * 0.07], [x + w * 0.28, y]])
  // 세로 금과 바닷물이 남긴 두 줄 결
  let hatch = ''
  for (let i = 0; i < 6; i++) {
    const cx = x + w * (0.14 + rand() * 0.26)
    const cy = y - h * (0.25 + rand() * 0.6)
    hatch += line([[cx, cy], [cx + (rand() - 0.5) * 2, cy + h * (0.1 + rand() * 0.1)]])
  }
  hatch += line([[x - w * 0.36, y - h * 0.34], [x - w * 0.1, y - h * 0.31]]) + line([[x - w * 0.4, y - h * 0.62], [x - w * 0.2, y - h * 0.6]])
  const base = ell(x + w * 0.05, y + 1.2, w * 0.5, 3.6)
  const out = [P('shade', base), P('fill', outline), P('shade', shade + notch), P('hatch', hatch), P('ink-bold', outline)]
  // 꼭대기 풀과 나무 ('Trees sink their roots into the rock')
  const trees = []
  const nT = 2 + Math.floor(rand() * 2)
  for (let i = 0; i < nT; i++) {
    const tx = x - w * 0.24 + (w * 0.5 * (i + 0.5)) / nT + (rand() - 0.5) * 4
    trees.push({ y: y - h + i * 0.1, parts: KIT.tree(tx, y - h * 0.96, 19 + rand() * 7, `${seed}-t${i}`) })
  }
  return [...out, ...stack(trees), ...KIT.rocks(x - w * 0.42, y - 1, 3.6, 2, `${seed}-r`)]
}

/** 무른 땅 — 얇은 겉껍질이 깨진 자리 (점, 짧은 금, 반쯤만 그은 물기 테두리) */
function crust(x, y, rx, ry, seed) {
  const rand = rng(seed)
  const ring = []
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const k = 0.82 + rand() * 0.3
    ring.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k])
  }
  // 아래쪽 반만 물기선
  const edge = smooth(ring.slice(1, 7))
  // 깨진 겉껍질 — 얇은 판이 깨져 벌어진 틈 사이로 젖은 진흙(그늘)이 보인다. 판 가장자리는 짧은 금
  const crack = (pts, wid) => {
    const up = pts.map(([px, py], i) => [px, py - wid * Math.sin((Math.PI * i) / (pts.length - 1))])
    const dn = pts.map(([px, py], i) => [px, py + wid * 0.8 * Math.sin((Math.PI * i) / (pts.length - 1))])
    return smooth([...up, ...dn.reverse()], true)
  }
  const mid = (t, dy) => [x - rx * 0.7 + rx * 1.4 * t, y + dy + (rand() - 0.5) * ry * 0.35]
  const g1 = [mid(0, -ry * 0.1), mid(0.25, -ry * 0.28), mid(0.5, ry * 0.05), mid(0.75, -ry * 0.15), mid(1, 0)]
  const g2 = [[x - rx * 0.05, y + ry * 0.05], [x + rx * 0.08, y + ry * 0.4], [x - rx * 0.02, y + ry * 0.75]]
  const g3 = [[x - rx * 0.4, y - ry * 0.15], [x - rx * 0.32, y - ry * 0.5], [x - rx * 0.4, y - ry * 0.8]]
  const gapFill = crack(g1, ry * 0.2) + crack(g2, rx * 0.04) + crack(g3, rx * 0.035)
  let cracks = gapFill
  for (let i = 0; i < 4; i++) {
    const sx = x + (rand() - 0.5) * rx * 1.3
    const sy = y + (rand() - 0.5) * ry * 1.1
    cracks += line([[sx - 3, sy - 0.8], [sx, sy + 0.9], [sx + 2.6, sy - 0.5]])
  }
  const dots = stipple(x - rx, y - ry, x + rx, y + ry, 4.6, 0.5, (px, py) => (inPoly(px, py, ring) ? 0.4 : 0), `${seed}-d`)
  return [P('shade', gapFill), P('hatch', cracks + dots), P('sea-ink', edge)]
}

/** 망루 껍데기 — 지붕 없이 윗머리가 깨진 둥근 탑, 빈 창. (x, y) 는 밑 가운데 */
function towerShell(x, y, w, h, seed) {
  const rand = rng(seed)
  const tw = w * 0.84
  const top = []
  const n = 5
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const hh = h * (i === 1 || i === 2 ? 1 : 0.74 + rand() * 0.2)
    top.push([x - tw / 2 + tw * t, y - hh])
  }
  const body = poly([[x - w / 2, y], ...top, [x + w / 2, y]])
  const shade = poly([[x + w * 0.16, y], [x + tw * 0.16, top[3][1]], ...top.slice(4), [x + w / 2, y]])
  let hatch = ''
  for (const t of [0.35, 0.7]) hatch += line([[x + w * 0.16 + (w / 2 - w * 0.16) * t, y - 2], [x + w * 0.16 + (w / 2 - w * 0.16) * t, y - h * 0.62]])
  // 돌 줄눈 두 줄 (왼쪽)
  hatch += line([[x - w * 0.42, y - h * 0.32], [x - w * 0.02, y - h * 0.32]]) + line([[x - w * 0.38, y - h * 0.6], [x - w * 0.06, y - h * 0.6]])
  const win = poly([[x - w * 0.12, y - h * 0.72], [x + w * 0.02, y - h * 0.72], [x + w * 0.02, y - h * 0.5], [x - w * 0.12, y - h * 0.5]])
  const door = poly([[x - w * 0.14, y], [x - w * 0.14, y - h * 0.22], [x + w * 0.04, y - h * 0.22], [x + w * 0.04, y]])
  return [P('shade', ell(x + w * 0.1, y + 1, w * 0.62, 2.4)), P('stone', body), P('shade', shade), P('hatch', hatch), P('dark', win + door), P('ink', body), ...KIT.rocks(x + w * 0.75, y, 3.2, 2, `${seed}-r`)]
}

/** 닳아 끊긴 성벽 토막 — KIT.wall 의 마디들 사이를 비우고 끝을 들쭉날쭉 */
function brokenWall(runs, h, seed) {
  const rand = rng(seed)
  const out = []
  for (const run of runs) {
    out.push(...KIT.wall(run, h, { merlon: h * 0.55 }))
    // 끝머리의 무너진 돌
    const end = run[run.length - 1]
    out.push(...KIT.rocks(end[0] + 5 + rand() * 3, end[1] + 1, 2.6, 2, `${seed}-${end[0]}`))
  }
  return out
}

// 페이즈 문 — 사가2 페이즈2(OGW)의 죽은 오란리프 (머리 주석 '페이즈별 모습'). 끔·사가1·사가2 페이즈1 은 살아 있는 숲
const LIVE = { phase5: false }
const DEAD = { phase5: true }
const gate = (list, g) => list.map((p) => ({ ...p, ...g }))

/** 부서지기 쉬운 백악 바위의 금 — (x, y) 에서 a 쪽으로 두세 마디 꺾이는 짧은 금 (사가2 페이즈2 의 산호 바위) */
function chalkCrack(x, y, len, a, rand) {
  const pts = [[x, y]]
  const n = 2 + (rand() < 0.5 ? 1 : 0)
  let px = x
  let py = y
  for (let k = 0; k < n; k++) {
    const l = (len / n) * (0.7 + rand() * 0.6)
    px += Math.cos(a) * l
    py += Math.sin(a) * l
    pts.push([px, py])
    a += (k % 2 ? -1 : 1) * (0.5 + rand() * 0.5)
  }
  return line(pts)
}
/** 바위 밑에 떨어진 백악 부스러기 — 땅에 납작하게 누운 모난 조각 몇. [채움, 잉크] */
function chalkChips(x, y, s, n, rand) {
  let d = ''
  for (let i = 0; i < n; i++) {
    const cx = x + (i - (n - 1) / 2) * s * 1.9 + (rand() - 0.5) * s * 0.6
    const cy = y + (rand() - 0.5) * s * 0.4
    const r = s * (0.6 + rand() * 0.4)
    const top = r * (0.28 + rand() * 0.14)
    d += poly([[cx - r, cy], [cx - r * 0.55, cy - top * 0.8], [cx + r * (rand() - 0.5) * 0.4, cy - top], [cx + r * 0.6, cy - top * 0.6], [cx + r, cy]])
  }
  return [P('fill', d), P('ink', d)]
}

/** 오란리프의 산호 바위 — 가시 돋친 탑 (PG 2009 'spiny towers, bristly fringes').
 *  사가2 페이즈2 에는 덩굴 잎과 돌빛을 걷어 희게 하고 금과 부스러기를 더한다 (머리 주석 '페이즈별 모습') */
function spinyTower(x, y, w, h, seed) {
  const rand = rng(seed)
  const sp = KIT.spire(x, y, w, h, seed)
  // 죽은 무렵의 금·부스러기 — 따로 시드해 살아 있는 무렵 그림의 난수 차례는 그대로다
  const crand = rng(`${seed}-chalk`)
  let cracks = ''
  for (const t of [0.18, 0.42, 0.66]) {
    const half = (w / 2) * (1 - t * 0.78)
    cracks += chalkCrack(x - half, y - h * t, half * 1.1, 0.35 + crand() * 0.3, crand)
  }
  const parts = [sp[0], ...gate([P('stone', sp[0].d)], LIVE), sp[1], sp[2], ...gate([P('hatch', cracks)], DEAD), sp[3]]
  let spines = ''
  for (let i = 1; i <= 6; i++) {
    const t = i / 7.5
    const half = (w / 2) * (1 - t * 0.78)
    const yy = y - h * t
    const l = 3 + rand() * 3
    spines += line([[x - half, yy], [x - half - l, yy - l * 0.6]]) + line([[x + half, yy - 2], [x + half + l, yy - 2 - l * 0.6]])
  }
  // 바위 틈에 매달린 덩굴 잎
  const leaf = ell(x - w * 0.18, y - h * 0.42, 3.4, 2.4) + ell(x + w * 0.2, y - h * 0.2, 3, 2.2)
  return [...parts, P('ink', spines), ...gate([P('forest', leaf), P('ink', leaf)], LIVE), ...gate(chalkChips(x + w * 0.75, y + 1, 2.4, 2, crand), DEAD)]
}

/** 뿌리 감긴 바위 아치 (2015: 'Massive, sprawling root structures wrapped around brittle sandstone arches') — 위에 덤불 잎 */
function rootArch(x, y, w, h, seed) {
  const rand = rng(seed)
  const o = w / 2
  const t = w * 0.17 // 아치 두께
  // 바깥·안쪽 선 (반원에 가까운 들쭉날쭉한 고리)
  const N = 12
  const outer = []
  const inner = []
  for (let k = 0; k <= N; k++) {
    const a = Math.PI - (k / N) * Math.PI
    const j = (rand() - 0.5) * 2.2
    outer.push([x + Math.cos(a) * (o + j), y - Math.sin(a) * (h + j)])
    inner.push([x + Math.cos(a) * (o - t), y - Math.sin(a) * (h - t * 1.1)])
  }
  const body = poly([...outer, ...inner.reverse()])
  const innerR = inner // 이제 오른쪽에서 왼쪽
  const shade = poly([...outer.slice(N / 2), ...innerR.slice(0, N / 2 + 1)])
  // 사암 결 — 다리마다 가로 줄
  let hatch = ''
  for (const k of [0.18, 0.4, 0.62]) {
    hatch += line([[x - o + 1, y - h * k], [x - o + t - 1, y - h * k - 1]]) + line([[x + o - t + 1, y - h * k + 1], [x + o - 1, y - h * k]])
  }
  // 감아 오르는 뿌리 — 아치 바깥을 따라 물결치는 굵은 선, 밑에서 땅으로 퍼진다
  let roots = ''
  const rr = []
  for (let k = 0; k <= N; k++) {
    const a = Math.PI - (k / N) * Math.PI
    const wob = Math.sin(k * 1.9) * 3
    rr.push([x + Math.cos(a) * (o - t * 0.5 + wob), y - Math.sin(a) * (h - t * 0.55 + wob)])
  }
  roots += smooth(rr)
  roots += smooth([[x - o - 9, y + 1], [x - o - 2, y - 3], [x - o + t * 0.5, y - h * 0.15]]) + smooth([[x + o + 9, y + 2], [x + o + 2, y - 2], [x + o - t * 0.5, y - h * 0.18]])
  // 아치 위에 얹힌 덤불 잎 ('Shrubs, vines, honeysuckle, ferns')
  const leaves = ell(x - o * 0.5, y - h - 1, 7, 4.2) + ell(x + 2, y - h - 4, 8, 5) + ell(x + o * 0.55, y - h + 1, 6.5, 4)
  // 사가2 페이즈2 — 잎 진 덤불의 마른 줄기(잎 자리의 아치 윗면에서), 다리와 머리의 금, 발치의 부스러기. 따로 시드해 위의 난수 차례는 그대로다
  const crand = rng(`${seed}-chalk`)
  let stalks = ''
  for (const [u, s] of [[-0.5, 6.5], [0.08, 8], [0.55, 6]]) {
    const bx = x + o * u
    const by = y - Math.sqrt(1 - u * u) * h + 1
    const tx = bx + (crand() - 0.5) * 2.4
    const ty = by - s
    stalks += line([[bx, by], [tx, ty]])
    // 곁가지 둘 — 줄기 가운데쯤에서 좌우로
    for (const side of [-1, 1]) {
      const k = 0.35 + crand() * 0.3
      const sx = bx + (tx - bx) * k
      const sy = by + (ty - by) * k
      stalks += line([[sx, sy], [sx + side * (1.6 + crand() * 1.4), sy - (1.4 + crand() * 1.2)]])
    }
  }
  let cracks = ''
  for (const k of [0.3, 0.55]) {
    cracks += chalkCrack(x - o + 0.5, y - h * k, t * 0.9, 0.3 + crand() * 0.3, crand)
    cracks += chalkCrack(x + o - t + 0.5, y - h * k + 2, t * 0.8, 0.4 + crand() * 0.3, crand)
  }
  cracks += chalkCrack(x - 4, y - h + 0.5, t * 0.85, 1.35 + crand() * 0.3, crand)
  const chips = chalkChips(x - o - 5, y + 0.8, 3, 3, crand)
  const chipsR = chalkChips(x + o + 6, y + 1.2, 2.6, 2, crand)
  return [
    P('shade', ell(x + 4, y + 1.5, o + 8, 3)),
    P('fill', body),
    ...gate([P('stone', body)], LIVE),
    P('shade', shade),
    P('hatch', hatch),
    ...gate([P('hatch', cracks)], DEAD),
    P('ink', body),
    P('ink-bold', roots),
    ...gate([P('fill', leaves), P('forest', leaves), P('ink', leaves)], LIVE),
    ...gate([P('fill', chips[0].d + chipsR[0].d), P('ink', stalks + chips[1].d + chipsR[1].d)], DEAD),
  ]
}

/** 떠 있는 헤드론 — 세계 지도의 그 하나, 그림자는 땅에 */
function floatHedron(x, y, len, rot, lift) {
  return KIT.hedron(x, y, len, rot, { lift })
}

/** path 를 (cx, cy) 둘레로 k 배 — 절대 M·L·C·Q·A·Z 와 상대 q 만 쓰는 이 파일의 path 용 */
function scalePath(d, cx, cy, k) {
  const toks = d.match(/[MLCQAZqaz]|-?\d*\.?\d+(?:e-?\d+)?/g) || []
  let out = ''
  let cmd = ''
  let args = []
  const flush = () => {
    if (!cmd) return
    const n = { M: 2, L: 2, C: 6, Q: 4, A: 7, q: 4, Z: 0, z: 0 }[cmd]
    if (!n) {
      out += cmd
      return
    }
    for (let i = 0; i < args.length; i += n) {
      const g = args.slice(i, i + n)
      let r
      if (cmd === 'A') r = [g[0] * k, g[1] * k, g[2], g[3], g[4], cx + (g[5] - cx) * k, cy + (g[6] - cy) * k]
      else if (cmd === 'q') r = g.map((v) => v * k)
      else r = g.map((v, j) => (j % 2 ? cy + (v - cy) * k : cx + (v - cx) * k))
      out += cmd + r.map((v, j) => (cmd === 'A' && j >= 2 && j <= 4 ? v : r1(v))).join(' ')
    }
  }
  for (const t of toks) {
    if (/^[A-Za-z]$/.test(t)) {
      flush()
      cmd = t
      args = []
    } else args.push(parseFloat(t))
  }
  flush()
  return out
}
const scaleParts = (list, cx, cy, k) => list.map((p) => P(p.cls, scalePath(p.d, cx, cy, k)))

// ---------------------------------------------------------------- The Sunspring — 흰 대리석 샘과 이끼 낀 돌독수리 (중심 그림)
/**
 * (x, y) 는 그릇 밑 가운데. 표시(411.2, 347.1)가 그릇 앞 모래에 앉는다.
 * 아트북: 'a white marble fountain, fed by an underwater spring, whose pure waters glow with soft, greenish light. A great stone eagle,
 * crusted with old moss, crowns the fountain, with the water spilling around its feet.' — 그 밖의 것(계단·기둥·벽·글씨·잔해)은 없다.
 */
function sunspring(x, y) {
  const out = []
  const RX = 52
  const RY = 11.5
  const H = 17
  const rimY = y - H // 그릇 테두리(타원 중심)
  // 바닥 그림자와 둘레의 옅은 이끼·풀 테 ('oasis' — 얇게만)
  out.push(P('shade', ell(x + 6, y + 2, RX + 14, RY * 0.75)))
  // 그릇 몸통 (앞쪽 벽) — 흰 대리석
  const body = `M${pt([x - RX, rimY])}L${pt([x - RX, y - RY * 0.15])}A${RX} ${RY} 0 0 0 ${pt([x + RX, y - RY * 0.15])}L${pt([x + RX, rimY])}A${RX} ${RY} 0 0 1 ${pt([x - RX, rimY])}Z`
  const rim = ell(x, rimY, RX, RY)
  const sideShade = `M${pt([x + RX * 0.35, rimY + RY * 0.94])}L${pt([x + RX * 0.35, y + RY * 0.79])}A${RX} ${RY} 0 0 0 ${pt([x + RX, y - RY * 0.15])}L${pt([x + RX, rimY])}Z`
  // 그릇 아래 굽(낮은 받침단)
  const plinth = `M${pt([x - RX - 5, y - 2])}L${pt([x - RX - 5, y + 2])}A${RX + 5} ${RY + 1.5} 0 0 0 ${pt([x + RX + 5, y + 2])}L${pt([x + RX + 5, y - 2])}A${RX + 5} ${RY + 1.5} 0 0 1 ${pt([x - RX - 5, y - 2])}Z`
  out.push(P('fill', plinth), P('shade', `M${pt([x + RX * 0.4, y + RY + 1])}L${pt([x + RX * 0.4, y + RY + 5])}A${RX + 5} ${RY + 1.5} 0 0 0 ${pt([x + RX + 5, y + 2])}L${pt([x + RX + 5, y - 2])}Z`), P('ink', plinth))
  out.push(P('fill', body), P('shade', sideShade))
  // 대리석 판 이음과 테두리 몰딩
  let hatch = ''
  for (const t of [-0.62, -0.22, 0.2]) {
    const sx = x + RX * t
    const yy = rimY + RY * Math.sqrt(1 - t * t)
    hatch += line([[sx, yy + 2.5], [sx, yy + H - 2.5]])
  }
  for (const t of [0.5, 0.68, 0.84]) {
    const sx = x + RX * t
    const yy = rimY + RY * Math.sqrt(1 - t * t)
    hatch += line([[sx, yy + 2], [sx, yy + H - 1.5]])
  }
  hatch += `M${pt([x - RX, rimY + 4])}A${RX} ${RY} 0 0 0 ${pt([x + RX, rimY + 4])}`
  out.push(P('hatch', hatch), P('ink', body))
  // 물 — 옅은 물빛, 가운데 옅은 초록 빛, 잔물결
  const water = ell(x, rimY + 0.6, RX - 5, RY - 3)
  out.push(P('fill', rim), P('ink', rim), P('sea', water), P('forest', ell(x - 2, rimY + 1.2, RX * 0.55, RY * 0.38)))
  let rip = ''
  for (const [dx, dy, s] of [[-30, 1.5, 7], [24, 3, 8], [-8, 4.6, 6], [34, -1.5, 5]]) rip += `M${pt([x + dx - s, rimY + dy])}Q${pt([x + dx, rimY + dy - 1.6])} ${pt([x + dx + s, rimY + dy])}`
  out.push(P('sea-ink', water + rip))
  // 은은한 빛 — 물 위로 짧은 빛살 몇 줄
  let glow = ''
  for (const [dx, a] of [[-38, -2.2], [-24, -1.9], [26, -1.25], [40, -0.95]]) {
    const sx = x + dx
    const sy = rimY - 2
    glow += line([[sx + Math.cos(a) * 3, sy + Math.sin(a) * 3], [sx + Math.cos(a) * 9, sy + Math.sin(a) * 9]])
  }
  out.push(P('sea-ink', glow))
  // 받침 기둥 — 물에서 솟아 독수리를 받친다
  const pw = 9
  const pTop = rimY - 30
  const col = poly([[x - pw, rimY + 2], [x - pw * 0.7, rimY - 8], [x - pw * 0.62, pTop + 6], [x + pw * 0.62, pTop + 6], [x + pw * 0.7, rimY - 8], [x + pw, rimY + 2]])
  const cap = `M${pt([x - 14, pTop + 6])}L${pt([x - 14, pTop + 2])}A14 3.4 0 0 1 ${pt([x + 14, pTop + 2])}L${pt([x + 14, pTop + 6])}A14 3.4 0 0 1 ${pt([x - 14, pTop + 6])}Z`
  const colShade = poly([[x + pw * 0.2, rimY + 2], [x + pw * 0.2, pTop + 6], [x + pw * 0.62, pTop + 6], [x + pw * 0.7, rimY - 8], [x + pw, rimY + 2]])
  out.push(P('fill', col + cap), P('shade', colShade), P('hatch', line([[x + pw * 0.45, rimY - 2], [x + pw * 0.4, pTop + 9]]) + line([[x - 13, pTop + 4.8], [x + 13, pTop + 4.8]])), P('ink', col + cap))
  // 이끼 낀 받침 아래쪽
  out.push(P('forest', ell(x - 4, rimY - 4, 5, 2.4)))
  // 독수리 발치로 넘쳐 흘러내리는 물 — 갓돌 양쪽에서 그릇 물로
  let spill = ''
  for (const s of [-1, 1]) {
    spill += `M${pt([x + s * 12, pTop + 3])}C${pt([x + s * 19, pTop + 6])} ${pt([x + s * 21, rimY - 14])} ${pt([x + s * 22, rimY - 1])}`
    spill += `M${pt([x + s * 9, pTop + 5.5])}C${pt([x + s * 14, pTop + 10])} ${pt([x + s * 15, rimY - 12])} ${pt([x + s * 15.5, rimY])}`
    spill += `M${pt([x + s * 22, rimY - 1])}q${s * 2.5} -1.6 ${s * 5} 0`
  }
  out.push(P('sea-ink', spill))
  out.push(...eagle(x, pTop + 2))
  return out
}

/** 돌독수리 — 날개를 반쯤 들고 갓돌을 움켜쥔 자세, 머리는 바다 쪽(왼쪽). (x, y) 는 발 (갓돌 위). 높이 약 60 */
function eagle(x, y) {
  const S = (pts) => pts.map(([px, py]) => [x + px, y + py])
  const mir = (pts) => pts.map(([px, py]) => [-px, py])
  // 왼쪽 날개 — 어깨에서 손목까지 앞선, 끝에 손가락처럼 벌어진 첫째 깃 넷, 뒤선은 둘째 깃이 물결진다
  const wingLraw = [
    [-7, -33], [-15, -44], [-25, -53], [-33, -60], [-36.5, -60.5], [-35, -56], [-40.5, -55.5], [-38, -51], [-43, -49], [-39, -45.5],
    [-42.5, -41.5], [-37.5, -39.5], [-38.5, -35], [-33, -34], [-31, -29], [-27, -31], [-24.5, -25.5], [-20.5, -27.5], [-17.5, -22], [-13, -24], [-9, -20],
  ]
  const wingL = S(wingLraw)
  const wingR = S(mir(wingLraw))
  // 몸 — 넓은 가슴, 깃털 덮인 다리, 갓돌 앞으로 늘어진 꽁지
  const body = S([[-5, -40], [-9.5, -36], [-11.5, -28], [-10.5, -18], [-8, -9], [-7.5, -3], [-3, -1], [3, -1], [7.5, -3], [8, -9], [10.5, -18], [11.5, -28], [9.5, -36], [5, -40]])
  const tail = S([[-4.5, -3], [-7, 3], [-3.5, 7.5], [0, 8.5], [3.5, 7.5], [7, 3], [4.5, -3]])
  // 머리 — 납작한 정수리, 툭 튀어나온 눈썹뼈, 갈고리 부리 (왼쪽을 본다)
  const head = S([[5, -39], [5.5, -45], [3.5, -50], [-1, -52.5], [-5.5, -51.5], [-8, -49.5], [-8.5, -46], [-6.5, -43], [-4.5, -39.5]])
  const beak = S([[-8, -49.5], [-12, -49.2], [-14.6, -47], [-14.2, -43.6], [-12.6, -44.8], [-11.6, -46.2], [-8.5, -45.6]])
  const wingLd = smooth(wingL, true)
  const wingRd = smooth(wingR, true)
  const bodyD = smooth(body, true)
  const tailD = poly(tail)
  const headD = smooth(head, true)
  const beakD = poly(beak)
  const out = []
  // 날개 깃 결 — 손목에서 깃 끝으로, 둘째 깃 줄
  const featherL = (sgn) => {
    let d = ''
    for (const [p, q] of [[[-27, -52], [-36, -58]], [[-28, -50], [-39, -53]], [[-28, -47], [-40, -47]], [[-27, -44], [-39, -40]], [[-25, -40], [-34, -35]]]) d += line(S([[p[0] * sgn, p[1]], [q[0] * sgn, q[1]]]))
    d += smooth(S([[-11 * sgn, -28], [-18 * sgn, -33], [-26 * sgn, -36], [-33 * sgn, -38]]))
    return d
  }
  // 뒤쪽(오른쪽) 날개 — 그늘 쪽
  out.push(P('fill', wingRd), P('stone', wingRd), P('shade', poly(S(mir([[-13, -24], [-17.5, -22], [-20.5, -27.5], [-24.5, -25.5], [-27, -31], [-31, -29], [-33, -34], [-38.5, -35], [-37.5, -39.5], [-26, -37], [-15, -31]])))))
  out.push(P('hatch', featherL(-1)), P('ink', wingRd))
  out.push(P('fill', wingLd), P('stone', wingLd), P('hatch', featherL(1)), P('ink', wingLd))
  // 꽁지·몸·머리
  out.push(P('fill', tailD), P('stone', tailD), P('hatch', line(S([[-2, -1], [-2.6, 7]])) + line(S([[1.8, -1], [2.2, 7.5]]))), P('ink', tailD))
  out.push(P('fill', bodyD + headD + beakD), P('stone', bodyD + headD))
  out.push(P('shade', smooth(S([[3, -39], [8, -37], [11, -28], [10, -18], [7.5, -9], [7, -3], [4, -2], [4.5, -14], [5, -28]]), true)))
  let breast = ''
  for (const [cy, w] of [[-33, 5], [-27, 6.5], [-21, 6.5], [-15, 5.5]]) for (const cx of [-w / 2, w / 2]) breast += smooth(S([[cx - 2.2, cy - 1], [cx, cy + 1], [cx + 2.2, cy - 1]]))
  // 다리 깃(바지)과 발톱
  breast += smooth(S([[-8, -9], [-6, -6], [-4, -8]])) + smooth(S([[4, -8], [6, -6], [8, -9]]))
  out.push(P('hatch', breast + line(S([[-7.5, -49.8], [-2.5, -50.8]]))))
  out.push(P('dark', ell(x - 4.6, y - 47.6, 1.05, 0.95)))
  out.push(P('ink', line(S([[-7, -1], [-9.5, 2.5]])) + line(S([[-5, -1], [-5.5, 3]])) + line(S([[5, -1], [5.5, 3]])) + line(S([[7, -1], [9.5, 2.5]]))))
  out.push(P('ink', bodyD + headD + beakD + line(S([[-14.2, -46], [-9, -46.4]]))))
  // 오래된 이끼 — 비와 이슬이 앉는 윗면(날개 앞선·어깨·정수리·발치)에 들쭉날쭉한 덩이와 점
  let moss = ''
  let mossDots = ''
  const mrand = rng('eagle-moss')
  for (const [mx, my, mw, mh] of [[-14, -43, 6, 2.2], [-26, -53.5, 4.5, 1.8], [14, -43, 6.5, 2.4], [27, -54, 4.5, 1.8], [-1, -52, 3.2, 1.2], [-6, -1, 4, 1.6], [6, -0.5, 3.4, 1.4]]) {
    const ring = []
    for (let i = 0; i < 11; i++) {
      const ang = (i / 11) * Math.PI * 2
      const k = 0.5 + mrand() * 0.6
      ring.push([x + mx + Math.cos(ang) * mw * k, y + my + Math.sin(ang) * mh * k])
    }
    moss += poly(ring)
    for (let i = 0; i < 3; i++) {
      const dx = mx + (mrand() - 0.5) * mw * 2
      const dy = my + 2 + mrand() * 3
      mossDots += `M${pt([x + dx - 0.45, y + dy])}a0.45 0.45 0 1 0 0.9 0a0.45 0.45 0 1 0 -0.9 0`
    }
  }
  out.push(P('forest', moss), P('hatch', moss + mossDots))
  return out
}

// ---------------------------------------------------------------- 그림 조립
const items = []
const add = (y, parts) => items.push({ y, parts })
const parts = []

// Calcite Flats — 바다와 벼랑 밑 사이, 옅은 점찍기 (평원 대부분은 빈 양피지로)
const STRIP = [...COAST.map(([x, y]) => [x + 10, y]), ...[...FOOT].reverse().map(([x, y]) => [x - 4, y])]
// 그림·이름 자리는 비운다
const KEEP_CLEAR = [
  [411, 278, 80, 70], // 샘
  [322, 170, 30, 52], // Noble Vestige
  [455, 420, 30, 46], // Eternity Vessel
  [392, 568, 56, 34], // Sunspring Expedition
]
const clearOf = (x, y, list = KEEP_CLEAR) => list.every(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1)
const dotKeep = (x, y) => 0.22 + 0.25 * Math.max(0, 1 - (x - xAt(COAST, y)) / 120)
// 사가2 페이즈1 커먼 Cloud Manta 의 그림과 밑의 이름 자리 (그림 x 374–447 · y 541–601, 이름 y ≈ 601–640) — 이 안의 점찍기·덤불은 사가2 페이즈1 에서만 뺀다.
// 점은 다 찍은 뒤 자리로 가른다 (난수 차례는 그대로라 다른 점의 자리·크기는 같다)
const S2_MANTA = [366, 536, 476, 646]
const inS2 = (x, y) => x > S2_MANTA[0] && x < S2_MANTA[2] && y > S2_MANTA[1] && y < S2_MANTA[3]
/** 점찍기 path 를 점마다 갈라 [사가2 자리 밖, 안] 으로 */
function splitDots(d) {
  let out = ''
  let inside = ''
  for (const seg of d.split(/(?=M)/)) {
    if (!seg) continue
    const [x, y] = seg.slice(1).split(/[ a]/).map(Number)
    if (inS2(x, y)) inside += seg
    else out += seg
  }
  return [out, inside]
}
{
  const [dots, dotsP4] = splitDots(stipple(240, -10, 600, 1010, 15, 0.75, (x, y) => (inPoly(x, y, STRIP) && clearOf(x, y) ? dotKeep(x, y) : 0), 'calcite-dots'))
  // 그림 자리(샘 말고 셋)는 페이즈1 에서만 비운다 — 끄면 그 자리도 점찍기로
  const [off, offP4] = splitDots(stipple(240, -10, 600, 1010, 15, 0.75, (x, y) => (inPoly(x, y, STRIP) && clearOf(x, y, KEEP_CLEAR.slice(0, 1)) && !clearOf(x, y, KEEP_CLEAR.slice(1)) ? dotKeep(x, y) : 0), 'calcite-dots'))
  parts.push(P('hatch', dots), { cls: 'hatch', d: dotsP4, phase4: false }, { cls: 'hatch', d: off, phase: false }, { cls: 'hatch', d: offP4, phase: false, phase4: false })
}
// 덤불과 이끼 ('scrub- and lichen-covered calcite flats') — 드문드문
{
  const rand = rng('scrub')
  let d = ''
  let dP4 = ''
  for (let i = 0; i < 70; i++) {
    const y = -5 + rand() * 1005
    const x0 = xAt(COAST, y) + 16
    const x1 = xAt(FOOT, y) - 10
    if (x1 - x0 < 12) continue
    const x = x0 + rand() * (x1 - x0)
    if (!clearOf(x, y) || (y > 280 && y < 470 && x > 345 && x < 480)) continue
    const t = tuft([x, y], 4.5 + rand() * 2.5)
    if (inS2(x, y)) dP4 += t
    else d += t
  }
  parts.push(P('hatch', d), { cls: 'hatch', d: dP4, phase4: false })
}
// 샘 둘레의 무른 땅 ('the ground is particularly unstable around it')
parts.push(...crust(366, 442, 30, 11, 'crust-w'), ...crust(476, 516, 24, 9, 'crust-se'), ...crust(342, 262, 21, 8, 'crust-n'), ...crust(332, 522, 19, 7.5, 'crust-sw'))

// Bulwark 벼랑 면 (바다 쪽으로 떨어지는 가파른 면)
parts.push(...scarp(CREST, faceDepth, 'bulwark-face'))
for (const it of scree('scree')) add(it.y, it.parts)

// 노두 — 평원 북쪽 끝과 남쪽 끝에만 (샘 가까이에는 없다)
// (범위 가장자리의 옅어지는 띠 — 바깥 약 120 단위 — 에 들지 않게 안쪽에 둔다: 반쯤 지워진 덩어리로 보이지 않게)
add(128, outcrop(402, 130, 72, 64, 'oc-n2'))
add(788, outcrop(446, 790, 56, 54, 'oc-s1'))
add(868, outcrop(480, 870, 60, 58, 'oc-s2'))
// 모래에 박힌 헤드론 하나 (Bulwark 너머에서 굴러 떨어진 것)
add(655, [P('shade', ell(474, 662, 20, 3.6)), ...KIT.hedron(472, 650, 17, 38, { grounded: true }), P('hatch', 'M456 662q8 -4 16 -1q8 2 15 -1')])

// Bulwark 마루의 닳은 성벽과 망루 껍데기
add(222, brokenWall([[[548, 224], [572, 214], [596, 218]], [[612, 222], [632, 214]]], 11, 'wall-n'))
add(212, towerShell(662, 214, 16, 32, 'tw-n'))
add(620, brokenWall([[[596, 622], [622, 612], [646, 616]], [[664, 621], [680, 615]]], 11, 'wall-s'))
add(742, towerShell(652, 744, 17, 30, 'tw-s'))

// 오란리프 — 지류, 산호 바위 (사가2 페이즈2 에는 죽은 숲의 흰 바위 — spinyTower·rootArch 안의 LIVE·DEAD)
parts.push(...worldRiver(TRIB))
add(551, spinyTower(1068, 548, 18, 48, 'reef-spire'))
add(548, rootArch(893, 556, 50, 44, 'reef-arch'))

// 중심 그림 — The Sunspring
// 그릇 받침이 표시(411.2, 347.1) 바로 뒤에서 그친다 — 표시는 그릇 앞 모래에, 이름은 그 아래 빈 모래에
add(326, scaleParts(sunspring(411, 326), 411, 326, 1.2))

parts.push(...stack(items))
// 하늘 — 세계 지도의 헤드론 하나 (그림자는 Bulwark 비탈에)
parts.push(...floatHedron(849, 635, 28, 12, 3.8))

// ---------------------------------------------------------------- 지형 기호 (세계 지도의 Bulwark 산 띠와 오란리프)
const CREST_E = CREST.map(([x, y]) => [x + 16, y])
// 아래 가장자리에서는 세계 지도처럼 산 기호가 바닷가까지 내려온다 (벼랑이 사그라든 아래)
const MOUNT_OUTER = [
  ...CREST_E.filter(([, y]) => y < 800),
  [566, 830], [536, 866], [492, 890], [462, 912], [458, 1012],
  [1060, 1012],
  [1046, 963], [1024, 925], [1100, 934], [1190, 940], [1190, 800], [1060, 790], [960, 772], [900, 764],
  [882, 729], [874, 713], [867, 693], [859, 668], [852, 640], [844, 608], [836, 571], [829, 530], [822, 485], [816, 436], [812, 390], [810, 348], [810, 309], [818, 242], [832, 189],
  [900, 176], [1000, 170], [1100, 178], [1190, 172], [1190, -12],
]
/** 기울인 둥근 빈터 — 산 기호를 비울 자리. 네모난 구멍은 깊이 확대하면 곧은 변이 드러난다 */
function oval(cx, cy, rx, ry, rot, seed, n = 18) {
  const c = Math.cos((rot * Math.PI) / 180)
  const sn = Math.sin((rot * Math.PI) / 180)
  return clearing(0, 0, rx, ry, seed, n).map(([x, y]) => [r1(cx + x * c - y * sn), r1(cy + x * sn + y * c)])
}
const MOUNT_HOLES = [
  oval(607, 208, 74, 28, -4, 'mh-wall-n'), // 북쪽 성벽·망루
  oval(640, 612, 58, 24, -4, 'mh-wall-s'), // 남쪽 성벽
  oval(653, 732, 26, 28, 0, 'mh-tower-s'), // 남쪽 망루
  oval(829, 828, 76, 24, 0, 'mh-dread'), // Dread Statuary 이름
  oval(696, 471, 96, 17, 85.6, 'mh-bulwark'), // The Bulwark 이름 (80° 기울인 띠)
]
const FOREST_OUTER = [
  [832, 189], [818, 242], [810, 309], [810, 348], [812, 390], [816, 436], [822, 485], [829, 530], [836, 571], [844, 608], [852, 640], [859, 668], [867, 693], [874, 713], [882, 729], [900, 764],
  [960, 772], [1060, 790], [1190, 800], [1190, 172], [1100, 178], [1000, 170], [900, 176],
]
const FOREST_HOLES = [
  clearing(918, 262, 56, 40, 'clr-timbermaw'),
  clearing(1112, 255, 56, 44, 'clr-recluse'),
  clearing(1012, 345, 62, 40, 'clr-gladehart'),
  clearing(1012, 600, 52, 60, 'clr-vines'),
  clearing(1098, 682, 38, 62, 'clr-survivalist'),
  clearing(893, 545, 40, 30, 'clr-arch'),
  clearing(1068, 536, 20, 36, 'clr-spire'),
]
// 시점별 보기 — FOREST_HOLES 의 앞 다섯(그림 자리) 그대로, 그 카드에 매어
const TIME_CLEAR = ['timbermaw-larva', 'oran-rief-recluse', 'grazing-gladehart', 'vines-of-vastwood', 'oran-rief-survivalist'].map((id, i) => ({ points: FOREST_HOLES[i], for: [id], timeOnly: true }))
/** 남동쪽 구석의 숲 (산 띠 밑) */
const SE_FOREST = [[1024, 925], [1046, 963], [1060, 1012], [1190, 1012], [1190, 940], [1100, 934]]
const TERRAIN = [
  { kind: 'mountain', points: withHoles(MOUNT_OUTER, MOUNT_HOLES), density: 1 },
  // 그림 자리 빈터(앞 다섯)는 페이즈1 에서만 — 끄면 산호 바위 자리만 비운 숲
  // (시점별 보기는 늘 아래의 그림 자리를 채운 숲 — 그 시점에 그리는 그림의 자리만 카드에 매인 빈터 TIME_CLEAR 가 연다)
  { kind: 'forest', points: withHoles(FOREST_OUTER, FOREST_HOLES), density: 0.6, phase: true, time: { t1: false, t2: false } },
  // 숲 칸 둘은 세계 지도의 죽은 오란리프(사가2 페이즈2) 고리 안에 다 든다 — 그 페이즈에서는 끄고 같은 자리의 죽은 숲 칸(끝의 둘)이 대신한다
  { kind: 'forest', points: withHoles(FOREST_OUTER, FOREST_HOLES.slice(5)), density: 0.6, phase: false, ...LIVE, time: { t1: true, t2: true } },
  { kind: 'forest', points: SE_FOREST, density: 0.9, ...LIVE },
  // 사가2 페이즈2 — 죽은 오란리프. 바로 위 숲 칸 둘과 같은 다각형·밀도로 나무를 세워 넷에 하나만 죽은 나무로 남긴다(세계 지도와 같다).
  // 앞 칸들의 시드 번호를 지키려 terrain 끝에 둔다 (산 띠는 그대로 — 세계 지도도 산·언덕은 두고 나무만 죽인다)
  { kind: 'deadwood', points: withHoles(FOREST_OUTER, FOREST_HOLES.slice(5)), density: 0.6, ...DEAD },
  { kind: 'deadwood', points: SE_FOREST, density: 0.9, ...DEAD },
]

/** 바로 이웃한 같은 칠은 한 path 로 — 칠하는 차례는 그대로 */
function compact(list) {
  const out = []
  for (const p of list) {
    if (!p.d) continue
    const last = out[out.length - 1]
    const gates = ['phase', 'phase2', 'phase3', 'phase4', 'phase5'] // src/map/childMapArt.ts 의 PhaseGate (phase4·phase5 는 사가2)
    if (last && last.cls === p.cls && gates.every((g) => last[g] === p[g]) && KIT.sameTimeKeys(last, p)) last.d += p.d
    else out.push({ cls: p.cls, d: p.d, ...Object.fromEntries(gates.filter((g) => p[g] !== undefined).map((g) => [g, p[g]])), ...KIT.timeKeysOf(p) })
  }
  return out
}

CHILDMAPS.push({
  id: 'the-sunspring',
  size: [1182, 1000],
  glyphScale: 4,
  terrain: TERRAIN,
  parts: compact(parts),
  labels: [
    { text: 'Calcite Flats', at: [314, 400], size: 24, kind: 'area', rotate: 82 },
    { text: 'The Bulwark', at: [690, 470], size: 30, kind: 'area', rotate: 80 },
    { text: 'Oran-Rief', textKo: '오란리프', at: [1030, 470], size: 32, kind: 'area' },
  ],
  subjects: {
    'eternity-vessel': { at: [455, 448], size: 60 },
    'noble-vestige': { at: [322, 200], size: 80 },
    'sunspring-expedition': { at: [392, 592], size: 96 },
    'grazing-gladehart': { at: [1020, 347], size: 90 },
    'oran-rief-recluse': { at: [1112, 240], size: 85 },
    'oran-rief-survivalist': { at: [1098, 702], size: 88, moved: { 4: { at: [805, 660] } } },
    'timbermaw-larva': { at: [920, 262], size: 72 },
    'vines-of-vastwood': { at: [1010, 615], size: 85 },
    // 사가2 페이즈1 — Windrider Patrol(BFZ): 오란리프 북쪽 Bulwark 산 위를 북동쪽으로 나는 구름 가오리 탄 인어 척후 (이 지도의 추정)
    'windrider-patrol': { at: [943, 126], size: 88, moved: { 1: { at: [967, 126], label: 'right' }, 2: { at: [967, 126], label: 'right' } } },
    // 사가2 페이즈1 — Cloud Manta(BFZ): Calcite Flats 좁은 띠, 바람의 여신 에메리아의 버려진 인어 사당과 그 위를 맴도는 구름 가오리들 (뒤집음, 이 지도의 추정).
    // 브리프의 (425, 605)보다 조금 서북쪽 — 밑의 이름이 모래에 박힌 헤드론(472, 650)에 걸리지 않게
    'cloud-manta': { at: [412, 600], size: 72.3, flip: true, moved: { 1: { at: [366, 692], label: 'left' } } },
    // 사가2 페이즈1 — Lifespring Druid(BFZ): 오란리프 숲 가장자리, 하얗게 썩은 땅에 두 손을 얹어 새싹을 되돌리는 엘프 드루이드 (이 지도의 추정).
    // 페이즈1까지만 그린다(phase4.ts 의 until: 1 — OGW 무렵 오란리프는 나무도 생물도 사라진 죽은 숲, Ruins of Oran-Rief 칼럼)
    'lifespring-druid': { at: [950, 700], size: 80, moved: { 4: { at: [849, 784], label: 'right' } } },
    // 사가2 페이즈2 커먼(OGW) — 오란리프의 생존술사 욘 바스렐의 두 주문, 이 지도의 추정 자리 (사람은 그리지 않는다)
    // Unnatural Endurance: Bulwark 기슭 숲, 숲을 가로지르는 강 북쪽의 빈 숲에서 베인 몸을 되살리는 엘드라지 드론
    'unnatural-endurance': { at: [1044, 272], size: 62.9 },
    // Boulder Salvo: 강 남쪽, 페이즈1 Lifespring Druid 자리 북동쪽의 빈 숲에 하늘에서 쏟아지는 바위 (드루이드는 이 페이즈에 그리지 않는다)
    'boulder-salvo': { at: [1060, 610], size: 37.7 },
  },
  // 사가2 대상의 빈터 — 그 페이즈에서만 이 안에 밑동이 떨어지는 지형 기호를 뺀다 (STYLE.md)
  clearings: [
    { points: [[884, 88], [1002, 88], [1012, 130], [1012, 192], [874, 192], [874, 130]], phase4: true }, // windrider-patrol (그림 x 892–980 · y 96–161, 밑의 이름)
    { points: [[366, 536], [476, 536], [476, 646], [366, 646]], phase4: true }, // cloud-manta (그림과 밑의 이름 — 이 띠에는 지형 기호가 없지만 자리를 적어 둔다)
    { points: [[904, 652], [996, 652], [1004, 704], [1020, 740], [880, 740], [896, 704]], phase4: true, phase5: false }, // lifespring-druid (숲 기호를 그림과 밑의 이름까지 비운다 — 페이즈1까지만: 숲이 죽은 사가2 페이즈2 에는 그리지 않는다, phase4.ts 의 until: 1)
    // 사가2 페이즈2(OGW) 커먼 — 그림과 밑의 이름 자리
    { points: [[1004, 228], [1084, 228], [1088, 276], [1110, 302], [978, 302], [1000, 276]], phase5: true }, // unnatural-endurance (그림 x 1013–1075 · y 238–276, 이름 y ≈ 276–296)
    { points: [[1034, 566], [1086, 566], [1088, 612], [1108, 636], [1012, 636], [1032, 612]], phase5: true }, // boulder-salvo (그림 x 1041–1079 · y 574–611, 이름 y ≈ 611–630)
    // 시점별 보기 — 사가1 페이즈1 그림 자리 (사가 보기는 숲 칸의 구멍이 비운다)
    ...TIME_CLEAR,
    { points: [[910, 90], [1164, 90], [1164, 167], [910, 167]], movedFor: ['windrider-patrol'] }, // windrider-patrol — 시점별 보기에서 시점 1·2 에만 옮긴 자리 · 2b (그림 x 916–1004 · y 96–161, 오른쪽 이름까지)
    { points: [[704, 570], [915, 570], [915, 720], [704, 720]], movedFor: ['oran-rief-survivalist'] }, // oran-rief-survivalist — 시점별 보기에서 시점 4 에만 옮긴 자리 · 2b (그림 x 784–835 · y 576–664, 밑 이름까지)
    { points: [[803, 738], [1130, 738], [1130, 793], [803, 793]], movedFor: ['lifespring-druid'] }, // lifespring-druid — 시점별 보기에서 시점 4 에만 옮긴 자리 · 2b (그림 x 809–889 · y 744–787, 오른쪽 이름까지)
    { points: [[208, 627], [407, 627], [407, 707], [208, 707]], movedFor: ['cloud-manta'] }, // cloud-manta — 시점별 보기에서 시점 1 에만 옮긴 자리 · 2b (그림 x 328–401 · y 633–693, 왼쪽 이름까지)
  ],
  markAnchors: { 'the-sunspring': 'below', 'card:dread-statuary': 'left' },
  focus: [492, 430],
})
