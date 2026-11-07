// 시점별 바탕 (S6, docs/pixel-plan.md) — 시점의 단계마다 바탕과 다른 몫(scripts/pixel/periods.mjs 가 지금 지도의 페이즈 바탕 엔진에서 뽑은 virtual:pixel-period-<단계>)을
// 풀어 바탕 지형(Decoded)에 얹는다. 칸 종류(흰 가루·백악·죽은 금속·죽은 숲·물이 빠진 바닥·마른 강바닥)는 rasterRegion 이 칸을 채울 때(addPeriodKinds),
// 흩뿌린 기호의 빠짐·더함과 숨긴 단애, 그 무렵의 한 점 기호는 paintTerrain 이 (terrain.ts).
// 바탕과 같은 자리는 바탕과 같은 바이트다 — 기호를 솎는 차례도 바탕의 솎은 목록에서 빠진 것만 빼고 더한 것만 끼워(되퍼지지 않게) 바탕 타일과 이음매가 없다.
import type { Ring } from '../../map/geometry.ts'
import { fillRing, type Grid, type Region } from './fill.ts'

/** 칸 종류 — terrain.ts 의 RIVER_WIDE 뒤 */
export const DUST = 8
export const CHALK = 9
export const METAL = 10
/** 죽은 숲 (숲이던 칸 — 지금 지도의 죽은 숲 덧칠) */
export const DEAD = 11
/** 물이 빠진 내해의 바닥 — 물도 땅도 아니다 (강은 옛 물가에서 끝나고, 옛 물가의 땅 칸은 해안선으로 남는다) */
export const DRYBED = 12
/** 마른 강바닥은 칸 종류가 아니다 — 그 밑의 땅(백악·흰 가루 …)을 그대로 두고 그 위에 점선으로 (terrain.ts 의 paintTerrain, S6 검토) */

/** scripts/pixel/periods.mjs 의 worker 몫 */
export interface PixelPeriod {
  v: number
  level: number
  glyphs: { drop: number[]; add: number[] }
  fine: { drop: number[]; add: number[] }
  lineDrop: number[]
  hatchDrop: number[]
  gorgeDrop: number[]
  world: PeriodGeomRaw
  deep: PeriodGeomRaw
  craze: number
  rivers: { id: string; p: number[]; w: number[]; dry: number }[]
  marks: PeriodMarkRaw[]
}

interface WashesRaw {
  clear: number[][]
  keep: number[][]
  dust: number[][]
  chalk: number[][]
  metal: number[][]
  tint: number[][]
  bands: { fill: number[][]; ink: number[][] }[]
}
interface PeriodGeomRaw {
  washes?: WashesRaw
  basin?: { floor: number[][]; pools: number[][] }
}
export interface PeriodMarkRaw {
  id: string
  k: string
  x: number
  y: number
  s: number
  a: number
  /** 큰 기호의 그림 몫 — c 는 지금 지도의 .lm-<c>, f 1 이면 칠(고리), 0 이면 선(꺾은선) */
  parts?: { c: string; f: number; p: number[][] }[]
}

export interface PeriodGeom {
  clear: Ring[]
  keep: Ring[]
  dust: Ring[]
  chalk: Ring[]
  metal: Ring[]
  tint: Ring[]
  bands: { fill: Ring[]; ink: [number, number][][] }[]
  floor: Ring[]
  pools: Ring[]
}

export interface VectorPart {
  c: string
  fill: boolean
  paths: [number, number][][]
}

export interface PeriodDecoded {
  level: number
  /** 바탕에서 빠진 흩뿌린 기호 — `종류:x10:y10` */
  drop: Set<string>
  fineDrop: Set<string>
  /** 더한 기호 (terrain.ts 가 Item 으로 푼다) — [종류 번호, x10, y10] */
  add: number[]
  fineAdd: number[]
  lineDrop: Set<number>
  /** 빗금마다 건너뛰나 (차례 번호는 바탕 그대로 센다 — 솎는 간격이 바뀌지 않게) */
  hatchSkip: Uint8Array
  gorgeDrop: Set<number>
  world: PeriodGeom
  deep: PeriodGeom
  rivers: { id: string; pts: [number, number][]; w: number[]; dry: boolean }[]
  marks: { id: string; kind: string; x: number; y: number; angle: number; size: number; parts?: VectorPart[] }[]
}

const pairs = (p: readonly number[]): [number, number][] => {
  const out: [number, number][] = []
  let x = 0
  let y = 0
  for (let i = 0; i < p.length; i += 2) {
    x += p[i]
    y += p[i + 1]
    out.push([x / 10, y / 10])
  }
  return out
}

const geomOf = (g: PeriodGeomRaw | undefined): PeriodGeom => {
  const w = g?.washes
  const rings = (l: number[][] | undefined) => (l ?? []).map(pairs)
  return {
    clear: rings(w?.clear),
    keep: rings(w?.keep),
    dust: rings(w?.dust),
    chalk: rings(w?.chalk),
    metal: rings(w?.metal),
    tint: rings(w?.tint),
    bands: (w?.bands ?? []).map((b) => ({ fill: rings(b.fill), ink: rings(b.ink) })),
    floor: rings(g?.basin?.floor),
    pools: rings(g?.basin?.pools),
  }
}

const keysOf = (kinds: readonly string[], g: readonly number[]) => {
  const s = new Set<string>()
  for (let i = 0; i < g.length; i += 3) s.add(`${kinds[g[i]]}:${g[i + 1]}:${g[i + 2]}`)
  return s
}

/** 단계 하나를 푼다 — kinds 는 바탕 조각의 기호 종류 이름 (같은 차례) */
export function decodePeriod(p: PixelPeriod, kinds: readonly string[], hatchCount: number): PeriodDecoded {
  if (p.v !== 1) throw new Error(`virtual:pixel-period-${p.level} 의 꼴(v${p.v})을 모른다`)
  const hatchSkip = new Uint8Array(hatchCount)
  for (const n of p.hatchDrop) hatchSkip[n] = 1
  return {
    level: p.level,
    drop: keysOf(kinds, p.glyphs.drop),
    fineDrop: keysOf(kinds, p.fine.drop),
    add: p.glyphs.add,
    fineAdd: p.fine.add,
    lineDrop: new Set(p.lineDrop),
    hatchSkip,
    gorgeDrop: new Set(p.gorgeDrop),
    world: geomOf(p.world),
    deep: geomOf(p.deep),
    rivers: p.rivers.map((r) => {
      let w = 0
      return { id: r.id, pts: pairs(r.p), w: r.w.map((v) => (w += v) / 100), dry: r.dry === 1 }
    }),
    marks: p.marks.map((m) => ({
      id: m.id,
      kind: m.k,
      x: m.x / 10,
      y: m.y / 10,
      angle: m.a,
      size: m.s,
      parts: m.parts?.map((part) => ({ c: part.c, fill: part.f === 1, paths: part.p.map(pairs) })),
    })),
  }
}

interface WEdge {
  r0: number
  r1: number
  x0: number
  y0: number
  dxdy: number
  /** 감기 방향 (+1 아래로, -1 위로) */
  w: number
}
const wedgeCache = new WeakMap<Ring, Map<number, WEdge[]>>()
function wedgesOf(ring: Ring, g: Grid): WEdge[] {
  let byU = wedgeCache.get(ring)
  if (!byU) wedgeCache.set(ring, (byU = new Map()))
  const hit = byU.get(g.u)
  if (hit) return hit
  const out: WEdge[] = []
  for (let i = 0; i < ring.length; i++) {
    const [ax, ay] = ring[i]
    const [bx, by] = ring[(i + 1) % ring.length]
    if (ay === by) continue
    const down = ay < by
    const [lx, ly, hx, hy] = down ? [ax, ay, bx, by] : [bx, by, ax, ay]
    const r0 = Math.ceil(ly / g.u - 0.5)
    const r1 = Math.ceil(hy / g.u - 0.5) - 1
    if (r1 < r0) continue
    out.push({ r0, r1, x0: lx, y0: ly, dxdy: (hx - lx) / (hy - ly), w: down ? 1 : -1 })
  }
  byU.set(g.u, out)
  return out
}

/**
 * 고리들을 한 path 처럼 0 이 아닌 감기 수로 채운다 — 지금 지도의 칠(SVG 의 fill-rule nonzero)과 같다:
 * 죽은 숲 덧칠처럼 바깥 고리와 반대로 도는 구멍(살아남은 숲)은 비고, 같은 쪽으로 도는 겹친 고리는 합쳐진다 (S6 검토 — 고리마다 따로 채우면 구멍까지 칠했다)
 */
const fillAll = (rings: readonly Ring[], g: Grid, region: Region, paint: (i: number) => void) => {
  if (!rings.length) return
  if (rings.length === 1) return fillRing(rings[0], g, region, paint)
  const { x0: rx, y0: ry, w: rw, h: rh } = region
  const rEnd = ry + rh - 1
  const edges = rings.flatMap((r) => wedgesOf(r, g)).filter((e) => e.r1 >= ry && e.r0 <= rEnd)
  if (!edges.length) return
  const xs: [number, number][] = []
  const cEnd = rx + rw - 1
  for (let r = ry; r <= rEnd; r++) {
    const yc = (r + 0.5) * g.u
    xs.length = 0
    for (const e of edges) if (e.r0 <= r && e.r1 >= r) xs.push([e.x0 + (yc - e.y0) * e.dxdy, e.w])
    if (xs.length < 2) continue
    xs.sort((a, b) => a[0] - b[0])
    const row = (r - ry) * rw
    let wn = 0
    for (let k = 0; k + 1 < xs.length; k++) {
      wn += xs[k][1]
      if (wn === 0) continue
      const c0 = Math.max(rx, Math.ceil(xs[k][0] / g.u - 0.5))
      const c1 = Math.min(cEnd, Math.ceil(xs[k + 1][0] / g.u - 0.5) - 1)
      for (let c = c0; c <= c1; c++) paint(row + c - rx)
    }
  }
}

/** 땅으로 보는 칸 (그 무렵의 칠이 덮는 칸) */
const paintable = (k: number) => k === 1 || k === 2 || k === DEAD

/**
 * 칸 종류에 그 무렵의 바탕을 더한다 — terrain.ts 의 addTerrainKinds 가 채색 영역 뒤, 협곡 바닥·강 앞에 부른다.
 * 차례: 물 빼기(내해 → 마른 바닥, 남은 물은 다시 물) → 죽은 숲 덧칠(숲 → 죽은 숲) → 칠이 숲을 걷음(clear − keep, 숲 → 땅) → 흰 가루·백악(띠 포함)·죽은 금속.
 * 지금 지도(ZendikarMap 의 칠 차례·period.ts 의 washAt — 겹치면 흰 가루 → 백악 → 죽은 금속 차례로 위)와 같은 몫이다
 */
export function addPeriodKinds(p: PeriodDecoded, grid: Grid, region: Region, kind: Uint8Array): void {
  const geo = grid.u >= 1 ? p.world : p.deep
  fillAll(geo.floor, grid, region, (i) => kind[i] === 3 && (kind[i] = DRYBED))
  fillAll(geo.pools, grid, region, (i) => kind[i] === DRYBED && (kind[i] = 3))
  fillAll(geo.tint, grid, region, (i) => kind[i] === 2 && (kind[i] = DEAD))
  if (geo.clear.length) {
    // clear 안이고 keep 밖인 숲 — keep 을 먼저 표시해 둔다
    const keep = new Uint8Array(kind.length)
    fillAll(geo.keep, grid, region, (i) => (keep[i] = 1))
    fillAll(geo.clear, grid, region, (i) => kind[i] === 2 && !keep[i] && (kind[i] = 1))
  }
  fillAll(geo.dust, grid, region, (i) => paintable(kind[i]) && (kind[i] = DUST))
  fillAll(geo.chalk, grid, region, (i) => (paintable(kind[i]) || kind[i] === DUST) && (kind[i] = CHALK))
  for (const b of geo.bands) fillAll(b.fill, grid, region, (i) => (paintable(kind[i]) || kind[i] === DUST) && (kind[i] = CHALK))
  fillAll(geo.metal, grid, region, (i) => (paintable(kind[i]) || kind[i] === DUST || kind[i] === CHALK) && (kind[i] = METAL))
}
