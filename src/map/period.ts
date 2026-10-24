// 페이즈 바탕의 입구 — 늦게 받는 조각. 페이즈를 켤 때 App 이 페이즈 카드 데이터와 함께 불러(import('./map/period')) createPeriods() 를 넘기고,
// ZendikarMap 이 단계(이어 센 페이즈 번호)마다 at(level, ctx) 로 그 무렵의 바탕(PeriodView)을 받아 그린다. 메인 그래프는 periodTypes.ts 의 타입만 쓴다.
// - 세계 지도 축척(tier 0–4)의 기호: 바탕 지형의 기록(ctx.log — terrain.ts 의 terrainLogOf)을 판정대로 잘라 다시 잇는다(사용자 결정 D9 의 B — 몇 ms).
//   기록이 없으면 켠 항목의 페이즈로 buildTerrain 을 바로 다시 돌린다(A — 같은 결과지만 cpu×4 에서 350 ms 남짓, 페이즈를 켤 때 긴 작업이 된다).
//   단계마다가 아니라 켠 항목의 열쇠마다 한 번 — 사가1 페이즈1·2 처럼 바탕이 같은 단계는 함께 쓴다. 지형 입력(terrainInput)이 바뀌면 새로 셈한다
// - 깊은 확대 칸: 칸마다 닿는 항목만으로 페이즈를 만들어(fine.phaseFor) buildTerrain 이 그 칸에 바로 적용한다. 칸 열쇠 끝에 닿는 항목을 붙인다(`~p…`)
// - 칠·내해 바닥·강·폭포·표시·이름: 단계마다 path 와 표로 (세계 지도 다듬기, 깊은 확대 다듬기는 처음 부를 때)
// 데이터(src/data/periods)는 개발 중에 이 조각을 불러올 때 검사한다(P1–P6) — 어긋나면 이 조각을 받는 데서 멈춘다. 빌드에서는 검사가 빠진다
import { checkPeriods, PERIODS, periodAt, periodContinentOf, type PeriodGroup } from '../data/periods'
import type { PeriodDrain, PeriodGlyph, PeriodGround, PeriodRelief, PeriodRiver, PeriodSet } from '../data/periods/types'
import { PHASE_SLOTS } from '../data/sagas'
import { inlandWaterIds, inlandWaters } from './geo'
import { distanceToPolyline, pointInRing, ringToPath, simplifyRing, type Bounds } from './geometry'
import { landmarkShapes, riverPaths, shapeRivers, type RiverPaths } from './landscape'
import { periodGlyphKit, periodLegendArt } from './periodGlyphs'
import {
  makePhase,
  periodGlyphsOf,
  periodRegion,
  periodRiversOf,
  phaseRules,
  replayTerrain,
  rulesWithin,
  traceRegion,
  type PeriodSources,
  type PeriodVariant,
  type PhaseRules,
} from './periodTerrain'
import type {
  BasinPaths,
  PeriodCtx,
  PeriodFeature,
  PeriodFineKit,
  PeriodLegendKey,
  PeriodNote,
  PeriodView,
  PeriodWashKind,
  PeriodWashPaths,
  Periods,
  TerrainPhase,
} from './periodTypes'
import { assertNeutralPhase, buildTerrain, type TerrainInput, type TerrainLayers } from './terrain'

if (import.meta.env.DEV) checkPeriods()

/** 깊은 확대 칸 둘레에서 닿는 항목을 더 묻는 폭 (기호 크기 g 배) — childDetail.ts 의 KEY_MARGIN 과 같다 */
const KEY_MARGIN = 16
/**
 * 죽은 숲 옅은 덧칠의 경계를 따르는 격자와 다 딴 고리를 단순화하는 폭 (지도 단위) — 세계 지도는 굵게, 깊은 확대는 곱게.
 * 경계 점은 격자 변 위에서 이분법으로 찾아 정확하고, 격자는 두 범위의 경계가 만나는 모서리를 얼마나 깎는지만 정한다
 */
const TINT_STEP: Record<PeriodVariant, number> = { world: 2.5, deep: 0.75 }
const TINT_SIMPLIFY: Record<PeriodVariant, number> = { world: 0.75, deep: 0.08 }

/** 지형 입력 하나(terrainInput — 바탕 데이터가 바뀌면 새로)에 딸린 셈 */
interface InputState {
  src: PeriodSources
  /** 단계 → 그 무렵의 바탕 (켠 항목이 없으면 undefined) */
  views: Map<number, PeriodView | undefined>
  /** 켠 항목의 열쇠 → 세계 지도 축척의 기호 (같은 열쇠의 단계는 함께 쓴다) */
  terrains: Map<string, TerrainLayers>
  /** 닿는 항목의 열쇠 → 깊은 확대 칸의 페이즈 */
  tilePhases: Map<string, TerrainPhase>
  /** 개발 중 단언(아무것도 바꾸지 않는 페이즈로 다시 만든 지형이 바탕과 같다)을 보았나 */
  checked: boolean
}

const memo = <T>(make: () => T): (() => T) => {
  let hit: { v: T } | undefined
  return () => (hit ??= { v: make() }).v
}

/** 그 단계에 켠 항목이 하나도 없나 */
const isEmpty = (s: PeriodSet) =>
  !s.grounds.length && !s.reliefs.length && !s.drains.length && !s.rivers.length && !s.glyphs.length && !s.hides.length && !s.marks.length && !s.labels.length

/** 지형 기호에 닿는 항목 (칠·영역·물 빼기·강·폭포·숨긴 선) — 세계 지도 기호의 열쇠 */
const terrainIds = (s: PeriodSet) => [...s.grounds, ...s.reliefs, ...s.drains, ...s.rivers, ...s.glyphs, ...s.hides].map((x) => x.id).sort()

/** 항목 → 패널 지형 종류 */
function featureOf(group: PeriodGroup, item: PeriodGround | PeriodRelief | PeriodDrain | PeriodRiver | PeriodGlyph): PeriodFeature | null {
  const continentId = periodContinentOf(item.id)
  if (!continentId) return null
  const kind: PeriodFeature['kind'] =
    group === 'grounds'
      ? (item as PeriodGround).kind
      : group === 'reliefs'
        ? (item as PeriodRelief).kind
        : group === 'drains'
          ? 'drybed'
          : group === 'rivers'
            ? 'river'
            : (item as PeriodGlyph).kind
  return {
    feature: { id: item.id, label: item.label, basis: item.basis, estimate: item.estimate, location: item.location, alsoAt: item.alsoAt },
    kind,
    continentId,
    period: true,
  }
}

/**
 * 물이 빠진 바닥 무늬의 기하 무늬 몫 (PeriodFineKit.drybedCraze) — (x, y) 에서 가장 가까운(범위 상자 안이면 0) 내해 물 빼기 항목의 craze.
 * 그 단계의 항목을 먼저 보고, 없으면(지역 상세 칸의 문이 데이터의 단계와 어긋난 때) 모든 단계의 항목에서. 항목이 하나뿐이면 범위를 풀지 않는다
 */
function drybedCrazeOf(drains: readonly PeriodDrain[], src: PeriodSources): (x: number, y: number) => number {
  const list = drains.length ? drains : PERIODS.drains
  if (list.length <= 1) {
    const c = list[0]?.craze ?? 0
    return () => c
  }
  const boxes = list.map((d) => periodRegion(src, 'world', d).bounds)
  const away = (b: Bounds, x: number, y: number) => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.y0 - y, 0, y - b.y1))
  return (x, y) => {
    let best = 0
    for (let i = 1; i < list.length; i++) if (away(boxes[i], x, y) < away(boxes[best], x, y)) best = i
    return list[best].craze
  }
}

/** 아무것도 바꾸지 않는 페이즈 — 모두 남기고, 더하는 것·숨기는 선이 없다 */
const NEUTRAL: TerrainPhase = {
  key: '',
  hideLines: new Set(),
  prepare: () => ({ verdict: () => 0, peaks: [], marsh: [], period: { dust: [], chalk: [], drybed: [] }, dead: () => '' }),
}
/** 바탕(base)과 같은가 — 바탕 층은 문자열까지 같고, 페이즈 층은 비어 있어야 한다 */
const sameAsBase = (base: TerrainLayers, t: TerrainLayers) => {
  const { period, ...rest } = t
  return JSON.stringify(rest) === JSON.stringify(base) && Object.values(period ?? {}).every((l: string[]) => l.length === 0)
}

/**
 * 개발 중 단언 — 첫 페이즈를 켤 때 한 번 (빌드에서는 불리지 않는다).
 * - 아무것도 바꾸지 않는 페이즈로 다시 만든 세계 지도 지형이 바탕과 문자열까지 같다 (기록이 있으면 다시 잇기로, 없으면 buildTerrain 으로)
 * - ?periodcheck=1 이면 데이터가 있는 페이즈 단계마다 다시 잇기(B)가 buildTerrain 바로 적용(A)과 같은지 (기록이 있을 때) — 다르면 console.error
 */
function devChecks(ctx: PeriodCtx, src: PeriodSources) {
  if (!import.meta.env.DEV) return
  if (!ctx.log) {
    assertNeutralPhase(ctx.input, ctx.terrain)
    return
  }
  if (!sameAsBase(ctx.terrain, replayTerrain(ctx.terrain, ctx.log, ctx.input, NEUTRAL)))
    console.error('period.ts: 아무것도 바꾸지 않는 페이즈로 바탕 기록을 다시 이은 지형이 바탕과 다르다 — terrain.ts 의 기록(terrainLogOf)을 본다')
  if (!new URLSearchParams(window.location.search).has('periodcheck')) return
  for (const { level } of PHASE_SLOTS) {
    const set = periodAt(level)
    const key = terrainIds(set).join('.')
    if (!key) continue
    const phase = makePhase(phaseRules(set, 'world', src), src, key)
    const t0 = performance.now()
    const a = buildTerrain(ctx.input, undefined, phase)
    const t1 = performance.now()
    const b = replayTerrain(ctx.terrain, ctx.log, ctx.input, phase)
    const t2 = performance.now()
    const same = JSON.stringify(a) === JSON.stringify(b)
    if (same) console.info(`period.ts: 단계 ${level} — 다시 잇기(B ${(t2 - t1).toFixed(1)}ms)가 바로 적용(A ${(t1 - t0).toFixed(1)}ms)과 같다`)
    else console.error(`period.ts: 단계 ${level} — 다시 잇기(B)가 바로 적용(A)과 다르다`)
  }
}

/** 단계 하나의 바탕을 만든다 (InputState 에 기억) */
function buildView(level: number, set: PeriodSet, ctx: PeriodCtx, st: InputState): PeriodView {
  const { src } = st
  const world = phaseRules(set, 'world', src)
  const deep = memo(() => phaseRules(set, 'deep', src))

  // --- 세계 지도 축척의 기호 — 켠 항목의 열쇠마다 한 번. 바탕의 기록이 있으면 다시 잇고(B), 없으면 buildTerrain 을 다시 돌린다(A). 결과는 같다 ---
  const tids = terrainIds(set)
  const tkey = tids.join('.')
  let terrain = ctx.terrain
  if (tkey) {
    const hit = st.terrains.get(tkey)
    if (hit) terrain = hit
    else {
      if (import.meta.env.DEV && !st.checked) {
        st.checked = true
        devChecks(ctx, src)
      }
      const phase = makePhase(world, src, tkey)
      terrain = ctx.log ? replayTerrain(ctx.terrain, ctx.log, ctx.input, phase) : buildTerrain(ctx.input, undefined, phase)
      st.terrains.set(tkey, terrain)
    }
  }

  // --- 깊은 확대 칸 — 칸에 닿는 항목만. 지역 상세의 페이즈 바탕 칸은 kit 의 기호와 데이터의 몫(drybedCraze)으로 ---
  const kit: PeriodFineKit = { ...periodGlyphKit, drybedCraze: drybedCrazeOf(set.drains, src) }
  const within = (fineLevel: number, region: Bounds) => {
    const m = KEY_MARGIN * 2 ** -fineLevel
    const hit = rulesWithin(deep(), { x0: region.x0 - m, y0: region.y0 - m, x1: region.x1 + m, y1: region.y1 + m })
    if (hit) hit.ids.sort()
    return hit
  }
  const fine: PeriodView['fine'] = {
    keyFor: (fineLevel, region) => {
      const hit = within(fineLevel, region)
      return hit ? `~p${hit.ids.join('.')}` : ''
    },
    phaseFor: (fineLevel, region) => {
      const hit = within(fineLevel, region)
      if (!hit) return undefined
      const key = hit.ids.join('.')
      let p = st.tilePhases.get(key)
      if (!p) st.tilePhases.set(key, (p = makePhase(hit.rules, src, key)))
      return p
    },
    kit,
  }

  // --- 칠 ---
  const grounds = set.grounds
  const washPaths = (v: PeriodVariant): PeriodWashPaths => {
    const regions = grounds.map((g) => ({ g, r: periodRegion(src, v, g) }))
    const paint = (list: typeof regions) => list.flatMap(({ r }) => r.shapes.filter((s) => s.paint).map((s) => s.paint)).join('')
    let tint = ''
    for (const { g, r } of regions) {
      if (g.kind !== 'deadwood') continue
      // 범위들의 합에서 남는 숲(minus)을 뺀 모양 — 겹친 범위를 한 칠로 그리려면 고리로 다시 따야 한다.
      // 덧칠은 숲(팬 지도 숲·영역)에만 — 장소 범위(place 타원)는 그 안의 나무를 죽은 나무로 바꾸는 데만 쓴다(숲이 아니던 둘레 땅에 타원 칠이 생기지 않게)
      const wood = r.shapes.filter((_, i) => !('place' in g.shapes[i]))
      if (!wood.length) continue
      const box = wood.reduce(
        (a, w) => ({ x0: Math.min(a.x0, w.bounds.x0), y0: Math.min(a.y0, w.bounds.y0), x1: Math.max(a.x1, w.bounds.x1), y1: Math.max(a.y1, w.bounds.y1) }),
        { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity },
      )
      const inWood = (x: number, y: number) => wood.some((w) => w.inside(x, y)) && !r.minus.some((m) => m.inside(x, y))
      tint += traceRegion(inWood, box, TINT_STEP[v])
        .map((ring) => ringToPath(simplifyRing(ring, TINT_SIMPLIFY[v])))
        .join('')
    }
    return {
      clear: paint(regions),
      keep: regions.flatMap(({ r }) => r.minus.map((m) => m.paint)).join(''),
      dust: paint(regions.filter(({ g }) => g.kind === 'dust')),
      chalk: paint(regions.filter(({ g }) => g.kind === 'chalk')),
      tint,
      bands: regions.flatMap(({ r }) => r.shapes.flatMap((s) => (s.band ? [s.band] : []))),
    }
  }
  const washes = grounds.length ? { world: washPaths('world'), deep: memo(() => washPaths('deep')) } : null
  // 칠 위인가 — 칠과 같은 모양(범위에서 뺀 자리 minus 도 칠은 덮는다), 겹치면 나중에 칠한 백악이 위다. 띠(자국)는 가늘어 보지 않는다
  const washShapes = (v: PeriodVariant) => {
    const of = (kind: PeriodGround['kind']) => grounds.filter((g) => g.kind === kind).flatMap((g) => periodRegion(src, v, g).shapes.filter((s) => s.paint))
    return { chalk: of('chalk'), dust: of('dust') }
  }
  const washWorld = memo(() => washShapes('world'))
  const washDeep = memo(() => washShapes('deep'))
  const washAt = (x: number, y: number, deep: boolean): PeriodWashKind | null => {
    const w = deep ? washDeep() : washWorld()
    return w.chalk.some((s) => s.inside(x, y)) ? 'chalk' : w.dust.some((s) => s.inside(x, y)) ? 'dust' : null
  }

  // --- 물이 빠진 내해 ---
  const basinPaths = (v: PeriodVariant): BasinPaths => {
    const rs = set.drains.map((d) => periodRegion(src, v, d))
    return { floor: rs.map((r) => r.shapes[0].paint).join(''), pools: rs.flatMap((r) => r.minus.map((m) => m.paint)).join('') }
  }
  const basin = set.drains.length ? { world: basinPaths('world'), deep: memo(() => basinPaths('deep')) } : null

  // --- 강 — 물이 빠진 내해로 드는 강은 옛 물가에서 끝난다 (바탕 강을 같은 차례로 다시 — 다른 강의 칸 문자열은 그대로) ---
  let rivers: RiverPaths | null = null
  const dry = set.drains.filter((d) => d.dryMouths.length)
  if (dry.length) {
    const rings = dry.map((d) => inlandWaters[inlandWaterIds.indexOf(d.water)])
    const mouths = ctx.riverShapes.filter((r) => dry.some((d) => d.dryMouths.includes(r.id)))
    rivers = riverPaths(ctx.riverShapes, {
      // 물가 자리가 그 내해의 옛 물가이고, 하구 물칠을 걷을 강의 물길 위인가. 고리까지의 거리는 닫힌 선 거리(distanceToRing 과 같은 셈) —
      // 메인 그래프가 이미 쓰는 함수라, 이 조각만 쓰는 도우미를 진입 조각에 끌어들이지 않는다
      noMouth: (x, y) =>
        rings.some((ring) => pointInRing(x, y, ring) || distanceToPolyline(x, y, ring, true) < 1) && mouths.some((r) => distanceToPolyline(x, y, r.samples) < 1),
    })
  }
  let extraRivers: PeriodView['extraRivers'] = null
  if (set.rivers.length) {
    const shapes = shapeRivers(periodRiversOf(set), ctx.avoid)
    const dryIds = new Set(set.rivers.filter((r) => r.dry).map((r) => r.id))
    const wet = riverPaths(shapes.filter((s) => !dryIds.has(s.id)))
    extraRivers = { water: wet.water, banks: wet.banks, dry: riverPaths(shapes.filter((s) => dryIds.has(s.id)), { dry: true }).banks }
  }
  const landmarks = set.glyphs.length ? landmarkShapes(periodGlyphsOf(set)) : null

  // --- 표시·이름·범례 ---
  const marks = new Map(set.marks.map((m) => [m.place, m.kind] as const))
  const dryLabels = new Set(set.labels.filter((l) => l.dry).map((l) => l.place))
  const legend: PeriodLegendKey[] = []
  if (grounds.some((g) => g.kind === 'dust' || g.kind === 'chalk')) legend.push('blight')
  if (grounds.some((g) => g.kind === 'deadwood')) legend.push('deadwood')
  if (set.drains.length) legend.push('drybed')

  // --- 패널 ---
  const placeName = (id: string) => ctx.locations.find((l) => l.id === id)?.name ?? id
  const notes = new Map<string, PeriodNote[]>()
  const note = (id: string, n: PeriodNote) => notes.set(id, [...(notes.get(id) ?? []), n])
  for (const item of [...set.grounds, ...set.reliefs, ...set.drains, ...set.rivers, ...set.glyphs, ...set.hides])
    for (const at of [item.location, ...(item.alsoAt ?? [])]) if (at) note(at, { id: item.id, label: item.label, basis: item.basis, estimate: item.estimate })
  // 물빛 테두리를 뗀 이름(labels)은 그 내해 물 빼기 항목이 같은 근거로 이미 싣는다
  for (const m of set.marks) note(m.place, { id: m.id, label: m.label ?? placeName(m.place), basis: m.basis, estimate: m.estimate, mark: m.kind })
  const features: { group: PeriodGroup; item: PeriodGround | PeriodRelief | PeriodDrain | PeriodRiver | PeriodGlyph }[] = [
    ...set.grounds.map((item) => ({ group: 'grounds' as const, item })),
    ...set.reliefs.map((item) => ({ group: 'reliefs' as const, item })),
    ...set.drains.map((item) => ({ group: 'drains' as const, item })),
    ...set.rivers.map((item) => ({ group: 'rivers' as const, item })),
    ...set.glyphs.map((item) => ({ group: 'glyphs' as const, item })),
  ]
  const allFeatures = features.flatMap(({ group, item }) => {
    const f = featureOf(group, item)
    return f ? [f] : []
  })

  return {
    level,
    key: [...tids, ...set.marks.map((m) => m.id), ...set.labels.map((l) => l.id)].sort().join('.'),
    terrain,
    fine,
    washes,
    washAt,
    basin,
    rivers,
    extraRivers,
    landmarks,
    marks,
    dryLabels,
    hiddenLines: world.hideLines,
    legend,
    legendArt: periodLegendArt,
    notesOf: (id) => notes.get(id) ?? [],
    featuresOf: (id, by) => allFeatures.filter((f) => (by === 'place' ? f.feature.location === id || Boolean(f.feature.alsoAt?.includes(id)) : f.continentId === id)),
  }
}

/**
 * 페이즈 바탕 — at(level, ctx): 그 단계(이어 센 페이즈 번호 — 항목은 1..5 에만 있다)에 켠 항목이 있으면 그 무렵의 바탕, 없으면(끔·모르는 단계) undefined.
 * 같은 지형 입력(ctx.input)이면 단계마다 한 번만 셈한다
 */
export function createPeriods(): Periods {
  const states = new WeakMap<TerrainInput, InputState>()
  return {
    at(level: number, ctx: PeriodCtx): PeriodView | undefined {
      const set = periodAt(level)
      if (isEmpty(set)) return undefined
      let st = states.get(ctx.input)
      if (!st) {
        st = {
          src: periodSourcesOf(ctx),
          views: new Map(),
          terrains: new Map(),
          tilePhases: new Map(),
          checked: false,
        }
        states.set(ctx.input, st)
      }
      if (st.views.has(level)) return st.views.get(level)
      const view = buildView(level, set, ctx, st)
      st.views.set(level, view)
      return view
    },
  }
}

/** 범위를 풀 때 쓰는 지도 데이터 — 메인 그래프가 넘긴 것에서 */
export const periodSourcesOf = (ctx: PeriodCtx): PeriodSources => ({
  continents: ctx.continents,
  locations: ctx.locations,
  areas: ctx.landscape.areas,
  lines: ctx.landscape.lines,
  glyphs: ctx.landscape.glyphs,
  riverShapes: ctx.riverShapes,
  avoid: ctx.avoid,
})

/** 단계 하나의 지형 규칙과 그 페이즈 (개발 도구용 — scripts/qa/period-check.mjs 가 판정을 세어 본다) */
export function periodPhase(level: number, src: PeriodSources, v: PeriodVariant = 'world'): { rules: PhaseRules; phase: TerrainPhase } {
  const set = periodAt(level)
  const rules = phaseRules(set, v, src)
  return { rules, phase: makePhase(rules, src, terrainIds(set).join('.')) }
}
