import { select } from 'd3-selection'
import 'd3-transition'
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MAP_HEIGHT, MAP_WIDTH } from './geo'

export const MIN_ZOOM = 1
/**
 * 가장 깊은 확대 — 지역 상세(자식 지도였던 그림)의 가장 작은 대상까지 읽히는 배율.
 * Jwar Isle 상세가 가장 촘촘해 세계 배율로 240 남짓이다 (docs/deep-zoom-plan.md).
 * 좌표는 2400×1700 그대로라 이 배율에서도 SVG 좌표 정밀도(float32)는 0.03px 안팎이다
 */
export const MAX_ZOOM = 256

/**
 * 화면 1px 당 지도 단위가 커질수록 더 많은 라벨을 보여 준다.
 * tier 경계는 "라벨 글자가 화면에서 읽을 만한 크기가 되는 배율"이다.
 * 0 단계(0.3 미만)는 휴대폰에서 세계 전체를 볼 때만 나온다.
 * 4 단계(2.6) 위로는 배율이 두 배가 될 때마다 한 단계 — 깊이 들어갈수록 작은 대상(사람만 한 그림)과 지역 상세의 이름이 자리를 받는다
 */
export const TIER_PX_PER_UNIT = [0, 0.3, 0.95, 1.6, 2.6, 5.2, 10.4, 20.8, 41.6, 83.2]

/**
 * 깊은 확대가 시작되는 tier — 여기부터 해안을 한 번 더 다듬어 그리고, 지형 기호를 잘게 다시 뿌리고(배율이 두 배가 될 때마다 반 크기),
 * 지역 상세(자식 지도였던 그림)가 나온다
 */
export const DEEP_TIER = 5

export function tierFor(pxPerUnit: number): number {
  let tier = 0
  for (let i = 0; i < TIER_PX_PER_UNIT.length; i++) if (pxPerUnit >= TIER_PX_PER_UNIT[i]) tier = i
  return tier
}

/** 지도 단위 사각형 */
export interface ViewBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface MapView {
  /** 줌 배율(전체 맞춤 = 1) */
  k: number
  /** 화면 px / 지도 단위 */
  pxPerUnit: number
  /** 가장 멀리 축소했을 때의 px / 지도 단위 — 0 단계 라벨 배치에 쓴다 */
  minPxPerUnit: number
  tier: number
  /**
   * 그릴 범위 (지도 단위) — 보이는 영역을 사방으로 CULL_PAD 배 넓힌 사각형. 이 밖의 마커·그림·지역 상세는 그리지 않는다.
   * 보이는 영역이 이 범위를 벗어날 때만 새로 잡아, 옮기는 동안 React 를 자주 다시 그리지 않는다
   */
  cull: ViewBox
}

/** 그릴 범위의 여유 — 보이는 영역 폭의 이 배만큼 사방으로 */
const CULL_PAD = 0.5
const EVERYWHERE: ViewBox = { x0: -Infinity, y0: -Infinity, x1: Infinity, y1: Infinity }

/** 패널·시트·머리말이 지도 가장자리를 가리는 폭 (화면 px) */
export interface Cover {
  left: number
  top: number
  right: number
  bottom: number
}

export const NO_COVER: Cover = { left: 0, top: 0, right: 0, bottom: 0 }

/** 지도 위에 떠 있는 상자(머리말·조작 버튼·패널)의 화면 사각형 — svg 왼쪽 위 기준 px */
export interface ScreenRect {
  left: number
  top: number
  right: number
  bottom: number
}

/** ?view=x,y,k — 처음 열 때 볼 자리 (공유·확인용) */
export function readInitialView(search: string): { x: number; y: number; k: number } | null {
  const raw = new URLSearchParams(search).get('view')
  if (!raw) return null
  const [x, y, k] = raw.split(',').map(Number)
  if (![x, y, k].every(Number.isFinite)) return null
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  return { x: clamp(x, 0, MAP_WIDTH), y: clamp(y, 0, MAP_HEIGHT), k: clamp(k, MIN_ZOOM, MAX_ZOOM) }
}

/** 배율이 바뀔 때마다 정확한 --inv-px 를 따로 받는 묶음 — map.css 에서 scale(var(--inv-px)) 로 화면 크기를 지키는 것들 */
const EXACT_INV_PX = '.markers, .card-pins, .figure-caption, .area-child-mark'
/** 움직이는 동안 지도 전체의 --inv-px 를 다시 쓰는 간격 (상대 변화) */
const INV_PX_STEP = 0.06

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * 프로그램으로 옮길 때는 곧게 간다. d3 기본(interpolateZoom)은 먼 곳으로 갈 때 중간에 크게 물러났다 들어오는데,
 * 그러면 라벨 단계가 잠깐 바뀌어 마커가 사라졌다 나타나고, 키보드 초점이 그 마커에 있으면 초점을 잃는다.
 * view = [가운데 x, 가운데 y, 보이는 폭]
 */
type View = [number, number, number]
const straightView = (a: View, b: View) => (t: number): View => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] * Math.pow(b[2] / a[2], t),
]

interface ResizeHooks {
  /** 지금 패널·머리말이 가리는 폭 — 화면 크기가 바뀌면 이동 범위를 잡기 전에 다시 잰다 */
  measureCover?: () => Cover
  /** 배율·이동 범위를 다시 잡은 뒤 (고른 곳이 가려졌으면 다시 보여 줄 때) */
  onResize?: (cover: Cover) => void
}

export function useMapZoom(initial: { x: number; y: number; k: number } | null = null, hooks: ResizeHooks = {}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const hooksRef = useRef(hooks)
  useEffect(() => {
    hooksRef.current = hooks
  })
  const layerRef = useRef<SVGGElement>(null)
  const behavior = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const fitScale = useRef(1)
  const cover = useRef<Cover>(NO_COVER)
  // 초기 시점은 처음 한 번만 쓴다
  const initialRef = useRef(initial)
  const startRef = useRef<{ x: number; y: number; k: number } | null>(null)
  const [view, setView] = useState<MapView>({ k: 1, pxPerUnit: 0, minPxPerUnit: 0, tier: 0, cull: EVERYWHERE })

  /**
   * 이동 범위 — 세지리 위쪽 바깥으로는 거의 올라가지 않고, 패널·머리말이 가리는 만큼은 더 밀 수 있다.
   * (viewBox 단위)
   */
  const updateExtent = useCallback(() => {
    const z = behavior.current
    if (!z) return
    const s = fitScale.current
    const c = cover.current
    z.translateExtent([
      [-MAP_WIDTH * 0.08 - c.left / s, -20 - c.top / s],
      [MAP_WIDTH * 1.08 + c.right / s, MAP_HEIGHT * 1.08 + c.bottom / s],
    ])
  }, [])

  /** 프로그램으로 옮길 때도 이동 범위를 지킨다 — 안 그러면 다음 드래그에서 지도가 튄다 */
  const constrained = useCallback((t: ZoomTransform) => {
    const z = behavior.current
    if (!z) return t
    return z.constrain()(
      t,
      [
        [0, 0],
        [MAP_WIDTH, MAP_HEIGHT],
      ],
      z.translateExtent(),
    )
  }, [])

  useEffect(() => {
    const svg = svgRef.current
    const layer = layerRef.current
    if (!svg || !layer) return

    // svg 화면 크기 — 보이는 영역(지도 단위)을 잴 때 쓴다
    let screenW = 0
    let screenH = 0
    const measure = () => {
      const r = svg.getBoundingClientRect()
      screenW = r.width
      screenH = r.height
      fitScale.current = Math.min(r.width / MAP_WIDTH, r.height / MAP_HEIGHT) || 1
      // 세로로 긴 화면(휴대폰)에서는 전체 맞춤이 너무 작아, 높이를 채우는 배율로 시작한다
      const portraitK = r.height > r.width ? Math.min(3, (r.height / r.width) * (MAP_WIDTH / MAP_HEIGHT) * 0.75) : 1
      startRef.current = portraitK > 1.1 ? { x: MAP_WIDTH * 0.45, y: MAP_HEIGHT * 0.5, k: portraitK } : null
    }
    measure()

    let lastTier = -1
    let lastPx = -1
    let lastCull: ViewBox | null = null
    let lastInv = ''
    let layerInv = ''
    let moving = false
    const apply = (t: ZoomTransform, force = false) => {
      layer.setAttribute('transform', t.toString())
      const pxPerUnit = fitScale.current * t.k
      // 마커·지점 라벨은 이 역배율로 화면 크기(px)를 유지한다 — React 렌더 없이 CSS 변수만 바꾼다.
      // 옮기기만 할 때(배율 그대로)는 건드리지 않는다
      const invNum = 1 / pxPerUnit
      const inv = String(invNum)
      if (inv !== lastInv) {
        lastInv = inv
        // 화면 크기를 지키는 기호(마커·카드 표시·그림 이름·지도 아이콘)에는 매번 정확한 값을 — 그 묶음만 스타일을 다시 계산한다
        for (const el of layer.querySelectorAll<SVGElement>(EXACT_INV_PX)) el.style.setProperty('--inv-px', inv)
      }
      // 지도 전체(산·숲·해안의 선 굵기, 라벨 테두리)는 바꾸면 모든 요소의 스타일을 다시 계산한다 —
      // 움직이는 동안은 INV_PX_STEP 넘게 달라질 때만, 멈추면 정확한 값으로 맞춘다 (굵기가 몇 % 늦게 따라와도 눈에 띄지 않는다)
      if (inv !== layerInv && (force || !layerInv || Math.abs(invNum - Number(layerInv)) / invNum > INV_PX_STEP)) {
        layerInv = inv
        layer.style.setProperty('--inv-px', inv)
        // 지도 단위를 다시 늘려 그리는 묶음(지역 상세·잘게 그린 지형 기호)은 이 값에 제 배율을 곱해 제 --inv-px 를 만든다
        layer.style.setProperty('--inv-px-w', inv)
      }
      const tier = tierFor(pxPerUnit)
      // 보이는 영역 (지도 단위) — viewBox 는 화면에 meet 으로 맞춰 들어간다
      const s = fitScale.current
      const ox = (screenW - MAP_WIDTH * s) / 2
      const oy = (screenH - MAP_HEIGHT * s) / 2
      const seen: ViewBox = {
        x0: (-ox / s - t.x) / t.k,
        y0: (-oy / s - t.y) / t.k,
        x1: ((screenW - ox) / s - t.x) / t.k,
        y1: ((screenH - oy) / s - t.y) / t.k,
      }
      const outside = !lastCull || seen.x0 < lastCull.x0 || seen.y0 < lastCull.y0 || seen.x1 > lastCull.x1 || seen.y1 > lastCull.y1
      // 창 크기가 바뀌어도 px/단위가 달라지므로 k 가 아니라 px/단위로 비교한다.
      // force(멈춤·창 크기 변경)일 때는 조금이라도 달라졌으면 맞추고, 그냥 옮기기만 했으면 다시 그리지 않는다 —
      // 다만 보이는 영역이 그릴 범위를 벗어나면 범위를 새로 잡아 다시 그린다
      if (tier !== lastTier || outside || Math.abs(pxPerUnit - lastPx) / pxPerUnit > (force ? 1e-6 : 0.15)) {
        lastTier = tier
        lastPx = pxPerUnit
        const padX = (seen.x1 - seen.x0) * CULL_PAD
        const padY = (seen.y1 - seen.y0) * CULL_PAD
        lastCull = { x0: seen.x0 - padX, y0: seen.y0 - padY, x1: seen.x1 + padX, y1: seen.y1 + padY }
        setView({ k: t.k, pxPerUnit, minPxPerUnit: fitScale.current * MIN_ZOOM, tier, cull: lastCull })
      }
    }

    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .interpolate(straightView)
      // 움직이는 동안은 지도에 is-moving — 헤드론 떠다니기를 멈추고 기호의 포인터 판정을 끈다 (map.css).
      // 떠다니기 애니메이션은 매 프레임 스타일·페인트·레이어 계산을 다시 돌려, 끌기와 겹치면 약한 기기에서 프레임이 끊긴다.
      // 'start' 가 아니라 실제로 움직일 때 붙인다 — start 는 마우스를 누르기만 해도 와서, 그때 판정을 끄면 마커 클릭이 빈 지도로 간다
      .on('zoom', (e: { transform: ZoomTransform }) => {
        if (!moving) {
          moving = true
          svg.classList.add('is-moving')
        }
        apply(e.transform)
      })
      // 움직이는 동안은 15% 단위로만 다시 그리고, 멈추면 정확한 배율로 맞춘다 (라벨 글자 크기 하한이 어긋나지 않게)
      .on('end', (e: { transform: ZoomTransform }) => {
        moving = false
        svg.classList.remove('is-moving')
        apply(e.transform, true)
      })
    behavior.current = z
    updateExtent()
    const sel = select(svg)
    sel.call(z).on('dblclick.zoom', null)
    const start = initialRef.current ?? startRef.current
    const t0 = start
      ? zoomIdentity.translate(MAP_WIDTH / 2, MAP_HEIGHT / 2).scale(start.k).translate(-start.x, -start.y)
      : zoomIdentity
    sel.call(z.transform, constrained(t0))

    let lastSize = ''
    const ro = new ResizeObserver(() => {
      measure()
      // 화면이 바뀌면 패널이 가리는 폭과 이동 범위도 바뀐다 — 새 범위로 지금 시점을 바로 잡는다 (안 그러면 다음 드래그에서 튄다)
      const fresh = hooksRef.current.measureCover?.()
      if (fresh) cover.current = fresh
      updateExtent()
      sel.call(z.transform, constrained(sel.property('__zoom') as ZoomTransform))
      const r = svg.getBoundingClientRect()
      const size = `${Math.round(r.width)}x${Math.round(r.height)}`
      // 처음 관찰을 시작할 때의 알림은 크기 변화가 아니다
      if (lastSize && size !== lastSize) hooksRef.current.onResize?.(cover.current)
      lastSize = size
    })
    ro.observe(svg)
    return () => {
      ro.disconnect()
      sel.on('.zoom', null)
    }
  }, [constrained, updateExtent])

  const run = useCallback(
    (t: ZoomTransform, ms: number) => {
      const svg = svgRef.current
      const z = behavior.current
      if (!svg || !z) return
      select(svg)
        .transition()
        .duration(reduceMotion() ? 0 : ms)
        .call(z.transform, constrained(t))
    },
    [constrained],
  )

  const current = () => (svgRef.current ? (select(svgRef.current).property('__zoom') as ZoomTransform) : zoomIdentity)

  const zoomBy = useCallback(
    (factor: number) => {
      const svg = svgRef.current
      if (!svg) return
      const t = current()
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, t.k * factor))
      // 패널·머리말에 가리지 않은 영역의 가운데를 기준으로 — 화면 가운데는 패널 밑일 수 있다
      const r = svg.getBoundingClientRect()
      const s = fitScale.current
      const c = cover.current
      const vx = (c.left + (r.width - c.left - c.right) / 2 - (r.width - MAP_WIDTH * s) / 2) / s
      const vy = (c.top + (r.height - c.top - c.bottom) / 2 - (r.height - MAP_HEIGHT * s) / 2) / s
      const mx = (vx - t.x) / t.k
      const my = (vy - t.y) / t.k
      run(zoomIdentity.translate(vx - mx * k, vy - my * k).scale(k), 280)
    },
    [run],
  )

  const reset = useCallback(() => {
    const s = startRef.current
    run(s ? zoomIdentity.translate(MAP_WIDTH / 2, MAP_HEIGHT / 2).scale(s.k).translate(-s.x, -s.y) : zoomIdentity, 420)
  }, [run])

  /** 패널이 열리고 닫힐 때 — 가리는 만큼 이동 범위를 넓힌다 */
  const setCover = useCallback(
    (c: Cover) => {
      cover.current = c
      updateExtent()
    },
    [updateExtent],
  )

  /** 이동 범위가 좁아졌을 때(패널을 닫았을 때) 범위 안으로 부드럽게 돌아온다 */
  const settle = useCallback(() => run(current(), 320), [run])

  /**
   * 지도 좌표 (x, y)를 보이는 영역 가운데로 옮긴다.
   * c: 패널·시트·머리말이 가리는 폭 — 그만큼 비켜서 가운데를 잡는다.
   * keepCloser: 이미 더 확대해 있으면 배율을 유지한다.
   */
  const focusOn = useCallback(
    (x: number, y: number, k: number, c: Cover = NO_COVER, keepCloser = true) => {
      const target = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, keepCloser ? Math.max(current().k, k) : k))
      // viewBox 가 화면에 맞춰 들어가므로 화면 px 를 지도 단위로 바꿔 보정한다
      const unit = fitScale.current * target
      run(
        zoomIdentity
          .translate(MAP_WIDTH / 2, MAP_HEIGHT / 2)
          .scale(target)
          .translate(-x + (c.left - c.right) / 2 / unit, -y + (c.top - c.bottom) / 2 / unit),
        650,
      )
    },
    [run],
  )

  /** 지도 영역이 보이는 영역에 꽉 차도록 */
  const focusBounds = useCallback(
    (b: { x0: number; y0: number; x1: number; y1: number }, c: Cover = NO_COVER, maxK = MAX_ZOOM) => {
      const svg = svgRef.current
      if (!svg) return
      const r = svg.getBoundingClientRect()
      const availW = Math.max(120, r.width - c.left - c.right)
      const availH = Math.max(120, r.height - c.top - c.bottom)
      const k = Math.min(
        maxK,
        Math.min(availW / ((b.x1 - b.x0) * fitScale.current), availH / ((b.y1 - b.y0) * fitScale.current)) * 0.82,
      )
      focusOn((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, k, c, false)
    },
    [focusOn],
  )

  /**
   * 지도 좌표 한 점이 보이는 영역 밖이거나 떠 있는 상자(obstacles) 밑에 있으면, 배율은 그대로 두고 그 점을 가운데로.
   * cover 는 가운데를 잡는 기준이라 머리말처럼 모서리만 가리는 상자는 빠져 있을 수 있다 — 그래서 상자를 따로 본다.
   */
  const ensureVisible = useCallback(
    (x: number, y: number, c: Cover = NO_COVER, margin = 40, obstacles: ScreenRect[] = []) => {
      const svg = svgRef.current
      if (!svg) return
      const r = svg.getBoundingClientRect()
      const t = current()
      // viewBox(meet) 안의 화면 좌표
      const s = fitScale.current
      const ox = (r.width - MAP_WIDTH * s) / 2
      const oy = (r.height - MAP_HEIGHT * s) / 2
      const sx = ox + (t.x + x * t.k) * s
      const sy = oy + (t.y + y * t.k) * s
      const inside =
        sx > c.left + margin && sx < r.width - c.right - margin && sy > c.top + margin && sy < r.height - c.bottom - margin
      const pad = 10
      const hidden = obstacles.some((o) => sx > o.left - pad && sx < o.right + pad && sy > o.top - pad && sy < o.bottom + pad)
      if (!inside || hidden) focusOn(x, y, t.k, c, true)
    },
    [focusOn],
  )

  return { svgRef, layerRef, view, zoomBy, reset, focusOn, focusBounds, ensureVisible, setCover, settle }
}
