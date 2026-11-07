// 타일을 그리는 Worker — 칸을 채우고 칠한 뒤 ImageBitmap 으로 보낸다 (OffscreenCanvas 가 없으면 RGBA 를 보내 주 스레드가 만든다).
import { PALETTES, type PaletteId } from '../raster/palette'
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
  /** 개발 서버의 성능 시험만 — 같은 타일을 이만큼 그려 느린 기기를 흉내 낸다 (CDP 의 CPU 제한은 Worker 에 닿지 않는다) */
  repeat?: number
}

export type TileReply = { id: number; ms: number } & ({ bmp: ImageBitmap } | { buf: ArrayBuffer; w: number; h: number })

interface WorkerScope {
  onmessage: ((e: MessageEvent<TileJob>) => void) | null
  postMessage(m: TileReply, transfer: Transferable[]): void
}
const scope = self as unknown as WorkerScope

scope.onmessage = (e) => {
  const job = e.data
  const t0 = performance.now()
  let px = renderTile(ringsFor(job.u), job.u, job, PALETTES[job.pal], { shore: job.shore })
  for (let i = 1; i < (job.repeat ?? 1); i++) px = renderTile(ringsFor(job.u), job.u, job, PALETTES[job.pal], { shore: job.shore })
  if (typeof OffscreenCanvas !== 'undefined') {
    const c = new OffscreenCanvas(job.w, job.h)
    c.getContext('2d')!.putImageData(new ImageData(px, job.w, job.h), 0, 0)
    const bmp = c.transferToImageBitmap()
    scope.postMessage({ id: job.id, ms: performance.now() - t0, bmp }, [bmp])
  } else {
    scope.postMessage({ id: job.id, ms: performance.now() - t0, buf: px.buffer, w: job.w, h: job.h }, [px.buffer])
  }
}
