// 페이즈 바탕 — 대륙별 파일(./<대륙>.ts)을 모으고, 단계(이어 센 페이즈 번호)마다 켜진 항목을 고른다.
// 늦게 받는 조각이다: 앱의 진입은 이 폴더를 정적으로 import 하지 않고, 페이즈를 켤 때 src/map/period.ts 가 불러온다.
// 자체 검사(checkPeriods, P1–P6)는 빌드에 싣지 않으려고 불러오는 쪽이 부른다 — 개발 서버는 src/map/period.ts 가 불러올 때(import.meta.env.DEV),
// Node 도구는 scripts/childmaps/periods.mjs 의 loadPeriods(to_ts --check·context.mjs)가 부른다.
// Node 가 그대로 읽게 런타임 import 는 확장자를 붙이고(.ts·.json), 타입은 `import type` 으로만 가져온다.
// 장소 표시와 카드가 맞는지(M1·M2)는 페이즈 카드 조회표가 있어야 해 ./check.ts 가 따로 본다.
import coastlines from '../geo/coastlines.json' with { type: 'json' }
import features from '../geo/features.json' with { type: 'json' }
import { distanceToPolyline, pointInRing } from '../../map/geometry.ts'
import { continents } from '../continents.ts'
import { landscape as akoumLandscape } from '../landscape/akoum.ts'
import { landscape as balaGedLandscape } from '../landscape/bala-ged.ts'
import { landscape as guulDrazLandscape } from '../landscape/guul-draz.ts'
import { landscape as murasaLandscape } from '../landscape/murasa.ts'
import { landscape as onduLandscape } from '../landscape/ondu.ts'
import { landscape as sejiriLandscape } from '../landscape/sejiri.ts'
import { landscape as tazeemLandscape } from '../landscape/tazeem.ts'
import { locations } from '../locations.ts'
import { isPlaced, type ContinentId, type Landscape, type Point } from '../types.ts'
import { period as akoum } from './akoum.ts'
import { period as balaGed } from './bala-ged.ts'
import { period as guulDraz } from './guul-draz.ts'
import { period as murasa } from './murasa.ts'
import { period as ondu } from './ondu.ts'
import { period as sejiri } from './sejiri.ts'
import { period as tazeem } from './tazeem.ts'
import type {
  PeriodDrain,
  PeriodGlyph,
  PeriodGround,
  PeriodHide,
  PeriodLabel,
  PeriodLevel,
  PeriodMark,
  PeriodRelief,
  PeriodRiver,
  PeriodSet,
  PeriodShape,
  Ring,
} from './types.ts'

export type * from './types.ts'

/** 대륙 파일마다의 항목 (데이터가 실린 대륙 — 패널의 대륙 목록이 쓴다) */
export const PERIOD_FILES: readonly (readonly [ContinentId, PeriodSet])[] = [
  ['sejiri', sejiri],
  ['akoum', akoum],
  ['tazeem', tazeem],
  ['murasa', murasa],
  ['ondu', ondu],
  ['guul-draz', guulDraz],
  ['bala-ged', balaGed],
]

/** 항목 묶음의 이름 (PeriodSet 의 키) */
export type PeriodGroup = keyof PeriodSet
const GROUPS: readonly PeriodGroup[] = ['grounds', 'reliefs', 'drains', 'rivers', 'glyphs', 'hides', 'marks', 'labels']
/** 항목 하나 (어느 묶음이든) */
export type PeriodItem = PeriodGround | PeriodRelief | PeriodDrain | PeriodRiver | PeriodGlyph | PeriodHide | PeriodMark | PeriodLabel

/** 묶음 여럿을 하나로 — 대륙 파일 차례, 그 안에서 적힌 차례 */
function merge(sets: readonly PeriodSet[]): PeriodSet {
  return {
    grounds: sets.flatMap((s) => s.grounds),
    reliefs: sets.flatMap((s) => s.reliefs),
    drains: sets.flatMap((s) => s.drains),
    rivers: sets.flatMap((s) => s.rivers),
    glyphs: sets.flatMap((s) => s.glyphs),
    hides: sets.flatMap((s) => s.hides),
    marks: sets.flatMap((s) => s.marks),
    labels: sets.flatMap((s) => s.labels),
  }
}

/** 모든 페이즈 바탕 항목 (단계와 상관없이) */
export const PERIODS: PeriodSet = merge(PERIOD_FILES.map(([, s]) => s))

/** 묶음의 항목을 묶음 이름과 함께 (묶음 차례, 그 안에서 적힌 차례) */
export function periodItems(set: PeriodSet = PERIODS): { group: PeriodGroup; item: PeriodItem }[] {
  return GROUPS.flatMap((group) => (set[group] as readonly PeriodItem[]).map((item) => ({ group, item })))
}

const continentOfItem = new Map<string, ContinentId>(PERIOD_FILES.flatMap(([c, s]) => periodItems(s).map(({ item }) => [item.id, c] as const)))
/** 항목이 실린 대륙 파일 (모르는 id 면 undefined) */
export const periodContinentOf = (id: string): ContinentId | undefined => continentOfItem.get(id)

const EMPTY: PeriodSet = { grounds: [], reliefs: [], drains: [], rivers: [], glyphs: [], hides: [], marks: [], labels: [] }
const byLevel = new Map<number, PeriodSet>()
/**
 * 그 단계(이어 센 페이즈 번호 1–5)에 켜지는 항목만 — 0(끔)이나 모르는 단계는 빈 묶음이다(끔 지도는 늘 같다).
 * 같은 단계면 같은 객체를 돌려준다(쓰는 쪽이 객체로 기억해도 된다)
 */
export function periodAt(level: number): PeriodSet {
  if (!LEVELS.includes(level as PeriodLevel)) return EMPTY
  let set = byLevel.get(level)
  if (!set) {
    const on = <T extends { levels: readonly PeriodLevel[] }>(xs: readonly T[]) => xs.filter((x) => x.levels.includes(level as PeriodLevel))
    set = {
      grounds: on(PERIODS.grounds),
      reliefs: on(PERIODS.reliefs),
      drains: on(PERIODS.drains),
      rivers: on(PERIODS.rivers),
      glyphs: on(PERIODS.glyphs),
      hides: on(PERIODS.hides),
      marks: on(PERIODS.marks),
      labels: on(PERIODS.labels),
    }
    byLevel.set(level, set)
  }
  return set
}

// ---- 검사 ---------------------------------------------------------------------------------------------------

/** 항목이 켤 수 있는 단계 — 0(끔)은 둘 수 없다 */
const LEVELS: readonly PeriodLevel[] = [1, 2, 3, 4, 5]
/** geo/*.json 의 점 [x, y] 를 고리로 */
const asRing = (pts: readonly (readonly number[])[]): Ring => pts as unknown as Ring
const LANDSCAPES: readonly Landscape[] = [sejiriLandscape, akoumLandscape, tazeemLandscape, murasaLandscape, onduLandscape, guulDrazLandscape, balaGedLandscape]
const WATERS: Readonly<Record<string, Ring>> = Object.fromEntries(Object.entries(features.waters).map(([k, pts]) => [k, asRing(pts)]))
const FORESTS: readonly Ring[] = features.forests.map(asRing)
const LANDS: readonly (readonly [string, Ring])[] = [...Object.entries(coastlines.landmasses), ...Object.entries(coastlines.islets)].map(([k, pts]) => [k, asRing(pts)] as const)
/** 해안 절벽 빗금은 해안에서 이 거리 안에 닿는 협곡 끝에서 끊긴다 (ZendikarMap 의 coastBreaks 와 같은 값) */
const COAST_BREAK = 17

/** 육지 덩어리 위의 한 점이 어느 대륙인지 — src/data/index.ts 의 continentAt 와 같은 셈 (덩어리를 나눠 쓰는 대륙은 area 로 가른다) */
function continentOn(landmass: string, x: number, y: number) {
  const owners = continents.filter((c) => c.landmass === landmass)
  if (owners.length === 0) return continents.find((c) => c.islands?.includes(landmass))
  if (owners.length === 1) return owners[0]
  return owners.find((c) => c.area && pointInRing(x, y, c.area)) ?? owners[0]
}
/** 땅 위의 한 점이 어느 대륙인지 (바다면 undefined) */
function continentAtPoint(x: number, y: number) {
  const land = LANDS.find(([, r]) => pointInRing(x, y, r))
  return land ? continentOn(land[0], x, y) : undefined
}
/** 가장 가까운 해안까지의 거리와 그 해안의 대륙 */
function nearestCoast(x: number, y: number) {
  let best = { d: Infinity, landmass: '' }
  for (const [k, r] of LANDS) {
    const d = distanceToPolyline(x, y, r, true)
    if (d < best.d) best = { d, landmass: k }
  }
  return { d: best.d, continent: best.landmass ? continentOn(best.landmass, x, y) : undefined }
}

/** 점들의 상자 */
function boxOf(pts: readonly Point[]) {
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
  return { x0, y0, x1, y1 }
}

/** 이 지도가 고른 좌표가 든 모양 (estimate 가 있어야 한다) */
const chosen = (s: PeriodShape) => 'ring' in s || 'band' in s

/**
 * 페이즈 바탕 항목을 검사한다 — 어긋난 것을 모두 모아 던진다. 불러올 때 PERIODS 로 한 번 부른다.
 * P1 id·단계·근거 / P2 가리키는 것이 있는지 / P3 through 의 선은 숨어 있어야 / P4 한 장소·한 단계에 표시 하나 / P5 죽은 숲은 나무만 / P6 해안 절벽 끊김
 */
export function checkPeriods(set: PeriodSet = PERIODS): void {
  const errors: string[] = []
  const fail = (id: string, msg: string) => errors.push(`periods: '${id}' — ${msg}`)
  const areaIds = new Set(LANDSCAPES.flatMap((l) => (l.areas ?? []).map((a) => a.id)))
  const riverIds = new Set(LANDSCAPES.flatMap((l) => (l.rivers ?? []).map((r) => r.id)))
  const lines = new Map(LANDSCAPES.flatMap((l) => (l.lines ?? []).map((x) => [x.id, x] as const)))
  const baseIds = new Set(LANDSCAPES.flatMap((l) => [...(l.areas ?? []), ...(l.rivers ?? []), ...(l.lines ?? []), ...(l.glyphs ?? []), ...(l.sea ?? [])].map((f) => f.id)))
  const place = (id: string) => locations.find((l) => l.id === id)
  const finite = (pts: readonly Point[]) => pts.every((p) => p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))

  // P2 — 모양이 가리키는 것이 있는지. forest 는 순번이 밀리지 않았는지도 (그 상자 가운데가 expect 대륙의 땅이어야 한다 — B3)
  const checkShape = (id: string, s: PeriodShape) => {
    if ('ring' in s) {
      if (s.ring.length < 3 || !finite(s.ring)) fail(id, '고리(ring)는 점 셋 이상이어야 한다')
    } else if ('band' in s) {
      if (s.band.length < 2 || !finite(s.band)) fail(id, '띠(band)는 점 둘 이상이어야 한다')
      if (!(s.width > 0)) fail(id, '띠(band)의 폭이 없다')
    } else if ('water' in s) {
      if (!WATERS[s.water]) fail(id, `내해 '${s.water}' 가 geo/features.json 에 없다`)
    } else if ('forest' in s) {
      const ring = FORESTS[s.forest]
      if (!Number.isInteger(s.forest) || !ring) fail(id, `팬 지도 숲 ${s.forest} 번이 geo/features.json 에 없다`)
      else {
        const b = boxOf(ring)
        const at = continentAtPoint((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2)
        if (at?.id !== s.expect) fail(id, `팬 지도 숲 ${s.forest} 번의 가운데가 '${s.expect}' 가 아니라 '${at?.id ?? '바다'}' 에 있다 — 숲 순번이 바뀌었는지 본다 (scripts/geo/extract_geo.py)`)
      }
    } else if ('continent' in s) {
      if (!continents.some((c) => c.id === s.continent)) fail(id, `대륙 '${s.continent}' 가 없다`)
    } else if ('place' in s) {
      const l = place(s.place)
      if (!l || !isPlaced(l) || !l.extent) fail(id, `장소 '${s.place}' 가 없거나 자리·범위(extent)가 없다`)
    } else if (!areaIds.has(s.area)) fail(id, `바탕 지형 영역 '${s.area}' 가 없다`)
  }

  const ids = new Set<string>()
  for (const { group, item } of periodItems(set)) {
    const id = item.id
    // P1 — id 는 바탕 지형과 페이즈 항목을 통틀어 하나, 단계는 1–5 에서 비지 않게(오름차순, 겹침 없이), 근거는 늘
    if (!id) fail('?', `${group} 에 id 가 없다`)
    if (ids.has(id)) fail(id, 'id 가 둘이다')
    if (baseIds.has(id)) fail(id, '바탕 지형(landscape) id 와 겹친다')
    ids.add(id)
    if (!item.op) fail(id, '조사 항목(op)이 없다')
    if (item.levels.length === 0) fail(id, '단계(levels)가 비었다')
    if (item.levels.some((l, i) => !LEVELS.includes(l) || (i > 0 && l <= item.levels[i - 1])))
      fail(id, `단계 [${item.levels.join(', ')}] — 1–5 의 페이즈 번호를 오름차순으로, 겹치지 않게 단다 (0 은 끔이라 둘 수 없다)`)
    if (!item.basis.trim()) fail(id, '공식 근거(basis)가 없다')
    if (item.estimate !== undefined && !item.estimate.trim()) fail(id, 'estimate 가 비었다 — 쓰지 않으면 지운다')
    if (item.location && !place(item.location)) fail(id, `장소 '${item.location}' 가 없다`)
    for (const at of item.alsoAt ?? []) {
      if (!place(at)) fail(id, `alsoAt 의 장소 '${at}' 가 없다`)
      if (at === item.location) fail(id, `alsoAt 의 장소 '${at}' 가 location 과 같다`)
    }
    if ('label' in item && item.label !== undefined && !item.label.trim()) fail(id, '이름(label)이 비었다')

    // 이 지도가 좌표를 고른 항목에는 고른 까닭이 있어야 한다 (패널에 '추정')
    let picked = false
    if (group === 'grounds' || group === 'reliefs') {
      const g = item as PeriodGround | PeriodRelief
      if (g.shapes.length === 0) fail(id, '범위(shapes)가 없다')
      for (const s of [...g.shapes, ...((g as PeriodGround).minus ?? [])]) {
        checkShape(id, s)
        picked ||= chosen(s)
      }
      if (g.density !== undefined && !(g.density > 0 && g.density <= 1)) fail(id, `밀도 ${g.density} — 0 보다 크고 1 이하`)
      if (g.clears !== undefined && g.clears !== 'all' && g.clears.length === 0) fail(id, 'clears 가 비었다 — 뺄 기호가 없으면 지운다')
    }
    if (group === 'grounds') {
      const g = item as PeriodGround
      // P5 — 죽은 숲은 나무(tree·mangrove)만 빼고, 그 가운데 일부를 죽은 나무로 다시 그린다. 무늬 기호가 없다
      if (g.kind === 'deadwood') {
        if (g.clears === 'all' || g.clears.length === 0 || g.clears.some((k) => k !== 'tree' && k !== 'mangrove')) fail(id, "죽은 숲(deadwood)의 clears 는 'tree'·'mangrove' 만")
        if (g.density !== undefined) fail(id, '죽은 숲(deadwood)에는 무늬 기호 밀도(density)가 없다')
      }
    }
    if (group === 'reliefs') {
      const r = item as PeriodRelief
      if (r.density === undefined) fail(id, '영역 기호의 밀도(density)가 없다')
      // P3 — 더하는 기호가 지나갈 바탕 선은 이 영역의 모든 단계에서 숨어 있어야 한다
      for (const line of r.through ?? []) {
        if (!lines.has(line)) fail(id, `through 의 바탕 선 '${line}' 가 없다`)
        const hidden = set.hides.filter((h) => h.line === line).flatMap((h) => h.levels)
        const open = r.levels.filter((l) => !hidden.includes(l))
        if (open.length) fail(id, `through 의 선 '${line}' 가 단계 ${open.join('·')} 에서 숨지 않는다 — 그 단계에도 hides 를 둔다`)
      }
    }
    if (group === 'drains') {
      const d = item as PeriodDrain
      const ring = WATERS[d.water]
      if (!ring) fail(id, `내해 '${d.water}' 가 geo/features.json 에 없다`)
      for (const r of d.dryMouths) if (!riverIds.has(r)) fail(id, `dryMouths 의 강 '${r}' 가 바탕 지형에 없다`)
      if (!(d.density > 0 && d.density <= 1)) fail(id, `바닥 무늬 밀도 ${d.density} — 0 보다 크고 1 이하`)
      if (!(d.craze >= 0 && d.craze <= 1)) fail(id, `기하 무늬 몫 ${d.craze} — 0..1`)
      d.pools.forEach((p, i) => {
        if (p.length < 3 || !finite(p)) fail(id, `남은 물 ${i} 번은 점 셋 이상이어야 한다`)
        else if (ring && p.some(([x, y]) => !pointInRing(x, y, ring))) fail(id, `남은 물 ${i} 번이 옛 물가(내해 '${d.water}') 밖으로 나간다`)
      })
      picked ||= d.pools.length > 0
    }
    if (group === 'rivers') {
      const r = item as PeriodRiver
      if (r.course.length < 2 || !finite(r.course)) fail(id, '물길(course)은 점 둘 이상이어야 한다')
      if (r.width !== undefined && !(r.width > 0)) fail(id, `강 폭 ${r.width}`)
      picked = true
    }
    if (group === 'glyphs') {
      const g = item as PeriodGlyph
      if (!finite([g.at])) fail(id, '자리(at)가 없다')
      if (g.size !== undefined && !(g.size > 0)) fail(id, `기호 크기 ${g.size}`)
      picked = true
    }
    if (group === 'hides') {
      const h = item as PeriodHide
      if (!lines.has(h.line)) fail(id, `숨길 바탕 선 '${h.line}' 가 없다`)
    }
    if (group === 'marks') {
      // P2 — 표시를 바꿀 장소는 지도에 점으로 찍힌 곳 (지역·물 이름은 표시가 없다)
      const m = item as PeriodMark
      const l = place(m.place)
      if (!l || !isPlaced(l) || l.kind === 'region' || l.kind === 'water') fail(id, `장소 '${m.place}' 가 없거나 지도에 표시가 없는 곳이다 (자리 있는 점 장소만)`)
      else if (m.kind !== null && m.kind === l.kind) fail(id, `장소 '${m.place}' 는 원래 ${l.kind} 라 바꿀 것이 없다`)
    }
    if (group === 'labels') {
      const b = item as PeriodLabel
      const l = place(b.place)
      if (!l || !isPlaced(l) || (l.kind !== 'region' && l.kind !== 'water')) fail(id, `장소 '${b.place}' 가 없거나 이름 라벨(지역·물)이 아니다`)
    }
    if (picked && !item.estimate) fail(id, '자리·범위·물길을 이 지도가 골랐으니(ring·band·course·at·pools) 고른 까닭(estimate)을 적는다')
  }

  // P4 — 한 장소·한 단계에는 표시 바꿈이 하나, 이름 바꿈이 하나
  for (const [group, list] of [['marks', set.marks], ['labels', set.labels]] as const) {
    const seen = new Map<string, string>()
    for (const m of list) {
      for (const l of m.levels) {
        const key = `${m.place}@${l}`
        const other = seen.get(key)
        if (other) fail(m.id, `장소 '${m.place}' 의 단계 ${l} ${group} 가 '${other}' 와 겹친다`)
        else seen.set(key, m.id)
      }
    }
  }

  // P6 — 해안 절벽 빗금의 끊김(coastBreaks)은 페이즈와 상관없이 정적이다: 숨기는 협곡의 끝, 더하는 강의 끝이 절벽 해안 대륙의
  // 해안 17 단위 안이면 끔 지도의 끊김이 그 단계에도 남거나(숨긴 협곡) 강 어귀에 빗금이 그어진다(더한 강)
  const coastEnds: [string, Point][] = [
    ...set.hides.flatMap((h) => {
      const l = lines.get(h.line)
      return l && l.kind === 'gorge' ? [[h.id, l.line[0]] as [string, Point], [h.id, l.line[l.line.length - 1]] as [string, Point]] : []
    }),
    ...set.rivers.flatMap((r) => (r.course.length ? [[r.id, r.course[0]] as [string, Point], [r.id, r.course[r.course.length - 1]] as [string, Point]] : [])),
  ]
  for (const [id, [x, y]] of coastEnds) {
    const near = nearestCoast(x, y)
    if (near.d < COAST_BREAK && near.continent?.relief.cliffs)
      fail(id, `끝 (${x}, ${y}) 이 절벽 해안(${near.continent.id})에서 ${near.d.toFixed(1)} 단위 — ${COAST_BREAK} 단위 안이면 해안 절벽 끊김이 단계와 어긋난다`)
  }

  if (errors.length) throw new Error(errors.join('\n'))
}
