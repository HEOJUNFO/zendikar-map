// 페이즈 바탕의 새 기호 — 흰 가루 평원의 가루 점·바람결(drift), 백악 갈라짐(chalk), 물이 빠진 바닥의 기하 무늬(craze)·갈라진 진흙 칸(crack), 죽은 나무(deadTree).
// 늦게 받는 페이즈 조각(src/map/period.ts)에만 실린다 — 끔 지도는 이 파일을 받지 않는다. 깊은 확대의 지역 상세 칸(childDetail.ts 의 detailTerrain)도
// 같은 기호를 kit 으로 받아 쓴다. 좌표는 기호 공간(지도 단위 ÷ g) — 세계 지도(g = 1)는 지도 단위 그대로이고, 선 굵기는 그리는 쪽이 --inv-px 로 맞춘다.
// 그리는 클래스(map.css 는 W4): period-dust(바람결)·period-chalk(백악)·period-crack(마른 바닥 무늬)·period-deadwood(죽은 나무) — periodTypes.ts 의 PeriodClass
import { hashSeed, mulberry32, type Point } from './geometry'
import type { LegendArt } from './landscapeGlyphs'
import type { PeriodGlyphKit, PeriodLegendKey } from './periodTypes'

const f = (v: number) => (Math.round(v * 10) / 10).toString()
/** 둥근 끝 0 길이 획 — 점 (map.css 의 서리 점 frost 와 같은 방식) */
const dot = (x: number, y: number) => `M${f(x)} ${f(y)}h0`
/** 땅에 누운 무늬의 세로 눌림 — 칠한 땅 위 금·칸은 위에서 비스듬히 본 바닥처럼 납작하게 (마른 바닥 칸과 같다) */
const FLAT = 0.72

/**
 * 모난 금 한 줄 — (x, y) 에서 a 쪽으로 두세 마디, 마디마다 좌우를 번갈아 꺾는다 (백악·굳은 바닥은 곧게 쪼개진다).
 * 세로는 FLAT 만큼 눌러 바닥에 눕힌다. bend 는 꺾는 폭(라디안)
 */
function shard(x: number, y: number, len: number, a: number, rand: () => number, bend = 0.7): string {
  let px = x
  let py = y
  let d = `M${f(px)} ${f(py)}`
  const n = 2 + (rand() < 0.5 ? 1 : 0)
  for (let k = 0; k < n; k++) {
    const l = (len / n) * (0.7 + rand() * 0.6)
    px += Math.cos(a) * l
    py += Math.sin(a) * l * FLAT
    d += `L${f(px)} ${f(py)}`
    a += (k % 2 ? -1 : 1) * (bend + rand() * bend)
  }
  return d
}

/**
 * 흰 가루 평원의 바람 — 바람결은 거의 수평으로 한 쪽에 눕는다 (기호 공간 각도, y 아래로 자란다).
 * 바람의 방향은 공식 자료에 없다 — 평평한 가루 땅을 읽히게 하려는 이 지도의 표현이라 한 방향으로만 둔다
 */
const WIND = -0.12

/** 바람결 한 줄 — 가운데 (cx, cy), 방향 (ca, sa), 길이 len. 높이 없이 아주 얕게 S 로 휜다 (언덕 호로 읽히지 않게 위아래로 번갈아) */
function streak(cx: number, cy: number, ca: number, sa: number, len: number, amp: number): string {
  const h = len / 2
  const qx = cx - (ca * h) / 2 - sa * amp
  const qy = cy - (sa * h) / 2 + ca * amp
  return `M${f(cx - ca * h)} ${f(cy - sa * h)}Q${f(qx)} ${f(qy)} ${f(cx)} ${f(cy)}T${f(cx + ca * h)} ${f(cy + sa * h)}`
}

/**
 * 흰 가루 평원 — 긴 바람결 한 줄(가끔 어긋나게 놓인 짧은 한 줄)과 그 결을 따라 흩은 가루 점(점묘), 가끔 가루 밑 굳은 바닥의 옅은 금.
 * 공식 서술이 '고운 흰 가루'(아트북 "fine, powdery white sand")와 '아주 평평했다'(Nissa's Resolve "completely flat")라
 * 언덕·나무처럼 키가 있는 기호 대신 바닥에 눕는 점과 선만 쓴다. 한 기호가 이웃 기호와 거의 닿게(간격 22) 넓게 퍼져 무늬가 땅을 고르게 덮는다.
 * 길이가 같은 두 줄을 나란히 두면 '=' 처럼 글자로 읽혀, 둘째 줄은 짧게 하고 바람 쪽으로 비켜 놓는다
 */
function drift(x: number, y: number, rand: () => number): string {
  const a = WIND + (rand() - 0.5) * 0.3
  const ca = Math.cos(a)
  const sa = Math.sin(a)
  // 바람결 — 긴 한 줄
  const along = (rand() - 0.5) * 4
  const len = 8 + rand() * 6
  const amp = (rand() < 0.5 ? -1 : 1) * (0.25 + rand() * 0.3)
  let d = streak(x + ca * along, y + sa * along, ca, sa, len, amp)
  // 짧은 둘째 줄 — 가끔, 옆으로 2–3 비켜 바람 앞뒤로 어긋나게
  if (rand() < 0.45) {
    const off = (rand() < 0.5 ? -1 : 1) * (2 + rand())
    const shift = along + (rand() < 0.5 ? -1 : 1) * (len * 0.35 + rand() * 2)
    d += streak(x + ca * shift - sa * off, y + sa * shift + ca * off, ca, sa, 3 + rand() * 3, -amp * 0.7)
  }
  // 가루 점 — 바람결을 따라 길쭉한 무리, 결 가까이 짙게
  const dots = 6 + Math.floor(rand() * 5)
  for (let k = 0; k < dots; k++) {
    const u = (rand() - 0.5) * 18
    const v = (rand() - 0.5) * 6 * rand()
    d += dot(x + ca * u - sa * v, y + sa * u + ca * v)
  }
  // 옅은 금 — 가끔 (가루 밑으로 드러난 굳은 바닥)
  if (rand() < 0.2) d += shard(x + (rand() - 0.5) * 8, y + (rand() - 0.5) * 3, 2 + rand() * 1.4, rand() * Math.PI * 2, rand)
  return d
}

/**
 * 백악 — 바닥에 눕힌 모난 금 한 줄(바위가 마르며 쪼개진 결, 서너 마디 지그재그)과 그 마디에서 갈라진 짧은 곁금, 떨어져 나온 작은 모난 부스러기, 점 하나.
 * 흰 가루(점·바람결)와 달리 곧고 모난 획만 써서 '식물이 자라지 않는 백악 바위'(아트북 "barren, chalky rock")로 읽히게.
 * 한 점에서 셋으로 뻗는 금은 작게 보면 죽은 나무·새 발자국처럼 서 보여, 금은 거의 눕힌 방향으로만 긋는다
 */
function chalk(x: number, y: number, rand: () => number): string {
  // 큰 금 — 가로에서 ±35° 안쪽, 마디마다 좌우로 꺾인다 (세로는 FLAT 으로 눌러 바닥에 눕힌다)
  const a = (rand() - 0.5) * 1.2 + (rand() < 0.5 ? 0 : Math.PI)
  const len = 6 + rand() * 3
  let px = x - (Math.cos(a) * len) / 2
  let py = y - (Math.sin(a) * len * FLAT) / 2
  const joints: Point[] = [[px, py]]
  const n = 3 + (rand() < 0.4 ? 1 : 0)
  for (let k = 0; k < n; k++) {
    const b = a + (k % 2 ? -1 : 1) * (0.3 + rand() * 0.35)
    const l = (len / n) * (0.75 + rand() * 0.5)
    px += Math.cos(b) * l
    py += Math.sin(b) * l * FLAT
    joints.push([px, py])
  }
  let d = `${joints.map(([jx, jy], i) => `${i ? 'L' : 'M'}${f(jx)} ${f(jy)}`).join('')}`
  // 곁금 — 가운데 마디 하나에서 비스듬히
  const [bx, by] = joints[1 + Math.floor(rand() * (n - 1))]
  d += shard(bx, by, 1.4 + rand() * 1.4, a + (rand() < 0.5 ? -1 : 1) * (0.8 + rand() * 0.6), rand, 0.3)
  // 부스러기 — 닫힌 세모·네모 하나
  if (rand() < 0.65) {
    const cx = x + (rand() < 0.5 ? -1 : 1) * (3 + rand() * 1.5)
    const cy = y + (rand() - 0.3) * 2.4
    const r = 0.55 + rand() * 0.45
    const sides = 3 + (rand() < 0.5 ? 1 : 0)
    const b0 = rand() * Math.PI * 2
    let p = ''
    for (let k = 0; k < sides; k++) {
      const b = b0 + (k / sides) * Math.PI * 2 + (rand() - 0.5) * 0.5
      p += `${k ? 'L' : 'M'}${f(cx + Math.cos(b) * r)} ${f(cy + Math.sin(b) * r * FLAT)}`
    }
    d += `${p}Z`
  }
  return d + dot(x + (rand() - 0.5) * 5, y + (rand() - 0.5) * 2.4)
}

/**
 * 마른 바닥의 기하 무늬 — 직각으로 꺾여 안에서 밖으로 감기는 네모 나선 토막. 엘드라지 거신이 지나간 바닥의 '무지갯빛 기하 무늬'
 * (The Art of Magic: The Gathering – Zendikar) 를 잉크 선으로. 바닥 무늬의 몫(craze)만큼 갈라짐(crack) 사이에 섞는다
 */
function craze(x: number, y: number, rand: () => number): string {
  const turns = 4 + Math.floor(rand() * 3)
  const hand = rand() < 0.5 ? 1 : -1
  let dir = Math.floor(rand() * 4)
  const step = 0.55 + rand() * 0.25
  // 나선의 가운데가 (x, y) 둘레에 오게 시작점을 조금 민다
  let px = x + (rand() - 0.5) * 0.8
  let py = y + (rand() - 0.5) * 0.8
  let d = `M${f(px)} ${f(py)}`
  for (let k = 1; k <= turns; k++) {
    const l = step * Math.ceil(k / 2) * 1.15
    const [dx, dy] = [[1, 0], [0, 1], [-1, 0], [0, -1]][dir]
    px += dx * l
    py += dy * l
    d += `L${f(px)} ${f(py)}`
    dir = (dir + hand + 4) % 4
  }
  return d
}

/**
 * 마른 바닥의 갈라짐 — 소금기 진흙이 마르며 갈라진 칸 하나: 변 하나가 트인 다각형 칸과 꼭짓점에서 이웃 칸으로 뻗는 금 두세 줄, 칸 안의 소금점.
 * 칸(지름 6–7)을 간격 12 에 거의 닿게 놓고 꼭짓점의 금이 이웃 칸까지 뻗어, 따로 떨어진 조약돌이 아니라 바닥 전체가 그물처럼 갈라진 것으로 읽힌다
 */
function crack(x: number, y: number, rand: () => number): string {
  const sides = 5 + (rand() < 0.4 ? 1 : 0)
  const r = 2.8 + rand() * 0.8
  const a0 = rand() * Math.PI * 2
  const pts: Point[] = []
  for (let k = 0; k < sides; k++) {
    const a = a0 + (k / sides) * Math.PI * 2 + (rand() - 0.5) * 0.45
    const rr = r * (0.8 + rand() * 0.35)
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * FLAT])
  }
  // 칸의 변 — 하나를 비워 둔다 (닫힌 고리는 작게 보면 조약돌로 읽힌다)
  const open = Math.floor(rand() * sides)
  let d = ''
  for (let i = 1; i <= sides; i++) {
    const [px, py] = pts[(open + i) % sides]
    d += `${i === 1 ? 'M' : 'L'}${f(px)} ${f(py)}`
  }
  // 이웃 칸으로 이어지는 금 — 꼭짓점에서 바깥쪽으로, 한 번 꺾인다
  const spurs = 2 + (rand() < 0.4 ? 1 : 0)
  const first = Math.floor(rand() * sides)
  for (let i = 0; i < spurs; i++) {
    const [vx, vy] = pts[(first + Math.round((i * sides) / spurs)) % sides]
    const a = Math.atan2((vy - y) / FLAT, vx - x) + (rand() - 0.5) * 0.5
    d += shard(vx, vy, 2.2 + rand() * 1.4, a, rand, 0.35)
  }
  const salt = 1 + (rand() < 0.5 ? 1 : 0)
  for (let i = 0; i < salt; i++) d += dot(x + (rand() - 0.5) * r * 0.9, y + (rand() - 0.5) * r * 0.6)
  return d
}

/**
 * 죽은 나무 — 맨 줄기와 가지 두세 개 (밑동은 같은 자리의 숲 기호 줄기 끝과 맞춘다). 여섯에 하나쯤은 쓰러진 둥치.
 * 모양은 그 자리의 해시 시드(`dead:x:y`)로 따로 정하므로, 같은 자리면 세계 지도와 지역 상세가 같은 나무를 그린다
 */
function deadTree(x: number, y: number, rand: () => number): string {
  // 숲 기호(terrain.ts 의 treeGlyph)의 줄기 끝 — 밑동 y + 약 1.05·r
  const ground = y + 3.2
  if (rand() < 1 / 6) {
    // 쓰러진 둥치 — 비스듬히 누운 줄기, 부러진 가지 그루터기, 뿌리 쪽 끝의 짧은 갈래
    const w = 3 + rand() * 1.6
    const tilt = (rand() - 0.5) * 1.2
    const lx = x - w
    const rx = x + w
    const ly = ground - 0.4 + tilt
    const ry = ground - 0.4 - tilt
    // 부러진 가지 그루터기 — 줄기 위의 한 점에서
    const t = 0.35 + rand() * 0.4
    const sx = lx + (rx - lx) * t
    const sy = ly + (ry - ly) * t
    return (
      `M${f(lx)} ${f(ly)}L${f(rx)} ${f(ry)}` +
      `M${f(sx)} ${f(sy)}l${f(0.5 + rand() * 0.6)} ${f(-1.4 - rand() * 0.8)}` +
      `M${f(lx)} ${f(ly)}l${f(-0.9)} ${f(-0.8)}M${f(lx)} ${f(ly)}l${f(-1)} ${f(0.5)}`
    )
  }
  const h = 6 + rand() * 2.5
  const lean = (rand() - 0.5) * 1.2
  const tx = x + lean
  const ty = ground - h
  // 줄기 — 밑동에서 조금 굽어 오른다
  let d = `M${f(x)} ${f(ground)}Q${f(x + lean * 0.2)} ${f(ground - h * 0.5)} ${f(tx)} ${f(ty)}`
  const n = 2 + (rand() < 0.5 ? 1 : 0)
  let side = rand() < 0.5 ? 1 : -1
  for (let i = 0; i < n; i++) {
    // 가지는 줄기의 위쪽 2/3 에서 좌우를 번갈아 위로 뻗는다
    const t = 0.35 + (i / n) * 0.5 + rand() * 0.1
    const bx = x + lean * t
    const by = ground - h * t
    const l = 1.6 + rand() * 1.4 * (1 - t * 0.4)
    const ex = bx + side * l * (0.75 + rand() * 0.2)
    const ey = by - l * (0.55 + rand() * 0.35)
    d += `M${f(bx)} ${f(by)}L${f(ex)} ${f(ey)}`
    // 가끔 끝에서 갈라지는 잔가지
    if (rand() < 0.4) d += `M${f(ex)} ${f(ey)}l${f(side * 0.6)} ${f(-0.7)}`
    side = -side
  }
  return d
}

/** 자리(지도 단위)마다 정해진 0..1 — 죽은 숲에서 남길 죽은 나무를 고른다 (세계 지도와 지역 상세가 같은 함수, 같은 자리면 같은 값) */
function hash01(x: number, y: number): number {
  let h = Math.imul(Math.round(x * 64) ^ 0x27d4eb2f, 0x165667b1) ^ Math.imul(Math.round(y * 64) + 0x61c88647, 0x9e3779b1)
  h ^= h >>> 15
  h = Math.imul(h, 0x2c1b3c6d)
  h ^= h >>> 12
  h = Math.imul(h, 0x297a2d39)
  h ^= h >>> 15
  return (h >>> 0) / 4294967296
}

/** 죽은 숲에서 죽은 나무로 남기는 몫 — 나머지 나무는 걷어 낸다 (My Favorite Flavor: Ruins of Oran-Rief "The trees are gone") */
export const DEAD_KEEP = 0.25

export const periodGlyphKit: PeriodGlyphKit = { drift, chalk, craze, crack, deadTree, hash01, DEAD_KEEP }

/** 죽은 나무 한 그루 (지도 단위 자리 x, y → 기호 공간 gx, gy) — 모양은 자리 해시로 따로 시드한다 (세계 지도·깊은 확대 칸·지역 상세가 같다) */
export function deadTreeAt(x: number, y: number, gx: number, gy: number): string {
  return deadTree(gx, gy, mulberry32(hashSeed(`dead:${f(x)}:${f(y)}`)))
}

/**
 * 범례 '이 무렵의 지형' 줄의 그림 — 지도와 같은 칠·기호를 작은 상자에 (cls 는 periodTypes.ts 의 PeriodClass·지도 기호 클래스).
 * 패널 바탕은 양피지보다 밝아 흰 칠을 상자 가득 깔면 패널에 묻힌다 — 지도에서처럼 양피지 땅(lm-fill) 위에 그 무렵의 칠을 한 덩이로 얹어 땅빛과 맞대어 읽히게 한다
 */
export function periodLegendArt(key: PeriodLegendKey): LegendArt {
  const rand = mulberry32(hashSeed(`legend:period:${key}`))
  const ground = { cls: 'lm-fill', d: 'M-10 -8H10V8H-10Z' }
  // 상자 안의 덩이 — 가장자리에 양피지 땅이 조금씩 남는 고르지 않은 모양 (틀처럼 보이지 않게 네 귀퉁이를 다르게 깎았다)
  const patch = 'M-8.8 -2.6C-8.9 -6.4-4.6 -7.2-0.8 -6.6S7.6 -7.5 8.9 -3.4 9.3 4.4 5.6 6.4-1.6 7.3-5.6 6.2-8.7 1.2-8.8 -2.6Z'
  switch (key) {
    case 'blight': {
      // 흰 가루 칠 위에 바람결·가루 점 두 줄, 그 사이에 백악 갈라짐 하나 (기호가 덩이 밖 양피지로 넘지 않게 안쪽에)
      const dust = drift(-0.5, -3.6, rand) + drift(0.5, 4.2, rand)
      return {
        viewBox: '-10 -8 20 16',
        parts: [ground, { cls: 'period-dust-wash', d: patch }, { cls: 'period-dust', d: dust }, { cls: 'period-chalk', d: chalk(1.5, 0.4, rand) }],
      }
    }
    case 'deadwood': {
      let d = ''
      // 나무 키(밑동에서 6–8.5)가 상자 위로 잘리지 않게 밑동을 아래쪽에
      for (const [x, y] of [[-5, 0], [0.5, -1.2], [5.5, 1.6]] as const) d += deadTree(x, y, rand)
      return { viewBox: '-10 -8 20 16', parts: [ground, { cls: 'period-tint', d: patch }, { cls: 'period-deadwood', d }] }
    }
    case 'drybed': {
      let d = ''
      // 갈라진 칸 둘과 기하 무늬 하나 — 칸이 커서(지름 6–7) 셋이면 덩이를 채운다
      for (const [x, y, z] of [[-3.8, -1.6, 0], [4.2, 2.6, 0], [4.6, -3.6, 1]] as const) d += z ? craze(x, y, rand) : crack(x, y, rand)
      return { viewBox: '-10 -8 20 16', parts: [ground, { cls: 'period-floor', d: patch }, { cls: 'period-crack', d }] }
    }
  }
}
