// 세계 지도 지형 기호가 그림 이름을 비켜 준다 — 기호를 다 뿌린 뒤, 그 배율 단계(tier)에 자리를 받은 그림 이름 상자에 걸리는 기호만 하나씩 뺀다.
// 산 띠의 기호(봉우리·언덕·눈산·대지·수정)는 커서 통째로 빼면 이름이 몰린 산지가 빈다 — 그린 선이 상자를 지날 때만 상자 안의 선·칠을 걷어 낸다.
// 뿌리는 입력(씨앗·자리 판정)은 건드리지 않는다 — 이름 상자를 뿌리기에 넣으면 대륙 기호가 통째로 다시 뿌려진다(CLAUDE.md).
// 페이즈 바탕(period)의 '기호는 만든 뒤 빼거나 더해 나머지 기호의 자리를 지킨다'와 같은 셈이라, 남은 기호의 자리·차례는 그대로다
// (모양은 걷어 낸 봉우리만 바뀐다).
//
// 기호의 자리 기록(span): 칸(tiler) 문자열과 산 띠 문자열을 만들 때 조각마다 그 기호의 종류·밑동 자리·끝을 적어 둔다 (문자열은 바뀌지 않는다).
// 같은 기호의 조각(수관과 줄기, 맹그로브의 수관·뿌리·물결)은 종류·자리가 같아 늘 함께 빠진다.
// 페이즈 바탕을 다시 이은 지형(periodTerrain.ts 의 replayTerrain)과 깊은 확대 칸(fineTerrain.ts)도 같은 기록을 이어 받는다.
// 지역 상세의 기호(childDetail.ts 의 detailTerrain)도 같은 기록을 남겨 깊은 확대 칸에서 함께 빠진다 — 그 tier 의 이름 상자만큼만 비우므로,
// 지역 상세의 빈터는 그림 자리만 맡고 이름 자리를 tier 마다 따로 비울 일이 없다 (scripts/childmaps/STYLE.md).
import type { MountainBand, TerrainLayers } from './terrain'

/** 기호 종류 — 바탕(ScatterKind)과 페이즈 바탕의 무늬·죽은 나무. 번호는 기록에만 쓴다 */
export const GLYPH_KINDS = [
  'peak',
  'hill',
  'snow',
  'crystal-spire',
  'mesa',
  'crystal',
  'tree',
  'mangrove',
  'marsh',
  'ice',
  'canyon',
  'lava',
  'tundra',
  'dust',
  'chalk',
  'drybed',
  'deadwood',
] as const
export type GlyphKind = (typeof GLYPH_KINDS)[number]
const CODE = new Map<string, number>(GLYPH_KINDS.map((k, i) => [k, i]))
/** 종류 → 기록 번호 */
export const kindCode = (k: GlyphKind): number => CODE.get(k)!
/** 기록이 없는 조각 (선 따위) — 빼지 않는다 */
export const NO_KIND = 255

/**
 * 기호가 그려지는 상자 — 밑동 자리에서 [왼쪽, 위, 오른쪽, 아래] (지도 단위, 깊은 확대는 g 배). 기호 모양 함수(terrain.ts·landscapeGlyphs.ts·
 * periodGlyphs.ts)의 난수 폭이 가장 클 때의 끝에 선 굵기 몫(0.6)을 더했다 — 협곡 단애선은 방향이 제각각이라 사방으로 같은 폭
 */
const EXTENT: Record<GlyphKind, readonly [number, number, number, number]> = {
  peak: [-11.6, -16.6, 12.2, 1],
  hill: [-10.6, -5, 10.6, 1],
  snow: [-9.6, -13.6, 9.6, 1],
  'crystal-spire': [-8.5, -13, 8.5, 1],
  mesa: [-13.6, -9.1, 14.3, 1],
  crystal: [-8.5, -13, 8.5, 1],
  tree: [-5.6, -6.4, 5.5, 4.8],
  mangrove: [-5.4, -10, 5.4, 2.9],
  marsh: [-7.6, -7.1, 7.6, 3.1],
  ice: [-0.6, -1, 6.6, 1],
  canyon: [-14, -14, 14, 14],
  lava: [-7.5, -7.5, 7.5, 7.5],
  tundra: [-6.1, -4.9, 6.1, 2.9],
  dust: [-12.6, -5.5, 12.6, 5.5],
  chalk: [-7, -3.6, 7, 3.6],
  drybed: [-8.6, -6.6, 8.6, 6.6],
  deadwood: [-6.2, -9.2, 6.2, 4.4],
}
const EXT = GLYPH_KINDS.map((k) => EXTENT[k])
/** 어느 기호든 밑동에서 가장 멀리 닿는 폭 — 칸을 통째로 건너뛸 때 */
const REACH = Math.max(...EXT.flat().map(Math.abs))

/** 칸 문자열 하나의 기호 조각들 — 조각 i 는 문자열의 [end[i-1], end[i]) (첫 조각은 0 부터). 조각이 끝난 뒤의 나머지(기록 없는 덧붙임)는 그대로 둔다 */
export interface PieceSpans {
  kind: Uint8Array
  x: Float64Array
  y: Float64Array
  end: Int32Array
  /** 밑동 자리의 범위 */
  x0: number
  y0: number
  x1: number
  y1: number
}

/** 산 띠 하나의 봉우리들 — 봉우리 i 가 여섯 문자열(fill·crystal·ridge·hatch·crystalRidge·crystalHatch)에 넣은 길이 lens[i*6 + j] */
export interface BandSpans {
  kind: Uint8Array
  x: Float64Array
  y: Float64Array
  lens: Int32Array
}

const tileSpans = new WeakMap<readonly string[], readonly (PieceSpans | null)[]>()
const bandSpans = new WeakMap<MountainBand, BandSpans>()
export const spansOfTiles = (arr: readonly string[]) => tileSpans.get(arr)
export const setTileSpans = (arr: readonly string[], spans: readonly (PieceSpans | null)[]) => tileSpans.set(arr, spans)
export const spansOfBand = (b: MountainBand) => bandSpans.get(b)
export const setBandSpans = (b: MountainBand, s: BandSpans) => bandSpans.set(b, s)

/** 칸 하나의 조각을 모으는 것 — 다 모으면 seal 로 PieceSpans 를 낸다 */
export class PieceList {
  kind: number[] = []
  x: number[] = []
  y: number[] = []
  end: number[] = []
  push(kind: number, x: number, y: number, end: number) {
    this.kind.push(kind)
    this.x.push(x)
    this.y.push(y)
    this.end.push(end)
  }
  /** 이미 있는 기록을 이어 받는다 (그 문자열 앞부분이 그대로일 때) */
  static from(s: PieceSpans | null | undefined): PieceList {
    const l = new PieceList()
    if (s) for (let i = 0; i < s.end.length; i++) l.push(s.kind[i], s.x[i], s.y[i], s.end[i])
    return l
  }
  seal(): PieceSpans {
    let x0 = Infinity
    let y0 = Infinity
    let x1 = -Infinity
    let y1 = -Infinity
    for (let i = 0; i < this.x.length; i++) {
      if (this.kind[i] === NO_KIND) continue
      x0 = Math.min(x0, this.x[i])
      x1 = Math.max(x1, this.x[i])
      y0 = Math.min(y0, this.y[i])
      y1 = Math.max(y1, this.y[i])
    }
    return { kind: Uint8Array.from(this.kind), x: Float64Array.from(this.x), y: Float64Array.from(this.y), end: Int32Array.from(this.end), x0, y0, x1, y1 }
  }
}

/** 이어 붙인 칸 층 (깊은 확대에서 세계 지도 칸 뒤에 지역 상세 칸) — 기록이 있는 쪽의 기록을 그대로, 없는 쪽은 비운다 */
export function concatTileSpans(parts: readonly (readonly string[])[], out: readonly string[]) {
  if (!parts.some((p) => tileSpans.has(p))) return
  setTileSpans(
    out,
    parts.flatMap((p) => tileSpans.get(p) ?? p.map(() => null)),
  )
}

/** 지도 단위 상자 */
export interface HoleBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

/** 한 배율 단계에서 기호를 비울 상자들 — 칸 격자에 담아 가까운 상자만 본다 */
export interface GlyphHoles {
  boxes: readonly HoleBox[]
  /** 격자 칸 (지도 단위) */
  cell: number
  /** [x0, y0, x1, y1] 와 겹치는 상자들 (지도 칸·산 띠 하나에 닿는 것만 먼저 골라, 그 안의 기호는 이 짧은 목록과만 견준다) */
  within(x0: number, y0: number, x1: number, y1: number): HoleBox[]
  /** boxes 안의 차례 */
  indexOf(b: HoleBox): number
}

export const NO_HOLES: GlyphHoles = { boxes: [], cell: 1, within: () => [], indexOf: () => -1 }

/** 상자들 → 비울 자리. cell: 격자 칸 (지도 단위) */
export function glyphHoles(boxes: readonly HoleBox[], cell: number): GlyphHoles {
  if (!boxes.length) return NO_HOLES
  const cells = new Map<number, HoleBox[]>()
  const order = new Map(boxes.map((b, i) => [b, i]))
  const key = (cx: number, cy: number) => (cy + 32768) * 65536 + cx + 32768
  for (const b of boxes)
    for (let cy = Math.floor(b.y0 / cell); cy <= Math.floor(b.y1 / cell); cy++)
      for (let cx = Math.floor(b.x0 / cell); cx <= Math.floor(b.x1 / cell); cx++) {
        const k = key(cx, cy)
        const list = cells.get(k)
        if (list) list.push(b)
        else cells.set(k, [b])
      }
  return {
    boxes,
    cell,
    within(x0, y0, x1, y1) {
      const out: HoleBox[] = []
      for (let cy = Math.floor(y0 / cell); cy <= Math.floor(y1 / cell); cy++)
        for (let cx = Math.floor(x0 / cell); cx <= Math.floor(x1 / cell); cx++) {
          const list = cells.get(key(cx, cy))
          if (list) for (const b of list) if (b.x0 < x1 && x0 < b.x1 && b.y0 < y1 && y0 < b.y1 && !out.includes(b)) out.push(b)
        }
      return out
    },
    indexOf: (b) => order.get(b) ?? -1,
  }
}

/** 상자 목록 가운데 [x0, y0, x1, y1] 와 겹치는 것이 있나 */
function meets(list: readonly HoleBox[], x0: number, y0: number, x1: number, y1: number): boolean {
  for (const b of list) if (b.x0 < x1 && x0 < b.x1 && b.y0 < y1 && y0 < b.y1) return true
  return false
}

/** 기호 하나(종류·밑동 자리, 크기 g)가 비울 자리 가까이인가 — 종류마다 가장 큰 상자로 걸러, 그린 모양을 잴 기호만 고른다 */
function near(list: readonly HoleBox[], kind: number, x: number, y: number, g: number): boolean {
  if (kind === NO_KIND) return false
  const e = EXT[kind]
  return meets(list, x + e[0] * g, y + e[1] * g, x + e[2] * g, y + e[3] * g)
}

/** 그린 모양의 상자를 모으는 것 (기호 공간) */
interface Extent {
  x0: number
  y0: number
  x1: number
  y1: number
}
const emptyExtent = (): Extent => ({ x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity })
const ARGS: Record<string, number> = { M: 2, L: 2, Q: 4, T: 2, Z: 0, l: 2, h: 1, a: 7 }

/**
 * 기호 조각(path 글)이 그리는 자리를 e 에 더한다 — 기호 모양 함수가 쓰는 명령(M·L·Q·T·Z, 상대 l·h·a)만 읽는다.
 * 곡선은 조절점까지, 호는 그 원을 덮는 원까지 넣어 넉넉히 잡는다.
 * segs 를 주면 그린 선을 선분(x0, y0, x1, y1 넷씩)으로도 모은다 — 2차 곡선은 steps 토막(넷이면 곡선과 토막의 틈이 선 굵기 몫보다 훨씬 작다). 호는 넣지 않는다 (산 띠에는 없다)
 */
function addPathExtent(d: string, e: Extent, segs?: number[], steps = 4) {
  let cmd = ''
  let args: number[] = []
  let px = 0
  let py = 0
  let sx = 0
  let sy = 0
  let qx = NaN
  let qy = NaN
  const line = (x: number, y: number) => segs?.push(px, py, x, y)
  const curve = (cx: number, cy: number, x: number, y: number) => {
    if (!segs) return
    let ax = px
    let ay = py
    for (let k = 1; k <= steps; k++) {
      const t = k / steps
      const bx = bez(px, cx, x, t)
      const by = bez(py, cy, y, t)
      segs.push(ax, ay, bx, by)
      ax = bx
      ay = by
    }
  }
  const put = (x: number, y: number) => {
    if (x < e.x0) e.x0 = x
    if (x > e.x1) e.x1 = x
    if (y < e.y0) e.y0 = y
    if (y > e.y1) e.y1 = y
  }
  const run = () => {
    switch (cmd) {
      case 'M':
        px = sx = args[0]
        py = sy = args[1]
        put(px, py)
        qx = NaN
        break
      case 'L':
        line(args[0], args[1])
        px = args[0]
        py = args[1]
        put(px, py)
        qx = NaN
        break
      case 'Q':
        put(args[0], args[1])
        qx = args[0]
        qy = args[1]
        curve(qx, qy, args[2], args[3])
        px = args[2]
        py = args[3]
        put(px, py)
        break
      case 'T':
        // 앞 조절점을 지금 점에 비춘 것
        if (!Number.isNaN(qx)) {
          qx = 2 * px - qx
          qy = 2 * py - qy
          put(qx, qy)
          curve(qx, qy, args[0], args[1])
        } else line(args[0], args[1])
        px = args[0]
        py = args[1]
        put(px, py)
        break
      case 'l':
        line(px + args[0], py + args[1])
        px += args[0]
        py += args[1]
        put(px, py)
        qx = NaN
        break
      case 'h':
        line(px + args[0], py)
        px += args[0]
        put(px, py)
        qx = NaN
        break
      case 'Z':
        line(sx, sy)
        px = sx
        py = sy
        qx = NaN
        break
      case 'a': {
        const ex = px + args[5]
        const ey = py + args[6]
        // 호는 반지름 r 의 원 위 — 그 원의 중심은 현 가운데에서 √(r² − (현/2)²) 비켜 있다. 현 가운데를 중심으로 그만큼 더 큰 원을 넣으면
        // 어느 쪽 원이든 덮는다 (현이 지름보다 길면 원이 현에 맞춰 커진다)
        const half = Math.hypot(args[5], args[6]) / 2
        const rx = Math.abs(args[0])
        const r = Math.max(rx, half) + Math.sqrt(Math.max(0, rx * rx - half * half))
        const mx = (px + ex) / 2
        const my = (py + ey) / 2
        put(mx - r, my - r)
        put(mx + r, my + r)
        px = ex
        py = ey
        qx = NaN
        break
      }
    }
  }
  // 글을 한 번 훑는다 — 명령 글자와 수 (기호 글은 지수 표기를 쓰지 않는다)
  const n = d.length
  let i = 0
  while (i < n) {
    const c = d.charCodeAt(i)
    // 수: - . 0-9
    if (c === 45 || c === 46 || (c >= 48 && c <= 57)) {
      let j = i + 1
      while (j < n) {
        const k = d.charCodeAt(j)
        if (k === 46 || (k >= 48 && k <= 57)) j++
        else break
      }
      args.push(+d.slice(i, j))
      i = j
      if (args.length === ARGS[cmd]) {
        run()
        args = []
        // 이어지는 수는 같은 명령을 되풀이한다 (M 뒤면 L)
        if (cmd === 'M') cmd = 'L'
      }
      continue
    }
    const t = d[i]
    if (t in ARGS) {
      cmd = t
      args = []
      if (cmd === 'Z') run()
    }
    i++
  }
}

const bez = (a: number, c: number, b: number, t: number) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b

/** 선 굵기 몫 (기호 공간) — 그린 모양 상자에 더한다 */
const STROKE = 0.6

/** 기호의 이름표 — 같은 기호의 조각(층·띠 문자열이 달라도)은 종류·밑동 자리가 같다 */
const glyphKey = (kind: number, x: number, y: number) => `${kind},${x},${y}`

/** 그린 모양 상자(기호 공간, ×g 로 지도 단위)가 비울 자리에 걸리나 */
const extentHits = (list: readonly HoleBox[], e: Extent, g: number) =>
  e.x0 <= e.x1 && meets(list, (e.x0 - STROKE) * g, (e.y0 - STROKE) * g, (e.x1 + STROKE) * g, (e.y1 + STROKE) * g)

/** 칸 층 하나에서 비울 자리 가까이의 기호를 고르고, 그린 모양이 걸리는 기호의 이름표를 hit 에 넣는다 */
function markTiles(arr: readonly string[], holes: GlyphHoles, g: number, hit: Set<string>) {
  const spans = tileSpans.get(arr)
  if (!spans) return
  const reach = REACH * g
  for (let t = 0; t < arr.length; t++) {
    const s = spans[t]
    if (!s || !s.end.length) continue
    const list = holes.within(s.x0 - reach, s.y0 - reach, s.x1 + reach, s.y1 + reach)
    if (!list.length) continue
    const d = arr[t]
    // 한 기호의 조각은 이 층 안에서 잇달아 놓인다 — 이름표가 같은 동안 모양 상자를 모은다
    let key = ''
    let e = emptyExtent()
    const flush = () => {
      if (key && extentHits(list, e, g)) hit.add(key)
      key = ''
      e = emptyExtent()
    }
    for (let i = 0; i < s.end.length; i++) {
      if (!near(list, s.kind[i], s.x[i], s.y[i], g)) {
        flush()
        continue
      }
      const k = glyphKey(s.kind[i], s.x[i], s.y[i])
      if (k !== key) flush()
      key = k
      addPathExtent(d.slice(i ? s.end[i - 1] : 0, s.end[i]), e)
    }
    flush()
  }
}

/** 산 띠 하나(봉우리 밑동의 범위 + 기호 폭)에 닿는 비울 자리 */
function bandHoles(s: BandSpans, holes: GlyphHoles, g: number): HoleBox[] {
  if (!s.x.length) return []
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (let i = 0; i < s.x.length; i++) {
    x0 = Math.min(x0, s.x[i])
    x1 = Math.max(x1, s.x[i])
    y0 = Math.min(y0, s.y[i])
    y1 = Math.max(y1, s.y[i])
  }
  const reach = REACH * g
  return holes.within(x0 - reach, y0 - reach, x1 + reach, y1 + reach)
}

/**
 * 선분들(기호 공간, ×g 로 지도 단위)이 비울 자리의 상자(선 굵기만큼 키운 것)를 지나나 — 선분을 상자로 잘라(Liang–Barsky) 남는 몫이 있으면 지난다
 */
function segmentsHit(list: readonly HoleBox[], segs: readonly number[], g: number): boolean {
  for (const b of list) {
    const bx0 = b.x0 / g - STROKE
    const by0 = b.y0 / g - STROKE
    const bx1 = b.x1 / g + STROKE
    const by1 = b.y1 / g + STROKE
    for (let i = 0; i < segs.length; i += 4) {
      const x0 = segs[i]
      const y0 = segs[i + 1]
      const dx = segs[i + 2] - x0
      const dy = segs[i + 3] - y0
      let t0 = 0
      let t1 = 1
      const clip = (p: number, q: number) => {
        // p·t ≤ q 인 t 만 남긴다
        if (p === 0) return q >= 0
        const r = q / p
        if (p < 0) {
          if (r > t1) return false
          if (r > t0) t0 = r
        } else {
          if (r < t0) return false
          if (r < t1) t1 = r
        }
        return true
      }
      if (clip(-dx, x0 - bx0) && clip(dx, bx1 - x0) && clip(-dy, y0 - by0) && clip(dy, by1 - y0) && t0 <= t1) return true
    }
  }
  return false
}

/**
 * 산 띠에서 같은 일 — 봉우리 하나는 여섯 문자열에 걸쳐 있다. 산(봉우리·언덕·눈산·대지·수정)은 커서, 그린 모양 상자(조절점까지)로 보면
 * 이름이 세모의 빈 안쪽이나 귀퉁이에만 걸려도 산맥이 통째로 빈다 — 그린 선(능선·빗금·눈 경계선, 곡선은 곡선 위의 토막)이 상자를 지날 때만 뺀다.
 * 봉우리 안쪽은 양피지 칠(mtn-fill)이라 이름이 그 안에 들어앉아도 획에 걸리지 않는다 — 그 칠이 가린 뒤쪽 봉우리의 선도 따로 견주어
 * 그 봉우리가 빠지면 드러날 선이 남지 않는다
 */
function markBands(bands: readonly MountainBand[], holes: GlyphHoles, g: number, hit: Set<string>) {
  for (const band of bands) {
    const s = bandSpans.get(band)
    const list = s && bandHoles(s, holes, g)
    if (!s || !list?.length) continue
    const src = [band.fill, band.crystal, band.ridge, band.hatch, band.crystalRidge, band.crystalHatch]
    const off = [0, 0, 0, 0, 0, 0]
    for (let i = 0; i < s.kind.length; i++) {
      const close = near(list, s.kind[i], s.x[i], s.y[i], g)
      const e = close ? emptyExtent() : null
      const segs: number[] = []
      for (let j = 0; j < 6; j++) {
        const l = s.lens[i * 6 + j]
        // 채움(fill·crystal)은 능선(ridge·crystalRidge)에 Z 를 붙인 같은 모양이라 능선·빗금만 선으로 읽는다
        if (e && l) addPathExtent(src[j].slice(off[j], off[j] + l), e, j >= 2 ? segs : undefined)
        off[j] += l
      }
      if (e && extentHits(list, e, g) && segmentsHit(list, segs, g)) hit.add(glyphKey(s.kind[i], s.x[i], s.y[i]))
    }
  }
}

/** 칸 층 하나 — hit 에 든 기호의 조각을 뺀 문자열들 (하나도 안 빠지면 같은 배열) */
function cutTiles(arr: string[], holes: GlyphHoles, g: number, hit: ReadonlySet<string>): string[] {
  const spans = tileSpans.get(arr)
  if (!spans) return arr
  const reach = REACH * g
  let out: string[] | null = null
  for (let t = 0; t < arr.length; t++) {
    const s = spans[t]
    if (!s || !s.end.length) continue
    const list = holes.within(s.x0 - reach, s.y0 - reach, s.x1 + reach, s.y1 + reach)
    if (!list.length) continue
    const d = arr[t]
    let kept = ''
    let from = 0
    let dropped = false
    for (let i = 0; i < s.end.length; i++) {
      if (!near(list, s.kind[i], s.x[i], s.y[i], g) || !hit.has(glyphKey(s.kind[i], s.x[i], s.y[i]))) continue
      kept += d.slice(from, i ? s.end[i - 1] : 0)
      from = s.end[i]
      dropped = true
    }
    if (!dropped) continue
    kept += d.slice(from)
    out ??= arr.slice()
    out[t] = kept
  }
  return out ?? arr
}

const fmt = (v: number) => (Math.round(v * 10) / 10).toString()
/** 걷어 낸 봉우리를 남기는 능선 길이의 몫 — 그보다 덜 남으면 봉우리째 뺀다 */
const KEEP_RIDGE = 0.4

/**
 * 선 조각(path 글)에서 상자들(기호 공간 — 선 굵기만큼 키운 것) 안을 지나는 몫을 걷어 낸 글 — 2차 곡선은 여덟 토막의 꺾은선으로 바꿔 자른다.
 * 남는 몫이 이어지면 한 꺾은선으로 이어 쓴다 (꺾이는 자리의 선 이음이 그대로 보이게)
 */
function knockOut(d: string, boxes: readonly (readonly [number, number, number, number])[], kept?: { before: number; after: number }): string {
  const segs: number[] = []
  addPathExtent(d, emptyExtent(), segs, 8)
  let out = ''
  let penX = NaN
  let penY = NaN
  const cuts: [number, number][] = []
  for (let i = 0; i < segs.length; i += 4) {
    const x0 = segs[i]
    const y0 = segs[i + 1]
    const dx = segs[i + 2] - x0
    const dy = segs[i + 3] - y0
    cuts.length = 0
    for (const [bx0, by0, bx1, by1] of boxes) {
      let t0 = 0
      let t1 = 1
      const clip = (p: number, q: number) => {
        if (p === 0) return q >= 0
        const r = q / p
        if (p < 0) {
          if (r > t1) return false
          if (r > t0) t0 = r
        } else {
          if (r < t0) return false
          if (r < t1) t1 = r
        }
        return true
      }
      if (clip(-dx, x0 - bx0) && clip(dx, bx1 - x0) && clip(-dy, y0 - by0) && clip(dy, by1 - y0) && t0 < t1) cuts.push([t0, t1])
    }
    cuts.sort((a, b) => a[0] - b[0])
    // 걷어 낸 몫 밖의 토막들
    let from = 0
    const keep: [number, number][] = []
    for (const [a, b] of cuts) {
      if (a > from) keep.push([from, a])
      from = Math.max(from, b)
    }
    if (from < 1) keep.push([from, 1])
    if (kept) {
      const len = Math.hypot(dx, dy)
      kept.before += len
      for (const [a, b] of keep) kept.after += (b - a) * len
    }
    for (const [a, b] of keep) {
      const ax = fmt(x0 + dx * a)
      const ay = fmt(y0 + dy * a)
      // 앞 토막의 끝에서 그대로 이어지면 L 만
      if (!(a === 0 && x0 === penX && y0 === penY)) out += `M${ax} ${ay}`
      out += `L${fmt(x0 + dx * b)} ${fmt(y0 + dy * b)}`
      penX = b === 1 ? segs[i + 2] : NaN
      penY = b === 1 ? segs[i + 3] : NaN
    }
    if (!keep.length || keep[keep.length - 1][1] < 1) penX = penY = NaN
  }
  return out
}

type Poly = number[]

/** 다각형(x·y 번갈아)을 반평면 a·x + b·y ≤ c 로 자른 것 (Sutherland–Hodgman) */
function clipHalf(poly: Poly, a: number, b: number, c: number): Poly {
  const out: Poly = []
  const n = poly.length / 2
  for (let i = 0; i < n; i++) {
    const x0 = poly[2 * i]
    const y0 = poly[2 * i + 1]
    const j = (i + 1) % n
    const x1 = poly[2 * j]
    const y1 = poly[2 * j + 1]
    const v0 = a * x0 + b * y0 - c
    const v1 = a * x1 + b * y1 - c
    if (v0 <= 0) out.push(x0, y0)
    if ((v0 < 0 && v1 > 0) || (v0 > 0 && v1 < 0)) {
      const t = v0 / (v0 - v1)
      out.push(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)
    }
  }
  return out
}

/** 다각형에서 상자를 뺀 조각들 — 상자의 왼쪽·오른쪽, 그 사이의 위·아래 (가운데 조각은 옆 조각에 조금 겹쳐 칠 사이에 이음매가 보이지 않게 — 칠은 불투명하다) */
function minusBox(poly: Poly, [bx0, by0, bx1, by1]: readonly [number, number, number, number]): Poly[] {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (let i = 0; i < poly.length; i += 2) {
    x0 = Math.min(x0, poly[i])
    x1 = Math.max(x1, poly[i])
    y0 = Math.min(y0, poly[i + 1])
    y1 = Math.max(y1, poly[i + 1])
  }
  if (x1 <= bx0 || x0 >= bx1 || y1 <= by0 || y0 >= by1) return [poly]
  const e = 0.05
  const mid = (p: Poly) => clipHalf(clipHalf(p, -1, 0, -(bx0 - e)), 1, 0, bx1 + e)
  return [clipHalf(poly, 1, 0, bx0), clipHalf(poly, -1, 0, -bx1), clipHalf(mid(poly), 0, 1, by0), clipHalf(mid(poly), 0, -1, -by1)].filter((p) => p.length >= 6)
}

/** 칠 조각(닫힌 path 글)에서 상자들 안을 뺀 글 — 2차 곡선은 여덟 토막으로 */
function knockFill(d: string, boxes: readonly (readonly [number, number, number, number])[]): string {
  const segs: number[] = []
  addPathExtent(d, emptyExtent(), segs, 8)
  // 이어진 선분들을 닫힌 다각형으로 (Z 가 시작점으로 돌아오는 선분을 넣었다)
  const polys: Poly[] = []
  let cur: Poly = []
  for (let i = 0; i < segs.length; i += 4) {
    if (!cur.length || segs[i] !== cur[cur.length - 2] || segs[i + 1] !== cur[cur.length - 1]) {
      if (cur.length >= 6) polys.push(cur)
      cur = [segs[i], segs[i + 1]]
    }
    cur.push(segs[i + 2], segs[i + 3])
  }
  if (cur.length >= 6) polys.push(cur)
  let pieces = polys
  for (const b of boxes) pieces = pieces.flatMap((p) => minusBox(p, b))
  return pieces.map((p) => `M${p.reduce((acc, v, i) => acc + (i % 2 ? ` ${fmt(v)}` : `${i ? 'L' : ''}${fmt(v)}`), '')}Z`).join('')
}

/**
 * 산 띠 — hit 에 든 봉우리는 이름 상자 안을 지나는 몫만 걷어 낸다: 선(능선·빗금·눈 경계선·수정 테두리)도 칠(mtn-fill·crystal-fill)도.
 * 봉우리 자리·크기는 남고 이름 둘레만 비어(그 자리는 밑의 땅 빛 — 숲 칠 위면 숲 빛), 이름이 몰린 산지에서도 산맥이 산맥으로 남는다
 * (봉우리를 통째로 빼면 이름 밑이 아니라 산맥이 빈다). 걷어 낸 봉우리의 곡선은 여덟 토막 꺾은선이 된다
 */
function cutBands(bands: MountainBand[], holes: GlyphHoles, g: number, hit: ReadonlySet<string>): MountainBand[] {
  let out: MountainBand[] | null = null
  bands.forEach((band, bi) => {
    const s = bandSpans.get(band)
    const list = s && bandHoles(s, holes, g)
    if (!s || !list?.length) return
    const n = s.kind.length
    const knocked = (i: number) => near(list, s.kind[i], s.x[i], s.y[i], g) && hit.has(glyphKey(s.kind[i], s.x[i], s.y[i]))
    let any = false
    for (let i = 0; i < n && !any; i++) any = knocked(i)
    if (!any) return
    // 상자를 기호 공간으로, 선 굵기만큼 키워 — 선의 둥근 끝이 상자 안으로 들지 않게
    const boxes = list.map((b) => [b.x0 / g - STROKE, b.y0 / g - STROKE, b.x1 / g + STROKE, b.y1 / g + STROKE] as const)
    const src = [band.fill, band.crystal, band.ridge, band.hatch, band.crystalRidge, band.crystalHatch]
    const res = ['', '', '', '', '', '']
    const off = [0, 0, 0, 0, 0, 0]
    for (let i = 0; i < n; i++) {
      const pieces = [0, 1, 2, 3, 4, 5].map((j) => src[j].slice(off[j], off[j] + s.lens[i * 6 + j]))
      for (let j = 0; j < 6; j++) off[j] += s.lens[i * 6 + j]
      if (!knocked(i)) {
        for (let j = 0; j < 6; j++) res[j] += pieces[j]
        continue
      }
      // 능선(ridge·crystalRidge)이 거의 다 걷히면(남는 길이가 KEEP_RIDGE 배 아래) 봉우리째 뺀다 — 칠의 가는 띠만 남아 숲 칠 위에 흰 금처럼 보이지 않게
      const kept = { before: 0, after: 0 }
      const cut = pieces.map((d, j) => (!d ? d : j < 2 ? knockFill(d, boxes) : knockOut(d, boxes, j === 2 || j === 4 ? kept : undefined)))
      if (kept.after < kept.before * KEEP_RIDGE) continue
      for (let j = 0; j < 6; j++) res[j] += cut[j]
    }
    // 기록 뒤에 이어 붙은 것 (기록이 없는 띠를 이은 뒤 — fineTerrain.ts 의 merge) 은 그대로
    for (let j = 0; j < 6; j++) res[j] += src[j].slice(off[j])
    out ??= bands.slice()
    out[bi] = { key: band.key, fill: res[0], crystal: res[1], ridge: res[2], hatch: res[3], crystalRidge: res[4], crystalHatch: res[5] }
  })
  return out ?? bands
}

/** 비울 자리로 자른 지형 — 상자들(holes)마다 */
function cutWith(t: TerrainLayers, holes: GlyphHoles, g: number): TerrainLayers {
  const p = t.period
  const tileLayers = [t.trees.crowns, t.trees.trunks, t.marsh, t.ice, t.canyons, t.lava, t.tundra, t.frost, ...(p ? [p.dust, p.chalk, p.drybed, p.deadwood] : [])]
  const hit = new Set<string>()
  for (const arr of tileLayers) markTiles(arr, holes, g, hit)
  markBands(t.mountains, holes, g, hit)
  if (!hit.size) return t
  const cut = (arr: string[]) => cutTiles(arr, holes, g, hit)
  const crowns = cut(t.trees.crowns)
  const trunks = cut(t.trees.trunks)
  const res: TerrainLayers = {
    ...t,
    mountains: cutBands(t.mountains, holes, g, hit),
    trees: crowns === t.trees.crowns && trunks === t.trees.trunks ? t.trees : { crowns, trunks },
    marsh: cut(t.marsh),
    ice: cut(t.ice),
    canyons: cut(t.canyons),
    lava: cut(t.lava),
    tundra: cut(t.tundra),
    frost: cut(t.frost),
  }
  if (p) res.period = { dust: cut(p.dust), chalk: cut(p.chalk), drybed: cut(p.drybed), deadwood: cut(p.deadwood) }
  return res
}

/** 지형·비울 자리마다 — 지금까지 쓴 상자(on)와 그것으로 자른 지형 */
interface CutState {
  on: Uint8Array
  count: number
  res: TerrainLayers
}
const cuts = new WeakMap<TerrainLayers, WeakMap<GlyphHoles, CutState>>()

/**
 * 흩뿌린 기호 가운데 그린 모양이 비울 자리(그림 이름 상자)에 걸리는 것만 뺀 지형 — 선(해안 절벽·단애·협곡 바닥)은 그대로.
 * 먼저 종류마다 가장 큰 상자로 가까운 기호를 고르고, 그 기호의 조각 글을 읽어 그린 모양 상자(곡선은 조절점까지)가 걸리는지 본다.
 * 한 기호의 조각(수관·줄기, 맹그로브의 수관·뿌리·물결)은 하나라도 걸리면 함께 뺀다. 산 띠의 봉우리는 그린 선이 상자를 지날 때만
 * 여섯 문자열에서 함께 상자 안의 몫을 걷어 낸다 (markBands·cutBands).
 * g: 기호 크기 배수 (세계 지도 1, 깊은 확대 칸은 그 단계의 g). 빠지는 것이 없으면 같은 객체를 낸다 (끔·그림이 없는 보기는 바이트까지 같다).
 * area: 세계 지도처럼 지도 전체를 한 묶음으로 그릴 때 그릴 범위 — 그 범위에 닿는 상자만 쓰고, 지금까지 쓴 상자에 더해 간다.
 * 배율 단계가 바뀔 때 화면에서 먼 곳의 칸 문자열까지 바꿔(브라우저가 path 를 다시 읽는다) 그 렌더가 무거워지지 않게. 결과는 쓴 상자들로만 정해진다
 */
export function cutGlyphs(t: TerrainLayers, holes: GlyphHoles, g = 1, area?: { x0: number; y0: number; x1: number; y1: number }): TerrainLayers {
  if (!holes.boxes.length) return t
  let memo = cuts.get(t)
  if (!memo) cuts.set(t, (memo = new WeakMap()))
  let state = memo.get(holes)
  if (!state) memo.set(holes, (state = { on: new Uint8Array(holes.boxes.length), count: 0, res: t }))
  if (state.count === holes.boxes.length) return state.res
  let added = 0
  const turnOn = (i: number) => {
    if (!state.on[i]) {
      state.on[i] = 1
      added++
    }
  }
  if (area) for (const b of holes.within(area.x0, area.y0, area.x1, area.y1)) turnOn(holes.indexOf(b))
  else for (let i = 0; i < holes.boxes.length; i++) turnOn(i)
  if (!added) return state.res
  state.count += added
  const active = state.count === holes.boxes.length ? holes : glyphHoles(holes.boxes.filter((_, i) => state.on[i]), holes.cell)
  state.res = cutWith(t, active, g)
  return state.res
}

/**
 * 개발 중 검사 — 기록이 문자열과 맞는가: 칸마다 기록 수가 칸 수와 같고, 조각 끝이 늘어나며 문자열 안이고, 조각마다 'M' 으로 시작한다.
 * 기록이 칸 문자열 전체를 덮어야 하는 곳(full: 세계 지도·깊은 확대 칸의 세계 지도 몫)은 마지막 끝이 문자열 길이와 같다.
 * 개발 서버의 ?glyphcheck 가 부른다 (ZendikarMap.tsx). 문제를 글로 낸다
 */
export function spanProblems(t: TerrainLayers, full: boolean): string[] {
  const out: string[] = []
  const tiles = (name: string, arr: readonly string[]) => {
    const spans = tileSpans.get(arr)
    if (!spans) return full && arr.some(Boolean) && out.push(`${name}: 기록이 없다`)
    if (spans.length !== arr.length) return out.push(`${name}: 칸 ${arr.length} 개에 기록 ${spans.length} 개`)
    arr.forEach((d, i) => {
      const s = spans[i]
      if (!s) {
        if (full && d) out.push(`${name}[${i}]: 기록 없는 칸`)
        return
      }
      let prev = 0
      for (let j = 0; j < s.end.length; j++) {
        const e = s.end[j]
        if (e <= prev || e > d.length || d[prev] !== 'M') return out.push(`${name}[${i}] 조각 ${j}: ${prev}..${e} / ${d.length} '${d.slice(prev, prev + 12)}'`)
        prev = e
      }
      if (full && prev !== d.length) out.push(`${name}[${i}]: 기록이 ${prev} 까지, 문자열은 ${d.length}`)
    })
  }
  tiles('crowns', t.trees.crowns)
  tiles('trunks', t.trees.trunks)
  for (const k of ['marsh', 'ice', 'canyons', 'lava', 'tundra', 'frost'] as const) tiles(k, t[k])
  if (t.period) for (const k of ['dust', 'chalk', 'drybed', 'deadwood'] as const) tiles(`period.${k}`, t.period[k])
  t.mountains.forEach((b, i) => {
    const s = bandSpans.get(b)
    if (!s) return full && out.push(`mountains[${i}]: 기록이 없다`)
    const src = [b.fill, b.crystal, b.ridge, b.hatch, b.crystalRidge, b.crystalHatch]
    const off = [0, 0, 0, 0, 0, 0]
    for (let g = 0; g < s.kind.length; g++)
      for (let j = 0; j < 6; j++) {
        const l = s.lens[g * 6 + j]
        if (l && src[j][off[j]] !== 'M') return out.push(`mountains[${i}] 봉우리 ${g} 문자열 ${j}: '${src[j].slice(off[j], off[j] + 12)}'`)
        off[j] += l
      }
    if (full && off.some((o, j) => o !== src[j].length)) out.push(`mountains[${i}]: 기록 끝 ${off.join(',')}`)
  })
  return out
}
