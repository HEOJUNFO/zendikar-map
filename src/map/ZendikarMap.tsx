import { memo, useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react'
import type { PinnedCard } from '../data/cards'
import { isPlaced, type Continent, type HedronCluster, type Location, type PlacedLocation, type TerrainArea } from '../data/types'
import { forests, inlandWaters, landmassById, landmasses, MAP_HEIGHT, MAP_WIDTH, type Landmass } from './geo'
import { hashSeed, mulberry32, pointInRing, ringArea, ringToPath, type Point } from './geometry'
import { MARKER_PATHS, type PointKind } from './glyphs'
import {
  areaFontUnits,
  areaLabelBox,
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
import { buildTerrain, type ReliefProfile, type TerrainKind, type TerrainPatch } from './terrain'
import { MAX_ZOOM, MIN_ZOOM, TIER_PX_PER_UNIT, tierFor, type MapView } from './useMapZoom'
import './map.css'

export type { LabelLang, Selection } from './names'

interface Props {
  continents: Continent[]
  locations: Location[]
  hedrons: HedronCluster[]
  terrainAreas: TerrainArea[]
  /** 육지 덩어리 위의 한 점이 어느 대륙인지 (발라 게드처럼 덩어리를 나눠 쓰는 경우) */
  continentAt: (landmassId: string, x: number, y: number) => string | null
  selection: Selection | null
  /** 위치가 알려지지 않은 장소를 골랐을 때 그 대륙을 강조한다 */
  highlightContinentId: string | null
  onSelect: (s: Selection | null) => void
  /** 대지 카드(ZEN·WWK) 가운데 지도에 따로 표시가 있는 것 — 누르면 카드 패널이 열린다 */
  cards: PinnedCard[]
  /** 장소와 하나인 카드 id → 장소 id — 그 카드 표시는 장소의 표시라 장소 이름을 달고, 장소를 고르면 같이 골린다 */
  cardPlaceIds: ReadonlyMap<string, string>
  onSelectCard: (card: PinnedCard) => void
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
/** tier 별로 라벨을 보여 줄 최소 prominence */
const SHOW_FROM = [3, 3, 2, 1, 0]
const POINT_FONT_PX = [14, 15, 14, 13, 13]

/** 카드 라벨은 이름 있는 장소보다 뒤에 자리를 잡는다 (2: 중간 배율부터) */
const CARD_PROMINENCE = 2
/** 카드 기호끼리, 또는 보이는 지점 마커와 화면에서 이만큼(px) 가까우면 그 배율 단계에서는 카드 기호를 숨긴다 */
const CARD_GAP_PX = 11
const cardId = (c: PinnedCard) => `card:${c.number}`

/**
 * 기호가 놓인 땅이 화면에서 이보다 작으면(넓이의 제곱근, px) 그 배율 단계에서는 기호를 그리지 않는다 — 작은 섬을 기호가 덮지 않게.
 * 12px 는 labels.ts 가 기호 하나에 잡아 두는 12×12px 상자다 — 섬이 적어도 기호 한 칸은 되어야 한다.
 * Beyeen(Valakut)은 tier 1(0.3px/단위)에서 44.6 × 0.3 ≈ 13.4px 로 여유가 11% 남짓이다 — 해안선을 다시 뽑으면(extract_geo.py) 확인한다.
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
}

const landPath = landmasses.map((l) => ringToPath(l.ring)).join('')
const ripplePath = landmasses.map((l) => ringToPath(l.smooth)).join('')
const forestPath = forests.map(ringToPath).join('')
const inlandPath = inlandWaters.map(ringToPath).join('')

const SeaAndLand = memo(function SeaAndLand() {
  return (
    <>
      {/* 세로로 아주 긴 화면에서 전체를 볼 때도 지도 위아래 여백까지 바다로 — 넉넉히 덮는다 */}
      <rect className="sea" x={-MAP_WIDTH * 3} y={-MAP_HEIGHT * 3} width={MAP_WIDTH * 7} height={MAP_HEIGHT * 7} />
      {/* 해안 물결선: 굵은 잉크 획 위에 바다색 획을 덮어 해안과 평행한 가는 선만 남긴다 */}
      <g className="coast-ripples" aria-hidden="true">
        {[26, 16, 8].map((d) => (
          <g key={d}>
            <path d={ripplePath} className="ripple-ink" strokeWidth={d * 2 + 1.1} style={{ opacity: 0.9 - d / 40 }} />
            <path d={ripplePath} className="ripple-sea" strokeWidth={d * 2 - 1.1} />
          </g>
        ))}
      </g>
      <path d={landPath} className="land" />
      <path d={landPath} className="shore-shade" clipPath="url(#land-clip)" />
      <path d={forestPath} className="forest-wash" clipPath="url(#land-clip)" />
    </>
  )
})

/** 육지 안의 물 — 지형 기호 위에 그려 호수 테두리를 산·나무가 끊지 않게 한다 */
const InlandWaters = memo(function InlandWaters() {
  return (
    <g aria-hidden="true">
      <path d={inlandPath} className="inland-sea" />
      <path d={inlandPath} className="inland-sea-ripple" clipPath="url(#inland-clip)" />
    </g>
  )
})

const Terrain = memo(function Terrain({
  profileFor,
  patches,
  avoid,
}: {
  profileFor: (l: Landmass, x: number, y: number) => ReliefProfile
  patches: TerrainPatch[]
  avoid: Point[]
}) {
  const t = useMemo(() => buildTerrain(profileFor, patches, avoid), [profileFor, patches, avoid])
  return (
    <g className="terrain" aria-hidden="true">
      <path d={t.cliffs} className="cliffs" />
      <path d={t.canyons} className="canyons" />
      <path d={t.ice} className="ice" />
      <path d={t.marsh} className="marsh" />
      {/* 수관은 한 번만 그린다 — 칠과 테두리를 한 path 에 */}
      <path d={t.trees.crowns} className="tree-crown" />
      <path d={t.trees.trunks} className="tree-ink" />
      {t.mountains.map((band) => (
        <g key={band.key}>
          <path d={band.fill} className="mtn-fill" />
          <path d={band.hatch} className="mtn-hatch" />
          <path d={band.ridge} className="mtn-ink" />
        </g>
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

const Hedrons = memo(function Hedrons({ clusters, avoid }: { clusters: HedronCluster[]; avoid: Point[] }) {
  const items = useMemo(() => {
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
        out.push({
          key: `${c.id}-${out.length}`,
          x,
          y,
          // 쓰러진 헤드론은 거의 눕고, 떠 있는 것은 조금씩 기운다
          rot: c.grounded ? 62 + rand() * 50 : (rand() - 0.5) * 50,
          lift: c.grounded ? 0 : 9 + rand() * 9,
          grounded: Boolean(c.grounded),
          shape: hedronShape(len, len * 0.36),
          delay: -(rand() * 7).toFixed(2),
        })
      }
      return out
    })
  }, [clusters, avoid])
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
 * 강 이름은 옛 지도처럼 완만한 물결을 따라 쓴다 — 물줄기 경로는 공식 자료에 없어 선으로 지어 그리지 않고,
 * 글자만으로 '흐르는 물'임을 알린다. 물결 높이는 글자 크기의 0.12배라 배치 상자(위 0.94, 아래 0.31) 안에 든다.
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
/** 이 tier 부터는 대륙 하나를 들여다보는 배율 — 대륙명은 물러나고 그 자리를 지명에 내준다 */
const CONTINENT_LABEL_HIDE_TIER = 3

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
  terrainAreas,
  continentAt,
  selection,
  highlightContinentId,
  onSelect,
  cards,
  cardPlaceIds,
  onSelectCard,
  onFocusPoint,
  lang,
  view,
  svgRef,
  layerRef,
}: Props) {
  const placed = useMemo(() => locations.filter(isPlaced), [locations])
  const points = useMemo(() => placed.filter((l) => l.kind !== 'region' && l.kind !== 'water'), [placed])
  const areas = useMemo(() => placed.filter((l) => l.kind === 'region' || l.kind === 'water'), [placed])

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

  const patches = useMemo<TerrainPatch[]>(
    () => [
      ...areas.flatMap((l) => {
        const kind = l.terrain ? TERRAIN_PATCH[l.terrain] : undefined
        if (!kind || !l.extent) return []
        return [{ kind, x: l.position[0], y: l.position[1], rx: l.extent[0], ry: l.extent[1] }]
      }),
      ...terrainAreas.map((t) => ({ kind: t.kind, x: t.at[0], y: t.at[1], rx: t.extent[0], ry: t.extent[1] })),
    ],
    [areas, terrainAreas],
  )
  const avoid = useMemo<Point[]>(() => points.map((l) => l.position), [points])

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

  const pointInputs = useMemo(
    () =>
      points.map((l) => ({
        id: l.id,
        at: l.position,
        text: displayName(l, lang),
        prominence: l.prominence,
        fontPx: POINT_FONT_PX[0],
        fromTier: glyphFrom(l.id),
      })),
    [points, lang, glyphFrom],
  )

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
        const markers = points.filter((l) => l.prominence >= SHOW_FROM[tier] && tier >= glyphFrom(l.id)).map((l) => l.position)
        const taken: Point[] = []
        const order = [...cards].sort((a, b) => Number(Boolean(a.estimate)) - Number(Boolean(b.estimate)) || a.number.localeCompare(b.number))
        for (const c of order) {
          // 놓인 섬이 이 배율에서 기호보다 작으면 두지 않는다 — 자리도 차지하지 않는다
          if (tier < glyphFrom(cardId(c))) continue
          const near = (q: Point) => Math.hypot(q[0] - c.at[0], q[1] - c.at[1]) < gap
          if (markers.some(near) || taken.some(near)) continue
          taken.push(c.at)
          shown.add(c.number)
        }
        return shown
      }),
    [cards, points, tierPx, glyphFrom],
  )

  // tier 마다: 대륙명 상자 → 지역 라벨(보일 지점은 먼저 자리를 비워 둔다) → 지점 라벨
  const layouts = useMemo(() => {
    const inputs = areas.map((l) => ({
      id: l.id,
      at: l.position,
      extent: l.extent,
      text: displayName(l, lang),
      prominence: l.prominence,
    }))
    return tierPx.map((px, tier) => {
      const continentBoxes: Box[] = tier >= CONTINENT_LABEL_HIDE_TIER ? [] : continents.map((c) => {
        const size = continentFontUnits(c.label.size ?? CONTINENT_FONT, px)
        const w = textWidthEm(displayName(c, lang)) * size * 1.25
        return { x0: c.label.at[0] - w / 2, y0: c.label.at[1] - size * 0.75, x1: c.label.at[0] + w / 2, y1: c.label.at[1] + size * 0.2 }
      })
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
          .filter((c) => cardShown[tier].has(c.number))
          .map((c) => {
            const r = 8 / px
            return { x0: c.at[0] - r, y0: c.at[1] - r, x1: c.at[0] + r, y1: c.at[1] + r }
          }),
      ]
      const area = layoutAreaLabels(inputs, areaStyle, px, [...continentBoxes, ...reserved])
      return { area, obstacles: [...continentBoxes, ...area.boxes] }
    })
  }, [areas, continents, lang, pointInputs, tierPx, cards, cardShown])

  // 지점 라벨과 카드 라벨은 한꺼번에 자리를 잡는다 — 서로 겹치지 않게
  const placements = useMemo(
    () => placeLabels([...pointInputs, ...cardInputs], layouts.map((l) => l.obstacles), tierPx, SHOW_FROM),
    [pointInputs, cardInputs, layouts, tierPx],
  )

  const selectedId = selection?.type === 'location' ? selection.id : null
  // 키보드 초점이 있는 마커는 배율 단계가 바뀌어도 내리지 않는다 — 내리면 초점이 <body> 로 빠진다
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const highlightId = selection?.type === 'continent' ? selection.id : highlightContinentId
  const highlighted = highlightId ? continents.find((c) => c.id === highlightId) ?? null : null

  const handleLandClick = (e: MouseEvent<SVGPathElement>) => {
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
  const raster = getTerrainRaster()
  const visible = (p: LabelPlacement | undefined) => p && p.minTier <= tier && p.anchors[tier] !== null

  return (
    <svg
      ref={svgRef}
      className="zendikar-map"
      data-lang={lang}
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      role="group"
      aria-label="젠디카르 지도 — 끌어서 이동, 휠이나 두 손가락으로 확대. 장소는 Tab 으로 고르거나 지명 찾기로 찾을 수 있습니다."
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelect(null)
      }}
    >
      <defs>
        <clipPath id="land-clip">
          <path d={landPath} />
        </clipPath>
        <clipPath id="inland-clip">
          <path d={inlandPath} />
        </clipPath>
        <radialGradient id="hedron-shadow-fill">
          <stop offset="0" stopColor="var(--ink)" stopOpacity="0.32" />
          <stop offset="1" stopColor="var(--ink)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="north-fog-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--sea)" stopOpacity="1" />
          <stop offset="1" stopColor="var(--sea)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g ref={layerRef} data-tier={tier}>
        <g onClick={(e) => e.target instanceof SVGRectElement && onSelect(null)}>
          <SeaAndLand />
        </g>
        <Terrain profileFor={relief} patches={patches} avoid={avoid} />
        <InlandWaters />
        {/* 한 덩어리를 나눠 쓰는 대륙 사이의 경계 — 범위 다각형 중 땅 위에 놓인 변만 보인다 */}
        <g className="continent-borders" clipPath="url(#land-clip)">
          {continents
            .filter((c) => c.area && c.drawBorder)
            .map((c) => (
              <path key={c.id} d={ringToPath(c.area!)} />
            ))}
        </g>
        <path d={landPath} className="coast" />
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
        <path d={landPath} className="land-hit" onClick={handleLandClick} />
        <Hedrons clusters={hedrons} avoid={avoid} />

        {/* 지역·대륙 라벨은 포인터로 고르는 보조 수단 — 키보드·화면 읽기 프로그램은 지명 찾기와 장소 패널로 같은 곳에 간다 */}
        <g className="area-labels" aria-hidden="true">
          {areas.map((l) => {
            const isSel = selectedId === l.id
            const at = layouts[tier].area.at.get(l.id) ?? (isSel ? l.position : null)
            if (!at) return null
            const name = displayName(l, lang)
            const font = areaFontUnits(areaStyle(l.prominence), px)
            // 바다·호수 위에 놓인 라벨은 테두리를 물빛으로 — 양피지색 테두리는 물 위에서 스티커처럼 뜬다
            const onWater = labelOnWater(raster, name, at, font)
            const className = `area-label ${l.kind === 'water' ? 'is-water' : ''} ${onWater ? 'on-water' : ''} ${isSel ? 'is-selected' : ''} ${koClass(l, lang)}`
            const select = () => onSelect({ type: 'location', id: l.id })
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
            return (
              <text key={l.id} x={at[0]} y={at[1]} fontSize={font} className={className} onClick={select}>
                {name}
              </text>
            )
          })}
        </g>

        <g className="continent-labels" aria-hidden="true">
          {continents.map((c) => {
            const isSel = highlightId === c.id
            // 가까이 들어가면 대륙명은 물러난다 — 이 배율의 라벨 배치도 대륙명 자리를 비워 두지 않는다
            const faded = tier >= CONTINENT_LABEL_HIDE_TIER
            return (
              <text
                key={c.id}
                x={c.label.at[0]}
                y={c.label.at[1]}
                fontSize={continentFontUnits(c.label.size ?? CONTINENT_FONT, px)}
                transform={c.label.rotate ? `rotate(${c.label.rotate} ${c.label.at[0]} ${c.label.at[1]})` : undefined}
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
            const shownHere = cardShown[tier].has(c.number)
            if (!shownHere && !isSel && focusedId !== id) return null
            const p = placements.get(id)
            // 골랐어도 라벨 자리가 날 때만 이름을 단다 — 억지로 달면 다른 라벨과 겹친다 (이름은 패널 제목에 있다)
            const labelled = ((shownHere || isSel) && visible(p)) || focusedId === id
            const anchor = p?.anchors[tier] ?? 'right'
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
            if (!isSel && focusedId !== l.id && tier < glyphFrom(l.id)) return null
            const labelled = visible(p) || isSel || focusedId === l.id
            // 라벨 자리를 못 찾아도 이 배율에서 보여야 할 만큼 중요한 곳은 기호만이라도 남긴다
            if (!labelled && l.prominence < SHOW_FROM[tier]) return null
            const anchor = p?.anchors[tier] ?? 'right'
            const a = ANCHOR_TEXT[anchor]
            const name = displayName(l, lang)
            return (
              <g key={l.id} transform={`translate(${l.position[0]} ${l.position[1]})`}>
                <g
                  className={`marker kind-${l.kind} ${isSel ? 'is-selected' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${name}${l.nameKo && lang === 'en' ? ` (${l.nameKo})` : ''}`}
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
                      fontSize={POINT_FONT_PX[tier]}
                      className={`point-label ${koClass(l, lang)}`}
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
      </g>
    </svg>
  )
}
