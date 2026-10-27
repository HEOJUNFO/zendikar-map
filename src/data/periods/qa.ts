// 페이즈 바탕 검사 도구용 — 단계마다 켠 항목이 지도를 바꿀 수 있는 범위(상자)를 scripts/qa/svgdiff.mjs 의 상자 JSON 모양으로 낸다 (명세 §11.4).
// 앱은 이 파일을 쓰지 않는다(어느 조각에도 들지 않는다). Node 에서:
//   node --input-type=module -e "import('./src/data/periods/qa.ts').then((m) => console.log(JSON.stringify(m.periodQaBoxes(), null, 1)))" > boxes.json
//   node scripts/qa/svgdiff.mjs 끔.svg 켬.svg --level 5 --boxes boxes.json
// 상자는 다듬기 전 원본 좌표로 셈한다 — 앱의 다듬기(inked·chaikin)가 옮기는 1–2 단위는 svgdiff 의 margin(20)이 덮는다.
import coastlines from '../geo/coastlines.json' with { type: 'json' }
import features from '../geo/features.json' with { type: 'json' }
import { pointInRing } from '../../map/geometry.ts'
import { continents } from '../continents.ts'
import { landscape as akoum } from '../landscape/akoum.ts'
import { landscape as balaGed } from '../landscape/bala-ged.ts'
import { landscape as guulDraz } from '../landscape/guul-draz.ts'
import { landscape as murasa } from '../landscape/murasa.ts'
import { landscape as ondu } from '../landscape/ondu.ts'
import { landscape as sejiri } from '../landscape/sejiri.ts'
import { landscape as tazeem } from '../landscape/tazeem.ts'
import { locations } from '../locations.ts'
import { PHASE_SLOTS } from '../sagas.ts'
import { TIMES } from '../timeline.ts'
import { isPlaced, type Point } from '../types.ts'
import { PERIODS, periodAt } from './index.ts'
import type { PeriodSet, PeriodShape, Ring } from './types.ts'

interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}
/** svgdiff.mjs 의 상자 JSON 의 한 단계 */
export interface QaLevel {
  boxes: (Box & { id: string })[]
  marks: { place: string; at: Point }[]
  labels: { place: string; text: string }[]
}

const LANDSCAPES = [sejiri, akoum, tazeem, murasa, ondu, guulDraz, balaGed]
const asRing = (pts: readonly (readonly number[])[]): Ring => pts as unknown as Ring
const LANDS = new Map<string, Ring>([...Object.entries(coastlines.landmasses), ...Object.entries(coastlines.islets)].map(([k, pts]) => [k, asRing(pts)]))
/** 강이 둘레 기호를 비키는 거리 (landscape.ts buildBlockedMask — 4.5 + 폭/2) 와 하구 물칠이 더 나가는 거리 */
const RIVER_PAD = 4.5 + 1.6
/** 협곡이 둘레 기호를 비키는 거리 (buildBlockedMask — 폭/2 + 6) */
const GORGE_PAD = 6
/** 폭포 기호가 둘레 기호를 비키는 반지름 (buildBlockedMask — 10·size) */
const FALL_R = 10

const box = (pts: readonly Point[], pad = 0): Box => {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x)
    y0 = Math.min(y0, y)
    x1 = Math.max(x1, x)
    y1 = Math.max(y1, y)
  }
  return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad }
}
const union = (bs: readonly Box[]): Box => box(bs.flatMap((b) => [[b.x0, b.y0] as Point, [b.x1, b.y1] as Point]))
const round = (b: Box): Box => ({ x0: Math.floor(b.x0 * 10) / 10, y0: Math.floor(b.y0 * 10) / 10, x1: Math.ceil(b.x1 * 10) / 10, y1: Math.ceil(b.y1 * 10) / 10 })
const ellipse = ([x, y]: Point, [rx, ry]: readonly [number, number]): Box => ({ x0: x - rx, y0: y - ry, x1: x + rx, y1: y + ry })

/** 모양 하나의 상자 (이름으로 가리킨 다각형은 원본 좌표로) */
function shapeBox(s: PeriodShape): Box {
  if ('ring' in s) return box(s.ring)
  if ('band' in s) return box(s.band, s.width / 2)
  if ('water' in s) return box(asRing((features.waters as Record<string, number[][]>)[s.water]))
  if ('forest' in s) return box(asRing(features.forests[s.forest]))
  if ('place' in s) {
    const l = locations.find((x) => x.id === s.place)
    if (!l || !isPlaced(l) || !l.extent) throw new Error(`qa: 장소 '${s.place}' 의 범위가 없다`)
    return ellipse(l.position, l.extent)
  }
  if ('area' in s) {
    const a = LANDSCAPES.flatMap((l) => l.areas ?? []).find((x) => x.id === s.area)
    if (!a) throw new Error(`qa: 영역 '${s.area}' 가 없다`)
    if (a.ring) return box(a.ring)
    if (a.at && a.extent) return ellipse(a.at, a.extent)
    throw new Error(`qa: 영역 '${s.area}' 에 모양이 없다`)
  }
  // 대륙 — 그 땅(덩어리·딸린 섬)을 area 로 자른 범위
  const c = continents.find((x) => x.id === s.continent)
  if (!c) throw new Error(`qa: 대륙 '${s.continent}' 가 없다`)
  const rings = [c.landmass, ...(c.islands ?? [])].flatMap((k) => (LANDS.has(k) ? [LANDS.get(k)!] : []))
  if (!c.area) return union(rings.map((r) => box(r)))
  const area = c.area
  const pts = [...rings.flatMap((r) => r.filter(([x, y]) => pointInRing(x, y, area))), ...area.filter(([x, y]) => rings.some((r) => pointInRing(x, y, r)))]
  return box(pts)
}

/** 한 단계에서 켠 항목의 상자·표시·이름 */
export function periodQaLevel(level: number, set: PeriodSet = periodAt(level)): QaLevel {
  const rivers = new Map(LANDSCAPES.flatMap((l) => (l.rivers ?? []).map((r) => [r.id, r] as const)))
  const lines = new Map(LANDSCAPES.flatMap((l) => (l.lines ?? []).map((x) => [x.id, x] as const)))
  const boxes: (Box & { id: string })[] = []
  const add = (id: string, b: Box) => boxes.push({ id, ...round(b) })
  for (const g of [...set.grounds, ...set.reliefs]) add(g.id, union(g.shapes.map(shapeBox)))
  for (const d of set.drains) {
    add(d.id, shapeBox({ water: d.water }))
    // 하구 물칠을 걷는 강은 그 강의 path 가 통째로 바뀐다
    for (const id of d.dryMouths) {
      const r = rivers.get(id)
      if (r) add(`${d.id}#${id}`, box(r.course, (r.width ?? 1.6) / 2 + RIVER_PAD))
    }
  }
  for (const r of set.rivers) add(r.id, box(r.course, (r.width ?? 1.6) / 2 + RIVER_PAD))
  for (const g of set.glyphs) add(g.id, box([g.at], FALL_R * (g.size ?? 1)))
  for (const h of set.hides) {
    const l = lines.get(h.line)
    if (l) add(h.id, box(l.line, (l.width ?? 8) / 2 + GORGE_PAD))
  }
  const marks = set.marks.flatMap((m) => {
    const l = locations.find((x) => x.id === m.place)
    return l && isPlaced(l) ? [{ place: m.place, at: l.position }] : []
  })
  const labels = set.labels.flatMap((b) => {
    const l = locations.find((x) => x.id === b.place)
    return l ? [{ place: b.place, text: l.name }] : []
  })
  return { boxes, marks, labels }
}

/** 상자를 내는 단계 — 데이터가 있는 페이즈와 시점의 바탕 단계(T5 의 6 도) */
const QA_LEVELS = [...new Set([...PHASE_SLOTS.map((p) => p.level), ...TIMES.map((x) => x.periodLevel)])].sort((a, b) => a - b)

/** svgdiff.mjs 의 상자 JSON — 페이즈 단계마다 (켠 항목이 없는 단계도 빈 목록으로) */
export function periodQaBoxes(margin = 20, set: PeriodSet = PERIODS): { margin: number; levels: Record<string, QaLevel> } {
  const levels: Record<string, QaLevel> = {}
  for (const level of QA_LEVELS) {
    const on = <T extends { levels: readonly number[] }>(xs: readonly T[]) => xs.filter((x) => x.levels.includes(level))
    const at: PeriodSet =
      set === PERIODS
        ? periodAt(level)
        : { grounds: on(set.grounds), reliefs: on(set.reliefs), drains: on(set.drains), rivers: on(set.rivers), glyphs: on(set.glyphs), hides: on(set.hides), marks: on(set.marks), labels: on(set.labels) }
    levels[level] = periodQaLevel(level, at)
  }
  return { margin, levels }
}
