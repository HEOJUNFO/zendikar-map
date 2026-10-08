// 깊은 확대의 지형 기호 — 배율이 두 배가 될 때마다(tier 하나) 기호를 반 크기·반 간격으로 다시 뿌린다.
// 세계 지도 배율(terrain.ts 의 buildTerrain)과 같은 규칙을 쓰고, 지도 칸마다 보이는 곳만 조금씩 만들어 둔다.
// 기호가 화면에서 늘 비슷한 크기(산 40~80px)라, 확대할수록 같은 땅에 기호가 더 많이 들어선다.
import { useEffect, useMemo, useState } from 'react'
import { deepRings, MAP_HEIGHT, MAP_WIDTH } from './geo'
import { pointInRing, type Bounds } from './geometry'
import { getTerrainRaster } from './raster'
import { buildTerrain, type TerrainGeo, type TerrainInput, type TerrainLayers } from './terrain'
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

/** 지역 상세가 맡은 자리 — 그 자리에는 세계 지도의 기호를 뿌리지 않는다 (단계마다 다르다: 지역 상세는 그 배율부터 나온다) */
export type ClaimedFor = (level: number) => ((x: number, y: number) => boolean) | undefined

function buildTile(input: TerrainInput, level: number, tx: number, ty: number, claimed: ClaimedFor | undefined): TerrainLayers {
  const g = fineScale(level)
  const size = BASE_TILE * g
  const region = { x0: tx * size, y0: ty * size, x1: (tx + 1) * size, y1: (ty + 1) * size }
  // 땅도 영역도 닿지 않는 바다 칸은 비워 둔다
  const d = deepRings()
  const overlaps = (b: Bounds) => b.x1 > region.x0 && b.x0 < region.x1 && b.y1 > region.y0 && b.y0 < region.y1
  if (!d.landBounds.some(overlaps) && !input.patches.some((p) => overlaps(p.bounds))) return EMPTY
  return buildTerrain(input, { g, region, seed: `fine:${level}:${tx}:${ty}`, geo: exactGeo(), claimed: claimed?.(level) })
}

/** 한 번에 만드는 시간 (ms) — 넘으면 다음 틈에 이어서 */
const BUDGET_MS = 10
/** 기억해 둘 칸 수 — 넘으면 오래 안 쓴 칸부터 버린다 */
const CACHE_TILES = 600

/** 만든 칸 — 지형 입력(바탕 데이터가 바뀌면 새로)과 지역 상세 자리마다 따로 */
const NO_CLAIM: ClaimedFor = () => undefined
const caches = new WeakMap<TerrainInput, WeakMap<ClaimedFor, Map<string, TerrainLayers>>>()
function cacheFor(input: TerrainInput, claimed: ClaimedFor): Map<string, TerrainLayers> {
  let byClaim = caches.get(input)
  if (!byClaim) caches.set(input, (byClaim = new WeakMap()))
  let tiles = byClaim.get(claimed)
  if (!tiles) byClaim.set(claimed, (tiles = new Map()))
  return tiles
}

/**
 * 보이는 곳(area)의 잘게 뿌린 칸들 — 없는 칸은 화면 가운데에 가까운 것부터 틈틈이 만들어, 다 되는 대로 그린다.
 * level 0 이면 빈 목록 (세계 지도의 기호를 쓴다)
 */
export function useFineTerrain(input: TerrainInput, level: number, area: Bounds, claimed: ClaimedFor = NO_CLAIM): FineTile[] {
  const [version, setVersion] = useState(0)

  const wanted = useMemo(() => {
    if (level === 0) return []
    const size = BASE_TILE * fineScale(level)
    const x0 = Math.floor(Math.max(area.x0, -BASE_TILE) / size)
    const y0 = Math.floor(Math.max(area.y0, -BASE_TILE) / size)
    const x1 = Math.floor(Math.min(area.x1, MAP_WIDTH + BASE_TILE) / size)
    const y1 = Math.floor(Math.min(area.y1, MAP_HEIGHT + BASE_TILE) / size)
    const cx = (area.x0 + area.x1) / 2 / size
    const cy = (area.y0 + area.y1) / 2 / size
    const out: { key: string; tx: number; ty: number; d: number }[] = []
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++) out.push({ key: `${level}:${tx}:${ty}`, tx, ty, d: (tx + 0.5 - cx) ** 2 + (ty + 0.5 - cy) ** 2 })
    return out.sort((a, b) => a.d - b.d)
  }, [level, area.x0, area.y0, area.x1, area.y1])

  useEffect(() => {
    const store = cacheFor(input, claimed)
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
        store.set(w.key, buildTile(input, level, w.tx, w.ty, claimed))
        made++
      }
      // 오래된 칸 버리기 — Map 은 넣은 차례라 앞에서부터
      while (store.size > CACHE_TILES) store.delete(store.keys().next().value!)
      if (cancelled) return
      if (made) setVersion((v) => v + 1)
      if (missing.length) timer = window.setTimeout(work, 0)
    }
    timer = window.setTimeout(work, 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [wanted, level, input, claimed])

  return useMemo(() => {
    void version
    const store = cacheFor(input, claimed)
    const out: FineTile[] = []
    for (const w of wanted) {
      const layers = store.get(w.key)
      if (layers && layers !== EMPTY) {
        // 쓴 칸은 뒤로 — 오래 안 쓴 칸부터 버리게
        store.delete(w.key)
        store.set(w.key, layers)
        out.push({ key: w.key, layers })
      }
    }
    return out
  }, [wanted, version, input, claimed])
}
