// 뒤엉킨 계곡 (Tangled Vales) — 발라 게드 남부, 조라가 엘프의 옛 터전. Zendikar Rising(2020) 이후의 모습.
// 공식 근거: 숲이 '마법만이 낼 수 있는 속도로' 되살아나는 발라 게드(Episode 5, 2020), 대지 카드 '뒤엉킨 계곡'
// (ZNR #211) 그림의 들꽃 깔린 숲 빈터와 쓰러진 헤드론 두 개(이 지도의 중심), 2024년 '발라 게드의 늪에 돌아온 생명'
// (Sanguine Syphoner) — Bojuka Bay 기슭의 좁은 늪 가장자리로. 만을 두른 절벽(PG: Bala Ged, 2009 'the surrounding cliffs')은
// 세계 지도(src/data/landscape/bala-ged.ts 의 bojuka-cliffs-southwest)와 같은 자리에 — 바위 지형이라 침공 뒤에도 남은 것으로 본다.
// 이 지도의 해석: 숲의 짙고 옅음(북쪽이 Guum Wilds 쪽으로 짙다), 빈터들과 헤드론 빈터의 자리, 늪 가장자리(절벽 위), 니사의 자리.
// 그리지 않는 것(브리프 mustNotInvent): 2009년의 가파른 언덕과 Umung River 의 물길(2015–16년에 하얀 먼지가 되었고
// 되살아났다는 서술이 없다), 만의 폭포, 조라가 마을·천막·화덕·길·덫, bloodbriar, 다른 생물, 하얀 오염지.

const K = KIT
const part = (cls, d) => ({ cls, d })
const r1 = (v) => Math.round(v * 10) / 10
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

// ── 세계 지도에서 온 고정 지형 (context.mjs) — 기호를 땅 위에만 두려고 경계를 여기서 잡는다 ──
// 남동쪽 해안에서 45 안쪽 선 (나무가 바다에 넘치지 않고 해안에 엷은 띠가 남게)
const COAST_IN = [[1390, 665], [1349, 687], [1328, 702], [1291, 723], [1252, 752], [1215, 788], [1189, 815], [1168, 831], [1157, 838], [1143, 842], [1120, 844], [1080, 847], [1043, 859], [1014, 878], [993, 898], [974, 922], [961, 949], [953, 974], [949, 997], [943, 1009], [938, 1045]]
// Bojuka Bay 서쪽 기슭에서 30 안쪽 선(늪 가장자리의 물가 쪽)과 늪 띠의 안쪽 선
const BOG_SHORE = [[1262, -5], [1252, 18], [1246, 43], [1245, 63], [1246, 83], [1254, 103], [1265, 118], [1272, 128], [1276, 140], [1278, 151], [1277, 163], [1272, 177], [1268, 202], [1271, 225], [1280, 248], [1292, 272], [1309, 295], [1318, 312]]
const BOG_INNER_N = [[1183, -40], [1183, -2], [1176, 36], [1175, 63], [1180, 100], [1192, 135], [1203, 165], [1200, 203], [1206, 243], [1212, 262]]
const BOG_INNER_S = [[1212, 262], [1218, 277], [1236, 309], [1262, 334], [1300, 344], [1318, 312]]
// Bojuka Bay 의 절벽 가장자리 — 세계 지도 bojuka-cliffs-southwest 의 자리를 이 축척으로 옮겨, 늪 띠의 물가 쪽 선(BOG_SHORE)
// 바로 바깥에 둔다. 남쪽 기슭은 서쪽으로, 서쪽 기슭은 북쪽으로 그어 빗금이 진행 방향 오른쪽(만 쪽)으로 떨어진다
const BAY_CLIFF = [[1440, 368], [1400, 352], [1360, 330], [1330, 312], [1312, 290], [1296, 268], [1284, 246], [1278, 224], [1276, 200], [1280, 176], [1284, 154], [1283, 132], [1276, 116], [1264, 100], [1254, 82], [1252, 60], [1253, 38], [1258, 16], [1266, -4], [1280, -24], [1300, -38], [1340, -48], [1380, -50]]

// ── 작은 도구 ──
/** 짝홀 규칙의 점-다각형 판정 (앱의 pointInRing 과 같다) */
function inside([x, y], ring) {
  let c = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}
/** 불규칙한 둥근 고리 — 빈터 모양 */
function blob(cx, cy, rx, ry, seed, n = 18, wob = 0.17) {
  const rand = K.rng(seed)
  const raw = Array.from({ length: n }, () => 1 + (rand() - 0.5) * 2 * wob)
  const sm = raw.map((v, i) => (raw[(i + n - 1) % n] + 2 * v + raw[(i + 1) % n]) / 4)
  return sm.map((k, i) => {
    const a = (i / n) * Math.PI * 2
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]
  })
}
/** 구멍 뚫린 기호 밭 — 바깥 고리에 구멍마다 갔다 오는 다리를 놓는다 (짝홀 규칙이라 다리는 지워진다) */
function withHoles(outer, holes) {
  const ring = [...outer, outer[0]]
  for (const h of holes) ring.push(...h, h[0], outer[0])
  return ring
}
/** 둥근 모서리 사각형 고리 — 글자 자리 */
function box(x0, y0, x1, y1, r = 14) {
  const out = []
  const corners = [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]]
  for (const [cx, cy, a0] of corners) for (let k = 0; k <= 3; k++) {
    const a = ((a0 + k * 30) * Math.PI) / 180
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return out
}
/** 다각형 안에 서로 spacing 만큼 떨어진 점들 (던지기 표본) */
function scatter(ring, spacing, seed, ok = () => true, tries = 5000) {
  const rand = K.rng(seed)
  const xs = ring.map((p) => p[0])
  const ys = ring.map((p) => p[1])
  const x0 = Math.min(...xs)
  const y0 = Math.min(...ys)
  const w = Math.max(...xs) - x0
  const h = Math.max(...ys) - y0
  const pts = []
  for (let i = 0; i < tries; i++) {
    const p = [x0 + rand() * w, y0 + rand() * h]
    if (!inside(p, ring) || !ok(p)) continue
    if (pts.some((q) => (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 < spacing * spacing)) continue
    pts.push(p)
  }
  return pts.sort((a, b) => a[1] - b[1])
}
const inBox = ([x, y], [x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1

/** 풀포기 — 가는 잎 세 가닥 (늪 기호의 풀잎보다 작고 물결 없이) */
function tuft(x, y, s, rand) {
  const lean = (rand() - 0.5) * s * 0.35
  return (
    K.line([[x, y], [x + lean, y - s]]) +
    K.line([[x - s * 0.12, y], [x - s * 0.5 + lean * 0.4, y - s * 0.6]]) +
    K.line([[x + s * 0.12, y], [x + s * 0.5 + lean * 0.4, y - s * 0.62]])
  )
}
/** 들꽃 — 작은 둥근 점 */
const speck = (x, y, r) => `M${pt([x - r, y])}a${r1(r)} ${r1(r)} 0 1 0 ${r1(2 * r)} 0a${r1(r)} ${r1(r)} 0 1 0 ${r1(-2 * r)} 0Z`
/** 들꽃 무리 — 작은 점들을 길쭉하게 흩는다. 흰 꽃(fill)이 대부분, 노란 꽃(gold)은 드문 강조 — 테두리 없이, 카드의 풀밭처럼 */
function drift(x, y, n, rand, spread = 12) {
  let gold = ''
  let pale = ''
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2
    const d = Math.sqrt(rand()) * spread
    const r = 1.25 + rand() * 0.8
    const dot = speck(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.5, r)
    if (rand() < 0.3) gold += dot
    else pale += dot
  }
  return [gold, pale]
}

/** 볼록 다각형에서 땅선 G(x) 위쪽만 남긴다 — 세로로 잘라 윗변·아랫변을 따라가므로 땅선이 물결져도 된다 */
function aboveGround(poly, G, step = 2.2) {
  const xs = poly.map((p) => p[0])
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  const n = Math.max(2, Math.ceil((x1 - x0) / step))
  const runs = []
  let cur = null
  for (let i = 0; i <= n; i++) {
    const gx = x0 + ((x1 - x0) * i) / n
    let lo = Infinity
    let hi = -Infinity
    for (let k = 0; k < poly.length; k++) {
      const a = poly[k]
      const b = poly[(k + 1) % poly.length]
      if ((a[0] - gx) * (b[0] - gx) > 0) continue
      const yy = a[0] === b[0] ? Math.min(a[1], b[1]) : a[1] + ((b[1] - a[1]) * (gx - a[0])) / (b[0] - a[0])
      const yb = a[0] === b[0] ? Math.max(a[1], b[1]) : yy
      lo = Math.min(lo, yy)
      hi = Math.max(hi, yb)
    }
    const bot = Math.min(hi, G(gx))
    if (lo < Infinity && bot > lo + 0.05) {
      if (!cur) runs.push((cur = { top: [], bot: [] }))
      cur.top.push([gx, lo])
      cur.bot.push([gx, bot])
    } else cur = null
  }
  return runs.map((r) => K.poly([...r.top, ...r.bot.reverse()])).join('')
}
/** 선분에서 땅선 위쪽만 */
function lineAbove(a, b, G) {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.8))
  let d = ''
  let run = []
  for (let i = 0; i <= n; i++) {
    const p = lerp(a, b, i / n)
    if (p[1] < G(p[0])) run.push(p)
    else {
      if (run.length > 1) d += K.line(run)
      run = []
    }
  }
  return run.length > 1 ? d + K.line(run) : d
}

/**
 * 쓰러진 헤드론 — 세계 지도 헤드론(길쭉한 팔면체)을 옆에서 본 모습으로 기울어 누웠다. 아래 끝만 풀에 묻히고,
 * 낮은 쪽 모서리를 풀포기와 들꽃이 덮는다 (카드 ZNR #211 그림).
 * (x, y) 가운데, len 반 길이, rot 은 KIT.hedron 과 같은 회전, sink 는 아래에서부터 묻히는 높이의 몫.
 * 빛은 위(왼쪽 위)에서 — 하늘을 향한 쪽 두 면은 양피지(fill), 땅을 향한 쪽 두 면은 stone 에 능선과 나란한 해칭.
 * 너비는 세계 지도 헤드론(KIT.hedron)과 같은 몫이라 두 끝이 뾰족한 긴 돌로 읽힌다 (넓으면 배 모양이 된다).
 * 앞 꼭짓점(능선)은 그늘 쪽으로 절반쯤 치우쳐 밝은 윗면이 넓고 어두운 밑면은 좁다. 새긴 룬은 세계 지도 헤드론의 꺾인 선을 겹으로.
 */
function fallenHedron(x, y, len, rot, sink, seed) {
  const rand = K.rng(seed)
  const wid = len * 0.36
  const g = len * 0.08
  const c = Math.cos((rot * Math.PI) / 180)
  const s = Math.sin((rot * Math.PI) / 180)
  const T = ([px, py]) => [x + px * c - py * s, y + px * s + py * c]
  // 바탕 +x 쪽이 하늘(빛)을 향하면 1
  const up = c * -0.6 + s * -0.8 > 0 ? 1 : -1
  const top = T([0, -len])
  const bot = T([0, len * 0.92])
  const U = T([wid * up, g])
  const D = T([-wid * up, g])
  const C = T([-wid * 0.5 * up, g])
  const ys = [top, U, bot, D].map((p) => p[1])
  const groundY = Math.max(...ys) - sink * (Math.max(...ys) - Math.min(...ys))
  const ph = rand() * 6
  const G = (gx) => groundY + 1.6 * Math.sin(gx / 4.3 + ph) + 1.1 * Math.sin(gx / 1.9 + ph * 2)
  const lit = aboveGround([top, U, C], G) + aboveGround([C, U, bot], G)
  const dark = aboveGround([top, C, D], G) + aboveGround([D, C, bot], G)
  let hatch = ''
  for (const u of [0.25, 0.5, 0.75]) hatch += lineAbove(lerp(C, D, u), lerp(top, D, u * 0.94), G) + lineAbove(lerp(C, D, u), lerp(bot, D, u * 0.94), G)
  let rune = ''
  for (const k of [0.32, 0.42]) {
    const m = T([wid * (k + 0.1) * up, g * 0.4])
    rune += lineAbove(T([wid * k * up, -len * 0.55]), m, G) + lineAbove(m, T([wid * k * up, len * 0.45]), G)
  }
  const sil = lineAbove(top, U, G) + lineAbove(U, bot, G) + lineAbove(bot, D, G) + lineAbove(D, top, G)
  const edges = lineAbove(top, C, G) + lineAbove(C, bot, G) + lineAbove(U, C, G) + lineAbove(C, D, G)
  // 몸이 땅에 닿는 곳(묻힌 끝과 밑 꼭짓점 사이)을 따라 풀포기를 촘촘히, 들린 끝 밑은 드문드문 — 들꽃은 몇 송이만
  const ring = [top, U, bot, D]
  const xs = ring.map((p) => p[0])
  let grass = ''
  let gold = ''
  let pale = ''
  for (let gx = Math.min(...xs) - 5; gx <= Math.max(...xs) + 5; gx += 4 + rand() * 2.5) {
    let under = -Infinity
    for (let k = 0; k < 4; k++) {
      const a = ring[k]
      const b = ring[(k + 1) % 4]
      if ((a[0] - gx) * (b[0] - gx) > 0 || a[0] === b[0]) continue
      under = Math.max(under, a[1] + ((b[1] - a[1]) * (gx - a[0])) / (b[0] - a[0]))
    }
    const gy = G(gx)
    const touching = under > gy - 7
    if (!touching && rand() > 0.16) continue
    grass += tuft(gx + (rand() - 0.5) * 3, gy + 2 + rand() * 3, 5 + rand() * 4.5, rand)
    if (touching && rand() < 0.45) {
      const [a, b] = drift(gx + 1, gy + 5, 1 + Math.floor(rand() * 2), rand, 6)
      gold += a
      pale += b
    }
  }
  return [part('fill', lit), part('stone', dark), part('hatch', hatch + rune), part('ink', edges), part('ink-bold', sil), part('hatch', grass), part('gold', gold), part('fill', pale)]
}

/**
 * 큰 나무 — KIT.tree 의 잎 덩어리 셋을 그대로, 줄기는 채운 키 큰 줄기로 (카드의 '키 큰 줄기').
 * o.lift 로 잎을 더 높이 올리면 줄기와 가지도 같이 길어져 잎이 줄기 위에 떠 보이지 않는다.
 */
function bigTree(x, y, h, seed, o = {}) {
  const rand = K.rng(seed)
  const cw = h * 0.42
  const tw = h * 0.045
  const lift = o.lift ?? 0.1
  const rise = (lift - 0.1) * h
  const ty = y - h * 0.56 - rise
  const trunk = `M${pt([x - tw * 1.9, y])}Q${pt([x - tw * 0.95, y - h * 0.03])} ${pt([x - tw, y - h * 0.12])}L${pt([x - tw * 0.7, ty])}L${pt([x + tw * 0.7, ty])}L${pt([x + tw, y - h * 0.12])}Q${pt([x + tw * 0.95, y - h * 0.03])} ${pt([x + tw * 1.9, y])}Z`
  const shade = K.poly([[x + tw * 0.15, y], [x + tw * 0.1, ty], [x + tw * 0.7, ty], [x + tw, y - h * 0.12], [x + tw * 1.5, y]])
  const bark = K.line([[x + tw * 0.55, y - h * 0.04], [x + tw * 0.45, y - h * 0.3]])
  const branch = K.line([[x + tw * 0.4, y - h * 0.4 - rise], [x + h * 0.11, y - h * 0.55 - rise]]) + K.line([[x - tw * 0.4, y - h * 0.46 - rise], [x - h * 0.09, y - h * 0.58 - rise]])
  const parts = [part('fill', trunk), part('shade', shade), part('hatch', bark), part('ink', trunk + branch)]
  const lobes = [[0, -h * (0.74 + lift), cw * 0.6], [-cw * 0.44, -h * (0.55 + lift), cw * 0.48], [cw * 0.46, -h * (0.56 + lift), cw * 0.5]]
  for (const [dx, dy, rr] of lobes) {
    const r = rr * (0.92 + rand() * 0.16)
    const d = `M${pt([x + dx - r, y + dy])}A${r1(r)} ${r1(r * 0.9)} 0 1 0 ${pt([x + dx + r, y + dy])}A${r1(r)} ${r1(r * 0.9)} 0 1 0 ${pt([x + dx - r, y + dy])}Z`
    const hatch = K.line([[x + dx + r * 0.35, y + dy - r * 0.1], [x + dx + r * 0.2, y + dy + r * 0.45]]) + K.line([[x + dx + r * 0.62, y + dy - r * 0.05], [x + dx + r * 0.48, y + dy + r * 0.4]])
    parts.push(part('fill', d), part('forest', d), part('hatch', hatch), part('ink', d))
  }
  return parts
}

// ── 글자 자리 (공식 이름만) ──
const LABEL_TV = { text: 'Tangled Vales', textKo: '뒤엉킨 계곡', at: [690, 440], size: 36, kind: 'area' }
const LABEL_GW = { text: 'Guum Wilds', at: [740, 154], size: 26, kind: 'area' }
const LABEL_BB = { text: 'Bojuka Bay', at: [1328, 150], size: 20, kind: 'water', rotate: 78 }

// ── 빈터 (이 지도의 해석) ──
// 중심 빈터 — 쓰러진 헤드론 둘, 서쪽 가장자리에 니사
// 니사 머리 위와 왼쪽 뒤 큰 나무 둘레(북서쪽 가장자리)는 글자 자리까지 열고, 앞 큰 나무 밑동까지 남서쪽을 넓힌다 —
// 그림과 큰 나무 뒤에 나무 기호가 겹치지 않게
const GLADE = [[512, 610], [518, 556], [536, 500], [566, 480], [640, 480], [700, 482], [730, 514], [790, 518], [850, 532], [892, 565], [912, 615], [902, 668], [866, 708], [800, 734], [720, 748], [668, 790], [604, 794], [560, 762], [538, 700], [516, 650]]
const GLADES = [blob(350, 520, 100, 58, 'tv-g1'), blob(530, 868, 118, 56, 'tv-g2'), blob(1035, 560, 104, 60, 'tv-g3'), blob(840, 880, 70, 40, 'tv-g4')]

// 글자 둘레의 숲 구멍 — 나무 기호가 이름을 덮지 않게
const HOLE_TV = box(536, 395, 844, 478)
const HOLE_GW = box(646, 116, 834, 182)
const HOLE_EW = box(60, 946, 240, 1045) // Evolving Wilds 표시 위의 이름 (한국어 이름이 더 길다) — 따로 그리는 것은 없다

// ── 숲 (세계 지도의 나무 기호, 언덕·산 기호는 쓰지 않는다) ──
const F1_SOUTH = [[-40, 304], [50, 262], [120, 322], [200, 276], [280, 300], [350, 236], [430, 292], [510, 238], [575, 276], [640, 222], [720, 262], [790, 232], [860, 296], [930, 244], [1000, 292], [1070, 322], [1140, 278], [1212, 262]]
const F2_SOUTH = [[-40, 385], [70, 368], [170, 392], [270, 366], [370, 388], [470, 362], [560, 372], [650, 360], [740, 374], [830, 358], [920, 380], [1010, 362], [1100, 388], [1190, 366], [1280, 384], [1390, 395]]
// 숲의 동쪽 끝은 늪 띠에서 조금 물러난다 — 나무 기호의 잎이 늪 기호를 덮지 않게, 늪과 숲 사이에 풀밭이 보이게
const EDGE_N = BOG_INNER_N.map(([x, y]) => [x - 38, y])
const EDGE_S = BOG_INNER_S.map(([x, y]) => [x - 22, y + 30])
const NORTH = [[-40, -40], ...EDGE_N, ...[...F1_SOUTH].reverse().slice(1)]
const MIDDLE = [...F1_SOUTH.slice(0, -1), EDGE_N[EDGE_N.length - 1], ...EDGE_S, [1340, 360], [1390, 360], [1390, 395], ...[...F2_SOUTH].reverse().slice(1)]
const SOUTH = [...F2_SOUTH, ...COAST_IN, [-40, 1045]]
// 늪 띠는 좁아서 앱의 기호 표본(성긴 격자마다 씨앗 하나)이 띠에 닿지 않는다 — 지도 위쪽 밖(잘려 안 보이는 곳)에 넓은
// 씨앗받이를 붙여 거기서 자란 점들이 띠로 번지게 한다. 늪 기호가 보이는 곳은 띠 안뿐이다.
const BOG = [[1100, -700], [1700, -700], [1700, -40], [1262, -40], ...BOG_SHORE, ...[...BOG_INNER_S].reverse().slice(1), ...[...BOG_INNER_N].reverse().slice(1), [1100, -40]]

const terrain = [
  // Bojuka Bay 기슭의 좁은 늪 (해석: 2009년의 '늪진 만', 2024년 '발라 게드의 늪에 돌아온 생명') — 씨앗이 바뀌지 않게 맨 앞에
  { kind: 'swamp', points: BOG, density: 0.75 },
  // 북쪽 — Guum Wilds 쪽으로 이어지는 짙은 숲
  { kind: 'forest', points: withHoles(NORTH, [HOLE_GW]), density: 0.62 },
  { kind: 'forest', points: MIDDLE, density: 0.44 },
  // 가운데와 남쪽 — 다시 자라는 성긴 숲, 들꽃 빈터
  { kind: 'forest', points: withHoles(SOUTH, [HOLE_TV, GLADE, ...GLADES, HOLE_EW]), density: 0.33 },
]

// ── 니사와 중심 빈터 ──
const NISSA = { at: [568, 606], size: 92, flip: true }
// 니사의 그림과 이름 자리 — 풀포기·들꽃을 두지 않는다 (휴대폰에서는 이름이 지도 단위로 더 넓다)
const NISSA_BOX = [514, 500, 622, 644]

// 카드처럼 두 헤드론이 따로 떨어져 서로 다르게 기울어 누웠다 — 왼쪽 것은 낮게 누워 왼쪽 끝이, 오른쪽 것은 조금 뒤에서
// 오른쪽 끝이 들리고, 아래 끝은 풀과 들꽃 속에 묻힌다. 오른쪽 것의 들린 끝 앞을 큰 나무 줄기가 가린다 (카드)
const HL = { x: 702, y: 644, len: 62, rot: -66, sink: 0.12 }
const HR = { x: 812, y: 618, len: 52, rot: 52, sink: 0.12 }
// 쌓는 차례에 쓰는 밑동 높이 (대강)
const groundOf = (h) => h.y + Math.abs(Math.cos((h.rot * Math.PI) / 180)) * h.len * 0.8

const parts = [...K.cliff(BAY_CLIFF, { mode: 'hachure', side: 1, depth: 22, seed: 'tv-bay-cliff' })]
// 빈터 바닥 — 풀포기와 들꽃 (중심 빈터는 촘촘히, 다른 빈터는 성기게)
{
  const rand = K.rng('tv-floor')
  let tufts = ''
  let gold = ''
  let pale = ''
  const add = ([a, b]) => {
    gold += a
    pale += b
  }
  const clear = (p) => !inBox(p, NISSA_BOX)
  for (const [x, y] of scatter(GLADE, 24, 'tv-glade-tufts', clear)) tufts += tuft(x, y, 6 + rand() * 4, rand)
  for (const [x, y] of scatter(GLADE, 32, 'tv-glade-flowers', clear)) add(drift(x, y, 3 + Math.floor(rand() * 4), rand))
  GLADES.forEach((gl, i) => {
    for (const [x, y] of scatter(gl, 30, `tv-g${i}-t`)) tufts += tuft(x, y, 5 + rand() * 4, rand)
    for (const [x, y] of scatter(gl, 42, `tv-g${i}-f`)) add(drift(x, y, 2 + Math.floor(rand() * 3), rand, 10))
  })
  parts.push(part('hatch', tufts), part('gold', gold), part('fill', pale))
}
// 빈터를 두른 큰 나무와 헤드론 — 뒤(위)에서 앞(아래)으로. 오른쪽 헤드론의 들린 끝 앞에 키 큰 나무 한 그루 (카드) —
// 줄기가 헤드론 몸을 가로지르고 뾰족한 끝은 줄기 오른쪽으로 나온다. 잎은 높이 올려 그 끝을 가리지 않는다
parts.push(
  ...K.stack([
    { y: 560, parts: bigTree(650, 560, 88, 'tv-t1') },
    { y: groundOf(HL), parts: fallenHedron(HL.x, HL.y, HL.len, HL.rot, HL.sink, 'tv-hl') },
    { y: groundOf(HR), parts: fallenHedron(HR.x, HR.y, HR.len, HR.rot, HR.sink, 'tv-hr') },
    { y: 650, parts: bigTree(824, 650, 98, 'tv-t2', { lift: 0.42 }) },
    { y: 768, parts: bigTree(610, 768, 80, 'tv-t4') },
  ]),
)

CHILDMAPS.push({
  id: 'tangled-vales',
  size: [1350, 1000],
  glyphScale: 4,
  terrain,
  parts,
  labels: [LABEL_TV, LABEL_GW, LABEL_BB],
  subjects: {
    'nissa-revane': NISSA,
  },
  markAnchors: { 'card:evolving-wilds': 'above' },
})
