// 페이즈 바탕의 지형 기호 — 단계마다 켠 항목(src/data/periods)을 buildTerrain 이 바로 적용하는 TerrainPhase 로 만든다 (늦게 받는 조각).
// - 범위 풀기: 기존 다각형을 이름으로 가리킨 범위({forest}·{water}·{continent}·{place}·{area})와 새 고리·띠를 앱과 같은 다듬기로 푼다.
//   세계 지도(world)는 geo.ts 의 다듬기, 깊은 확대(deep)는 deepRings 와 chaikin 2 — 지역 상세 작가 도구(scripts/childmaps/periods.mjs)와 같은 모양이다
// - 판정(verdict): 바탕 기호 하나(밑동 점)를 남길지(0)·뺄지(1)·죽은 나무로 그릴지(2). buildTerrain 이 기호 모양을 만든 뒤에 묻는다
// - 더하는 기호(prepare): 그 무렵에만 있던 언덕·수정·늪과 먼지·백악·마른 바닥 무늬. 항목마다 따로 시드하고(`period:<id>`, 칸이면 칸 시드를 붙인다)
//   정적 판정과 바탕 봉우리 자리만 본다 — 다른 항목이 켜졌는지는 만든 뒤에 거른다(출력 판정). 그래서 한 항목의 기호 자리는 어느 단계에서나 같다
// - 다시 잇기(replayTerrain): 세계 지도 축척은 바탕 지형의 기록(terrain.ts 의 terrainLogOf)을 이 판정대로 잘라 다시 잇는다(사용자 결정 D9 의 B).
//   기록이 없으면 period.ts 가 이 페이즈로 buildTerrain 을 다시 돌린다(A — 같은 결과). 깊은 확대 칸은 칸마다 닿는 항목만으로 바로 적용한다
import type { PeriodDrain, PeriodGround, PeriodRelief, PeriodSet, PeriodShape, ScatterKind } from '../data/periods/types'
import { isPlaced, type Continent, type LandmarkGlyph, type Location, type River, type TerrainArea, type TerrainLine } from '../data/types'
import { deepRings, forests, inlandWaterIds, inlandWaters, landmasses } from './geo'
import {
  chaikin,
  chaikinOpen,
  distanceToPolyline,
  hashSeed,
  mulberry32,
  pointInRing,
  poissonDisk,
  polylineToPath,
  resample,
  rightNormals,
  ringBounds,
  ringToPath,
  valueNoise2D,
  type Bounds,
  type Point,
  type Ring,
} from './geometry'
import { buildBlockedMask, shapeRivers, type RiverShape } from './landscape'
import { crystalGlyph, ellipsePath } from './landscapeGlyphs'
import { clipRing } from './periodClip'
import { deadTreeAt, periodGlyphKit } from './periodGlyphs'
import type { PeakGlyph, PhasePlan, TerrainLog, TerrainPhase, TerrainProbe } from './periodTypes'
import { hillGlyph, marshGlyph, terrainProbe, tiler, type MountainBand, type TerrainInput, type TerrainLayers } from './terrain'

/** 어느 다듬기로 풀까 — world: 세계 지도 배율(tier 0–4), deep: 깊은 확대(지역 상세가 그린 모양) */
export type PeriodVariant = 'world' | 'deep'

/** 범위를 풀 때 쓰는 지도 데이터 — 메인 그래프가 넘긴 것(PeriodCtx)에서 */
export interface PeriodSources {
  continents: readonly Continent[]
  locations: readonly Location[]
  areas: readonly TerrainArea[]
  lines: readonly TerrainLine[]
  glyphs: readonly LandmarkGlyph[]
  /** 바탕 강 (막힘 마스크를 숨긴 선 없이 다시 만들 때) */
  riverShapes: readonly RiverShape[]
  /** 장소 표시 자리 (그 무렵의 강이 땅 위에서 끝날 때 표시 앞에서 멈춘다) */
  avoid: readonly Point[]
}

// ---- 범위 풀기 ------------------------------------------------------------------------------------------------

/** 풀린 범위 하나 */
export interface PeriodArea {
  bounds: Bounds
  inside(x: number, y: number): boolean
  /** 칠 고리 path — 방향을 맞춰 nonzero 로 겹쳐 칠하면 합집합 (띠는 '') */
  paint: string
  /** 띠 (자국) — 끝이 가늘어지는 칠과 가장자리의 끊긴 잉크 */
  band?: BandPaint
}

/** 항목 하나의 범위 — 범위들의 합에서 뺄 자리(minus)를 뺀 것 */
export interface PeriodRegion {
  bounds: Bounds
  inside(x: number, y: number): boolean
  shapes: readonly PeriodArea[]
  minus: readonly PeriodArea[]
}

const inBox = (b: Bounds, x: number, y: number) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1
const unionBounds = (bs: readonly Bounds[]): Bounds =>
  bs.reduce((a, b) => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) }), {
    x0: Infinity,
    y0: Infinity,
    x1: -Infinity,
    y1: -Infinity,
  })
const pad = (b: Bounds, r: number): Bounds => ({ x0: b.x0 - r, y0: b.y0 - r, x1: b.x1 + r, y1: b.y1 + r })
export const boxesMeet = (a: Bounds, b: Bounds) => a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0
const clipBounds = (b: Bounds, r: Bounds): Bounds | null => {
  const out = { x0: Math.max(b.x0, r.x0), y0: Math.max(b.y0, r.y0), x1: Math.min(b.x1, r.x1), y1: Math.min(b.y1, r.y1) }
  return out.x1 > out.x0 && out.y1 > out.y0 ? out : null
}

/** 고리의 방향 셈 (y 가 아래로 자라는 지도 좌표) — 음수면 ellipsePath(타원 path)와 같은 방향 */
const winding = (ring: Ring) => {
  let s = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) s += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
  return s
}
/** 고리를 타원 path 와 같은 방향으로 (hole 이면 반대로) — 겹친 고리를 한 path 에 nonzero 로 칠해 합집합이 되게 */
export function orient(ring: Ring, hole = false): Ring {
  const neg = winding(ring) < 0
  return neg !== hole ? ring : [...ring].reverse()
}
const ringArea = (ring: Ring): PeriodArea => {
  const bounds = ringBounds(ring)
  return { bounds, inside: (x, y) => inBox(bounds, x, y) && pointInRing(x, y, ring), paint: ringToPath(orient(ring)) }
}
const ellipseArea = ([cx, cy]: Point, [rx, ry]: readonly [number, number]): PeriodArea => ({
  bounds: { x0: cx - rx, y0: cy - ry, x1: cx + rx, y1: cy + ry },
  inside: (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1,
  paint: ellipsePath(cx, cy, rx, ry),
})

/** 띠(자국)의 그림 — fill 칠 고리, ink 가장자리 잉크 (지도 단위) */
export interface BandPaint {
  d: string
  ink: string
}

/**
 * 자국 — 'The trails ran like rivulets through the Vastwood' (The Silent Cry). 고른 폭에 둥근 끝을 단 선은 길처럼 읽혀,
 * 양 끝에서 가늘어지고 폭이 조금씩 달라지는 칠과 양쪽 가장자리에 군데군데 끊긴 잉크로 그린다. 칠 폭의 가장 넓은 곳이 데이터의 폭이다
 * (소속 inside 는 데이터의 꺾은선과 폭 그대로라 칠이 그 안에 든다). 시드는 꺾은선 첫 점
 */
function bandPaint(line: readonly Point[], width: number): BandPaint {
  const pts = resample(chaikinOpen(line, 2), 0.5)
  const n = pts.length
  if (n < 2) return { d: '', ink: '' }
  const normals = rightNormals(pts)
  const seed = hashSeed(`band:${line[0][0]},${line[0][1]}`)
  const noise = valueNoise2D(seed, 5)
  const taper = (t: number) => {
    const e = Math.min(1, t / 0.24, (1 - t) / 0.24)
    return e * e * (3 - 2 * e)
  }
  const widths = pts.map((_, i) => width * taper(i / (n - 1)) * (0.7 + 0.3 * noise(i * 0.9, 0)))
  const side = (k: 1 | -1) => pts.map(([x, y], i): Point => [x + (normals[i][0] * k * widths[i]) / 2, y + (normals[i][1] * k * widths[i]) / 2])
  const left = side(-1)
  const right = side(1)
  // 가장자리 잉크 — 칠이 넉넉한 곳에서만, 잡음이 높은 구간을 끊긴 선으로 (양쪽 가장자리가 서로 다른 자리에서 끊긴다)
  let ink = ''
  for (const [edge, k] of [[left, 0], [right, 1]] as const) {
    let run: Point[] = []
    const flush = () => {
      if (run.length >= 3) ink += polylineToPath(run)
      run = []
    }
    edge.forEach((p, i) => {
      if (widths[i] > width * 0.45 && noise(i * 0.55, 7 + k * 11) > 0.52) run.push(p)
      else flush()
    })
    flush()
  }
  return { d: `${polylineToPath([...left, ...right.reverse()])}Z`, ink }
}

/**
 * 범위 하나를 푼다 — 새 고리·영역 고리는 chaikin 2(지금 숲·용암 채색과 같다), 숲·내해는 geo.ts 의 다듬기(깊은 확대는 deepRings),
 * 장소·영역 타원은 정확한 타원, 대륙은 그 대륙의 땅(landmass·islands)을 area 로 자른 모양(대륙 경계선과 같은 자리 — 칠도 이 고리라
 * 범위 다각형 안에 든 이웃 대륙의 땅은 칠하지 않는다. periodClip.ts 의 clipRing, 지역 상세 작가 도구 scripts/childmaps/periods.mjs 와 같은 셈)
 */
export function resolveShape(s: PeriodShape, v: PeriodVariant, src: PeriodSources): PeriodArea {
  if ('ring' in s) return ringArea(chaikin(s.ring, 2))
  if ('band' in s) {
    // 소속은 데이터의 꺾은선 그대로 (지역 상세 작가 도구와 같다), 칠은 다듬은 선
    const r = s.width / 2
    const bounds = pad(ringBounds(s.band), r)
    return {
      bounds,
      inside: (x, y) => inBox(bounds, x, y) && distanceToPolyline(x, y, s.band) <= r,
      paint: '',
      band: bandPaint(s.band, s.width),
    }
  }
  if ('water' in s) {
    const i = inlandWaterIds.indexOf(s.water)
    if (i < 0) throw new Error(`periodTerrain: 내해 '${s.water}' 가 없다`)
    return ringArea(v === 'deep' ? deepRings().inland[i] : inlandWaters[i])
  }
  if ('forest' in s) {
    const ring = v === 'deep' ? deepRings().forests[s.forest] : forests[s.forest]
    if (!ring) throw new Error(`periodTerrain: 팬 지도 숲 ${s.forest} 번이 없다`)
    return ringArea(ring)
  }
  if ('continent' in s) {
    const c = src.continents.find((x) => x.id === s.continent)
    if (!c) throw new Error(`periodTerrain: 대륙 '${s.continent}' 가 없다`)
    const lands = [c.landmass, ...(c.islands ?? [])].flatMap((id) => {
      const i = landmasses.findIndex((l) => l.id === id)
      if (i < 0) return []
      const ring = v === 'deep' ? deepRings().lands[i] : landmasses[i].ring
      return [{ ring, bounds: ringBounds(ring) }]
    })
    const landBounds = unionBounds(lands.map((l) => l.bounds))
    const onLand = (x: number, y: number) => lands.some((l) => inBox(l.bounds, x, y) && pointInRing(x, y, l.ring))
    if (!c.area) return { bounds: landBounds, inside: (x, y) => inBox(landBounds, x, y) && onLand(x, y), paint: lands.map((l) => ringToPath(orient(l.ring))).join('') }
    const area = c.area
    const ab = ringBounds(area)
    const bounds = clipBounds(ab, landBounds) ?? ab
    // 칠은 그 대륙의 땅 고리를 범위 다각형으로 자른 모양 — 범위 다각형을 그대로 칠하면 그 안에 든 이웃 대륙의 땅(발라 게드 범위 북쪽 변 밑의
    // 아쿰 남동 끝)까지 덮인다. 소속(inside)과 같은 자리라 칠·숲 채색 걷기·기호가 한 모양이다
    const paint = lands
      .flatMap((l) => clipRing(l.ring, area))
      .map((r) => ringToPath(orient(r)))
      .join('')
    return { bounds, inside: (x, y) => inBox(bounds, x, y) && pointInRing(x, y, area) && onLand(x, y), paint }
  }
  if ('place' in s) {
    const l = src.locations.find((x) => x.id === s.place)
    if (!l || !isPlaced(l) || !l.extent) throw new Error(`periodTerrain: 장소 '${s.place}' 에 자리·범위가 없다`)
    return ellipseArea(l.position, l.extent)
  }
  const a = src.areas.find((x) => x.id === s.area)
  if (!a) throw new Error(`periodTerrain: 바탕 지형 영역 '${s.area}' 가 없다`)
  if (a.ring && a.ring.length >= 3) return ringArea(chaikin(a.ring, 2))
  if (!a.at || !a.extent) throw new Error(`periodTerrain: 바탕 지형 영역 '${s.area}' 에 모양이 없다`)
  return ellipseArea(a.at, a.extent)
}

function region(shapes: readonly PeriodArea[], minus: readonly PeriodArea[]): PeriodRegion {
  const bounds = unionBounds(shapes.map((s) => s.bounds))
  return {
    bounds,
    shapes,
    minus,
    inside: (x, y) => inBox(bounds, x, y) && shapes.some((s) => s.inside(x, y)) && !minus.some((m) => m.inside(x, y)),
  }
}

// ---- 단계 하나의 지형 규칙 --------------------------------------------------------------------------------------

/** 바탕 기호를 빼는 항목 — 범위 안의 kinds 기호를 뺀다 (dead: 나무·맹그로브는 몫만큼 죽은 나무로) */
interface ClearRule {
  id: string
  region: PeriodRegion
  kinds: 'all' | ReadonlySet<string>
  dead: boolean
}

/** 더하는 기호의 종류 — 산 띠에 섞는 언덕·수정, 늪 풀포기, 페이즈 무늬 */
type AddKind = 'hill' | 'crystal' | 'marsh' | 'dust' | 'chalk' | 'drybed'

/** 기호를 더하는 항목 */
interface AddRule {
  id: string
  kind: AddKind
  region: PeriodRegion
  density: number
  /** 마른 바닥 무늬에서 기하 무늬의 몫 */
  craze: number
  /** 막힘으로 보지 않을 바탕 선 — 숨긴 협곡 자리를 메운다 */
  through: readonly string[]
  /** 옛 물가까지의 거리 (마른 바닥) */
  shore?: (x: number, y: number) => number
}

/** 단계 하나(켠 항목)의 지형 규칙 — 한 다듬기(world·deep) */
export interface PhaseRules {
  clears: readonly ClearRule[]
  adds: readonly AddRule[]
  /** 그 무렵의 강·폭포 자리 (바탕 막힘 마스크와 같은 반지름) — 둘레의 바탕 기호를 빼고, 더하는 기호도 두지 않는다 */
  added: ((x: number, y: number) => boolean) | null
  hideLines: ReadonlySet<string>
  /** 지형에 닿는 항목마다 닿는 범위 (깊은 확대 칸 열쇠) */
  reach: readonly { id: string; bounds: Bounds }[]
}

const RELIEF_KIND: Record<PeriodRelief['kind'], AddKind> = { hills: 'hill', crystal: 'crystal', swamp: 'marsh' }
/** 더하는 기호가 바탕 기호의 어느 종류로 치는가 — 다른 항목의 clears 로 거를 때 ('all' 은 페이즈 무늬도 거른다) */
const ADD_AS: Record<AddKind, string> = { hill: 'hill', crystal: 'crystal', marsh: 'marsh', dust: 'dust', chalk: 'chalk', drybed: 'drybed' }
/** 세계 지도 기호의 간격 (기호 공간) — 지역 상세 칸(childDetail.ts 의 SPACING)과 같다. 언덕·수정·늪은 바탕 영역 기호와 같다 */
const ADD_SPACING: Record<AddKind, number> = { hill: 13, crystal: 11, marsh: 12, dust: 22, chalk: 16, drybed: 12 }

/** 그 무렵의 강·폭포가 비우는 자리 (buildBlockedMask — 강 4.5 + 폭/2, 폭포 10·size) 의 범위. 2 단위 격자와 물길의 굽이만큼 넉넉히 */
const RIVER_REACH = (r: { width?: number }) => 4.5 + (r.width ?? 1.6) / 2 + 3
const GLYPH_REACH = (g: { size?: number }) => 10 * (g.size ?? 1) + 2

/** 마스크 캐시 — 같은 강·폭포(·숨긴 선) 묶음이면 다시 만들지 않는다 (2 단위 격자 한 장이 1 MB 남짓) */
const masks = new WeakMap<PeriodSources, Map<string, (x: number, y: number) => boolean>>()
function maskOf(src: PeriodSources, key: string, make: () => (x: number, y: number) => boolean) {
  let m = masks.get(src)
  if (!m) masks.set(src, (m = new Map()))
  let hit = m.get(key)
  if (!hit) m.set(key, (hit = make()))
  return hit
}
/** 숨긴 선을 뺀 바탕 막힘 마스크 — through 의 기호가 그 선 자리에 설 수 있게 */
export const throughMask = (src: PeriodSources, through: readonly string[]) =>
  maskOf(src, `through:${[...through].sort().join(',')}`, () => {
    const skip = new Set(through)
    return buildBlockedMask(src.riverShapes, src.lines.filter((l) => !skip.has(l.id)), src.glyphs)
  })

/** 그 무렵의 강 (River 모양으로) — 다듬기는 바탕 강과 같다 (강마다 따로 시드) */
export const periodRiversOf = (set: PeriodSet): River[] =>
  set.rivers.map((r) => ({ id: r.id, course: r.course, width: r.width, basis: r.basis, estimate: r.estimate, location: r.location, label: r.label }))
/** 그 무렵의 한 점 기호 (LandmarkGlyph 모양으로) */
export const periodGlyphsOf = (set: PeriodSet): LandmarkGlyph[] =>
  set.glyphs.map((g) => ({ id: g.id, kind: g.kind, at: g.at, size: g.size, angle: g.angle, basis: g.basis, estimate: g.estimate, location: g.location, label: g.label }))

/** 항목의 범위 (다듬기마다 한 번) — 내해 물 빼기는 옛 물가 고리에서 남은 물을 뺀 것 */
const regions = new WeakMap<PeriodSources, Map<string, PeriodRegion>>()
export function periodRegion(src: PeriodSources, v: PeriodVariant, item: PeriodGround | PeriodRelief | PeriodDrain): PeriodRegion {
  let m = regions.get(src)
  if (!m) regions.set(src, (m = new Map()))
  const key = `${v}:${item.id}`
  let hit = m.get(key)
  if (!hit) {
    hit =
      'water' in item
        ? region([resolveShape({ water: item.water }, v, src)], item.pools.map((p) => resolveShape({ ring: p }, v, src)))
        : region(item.shapes.map((s) => resolveShape(s, v, src)), ((item as PeriodGround).minus ?? []).map((s) => resolveShape(s, v, src)))
    m.set(key, hit)
  }
  return hit
}

/** 고리 둘레까지의 거리 — 가까운 변만 보도록 변을 격자 칸에 나눠 둔다 (cell 보다 먼 거리는 cell 로 친다) */
function ringDistance(ring: Ring, cell: number): (x: number, y: number) => number {
  const grid = new Map<number, number[]>()
  const key = (gx: number, gy: number) => (gy + 4096) * 8192 + gx + 4096
  for (let i = 0; i < ring.length; i++) {
    const [ax, ay] = ring[i]
    const [bx, by] = ring[(i + 1) % ring.length]
    for (let gx = Math.floor(Math.min(ax, bx) / cell); gx <= Math.floor(Math.max(ax, bx) / cell); gx++)
      for (let gy = Math.floor(Math.min(ay, by) / cell); gy <= Math.floor(Math.max(ay, by) / cell); gy++) {
        const k = key(gx, gy)
        const list = grid.get(k)
        if (list) list.push(i)
        else grid.set(k, [i])
      }
  }
  return (x, y) => {
    let best = cell
    const gx = Math.floor(x / cell)
    const gy = Math.floor(y / cell)
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const i of grid.get(key(gx + dx, gy + dy)) ?? []) {
          const [ax, ay] = ring[i]
          const [bx, by] = ring[(i + 1) % ring.length]
          const ex = bx - ax
          const ey = by - ay
          const len = ex * ex + ey * ey
          const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / len))
          best = Math.min(best, Math.hypot(x - (ax + t * ex), y - (ay + t * ey)))
        }
    return best
  }
}

/**
 * 단계 하나(켠 항목 set)의 지형 규칙을 한 다듬기(v)로 — 바탕 기호를 빼는 항목, 기호를 더하는 항목, 그 무렵의 강·폭포 자리, 숨기는 선
 */
export function phaseRules(set: PeriodSet, v: PeriodVariant, src: PeriodSources): PhaseRules {
  const clears: ClearRule[] = []
  const adds: AddRule[] = []
  const reach: { id: string; bounds: Bounds }[] = []
  for (const g of set.grounds) {
    const r = periodRegion(src, v, g)
    reach.push({ id: g.id, bounds: r.bounds })
    clears.push({ id: g.id, region: r, kinds: g.clears === 'all' ? 'all' : new Set(g.clears), dead: g.kind === 'deadwood' })
    // 무늬 기호는 밀도가 있을 때만 (deadwood·밀도 없는 백악 자국은 칠과 빼기만)
    if (g.kind !== 'deadwood' && g.density) adds.push({ id: g.id, kind: g.kind, region: r, density: g.density, craze: 0, through: [] })
  }
  for (const rel of set.reliefs) {
    const r = periodRegion(src, v, rel)
    reach.push({ id: rel.id, bounds: r.bounds })
    if (rel.clears) clears.push({ id: rel.id, region: r, kinds: rel.clears === 'all' ? 'all' : new Set(rel.clears), dead: false })
    adds.push({ id: rel.id, kind: RELIEF_KIND[rel.kind], region: r, density: rel.density, craze: 0, through: rel.through ?? [] })
  }
  for (const d of set.drains) {
    const r = periodRegion(src, v, d)
    reach.push({ id: d.id, bounds: r.bounds })
    // 옛 물가 — 그 내해 고리 (다듬기에 맞춰)
    const i = inlandWaterIds.indexOf(d.water)
    const ring = v === 'deep' ? deepRings().inland[i] : inlandWaters[i]
    const shore = ring ? ringDistance(ring, 12) : () => Infinity
    adds.push({ id: d.id, kind: 'drybed', region: r, density: d.density, craze: d.craze, through: [], shore })
  }
  for (const r of set.rivers) reach.push({ id: r.id, bounds: pad(ringBounds(r.course), RIVER_REACH(r)) })
  for (const g of set.glyphs) reach.push({ id: g.id, bounds: pad({ x0: g.at[0], y0: g.at[1], x1: g.at[0], y1: g.at[1] }, GLYPH_REACH(g)) })
  // 그 무렵의 강·폭포 자리 — 다듬기와 상관없이 지도 단위 격자 하나 (바탕 막힘 마스크와 같은 셈)
  const addedKey = [...set.rivers.map((r) => r.id), ...set.glyphs.map((g) => g.id)].join(',')
  const added = addedKey
    ? maskOf(src, `added:${addedKey}`, () => buildBlockedMask(shapeRivers(periodRiversOf(set), src.avoid), [], periodGlyphsOf(set)))
    : null
  return { clears, adds, added, hideLines: new Set(set.hides.map((h) => h.line)), reach }
}

/** 규칙에서 칸(region)에 닿는 항목만 — 닿는 것이 없으면 null (그 칸은 바탕 칸과 같다) */
export function rulesWithin(rules: PhaseRules, b: Bounds): { rules: PhaseRules; ids: string[] } | null {
  const ids = rules.reach.filter((r) => boxesMeet(r.bounds, b)).map((r) => r.id)
  if (!ids.length) return null
  const on = new Set(ids)
  return {
    ids,
    rules: {
      clears: rules.clears.filter((c) => on.has(c.id)),
      adds: rules.adds.filter((a) => on.has(a.id)),
      added: rules.added,
      hideLines: rules.hideLines,
      reach: rules.reach.filter((r) => on.has(r.id)),
    },
  }
}

// ---- TerrainPhase -----------------------------------------------------------------------------------------------

/** 점 무리를 격자에 담아 가까운 점을 빨리 찾는다 (terrain.ts 의 pointGrid 와 같다) */
function pointGrid(cell: number) {
  const grid = new Map<string, Point[]>()
  const key = (gx: number, gy: number) => `${gx},${gy}`
  return {
    add(p: Point) {
      const k = key(Math.floor(p[0] / cell), Math.floor(p[1] / cell))
      const list = grid.get(k)
      if (list) list.push(p)
      else grid.set(k, [p])
    },
    some(x: number, y: number, test: (p: Point) => boolean) {
      const gx = Math.floor(x / cell)
      const gy = Math.floor(y / cell)
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (grid.get(key(gx + dx, gy + dy))?.some(test)) return true
      return false
    },
  }
}

/** 세계 지도 바탕 기호와 같은 잡음 (terrain.ts) — 더한 언덕·수정의 솎기가 둘레 바탕 영역과 같은 모양이 되게 */
const areaJitter = valueNoise2D(hashSeed('relief-area'), 5)
const fineNoise = valueNoise2D(hashSeed('relief-fine'), 26)
const broadNoise = valueNoise2D(hashSeed('relief-broad'), 70)
/** 수정 영역이 이보다 성기면 낮은 무리 (terrain.ts 의 CRYSTAL_SMALL_BELOW) */
const CRYSTAL_SMALL_BELOW = 0.7

const covers = (c: ClearRule, kind: string) => c.kinds === 'all' || c.kinds.has(kind)

/**
 * 규칙으로 buildTerrain 에 넘길 페이즈를 만든다 — key 는 닿는 항목 id 를 정렬해 이은 것.
 * prepare 는 기호를 뿌리는 칸(probe)마다 한 번: 더하는 기호를 항목마다 따로 뿌리고, 바탕 기호의 판정을 낸다
 */
export function makePhase(rules: PhaseRules, src: PeriodSources, key: string): TerrainPhase {
  const { clears, adds, added } = rules
  const kit = periodGlyphKit
  return {
    key,
    hideLines: rules.hideLines,
    prepare(probe: TerrainProbe, basePeakNear: (x: number, y: number, r: number) => boolean): PhasePlan {
      const { g, gx } = probe
      const peaks: PeakGlyph[] = []
      const peakPts: Point[] = []
      const marsh: [number, number, string][] = []
      const period = { dust: [] as [number, number, string][], chalk: [] as [number, number, string][], drybed: [] as [number, number, string][] }
      const addedAt = added ?? (() => false)
      /** 출력 판정 — 다른 켠 항목이 그 종류를 빼는 자리면 더하지 않는다 (만든 뒤에 거르므로 자리는 단계마다 같다) */
      const cleared = (self: string, kind: string, x: number, y: number) =>
        clears.some((c) => c.id !== self && covers(c, kind) && inBox(c.region.bounds, x, y) && c.region.inside(x, y))
      for (const a of adds) {
        const b = clipBounds(a.region.bounds, probe.whole)
        if (!b) continue
        const rand = mulberry32(probe.seedOf(`period:${a.id}`))
        const inside = a.region.inside
        const as = ADD_AS[a.kind]
        // 높은 기호의 자리 — through 의 선은 막힘으로 보지 않는다 (숨긴 협곡 자리를 메운다)
        const tm = a.through.length ? throughMask(src, a.through) : null
        const blk = tm ? (x: number, y: number) => tm(x, y) || Boolean(probe.claimed?.(x, y)) : probe.blocked
        const freeTall = (x: number, y: number, r: number) => !probe.near(x, y, r * g * probe.fit(x, y)) && !blk(x, y) && !blk(x, y - 7 * g)
        // 언덕·수정은 바탕 영역처럼 간격은 그대로 두고 잡음으로 솎는다. 나머지는 밀도만큼 간격을 넓힌다 (지역 상세 칸과 같은 셈)
        const gap = (ADD_SPACING[a.kind] * g) / (a.kind === 'hill' || a.kind === 'crystal' ? 1 : Math.sqrt(a.density))
        const tries = { seedTries: 12 }
        if (a.kind === 'hill' || a.kind === 'crystal') {
          const hill = a.kind === 'hill'
          const small = !hill && a.density < CRYSTAL_SMALL_BELOW
          const pts = poissonDisk(b, small ? 12 * g : gap, rand, (x, y) =>
            inside(x, y) && !addedAt(x, y) && probe.onLand(x, y, hill ? 14 : 7) && freeTall(x, y, hill ? 10 : 14) && !basePeakNear(x, y, 13 * g) &&
            (hill ? areaJitter(x, y) < a.density * 0.95 : fineNoise(x, y) * 0.7 + broadNoise(x, y) * 0.3 < a.density), tries)
          for (const [x, y] of pts) {
            const c = hill ? hillGlyph(gx(x), gx(y), rand) : crystalGlyph(gx(x), gx(y), rand, small)
            if (cleared(a.id, as, x, y)) continue
            peakPts.push([x, y])
            peaks.push(
              hill
                ? { y, crystal: '', crystalRidge: '', crystalHatch: '', fill: c.fill, ridge: c.ridge, hatch: c.hatch }
                : { y, fill: '', ridge: '', hatch: '', crystal: c.fill, crystalRidge: c.ridge, crystalHatch: c.hatch },
            )
          }
        } else if (a.kind === 'marsh') {
          // 더하는 기호는 이름 상자를 비킨다 (마른 바닥 무늬와 같은 셈 — 바탕 늪은 그대로라 끔 지도와 상관없다)
          const pts = poissonDisk(b, gap, rand, (x, y) => inside(x, y) && !addedAt(x, y) && !probe.inLabel(x, y, 2 * g) && probe.onLand(x, y, 6) && probe.freeLow(x, y, 4), tries)
          for (const [x, y] of pts) {
            const d = marshGlyph(gx(x), gx(y), rand).join('')
            if (!cleared(a.id, as, x, y)) marsh.push([x, y, d])
          }
        } else if (a.kind === 'drybed') {
          const shore = a.shore!
          const pools = a.region.minus
          // 남은 물 가장자리에도 바짝 붙지 않게 — 네 방향 2·g 를 본다
          const m = 2 * g
          const wet = (x: number, y: number) => pools.some((p) => p.inside(x, y) || p.inside(x + m, y) || p.inside(x - m, y) || p.inside(x, y + m) || p.inside(x, y - m))
          const pts = poissonDisk(b, gap, rand, (x, y) =>
            inside(x, y) && !wet(x, y) && !addedAt(x, y) && !probe.inLabel(x, y, 2 * g) && probe.freeLow(x, y, 6) && shore(x, y) > 4 * g, tries)
          for (const [x, y] of pts) {
            const d = rand() < a.craze ? kit.craze(gx(x), gx(y), rand) : kit.crack(gx(x), gx(y), rand)
            if (!cleared(a.id, as, x, y)) period.drybed.push([x, y, d])
          }
        } else {
          const draw = a.kind === 'dust' ? kit.drift : kit.chalk
          const out = a.kind === 'dust' ? period.dust : period.chalk
          const pts = poissonDisk(b, gap, rand, (x, y) => inside(x, y) && !addedAt(x, y) && !probe.inLabel(x, y, 2 * g) && probe.onLand(x, y, 4) && probe.freeLow(x, y, 6), tries)
          for (const [x, y] of pts) {
            const d = draw(gx(x), gx(y), rand)
            if (!cleared(a.id, as, x, y)) out.push([x, y, d])
          }
        }
      }
      // 더한 봉우리 밑의 나무·늪 — 바탕 underPeak 와 같은 셈 (더한 봉우리는 바탕 봉우리 격자에 넣지 않는다)
      const grid = pointGrid(26 * g)
      for (const p of peakPts) grid.add(p)
      const underAdded = (x: number, y: number) =>
        peakPts.length > 0 && grid.some(x, y, ([px, py]) => Math.abs(px - x) < 7 * g && y > py - 12 * g && y < py + 3 * g)
      return {
        verdict(kind: ScatterKind, x: number, y: number) {
          for (const c of clears) {
            if (!covers(c, kind) || !inBox(c.region.bounds, x, y) || !c.region.inside(x, y)) continue
            // 죽은 숲 — 나무·맹그로브는 자리 해시로 몫만 죽은 나무로 남긴다 (지역 상세 칸과 같은 함수)
            return c.dead && (kind === 'tree' || kind === 'mangrove') && kit.hash01(x, y) < kit.DEAD_KEEP ? 2 : 1
          }
          if (added?.(x, y)) return 1
          if ((kind === 'tree' || kind === 'marsh' || kind === 'mangrove') && underAdded(x, y)) return 1
          return 0
        },
        peaks,
        marsh,
        period,
        dead: (x, y) => deadTreeAt(x, y, gx(x), gx(y)),
      }
    },
  }
}

// ---- 소속 함수 → 고리 -------------------------------------------------------------------------------------------

const EDGE_STEPS = 8
/**
 * 소속 함수 inside 의 경계를 격자(step)로 따라 고리로 — 경계 점은 격자 변 위에서 이분법으로 찾는다(격자보다 곱다).
 * 범위 상자 둘레는 밖으로 본다. 바깥 고리는 타원 path 와 같은 방향, 구멍은 반대 방향이라 nonzero 로 칠하면 구멍이 빈다.
 * 겹친 범위의 합에서 뺄 자리를 뺀 칠(죽은 숲의 옅은 덧칠)처럼 고리 여럿의 불 연산을 칠 하나로 만들 때 쓴다
 */
export function traceRegion(inside: (x: number, y: number) => boolean, box: Bounds, step: number): Ring[] {
  const nx = Math.max(2, Math.ceil((box.x1 - box.x0) / step) + 2)
  const ny = Math.max(2, Math.ceil((box.y1 - box.y0) / step) + 2)
  const x0 = box.x0 - step
  const y0 = box.y0 - step
  const X = (i: number) => x0 + i * step
  const Y = (j: number) => y0 + j * step
  const W = nx + 1
  const v = new Uint8Array(W * (ny + 1))
  let any = false
  for (let j = 1; j < ny; j++)
    for (let i = 1; i < nx; i++)
      if (inside(X(i), Y(j))) {
        v[j * W + i] = 1
        any = true
      }
  if (!any) return []
  const at = (i: number, j: number) => v[j * W + i]
  // 변 위의 경계 점 (변 번호 → 자리)
  const points = new Map<number, Point>()
  const H = (i: number, j: number) => (j * W + i) * 2
  const V = (i: number, j: number) => (j * W + i) * 2 + 1
  const edgePoint = (key: number, ax: number, ay: number, bx: number, by: number, aIn: boolean) => {
    if (points.has(key)) return
    let [ix, iy, ox, oy] = aIn ? [ax, ay, bx, by] : [bx, by, ax, ay]
    for (let k = 0; k < EDGE_STEPS; k++) {
      const mx = (ix + ox) / 2
      const my = (iy + oy) / 2
      if (inside(mx, my)) [ix, iy] = [mx, my]
      else [ox, oy] = [mx, my]
    }
    points.set(key, [(ix + ox) / 2, (iy + oy) / 2])
  }
  // 칸마다 선분 — 안장(대각선 둘만 안)은 둘을 떼어 둔다
  const next = new Map<number, number>()
  const link = (p: number, q: number) => next.set(p, q)
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const a = at(i, j)
      const b = at(i + 1, j)
      const c = at(i + 1, j + 1)
      const d = at(i, j + 1)
      const code = a * 8 + b * 4 + c * 2 + d
      if (code === 0 || code === 15) continue
      const T = H(i, j)
      const B = H(i, j + 1)
      const L = V(i, j)
      const R = V(i + 1, j)
      if (a !== b) edgePoint(T, X(i), Y(j), X(i + 1), Y(j), a === 1)
      if (d !== c) edgePoint(B, X(i), Y(j + 1), X(i + 1), Y(j + 1), d === 1)
      if (a !== d) edgePoint(L, X(i), Y(j), X(i), Y(j + 1), a === 1)
      if (b !== c) edgePoint(R, X(i + 1), Y(j), X(i + 1), Y(j + 1), b === 1)
      // 안이 왼쪽에 오게 잇는다 (한 방향으로 돌아 고리가 저절로 닫힌다)
      switch (code) {
        case 1: link(L, B); break
        case 2: link(B, R); break
        case 3: link(L, R); break
        case 4: link(R, T); break
        case 5: link(L, T); link(R, B); break
        case 6: link(B, T); break
        case 7: link(L, T); break
        case 8: link(T, L); break
        case 9: link(T, B); break
        case 10: link(T, R); link(B, L); break
        case 11: link(T, R); break
        case 12: link(R, L); break
        case 13: link(R, B); break
        case 14: link(B, L); break
      }
    }
  const seen = new Set<number>()
  const loops: Ring[] = []
  for (const start of next.keys()) {
    if (seen.has(start)) continue
    const loop: Point[] = []
    for (let cur: number | undefined = start; cur !== undefined && !seen.has(cur); cur = next.get(cur)) {
      seen.add(cur)
      loop.push(points.get(cur)!)
    }
    if (loop.length >= 3) loops.push(loop)
  }
  // 바깥 고리와 구멍 — 다른 고리 몇 겹 안에 드는지 (짝수면 바깥)
  return loops.map((r, i) => {
    const depth = loops.reduce((n, o, k) => n + (k !== i && pointInRing(r[0][0], r[0][1], o) ? 1 : 0), 0)
    return orient(r, depth % 2 === 1)
  })
}

// ---- 기록 다시 잇기 (세계 지도 축척) ------------------------------------------------------------------------------

/** 산 띠의 높이 (terrain.ts 의 BAND — 세계 지도 g = 1) */
const BAND = 16
/** 칸 층 이름 → 그 층의 칸 문자열 */
function layerOf(t: TerrainLayers, name: string): string[] {
  switch (name) {
    case 'crowns':
      return t.trees.crowns
    case 'trunks':
      return t.trees.trunks
    case 'marsh':
      return t.marsh
    case 'ice':
      return t.ice
    case 'canyons':
      return t.canyons
    case 'lava':
      return t.lava
    case 'tundra':
      return t.tundra
    case 'frost':
      return t.frost
    case 'cliffs':
      return t.cliffs
    case 'waterCliffs':
      return t.waterCliffs
  }
  throw new Error(`replayTerrain: 모르는 칸 층 '${name}'`)
}
/** 선 층 — 선을 숨기면 그 선만 넣은 칸은 생기지 않는다 (buildTerrain 은 숨긴 선을 아예 긋지 않는다) */
const LINE_LAYERS = new Set(['cliffs', 'waterCliffs'])
/** terrain.ts 의 tiler 와 같은 칸 열쇠 */
const tileKey = (x: number, y: number) => `${Math.floor(x / 200)},${Math.floor(y / 200)}`

/**
 * 바탕 지형의 기록(terrain.ts 의 terrainLogOf)으로 페이즈 지형을 만든다 — buildTerrain(input, undefined, phase) 와 문자열까지 같다(A/B, scripts/qa/period-check.mjs).
 * 기호마다 판정을 묻고(바탕 기호는 기록한 자리로), 남기는 기호의 조각만 바탕 문자열에서 잘라 같은 차례로 다시 잇는다. 기호를 다 뺀 칸은 빈 문자열로 남고
 * (buildTerrain 이 뺀 기호의 칸도 등록하므로 칸 차례가 같다), 죽은 나무·더한 기호는 바탕과 같은 차례로 붙인다. 숨긴 선의 조각과 협곡 바닥은 잘라 낸다.
 * 바뀐 것이 없는 층·칸은 바탕 문자열을 그대로 쓴다
 */
export function replayTerrain(base: TerrainLayers, log: TerrainLog, input: TerrainInput, phase: TerrainPhase): TerrainLayers {
  const { kinds, xs, ys } = log
  const n = kinds.length
  // 바탕 봉우리 자리 — buildTerrain 의 봉우리 격자(대륙·영역의 산·언덕·눈·수정 첨탑)와 같은 점들
  const peakGrid = pointGrid(26)
  for (let i = 0; i < n; i++) {
    const k = kinds[i]
    if (k === 'peak' || k === 'hill' || k === 'snow' || k === 'crystal-spire') peakGrid.add([xs[i], ys[i]])
  }
  const plan = phase.prepare(terrainProbe(input), (x, y, r) => peakGrid.some(x, y, ([px, py]) => (px - x) ** 2 + (py - y) ** 2 < r * r))
  const v = new Uint8Array(n)
  for (let i = 0; i < n; i++) v[i] = plan.verdict(kinds[i], xs[i], ys[i])

  // --- 칸 층 ---
  const hiddenLine = log.lineIds.map((id) => phase.hideLines.has(id))
  const anyHidden = hiddenLine.some(Boolean)
  const { sym, layer, tile, start, len } = log.pieces
  const P = sym.length
  const gone = (s: number) => (s >= 0 ? v[s] !== 0 : s <= -2 && hiddenLine[-2 - s])
  // 층·칸마다 빼는 조각이 있나 — 없는 칸은 바탕 문자열 그대로
  const dirty = log.layers.map((_, li) => new Uint8Array(log.tileKeys[li].length))
  let anyDirty = false
  for (let p = 0; p < P; p++)
    if (gone(sym[p])) {
      dirty[layer[p]][tile[p]] = 1
      anyDirty = true
    }
  const out = new Map<string, string[]>()
  log.layers.forEach((name, li) => {
    const src = layerOf(base, name)
    if (LINE_LAYERS.has(name)) {
      if (!anyHidden) return out.set(name, src)
      // 숨긴 선이 있으면 선 층은 조각 차례대로 다시 — 숨긴 선만 지나던 칸은 생기지 않는다
      const tiles = new Map<string, string>()
      const keys = log.tileKeys[li]
      for (let p = 0; p < P; p++) {
        if (layer[p] !== li || gone(sym[p])) continue
        const k = keys[tile[p]]
        tiles.set(k, (tiles.get(k) ?? '') + src[tile[p]].slice(start[p], start[p] + len[p]))
      }
      return out.set(name, [...tiles.values()])
    }
    if (!anyDirty || !dirty[li].includes(1)) return out.set(name, src)
    const kept: string[][] = src.map(() => [])
    for (let p = 0; p < P; p++) if (layer[p] === li && dirty[li][tile[p]] && !gone(sym[p])) kept[tile[p]].push(src[tile[p]].slice(start[p], start[p] + len[p]))
    out.set(
      name,
      src.map((d, t) => (dirty[li][t] ? kept[t].join('') : d)),
    )
  })
  const get = (name: string, fallback: string[]) => out.get(name) ?? fallback

  // 늪 칸 끝에 더한 풀포기 — 바탕 칸 차례 그대로, 새 칸은 뒤에
  let marsh = get('marsh', base.marsh)
  if (plan.marsh.length) {
    const mi = log.layers.indexOf('marsh')
    const keys = mi >= 0 ? log.tileKeys[mi] : []
    const tiles = new Map<string, string>(keys.map((k, t) => [k, marsh[t]]))
    for (const [x, y, d] of plan.marsh) {
      const k = tileKey(x, y)
      tiles.set(k, (tiles.get(k) ?? '') + d)
    }
    marsh = [...tiles.values()]
  }

  // 페이즈 층 — 죽은 나무는 내보낸 차례대로, 무늬는 계획의 차례대로
  const deadwood = tiler()
  for (let i = 0; i < n; i++) if (v[i] === 2 && (kinds[i] === 'tree' || kinds[i] === 'mangrove')) deadwood.add(xs[i], ys[i], plan.dead(xs[i], ys[i]))
  const pattern = (list: readonly [number, number, string][]) => {
    const t = tiler()
    for (const [x, y, d] of list) t.add(x, y, d)
    return t.paths()
  }

  // --- 산 띠 — 남기는 봉우리를 바탕 띠 문자열에서 잘라 내고, 더한 봉우리와 y 로 안정 병합해 다시 묶는다 ---
  let mountains = base.mountains
  const gs = log.glyphs.sym
  let glyphDropped = false
  for (let k = 0; k < gs.length && !glyphDropped; k++) glyphDropped = v[gs[k]] !== 0
  if (glyphDropped || plan.peaks.length) {
    const lens = log.glyphs.lens
    const kept: PeakGlyph[] = []
    let bi = -1
    let band: MountainBand | undefined
    const off = [0, 0, 0, 0, 0, 0]
    for (let k = 0; k < gs.length; k++) {
      const s = gs[k]
      const key = Math.floor(ys[s] / BAND)
      if (!band || band.key !== key) {
        band = base.mountains[++bi]
        off.fill(0)
      }
      const l = (j: number) => lens[k * 6 + j]
      if (v[s] === 0)
        kept.push({
          y: ys[s],
          fill: band.fill.slice(off[0], off[0] + l(0)),
          crystal: band.crystal.slice(off[1], off[1] + l(1)),
          ridge: band.ridge.slice(off[2], off[2] + l(2)),
          hatch: band.hatch.slice(off[3], off[3] + l(3)),
          crystalRidge: band.crystalRidge.slice(off[4], off[4] + l(4)),
          crystalHatch: band.crystalHatch.slice(off[5], off[5] + l(5)),
        })
      for (let j = 0; j < 6; j++) off[j] += l(j)
    }
    // buildTerrain 은 더한 봉우리를 바탕 뒤에 넣고 y 로 안정 정렬한다 — 같은 y 면 바탕이 먼저
    const more = [...plan.peaks].sort((a, b) => a.y - b.y)
    const all: PeakGlyph[] = []
    let a = 0
    let b = 0
    while (a < kept.length || b < more.length) all.push(b >= more.length || (a < kept.length && kept[a].y <= more[b].y) ? kept[a++] : more[b++])
    mountains = []
    for (const glyph of all) {
      const key = Math.floor(glyph.y / BAND)
      let cur = mountains[mountains.length - 1]
      if (!cur || cur.key !== key) {
        cur = { key, fill: '', crystal: '', ridge: '', hatch: '', crystalRidge: '', crystalHatch: '' }
        mountains.push(cur)
      }
      cur.fill += glyph.fill
      cur.crystal += glyph.crystal
      cur.ridge += glyph.ridge
      cur.hatch += glyph.hatch
      cur.crystalRidge += glyph.crystalRidge
      cur.crystalHatch += glyph.crystalHatch
    }
  }

  // --- 협곡 바닥 — 숨긴 선의 토막을 잘라 낸다 ---
  let gorgeFloors = base.gorgeFloors
  if (anyHidden) {
    gorgeFloors = ''
    const g = log.gorges
    for (let k = 0; k < g.line.length; k++) if (!hiddenLine[g.line[k]]) gorgeFloors += base.gorgeFloors.slice(g.start[k], g.start[k] + g.len[k])
  }

  // buildTerrain 이 내는 것과 같은 차례의 필드
  return {
    mountains,
    trees: { crowns: get('crowns', base.trees.crowns), trunks: get('trunks', base.trees.trunks) },
    marsh,
    ice: get('ice', base.ice),
    cliffs: get('cliffs', base.cliffs),
    waterCliffs: get('waterCliffs', base.waterCliffs),
    canyons: get('canyons', base.canyons),
    lava: get('lava', base.lava),
    tundra: get('tundra', base.tundra),
    frost: get('frost', base.frost),
    gorgeFloors,
    period: { dust: pattern(plan.period.dust), chalk: pattern(plan.period.chalk), drybed: pattern(plan.period.drybed), deadwood: deadwood.paths() },
  }
}
