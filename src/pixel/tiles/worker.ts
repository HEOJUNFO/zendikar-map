// 타일을 그리는 Worker — 칸을 채우고 칠한 뒤 ImageBitmap 으로 보낸다 (OffscreenCanvas 가 없으면 RGBA 를 보내 주 스레드가 만든다).
// 바탕 지형(S4)은 빌드할 때 뽑은 조각 virtual:pixel-terrain (vite/pixelTerrain.ts) — Worker 마다 한 번 풀어 둔다.
import terrainData from 'virtual:pixel-terrain'
import { PALETTES, type PaletteId } from '../raster/palette'
import { decodeTerrain } from '../raster/terrain'
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
  /** 흩뿌린 기호가 비키는 이름 상자 [x0, y0, x1, y1] (지도 단위) — 이 타일에 닿는 것만 */
  holes?: Float32Array
  /** 개발 서버의 성능 시험만 — 같은 타일을 이만큼 그려 느린 기기를 흉내 낸다 (CDP 의 CPU 제한은 Worker 에 닿지 않는다) */
  repeat?: number
}

export type TileReply = { id: number; ms: number } & ({ bmp: ImageBitmap } | { buf: ArrayBuffer; w: number; h: number })

interface WorkerScope {
  onmessage: ((e: MessageEvent<TileJob>) => void) | null
  postMessage(m: TileReply, transfer: Transferable[]): void
}
const scope = self as unknown as WorkerScope

/** 첫 타일을 보낸 뒤 한가할 때 깊은 단계의 고리(deepRings)를 미리 만든다 — 처음 깊이 확대할 때 그 타일 앞에 붙던 일 */
let warmed = false

scope.onmessage = (e) => {
  const job = e.data
  if (!warmed) {
    warmed = true
    setTimeout(() => ringsFor(0.5), 0)
  }
  const t0 = performance.now()
  const opt = { shore: job.shore, terrain: job.terrain ? decodeTerrain(terrainData) : undefined, holes: job.holes }
  let px = renderTile(ringsFor(job.u), job.u, job, PALETTES[job.pal], opt)
  for (let i = 1; i < (job.repeat ?? 1); i++) px = renderTile(ringsFor(job.u), job.u, job, PALETTES[job.pal], opt)
  if (typeof OffscreenCanvas !== 'undefined') {
    const c = new OffscreenCanvas(job.w, job.h)
    c.getContext('2d')!.putImageData(new ImageData(px, job.w, job.h), 0, 0)
    const bmp = c.transferToImageBitmap()
    scope.postMessage({ id: job.id, ms: performance.now() - t0, bmp }, [bmp])
  } else {
    scope.postMessage({ id: job.id, ms: performance.now() - t0, buf: px.buffer, w: job.w, h: job.h }, [px.buffer])
  }
}
