// 시점별 보기 — 사가 보기(sagas.ts, ?saga=s&phase=p)와 나란히 두는 둘째 보기(?time=1..4). 사가 보기와 그 규칙은 그대로 둔다.
// 사가 보기는 카드를 세트(=페이즈)와 사가에 묶어 쌓아 그리고 사가를 넘어가면 비운다. 시점별 보기는 카드마다 그 대상이 **그 상태로 그 자리에 있던
// 시점에만** 그린다(사용자 결정 2026-10-19, D1·D2):
// - 오래 그 자리에 사는 대상(종·주민·지형지물·오래된 존재)은 그 시점에도 그 자리(그 상태)에 있다고 공식 자료가 밝힌 시점(time.basis), 또는 이 지도의
//   판단으로 그 시점에도 그린다(time.estimate — 패널에 '추정'. 마커 모양은 바꾸지 않는다).
// - 주문·장면·전투 순간, 장면 때문에 그 자리에 찍힌 인물, 엘드라지와 그 여파는 그 이야기 순간(세트 시점)에만 — 쌓지 않는다.
// - 대지 카드: 사가에 매이지 않은 카드는 늘, BFZ 의 사가에 매인 대지(saga: 2)는 T3–T4, OGW 의 것(sagaPhase: 2)은 T4 (D5).
// 바탕(그 무렵 모습)과 지역 상세의 페이즈 문은 시점마다 그 시점의 이어 센 페이즈 번호(periodLevel)로 셈한다 — 같은 엔진이다.
// 의존이 없게 둔다 (sagas.ts 만) — Node 도구(scripts/figures·scripts/childmaps·scripts/qa)도 이 파일을 그대로 읽는다. 런타임 import 는 확장자를 붙인다
import type { Point } from './types'
import { levelOf, PHASE_SLOTS, SAGAS, slotOf } from './sagas.ts'

/** 시점 — 1: 엘드라지가 깨어나기 전(ZEN·WWK), 2: 깨어남(ROE), 3: 젠디카르 전투(BFZ), 4: 타이탄 이후(OGW) */
export type TimePoint = 1 | 2 | 3 | 4

export interface TimeInfo {
  t: TimePoint
  /** 헤더와 패널에 보이는 이름 (이 지도가 붙였다) */
  name: string
  nameEn: string
  /** 그 시점의 해 */
  years: string
  /** 헤더 단추 글자 — 짧게 (해) */
  button: string
  /** 그 시점의 세트 (대문자 세트 코드) — 카드의 세트 시점 */
  sets: readonly string[]
  /** 이 시점의 바탕(그 무렵 모습)과 지역 상세 문의 기본값으로 쓰는 이어 센 페이즈 번호 (sagas.ts) */
  periodLevel: number
}

export const TIMES: readonly TimeInfo[] = [
  // 탐험과 보물찾기의 젠디카르 — ZEN(2009)·WWK(2010 초). 바탕은 단계 2 (단계 1 과 2 를 가르는 페이즈 바탕 항목이 없어 같은 바탕이다)
  { t: 1, name: '엘드라지가 깨어나기 전', nameEn: 'Before the Awakening', years: '2009–2010', button: '2009', sets: ['ZEN', 'WWK'], periodLevel: 2 },
  // 우진의 눈에서 엘드라지 거신 셋이 풀려난 때 — 영어 이름은 사가1 이름(The Awakening)과 겹치지 않게 세트 이름으로
  { t: 2, name: '깨어남', nameEn: 'Rise of the Eldrazi', years: '2010', button: '2010', sets: ['ROE'], periodLevel: 3 },
  { t: 3, name: '젠디카르 전투', nameEn: 'Battle for Zendikar', years: '2015', button: '2015', sets: ['BFZ'], periodLevel: 4 },
  // 울라모그·코질렉이 쓰러지기까지 (OGW)
  { t: 4, name: '타이탄 이후', nameEn: 'After the Titans', years: '2016', button: '2016', sets: ['OGW'], periodLevel: 5 },
]

/** 모든 시점 (차례) */
export const TIME_POINTS: readonly TimePoint[] = TIMES.map((x) => x.t)

/** 이 지도가 쓰는 이름표 쪽 (phase1.ts 의 PhaseCard.label 과 같다) */
type LabelSide = 'below' | 'right' | 'left' | 'above'

/**
 * 카드마다의 시점 — PhaseCard.time (src/data/phase1.ts). 없으면 그 카드는 세트 시점 하나에만 그린다 (장면·주문은 따로 적지 않는다).
 * 사가 보기는 이 필드를 읽지 않는다
 */
export interface CardTime {
  /** 그리는 시점 — 오름차순, 겹침 없이, 비지 않게. 이어지지 않아도 된다 (Anowon [1, 4]) */
  at: readonly TimePoint[]
  /** 세트 시점이 아닌 이 카드의 시점 (Sorin Markov·Day of Judgment → 2). 까닭은 basis 에 */
  home?: TimePoint
  /** 공식 근거 — 사가 보기가 그리지 않는 시점에도 그 상태로 그 자리에 있다고 공식 자료가 밝힌 것 (home 의 까닭도) */
  basis?: string
  /** 이 지도의 판단 — 오래 사는 대상이라 그 시점에도 그렸다 (moved·aloft 의 까닭도). 패널에 '추정'으로 */
  estimate?: string
  /** 그 시점에만 다른 자리 — 그 시점의 다른 대상에 비켰다 (까닭은 estimate). 크기는 바꾸지 않는다 */
  moved?: Partial<Record<TimePoint, { at: Point; flip?: boolean; label?: LabelSide }>>
  /** 같은 개체 묶음 id — 한 시점에 하나만 그린다 (Kalitas·Omnath·Dragonmaster Outcast …) */
  same?: string
  /** 곁에 상징으로 둔 그림의 카드 id — 그 그림이 그 시점에 없으면 이 카드도 그리지 않는다 */
  beside?: string
  /** 바뀐 바탕(죽은 숲 등) 위의 하늘에 떠 있어 그 바탕과 모순되지 않는다 — 까닭은 estimate */
  aloft?: true
}

/** 지도 조각(?map)에 싣는 시점 — 글 없이. basis·estimate 는 있는지만 (vite/phaseData.ts — 글은 카드마다의 조각에) */
export type MapCardTime = Omit<CardTime, 'basis' | 'estimate'> & { basis?: true; estimate?: true }

/** 시점 셈이 보는 카드 — 지도 조각(PhaseMapCard)이든 원본(PhaseCard)이든 */
export interface TimedCard {
  id: string
  name: string
  /** 세트 코드 (대소문자 상관없음 — 카드 원본은 소문자) */
  set: string
  until?: number
  time?: CardTime | MapCardTime
}

/** 시점 정보 */
export const timeInfo = (t: TimePoint): TimeInfo => TIMES[t - 1]

/** 세트의 시점 — 모르는 세트면 던진다 */
export function timeOfSet(set: string): TimePoint {
  const s = set.toUpperCase()
  const hit = TIMES.find((x) => x.sets.includes(s))
  if (!hit) throw new Error(`timeline: 세트 '${set}' 의 시점이 없다`)
  return hit.t
}

/** 세트가 오르는 이어 센 페이즈 번호 — 사가의 세트 차례 (sagas.ts) */
export function levelOfSet(set: string): number {
  const s = set.toUpperCase()
  for (const [i, saga] of SAGAS.entries()) {
    const j = saga.sets.indexOf(s)
    if (j >= 0 && j < saga.phases) return levelOf(i + 1, j + 1)!
  }
  throw new Error(`timeline: 세트 '${set}' 가 사가의 페이즈에 없다`)
}

/** 카드의 시점 — time.home ?? 세트 시점 */
export const homeOf = (c: Pick<TimedCard, 'set' | 'time'>): TimePoint => c.time?.home ?? timeOfSet(c.set)

/** 그리는 시점 — time.at ?? [homeOf(c)] */
export const timesOf = (c: Pick<TimedCard, 'set' | 'time'>): readonly TimePoint[] => c.time?.at ?? [homeOf(c)]

/** 그 시점에 그리는가 (같은 개체·곁의 상징은 검사 V4·V5 가 맞춰 둔다) */
export const drawnAt = (c: Pick<TimedCard, 'set' | 'time'>, t: TimePoint): boolean => timesOf(c).includes(t)

/** 그 시점의 자리 — time.moved 가 있으면 그것, 없으면 undefined (카드의 at·flip·label 그대로) */
export const movedAt = (c: Pick<TimedCard, 'time'>, t: TimePoint) => c.time?.moved?.[t]

/**
 * 대지 카드가 그 시점에 나오는가 — 사가에 매이지 않은 카드는 늘. 사가에 매인 카드(cards.ts 의 saga·sagaPhase)는 그 페이즈의 세트 시점부터
 * 그 사가의 마지막 세트 시점까지 (BFZ 의 saga 2 는 T3–T4, OGW 의 sagaPhase 2 는 T4 — D5)
 */
export function landAt(land: { saga?: number; sagaPhase?: number }, t: TimePoint): boolean {
  if (land.saga === undefined) return true
  const saga = SAGAS[land.saga - 1]
  if (!saga) throw new Error(`timeline: 대지 카드의 사가 ${land.saga} 가 없다`)
  const first = timeOfSet(saga.sets[(land.sagaPhase ?? 1) - 1])
  const last = timeOfSet(saga.sets[saga.phases - 1])
  return first <= t && t <= last
}

/**
 * 사가 보기가 이 카드를 그리는 시점 — 오른 페이즈부터 그 사가의 끝(until 이면 그 페이즈)까지의 페이즈를 시점으로 옮긴 것.
 * 이 밖의 시점에 그리면 근거 글(time.basis·time.estimate)이 있어야 한다 (V2)
 */
export function sagaSpanOf(c: Pick<TimedCard, 'set' | 'until'>): readonly TimePoint[] {
  const first = levelOfSet(c.set)
  const slot = slotOf(first)!
  const last = levelOf(slot.saga, c.until ?? SAGAS[slot.saga - 1].phases)!
  const out = new Set<TimePoint>()
  for (const p of PHASE_SLOTS) if (p.level >= first && p.level <= last) out.add(timeOfSet(SAGAS[p.saga - 1].sets[p.local - 1]))
  return [...out].sort((a, b) => a - b)
}

/** 그 시점에 그리는 카드 */
export const cardsAt = <C extends Pick<TimedCard, 'set' | 'time'>>(cards: readonly C[], t: TimePoint): C[] => cards.filter((c) => drawnAt(c, t))

/**
 * 시점 데이터가 어긋난 것 (없으면 빈 목록) — 페이즈 카드 원본이나 지도 조각에. complete 면 모든 페이즈의 카드가 다 들어온 것이라 카드 사이의 검사(V4·V5)도 한다
 * - V1: time.at 은 1–4 의 오름차순·겹침 없는 목록이고 비지 않는다. home 을 달았으면 at 에 그 값이 있고 basis 가 있다. moved 의 시점은 at 안에 있다
 * - V2: 사가 보기가 그리지 않는 시점(sagaSpanOf 밖)이 있으면 basis 나 estimate 가 있다. 글은 그런 시점·home·moved·aloft 가 있을 때만 단다
 * - V3: until 이 있는 카드는 그 페이즈 뒤의 시점을 갖지 않는다 (BFZ until: 1 이면 T4 가 없다)
 * - V4: 같은 이름의 카드(재판)나 같은 same 묶음은 한 시점에 하나만
 * - V5: beside 가 가리키는 카드가 그 카드의 모든 시점에 그려진다
 */
export function timeProblems(cards: readonly TimedCard[], complete: boolean): string[] {
  const out: string[] = []
  for (const c of cards) {
    const time = c.time
    if (!time) continue
    const at = time.at
    const tag = `${c.name}(${c.id}) 의 time`
    // V1
    if (!Array.isArray(at) || !at.length) {
      out.push(`V1: ${tag}.at 이 비었다 — 그리는 시점을 하나 이상 단다`)
      continue
    }
    if (at.some((t) => !TIME_POINTS.includes(t)) || at.some((t, i) => i > 0 && t <= at[i - 1])) out.push(`V1: ${tag}.at [${at.join(', ')}] — 1–4 의 오름차순, 겹침 없이`)
    if (time.home !== undefined) {
      if (!at.includes(time.home)) out.push(`V1: ${tag}.home ${time.home} 이 at [${at.join(', ')}] 에 없다`)
      if (time.home === timeOfSet(c.set)) out.push(`V1: ${tag}.home ${time.home} 은 세트 시점과 같다 — 달지 않는다`)
      if (!time.basis) out.push(`V1: ${tag}.home 을 단 까닭(basis)이 없다`)
    }
    for (const k of Object.keys(time.moved ?? {})) if (!at.includes(Number(k) as TimePoint)) out.push(`V1: ${tag}.moved 의 시점 ${k} 가 at 에 없다`)
    // V2
    const span = sagaSpanOf(c)
    const outside = at.filter((t) => !span.includes(t))
    const text = Boolean(time.basis || time.estimate)
    if (outside.length && !text) out.push(`V2: ${tag} — 사가 보기가 그리지 않는 시점 ${outside.join('·')} 에도 그리니 근거(basis)나 추정(estimate)을 단다`)
    if (text && !outside.length && time.home === undefined && !time.moved && !time.aloft)
      out.push(`V2: ${tag} — 사가 보기 밖의 시점·home·moved·aloft 가 없으니 basis·estimate 를 달지 않는다`)
    if ((time.moved || time.aloft) && !time.estimate) out.push(`V2: ${tag} — moved·aloft 의 까닭(estimate)이 없다`)
    // V3
    if (c.until !== undefined) {
      const last = Math.max(...span)
      const late = at.filter((t) => t > last)
      if (late.length) out.push(`V3: ${tag} — until ${c.until} 로 사가 보기에서 끝난 카드가 그 뒤의 시점 ${late.join('·')} 에 그려진다`)
    }
  }
  if (!complete) return out
  const byId = new Map(cards.map((c) => [c.id, c]))
  // V4 — 같은 이름, 같은 same 묶음
  const groups = new Map<string, TimedCard[]>()
  for (const c of cards) {
    for (const key of [`이름 ${c.name}`, ...(c.time?.same ? [`same ${c.time.same}`] : [])]) groups.set(key, [...(groups.get(key) ?? []), c])
  }
  for (const [key, list] of groups) {
    if (list.length < 2) continue
    for (const t of TIME_POINTS) {
      const here = list.filter((c) => drawnAt(c, t))
      if (here.length > 1) out.push(`V4: ${key} — 시점 ${t} 에 ${here.map((c) => c.id).join(' · ')} 가 함께 나온다 (그 시점이 세트 시점인 카드만 남긴다)`)
    }
  }
  // V5 — 곁의 상징
  for (const c of cards) {
    const b = c.time?.beside
    if (!b) continue
    const host = byId.get(b)
    if (!host) {
      out.push(`V5: ${c.name}(${c.id}) 의 time.beside '${b}' 가 페이즈 카드에 없다`)
      continue
    }
    const missing = timesOf(c).filter((t) => !drawnAt(host, t))
    if (missing.length) out.push(`V5: ${c.name}(${c.id}) 는 ${host.id} 곁의 상징인데 시점 ${missing.join('·')} 에 ${host.id} 가 그려지지 않는다`)
  }
  return out
}

/** V1–V5 — 어긋나면 모아 던진다 */
export function checkTimes(cards: readonly TimedCard[], complete: boolean): void {
  const p = timeProblems(cards, complete)
  if (p.length) throw new Error(p.map((x) => `timeline: ${x}`).join('\n'))
}
