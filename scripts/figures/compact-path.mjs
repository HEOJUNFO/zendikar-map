// 그림 경로(d)를 같은 점을 지나는 더 짧은 글로 — 페이즈 그림 묶음이 페이즈를 켜는 길목에서 내려받는 바이트를 줄인다.
// 마디마다 절대·상대 좌표(가로·세로 직선이면 H·V) 중 짧은 쪽을 쓰고, 같은 명령이 이어지면 글자를 빼고, 숫자의 앞 0 을 뺀다.
// 좌표는 0.01 단위 정수로 계산해 상대 좌표를 이어 써도 오차가 쌓이지 않는다 — 옮긴 뒤 모든 점이 원본과 같은지 compactPath 가 확인한다.

/** 명령마다 받는 숫자 수 */
const ARGS = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 }

function parse(d) {
  const toks = d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/gi) ?? []
  const segs = []
  let cmd = null
  for (let i = 0; i < toks.length; ) {
    if (/^[A-Za-z]$/.test(toks[i])) cmd = toks[i++]
    const n = cmd ? ARGS[cmd.toUpperCase()] : undefined
    if (n === undefined) throw new Error(`경로를 읽지 못했다: '${toks[i]}' — ${d.slice(0, 80)}`)
    const args = toks.slice(i, i + n)
    if (args.length < n || args.some((a) => /^[A-Za-z]$/.test(a))) throw new Error(`'${cmd}' 의 숫자가 모자란다 — ${d.slice(0, 80)}`)
    i += n
    segs.push([cmd, args.map(Number)])
    if (n === 0) continue
    // M 뒤에 이어지는 좌표는 L 로 읽힌다
    if (cmd === 'M') cmd = 'L'
    else if (cmd === 'm') cmd = 'l'
  }
  return segs
}

/** 마디마다 절대 좌표 (0.01 단위 정수). 상대 좌표는 0.01 로 반올림한 뒤 더한다 — 브라우저가 반올림한 글을 읽는 것과 같다 */
function absolute(d) {
  const out = []
  let cx = 0
  let cy = 0
  let sx = 0
  let sy = 0
  for (const [c, a] of parse(d)) {
    const C = c.toUpperCase()
    const rel = c !== C
    const h = a.map((v) => Math.round(v * 100))
    if (C === 'Z') {
      out.push(['Z', []])
      cx = sx
      cy = sy
      continue
    }
    if (C === 'H' || C === 'V') {
      const x = C === 'H' ? (rel ? cx + h[0] : h[0]) : cx
      const y = C === 'V' ? (rel ? cy + h[0] : h[0]) : cy
      out.push(['L', [x, y]])
      cx = x
      cy = y
      continue
    }
    if (C === 'A') {
      const x = rel ? cx + h[5] : h[5]
      const y = rel ? cy + h[6] : h[6]
      out.push(['A', [h[0], h[1], h[2], a[3] ? 1 : 0, a[4] ? 1 : 0, x, y]])
      cx = x
      cy = y
      continue
    }
    const pts = h.map((v, k) => (rel ? v + (k % 2 ? cy : cx) : v))
    out.push([C, pts])
    cx = pts.at(-2)
    cy = pts.at(-1)
    if (C === 'M') {
      sx = cx
      sy = cy
    }
  }
  return out
}

/** 0.01 단위 정수 → 가장 짧은 숫자 글 (0.5 → .5, -0.5 → -.5, 3.10 → 3.1) */
function fmt(h) {
  const a = Math.abs(h)
  const ip = Math.floor(a / 100)
  const fp = a % 100
  const s = fp ? `${ip || ''}.${String(fp).padStart(2, '0').replace(/0$/, '')}` : String(ip)
  return (h < 0 ? '-' : '') + s
}

/** 숫자를 잇는다 — 다음 숫자가 '-' 로 시작하거나, 앞 숫자에 '.' 이 있고 다음이 '.' 으로 시작하면 빈칸이 필요 없다 */
function joinNums(nums) {
  let out = ''
  let prev = null
  for (const n of nums) {
    if (prev !== null && !n.startsWith('-') && !(n.startsWith('.') && prev.includes('.'))) out += ' '
    out += n
    prev = n
  }
  return out
}

export function compactPath(d) {
  const segs = absolute(d)
  let s = ''
  let last = null
  let cx = 0
  let cy = 0
  let sx = 0
  let sy = 0
  for (const [C, p] of segs) {
    if (C === 'Z') {
      s += 'z'
      last = 'z'
      cx = sx
      cy = sy
      continue
    }
    // 호(A)는 절대 좌표로만 — 반원에 가까운 호는 끝점이 조금만 달라도 중심이 크게 움직여, 브라우저가 상대 좌표를 더하며 생기는
    // 아주 작은 오차가 깊이 확대하면 1px 남짓 어긋나 보인다
    const cands =
      C === 'A'
        ? [['A', [...p.slice(0, 3).map(fmt), String(p[3]), String(p[4]), fmt(p[5]), fmt(p[6])]]]
        : [
            [C, p.map(fmt)],
            [C.toLowerCase(), p.map((v, k) => fmt(v - (k % 2 ? cy : cx)))],
          ]
    if (C === 'L' && p[1] === cy) cands.push(['H', [fmt(p[0])]], ['h', [fmt(p[0] - cx)]])
    if (C === 'L' && p[0] === cx) cands.push(['V', [fmt(p[1])]], ['v', [fmt(p[1] - cy)]])
    let best = null
    for (const [c, nums] of cands) {
      const body = joinNums(nums)
      // 같은 명령이 이어지면 글자를 뺀다 — M 은 빼면 L 로 읽히니 언제나 쓴다
      const implicit = c === last && c.toUpperCase() !== 'M'
      const txt = implicit ? (body.startsWith('-') ? body : ` ${body}`) : c + body
      if (!best || txt.length < best[1].length) best = [c, txt]
    }
    s += best[1]
    last = best[0]
    cx = p.at(-2)
    cy = p.at(-1)
    if (C === 'M') {
      sx = cx
      sy = cy
    }
  }
  // 옮긴 글이 원본과 같은 점을 지나는지 — 다르면 멈춘다
  if (JSON.stringify(absolute(s)) !== JSON.stringify(segs)) throw new Error(`경로를 줄이다 점이 달라졌다 — ${d.slice(0, 80)}`)
  return s
}
