// 픽셀 지도(/pixel)의 페이즈 그림 (S7, docs/pixel-plan.md) — 시점별 지도(?time=1..6)의 세계 지도 그림을 빌드할 때 단계마다 픽셀 그림으로 굽는다.
// 지금 지도의 그림 원본(src/map/figures/<묶음>.ts — scripts/figures/to_ts.mjs 의 생성물, 고치지 않는다)과 카드(scripts/phase-cards.mjs),
// 시점의 규칙(src/data/timeline.ts 의 shownAtTimeOf·movedAt·childMapAt — App.tsx 가 시점별 보기의 그림 목록을 고르는 셈과 같다)을 그대로 쓴다.
// 지역 상세에 사는 작은 대상(S9)은 지역 상세가 나오는 가장 깊은 단계(DETAIL_LEVEL)에서만 굽고 그린다 — 지금 지도도 그 지역 상세가 나온 뒤에 그린다.
//
// 굽는 규칙 (한 픽셀 = 그 단계의 u 단위, 그 단계 격자의 칸 번호에 바로 놓는다 — 타일과 같은 격자):
// - 그 단계에서 그림의 크기가 7 픽셀 이상일 때만 (화면 2× 에서 지금 지도의 FIGURE_MIN_PX 14 와 같다)
// - 칠(fill·shade·stone·forest·sea·sea-fill·fire·blood·gold·dark)은 몫마다 0 이 아닌 감기 수, 픽셀 가운데로. sea(흐린 물빛)는 바둑판 한 칸 건너
// - 선(ink·ink-bold·fire-ink·sea-ink)은 한 픽셀 선 — 굵은 윤곽(ink-bold)은 그림이 20 픽셀 이상, 나머지 선은 28 픽셀 이상일 때만 (작으면 선이 칠을 덮어 검은 덩이가 된다).
//   빗금(hatch)은 한 픽셀 ≤ 0.5 단위이고 30 픽셀 이상일 때만
// - 둘레에 한 픽셀 윤곽 (칠한 픽셀에 맞닿은 빈 픽셀)
// 그림은 색이 아니라 몫의 번호(0 빔, 1–15 몫, 16 윤곽)로 굽는다 — 팔레트(?pal)마다 색을 따로 굽지 않는다 (src/pixel/figures/layer.ts 가 칠한다).
//
// 쓰는 법: node --import ./scripts/qa/pixel-hooks.mjs scripts/pixel/figures.mjs [--json | --stats]   (vite/pixelFigures.ts 가 부른다)
import fs from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { flattenPath } from './periods.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const src = (p) => pathToFileURL(`${ROOT}src/${p}`).href

/** 몫의 번호 (1 부터) — 지금 지도의 FigurePart.cls (src/map/figures.ts) */
export const FIG_CLASSES = ['fill', 'shade', 'stone', 'forest', 'sea', 'sea-fill', 'fire', 'blood', 'gold', 'dark', 'ink', 'ink-bold', 'hatch', 'fire-ink', 'sea-ink']
export const OUTLINE = 16
/** 그림 안쪽의 먹선 — 한 단 밝게 칠한다 (객체 다듬기 B1: 가는 밝은 칠(Emrakul 의 촉수) 양쪽의 먹선이 칠을 덮어 그림이 검은 덩이로 읽혔다. 픽셀 그림의 '안쪽 선은 밝게') */
export const INNER_INK = 17
const INK = FIG_CLASSES.indexOf('ink') + 1
/** 안쪽 먹선을 밝힐 때 곁에 있어야 하는 밝은 칠 (fill·shade·stone·gold) */
const LIGHT = new Set(['fill', 'shade', 'stone', 'gold'].map((c) => FIG_CLASSES.indexOf(c) + 1))
const FILLS = new Set(FIG_CLASSES.slice(0, 10))
const SEA = FIG_CLASSES.indexOf('sea') + 1
/** 픽셀 지도의 단계 (src/pixel/view.ts 의 LEVELS) */
export const LEVELS = [16, 8, 4, 2, 1, 0.5, 0.25]
/** 그림을 그리는 가장 작은 크기 (그 단계 픽셀) */
export const MIN_PX = 7
/** 단계마다 그림 조각을 나누는 칸 (지도 단위) — 넓은 단계는 한 조각 */
export const CELL = { 4: 400, 5: 400, 6: 200 }
/** 지역 상세에 사는 대상을 그리는 단계 — 지역 상세가 나오는 단계 (scripts/pixel/childmaps.mjs 의 CHILD_U) */
export const DETAIL_LEVEL = LEVELS.indexOf(0.25)

const q = (v) => Math.round(v * 10)

/** 그림의 지도 위 상자 — ZendikarMap.tsx 의 figureBox 와 같은 셈 */
export function figureBox(frame, at, size, flip) {
  const [vx, vy, vw, vh, ax, ay] = frame
  const k = size / Math.max(vw, vh)
  const [l, r] = flip ? [vx + vw - ax, ax - vx] : [ax - vx, vx + vw - ax]
  return { x0: at[0] - l * k, y0: at[1] - (ay - vy) * k, x1: at[0] + r * k, y1: at[1] + (vy + vh - ay) * k }
}

/**
 * 그림 하나를 단계 u 의 픽셀로 — parts 는 [{c: 몫 번호, subs: 꺾은선(그림 좌표)[]}] (차례대로 덧그린다).
 * 돌려주는 것: 그 단계 격자의 칸 번호 gx0·gy0 와 w × h 의 몫 번호
 */
export function rasterFigure(parts, frame, at, size, flip, u, allLines = false) {
  const [vx, vy, vw, vh, ax, ay] = frame
  const k = size / Math.max(vw, vh)
  const tx = (x) => at[0] + (flip ? -1 : 1) * (x - ax) * k
  const ty = (y) => at[1] + (y - ay) * k
  // 그림 상자(viewBox) 밖으로 나간 몫도 그린다 — 지금 지도의 그림은 자르지 않는다 (S7 검토: 날개 끝이 잘렸다)
  const fb = figureBox(frame, at, size, flip)
  const b = { ...fb }
  for (const part of parts)
    for (const sub of part.subs)
      for (const [x, y] of sub) {
        const mx = tx(x)
        const my = ty(y)
        if (mx < b.x0) b.x0 = mx
        if (mx > b.x1) b.x1 = mx
        if (my < b.y0) b.y0 = my
        if (my > b.y1) b.y1 = my
      }
  void vx
  void vy
  void vw
  void vh
  // 둘레 한 칸은 윤곽 몫
  const gx0 = Math.floor(b.x0 / u) - 1
  const gy0 = Math.floor(b.y0 / u) - 1
  const W = Math.floor(b.x1 / u) + 1 - gx0 + 1
  const H = Math.floor(b.y1 / u) + 1 - gy0 + 1
  const px = new Uint8Array(W * H)
  /** 흐린 물빛의 바둑판 구멍 — 칠한 자리라 둘레 윤곽이 되지 않는다 (S7 검토: 구멍이 모두 검은 윤곽이 되어 물이 검은 바둑판이었다) */
  const hole = new Uint8Array(W * H)
  const long = Math.max(fb.x1 - fb.x0, fb.y1 - fb.y0) / u
  for (const part of parts) {
    const cls = FIG_CLASSES[part.c - 1]
    if (FILLS.has(cls)) {
      // 0 이 아닌 감기 수 — 몫의 하위 경로 모두를 한 path 로
      const edges = []
      for (const s of part.subs)
        for (let i = 0; i < s.length; i++) {
          const A = s[i]
          const B = s[(i + 1) % s.length]
          const ay2 = ty(A[1])
          const by2 = ty(B[1])
          if (ay2 === by2) continue
          edges.push([tx(A[0]), ay2, tx(B[0]), by2])
        }
      const cr = []
      for (let r = 0; r < H; r++) {
        const yc = (gy0 + r + 0.5) * u
        cr.length = 0
        for (const [x1, y1, x2, y2] of edges) {
          const lo = Math.min(y1, y2)
          const hi = Math.max(y1, y2)
          if (yc < lo || yc >= hi) continue
          cr.push([x1 + ((yc - y1) * (x2 - x1)) / (y2 - y1), y1 < y2 ? 1 : -1])
        }
        if (cr.length < 2) continue
        cr.sort((m, n) => m[0] - n[0])
        let w = 0
        for (let i = 0; i + 1 < cr.length; i++) {
          w += cr[i][1]
          if (!w) continue
          const c0 = Math.max(0, Math.ceil(cr[i][0] / u - 0.5) - gx0)
          const c1 = Math.min(W - 1, Math.ceil(cr[i + 1][0] / u - 0.5) - 1 - gx0)
          for (let c = c0; c <= c1; c++) {
            // 흐린 물빛은 바둑판 한 칸 건너 (그 단계 격자의 칸 번호로 — 이웃 그림과 무늬가 맞는다)
            if (part.c === SEA && ((gx0 + c + gy0 + r) & 1) === 1) {
              if (!px[r * W + c]) hole[r * W + c] = 1
              continue
            }
            px[r * W + c] = part.c
            hole[r * W + c] = 0
          }
        }
      }
      continue
    }
    if (!allLines && (cls === 'hatch' ? u > 0.5 || long < 30 : cls === 'ink-bold' ? long < 20 : long < 28)) continue
    for (const s of part.subs) {
      const pts = s.map(([x, y]) => [Math.floor(tx(x) / u) - gx0, Math.floor(ty(y) / u) - gy0])
      for (let i = 0; i + 1 < pts.length; i++) {
        let [x0, y0] = pts[i]
        const [x1, y1] = pts[i + 1]
        const dx = Math.abs(x1 - x0)
        const dy = -Math.abs(y1 - y0)
        const sx = x0 < x1 ? 1 : -1
        const sy = y0 < y1 ? 1 : -1
        let e = dx + dy
        for (;;) {
          // 빗금은 한 칸 건너 (객체 다듬기 B1 — 지금 지도의 빗금은 화면 0.6px·불투명도 0.85 인데 한 픽셀(화면 2px) 선이라 세 배 넘게 짙었다. 그 단계 격자로 건너 이웃 그림과 무늬가 맞는다)
          if (x0 >= 0 && y0 >= 0 && x0 < W && y0 < H && (cls !== 'hatch' || ((gx0 + x0 + gy0 + y0) & 1) === 0)) px[y0 * W + x0] = part.c
          if (x0 === x1 && y0 === y1) break
          const e2 = 2 * e
          if (e2 >= dy) {
            e += dy
            x0 += sx
          }
          if (e2 <= dx) {
            e += dx
            y0 += sy
          }
        }
      }
    }
  }
  // 칠이 픽셀 가운데에 하나도 걸리지 않은 가는 그림(선으로만 된 것)은 선을 모두 그린다 — 빈 그림이 되지 않게
  if (!allLines && !px.some((v) => v)) return rasterFigure(parts, frame, at, size, flip, u, true)
  // 둘레 윤곽 — 칠한 픽셀에 네 방향으로 맞닿은 빈 픽셀
  const out = px.slice()
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (px[i] || hole[i]) continue
      if ((x > 0 && px[i - 1]) || (x < W - 1 && px[i + 1]) || (y > 0 && px[i - W]) || (y < H - 1 && px[i + W])) out[i] = OUTLINE
    }
  // 안쪽 먹선 — 네 이웃이 모두 그림 안이고(빈 칸·둘레 윤곽이 아니다) 그 가운데 밝은 칠이 있는 먹선. 그림의 바깥 둘레는 둘레 윤곽(16)이 짙게 맡는다
  const inner = out.slice()
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x
      if (out[i] !== INK) continue
      const n = [out[i - 1], out[i + 1], out[i - W], out[i + W]]
      if (n.every((v) => v && v !== OUTLINE) && n.some((v) => LIGHT.has(v))) inner[i] = INNER_INK
    }
  return { gx0, gy0, w: W, h: H, idx: inner }
}

/** 몫 번호를 (값, 길이 ≤ 255) 쌍으로 줄여 base64 로 — 거의 빈 칸이 길게 이어진다 */
export function encodeIdx(idx) {
  const out = []
  for (let i = 0; i < idx.length; ) {
    const v = idx[i]
    let n = 1
    while (i + n < idx.length && idx[i + n] === v && n < 255) n++
    out.push(v, n)
    i += n
  }
  return Buffer.from(out).toString('base64')
}

export async function buildPixelFigures() {
  const { BY_PHASE } = await import(pathToFileURL(`${ROOT}scripts/phase-cards.mjs`).href)
  const T = await import(src('data/timeline.ts'))
  const frames = JSON.parse(fs.readFileSync(`${ROOT}src/map/figures/frames.json`, 'utf8'))
  const groups = new Map()
  const artOf = async (id) => {
    const g = frames[id][0]
    if (!groups.has(g)) groups.set(g, (await import(src(`map/figures/${g}.ts`))).default)
    const a = groups.get(g)[id]
    if (!a) throw new Error(`pixel figures: 그림 묶음 ${g} 에 ${id} 가 없다`)
    return a
  }
  const cards = BY_PHASE.flat()
  const phaseOf = new Map(BY_PHASE.flatMap((list, i) => list.map((c) => [c.id, i + 1])))
  const byId = new Map(cards.map((c) => [c.id, c]))
  const lookup = (id) => byId.get(id)

  // 카드 — 시점 어느 하나에 그려지는 것(세계 지도 그림이든 지역 상세 대상이든 — 패널이 그곳의 카드를 싣는다)
  const cardIndex = new Map()
  const cardRows = []
  const ci = (c) => {
    if (!cardIndex.has(c.id)) {
      cardIndex.set(c.id, cardRows.length)
      cardRows.push([c.id, c.name, c.nameKo ?? 0, c.set, phaseOf.get(c.id), c.estimate ? 1 : 0, c.depicts.type === 'continent' ? `continent/${c.depicts.id}` : c.depicts.id, c.place ? 1 : 0])
    }
    return cardIndex.get(c.id)
  }
  // 자리 — 같은 카드라도 시점마다 자리(time.moved)가 다르면 따로
  const placeIndex = new Map()
  const places = []
  const times = {}
  const drawn = {}
  for (const t of T.SHOWN_TIME_POINTS) {
    const shown = cards.filter((c) => T.shownAtTimeOf(c, t, lookup))
    // 그 시점에 그리는 카드와 그 시점의 지역 상세 (세계 지도 그림이면 0) — 패널이 장소마다 싣는다 (App.tsx 의 phaseCardsHere)
    drawn[t] = shown.map((c) => [ci(c), T.childMapAt(c, t) ?? 0])
    // 세계 지도 그림과 지역 상세의 대상 (S9 — 지역 상세가 나오는 단계에서만)
    const world = shown.filter((c) => !c.place && T.childMapAt(c, t) === undefined)
    const inDetail = shown.filter((c) => !c.place && T.childMapAt(c, t) !== undefined)
    // 그리는 차례 — 밑에 까는 그림(under)이 먼저, 그다음 카드 차례 (ZendikarMap.tsx 의 FigureLayer). 지역 상세의 대상은 그 위에
    const order = [...world.filter((c) => c.under), ...world.filter((c) => !c.under), ...inDetail]
    times[t] = order.map((c) => {
      if (!frames[c.id]) throw new Error(`pixel figures: ${c.id} 의 그림 상자가 없다 (frames.json)`)
      const m = T.movedAt(c, t)
      const at = m?.at ?? c.at
      const flip = Boolean(m?.flip ?? c.flip)
      // 이름 쪽 — 그 시점에 옮긴 자리면 그 자리의 쪽(없으면 카드의 쪽), 아니면 그 시점의 쪽(time.label) — App.tsx 의 phaseCards 와 같다
      const label = (m ? (m.label ?? c.label) : (c.time?.label?.[t] ?? c.label)) ?? ''
      const detail = T.childMapAt(c, t) !== undefined
      const key = `${c.id}|${at[0]}|${at[1]}|${flip ? 1 : 0}|${detail ? 1 : 0}`
      if (!placeIndex.has(key)) {
        placeIndex.set(key, places.length)
        places.push({ c, at, flip, detail })
      }
      return [placeIndex.get(key), label]
    })
  }

  // 어느 시점에도 그리지 않는 카드(time.at 이 빈 것)도 — 패널이 '시점별 지도에는 그리지 않음'과 그 까닭을 싣는다
  for (const c of cards) ci(c)
  // 지역 상세 → 그 지역 상세와 그 위 지역 상세들의 장소 (App.tsx 의 detailInPlace)
  const { CHILD_MAPS } = await import(src('data/childMaps.ts'))
  const byDetail = new Map(CHILD_MAPS.map((d) => [d.id, d]))
  const details = {}
  for (const d of CHILD_MAPS) {
    const chain = []
    for (let x = d; x; x = x.parent === undefined ? undefined : byDetail.get(x.parent)) chain.push(x.place)
    details[d.id] = chain
  }

  // 굽기
  const flatCache = new Map()
  const flatOf = async (id) => {
    if (!flatCache.has(id)) {
      const a = await artOf(id)
      flatCache.set(
        id,
        a.parts.map((p) => {
          const c = FIG_CLASSES.indexOf(p.cls) + 1
          if (!c) throw new Error(`pixel figures: ${id} 의 몫 ${p.cls} 를 모른다`)
          // 선 몫의 닫힌 하위 경로(Z)는 첫 점으로 돌아오는 변까지 (칠은 스캔이 고리로 잇는다) — S6 의 periods.mjs linesOf 와 같다
          const line = !FILLS.has(p.cls)
          return {
            c,
            subs: flattenPath(p.d).map((s) => {
              const [fx, fy] = s.pts[0]
              const [lx, ly] = s.pts[s.pts.length - 1]
              return line && s.closed && (fx !== lx || fy !== ly) ? [...s.pts, s.pts[0]] : s.pts
            }),
          }
        }),
      )
    }
    return flatCache.get(id)
  }
  const chunks = {}
  const placeRows = []
  for (let pi = 0; pi < places.length; pi++) {
    const { c, at, flip, detail } = places[pi]
    const frame = frames[c.id].slice(1)
    const b = figureBox(frame, at, c.size, flip)
    placeRows.push([ci(c), q(at[0]), q(at[1]), q(c.size), flip ? 1 : 0, q(b.x0), q(b.y0), q(b.x1), q(b.y1), detail ? 1 : 0])
    const parts = await flatOf(c.id)
    for (let li = 0; li < LEVELS.length; li++) {
      const u = LEVELS[li]
      if (c.size / u < MIN_PX || (detail && li < DETAIL_LEVEL)) continue
      const s = rasterFigure(parts, frame, at, c.size, flip, u)
      const cell = CELL[li]
      const key = cell ? `${li}-${Math.floor(at[0] / cell)}-${Math.floor(at[1] / cell)}` : `${li}`
      ;(chunks[key] ??= []).push([pi, li, s.gx0, s.gy0, s.w, s.h, encodeIdx(s.idx)])
    }
  }
  // 같은 개체의 묶음 (time.same) — 패널이 그해에 그 인물을 맡는 그림의 이름을 싣는다 (S22 — 지금 지도의 drawnKinOf)
  const same = Object.fromEntries(cards.flatMap((c) => (c.time?.same ? [[c.id, typeof c.time.same === 'string' ? [c.time.same] : c.time.same]] : [])))
  return { meta: { v: 2, levels: LEVELS, minPx: MIN_PX, cell: CELL, detailLevel: DETAIL_LEVEL, cards: cardRows, places: placeRows, times, drawn, details, same, chunks: Object.keys(chunks).sort() }, chunks }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const t0 = performance.now()
  const data = await buildPixelFigures()
  if (process.argv.includes('--json')) process.stdout.write(JSON.stringify(data))
  else {
    const zlib = await import('node:zlib')
    const sizeOf = (o) => {
      const s = JSON.stringify(o)
      return `${(s.length / 1024).toFixed(0)}KB/gz ${(zlib.gzipSync(s).length / 1024).toFixed(0)}KB`
    }
    const perLevel = LEVELS.map((_, li) => Object.entries(data.chunks).filter(([k]) => k.split('-')[0] === String(li)))
    console.log(`ms ${Math.round(performance.now() - t0)} · 카드 ${data.meta.cards.length} · 자리 ${data.meta.places.length} · meta ${sizeOf(data.meta)}`)
    for (const [t, list] of Object.entries(data.meta.times)) console.log(`T${t}: 세계 지도 그림 ${list.length} · 그려지는 카드 ${data.meta.drawn[t].length}`)
    perLevel.forEach((list, li) => {
      const n = list.reduce((s, [, v]) => s + v.length, 0)
      const all = list.flatMap(([, v]) => v)
      console.log(`u=${LEVELS[li]}: 조각 ${list.length} · 그림 ${n} · ${all.length ? sizeOf(all) : '-'}${list.length > 1 ? ` · 가장 큰 조각 ${sizeOf(list.reduce((a, b) => (JSON.stringify(a[1]).length > JSON.stringify(b[1]).length ? a : b))[1])}` : ''}`)
    })
  }
}
