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

/** 지역 상세마다, 그 그림 번호(meta 의 img[보기])마다 그림 조각을 불러오는 함수 — 보기 하나의 타일은 그 보기의 그림 하나만 받는다 (전에는 지역 상세의 그림을 모두 한 조각으로 받아 Skyfang 이 gzip 313KB 였다) */
export type ChildImageLoaders = Record<string, (() => Promise<{ default: string }>)[]>

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
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [0, 1, 2].map((j) => Math.round(a[j] * (1 - t) + b[j] * t)) as unknown as Rgb

export function childColors(pal: Palette): readonly Rgb[] {
  const t = pal.t
  return [
    [0, 0, 0],
    pal.land, // fill — 테두리 없는 땅 조각 (테두리를 함께 그린 구조물의 밝은 면은 23)
    pal.landShade, // shade — 테두리 없는 그늘 면 (구덩이 바닥·땅 그늘). 구조물의 옆면은 24
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
    t.ink, // 19 헤드론 그림자 — 칠하지 않고 밑의 빛을 어둡게 (R10)
    t.hatch, // 20 트인 물 위의 빗금 (scripts/pixel/childmaps.mjs 의 HATCH_OPEN — 세계 지도의 물 위면 얕은 물빛)
    t.rockShade, // 21 작은 먹선 토막 — 조약돌·바닥의 결 (INK_SPECK — 객체 다듬기 D1)
    pal.mid, // 22 땅에 그은 작은 물 먹선 토막 — 풀포기 (SEA_SPECK — 객체 다듬기 D17, 세계 지도의 물 위면 물 먹 그대로)
    t.rockLight, // 23 먹 테두리를 함께 그린 구조물의 밝은 면 — 집 벽·지붕, 돌 윗면 (STRUCT_FILL — 가독성 다듬기 R4)
    // 24 먹 테두리를 함께 그린 그늘 — 구조물의 그늘진 옆면: 돌(stone)보다 한 단 어둡게 (STRUCT_SHADE — R4: 땅 그늘빛이라 돌 앞면보다 밝아 주사위 돌·집의 빛이 뒤집혔다)
    mix(t.rock, t.rockShade, 0.4),
    // 25 먹으로 둘러싼 땅빛 칠 — 손그림 물건의 몸통 (FILL_INKED — R17). 세계 지도의 숲·물 위면 밝은 돌빛 (paintChildren), 맨땅 위면 땅빛
    pal.land,
    // 26 교차 빗금의 중간 톤 (HATCH_TONE_D — R17: 산호 다리가 짙은 바둑판 띠였다)
    mix(pal.land, t.hatch, 0.45),
    // 27 물빛 덩이 (SEA_MASS — R39) — 땅 위에서는 여느 물빛, 세계 지도의 물 위면 물속 몸빛 (paintChildren)
    t.water,
  ]
}

const colorCache = new WeakMap<Palette, readonly Rgb[]>()

/** 물빛 몫 (sea·sea-fill) — 세계 지도의 물(바다·내해) 위에는 그리지 않는다 */
const WATER_CLASSES = new Set([5, 6])

/** 작은 먹선 토막 몫 (scripts/pixel/childmaps.mjs 의 INK_SPECK) 과 그 자리 빛을 짙게 하는 몫 */
const INK_SPECK = 21
const SPECK_DARK = 0.62
/** 헤드론 그림자 (19) — terrain.ts 의 SHADOW_DIM 과 같은 값 */
const SHADOW_DIM = 0.82
/** 땅에 그은 작은 물 먹선 토막 (scripts/pixel/childmaps.mjs 의 SEA_SPECK) */
const SEA_SPECK = 22

/** 먹선 몫 (ink·ink-bold — dark(10)는 칠이라 빼고: 창·구멍이 밝은 덩이가 된다, S14·S24 검토) */
const INK_CLASSES = new Set([11, 12])
/** 손그림 몸통 몫 (칠 — fill·shade·stone·forest·fire·blood·gold·dark·헤드론 몸통·면) — 이웃에 있으면 그 먹선은 몸통의 윤곽이라 세계 지도 먹 그대로 */
const BODY_CLASSES = new Set([1, 2, 3, 4, 7, 8, 9, 10, 17, 18, 23, 24, 25])

/** 트인 물 위의 빗금 몫 (scripts/pixel/childmaps.mjs 의 HATCH_OPEN — 손그림 몸통 위 빗금(13)은 물 위에서도 빗금 빛) */
const HATCH_OPEN = 20

/** 그 칸의 네 이웃(지역 상세 그림 안)에 손그림 몸통이 있는가 — 물 위에 선 건물(등대·방파제)의 윤곽은 물 위 먹으로 바꾸지 않는다 (S24 검토) */
function bodyNear(idx: Uint8Array, m: ChildMapMeta, gx: number, gy: number): boolean {
  const x = gx - m.gx0
  const y = gy - m.gy0
  const at = (dx: number, dy: number) => {
    const xx = x + dx
    const yy = y + dy
    return xx >= 0 && yy >= 0 && xx < m.w && yy < m.h && BODY_CLASSES.has(idx[yy * m.w + xx])
  }
  return at(-1, 0) || at(1, 0) || at(0, -1) || at(0, 1)
}

/** 그림을 타일에 얹는다 — out 은 inner 영역의 RGBA (단계 격자 칸), wet 은 그 칸이 세계 지도의 물인가 */
export function paintChildren(
  out: Uint8ClampedArray,
  c: ChildPaint,
  inner: { x0: number; y0: number; w: number; h: number },
  pal: Palette,
  wet?: (gx: number, gy: number) => boolean,
  forest?: (gx: number, gy: number) => boolean,
): void {
  let cols = colorCache.get(pal)
  if (!cols) colorCache.set(pal, (cols = childColors(pal)))
  const sunk = mix(pal.mid, pal.foam, 0.5)
  // 물속 몸빛 — 물 먹선 빛과 깊은 바다의 가운데 (R39)
  const mass = mix(sunk, pal.deep, 0.5)
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
        // 작은 먹선 토막(풀포기·조약돌·바닥의 결)과 땅 위 트인 자리의 빗금(풀 결)은 그 자리 빛을 한 단 짙게 — 숲 위에서는 짙은 초록, 모래 위에서는 짙은 모래 (객체 다듬기 D3: 짙은 돌빛 하나로는 숲의 빈터에서 갈색 흙 부스러기로 읽혔다)
        if (v === INK_SPECK || ((v === HATCH_OPEN || v === SEA_SPECK) && !wet?.(gx, gy))) {
          out[o] = Math.round(out[o] * SPECK_DARK)
          out[o + 1] = Math.round(out[o + 1] * SPECK_DARK)
          out[o + 2] = Math.round(out[o + 2] * SPECK_DARK)
          continue
        }
        // 먹으로 둘러싼 물건의 몸통 — 세계 지도의 숲·물 위면 밝은 돌빛 (R17)
        if (v === 25 && (wet?.(gx, gy) || forest?.(gx, gy))) {
          const col = pal.t.rockLight
          out[o] = col[0]
          out[o + 1] = col[1]
          out[o + 2] = col[2]
          continue
        }
        // 헤드론 그림자는 밑의 빛을 어둡게 (가독성 다듬기 R10 — 세계 지도 헤드론의 그림자와 같은 몫, terrain.ts 의 SHADOW_DIM)
        if (v === 19) {
          out[o] = Math.round(out[o] * SHADOW_DIM)
          out[o + 1] = Math.round(out[o + 1] * SHADOW_DIM)
          out[o + 2] = Math.round(out[o + 2] * SHADOW_DIM)
          continue
        }
        // 트인 물 위의 빗금이 세계 지도의 물 위면 얕은 물빛 — 지금 지도의 가는 반투명 먹선은 물 위에서 옅은 물결로 읽힌다 (S19 — Midnight Pass 어귀의 줄이 땅 빗금의 갈색으로 바다에 그어졌다)
        // 먹선(dark·ink·ink-bold)이 트인 물(그 칸과 네 이웃이 모두 물) 위면 물 위 먹 — 밤의 짙은 먹이 깊은 바다에 묻혔다(Coralhelm 의 배, S24).
        // 세계 지도의 해안선·단애를 이어 그린 선은 물가라 세계 지도 먹 그대로 (S14 의 띠 맞춤)
        // 물 먹선(sea-ink)이 세계 지도의 물 위면 옅은 물속 빛 — 16비트·밤의 짙은 바다에서 mid 는 바다 바로 곁 빛이라 가라앉은 신전 벽·쓰러진 헤드론이 보이지 않았다 (가독성 다듬기 R26).
        // 양피지 바다는 지금 빛이 이미 보여 그대로
        const col =
          v === 27 && wet?.(gx, gy)
            ? mass
            : (v === 15 || v === SEA_SPECK) && pal.id !== 'a' && wet?.(gx, gy)
            ? sunk
            : v === HATCH_OPEN && wet?.(gx, gy)
            ? pal.shallow
            : INK_CLASSES.has(v) && wet && wet(gx, gy) && wet(gx - 1, gy) && wet(gx + 1, gy) && wet(gx, gy - 1) && wet(gx, gy + 1) && !bodyNear(idx, m, gx, gy)
              ? pal.t.inkWet
              : cols[v]
        out[o] = col[0]
        out[o + 1] = col[1]
        out[o + 2] = col[2]
      }
    }
  }
}
