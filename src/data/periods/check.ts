// 페이즈 바탕의 장소 표시가 카드와 맞는지 — M1·M2. 페이즈 카드 조회표(phase.ts 의 loadPhaseData)가 있어야 해서 ./index.ts 의 자체 검사와 따로 둔다.
// 부르는 곳: scripts/childmaps/to_ts.mjs --check(Node — 원본 phaseN.ts·cards.ts 에서 조회표를 셈해 넘긴다), 개발 중의 loadPhaseData.
// 시점별 보기(src/data/timeline.ts)의 시점판 V6 도 여기 — 같은 표시 바꿈을 시점의 바탕 단계(periodLevel)로 본다.
// Node 가 그대로 읽게 런타임 import 는 확장자를 붙인다.
import { faceBinding, type LandFaceEntry } from '../landFace.ts'
import { locations } from '../locations.ts'
import { PHASE_SLOTS, sagaStart } from '../sagas.ts'
import { drawnAt, landAt, TIMES, type TimedCard } from '../timeline.ts'
import { isPlaced, type LocationKind } from '../types.ts'
import { PERIODS } from './index.ts'
import type { PeriodSet } from './types.ts'

/** 카드가 가리키는 곳 (phase1.ts·cards.ts 의 depicts 와 같은 모양) */
interface Depicts {
  type: string
  id: string
}

/** 대지 카드 (cards.ts 의 LandCard 와 같은 모양) */
interface LandLike {
  id: string
  name: string
  kind: string
  depicts: Depicts
}

/** 대지 면 (src/data/landFace.ts 의 LandFaceEntry 와 같은 모양) */
type FaceLike = Pick<LandFaceEntry, 'id' | 'name' | 'front' | 'level' | 'sagaBound' | 'depicts'>

/** M1·M2 가 보는 카드와 조회표 — 모양만 맞으면 지도 조각(PhaseMapCard)이든 원본(PhaseCard)이든 된다. L 은 대지 카드의 모양 (LandCard) */
export interface PeriodMarkCheckInput<L extends LandLike = LandLike> {
  /** 모든 페이즈 카드 (phase1.. 모두 — 지도 조각이든 원본이든) */
  phaseCards: readonly { id: string; name: string; depicts: Depicts }[]
  /** 카드가 처음 오르는 페이즈 (이어 센 번호 — PhaseData.phaseOf) */
  phaseOf: ReadonlyMap<string, number>
  /** 그 사가 안에서 끝나는 카드의 마지막 페이즈 (이어 센 번호 — PhaseData.lastOf) */
  lastOf: ReadonlyMap<string, number>
  /** 대지 카드 (cards.ts 의 LAND_CARDS) */
  landCards: readonly L[]
  /** 사가에 매인 대지 카드가 처음 나오는 페이즈 — 늘 나오는 카드는 undefined (src/data/index.ts 의 landPhase) */
  landPhase: (c: L) => number | undefined
  /** 사가에 매인, 장소와 하나인 카드 — 장소 id → 카드 (src/data/index.ts 의 sagaPlaceCards) */
  sagaPlaceCards: ReadonlyMap<string, L>
  /** 양면 카드의 대지 면 (src/data/landFace.ts — 이어진 장소의 패널에 실린다). 없으면 보지 않는다 */
  landFaces?: readonly FaceLike[]
  /** 볼 페이즈 바탕 항목 — 없으면 PERIODS (픽스처로 시험할 때 다른 묶음을 넣는다. 함수의 둘째 인자가 있으면 그것이 먼저다) */
  periods?: PeriodSet
}

/** 페이즈 단계들 (이어 센 번호 — 0 끔은 표시가 바뀌지 않는다) */
const LEVELS = PHASE_SLOTS.map((p) => p.level)

/** 페이즈 카드가 그 단계에서 그려지는가 — 같은 사가에서 오른 페이즈부터, until 이 있으면 그 페이즈까지 (phase.ts 의 규칙) */
const phaseCardOn = (first: number | undefined, last: number | undefined, level: number) =>
  first !== undefined && sagaStart(level) <= first && first <= level && (last === undefined || level <= last)
/** 대지 카드가 그 단계에서 나오는가 — 사가에 매이지 않은 카드는 늘, 매인 카드는 그 사가의 그 페이즈부터 사가 끝까지 */
const landCardOn = (first: number | undefined, level: number) => first === undefined || (sagaStart(level) <= first && first <= level)
/** 대지 면이 그 단계에서 장소 패널에 실리는가 — sagaBound 면 그 카드의 페이즈부터 그 사가 끝까지, 아니면 늘 (대지 카드와 같다) */
const faceOn = (f: FaceLike, level: number) => landCardOn(f.sagaBound ? f.level : undefined, level)

/**
 * 장소 표시와 카드가 어긋난 것 (없으면 빈 목록)
 * - M1: 표시를 숨긴(kind: null — 그 무렵 없던 곳) 단계에 그 장소를 가리키는 페이즈 카드나 대지 카드가 나오면 — 없던 곳에 카드가 놓인다
 * - M2: 장소와 하나인 사가 카드(sagaPlaceCards)가 나오는 단계에는 그 장소 표시의 종류가 카드의 종류와 같아야 한다 (OGW 의 Sea Gate Wreckage = 폐허)
 */
export function periodMarkProblems<L extends LandLike>(input: PeriodMarkCheckInput<L>, set: PeriodSet = input.periods ?? PERIODS): string[] {
  const problems: string[] = []
  const { landPhase } = input
  /** 그 단계에서 그 장소 표시의 종류 — 페이즈 바탕이 바꾸지 않으면 장소 본래 종류, 숨기면 null */
  const markAt = (place: string, level: number): LocationKind | null | undefined => {
    const m = set.marks.find((x) => x.place === place && x.levels.includes(level as never))
    if (m) return m.kind
    return locations.find((l) => l.id === place)?.kind
  }
  const pointsAt = (c: { depicts: Depicts }, place: string) => c.depicts.type === 'location' && c.depicts.id === place

  // M1 — 그 무렵 없던 곳을 가리키는 카드
  for (const m of set.marks) {
    if (m.kind !== null) continue
    for (const level of m.levels) {
      for (const c of input.phaseCards) {
        if (pointsAt(c, m.place) && phaseCardOn(input.phaseOf.get(c.id), input.lastOf.get(c.id), level))
          problems.push(`M1: '${m.id}' 가 단계 ${level} 에 '${m.place}' 표시를 숨기는데(그 무렵 없던 곳), 그 장소를 가리키는 페이즈 카드 ${c.name} 이(가) 그 단계에 나온다`)
      }
      for (const c of input.landCards) {
        if (pointsAt(c, m.place) && landCardOn(landPhase(c), level))
          problems.push(`M1: '${m.id}' 가 단계 ${level} 에 '${m.place}' 표시를 숨기는데(그 무렵 없던 곳), 그 장소를 가리키는 대지 카드 ${c.name} 이(가) 그 단계에 나온다`)
      }
      // 대지 면 — 사가에 매이지 않은 면은 모든 단계에 그 장소 패널에 실리니, 그 무렵 없던 곳을 가리키면 sagaBound 로 그 사가에 매어야 한다
      for (const f of input.landFaces ?? []) {
        if (pointsAt(f, m.place) && faceOn(f, level))
          problems.push(`M1: '${m.id}' 가 단계 ${level} 에 '${m.place}' 표시를 숨기는데(그 무렵 없던 곳), 그 장소를 가리키는 양면 카드 ${f.front} 의 대지 면 ${f.name} 이(가) 그 단계에 실린다${f.sagaBound ? '' : ' (land.sagaBound 를 달지 않아 늘 실린다)'}`)
      }
    }
  }

  // M2 — 장소와 하나인 사가 카드가 나오는 단계의 표시 종류
  for (const [place, card] of input.sagaPlaceCards) {
    const l = locations.find((x) => x.id === place)
    // 지역·물 이름이나 자리 없는 곳은 표시가 없다 (Ruins of Oran-Rief 는 지역 오란리프 — 패널에만 실린다)
    if (!l || !isPlaced(l) || l.kind === 'region' || l.kind === 'water') continue
    const first = landPhase(card)
    for (const level of LEVELS) {
      if (first === undefined || !landCardOn(first, level)) continue
      const kind = markAt(place, level)
      if (kind !== card.kind)
        problems.push(`M2: 단계 ${level} 에 장소와 하나인 사가 카드 ${card.name}(${card.kind})이 나오는데, '${place}' 표시는 ${kind ?? '숨김'} 이다 — 같은 단계의 표시 종류를 카드에 맞춘다 (src/data/periods 의 marks)`)
    }
  }
  return problems
}

/** M1·M2 — 어긋나면 모아 던진다 */
export function checkPeriodMarks<L extends LandLike>(input: PeriodMarkCheckInput<L>, set: PeriodSet = input.periods ?? PERIODS): void {
  const problems = periodMarkProblems(input, set)
  if (problems.length) throw new Error(problems.map((p) => `periods/check: ${p}`).join('\n'))
}

/** V6 이 보는 카드 — 시점이 있는 페이즈 카드(timeline.ts 의 TimedCard)와 사가 필드가 있는 대지 카드 */
export interface TimeMarkCheckInput<L extends LandLike & { saga?: number; sagaPhase?: number } = LandLike & { saga?: number; sagaPhase?: number }> {
  /** 모든 페이즈 카드 (phase1.. 모두) */
  phaseCards: readonly (TimedCard & { depicts: Depicts })[]
  /** 대지 카드 (cards.ts 의 LAND_CARDS) */
  landCards: readonly L[]
  /** 사가에 매인, 장소와 하나인 카드 — 장소 id → 카드 (src/data/index.ts 의 sagaPlaceCards) */
  sagaPlaceCards: ReadonlyMap<string, L>
  /** 양면 카드의 대지 면 (src/data/landFace.ts) — 없으면 보지 않는다 */
  landFaces?: readonly FaceLike[]
  periods?: PeriodSet
}

/**
 * 시점별 보기의 장소 표시와 카드가 어긋난 것 — M1·M2 의 시점판 (V6)
 * - V6 (M1): 그 시점의 바탕 단계(periodLevel)에서 표시를 숨긴(kind: null) 장소를 가리키는 페이즈 카드(그 시점에 그리는 것)나 대지 카드(landAt)가 나오면
 * - V6 (M2): 장소와 하나인 사가 카드가 그 시점에 나오면 그 시점의 표시 종류가 카드의 종류와 같아야 한다
 */
export function timeMarkProblems<L extends LandLike & { saga?: number; sagaPhase?: number }>(input: TimeMarkCheckInput<L>, set: PeriodSet = input.periods ?? PERIODS): string[] {
  const problems: string[] = []
  const pointsAt = (c: { depicts: Depicts }, place: string) => c.depicts.type === 'location' && c.depicts.id === place
  for (const m of set.marks) {
    if (m.kind !== null) continue
    for (const time of TIMES) {
      if (!m.levels.includes(time.periodLevel as never)) continue
      for (const c of input.phaseCards)
        if (pointsAt(c, m.place) && drawnAt(c, time.t))
          problems.push(`V6: '${m.id}' 가 단계 ${time.periodLevel}(시점 ${time.t} ${time.name})에 '${m.place}' 표시를 숨기는데(그 무렵 없던 곳), 그 장소를 가리키는 페이즈 카드 ${c.name} 이(가) 그 시점에 나온다`)
      for (const c of input.landCards)
        if (pointsAt(c, m.place) && landAt(c, time.t))
          problems.push(`V6: '${m.id}' 가 단계 ${time.periodLevel}(시점 ${time.t} ${time.name})에 '${m.place}' 표시를 숨기는데(그 무렵 없던 곳), 그 장소를 가리키는 대지 카드 ${c.name} 이(가) 그 시점에 나온다`)
      for (const f of input.landFaces ?? [])
        if (pointsAt(f, m.place) && landAt(faceBinding(f), time.t))
          problems.push(`V6: '${m.id}' 가 단계 ${time.periodLevel}(시점 ${time.t} ${time.name})에 '${m.place}' 표시를 숨기는데(그 무렵 없던 곳), 그 장소를 가리키는 양면 카드 ${f.front} 의 대지 면 ${f.name} 이(가) 그 시점에 실린다`)
    }
  }
  for (const [place, card] of input.sagaPlaceCards) {
    const l = locations.find((x) => x.id === place)
    if (!l || !isPlaced(l) || l.kind === 'region' || l.kind === 'water') continue
    for (const time of TIMES) {
      if (!landAt(card, time.t)) continue
      const hit = set.marks.find((x) => x.place === place && x.levels.includes(time.periodLevel as never))
      const kind = hit ? hit.kind : l.kind
      if (kind !== card.kind)
        problems.push(`V6: 시점 ${time.t}(${time.name})에 장소와 하나인 사가 카드 ${card.name}(${card.kind})이 나오는데, 단계 ${time.periodLevel} 의 '${place}' 표시는 ${kind ?? '숨김'} 이다`)
    }
  }
  return problems
}

/** V6 — 어긋나면 모아 던진다 */
export function checkTimeMarks<L extends LandLike & { saga?: number; sagaPhase?: number }>(input: TimeMarkCheckInput<L>, set: PeriodSet = input.periods ?? PERIODS): void {
  const problems = timeMarkProblems(input, set)
  if (problems.length) throw new Error(problems.map((p) => `periods/check: ${p}`).join('\n'))
}
