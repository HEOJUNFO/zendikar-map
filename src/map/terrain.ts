// 산·숲·늪·빙원 기호를 지형 위에 흩뿌려 path 문자열로 만든다.
// 기호 수천 개를 개별 요소로 두면 줌이 무거워져, y 띠별로 path 몇 개에 몰아 담는다.
import type { TerrainAreaKind, TerrainLine } from '../data/types'
import { landmasses, MAP_HEIGHT, MAP_WIDTH, type Landmass } from './geo'
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
import { crystalGlyph, ellipsePath, lavaGlyph, mangroveGlyph, mesaGlyph, tundraGlyph } from './landscapeGlyphs'
import type { PeakGlyph, PeriodLayers, PhasePlan, ScatterKind, TerrainLog, TerrainPhase, TerrainProbe } from './periodTypes'
import { getTerrainRaster, type TerrainRaster } from './raster'
import { kindCode, NO_KIND, PieceList, setBandSpans, setTileSpans } from './glyphSpans'

/** 지형 영역의 종류 — 바탕 지형 데이터(TerrainAreaKind)와, 장소 데이터에서만 오는 고원(plateau) */
export type TerrainKind = TerrainAreaKind | 'plateau'

/**
 * 지형 영역 — 다각형(ring) 또는 타원(x, y, rx, ry).
 * - 바탕 지형 데이터(TerrainArea)의 영역은 그 안의 지형을 kind 로 덮어쓴다: 대륙의 지형 기호(relief), 고리 산맥 띠, 팬 지도 숲(나무와,
 *   plain 이면 숲 채색까지)을 걷어 내고 kind 의 기호만 그린다. 목록에서 뒤에 오는 영역이 앞의 영역을 덮는다.
 * - soft(장소 데이터 region/water 의 대략적 범위)는 아래 지형에 kind 의 기호를 보탤 뿐 덮지 않고(산을 줄이거나 늘린다),
 *   고리 산맥 띠에는 닿지 않는다 — 다만 plain 은 산·나무·숲 채색을 걷어 낸다
 */
export interface TerrainPatch {
  kind: TerrainKind
  ring?: Ring
  x: number
  y: number
  rx: number
  ry: number
  bounds: Bounds
  /** 기호 밀도 0..1 (생략하면 kind 마다 기본값) */
  density?: number
  soft?: boolean
}

/** 다각형이나 타원으로 지형 영역을 만든다 */
export function makePatch(
  kind: TerrainKind,
  shape: { ring?: readonly Point[]; at?: Point; extent?: readonly [number, number] },
  opts: { density?: number; soft?: boolean } = {},
): TerrainPatch | null {
  if (shape.ring && shape.ring.length >= 3) {
    const bounds = ringBounds(shape.ring)
    return { kind, ring: shape.ring, x: (bounds.x0 + bounds.x1) / 2, y: (bounds.y0 + bounds.y1) / 2, rx: 0, ry: 0, bounds, ...opts }
  }
  if (!shape.at || !shape.extent) return null
  const [x, y] = shape.at
  const [rx, ry] = shape.extent
  return { kind, x, y, rx, ry, bounds: { x0: x - rx, y0: y - ry, x1: x + rx, y1: y + ry }, ...opts }
}

/** 지형 영역의 path — 숲·용암 채색과 plain 의 숲 채색 가림에 쓴다 */
export const patchPath = (p: TerrainPatch) => (p.ring ? ringToPath(p.ring) : ellipsePath(p.x, p.y, p.rx, p.ry))

export interface ReliefProfile {
  /** 산 기호 밀도 0..1 */
  mountains: number
  /** 눈 덮인 봉우리로 그린다 */
  snow?: boolean
  /** 해안 전체가 절벽 — 해안선 안쪽에 짧은 해칭을 긋는다 */
  cliffs?: boolean
  /** 산맥이 없는 저지대 — 산 대신 낮은 언덕을 그린다 (고리 산맥 ring 이 있으면 띠에는 산, 그 안쪽에는 언덕) */
  hills?: boolean
  /** 해안을 따라 고리처럼 두른 산맥 — 해안에서 [inner, outer] 거리 띠에만 산을 그린다 */
  ring?: readonly [number, number]
  /** 봉우리 사이 땅 전체에 드문 툰드라 풀포기와 서리 점 */
  tundra?: boolean
  /** 대륙의 산 기호 가운데 수정 첨탑으로 그리는 몫 (0..1) */
  crystal?: number
}

export interface MountainBand {
  key: number
  fill: string
  /** 수정 첨탑의 채움 — 산의 양피지색보다 옅은 돌빛 */
  crystal: string
  ridge: string
  hatch: string
  /** 수정 첨탑의 테두리·결 — 산보다 가늘고 옅은 잉크 (낮은 배율에서 검은 덩어리로 뭉치지 않게) */
  crystalRidge: string
  crystalHatch: string
}

/** 산 말고는 지도 칸(TILE)별로 나눈 path 조각들 — 아래 tiler 참고 */
export interface TerrainLayers {
  mountains: MountainBand[]
  trees: { crowns: string[]; trunks: string[] }
  marsh: string[]
  ice: string[]
  cliffs: string[]
  /** 호수·바다를 내려다보는 단애선 — 육지 안의 물 칠 위에 그린다 */
  waterCliffs: string[]
  canyons: string[]
  lava: string[]
  tundra: string[]
  frost: string[]
  /** 협곡(gorge) 바닥 — 양쪽 단애 사이를 조금 어둡게 */
  gorgeFloors: string
  /** 페이즈 바탕이 더한 무늬와 죽은 나무 (periodTypes.ts) — 페이즈를 넘긴 buildTerrain 에서만 생긴다 (바탕에는 이 필드가 없다) */
  period?: PeriodLayers
}

/**
 * 지도 전체에 흩어진 기호를 path 하나에 담으면 화면 타일마다 기호를 전부 훑어, 확대할수록 래스터가 비싸진다
 * (GPU 가 약한 기기에서 끌기가 끊긴다). 같은 칸에 놓인 기호끼리만 묶으면 타일에 닿지 않는 칸은 통째로 건너뛴다.
 */
const TILE = 200

/**
 * rec·name: 세계 지도 바탕을 기록할 때(buildTerrain) — 칸에 넣는 조각마다 자리를 기록기에 적는다 (문자열은 바뀌지 않는다).
 * spans: 흩뿌린 기호의 칸 — 조각마다 그 기호의 종류(add 의 kind)·밑동 자리·끝을 적어 paths() 의 배열에 붙인다 (glyphSpans.ts — 그림 이름 밑의 기호를 뺄 때)
 */
export function tiler(rec?: TerrainRecorder, name = '', spans = false) {
  const tiles = new Map<string, string>()
  const lists = spans ? new Map<string, PieceList>() : null
  const keyOf = (x: number, y: number) => `${Math.floor(x / TILE)},${Math.floor(y / TILE)}`
  const layer = rec ? rec.layer(name) : -1
  return {
    /** kind: 기호 종류 (glyphSpans.ts 의 kindCode) — 기록하는 칸에서 빠뜨리면 그 조각은 빼지 않는다 */
    add(x: number, y: number, d: string, kind = NO_KIND) {
      const key = keyOf(x, y)
      const prev = tiles.get(key) ?? ''
      if (rec) rec.piece(layer, key, prev.length, d.length)
      tiles.set(key, prev + d)
      if (lists) {
        let l = lists.get(key)
        if (!l) lists.set(key, (l = new PieceList()))
        l.push(kind, x, y, prev.length + d.length)
      }
    },
    /**
     * 그 자리의 칸만 등록한다 (없으면 빈 문자열로) — 페이즈가 뺀 기호도 칸은 바탕과 같은 차례로 생겨, 칸 차례(그리는 쪽의 index key)가 밀리지 않는다.
     * 기호를 다 뺀 칸은 빈 문자열로 남는다 (그리는 쪽이 건너뛴다. 바탕에는 빈 칸이 생기지 않는다)
     */
    touch(x: number, y: number) {
      const key = keyOf(x, y)
      if (!tiles.has(key)) tiles.set(key, '')
    },
    paths: () => {
      const out = [...tiles.values()]
      if (lists) setTileSpans(out, [...tiles.keys()].map((k) => lists.get(k)?.seal() ?? null))
      return out
    },
  }
}
export type Tiler = ReturnType<typeof tiler>

/** 산 띠에 넣는 봉우리 기호 (y 로 안정 정렬해 16 단위 띠로 묶는다) — x·k 는 기록(glyphSpans.ts)에만 쓴다 */
type Glyph = PeakGlyph

/**
 * 세계 지도 바탕 지형의 기록기 (periodTypes.ts 의 TerrainLog) — 페이즈를 켜면 periodTerrain.ts 의 replayTerrain 이 이 기록으로 바탕 문자열을 잘라
 * 다시 잇는다(buildTerrain 을 다시 돌리지 않는다). 기호마다 종류·자리, 칸 조각마다 자리만 숫자로 적는다 — 문자열은 붙잡지 않는다
 */
function recorder() {
  const kinds: ScatterKind[] = []
  const xs: number[] = []
  const ys: number[] = []
  const layers: string[] = []
  const tileKeys: string[][] = []
  const tileIndex: Map<string, number>[] = []
  const pSym: number[] = []
  const pLayer: number[] = []
  const pTile: number[] = []
  const pStart: number[] = []
  const pLen: number[] = []
  const glyphSyms: number[] = []
  let glyphOrder: Int32Array = new Int32Array(0)
  let glyphLens: Int32Array = new Int32Array(0)
  const gLine: number[] = []
  const gStart: number[] = []
  const gLen: number[] = []
  /** 지금 내보내는 기호 (선이면 -1 해안 절벽, -2-i 바탕 선 i) */
  let cur = -1
  return {
    layer(name: string) {
      layers.push(name)
      tileKeys.push([])
      tileIndex.push(new Map())
      return layers.length - 1
    },
    symbol(kind: ScatterKind, x: number, y: number) {
      cur = kinds.length
      kinds.push(kind)
      xs.push(x)
      ys.push(y)
    },
    /** 지금 기호가 산 띠에 봉우리 하나를 넣었다 (glyphs 의 차례) */
    glyph() {
      glyphSyms.push(cur)
    },
    /** 산 띠를 묶기 전 — buildTerrain 과 같은 안정 정렬의 차례와 봉우리마다 여섯 문자열의 길이 */
    sortGlyphs(glyphs: readonly Glyph[]) {
      const order = glyphs.map((_, i) => i).sort((a, b) => glyphs[a].y - glyphs[b].y)
      glyphOrder = Int32Array.from(order, (i) => glyphSyms[i])
      glyphLens = new Int32Array(order.length * 6)
      order.forEach((i, k) => {
        const g = glyphs[i]
        const o = k * 6
        glyphLens[o] = g.fill.length
        glyphLens[o + 1] = g.crystal.length
        glyphLens[o + 2] = g.ridge.length
        glyphLens[o + 3] = g.hatch.length
        glyphLens[o + 4] = g.crystalRidge.length
        glyphLens[o + 5] = g.crystalHatch.length
      })
    },
    /** 선을 긋기 시작한다 — -1 해안 절벽, i 바탕 선 i */
    line(i: number) {
      cur = i < 0 ? -1 : -2 - i
    },
    piece(layer: number, key: string, start: number, len: number) {
      const index = tileIndex[layer]
      let t = index.get(key)
      if (t === undefined) {
        t = tileKeys[layer].length
        tileKeys[layer].push(key)
        index.set(key, t)
      }
      pSym.push(cur)
      pLayer.push(layer)
      pTile.push(t)
      pStart.push(start)
      pLen.push(len)
    },
    gorge(line: number, start: number, len: number) {
      gLine.push(line)
      gStart.push(start)
      gLen.push(len)
    },
    done(lineIds: readonly string[]): TerrainLog {
      return {
        kinds,
        xs: Float64Array.from(xs),
        ys: Float64Array.from(ys),
        layers,
        tileKeys,
        pieces: { sym: Int32Array.from(pSym), layer: Uint8Array.from(pLayer), tile: Int32Array.from(pTile), start: Int32Array.from(pStart), len: Int32Array.from(pLen) },
        glyphs: { sym: glyphOrder, lens: glyphLens },
        lineIds,
        gorges: { line: Int32Array.from(gLine), start: Int32Array.from(gStart), len: Int32Array.from(gLen) },
      }
    },
  }
}
type TerrainRecorder = ReturnType<typeof recorder>
/** 바탕 지형 → 그 기록 (세계 지도를 페이즈 없이 만든 결과에만 있다) */
const logs = new WeakMap<TerrainLayers, TerrainLog>()
/** 세계 지도 바탕 지형의 기록 — 페이즈 조각(period.ts)이 페이즈 지형을 다시 이을 때 쓴다 (PeriodCtx.log) */
export const terrainLogOf = (t: TerrainLayers): TerrainLog | undefined => logs.get(t)

/** 절벽 위 선을 이만큼의 점마다 끊는다 — 이음매는 둥근 끝(.cliffs)이 메운다 */
const CLIFF_PIECE = 40

const inPatch = (p: TerrainPatch, x: number, y: number) =>
  x >= p.bounds.x0 && x <= p.bounds.x1 && y >= p.bounds.y0 && y <= p.bounds.y1 &&
  (p.ring ? pointInRing(x, y, p.ring) : ((x - p.x) / p.rx) ** 2 + ((y - p.y) / p.ry) ** 2 <= 1)

const f = (v: number) => (Math.round(v * 10) / 10).toString()

const K_TREE = kindCode('tree')
const K_MANGROVE = kindCode('mangrove')
const K_MARSH = kindCode('marsh')
const K_TUNDRA = kindCode('tundra')
const K_DEADWOOD = kindCode('deadwood')

/**
 * y 로 정렬한 봉우리들을 산 띠(band 높이)로 묶는다 — 띠마다 봉우리의 종류·자리·여섯 문자열의 길이를 기록에 붙인다 (glyphSpans.ts).
 * 페이즈 바탕을 다시 이을 때(periodTerrain.ts 의 replayTerrain)도 이것으로 묶어 같은 문자열이 된다
 */
export function bandGlyphs(glyphs: readonly PeakGlyph[], band: number): MountainBand[] {
  const mountains: MountainBand[] = []
  let cur: MountainBand | undefined
  let rows: PeakGlyph[] = []
  const seal = () => {
    if (!cur) return
    const n = rows.length
    const lens = new Int32Array(n * 6)
    rows.forEach((r, i) => {
      lens[i * 6] = r.fill.length
      lens[i * 6 + 1] = r.crystal.length
      lens[i * 6 + 2] = r.ridge.length
      lens[i * 6 + 3] = r.hatch.length
      lens[i * 6 + 4] = r.crystalRidge.length
      lens[i * 6 + 5] = r.crystalHatch.length
    })
    setBandSpans(cur, { kind: Uint8Array.from(rows, (r) => r.k), x: Float64Array.from(rows, (r) => r.x), y: Float64Array.from(rows, (r) => r.y), lens })
  }
  for (const glyph of glyphs) {
    const key = Math.floor(glyph.y / band)
    if (!cur || cur.key !== key) {
      seal()
      cur = { key, fill: '', crystal: '', ridge: '', hatch: '', crystalRidge: '', crystalHatch: '' }
      rows = []
      mountains.push(cur)
    }
    cur.fill += glyph.fill
    cur.crystal += glyph.crystal
    cur.ridge += glyph.ridge
    cur.hatch += glyph.hatch
    cur.crystalRidge += glyph.crystalRidge
    cur.crystalHatch += glyph.crystalHatch
    rows.push(glyph)
  }
  seal()
  return mountains
}

export function mountainGlyph(x: number, y: number, rand: () => number) {
  const w = 6.5 + rand() * 4.5
  const h = 8 + rand() * 8
  const ax = x + (rand() - 0.5) * w * 0.5
  const ay = y - h
  const lx = x - w
  const rx = x + w * (0.85 + rand() * 0.2)
  // 왼쪽 비탈은 살짝 볼록, 오른쪽은 곧게 — 손으로 그은 봉우리처럼
  const slope = `M${f(lx)} ${f(y)}Q${f(lx + w * 0.45)} ${f(y - h * 0.62)} ${f(ax)} ${f(ay)}L${f(rx)} ${f(y)}`
  // 오른쪽(그늘) 면 해칭
  let hatch = ''
  const n = 2 + Math.floor(rand() * 3)
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1)
    const px = ax + (rx - ax) * t
    const py = ay + (y - ay) * t
    const len = (y - py) * (0.55 + rand() * 0.3)
    hatch += `M${f(px - 0.6)} ${f(py + 0.8)}L${f(px - len * 0.32)} ${f(py + len)}`
  }
  return { fill: `${slope}Z`, ridge: slope, hatch }
}

export function snowGlyph(x: number, y: number, rand: () => number) {
  const w = 5 + rand() * 4
  const h = 7 + rand() * 6
  const ax = x + (rand() - 0.5) * w * 0.4
  const ridge = `M${f(x - w)} ${f(y)}L${f(ax)} ${f(y - h)}L${f(x + w)} ${f(y)}`
  // 봉우리 아래 눈 경계선
  const cap = `M${f(ax - w * 0.36)} ${f(y - h * 0.6)}l${f(w * 0.18)} ${f(h * 0.12)}l${f(w * 0.18)} -${f(h * 0.12)}l${f(w * 0.18)} ${f(h * 0.12)}`
  return { fill: `${ridge}Z`, ridge, hatch: cap }
}

export function hillGlyph(x: number, y: number, rand: () => number) {
  const w = 6 + rand() * 4
  const h = 2.6 + rand() * 1.8
  const ridge = `M${f(x - w)} ${f(y)}Q${f(x)} ${f(y - h * 2)} ${f(x + w)} ${f(y)}`
  // 그늘진 오른쪽 기슭에 짧은 빗금 두 개
  const hatch = `M${f(x + w * 0.35)} ${f(y - h * 0.55)}l${f(-w * 0.12)} ${f(h * 0.5)}M${f(x + w * 0.62)} ${f(y - h * 0.3)}l${f(-w * 0.1)} ${f(h * 0.3)}`
  return { fill: `${ridge}Z`, ridge, hatch }
}

export function treeGlyph(x: number, y: number, rand: () => number) {
  const r = 2.6 + rand() * 1.4
  // 둥근 수관 세 덩이 + 줄기 — 원본 지도의 구름 모양 숲 기호
  const lobes = [
    [x - r * 0.55, y - r * 0.15, r * 0.7],
    [x + r * 0.55, y - r * 0.1, r * 0.68],
    [x, y - r * 0.7, r * 0.75],
  ] as const
  let crown = ''
  for (const [cx, cy, cr] of lobes) {
    crown += `M${f(cx - cr)} ${f(cy)}a${f(cr)} ${f(cr)} 0 1 0 ${f(cr * 2)} 0a${f(cr)} ${f(cr)} 0 1 0 -${f(cr * 2)} 0`
  }
  return { crown, trunk: `M${f(x)} ${f(y + r * 0.35)}l0 ${f(r * 0.7)}` }
}

/** 늪 풀포기 — 물결 두 줄과 풀잎 세 가닥 (path 둘: 물결, 풀잎) */
export function marshGlyph(x: number, y: number, rand: () => number): [string, string] {
  const w = 4 + rand() * 3
  return [
    `M${f(x - w)} ${f(y)}l${f(w * 2)} 0M${f(x - w * 0.6)} ${f(y + 2.4)}l${f(w * 1.2)} 0`,
    `M${f(x)} ${f(y - 0.5)}l0 -${f(4 + rand() * 2)}M${f(x - 1.6)} ${f(y - 0.5)}l-1.4 -3.2M${f(x + 1.6)} ${f(y - 0.5)}l1.4 -3.2`,
  ]
}

/** 협곡 단애선 — a 방향으로 살짝 굽은 선과 한쪽에 짧은 빗금 셋 (path 넷) */
export function canyonGlyph(x: number, y: number, a: number, rand: () => number): string[] {
  const len = 11 + rand() * 9
  const dx = Math.cos(a) * len * 0.5
  const dy = Math.sin(a) * len * 0.5
  // 살짝 굽은 단애선
  const bend = (rand() - 0.5) * 6
  const out = [`M${f(x - dx)} ${f(y - dy)}Q${f(x - dy * 0.2 + bend)} ${f(y + dx * 0.2)} ${f(x + dx)} ${f(y + dy)}`]
  const nx = -Math.sin(a)
  const ny = Math.cos(a)
  for (let t = -0.3; t <= 0.31; t += 0.3) {
    const px = x + dx * t * 2
    const py = y + dy * t * 2
    out.push(`M${f(px)} ${f(py)}l${f(nx * 3.4)} ${f(ny * 3.4)}`)
  }
  return out
}


/** 절벽 해안의 단애 깊이 — 해안에서 이만큼 안쪽에 절벽 위 선을 긋는다 */
const CLIFF_DEPTH = 9

/**
 * 절벽 해안 — 해안에서 조금 안쪽에 절벽 위 선을 긋고, 거기서 해안 쪽으로 짧은 빗금을 내린다.
 * (지도 기호의 단애 표시)
 * 해안에서 안쪽으로 민 점이 다른 해안에 너무 가까우면(뾰족한 곶·좁은 만 어귀에서 양쪽 변을 민 선이 엇갈리는 곳) 그 점은 건너뛴다 —
 * 건너뛴 점이 여섯 개(약 20 단위)까지면 선을 그대로 잇고, 더 길게 이어지면(좁은 곶) 선을 끊는다
 */
function cliffHachure(
  ring: readonly Point[],
  seed: number,
  out: Tiler,
  clear: (x: number, y: number) => boolean,
  broken: (x: number, y: number) => boolean,
) {
  let area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) area += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
  // 링 방향에 따라 안쪽 법선의 부호가 바뀐다
  const inward = area > 0 ? 1 : -1
  const rand = mulberry32(seed)
  let top = ''
  let topAt: Point = [0, 0]
  let topCount = 0
  let last: Point | null = null
  let carry = 0
  let skipped = 0
  const endTop = () => {
    if (topCount > 1) out.add(topAt[0], topAt[1], top)
    top = ''
    topCount = 0
  }
  for (let i = 0; i < ring.length; i++) {
    const [ax, ay] = ring[i]
    const [bx, by] = ring[(i + 1) % ring.length]
    const len = Math.hypot(bx - ax, by - ay)
    if (len === 0) continue
    const nx = (-(by - ay) / len) * inward
    const ny = ((bx - ax) / len) * inward
    let t = carry
    while (t < len) {
      const x = ax + ((bx - ax) * t) / len
      const y = ay + ((by - ay) * t) / len
      const tx = x + nx * CLIFF_DEPTH
      const ty = y + ny * CLIFF_DEPTH
      // 지도 밖으로 이어진 부분(세지리 위쪽)과 강·협곡이 바다로 나가는 어귀는 건너뛴다
      if (!(y > 2 && y < 6000) || broken(x, y) || broken(tx, ty)) {
        endTop()
        last = null
      } else if (!clear(tx, ty)) {
        if (++skipped > 6) {
          endTop()
          last = null
        }
      } else {
        skipped = 0
        if (topCount === CLIFF_PIECE && last) {
          // 이어 그리도록 끊은 자리의 점에서 다시 시작한다
          endTop()
          top = `M${f(last[0])} ${f(last[1])}`
          topAt = last
          topCount = 1
        }
        if (topCount === 0) topAt = [tx, ty]
        top += `${topCount ? 'L' : 'M'}${f(tx)} ${f(ty)}`
        topCount++
        last = [tx, ty]
        const l = CLIFF_DEPTH * (0.55 + rand() * 0.35)
        out.add(tx, ty, `M${f(tx)} ${f(ty)}l${f(-nx * l)} ${f(-ny * l)}`)
      }
      t += 3.4
    }
    carry = t - len
  }
  endTop()
}

/**
 * 단애선 — line 은 절벽 위 가장자리. 빗금은 진행 방향의 오른쪽(side 1) 또는 왼쪽(side -1), 곧 낮은 쪽으로 떨어진다.
 * 굽이 안쪽에서 빗금이 맞은편 선을 넘지 않게, 끝이 선에 너무 가까운 빗금은 뺀다.
 * wet 을 주면 빗금이 떨어지는 쪽의 물(호수·바다)까지 잰다 — 해안 절벽처럼 위 선과 물가 사이에 틈을 두고(모자라면 위 선을 뭍 쪽으로 민다)
 * 빗금은 그 틈 안에서 들쭉날쭉 끝나, 물가 선과 위 선이 빗금으로 이어진 사다리처럼 보이지 않게 한다.
 * ragged 면 빗금 간격과 길이를 더 흐트러뜨린다 — 협곡의 두 단애가 고른 빗금으로 마주 보면 낮은 배율에서 철길처럼 읽힌다
 */
export function scarp(
  line: readonly Point[],
  closed: boolean,
  side: 1 | -1,
  depth: number,
  seed: number,
  out: Tiler,
  wet?: (x: number, y: number) => boolean,
  ragged = false,
) {
  const step = 3.4 * Math.max(0.25, Math.min(1, depth / 7))
  let pts = resample(closed ? chaikin(line, 2) : chaikinOpen(line, 2), step, closed)
  if (pts.length < 2) return
  const normals = rightNormals(pts, closed)
  const rand = mulberry32(seed)
  // 물까지의 거리 — 빗금 방향으로 depth 남짓까지 0.5 씩 걸어 본다
  const gaps = pts.map(([x, y], i) => {
    if (!wet) return Infinity
    for (let d = 0.5; d <= depth + 2; d += 0.5) if (wet(x + normals[i][0] * side * d, y + normals[i][1] * side * d)) return d
    return Infinity
  })
  if (wet) {
    const MIN_GAP = Math.min(4.5, depth * 0.7)
    const need = gaps.map((g) => (Number.isFinite(g) && g < MIN_GAP ? MIN_GAP - g : 0))
    // 민 거리는 이웃과 고르게 — 위 선이 꺾이지 않게
    const shift = need.map((_, i) => {
      let sum = 0
      let n = 0
      for (let k = -3; k <= 3; k++) {
        const j = closed ? (i + k + need.length) % need.length : i + k
        if (j < 0 || j >= need.length) continue
        let m = 0
        for (let q = -2; q <= 2; q++) {
          const r = closed ? (j + q + need.length) % need.length : j + q
          if (r >= 0 && r < need.length) m = Math.max(m, need[r])
        }
        sum += m
        n++
      }
      return sum / n
    })
    pts = pts.map(([x, y], i) => [x - normals[i][0] * side * shift[i], y - normals[i][1] * side * shift[i]] as const)
    shift.forEach((v, i) => (gaps[i] += v))
  }
  const top = closed ? [...pts, pts[0]] : pts
  for (let s = 0; s < top.length - 1; s += CLIFF_PIECE) {
    const piece = top.slice(s, s + CLIFF_PIECE + 1)
    out.add(piece[0][0], piece[0][1], polylineToPath(piece))
  }
  pts.forEach(([x, y], i) => {
    if (ragged && rand() < 0.3) return
    const room = Math.min(depth, gaps[i])
    const l = Number.isFinite(gaps[i]) ? room * (0.45 + rand() * 0.4) : ragged ? depth * (0.3 + rand() * 0.7) : depth * (0.55 + rand() * 0.35)
    const dx = normals[i][0] * side * l
    const dy = normals[i][1] * side * l
    if (distanceToPolyline(x + dx, y + dy, pts, closed) < l * 0.6) return
    out.add(x, y, `M${f(x)} ${f(y)}l${f(dx)} ${f(dy)}`)
  })
}

/** 협곡 — 가운데 선에서 양쪽으로 width/2 떨어진 두 단애가 골짜기 쪽으로 빗금을 내린다. 양 끝은 좁아진다 */
function gorge(line: readonly Point[], width: number, seed: number, out: Tiler): string {
  const center = resample(chaikinOpen(line, 2), 2)
  if (center.length < 2) return ''
  const normals = rightNormals(center)
  const total = (center.length - 1) * 2
  const taper = Math.max(4, width * 1.5)
  const half = (i: number) => {
    const s = i * 2
    const t = Math.min(1, s / taper, (total - s) / taper)
    return (width / 2) * (0.3 + 0.7 * Math.sin((t * Math.PI) / 2))
  }
  const left = center.map(([x, y], i) => [x - normals[i][0] * half(i), y - normals[i][1] * half(i)] as const)
  const right = center.map(([x, y], i) => [x + normals[i][0] * half(i), y + normals[i][1] * half(i)] as const)
  const depth = Math.min(width * 0.42, 6)
  // 왼쪽 단애에서 골짜기는 진행 방향의 오른쪽, 오른쪽 단애에서는 왼쪽
  scarp(left, false, 1, depth, seed, out, undefined, true)
  scarp(right, false, -1, depth, seed + 1, out, undefined, true)
  return ringToPath([...left, ...[...right].reverse()])
}

/**
 * 닫힌 선까지의 거리 — 가까운 변만 보도록 변을 격자 칸에 나눠 둔다. cell 보다 먼 거리는 cell 로 친다
 */
function nearDistance(ring: readonly Point[], cell: number): (x: number, y: number) => number {
  const grid = new Map<string, number[]>()
  const key = (gx: number, gy: number) => `${gx},${gy}`
  for (let i = 0; i < ring.length; i++) {
    const [ax, ay] = ring[i]
    const [bx, by] = ring[(i + 1) % ring.length]
    for (let gx = Math.floor(Math.min(ax, bx) / cell); gx <= Math.floor(Math.max(ax, bx) / cell); gx++) {
      for (let gy = Math.floor(Math.min(ay, by) / cell); gy <= Math.floor(Math.max(ay, by) / cell); gy++) {
        const k = key(gx, gy)
        const list = grid.get(k)
        if (list) list.push(i)
        else grid.set(k, [i])
      }
    }
  }
  return (x, y) => {
    let best = cell
    const gx = Math.floor(x / cell)
    const gy = Math.floor(y / cell)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const i of grid.get(key(gx + dx, gy + dy)) ?? []) {
          const [ax, ay] = ring[i]
          const [bx, by] = ring[(i + 1) % ring.length]
          const ex = bx - ax
          const ey = by - ay
          const len = ex * ex + ey * ey
          const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / len))
          best = Math.min(best, Math.hypot(x - (ax + t * ex), y - (ay + t * ey)))
        }
      }
    }
    return best
  }
}

const isInRing = (ring: readonly [number, number], d: number) => d >= ring[0] && d <= ring[1]

/** 덮어쓰는 영역의 기본 기호 밀도 */
const AREA_DENSITY: Partial<Record<TerrainKind, number>> = { mountain: 0.92, hills: 0.75, mesa: 0.6, crystal: 0.8 }
/** 덮어쓰는 영역 안에서 대륙의 산 밀도에 곱하는 값 — 협곡·숲·빙원·툰드라에는 드문 봉우리가 남는다. 나머지는 산을 걷어 낸다 */
const UNDER_RELIEF: Partial<Record<TerrainKind, number>> = { canyon: 0.35, forest: 0.15, ice: 0.15, tundra: 0.15 }
/** 이보다 성긴 수정 영역은 기둥 두세 개의 낮은 무리로 — 굵은 무리가 빽빽하면 낮은 배율에서 검은 덩어리로 읽힌다 */
const CRYSTAL_SMALL_BELOW = 0.7
/**
 * 섬의 크기 — 해안에서 가장 먼 곳이 이보다 가까운 땅(Beyeen 17, Agadeem 32, Jwar 8)은 해안·마커 여백을 그 비율로 줄인다.
 * 여백이 섬보다 커서 영역에 기호가 하나도 놓이지 않는 일을 막는다
 */
const FULL_DEPTH = 40

type PeakStyle = 'mountain' | 'snow' | 'hill'

/** 산·나무 등 흩뿌린 기호가 피할 상자 (지역 라벨) */
export interface AvoidBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface TerrainInput {
  profileFor: (landmass: Landmass, x: number, y: number) => ReliefProfile
  /** 장소 데이터의 대략적 범위(soft)가 먼저, 바탕 지형 데이터의 영역이 그 뒤에 — 뒤가 앞을 덮는다 */
  patches: TerrainPatch[]
  /** 지점 마커 자리 — 기호를 비켜 둔다 */
  avoid: Point[]
  /** 카드 표시 자리 — 낮은 기호(늪 풀포기·툰드라·빙원·용암 획)만 비켜 둔다 (산·나무 배치는 카드 표시와 상관없이 그대로) */
  pins?: readonly Point[]
  /** 지역 라벨 자리 — 물 위에 심는 맹그로브처럼 라벨이 잘 놓이는 빈 곳을 메우는 기호만 비켜 둔다 */
  labelBoxes: readonly AvoidBox[]
  /** 강·단애선·한 점 기호 자리 — 산·나무 기호를 두지 않는다 */
  blocked: (x: number, y: number) => boolean
  lines: readonly TerrainLine[]
  /** 강·협곡이 바다로 나가는 물길 — 절벽 해안의 빗금을 그 어귀에서 끊는다 (r: 물길에서 이만큼) */
  coastBreaks: readonly { line: readonly Point[]; r: number }[]
  /** 단애선의 빗금 길이 (선마다, landscape.ts 의 cliffDepth) */
  cliffDepth: (l: TerrainLine) => number
  /** 정확한 물 판정 (geo.ts 의 wetAt) — 물가 절벽의 빗금이 물가에 닿지 않게 */
  wetAt: (x: number, y: number) => boolean
}

/** 기호 배치가 묻는 땅·물 판정 — 세계 지도 배율은 래스터(raster.ts), 잘게 뿌릴 때는 칸마다 정확한 판정(fineGeo.ts) */
export type TerrainGeo = Pick<TerrainRaster, 'landAt' | 'coastDistance' | 'forestAt' | 'waterAt' | 'landDepth'>

/**
 * 잘게 다시 뿌리는 단계 — 깊이 확대하면 지도 칸(region)마다 기호를 g 배 크기·간격으로 다시 뿌린다 (fineTerrain.ts).
 * g 가 1 이 아니면 흩뿌린 기호만 만들고(절벽·협곡 선은 세계 지도 것을 그대로 쓴다), 기호 path 는 '기호 공간'(지도 단위 ÷ g)에 있어
 * 그리는 쪽에서 scale(g) 로 줄인다. 칸 가장자리의 기호는 그 칸의 것만 — 점 자리는 지도 단위다
 */
export interface TerrainLod {
  /** 기호 크기·간격 배수 (1 = 세계 지도) */
  g: number
  /** 이 사각형 안에만 뿌린다 (지도 단위) */
  region: Bounds
  /** 난수 씨앗에 붙이는 말 — 칸마다 다른 배치 */
  seed: string
  geo: TerrainGeo
  /**
   * 이 자리를 지역 상세(자식 지도였던 그림)가 맡는가 — 맡은 자리에는 세계 지도의 기호를 두지 않는다 (지역 상세가 제 지형 다각형으로 뿌린다).
   * 가장자리는 자리마다 섞여 맡아, 사각형 경계가 선으로 드러나지 않는다
   */
  claimed?: (x: number, y: number) => boolean
  /** 이 칸에 닿는 페이즈 바탕 (childDetail.ts 의 FineOverlay.phaseFor) — 없으면 바탕 칸과 같다 */
  phase?: TerrainPhase
}

/** 점 무리를 격자에 담아 가까운 점을 빨리 찾는다 */
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
    /** test 를 만족하는 점이 (x, y) 둘레 한 칸 안에 있는가 */
    some(x: number, y: number, test: (p: Point) => boolean) {
      const gx = Math.floor(x / cell)
      const gy = Math.floor(y / cell)
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (grid.get(key(gx + dx, gy + dy))?.some(test)) return true
      return false
    },
  }
}

/**
 * 상자들을 격자 칸에 나눠 담는다 — 칸마다 그 칸에 걸친 상자의 번호를 원래 순서대로. 기호 하나 놓을 때마다 영역·마커·라벨을
 * 처음부터 다 훑던 것을 그 자리 칸만 보게 한다 (찾는 결과는 다 훑을 때와 같다 — 순서를 지키고, 걸칠 수 있는 것은 모두 담는다)
 */
const BUCKET = 48

function boxBuckets(boxes: readonly Bounds[]) {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const b of boxes) {
    x0 = Math.min(x0, b.x0)
    y0 = Math.min(y0, b.y0)
    x1 = Math.max(x1, b.x1)
    y1 = Math.max(y1, b.y1)
  }
  const gx0 = Math.floor(x0 / BUCKET)
  const gy0 = Math.floor(y0 / BUCKET)
  const cols = boxes.length ? Math.floor(x1 / BUCKET) - gx0 + 1 : 0
  const rows = boxes.length ? Math.floor(y1 / BUCKET) - gy0 + 1 : 0
  const cells: number[][] = Array.from({ length: cols * rows }, () => [])
  boxes.forEach((b, i) => {
    for (let gy = Math.floor(b.y0 / BUCKET) - gy0, ey = Math.floor(b.y1 / BUCKET) - gy0; gy <= ey; gy++)
      for (let gx = Math.floor(b.x0 / BUCKET) - gx0, ex = Math.floor(b.x1 / BUCKET) - gx0; gx <= ex; gx++) cells[gy * cols + gx].push(i)
  })
  const EMPTY: number[] = []
  return {
    /** (x, y) 칸에 걸친 상자 번호 (원래 순서) */
    at(x: number, y: number): readonly number[] {
      const gx = Math.floor(x / BUCKET) - gx0
      const gy = Math.floor(y / BUCKET) - gy0
      return gx < 0 || gy < 0 || gx >= cols || gy >= rows ? EMPTY : cells[gy * cols + gx]
    },
    /** [x0, x1]×[y0, y1] 에 걸친 칸들의 상자 가운데 test 를 만족하는 것이 있는가 (순서는 보지 않는다) */
    some(qx0: number, qy0: number, qx1: number, qy1: number, test: (i: number) => boolean) {
      const ax = Math.max(0, Math.floor(qx0 / BUCKET) - gx0)
      const ay = Math.max(0, Math.floor(qy0 / BUCKET) - gy0)
      const bx = Math.min(cols - 1, Math.floor(qx1 / BUCKET) - gx0)
      const by = Math.min(rows - 1, Math.floor(qy1 / BUCKET) - gy0)
      for (let gy = ay; gy <= by; gy++) for (let gx = ax; gx <= bx; gx++) for (const i of cells[gy * cols + gx]) if (test(i)) return true
      return false
    },
  }
}

/** 영역은 bounds 그대로, 점은 크기 없는 상자로 */
const pointBox = ([x, y]: Point): Bounds => ({ x0: x, y0: y, x1: x, y1: y })
/** 같은 입력(세계 지도 한 번, 깊은 확대의 칸 여럿)이면 격자를 다시 만들지 않는다 — 쓰임마다 따로 담는다 */
type BucketCache = WeakMap<object, ReturnType<typeof boxBuckets>>
const bucketsOf = (cache: BucketCache, key: object, boxes: () => readonly Bounds[]) => {
  let b = cache.get(key)
  if (!b) cache.set(key, (b = boxBuckets(boxes())))
  return b
}
const AVOID_BUCKETS: BucketCache = new WeakMap()
const PIN_BUCKETS: BucketCache = new WeakMap()
const LABEL_BUCKETS: BucketCache = new WeakMap()
const HARD_BUCKETS: BucketCache = new WeakMap()
const SOFT_BUCKETS: BucketCache = new WeakMap()

const clipBounds = (b: Bounds, r: Bounds): Bounds | null => {
  const out = { x0: Math.max(b.x0, r.x0), y0: Math.max(b.y0, r.y0), x1: Math.min(b.x1, r.x1), y1: Math.min(b.y1, r.y1) }
  return out.x1 > out.x0 && out.y1 > out.y0 ? out : null
}

/**
 * buildTerrain 이 기호 자리를 고르는 판정 함수 묶음 — 페이즈 바탕(periodTerrain)이 더하는 기호도 같은 함수로 자리를 고른다.
 * buildTerrain 이 이것을 그대로 쓰므로 판정과 부동소수 셈의 차례가 바탕과 같다
 */
export function terrainProbe({ avoid, pins = [], labelBoxes, blocked: blockedAt }: TerrainInput, lod?: TerrainLod): TerrainProbe {
  const raster: TerrainGeo = lod?.geo ?? getTerrainRaster()
  /** 기호 크기·간격·여백 배수 — 세계 지도는 1 */
  const g = lod?.g ?? 1
  const claimed = lod?.claimed
  const blocked = claimed ? (x: number, y: number) => blockedAt(x, y) || claimed(x, y) : blockedAt
  /** 기호 모양은 기호 공간에서 그린다 — 세계 지도(g = 1)는 지도 단위 그대로 */
  const gx = (v: number) => v / g
  const seedOf = (name: string) => hashSeed(lod ? `${name}:${lod.seed}` : name)
  const avoidAt = bucketsOf(AVOID_BUCKETS, avoid, () => avoid.map(pointBox))
  const near = (x: number, y: number, r: number) =>
    avoidAt.some(x - r, y - r, x + r, y + r, (i) => (avoid[i][0] - x) ** 2 + (avoid[i][1] - y) ** 2 < r * r)
  /** 낮은 기호의 자리 — 마커 여백에 더해 카드 표시 둘레도 비운다 */
  const PIN_R = 8 * g
  const pinAt = bucketsOf(PIN_BUCKETS, pins, () => pins.map(pointBox))
  const freeLow = (x: number, y: number, r: number) =>
    free(x, y, r) && !pinAt.some(x - PIN_R, y - PIN_R, x + PIN_R, y + PIN_R, (i) => (pins[i][0] - x) ** 2 + (pins[i][1] - y) ** 2 < PIN_R * PIN_R)
  const labelAt = bucketsOf(LABEL_BUCKETS, labelBoxes, () => labelBoxes)
  const inLabel = (x: number, y: number, m: number) =>
    labelAt.some(x - m, y - m, x + m, y + m, (i) => {
      const b = labelBoxes[i]
      return x > b.x0 - m && x < b.x1 + m && y > b.y0 - m && y < b.y1 + m
    })
  const whole: Bounds = lod?.region ?? { x0: 0, y0: 0, x1: MAP_WIDTH, y1: MAP_HEIGHT }
  /** 놓인 땅의 크기에 맞춘 여백 배율 (큰 땅 1, 작은 섬일수록 작다) */
  const fit = (x: number, y: number) => {
    const li = raster.landAt(x, y)
    return li < 0 ? 1 : Math.max(0.3, Math.min(1, raster.landDepth(li) / FULL_DEPTH))
  }
  const onLand = (x: number, y: number, coast: number) =>
    raster.landAt(x, y) >= 0 && raster.coastDistance(x, y) > coast * g * fit(x, y) && !raster.waterAt(x, y)
  // 산 기호는 점 위로 솟으니 조금 위쪽도 본다
  const freeTall = (x: number, y: number, r: number) => !near(x, y, r * g * fit(x, y)) && !blocked(x, y) && !blocked(x, y - 7 * g)
  const free = (x: number, y: number, r: number) => !near(x, y, r * g * fit(x, y)) && !blocked(x, y)
  return { g, gx, seedOf, whole, onLand, near, free, freeTall, freeLow, inLabel, blocked, claimed, fit, raster }
}

/** 뺀 기호가 등록할 칸이 없는 것 — 산·언덕·대지·수정은 칸이 아니라 y 띠(mountains)로 묶는다 */
const NO_TILES: readonly Tiler[] = []

/**
 * 지형 기호를 만든다. phase(세계 지도) 또는 lod.phase(깊은 확대 칸)가 있으면 그 페이즈 바탕을 바로 적용한다 —
 * 바탕 기호는 모양을 만든 뒤(rand 를 다 쓴 뒤) 판정해 남기거나 빼거나 죽은 나무로 바꾸고(emit), 더하는 기호는 페이즈가 따로 시드해 끝에 붙이며,
 * 숨기는 선은 긋지 않는다. 페이즈가 없으면 예전과 바이트까지 같다.
 * 세계 지도 바탕(lod·phase 없이)은 기록도 남긴다(terrainLogOf) — 페이즈를 켜면 이것을 다시 돌리지 않고 그 기록으로 다시 잇는다(periodTerrain.ts 의 replayTerrain, 결과는 같다)
 */
export function buildTerrain(input: TerrainInput, lod?: TerrainLod, phase: TerrainPhase | undefined = lod?.phase): TerrainLayers {
  const { profileFor, patches, lines, coastBreaks, cliffDepth, wetAt } = input
  const probe = terrainProbe(input, lod)
  const { raster, g, blocked, gx, seedOf, near, freeLow, inLabel, whole, fit, onLand, freeTall, free } = probe
  const fine = g !== 1
  // 세계 지도 바탕(페이즈 없이)이면 기록한다 — 페이즈를 켤 때 다시 돌리지 않고 이 기록을 다시 잇는다 (periodTerrain.ts 의 replayTerrain)
  const rec = !lod && !phase ? recorder() : undefined
  /** 덮어쓰는 영역의 배치 범위 — 잘게 뿌릴 때는 그 칸과 겹치는 부분만 (세계 지도는 영역 상자 그대로 — 지도 밖으로 나간 영역의 배치가 바뀌지 않게) */
  const within = (b: Bounds) => (lod ? clipBounds(b, lod.region) : b)
  // 뒤에 오는 영역이 앞을 덮으므로 뒤에서부터 찾는다
  const hard = patches.filter((p) => !p.soft).reverse()
  const soft = patches.filter((p) => p.soft)
  const hardIndex = bucketsOf(HARD_BUCKETS, patches, () => hard.map((p) => p.bounds))
  const softIndex = bucketsOf(SOFT_BUCKETS, patches, () => soft.map((p) => p.bounds))
  /** (x, y) 칸에 걸친 영역 (원래 순서) — 그 칸 밖 영역은 inPatch 가 어차피 거짓이다 */
  const hardNear = (x: number, y: number) => hardIndex.at(x, y)
  const softNear = (x: number, y: number) => softIndex.at(x, y)
  const hardAt = (x: number, y: number) => {
    for (const i of hardNear(x, y)) if (inPatch(hard[i], x, y)) return hard[i]
    return undefined
  }
  const softPlainAt = (x: number, y: number) => softNear(x, y).some((i) => soft[i].kind === 'plain' && inPatch(soft[i], x, y))
  /**
   * 기호 하나가 차지하는 자리가 영역 경계를 넘지 않는가 — 가운데와 둘레 네 점이 모두 같은 덮어쓰는 영역(또는 모두 영역 밖)이어야 한다.
   * 장소 데이터의 협곡 단애가 메사 영역으로, 대륙의 산이 트인 땅(plain) 영역으로 넘어 들어가지 않게
   */
  const sameOwner = (x: number, y: number, rx: number, up: number, down = 0, key: (p: TerrainPatch | undefined) => unknown = (p) => p) => {
    const h = key(hardAt(x, y))
    rx *= g
    up *= g
    down *= g
    return key(hardAt(x - rx, y - up * 0.4)) === h && key(hardAt(x + rx, y - up * 0.4)) === h && key(hardAt(x, y - up)) === h && key(hardAt(x, y + down)) === h
  }
  /**
   * 산 기호의 주인 — 산 영역끼리, 그리고 산 영역과 영역 밖(대륙의 산 바탕)은 같은 주인으로 친다. 산줄기 영역이 산 골짜기 영역 위에
   * 겹친 곳(Akoum 의 이빨)에서 경계를 따라 산 없는 띠가 생기지 않게. 숲·트인 땅 같은 다른 영역으로는 여전히 넘어가지 않는다
   */
  const peakOwner = (p: TerrainPatch | undefined) => (!p || p.kind === 'mountain' ? 'peak' : p)
  /** 이 영역의 기호를 그 자리에 그릴지 — 덮어쓰는 영역은 맨 위일 때만, soft 는 덮어쓰는 영역이 없을 때만 */
  const owns = (p: TerrainPatch, x: number, y: number) => (p.soft ? inPatch(p, x, y) && !hardAt(x, y) : hardAt(x, y) === p)
  // 덮어쓰는 영역은 작거나 가늘 수 있어 시작점을 여러 번 찾는다 — 해안을 따라 가는 띠는 상자 대부분이 바다·해안 여백이라
  // 몇 번으로는 띠 조각이 시작점을 못 얻어 통째로 빈다 (soft 는 예전 배치 그대로)
  const tries = (p: TerrainPatch) => (p.soft ? 1 : 40)

  // --- 산·언덕·대지·수정 — y 띠로 묶어 앞(아래)의 기호가 뒤를 가린다 ---
  const rand = mulberry32(seedOf('mountains'))
  const broad = valueNoise2D(hashSeed('relief-broad'), 70)
  const fineNoise = valueNoise2D(hashSeed('relief-fine'), 26)
  const relief = (x: number, y: number): { density: number; style: PeakStyle; crystal: number } => {
    const profile = profileFor(landmasses[raster.landAt(x, y)], x, y)
    const peak: PeakStyle = profile.snow ? 'snow' : 'mountain'
    const h = hardAt(x, y)
    // 덮어쓰는 영역의 밀도는 그 자리의 밀도를 정한다 (대륙·장소 범위보다 낮출 수도 있다)
    if (h) {
      if (h.kind === 'mountain') return { density: h.density ?? AREA_DENSITY.mountain!, style: peak, crystal: 0 }
      if (h.kind === 'hills') return { density: h.density ?? AREA_DENSITY.hills!, style: 'hill', crystal: 0 }
      return { density: profile.mountains * (UNDER_RELIEF[h.kind] ?? 0), style: profile.hills ? 'hill' : peak, crystal: 0 }
    }
    const inRing = profile.ring ? isInRing(profile.ring, raster.coastDistance(x, y)) : false
    let density = profile.mountains
    // 고리 산맥은 숲·늪보다 앞선다 (Tazeem: 숲은 Bulwark 안쪽에 있다). 언덕 땅을 두른 고리(Murasa)는 띠 안쪽이 언덕
    if (inRing) density = 0.95
    else if (profile.ring && !profile.hills) density *= 0.1
    for (const p of soft) {
      if (inRing || !inPatch(p, x, y)) continue
      if (p.kind === 'mountain') density = Math.max(density, 0.92)
      else if (p.kind === 'plateau') density = Math.max(density, 0.5)
      else if (p.kind === 'canyon') density *= 0.35
      else if (p.kind === 'plain') density = 0
      else density *= 0.15
    }
    if (!inRing && raster.forestAt(x, y)) density *= 0.12
    return { density, style: profile.snow ? 'snow' : profile.hills && !inRing ? 'hill' : 'mountain', crystal: profile.crystal ?? 0 }
  }
  const glyphs: Glyph[] = []
  // 덮어쓰는 산·언덕 영역은 영역 전체에 고르게 — 넓은 잡음으로 솎으면 작은 영역(숲 가운데의 언덕)이 통째로 빌 수 있다
  const jitter = valueNoise2D(hashSeed('relief-area'), 5)
  /** 봉우리 하나가 설 자리인가 (밀도는 보지 않는다) */
  const peakSpot = (x: number, y: number) => {
    // 언덕 영역의 기호는 낮고 작아 마커·경계 여백을 줄인다 (숲 가운데 작은 석회암 언덕에도 언덕이 서게)
    const low = hardAt(x, y)?.kind === 'hills'
    return onLand(x, y, 14) && freeTall(x, y, low ? 10 : 16) && (low ? sameOwner(x, y, 6, 5) : sameOwner(x, y, 8, 12, 0, peakOwner))
  }
  const peakAccept = (x: number, y: number) => {
    if (!peakSpot(x, y)) return false
    const h = hardAt(x, y)
    const low = h?.kind === 'hills'
    const noise = h && (h.kind === 'mountain' || low) ? jitter(x, y) : broad(x, y) * 0.75 + fineNoise(x, y) * 0.25
    return noise < relief(x, y).density * 0.95
  }
  // 시작점은 칸마다 세 번까지 찾는다 — 한 번이면 산 영역 따위로 둘레와 끊긴 숲·산 조각이 시작점을 하나도 못 얻어 통째로 빌 수 있다
  const mountainPoints = poissonDisk(whole, 13 * g, rand, (x, y) => peakAccept(x, y), { seedTries: 3 })
  // 덮어쓰는 산·언덕 영역 — 둘레에 산이 없으면(숲 가운데의 언덕 등) 지도 전체 배치의 시작점이 닿지 않아 비기 쉽다. 영역마다 한 번 더 채운다
  const peaks = pointGrid(26 * g)
  for (const p of mountainPoints) peaks.add(p)
  for (const p of hard) {
    if (p.kind !== 'mountain' && p.kind !== 'hills') continue
    const b = within(p.bounds)
    if (!b) continue
    const pr = mulberry32(seedOf(`${p.kind}:${p.x}:${p.y}`))
    const gap = 13 * g
    const more = poissonDisk(b, gap, pr, (x, y) =>
      owns(p, x, y) && peakAccept(x, y) && !peaks.some(x, y, ([px, py]) => (px - x) ** 2 + (py - y) ** 2 < gap * gap), { seedTries: tries(p) })
    for (const q of more) {
      peaks.add(q)
      mountainPoints.push(q)
    }
    // 언덕 영역은 밀도가 낮아도 언덕 하나는 — 좁은 잡음 탓에 작은 영역이 나무만 걷히고 텅 비지 않게
    if (p.kind === 'hills' && (p.density ?? 1) > 0 && !mountainPoints.some(([x, y]) => owns(p, x, y))) {
      for (const q of poissonDisk(b, gap, pr, (x, y) => owns(p, x, y) && peakSpot(x, y), { max: 1, seedTries: tries(p) })) {
        peaks.add(q)
        mountainPoints.push(q)
      }
    }
  }
  // 페이즈 — 바탕 봉우리 자리가 다 정해진 뒤 한 번. 더하는 기호(언덕·수정 등)가 바탕 봉우리를 비켜 서고, 판정은 바탕 기호를 내보낼 때마다 묻는다.
  // 더한 봉우리는 바탕 봉우리 격자(peaks)에 넣지 않는다 — 넣으면 숲·툰드라의 자리(forestUnder·reliefTundra)가 바뀐다
  const plan: PhasePlan | undefined = phase?.prepare(
    probe,
    (x, y, r) => peaks.some(x, y, ([px, py]) => (px - x) ** 2 + (py - y) ** 2 < r * r),
  )
  /** 페이즈 층 — 죽은 나무는 바탕 나무를 내보낼 때, 무늬는 계획이 더한 것을 끝에 */
  const period = plan ? { dust: tiler(undefined, '', true), chalk: tiler(undefined, '', true), drybed: tiler(undefined, '', true), deadwood: tiler(undefined, '', true) } : undefined
  /**
   * 바탕 기호 하나를 내보낸다 — 모양 문자열을 만든 뒤(rand 를 다 쓴 뒤) 부르므로, 판정이 무엇이든 뒤 기호의 자리·모양은 바탕과 같다.
   * put: 그 기호를 칸·산 띠에 넣는다. at: put 이 넣는 칸들 — 뺀 기호는 그 칸만 등록한다(touch). 페이즈가 없으면 put 만 부른다
   * (세계 지도 바탕이면 그 기호의 종류·자리와 넣은 조각을 기록기에 적는다 — 문자열은 그대로다)
   */
  const emit = (kind: ScatterKind, x: number, y: number, put: () => unknown, at: readonly Tiler[]) => {
    if (!plan) {
      rec?.symbol(kind, x, y)
      put()
      // 산 띠의 기호는 칸이 아니라 glyphs 에 하나 — 그 차례를 적는다
      if (rec && at === NO_TILES) rec.glyph()
      return
    }
    const v = plan.verdict(kind, x, y)
    if (v === 0) {
      put()
      return
    }
    for (const t of at) t.touch(x, y)
    // 죽은 나무는 나무·맹그로브 자리에만 — 다른 기호의 2 는 뺌과 같다
    if (v === 2 && period && (kind === 'tree' || kind === 'mangrove')) period.deadwood.add(x, y, plan.dead(x, y), K_DEADWOOD)
  }
  // 대륙의 산 가운데 일부는 수정 첨탑 (Akoum) — 배치와 따로 굴리는 난수라 산 자리는 그대로다
  const crystalRand = mulberry32(seedOf('relief-crystal'))
  for (const [x, y] of mountainPoints) {
    const r = relief(x, y)
    if (r.style === 'mountain' && r.crystal > 0 && crystalRand() < r.crystal) {
      const c = crystalGlyph(gx(x), gx(y), crystalRand, true)
      emit('crystal-spire', x, y, () => glyphs.push({ x, y, k: kindCode('crystal-spire'), fill: '', crystal: c.fill, ridge: '', hatch: '', crystalRidge: c.ridge, crystalHatch: c.hatch }), NO_TILES)
      continue
    }
    const glyph = r.style === 'snow' ? snowGlyph(gx(x), gx(y), rand) : r.style === 'hill' ? hillGlyph(gx(x), gx(y), rand) : mountainGlyph(gx(x), gx(y), rand)
    const kind = r.style === 'mountain' ? 'peak' : r.style
    emit(kind, x, y, () => glyphs.push({ x, y, k: kindCode(kind), crystal: '', crystalRidge: '', crystalHatch: '', ...glyph }), NO_TILES)
  }
  // 대지·수정 첨탑 — 그 영역 안에만
  for (const p of hard) {
    if (p.kind !== 'mesa' && p.kind !== 'crystal') continue
    const b = within(p.bounds)
    if (!b) continue
    const mesa = p.kind === 'mesa'
    const density = p.density ?? AREA_DENSITY[p.kind]!
    const small = !mesa && density < CRYSTAL_SMALL_BELOW
    const pr = mulberry32(seedOf(`${p.kind}:${p.x}:${p.y}`))
    // 대지 기호의 좌우·위 여백은 영역이 작으면 영역에 맞춰 줄인다 — 작은 대지(Kazandu 의 남은 대지 조각)에도 하나는 서게
    const w = p.bounds.x1 - p.bounds.x0
    const h = p.bounds.y1 - p.bounds.y0
    const rx = mesa ? Math.min(10, w * 0.36 / g) : 4
    const up = mesa ? Math.min(8, h * 0.4 / g) : 8
    const pts = poissonDisk(b, (mesa ? 22 : small ? 12 : 11) * g, pr, (x, y) =>
      owns(p, x, y) && onLand(x, y, mesa ? 11 : 7) && freeTall(x, y, 14) && sameOwner(x, y, rx, up) &&
      fineNoise(x, y) * 0.7 + broad(x, y) * 0.3 < density, { seedTries: tries(p) })
    for (const [x, y] of pts) {
      if (mesa) {
        const m = mesaGlyph(gx(x), gx(y), pr)
        emit('mesa', x, y, () => glyphs.push({ x, y, k: kindCode('mesa'), crystal: '', crystalRidge: '', crystalHatch: '', ...m }), NO_TILES)
      } else {
        const c = crystalGlyph(gx(x), gx(y), pr, small)
        emit('crystal', x, y, () => glyphs.push({ x, y, k: kindCode('crystal'), fill: '', crystal: c.fill, ridge: '', hatch: '', crystalRidge: c.ridge, crystalHatch: c.hatch }), NO_TILES)
      }
    }
  }
  // 페이즈가 더한 봉우리는 바탕 뒤에 — 안정 정렬이라 같은 y 면 바탕 기호 뒤에 선다
  if (plan) for (const p of plan.peaks) glyphs.push(p)
  rec?.sortGlyphs(glyphs)
  glyphs.sort((a, b) => a.y - b.y)
  // 같은 띠 안에서는 겹침이 적어, 띠 단위로만 앞뒤를 가려도 충분하다
  const mountains = bandGlyphs(glyphs, 16 * g)
  /** 이 자리가 봉우리 기호에 가려지는가 — 봉우리는 밑동(점)에서 위로 솟고 좌우로 퍼진다 */
  const underPeak = (x: number, y: number) =>
    peaks.some(x, y, ([px, py]) => Math.abs(px - x) < 7 * g && y > py - 12 * g && y < py + 3 * g)

  // --- 숲: 추출한 숲 영역 + 숲 영역 데이터 ---
  const treeRand = mulberry32(seedOf('trees'))
  const treeOk = (x: number, y: number) => onLand(x, y, 6) && free(x, y, 11) && !blocked(x, y - 3 * g)
  // 고리 산맥 띠와 그 바깥 해변에는 나무를 두지 않는다 (덮어쓰는 숲 영역은 예외)
  const ringClear = (x: number, y: number) => {
    const ring = profileFor(landmasses[raster.landAt(x, y)], x, y).ring
    return !ring || raster.coastDistance(x, y) > ring[1]
  }
  const thin = valueNoise2D(hashSeed('trees-between-peaks'), 9)
  /**
   * 팬 지도 숲 위의 덮어쓰는 영역 — 산 영역은 숲 채색을 남기고 봉우리 사이에 드문 나무를 둔다 (Skyfang: 'covered in forests').
   * 언덕 영역(Bala Ged 의 석회암 언덕)은 채색만 남기고 언덕이 나무를 대신한다. 나머지 영역(늪·트인 땅·대지 등)은 나무를 걷어 낸다
   */
  const forestUnder = (x: number, y: number) => {
    const h = hardAt(x, y)
    if (!h) return !softPlainAt(x, y) && ringClear(x, y)
    return h.kind === 'mountain' && thin(x, y) < 0.55 && !underPeak(x, y)
  }
  const treeGap = 8.5 * g
  const treePoints = [
    ...poissonDisk(whole, treeGap, treeRand, (x, y) => raster.forestAt(x, y) && treeOk(x, y) && forestUnder(x, y) && sameOwner(x, y, 3.5, 4), { seedTries: 3 }),
    ...patches
      .filter((p) => p.kind === 'forest')
      .flatMap((p) => {
        const b = within(p.bounds)
        return b
          ? poissonDisk(b, treeGap, treeRand, (x, y) =>
              owns(p, x, y) && treeOk(x, y) && (p.soft ? sameOwner(x, y, 3.5, 4) && !raster.forestAt(x, y) && !softPlainAt(x, y) && ringClear(x, y) : true), { seedTries: tries(p) })
          : []
      }),
  ]
  const crowns = tiler(rec, 'crowns', true)
  const trunks = tiler(rec, 'trunks', true)
  const treeTiles = [crowns, trunks]
  for (const [x, y] of treePoints) {
    const t = treeGlyph(gx(x), gx(y), treeRand)
    emit('tree', x, y, () => {
      crowns.add(x, y, t.crown, K_TREE)
      trunks.add(x, y, t.trunk, K_TREE)
    }, treeTiles)
  }

  // --- 늪: 물결 위의 풀 포기 / 맹그로브: 버팀뿌리 나무와 풀포기 ---
  const marsh = tiler(rec, 'marsh', true)
  const marshTiles = [marsh]
  const mangroveTiles = [crowns, trunks, marsh]
  const marshRand = mulberry32(seedOf('marsh'))
  const wet = (x: number, y: number) => raster.landAt(x, y) < 0 || raster.waterAt(x, y)
  for (const p of patches) {
    if (p.kind !== 'swamp' && p.kind !== 'mangrove') continue
    const b = within(p.bounds)
    if (!b) continue
    if (p.kind === 'swamp') {
      // 덮어쓰는 늪 영역은 조금 촘촘히 — 숲 가운데의 작은 늪(Bala Ged)도 늪으로 읽히게
      // 풀포기는 낮아 마커 바로 곁까지 와도 마커를 가리지 않는다 — 마커를 감싼 작은 늪(Prison of Omnath, Crypt of Agadeem)도 늪으로 보이게
      // 작은 섬의 늪(Agadeem)은 땅 크기에 맞춰 더 촘촘히 — 협곡·마커 여백을 빼고 남은 좁은 땅에도 풀포기가 여럿 서게.
      // 장소 범위의 늪(soft)도 시작점을 여러 번 찾는다 — 가운데 마커·기호 여백에 한 번 빗나가면 늪이 통째로 빈다 (Hanging Swamp)
      const pts = poissonDisk(b, (p.soft ? 15 : 12 * Math.max(0.6, fit(p.x, p.y))) * g, marshRand, (x, y) =>
        owns(p, x, y) && raster.landAt(x, y) >= 0 && !raster.waterAt(x, y) && raster.coastDistance(x, y) > 6 * g * fit(x, y) &&
        freeLow(x, y, p.soft ? 12 : 4) && sameOwner(x, y, 5, 5), { seedTries: p.soft ? 8 : tries(p) })
      for (const [x, y] of pts) {
        const m = marshGlyph(gx(x), gx(y), marshRand)
        emit('marsh', x, y, () => {
          for (const d of m) marsh.add(x, y, d, K_MARSH)
        }, marshTiles)
      }
    } else {
      // 영역 안이면 물 위에도 심는다 (Sunder Bay 의 Harabaz 숲은 바닷속에 뿌리를 박았다) — 물 위 나무는 라벨·마커를 비켜 둔다
      const pts = poissonDisk(b, 10 * g, marshRand, (x, y) => {
        if (!owns(p, x, y) || !free(x, y, 11) || blocked(x, y - 5 * g)) return false
        if (wet(x, y)) return !inLabel(x, y, 4 * g) && !near(x, y, 14 * g)
        return raster.coastDistance(x, y) > 2.5 * g
      }, { seedTries: tries(p) })
      for (const [x, y] of pts) {
        if (wet(x, y) || marshRand() < 0.6) {
          const m = mangroveGlyph(gx(x), gx(y), marshRand)
          emit('mangrove', x, y, () => {
            crowns.add(x, y, m.crown, K_MANGROVE)
            trunks.add(x, y, m.roots, K_MANGROVE)
            marsh.add(x, y, m.water, K_MANGROVE)
          }, mangroveTiles)
        } else {
          const m = marshGlyph(gx(x), gx(y), marshRand)
          emit('marsh', x, y, () => {
            for (const d of m) marsh.add(x, y, d, K_MARSH)
          }, marshTiles)
        }
      }
    }
  }

  // --- 빙원: 짧은 가로 획 ---
  const ice = tiler(rec, 'ice', true)
  const iceTiles = [ice]
  const iceRand = mulberry32(seedOf('ice'))
  for (const p of patches.filter((q) => q.kind === 'ice')) {
    const b = within(p.bounds)
    if (!b) continue
    const pts = poissonDisk(b, 11 * g, iceRand, (x, y) =>
      owns(p, x, y) && raster.landAt(x, y) >= 0 && raster.coastDistance(x, y) > 5 * g * fit(x, y) && freeLow(x, y, 10) && sameOwner(x, y, 4, 1), { seedTries: tries(p) })
    for (const [x, y] of pts) {
      const d = `M${f(gx(x))} ${f(gx(y))}l${f(3 + iceRand() * 3)} 0`
      emit('ice', x, y, () => ice.add(x, y, d, kindCode('ice')), iceTiles)
    }
  }

  // --- 협곡: 흐름장을 따라 놓인 짧은 단애선 — 한쪽에 빗금 ---
  const canyons = tiler(rec, 'canyons', true)
  const canyonTiles = [canyons]
  const canyonRand = mulberry32(seedOf('canyons'))
  const flow = valueNoise2D(hashSeed('canyon-flow'), 140)
  for (const p of patches.filter((q) => q.kind === 'canyon')) {
    const b = within(p.bounds)
    if (!b) continue
    const thinInForest = canyonInForest(p, owns)
    const thinRand = mulberry32(seedOf(`canyon-thin:${p.x}:${p.y}`))
    const pts = poissonDisk(b, 17 * g, canyonRand, (x, y) =>
      owns(p, x, y) && raster.landAt(x, y) >= 0 && !raster.waterAt(x, y) && raster.coastDistance(x, y) > 12 * g * fit(x, y) &&
      free(x, y, 14) && sameOwner(x, y, 10, 6, 6), { seedTries: tries(p) }).filter(([x, y]) => !thinInForest || !raster.forestAt(x, y) || thinRand() < 0.3)
    for (const [x, y] of pts) {
      const c = canyonGlyph(gx(x), gx(y), flow(x, y) * Math.PI * 2.4, canyonRand)
      emit('canyon', x, y, () => {
        for (const d of c) canyons.add(x, y, d, kindCode('canyon'))
      }, canyonTiles)
    }
  }

  // --- 용암 들판: 흐름 획과 갈라진 껍질 / 툰드라: 드문 풀포기와 서리 점 ---
  const lava = tiler(rec, 'lava', true)
  const tundra = tiler(rec, 'tundra', true)
  const frost = tiler(rec, 'frost', true)
  const lavaTiles = [lava]
  const tundraTiles = [tundra, frost]
  const lavaRand = mulberry32(seedOf('lava'))
  const lavaFlow = valueNoise2D(hashSeed('lava-flow'), 60)
  for (const p of patches) {
    if (p.kind !== 'lava' && p.kind !== 'tundra') continue
    const b = within(p.bounds)
    if (!b) continue
    if (p.kind === 'lava') {
      const pts = poissonDisk(b, 8.5 * g, lavaRand, (x, y) => owns(p, x, y) && onLand(x, y, 4) && freeLow(x, y, 10), { seedTries: tries(p) })
      for (const [x, y] of pts) {
        const d = lavaGlyph(gx(x), gx(y), lavaFlow(x, y) * Math.PI * 2.2, lavaRand)
        emit('lava', x, y, () => lava.add(x, y, d, kindCode('lava')), lavaTiles)
      }
    } else {
      const spacing = (14 / Math.sqrt(p.density ?? 1)) * g
      const pts = poissonDisk(b, spacing, lavaRand, (x, y) => owns(p, x, y) && onLand(x, y, 4) && freeLow(x, y, 10), { seedTries: tries(p) })
      for (const [x, y] of pts) {
        const [tuft, dots] = tundraGlyph(gx(x), gx(y), lavaRand)
        emit('tundra', x, y, () => {
          tundra.add(x, y, tuft, K_TUNDRA)
          frost.add(x, y, dots, K_TUNDRA)
        }, tundraTiles)
      }
    }
  }
  // 대륙 전체가 툰드라인 곳(Sejiri) — 영역 밖 봉우리 사이 땅에 더 성기게. 덮어쓰는 영역 안은 그 영역의 기호만
  const tundraRand = mulberry32(seedOf('relief-tundra'))
  const reliefTundra = poissonDisk(whole, 19 * g, tundraRand, (x, y) => {
    const li = raster.landAt(x, y)
    if (li < 0 || !profileFor(landmasses[li], x, y).tundra) return false
    return onLand(x, y, 12) && freeLow(x, y, 12) && !hardAt(x, y) && !raster.forestAt(x, y) && !underPeak(x, y) && !blocked(x, y - 2 * g)
  }, { seedTries: 3 })
  for (const [x, y] of reliefTundra) {
    const [tuft, dots] = tundraGlyph(gx(x), gx(y), tundraRand)
    emit('tundra', x, y, () => {
      tundra.add(x, y, tuft, K_TUNDRA)
      frost.add(x, y, dots, K_TUNDRA)
    }, tundraTiles)
  }
  // 페이즈가 더한 늪 풀포기와 무늬 — 각 칸 묶음의 끝에 (바탕 칸의 차례는 그대로다)
  if (plan && period) {
    for (const [x, y, d] of plan.marsh) marsh.add(x, y, d, K_MARSH)
    for (const [x, y, d] of plan.period.dust) period.dust.add(x, y, d, kindCode('dust'))
    for (const [x, y, d] of plan.period.chalk) period.chalk.add(x, y, d, kindCode('chalk'))
    for (const [x, y, d] of plan.period.drybed) period.drybed.add(x, y, d, kindCode('drybed'))
  }

  const layers: TerrainLayers = {
    mountains,
    trees: { crowns: crowns.paths(), trunks: trunks.paths() },
    marsh: marsh.paths(),
    ice: ice.paths(),
    cliffs: [],
    waterCliffs: [],
    canyons: canyons.paths(),
    lava: lava.paths(),
    tundra: tundra.paths(),
    frost: frost.paths(),
    gorgeFloors: '',
  }
  if (period) layers.period = { dust: period.dust.paths(), chalk: period.chalk.paths(), drybed: period.drybed.paths(), deadwood: period.deadwood.paths() }
  // 잘게 뿌릴 때는 흩뿌린 기호만 — 절벽·협곡 선은 세계 지도 것이 깊은 배율에서도 그대로 이어진다
  if (fine) return layers

  // --- 절벽 해안과 절벽·협곡 선 ---
  const cliffs = tiler(rec, 'cliffs')
  // 물가 절벽 — 호수·바다를 내려다보는 단애는 물 칠 위에 그린다
  const waterCliffs = tiler(rec, 'waterCliffs')
  const breakBoxes = coastBreaks.map((b) => ({ ...b, box: ringBounds(b.line) }))
  const broken = (x: number, y: number) =>
    breakBoxes.some(({ line, r, box }) =>
      x > box.x0 - r && x < box.x1 + r && y > box.y0 - r && y < box.y1 + r && distanceToPolyline(x, y, line, false) < r)
  rec?.line(-1)
  for (const land of landmasses) {
    const [cx, cy] = land.ring[0]
    if (profileFor(land, cx, cy).cliffs) {
      // 안쪽으로 민 점이 해안선(같은 선)에서 깊이만큼 떨어져 있어야 한다 — 모자라면 다른 변을 민 선과 엇갈리는 자리
      const dist = nearDistance(land.smooth, CLIFF_DEPTH * 2)
      cliffHachure(land.smooth, hashSeed(`cliff:${land.id}`), cliffs, (x, y) => dist(x, y) >= CLIFF_DEPTH * 0.97, broken)
    }
  }
  let gorgeFloors = ''
  for (const [li, l] of lines.entries()) {
    // 페이즈가 숨기는 선 (그 무렵 아직 없던 협곡 등) — 선마다 시드가 따로라 다른 선의 빗금은 그대로다
    if (phase?.hideLines.has(l.id)) continue
    rec?.line(li)
    const seed = hashSeed(`line:${l.id}`)
    if (l.kind === 'cliff') {
      const depth = cliffDepth(l)
      // 빗금 쪽에 물이 있으면 물가 절벽 — 물 칠 위 층에, 빗금은 물가에 닿지 않게
      const pts = resample(l.line, 4, Boolean(l.closed))
      const normals = rightNormals(pts, Boolean(l.closed))
      const byWater = pts.some(([x, y], i) => wetAt(x + normals[i][0] * (depth + 2), y + normals[i][1] * (depth + 2)))
      scarp(l.line, Boolean(l.closed), 1, depth, seed, byWater ? waterCliffs : cliffs, byWater ? wetAt : undefined)
    } else {
      const floor = gorge(l.line, l.width ?? 8, seed, cliffs)
      rec?.gorge(li, gorgeFloors.length, floor.length)
      gorgeFloors += floor
    }
  }

  const out = { ...layers, cliffs: cliffs.paths(), waterCliffs: waterCliffs.paths(), gorgeFloors }
  if (rec) logs.set(out, rec.done(lines.map((l) => l.id)))
  return out
}

/** 바탕 지형의 층 — 페이즈 층(period) 말고는 모두 바탕에 있다 */
const BASE_FIELDS = ['mountains', 'trees', 'marsh', 'ice', 'cliffs', 'waterCliffs', 'canyons', 'lava', 'tundra', 'frost', 'gorgeFloors'] as const

/**
 * 개발 중 단언 — 아무것도 바꾸지 않는 페이즈(모두 남김, 더하는 것·숨기는 선 없음)로 다시 만든 지형이 바탕(base)과 문자열까지 같아야 한다.
 * 기호를 내보내는 자리(emit)·칸 등록(touch)·선 숨기기가 바탕을 건드리지 않는지 본다. 페이즈 조각(period.ts)은 바탕의 기록이 없을 때 첫 페이즈를 켜며 한 번 부르고
 * (기록이 있으면 아무것도 바꾸지 않는 다시 잇기를 본다), scripts/qa/period-check.mjs 는 세계 지도와 깊은 확대 칸에서 부른다.
 * 다른 층 이름을 내고(같으면 빈 배열) console.error 로 알린다. 빌드에서는 몸이 빠져 늘 빈 배열이다
 */
export function assertNeutralPhase(input: TerrainInput, base: TerrainLayers, lod?: TerrainLod): string[] {
  if (!import.meta.env.DEV) return []
  const neutral: TerrainPhase = {
    key: '',
    hideLines: new Set(),
    prepare: () => ({ verdict: () => 0, peaks: [], marsh: [], period: { dust: [], chalk: [], drybed: [] }, dead: () => '' }),
  }
  const again = buildTerrain(input, lod, neutral)
  const bad: string[] = BASE_FIELDS.filter((k) => JSON.stringify(again[k]) !== JSON.stringify(base[k]))
  // 바뀌는 것이 없으면 페이즈 층도 비어 있어야 한다
  if (!again.period || Object.values(again.period).some((l) => l.length)) bad.push('period')
  if (bad.length) console.error(`terrain.ts: 아무것도 바꾸지 않는 페이즈로 다시 만든 지형이 바탕과 다르다 — ${bad.join(', ')}`)
  return bad
}

/**
 * 대부분 트인 협곡 지대(Makindi)가 가장자리에서 팬 지도 숲에 걸치면, 숲 안의 단애는 드물게 — 나무 위에 단애가 빽빽하면 어수선하다.
 * 숲이 지붕처럼 덮은 협곡(Kazandu)은 단애가 협곡의 유일한 표시라 그대로 둔다. 영역 전체를 세계 지도 래스터로 재고, 영역마다 한 번만 잰다
 */
const canyonForestCache = new WeakMap<TerrainPatch, boolean>()
function canyonInForest(p: TerrainPatch, owns: (p: TerrainPatch, x: number, y: number) => boolean): boolean {
  const hit = canyonForestCache.get(p)
  if (hit !== undefined) return hit
  const raster = getTerrainRaster()
  let land = 0
  let wooded = 0
  for (let y = p.bounds.y0; y <= p.bounds.y1; y += 6) {
    for (let x = p.bounds.x0; x <= p.bounds.x1; x += 6) {
      if (!owns(p, x, y) || raster.landAt(x, y) < 0) continue
      land++
      if (raster.forestAt(x, y)) wooded++
    }
  }
  const thin = land > 0 && wooded / land < 0.5
  canyonForestCache.set(p, thin)
  return thin
}
