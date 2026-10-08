// 조프 늪 — 굴 드라즈 북서 해안을 덮은 거대한 맹그로브 늪과 그 한가운데의 Helix of Zof
// (자식 지도, 1200×1000 = 세계 x1255–1465, y845–1020 의 5.714배).
// 시점: Zendikar Rising(2020) 이후. 2020년의 글(ZNR 조프 피늪지)은 늪이 그대로 음울하다는 것밖에 말하지 않아, 생김새는
//       뒤집는 글이 없는 마지막 현재형 서술(The Art of Magic: Zendikar, 2016)을 따른다.
// 공식: 북서 해안을 덮은 거대한 붉은 맹그로브 늪, 뿌리 밑의 실트(AoM). 늪 한가운데 맹그로브 뿌리 밑에 거의 잠긴 정체 모를 구조물,
//       그 위에 떠 있는 덩굴 덮인 거대한 나선 기념물 Helix of Zof — 나무의 잎과 가지 사이에 거의 묻혀 보이지 않고, 타이탄이 풀려난
//       뒤 돌기 시작해 땅과 곁의 나무에서 덩굴을 뜯어냈다(AoM). 그림자들이 출몰한다(AoM, ROE Zof Shade).
// 세계 지도의 풍경(src/data/landscape/guul-draz.ts, 모두 추정)을 이 축척으로 따른다: 조프의 맹그로브(zof-mangroves) 고리 안을
//       맹그로브(세계 지도 기호와 같은 버팀뿌리 나무 — 자식 지도 지형 칸에 맹그로브가 없어 손으로 흩뿌린다)와 늪 풀로 채우고,
//       고리 바깥 동쪽은 펠라카 카르스트(pelakka-karst-west 와 펠라카 지역 — 협곡 기호), 강 머리(nimana-river)는 카르스트 안에서 남쪽으로.
// 해석: 나선의 모양(덩굴 감긴 돌 띠가 세 바퀴 반 감아 오른다)과 크기, 잠긴 구조물을 물에 겨우 드러난 돌덩이들로 그린 것,
//       나선을 둘러싼 큰 맹그로브, 뜯겨 늘어진 덩굴, 서로 이어지지 않은 작은 물웅덩이와 진흙 땅의 자리, 타르 구덩이의 모양,
//       두 그림의 자리. 물길·마을·엘프·짐승·헤드론은 그리지 않는다(자료에 없거나 자리가 없다). 물빛을 붉게 칠하지 않는다.
// 페이즈1 그림: Crypt Ripper(그림자) 는 나선 북동쪽 맹그로브 사이에서 나선 쪽(서쪽)을 본다 — 나선에 그림자들이 출몰한다는
//       공식 서술에 이은 이 지도의 해석. Bog Tatters(망령) 는 나선에서 멀리 떨어진 남서쪽 늪의 물웅덩이 위 — 자리는 이 지도가 골랐다.
// 이름: 'Zof Marsh'(조프 — 조프 피늪지·조프식 소모·조프 그림자의 인쇄 표기), 'Pelakka Karst'(펠라카 — 펠라카 동굴).
//       Helix of Zof 와 Creeping Tar Pit 은 앱의 표시가 이름을 단다.
const K = KIT
const { line, poly, smooth, rng, stack } = K
const P = (cls, d) => ({ cls, d })
const r1 = (v) => Math.round(v * 10) / 10
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`
const circ = (x, y, r) => `M${pt([x - r, y])}A${r1(r)} ${r1(r)} 0 1 0 ${pt([x + r, y])}A${r1(r)} ${r1(r)} 0 1 0 ${pt([x - r, y])}Z`
const ell = (x, y, rx, ry) => `M${pt([x - rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x + rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x - rx, y])}Z`
const inRing = (x, y, ring) => {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
const withHoles = (outer, holes) => [...outer, outer[0], ...holes.flatMap((h) => [...h, h[0], outer[0]])]

// ---------- 세계 지도에서 온 것 (자식 좌표) ----------
// 해안 — 서쪽(바다가 왼쪽), 북쪽(바다가 위)
const COAST_W = [[193, -16], [192, 45], [190, 81], [185, 96], [186, 124], [190, 162], [189, 189], [186, 207], [193, 224], [209, 244], [231, 278], [256, 318], [270, 347], [272, 364], [276, 377], [281, 392], [283, 423], [283, 467], [277, 496], [267, 511], [262, 528], [259, 552], [238, 592], [205, 643], [189, 678], [185, 703], [169, 743], [145, 799], [135, 869], [138, 946], [130, 996], [113, 1021]]
const COAST_N = [[1208, -22], [1213, 27], [1210, 66], [1201, 86], [1186, 101], [1166, 115], [1135, 126], [1092, 132], [1039, 131], [976, 119], [922, 104], [879, 89], [844, 88], [815, 104], [787, 116], [759, 119], [714, 111], [649, 91], [587, 82], [531, 86], [488, 85], [458, 76], [433, 71], [408, 69], [386, 60], [365, 42], [342, 26], [319, 14], [292, -11]]
const interp = (pts, key, v, out) => {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    if ((a[key] - v) * (b[key] - v) <= 0 && a[key] !== b[key]) return a[out] + ((b[out] - a[out]) * (v - a[key])) / (b[key] - a[key])
  }
  return null
}
const coastX = (y) => interp(COAST_W, 1, y, 0) ?? 190
const coastY = (x) => (x < 292 ? -999 : interp(COAST_N, 0, x, 1) ?? -999)
const land = (x, y, m = 0) => x > coastX(y) + m && y > coastY(x) + m
// 조프의 맹그로브 고리 (zof-mangroves), 동쪽 가장자리
const RING_E = [[215, -54], [393, 97], [571, 125], [777, 145], [928, 166], [969, 303], [935, 474], [887, 680], [846, 886], [777, 1064]]
// 늪 칸 — 고리의 북·동 가장자리와 해안 안쪽으로 조금 들인 서쪽 가장자리
const MARSH = [[200, 22], [300, 22], ...RING_E.slice(1, -1), [800, 1040], [120, 1040], ...COAST_W.filter(([, y]) => y > 30).reverse().map(([x, y]) => [x + 16, y])]
const inMarsh = (x, y) => inRing(x, y, MARSH)

// 표시 (앱이 그린다)
const HELIX = [736, 543]
const TARPIT = [777.1, 817.1]

// ---------- 배치 ----------
const LABELS = [
  { text: 'Zof Marsh', textKo: '조프', at: [468, 432], size: 38, kind: 'area' },
  { text: 'Pelakka Karst', textKo: '펠라카', at: [1078, 612], size: 24, kind: 'area' },
]
const SUBJ = {
  'crypt-ripper': { at: [912, 430], size: 88 },
  'bog-tatters': { at: [562, 792], size: 88 },
}

// ---------- 맹그로브 — 세계 지도 mangroveGlyph 의 큰 꼴 (구름 수관, 줄기, 활처럼 뻗은 버팀뿌리, 물결 두 줄) ----------
// s: 세계 기호 1단위가 자식 몇 단위인지. 높이 ≈ 10·s
function mangrove(x, y, s, seed, o = {}) {
  const rand = rng(seed)
  const r = (2.3 + rand() * 1) * s
  const cy = y - 4.2 * s - r * 0.4
  const lobes = [
    [x - r * 0.55, cy + r * 0.15, r * 0.66],
    [x + r * 0.55, cy + r * 0.2, r * 0.62],
    [x, cy - r * 0.45, r * 0.72],
  ]
  const crown = lobes.map(([lx, ly, lr]) => circ(lx, ly, lr)).join('')
  const top = cy + r * 0.7
  const knee = y - 2 * s
  const spread = (o.spread ?? 1) * s
  let roots = line([[x, top], [x, knee]])
  const feet = o.feet ?? [-2.6, -1.3, 1.4, 2.6]
  for (const f of feet) {
    const fx = x + f * spread
    roots += `M${pt([x, knee + (Math.abs(f) < 2 ? 0.5 * s : 0)])}Q${pt([x + f * spread * 0.75, knee - 0.5 * s])} ${pt([fx, y])}`
  }
  roots += line([[x - 0.1 * s, knee], [x - 0.4 * s, y]])
  const w = (3.6 + rand() * 1.2) * s * 0.8
  const water = o.water === false ? '' : `M${pt([x - w, y + 0.3 * s])}l${r1(w * 2)} 0M${pt([x - w * 0.5, y + 1.6 * s])}l${r1(w)} 0`
  // 그늘 쪽(오른쪽 아래) 잎 결 두 줄
  const [fx, fy, fr] = lobes[1]
  const leafHatch = line([[fx + fr * 0.2, fy - fr * 0.1], [fx + fr * 0.05, fy + fr * 0.55]]) + line([[fx + fr * 0.55, fy - fr * 0.15], [fx + fr * 0.4, fy + fr * 0.45]])
  const outline = o.bold ? 'ink' : 'hatch'
  // 잎빛은 덩이 안쪽에만 — 세계 지도 수관처럼 밝은 테두리가 남아 늪 전체가 무겁지 않다
  const green = lobes.map(([lx, ly, lr]) => circ(lx + lr * 0.08, ly + lr * 0.1, lr * 0.74)).join('')
  // 땅 위 나무는 뿌리 둘레를 양피지로 비워, 밑에 깔린 늪 풀 획이 뿌리를 가로지르지 않게 한다 (판화 지도의 기호 둘레 비우기)
  const knock = o.knock ? [P('fill', ell(x, y - 1.7 * s, 3.1 * s, 2.6 * s))] : []
  return [...knock, P('fill', crown), P('forest', green), P('hatch', leafHatch), P(outline, crown), P(outline, roots), ...(water ? [P('sea-ink', water)] : [])]
}

// ---------- Helix of Zof — 덩굴 감긴 돌 띠의 나선, 잠긴 구조물 위에 떠 있다 ----------
const BASE_Y = 536 // 물에 잠긴 구조물의 물선
const HX = HELIX[0]
// 잎 하나 — 끝이 뾰족한 아몬드꼴
const leaf = (x, y, len, ang) => {
  const c = Math.cos(ang)
  const s = Math.sin(ang)
  const w = len * 0.42
  const tip = [x + c * len, y + s * len]
  const m = [x + c * len * 0.5, y + s * len * 0.5]
  return `M${pt([x, y])}Q${pt([m[0] - s * w, m[1] + c * w])} ${pt(tip)}Q${pt([m[0] + s * w, m[1] - c * w])} ${pt([x, y])}Z`
}
function helix() {
  const rand = rng('helix')
  const turns = 3.5
  const H = 132
  const R0 = 37
  const R1 = 25
  const bt = 15
  const k = 0.3
  const lowest = BASE_Y - 33 // 가장 낮은 띠의 밑 — 구조물 윗면 위로 틈
  const yLow = lowest - R0 * k - bt / 2
  const th0 = -Math.PI / 2
  const N = 420
  const S = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const th = th0 + t * turns * Math.PI * 2
    const R = R0 + (R1 - R0) * t
    const x = HX + R * Math.sin(th)
    const yc = yLow - H * t + R * k * Math.cos(th)
    S.push({ t, th, x, yc, front: Math.cos(th) >= 0, sin: Math.sin(th) })
  }
  const runs = []
  let cur = [S[0]]
  for (let i = 1; i < S.length; i++) {
    if (S[i].front !== cur[0].front) {
      cur.push(S[i])
      runs.push(cur)
      cur = [S[i]]
    } else cur.push(S[i])
  }
  runs.push(cur)
  const band = (run) => poly([...run.map((s) => [s.x, s.yc - bt / 2]), ...[...run].reverse().map((s) => [s.x, s.yc + bt / 2])])
  const back = []
  const front = []
  let leaves = ''
  let vines = ''
  for (const run of runs) {
    const d = band(run)
    let hatch = ''
    const isFront = run[0].front
    if (isFront) {
      for (let i = 0; i < run.length; i += 3) {
        const s = run[i]
        if (s.sin > 0.3) hatch += line([[s.x, s.yc - bt / 2 + 1.5], [s.x, s.yc + bt / 2 - 1.5]])
      }
      for (let i = 12; i < run.length - 8; i += 22) {
        const s = run[i]
        hatch += line([[s.x, s.yc - bt / 2], [s.x + 0.8, s.yc + bt / 2]])
      }
    } else {
      for (let i = 0; i < run.length; i += 4) {
        const s = run[i]
        hatch += line([[s.x, s.yc - bt / 2 + 2], [s.x, s.yc + bt / 2 - 2]])
      }
    }
    // 띠를 휘감는 덩굴 줄기 — 띠 위를 오르내리며 따라간다
    if (run.length > 6) {
      const ph = rand() * 6
      const vp = run.filter((_, i) => i % 3 === 0).map((s, i) => [s.x, s.yc + Math.sin(i * 0.9 + ph) * bt * 0.32])
      vines += smooth(vp)
      for (let i = 2; i < vp.length - 1; i += isFront ? 3 : 5) {
        const [vx, vy] = vp[i]
        leaves += leaf(vx, vy, 6 + rand() * 2.4, -Math.PI / 2 + (rand() - 0.5) * 2.2)
        if (isFront && rand() < 0.55) leaves += leaf(vx, vy, 5.4 + rand() * 2, Math.PI / 2 + (rand() - 0.5) * 1.6)
      }
    }
    // 앞쪽 띠 밑으로 늘어진 짧은 덩굴
    if (isFront) {
      for (let i = 9; i < run.length - 3; i += 19) {
        if (rand() < 0.5) continue
        const s = run[i]
        const len = 8 + rand() * 14
        const x0 = s.x
        const y0 = s.yc + bt / 2
        vines += `M${pt([x0, y0])}Q${pt([x0 + 2.5, y0 + len * 0.5])} ${pt([x0 - 0.5, y0 + len])}`
        leaves += leaf(x0 - 0.5, y0 + len, 4, Math.PI / 2 + 0.4) + leaf(x0 + 1.2, y0 + len * 0.5, 3.6, 0.3)
      }
    }
    ;(isFront ? front : back).push(P(isFront ? 'stone' : 'shade', d), P('hatch', hatch), P(isFront ? 'ink-bold' : 'ink', d))
  }
  const vine = [P('forest', leaves), P('hatch', vines + leaves)]
  return { back, front, vine, lowest }
}
const HEL = helix()

// 뜯겨 늘어진 덩굴 — 꼬인 두 가닥, 몇 줄은 끊겨 매달렸다
function slack(a, b, sag, seed, o = {}) {
  const rand = rng(seed)
  const mx = (a[0] + b[0]) / 2
  const my = Math.max(a[1], b[1]) + sag
  const at = (t) => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * mx + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * my + t * t * b[1]]
  const n = 14
  const s1 = []
  const s2 = []
  for (let i = 0; i <= n; i++) {
    const [x, y] = at(i / n)
    s1.push([x, y + Math.sin(i * 1.3) * 1.1])
    s2.push([x, y - Math.sin(i * 1.3) * 1.1 + 0.6])
  }
  let d = smooth(s1) + smooth(s2)
  let leaves = ''
  for (let i = 2; i < n; i += 3) {
    const [x, y] = at(i / n)
    if (rand() < 0.75) leaves += leaf(x, y + 1, 3.6 + rand() * 1.6, Math.PI / 2 + (rand() - 0.5) * 1.8)
  }
  if (o.frayed) {
    const [x, y] = b
    d += `M${pt([x, y])}l-2.4 5.5M${pt([x, y])}l0.4 6.5M${pt([x, y])}l2.8 4.6`
  }
  return [P('forest', leaves), P('hatch', d + leaves)]
}

// 잠긴 구조물 — 물에 겨우 드러난 낮고 넓은 돌의 윗면(이음매가 드러난 깨진 테두리)과 흩어진 돌덩이, 사이사이 물
function sunkenBase() {
  const rand = rng('base')
  const water = smooth([[HX - 108, BASE_Y + 4], [HX - 90, BASE_Y - 10], [HX - 60, BASE_Y - 16], [HX - 30, BASE_Y - 21], [HX + 34, BASE_Y - 20], [HX + 70, BASE_Y - 13], [HX + 102, BASE_Y - 4], [HX + 110, BASE_Y + 8], [HX + 84, BASE_Y + 15], [HX + 46, BASE_Y + 12], [HX + 10, BASE_Y + 16], [HX - 34, BASE_Y + 13], [HX - 70, BASE_Y + 16], [HX - 98, BASE_Y + 13]], true)
  // 윗면 — 납작한 타원을 깨진 들쭉날쭉 테두리로
  // 모서리가 깨진 각진 테두리 — 매끈한 원반이 아니라 무너진 돌의 윗면
  const top = []
  const M = 15
  for (let i = 0; i < M; i++) {
    const a = ((i + rand() * 0.4) / M) * Math.PI * 2
    const bite = rand() < 0.35 ? 0.8 : 1
    top.push([HX + Math.cos(a) * 80 * bite * (0.92 + rand() * 0.1), BASE_Y - 6 + Math.sin(a) * 15 * bite * (0.9 + rand() * 0.14)])
  }
  const topD = poly(top)
  // 물에 잠긴 앞쪽 면 (얕은 띠)
  const frontEdge = top.filter(([, y]) => y >= BASE_Y - 7).sort((p, q) => p[0] - q[0])
  const faceD = poly([...frontEdge, ...[...frontEdge].reverse().map(([x, y]) => [x, y + 4.5])])
  // 돌 이음매 — 나란한 줄 몇 개와 끊긴 세로 줄
  let joints = ''
  for (const dy of [-12, -6, 0]) {
    const half = 80 * Math.sqrt(Math.max(0, 1 - ((dy + 0) / 15) ** 2)) * 0.8
    joints += line([[HX - half, BASE_Y - 6 + dy], [HX - half * 0.35, BASE_Y - 6 + dy]]) + line([[HX + half * 0.1, BASE_Y - 6 + dy], [HX + half, BASE_Y - 6 + dy]])
  }
  for (let i = -3; i <= 3; i++) if (i !== -2 && i !== 2) joints += line([[HX + i * 19 + 4, BASE_Y - 15], [HX + i * 19, BASE_Y - 9]]) + line([[HX + i * 19 - 6, BASE_Y - 3], [HX + i * 19 - 9, BASE_Y + 3]])
  // 윗면을 가르는 물 고인 틈 둘과 고인 물 몇 군데 — 한 덩이가 아니라 깨져 가라앉는 돌
  const crack = (x0, x1, wob) => smooth([[x0, BASE_Y - 22], [x0 + wob, BASE_Y - 12], [x1 - wob, BASE_Y - 2], [x1, BASE_Y + 9], [x1 + 7, BASE_Y + 9], [x1 + 4 - wob, BASE_Y - 2], [x0 + 9 + wob, BASE_Y - 12], [x0 + 7, BASE_Y - 22]], true)
  const wet = [crack(HX - 34, HX - 46, 3), crack(HX + 30, HX + 40, -2), ell(HX - 62, BASE_Y - 4, 9, 2.6), ell(HX + 58, BASE_Y - 10, 8, 2.2)].join('')
  // 흩어진 돌덩이 — 기울어 반쯤 잠겼다
  const items = []
  for (const [dx, dy, w, h, tilt] of [[-92, 7, 20, 6, -0.18], [90, 6, 18, 5, 0.2], [-62, 12, 14, 4, 0.12], [64, 10, 14, 4, -0.1]]) {
    const x = HX + dx
    const y = BASE_Y + dy
    const tl = [x - w / 2, y - h - tilt * w * 0.5]
    const tr = [x + w / 2, y - h + tilt * w * 0.5]
    const face = poly([[x - w / 2, y], tl, tr, [x + w / 2, y]])
    const topF = poly([tl, tr, [tr[0] - 2.5, tr[1] - 3], [tl[0] + 2.5, tl[1] - 3]])
    const hatch = line([[x + w * 0.3, y - 1], [x + w * 0.3, y - h + 1.5]])
    items.push({ y, parts: [P('fill', topF), P('stone', face), P('hatch', hatch), P('ink', face + topF), P('sea-ink', `M${pt([x - w / 2 - 3, y + 1.5])}l${r1(w + 6)} 0`)] })
  }
  return [
    P('sea', water), P('sea-ink', water),
    P('shade', faceD), P('stone', topD), P('hatch', joints), P('ink', topD + faceD), P('sea', wet), P('sea-ink', wet),
    P('sea-ink', `M${pt([HX - 86, BASE_Y + 13])}l22 0M${pt([HX + 72, BASE_Y + 12])}l20 0`),
    ...stack(items),
  ]
}
// 구조물에 걸친 버팀뿌리 — 곁의 큰 맹그로브에서 돌 위로
function rootsOver(x, y, toXs, h, seed) {
  const rand = rng(seed)
  let d = ''
  for (const tx of toXs) {
    const ty = BASE_Y - 8 + rand() * 12
    d += `M${pt([x, y - h])}C${pt([x + (tx - x) * 0.2, y - h - 10])} ${pt([x + (tx - x) * 0.75, ty - 22])} ${pt([tx, ty])}`
  }
  return [P('ink', d)]
}

// ---------- 타르 구덩이 — 표시 자리의 작은 검은 웅덩이 (생물·얼굴 없이) ----------
function tarPit([x, y]) {
  const rand = rng('tar')
  const lump = (cx, cy, rx, ry, n, j) => {
    const pts = []
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const f = 1 - j / 2 + rand() * j
      pts.push([cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f])
    }
    return smooth(pts, true)
  }
  // 질척한 가장자리(그늘)와 그 안의 검은 타르 — 고르지 않은 테두리, 둘·셋으로 갈라진 덩이, 짧은 가로 결
  const rim = lump(x + 2, y + 1, 36, 15, 17, 0.42)
  const tar = lump(x - 9, y + 1, 15, 7, 10, 0.45) + lump(x + 12, y + 3, 13, 6, 10, 0.5) + lump(x + 25, y - 4, 5, 3, 7, 0.4)
  let hatch = ''
  for (const [dx, dy, w] of [[-22, -7, 9], [6, -8, 12], [-26, 7, 7], [20, 9, 10], [-2, 10, 6]]) hatch += line([[x + dx - w / 2, y + dy], [x + dx + w / 2, y + dy]])
  // 가장자리 진흙 위의 늪 풀 두 포기 (잎 결만)
  const tuft = (tx, ty) => line([[tx - 4, ty - 7], [tx, ty]]) + line([[tx, ty - 9], [tx, ty]]) + line([[tx + 4, ty - 7], [tx, ty]])
  hatch += tuft(x - 36, y - 6) + tuft(x + 38, y + 4)
  return [P('shade', rim), P('hatch', hatch), P('dark', tar), P('ink', rim)]
}

// ---------- 물웅덩이 — 뿌리 사이의 작고 서로 이어지지 않은 고인 물 ----------
const blob = (cx, cy, rx, ry, seed) => {
  const rand = rng(seed)
  const pts = []
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2
    const f = 0.8 + rand() * 0.35
    pts.push([cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f])
  }
  return pts
}
const POOLS = [
  [SUBJ['bog-tatters'].at[0] + 2, SUBJ['bog-tatters'].at[1] + 4, 74, 18, 'p-bog'],
  [372, 292, 40, 12, 'p1'],
  [588, 640, 36, 11, 'p2'],
  [330, 616, 30, 9, 'p3'],
  [662, 262, 32, 10, 'p4'],
  [690, 920, 38, 11, 'p5'],
  [282, 900, 28, 9, 'p6'],
  [470, 196, 26, 8, 'p7'],
  [880, 640, 28, 8, 'p8'],
  [790, 236, 24, 8, 'p9'],
]
const pools = POOLS.flatMap(([x, y, rx, ry, s]) => K.pool(blob(x, y, rx, ry, s), { ripples: rx > 30 }))

// ---------- 니마나 곁의 강 머리 (세계 지도 추정 물길, 카르스트 안) ----------
const RIVER = [[969, 803], [986, 846], [1004, 890], [1008, 925], [998, 965], [988, 1012]]
const river = K.river(RIVER, 2.5, 9)

// ---------- 맹그로브 흩뿌리기 ----------
// 나무를 두지 않는 자리: 이름, 그림(과 그 이름), 나선과 구조물, 타르 구덩이와 그 이름, 웅덩이, 진흙 땅
const labelBox = (l, pad = 14) => {
  const w = l.size * l.text.length * 0.66
  return rect(l.at[0] - w / 2 - pad, l.at[1] - l.size * 0.95 - pad, l.at[0] + w / 2 + pad, l.at[1] + l.size * 0.35 + pad)
}
// 그림과 그 밑의 이름(가운데 정렬, 13px ≈ 자식 16 단위)
const subjBox = ({ at: [x, y], size }) => [[x - size * 0.58, y - size * 1.04], [x + size * 0.58, y - size * 1.04], [x + size * 0.58, y + 2], [x + 66, y + 4], [x + 66, y + 40], [x - 66, y + 40], [x - 66, y + 4], [x - size * 0.58, y + 2]]
const KEEP_OUT = [
  labelBox(LABELS[0]),
  subjBox(SUBJ['crypt-ripper']),
  subjBox(SUBJ['bog-tatters']),
  rect(HX - 122, BASE_Y - 178, HX + 122, BASE_Y + 52), // 나선·구조물·표시 이름 — 큰 나무는 손으로 둔다
  rect(TARPIT[0] - 92, TARPIT[1] - 30, TARPIT[0] + 92, TARPIT[1] + 50),
  ...POOLS.map(([x, y, rx, ry]) => rect(x - rx - 16, y - ry - 8, x + rx + 16, y + ry + 34)),
]
// 진흙 땅 — 나무가 성긴 트인 자리 (늪 풀만)
const FLATS = [[420, 566, 92, 52], [612, 352, 74, 46], [352, 742, 64, 44], [660, 744, 56, 40], [300, 190, 50, 40], [840, 270, 54, 40], [560, 960, 70, 40]]
const hit = (x, y) => KEEP_OUT.some((r) => inRing(x, y, r))
const blocked = (x, y) => hit(x, y) || hit(x - 16, y - 36) || hit(x + 16, y - 36) || hit(x, y - 44) || FLATS.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1)
// 나무 사이 간격이 자리마다 달라 덤불과 성긴 자리가 번갈아 난다 (부드러운 사인 잡음)
const noise = (x, y) => 0.5 + 0.25 * Math.sin(x * 0.011 + 1.3) * Math.cos(y * 0.009 - 0.4) + 0.25 * Math.sin((x + y) * 0.006 + 2.1)
function scatter(seed) {
  const rand = rng(seed)
  const out = []
  for (let gy = 40; gy < 1040; gy += 22) {
    for (let gx = 160; gx < 1000; gx += 22) {
      const x = gx + (rand() - 0.5) * 22
      const y = gy + (rand() - 0.5) * 22
      if (!inMarsh(x, y) || !land(x, y, 10) || blocked(x, y)) continue
      const sp = 46 + 68 * noise(x, y)
      if (out.some(([ox, oy, os]) => (ox - x) ** 2 + ((oy - y) * 1.3) ** 2 < ((sp + os) / 2) ** 2)) continue
      out.push([x, y, sp])
    }
  }
  return out
}
const TREE_PTS = scatter('zof-trees')
// 해안 얕은 물에 선 몇 그루 (세계 지도도 고리 안 물 위에 심는다)
const SHALLOWS = [[176, 150], [214, 300], [262, 470], [196, 640], [150, 770], [410, 58], [560, 70], [700, 96], [905, 92]]
const trees = []
TREE_PTS.forEach(([x, y], i) => {
  const s = 3.5 + rng(`s${i}`)() * 1.5
  trees.push({ y, parts: mangrove(x, y, s, `m${i}`, { knock: true }) })
})
SHALLOWS.forEach(([x, y], i) => trees.push({ y, parts: mangrove(x, y, 3.6, `sh${i}`) }))
// 나선을 둘러싼 큰 맹그로브 — 수관이 나선과 같은 높이로 모여 나선을 거의 감춘다 (빈터 없이)
const BIG = [
  { at: [HX - 92, BASE_Y - 78], s: 11.6, seed: 'b1' },
  { at: [HX + 86, BASE_Y - 80], s: 11.0, seed: 'b2' },
  { at: [HX + 34, BASE_Y - 122], s: 6.6, seed: 'b9' },
  { at: [HX - 108, BASE_Y + 10], s: 7.6, seed: 'b3', roots: [HX - 74, HX - 56, HX - 40] },
  { at: [HX + 106, BASE_Y + 12], s: 7.2, seed: 'b4', roots: [HX + 44, HX + 60, HX + 78] },
  { at: [HX - 150, BASE_Y - 24], s: 6.0, seed: 'b5' },
  { at: [HX + 148, BASE_Y - 36], s: 5.6, seed: 'b6' },
  { at: [HX - 88, BASE_Y + 62], s: 5.4, seed: 'b7' },
  { at: [HX + 92, BASE_Y + 64], s: 5.2, seed: 'b8' },
]
for (const b of BIG) {
  const [x, y] = b.at
  const parts = mangrove(x, y, b.s, b.seed, { bold: b.s > 7 })
  if (b.roots) parts.push(...rootsOver(x, y, b.roots, b.s * 2, `${b.seed}r`))
  trees.push({ y, parts })
}
// 나선 묶음 — 구조물 물선 높이에 끼워 넣어, 앞의 나무가 그 위에 온다
const tornVines = [
  ...slack([HX - 24, HEL.lowest - 6], [HX - 62, BASE_Y - 10], 6, 't1'),
  ...slack([HX + 22, HEL.lowest - 12], [HX + 60, BASE_Y - 8], 5, 't2'),
  ...slack([HX - 30, HEL.lowest - 54], [HX - 66, HEL.lowest - 40], 10, 't3', { frayed: true }),
  ...slack([HX + 24, HEL.lowest - 70], [HX + 58, HEL.lowest - 58], 8, 't4', { frayed: true }),
  ...slack([HX + 20, HEL.lowest - 98], [HX + 34, HEL.lowest - 76], 4, 't5', { frayed: true }),
]
const shadowUnder = [P('shade', ell(HX + 3, BASE_Y - 8, 30, 4.5))]
const helixGroup = [...sunkenBase(), ...shadowUnder, ...HEL.back, ...HEL.front, ...HEL.vine, ...tornVines]
trees.push({ y: BASE_Y - 1, parts: helixGroup })

// 늪 풀 칸 (앱이 세계 지도의 늪 기호로 흩뿌린다) — 이름·그림·나선·웅덩이 자리는 비운다
const SWAMP_HOLES = [
  labelBox(LABELS[0], 4),
  rect(SUBJ['crypt-ripper'].at[0] - 92, SUBJ['crypt-ripper'].at[1] - 100, SUBJ['crypt-ripper'].at[0] + 96, SUBJ['crypt-ripper'].at[1] + 58),
  rect(SUBJ['bog-tatters'].at[0] - 92, SUBJ['bog-tatters'].at[1] - 96, SUBJ['bog-tatters'].at[0] + 92, SUBJ['bog-tatters'].at[1] + 58),
  rect(HX - 104, BASE_Y - 200, HX + 104, BASE_Y + 50),
  rect(TARPIT[0] - 96, TARPIT[1] - 26, TARPIT[0] + 96, TARPIT[1] + 60),
  // 웅덩이 — 물빛이 비쳐 밑의 풀이 보이지 않게 (Bog Tatters 의 웅덩이는 그 그림 자리가 비운다)
  ...POOLS.slice(1).map(([x, y, rx, ry]) => rect(x - rx - 6, y - ry - 6, x + rx + 6, y + ry + 16)),
]
const SWAMP = withHoles(MARSH, SWAMP_HOLES)

// 펠라카 카르스트 — 맹그로브 고리 동쪽, 가장자리에 트인 땅을 조금 두고 (경계는 벼랑이 아니다)
const KARST_OUT = [[1000, 150], [1060, 136], [1140, 124], [1190, 96], [1250, 60], [1250, 1060], [870, 1060], [895, 900], [938, 690], [988, 476], [1022, 300]]
const riverHole = [[952, 780], [990, 780], [1030, 880], [1034, 930], [1018, 1060], [962, 1060], [972, 930], [968, 880]]
const karstLabelHole = labelBox(LABELS[1], 6)
const KARST = withHoles(KARST_OUT, [riverHole, karstLabelHole])

const parts = [...pools, ...river, ...tarPit(TARPIT), ...stack(trees)]

CHILDMAPS.push({
  id: 'zof-marsh',
  size: [1200, 1000],
  glyphScale: 4,
  terrain: [
    { kind: 'canyon', points: KARST, density: 0.9 },
    { kind: 'swamp', points: SWAMP, density: 0.55 },
  ],
  parts,
  labels: LABELS,
  subjects: {
    'bog-tatters': SUBJ['bog-tatters'],
    'crypt-ripper': SUBJ['crypt-ripper'],
  },
  markAnchors: { 'helix-of-zof': 'below', 'card:creeping-tar-pit': 'below' },
  focus: [742, 590],
})
