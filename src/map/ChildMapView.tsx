// 자식 지도 — 작은 대상이 사는 지역을 큰 축척으로 새로 그린 지역 지도 (세계 지도 → 지역).
// 좌표는 세계 지도의 그 범위를 늘린 것이라 해안·호수·숲, 장소와 대지 카드의 자리가 세계 지도와 맞는다.
// 그 위에 화가가 그린 지형 기호·지형지물·이름과 작은 대상(페이즈 그림)을 얹는다.
// 그림·지형은 지도와 함께 커지고, 장소 기호와 이름은 세계 지도처럼 화면 크기(px)를 지킨다 (--inv-px).
import { select } from 'd3-selection'
import 'd3-transition'
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom'
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import type { PinnedCard } from '../data/cards'
import type { PlacedLocation } from '../data/types'
import type { ChildMapArt } from './childMapArt'
import { buildChildTerrain } from './childTerrain'
import type { FigureArt } from './figures'
import { forests, inlandWaters, landmasses } from './geo'
import { chaikin, ringBounds, ringToPath, type Bounds, type Point, type Ring } from './geometry'
import { MARKER_PATHS, type PointKind } from './glyphs'
import type { Anchor } from './labels'
import { displayName, type LabelLang } from './names'
import type { Cover, ScreenRect } from './useMapZoom'
import './childmap.css'

/** 자식 지도에 그리는 작은 대상 (페이즈 카드) */
export interface ChildSubject {
  id: string
  name: string
  nameKo?: string
  estimate?: string
}

export interface ChildMapHandle {
  zoomBy: (factor: number) => void
  reset: () => void
  /** 고른 것이 화면 밖이나 패널·머리말 밑에 있으면 보이게 옮긴다 */
  reveal: () => void
  /** 키보드 초점을 자식 지도로 (패널을 닫았는데 돌려줄 곳이 없을 때) */
  focus: () => void
}

interface Props {
  /** 자식 지도 범위(세계 지도 단위)와 이름 */
  map: { id: string; name: string; nameKo?: string; bounds: Bounds }
  art: ChildMapArt
  figureArt: Record<string, FigureArt> | null
  subjects: ChildSubject[]
  /** 범위 안의 지점 장소 — 세계 지도와 같은 기호로 */
  places: PlacedLocation[]
  /** 범위 안의 대지 카드 표시 */
  cards: PinnedCard[]
  /** 카드 표시에 다는 이름 — 장소와 하나인 카드는 그 장소의 이름 */
  cardNamed: (card: PinnedCard) => { name: string; nameKo?: string }
  selectedCardId: string | null
  selectedPlaceId: string | null
  lang: LabelLang
  /** 패널·머리말이 지도 가장자리를 가리는 폭 */
  cover: () => Cover
  /** 지도 위에 떠 있는 상자들 — 고른 것이 이 밑에 들면 비켜 보인다 */
  obstacles: () => ScreenRect[]
  /** 머리말(지도 이름표) 상자 — 처음 보기에서 지도가 그 밑에 깔리지 않게 */
  header: () => ScreenRect | null
  onSelectCard: (id: string) => void
  onSelectPlace: (id: string) => void
  /** 빈 곳을 누르면 패널을 닫는다 */
  onClear: () => void
}

const MIN_K = 0.85
const MAX_K = 8
/** 장소·카드 이름 크기 (화면 px) — 세계 지도의 지점 라벨과 같은 크기 */
const POINT_FONT_PX = 14
/** 그림 이름 크기 (화면 px) */
const FIGURE_FONT_PX = 13

const ANCHOR_TEXT: Record<Anchor, { dx: number; dy: number; y: number; textAnchor: 'start' | 'end' | 'middle' }> = {
  right: { dx: 9, dy: 0.34, y: 0, textAnchor: 'start' },
  left: { dx: -9, dy: 0.34, y: 0, textAnchor: 'end' },
  above: { dx: 0, dy: -0.75, y: -6, textAnchor: 'middle' },
  below: { dx: 0, dy: 1.4, y: 6, textAnchor: 'middle' },
}

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const overlaps = (a: Bounds, c: Bounds) => a.x0 < c.x1 && c.x0 < a.x1 && a.y0 < c.y1 && c.y0 < a.y1

/** 범위에 닿는 세계 지도 고리 — 늘렸을 때 각지지 않게 한 번 더 다듬는다 */
function ringsNear(rings: readonly Ring[], b: Bounds): string {
  const pad = { x0: b.x0 - 20, y0: b.y0 - 20, x1: b.x1 + 20, y1: b.y1 + 20 }
  return rings
    .filter((r) => overlaps(ringBounds(r), pad))
    .map((r) => ringToPath(chaikin(r, 2)))
    .join('')
}

export const ChildMapView = forwardRef<ChildMapHandle, Props>(function ChildMapView(props, ref) {
  const { map, art, figureArt, subjects, places, cards, cardNamed, selectedCardId, selectedPlaceId, lang, onSelectCard, onSelectPlace, onClear } =
    props
  const svgRef = useRef<SVGSVGElement>(null)
  const layerRef = useRef<SVGGElement>(null)
  const behavior = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  /** 화면 px / 자식 지도 단위 (배율 1 에서) — viewBox 를 화면에 맞춘 배율 */
  const fit = useRef(1)
  const [W, H] = art.size
  const b = map.bounds
  const scale = W / (b.x1 - b.x0)

  const land = useMemo(() => ringsNear(landmasses.map((l) => l.ring), b), [b])
  const forest = useMemo(() => ringsNear(forests, b), [b])
  const inland = useMemo(() => ringsNear(inlandWaters, b), [b])
  const terrain = useMemo(() => buildChildTerrain(art.terrain, art.id, art.glyphScale), [art])

  /** 고른 것의 자식 지도 자리 — 작은 대상은 그림 가운데 */
  const selectedAt = (): Point | null => {
    const toChild = ([x, y]: Point): Point => [(x - b.x0) * scale, (y - b.y0) * scale]
    if (selectedCardId) {
      const spot = art.subjects[selectedCardId]
      const fig = figureArt?.[selectedCardId]
      if (spot && fig) {
        const k = spot.size / Math.max(fig.viewBox[2], fig.viewBox[3])
        const [vx, vy, vw, vh] = fig.viewBox
        const dx = (vx + vw / 2 - fig.anchor[0]) * k
        return [spot.at[0] + (spot.flip ? -dx : dx), spot.at[1] + (vy + vh / 2 - fig.anchor[1]) * k]
      }
      if (spot) return spot.at
      const card = cards.find((c) => c.id === selectedCardId)
      if (card) return toChild(card.at)
    }
    const place = selectedPlaceId ? places.find((l) => l.id === selectedPlaceId) : undefined
    return place ? toChild(place.position) : null
  }
  // 줌 동작(열 때 한 번 만든다)이 늘 최신 값을 쓰도록
  const live = useRef({ selectedAt, cover: props.cover, obstacles: props.obstacles, header: props.header })
  useLayoutEffect(() => {
    live.current = { selectedAt, cover: props.cover, obstacles: props.obstacles, header: props.header }
  })

  // d3-zoom 이 붙기 전에는 __zoom 이 없다
  const current = useCallback(
    () => (svgRef.current ? ((select(svgRef.current).property('__zoom') as ZoomTransform | undefined) ?? zoomIdentity) : zoomIdentity),
    [],
  )

  /** 처음 보기의 보이는 범위(지도 단위) — 이동 범위가 이를 품어야 d3 가 처음 보기를 가운데로 되돌리지 않는다 */
  const startRange = useRef<[[number, number], [number, number]] | null>(null)

  /** 패널·머리말이 가리는 만큼 지도 밖으로도 옮길 수 있게 */
  const updateExtent = useCallback(() => {
    const z = behavior.current
    if (!z) return
    const s = fit.current
    const c = live.current.cover()
    let x0 = -W * 0.04 - c.left / s
    let y0 = -H * 0.04 - c.top / s
    let x1 = W * 1.04 + c.right / s
    let y1 = H * 1.04 + c.bottom / s
    const st = startRange.current
    if (st) {
      x0 = Math.min(x0, st[0][0])
      y0 = Math.min(y0, st[0][1])
      x1 = Math.max(x1, st[1][0])
      y1 = Math.max(y1, st[1][1])
    }
    z.translateExtent([
      [x0, y0],
      [x1, y1],
    ])
  }, [W, H])

  const constrain = useCallback(
    (t: ZoomTransform) => {
      const z = behavior.current
      if (!z) return t
      return z.constrain()(
        t,
        [
          [0, 0],
          [W, H],
        ],
        z.translateExtent(),
      )
    },
    [W, H],
  )

  const run = useCallback(
    (t: ZoomTransform, ms: number) => {
      const svg = svgRef.current
      const z = behavior.current
      if (!svg || !z) return
      select(svg)
        .transition()
        .duration(reduceMotion() ? 0 : ms)
        .call(z.transform, constrain(t))
    },
    [constrain],
  )

  /** 고른 것이 화면 밖이나 패널·머리말·조작 버튼 밑이면 가장 조금 옮겨 보인다 */
  const reveal = useCallback((ms: number) => {
    const svg = svgRef.current
    const p = live.current.selectedAt()
    if (!svg || !p || !behavior.current) return
    updateExtent()
    const r = svg.getBoundingClientRect()
    const s = fit.current
    const c = live.current.cover()
    const t = current()
    const ox = (r.width - W * s) / 2
    const oy = (r.height - H * s) / 2
    let sx = ox + t.applyX(p[0]) * s
    let sy = oy + t.applyY(p[1]) * s
    const m = 56
    const into = (v: number, lo: number, hi: number) => (hi <= lo ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)))
    const tx = into(sx, c.left + m, r.width - c.right - m)
    const ty = into(sy, c.top + m, r.height - c.bottom - m)
    let dx = tx - sx
    let dy = ty - sy
    sx = tx
    sy = ty
    // 떠 있는 상자(머리말·확대 단추) 밑이면 그 상자 아래나 오른쪽으로
    for (const o of live.current.obstacles()) {
      if (sx < o.left - m / 2 || sx > o.right + m / 2 || sy < o.top - m / 2 || sy > o.bottom + m / 2) continue
      const down = o.bottom + m - sy
      const right = o.right + m - sx
      if (down < right && sy + down < r.height - c.bottom) {
        dy += down
        sy += down
      } else {
        dx += right
        sx += right
      }
    }
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
    run(t.translate(dx / (s * t.k), dy / (s * t.k)), ms)
  }, [W, H, current, run, updateExtent])

  /**
   * 처음 보기 — 패널이 가리지 않은 곳에 지도 전체를 맞추되, 머리말(지도 이름표) 밑에 지도가 깔리면 머리말 오른쪽이나
   * 아래 가운데 지도가 더 크게 드는 쪽에 맞춘다 (넓은 화면에서는 배율 그대로 옆으로 비킬 뿐이다).
   * 세로로 긴 화면(휴대폰)은 전체 맞춤이 너무 작아 화면 높이를 채우는 배율로 키우고(전체 맞춤의 3배까지, 머리말 밑까지 지도가 깔린다)
   * 그림의 focus(없으면 작은 대상들 가운데)를 가리지 않은 곳 가운데에 둔다. 되돌리기 단추도 여기로 온다.
   */
  const startView = useCallback(() => {
    const svg = svgRef.current
    if (!svg) return zoomIdentity
    const r = svg.getBoundingClientRect()
    const s = fit.current
    const c = { ...live.current.cover() }
    let availW = Math.max(120, r.width - c.left - c.right)
    let availH = Math.max(120, r.height - c.top - c.bottom)
    let ppu = Math.min(availW / W, availH / H)
    let center: Point = [W / 2, H / 2]
    const head = live.current.header()
    if (head && r.width >= r.height) {
      // 가운데 맞춘 지도 상자가 머리말과 겹치는지
      const mx0 = c.left + (availW - W * ppu) / 2
      const my0 = c.top + (availH - H * ppu) / 2
      if (mx0 < head.right && my0 < head.bottom && mx0 + W * ppu > head.left && my0 + H * ppu > head.top) {
        const gap = 12
        const rightW = r.width - c.right - gap - Math.max(c.left, head.right + gap)
        const belowH = r.height - c.bottom - Math.max(c.top, head.bottom + gap)
        const pRight = Math.min(rightW / W, availH / H)
        const pBelow = Math.min(availW / W, belowH / H)
        if (pRight >= pBelow) {
          c.left = Math.max(c.left, head.right + gap)
          availW = rightW
        } else {
          c.top = Math.max(c.top, head.bottom + gap)
          availH = belowH
        }
        ppu = Math.max(pRight, pBelow)
      }
    }
    // 세로 화면인지는 화면 전체로 판단한다 — 아래쪽 시트가 열린 채 열려도 지도를 시트 위 띠에 욱여넣지 않는다 (고른 것은 reveal 이 시트 위로)
    if (r.height > r.width) {
      ppu = Math.min(r.height / H, (r.width / W) * 3)
      const spots = Object.values(art.subjects).map((x) => x.at)
      if (art.focus) center = art.focus
      else if (spots.length) center = [spots.reduce((a, p) => a + p[0], 0) / spots.length, spots.reduce((a, p) => a + p[1], 0) / spots.length]
    }
    const k = ppu / s
    // 가리지 않은 영역의 가운데(화면 px)를 viewBox 단위로
    const vx = (c.left + availW / 2 - (r.width - W * s) / 2) / s
    const vy = (c.top + availH / 2 - (r.height - H * s) / 2) / s
    const t = zoomIdentity.translate(vx - center[0] * k, vy - center[1] * k).scale(k)
    startRange.current = [
      [t.invertX(0), t.invertY(0)],
      [t.invertX(W), t.invertY(H)],
    ]
    updateExtent()
    return constrain(t)
  }, [W, H, art.subjects, art.focus, constrain, updateExtent])

  // 끌어서 옮기고 휠·두 손가락으로 확대 — 자식 지도는 열 때마다 새로 그린다 (App 의 key).
  // App 의 레이아웃 효과(고른 것 보이기)보다 먼저 줌이 붙도록 레이아웃 효과로 둔다
  useLayoutEffect(() => {
    const svg = svgRef.current
    const layer = layerRef.current
    if (!svg || !layer) return
    const sel = select(svg)
    let lastInv = ''
    const measure = () => {
      const r = svg.getBoundingClientRect()
      fit.current = Math.min(r.width / W, r.height / H) || 1
      return r
    }
    const apply = (t: ZoomTransform) => {
      layer.setAttribute('transform', t.toString())
      const inv = String(1 / (fit.current * t.k))
      if (inv !== lastInv) {
        lastInv = inv
        layer.style.setProperty('--inv-px', inv)
      }
    }
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_K, MAX_K])
      .on('zoom', (e: { transform: ZoomTransform }) => apply(e.transform))
    behavior.current = z
    measure()
    updateExtent()
    sel.call(z).on('dblclick.zoom', null)
    sel.call(z.transform, startView())
    // 공유 링크처럼 고른 것과 함께 열리면 그것부터 보인다
    reveal(0)
    // 창 크기가 바뀌거나 화면을 돌리면 배율·이동 범위를 다시 잡고, 고른 것이 가려졌으면 다시 보인다
    const ro = new ResizeObserver(() => {
      measure()
      lastInv = ''
      updateExtent()
      sel.call(z.transform, constrain(current()))
      reveal(0)
    })
    ro.observe(svg)
    // 장소 패널의 '지역 지도 보기'로 열었으면(그 단추가 사라져 초점이 갈 곳이 없으면) 초점을 자식 지도로 — 패널 안에 있는 초점은 그대로
    const active = document.activeElement
    if (!active || active === document.body || active.closest('.zendikar-map')) svg.focus({ preventScroll: true })
    return () => {
      ro.disconnect()
      sel.on('.zoom', null)
    }
    // 자식 지도마다 한 번 (App 의 key) — 바뀌는 값은 live 로 읽는다
  }, [W, H, constrain, current, reveal, startView, updateExtent])

  useImperativeHandle(ref, () => ({
    zoomBy: (factor) => {
      const svg = svgRef.current
      if (!svg) return
      // 패널·머리말에 가리지 않은 영역의 가운데를 기준으로
      const t = current()
      const k = Math.min(MAX_K, Math.max(MIN_K, t.k * factor))
      const r = svg.getBoundingClientRect()
      const s = fit.current
      const c = live.current.cover()
      const vx = (c.left + (r.width - c.left - c.right) / 2 - (r.width - W * s) / 2) / s
      const vy = (c.top + (r.height - c.top - c.bottom) / 2 - (r.height - H * s) / 2) / s
      const mx = (vx - t.x) / t.k
      const my = (vy - t.y) / t.k
      run(zoomIdentity.translate(vx - mx * k, vy - my * k).scale(k), 280)
    },
    reset: () => run(startView(), 420),
    reveal: () => reveal(420),
    focus: () => svgRef.current?.focus({ preventScroll: true }),
  }))

  const onKey = (e: KeyboardEvent, act: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      act()
    }
  }
  const koClass = (l: { nameKo?: string }) => (lang === 'ko' && l.nameKo ? ' is-ko' : '')
  const anchors = art.markAnchors ?? {}

  /** 세계 지도에서 온 표시 — 대지 카드와 장소 */
  const marks = [
    ...cards.map((c) => {
      const named = cardNamed(c)
      const name = displayName(named, lang)
      return {
        key: `card:${c.id}`,
        at: c.at,
        kind: c.kind as PointKind,
        name,
        ko: koClass(named),
        aria: `${name} — ${c.set.toUpperCase()} 대지 카드${c.estimate ? ', 자리는 추정' : ''}`,
        selected: selectedCardId === c.id,
        pick: () => onSelectCard(c.id),
      }
    }),
    ...places.map((l) => {
      const name = displayName(l, lang)
      return {
        key: l.id,
        at: l.position,
        kind: l.kind as PointKind,
        name,
        ko: koClass(l),
        aria: `${name}${l.nameKo && lang === 'en' ? ` (${l.nameKo})` : ''}`,
        selected: selectedPlaceId === l.id,
        pick: () => onSelectPlace(l.id),
      }
    }),
  ]

  return (
    <svg
      ref={svgRef}
      className="child-map"
      data-lang={lang}
      viewBox={`0 0 ${W} ${H}`}
      role="group"
      tabIndex={-1}
      aria-label={`${displayName(map, lang)} 자식 지도 — 끌어서 이동, 휠이나 두 손가락으로 확대. Esc 로 세계 지도에 돌아간다.`}
      onClick={(e) => {
        // 기호·그림 밖을 누르면 패널을 닫는다 (끌기 끝의 클릭은 d3-zoom 이 막는다)
        if (!(e.target as Element).closest('.marker, .figure')) onClear()
      }}
    >
      <defs>
        <clipPath id={`child-clip-${art.id}`}>
          <rect x={0} y={0} width={W} height={H} />
        </clipPath>
      </defs>
      <g ref={layerRef}>
        <g clipPath={`url(#child-clip-${art.id})`}>
          <rect className="child-sea" x={0} y={0} width={W} height={H} />
          {/* 세계 지도의 땅·숲·호수를 이 범위로 늘린다 */}
          <g transform={`scale(${scale}) translate(${-b.x0} ${-b.y0})`}>
            <path className="child-land" d={land} />
            <path className="child-forest" d={forest} />
            <path className="child-inland" d={inland} />
            <path className="child-coast" d={land} />
          </g>
          {/* 지형 기호 */}
          <g transform={`scale(${art.glyphScale})`} className="child-terrain" aria-hidden="true">
            <path className="child-marsh" d={terrain.marsh} />
            <path className="child-canyon" d={terrain.canyons} />
            <path className="child-tree-crown" d={terrain.treeCrowns} />
            <path className="child-tree-ink" d={terrain.treeTrunks} />
            {terrain.mountains.map((m, i) => (
              <g key={i}>
                <path className="child-mtn-fill" d={m.fill} />
                <path className="child-mtn-hatch" d={m.hatch} />
                <path className="child-mtn-ink" d={m.ridge} />
              </g>
            ))}
          </g>
          {/* 손으로 그린 지형지물 */}
          <g className="child-parts" aria-hidden="true">
            {art.parts.map((p, i) => (
              <path key={i} className={`fig-${p.cls}`} d={p.d} />
            ))}
          </g>
          {/* 지역·지형지물 이름 — 공식 이름만 */}
          <g className="child-labels" aria-hidden="true">
            {art.labels.map((l, i) => {
              const ko = lang === 'ko' && l.textKo
              return (
                <text
                  key={i}
                  className={`child-label kind-${l.kind}${ko ? ' is-ko' : ''}`}
                  x={l.at[0]}
                  y={l.at[1]}
                  textAnchor="middle"
                  style={{ '--size': l.size } as CSSProperties}
                  transform={l.rotate ? `rotate(${l.rotate} ${l.at[0]} ${l.at[1]})` : undefined}
                >
                  {ko ? l.textKo : l.text}
                </text>
              )
            })}
          </g>
        </g>
        <rect className="child-border" x={0} y={0} width={W} height={H} />

        {/* 작은 대상 — 페이즈 그림. 이름은 그림 밑에 화면 크기로 */}
        {figureArt && (
          <g className="figures">
            {subjects.map((s) => {
              const spot = art.subjects[s.id]
              const fig = figureArt[s.id]
              if (!spot || !fig) return null
              const k = spot.size / Math.max(fig.viewBox[2], fig.viewBox[3])
              const name = displayName(s, lang)
              const isSel = selectedCardId === s.id
              const pick = () => onSelectCard(s.id)
              const [vx, vy, vw, vh] = fig.viewBox
              const [ax, ay] = fig.anchor
              const below = spot.at[1] + (vy + vh - ay) * k
              const sx = spot.flip ? -k : k
              const xs = [spot.at[0] + sx * (vx - ax), spot.at[0] + sx * (vx + vw - ax)]
              return (
                <g
                  key={s.id}
                  className={`figure${isSel ? ' is-selected' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${name} — 페이즈1 카드${s.estimate ? ', 자리는 추정' : ''}`}
                  aria-pressed={isSel}
                  onClick={(e) => {
                    e.stopPropagation()
                    pick()
                  }}
                  onKeyDown={(e) => onKey(e, pick)}
                >
                  <rect
                    className="figure-focus"
                    x={Math.min(...xs) - 4}
                    y={spot.at[1] + (vy - ay) * k - 4}
                    width={vw * k + 8}
                    height={vh * k + 8}
                  />
                  <g transform={`translate(${spot.at[0]} ${spot.at[1]}) scale(${sx} ${k}) translate(${-ax} ${-ay})`}>
                    {fig.parts.map((p, i) => (
                      <path key={i} className={`fig-${p.cls}`} d={p.d} />
                    ))}
                  </g>
                  <g transform={`translate(${spot.at[0]} ${below})`}>
                    <g className="figure-caption">
                      <text className={`figure-label${koClass(s)}`} y={FIGURE_FONT_PX + 4} textAnchor="middle" fontSize={FIGURE_FONT_PX}>
                        {name}
                      </text>
                    </g>
                  </g>
                </g>
              )
            })}
          </g>
        )}

        {/* 세계 지도의 장소·대지 카드 표시 — 같은 자리, 같은 기호 */}
        <g className="markers">
          {marks.map((m) => {
            const x = (m.at[0] - b.x0) * scale
            const y = (m.at[1] - b.y0) * scale
            const a = ANCHOR_TEXT[anchors[m.key] ?? 'right']
            return (
              <g key={m.key} transform={`translate(${x} ${y})`}>
                <g
                  className={`marker kind-${m.kind}${m.selected ? ' is-selected' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={m.aria}
                  aria-pressed={m.selected}
                  onClick={(e) => {
                    e.stopPropagation()
                    m.pick()
                  }}
                  onKeyDown={(e) => onKey(e, m.pick)}
                >
                  <circle r={11} className="marker-hit" />
                  {m.selected && <circle r={9} className="marker-ring" />}
                  <path className="glyph" d={MARKER_PATHS[m.kind]} />
                  <text x={a.dx} y={a.y} dy={`${a.dy}em`} textAnchor={a.textAnchor} fontSize={POINT_FONT_PX} className={`point-label${m.ko}`}>
                    {m.name}
                  </text>
                </g>
              </g>
            )
          })}
        </g>
      </g>
    </svg>
  )
})
