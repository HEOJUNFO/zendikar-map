// 픽셀 아트 지도 (/pixel) — S1: 해안·내해·숲을 확대 단계마다 세계 한 장으로 그리고, 팔레트·픽셀 크기·물가를 주소로 바꿔 본다.
// 지금 지도(src/App.tsx)와 따로 빌드하는 페이지라 지금 지도의 모듈은 순수한 데이터·기하(geo.ts·geometry.ts)만 가져다 쓴다.
// 순서와 결정은 docs/pixel-plan.md.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { forests, inlandWaters, landmasses } from '../map/geo'
import { PALETTES, type PaletteId } from './raster/palette'
import { paintCells, rasterCells, type ShoreStyle, type WorldCells, type WorldRings } from './raster/world'
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

const RINGS: WorldRings = {
  width: MAP_W,
  height: MAP_H,
  lands: landmasses.map((l) => l.ring),
  forests,
  inland: inlandWaters,
}

const TEXT = {
  ko: {
    title: '젠디카르 픽셀 지도',
    badge: '시험판 S1',
    palette: '팔레트',
    size: '픽셀 크기',
    shore: '물가',
    shores: { dither: '디더링', band: '띠', none: '없음' } satisfies Record<ShoreStyle, string>,
    zoomIn: '확대',
    zoomOut: '축소',
    reset: '처음 보기',
    main: '지금 지도로',
    drawing: '그리는 중…',
    map: '젠디카르 세계 지도 (픽셀 아트). 방향키로 옮기고 +·− 로 확대·축소한다.',
    level: (u: number) => `한 픽셀 = ${u} 단위`,
  },
  en: {
    title: 'Zendikar Pixel Map',
    badge: 'Sandbox S1',
    palette: 'Palette',
    size: 'Pixel size',
    shore: 'Shore',
    shores: { dither: 'Dither', band: 'Bands', none: 'None' } satisfies Record<ShoreStyle, string>,
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    reset: 'Reset view',
    main: 'Main map',
    drawing: 'Drawing…',
    map: 'World map of Zendikar (pixel art). Arrow keys pan, + and − zoom.',
    level: (u: number) => `1 pixel = ${u} units`,
  },
} satisfies Record<Lang, unknown>

/** 단계마다 칸 종류는 한 번만 센다 (팔레트·물가를 바꿔도 다시 칠하기만) */
const cellCache = new Map<number, WorldCells>()
const canvasCache = new Map<string, HTMLCanvasElement>()

function worldCanvas(u: number, sb: Sandbox): HTMLCanvasElement {
  const key = `${u}|${sb.palette}|${sb.shore}`
  const hit = canvasCache.get(key)
  if (hit) return hit
  let cells = cellCache.get(u)
  if (!cells) {
    cells = rasterCells(RINGS, u)
    cellCache.set(u, cells)
  }
  const { w, h } = cells.grid
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  c.className = 'pixel-world'
  c.setAttribute('aria-hidden', 'true')
  c.getContext('2d')!.putImageData(new ImageData(paintCells(cells, PALETTES[sb.palette], { shore: sb.shore }), w, h), 0, 0)
  canvasCache.set(key, c)
  return c
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function PixelApp() {
  const [lang] = useState<Lang>(() => readLang(window.location.search))
  const t = TEXT[lang]
  const [sandbox, setSandbox] = useState<Sandbox>(() => readSandbox(window.location.search))
  const pal = PALETTES[sandbox.palette]
  const stageRef = useRef<HTMLDivElement>(null)
  const holderRef = useRef<HTMLDivElement>(null)
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 }))
  // 보기 — 화면 가운데의 지도 좌표와 단계. 끌기 중에는 ref 만 고쳐 다시 그리지 않는다
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
  // 처음 그리는 장은 한 프레임 미뤄 그린다 — 그동안 '그리는 중' (다 그리면 bump 로 다시 그린다)
  const [, bump] = useState(0)
  const drawing = !canvasCache.has(`${LEVELS[level]}|${sandbox.palette}|${sandbox.shore}`)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const linkRef = useRef<HTMLAnchorElement>(null)

  // 화면 크기·DPR
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  const unit = cssPerUnit(level, sandbox.size, vp.dpr)

  /**
   * 캔버스 자리 — 기기 픽셀에 맞춰 반올림한다 (픽셀 경계가 화면 픽셀 사이에 걸리면 번진다).
   * 붙어 있는 장의 배율(dataset.cpu)로 놓는다 — 새 단계의 장을 그리는 동안에는 옛 장이 제 배율 그대로 남는다
   */
  const place = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    const { w, h, dpr } = vp
    const unit = Number(c.dataset.cpu) || cssPerUnit(level, sandbox.size, dpr)
    const p = center.current
    // 지도가 화면보다 작으면 가운데에 두고, 크면 지도 밖이 화면 반 넘게 드러나지 않게
    const halfW = w / 2 / unit
    const halfH = h / 2 / unit
    p.x = MAP_W <= 2 * halfW ? MAP_W / 2 : clamp(p.x, 0, MAP_W)
    p.y = MAP_H <= 2 * halfH ? MAP_H / 2 : clamp(p.y, 0, MAP_H)
    const snap = (v: number) => Math.round(v * dpr) / dpr
    const left = snap(w / 2 - p.x * unit)
    const top = snap(h / 2 - p.y * unit)
    c.style.transform = `translate(${left}px, ${top}px)`
  }, [vp, level, sandbox.size])

  // 단계·팔레트·물가가 바뀌면 그 장을 붙인다 (처음 그리는 장은 한 프레임 뒤에 — '그리는 중' 이 먼저 보이게)
  useLayoutEffect(() => {
    const holder = holderRef.current
    if (!holder) return
    const u = LEVELS[level]
    const key = `${u}|${sandbox.palette}|${sandbox.shore}`
    let cancelled = false
    const attach = () => {
      if (cancelled) return
      const c = worldCanvas(u, sandbox)
      const dev = devicePerPixel(sandbox.size, vp.dpr)
      c.style.width = `${(c.width * dev) / vp.dpr}px`
      c.style.height = `${(c.height * dev) / vp.dpr}px`
      c.dataset.cpu = String(dev / vp.dpr / u)
      holder.replaceChildren(c)
      canvasRef.current = c
      place()
    }
    if (canvasCache.has(key)) attach()
    else {
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          attach()
          bump((n) => n + 1)
        }),
      )
      return () => {
        cancelled = true
        cancelAnimationFrame(id)
      }
    }
    return () => {
      cancelled = true
    }
  }, [level, sandbox, vp.dpr, place])

  useLayoutEffect(place, [place])

  // 주소 — ?view 는 지금 지도와 같은 뜻으로, 시험 스위치는 그대로 남긴다
  const writeUrl = useCallback(() => {
    const q = new URLSearchParams(window.location.search)
    const k = unit / fitScale(vp.w, vp.h)
    const p = center.current
    q.set('view', `${Math.round(p.x)},${Math.round(p.y)},${Math.round(k * 100) / 100}`)
    q.set('pal', sandbox.palette)
    q.set('s', String(sandbox.size))
    q.set('shore', sandbox.shore)
    const s = q.toString().replace(/%2C/g, ',')
    window.history.replaceState(null, '', `?${s}${window.location.hash}`) // 경로는 그대로 (// 로 시작하는 경로가 다른 호스트로 읽히지 않게)
    // 끌기·방향키는 다시 그리지 않으니 링크도 여기서 고친다
    if (linkRef.current) linkRef.current.href = mainMapHref(window.location.search, window.location.hash)
  }, [unit, vp, sandbox])
  useEffect(writeUrl, [writeUrl])

  /** 화면 점 (sx, sy) 를 붙잡고 단계를 바꾼다 */
  const zoomAt = useCallback(
    (dir: 1 | -1, sx = vp.w / 2, sy = vp.h / 2) => {
      const next = clamp(level + dir, 0, LEVELS.length - 1)
      if (next === level) return
      const p = center.current
      const mx = p.x + (sx - vp.w / 2) / unit
      const my = p.y + (sy - vp.h / 2) / unit
      const u2 = cssPerUnit(next, sandbox.size, vp.dpr)
      center.current = { x: mx - (sx - vp.w / 2) / u2, y: my - (sy - vp.h / 2) / u2 }
      setLevel(next)
    },
    [level, unit, vp, sandbox.size],
  )

  // 몸짓 처리기는 한 번만 단다 — 단계가 바뀔 때마다 다시 달면 진행 중인 핀치·끌기의 손가락을 잃는다. 최신 셈은 live 로 읽는다
  const live = useRef({ unit, place, zoomAt, writeUrl })
  useLayoutEffect(() => {
    live.current = { unit, place, zoomAt, writeUrl }
  })

  // 끌기·두 손가락 확대·휠
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const pts = new Map<number, { x: number; y: number }>()
    let pinch0 = 0
    let wheel = 0
    /** 이번 몸짓에서 움직인 거리 (px) — 끌기 뒤에 오는 dblclick 은 확대로 치지 않는다 */
    let moved = 0
    const down = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId)
      if (!pts.size) moved = 0
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pts.size === 2) {
        const [a, b] = [...pts.values()]
        pinch0 = Math.hypot(a.x - b.x, a.y - b.y)
      }
    }
    const move = (e: PointerEvent) => {
      const prev = pts.get(e.pointerId)
      if (!prev) return
      const cur = { x: e.clientX, y: e.clientY }
      pts.set(e.pointerId, cur)
      moved += Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y)
      const { unit, place, zoomAt } = live.current
      if (pts.size === 1) {
        center.current = { x: center.current.x - (cur.x - prev.x) / unit, y: center.current.y - (cur.y - prev.y) / unit }
        place()
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinch0 > 0 && (d / pinch0 > 1.6 || d / pinch0 < 1 / 1.6)) {
          zoomAt(d > pinch0 ? 1 : -1, (a.x + b.x) / 2, (a.y + b.y) / 2)
          pinch0 = d
        }
      }
    }
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId)
      pinch0 = 0
      if (!pts.size) live.current.writeUrl()
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      wheel += e.deltaY
      if (Math.abs(wheel) >= 100) {
        live.current.zoomAt(wheel < 0 ? 1 : -1, e.clientX, e.clientY)
        wheel = 0
      }
    }
    const dbl = (e: MouseEvent) => {
      if (moved > 4) return
      live.current.zoomAt(e.shiftKey ? -1 : 1, e.clientX, e.clientY)
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('dblclick', dbl)
    return () => {
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
      center.current = { x: center.current.x + dx, y: center.current.y + dy }
      place()
      writeUrl()
    } else if (e.key === '+' || e.key === '=') zoomAt(1)
    else if (e.key === '-' || e.key === '_') zoomAt(-1)
  }

  const reset = () => {
    center.current = { x: MAP_W / 2, y: MAP_H / 2 }
    const next = overviewLevel(vp.w, vp.h, sandbox.size, vp.dpr)
    if (next === level) {
      place()
      writeUrl()
    } else setLevel(next)
  }

  const pick = <K extends keyof Sandbox>(key: K, value: Sandbox[K]) => {
    if (key === 'size') {
      // 픽셀 크기를 바꾸면 화면 배율이 가장 가까운 단계로 옮겨 같은 넓이를 본다
      const want = unit
      setLevel(nearestLevel(want, value as PixelSize, vp.dpr))
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
      }) as React.CSSProperties,
    [pal],
  )

  return (
    <div className="pixel-app" style={style} lang={lang}>
      <div
        ref={stageRef}
        className="pixel-stage"
        role="img"
        aria-label={t.map}
        tabIndex={0}
        onKeyDown={onKey}
      >
        <div ref={holderRef} className="pixel-holder" />
      </div>

      <header className="pixel-head">
        <h1>
          {t.title} <span className="pixel-badge">{t.badge}</span>
        </h1>
        <Choice label={t.palette} value={sandbox.palette} options={(['a', 'b', 'c'] as PaletteId[]).map((id) => [id, PALETTES[id].name[lang]])} onPick={(v) => pick('palette', v)} />
        <Choice label={t.size} value={sandbox.size} options={PIXEL_SIZES.map((s) => [s, `${s}×`])} onPick={(v) => pick('size', v)} />
        <Choice label={t.shore} value={sandbox.shore} options={(['dither', 'band', 'none'] as ShoreStyle[]).map((s) => [s, t.shores[s]])} onPick={(v) => pick('shore', v)} />
        <a ref={linkRef} className="pixel-link" href={mainMapHref(window.location.search, window.location.hash)}>
          {t.main}
        </a>
      </header>

      <div className="pixel-zoom">
        <button type="button" onClick={() => zoomAt(1)} disabled={level === LEVELS.length - 1} aria-label={t.zoomIn}>
          +
        </button>
        <button type="button" onClick={() => zoomAt(-1)} disabled={level === 0} aria-label={t.zoomOut}>
          −
        </button>
        <button type="button" onClick={reset} aria-label={t.reset}>
          ⌂
        </button>
        <span className="pixel-level">{t.level(LEVELS[level])}</span>
      </div>

      {drawing && (
        <p className="pixel-drawing" role="status">
          {t.drawing}
        </p>
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
