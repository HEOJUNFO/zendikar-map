// Tal Terig — 자식 지도 (아쿰 북부, 세계 범위 x 1674.4–1842.4 · y 250.6–394.6, ×6.946).
// 탑은 마지막 공식 묘사(PG: Akoum 2010, The Art of Magic: Zendikar 2016)의 모습으로 그린다: 크고 작은 기하 도형
// (튀어나온 작은 정육면체, 한 변 20피트의 거대한 정사면체)을 아무렇게나 쌓은 듯한 기둥, 논리를 거스르는 각도.
// 땅 위로 드러난 것은 탑의 작은 일부라 밑동은 결정과 돌에 묻혀 있다. 문·창·흉벽·지붕·받침은 없다 (묘사에 없다).
// 2016년 이후 모습은 알려지지 않았다. 둘레는 지도의 기준 시대(ZNR 이후): 가시지대(Spikefield Hazard·Akoum Hellhound)와
// 아쿰의 이빨(Akoum Teeth).
// 해석(공식 자리·모양 없음): 두 산줄기와 결정 가시 무리의 배치, Raging Ravine 골짜기의 모양, 가시 지붕 굴 하나,
// 이름 없는 점선 길 하나, 그림 아홉의 자리 — 탑을 둘러싼 함정 여섯(Summoning·Arrow Volley·Archive·Lavaball·Runeflare·Inferno),
// 탑 서쪽 발치의 함정 장인(Trapmaker's Snare), 탑 남서쪽 결정 들판의 Hellfire Mongrel (아쿰 지옥견 '가시지대를 돌아다니며'),
// 탑 북서쪽 기복 끝 봉우리의 Burst Lightning (PG: Akoum 이 Tal Terig 절에 설명 없이 실은 그림 — 그 자리는 이 지도의 판단).

const { line, poly, smooth, rng, offset, along, stack } = KIT
const r1 = (v) => Math.round(v * 10) / 10
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`
const P = (cls, d) => ({ cls, d })
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// ---------------------------------------------------------------- 바다와 해안 (세계 지도 해안선 그대로)
// context.mjs 가 주는 해안선 (자식 지도 좌표, 동→서) — 앱이 그리는 해안과 같다
const COAST = [[1196,329],[1187,333],[1179,336],[1171,339],[1164,341],[1158,343],[1152,344],[1146,345],[1140,345],[1135,344],[1130,344],[1125,344],[1120,345],[1114,346],[1109,348],[1104,350],[1099,353],[1094,356],[1087,357],[1079,356],[1069,353],[1058,348],[1045,341],[1032,332],[1016,320],[1000,307],[984,295],[971,286],[959,278],[948,273],[938,269],[930,268],[924,269],[918,272],[913,274],[908,276],[902,276],[897,275],[891,273],[885,270],[879,267],[873,262],[867,258],[861,255],[855,253],[849,252],[843,252],[837,252],[832,254],[827,256],[821,257],[816,257],[810,256],[804,254],[798,250],[791,246],[784,240],[777,232],[768,225],[759,217],[748,210],[736,202],[723,194],[708,186],[693,178],[676,170],[660,163],[646,158],[633,154],[622,151],[611,149],[602,149],[595,149],[588,151],[582,154],[575,157],[568,160],[560,165],[552,170],[545,176],[537,182],[529,190],[519,195],[509,198],[497,200],[484,198],[470,195],[454,189],[438,181],[420,171],[404,162],[391,154],[379,147],[369,142],[361,139],[355,137],[351,136],[349,137],[347,138],[344,138],[340,138],[337,137],[333,136],[328,134],[323,132],[318,129],[313,126],[308,125],[302,123],[297,123],[292,123],[287,123],[282,124],[277,126],[271,126],[264,125],[257,123],[249,119],[240,113],[230,106],[220,98],[209,88],[198,80],[188,74],[179,69],[171,65],[164,63],[158,63],[152,64],[148,67],[143,69],[138,70],[133,69],[127,68],[120,66],[114,62],[107,58],[100,53],[93,46],[88,39],[84,30],[81,21],[79,10],[78,-2],[78,-14],[79,-28]]

/** 꺾은선이 스스로 엇갈려 생긴 고리를 잘라낸다 (해안의 작은 홈 안쪽으로 민 선) */
function trimLoop(pts) {
  const cross = (a, b, c, d) => {
    const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0])
    if (!den) return null
    const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den
    const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] : null
  }
  let out = pts
  for (let guard = 0; guard < 20; guard++) {
    let hit = null
    for (let i = 0; i < out.length - 1 && !hit; i++) {
      for (let j = out.length - 2; j > i + 1; j--) {
        const x = cross(out[i], out[i + 1], out[j], out[j + 1])
        if (x) {
          hit = [i, j, x]
          break
        }
      }
    }
    if (!hit) break
    const [i, j, x] = hit
    out = [...out.slice(0, i + 1), x, ...out.slice(j + 1)]
  }
  return out
}
/** 해안선을 조금 다듬는다 (이웃 다섯 점 평균) — 벼랑 띠가 해안의 작은 홈마다 꺾이지 않게 */
const COAST_SOFT = COAST.map((p, i) => {
  const win = COAST.slice(Math.max(0, i - 2), i + 3)
  return [win.reduce((a, q) => a + q[0], 0) / win.length, win.reduce((a, q) => a + q[1], 0) / win.length]
})

/** 붉은 해안 벼랑 — 세계 지도처럼 해안 안쪽 띠에 바다 쪽으로 내리긋는 빗금, 끊김 없이 (The Art of Magic 'Coastal Cliffs') */
function coastCliffs() {
  const inner = trimLoop(offset(COAST, 3.5))
  const outer = trimLoop(offset(COAST_SOFT, 30))
  const rand = rng('coast-cliff')
  let ticks = ''
  for (const [[x, y], [ux, uy]] of along(outer, 12)) {
    const len = 21 + rand() * 4
    ticks += line([[x, y], [x - uy * len, y + ux * len]])
  }
  return [P('shade', poly([...inner, ...[...outer].reverse()])), P('hatch', ticks)]
}

/** 바다에서 솟은 화산 유리 바늘 (The Art of Magic 'Spires of volcanic glass jut from the sea') — 세계 지도 자리 */
function needle(x, y, w, h, seed) {
  const parts = KIT.spire(x, y, w, h, seed).map((p) => (p.cls === 'fill' ? P('stone', p.d) : p))
  return [...parts, P('sea-ink', `M${pt([x - w * 1.1, y + 1.5])}Q${pt([x, y - 2])} ${pt([x + w * 1.1, y + 1.5])}`)]
}

/** 물밑 결정 암초 — 해도의 '+' 표 (PG: Akoum 'jagged underwater crystals, essentially invisible to a lookout's eye') */
const reef = ([x, y]) => line([[x - 3.2, y], [x + 3.2, y]]) + line([[x, y - 3.2], [x, y + 3.2]])

// ---------------------------------------------------------------- 가시지대 (세계 지도의 타원 그대로)
const SF = { cx: 766.9, cy: 1033.6, rx: 600, ry: 442 }
const sfE = (x, y) => Math.hypot((x - SF.cx) / SF.rx, (y - SF.cy) / SF.ry)
/** 타원 윗가장자리의 y */
const sfTop = (x) => SF.cy - SF.ry * Math.sqrt(Math.max(0, 1 - ((x - SF.cx) / SF.rx) ** 2))
/** 타원 왼가장자리의 x */
const sfLeft = (y) => SF.cx - SF.rx * Math.sqrt(Math.max(0, 1 - ((y - SF.cy) / SF.ry) ** 2))

// ---------------------------------------------------------------- 자리 (세계 표시는 고정)
// 세계 표시: Tal Terig [825.2, 641.9] (이름은 밑), Raging Ravine [400.1, 850.2] (골짜기 어귀 바닥)
const FOOT = [818, 632] // 탑 밑동 가운데 — 표시는 그 앞 돌무더기 위
const SUBJ = {
  'burst-lightning': { at: [698, 404], size: 85 }, // 탑 북서쪽, 아쿰의 기복이 끝나는 봉우리 하나에 내리친다 (탑 꼭대기와 떨어져, 탑을 치는 것으로 읽히지 않게)
  'arrow-volley-trap': { at: [801, 852], size: 80 }, // 탑 남쪽, Summoning Trap 과 Archive Trap 사이의 한 줄 아래 (패널이 열려 지도가 작아져도 이름이 이웃 그림·이름에 닿지 않게)
  'trapmakers-snare': { at: [684, 600], size: 98, flip: true }, // 탑 서쪽 발치의 트인 비탈 — 탑을 등지고 다가오는 길목에 룬 고리를 긋는 함정 장인 (고리는 산 기슭 밑 맨땅에). 탑 밑동에서 조금 떨어뜨려, 탑을 고르면 지도가 작아져도 이름이 탑 밑동의 정사면체·돌무더기에 닿지 않게
  'hellfire-mongrel': { at: [686, 822], size: 94, flip: true }, // 탑 남서쪽 결정 들판, Summoning Trap 밑에서 탑 쪽을 보고 걷는다
  'inferno-trap': { at: [1032, 468], size: 82 }, // 탑 동쪽 산비탈
  'runeflare-trap': { at: [984, 669], size: 80 }, // 탑 밑동 동쪽, 점선 길 곁
  'summoning-trap': { at: [708, 730], size: 86 },
  'archive-trap': { at: [903, 812], size: 84 }, // 탑 남동쪽 밑동 곁, 점선 길 서쪽의 땅속 금고
  'lavaball-trap': { at: [1036, 848], size: 86 },
}

// 점선 길 — 그림(Lavaball Trap)의 길 양 끝에서 끊는다
const TRACK_A = [[1190, 868], [1140, 860], [1090, 852]]
const TRACK_B = [[993, 848], [994, 826], [982, 790], [966, 752], [938, 718], [904, 690], [884, 674]]
function nearTrack(x, y) {
  let best = 1e9
  for (const T of [TRACK_A, TRACK_B]) {
    for (let i = 0; i < T.length - 1; i++) {
      const [ax, ay] = T[i]
      const [bx, by] = T[i + 1]
      const t = clamp(((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2), 0, 1)
      best = Math.min(best, Math.hypot(x - ax - (bx - ax) * t, y - ay - (by - ay) * t))
    }
  }
  return best
}

// ---------------------------------------------------------------- 결정 가시 (Eye of Ugin 지도와 같은 손)
/** 결정 가시 하나 — 위로 솟거나(rot 0) 처마에 거꾸로 매달린(rot 180) */
function crystal(x, y, len, wid, rot) {
  const c = Math.cos((rot * Math.PI) / 180)
  const s = Math.sin((rot * Math.PI) / 180)
  const T = ([px, py]) => [x + px * c - py * s, y + px * s + py * c]
  const shape = poly([[-wid / 2, 0], [-wid / 2, -len * 0.8], [0, -len], [wid / 2, -len * 0.8], [wid / 2, 0]].map(T))
  const shadeP = poly([[wid * 0.08, 0], [0, -len], [wid / 2, -len * 0.8], [wid / 2, 0]].map(T))
  return [P('fill', shape), P('shade', shadeP), P('hatch', line([[wid * 0.08, -1], [0, -len]].map(T))), P('ink', shape)]
}
/** 결정 가시 무리 — 한 바위 밑동에서 같은 쪽으로 기울어 솟은 각진 기둥들. 크게 기운 것은 이웃 위로 처마처럼 걸린다 */
function spikes(x, y, s, lean, seed, over = 0) {
  const rand = rng(seed)
  const n = 3 + Math.floor(rand() * 2)
  const items = []
  for (let k = 0; k < n; k++) {
    const ox = (k - (n - 1) / 2) * s * 0.3 + (rand() - 0.5) * 3
    const len = s * (0.55 + rand() * 0.6) * (k === 1 ? 1.25 : 1)
    items.push({ y: -len, parts: crystal(x + ox, y, len, s * (0.13 + rand() * 0.05), lean + (rand() - 0.5) * 16) })
  }
  // 크게 기운 가시 하나 — 이웃 위로 걸린다 (Spikefield Hazard 'You'll only bring down more spikes')
  if (over) items.push({ y: 1, parts: crystal(x + Math.sign(over) * s * 0.2, y, s * 1.1, s * 0.15, over) })
  const base = poly([[x - s * 0.62, y + 2], [x - s * 0.4, y - s * 0.12], [x + s * 0.1, y - s * 0.16], [x + s * 0.55, y - s * 0.06], [x + s * 0.68, y + 2]])
  return [...stack(items), P('fill', base), P('shade', poly([[x + s * 0.1, y - s * 0.16], [x + s * 0.55, y - s * 0.06], [x + s * 0.68, y + 2], [x + s * 0.1, y + 2]])), P('ink', base)]
}
/** 결정 첨탑 무리 — 세계 지도 가시지대의 수정 첨탑 기호(가늘고 모난 기둥 서너 개, 가운데가 가장 높고 바깥으로 살짝 기운다)를
 *  자식 지도의 기호 배율(×4)로 — Eye of Ugin 지도(같은 가시지대의 동쪽 끝)와 같은 손 */
function crystalTuft(x, y, seed, k = 1) {
  const rand = rng(seed)
  const G = 4 * k
  const n = 3 + Math.floor(rand() * 3)
  const mid = (n - 1) / 2
  const spires = Array.from({ length: n }, (_, i) => {
    const ox = (i - mid) * (2 + rand() * 0.8) * G
    const hh = (6 + rand() * 6) * G * (1 - Math.abs(i - mid) * 0.22)
    return { ox, hh, lean: ox * 0.16 + (rand() - 0.5) * 0.8 * G, bw: (0.9 + rand() * 0.6) * G }
  }).sort((a, b) => b.hh - a.hh)
  const out = []
  for (const s of spires) {
    const bx = x + s.ox
    const tip = [bx + s.lean, y - s.hh]
    const pr = [bx + s.bw * 0.85 + s.lean * 0.7, y - s.hh * 0.7]
    const shape = poly([[bx - s.bw, y], [bx - s.bw * 0.85 + s.lean * 0.7, y - s.hh * 0.74], tip, pr, [bx + s.bw, y]])
    const face = poly([[bx + s.bw * 0.15, y], tip, pr, [bx + s.bw, y]])
    out.push(P('fill', shape), P('sea', face), P('hatch', line([tip, [bx + s.bw * 0.15, y]])), P('ink', shape))
  }
  return out
}

/** 반짝임 ('crystalline fields shimmer in a rainbow of colors beneath the harsh sun') */
const glint = ([x, y], r) =>
  line([[x - r, y], [x + r, y]]) + line([[x, y - r], [x, y + r]]) + line([[x - r * 0.45, y - r * 0.45], [x + r * 0.45, y + r * 0.45]]) + line([[x - r * 0.45, y + r * 0.45], [x + r * 0.45, y - r * 0.45]])

/** 은빛·푸른 풀포기 ('Aggressive silver and blue grasses take root in volcanic stone') */
const tuft = ([x, y], s = 6) => line([[x - s * 0.55, y - s * 0.65], [x - s * 0.12, y]]) + line([[x, y - s], [x, y]]) + line([[x + s * 0.55, y - s * 0.7], [x + s * 0.12, y]])

/**
 * 가시 지붕 굴 — 모난 바위 둔덕의 처마 밑 낮은 어두운 입구, 그 위로 기울어 걸린 결정 가시
 * (Spikefield Cave: 'Even a whisper's echo can dislodge death from above'). 어느 굴인지 공식 자리는 없다 — 이름 없이 하나만
 */
function spikeCave(x, y, w, seed) {
  const h = w * 0.44
  // 모난 바위 둔덕 — 왼쪽 앞으로 처마가 나온다
  const rock = [[x - w * 0.78, y + 1], [x - w * 0.7, y - h * 0.52], [x - w * 0.46, y - h * 0.62], [x - w * 0.3, y - h * 0.96], [x + w * 0.04, y - h], [x + w * 0.3, y - h * 0.86], [x + w * 0.5, y - h * 0.9], [x + w * 0.7, y - h * 0.42], [x + w * 0.86, y + 1]]
  const d = poly(rock)
  const shadeP = poly([[x + w * 0.04, y - h], [x + w * 0.3, y - h * 0.86], [x + w * 0.5, y - h * 0.9], [x + w * 0.7, y - h * 0.42], [x + w * 0.86, y + 1], [x + w * 0.16, y + 1]])
  // 낮고 좁은 어두운 입구 — 처마 밑 (모난 윗선)
  const L = x - w * 0.5
  const Rm = x + w * 0.06
  const mouth = poly([[L, y + 1], [L + w * 0.06, y - h * 0.3], [L + w * 0.2, y - h * 0.42], [L + w * 0.36, y - h * 0.38], [Rm - w * 0.04, y - h * 0.24], [Rm, y + 1]])
  let hatch = ''
  for (let k = 1; k <= 3; k++) hatch += line([[x + w * (0.3 + k * 0.13), y - h * (0.84 - k * 0.15)], [x + w * (0.26 + k * 0.13), y - 1]])
  // 처마 둘레의 짧은 빗금 — 바위 결
  hatch += line([[x - w * 0.62, y - h * 0.44], [x - w * 0.55, y - h * 0.1]]) + line([[x - w * 0.22, y - h * 0.84], [x - w * 0.16, y - h * 0.5]])
  const out = [P('fill', d), P('shade', shadeP), P('hatch', hatch), P('dark', mouth), P('ink', d + mouth)]
  // 둔덕 위에서 입구 위로 기울어 걸린 가시 — 'Even a whisper's echo can dislodge death from above'
  out.push(...spikes(x - w * 0.06, y - h * 0.9, w * 0.5, -24, `${seed}-a`, -46))
  out.push(...spikes(x + w * 0.46, y - h * 0.82, w * 0.34, 10, `${seed}-b`))
  return out
}

// ---------------------------------------------------------------- 탈 테리그 — 아무렇게나 쌓은 기하 도형의 기둥
/**
 * 돌덩이 하나를 비스듬히 본 모습 — 앞면, 윗면(또는 밑면), 옆면. (cx, by) 는 앞면 밑 가운데, rot 는 앞면을 기울인 각도.
 * o.under: 위가 아니라 밑면이 보인다 (같은 기둥 안에서 시점이 어긋나 '논리를 거스르는' 각도),  o.left: 왼쪽 옆면이 보인다
 */
function cube(cx, by, w, h, d, rot, o = {}) {
  const c = Math.cos((rot * Math.PI) / 180)
  const s = Math.sin((rot * Math.PI) / 180)
  const T = ([px, py]) => [cx + px * c - py * s, by + px * s + py * c]
  const sx = (o.left ? -1 : 1) * d * 0.62
  const sy = (o.under ? 1 : -1) * d * 0.5
  const L = -w / 2
  const R = w / 2
  const front = [[L, 0], [L, -h], [R, -h], [R, 0]].map(T)
  const edgeX = o.left ? L : R
  const capY = o.under ? 0 : -h
  const side = [[edgeX, 0], [edgeX, -h], [edgeX + sx, -h + sy], [edgeX + sx, sy]].map(T)
  const cap = [[L, capY], [R, capY], [R + sx, capY + sy], [L + sx, capY + sy]].map(T)
  let hatch = ''
  // 그늘진 옆면의 세로 빗금
  for (let k = 1; k <= 3; k++) {
    const t = k / 4
    hatch += line([[edgeX + sx * t, -h + sy * t + h * 0.08], [edgeX + sx * t, sy * t - h * 0.06]].map(T))
  }
  // 앞면의 이음매 하나 (큰 돌만) — 돌을 쌓은 것처럼 읽히게
  if (o.seam && w > 24) {
    const t = o.seam
    hatch += line([[L + w * 0.06, -h * t], [R - w * 0.06, -h * t]].map(T))
  }
  // 빛은 왼쪽 위에서 — 윗면은 밝고, 앞면은 기둥과 같은 돌, 오른쪽 옆면과 올려다본 밑면은 그늘 (붙인 주사위가 아니라 한 덩어리의 돌로 읽히게)
  return [P('stone', poly(front)), P(o.under ? 'shade' : 'fill', poly(cap)), P('shade', poly(side)), P('hatch', hatch), P(o.bold ? 'ink-bold' : 'ink', poly(front) + poly(cap) + poly(side))]
}

/**
 * 정사면체 — 꼭짓점 하나가 보는 쪽을 향한 모습: 바깥 세모(꼭짓점이 rot 쪽, 0 = 위)를 안쪽 한 점에서 만나는 세 모서리가
 * 세 면으로 나눈다. 빛은 왼쪽 위에서 — 그쪽을 향한 면은 밝게, 오른쪽 아래를 향한 면은 그늘과 빗금
 */
function tetraAt(cx, cy, size, rot, o = {}) {
  const R = size / Math.sqrt(3)
  const a0 = ((rot - 90) * Math.PI) / 180
  const V = [0, 1, 2].map((k) => [cx + Math.cos(a0 + (k * 2 * Math.PI) / 3) * R, cy + Math.sin(a0 + (k * 2 * Math.PI) / 3) * R])
  const [fx, fy] = o.front ?? [-0.16, 0.12]
  const F = [cx + fx * size, cy + fy * size]
  const out = []
  let hatch = ''
  const faces = []
  for (let k = 0; k < 3; k++) {
    const a = V[k]
    const b = V[(k + 1) % 3]
    const m = [(a[0] + b[0]) / 2 - F[0], (a[1] + b[1]) / 2 - F[1]]
    const len = Math.hypot(m[0], m[1]) || 1
    const lit = (-m[0] - m[1]) / len / Math.SQRT2
    faces.push({ d: poly([F, a, b]), lit, a, b })
  }
  for (const f of faces) out.push(P(f.lit > 0.35 ? 'fill' : f.lit < -0.3 ? 'shade' : 'stone', f.d))
  for (const f of faces) {
    if (f.lit >= -0.3) continue
    for (let k = 1; k <= 3; k++) {
      const t = k / 4
      const p = [f.a[0] + (f.b[0] - f.a[0]) * t, f.a[1] + (f.b[1] - f.a[1]) * t]
      hatch += line([[F[0] + (p[0] - F[0]) * 0.18, F[1] + (p[1] - F[1]) * 0.18], [F[0] + (p[0] - F[0]) * 0.9, F[1] + (p[1] - F[1]) * 0.9]])
    }
  }
  out.push(P('hatch', hatch), P('ink', line([F, V[0]]) + line([F, V[1]]) + line([F, V[2]])), P(o.bold ? 'ink-bold' : 'ink', poly(V)))
  return out
}

/**
 * 기둥 몸 — 단(段)마다 따로 놓은 돌덩이를 쌓았다: 단의 앞면과 그늘진 오른쪽 면. 단마다 조금씩 비켜나고 윗변이 서로 다르게
 * 기울어 모서리가 이어지지 않는다 ('The angles and lines of the tower appear to defy the bounds of logic')
 */
function towerCore(X, Y, H) {
  const rand = rng('core')
  const T = ([x, y]) => [X + x, Y + y]
  const hw = (y) => 31 - 10 * (-y / H)
  const dx = 11
  const dy = -8
  const heights = [34, 26, 30, 24, 28, 22, 28, 24, 20]
  const k = H / heights.reduce((a, b) => a + b, 0)
  const out = []
  let y0 = 8
  let slope0 = 0
  heights.forEach((h0, i) => {
    const h = h0 * k
    const y1 = y0 - h - (i === 0 ? 8 : 0)
    const slope1 = i === heights.length - 1 ? 0.04 : (i % 2 ? 1 : -1) * (0.03 + rand() * 0.05)
    const ox = (rand() - 0.5) * 7
    const w0 = hw(y0)
    const w1 = hw(y1)
    const BL = [-w0 + ox, y0 - slope0 * w0]
    const BR = [w0 + ox, y0 + slope0 * w0]
    const TL = [-w1 + ox, y1 - slope1 * w1]
    const TR = [w1 + ox, y1 + slope1 * w1]
    const front = poly([BL, TL, TR, BR].map(T))
    const side = poly([BR, TR, [TR[0] + dx, TR[1] + dy], [BR[0] + dx, BR[1] + dy]].map(T))
    let hatch = ''
    for (let q = 1; q <= 2; q++) {
      const t = q / 3
      hatch += line([[BR[0] + dx * t, BR[1] + dy * t - 2], [TR[0] + dx * t, TR[1] + dy * t + 2]].map(T))
    }
    // 앞면 오른쪽 가장자리의 짧은 빗금 — 둥글게 돌아가는 면
    hatch += line([[BR[0] - 4, BR[1] - 3], [TR[0] - 4, TR[1] + 3]].map(T))
    const parts = [P('stone', front), P('shade', side), P('hatch', hatch), P('ink', front + side)]
    if (i === heights.length - 1) parts.push(P('fill', poly([TL, TR, [TR[0] + dx, TR[1] + dy], [TL[0] + dx, TL[1] + dy]].map(T))), P('ink', poly([TL, TR, [TR[0] + dx, TR[1] + dy], [TL[0] + dx, TL[1] + dy]].map(T))))
    out.push(...parts)
    y0 = y1
    slope0 = slope1
  })
  return out
}

function puzzleTower(X, Y) {
  const H = 236
  const out = [...towerCore(X, Y, H)]
  const add = (parts) => out.push(...parts)
  const C = (x, y, w, h, d, rot, o) => add(cube(X + x, Y + y, w, h, d, rot, o))
  const Tt = (x, y, size, rot, o) => add(tetraAt(X + x, Y + y, size, rot, o))
  // 밑단 — 왼쪽에 기대 솟은 거대한 정사면체(한 변 20피트, 탑의 큰 몫), 오른쪽에 튀어나온 큰 돌
  C(25, 4, 36, 40, 13, 4, { seam: 0.5 })
  Tt(-28, -26, 60, -8, { bold: true })
  C(4, -44, 9, 8, 5, 6)
  // 가운데 단
  C(-27, -54, 30, 26, 12, -8)
  Tt(27, -84, 42, 180, { bold: true, front: [0.1, -0.12] })
  C(-3, -86, 8, 7, 4, 12)
  Tt(-8, -122, 38, 8, { bold: true })
  C(27, -122, 28, 24, 11, -5, { under: true })
  C(-31, -134, 18, 15, 8, 14)
  C(14, -146, 7, 6, 4, -14)
  // 윗단
  Tt(-20, -168, 36, 196, { bold: true, front: [0.12, -0.1] })
  C(19, -170, 22, 19, 9, 10)
  C(-2, -186, 7, 6, 4, 10)
  Tt(13, -204, 30, 90)
  C(-15, -212, 24, 20, 9, -8, { left: true })
  C(-27, -194, 8, 7, 4, -12)
  // 꼭대기 — 모서리로 선 정육면체와 비스듬한 정사면체 (지붕도 첨탑도 아니다)
  Tt(-14, -248, 24, -34)
  C(5, -240, 26, 26, 10, 45, { bold: true })
  C(23, -226, 7, 6, 4, -18)
  return out
}

/** 밑동을 삼킨 돌무더기 — 모난 돌덩이 몇 개 (받침 없이 땅에서 솟는다) */
function chunk(x, y, sz, rand) {
  const w = sz * (0.6 + rand() * 0.28)
  const h = sz * (0.5 + rand() * 0.32)
  const n = 4 + Math.floor(rand() * 2)
  const pts = [[x - w, y]]
  for (let k = 1; k < n; k++) {
    const a = Math.PI + (k / n) * Math.PI + (rand() - 0.5) * 0.36
    const rr = 0.72 + rand() * 0.34
    pts.push([x + Math.cos(a) * w * rr, y + Math.sin(a) * h * rr * 1.12])
  }
  pts.push([x + w * (0.8 + rand() * 0.2), y - h * (0.08 + rand() * 0.18)], [x + w, y])
  let top = 1
  for (let k = 2; k < pts.length - 1; k++) if (pts[k][1] < pts[top][1]) top = k
  const foot = [x + (pts[top][0] - x) * 0.4 + w * 0.12, y]
  const face = poly([...pts.slice(top), foot])
  return [P('fill', poly(pts)), P('shade', face), P('hatch', line([pts[top], foot])), P('ink', poly(pts))]
}

// ---------------------------------------------------------------- Raging Ravine — 서쪽 산줄기 남쪽 기슭에 파인 좁은 골짜기
// 골짜기 모양과 길이는 이 지도의 해석 (카드 이름만 공식). 표시는 골짜기가 결정 들판으로 열리는 어귀의 바닥에 있다
const RAV = [[370, 626], [380, 660], [375, 696], [387, 734], [385, 770], [394, 806], [401, 842], [408, 872]]
function ravine() {
  const rand = rng('ravine')
  const pts = []
  for (let i = 0; i < RAV.length - 1; i++) for (let s = 0; s < 5; s++) pts.push([RAV[i][0] + ((RAV[i + 1][0] - RAV[i][0]) * s) / 5, RAV[i][1] + ((RAV[i + 1][1] - RAV[i][1]) * s) / 5])
  pts.push(RAV[RAV.length - 1])
  const n = pts.length
  // 머리는 좁고 어귀로 갈수록 넓어지다 끝에서 벌어진다
  const half = (t) => 7 + 19 * Math.sin((Math.min(1, t * 1.6) * Math.PI) / 2) + Math.max(0, t - 0.66) ** 2 * 240
  const jit = (p, i) => (i === 0 ? p : [p[0] + (rand() - 0.5) * 2.6, p[1] + (rand() - 0.5) * 1.2])
  const E = offset(pts, (t) => half(t)).map(jit)
  const W = offset(pts, (t) => -half(t)).map(jit)
  const head = [pts[0][0] - 1, pts[0][1] - 9]
  // 바닥은 양피지 — 밑에 깔린 산 기호를 가린다
  const floor = poly([head, ...E, ...[...W].reverse()])
  // 빛은 왼쪽 위에서: 서쪽 벽(동쪽을 향한 면)이 그늘 — 그늘 띠와 촘촘한 빗금. 동쪽 벽은 밝아 드문 짧은 빗금만
  const wallW = W.map((p, i) => {
    const k = 0.7 * Math.min(1, Math.max(0, (Math.round((n - 1) * 0.84) - i) / 5)) // 어귀에서 그늘이 가늘어져 끝난다
    return [p[0] + (pts[i][0] - p[0]) * k, p[1] + (pts[i][1] - p[1]) * k]
  })
  let hatchW = ''
  let hatchE = ''
  const cut = Math.round((n - 1) * 0.84) // 두 단애는 어귀에서 벌어져 끝난다 — 표시는 어귀의 트인 바닥에
  for (let i = 1; i < cut - 1; i++) {
    const t = i / (n - 1)
    const fade = t > 0.7 ? Math.max(0.25, 1 - (t - 0.7) / 0.16) : 1
    if (!fade) continue
    const lw = (0.62 + rand() * 0.2) * fade
    hatchW += line([W[i], [W[i][0] + (pts[i][0] - W[i][0]) * lw, W[i][1] + (pts[i][1] - W[i][1]) * lw + 2]])
    if (rand() > 0.35) {
      const le = (0.3 + rand() * 0.18) * fade
      hatchE += line([E[i], [E[i][0] + (pts[i][0] - E[i][0]) * le, E[i][1] + (pts[i][1] - E[i][1]) * le + 1]])
    }
  }
  const rimW = [head, ...W.slice(0, cut)]
  const rimE = [head, ...E.slice(0, cut)]
  return [
    P('fill', floor),
    P('shade', poly([head, ...W.slice(0, cut), ...wallW.slice(0, cut).reverse()])),
    P('hatch', hatchW + hatchE),
    P('ink-bold', smooth(rimW)),
    P('ink', smooth(rimE)),
  ]
}

// ---------------------------------------------------------------- 그림 모으기
const parts = []
// 해안과 바다
parts.push(...coastCliffs())
parts.push(P('sea-ink', [[432, 38], [470, 62], [512, 30], [546, 58], [580, 42], [500, 76], [452, 22]].map(reef).join('')))
parts.push(...needle(366.8, 66.7, 11, 34, 'n1'), ...needle(433.5, 100, 8, 22, 'n2'))

// 풀포기 — 결정 들판 밖의 맨 땅에 드문드문
{
  const rand = rng('tufts')
  const spots = [[722, 300], [760, 352], [776, 488], [880, 330], [930, 390], [884, 470], [612, 560], [150, 760], [80, 870], [120, 960], [560, 290]]
  let d = ''
  for (const [x, y] of spots) d += tuft([x + (rand() - 0.5) * 10, y], 5 + rand() * 2.5)
  parts.push(P('sea-ink', d))
}

// 골짜기 (땅보다 낮다 — 둘레 것들보다 먼저)
parts.push(...ravine())

// 이름 없는 점선 길 하나 (해석 — 공식 길이 아니다) — 남동쪽 가장자리에서 Lavaball Trap 밑 길을 지나 탑 밑동으로
parts.push(...[...KIT.dashed(TRACK_A, 9, 7), ...KIT.dashed(TRACK_B, 9, 7)].map((p) => P('hatch', p.d)))

// 땅 위에 선 것들 — 뒤(위)에서 앞(아래)으로
const items = []
const add = (y, p) => items.push({ y, parts: p })

// 가시지대 — 세계 지도와 같은 수정 첨탑 무리를 고루, 탑에서 멀수록 촘촘하고 크게. 그 사이에 크게 기운 가시 무리 몇
// (Spikefield Hazard: 'You'll only bring down more spikes'). 탑 둘레와 그림·이름 자리는 비운다
const KEEP = [
  // [x0, y0, x1, y1] 비워 둘 곳: 탑 둘레, 그림과 그 이름, 표시 이름, 지명, 골짜기, 굴
  [760, 560, 900, 660], // 탑 밑동 (밑동 돌무더기는 따로)
  [768, 650, 884, 696], // Tal Terig 이름 — 표시 밑 (패널이 열려 지도가 작아져도)
  [636, 656, 806, 784], // Summoning Trap 과 그 이름 (패널이 열려 지도가 작아지면 이름이 넓어진다)
  [844, 718, 962, 856], // Archive Trap 과 그 이름
  [972, 776, 1144, 906], // Lavaball Trap 과 그 이름
  [404, 832, 612, 872], // Raging Ravine 이름
  [340, 610, 446, 896], // 골짜기
  [636, 548, 752, 640], // Trapmaker's Snare 와 그 이름
  [740, 798, 852, 886], // Arrow Volley Trap 과 그 이름
  [634, 776, 738, 852], // Hellfire Mongrel 과 그 이름
  [932, 614, 1036, 706], // Runeflare Trap 과 그 이름
  [508, 886, 628, 944], // 가시 지붕 굴
]
const blocked = (x0, y0, x1, y1) => KEEP.some(([a, b, c, d]) => x0 < c && a < x1 && y0 < d && b < y1) || nearTrack((x0 + x1) / 2, y1) < 14 + (x1 - x0) * 0.4
// 크게 기운 가시 무리 — [x, y, 크기, 기울기, 이웃 위로 걸린 가시]. 탑에서 먼 들판 가장자리 쪽
const BIG = [
  [236, 968, 44, 16, 0], [322, 880, 36, -12, -38], [474, 984, 46, 20, 0], [604, 800, 34, -14, 0],
  [712, 992, 40, -18, 36], [920, 990, 46, -16, 0], [1100, 968, 44, 14, -40], [1132, 786, 36, 18, 0],
]
const CRYS = []
{
  // 다트 던지기 — 탑에 가까울수록 듬성듬성 (들판이 탑을 둘러싸되 탑 밑동은 숨 쉬게)
  // 남쪽 가장자리(y 800 → 940)로 갈수록 세계 지도의 가시지대 기호처럼 작고 촘촘하게 — 가장자리 띠에서 세계 지도의 결정과 같은 밀도로 이어진다
  const rand = rng('sf-darts')
  for (let tries = 0; tries < 9000 && CRYS.length < 170; tries++) {
    const x = 150 + rand() * 1030
    const y = 600 + rand() * 420
    if (sfE(x, y) > 0.975) continue
    const dT = Math.hypot(x - FOOT[0], (y - FOOT[1]) * 1.3)
    const far = clamp((dT - 80) / 380, 0, 1)
    const edge = clamp((y - 800) / 140, 0, 1)
    const k = (0.7 + far * 0.32 + rand() * 0.14) * (1 - 0.32 * edge)
    if (blocked(x - 22 * k, y - 46 * k, x + 22 * k, y + 3)) continue
    if (BIG.some(([bx, by, s]) => Math.abs(x - bx) < s * 0.95 + 14 && y > by - s * 1.5 && y < by + 30)) continue
    const minD = (74 - far * 26) * (1 - 0.45 * edge)
    if (CRYS.some(([cx, cy]) => Math.hypot(x - cx, (y - cy) * 1.3) < minD)) continue
    CRYS.push([x, y, k])
  }
}
// Trapmaker's Snare 이름 왼쪽 끝 밑의 첨탑 하나는 뺀다 — 탑을 고르면 지도가 작아져 이름이 넓어진다 (다른 첨탑의 자리는 그대로)
CRYS.forEach(([x, y, k], i) => {
  if (x > 570 && x < 610 && y > 640 && y < 680) return
  add(y, crystalTuft(x, y, `ct${i}`, k))
})
for (const [x, y, s, lean, over] of BIG) add(y, spikes(x, y, s, lean, `big-${x}-${y}`, over))
// 반짝임 — 드문드문
{
  const g = rng('glints')
  let d = ''
  let n = 0
  for (let k = 0; k < 80 && n < 11; k++) {
    const x = 200 + g() * 960
    const y = 660 + g() * 330
    if (sfE(x, y) > 0.95 || blocked(x - 8, y - 8, x + 8, y + 8)) continue
    if (CRYS.some(([cx, cy, ck]) => Math.abs(x - cx) < 26 * ck && y > cy - 50 * ck && y < cy + 4)) continue
    d += glint([x, y], 2.6 + g() * 1.6)
    n++
  }
  add(1001, [P('hatch', d)])
}

// 가시 지붕 굴 하나 (해석 — 이름 없음)
add(930, spikeCave(568, 930, 56, 'cave'))

// 산 기슭과 탑 북쪽 맨 땅의 작은 수정 첨탑 (아쿰 기복의 30% 남짓 — 세계 지도와 같은 기호)
for (const [x, y, k, seed] of [
  [602, 300, 0.8, 'b1'], [150, 236, 0.75, 'b2'], [330, 272, 0.7, 'b3'], [748, 506, 0.8, 'b4'], [930, 448, 0.85, 'b5'],
  [92, 812, 0.85, 'b6'], [70, 930, 0.8, 'b7'], [880, 352, 0.65, 'b8'],
]) add(y, crystalTuft(x, y, seed, k))

// 탑과 밑동을 삼킨 결정·돌무더기
add(FOOT[1], puzzleTower(FOOT[0], FOOT[1]))
{
  const rand = rng('foot')
  const foot = []
  // 밑동 앞을 가로지르는 돌무더기 — 무너져 내린 돌덩이와 작은 도형 조각, 결정. 기둥 밑선이 보이지 않게 덮는다
  // (서쪽 끝은 x 760 안쪽으로 — 탑을 고르면 지도가 작아져 Trapmaker's Snare 이름이 넓어진다).
  // 표시 밑 이름 자리(y ≥ 650)에는 내려오지 않게 — 밑동 앞의 돌은 y 647 위에서 끝난다
  for (const [x, y, sz] of [[773, 647, 14], [790, 646, 12], [814, 645, 15], [840, 645, 13], [862, 644, 14], [880, 638, 11], [802, 640, 10], [852, 638, 9]]) foot.push({ y, parts: chunk(x, y, sz, rand) })
  foot.push({ y: 647, parts: cube(828, 647, 10, 9, 5, 18) })
  foot.push({ y: 651, parts: tetraAt(872, 645, 15, 200) })
  foot.push({ y: 641, parts: cube(786, 640, 8, 7, 4, -22) })
  foot.push({ y: 640, parts: spikes(781, 641, 26, -8, 'ft1') })
  foot.push({ y: 650, parts: spikes(777, 650, 20, -4, 'ft3') })
  foot.push({ y: 622, parts: spikes(890, 624, 26, 16, 'ft2') })
  foot.push({ y: 653, parts: spikes(896, 652, 18, 8, 'ft4') })
  add(FOOT[1] + 1, stack(foot))
}

parts.push(...stack(items))

// ---------------------------------------------------------------- 지형 기호
// 서쪽 산줄기(빽빽)와 북쪽 기복(듬성) 사이 경계 — 북→남. 곧은 세로선이면 깊이 확대했을 때 촘촘한 봉우리가 자로 그은 듯 끝나 보여
// 들쭉날쭉하게 (Burst Lightning 그림(x ≥ 655, y 352–448)과 Trapmaker's Snare(x ≥ 641, y ≥ 547)는 비킨다)
const WEST_EAST_EDGE = [[525, 375], [566, 391], [600, 386], [622, 404], [614, 430], [636, 450], [648, 474], [634, 494], [648, 514], [636, 532]]
const FIELD = {
  // 서쪽 아쿰의 이빨 (akoum-teeth-north) — 남동 귀퉁이는 가시지대 결정이 덮는다. 이름 자리와 골짜기는 비운다
  west: {
    kind: 'mountain',
    density: 1.3,
    points: [
      [-30, 330], [66, 342], [192, 350], [258, 342], [358, 383], [417, 392], ...WEST_EAST_EDGE, [628, sfTop(628)],
      ...[600, 560, 520, 480, 440].map((x) => [x, sfTop(x)]),
      [424, sfTop(424)], [420, 640], [404, 596], [380, 586], [360, 600], [352, 650], [348, sfTop(348)],
      [342, 717], [242, 692], [125, 675], [0, 617], [-30, 610],
      // 이름 자리 (keyhole)
      [-30, 330], [120, 480], [470, 480], [470, 578], [120, 578], [120, 480], [-30, 330],
    ],
  },
  // 동쪽 아쿰의 이빨 (akoum-teeth-eye) — 아랫단은 결정. 서쪽 기슭에 Inferno Trap 과 그 이름이 앉는 빈 자리를 판다
  // (봉우리가 그림 앞을 가로지르거나 이름을 긋지 않게). 오른쪽 끝 x 1283 은 지도 밖 — 기호 배치를 고르는 값
  east: {
    kind: 'mountain',
    density: 1.2,
    points: [
      [975, 400], [1010, 380], [1060, 420], [1110, 430], [1167, 420], [1283, 410], [1283, 730],
      ...[1167, 1130, 1100, 1070, 1040, 1010, 980].map((x) => [x, sfTop(x) - 4]),
      [975, 561], [975, 560], [1110, 560], [1110, 474], [975, 474],
    ],
  },
  // 아쿰의 기복 — 북서 해안 띠와 서쪽 산줄기와 탑 사이
  north: {
    kind: 'mountain',
    density: 0.35,
    points: [
      [-30, -30], [40, -30], [40, 60], [60, 110], [100, 130], [150, 140], [200, 158], [250, 195], [300, 198], [350, 212], [400, 235],
      [450, 262], [500, 275], [550, 247], [600, 224], [650, 236], [700, 262], [700, 300], [668, 345], [652, 420], [664, 476], [664, 505], [650, 548],
      ...[...WEST_EAST_EDGE].reverse(), [417, 392], [358, 383], [258, 342], [192, 350], [66, 342], [-30, 330],
    ],
  },
  // 아쿰의 기복 — 남서 귀퉁이 (가시지대 밖)
  southWest: {
    kind: 'mountain',
    density: 0.45,
    points: [[-30, 610], [0, 617], [125, 675], [242, 692], [342, 717], ...[760, 800, 850, 900, 950, 1000, 1030].map((y) => [sfLeft(y) - 6, y]), [-30, 1030]],
  },
}
// 앱은 칸의 차례(번호)로 기호의 씨앗을 정한다 — 모든 칸이 고루 채워지는 차례 (칸 모양을 고치면 다시 고른다)
const FIELD_ORDER = ['west', 'east', 'southWest', 'north']

/** 바로 이웃한 같은 칠은 한 path 로 — 칠하는 차례는 그대로 */
function compact(list) {
  const out = []
  for (const p of list) {
    const last = out[out.length - 1]
    if (last && last.cls === p.cls) last.d += p.d
    else out.push({ cls: p.cls, d: p.d })
  }
  return out
}

CHILDMAPS.push({
  id: 'tal-terig',
  size: [1167, 1000],
  glyphScale: 4,
  terrain: FIELD_ORDER.map((k) => FIELD[k]),
  parts: compact(parts),
  labels: [
    { text: 'Teeth of Akoum', textKo: '아쿰의 이빨', at: [295, 540], size: 34, kind: 'area' },
    // 'Spikefields' 는 달지 않는다 — 들판 가운데가 남쪽 가장자리 띠(y ≥ 880)에 걸려 이름이 옅어지므로, 범위 바로 밖
    // (세계 [1784.8, 399.4])에 있는 세계 지도의 지역 이름이 그대로 남아 들판의 이름이 된다
  ],
  subjects: SUBJ,
  markAnchors: { 'tal-terig': 'below', 'card:raging-ravine': 'right' },
  focus: [857, 676],
})
