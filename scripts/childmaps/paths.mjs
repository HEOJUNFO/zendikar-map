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
