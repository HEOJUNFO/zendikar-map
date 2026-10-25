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
//       나선을 둘러싼 큰 맹그로브, 뜯겨 늘어진 덩굴(사가1 페이즈1·2 에서는 나선을 덮고 땅·나무에 이어진 덩굴),
//       서로 이어지지 않은 작은 물웅덩이와 진흙 땅의 자리, 타르 구덩이의 모양, 세 그림의 자리. 물길·마을·엘프·짐승·헤드론은 그리지 않는다(자료에 없거나 자리가 없다). 물빛을 붉게 칠하지 않는다.
// 페이즈별 모습: 사가1 페이즈1·2(ZEN·WWK, 2009–2010 초)는 타이탄이 풀려나기 전이다. 아트북은 나선이 'covered in clinging vines,
//       which makes it almost disappear among the leaves' 이고, 타이탄이 풀려난 뒤에야 'the helix has begun to turn, tearing the clinging
//       vines free from the ground and nearby trees' 라고 쓴다(The Art of Magic: Zendikar, 2016). 그래서 그 두 페이즈에서만 뜯겨 늘어진
//       덩굴(tornVines)을 빼고, 나선 띠를 감아 덮은 잎 덩굴과 땅(구조물 윗면)·곁의 큰 나무 셋에서 나선까지 끊기지 않고 이어진
//       덩굴(coverVines)을 그린다({ phase: true, phase3: false }). 사가1 페이즈3(ROE) 부터는 나선이 돌며 덩굴을 뜯어낸 지금 그림
//       그대로다(ROE Zof Shade 플레이버의 'the remnants of the Helix of Zof' 도 이 무렵). 끔(2020 이후)과 사가2 도 그대로다.
//       나선 자체의 모양은 어느 페이즈에서나 같다(돌지 않았다는 것은 그림으로 따로 나타내지 않는다). 덮은 덩굴의 줄기 수·잎의 성김,
//       늘어진 잎 덩굴, 땅과 나무에 이어진 덩굴의 가닥 수와 자리(뜯긴 덩굴이 매달린 자리와 그것이 향하던 나무)는 이 지도의 해석이다.
// 페이즈1 그림: Crypt Ripper(그림자) 는 나선 북동쪽 맹그로브 사이에서 나선 쪽(서쪽)을 본다 — 나선에 그림자들이 출몰한다는
//       공식 서술에 이은 이 지도의 해석. Bog Tatters(망령) 는 나선에서 멀리 떨어진 남서쪽 늪의 물웅덩이 위 — 자리는 이 지도가 골랐다.
//       Pitfall Trap(가시 구덩이 함정) 은 남쪽 맹그로브 사이 — 굴 드라즈의 맹그로브 정글에 함정이 숨겨져 있다는 공식 가이드(2009)의
//       서술을 따라 이 지도가 골랐다 (말라키르 둘레의 함정은 말라키르 지역 상세의 Needlebite Trap).
// 페이즈3 그림: Zof Shade(그림자) 는 카드 플레이버가 Helix of Zof 의 잔해에 바로 잇는 대로, 잠긴 구조물 서쪽 끝 둘레 물 위에 떠서
//       나선 쪽으로 어둠 가닥을 뻗는다. 그 자리와 밑의 이름을 내려고 사가1 페이즈3 에서만 구조물 서쪽의 큰 맹그로브 b3·b7 을 빼고
//       그린다({ phase3: false } — 끔·페이즈1·2·사가2 의 모습은 그대로). 유적 둘레의 어느 쪽인지는 이 지도의 해석이다.
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
  'crypt-ripper': { at: [912, 430], size: 88, moved: { 3: { at: [849, 241], label: 'left' }, 4: { at: [849, 241], label: 'left' } } },
  'bog-tatters': { at: [562, 792], size: 88 },
  'pitfall-trap': { at: [382.9, 845.7], size: 51.4 },
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
  // runs·bt 는 페이즈1·2 의 덮은 덩굴(coverVines)이 같은 띠를 따라가도록 넘긴다 (그리는 것은 바뀌지 않는다)
  return { back, front, vine, lowest, runs, bt }
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
  // b3·b7 은 사가1 페이즈3 에서만 뺀다 — 구조물 서쪽 끝에 Zof Shade 가 서고 그 밑에 이름이 든다. 끔·페이즈1·2·사가2 에는 그대로 그린다
  { at: [HX - 108, BASE_Y + 10], s: 7.6, seed: 'b3', roots: [HX - 74, HX - 56, HX - 40], gate: { phase3: false } },
  { at: [HX + 106, BASE_Y + 12], s: 7.2, seed: 'b4', roots: [HX + 44, HX + 60, HX + 78] },
  { at: [HX - 88, BASE_Y + 62], s: 5.4, seed: 'b7', gate: { phase3: false } },
  { at: [HX + 92, BASE_Y + 64], s: 5.2, seed: 'b8' },
]
for (const b of BIG) {
  const [x, y] = b.at
  const parts = mangrove(x, y, b.s, b.seed, { bold: b.s > 7 })
  if (b.roots) parts.push(...rootsOver(x, y, b.roots, b.s * 2, `${b.seed}r`))
  // (시점별 보기 — b3·b7 은 Zof Shade 를 그 시점에 그릴 때만 뺀다: KIT.dodge)
  trees.push({ y, parts: b.gate ? KIT.dodge('zof-shade', parts.map((p) => ({ ...p, ...b.gate }))) : parts })
}
// 나선 묶음 — 구조물 물선 높이에 끼워 넣어, 앞의 나무가 그 위에 온다
const tornVines = [
  ...slack([HX - 24, HEL.lowest - 6], [HX - 62, BASE_Y - 10], 6, 't1'),
  ...slack([HX + 22, HEL.lowest - 12], [HX + 60, BASE_Y - 8], 5, 't2'),
  ...slack([HX - 30, HEL.lowest - 54], [HX - 66, HEL.lowest - 40], 10, 't3', { frayed: true }),
  ...slack([HX + 24, HEL.lowest - 70], [HX + 58, HEL.lowest - 58], 8, 't4', { frayed: true }),
  ...slack([HX + 20, HEL.lowest - 98], [HX + 34, HEL.lowest - 76], 4, 't5', { frayed: true }),
]
// 뜯긴 덩굴은 나선이 돌기 시작한 뒤(사가1 페이즈3 부터)의 모습 — 사가1 페이즈1·2 에서만 빼고 끔·페이즈3·사가2 에는 그대로 그린다 (두 벌로)
const tornVinesGated = tornVines.flatMap((p) => [{ ...p, phase: false }, { ...p, phase3: true }])

// ---------- 사가1 페이즈1·2(ZEN·WWK) — 돌기 전의 나선: 덩굴에 덮여 잎 사이에 거의 숨었다 ----------
// 띠마다 비스듬히 감아 도는 잎 덩굴 줄기(뒤 띠의 것은 앞 띠 밑에), 앞 띠 밑으로 늘어진 잎 덩굴, 구조물 윗면(땅)에서 가장 낮은 띠로
// 오르는 줄기, 나선에서 곁의 큰 나무(b1·b2·b9 — 뜯긴 덩굴 t3·t4·t5 가 향하던 나무)의 줄기에 감긴 덩굴. 모두 { phase: true, phase3: false }.
// 덩굴 그리는 법은 위의 띠 덩굴·뜯긴 덩굴과 같다(꼬인 두 가닥, 아몬드꼴 잎). 줄기 수·자리·잎의 성김은 이 지도의 해석이다
// 꼬인 두 가닥의 덩굴 — a 에서 c(2차 곡선 조절점)를 거쳐 b 로, 잎은 every 점마다 (slack 과 같은 꼴, 끊긴 끝은 없다)
function cling(a, c, b, seed, o = {}) {
  const rand = rng(seed)
  const at = (t) => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]]
  const n = o.n ?? 14
  const s1 = []
  const s2 = []
  for (let i = 0; i <= n; i++) {
    const [x, y] = at(i / n)
    s1.push([x + Math.cos(i * 1.3) * 0.5, y + Math.sin(i * 1.3) * 1.1])
    s2.push([x - Math.cos(i * 1.3) * 0.5, y - Math.sin(i * 1.3) * 1.1 + 0.6])
  }
  let d = smooth(s1) + smooth(s2)
  let leaves = ''
  for (let i = 1; i < n; i += o.every ?? 2) {
    if (rand() < 0.2) continue
    const [x, y] = at(i / n)
    const up = rand() < 0.5
    leaves += leaf(x, y, 3.8 + rand() * 1.8, (up ? -Math.PI / 2 : Math.PI / 2) + (rand() - 0.5) * 2)
  }
  // 나무 줄기에 감긴 끝 — 줄기를 비스듬히 두 번 가로지르는 짧은 고리와 잎 둘
  if (o.wrap) {
    const [x, y] = b
    d += `M${pt([x - 3.5, y - 2])}Q${pt([x, y - 4.5])} ${pt([x + 3.5, y])}M${pt([x - 3.5, y + 3])}Q${pt([x, y + 0.5])} ${pt([x + 3.5, y + 5])}`
    leaves += leaf(x + 3.5, y, 4.2, -0.5) + leaf(x - 3.5, y + 3, 4, Math.PI + 0.5)
  }
  return { d, leaves }
}
// 큰 맹그로브의 줄기 — mangrove() 와 같은 첫 난수로 수관 밑과 뿌리 무릎 사이의 한가운데
const trunkMid = (b) => {
  const r = (2.3 + rng(b.seed)() * 1) * b.s
  const top = b.at[1] - 4.2 * b.s - r * 0.4 + r * 0.7
  return [b.at[0], (top + b.at[1] - 2 * b.s) / 2]
}
function coverVines() {
  const rand = rng('cover')
  const { runs, bt } = HEL
  let backLeaves = ''
  let backVines = ''
  let leaves = ''
  let vines = ''
  for (const run of runs) {
    if (run.length < 6) continue
    const isFront = run[0].front
    let l = ''
    let v = ''
    // 띠를 비스듬히 감아 도는 줄기 둘 — 위 가장자리와 아래 가장자리를 오가며, 큰 잎이 띠를 반 넘게 덮는다
    // (얕은 확대에서 잎 테두리 선이 몰려 검게 뭉치지 않게 잎은 띠 덩굴의 잎보다 조금 크고 성기다)
    for (let j = 0; j < 2; j++) {
      const ph = rand() * 6.28
      const f = 0.42 + rand() * 0.32
      const vp = run.filter((_, i) => i % 2 === j % 2).map((s, i) => [s.x, s.yc + Math.sin(i * f + ph) * bt * 0.44])
      if (vp.length < 3) continue
      v += smooth(vp)
      for (let i = 1; i < vp.length - 1; i += isFront ? 1 : 2) {
        if (rand() < 0.5) continue
        const [vx, vy] = vp[i]
        const up = rand() < 0.62
        l += leaf(vx, vy, 6.6 + rand() * 3, (up ? -Math.PI / 2 : Math.PI / 2) + (rand() - 0.5) * (up ? 2.4 : 1.8))
      }
    }
    // 앞 띠 밑으로 늘어진 잎 덩굴 — 아래 바퀴와의 틈을 잎이 메운다
    if (isFront) {
      for (let i = 4; i < run.length - 4; i += 9) {
        if (rand() < 0.45) continue
        const s = run[i]
        const len = 8 + rand() * 11
        const sw = (rand() - 0.5) * 6
        const x0 = s.x
        const y0 = s.yc + bt / 2 - 1
        v += `M${pt([x0, y0])}Q${pt([x0 + sw, y0 + len * 0.55])} ${pt([x0 + sw * 0.3, y0 + len])}`
        for (const q of [0.5, 1]) l += leaf(x0 + sw * 0.45 * q, y0 + len * q, 4.4 + rand() * 1.8, Math.PI / 2 + (rand() - 0.5) * 2.2)
      }
    }
    if (isFront) {
      leaves += l
      vines += v
    } else {
      backLeaves += l
      backVines += v
    }
  }
  // 땅(구조물 윗면)에서 가장 낮은 앞 띠로 오르는 줄기 — 물 고인 틈은 비킨다
  const low = runs[0]
  const bottomAt = (x) => {
    const s = low.reduce((m, q) => (Math.abs(q.x - x) < Math.abs(m.x - x) ? q : m))
    return [s.x, s.yc + bt / 2 - 1.5]
  }
  for (const [gx, gy, hx, bow, seed] of [[HX - 52, BASE_Y - 8, HX - 30, -4, 'g1'], [HX - 20, BASE_Y - 13, HX - 12, 3, 'g2'], [HX + 14, BASE_Y - 12, HX + 8, -3, 'g3'], [HX + 52, BASE_Y - 7, HX + 26, 4, 'g4']]) {
    const top = bottomAt(hx)
    const c = [(gx + top[0]) / 2 + bow, (gy + top[1]) / 2]
    const g = cling([gx, gy], c, top, seed, { n: 10, every: 2 })
    vines += g.d
    leaves += g.leaves
  }
  // 나선에서 곁의 큰 나무 줄기로 걸친 덩굴 — 뜯긴 덩굴 t3·t4·t5 와 같은 자리에서 나와 그 나무까지 이어진다
  for (const [a, b, sag, seed] of [[[HX - 30, HEL.lowest - 54], BIG[0], 5, 'c1'], [[HX + 24, HEL.lowest - 70], BIG[1], 5, 'c2'], [[HX + 20, HEL.lowest - 98], BIG[2], 2, 'c3']]) {
    const end = trunkMid(b)
    const c = [(a[0] + end[0]) / 2, Math.max(a[1], end[1]) + sag]
    const g = cling(a, c, end, seed, { n: 12, every: 2, wrap: true })
    vines += g.d
    leaves += g.leaves
  }
  const gate = { phase: true, phase3: false }
  return {
    back: [{ ...P('forest', backLeaves), ...gate }, { ...P('hatch', backVines + backLeaves), ...gate }],
    front: [{ ...P('forest', leaves), ...gate }, { ...P('hatch', vines + leaves), ...gate }],
  }
}
const COVER = coverVines()

const shadowUnder = [P('shade', ell(HX + 3, BASE_Y - 8, 30, 4.5))]
const helixGroup = [...sunkenBase(), ...shadowUnder, ...HEL.back, ...COVER.back, ...HEL.front, ...HEL.vine, ...tornVinesGated, ...COVER.front]
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
// 그림 셋의 자리는 페이즈1 에서만 비운다 — 페이즈를 끄면 맹그로브가 채운다 (Bog Tatters 의 웅덩이는 늘 비운다)
const SUBJ_HOLES = [
  // 서쪽 변은 나선 자리(x ≤ 858)와 겹치지 않게, 동쪽 변은 고리(RING_E)를 1.5 안쪽에서 그대로 따라 — 고리와 구멍 사이에 기호 띠가 남지 않고
  // 칸 밖으로 나가지도 않게(나간 구멍은 도리어 칠해진다). 밑은 이름 밑의 수관까지
  [[878, 334], [961, 334], [933.5, 474], [924.5, 512], [872, 512], [860, 500], [860, 352]],
  R(BT[0] - 92, BT[1] - 96, BT[0] + 92, BT[1] + 42),
  // Pitfall Trap — 그림(x 357–409, y 830–860)과 그 밑 이름까지. 서쪽의 웅덩이 p6(x ≤ 318)·북쪽 진흙 땅(y ≤ 786)과 떨어진다
  R(323, 806, 443, 886),
]
// 시점별 보기 — SUBJ_HOLES 그대로, 그 카드에 매어 (그 카드를 그 자리에 그리는 시점에만 연다)
const TIME_CLEAR = ['crypt-ripper', 'bog-tatters', 'pitfall-trap'].map((id, i) => ({ points: SUBJ_HOLES[i], for: [id], timeOnly: true }))
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

// 사가2 페이즈1 레어의 빈터 (그림 상자와 밑의 이름) — 둥근 꼴이라 깊은 확대에서 곧은 모서리가 드러나지 않는다
const ring16 = (cx, cy, rx, ry) => Array.from({ length: 16 }, (_, i) => [Math.round(cx + Math.cos((i / 16) * Math.PI * 2) * rx), Math.round(cy + Math.sin((i / 16) * Math.PI * 2) * ry)])
const S2_CLEAR = {
  bloodlord: ring16(982, 194, 50, 60), // 그림 x 943–997 · y 148–216, 이름 y ≈ 240
  truths: ring16(1072, 222, 36, 42), // 그림 x 1046–1098 · y 184–236
  herder: ring16(1030, 512, 62, 74), // 그림 x 979–1082 · y 457–550, 이름 y ≈ 575 (Pelakka Karst 이름 구멍 위에서 멈춘다)
  overseer: ring16(1008, 750, 58, 52), // 그림 x 979–1042 · y 718–770, 이름 y ≈ 795 (강 머리 y 803 위)
  // 사가2 페이즈1 언커먼
  processor: ring16(298, 200, 56, 46), // 그림 x 268–325 · y 166–203, 이름 y ≈ 203–238
  emissary: ring16(798, 284, 52, 50), // 그림 x 766–826 · y 248–290, 이름 y ≈ 290–325 (웅덩이 p9 밑)
  rites: ring16(930, 318, 36, 46), // 그림 x 915–945 · y 279–319, 이름 y ≈ 319–354 (드라나 이름 위, 동쪽 x 980 앞)
  bloodbond: ring16(945, 562, 44, 56), // 그림 x 924–966 · y 522–591, 이름 y ≈ 591–626 (Pelakka Karst 이름 구멍 위)
  // 사가2 페이즈1 커먼
  scout: ring16(596, 290, 46, 46), // 그림 x 560–629 · y 245–307, 이름 y ≈ 311–331 (동쪽 웅덩이 p9 x ≥ 630 앞)
  dutiful: ring16(440, 557, 48, 35), // 그림 x 417–463 · y 535–562, 이름 y ≈ 567–586 (Zof Marsh 이름 밑의 진흙 땅)
  healer: ring16(565, 558, 52, 35), // 그림 x 534–597 · y 532–563, 이름 y ≈ 568–587 (나선 자리의 큰 나무 뿌리 x ≥ 609 와 맞닿는다)
  assassin: ring16(912, 440, 56, 54), // 그림 x 880–946 · y 398–464, 이름 y ≈ 468–488
  null: ring16(907, 726, 50, 52), // 그림 x 877–937 · y 688–750, 이름 y ≈ 754–775 (Pelakka Karst 이름 구멍 밑, Guul Draz Overseer 빈터 서쪽)
}

CHILDMAPS.push({
  id: 'zof-marsh',
  size: [1200, 1000],
  glyphScale: 4,
  terrain: [
    { kind: 'canyon', points: KARST, density: 0.9 },
    // (시점별 보기는 늘 그림 자리를 채운 칸 — 그 시점에 그리는 그림 셋의 자리만 카드에 매인 빈터가 연다)
    { kind: 'mangrove', points: MANGROVE, density: 1, phase: true, time: { t1: false, t2: false } },
    { kind: 'mangrove', points: MANGROVE_NOPHASE, density: 1, phase: false, time: { t1: true, t2: true } },
    ...FLATS.map((points) => ({ kind: 'swamp', points, density: 1 })),
  ],
  parts,
  labels: LABELS,
  // 페이즈2(WWK)·3(ROE)·사가2 대상의 빈터 — 그 페이즈에서만 이 안에 밑동이 떨어지는 지형 기호를 뺀다 (STYLE.md).
  // 사가2 페이즈1까지만 그리는 대상(phase4.ts 의 until: 1 — 드라나와 그 곁의 상징 둘)의 빈터는 phase5: false 로 페이즈2(OGW)에 되돌린다
  clearings: [
    { points: [[335, 639], [330, 658], [322, 671], [309, 677], [289, 680], [270, 677], [257, 670], [246, 659], [244, 639], [249, 620], [257, 608], [268, 597], [289, 597], [310, 597], [323, 606], [332, 618]], phase3: true }, // cadaver-imp
    { points: [[340, 191], [340, 215], [331, 230], [319, 238], [300, 239], [282, 235], [267, 230], [260, 215], [261, 191], [262, 169], [268, 153], [282, 148], [300, 142], [318, 145], [330, 154], [339, 168]], phase3: true }, // null-champion
    { points: [[636, 245], [635, 266], [618, 278], [596, 286], [560, 294], [523, 288], [498, 281], [481, 268], [483, 245], [485, 224], [497, 209], [524, 203], [560, 196], [599, 201], [620, 211], [636, 224]], phase2: true }, // scrib-nibblers
    { points: [[1079, 291], [1086, 318], [1110, 340], [1114, 366], [1104, 388], [1050, 390], [1010, 388], [993, 368], [981, 341], [980, 316], [981, 291], [993, 270], [1010, 255], [1030, 254], [1050, 255], [1067, 270]], phase4: true, phase5: false }, // drana-liberator-of-malakir (사가2 페이즈1) — 밑의 이름 오른끝까지 동쪽으로 넓힌다
    // 사가2 페이즈1 레어 — 그림과 밑의 이름 자리. 고리(RING_E) 안의 맹그로브는 거의 건드리지 않고 카르스트의 협곡 기호만 비운다
    { points: S2_CLEAR.bloodlord, phase4: true }, // defiant-bloodlord
    { points: S2_CLEAR.truths, phase4: true, phase5: false }, // painful-truths
    { points: S2_CLEAR.herder, phase4: true }, // blight-herder
    { points: S2_CLEAR.overseer, phase4: true }, // guul-draz-overseer
    // 사가2 페이즈1 언커먼 — 고리 안의 둘(Processor Assault·Drana's Emissary)과 고리 동쪽 가장자리의 둘은 맹그로브·협곡 기호를 그 자리만 비운다
    { points: S2_CLEAR.processor, phase4: true }, // processor-assault
    { points: S2_CLEAR.emissary, phase4: true }, // dranas-emissary
    { points: S2_CLEAR.rites, phase4: true, phase5: false }, // vampiric-rites
    { points: S2_CLEAR.bloodbond, phase4: true }, // bloodbond-vampire
    // 사가2 페이즈1 커먼 — 맹그로브·진흙 땅·협곡 기호를 그림과 밑의 이름 자리만 비운다
    { points: S2_CLEAR.scout, phase4: true }, // kitesail-scout
    { points: S2_CLEAR.dutiful, phase4: true }, // dutiful-return
    { points: S2_CLEAR.healer, phase4: true }, // kalastria-healer
    { points: S2_CLEAR.assassin, phase4: true }, // nirkana-assassin
    { points: S2_CLEAR.null, phase4: true }, // voracious-null
    // 시점별 보기 — 사가1 페이즈1 그림 자리 (사가 보기는 맹그로브 칸의 구멍이 비운다)
    // 사가3 페이즈1(ZNR) 레어 — 그림과 이름 자리 (세계 지도 그림은 이 범위에 드는 그림과 이름 자리)
    { points: [[447,209], [581,209], [581,323], [611,323], [611,356], [418,356], [418,323], [447,323]], phase6: true }, // taborax-hopes-demise (세계 지도 그림)
    ...TIME_CLEAR,
    { points: [[265, 96], [447, 96], [447, 171], [265, 171]], movedFor: ['null-champion'] }, // null-champion — 시점별 보기에서 시점 3 에만 옮긴 자리 · 2b (그림 x 271–328 · y 102–165, 오른쪽 이름까지)
    { points: [[691, 151], [897, 151], [897, 258], [691, 258]], movedFor: ['crypt-ripper'] }, // crypt-ripper — 시점별 보기에서 시점 3·4 에만 옮긴 자리 · 2b (그림 x 809–891 · y 157–245, 왼쪽 이름까지)
    { points: [[524, 342], [642, 342], [642, 456], [524, 456]], movedFor: ['zof-shade'] }, // zof-shade — 시점별 보기에서 시점 4 에만 옮긴 자리 · 2b (그림 x 552–614 · y 383–442, 위 이름까지)
  ],
  subjects: {
    // Cadaver Imp(ROE) — 조프 늪 물가 위를 오른쪽으로 날아가는, 박쥐 날개를 치켜든 야윈 작은 임프. (페이즈3)
    'cadaver-imp': { at: [295, 640], size: 48 },
    // Zof Shade(ROE) — 조프 늪, 나선 유적의 잠긴 구조물 서쪽 끝 둘레 물 위에 떠서 나선 쪽으로 어둠 가닥을 뻗어 힘을 빨아들이는, 다리 없이 아래로 흩어지는 사람꼴 어둠 구름과 빛나는 두 눈의 그림자. (페이즈3)
    // 나선 자리 구멍(HOLES[1]) 안이라 빈터는 없다 — 그 대신 이 페이즈에서만 큰 맹그로브 b3·b7 을 뺀다. 위는 b1 의 물결(y ≈ 477), 오른쪽은 나선(x ≥ 699)까지
    'zof-shade': { at: [624, 516], size: 62, moved: { 4: { at: [576, 408], label: 'above' } } },
    // Null Champion(ROE) — 조프 늪 진흙 둔덕에 칼을 쥐고 버티고 선, 이빨 난 입만 있는 달걀꼴 머리의 null 전사 하나 (페이즈3)
    'null-champion': { at: [300, 212], size: 62.9, moved: { 3: { at: [300, 158], label: 'right' } } },
    // 페이즈2 — 조프 늪 물웅덩이 사이 진흙 둔덕에서 무언가를 둘러싸고 갉아 먹는 늪쥐 세 마리 (이 지도의 추정)
    'scrib-nibblers': { at: [560, 230], size: 51 },
    // 사가2 페이즈1 — Drana, Liberator of Malakir(BFZ): 굴 드라즈 변두리의 바위땅 위를 날아 '좁은 바다 너머' 타짐 쪽 해안으로 가는 흡혈귀 혈족장.
    // 맹그로브 고리 동쪽 끝(969, 303) 너머 펠라카 카르스트 가장자리의 마른 땅 위, 서쪽(타짐 쪽, 지도 안쪽)을 향해 뒤집는다 (이 지도의 추정)
    'drana-liberator-of-malakir': { at: [1030, 300], size: 90, flip: true },
    // 사가2 페이즈1 레어 — 같은 싸움(Memories of Blood)의 넷을 카르스트 서쪽 가장자리 띠(고리 동쪽 ~ 동쪽 섞는 띠 x 1080 앞)에 위에서 아래로 늘어놓는다.
    // Defiant Bloodlord — 드라나 북서쪽, 북해안 가까운 하늘에서 동쪽(엘드라지 본진 쪽)을 본다 (이 지도의 추정)
    'defiant-bloodlord': { at: [960, 180], size: 68 },
    // Painful Truths — 서쪽을 보고 나는 드라나의 등 뒤(북동쪽) 위에 뜬 기억의 조약돌 (드라나를 둘 그리지 않는다). 동쪽 섞는 띠(x ≥ 1080)에 덜 걸리게 조금 안쪽으로
    'painful-truths': { at: [1072, 210], size: 51.4 },
    // Blight Herder — 드라나 남쪽 카르스트 바위땅을 서쪽으로 밀고 드는 엘드라지 처리자 (본진이 정동쪽에서 왔다 — 뒤집어 서쪽을 본다)
    'blight-herder': { at: [1030, 545], size: 103, flip: true },
    // Guul Draz Overseer — Blight Herder 와 한 자리에 겹치지 않게 Pelakka Karst 이름 남쪽, 강 머리 위의 하늘로 비켜 동쪽을 본다 (이 지도의 추정)
    'guul-draz-overseer': { at: [1000, 745], size: 63 },
    // 사가2 페이즈1 언커먼 (모두 이 지도의 추정 자리)
    // Processor Assault — 서해안 가까운 고리 안 맹그로브, 처리자가 하얗게 말린 뿌리 위에서 서쪽(타짐 쪽)으로 힘을 터뜨린다 (드라나의 싸움터 x ≥ 960 에서 멀리)
    'processor-assault': { at: [300, 200], size: 57.1 },
    // Drana's Emissary — 고리 안, 드라나 서쪽·Defiant Bloodlord 남서쪽 하늘에서 동쪽을 지키는 흡혈귀 사제. 웅덩이 p9 밑, 나선 자리(y ≥ 336) 위.
    // Vampiric Rites 의 이름과 겹치지 않게 처음 잡은 (840, 270) 에서 서쪽으로 비켰다
    'dranas-emissary': { at: [800, 270], size: 60 },
    // Vampiric Rites — 서쪽을 보고 나는 드라나 앞(서쪽), 고리 동쪽 가장자리 안에 뜬 피 그릇. 드라나 이름과 겹치지 않게 (940, 330) 에서 북쪽으로 올렸다
    'vampiric-rites': { at: [930, 300], size: 40 },
    // Bloodbond Vampire — 고리 동쪽 가장자리와 카르스트 사이의 마른 바위땅, Blight Herder 서쪽에서 서쪽(타짐 쪽)을 보고 떠나는 흡혈귀 주술사
    'bloodbond-vampire': { at: [945, 584], size: 68.6, flip: true },
    // 사가2 페이즈1 커먼 (모두 이 지도의 추정 자리)
    // Kitesail Scout — 서쪽에서 맹그로브 늪 위로 날아드는 코르 연 돛 정찰병, 동쪽(드라나 무리 쪽)을 본다. 웅덩이 p9 서쪽 하늘
    'kitesail-scout': { at: [600, 280], size: 68.6 },
    // Dutiful Return·Kalastria Healer — 드라나 무리의 피난민 진영. 브리프의 자리(나선 북쪽)는 나선 꼭대기와 큰 나무 수관 위라,
    // 같은 해안 쪽(서쪽)인 나선 서쪽, Zof Marsh 이름 밑의 진흙 땅에 나란히 둔다 (둘의 이름이 밑에 나란히 들게 125 떨어뜨린다)
    'dutiful-return': { at: [440, 560], size: 45.7 },
    'kalastria-healer': { at: [565, 560], size: 62.9 },
    // Nirkana Assassin — 드라나 싸움터 서쪽 가장자리, 맹그로브 고리 동쪽 끝 안쪽의 늪에서 동쪽(엘드라지 쪽)을 본다
    'nirkana-assassin': { at: [910, 450], size: 66.3 },
    // Voracious Null — 고리 동쪽 바깥의 트인 땅, Guul Draz Overseer 서쪽. 밑의 이름이 감독관의 이름에 닿지 않게 브리프의 (910, 750) 에서 조금 서북쪽으로
    'voracious-null': { at: [905, 745], size: 62.3 },
    'bog-tatters': SUBJ['bog-tatters'],
    'crypt-ripper': SUBJ['crypt-ripper'],
    'pitfall-trap': SUBJ['pitfall-trap'],
  },
  markAnchors: { 'helix-of-zof': 'below', 'card:creeping-tar-pit': 'below' },
  focus: [742, 590],
})
