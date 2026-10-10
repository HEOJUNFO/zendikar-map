import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react'
import type { PinnedCard } from '../data/cards'
import { isPlaced, type Continent, type HedronCluster, type Landscape, type Location, type PlacedLocation } from '../data/types'
import { deepRings, forests, inlandWaters, landmassById, landmasses, MAP_HEIGHT, MAP_WIDTH, wetAt, type Landmass } from './geo'
import { chaikin, hashSeed, mulberry32, pointInRing, polylineToPath, ringArea, ringToPath, type Point, type Ring } from './geometry'
import type { ChildMapArt } from './childMapArt'
import { detailBand, fineOverlay, inDetail, loadChildArt, type ChildDetail } from './childDetail'
import { ChildDetailArt, FeatherShapes } from './ChildDetailArt'
import { FIGURE_GROUPS, loadFigureGroup, worldGroups, type FigureArt } from './figures'
import { fineLevelFor, fineScale, useFineTerrain, type FineTile } from './fineTerrain'
import { CHILD_MAP_ICON, CHILD_MAP_ICON_FOLD, MARKER_PATHS, type PointKind } from './glyphs'
import {
  areaFontUnits,
  AREA_TRACKING,
  areaLabelBox,
  areaTextWidth,
  layoutAreaLabels,
  placeLabels,
  pointReserveBox,
  textWidthEm,
  type Anchor,
  type AreaLabelStyle,
  type Box,
  type LabelPlacement,
} from './labels'
import { displayName, type LabelLang, type Selection } from './names'
import { getTerrainRaster, type TerrainRaster } from './raster'
import { coastRipples } from './ripples'
import {
  buildBlockedMask,
  cliffDepth,
  landmarkShapes,
  riverPaths,
  seaMarkPaths,
  shapeRivers,
  type LandmarkShape,
  type RiverPaths,
  type SeaMarkPaths,
} from './landscape'
import {
  buildTerrain,
  makePatch,
  patchPath,
  type AvoidBox,
  type ReliefProfile,
  type TerrainInput,
  type TerrainKind,
  type TerrainLayers,
  type TerrainPatch,
} from './terrain'
import { DEEP_TIER, MAX_ZOOM, MIN_ZOOM, TIER_PX_PER_UNIT, tierFor, type MapView } from './useMapZoom'
import './map.css'

export type { LabelLang, Selection } from './names'

export type MapLandscape = Required<Landscape>

interface Props {
  continents: Continent[]
  locations: Location[]
  hedrons: HedronCluster[]
  /** 바탕 지형 — 지형 영역·강·단애선·한 점 기호·바다 표시 (src/data/landscape) */
  landscape: MapLandscape
  /** 육지 덩어리 위의 한 점이 어느 대륙인지 (발라 게드처럼 덩어리를 나눠 쓰는 경우) */
  continentAt: (landmassId: string, x: number, y: number) => string | null
  selection: Selection | null
  /** 위치가 알려지지 않은 장소를 골랐을 때 그 대륙을 강조한다 */
  highlightContinentId: string | null
  onSelect: (s: Selection | null) => void
  /** 대지 카드(ZEN·WWK·ROE) 가운데 지도에 따로 표시가 있는 것 — 누르면 카드 패널이 열린다 */
  cards: PinnedCard[]
  /** 장소와 하나인 카드 id → 장소 id — 그 카드 표시는 장소의 표시라 장소 이름을 달고, 장소를 고르면 같이 골린다 */
  cardPlaceIds: ReadonlyMap<string, string>
  onSelectCard: (card: PinnedCard) => void
  /** 페이즈 그림 — 카드의 대상을 판타지 지도처럼 그려 넣는다 (페이즈를 끄면 빈 배열) */
  figures: MapFigure[]
  /** 켠 페이즈 (0: 끔, 1, 2, 3) — 지역 상세의 페이즈 그림 받침·빈터를 그 페이즈에 맞춘다 */
  phase: number
  onSelectFigure: (id: string) => void
  /** 지역 상세(자식 지도였던 그림) — 깊이 확대하면 그 자리에 나온다. 그 장소 이름 뒤에 접힌 지도 아이콘을 붙인다 */
  childMaps: readonly ChildDetail[]
  /** 키보드로 마커에 초점이 오면 화면 밖이면 그쪽으로 옮긴다 */
  onFocusPoint: (x: number, y: number) => void
  lang: LabelLang
  view: MapView
  svgRef: React.RefObject<SVGSVGElement | null>
  layerRef: React.RefObject<SVGGElement | null>
}

/**
 * tier 별로 라벨 자리를 잡을 때 쓰는 px/단위 — 각 tier 에서 가장 빽빽한 경우(그 tier 의 최소 배율)로 판정한다.
 * useMapZoom 의 tier 경계와 같고, 0 단계만 이 화면에서 실제로 내려갈 수 있는 최소 배율로 바꿔 쓴다.
 */
const TIER_PX = TIER_PX_PER_UNIT.map((px, i) => (i === 0 ? TIER_PX_PER_UNIT[1] : px))
/** tier 별 값 — 적은 것보다 깊은 tier 는 마지막 값을 그대로 쓴다 */
const perTier = <T,>(values: T[]): T[] => TIER_PX.map((_, i) => values[Math.min(i, values.length - 1)])
/** tier 별로 라벨을 보여 줄 최소 prominence */
const SHOW_FROM = perTier([3, 3, 2, 1, 0])
const POINT_FONT_PX = perTier([14, 15, 14, 13, 13])

/** 카드 라벨은 이름 있는 장소보다 뒤에 자리를 잡는다 (2: 중간 배율부터) */
const CARD_PROMINENCE = 2
/** 카드 기호끼리, 또는 보이는 지점 마커와 화면에서 이만큼(px) 가까우면 그 배율 단계에서는 카드 기호를 숨긴다 */
const CARD_GAP_PX = 11
/** 지도에 그려 넣는 페이즈 그림 하나 — 모양은 figureArt[id] */
export interface MapFigure {
  id: string
  name: string
  nameKo?: string
  /** 카드 세트 코드 (zen, wwk, roe) — 화면 읽기 프로그램에 'ZEN 카드'로 알린다 */
  set: string
  /** 그림의 기준점(발밑·몸 가운데)을 놓을 자리 */
  at: Point
  /** 그림의 가장 긴 변 (지도 단위) */
  size: number
  flip?: boolean
  /** 자리가 이 지도의 추정이면 그 까닭 — 화면 읽기 프로그램에 '자리는 추정'으로만 알린다 */
  estimate?: string
  /** 지역 상세에 사는 작은 대상 — 그 지역 상세가 나오는 배율부터 그린다 */
  childMap?: string
}

/** 페이즈 그림은 화면에서 가장 긴 변이 이만큼(px)은 될 때 그린다 — 사람만 한 대상은 그 지역을 확대해야 보인다 */
const FIGURE_MIN_PX = 14
/** 대륙·바다를 눌렀어도 이 거리(화면 px) 안의 장소·카드·그림은 그것을 누른 것으로 본다 — 손가락은 더 넉넉히 */
const NEAR_SLOP = 12
const NEAR_SLOP_TOUCH = 22
const figureId = (f: MapFigure) => `fig:${f.id}`

/** 불러오는 중이거나 불러온 페이즈 그림 묶음 (못 온 것은 지운다) */
const figureLoads = new Map<string, Promise<Record<string, FigureArt>>>()

/** 그림이 지도에서 차지하는 상자 (지도 단위) */
function figureBox(f: MapFigure, art: FigureArt | undefined): Box | null {
  if (!art) return null
  const [vx, vy, vw, vh] = art.viewBox
  const k = f.size / Math.max(vw, vh)
  const [ax, ay] = art.anchor
  const [l, r] = f.flip ? [vx + vw - ax, ax - vx] : [ax - vx, vx + vw - ax]
  return { x0: f.at[0] - l * k, y0: f.at[1] - (ay - vy) * k, x1: f.at[0] + r * k, y1: f.at[1] + (vy + vh - ay) * k }
}

// 카드 번호는 세트끼리 겹친다(ZEN #227 과 ROE #227) — Scryfall 이름(id)으로 가른다
const cardId = (c: PinnedCard) => `card:${c.id}`

/**
 * 기호가 놓인 땅이 화면에서 이보다 작으면(넓이의 제곱근, px) 그 배율 단계에서는 기호를 그리지 않는다 — 작은 섬을 기호가 덮지 않게.
 * 12px 는 labels.ts 가 기호 하나에 잡아 두는 12×12px 상자다 — 섬이 적어도 기호 한 칸은 되어야 한다.
 * Beyeen(Valakut)은 tier 1(0.3px/단위)에서 53.6 × 0.3 ≈ 16.1px 로 여유가 34% 남짓이다 — 해안선을 다시 뽑으면(extract_geo.py) 확인한다.
 */
const LAND_MIN_PX = 12
/** 육지 덩어리마다 넓이의 제곱근 (지도 단위) */
const landSize = new Map(landmasses.map((l) => [l.id, Math.sqrt(ringArea(l.ring))]))
/** 한 점이 놓인 땅의 크기 — 바다 위면 가릴 땅이 없어 Infinity */
function landSizeAt([x, y]: Point): number {
  const land = landmasses.find((l) => pointInRing(x, y, l.ring))
  return (land && landSize.get(land.id)) ?? Infinity
}

const TERRAIN_PATCH: Partial<Record<NonNullable<Location['terrain']>, TerrainKind>> = {
  forest: 'forest',
  mountain: 'mountain',
  swamp: 'swamp',
  ice: 'ice',
  plateau: 'plateau',
  canyon: 'canyon',
  volcanic: 'mountain',
  plain: 'plain',
}

/**
 * 해안선 획은 짧게 끊어 그린다 — 지도 전체에 걸친 path 하나는 확대할수록 화면 타일마다 꼭짓점을 전부 훑어 래스터가 비싸진다.
 * 이음매는 둥근 끝(.coast)이 메운다
 */
const COAST_PIECE = 120
const coastPiecesOf = (rings: readonly Ring[]) =>
  rings.flatMap((ring) => {
    const pts = [...ring, ring[0]]
    const out: string[] = []
    for (let s = 0; s < pts.length - 1; s += COAST_PIECE) out.push(polylineToPath(pts.slice(s, s + COAST_PIECE + 1)))
    return out
  })

/** 땅·해안·숲·육지 안의 물 모양 — 깊이 확대하면(DEEP_TIER) 한 번 더 다듬은 모양으로 바꾼다 (꺾인 변이 화면에 곧은 선으로 드러나지 않게) */
interface Shapes {
  land: string
  coast: string[]
  forest: string
  inland: string
}
const shapesOf = (lands: readonly Ring[], forestRings: readonly Ring[], inland: readonly Ring[]): Shapes => ({
  land: lands.map(ringToPath).join(''),
  coast: coastPiecesOf(lands),
  forest: forestRings.map(ringToPath).join(''),
  inland: inland.map(ringToPath).join(''),
})
const SHAPES = shapesOf(
  landmasses.map((l) => l.ring),
  forests,
  inlandWaters,
)
/** 지역 상세(자식 지도였던 그림)는 이 모양에 맞춰 그렸다 (geo.ts 의 deepRings) */
let deepShapes: Shapes | null = null
const DEEP_SHAPES = () => {
  if (deepShapes) return deepShapes
  const d = deepRings()
  return (deepShapes = shapesOf(d.lands, d.forests, d.inland))
}
/** 해안 물결선 — 해안에서 이만큼(지도 단위) 떨어진 가는 선. 바깥 선일수록 옅다 */
const RIPPLE_DISTANCES = [26, 16, 8]
// 위쪽은 y -90 부터 북쪽 안개(NorthFog)가 덮어 그보다 위 물결은 만들지 않는다. 워커에서 만들어 첫 화면 뒤에 얹는다
const loadRipples = () =>
  coastRipples(
    landmasses.map((l) => l.smooth),
    RIPPLE_DISTANCES,
    -130,
  )

/** 바다·호수 위 표시 — 얼음 조각, 소용돌이, 암초, 거친 물결 (지도 칸별 조각) */
function SeaMarkLayer({ marks }: { marks: SeaMarkPaths }) {
  const tiles = (ds: string[], className: string) => ds.map((d, i) => <path key={`${className}-${i}`} d={d} className={className} />)
  return (
    <g className="sea-marks" aria-hidden="true">
      {tiles(marks.rough, 'sm-rough')}
      {tiles(marks.currents, 'sm-current')}
      {tiles(marks.floes, 'sm-floe')}
      {tiles(marks.reefCross, 'sm-reef')}
      {tiles(marks.reefDots, 'sm-reef-dot')}
    </g>
  )
}

/** 바탕 지형 데이터에서 오는 채색 — 숲 영역, 용암 들판, 숲 채색을 걷어 내는 트인 땅(plain) */
interface Washes {
  forest: string
  lava: string
  plain: string
}

const SeaAndLand = memo(function SeaAndLand({
  washes,
  seaMarks,
  shapes,
  ripples,
  holeMask,
}: {
  washes: Washes
  seaMarks: SeaMarkPaths
  shapes: Shapes
  /** 해안 물결선 (RIPPLE_DISTANCES 차례) — 워커가 다 만들기 전에는 null */
  ripples: string[][] | null
  /** 지역 상세가 나온 자리에서 바다 표시를 걷어 내는 마스크 (그 그림이 제 물결·소용돌이를 그린다) */
  holeMask?: string
}) {
  // 트인 땅(plain)에서는 팬 지도의 숲 채색도 걷어 낸다 — 그 자리만 가린 마스크로
  const mask = washes.plain ? 'url(#plain-mask)' : undefined
  return (
    <>
      {/* 세로로 아주 긴 화면에서 전체를 볼 때도 지도 위아래 여백까지 바다로 — 넉넉히 덮는다 */}
      <rect className="sea" x={-MAP_WIDTH * 3} y={-MAP_HEIGHT * 3} width={MAP_WIDTH * 7} height={MAP_HEIGHT * 7} />
      <g className="coast-ripples" aria-hidden="true">
        {RIPPLE_DISTANCES.map((d, i) => (
          // 조각 이음매가 겹쳐도 진해지지 않게 투명도 대신 바다색과 섞은 불투명 색으로
          <g key={d} style={{ stroke: `color-mix(in srgb, var(--sea-ink) ${Math.round((0.9 - d / 40) * 100)}%, var(--sea))` }}>
            {ripples?.[i].map((p, j) => (
              <path key={j} d={p} className="ripple-ink" />
            ))}
          </g>
        ))}
      </g>
      <g mask={holeMask}>
        <SeaMarkLayer marks={seaMarks} />
      </g>
      <path d={shapes.land} className="land" />
      <path d={shapes.land} className="shore-shade" clipPath="url(#land-clip)" />
      {washes.plain && (
        <mask id="plain-mask" maskUnits="userSpaceOnUse" x={0} y={-MAP_HEIGHT} width={MAP_WIDTH} height={MAP_HEIGHT * 3}>
          <rect x={0} y={-MAP_HEIGHT} width={MAP_WIDTH} height={MAP_HEIGHT * 3} fill="#fff" />
          <path d={washes.plain} fill="#000" />
        </mask>
      )}
      <g clipPath="url(#land-clip)">
        {/* 팬 지도 숲과 숲 영역이 겹쳐도 더 진해지지 않게 투명도는 묶음에 준다 */}
        <g mask={mask} className="forest-washes">
          <path d={shapes.forest} className="forest-wash" />
          {washes.forest && <path d={washes.forest} className="forest-wash" />}
        </g>
        {washes.lava && <path d={washes.lava} className="lava-wash" />}
      </g>
    </>
  )
})

/** 육지 안의 물 — 지형 기호 위에 그려 호수 테두리를 산·나무가 끊지 않게 한다 */
const InlandWaters = memo(function InlandWaters({ marks, shapes }: { marks: SeaMarkPaths; shapes: Shapes }) {
  return (
    <g aria-hidden="true">
      <path d={shapes.inland} className="inland-sea" />
      <path d={shapes.inland} className="inland-sea-ripple" clipPath="url(#inland-clip)" />
      <SeaMarkLayer marks={marks} />
    </g>
  )
})

/**
 * 강 — 물빛 물길과 양쪽 기슭 선. 해안선·호숫가 선 위에 그려 하구에서 그 선을 끊고 바다·호수로 이어진다.
 * 상류는 가늘어 기슭 선 둘이 잉크 한 줄로 모인다
 */
const Rivers = memo(function Rivers({ paths }: { paths: RiverPaths }) {
  return (
    <g className="rivers" aria-hidden="true">
      {paths.water.map((d, i) => (
        <path key={`w${i}`} d={d} className="river-water" />
      ))}
      {paths.banks.map((d, i) => (
        <path key={`b${i}`} d={d} className="river-bank" />
      ))}
    </g>
  )
})

/** 한 점 지형 기호 — 화산·초화산·폭포·간헐천·수직 동굴·첨탑·떠 있는 바위 (기호 수가 적어 하나씩 그린다) */
const Landmarks = memo(function Landmarks({ shapes }: { shapes: LandmarkShape[] }) {
  return (
    <g className="landmarks" aria-hidden="true">
      {shapes.map((g) => (
        <g key={g.id}>
          {g.parts.map((p, i) => (
            <path key={i} d={p.d} className={p.cls} />
          ))}
        </g>
      ))}
    </g>
  )
})

// 지도 칸별로 나눈 조각을 각각 path 로 (terrain.ts 의 tiler)
const tilePaths = (ds: string[], className: string) => ds.map((d, i) => <path key={`${className}-${i}`} d={d} className={className} />)

/** 호수·바다를 내려다보는 단애선 — 육지 안의 물 칠 위에 그린다 */
const WaterCliffs = memo(function WaterCliffs({ paths }: { paths: string[] }) {
  return (
    <g className="terrain" aria-hidden="true">
      {tilePaths(paths, 'cliffs')}
    </g>
  )
})

/**
 * 흩뿌린 기호(산·나무·늪…)와 절벽·협곡 선. scatter 가 false 면(깊은 확대) 선만 — 기호는 FineTerrain 이 잘게 다시 뿌린다.
 * keyPrefix: 같은 묶음 안에 칸이 여럿일 때(FineTerrain) key 가 겹치지 않게
 */
function TerrainScatter({ t, keyPrefix = '' }: { t: TerrainLayers; keyPrefix?: string }) {
  const tiles = (ds: string[], className: string) => ds.map((d, i) => <path key={`${keyPrefix}${className}-${i}`} d={d} className={className} />)
  return (
    <>
      {tiles(t.canyons, 'canyons')}
      {tiles(t.ice, 'ice')}
      {tiles(t.lava, 'lava')}
      {tiles(t.frost, 'frost')}
      {tiles(t.tundra, 'tundra')}
      {tiles(t.marsh, 'marsh')}
      {/* 수관은 한 번만 그린다 — 칠과 테두리를 한 path 에 */}
      {tiles(t.trees.crowns, 'tree-crown')}
      {tiles(t.trees.trunks, 'tree-ink')}
    </>
  )
}

function MountainBands({ bands, keyPrefix = '' }: { bands: TerrainLayers['mountains']; keyPrefix?: string }) {
  return (
    <>
      {bands.map((band, i) => (
        <g key={`${keyPrefix}${band.key}-${i}`}>
          {band.fill && <path d={band.fill} className="mtn-fill" />}
          {band.hatch && <path d={band.hatch} className="mtn-hatch" />}
          {band.ridge && <path d={band.ridge} className="mtn-ink" />}
          {band.crystal && <path d={band.crystal} className="crystal-fill" />}
          {band.crystalHatch && <path d={band.crystalHatch} className="crystal-hatch" />}
          {band.crystalRidge && <path d={band.crystalRidge} className="crystal-ink" />}
        </g>
      ))}
    </>
  )
}

/** lines: 협곡 바닥·절벽 선 (지역 상세 구멍에서 물러난다), scatter: 흩뿌린 기호 */
const Terrain = memo(function Terrain({ t, scatter, lines = true }: { t: TerrainLayers; scatter: boolean; lines?: boolean }) {
  return (
    <g className="terrain" aria-hidden="true">
      {lines && t.gorgeFloors && <path d={t.gorgeFloors} className="gorge-floor" />}
      {lines && tilePaths(t.cliffs, 'cliffs')}
      {/* 흩뿌린 기호 — 깊은 확대(DEEP_TIER)에서는 잘게 뿌린 것(FineTerrain)이 맡는다 */}
      {scatter && (
        <g className="terrain-scatter">
          {tilePaths(t.canyons, 'canyons')}
          {tilePaths(t.ice, 'ice')}
          {tilePaths(t.lava, 'lava')}
          {tilePaths(t.frost, 'frost')}
          {tilePaths(t.tundra, 'tundra')}
          {tilePaths(t.marsh, 'marsh')}
          {/* 수관은 한 번만 그린다 — 칠과 테두리를 한 path 에 */}
          {tilePaths(t.trees.crowns, 'tree-crown')}
          {tilePaths(t.trees.trunks, 'tree-ink')}
          {t.mountains.map((band) => (
            <g key={band.key}>
              {band.fill && <path d={band.fill} className="mtn-fill" />}
              {band.hatch && <path d={band.hatch} className="mtn-hatch" />}
              {band.ridge && <path d={band.ridge} className="mtn-ink" />}
              {band.crystal && <path d={band.crystal} className="crystal-fill" />}
              {band.crystalHatch && <path d={band.crystalHatch} className="crystal-hatch" />}
              {band.crystalRidge && <path d={band.crystalRidge} className="crystal-ink" />}
            </g>
          ))}
        </g>
      )}
    </g>
  )
})

/**
 * 깊은 확대의 지형 기호 — 칸마다 g 배로 잘게 다시 뿌린 것 (fineTerrain.ts). 기호 path 는 기호 공간이라 scale(g) 로 줄이고,
 * 선 굵기의 역배율(--inv-px)도 그만큼 키운다. 산 띠는 칸을 가로질러 위에서 아래로 그려 앞(아래)의 봉우리가 뒤를 가린다
 */
const FineTerrain = memo(function FineTerrain({ level, tiles }: { level: number; tiles: FineTile[] }) {
  const g = fineScale(level)
  const bands = tiles
    .flatMap((t) => t.layers.mountains.map((band) => ({ band, tile: t.key })))
    .sort((a, b) => a.band.key - b.band.key)
  return (
    <g className="terrain fine-terrain" aria-hidden="true" transform={`scale(${g})`} style={{ '--inv-px': `calc(var(--inv-px-w, 1) * ${1 / g})` } as CSSProperties}>
      {tiles.map((t) => (
        <TerrainScatter key={t.key} t={t.layers} keyPrefix={`${t.key}:`} />
      ))}
      {bands.map(({ band, tile }) => (
        <MountainBands key={`${tile}:${band.key}`} bands={[band]} keyPrefix={`${tile}:`} />
      ))}
    </g>
  )
})

/** 길쭉한 팔면체 — 젠디카르 하늘에 떠 있는 헤드론 */
function hedronShape(len: number, wid: number) {
  const t = -len
  const b = len * 0.92
  const g = len * 0.08
  return {
    body: `M0 ${t}L${wid} ${g}L0 ${b}L${-wid} ${g}Z`,
    facet: `M0 ${t}L${wid * 0.28} ${g}L0 ${b}M${-wid} ${g}L${wid * 0.28} ${g}L${wid} ${g}`,
    rune: `M${wid * 0.1} ${t * 0.45}L${wid * 0.18} ${g * 0.4}L${wid * 0.1} ${b * 0.42}`,
  }
}

/** 한가운데가 길이 방향으로 쪼개진 헤드론 (Ikiral) — 두 쪽이 좁은 틈을 두고 살짝 벌어진다 */
function splitHedronShape(len: number, wid: number) {
  const t = -len
  const b = len * 0.92
  const g = len * 0.08
  // 틈은 세계 지도 배율(k 4~8)에서도 두 쪽으로 읽히게 넉넉히
  const gap = wid * 0.42
  const f = (v: number) => v.toFixed(2)
  // 왼쪽 쪽은 왼쪽으로, 오른쪽 쪽은 오른쪽으로 gap/2 씩 — 끝(t, b)은 덜 벌어져 쐐기 모양 틈이 된다
  const lx = (v: number) => -gap / 2 - (v === g ? gap * 0.35 : 0)
  const rx = (v: number) => gap / 2 + (v === g ? gap * 0.35 : 0)
  const left = `M${f(lx(t))} ${f(t)}L${f(lx(g))} ${f(g)}L${f(lx(b))} ${f(b)}L${f(-wid - gap / 2)} ${f(g)}Z`
  const right = `M${f(rx(t))} ${f(t)}L${f(wid + gap / 2)} ${f(g)}L${f(rx(b))} ${f(b)}L${f(rx(g))} ${f(g)}Z`
  return {
    body: left + right,
    facet: `M${f(-wid - gap / 2)} ${f(g)}L${f(lx(g))} ${f(g)}M${f(rx(g))} ${f(g)}L${f(wid + gap / 2)} ${f(g)}M${f(rx(t))} ${f(t)}L${f(wid * 0.45 + gap / 2)} ${f(g)}L${f(rx(b))} ${f(b)}`,
    rune: '',
  }
}

interface HedronItem {
  key: string
  x: number
  y: number
  rot: number
  lift: number
  grounded: boolean
  shape: { body: string; facet: string; rune: string }
  delay: number
  /** 쓰러진 헤드론이 차지한 상자 (x, y 기준) — 그 자리 지점 이름을 헤드론 바깥에 단다 */
  extent: { x0: number; y0: number; x1: number; y1: number }
}

/** 헤드론 무리를 한 개씩 늘어놓는다 — 자리·크기·기울기 */
function layoutHedrons(clusters: HedronCluster[], avoid: Point[]): HedronItem[] {
  const raster = getTerrainRaster()
  const nearMarker = (x: number, y: number) => avoid.some(([ax, ay]) => (ax - x) ** 2 + (ay - y) ** 2 < 100)
  return clusters.flatMap((c) => {
    const rand = mulberry32(hashSeed(c.id))
    const land = c.within ? landmassById.get(c.within) : undefined
    const out = []
    for (let tries = 0; out.length < c.count && tries < c.count * 30; tries++) {
      const a = rand() * Math.PI * 2
      const r = Math.sqrt(rand()) * c.spread
      const x = c.at[0] + Math.cos(a) * r
      const y = c.at[1] + Math.sin(a) * r
      if (land && !pointInRing(x, y, land.ring)) continue
      if (c.inset && raster.coastDistance(x, y) < c.inset) continue
      // 하나뿐인 거대 헤드론(Sky Rock)은 제자리에 — 나머지는 마커를 가리지 않게
      if (c.count > 1 && nearMarker(x, y)) continue
      const len = (5 + rand() * 6) * (c.scale ?? 1)
      // 쓰러진 헤드론은 거의 눕고, 떠 있는 것은 조금씩 기운다
      const rot = c.grounded ? 62 + rand() * 50 : (rand() - 0.5) * 50
      const wid = len * 0.36 * (c.split ? 1.42 : 1)
      const ang = (rot * Math.PI) / 180
      const corners = [[0, -len], [wid, len * 0.08], [0, len * 0.92], [-wid, len * 0.08]].map(
        ([px, py]) => [px * Math.cos(ang) - py * Math.sin(ang), px * Math.sin(ang) + py * Math.cos(ang)] as const,
      )
      out.push({
        key: `${c.id}-${out.length}`,
        x,
        y,
        rot,
        lift: c.grounded ? 0 : 9 + rand() * 9,
        grounded: Boolean(c.grounded),
        shape: (c.split ? splitHedronShape : hedronShape)(len, len * 0.36),
        delay: -(rand() * 7).toFixed(2),
        extent: {
          x0: Math.min(...corners.map((q) => q[0])),
          y0: Math.min(...corners.map((q) => q[1])),
          x1: Math.max(...corners.map((q) => q[0])),
          y1: Math.max(...corners.map((q) => q[1])),
        },
      })
    }
    return out
  })
}

/** 페이즈 그림 한 장의 선과 채움 — 그림 하나에 path 가 수십 개라, 배율이 바뀌어 지도를 다시 그릴 때마다 새로 만들지 않게 따로 둔다 */
const FigureShape = memo(function FigureShape({ art, transform }: { art: FigureArt; transform: string }) {
  return (
    <g className="figure-art" transform={transform}>
      {art.parts.map((part, i) => (
        <path key={i} className={`fig-${part.cls}`} d={part.d} />
      ))}
    </g>
  )
})

const Hedrons = memo(function Hedrons({ items }: { items: HedronItem[] }) {
  return (
    <g className="hedrons" aria-hidden="true">
      {items.map((h) => (
        <g key={h.key} transform={`translate(${h.x.toFixed(1)} ${h.y.toFixed(1)})`}>
          {h.grounded ? (
            <g transform={`rotate(${h.rot.toFixed(1)})`} className="hedron-grounded">
              <path d={h.shape.body} className="hedron-body" />
              <path d={h.shape.facet} className="hedron-facet" />
            </g>
          ) : (
            <>
              <ellipse className="hedron-shadow" cx={2} cy={0} rx={5.5} ry={1.8} />
              <g className="hedron-float" style={{ animationDelay: `${h.delay}s` }}>
                <g transform={`translate(0 ${-h.lift.toFixed(1)}) rotate(${h.rot.toFixed(1)})`}>
                  <path d={h.shape.body} className="hedron-body" />
                  <path d={h.shape.facet} className="hedron-facet" />
                  <path d={h.shape.rune} className="hedron-rune" />
                </g>
              </g>
            </>
          )}
        </g>
      ))}
    </g>
  )
})

function MarkerGlyph({ kind }: { kind: PointKind }) {
  return <path className="glyph" d={MARKER_PATHS[kind]} />
}

/**
 * 지역 상세가 있는 곳의 이름 뒤 아이콘 — 패널의 '가까이 보기' 단추와 같은 접힌 지도(CHILD_MAP_ICON, 0~20 상자)를 화면 크기 고정으로 작게.
 * 그림 폭 15 × 0.5 = 7.5px, 이름과의 틈 3px. 라벨 배치는 이 둘에 여유를 더한 폭(suffixPx)까지 자리를 잡는다 —
 * 아이콘은 실제 글자 끝에 붙는데 배치의 글자 폭은 추정이라(1단계는 15px 글자를 14px 로 잰다) 몇 px 더 나가고, 테두리도 1.5px 있다
 */
const CHILD_MARK_SCALE = 0.5
const CHILD_MARK_W = 15 * CHILD_MARK_SCALE
const CHILD_MARK_GAP = 3
const CHILD_MARK_SLACK = 4.5
const CHILD_MARK_SUFFIX_PX = CHILD_MARK_GAP + CHILD_MARK_W + CHILD_MARK_SLACK
/** 아이콘 가운데를 맞출 높이 (글자 밑선 위로 em) — 라틴은 소문자 높이 가운데, 한글은 글자 가운데 */
const markMidEm = (ko: boolean) => (ko ? 0.34 : 0.22)
const childMarkTitle = (name: string) => `${name} — 확대하면 지역 상세`

/**
 * 접힌 지도 아이콘 — 바로 옆 형제 <text>(같은 부모의 라벨)의 끝(end) 또는 앞(start)에 붙인다.
 * edge 는 글자 끝의 추정 x(라벨 좌표) — 그린 뒤 실제 글자 폭(getBBox)을 재서 칠하기 전에 고친다. 글꼴이 늦게 들어와도 다시 잰다.
 * trim: 잰 글자 끝에서 덜어 낼 폭(라벨 좌표) — 자간을 둔 지역 라벨은 마지막 글자 뒤에도 자간이 붙어 틈이 넓어 보인다.
 * y 는 아이콘 가운데 높이(라벨 좌표). scaled: 라벨이 지도 단위면(지역 라벨) 아이콘만 역배율로 화면 크기를 지킨다.
 * 누르면 감싼 라벨처럼 장소를 고른다 (점 라벨은 마커가, 지역 라벨은 onClick 이 받는다)
 */
function ChildMapMark({
  edge,
  trim = 0,
  y,
  side,
  scaled = false,
  title,
  className = '',
  onClick,
  shift,
}: {
  edge: number
  trim?: number
  y: number
  side: 'end' | 'start'
  scaled?: boolean
  title: string
  className?: string
  onClick?: () => void
  /** 글자에 준 것과 같은 CSS 옮김 (쓰러진 헤드론 끝에 단 이름) — getBBox 는 CSS transform 을 모른다 */
  shift?: CSSProperties
}) {
  const ref = useRef<SVGGElement>(null)
  const [measured, setMeasured] = useState<{ key: string; edge: number } | null>(null)
  const key = `${edge}|${trim}|${side}|${title}`
  useLayoutEffect(() => {
    const text = ref.current?.parentElement?.querySelector(':scope > text')
    if (!(text instanceof SVGTextElement)) return
    const measure = () => {
      const b = text.getBBox()
      if (b.width > 0) setMeasured({ key, edge: side === 'end' ? b.x + b.width - trim : b.x })
    }
    measure()
    document.fonts?.addEventListener('loadingdone', measure)
    return () => document.fonts?.removeEventListener('loadingdone', measure)
  }, [key, side, trim])
  const x = measured?.key === key ? measured.edge : edge
  const offset = (side === 'end' ? 1 : -1) * (CHILD_MARK_GAP + CHILD_MARK_W / 2)
  return (
    <g ref={ref} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`} aria-hidden="true">
      <g className={scaled ? 'area-child-mark' : undefined} onClick={onClick} style={shift}>
        <g className={`child-map-mark ${className}`} transform={`translate(${offset})`}>
          <title>{title}</title>
          <g transform={`scale(${CHILD_MARK_SCALE}) translate(-10 -10)`}>
            {/* 라벨 테두리처럼 양피지색(물 위면 바다색) 테두리를 먼저 깔고, 그 안을 양피지로 */}
            <path d={CHILD_MAP_ICON} className="mark-paper" />
            <path d={CHILD_MAP_ICON_FOLD} className="mark-fold" />
            <path d={CHILD_MAP_ICON} className="mark-ink" />
          </g>
        </g>
      </g>
    </g>
  )
}

const ANCHOR_TEXT: Record<Anchor, { dx: number; dy: number; textAnchor: 'start' | 'end' | 'middle' }> = {
  right: { dx: 7, dy: 0.34, textAnchor: 'start' },
  left: { dx: -7, dy: 0.34, textAnchor: 'end' },
  above: { dx: 0, dy: -0.75, textAnchor: 'middle' },
  below: { dx: 0, dy: 1.4, textAnchor: 'middle' },
}

/** 지역·물 라벨 — 지도와 함께 커지되 화면 크기는 상한·하한 안에서 */
const AREA_STYLE: Record<number, AreaLabelStyle> = {
  3: { base: 24, minPx: 11.5, maxPx: 24, showPx: 0 },
  2: { base: 18, minPx: 11, maxPx: 19, showPx: 9 },
  1: { base: 15, minPx: 10.5, maxPx: 16, showPx: 9.5 },
  0: { base: 13, minPx: 10.5, maxPx: 14, showPx: 10.5 },
}
const areaStyle = (prominence: number) => AREA_STYLE[prominence] ?? AREA_STYLE[0]

/**
 * 강 이름은 옛 지도처럼 완만한 물결을 따라 쓴다 — 물길은 바탕 지형 데이터(River)에 있는 강만 선으로 그리고,
 * 이름은 물길과 따로 글자만으로 '흐르는 물'임을 알린다. 물결 높이는 글자 크기의 0.12배라 배치 상자(위 0.94, 아래 0.31) 안에 든다.
 */
function riverBaseline(text: string, at: Point, font: number): string {
  const box = areaLabelBox(text, at, font)
  // 글자가 경로 끝에서 잘리지 않게 넉넉히 — 글자는 가운데 2/3 쯤에 놓여 한 번 오르고 한 번 내린다
  const w = (box.x1 - box.x0) * 1.5
  const amp = font * 0.12
  const steps = 48
  let d = ''
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = at[0] - w / 2 + w * t
    const y = at[1] - amp * Math.sin(t * Math.PI * 2)
    d += `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`
  }
  return d
}

/**
 * 라벨 글자 대부분이 바다·호수 위에 있는가 — 기준점(글자 밑선 가운데)만 보면 좁은 곶 끝에 걸린 라벨을 땅으로 잘못 본다.
 * 글자 높이 가운데를 따라 일곱 곳을 본다.
 */
function labelOnWater(raster: TerrainRaster, text: string, at: Point, font: number): boolean {
  const box = areaLabelBox(text, at, font)
  const y = at[1] - font * 0.35
  const n = 7
  let water = 0
  for (let i = 0; i < n; i++) {
    const x = box.x0 + ((i + 0.5) / n) * (box.x1 - box.x0)
    if (raster.landAt(x, y) < 0 || raster.waterAt(x, y)) water++
  }
  return water * 2 > n
}

/** 대륙명 — 지도 단위 54 를 기본으로 하되 화면에서 16~40px 안에 묶는다 */
const CONTINENT_FONT = 54
const continentFontUnits = (base: number, pxPerUnit: number) => Math.min(40, Math.max(16, base * pxPerUnit)) / pxPerUnit
/**
 * 대륙명은 가장 멀리 본 배율(0·1 단계)에만 땅 위에 크게 쓴다 — 확대하면(2 단계부터) 물러나고 그 자리를 지명에 내준다 (사용자 요청).
 * 그 배율에서는 대륙명 상자 안의 지역 라벨·지점 라벨·카드 기호가 자리를 비켜 준다
 */
const CONTINENT_LABEL_HIDE_TIER = 2

/**
 * 대륙명의 가운데 x 와 차지하는 상자 (지도 단위) — 글자 폭 추정은 labels.ts 와 같고, 자간(0.24em)만큼 넓힌다.
 * 휴대폰 전체 보기처럼 글자가 땅보다 커지는 배율에서도 지도 가장자리 밖으로 나가지 않게 안쪽으로 민다 (동쪽 끝의 Bala Ged)
 */
function continentLabelPlace(c: Continent, px: number, lang: LabelLang): { x: number; box: Box } {
  const size = continentFontUnits(c.label.size ?? CONTINENT_FONT, px)
  const w = textWidthEm(displayName(c, lang)) * size * 1.25
  const margin = 8 / px
  const x = Math.min(Math.max(c.label.at[0], w / 2 + margin), MAP_WIDTH - w / 2 - margin)
  const y = c.label.at[1]
  return { x, box: { x0: x - w / 2, y0: y - size * 0.75, x1: x + w / 2, y1: y + size * 0.2 } }
}

/** 공식 한국어 이름을 보여 주는 라벨 — 한글 글꼴로 */
const koClass = (l: { nameKo?: string }, lang: LabelLang) => (lang === 'ko' && l.nameKo ? 'is-ko' : '')

/** 세지리 북쪽은 지도 위로 이어진다 — 위쪽 가장자리를 바다 안개로 흐린다 */
function NorthFog() {
  return (
    <g aria-hidden="true" className="north-fog">
      <rect x={-MAP_WIDTH * 3} y={-MAP_HEIGHT * 3} width={MAP_WIDTH * 7} height={MAP_HEIGHT * 3 - 90} fill="var(--sea)" />
      <rect x={-MAP_WIDTH * 3} y={-90} width={MAP_WIDTH * 7} height={90} fill="url(#north-fog-fade)" />
    </g>
  )
}

export function ZendikarMap({
  continents,
  locations,
  hedrons,
  landscape,
  continentAt,
  selection,
  highlightContinentId,
  onSelect,
  cards,
  cardPlaceIds,
  onSelectCard,
  figures,
  phase,
  onSelectFigure,
  childMaps,
  onFocusPoint,
  lang,
  view,
  svgRef,
  layerRef,
}: Props) {
  const placed = useMemo(() => locations.filter(isPlaced), [locations])
  const points = useMemo(() => placed.filter((l) => l.kind !== 'region' && l.kind !== 'water'), [placed])
  const areas = useMemo(() => placed.filter((l) => l.kind === 'region' || l.kind === 'water'), [placed])
  const childMapPlaces = useMemo(() => new Set(childMaps.map((d) => d.place)), [childMaps])
  const childById = useMemo(() => new Map(childMaps.map((d) => [d.id, d])), [childMaps])
  /** 그림이 사는 지역 상세의 tier — 세계 지도 그림은 0 */
  const figureTier = useMemo(() => (f: MapFigure) => (f.childMap ? childById.get(f.childMap)?.tier ?? Infinity : 0), [childById])

  const relief = useMemo(() => {
    const byLandmass = new Map<string, Continent[]>()
    for (const c of continents) byLandmass.set(c.landmass, [...(byLandmass.get(c.landmass) ?? []), c])
    return (land: Landmass, x: number, y: number): ReliefProfile => {
      const owners = byLandmass.get(land.id)
      if (!owners) return { mountains: 0.3 }
      if (owners.length === 1) return owners[0].relief
      const id = continentAt(land.id, x, y)
      return (owners.find((c) => c.id === id) ?? owners[0]).relief
    }
  }, [continents, continentAt])

  // 지형 영역 — 장소 데이터의 대략적 범위(soft)가 먼저, 바탕 지형 데이터의 영역이 뒤에 (뒤가 앞을 덮는다)
  const patches = useMemo<TerrainPatch[]>(
    () => [
      ...areas.flatMap((l) => {
        const kind = l.terrain ? TERRAIN_PATCH[l.terrain] : undefined
        const p = kind && l.extent && !l.bare ? makePatch(kind, { at: l.position, extent: l.extent }, { soft: true }) : null
        return p ? [p] : []
      }),
      ...landscape.areas.flatMap((a) => {
        const p = makePatch(a.kind, a, { density: a.density })
        return p ? [p] : []
      }),
    ],
    [areas, landscape.areas],
  )
  const avoid = useMemo<Point[]>(() => points.map((l) => l.position), [points])
  const riverShapes = useMemo(() => shapeRivers(landscape.rivers, avoid), [landscape.rivers, avoid])
  const cardPins = useMemo<Point[]>(() => cards.map((c) => c.at), [cards])
  const rivers = useMemo(() => riverPaths(riverShapes), [riverShapes])
  const landmarks = useMemo(() => landmarkShapes(landscape.glyphs), [landscape.glyphs])
  const seaMarks = useMemo(() => seaMarkPaths(landscape.sea), [landscape.sea])
  // 지역 라벨 자리 — 중간 배율(tier 3)의 영문 이름 상자. 물 위에 심는 기호(맹그로브)가 Sunder Bay 같은 물 이름을 덮지 않게
  const labelBoxes = useMemo<AvoidBox[]>(
    () =>
      areas.map((l) => {
        const b = areaLabelBox(displayName(l, 'en'), l.position, areaFontUnits(areaStyle(l.prominence), TIER_PX[3]))
        // 라벨은 범위 가운데에서 위아래로 조금 옮겨 놓일 수 있다 (labels.ts 의 candidates)
        const dy = l.extent ? l.extent[1] * 0.45 : 0
        return { ...b, y0: b.y0 - dy, y1: b.y1 + dy }
      }),
    [areas],
  )
  // 강·협곡이 바다로 나가는 물길 — 절벽 해안의 빗금을 그 어귀에서 끊는다
  const coastBreaks = useMemo(() => {
    const raster = getTerrainRaster()
    const out: { line: Point[]; r: number }[] = []
    for (const r of riverShapes) {
      const k = r.samples.findIndex(([x, y]) => raster.landAt(x, y) < 0)
      if (k > 0) out.push({ line: r.samples.slice(Math.max(0, k - 10), k + 3), r: r.widths[k] / 2 + 4 })
    }
    for (const l of landscape.lines) {
      if (l.kind !== 'gorge') continue
      const ends = [l.line[0], l.line[l.line.length - 1]]
      if (ends.some(([x, y]) => raster.coastDistance(x, y) < 17)) out.push({ line: [...l.line], r: (l.width ?? 8) / 2 + 3 })
    }
    return out
  }, [riverShapes, landscape.lines])
  const terrainInput = useMemo<TerrainInput>(
    () => ({
      profileFor: relief,
      patches,
      avoid,
      pins: cardPins,
      labelBoxes,
      blocked: buildBlockedMask(riverShapes, landscape.lines, landscape.glyphs),
      lines: landscape.lines,
      coastBreaks,
      cliffDepth,
      wetAt,
    }),
    [relief, patches, avoid, cardPins, labelBoxes, riverShapes, landscape.lines, landscape.glyphs, coastBreaks],
  )
  const terrain = useMemo(() => buildTerrain(terrainInput), [terrainInput])
  const [ripples, setRipples] = useState<string[][] | null>(null)
  useEffect(() => {
    let live = true
    loadRipples().then((r) => live && setRipples(r))
    return () => {
      live = false
    }
  }, [])
  // 지역 상세 그림 — 그 지역이 그릴 범위에 들고 나올 배율에 가까워지면(한 tier 앞) 불러 둔다
  const [childArt, setChildArt] = useState<Readonly<Record<string, ChildMapArt>>>({})
  useEffect(() => {
    const c = view.cull
    const want = childMaps.filter(
      (d) => view.tier >= d.tier - 1 && !childArt[d.id] && d.bounds.x1 >= c.x0 && d.bounds.x0 <= c.x1 && d.bounds.y1 >= c.y0 && d.bounds.y0 <= c.y1,
    )
    if (!want.length) return
    let live = true
    for (const d of want)
      loadChildArt(d.id)
        .then((art) => live && setChildArt((cur) => (cur[d.id] ? cur : { ...cur, [d.id]: art })))
        .catch((e) => console.error(`지역 상세 '${d.id}' 그림을 불러오지 못했다`, e))
    return () => {
      live = false
    }
  }, [childMaps, childArt, view.tier, view.cull])
  // 페이즈 그림 — 묶음마다 따로 불러온다: 개관에서도 그려지는 세계 지도 그림(world, 페이즈2부터 world-2 …)은 페이즈를 켤 때, 더 가까이에서
  // 그려지는 것(world-near …)은 world 를 다 받은 뒤(이미 가까이 보고 있으면 함께), 지역 상세에 사는 작은 대상(<id>, 페이즈2부터 <id>-2 …)은
  // 그 지역 상세를 불러올 때
  const [figureArt, setFigureArt] = useState<Readonly<Record<string, FigureArt>> | null>(null)
  const [figureGroups, setFigureGroups] = useState<ReadonlySet<string>>(() => new Set())
  useEffect(() => {
    if (!figures.length) return
    const c = view.cull
    // 한 줄이 한 번에 넣는 묶음 — 켠 페이즈까지의 개관 묶음은 함께 넣어야 하나씩 올 때마다 개관의 이름 자리가 움직이지 않는다
    const batches = [
      worldGroups('world', phase),
      ...(view.tier >= 2 || figureGroups.has('world') ? worldGroups('world-near', phase).map((g) => [g]) : []),
      // 지역 상세의 묶음도 페이즈마다 (<id>, <id>-2 …) — 한 지역 상세의 것은 함께 넣는다
      ...childMaps
        .filter((d) => view.tier >= d.tier - 1 && d.bounds.x1 >= c.x0 && d.bounds.x0 <= c.x1 && d.bounds.y1 >= c.y0 && d.bounds.y0 <= c.y1)
        .map((d) => [d.id, ...Array.from({ length: Math.max(0, phase - 1) }, (_, i) => `${d.id}-${i + 2}`)]),
    ]
      .map((b) => b.filter((g) => FIGURE_GROUPS.includes(g) && !figureGroups.has(g)))
      .filter((b) => b.length > 0)
    // 넣기는 마지막으로 돈 효과만 한다 — 옮기기·페이즈 바꾸기로 효과가 다시 돌면 앞 차례의 넣기는 거두고, 이번 차례가 받는 중인 묶음까지 기다려
    // 함께 넣는다 (받는 중이던 world 를 두고 페이즈2 를 켜도 world·world-2 가 한 번에 들어간다)
    let live = true
    for (const batch of batches) {
      // 옮기는 동안 효과가 다시 돌아도 같은 묶음을 두 번 받지 않는다 — 받는 중이거나 받은 묶음은 그 받기를 다시 쓴다
      const loads = batch.map((g) => {
        let p = figureLoads.get(g)
        if (!p) {
          p = loadFigureGroup(g)
          figureLoads.set(g, p)
        }
        return p
      })
      // 한 묶음이 못 와도 온 묶음은 넣는다 — 못 온 묶음은 받기를 지워 다음 차례에 다시 받는다
      Promise.allSettled(loads).then((results) => {
        if (!live) return
        const done: string[] = []
        const arts: Record<string, FigureArt>[] = []
        results.forEach((r, i) => {
          const g = batch[i]
          if (r.status === 'rejected') {
            figureLoads.delete(g)
            console.error(`페이즈 그림 묶음 '${g}' 을 불러오지 못했다`, r.reason)
            return
          }
          // world-near 는 개관(tier 0·1)에 그려지지 않아야 늦게 와도 개관의 이름 자리가 움직이지 않는다 — 나누는 기준은 scripts/figures/to_ts.mjs
          if (import.meta.env.DEV && g.startsWith('world-near'))
            for (const f of figures) if (r.value[f.id] && f.size * TIER_PX[2] >= FIGURE_MIN_PX) console.warn(`페이즈 그림 '${f.id}' 은 개관에 그려지니 world 묶음이어야 한다 (to_ts.mjs 다시 실행)`)
          done.push(g)
          arts.push(r.value)
        })
        if (!done.length) return
        setFigureArt((cur) => Object.assign({}, cur, ...arts))
        setFigureGroups((cur) => new Set([...cur, ...done]))
      })
    }
    return () => {
      live = false
    }
  }, [figures, figureGroups, childMaps, view.tier, view.cull, phase])
  // 깊은 확대의 지형 기호 — 그릴 범위 안의 칸만 (tier 가 정한 단계). 지역 상세가 나온 자리는 그 그림의 지형 다각형으로 뿌린다
  const fineLevel = fineLevelFor(view.tier)
  // 페이즈 — 지역 상세의 페이즈 그림 받침·빈터는 그 페이즈를 켰을 때만 (카드 데이터가 와서 figures 가 생긴 뒤부터)
  const phaseLevel = figures.length > 0 ? phase : 0
  const overlay = useMemo(() => fineOverlay(childMaps, childArt, phaseLevel), [childMaps, childArt, phaseLevel])
  // fine.level 은 지금 그리는 단계 — 확대해 새 단계 칸이 화면을 다 채울 때까지 앞 단계(0: 세계 지도의 기호)를 둔다
  const fine = useFineTerrain(terrainInput, fineLevel, view.cull, overlay)
  /** 지금 배율에 나와 있는 지역 상세 (그림까지 불러온 것) — 이름 배치와 같은 tier 를 따른다 */
  const activeDetails = useMemo(() => childMaps.filter((d) => view.tier >= d.tier && childArt[d.id]), [childMaps, childArt, view.tier])
  const inActiveDetail = (p: Point) => activeDetails.some((d) => inDetail(d, p))
  const washes = useMemo<Washes>(() => {
    // 다각형 영역의 채색은 모서리를 둥글린다 — 데이터의 꺾인 선이 채색 가장자리에 곧은 변으로 드러나지 않게 (기호 배치는 원래 다각형 그대로)
    const washPath = (p: TerrainPatch) => (p.ring ? ringToPath(chaikin(p.ring, 2)) : patchPath(p))
    const of = (kind: TerrainKind, soft: boolean | null) =>
      patches.filter((p) => p.kind === kind && (soft === null || Boolean(p.soft) === soft)).map(washPath).join('')
    // 숲 채색은 바탕 지형의 숲 영역만 — 장소 데이터의 숲(soft)은 예전처럼 나무만 보탠다
    return { forest: of('forest', false), lava: of('lava', null), plain: of('plain', null) }
  }, [patches])

  // 카드 표시에 다는 이름 — 장소와 하나인 카드는 그 장소의 이름 (검색·목록·패널과 같은 이름)
  const pinPlace = useMemo(() => {
    const byId = new Map(locations.map((l) => [l.id, l]))
    return (c: PinnedCard) => {
      const id = cardPlaceIds.get(c.id)
      return id ? byId.get(id) : undefined
    }
  }, [locations, cardPlaceIds])

  // 라벨 배치에 쓰는 tier 별 px/단위 — 0 단계는 이 화면에서 가장 멀리 축소했을 때
  const minPx = view.minPxPerUnit
  const tierPx = useMemo(() => [minPx > 0 ? Math.min(TIER_PX[0], minPx) : TIER_PX[0], ...TIER_PX.slice(1)], [minPx])

  // 기호마다 처음 그리는 tier — 놓인 땅이 그 tier 의 가장 빽빽한 배율에서 LAND_MIN_PX 가 될 때부터.
  // 끝내 모자라면 이 화면이 닿을 수 있는 가장 깊은 tier 에서는 그린다 (카드는 모두 지도 어딘가에 나와야 한다)
  const landOf = useMemo(
    () =>
      new Map([
        ...points.map((l) => [l.id, landSizeAt(l.position)] as const),
        ...cards.map((c) => [cardId(c), landSizeAt(c.at)] as const),
      ]),
    [points, cards],
  )
  const glyphFrom = useMemo(() => {
    // minPx 는 이 화면의 MIN_ZOOM 배율 — 가장 크게 확대하면 MAX_ZOOM 배율
    const deepest = minPx > 0 ? tierFor((minPx / MIN_ZOOM) * MAX_ZOOM) : tierPx.length - 1
    const from = new Map<string, number>()
    for (const [id, size] of landOf) {
      const t = tierPx.findIndex((px) => size * px >= LAND_MIN_PX)
      from.set(id, t < 0 ? deepest : Math.min(t, deepest))
    }
    return (id: string) => from.get(id) ?? 0
  }, [landOf, tierPx, minPx])

  const hedronItems = useMemo(() => layoutHedrons(hedrons, avoid), [hedrons, avoid])
  // 지역 상세가 나온 자리의 한 점 기호·헤드론 — 그림이 다시 그렸으므로 세계 지도 것은 강·절벽처럼 가장자리 띠에서 옅어져 사라진다 (detail-holes)
  /** 강·절벽·협곡 선을 지역 상세 범위에서 걷어 내는 마스크가 있는가 — 범위 가장자리 띠에서는 안쪽으로 옅어진다 */
  const holes = activeDetails.length > 0
  const holeMask = holes ? 'url(#detail-holes)' : undefined
  /**
   * 지역 상세끼리, 그리고 세계 지도와 겹치는 이름 — 한 이름은 한 번만.
   * 이웃한 두 지역 상세가 같은 지역 이름을 달면 그 장소가 놓인 쪽(없으면 먼저 나온 쪽)만, 세계 지도의 지역 라벨은 지역 상세가 그 이름을 달면 물러난다
   */
  const { detailLabelHidden, detailLabelTexts } = useMemo(() => {
    // 그릴 범위에 든 지역 상세끼리만 — 화면 밖 지역 상세에 이름을 넘기면 그 이름이 어디에도 안 보인다.
    // 같은 이름이 여럿이면 화면 가운데에 가장 가까운 것을 남긴다
    const c = view.cull
    const cx = (c.x0 + c.x1) / 2
    const cy = (c.y0 + c.y1) / 2
    const inView = activeDetails.filter((d) => d.bounds.x1 >= c.x0 && d.bounds.x0 <= c.x1 && d.bounds.y1 >= c.y0 && d.bounds.y0 <= c.y1)
    const best = new Map<string, { id: string; i: number; dist: number }>()
    const all: { id: string; i: number; text: string }[] = []
    const hidden = new Map<string, Set<number>>()
    const hide = (id: string, i: number) => {
      const set = hidden.get(id) ?? new Set<number>()
      set.add(i)
      hidden.set(id, set)
    }
    for (const d of inView)
      childArt[d.id].labels.forEach((label, i) => {
        const x = d.bounds.x0 + label.at[0] / d.s
        const y = d.bounds.y0 + label.at[1] / d.s
        // 가장자리 띠에 놓인 이름은 옅어져 읽히지 않는다 — 빼고, 같은 이름의 세계 지도 라벨이 그대로 나오게 한다
        const depth = Math.min(x - d.bounds.x0, d.bounds.x1 - x, y - d.bounds.y0, d.bounds.y1 - y)
        if (depth < detailBand(d) * 0.75) return hide(d.id, i)
        const dist = (x - cx) ** 2 + (y - cy) ** 2
        all.push({ id: d.id, i, text: label.text })
        const cur = best.get(label.text)
        if (!cur || dist < cur.dist) best.set(label.text, { id: d.id, i, dist })
      })
    for (const l of all) {
      const keep = best.get(l.text)!
      if (keep.id !== l.id || keep.i !== l.i) hide(l.id, l.i)
    }
    return { detailLabelHidden: hidden, detailLabelTexts: new Set(best.keys()) }
  }, [activeDetails, childArt, view.cull])
  /** 지역 상세 그림이 정한 장소·카드 이름의 쪽 — 그 그림의 지형지물을 비켜 둔 쪽이다 */
  const detailAnchor = (key: string, at: Point): Anchor | undefined => {
    for (const d of activeDetails) {
      const a = childArt[d.id]?.markAnchors?.[key]
      if (a && inDetail(d, at)) return a
    }
    return undefined
  }
  // 쓰러진 헤드론 위의 지점(Ikiral)은 이름을 헤드론 바깥 끝에 단다 — 헤드론은 지도와 함께 커져 이름이 그 위에 얹히기 쉽다
  const groundedAt = useMemo(() => hedronItems.filter((h) => h.grounded), [hedronItems])
  const pointInputs = useMemo(
    () =>
      points.map((l) => {
        const [x, y] = l.position
        const h = groundedAt.find((g) => Math.hypot(g.x - x, g.y - y) < 2)
        return {
          id: l.id,
          at: l.position,
          text: displayName(l, lang),
          prominence: l.prominence,
          fontPx: POINT_FONT_PX[0],
          fromTier: glyphFrom(l.id),
          suffixPx: childMapPlaces.has(l.id) ? CHILD_MARK_SUFFIX_PX : undefined,
          anchorAt: h
            ? ({
                right: [h.x + h.extent.x1, y] as Point,
                left: [h.x + h.extent.x0, y] as Point,
                above: [x, h.y + h.extent.y0] as Point,
                below: [x, h.y + h.extent.y1] as Point,
              } as Partial<Record<Anchor, Point>>)
            : undefined,
        }
      }),
    [points, lang, glyphFrom, childMapPlaces, groundedAt],
  )
  const pointAnchorAt = useMemo(() => new Map(pointInputs.flatMap((p) => (p.anchorAt ? [[p.id, p.anchorAt] as const] : []))), [pointInputs])

  const cardInputs = useMemo(
    () =>
      cards.map((c) => ({
        id: cardId(c),
        at: c.at,
        text: displayName(pinPlace(c) ?? c, lang),
        prominence: CARD_PROMINENCE,
        fontPx: POINT_FONT_PX[0],
        fromTier: glyphFrom(cardId(c)),
      })),
    [cards, lang, pinPlace, glyphFrom],
  )

  // tier 마다 보일 카드 기호 — 보이는 지점 마커나 다른 카드와 겹칠 만큼 가까우면 숨긴다.
  // 공식 근거로 이은 카드가 먼저, 이 지도가 자리를 고른(추정) 카드가 나중에 자리를 잡는다. 휴대폰 전체 보기(0 단계)에는 두지 않는다.
  const cardShown = useMemo(
    () =>
      tierPx.map((px, tier) => {
        const shown = new Set<string>()
        if (tier === 0) return shown
        const gap = CARD_GAP_PX / px
        // 대륙명이 보이는 배율에서는 그 글자 밑의 카드 기호를 숨긴다 — 확대해 대륙명이 물러나면 나온다
        const r = 8 / px
        const underName = tier >= CONTINENT_LABEL_HIDE_TIER ? [] : continents.map((c) => continentLabelPlace(c, px, lang).box)
        const hidden = (q: Point) => underName.some((b) => q[0] + r > b.x0 && q[0] - r < b.x1 && q[1] + r > b.y0 && q[1] - r < b.y1)
        const markers = points.filter((l) => l.prominence >= SHOW_FROM[tier] && tier >= glyphFrom(l.id)).map((l) => l.position)
        const taken: Point[] = []
        const order = [...cards].sort(
          (a, b) => Number(Boolean(a.estimate)) - Number(Boolean(b.estimate)) || a.number.localeCompare(b.number) || a.set.localeCompare(b.set),
        )
        for (const c of order) {
          // 놓인 섬이 이 배율에서 기호보다 작으면 두지 않는다 — 자리도 차지하지 않는다
          if (tier < glyphFrom(cardId(c))) continue
          const near = (q: Point) => Math.hypot(q[0] - c.at[0], q[1] - c.at[1]) < gap
          if (markers.some(near) || taken.some(near) || hidden(c.at)) continue
          taken.push(c.at)
          shown.add(c.id)
        }
        return shown
      }),
    [cards, points, tierPx, glyphFrom, continents, lang],
  )

  // 페이즈 그림 — 상자와 이름 라벨. 이름은 그림이 그 tier 의 가장 빽빽한 배율에서도 FIGURE_MIN_PX 가 될 때부터 단다
  const figureBoxes = useMemo(() => new Map(figures.map((f) => [f.id, figureBox(f, figureArt?.[f.id])])), [figures, figureArt])
  const figureInputs = useMemo(
    () =>
      figures.flatMap((f) => {
        const box = figureBoxes.get(f.id)
        if (!box) return []
        const sized = tierPx.findIndex((px) => f.size * px >= FIGURE_MIN_PX)
        // 지역 상세에 사는 대상은 그 지역 상세가 나오는 배율부터
        const from = sized < 0 ? -1 : Math.max(sized, figureTier(f))
        const midY = (box.y0 + box.y1) / 2
        return [
          {
            id: figureId(f),
            at: [(box.x0 + box.x1) / 2, box.y1] as Point,
            text: displayName(f, lang),
            // 큰 그림의 이름은 중간 배율부터, 사람만 한 그림은 더 가까이에서
            prominence: f.size >= 30 ? 2 : 1,
            fontPx: POINT_FONT_PX[0],
            fromTier: from < 0 || !Number.isFinite(from) ? tierPx.length : from,
            // 그림 밑 가운데가 먼저, 막히면 그림 옆 가운데. 장소 이름을 밀어내지 않게 맨 나중에 자리를 잡는다
            anchors: ['below', 'right', 'left'] as Anchor[],
            anchorAt: { right: [box.x1, midY] as Point, left: [box.x0, midY] as Point },
            last: true,
          },
        ]
      }),
    [figures, figureBoxes, tierPx, lang, figureTier],
  )

  // tier 마다: 대륙명 상자 → 지역 라벨(보일 지점은 먼저 자리를 비워 둔다) → 지점 라벨
  const layouts = useMemo(() => {
    const inputs = areas.map((l) => ({
      id: l.id,
      at: l.position,
      extent: l.extent,
      text: displayName(l, lang),
      prominence: l.prominence,
      suffixPx: childMapPlaces.has(l.id) ? CHILD_MARK_SUFFIX_PX : undefined,
    }))
    return tierPx.map((px, tier) => {
      // 지역 상세가 나오는 tier 에서는 그 범위의 지역 이름을 그 그림이 단다 — 자리도 잡지 않는다 (이웃 이름·그림 이름을 막지 않게)
      const tierInputs = inputs.filter((i) => !childMaps.some((d) => d.tier <= tier && inDetail(d, i.at)))
      const continentBoxes: Box[] = tier >= CONTINENT_LABEL_HIDE_TIER ? [] : continents.map((c) => continentLabelPlace(c, px, lang).box)
      const shown = pointInputs.filter((p) => p.prominence >= SHOW_FROM[tier] && tier >= p.fromTier)
      const reserved = [
        // 이 단계에 보이는 모든 마커 자리
        ...shown.map((p) => {
          const r = 7 / px
          return { x0: p.at[0] - r, y0: p.at[1] - r, x1: p.at[0] + r, y1: p.at[1] + r }
        }),
        // 중요한 곳은 라벨 자리까지
        ...shown.filter((p) => p.prominence >= 2).map((p) => pointReserveBox(p, px)),
        // 이 단계에 보이는 카드 기호 자리
        ...cards
          .filter((c) => cardShown[tier].has(c.id))
          .map((c) => {
            const r = 8 / px
            return { x0: c.at[0] - r, y0: c.at[1] - r, x1: c.at[0] + r, y1: c.at[1] + r }
          }),
      ]
      // 이 tier 안 어딘가에서 보일 수 있는 페이즈 그림 — 라벨이 그림 위로 지나가지 않게
      const tierMax = TIER_PX[tier + 1] ?? Infinity
      const figureArea = figures.flatMap((f) => {
        const box = figureBoxes.get(f.id)
        return box && f.size * tierMax >= FIGURE_MIN_PX && tier >= figureTier(f) ? [box] : []
      })
      const area = layoutAreaLabels(tierInputs, areaStyle, px, [...continentBoxes, ...reserved, ...figureArea])
      return { area, obstacles: [...continentBoxes, ...area.boxes, ...figureArea] }
    })
  }, [areas, continents, lang, pointInputs, tierPx, cards, cardShown, figures, figureBoxes, childMapPlaces, figureTier, childMaps])

  // 지점 라벨과 카드 라벨은 한꺼번에 자리를 잡는다 — 서로 겹치지 않게.
  // 이 tier 에 그려지지 않는 마커·카드 기호는 자리를 막지 않는다 (보이지 않는 점 때문에 이웃 이름이 빠지지 않게)
  const placements = useMemo(() => {
    const marks = tierPx.map((_, tier) => new Set([
      ...pointInputs.filter((p) => p.prominence >= SHOW_FROM[tier] && tier >= p.fromTier).map((p) => p.id),
      ...cards.filter((c) => cardShown[tier].has(c.id)).map(cardId),
      ...figureInputs.map((f) => f.id),
    ]))
    return placeLabels(
      [...pointInputs, ...cardInputs, ...figureInputs],
      layouts.map((l) => l.obstacles),
      tierPx,
      SHOW_FROM,
      (id, tier) => marks[tier].has(id),
    )
  }, [pointInputs, cardInputs, figureInputs, layouts, tierPx, cards, cardShown])

  const selectedId = selection?.type === 'location' ? selection.id : null
  // 키보드 초점이 있는 마커는 배율 단계가 바뀌어도 내리지 않는다 — 내리면 초점이 <body> 로 빠진다
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const highlightId = selection?.type === 'continent' ? selection.id : highlightContinentId
  const highlighted = highlightId ? continents.find((c) => c.id === highlightId) ?? null : null

  /**
   * 누른 자리 가까이(화면 px) 있는 장소·카드·그림을 대신 누른다 — 작은 표시나 그림 선 사이를 살짝 빗나간 손이
   * 대륙·바다를 골라 화면이 옮겨 가지 않게. 겹치면 가장자리가 가까운 것, 같으면 가운데가 가까운 것. 눌렀으면 true
   */
  const pickNear = (e: MouseEvent<SVGElement>) => {
    const svg = svgRef.current
    if (!svg) return false
    const slop = (e.nativeEvent as PointerEvent).pointerType === 'touch' ? NEAR_SLOP_TOUCH : NEAR_SLOP
    let best: Element | null = null
    let bestD = slop
    let bestC = Infinity
    for (const el of svg.querySelectorAll('[role="button"]')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) continue
      const d = Math.hypot(Math.max(r.left - e.clientX, 0, e.clientX - r.right), Math.max(r.top - e.clientY, 0, e.clientY - r.bottom))
      const c = Math.hypot((r.left + r.right) / 2 - e.clientX, (r.top + r.bottom) / 2 - e.clientY)
      if (d < bestD || (d === bestD && c < bestC)) {
        best = el
        bestD = d
        bestC = c
      }
    }
    if (!best) return false
    best.dispatchEvent(new window.MouseEvent('click', { bubbles: true, clientX: e.clientX, clientY: e.clientY }))
    return true
  }

  const handleLandClick = (e: MouseEvent<SVGPathElement>) => {
    if (pickNear(e)) return
    const layer = layerRef.current
    const ctm = layer?.getScreenCTM()
    if (!ctm) return
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    const land = landmasses.find((l) => pointInRing(p.x, p.y, l.ring))
    const id = land ? continentAt(land.id, p.x, p.y) : null
    onSelect(id ? { type: 'continent', id } : null)
  }

  const onKey = (e: KeyboardEvent, l: PlacedLocation) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect({ type: 'location', id: l.id })
    }
  }

  const tier = view.tier
  const px = view.pxPerUnit || tierPx[0]
  const deep = tier >= DEEP_TIER
  const shapes = deep ? DEEP_SHAPES() : SHAPES
  // 지금 배율에 보이는 대륙명 상자 — 그 글자에 걸리는 그림은 대륙명이 물러날 때까지 숨긴다
  const nameBoxes = useMemo(
    () => (tier >= CONTINENT_LABEL_HIDE_TIER ? [] : continents.map((c) => continentLabelPlace(c, px, lang).box)),
    [tier, continents, px, lang],
  )
  const underContinentName = (b: Box) => nameBoxes.some((n) => b.x0 < n.x1 && b.x1 > n.x0 && b.y0 < n.y1 && b.y1 > n.y0)
  const raster = getTerrainRaster()
  const visible = (p: LabelPlacement | undefined) => p && p.minTier <= tier && p.anchors[tier] !== null
  // 그릴 범위 밖(보이는 영역에서 그 폭의 절반 넘게 떨어진 곳)의 마커·그림·라벨은 그리지 않는다 — 고른 것·키보드 초점은 남긴다
  const cull = view.cull
  const boxInView = (b: Box) => b.x1 >= cull.x0 && b.x0 <= cull.x1 && b.y1 >= cull.y0 && b.y0 <= cull.y1
  const pointInView = ([x, y]: Point) => x >= cull.x0 && x <= cull.x1 && y >= cull.y0 && y <= cull.y1

  return (
    <svg
      ref={svgRef}
      className="zendikar-map"
      data-lang={lang}
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      role="group"
      aria-label="젠디카르 지도 — 끌어서 이동, 휠이나 두 손가락으로 확대. 장소는 Tab 으로 고르거나 지명 찾기로 찾을 수 있습니다."
      onClick={(e) => {
        if (e.target === e.currentTarget && !pickNear(e)) onSelect(null)
      }}
    >
      <defs>
        <clipPath id="land-clip">
          <path d={shapes.land} />
        </clipPath>
        <clipPath id="inland-clip">
          <path d={shapes.inland} />
        </clipPath>
        <radialGradient id="hedron-shadow-fill">
          <stop offset="0" stopColor="var(--ink)" stopOpacity="0.32" />
          <stop offset="1" stopColor="var(--ink)" stopOpacity="0" />
        </radialGradient>
        {holes && (
          <mask id="detail-holes" maskUnits="userSpaceOnUse" x={-MAP_WIDTH * 3} y={-MAP_HEIGHT * 3} width={MAP_WIDTH * 7} height={MAP_HEIGHT * 7}>
            <rect x={-MAP_WIDTH * 3} y={-MAP_HEIGHT * 3} width={MAP_WIDTH * 7} height={MAP_HEIGHT * 7} fill="white" />
            {/* 구멍마다 묶음 — 지역 상세 그림과 같은 조건(그릴 범위 안)으로 붙어 세계 지도 것과 바로 맞바뀐다 (옅게 하지 않는다 — map.css) */}
            {activeDetails.filter((d) => boxInView(d.bounds)).map((d) => (
              <g key={d.id} className="detail-hole">
                <FeatherShapes
                  id={`detail-hole-${d.id}`}
                  x0={d.bounds.x0}
                  y0={d.bounds.y0}
                  x1={d.bounds.x1}
                  y1={d.bounds.y1}
                  band={detailBand(d)}
                  edge="white"
                  inner="black"
                />
              </g>
            ))}
          </mask>
        )}
        <linearGradient id="north-fog-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--sea)" stopOpacity="1" />
          <stop offset="1" stopColor="var(--sea)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g ref={layerRef} data-tier={tier}>
        <g onClick={(e) => e.target instanceof SVGRectElement && !pickNear(e) && onSelect(null)}>
          <SeaAndLand washes={washes} seaMarks={seaMarks.sea} shapes={shapes} ripples={ripples} holeMask={holeMask} />
        </g>
        <g mask={holeMask}>
          <Terrain t={terrain} scatter={false} />
        </g>
        {/* 흩뿌린 기호는 구멍 밖에 한 자리로 — 얕은 배율에는 구멍이 없고, 깊은 확대에서 잘게 뿌린 칸을 기다리며 이것으로 메울 때
            지역 상세의 기호는 그 칸에 들어 있어 구멍이 이것까지 걷어 내면 그 자리 땅이 빈다. 한 자리라 4↔5 를 넘어도 다시 만들지 않는다 */}
        {fine.level === 0 && <Terrain t={terrain} scatter lines={false} />}
        {fine.level > 0 && <FineTerrain level={fine.level} tiles={fine.tiles} />}
        <InlandWaters marks={seaMarks.lake} shapes={shapes} />
        <g mask={holeMask}>
          <WaterCliffs paths={terrain.waterCliffs} />
        </g>
        {/* 한 덩어리를 나눠 쓰는 대륙 사이의 경계 — 범위 다각형 중 땅 위에 놓인 변만 보인다 */}
        {/* 경계는 그 대륙이 놓인 땅 덩어리 위에만 — 범위 다각형의 곧은 변이 이웃 대륙의 땅(아코움 남쪽 해안)을 가로지르지 않게 */}
        <g className="continent-borders" mask={holeMask}>
          {continents
            .filter((c) => c.area && c.drawBorder)
            .map((c) => {
              const land = landmassById.get(c.landmass)
              if (!land) return null
              const clipId = `border-land-${c.id}`
              return (
                <g key={c.id}>
                  <clipPath id={clipId}>
                    <path d={ringToPath(land.ring)} />
                  </clipPath>
                  <path d={ringToPath(c.area!)} clipPath={`url(#${clipId})`} />
                </g>
              )
            })}
        </g>
        <g className="coast">
          {shapes.coast.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <g mask={holeMask}>
          <Rivers paths={rivers} />
        </g>
        <g mask={holeMask}>
          <Landmarks shapes={landmarks} />
        </g>
        {/* 지역 상세 — 손으로 그린 지형지물과 이름 (지형 기호는 FineTerrain 이 함께 뿌린다) */}
        {activeDetails
          .filter((d) => boxInView(d.bounds))
          .map((d) => (
            <ChildDetailArt key={d.id} detail={d} art={childArt[d.id]} lang={lang} hiddenLabels={detailLabelHidden.get(d.id)} phase={phaseLevel} />
          ))}
        {highlighted && (
          <>
            {highlighted.area && (
              <clipPath id="continent-area-clip">
                <path d={ringToPath(highlighted.area)} />
              </clipPath>
            )}
            <path
              d={[highlighted.landmass, ...(highlighted.islands ?? [])]
                .map((id) => ringToPath(landmassById.get(id)?.ring ?? []))
                .join('')}
              className="continent-highlight"
              clipPath={highlighted.area ? 'url(#continent-area-clip)' : undefined}
            />
          </>
        )}
        <NorthFog />
        {/* 대륙을 고르는 투명한 판 — 기호보다 위, 라벨·마커보다 아래 */}
        <path d={shapes.land} className="land-hit" onClick={handleLandClick} />
        <g mask={holeMask}>
          <Hedrons items={hedronItems} />
        </g>

        {/* 페이즈 그림 — 지형 위, 라벨·기호 아래. 화면에서 FIGURE_MIN_PX 가 못 되면 그리지 않는다 (고른 것·키보드 초점은 남긴다) */}
        {figureArt && figures.length > 0 && (
          <g className="figures">
            {/* 대륙명이 보이는 배율에서는 그 글자에 걸리는 그림을 잠시 숨긴다 — 확대해 대륙명이 물러나면 나온다 (카드 기호와 같은 규칙) */}
            {figures.map((f) => {
              const art = figureArt[f.id]
              const box = figureBoxes.get(f.id)
              if (!art || !box) return null
              const id = figureId(f)
              const isSel = selection?.type === 'card' && selection.id === f.id
              if (f.size * px < FIGURE_MIN_PX && !isSel && focusedId !== id) return null
              if (!isSel && focusedId !== id && (underContinentName(box) || !boxInView(box))) return null
              // 지역 상세에 사는 대상은 그 지역 상세가 나온 배율에서만. 세계 지도 그림은 지역 상세가 나와도 그대로 둔다 (지역 상세는 큰 대상을 다시 그리지 않는다)
              if (!isSel && focusedId !== id && f.childMap && tier < figureTier(f)) return null
              const k = f.size / Math.max(art.viewBox[2], art.viewBox[3])
              const p = placements.get(id)
              // 이름은 배치가 자리를 준 배율에서만 — 고른 그림이라도 다른 이름 위에 억지로 쓰지 않는다 (패널 제목에 이름이 있다)
              const labelled = visible(p)
              const anchor = p?.anchors[tier] ?? 'below'
              const a = ANCHOR_TEXT[anchor]
              const name = displayName(f, lang)
              const pick = () => onSelectFigure(f.id)
              return (
                <g
                  key={f.id}
                  className={`figure ${isSel ? 'is-selected' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${name} — ${f.set.toUpperCase()} 카드${f.estimate ? ', 자리는 추정' : ''}`}
                  aria-pressed={isSel}
                  onClick={(e) => {
                    e.stopPropagation()
                    pick()
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      pick()
                    }
                  }}
                  onFocus={(e) => {
                    setFocusedId(id)
                    if (e.currentTarget.matches(':focus-visible')) onFocusPoint(f.at[0], f.at[1])
                  }}
                  onBlur={() => setFocusedId((cur) => (cur === id ? null : cur))}
                >
                  {/* 키보드 초점 — 그림 둘레 점선 (고른 상태의 강조색과 구별되게) */}
                  <rect className="figure-focus" x={box.x0 - 4 / px} y={box.y0 - 4 / px} width={box.x1 - box.x0 + 8 / px} height={box.y1 - box.y0 + 8 / px} />
                  <FigureShape art={art} transform={`translate(${f.at[0]} ${f.at[1]}) scale(${f.flip ? -k : k} ${k}) translate(${-art.anchor[0]} ${-art.anchor[1]})`} />
                  {labelled ? (
                    <g
                      transform={`translate(${anchor === 'right' ? box.x1 : anchor === 'left' ? box.x0 : (box.x0 + box.x1) / 2} ${
                        anchor === 'right' || anchor === 'left' ? (box.y0 + box.y1) / 2 : box.y1
                      })`}
                    >
                      {/* 라벨은 마커처럼 화면 크기 고정 — 그림 밑 가운데에서 */}
                      <g className="figure-caption">
                        <text
                          className={`figure-label ${koClass(f, lang)}`}
                          x={a.dx}
                          dy={`${a.dy}em`}
                          y={anchor === 'above' ? -6 : anchor === 'below' ? 6 : 0}
                          textAnchor={a.textAnchor}
                          fontSize={POINT_FONT_PX[tier]}
                        >
                          {name}
                        </text>
                      </g>
                    </g>
                  ) : (
                    <title>{name}</title>
                  )}
                </g>
              )
            })}
          </g>
        )}

        {/* 지역·대륙 라벨은 포인터로 고르는 보조 수단 — 키보드·화면 읽기 프로그램은 지명 찾기와 장소 패널로 같은 곳에 간다 */}
        <g className="area-labels" aria-hidden="true">
          {areas.map((l) => {
            const isSel = selectedId === l.id
            const at = layouts[tier].area.at.get(l.id) ?? (isSel ? l.position : null)
            // 지역 상세가 나온 자리의 지역 이름, 지역 상세가 단 이름은 그 그림이 다시 단다
            if (!at || (!isSel && (!pointInView(at) || inActiveDetail(at) || detailLabelTexts.has(l.name)))) return null
            const name = displayName(l, lang)
            const font = areaFontUnits(areaStyle(l.prominence), px)
            // 바다·호수 위에 놓인 라벨은 테두리를 물빛으로 — 양피지색 테두리는 물 위에서 스티커처럼 뜬다
            const onWater = labelOnWater(raster, name, at, font)
            const className = `area-label ${l.kind === 'water' ? 'is-water' : ''} ${onWater ? 'on-water' : ''} ${isSel ? 'is-selected' : ''} ${koClass(l, lang)}`
            const select = () => onSelect({ type: 'location', id: l.id })
            // 강 이름(물결 밑선)에는 붙이지 않는다 — 지역 상세가 있는 곳 가운데 강은 없다
            if (l.terrain === 'river') {
              const pathId = `river-baseline-${l.id}`
              return (
                <g key={l.id}>
                  <path id={pathId} d={riverBaseline(name, at, font)} className="river-baseline" />
                  <text fontSize={font} className={className} onClick={select}>
                    <textPath href={`#${pathId}`} startOffset="50%">
                      {name}
                    </textPath>
                  </text>
                </g>
              )
            }
            const text = (
              <text x={at[0]} y={at[1]} fontSize={font} className={className} onClick={select}>
                {name}
              </text>
            )
            // 지역 상세가 있는 곳 — 이름 끝 표시까지 자리를 잡았을 때만, 가운데 맞춘 글자의 오른쪽 끝 뒤에 (처음엔 자간까지 더한 폭 추정).
            // 마지막 글자 뒤의 자간 한 칸은 덜어 낸다 — 점 라벨처럼 보이는 틈이 3px 이 되게
            if (!layouts[tier].area.suffixed.has(l.id)) return <g key={l.id}>{text}</g>
            const ko = koClass(l, lang) !== ''
            const tracking = (ko ? 0.04 : AREA_TRACKING) * font
            return (
              <g key={l.id}>
                {text}
                <ChildMapMark
                  edge={at[0] + areaTextWidth(name, font, ko ? 0.04 : AREA_TRACKING) / 2 - tracking}
                  trim={tracking}
                  y={at[1] - font * markMidEm(ko)}
                  side="end"
                  scaled
                  title={childMarkTitle(name)}
                  className={`${onWater ? 'on-water' : ''} ${isSel ? 'is-selected' : ''}`}
                  onClick={select}
                />
              </g>
            )
          })}
        </g>

        <g className="continent-labels" aria-hidden="true">
          {continents.map((c) => {
            const isSel = highlightId === c.id
            // 가까이 들어가면 대륙명은 물러난다 — 이 배율의 라벨 배치도 대륙명 자리를 비워 두지 않는다
            const faded = tier >= CONTINENT_LABEL_HIDE_TIER
            const { x } = continentLabelPlace(c, px, lang)
            return (
              <text
                key={c.id}
                x={x}
                y={c.label.at[1]}
                fontSize={continentFontUnits(c.label.size ?? CONTINENT_FONT, px)}
                transform={c.label.rotate ? `rotate(${c.label.rotate} ${x} ${c.label.at[1]})` : undefined}
                className={`continent-label ${isSel ? 'is-selected' : ''} ${faded ? 'is-faded' : ''} ${koClass(c, lang)}`}
                onClick={faded ? undefined : () => onSelect({ type: 'continent', id: c.id })}
              >
                {displayName(c, lang)}
              </text>
            )
          })}
        </g>

        {/* 대지 카드 — 장소 마커와 같은 기호(정착지·지하 유적·지형지물 등)로, 장소 마커보다 아래에 그린다.
            자리가 없는 장소와 하나인 카드는 이 표시가 곧 그 장소의 표시다 (장소 이름을 달고, 장소를 고르면 같이 골린다) */}
        <g className="card-pins">
          {cards.map((c) => {
            const id = cardId(c)
            const place = pinPlace(c)
            const isSel = selection?.type === 'card' ? selection.id === c.id : place !== undefined && selectedId === place.id
            const shownHere = cardShown[tier].has(c.id)
            if (!isSel && focusedId !== id && (!shownHere || !pointInView(c.at))) return null
            const p = placements.get(id)
            // 이 배율에 숨은 카드는 골라도 이름을 달지 않는다 — 배치가 자리를 잡아 주지 않아 억지로 달면 다른 라벨과 겹친다 (이름은 패널 제목에 있다)
            const labelled = (shownHere && visible(p)) || focusedId === id
            const anchor = detailAnchor(id, c.at) ?? p?.anchors[tier] ?? 'right'
            const a = ANCHOR_TEXT[anchor]
            const name = displayName(place ?? c, lang)
            const pick = () => onSelectCard(c)
            return (
              <g key={id} transform={`translate(${c.at[0]} ${c.at[1]})`}>
                <g
                  className={`marker card-pin kind-${c.kind} ${isSel ? 'is-selected' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${name}${place?.nameKo && lang === 'en' ? ` (${place.nameKo})` : ''} — ${c.set.toUpperCase()} 대지 카드${c.estimate ? ', 자리는 추정' : ''}`}
                  aria-pressed={isSel}
                  onClick={(e) => {
                    e.stopPropagation()
                    pick()
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      pick()
                    }
                  }}
                  onFocus={(e) => {
                    setFocusedId(id)
                    if (e.currentTarget.matches(':focus-visible')) onFocusPoint(c.at[0], c.at[1])
                  }}
                  onBlur={() => setFocusedId((f) => (f === id ? null : f))}
                >
                  <circle r={11} className="marker-hit" />
                  {isSel && <circle r={9} className="marker-ring" />}
                  <MarkerGlyph kind={c.kind} />
                  {labelled ? (
                    <text
                      x={a.dx}
                      dy={`${a.dy}em`}
                      y={anchor === 'above' ? -6 : anchor === 'below' ? 6 : 0}
                      textAnchor={a.textAnchor}
                      fontSize={POINT_FONT_PX[tier]}
                      className={`point-label ${koClass(place ?? c, lang)}`}
                    >
                      {name}
                    </text>
                  ) : (
                    <title>{name}</title>
                  )}
                </g>
              </g>
            )
          })}
        </g>

        <g className="markers">
          {points.map((l) => {
            const p = placements.get(l.id)
            const isSel = selectedId === l.id
            // 놓인 섬이 이 배율에서 기호보다 작으면 그리지 않는다 — 고른 곳과 키보드 초점은 남긴다
            if (!isSel && focusedId !== l.id && (tier < glyphFrom(l.id) || !pointInView(l.position))) return null
            // 지역 상세가 이름 쪽을 정한 곳은 그 그림이 자리를 비워 두었다 — 배치가 자리를 못 찾아도 단다
            const forced = detailAnchor(l.id, l.position)
            const labelled = visible(p) || isSel || focusedId === l.id || forced !== undefined
            // 라벨 자리를 못 찾아도 이 배율에서 보여야 할 만큼 중요한 곳은 기호만이라도 남긴다
            if (!labelled && l.prominence < SHOW_FROM[tier]) return null
            const anchor = forced ?? p?.anchors[tier] ?? 'right'
            const a = ANCHOR_TEXT[anchor]
            const name = displayName(l, lang)
            const hasChild = childMapPlaces.has(l.id)
            // 이름을 기호 아닌 자리(쓰러진 헤드론의 끝)에 다는 곳 — 지도 단위 거리를 화면 px 로 (마커 묶음은 --inv-px 로 줄어 있다)
            // 지역 상세가 이름 쪽을 정한 곳은 그 그림의 자리에 — 세계 지도 헤드론 끝(지금은 숨은)에 맞추지 않는다
            const at = forced ? undefined : pointAnchorAt.get(l.id)?.[anchor]
            const shift = at
              ? { transform: `translate(calc(${(at[0] - l.position[0]).toFixed(2)}px / var(--inv-px, 1)), calc(${(at[1] - l.position[1]).toFixed(2)}px / var(--inv-px, 1)))` }
              : undefined
            // 지역 상세가 있는 곳의 아이콘 — 배치가 이 배율에서 이름 끝 표시까지 자리를 준 라벨에만 (자리가 모자라 이름만 둔 배율, 이름 없는 기호에는 없다)
            const font = POINT_FONT_PX[tier]
            const ko = koClass(l, lang) !== ''
            let mark: { edge: number; y: number } | null = null
            if (hasChild && visible(p) && p?.suffixed[tier]) {
              const w = textWidthEm(name) * font
              // 왼쪽 라벨은 글자가 기호에서 끝나므로 글자 앞에 — 기호와 이름 사이에 끼지 않게
              const edge = anchor === 'right' ? a.dx + w : anchor === 'left' ? a.dx - w : w / 2
              // 높이는 글자를 따른다 — 아래 라벨의 글자는 배치 상자보다 조금 낮게 그려져 아이콘도 함께 낮다
              const baseline = (anchor === 'above' ? -6 : anchor === 'below' ? 6 : 0) + a.dy * font
              mark = { edge, y: baseline - markMidEm(ko) * font }
            }
            return (
              <g key={l.id} transform={`translate(${l.position[0]} ${l.position[1]})`}>
                <g
                  className={`marker kind-${l.kind} ${isSel ? 'is-selected' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${name}${l.nameKo && lang === 'en' ? ` (${l.nameKo})` : ''}${hasChild ? ' — 확대하면 지역 상세' : ''}`}
                  aria-pressed={isSel}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect({ type: 'location', id: l.id })
                  }}
                  onKeyDown={(e) => onKey(e, l)}
                  onFocus={(e) => {
                    setFocusedId(l.id)
                    // 키보드로 온 초점만 따라간다 — 마우스로 누른 곳은 이미 화면에 있다
                    if (e.currentTarget.matches(':focus-visible')) onFocusPoint(l.position[0], l.position[1])
                  }}
                  onBlur={() => setFocusedId((id) => (id === l.id ? null : id))}
                >
                  <circle r={11} className="marker-hit" />
                  {isSel && <circle r={9} className="marker-ring" />}
                  <MarkerGlyph kind={l.kind as PointKind} />
                  {labelled ? (
                    <text
                      x={a.dx}
                      dy={`${a.dy}em`}
                      y={anchor === 'above' ? -6 : anchor === 'below' ? 6 : 0}
                      textAnchor={a.textAnchor}
                      fontSize={font}
                      style={shift}
                      className={`point-label ${koClass(l, lang)}`}
                    >
                      {name}
                    </text>
                  ) : (
                    <title>{hasChild ? childMarkTitle(name) : name}</title>
                  )}
                  {mark && <ChildMapMark edge={mark.edge} y={mark.y} side={anchor === 'left' ? 'start' : 'end'} title={childMarkTitle(name)} shift={shift} />}
                </g>
              </g>
            )
          })}
        </g>

      </g>
    </svg>
  )
}
