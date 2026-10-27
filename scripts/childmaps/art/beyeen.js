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
// 물길, 화산 유리 섬의 수·자리, 줄라포트의 집·골목·나무 부두, 그림들의 자리 — Zulaport Cutthroat 는 줄라포트 서쪽 골목 끝,
// Valakut Invoker 는 이름이 가리키는 발라쿠트의 서쪽 기슭(원뿔 서쪽 비탈과 북쪽 해안·북서쪽 봉우리 사이 — 북쪽은 바다, 동쪽 기슭은
// Valakut Predator, 남쪽 기슭은 고리 안쪽의 두 이름 자리라 남은 기슭)에서 동쪽의 원뿔을 본다 (모두 이 지도의 추정). 그 이름은 왼쪽
// (서쪽 바다 위, label: 'left') — 지역 상세가 처음 나오는 배율에서 그림 밑은 Valakut 표시 이름 자리에 막혀, 쪽을 두지 않으면 이름이
// 오른쪽(원뿔 서쪽 비탈과 용암 줄기 위)으로 밀린다.
// 사가2 의 세계 지도 그림(Retreat to Valakut — 고리 동쪽 기슭, Valakut Predator — 이름이 가리키는 발라쿠트 원뿔의 동쪽 기슭, 원뿔 동쪽
// 비탈 밑자락과 동쪽 작은 만 사이, 이름은 오른쪽 만 위, 사가2 페이즈2 의 Tyrant of Valakut — 분화구 기둥 바로 위의 바다 하늘)은 이 그림
// 위에 그대로 그려지므로 비켜 그린다: 그 자리와 이름 자리의 지형 기호를 사가2 에서 비우고(clearings, phase4: true), 피스톤 바위산 밑의
// 대지와 그림자는 Retreat to Valakut 의 비탈 밑에 들어 사가2 에서 그리지 않으며, 떠 있는 바위는 Valakut Predator 의 이름(오른쪽)이 지역
// 상세가 처음 나오는 배율에서 그 꼭대기에 얹히지 않게 사가2 에서 14 단위 낮게 그린다. Valakut Predator 는 원뿔의 밑자락에 걸쳐 서는데,
// 원뿔은 그 원소의 화산(발라쿠트 자체)이라 비키지 않는다.
// 사가1 의 세계 지도 그림(Claws of Valakut — 발라쿠트 서쪽 기슭, Valakut Fireboar — 발라쿠트 남동쪽 기슭, Cosi's Ravager·Searing Blaze·
// Zulaport Enforcer)도 그 위에 그대로 그려진다 — 이 그림에는 사가1 대상이 없다.
//
// 페이즈별 모습 — 줄라포트. 기본 지도(끔)와 사가1(2009–10)은 해안 마을이다('Before the rise of the Eldrazi, Zulaport was a small city on
// the coast of Beyeen', 아트북 2016). 사가2 페이즈1(BFZ 2015)은 Sky Rock 피난민이 'And what's to say that Zulaport won't be gone too once we
// get there?'라고 할 뿐 그 무렵 모습이 밝혀지지 않아 지금 그림 그대로 둔다. 사가2 페이즈2(OGW 2016)에서는 조리 엔이 'Old Zulaport, that
// is, when it was still on the coast.'라 하고(Beneath the Surface), 아트북은 엘드라지가 몰고 온 큰 해일이 도시를 삼켰고 'Merfolk came to
// the city's aid, and Zulaport was reestablished as a floating community'라 쓴다 — 그래서 그 페이즈에서는 해안 마을의 집·나무 부두·골목을
// 그리지 않고(phase5: false), 옛 자리에 부러진 기둥·널빤지·잔돌과 만에 남은 부두 말뚝 셋(5-1)을 아주 작게, 줄라포트 표시 바로 앞(남쪽)
// 바다에 통나무 뗏목 다섯을 부교로 엮고 작은 집을 올린 떠 있는 마을과 뗏목을 미는 인어 둘(5-2)을 그린다(phase5: true). 떠 있는 마을의
// 자리·모양, 남은 잔해의 수·자리, 인어의 자리는 공식 자료에 없어 이 지도의 해석이다. 줄라포트 표시는 세계 지도 표시라 옛 자리에
// 그대로 두고, 떠 있는 마을을 그 바로 앞바다에 두어 표시가 그 마을을 가리키게 했다. 그 페이즈의 Zulaport Chainmage 는 떠 있는 마을
// 서쪽 끝 뗏목에 서고, Zulaport Cutthroat(BFZ)는 해안 마을의 골목 끝 사람이라 사가2 페이즈1 까지만 그린다(phase4.ts 의 until: 1 —
// 그 빈터는 phase5: false 로 페이즈2 에 우림 기호를 되돌린다).

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
  // 사가2 페이즈2 에서는 분화구 위에 Tears of Valakut 의 용암 기둥이 서므로 연기는 그리지 않는다 (phase5: false)
  ...smoke(VALAKUT.x + 2, VALAKUT.y - VALAKUT.h, 6, 'valakut-smoke').map((q) => ({ ...q, phase5: false })),
]

// 고리의 봉우리 여섯 — 세계 지도 기호(crown-of-talib-*, 크기 0.5)와 같은 자리. 발라쿠트와 함께 고리 안쪽의 트인 땅을 두른다
const PEAKS = [
  { id: 'nw', x: 578.3, y: 473.3, hw: 38, h: 55 },
  { id: 'w', x: 538.3, y: 553.3, hw: 37, h: 51 },
  { id: 'sw', x: 568.3, y: 623.3, hw: 35, h: 49 },
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
// 사가2 에서는 떠 있는 바위를 14 단위 낮게(내려찍으러 내려오는 중으로) 그린다 — 발라쿠트 동쪽 기슭에 선 Valakut Predator 세계 지도
// 그림의 이름(오른쪽)이 지역 상세가 처음 나오는 배율에서 바위 꼭대기에 얹히지 않게 (손그림은 자리가 정확한 대상을 비킨다).
// 낮춘 바위의 밑 끝(902.6, 481.4)은 Retreat to Valakut 그림의 연기·지붕보다 높고 그 오른쪽이다
// 사가1 페이즈3 에서는 거꾸로 30 단위 높게(솟아오른 중으로) 그린다 — 발라쿠트 남동쪽 기슭의 Valakut Fireboar 세계 지도 그림의 이름(오른쪽)이
// 지역 상세가 처음 나오는 배율에서 떠 있는 바위 몸통을 가로지른다. 높인 바위의 밑 끝(약 437)은 그 이름 위다 (높이는 이 지도의 해석)
const crag = (() => {
  const k = 4.3
  const bx = 900
  const by = 482
  const rock = (dy) => {
    const T = (u, v) => [bx + u * k, by + dy + v * k]
    const body = poly([[-6.5, -12], [-3, -13.2], [1, -12.5], [5.6, -13.3], [6.8, -11.8], [5.2, -10], [4.4, -8.4], [2.8, -7.6], [1.8, -5.2], [0.6, -3.4], [-0.5, -5.8], [-2.1, -6.9], [-3.2, -9], [-5.3, -10.1]].map(([u, v]) => T(u, v)))
    let hatch = `M${pt(T(-6.5, -12))}Q${pt(T(0, -10.7))} ${pt(T(6.8, -11.8))}`
    for (const [u, v, l] of [[1.4, -10.6, 3.4], [2.8, -10.7, 2.6], [4.2, -10.9, 1.8], [-1.2, -10.4, 2.2]]) hatch += line([T(u, v), T(u - 0.8, v + l)])
    hatch += `M${pt(T(-2.1, -6.9))}Q${pt(T(-2.6, -5.8))} ${pt(T(-2.2, -4.8))}M${pt(T(2.8, -7.6))}Q${pt(T(3.3, -6.6))} ${pt(T(3, -5.8))}`
    const tufts = line([T(-3.4, -12.8), T(-3.8, -14.2)]) + line([T(-3.4, -12.8), T(-3, -14.4)]) + line([T(2.4, -12.7), T(2.2, -14)]) + line([T(2.4, -12.7), T(2.9, -13.9)])
    const shade = poly([T(1.4, -11.2), T(5.6, -11.6), T(5.2, -10), T(4.4, -8.4), T(2.8, -7.6), T(1.8, -5.2), T(0.6, -3.4)])
    return [P('fill', body), P('shade', shade), P('hatch', hatch + tufts), P('ink-bold', body)]
  }
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
    ...rock(0).map((q) => ({ ...q, phase3: false, phase4: false })),
    ...rock(-30).map((q) => ({ ...q, phase3: true })),
    ...rock(14).map((q) => ({ ...q, phase4: true })),
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
// 줄라포트 표시(898.3, 663.3)는 마을 가운데, 이름은 오른쪽(만 위). 서쪽 골목 끝은 Zulaport Cutthroat 의 자리.
// 사가2 페이즈2(OGW 2016) 무렵 이 해안 마을은 해일에 삼켜지고 없었다 — 집·부두·골목은 그 페이즈에서 그리지 않고(phase5: false), 5-1·5-2 를 그린다
const OLD = (q) => ({ ...q, phase5: false })
const HOUSES = [
  [886, 633, 18, 12, 'hip'],
  [905, 628, 15, 11, 'gable'],
  [922, 635, 14, 10, 'flat'],
  [938, 629, 12, 9, 'gable'],
  [885, 655, 13, 9, 'gable'],
  [916, 650, 14, 9, 'hip'],
]
// 남쪽(표시 밑)과 서쪽 골목 끝은 비운다 — Zulaport Cutthroat 와 그 이름 자리
const town = HOUSES.map(([x, y, w, h, roof]) => ({ y, parts: KIT.house(x, y, w, h, { roof, roofH: roof === 'flat' ? 0 : w * 0.42 }).map(OLD) }))
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
  return [P('fill', deck), P('hatch', hatch), P('ink', deck + posts), ...KIT.ripples(x1 + 6, y0 + 9, 9, 2, 'jetty-rip')].map(OLD)
})()
// 골목 — 부두에서 마을을 지나 서쪽 끝(남쪽 바닷가 쪽)으로
const lanes = [...dashed([[947, 640], [930, 645], [912, 655], [895, 667], [878, 676], [860, 684], [844, 692]], 5, 4)].map(OLD)

// ---------------------------------------------------------------- 5-1. 해일이 쓸고 간 옛 줄라포트 — 사가2 페이즈2 에만 (phase5: true)
// 'Old Zulaport, that is, when it was still on the coast.'(Beneath the Surface, 2016) · 'swallowed Zulaport beneath a great tsunami'(아트북, 2016).
// 남은 것(집터의 부러진 기둥 몇, 쓰러진 널빤지, 잔돌, 만에 남은 부두 말뚝 셋)의 수·모양·자리는 이 지도의 해석 — 아주 작게, Zulaport 이름(표시 오른쪽) 위로만
const NEW = (q) => ({ ...q, phase5: true })
/** 부러진 기둥 — 해일에 쓸려 간 집·부두의 밑동. (x, y) 는 밑 가운데, h 는 남은 높이. wet 이면 물에 선 말뚝(밑에 잔물결) */
function stump(x, y, w, h, seed, wet = false) {
  const rand = rng(seed)
  const top = [[x - w / 2, y - h * (0.62 + rand() * 0.3)], [x - w * 0.12, y - h * (0.5 + rand() * 0.25)], [x + w * 0.12, y - h], [x + w / 2, y - h * (0.55 + rand() * 0.3)]]
  const body = poly([[x - w / 2, y], ...top, [x + w / 2, y]])
  const side = poly([[x + w * 0.12, y], [x + w * 0.12, y - h * 0.5], [x + w / 2, top[3][1]], [x + w / 2, y]])
  const parts = [P('fill', body), P('shade', side), P('ink', body)]
  if (wet) parts.push(P('sea-ink', `M${pt([x - w * 1.9, y + 0.5])}q${r1(w * 0.7)} ${r1(-0.9)} ${r1(w * 1.4)} 0M${pt([x + w * 0.5, y + 0.5])}q${r1(w * 0.7)} ${r1(-0.9)} ${r1(w * 1.4)} 0`))
  return parts
}
/** 쓰러진 널빤지 — 가운데 (x, y), 길이 len, 기울기 rot(도) */
function plank(x, y, len, rot) {
  const c = Math.cos((rot * Math.PI) / 180)
  const s = Math.sin((rot * Math.PI) / 180)
  const T = ([u, v]) => [x + u * c - v * s, y + u * s + v * c]
  const d = poly([[-len / 2, -0.8], [len / 2, -0.8], [len / 2, 0.8], [-len / 2, 0.8]].map(T))
  return [P('fill', d), P('ink', d)]
}
const wreck = [
  { y: 634, parts: [...stump(881, 634, 2.4, 6, 'wreck-a'), ...stump(886.5, 635, 2, 4, 'wreck-b'), ...plank(893, 637.5, 9, -12)] },
  { y: 629, parts: [...stump(906, 629, 2.4, 5.5, 'wreck-c'), ...KIT.rocks(913, 630.5, 2.4, 2, 'wreck-r1')] },
  { y: 631, parts: [...KIT.rocks(926, 633, 2.6, 2, 'wreck-r2'), ...stump(936, 631, 2.2, 5, 'wreck-d'), ...stump(941, 632, 2.2, 7, 'wreck-e'), ...plank(931, 640, 7, 18)] },
  // 만에 남은 부두 말뚝 — 옛 부두 기둥(954·964·974·984) 가운데 셋
  { y: 642, parts: [954, 964, 984].flatMap((x, i) => stump(x, 642.5, 2, 4.5 + i, `pile-${x}`, true)) },
].map((it) => ({ y: it.y, parts: it.parts.map(NEW) }))

// ---------------------------------------------------------------- 5-2. 떠 있는 줄라포트 — 사가2 페이즈2 에만 (phase5: true)
// 'Merfolk came to the city's aid, and Zulaport was reestablished as a floating community'(아트북, 2016). 자리·모양은 공식 자료에 없다 —
// 이 지도는 줄라포트 표시 바로 앞(남쪽) 바다에 통나무 뗏목 다섯을 부교로 엮고 작은 집을 올린 무리로 그리고, 뗏목 가에서 미는 인어 둘을 둔다.
// 서쪽 끝 뗏목은 Zulaport Chainmage 가 선 자리라 비워 둔다 (모두 이 지도의 해석)
/** 뗏목 — 통나무를 엮은 발판. (x, y) 는 앞 가장자리 가운데(물에 닿는 선), w 너비, d 윗면 깊이(비스듬히 내려다본 꼴) */
function raft(x, y, w, d) {
  const L = x - w / 2
  const R = x + w / 2
  const k = d * 0.35
  const top = poly([[L, y], [L + k, y - d], [R - k, y - d], [R, y]])
  const front = poly([[L, y], [R, y], [R - 0.5, y + 2.4], [L + 0.5, y + 2.4]])
  const n = Math.max(3, Math.round(w / 3.4))
  let logs = ''
  for (let i = 1; i < n; i++) {
    const t = i / n
    logs += line([[L + k + (w - 2 * k) * t, y - d + 0.5], [L + w * t, y - 0.3]]) // 통나무 사이 — 뒤에서 앞으로
    logs += line([[L + w * t, y + 0.4], [L + w * t, y + 2]]) // 앞면의 통나무 마구리
  }
  // 물에 닿는 선 — 앞면 밑의 짧은 잔물결 둘
  const wl = y + 4.4
  let rip = ''
  for (const [a, b] of [[L - 2.5, L + w * 0.32], [L + w * 0.6, R + 3]]) rip += `M${pt([a, wl])}q${r1((b - a) / 4)} ${r1(-1.1)} ${r1((b - a) / 2)} 0t${r1((b - a) / 2)} 0`
  return [P('fill', top), P('shade', front), P('hatch', logs), P('ink', top + front), P('sea-ink', rip)]
}
/** 부교 — 두 뗏목을 잇는 좁은 널다리, 가운데에 통 부표 하나. a → b */
function walkway(a, b, wid = 2.6) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1])
  const ux = (b[0] - a[0]) / len
  const uy = (b[1] - a[1]) / len
  const nx = (-uy * wid) / 2
  const ny = (ux * wid) / 2
  const deck = poly([[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]])
  let ticks = ''
  for (let s = 1.8; s < len - 1; s += 2.2) ticks += line([[a[0] + ux * s + nx, a[1] + uy * s + ny], [a[0] + ux * s - nx, a[1] + uy * s - ny]])
  const mx = (a[0] + b[0]) / 2
  const my = (a[1] + b[1]) / 2 + 1.4
  const buoy = ell(mx, my, wid * 0.9, 1.3)
  return [P('stone', buoy), P('ink', buoy), P('fill', deck), P('hatch', ticks), P('ink', deck)]
}
/** 인어 — 허리까지 물 위로 나와 두 팔을 뻗어 뗏목을 밀고, 몸 뒤로 갈래 꼬리가 물 위에 솟는다. (x, y) 는 몸이 물에 드는 자리, s: 1 동쪽을 본다·-1 서쪽, reach: 손이 닿는 점 */
function merfolk(x, y, s, reach) {
  const Q = (u, v) => [x + u * s, y + v]
  const torso = poly([Q(-1.5, 0), Q(-2.1, -3), Q(-2.9, -5.6), Q(-2.4, -6.7), Q(-0.8, -7.3), Q(0.8, -7.3), Q(2.5, -6.7), Q(2.8, -5.6), Q(2.1, -3), Q(1.5, 0)])
  const head = ell(x + 0.3 * s, y - 9.2, 1.7, 1.9)
  const crest = poly([Q(-0.8, -10.8), Q(-3.6, -11.7), Q(-2.7, -10.4), Q(-3.8, -9.6), Q(-2.5, -9), Q(-3.1, -8.1), Q(-1.2, -8.4)]) // 머리 뒤로 누운 지느러미 볏
  const tail = poly([Q(-5.3, 0.3), Q(-6.1, -2.2), Q(-5.5, -4.6), Q(-4.3, -6.8), Q(-6.3, -5.6), Q(-7.4, -4.6), Q(-9.8, -6.2), Q(-8.8, -3.6), Q(-7.6, -2), Q(-7.4, 0.3)])
  /** 팔 — 어깨에서 손까지 가늘어지는 띠, 팔꿈치가 조금 처진다 */
  const arm = (sh, hand) => {
    const len = Math.hypot(hand[0] - sh[0], hand[1] - sh[1]) || 1
    const nx = -(hand[1] - sh[1]) / len
    const ny = (hand[0] - sh[0]) / len
    const m = [(sh[0] + hand[0]) / 2 + Math.abs(nx) * 0.2, (sh[1] + hand[1]) / 2 + 0.7]
    const at = (p, w) => [[p[0] + nx * w, p[1] + ny * w], [p[0] - nx * w, p[1] - ny * w]]
    const [a1, a2] = at(sh, 0.7)
    const [m1, m2] = at(m, 0.55)
    const [h1, h2] = at(hand, 0.45)
    return poly([a1, m1, h1, h2, m2, a2])
  }
  const arms = arm(Q(1.4, -5.5), [reach[0], reach[1] + 1.5]) + arm(Q(2.2, -6.5), reach)
  const shade = poly([[x + 0.4, y], [x + 0.5, y - 7.2], [x + 1.6, y - 7.1], [x + 2.6, y - 6], [x + 2.1, y - 3], [x + 1.5, y]])
  const ribs = line([Q(-1.1, -10.4), Q(-3.2, -11.2)]) + line([Q(-1.2, -9.3), Q(-3.4, -9.6)]) + line([Q(-6.6, -1.2), Q(-6.6, -4.2)])
  const rip = `M${pt(Q(-4, 0.8))}q${r1(1.6 * s)} -1 ${r1(3.2 * s)} 0M${pt(Q(1.6, 0.8))}q${r1(1.6 * s)} -1 ${r1(3.2 * s)} 0M${pt(Q(-9.8, 0.8))}q${r1(1.5 * s)} -0.9 ${r1(3 * s)} 0t${r1(3 * s)} 0`
  return [P('fill', tail + torso + head + crest + arms), P('shade', shade), P('hatch', ribs), P('ink', tail + torso + crest + head + arms), P('sea-ink', rip)]
}
// 뗏목 — 뒤(위)에서 앞(아래)으로. [가운데 x, 앞 가장자리 y, 너비, 깊이, 집들 [x, 너비, 높이, 지붕]]
const RAFTS = [
  [884, 744, 22, 6, [[884, 10, 7, 'gable']]],
  [944, 746, 30, 7, [[937.5, 10, 7, 'flat'], [950, 9, 6.5, 'gable']]],
  [902, 762, 46, 9, [[889, 11, 8, 'gable'], [903, 12, 9, 'hip'], [916.5, 10, 7, 'gable']]],
  [921, 779, 34, 8, [[929, 11, 8, 'hip']]],
  [860, 787, 40, 8, [[874, 9, 6, 'gable']]], // 서쪽 끝 — 왼쪽 반은 Zulaport Chainmage 가 선다
]
const floating = [
  ...RAFTS.map(([x, y, w, d, houses]) => ({
    y,
    parts: [...raft(x, y, w, d), ...stack(houses.map(([hx, hw, hh, roof]) => ({ y: y - d * 0.32, parts: KIT.house(hx, y - d * 0.32, hw, hh, { roof, roofH: roof === 'flat' ? 0 : hw * 0.42 }) })))],
  })),
  { y: 744.1, parts: walkway([888, 744.5], [890, 753.4]) },
  { y: 746.1, parts: walkway([923, 754], [932.5, 746.5]) },
  { y: 762.1, parts: walkway([913, 762.6], [912, 771.3]) },
  { y: 762.2, parts: walkway([882, 762.6], [877, 779.3]) },
  { y: 748.2, parts: merfolk(966.5, 748.2, -1, [959.6, 745]) },
  { y: 781.2, parts: merfolk(946, 781.2, -1, [938.6, 777.6]) },
].map((it) => ({ y: it.y, parts: it.parts.map(NEW) }))

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
    if (last && last.cls === p.cls && gates.every((g) => last[g] === p[g]) && KIT.sameTimeKeys(last, p)) last.d += p.d
    else out.push({ cls: p.cls, d: p.d, ...Object.fromEntries(gates.filter((g) => p[g] !== undefined).map((g) => [g, p[g]])), ...KIT.timeKeysOf(p) })
  }
  return out
}

// 시점별 보기 — Zulaport Cutthroat 를 2016년(시점 4)에 옮긴 자리(792, 840 — 떠 있는 줄라포트의 서쪽 끝 뗏목 남서쪽) 밑의 뗏목 하나 (그 시점에만 — timeOnly).
// 떠 있는 마을에 딸린 작은 뗏목으로, 도적은 그 뒤 가장자리에 선다. 뗏목의 수·자리는 이 지도의 해석
const cutthroatRaft = raft(792, 848, 30, 6.5).map((q) => ({ ...q, timeOnly: true, time: { t4: true } }))

const parts = [
  ...basin,
  ...lanes,
  ...jetty,
  ...islets,
  ...stack([{ y: VALAKUT.y, parts: valakut }, ...peakItems, { y: 495, parts: crag }, ...town, ...wreck, ...floating]),
  ...bridges,
  ...cutthroatRaft,
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
    // 사가3 페이즈1(ZNR) 커먼 대상의 빈터 (그림과 이름 자리)
    { points: [[1063, 646], [1121, 646], [1121, 697], [1161, 697], [1161, 733], [1023, 733], [1023, 697], [1063, 697]], phase6: true }, // shell-shield — 그림 x ≈ 1067–1117 · y ≈ 650–695, 밑 이름 x ≈ 1023–1161 · y ≈ 697–733
    { points: [[623, 640], [807, 640], [807, 619], [875, 619], [875, 697], [807, 697], [807, 676], [623, 676]], phase6: true }, // zulaport-duelist — 그림 x ≈ 811–871 · y ≈ 623–693, 왼쪽 이름 x ≈ 623–807 · y ≈ 640–676
    // 사가3 페이즈1(ZNR) 언커먼 — 그림과 이름 자리
    { points: [[618,724], [696,724], [696,805], [720,805], [720,841], [594,841], [594,805], [618,805]], phase6: true }, // beyeen-veil — 그림 x ≈ 622–692 · y ≈ 728–803, 밑 이름 x ≈ 594–720 · y ≈ 805–841
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
    // 사가2 페이즈1(BFZ) 대상의 빈터 — 그림과 밑의 이름. Zulaport Cutthroat 는 페이즈1까지만 그린다(phase4.ts 의 until: 1 — 페이즈2 무렵 해안 마을은 해일에 삼켜졌다)
    // 그 빈터는 phase5: false 로 페이즈2(OGW)에 우림 기호를 되돌린다
    { points: blob(846, 666, 36, 56), phase4: true, phase5: false }, // zulaport-cutthroat
    { points: blob(582, 364, 36, 46), phase4: true }, // valakut-invoker (발라쿠트 서쪽 기슭 — 그림 x ≈ 555–610 · y ≈ 306–381 과 그 밑. 이름은 왼쪽 바다 위라 바다 빈터가 비운다)
    // 세계 지도 그림(지역 상세가 나와도 그 위에 그대로 그려진다)과 밑의 이름 — 기호 밑동이 그림·이름 밑으로 들지 않게 밑으로 넉넉히
    { points: [[825, 466], [923, 466], [923, 528], [960, 528], [960, 600], [790, 600], [790, 528], [825, 528]], phase4: true }, // retreat-to-valakut (상자 845–903 × 473–528)
    // valakut-predator (발라쿠트 동쪽 기슭 — 상자 733–817 × 396–445, 이름은 오른쪽: 만 위에서 동쪽 곶 북쪽 끝까지 x ≈ 828–995 · y ≈ 408–433)
    { points: [[726, 390], [826, 390], [826, 400], [1000, 400], [1000, 448], [826, 448], [826, 466], [726, 466]], phase4: true }, // valakut-predator
    // 사가2 페이즈2(OGW) 대상의 빈터 — 분화구 위로 솟는 용암 기둥 뒤 곶의 산 기호
    { points: blob(708, 258, 42, 58), phase5: true }, // tears-of-valakut (기둥 x ≈ 683–733 · y ≈ 214–308)
    // Zulaport Chainmage(OGW 커먼)는 떠 있는 줄라포트의 서쪽 끝 뗏목(바다 위)에 서므로 빈터가 필요 없다 — 바다 빈터(SEA)가 늘 비운다
    // 사가3 페이즈1(ZNR) 레어 — 그림과 이름 자리 (세계 지도 그림은 이 범위에 드는 그림과 이름 자리)
    { points: [[328,320], [545,320], [545,308], [620,308], [620,377], [545,377], [545,366], [328,366]], phase6: true }, // valakut-awakening
    { points: [[457,572], [540,572], [540,654], [620,654], [620,703], [376,703], [376,654], [457,654]], phase6: true }, // valakut-exploration
    { points: [[350, 600], [536, 600], [536, 686], [350, 686]], movedFor: ['cosis-ravager'] }, // cosis-ravager — 시점별 보기에서 시점 3·4 에 이 그림에 옮겨 그리는 세계 지도 그림의 자리 (그림 x 439–531 · y 607–659, 밑·왼쪽 이름까지 — 남서쪽 숲 가, 화산 원뿔 서쪽)
    { points: [[383, 646], [569, 646], [569, 732], [383, 732]], movedFor: ['cosis-ravager'] }, // cosis-ravager — 시점별 보기에서 시점 5 에 이 그림에 옮겨 그리는 세계 지도 그림의 자리 (시점 3·4 의 자리를 남동쪽으로 — Valakut Exploration 을 비켜, 화산 원뿔 남쪽 숲 가)
    { points: [[995, 624], [1303, 624], [1303, 706], [995, 706]], movedFor: ['zulaport-chainmage'] }, // zulaport-chainmage — 시점별 보기에서 시점 1·2·3·5 에만 옮긴 자리 · 2a (그림 x 1001–1043 · y 630–700, 오른쪽 이름까지 — 해안 마을 동쪽 곶)
    { points: [[509, 621], [759, 621], [759, 754], [509, 754]], movedFor: ['zulaport-cutthroat'] }, // zulaport-cutthroat — 시점별 보기에서 시점 1·2·5 에만 옮긴 자리 · 2a (그림 x 584–634 · y 627–697, 밑 이름까지 — Zulaport Enforcer 서쪽 숲 가, 그 밑 이름을 비켜)
    { points: [[525, 767], [824, 767], [824, 849], [525, 849]], movedFor: ['zulaport-cutthroat'] }, // zulaport-cutthroat — 시점별 보기에서 시점 4 에만 옮긴 자리 · 2a (그림 x 768–818 · y 773–843, 왼쪽 이름까지 — 떠 있는 줄라포트 뗏목 남서쪽 — Zulaport Chainmage 의 왼쪽 이름 밑)
    { points: [[428, 388], [536, 388], [536, 490], [428, 490]], movedFor: ['valakut-invoker'] }, // valakut-invoker — 시점별 보기에서 시점 1·5 에만 옮긴 자리 · 2a (그림 x 454–509 · y 410–485, 위 이름까지 — Boilbasin 웅덩이 동쪽 북쪽 해안 — Claws of Valakut 와 그 이름, Crown of Talib 이름을 비켜)
    { points: [[370, 479], [592, 479], [592, 551], [370, 551]], movedFor: ['valakut-invoker'] }, // valakut-invoker — 시점 5 에는 같은 자리에서 이름을 밑에 달아, 그 이름 자리를 더 뺀다 (다른 시점에는 그림 곁의 빈 자리)
  ],
  parts: compact(parts),
  labels: LABELS,
  subjects: {
    // 사가3 페이즈1(ZNR) 커먼 — 대상 (자리는 phase6.ts 의 estimate)
    'shell-shield': { at: [1091.7, 691.7], size: 50 },
    'zulaport-duelist': { at: [845, 690], size: 70, label: 'left' },
    // 사가3 페이즈1(ZNR) 언커먼 — Beyeen Veil (자리는 phase6.ts 의 estimate)
    'beyeen-veil': { at: [658.33, 800], size: 75 },
    // 사가2 페이즈1 — Zulaport Cutthroat(BFZ): 줄라포트 서쪽 골목 끝, 남쪽 바닷가로 내려가는 길목의 밤거리 도적 (이 지도의 추정)
    'zulaport-cutthroat': { at: [845, 690], size: 70, moved: { 1: { at: [608, 694] }, 2: { at: [608, 694] }, 4: { at: [792, 840], label: 'left' }, 5: { at: [608, 694] } } },
    // 사가2 페이즈1 — Valakut Invoker(BFZ): 발라쿠트 원뿔의 서쪽 기슭, 북서쪽 봉우리와 북쪽 해안 사이에서 동쪽의 원뿔을 본다 (이 지도의 추정 —
    // 사가1 에서는 같은 이름을 단 Claws of Valakut 세계 지도 그림이 쓰는 자리다). 그림은 서쪽을 보고 그려져 있어 뒤집는다.
    // 이름은 왼쪽 서쪽 바다 위 — 그림 밑은 Valakut 표시 이름 자리에 막혀, 쪽을 두지 않으면 원뿔 서쪽 비탈 위(오른쪽)로 밀린다
    'valakut-invoker': { at: [582, 372], size: 75, flip: true, label: 'left', moved: { 1: { at: [482, 476], label: 'above' }, 5: { at: [481.7, 475.8], label: 'below' } } },
    // 사가2 페이즈2 — Tears of Valakut(OGW): 발라쿠트 분화구(원뿔 꼭대기 y ≈ 308)에서 곧게 솟아 흩어져 떨어지는 용암 기둥 (모양은 이 지도의 해석)
    // 이름은 오른쪽(label 'right', 동쪽 바다 위) — 밑에 달면 지역 상세가 나오는 배율마다 발라쿠트 원뿔과 그 용암 줄기 위에 얹힌다
    'tears-of-valakut': { at: [708, 304], size: 90, label: 'right' },
    // 사가2 페이즈2 — Zulaport Chainmage(OGW): 해일 뒤 떠 있는 줄라포트(5-2)의 서쪽 끝 뗏목에 서서 동쪽의 뗏목 집들을 보는 쇠사슬 주술사 (이 지도의 추정)
    // 이름은 왼쪽(label 'left', 서쪽 바다 위) — 밑에 달면 깊은 배율(tier 8)에서 그녀가 선 뗏목의 앞 모서리와 집 얹은 뗏목에 걸린다
    'zulaport-chainmage': { at: [850, 783.3], size: 70, label: 'left', moved: { 1: { at: [1030, 698], label: 'right' }, 2: { at: [1030, 698], label: 'right' }, 3: { at: [1030, 698], label: 'right' }, 5: { at: [1030, 698], label: 'right' } } },
    // 사가3 페이즈1(ZNR) 레어 — Valakut Awakening (자리는 phase6.ts 의 estimate)
    'valakut-awakening': { at: [581.7, 371.7], size: 66.7, flip: true, label: 'left' },
    // 사가3 페이즈1(ZNR) 레어 — Valakut Exploration (자리는 phase6.ts 의 estimate)
    'valakut-exploration': { at: [485, 639.2], size: 75 },
  },
  markAnchors: { valakut: 'right', zulaport: 'right', boilbasin: 'above', 'card:scalding-tarn': 'below' },
  focus: [700, 520],
})
