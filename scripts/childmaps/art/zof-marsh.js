// 조프 늪 — 굴 드라즈 북서 해안을 덮은 거대한 맹그로브 늪과 그 한가운데의 Helix of Zof
// (자식 지도, 1200×1000 = 세계 x1255–1465, y845–1020 의 5.714배).
// 시점: Zendikar Rising(2020) 이후. 2020년의 글(ZNR 조프 피늪지)은 늪이 그대로 음울하다는 것밖에 말하지 않아, 생김새는
//       뒤집는 글이 없는 마지막 현재형 서술(The Art of Magic: Zendikar, 2016)을 따른다.
// 공식: 북서 해안을 덮은 거대한 붉은 맹그로브 늪, 뿌리 밑의 실트(AoM). 늪 한가운데 맹그로브 뿌리 밑에 거의 잠긴 정체 모를 구조물,
//       그 위에 떠 있는 덩굴 덮인 거대한 나선 기념물 Helix of Zof — 나무의 잎과 가지 사이에 거의 묻혀 보이지 않고, 타이탄이 풀려난
//       뒤 돌기 시작해 땅과 곁의 나무에서 덩굴을 뜯어냈다(AoM). 그림자들이 출몰한다(AoM, ROE Zof Shade).
// 세계 지도의 풍경(src/data/landscape/guul-draz.ts, 모두 추정)을 이 축척으로 따른다: 조프의 맹그로브(zof-mangroves) 고리 안을
//       세계 지도와 같은 맹그로브 칸(버팀뿌리 나무와 늪 풀포기)으로 채우고, 트인 진흙 땅 몇 곳은 늪 풀만 두며,
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
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
const withHoles = (outer, holes) => [...outer, outer[0], ...holes.flatMap((h) => [...h, h[0], outer[0]])]

// ---------- 세계 지도에서 온 것 (자식 좌표) ----------
// 해안 — 서쪽(바다가 왼쪽)
const COAST_W = [[193, -16], [192, 45], [190, 81], [185, 96], [186, 124], [190, 162], [189, 189], [186, 207], [193, 224], [209, 244], [231, 278], [256, 318], [270, 347], [272, 364], [276, 377], [281, 392], [283, 423], [283, 467], [277, 496], [267, 511], [262, 528], [259, 552], [238, 592], [205, 643], [189, 678], [185, 703], [169, 743], [145, 799], [135, 869], [138, 946], [130, 996], [113, 1021]]
// 조프의 맹그로브 고리 (zof-mangroves), 동쪽 가장자리
const RING_E = [[215, -54], [393, 97], [571, 125], [777, 145], [928, 166], [969, 303], [935, 474], [887, 680], [846, 886], [777, 1064]]
// 늪 칸 — 고리의 북·동 가장자리와 해안 안쪽으로 들인 서쪽 가장자리 (기호의 수관·물결이 해안선을 넘지 않을 만큼)
const MARSH = [[205, -20], [255, -20], ...RING_E.slice(1, -1), [800, 1040], [120, 1040], ...COAST_W.filter(([, y]) => y > -10).reverse().map(([x, y]) => [x + 16, y])]

// 표시 (앱이 그린다)
const HELIX = [736, 543]
const TARPIT = [777.1, 817.1]

// ---------- 배치 ----------
const LABELS = [
  { text: 'Zof Marsh', textKo: '조프', at: [468, 432], size: 38, kind: 'area' },
  { text: 'Pelakka Karst', textKo: '펠라카', at: [1000, 652], size: 24, kind: 'area' }, // 동쪽 가장자리 띠(x ≥ 1080) 밖에 — 띠에서는 그림이 옅어진다
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
  [838, 712, 28, 8, 'p8'], // Pelakka Karst 이름 앞을 비운다 (구멍이 고리 안에 들게)
  [790, 236, 24, 8, 'p9'],
]
const pools = POOLS.flatMap(([x, y, rx, ry, s]) => K.pool(blob(x, y, rx, ry, s), { ripples: rx > 30 }))

// ---------- 니마나 곁의 강 머리 (세계 지도 추정 물길, 카르스트 안) ----------
// 세계 지도가 다듬은 물길 그대로(landscape.ts shapeRivers 의 점과 강폭을 자식 좌표로) — 범위 가장자리 띠에서 세계 지도의 강과 겹쳐
// 바뀌므로 자리·폭이 같아야 이음매가 보이지 않는다. [x, y, 폭]
const RIVER_W = [[969.1, 803.4, 1.6], [972, 811.5, 1.71], [974.9, 819.6, 1.8], [977.8, 827.7, 1.88], [980.7, 835.7, 1.95], [983.6, 843.8, 2.01], [986.5, 851.8, 2.08], [989.5, 859.9, 2.14], [992.2, 868, 2.2], [994.6, 876.2, 2.26], [996.5, 884.5, 2.32], [998.3, 892.8, 2.38], [999.4, 901.2, 2.44], [1000.5, 909.7, 2.49], [1001.6, 918.2, 2.54], [1002.5, 926.7, 2.6], [1003.2, 935.4, 2.65], [1003.3, 944.1, 2.7], [1002.6, 952.7, 2.76], [1000.9, 961.3, 2.81], [998.2, 969.5, 2.86], [995.4, 977.6, 2.91], [993, 985.9, 2.96], [991.3, 994.4, 3.01], [990.4, 1003, 3.05], [990.7, 1011.6, 3.1], [991.4, 1020.2, 3.15], [992.6, 1028.8, 3.2], [994.5, 1037.2, 3.24]]
const river = (() => {
  const pts = RIVER_W.map(([x, y]) => [x, y])
  const wAt = (t) => RIVER_W[Math.round(t * (RIVER_W.length - 1))][2]
  const left = K.offset(pts, (t) => wAt(t) / 2)
  const right = K.offset(pts, (t) => -wAt(t) / 2)
  // 세계 지도의 강처럼 옅은 물빛 채움과 짙은 기슭 선
  return [P('sea', line(left) + 'L' + line([...right].reverse()).slice(1) + 'Z'), P('hatch', line(left) + line(right))]
})()

// ---------- 맹그로브 칸 (앱이 세계 지도의 맹그로브 기호로 흩뿌린다) ----------
// 세계 지도 zof-mangroves 와 같은 'mangrove' 칸 — 버팀뿌리 나무가 열에 여섯, 나머지는 늪 풀포기, 같은 크기·간격·잎빛이라
// 범위 가장자리 띠에서 세계 지도의 나무와 섞여도 선이 드러나지 않고, 어느 확대 단계에서도 크기가 같다.
const labelBox = (l, pad = 14) => {
  const w = l.size * l.text.length * 0.66
  return rect(l.at[0] - w / 2 - pad, l.at[1] - l.size * 0.95 - pad, l.at[0] + w / 2 + pad, l.at[1] + l.size * 0.35 + pad)
}
const trees = []
// 나선을 둘러싼 큰 맹그로브 — 수관이 나선과 같은 높이로 모여 나선을 거의 감춘다 (빈터 없이).
// 모두 나선 자리 구멍 안에 둔다 — 구멍 밖의 큰 나무는 칸의 작은 나무와 겹치고 Crypt Ripper 이름에 걸린다
const BIG = [
  { at: [HX - 92, BASE_Y - 78], s: 11.6, seed: 'b1' },
  { at: [HX + 86, BASE_Y - 80], s: 11.0, seed: 'b2' },
  { at: [HX + 34, BASE_Y - 122], s: 6.6, seed: 'b9' },
  { at: [HX - 108, BASE_Y + 10], s: 7.6, seed: 'b3', roots: [HX - 74, HX - 56, HX - 40] },
  { at: [HX + 106, BASE_Y + 12], s: 7.2, seed: 'b4', roots: [HX + 44, HX + 60, HX + 78] },
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

// 칸에서 비우는 자리 — 이름, 그림과 그 이름, 나선·구조물·큰 나무, 타르 구덩이와 그 이름, 웅덩이.
// 나무는 뿌리(점) 위로 수관이 서므로 각 자리의 밑을 수관 높이(≈24)만큼 더 비운다. 구멍끼리는 겹치지 않는다.
// 진흙 땅(FLATS) — 나무가 성긴 트인 자리: 맹그로브 칸에서 비우고 늪 풀 칸만 둔다 (다른 구멍과 겹치는 것은 뺀다)
// 모서리를 깎은 팔각형 — 깊은 확대에서 네모난 빈터의 곧은 모서리가 틀처럼 보이지 않게
const oct = (x0, y0, x1, y1) => {
  const c = 0.3 * Math.min(x1 - x0, y1 - y0) / 2
  return [[x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c], [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c]]
}
const R = (cx0, cy0, cx1, cy1) => oct(cx0, cy0, cx1, cy1 + 24)
const BT = SUBJ['bog-tatters'].at
// 그림 둘의 자리는 페이즈1 에서만 비운다 — 페이즈를 끄면 맹그로브가 채운다 (Bog Tatters 의 웅덩이는 늘 비운다)
const SUBJ_HOLES = [
  // 서쪽 변은 나선 자리(x ≤ 858)와 겹치지 않게, 동쪽 변은 고리(RING_E)를 1.5 안쪽에서 그대로 따라 — 고리와 구멍 사이에 기호 띠가 남지 않고
  // 칸 밖으로 나가지도 않게(나간 구멍은 도리어 칠해진다). 밑은 이름 밑의 수관까지
  [[878, 334], [961, 334], [933.5, 474], [924.5, 512], [872, 512], [860, 500], [860, 352]],
  R(BT[0] - 92, BT[1] - 96, BT[0] + 92, BT[1] + 42),
]
const BT_POOL_HOLE = (() => { const [x, y, rx, ry] = POOLS[0]; return R(x - rx - 8, y - ry - 6, x + rx + 8, y + ry + 4) })()
const HOLES = [
  (() => { const [[x0, y0], , [x1, y1]] = labelBox(LABELS[0], 8); return R(x0, y0, x1, y1) })(),
  // 나선·구조물·큰 나무 자리 — 큰 나무들의 수관·뿌리·물결을 모두 담는 둥근 꼴. 북동쪽은 Crypt Ripper 자리(x ≥ 860, y ≤ 510)를 비켜 간다
  [[660, 336], [812, 336], [846, 368], [858, 420], [858, 510], [880, 524], [884, 566], [870, 606], [820, 618], [680, 618], [612, 606], [590, 566], [592, 500], [608, 420], [622, 370]],
  R(TARPIT[0] - 74, TARPIT[1] - 40, TARPIT[0] + 68, TARPIT[1] + 34),
  // 웅덩이 — Bog Tatters 의 웅덩이는 그 그림 자리가 비운다
  ...POOLS.slice(1).map(([x, y, rx, ry]) => R(x - rx - 8, y - ry - 6, x + rx + 8, y + ry + 4)),
]
const bbox = (ring) => ring.reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [Infinity, Infinity, -Infinity, -Infinity])
const overlaps = (p, q) => {
  const [a0, b0, a1, b1] = bbox(p)
  const [c0, d0, c1, d1] = bbox(q)
  return a0 < c1 && c0 < a1 && b0 < d1 && d0 < b1
}
const FLATS = [[420, 566, 92, 52], [612, 352, 74, 46], [352, 742, 64, 44], [660, 744, 56, 40], [300, 190, 50, 40], [840, 270, 54, 40]]
  .map(([cx, cy, rx, ry]) => Array.from({ length: 16 }, (_, i) => [cx + Math.cos((i / 16) * Math.PI * 2) * rx, cy + Math.sin((i / 16) * Math.PI * 2) * ry]))
  .filter((f) => ![...HOLES, ...SUBJ_HOLES].some((h) => overlaps(f, h)))
const MANGROVE = withHoles(MARSH, [...HOLES, ...SUBJ_HOLES, ...FLATS])
const MANGROVE_NOPHASE = withHoles(MARSH, [...HOLES, BT_POOL_HOLE, ...FLATS])

// 펠라카 카르스트 — 맹그로브 고리 동쪽, 가장자리에 트인 땅을 조금 두고 (경계는 벼랑이 아니다)
const KARST_OUT = [[1000, 150], [1060, 136], [1140, 124], [1190, 96], [1250, 60], [1250, 1060], [870, 1060], [895, 900], [938, 690], [988, 476], [1022, 300]]
const riverHole = [[952, 780], [990, 780], [1030, 880], [1034, 930], [1018, 1060], [962, 1060], [972, 930], [968, 880]]
// 이름 자리 — 카르스트 칸의 서쪽 가장자리(이 높이에서 x ≈ 945) 안쪽으로 잘라 둔다 (칸 밖으로 나간 구멍은 도리어 칠해진다)
// 서쪽 변은 칸의 서쪽 가장자리를 그대로 따른다(1.5 안쪽) — 가장자리와 구멍 사이에 기호 띠가 남아 'P' 에 닿지 않게. 협곡 기호는 길어 위·아래·동쪽은 넉넉히
const karstWestX = (y) => {
  const W = [[870, 1060], [895, 900], [938, 690], [988, 476], [1022, 300]]
  for (let i = 0; i < W.length - 1; i++) {
    const [[xa, ya], [xb, yb]] = [W[i], W[i + 1]]
    if (y <= ya && y >= yb) return xa + ((xb - xa) * (y - ya)) / (yb - ya)
  }
  return W[W.length - 1][0]
}
const karstLabelHole = (() => {
  const [[x0, y0], , [x1, y1]] = labelBox(LABELS[1], 6)
  const t = y0 - 8
  const b = y1 + 16
  return [[Math.max(x0, karstWestX(t) + 1.5), t], [x1 + 10, t], [x1 + 10, b], [Math.max(x0, karstWestX(b) + 1.5), b]]
})()
const KARST = withHoles(KARST_OUT, [riverHole, karstLabelHole])

// 타르 구덩이는 표시의 조금 위에 — 표시가 남쪽 가장자리에 앉아 밑에 다는 이름이 깊은 확대에서도 구덩이 테두리에 걸리지 않게
const parts = [...pools, ...river, ...tarPit([TARPIT[0], TARPIT[1] - 13]), ...stack(trees)]

CHILDMAPS.push({
  id: 'zof-marsh',
  size: [1200, 1000],
  glyphScale: 4,
  terrain: [
    { kind: 'canyon', points: KARST, density: 0.9 },
    { kind: 'mangrove', points: MANGROVE, density: 1, phase: true },
    { kind: 'mangrove', points: MANGROVE_NOPHASE, density: 1, phase: false },
    ...FLATS.map((points) => ({ kind: 'swamp', points, density: 1 })),
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
