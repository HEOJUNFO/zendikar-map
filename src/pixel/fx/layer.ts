// 움직이는 효과의 층 (S5, docs/pixel-plan.md) — 폭포·용암·소용돌이·간헐천.
// 효과는 타일에 구운 그림(src/pixel/raster/terrainSprites.ts)을 그 자리에서 움직이게 한 것이다: 효과마다 한 고리(12fps)의 프레임을 pixelfx 로 한 번 그려
// 작은 캔버스에 구워 두고(bake), 그리는 동안은 drawImage 만 한다. 자리는 타일 Worker 가 그 타일에 그린 효과의 기준점(FxSpot — 데이터 id 가 붙는다)이라,
// 이름 상자에 비켜 빠졌거나 솎인 기호에는 효과가 없다. 지도가 움직이면(확대) 숨기고, 보이는 효과가 없거나·탭이 숨었거나·움직임 줄이기면 시계를 돌리지 않는다.
import { clearFrame, composite, createFrame, painterFor } from '../vendor/pixelfx/index.js'
import type { Palette, Rgb } from '../raster/palette'
import type { FxSpot } from '../raster/terrain'

/** 효과의 프레임 빠르기 — 픽셀 아트의 손그림 움직임 (D6) */
export const FX_FPS = 12

interface FxMeta {
  name: string
  basedOn?: string
  size: [number, number]
  origin: [number, number]
  duration: number
  options?: Record<string, unknown>
  variants?: Record<string, { size: [number, number]; origin: [number, number] }>
}

/** 지도 크기로 고친 pixelfx 효과 (src/pixel/fx/effects/*.js) */
export interface FxModule {
  meta: FxMeta
  draw(p: unknown, t: number, o: Record<string, unknown>): void
  drawBack?(p: unknown, t: number, o: Record<string, unknown>): void
  variant?(name: string): FxModule
}

interface Baked {
  w: number
  h: number
  /** 기준점 픽셀이 프레임의 어디인가 */
  ox: number
  oy: number
  frames: HTMLCanvasElement[]
}

const hex = (c: Rgb) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`

/** 효과가 쓰는 색 — 팔레트의 지형 색과 물·땅 색 (terrainSprites.ts 의 INK 와 같은 이름) */
export function fxColors(pal: Palette): Record<string, string> {
  return {
    ...Object.fromEntries(Object.entries(pal.t).map(([k, c]) => [k, hex(c as Rgb)])),
    land: hex(pal.land),
    landShade: hex(pal.landShade),
    shallow: hex(pal.shallow),
    mid: hex(pal.mid),
    deep: hex(pal.deep),
    seaFoam: hex(pal.foam),
  }
}

/** RGBA 를 돌린다 — terrainSprites.ts 의 turnSprite 와 같은 셈 (turn 1: 아래로 떨어지던 것을 오른쪽으로, 2: 왼쪽으로) */
function turnRgba(src: Uint8ClampedArray, w: number, h: number, turn: number): { px: Uint8ClampedArray; w: number; h: number } {
  if (!turn) return { px: src, w, h }
  const out = new Uint8ClampedArray(src.length)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      // turn 1: 새 (x', y') = (y, w - 1 - x) · turn 2: 새 (x', y') = (h - 1 - y, x) — 새 폭은 h
      const nx = turn === 1 ? y : h - 1 - y
      const ny = turn === 1 ? w - 1 - x : x
      out.set(src.subarray((y * w + x) * 4, (y * w + x) * 4 + 4), (ny * h + nx) * 4)
    }
  return { px: out, w: h, h: w }
}

/** 효과 한 갈래의 한 고리를 굽는다 */
export function bake(mod: FxModule, colors: Record<string, string>, variant: string | null, turn: number, extra?: Record<string, unknown>): Baked {
  const m = variant && mod.variant ? mod.variant(variant) : mod
  const v = variant ? m.meta.variants?.[variant] : undefined
  const [w, h] = v?.size ?? m.meta.size
  const [ox, oy] = v?.origin ?? m.meta.origin
  const n = Math.max(1, Math.round(m.meta.duration * FX_FPS))
  const frame = createFrame(w, h)
  const opts = { ...(m.meta.options ?? {}), colors, ...(variant ? { variant } : {}), seed: (m.meta.options?.seed as number) ?? 1, ...extra }
  const frames: HTMLCanvasElement[] = []
  for (let i = 0; i < n; i++) {
    clearFrame(frame)
    const p = painterFor(frame)
    p.place(ox, oy)
    const t = i / FX_FPS
    m.drawBack?.(p, t, opts)
    m.draw(p, t, opts)
    const rgba = composite(frame, new Uint8ClampedArray(w * h * 4), null) as Uint8ClampedArray
    const r = turnRgba(rgba, w, h, turn)
    const c = document.createElement('canvas')
    c.width = r.w
    c.height = r.h
    c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(r.px), r.w, r.h), 0, 0)
    frames.push(c)
  }
  const o = turn === 1 ? { ox: oy, oy: w - 1 - ox } : turn === 2 ? { ox: h - 1 - oy, oy: ox } : { ox, oy }
  return { w: turn ? h : w, h: turn ? w : h, ...o, frames }
}

/** 화면에 놓인 효과 하나 — 기준점 픽셀의 왼쪽 위 (기기 px) */
export interface PlacedFx {
  spot: FxSpot
  sx: number
  sy: number
}

/** 효과 밑의 바탕 (타일 Worker 가 기호를 찍기 전에 뜬 것) — 자리마다 한 번 캔버스로 */
const bgCanvas = new WeakMap<FxSpot, HTMLCanvasElement | null>()
function bgOf(s: FxSpot): HTMLCanvasElement | null {
  if (bgCanvas.has(s)) return bgCanvas.get(s)!
  let c: HTMLCanvasElement | null = null
  if (s.bg) {
    c = document.createElement('canvas')
    c.width = s.bg.w
    c.height = s.bg.h
    c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(s.bg.px), s.bg.w, s.bg.h), 0, 0)
  }
  bgCanvas.set(s, c)
  return c
}

/** 한 자리의 몫을 모은다 — 몫이 하나라도 깨끗하지 않거나 기준점의 몫(main)이 없으면 그 자리는 그리지 않는다 (타일의 멈춘 그림 그대로) */
function groupFx(placed: PlacedFx[]): { main: PlacedFx; parts: PlacedFx[] }[] {
  const by = new Map<string, PlacedFx[]>()
  for (const p of placed) {
    const key = `${p.spot.k}|${p.spot.x}|${p.spot.y}|${p.spot.v}`
    const g = by.get(key)
    if (g) g.push(p)
    else by.set(key, [p])
  }
  const out: { main: PlacedFx; parts: PlacedFx[] }[] = []
  for (const parts of by.values()) {
    const main = parts.find((p) => p.spot.main)
    if (main && parts.every((p) => p.spot.clean)) out.push({ main, parts })
  }
  return out
}

const phaseOf = (s: FxSpot) => {
  let h = 2166136261
  for (const ch of `${s.id}:${s.x}:${s.y}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

export class FxLayer {
  private readonly canvas: HTMLCanvasElement
  private readonly modules: Record<FxSpot['k'], FxModule>
  private colors: Record<string, string>
  private readonly baked = new Map<string, Baked>()
  /** 그릴 효과 — 한 자리의 몫(타일마다 하나)을 모은 것, 모두 깨끗하고 기준점의 몫이 있는 것만 */
  private groups: { main: PlacedFx; parts: PlacedFx[] }[] = []
  /** 마지막으로 받은 자리 — 움직임 줄이기를 풀면 다시 그린다 */
  private last: { placed: PlacedFx[]; dev: number; W: number; H: number } | null = null
  private readonly motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  private dev = 1
  private timer = 0
  private drawn = false
  /** 시험 고리 (PixelApp 의 ?perf) — 시계가 돈 수 */
  ticks = 0

  constructor(canvas: HTMLCanvasElement, modules: Record<FxSpot['k'], FxModule>, pal: Palette) {
    this.canvas = canvas
    this.modules = modules
    this.colors = fxColors(pal)
    document.addEventListener('visibilitychange', this.onVisibility)
    this.motion.addEventListener('change', this.onMotion)
  }

  dispose(): void {
    window.clearTimeout(this.timer)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.motion.removeEventListener('change', this.onMotion)
  }

  /** 움직임 줄이기를 켜고 끄면 지도를 다시 그리지 않아도 따른다 — 켜면 지우고 멈추고, 끄면 마지막 자리로 다시 */
  private readonly onMotion = () => {
    const l = this.last
    if (l) this.show(l.placed, l.dev, l.W, l.H)
    else this.hide()
  }

  setPalette(pal: Palette): void {
    this.colors = fxColors(pal)
    this.baked.clear()
  }

  private get still(): boolean {
    return this.motion.matches
  }

  /** 지금 화면의 효과 — 지도를 그릴 때마다 (끌기도). 바로 그리고, 보이는 것이 있으면 시계를 돌린다 */
  show(placed: PlacedFx[], dev: number, W: number, H: number): void {
    const c = this.canvas
    if (c.width !== W || c.height !== H) {
      c.width = W
      c.height = H
    }
    this.last = { placed, dev, W, H }
    this.groups = this.still ? [] : groupFx(placed)
    this.dev = dev
    this.paint(performance.now())
    this.arm()
  }

  /** 지도가 움직이는 동안(확대) — 지우고 멈춘다 */
  hide(): void {
    this.groups = []
    this.last = null
    window.clearTimeout(this.timer)
    this.timer = 0
    if (this.drawn) {
      this.canvas.getContext('2d')!.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.drawn = false
    }
  }

  get visible(): number {
    return this.groups.length
  }

  private readonly onVisibility = () => {
    if (document.hidden) {
      window.clearTimeout(this.timer)
      this.timer = 0
    } else this.arm()
  }

  /** 다음 프레임 경계에 — 보이는 효과가 없거나 탭이 숨었으면 돌리지 않는다 (CPU ≈ 0) */
  private arm(): void {
    if (this.timer || !this.groups.length || document.hidden) return
    const step = 1000 / FX_FPS
    const now = performance.now()
    this.timer = window.setTimeout(() => {
      this.timer = 0
      this.ticks++
      this.paint(performance.now())
      this.arm()
    }, step - (now % step) + 1)
  }

  private bakedFor(s: FxSpot): Baked | null {
    const key = `${s.k}|${s.v}`
    let b = this.baked.get(key)
    if (!b) {
      const mod = this.modules[s.k]
      if (!mod) return null
      const variant = s.k === 'geyser' && (s.v & 1) === 1 ? 'small' : null
      const turn = s.k === 'waterfall' ? s.v : 0
      // 간헐천의 솟구침 — v 의 둘째·셋째 비트 (terrain.ts 의 GEYSER_ERUPT)
      const erupt = s.k === 'geyser' ? ((s.v & 2) ? 'water' : (s.v & 4) ? 'magma' : null) : undefined
      b = bake(mod, this.colors, variant, turn, erupt === undefined ? undefined : { erupt })
      this.baked.set(key, b)
    }
    return b
  }

  private paint(now: number): void {
    const ctx = this.canvas.getContext('2d')!
    if (this.drawn) ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.drawn = false
    if (!this.groups.length) return
    ctx.imageSmoothingEnabled = false
    const tick = Math.floor(now / (1000 / FX_FPS))
    const d = this.dev
    for (const { main, parts } of this.groups) {
      const b = this.bakedFor(main.spot)
      if (!b) continue
      // 정수 배로 키운 효과 (R84 — terrain.ts 의 spot): 기준 픽셀이 키운 칸의 왼쪽 밑, 프레임은 가장 가까운 픽셀로 키운다 (imageSmoothing 끔)
      const z = main.spot.z ?? 1
      const x = main.sx - b.ox * z * d
      const y = main.sy - (b.oy * z + z - 1) * d
      // 바탕 — 상자가 걸친 타일마다의 몫 (기호를 찍기 전의 모습, 이미 키운 상자), 그 위에 프레임
      for (const p of parts) {
        const bg = bgOf(p.spot)
        if (bg) ctx.drawImage(bg, x, y, bg.width * d, bg.height * d)
      }
      ctx.drawImage(b.frames[(tick + phaseOf(main.spot)) % b.frames.length], x, y, b.w * z * d, b.h * z * d)
    }
    this.drawn = true
  }
}
