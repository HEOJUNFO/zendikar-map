// 타일 창고 — Worker 몇 개에 타일 그리기를 나눠 맡기고, 다 그린 ImageBitmap 을 LRU 로 붙잡아 둔다 (docs/pixel-plan.md S2).
// 요청은 화면이 바뀔 때마다 통째로 바꾼다: 아직 보내지 않은 옛 요청은 버리고, 새 목록의 앞(화면 가운데 가까운 것)부터 보낸다.
import type { PaletteId } from '../raster/palette'
import type { ShoreStyle } from '../raster/world'
import type { TileJob, TileReply } from './worker'

/** 타일 한 변 (픽셀) */
export const TILE = 256

export interface TileSpec {
  key: string
  u: number
  x0: number
  y0: number
  w: number
  h: number
  pal: PaletteId
  shore: ShoreStyle
  /** 바탕 지형을 그린다 (S4) */
  terrain: boolean
  /** 이 타일에 닿는 이름 상자 — 보낼 때 센다 (worker.ts 의 TileJob.holes) */
  holes?: () => Float32Array
}

/**
 * 타일 열쇠 — tag 는 바탕 지형을 그리는지와, 그리면 이름 상자를 정하는 것(언어·한 픽셀의 크기·DPR — 이름 배치가 이것으로 정해진다).
 * 같은 단계라도 이름 자리가 다르면 기호가 비키는 자리가 달라 다른 타일이다
 */
export const tileKey = (u: number, tx: number, ty: number, pal: PaletteId, shore: ShoreStyle, tag = '') => `${u}|${tx}|${ty}|${pal}|${shore}|${tag}`

export interface TileStats {
  drawn: number
  ms: number[]
}

export class TileStore {
  private readonly cache = new Map<string, ImageBitmap>()
  /** 타일이 온 시각 (performance.now) — 갓 온 타일만 짙어지며 나온다 (PixelApp 의 draw) */
  private readonly born = new Map<string, number>()
  private readonly workers: { w: Worker; busy: string | null }[] = []
  private queue: TileSpec[] = []
  private readonly inflight = new Set<string>()
  private readonly jobs = new Map<number, TileSpec>()
  private nextId = 1
  private closed = false
  readonly stats: TileStats = { drawn: 0, ms: [] }

  private readonly onReady: () => void
  private max: number

  /** max: 붙잡아 둘 타일 수 (한 장 256² × 4 바이트 = 256KB) */
  /** 개발 서버의 성능 시험만 (worker.ts 의 TileJob.repeat) */
  private readonly repeat: number

  constructor(onReady: () => void, max: number, repeat = 1, workers = Math.min(3, Math.max(1, (navigator.hardwareConcurrency || 2) - 1))) {
    this.onReady = onReady
    this.max = max
    this.repeat = repeat
    for (let i = 0; i < workers; i++) {
      const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
      const slot = { w, busy: null as string | null }
      w.onmessage = (e: MessageEvent<TileReply>) => this.done(slot, e.data)
      this.workers.push(slot)
    }
  }

  get(key: string): ImageBitmap | undefined {
    const b = this.cache.get(key)
    if (b) {
      // 최근에 쓴 것을 뒤로 (Map 은 넣은 차례를 지킨다)
      this.cache.delete(key)
      this.cache.set(key, b)
    }
    return b
  }

  /** 이 목록을 앞에서부터 그린다 — 이미 있거나 그리는 중인 것은 건너뛴다 */
  want(list: TileSpec[]): void {
    this.queue = list.filter((t) => !this.cache.has(t.key) && !this.inflight.has(t.key))
    this.pump()
  }

  /**
   * 지금 그리기가 쓰거나 바라는 열쇠(화면·미리 받을 둘레·늘여 채운 거친 타일) — LRU 가 이것은 버리지 않는다.
   * 바라는 타일을 버리면 다음 그리기가 그것을 다시 청해 끝없이 다시 그리게 된다 (화면이 상한보다 많은 타일을 쓸 때) —
   * 그때는 상한을 넘겨서라도 붙잡는다 (화면 크기만큼으로 묶인다)
   */
  private pinned = new Set<string>()
  pin(keys: Iterable<string>): void {
    this.pinned = new Set(keys)
  }

  /** 붙잡을 타일 수를 바꾼다 (화면 크기가 휴대폰 ↔ 데스크톱으로 바뀔 때) */
  setMax(max: number): void {
    this.max = max
    this.evict()
  }

  /** 그 타일이 온 시각 — 없으면 아주 옛날 */
  bornAt(key: string): number {
    return this.born.get(key) ?? -1e9
  }

  get size(): number {
    return this.cache.size
  }

  close(): void {
    this.closed = true
    for (const s of this.workers) s.w.terminate()
    for (const b of this.cache.values()) b.close()
    this.cache.clear()
    this.born.clear()
  }

  private pump(): void {
    for (const slot of this.workers) {
      if (slot.busy) continue
      const t = this.queue.shift()
      if (!t) return
      const id = this.nextId++
      this.jobs.set(id, t)
      this.inflight.add(t.key)
      slot.busy = t.key
      const job: TileJob = { id, u: t.u, x0: t.x0, y0: t.y0, w: t.w, h: t.h, pal: t.pal, shore: t.shore, terrain: t.terrain, holes: t.holes?.(), repeat: this.repeat }
      slot.w.postMessage(job)
    }
  }

  private async done(slot: { busy: string | null }, r: TileReply): Promise<void> {
    slot.busy = null
    const t = this.jobs.get(r.id)
    this.jobs.delete(r.id)
    if (this.closed || !t) return
    const bmp = 'bmp' in r ? r.bmp : await createImageBitmap(new ImageData(new Uint8ClampedArray(r.buf), r.w, r.h))
    this.inflight.delete(t.key)
    if (this.closed) {
      bmp.close()
      return
    }
    this.cache.set(t.key, bmp)
    this.born.set(t.key, performance.now())
    this.stats.drawn++
    this.stats.ms.push(r.ms)
    this.evict()
    this.pump()
    this.onReady()
  }

  private evict(): void {
    if (this.cache.size <= this.max) return
    for (const [k, b] of this.cache) {
      if (this.cache.size <= this.max) break
      if (this.pinned.has(k)) continue
      b.close()
      this.cache.delete(k)
      this.born.delete(k)
    }
  }
}
