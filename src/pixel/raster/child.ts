// 지역 상세 (S9, docs/pixel-plan.md) — 가장 깊은 단계(한 픽셀 = 0.25 단위)의 타일에 지역 상세의 손그림 몫 번호 그림을 얹고, 그 범위의 세계 지도 것을 물린다.
// 그림·이름·칸은 빌드할 때 scripts/pixel/childmaps.mjs 가 지금 지도의 그림(src/map/childmaps/<id>.ts)에서 굽는다 (virtual:pixel-children·virtual:pixel-child-<id>).
// 가장자리 띠는 지금 지도의 겹 마스크를 바이어 문턱으로 바꾼 몫 — 그림은 굽을 때 맡은 칸만 남겼고, 세계 지도의 강·협곡·단애·빗금·한 점 기호·바다 표시·헤드론(지금 지도의
// mask#detail-holes 가 가리는 것)은 같은 문턱으로 이 범위가 맡은 칸에서 그리지 않는다 (worldHidden). 흩뿌린 기호는 칸마다 보기의 비트로 (terrain.ts 의 fineFor).
import type { Palette, Rgb } from './palette.ts'

/** 이름의 종류 (ChildLabelRow 의 종류 번호 — scripts/pixel/childmaps.mjs 의 LABEL_KINDS) */
export const LABEL_KIND_NAMES = ['place', 'area', 'water'] as const

/** 이름 한 줄 — [영어, 한국어판 이름 | 0, x, y, 크기(지도 단위) × 10, 종류(0 장소 1 지역 2 물), 돌림(도), 보기 비트] (x·y 는 × 10) */
export type ChildLabelRow = [string, string | 0, number, number, number, number, number, number]

export interface ChildMapMeta {
  id: string
  /** 그 지역 상세의 장소 (이름 뒤 아이콘·패널의 '가까이 보기') */
  place: string
  parent: string | null
  /** 범위 [x0, y0, x1, y1] (지도 단위) */
  b: [number, number, number, number]
  /** 가장자리 띠 (지도 단위) */
  band: number
  /** 그림 단위 ÷ 지도 단위 */
  s: number
  /** 그림의 단계 격자 칸 */
  gx0: number
  gy0: number
  w: number
  h: number
  /** 보기(0 끔, t 시점)마다 그림 조각의 번호 */
  img: number[]
  labels: ChildLabelRow[]
  /** 장소·카드 표시의 이름 쪽 (장소 id 나 'card:<카드 id>') — 그 표시를 담은 가장 깊은 지역 상세가 정한다 */
  anchors: Record<string, 'right' | 'left' | 'above' | 'below'>
}

export interface ChildMeta {
  v: number
  /** 그리는 단계의 한 픽셀 (지도 단위) */
  u: number
  maps: ChildMapMeta[]
  /** 지역 상세에 닿는 깊은 확대 칸 [x0, y0, x1, y1, …] — 그 칸의 기호가 보기마다 다르다 */
  cells: number[]
}

/** 지역 상세마다 그림 조각을 불러오는 함수 */
export type ChildImageLoaders = Record<string, () => Promise<{ default: string[] }>>

/** 지금 보기의 그림 (지역 상세 → 몫 번호) — Worker 가 그 타일에 닿는 지역 상세만 풀어 넘긴다 */
export interface ChildPaint {
  meta: ChildMeta
  /** 보기 — 0 끔, t 시점 */
  view: number
  images: ReadonlyMap<string, Uint8Array>
}

// world.ts 의 바이어 문턱 (같은 표 — 두 몫이 서로 겹치지 않게 맡은 칸을 나눈다)
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const bayer = (x: number, y: number) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16

/** 몫 번호를 (값, 길이) 쌍으로 줄인 base64 → 몫 번호 */
export function decodeChildImage(b64: string, n: number): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(n)
  let k = 0
  for (let i = 0; i + 1 < bin.length; i += 2) {
    const len = bin.charCodeAt(i + 1)
    out.fill(bin.charCodeAt(i), k, k + len)
    k += len
  }
  return out
}

/** 지도 단위의 상자에 닿는 지역 상세 (부모가 먼저 — 그린 차례) */
export const childrenIn = (meta: ChildMeta, x0: number, y0: number, x1: number, y1: number): ChildMapMeta[] =>
  meta.maps.filter((m) => m.b[2] > x0 && m.b[0] < x1 && m.b[3] > y0 && m.b[1] < y1)

/** 지도 단위의 상자가 지역 상세의 칸(기호가 보기마다 다른 깊은 확대 칸)이나 범위에 닿는가 — 그 타일은 보기를 열쇠에 붙인다 */
export function touchesChildren(meta: ChildMeta, x0: number, y0: number, x1: number, y1: number): boolean {
  const c = meta.cells
  for (let i = 0; i + 3 < c.length; i += 4) if (c[i + 2] > x0 && c[i] < x1 && c[i + 3] > y0 && c[i + 1] < y1) return true
  return childrenIn(meta, x0, y0, x1, y1).length > 0
}

/**
 * 세계 지도 것을 그리지 않는 칸인가 — 맨 위 지역 상세가 맡은 몫(띠 깊이 ÷ 띠)이 바이어 문턱보다 크면. 지금 지도의 mask#detail-holes
 * (더 깊은 지역 상세는 구멍을 더 뚫지 않는다 — 세계 지도는 부모의 띠만큼만 물러난다)
 */
export function worldHiddenFn(maps: readonly ChildMapMeta[]): ((gx: number, gy: number, u: number) => boolean) | undefined {
  const top = maps.filter((m) => m.parent === null)
  if (!top.length) return undefined
  return (gx, gy, u) => {
    const x = (gx + 0.5) * u
    const y = (gy + 0.5) * u
    for (const m of top) {
      const [x0, y0, x1, y1] = m.b
      if (x < x0 || x > x1 || y < y0 || y > y1) continue
      const d = Math.min(x - x0, x1 - x, y - y0, y1 - y) / m.band
      return bayer(gx, gy) < (d >= 1 ? 1 : d)
    }
    return false
  }
}

/** 지역 상세 손그림의 색 — 바탕과 한 무리로 읽히게 그 팔레트의 땅·숲·돌·먹 빛 (그림(S7)의 양피지 빛이 아니라 — 지역 상세는 그 땅 자체다). 차례는 몫 번호 (FIG_CLASSES) */
export function childColors(pal: Palette): readonly Rgb[] {
  const t = pal.t
  return [
    [0, 0, 0],
    pal.land, // fill
    pal.landShade, // shade
    t.rock, // stone
    // 숲 칠은 세계 지도 숲 땅(pal.forest·forestShade 의 디더링)과 다른 빛 — 세계 지도 나무 기호의 잎 빛 (S21: 숲 땅 위의 손그림 나무가 땅과 같은 빛이라 속 빈 윤곽으로 읽혔다)
    t.leafLight, // forest
    t.water, // sea — 강·못·물길 (세계 지도의 강과 같은 빛, 세계 지도의 물 위에는 그리지 않는다)
    pal.deep, // sea-fill — 지금 지도의 바다 빛 그대로인 물길 (Ikiral 의 Midnight Pass — 이웃 바다와 이어진다)
    t.lava, // fire
    t.sinew, // blood
    t.sand, // gold
    // 먹선은 세계 지도의 먹과 같은 빛 — 지역 상세의 선은 세계 지도의 단애·해안선을 이어 그린다 (S14 검토: 밤에 지역 상세 선만 밝혀 띠에서 갈렸다)
    t.ink, // dark
    t.ink, // ink
    pal.coast, // ink-bold
    t.hatch, // hatch
    t.ember, // fire-ink
    pal.mid, // sea-ink
    [0, 0, 0], // 16 둘레 윤곽 (지역 상세는 쓰지 않는다)
    t.stone, // 17 헤드론 몸통 (scripts/pixel/childmaps.mjs 의 HEDRON_BODY — 세계 지도 헤드론의 돌빛)
    t.stoneShade, // 18 헤드론 면 빗금
    t.ink, // 19 헤드론 그림자 (바둑판)
  ]
}

const colorCache = new WeakMap<Palette, readonly Rgb[]>()

/** 물빛 몫 (sea·sea-fill) — 세계 지도의 물(바다·내해) 위에는 그리지 않는다 */
const WATER_CLASSES = new Set([5, 6])

/** 빗금 몫 (scripts/pixel/figures.mjs 의 FIG_CLASSES 'hatch') */
const HATCH = 13

/** 그림을 타일에 얹는다 — out 은 inner 영역의 RGBA (단계 격자 칸), wet 은 그 칸이 세계 지도의 물인가 */
export function paintChildren(out: Uint8ClampedArray, c: ChildPaint, inner: { x0: number; y0: number; w: number; h: number }, pal: Palette, wet?: (gx: number, gy: number) => boolean): void {
  let cols = colorCache.get(pal)
  if (!cols) colorCache.set(pal, (cols = childColors(pal)))
  const { x0: ix, y0: iy, w: iw, h: ih } = inner
  for (const m of c.meta.maps) {
    const idx = c.images.get(m.id)
    if (!idx) continue
    const cx0 = Math.max(ix, m.gx0)
    const cy0 = Math.max(iy, m.gy0)
    const cx1 = Math.min(ix + iw, m.gx0 + m.w)
    const cy1 = Math.min(iy + ih, m.gy0 + m.h)
    for (let gy = cy0; gy < cy1; gy++) {
      let s = (gy - m.gy0) * m.w + (cx0 - m.gx0)
      let o = ((gy - iy) * iw + (cx0 - ix)) * 4
      for (let gx = cx0; gx < cx1; gx++, s++, o += 4) {
        const v = idx[s]
        if (!v || (wet && WATER_CLASSES.has(v) && wet(gx, gy))) continue
        // 빗금이 세계 지도의 물 위면 얕은 물빛 — 지금 지도의 가는 반투명 먹선은 물 위에서 옅은 물결로 읽힌다 (S19 — Midnight Pass 어귀의 줄이 땅 빗금의 갈색으로 바다에 그어졌다)
        const col = v === HATCH && wet?.(gx, gy) ? pal.shallow : cols[v]
        out[o] = col[0]
        out[o + 1] = col[1]
        out[o + 2] = col[2]
      }
    }
  }
}
