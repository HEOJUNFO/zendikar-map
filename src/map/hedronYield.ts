// 헤드론이 이름을 비켜 준다 — 흩뿌린 지형 기호(glyphSpans.ts 의 cutGlyphs)처럼, 그 배율 단계(tier)에 자리를 받은 이름의 글자 상자
// (ZendikarMap 의 captionHoles — 그 tier 의 배율 걸음 상자를 모두 합친 것)에 걸리는 헤드론만 옮긴다. 이름 자리는 그대로이고 되먹이지 않는다.
// 헤드론 무리 안의 흩은 자리는 이 지도가 그린 것이라(docs/lore.md '헤드론' — 공식 자료는 무리의 자리까지만) 조금 옮겨도 된다:
// - 떠 있는 헤드론은 가까운 빈 자리로 미끄러진다 — 무리의 테두리(대륙 땅 안·해안에서 떨어진 몫)와 장소 마커·카드 표시를 지키고 다른 헤드론과
//   6 단위 이상 떨어져, 화면 40px 와 제 길이 반의 4 배 가운데 작은 것 안에서. 화면에서 120px 넘게 큰 것은 제 길이 반까지
//   (40px 로는 큰 몸통이 이름 둘레를 벗어나지 못했다, 2026-11-05 검토 1).
//   자리가 없으면 옅어져 사라진다 — 화면에서 120px 넘게 큰 것은 그대로 둔다(한 점 기호처럼).
// - 떠 있는 헤드론의 그림자(땅에 진 흐린 타원)도 이름에 걸리지 않게 본다.
// - 땅에 쓰러진 헤드론(Agadeem 의 헤드론 묘지)은 비키지 않는다 — 비키게 하면 개관 가까이(tier 2)에서 묘지 이름 둘 밑이 거의 비고 옮겨 간 것이
//   카비라로 가는 길 위에 얹혔다. 그 이름은 제 헤드론 묘지 위에 앉는 것이라 그대로 둔다 (사용자 결정 2026-11-06).
// - 하나뿐인 거대 헤드론(Sky Rock·Ikiral)은 공식 자리라 비키지 않는다 — 대신 이름이 그 몸통을 비킨다(singleHedronBoxes, 이름 배치의 무른 장애물).
// 사각형 상자로 헤드론을 잘라 내지 않는다 — 칠에 네모난 홈이 남는다 (2026-11-02, 칠은 자르지 않는다).
// 순수한 셈이라 Node 시험(scripts/qa/hedron-yield-test.mjs)이 그대로 읽는다.

/** 상자 (지도 단위) — glyphSpans.ts 의 HoleBox 와 같은 모양 */
export interface YieldBox {
  readonly x0: number
  readonly y0: number
  readonly x1: number
  readonly y1: number
}

/** 비울 상자를 찾는 쪽 — glyphSpans.ts 의 GlyphHoles.within 과 같다 */
export interface YieldHoles {
  within(x0: number, y0: number, x1: number, y1: number): readonly YieldBox[]
}

export interface YieldHedron {
  key: string
  /** 그림자(땅) 자리 */
  x: number
  y: number
  /** 떠 있는 높이 (땅에 쓰러진 것은 0) */
  lift: number
  grounded: boolean
  /** 하나뿐인 거대 헤드론 — 비키지 않는다 */
  single: boolean
  /** 몸통 네 귀퉁이 — (x, y) 에서, 기울인 뒤, 띄우기 전 (지도 단위) */
  corners: readonly (readonly [number, number])[]
}

/** 비킨 모습 — 옮김(지도 단위), 'hide' 옅어져 사라짐. 목록에 없으면 제자리 */
export type HedronMove = { readonly dx: number; readonly dy: number } | 'hide'

/** 떠다니는 폭 (map.css 의 hedron-drift — translateY 0 → -2.4) */
export const HEDRON_DRIFT = 2.4
/** 미끄러지는 거리의 끝 — 화면 px, 그리고 제 길이 반의 몇 배 */
export const SLIDE_MAX_PX = 40
export const SLIDE_MAX_LEN = 4
/** 미끄러질 자리를 찾는 고리 간격 (화면 px)과 방향 수 */
const RING_STEP_PX = 2
const DIRECTIONS = 16
/** 헤드론끼리 떨어질 거리 (지도 단위 — 이 거리 이상, layoutHedrons 의 자리와 같은 자). 미끄러져 간 몸통은 다른 헤드론의 몸통과도 겹치지 않는다 */
const SPACING = 6
/** 미끄러져 간 몸통이 다른 헤드론의 몸통과 떨어질 틈 (화면 px) — 닿을 듯 붙으면 두 헤드론이 한 덩이로 읽힌다 */
const GAP_PX = 6
/** 화면에서 이보다 크면 비킬 자리가 없어도 그대로 둔다 (px) */
export const KEEP_PX = 120
/**
 * 이름 상자와 떨어질 틈 (화면 px — 그 tier 의 px0 에서, 더 큰 배율에서는 그만큼 넓다). 이름 상자를 사방으로 이만큼 넓혀 본다 — 틈 없이 닿기만 하면 비켰다고
 * 보니 떠다니는 끝(가장 높이 떠오른 순간)에 몸통이 이름 밑변에 0–3px 까지 다가가 닿을 듯 보였다 (2026-11-06). 틈은 바람이다 — 틈을 두는 자리가
 * 없으면 예전처럼 닿기만 하는 자리로 가거나 제자리에 남고, 틈 때문에 헤드론을 지우지는 않는다 (틈을 지킬 때 지우면 tier 2 의 할리마르 유역에서 19개
 * 가운데 보이는 것이 14개에서 11개로 줄었다 — 2026-11-06 검토)
 */
export const NAME_GAP_PX = 2

/** 볼록 다각형과 축에 맞춘 상자가 겹치는가 (분리축) — 닿기만 하면 겹치지 않는다 (glyphSpans.ts 의 within 과 같은 셈) */
export function polyHitsBox(poly: readonly (readonly [number, number])[], b: YieldBox): boolean {
  let px0 = Infinity
  let py0 = Infinity
  let px1 = -Infinity
  let py1 = -Infinity
  for (const [x, y] of poly) {
    px0 = Math.min(px0, x)
    py0 = Math.min(py0, y)
    px1 = Math.max(px1, x)
    py1 = Math.max(py1, y)
  }
  if (px1 <= b.x0 || px0 >= b.x1 || py1 <= b.y0 || py0 >= b.y1) return false
  const rect = [
    [b.x0, b.y0],
    [b.x1, b.y0],
    [b.x1, b.y1],
    [b.x0, b.y1],
  ]
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i]
    const [x1, y1] = poly[(i + 1) % poly.length]
    const nx = y1 - y0
    const ny = x0 - x1
    let p0 = Infinity
    let p1 = -Infinity
    for (const [x, y] of poly) {
      const v = x * nx + y * ny
      p0 = Math.min(p0, v)
      p1 = Math.max(p1, v)
    }
    let r0 = Infinity
    let r1 = -Infinity
    for (const [x, y] of rect) {
      const v = x * nx + y * ny
      r0 = Math.min(r0, v)
      r1 = Math.max(r1, v)
    }
    if (p1 <= r0 || r1 <= p0) return false
  }
  return true
}

/**
 * 헤드론 몸통이 (dx, dy) 옮겨 그려질 때 차지하는 다각형 — 떠 있는 것은 띄운 자리에서 떠다니는 끝(HEDRON_DRIFT 위)까지 쓸고 지나간 자리
 * (볼록 사각형을 위로 옮겨 가며 지나간 자리는 두 끝 자리의 볼록 껍질이다)
 */
export function hedronShape(h: YieldHedron, dx = 0, dy = 0): (readonly [number, number])[][] {
  const base = h.corners.map(([x, y]) => [h.x + x + dx, h.y + y + dy - (h.grounded ? 0 : h.lift)] as const)
  if (h.grounded) return [base]
  return [hull([...base, ...base.map(([x, y]) => [x, y - HEDRON_DRIFT] as const)])]
}

/** 떠 있는 헤드론의 그림자 — ZendikarMap 의 ellipse(가운데 (2, 0), 반지름 5.5×1.8, 가운데부터 옅어지는 칠). 칠이 거의 보이지 않는 바깥 몫은 빼고 0.7 배 */
const SHADOW = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2
  return [2 + Math.cos(a) * 5.5 * 0.7, Math.sin(a) * 1.8 * 0.7] as const
})

/** 이름에 걸리는지 볼 모양 — 몸통(떠다니는 폭까지)과, 떠 있는 것은 그 그림자 */
export function hedronNameShape(h: YieldHedron, dx = 0, dy = 0): (readonly [number, number])[][] {
  const body = hedronShape(h, dx, dy)
  if (h.grounded) return body
  return [...body, SHADOW.map(([x, y]) => [h.x + x + dx, h.y + y + dy] as const)]
}

/**
 * 미끄러질 수 있는 거리 (지도 단위). px0: 그 tier 에서 이 화면이 닿는 가장 작은 배율 — 화면에서 가장 작게 보이는 배율이라, 화면 px 로 센 끝은
 * 그 tier 의 어느 배율에서도 넘지 않는다
 */
export function slideMax(h: YieldHedron, px0: number): number {
  const screen = SLIDE_MAX_PX / px0
  const len = halfLength(h)
  // 화면에서 큰 것은 제 길이 반까지 — 40px 는 큰 몸통이 이름 둘레를 벗어나기에 모자란다
  const reach = len * 2 * px0 > KEEP_PX ? Math.max(screen, len) : screen
  return Math.min(SLIDE_MAX_LEN * len, reach)
}

/** 볼록 껍질 (모노톤 체인) */
function hull(pts: (readonly [number, number])[]): (readonly [number, number])[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: readonly [number, number], a: readonly [number, number], b: readonly [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: (readonly [number, number])[] = []
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop()
    lower.push(q)
  }
  const upper: (readonly [number, number])[] = []
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop()
    upper.push(q)
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1))
}

/** 몸통의 세로 길이 반 (지도 단위) — 기울인 몸통이 차지한 높이의 반 */
export function halfLength(h: YieldHedron): number {
  let y0 = Infinity
  let y1 = -Infinity
  for (const [, y] of h.corners) {
    y0 = Math.min(y0, y)
    y1 = Math.max(y1, y)
  }
  return (y1 - y0) / 2
}

/** 볼록 다각형 둘이 겹치는가 (분리축 — 닿기만 하면 겹치지 않는다) */
function polysOverlap(a: readonly (readonly [number, number])[], b: readonly (readonly [number, number])[]): boolean {
  for (const poly of [a, b])
    for (let i = 0; i < poly.length; i++) {
      const [x0, y0] = poly[i]
      const [x1, y1] = poly[(i + 1) % poly.length]
      const nx = y1 - y0
      const ny = x0 - x1
      let a0 = Infinity
      let a1 = -Infinity
      for (const [x, y] of a) {
        const v = x * nx + y * ny
        a0 = Math.min(a0, v)
        a1 = Math.max(a1, v)
      }
      let b0 = Infinity
      let b1 = -Infinity
      for (const [x, y] of b) {
        const v = x * nx + y * ny
        b0 = Math.min(b0, v)
        b1 = Math.max(b1, v)
      }
      if (a1 <= b0 || b1 <= a0) return false
    }
  return true
}

/** 볼록 다각형을 꼭짓점마다 무게중심에서 d 만큼 더 멀리 — 둘레에 틈을 둔 판정에 쓴다 (모서리 쪽은 d 보다 조금 덜 넓어진다) */
function inflate(poly: readonly (readonly [number, number])[], d: number): (readonly [number, number])[] {
  const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length
  const cy = poly.reduce((a, p) => a + p[1], 0) / poly.length
  return poly.map(([x, y]) => {
    const r = Math.hypot(x - cx, y - cy) || 1
    return [x + ((x - cx) / r) * d, y + ((y - cy) / r) * d] as const
  })
}

/** 다각형들이 비울 상자(사방으로 pad 만큼 넓힌 것) 어느 것에도 걸리지 않는가 */
function clearOf(polys: readonly (readonly (readonly [number, number])[])[], holes: YieldHoles, pad = 0): boolean {
  for (const poly of polys) {
    let x0 = Infinity
    let y0 = Infinity
    let x1 = -Infinity
    let y1 = -Infinity
    for (const [x, y] of poly) {
      x0 = Math.min(x0, x)
      y0 = Math.min(y0, y)
      x1 = Math.max(x1, x)
      y1 = Math.max(y1, y)
    }
    for (const b of holes.within(x0 - pad, y0 - pad, x1 + pad, y1 + pad))
      if (polyHitsBox(poly, pad ? { x0: b.x0 - pad, y0: b.y0 - pad, x1: b.x1 + pad, y1: b.y1 + pad } : b)) return false
  }
  return true
}

/**
 * tier 하나의 비킨 모습. holes: 그 tier 의 이름 상자 (배율 걸음 상자를 모두 합친 것), px0: 그 tier 에서 이 화면이 닿는 가장 작은 배율(px/단위 —
 * 미끄러지는 거리와 크기를 화면 px 로 셀 때 쓴다 — 그 tier 에서 헤드론이 화면에 가장 작게 보이는 배율), ok(x, y, h): 그 헤드론이 그 자리(그림자 자리)에
 * 있어도 되는가 (무리의 테두리), fixed(h): 이 tier 에 비키지 않는 헤드론 (이 tier 에 나오는 지역 상세의 마스크에
 * 모두 가려져 보이지 않는 것),
 * marks: 미끄러져 간 자리의 몸통이 덮지 않을 상자 (장소 마커·카드 표시 — 제자리의 헤드론은 그대로 두고, 옮겨 간 헤드론이 표시를 새로 덮지 않게).
 * shun: 미끄러져 간 몸통이 되도록 덮지 않을 상자 (페이즈 그림) — 그것을 비키는 자리가 없으면 그 위로도 간다 (그림 때문에 이름 위에 남거나 지워지지 않게).
 * 헤드론 차례대로 정하므로 같은 입력이면 늘 같은 결과다.
 */
export function yieldHedrons(
  items: readonly YieldHedron[],
  holes: YieldHoles,
  px0: number,
  ok: (x: number, y: number, h: YieldHedron) => boolean,
  fixed: (h: YieldHedron) => boolean = () => false,
  marks?: YieldHoles,
  shun?: YieldHoles,
): Map<string, HedronMove> {
  const out = new Map<string, HedronMove>()
  if (!(px0 > 0)) return out
  // 이름에 걸리지 않는가 — pad: 몸통(첫 다각형)이 이름 상자와 떨어질 틈(지도 단위), 흐린 그림자(뒤의 것)는 닿기만 하는 것은 괜찮다.
  // 틈(NAME_GAP_PX)은 바람이다 — 틈을 두는 자리가 없으면 틈 없이 닿기만 하는 자리로 가거나 제자리에 남고, 틈 때문에 헤드론을 지우지는 않는다
  const pad = NAME_GAP_PX / px0
  const nameClearAt = (polys: readonly (readonly (readonly [number, number])[])[], g: number) => clearOf(polys.slice(0, 1), holes, g) && clearOf(polys.slice(1), holes)
  // 제자리에 남는 것이 먼저 자리를 차지한다 — 미끄러진 것은 그 자리와 떨어진다.
  // soft: 이름에 닿지는 않지만 틈이 모자란 것 — 제자리를 차지한 채 걸린 것(hit)이 다 정해진 뒤에 틈을 두는 빈 자리를 찾고, 없으면 제자리에 남는다
  const stay: YieldHedron[] = []
  const hit: YieldHedron[] = []
  const soft: YieldHedron[] = []
  for (const h of items) {
    if (h.single || h.grounded || fixed(h) || nameClearAt(hedronNameShape(h), pad)) stay.push(h)
    else if (nameClearAt(hedronNameShape(h), 0)) soft.push(h)
    else hit.push(h)
  }
  const taken: [number, number][] = [...stay, ...soft].map((h) => [h.x, h.y])
  // 그려지는 몸통 — 제자리에 남는 것과 미끄러져 간 것 (지워지는 것은 빼고, 아직 정하지 않은 것은 제자리로 본다)
  const bodies = new Map<string, (readonly [number, number])[]>(items.map((h) => [h.key, hedronShape(h)[0]]))
  const free = (x: number, y: number) => taken.every(([tx, ty]) => (tx - x) ** 2 + (ty - y) ** 2 >= SPACING * SPACING)
  const gap = GAP_PX / px0
  const apart = (h: YieldHedron, body: readonly (readonly [number, number])[]) => {
    const grown = inflate(body, gap)
    for (const [k, other] of bodies) if (k !== h.key && polysOverlap(grown, other)) return false
    return true
  }
  const place = (h: YieldHedron, got: [number, number]) => {
    out.set(h.key, { dx: got[0], dy: got[1] })
    taken.push([h.x + got[0], h.y + got[1]])
    bodies.set(h.key, hedronShape(h, got[0], got[1])[0])
  }
  /** 가까운 빈 자리 — shape 로 이름(틈 g)에 걸리는지 본다 */
  const search = (h: YieldHedron, g: number, shape: (dx: number, dy: number) => (readonly [number, number])[][], avoid?: YieldHoles): [number, number] | null => {
    const step = RING_STEP_PX / px0
    const max = slideMax(h, px0)
    for (let r = step; r <= max + 1e-9; r += step)
      for (let k = 0; k < DIRECTIONS; k++) {
        const a = (k / DIRECTIONS) * Math.PI * 2
        const dx = Math.cos(a) * r
        const dy = Math.sin(a) * r
        const x = h.x + dx
        const y = h.y + dy
        if (!free(x, y) || !ok(x, y, h)) continue
        const body = hedronShape(h, dx, dy)
        if (nameClearAt(shape(dx, dy), g) && (!marks || clearOf(body, marks)) && (!avoid || clearOf(body, avoid)) && apart(h, body[0])) return [dx, dy]
      }
    return null
  }
  // 그림자까지 비키는 자리가 먼저, 없으면 몸통만 비키는 자리 — 흐린 그림자 때문에 헤드론을 지우지는 않는다 (몸통이 이미 비켜 있으면 제자리).
  // 저마다 그림을 비키는 자리가 먼저
  const find = (h: YieldHedron, g: number): [number, number] | null => {
    const withShadow = (dx: number, dy: number) => hedronNameShape(h, dx, dy)
    const bodyOnly = (dx: number, dy: number) => hedronShape(h, dx, dy)
    return (
      (shun && search(h, g, withShadow, shun)) ||
      search(h, g, withShadow) ||
      (nameClearAt(hedronShape(h), g) ? null : (shun && search(h, g, bodyOnly, shun)) || search(h, g, bodyOnly))
    )
  }
  for (const h of hit) {
    // 틈을 두는 자리가 먼저, 없으면 닿기만 하는 자리
    const got = find(h, pad) || find(h, 0)
    if (got) place(h, got)
    else if (nameClearAt(hedronShape(h), 0)) taken.push([h.x, h.y])
    else if (halfLength(h) * 2 * px0 <= KEEP_PX) {
      out.set(h.key, 'hide')
      bodies.delete(h.key)
    }
    // 화면에서 큰 헤드론은 그대로 — 이름은 글자 테두리(halo)로 읽힌다
    else taken.push([h.x, h.y])
  }
  for (const h of soft) {
    // 제자리 몫을 내려놓고 틈을 두는 자리를 찾는다 — 없으면 제자리 (이름에 닿지는 않는다)
    const i = taken.findIndex(([x, y]) => x === h.x && y === h.y)
    if (i >= 0) taken.splice(i, 1)
    const got = find(h, pad)
    if (got) place(h, got)
    else taken.push([h.x, h.y])
  }
  return out
}

/**
 * 하나뿐인 거대 헤드론(Sky Rock·Ikiral)이 그려지는 몸통(떠다니는 폭까지)을 가로 띠로 나눈 상자들 (지도 단위) — 비키지 않는 대신 이름 배치가
 * 무른 장애물로 비킨다(labels.ts 의 soft — 다른 자리가 없으면 이름은 그 위에도 앉는다). 기울인 마름모를 한 상자로 덮으면 귀퉁이의 빈 하늘까지 막아
 * 띠마다 그 높이에서 몸통이 차지한 가로 폭만 쓴다
 */
export function bodyBands(h: YieldHedron, n = 6): YieldBox[] {
  const [poly] = hedronShape(h)
  let y0 = Infinity
  let y1 = -Infinity
  for (const [, y] of poly) {
    y0 = Math.min(y0, y)
    y1 = Math.max(y1, y)
  }
  const out: YieldBox[] = []
  for (let i = 0; i < n; i++) {
    const a = y0 + ((y1 - y0) * i) / n
    const b = y0 + ((y1 - y0) * (i + 1)) / n
    let x0 = Infinity
    let x1 = -Infinity
    // 띠 안의 꼭짓점과, 변이 띠의 위·아래 선을 지나는 점
    for (let j = 0; j < poly.length; j++) {
      const [px, py] = poly[j]
      const [qx, qy] = poly[(j + 1) % poly.length]
      if (py >= a && py <= b) {
        x0 = Math.min(x0, px)
        x1 = Math.max(x1, px)
      }
      for (const yy of [a, b])
        if ((py - yy) * (qy - yy) < 0) {
          const x = px + ((qx - px) * (yy - py)) / (qy - py)
          x0 = Math.min(x0, x)
          x1 = Math.max(x1, x)
        }
    }
    if (x1 > x0) out.push({ x0, y0: a, x1, y1: b })
  }
  return out
}

/** 두 결과가 같은가 — 같으면 앞의 것을 그대로 써 헤드론을 다시 그리지 않는다 */
export function sameMoves(a: ReadonlyMap<string, HedronMove>, b: ReadonlyMap<string, HedronMove>): boolean {
  if (a.size !== b.size) return false
  for (const [k, m] of a) {
    const n = b.get(k)
    if (n === undefined) return false
    if (m === 'hide' || n === 'hide') {
      if (m !== n) return false
    } else if (m.dx !== n.dx || m.dy !== n.dy) return false
  }
  return true
}
