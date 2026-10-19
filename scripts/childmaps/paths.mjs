// 지역 상세 원본의 path(d) 를 읽는 작은 도구 — 더 깊은 지역 상세의 검사(to_ts.mjs)와 맥락(context.mjs)이 부모 그림의 부분을 옮기고 범위를 잴 때.
// SVG path 의 모든 명령(M L H V C S Q T A Z, 대·소문자)을 읽는다. 호(A)의 깃발은 붙여 쓴 것(011)도 읽는다.

const CMD = /[MmLlHhVvCcSsQqTtAaZz]/
const ARGS = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 }

/**
 * d → [{ c: 명령 글자, a: 숫자들 }] (명령 하나에 인자 한 벌씩 — 이어 쓴 인자는 같은 명령으로 나눈다. M 뒤에 이어진 쌍은 L).
 * 읽지 못하는 자리에서 멈추고 그 앞까지 돌려준다 — 브라우저도 path 를 거기까지만 그린다
 */
export function parsePath(d) {
  const out = []
  try {
    readPath(d, out)
  } catch {
    // 앞까지
  }
  return out
}
function readPath(d, out) {
  let i = 0
  const n = d.length
  const skip = () => {
    while (i < n && /[\s,]/.test(d[i])) i++
  }
  const num = () => {
    skip()
    const m = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(d.slice(i, i + 40))
    if (!m) throw new Error(`path 를 읽지 못했다: …${d.slice(Math.max(0, i - 10), i + 20)}…`)
    i += m[0].length
    return Number(m[0])
  }
  const flag = () => {
    skip()
    const ch = d[i++]
    if (ch !== '0' && ch !== '1') throw new Error(`호의 깃발이 0·1 이 아니다: …${d.slice(Math.max(0, i - 10), i + 20)}…`)
    return Number(ch)
  }
  let cmd = null
  for (;;) {
    skip()
    if (i >= n) break
    if (CMD.test(d[i])) cmd = d[i++]
    else if (!cmd) throw new Error(`path 가 명령으로 시작하지 않는다: ${d.slice(0, 20)}`)
    const lower = cmd.toLowerCase()
    const k = ARGS[lower]
    if (k === 0) {
      out.push({ c: cmd, a: [] })
      cmd = null
      continue
    }
    const a = lower === 'a' ? [num(), num(), num(), flag(), flag(), num(), num()] : Array.from({ length: k }, num)
    out.push({ c: cmd, a })
    // M 뒤에 이어 쓴 쌍은 L 이다
    if (cmd === 'M') cmd = 'L'
    else if (cmd === 'm') cmd = 'l'
  }
}

const r1 = (v) => String(Math.round(v * 10) / 10)

/**
 * 고르게 늘리고 옮긴 path — T: 절대 좌표 [x, y] → [x', y'], k: 늘린 배율 (T 가 x' = ox + k·x 꼴이어야 한다).
 * 상대 좌표·호의 반지름은 k 배, 호의 기울기·깃발은 그대로
 */
export function mapPath(d, T, k) {
  const parts = []
  for (const { c, a } of parsePath(d)) {
    const abs = c !== c.toLowerCase() || c === 'Z'
    const lower = c.toLowerCase()
    let b
    if (lower === 'z') b = []
    else if (!abs) b = lower === 'a' ? [a[0] * k, a[1] * k, a[2], a[3], a[4], a[5] * k, a[6] * k] : a.map((v) => v * k)
    else if (lower === 'h') b = [T([a[0], 0])[0]]
    else if (lower === 'v') b = [T([0, a[0]])[1]]
    else if (lower === 'a') b = [a[0] * k, a[1] * k, a[2], a[3], a[4], ...T([a[5], a[6]])]
    else {
      b = []
      for (let j = 0; j < a.length; j += 2) b.push(...T([a[j], a[j + 1]]))
    }
    parts.push(c + b.map((v, j) => (lower === 'a' && (j === 3 || j === 4) ? String(v) : r1(v))).join(' '))
  }
  return parts.join('')
}

/** path 가 닿는 상자 (끝점·조절점, 호는 반지름만큼 넉넉히) — 겹침을 넉넉히 볼 때 */
export function pathBox(d) {
  let x = 0
  let y = 0
  let sx = 0
  let sy = 0
  const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
  const add = (px, py, r = 0) => {
    b.x0 = Math.min(b.x0, px - r)
    b.y0 = Math.min(b.y0, py - r)
    b.x1 = Math.max(b.x1, px + r)
    b.y1 = Math.max(b.y1, py + r)
  }
  for (const { c, a } of parsePath(d)) {
    const rel = c === c.toLowerCase()
    const lower = c.toLowerCase()
    const ox = rel ? x : 0
    const oy = rel ? y : 0
    if (lower === 'z') {
      x = sx
      y = sy
      continue
    }
    if (lower === 'h') {
      x = ox + a[0]
      add(x, y)
      continue
    }
    if (lower === 'v') {
      y = oy + a[0]
      add(x, y)
      continue
    }
    if (lower === 'a') {
      const r = Math.max(Math.abs(a[0]), Math.abs(a[1]))
      add(x, y, r)
      x = ox + a[5]
      y = oy + a[6]
      add(x, y, r)
      continue
    }
    for (let j = 0; j < a.length; j += 2) add(ox + a[j], oy + a[j + 1])
    x = ox + a[a.length - 2]
    y = oy + a[a.length - 1]
    if (lower === 'm') {
      sx = x
      sy = y
    }
  }
  return b
}

/** 다각형을 사각형으로 자른다 (Sutherland–Hodgman) — 빈 배열이면 닿지 않는다 */
export function clipRing(ring, r) {
  const edges = [
    [(p) => p[0] >= r.x0, (p, q) => [r.x0, p[1] + ((q[1] - p[1]) * (r.x0 - p[0])) / (q[0] - p[0])]],
    [(p) => p[0] <= r.x1, (p, q) => [r.x1, p[1] + ((q[1] - p[1]) * (r.x1 - p[0])) / (q[0] - p[0])]],
    [(p) => p[1] >= r.y0, (p, q) => [p[0] + ((q[0] - p[0]) * (r.y0 - p[1])) / (q[1] - p[1]), r.y0]],
    [(p) => p[1] <= r.y1, (p, q) => [p[0] + ((q[0] - p[0]) * (r.y1 - p[1])) / (q[1] - p[1]), r.y1]],
  ]
  let out = ring
  for (const [ins, cut] of edges) {
    const src = out
    out = []
    for (let i = 0; i < src.length; i++) {
      const p = src[i]
      const q = src[(i + 1) % src.length]
      if (ins(p)) {
        out.push(p)
        if (!ins(q)) out.push(cut(p, q))
      } else if (ins(q)) out.push(cut(p, q))
    }
    if (!out.length) return []
  }
  return out
}

/**
 * path 를 꺾은선들로 편다 — 하위 path 마다 { pts, closed }. 곡선(C S Q T)은 몇 점으로, 호(A)는 끝점까지 곧게 (검사의 어림)
 */
export function flattenPath(d) {
  const subs = []
  let cur = null
  let x = 0
  let y = 0
  let sx = 0
  let sy = 0
  let lc = null // 앞 곡선의 둘째 조절점 (S·T)
  const start = () => {
    cur = { pts: [[x, y]], closed: false }
    subs.push(cur)
  }
  const to = (px, py) => {
    if (!cur) start()
    cur.pts.push([px, py])
    x = px
    y = py
  }
  const curve = (p0, p1, p2, p3) => {
    for (let i = 1; i <= 8; i++) {
      const t = i / 8
      const u = 1 - t
      to(u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1])
    }
  }
  for (const { c, a } of parsePath(d)) {
    const rel = c === c.toLowerCase()
    const lower = c.toLowerCase()
    const ox = rel ? x : 0
    const oy = rel ? y : 0
    if (lower === 'z') {
      if (cur) {
        cur.closed = true
        to(sx, sy)
      }
      cur = null
      lc = null
      continue
    }
    if (lower === 'm') {
      x = ox + a[0]
      y = oy + a[1]
      sx = x
      sy = y
      start()
      lc = null
      continue
    }
    if (lower === 'l') to(ox + a[0], oy + a[1])
    else if (lower === 'h') to(ox + a[0], y)
    else if (lower === 'v') to(x, oy + a[0])
    else if (lower === 'a') to(ox + a[5], oy + a[6])
    else if (lower === 'c') {
      const p0 = [x, y]
      const p2 = [ox + a[2], oy + a[3]]
      curve(p0, [ox + a[0], oy + a[1]], p2, [ox + a[4], oy + a[5]])
      lc = ['c', p2]
      continue
    } else if (lower === 's') {
      const p0 = [x, y]
      const p1 = lc?.[0] === 'c' ? [2 * x - lc[1][0], 2 * y - lc[1][1]] : p0
      const p2 = [ox + a[0], oy + a[1]]
      curve(p0, p1, p2, [ox + a[2], oy + a[3]])
      lc = ['c', p2]
      continue
    } else if (lower === 'q' || lower === 't') {
      const p0 = [x, y]
      const q = lower === 'q' ? [ox + a[0], oy + a[1]] : lc?.[0] === 'q' ? [2 * x - lc[1][0], 2 * y - lc[1][1]] : p0
      const p3 = lower === 'q' ? [ox + a[2], oy + a[3]] : [ox + a[0], oy + a[1]]
      curve(p0, [p0[0] + (2 / 3) * (q[0] - p0[0]), p0[1] + (2 / 3) * (q[1] - p0[1])], [p3[0] + (2 / 3) * (q[0] - p3[0]), p3[1] + (2 / 3) * (q[1] - p3[1])], p3)
      lc = ['q', q]
      continue
    }
    lc = null
  }
  return subs.filter((s) => s.pts.length > 1)
}

/**
 * 상자 안에서 path 의 잉크가 닿는 칸 (cell 단위 격자의 'i,j') — 선은 따라가며, 닫힌 하위 path(채움)는 그 안의 칸까지.
 * 같은 상자·격자로 견주면 두 모습의 손그림이 대상 자리를 얼마나 다르게 덮는지 어림할 수 있다 (to_ts.mjs 의 [16])
 */
export function inkCells(d, box, cell, fill = true) {
  const out = new Set()
  const nx = Math.ceil((box.x1 - box.x0) / cell)
  const ny = Math.ceil((box.y1 - box.y0) / cell)
  const mark = (px, py) => {
    const i = Math.floor((px - box.x0) / cell)
    const j = Math.floor((py - box.y0) / cell)
    if (i >= 0 && j >= 0 && i < nx && j < ny) out.add(`${i},${j}`)
  }
  for (const { pts, closed } of flattenPath(d)) {
    for (let k = 1; k < pts.length; k++) {
      const [ax, ay] = pts[k - 1]
      const [bx, by] = pts[k]
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (cell / 2)))
      for (let s = 0; s <= n; s++) mark(ax + ((bx - ax) * s) / n, ay + ((by - ay) * s) / n)
    }
    if (fill && closed && pts.length > 2) {
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) {
          const px = box.x0 + (i + 0.5) * cell
          const py = box.y0 + (j + 0.5) * cell
          let c = false
          for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
            const [xa, ya] = pts[a]
            const [xb, yb] = pts[b]
            if (ya > py !== yb > py && px < ((xb - xa) * (py - ya)) / (yb - ya) + xa) c = !c
          }
          if (c) out.add(`${i},${j}`)
        }
    }
  }
  return out
}
