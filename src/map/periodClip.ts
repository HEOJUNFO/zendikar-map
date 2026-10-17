// 다각형 자르기 — 고리 하나(subject)에서 다른 고리(clip) 안에 드는 부분만 남긴다 (교집합, Greiner–Hormann).
// 페이즈 바탕의 대륙 범위({continent} — continents.ts 의 area 를 그 대륙의 땅으로 자른 모양)를 앱(src/map/periodTerrain.ts)과
// 지역 상세 작가 도구(scripts/childmaps/periods.mjs)가 같은 셈으로 내도록 따로 둔 순수 함수다 — 늦게 받는 페이즈 조각에만 실린다.
// 두 고리 모두 스스로 엇갈리지 않는 단순 다각형이어야 한다. 꼭짓점이 상대의 변 위에 바로 놓이는 겹침(퇴화)은 자르는 고리를
// 아주 조금(지도 단위 1e-6 남짓) 비켜 다시 셈해 피한다 — 그리는 쪽에서는 보이지 않는 차이다
import { pointInRing, type Point, type Ring } from './geometry.ts'

interface Node {
  x: number
  y: number
  next: Node
  prev: Node
  /** 두 고리의 교점인가 */
  inter: boolean
  /** 교점 — 이 고리를 따라가면 상대 고리 안으로 들어가는가 */
  entry: boolean
  /** 교점 — 상대 고리 목록의 같은 교점 */
  neighbor: Node | null
  /** 교점 — 놓인 변 위의 자리 0..1 (변 안에서 차례를 정한다) */
  alpha: number
  visited: boolean
}

/** 이어진 같은 점과 닫는 점(끝 = 처음)을 뺀다 */
function clean(ring: Ring): Point[] {
  const out: Point[] = []
  for (const p of ring) {
    const q = out[out.length - 1]
    if (!q || q[0] !== p[0] || q[1] !== p[1]) out.push(p)
  }
  while (out.length > 1 && out[0][0] === out[out.length - 1][0] && out[0][1] === out[out.length - 1][1]) out.pop()
  return out
}

/** 꼭짓점 목록을 둥근 이중 연결 목록으로 */
function chain(pts: readonly Point[]): Node[] {
  const nodes = pts.map(([x, y]) => ({ x, y, inter: false, entry: false, neighbor: null, alpha: 0, visited: false }) as unknown as Node)
  nodes.forEach((n, i) => {
    n.next = nodes[(i + 1) % nodes.length]
    n.prev = nodes[(i - 1 + nodes.length) % nodes.length]
  })
  return nodes
}

const EPS = 1e-9
class Degenerate extends Error {}

/** 두 변(a→b, c→d)의 교점 — 변 끝에 걸치거나 겹쳐 놓이면 Degenerate 를 던진다 */
function crossing(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): { alpha: number; beta: number } | null {
  const rx = bx - ax
  const ry = by - ay
  const sx = dx - cx
  const sy = dy - cy
  const den = rx * sy - ry * sx
  const qx = cx - ax
  const qy = cy - ay
  const scale = Math.hypot(rx, ry) * Math.hypot(sx, sy)
  if (Math.abs(den) <= EPS * scale) {
    // 나란한 변 — 한 줄 위에서 겹치면 퇴화
    if (Math.abs(qx * ry - qy * rx) > EPS * scale) return null
    const len = rx * rx + ry * ry
    const t0 = (qx * rx + qy * ry) / len
    const t1 = ((dx - ax) * rx + (dy - ay) * ry) / len
    if (Math.max(t0, t1) < -EPS || Math.min(t0, t1) > 1 + EPS) return null
    throw new Degenerate()
  }
  const alpha = (qx * sy - qy * sx) / den
  const beta = (qx * ry - qy * rx) / den
  if (alpha < -EPS || alpha > 1 + EPS || beta < -EPS || beta > 1 + EPS) return null
  if (alpha <= EPS || alpha >= 1 - EPS || beta <= EPS || beta >= 1 - EPS) throw new Degenerate()
  return { alpha, beta }
}

/** 한 번 셈 — 퇴화면 Degenerate */
function clipOnce(subject: readonly Point[], clip: readonly Point[]): Point[][] {
  const S = chain(subject)
  const C = chain(clip)
  // 변마다 교점 (변의 첫 꼭짓점 뒤에 alpha 차례로 끼운다)
  const onS: Node[][] = S.map(() => [])
  const onC: Node[][] = C.map(() => [])
  // 자르는 고리의 변 상자 — 땅 고리(꼭짓점 수천)의 변마다 몇 안 되는 변만 본다
  const cb = C.map((c) => {
    const d = c.next
    return [Math.min(c.x, d.x), Math.min(c.y, d.y), Math.max(c.x, d.x), Math.max(c.y, d.y)]
  })
  let any = false
  for (let i = 0; i < S.length; i++) {
    const a = S[i]
    const b = a.next
    const x0 = Math.min(a.x, b.x)
    const y0 = Math.min(a.y, b.y)
    const x1 = Math.max(a.x, b.x)
    const y1 = Math.max(a.y, b.y)
    for (let j = 0; j < C.length; j++) {
      const [u0, v0, u1, v1] = cb[j]
      if (u0 > x1 + EPS || u1 < x0 - EPS || v0 > y1 + EPS || v1 < y0 - EPS) continue
      const c = C[j]
      const d = c.next
      const hit = crossing(a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y)
      if (!hit) continue
      any = true
      const x = a.x + hit.alpha * (b.x - a.x)
      const y = a.y + hit.alpha * (b.y - a.y)
      const ns = { x, y, inter: true, entry: false, neighbor: null, alpha: hit.alpha, visited: false } as unknown as Node
      const nc = { x, y, inter: true, entry: false, neighbor: ns, alpha: hit.beta, visited: false } as unknown as Node
      ns.neighbor = nc
      onS[i].push(ns)
      onC[j].push(nc)
    }
  }
  if (!any) {
    // 엇갈리지 않는다 — 한쪽이 다른 쪽 안에 들거나 떨어져 있다
    if (pointInRing(subject[0][0], subject[0][1], clip)) return [[...subject]]
    if (pointInRing(clip[0][0], clip[0][1], subject)) return [[...clip]]
    return []
  }
  const splice = (nodes: Node[], lists: Node[][]) => {
    nodes.forEach((n, i) => {
      const list = lists[i].sort((p, q) => p.alpha - q.alpha)
      let prev = n
      const after = n.next
      for (const m of list) {
        prev.next = m
        m.prev = prev
        prev = m
      }
      prev.next = after
      after.prev = prev
    })
  }
  splice(S, onS)
  splice(C, onC)
  // 들어가는 교점·나가는 교점 — 첫 꼭짓점(교점이 아니다)이 상대 안인지에서 시작해 교점마다 뒤집는다
  const mark = (start: Node, other: readonly Point[]) => {
    let inside = pointInRing(start.x, start.y, other)
    for (let n = start.next; n !== start; n = n.next) {
      if (!n.inter) continue
      n.entry = !inside
      inside = !inside
    }
  }
  mark(S[0], clip)
  mark(C[0], subject)
  // 안쪽 고리 따라 걷기 — 들어가는 교점에서는 앞으로, 나가는 교점에서는 뒤로, 교점마다 상대 고리로 갈아탄다
  const out: Point[][] = []
  for (const list of onS)
    for (const start of list) {
      if (start.visited) continue
      const ring: Point[] = [[start.x, start.y]]
      let cur = start
      do {
        cur.visited = true
        cur.neighbor!.visited = true
        const forward = cur.entry
        do {
          cur = forward ? cur.next : cur.prev
          ring.push([cur.x, cur.y])
        } while (!cur.inter)
        cur = cur.neighbor!
      } while (!cur.visited)
      ring.pop()
      if (ring.length >= 3) out.push(ring)
    }
  return out
}

/**
 * subject 고리에서 clip 고리 안에 드는 부분 — 고리 여럿(서로 떨어진 조각). 고리 방향은 따로 맞추지 않는다 (칠은 orient 로 맞춰 nonzero 로 겹친다).
 * 꼭짓점·변이 겹쳐 퇴화하면 clip 을 아주 조금씩 더 비켜 다시 셈한다
 */
export function clipRing(subject: Ring, clip: Ring): Point[][] {
  const s = clean(subject)
  const c = clean(clip)
  if (s.length < 3 || c.length < 3) return []
  for (let k = 0; k < 8; k++) {
    const d = k === 0 ? 0 : 1e-6 * 2 ** k
    const moved = d ? c.map(([x, y]) => [x + d, y + d * 0.618] as Point) : c
    try {
      return clipOnce(s, moved)
    } catch (e) {
      if (!(e instanceof Degenerate)) throw e
    }
  }
  throw new Error('periodClip: 두 고리가 겹쳐 놓여 자르지 못했다')
}
