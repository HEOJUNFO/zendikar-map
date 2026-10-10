import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Legend } from './components/Legend'
import { MapControls } from './components/MapControls'
import { PlacePanel } from './components/PlacePanel'
import {
  cardPlaceIds,
  CHILD_MAPS,
  continentAt,
  continents,
  ERA_NOTE,
  PHASE1_NOTE,
  PHASE2_NOTE,
  PHASE3_NOTE,
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
import { childDetails, detailPxPerUnit } from './map/childDetail'
import { loadFigureGroup, worldGroups } from './map/figures'
import { terrainLegendKeys } from './map/landscapeGlyphs'
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
/** 헤더의 페이즈 단추 — 페이즈 n 은 1..n 의 카드를 모두 그린다 (페이즈2 = 페이즈1 + WWK, 페이즈3 = 페이즈2 + ROE). 0 은 끔 */
const PHASES = [1, 2, 3] as const
/**
 * 페이즈 데이터(카드 설명·근거 글이 길다)는 첫 화면에 필요 없어 따로 불러온다 — 페이즈 1..level 의 카드를, level 마다 한 번만
 * (페이즈1만 켜면 페이즈2·3 카드의 글은 받지 않는다. 못 온 것은 다음에 다시 받는다)
 */
const phaseLoads = new Map<number, Promise<PhaseData>>()
function loadPhase(level: number): Promise<PhaseData> {
  let p = phaseLoads.get(level)
  if (!p) {
    // 카드 원본은 phase.ts 와 함께 받기 시작한다 — phase.ts 를 받은 뒤에야 부르면 한 번 더 이어 기다린다 (같은 모듈은 브라우저가 한 번만 받는다)
    p = Promise.all([
      import('./data/phase'),
      import('./data/phase1'),
      level >= 2 ? import('./data/phase2') : null,
      level >= 3 ? import('./data/phase3') : null,
    ]).then(([m]) => m.loadPhaseData(level))
    phaseLoads.set(level, p)
    p.catch(() => phaseLoads.delete(level))
  }
  return p
}
/** 모든 페이즈 — 모르는 카드 주소는 모든 페이즈의 카드에서 찾는다 */
const ALL_PHASES = PHASES[PHASES.length - 1]
type PhaseLevel = 0 | (typeof PHASES)[number]
const PHASE_NOTES: Record<PhaseLevel, string | null> = { 0: null, 1: PHASE1_NOTE, 2: PHASE2_NOTE, 3: PHASE3_NOTE }
/** 주소의 ?phase=1|2|3 */
function readPhase(search: string): PhaseLevel {
  const p = Number(new URLSearchParams(search).get('phase'))
  return PHASES.find((n) => n === p) ?? 0
}
/** 지역 상세(자식 지도였던 그림) — 깊이 확대하면 그 자리에 나온다. 그림은 지도가 그 지역에 닿을 때 불러온다 */
const CHILD_DETAILS = childDetails(CHILD_MAPS)
const detailById = new Map(CHILD_DETAILS.map((d) => [d.id, d]))
const detailOfPlace = new Map(CHILD_DETAILS.map((d) => [d.place, d]))

/**
 * 예전 주소 ?child=<id>(따로 열던 지역 지도) — 그 지역 상세가 보이는 시점(?view=)으로 바꿔 연다.
 * 지도가 화면을 다 채우므로 창 크기로 배율을 잡는다 (useMapZoom 의 fitScale 과 같은 셈)
 */
function migrateChildParam() {
  const q = new URLSearchParams(window.location.search)
  const d = detailById.get(q.get('child') ?? '')
  if (!q.has('child')) return
  const keep = window.location.search
    .slice(1)
    .split('&')
    .filter((p) => p && !p.startsWith('child='))
  if (d && !q.has('view')) {
    const fit = Math.min(window.innerWidth / MAP_WIDTH, window.innerHeight / MAP_HEIGHT) || 1
    const b = d.bounds
    const fill = Math.min(window.innerWidth / (b.x1 - b.x0), window.innerHeight / (b.y1 - b.y0)) * 0.82
    const k = Math.max(detailPxPerUnit(d), fill) / fit
    keep.push(`view=${((b.x0 + b.x1) / 2).toFixed(1)},${((b.y0 + b.y1) / 2).toFixed(1)},${k.toFixed(2)}`)
  }
  const search = keep.length ? `?${keep.join('&')}` : ''
  window.history.replaceState(null, '', window.location.pathname + search + window.location.hash)
}
migrateChildParam()
/** 바탕 지형 (src/data/landscape) — 지도에 한 번 만들어 넘긴다 */
const LANDSCAPE: MapLandscape = { areas: terrainAreas, rivers, lines: terrainLines, glyphs: landmarkGlyphs, sea: seaMarks }
/** 범례의 '지형' 줄 — 지도에 실제로 그린 특별한 기호만 */
const TERRAIN_KEYS = terrainLegendKeys(LANDSCAPE)

/**
 * 고른 뒤 카메라를 어떻게 옮길지.
 * focus: 그곳을 보이는 영역 가운데에 맞춘다 (검색·목록·링크)
 * reveal: 지도에서 직접 누른 곳 — 패널에 가려질 때만 배율을 그대로 두고 옮긴다
 * stay: 지도에서 누른 대륙 — 보던 자리에 그대로 둔다 (대륙 가운데로 끌려가지 않게)
 */
type Move = 'focus' | 'reveal' | 'stay'

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
  // 페이즈 — 페이즈1은 ZEN 미식 레어·레어·언커먼·커먼, 페이즈2는 거기에 WWK 미식 레어·레어·언커먼·커먼, 페이즈3은 또 거기에 ROE 미식 레어 카드의 대상을 지도에 그려 넣는다. 주소의 ?phase=1|2|3 으로 공유한다
  const [phase, setPhase] = useState<PhaseLevel>(() => readPhase(window.location.search))
  // 페이즈 카드 데이터 — 페이즈를 켜거나(그 페이즈까지), 모르는 카드 주소가 들어오면(모든 페이즈) 불러온다
  const [phaseData, setPhaseData] = useState<PhaseData | null>(null)
  // 늦게 온 낮은 페이즈의 데이터가 이미 받은 높은 페이즈의 데이터를 덮지 않게
  const receivePhase = useCallback((d: PhaseData) => setPhaseData((cur) => (cur && cur.level >= d.level ? cur : d)), [])
  useEffect(() => {
    if (!phase || (phaseData && phaseData.level >= phase)) return
    let live = true
    // 개관의 페이즈 그림도 함께 받기 시작한다 — 카드 데이터가 온 뒤에야 지도가 부르면 두 번 이어 기다린다 (지도는 받아 둔 것을 쓰고, 실패는 지도가 알린다)
    for (const g of worldGroups('world', phase)) loadFigureGroup(g).catch(() => {})
    loadPhase(phase)
      .then((d) => live && receivePhase(d))
      .catch((e) => {
        console.error('페이즈 데이터를 불러오지 못했다', e)
        // 높은 페이즈의 조각만 못 왔으면 앞 페이즈의 그림이라도 그린다 (받은 조각은 다시 받지 않는다)
        if (phase > 1)
          loadPhase(phase - 1)
            .then((d) => live && receivePhase(d))
            .catch(() => {})
      })
    return () => {
      live = false
    }
  }, [phase, phaseData, receivePhase])
  /** 지도가 그리는 페이즈 — 켠 페이즈의 데이터가 오기 전에는 받은 데이터의 페이즈까지 (지역 상세의 빈터와 그림이 함께 바뀐다) */
  const shownPhase = phaseData ? (Math.min(phase, phaseData.level) as PhaseLevel) : 0
  // 지금 켠 페이즈 — select 가 모르는 카드의 데이터를 어디까지 받을지 정할 때 (select 를 페이즈마다 새로 만들지 않게 ref 로)
  const phaseNow = useRef(phase)
  useEffect(() => {
    phaseNow.current = phase
  }, [phase])
  /** 지금 페이즈에 오르는 카드 — 그 페이즈와 앞 페이즈의 카드 */
  const phaseCards = useMemo(
    () => (phase && phaseData ? phaseData.cards.filter((c) => (phaseData.phaseOf.get(c.id) ?? Infinity) <= phase) : NO_FIGURES),
    [phase, phaseData],
  )
  /** 지도에 그리는 페이즈 그림 — 장소와 하나인 카드(place)는 그림 없이 그 장소 패널에 실린다 */
  const phaseFigures = useMemo(() => phaseCards.filter((c) => !c.place), [phaseCards])
  useEffect(() => {
    // 다른 값(?view=x,y,k 등)은 적힌 그대로 둔다 — URLSearchParams 로 다시 쓰면 쉼표가 %2C 로 바뀐다
    const keep = window.location.search
      .slice(1)
      .split('&')
      .filter((p) => p && !/^phase=/.test(p))
    if (phase) keep.push(`phase=${phase}`)
    const search = keep.length ? `?${keep.join('&')}` : ''
    if (search !== window.location.search) window.history.replaceState(null, '', window.location.pathname + search + window.location.hash)
  }, [phase])
  const appRef = useRef<HTMLDivElement>(null)
  const cartoucheRef = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const phaseRowRef = useRef<HTMLDivElement>(null)
  /** 패널을 연 요소 — 패널을 닫으면 초점을 돌려준다 */
  const openerRef = useRef<Element | null>(null)
  /** 다음 렌더 뒤, 패널 크기를 잴 수 있을 때 할 카메라 이동 — at: 장소 대신 보여 줄 지점 (지도에서 누른 카드 표시) */
  const pendingMove = useRef<{ move: Move; at?: Point } | null>(null)
  // Escape 로 닫았나 — 그러면 범위 안으로 돌아오는 카메라도 움직임 없이
  const closedByKey = useRef(false)

  const continentById = useMemo(() => new Map(continents.map((c) => [c.id, c])), [])
  const locationById = useMemo(() => new Map(locations.map((l) => [l.id, l])), [])
  const cardById = useMemo(
    () => new Map<string, LandCard | PhaseCard>([...LAND_CARDS, ...(phaseData?.cards ?? [])].map((c) => [c.id, c])),
    [phaseData],
  )
  /** 페이즈1 데이터가 오기 전에 고른 모르는 카드 — 데이터가 오면 다시 고른다 */
  const pendingSelect = useRef<{ picked: Selection; move: Move; at?: Point } | null>(null)
  const continentOf = useCallback((id: string | null) => (id ? continentById.get(id as never) ?? null : null), [continentById])

  const { svgRef, focusOn, focusBounds, ensureVisible, setCover, settle, fit } = zoom
  const cover = useCallback(() => {
    // 닫히며 나가는 패널은 이미 없는 것으로 친다
    const panel = panelRef.current?.hasAttribute('data-closing') ? null : panelRef.current
    return measureCover(svgRef.current, panel, cartoucheRef.current, appRef.current?.querySelector('.controls') ?? null)
  }, [svgRef])

  /** 지도 위에 떠 있는 상자들 — 이 밑에 들어간 곳은 화면 안이어도 보이지 않는 것으로 친다 */
  const obstacles = useCallback((): ScreenRect[] => {
    const svg = svgRef.current
    const app = appRef.current
    if (!svg || !app) return []
    const o = svg.getBoundingClientRect()
    return [...app.querySelectorAll('.cartouche, .panel:not([data-closing]), .controls > *, .legend[open] .legend-body')].map((el) => {
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
      // 장소와 하나인 카드는 그 장소로 연다 (#card/eye-of-ugin → #eye-of-ugin, 페이즈 카드 #card/seers-sundial → #seers-sundial)
      const placeId = picked?.type === 'card' ? (cardPlaceIds.get(picked.id) ?? phaseData?.placeOf.get(picked.id)) : undefined
      pendingSelect.current = null
      // 모르는 카드는 페이즈 카드일 수 있다 — 데이터를 불러온 뒤에 다시 고른다 (공유 링크 #card/카드id). 켠 페이즈의 데이터가 아직이면
      // 그것부터 받고(그 페이즈의 카드면 다음 페이즈의 글은 받지 않는다), 그래도 모르거나 페이즈를 끈 주소면 모든 페이즈를 받는다
      if (picked?.type === 'card' && !placeId && !cardById.has(picked.id) && (phaseData?.level ?? 0) < ALL_PHASES) {
        pendingSelect.current = { picked, move, at }
        loadPhase(phaseData || !phaseNow.current ? ALL_PHASES : phaseNow.current)
          .then(receivePhase)
          .catch((e) => console.error('페이즈 데이터를 불러오지 못했다', e))
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
      // 페이즈 카드를 열면(공유 링크 포함) 그 그림이 보이게 그 카드가 오르는 페이즈까지 켠다 (작은 대상은 moveCamera 가 그 지역 상세가 나오는 배율로 간다).
      // 장소와 하나인 페이즈 카드는 장소 패널로 열지만, 그 패널에 카드가 실리도록 페이즈는 똑같이 켠다
      const cardPhase = valid && picked?.type === 'card' ? (phaseData?.phaseOf.get(picked.id) as PhaseLevel | undefined) : undefined
      if (cardPhase) setPhase((cur) => (cur >= cardPhase ? cur : cardPhase))
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
      if (move === 'stay') return
      // 카드는 지도 위 카드 표시 자리를 보인다
      const card = s.type === 'card' ? cardById.get(s.id) : undefined
      if (card) at = at ?? card.at
      // 장소 대신 보여 줄 지점이 있으면 그 지점을 보인다
      if (at) {
        if (move === 'reveal') ensureVisible(at[0], at[1], c, 48, obstacles())
        else {
          // 페이즈 그림은 작은 것도 알아볼 만큼(가장 긴 변 64px) 들어간다 — 지역 상세에 사는 대상은 그 지역 상세가 나오는 배율까지
          const s = fit()
          const detail = card && 'childMap' in card && card.childMap ? detailById.get(card.childMap) : undefined
          const k = card && 'size' in card ? Math.max(3, 64 / (card.size * s)) : 3
          focusOn(at[0], at[1], detail ? Math.max(k, detailPxPerUnit(detail) / s) : k, c)
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
    [locationById, cardById, continentBounds, ensureVisible, focusBounds, focusOn, obstacles, fit],
  )

  // 패널이 그려진 뒤에 그 크기만큼 비켜서 카메라를 옮긴다
  useLayoutEffect(() => {
    const pending = pendingMove.current
    pendingMove.current = null
    const c = cover()
    setCover(c)
    if (!pending) return
    if (!selection) {
      // 패널이 닫혀 이동 범위가 좁아졌다
      settle(closedByKey.current)
      closedByKey.current = false
      return
    }
    moveCamera(selection, pending.move, c, pending.at)
  }, [selection, cover, setCover, settle, moveCamera])

  /** 장소 패널의 '가까이 보기' — 그 지역 상세가 보이는 배율로 그 범위를 보인다 */
  const zoomToDetail = useCallback(
    (id: string) => {
      const d = detailById.get(id)
      if (d) focusBounds(d.bounds, cover(), undefined, detailPxPerUnit(d))
    },
    [focusBounds, cover],
  )

  // 화면을 돌리거나 창 크기를 바꾸면 패널·머리말이 가리는 폭이 바뀌고, 고른 곳이 가려질 수 있다
  useEffect(() => {
    resizeHooks.current = {
      cover,
      reveal: (c) => {
        if (selection) moveCamera(selection, 'reveal', c)
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

  // 주소창에서 #을 고치거나 뒤로·앞으로 가기 — 해시와 함께 ?phase 도 다시 읽는다
  // (replaceState 는 이 사건을 내지 않아 되먹임이 없다)
  useEffect(() => {
    const onNav = () => {
      setPhase(readPhase(window.location.search))
      select(readHash())
    }
    window.addEventListener('popstate', onNav)
    return () => window.removeEventListener('popstate', onNav)
  }, [select])

  const closePanel = useCallback((byKey = false) => {
    closedByKey.current = byKey
    const opener = openerRef.current
    openerRef.current = null
    select(null)
    // 그 마커가 화면 밖으로 나가 그리지 않게 되었으면(그릴 범위 밖) 돌려줄 수 없다
    if ((opener instanceof HTMLElement || opener instanceof SVGElement) && opener.isConnected) return opener.focus({ preventScroll: true })
    // 돌려줄 곳이 없으면 켜진 페이즈 단추(없으면 첫 단추)로
    const row = phaseRowRef.current
    ;(row?.querySelector<HTMLElement>('[aria-pressed="true"]') ?? row?.querySelector<HTMLElement>('button'))?.focus({ preventScroll: true })
  }, [select])

  // 켜진 페이즈 단추를 다시 누르면 끈다. 새 페이즈에 오르지 않는 카드의 패널은 닫는다 (페이즈2 → 페이즈1 이면 WWK 카드, 페이즈3 → 페이즈2 면 ROE 카드)
  const togglePhase = useCallback(
    (p: PhaseLevel) => {
      const next: PhaseLevel = phase === p ? 0 : p
      const cardPhase = selection?.type === 'card' ? phaseData?.phaseOf.get(selection.id) : undefined
      if (cardPhase !== undefined && cardPhase > next) select(null)
      setPhase(next)
    },
    [phase, selection, select, phaseData],
  )

  // 닫히는 패널 — 나가는 동안 마지막으로 고른 것을 그대로 그린다. 그동안 다시 고르면 그 자리에서 되돌아온다
  const [leaving, setLeaving] = useState<Selection | null>(null)
  const [lastSelection, setLastSelection] = useState(selection)
  if (lastSelection !== selection) {
    setLastSelection(selection)
    setLeaving(selection ? null : lastSelection)
  }
  const panelGone = useCallback(() => setLeaving(null), [])
  const shown = selection ?? leaving

  const selectedLocation = selection?.type === 'location' ? locationById.get(selection.id) ?? null : null
  // 패널에 그리는 것 — 닫히는 동안은 마지막으로 고른 것
  const shownLocation = shown?.type === 'location' ? locationById.get(shown.id) ?? null : null
  const shownContinent = shown?.type === 'continent' ? continentById.get(shown.id as never) ?? null : null
  const shownCard = shown?.type === 'card' ? cardById.get(shown.id) ?? null : null
  // 지금 장소와 하나인 페이즈 카드 — 그 페이즈를 켰을 때 장소 패널에 카드로 싣는다
  const phasePlaceCard = useMemo(() => {
    const card = shownLocation && phaseCards.find((c) => c.place && c.depicts.id === shownLocation.id)
    return card && phaseData ? { phase: phaseData.phaseOf.get(card.id) ?? 0, card } : null
  }, [shownLocation, phaseCards, phaseData])
  const continentPlaces = useMemo(
    () =>
      shownContinent
        ? locations
            .filter((l) => l.continentId === shownContinent.id)
            .sort((a, b) => b.prominence - a.prominence || a.name.localeCompare(b.name))
        : [],
    [shownContinent],
  )
  // 지도에 카드 표시는 있지만 '이 대륙의 장소'에 장소로 오르지 않는 카드 — 대륙에 이은 카드, 자리를 모르는 장소에 이은 카드.
  // 장소와 하나인 카드는 그 장소가 목록에 오른다.
  const continentCards = useMemo(
    () =>
      shownContinent
        ? OWN_CARDS.filter((c) => {
            if (c.depicts.type === 'continent') return c.depicts.id === shownContinent.id
            const place = locationById.get(c.depicts.id)
            return place?.continentId === shownContinent.id && !isPlaced(place)
          }).sort((a, b) => a.name.localeCompare(b.name))
        : [],
    [shownContinent, locationById],
  )

  return (
    <div className="app" ref={appRef}>
      {/* 머리말이 DOM 에서 먼저 — 키보드는 지도 마커보다 제목·페이즈 버튼에 먼저 닿는다 */}
      <header className="cartouche" ref={cartoucheRef}>
        <h1>Zendikar</h1>
        <div className="phase-row" ref={phaseRowRef}>
          {PHASES.map((p) => (
            <button key={p} type="button" className="phase-button" aria-pressed={phase === p} onClick={() => togglePhase(p)}>
              페이즈{p}
            </button>
          ))}
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
        onSelect={(s) => select(s, s?.type === 'continent' ? 'stay' : 'reveal')}
        cards={PINNED_CARDS}
        cardPlaceIds={cardPlaceIds}
        onSelectCard={(card) => select({ type: 'card', id: card.id }, 'reveal')}
        figures={phaseFigures}
        phase={shownPhase}
        onSelectFigure={(id) => select({ type: 'card', id }, 'reveal')}
        childMaps={CHILD_DETAILS}
        onFocusPoint={(x, y) => ensureVisible(x, y, cover(), 40, obstacles())}
        lang={lang}
        view={zoom.view}
        svgRef={zoom.svgRef}
        layerRef={zoom.layerRef}
      />

      <MapControls
        onZoomIn={() => zoom.zoomBy(1.6)}
        onZoomOut={() => zoom.zoomBy(1 / 1.6)}
        onReset={() => zoom.reset()}
        lang={lang}
        onLangChange={setLang}
      >
        <Legend era={ERA_NOTE} phaseNote={PHASE_NOTES[phase]} terrain={TERRAIN_KEYS} />
      </MapControls>

      <PlacePanel
        panelRef={panelRef}
        location={shownLocation}
        continent={shownContinent}
        continentPlaces={continentPlaces}
        continentCards={continentCards}
        continentOf={continentOf}
        card={shownCard}
        placeCard={shownLocation ? placeCards.get(shownLocation.id) ?? null : null}
        cardsHere={shownLocation ? OWN_CARDS.filter((c) => c.depicts.type === 'location' && c.depicts.id === shownLocation.id) : []}
        phaseCardsHere={
          // 그 장소를 그린 카드, 그리고 그 장소의 지역 상세에 그린 대상 (Tal Terig·Malakir 처럼 대상은 이웃 장소를 가리켜도) — 카드가 오른 페이즈마다 한 줄
          phaseData && shownLocation
            ? PHASES.map((p) => ({
                phase: p,
                cards: phaseFigures.filter(
                  (c) =>
                    phaseData.phaseOf.get(c.id) === p &&
                    ((c.depicts.type === 'location' && c.depicts.id === shownLocation.id) ||
                      (c.childMap !== undefined && detailById.get(c.childMap)?.place === shownLocation.id)),
                ),
              })).filter((g) => g.cards.length > 0)
            : []
        }
        phasePlaceCard={phasePlaceCard}
        childDetailHere={(shownLocation && detailOfPlace.get(shownLocation.id)) || null}
        onZoomToDetail={zoomToDetail}
        onMap={onMap}
        featuresHere={shownLocation ? landscapeOfPlace(shownLocation.id) : []}
        continentFeatures={shownContinent ? landscapeOfContinent(shownContinent.id) : []}
        locationOf={(id) => locationById.get(id) ?? null}
        onSelectCard={(id) => select({ type: 'card', id })}
        onSelectLocation={(id) => select({ type: 'location', id })}
        onSelectContinent={(id) => select({ type: 'continent', id })}
        onClose={closePanel}
        closing={!selection && Boolean(leaving)}
        onClosed={panelGone}
      />
    </div>
  )
}

export default App
