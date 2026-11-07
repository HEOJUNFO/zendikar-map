// 픽셀 아트 지도 (/pixel) — S2: 확대 단계(한 픽셀 = 16 … 0.25 단위)마다 256² 타일을 Worker 가 그리고, 화면 크기 캔버스에 정수 배율로 붙인다.
// S3: 그 위에 장소·대지 카드 기호와 이름, 지역·물 이름, 대륙명의 DOM 층(marks/MarksLayer.tsx)과 패널(panel/Panel.tsx). 고른 것은 지금 지도와 같은 # 주소다.
// S4: 타일에 바탕 지형(채색 영역·강·단애·흩뿌린 기호·한 점 기호·바다 표시·헤드론 — raster/terrain.ts, 데이터는 virtual:pixel-terrain). 흩뿌린 기호는 이름 상자를 비킨다(labels/holes.ts).
// 지금 지도(src/App.tsx)와 따로 빌드하는 페이지라 지금 지도의 모듈은 순수한 데이터·기하(geo.ts·geometry.ts)만 가져다 쓴다.
// 순서와 결정은 docs/pixel-plan.md.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import marks from 'virtual:pixel-marks'
import type { Point } from '../data/types'
import type { Dict } from '../i18n/units'
import { holesIn, levelHoles } from './labels/holes'
import { firstLevels, firstMarkLevels, layoutLevels } from './labels/layout'
import { MarksLayer, type Selection } from './marks/MarksLayer'
import type { SpriteColors } from './marks/sprites'
import type { PanelData } from './panel/data'
import { Panel } from './panel/Panel'
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
    badge: '시험판 S4',
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
    badge: 'Sandbox S4',
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
const ZOOM_MS = 160
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
    const place = marks.cardPlaces[s.id]
    return place ? markOf({ type: 'location', id: place }) : null
  }
  const p = marks.points.find((x) => x.id === s.id) ?? marks.areas.find((x) => x.id === s.id)
  if (p) return { key: p.id, at: p.at }
  const c = marks.cards.find((x) => x.place === s.id)
  return c ? { key: c.id, at: c.at } : null
}

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
  const pal = PALETTES[sandbox.palette]
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
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
  const goLevel = useCallback((n: number) => {
    levelNow.current = n
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

  // 이름 배치 — 단계마다 화면 px/단위가 하나라 한 번에 모든 단계를 셈한다 (labels/layout.ts)
  const pxAt = useMemo(() => LEVELS.map((_, i) => cssPerUnit(i, sandbox.size, vp.dpr)), [sandbox.size, vp.dpr])
  const layouts = useMemo(() => layoutLevels(marks, lang, pxAt, MAP_W), [lang, pxAt])
  // 흩뿌린 지형 기호가 비키는 이름 상자 — 단계마다 (labels/holes.ts). 이름 배치가 같으면 타일 열쇠의 tag 도 같다
  const holes = useMemo(() => layouts.map((l, i) => levelHoles(marks, l, lang, pxAt[i])), [layouts, lang, pxAt])
  const tileTag = sandbox.terrain ? `t|${lang}|${sandbox.size}|${vp.dpr}` : ''
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
  const pinch = useRef<{ k: number; mx: number; my: number; ax: number; ay: number; fromLevel: number } | null>(null)
  /** 마지막으로 단계를 바꾼 때 — 그 뒤 잠깐은 한 칸 둘레를 미리 청하지 않는다 (잇단 확대에서 지나가는 단계의 둘레를 그리느라 마지막 단계가 늦었다) */
  const zoomedAt = useRef(0)
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
        const e = 1 - (1 - t) ** 3
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
    }
    const ml = marksRef.current
    if (ml) {
      // React 가 이 단계·이 범위로 다시 그리기 전에는 숨겨 둔다 (낡은 범위의 빈 단추 자리에 이름이 늦게 나지 않게)
      const hide = v.moving || level !== renderedLevel.current || (cull !== null && !cull.key.startsWith(`${level}|`))
      ml.classList.toggle('is-zooming', hide)
      if (!hide) ml.style.transform = `translate(${ox / dpr}px, ${oy / dpr}px)`
    }

    const T = TILE * dev
    const ntx = Math.ceil(g.w / TILE)
    const nty = Math.ceil(g.h / TILE)
    const tx0 = Math.max(0, Math.floor(-ox / T))
    const tx1 = Math.min(ntx - 1, Math.floor((W - 1 - ox) / T))
    const ty0 = Math.max(0, Math.floor(-oy / T))
    const ty1 = Math.min(nty - 1, Math.floor((H - 1 - oy) / T))
    const keyAt = (lv: number, tx: number, ty: number) => tileKey(LEVELS[lv], tx, ty, sandbox.palette, sandbox.shore, tileTag)
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
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (!s.get(keyAt(level, tx, ty))) missing++
      // 이어 그리기만 프레임마다 — 두 손가락 확대는 손가락이 움직이거나 타일이 올 때 그린다 (손가락을 멈춰 두면 쉰다)
      if (anim.current) schedule()
    } else {
      for (let ty = ty0; ty <= ty1; ty++) {
        for (let tx = tx0; tx <= tx1; tx++) {
          const key = keyAt(level, tx, ty)
          pinned.push(key)
          const dx = ox + tx * T
          const dy = oy + ty * T
          const bmp = s.get(key)
          if (bmp) {
            ctx.drawImage(bmp, dx, dy, bmp.width * dev, bmp.height * dev)
            continue
          }
          missing++
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
      // 기호 그림(흩뿌린 기호는 8 픽셀)이 타일 밖에서 걸쳐 들어오는 몫까지
      const m = 10 * lu
      specs.push({
        key: keyAt(lv, tx, ty),
        u: lu,
        x0,
        y0,
        w: tw,
        h: th,
        pal: sandbox.palette,
        shore: sandbox.shore,
        terrain: sandbox.terrain,
        holes: sandbox.terrain ? () => holesIn(holes[lv], x0 * lu - m, y0 * lu - m, (x0 + tw) * lu + m, (y0 + th) * lu + m) : undefined,
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
    }
  }
  const visualRef = useRef(visual)
  useLayoutEffect(() => {
    drawRef.current = draw
    visualRef.current = visual
  })

  // 보기·팔레트·화면이 바뀌면 다시 그린다
  useLayoutEffect(schedule, [schedule, level, sandbox, vp])

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
    const k = unit / fitScale(vp.w, vp.h)
    const p = center.current
    q.set('view', `${Math.round(p.x)},${Math.round(p.y)},${Math.round(k * 100) / 100}`)
    q.set('pal', sandbox.palette)
    q.set('s', String(sandbox.size))
    q.set('shore', sandbox.shore)
    const s = q.toString().replace(/%2C/g, ',')
    searchRef.current = `?${s}`
    // 끌기·방향키는 React 로 다시 그리지 않으니 링크도 여기서 고친다
    if (linkRef.current) linkRef.current.href = mainMapHref(`?${s}`, window.location.hash)
    // 주소 쓰기는 잠잠해진 뒤 한 번 — 잇단 확대·방향키마다 쓰면 Chrome 이 짧은 사이의 많은 replaceState 를 버려 ?view 가 낡은 채 남는다
    window.clearTimeout(urlTimer.current)
    urlTimer.current = window.setTimeout(() => {
      window.history.replaceState(null, '', `?${s}${window.location.hash}`) // 경로는 그대로 (// 로 시작하는 경로가 다른 호스트로 읽히지 않게)
    }, 250)
  }, [unit, vp, sandbox])
  useEffect(() => () => window.clearTimeout(urlTimer.current), [])
  useEffect(writeUrl, [writeUrl])

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
      // 새 단계의 기호 범위를 움직임이 끝나기 전에 미리 — 끝 프레임에 이름이 늦게 나지 않게
      setCull(cullFor(next, c, kT, vp.w, vp.h, vp.dpr))
      zoomedAt.current = now
      if (next !== levelNow.current) goLevel(next)
      schedule()
    },
    [vp, sandbox.size, goLevel, schedule],
  )
  /** 한 단계 — 두 손가락·트랙패드 확대 중이면 지금 보이는 배율에 가장 가까운 단계에서 센다 */
  const zoomAt = useCallback(
    (dir: 1 | -1, sx?: number, sy?: number) => {
      const pz = pinch.current
      const base = pz ? nearestLevel(pz.k / vp.dpr, sandbox.size, vp.dpr) : levelNow.current
      zoomTo(base + dir, sx, sy)
    },
    [zoomTo, vp.dpr, sandbox.size],
  )
  /** 움직임을 끊는다 — 가운데·단계를 바로 정하는 일 앞에 (남은 이어 그리기나 손을 뗀 뒤의 settle 이 그 일을 덮지 않게) */
  const stopZoom = useCallback(() => {
    anim.current = null
    pinch.current = null
  }, [])

  // 몸짓 처리기는 한 번만 단다 — 단계가 바뀔 때마다 다시 달면 진행 중인 핀치·끌기의 손가락을 잃는다. 최신 셈은 live 로 읽는다
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
    /** 두 손가락을 (다시) 정한다 — 손가락이 바뀌면 그 자리에서 새로 붙잡는다 (튀지 않게) */
    const startPair = () => {
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
    let wheel = 0
    let lastWheel = -1e9
    let lastStep = -1e9
    let trackpadTimer = 0
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
      const { vp } = live.current
      let pz = pinch.current
      if (!pz) {
        const v = visualRef.current(performance.now())
        anim.current = null
        pz = { k: v.k, mx: (ax * vp.dpr - v.ox) / v.k, my: (ay * vp.dpr - v.oy) / v.k, ax, ay, fromLevel: v.fromLevel }
        pinch.current = pz
      }
      const [lo, hi] = kRange()
      if (k !== null) pz.k = clamp(k, lo, hi)
      pz.ax = ax
      pz.ay = ay
      live.current.schedule()
    }
    /** 이어지는 확대를 끝낸다 — 붙잡은 점을 그대로 둔 채 가장 가까운 단계로 */
    const settle = () => {
      const pz = pinch.current
      if (!pz) return
      const { vp, size, zoomTo, writeUrl } = live.current
      zoomTo(nearestLevel(pz.k / vp.dpr, size, vp.dpr), pz.ax, pz.ay)
      writeUrl()
    }
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if (!pts.size) {
        moved = 0
        start = { x: e.clientX, y: e.clientY }
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
      // 휠 — 쉬었다 오면 남은 몫을 버리고, 한 칸(|dy| ≥ 50)은 바로 한 단계. 단계는 움직임 한 번(ZOOM_MS)에 하나까지 (관성 스크롤이 여러 단계를 건너뛰지 않게)
      if (e.timeStamp - lastWheel > 200) wheel = 0
      lastWheel = e.timeStamp
      wheel += dy
      if (Math.abs(wheel) >= 50 && e.timeStamp - lastStep >= ZOOM_MS * 0.75) {
        live.current.zoomAt(wheel < 0 ? 1 : -1, e.clientX, e.clientY)
        lastStep = e.timeStamp
        wheel = 0
        live.current.writeUrl()
      }
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
    const step = 64 / unit
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    if (moves[e.key]) {
      e.preventDefault()
      const [dx, dy] = moves[e.key]
      stopZoom()
      center.current = { x: center.current.x + dx, y: center.current.y + dy }
      schedule()
      writeUrl()
    } else if (e.key === '+' || e.key === '=') zoomAt(1)
    else if (e.key === '-' || e.key === '_') zoomAt(-1)
  }

  const reset = () => {
    stopZoom()
    center.current = { x: MAP_W / 2, y: MAP_H / 2 }
    const next = overviewLevel(vp.w, vp.h, sandbox.size, vp.dpr)
    if (next === levelNow.current) {
      schedule()
      writeUrl()
    } else goLevel(next)
  }

  // 고른 것 — 지금 지도와 같은 # 주소. 장소와 하나인 카드(#card/<id>)는 패널의 글을 받은 뒤 그 장소로 바꿔 연다
  const [selection, setSelection] = useState<Selection | null>(() => readHash(window.location.hash))
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [panel, setPanel] = useState<{ data: PanelData | null; dict: Dict | null }>({ data: null, dict: null })
  const placeOfCard = selection?.type === 'card' ? panel.data?.cardPlace.get(selection.id) : undefined
  const shown = useMemo<Selection | null>(() => (placeOfCard ? { type: 'location', id: placeOfCard } : selection), [placeOfCard, selection])
  // 패널의 글(장소·카드·대륙 원본)과 영어 사전은 처음 고를 때 받는다 — 첫 화면에는 이름과 자리만 (virtual:pixel-marks)
  const wantPanel = selection !== null
  useEffect(() => {
    if (!wantPanel) return
    let live = true
    if (!panel.data) void import('./panel/data').then((m) => live && setPanel((p) => ({ ...p, data: m.buildPanelData() })))
    if (lang === 'en' && !panel.dict) void import('../i18n/en/base.json').then((m) => live && setPanel((p) => ({ ...p, dict: m.default as Dict })))
    return () => {
      live = false
    }
  }, [wantPanel, lang, panel.data, panel.dict])

  /** 고른 것을 화면 가운데로 — 그 이름(없으면 기호)이 보이는 단계까지 확대한다 */
  const goTo = useCallback(
    (s: Selection) => {
      const m = markOf(s)
      if (!m) return
      stopZoom()
      center.current = { x: m.at[0], y: m.at[1] }
      const need = firstShown(m.key)
      const next = Number.isFinite(need) ? Math.max(levelNow.current, need) : levelNow.current
      if (next !== levelNow.current) goLevel(next)
      else {
        schedule()
        writeUrl()
      }
    },
    [firstShown, goLevel, schedule, writeUrl, stopZoom],
  )
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
  useLayoutEffect(() => {
    if (!shown) return
    const m = markOf(shown)
    const box = document.querySelector('.px-panel')?.getBoundingClientRect()
    if (!m || !box) return
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
    // shown 의 열쇠가 바뀔 때만 — 끌어서 패널 밑으로 옮긴 것을 되돌리지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownKey, panel.data])

  const onPick = useCallback((s: Selection) => select(s), [select])
  const onPanelPick = useCallback((s: Selection) => select(s, true), [select])
  /** 키보드로 화면 밖의 기호에 닿으면 그곳으로 옮긴다 */
  const onFocusMark = useCallback(
    (id: string | null, at: Point | null, keyboard: boolean) => {
      setFocusedId(id)
      if (!at || !keyboard) return
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
      goLevel(nearestLevel(unit, value as PixelSize, vp.dpr))
    }
    setSandbox((s) => ({ ...s, [key]: value }))
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
      }) as React.CSSProperties,
    [pal],
  )
  const spriteColors = useMemo<SpriteColors>(() => ({ ink: pal.uiInk, fill: pal.uiBg, stone: STONE, halo: pal.uiBg }), [pal])
  const spriteSelected = useMemo<SpriteColors>(() => ({ ink: pal.uiInk, fill: PICKED, stone: PICKED, halo: PICKED }), [pal])

  return (
    <div className="pixel-app" style={style} lang={lang}>
      <div ref={stageRef} className="pixel-stage" role="region" aria-label={t.map} tabIndex={0} onKeyDown={onKey}>
        <canvas ref={canvasRef} className="pixel-canvas" aria-hidden="true" />
        <div ref={marksRef} className="px-marks">
          <MarksLayer
            marks={marks}
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

      <header className="pixel-head">
        <h1>
          {t.title} <span className="pixel-badge">{t.badge}</span>
        </h1>
        <Choice label={t.palette} value={sandbox.palette} options={(['a', 'b', 'c'] as PaletteId[]).map((id) => [id, PALETTES[id].name[lang]])} onPick={(v) => pick('palette', v)} />
        <Choice label={t.size} value={sandbox.size} options={PIXEL_SIZES.map((s) => [s, `${s}×`])} onPick={(v) => pick('size', v)} />
        <Choice label={t.shore} value={sandbox.shore} options={(['dither', 'band', 'none'] as ShoreStyle[]).map((s) => [s, t.shores[s]])} onPick={(v) => pick('shore', v)} />
        <a ref={linkRef} className="pixel-link" href="./">
          {t.main}
        </a>
      </header>

      <div className="pixel-zoom">
        {/* 단계 글이 단추 앞 — 글 폭이 바뀌어도 오른쪽에 붙은 단추는 움직이지 않는다 (빠르게 두 번 누르다 ⌂ 를 누르지 않게) */}
        <span className="pixel-level">{t.level(LEVELS[level])}</span>
        <button type="button" onClick={() => zoomAt(1)} disabled={level === LEVELS.length - 1} aria-label={t.zoomIn}>
          +
        </button>
        <button type="button" onClick={() => zoomAt(-1)} disabled={level === 0} aria-label={t.zoomOut}>
          −
        </button>
        <button type="button" onClick={reset} aria-label={t.reset}>
          {/* 집 — 픽셀 글꼴에 ⌂ 가 없어 7×7 픽셀로 */}
          <svg className="pixel-home" viewBox="0 0 7 7" width={14} height={14} shapeRendering="crispEdges" aria-hidden="true">
            <path d="M3 0h1v1h1v1h1v1h1v1H6v3H4V5H3v2H1V4H0V3h1V2h1V1h1z" fill="currentColor" />
          </svg>
        </button>
      </div>

      <p ref={statusRef} className="pixel-drawing" role="status" hidden>
        {t.drawing}
      </p>

      {shown && (!panel.data || hasEntry(panel.data, shown)) && (
        <Panel
          lang={lang}
          data={panel.data}
          dict={lang === 'en' ? panel.dict : null}
          selection={shown}
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
