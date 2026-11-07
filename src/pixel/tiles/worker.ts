// 타일을 그리는 Worker — 칸을 채우고 칠한 뒤 ImageBitmap 으로 보낸다 (OffscreenCanvas 가 없으면 RGBA 를 보내 주 스레드가 만든다).
// 바탕 지형(S4)은 빌드할 때 뽑은 조각 virtual:pixel-terrain (vite/pixelTerrain.ts) — Worker 마다 한 번 풀어 둔다.
import terrainData from 'virtual:pixel-terrain'
import { fxBox } from '../fx/effects'
import { PALETTES, type PaletteId } from '../raster/palette'
import { decodePeriod, type PeriodDecoded, type PixelPeriod } from '../raster/period'
import { attachFine, decodeTerrain, FINE_FROM, withPeriod, type FxSpot } from '../raster/terrain'
import { renderTile, type ShoreStyle } from '../raster/world'
import { ringsFor } from '../rings'

export interface TileJob {
  id: number
  u: number
  x0: number
  y0: number
  w: number
  h: number
  pal: PaletteId
  shore: ShoreStyle
  /** 바탕 지형을 그린다 (시험 스위치 ?terrain=0 이면 S2 의 바탕만) */
  terrain: boolean
  /** 시점별 바탕(S6)의 단계 — 그 시점의 바뀐 자리에 닿는 타일만 (닿지 않는 타일은 바탕 타일을 함께 쓴다) */
  period?: number
  /** 흩뿌린 기호가 비키는 이름 상자 [x0, y0, x1, y1] (지도 단위) — 이 타일에 닿는 것만 */
  holes?: Float32Array
  /** 개발 서버의 성능 시험만 — 같은 타일을 이만큼 그려 느린 기기를 흉내 낸다 (CDP 의 CPU 제한은 Worker 에 닿지 않는다) */
  repeat?: number
}

/** 다 그린 타일 — fx 는 그 타일에 그린 움직이는 효과의 자리 (S5). failed 면 그리지 못했다 (시점별 바탕 조각을 받지 못함 — 창고는 담지 않는다) */
export type TileReply = { id: number; ms: number; fx: FxSpot[] } & ({ bmp: ImageBitmap } | { buf: ArrayBuffer; w: number; h: number } | { failed: true })

interface WorkerScope {
  onmessage: ((e: MessageEvent<TileJob>) => void) | null
  postMessage(m: TileReply, transfer: Transferable[]): void
}
const scope = self as unknown as WorkerScope

/** 첫 타일을 보낸 뒤 한가할 때 깊은 단계의 고리(deepRings)를 미리 만든다 — 처음 깊이 확대할 때 그 타일 앞에 붙던 일 */
let warmed = false

/** 깊은 확대의 기호 조각 — 그 단계의 타일을 처음 그릴 때 받는다 (받지 못하면 세계 지도 축척의 기호로 그린다) */
let fine: Promise<void> | null = null
const loadFine = () =>
  (fine ??= import('virtual:pixel-terrain-fine')
    .then((m) => attachFine(decodeTerrain(terrainData), terrainData, m.default))
    .catch(() => undefined))

/** 시점별 바탕 조각 — 단계마다 그 시점의 타일을 처음 그릴 때 받는다 (vite/pixelTerrain.ts). 받지 못하면 null (그 타일은 실패로 돌려 바탕을 시점의 열쇠로 담지 않는다) */
const PERIOD_CHUNKS: Record<number, () => Promise<{ default: PixelPeriod }>> = {
  2: () => import('virtual:pixel-period-2'),
  3: () => import('virtual:pixel-period-3'),
  4: () => import('virtual:pixel-period-4'),
  5: () => import('virtual:pixel-period-5'),
  8: () => import('virtual:pixel-period-8'),
}
const periods = new Map<number, Promise<PeriodDecoded | null>>()
const loadPeriod = (level: number) => {
  let p = periods.get(level)
  if (!p) {
    const load = PERIOD_CHUNKS[level]
    p = load
      ? load()
          .then((m) => decodePeriod(m.default, terrainData.kinds, terrainData.hatch.length / 4))
          .catch(() => {
            periods.delete(level)
            return null
          })
      : Promise.resolve(null)
    periods.set(level, p)
  }
  return p
}

scope.onmessage = async (e) => {
  const job = e.data
  if (job.terrain && job.u <= FINE_FROM) await loadFine()
  const period = job.terrain && job.period ? await loadPeriod(job.period) : null
  if (job.terrain && job.period && !period) {
    scope.postMessage({ id: job.id, ms: 0, fx: [], failed: true }, [])
    return
  }
  if (!warmed) {
    warmed = true
    setTimeout(() => ringsFor(0.5), 0)
  }
  const t0 = performance.now()
  const fx: FxSpot[] = []
  const base = job.terrain ? decodeTerrain(terrainData) : undefined
  const opt = { shore: job.shore, terrain: base && period ? withPeriod(base, period, terrainData.kinds) : base, holes: job.holes, fx, fxBox }
  let px = renderTile(ringsFor(job.u), job.u, job, PALETTES[job.pal], opt)
  for (let i = 1; i < (job.repeat ?? 1); i++) px = renderTile(ringsFor(job.u), job.u, job, PALETTES[job.pal], { ...opt, fx: [] })
  if (typeof OffscreenCanvas !== 'undefined') {
    const c = new OffscreenCanvas(job.w, job.h)
    c.getContext('2d')!.putImageData(new ImageData(px, job.w, job.h), 0, 0)
    const bmp = c.transferToImageBitmap()
    scope.postMessage({ id: job.id, ms: performance.now() - t0, fx, bmp }, [bmp, ...fx.flatMap((s) => (s.bg ? [s.bg.px.buffer] : []))])
  } else {
    scope.postMessage({ id: job.id, ms: performance.now() - t0, fx, buf: px.buffer, w: job.w, h: job.h }, [px.buffer, ...fx.flatMap((s) => (s.bg ? [s.bg.px.buffer] : []))])
  }
}
