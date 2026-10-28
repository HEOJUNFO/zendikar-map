// 세계 지도 지형 기호가 그림 이름을 비켜 준다 — 기호를 다 뿌린 뒤, 그 배율 단계(tier)에 자리를 받은 그림 이름 상자에 걸리는 기호만 하나씩 뺀다.
// 뿌리는 입력(씨앗·자리 판정)은 건드리지 않는다 — 이름 상자를 뿌리기에 넣으면 대륙 기호가 통째로 다시 뿌려진다(CLAUDE.md).
// 페이즈 바탕(period)의 '기호는 만든 뒤 빼거나 더해 나머지 기호의 자리를 지킨다'와 같은 셈이라, 남은 기호의 자리·모양·차례는 그대로다.
//
// 기호의 자리 기록(span): 칸(tiler) 문자열과 산 띠 문자열을 만들 때 조각마다 그 기호의 종류·밑동 자리·끝을 적어 둔다 (문자열은 바뀌지 않는다).
// 같은 기호의 조각(수관과 줄기, 맹그로브의 수관·뿌리·물결)은 종류·자리가 같아 늘 함께 빠진다.
// 페이즈 바탕을 다시 이은 지형(periodTerrain.ts 의 replayTerrain)과 깊은 확대 칸(fineTerrain.ts)도 같은 기록을 이어 받는다.
// 지역 상세의 기호(childDetail.ts 의 detailTerrain)는 기록이 없어 빼지 않는다 — 지역 상세는 제 빈터로 이름 자리를 비운다.
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
}

export const NO_HOLES: GlyphHoles = { boxes: [], cell: 1, within: () => [] }

/** 상자들 → 비울 자리. cell: 격자 칸 (지도 단위) */
export function glyphHoles(boxes: readonly HoleBox[], cell: number): GlyphHoles {
  if (!boxes.length) return NO_HOLES
  const cells = new Map<number, HoleBox[]>()
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
 * 곡선은 조절점까지, 호는 그 지름의 원까지 넣어 넉넉히 잡는다
 */
function addPathExtent(d: string, e: Extent) {
  let cmd = ''
  let args: number[] = []
  let px = 0
  let py = 0
  let qx = NaN
  let qy = NaN
  const put = (x: number, y: number) => {
    if (x < e.x0) e.x0 = x
    if (x > e.x1) e.x1 = x
    if (y < e.y0) e.y0 = y
    if (y > e.y1) e.y1 = y
  }
  const run = () => {
    switch (cmd) {
      case 'M':
      case 'L':
        px = args[0]
        py = args[1]
        put(px, py)
        qx = NaN
        break
      case 'Q':
        put(args[0], args[1])
        qx = args[0]
        qy = args[1]
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
        }
        px = args[0]
        py = args[1]
        put(px, py)
        break
      case 'l':
        px += args[0]
        py += args[1]
        put(px, py)
        qx = NaN
        break
      case 'h':
        px += args[0]
        put(px, py)
        qx = NaN
        break
      case 'a': {
        const ex = px + args[5]
        const ey = py + args[6]
        const r = Math.max(Math.abs(args[0]), Math.hypot(args[5], args[6]) / 2)
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

/** 산 띠에서 같은 일 — 봉우리 하나는 여섯 문자열에 걸쳐 있다 */
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
      for (let j = 0; j < 6; j++) {
        const l = s.lens[i * 6 + j]
        if (e && l) addPathExtent(src[j].slice(off[j], off[j] + l), e)
        off[j] += l
      }
      if (e && extentHits(list, e, g)) hit.add(glyphKey(s.kind[i], s.x[i], s.y[i]))
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

/** 산 띠 — hit 에 든 봉우리를 여섯 문자열에서 함께 뺀다 */
function cutBands(bands: MountainBand[], holes: GlyphHoles, g: number, hit: ReadonlySet<string>): MountainBand[] {
  let out: MountainBand[] | null = null
  bands.forEach((band, bi) => {
    const s = bandSpans.get(band)
    const list = s && bandHoles(s, holes, g)
    if (!s || !list?.length) return
    const n = s.kind.length
    const drop = (i: number) => near(list, s.kind[i], s.x[i], s.y[i], g) && hit.has(glyphKey(s.kind[i], s.x[i], s.y[i]))
    let any = false
    for (let i = 0; i < n && !any; i++) any = drop(i)
    if (!any) return
    const src = [band.fill, band.crystal, band.ridge, band.hatch, band.crystalRidge, band.crystalHatch]
    const res = ['', '', '', '', '', '']
    const off = [0, 0, 0, 0, 0, 0]
    for (let i = 0; i < n; i++) {
      const gone = drop(i)
      for (let j = 0; j < 6; j++) {
        const l = s.lens[i * 6 + j]
        if (!gone) res[j] += src[j].slice(off[j], off[j] + l)
        off[j] += l
      }
    }
    // 기록 뒤에 이어 붙은 것 (깊은 확대의 지역 상세 봉우리) 은 그대로
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
 * 한 기호의 조각(수관·줄기, 맹그로브의 수관·뿌리·물결, 봉우리의 여섯 문자열)은 하나라도 걸리면 함께 뺀다.
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
  const want = area ? holes.within(area.x0, area.y0, area.x1, area.y1) : holes.boxes
  let added = 0
  for (const b of want) {
    const i = holes.boxes.indexOf(b)
    if (!state.on[i]) {
      state.on[i] = 1
      added++
    }
  }
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
