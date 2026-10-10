// 뒤엉킨 계곡 (Tangled Vales) — 발라 게드 남부, 조라가 엘프의 옛 터전. Zendikar Rising(2020) 이후의 모습.
// 공식 근거: 숲이 '마법만이 낼 수 있는 속도로' 되살아나는 발라 게드(Episode 5, 2020), 대지 카드 '뒤엉킨 계곡'
// (ZNR #211) 그림의 들꽃 깔린 숲 빈터와 쓰러진 헤드론 두 개(이 지도의 중심), 2024년 '발라 게드의 늪에 돌아온 생명'
// (Sanguine Syphoner) — Bojuka Bay 기슭의 좁은 늪 가장자리로. 만을 두른 절벽(PG: Bala Ged, 2009 'the surrounding cliffs')은
// 세계 지도(src/data/landscape/bala-ged.ts 의 bojuka-cliffs-southwest)의 선을 이 축척으로 그대로 옮겨(세계 지도처럼 한 번
// 다듬어) 긋는다 — 바위 지형이라 침공 뒤에도 남은 것으로 본 세계 지도의 추정을 따른다. 처음 브리프는 이 절벽을 그리지
// 말라고 했지만(2009년 모습), 두 지도가 어긋나지 않게 세계 지도를 따른다. 폭포는 세계 지도처럼 그리지 않는다.
// 세계 지도의 다른 바탕 지형 가운데 이 범위에 드는 것은 이 절벽뿐이다(Guum Wilds 의 늪 guum-bog-riverroot 는 범위 서쪽 밖에
// 일부러 좁게 두어 이 지도의 서쪽 가장자리에는 늪이 없다 — 여기서도 그리지 않는다). 강은 세계 지도에도 이 범위에 없다.
// 페이즈1 대상(ZEN 미식 레어): Oracle of Mul Daya 는 북쪽 짙은 숲(Guum Wilds 남쪽 가장자리, 공식: 물 다야의 집은 Guum),
// Bala Ged Thief 는 서쪽 숲(공식: 뒤엉킨 계곡의 '사냥꾼·덫사냥꾼 인간'), Beastmaster Ascension 의 짐승 무리는 헤드론 빈터
// 남쪽 빈터(공식: 조라가 씨족이 짐승을 좇는다·계곡에 산다) — 세 자리 모두 이 지도의 해석이다.
// ZEN 언커먼 Greenweaver Druid(물 다야 드루이드 — 카드 플레이버, PG: Bala Ged and Elves 2009 의 'Mul Daya Nation' 그림)는
// Oracle 동쪽, 같은 북쪽 짙은 숲의 Guum Wilds 이름 밑(공식: 물 다야는 'Guum 의 집'에 머물렀다, Reclamation 2016 —
// 자리는 이 지도의 해석. 세계 지도 자리를 그대로 옮기면 머리말이 덮는 북서 모퉁이라 Oracle 곁으로 모았다).
// ZEN 커먼 일곱은 모두 화자·소속(조라가 음유시인 Nikou, 조라가 유물 사냥꾼 Radavi, 니사의 호위대, 니사의 말)만 단서라 자리는
// 이 지도의 해석이다: 서쪽 — Savage Silhouette(서쪽 빈터), Slaughter Cry(서쪽 숲의 틈), Nissa's Chosen(니사 서남쪽, 헤드론
// 빈터의 서쪽 가장자리); 동쪽 — Tanglesap(북동쪽 짙은 숲), Stonework Puma(동쪽 숲 가장자리), Hideous End(동쪽 빈터),
// Joraga Bard(남동쪽 작은 빈터의 동쪽 가장자리). 그림 둘레에는 나무 기호를 비우고, 빈터 몇 곳을 새로 넓히거나 보탰다.
// 이 지도의 해석: 숲의 짙고 옅음(북쪽이 Guum Wilds 쪽으로 짙다), 빈터들과 헤드론 빈터의 자리, 늪 가장자리(절벽 위),
// 니사와 모든 페이즈 대상의 자리.
// 그리지 않는 것(브리프 mustNotInvent): 2009년의 가파른 언덕과 Umung River 의 물길(2015–16년에 하얀 먼지가 되었고
// 되살아났다는 서술이 없다), 만의 폭포, 조라가 마을·천막·화덕·길·덫, bloodbriar, 페이즈 대상 밖의 다른 생물, 하얀 오염지.

const K = KIT
const part = (cls, d) => ({ cls, d })
const r1 = (v) => Math.round(v * 10) / 10
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

// ── 세계 지도에서 온 고정 지형 (context.mjs) — 기호를 땅 위에만 두려고 경계를 여기서 잡는다 ──
// 남동쪽 해안에서 45 안쪽 선 (나무가 바다에 넘치지 않고 해안에 엷은 띠가 남게)
const COAST_IN = [[1390, 665], [1349, 687], [1328, 702], [1291, 723], [1252, 752], [1215, 788], [1189, 815], [1168, 831], [1157, 838], [1143, 842], [1120, 844], [1080, 847], [1043, 859], [1014, 878], [993, 898], [974, 922], [961, 949], [953, 974], [949, 997], [943, 1009], [938, 1045]]
// Bojuka Bay 의 절벽 가장자리 — 세계 지도 bojuka-cliffs-southwest 의 선(세계 좌표)을 이 지도 좌표로 옮겨, 세계 지도처럼
// 모서리를 깎아 다듬는다(chaikin). 남쪽 기슭은 서쪽으로, 서쪽 기슭은 북쪽으로 그어 빗금이 진행 방향 오른쪽(만 쪽)으로
// 떨어진다. 세계 지도처럼 가장자리 선은 물에서 30~55 물러나 있고, 빗금(절벽 면) 밑에 좁은 물가가 남는다
const WORLD_CLIFF = [[2271.8, 979.6], [2262.2, 984.4], [2250.2, 985.6], [2239.4, 978.4], [2232.2, 967.6], [2231, 955.6], [2229.8, 944.8], [2233.4, 936.4], [2243, 935.2]]
function chaikin(p, n) {
  for (let k = 0; k < n; k++) {
    const out = [p[0]]
    for (let i = 0; i < p.length - 1; i++) out.push(lerp(p[i], p[i + 1], 0.25), lerp(p[i], p[i + 1], 0.75))
    out.push(p[p.length - 1])
    p = out
  }
  return p
}
const BAY_CLIFF = chaikin(WORLD_CLIFF.map(([x, y]) => [((x - 2081) * 25) / 3, ((y - 940) * 25) / 3]), 2)
// 서쪽 기슭과 남서 모퉁이(남→북) — 늪 띠와 숲의 동쪽 끝을 이 선에서 뭍 쪽으로 물려 잡는다
const CLIFF_W = BAY_CLIFF.filter(([x, y]) => x < 1340 && y > -20)
// 늪 띠: 절벽 가장자리에서 뭍 쪽으로 24(늪 기호의 반 폭 — 기호가 절벽 선을 넘지 않게)부터 96 까지.
// 숲은 130 부터 — 늪과 숲 사이에 풀밭이 보이게
const BOG_SHORE = K.offset(CLIFF_W, 24)
const BOG_INNER = K.offset(CLIFF_W, 96)
const FOREST_E = K.offset(CLIFF_W, 130)

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

// ── 빈터 (이 지도의 해석) ──
// 중심 빈터 — 쓰러진 헤드론 둘, 서쪽 가장자리에 니사
// 니사 머리 위와 왼쪽 뒤 큰 나무 둘레(북서쪽 가장자리)는 글자 자리까지 열고, 앞 큰 나무 밑동까지 남서쪽을 넓힌다 —
// 그림과 큰 나무 뒤에 나무 기호가 겹치지 않게
// 서쪽 가장자리는 니사의 호위 전사(Nissa's Chosen)가 서는 자리까지 남서쪽으로 불룩하게 넓힌다 — 전사와 발밑 이름 둘레에 나무 기호가 들지 않게
const GLADE = [[470, 592], [512, 588], [518, 556], [536, 500], [566, 480], [640, 480], [700, 482], [730, 514], [790, 518], [850, 532], [892, 565], [912, 615], [902, 668], [866, 708], [800, 734], [720, 748], [668, 790], [604, 794], [560, 762], [530, 760], [470, 762], [416, 752], [400, 706], [404, 650], [426, 608]]
// 서쪽 빈터는 도둑 자리(바로 위)와 닿지 않게 조금 남서로 — Savage Silhouette 의 엘프와 그림자 진 나무가 이 빈터에 선다(그림의
// '숲 빈터'), 그래서 그림과 발밑 이름이 들게 키우고 가장자리를 덜 흔든다. 동쪽 빈터는 Hideous End 의 저주받은 석상과 엘프가 들게
const GLADES = [blob(258, 580, 140, 100, 'tv-g1', 18, 0.08), blob(530, 868, 118, 56, 'tv-g2'), blob(1037, 566, 102, 86, 'tv-g3', 18, 0.08)]
// 남동쪽 숲의 작은 빈터 — 조라가 음유시인(Joraga Bard)이 그 동쪽 가장자리에 서서 뿔나팔을 분다 (자리는 이 지도의 해석)
const BARD_GLADE = [[985, 700], [1020, 680], [1060, 672], [1130, 666], [1158, 684], [1162, 760], [1156, 830], [1110, 834], [1050, 826], [1004, 806], [978, 760]]
// 짐승 무리가 달리는 남쪽 빈터 — 중심 빈터의 남쪽 가장자리를 윗변으로 그대로 이어 받아, 두 빈터 사이에 나무 기호가 끼어
// 고양이들 등에 얹히지 않게 한다 (두 구멍은 변 하나를 나눌 뿐 겹치지 않는다). 풀포기는 중심 빈터보다 성기게
const SOUTH_GLADE = [[902, 668], [866, 708], [800, 734], [720, 748], [668, 790], [664, 830], [670, 870], [690, 906], [786, 918], [870, 908], [896, 876], [904, 826], [896, 770], [906, 716]]

// 글자 둘레의 숲 구멍 — 나무 기호가 이름을 덮지 않게
const HOLE_TV = box(536, 380, 844, 478) // 한국어 이름은 영어보다 높아 위를 더 연다
// Evolving Wilds 표시 오른쪽의 이름 (한국어 이름이 더 길다) — 따로 그리는 것은 없다. 바로 위 Slaughter Cry 의 고블린 틈과는
// 나무 한 줄 들 자리가 없어 한 구멍으로 잇는다
const HOLE_EW = [[198, 712], [340, 712], [354, 738], [354, 846], [338, 926], [140, 926], [136, 856], [190, 846]]

// ── 페이즈1 대상 (자리는 이 지도의 해석) ──
// 사람만 한 그림은 70–110, 짐승 무리는 무리의 길이로 키워 우두머리 사람이 니사의 절반쯤으로 읽히게.
// 모두 지도 안쪽(헤드론 빈터 쪽)을 보게 둔다. 휴대폰 첫 화면(높이 맞춤, 폭 약 460)에 니사·헤드론과 함께 들게 모았다
const ORACLE = { at: [545, 262], size: 95 } // 북쪽 짙은 숲 — Guum Wilds 의 남쪽 가장자리, 작은 틈에 선다
// Greenweaver Druid(물 다야 드루이드) — Oracle 과 같이 Guum Wilds 남쪽 가장자리의 짙은 숲, Oracle 동쪽의 작은 틈에 웅크려
// 땅에서 덩굴처럼 오르는 마나에 손을 든다. 그림은 양치 잎까지 넓어서 웅크린 사람이 도둑만 하게 읽히도록 110,
// 서쪽(Oracle·헤드론 빈터 쪽)을 보게 뒤집는다. Guum Wilds 이름 바로 밑, 휴대폰 첫 화면 오른쪽 끝에서 이름이 한 뼘 떨어지게
const DRUID = { at: [775, 292], size: 110, flip: true }
const THIEF = { at: [452, 436], size: 100, flip: true } // 서쪽 숲 그늘에 웅크려 유물 조각을 줍는다
const PACK = { at: [775, 835], size: 160, flip: true } // 헤드론 빈터 남쪽 빈터를 가로질러 서쪽으로 달린다
// ZEN 커먼 일곱 — 모두 화자·소속만 단서라 자리는 이 지도의 해석 (finals 의 estimate). 서쪽 셋, 동쪽 넷으로 나눠 빈 숲에 둔다.
// 니사의 호위 전사는 니사 서남쪽, 헤드론 빈터의 서쪽 가장자리에서 니사(동쪽)를 본다 — 그림이 본디 동쪽을 본다
const CHOSEN = { at: [466, 698], size: 90 }
// 엘프 사냥꾼과 짐승 그림자 — 서쪽 빈터에 선다. 그림이 나무까지 품어 넓으므로 엘프가 사람 크기(약 75)로 읽히게 115
const SAVAGE = { at: [250, 612], size: 115 }
// 함성을 지르며 창을 꼬나 쥐고 돌진하는 고블린 — 서쪽 숲의 틈, 지도 안쪽(동쪽)으로 달린다
const CRY = { at: [262, 800], size: 95 }
// 수액을 흘리는 큰 나무 — 북동쪽 짙은 숲, 드루이드 동쪽 (지도 축척의 큰 나무 크기). 동쪽 넷은 한 줄로 서지 않게
// 좌우로 엇갈려 둔다 (수액 나무 서쪽 · 퓨마 동쪽 · 석상 서쪽 · 음유시인 동쪽)
const TANGLESAP = { at: [975, 228], size: 95 }
// 돌 퓨마 Tawny — 동쪽 숲이 만 쪽 풀밭에 닿는 가장자리를 서쪽(지도 안쪽)으로 걷는다
const PUMA = { at: [1145, 425], size: 100, flip: true }
// 저주받은 석상 앞에서 물러서는 조라가 유물 사냥꾼 — 동쪽 빈터
const HIDEOUS = { at: [1025, 594], size: 100 }
// 조라가 음유시인 — 남동쪽 작은 빈터의 동쪽 가장자리에서 빈터(서쪽)로 뿔나팔을 분다
const BARD = { at: [1100, 782], size: 95, flip: true }
// 그림과 이름 둘레의 숲 구멍 (짙은 숲 속 작은 틈) — 나무 기호가 그림·이름을 덮지 않게
// 나무 기호는 점에서 좌우 20, 위 23, 아래(줄기) 17 까지 그려지므로 그림·이름 상자에서 그만큼 띄운다.
// 이름(13px)은 휴대폰과 패널을 연 화면에서 지도 단위로 더 넓고 더 아래에 놓이므로 그 폭까지 연다.
// Oracle 의 틈 — 그림 둘레는 좁게, 발밑의 이름 자리는 넓게 (북쪽 칸 F1_SOUTH 안에)
const HOLE_OR = [[500, 150], [545, 140], [590, 150], [600, 200], [602, 244], [634, 252], [650, 290], [648, 328], [545, 330], [450, 328], [444, 290], [458, 254], [488, 244], [490, 200]]
// Guum Wilds 이름과 드루이드의 틈 — 이름 밑과 그림 꼭대기 사이에 나무 하나 들 자리가 없어 한 틈으로 잇는다
// (구멍끼리 겹치면 안 된다). 위는 이름 자리, 아래는 그림(x 715–825, y 198–294)과 발밑 이름(폭 약 120)까지.
// 세로 칸마다 [GW_TOP(x), GW_BOT(x)] 가 비는 꼴이고, 북쪽 칸과 가운데 칸의 경계(F1_SOUTH)가 이 틈을 가로지르므로
// 경계 위쪽은 북쪽 칸의 구멍, 아래쪽은 가운데 칸의 구멍으로 나눈다 (구멍이 제 칸 밖으로 나가면 짝홀 규칙에 그 자리가 숲이 된다)
const GW_TOP = [[640, 126], [654, 112], [826, 112], [840, 126], [842, 178], [845, 182], [846, 290], [856, 302]]
const GW_BOT = [[640, 182], [654, 196], [692, 196], [694, 344], [856, 344]]
// 도둑의 틈 — 웅크린 그림과 그 밑 이름까지 (서쪽 빈터와 겹치지 않게 왼쪽 아래 모서리를 깎는다)
const HOLE_TH = [[382, 352], [508, 352], [522, 368], [527, 430], [535, 452], [535, 478], [534, 498], [524, 503], [404, 503], [388, 492], [378, 462], [372, 404]]

// ── 숲 (세계 지도의 나무 기호, 언덕·산 기호는 쓰지 않는다) ──
// 숲 칸의 경계선 — 북쪽 짙은 숲은 Oracle 의 틈을 품게 그 아래로 조금 내려오고, 남쪽 숲은 도둑의 틈을 품게 그 위로 올라온다.
// 동쪽 끝은 절벽 뒤 늪 띠에서 물러난 FOREST_E 에 닿는다 (북쪽 칸은 FOREST_E[5] 위, 가운데 칸은 FOREST_E[1]~[5])
const F1_SOUTH = [[-40, 304], [50, 262], [120, 322], [200, 276], [280, 300], [350, 236], [430, 300], [446, 332], [654, 332], [676, 250], [720, 262], [790, 232], [860, 296], [930, 244], [1000, 292], [1070, 322], [1120, 290], FOREST_E[5]]
const F2_SOUTH = [[-40, 385], [70, 368], [170, 392], [270, 366], [360, 340], [470, 338], [560, 372], [650, 360], [740, 374], [830, 358], [920, 380], [1010, 362], [1100, 388], [1170, 386], FOREST_E[1]]
/** x 로 오름차순인 꺾은선을 y = f(x) 로 읽는다 */
const pl = (pts) => (x) => {
  if (x <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) return pts[i - 1][1] + ((pts[i][1] - pts[i - 1][1]) * (x - pts[i - 1][0])) / (pts[i][0] - pts[i - 1][0])
  return pts[pts.length - 1][1]
}
/** 세로 칸 [top(x), bot(x)] 들을 이은 고리 — 칸이 비는 곳(top ≥ bot)은 양 끝에만 있다고 본다 */
function columns(x0, x1, top, bot, step = 2) {
  const up = []
  const down = []
  for (let x = x0; x <= x1 + 0.01; x += step) {
    const t = top(x)
    const b = bot(x)
    if (b - t < 0.5) continue
    up.push([r1(x), r1(t)])
    down.push([r1(x), r1(b)])
  }
  return [...up, ...down.reverse()]
}
const F1 = pl(F1_SOUTH)
const GT = pl(GW_TOP)
const GB = pl(GW_BOT)
const HOLE_GW_N = columns(640, 856, GT, (x) => Math.min(GB(x), F1(x) - 0.5))
const HOLE_GW_M = columns(640, 856, (x) => Math.max(GT(x), F1(x) + 0.5), GB)
const F2 = pl(F2_SOUTH)
/** 상자 모양 틈을 숲 칸의 경계(F1, F2)에서 잘라 북쪽·가운데·남쪽 칸의 구멍으로 나눈다 (빈 조각은 뺀다) */
function splitHole(x0, y0, x1, y1) {
  const cut = (top, bot) => columns(x0, x1, top, bot)
  return {
    n: cut(() => y0, (x) => Math.min(y1, F1(x) - 0.5)),
    m: cut((x) => Math.max(y0, F1(x) + 0.5), (x) => Math.min(y1, F2(x) - 0.5)),
    s: cut((x) => Math.max(y0, F2(x) + 0.5), () => y1),
  }
}
const ok3 = (r) => r.length > 2
// 수액 나무와 돌 퓨마의 틈 — 그림에서 좌우 20, 위 17, 이름 밑으로 23 띄운다 (퓨마의 틈은 석상 빈터와 닿지 않게)
const HOLE_TS = splitHole(914, 120, 1034, 283)
const HOLE_PU = splitHole(1075, 359, 1215, 478)
// 늪 띠 남쪽 끝과 남쪽 절벽 기슭 밑 — 남쪽 숲은 늪 띠에서 물러나고, 늪이 없는 남쪽 기슭에서는 절벽 가장자리 가까이까지 온다
const SOUTH_TOP_E = [[1262, 430], [1310, 418], [1352, 374], [1395, 390]]
const NORTH = [[-40, -40], ...[...FOREST_E].reverse().slice(0, -5), ...[...F1_SOUTH].reverse().slice(1)]
const MIDDLE = [...F1_SOUTH.slice(0, -1), ...FOREST_E.slice(1, 6).reverse(), ...[...F2_SOUTH].reverse().slice(1)]
const SOUTH = [...F2_SOUTH, ...SOUTH_TOP_E, ...COAST_IN, [-40, 1045]]
// 늪 띠는 좁아서 앱의 기호 표본(성긴 격자마다 씨앗 하나)이 띠에 닿지 않는다 — 지도 위쪽 밖(잘려 안 보이는 곳)에 넓은
// 씨앗받이를 붙여 거기서 자란 점들이 띠로 번지게 한다. 늪 기호가 보이는 곳은 띠 안뿐이다.
const BOG = [[1100, -700], [1700, -700], [1700, -40], ...[...BOG_SHORE].reverse(), ...BOG_INNER, [1100, -40]]

// ── 페이즈1 이 꺼졌을 때의 숲 ──
// 그림과 그 이름 자리로 낸 틈·빈터(도둑·Oracle·드루이드·수액 나무·퓨마의 틈, 서쪽·동쪽 빈터를 키운 몫, 니사의 호위 전사 자리로
// 불룩하게 넓힌 중심 빈터의 남서쪽, 짐승 무리의 남쪽 빈터, 음유시인의 작은 빈터, 고블린의 틈)는 페이즈1 에서만 비운다.
// 꺼지면 이름 자리와 본디 크기의 빈터만 비운 아래 칸들이 쓰인다
const HOLE_GW_OFF = box(646, 112, 834, 188) // Guum Wilds 이름
const HOLE_EW_OFF = box(170, 850, 350, 916) // Evolving Wilds 표시 오른쪽의 이름
const GLADE_OFF = [[512, 588], [518, 556], [536, 500], [566, 480], [640, 480], [700, 482], [730, 514], [790, 518], [850, 532], [892, 565], [912, 615], [902, 668], [866, 708], [800, 734], [720, 748], [668, 790], [604, 794], [560, 762], [530, 740], [500, 700], [496, 640]]
const GLADES_OFF = [blob(258, 580, 90, 64, 'tv-g1'), GLADES[1], blob(1037, 566, 70, 56, 'tv-g3')]

const terrain = [
  // Bojuka Bay 기슭의 좁은 늪 (해석: 2009년의 '늪진 만', 2024년 '발라 게드의 늪에 돌아온 생명') — 씨앗이 바뀌지 않게 맨 앞에
  { kind: 'swamp', points: BOG, density: 0.75 },
  // 북쪽 — Guum Wilds 쪽으로 이어지는 짙은 숲
  { kind: 'forest', points: withHoles(NORTH, [HOLE_GW_N, HOLE_OR, HOLE_TS.n, HOLE_PU.n].filter(ok3)), density: 0.62, phase: true },
  { kind: 'forest', points: withHoles(MIDDLE, [HOLE_GW_M, HOLE_TS.m, HOLE_PU.m].filter(ok3)), density: 0.44, phase: true },
  // 가운데와 남쪽 — 다시 자라는 성긴 숲, 들꽃 빈터
  { kind: 'forest', points: withHoles(SOUTH, [HOLE_TV, HOLE_TH, GLADE, SOUTH_GLADE, ...GLADES, BARD_GLADE, HOLE_EW, HOLE_TS.s, HOLE_PU.s].filter(ok3)), density: 0.33, phase: true },
  // 페이즈1 이 꺼졌을 때 — 같은 숲, 이름 자리와 본디 빈터만 비운다
  { kind: 'forest', points: withHoles(NORTH, [HOLE_GW_OFF]), density: 0.62, phase: false },
  { kind: 'forest', points: MIDDLE, density: 0.44, phase: false },
  { kind: 'forest', points: withHoles(SOUTH, [HOLE_TV, GLADE_OFF, ...GLADES_OFF, HOLE_EW_OFF]), density: 0.33, phase: false },
]

// ── 니사와 중심 빈터 ──
const NISSA = { at: [568, 606], size: 92, flip: true }
// 니사의 그림과 이름 자리 — 풀포기·들꽃을 두지 않는다 (휴대폰에서는 이름이 지도 단위로 더 넓다)
const NISSA_BOX = [514, 500, 622, 644]
// 짐승 무리의 그림과 이름 자리 — 남쪽 빈터의 풀포기·들꽃이 다리 사이와 이름을 어지럽히지 않게
const PACK_BOX = [686, 748, 868, 892]
// 새 그림들의 그림·이름 자리 — 빈터의 풀포기·들꽃을 두지 않는다
const FIG_BOXES = [PACK_BOX, [428, 596, 526, 728], [186, 496, 360, 652], [985, 492, 1099, 630], [1058, 682, 1142, 816]]

// 카드처럼 두 헤드론이 따로 떨어져 서로 다르게 기울어 누웠다 — 왼쪽 것은 낮게 누워 왼쪽 끝이, 오른쪽 것은 조금 뒤에서
// 오른쪽 끝이 들리고, 아래 끝은 풀과 들꽃 속에 묻힌다. 오른쪽 것의 들린 끝 앞을 큰 나무 줄기가 가린다 (카드)
const HL = { x: 702, y: 644, len: 62, rot: -66, sink: 0.12 }
const HR = { x: 812, y: 618, len: 52, rot: 52, sink: 0.12 }
// 쌓는 차례에 쓰는 밑동 높이 (대강)
const groundOf = (h) => h.y + Math.abs(Math.cos((h.rot * Math.PI) / 180)) * h.len * 0.8

/** 세계 지도가 그리는 만의 단애선 그대로 — terrain.ts 의 scarp(물가 절벽: chaikin 2번, 3.4 간격, 물까지 4.5 가 안 되는 곳은
 *  위 선을 뭍 쪽으로 민다, 빗금은 물까지 남은 폭의 0.45–0.85)를 bala-ged.ts 의 선과 같은 씨앗으로 계산해 이 축척으로 옮긴 점들.
 *  만의 절벽은 거의 모두 범위 동쪽·위쪽 가장자리 띠 안이라, 띠에서 옅어지는 이 선과 짙어지는 세계 지도의 선이 한 줄로 겹친다.
 *  세계 지도의 절벽 선(bala-ged.ts)이나 해안을 고치면 다시 계산해야 한다 */
const WORLD_SCARP_TOP = [[1590,330],[1564.7,342.7],[1539.3,355.3],[1512.6,364.8],[1485.1,371.4],[1457.1,375.3],[1428.8,374.8],[1401.1,369.2],[1374.9,358],[1351,342.5],[1328.7,324.6],[1308.5,304.4],[1290.9,281.8],[1275.9,257.4],[1264,231.3],[1255.8,203.8],[1251.6,175.6],[1248.1,147.4],[1244.5,119.3],[1240.3,91.1],[1237.2,62.4],[1239,32.9],[1247.5,4.3],[1263.8,-21.9],[1290.4,-37.6],[1319.6,-42.9],[1347.9,-46]]
const WORLD_SCARP_TICKS = [[1590,330,-18.5,-37],[1564.7,342.7,-13.5,-27.2],[1539.3,355.3,-14.2,-33.3],[1512.6,364.8,-7.7,-25.8],[1485.1,371.4,-3.9,-20.9],[1457.1,375.3,-2.1,-35.2],[1428.8,374.8,4.3,-35.7],[1401.1,369.2,9.8,-29.4],[1374.9,358,16.5,-29.6],[1351,342.5,18.2,-24.1],[1328.7,324.6,15.8,-16.9],[1308.5,304.4,23.2,-20],[1290.9,281.8,17,-11.8],[1275.9,257.4,22.3,-11.9],[1264,231.3,21.4,-8],[1255.8,203.8,31.1,-6.9],[1251.6,175.6,36.1,-4.5],[1248.1,147.4,29.8,-3.1],[1244.5,119.3,33.3,-3.6],[1240.3,91.1,18.5,-1.6],[1237.2,62.4,19.8,0.1],[1239,32.9,26.7,5],[1247.5,4.3,17.7,7.9],[1263.8,-21.9,21,21.3],[1290.4,-37.6,7.7,20.4],[1319.6,-42.9,3.6,23],[1347.9,-46,4.8,38.5]]
function worldCliff() {
  const ticks = WORLD_SCARP_TICKS.map(([x, y, dx, dy]) => K.line([[x, y], [x + dx, y + dy]])).join('')
  return [part('ink', K.line(WORLD_SCARP_TOP)), part('ink', ticks)]
}
const parts = [...worldCliff()]
// 빈터 바닥 — 풀포기와 들꽃 (중심 빈터는 촘촘히, 다른 빈터는 성기게). 페이즈1 에서는 그림 자리를 비운 빈터에,
// 꺼지면 본디 빈터에 그림 자리 없이 깐다
function floor(main, others, holes, boxes, phase) {
  const rand = K.rng('tv-floor')
  let tufts = ''
  let gold = ''
  let pale = ''
  const add = ([a, b]) => {
    gold += a
    pale += b
  }
  // 풀포기·들꽃은 지형 기호(나무) 위에 그려지므로, 빈터 가장자리의 나무 기호가 닿는 곳(점에서 위 23·아래 17·좌우 20)에는
  // 두지 않는다 — 나무가 없는 곳(남쪽 숲 칸의 구멍들)이 사방으로 그만큼 이어지는 자리에만
  const open = (p) => holes.some((h) => inside(p, h))
  const underCanopy = ([x, y]) => ![[0, 0], [0, 28], [0, -20], [-24, 0], [24, 0], [-18, 22], [18, 22]].every(([dx, dy]) => open([x + dx, y + dy]))
  const ok = (p) => !boxes.some((b) => inBox(p, b)) && !underCanopy(p)
  for (const [x, y] of scatter(main, 24, 'tv-glade-tufts', ok)) tufts += tuft(x, y, 6 + rand() * 4, rand)
  for (const [x, y] of scatter(main, 32, 'tv-glade-flowers', ok)) add(drift(x, y, 3 + Math.floor(rand() * 4), rand))
  others.forEach(([gl, seed]) => {
    for (const [x, y] of scatter(gl, 30, `${seed}-t`, ok)) tufts += tuft(x, y, 5 + rand() * 4, rand)
    for (const [x, y] of scatter(gl, 42, `${seed}-f`, ok)) add(drift(x, y, 2 + Math.floor(rand() * 3), rand, 10))
  })
  return [part('hatch', tufts), part('gold', gold), part('fill', pale)].map((q) => ({ ...q, phase }))
}
parts.push(
  ...floor(GLADE, [...[...GLADES, SOUTH_GLADE].map((g, i) => [g, `tv-g${i}`]), [BARD_GLADE, 'tv-gb']], [HOLE_TV, HOLE_TH, GLADE, SOUTH_GLADE, ...GLADES, BARD_GLADE], [NISSA_BOX, ...FIG_BOXES], true),
  ...floor(GLADE_OFF, GLADES_OFF.map((g, i) => [g, `tv-g${i}`]), [HOLE_TV, GLADE_OFF, ...GLADES_OFF], [], false),
)
// 빈터를 두른 큰 나무와 헤드론 — 뒤(위)에서 앞(아래)으로. 오른쪽 헤드론의 들린 끝 앞에 키 큰 나무 한 그루 (카드) —
// 줄기가 헤드론 몸을 가로지르고 뾰족한 끝은 줄기 오른쪽으로 나온다. 잎은 높이 올려 그 끝을 가리지 않는다
parts.push(
  ...K.stack([
    // 니사 오른쪽 뒤의 큰 나무 — 첫 보기에서 니사의 이름이 그림 오른쪽(자식 x 약 600–700)에 놓여, 줄기가 그 밖에 서게 동쪽으로
    { y: 556, parts: bigTree(748, 556, 88, 'tv-t1') },
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
  // Bojuka Bay 는 범위 북동쪽 밖에 놓인 세계 지도의 물 이름이 그대로 단다 — 여기 달면 동쪽 가장자리 띠에 걸려 옅어진다
  labels: [LABEL_TV, LABEL_GW],
  // 페이즈3(ROE) 대상의 빈터 — 페이즈3 에서만 이 안에 밑동이 떨어지는 지형 기호를 뺀다 (STYLE.md)
  clearings: [
    { points: [[662, 851], [656, 884], [646, 906], [627, 914], [601, 918], [576, 913], [557, 905], [549, 882], [542, 851], [546, 817], [560, 800], [573, 781], [601, 778], [629, 782], [642, 800], [654, 819]], phase3: true }, // joraga-treespeaker
    { points: [[301, 267], [299, 301], [286, 321], [266, 331], [239, 341], [210, 334], [191, 322], [178, 301], [175, 267], [179, 233], [192, 214], [209, 199], [239, 198], [267, 201], [283, 216], [293, 236]], phase3: true }, // beastbreaker-of-bala-ged
  ],
  subjects: {
    // Joraga Treespeaker(ROE) — 숲 빈터 가장자리의 정글 나무 밑동에 손바닥을 대고 귀를 기울이는 조라가 엘프 드루이드, 뿌리에서 줄기로 잎 모양 마나가 감아 오른다 (페이즈3)
    'joraga-treespeaker': { at: [585, 895], size: 95 },
    // Beastbreaker of Bala Ged(ROE) — 빽빽한 밀림 틈에 버티고 서서 끝에 올가미 밧줄이 달린 긴 갈고리 막대를 세워 쥔 발라 게드의 인간 전사. (페이즈3)
    'beastbreaker-of-bala-ged': { at: [240, 310], size: 95 },
    'hideous-end': HIDEOUS,
    'slaughter-cry': CRY,
    'joraga-bard': BARD,
    'nissas-chosen': CHOSEN,
    'savage-silhouette': SAVAGE,
    'tanglesap': TANGLESAP,
    'stonework-puma': PUMA,
    'greenweaver-druid': DRUID,
    'bala-ged-thief': THIEF,
    'beastmaster-ascension': PACK,
    'oracle-of-mul-daya': ORACLE,
    'nissa-revane': NISSA,
  },
  // Evolving Wilds 표시는 왼쪽 아래 단추 자리 곁이라 이름을 지도 안쪽(오른쪽)으로
  markAnchors: { 'card:evolving-wilds': 'right' },
  // 휴대폰 첫 화면 — 가운데 여섯 그림(Nissa's Chosen 까지)과 헤드론 빈터가 함께 들게 (폭 약 460, 머리말 밑부터 아래 끝
  // 단추 위까지). 동·서쪽 가장자리의 커먼 그림들은 옆으로 밀어 본다.
  // 세로는 Guum Wilds 이름이 머리말 밑에 붙지 않게 조금 내린다
  focus: [625, 470],
})
