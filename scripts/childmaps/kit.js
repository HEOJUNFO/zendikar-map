// 자식 지도 그리기 도구 — 다섯 지역 지도가 같은 손으로 그려지도록 집·탑·성벽·벼랑·물·헤드론·동굴 같은
// 지형지물을 같은 모양으로 만든다. art/<id>.js 보다 먼저 실행된다 (to_ts.mjs·context.mjs 의 vm, 개발 미리보기 ?childsrc=1).
//
// 함수마다 물건 하나의 parts 배열을 [채움 → 해칭 → 잉크] 차례로 돌려준다. 여러 물건은 뒤(위쪽, y 가 작은 것)부터
// 앞(아래쪽)으로 이어 붙여야 앞의 채움이 뒤를 가린다 — KIT.stack([{ y, parts }, …]) 가 그 차례로 펼친다.
// 좌표는 자식 지도 단위. 무작위는 KIT.rng(시드) 로만 (같은 그림이 늘 같게 나온다).
;(() => {
  const r1 = (v) => Math.round(v * 10) / 10
  const pt = ([x, y]) => `${r1(x)} ${r1(y)}`
  /** 꺾은선 */
  const line = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${pt(p)}`).join('')
  /** 닫힌 다각형 */
  const poly = (pts) => line(pts) + 'Z'
  const part = (cls, d) => ({ cls, d })

  /** 시드(문자열·수)로 만드는 0~1 난수 */
  function rng(seed) {
    let h = typeof seed === 'number' ? seed | 0 : 2166136261
    if (typeof seed !== 'number') for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
    return () => {
      h = (h + 0x6d2b79f5) | 0
      let t = Math.imul(h ^ (h >>> 15), 1 | h)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  /** 점들을 지나는 매끈한 곡선 (Catmull-Rom → 3차 베지에) */
  function smooth(pts, closed = false) {
    const n = pts.length
    if (n < 3) return closed ? poly(pts) : line(pts)
    const at = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))])
    let d = `M${pt(pts[0])}`
    const last = closed ? n : n - 1
    for (let i = 0; i < last; i++) {
      const p0 = at(i - 1)
      const p1 = at(i)
      const p2 = at(i + 1)
      const p3 = at(i + 2)
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
      d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`
    }
    return closed ? d + 'Z' : d
  }

  /** 꺾은선을 따라 간격 step 마다 [자리, 진행 방향 단위벡터] */
  function along(pts, step) {
    const out = []
    let carry = 0
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i]
      const [x1, y1] = pts[i + 1]
      const len = Math.hypot(x1 - x0, y1 - y0)
      if (!len) continue
      const ux = (x1 - x0) / len
      const uy = (y1 - y0) / len
      for (let s = carry; s <= len; s += step) out.push([[x0 + ux * s, y0 + uy * s], [ux, uy]])
      carry = (((carry - len) % step) + step) % step
    }
    return out
  }

  /** 꺾은선의 각 점에서 진행 방향의 왼쪽(+)·오른쪽(-) 수직으로 dist 만큼 옮긴 선 — 강·성벽 띠에 */
  function offset(pts, dist) {
    return pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)]
      const b = pts[Math.min(pts.length - 1, i + 1)]
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
      const d = typeof dist === 'function' ? dist(i / (pts.length - 1)) : dist
      return [p[0] + ((b[1] - a[1]) / len) * d, p[1] - ((b[0] - a[0]) / len) * d]
    })
  }

  /** 여러 물건을 뒤(위쪽)에서 앞(아래쪽) 차례로 펼친다 — [{ y, parts }] */
  const stack = (items) => [...items].sort((a, b) => a.y - b.y).flatMap((i) => i.parts)

  /**
   * 집 — 옛 지도의 도시 그림처럼 옆에서 본 모습. (x, y) 는 집 밑 가운데.
   * o.roof: 'gable'(박공) | 'hip'(모임) | 'flat' | 'dome',  o.door: 문 (기본 true),  o.roofH: 지붕 높이
   */
  function house(x, y, w, h, o = {}) {
    const roof = o.roof ?? 'gable'
    const rh = o.roofH ?? (roof === 'flat' ? 0 : w * 0.5)
    const ov = w * 0.08
    const L = x - w / 2
    const R = x + w / 2
    const top = y - h
    const body = poly([[L, y], [L, top], [R, top], [R, y]])
    let roofD = ''
    let roofShade = ''
    let hatch = ''
    if (roof === 'gable') {
      roofD = poly([[L - ov, top], [x, top - rh], [R + ov, top]])
      roofShade = poly([[x, top - rh], [R + ov, top], [x, top]])
      for (let i = 1; i <= 3; i++) {
        const t = i / 4
        hatch += line([[x + (R + ov - x) * t, top - rh * (1 - t)], [x + (R + ov - x) * t - rh * 0.18, top]])
      }
    } else if (roof === 'hip') {
      const tw = w * 0.22
      roofD = poly([[L - ov, top], [x - tw, top - rh], [x + tw, top - rh], [R + ov, top]])
      roofShade = poly([[x + tw, top - rh], [R + ov, top], [x + tw, top]])
      hatch += line([[x + tw + (R - x) * 0.35, top - rh * 0.55], [x + tw + (R - x) * 0.25, top]])
    } else if (roof === 'dome') {
      roofD = `M${pt([L, top])}Q${pt([L, top - rh * 1.3])} ${pt([x, top - rh * 1.3])}Q${pt([R, top - rh * 1.3])} ${pt([R, top])}Z`
      roofShade = `M${pt([x, top - rh * 1.3])}Q${pt([R, top - rh * 1.3])} ${pt([R, top])}L${pt([x, top])}Z`
    }
    // 그늘진 오른쪽 벽
    const side = poly([[x + w * 0.22, y], [x + w * 0.22, top], [R, top], [R, y]])
    for (let i = 1; i <= 2; i++) {
      const sx = x + w * 0.22 + ((R - x - w * 0.22) * i) / 3
      hatch += line([[sx, top + h * 0.12], [sx, y - h * 0.05]])
    }
    const parts = [part('fill', body + roofD), part('shade', side + roofShade), part('hatch', hatch)]
    if (o.door !== false && w >= 10) {
      const dw = Math.min(w * 0.22, h * 0.32)
      const dh = Math.min(h * 0.5, dw * 1.7)
      parts.push(part('dark', `M${pt([x - w * 0.12 - dw / 2, y])}V${r1(y - dh + dw / 2)}A${r1(dw / 2)} ${r1(dw / 2)} 0 0 1 ${pt([x - w * 0.12 + dw / 2, y - dh + dw / 2])}V${r1(y)}Z`))
    }
    parts.push(part('ink', body + roofD))
    return parts
  }

  /**
   * 탑 — 위로 갈수록 살짝 좁아진다. o.top: 'crenel'(총안 흉벽) | 'cone'(뾰족 지붕) | 'spire'(가는 첨탑) | 'flat'
   */
  function tower(x, y, w, h, o = {}) {
    const topK = o.top ?? 'crenel'
    const tw = w * (o.taper ?? 0.86)
    const L = x - w / 2
    const R = x + w / 2
    const tl = x - tw / 2
    const tr = x + tw / 2
    const top = y - h
    let body = poly([[L, y], [tl, top], [tr, top], [R, y]])
    let cap = ''
    let capShade = ''
    if (topK === 'crenel') {
      const n = Math.max(3, Math.round(tw / (w * 0.28)))
      const mw = tw / (n * 2 - 1)
      const mh = mw * 1.1
      const pts = [[tl - w * 0.06, top], [tl - w * 0.06, top - mh]]
      for (let i = 0; i < n; i++) {
        const a = tl - w * 0.06 + ((tw + w * 0.12) * (i * 2)) / (n * 2 - 1)
        const b = tl - w * 0.06 + ((tw + w * 0.12) * (i * 2 + 1)) / (n * 2 - 1)
        pts.push([a, top - mh], [b, top - mh])
        if (i < n - 1) pts.push([b, top - mh * 0.35], [tl - w * 0.06 + ((tw + w * 0.12) * (i * 2 + 2)) / (n * 2 - 1), top - mh * 0.35])
      }
      pts.push([tr + w * 0.06, top - mh], [tr + w * 0.06, top])
      cap = poly(pts)
    } else if (topK === 'cone' || topK === 'spire') {
      const ch = o.capH ?? (topK === 'spire' ? w * 1.9 : w * 0.95)
      cap = poly([[tl - w * 0.1, top], [x, top - ch], [tr + w * 0.1, top]])
      capShade = poly([[x, top - ch], [tr + w * 0.1, top], [x, top]])
    }
    const shade = poly([[x + w * 0.18, y], [x + tw * 0.18, top], [tr, top], [R, y]])
    let hatch = ''
    for (let i = 1; i <= 3; i++) {
      const t = i / 4
      hatch += line([[x + w * 0.18 + (R - x - w * 0.18) * t, y - h * 0.06], [x + tw * 0.18 + (tr - x - tw * 0.18) * t, top + h * 0.08]])
    }
    const slit = o.windows === false ? '' : poly([[x - w * 0.04, top + h * 0.22], [x + w * 0.04, top + h * 0.22], [x + w * 0.04, top + h * 0.22 + w * 0.36], [x - w * 0.04, top + h * 0.22 + w * 0.36]])
    return [part('fill', body + cap), part('shade', shade + capShade), part('hatch', hatch), ...(slit ? [part('dark', slit)] : []), part('ink-bold', body + cap)]
  }

  /**
   * 성벽 — 꺾은선을 따라 높이 h 의 벽을 옆에서 본 띠로, 위에는 흉벽 이(merlon).
   * 앞(아래)으로 오는 벽이 뒤를 가리도록 마디마다 따로 그린다.
   */
  function wall(pts, h, o = {}) {
    const step = o.merlon ?? h * 0.55
    const segs = []
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      const face = poly([a, b, [b[0], b[1] - h], [a[0], a[1] - h]])
      let mer = ''
      const len = Math.hypot(b[0] - a[0], b[1] - a[1])
      const n = Math.max(1, Math.floor(len / (step * 2)))
      for (let k = 0; k < n; k++) {
        const t0 = (k * 2 + 0.5) / (n * 2)
        const t1 = (k * 2 + 1.5) / (n * 2)
        const p0 = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0 - h]
        const p1 = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1 - h]
        mer += poly([p0, p1, [p1[0], p1[1] - step * 0.7], [p0[0], p0[1] - step * 0.7]])
      }
      // 벽돌 줄눈 대신 아래쪽에 짧은 해칭 몇 줄
      let hatch = ''
      for (let k = 1; k < Math.max(2, Math.floor(len / (h * 1.2))); k++) {
        const t = k / Math.max(2, Math.floor(len / (h * 1.2)))
        const px = a[0] + (b[0] - a[0]) * t
        const py = a[1] + (b[1] - a[1]) * t
        hatch += line([[px, py - h * 0.15], [px, py - h * 0.55]])
      }
      // 벽 윗면(걷는 길)은 밝게, 이는 벽과 같은 돌
      const walk = poly([[a[0], a[1] - h], [b[0], b[1] - h], [b[0], b[1] - h - step * 0.18], [a[0], a[1] - h - step * 0.18]])
      segs.push({ y: Math.max(a[1], b[1]), parts: [part('stone', face + mer), part('fill', walk), part('hatch', hatch), part('ink', face + mer + walk)] })
    }
    return stack(segs)
  }

  /**
   * 벼랑 — 가장자리 선(굵은 잉크)과 그 아래로 떨어지는 바위 면(세로 빗금).
   * o.side: 1 이면 진행 방향의 오른쪽이 낮은 쪽, -1 이면 왼쪽.  o.depth: 바위 면 깊이,  o.mode: 'face'(아래로 내린 빗금) | 'hachure'(낮은 쪽 수직)
   */
  function cliff(pts, o = {}) {
    const rand = rng(o.seed ?? `${pts[0]}`)
    const depth = o.depth ?? 26
    const step = o.step ?? depth * 0.32
    const side = o.side ?? 1
    let ticks = ''
    let shadeTop = []
    let shadeBot = []
    for (const [[x, y], [ux, uy]] of along(pts, step)) {
      const len = depth * (0.45 + rand() * 0.55)
      let dx = 0
      let dy = len
      if (o.mode === 'hachure') {
        dx = -uy * side * len
        dy = ux * side * len
      }
      ticks += line([[x, y], [x + dx, y + dy]])
      shadeTop.push([x, y])
      shadeBot.push([x + dx * 0.9, y + dy * 0.9])
    }
    const face = shadeTop.length > 1 ? poly([...shadeTop, ...shadeBot.reverse()]) : ''
    return [part('shade', face), part('hatch', ticks), part('ink-bold', smooth(pts))]
  }

  /** 강 — 하류(끝)로 갈수록 넓어지는 물길. w0·w1: 처음·끝 너비 */
  function river(pts, w0, w1 = w0) {
    const left = offset(pts, (t) => (w0 + (w1 - w0) * t) / 2)
    const right = offset(pts, (t) => -(w0 + (w1 - w0) * t) / 2)
    const body = smooth(left) + 'L' + smooth([...right].reverse()).slice(1) + 'Z'
    return [part('sea', body), part('sea-ink', smooth(left) + smooth(right))]
  }

  /** 못·물웅덩이 — 닫힌 매끈한 테두리, 물 채움, 안쪽 잔물결 */
  function pool(pts, o = {}) {
    const d = smooth(pts, true)
    const xs = pts.map((p) => p[0])
    const ys = pts.map((p) => p[1])
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2
    const w = (Math.max(...xs) - Math.min(...xs)) * 0.18
    let rip = ''
    if (o.ripples !== false) {
      for (const [dx, dy] of [[-0.6, -0.3], [0.5, 0.2], [-0.1, 0.55]]) {
        const x = cx + dx * w * 2
        const y = cy + dy * w
        rip += `M${pt([x - w / 2, y])}Q${pt([x, y - w * 0.22])} ${pt([x + w / 2, y])}`
      }
    }
    return [part('sea', d), part('sea-ink', d + rip)]
  }

  /** 잔물결 몇 줄 — 넓은 물 위에 */
  function ripples(x, y, w, n = 3, seed = 'r') {
    const rand = rng(seed)
    let d = ''
    for (let i = 0; i < n; i++) {
      const px = x + (rand() - 0.5) * w * 2
      const py = y + (rand() - 0.5) * w
      const s = w * (0.25 + rand() * 0.2)
      d += `M${pt([px - s, py])}Q${pt([px - s / 2, py - s * 0.25])} ${pt([px, py])}Q${pt([px + s / 2, py + s * 0.25])} ${pt([px + s, py])}`
    }
    return [part('sea-ink', d)]
  }

  /**
   * 헤드론 — 세계 지도와 같은 길쭉한 팔면체(돌 채움, 잉크 테두리, 면 선, 룬). (x, y) 는 가운데, len 은 반 길이.
   * o.grounded: 땅에 쓰러져 반쯤 묻힌 것,  o.shadow: 떠 있는 것 밑의 그림자 (기본 true)
   */
  function hedron(x, y, len, rot = 0, o = {}) {
    const wid = len * 0.36
    const t = -len
    const b = len * 0.92
    const g = len * 0.08
    const c = Math.cos((rot * Math.PI) / 180)
    const s = Math.sin((rot * Math.PI) / 180)
    const T = ([px, py]) => [x + px * c - py * s, y + px * s + py * c]
    const body = poly([[0, t], [wid, g], [0, b], [-wid, g]].map(T))
    const facet = line([[0, t], [wid * 0.28, g], [0, b]].map(T)) + line([[-wid, g], [wid * 0.28, g], [wid, g]].map(T))
    const rune = line([[wid * 0.1, t * 0.45], [wid * 0.18, g * 0.4], [wid * 0.1, b * 0.42]].map(T))
    const parts = []
    if (!o.grounded && o.shadow !== false) {
      const sy = y + len * (o.lift ?? 1.9)
      parts.push(part('shade', `M${pt([x - len * 0.55, sy])}A${r1(len * 0.55)} ${r1(len * 0.16)} 0 1 0 ${pt([x + len * 0.55, sy])}A${r1(len * 0.55)} ${r1(len * 0.16)} 0 1 0 ${pt([x - len * 0.55, sy])}Z`))
    }
    parts.push(part(o.grounded ? 'shade' : 'stone', body), part('hatch', facet + rune), part('ink', body))
    return parts
  }

  /** 바위 무더기 — n 개의 둥근 돌 */
  function rocks(x, y, size, n = 3, seed = 'rocks') {
    const rand = rng(seed)
    const items = []
    for (let i = 0; i < n; i++) {
      const s = size * (0.5 + rand() * 0.5)
      const cx = x + (rand() - 0.5) * size * 1.7
      const cy = y + (rand() - 0.5) * size * 0.5
      // 둥근 윗면과 평평한 밑면 — 땅에 놓인 돌
      const pts = []
      for (let k = 0; k <= 8; k++) {
        const a = Math.PI + (k / 8) * Math.PI
        const rr = s * (0.86 + rand() * 0.14)
        pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * (0.7 + rand() * 0.15)])
      }
      const d = `M${pt(pts[0])}` + smooth(pts).slice(smooth(pts).indexOf('C')) + `L${pt([cx + s * 0.8, cy + s * 0.12])}L${pt([cx - s * 0.85, cy + s * 0.12])}Z`
      const hatch = line([[cx + s * 0.3, cy - s * 0.5], [cx + s * 0.18, cy + s * 0.05]]) + line([[cx + s * 0.58, cy - s * 0.3], [cx + s * 0.46, cy + s * 0.06]])
      const shadow = poly([[cx + s * 0.2, cy - s * 0.62], [cx + s * 0.9, cy - s * 0.1], [cx + s * 0.8, cy + s * 0.12], [cx + s * 0.25, cy + s * 0.12]])
      items.push({ y: cy, parts: [part('fill', d), part('shade', shadow), part('hatch', hatch), part('ink', d)] })
    }
    return stack(items)
  }

  /** 바위 첨탑 — 우뚝 선 돌기둥. (x, y) 는 밑 가운데 */
  function spire(x, y, w, h, seed = 'spire') {
    const rand = rng(seed)
    const L = []
    const R = []
    const n = 5
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const half = (w / 2) * (1 - t * 0.78)
      const jitter = (rand() - 0.5) * w * 0.12
      L.push([x - half + jitter, y - h * t])
      R.push([x + half + jitter, y - h * t])
    }
    const tip = [x + (rand() - 0.5) * w * 0.15, y - h * 1.06]
    const outline = poly([...L, tip, ...R.reverse()])
    let hatch = ''
    for (let i = 1; i <= 4; i++) {
      const t = i / 5
      const half = (w / 2) * (1 - t * 0.78)
      hatch += line([[x + half * 0.15, y - h * t + h * 0.04], [x + half * 0.85, y - h * t + h * 0.12]])
    }
    const shade = poly([[x + w * 0.08, y], [tip[0], tip[1]], ...R.slice(0, -1)])
    return [part('fill', outline), part('shade', shade), part('hatch', hatch), part('ink', outline)]
  }

  /** 동굴 입구 — 바위 테두리를 두른 어두운 아치. (x, y) 는 입구 밑 가운데 */
  function cave(x, y, w, h) {
    const mouth = `M${pt([x - w / 2, y])}C${pt([x - w / 2, y - h * 1.25])} ${pt([x + w / 2, y - h * 1.25])} ${pt([x + w / 2, y])}Z`
    const rimW = w * 0.32
    const rim = `M${pt([x - w / 2 - rimW, y])}C${pt([x - w / 2 - rimW, y - h * 1.55])} ${pt([x + w / 2 + rimW, y - h * 1.55])} ${pt([x + w / 2 + rimW, y])}Z`
    let hatch = ''
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI + (i / 8) * Math.PI
      const ix = x + Math.cos(a) * (w / 2 + rimW * 0.15)
      const iy = y + Math.sin(a) * h * 0.95
      const ox = x + Math.cos(a) * (w / 2 + rimW * 0.8)
      const oy = y + Math.sin(a) * h * 1.18
      hatch += line([[ix, iy], [ox, oy]])
    }
    return [part('fill', rim), part('stone', rim), part('hatch', hatch), part('dark', mouth), part('ink', rim + mouth)]
  }

  /** 무너진 벽 — 들쭉날쭉한 윗선, 떨어진 돌 몇 개. (x, y) 는 밑 가운데 */
  function ruin(x, y, w, h, seed = 'ruin') {
    const rand = rng(seed)
    const n = 6
    const top = []
    for (let i = 0; i <= n; i++) top.push([x - w / 2 + (w * i) / n, y - h * (0.35 + rand() * 0.65)])
    const outline = poly([[x - w / 2, y], ...top, [x + w / 2, y]])
    let hatch = ''
    for (let i = 1; i < n; i += 2) hatch += line([[top[i][0], top[i][1] + h * 0.12], [top[i][0], y - h * 0.08]])
    // 창 구멍 하나
    const win = poly([[x - w * 0.08, y - h * 0.3], [x + w * 0.04, y - h * 0.3], [x + w * 0.04, y - h * 0.12], [x - w * 0.08, y - h * 0.12]])
    const parts = [part('stone', outline), part('hatch', hatch), part('dark', win), part('ink', outline)]
    return [...parts, ...rocks(x + w * 0.62, y + h * 0.04, h * 0.18, 2, `${seed}-r`)]
  }

  /** 점선 길 — 꺾은선을 따라 dash·gap 간격의 잉크 토막 */
  function dashed(pts, dash = 10, gap = 7) {
    let d = ''
    let on = true
    let left = dash
    for (let i = 0; i < pts.length - 1; i++) {
      let [x0, y0] = pts[i]
      const [x1, y1] = pts[i + 1]
      let len = Math.hypot(x1 - x0, y1 - y0)
      const ux = (x1 - x0) / (len || 1)
      const uy = (y1 - y0) / (len || 1)
      while (len > 0) {
        const s = Math.min(left, len)
        if (on) d += line([[x0, y0], [x0 + ux * s, y0 + uy * s]])
        x0 += ux * s
        y0 += uy * s
        len -= s
        left -= s
        if (left <= 0) {
          on = !on
          left = on ? dash : gap
        }
      }
    }
    return [part('ink', d)]
  }

  /** 큰 나무 한 그루 — 세계 지도 나무 기호의 큰 꼴 (둥근 잎 덩어리 셋, 줄기). (x, y) 는 밑동 */
  function tree(x, y, h, seed = 'tree') {
    const rand = rng(seed)
    const cw = h * 0.42
    const trunk = line([[x, y], [x, y - h * 0.4]]) + line([[x, y - h * 0.3], [x + h * 0.08, y - h * 0.42]])
    const parts = [part('ink', trunk)]
    // 뒤 잎 덩어리(위)부터 앞(아래 좌우)으로 — 앞 덩어리의 채움이 뒤 덩어리의 안쪽 선을 가린다
    const lobes = [[0, -h * 0.74, cw * 0.6], [-cw * 0.44, -h * 0.55, cw * 0.48], [cw * 0.46, -h * 0.56, cw * 0.5]]
    for (const [dx, dy, rr] of lobes) {
      const r = rr * (0.92 + rand() * 0.16)
      const d = `M${pt([x + dx - r, y + dy])}A${r1(r)} ${r1(r * 0.9)} 0 1 0 ${pt([x + dx + r, y + dy])}A${r1(r)} ${r1(r * 0.9)} 0 1 0 ${pt([x + dx - r, y + dy])}Z`
      const hatch = line([[x + dx + r * 0.35, y + dy - r * 0.1], [x + dx + r * 0.2, y + dy + r * 0.45]]) + line([[x + dx + r * 0.62, y + dy - r * 0.05], [x + dx + r * 0.48, y + dy + r * 0.4]])
      parts.push(part('fill', d), part('forest', d), part('hatch', hatch), part('ink', d))
    }
    return parts
  }

  globalThis.KIT = { rng, line, poly, smooth, along, offset, stack, house, tower, wall, cliff, river, pool, ripples, hedron, rocks, spire, cave, ruin, dashed, tree }
})()
