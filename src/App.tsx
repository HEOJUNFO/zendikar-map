import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Legend } from './components/Legend'
import { MapControls } from './components/MapControls'
import { PlacePanel } from './components/PlacePanel'
import {
  cardPlaceIds,
  continentAt,
  continents,
  ERA_NOTE,
  PHASE1_NOTE,
  hasPin,
  hedrons,
  LAND_CARDS,
  locations,
  placeCards,
  placeMark,
  landmarkGlyphs,
  landscapeOfContinent,
  landscapeOfPlace,
  rivers,
  seaMarks,
  terrainAreas,
  terrainLines,
  type LandCard,
  type PhaseCard,
} from './data'
import { isPlaced, type Location, type Point } from './data/types'
import { landmassById, MAP_HEIGHT, MAP_WIDTH } from './map/geo'
import { ringBounds, type Bounds } from './map/geometry'
import { NO_COVER, readInitialView, useMapZoom, type Cover, type ScreenRect } from './map/useMapZoom'
import type { PhaseData } from './data/phase'
import type { ChildMapArt } from './map/childMapArt'
import { ChildMapView, type ChildMapHandle } from './map/ChildMapView'
import type { FigureArt } from './map/figures'
import { terrainLegendKeys } from './map/landscapeGlyphs'
import { displayName } from './map/names'
import { ZendikarMap, type LabelLang, type MapLandscape, type Selection } from './map/ZendikarMap'
import './App.css'

/**
 * 지도를 가리는 패널·시트·머리말 — 보이는 영역 가운데를 잡을 때 비켜 준다.
 * offset* 은 레이아웃 상자라 패널이 미끄러져 들어오는 애니메이션 중에도 최종 자리를 준다.
 */
function measureCover(
  map: Element | null,
  panel: HTMLElement | null,
  cartouche: HTMLElement | null,
  controls: HTMLElement | null,
): Cover {
  const r = map?.getBoundingClientRect()
  const w = r?.width || window.innerWidth
  const h = r?.height || window.innerHeight
  const c = { ...NO_COVER }
  const sheet = Boolean(panel && panel.offsetWidth > w * 0.8)
  if (panel) {
    // 화면 폭을 다 쓰면 아래쪽 시트(휴대폰), 아니면 오른쪽 패널
    if (sheet) c.bottom = h - panel.offsetTop
    else c.right = w - panel.offsetLeft
  }
  // 왼쪽 아래 표기·범례 단추 줄 — 낮은 가로 화면에서 대륙 전체를 맞출 때 그 밑에 장소가 깔리지 않게.
  // (세로로 긴 확대 버튼 기둥은 폭이 좁아 빼고, 한 점이 그 밑에 들면 ensureVisible 의 obstacles 가 잡는다.)
  const row = controls?.querySelector<HTMLElement>('.lang-toggle')
  if (row && !sheet && controls) c.bottom = Math.max(c.bottom, h - (controls.offsetTop + row.offsetTop) + 8)
  if (cartouche) {
    const x1 = cartouche.offsetLeft + cartouche.offsetWidth
    const y1 = cartouche.offsetTop + cartouche.offsetHeight
    const freeW = w - c.right
    if (cartouche.offsetWidth > freeW * 0.6) {
      // 보이는 폭을 거의 다 덮는 머리말은 위쪽 띠로 본다
      c.top = y1
    } else if (freeW / 2 < x1 + 24 && (h - c.bottom) / 2 < y1 + 24) {
      // 보이는 영역 가운데가 머리말 밑이면 머리말 오른쪽과 아래 가운데 넓은 쪽으로 비킨다
      const rightArea = Math.max(0, freeW - x1) * (h - c.bottom)
      const belowArea = freeW * Math.max(0, h - c.bottom - y1)
      if (rightArea > belowArea) c.left = x1
      else c.top = y1
    }
  }
  return c
}

/** #장소id, #continent/대륙id, #card/카드id — 공유한 링크로 바로 그 장소(카드)를 연다 */
function readHash(): Selection | null {
  let h: string
  try {
    h = decodeURIComponent(window.location.hash.slice(1))
  } catch {
    return null
  }
  if (!h) return null
  if (h.startsWith('continent/')) return { type: 'continent', id: h.slice('continent/'.length) }
  if (h.startsWith('card/')) return { type: 'card', id: h.slice('card/'.length) }
  return { type: 'location', id: h }
}

function writeHash(s: Selection | null) {
  const next = !s ? '' : s.type === 'location' ? `#${s.id}` : `#${s.type}/${s.id}`
  if (window.location.hash === next) return
  window.history.replaceState(null, '', next || window.location.pathname + window.location.search)
}

/** 지도에 따로 표시가 있는 카드 — 지도에 있는 장소와 하나인 카드는 그 장소 표시를 같이 쓴다 */
const PINNED_CARDS = LAND_CARDS.filter(hasPin)
/** 따로 나오는 카드 — 장소와 하나인 카드는 그 장소 패널에 실린다 */
const OWN_CARDS = LAND_CARDS.filter((c) => !cardPlaceIds.has(c.id))
/** 지도에 표시가 있는 장소 — 자리가 없어도 그 장소와 하나인 카드의 표시가 있으면 */
const onMap = (l: Location) => placeMark(l) !== null
const NO_FIGURES: PhaseCard[] = []
const NO_PLACES: ReadonlySet<string> = new Set()
/** 페이즈1 데이터(카드 설명·근거 글이 길다)는 첫 화면에 필요 없어 따로 불러온다 — 한 번만 */
let phaseLoad: Promise<PhaseData> | null = null
const loadPhase = () => (phaseLoad ??= import('./data/phase').then((m) => m.PHASE))
/** 자식 지도 그림 — 지도마다 따로 나뉜 파일을 연 지도만 불러온다 (scripts/childmaps/to_ts.mjs 가 만든다) */
const CHILD_ART_FILES = import.meta.glob<{ default: ChildMapArt }>('./map/childmaps/*.ts')
const inBox = (b: Bounds, [x, y]: Point) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1
/** 범위 안의 지점 장소 — 자식 지도에 세계 지도와 같은 기호로 */
const placesIn = (b: Bounds) => locations.filter(isPlaced).filter((l) => l.kind !== 'region' && l.kind !== 'water' && inBox(b, l.position))
/** 바탕 지형 (src/data/landscape) — 지도에 한 번 만들어 넘긴다 */
const LANDSCAPE: MapLandscape = { areas: terrainAreas, rivers, lines: terrainLines, glyphs: landmarkGlyphs, sea: seaMarks }
/** 범례의 '지형' 줄 — 지도에 실제로 그린 특별한 기호만 */
const TERRAIN_KEYS = terrainLegendKeys(LANDSCAPE)

/**
 * 고른 뒤 카메라를 어떻게 옮길지.
 * focus: 그곳을 보이는 영역 가운데에 맞춘다 (검색·목록·링크)
 * reveal: 지도에서 직접 누른 곳 — 패널에 가려질 때만 배율을 그대로 두고 옮긴다
 */
type Move = 'focus' | 'reveal'

function App() {
  // 지도 크기가 바뀐 뒤(배율을 다시 잰 뒤) 할 일 — 아래에서 채운다
  // 화면 크기가 바뀔 때 useMapZoom 이 부르는 것 — 아래에서 최신 값으로 채운다
  const resizeHooks = useRef<{ cover: () => Cover; reveal: (c: Cover) => void }>({ cover: () => NO_COVER, reveal: () => {} })
  const zoom = useMapZoom(readInitialView(window.location.search), {
    measureCover: () => resizeHooks.current.cover(),
    onResize: (c) => resizeHooks.current.reveal(c),
  })
  const [selection, setSelection] = useState<Selection | null>(null)
  const [lang, setLang] = useState<LabelLang>(() =>
    new URLSearchParams(window.location.search).get('lang') === 'ko' ? 'ko' : 'en',
  )
  // 페이즈1 — ZEN 미식 레어·레어·언커먼·커먼 카드의 대상을 지도에 그려 넣는다. 주소의 ?phase=1 로 공유한다
  const [phase, setPhase] = useState(() => new URLSearchParams(window.location.search).get('phase') === '1')
  // 페이즈 그림 모양(250KB 남짓)은 페이즈를 처음 켤 때 따로 불러온다
  const [figureArt, setFigureArt] = useState<Record<string, FigureArt> | null>(null)
  useEffect(() => {
    if (!phase || figureArt) return
    let live = true
    import('./map/figures')
      .then((m) => {
        // 그림 없이 카드만 있으면 지도에 아무것도 그려지지 않는다 — 개발 중에 바로 드러나게
        if (import.meta.env.DEV)
          void loadPhase().then((d) => {
            for (const c of d.cards) if (!m.FIGURE_ART[c.id]) console.error(`figures.ts: '${c.id}' 그림이 없다`)
          })
        if (live) setFigureArt(m.FIGURE_ART)
      })
      .catch((e) => console.error('페이즈 그림을 불러오지 못했다', e))
    return () => {
      live = false
    }
  }, [phase, figureArt])
  // 연 자식 지도 — 따로 그린 지역 지도가 세계 지도 자리에 열린다. 주소의 ?child=<id> 로 공유한다 (페이즈1 에서만).
  // 주소의 id 가 정말 자식 지도인지는 페이즈1 데이터가 온 뒤에 가린다 (receivePhase)
  const [childMap, setChildMap] = useState<string | null>(() => {
    const q = new URLSearchParams(window.location.search)
    const id = q.get('child')
    return q.get('phase') === '1' && id ? id : null
  })
  // 페이즈1 카드·자식 지도 데이터 — 페이즈를 켜거나, 모르는 카드 주소가 들어오면 불러온다
  const [phaseData, setPhaseData] = useState<PhaseData | null>(null)
  /** 페이즈1 데이터가 왔다 — 주소(?child=)로 연 자식 지도가 정말 자식 지도인지 이제 가린다 */
  const receivePhase = useCallback((d: PhaseData) => {
    setPhaseData(d)
    setChildMap((cur) => (cur && !d.childMaps.has(cur) ? null : cur))
  }, [])
  useEffect(() => {
    if (!phase || phaseData) return
    let live = true
    loadPhase()
      .then((d) => live && receivePhase(d))
      .catch((e) => console.error('페이즈1 데이터를 불러오지 못했다', e))
    return () => {
      live = false
    }
  }, [phase, phaseData, receivePhase])
  const childRef = useRef<ChildMapHandle>(null)
  // 자식 지도 그림은 처음 열 때 따로 불러온다. 개발 중 ?childsrc=1 이면 원본(scripts/childmaps/art)을 바로 읽는다
  const [childArt, setChildArt] = useState<Record<string, ChildMapArt>>({})
  const fromSrc = import.meta.env.DEV && new URLSearchParams(window.location.search).has('childsrc')
  // 그림 파일이 있으면 페이즈1 데이터와 함께 바로 불러온다. 없는 id 는 페이즈1 데이터로 자식 지도인지 확인한 뒤에 (아니면 receivePhase 가 닫는다)
  const childArtReady = Boolean(
    childMap && (fromSrc || CHILD_ART_FILES[`./map/childmaps/${childMap}.ts`] || phaseData?.childMaps.has(childMap)),
  )
  useEffect(() => {
    if (!childMap || !childArtReady || childArt[childMap]) return
    let live = true
    const load = async (): Promise<Record<string, ChildMapArt>> => {
      if (fromSrc) {
        const w = window as unknown as { CHILDMAPS: ChildMapArt[] }
        w.CHILDMAPS = []
        const t = Date.now()
        await import(/* @vite-ignore */ `/scripts/childmaps/kit.js?t=${t}`)
        await import(/* @vite-ignore */ `/scripts/childmaps/art/${childMap}.js?t=${t}`)
        return Object.fromEntries(w.CHILDMAPS.map((m) => [m.id, m]))
      }
      const file = CHILD_ART_FILES[`./map/childmaps/${childMap}.ts`]
      if (!file) throw new Error(`자식 지도 '${childMap}' 그림 파일이 없다`)
      const art = (await file()).default
      return { [art.id]: art }
    }
    load()
      .then((art) => {
        if (import.meta.env.DEV && !art[childMap]) console.error(`src/map/childmaps: 자식 지도 '${childMap}' 그림이 없다`)
        if (live) setChildArt((cur) => ({ ...cur, ...art }))
      })
      .catch((e) => {
        // 그림을 못 불러오면 세계 지도에 남는다 — 머리말에 '세계 지도로'만 남은 채로 두지 않게
        console.error('자식 지도를 불러오지 못했다', e)
        if (live) setChildMap(null)
      })
    return () => {
      live = false
    }
  }, [childMap, childArt, childArtReady, fromSrc])
  useEffect(() => {
    // 다른 값(?view=x,y,k 등)은 적힌 그대로 둔다 — URLSearchParams 로 다시 쓰면 쉼표가 %2C 로 바뀐다
    const keep = window.location.search
      .slice(1)
      .split('&')
      .filter((p) => p && !/^(phase|child)=/.test(p))
    if (phase) keep.push('phase=1')
    if (phase && childMap) keep.push(`child=${encodeURIComponent(childMap)}`)
    const search = keep.length ? `?${keep.join('&')}` : ''
    if (search !== window.location.search) window.history.replaceState(null, '', window.location.pathname + search + window.location.hash)
  }, [phase, childMap])
  const appRef = useRef<HTMLDivElement>(null)
  const cartoucheRef = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const phaseRef = useRef<HTMLButtonElement>(null)
  /** 패널을 연 요소 — 패널을 닫으면 초점을 돌려준다 */
  const openerRef = useRef<Element | null>(null)
  /** 다음 렌더 뒤, 패널 크기를 잴 수 있을 때 할 카메라 이동 — at: 장소 대신 보여 줄 지점 (지도에서 누른 카드 표시) */
  const pendingMove = useRef<{ move: Move; at?: Point } | null>(null)

  const continentById = useMemo(() => new Map(continents.map((c) => [c.id, c])), [])
  const locationById = useMemo(() => new Map(locations.map((l) => [l.id, l])), [])
  const cardById = useMemo(
    () => new Map<string, LandCard | PhaseCard>([...LAND_CARDS, ...(phaseData?.cards ?? [])].map((c) => [c.id, c])),
    [phaseData],
  )
  /** 페이즈1 데이터가 오기 전에 고른 모르는 카드 — 데이터가 오면 다시 고른다 */
  const pendingSelect = useRef<{ picked: Selection; move: Move; at?: Point } | null>(null)
  const continentOf = useCallback((id: string | null) => (id ? continentById.get(id as never) ?? null : null), [continentById])

  const { svgRef, focusOn, focusBounds, ensureVisible, setCover, settle } = zoom
  const cover = useCallback(
    () => measureCover(svgRef.current, panelRef.current, cartoucheRef.current, appRef.current?.querySelector('.controls') ?? null),
    [svgRef],
  )

  /** 지도 위에 떠 있는 상자들 — 이 밑에 들어간 곳은 화면 안이어도 보이지 않는 것으로 친다 */
  const obstacles = useCallback((): ScreenRect[] => {
    const svg = svgRef.current
    const app = appRef.current
    if (!svg || !app) return []
    const o = svg.getBoundingClientRect()
    return [...app.querySelectorAll('.cartouche, .panel, .controls > *, .legend[open] .legend-body')].map((el) => {
      const r = el.getBoundingClientRect()
      return { left: r.left - o.left, top: r.top - o.top, right: r.right - o.left, bottom: r.bottom - o.top }
    })
  }, [svgRef])

  /**
   * 대륙이 차지하는 범위 — 딸린 섬(온두의 Agadeem·Beyeen·Jwar)까지 넣고,
   * 한 덩어리를 나눠 쓰는 대륙(굴 드라즈·발라 게드)은 제 몫만.
   */
  const continentBounds = useCallback(
    (id: string): Bounds | null => {
      const c = continentById.get(id as never)
      const land = c && landmassById.get(c.landmass)
      if (!c || !land) return null
      let b = land.bounds
      if (c.area) {
        const a = ringBounds(c.area)
        b = { x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) }
      }
      for (const isle of c.islands ?? []) {
        const i = landmassById.get(isle)?.bounds
        if (i) b = { x0: Math.min(b.x0, i.x0), y0: Math.min(b.y0, i.y0), x1: Math.max(b.x1, i.x1), y1: Math.max(b.y1, i.y1) }
      }
      return b
    },
    [continentById],
  )

  const select = useCallback(
    (picked: Selection | null, move: Move = 'focus', at?: Point) => {
      // 장소와 하나인 카드는 그 장소로 연다 (#card/eye-of-ugin → #eye-of-ugin)
      const placeId = picked?.type === 'card' ? cardPlaceIds.get(picked.id) : undefined
      pendingSelect.current = null
      // 모르는 카드는 페이즈1 카드일 수 있다 — 페이즈1 데이터를 불러온 뒤에 다시 고른다 (공유 링크 #card/카드id)
      if (picked?.type === 'card' && !placeId && !cardById.has(picked.id) && !phaseData) {
        pendingSelect.current = { picked, move, at }
        loadPhase()
          .then(receivePhase)
          .catch((e) => console.error('페이즈1 데이터를 불러오지 못했다', e))
        return
      }
      const s: Selection | null = placeId ? { type: 'location', id: placeId } : picked
      const exists = (x: Selection) =>
        x.type === 'location' ? locationById.has(x.id) : x.type === 'card' ? cardById.has(x.id) : continentById.has(x.id as never)
      const valid = s && exists(s) ? s : null
      if (valid) {
        // 패널 안에서 다른 곳으로 옮겨 가는 경우가 아니면, 지금 초점이 있는 곳이 패널을 연 곳이다
        const active = document.activeElement
        if (active && active !== document.body && !panelRef.current?.contains(active)) openerRef.current = active
      }
      pendingMove.current = { move, at }
      // 페이즈1 카드를 열면(공유 링크 포함) 그 그림이 보이게 페이즈를 켜고, 작은 대상이면 그 자식 지도를 연다
      if (valid?.type === 'card' && phaseData?.ids.has(valid.id)) setPhase(true)
      const child = valid?.type === 'card' ? phaseData?.childOf(valid.id) : undefined
      setChildMap((cur) => {
        if (child) return child
        // 연 자식 지도 밖의 곳을 고르면 세계 지도로 돌아간다 — 그 지도 안의 장소·카드 표시는 자식 지도에서 그대로 본다
        const open = cur ? phaseData?.childMaps.get(cur) : undefined
        if (!open || !valid) return cur
        const card = valid.type === 'card' ? cardById.get(valid.id) : undefined
        const place = valid.type === 'location' ? locationById.get(valid.id) : undefined
        // 그 지도의 장소 자신, 또는 지도 위 표시(장소 자리, 자리 없는 장소는 그와 하나인 카드 표시)가 범위 안이면 그대로 본다
        const mark = place ? placeMark(place) : card && !('typeLine' in card) ? card.at ?? null : null
        const here = place?.id === open.place || (mark !== null && inBox(open.bounds, mark))
        return here ? cur : null
      })
      setSelection(valid)
      writeHash(valid)
    },
    [locationById, continentById, cardById, phaseData, receivePhase],
  )
  useEffect(() => {
    const p = pendingSelect.current
    if (phaseData && p) select(p.picked, p.move, p.at)
  }, [phaseData, select])

  /** 고른 곳으로 카메라를 옮긴다 — c 는 지금 패널·머리말이 가리는 폭 */
  const moveCamera = useCallback(
    (s: Selection, move: Move, c: Cover, at?: Point) => {
      // 카드는 지도 위 카드 표시 자리를 보인다
      const card = s.type === 'card' ? cardById.get(s.id) : undefined
      if (card) at = at ?? card.at
      // 장소 대신 보여 줄 지점이 있으면 그 지점을 보인다
      if (at) {
        if (move === 'reveal') ensureVisible(at[0], at[1], c, 48, obstacles())
        else {
          // 페이즈 그림은 작은 것도 알아볼 만큼(가장 긴 변 64px) 들어간다
          const r = svgRef.current?.getBoundingClientRect()
          const fit = r ? Math.min(r.width / MAP_WIDTH, r.height / MAP_HEIGHT) : 1
          focusOn(at[0], at[1], card && 'size' in card ? Math.max(3, 64 / (card.size * fit)) : 3, c)
        }
        return
      }
      const l = s.type === 'location' ? locationById.get(s.id) : undefined
      // 자리가 없는 장소라도 그 장소와 하나인 카드의 표시가 있으면 그 표시를 보인다
      const mark = l && !isPlaced(l) ? placeMark(l) : null
      if (mark) {
        if (move === 'reveal') ensureVisible(mark[0], mark[1], c, 48, obstacles())
        else focusOn(mark[0], mark[1], 3, c)
        return
      }
      // 위치가 알려지지 않은 곳은 그 대륙을 보여 준다
      const continentId = s.type === 'continent' ? s.id : l && !isPlaced(l) ? l.continentId : null
      if (continentId) {
        const b = continentBounds(continentId)
        if (!b) return
        if (move === 'reveal') ensureVisible((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, c, 40, obstacles())
        else focusBounds(b, c)
        return
      }
      if (!l || !isPlaced(l)) return
      const [x, y] = l.position
      const isArea = l.kind === 'region' || l.kind === 'water'
      if (move === 'reveal') ensureVisible(x, y, c, 48, obstacles())
      else if (isArea && l.extent) {
        const [rx, ry] = l.extent
        focusBounds({ x0: x - rx, y0: y - ry, x1: x + rx, y1: y + ry }, c, 5)
      } else focusOn(x, y, isArea ? 2.2 : 3, c)
    },
    [locationById, cardById, continentBounds, ensureVisible, focusBounds, focusOn, obstacles, svgRef],
  )

  // 패널이 그려진 뒤에 그 크기만큼 비켜서 카메라를 옮긴다
  useLayoutEffect(() => {
    const pending = pendingMove.current
    pendingMove.current = null
    const c = cover()
    setCover(c)
    if (!pending) return
    if (!selection) {
      // 패널이 닫혀 이동 범위가 좁아졌다 — 자식 지도가 열려 있으면 자식 지도만 (숨은 세계 지도는 돌아올 때 맞춘다)
      if (childMap) childRef.current?.settle()
      else settle()
      return
    }
    // 자식 지도가 열려 있으면 자식 지도 안에서 고른 것 — 뒤에 숨은 세계 지도의 시점은 그대로 두고 자식 지도를 옮긴다
    if (childMap) {
      childRef.current?.reveal()
      return
    }
    moveCamera(selection, pending.move, c, pending.at)
  }, [selection, childMap, cover, setCover, settle, moveCamera])

  const openChildMap = useCallback((id: string) => setChildMap(id), [])

  // 세계 지도로 — 자식 지도 안의 작은 대상 패널도 닫는다. 세계 지도는 열기 전 시점 그대로 있다
  const closeChildMap = useCallback(() => {
    if (!childMap) return
    if (selection?.type === 'card' && phaseData?.childOf(selection.id) === childMap) select(null)
    setChildMap(null)
  }, [childMap, selection, select, phaseData])

  // 자식 지도를 닫으면 초점을 연 곳으로 — 그 장소 패널이 열려 있으면 '지역 지도 보기' 단추, 아니면 페이즈 단추
  // (사라진 '세계 지도로' 단추나 자식 지도에 초점이 남지 않게)
  // 돌아온 세계 지도는 지금 패널이 가리는 폭에 맞추고, 고른 곳이 그 밑이면 비켜 보인다
  const lastChild = useRef(childMap)
  useEffect(() => {
    const was = lastChild.current
    lastChild.current = childMap
    if (!was || childMap) return
    const c = cover()
    setCover(c)
    settle()
    if (selection) moveCamera(selection, 'reveal', c)
    const active = document.activeElement
    if (active && active !== document.body && active.isConnected && !active.closest('.child-map')) return
    const opener = panelRef.current?.querySelector<HTMLButtonElement>('.open-child')
    ;(opener ?? phaseRef.current)?.focus({ preventScroll: true })
  }, [childMap, selection, cover, setCover, settle, moveCamera])

  // 패널이 없을 때 Esc 는 자식 지도를 닫는다 (패널이 열려 있으면 패널이 먼저 닫힌다)
  useEffect(() => {
    if (!childMap) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !e.defaultPrevented && !selection && closeChildMap()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [childMap, selection, closeChildMap])

  // 화면을 돌리거나 창 크기를 바꾸면 패널·머리말이 가리는 폭이 바뀌고, 고른 곳이 가려질 수 있다
  useEffect(() => {
    resizeHooks.current = {
      cover,
      // 자식 지도가 열려 있으면 자식 지도가 제 크기를 다시 잰 뒤 스스로 다시 보인다
      reveal: (c) => {
        if (selection && !childMap) moveCamera(selection, 'reveal', c)
      },
    }
  })

  // 공유 링크로 들어온 경우 — 지도 크기를 잰 뒤에 이동한다
  // 처음 한 번만 — select 는 페이즈1 데이터가 오면 새로 만들어져 이 효과가 다시 돈다
  const hashOpened = useRef(false)
  useEffect(() => {
    const initial = readHash()
    if (!initial || hashOpened.current) return
    const id = requestAnimationFrame(() => {
      hashOpened.current = true
      select(initial)
    })
    return () => cancelAnimationFrame(id)
  }, [select])

  // 주소창에서 #을 고치거나 뒤로·앞으로 가기 — 해시와 함께 ?phase·?child 도 다시 읽는다
  // (replaceState 는 이 사건을 내지 않아 되먹임이 없다)
  useEffect(() => {
    const onNav = () => {
      const q = new URLSearchParams(window.location.search)
      const on = q.get('phase') === '1'
      const id = q.get('child')
      setPhase(on)
      // 페이즈1 데이터가 아직 없으면 데이터가 온 뒤에 가린다 (receivePhase)
      setChildMap(on && id && (!phaseData || phaseData.childMaps.has(id)) ? id : null)
      select(readHash())
    }
    window.addEventListener('popstate', onNav)
    return () => window.removeEventListener('popstate', onNav)
  }, [select, phaseData])

  const closePanel = useCallback(() => {
    const opener = openerRef.current
    openerRef.current = null
    select(null)
    if (opener instanceof HTMLElement || opener instanceof SVGElement) {
      // 숨은 세계 지도(visibility:hidden)의 마커는 초점을 받지 못한다
      if (opener.isConnected && opener.checkVisibility({ visibilityProperty: true })) return opener.focus({ preventScroll: true })
    }
    // 돌려줄 곳이 없으면 지금 보이는 지도로 — 자식 지도가 열려 있으면 자식 지도
    if (childRef.current) childRef.current.focus()
    else phaseRef.current?.focus({ preventScroll: true })
  }, [select])

  // 페이즈를 끄면 열려 있던 페이즈1 카드 패널과 자식 지도도 닫는다
  const togglePhase = useCallback(() => {
    if (phase) {
      if (selection?.type === 'card' && phaseData?.ids.has(selection.id)) select(null)
      setChildMap(null)
    }
    setPhase(!phase)
  }, [phase, selection, select, phaseData])
  // 연 자식 지도의 이름·해석 안내, 그림까지 불러와 화면에 띄운 자식 지도
  const childInfo = childMap ? phaseData?.childMaps.get(childMap) ?? null : null
  const openChild = childInfo && childArt[childInfo.id] ? childInfo : null
  // 자식 지도 머리말 접기 — 접으면 지도와 지역 이름만 남아 지도를 덜 가린다. 다른 자식 지도로 가도 그대로 둔다
  const [headerFolded, setHeaderFolded] = useState(false)
  const folded = headerFolded && childInfo !== null

  const selectedLocation = selection?.type === 'location' ? locationById.get(selection.id) ?? null : null
  const selectedContinent = selection?.type === 'continent' ? continentById.get(selection.id as never) ?? null : null
  const selectedCard = selection?.type === 'card' ? cardById.get(selection.id) ?? null : null
  const continentPlaces = useMemo(
    () =>
      selectedContinent
        ? locations
            .filter((l) => l.continentId === selectedContinent.id)
            .sort((a, b) => b.prominence - a.prominence || a.name.localeCompare(b.name))
        : [],
    [selectedContinent],
  )
  // 지도에 카드 표시는 있지만 '이 대륙의 장소'에 장소로 오르지 않는 카드 — 대륙에 이은 카드, 자리를 모르는 장소에 이은 카드.
  // 장소와 하나인 카드는 그 장소가 목록에 오른다.
  const continentCards = useMemo(
    () =>
      selectedContinent
        ? OWN_CARDS.filter((c) => {
            if (c.depicts.type === 'continent') return c.depicts.id === selectedContinent.id
            const place = locationById.get(c.depicts.id)
            return place?.continentId === selectedContinent.id && !isPlaced(place)
          }).sort((a, b) => a.name.localeCompare(b.name))
        : [],
    [selectedContinent, locationById],
  )

  return (
    <div className={openChild ? 'app in-child' : 'app'} ref={appRef}>
      {/* 머리말이 DOM 에서 먼저 — 키보드는 지도 마커보다 제목·페이즈 버튼에 먼저 닿는다 */}
      <header className={folded ? 'cartouche is-folded' : 'cartouche'} ref={cartoucheRef}>
        <h1>Zendikar</h1>
        {childInfo && (
          <button
            type="button"
            className="cartouche-fold"
            aria-expanded={!folded}
            aria-label={folded ? '머리말 펼치기' : '머리말 접기'}
            title={folded ? '펼치기' : '접기'}
            onClick={() => setHeaderFolded(!folded)}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d={folded ? 'M3.5 6 8 10.5 12.5 6' : 'M3.5 10 8 5.5 12.5 10'} />
            </svg>
          </button>
        )}
        {/* 자식 지도의 제목 — 머리말이 지도의 제목 상자다 */}
        {childInfo && (
          <div className="child-heading">
            <p className={`child-name${lang === 'ko' && childInfo.nameKo ? ' is-ko' : ''}`}>{displayName(childInfo, lang)}</p>
            {childInfo.note && !folded && <p className="child-note">{childInfo.note}</p>}
          </div>
        )}
        <div className="phase-row" hidden={folded}>
          <button type="button" className="phase-button" ref={phaseRef} aria-pressed={phase} onClick={togglePhase}>
            페이즈1
          </button>
          {childMap && (
            <button type="button" className="phase-button child-exit" onClick={closeChildMap}>
              세계 지도로
            </button>
          )}
        </div>
      </header>

      <ZendikarMap
        continents={continents}
        locations={locations}
        hedrons={hedrons}
        landscape={LANDSCAPE}
        continentAt={continentAt}
        selection={selection}
        highlightContinentId={selectedLocation && !placeMark(selectedLocation) ? selectedLocation.continentId : null}
        onSelect={(s) => select(s, 'reveal')}
        cards={PINNED_CARDS}
        cardPlaceIds={cardPlaceIds}
        onSelectCard={(card) => select({ type: 'card', id: card.id }, 'reveal')}
        figures={phase && phaseData ? phaseData.worldFigures : NO_FIGURES}
        figureArt={figureArt}
        onSelectFigure={(id) => select({ type: 'card', id }, 'reveal')}
        childMapPlaces={phase && phaseData ? phaseData.childMapPlaces : NO_PLACES}
        onFocusPoint={(x, y) => ensureVisible(x, y, cover(), 40, obstacles())}
        lang={lang}
        view={zoom.view}
        svgRef={zoom.svgRef}
        layerRef={zoom.layerRef}
      />

      {/* 자식 지도 — 세계 지도 자리에 따로 그린 지역 지도가 열린다. 세계 지도는 뒤에 그대로 있어 돌아오면 보던 자리다 */}
      {openChild && (
        <ChildMapView
          key={openChild.id}
          ref={childRef}
          map={openChild}
          art={childArt[openChild.id]}
          figureArt={figureArt}
          subjects={phaseData?.subjectsOf(openChild.id) ?? NO_FIGURES}
          places={placesIn(openChild.bounds)}
          cards={PINNED_CARDS.filter((c) => inBox(openChild.bounds, c.at))}
          cardNamed={(c) => {
            const placeId = cardPlaceIds.get(c.id)
            return (placeId && locationById.get(placeId)) || c
          }}
          selectedCardId={
            // 자리 없는 장소를 고르면 그와 하나인 카드 표시가 그 장소의 표시다 (Teetering Peaks)
            selection?.type === 'card'
              ? selection.id
              : selectedLocation && !isPlaced(selectedLocation)
                ? placeCards.get(selectedLocation.id)?.id ?? null
                : null
          }
          selectedPlaceId={selection?.type === 'location' ? selection.id : null}
          lang={lang}
          cover={cover}
          obstacles={obstacles}
          header={() => {
            const h = cartoucheRef.current?.getBoundingClientRect()
            const o = svgRef.current?.getBoundingClientRect()
            return h && o ? { left: h.left - o.left, top: h.top - o.top, right: h.right - o.left, bottom: h.bottom - o.top } : null
          }}
          onSelectCard={(id) => select({ type: 'card', id }, 'reveal')}
          onSelectPlace={(id) => select({ type: 'location', id }, 'reveal')}
          onClear={() => select(null)}
        />
      )}

      <MapControls
        onZoomIn={() => (openChild ? childRef.current?.zoomBy(1.6) : zoom.zoomBy(1.6))}
        onZoomOut={() => (openChild ? childRef.current?.zoomBy(1 / 1.6) : zoom.zoomBy(1 / 1.6))}
        onReset={() => (openChild ? childRef.current?.reset() : zoom.reset())}
        lang={lang}
        onLangChange={setLang}
      >
        <Legend era={ERA_NOTE} phaseNote={phase ? PHASE1_NOTE : null} childMaps={phase} terrain={TERRAIN_KEYS} />
      </MapControls>

      <PlacePanel
        panelRef={panelRef}
        location={selectedLocation}
        continent={selectedContinent}
        continentPlaces={continentPlaces}
        continentCards={continentCards}
        continentOf={continentOf}
        card={selectedCard}
        placeCard={selectedLocation ? placeCards.get(selectedLocation.id) ?? null : null}
        cardsHere={selectedLocation ? OWN_CARDS.filter((c) => c.depicts.type === 'location' && c.depicts.id === selectedLocation.id) : []}
        phaseCardsHere={
          // 그 장소를 그린 카드, 그리고 그 장소의 지역 지도에 그린 대상 (Tal Terig·Malakir 처럼 대상은 이웃 장소를 가리켜도)
          phase && phaseData && selectedLocation
            ? phaseData.cards.filter(
                (c) =>
                  (c.depicts.type === 'location' && c.depicts.id === selectedLocation.id) ||
                  (c.childMap !== undefined && phaseData.childMaps.get(c.childMap)?.place === selectedLocation.id),
              )
            : []
        }
        childMapHere={
          (phase && selectedLocation && !childMap && [...(phaseData?.childMaps.values() ?? [])].find((m) => m.place === selectedLocation.id)?.id) || null
        }
        onOpenChildMap={openChildMap}
        onMap={onMap}
        featuresHere={selectedLocation ? landscapeOfPlace(selectedLocation.id) : []}
        continentFeatures={selectedContinent ? landscapeOfContinent(selectedContinent.id) : []}
        locationOf={(id) => locationById.get(id) ?? null}
        onSelectCard={(id) => select({ type: 'card', id })}
        onSelectLocation={(id) => select({ type: 'location', id })}
        onSelectContinent={(id) => select({ type: 'continent', id })}
        onClose={closePanel}
      />
    </div>
  )
}

export default App
