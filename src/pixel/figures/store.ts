// 페이즈 그림 (S7, docs/pixel-plan.md) — 빌드할 때 단계마다 구운 그림(scripts/pixel/figures.mjs → virtual:pixel-figures·virtual:pixel-fig-<조각>)을
// 보이는 조각만 받아, 팔레트로 칠한 작은 캔버스로 바꿔 두고(그릴 때마다 칠하지 않게) 화면 캔버스에 그 단계의 픽셀 격자 그대로 붙인다.
// 그림은 색이 아니라 몫의 번호라 팔레트를 바꾸면 칠만 다시 한다. 누름 판정은 몫 번호(빈 픽셀이 아닌가)로 — 그림의 실제 모양.
import type { Palette, Rgb } from '../raster/palette'
import { isRampOutline } from './ramps'

/** scripts/pixel/figures.mjs 의 meta */
export interface FigureMeta {
  v: number
  levels: number[]
  minPx: number
  cell: Record<string, number>
  /** 지역 상세에 사는 대상을 그리는 단계 (S9) */
  detailLevel: number
  /** [id, 이름, 한국어판 이름 | 0, 세트, 페이즈, 자리가 추정이면 1, 가리키는 곳 (장소 id 나 continent/<id>), 장소와 하나인 카드(place)면 1] — 어느 시점에도 그리지 않는 카드까지 */
  cards: [string, string, string | 0, string, number, number, string, number][]
  /** [카드 번호, x, y, 크기, 뒤집힘, 상자 x0, y0, x1, y1, 지역 상세의 대상이면 1] (지도 단위 × 10) */
  places: [number, number, number, number, number, number, number, number, number, number][]
  /** 시점 → 그리는 차례대로 [자리 번호, 이름 쪽 | ''] */
  times: Record<string, [number, string][]>
  /** 시점 → 그 시점에 그리는 카드와 그 시점의 지역 상세 id (세계 지도 그림이면 0) — 지역 상세의 대상까지, 패널이 싣는다 */
  drawn: Record<string, [number, string | 0][]>
  /** 지역 상세 → 그 지역 상세와 그 위 지역 상세들의 장소 (그곳의 대상은 그 장소 패널에 실린다 — App.tsx 의 detailInPlace) */
  details: Record<string, string[]>
  /** 카드 id → 같은 개체의 묶음 (time.same — S22) */
  same: Record<string, string[]>
  chunks: string[]
}

/** 구운 그림 한 장 — [자리 번호, 단계, gx0, gy0, w, h, 몫 번호(쌍으로 줄인 base64)] */
export type SpriteRow = [number, number, number, number, number, number, string]

export interface Sprite {
  gx0: number
  gy0: number
  w: number
  h: number
  idx: Uint8Array
}

/** 그 시점에 그리는 그림 하나 */
export interface Fig {
  /** 자리 번호 (시점이 달라도 같은 자리면 같다) */
  pi: number
  /** 카드 id */
  id: string
  name: string
  nameKo?: string
  set: string
  phase: number
  est: boolean
  depicts: string
  at: [number, number]
  size: number
  box: { x0: number; y0: number; x1: number; y1: number }
  /** 데이터가 정한 이름 쪽 */
  label?: 'below' | 'right' | 'left' | 'above'
  /** 이 단계부터만 그린다 — 지역 상세에 사는 대상 (S9) */
  fromLevel?: number
}

export type ChunkLoaders = Record<string, () => Promise<{ default: SpriteRow[] }>>

/** 둘레 윤곽 (몫 16) */
const OUTLINE = 16
/** 고른 그림 — 굵은 윤곽과 둘레 윤곽을 고른 빛으로 (지도 기호의 고른 칠과 같은 노랑) */
const PICKED: Rgb = [0xf2, 0xc9, 0x4c]
// 고른 그림 — 먹선·굵은 먹선·안쪽 먹선·둘레 윤곽을 고른 빛으로 (지금 지도의 .figure.is-selected 의 fig-ink·fig-ink-bold — 객체 다듬기 B2: 테두리가 먹선인 그림은 윤곽이 없다)
// 21 은 물 위 둘레 윤곽 (R14b) — 고른 그림은 물 위에서도 고른 빛 테두리
const PICK_CLASSES = new Set([11, 12, 17, OUTLINE, 21, 25, 27])
/** 고른 빛·밤의 테두리가 따르는 윤곽 — 카드 색 그림의 램프 윤곽도 (C25) */
const isEdge = (v: number) => PICK_CLASSES.has(v) || isRampOutline(v)

/** 시점의 그림 목록 */
export function figuresAt(meta: FigureMeta, t: number): Fig[] {
  return (meta.times[t] ?? []).map(([pi, label]) => {
    const [ci, x, y, s, , bx0, by0, bx1, by1, detail] = meta.places[pi]
    const [id, name, nameKo, set, phase, est, depicts] = meta.cards[ci]
    return {
      pi,
      id,
      name,
      ...(nameKo ? { nameKo } : {}),
      set,
      phase,
      est: est === 1,
      depicts,
      at: [x / 10, y / 10],
      size: s / 10,
      box: { x0: bx0 / 10, y0: by0 / 10, x1: bx1 / 10, y1: by1 / 10 },
      ...(label ? { label: label as Fig['label'] } : {}),
      ...(detail ? { fromLevel: meta.detailLevel } : {}),
    }
  })
}

/** 그 단계에 그리는가 — 그 단계 픽셀로 minPx 이상이고, 화면에서 14px 이상 (지금 지도의 FIGURE_MIN_PX) */
export const figureShownAt = (f: { size: number }, u: number, cssPerUnit: number, minPx: number) => f.size / u >= minPx && f.size * cssPerUnit >= 14

function decode(b64: string, n: number): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(n)
  let k = 0
  for (let i = 0; i + 1 < bin.length; i += 2) {
    const v = bin.charCodeAt(i)
    const len = bin.charCodeAt(i + 1)
    out.fill(v, k, k + len)
    k += len
  }
  return out
}

export class FigureStore {
  readonly meta: FigureMeta
  private readonly loaders: ChunkLoaders
  private readonly onReady: () => void
  private readonly rows = new Map<string, SpriteRow>()
  private readonly sprites = new Map<string, Sprite>()
  private readonly loading = new Map<string, Promise<void>>()
  /** 칠한 캔버스 — 열쇠 `자리|단계|팔레트|고름`, 넣은 차례가 쓴 차례 (LRU) */
  private readonly painted = new Map<string, HTMLCanvasElement>()
  private paintedBytes = 0
  private readonly maxBytes: number

  constructor(meta: FigureMeta, loaders: ChunkLoaders, onReady: () => void, maxBytes = 32 * 1024 * 1024) {
    this.meta = meta
    this.loaders = loaders
    this.onReady = onReady
    this.maxBytes = maxBytes
  }

  /** 단계 li 에서 지도 상자(지도 단위)에 닿는 그림 조각을 받는다 — 칸으로 나눈 단계는 그림 크기(100 단위)만큼 넓혀 본다 */
  want(li: number, x0: number, y0: number, x1: number, y1: number): void {
    const cell = this.meta.cell[li]
    const keys: string[] = []
    if (!cell) keys.push(`${li}`)
    else {
      const pad = 100
      for (let cy = Math.floor((y0 - pad) / cell); cy <= Math.floor((y1 + pad) / cell); cy++)
        for (let cx = Math.floor((x0 - pad) / cell); cx <= Math.floor((x1 + pad) / cell); cx++) keys.push(`${li}-${cx}-${cy}`)
    }
    for (const k of keys) {
      if (this.loading.has(k) || !this.loaders[k]) continue
      const p = this.loaders[k]()
        .then((m) => {
          for (const r of m.default) this.rows.set(`${r[0]}|${r[1]}`, r)
          this.onReady()
        })
        .catch(() => {
          // 다음에 다시 청한다
          this.loading.delete(k)
        })
      this.loading.set(k, p)
    }
  }

  /** 자리 pi 의 단계 li 그림 (조각이 왔으면) */
  sprite(pi: number, li: number): Sprite | undefined {
    const key = `${pi}|${li}`
    let s = this.sprites.get(key)
    if (s) return s
    const r = this.rows.get(key)
    if (!r) return undefined
    s = { gx0: r[2], gy0: r[3], w: r[4], h: r[5], idx: decode(r[6], r[4] * r[5]) }
    this.sprites.set(key, s)
    return s
  }

  /** 팔레트로 칠한 그림 — 고른 그림은 윤곽을 고른 빛으로 */
  canvas(pi: number, li: number, pal: Palette, picked: boolean): HTMLCanvasElement | undefined {
    const key = `${pi}|${li}|${pal.id}|${picked ? 1 : 0}`
    const hit = this.painted.get(key)
    if (hit) {
      this.painted.delete(key)
      this.painted.set(key, hit)
      return hit
    }
    const s = this.sprite(pi, li)
    if (!s) return undefined
    // 테두리(figRim — 밤)가 있으면 사방 한 픽셀 넓혀 윤곽(16) 밖의 빈 칸에 칠한다 — 그리는 쪽은 넓힌 몫만큼 비켜 그린다 (rimPad)
    const rim = pal.figRim
    const pad = rim ? 1 : 0
    const W = s.w + 2 * pad
    const H = s.h + 2 * pad
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const ctx = c.getContext('2d')!
    const img = ctx.createImageData(W, H)
    const set = (x: number, y: number, col: Rgb) => {
      const o = (y * W + x) * 4
      img.data[o] = col[0]
      img.data[o + 1] = col[1]
      img.data[o + 2] = col[2]
      img.data[o + 3] = 255
    }
    for (let i = 0; i < s.idx.length; i++) {
      const v = s.idx[i]
      if (!v) continue
      set((i % s.w) + pad, Math.floor(i / s.w) + pad, picked && isEdge(v) ? PICKED : pal.fig[v])
    }
    if (rim) {
      const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < s.w && y < s.h ? s.idx[y * s.w + x] : 0)
      for (let y = -1; y <= s.h; y++)
        for (let x = -1; x <= s.w; x++) {
          if (at(x, y)) continue
          // 둘레 윤곽(16)과 작은 그림의 짙은 실루엣(27 — R65) 밖에
          if ([at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].some((v) => v === 16 || v === 27 || isRampOutline(v))) set(x + pad, y + pad, rim)
        }
    }
    ctx.putImageData(img, 0, 0)
    this.painted.set(key, c)
    this.paintedBytes += W * H * 4
    for (const [k, v] of this.painted) {
      if (this.paintedBytes <= this.maxBytes) break
      this.painted.delete(k)
      this.paintedBytes -= v.width * v.height * 4
    }
    return c
  }

  /** 단계 격자의 칸 (gx, gy) 가 그림의 칠한 픽셀인가 — 둘레 slop 픽셀 안에 칠한 픽셀이 있으면 그 거리, 없으면 -1 */
  hitDistance(pi: number, li: number, gx: number, gy: number, slop: number): number {
    const s = this.sprite(pi, li)
    if (!s) return -1
    const lx = gx - s.gx0
    const ly = gy - s.gy0
    if (lx < -slop || ly < -slop || lx >= s.w + slop || ly >= s.h + slop) return -1
    let best = -1
    const r = Math.ceil(slop)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const x = lx + dx
        const y = ly + dy
        if (x < 0 || y < 0 || x >= s.w || y >= s.h || !s.idx[y * s.w + x]) continue
        const d = Math.hypot(dx, dy)
        if (d <= slop && (best < 0 || d < best)) best = d
      }
    return best
  }
}
