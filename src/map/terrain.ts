// 산·숲·늪·빙원 기호를 지형 위에 흩뿌려 path 문자열로 만든다.
// 기호 수천 개를 개별 요소로 두면 줌이 무거워져, y 띠별로 path 몇 개에 몰아 담는다.
import { landmasses, MAP_HEIGHT, MAP_WIDTH, type Landmass } from './geo'
import { hashSeed, mulberry32, poissonDisk, valueNoise2D, type Bounds, type Point } from './geometry'
import { getTerrainRaster } from './raster'

export type TerrainKind = 'mountain' | 'forest' | 'swamp' | 'ice' | 'plateau' | 'canyon'

/** 지명 데이터에서 오는 지형 영역(대략적 타원) — 기호 밀도를 조정한다 */
export interface TerrainPatch {
  kind: TerrainKind
  x: number
  y: number
  rx: number
  ry: number
}

export interface ReliefProfile {
  /** 산 기호 밀도 0..1 */
  mountains: number
  /** 눈 덮인 봉우리로 그린다 */
  snow?: boolean
  /** 해안 전체가 절벽 — 해안선 안쪽에 짧은 해칭을 긋는다 */
  cliffs?: boolean
  /** 산맥이 없는 저지대 — 산 대신 낮은 언덕을 그린다 */
  hills?: boolean
  /** 해안을 따라 고리처럼 두른 산맥 — 해안에서 [inner, outer] 거리 띠에만 산을 그린다 */
  ring?: readonly [number, number]
}

export interface MountainBand {
  key: number
  fill: string
  ridge: string
  hatch: string
}

export interface TerrainLayers {
  mountains: MountainBand[]
  trees: { crowns: string; trunks: string }
  marsh: string
  ice: string
  cliffs: string
  canyons: string
}

const inPatch = (p: TerrainPatch, x: number, y: number) =>
  ((x - p.x) / p.rx) ** 2 + ((y - p.y) / p.ry) ** 2 <= 1

const patchBounds = (p: TerrainPatch): Bounds => ({ x0: p.x - p.rx, y0: p.y - p.ry, x1: p.x + p.rx, y1: p.y + p.ry })

const f = (v: number) => (Math.round(v * 10) / 10).toString()

function mountainGlyph(x: number, y: number, rand: () => number) {
  const w = 6.5 + rand() * 4.5
  const h = 8 + rand() * 8
  const ax = x + (rand() - 0.5) * w * 0.5
  const ay = y - h
  const lx = x - w
  const rx = x + w * (0.85 + rand() * 0.2)
  // 왼쪽 비탈은 살짝 볼록, 오른쪽은 곧게 — 손으로 그은 봉우리처럼
  const slope = `M${f(lx)} ${f(y)}Q${f(lx + w * 0.45)} ${f(y - h * 0.62)} ${f(ax)} ${f(ay)}L${f(rx)} ${f(y)}`
  // 오른쪽(그늘) 면 해칭
  let hatch = ''
  const n = 2 + Math.floor(rand() * 3)
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1)
    const px = ax + (rx - ax) * t
    const py = ay + (y - ay) * t
    const len = (y - py) * (0.55 + rand() * 0.3)
    hatch += `M${f(px - 0.6)} ${f(py + 0.8)}L${f(px - len * 0.32)} ${f(py + len)}`
  }
  return { fill: `${slope}Z`, ridge: slope, hatch }
}

function snowGlyph(x: number, y: number, rand: () => number) {
  const w = 5 + rand() * 4
  const h = 7 + rand() * 6
  const ax = x + (rand() - 0.5) * w * 0.4
  const ridge = `M${f(x - w)} ${f(y)}L${f(ax)} ${f(y - h)}L${f(x + w)} ${f(y)}`
  // 봉우리 아래 눈 경계선
  const cap = `M${f(ax - w * 0.36)} ${f(y - h * 0.6)}l${f(w * 0.18)} ${f(h * 0.12)}l${f(w * 0.18)} -${f(h * 0.12)}l${f(w * 0.18)} ${f(h * 0.12)}`
  return { fill: `${ridge}Z`, ridge, hatch: cap }
}

function hillGlyph(x: number, y: number, rand: () => number) {
  const w = 6 + rand() * 4
  const h = 2.6 + rand() * 1.8
  const ridge = `M${f(x - w)} ${f(y)}Q${f(x)} ${f(y - h * 2)} ${f(x + w)} ${f(y)}`
  // 그늘진 오른쪽 기슭에 짧은 빗금 두 개
  const hatch = `M${f(x + w * 0.35)} ${f(y - h * 0.55)}l${f(-w * 0.12)} ${f(h * 0.5)}M${f(x + w * 0.62)} ${f(y - h * 0.3)}l${f(-w * 0.1)} ${f(h * 0.3)}`
  return { fill: `${ridge}Z`, ridge, hatch }
}

function treeGlyph(x: number, y: number, rand: () => number) {
  const r = 2.6 + rand() * 1.4
  // 둥근 수관 세 덩이 + 줄기 — 원본 지도의 구름 모양 숲 기호
  const lobes = [
    [x - r * 0.55, y - r * 0.15, r * 0.7],
    [x + r * 0.55, y - r * 0.1, r * 0.68],
    [x, y - r * 0.7, r * 0.75],
  ] as const
  let crown = ''
  for (const [cx, cy, cr] of lobes) {
    crown += `M${f(cx - cr)} ${f(cy)}a${f(cr)} ${f(cr)} 0 1 0 ${f(cr * 2)} 0a${f(cr)} ${f(cr)} 0 1 0 -${f(cr * 2)} 0`
  }
  return { crown, trunk: `M${f(x)} ${f(y + r * 0.35)}l0 ${f(r * 0.7)}` }
}

/**
 * 절벽 해안 — 해안에서 조금 안쪽에 절벽 위 선을 긋고, 거기서 해안 쪽으로 짧은 빗금을 내린다.
 * (지도 기호의 단애 표시)
 */
function cliffHachure(ring: readonly Point[], seed: number): string {
  let area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) area += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
  // 링 방향에 따라 안쪽 법선의 부호가 바뀐다
  const inward = area > 0 ? 1 : -1
  const rand = mulberry32(seed)
  const DEPTH = 9
  let ticks = ''
  let top = ''
  let carry = 0
  let pen = false
  for (let i = 0; i < ring.length; i++) {
    const [ax, ay] = ring[i]
    const [bx, by] = ring[(i + 1) % ring.length]
    const len = Math.hypot(bx - ax, by - ay)
    if (len === 0) continue
    const nx = (-(by - ay) / len) * inward
    const ny = ((bx - ax) / len) * inward
    let t = carry
    while (t < len) {
      const x = ax + ((bx - ax) * t) / len
      const y = ay + ((by - ay) * t) / len
      // 지도 밖으로 이어진 부분(세지리 위쪽)은 건너뛴다
      if (y > 2 && y < 6000) {
        const tx = x + nx * DEPTH
        const ty = y + ny * DEPTH
        top += `${pen ? 'L' : 'M'}${f(tx)} ${f(ty)}`
        pen = true
        const l = DEPTH * (0.55 + rand() * 0.35)
        ticks += `M${f(tx)} ${f(ty)}l${f(-nx * l)} ${f(-ny * l)}`
      } else {
        pen = false
      }
      t += 3.4
    }
    carry = t - len
  }
  return top + ticks
}

const isInRing = (ring: readonly [number, number], d: number) => d >= ring[0] && d <= ring[1]

export function buildTerrain(
  profileFor: (landmass: Landmass, x: number, y: number) => ReliefProfile,
  patches: TerrainPatch[],
  avoid: Point[],
): TerrainLayers {
  const raster = getTerrainRaster()
  const near = (x: number, y: number, r: number) => avoid.some(([ax, ay]) => (ax - x) ** 2 + (ay - y) ** 2 < r * r)
  const whole: Bounds = { x0: 0, y0: 0, x1: MAP_WIDTH, y1: MAP_HEIGHT }

  // --- 산 ---
  const rand = mulberry32(hashSeed('mountains'))
  const broad = valueNoise2D(hashSeed('relief-broad'), 70)
  const fine = valueNoise2D(hashSeed('relief-fine'), 26)
  const glyphs: { y: number; fill: string; ridge: string; hatch: string }[] = []
  const mountainPoints = poissonDisk(
    whole,
    13,
    rand,
    (x, y) => {
      const li = raster.landAt(x, y)
      if (li < 0 || raster.coastDistance(x, y) < 14 || raster.waterAt(x, y) || near(x, y, 16)) return false
      const profile = profileFor(landmasses[li], x, y)
      let density = profile.mountains
      // 고리 산맥은 숲·늪보다 앞선다 (Tazeem: 숲은 Bulwark 안쪽에 있다)
      const inRing = profile.ring ? isInRing(profile.ring, raster.coastDistance(x, y)) : false
      if (profile.ring) density = inRing ? 0.95 : density * 0.1
      for (const p of patches) {
        if (inRing || !inPatch(p, x, y)) continue
        if (p.kind === 'mountain') density = Math.max(density, 0.92)
        else if (p.kind === 'plateau') density = Math.max(density, 0.5)
        else if (p.kind === 'canyon') density *= 0.35
        else density *= 0.15
      }
      if (!inRing && raster.forestAt(x, y)) density *= 0.12
      return broad(x, y) * 0.75 + fine(x, y) * 0.25 < density * 0.95
    },
    6000,
  )
  for (const [x, y] of mountainPoints) {
    const profile = profileFor(landmasses[raster.landAt(x, y)], x, y)
    const glyph = profile.snow ? snowGlyph(x, y, rand) : profile.hills ? hillGlyph(x, y, rand) : mountainGlyph(x, y, rand)
    glyphs.push({ y, ...glyph })
  }
  glyphs.sort((a, b) => a.y - b.y)
  // 같은 띠 안에서는 겹침이 적어, 띠 단위로만 앞뒤를 가려도 충분하다
  const BAND = 16
  const mountains: MountainBand[] = []
  for (const g of glyphs) {
    const key = Math.floor(g.y / BAND)
    let band = mountains[mountains.length - 1]
    if (!band || band.key !== key) {
      band = { key, fill: '', ridge: '', hatch: '' }
      mountains.push(band)
    }
    band.fill += g.fill
    band.ridge += g.ridge
    band.hatch += g.hatch
  }

  // --- 숲: 추출한 숲 영역 + 데이터의 숲 패치 ---
  const treeRand = mulberry32(hashSeed('trees'))
  const forestPatches = patches.filter((p) => p.kind === 'forest')
  const treeOk = (x: number, y: number) => {
    const li = raster.landAt(x, y)
    if (li < 0 || raster.coastDistance(x, y) <= 6 || raster.waterAt(x, y) || near(x, y, 11)) return false
    // 고리 산맥 띠와 그 바깥 해변에는 나무를 두지 않는다
    const ring = profileFor(landmasses[li], x, y).ring
    return !ring || raster.coastDistance(x, y) > ring[1]
  }
  const treePoints = [
    ...poissonDisk(whole, 8.5, treeRand, (x, y) => raster.forestAt(x, y) && treeOk(x, y), 9000),
    ...forestPatches.flatMap((p) =>
      poissonDisk(patchBounds(p), 8.5, treeRand, (x, y) => inPatch(p, x, y) && !raster.forestAt(x, y) && treeOk(x, y)),
    ),
  ]
  let crowns = ''
  let trunks = ''
  for (const [x, y] of treePoints) {
    const t = treeGlyph(x, y, treeRand)
    crowns += t.crown
    trunks += t.trunk
  }

  // --- 늪: 물결 위의 풀 포기 ---
  let marsh = ''
  const marshRand = mulberry32(hashSeed('marsh'))
  for (const p of patches.filter((q) => q.kind === 'swamp')) {
    const pts = poissonDisk(patchBounds(p), 15, marshRand, (x, y) =>
      inPatch(p, x, y) && raster.landAt(x, y) >= 0 && raster.coastDistance(x, y) > 6 && !near(x, y, 12))
    for (const [x, y] of pts) {
      const w = 4 + marshRand() * 3
      marsh += `M${f(x - w)} ${f(y)}l${f(w * 2)} 0M${f(x - w * 0.6)} ${f(y + 2.4)}l${f(w * 1.2)} 0`
      marsh += `M${f(x)} ${f(y - 0.5)}l0 -${f(4 + marshRand() * 2)}M${f(x - 1.6)} ${f(y - 0.5)}l-1.4 -3.2M${f(x + 1.6)} ${f(y - 0.5)}l1.4 -3.2`
    }
  }

  // --- 빙원: 짧은 가로 획 ---
  let ice = ''
  const iceRand = mulberry32(hashSeed('ice'))
  for (const p of patches.filter((q) => q.kind === 'ice')) {
    const pts = poissonDisk(patchBounds(p), 11, iceRand, (x, y) =>
      inPatch(p, x, y) && raster.landAt(x, y) >= 0 && raster.coastDistance(x, y) > 5 && !near(x, y, 10))
    for (const [x, y] of pts) ice += `M${f(x)} ${f(y)}l${f(3 + iceRand() * 3)} 0`
  }

  // --- 협곡: 흐름장을 따라 놓인 짧은 단애선 — 한쪽에 빗금 ---
  let canyons = ''
  const canyonRand = mulberry32(hashSeed('canyons'))
  const flow = valueNoise2D(hashSeed('canyon-flow'), 140)
  for (const p of patches.filter((q) => q.kind === 'canyon')) {
    const pts = poissonDisk(patchBounds(p), 17, canyonRand, (x, y) =>
      inPatch(p, x, y) && raster.landAt(x, y) >= 0 && raster.coastDistance(x, y) > 12 && !near(x, y, 14))
    for (const [x, y] of pts) {
      const a = flow(x, y) * Math.PI * 2.4
      const len = 11 + canyonRand() * 9
      const dx = Math.cos(a) * len * 0.5
      const dy = Math.sin(a) * len * 0.5
      // 살짝 굽은 단애선
      const bend = (canyonRand() - 0.5) * 6
      canyons += `M${f(x - dx)} ${f(y - dy)}Q${f(x - dy * 0.2 + bend)} ${f(y + dx * 0.2)} ${f(x + dx)} ${f(y + dy)}`
      const nx = -Math.sin(a)
      const ny = Math.cos(a)
      for (let t = -0.3; t <= 0.31; t += 0.3) {
        const px = x + dx * t * 2
        const py = y + dy * t * 2
        canyons += `M${f(px)} ${f(py)}l${f(nx * 3.4)} ${f(ny * 3.4)}`
      }
    }
  }

  // --- 절벽 해안 ---
  let cliffs = ''
  for (const land of landmasses) {
    const [cx, cy] = land.ring[0]
    if (profileFor(land, cx, cy).cliffs) cliffs += cliffHachure(land.smooth, hashSeed(`cliff:${land.id}`))
  }

  return { mountains, trees: { crowns, trunks }, marsh, ice, cliffs, canyons }
}
