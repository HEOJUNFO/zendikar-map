// 지도 크기로 고친 pixelfx 효과의 목록 (S5) — 효과 종류(FxSpot.k)마다 하나. 효과 파일은 src/pixel/fx/effects/*.js (머리 주석에 바탕으로 삼은 pixelfx 효과)
import type { FxSpot } from '../raster/terrain'
import * as geyser from './effects/geyser.js'
import * as lava from './effects/lava.js'
import * as waterfall from './effects/waterfall.js'
import * as whirlpool from './effects/whirlpool.js'
import type { FxModule } from './layer'

/** 효과 모듈 그대로 (시험 도구가 읽는다) */
export const EFFECT_FILES = { waterfall, lava, whirl: whirlpool, geyser } as const

export const EFFECTS = EFFECT_FILES as unknown as Record<FxSpot['k'], FxModule>

/**
 * 효과 한 갈래의 프레임 상자 — 기준점 픽셀이 상자의 (ox, oy). 타일 Worker 가 그 상자의 바탕을 기호를 찍기 전에 떠 두어(FxSpot.bg),
 * 효과를 그릴 때 그 바탕을 먼저 깐다 (구운 기호의 움직이지 않는 픽셀이 효과 밑에 남지 않게 — 간헐천의 김, 지나간 소용돌이 거품)
 */
export function fxBox(k: FxSpot['k'], v: number): { w: number; h: number; ox: number; oy: number } {
  const meta = EFFECTS[k].meta
  const vm = k === 'geyser' && (v & 1) === 1 ? meta.variants?.small : undefined
  const [w, h] = vm?.size ?? meta.size
  const [ox, oy] = vm?.origin ?? meta.origin
  // 옆으로 떨어지는 폭포 — fx/layer.ts 의 turnRgba 와 같이 돌린다
  if (k === 'waterfall' && v === 1) return { w: h, h: w, ox: oy, oy: w - 1 - ox }
  if (k === 'waterfall' && v === 2) return { w: h, h: w, ox: h - 1 - oy, oy: ox }
  return { w, h, ox, oy }
}
