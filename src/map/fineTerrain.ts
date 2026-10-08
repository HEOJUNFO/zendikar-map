// 깊은 확대의 지형 기호 — 배율이 두 배가 될 때마다(tier 하나) 기호를 반 크기·반 간격으로 다시 뿌린다.
// 세계 지도 배율(terrain.ts 의 buildTerrain)과 같은 규칙을 쓰고, 지도 칸마다 보이는 곳만 조금씩 만들어 둔다.
// 기호가 화면에서 늘 비슷한 크기(산 40~80px)라, 확대할수록 같은 땅에 기호가 더 많이 들어선다.
import { useLayoutEffect, useMemo, useState } from 'react'
import { deepRings, MAP_HEIGHT, MAP_WIDTH } from './geo'
import { pointInRing, type Bounds } from './geometry'
import { getTerrainRaster } from './raster'
import type { FineOverlay } from './childDetail'
import { buildTerrain, type MountainBand, type TerrainGeo, type TerrainInput, type TerrainLayers } from './terrain'
import { DEEP_TIER } from './useMapZoom'

/** 가장 잘게 뿌리는 단계 — 기호가 세계 지도의 1/32 */
export const MAX_FINE_LEVEL = 5
/** 세계 지도 배율의 칸 (terrain.ts 의 TILE 과 같다) — 단계 L 의 칸은 이 길이 × 2^-L */
const BASE_TILE = 200

/** tier 의 단계 — DEEP_TIER 부터 1, 2, … (그 아래는 0: 세계 지도의 기호) */
export const fineLevelFor = (tier: number) => (tier < DEEP_TIER ? 0 : Math.min(MAX_FINE_LEVEL, tier - DEEP_TIER + 1))
export const fineScale = (level: number) => 2 ** -level

/** 해안까지 정확히 재는 거리 — 이보다 먼 곳은 래스터(2 단위 격자)로 충분하다 */
const NEAR = 12

let exact: TerrainGeo | null = null
/**
 * 정확한 땅·물 판정 — 깊은 배율에서는 2 단위 격자 한 칸이 화면 수십 px 라, 기호가 해안·숲 가장자리에서 칸 모양으로 들쭉날쭉해진다.
 * 깊은 배율의 해안(deepRings)에 맞춰 다각형으로 판정하고, 해안까지 거리는 가까운 곳만 선분으로 잰다
 */
function exactGeo(): TerrainGeo {
  if (exact) return exact
  const raster = getTerrainRaster()
  const d = deepRings()
  const inB = (b: Bounds, x: number, y: number) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1
  // 해안 선분 격자 (칸 = NEAR)
  const cells = new Map<number, number[]>()
  const segs: number[] = []
  const key = (cx: number, cy: number) => (cy + 1000) * 100000 + cx + 1000
  d.lands.forEach((ring) => {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [ax, ay] = ring[j]
      const [bx, by] = ring[i]
      const s = segs.length
      segs.push(ax, ay, bx, by)
      for (let cx = Math.floor(Math.min(ax, bx) / NEAR); cx <= Math.floor(Math.max(ax, bx) / NEAR); cx++)
        for (let cy = Math.floor(Math.min(ay, by) / NEAR); cy <= Math.floor(Math.max(ay, by) / NEAR); cy++) {
          const k = key(cx, cy)
          const list = cells.get(k)
          if (list) list.push(s)
          else cells.set(k, [s])
        }
    }
  })
  const nearCoast = (x: number, y: number) => {
    let best = NEAR
    const cx = Math.floor(x / NEAR)
    const cy = Math.floor(y / NEAR)
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const s of cells.get(key(cx + dx, cy + dy)) ?? []) {
          const ax = segs[s]
          const ay = segs[s + 1]
          const ex = segs[s + 2] - ax
          const ey = segs[s + 3] - ay
          const len = ex * ex + ey * ey
          const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / len))
          const dist = Math.hypot(x - (ax + t * ex), y - (ay + t * ey))
          if (dist < best) best = dist
        }
    return best
  }
  // 한 자리를 여러 판정이 잇달아 묻는다 — 마지막 자리의 땅 판정을 기억한다
  let lx = NaN
  let ly = NaN
  let li = -1
  const landAt = (x: number, y: number) => {
    if (x === lx && y === ly) return li
    lx = x
    ly = y
    li = -1
    for (let i = 0; i < d.lands.length; i++) {
      if (inB(d.landBounds[i], x, y) && pointInRing(x, y, d.lands[i])) {
        li = i
        break
      }
    }
    return li
  }
  exact = {
    landAt,
    coastDistance: (x, y) => {
      if (landAt(x, y) < 0) return 0
      const rd = raster.coastDistance(x, y)
      if (rd > NEAR + 2) return rd
      const near = nearCoast(x, y)
      return near < NEAR ? near : Math.max(NEAR, rd)
    },
    forestAt: (x, y) => d.forests.some((r, i) => inB(d.forestBounds[i], x, y) && pointInRing(x, y, r)),
    waterAt: (x, y) => d.inland.some((r, i) => inB(d.inlandBounds[i], x, y) && pointInRing(x, y, r)),
    landDepth: (i) => raster.landDepth(i),
  }
  return exact
}

/** 잘게 뿌린 지도 칸 하나 — 기호 path 는 기호 공간(지도 단위 ÷ g) */
export interface FineTile {
  key: string
  layers: TerrainLayers
}

const EMPTY: TerrainLayers = {
  mountains: [],
  trees: { crowns: [], trunks: [] },
  marsh: [],
  ice: [],
  cliffs: [],
  waterCliffs: [],
  canyons: [],
  lava: [],
  tundra: [],
  frost: [],
  gorgeFloors: '',
}

/** 세계 지도 기호에 지역 상세의 기호를 더한다 — 산 띠는 같은 띠끼리 잇는다 (앞뒤 가림이 칸 안에서 맞게) */
function merge(base: TerrainLayers, extras: TerrainLayers[]): TerrainLayers {
  if (!extras.length) return base
  const all = [base, ...extras]
  const bands = new Map<number, MountainBand>()
  for (const band of all.flatMap((t) => t.mountains)) {
    const cur = bands.get(band.key)
    if (!cur) bands.set(band.key, { ...band })
    else
      bands.set(band.key, {
        key: band.key,
        fill: cur.fill + band.fill,
        crystal: cur.crystal + band.crystal,
        ridge: cur.ridge + band.ridge,
        hatch: cur.hatch + band.hatch,
        crystalRidge: cur.crystalRidge + band.crystalRidge,
        crystalHatch: cur.crystalHatch + band.crystalHatch,
      })
  }
  const cat = (pick: (t: TerrainLayers) => string[]) => all.flatMap(pick)
  return {
    ...base,
    mountains: [...bands.values()].sort((a, b) => a.key - b.key),
    trees: { crowns: cat((t) => t.trees.crowns), trunks: cat((t) => t.trees.trunks) },
    marsh: cat((t) => t.marsh),
    ice: cat((t) => t.ice),
    canyons: cat((t) => t.canyons),
    lava: cat((t) => t.lava),
    tundra: cat((t) => t.tundra),
    frost: cat((t) => t.frost),
  }
}

function buildTile(input: TerrainInput, level: number, tx: number, ty: number, overlay: FineOverlay | undefined): TerrainLayers {
  const g = fineScale(level)
  const size = BASE_TILE * g
  const region = { x0: tx * size, y0: ty * size, x1: (tx + 1) * size, y1: (ty + 1) * size }
  const seed = `fine:${level}:${tx}:${ty}`
  const extras = overlay?.extraFor(level, g, region, seed) ?? []
  // 땅도 영역도 지역 상세도 닿지 않는 바다 칸은 비워 둔다
  const d = deepRings()
  const overlaps = (b: Bounds) => b.x1 > region.x0 && b.x0 < region.x1 && b.y1 > region.y0 && b.y0 < region.y1
  if (!extras.length && !d.landBounds.some(overlaps) && !input.patches.some((p) => overlaps(p.bounds))) return EMPTY
  const world = buildTerrain(input, { g, region, seed, geo: exactGeo(), claimed: overlay?.claimedFor(level) })
  return merge(world, extras)
}

/** 한 번에 만드는 시간 (ms) — 넘으면 다음 틈에 이어서 */
const BUDGET_MS = 10
/** 기억해 둘 칸 수 — 넘으면 오래 안 쓴 칸부터 버린다 */
const CACHE_TILES = 600

/** 만든 칸 — 지형 입력(바탕 데이터가 바뀌면 새로)과 지역 상세 얹기(그림이 더 오면 새로)마다 따로 */
const NO_OVERLAY: FineOverlay = { claimedFor: () => undefined, extraFor: () => [] }
const caches = new WeakMap<TerrainInput, WeakMap<FineOverlay, Map<string, TerrainLayers>>>()
function cacheFor(input: TerrainInput, overlay: FineOverlay): Map<string, TerrainLayers> {
  let byOverlay = caches.get(input)
  if (!byOverlay) caches.set(input, (byOverlay = new WeakMap()))
  let tiles = byOverlay.get(overlay)
  if (!tiles) byOverlay.set(overlay, (tiles = new Map()))
  return tiles
}

/** 단계 level 에서 그릴 범위(area)에 드는 칸 — 화면 가운데에 가까운 것부터 */
interface Want {
  key: string
  tx: number
  ty: number
  d: number
}
function tilesFor(level: number, area: Bounds): Want[] {
  if (level === 0) return []
  const size = BASE_TILE * fineScale(level)
  const x0 = Math.floor(Math.max(area.x0, -BASE_TILE) / size)
  const y0 = Math.floor(Math.max(area.y0, -BASE_TILE) / size)
  const x1 = Math.floor(Math.min(area.x1, MAP_WIDTH + BASE_TILE) / size)
  const y1 = Math.floor(Math.min(area.y1, MAP_HEIGHT + BASE_TILE) / size)
  const cx = (area.x0 + area.x1) / 2 / size
  const cy = (area.y0 + area.y1) / 2 / size
  const out: Want[] = []
  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++) out.push({ key: `${level}:${tx}:${ty}`, tx, ty, d: (tx + 0.5 - cx) ** 2 + (ty + 0.5 - cy) ** 2 })
  return out.sort((a, b) => a.d - b.d)
}

/** 새 단계 칸을 기다리는 동안 세계 지도의 기호로 메워도 되는 단계 — 더 깊으면 기호 크기가 너무 달라 되는 대로 그린다 */
const WORLD_FALLBACK_MAX = 2

/**
 * 그릴 범위(area)의 잘게 뿌린 칸들 — 없는 칸은 화면 가운데에 가까운 것부터 틈틈이 만든다.
 * 단계가 바뀌면 새 단계 칸이 그릴 범위를 다 채울 때까지 다른 것으로 메운다 — 새 단계 칸은 처음엔 하나도 없어,
 * 바로 바꾸면 땅의 기호가 몇 프레임 통째로 사라졌다 나온다(깜박임).
 *  - 확대해 들어왔으면 앞 단계(더 굵어 새 범위를 덮는다)의 만들어 둔 칸, 0 이면 세계 지도의 기호
 *  - 축소했거나 멀리 옮겨 앞 단계가 덮지 못하면, 만들어 둔 칸으로 덮이는 더 굵은 단계, 그것도 없으면 얕은 단계에서만 세계 지도의 기호
 *  - 그래도 없으면 예전처럼 새 단계 칸을 되는 대로 (첫 묶음은 그리기 전에 만들어 가운데부터 차 있다)
 * 반환 level: 지금 그리는 단계 (0 이면 세계 지도의 기호를 쓴다)
 */
export function useFineTerrain(
  input: TerrainInput,
  level: number,
  area: Bounds,
  overlay: FineOverlay = NO_OVERLAY,
): { level: number; tiles: FineTile[] } {
  const [version, setVersion] = useState(0)
  // 지역 상세 그림이 더 오면 얹기(overlay)가 새로 되어 칸을 다시 만든다 — 그동안 앞 얹기로 만든 같은 칸을 그대로 보여 빈 땅이 깜박이지 않게
  // 앞 얹기는 몇 개 둔다 — 칸을 기다리는 동안 그림이 잇달아 와도 앞 단계 칸을 잃지 않게 (메우는 중에는 버리지 않는다)
  const [overlays, setOverlays] = useState<{ cur: FineOverlay; prev: FineOverlay[] }>({ cur: overlay, prev: [] })
  // 그리고 있는 단계 — 새 단계가 화면을 다 채울 수 있을 때 넘어간다
  const [shown, setShown] = useState(0)
  // 얹기가 바뀐 이번 그리기에서도 앞 얹기(지금 화면의 칸이 든 것)를 함께 본다 — 빠뜨리면 메우던 것을 잃은 줄 안다
  const prev = overlays.cur === overlay ? overlays.prev : [overlays.cur, ...overlays.prev].slice(0, shown === level ? 3 : 8)
  if (overlays.cur !== overlay) setOverlays({ cur: overlay, prev })

  const { x0, y0, x1, y1 } = area
  const wanted = useMemo(() => tilesFor(level, { x0, y0, x1, y1 }), [level, x0, y0, x1, y1])

  const store = cacheFor(input, overlay)
  const olds = useMemo(() => prev.filter((o) => o !== overlay).map((o) => cacheFor(input, o)), [prev, overlay, input])

  // 무엇을 그릴지 — 칸이 만들어질 때마다(version) 다시 본다
  const show = useMemo(() => {
    void version
    const get = (key: string) => store.has(key) || olds.some((o) => o.has(key))
    const covers = (lv: number) => lv === 0 || tilesFor(lv, area).every((w) => get(w.key))
    // 같은 단계를 그리던 중이면(옮기며 가장자리 칸만 모자라다) 그대로 되는 대로 — 메우면 화면 전체 기호 크기가 잠깐 바뀐다
    if (shown === level || wanted.every((w) => get(w.key))) return level
    // 확대해 들어왔으면 앞 단계 — 세계 지도의 기호(0)는 얕은 단계에서만 (깊으면 기호가 너무 커서)
    if (shown < level && (shown > 0 || level <= WORLD_FALLBACK_MAX) && covers(shown)) return shown
    // 더 굵은 단계 가운데 만들어 둔 칸으로 덮이는 것 (만들지는 않는다)
    let lv = level - 1
    while (lv > 0 && !covers(lv)) lv--
    return lv > 0 || level <= WORLD_FALLBACK_MAX ? lv : level
  }, [version, store, olds, area, shown, level, wanted])
  if (show !== shown) setShown(show)

  // 그리는 칸 — 메우는 동안은 칸이 더 만들어져도 그대로라(version 을 보지 않는다) 지형 기호를 다시 그리지 않는다
  const tilesVersion = show === level ? version : -1
  const tiles = useMemo(() => {
    void tilesVersion
    const list = show === level ? wanted : tilesFor(show, area)
    const out: FineTile[] = []
    for (const w of list) {
      let layers = store.get(w.key)
      if (layers) {
        // 쓴 칸은 뒤로 — 오래 안 쓴 칸부터 버리게
        store.delete(w.key)
        store.set(w.key, layers)
      } else
        for (const o of olds) {
          layers = o.get(w.key)
          if (layers) break
        }
      if (layers && layers !== EMPTY) out.push({ key: w.key, layers })
    }
    return out
  }, [tilesVersion, show, level, wanted, area, store, olds])

  // 지금 얹기만으로 다 차면 앞 얹기들은 놓아 준다
  if (overlays.prev.length && overlays.cur === overlay && wanted.every((w) => store.has(w.key))) setOverlays((o) => ({ cur: o.cur, prev: [] }))

  // 없는 칸 만들기 — 화면 가운데에 가까운 것부터 틈틈이. 이 단계를 바로 그리는데 어느 얹기에도 만들어 둔 칸이 하나도 없으면
  // (메울 것이 없다) 첫 묶음은 그리기 전에 만든다 (layout effect) — 화면 가운데는 첫 프레임부터 차 있게
  const drawsLevel = show === level
  useLayoutEffect(() => {
    const missing = wanted.filter((w) => !store.has(w.key))
    if (!missing.length) return
    let cancelled = false
    let timer = 0
    const work = () => {
      const start = performance.now()
      let made = 0
      while (missing.length && performance.now() - start < BUDGET_MS) {
        const w = missing.shift()!
        if (store.has(w.key)) continue
        store.set(w.key, buildTile(input, level, w.tx, w.ty, overlay))
        made++
      }
      // 오래된 칸 버리기 — Map 은 넣은 차례라 앞에서부터
      while (store.size > CACHE_TILES) store.delete(store.keys().next().value!)
      if (cancelled) return
      if (made) setVersion((v) => v + 1)
      if (missing.length) timer = window.setTimeout(work, 0)
    }
    // 가운데 칸(wanted 는 가운데부터)이 어느 얹기에도 없으면
    const c = wanted[0].key
    const nothing = !store.has(c) && !olds.some((o) => o.has(c))
    if (drawsLevel && nothing) work()
    else timer = window.setTimeout(work, 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [wanted, level, input, overlay, store, olds, drawsLevel])

  return { level: show, tiles }
}
