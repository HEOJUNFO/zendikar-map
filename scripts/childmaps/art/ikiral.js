// Ikiral — 자식 지도 (세지리 남쪽 해안 고원, 세계 범위 x 1255–1510 · y 0–215, ×4.651).
// 시점: 2010년 공식 가이드(PG: Murasa and Sejiri)가 그린 모습. 엘드라지 전쟁(2015) 때 세지리 전체가 유린당했고
// 그 뒤 Ikiral 과 Midnight Pass 가 어떻게 되었는지는 공식 자료에 없다 — 그래서 연기·불빛·사람·썰매도, 폐허·상처도 그리지 않는다.
// 공식: 옆으로 쓰러져 반쯤 묻히고 길이로 쪼개진 헤드론, 그 틈의 바람에 깎인 돌집들(PG 2010) · 대륙을 두른 깎아지른 절벽(PG 2009/2010) ·
//       빛이 거의 들지 않는 좁은 해협 Midnight Pass, 그 깊은 안쪽에 배를 대고 갈지자길·낙석·낭떠러지를 지나 고원으로 오른다(PG 2010) ·
//       바람에 깎인 산, 툰드라와 영구동토 스텝(PG 2009/2010) · 눈사태를 쏟는 떠다니는 돌 '항아리'(PG 2010).
// 세계 지도를 따른 것: 해안·해협 물길, 산 무리, 항아리의 자리(세계 지도 추정), 동북쪽의 산 없는 스텝(세계 지도 추정).
// 해석: 헤드론의 크기·쪼개진 틈의 모양, 돌집의 수와 배치, 배 대는 바위턱의 자리(해협 머리 서쪽), 갈지자길이 오르는 벽과 끝,
//       두 그림의 자리(Brave the Elements 는 갈지자길이 고원에 올라선 곳, Kor Cartographer 는 Ikiral 곁 툰드라).
// 갈지자길은 고원 가장자리에서 끝난다 — Ikiral 로 이어지는 길은 공식 자료에 없어 그리지 않았다.
// Ikiral 표시 이름은 쪼개진 틈 안, 표시의 서쪽(markAnchors 'left')에 앉힌다 — 돌집은 그 자리를 비우고 틈의 동쪽과 서쪽 끝에 모았다.

const { line, poly, smooth, rng, along, offset, stack } = KIT
const r1 = (v) => Math.round(v * 10) / 10
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`
const P = (cls, d) => ({ cls, d })
const ell = (x, y, rx, ry) => `M${pt([x - rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x + rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x - rx, y])}Z`
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

/** Catmull-Rom 을 촘촘한 꺾은선으로 */
function dense(pts, closed = false, per = 4) {
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

// ---------------------------------------------------------------- 세계 지도의 해안 (context.mjs, 자식 좌표 — 앱이 그리는 그대로)
// 서→동. 땅은 진행 방향의 왼쪽(북쪽). 가운데 깊이 파고든 틈이 Midnight Pass, 그 서쪽 남으로 뻗은 혀 모양 땅.
const COAST = [[-29,843],[-16,842],[-3,842],[10,840],[22,837],[34,832],[45,828],[55,825],[64,826],[72,828],[79,832],[85,834],[90,834],[95,834],[100,833],[107,836],[118,841],[131,849],[146,858],[159,864],[171,866],[180,866],[189,864],[196,864],[204,867],[211,872],[217,880],[222,889],[225,899],[226,912],[225,925],[225,936],[225,943],[227,948],[229,951],[231,955],[232,959],[233,964],[234,970],[238,976],[244,982],[254,990],[266,997],[278,1000],[288,1001],[298,999],[306,994],[312,991],[317,990],[321,990],[324,991],[329,991],[336,988],[345,985],[355,979],[364,972],[372,964],[380,955],[387,945],[394,937],[401,930],[409,924],[416,920],[422,915],[425,909],[428,903],[429,896],[432,890],[436,884],[441,879],[449,872],[456,860],[465,844],[475,824],[486,799],[496,771],[506,741],[515,707],[523,672],[532,642],[541,617],[550,598],[559,583],[568,572],[576,565],[582,562],[588,563],[593,565],[596,570],[598,576],[598,584],[596,598],[593,618],[588,643],[582,673],[576,705],[571,739],[567,775],[564,810],[562,837],[562,854],[564,862],[568,864],[575,865],[583,865],[593,864],[604,863],[613,861],[620,858],[625,855],[629,852],[633,851],[638,850],[642,851],[646,852],[652,851],[658,848],[666,843],[675,839],[687,838],[703,841],[721,849],[741,858],[757,864],[768,866],[776,866],[780,863],[785,862],[790,861],[795,862],[801,864],[807,863],[813,861],[820,858],[827,854],[833,852],[839,851],[845,851],[851,852],[857,852],[863,851],[870,847],[877,843],[884,841],[891,839],[898,838],[905,836],[915,832],[926,825],[940,815],[955,803],[968,794],[979,787],[987,782],[994,779],[1000,775],[1005,771],[1010,766],[1014,760],[1021,754],[1029,749],[1039,744],[1051,740],[1064,740],[1080,745],[1098,753],[1117,765],[1133,774],[1145,781],[1155,786],[1162,789],[1169,791],[1178,792],[1187,793],[1197,792],[1206,791],[1214,789]]
// 해협의 가운데 줄기 (머리 → 어귀) — 벼랑 깊이와 물 그늘을 이것으로 잰다
const PASS_AXIS = [[586, 572], [578, 640], [565, 720], [548, 800], [520, 860], [500, 885]]

// ---------------------------------------------------------------- 비워 둘 자리 (이름·그림·주인공 지형지물)
const KEEP = []
const keep = (x0, y0, x1, y1) => KEEP.push([x0, y0, x1, y1])


// ---------------------------------------------------------------- 해안 절벽 — 대륙을 두른 깎아지른 벼랑 (해협 양쪽 벽이 가장 높고 어둡다)
const CD = dense(COAST, false, 3)
const cliffDepth = (p) => {
  const w = clamp(1 - (distTo(p, PASS_AXIS) - 34) / 46, 0, 1)
  // 해협 어귀의 두 모서리는 얕게 — 볼록한 모서리에서 빗금이 엇갈리지 않게
  const corner = Math.min(Math.hypot(p[0] - 564, p[1] - 862), Math.hypot(p[0] - 449, p[1] - 872))
  // 해협 머리(오목한 끝)는 빗금이 부챗살로 벌어지지 않게 조금 얕게
  const head = Math.hypot(p[0] - 588, p[1] - 566)
  return Math.min(21 + 29 * w, 7 + corner * 0.8, 26 + head * 0.45)
}
const coastCliff = (() => {
  const rand = rng('ik-cliff')
  const R = along(CD, 4.2).map(([p]) => p)
  const n = R.length
  let ticks = ''
  const inner = []
  const top = []
  const bot = []
  for (let i = 0; i < n; i++) {
    // 법선은 넓은 창(±4 점)의 방향으로 — 날카로운 모서리에서 빗금이 엇갈리지 않게
    const a = R[Math.max(0, i - 4)]
    const b = R[Math.min(n - 1, i + 4)]
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const nx = (b[1] - a[1]) / l
    const ny = -(b[0] - a[0]) / l
    const [x, y] = R[i]
    const D = cliffDepth([x, y])
    const L = D * (i % 2 ? 0.55 + rand() * 0.35 : 0.92 + rand() * 0.08)
    // 범위 가장자리 쪽으로 갈수록 빗금을 성기게 — 가장자리 띠에서 이어받는 세계 지도의 해안 벼랑(성긴 긴 빗금)에 가깝게
    const edge = Math.min(x, 1186 - x, y, 1000 - y)
    const keepTick = i % 3 === 0 || rand() < clamp((edge - 60) / 200, 0, 1)
    if (keepTick) ticks += line([[x + nx * 1.2, y + ny * 1.2], [x + nx * L, y + ny * L]])
    inner.push([x + nx * D, y + ny * D])
    top.push([x, y])
    bot.push([x + nx * D * 0.5, y + ny * D * 0.5])
  }
  const sm = inner.map((p, i) => {
    const q = inner.slice(Math.max(0, i - 3), i + 4)
    return [q.reduce((s, r) => s + r[0], 0) / q.length, q.reduce((s, r) => s + r[1], 0) / q.length]
  })
  return [P('shade', poly([...top, ...bot.reverse()])), P('hatch', ticks), P('hatch', smooth(sm.filter((_, i) => i % 3 === 0)))]
})()

// ---------------------------------------------------------------- Midnight Pass — 빛이 거의 들지 않는 물, 어귀의 부서지는 물결
const PASS_RING = (() => {
  const i0 = CD.findIndex(([x, y]) => x > 446 && y < 876)
  const i1 = CD.findIndex(([x, y], i) => i > i0 + 10 && x > 566 && y > 862)
  return CD.slice(i0, i1 + 1)
})()
/** 가로줄이 다각형을 자르는 구간들 */
function spans(ring, y) {
  const xs = []
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y) xs.push(xi + ((y - yi) * (xj - xi)) / (yj - yi))
  }
  xs.sort((a, b) => a - b)
  const out = []
  for (let k = 0; k + 1 < xs.length; k += 2) out.push([xs[k], xs[k + 1]])
  return out
}
const passWater = (() => {
  const out = []
  const ring = PASS_RING
  // 가로 빗금만 (겹빗금 없이) — 머리 쪽은 촘촘해 거의 검고, 어귀로 갈수록 성기게 (동판화의 어두운 물)
  // 어귀 쪽으로는 줄이 끊긴 토막이 되어 가다 사라진다 — 어귀를 가로지르는 곧은 끝선 없이 바다(세계 지도의 물)로 넘어간다
  const fr = rng('ik-pass-fade')
  let d = ''
  for (let y = 567.5; y < 872; ) {
    const k = (y - 567) / 305
    const fade = clamp((y - 740) / 125, 0, 1)
    for (const [a, b] of spans(ring, y)) {
      if (b - a <= 6) continue
      if (fade <= 0) {
        d += line([[a + 2.5, y], [b - 2.5, y]])
        continue
      }
      let x = a + 2.5 + fr() * 10 * fade
      while (x < b - 2.5) {
        const len = 6 + fr() * 26 * (1 - fade * 0.6)
        const x2 = Math.min(b - 2.5, x + len)
        if (fr() > fade * 0.85) d += line([[x, y], [x2, y]])
        x = x2 + 3 + fr() * 14 * fade
      }
    }
    y += 2.1 + Math.pow(k, 1.4) * 7.6
  }
  out.push(P('hatch', d))
  // 어귀 — 바다가 좁은 틈으로 부서져 드는 물결 (말린 물마루)
  const rand = rng('ik-surf')
  let surf = ''
  for (const [x, y, s] of [[462, 893, 11], [489, 884, 12], [516, 893, 10], [543, 884, 11], [570, 895, 10], [476, 912, 9], [530, 910, 10], [503, 925, 8], [556, 918, 8]]) {
    const j = (rand() - 0.5) * 3
    surf += `M${pt([x - s, y + j])}Q${pt([x - s * 0.2, y - s * 0.55 + j])} ${pt([x + s * 0.55, y - s * 0.15 + j])}Q${pt([x + s * 0.75, y + s * 0.15 + j])} ${pt([x + s * 0.4, y + s * 0.2 + j])}`
  }
  out.push(P('sea-ink', surf))
  return out
})()

// ---------------------------------------------------------------- 배 대는 바위턱과 갈지자길 (해석: 해협 머리 서쪽 벽 발치의 작은 바위턱 하나 — 부두·배는 그리지 않는다)
const LEDGE_SEG = [[549, 601], [554, 591], [560, 582], [566, 575], [571, 570]]
const LEDGE = [...LEDGE_SEG, ...offset(LEDGE_SEG, -6).reverse()]
const dock = (() => {
  const out = [P('stone', poly(LEDGE)), P('shade', poly([...offset(LEDGE_SEG, -3), ...offset(LEDGE_SEG, -6).reverse()])), P('ink', poly(LEDGE))]
  return out
})()
// 바위턱에서 북서쪽 벽을 갈지자로 올라 고원 가장자리에서 끝난다
const PATH_BASE = [558, 586]
const PATH_N = [-0.74, -0.67] // 벽을 오르는 방향 (땅 쪽 법선)
const PATH_T = [0.67, -0.74]
const PATH = (() => {
  const pts = [PATH_BASE]
  const steps = 5
  const rise = 50
  for (let k = 1; k <= steps; k++) {
    const s = (k / steps) * rise
    const side = k % 2 ? -1 : 1
    const a = k === steps ? 0 : 14
    pts.push([PATH_BASE[0] + PATH_N[0] * s + PATH_T[0] * a * side, PATH_BASE[1] + PATH_N[1] * s + PATH_T[1] * a * side])
  }
  return pts
})()
const onWall = (s, a) => [PATH_BASE[0] + PATH_N[0] * s + PATH_T[0] * a, PATH_BASE[1] + PATH_N[1] * s + PATH_T[1] * a]
const ascent = (() => {
  const out = []
  // 길 밑의 벼랑 빗금을 지운다 (양피지 띠)
  const L = offset(PATH, 2.6)
  const R = offset(PATH, -2.6)
  out.push(P('fill', poly([...L, ...R.reverse()])))
  out.push(...KIT.dashed(PATH, 5, 2.4))
  // 낙석 — 길 곁 벽에 떨어진 돌 무더기 둘, 그 위로 굴러 내린 자국
  const rockA = onWall(17, -27)
  const rockB = onWall(36, 26)
  out.push(P('fill', ell(...rockA, 9, 4.5) + ell(...rockB, 8, 4)))
  out.push(...KIT.rocks(...rockA, 6, 3, 'ik-slide1'), ...KIT.rocks(...rockB, 5.4, 2, 'ik-slide2'))
  let falls = ''
  for (const [r, da] of [[rockA, -3], [rockA, 3], [rockB, 0]]) {
    const p0 = [r[0] + PATH_N[0] * 7 + PATH_T[0] * da, r[1] + PATH_N[1] * 7 + PATH_T[1] * da]
    falls += line([[p0[0] + PATH_N[0] * 9, p0[1] + PATH_N[1] * 9], p0])
  }
  out.push(P('hatch', falls))
  return out
})()

// ---------------------------------------------------------------- Ikiral — 옆으로 쓰러져 반쯤 묻히고 길이로 쪼개진 헤드론, 그 틈의 돌집들
// 세계 지도의 모양을 따른다: 길이 축은 서→동(동쪽 끝이 조금 낮다), 두 쪽(북·남)이 쐐기 틈을 두고 벌어진다. 표시는 틈 한가운데.
const HC = [663, 229]
const HA = (10.3 * Math.PI) / 180
const HL = 142 // 반 길이 (세계 기호의 약 1.6배 — 이 지도의 주인공)
const HW = 40 // 한 쪽의 너비
const GT = 13 // 끝의 틈
const GM = 52 // 허리의 틈 (쐐기 틈이 가장 넓은 곳) — 표시 이름이 틈 안에 들어가게 넉넉히
const WAIST = -6
const H = ([u, v]) => [HC[0] + u * Math.cos(HA) - v * Math.sin(HA), HC[1] + u * Math.sin(HA) + v * Math.cos(HA)]
/** 끝(±tip)과 허리(WAIST)를 잇는 꺾은선의 u 에서의 v */
const vAt = (u, tip, vTip, vWaist) => {
  if (u <= WAIST) return vTip + (vWaist - vTip) * clamp((u + tip) / (WAIST + tip), 0, 1)
  return vTip + (vWaist - vTip) * clamp((tip - u) / (tip - WAIST), 0, 1)
}
const ST = HL * 0.96 // 남쪽 쪽의 끝 (조금 짧다)
const nOut = (u) => vAt(u, HL, -GT / 2, -GM / 2 - HW)
const nIn = (u) => vAt(u, HL, -GT / 2, -GM / 2)
const nRid = (u) => vAt(u, HL, -GT / 2, -GM / 2 - HW * 0.45)
const sIn = (u) => vAt(u, ST, GT / 2, GM / 2)
const sOut = (u) => vAt(u, ST, GT / 2, GM / 2 + HW)
const sRid = (u) => vAt(u, ST, GT / 2, GM / 2 + HW * 0.48)
const ikiral = (() => {
  const out = []
  // 쪼개진 면 — 틈 쪽 가장자리는 깨진 돌처럼 들쭉날쭉
  const jag = (f, tip, seed) => {
    const rr = rng(seed)
    const pts = []
    for (let u = -tip; u <= tip + 0.1; u += 6) {
      const end = Math.min(1, (u + tip) / 14, (tip - u) / 14)
      pts.push([u, f(u) + (rr() - 0.5) * 3.4 * end])
    }
    return pts
  }
  const JN = jag(nIn, HL, 'ik-jn')
  const JS = jag(sIn, ST, 'ik-js')
  const N = [H([-HL, -GT / 2]), H([WAIST, -GM / 2 - HW]), H([HL, -GT / 2]), ...JN.slice(1, -1).reverse().map(H)]
  const S = [H([-ST, GT / 2]), ...JS.slice(1, -1).map(H), H([ST, GT / 2]), H([WAIST, GM / 2 + HW])]
  const RN = [[-HL, -GT / 2], [WAIST, -GM / 2 - HW * 0.45], [HL, -GT / 2]].map(H)
  const RS = [[-ST, GT / 2], [WAIST, GM / 2 + HW * 0.48], [ST, GT / 2]].map(H)
  // 틈 바닥 — 두 쪽 사이의 그늘진 땅
  const gap = [...JN.map(H), ...[...JS].reverse().map(H)]
  out.push(P('fill', poly(gap)), P('shade', poly(gap)))
  // 두 쪽 — 돌. 햇빛은 북서쪽에서: 북쪽 쪽의 틈 쪽 면과 남쪽 쪽의 바깥 면이 그늘
  out.push(P('stone', poly(N) + poly(S)))
  out.push(P('shade', poly([RN[0], RN[1], RN[2], ...JN.slice(1, -1).reverse().map(H)]) + poly([RS[0], RS[1], RS[2], H([WAIST, GM / 2 + HW])])))
  let hatch = ''
  for (let u = -HL + 10; u < HL - 6; u += 7) {
    const a = nRid(u) + 1.6
    const b = nIn(u) - 1.4
    if (b - a > 3) hatch += line([H([u, a]), H([u - 2.5, b])])
  }
  for (let u = -ST + 8; u < ST - 6; u += 6) {
    const a = sRid(u) + 1.6
    const b = sOut(u) - 1.4
    if (b - a > 3) hatch += line([H([u, a]), H([u - 3, b])])
  }
  // 바깥 면의 결 — 긴 금 몇 줄 (바람에 깎인 돌)
  hatch += line([H([-70, nOut(-70) + 7]), H([-30, nOut(-30) + 8])]) + line([H([30, nOut(30) + 9]), H([62, nOut(62) + 6])])
  out.push(P('hatch', hatch))
  out.push(P('ink', line(RN) + line(RS)))
  out.push(P('ink-bold', poly(N) + poly(S)))
  // 반쯤 묻힘 — 남쪽 쪽의 아랫면을 가로지르는 하나의 눈·동토 선. 선 아래는 양피지로 덮어 땅에 잠긴 것처럼,
  // 선은 두 끝에서 땅의 선으로 조금 이어진다 (부서진 돌·잔해처럼 보이지 않게 매끈하게)
  {
    const top = []
    const foot = []
    const n = 28
    const a = -ST - 4
    const b = ST + 2
    for (let i = 0; i <= n; i++) {
      const u = a + ((b - a) * i) / n
      const t = i / n
      const depth = HW * 0.42 * Math.pow(Math.sin(t * Math.PI), 0.55) * (1 + 0.12 * Math.sin(t * 9.4 + 0.8))
      const base = clamp(u, -ST, ST)
      top.push(H([u, sOut(base) - depth + 1.5]))
      foot.push(H([u, sOut(base) + 9]))
    }
    out.push(P('fill', poly([...top, ...[...foot].reverse()])))
    out.push(P('ink', smooth(top)))
    // 땅의 선 — 두 끝 너머로 이어진다
    const ground = line([H([-ST - 34, sOut(-ST) + 3]), H([-ST - 6, sOut(-ST) + 1])]) + line([H([ST + 4, sOut(ST) + 1]), H([ST + 30, sOut(ST) + 3.5])])
    out.push(P('hatch', ground))
  }
  // 틈 속 돌집 — 낮고 평평한 지붕의 바람에 깎인 돌 덩이들이 틈의 넓은 가운데에 모여 있다. 표시 곁은 비운다
  const homes = []
  const spots = [
    // [u, 틈 안 깊이(0 북쪽 벽 ~ 1 남쪽 벽), 너비, 높이] — 표시의 서쪽(이름 자리, u -64 ~ -2)은 비운다
    [-96, 0.5, 9, 6], [-82, 0.62, 11, 7],
    [16, 0.3, 11, 7], [31, 0.34, 12, 8], [47, 0.4, 10, 6],
    [14, 0.86, 12, 8], [29, 0.88, 13, 8], [45, 0.86, 11, 7], [62, 0.66, 10, 6],
  ]
  for (const [u, t, w, h] of spots) {
    const v = nIn(u) + (sIn(u) - nIn(u)) * t
    const [x, y] = H([u, v])
    const parts = KIT.house(x, y, w, h, { roof: 'hip', roofH: 2.2, door: w >= 11 }).map((p) => (p.cls === 'fill' ? P('stone', p.d) : p))
    homes.push({ y, parts: [P('fill', parts[0].d), ...parts] })
  }
  out.push(...stack(homes))
  return out
})()
keep(482, 156, 842, 300)

// ---------------------------------------------------------------- 떠다니는 돌 항아리 — 세계 지도 기호(sejiri-urn-ridge)의 큰 꼴
// 그림자는 세계 지도의 자리, 항아리는 그 위에 떠 오른쪽으로 기울어 눈사태를 쏟는다
const URN = [132, 234]
const urn = (() => {
  const s = 4.8
  const lift = 10.5
  const [x0, y0] = URN
  const T = (35 * Math.PI) / 180
  const tc = Math.cos(T)
  const ts = Math.sin(T)
  const G = (u, v) => [x0 + u * s, y0 + v * s]
  const R = (u, v) => G(u * tc - v * ts, -lift + u * ts + v * tc)
  const body = poly([R(-2.5, -5.4), R(2.5, -5.4), R(2.1, -4.5), R(1.6, -4.1)]).slice(0, -1) +
    `C${pt(R(4.7, -3.1))} ${pt(R(5.1, 2.3))} ${pt(R(2, 4.4))}L${pt(R(2.3, 5.3))}L${pt(R(-2.3, 5.3))}L${pt(R(-2, 4.4))}C${pt(R(-5.1, 2.3))} ${pt(R(-4.7, -3.1))} ${pt(R(-1.6, -4.1))}L${pt(R(-2.1, -4.5))}Z`
  const shadeSide = `M${pt(R(0.6, -4.1))}L${pt(R(1.6, -4.1))}C${pt(R(4.7, -3.1))} ${pt(R(5.1, 2.3))} ${pt(R(2, 4.4))}L${pt(R(2.3, 5.3))}L${pt(R(0.6, 5.3))}Z`
  let hatch = `M${pt(R(-4, -1.2))}Q${pt(R(0, 0.2))} ${pt(R(4, -1.2))}M${pt(R(-2.1, -4.5))}L${pt(R(2.1, -4.5))}`
  for (const [u, l] of [[1, 3], [2.2, 2.8], [3.3, 2.2]]) hatch += `M${pt(R(u, 0.2))}L${pt(R(u - 0.2, 0.2 + l))}`
  const lipL = R(-2.3, -5.6)
  const lipR = R(2.3, -5.6)
  // 눈사태 — 아가리에서 넘쳐 몸통 오른쪽으로 쏟아져 땅의 눈 무더기로 (끝은 눈보라)
  // 아가리 바깥 끝에서 위로 넘쳐 오른쪽으로 휘어 떨어지며 넓게 퍼진다
  const outer = `M${pt(lipL)}C${pt([lipL[0] + 3.2 * s, lipL[1] - 2.6 * s])} ${pt(G(9.6, -16.4))} ${pt(G(10.8, -11.6))}Q${pt(G(12.4, -5.4))} ${pt(G(15, 0.4))}`
  const innerD = `M${pt(lipR)}Q${pt(G(7.4, -9.6))} ${pt(G(7, -5))}L${pt(G(5.8, 0.8))}`
  const spill = outer + `L${pt(G(13.4, 1))}L${pt(G(12.2, 0))}L${pt(G(10.8, 1.2))}L${pt(G(9.4, 0.1))}L${pt(G(8, 1.2))}L${pt(G(6.8, 0.2))}L${pt(G(5.8, 0.8))}L${pt(G(7, -5))}Q${pt(G(7.4, -9.6))} ${pt(lipR)}Z`
  let flow = ''
  for (const [u, v, du, dv] of [[6.4, -13.6, 1.6, 3.2], [8.8, -12.4, 0.9, 4.2], [9.6, -8.6, 1, 4.8], [8.2, -6.4, 0.4, 4.2], [11.2, -7, 1.4, 4.8], [10.4, -3.6, 0.9, 3.2], [12.6, -3, 1.2, 2.8]]) flow += line([G(u, v), G(u + du, v + dv)])
  // 땅에 쌓인 눈 무더기
  const cone = `M${pt(G(4.4, 2.2))}Q${pt(G(5.6, 0.2))} ${pt(G(7.4, 0.4))}Q${pt(G(8.8, -1.4))} ${pt(G(10.8, -0.5))}Q${pt(G(12.4, -1))} ${pt(G(13.8, 0.5))}Q${pt(G(15.8, 0.7))} ${pt(G(17, 2.4))}`
  let powder = ''
  for (const [u, v] of [[8.3, -2.0], [9.8, -1.6], [11.4, -2.2], [12.8, -1.2], [14.1, -0.4], [10.6, 0.6], [12.6, 1.2], [7.6, -0.9]]) powder += ell(...G(u, v), 0.9, 0.9)
  return [
    P('shade', ell(...G(1.8, 1.2), 5.5 * s, 1.5 * s)),
    P('fill', spill),
    P('hatch', flow),
    P('ink', outer + innerD),
    P('ink', cone),
    P('dark', powder),
    P('stone', body),
    P('shade', shadeSide),
    P('hatch', hatch),
    P('ink-bold', body),
  ]
})()
keep(95, 140, 215, 250)

// ---------------------------------------------------------------- 산 무리 (세계 지도의 산 기호 자리 — 이름 없음)
const MTN_TONGUE = [[205, 610], [330, 598], [440, 610], [466, 655], [455, 720], [432, 785], [388, 845], [340, 890], [282, 900], [248, 860], [205, 760]]
const MTN_NW = [[-40, -40], [240, -40], [236, 80], [180, 118], [80, 150], [-40, 175]]

// ---------------------------------------------------------------- 이름과 그림의 자리
const SUBJECTS = {
  'brave-the-elements': { at: [446, 470], size: 96 },
  'kor-cartographer': { at: [778, 410], size: 96 },
}
const LABELS = [
  // 해협 안, 물길을 따라 — 어귀 밖 바다는 아래 가장자리 띠(y ≥ 888)라 이름이 옅어진다
  { text: 'Midnight Pass', at: [547, 792], size: 24, kind: 'water', rotate: -77 },
]
keep(388, 410, 500, 540) // Brave the Elements 와 이름
keep(720, 314, 822, 436) // Kor Cartographer 와 이름
keep(600, 210, 662, 240) // Ikiral 이름 (왼쪽, 틈 안)
keep(500, 520, 600, 610) // 갈지자길·바위턱
// 툰드라 칸의 구멍 — 위 자리들을 서로·산 무리·스텝과 겹치지 않게 다듬은 것 (Ikiral 이름 자리는 헤드론 자리에 든다)
// 갈지자길·바위턱은 해안 벼랑 띠 안이라 칸 밖 — 구멍은 고원 가장자리의 길 끝만 (칸 밖으로 나간 구멍은 도리어 칠해진다)
const TUNDRA_KEEP = [[482, 156, 830, 300], [95, 150, 215, 250], [388, 410, 500, 540], [720, 314, 810, 436], [502, 500, 532, 542]]

// ---------------------------------------------------------------- 툰드라 — 세계 지도와 같은 'tundra' 칸 (같은 기호·크기·간격·빛깔, 서리 점)
// 세계 지도처럼 영구동토 스텝(sejiri-tundra-steppe, 밀도 1.3) 안은 14g/√1.3, 그 밖 세지리 땅은 19g 간격(밀도 (14/19)² ≈ 0.54).
// 어느 확대 단계에서도 세계 지도의 풀포기와 크기·밀도가 같아 범위 가장자리 띠에서 선이 드러나지 않는다.
// 바깥 칸: 해안 벼랑 안쪽(벼랑 깊이 + 6)으로 들인 땅 — 산 무리·스텝·비워 둘 자리는 구멍(서로 겹치지 않게)
const STEPPE = [[857.6, -67], [1181.3, -78.1], [1516.2, -55.8], [1627.8, 55.8], [1583.2, 223.2], [1505.1, 368.4], [1404.6, 491.1], [1248.3, 636.3], [1080.9, 636.3], [930.2, 703.2], [835.3, 602.8], [813, 435.3], [835.3, 223.2]]
const TUNDRA_LAND = (() => {
  // 해안을 땅 쪽으로 벼랑 깊이 + 6 만큼 — 넓은 창의 법선으로, 고르게 다듬어 꼬이지 않게
  const R = along(CD, 8).map(([p]) => p)
  const n = R.length
  const inset = R.map(([x, y], i) => {
    const a = R[Math.max(0, i - 3)]
    const b = R[Math.min(n - 1, i + 3)]
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const d = cliffDepth([x, y]) + 6
    return [x + ((b[1] - a[1]) / l) * d, y - ((b[0] - a[0]) / l) * d]
  })
  const sm = inset.map((p, i) => {
    const q = inset.slice(Math.max(0, i - 2), i + 3)
    return [q.reduce((s, r) => s + r[0], 0) / q.length, q.reduce((s, r) => s + r[1], 0) / q.length]
  })
  return sm
})()
const OUTER = [[-60, TUNDRA_LAND[0][1]], ...TUNDRA_LAND, [1250, TUNDRA_LAND[TUNDRA_LAND.length - 1][1]], [1250, -60], [-60, -60]]
const keepRing = ([x0, y0, x1, y1]) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
const withHoles = (outer, holes) => [...outer, outer[0], ...holes.flatMap((h) => [...h, h[0], outer[0]])]
const TUNDRA_HOLES = [STEPPE, MTN_TONGUE, MTN_NW, ...TUNDRA_KEEP.map(keepRing)]
const parts = [...coastCliff, ...passWater, P('ink-bold', smooth(COAST)), ...dock, ...ascent, ...urn, ...ikiral]

CHILDMAPS.push({
  id: 'ikiral',
  size: [1186, 1000],
  glyphScale: 4,
  terrain: [
    { kind: 'tundra', points: withHoles(OUTER, TUNDRA_HOLES), density: (14 / 19) ** 2 },
    { kind: 'tundra', points: STEPPE, density: 1.3 },
    { kind: 'snow', points: MTN_TONGUE, density: 1 },
    { kind: 'snow', points: MTN_NW, density: 1 },
  ],
  parts,
  labels: LABELS,
  subjects: SUBJECTS,
  markAnchors: { ikiral: 'left' },
  focus: [606, 470],
})
