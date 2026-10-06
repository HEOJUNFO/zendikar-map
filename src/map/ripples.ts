// 해안 물결선 — 해안에서 일정 거리만큼 떨어진 등거리선을 미리 따 둔다.
// 굵은 잉크 획 위에 바다색 획을 덮는 방식은 보이는 선은 가늘어도 래스터가 획 폭 전체를 칠해,
// GPU 가 약한 기기(윈도우 노트북 등)에서 끌기·확대가 뚝뚝 끊긴다. 가는 선 하나로 그리면 같은 모양을 훨씬 싸게 그린다.
import { chaikin, simplifyRing, type Point, type Ring } from './geometry'

/** 격자 1칸 (지도 단위) — 거리장은 매끈해서 선형 보간으로 충분하다 */
const CELL = 2

function chaikinOpen(pts: Point[]): Point[] {
  if (pts.length < 3) return pts
  const out: Point[] = [pts[0]]
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[i + 1]
    out.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75])
  }
  out.push(pts[pts.length - 1])
  return out
}

/**
 * 선 하나를 이만큼의 꼭짓점씩 끊어 따로 그린다. 지도 전체에 걸친 path 하나는 화면 타일마다 꼭짓점을 전부 훑어
 * 확대할수록 비싸진다 — 짧게 끊으면 타일에 닿지 않는 조각은 통째로 건너뛴다. 이음매는 둥근 끝으로 메운다.
 */
const PIECE = 120

const fmt = (v: number) => (Math.round(v * 10) / 10).toString()
const toPath = (pts: readonly Point[]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${fmt(x)} ${fmt(y)}`).join('')

/**
 * rings 바깥으로 levels 만큼 떨어진 등거리선 — level 마다 짧은 path 조각들.
 * 링 안쪽(땅 위) 선은 땅에 덮이므로 만들지 않는다. 가까운 섬끼리는 합친 거리로 — 굵은 획을 겹쳐 그린 것과 같은 모양.
 */
export function coastOffsetPaths(rings: readonly Ring[], levels: readonly number[], minY: number): string[][] {
  const reach = Math.max(...levels) + CELL * 2
  // 격자는 링 범위 + 물결이 닿는 거리. 위쪽은 minY 까지만 — 지도 위로 길게 이어진 링(세지리)이 있다
  let bx0 = Infinity,
    by0 = Infinity,
    bx1 = -Infinity,
    by1 = -Infinity
  for (const r of rings)
    for (const [x, y] of r) {
      bx0 = Math.min(bx0, x)
      by0 = Math.min(by0, y)
      bx1 = Math.max(bx1, x)
      by1 = Math.max(by1, y)
    }
  const X0 = Math.floor((bx0 - reach) / CELL) * CELL
  const Y0 = Math.floor(Math.max(minY, by0 - reach) / CELL) * CELL
  const NX = Math.ceil((bx1 + reach - X0) / CELL) + 1
  const NY = Math.ceil((by1 + reach - Y0) / CELL) + 1

  // 해안선 선분까지의 정확한 거리(제곱) — 선분마다 닿는 칸만 본다
  const d2 = new Float32Array(NX * NY).fill(reach * reach)
  // 가로줄마다 링과 만나는 x — 링 안쪽(땅)을 짝홀로 가린다
  const rowXs: number[][] = Array.from({ length: NY }, () => [])
  for (const r of rings) {
    for (let k = 0; k < r.length; k++) {
      const [ax, ay] = r[k]
      const [qx, qy] = r[(k + 1) % r.length]
      const dx = qx - ax
      const dy = qy - ay
      const len2 = dx * dx + dy * dy || 1
      const i0 = Math.max(0, Math.floor((Math.min(ax, qx) - reach - X0) / CELL))
      const i1 = Math.min(NX - 1, Math.ceil((Math.max(ax, qx) + reach - X0) / CELL))
      const j0 = Math.max(0, Math.floor((Math.min(ay, qy) - reach - Y0) / CELL))
      const j1 = Math.min(NY - 1, Math.ceil((Math.max(ay, qy) + reach - Y0) / CELL))
      for (let j = j0; j <= j1; j++) {
        const py = Y0 + j * CELL
        if (ay > py !== qy > py) rowXs[j].push(ax + ((py - ay) / dy) * dx)
        for (let i = i0; i <= i1; i++) {
          const px = X0 + i * CELL
          const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
          const ex = ax + t * dx - px
          const ey = ay + t * dy - py
          const v = ex * ex + ey * ey
          const n = j * NX + i
          if (v < d2[n]) d2[n] = v
        }
      }
    }
  }

  const field = new Float32Array(NX * NY)
  for (let n = 0; n < field.length; n++) field[n] = Math.sqrt(d2[n])
  for (let j = 0; j < NY; j++) {
    const xs = rowXs[j].sort((a, b) => a - b)
    for (let m = 0; m + 1 < xs.length; m += 2) {
      const i0 = Math.max(0, Math.ceil((xs[m] - X0) / CELL))
      const i1 = Math.min(NX - 1, Math.floor((xs[m + 1] - X0) / CELL))
      for (let i = i0; i <= i1; i++) field[j * NX + i] = -field[j * NX + i]
    }
  }

  return contourPieces(field, NX, NY, X0, Y0, levels)
}

/**
 * marching squares — 격자 변 번호: 가로 변 (j*NX+i)*2, 세로 변 (j*NX+i)*2+1.
 * 칸은 한 번만 훑고, 네 모서리 값이 어느 level 을 사이에 둘 때만 그 level 의 선분을 잇는다
 */
function contourPieces(field: Float32Array, NX: number, NY: number, X0: number, Y0: number, levels: readonly number[]): string[][] {
  const lo = Math.min(...levels)
  const hi = Math.max(...levels)
  const links = levels.map(() => new Map<number, number[]>())
  const link = (m: Map<number, number[]>, a: number, b: number) => {
    const la = m.get(a)
    if (la) la.push(b)
    else m.set(a, [b])
    const lb = m.get(b)
    if (lb) lb.push(a)
    else m.set(b, [a])
  }
  for (let j = 0; j < NY - 1; j++) {
    for (let i = 0; i < NX - 1; i++) {
      const a = j * NX + i
      const b = a + 1
      const d = a + NX
      const c = d + 1
      const fa = field[a],
        fb = field[b],
        fc = field[c],
        fd = field[d]
      const mn = Math.min(fa, fb, fc, fd)
      const mx = Math.max(fa, fb, fc, fd)
      if (mx <= lo || mn > hi) continue
      for (let li = 0; li < levels.length; li++) {
        const level = levels[li]
        if (mx <= level || mn > level) continue
        const m = links[li]
        const sa = fa > level,
          sb = fb > level,
          sc = fc > level,
          sd = fd > level
        const top = a * 2
        const bottom = d * 2
        const left = a * 2 + 1
        const right = b * 2 + 1
        const cross: number[] = []
        if (sa !== sb) cross.push(top)
        if (sb !== sc) cross.push(right)
        if (sd !== sc) cross.push(bottom)
        if (sa !== sd) cross.push(left)
        if (cross.length === 2) {
          link(m, cross[0], cross[1])
          continue
        }
        // 안장점 — 칸 가운데 값으로 어느 쪽 모서리끼리 이어지는지 정한다
        const centerAbove = (fa + fb + fc + fd) / 4 > level
        if (centerAbove === sa) {
          link(m, top, right)
          link(m, bottom, left)
        } else {
          link(m, left, top)
          link(m, right, bottom)
        }
      }
    }
  }
  return levels.map((level, li) => tracePieces(links[li], field, NX, X0, Y0, level))
}

/** 이어 둔 선분을 선으로 따라가 다듬고 PIECE 꼭짓점씩 끊는다 */
function tracePieces(links: Map<number, number[]>, field: Float32Array, NX: number, X0: number, Y0: number, level: number): string[] {
  const at = (e: number): Point => {
    const n = e >> 1
    const i = n % NX
    const j = (n - i) / NX
    const m = e & 1 ? n + NX : n + 1
    const t = (level - field[n]) / (field[m] - field[n])
    return e & 1 ? [X0 + i * CELL, Y0 + (j + t) * CELL] : [X0 + (i + t) * CELL, Y0 + j * CELL]
  }

  const used = new Set<number>()
  const walk = (start: number) => {
    const chain = [start]
    used.add(start)
    let prev = -1
    let cur = start
    for (;;) {
      const next = links.get(cur)!.find((e) => e !== prev && !used.has(e))
      if (next === undefined) break
      used.add(next)
      chain.push(next)
      prev = cur
      cur = next
    }
    return chain
  }
  const lines: Point[][] = []
  // 격자 끝에서 끊긴 선 먼저, 그다음 닫힌 고리
  for (const [e, ns] of links) if (ns.length === 1 && !used.has(e)) lines.push(chaikinOpen(simplifyRing(walk(e).map(at), 0.2)))
  for (const e of links.keys()) {
    if (used.has(e)) continue
    const pts = walk(e).map(at)
    if (pts.length < 4) continue
    const smooth = chaikin(simplifyRing(pts, 0.2), 1)
    lines.push([...smooth, smooth[0]])
  }
  return lines.flatMap((pts) => {
    const out: string[] = []
    for (let s = 0; s < pts.length - 1; s += PIECE) out.push(toPath(pts.slice(s, s + PIECE + 1)))
    return out
  })
}
