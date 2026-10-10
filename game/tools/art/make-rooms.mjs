// 방 틀 짓기 — 닫힌 실내의 방 틀(game/gameplay/content/meshes/room_*.mesh.txt)을 적는다. 틀을 고칠 때 한 번 돌리고 결과를 저장소에 올린다 (빌드는 이 도구를 부르지 않는다).
//   사용: node game/tools/art/make-rooms.mjs
// 틀마다 바닥의 모양(겹치지 않는 직사각형들)과 문 자리, 벽마다 칸의 차례(색유리창·뚫린 창·벽감·민벽), 채광 구멍, 기둥, 들보, 그리고 손으로 적은 줄(바닥 무늬·빛·소품·길의 점)을 주면
// 같은 규격의 석조 홀을 쌓는다:
//   벽      밑단(다듬은 블록)과 그 위의 밑단 몰딩 · 아랫단(애슐러, 청록 오닉스의 띠) · 허리 띠돌 · 윗단(잔 블록, 창이 뚫린다) · 처마 돌림띠. 칸 사이마다 벽기둥(밑돌·몸·머릿돌).
//   창      각진 머리(두 빗변이 꼭대기에서 만난다 — 코르 양식으로 지어낸 것)의 창. 틀은 두 단(벽 면에 내민 바깥 틀, 벽 두께 속의 안 틀)이고 창턱은 비스듬한 돌이다.
//           색유리창은 가운데 창살(멀리언)이 위에서 둘로 갈라져 빗변에 닿는 각진 트레이서리와 청동 징, 그 뒤에 납 격자 색유리(텍스처를 입힌 유리 — 유리 조각이 빛나고 굽기에서 바닥에 제 색의 무늬를 떨군다).
//           뚫린 창은 같은 틀에 가로 창살 하나.
//   벽감    아랫단을 파 들어간 각진 머리의 감실 — 틀과 선반, 그 안의 조각·항아리(소품), 그 위 윗단의 짐승 머리 조각.
//   문틀    문설주(밑돌·몸·홍예받침)와 맞댄 홍예돌들의 각진 아치, 쐐기돌. 그 뒤는 막힌 벽감 — 포털이 서는 자리다.
//   기둥    밑돌 · 주춧돌(위로 좁아지는 단) · 모따기한 몸(청동 띠와 오닉스 띠) · 기둥머리(위로 벌어지는 단) · 머릿돌. 그 위로 모따기한 들보.
//   천장    회벽 판, 들보 사이의 우물천장 살(잔 들보의 격자), 채광 구멍의 테두리.
//   바닥    판석, 벽을 따라 도는 짙은 테두리 띠, 문지방 (가운데 무늬와 돌길은 틀마다 손으로 적는다).
// 부딪히는 것은 그리는 것과 따로다: 충돌 상자(block)는 밑단·벽·문설주·기둥의 단순한 상자뿐이고, 몰딩·벽기둥·창틀·조각은 부딪히지 않는다
// (벽기둥은 밑단이 내민 만큼만 내밀어 몸이 파고들지 않는다. 벽감은 벽의 충돌 상자가 그대로 막는다 — 들어가지 못한다).
// 단색 장식 면은 쓰지 않는다 — 포인트 색은 재질(청록 오닉스, 호박색 오닉스, 삭은 청동, 색유리)과 스스로 빛나는 조각(룬빛 헤드론 조각, 불꽃)이 낸다.
// 규격 (틀의 좌표 — 방 가운데가 원점, 바닥 윗면이 y 0, 북쪽이 -z):
//   칸은 32 m × 32 m 이고 문 자리는 칸의 변의 가운데(방 가운데에서 16 m)다. 벽의 안쪽 면이 바닥 모양의 가장자리, 천장 밑이 y 9.
//   창은 창턱 y 3.6 에서 꼭대기 y 7.6 까지 — 뛰어서(1.27 m) 닿지 않는다. 해는 남동쪽(content/sky/sky.txt)이라 동·남쪽 벽의 창과 천장의 채광 구멍으로 볕이 든다.
//   문은 포털이라 벽 밖으로 뚫리지 않는다: 문틀 속은 1 m 깊이의 막힌 벽감이고 거기 포털 막(또는 막음돌·석판)이 선다 — 방은 문이 났든 안 났든 닫혀 있다.
// 지어낸 것: 하늘거주지(코르 마킨디 제국의 부유 요새 유적 — docs/lore.md)의 내부가 이렇게 생겼다는 공식 자료는 없다. 홀의 생김새, 각진 색유리창, 빛나는 헤드론 조각,
//   거기 남은 기물(항아리·통·조각 — 사자·황소 머리는 펠리다·허다를 닮은 짐승의 조각으로 본다)은 이 게임이 지었다.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = resolve(fileURLToPath(new URL('../../gameplay/content/meshes', import.meta.url)))

// ── 규격 ──
const H = 9 // 천장 밑
const ROOF = 0.6 // 천장 두께
const WT = 1.2 // 벽 두께
const BASE = 1.2 // 밑단의 높이 (몰딩까지)
const BASE_OUT = 0.2 // 밑단이 방 안으로 내민 양
const PLINTH = 0.9 // 밑단의 블록이 끝나고 몰딩이 시작하는 높이
const COURSE = 3.28 // 허리 띠돌의 밑 (아랫단이 여기서 끝난다)
const SILL = 3.6 // 창턱
const SPRING = 6.8 // 창의 빗변이 시작하는 높이
const HEAD = 7.6 // 창의 꼭대기
const CORNICE = 8.15 // 처마 돌림띠의 밑
const DOOR = 16 // 문 자리 (방 가운데에서)
const DOOR_CLEAR = 3.0 // 문틀이 차지하는 반폭 (벽이 여기서 끊긴다 — 문설주와 0.2 m 겹친다)
const SLIT = 1.3 // 뚫린 창의 폭
const GLASS = 2.2 // 색유리창의 폭 (벽이 두꺼워 볕은 창 폭에서 벽 두께만큼 비낀 몫만 든다 — 넓힐수록 바닥의 빛 조각이 커진다)
const BAY_MIN = 1.8 // 칸을 하나라도 두는 벽의 길이 (양 끝의 여백을 뺀 것)
const WINDOW_PITCH = 4.2 // 칸의 간격
const WINDOW_MARGIN = 1.5 // 벽 끝에서 첫 칸의 창 가장자리까지
const NICHE = 1.4 // 벽감의 폭
const NICHE_DEPTH = 0.55
const NICHE_SPRING = 2.5
const NICHE_HEAD = 3.02
const PILASTER = 0.9 // 벽기둥의 폭
const EMBRASURE_IN = 0.7 // 창이 뚫리는 안 겹의 두께 (그 밖은 넓게 벌어진다)
const EMBRASURE_FLARE = 0.9 // 바깥 겹의 창구멍이 창보다 양옆으로 넓은 양
const EMBRASURE_TOP = 8.35 // 바깥 겹의 창구멍의 위 끝

/** 재질과 빛나는 색 — 메시 글의 머리에 적는다. 텍스처는 content/textures/textures.txt 의 이름, 숫자는 무늬 한 번이 덮는 길이(m) */
const SKINS = [
  '# 벽 — 아랫단의 애슐러, 윗단의 잔 블록, 밑단',
  'material stone      medieval_blocks_03 2.6 #a7abb0',
  'material wall_hi    white_sandstone_blocks_02 2.4 #969da9',
  'material stone_dk   seaworn_stone_tiles 2.2 #79828c',
  '# 다듬은 돌 — 몰딩·벽기둥·창틀·아치, 들보와 우물천장의 살, 기둥의 몸',
  'material stone_lt   marble_01 2.0 #b9bcc0',
  'material trim_dk    marble_01 2.0 #717984',
  'material shaft      travertine014 2.0 #959da6',
  'material granite    granite_tile 1.6',
  '# 바닥 — 판석, 돌길, 가운데 무늬의 모자이크',
  'material floor      stone_tiles_02 2.6 #a0a7ae',
  'material path       marble_01 2.0 #b5b5ad',
  'material mosaic     marble_mosaic_tiles 1.6',
  'material ceiling    sandstone_cracks 3.0 #808994',
  'material abyss      stone_tiles_02 3.0 #000000',
  '# 포인트 — 청록 오닉스, 호박색 오닉스, 삭은 청동',
  'material onyx_teal  onyx006 1.4',
  'material onyx_amber onyx007 1.4',
  'material bronze     metal017 1.2',
  '# 색유리 — 납 격자에 청록·호박색·옅은 흰빛 조각. 화면에서는 유리 조각이 빛나고, 굽기에서는 지나는 볕에 조각의 색이 곱해진다 (납선은 막는다).',
  '# 창살이 가른 칸마다 유리의 빛깔이 다르다 (청록 칸, 호박색 칸, 옅은 칸) — 해 원반의 반그림자(7 m 에서 0.4 m 쯤)가 잔 조각의 무늬는 뭉개도 칸의 빛깔은 바닥에 또렷이 남는다',
  'material glass_teal  glass_window_001 3.4 #8fe6d8 glass',
  'material glass_amber glass_window_001 3.4 #ffc98a glass',
  'material glass_pale  glass_window_001 3.4 #fff3dd glass',
  'material moss       mossy_rock 3.0',
  'material drift      sand_01 1.5',
  'material hedron     travertine014 2.0 #c8c5bc',
  '# 스스로 빛나는 것 — 룬빛 헤드론 조각, 불씨, 불꽃',
  'color rune      #63e0cf glow',
  'color ember     #ffb45e glow',
  'color flame     #ff9a3c glow',
]

const DIRS = ['N', 'E', 'S', 'W']
const n = (v) => {
  const r = Math.round(v * 1000) / 1000
  return Object.is(r, -0) ? '0' : String(r)
}

/** 틀 하나의 글을 모은다 */
class Room {
  constructor(spec) {
    this.spec = spec
    this.lines = []
    this.density = null
    /** 벽기둥이 선 자리들 — { side: 그 벽이 막는 쪽(N·E·S·W), x, z: 벽 안쪽 면의 자리 }. 벽의 등이 여기에 걸린다 */
    this.marks = []
  }
  raw(text) {
    this.lines.push(text)
  }
  section(title) {
    this.lines.push('', `# ── ${title}`)
  }
  /** 이 뒤의 도형의 라이트맵 밀도 (도형은 모두 부딪히지 않는다 — 충돌은 block 이 낸다) */
  mode(density) {
    if (this.density !== density) this.lines.push(`lightmap ${n(density)}`)
    this.density = density
  }
  /** 충돌 상자 — 최소·최대 모서리로 */
  block([x0, y0, z0], [x1, y1, z1]) {
    this.lines.push(`block ${n((x0 + x1) / 2)} ${n((y0 + y1) / 2)} ${n((z0 + z1) / 2)}  ${n(x1 - x0)} ${n(y1 - y0)} ${n(z1 - z0)}`)
  }
  /** 축에 나란한 상자 — 최소·최대 모서리로. extra 는 뒤에 붙이는 것 (lm …) */
  box(skin, [x0, y0, z0], [x1, y1, z1], extra = '') {
    if (!(x1 > x0 && y1 > y0 && z1 > z0)) throw new Error(`${this.spec.name}: 빈 상자 ${skin} ${[x0, y0, z0, x1, y1, z1]}`)
    this.lines.push(`box ${skin} ${n((x0 + x1) / 2)} ${n((y0 + y1) / 2)} ${n((z0 + z1) / 2)}  ${n(x1 - x0)} ${n(y1 - y0)} ${n(z1 - z0)}${extra ? ` ${extra}` : ''}`)
  }
  /** 가운데와 크기, 돌림으로 */
  shape(command, skin, center, size, extra = '') {
    this.lines.push(`${command} ${skin} ${center.map(n).join(' ')}  ${size.map(n).join(' ')}${extra ? ` ${extra}` : ''}`)
  }
  /** 기둥꼴 — 단면(점들)을 축을 따라 민다 */
  prism(skin, center, length, profile, extra = '') {
    if (!(length > 0)) throw new Error(`${this.spec.name}: 길이 없는 기둥꼴 ${skin}`)
    this.lines.push(`prism ${skin} ${center.map(n).join(' ')}  ${n(length)}  ${profile.length}  ${profile.map(([p, q]) => `${n(p)} ${n(q)}`).join('  ')}${extra ? ` ${extra}` : ''}`)
  }
  inside(x, z) {
    return this.spec.floor.some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1)
  }
}

/**
 * 바닥 모양의 가장자리를 벽 줄로 — { d: 벽이 막는 쪽(0 북 … 3 서), at: 그 축의 자리, from, to: 벽이 뻗는 축의 구간 }.
 * d 가 북·남이면 벽은 x 를 따라 뻗고 z = at 에 선다. 동·서면 z 를 따라 뻗고 x = at 에 선다
 */
function wallRuns(room) {
  const xs = [...new Set(room.spec.floor.flatMap(([x0, , x1]) => [x0, x1]))].sort((a, b) => a - b)
  const zs = [...new Set(room.spec.floor.flatMap(([, z0, , z1]) => [z0, z1]))].sort((a, b) => a - b)
  const edges = []
  for (let i = 0; i + 1 < xs.length; i++)
    for (let j = 0; j + 1 < zs.length; j++) {
      const [cx, cz] = [(xs[i] + xs[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2]
      if (!room.inside(cx, cz)) continue
      // 네 이웃 칸이 방 밖이면 그 변이 벽이다
      if (!room.inside(cx, zs[j] - 0.01)) edges.push({ d: 0, at: zs[j], from: xs[i], to: xs[i + 1] })
      if (!room.inside(cx, zs[j + 1] + 0.01)) edges.push({ d: 2, at: zs[j + 1], from: xs[i], to: xs[i + 1] })
      if (!room.inside(xs[i + 1] + 0.01, cz)) edges.push({ d: 1, at: xs[i + 1], from: zs[j], to: zs[j + 1] })
      if (!room.inside(xs[i] - 0.01, cz)) edges.push({ d: 3, at: xs[i], from: zs[j], to: zs[j + 1] })
    }
  edges.sort((a, b) => a.d - b.d || a.at - b.at || a.from - b.from)
  const runs = []
  for (const edge of edges) {
    const last = runs.at(-1)
    if (last && last.d === edge.d && last.at === edge.at && Math.abs(last.to - edge.from) < 1e-6) last.to = edge.to
    else runs.push({ ...edge })
  }
  return runs
}

/** 벽 줄에서 깊이 w (안쪽 면에서 밖으로, 음수면 방 안으로) 의 자리 — 벽이 서는 축의 좌표 */
const outOf = (run, w) => run.at + (run.d === 0 || run.d === 3 ? -w : w)
/** 벽 줄 위의 자리 t (뻗는 축), 높이 y, 깊이 w → 틀의 좌표 */
const onRun = (run, t, y, w) => (run.d % 2 === 0 ? [t, y, outOf(run, w)] : [outOf(run, w), y, t])
/** 벽 줄 위의 상자 — 뻗는 축 [t0, t1], 높이 [y0, y1], 깊이 [w0, w1] */
function runBox(room, run, skin, [t0, t1], [y0, y1], [w0, w1], extra = '') {
  const [a, b] = [onRun(run, t0, y0, w0), onRun(run, t1, y1, w1)]
  room.box(skin, a.map((v, i) => Math.min(v, b[i])), a.map((v, i) => Math.max(v, b[i])), extra)
}
function runBlock(room, run, [t0, t1], [y0, y1], [w0, w1]) {
  const [a, b] = [onRun(run, t0, y0, w0), onRun(run, t1, y1, w1)]
  room.block(a.map((v, i) => Math.min(v, b[i])), a.map((v, i) => Math.max(v, b[i])))
}
/** 벽의 면에 그린 다각형(점마다 [t, y])을 깊이 [w0, w1] 만큼 민 것 — 창틀·홍예돌·창살·유리 */
function runPoly(room, run, skin, points, [w0, w1]) {
  const middle = (outOf(run, w0) + outOf(run, w1)) / 2
  if (run.d % 2 === 0) room.prism(skin, [0, 0, middle], Math.abs(w1 - w0), points, 'axis z')
  else room.prism(skin, [middle, 0, 0], Math.abs(w1 - w0), points, 'axis x')
}
/**
 * 벽을 따라 뻗는 몰딩 — 단면(점마다 [w, y])을 [t0, t1] 만큼 민다. ends 는 두 끝의 맞춤: 'in' 방의 모퉁이(안으로 꺾인다 — 내민 만큼 짧게),
 * 'out' 밖으로 꺾이는 모퉁이(내민 만큼 길게), 'flat' 곧게 자른다. 모퉁이에서 만나는 두 몰딩이 45 도로 맞댄다
 */
function runMolding(room, run, skin, [t0, t1], profile, [end0, end1] = ['flat', 'flat']) {
  // 끝의 자리 = t + k · w (w 는 음수가 방 안쪽): 길게 하려면 앞 끝은 k +1, 뒤 끝은 k −1
  const k0 = { in: -1, out: 1, flat: 0 }[end0]
  const k1 = { in: 1, out: -1, flat: 0 }[end1]
  // 도형의 가운데를 벽의 안쪽 면에 두면 단면의 가로 좌표가 p = s · w 다 — 끝의 기울기는 p 에 대해 k · s
  const s = run.d === 0 || run.d === 3 ? -1 : 1
  const points = profile.map(([w, y]) => [s * w, y])
  const miter = k0 || k1 ? ` miter ${n(k0 * s)} 0 ${n(k1 * s)} 0` : ''
  if (run.d % 2 === 0) room.prism(skin, [(t0 + t1) / 2, 0, run.at], t1 - t0, points, `axis x${miter}`)
  else room.prism(skin, [run.at, 0, (t0 + t1) / 2], t1 - t0, points, `axis z${miter}`)
}

/**
 * 각진 머리의 틀 — 열린 오각형(가운데 c, 반폭 hw, 밑 sill, 빗변이 시작하는 높이 spring, 꼭대기 head)의 둘레를 폭 f 로 두른 돌 넷(양 문설주와 두 빗변).
 * 깊이 [w0, w1]. 밑변(창턱)은 따로 놓는다
 */
function pointedFrame(room, run, skin, c, hw, sill, spring, head, f, depth) {
  const rise = head - spring
  const length = Math.hypot(hw, rise)
  // 바깥 오각형 — 문설주 바깥 선과 빗변을 f 만큼 밖으로 민 선이 만나는 자리, 꼭대기
  const shoulder = spring + (f * (length - rise)) / hw
  const apex = head + (f * length) / hw
  for (const side of [-1, 1]) {
    const [inner, outer] = [c + side * hw, c + side * (hw + f)]
    runPoly(room, run, skin, [[outer, sill], [inner, sill], [inner, spring], [outer, shoulder]], depth)
    runPoly(room, run, skin, [[inner, spring], [c, head], [c, apex], [outer, shoulder]], depth)
  }
}
/** 오각형을 안으로 f 만큼 줄인 것 — [반폭, 빗변이 시작하는 높이, 꼭대기] */
function inset(hw, spring, head, f) {
  const rise = head - spring
  const length = Math.hypot(hw, rise)
  return [hw - f, spring - (f * (length - rise)) / hw, head - (f * length) / hw]
}

/** 창 하나 — 바깥 틀, 안 틀, 비스듬한 창턱, 쐐기돌. 색유리창이면 유리와 각진 트레이서리, 뚫린 창이면 가로 창살 */
function windowAt(room, run, center, kind, serial) {
  const hw = (kind === 'g' ? GLASS : SLIT) / 2
  room.mode(5)
  // 바깥 틀 — 벽 면에서 살짝 내밀고 벽 속으로 물린다
  pointedFrame(room, run, 'stone_lt', center, hw, SILL, SPRING, HEAD, 0.24, [-0.08, 0.22])
  // 안 틀 — 열린 자리를 0.1 m 좁히는 둘째 단 (유리가 여기 물린다)
  const [ihw, ispring, ihead] = inset(hw, SPRING, HEAD, 0.1)
  pointedFrame(room, run, 'stone_lt', center, ihw, SILL, ispring, ihead, 0.1, [0.42, EMBRASURE_IN + 0.03])
  // 창턱 — 유리 밑에서 방 쪽으로 기운 돌, 벽 면 밖으로 조금 내민다
  runMolding(room, run, 'stone_lt', [center - hw, center + hw], [[EMBRASURE_IN + 0.03, SILL], [EMBRASURE_IN + 0.03, SILL + 0.16], [0.42, SILL + 0.16], [0, SILL + 0.05], [-0.16, SILL + 0.05], [-0.16, SILL - 0.02], [0, SILL - 0.02]])
  // 쐐기돌 — 바깥 틀의 꼭대기
  const top = HEAD + (0.24 * Math.hypot(hw, HEAD - SPRING)) / hw
  runPoly(room, run, kind === 'g' ? 'onyx_teal' : 'granite', [[center - 0.13, HEAD - 0.06], [center + 0.13, HEAD - 0.06], [center + 0.21, top + 0.12], [center - 0.21, top + 0.12]], [-0.14, 0.2])
  const slope = (ihead - ispring) / ihw
  if (kind === 'g') {
    // 유리 — 안 틀에 물린 얇은 판 (안 틀의 열린 자리보다 조금 크게). 창살이 가르는 세 칸(왼쪽, 오른쪽, 꼭대기)을 따로 놓아 칸마다 빛깔을 달리한다 — 창마다 차례가 돈다
    room.mode(2)
    const fork = 5.95
    const [ghw, gspring, ghead] = [ihw + 0.03, ispring + 0.02, ihead + 0.03]
    const shoulder = Math.min(fork + slope * ghw, gspring)
    const tints = [['glass_teal', 'glass_amber', 'glass_pale'], ['glass_amber', 'glass_teal', 'glass_pale'], ['glass_teal', 'glass_pale', 'glass_amber'], ['glass_pale', 'glass_teal', 'glass_amber']][serial % 4]
    runPoly(room, run, tints[0], [[center - ghw, SILL + 0.14], [center, SILL + 0.14], [center, fork], [center - ghw, shoulder]], [0.6, 0.63])
    runPoly(room, run, tints[1], [[center, SILL + 0.14], [center + ghw, SILL + 0.14], [center + ghw, shoulder], [center, fork]], [0.6, 0.63])
    runPoly(room, run, tints[2], [[center, fork], [center + ghw, shoulder], [center + ghw, gspring], [center, ghead], [center - ghw, gspring], [center - ghw, shoulder]].filter((p, i, all) => i === 0 || Math.hypot(p[0] - all[i - 1][0], p[1] - all[i - 1][1]) > 1e-6), [0.6, 0.63])
    // 트레이서리 — 가운데 창살이 fork 높이에서 둘로 갈라져 빗변에 닿는다 (꼭대기에 마름모 칸이 남는다)
    room.mode(4)
    const [bar, depth] = [0.055, [0.52, 0.7]]
    runPoly(room, run, 'stone_lt', [[center - bar, SILL + 0.14], [center + bar, SILL + 0.14], [center + bar, fork], [center - bar, fork]], depth)
    // 갈래가 빗변과 만나는 자리: ispring + slope · (ihw − x) = fork + slope · x
    const reach = (ispring - fork + slope * ihw) / (2 * slope) + 0.04
    const thick = 0.075
    for (const side of [-1, 1])
      runPoly(room, run, 'stone_lt', [[center, fork - thick], [center, fork + thick], [center + side * reach, fork + slope * reach + thick], [center + side * reach, fork + slope * reach - thick]], depth)
    // 갈림목의 청동 징
    room.shape('box', 'bronze', onRun(run, center, fork, 0.5), run.d % 2 === 0 ? [0.2, 0.2, 0.06] : [0.06, 0.2, 0.2], run.d % 2 === 0 ? 'rot 0 0 45' : 'rot 0 45 0')
  } else {
    // 가로 창살 둘 — 청동
    room.mode(4)
    for (const y of [4.9, 6.1]) runBox(room, run, 'bronze', [center - ihw - 0.02, center + ihw + 0.02], [y - 0.04, y + 0.04], [0.56, 0.64])
  }
}

/** 벽감 하나 — 아랫단을 파 들어간 감실의 뒤·머리·틀·선반과 그 안의 기물, 그 위 윗단의 짐승 머리 */
function nicheAt(room, run, center, state) {
  const hw = NICHE / 2
  room.mode(6)
  // 밑(밑단의 몰딩 뒤를 메운다), 뒤와 머리 — 감실의 안은 짙은 돌
  runBox(room, run, 'stone', [center - hw - 0.02, center + hw + 0.02], [PLINTH, BASE + 0.02], [0, NICHE_DEPTH + 0.02])
  runBox(room, run, 'granite', [center - hw - 0.02, center + hw + 0.02], [PLINTH, COURSE], [NICHE_DEPTH, WT], `lm ${outerFace(run)} 0.5`)
  runBox(room, run, 'stone', [center - hw, center + hw], [NICHE_HEAD, COURSE], [0, NICHE_DEPTH + 0.02])
  for (const side of [-1, 1])
    runPoly(room, run, 'stone', [[center + side * hw, NICHE_SPRING], [center, NICHE_HEAD], [center, NICHE_HEAD + 0.04], [center + side * (hw + 0.04), NICHE_HEAD + 0.04], [center + side * (hw + 0.04), NICHE_SPRING]], [0, NICHE_DEPTH + 0.02])
  room.mode(5)
  pointedFrame(room, run, 'stone_lt', center, hw, BASE, NICHE_SPRING, NICHE_HEAD, 0.14, [-0.06, 0.14])
  // 선반 — 밑단 위에 얹은 얇은 돌
  runBox(room, run, 'stone_lt', [center - hw - 0.14, center + hw + 0.14], [BASE, BASE + 0.06], [-0.26, NICHE_DEPTH])
  // 기물 — 감실마다 차례로. 방 쪽을 본다
  const yaw = [0, 270, 180, 90][run.d]
  const items = [['bust', 1.0], ['amphora', 1.0], ['brass_vase_a', 1.0], ['vase_b', 1.0], ['brass_vase_b', 1.0], ['vase_a', 1.0]]
  const [item, scale] = items[state.niche++ % items.length]
  const [x, , z] = onRun(run, center, 0, 0.26)
  room.raw(`prop ${item} ${n(x)} ${n(BASE + 0.06)} ${n(z)}  ${yaw} ${scale}`)
  // 그 위 윗단의 짐승 머리 — 받침돌 위에, 벽에서 내밀어
  room.mode(4)
  runBox(room, run, 'stone_lt', [center - 0.5, center + 0.5], [4.5, 4.66], [-0.34, 0.1])
  runMolding(room, run, 'stone_lt', [center - 0.42, center + 0.42], [[0.1, 4.2], [-0.04, 4.2], [-0.26, 4.5], [0.1, 4.5]])
  const [hx, , hz] = onRun(run, center, 0, -0.14)
  room.raw(`prop ${state.niche % 2 ? 'lion_head' : 'bull_head'} ${n(hx)} 4.66 ${n(hz)}  ${yaw} 1.0`)
}

/** 벽 줄의 바깥 면 이름 */
const outerFace = (run) => ['-z', '+x', '+z', '-x'][run.d]

// 몰딩의 단면 ([깊이 w, 높이 y] — w 음수가 방 안쪽)
const PLINTH_CAP = [[0.02, PLINTH], [-BASE_OUT, PLINTH], [-BASE_OUT, PLINTH + 0.08], [-0.13, PLINTH + 0.2], [-0.05, PLINTH + 0.24], [-0.05, BASE], [0.02, BASE]]
const STRING_COURSE = [[0.02, COURSE], [-0.07, COURSE], [-0.15, COURSE + 0.09], [-0.15, COURSE + 0.21], [-0.06, SILL], [0.02, SILL]]
const CORNICE_PROFILE = [[0.02, CORNICE], [-0.1, CORNICE], [-0.1, CORNICE + 0.14], [-0.22, CORNICE + 0.3], [-0.22, CORNICE + 0.44], [-0.4, CORNICE + 0.68], [-0.4, H], [0.02, H]]

/**
 * 벽 줄의 한 구간 [a, b] — 밑단, 아랫단, 허리 띠돌, 창이 뚫린 윗단, 처마 돌림띠, 벽기둥. pattern 은 칸의 차례 ('g' 색유리창, 's' 뚫린 창, 'n' 벽감, '-' 민벽).
 * seen 은 방 안에서 보이는 구간(모퉁이를 메우느라 더 뻗은 데는 빼고), ends 는 그 두 끝의 생김('in' 방의 모퉁이, 'out' 밖으로 꺾이는 모퉁이, 'flat' 문틀에 닿는 끝)
 */
function wallSpan(room, run, a, b, pattern, state, [seenFrom, seenTo], ends) {
  const outer = `lm ${outerFace(run)} 0.5`
  // 칸 — 보이는 구간에 고르게
  const bays = []
  const usable = seenTo - seenFrom - 2 * WINDOW_MARGIN
  if (usable >= BAY_MIN) {
    const count = Math.max(1, Math.floor((usable - BAY_MIN) / WINDOW_PITCH) + 1)
    const span = (count - 1) * WINDOW_PITCH
    for (let i = 0; i < count; i++) bays.push({ center: (seenFrom + seenTo) / 2 - span / 2 + i * WINDOW_PITCH, kind: pattern ? pattern[state.window++ % pattern.length] : '-' })
  }
  const windows = bays.filter((bay) => bay.kind === 'g' || bay.kind === 's').map((bay) => ({ ...bay, width: bay.kind === 'g' ? GLASS : SLIT }))
  const niches = bays.filter((bay) => bay.kind === 'n')

  // 부딪히는 것 — 밑단과, 창턱까지의 벽 (창이 없으면 천장까지)
  runBlock(room, run, [a, b], [-1, BASE], [-BASE_OUT, WT])
  // Windows admit baked light but cannot become exits from the new upper floor.
  runBlock(room, run, [a, b], [BASE, room.spec.upper || !windows.length ? H + ROOF : SILL], [0, WT])

  // 밑단 — 블록과 그 위의 몰딩. 밖으로 꺾이는 모퉁이에서는 내민 만큼 더 뻗어 모퉁이를 메운다
  room.mode(8)
  runBox(room, run, 'stone_dk', [a - (ends[0] === 'out' ? BASE_OUT : 0), b + (ends[1] === 'out' ? BASE_OUT : 0)], [-1, PLINTH + 0.02], [-BASE_OUT, WT], `${outer} lm -y 0.5`)
  room.mode(6)
  runMolding(room, run, 'stone_lt', [seenFrom, seenTo], PLINTH_CAP, ends)

  // 아랫단 — 벽감 자리를 빼고
  room.mode(8)
  let from = a
  for (const niche of niches) {
    runBox(room, run, 'stone', [from, niche.center - NICHE / 2], [PLINTH, COURSE + 0.02], [0, WT], outer)
    from = niche.center + NICHE / 2
  }
  runBox(room, run, 'stone', [from, b], [PLINTH, COURSE + 0.02], [0, WT], outer)
  for (const niche of niches) nicheAt(room, run, niche.center, state)
  // 아랫단의 청록 오닉스 띠 (벽에 박은 얇은 돌) — 벽감 자리는 건너뛴다
  room.mode(4)
  from = seenFrom
  for (const niche of niches) {
    runBox(room, run, 'onyx_teal', [from, niche.center - NICHE / 2 - 0.14], [2.56, 2.7], [-0.012, 0.03])
    from = niche.center + NICHE / 2 + 0.14
  }
  runBox(room, run, 'onyx_teal', [from, seenTo], [2.56, 2.7], [-0.012, 0.03])

  // 아랫단의 판 — 칸마다(벽감이 없는 칸) 다듬은 돌의 테를 두른 트래버틴 판을 박는다
  for (const bay of bays) {
    if (bay.kind === 'n') continue
    const [l, r, y0, y1, f] = [bay.center - 1.25, bay.center + 1.25, 1.44, 2.4, 0.09]
    room.mode(5)
    runBox(room, run, 'shaft', [l + f, r - f], [y0 + f, y1 - f], [-0.014, 0.02])
    room.mode(4)
    // 테 — 안쪽으로 기운 단면 (판 쪽이 낮다)
    const strip = (t0, t1, lo, hi, tall) => {
      if (tall) runBox(room, run, 'stone_lt', [t0, t1], [lo, hi], [-0.045, 0.02])
      else runMolding(room, run, 'stone_lt', [t0, t1], [[0.02, lo], [-0.045, lo], [-0.045, hi], [0.02, hi]])
    }
    strip(l, r, y0, y0 + f, false)
    strip(l, r, y1 - f, y1, false)
    strip(l, l + f, y0 + f, y1 - f, true)
    strip(r - f, r, y0 + f, y1 - f, true)
  }

  // 밖으로 꺾이는 모퉁이의 맞춤돌 — 길고 짧은 다듬은 돌을 번갈아 쌓는다 (맞은편 벽면과 엇갈린다)
  room.mode(4)
  for (const [end, at, into] of [[ends[0], seenFrom, 1], [ends[1], seenTo, -1]]) {
    if (end !== 'out') continue
    const rows = [[BASE + 0.03, COURSE - 0.03], [SILL + 0.03, CORNICE - 0.03]]
    for (const [low, high] of rows) {
      const count = Math.round((high - low) / 0.46)
      const pitch = (high - low) / count
      for (let k = 0; k < count; k++) {
        const length = (k + run.d) % 2 ? 0.78 : 0.46
        const span = into > 0 ? [at - 0.035, at + length] : [at - length, at + 0.035]
        runBox(room, run, 'stone_lt', span, [low + k * pitch + 0.012, low + (k + 1) * pitch - 0.012], [-0.035, 0.02])
      }
    }
  }

  // 허리 띠돌
  room.mode(6)
  runMolding(room, run, 'stone_lt', [seenFrom, seenTo], STRING_COURSE, ends)

  // 윗단 — 창 자리를 빼고
  room.mode(6)
  if (!windows.length) {
    runBox(room, run, 'wall_hi', [a, b], [COURSE, H + ROOF], [0, WT], outer)
  } else {
    // 창 자리의 벽은 두 겹이다: 방 쪽의 안 겹(두께 EMBRASURE_IN)에 창이 뚫리고, 그 밖의 바깥 겹은 창보다 넓고 높게 벌어진다 (밖으로 벌어진 창구멍).
    // 벽 두께가 통째로 창 폭이면 비껴 드는 볕이 거의 다 창구멍의 옆에 걸린다 — 바깥을 벌려 유리까지는 볕이 그대로 닿게 한다 (바깥 겹은 방 안에서 보이지 않는다)
    const flare = (w) => [w.center - w.width / 2 - EMBRASURE_FLARE, w.center + w.width / 2 + EMBRASURE_FLARE]
    runBox(room, run, 'wall_hi', [a, b], [COURSE, SILL + 0.02], [0, WT], outer)
    from = a
    for (const w of windows) {
      runBox(room, run, 'wall_hi', [from, flare(w)[0]], [SILL, EMBRASURE_TOP + 0.02], [0, WT], outer)
      from = flare(w)[1]
    }
    runBox(room, run, 'wall_hi', [from, b], [SILL, EMBRASURE_TOP + 0.02], [0, WT], outer)
    runBox(room, run, 'wall_hi', [a, b], [EMBRASURE_TOP, H + ROOF], [0, WT], outer)
    for (const w of windows) {
      // 안 겹 — 창의 양옆과 머리 위
      const [l, r] = [w.center - w.width / 2, w.center + w.width / 2]
      runBox(room, run, 'wall_hi', [flare(w)[0] - 0.02, l], [SILL, HEAD + 0.02], [0, EMBRASURE_IN])
      runBox(room, run, 'wall_hi', [r, flare(w)[1] + 0.02], [SILL, HEAD + 0.02], [0, EMBRASURE_IN])
      runBox(room, run, 'wall_hi', [flare(w)[0] - 0.02, flare(w)[1] + 0.02], [HEAD, EMBRASURE_TOP + 0.04], [0, EMBRASURE_IN])
      // 창머리의 두 귀 — 빗변 위를 메우는 세모 (옆 벽과 조금 겹친다)
      for (const side of [-1, 1]) {
        const edge = w.center + (side * w.width) / 2
        runPoly(room, run, 'wall_hi', [[edge, SPRING], [w.center, HEAD], [w.center, HEAD + 0.04], [edge + side * 0.04, HEAD + 0.04], [edge + side * 0.04, SPRING]], [0, EMBRASURE_IN])
      }
    }
    for (const w of windows) windowAt(room, run, w.center, w.kind, w.kind === 'g' ? state.glass++ : 0)
  }

  // 처마 돌림띠
  room.mode(5)
  runMolding(room, run, 'stone_lt', [seenFrom, seenTo], CORNICE_PROFILE, ends)

  // 벽기둥 — 칸의 경계마다: 밑돌, 몸, 호박색 오닉스의 마름모, 머릿돌
  if (bays.length) {
    const marks = [bays[0].center - WINDOW_PITCH / 2, ...bays.map((bay) => bay.center + WINDOW_PITCH / 2)].filter((t) => t > seenFrom + 0.75 && t < seenTo - 0.75)
    const half = PILASTER / 2
    for (const t of marks) {
      const [mx, , mz] = onRun(run, t, 0, 0)
      room.marks.push({ side: DIRS[run.d], x: mx, z: mz })
      room.mode(6)
      runBox(room, run, 'stone_dk', [t - half - 0.08, t + half + 0.08], [0, BASE + 0.06], [-BASE_OUT - 0.07, 0.02])
      runBox(room, run, 'stone_lt', [t - half, t + half], [BASE, CORNICE - 0.38], [-BASE_OUT, 0.02])
      room.mode(4)
      // 머릿돌 — 위로 벌어지는 단과 판
      runMolding(room, run, 'stone_lt', [t - half - 0.1, t + half + 0.1], [[0.02, CORNICE - 0.42], [-BASE_OUT, CORNICE - 0.42], [-BASE_OUT - 0.1, CORNICE - 0.2], [-BASE_OUT - 0.1, CORNICE + 0.02], [0.02, CORNICE + 0.02]])
      const plate = run.d % 2 === 0 ? { size: [0.3, 0.3, 0.05], rot: 'rot 0 0 45' } : { size: [0.05, 0.3, 0.3], rot: 'rot 0 45 0' }
      room.shape('box', 'onyx_amber', onRun(run, t, 2.63, -BASE_OUT), plate.size, plate.rot)
    }
  }

  // 바닥의 테두리 띠 — 벽을 따라 도는 짙은 돌
  room.mode(4)
  runBox(room, run, 'granite', [seenFrom, seenTo], [-0.03, 0.018], [-0.95, -BASE_OUT + 0.02])
}

/** 문 자리 — 문설주(밑돌·몸·홍예받침), 맞댄 홍예돌들의 각진 아치와 쐐기돌, 문지방, 그 뒤의 막힌 벽감. 문틀은 d 쪽 벽에 선다 */
function doorway(room, d) {
  const run = { d, at: d === 0 || d === 3 ? -DOOR : DOOR }
  const outer = `lm ${outerFace(run)} 0.5`
  // 부딪히는 것 — 문설주 둘(벽 안쪽 면에서 방 안으로 0.7 m 내민다), 벽감의 뒤와 바닥
  for (const side of [-1, 1]) runBlock(room, run, side < 0 ? [-3.2, -2.0] : [2.0, 3.2], [0, 6], [-0.7, WT])
  runBlock(room, run, [-3.4, 3.4], [-1, H + ROOF], [1.0, WT + 0.6])
  runBlock(room, run, [-3.2, 3.2], [-1, 0], [0, WT])

  // 벽감 — 뒤를 막는 벽과 그 바닥, 문틀 위의 벽 (포털 막의 오각형 뒤로 0.3 m 물러나 있다)
  room.mode(6)
  runBox(room, run, 'stone_dk', [-3.4, 3.4], [-1, H + ROOF], [1.0, WT + 0.6], outer)
  runBox(room, run, 'granite', [-3.2, 3.2], [-1, 0], [0, WT], 'lm -y 0.5')
  runBox(room, run, 'wall_hi', [-3.2, 3.2], [6, H + ROOF], [0.3, WT], outer)
  // 아치 둘레의 벽 — 홍예돌의 바깥을 벽 면까지 채우고(포털 막의 오각형은 비운다 — 밑변이 홍예돌 속으로 숨는다) 처마 돌림띠를 잇는다
  for (const side of [-1, 1]) runPoly(room, run, 'wall_hi', [[side * 3.2, 6.0], [side * 3.2, 8.04], [0, 8.04], [0, 7.7], [side * 2.6, 6.4]], [0, 0.32])
  runBox(room, run, 'wall_hi', [-3.0, 3.0], [8.02, H + ROOF], [0, 0.32])
  room.mode(5)
  runMolding(room, run, 'stone_lt', [-DOOR_CLEAR, DOOR_CLEAR], CORNICE_PROFILE)

  // 문설주 — 밑돌, 몸, 청동 띠, 홍예받침
  for (const side of [-1, 1]) {
    const [t0, t1] = side < 0 ? [-3.2, -2.0] : [2.0, 3.2]
    room.mode(8)
    runBox(room, run, 'stone_lt', [t0, t1], [0, 5.62], [-0.7, WT])
    room.mode(5)
    runBox(room, run, 'stone_dk', [t0 - 0.07, t1 + 0.07], [0, 0.8], [-0.77, 0.05])
    runBox(room, run, 'bronze', [t0 - 0.02, t1 + 0.02], [3.9, 4.04], [-0.72, 0.03])
    runBox(room, run, 'onyx_teal', [t0 - 0.012, t1 + 0.012], [4.16, 4.3], [-0.712, 0.03])
    // 홍예받침 — 위로 벌어지는 단
    runBox(room, run, 'stone_lt', [t0 - 0.09, t1 + 0.09], [5.6, 6.0], [-0.79, WT])
  }

  // 아치 — 홍예받침 안쪽 모서리(±2, 6)에서 꼭대기(0, 7.05)로 오르는 두 빗변을 따라 홍예돌 넷씩 (하나 걸러 조금 내민다), 가운데 쐐기돌
  const [spring, apex, half, band] = [6.0, 7.05, 2.0, 0.95]
  const length = Math.hypot(half, apex - spring)
  const [ux, uy] = [-half / length, (apex - spring) / length]
  const [nx, ny] = [(apex - spring) / length, half / length]
  const stones = 4
  room.mode(6)
  for (const side of [-1, 1])
    for (let i = 0; i < stones; i++) {
      // 꼭대기 쪽 마지막 돌은 쐐기돌 밑으로 물린다
      const [s0, s1] = [(i / stones) * length, Math.min(((i + 1) / stones) * length, length - 0.18)]
      const at = (s, out) => [side * (half + ux * s + nx * out), spring + uy * s + ny * out]
      // 받침에 앉는 첫 돌은 밑변을 받침 윗면(수평)에 맞춘다
      const foot = i === 0 ? [[side * (half + band / ny + 0.02), spring]] : [at(s0, band)]
      runPoly(room, run, i % 2 ? 'stone_lt' : 'trim_dk', [at(s0, 0), at(s1, 0), at(s1, band), ...foot], [i % 2 ? -0.7 : -0.76, 0.32])
    }
  runPoly(room, run, 'granite', [[-0.3, apex - 0.16], [0.3, apex - 0.16], [0.46, apex + band + 0.14], [-0.46, apex + band + 0.14]], [-0.84, 0.32])
  room.mode(4)
  room.shape('box', 'onyx_teal', onRun(run, 0, apex + 0.48, -0.84), run.d % 2 === 0 ? [0.3, 0.3, 0.05] : [0.05, 0.3, 0.3], run.d % 2 === 0 ? 'rot 0 0 45' : 'rot 0 45 0')
  // 문지방 — 포털 밑의 다듬은 돌과 청동 띠
  runBox(room, run, 'path', [-2.0, 2.0], [0, 0.05], [-0.7, 0.9])
  runBox(room, run, 'bronze', [-1.9, 1.9], [0.05, 0.075], [-0.12, 0.12])
}

/** 직사각형에서 구멍들을 뺀 나머지를 겹치지 않는 직사각형들로 */
function minus([x0, z0, x1, z1], holes) {
  const xs = [...new Set([x0, x1, ...holes.flatMap(([a, , b]) => [a, b])])].filter((v) => v >= x0 && v <= x1).sort((a, b) => a - b)
  const zs = [...new Set([z0, z1, ...holes.flatMap(([, a, , b]) => [a, b])])].filter((v) => v >= z0 && v <= z1).sort((a, b) => a - b)
  const out = []
  for (let j = 0; j + 1 < zs.length; j++) {
    // 같은 줄에서 이웃한 칸은 붙인다
    let open = null
    for (let i = 0; i + 1 < xs.length; i++) {
      const [cx, cz] = [(xs[i] + xs[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2]
      const holed = holes.some(([a, b, c, e]) => cx > a && cx < c && cz > b && cz < e)
      if (holed) {
        if (open) out.push(open)
        open = null
      } else if (open) open[2] = xs[i + 1]
      else open = [xs[i], zs[j], xs[i + 1], zs[j + 1]]
    }
    if (open) out.push(open)
  }
  return out
}

/** 각기둥 하나 — 밑돌, 주춧돌, 모따기한 몸(청동 띠와 오닉스 띠), 기둥머리, 머릿돌 */
function pillar(room, x, z, w) {
  const h = w / 2
  room.block([x - h - 0.4, 0, z - h - 0.4], [x + h + 0.4, 0.7, z + h + 0.4])
  room.block([x - h, 0.7, z - h], [x + h, H - 0.7, z + h])
  // 정사각 단을 위로 좁히거나 벌리는 것 — 네모뿔대 (cyl 의 네 각을 45 도 돌려 면이 축에 나란하게)
  const taper = (skin, y0, y1, low, high) => room.shape('cyl', skin, [x, (y0 + y1) / 2, z], [low * Math.SQRT2, y1 - y0], `sides 4 top ${n(high * Math.SQRT2)} rot 45 0 0`)
  /** 모따기한 정사각 단면 (반폭 r) */
  const octagon = (r) => {
    const c = r * 0.24
    return [[r - c, -r], [r, -r + c], [r, r - c], [r - c, r], [-r + c, r], [-r, r - c], [-r, -r + c], [-r + c, -r]]
  }
  room.mode(8)
  room.box('stone_dk', [x - h - 0.4, 0, z - h - 0.4], [x + h + 0.4, 0.5, z + h + 0.4], 'lm -y 0.5')
  room.mode(5)
  taper('stone_lt', 0.5, 0.74, h + 0.34, h + 0.12)
  room.box('stone_lt', [x - h - 0.12, 0.74, z - h - 0.12], [x + h + 0.12, 0.92, z + h + 0.12])
  room.mode(8)
  room.prism('shaft', [x, (0.9 + H - 1.2) / 2, z], H - 1.2 - 0.9 + 0.04, octagon(h))
  room.mode(4)
  room.prism('bronze', [x, 2.62, z], 0.16, octagon(h + 0.025))
  room.prism('onyx_teal', [x, 2.86, z], 0.14, octagon(h + 0.012))
  room.prism('bronze', [x, 3.1, z], 0.08, octagon(h + 0.025))
  room.mode(5)
  taper('stone_lt', H - 1.22, H - 0.82, h + 0.06, h + 0.36)
  room.box('stone_lt', [x - h - 0.44, H - 0.82, z - h - 0.44], [x + h + 0.44, H - 0.58, z + h + 0.44])
}

/** 들보 하나 — 아래 두 모서리를 모따기한 단면을 긴 축으로 민다 */
function beam(room, [x0, y0, z0, x1, y1, z1]) {
  const alongX = x1 - x0 > z1 - z0
  const [half, c] = [(alongX ? z1 - z0 : x1 - x0) / 2, 0.14]
  const middle = alongX ? (z0 + z1) / 2 : (x0 + x1) / 2
  const profile = [[middle - half, y1], [middle + half, y1], [middle + half, y0 + c], [middle + half - c, y0], [middle - half + c, y0], [middle - half, y0 + c]]
  // axis x 의 단면은 (z, y), axis z 의 단면은 (x, y)
  if (alongX) room.prism('trim_dk', [(x0 + x1) / 2, 0, 0], x1 - x0, profile, 'axis x')
  else room.prism('trim_dk', [0, 0, (z0 + z1) / 2], z1 - z0, profile, 'axis z')
}

/** Two floors, with a continuous bypass beside both opposed staircases. */
function upperGallery(room, { outer, inner, lane, stair, width = 2.4, bottom = 0 }) {
  const height = 3.5
  const holes = [[-stair - width / 2, -12, -stair + width / 2, -4], [stair - width / 2, 4, stair + width / 2, 12]]
  const footprint = [[-outer, -12.5, -inner, 12.5], [inner, -12.5, outer, 12.5], [-inner, -12.5, inner, -10], [-inner, 10, inner, 12.5]]
  room.section('2층 회랑과 서로 반대쪽의 두 계단 — 지붕 아래 실제 보행 경로')
  room.mode(6)
  for (const rect of footprint) for (const [x0, z0, x1, z1] of minus(rect, holes)) {
    room.block([x0, 3.2, z0], [x1, height, z1])
    room.box('floor', [x0, 3.2, z0], [x1, height, z1], 'lm -y 3')
  }
  room.mode(5)
  for (const [x, z, yaw] of [[-stair, -8, 0], [stair, 8, 180]]) {
    room.raw('solid on')
    room.shape('stairs', 'stone_lt', [x, 1.75, z], [width, height, 8], `14 rot ${yaw} 0 0`)
    room.raw('solid off')
  }
  for (const sign of [-1, 1]) {
    const x = sign * (outer - 0.06)
    room.block([x - 0.06, height, -10], [x + 0.06, height + 0.9, 10])
    room.box('stone_dk', [x - 0.06, height, -10], [x + 0.06, height + 0.9, 10])
    room.box('bronze', [x - 0.075, height + 0.9, -10], [x + 0.075, height + 0.94, 10])
  }
  const nodes = [
    [-stair, bottom, -3], [-stair, 0.75, -4.9], [-stair, 2.25, -8], [-stair, height, -11.7],
    [stair, bottom, 3], [stair, 0.75, 4.9], [stair, 2.25, 8], [stair, height, 11.7],
    [-lane, height, -11.25], [-lane, height, 0], [-lane, height, 11.25],
    [lane, height, -11.25], [lane, height, 0], [lane, height, 11.25],
    [0, height, -11.25], [0, height, 11.25],
  ]
  for (const p of nodes) room.raw(`waypoint ${p.map(n).join(' ')}`)
}

function build(spec) {
  const room = new Room(spec)
  room.raw(`# ${spec.title}`)
  room.raw('# 이 파일은 game/tools/art/make-rooms.mjs 가 적는다 — 고치려면 그 도구의 틀 정의를 고쳐 다시 돌린다 (손으로 고친 것은 덮어쓰인다).')
  room.raw('# 방 가운데가 원점, 바닥 윗면이 y 0, 북쪽이 -z. 칸은 32 m × 32 m 이고 문 자리는 칸의 변의 가운데(방 가운데에서 16 m)다 — 문 자리: ' + (spec.sites.map((d) => DIRS[d]).join(' ') || '없음') + '.')
  room.raw('# 틀은 닫힌 실내다 (바닥·벽·천장·창·문틀이 통째로) — 방마다 90 도 단위로 돌려 놓는다 (domain/dungeon.hpp). 빛은 이 좌표에서 굽는다: 해는 남동쪽이라 동·남쪽 벽의 창과 천장의 채광 구멍으로 볕이 든다.')
  room.raw('# 하늘거주지(코르 마킨디 제국이 띄운 부유 요새의 유적 — docs/lore.md)의 내부. 그 내부의 생김새는 공식 자료에 없어 이 게임이 지었다:')
  room.raw('# 검게 풍화된 돌의 높은 홀, 각진 아치와 모따기한 각기둥, 몰딩과 벽기둥, 청록·호박색 오닉스와 삭은 청동, 색유리창, 룬빛 헤드론과 등불. 탁류가 찢은 바닥은 검은 심연으로 이어진다.')
  room.raw('# 도형은 부딪히지 않는다 — 충돌은 block 줄이 낸다 (밑단·벽·문설주·기둥의 단순한 상자).')
  room.raw('')
  for (const line of SKINS) room.raw(line)
  room.raw('solid off')

  // 바닥
  room.section('바닥')
  room.mode(10)
  for (const rect of spec.floor) for (const [x0, z0, x1, z1] of minus(rect, spec.chasms ?? [])) {
    room.block([x0, -1, z0], [x1, 0, z1])
    room.box('floor', [x0, -1, z0], [x1, 0, z1], 'lm -y 0.25')
  }

  // The Roil has torn open these floors. The black depth is visual only;
  // collision follows the surviving slabs, so jumping over an edge is real.
  for (const [x0, z0, x1, z1] of spec.chasms ?? []) {
    room.mode(2)
    const depth = spec.chasmDepth ?? 24
    room.box('abyss', [x0, -depth - 0.1, z0], [x1, -depth, z1])
    // Only the fractured lip can catch light. The deep shaft has zero albedo,
    // so brighter lamps cannot reveal its walls or a visible stone bottom.
    for (const [skin, bottom, top] of [['stone_dk', -2, 0], ['abyss', -depth, -2]]) {
      room.box(skin, [x0 - 0.12, bottom, z0], [x0, top, z1])
      room.box(skin, [x1, bottom, z0], [x1 + 0.12, top, z1])
      room.box(skin, [x0, bottom, z0 - 0.12], [x1, top, z0])
      room.box(skin, [x0, bottom, z1], [x1, top, z1 + 0.12])
    }
    room.mode(5)
    // Broken masonry teeth catch the rim light without blocking movement.
    for (const [x, z] of [[x0, z0], [x1, z1]]) {
      room.box('shaft', [x - 0.18, -1.7, z - 0.18], [x + 0.18, -0.35, z + 0.18])
      room.shape('oct', 'stone_dk', [x, -2.2, z], [0.22, 0.9, 0.22])
    }
    room.mode(0.5)
    room.box('rune', [x0 - 0.06, 0.028, z0 + 0.24], [x0 + 0.06, 0.05, z1 - 0.24])
    room.box('rune', [x1 - 0.06, 0.028, z0 + 0.24], [x1 + 0.06, 0.05, z1 - 0.24])
  }

  // 벽 — 바닥 모양의 가장자리를 따라. 방의 모퉁이에서는 벽 두께만큼 더 뻗어 모퉁이를 메운다
  const state = { window: 0, niche: 0, glass: 0 }
  const runs = wallRuns(room)
  for (const d of spec.sites) {
    const run = runs.find((r) => r.d === d && Math.abs(r.at) === DOOR && r.from < -DOOR_CLEAR && r.to > DOOR_CLEAR)
    if (!run) throw new Error(`${spec.name}: ${DIRS[d]} 쪽에 문 자리를 낼 벽이 없다`)
    run.door = true
  }
  for (const run of runs) {
    room.section(`${DIRS[run.d]} 쪽 벽 (${run.d % 2 === 0 ? 'z' : 'x'} ${n(run.at)}, ${n(run.from)} … ${n(run.to)})`)
    state.window = 0
    // 끝 너머의 안쪽 자리가 방 밖이면 방의 모퉁이다 (벽이 안으로 꺾인다). 아니면 벽이 밖으로 꺾인다 (ㄱ·십자·T 자의 안쪽 귀)
    const corner = (t, sign) => {
      const [x, , z] = onRun(run, t + sign * 0.3, 0, -0.3)
      return !room.inside(x, z) ? 'in' : 'out'
    }
    const ends = [corner(run.from, -1), corner(run.to, 1)]
    const from = run.from - (ends[0] === 'in' ? WT : 0)
    const to = run.to + (ends[1] === 'in' ? WT : 0)
    const pattern = spec.windows[DIRS[run.d]] ?? ''
    if (run.door) {
      wallSpan(room, run, from, -DOOR_CLEAR, pattern, state, [run.from, -DOOR_CLEAR], [ends[0], 'flat'])
      wallSpan(room, run, DOOR_CLEAR, to, pattern, state, [DOOR_CLEAR, run.to], ['flat', ends[1]])
      doorway(room, run.d)
    } else wallSpan(room, run, from, to, pattern, state, [run.from, run.to], ends)
  }

  // 천장 — 채광 구멍을 뺀 회벽 판, 들보, 들보 사이의 우물천장 살
  room.section('천장과 들보')
  room.mode(3)
  const holes = (spec.skylights ?? []).map(([x, z, size]) => [x - size / 2, z - size / 2, x + size / 2, z + size / 2])
  for (const rect of spec.floor) for (const [x0, z0, x1, z1] of minus(rect, holes)) room.box('ceiling', [x0, H, z0], [x1, H + ROOF, z1], 'lm +y 0.25')
  for (const [x0, z0, x1, z1] of holes) {
    // 채광 구멍의 테 — 지붕 위로 솟은 낮은 턱 (구멍으로 올려다보면 보인다) 과, 천장 밑으로 내린 다듬은 돌의 테두리
    room.mode(3)
    room.box('stone_dk', [x0 - 0.3, H + ROOF, z0 - 0.3], [x1 + 0.3, H + ROOF + 0.4, z0], 'lm +y 0.5')
    room.box('stone_dk', [x0 - 0.3, H + ROOF, z1], [x1 + 0.3, H + ROOF + 0.4, z1 + 0.3], 'lm +y 0.5')
    room.box('stone_dk', [x0 - 0.3, H + ROOF, z0], [x0, H + ROOF + 0.4, z1], 'lm +y 0.5')
    room.box('stone_dk', [x1, H + ROOF, z0], [x1 + 0.3, H + ROOF + 0.4, z1], 'lm +y 0.5')
    room.mode(4)
    // (얕게 — 깊이 내리면 비껴 드는 볕을 그만큼 가린다)
    room.box('stone_lt', [x0 - 0.4, H - 0.09, z0 - 0.4], [x1 + 0.4, H + 0.02, z0])
    room.box('stone_lt', [x0 - 0.4, H - 0.09, z1], [x1 + 0.4, H + 0.02, z1 + 0.4])
    room.box('stone_lt', [x0 - 0.4, H - 0.09, z0], [x0, H + 0.02, z1])
    room.box('stone_lt', [x1, H - 0.09, z0], [x1 + 0.4, H + 0.02, z1])
  }
  room.mode(4)
  for (const box of spec.beams ?? []) {
    beam(room, box)
    // 들보가 벽에 닿는 끝마다 까치발 — 벽에서 내민 받침돌 (처마 돌림띠 밑으로 내려온다)
    const [x0, y0, z0, x1, , z1] = box
    const alongX = x1 - x0 > z1 - z0
    const [mid, half] = alongX ? [(z0 + z1) / 2, (z1 - z0) / 2 + 0.06] : [(x0 + x1) / 2, (x1 - x0) / 2 + 0.06]
    for (const [end, sign] of alongX ? [[x0, 1], [x1, -1]] : [[z0, 1], [z1, -1]]) {
      // 끝 너머가 방 밖이면 벽이다
      if (alongX ? room.inside(end - sign * 0.3, mid) : room.inside(mid, end - sign * 0.3)) continue
      const profile = [[0, y0 + 0.02], [0.62, y0 + 0.02], [0.62, y0 - 0.1], [0.5, y0 - 0.22], [0.16, y0 - 0.72], [0, y0 - 0.72]].map(([d, y]) => [end + sign * d, y])
      if (alongX) room.prism('stone_lt', [0, 0, mid], 2 * half, profile, 'axis z')
      else room.prism('stone_lt', [mid, 0, 0], 2 * half, profile, 'axis x')
    }
  }
  // 우물천장의 살 — 바닥의 직사각형마다 2.67 m 쯤의 격자로. 들보와 겹치는 줄, 채광 구멍에 걸리는 줄은 뺀다
  room.mode(3)
  const [RIB, RIB_DROP] = [0.3, 0.22]
  for (const [x0, z0, x1, z1] of spec.floor) {
    for (const axis of ['x', 'z']) {
      const [from, to] = axis === 'x' ? [z0, z1] : [x0, x1]
      const count = Math.round((to - from) / 2.67)
      for (let i = 1; i < count; i++) {
        const at = from + ((to - from) * i) / count
        const rib = axis === 'x' ? [x0, H - RIB_DROP, at - RIB / 2, x1, H + 0.02, at + RIB / 2] : [at - RIB / 2, H - RIB_DROP, z0, at + RIB / 2, H + 0.02, z1]
        const overlaps = ([a0, , b0, a1, , b1]) => rib[0] < a1 + 0.35 && rib[3] > a0 - 0.35 && rib[2] < b1 + 0.35 && rib[5] > b0 - 0.35
        // 같은 쪽으로 뻗는 들보와 겹치면 뺀다 (가로지르는 들보는 그대로 지난다)
        const parallel = (spec.beams ?? []).some((b) => (b[3] - b[0] > b[5] - b[2]) === (axis === 'x') && overlaps(b))
        const holed = holes.some(([a0, b0, a1, b1]) => rib[0] < a1 + 0.35 && rib[3] > a0 - 0.35 && rib[2] < b1 + 0.35 && rib[5] > b0 - 0.35)
        if (!parallel && !holed) room.box('trim_dk', rib.slice(0, 3), rib.slice(3))
      }
    }
  }

  if (spec.pillars?.length) room.section('각기둥')
  for (const [x, z, w = 2.0] of spec.pillars ?? []) pillar(room, x, z, w)

  room.section('손으로 적은 것 — 바닥 무늬, 단, 헤드론, 빛, 소품, 길의 점')
  room.density = null
  for (const line of spec.extra.trim().split('\n')) {
    const words = line.trim().split(/\s+/)
    if (words[0] !== '@sconce') {
      room.raw(line.trim())
      continue
    }
    // 벽의 등 — 그 벽의 가장 가까운 벽기둥에 건다 (2.6 m 안에 없으면 적은 자리 그대로)
    const [x, z, side, kind, power, reach] = [Number(words[1]), Number(words[2]), words[3], words[4], Number(words[5]), Number(words[6])]
    const near = room.marks.filter((m) => m.side === side).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0]
    const at = near && Math.hypot(near.x - x, near.z - z) < 2.6 ? near : { x, z }
    room.marks = room.marks.filter((m) => m !== near || at !== near)
    let built = fixture(at.x, at.z, side, kind, power, reach)
    if (room.spec.upper) {
      // Raise the whole sconce, not only its light: new slabs would otherwise
      // enclose emitters and cut through the visible lamp bodies.
      built = built.split('\n').map(line => {
        const words = line.split(/\s+/)
        const y = words[0] === 'light' ? 2 : ['box', 'oct', 'prop'].includes(words[0]) ? 3 : -1
        if (y >= 0) words[y] = n(Number(words[y]) + 3.5)
        return words.join(' ')
      }).join('\n')
    }
    for (const part of built.split('\n')) room.raw(part)
  }
  if (spec.upper) upperGallery(room, spec.upper)
  const path = join(OUT, `${spec.name}.mesh.txt`)
  const text = room.lines.join('\n') + '\n'
  // Keep unchanged source timestamps so a two-room lighting edit only rebakes
  // those rooms; running this generator alone must not invalidate every atlas.
  if (!existsSync(path) || readFileSync(path, 'utf8') !== text) writeFileSync(path, text)
  console.log(`${spec.name}: ${room.lines.length} 줄`)
}

/** 들보 — 직사각형 [x0, z0, x1, z1] 을 가로지르는 들보를 axis 를 따라 pitch 마다 */
function beams([x0, z0, x1, z1], axis, pitch = 5.33) {
  const out = []
  const [from, to] = axis === 'x' ? [z0, z1] : [x0, x1]
  const count = Math.max(1, Math.round((to - from) / pitch) - 1)
  for (let i = 1; i <= count; i++) {
    const at = from + ((to - from) * i) / (count + 1)
    out.push(axis === 'x' ? [x0, H - 0.9, at - 0.4, x1, H, at + 0.4] : [at - 0.4, H - 0.9, z0, at + 0.4, H, z1])
  }
  return out
}

/** 빛나는 헤드론 조각 — 작은 팔면체와 그 자리의 빛 (청록 룬빛) */
const shard = (x, y, z, power = 3.2, reach = 11) =>
  `lightmap 0.5\noct rune ${n(x)} ${n(y)} ${n(z)}  0.22 0.5 0.22 rot ${Math.round((x * 37 + z * 53) % 90)} 0 0\nlight ${n(x)} ${n(y)} ${n(z)} #a9efe3 ${n(power)} ${n(reach)} 0.25`
/**
 * 벽의 등 — (x, z) 는 벽 안쪽 면의 자리, side 는 그 벽이 막는 쪽(N·E·S·W).
 * rune: 돌 까치발과 청동 받침 위에 뜬 룬빛 헤드론 조각.  ember: 청동 팔에 사슬로 매단 놋쇠 등 (불꽃은 빛나는 조각, 빛은 등 바로 밑에서 — 따뜻한 빛 웅덩이).
 * 틀 정의에는 sconce 로 적고(표시 한 줄), 벽을 다 쌓은 뒤 가장 가까운 벽기둥에 맞춰 fixture 가 도형으로 푼다
 */
const sconce = (x, z, side, kind, power, reach) => `@sconce ${x} ${z} ${side} ${kind} ${power} ${reach}`
const fixture = (x, z, side, kind, power, reach) => {
  const [dx, dz] = { N: [0, 1], E: [-1, 0], S: [0, -1], W: [1, 0] }[side]
  const along = (length, thick) => (dx ? [length, thick, 0.16] : [0.16, thick, length])
  if (kind === 'rune')
    return [
      'lightmap 4',
      `box granite ${n(x + dx * 0.42)} 2.5 ${n(z + dz * 0.42)}  ${(dx ? [0.9, 0.26, 0.4] : [0.4, 0.26, 0.9]).join(' ')}`,
      `box stone_lt ${n(x + dx * 0.2)} 2.22 ${n(z + dz * 0.2)}  ${(dx ? [0.44, 0.32, 0.3] : [0.3, 0.32, 0.44]).join(' ')}`,
      `box bronze ${n(x + dx * 0.72)} 2.68 ${n(z + dz * 0.72)}  ${(dx ? [0.52, 0.1, 0.62] : [0.62, 0.1, 0.52]).join(' ')}`,
      shard(x + dx * 0.72, 3.38, z + dz * 0.72, power, reach),
    ].join('\n')
  const [lx, lz] = [x + dx * 0.85, z + dz * 0.85]
  return [
    'lightmap 4',
    `box stone_lt ${n(x + dx * 0.1)} 3.82 ${n(z + dz * 0.1)}  ${(dx ? [0.22, 0.56, 0.36] : [0.36, 0.56, 0.22]).join(' ')}`,
    `box bronze ${n(x + dx * 0.52)} 3.98 ${n(z + dz * 0.52)}  ${along(1.0, 0.07).join(' ')}`,
    `box bronze ${n(x + dx * 0.3)} 3.72 ${n(z + dz * 0.3)}  ${along(0.62, 0.06).join(' ')} rot ${dx ? `0 0 ${dx > 0 ? 40 : -40}` : `0 ${dz > 0 ? -40 : 40} 0`}`,
    // 등의 높이는 1.14 m (사슬까지) — 꼭대기가 팔에 닿게 건다
    `prop brass_lantern ${n(lx)} 2.82 ${n(lz)}  ${Math.round(Math.abs(x * 31 + z * 17) % 360)} 1.0`,
    'lightmap 0.5',
    `oct flame ${n(lx)} 3.12 ${n(lz)}  0.06 0.13 0.06`,
    `light ${n(lx)} 2.7 ${n(lz)} #ffc98a ${n(power)} ${n(reach)} 0.22`,
  ].join('\n')
}
/** 돌 화덕 — 바닥의 화덕(부딪힌다)과 그 위의 불꽃(빛나는 조각 셋), 따뜻한 빛 */
const brazier = (x, z, power = 4.2, reach = 10) =>
  [
    `prop fire_pit ${n(x)} 0 ${n(z)}  ${Math.round(Math.abs(x * 13 + z * 29) % 360)} 1.0`,
    'lightmap 0.5',
    `oct flame ${n(x)} 0.62 ${n(z)}  0.16 0.42 0.16 rot 20 0 0`,
    `oct flame ${n(x - 0.2)} 0.5 ${n(z + 0.12)}  0.11 0.26 0.11 rot 50 0 8`,
    `oct ember ${n(x + 0.18)} 0.46 ${n(z - 0.16)}  0.1 0.2 0.1 rot 75 0 -10`,
    `light ${n(x)} 1.15 ${n(z)} #ffb46a ${n(power)} ${n(reach)} 0.3`,
  ].join('\n')

const SPECS = [
  {
    name: 'room_start',
    title: '시작 방 — 적이 없는 방. 네 쪽에 문간이 달린 정사각 방이고, 채광 구멍 밑에 큰 헤드론이 떠 있다.',
    sites: [0, 1, 2, 3],
    floor: [
      [-12, -12, 12, 12],
      [-5, -16, 5, -12],
      [-5, 12, 5, 16],
      [12, -5, 16, 5],
      [-16, -5, -12, 5],
    ],
    windows: { N: 'n', E: 'g', S: 'g', W: 's' },
    skylights: [[2.1, 2.4, 3.6]],
    beams: [
      [-12, H - 0.9, -6.4, 12, H, -5.6],
      [-12, H - 0.9, 5.6, 12, H, 6.4],
      [-6.4, H - 0.9, -12, -5.6, H, 12],
      [5.6, H - 0.9, -12, 6.4, H, 12],
    ],
    extra: `
      lightmap 4
      # 문으로 가는 돌길과 가운데의 무늬 — 모자이크의 마름모, 호박색 오닉스의 테, 청록 오닉스의 띠
      box path 0 0.012 0    2.6 0.024 31
      box path 0 0.014 0   31 0.028 2.6
      box onyx_teal  0 0.023 -8.5   17 0.016 0.3
      box onyx_teal  0 0.023  8.5   17 0.016 0.3
      box onyx_teal  -8.5 0.023 0   0.3 0.016 17
      box onyx_teal   8.5 0.023 0   0.3 0.016 17
      box onyx_amber 0 0.024 0   4.8 0.02 4.8 rot 45 0 0
      box mosaic 0 0.03 0   4.1 0.02 4.1 rot 45 0 0
      box moss  -9.5 0.012 -9.5   4 0.024 4
      box moss   9.5 0.012  9     4 0.024 5
      box drift -9.8 0.01 9.6   4 0.02 4 rot 20 0 0
      # 채광 구멍 밑에 뜬 큰 헤드론 — 볕이 그 한쪽을 비춘다
      lightmap 8
      oct hedron 0 5.6 0   1.3 2.9 1.3 rot 25 0 0
      lightmap 0.5
      box rune 0 5.6 0   1.9 0.07 1.9 rot 70 0 0
      # 구석의 등과 화덕
      ${sconce(-12, -9.5, 'W', 'rune', 3.6, 11)}
      ${sconce(9.5, -12, 'N', 'ember', 3.6, 10)}
      ${sconce(-9.5, 12, 'S', 'ember', 3.6, 10)}
      ${brazier(-10.4, -10.4, 3.6, 9)}
      ${sconce(12, 8, 'E', 'rune', 6.0, 10)}
      ${shard(0, 2.2, 0, 7.0, 12)}
      # 소품 — 구석의 기물과 잔해, 풀
      prop rock_mid_c   10.2 0  10.4   20 1.0
      prop fern_a        8.6 0  10.6  210 1.0
      prop rubble_a     10.6 0   8.4   80 1.0
      prop barrel       10.6 0 -10.6   30 1.0
      prop crate         9.0 0 -10.8   12 1.0
      prop jug          10.7 0  -9.0  140 1.0
      prop amphora     -10.6 0   8.6   60 1.0
      prop vase_c      -10.7 0   9.9  200 1.0
      prop nettle_a     -9.2 0  10.6   30 1.0
      prop shrub_a     -10.6 0  10.8   30 1.0
      prop weed_a       -3.0 0  -4.4  250 1.0
      prop rubble_b     -4.6 0  -2.6  170 0.8
      prop stone_b       4.2 0  -3.6   70 0.7
    `,
  },
  {
    name: 'room_hall',
    upper: { outer: 14, inner: 9.8, lane: 13.1, stair: 11 },
    title: '전투방 틀 — 정사각 홀. 굵은 각기둥 넷이 천장을 받치고, 가운데로 채광 구멍의 볕이 떨어진다.',
    sites: [0, 1, 2, 3],
    floor: [[-16, -16, 16, 16]],
    windows: { N: 'sn', E: 'gs', S: 'sg', W: 'ns' },
    skylights: [[5.3, 6.1, 3.6], [13, -4.5, 3.6]],
    pillars: [
      [-8.5, -8.5, 2.2],
      [8.5, -8.5, 2.2],
      [-8.5, 8.5, 2.2],
      [8.5, 8.5, 2.2],
    ],
    beams: [
      [-16, H - 0.9, -9, 16, H, -8],
      [-16, H - 0.9, 8, 16, H, 9],
      [-9, H - 0.9, -16, -8, H, 16],
      [8, H - 0.9, -16, 9, H, 16],
    ],
    extra: `
      lightmap 4
      box path 0 0.012 0    2.6 0.024 31
      box path 0 0.014 0   31 0.028 2.6
      box onyx_teal  0 0.023 -12.5   25 0.016 0.35
      box onyx_teal  0 0.023  12.5   25 0.016 0.35
      box onyx_teal  -12.5 0.023 0   0.35 0.016 25
      box onyx_teal   12.5 0.023 0   0.35 0.016 25
      box onyx_amber 0 0.024 0   5.2 0.02 5.2 rot 45 0 0
      box mosaic 0 0.03 0   4.4 0.02 4.4 rot 45 0 0
      box moss  -13 0.012 -13.5   5 0.024 3
      box moss   13 0.012  13     5 0.024 4
      box moss  -13.5 0.012 9     3 0.024 6
      box drift  12.6 0.01 -12.2   4.4 0.02 5 rot -30 0 0
      # 어두운 북서쪽을 밝히는 등과 화덕
      ${sconce(-16, -11, 'W', 'rune', 4.8, 12)}
      ${sconce(-16, 6, 'W', 'ember', 4.2, 11)}
      ${sconce(-6, -16, 'N', 'ember', 4.0, 10)}
      ${sconce(11, -16, 'N', 'rune', 3.6, 10)}
      ${sconce(-11, 16, 'S', 'ember', 3.8, 10)}
      ${brazier(-14.2, -14.2, 4.6, 11)}
      # 기둥 가까이의 작은 룬빛 조각 — 큰 세기로 벽등을 태우지 않고 그림자를 낸다
      ${shard(12.0, 5.5, -8.5, 6.4, 10)}
      ${shard(12.0, 5.5, 8.5, 6.4, 10)}
      # 소품 — 구석의 기물과 바위, 기둥 발치의 잔해와 풀
      prop rock_big_b   13.6 0 -13.8  100 0.8
      prop rubble_a     11.6 0 -14.2   80 1.0
      prop boulder     -13.8 0  13.6  160 0.9
      prop fern_b      -11.6 0  13.9  330 1.0
      prop barrel       14.4 0  14.4   50 1.0
      prop barrel       13.0 0  14.6  110 1.0
      prop crate        14.5 0  12.8   20 1.0
      prop brass_pot    13.2 0  13.2  300 1.0
      prop chest       -14.4 0  11.4   90 1.0
      prop rubble_a     -6.6 0 -10.4   10 0.7
      prop rubble_b     -7.0 0  -6.6  130 0.9
      prop stone_b      10.4 0  -9.8  220 0.9
      prop rubble_b     10.4 0   7.0   40 0.8
      prop nettle_b     10.5 0  10.2  190 1.0
      prop weed_b        6.6 0  10.3    0 1.0
      prop root        -14.9 0  -2.0   90 1.0
      waypoint 0 0 0
      waypoint 0 0 -11.5
      waypoint 13.1 0 0
      waypoint 0 0 11.5
      waypoint -13.1 0 0
      waypoint -13.1 0 -11.5
      waypoint 11.5 0 -11.5
      waypoint 13.1 0 11.5
      waypoint -11.5 0 11.5
    `,
  },
  {
    name: 'room_nave',
    upper: { outer: 8.8, inner: 4.6, lane: 5.8, stair: 8, width: 1.8 },
    title: '심연 전용 전투방 — 방의 대부분이 길이 26 m, 깊이 24 m의 검은 낭떠러지다. 중앙의 좁은 돌다리와 양 끝의 승강장, 벽 옆 회랑이 이어진다.',
    sites: [0, 2],
    floor: [[-9, -16, 9, 16]],
    chasms: [[-7.2, -13, -1.3, 13], [1.3, -13, 7.2, 13]],
    chasmDepth: 24,
    windows: { N: 's', E: 'gsg', S: 'g', W: 'sn' },
    skylights: [
      [2.0, 0, 2.6],
      [2.0, 7.0, 2.6],
      [8.3, -5.5, 3.4],
    ],
    pillars: [-15.2, 15.2].flatMap((z) => [
      [-5, z, 0.8],
      [5, z, 0.8],
    ]),
    beams: [-10.5, -3.5, 3.5, 10.5].map((z) => [-9, H - 0.9, z - 0.4, 9, H, z + 0.4]),
    extra: `
      lightmap 4
      box path 0 0.012 0    2.6 0.024 31
      box onyx_teal  -1.15 0.023 0   0.12 0.016 30
      box onyx_teal   1.15 0.023 0   0.12 0.016 30
      box onyx_amber 0 0.024 0   1.6 0.02 1.6 rot 45 0 0
      box mosaic 0 0.03 0   1.3 0.02 1.3 rot 45 0 0
      box moss  -7.4 0.012 -14.5   2.4 0.024 1.8
      box drift -7.2 0.01 14.5   3 0.02 1.8
      # 서쪽 통로의 등 — 볕이 닿지 않는 쪽
      ${sconce(-9, -12.4, 'W', 'rune', 4.2, 11)}
      ${sconce(-9, 0, 'W', 'ember', 4.2, 11)}
      ${sconce(-9, 12.4, 'W', 'ember', 3.8, 10)}
      ${sconce(6.5, -16, 'N', 'rune', 3.4, 9)}
      ${brazier(-6.8, -15.2, 3.8, 9)}
      ${sconce(9, -3.5, 'E', 'rune', 6.0, 9)}
      ${sconce(9, 10.5, 'E', 'ember', 6.0, 9)}
      prop rubble_a     -7.6 0  14.6  300 0.8
      prop rock_mid_a    7.5 0  15.3   60 0.8
      prop fern_a        7.4 0  12.4   40 1.0
      prop amphora       7.9 0 -14.9  140 1.0
      prop vase_a        7.0 0 -15.1   20 1.0
      prop clay_pot      6.7 0 -15.0   80 1.0
      prop rubble_b     -7.6 0   3.4  140 0.8
      prop weed_a        7.6 0  -1.0   90 1.0
      prop stone_b       8.1 0  -9.0  220 0.8
      prop nettle_a     -7.9 0  10.0   10 1.0
      waypoint 0 0 -13.7
      waypoint 0 0 0
      waypoint 0 0 13.7
      waypoint -8 0 -13.7
      waypoint -8 0 0
      waypoint -8 0 13.7
      waypoint 8 0 -13.7
      waypoint 8 0 0
      waypoint 8 0 13.7
    `,
  },
  {
    name: 'room_ell',
    title: '전투방 틀 — ㄱ 자. 북쪽 팔과 동쪽 팔이 모퉁이에서 만난다 (모퉁이 너머는 보이지 않는다).',
    sites: [0, 1],
    floor: [
      [-6, -16, 6, 6],
      [6, -6, 16, 6],
    ],
    windows: { N: 's', E: 'gs', S: 'gsg', W: 'sns' },
    skylights: [[3.6, 3.6, 3.0]],
    beams: [...beams([-6, -16, 6, 6], 'x', 5.5), ...beams([6, -6, 16, 6], 'z', 5)],
    extra: `
      lightmap 4
      box path 0 0.012 -8      2.6 0.024 16
      box path 8.65 0.012 0   14.7 0.024 2.6
      box onyx_amber 0 0.024 0   3.8 0.02 3.8 rot 45 0 0
      box mosaic 0 0.03 0   3.2 0.02 3.2 rot 45 0 0
      box onyx_teal  -4.2 0.023 -5   0.3 0.016 20
      box onyx_teal   5.5 0.023 4.2  19 0.016 0.3
      box moss  -4.4 0.012 -1.2   2.6 0.024 2.6
      box moss   13.6 0.012 -4.4   3.6 0.024 2.4
      box drift -4.2 0.01 -13.6   2.8 0.02 3.6 rot 12 0 0
      # 모퉁이 안쪽에 선 부러진 기둥 밑동 — 낮은 엄폐물
      block -3.6 0.45 2.8   1.8 0.9 1.8
      block -3.6 1.5 2.8    1.3 1.2 1.3
      lightmap 8
      box stone_dk -3.6 0.3 2.8   1.8 0.6 1.8
      cyl stone_lt -3.6 0.75 2.8   1.2 0.3 sides 4 top 0.98 rot 45 0 0
      prism shaft -3.6 1.5 2.8  1.24  8  0.49 -0.65  0.65 -0.49  0.65 0.49  0.49 0.65  -0.49 0.65  -0.65 0.49  -0.65 -0.49  -0.49 -0.65
      box shaft -3.6 2.2 2.8    0.9 0.3 1.0 rot 20 0 0
      # 팔 끝과 모퉁이의 등
      ${sconce(-6, -12.4, 'W', 'rune', 4.2, 11)}
      ${sconce(-6, 2, 'W', 'ember', 4.0, 10)}
      ${sconce(12, -6, 'N', 'ember', 4.0, 10)}
      ${sconce(4.5, -16, 'N', 'rune', 3.1, 9)}
      ${brazier(14.4, -4.5, 3.8, 9)}
      ${sconce(12, 6, 'S', 'rune', 7.0, 10)}
      # 동쪽 팔의 무너진 연단 — 0.4 m 턱을 걸어 오른다
      block 10.4 0.2 3.8  5.2 0.4 2.6
      lightmap 6
      box stone_dk 10.4 0.19 3.8  5.2 0.38 2.6
      box stone_lt 10.4 0.395 2.52  5.2 0.03 0.15
      prop rubble_a      4.6 0 -14.6  300 0.8
      prop rock_mid_b   14.4 0   4.6  140 0.8
      prop fern_b       12.6 0   4.8   30 1.0
      prop barrel       -4.7 0 -14.7  120 1.0
      prop jug          -4.8 0 -13.4   60 1.0
      prop weed_b       -4.6 0  -8.0  120 1.0
      prop rubble_b     -2.0 0   4.4  160 0.8
      prop stone_c      -4.9 0   4.6   20 0.8
      prop vase_c        4.8 0   4.9  200 1.0
      waypoint 0 0 -12
      waypoint 0 0 -5.5
      waypoint 1.5 0 1.5
      waypoint 6.5 0 0
      waypoint 12 0 0
    `,
  },
  {
    name: 'room_cross',
    upper: { outer: 5.8, inner: 1.6, lane: 4.9, stair: 2.8, bottom: 0.4 },
    title: '전투방 틀 — 십자. 네 팔이 가운데의 낮은 단에서 만나고, 단 위로 채광 구멍의 볕이 떨어진다.',
    sites: [0, 1, 2, 3],
    floor: [
      [-6, -16, 6, 16],
      [-16, -6, -6, 6],
      [6, -6, 16, 6],
    ],
    windows: { N: 's', E: 'g', S: 'g', W: 'n' },
    skylights: [[3.2, 3.6, 3.4], [5.4, -8, 3.0]],
    beams: [
      [-6, H - 0.9, -6.4, 6, H, -5.6],
      [-6, H - 0.9, 5.6, 6, H, 6.4],
      [-6.4, H - 0.9, -6, -5.6, H, 6],
      [5.6, H - 0.9, -6, 6.4, H, 6],
      [-6, H - 0.9, -11.4, 6, H, -10.6],
      [-6, H - 0.9, 10.6, 6, H, 11.4],
      [-11.4, H - 0.9, -6, -10.6, H, 6],
      [10.6, H - 0.9, -6, 11.4, H, 6],
    ],
    extra: `
      # 가운데의 낮은 단 — 걸어 오른다 (0.4 m). 모서리를 다듬은 돌의 테로 두른다
      block 0 0.2 0   8 0.4 8
      lightmap 10
      box stone_dk 0 0.19 0   7.7 0.38 7.7 lm -y 0.5
      lightmap 5
      box stone_lt 0 0.2 -3.85   8 0.4 0.3
      box stone_lt 0 0.2  3.85   8 0.4 0.3
      box stone_lt -3.85 0.2 0   0.3 0.4 7.4
      box stone_lt  3.85 0.2 0   0.3 0.4 7.4
      lightmap 4
      box onyx_teal  0 0.39 -3.2   6.4 0.016 0.25
      box onyx_teal  0 0.39  3.2   6.4 0.016 0.25
      box onyx_teal  -3.2 0.39 0   0.25 0.016 6.4
      box onyx_teal   3.2 0.39 0   0.25 0.016 6.4
      box onyx_amber 0 0.394 0   3.4 0.02 3.4 rot 45 0 0
      box mosaic 0 0.4 0   2.8 0.02 2.8 rot 45 0 0
      box path 0 0.012 -10.5   2.6 0.024 11
      box path 0 0.012  10.5   2.6 0.024 11
      box path -10.5 0.012 0   11 0.024 2.6
      box path  10.5 0.012 0   11 0.024 2.6
      box moss  -4.6 0.012 -13.6   2.4 0.024 3.6
      box moss   13.4 0.012 4.4    3.6 0.024 2.4
      box drift -13.4 0.01 -4.2   3.6 0.02 2.6 rot 10 0 0
      # 팔마다의 등
      ${sconce(-6, -11, 'W', 'rune', 3.9, 10)}
      ${sconce(-11, -6, 'N', 'ember', 4.0, 10)}
      ${sconce(-16, 4.2, 'W', 'ember', 3.6, 9)}
      ${sconce(11, -6, 'N', 'rune', 3.4, 9)}
      ${sconce(-6, 11, 'W', 'ember', 3.6, 9)}
      ${sconce(6, 11, 'E', 'rune', 8.0, 10)}
      ${shard(0, 3.8, 0, 6.0, 11)}
      prop rubble_a      4.6 0  14.6  300 0.8
      prop rock_mid_c   14.4 0  -4.6   20 0.8
      prop nettle_b     14.2 0   4.6  250 1.0
      prop weed_a       -4.6 0  12.4   30 1.0
      prop rubble_b    -12.8 0   4.6  170 0.9
      prop barrel        4.7 0 -14.7   40 1.0
      prop clay_pot      4.8 0 -13.4  100 1.0
      prop crate       -14.6 0  -4.6   15 1.0
      prop brass_pot   -13.3 0  -4.8  220 1.0
      waypoint 0 0.4 0
      waypoint 0 0 -7
      waypoint 0 0 -12.5
      waypoint 7 0 0
      waypoint 12.5 0 0
      waypoint 0 0 7
      waypoint 0 0 12.5
      waypoint -7 0 0
      waypoint -12.5 0 0
    `,
  },
  {
    name: 'room_tee',
    title: '전투방 틀 — T 자. 동서로 긴 가로대의 가운데에서 남쪽으로 다리가 뻗는다.',
    sites: [1, 2, 3],
    floor: [
      [-16, -6, 16, 6],
      [-6, 6, 6, 16],
    ],
    windows: { N: 'sgnsgns', E: 'g', S: 'gs', W: 's' },
    skylights: [[3.2, 3.2, 3.0]],
    pillars: [
      [-9.5, -3.6, 1.5],
      [9.5, -3.6, 1.5],
    ],
    beams: [...beams([-16, -6, 16, 6], 'z', 5.4), ...beams([-6, 6, 6, 16], 'x', 5)],
    extra: `
      lightmap 4
      box path 0 0.012 0     31 0.024 2.6
      box path 0 0.012 8.65   2.6 0.024 14.7
      box onyx_amber 0 0.024 0   3.8 0.02 3.8 rot 45 0 0
      box mosaic 0 0.03 0   3.2 0.02 3.2 rot 45 0 0
      box onyx_teal  0 0.023 -4.2   30 0.016 0.3
      box moss  -13.6 0.012 -4.4   3.6 0.024 2.4
      box moss   4.4 0.012 13.4    2.4 0.024 3.6
      box drift  13.2 0.01 4.2   3.6 0.02 2.6 rot -14 0 0
      ${sconce(-13.2, -6, 'N', 'rune', 4.2, 11)}
      ${sconce(-0.4, -6, 'N', 'ember', 4.0, 10)}
      ${sconce(13.2, -6, 'N', 'ember', 3.8, 9)}
      ${sconce(-6, 11, 'W', 'rune', 3.6, 10)}
      ${brazier(-14.4, 4.5, 3.8, 9)}
      ${sconce(6, 11, 'E', 'ember', 7.0, 10)}
      # 남쪽 다리의 작은 폐허 단 — 중앙 진입 길은 넓게 남긴다
      block 3.7 0.2 10.6  2.4 0.4 5.2
      lightmap 6
      box stone_dk 3.7 0.19 10.6  2.4 0.38 5.2
      box bronze 2.5 0.395 10.6  0.12 0.03 5.2
      prop rock_mid_a   14.4 0   4.6   60 0.8
      prop rubble_a     12.4 0   4.8   80 1.0
      prop fern_a        4.6 0  14.4  210 1.0
      prop weed_b       12.6 0  -4.6  120 1.0
      prop rubble_b      7.9 0  -4.8   40 0.8
      prop barrel       -4.7 0  14.7   70 1.0
      prop crate        -4.6 0  13.2   10 1.0
      prop vase_a       -3.4 0  14.9  160 1.0
      prop nettle_a     -7.9 0   4.9   50 1.0
      waypoint -12 0 0
      waypoint -5.5 0 1.5
      waypoint 0 0 0
      waypoint 5.5 0 1.5
      waypoint 12 0 0
      waypoint 0 0 7
      waypoint 0 0 12
    `,
  },
]

for (const spec of SPECS) build(spec)
