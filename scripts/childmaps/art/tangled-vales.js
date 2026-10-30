// 뒤엉킨 계곡 (Tangled Vales) — 발라 게드 남부, 조라가 엘프의 옛 터전. Zendikar Rising(2020) 이후의 모습(페이즈를 끈 지도 — 그 무렵 모습은 아래 '페이즈별 모습').
// 공식 근거: 숲이 '마법만이 낼 수 있는 속도로' 되살아나는 발라 게드(Episode 5, 2020), 대지 카드 '뒤엉킨 계곡'
// (ZNR #211) 그림의 들꽃 깔린 숲 빈터와 쓰러진 헤드론 두 개(이 지도의 중심), 2024년 '발라 게드의 늪에 돌아온 생명'
// (Sanguine Syphoner) — Bojuka Bay 기슭의 좁은 늪 가장자리로. 만을 두른 절벽(PG: Bala Ged, 2009 'the surrounding cliffs')은
// 세계 지도(src/data/landscape/bala-ged.ts 의 bojuka-cliffs-southwest)의 선을 이 축척으로 그대로 옮겨(세계 지도처럼 한 번
// 다듬어) 긋는다 — 바위 지형이라 침공 뒤에도 남은 것으로 본 세계 지도의 추정을 따른다. 처음 브리프는 이 절벽을 그리지
// 말라고 했지만(2009년 모습), 두 지도가 어긋나지 않게 세계 지도를 따른다. 폭포는 세계 지도처럼 그리지 않는다(페이즈를 끈 지도).
// 세계 지도의 다른 바탕 지형 가운데 이 범위에 드는 것은 이 절벽뿐이다(Guum Wilds 의 늪 guum-bog-riverroot 는 범위 서쪽 밖에
// 일부러 좁게 두어 이 지도의 서쪽 가장자리에는 늪이 없다 — 여기서도 그리지 않는다). 강은 세계 지도에도 이 범위에 없다(사가1 의 Umung 강은 아래).
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
// 페이즈2(WWK) 레어 Joraga Warcaller(조라가 엘프 전사 — 카드 이름, 공식: 조라가 씨족이 계곡에 터전을 이룬다)는 헤드론 빈터 동쪽,
// 둘째·셋째 등성이 사이 골짜기 숲(짐승 무리의 남쪽 빈터와 Hideous End·Joraga Bard 사이)에서 빈터(서쪽)를 보고 씨족을 부른다 —
// 자리는 이 지도의 해석. 그림과 이름 자리는 빈터(phase2: true)로만 나무·언덕 기호를 비운다.
// 이 지도의 해석: 숲의 짙고 옅음(북쪽이 Guum Wilds 쪽으로 짙다), 빈터들과 헤드론 빈터의 자리, 늪 가장자리(절벽 위),
// 니사와 모든 페이즈 대상의 자리.
//
// 페이즈별 모습 — 페이즈를 끈 지도(2020 이후, 되살아난 숲)는 위와 같고, 그 무렵 모습이 달랐다고 공식 자료가 밝힌 단계만 따로 그린다.
// 세계 지도의 페이즈 바탕(src/data/periods/bala-ged.ts)과 같은 자리·같은 단계로 맞춘다.
// - 사가1 페이즈1–3(ZEN·WWK·ROE, 2009–10, 문 { phase: true }) — 가파른 언덕 사이의 정글 골짜기. PG: Bala Ged and Elves(2009):
//   "The Tangled Vales are a number of interconnected jungle valleys that run between steep hills that ripple across the
//   southern portion of Bala Ged." 언덕은 세계 지도 relief 'tangled-vales-2009-hills' 의 등성이 셋(RIDGES)과 같은 자리에 언덕 칸을 깔고,
//   그 자리의 나무 기호(숲 칸)와 절벽 위 늪 띠를 뺀다 — 사가1 의 숲·늪 칸은 등성이를 뺀 모양으로 다시 땄다(retrace). 골짜기의 숲은 그대로.
//   Umung 강은 같은 글의 "The Umung River descends in steps from the interior to sea level as it passes through Bala Ged."
//   를 따라, 세계 지도 'umung-river-2009' 의 물길(세계 지도가 다듬은 그대로)과 단의 폭포 'umung-step-1' 을 이 축척으로 옮겨
//   계곡 북쪽 골짜기에 그린다. 물길과 단의 자리는 공식 자료에 없어 세계 지도의 추정을 따른다. 빈터 바닥(풀포기·들꽃)은 골짜기에만
//   깔고(등성이는 언덕 기호가 덮는다), 언덕 위의 그림·이름 둘레에는 언덕 기호를 비운다. ROE(2010) 무렵 이미 무너졌다는 서술이 없어
//   페이즈3 까지 같다.
// - 사가2 페이즈1·2(BFZ·OGW, 2015–16, 문 { phase4: true } / 지우는 쪽 { phase4: false }) — 흰 가루 평원. Nissa's Resolve(2015):
//   "There were no dead trees. There were not even vestiges of dead trees; the white landscape was completely flat, the trees had
//   all disintegrated." / "Her knees instinctively braced themselves to climb a hill that didn't exist." / "the path that the
//   Umung River used to take through the Vales—now just more chalky corruption." 아트북(2016): "swamps, forests, hills, and cities
//   across Bala Ged were reduced to fine, powdery white sand". 흰 칠과 숲 채색 걷기는 앱이 세계 지도 'bala-ged-white-dust' 로 그리고,
//   여기서는 숲·늪 칸과 손그림 큰 나무·빈터 바닥·헤드론 둘레 풀포기를 끄고 흰 가루 칸(dust)을 깐다. 만의 물과 둘레 절벽은 남긴다 —
//   Blighted Cataract(BFZ #229): "Now only dust and ash fall from the clifftops." 만의 물과 절벽 면에는 가루 기호를 비운다.
//   2016년(OGW)에 되살아났다는 서술이 없어 페이즈2 도 같다(숲은 2020년 Episode 5 에야 돌아온다).
// - 쓰러진 헤드론 둘은 ZNR(2020) 카드 그림에서 왔고 2009–16년에 그 자리에 있었는지 자료가 없다 — 없었다는 서술도 없어 모든 단계에
//   그대로 둔다. 사가2 에서는 둘레 풀포기 대신 흰 가루에 묻힌 밑동 선과 짧은 바람결 둘을 긋는다(그 꼴은 이 지도의 해석).
//   헤드론 빈터 곁의 큰 나무 셋은 사가1 정글에도 두고 사가2 에서만 뺀다.
// 그리지 않는 것(브리프 mustNotInvent): 조라가 마을·천막·화덕·길·덫, bloodbriar(사가1 에 있었지만 자리·모양 단서가 없다), 페이즈 대상 밖의
// 다른 생물, 사가1 의 만 둘레 폭포(세계 지도의 폭포 둘은 이 범위 밖이다), 사가2 의 마른 강바닥(옛 물길도 '흰 오염'이라 가루 평원과 같다),
// surrakar 굴 입구(Guum Wilds 깊은 곳 — 이 범위 밖).

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
  // 사가2 — 풀 대신 흰 가루에 묻힌다: 몸이 땅에 닿는 곳을 따라(양끝 4 씩 더) 가루 선 한 줄, 들린 끝 바람 밑으로 짧은 바람결 둘.
  // 따로 씨앗을 써서 위 풀포기의 난수 차례는 그대로다
  const rd = K.rng(`${seed}-dust`)
  const lowAt = (gx) => {
    let under = -Infinity
    for (let k = 0; k < 4; k++) {
      const a = ring[k]
      const b = ring[(k + 1) % 4]
      if ((a[0] - gx) * (b[0] - gx) > 0 || a[0] === b[0]) continue
      under = Math.max(under, a[1] + ((b[1] - a[1]) * (gx - a[0])) / (b[0] - a[0]))
    }
    return under
  }
  const xsOn = []
  for (let gx = Math.min(...xs); gx <= Math.max(...xs); gx += 1.5) if (lowAt(gx) > G(gx) - 4) xsOn.push(gx)
  let dust = ''
  if (xsOn.length) {
    const ground = []
    for (let gx = xsOn[0] - 4; gx <= xsOn[xsOn.length - 1] + 4; gx += 1.5) ground.push([gx, G(gx) + 0.8])
    dust += K.line(ground)
    for (let i = 0; i < 2; i++) {
      const x0 = xsOn[xsOn.length - 1] + 6 + rd() * 8 + i * 10
      const y0 = G(x0) + 2.5 + i * 2.5 + rd()
      const len = 9 + rd() * 6
      dust += K.line([[x0, y0], [x0 + len, y0 - len * 0.12]]) // 세계 지도 흰 가루 기호의 바람결 방향(periodGlyphs.ts WIND)
    }
  }
  // 둘레 풀포기·들꽃은 사가2(흰 가루 평원)에는 없다 — 헤드론 몸은 모든 단계에 그대로
  return [
    part('fill', lit),
    part('stone', dark),
    part('hatch', hatch + rune),
    part('ink', edges),
    part('ink-bold', sil),
    ...gate([part('hatch', grass), part('gold', gold), part('fill', pale)], NOT_DUST),
    ...(dust ? [{ ...part('hatch', dust), phase4: true }] : []),
  ]
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

// ── 고리 다시 따기 — 사가1 의 언덕 자리를 숲·늪 칸에서 뺀다 ──
// 칸은 고리 하나(짝홀 규칙, 구멍은 다리로 잇는다)만 받고 구멍끼리 겹치면 안 되는데, 언덕 등성이는 그림 틈·빈터 구멍과 겹치고 숲 칸의 경계를
// 가로지른다. 그래서 '칸 안(짝홀) 이면서 등성이 밖'인 곳을 격자로 따라(경계 점은 격자 변과 고리 변의 교점이라 정확하다) 고리를 새로 잇는다.
/** 고리(짝홀, 다리 포함)를 가로줄 y 가 자르는 x 들 — inside() 와 같은 반열린 규칙, 오름차순 */
function crossX(ring, y) {
  const xs = []
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y) xs.push(((xj - xi) * (y - yi)) / (yj - yi) + xi)
  }
  return xs.sort((a, b) => a - b)
}
/** 고리를 세로줄 x 가 자르는 y 들 (오름차순) — 격자 세로 변 위의 경계 점 */
function crossY(ring, x) {
  const ys = []
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (xi > x !== xj > x) ys.push(((yj - yi) * (x - xi)) / (xj - xi) + yi)
  }
  return ys.sort((a, b) => a - b)
}
/** 가로줄의 자르는 점 xs(오름차순)로 격자 점 x0 + i·s (i < n) 가 고리 안인가 — inside() 와 같은 판정을 한 줄에 몰아서 */
function rowIn(xs, x0, s, n) {
  const out = new Uint8Array(n)
  let k = 0
  for (let i = 0; i < n; i++) {
    while (k < xs.length && xs[k] <= x0 + i * s) k++
    out[i] = (xs.length - k) & 1
  }
  return out
}
/** 오름차순 목록에서 (lo, hi] 에 드는 첫 값 */
function firstIn(list, lo, hi) {
  for (const t of list) if (t > lo && t <= hi) return t
  return null
}
/** 꺾은선 단순화 (Ramer–Douglas–Peucker, 열린 선) */
function rdp(pts, tol) {
  if (pts.length < 3) return pts
  const [ax, ay] = pts[0]
  const [bx, by] = pts[pts.length - 1]
  const len = Math.hypot(bx - ax, by - ay)
  let best = -1
  let at = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i]
    const d = len < 1e-9 ? Math.hypot(px - ax, py - ay) : Math.abs((px - ax) * (by - ay) - (py - ay) * (bx - ax)) / len
    if (d > best) {
      best = d
      at = i
    }
  }
  if (best <= tol) return [pts[0], pts[pts.length - 1]]
  return [...rdp(pts.slice(0, at + 1), tol).slice(0, -1), ...rdp(pts.slice(at), tol)]
}
/**
 * keep 고리 안(짝홀)이면서 cuts 고리들 밖인 곳의 경계를 격자(간격 s, marching squares)로 따라 다시 이은 고리 (경계 점은 격자 변과 고리 변의 교점).
 * 닫힌 경계 고리들을 다리로 이은 하나의 고리(짝홀)라 그대로 칸에 쓴다. 안장 칸은 안쪽 꼭짓점을 잇지 않는 쪽으로 가른다
 */
function retrace(keep, cuts, s = 2, tol = 0.3) {
  const xs = keep.map((p) => p[0])
  const ys = keep.map((p) => p[1])
  const x0 = Math.floor(Math.min(...xs)) - s
  const y0 = Math.floor(Math.min(...ys)) - s
  const nx = Math.ceil((Math.max(...xs) - x0) / s) + 2
  const ny = Math.ceil((Math.max(...ys) - y0) / s) + 2
  const v = new Uint8Array(nx * ny)
  // 가로줄마다 모든 고리의 자르는 점 — 안팎 판정과 가로 변 위의 경계 점에 함께 쓴다
  const rowX = []
  for (let j = 0; j < ny; j++) {
    const y = y0 + j * s
    const kx = crossX(keep, y)
    const cx = cuts.map((r) => crossX(r, y))
    rowX.push([...kx, ...cx.flat()].sort((a, b) => a - b))
    const a = rowIn(kx, x0, s, nx)
    const c = cx.map((xs) => rowIn(xs, x0, s, nx))
    for (let i = 0; i < nx; i++) v[j * nx + i] = a[i] && !c.some((m) => m[i]) ? 1 : 0
  }
  // 세로줄의 자르는 점 — 세로 변 위의 경계 점 (필요한 줄만)
  const colY = new Map()
  const colOf = (i) => {
    let ys = colY.get(i)
    if (!ys) colY.set(i, (ys = [keep, ...cuts].flatMap((r) => crossY(r, x0 + i * s)).sort((a, b) => a - b)))
    return ys
  }
  // 격자 변: 가로 변 (i,j)–(i+1,j) 은 2k, 세로 변 (i,j)–(i,j+1) 은 2k+1 (k = j·nx + i). 경계 점은 그 변을 자르는 고리 변과의 교점 그대로
  const H = (i, j) => 2 * (j * nx + i)
  const V = (i, j) => 2 * (j * nx + i) + 1
  const vert = new Map()
  const pointOf = (id) => {
    let p = vert.get(id)
    if (p) return p
    const k = id >> 1
    const i = k % nx
    const j = (k - i) / nx
    const ax = x0 + i * s
    const ay = y0 + j * s
    if (id & 1) {
      const t = firstIn(colOf(i), ay, ay + s)
      p = [ax, t ?? ay + s / 2]
    } else {
      const t = firstIn(rowX[j], ax, ax + s)
      p = [t ?? ax + s / 2, ay]
    }
    vert.set(id, p)
    return p
  }
  // 칸 모양(TL·TR·BR·BL 의 안팎 4비트) → 잇는 변 쌍
  const CASES = { 1: [['L', 'B']], 2: [['B', 'R']], 3: [['L', 'R']], 4: [['T', 'R']], 5: [['T', 'R'], ['L', 'B']], 6: [['T', 'B']], 7: [['T', 'L']], 8: [['T', 'L']], 9: [['T', 'B']], 10: [['T', 'L'], ['B', 'R']], 11: [['T', 'R']], 12: [['L', 'R']], 13: [['B', 'R']], 14: [['L', 'B']] }
  const link = new Map()
  const join = (a, b) => {
    link.set(a, [...(link.get(a) ?? []), b])
    link.set(b, [...(link.get(b) ?? []), a])
  }
  for (let j = 0; j < ny - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      const c = (v[j * nx + i] << 3) | (v[j * nx + i + 1] << 2) | (v[(j + 1) * nx + i + 1] << 1) | v[(j + 1) * nx + i]
      const segs = CASES[c]
      if (!segs) continue
      const E = { T: H(i, j), R: V(i + 1, j), B: H(i, j + 1), L: V(i, j) }
      for (const [a, b] of segs) join(E[a], E[b])
    }
  const loops = []
  const seen = new Set()
  for (const start of [...link.keys()].sort((a, b) => a - b)) {
    if (seen.has(start)) continue
    const loop = []
    let prev = -1
    let cur = start
    while (!seen.has(cur)) {
      seen.add(cur)
      loop.push(pointOf(cur))
      const next = link.get(cur).find((n) => n !== prev && !seen.has(n)) ?? link.get(cur).find((n) => n !== prev)
      prev = cur
      cur = next
    }
    if (loop.length < 4) continue
    // 닫힌 선 단순화 — 첫 점과 가장 먼 점에서 둘로 나눠
    let far = 0
    loop.forEach((p, k) => {
      if (Math.hypot(p[0] - loop[0][0], p[1] - loop[0][1]) > Math.hypot(loop[far][0] - loop[0][0], loop[far][1] - loop[0][1])) far = k
    })
    const simple = [...rdp(loop.slice(0, far + 1), tol).slice(0, -1), ...rdp([...loop.slice(far), loop[0]], tol).slice(0, -1)]
    if (simple.length >= 3) loops.push(simple.map(([x, y]) => [r1(x), r1(y)]))
  }
  return loops.length ? withHoles(loops[0], loops.slice(1)) : []
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
// 그 구멍의 아랫부분 — Evolving Wilds 이름 자리만 (고블린 틈을 뺀 것, y 846 아래). 시점별 보기에서 고블린을 그리지 않는 시점에 이름 둘레만 비운다
const HOLE_EW_NAME = [[190, 846], [354, 846], [338, 926], [140, 926], [136, 856]]

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
// 페이즈2(WWK) — 조라가 전사가 팔을 들어 씨족을 부른다. 헤드론 빈터 동쪽, 둘째 등성이 밑(x 945 에서 y 약 637)과 셋째 등성이 위
// (약 770) 사이 골짜기 숲. 서쪽(빈터 쪽)을 보게 뒤집는다 — 그림 x 약 913–978 · y 631–726. 처음 나오는 배율(tier 5)에서 밑의 이름
// (x 약 862–1026 · y 737–763)이 짐승 무리 그림(x ≤ 858)과 Hideous End 의 이름(x 984– · y ≤ 638) 사이에 들게 x 를 잡았다
const WARCALLER = { at: [945, 725], size: 95, flip: true }
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

// ── 사가1(2009–10) 의 가파른 언덕과 Umung 강 — 세계 지도 페이즈 바탕에서 옮긴 고정 지형 (context.mjs 의 periods) ──
// 등성이 셋 — 세계 지도 relief 'tangled-vales-2009-hills' 의 고리(chaikin 2 로 다듬은 것)를 이 지도 좌표로 옮긴 그대로
// (context.mjs tangled-vales 의 periods.terrain rings). 세계 지도의 고리를 고치면 다시 옮긴다
const RIDGES = [
  [[147.9, 187.5], [218.8, 179.2], [292.7, 174], [369.8, 171.9], [616.7, 178.1], [700, 176], [783.3, 170.8], [866.7, 162.5], [943.8, 158.3], [1014.6, 158.3], [1079.2, 162.5], [1137.5, 170.8], [1183.3, 182.3], [1216.7, 196.9], [1237.5, 214.6], [1245.8, 235.4], [1238, 253.1], [1214.1, 267.7], [1174, 279.2], [1054.7, 295.8], [908.3, 312.5], [658.3, 334.4], [491.7, 343.8], [410.9, 345.3], [332.8, 344.3], [257.3, 340.6], [184.4, 334.4], [127.6, 321.9], [87, 303.1], [62.5, 278.1], [54.2, 246.9], [65.6, 221.4], [96.9, 201.6]],
  [[204.2, 487.5], [279.2, 479.2], [357.3, 476], [438.5, 478.1], [522.9, 485.4], [610.4, 497.9], [696.9, 505.2], [782.3, 507.3], [866.7, 504.2], [950, 495.8], [1025, 491.7], [1091.7, 491.7], [1150, 495.8], [1200, 504.2], [1236.5, 515.6], [1259.4, 530.2], [1268.8, 547.9], [1264.6, 568.8], [1247.4, 586.5], [1217.2, 601], [1174, 612.5], [1117.7, 620.8], [984.9, 634.4], [825, 643.8], [741.7, 645.8], [658.3, 645.8], [491.7, 639.6], [413, 634.4], [269.8, 620.8], [205.2, 612.5], [155.7, 600], [121.4, 583.3], [102.1, 562.5], [97.9, 537.5], [113.5, 516.7], [149, 500]],
  [[304.2, 754.2], [379.2, 745.8], [456.3, 742.7], [535.4, 744.8], [616.7, 752.1], [700, 764.6], [780.7, 771.9], [858.9, 774], [934.4, 770.8], [1007.3, 762.5], [1068.8, 759.4], [1118.8, 761.5], [1157.3, 768.8], [1184.4, 781.3], [1200, 793.8], [1204.2, 806.3], [1196.9, 818.8], [1178.1, 831.3], [1146.4, 844.8], [1101.6, 859.4], [1043.8, 875], [972.9, 891.7], [899, 903.1], [821.9, 909.4], [741.7, 910.4], [351, 889.6], [293.2, 879.2], [250.5, 862.5], [222.9, 839.6], [210.4, 810.4], [219.8, 786.5], [251, 767.7]],
]
// Umung 강 (2009) — 세계 지도가 'umung-river-2009' 의 물길을 다듬은 점(landscape.ts 의 shapeRivers: chaikin 3·1.5 간격·굽이 잡음)과
// 그 자리의 강폭을 이 지도 좌표로 옮긴 [x, y, 폭]. 범위 서쪽 끝(세계 x 2082)에서 솟아 계곡 북쪽 골짜기를 지나 범위 북쪽으로 나간다
// (범위 밖은 세계 지도가 그린다). 세계 지도의 물길을 고치면 다시 옮긴다
const UMUNG = [[8.3, 166.7, 3], [20, 162.2, 3.21], [31.6, 157.6, 3.36], [43.2, 152.9, 3.5], [54.7, 148, 3.63], [66.2, 143.2, 3.75], [77.8, 138.3, 3.87], [89.4, 133.7, 3.99], [101.3, 129.6, 4.1], [113.2, 125.9, 4.21], [125.3, 122.5, 4.31], [137.4, 119.4, 4.42], [149.5, 116.2, 4.52], [161.5, 113, 4.62], [173.6, 109.8, 4.72], [185.8, 106.8, 4.82], [197.9, 103.8, 4.91], [210.1, 101.2, 5.01], [222.4, 98.8, 5.1], [234.8, 97.1, 5.19], [247.3, 96.1, 5.29], [259.9, 95.5, 5.38], [272.4, 95.2, 5.47], [284.9, 94.8, 5.56], [297.4, 93.9, 5.64], [309.8, 92.9, 5.73], [322.3, 92.2, 5.82], [334.8, 91.6, 5.91], [347.2, 91, 5.99], [359.7, 90.3, 6.08], [372.1, 89.5, 6.16], [384.5, 88.3, 6.24], [396.9, 86.6, 6.33], [409.3, 84.7, 6.41], [421.7, 82.9, 6.49], [434.1, 81.5, 6.58], [446.6, 80.6, 6.66], [459.1, 79.7, 6.74], [471.5, 78.5, 6.82], [484, 77, 6.9], [496.4, 75.5, 6.98], [508.8, 74, 7.06], [521.3, 72.8, 7.14], [533.7, 72.1, 7.22], [546.3, 72.2, 7.29], [558.9, 72.4, 7.37], [571.5, 72.6, 7.45], [584.1, 72.4, 7.53], [596.6, 71.3, 7.6], [608.9, 68.8, 7.68], [621, 64.9, 7.76], [633, 60.3, 7.83], [644.5, 54.9, 7.91], [655.9, 49.7, 7.98], [667.2, 45.2, 8.06], [678.8, 41.6, 8.13], [690.9, 38.6, 8.21], [703.2, 35.3, 8.28], [715.4, 30.8, 8.36], [726.9, 24.8, 8.43], [737.3, 16.9, 8.5], [745.4, 6.6, 8.58], [751.7, -4.7, 8.65], [756.6, -16.6, 8.72], [761.3, -28.6, 8.79], [766.2, -40.2, 8.87]]
// 단의 폭포 — 세계 지도 glyph 'umung-step-1' (세계 (2134, 949.5), 크기 0.8, 각 -90°: 물이 동쪽으로 떨어진다)
const STEP1 = { at: [((2134 - 2081) * 25) / 3, ((949.5 - 940) * 25) / 3], size: 0.8, angle: -90 }
// 강과 폭포 둘레의 빈터 — 세계 지도가 그 무렵의 강·폭포 둘레 기호를 비우는 폭(강 4.5 + 폭/2, 폭포 8 단위)과 같게 (context.mjs 의 periods.redraw suggest)
const UMUNG_CLEAR = [[694.7, -8.3], [805.3, -8.3], [741.7, 80.2], [733.3, 87.4], [716.7, 94.2], [541.7, 119.3], [350, 128], [175, 151.5], [25, 208.5], [8.3, 211.7], [-8.3, 208.5], [-8.3, 124.9], [150, 64.1], [341.7, 38.3], [533.3, 29.5], [681.8, 8.3], [691.7, -4.1]]
const STEP1_CLEAR = [[418.5, 16.7], [441.7, 12.5], [466.7, 17.4], [490.1, 33.3], [505, 58.3], [508.2, 83.3], [501.6, 108.3], [490.1, 125], [466.7, 141], [441.7, 145.8], [416.7, 141], [393.3, 125], [378.3, 100], [375.1, 75], [381.7, 50], [393.3, 33.3], [416.7, 17.4]]

// ── 사가2(2015–16) 의 흰 가루 평원 ──
// 세계 지도 ground 'bala-ged-white-dust' 의 땅(굴 드라즈·발라 게드 해안 안쪽)을 이 범위(가장자리 띠 너머 조금)로 자른 모양
// (context.mjs tangled-vales 의 periods.terrain suggest)
const DUST = [[-8.3, -8.3], [1358.3, -8.3], [1358.3, 742], [1291.7, 801.3], [1189.6, 875], [1166.7, 884.2], [1116.7, 892.7], [1091.7, 903.3], [1057.1, 925], [1016.7, 964.3], [991.1, 1000], [990.8, 1008.3], [-8.3, 1008.3]]
/** 사가2 에서 지우는 것 — 숲·늪 칸과 살아 있는 풀·나무 그림 (흰 가루 평원) */
const NOT_DUST = { phase4: false }
const gate = (ps, g) => ps.map((q) => ({ ...q, ...g }))

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

// 칸의 차례(=씨앗 번호)는 바꾸지 않는다 — 그 무렵에만 쓰는 칸은 끝에 붙인다.
// 사가1 칸(문 phase: true)은 사가1 의 모든 페이즈가 2009년의 언덕을 그리므로 등성이 자리를 뺀 모양(retrace)으로 바꿨다(끔·사가2 에는 쓰이지 않는다).
// 끔에 쓰이는 칸(늪, phase: false 숲)은 모양을 두고 문만 더해 끔에서만 쓰이게 하고, 사가1 의 늪은 끝에 따로 둔다
const terrain = [
  // Bojuka Bay 기슭의 좁은 늪 (해석: 2009년의 '늪진 만', 2024년 '발라 게드의 늪에 돌아온 생명') — 씨앗이 바뀌지 않게 맨 앞에.
  // 끔에서만 — 사가1 은 등성이를 뺀 늪(끝), 사가2 는 흰 가루 평원
  { kind: 'swamp', points: BOG, density: 0.75, phase: false, ...NOT_DUST },
  // 북쪽 — Guum Wilds 쪽으로 이어지는 짙은 숲 (사가1: 2009년의 정글 골짜기 — 등성이 자리는 언덕)
  // (시점별 보기는 이 셋 대신 끝의 시점별 칸 — 그림 자리 구멍 없이 등성이만 뺀 숲. 그림 자리는 카드에 매인 빈터가 그 시점에만 연다)
  { kind: 'forest', points: retrace(withHoles(NORTH, [HOLE_GW_N, HOLE_OR, HOLE_TS.n, HOLE_PU.n].filter(ok3)), RIDGES), density: 0.62, phase: true, time: { t1: false, t2: false } },
  { kind: 'forest', points: retrace(withHoles(MIDDLE, [HOLE_GW_M, HOLE_TS.m, HOLE_PU.m].filter(ok3)), RIDGES), density: 0.44, phase: true, time: { t1: false, t2: false } },
  // 가운데와 남쪽 — 다시 자라는 성긴 숲, 들꽃 빈터
  { kind: 'forest', points: retrace(withHoles(SOUTH, [HOLE_TV, HOLE_TH, GLADE, SOUTH_GLADE, ...GLADES, BARD_GLADE, HOLE_EW, HOLE_TS.s, HOLE_PU.s].filter(ok3)), RIDGES), density: 0.33, phase: true, time: { t1: false, t2: false } },
  // 페이즈1 이 꺼졌을 때 — 같은 숲, 이름 자리와 본디 빈터만 비운다 (끔에서만 — 사가2 는 흰 가루 평원)
  { kind: 'forest', points: withHoles(NORTH, [HOLE_GW_OFF]), density: 0.62, phase: false, ...NOT_DUST },
  { kind: 'forest', points: MIDDLE, density: 0.44, phase: false, ...NOT_DUST },
  { kind: 'forest', points: withHoles(SOUTH, [HOLE_TV, GLADE_OFF, ...GLADES_OFF, HOLE_EW_OFF]), density: 0.33, phase: false, ...NOT_DUST },
  // 사가1 — 가파른 언덕 등성이 셋 (세계 지도 relief 와 같은 밀도)
  { kind: 'hill', points: withHoles(RIDGES[0], RIDGES.slice(1)), density: 0.55, phase: true },
  // 사가1 — 절벽 위 늪 띠에서 첫 등성이의 동쪽 끝을 뺀 것
  { kind: 'swamp', points: retrace(BOG, RIDGES), density: 0.75, phase: true },
  // 사가2 — 흰 가루 평원 (만의 물·절벽 면과 이름 자리는 빈터로 비운다)
  { kind: 'dust', points: DUST, density: 1, phase4: true },
  // 시점별 보기 2009–2010 — 사가1 의 숲(등성이 자리는 언덕)에서 그림 자리 구멍을 뺀 것 ('페이즈1 이 꺼졌을 때'의 구멍만). 그 시점에 그리는
  // 그림의 자리는 그 카드에 매인 빈터가 연다
  { kind: 'forest', points: retrace(withHoles(NORTH, [HOLE_GW_OFF]), RIDGES), density: 0.62, time: { t1: true, t2: true }, timeOnly: true },
  { kind: 'forest', points: retrace(MIDDLE, RIDGES), density: 0.44, time: { t1: true, t2: true }, timeOnly: true },
  { kind: 'forest', points: retrace(withHoles(SOUTH, [HOLE_TV, GLADE_OFF, ...GLADES_OFF, HOLE_EW_OFF]), RIDGES), density: 0.33, time: { t1: true, t2: true }, timeOnly: true },
]

// ── 니사와 중심 빈터 ──
const NISSA = { at: [568, 606], size: 92, flip: true }
// 니사의 그림과 이름 자리 — 풀포기·들꽃을 두지 않는다 (휴대폰에서는 이름이 지도 단위로 더 넓다)
const NISSA_BOX = [514, 500, 622, 644]
// 짐승 무리의 그림과 이름 자리 — 남쪽 빈터의 풀포기·들꽃이 다리 사이와 이름을 어지럽히지 않게
const PACK_BOX = [686, 748, 868, 892]
// 새 그림들의 그림·이름 자리 — 빈터의 풀포기·들꽃을 두지 않는다
const FIG_BOXES = [PACK_BOX, [428, 596, 526, 728], [186, 496, 360, 652], [985, 492, 1099, 630], [1058, 682, 1142, 816]]
// 그 그림들의 카드 (FIG_BOXES 와 같은 차례)
const FIG_CARDS = ['beastmaster-ascension', 'nissas-chosen', 'savage-silhouette', 'hideous-end', 'joraga-bard']

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
/** 사가1 의 Umung 강 — 세계 지도의 강 그리기(landscape.ts 의 riverPaths)와 같은 셈: 다듬은 점마다 오른쪽 법선으로 강폭의 반씩 */
function umungRiver() {
  const n = UMUNG.length
  const nrm = UMUNG.map((_, i) => {
    const a = UMUNG[Math.max(0, i - 1)]
    const b = UMUNG[Math.min(n - 1, i + 1)]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    return [-(b[1] - a[1]) / len, (b[0] - a[0]) / len]
  })
  const side = (sgn) => UMUNG.map(([x, y, w], i) => [x + (nrm[i][0] * sgn * w) / 2, y + (nrm[i][1] * sgn * w) / 2])
  return [part('sea', K.poly([...side(-1), ...side(1).reverse()])), part('sea-ink', K.line(side(-1)) + K.line(side(1)))]
}
/**
 * 사가1 의 단의 폭포 — 세계 지도 폭포 기호(landscapeGlyphs.ts 의 waterfall: 두 단으로 떨어지는 물줄기와 물보라, 위 단 벼랑 끝과 가운데 바위턱)를
 * 같은 자리·크기·각으로 옮긴 것. 가장자리 띠에서 세계 지도 기호와 한 몸으로 겹친다. 물보라 점은 작은 동그라미로 (그림 부분의 선 끝은 둥글지 않다)
 */
function umungStep({ at: [x0, y0], size, angle }) {
  const s = (size * 25) / 3
  const rot = (angle * Math.PI) / 180
  const c = Math.cos(rot)
  const sn = Math.sin(rot)
  const P = (u, v) => [x0 + (u * c - v * sn) * s, y0 + (u * sn + v * c) * s]
  const M = (u, v) => `M${pt(P(u, v))}`
  const L = (u, v) => `L${pt(P(u, v))}`
  const Q = (cu, cv, u, v) => `Q${pt(P(cu, cv))} ${pt(P(u, v))}`
  const fall = (u0, v0, v1) => `${M(u0, v0)}${Q(u0 + 0.25, (v0 + v1) / 2, u0 - 0.1, v1)}`
  let water = ''
  for (const u of [-2.6, -1, 0.6, 2.2]) water += fall(u, 0.4, 4.4)
  for (const u of [-1.9, -0.3, 1.4]) water += fall(u, 5.2, 8.2)
  let spray = ''
  for (const [u, v] of [[-2.8, 9.2], [-1.2, 9.8], [0.4, 9.3], [2, 9.9], [-0.4, 10.8], [1.3, 10.9], [-2, 10.6]]) spray += speck(...P(u, v), 0.9)
  return [
    part('sea', `${M(-3.4, 0)}${L(3.2, 0)}${L(2.4, 4.6)}${L(2.2, 8.3)}${L(-2.4, 8.3)}${L(-2.8, 4.6)}Z`),
    part('sea-ink', water + spray),
    part('ink', `${M(-5.2, 0.2)}${L(-3.4, 0)}${L(3.2, 0)}${L(5, 0.3)}${M(-3.6, 4.7)}${L(-2.6, 4.6)}${M(2.4, 4.6)}${L(3.5, 4.8)}`),
    part('hatch', `${M(-4.8, 0.4)}${L(-5.1, 2.6)}${M(-4, 0.4)}${L(-4.2, 2)}${M(4.4, 0.5)}${L(4.6, 2.7)}${M(3.6, 0.4)}${L(3.8, 2.1)}`),
  ]
}
const SAGA1 = { phase: true }
// 만의 절벽은 모든 단계에 (사가2 에도 절벽은 남았다 — Blighted Cataract). 사가1 의 강과 단의 폭포는 그 바로 위에
const parts = [...worldCliff(), ...gate([...umungRiver(), ...umungStep(STEP1)], SAGA1)]
// 빈터 바닥 — 풀포기와 들꽃 (중심 빈터는 촘촘히, 다른 빈터는 성기게). 페이즈1 에서는 그림 자리를 비운 빈터에,
// 꺼지면 본디 빈터에 그림 자리 없이 깐다. g 는 붙일 페이즈 문, avoid 는 바닥을 깔지 않는 고리 (사가1 의 언덕 등성이)
function floor(main, others, holes, boxes, g, avoid = []) {
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
  const ok = (p) => !boxes.some((b) => inBox(p, b)) && !underCanopy(p) && !avoid.some((r) => inside(p, r))
  for (const [x, y] of scatter(main, 24, 'tv-glade-tufts', ok)) tufts += tuft(x, y, 6 + rand() * 4, rand)
  for (const [x, y] of scatter(main, 32, 'tv-glade-flowers', ok)) add(drift(x, y, 3 + Math.floor(rand() * 4), rand))
  others.forEach(([gl, seed]) => {
    for (const [x, y] of scatter(gl, 30, `${seed}-t`, ok)) tufts += tuft(x, y, 5 + rand() * 4, rand)
    for (const [x, y] of scatter(gl, 42, `${seed}-f`, ok)) add(drift(x, y, 2 + Math.floor(rand() * 3), rand, 10))
  })
  return gate([part('hatch', tufts), part('gold', gold), part('fill', pale)], g)
}
parts.push(
  // 사가1 — 그림 자리를 비운 빈터에, 언덕 등성이(언덕 기호가 덮는다)를 빼고 골짜기에만
  ...floor(GLADE, [...[...GLADES, SOUTH_GLADE].map((g, i) => [g, `tv-g${i}`]), [BARD_GLADE, 'tv-gb']], [HOLE_TV, HOLE_TH, GLADE, SOUTH_GLADE, ...GLADES, BARD_GLADE], [NISSA_BOX, ...FIG_BOXES], SAGA1, RIDGES),
  // 끔 — 본디 빈터 (사가2 의 흰 가루 평원에는 풀포기·들꽃이 없다)
  ...floor(GLADE_OFF, GLADES_OFF.map((g, i) => [g, `tv-g${i}`]), [HOLE_TV, GLADE_OFF, ...GLADES_OFF], [], { phase: false, ...NOT_DUST }),
)
// 빈터를 두른 큰 나무와 헤드론 — 뒤(위)에서 앞(아래)으로. 오른쪽 헤드론의 들린 끝 앞에 키 큰 나무 한 그루 (카드) —
// 줄기가 헤드론 몸을 가로지르고 뾰족한 끝은 줄기 오른쪽으로 나온다. 잎은 높이 올려 그 끝을 가리지 않는다.
// 큰 나무는 사가2(흰 가루 평원 — '죽은 나무조차 없었다')에만 없다
parts.push(
  ...K.stack([
    // 니사 오른쪽 뒤의 큰 나무 — 첫 보기에서 니사의 이름이 그림 오른쪽(자식 x 약 600–700)에 놓여, 줄기가 그 밖에 서게 동쪽으로
    { y: 556, parts: gate(bigTree(748, 556, 88, 'tv-t1'), NOT_DUST) },
    { y: groundOf(HL), parts: fallenHedron(HL.x, HL.y, HL.len, HL.rot, HL.sink, 'tv-hl') },
    { y: groundOf(HR), parts: fallenHedron(HR.x, HR.y, HR.len, HR.rot, HR.sink, 'tv-hr') },
    { y: 650, parts: gate(bigTree(824, 650, 98, 'tv-t2', { lift: 0.42 }), NOT_DUST) },
    { y: 768, parts: gate(bigTree(610, 768, 80, 'tv-t4'), NOT_DUST) },
  ]),
)

// ── 사가2 페이즈1(BFZ) 커먼 셋 — 모두 이 지도의 추정 자리. 사가2 에서는 사가1 의 그림·틈이 모두 꺼지고 땅은 흰 가루 평원(dust 칸)이라,
// 그림과 밑의 이름 자리만 빈터(phase4: true)로 가루 기호를 뺀다 ──
const S2 = {
  // Rush of Ice — 땅을 얼려 붙잡는 얼음 조각과 깨어나는 흙덩이(작은 주문 기호). Tangled Vales 이름 동쪽 끝 아래의 흰 가루 평원
  'rush-of-ice': { at: [930, 480], size: 50 },
  // Culling Drone — 계곡 북동쪽의 흰 가루 평원을 홀로 기어가는 울라목 혈통의 드론. 처음 나오는 배율에서 밑의 이름이 Blisterpod 의
  // 이름에 닿지 않게 브리프의 (1000, 330) 에서 서쪽으로 50
  'culling-drone': { at: [950, 330], size: 92 },
  // Blisterpod — 계곡과 만 사이, 절벽 쪽(끔의 늪 띠 서쪽) 흰 가루 평원의 부풀어 오른 드론
  'blisterpod': { at: [1116.7, 291.7], size: 91.7 },
}

// ── 그 무렵 모습의 빈터 ──
// 사가1 — 언덕 위의 그림·이름 둘레에서 언덕 기호(밑동에서 좌우 24–40, 위로 18 까지 그려진다)를 뺀다. 숲의 틈과 같은 모양을 쓰고,
// 빈터 속 그림 자리는 좌우 24, 밑으로 18 넓힌다 (숲 칸의 틈과 겹쳐 골짜기의 숲은 거의 그대로다).
// [모양, 카드 id] — 카드 하나의 자리만 비우는 빈터는 그 카드에 매어(for) 시점별 보기에서 그 카드를 그리는 시점에만 켠다 (timekeys.mjs).
// 장소·대지 이름 자리가 함께 든 빈터 가운데 Guum Wilds 이름과 Greenweaver Druid 는 이름이 늘 나오니 매지 않는다. Slaughter Cry 와 Evolving Wilds 이름의
// 빈터는 고블린에 매고, 고블린을 그리지 않는 시점(시점별 보기의 T2)에는 이름 자리만 비우는 시점별 보기 전용 빈터(끝, HOLE_EW_NAME)가 맡는다 —
// 사가 보기의 빈터는 그대로다
const HILL_CLEAR = [
  [HOLE_OR, 'oracle-of-mul-daya'],
  [columns(640, 856, GT, GB)], // Guum Wilds 이름과 Greenweaver Druid
  [box(914, 120, 1034, 283), 'tanglesap'],
  [HOLE_TH, 'bala-ged-thief'],
  [box(1075, 359, 1215, 496), 'stonework-puma'], // 밑의 등성이가 이름에 닿지 않게 밑으로 18
  [box(536, 380, 844, 496)], // Tangled Vales 이름 (같은 까닭으로 밑으로 18)
  [HOLE_EW, 'slaughter-cry'], // Slaughter Cry 와 Evolving Wilds 이름 (이름 자리는 시점별 보기에서 끝의 빈터도 맡는다)
  // 니사 — 이름이 그림 오른쪽(x 약 600–700)에 놓인다
  [box(NISSA_BOX[0] - 24, NISSA_BOX[1], 744, NISSA_BOX[3] + 18), 'nissa-revane'],
  // 짐승 무리(Beastmaster Ascension)·Nissa's Chosen·Savage Silhouette·Hideous End·Joraga Bard
  ...FIG_BOXES.map(([x0, y0, x1, y1], i) => [box(x0 - 24, y0, x1 + 24, y1 + 18), FIG_CARDS[i]]),
]
// 사가2 — 만의 물과 절벽 면(절벽 위 가장자리에서 24 안쪽까지)에는 가루 기호를 두지 않는다 (만의 물이 말랐다는 서술이 없다)
const BAY_CLEAR = [...BOG_SHORE, [1250, -60], [1420, -60], [1420, 392], [1352, 368]]
// 사가2 — 이름 자리 (Tangled Vales · Guum Wilds · Evolving Wilds 와 사가2 대지 Blighted Woodland 표시의 오른쪽 이름)
const DUST_CLEAR = [HOLE_TV, HOLE_GW_OFF, HOLE_EW_OFF, box(128, 428, 350, 494)]

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
    // 사가3 페이즈1(ZNR) 커먼 대상의 빈터 (그림과 이름 자리)
    { points: [[1034,339], [1084,339], [1084,378], [1155,378], [1155,433], [963,433], [963,378], [1034,378]], phase6: true }, // spare-supplies
    { points: [[848, 380], [1082, 380], [1082, 448], [848, 448]], movedFor: ['spare-supplies'] }, // spare-supplies — 시점별 보기에서 시점 1·2 에만 옮긴 자리 (그림 x 1037–1079 · y 395–421, 왼쪽 이름까지 — BFZ Blisterpod·Culling Drone 과 ZEN Stonework Puma 를 비켜)
    { points: [[415,198], [464,198], [464,269], [548,269], [548,324], [331,324], [331,269], [415,269]], phase6: true }, // joraga-visionary
    { points: [[296, 572], [402, 572], [402, 622], [434, 622], [434, 690], [250, 690], [250, 622], [296, 622]], phase6: true }, // grotag-bug-catcher — 그림 x ≈ 306–382 · y ≈ 584–627, 밑 이름(ko 가 더 넓다) x ≈ 263–425 · y ≈ 640–660, 그 밑 나무 기호 밑동까지
    // 사가3 페이즈1(ZNR) 언커먼 대상의 빈터 (그림과 이름 자리)
    { points: [[985, 504], [1058, 504], [1058, 602], [1142, 602], [1142, 643], [908, 643], [908, 602], [985, 602]], phase6: true }, // springmantle-cleric
    { points: [[675, 742], [724, 742], [724, 818], [817, 818], [817, 859], [583, 859], [583, 818], [675, 818]], phase6: true }, // tangled-florahedron
    { points: [[662, 851], [656, 884], [646, 906], [627, 914], [601, 918], [576, 913], [557, 905], [549, 882], [542, 851], [546, 817], [560, 800], [573, 781], [601, 778], [629, 782], [642, 800], [654, 819]], phase3: true }, // joraga-treespeaker
    { points: [[301, 267], [299, 301], [286, 321], [266, 331], [239, 341], [210, 334], [191, 322], [178, 301], [175, 267], [179, 233], [192, 214], [209, 199], [239, 198], [267, 201], [283, 216], [293, 236]], phase3: true }, // beastbreaker-of-bala-ged
    // 사가1 페이즈2(WWK) Joraga Warcaller — 그림(x 913–978 · y 631–726)에서 좌우 20, 위로 둘째 등성이 밑동의 언덕 기호까지, 밑의 이름 자리(x 862–1026 ·
    // y 726–763)에서 좌우 약 20, 밑으로 셋째 등성이 위 가장자리의 언덕 기호(위로 18)·나무 기호(위로 23)까지 뺀다. 페이즈2 부터 (사가1 페이즈2·3)
    { points: [[893, 620], [998, 620], [998, 705], [1045, 705], [1045, 786], [845, 786], [845, 705], [893, 705]], phase2: true }, // joraga-warcaller
    // 사가2 페이즈1(BFZ) 커먼의 빈터 — 그림과 밑의 이름 자리에서 나무 기호(점에서 좌우 20, 위 23, 아래 17)를 뺀다
    { points: box(872, 433, 988, 531), phase4: true }, // rush-of-ice (그림 x 905–955 · y 450–483, 이름 y ≈ 483–508)
    { points: box(885, 251, 1017, 383), phase4: true }, // culling-drone (그림 x 905–997 · y 268–334, 이름 y ≈ 334–360)
    { points: box(1050, 208, 1182, 348), phase4: true }, // blisterpod (그림 x 1070–1162 · y 225–300, 이름 y ≈ 300–325)
    // 사가1 — 옮겨 그린 Umung 강과 단의 폭포 둘레, 언덕 위의 그림·이름 둘레
    { points: UMUNG_CLEAR, ...SAGA1 },
    { points: STEP1_CLEAR, ...SAGA1 },
    ...HILL_CLEAR.map(([points, card]) => ({ points, ...SAGA1, ...(card && { for: [card] }) })),
    // 사가1 페이즈3 — 등성이 위의 ROE 그림 둘(Beastbreaker 는 첫 등성이, Treespeaker 는 셋째 등성이)과 그 밑 이름 둘레의 언덕 기호
    { points: box(124, 205, 356, 362), phase3: true }, // beastbreaker-of-bala-ged
    { points: box(510, 790, 700, 946), phase3: true }, // joraga-treespeaker
    // 사가2 — 만의 물·절벽 면과 이름 자리
    ...[BAY_CLEAR, ...DUST_CLEAR].map((points) => ({ points, phase4: true })),
    // 시점별 보기만 — 사가1 의 언덕이 있는 시점(T1·T2)에 Evolving Wilds 이름 둘레의 언덕 기호를 늘 뺀다. 위의 Slaughter Cry 빈터(이름 자리까지 든 구멍)는
    // 고블린에 매어 고블린을 그리지 않는 T2 에는 닫히므로 이름 자리만 이것이 맡는다 (사가 보기에는 그리지 않는다 — 사가 보기는 위 빈터 그대로)
    { points: HOLE_EW_NAME, time: { t1: true, t2: true }, timeOnly: true },
    // 시점별 보기만 — Greenweaver Druid 를 사가1 의 자리에 그리는 시점(2009·2010·2020)에 그 그림과 이름 둘레의 기호를 뺀다. 사가 보기는 위 HILL_CLEAR 의
    // 같은 모양(Guum Wilds 이름과 함께, 사가1 문)을 쓰고, 2020년(T5, 바탕 단계 6)에는 그 빈터가 닫혀 숲 기호가 드루이드를 덮으므로 드루이드에 매어 다시 연다
    { points: columns(640, 856, GT, GB), for: ['greenweaver-druid'], timeOnly: true }, // greenweaver-druid
    { points: [[691, 458], [1002, 458], [1002, 571], [691, 571]], movedFor: ['springmantle-cleric'] }, // springmantle-cleric — 시점별 보기에서 시점 1 에만 옮긴 자리 (그림 x 932–993 · y 464–556, 왼쪽 이름까지 — hideous-end 를 비켜)
    { points: [[51, 665], [390, 665], [390, 729], [51, 729]], movedFor: ['grotag-bug-catcher'] }, // grotag-bug-catcher — 시점별 보기에서 시점 1 에만 옮긴 자리 (그림 x 307–382 · y 672–714, 왼쪽 이름까지 — savage-silhouette 를 비켜)
    { points: [[298, 146], [523, 146], [523, 285], [298, 285]], movedFor: ['joraga-visionary'] }, // joraga-visionary — 시점별 보기에서 시점 1·2 에만 옮긴 자리 (그림 x 390–431 · y 152–219, 밑 이름까지 — oracle-of-mul-daya 이름 자리를 비켜)
    { points: [[1186, 83], [1381, 83], [1381, 235], [1186, 235]], movedFor: ['bojuka-brigand'] }, // bojuka-brigand — 시점별 보기에서 시점 5(2020) 에 세계 지도 그림 그대로 이 그림 위로 옮겨 그리는 자리 (그림 x 1257–1310 · y 85–168, 밑 이름까지)
    // 깊은 확대(tier 5–)에서 그림 이름(첫 tier 와 그다음 tier 의 이름 상자 — 쓰는 쪽마다)에 걸리는 이 그림의 지형 기호를 뺀다 — 이름 상자와 그 상자에 획이 닿는 기호의 밑동까지
    { points: [[678.9, 327.5], [687.6, 301.5], [728.6, 297.8], [812.1, 297.8], [854.3, 301.5], [854.3, 345.3], [847.6, 355.2], [784.7, 365.4], [697.8, 366.2], [696.2, 366.2], [678.9, 329.1]], phase: true }, // greenweaver-druid — 깊은 확대 이름 상자: below 이름과 그 상자에 획이 닿는 기호의 밑동
    { points: [[985.8, 606.9], [1014.5, 603.1], [1073.6, 603.1], [1103.6, 606.9], [1103.6, 650.6], [985.8, 650.6]], phase: true }, // hideous-end — 깊은 확대 이름 상자: below 이름과 그 상자에 획이 닿는 기호의 밑동
    { points: [[1040.6, 790], [1067.9, 786.3], [1123.9, 786.3], [1152.4, 790], [1176.8, 800.2], [1176.8, 801.8], [1152.4, 833.8], [1056.4, 840.5], [1054.8, 840.5], [1040.6, 833.8]], phase: true }, // joraga-bard — 깊은 확대 이름 상자: below 이름과 그 상자에 획이 닿는 기호의 밑동
    { points: [[414.1, 707.5], [444.9, 703.9], [508, 703.9], [540.1, 707.5], [540.1, 751.4], [431, 766.1], [429.4, 766.1], [414.1, 751.4]], phase: true }, // nissas-chosen — 깊은 확대 이름 상자: below 이름과 그 상자에 획이 닿는 기호의 밑동
    { points: [[1064.1, 451.4], [1074, 435.3], [1109.5, 431.5], [1215.3, 427.1], [1216.9, 427.1], [1235.3, 486.4], [1235.3, 488], [1222.9, 488.7], [1221.3, 488.7], [1074, 479.1], [1064.1, 453]], phase: true }, // stonework-puma — 깊은 확대 이름 상자: below 이름과 그 상자에 획이 닿는 기호의 밑동
    { points: [[-56.3, 678.9], [-55.2, 670.6], [98.1, 665.6], [99.7, 665.6], [110.8, 670.6], [110.8, 707], [108.6, 720.3], [107, 720.3], [-55.2, 707], [-56.3, 697.2]], phase3: true }, // surrakar-spellblade — 깊은 확대 이름 상자: right 이름과 그 상자에 획이 닿는 기호의 밑동
    { points: [[136.9, 319.9], [187.9, 316.2], [291.1, 316.2], [343.2, 319.9], [352.6, 369], [352.6, 370.6], [295.4, 374.1], [173, 380.8], [171.4, 380.8], [136.9, 363.7]], phase3: true }, // beastbreaker-of-bala-ged — 깊은 확대 이름 상자: below 이름과 그 상자에 획이 닿는 기호의 밑동
    { points: [[521.1, 903.4], [561.1, 899.7], [642.5, 899.7], [683.7, 903.4], [683.7, 947.2], [595.9, 964.8], [594.2, 964.8], [546.1, 964.4], [521.1, 947.2]], phase3: true }, // joraga-treespeaker — 깊은 확대 이름 상자: below 이름과 그 상자에 획이 닿는 기호의 밑동
    { points: [[878, 338.7], [914.7, 336.3], [988.2, 336.3], [1024.9, 338.7], [1024.9, 383.8], [992.2, 398.3], [990.6, 398.3], [878, 383.8]], phase4: true }, // culling-drone — 깊은 확대 이름 상자: below 이름과 그 상자에 획이 닿는 기호의 밑동
    { points: [[1056.7, 304.2], [1086.2, 301.8], [1145.2, 301.8], [1174.6, 304.2], [1174.6, 349.3], [1060.8, 365.2], [1059.2, 365.2], [1056.7, 349.3]], phase4: true }, // blisterpod — 깊은 확대 이름 상자: below 이름과 그 상자에 획이 닿는 기호의 밑동
    { points: [[248.9, 631.3], [296.4, 628.9], [391.6, 628.9], [439.1, 631.3], [450.8, 679.7], [450.8, 681.3], [371.5, 693.8], [369.9, 693.8], [248.9, 676.4]], phase6: true }, // grotag-bug-catcher — 깊은 확대 이름 상자: below 이름과 그 상자에 획이 닿는 기호의 밑동
    { points: [[366.2, 273.5], [402.9, 271.2], [476.4, 271.2], [513.1, 273.5], [513.7, 276.2], [513.7, 320.1], [502.2, 336.8], [500.6, 336.8], [384.1, 332.8], [366.2, 318.6]], phase6: true }, // joraga-visionary — 깊은 확대 이름 상자: below 이름과 그 상자에 획이 닿는 기호의 밑동
    { points: [[927.3, 661.3], [940.5, 609.4], [947.7, 606.7], [984.4, 604.3], [1058, 604.3], [1094.6, 606.7], [1104.3, 609.4], [1104.3, 653.1], [928.9, 662.9], [927.3, 662.9]], phase6: true }, // springmantle-cleric — 깊은 확대 이름 상자: below 이름과 그 상자에 획이 닿는 기호의 밑동
    { points: [[604.2, 822.4], [743.8, 814.8], [745.4, 814.8], [794.4, 822.4], [794.4, 867.6], [766.6, 875.7], [765, 875.7], [612.7, 868.9], [604.2, 867.6]], phase6: true }, // tangled-florahedron — 깊은 확대 이름 상자: below 이름과 그 상자에 획이 닿는 기호의 밑동
    { points: [[1052.8, 547.6], [1053.9, 539.3], [1054.9, 533.9], [1205, 533.9], [1220, 539.3], [1226, 549.9], [1226, 551.5], [1222.9, 589.4], [1148.6, 600], [1147, 600], [1096.5, 591.4], [1053.9, 575.6], [1052.8, 565.9]], for: ['springmantle-cleric'], timeOnly: true }, // springmantle-cleric — 깊은 확대 이름 상자: 시점 2·5 제자리의 right 이름(시점별 보기만)과 그 상자에 획이 닿는 기호의 밑동
    { points: [[719.1, 774.3], [720.3, 765.9], [721.2, 760.5], [788.8, 750.9], [790.4, 750.9], [914.6, 760.5], [914.6, 800.8], [898.1, 802.2], [720.3, 802.2], [719.1, 792.5]], for: ['tangled-florahedron'], timeOnly: true }, // tangled-florahedron — 깊은 확대 이름 상자: 시점 5 제자리의 right 이름(시점별 보기만)과 그 상자에 획이 닿는 기호의 밑동
    { points: [[1081.1, 352], [1082.3, 343.7], [1083.2, 338.4], [1148.3, 335.7], [1149.9, 335.7], [1211.6, 338.4], [1211.6, 378.6], [1208.1, 380.1], [1082.3, 380.1], [1081.1, 370.3]], for: ['spare-supplies'], timeOnly: true }, // spare-supplies — 깊은 확대 이름 상자: 시점 5 제자리의 right 이름(시점별 보기만)과 그 상자에 획이 닿는 기호의 밑동
  ],
  subjects: {
    // 사가3 페이즈1(ZNR) 커먼 — 대상 (자리는 phase6.ts 의 estimate)
    'spare-supplies': { at: [1058.3, 375], size: 41.7, moved: { 1: { at: [1058.3, 420.8], label: 'left' }, 2: { at: [1058.3, 420.8], label: 'left' } } },
    'joraga-visionary': { at: [433.3, 266.7], size: 66.7, moved: { 1: { at: [404.2, 216.7] }, 2: { at: [404.2, 216.7] } } },
    'grotag-bug-catcher': { at: [341.7, 625], size: 75, moved: { 1: { at: [341.7, 712.5], label: 'left' } } },
    // 사가3 페이즈1(ZNR) 언커먼 — 대상 (자리는 phase6.ts 의 estimate)
    'springmantle-cleric': { at: [1025, 600], size: 91.7, moved: { 1: { at: [966.7, 554.2], label: 'left' } } },
    'tangled-florahedron': { at: [700, 816.7], size: 70 },
    // Joraga Treespeaker(ROE) — 숲 빈터 가장자리의 정글 나무 밑동에 손바닥을 대고 귀를 기울이는 조라가 엘프 드루이드, 뿌리에서 줄기로 잎 모양 마나가 감아 오른다 (페이즈3)
    'joraga-treespeaker': { at: [585, 895], size: 95 },
    // Beastbreaker of Bala Ged(ROE) — 빽빽한 밀림 틈에 버티고 서서 끝에 올가미 밧줄이 달린 긴 갈고리 막대를 세워 쥔 발라 게드의 인간 전사. (페이즈3)
    'beastbreaker-of-bala-ged': { at: [240, 310], size: 95 },
    'hideous-end': HIDEOUS,
    'slaughter-cry': CRY,
    'joraga-bard': BARD,
    // Joraga Warcaller(WWK) — 골짜기 숲에서 팔을 들어 씨족을 부르는 조라가 전사, 등에 화살통, 손에 활 (페이즈2)
    'joraga-warcaller': WARCALLER,
    'nissas-chosen': CHOSEN,
    'savage-silhouette': SAVAGE,
    'tanglesap': TANGLESAP,
    'stonework-puma': PUMA,
    'greenweaver-druid': DRUID,
    'bala-ged-thief': THIEF,
    'beastmaster-ascension': PACK,
    'oracle-of-mul-daya': ORACLE,
    'nissa-revane': NISSA,
    ...S2,
  },
  // Evolving Wilds 표시는 왼쪽 아래 단추 자리 곁이라 이름을 지도 안쪽(오른쪽)으로
  markAnchors: { 'card:evolving-wilds': 'right' },
  // 휴대폰 첫 화면 — 가운데 여섯 그림(Nissa's Chosen 까지)과 헤드론 빈터가 함께 들게 (폭 약 460, 머리말 밑부터 아래 끝
  // 단추 위까지). 동·서쪽 가장자리의 커먼 그림들은 옆으로 밀어 본다.
  // 세로는 Guum Wilds 이름이 머리말 밑에 붙지 않게 조금 내린다
  focus: [625, 470],
})
