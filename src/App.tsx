import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Legend } from './components/Legend'
import { MapControls } from './components/MapControls'
import { PlacePanel } from './components/PlacePanel'
import { SearchBox, type SearchHit } from './components/SearchBox'
import { continentAt, continents, ERA_NOTE, hedrons, locations, terrainAreas, LAND_CARDS } from './data'
import { isPlaced, type Point } from './data/types'
import { landmassById } from './map/geo'
import { ringBounds, type Bounds } from './map/geometry'
import { NO_COVER, readInitialView, useMapZoom, type Cover, type ScreenRect } from './map/useMapZoom'
import { ZendikarMap, type LabelLang, type Selection } from './map/ZendikarMap'
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
  const appRef = useRef<HTMLDivElement>(null)
  const cartoucheRef = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  /** 패널을 연 요소 — 패널을 닫으면 초점을 돌려준다 */
  const openerRef = useRef<Element | null>(null)
  /** 다음 렌더 뒤, 패널 크기를 잴 수 있을 때 할 카메라 이동 — at: 장소 대신 보여 줄 지점 (지도에서 누른 카드 표시) */
  const pendingMove = useRef<{ move: Move; at?: Point } | null>(null)

  const continentById = useMemo(() => new Map(continents.map((c) => [c.id, c])), [])
  const locationById = useMemo(() => new Map(locations.map((l) => [l.id, l])), [])
  const cardById = useMemo(() => new Map(LAND_CARDS.map((c) => [c.id, c])), [])
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
    (s: Selection | null, move: Move = 'focus', at?: Point) => {
      const exists = (x: Selection) =>
        x.type === 'location' ? locationById.has(x.id) : x.type === 'card' ? cardById.has(x.id) : continentById.has(x.id as never)
      const valid = s && exists(s) ? s : null
      if (valid) {
        // 패널 안에서 다른 곳으로 옮겨 가는 경우가 아니면, 지금 초점이 있는 곳이 패널을 연 곳이다
        const active = document.activeElement
        if (active && active !== document.body && !panelRef.current?.contains(active)) openerRef.current = active
      }
      pendingMove.current = { move, at }
      setSelection(valid)
      writeHash(valid)
    },
    [locationById, continentById, cardById],
  )

  /** 고른 곳으로 카메라를 옮긴다 — c 는 지금 패널·머리말이 가리는 폭 */
  const moveCamera = useCallback(
    (s: Selection, move: Move, c: Cover, at?: Point) => {
      // 카드는 지도 위 카드 표시 자리를 보인다
      if (s.type === 'card') at = at ?? cardById.get(s.id)?.at
      // 장소 대신 보여 줄 지점이 있으면 그 지점을 보인다
      if (at) {
        if (move === 'reveal') ensureVisible(at[0], at[1], c, 48, obstacles())
        else focusOn(at[0], at[1], 3, c)
        return
      }
      // 위치가 알려지지 않은 곳은 그 대륙을 보여 준다
      const l = s.type === 'location' ? locationById.get(s.id) : undefined
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
    [locationById, cardById, continentBounds, ensureVisible, focusBounds, focusOn, obstacles],
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
      settle()
      return
    }
    moveCamera(selection, pending.move, c, pending.at)
  }, [selection, cover, setCover, settle, moveCamera])

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
  useEffect(() => {
    const initial = readHash()
    if (!initial) return
    const id = requestAnimationFrame(() => select(initial))
    return () => cancelAnimationFrame(id)
  }, [select])

  // 주소창에서 #을 고치거나 뒤로·앞으로 가기 — replaceState 는 hashchange 를 내지 않아 되먹임이 없다
  useEffect(() => {
    const onHash = () => select(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [select])

  const closePanel = useCallback(() => {
    const opener = openerRef.current
    openerRef.current = null
    select(null)
    if (opener instanceof HTMLElement || opener instanceof SVGElement) {
      if (opener.isConnected) return opener.focus({ preventScroll: true })
    }
    searchRef.current?.focus({ preventScroll: true })
  }, [select])

  const onPick = useCallback((hit: SearchHit) => select({ type: hit.type, id: hit.item.id }), [select])

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
  // 지도에 카드 표시는 있지만 '이 대륙의 장소'에 장소로 오르지 않는 카드 — 대륙에 이은 카드, 자리를 모르는 장소에 이은 카드
  const continentCards = useMemo(
    () =>
      selectedContinent
        ? LAND_CARDS.filter((c) => {
            if (c.depicts.type === 'continent') return c.depicts.id === selectedContinent.id
            const place = locationById.get(c.depicts.id)
            return place?.continentId === selectedContinent.id && !isPlaced(place)
          }).sort((a, b) => a.name.localeCompare(b.name))
        : [],
    [selectedContinent, locationById],
  )

  return (
    <div className="app" ref={appRef}>
      {/* 머리말이 DOM 에서 먼저 — 키보드는 지도 마커보다 제목·지명 찾기에 먼저 닿는다 */}
      <header className="cartouche" ref={cartoucheRef}>
        <h1>Zendikar</h1>
        <p className="tagline">탁류(Roil)가 쉬지 않고 땅을 뒤바꾸는 차원. 지명은 공식 자료로 확인한 것만 실었습니다.</p>
        <SearchBox
          continents={continents}
          locations={locations}
          cards={LAND_CARDS}
          cardContinent={(c) =>
            continentOf(c.depicts.type === 'continent' ? c.depicts.id : locationById.get(c.depicts.id)?.continentId ?? null)?.name ?? '—'
          }
          continentName={(id) => continentOf(id)?.name ?? '바다'}
          onPick={onPick}
          inputRef={searchRef}
        />
      </header>

      <ZendikarMap
        continents={continents}
        locations={locations}
        hedrons={hedrons}
        terrainAreas={terrainAreas}
        continentAt={continentAt}
        selection={selection}
        highlightContinentId={selectedLocation && !isPlaced(selectedLocation) ? selectedLocation.continentId : null}
        onSelect={(s) => select(s, 'reveal')}
        cards={LAND_CARDS}
        onSelectCard={(card) => select({ type: 'card', id: card.id }, 'reveal')}
        onFocusPoint={(x, y) => ensureVisible(x, y, cover(), 40, obstacles())}
        lang={lang}
        view={zoom.view}
        svgRef={zoom.svgRef}
        layerRef={zoom.layerRef}
      />

      <MapControls
        onZoomIn={() => zoom.zoomBy(1.6)}
        onZoomOut={() => zoom.zoomBy(1 / 1.6)}
        onReset={zoom.reset}
        lang={lang}
        onLangChange={setLang}
      >
        <Legend era={ERA_NOTE} />
      </MapControls>

      <PlacePanel
        panelRef={panelRef}
        location={selectedLocation}
        continent={selectedContinent}
        continentPlaces={continentPlaces}
        continentCards={continentCards}
        continentOf={continentOf}
        card={selectedCard}
        cardsHere={selectedLocation ? LAND_CARDS.filter((c) => c.depicts.type === 'location' && c.depicts.id === selectedLocation.id) : []}
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
