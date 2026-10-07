// 산·숲·늪·빙원 기호를 지형 위에 흩뿌려 path 문자열로 만든다.
// 기호 수천 개를 개별 요소로 두면 줌이 무거워져, y 띠별로 path 몇 개에 몰아 담는다.
import type { TerrainAreaKind, TerrainLine } from '../data/types'
import { landmasses, MAP_HEIGHT, MAP_WIDTH, type Landmass } from './geo'
import {
  chaikin,
  chaikinOpen,
  distanceToPolyline,
  hashSeed,
  mulberry32,
  pointInRing,
  poissonDisk,
  polylineToPath,
  resample,
  rightNormals,
  ringBounds,
  ringToPath,
  valueNoise2D,
  type Bounds,
  type Point,
  type Ring,
} from './geometry'
import { crystalGlyph, ellipsePath, lavaGlyph, mangroveGlyph, mesaGlyph, tundraGlyph } from './landscapeGlyphs'
import { getTerrainRaster } from './raster'

/** 지형 영역의 종류 — 바탕 지형 데이터(TerrainAreaKind)와, 장소 데이터에서만 오는 고원(plateau) */
export type TerrainKind = TerrainAreaKind | 'plateau'

/**
 * 지형 영역 — 다각형(ring) 또는 타원(x, y, rx, ry).
 * - 바탕 지형 데이터(TerrainArea)의 영역은 그 안의 지형을 kind 로 덮어쓴다: 대륙의 지형 기호(relief), 고리 산맥 띠, 팬 지도 숲(나무와,
 *   plain 이면 숲 채색까지)을 걷어 내고 kind 의 기호만 그린다. 목록에서 뒤에 오는 영역이 앞의 영역을 덮는다.
 * - soft(장소 데이터 region/water 의 대략적 범위)는 아래 지형에 kind 의 기호를 보탤 뿐 덮지 않고(산을 줄이거나 늘린다),
 *   고리 산맥 띠에는 닿지 않는다 — 다만 plain 은 산·나무·숲 채색을 걷어 낸다
 */
export interface TerrainPatch {
  kind: TerrainKind
  ring?: Ring
  x: number
  y: number
  rx: number
  ry: number
  bounds: Bounds
  /** 기호 밀도 0..1 (생략하면 kind 마다 기본값) */
  density?: number
  soft?: boolean
}

/** 다각형이나 타원으로 지형 영역을 만든다 */
export function makePatch(
  kind: TerrainKind,
  shape: { ring?: readonly Point[]; at?: Point; extent?: readonly [number, number] },
  opts: { density?: number; soft?: boolean } = {},
): TerrainPatch | null {
  if (shape.ring && shape.ring.length >= 3) {
    const bounds = ringBounds(shape.ring)
    return { kind, ring: shape.ring, x: (bounds.x0 + bounds.x1) / 2, y: (bounds.y0 + bounds.y1) / 2, rx: 0, ry: 0, bounds, ...opts }
  }
  if (!shape.at || !shape.extent) return null
  const [x, y] = shape.at
  const [rx, ry] = shape.extent
  return { kind, x, y, rx, ry, bounds: { x0: x - rx, y0: y - ry, x1: x + rx, y1: y + ry }, ...opts }
}

/** 지형 영역의 path — 숲·용암 채색과 plain 의 숲 채색 가림에 쓴다 */
export const patchPath = (p: TerrainPatch) => (p.ring ? ringToPath(p.ring) : ellipsePath(p.x, p.y, p.rx, p.ry))

export interface ReliefProfile {
  /** 산 기호 밀도 0..1 */
  mountains: number
  /** 눈 덮인 봉우리로 그린다 */
  snow?: boolean
  /** 해안 전체가 절벽 — 해안선 안쪽에 짧은 해칭을 긋는다 */
  cliffs?: boolean
  /** 산맥이 없는 저지대 — 산 대신 낮은 언덕을 그린다 (고리 산맥 ring 이 있으면 띠에는 산, 그 안쪽에는 언덕) */
  hills?: boolean
  /** 해안을 따라 고리처럼 두른 산맥 — 해안에서 [inner, outer] 거리 띠에만 산을 그린다 */
  ring?: readonly [number, number]
  /** 봉우리 사이 땅 전체에 드문 툰드라 풀포기와 서리 점 */
  tundra?: boolean
  /** 대륙의 산 기호 가운데 수정 첨탑으로 그리는 몫 (0..1) */
  crystal?: number
}

export interface MountainBand {
  key: number
  fill: string
  /** 수정 첨탑의 채움 — 산의 양피지색보다 옅은 돌빛 */
  crystal: string
  ridge: string
  hatch: string
  /** 수정 첨탑의 테두리·결 — 산보다 가늘고 옅은 잉크 (낮은 배율에서 검은 덩어리로 뭉치지 않게) */
  crystalRidge: string
  crystalHatch: string
}

/** 산 말고는 지도 칸(TILE)별로 나눈 path 조각들 — 아래 tiler 참고 */
export interface TerrainLayers {
  mountains: MountainBand[]
  trees: { crowns: string[]; trunks: string[] }
  marsh: string[]
  ice: string[]
  cliffs: string[]
  /** 호수·바다를 내려다보는 단애선 — 육지 안의 물 칠 위에 그린다 */
  waterCliffs: string[]
  canyons: string[]
  lava: string[]
  tundra: string[]
  frost: string[]
  /** 협곡(gorge) 바닥 — 양쪽 단애 사이를 조금 어둡게 */
  gorgeFloors: string
}

/**
 * 지도 전체에 흩어진 기호를 path 하나에 담으면 화면 타일마다 기호를 전부 훑어, 확대할수록 래스터가 비싸진다
 * (GPU 가 약한 기기에서 끌기가 끊긴다). 같은 칸에 놓인 기호끼리만 묶으면 타일에 닿지 않는 칸은 통째로 건너뛴다.
 */
const TILE = 200

export function tiler() {
  const tiles = new Map<string, string>()
  return {
    add(x: number, y: number, d: string) {
      const key = `${Math.floor(x / TILE)},${Math.floor(y / TILE)}`
      tiles.set(key, (tiles.get(key) ?? '') + d)
    },
    paths: () => [...tiles.values()],
  }
}
export type Tiler = ReturnType<typeof tiler>

/** 절벽 위 선을 이만큼의 점마다 끊는다 — 이음매는 둥근 끝(.cliffs)이 메운다 */
const CLIFF_PIECE = 40

const inPatch = (p: TerrainPatch, x: number, y: number) =>
  x >= p.bounds.x0 && x <= p.bounds.x1 && y >= p.bounds.y0 && y <= p.bounds.y1 &&
  (p.ring ? pointInRing(x, y, p.ring) : ((x - p.x) / p.rx) ** 2 + ((y - p.y) / p.ry) ** 2 <= 1)

const f = (v: number) => (Math.round(v * 10) / 10).toString()

export function mountainGlyph(x: number, y: number, rand: () => number) {
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

export function hillGlyph(x: number, y: number, rand: () => number) {
  const w = 6 + rand() * 4
  const h = 2.6 + rand() * 1.8
  const ridge = `M${f(x - w)} ${f(y)}Q${f(x)} ${f(y - h * 2)} ${f(x + w)} ${f(y)}`
  // 그늘진 오른쪽 기슭에 짧은 빗금 두 개
  const hatch = `M${f(x + w * 0.35)} ${f(y - h * 0.55)}l${f(-w * 0.12)} ${f(h * 0.5)}M${f(x + w * 0.62)} ${f(y - h * 0.3)}l${f(-w * 0.1)} ${f(h * 0.3)}`
  return { fill: `${ridge}Z`, ridge, hatch }
}

export function treeGlyph(x: number, y: number, rand: () => number) {
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

/** 늪 풀포기 — 물결 두 줄과 풀잎 세 가닥 (path 둘: 물결, 풀잎) */
export function marshGlyph(x: number, y: number, rand: () => number): [string, string] {
  const w = 4 + rand() * 3
  return [
    `M${f(x - w)} ${f(y)}l${f(w * 2)} 0M${f(x - w * 0.6)} ${f(y + 2.4)}l${f(w * 1.2)} 0`,
    `M${f(x)} ${f(y - 0.5)}l0 -${f(4 + rand() * 2)}M${f(x - 1.6)} ${f(y - 0.5)}l-1.4 -3.2M${f(x + 1.6)} ${f(y - 0.5)}l1.4 -3.2`,
  ]
}

/** 협곡 단애선 — a 방향으로 살짝 굽은 선과 한쪽에 짧은 빗금 셋 (path 넷) */
export function canyonGlyph(x: number, y: number, a: number, rand: () => number): string[] {
  const len = 11 + rand() * 9
  const dx = Math.cos(a) * len * 0.5
  const dy = Math.sin(a) * len * 0.5
  // 살짝 굽은 단애선
  const bend = (rand() - 0.5) * 6
  const out = [`M${f(x - dx)} ${f(y - dy)}Q${f(x - dy * 0.2 + bend)} ${f(y + dx * 0.2)} ${f(x + dx)} ${f(y + dy)}`]
  const nx = -Math.sin(a)
  const ny = Math.cos(a)
  for (let t = -0.3; t <= 0.31; t += 0.3) {
    const px = x + dx * t * 2
    const py = y + dy * t * 2
    out.push(`M${f(px)} ${f(py)}l${f(nx * 3.4)} ${f(ny * 3.4)}`)
  }
  return out
}


/** 절벽 해안의 단애 깊이 — 해안에서 이만큼 안쪽에 절벽 위 선을 긋는다 */
const CLIFF_DEPTH = 9

/**
 * 절벽 해안 — 해안에서 조금 안쪽에 절벽 위 선을 긋고, 거기서 해안 쪽으로 짧은 빗금을 내린다.
 * (지도 기호의 단애 표시)
 * 해안에서 안쪽으로 민 점이 다른 해안에 너무 가까우면(뾰족한 곶·좁은 만 어귀에서 양쪽 변을 민 선이 엇갈리는 곳) 그 점은 건너뛴다 —
 * 건너뛴 점이 여섯 개(약 20 단위)까지면 선을 그대로 잇고, 더 길게 이어지면(좁은 곶) 선을 끊는다
 */
function cliffHachure(
  ring: readonly Point[],
  seed: number,
  out: Tiler,
  clear: (x: number, y: number) => boolean,
  broken: (x: number, y: number) => boolean,
) {
  let area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) area += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
  // 링 방향에 따라 안쪽 법선의 부호가 바뀐다
  const inward = area > 0 ? 1 : -1
  const rand = mulberry32(seed)
  let top = ''
  let topAt: Point = [0, 0]
  let topCount = 0
  let last: Point | null = null
  let carry = 0
  let skipped = 0
  const endTop = () => {
    if (topCount > 1) out.add(topAt[0], topAt[1], top)
    top = ''
    topCount = 0
  }
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
      const tx = x + nx * CLIFF_DEPTH
      const ty = y + ny * CLIFF_DEPTH
      // 지도 밖으로 이어진 부분(세지리 위쪽)과 강·협곡이 바다로 나가는 어귀는 건너뛴다
      if (!(y > 2 && y < 6000) || broken(x, y) || broken(tx, ty)) {
        endTop()
        last = null
      } else if (!clear(tx, ty)) {
        if (++skipped > 6) {
          endTop()
          last = null
        }
      } else {
        skipped = 0
        if (topCount === CLIFF_PIECE && last) {
          // 이어 그리도록 끊은 자리의 점에서 다시 시작한다
          endTop()
          top = `M${f(last[0])} ${f(last[1])}`
          topAt = last
          topCount = 1
        }
        if (topCount === 0) topAt = [tx, ty]
        top += `${topCount ? 'L' : 'M'}${f(tx)} ${f(ty)}`
        topCount++
        last = [tx, ty]
        const l = CLIFF_DEPTH * (0.55 + rand() * 0.35)
        out.add(tx, ty, `M${f(tx)} ${f(ty)}l${f(-nx * l)} ${f(-ny * l)}`)
      }
      t += 3.4
    }
    carry = t - len
  }
  endTop()
}

/**
 * 단애선 — line 은 절벽 위 가장자리. 빗금은 진행 방향의 오른쪽(side 1) 또는 왼쪽(side -1), 곧 낮은 쪽으로 떨어진다.
 * 굽이 안쪽에서 빗금이 맞은편 선을 넘지 않게, 끝이 선에 너무 가까운 빗금은 뺀다.
 * wet 을 주면 빗금이 떨어지는 쪽의 물(호수·바다)까지 잰다 — 해안 절벽처럼 위 선과 물가 사이에 틈을 두고(모자라면 위 선을 뭍 쪽으로 민다)
 * 빗금은 그 틈 안에서 들쭉날쭉 끝나, 물가 선과 위 선이 빗금으로 이어진 사다리처럼 보이지 않게 한다.
 * ragged 면 빗금 간격과 길이를 더 흐트러뜨린다 — 협곡의 두 단애가 고른 빗금으로 마주 보면 낮은 배율에서 철길처럼 읽힌다
 */
export function scarp(
  line: readonly Point[],
  closed: boolean,
  side: 1 | -1,
  depth: number,
  seed: number,
  out: Tiler,
  wet?: (x: number, y: number) => boolean,
  ragged = false,
) {
  const step = 3.4 * Math.max(0.25, Math.min(1, depth / 7))
  let pts = resample(closed ? chaikin(line, 2) : chaikinOpen(line, 2), step, closed)
  if (pts.length < 2) return
  const normals = rightNormals(pts, closed)
  const rand = mulberry32(seed)
  // 물까지의 거리 — 빗금 방향으로 depth 남짓까지 0.5 씩 걸어 본다
  const gaps = pts.map(([x, y], i) => {
    if (!wet) return Infinity
    for (let d = 0.5; d <= depth + 2; d += 0.5) if (wet(x + normals[i][0] * side * d, y + normals[i][1] * side * d)) return d
    return Infinity
  })
  if (wet) {
    const MIN_GAP = Math.min(4.5, depth * 0.7)
    const need = gaps.map((g) => (Number.isFinite(g) && g < MIN_GAP ? MIN_GAP - g : 0))
    // 민 거리는 이웃과 고르게 — 위 선이 꺾이지 않게
    const shift = need.map((_, i) => {
      let sum = 0
      let n = 0
      for (let k = -3; k <= 3; k++) {
        const j = closed ? (i + k + need.length) % need.length : i + k
        if (j < 0 || j >= need.length) continue
        let m = 0
        for (let q = -2; q <= 2; q++) {
          const r = closed ? (j + q + need.length) % need.length : j + q
          if (r >= 0 && r < need.length) m = Math.max(m, need[r])
        }
        sum += m
        n++
      }
      return sum / n
    })
    pts = pts.map(([x, y], i) => [x - normals[i][0] * side * shift[i], y - normals[i][1] * side * shift[i]] as const)
    shift.forEach((v, i) => (gaps[i] += v))
  }
  const top = closed ? [...pts, pts[0]] : pts
  for (let s = 0; s < top.length - 1; s += CLIFF_PIECE) {
    const piece = top.slice(s, s + CLIFF_PIECE + 1)
    out.add(piece[0][0], piece[0][1], polylineToPath(piece))
  }
  pts.forEach(([x, y], i) => {
    if (ragged && rand() < 0.3) return
    const room = Math.min(depth, gaps[i])
    const l = Number.isFinite(gaps[i]) ? room * (0.45 + rand() * 0.4) : ragged ? depth * (0.3 + rand() * 0.7) : depth * (0.55 + rand() * 0.35)
    const dx = normals[i][0] * side * l
    const dy = normals[i][1] * side * l
    if (distanceToPolyline(x + dx, y + dy, pts, closed) < l * 0.6) return
    out.add(x, y, `M${f(x)} ${f(y)}l${f(dx)} ${f(dy)}`)
  })
}

/** 협곡 — 가운데 선에서 양쪽으로 width/2 떨어진 두 단애가 골짜기 쪽으로 빗금을 내린다. 양 끝은 좁아진다 */
function gorge(line: readonly Point[], width: number, seed: number, out: Tiler): string {
  const center = resample(chaikinOpen(line, 2), 2)
  if (center.length < 2) return ''
  const normals = rightNormals(center)
  const total = (center.length - 1) * 2
  const taper = Math.max(4, width * 1.5)
  const half = (i: number) => {
    const s = i * 2
    const t = Math.min(1, s / taper, (total - s) / taper)
    return (width / 2) * (0.3 + 0.7 * Math.sin((t * Math.PI) / 2))
  }
  const left = center.map(([x, y], i) => [x - normals[i][0] * half(i), y - normals[i][1] * half(i)] as const)
  const right = center.map(([x, y], i) => [x + normals[i][0] * half(i), y + normals[i][1] * half(i)] as const)
  const depth = Math.min(width * 0.42, 6)
  // 왼쪽 단애에서 골짜기는 진행 방향의 오른쪽, 오른쪽 단애에서는 왼쪽
  scarp(left, false, 1, depth, seed, out, undefined, true)
  scarp(right, false, -1, depth, seed + 1, out, undefined, true)
  return ringToPath([...left, ...[...right].reverse()])
}

/**
 * 닫힌 선까지의 거리 — 가까운 변만 보도록 변을 격자 칸에 나눠 둔다. cell 보다 먼 거리는 cell 로 친다
 */
function nearDistance(ring: readonly Point[], cell: number): (x: number, y: number) => number {
  const grid = new Map<string, number[]>()
  const key = (gx: number, gy: number) => `${gx},${gy}`
  for (let i = 0; i < ring.length; i++) {
    const [ax, ay] = ring[i]
    const [bx, by] = ring[(i + 1) % ring.length]
    for (let gx = Math.floor(Math.min(ax, bx) / cell); gx <= Math.floor(Math.max(ax, bx) / cell); gx++) {
      for (let gy = Math.floor(Math.min(ay, by) / cell); gy <= Math.floor(Math.max(ay, by) / cell); gy++) {
        const k = key(gx, gy)
        const list = grid.get(k)
        if (list) list.push(i)
        else grid.set(k, [i])
      }
    }
  }
  return (x, y) => {
    let best = cell
    const gx = Math.floor(x / cell)
    const gy = Math.floor(y / cell)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const i of grid.get(key(gx + dx, gy + dy)) ?? []) {
          const [ax, ay] = ring[i]
          const [bx, by] = ring[(i + 1) % ring.length]
          const ex = bx - ax
          const ey = by - ay
          const len = ex * ex + ey * ey
          const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / len))
          best = Math.min(best, Math.hypot(x - (ax + t * ex), y - (ay + t * ey)))
        }
      }
    }
    return best
  }
}

const isInRing = (ring: readonly [number, number], d: number) => d >= ring[0] && d <= ring[1]

/** 덮어쓰는 영역의 기본 기호 밀도 */
const AREA_DENSITY: Partial<Record<TerrainKind, number>> = { mountain: 0.92, hills: 0.75, mesa: 0.6, crystal: 0.8 }
/** 덮어쓰는 영역 안에서 대륙의 산 밀도에 곱하는 값 — 협곡·숲·빙원·툰드라에는 드문 봉우리가 남는다. 나머지는 산을 걷어 낸다 */
const UNDER_RELIEF: Partial<Record<TerrainKind, number>> = { canyon: 0.35, forest: 0.15, ice: 0.15, tundra: 0.15 }
/** 이보다 성긴 수정 영역은 기둥 두세 개의 낮은 무리로 — 굵은 무리가 빽빽하면 낮은 배율에서 검은 덩어리로 읽힌다 */
const CRYSTAL_SMALL_BELOW = 0.7
/**
 * 섬의 크기 — 해안에서 가장 먼 곳이 이보다 가까운 땅(Beyeen 14, Agadeem 27, Jwar 7)은 해안·마커 여백을 그 비율로 줄인다.
 * 여백이 섬보다 커서 영역에 기호가 하나도 놓이지 않는 일을 막는다
 */
const FULL_DEPTH = 40

type PeakStyle = 'mountain' | 'snow' | 'hill'

/** 산·나무 등 흩뿌린 기호가 피할 상자 (지역 라벨) */
export interface AvoidBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface TerrainInput {
  profileFor: (landmass: Landmass, x: number, y: number) => ReliefProfile
  /** 장소 데이터의 대략적 범위(soft)가 먼저, 바탕 지형 데이터의 영역이 그 뒤에 — 뒤가 앞을 덮는다 */
  patches: TerrainPatch[]
  /** 지점 마커 자리 — 기호를 비켜 둔다 */
  avoid: Point[]
  /** 카드 표시 자리 — 낮은 기호(늪 풀포기·툰드라·빙원·용암 획)만 비켜 둔다 (산·나무 배치는 카드 표시와 상관없이 그대로) */
  pins?: readonly Point[]
  /** 지역 라벨 자리 — 물 위에 심는 맹그로브처럼 라벨이 잘 놓이는 빈 곳을 메우는 기호만 비켜 둔다 */
  labelBoxes: readonly AvoidBox[]
  /** 강·단애선·한 점 기호 자리 — 산·나무 기호를 두지 않는다 */
  blocked: (x: number, y: number) => boolean
  lines: readonly TerrainLine[]
  /** 강·협곡이 바다로 나가는 물길 — 절벽 해안의 빗금을 그 어귀에서 끊는다 (r: 물길에서 이만큼) */
  coastBreaks: readonly { line: readonly Point[]; r: number }[]
  /** 단애선의 빗금 길이 (선마다, landscape.ts 의 cliffDepth) */
  cliffDepth: (l: TerrainLine) => number
  /** 정확한 물 판정 (geo.ts 의 wetAt) — 물가 절벽의 빗금이 물가에 닿지 않게 */
  wetAt: (x: number, y: number) => boolean
}

/** 점 무리를 격자에 담아 가까운 점을 빨리 찾는다 */
function pointGrid(cell: number) {
  const grid = new Map<string, Point[]>()
  const key = (gx: number, gy: number) => `${gx},${gy}`
  return {
    add(p: Point) {
      const k = key(Math.floor(p[0] / cell), Math.floor(p[1] / cell))
      const list = grid.get(k)
      if (list) list.push(p)
      else grid.set(k, [p])
    },
    /** test 를 만족하는 점이 (x, y) 둘레 한 칸 안에 있는가 */
    some(x: number, y: number, test: (p: Point) => boolean) {
      const gx = Math.floor(x / cell)
      const gy = Math.floor(y / cell)
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (grid.get(key(gx + dx, gy + dy))?.some(test)) return true
      return false
    },
  }
}

export function buildTerrain({
  profileFor,
  patches,
  avoid,
  pins = [],
  labelBoxes,
  blocked,
  lines,
  coastBreaks,
  cliffDepth,
  wetAt,
}: TerrainInput): TerrainLayers {
  const raster = getTerrainRaster()
  const near = (x: number, y: number, r: number) => avoid.some(([ax, ay]) => (ax - x) ** 2 + (ay - y) ** 2 < r * r)
  /** 낮은 기호의 자리 — 마커 여백에 더해 카드 표시 둘레도 비운다 */
  const PIN_R = 8
  const freeLow = (x: number, y: number, r: number) => free(x, y, r) && !pins.some(([ax, ay]) => (ax - x) ** 2 + (ay - y) ** 2 < PIN_R * PIN_R)
  const inLabel = (x: number, y: number, m: number) => labelBoxes.some((b) => x > b.x0 - m && x < b.x1 + m && y > b.y0 - m && y < b.y1 + m)
  const whole: Bounds = { x0: 0, y0: 0, x1: MAP_WIDTH, y1: MAP_HEIGHT }
  // 뒤에 오는 영역이 앞을 덮으므로 뒤에서부터 찾는다
  const hard = patches.filter((p) => !p.soft).reverse()
  const soft = patches.filter((p) => p.soft)
  const hardAt = (x: number, y: number) => hard.find((p) => inPatch(p, x, y))
  const softPlainAt = (x: number, y: number) => soft.some((p) => p.kind === 'plain' && inPatch(p, x, y))
  /**
   * 기호 하나가 차지하는 자리가 영역 경계를 넘지 않는가 — 가운데와 둘레 네 점이 모두 같은 덮어쓰는 영역(또는 모두 영역 밖)이어야 한다.
   * 장소 데이터의 협곡 단애가 메사 영역으로, 대륙의 산이 트인 땅(plain) 영역으로 넘어 들어가지 않게
   */
  const sameOwner = (x: number, y: number, rx: number, up: number, down = 0, key: (p: TerrainPatch | undefined) => unknown = (p) => p) => {
    const h = key(hardAt(x, y))
    return key(hardAt(x - rx, y - up * 0.4)) === h && key(hardAt(x + rx, y - up * 0.4)) === h && key(hardAt(x, y - up)) === h && key(hardAt(x, y + down)) === h
  }
  /**
   * 산 기호의 주인 — 산 영역끼리, 그리고 산 영역과 영역 밖(대륙의 산 바탕)은 같은 주인으로 친다. 산줄기 영역이 산 골짜기 영역 위에
   * 겹친 곳(Akoum 의 이빨)에서 경계를 따라 산 없는 띠가 생기지 않게. 숲·트인 땅 같은 다른 영역으로는 여전히 넘어가지 않는다
   */
  const peakOwner = (p: TerrainPatch | undefined) => (!p || p.kind === 'mountain' ? 'peak' : p)
  /** 이 영역의 기호를 그 자리에 그릴지 — 덮어쓰는 영역은 맨 위일 때만, soft 는 덮어쓰는 영역이 없을 때만 */
  const owns = (p: TerrainPatch, x: number, y: number) => (p.soft ? inPatch(p, x, y) && !hardAt(x, y) : hardAt(x, y) === p)
  /** 놓인 땅의 크기에 맞춘 여백 배율 (큰 땅 1, 작은 섬일수록 작다) */
  const fit = (x: number, y: number) => {
    const li = raster.landAt(x, y)
    return li < 0 ? 1 : Math.max(0.3, Math.min(1, raster.landDepth(li) / FULL_DEPTH))
  }
  const onLand = (x: number, y: number, coast: number) =>
    raster.landAt(x, y) >= 0 && raster.coastDistance(x, y) > coast * fit(x, y) && !raster.waterAt(x, y)
  // 산 기호는 점 위로 솟으니 조금 위쪽도 본다
  const freeTall = (x: number, y: number, r: number) => !near(x, y, r * fit(x, y)) && !blocked(x, y) && !blocked(x, y - 7)
  const free = (x: number, y: number, r: number) => !near(x, y, r * fit(x, y)) && !blocked(x, y)
  // 덮어쓰는 영역은 작거나 가늘 수 있어 시작점을 여러 번 찾는다 — 해안을 따라 가는 띠는 상자 대부분이 바다·해안 여백이라
  // 몇 번으로는 띠 조각이 시작점을 못 얻어 통째로 빈다 (soft 는 예전 배치 그대로)
  const tries = (p: TerrainPatch) => (p.soft ? 1 : 40)

  // --- 산·언덕·대지·수정 — y 띠로 묶어 앞(아래)의 기호가 뒤를 가린다 ---
  const rand = mulberry32(hashSeed('mountains'))
  const broad = valueNoise2D(hashSeed('relief-broad'), 70)
  const fine = valueNoise2D(hashSeed('relief-fine'), 26)
  const relief = (x: number, y: number): { density: number; style: PeakStyle; crystal: number } => {
    const profile = profileFor(landmasses[raster.landAt(x, y)], x, y)
    const peak: PeakStyle = profile.snow ? 'snow' : 'mountain'
    const h = hardAt(x, y)
    // 덮어쓰는 영역의 밀도는 그 자리의 밀도를 정한다 (대륙·장소 범위보다 낮출 수도 있다)
    if (h) {
      if (h.kind === 'mountain') return { density: h.density ?? AREA_DENSITY.mountain!, style: peak, crystal: 0 }
      if (h.kind === 'hills') return { density: h.density ?? AREA_DENSITY.hills!, style: 'hill', crystal: 0 }
      return { density: profile.mountains * (UNDER_RELIEF[h.kind] ?? 0), style: profile.hills ? 'hill' : peak, crystal: 0 }
    }
    const inRing = profile.ring ? isInRing(profile.ring, raster.coastDistance(x, y)) : false
    let density = profile.mountains
    // 고리 산맥은 숲·늪보다 앞선다 (Tazeem: 숲은 Bulwark 안쪽에 있다). 언덕 땅을 두른 고리(Murasa)는 띠 안쪽이 언덕
    if (inRing) density = 0.95
    else if (profile.ring && !profile.hills) density *= 0.1
    for (const p of soft) {
      if (inRing || !inPatch(p, x, y)) continue
      if (p.kind === 'mountain') density = Math.max(density, 0.92)
      else if (p.kind === 'plateau') density = Math.max(density, 0.5)
      else if (p.kind === 'canyon') density *= 0.35
      else if (p.kind === 'plain') density = 0
      else density *= 0.15
    }
    if (!inRing && raster.forestAt(x, y)) density *= 0.12
    return { density, style: profile.snow ? 'snow' : profile.hills && !inRing ? 'hill' : 'mountain', crystal: profile.crystal ?? 0 }
  }
  const glyphs: { y: number; fill: string; crystal: string; ridge: string; hatch: string; crystalRidge: string; crystalHatch: string }[] = []
  // 덮어쓰는 산·언덕 영역은 영역 전체에 고르게 — 넓은 잡음으로 솎으면 작은 영역(숲 가운데의 언덕)이 통째로 빌 수 있다
  const jitter = valueNoise2D(hashSeed('relief-area'), 5)
  /** 봉우리 하나가 설 자리인가 (밀도는 보지 않는다) */
  const peakSpot = (x: number, y: number) => {
    // 언덕 영역의 기호는 낮고 작아 마커·경계 여백을 줄인다 (숲 가운데 작은 석회암 언덕에도 언덕이 서게)
    const low = hardAt(x, y)?.kind === 'hills'
    return onLand(x, y, 14) && freeTall(x, y, low ? 10 : 16) && (low ? sameOwner(x, y, 6, 5) : sameOwner(x, y, 8, 12, 0, peakOwner))
  }
  const peakAccept = (x: number, y: number) => {
    if (!peakSpot(x, y)) return false
    const h = hardAt(x, y)
    const low = h?.kind === 'hills'
    const noise = h && (h.kind === 'mountain' || low) ? jitter(x, y) : broad(x, y) * 0.75 + fine(x, y) * 0.25
    return noise < relief(x, y).density * 0.95
  }
  // 상한은 지도 전체를 다 채우고도 남게. 시작점은 칸마다 세 번까지 찾는다 — 한 번이면 산 영역 따위로 둘레와 끊긴 숲·산 조각이
  // 시작점을 하나도 못 얻어 통째로 빌 수 있다
  const mountainPoints = poissonDisk(whole, 13, rand, (x, y) => peakAccept(x, y), 20000, 3)
  // 덮어쓰는 산·언덕 영역 — 둘레에 산이 없으면(숲 가운데의 언덕 등) 지도 전체 배치의 시작점이 닿지 않아 비기 쉽다. 영역마다 한 번 더 채운다
  const peaks = pointGrid(26)
  for (const p of mountainPoints) peaks.add(p)
  for (const p of hard) {
    if (p.kind !== 'mountain' && p.kind !== 'hills') continue
    const pr = mulberry32(hashSeed(`${p.kind}:${p.x}:${p.y}`))
    const more = poissonDisk(p.bounds, 13, pr, (x, y) =>
      owns(p, x, y) && peakAccept(x, y) && !peaks.some(x, y, ([px, py]) => (px - x) ** 2 + (py - y) ** 2 < 13 * 13), 4000, tries(p))
    for (const q of more) {
      peaks.add(q)
      mountainPoints.push(q)
    }
    // 언덕 영역은 밀도가 낮아도 언덕 하나는 — 좁은 잡음 탓에 작은 영역이 나무만 걷히고 텅 비지 않게
    if (p.kind === 'hills' && (p.density ?? 1) > 0 && !mountainPoints.some(([x, y]) => owns(p, x, y))) {
      for (const q of poissonDisk(p.bounds, 13, pr, (x, y) => owns(p, x, y) && peakSpot(x, y), 1, tries(p))) {
        peaks.add(q)
        mountainPoints.push(q)
      }
    }
  }
  // 대륙의 산 가운데 일부는 수정 첨탑 (Akoum) — 배치와 따로 굴리는 난수라 산 자리는 그대로다
  const crystalRand = mulberry32(hashSeed('relief-crystal'))
  for (const [x, y] of mountainPoints) {
    const r = relief(x, y)
    if (r.style === 'mountain' && r.crystal > 0 && crystalRand() < r.crystal) {
      const g = crystalGlyph(x, y, crystalRand, true)
      glyphs.push({ y, fill: '', crystal: g.fill, ridge: '', hatch: '', crystalRidge: g.ridge, crystalHatch: g.hatch })
      continue
    }
    const glyph = r.style === 'snow' ? snowGlyph(x, y, rand) : r.style === 'hill' ? hillGlyph(x, y, rand) : mountainGlyph(x, y, rand)
    glyphs.push({ y, crystal: '', crystalRidge: '', crystalHatch: '', ...glyph })
  }
  // 대지·수정 첨탑 — 그 영역 안에만
  for (const p of hard) {
    if (p.kind !== 'mesa' && p.kind !== 'crystal') continue
    const mesa = p.kind === 'mesa'
    const density = p.density ?? AREA_DENSITY[p.kind]!
    const small = !mesa && density < CRYSTAL_SMALL_BELOW
    const pr = mulberry32(hashSeed(`${p.kind}:${p.x}:${p.y}`))
    // 대지 기호의 좌우·위 여백은 영역이 작으면 영역에 맞춰 줄인다 — 작은 대지(Kazandu 의 남은 대지 조각)에도 하나는 서게
    const w = p.bounds.x1 - p.bounds.x0
    const h = p.bounds.y1 - p.bounds.y0
    const rx = mesa ? Math.min(10, w * 0.36) : 4
    const up = mesa ? Math.min(8, h * 0.4) : 8
    const pts = poissonDisk(p.bounds, mesa ? 22 : small ? 12 : 11, pr, (x, y) =>
      owns(p, x, y) && onLand(x, y, mesa ? 11 : 7) && freeTall(x, y, 14) && sameOwner(x, y, rx, up) &&
      fine(x, y) * 0.7 + broad(x, y) * 0.3 < density, 4000, tries(p))
    for (const [x, y] of pts) {
      if (mesa) glyphs.push({ y, crystal: '', crystalRidge: '', crystalHatch: '', ...mesaGlyph(x, y, pr) })
      else {
        const g = crystalGlyph(x, y, pr, small)
        glyphs.push({ y, fill: '', crystal: g.fill, ridge: '', hatch: '', crystalRidge: g.ridge, crystalHatch: g.hatch })
      }
    }
  }
  glyphs.sort((a, b) => a.y - b.y)
  // 같은 띠 안에서는 겹침이 적어, 띠 단위로만 앞뒤를 가려도 충분하다
  const BAND = 16
  const mountains: MountainBand[] = []
  for (const g of glyphs) {
    const key = Math.floor(g.y / BAND)
    let band = mountains[mountains.length - 1]
    if (!band || band.key !== key) {
      band = { key, fill: '', crystal: '', ridge: '', hatch: '', crystalRidge: '', crystalHatch: '' }
      mountains.push(band)
    }
    band.fill += g.fill
    band.crystal += g.crystal
    band.ridge += g.ridge
    band.hatch += g.hatch
    band.crystalRidge += g.crystalRidge
    band.crystalHatch += g.crystalHatch
  }
  /** 이 자리가 봉우리 기호에 가려지는가 — 봉우리는 밑동(점)에서 위로 솟고 좌우로 퍼진다 */
  const underPeak = (x: number, y: number) =>
    peaks.some(x, y, ([px, py]) => Math.abs(px - x) < 7 && y > py - 12 && y < py + 3)

  // --- 숲: 추출한 숲 영역 + 숲 영역 데이터 ---
  const treeRand = mulberry32(hashSeed('trees'))
  const treeOk = (x: number, y: number) => onLand(x, y, 6) && free(x, y, 11) && !blocked(x, y - 3)
  // 고리 산맥 띠와 그 바깥 해변에는 나무를 두지 않는다 (덮어쓰는 숲 영역은 예외)
  const ringClear = (x: number, y: number) => {
    const ring = profileFor(landmasses[raster.landAt(x, y)], x, y).ring
    return !ring || raster.coastDistance(x, y) > ring[1]
  }
  const thin = valueNoise2D(hashSeed('trees-between-peaks'), 9)
  /**
   * 팬 지도 숲 위의 덮어쓰는 영역 — 산 영역은 숲 채색을 남기고 봉우리 사이에 드문 나무를 둔다 (Skyfang: 'covered in forests').
   * 언덕 영역(Bala Ged 의 석회암 언덕)은 채색만 남기고 언덕이 나무를 대신한다. 나머지 영역(늪·트인 땅·대지 등)은 나무를 걷어 낸다
   */
  const forestUnder = (x: number, y: number) => {
    const h = hardAt(x, y)
    if (!h) return !softPlainAt(x, y) && ringClear(x, y)
    return h.kind === 'mountain' && thin(x, y) < 0.55 && !underPeak(x, y)
  }
  const treePoints = [
    ...poissonDisk(whole, 8.5, treeRand, (x, y) => raster.forestAt(x, y) && treeOk(x, y) && forestUnder(x, y) && sameOwner(x, y, 3.5, 4), 40000, 3),
    ...patches
      .filter((p) => p.kind === 'forest')
      .flatMap((p) =>
        poissonDisk(p.bounds, 8.5, treeRand, (x, y) =>
          owns(p, x, y) && treeOk(x, y) && (p.soft ? sameOwner(x, y, 3.5, 4) && !raster.forestAt(x, y) && !softPlainAt(x, y) && ringClear(x, y) : true), 4000, tries(p)),
      ),
  ]
  const crowns = tiler()
  const trunks = tiler()
  for (const [x, y] of treePoints) {
    const t = treeGlyph(x, y, treeRand)
    crowns.add(x, y, t.crown)
    trunks.add(x, y, t.trunk)
  }

  // --- 늪: 물결 위의 풀 포기 / 맹그로브: 버팀뿌리 나무와 풀포기 ---
  const marsh = tiler()
  const marshRand = mulberry32(hashSeed('marsh'))
  const wet = (x: number, y: number) => raster.landAt(x, y) < 0 || raster.waterAt(x, y)
  for (const p of patches) {
    if (p.kind === 'swamp') {
      // 덮어쓰는 늪 영역은 조금 촘촘히 — 숲 가운데의 작은 늪(Bala Ged)도 늪으로 읽히게
      // 풀포기는 낮아 마커 바로 곁까지 와도 마커를 가리지 않는다 — 마커를 감싼 작은 늪(Prison of Omnath, Crypt of Agadeem)도 늪으로 보이게
      // 작은 섬의 늪(Agadeem)은 땅 크기에 맞춰 더 촘촘히 — 협곡·마커 여백을 빼고 남은 좁은 땅에도 풀포기가 여럿 서게.
      // 장소 범위의 늪(soft)도 시작점을 여러 번 찾는다 — 가운데 마커·기호 여백에 한 번 빗나가면 늪이 통째로 빈다 (Hanging Swamp)
      const pts = poissonDisk(p.bounds, p.soft ? 15 : 12 * Math.max(0.6, fit(p.x, p.y)), marshRand, (x, y) =>
        owns(p, x, y) && raster.landAt(x, y) >= 0 && !raster.waterAt(x, y) && raster.coastDistance(x, y) > 6 * fit(x, y) &&
        freeLow(x, y, p.soft ? 12 : 4) && sameOwner(x, y, 5, 5), 4000, p.soft ? 8 : tries(p))
      for (const [x, y] of pts) for (const d of marshGlyph(x, y, marshRand)) marsh.add(x, y, d)
    } else if (p.kind === 'mangrove') {
      // 영역 안이면 물 위에도 심는다 (Sunder Bay 의 하라바즈 숲은 바닷속에 뿌리를 박았다) — 물 위 나무는 라벨·마커를 비켜 둔다
      const pts = poissonDisk(p.bounds, 10, marshRand, (x, y) => {
        if (!owns(p, x, y) || !free(x, y, 11) || blocked(x, y - 5)) return false
        if (wet(x, y)) return !inLabel(x, y, 4) && !near(x, y, 14)
        return raster.coastDistance(x, y) > 2.5
      }, 4000, tries(p))
      for (const [x, y] of pts) {
        if (wet(x, y) || marshRand() < 0.6) {
          const g = mangroveGlyph(x, y, marshRand)
          crowns.add(x, y, g.crown)
          trunks.add(x, y, g.roots)
          marsh.add(x, y, g.water)
        } else for (const d of marshGlyph(x, y, marshRand)) marsh.add(x, y, d)
      }
    }
  }

  // --- 빙원: 짧은 가로 획 ---
  const ice = tiler()
  const iceRand = mulberry32(hashSeed('ice'))
  for (const p of patches.filter((q) => q.kind === 'ice')) {
    const pts = poissonDisk(p.bounds, 11, iceRand, (x, y) =>
      owns(p, x, y) && raster.landAt(x, y) >= 0 && raster.coastDistance(x, y) > 5 * fit(x, y) && freeLow(x, y, 10) && sameOwner(x, y, 4, 1), 4000, tries(p))
    for (const [x, y] of pts) ice.add(x, y, `M${f(x)} ${f(y)}l${f(3 + iceRand() * 3)} 0`)
  }

  // --- 협곡: 흐름장을 따라 놓인 짧은 단애선 — 한쪽에 빗금 ---
  const canyons = tiler()
  const canyonRand = mulberry32(hashSeed('canyons'))
  const flow = valueNoise2D(hashSeed('canyon-flow'), 140)
  for (const p of patches.filter((q) => q.kind === 'canyon')) {
    // 대부분 트인 협곡 지대(Makindi)가 가장자리에서 팬 지도 숲에 걸치면, 숲 안의 단애는 드물게 — 나무 위에 단애가 빽빽하면 어수선하다.
    // 숲이 지붕처럼 덮은 협곡(Kazandu)은 단애가 협곡의 유일한 표시라 그대로 둔다
    let land = 0
    let wooded = 0
    for (let y = p.bounds.y0; y <= p.bounds.y1; y += 6) {
      for (let x = p.bounds.x0; x <= p.bounds.x1; x += 6) {
        if (!owns(p, x, y) || raster.landAt(x, y) < 0) continue
        land++
        if (raster.forestAt(x, y)) wooded++
      }
    }
    const thinInForest = land > 0 && wooded / land < 0.5
    const thinRand = mulberry32(hashSeed(`canyon-thin:${p.x}:${p.y}`))
    const pts = poissonDisk(p.bounds, 17, canyonRand, (x, y) =>
      owns(p, x, y) && raster.landAt(x, y) >= 0 && !raster.waterAt(x, y) && raster.coastDistance(x, y) > 12 * fit(x, y) &&
      free(x, y, 14) && sameOwner(x, y, 10, 6, 6), 4000, tries(p)).filter(([x, y]) => !thinInForest || !raster.forestAt(x, y) || thinRand() < 0.3)
    for (const [x, y] of pts) for (const d of canyonGlyph(x, y, flow(x, y) * Math.PI * 2.4, canyonRand)) canyons.add(x, y, d)
  }

  // --- 용암 들판: 흐름 획과 갈라진 껍질 / 툰드라: 드문 풀포기와 서리 점 ---
  const lava = tiler()
  const tundra = tiler()
  const frost = tiler()
  const lavaRand = mulberry32(hashSeed('lava'))
  const lavaFlow = valueNoise2D(hashSeed('lava-flow'), 60)
  for (const p of patches) {
    if (p.kind === 'lava') {
      const pts = poissonDisk(p.bounds, 8.5, lavaRand, (x, y) => owns(p, x, y) && onLand(x, y, 4) && freeLow(x, y, 10), 4000, tries(p))
      for (const [x, y] of pts) lava.add(x, y, lavaGlyph(x, y, lavaFlow(x, y) * Math.PI * 2.2, lavaRand))
    } else if (p.kind === 'tundra') {
      const spacing = 14 / Math.sqrt(p.density ?? 1)
      const pts = poissonDisk(p.bounds, spacing, lavaRand, (x, y) => owns(p, x, y) && onLand(x, y, 4) && freeLow(x, y, 10), 4000, tries(p))
      for (const [x, y] of pts) {
        const [tuft, dots] = tundraGlyph(x, y, lavaRand)
        tundra.add(x, y, tuft)
        frost.add(x, y, dots)
      }
    }
  }
  // 대륙 전체가 툰드라인 곳(Sejiri) — 영역 밖 봉우리 사이 땅에 더 성기게. 덮어쓰는 영역 안은 그 영역의 기호만
  const tundraRand = mulberry32(hashSeed('relief-tundra'))
  const reliefTundra = poissonDisk(whole, 19, tundraRand, (x, y) => {
    const li = raster.landAt(x, y)
    if (li < 0 || !profileFor(landmasses[li], x, y).tundra) return false
    return onLand(x, y, 12) && freeLow(x, y, 12) && !hardAt(x, y) && !raster.forestAt(x, y) && !underPeak(x, y) && !blocked(x, y - 2)
  }, 20000, 3)
  for (const [x, y] of reliefTundra) {
    const [tuft, dots] = tundraGlyph(x, y, tundraRand)
    tundra.add(x, y, tuft)
    frost.add(x, y, dots)
  }

  // --- 절벽 해안과 절벽·협곡 선 ---
  const cliffs = tiler()
  // 물가 절벽 — 호수·바다를 내려다보는 단애는 물 칠 위에 그린다
  const waterCliffs = tiler()
  const breakBoxes = coastBreaks.map((b) => ({ ...b, box: ringBounds(b.line) }))
  const broken = (x: number, y: number) =>
    breakBoxes.some(({ line, r, box }) =>
      x > box.x0 - r && x < box.x1 + r && y > box.y0 - r && y < box.y1 + r && distanceToPolyline(x, y, line, false) < r)
  for (const land of landmasses) {
    const [cx, cy] = land.ring[0]
    if (profileFor(land, cx, cy).cliffs) {
      // 안쪽으로 민 점이 해안선(같은 선)에서 깊이만큼 떨어져 있어야 한다 — 모자라면 다른 변을 민 선과 엇갈리는 자리
      const dist = nearDistance(land.smooth, CLIFF_DEPTH * 2)
      cliffHachure(land.smooth, hashSeed(`cliff:${land.id}`), cliffs, (x, y) => dist(x, y) >= CLIFF_DEPTH * 0.97, broken)
    }
  }
  let gorgeFloors = ''
  for (const l of lines) {
    const seed = hashSeed(`line:${l.id}`)
    if (l.kind === 'cliff') {
      const depth = cliffDepth(l)
      // 빗금 쪽에 물이 있으면 물가 절벽 — 물 칠 위 층에, 빗금은 물가에 닿지 않게
      const pts = resample(l.line, 4, Boolean(l.closed))
      const normals = rightNormals(pts, Boolean(l.closed))
      const byWater = pts.some(([x, y], i) => wetAt(x + normals[i][0] * (depth + 2), y + normals[i][1] * (depth + 2)))
      scarp(l.line, Boolean(l.closed), 1, depth, seed, byWater ? waterCliffs : cliffs, byWater ? wetAt : undefined)
    } else gorgeFloors += gorge(l.line, l.width ?? 8, seed, cliffs)
  }

  return {
    mountains,
    trees: { crowns: crowns.paths(), trunks: trunks.paths() },
    marsh: marsh.paths(),
    ice: ice.paths(),
    cliffs: cliffs.paths(),
    waterCliffs: waterCliffs.paths(),
    canyons: canyons.paths(),
    lava: lava.paths(),
    tundra: tundra.paths(),
    frost: frost.paths(),
    gorgeFloors,
  }
}
