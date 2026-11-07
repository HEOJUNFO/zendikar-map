// 픽셀 아트 지도 (/pixel) — S2: 확대 단계(한 픽셀 = 16 … 0.25 단위)마다 256² 타일을 Worker 가 그리고, 화면 크기 캔버스에 정수 배율로 붙인다.
// 지금 지도(src/App.tsx)와 따로 빌드하는 페이지라 지금 지도의 모듈은 순수한 데이터·기하(geo.ts·geometry.ts)만 가져다 쓴다.
// 순서와 결정은 docs/pixel-plan.md.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
    badge: '시험판 S2',
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
    badge: 'Sandbox S2',
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

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** 붙잡아 둘 타일 수 — 데스크톱 256장(64MB), 휴대폰 96장(24MB) */
const cacheMax = () => (window.matchMedia('(max-width: 767px)').matches ? 96 : 256)

/** 개발 서버에서만 — 성능 도구(scripts/qa/pixel-perf.mjs)가 읽는다 */
interface PixelDebug {
  frames: number[]
  store: TileStore
  missing: number
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
    const slow = import.meta.env.DEV ? Math.max(1, Math.min(20, Number(new URLSearchParams(window.location.search).get('tileslow')) || 1)) : 1
    const s = new TileStore(schedule, cacheMax(), slow)
    store.current = s
    if (import.meta.env.DEV) window.__pixel = { frames: [], store: s, missing: 0 }
    schedule()
    return () => {
      s.close()
      store.current = null
      cancelAnimationFrame(frame.current)
      frame.current = 0
    }
  }, [schedule])
  useEffect(() => store.current?.setMax(cacheMax()), [vp])

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
    const u = LEVELS[level]
    const g = gridFor(MAP_W, MAP_H, u)
    // 지도가 화면보다 작으면 가운데에 두고, 크면 가운데 점이 지도 밖으로 나가지 않게
    const p = center.current
    p.x = g.w * dev <= W ? MAP_W / 2 : clamp(p.x, 0, MAP_W)
    p.y = g.h * dev <= H ? MAP_H / 2 : clamp(p.y, 0, MAP_H)
    // 기기 픽셀에 맞춘 원점 — 픽셀 경계가 화면 픽셀 사이에 걸리면 번진다
    const ox = Math.round(W / 2 - (p.x / u) * dev)
    const oy = Math.round(H / 2 - (p.y / u) * dev)
    ctx.fillStyle = pal.page
    ctx.fillRect(0, 0, W, H)

    const T = TILE * dev
    const ntx = Math.ceil(g.w / TILE)
    const nty = Math.ceil(g.h / TILE)
    const tx0 = Math.max(0, Math.floor(-ox / T))
    const tx1 = Math.min(ntx - 1, Math.floor((W - 1 - ox) / T))
    const ty0 = Math.max(0, Math.floor(-oy / T))
    const ty1 = Math.min(nty - 1, Math.floor((H - 1 - oy) / T))
    const keyAt = (lv: number, tx: number, ty: number) => tileKey(LEVELS[lv], tx, ty, sandbox.palette, sandbox.shore)
    const pinned: string[] = []
    let missing = 0
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
        // 더 거친 단계의 타일을 늘인다 (f 배) — 한 타일은 거친 타일 하나의 한 조각이다
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
        // 없으면 한 단계 고운 타일 넷을 줄인다 (축소한 직후)
        if (!filled && level + 1 < LEVELS.length) {
          for (let k = 0; k < 4; k++) {
            const cx = tx * 2 + (k & 1)
            const cy = ty * 2 + (k >> 1)
            const cb = s.get(keyAt(level + 1, cx, cy))
            if (!cb) continue
            pinned.push(keyAt(level + 1, cx, cy))
            ctx.drawImage(cb, dx + (k & 1) * (T / 2), dy + (k >> 1) * (T / 2), (cb.width * dev) / 2, (cb.height * dev) / 2)
          }
        }
      }
    }
    // 그릴 차례 — 화면 타일을 가운데에서 가까운 차례로, 그다음 한 칸 둘레 (옮길 때 미리)
    const ctx0 = (tx0 + tx1) / 2
    const cty0 = (ty0 + ty1) / 2
    const specs: (TileSpec & { d: number })[] = []
    for (let ty = Math.max(0, ty0 - 1); ty <= Math.min(nty - 1, ty1 + 1); ty++) {
      for (let tx = Math.max(0, tx0 - 1); tx <= Math.min(ntx - 1, tx1 + 1); tx++) {
        const ring = tx < tx0 || tx > tx1 || ty < ty0 || ty > ty1 ? 1000 : 0
        specs.push({
          key: keyAt(level, tx, ty),
          u,
          x0: tx * TILE,
          y0: ty * TILE,
          w: Math.min(TILE, g.w - tx * TILE),
          h: Math.min(TILE, g.h - ty * TILE),
          pal: sandbox.palette,
          shore: sandbox.shore,
          d: ring + Math.hypot(tx - ctx0, ty - cty0),
        })
      }
    }
    specs.sort((a, b) => a.d - b.d)
    s.pin([...pinned, ...specs.map((t) => t.key)])
    s.want(specs)
    if (statusRef.current) statusRef.current.hidden = missing === 0
    if (import.meta.env.DEV && window.__pixel) {
      window.__pixel.frames.push(performance.now() - t0)
      window.__pixel.missing = missing
    }
  }
  useLayoutEffect(() => {
    drawRef.current = draw
  })

  // 보기·팔레트·화면이 바뀌면 다시 그린다
  useLayoutEffect(schedule, [schedule, level, sandbox, vp])

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
    // 끌기·방향키는 React 로 다시 그리지 않으니 링크도 여기서 고친다
    if (linkRef.current) linkRef.current.href = mainMapHref(window.location.search, window.location.hash)
  }, [unit, vp, sandbox])
  useEffect(writeUrl, [writeUrl])

  /** 화면 점 (sx, sy) 를 붙잡고 단계를 바꾼다 */
  const zoomAt = useCallback(
    (dir: 1 | -1, sx = vp.w / 2, sy = vp.h / 2) => {
      const cur = levelNow.current
      const next = clamp(cur + dir, 0, LEVELS.length - 1)
      if (next === cur) return
      const u1 = cssPerUnit(cur, sandbox.size, vp.dpr)
      const p = center.current
      const mx = p.x + (sx - vp.w / 2) / u1
      const my = p.y + (sy - vp.h / 2) / u1
      const u2 = cssPerUnit(next, sandbox.size, vp.dpr)
      center.current = { x: mx - (sx - vp.w / 2) / u2, y: my - (sy - vp.h / 2) / u2 }
      goLevel(next)
    },
    [vp, sandbox.size, goLevel],
  )

  // 몸짓 처리기는 한 번만 단다 — 단계가 바뀔 때마다 다시 달면 진행 중인 핀치·끌기의 손가락을 잃는다. 최신 셈은 live 로 읽는다
  const live = useRef({ unitNow: () => unit, schedule, zoomAt, writeUrl })
  useLayoutEffect(() => {
    live.current = { unitNow: () => cssPerUnit(levelNow.current, sandbox.size, vp.dpr), schedule, zoomAt, writeUrl }
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
      const { unitNow, schedule, zoomAt } = live.current
      const unit = unitNow()
      if (pts.size === 1) {
        center.current = { x: center.current.x - (cur.x - prev.x) / unit, y: center.current.y - (cur.y - prev.y) / unit }
        schedule()
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
      schedule()
      writeUrl()
    } else if (e.key === '+' || e.key === '=') zoomAt(1)
    else if (e.key === '-' || e.key === '_') zoomAt(-1)
  }

  const reset = () => {
    center.current = { x: MAP_W / 2, y: MAP_H / 2 }
    const next = overviewLevel(vp.w, vp.h, sandbox.size, vp.dpr)
    if (next === levelNow.current) {
      schedule()
      writeUrl()
    } else goLevel(next)
  }

  const pick = <K extends keyof Sandbox>(key: K, value: Sandbox[K]) => {
    // 픽셀 크기를 바꾸면 화면 배율이 가장 가까운 단계로 옮겨 같은 넓이를 본다
    if (key === 'size') goLevel(nearestLevel(unit, value as PixelSize, vp.dpr))
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
      <div ref={stageRef} className="pixel-stage" role="img" aria-label={t.map} tabIndex={0} onKeyDown={onKey}>
        <canvas ref={canvasRef} className="pixel-canvas" aria-hidden="true" />
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

      <p ref={statusRef} className="pixel-drawing" role="status" hidden>
        {t.drawing}
      </p>
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
