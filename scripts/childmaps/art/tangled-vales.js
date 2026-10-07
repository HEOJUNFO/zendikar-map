// 뒤엉킨 계곡 (Tangled Vales) — 발라 게드 남부, 조라가 엘프의 옛 터전. Zendikar Rising(2020) 이후의 모습.
// 공식 근거: 숲이 '마법만이 낼 수 있는 속도로' 되살아나는 발라 게드(Episode 5, 2020), 대지 카드 '뒤엉킨 계곡'
// (ZNR #211) 그림의 들꽃 깔린 숲 빈터와 쓰러진 헤드론 두 개(이 지도의 중심), 2024년 '발라 게드의 늪에 돌아온 생명'
// (Sanguine Syphoner) — Bojuka Bay 기슭의 좁은 늪 가장자리로.
// 이 지도의 해석: 숲의 짙고 옅음(북쪽이 Guum Wilds 쪽으로 짙다), 빈터들과 헤드론 빈터의 자리, 늪 가장자리, 니사의 자리.
// 그리지 않는 것(브리프 mustNotInvent): 2009년의 가파른 언덕과 Umung River 의 물길(2015–16년에 하얀 먼지가 되었고
// 되살아났다는 서술이 없다), 만의 벼랑·폭포, 조라가 마을·천막·화덕·길·덫, bloodbriar, 다른 생물, 하얀 오염지.

const K = KIT
const part = (cls, d) => ({ cls, d })
const r1 = (v) => Math.round(v * 10) / 10
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

// ── 세계 지도에서 온 고정 지형 (context.mjs) — 기호를 땅 위에만 두려고 경계를 여기서 잡는다 ──
// 남동쪽 해안에서 45 안쪽 선 (나무가 바다에 넘치지 않고 해안에 엷은 띠가 남게)
const COAST_IN = [[1390, 665], [1349, 687], [1328, 702], [1291, 723], [1252, 752], [1215, 788], [1189, 815], [1168, 831], [1157, 838], [1143, 842], [1120, 844], [1080, 847], [1043, 859], [1014, 878], [993, 898], [974, 922], [961, 949], [953, 974], [949, 997], [943, 1009], [938, 1045]]
// Bojuka Bay 서쪽 기슭에서 30 안쪽 선(늪 가장자리의 물가 쪽)과 늪 띠의 안쪽 선
const BOG_SHORE = [[1262, -5], [1252, 18], [1246, 43], [1245, 63], [1246, 83], [1254, 103], [1265, 118], [1272, 128], [1276, 140], [1278, 151], [1277, 163], [1272, 177], [1268, 202], [1271, 225], [1280, 248], [1292, 272], [1309, 295], [1330, 315], [1354, 333], [1390, 350]]
const BOG_INNER_N = [[1183, -40], [1183, -2], [1176, 36], [1175, 63], [1180, 100], [1192, 135], [1203, 165], [1200, 203], [1206, 243], [1212, 262]]
const BOG_INNER_S = [[1212, 262], [1218, 277], [1236, 309], [1262, 334], [1300, 352], [1350, 362], [1390, 366]]

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
/** 들꽃 무리 — 가운데 하나와 둘레 몇 송이 */
function flowerCluster(x, y, n, rand, r = 2.6) {
  let d = speck(x, y, r)
  for (let i = 1; i < n; i++) {
    const a = rand() * Math.PI * 2
    const dist = 5 + rand() * 7
    d += speck(x + Math.cos(a) * dist, y + Math.sin(a) * dist * 0.6, r * (0.75 + rand() * 0.35))
  }
  return d
}

/** 볼록 다각형을 반평면 f(p) <= 0 으로 자른다 */
function clipPoly(poly, f) {
  const out = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const fa = f(a)
    const fb = f(b)
    if (fa <= 0) out.push(a)
    if (fa <= 0 !== fb <= 0) out.push(lerp(a, b, fa / (fa - fb)))
  }
  return out
}
function clipSeg(a, b, f) {
  const fa = f(a)
  const fb = f(b)
  if (fa > 0 && fb > 0) return ''
  if (fa <= 0 && fb <= 0) return K.line([a, b])
  const m = lerp(a, b, fa / (fa - fb))
  return fa <= 0 ? K.line([a, m]) : K.line([m, b])
}

/**
 * 쓰러진 헤드론 — 세계 지도 헤드론(길쭉한 팔면체)과 같은 꼴을 옆에서 본 모습으로, 기울어 누운 채 아래쪽이 풀에 묻힌다.
 * (x, y) 가운데, len 반 길이, rot 은 KIT.hedron 과 같은 회전, groundY 는 풀이 덮는 선의 높이(앞쪽은 묻힌다).
 * 빛은 왼쪽 위에서 — 그늘진 면은 stone 에 해칭, 밝은 면은 shade(세계 지도의 쓰러진 헤드론 색), 새긴 무늬는 가는 선.
 */
function fallenHedron(x, y, len, rot, groundY, seed) {
  const rand = K.rng(seed)
  const wid = len * 0.4
  const g = len * 0.08
  const c = Math.cos((rot * Math.PI) / 180)
  const s = Math.sin((rot * Math.PI) / 180)
  const T = ([px, py]) => [x + px * c - py * s, y + px * s + py * c]
  const top = T([0, -len])
  const R = T([wid, g])
  const bot = T([0, len * 0.92])
  const L = T([-wid, g])
  const C = T([wid * 0.28, g])
  const slope = (rand() - 0.5) * 0.12
  const f = (p) => p[1] - (groundY + slope * (p[0] - x))
  const faces = [
    [top, C, L],
    [top, R, C],
    [L, C, bot],
    [C, R, bot],
  ]
  const light = [-0.6, -0.8]
  let lit = ''
  let dark = ''
  let hatch = ''
  for (const face of faces) {
    const cx = (face[0][0] + face[1][0] + face[2][0]) / 3 - x
    const cy = (face[0][1] + face[1][1] + face[2][1]) / 3 - y
    const vis = clipPoly(face, f)
    if (vis.length < 3) continue
    const isLit = cx * light[0] + cy * light[1] > 0
    if (isLit) lit += K.poly(vis)
    else {
      dark += K.poly(vis)
      // 그늘 면의 해칭 — 모서리(능선)와 나란히
      const [A, , V] = face[1] === C ? [face[0], C, face[2]] : [face[2], C, face[0]]
      for (const u of [0.25, 0.5, 0.75]) hatch += clipSeg(lerp(C, V, u), lerp(A, V, u * 0.92), f)
    }
  }
  // 새긴 무늬 — 밝은 윗면에 안쪽 판(작은 삼각형)과 세계 지도 헤드론의 룬 선
  const panel = [lerp(top, C, 0.3), lerp(L, C, 0.3), lerp(lerp(top, L, 0.5), C, 0.3)]
  let rune = ''
  const pc = [(panel[0][0] + panel[1][0] + panel[2][0]) / 3, (panel[0][1] + panel[1][1] + panel[2][1]) / 3]
  const inset = panel.map((p) => lerp(pc, p, 0.72))
  for (let i = 0; i < 3; i++) rune += clipSeg(inset[i], inset[(i + 1) % 3], f)
  rune += clipSeg(T([wid * 0.1, -len * 0.45]), T([wid * 0.18, g * 0.4]), f) + clipSeg(T([wid * 0.18, g * 0.4]), T([wid * 0.1, len * 0.92 * 0.42]), f)
  const sil = clipSeg(top, R, f) + clipSeg(R, bot, f) + clipSeg(bot, L, f) + clipSeg(L, top, f)
  const edges = clipSeg(top, C, f) + clipSeg(C, bot, f) + clipSeg(L, C, f) + clipSeg(C, R, f)
  // 묻힌 자리의 풀 — 잘린 선을 따라 촘촘히, 양쪽으로 조금 더
  const xs = [top, R, bot, L].map((p) => p[0])
  const gx0 = Math.min(...xs) - 6
  const gx1 = Math.max(...xs) + 6
  let grass = ''
  for (let gx = gx0; gx <= gx1; gx += 4.2 + rand() * 2.2) {
    const gy = groundY + slope * (gx - x) + 1.5 + rand() * 2.5
    grass += tuft(gx, gy, 5 + rand() * 5, rand)
  }
  return [part('shade', lit), part('stone', dark), part('hatch', hatch + rune), part('ink', edges), part('ink-bold', sil), part('ink', grass)]
}

/** 큰 나무 — KIT.tree 의 잎 덩어리 셋을 그대로, 줄기는 채운 키 큰 줄기로 (카드의 '키 큰 줄기') */
function bigTree(x, y, h, seed, o = {}) {
  const rand = K.rng(seed)
  const cw = h * 0.42
  const tw = h * 0.045
  const ty = y - h * 0.56
  const trunk = `M${pt([x - tw * 1.9, y])}Q${pt([x - tw * 0.95, y - h * 0.03])} ${pt([x - tw, y - h * 0.12])}L${pt([x - tw * 0.7, ty])}L${pt([x + tw * 0.7, ty])}L${pt([x + tw, y - h * 0.12])}Q${pt([x + tw * 0.95, y - h * 0.03])} ${pt([x + tw * 1.9, y])}Z`
  const shade = K.poly([[x + tw * 0.15, y], [x + tw * 0.1, ty], [x + tw * 0.7, ty], [x + tw, y - h * 0.12], [x + tw * 1.5, y]])
  const bark = K.line([[x + tw * 0.55, y - h * 0.04], [x + tw * 0.45, y - h * 0.3]])
  const branch = K.line([[x + tw * 0.4, y - h * 0.4], [x + h * 0.11, y - h * 0.55]]) + K.line([[x - tw * 0.4, y - h * 0.46], [x - h * 0.09, y - h * 0.58]])
  const parts = [part('fill', trunk), part('shade', shade), part('hatch', bark), part('ink', trunk + branch)]
  const lift = o.lift ?? 0.1
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
const LABEL_GW = { text: 'Guum Wilds', at: [820, 66], size: 26, kind: 'area' }
const LABEL_BB = { text: 'Bojuka Bay', at: [1328, 150], size: 20, kind: 'water', rotate: 78 }

// ── 빈터 (이 지도의 해석) ──
// 중심 빈터 — 쓰러진 헤드론 둘, 서쪽 가장자리에 니사
const GLADE = [[512, 610], [520, 560], [548, 522], [600, 512], [660, 520], [720, 516], [790, 518], [850, 532], [892, 565], [912, 615], [902, 668], [866, 708], [800, 734], [720, 744], [640, 740], [580, 722], [538, 690], [516, 650]]
const GLADES = [blob(350, 520, 92, 52, 'tv-g1'), blob(530, 868, 112, 52, 'tv-g2'), blob(1035, 560, 96, 56, 'tv-g3'), blob(840, 880, 62, 36, 'tv-g4')]

// 글자 둘레의 숲 구멍 — 나무 기호가 이름을 덮지 않게
const HOLE_TV = box(536, 395, 844, 478)
const HOLE_GW = box(726, 28, 914, 94)
const HOLE_EW = box(70, 945, 232, 1045) // Evolving Wilds 표시와 그 위의 이름

// ── 숲 (세계 지도의 나무 기호, 언덕·산 기호는 쓰지 않는다) ──
const F1_SOUTH = [[-40, 290], [60, 270], [140, 292], [220, 262], [300, 286], [380, 258], [450, 276], [520, 246], [590, 264], [660, 240], [730, 262], [800, 250], [870, 280], [940, 256], [1010, 272], [1080, 300], [1150, 286], [1212, 262]]
const F2_SOUTH = [[-40, 385], [70, 368], [170, 392], [270, 366], [370, 388], [470, 362], [560, 372], [650, 360], [740, 374], [830, 358], [920, 380], [1010, 362], [1100, 388], [1190, 366], [1280, 384], [1390, 395]]
const NORTH = [[-40, -40], ...BOG_INNER_N, ...[...F1_SOUTH].reverse().slice(1)]
const MIDDLE = [...F1_SOUTH, ...BOG_INNER_S.slice(1), [1390, 395], ...[...F2_SOUTH].reverse().slice(1)]
const SOUTH = [...F2_SOUTH, ...COAST_IN, [-40, 1045]]
const BOG = [...BOG_SHORE, ...[...BOG_INNER_S].reverse(), ...[...BOG_INNER_N].reverse(), [1262, -40]]

const terrain = [
  // 북쪽 — Guum Wilds 쪽으로 이어지는 짙은 숲
  { kind: 'forest', points: withHoles(NORTH, [HOLE_GW]), density: 0.85 },
  { kind: 'forest', points: MIDDLE, density: 0.55 },
  // 가운데와 남쪽 — 다시 자라는 성긴 숲, 들꽃 빈터
  { kind: 'forest', points: withHoles(SOUTH, [HOLE_TV, GLADE, ...GLADES, HOLE_EW]), density: 0.36 },
  // Bojuka Bay 기슭의 좁은 늪 (해석: 2009년의 '늪진 만', 2024년 '발라 게드의 늪에 돌아온 생명')
  { kind: 'swamp', points: BOG, density: 0.55 },
]

// ── 니사와 중심 빈터 ──
const NISSA = { at: [570, 605], size: 90, flip: true }
// 니사의 그림과 이름 자리 — 풀포기를 두지 않는다
const NISSA_BOX = [520, 505, 620, 640]

const HL = { x: 690, y: 646, len: 48, rot: -64, ground: 652 }
const HR = { x: 803, y: 640, len: 44, rot: 68, ground: 648 }

// 빈터 바닥 — 풀포기와 들꽃
const parts = []
{
  const rand = K.rng('tv-floor')
  let tufts = ''
  let flowers = ''
  const clear = (p) => !inBox(p, NISSA_BOX)
  for (const [x, y] of scatter(GLADE, 21, 'tv-glade-tufts', clear)) tufts += tuft(x, y, 6 + rand() * 4, rand)
  for (const [x, y] of scatter(GLADE, 30, 'tv-glade-flowers', clear)) flowers += flowerCluster(x, y, 2 + Math.floor(rand() * 4), rand)
  // 헤드론 밑동에 더 많이 (카드의 들꽃)
  for (const h of [HL, HR]) for (let i = 0; i < 7; i++) flowers += flowerCluster(h.x - h.len + rand() * h.len * 2, h.ground + 6 + rand() * 18, 3 + Math.floor(rand() * 3), rand)
  GLADES.forEach((gl, i) => {
    for (const [x, y] of scatter(gl, 27, `tv-g${i}-t`)) tufts += tuft(x, y, 5 + rand() * 4, rand)
    for (const [x, y] of scatter(gl, 44, `tv-g${i}-f`)) flowers += flowerCluster(x, y, 2 + Math.floor(rand() * 3), rand, 2.3)
  })
  parts.push(part('fill', flowers), part('hatch', tufts + flowers))
}
// 빈터를 두른 큰 나무와 헤드론 — 뒤(위)에서 앞(아래)으로
parts.push(
  ...K.stack([
    { y: 570, parts: bigTree(648, 570, 96, 'tv-t1') },
    { y: 574, parts: bigTree(782, 574, 108, 'tv-t2') },
    { y: HL.ground, parts: fallenHedron(HL.x, HL.y, HL.len, HL.rot, HL.ground, 'tv-hl') },
    { y: HR.ground, parts: fallenHedron(HR.x, HR.y, HR.len, HR.rot, HR.ground, 'tv-hr') },
    // 카드처럼 오른쪽 헤드론의 들린 끝을 가리는 줄기
    { y: 672, parts: bigTree(842, 672, 122, 'tv-t3', { lift: 0.14 }) },
    { y: 752, parts: bigTree(612, 752, 88, 'tv-t4') },
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
