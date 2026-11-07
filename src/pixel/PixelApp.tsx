// 픽셀 아트 지도 (/pixel) — S2: 확대 단계(한 픽셀 = 16 … 0.25 단위)마다 256² 타일을 Worker 가 그리고, 화면 크기 캔버스에 정수 배율로 붙인다.
// S3: 그 위에 장소·대지 카드 기호와 이름, 지역·물 이름, 대륙명의 DOM 층(marks/MarksLayer.tsx)과 패널(panel/Panel.tsx). 고른 것은 지금 지도와 같은 # 주소다.
// S4: 타일에 바탕 지형(채색 영역·강·단애·흩뿌린 기호·한 점 기호·바다 표시·헤드론 — raster/terrain.ts, 데이터는 virtual:pixel-terrain). 흩뿌린 기호는 이름 상자를 비킨다(labels/holes.ts).
// S6: 시점별 지도(?time=1..6) — 그 시점의 바탕(raster/period.ts)과 사가에 매인 대지 카드, 장소 표시 바꿈, 패널의 '이 무렵' (time.ts). 사가·페이즈 보기는 없다.
// 지금 지도(src/App.tsx)와 따로 빌드하는 페이지라 지금 지도의 모듈은 순수한 데이터·기하(geo.ts·geometry.ts)만 가져다 쓴다.
// 순서와 결정은 docs/pixel-plan.md.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import childMeta from 'virtual:pixel-children'
import marks from 'virtual:pixel-marks'
import pixelTimes from 'virtual:pixel-times'
import { PERIOD_LABEL_AVOID, PERIOD_MARK_ANCHOR } from '../data/labelAvoid'
import type { Point } from '../data/types'
import type { Dict } from '../i18n/units'
import { EFFECTS } from './fx/effects'
import { FxLayer, type PlacedFx } from './fx/layer'
import { holesIn, levelHoles } from './labels/holes'
import { firstLevels, firstMarkLevels, layoutLevels } from './labels/layout'
import { Legend } from './legend/Legend'
import { MarksLayer, type Selection } from './marks/MarksLayer'
import type { SpriteColors } from './marks/sprites'
import type { PanelData } from './panel/data'
import { Panel, type PanelPeriod } from './panel/Panel'
import { holesHash, readTime, timeMarks, touchesDirty, type PeriodNoteSlim } from './time'
import { figuresAt, FigureStore, type ChunkLoaders, type Fig, type FigureMeta } from './figures/store'
import { loadPhaseCard, type PhaseCardText } from './panel/phaseCard'
import type { PhaseCardRow } from './panel/Panel'
import { detailLayout, detailLevelOf } from './detail'
import { touchesChildren } from './raster/child'
import { gridFor } from './raster/fill'
import { PALETTES, type PaletteId } from './raster/palette'
import type { ShoreStyle } from './raster/world'
import { TILE, TileStore, tileKey, type TileSpec } from './tiles/store'
import {
  LEVELS,
  MAP_H,
  MAP_W,
  PIXEL_SIZES,
  cssPerUnit,
  devicePerPixel,
  fitScale,
  mainMapHref,
  nearestLevel,
  overviewLevel,
  levelAt,
  settleLevel,
  readLang,
  readSandbox,
  readView,
  type Lang,
  type PixelSize,
  type Sandbox,
} from './view'

const TEXT = {
  ko: {
    title: '젠디카르 픽셀 지도',
    badge: '시험판 S12',
    timeline: '시점',
    fold: '머리말 접기',
    unfold: '머리말 펼치기',
    timeOff: (name: string) => `${name} — 다시 누르면 시점을 끈다`,
    palette: '팔레트',
    size: '픽셀 크기',
    shore: '물가',
    shores: { dither: '디더링', band: '띠', none: '없음' } satisfies Record<ShoreStyle, string>,
    zoomIn: '확대',
    zoomOut: '축소',
    reset: '처음 보기',
    main: '지금 지도로',
    drawing: '그리는 중…',
    map: '젠디카르 세계 지도 (픽셀 아트). 방향키로 옮기고 +·− 로 확대·축소한다. Tab 으로 지도의 장소로 간다.',
    level: (u: number) => `한 픽셀 = ${u} 단위`,
  },
  en: {
    title: 'Zendikar Pixel Map',
    badge: 'Sandbox S12',
    timeline: 'Timeline',
    fold: 'Collapse the header',
    unfold: 'Expand the header',
    timeOff: (name: string) => `${name} — press again to turn the timeline off`,
    palette: 'Palette',
    size: 'Pixel size',
    shore: 'Shore',
    shores: { dither: 'Dither', band: 'Bands', none: 'None' } satisfies Record<ShoreStyle, string>,
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    reset: 'Reset view',
    main: 'Main map',
    drawing: 'Drawing…',
    map: 'World map of Zendikar (pixel art). Arrow keys pan, + and − zoom. Tab moves through the places on the map.',
    level: (u: number) => `1 pixel = ${u} units`,
  },
} satisfies Record<Lang, unknown>

/** 펼친 머리말 밑에 범례가 이만큼(화면 px — 접은 줄·확대 단추 줄까지) 들어가지 않으면 범례를 펼치는 동안 머리말을 접는다 */
const LEGEND_MIN_PX = 300

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
/**
 * 기호를 그릴 범위 — 화면 가운데(c, 지도 단위)가 든 칸(화면 반 폭)에서 사방 화면 한 장까지. k 는 그 단계의 기기 px/단위.
 * 열쇠가 같으면 범위도 같다 (칸을 넘을 때만 다시 그린다)
 */
function cullFor(level: number, c: { x: number; y: number }, k: number, w: number, h: number, dpr: number) {
  const cw = (w / 2) * (dpr / k)
  const ch = (h / 2) * (dpr / k)
  const cx = Math.floor(c.x / cw)
  const cy = Math.floor(c.y / ch)
  return { key: `${level}|${cx}|${cy}|${w}|${h}`, box: { x0: (cx - 2) * cw, y0: (cy - 2) * ch, x1: (cx + 3) * cw, y1: (cy + 3) * ch } }
}

/** 확대·축소를 이어 그리는 시간 (ms) — 움직임 줄이기에서는 바로 */
const ZOOM_MS = 200
/** 휠 확대가 목표 배율로 미끄러지는 시간 상수 (ms) — 휠 한 칸·트랙패드 스크롤이 계단 없이 이어진다 */
const GLIDE_MS = 70
/** 휠 확대가 한 프레임에 가는 가장 큰 몫 (단계 — 두 배가 1) */
const GLIDE_MAX = 0.25
/** 늘인 타일 자리에 또렷한 타일이 짙어지며 나오는 시간 (ms) */
const TILE_FADE_MS = 120
/** 휠이 이만큼(px) 구르면 한 단계 — 휠 한 칸은 100 (deltaMode 줄·쪽은 px 로 바꾼 값) */
const WHEEL_PER_LEVEL = 100
/** 휠이 이만큼(ms) 멈추면 단계에 앉는다 */
const WHEEL_SETTLE_MS = 100
/** 손을 떼면 그쪽 단계로 가는 몫 — 두 손가락·트랙패드 확대는 다음 단계까지 30%, 휠은 15% (휠 한 칸이 작은 기기도 한 칸에 한 단계) */
const PINCH_LEAN = 0.3
const WHEEL_LEAN = 0.15
/** 휠이 단계에 앉고 남긴 몫(단계)을 이만큼(ms) 안에 다시 굴리면 이어 받는다 — 아주 작은 휠 칸(맥의 마우스 등)도 모이면 확대된다 */
const WHEEL_CARRY_MS = 800
/** 단계를 바꾼 뒤 이만큼(ms) 그대로면 한 칸 둘레를 미리 청한다 */
const SETTLE_MS = 180
/** 늘 붙잡아 두는 개관 단계 (한 픽셀 = 8 단위 — 타일 두 장) */
const BACKDROP = 1
const rgb = (c: readonly [number, number, number]) => `rgb(${c[0]} ${c[1]} ${c[2]})`
/** 하늘 판석의 돌빛, 고른 기호의 칠 */
const STONE = '#a39a86'
const PICKED = '#f2c94c'

/** 붙잡아 둘 타일 수 — 데스크톱 256장(64MB), 휴대폰 96장(24MB) */
const cacheMax = () => (window.matchMedia('(max-width: 767px)').matches ? 96 : 256)

/** 지금 지도와 같은 # 주소 — #장소id, #card/카드id, #continent/대륙id */
function readHash(hash: string): Selection | null {
  let h: string
  try {
    h = decodeURIComponent(hash.replace(/^#/, ''))
  } catch {
    return null // 잘못된 % 는 고른 것 없음 (지금 지도의 readHash 와 같다)
  }
  if (!h) return null
  const m = /^(card|continent)\/(.+)$/.exec(h)
  return m ? { type: m[1] as 'card' | 'continent', id: m[2] } : { type: 'location', id: h }
}
const hashOf = (s: Selection | null) => (!s ? '' : s.type === 'location' ? `#${s.id}` : `#${s.type}/${s.id}`)

/** 고른 것의 지도 자리와 이름이 처음 보이는 단계를 찾는 열쇠 — 자리가 없는 장소는 그와 하나인 카드의 표시 */
function markOf(s: Selection): { key: string; at: Point } | null {
  if (s.type === 'continent') {
    const c = marks.continents.find((x) => x.id === s.id)
    return c ? { key: c.id, at: c.at } : null
  }
  if (s.type === 'card') {
    const c = marks.cards.find((x) => x.id === s.id)
    if (c) return { key: c.id, at: c.at }
    const place = marks.cardPlaces[s.id] ?? marks.sagaPlaces[s.id]?.place
    return place ? markOf({ type: 'location', id: place }) : null
  }
  const p = marks.points.find((x) => x.id === s.id) ?? marks.areas.find((x) => x.id === s.id)
  if (p) return { key: p.id, at: p.at }
  const c = marks.cards.find((x) => x.place === s.id)
  return c ? { key: c.id, at: c.at } : null
}

/** 사가에 매인 대지 카드가 나오는 시점 (표시가 있는 카드, 지도에 있는 장소와 하나인 카드) — 늘 나오는 카드면 undefined */
const cardTimes = (id: string): readonly number[] | undefined => marks.cards.find((c) => c.id === id)?.times ?? marks.sagaPlaces[id]?.times

/** 패널에 실을 것이 있는가 — 없는 id·사가에 매인 카드는 패널을 열지 않는다 (지금 지도와 같다) */
const hasEntry = (d: PanelData, s: Selection) =>
  s.type === 'location' ? d.location.has(s.id) : s.type === 'continent' ? d.continent.has(s.id) : d.card.has(s.id)

/**
 * 성능 도구(scripts/qa/pixel-perf.mjs·pixel-zoom.mjs)가 읽는 고리 — 개발 서버, 또는 빌드에서 주소에 ?perf 가 있을 때만
 * (개발 서버의 React 는 렌더가 2–3배 느려 확대 성능은 빌드에서 잰다)
 */
const PERF = import.meta.env.DEV || new URLSearchParams(window.location.search).has('perf')
interface PixelDebug {
  frames: number[]
  store: TileStore
  missing: number
  /** 확대·축소를 이어 그리는 중 (움직임·두 손가락) */
  anim?: boolean
  /** 그 프레임이 그린 단계 (한 픽셀의 지도 단위) */
  u?: number
  /** 움직이는 효과의 층 — 지금 보이는 수(visible)와 그 시계가 돈 수(ticks — 아무것도 안 보이면 돌지 않는다) */
  fx?: { readonly visible: number; readonly ticks: number }
  /** 지난 프레임에 그린 페이즈 그림 (S7) — 카드 id 와 그 그림의 칠한 픽셀 하나의 화면 자리 (CSS px) */
  figs?: { id: string; x: number; y: number }[]
}
declare global {
  interface Window {
    __pixel?: PixelDebug
  }
}

export function PixelApp() {
  const [lang] = useState<Lang>(() => readLang(window.location.search))
  const t = TEXT[lang]
  const [sandbox, setSandbox] = useState<Sandbox>(() => readSandbox(window.location.search))
  // 시점 (S6) — 주소의 ?time (보이는 시점만). 없으면 페이즈를 끈 지도
  const [time, setTime] = useState<number | null>(() => readTime(window.location.search, pixelTimes.times))
  const timeLevel = time === null ? null : (pixelTimes.times.find((x) => x.t === time)?.level ?? null)
  const levelInfo = timeLevel === null ? undefined : pixelTimes.levels[timeLevel]
  const tm = useMemo(() => timeMarks(marks, time, levelInfo), [time, levelInfo])
  // 페이즈 그림 (S7) — 시점을 켜거나 페이즈 카드를 고를 때 받는다 (virtual:pixel-figures). 그림 조각은 보이는 칸만 (figures/store.ts)
  const [figData, setFigData] = useState<{ meta: FigureMeta; chunks: ChunkLoaders } | null>(null)
  const figStore = useRef<FigureStore | null>(null)
  const figs = useMemo<Fig[]>(() => (figData && time !== null ? figuresAt(figData.meta, time) : []), [figData, time])
  const figOf = useMemo(() => new Map(figs.map((f) => [f.id, f])), [figs])
  /** 페이즈 카드 id → [id, 이름, 한국어판 이름, 세트, 페이즈, 추정, 가리키는 곳] (패널·고르기) */
  const phaseInfo = useMemo(() => (figData ? new Map(figData.meta.cards.map((r, ci) => [r[0], { row: r, ci }] as const)) : null), [figData])
  /** 주소를 쓰는 셈(changeTime — 한 번만 만든다)이 읽는 지금의 그림 데이터 */
  const phaseInfoRef = useRef(phaseInfo)
  phaseInfoRef.current = phaseInfo
  const figDataRef = useRef(figData)
  figDataRef.current = figData
  const pal = PALETTES[sandbox.palette]
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  /** 움직이는 효과의 캔버스 (S5, fx/layer.ts) — 타일 캔버스 위, 기호 층 밑 */
  const fxRef = useRef<HTMLCanvasElement>(null)
  const fxLayer = useRef<FxLayer | null>(null)
  /** 페이즈 그림의 캔버스 (S7) — 효과 위, 기호 층 밑 */
  const figsRef = useRef<HTMLCanvasElement>(null)
  const statusRef = useRef<HTMLParagraphElement>(null)
  const marksRef = useRef<HTMLDivElement>(null)
  const linkRef = useRef<HTMLAnchorElement>(null)
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 }))
  // 보기 — 화면 가운데의 지도 좌표와 단계. 끌기 중에는 ref 만 고쳐 React 로 다시 그리지 않는다
  const [level, setLevel] = useState(() => {
    const v = readView(window.location.search)
    const dpr = window.devicePixelRatio || 1
    return v ? nearestLevel(fitScale(window.innerWidth, window.innerHeight) * v.k, sandbox.size, dpr) : overviewLevel(window.innerWidth, window.innerHeight, sandbox.size, dpr)
  })
  const center = useRef<{ x: number; y: number }>(
    (() => {
      const v = readView(window.location.search)
      return v ? { x: v.x, y: v.y } : { x: MAP_W / 2, y: MAP_H / 2 }
    })(),
  )
  const unit = cssPerUnit(level, sandbox.size, vp.dpr)
  /**
   * 몸짓이 읽는 단계 — React 가 다시 그리기 전에 휠·핀치가 잇달아 와도 앞의 확대를 이어 받는다
   * (닫힌 level 을 읽으면 두 번째 확대가 같은 단계를 다시 셈하고 붙잡은 점이 어긋났다)
   */
  const levelNow = useRef(level)
  /** 단계 글·+/− 단추가 보는 단계 — levelNow 를 바로 따른다 (기호 층을 다시 그리는 level 은 확대가 끝난 뒤에 따라온다) */
  const [uiLevel, setUiLevel] = useState(level)
  const goLevel = useCallback((n: number) => {
    levelNow.current = n
    setUiLevel(n)
    setLevel(n)
  }, [])

  // 화면 크기·DPR — DPR 만 바뀌는 경우(배율이 다른 모니터로 옮김)는 resize 가 오지 않아 resolution 미디어 쿼리로 본다
  useEffect(() => {
    let mq: MediaQueryList | null = null
    const on = () => {
      setVp({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 })
      mq?.removeEventListener('change', on)
      mq = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
      mq.addEventListener('change', on)
    }
    on()
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('resize', on)
      mq?.removeEventListener('change', on)
    }
  }, [])

  // 그리기 — 타일이 오거나 옮길 때마다 다음 프레임에 한 번
  const store = useRef<TileStore | null>(null)
  const frame = useRef(0)
  const drawRef = useRef<() => void>(() => {})
  const schedule = useCallback(() => {
    if (frame.current) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      drawRef.current()
    })
  }, [])

  useEffect(() => {
    // ?tileslow=n (개발 서버만) — Worker 가 타일을 n 번 그린다 (scripts/qa/pixel-perf.mjs 가 CPU 제한 대신 쓴다)
    const slow = PERF ? Math.max(1, Math.min(20, Number(new URLSearchParams(window.location.search).get('tileslow')) || 1)) : 1
    const s = new TileStore(schedule, cacheMax(), slow)
    store.current = s
    if (PERF) window.__pixel = { frames: [], store: s, missing: 0 }
    schedule()
    return () => {
      s.close()
      store.current = null
      cancelAnimationFrame(frame.current)
      frame.current = 0
    }
  }, [schedule])
  useEffect(() => store.current?.setMax(cacheMax()), [vp])
  // 그림 창고 — 칠한 그림은 데스크톱 48MB, 휴대폰 16MB 까지 (LRU)
  useEffect(() => {
    if (!figData) return
    figStore.current = new FigureStore(figData.meta, figData.chunks, schedule, (window.matchMedia('(max-width: 767px)').matches ? 16 : 48) * 1024 * 1024)
    schedule()
  }, [figData, schedule])
  useEffect(() => {
    const c = fxRef.current
    if (!c) return
    const l = new FxLayer(c, EFFECTS, PALETTES[sandbox.palette])
    fxLayer.current = l
    return () => {
      l.dispose()
      fxLayer.current = null
    }
    // 팔레트는 아래 효과가 바꾼다 — 층은 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => fxLayer.current?.setPalette(PALETTES[sandbox.palette]), [sandbox.palette])

  // 이름 배치 — 단계마다 화면 px/단위가 하나라 한 번에 모든 단계를 셈한다 (labels/layout.ts)
  const pxAt = useMemo(() => LEVELS.map((_, i) => cssPerUnit(i, sandbox.size, vp.dpr)), [sandbox.size, vp.dpr])
  // 지역 상세 (S9) — 가장 깊은 단계의 이름·숨길 지역 이름·표시 이름 쪽 (보기마다)
  const detail = useMemo(() => detailLayout(childMeta, tm.marks, time ?? 0, detailLevelOf(childMeta, LEVELS)), [tm, time])
  const layouts = useMemo(
    () =>
      layoutLevels(tm.marks, lang, pxAt, MAP_W, {
        avoid: timeLevel === null ? undefined : PERIOD_LABEL_AVOID[timeLevel],
        prefer: timeLevel === null ? undefined : PERIOD_MARK_ANCHOR[timeLevel],
        figures: figs.map((f) => ({ key: `f${f.pi}`, name: f.name, nameKo: f.nameKo, size: f.size, box: f.box, prefer: f.label, fromLevel: f.fromLevel })),
        uAt: LEVELS,
        figureMinPx: figData?.meta.minPx,
        detail,
      }),
    [tm, lang, pxAt, timeLevel, figs, figData, detail],
  )
  // 흩뿌린 지형 기호가 비키는 이름 상자 — 단계마다 (labels/holes.ts)
  const holes = useMemo(() => layouts.map((l, i) => levelHoles(tm.marks, l, lang, pxAt[i], tm.hidden)), [layouts, lang, pxAt, tm])
  /**
   * 타일의 열쇠와 보낼 것 — 바탕 지형을 그리면 열쇠에 그 타일에 닿는 이름 상자의 지문과, 그 시점의 바뀐 자리에 닿으면 그 단계를 붙인다 (S6).
   * 이름 상자가 같고 바뀐 자리에 닿지 않는 타일은 시점이 달라도(끔과도) 같은 타일이다 — 같은 바이트라 함께 쓴다
   */
  const tileInfo = useMemo(() => {
    const memo = new Map<string, { key: string; holes?: Float32Array; period?: number; child?: number }>()
    return (lv: number, tx: number, ty: number) => {
      const id = `${lv}|${tx}|${ty}`
      const hit = memo.get(id)
      if (hit) return hit
      const lu = LEVELS[lv]
      let out: { key: string; holes?: Float32Array; period?: number; child?: number }
      if (!sandbox.terrain) out = { key: tileKey(lu, tx, ty, sandbox.palette, sandbox.shore) }
      else {
        const lg = gridFor(MAP_W, MAP_H, lu)
        const x0 = tx * TILE
        const y0 = ty * TILE
        const x1 = Math.min(x0 + TILE, lg.w)
        const y1 = Math.min(y0 + TILE, lg.h)
        // 기호 그림(흩뿌린 기호는 8 픽셀)이 타일 밖에서 걸쳐 들어오는 몫까지
        const m = 10 * lu
        const h = holesIn(holes[lv], x0 * lu - m, y0 * lu - m, x1 * lu + m, y1 * lu + m)
        const period = levelInfo && touchesDirty(levelInfo.dirty, lu, x0 * lu, y0 * lu, x1 * lu, y1 * lu) ? levelInfo.level : undefined
        // 지역 상세(S9) — 가장 깊은 단계에서 그 범위나 보기마다 기호가 다른 칸에 닿는 타일(기호 그림·둘레가 걸쳐 들어오는 몫까지)은 보기를 열쇠에 붙인다
        const cm = (18 + 10) * lu
        const child = lu === childMeta.u && touchesChildren(childMeta, x0 * lu - cm, y0 * lu - cm, x1 * lu + cm, y1 * lu + cm) ? (time ?? 0) : undefined
        out = { key: tileKey(lu, tx, ty, sandbox.palette, sandbox.shore, `t|${holesHash(h)}${period ? `|p${period}` : ''}${child !== undefined ? `|c${child}` : ''}`), holes: h, period, child }
      }
      memo.set(id, out)
      return out
    }
  }, [holes, levelInfo, time, sandbox.terrain, sandbox.palette, sandbox.shore])
  const firstShown = useMemo(() => {
    const names = firstLevels(layouts)
    const marksAt = firstMarkLevels(layouts)
    return (key: string) => Math.min(names.get(key) ?? Infinity, marksAt.get(key) ?? Infinity)
  }, [layouts])

  /**
   * 확대·축소의 움직임 — 단계는 두 배씩이지만 화면은 그 사이를 짧게(ZOOM_MS) 이어 그린다 (2026-11-07 — 단계가 한 번에 바뀌어 손가락을 모으는 동안 반응이 없었다).
   * from·to 는 기기 px/지도 단위, (mx, my) 는 붙잡은 지도 점, (ax, ay) 는 그 점이 놓이는 화면 점 (CSS px). 끝나면 지금 단계의 정수 배율 그대로다.
   * 가운데·단계를 바로 정하는 일(⌂·고르기·방향키·Tab)은 stopZoom 으로 움직임을 끊는다
   */
  const anim = useRef<{
    from: number
    to: number
    t0: number
    dur: number
    mx: number
    my: number
    /** 붙잡은 점이 놓이는 화면 점 — 처음(ax0)에서 끝(ax1)으로. 지도 가장자리에서 가운데를 묶으면 끝 자리가 붙잡은 화면 점과 다르다 */
    ax0: number
    ay0: number
    ax1: number
    ay1: number
    fromLevel: number
  } | null>(null)
  /** 두 손가락·트랙패드로 확대하는 동안 — 단계를 바꾸지 않고 배율만 따라간다. 손을 떼면 가장 가까운 단계로 */
  const pinch = useRef<{
    k: number
    mx: number
    my: number
    ax: number
    ay: number
    fromLevel: number
    /** 휠 — 배율이 이 값으로 미끄러져 간다 (없으면 손가락·트랙패드 확대처럼 k 를 바로 따른다) */
    target?: number
    /** 몸짓을 시작한 배율 — 손을 뗄 때 그때부터 간 쪽의 단계로 기운다 (settleLevel) */
    k0: number
    /** 휠의 첫 목표를 세는 배율 — 단추·키의 확대가 이어 그려지는 중이면 그 확대의 끝 배율 (그 확대를 버리지 않게) */
    base: number
    /** 미끄러짐의 마지막 프레임 시각 */
    t: number
  } | null>(null)
  /** 마지막으로 단계를 바꾼 때 — 그 뒤 잠깐은 한 칸 둘레를 미리 청하지 않는다 (잇단 확대에서 지나가는 단계의 둘레를 그리느라 마지막 단계가 늦었다) */
  const zoomedAt = useRef(0)
  /** 휠이 멈추면 단계에 앉히는 타이머 — stopZoom 이 함께 거둔다 */
  const wheelTimer = useRef(0)
  /** 휠이 단계에 앉고 남긴 몫 (단계, 앉은 시각) — WHEEL_CARRY_MS 안에 다시 굴리면 이어 받는다 */
  const wheelCarry = useRef({ v: 0, t: -1e9 })
  /** 확대가 끝나 고정된 첫 프레임에 ?view 를 쓴다 */
  const wasMoving = useRef(false)
  /** 바로 앞 고정 프레임에 아직 오지 않아 늘인 타일로 채운 타일과, 지금 짙어지며 나오는 타일 — 갓 온 타일만 짙어진다 (TileStore.bornAt) */
  const waitedTiles = useRef(new Set<string>())
  const fadingTiles = useRef(new Set<string>())
  const settleTimer = useRef(0)
  useEffect(() => () => window.clearTimeout(settleTimer.current), [])
  /**
   * 기호를 그릴 범위 (지도 단위) — 화면 가운데가 든 칸(화면 반 폭)에서 사방 화면 한 장까지. 칸을 넘을 때만 바뀌어 끌기는 거의 다시 그리지 않는다
   * (2026-11-07 — 깊은 단계에서 화면 밖의 기호 170여 개를 단계마다 다시 그리고 칠했다)
   */
  const [cull, setCull] = useState<{ key: string; box: { x0: number; y0: number; x1: number; y1: number } } | null>(null)
  /** 고정된 그림(React 가 그린 단계)과 지금 단계가 다를 때 기호 층을 숨긴다 */
  const renderedLevel = useRef(level)
  useLayoutEffect(() => {
    renderedLevel.current = level
  }, [level])

  /** 단계 lv 의 기기 px / 지도 단위 */
  const kOf = (lv: number) => devicePerPixel(sandbox.size, vp.dpr) / LEVELS[lv]

  /** 지금 화면에 보이는 배율·원점 (기기 px) — 움직이는 중이면 moving */
  const visual = (now: number) => {
    const W = Math.round(vp.w * vp.dpr)
    const H = Math.round(vp.h * vp.dpr)
    const pz = pinch.current
    if (pz) return { k: pz.k, ox: pz.ax * vp.dpr - pz.mx * pz.k, oy: pz.ay * vp.dpr - pz.my * pz.k, moving: true, fromLevel: pz.fromLevel }
    const a = anim.current
    if (a) {
      const t = Math.min(1, (now - a.t0) / a.dur)
      if (t < 1) {
        // 처음 기울기가 완만한 ease-out (quad — 기울기 2). cubic(기울기 3)은 첫 프레임에 0.3 단계를 뛰어 뚝 끊겨 보였다
        const e = 1 - (1 - t) ** 2
        const k = Math.exp(Math.log(a.from) + (Math.log(a.to) - Math.log(a.from)) * e)
        const ax = a.ax0 + (a.ax1 - a.ax0) * e
        const ay = a.ay0 + (a.ay1 - a.ay0) * e
        return { k, ox: ax * vp.dpr - a.mx * k, oy: ay * vp.dpr - a.my * k, moving: true, fromLevel: a.fromLevel }
      }
      anim.current = null
    }
    const k = kOf(levelNow.current)
    const p = center.current
    return { k, ox: Math.round(W / 2 - p.x * k), oy: Math.round(H / 2 - p.y * k), moving: false, fromLevel: levelNow.current }
  }

  // 지금 보기의 타일을 붙인다. 아직 없는 타일은 다른 단계의 타일을 늘이거나 줄여 그 자리를 채운다 (빈칸으로 깜박이지 않게)
  const draw = () => {
    const c = canvasRef.current
    const s = store.current
    if (!c || !s) return
    const t0 = performance.now()
    const ctx = c.getContext('2d')!
    const { w, h, dpr } = vp
    const W = Math.round(w * dpr)
    const H = Math.round(h * dpr)
    if (c.width !== W || c.height !== H) {
      c.width = W
      c.height = H
    }
    ctx.imageSmoothingEnabled = false
    const dev = devicePerPixel(sandbox.size, dpr)
    // 휠 — 배율이 목표(target)로 미끄러진다 (시간 상수 GLIDE_MS 의 지수 감쇠 — 프레임 간격이 달라도 같은 빠르기)
    const gz = pinch.current
    if (gz?.target !== undefined) {
      const dt = Math.min(64, t0 - gz.t)
      gz.t = t0
      const d = Math.log(gz.target) - Math.log(gz.k)
      // 한 프레임(16.7ms)에 GLIDE_MAX 단계까지 — 몰아쳐 굴려 목표가 멀어도 튀지 않고 그만큼 빨리 간다
      const cap = GLIDE_MAX * Math.LN2 * (dt / 16.7)
      const step = Math.max(-cap, Math.min(cap, d * (1 - Math.exp(-dt / GLIDE_MS))))
      gz.k = Math.abs(d) < 0.002 ? gz.target : Math.exp(Math.log(gz.k) + step)
      if (gz.k !== gz.target) schedule()
    }
    // 단계는 ref 에서 — 휠·핀치가 단계를 바꾼 뒤 React 가 다시 그리기 전에 타일이 와도 새 단계·새 가운데로 그린다
    const pz = pinch.current
    const level = pz ? nearestLevel(pz.k / dpr, sandbox.size, dpr) : levelNow.current
    const u = LEVELS[level]
    const g = gridFor(MAP_W, MAP_H, u)
    // 가운데 점이 지도 밖으로 나가지 않게 — 지도가 화면보다 작아도 묶어 두지는 않는다 (패널을 비켜 옮길 수 있게, 처음 보기·⌂ 는 가운데)
    const p = center.current
    p.x = clamp(p.x, 0, MAP_W)
    p.y = clamp(p.y, 0, MAP_H)
    const v = visual(t0)
    // 그 단계의 가운데 — 두 손가락 확대 중에는 붙잡은 점이 그 단계에서 놓일 가운데
    const k = kOf(level)
    const tc = pz ? { x: pz.mx - (pz.ax - w / 2) * (dpr / k), y: pz.my - (pz.ay - h / 2) * (dpr / k) } : p
    // 기기 픽셀에 맞춘 원점 — 픽셀 경계가 화면 픽셀 사이에 걸리면 번진다
    const ox = Math.round(W / 2 - tc.x * k)
    const oy = Math.round(H / 2 - tc.y * k)
    ctx.fillStyle = pal.page
    ctx.fillRect(0, 0, W, H)
    // 기호·이름 층은 지도 원점에 붙는다 — 끌기는 이것만 옮긴다. 확대하는 동안은 숨긴다 (이름은 화면 크기가 고정이라 따라 커지면 안 된다)
    if (!v.moving) {
      const next = cullFor(level, tc, k, w, h, dpr)
      if (cull?.key !== next.key) setCull(next)
      // 움직임이 끝났다 — 확대가 바꾼 단계를 React 에 (zoomTo 는 움직이는 동안 다시 그리지 않으려 미뤄 둔다), 주소도
      if (renderedLevel.current !== level) setLevel(level)
      if (wasMoving.current) {
        wasMoving.current = false
        live.current.writeUrl()
      }
    } else wasMoving.current = true
    const ml = marksRef.current
    if (ml) {
      // React 가 이 단계·이 범위로 다시 그리기 전에는 숨겨 둔다 (낡은 범위의 빈 단추 자리에 이름이 늦게 나지 않게).
      // 숨기고 다시 보일 때는 옅어졌다 짙어진다(.px-marks 의 transition) — 옅어지는 동안은 지도를 따라 움직이고 커진다 (제자리에서 뚝 사라지지 않게)
      const hide = v.moving || level !== renderedLevel.current || (cull !== null && !cull.key.startsWith(`${level}|`))
      ml.classList.toggle('is-zooming', hide)
      if (!hide) ml.style.transform = `translate(${ox / dpr}px, ${oy / dpr}px)`
      else if (v.moving) ml.style.transform = `translate(${v.ox / dpr}px, ${v.oy / dpr}px) scale(${v.k / dpr / cssPerUnit(renderedLevel.current, sandbox.size, dpr)})`
    }

    const T = TILE * dev
    const ntx = Math.ceil(g.w / TILE)
    const nty = Math.ceil(g.h / TILE)
    const tx0 = Math.max(0, Math.floor(-ox / T))
    const tx1 = Math.min(ntx - 1, Math.floor((W - 1 - ox) / T))
    const ty0 = Math.max(0, Math.floor(-oy / T))
    const ty1 = Math.min(nty - 1, Math.floor((H - 1 - oy) / T))
    const keyAt = (lv: number, tx: number, ty: number) => tileInfo(lv, tx, ty).key
    const pinned: string[] = []
    let missing = 0

    if (v.moving) {
      // 움직이는 중 — 붙잡아 둔 개관(BACKDROP), 지금 단계, 움직이기 전 단계의 타일을 거친 것부터 그 배율로 늘이거나 줄여 겹쳐 그린다.
      // 타일 끝은 반올림한 자리에서 이어 붙여 틈이 없다
      const blit = (lv: number) => {
        const lu = LEVELS[lv]
        const S = TILE * lu * v.k
        const lg = gridFor(MAP_W, MAP_H, lu)
        const a0 = Math.max(0, Math.floor(-v.ox / S))
        const a1 = Math.min(Math.ceil(lg.w / TILE) - 1, Math.floor((W - 1 - v.ox) / S))
        const b0 = Math.max(0, Math.floor(-v.oy / S))
        const b1 = Math.min(Math.ceil(lg.h / TILE) - 1, Math.floor((H - 1 - v.oy) / S))
        for (let ty = b0; ty <= b1; ty++)
          for (let tx = a0; tx <= a1; tx++) {
            const key = keyAt(lv, tx, ty)
            const bmp = s.get(key)
            if (!bmp) continue
            pinned.push(key)
            const x0 = Math.round(v.ox + tx * S)
            const y0 = Math.round(v.oy + ty * S)
            const x1 = Math.round(v.ox + (tx * TILE + bmp.width) * lu * v.k)
            const y1 = Math.round(v.oy + (ty * TILE + bmp.height) * lu * v.k)
            ctx.drawImage(bmp, x0, y0, x1 - x0, y1 - y0)
          }
      }
      for (const lv of [...new Set([BACKDROP, level, v.fromLevel])].sort((a, b) => a - b)) blit(lv)
      fxLayer.current?.hide()
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (!s.get(keyAt(level, tx, ty))) missing++
      // 이어 그리기만 프레임마다 — 두 손가락 확대는 손가락이 움직이거나 타일이 올 때 그린다 (손가락을 멈춰 두면 쉰다)
      if (anim.current) schedule()
    } else {
      const fadeMs = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : TILE_FADE_MS
      let fading = false
      const waited = new Set<string>()
      const nextFading = new Set<string>()
      // 움직이는 효과 — 또렷하게 그린 타일이 그 안에 그린 효과의 자리 (늘인 타일에는 없다)
      const fxPlaced: PlacedFx[] = []
      const fxMargin = 24 * dev
      const placeFx = (key: string) => {
        if (!sandbox.terrain) return
        for (const spot of s.fxOf(key)) {
          const sx = ox + spot.x * dev
          const sy = oy + spot.y * dev
          if (sx > -fxMargin && sy > -fxMargin && sx < W + fxMargin && sy < H + fxMargin) fxPlaced.push({ spot, sx, sy })
        }
      }
      for (let ty = ty0; ty <= ty1; ty++) {
        for (let tx = tx0; tx <= tx1; tx++) {
          const key = keyAt(level, tx, ty)
          pinned.push(key)
          const dx = ox + tx * T
          const dy = oy + ty * T
          const bmp = s.get(key)
          // 늘인 타일 자리에 또렷한 타일이 오면 한 프레임에 바뀌지 않고 TILE_FADE_MS 동안 짙어진다 (늘인 타일을 밑에 그대로 그린다)
          // 바로 앞 고정 프레임에 없던 타일(또는 짙어지는 중인 타일)이 갓 왔으면 — 오래전에 와 있던 타일은 그대로
          let alpha = 1
          if (bmp && (waitedTiles.current.has(key) || fadingTiles.current.has(key))) {
            const age = t0 - s.bornAt(key)
            if (age < fadeMs) {
              alpha = Math.max(0, age / fadeMs)
              nextFading.add(key)
            }
          }
          // 효과는 또렷하게 다 그린 타일에만 (짙어지는 중인 타일 위에 또렷한 바탕 네모가 먼저 나오지 않게 — 다 짙어진 프레임에 붙는다)
          if (bmp && alpha >= 1) placeFx(key)
          if (bmp && alpha >= 1) {
            ctx.drawImage(bmp, dx, dy, bmp.width * dev, bmp.height * dev)
            continue
          }
          if (!bmp) {
            missing++
            waited.add(key)
          }
          // 더 거친 단계의 타일을 늘인다 (f 배) — 한 타일은 거친 타일 하나의 한 조각이다. 개관(BACKDROP)은 늘 붙잡아 두어 빈칸이 나지 않는다
          let filled = false
          for (let j = level - 1; j >= 0 && !filled; j--) {
            const f = LEVELS[j] / u
            const ptx = Math.floor(tx / f)
            const pty = Math.floor(ty / f)
            const pb = s.get(keyAt(j, ptx, pty))
            if (!pb) continue
            const sx = (tx * TILE) / f - ptx * TILE
            const sy = (ty * TILE) / f - pty * TILE
            const sw = Math.min(TILE / f, pb.width - sx)
            const sh = Math.min(TILE / f, pb.height - sy)
            if (sw > 0 && sh > 0) ctx.drawImage(pb, sx, sy, sw, sh, dx, dy, sw * f * dev, sh * f * dev)
            pinned.push(keyAt(j, ptx, pty))
            filled = true
          }
          // 그 위에 더 고운 단계(셋까지)의 타일이 있으면 줄여 얹는다 (축소한 직후 — 늘인 거친 타일보다 또렷하다)
          for (let j = 1; j <= 3 && level + j < LEVELS.length; j++) {
            const f = 2 ** j
            for (let cy = 0; cy < f; cy++)
              for (let cx = 0; cx < f; cx++) {
                const ck = keyAt(level + j, tx * f + cx, ty * f + cy)
                const cb = s.get(ck)
                if (!cb) continue
                pinned.push(ck)
                ctx.drawImage(cb, dx + cx * (T / f), dy + cy * (T / f), (cb.width * dev) / f, (cb.height * dev) / f)
              }
          }
          if (bmp) {
            ctx.globalAlpha = alpha
            ctx.drawImage(bmp, dx, dy, bmp.width * dev, bmp.height * dev)
            ctx.globalAlpha = 1
            fading = true
          }
        }
      }
      waitedTiles.current = waited
      fadingTiles.current = nextFading
      fxLayer.current?.show(fxPlaced, dev, W, H)
      if (fading) schedule()
    }
    // 페이즈 그림 (S7) — 효과 위의 캔버스에, 그 단계에서 구운 그림을 그 단계의 픽셀 격자 그대로. 움직이는 중에는 받아 둔 단계의 그림을 그 배율로 늘이거나 줄인다
    const fcv = figsRef.current
    if (fcv) {
      if (fcv.width !== W || fcv.height !== H) {
        fcv.width = W
        fcv.height = H
      }
      const fctx = fcv.getContext('2d')!
      fctx.imageSmoothingEnabled = false
      fctx.clearRect(0, 0, W, H)
      const fst = figStore.current
      const drawnFigs: { id: string; x: number; y: number }[] = []
      if (PERF && window.__pixel && !v.moving) window.__pixel.figs = drawnFigs
      if (fst && figs.length) {
        const selId = selection?.type === 'card' ? selection.id : null
        const vk = v.moving ? v.k : k
        const vox = v.moving ? v.ox : ox
        const voy = v.moving ? v.oy : oy
        fst.want(level, -vox / vk, -voy / vk, (W - vox) / vk, (H - voy) / vk)
        for (const f of figs) {
          const key = `f${f.pi}`
          const picked = f.id === selId || focusedId === key
          // 움직이는 중이면 지금 단계의 그림, 아직 없으면 움직이기 전 단계의 그림
          const lvs = v.moving ? [level, v.fromLevel] : [level]
          for (const lv of lvs) {
            if (!picked && !layouts[lv]?.figures.has(key)) continue
            const sp = fst.sprite(f.pi, lv)
            if (!sp) continue
            const S = LEVELS[lv] * vk
            const x0 = Math.round(vox + sp.gx0 * S)
            const y0 = Math.round(voy + sp.gy0 * S)
            const x1 = Math.round(vox + (sp.gx0 + sp.w) * S)
            const y1 = Math.round(voy + (sp.gy0 + sp.h) * S)
            if (x1 < 0 || y1 < 0 || x0 > W || y0 > H) break
            const cv = fst.canvas(f.pi, lv, pal, picked)
            if (cv) {
              fctx.drawImage(cv, x0, y0, x1 - x0, y1 - y0)
              if (PERF && !v.moving) {
                // 시험이 누를 자리 — 가운데에서 가장 가까운 칠한 픽셀
                let best = -1
                let bd = Infinity
                for (let i = 0; i < sp.idx.length; i++) {
                  if (!sp.idx[i] || sp.idx[i] === 16) continue
                  const d = ((i % sp.w) - sp.w / 2) ** 2 + (Math.floor(i / sp.w) - sp.h / 2) ** 2
                  if (d < bd) {
                    bd = d
                    best = i
                  }
                }
                if (best >= 0) drawnFigs.push({ id: f.id, x: (x0 + ((best % sp.w) + 0.5) * S) / dpr, y: (y0 + (Math.floor(best / sp.w) + 0.5) * S) / dpr })
              }
            }
            break
          }
        }
      }
    }
    // 그릴 차례 — 화면 타일을 가운데에서 가까운 차례로, 그다음 한 칸 둘레 (옮길 때 미리 — 단계를 바꾼 직후는 빼고), 맨 끝에 개관
    const settled = !v.moving && t0 - zoomedAt.current > SETTLE_MS
    if (!settled && !v.moving) {
      window.clearTimeout(settleTimer.current)
      settleTimer.current = window.setTimeout(schedule, SETTLE_MS + 20)
    }
    const ctx0 = (tx0 + tx1) / 2
    const cty0 = (ty0 + ty1) / 2
    const specs: (TileSpec & { d: number })[] = []
    const spec = (lv: number, tx: number, ty: number, d: number) => {
      const lu = LEVELS[lv]
      const lg = gridFor(MAP_W, MAP_H, lu)
      const x0 = tx * TILE
      const y0 = ty * TILE
      const tw = Math.min(TILE, lg.w - x0)
      const th = Math.min(TILE, lg.h - y0)
      const info = tileInfo(lv, tx, ty)
      specs.push({
        key: info.key,
        u: lu,
        x0,
        y0,
        w: tw,
        h: th,
        pal: sandbox.palette,
        shore: sandbox.shore,
        terrain: sandbox.terrain,
        holes: info.holes ? () => info.holes! : undefined,
        period: info.period,
        child: info.child,
        d,
      })
    }
    const r = settled ? 1 : 0
    for (let ty = Math.max(0, ty0 - r); ty <= Math.min(nty - 1, ty1 + r); ty++) {
      for (let tx = Math.max(0, tx0 - r); tx <= Math.min(ntx - 1, tx1 + r); tx++) {
        const ring = tx < tx0 || tx > tx1 || ty < ty0 || ty > ty1 ? 1000 : 0
        spec(level, tx, ty, ring + Math.hypot(tx - ctx0, ty - cty0))
      }
    }
    // 개관 — 세계 한 장(BACKDROP 단계, 타일 두 장)을 늘 붙잡아 두어 어느 단계로 빠르게 가도 늘일 타일이 있다
    const bg = gridFor(MAP_W, MAP_H, LEVELS[BACKDROP])
    if (level !== BACKDROP) for (let ty = 0; ty < Math.ceil(bg.h / TILE); ty++) for (let tx = 0; tx < Math.ceil(bg.w / TILE); tx++) spec(BACKDROP, tx, ty, 1e6)
    specs.sort((a, b) => a.d - b.d)
    s.pin([...pinned, ...specs.map((t) => t.key)])
    s.want(specs)
    if (statusRef.current) statusRef.current.hidden = missing === 0
    if (PERF && window.__pixel) {
      window.__pixel.frames.push(performance.now() - t0)
      window.__pixel.missing = missing
      window.__pixel.anim = v.moving
      window.__pixel.u = u
      window.__pixel.fx = fxLayer.current ?? undefined
    }
  }
  const visualRef = useRef(visual)
  useLayoutEffect(() => {
    drawRef.current = draw
    visualRef.current = visual
  })

  // 보기·팔레트·화면이 바뀌면 다시 그린다
  useLayoutEffect(schedule, [schedule, level, sandbox, vp, tileInfo])

  // 주소 — ?view 는 지금 지도와 같은 뜻으로, 시험 스위치는 그대로 남긴다
  const urlTimer = useRef(0)
  /** 마지막으로 셈한 주소의 ? 부분 — replaceState 는 잠잠해진 뒤에 쓰니 그동안 location.search 는 낡았다 */
  const searchRef = useRef(window.location.search)
  // '지금 지도로' 링크는 그리는 때마다 최신 보기로 (JSX 의 href 는 낡은 location.search 로 되돌렸다)
  useLayoutEffect(() => {
    if (linkRef.current) linkRef.current.href = mainMapHref(searchRef.current, window.location.hash)
  })
  const writeUrl = useCallback(() => {
    const q = new URLSearchParams(window.location.search)
    // React 의 단계는 확대가 끝난 뒤에 따라오니 지금 단계(levelNow)로
    const k = cssPerUnit(levelNow.current, sandbox.size, vp.dpr) / fitScale(vp.w, vp.h)
    const p = center.current
    q.set('view', `${Math.round(p.x)},${Math.round(p.y)},${Math.round(k * 100) / 100}`)
    q.set('pal', sandbox.palette)
    q.set('s', String(sandbox.size))
    q.set('shore', sandbox.shore)
    // 시점 — 지금 지도처럼 시점을 켜면 사가·페이즈를 지운다 (시점을 끄면 남은 ?saga 는 그대로 — 지금 지도로 가는 링크가 이어 받는다)
    q.delete('time')
    if (time !== null) {
      q.delete('saga')
      q.delete('phase')
      q.set('time', String(time))
    }
    const s = q.toString().replace(/%2C/g, ',')
    searchRef.current = `?${s}`
    // 끌기·방향키는 React 로 다시 그리지 않으니 링크도 여기서 고친다
    if (linkRef.current) linkRef.current.href = mainMapHref(`?${s}`, window.location.hash)
    // 주소 쓰기는 잠잠해진 뒤 한 번 — 잇단 확대·방향키마다 쓰면 Chrome 이 짧은 사이의 많은 replaceState 를 버려 ?view 가 낡은 채 남는다
    window.clearTimeout(urlTimer.current)
    urlTimer.current = window.setTimeout(() => {
      window.history.replaceState(null, '', `?${s}${window.location.hash}`) // 경로는 그대로 (// 로 시작하는 경로가 다른 호스트로 읽히지 않게)
    }, 250)
  }, [vp, sandbox, time])
  useEffect(() => () => window.clearTimeout(urlTimer.current), [])
  useEffect(writeUrl, [writeUrl, level])

  /**
   * 화면 점 (sx, sy) 를 붙잡고 단계를 바꾼다 — 화면은 지금 보이는 배율(움직이는 중이면 그 배율)에서 새 단계로 이어 그린다.
   * 두 손가락 확대를 끝낼 때는 to 에 가장 가까운 단계를 준다
   */
  const zoomTo = useCallback(
    (next: number, sx = vp.w / 2, sy = vp.h / 2) => {
      next = clamp(next, 0, LEVELS.length - 1)
      const now = performance.now()
      const v = visualRef.current(now)
      const mx = (sx * vp.dpr - v.ox) / v.k
      const my = (sy * vp.dpr - v.oy) / v.k
      const kT = devicePerPixel(sandbox.size, vp.dpr) / LEVELS[next]
      pinch.current = null
      if (next === levelNow.current && !v.moving) return
      // 가운데는 지도 안으로 묶고, 붙잡은 점의 끝 자리를 묶은 가운데에서 다시 센다 — 끝 프레임이 그대로 고정 그림이 되게 (가장자리에서 튀지 않게)
      const c = {
        x: clamp(mx - (sx - vp.w / 2) * (vp.dpr / kT), 0, MAP_W),
        y: clamp(my - (sy - vp.h / 2) * (vp.dpr / kT), 0, MAP_H),
      }
      center.current = c
      const ax1 = vp.w / 2 + ((mx - c.x) * kT) / vp.dpr
      const ay1 = vp.h / 2 + ((my - c.y) * kT) / vp.dpr
      const dur = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ZOOM_MS
      anim.current =
        dur > 0 && (Math.abs(Math.log(v.k / kT)) > 1e-3 || Math.hypot(ax1 - sx, ay1 - sy) > 0.5)
          ? { from: v.k, to: kT, t0: now, dur, mx, my, ax0: sx, ay0: sy, ax1, ay1, fromLevel: v.fromLevel }
          : null
      zoomedAt.current = now
      // React 로 다시 그리는 것(기호 층·범위)은 움직임이 끝난 첫 고정 프레임에 — 움직임 첫 프레임에 기호 층을 다시 그리느라 휴대폰에서 한 프레임이 밀렸다
      // (draw 가 levelNow 와 React 의 단계가 다르면 그때 맞춘다). 움직임이 없으면(움직임 줄이기) 바로
      levelNow.current = next
      setUiLevel(next)
      if (!anim.current) {
        setCull(cullFor(next, c, kT, vp.w, vp.h, vp.dpr))
        goLevel(next)
      }
      schedule()
      writeUrl()
    },
    [vp, sandbox.size, goLevel, schedule, writeUrl],
  )
  /** 한 단계 — 두 손가락·트랙패드 확대 중이면 지금 보이는 배율에 가장 가까운 단계에서 센다 */
  const zoomAt = useCallback(
    (dir: 1 | -1, sx?: number, sy?: number) => {
      const pz = pinch.current
      const base = pz ? nearestLevel((pz.target ?? pz.k) / vp.dpr, sandbox.size, vp.dpr) : levelNow.current
      zoomTo(base + dir, sx, sy)
    },
    [zoomTo, vp.dpr, sandbox.size],
  )
  /** 움직임을 끊는다 — 가운데·단계를 바로 정하는 일 앞에 (남은 이어 그리기나 손을 뗀 뒤의 settle 이 그 일을 덮지 않게) */
  const stopZoom = useCallback(() => {
    anim.current = null
    window.clearTimeout(wheelTimer.current)
    // 두 손가락·트랙패드·휠 확대 중이면 그 확대를 버리지 않고 지금 기운 단계·가운데로 바로 앉힌다 (휠 뒤 0.1초 안의 방향키·⌂·Tab 이 확대를 되돌렸다)
    const pz = pinch.current
    if (!pz) return
    pinch.current = null
    const wheel = pz.target !== undefined
    const k1 = pz.target ?? pz.k
    const lv = settleLevel(k1, Math.sign(Math.log(k1 / pz.k0)), sandbox.size, vp.dpr, wheel ? WHEEL_LEAN : PINCH_LEAN)
    const k = devicePerPixel(sandbox.size, vp.dpr) / LEVELS[lv]
    center.current = { x: clamp(pz.mx - (pz.ax - vp.w / 2) * (vp.dpr / k), 0, MAP_W), y: clamp(pz.my - (pz.ay - vp.h / 2) * (vp.dpr / k), 0, MAP_H) }
    levelNow.current = lv
    setUiLevel(lv)
  }, [sandbox.size, vp])

  // 몸짓 처리기는 한 번만 단다 — 단계가 바뀔 때마다 다시 달면 진행 중인 핀치·끌기의 손가락을 잃는다. 최신 셈은 live 로 읽는다
  /** 지도를 누른 자리의 페이즈 그림을 고른다 (S7 — 아래에서 select 를 정한 뒤 채운다) */
  const tapRef = useRef<(cx: number, cy: number, touch: boolean) => void>(() => {})
  const live = useRef({ unitNow: () => unit, schedule, zoomAt, zoomTo, writeUrl, vp, size: sandbox.size })
  useLayoutEffect(() => {
    live.current = { unitNow: () => cssPerUnit(levelNow.current, sandbox.size, vp.dpr), schedule, zoomAt, zoomTo, writeUrl, vp, size: sandbox.size }
  })

  // 끌기·두 손가락 확대·휠
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const pts = new Map<number, { x: number; y: number }>()
    /** 두 손가락 확대를 시작할 때의 손가락 거리와 배율, 그 두 손가락 (세 손가락이면 앞의 둘) */
    let pinch0 = { d: 0, k: 0 }
    let pair: [number, number] | null = null
    /** 이번 몸짓에 손가락이 둘 이상이었나 — 누름(고르기)으로 치지 않는다 */
    let multi = false
    /** 두 손가락을 (다시) 정한다 — 손가락이 바뀌면 그 자리에서 새로 붙잡는다 (튀지 않게) */
    const startPair = () => {
      multi = true
      const ids = [...pts.keys()].slice(0, 2) as [number, number]
      pair = ids
      const [a, b] = ids.map((id) => pts.get(id)!)
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      if (pinch.current) {
        const v = visualRef.current(performance.now())
        const pz = pinch.current
        pz.mx = (mx * live.current.vp.dpr - v.ox) / v.k
        pz.my = (my * live.current.vp.dpr - v.oy) / v.k
        pz.ax = mx
        pz.ay = my
      } else follow(null, mx, my)
      pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y), k: pinch.current!.k }
    }
    let trackpadTimer = 0
    // 움직임 줄이기의 휠 — 모은 몫과 마지막 휠 시각
    let wheelAcc = 0
    let lastWheel = -1e9
    /** 이번 몸짓에서 움직인 거리 (px) — 끌기 뒤에 오는 dblclick 은 확대로 치지 않는다 */
    let moved = 0
    /** 몸짓의 첫 손가락이 누른 자리 — 거기서 8px 넘게 벗어나야 끌기로 본다 (손끝이 살짝 밀려도 기호를 누른 것으로) */
    let start = { x: 0, y: 0 }
    // 붙잡기(pointer capture)는 움직이기 시작할 때 — 누르자마자 붙잡으면 click 이 기호 단추가 아니라 지도로 가 기호를 고를 수 없다
    const capture = (id: number) => {
      if (!el.hasPointerCapture(id)) el.setPointerCapture(id)
    }
    /** 이어지는 확대(두 손가락·트랙패드)의 배율 범위 — 가장 먼 단계의 반에서 가장 깊은 단계의 두 배까지 */
    const kRange = () => {
      const { vp, size } = live.current
      const d = devicePerPixel(size, vp.dpr)
      return [d / LEVELS[0] / 2, (d / LEVELS[LEVELS.length - 1]) * 2] as const
    }
    /** 이어지는 확대를 (ax, ay) 를 붙잡은 채 배율 k 로 — 처음이면 지금 보이는 모습에서 시작한다 */
    const follow = (k: number | null, ax: number, ay: number) => {
      let pz = pinch.current
      if (!pz) pz = pinch.current = startFollow(ax, ay)
      const [lo, hi] = kRange()
      if (k !== null) pz.k = clamp(k, lo, hi)
      pz.target = undefined
      pz.ax = ax
      pz.ay = ay
      live.current.schedule()
    }
    /** 이어지는 확대를 지금 보이는 모습에서 시작한다 — (ax, ay) 밑의 지도 점을 붙잡는다 */
    const startFollow = (ax: number, ay: number) => {
      const { vp } = live.current
      const v = visualRef.current(performance.now())
      const a = anim.current
      anim.current = null
      return { k: v.k, k0: v.k, base: a ? a.to : v.k, mx: (ax * vp.dpr - v.ox) / v.k, my: (ay * vp.dpr - v.oy) / v.k, ax, ay, fromLevel: v.fromLevel, t: performance.now() }
    }
    /** 이어지는 확대를 끝낸다 — 붙잡은 점을 그대로 둔 채, 움직이던 쪽으로 기운 단계로 (휠은 목표 배율에서) */
    const settle = () => {
      const pz = pinch.current
      if (!pz) return
      const { vp, size, zoomTo, writeUrl } = live.current
      const wheel = pz.target !== undefined
      const k1 = pz.target ?? pz.k
      const lv = settleLevel(k1, Math.sign(Math.log(k1 / pz.k0)), size, vp.dpr, wheel ? WHEEL_LEAN : PINCH_LEAN)
      // 휠이 단계에 앉고 남긴 몫 — 곧 다시 굴리면 이어 받는다
      if (wheel) wheelCarry.current = { v: levelAt(k1, size, vp.dpr) - lv, t: performance.now() }
      zoomTo(lv, pz.ax, pz.ay)
      writeUrl()
    }
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if (!pts.size) {
        moved = 0
        multi = false
        start = { x: e.clientX, y: e.clientY }
        // 휠 확대가 미끄러지는 중에 누르면 그 자리에서 단계에 앉힌다 — 끌기는 그 이어 그리기 위에서 바로 움직인다 (기다리는 동안 끌기가 버려졌다)
        if (pinch.current?.target !== undefined) {
          window.clearTimeout(wheelTimer.current)
          settle()
        }
      }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pts.size === 2) {
        for (const id of pts.keys()) capture(id)
        startPair()
      }
    }
    const move = (e: PointerEvent) => {
      const prev = pts.get(e.pointerId)
      if (!prev) return
      const cur = { x: e.clientX, y: e.clientY }
      pts.set(e.pointerId, cur)
      moved = Math.max(moved, Math.hypot(cur.x - start.x, cur.y - start.y))
      if (moved > 8) capture(e.pointerId)
      const { unitNow, schedule } = live.current
      if (pts.size === 1 && !pinch.current) {
        const unit = unitNow()
        center.current = { x: center.current.x - (cur.x - prev.x) / unit, y: center.current.y - (cur.y - prev.y) / unit }
        // 확대가 이어 그려지는 동안 끌면 붙잡은 화면 점도 함께 옮긴다 (끝날 때 튀지 않게)
        const a = anim.current
        if (a) {
          a.ax0 += cur.x - prev.x
          a.ax1 += cur.x - prev.x
          a.ay0 += cur.y - prev.y
          a.ay1 += cur.y - prev.y
        }
        schedule()
      } else if (pair && pinch0.d > 0 && pair.includes(e.pointerId)) {
        // 손가락 거리에 따라 배율을 그대로 따라가고, 두 손가락 가운데가 붙잡은 점을 끈다 — 단계는 손을 뗄 때 정한다
        const a = pts.get(pair[0])!
        const b = pts.get(pair[1])!
        follow((pinch0.k * Math.hypot(a.x - b.x, a.y - b.y)) / pinch0.d, (a.x + b.x) / 2, (a.y + b.y) / 2)
      }
    }
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId)
      if (pair?.includes(e.pointerId)) {
        if (pts.size >= 2) startPair()
        else {
          pair = null
          pinch0 = { d: 0, k: 0 }
          settle()
        }
      }
      if (!pts.size) live.current.writeUrl()
      // 누름 — 기호·이름 단추 위가 아니면 그 자리의 페이즈 그림 (그림 모양으로 판정 — figures/store.ts 의 hitDistance)
      const target = e.target instanceof Element ? e.target : null
      if (e.type === 'pointerup' && !pts.size && !multi && moved <= 8 && !target?.closest('button, a, .px-panel, .pixel-head, .pixel-zoom, .px-legend'))
        tapRef.current(e.clientX, e.clientY, e.pointerType === 'touch')
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? live.current.vp.h : 1)
      // 트랙패드의 두 손가락 확대(ctrlKey) — 두 손가락 확대처럼 배율을 따라가고, 멈추면 가장 가까운 단계로
      if (e.ctrlKey) {
        const k = pinch.current?.k ?? visualRef.current(performance.now()).k
        follow(k * Math.exp(-dy * 0.01), e.clientX, e.clientY)
        window.clearTimeout(trackpadTimer)
        trackpadTimer = window.setTimeout(settle, 150)
        return
      }
      // 움직임 줄이기 — 미끄러지지 않고 예전처럼 한 칸(50)에 한 단계씩 바로 (zoomTo 가 이어 그리지 않는다)
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        if (e.timeStamp - lastWheel > 200) wheelAcc = 0
        lastWheel = e.timeStamp
        wheelAcc += dy
        if (Math.abs(wheelAcc) >= 50) {
          live.current.zoomAt(wheelAcc < 0 ? 1 : -1, e.clientX, e.clientY)
          wheelAcc = 0
        }
        return
      }
      // 휠·트랙패드 스크롤 — 배율의 목표를 옮기고(WHEEL_PER_LEVEL px 에 한 단계) 화면은 그 목표로 미끄러진다 (draw 의 GLIDE_MS).
      // 멈추면 간 쪽으로 기운 단계에 앉는다 — 휠 한 칸(100)은 한 단계. 예전에는 한 칸마다 두 배씩 뛰고 0.12초에 한 번까지라 이어 굴리면 계단처럼 끊겼다
      const { vp, size } = live.current
      let pz = pinch.current
      if (!pz) {
        pz = pinch.current = startFollow(e.clientX, e.clientY)
        // 곧 다시 굴렸으면 앞에서 앉으며 남긴 몫을 이어 받는다
        const carry = wheelCarry.current
        if (performance.now() - carry.t < WHEEL_CARRY_MS) pz.base *= 2 ** carry.v
        wheelCarry.current = { v: 0, t: -1e9 }
      } else if (pz.target !== undefined && (pz.ax !== e.clientX || pz.ay !== e.clientY)) {
        // 미끄러지는 동안 커서가 옮겨 가면 그 밑의 지도 점을 새로 붙잡는다 (지도가 따라 끌리지 않게)
        const v = visualRef.current(performance.now())
        pz.mx = (e.clientX * vp.dpr - v.ox) / v.k
        pz.my = (e.clientY * vp.dpr - v.oy) / v.k
        pz.ax = e.clientX
        pz.ay = e.clientY
      }
      // 목표는 단계의 범위 안 — 끝 단계에서 더 굴려도 넘어갔다 되돌아오지 않게
      const d = devicePerPixel(size, vp.dpr)
      const from = pz.target ?? pz.base
      const next = clamp(from * 2 ** (-dy / WHEEL_PER_LEVEL), d / LEVELS[0], d / LEVELS[LEVELS.length - 1])
      if (pz.target === undefined) pz.t = performance.now()
      pz.target = next
      live.current.schedule()
      window.clearTimeout(wheelTimer.current)
      wheelTimer.current = window.setTimeout(settle, WHEEL_SETTLE_MS)
    }
    const dbl = (e: MouseEvent) => {
      // 기호·이름을 두 번 누른 것은 고르기다 — 확대하지 않는다
      if (moved > 8 || (e.target as Element).closest?.('.px-marks button')) return
      live.current.zoomAt(e.shiftKey ? -1 : 1, e.clientX, e.clientY)
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('dblclick', dbl)
    return () => {
      window.clearTimeout(trackpadTimer)
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('dblclick', dbl)
    }
  }, [])

  const onKey = (e: React.KeyboardEvent) => {
    const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    if (moves[e.key]) {
      e.preventDefault()
      stopZoom()
      // 한 번에 화면 64px — 지금 단계(levelNow)로 센다 (React 의 단계는 확대가 끝난 뒤에 따라온다)
      const step = 64 / cssPerUnit(levelNow.current, sandbox.size, vp.dpr)
      const [dx, dy] = moves[e.key].map((v) => v * step)
      center.current = { x: center.current.x + dx, y: center.current.y + dy }
      schedule()
      writeUrl()
    } else if (e.key === '+' || e.key === '=') zoomAt(1)
    else if (e.key === '-' || e.key === '_') zoomAt(-1)
  }

  const reset = () => {
    stopZoom()
    center.current = { x: MAP_W / 2, y: MAP_H / 2 }
    // React 의 단계가 이미 같아도(확대를 미뤄 둔 사이) 다시 그리고 주소를 쓴다
    goLevel(overviewLevel(vp.w, vp.h, sandbox.size, vp.dpr))
    schedule()
    writeUrl()
  }

  // 고른 것 — 지금 지도와 같은 # 주소. 장소와 하나인 카드(#card/<id>)는 패널의 글을 받은 뒤 그 장소로 바꿔 연다
  const [selection, setSelection] = useState<Selection | null>(() => readHash(window.location.hash))
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [panelMod, setPanelMod] = useState<{ build: (time: number | null) => PanelData } | null>(null)
  const [dict, setDict] = useState<Dict | null>(null)
  // 패널의 글은 시점마다 — 사가에 매인 대지 카드는 그 시점에만 (S6)
  const panelData = useMemo(() => panelMod?.build(time) ?? null, [panelMod, time])
  const panel = { data: panelData, dict }
  // 장소마다의 '이 무렵' — 시점을 켜고 패널을 열 때 받는다 (virtual:pixel-period-notes)
  const [notes, setNotes] = useState<Record<string, Record<string, PeriodNoteSlim[]>> | null>(null)
  const panelPeriod = useMemo<PanelPeriod | null>(
    () => (timeLevel === null ? null : { notes: notes?.[timeLevel] ?? (notes ? {} : null), marks: new Map(levelInfo?.placeMarks ?? []) }),
    [timeLevel, notes, levelInfo],
  )
  // 장소와 하나인 카드 — 대지 카드와 페이즈 카드(Seer's Sundial 같은 place) 모두 그 장소(대륙과 하나인 차원 카드는 그 대륙)의 패널로
  const phasePlace = selection?.type === 'card' ? phaseInfo?.get(selection.id) : undefined
  const placeOfCard = selection?.type === 'card' ? (panel.data?.cardPlace.get(selection.id) ?? (phasePlace?.row[7] ? phasePlace.row[6] : undefined)) : undefined
  const shown = useMemo<Selection | null>(
    () => (placeOfCard ? (placeOfCard.startsWith('continent/') ? { type: 'continent', id: placeOfCard.slice(10) } : { type: 'location', id: placeOfCard }) : selection),
    [placeOfCard, selection],
  )
  // 범례 (S10) — 펼친 동안 영어 사전도 받는다 (범례의 시점 글은 데이터 글). 패널이 열리면 접는다 (둘이 같은 자리를 다툰다 — 휴대폰은 아래 시트)
  const [legendOpen, setLegendOpen] = useState(false)
  // 머리말 밑변 (화면 px) — 크기를 따라 잰다
  const headRef = useRef<HTMLElement>(null)
  const [headBottom, setHeadBottom] = useState(0)
  useEffect(() => {
    const el = headRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setHeadBottom(Math.ceil(el.getBoundingClientRect().bottom)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // 패널의 글(장소·카드·대륙 원본)과 영어 사전은 처음 고를 때 받는다 — 첫 화면에는 이름과 자리만 (virtual:pixel-marks)
  const wantPanel = selection !== null
  useEffect(() => {
    if (!wantPanel) return
    let live = true
    if (!panelMod) void import('./panel/data').then((m) => live && setPanelMod({ build: m.buildPanelData }))
    if (lang === 'en' && !dict) void import('../i18n/en/base.json').then((m) => live && setDict(m.default as Dict))
    if (time !== null && !notes) void import('virtual:pixel-period-notes').then((m) => live && setNotes(m.default))
    return () => {
      live = false
    }
  }, [wantPanel, lang, panelMod, dict, time, notes])
  useEffect(() => {
    if (!legendOpen || lang !== 'en' || dict) return
    let live = true
    void import('../i18n/en/base.json').then((m) => live && setDict(m.default as Dict))
    return () => {
      live = false
    }
  }, [legendOpen, lang, dict])
  // 페이즈 그림의 데이터 — 시점을 켰거나, 장소·대지 카드가 아닌 카드(페이즈 카드)를 골랐을 때
  const wantFigs = time !== null || (selection?.type === 'card' && !marks.cards.some((c) => c.id === selection.id) && !marks.cardPlaces[selection.id] && !marks.sagaPlaces[selection.id])
  useEffect(() => {
    if (!wantFigs || figData) return
    let live = true
    void import('virtual:pixel-figures').then((m) => live && setFigData({ meta: m.default, chunks: m.chunks }))
    return () => {
      live = false
    }
  }, [wantFigs, figData])
  // 고른 페이즈 카드의 원본 (패널)
  const [phaseText, setPhaseText] = useState<{ id: string; text: PhaseCardText | null } | null>(null)
  const pickedPhase = selection?.type === 'card' ? phaseInfo?.get(selection.id) : undefined
  useEffect(() => {
    if (!pickedPhase || pickedPhase.row[7]) return
    let live = true
    const id = pickedPhase.row[0]
    loadPhaseCard(id, pickedPhase.row[4])
      .then((text) => live && setPhaseText({ id, text }))
      // 글을 받지 못하면 이름과 이은 곳만 (지금 지도와 같다)
      .catch(() => live && setPhaseText({ id, text: null }))
    return () => {
      live = false
    }
  }, [pickedPhase])
  const phaseCard = pickedPhase && !pickedPhase.row[7] ? (phaseText?.id === pickedPhase.row[0] ? (phaseText.text ?? false) : null) : undefined
  const phaseStub = pickedPhase ? { name: pickedPhase.row[1], nameKo: pickedPhase.row[2] || undefined, depicts: pickedPhase.row[6] } : undefined
  /** 장소와 하나인 페이즈 카드 (place — 그 장소 패널에 장소의 카드로) — 그 시점에 그리는 것만 */
  const phasePlaceCardsAt = useMemo(() => {
    if (!figData || time === null) return undefined
    const meta = figData.meta
    const by = new Map<string, { id: string; phase: number }[]>()
    for (const [ci] of meta.drawn[time] ?? []) {
      const r = meta.cards[ci]
      if (r[7]) by.set(r[6], [...(by.get(r[6]) ?? []), { id: r[0], phase: r[4] }])
    }
    return (placeId: string) => by.get(placeId) ?? []
  }, [figData, time])
  /** 장소마다 이 시점에 그리는 페이즈 카드 — 세계 지도 그림과 지역 상세의 대상 (지역 상세의 대상은 가장 깊은 단계에서만 그린다 — S9) */
  const phaseCardsAt = useMemo(() => {
    if (!figData || time === null) return undefined
    const by = new Map<string, PhaseCardRow[]>()
    const meta = figData.meta
    for (const [ci, cm] of meta.drawn[time] ?? []) {
      const [id, name, nameKo, set, , , depicts, place] = meta.cards[ci]
      // 장소와 하나인 카드는 그 장소 자체라 줄에 싣지 않는다 (한 곳은 한 번만 — 장소 패널이 그 카드를 장소의 카드로 싣는다)
      if (place) continue
      const row = { id, name, ...(nameKo ? { nameKo } : {}), set }
      // 그 카드가 가리키는 장소, 그리고 그 시점에 그 카드를 그리는 지역 상세의 장소들 (대상이 이웃 장소나 대륙을 가리켜도 — App.tsx 의 phaseCardsHere)
      const at = new Set([depicts, ...(cm ? (meta.details[cm] ?? []) : [])])
      for (const p of at) by.set(p, [...(by.get(p) ?? []), row])
    }
    return (placeId: string) => by.get(placeId) ?? []
  }, [figData, time])

  /** 고른 것의 지도 자리 — 페이즈 카드는 이 시점의 그림, 그리지 않으면(지역 상세의 대상) 그 카드가 가리키는 곳 */
  const markAt = useCallback(
    (s: Selection) => {
      const fig = s.type === 'card' ? figOf.get(s.id) : undefined
      if (fig) return { key: `f${fig.pi}`, at: [(fig.box.x0 + fig.box.x1) / 2, (fig.box.y0 + fig.box.y1) / 2] as Point }
      const info = s.type === 'card' ? phaseInfo?.get(s.id) : undefined
      if (info) return markOf(info.row[6].startsWith('continent/') ? { type: 'continent', id: info.row[6].slice(10) } : { type: 'location', id: info.row[6] })
      return markOf(s)
    },
    [figOf, phaseInfo],
  )
  /** 고른 것을 화면 가운데로 — 그 이름(없으면 기호)이 보이는 단계까지 확대한다 */
  const goTo = useCallback(
    (s: Selection) => {
      // 페이즈 카드 — 이 시점의 그림, 그리지 않으면(지역 상세의 대상) 그 카드가 가리키는 곳
      const m = markAt(s)
      if (!m) {
        if (s.type === 'card') pendingGo.current = true
        return
      }
      stopZoom()
      center.current = { x: m.at[0], y: m.at[1] }
      const need = firstShown(m.key)
      const next = Number.isFinite(need) ? Math.max(levelNow.current, need) : levelNow.current
      goLevel(next)
      schedule()
      writeUrl()
    },
    [firstShown, goLevel, schedule, writeUrl, stopZoom, markAt],
  )
  /** 패널의 '가까이 보기' (S9) — 그 지역 상세의 가운데로, 지역 상세가 나오는 단계까지 */
  const onCloser = useCallback(
    (id: string) => {
      const m = childMeta.maps.find((x) => x.id === id)
      if (!m) return
      stopZoom()
      const lv = Math.max(levelNow.current, detailLevelOf(childMeta, LEVELS))
      // 지역 상세의 가운데를 패널이 덮지 않은 자리의 가운데로 (지금 지도의 focusBounds — 오른쪽 패널이면 왼쪽, 휴대폰 시트면 위)
      const u = cssPerUnit(lv, sandbox.size, vp.dpr)
      const box = document.querySelector('.px-panel')?.getBoundingClientRect()
      const cx = (m.b[0] + m.b[2]) / 2
      const cy = (m.b[1] + m.b[3]) / 2
      const sheet = box && box.top > vp.h * 0.3
      center.current = !box ? { x: cx, y: cy } : sheet ? { x: cx, y: cy + (vp.h / 2 - box.top / 2) / u } : { x: cx + (vp.w / 2 - box.left / 2) / u, y: cy }
      goLevel(lv)
      schedule()
      writeUrl()
    },
    [goLevel, schedule, writeUrl, stopZoom, sandbox.size, vp],
  )
  /** 처음 연 # 이 페이즈 카드면 그림 데이터가 온 뒤에 그곳으로 */
  const pendingGo = useRef(false)
  const select = useCallback(
    (s: Selection | null, move = false) => {
      setSelection(s)
      const next = `${searchRef.current}${hashOf(s)}`
      window.history.replaceState(null, '', next || window.location.pathname)
      // 링크와 (잠잠해지면 쓰는) ?view 를 지금 보기와 새 # 로
      writeUrl()
      if (s && move) goTo(s)
    },
    [goTo, writeUrl],
  )
  // 처음 연 주소의 # — ?view 가 없으면 그곳으로 간다
  const opened = useRef(false)
  useEffect(() => {
    if (opened.current) return
    opened.current = true
    const s = readHash(window.location.hash)
    if (s && !readView(window.location.search)) goTo(s)
  }, [goTo])
  // 주소의 # 를 손으로 바꾸면 그것을 고른다
  useEffect(() => {
    const on = () => {
      const s = readHash(window.location.hash)
      setSelection(s)
      if (linkRef.current) linkRef.current.href = mainMapHref(searchRef.current, window.location.hash)
      if (s) goTo(s)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [goTo])
  // Esc 는 패널을 닫는다
  useEffect(() => {
    if (!shown) return
    const on = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      select(null)
      stageRef.current?.focus()
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [shown, select])

  // 고른 기호가 패널 밑에 들면 지도를 옮겨 패널 밖(남은 화면의 가운데)에 둔다 — 패널이 열리거나 고른 것이 바뀔 때 한 번
  const shownKey = shown ? `${shown.type}/${shown.id}` : ''
  // 패널의 글이 다 와서 패널이 제 크기일 때만 잰다 (받는 동안의 '…' 상자는 낮아 휴대폰 시트 밑의 그림을 놓쳤다 — 검토). 고른 것마다 한 번만 — 시점을 바꿔
  // 패널 데이터·그림이 새로 되어도 다시 옮기지 않는다 (검토: 시점을 바꾸면 지도가 튀었다)
  const panelReady = Boolean(panel.data) && phaseCard !== null
  const placedFor = useRef('')
  useLayoutEffect(() => {
    if (!shown) {
      placedFor.current = ''
      return
    }
    if (placedFor.current === shownKey || !panelReady) return
    const m = markAt(shown)
    const box = document.querySelector('.px-panel')?.getBoundingClientRect()
    if (!m || !box) return
    placedFor.current = shownKey
    const u = live.current.unitNow()
    const sx = vp.w / 2 + (m.at[0] - center.current.x) * u
    const sy = vp.h / 2 + (m.at[1] - center.current.y) * u
    const pad = 24
    if (sx < box.left - pad || sx > box.right + pad || sy < box.top - pad || sy > box.bottom + pad) return
    // 패널이 오른쪽이면 왼쪽의 남은 폭, 아래쪽 시트면 위의 남은 높이의 가운데로
    const sheet = box.top > vp.h * 0.3
    const tx = sheet ? vp.w / 2 : box.left / 2
    const ty = sheet ? box.top / 2 : vp.h / 2
    stopZoom()
    center.current = { x: center.current.x + (sx - tx) / u, y: center.current.y + (sy - ty) / u }
    schedule()
    writeUrl()
    // 고른 것이 바뀔 때만 — 끌어서 패널 밑으로 옮긴 것을 되돌리지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownKey, panelReady, figOf])

  /**
   * 시점을 바꾼다 (S6) — 지금 지도의 toggleTime: 켠 단추를 다시 누르면 끈다. 새 시점에 나오지 않는 대지 카드의 패널은 닫는다.
   * 주소는 새 항목으로 (뒤로 가기가 앞 시점으로 돌아간다 — popstate)
   */
  const changeTime = useCallback(
    (next: number | null, replace = false) => {
      setTime(next)
      const q = new URLSearchParams(searchRef.current)
      q.delete('time')
      if (next !== null) {
        q.delete('saga')
        q.delete('phase')
        q.set('time', String(next))
      }
      const sel = readHash(window.location.hash)
      const times = sel?.type === 'card' ? cardTimes(sel.id) : undefined
      // 페이즈 카드도 — 새 시점에 그리지 않는 카드의 패널은 닫는다 (지금 지도의 toggleTime, S7 검토: 시점을 끄면 그 카드의 시점으로 되돌아왔다)
      const ph = sel?.type === 'card' ? phaseInfoRef.current?.get(sel.id) : undefined
      const drawnNext = (ci: number) => next !== null && Boolean(figDataRef.current?.meta.drawn[next]?.some(([c]) => c === ci))
      const drop = (times && (next === null || !times.includes(next))) || (ph !== undefined && !drawnNext(ph.ci))
      if (drop) setSelection(null)
      searchRef.current = `?${q.toString().replace(/%2C/g, ',')}`
      // 단추는 새 항목, 카드를 따라 저절로 바꾸는 것은 그 자리에서 (새 항목을 쌓으면 뒤로 가기가 다시 그 시점으로 끌려왔다 — S6 검토)
      window.history[replace ? 'replaceState' : 'pushState'](null, '', `${searchRef.current}${drop ? '' : window.location.hash}`)
    },
    [],
  )
  // 뒤로·앞으로 — 주소의 시점과 # 를 다시 읽는다
  useEffect(() => {
    const on = () => {
      searchRef.current = window.location.search
      setTime(readTime(window.location.search, pixelTimes.times))
      setSelection(readHash(window.location.hash))
      // 지도는 옮기지 않으니 주소의 ?view 와 '지금 지도로' 링크를 지금 자리로 (검토: 돌아간 항목의 ?view 가 남았다)
      live.current.writeUrl()
    }
    window.addEventListener('popstate', on)
    return () => window.removeEventListener('popstate', on)
  }, [])
  // 지금 시점에 나오지 않는 사가에 매인 대지 카드를 고르면(# 주소·패널 링크) 그 카드가 나오는 첫 시점으로 간다 (지금 지도와 같다).
  // 페이즈 카드(S7)도 — 지금 시점에 그리지 않으면 그 카드를 세계 지도 그림으로 그리는 첫 시점, 없으면 그리는(지역 상세의 대상) 첫 시점으로
  // 고른 것이 바뀔 때만 (시점을 바꿀 때마다 다시 보면 사용자가 바꾼 시점을 되돌린다 — S7 검토). 페이즈 카드는 그림 데이터가 온 뒤에 한 번
  const jumped = useRef<string | null>(null)
  useEffect(() => {
    if (selection?.type !== 'card') {
      jumped.current = null
      return
    }
    if (jumped.current === selection.id) return
    const times = cardTimes(selection.id)
    if (times) {
      jumped.current = selection.id
      if (time === null || !times.includes(time)) changeTime(times[0], true)
      return
    }
    if (!figData) return
    jumped.current = selection.id
    if (!pickedPhase) return
    const meta = figData.meta
    const ci = pickedPhase.ci
    const ts = Object.keys(meta.times).map(Number)
    const drawnAt = (t: number) => Boolean(meta.drawn[t]?.some(([c]) => c === ci))
    if (time !== null && drawnAt(time)) return
    const world = ts.find((t) => meta.times[t].some(([pi]) => meta.places[pi][0] === ci))
    const next = world ?? ts.find(drawnAt)
    // 어느 시점에도 그리지 않는 카드(time.at 이 빈 것)는 그대로 — 패널이 그 까닭을 싣는다
    if (next !== undefined && next !== time) changeTime(next, true)
  }, [selection, time, changeTime, figData, pickedPhase])
  // 그림 데이터가 오면 미뤄 둔 '그곳으로 가기' — 그 시점의 그림이 있으면 그 그림, 세계 지도에 그리지 않는 카드면 그 카드가 가리키는 곳
  useEffect(() => {
    if (!pendingGo.current) return
    if (selection?.type !== 'card') {
      pendingGo.current = false
      return
    }
    const ph = phaseInfo?.get(selection.id)
    if (!ph) return
    const worldSomewhere = Object.values(figData!.meta.times).some((list) => list.some(([pi]) => figData!.meta.places[pi][0] === ph.ci))
    if (!figOf.has(selection.id) && worldSomewhere) return
    pendingGo.current = false
    goTo(selection)
  }, [figOf, selection, goTo, phaseInfo, figData])

  tapRef.current = (cx, cy, touch) => {
    const fst = figStore.current
    if (!fst || !figs.length || pinch.current || anim.current) return
    const lv = levelNow.current
    const unitC = cssPerUnit(lv, sandbox.size, vp.dpr)
    const mx = center.current.x + (cx - vp.w / 2) / unitC
    const my = center.current.y + (cy - vp.h / 2) / unitC
    const u = LEVELS[lv]
    const gx = Math.floor(mx / u)
    const gy = Math.floor(my / u)
    // 손끝은 넉넉하게 (지금 지도의 근처 누름: 마우스 12px·손가락 22px 를 픽셀 그림의 또렷한 가장자리에 맞춰 반으로)
    const slop = (touch ? 11 : 6) / (unitC * u)
    const selId = selection?.type === 'card' ? selection.id : null
    let best: Fig | null = null
    let bestD = Infinity
    for (let i = figs.length - 1; i >= 0; i--) {
      const f = figs[i]
      if (!layouts[lv]?.figures.has(`f${f.pi}`) && f.id !== selId) continue
      const d = fst.hitDistance(f.pi, lv, gx, gy, slop)
      if (d < 0) continue
      if (d === 0) {
        best = f
        break
      }
      if (d < bestD) {
        bestD = d
        best = f
      }
    }
    if (best) select({ type: 'card', id: best.id })
  }
  // 그림의 고름·초점·목록이 바뀌면 다시 그린다 (고른 그림은 윤곽을 고른 빛으로)
  useLayoutEffect(schedule, [schedule, figs, selection, focusedId, layouts])
  const onPick = useCallback((s: Selection) => select(s), [select])
  const onPanelPick = useCallback((s: Selection) => select(s, true), [select])
  /** 키보드로 화면 밖의 기호에 닿으면 그곳으로 옮긴다 */
  const onFocusMark = useCallback(
    (id: string | null, at: Point | null, keyboard: boolean) => {
      setFocusedId(id)
      if (!at || !keyboard) return
      // 이어지는 확대(휠·핀치) 중이면 먼저 그 단계에 앉힌다 — 앉기 전의 단계·가운데로 화면 밖인지 재면 잘못 옮긴다
      if (pinch.current) stopZoom()
      const u = live.current.unitNow()
      const sx = vp.w / 2 + (at[0] - center.current.x) * u
      const sy = vp.h / 2 + (at[1] - center.current.y) * u
      const m = 48
      if (sx < m || sy < m || sx > vp.w - m || sy > vp.h - m) {
        stopZoom()
        center.current = { x: at[0], y: at[1] }
        schedule()
        writeUrl()
      }
    },
    [vp, schedule, writeUrl, stopZoom],
  )

  const pick = <K extends keyof Sandbox>(key: K, value: Sandbox[K]) => {
    // 픽셀 크기를 바꾸면 화면 배율이 가장 가까운 단계로 옮겨 같은 넓이를 본다
    if (key === 'size') {
      stopZoom()
      goLevel(nearestLevel(cssPerUnit(levelNow.current, sandbox.size, vp.dpr), value as PixelSize, vp.dpr))
    }
    setSandbox((s) => ({ ...s, [key]: value }))
  }

  // 머리말 접기 (S8) — 접은 것은 이 브라우저에 기억한다(못 읽으면 펼친 채). 휴대폰(폭 767px 이하나 높이 520px 이하)에서는 패널이 열린 동안 저절로 접는다
  // (기억하지 않는다 — 패널이 닫히면 고른 상태로). 그동안 접기 단추를 누르면 그 패널이 열린 동안만 편다 (지금 지도의 머리말과 같다)
  const [headPinned, setHeadPinned] = useState(() => {
    try {
      return window.localStorage.getItem('pixel-head-folded') === '1'
    } catch {
      return false
    }
  })
  // 패널이 보이는가 — 밑의 패널 그리기와 같은 조건 (모르는 # 로 고른 것은 패널이 없어 접지 않는다)
  const panelOpen = shown !== null && (!panel.data || hasEntry(panel.data, shown) || (shown.type === 'card' && Boolean(phaseInfo?.has(shown.id))))
  // 저절로 접음 — 패널이 새로 열릴 때 접어 둔 머리말이 아니면 켜고, 패널이 닫히면 끈다 (지금 지도의 autoFolded 와 같다 — 그동안 접기 단추를 풀면
  // 다시 켜지지 않는다. 늘 다시 셈하면 접어 둔 머리말을 패널이 열린 채 풀 때 저절로 접음이 바로 켜져 첫 누름이 먹지 않았다)
  const [autoFolded, setAutoFolded] = useState(false)
  const [lastPanelOpen, setLastPanelOpen] = useState(false)
  if (lastPanelOpen !== panelOpen) {
    setLastPanelOpen(panelOpen)
    setAutoFolded(panelOpen && !headPinned)
    // 패널이 열리는 때 범례를 접는다 (S10 — 둘이 같은 자리를 다툰다. 그 뒤 다시 펴는 것은 그대로 둔다)
    if (panelOpen) setLegendOpen(false)
  }
  // 화면 크기가 바뀌면(vp) 다시 본다
  const small = vp.w <= 767 || vp.h <= 520
  // 범례를 펼치는 동안 — 펼친 머리말 밑에 범례가 들어갈 자리(LEGEND_MIN_PX)가 없는 낮은 화면이면 머리말을 저절로 접는다 (지금 지도의 LEGEND_MIN_REM 과 같은 몫 — 기억하지 않는다)
  const [legendFolded, setLegendFolded] = useState(false)
  const [lastLegendOpen, setLastLegendOpen] = useState(false)
  if (lastLegendOpen !== legendOpen) {
    setLastLegendOpen(legendOpen)
    setLegendFolded(legendOpen && !headPinned && vp.h - headBottom < LEGEND_MIN_PX)
  }
  const headFolded = headPinned || (small && autoFolded) || legendFolded
  const toggleHead = () => {
    // 저절로 접은 머리말을 펴면 이번 패널·범례 동안만 — 고른 상태(기억하는 것)는 그대로
    if (!headPinned && ((small && autoFolded) || legendFolded)) {
      setAutoFolded(false)
      setLegendFolded(false)
      return
    }
    const next = !headPinned
    setHeadPinned(next)
    try {
      window.localStorage.setItem('pixel-head-folded', next ? '1' : '0')
    } catch {
      // 기억하지 못해도 접기는 된다
    }
  }

  const style = useMemo(
    () =>
      ({
        '--px-page': pal.page,
        '--px-ui-bg': pal.uiBg,
        '--px-ui-ink': pal.uiInk,
        '--px-ui-edge': pal.uiEdge,
        '--px-water-ink': rgb(pal.foam),
        '--px-water-edge': rgb(pal.deep),
        // 머리말 밑변 (S10 — 펼친 범례가 그 밑까지만 자란다)
        '--px-head-bottom': `${headBottom}px`,
      }) as React.CSSProperties,
    [pal, headBottom],
  )
  const spriteColors = useMemo<SpriteColors>(() => ({ ink: pal.uiInk, fill: pal.uiBg, stone: STONE, halo: pal.uiBg }), [pal])
  const spriteSelected = useMemo<SpriteColors>(() => ({ ink: pal.uiInk, fill: PICKED, stone: PICKED, halo: PICKED }), [pal])

  return (
    <div className="pixel-app" style={style} lang={lang}>
      <div ref={stageRef} className="pixel-stage" role="region" aria-label={t.map} tabIndex={0} onKeyDown={onKey}>
        <canvas ref={canvasRef} className="pixel-canvas" aria-hidden="true" />
        <canvas ref={fxRef} className="pixel-fx" aria-hidden="true" />
        <canvas ref={figsRef} className="pixel-figs" aria-hidden="true" />
        <div ref={marksRef} className="px-marks">
          <MarksLayer
            figures={figs}
            details={detail.labels}
            marks={tm.marks}
            hidden={tm.hidden}
            dry={tm.dry}
            layout={layouts[level]}
            view={cull?.box ?? null}
            lang={lang}
            px={unit}
            u={LEVELS[level]}
            dpr={vp.dpr}
            colors={spriteColors}
            selected={spriteSelected}
            selection={shown}
            focusedId={focusedId}
            onSelect={onPick}
            onFocusMark={onFocusMark}
          />
        </div>
      </div>

      <header ref={headRef} className="pixel-head" data-folded={headFolded || undefined}>
        {/* 제목 줄 — 접은 시점과 접기 단추는 제목(h1) 밖에 (제목의 이름에 단추 글이 섞이지 않게, 지금 지도의 .cartouche-head 와 같다) */}
        <div className="pixel-head-row">
          <h1>
            {t.title} <span className="pixel-badge">{t.badge}</span>
          </h1>
          {/* 접으면 켠 시점만 제목 옆에 (무엇을 보는지는 접어도 남는다) */}
          {headFolded && time !== null && <span className="pixel-folded-state">{pixelTimes.times.find((x) => x.t === time)?.button}</span>}
          <button
            type="button"
            className="pixel-fold"
            aria-expanded={!headFolded}
            aria-label={headFolded ? t.unfold : t.fold}
            title={headFolded ? t.unfold : t.fold}
            onClick={toggleHead}
          >
            <svg viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden="true">
              <path d="M3 1h1v1h1v1h1v1h1v1H6V4H5V3H4V2H3v1H2v1H1v1H0V4h1V3h1V2h1z" fill="currentColor" />
            </svg>
          </button>
        </div>
        <Choice label={t.palette} value={sandbox.palette} options={(['a', 'b', 'c'] as PaletteId[]).map((id) => [id, PALETTES[id].name[lang]])} onPick={(v) => pick('palette', v)} />
        <Choice label={t.size} value={sandbox.size} options={PIXEL_SIZES.map((s) => [s, `${s}×`])} onPick={(v) => pick('size', v)} />
        <Choice label={t.shore} value={sandbox.shore} options={(['dither', 'band', 'none'] as ShoreStyle[]).map((s) => [s, t.shores[s]])} onPick={(v) => pick('shore', v)} />
        {/* 시점 (S6) — 지금 지도의 헤더 '시점' 무리와 같은 단추 (단추 글은 해, 설명은 그 시점의 이름과 해). 켠 단추를 다시 누르면 끈다 */}
        <div className="pixel-choice is-time" role="group" aria-label={t.timeline}>
          <span className="pixel-choice-label" aria-hidden="true">
            {t.timeline}
            {time !== null && ` · ${(() => {
              const e = pixelTimes.times.find((x) => x.t === time)
              return e ? (lang === 'ko' ? e.name : e.nameEn) : ''
            })()}`}
          </span>
          <div className="pixel-choice-row">
            {pixelTimes.times.map((e) => {
              const name = `${lang === 'ko' ? e.name : e.nameEn} (${e.years})`
              const on = e.t === time
              return (
                <button key={e.t} type="button" aria-pressed={on} aria-label={name} title={on ? t.timeOff(name) : name} onClick={() => changeTime(on ? null : e.t)}>
                  {e.button}
                </button>
              )
            })}
          </div>
        </div>
        <a ref={linkRef} className="pixel-link" href="./">
          {t.main}
        </a>
      </header>

      <div className="pixel-zoom">
        {/* 단계 글이 단추 앞 — 글 폭이 바뀌어도 오른쪽에 붙은 단추는 움직이지 않는다 (빠르게 두 번 누르다 ⌂ 를 누르지 않게) */}
        <span className="pixel-level">{t.level(LEVELS[uiLevel])}</span>
        <button type="button" onClick={() => zoomAt(1)} disabled={uiLevel === LEVELS.length - 1} aria-label={t.zoomIn}>
          +
        </button>
        <button type="button" onClick={() => zoomAt(-1)} disabled={uiLevel === 0} aria-label={t.zoomOut}>
          −
        </button>
        <button type="button" onClick={reset} aria-label={t.reset}>
          {/* 집 — 픽셀 글꼴에 ⌂ 가 없어 7×7 픽셀로 */}
          <svg className="pixel-home" viewBox="0 0 7 7" width={14} height={14} shapeRendering="crispEdges" aria-hidden="true">
            <path d="M3 0h1v1h1v1h1v1h1v1H6v3H4V5H3v2H1V4H0V3h1V2h1V1h1z" fill="currentColor" />
          </svg>
        </button>
      </div>

      <Legend
        lang={lang}
        pal={pal}
        time={time}
        periodKeys={levelInfo?.legend ?? []}
        dict={lang === 'en' ? dict : null}
        open={legendOpen}
        onOpenChange={setLegendOpen}
      />

      <p ref={statusRef} className="pixel-drawing" role="status" hidden>
        {t.drawing}
      </p>

      {shown && panelOpen && (
        <Panel
          lang={lang}
          data={panel.data}
          dict={lang === 'en' ? panel.dict : null}
          selection={shown}
          period={panelPeriod}
          time={time}
          phaseCard={phaseCard}
          phaseStub={phaseStub}
          phasePlaceCardsAt={phasePlaceCardsAt}
          phaseCardsAt={phaseCardsAt}
          onCloser={onCloser}
          onSelect={onPanelPick}
          onClose={() => {
            select(null)
            stageRef.current?.focus()
          }}
        />
      )}
    </div>
  )
}

function Choice<V extends string | number>(props: { label: string; value: V; options: [V, string][]; onPick: (v: V) => void }) {
  return (
    <div className="pixel-choice" role="group" aria-label={props.label}>
      <span className="pixel-choice-label" aria-hidden="true">
        {props.label}
      </span>
      <div className="pixel-choice-row">
        {props.options.map(([v, name]) => (
          <button key={String(v)} type="button" aria-pressed={v === props.value} onClick={() => props.onPick(v)}>
            {name}
          </button>
        ))}
      </div>
    </div>
  )
}
