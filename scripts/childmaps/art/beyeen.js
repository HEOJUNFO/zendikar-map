// 베이인(Beyeen) — 자식 지도 (온두 앞바다의 섬, 세계 범위 x 466–634 · y 1518–1638, ×8.333).
// 공식(PG: Ondu 2009 — Beyeen, the Crown of Talib): 덩굴 다리로 이어진 작은 화산 지괴들의 온화한 섬. 섬 가운데에 들쭉날쭉한
// 화산 봉우리의 고리가 솟고(코르는 대지의 신 Talib 의 이름을 따 Crown of Talib, 'God's Crown' 이라 부른다), 그 가장 크고 활발한
// 봉우리가 발라쿠트다. 섬의 다른 작은 바위산 몇몇은 그 아래 울퉁불퉁한 대지 위에 떠 있다가 예측할 수 없이 솟았다 내려찍는
// '피스톤' 산이다. 저지대 골짜기는 온대 우림이다. 서해안 가까이에 산비탈을 따라 바다 쪽으로 계단처럼 내려가는 거대한 조수
// 웅덩이 무리(Boilbasin — 바닷물과 땅 밑 온천이 섞여 김이 끓는다)가 있고, 해안에 마을 줄라포트가 있다.
// ROE 이후 발라쿠트는 거의 쉬지 않고 분화해, 하늘로 솟은 용암 기둥이 굳어 떠다니는 화산 유리 섬이 된다(The Art of Magic:
// Zendikar, 2016) — 사가1(2009–10)에서는 그리지 않는다(phase: false).
// 세계 지도(src/data/landscape/ondu.ts)와 맞춘다: 발라쿠트 화산(valakut-volcano)과 고리의 봉우리 여섯(crown-of-talib-*), 피스톤
// 바위산(beyeen-piston-crag), Boilbasin 웅덩이 셋(boilbasin-pool-*)은 세계 지도 기호와 같은 자리에, 고리 안쪽(beyeen-crown-basin)은
// 세계 지도처럼 기호 없이, 저지대 우림(beyeen-rainforest)은 세계 지도의 숲 영역 그대로, 그 밖의 섬은 세계 지도처럼 산 기호.
// 해석(공식 자리·모양 없음): 봉우리들의 모양·크기, 덩굴 다리 둘의 자리, 떠 있는 바위 밑 대지의 모양, 웅덩이의 모양과 넘쳐 흐르는
// 물길, 화산 유리 섬의 수·자리, 줄라포트의 집·골목·나무 부두, 두 그림의 자리 — Zulaport Cutthroat 는 줄라포트 서쪽 골목 끝,
// Valakut Invoker 는 섬 동쪽 끝 곶에서 서쪽의 발라쿠트를 본다 (모두 이 지도의 추정).
// 사가2 의 세계 지도 그림(Retreat to Valakut — 고리 동쪽 기슭, Valakut Predator — 고리 남서쪽 기슭)은 이 그림 위에 그대로
// 그려지므로 비켜 그린다: 남서쪽 봉우리는 사가2 에서 Valakut Predator 가 그 자리를 맡고(phase4: false), 피스톤 바위산 밑의 대지와
// 그림자는 Retreat to Valakut 의 비탈 밑에 들어 사가2 에서 그리지 않는다.

const { line, poly, smooth, rng, stack, dashed } = KIT
const r1 = (v) => Math.round(v * 10) / 10
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`
const P = (cls, d) => ({ cls, d })
const ell = (x, y, rx, ry) => `M${pt([x - rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x + rx, y])}A${r1(rx)} ${r1(ry)} 0 1 0 ${pt([x - rx, y])}Z`
const W = 1400
const H = 1000

// ---------------------------------------------------------------- 해안 (context.mjs 의 세계 지도 해안선 — 남쪽 해안을 동쪽으로 먼저 돈다, 땅은 진행 방향 왼쪽)
const COAST = [[216,576],[225,585],[231,586],[259,577],[293,574],[308,566],[333,537],[337,536],[346,538],[377,568],[384,570],[396,568],[409,575],[427,591],[436,603],[440,613],[440,622],[430,647],[428,676],[432,689],[439,701],[447,710],[457,715],[473,714],[505,699],[516,696],[521,696],[531,702],[548,698],[569,705],[607,704],[627,707],[646,700],[690,674],[709,668],[717,670],[723,679],[724,687],[719,702],[722,713],[726,717],[734,720],[773,723],[798,721],[814,714],[822,704],[830,699],[835,700],[847,711],[855,712],[867,709],[887,718],[902,714],[916,714],[949,720],[968,721],[978,719],[993,712],[1001,711],[1010,715],[1013,724],[1008,736],[995,756],[1015,747],[1025,750],[1034,757],[1025,743],[1021,732],[1022,726],[1030,714],[1035,700],[1038,679],[1036,664],[1031,661],[1029,661],[1011,669],[990,667],[982,670],[972,677],[962,677],[954,670],[950,665],[949,657],[953,647],[952,641],[935,620],[933,610],[939,602],[951,597],[976,601],[1002,596],[1011,600],[1021,609],[1028,611],[1041,610],[1054,605],[1060,601],[1062,596],[1060,579],[1061,571],[1072,549],[1073,543],[1072,537],[1065,529],[1058,526],[1046,524],[1026,525],[1011,520],[1005,514],[1000,507],[1001,500],[1006,496],[1005,492],[992,483],[969,477],[962,479],[952,486],[947,486],[942,483],[936,477],[933,469],[935,457],[940,449],[951,439],[961,433],[971,431],[957,420],[942,413],[922,411],[907,412],[882,419],[826,442],[808,445],[798,441],[790,432],[787,410],[776,392],[773,382],[772,364],[775,331],[771,318],[758,303],[755,290],[745,298],[734,299],[723,291],[718,280],[719,273],[727,261],[746,246],[759,238],[739,244],[735,243],[729,237],[724,235],[709,240],[701,237],[702,242],[715,265],[712,276],[714,290],[711,297],[691,318],[683,334],[674,346],[668,348],[662,346],[647,335],[635,332],[626,334],[598,351],[584,344],[574,345],[567,348],[556,359],[550,374],[553,389],[562,408],[561,415],[555,423],[536,437],[519,446],[505,450],[488,449],[471,467],[456,475],[436,476],[419,473],[403,466],[369,440],[346,435],[334,438],[313,454],[257,522],[220,555],[215,564],[214,573]]

function inPoly(x, y, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
/** 해안선(선분)까지의 거리 */
function coastDist(x, y) {
  let m = Infinity
  for (let i = 0; i < COAST.length; i++) {
    const [ax, ay] = COAST[i]
    const [bx, by] = COAST[(i + 1) % COAST.length]
    const dx = bx - ax
    const dy = by - ay
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)))
    m = Math.min(m, Math.hypot(x - ax - dx * t, y - ay - dy * t))
  }
  return m
}
/** 해안에서 d 만큼 안쪽으로 민 고리 — 좁은 곶·홈에서 해안에 너무 가까워진 점은 버린다 (지형 기호를 바닷가 안쪽에 두려고) */
function insetRing(d) {
  const n = COAST.length
  const out = []
  for (let i = 0; i < n; i++) {
    const a = COAST[(i - 1 + n) % n]
    const b = COAST[(i + 1) % n]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    // 진행 방향의 왼쪽(땅 쪽) 수직
    const p = [COAST[i][0] + ((b[1] - a[1]) / len) * d, COAST[i][1] - ((b[0] - a[0]) / len) * d]
    if (inPoly(p[0], p[1], COAST) && coastDist(p[0], p[1]) > d * 0.8) out.push([r1(p[0]), r1(p[1])])
  }
  return out
}
/** 바깥 고리에 구멍 고리를 이어 붙인다 (짝홀 규칙 — 구멍끼리 겹치지 않게) */
const withHoles = (outer, holes) => [...outer, outer[0], ...holes.flatMap((h) => [...h, h[0], outer[0]])]
/** 둥근 빈터 고리 */
function blob(cx, cy, rx, ry, n = 16) {
  const out = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    out.push([r1(cx + Math.cos(a) * rx), r1(cy + Math.sin(a) * ry)])
  }
  return out
}
/** 2차 베지에를 꺾은선으로 */
function quad(a, c, b, n) {
  const out = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const u = 1 - t
    out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]])
  }
  return out
}

// ---------------------------------------------------------------- 1. 화산 — 세계 지도 화산 기호(오목한 두 비탈, 분화구, 흘러내리는 용암 줄기)의 큰 꼴
// (x, y) 는 밑 가운데, hw 는 반 너비, h 는 높이. 봉우리는 들쭉날쭉하게('a ring of jagged, volcanic peaks') 비탈을 조금 흔든다
function volcano(x, y, hw, h, o = {}) {
  const rand = rng(o.seed ?? `v${x}`)
  const cw = o.cw ?? hw * 0.2
  const top = y - h
  const jag = o.jag ?? 0.03
  const shake = (pts) => pts.map((p, i) => (i === 0 || i === pts.length - 1 ? p : [p[0] + (rand() - 0.5) * hw * jag * 2, p[1] + (rand() - 0.5) * h * jag]))
  const L = shake(quad([x - hw, y], [x - hw * 0.4, y - h * 0.6], [x - cw, top], 9))
  const R = shake(quad([x + cw, top + h * 0.02], [x + hw * 0.5, y - h * 0.52], [x + hw, y], 9))
  const body = poly([...L, ...R])
  // 그늘진 오른쪽 비탈
  const inner = quad([x + cw * 0.5, top + h * 0.1], [x + hw * 0.18, y - h * 0.42], [x + hw * 0.4, y], 8)
  const shade = poly([...R, ...inner.reverse()])
  // 오른쪽 비탈의 빗금 — 비탈 선에서 아래 왼쪽으로
  let hatch = ''
  const nh = o.hatch ?? 6
  for (let i = 1; i <= nh; i++) {
    const t = i / (nh + 1)
    const [px, py] = R[Math.round(t * (R.length - 1))]
    const l = h * (0.1 + t * 0.12) * (0.75 + rand() * 0.5)
    hatch += line([[px - 1, py + 1.2], [px - l * 0.5, py + l]])
  }
  // 분화구에서 흘러내린 골 — 왼쪽 비탈에 가는 선
  for (const k of o.gullies ?? [0.35, 0.62]) {
    const sx = x - cw * (0.2 + k * 0.6)
    const sy = top + h * 0.08
    const ex = x - hw * k * 0.78
    const ey = y - h * (0.08 + rand() * 0.1)
    hatch += `M${pt([sx, sy])}Q${pt([x - hw * k * 0.3, top + h * 0.5])} ${pt([ex, ey])}`
  }
  // 용암 줄기 — 분화구 가장자리에서 비탈을 따라 가늘어지며 내려간다
  let fire = ''
  let fireInk = ''
  for (const [side, len, spread] of o.lava ?? [[-1, 0.42, 0.45], [1, 0.3, 0.5]]) {
    const cl = []
    const n = 8
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const yy = top + 1 + h * len * t
      const half = cw + (hw - cw) * ((yy - top) / h) // 그 높이의 대략적인 반 너비
      cl.push([x + side * (cw * 0.35 + half * spread * t) + Math.sin(t * 5 + side) * hw * 0.025, yy])
    }
    const w0 = Math.max(1.6, cw * 0.32)
    const left = cl.map(([px, py], i) => [px - w0 * (1 - (i / n) * 0.85), py])
    const right = cl.map(([px, py], i) => [px + w0 * (1 - (i / n) * 0.85), py])
    const d = poly([...left, cl[n], ...right.reverse()])
    fire += d
    fireInk += d
  }
  const parts = [P('fill', body), P('shade', shade), P('fire', fire), P('hatch', hatch), P('fire-ink', fireInk), P('ink-bold', line([...L, ...R])), P('dark', ell(x, top + 0.5, cw, cw * 0.3)), P('ink', ell(x, top + 0.5, cw * 1.08, cw * 0.34))]
  // 밑자락의 돌 몇 개
  if (o.rocks !== false) parts.push(...KIT.rocks(x + hw * 0.62, y + 2, hw * 0.07, 2, `${o.seed}-r`), ...KIT.rocks(x - hw * 0.7, y + 1.5, hw * 0.06, 2, `${o.seed}-l`))
  return parts
}

/** 분화구에서 오르는 연기 — 오른쪽(동쪽)으로 흐르며 부푸는 연기 덩이 (세계 지도 화산 기호의 연기와 같은 방향) */
function smoke(x, y, n, seed) {
  const rand = rng(seed)
  let fill = ''
  let curl = ''
  for (let i = 0; i < n; i++) {
    const r = 7 + i * 3.4
    const cx = x + i * 6 + i * i * 1.3 + (rand() - 0.5) * 3
    const cy = y - 12 - i * 19
    fill += ell(cx, cy, r, r * 0.72)
    // 덩이의 위쪽 반만 선으로 — 아래는 앞 덩이에 묻힌다
    curl += `M${pt([cx - r, cy])}A${r1(r)} ${r1(r * 0.72)} 0 0 1 ${pt([cx + r, cy])}`
    curl += `M${pt([cx - r * 0.35, cy + r * 0.1])}q${r1(r * 0.3)} ${r1(-r * 0.3)} ${r1(r * 0.6)} 0`
  }
  // 분화구에서 첫 덩이까지 꼬인 줄기
  curl += `M${pt([x - 1, y - 1])}C${pt([x - 6, y - 5])} ${pt([x + 5, y - 8])} ${pt([x + 1, y - 12])}M${pt([x + 3, y - 1])}C${pt([x + 7, y - 4])} ${pt([x + 1, y - 7])} ${pt([x + 5, y - 11])}`
  return [P('shade', fill), P('hatch', curl)]
}

// 발라쿠트 — 세계 지도 기호(valakut-volcano, 밑 가운데 708.3·433.3, 크기 1 = 반 너비 79·높이 104)를 조금 더 크게, 이 지도의 중심 그림.
// 섬 북쪽 해안의 곶 밑에 서고 분화구는 곶 위에 든다. Valakut 표시(718.3, 393.3)는 동쪽 비탈 가운데
const VALAKUT = { x: 708.3, y: 436, hw: 84, h: 128 }
const valakut = [
  ...volcano(VALAKUT.x, VALAKUT.y, VALAKUT.hw, VALAKUT.h, {
    seed: 'valakut',
    cw: 17,
    jag: 0.022,
    hatch: 9,
    gullies: [0.22, 0.45, 0.7],
    lava: [[-1, 0.62, 0.55], [1, 0.48, 0.42], [-1, 0.3, 0.12]],
  }),
  ...smoke(VALAKUT.x + 2, VALAKUT.y - VALAKUT.h, 6, 'valakut-smoke'),
]

// 고리의 봉우리 여섯 — 세계 지도 기호(crown-of-talib-*, 크기 0.5)와 같은 자리. 발라쿠트와 함께 고리 안쪽의 트인 땅을 두른다
const PEAKS = [
  { id: 'nw', x: 578.3, y: 473.3, hw: 38, h: 55 },
  { id: 'w', x: 538.3, y: 553.3, hw: 37, h: 51 },
  { id: 'sw', x: 568.3, y: 623.3, hw: 35, h: 49, gate: { phase4: false } }, // 사가2 — Valakut Predator 가 이 자리를 맡는다
  { id: 's', x: 668.3, y: 613.3, hw: 40, h: 56 },
  { id: 'se', x: 778.3, y: 603.3, hw: 37, h: 52 },
  { id: 'e', x: 808.3, y: 513.3, hw: 34, h: 53 },
]
const peakItems = PEAKS.map((p) => {
  const parts = volcano(p.x, p.y, p.hw, p.h, { seed: `peak-${p.id}`, cw: p.hw * 0.17, jag: 0.06, hatch: 4, gullies: [0.4], lava: [[p.id === 'w' || p.id === 'nw' ? 1 : -1, 0.34, 0.35]] })
  return { y: p.y, parts: p.gate ? parts.map((q) => ({ ...q, ...p.gate })) : parts }
})

// ---------------------------------------------------------------- 2. 덩굴 다리 — '덩굴 식물 다리로 이어진 작은 화산 지괴' (PG: Ondu). 자리는 이 지도의 해석:
// 북서쪽 봉우리와 발라쿠트 서쪽 비탈 사이, 남쪽 봉우리와 남동쪽 봉우리 사이
function vineBridge(a, b, sag, seed) {
  const rand = rng(seed)
  const n = 16
  const deck = []
  const rope = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const s = Math.sin(Math.PI * t)
    deck.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + sag * s])
    rope.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - 7 + sag * 0.78 * s])
  }
  let hatch = ''
  let leaves = ''
  for (let i = 1; i < n; i++) {
    const [dx, dy] = deck[i]
    const [rx, ry] = rope[i]
    hatch += line([[rx, ry], [dx, dy]]) // 매단 줄
    hatch += line([[dx - 0.6, dy - 1.6], [dx + 0.6, dy + 1.6]]) // 발판
    if (rand() < 0.55) {
      const l = 4 + rand() * 9
      hatch += `M${pt([dx, dy])}q${r1((rand() - 0.5) * 3)} ${r1(l * 0.5)} ${r1((rand() - 0.5) * 2)} ${r1(l)}` // 늘어진 덩굴
      leaves += ell(dx + (rand() - 0.5) * 2, dy + l, 1.9, 1.2)
    }
    if (rand() < 0.5) leaves += ell(rx + (rand() - 0.5) * 3, ry + (rand() - 0.5) * 1.5, 2.1, 1.3)
  }
  // 양 끝의 말뚝
  const posts = line([[a[0], a[1] + 2], [a[0], a[1] - 10]]) + line([[b[0], b[1] + 2], [b[0], b[1] - 10]])
  return [P('hatch', hatch), P('forest', leaves), P('ink', smooth(deck) + smooth(rope) + posts + leaves)]
}
const bridges = [...vineBridge([599, 446], [641, 414], 7, 'bridge-n'), ...vineBridge([692, 584], [756, 577], 9, 'bridge-s')]

// ---------------------------------------------------------------- 3. 피스톤 바위산 — 'smaller crags … hover in midair above the craggy mesas beneath … fly up and smash down'
// 세계 지도 기호(beyeen-piston-crag, 밑 898.3·493.3, 크기 0.5)의 떠 있는 바위를 같은 모양으로 키우고, 밑에 바위가 내려앉는 울퉁불퉁한 대지를 둔다.
// 대지와 그림자는 사가2 에서 Retreat to Valakut 의 비탈 밑에 들어 그리지 않는다 (phase4: false)
const crag = (() => {
  const k = 4.3
  const bx = 900
  const by = 482
  const T = (u, v) => [bx + u * k, by + v * k]
  const body = poly([[-6.5, -12], [-3, -13.2], [1, -12.5], [5.6, -13.3], [6.8, -11.8], [5.2, -10], [4.4, -8.4], [2.8, -7.6], [1.8, -5.2], [0.6, -3.4], [-0.5, -5.8], [-2.1, -6.9], [-3.2, -9], [-5.3, -10.1]].map(([u, v]) => T(u, v)))
  let hatch = `M${pt(T(-6.5, -12))}Q${pt(T(0, -10.7))} ${pt(T(6.8, -11.8))}`
  for (const [u, v, l] of [[1.4, -10.6, 3.4], [2.8, -10.7, 2.6], [4.2, -10.9, 1.8], [-1.2, -10.4, 2.2]]) hatch += line([T(u, v), T(u - 0.8, v + l)])
  hatch += `M${pt(T(-2.1, -6.9))}Q${pt(T(-2.6, -5.8))} ${pt(T(-2.2, -4.8))}M${pt(T(2.8, -7.6))}Q${pt(T(3.3, -6.6))} ${pt(T(3, -5.8))}`
  const tufts = line([T(-3.4, -12.8), T(-3.8, -14.2)]) + line([T(-3.4, -12.8), T(-3, -14.4)]) + line([T(2.4, -12.7), T(2.2, -14)]) + line([T(2.4, -12.7), T(2.9, -13.9)])
  const shade = poly([T(1.4, -11.2), T(5.6, -11.6), T(5.2, -10), T(4.4, -8.4), T(2.8, -7.6), T(1.8, -5.2), T(0.6, -3.4)])
  // 밑의 대지 — 평평한 윗면에 바위가 내려찍힌 우묵한 자리, 깨진 옆면
  const mx = 902
  const my = 495
  const top = [[mx - 27, my - 14], [mx - 20, my - 17], [mx - 8, my - 16], [mx + 6, my - 17.5], [mx + 18, my - 16], [mx + 27, my - 13]]
  const mesa = poly([[mx - 30, my], ...top, [mx + 30, my]])
  let mHatch = ''
  for (let x = mx + 8; x <= mx + 27; x += 4.5) mHatch += line([[x, my - 14], [x - 1, my - 2]])
  for (const x of [mx - 22, mx - 12]) mHatch += line([[x, my - 15], [x + 0.5, my - 6]])
  const mShade = poly([[mx + 6, my - 17.5], [mx + 18, my - 16], [mx + 27, my - 13], [mx + 30, my], [mx + 6, my]])
  const dent = ell(mx, my - 15.5, 9, 2.2)
  const P4 = (q) => ({ ...q, phase4: false })
  return [
    ...[P('fill', mesa), P('shade', mShade + dent), P('hatch', mHatch), P('ink', line([[mx - 30, my], ...top, [mx + 30, my]]) + dent)].map(P4),
    P('fill', body),
    P('shade', shade),
    P('hatch', hatch + tufts),
    P('ink-bold', body),
  ]
})()

// ---------------------------------------------------------------- 4. Boilbasin — 산비탈을 따라 바다 쪽으로 계단처럼 내려가는 김 나는 조수 웅덩이 셋
// (세계 지도 boilbasin-pool-upper·middle·lower 자리). 웅덩이마다 바다 쪽(서남서) 가장자리가 낮은 턱이 되고, 넘친 물이 다음 웅덩이로, 맨 아래는 바다로
function tidePool(cx, cy, rx, ry, seed, steamAt = [-0.45, 0.05, 0.5]) {
  const rand = rng(seed)
  const ring = []
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2
    const k = 0.9 + rand() * 0.16
    ring.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
  }
  const rim = ring.map(([x, y]) => [cx + (x - cx) * 1.16 + 0.5, cy + (y - cy) * 1.32 + 0.8])
  // 바다 쪽 턱 — 테두리의 남서쪽 반 바퀴 밑으로 떨어지는 바위 면
  const lip = []
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * 0.25 + (i / 8) * Math.PI * 0.85
    lip.push([cx + Math.cos(a) * rx * 1.16, cy + Math.sin(a) * ry * 1.32 + 0.8])
  }
  let steam = ''
  for (const [dx, hgt] of steamAt.map((d, i) => [d, [0.9, 1.25, 0.8][i]])) {
    const sx = cx + dx * rx
    const sy = cy - ry * 0.3
    const hh = (14 + rx * 0.7) * hgt
    steam += `M${pt([sx, sy])}C${pt([sx - 4, sy - hh * 0.3])} ${pt([sx + 4, sy - hh * 0.45])} ${pt([sx, sy - hh * 0.65])}C${pt([sx - 3.5, sy - hh * 0.8])} ${pt([sx + 3, sy - hh * 0.9])} ${pt([sx + 1, sy - hh])}`
  }
  const rip = `M${pt([cx - rx * 0.5, cy - ry * 0.1])}q${r1(rx * 0.22)} ${r1(-ry * 0.25)} ${r1(rx * 0.44)} 0M${pt([cx + rx * 0.05, cy + ry * 0.35])}q${r1(rx * 0.2)} ${r1(-ry * 0.22)} ${r1(rx * 0.4)} 0`
  return [
    ...KIT.cliff(lip, { depth: ry * 1.05, step: 5.5, seed: `${seed}-lip` }).filter((q) => q.cls !== 'ink-bold'),
    P('stone', smooth(rim, true)),
    P('sea', smooth(ring, true)),
    P('sea-ink', smooth(ring, true) + rip),
    P('ink', smooth(rim, true)),
    P('hatch', steam),
  ]
}
const POOLS = [
  [408.3, 493.3, 30, 10.5, 'pool-upper', [-0.05, 0.35, 0.72]], // 김은 Boilbasin 이름(표시 위)을 비켜 동쪽 반에서
  [298.3, 533.3, 25, 9, 'pool-middle'],
  [239, 567, 14, 5.5, 'pool-lower'],
]
const basin = [
  // 넘친 물 — 위 웅덩이에서 아래로, 맨 아래 웅덩이에서 바다로
  P('sea-ink', smooth([[378, 497], [362, 506], [345, 514], [331, 524], [322, 530]]) + smooth([[274, 538], [266, 547], [257, 556], [251, 564]]) + smooth([[226, 569], [221, 572], [217, 574]])),
  ...POOLS.flatMap(([x, y, rx, ry, s, steamAt]) => tidePool(x, y, rx, ry, s, steamAt)),
]

// ---------------------------------------------------------------- 5. 줄라포트 — 베이인 해안의 마을 (PG: Ondu 'a town called Zulaport'). 집의 수·모양, 골목, 동쪽 만의 나무 부두는 이 지도의 해석.
// 줄라포트 표시(898.3, 663.3)는 마을 가운데, 이름은 오른쪽(만 위). 서쪽 골목 끝은 Zulaport Cutthroat 의 자리
const HOUSES = [
  [886, 633, 18, 12, 'hip'],
  [905, 628, 15, 11, 'gable'],
  [922, 635, 14, 10, 'flat'],
  [938, 629, 12, 9, 'gable'],
  [885, 655, 13, 9, 'gable'],
  [916, 650, 14, 9, 'hip'],
]
// 남쪽(표시 밑)과 서쪽 골목 끝은 비운다 — Zulaport Cutthroat 와 그 이름 자리
const town = HOUSES.map(([x, y, w, h, roof]) => ({ y, parts: KIT.house(x, y, w, h, { roof, roofH: roof === 'flat' ? 0 : w * 0.42 }) }))
// 나무 부두 — 만 서쪽 기슭에서 동쪽으로
const jetty = (() => {
  const y0 = 637
  const x0 = 948
  const x1 = 985
  const deck = poly([[x0, y0 - 2.4], [x1, y0 - 2.4], [x1, y0 + 2.4], [x0, y0 + 2.4]])
  let hatch = ''
  for (let x = x0 + 4; x < x1; x += 4.2) hatch += line([[x, y0 - 2.4], [x, y0 + 2.4]])
  let posts = ''
  for (let x = x0 + 6; x <= x1; x += 10) posts += line([[x, y0 + 2.4], [x, y0 + 6]])
  return [P('fill', deck), P('hatch', hatch), P('ink', deck + posts), ...KIT.ripples(x1 + 6, y0 + 9, 9, 2, 'jetty-rip')]
})()
// 골목 — 부두에서 마을을 지나 서쪽 끝(남쪽 바닷가 쪽)으로
const lanes = [...dashed([[947, 640], [930, 645], [912, 655], [895, 667], [878, 676], [860, 684], [844, 692]], 5, 4)]

// ---------------------------------------------------------------- 6. 떠다니는 화산 유리 섬 — ROE 이후 발라쿠트가 거의 쉬지 않고 분화해 하늘로 솟은 용암 기둥이 굳은 것
// (The Art of Magic: Zendikar, 2016). 사가1 에서는 그리지 않는다 (phase: false). 수·자리·크기는 이 지도의 해석
function glassIslet(x, y, w, seed) {
  const rand = rng(seed)
  const top = [[x - w / 2, y], [x - w * 0.22, y - w * 0.13], [x + w * 0.2, y - w * 0.09], [x + w / 2, y + w * 0.03]]
  const under = [[x + w * 0.36, y + w * 0.22], [x + w * 0.14, y + w * 0.4], [x + (rand() - 0.5) * w * 0.1, y + w * 0.72], [x - w * 0.16, y + w * 0.38], [x - w * 0.4, y + w * 0.16]]
  const body = poly([...top, ...under])
  const facet = poly([[x + w * 0.2, y - w * 0.09], [x + w / 2, y + w * 0.03], [x + w * 0.36, y + w * 0.22], [x + w * 0.14, y + w * 0.4], [x + w * 0.05, y + w * 0.05]])
  const lines = line([[x - w * 0.22, y - w * 0.13], [x - w * 0.05, y + w * 0.08], [x, y + w * 0.7]]) + line([[x - w * 0.05, y + w * 0.08], [x + w * 0.2, y - w * 0.09]])
  // 떨어지는 날카로운 파편
  let shards = ''
  for (let i = 0; i < 3; i++) {
    const sx = x + (rand() - 0.5) * w * 0.9
    const sy = y + w * (0.85 + rand() * 0.5)
    const s = 1.6 + rand() * 1.6
    shards += poly([[sx, sy - s], [sx + s * 0.6, sy + s * 0.4], [sx - s * 0.5, sy + s * 0.5]])
  }
  return [P('stone', body), P('dark', facet + shards), P('hatch', lines), P('ink', body)].map((q) => ({ ...q, phase: false }))
}
const islets = [...glassIslet(634, 296, 26, 'glass-a'), ...glassIslet(797, 322, 19, 'glass-b'), ...glassIslet(662, 252, 14, 'glass-c')]

// ---------------------------------------------------------------- 지형 기호 칸
// 저지대 우림 — 세계 지도의 숲 영역(beyeen-rainforest) 그대로. 바다로 나간 부분은 아래 바다 빈터가 비운다
const RAINFOREST = [[448.3, 623.3], [558.3, 653.3], [668.3, 663.3], [768.3, 653.3], [828.3, 603.3], [858.3, 553.3], [928.3, 533.3], [1008.3, 533.3], [1078.3, 563.3], [1068.3, 623.3], [988.3, 653.3], [948.3, 713.3], [838.3, 723.3], [718.3, 713.3], [578.3, 713.3], [448.3, 703.3]]
// 고리 안쪽 — 세계 지도처럼 기호 없는 트인 땅 (beyeen-crown-basin)
const CROWN_BASIN = [[738.3, 533.3], [735.6, 548.9], [727.6, 563.3], [714.9, 575.8], [698.3, 585.3], [679, 591.3], [658.3, 593.3], [637.6, 591.3], [618.3, 585.3], [601.8, 575.8], [589, 563.3], [581.1, 548.9], [578.3, 533.3], [581.1, 517.8], [589, 503.3], [601.8, 490.9], [618.3, 481.4], [637.6, 475.4], [658.3, 473.3], [679, 475.4], [698.3, 481.4], [714.9, 490.9], [727.6, 503.3], [735.6, 517.8]]
// 그 밖의 섬 — 세계 지도처럼 산 기호: 우림의 북쪽 가장자리 위와 서쪽(Boilbasin 의 산비탈), 고리 안쪽은 짝홀 구멍으로 뺀다
const MOUNTAIN_OUT = [[150, 200], [1120, 200], [1120, 563.3], ...RAINFOREST.slice(0, 9).reverse(), [448.3, 703.3], [448.3, 800], [150, 800]]
const MOUNTAIN = withHoles(MOUNTAIN_OUT, [CROWN_BASIN])

// 바다 빈터 — 해안에서 24 단위 안쪽 고리 밖(바다와 바닷가)에 밑동이 떨어지는 기호는 늘 뺀다 (칸이 해안 밖으로 나가도 기호가 바다에 서지 않게)
const SEA = withHoles([[-60, -60], [W + 60, -60], [W + 60, H + 60], [-60, H + 60]], [insetRing(24)])
/** 손으로 그린 원뿔의 자리 — 원뿔과 그 앞(밑) 기호 높이만큼은 기호를 늘 뺀다 (원뿔 뒤에서 솟은 기호가 원뿔 앞에 선 것처럼 보이지 않게) */
const coneClear = (x, y, hw, h) => [[x - hw - 22, y + 40], [x - hw - 8, y - h * 0.3], [x - hw * 0.25, y - h - 6], [x + hw * 0.25, y - h - 6], [x + hw + 8, y - h * 0.3], [x + hw + 22, y + 40]].map(([a, b]) => [r1(a), r1(b)])

const LABELS = [
  { text: 'Beyeen', textKo: '베이인', at: [664, 499], size: 32, kind: 'area' },
  { text: 'Crown of Talib', at: [664, 539], size: 21, kind: 'area' },
]

/** 바로 이웃한 같은 칠(같은 페이즈 문)은 한 path 로 — 칠하는 차례는 그대로, 페이즈 문(phase…phase5)은 지킨다 */
function compact(list) {
  const out = []
  const gates = ['phase', 'phase2', 'phase3', 'phase4', 'phase5']
  for (const p of list) {
    if (!p.d) continue
    const last = out[out.length - 1]
    if (last && last.cls === p.cls && gates.every((g) => last[g] === p[g])) last.d += p.d
    else out.push({ cls: p.cls, d: p.d, ...Object.fromEntries(gates.filter((g) => p[g] !== undefined).map((g) => [g, p[g]])) })
  }
  return out
}

const parts = [
  ...basin,
  ...lanes,
  ...jetty,
  ...islets,
  ...stack([{ y: VALAKUT.y, parts: valakut }, ...peakItems, { y: 495, parts: crag }, ...town]),
  ...bridges,
]

CHILDMAPS.push({
  id: 'beyeen',
  size: [W, H],
  glyphScale: 4,
  terrain: [
    { kind: 'mountain', points: MOUNTAIN, density: 0.8 },
    { kind: 'forest', points: RAINFOREST, density: 1 },
  ],
  clearings: [
    { points: SEA },
    // 손으로 그린 것의 자리 — 늘 비운다
    { points: coneClear(VALAKUT.x, VALAKUT.y, VALAKUT.hw, VALAKUT.h) },
    ...PEAKS.map((p) => ({ points: coneClear(p.x, p.y, p.hw, p.h) })),
    { points: blob(902, 474, 46, 46) }, // 피스톤 바위산과 대지
    ...POOLS.map(([x, y, rx, ry]) => ({ points: blob(x, y - ry * 1.6, rx + 20, ry * 3.6 + 12) })), // 웅덩이와 김
    { points: [[852, 612], [950, 606], [956, 660], [945, 712], [870, 712], [852, 690]] }, // 줄라포트
    // 이름 자리 — 고리 안쪽의 두 이름, 표시 이름 (Boilbasin 위, Scalding Tarn 밑, Zulaport 오른쪽)
    { points: blob(664, 518, 110, 52) },
    { points: [[314, 456], [404, 456], [404, 494], [314, 494]] },
    { points: [[386, 540], [512, 540], [512, 580], [386, 580]] },
    { points: [[905, 648], [1002, 648], [1002, 680], [905, 680]] },
    // 사가2 페이즈1(BFZ) 대상의 빈터 — 그림과 밑의 이름
    { points: blob(846, 666, 36, 56), phase4: true }, // zulaport-cutthroat
    { points: blob(1030, 560, 38, 58), phase4: true }, // valakut-invoker
    // 세계 지도 그림(지역 상세가 나와도 그 위에 그대로 그려진다)과 밑의 이름 — 기호 밑동이 그림·이름 밑으로 들지 않게 밑으로 넉넉히
    { points: [[825, 466], [923, 466], [923, 528], [960, 528], [960, 600], [790, 600], [790, 528], [825, 528]], phase4: true }, // retreat-to-valakut (상자 845–903 × 473–528)
    { points: [[530, 610], [648, 610], [648, 666], [668, 666], [668, 735], [508, 735], [508, 666], [530, 666]], phase4: true }, // valakut-predator (상자 546–629 × 617–666)
  ],
  parts: compact(parts),
  labels: LABELS,
  subjects: {
    // 사가2 페이즈1 — Zulaport Cutthroat(BFZ): 줄라포트 서쪽 골목 끝, 남쪽 바닷가로 내려가는 길목의 밤거리 도적 (이 지도의 추정)
    'zulaport-cutthroat': { at: [845, 690], size: 70 },
    // 사가2 페이즈1 — Valakut Invoker(BFZ): 섬 동쪽 끝 곶, 피스톤 바위산과 줄라포트 사이의 빈 땅에서 서쪽의 발라쿠트를 본다 (이 지도의 추정)
    'valakut-invoker': { at: [1030, 588.3], size: 75 },
  },
  markAnchors: { valakut: 'right', zulaport: 'right', boilbasin: 'above', 'card:scalding-tarn': 'below' },
  focus: [700, 520],
})
