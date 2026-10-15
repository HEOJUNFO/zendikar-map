// 지역 상세(자식 지도였던 그림) — 세계 지도를 깊이 확대하면 그 지역 자리에 큰 축척으로 따로 그린 그림이 나온다.
// 그림 좌표는 세계 지도 범위(bounds)를 그림 크기(size)로 늘린 것이라, 세계 지도 안에 translate·scale 한 번으로 얹는다.
// - 나오는 배율: 그림 1 단위가 화면 0.6px 이상이 되는 첫 tier (DEEP_TIER 보다 먼저는 아니다) — 그림이 읽히는 크기부터
// - 지형 기호: 그림의 지형 다각형으로 세계 지도와 같은 크기·간격의 기호를 뿌린다(잘게 뿌린 칸마다, fineTerrain.ts).
//   그 자리에서는 세계 지도의 기호를 뿌리지 않고, 범위 가장자리 띠에서는 자리마다 섞어 맡아 사각형 경계가 선으로 드러나지 않는다
// - 강·절벽·협곡 선, 한 점 기호, 헤드론, 지역 라벨: 그림이 다시 그렸으므로 그 범위의 세계 지도 것은 숨긴다
// - 손으로 그린 지형지물과 이름: 범위로 잘라 그린다
// - 더 깊은 지역 상세(parent): 부모가 맡은 몫을 나눠 맡는다 — 세계 지도는 부모 범위의 띠만큼만 물러나고, 그림·지형 기호는 부모와 더 깊은 쪽이
//   더 깊은 쪽의 띠에서 섞어 맡는다(부모 몫 α_P 를 부모 α_P·(1−α_C), 자식 α_P·α_C 로). 부모가 나와 있을 때만 나온다
import type { ChildMap } from '../data/childMaps'
import { gated, gateOf, inPhase, type ChildMapArt, type PhaseGate } from './childMapArt'
import { CHILD_MAP_SIZES } from './childMapSizes'
import { hashSeed, mulberry32, pointInRing, poissonDisk, ringBounds, valueNoise2D, type Bounds, type Point, type Ring } from './geometry'
import { crystalGlyph, lavaGlyph, mangroveGlyph, mesaGlyph, tundraGlyph } from './landscapeGlyphs'
import { canyonGlyph, hillGlyph, marshGlyph, mountainGlyph, snowGlyph, treeGlyph, type MountainBand, type TerrainLayers } from './terrain'
import { DEEP_TIER, detailBandOf, detailTierOf, TIER_PX_PER_UNIT } from './detailScale'

export interface ChildDetail extends ChildMap {
  /** 그림 크기 (그림 단위) */
  size: readonly [number, number]
  /** 그림 단위 ÷ 세계 지도 단위 */
  s: number
  /** 이 tier 부터 나온다 */
  tier: number
}

/**
 * 지역 상세 목록 — 그림 크기로 나오는 tier 를 셈하고(그림 1 단위가 화면 0.6px 이상이 되는 첫 tier, detailScale.ts), 부모가 먼저 오게 늘어놓는다
 * (그리는 차례가 부모 → 더 깊은 쪽). 부모가 없거나 부모보다 깊지 않은 더 깊은 지역 상세는 뺀다 (개발 중에는 알린다 — to_ts.mjs 도 멈춘다)
 */
export function childDetails(maps: readonly ChildMap[]): ChildDetail[] {
  const all = maps.flatMap((m) => {
    const size = CHILD_MAP_SIZES[m.id]
    if (!size) {
      if (import.meta.env.DEV) console.error(`childMapSizes.ts: 지역 상세 '${m.id}' 의 그림 크기가 없다 — node scripts/childmaps/to_ts.mjs`)
      return []
    }
    const s = size[0] / (m.bounds.x1 - m.bounds.x0)
    return [{ ...m, size, s, tier: detailTierOf(s) }]
  })
  const top = all.filter((d) => d.parent === undefined)
  const nested = all.filter((d) => {
    if (d.parent === undefined) return false
    const p = top.find((t) => t.id === d.parent)
    if (p && d.tier > p.tier) return true
    if (import.meta.env.DEV)
      console.error(p ? `지역 상세 '${d.id}' 의 tier ${d.tier} 가 부모 '${p.id}' 의 tier ${p.tier} 보다 깊지 않다 — 그림을 더 크게` : `지역 상세 '${d.id}' 의 부모 '${d.parent}' 가 없다`)
    return false
  })
  return nested.length ? [...top, ...nested] : top
}

/** 더 깊은 지역 상세의 부모 (목록 details 에서) */
export const parentOf = (details: readonly ChildDetail[], d: ChildDetail): ChildDetail | undefined =>
  d.parent === undefined ? undefined : details.find((p) => p.id === d.parent)
/** 지역 상세 d 안의 더 깊은 지역 상세 (목록 details 에서) */
export const nestedIn = (details: readonly ChildDetail[], d: ChildDetail): ChildDetail[] => details.filter((c) => c.parent === d.id)

/** 지역 상세가 나오는 화면 px/단위 (그 tier 의 시작보다 조금 깊이 — '가까이 보기'가 경계에 걸리지 않게) */
export const detailPxPerUnit = (d: ChildDetail) => TIER_PX_PER_UNIT[d.tier] * 1.05

const inside = (b: Bounds, [x, y]: Point) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1
export const inDetail = (d: ChildDetail, p: Point) => inside(d.bounds, p)

/**
 * 가장자리 섞는 띠의 폭 (지도 단위) — 범위 안쪽에 둔다. 이 띠에서 지역 상세의 그림은 바깥쪽으로 옅어지고 세계 지도의 선은 짙어지며,
 * 지형 기호는 자리마다 섞어 맡는다. 넓을수록 경계가 덜 드러난다
 */
export const detailBand = (d: ChildDetail) => detailBandOf(d.bounds)

/**
 * 더 깊은 지역 상세가 부모의 띠 안쪽에 다 들어가는가 — 들어가면 그 자리에서 부모 몫이 1 이라 더 깊은 쪽은 제 띠로만 섞는다.
 * 부모의 띠에 들어가면(변이 겹치는 등) 더 깊은 쪽 그림도 부모 몫(부모의 띠)만큼만 짙어진다 (ChildDetailArt 가 부모 그림 묶음 안에 함께 그린다)
 */
export function insideParentBand(d: ChildDetail, p: ChildDetail): boolean {
  const w = detailBand(p)
  const b = d.bounds
  const pb = p.bounds
  return b.x0 >= pb.x0 + w && b.y0 >= pb.y0 + w && b.x1 <= pb.x1 - w && b.y1 <= pb.y1 - w
}

/** 자리마다 정해진 0~1 값 — 세계 지도 기호와 그림 기호가 가장자리 띠에서 같은 값으로 자리를 나눠 맡는다 */
function hash01(x: number, y: number): number {
  let h = Math.imul(Math.round(x * 64) ^ 0x9e3779b1, 0x85ebca6b) ^ Math.imul(Math.round(y * 64) + 0x632be5ab, 0xc2b2ae35)
  h ^= h >>> 16
  h = Math.imul(h, 0x7feb352d)
  h ^= h >>> 15
  h = Math.imul(h, 0x846ca68b)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** 이 자리를 지역 상세가 맡을 몫 — 띠 안쪽 1, 범위 밖 0, 띠에서 매끄럽게 (그림이 옅어지는 정도와 같다) */
function claimShare(d: ChildDetail, x: number, y: number): number {
  const b = d.bounds
  const depth = Math.min(x - b.x0, b.x1 - x, y - b.y0, b.y1 - y)
  if (depth <= 0) return 0
  const w = detailBand(d)
  if (depth >= w) return 1
  const t = depth / w
  return t * t * (3 - 2 * t)
}
/**
 * 가장자리 띠를 누가 맡는가 — 자리마다 따로 정하면 두 쪽 기호가 서로 간격을 모른 채 섞여 띠가 더 빽빽해 보인다.
 * 그래서 기호 몇 개 크기(g 에 맞춘)의 잡음 덩이로 나눠, 한 덩이 안에는 한쪽 기호만 선다 (덩이 가장자리는 굽어 곧은 선이 생기지 않는다)
 */
const bandNoise = new Map<number, (x: number, y: number) => number>()
function claims(d: ChildDetail, x: number, y: number, g: number): boolean {
  const share = claimShare(d, x, y)
  if (share >= 1) return true
  if (share <= 0) return false
  let noise = bandNoise.get(g)
  if (!noise) bandNoise.set(g, (noise = valueNoise2D(hashSeed('detail-band'), 24 * g)))
  // 잡음 값은 가운데로 몰려 있다 — 몫과 견주기 전에 고르게 펴고, 자리마다 조금 흔들어 덩이 가장자리가 매끈한 곡선이 되지 않게
  const n = Math.min(1, Math.max(0, (noise(x, y) - 0.5) * 1.8 + 0.5 + (hash01(x, y) - 0.5) * 0.08))
  return n < share
}

/** 지역 상세가 맡는 사각형 — 범위 그대로 (띠는 안쪽에 있다) */
const claimBox = (d: ChildDetail): Bounds => d.bounds

// --- 지형 기호 ---

/** 그림의 지형 다각형 — 세계 지도 단위로 옮겨 둔다 */
interface WorldArea extends PhaseGate {
  kind: ChildMapArt['terrain'][number]['kind']
  ring: Ring
  bounds: Bounds
  density: number
  index: number
}
const areaCache = new WeakMap<ChildMapArt, WorldArea[]>()
/** 그림의 빈터 — 세계 지도 단위로 옮겨 둔다 */
interface WorldClearing extends PhaseGate {
  ring: Ring
  bounds: Bounds
}
const clearingCache = new WeakMap<ChildMapArt, WorldClearing[]>()
function worldClearings(d: ChildDetail, art: ChildMapArt): WorldClearing[] {
  let hit = clearingCache.get(art)
  if (hit) return hit
  hit = (art.clearings ?? []).map((c) => {
    const ring = c.points.map(([x, y]) => [d.bounds.x0 + x / d.s, d.bounds.y0 + y / d.s] as Point)
    return { ring, bounds: ringBounds(ring), ...gateOf(c) }
  })
  clearingCache.set(art, hit)
  return hit
}
function worldAreas(d: ChildDetail, art: ChildMapArt): WorldArea[] {
  let hit = areaCache.get(art)
  if (hit) return hit
  hit = art.terrain.flatMap((a, index) => {
    if (a.points.length < 3) return []
    const ring = a.points.map(([x, y]) => [d.bounds.x0 + x / d.s, d.bounds.y0 + y / d.s] as Point)
    return [{ kind: a.kind, ring, bounds: ringBounds(ring), density: a.density ?? 1, index, ...gateOf(a) }]
  })
  areaCache.set(art, hit)
  return hit
}

/**
 * 기호 사이 기본 간격 (기호 공간 단위) — 앞의 다섯은 예전 자식 지도와 같고(숲은 세계 지도보다 촘촘), 나머지는 세계 지도(terrain.ts)와 같다.
 * 수정은 성기면(density < 0.7) 세계 지도처럼 낮은 기둥 무리로 12 간격
 */
const SPACING: Record<WorldArea['kind'], number> = {
  mountain: 13,
  hill: 14,
  forest: 6.5,
  swamp: 15,
  canyon: 17,
  snow: 13,
  mangrove: 10,
  tundra: 14,
  crystal: 11,
  ice: 11,
  lava: 8.5,
  mesa: 22,
}
/** 세계 지도(terrain.ts)와 같은 잡음 — 수정·대지 영역을 같은 모양으로 솎는다 */
const fineNoise = valueNoise2D(hashSeed('relief-fine'), 26)
const broadNoise = valueNoise2D(hashSeed('relief-broad'), 70)
/** 세계 지도(terrain.ts)와 같은 흐름장 — 협곡 단애·용암 획의 방향이 가장자리 띠에서 바뀌지 않게 */
const canyonFlow = valueNoise2D(hashSeed('canyon-flow'), 140)
const lavaFlow = valueNoise2D(hashSeed('lava-flow'), 60)

const clip = (a: Bounds, b: Bounds): Bounds | null => {
  const out = { x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) }
  return out.x1 > out.x0 && out.y1 > out.y0 ? out : null
}

/**
 * 잘게 뿌린 칸(region) 하나에 들어가는 그림의 지형 기호 — 세계 지도 기호와 같은 크기(g)·같은 모양으로.
 * 기호 path 는 기호 공간(지도 단위 ÷ g). 산은 세계 지도처럼 y 띠(16·g)로 묶는다.
 * inner: 이 칸 단계에 나와 있는 더 깊은 지역 상세 — 그들이 맡은 자리의 기호는 뺀다. outer: 이것이 더 깊은 지역 상세면 그 부모 — 부모가 맡은 자리에만 뿌린다
 * (띠 잡음이 같아, 더 깊은 쪽은 둘 다 맡은 자리를, 부모는 저만 맡은 자리를 갖는다).
 * 부모 쪽은 빈터처럼 뿌린 뒤 빼고(만들고 버린다) — 더 깊은 지역 상세가 나와도 그 범위 밖 부모 기호의 자리·모양이 그대로다
 */
export function detailTerrain(
  d: ChildDetail,
  art: ChildMapArt,
  g: number,
  region: Bounds,
  seed: string,
  phase: number,
  inner: readonly ChildDetail[] = [],
  outer?: ChildDetail,
): TerrainLayers | null {
  const box = clip(claimBox(d), region)
  if (!box) return null
  const bands = new Map<number, MountainBand>()
  let crowns = ''
  let trunks = ''
  let marsh = ''
  let canyons = ''
  let tundra = ''
  let frost = ''
  let ice = ''
  let lava = ''
  const band = (y: number) => {
    const key = Math.floor(y / (16 * g))
    const cur = bands.get(key) ?? { key, fill: '', crystal: '', ridge: '', hatch: '', crystalRidge: '', crystalHatch: '' }
    bands.set(key, cur)
    return cur
  }
  // 이 페이즈의 빈터 — 그 안에 밑동이 떨어지는 기호는 뺀다. 기호는 만들고 버려 뒤 기호의 모양(rand 차례)이 다른 페이즈와 같게 둔다
  const clear = worldClearings(d, art).filter((c) => inPhase(c, phase) && clip(c.bounds, box))
  const cleared = (x: number, y: number) => clear.some((c) => x >= c.bounds.x0 && x <= c.bounds.x1 && y >= c.bounds.y0 && y <= c.bounds.y1 && pointInRing(x, y, c.ring))
  // 더 깊은 지역 상세와 나눠 맡기 — 부모는 이 칸에 닿는 더 깊은 지역 상세가 맡은 자리의 기호를 빼고, 더 깊은 쪽은 부모가 맡은 자리에만 뿌린다
  const deeper = inner.filter((c) => clip(c.bounds, box))
  const yielded = (x: number, y: number) => deeper.some((c) => inside(c.bounds, [x, y]) && claims(c, x, y, g))
  const mine = outer ? (x: number, y: number) => claims(d, x, y, g) && claims(outer, x, y, g) : (x: number, y: number) => claims(d, x, y, g)
  for (const a of worldAreas(d, art)) {
    if (!inPhase(a, phase)) continue
    const b = clip(a.bounds, box)
    if (!b) continue
    const rand = mulberry32(hashSeed(`${d.id}:${a.index}:${a.kind}:${seed}`))
    // 수정·대지는 밀도를 간격이 아니라 세계 지도처럼 그대로 (수정은 성기면 낮은 무리)
    const small = a.kind === 'crystal' && a.density < 0.7
    const spacing = a.kind === 'crystal' || a.kind === 'mesa' ? (small ? 12 : SPACING[a.kind]) * g : (SPACING[a.kind] * g) / Math.sqrt(a.density)
    // 수정·대지는 세계 지도처럼 잡음으로 솎는다 — 같은 밀도의 세계 지도 영역과 빽빽함이 같게
    const thin = a.kind === 'crystal' || a.kind === 'mesa' ? (x: number, y: number) => fineNoise(x, y) * 0.7 + broadNoise(x, y) * 0.3 < a.density : () => true
    const pts = poissonDisk(b, spacing, rand, (x, y) => pointInRing(x, y, a.ring) && mine(x, y) && thin(x, y), { seedTries: 3 })
    pts.sort((p, q) => p[1] - q[1])
    for (const [x, y] of pts) {
      const gx = x / g
      const gy = y / g
      const skip = (clear.length > 0 && cleared(x, y)) || (deeper.length > 0 && yielded(x, y))
      if (a.kind === 'mountain' || a.kind === 'snow' || a.kind === 'hill' || a.kind === 'mesa') {
        const glyph =
          a.kind === 'mountain' ? mountainGlyph(gx, gy, rand) : a.kind === 'snow' ? snowGlyph(gx, gy, rand) : a.kind === 'hill' ? hillGlyph(gx, gy, rand) : mesaGlyph(gx, gy, rand)
        if (skip) continue
        const bandOf = band(y)
        bandOf.fill += glyph.fill
        bandOf.ridge += glyph.ridge
        bandOf.hatch += glyph.hatch
      } else if (a.kind === 'crystal') {
        const c = crystalGlyph(gx, gy, rand, small)
        if (skip) continue
        const bandOf = band(y)
        bandOf.crystal += c.fill
        bandOf.crystalRidge += c.ridge
        bandOf.crystalHatch += c.hatch
      } else if (a.kind === 'forest') {
        const t = treeGlyph(gx, gy, rand)
        if (skip) continue
        crowns += t.crown
        trunks += t.trunk
      } else if (a.kind === 'mangrove') {
        // 세계 지도의 맹그로브 영역처럼 버팀뿌리 나무가 대부분, 나머지는 늪 풀포기
        if (rand() < 0.6) {
          const m = mangroveGlyph(gx, gy, rand)
          if (skip) continue
          crowns += m.crown
          trunks += m.roots
          marsh += m.water
        } else {
          const s = marshGlyph(gx, gy, rand).join('')
          if (!skip) marsh += s
        }
      } else if (a.kind === 'swamp') {
        const s = marshGlyph(gx, gy, rand).join('')
        if (!skip) marsh += s
      } else if (a.kind === 'tundra') {
        const [tuft, dots] = tundraGlyph(gx, gy, rand)
        if (skip) continue
        tundra += tuft
        frost += dots
      } else if (a.kind === 'ice') {
        const s = `M${(Math.round(gx * 10) / 10).toString()} ${(Math.round(gy * 10) / 10).toString()}l${(Math.round((3 + rand() * 3) * 10) / 10).toString()} 0`
        if (!skip) ice += s
      } else if (a.kind === 'lava') {
        const s = lavaGlyph(gx, gy, lavaFlow(x, y) * Math.PI * 2.2, rand)
        if (!skip) lava += s
      } else {
        const s = canyonGlyph(gx, gy, canyonFlow(x, y) * Math.PI * 2.4, rand).join('')
        if (!skip) canyons += s
      }
    }
  }
  if (!bands.size && !crowns && !marsh && !canyons && !tundra && !ice && !lava) return null
  const one = (s: string) => (s ? [s] : [])
  return {
    mountains: [...bands.values()].sort((a, b) => a.key - b.key),
    trees: { crowns: one(crowns), trunks: one(trunks) },
    marsh: one(marsh),
    ice: one(ice),
    cliffs: [],
    waterCliffs: [],
    canyons: one(canyons),
    lava: one(lava),
    tundra: one(tundra),
    frost: one(frost),
    gorgeFloors: '',
  }
}

/** 잘게 뿌린 지형에 지역 상세를 얹는 방법 — fineTerrain.ts 의 useFineTerrain 이 칸마다 묻는다 */
export interface FineOverlay {
  /** 단계(level)에서 지역 상세가 맡은 자리 — 그 자리에는 세계 지도의 기호를 뿌리지 않는다 (맨 위 지역 상세만 — 더 깊은 쪽은 부모 몫 안에서 나눠 맡는다) */
  claimedFor: (level: number) => ((x: number, y: number) => boolean) | undefined
  /** 단계·칸에 더할 지역 상세의 지형 기호 */
  extraFor: (level: number, g: number, region: Bounds, seed: string) => TerrainLayers[]
  /**
   * 단계·칸(region)을 이 얹기로 만든 결과를 가르는 말 — 그 칸에 닿는 지역 상세(그림까지)와, 그 칸의 페이즈 따라 달라지는 칸·빈터가
   * 이 페이즈에서 뿌려지는지. 얹기가 새로 되어도(다른 지역의 그림이 오거나 페이즈가 바뀌어도) 이 말이 같은 칸은 그대로 쓴다
   */
  keyFor: (level: number, region: Bounds) => string
}

/** 단계 level 의 tier — fineTerrain.ts 의 fineLevelFor 와 거꾸로 */
const tierOfLevel = (level: number) => level + DEEP_TIER - 1

/** 그림마다 붙인 번호 — 같은 지역의 그림이 새로 오면(원본을 고쳐 다시 읽을 때) 칸을 다시 만들게 */
const artIds = new WeakMap<ChildMapArt, number>()
let nextArtId = 0
const artId = (art: ChildMapArt) => {
  let id = artIds.get(art)
  if (id === undefined) artIds.set(art, (id = nextArtId++))
  return id
}
/**
 * 칸 둘레에서 맡은 자리를 더 묻는 폭 (기호 크기 g 배) — 세계 지도의 기호는 밑동 위쪽(7·g 까지)도 맡은 자리인지 본다(terrain.ts 의 freeTall).
 * 넉넉히 잡아, 칸 밖의 지역 상세가 칸 안 기호를 바꾸는 일이 말에서 빠지지 않게
 */
const KEY_MARGIN = 16
/** 페이즈에 따라서만 뿌리는 칸·빈터인가 (inPhase 가 페이즈마다 달라질 수 있다) */
const phased = gated

/** 그림을 불러온 지역 상세로 지형 얹기를 만든다 (그림이 더 오거나 페이즈가 바뀌면 새로 — 닿는 것이 달라진 칸만 다시 만든다, keyFor). phase 는 페이즈 단계 (0: 끔, sagas.ts 의 이어 센 번호) */
export function fineOverlay(details: readonly ChildDetail[], arts: Readonly<Record<string, ChildMapArt>>, phase: number): FineOverlay {
  // 더 깊은 지역 상세는 부모 그림까지 와야 — 부모 없이 나서면 세계 지도 기호 위에 제 기호를 겹친다
  const ready = details.filter((d) => arts[d.id] && (d.parent === undefined || arts[d.parent]))
  const at = (level: number) => ready.filter((d) => d.tier <= tierOfLevel(level))
  const byId = new Map(ready.map((d) => [d.id, d]))
  return {
    keyFor: (level, region) => {
      const m = KEY_MARGIN * 2 ** -level
      let key = ''
      for (const d of at(level)) {
        const b = claimBox(d)
        if (b.x1 < region.x0 - m || b.x0 > region.x1 + m || b.y1 < region.y0 - m || b.y0 > region.y1 + m) continue
        const art = arts[d.id]
        key += `${d.id}#${artId(art)}`
        // detailTerrain 이 이 칸에서 보는 칸·빈터 가운데 페이즈 따라 달라지는 것 — 뿌려지는지(1) 아닌지(0)를 차례대로
        const box = clip(b, region)
        if (box) {
          let bits = ''
          for (const a of worldAreas(d, art)) if (phased(a) && clip(a.bounds, box)) bits += inPhase(a, phase) ? '1' : '0'
          bits += '/'
          for (const c of worldClearings(d, art)) if (phased(c) && clip(c.bounds, box)) bits += inPhase(c, phase) ? '1' : '0'
          if (bits !== '/') key += `:${bits}`
        }
        key += ','
      }
      return key
    },
    claimedFor: (level) => {
      const active = at(level).filter((d) => d.parent === undefined)
      if (!active.length) return undefined
      const boxes = active.map(claimBox)
      const g = 2 ** -level
      return (x, y) => active.some((d, i) => inside(boxes[i], [x, y]) && claims(d, x, y, g))
    },
    extraFor: (level, g, region, seed) => {
      const here = at(level)
      return here.flatMap((d) => {
        const inner = here.filter((c) => c.parent === d.id)
        const t = detailTerrain(d, arts[d.id], g, region, seed, phase, inner, d.parent === undefined ? undefined : byId.get(d.parent))
        return t ? [t] : []
      })
    },
  }
}

// --- 그림 불러오기 ---

/** 그림 파일 — 지도마다 따로 나뉜 파일을 그 지역이 화면에 들 때 불러온다 (scripts/childmaps/to_ts.mjs 가 만든다) */
const ART_FILES = import.meta.glob<{ default: ChildMapArt }>('./childmaps/*.ts')
/** 개발 중 ?childsrc=1 이면 원본(scripts/childmaps/art)을 바로 읽는다 — 그림을 고치며 볼 때 */
const fromSource = import.meta.env.DEV && new URLSearchParams(window.location.search).has('childsrc')
const loading = new Map<string, Promise<ChildMapArt>>()
/** 원본은 kit.js 와 함께 전역 CHILDMAPS 에 넣는다 — 한 번에 하나씩 */
let sourceQueue: Promise<unknown> = Promise.resolve()

export function loadChildArt(id: string): Promise<ChildMapArt> {
  let p = loading.get(id)
  if (p) return p
  if (fromSource) {
    p = (sourceQueue = sourceQueue.then(async () => {
      const w = window as unknown as { CHILDMAPS: ChildMapArt[] }
      w.CHILDMAPS = []
      const t = Date.now()
      await import(/* @vite-ignore */ `/scripts/childmaps/kit.js?t=${t}`)
      await import(/* @vite-ignore */ `/scripts/childmaps/art/${id}.js?t=${t}`)
      const art = w.CHILDMAPS.find((m) => m.id === id)
      if (!art) throw new Error(`scripts/childmaps/art/${id}.js 가 CHILDMAPS 에 넣지 않았다`)
      return art
    })) as Promise<ChildMapArt>
  } else {
    const file = ART_FILES[`./childmaps/${id}.ts`]
    p = file ? file().then((m) => m.default) : Promise.reject(new Error(`지역 상세 '${id}' 그림 파일이 없다`))
  }
  // 실패한 것은 다음에 다시 해 볼 수 있게
  p.catch(() => loading.delete(id))
  loading.set(id, p)
  return p
}
