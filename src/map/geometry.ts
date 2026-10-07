// 지도 좌표 기하 유틸 — 좌표계는 src/data/geo 와 같은 2400×1700 지도 단위.

export type Point = readonly [number, number]
export type Ring = readonly Point[]

export interface Bounds {
  x0: number
  y0: number
  x1: number
  y1: number
}

/** 시드 고정 난수 — 같은 시드면 매번 같은 지도가 그려진다. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashSeed(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** 격자 값 노이즈 (0..1) — 산맥 밀도처럼 넓게 변하는 값에 쓴다. */
export function valueNoise2D(seed: number, cell: number): (x: number, y: number) => number {
  const lattice = (ix: number, iy: number) => {
    let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + seed) | 0
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
  }
  const smooth = (t: number) => t * t * (3 - 2 * t)
  return (x, y) => {
    const gx = x / cell
    const gy = y / cell
    const ix = Math.floor(gx)
    const iy = Math.floor(gy)
    const tx = smooth(gx - ix)
    const ty = smooth(gy - iy)
    const a = lattice(ix, iy) + (lattice(ix + 1, iy) - lattice(ix, iy)) * tx
    const b = lattice(ix, iy + 1) + (lattice(ix + 1, iy + 1) - lattice(ix, iy + 1)) * tx
    return a + (b - a) * ty
  }
}

export function ringBounds(ring: Ring): Bounds {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const [x, y] of ring) {
    if (x < x0) x0 = x
    if (y < y0) y0 = y
    if (x > x1) x1 = x
    if (y > y1) y1 = y
  }
  return { x0, y0, x1, y1 }
}

/**
 * 큰 다각형(해안선·지형 영역)의 변을 y 띠로 묶어 둔 것 — 기호 배치가 같은 다각형을 수만 번 판정해서,
 * 그 점의 y 를 지나는 띠의 변만 본다. 교차 횟수의 홀짝은 변을 보는 순서와 상관없어 결과는 모두 훑을 때와 같다
 */
interface RingIndex {
  /** 만들 때의 꼭짓점 수 — 달라지면 다시 만든다 */
  n: number
  y0: number
  y1: number
  band: number
  /** 띠 b 의 변은 edges[start[b]*4 .. start[b+1]*4) — 변 하나는 [xi, yi, xj, yj] */
  start: Uint32Array
  edges: Float64Array
}
const RING_INDEX_MIN = 48
const ringIndexes = new WeakMap<Ring, RingIndex>()

function ringIndex(ring: Ring): RingIndex {
  const cached = ringIndexes.get(ring)
  if (cached && cached.n === ring.length) return cached
  let y0 = Infinity
  let y1 = -Infinity
  for (const p of ring) {
    if (p[1] < y0) y0 = p[1]
    if (p[1] > y1) y1 = p[1]
  }
  const n = ring.length
  const bands = Math.max(1, Math.min(256, Math.ceil(n / 4)))
  const band = (y1 - y0) / bands || 1
  const bandOf = (v: number) => Math.min(bands - 1, Math.floor((v - y0) / band))
  const count = new Uint32Array(bands + 1)
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = ring[i][1]
    const b = ring[j][1]
    for (let k = bandOf(Math.min(a, b)), e = bandOf(Math.max(a, b)); k <= e; k++) count[k + 1]++
  }
  for (let k = 0; k < bands; k++) count[k + 1] += count[k]
  const start = count.slice()
  const fill = count.slice()
  const edges = new Float64Array(start[bands] * 4)
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    for (let k = bandOf(Math.min(yi, yj)), e = bandOf(Math.max(yi, yj)); k <= e; k++) {
      const o = fill[k]++ * 4
      edges[o] = xi
      edges[o + 1] = yi
      edges[o + 2] = xj
      edges[o + 3] = yj
    }
  }
  const index = { n, y0, y1, band, start, edges }
  ringIndexes.set(ring, index)
  return index
}

export function pointInRing(x: number, y: number, ring: Ring): boolean {
  if (ring.length >= RING_INDEX_MIN) {
    const { y0, y1, band, start, edges } = ringIndex(ring)
    // 띠 밖이면 y 를 가로지르는 변이 없다
    if (!(y >= y0 && y < y1)) return false
    const k = Math.min(start.length - 2, Math.floor((y - y0) / band))
    let inside = false
    for (let o = start[k] * 4, end = start[k + 1] * 4; o < end; o += 4) {
      const xi = edges[o]
      const yi = edges[o + 1]
      const xj = edges[o + 2]
      const yj = edges[o + 3]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
  }
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** 점에서 폴리곤 경계까지의 최단 거리 */
export function distanceToRing(x: number, y: number, ring: Ring): number {
  let best = Infinity
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[j]
    const [bx, by] = ring[i]
    const dx = bx - ax
    const dy = by - ay
    const len = dx * dx + dy * dy
    const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len))
    const d = Math.hypot(x - (ax + t * dx), y - (ay + t * dy))
    if (d < best) best = d
  }
  return best
}

export function ringArea(ring: Ring): number {
  let a = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
  }
  return Math.abs(a) / 2
}

/** 닫힌 링 Chaikin 스무딩 — 픽셀 추출에서 생긴 계단을 펴 준다. */
export function chaikin(ring: Ring, iterations = 1): Point[] {
  let pts: Point[] = [...ring]
  for (let k = 0; k < iterations; k++) {
    const next: Point[] = []
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i]
      const [bx, by] = pts[(i + 1) % pts.length]
      next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25])
      next.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75])
    }
    pts = next
  }
  return pts
}

/** 펜 떨림처럼 법선 방향으로 아주 약하게 흔든다. */
export function inkWobble(ring: Ring, seed: number, amplitude: number): Point[] {
  const rand = mulberry32(seed)
  const n = ring.length
  // 이웃끼리 비슷하게 흔들리도록 난수를 한 번 이동평균한다
  const raw = Array.from({ length: n }, () => rand() * 2 - 1)
  return ring.map(([x, y], i) => {
    const [px, py] = ring[(i - 1 + n) % n]
    const [nx, ny] = ring[(i + 1) % n]
    const tx = nx - px
    const ty = ny - py
    const len = Math.hypot(tx, ty) || 1
    const w = (raw[(i - 1 + n) % n] + raw[i] * 2 + raw[(i + 1) % n]) / 4
    return [x + (-ty / len) * w * amplitude, y + (tx / len) * w * amplitude] as const
  })
}

/** Douglas-Peucker 단순화 (닫힌 링) */
export function simplifyRing(ring: Ring, epsilon: number): Point[] {
  if (ring.length < 4) return [...ring]
  const keep = new Uint8Array(ring.length)
  const stack: [number, number][] = [[0, ring.length - 1]]
  keep[0] = 1
  keep[ring.length - 1] = 1
  while (stack.length) {
    const [a, b] = stack.pop()!
    const [ax, ay] = ring[a]
    const [bx, by] = ring[b]
    const dx = bx - ax
    const dy = by - ay
    const len = Math.hypot(dx, dy) || 1
    let far = -1
    let farDist = epsilon
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((ring[i][0] - ax) * dy - (ring[i][1] - ay) * dx) / len
      if (d > farDist) {
        farDist = d
        far = i
      }
    }
    if (far > 0) {
      keep[far] = 1
      stack.push([a, far], [far, b])
    }
  }
  return ring.filter((_, i) => keep[i] === 1)
}

const fmt = (v: number) => (Math.round(v * 10) / 10).toString()

export function ringToPath(ring: Ring): string {
  if (ring.length === 0) return ''
  let d = `M${fmt(ring[0][0])} ${fmt(ring[0][1])}`
  for (let i = 1; i < ring.length; i++) d += `L${fmt(ring[i][0])} ${fmt(ring[i][1])}`
  return `${d}Z`
}

export function polylineToPath(points: readonly Point[]): string {
  if (points.length === 0) return ''
  let d = `M${fmt(points[0][0])} ${fmt(points[0][1])}`
  for (let i = 1; i < points.length; i++) d += `L${fmt(points[i][0])} ${fmt(points[i][1])}`
  return d
}

/**
 * Bridson Poisson-disk 샘플링 — 산·나무 기호를 겹치지 않게 흩뿌린다.
 * accept 가 false 인 점은 버린다. minDist 는 위치마다 달라도 된다(radiusAt).
 */
export function poissonDisk(
  bounds: Bounds,
  radius: number,
  rand: () => number,
  accept: (x: number, y: number) => boolean,
  maxPoints = 4000,
  /** 시작 칸마다 시작점을 몇 번 찾아볼지 — 작은 영역(시작 칸 하나보다 작다)에서는 한 번으로는 빗나가기 쉽다 */
  seedTries = 1,
): Point[] {
  const cell = radius / Math.SQRT2
  const cols = Math.ceil((bounds.x1 - bounds.x0) / cell) + 1
  const rows = Math.ceil((bounds.y1 - bounds.y0) / cell) + 1
  const grid = new Int32Array(cols * rows).fill(-1)
  const points: Point[] = []
  const active: number[] = []
  const gridIndex = (x: number, y: number) =>
    Math.floor((y - bounds.y0) / cell) * cols + Math.floor((x - bounds.x0) / cell)

  const fits = (x: number, y: number) => {
    if (x < bounds.x0 || x > bounds.x1 || y < bounds.y0 || y > bounds.y1) return false
    const gx = Math.floor((x - bounds.x0) / cell)
    const gy = Math.floor((y - bounds.y0) / cell)
    for (let yy = Math.max(0, gy - 2); yy <= Math.min(rows - 1, gy + 2); yy++) {
      for (let xx = Math.max(0, gx - 2); xx <= Math.min(cols - 1, gx + 2); xx++) {
        const idx = grid[yy * cols + xx]
        if (idx >= 0) {
          const [px, py] = points[idx]
          if ((px - x) ** 2 + (py - y) ** 2 < radius * radius) return false
        }
      }
    }
    return true
  }

  const add = (x: number, y: number) => {
    points.push([x, y])
    grid[gridIndex(x, y)] = points.length - 1
    active.push(points.length - 1)
  }

  // 성긴 격자마다 시작점을 시도해야 서로 떨어진 영역(섬, 숲 조각)도 빠짐없이 채워진다
  const seedStep = radius * 5
  for (let gy = bounds.y0; gy < bounds.y1 && points.length < maxPoints; gy += seedStep) {
    for (let gx = bounds.x0; gx < bounds.x1 && points.length < maxPoints; gx += seedStep) {
      // 여러 번 찾을 때는 영역 안에서만 고른다 (한 번이면 예전과 같은 자리 — 지도 전체의 기호 배치가 바뀌지 않게)
      const spanX = seedTries > 1 ? Math.min(seedStep, bounds.x1 - gx) : seedStep
      const spanY = seedTries > 1 ? Math.min(seedStep, bounds.y1 - gy) : seedStep
      for (let k = 0; k < seedTries; k++) {
        const x = gx + rand() * spanX
        const y = gy + rand() * spanY
        if (x <= bounds.x1 && y <= bounds.y1 && accept(x, y) && fits(x, y)) {
          add(x, y)
          break
        }
      }
    }
  }

  while (active.length > 0 && points.length < maxPoints) {
    const ai = Math.floor(rand() * active.length)
    const [cx, cy] = points[active[ai]]
    let placed = false
    for (let k = 0; k < 20; k++) {
      const angle = rand() * Math.PI * 2
      const r = radius * (1 + rand())
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r
      if (fits(x, y) && accept(x, y)) {
        add(x, y)
        placed = true
        break
      }
    }
    if (!placed) active.splice(ai, 1)
  }
  return points
}

/** 열린 선 Chaikin 스무딩 — 양 끝점은 그대로 둔다 */
export function chaikinOpen(points: readonly Point[], iterations = 1): Point[] {
  let pts: Point[] = [...points]
  for (let k = 0; k < iterations && pts.length > 2; k++) {
    const next: Point[] = [pts[0]]
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i]
      const [bx, by] = pts[i + 1]
      next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25])
      next.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75])
    }
    next.push(pts[pts.length - 1])
    pts = next
  }
  return pts
}

/** 선을 step 간격의 점으로 다시 찍는다. 닫힌 선이면 첫 점으로 돌아오는 변까지 (마지막 점은 첫 점과 겹치지 않는다) */
export function resample(points: readonly Point[], step: number, closed = false): Point[] {
  const pts = closed ? [...points, points[0]] : points
  const out: Point[] = []
  let carry = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[i + 1]
    const len = Math.hypot(bx - ax, by - ay)
    if (len === 0) continue
    let t = carry
    while (t < len) {
      out.push([ax + ((bx - ax) * t) / len, ay + ((by - ay) * t) / len])
      t += step
    }
    carry = t - len
  }
  if (!closed && pts.length > 0) {
    const last = pts[pts.length - 1]
    const prev = out[out.length - 1]
    if (!prev || Math.hypot(prev[0] - last[0], prev[1] - last[1]) > step * 0.3) out.push(last)
  }
  return out
}

/**
 * 선의 점마다 진행 방향 오른쪽 단위 법선 — 지도 좌표는 y 가 아래로 자라, (dx, dy) 의 오른쪽은 (-dy, dx).
 * 꼭짓점에서는 앞뒤 변의 방향을 평균한다
 */
export function rightNormals(points: readonly Point[], closed = false): Point[] {
  const n = points.length
  return points.map((_, i) => {
    const a = points[closed ? (i - 1 + n) % n : Math.max(0, i - 1)]
    const b = points[closed ? (i + 1) % n : Math.min(n - 1, i + 1)]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len = Math.hypot(dx, dy) || 1
    return [-dy / len, dx / len] as const
  })
}

/** 점에서 선(열린 선, 또는 닫힌 선)까지 최단 거리 */
export function distanceToPolyline(x: number, y: number, points: readonly Point[], closed = false): number {
  let best = Infinity
  const n = points.length
  for (let i = closed ? 0 : 1; i < n; i++) {
    const [ax, ay] = points[(i - 1 + n) % n]
    const [bx, by] = points[i]
    const dx = bx - ax
    const dy = by - ay
    const len = dx * dx + dy * dy
    const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len))
    const d = Math.hypot(x - (ax + t * dx), y - (ay + t * dy))
    if (d < best) best = d
  }
  return best
}
