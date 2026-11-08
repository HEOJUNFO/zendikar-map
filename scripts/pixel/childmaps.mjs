// 픽셀 지도(/pixel)의 지역 상세 (S9, docs/pixel-plan.md) — 지금 지도가 깊은 확대에서 그 지역 자리에 얹는 따로 그린 그림(src/map/childmaps/<id>.ts — 생성물, 고치지 않는다)을
// 가장 깊은 단계(한 픽셀 = 0.25 단위)의 픽셀로 굽는다. 지금 지도의 셈을 그대로 쓴다:
// - 손그림 부분(parts): 보기(끔·시점 1–6)마다 그 보기의 문(sagas.ts 의 inView)으로 고른 부분을 차례대로 덧그린 몫 번호 그림 — 칠은 0 이 아닌 감기 수(픽셀 가운데),
//   선은 한 픽셀 선(물빛은 바둑판 없이 — 세계 지도의 물 위에는 그리지 않는다). 가장자리 띠는 지금 지도의 겹 마스크(ChildDetailArt.tsx 의 FeatherShapes — 띠 깊이에 따라 곧게 짙어진다)를 단계 격자의 바이어 문턱으로 바꿔
//   그 몫만 남긴다 (더 깊은 지역 상세는 부모 몫 × 제 띠의 바깥 반, 부모는 그 자리를 비운다). 같은 그림의 보기는 하나로 (images 차례 번호)
// - 이름(labels): 보기마다 켜지는지(비트), 띠에 너무 가까운 것·더 깊은 지역 상세 안의 부모 이름은 뺀다 (ZendikarMap.tsx 의 detailLabelHidden)
// - 지형 기호: 깊은 확대(fineTerrain 단계 1)의 칸 가운데 지역 상세에 닿는 칸을 보기마다 지금 지도의 fineOverlay 로 다시 뿌린다 —
//   세계 지도의 기호는 지역 상세가 맡은 자리(claimedFor)를 비키고, 지역 상세의 지형 칸은 그 기호(extraFor)를 더한다. 기호마다 그 기호가 있는 보기의 비트
// 지역 상세는 모두 가장 깊은 단계에서 나온다 — 지금 지도는 tier 5·6 에서 나오지만 픽셀 지도의 가장 깊은 단계가 화면 2× 에서 tier 5 라서 (tier 6 의 여섯도 같은 단계에)
import { fileURLToPath, pathToFileURL } from 'node:url'
import { encodeIdx, FIG_CLASSES } from './figures.mjs'
import { flattenPath } from './periods.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const src = (p) => pathToFileURL(`${ROOT}src/${p}`).href

/** 지역 상세를 그리는 단계의 한 픽셀 (지도 단위) — src/pixel/view.ts 의 LEVELS 끝 */
export const CHILD_U = 0.25
/** 깊은 확대 칸의 단계 (fineTerrain.ts — terrain.mjs 의 FINE_LEVEL) */
const FINE_LEVEL = 1
/** 칸이 지역 상세에 닿는지 볼 때 범위를 넓히는 폭 (지도 단위) — childDetail.ts 의 KEY_MARGIN × 단계 크기 */
const CELL_MARGIN = 16 * 2 ** -FINE_LEVEL
/** 이름의 종류 */
export const LABEL_KINDS = ['place', 'area', 'water']

const q = (v) => Math.round(v * 10)
const lin = (v) => (v <= 0 ? 0 : v >= 1 ? 1 : v)
const depthIn = (b, x, y) => Math.min(x - b.x0, b.x1 - x, y - b.y0, b.y1 - y)
const insideB = (b, x, y) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1
// world.ts 의 바이어 문턱 — 단계 격자의 칸 번호로 (타일 사이에 무늬가 끊기지 않게)
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
export const bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16

/** 지역 상세 목록과 그림, 보기 — 모두 가장 깊은 단계에서 나오니 tier 를 5 로 둔다 (fineOverlay 가 단계 1 에 모두 얹게) */
export async function childSetup() {
  const { CHILD_MAPS } = await import(src('data/childMaps.ts'))
  const { CHILD_MAP_SIZES } = await import(src('map/childMapSizes.ts'))
  const { detailBandOf } = await import(src('map/detailScale.ts'))
  const { inView, GATE_OFF } = await import(src('data/sagas.ts'))
  const TL = await import(src('data/timeline.ts'))
  const arts = {}
  for (const m of CHILD_MAPS) arts[m.id] = (await import(src(`map/childmaps/${m.id}.ts`))).default
  const all = CHILD_MAPS.filter((m) => CHILD_MAP_SIZES[m.id]).map((m) => {
    const size = CHILD_MAP_SIZES[m.id]
    return { ...m, size, s: size[0] / (m.bounds.x1 - m.bounds.x0), tier: 5, band: detailBandOf(m.bounds) }
  })
  if (all.length !== CHILD_MAPS.length) throw new Error('pixel childmaps: 그림 크기가 없는 지역 상세가 있다 (node scripts/childmaps/to_ts.mjs)')
  // 부모가 먼저 (childDetail.ts 의 childDetails 와 같은 차례)
  const details = [...all.filter((d) => d.parent === undefined), ...all.filter((d) => d.parent !== undefined)]
  for (const d of details) if (d.parent !== undefined && !details.some((p) => p.id === d.parent && p.parent === undefined)) throw new Error(`pixel childmaps: '${d.id}' 의 부모 '${d.parent}' 가 맨 위 지역 상세가 아니다`)
  const times = TL.SHOWN_TIME_POINTS
  if (times.join() !== '1,2,3,4,5,6') throw new Error(`pixel childmaps: 보이는 시점이 1–6 이 아니다 (${times.join()}) — 보기 비트를 고친다`)
  // 보기 0 = 끔, t = 시점 t
  const views = [{ vi: 0, t: null, gate: GATE_OFF, level: 0 }, ...times.map((t) => ({ vi: t, t, gate: TL.timeGateView(t), level: TL.timeGateView(t).level }))]
  return { details, arts, views, inView }
}

const parentOf = (setup, d) => (d.parent === undefined ? undefined : setup.details.find((p) => p.id === d.parent))
const nestedOf = (setup, d) => setup.details.filter((c) => c.parent === d.id)

/** 지도 단위의 한 점에서 그 지역 상세의 몫 (지금 지도의 겹 마스크 — 맨 위는 띠 깊이 ÷ 띠, 더 깊은 쪽은 부모 몫 × 제 띠의 바깥 반) */
function shareOf(setup, d, x, y) {
  const p = parentOf(setup, d)
  if (!p) return lin(depthIn(d.bounds, x, y) / d.band)
  return lin(depthIn(p.bounds, x, y) / p.band) * lin(depthIn(d.bounds, x, y) / (d.band / 2))
}

/** 단계 격자의 칸 (gx, gy) 를 이 지역 상세가 맡는가 — 바이어 문턱이 그 몫보다 작으면. 부모는 더 깊은 쪽이 맡은 칸을 비운다 */
export function owns(setup, d, gx, gy) {
  const x = (gx + 0.5) * CHILD_U
  const y = (gy + 0.5) * CHILD_U
  if (!insideB(d.bounds, x, y)) return false
  const t = bayer(gx, gy)
  if (t >= shareOf(setup, d, x, y)) return false
  for (const c of nestedOf(setup, d)) if (insideB(c.bounds, x, y) && t < shareOf(setup, c, x, y)) return false
  return true
}

/** 그림 부분의 꺾은선 (지도 단위) — 부분마다 한 번 */
/**
 * 지역 상세 손그림의 헤드론 (kit.js 의 hedron — 몸통 다각형(꼭짓점 넷)·면 빗금·같은 몸통의 잉크, 띄운 것은 그 앞에 그림자 타원) — 세계 지도 헤드론(terrain.ts 의
 * paintHedron)과 같은 돌빛·바둑판 그림자로 칠하게 따로 번호를 단다 (QA: 일반 몫으로 칠해 모래빛 마름모와 땅빛 덩이였다)
 */
export const HEDRON_BODY = 17
export const HEDRON_FACET = 18
export const HEDRON_SHADOW = 19
/** 트인 물 위(빈 칸이나 물빛 칸 위)에 그은 빗금 — 세계 지도의 물 위면 얕은 물빛 (S24 — 손그림 몸통(방파제·등대·Sky Rock) 위 빗금까지 물빛이 되었다. src/pixel/raster/child.ts) */
export const HATCH_OPEN = 20
const HATCH_CLASS = FIG_CLASSES.indexOf('hatch') + 1
/** 작은 먹선 토막(3 픽셀 상자 안 — 조약돌·바닥의 결) — 한 단 옅게 (객체 다듬기 D1: 0.25 단위 픽셀에서 1–2 픽셀 검은 점이 되어 Eye of Ugin 의 구덩이 바닥이 검은 점투성이였다. 지금 지도는 화면 1px 가는 선) */
export const INK_SPECK = 21
const INK_CLASS = FIG_CLASSES.indexOf('ink') + 1
/** 손그림 물·빈 땅이 아닌 자리에 그은 작은 물 먹선 토막(3 픽셀 상자 안 — Affa 의 풀포기) — 땅 위면 그 자리 빛을 한 단 짙게 (객체 다듬기 D17: 16비트 팔레트의 짙은 물빛 덩이로 읽혔다.
 * 지금 지도는 화면 1px 의 옅은 회록빛 획). 손그림 물(sea·sea-fill) 위의 토막은 물결이라 그대로 물 먹 */
export const SEA_SPECK = 22
const SEA_INK_CLASS = FIG_CLASSES.indexOf('sea-ink') + 1
const QUAD = /^M[-\d. ]+(?:L[-\d. ]+){3}Z$/
const ELLIPSE = /^M[-\d. ]+A[^A]+A[^A]+Z$/
function hedronClasses(parts) {
  const out = new Map()
  parts.forEach((p, i) => {
    const facet = parts[i + 1]
    const ink = parts[i + 2]
    if (!((p.cls === 'stone' || p.cls === 'shade') && facet?.cls === 'hatch' && ink?.cls === 'ink' && ink.d === p.d && QUAD.test(p.d ?? ''))) return
    out.set(i, HEDRON_BODY)
    out.set(i + 1, HEDRON_FACET)
    const shadow = parts[i - 1]
    if (p.cls === 'stone' && shadow?.cls === 'shade' && ELLIPSE.test(shadow.d ?? '')) out.set(i - 1, HEDRON_SHADOW)
  })
  return out
}

/**
 * 손그림 구조물의 밝은 면 — 먹 테두리(같은 꺾은선의 ink·ink-bold)를 함께 그린 fill (kit.js 의 집 벽·지붕, 주사위 돌의 윗면, 탑 …). 테두리 없는 fill 은 땅 조각이라
 * 그대로 땅빛 (가독성 다듬기 R4: 지역 상세의 fill 이 모두 땅빛이라 Sea Gate 의 집 스물다섯이 모래 위 갈색 테두리 격자로만 읽혔다 — 지금 지도는 밝은 벽)
 */
export const STRUCT_FILL = 23
/** 먹 테두리를 함께 그린 그늘 — 구조물의 그늘진 옆면: 돌보다 한 단 어둡게. 테두리 없는 그늘 면(구덩이 바닥·땅 그늘)은 땅 그늘빛 그대로 (R4 — 넓은 그늘 면까지 어두워져 Eye of Ugin 바닥이 검은 구덩이가 됐다) */
export const STRUCT_SHADE = 24
const LINE_CLS = new Set(['ink', 'ink-bold'])
/** 구조물 그늘로 보는 가장 큰 그늘 (지도 단위² — 집·돌의 옆면은 몇 단위, 구덩이 바닥·분화구 테두리는 수천) */
const STRUCT_SHADE_MAX = 400
function structFills(parts, s) {
  const inkD = parts.filter((p) => LINE_CLS.has(p.cls) && p.d).map((p) => p.d)
  const out = new Map()
  parts.forEach((p, i) => {
    if ((p.cls !== 'fill' && p.cls !== 'shade') || !p.d) return
    if (p.cls === 'shade') {
      const n = (p.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
      const xs = n.filter((_, k) => k % 2 === 0)
      const ys = n.filter((_, k) => k % 2 === 1)
      if (xs.length && ((Math.max(...xs) - Math.min(...xs)) / s) * ((Math.max(...ys) - Math.min(...ys)) / s) > STRUCT_SHADE_MAX) return
    }
    const subs = p.d.split(/(?=M)/).map((x) => x.trim().replace(/Z$/, '')).filter(Boolean)
    if (subs.length && subs.every((sub) => inkD.some((d) => d.includes(sub)))) out.set(i, p.cls === 'fill' ? STRUCT_FILL : STRUCT_SHADE)
  })
  return out
}

function partLines(d, art) {
  const hedron = hedronClasses(art.parts)
  const struct = structFills(art.parts, d.s)
  return art.parts.map((p, i) => {
    if (!p.d) return null
    const c = hedron.get(i) ?? struct.get(i) ?? FIG_CLASSES.indexOf(p.cls) + 1
    if (!c) throw new Error(`pixel childmaps: '${d.id}' 의 부분 종류 ${p.cls} 를 모른다`)
    const subs = flattenPath(p.d).map((s) => {
      const pts = s.pts.map(([x, y]) => [d.bounds.x0 + x / d.s, d.bounds.y0 + y / d.s])
      return { pts, closed: s.closed }
    })
    return { c, subs }
  })
}

const FILLS = new Set([...FIG_CLASSES.slice(0, 10).map((_, i) => i + 1), HEDRON_BODY, HEDRON_SHADOW, STRUCT_FILL, STRUCT_SHADE])

/** 먹선 몫 (dark·ink·ink-bold) */
const INKS = new Set(['dark', 'ink', 'ink-bold'].map((c) => FIG_CLASSES.indexOf(c) + 1))
/** 손그림 몸통 — 돌·숲·불·피·금빛·헤드론 몸통·구조물의 밝은 면과 옆면 (테두리 없는 땅 조각 fill·그늘 shade·물·빗금은 맨땅으로 본다) */
const BODIES = new Set([...['stone', 'forest', 'fire', 'blood', 'gold'].map((c) => FIG_CLASSES.indexOf(c) + 1), HEDRON_BODY, STRUCT_FILL, STRUCT_SHADE])
/** 작은 먹선 토막이 붙은 먹선이 이 픽셀보다 길면 그 토막은 말뚝·눈금이다 */
const ATTACH_INK_PX = 6
/** 작은 먹선 토막 둘레(먹·토막이 아닌 이웃)의 이만큼이 손그림 몸통이면 그 몸통 안의 선이다 */
const BODY_SHARE = 0.6
/** 그 몸통이 이만큼(픽셀) 넘게 커야 한다 — 조약돌 하나의 작은 돌 칠 안의 토막은 맨땅의 결이다 (D1) */
const BODY_MIN_PX = 40

/**
 * 작은 먹선 토막(INK_SPECK) 가운데 맨땅의 조약돌·결이 아닌 것은 먹 그대로 (가독성 다듬기 R11 — 크기로만 갈라 Eye of Ugin 의 밧줄 말뚝, Helix of Zof 의 덩굴,
 * Sunspring 의 방해석 뼈, 쓰러진 등대 몸통의 둥근 끝·창이 옅은 흙 부스러기가 되었다): 이어진 토막 덩이가 (a) 긴 먹선(ATTACH_INK_PX 넘는 덩이)에 닿거나
 * (b) 둘레가 큰 손그림 몸통(BODY_MIN_PX 넘는 덩이)이면 먹(ink)으로. 맨땅(구덩이 바닥 — D1)에 홀로 있는 토막은 그대로 옅게
 */
function keepAttachedSpecks(px, W, H) {
  const seen = new Int32Array(W * H).fill(-1)
  // 먹선 덩이의 크기 (8 이웃)
  const inkSize = new Map()
  const flood = (start, ok, id) => {
    const stack = [start]
    const cells = []
    seen[start] = id
    while (stack.length) {
      const o = stack.pop()
      cells.push(o)
      const r = Math.floor(o / W)
      const c = o - r * W
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr
          const cc = c + dc
          if (rr < 0 || cc < 0 || rr >= H || cc >= W) continue
          const k = rr * W + cc
          if (seen[k] < 0 && ok(px[k])) {
            seen[k] = id
            stack.push(k)
          }
        }
    }
    return cells
  }
  let id = 0
  for (let o = 0; o < W * H; o++)
    if (seen[o] < 0 && INKS.has(px[o])) {
      const n = flood(o, (v) => INKS.has(v), id).length
      inkSize.set(id++, n)
    }
  // 손그림 몸통 덩이의 크기
  const bodySize = new Map()
  for (let o = 0; o < W * H; o++)
    if (seen[o] < 0 && BODIES.has(px[o])) {
      const n = flood(o, (v) => BODIES.has(v), id).length
      bodySize.set(id++, n)
    }
  const specks = []
  for (let o = 0; o < W * H; o++) if (seen[o] < 0 && px[o] === INK_SPECK) specks.push(flood(o, (v) => v === INK_SPECK, id++))
  for (const cells of specks) {
    let attached = false
    let body = 0
    let around = 0
    for (const o of cells) {
      const r = Math.floor(o / W)
      const c = o - r * W
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr
          const cc = c + dc
          if ((!dr && !dc) || rr < 0 || cc < 0 || rr >= H || cc >= W) continue
          const k = rr * W + cc
          const v = px[k]
          if (INKS.has(v)) {
            if ((inkSize.get(seen[k]) ?? 0) > ATTACH_INK_PX) attached = true
          } else if (v !== INK_SPECK) {
            around++
            if (BODIES.has(v) && (bodySize.get(seen[k]) ?? 0) > BODY_MIN_PX) body++
          }
        }
    }
    if (attached || (around && body / around >= BODY_SHARE)) for (const o of cells) px[o] = INK_CLASS
  }
}

/** 한 보기의 그림 — 범위의 단계 격자 칸 (gx0, gy0, w × h) 의 몫 번호 (맡지 않은 칸은 0) */
function rasterView(setup, d, lines, art, gate) {
  const u = CHILD_U
  const { x0, y0, x1, y1 } = d.bounds
  const gx0 = Math.floor(x0 / u)
  const gy0 = Math.floor(y0 / u)
  const W = Math.ceil(x1 / u) - gx0
  const H = Math.ceil(y1 / u) - gy0
  const px = new Uint8Array(W * H)
  art.parts.forEach((part, n) => {
    const L = lines[n]
    if (!L || !setup.inView(part, gate)) return
    if (FILLS.has(L.c)) {
      const edges = []
      let lo = Infinity
      let hi = -Infinity
      for (const s of L.subs)
        for (let i = 0; i < s.pts.length; i++) {
          const A = s.pts[i]
          const B = s.pts[(i + 1) % s.pts.length]
          if (A[1] === B[1]) continue
          edges.push([A[0], A[1], B[0], B[1]])
          lo = Math.min(lo, A[1], B[1])
          hi = Math.max(hi, A[1], B[1])
        }
      const r0 = Math.max(0, Math.floor(lo / u - 0.5) - gy0)
      const r1 = Math.min(H - 1, Math.ceil(hi / u) - gy0)
      const cr = []
      for (let r = r0; r <= r1; r++) {
        const yc = (gy0 + r + 0.5) * u
        cr.length = 0
        for (const [ax, ay, bx, by] of edges) {
          if (yc < Math.min(ay, by) || yc >= Math.max(ay, by)) continue
          cr.push([ax + ((yc - ay) * (bx - ax)) / (by - ay), ay < by ? 1 : -1])
        }
        if (cr.length < 2) continue
        cr.sort((m, k) => m[0] - k[0])
        let w = 0
        for (let i = 0; i + 1 < cr.length; i++) {
          w += cr[i][1]
          if (!w) continue
          const c0 = Math.max(0, Math.ceil(cr[i][0] / u - 0.5) - gx0)
          const c1 = Math.min(W - 1, Math.ceil(cr[i + 1][0] / u - 0.5) - 1 - gx0)
          // 흐린 물빛(sea — 지금 지도의 불투명도 0.35)도 다 칠한다 — 지역 상세의 물빛은 강·못·물길이라, 바둑판으로는 세계 지도의 강(한 빛)과 갈렸다 (QA).
          // 세계 지도의 물 위에서는 그리지 않는다 (child.ts 의 paintChildren — 세계 지도의 물가 띠가 보인다)
          // 헤드론 그림자도 다 칠한다 — 앱이 밑의 빛을 어둡게 한다 (가독성 다듬기 R10: 세계 지도 헤드론처럼, 전에는 먹 바둑판)
          for (let c = c0; c <= c1; c++) px[r * W + c] = L.c
        }
      }
      return
    }
    for (const s of L.subs) {
      const pts = s.pts.map(([x, y]) => [Math.floor(x / u) - gx0, Math.floor(y / u) - gy0])
      if (s.closed) pts.push(pts[0])
      const xs = pts.map((p) => p[0])
      const ys = pts.map((p) => p[1])
      const bw = Math.max(...xs) - Math.min(...xs)
      const bh = Math.max(...ys) - Math.min(...ys)
      const small = bw < 3 && bh < 3
      // 물 먹선 토막은 한 획씩 — 풀포기 한 획이 3–5 픽셀이다 (D17)
      const seaSmall = bw < 6 && bh < 6
      const cls = small && L.c === INK_CLASS ? INK_SPECK : seaSmall && L.c === SEA_INK_CLASS ? SEA_SPECK : L.c
      for (let i = 0; i + 1 < pts.length; i++) {
        let [ax, ay] = pts[i]
        const [bx, by] = pts[i + 1]
        if ((ax < 0 && bx < 0) || (ay < 0 && by < 0) || (ax >= W && bx >= W) || (ay >= H && by >= H)) continue
        const dx = Math.abs(bx - ax)
        const dy = -Math.abs(by - ay)
        const sx = ax < bx ? 1 : -1
        const sy = ay < by ? 1 : -1
        let e = dx + dy
        for (;;) {
          if (ax >= 0 && ay >= 0 && ax < W && ay < H) {
            const o = ay * W + ax
            px[o] =
              cls === HATCH_CLASS && (px[o] === 0 || px[o] === 5 || px[o] === 6 || px[o] === HATCH_OPEN)
                ? HATCH_OPEN
                : cls === SEA_SPECK && (px[o] === 5 || px[o] === 6)
                  ? SEA_INK_CLASS
                  : cls
          }
          if (ax === bx && ay === by) break
          const e2 = 2 * e
          if (e2 >= dy) {
            e += dy
            ax += sx
          }
          if (e2 <= dx) {
            e += dx
            ay += sy
          }
        }
      }
    }
  })
  keepAttachedSpecks(px, W, H)
  // 맡지 않은 칸 (띠의 바이어 몫, 더 깊은 지역 상세의 몫) 은 비운다
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (px[r * W + c] && !owns(setup, d, gx0 + c, gy0 + r)) px[r * W + c] = 0
  return { gx0, gy0, w: W, h: H, idx: px }
}

/** 더 깊은 지역 상세가 부모의 띠 안쪽에 다 드는가 (childDetail.ts 의 insideParentBand) */
const insideParentBand = (d, p) => {
  const b = p.band
  return d.bounds.x0 >= p.bounds.x0 + b && d.bounds.x1 <= p.bounds.x1 - b && d.bounds.y0 >= p.bounds.y0 + b && d.bounds.y1 <= p.bounds.y1 - b
}

/**
 * 지역 상세의 그림·이름 — meta(주 스레드·Worker 가 함께 읽는 작은 조각)와 지역 상세마다의 그림 조각.
 * meta.maps[i] = { id, place, parent, b: [x0, y0, x1, y1], band, s, gx0, gy0, w, h, img: 보기마다 images 의 번호, labels, anchors }
 */
export async function buildChildArt(setup) {
  const maps = []
  const images = {}
  for (const d of setup.details) {
    const art = setup.arts[d.id]
    const lines = partLines(d, art)
    const imgs = []
    const seen = new Map()
    const img = []
    let base = null
    for (const v of setup.views) {
      const r = rasterView(setup, d, lines, art, v.gate)
      base ??= r
      const enc = encodeIdx(r.idx)
      let k = seen.get(enc)
      if (k === undefined) {
        seen.set(enc, (k = imgs.length))
        imgs.push(enc)
      }
      img.push(k)
    }
    images[d.id] = imgs
    // 이름 — 띠에 너무 가까운 것(0.75 띠 안), 부모 띠 안쪽에 다 들지 않는 더 깊은 지역 상세는 부모 띠까지, 부모 이름 가운데 더 깊은 지역 상세 안의 것은 뺀다
    const p = parentOf(setup, d)
    const nested = nestedOf(setup, d)
    const labels = []
    for (const l of art.labels) {
      const x = d.bounds.x0 + l.at[0] / d.s
      const y = d.bounds.y0 + l.at[1] / d.s
      if (depthIn(d.bounds, x, y) < 0.75 * d.band) continue
      if (p && !insideParentBand(d, p) && depthIn(p.bounds, x, y) < 0.75 * p.band) continue
      if (nested.some((c) => insideB(c.bounds, x, y))) continue
      let mask = 0
      for (const v of setup.views) if (setup.inView(l, v.gate)) mask |= 1 << v.vi
      if (!mask) continue
      labels.push([l.text, l.textKo ?? 0, q(x), q(y), q(l.size / d.s), LABEL_KINDS.indexOf(l.kind), Math.round(l.rotate ?? 0), mask])
    }
    maps.push({
      id: d.id,
      place: d.place,
      parent: d.parent ?? null,
      b: [d.bounds.x0, d.bounds.y0, d.bounds.x1, d.bounds.y1],
      band: d.band,
      s: d.s,
      gx0: base.gx0,
      gy0: base.gy0,
      w: base.w,
      h: base.h,
      img,
      labels,
      anchors: art.markAnchors ?? {},
    })
  }
  return { maps, images }
}

/** 깊은 확대 칸이 지역 상세에 닿는가 (지도 단위의 칸 사각형) */
export const touchesChild = (setup, region) =>
  setup.details.some((d) => d.bounds.x1 + CELL_MARGIN > region.x0 && d.bounds.x0 - CELL_MARGIN < region.x1 && d.bounds.y1 + CELL_MARGIN > region.y0 && d.bounds.y0 - CELL_MARGIN < region.y1)

/**
 * 지역 상세에 닿는 깊은 확대 칸의 기호 — 보기마다 지금 지도의 fineOverlay 로 다시 뿌린다. [종류, x, y, 보기 비트] (×10 절대 좌표)
 * @param ctx { T (terrain.ts), input, geo, glyphsOf, cells: [{ region, seed, g }], periodAt(단계) → PeriodView | null }
 */
export async function buildChildFine(setup, ctx) {
  const { fineOverlay } = await import(src('map/childDetail.ts'))
  const overlays = setup.views.map((v) => {
    const pv = v.t ? ctx.periodAt(v.level) : null
    const o = fineOverlay(setup.details, setup.arts, v.gate, pv?.fine)
    return { v, pv, o, claimed: o.claimedFor(FINE_LEVEL) }
  })
  const out = new Map()
  for (const cell of ctx.cells) {
    const byKey = new Map()
    for (const { v, pv, o, claimed } of overlays) {
      // 같은 말(칸에 닿는 지역 상세·켜진 문·페이즈 바탕 항목)이면 같은 기호 — 끔과 시점은 더 깊은 지역 상세의 빈터 셈이 달라 가른다
      const key = `${v.t ? 't' : 's'}|${o.keyFor(FINE_LEVEL, cell.region)}`
      let glyphs = byKey.get(key)
      if (!glyphs) {
        const world = ctx.T.buildTerrain(ctx.input, { g: cell.g, region: cell.region, seed: cell.seed, geo: ctx.geo, claimed, phase: pv?.fine.phaseFor(FINE_LEVEL, cell.region) })
        const extras = o.extraFor(FINE_LEVEL, cell.g, cell.region, cell.seed)
        const seen = new Set()
        glyphs = []
        for (const t of [world, ...extras]) {
          // 봉우리 모양은 이 보기의 것 (객체 다듬기 A1 — 같은 자리라도 보기마다 모양이 다르다)
          const sh = new Map()
          for (const g of ctx.glyphsOf(t, { g: cell.g, shapes: sh })) {
            const k = g.join(':')
            if (seen.has(k)) continue
            seen.add(k)
            glyphs.push([...g, sh.get(k) ?? null])
          }
        }
        byKey.set(key, glyphs)
      }
      for (const g of glyphs) {
        // 같은 자리·같은 모양이면 한 줄 (보기 비트를 더한다)
        const k = `${g.slice(0, 3).join(':')}|${g[3] ? g[3].join(',') : ''}`
        const e = out.get(k)
        if (e) e[3] |= 1 << v.vi
        else out.set(k, [g[0], g[1], g[2], 1 << v.vi, g[3]])
      }
    }
  }
  return [...out.values()]
}
