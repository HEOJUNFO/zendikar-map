// 시점별 보기 — 사가 보기(sagas.ts, ?saga=s&phase=p)와 나란히 두는 둘째 보기(?time=t — 숨기지 않은 시점 SHOWN_TIME_POINTS). 사가 보기와 그 규칙은 그대로 둔다.
// 사가 보기는 카드를 세트(=페이즈)와 사가에 묶어 쌓아 그리고 사가를 넘어가면 비운다. 시점별 보기는 **있는 것은 이어 그린다**(사용자 결정 2026-10-20 —
// 2026-10-19 의 '근거가 밝힌 시점에만'을 바꾼 것):
// - 있는 것(인물·생물·종·주민·물건·지형지물)은 한 시점에 그렸으면 뒤의 시점에도 그린다 — 설정상 그 뒤에 사라졌다고 볼 까닭(죽음·파괴, 젠디카르를 떠남,
//   그 자리와 함께 먹히거나 무너짐)이 있을 때만 뺀다. 앞의 시점도 같다 — 설정상 그 시점에 생겨났다고 볼 까닭(태어남·만들어짐·깨어남, 젠디카르에 옴.
//   엘드라지와 그 피해는 깨어남 T2 부터, 엘드라지와 싸우려 깨어난 원소·그 전쟁으로 생긴 것은 생겨난 때부터)이 있을 때만 뺀다. 까닭은 공식 근거(time.basis)나
//   이 지도의 판단(time.estimate — 패널에 '추정'. 마커 모양은 바꾸지 않는다)이고, 까닭 없이 시점을 빼지 않는다(V11).
// - 일어난 일(장면·주문·전투 순간과 그 효과)은 그 시점에만 — 쌓지 않는다. 장면에 나온 인물·생물은 장면과 따로 '있는 것'으로 본다.
// - 이어 그린 시점의 자리는 같은 자리 — 공식 자료가 다른 곳에 있었다고 밝힌 시점이나 그 시점의 바탕(그 무렵 모습)이 자리를 지운 시점에만
//   time.moved(그 하늘이면 time.aloft). 자리 다툼에 진 카드도 시점을 빼지 않고 time.moved 로 비킨다.
// - 대지 카드: 사가에 매이지 않은 카드는 늘, BFZ 의 사가에 매인 대지(saga: 2)는 T3–T4, OGW 의 것(sagaPhase: 2)은 T4 (D5).
// 바탕(그 무렵 모습)과 지역 상세의 페이즈 문은 시점마다 그 시점의 이어 센 페이즈 번호(periodLevel)로 셈한다 — 같은 엔진이다.
// 의존이 없게 둔다 (sagas.ts 만) — Node 도구(scripts/figures·scripts/childmaps·scripts/qa)도 이 파일을 그대로 읽는다. 런타임 import 는 확장자를 붙인다
import type { Point } from './types'
import { GATES, inPhase, inView, levelOf, PHASE_SLOTS, SAGAS, sagaStart, slotOf, TIME_KEYS, type Gated, type GateTime, type GateView, type TimeGate } from './sagas.ts'

/** 시점 — 1: 엘드라지가 깨어나기 전(ZEN·WWK), 2: 깨어남(ROE), 3: 젠디카르 전투(BFZ), 4: 타이탄 이후(OGW), 5: 젠디카르 라이징(ZNR) */
export type TimePoint = GateTime

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
  /**
   * 아직 보이지 않는 시점 — 헤더에 단추가 없고 주소(?time=)로도 열리지 않는다(readView). 데이터에는 남아 검사(V1–V11, 그림의 V7·V8, 지역 상세의 V9·V10)는
   * 이 시점도 본다 (TIME_POINTS). 내용이 차면 이 값만 지워 보인다 (SHOWN_TIME_POINTS)
   */
  hidden?: true
}

export const TIMES: readonly TimeInfo[] = [
  // 탐험과 보물찾기의 젠디카르 — ZEN(2009)·WWK(2010 초). 바탕은 단계 2 (단계 1 과 2 를 가르는 페이즈 바탕 항목이 없어 같은 바탕이다)
  { t: 1, name: '엘드라지가 깨어나기 전', nameEn: 'Before the Awakening', years: '2009–2010', button: '2009', sets: ['ZEN', 'WWK'], periodLevel: 2 },
  // Eye of Ugin에서 엘드라지 거신 셋이 풀려난 때 — 영어 이름은 사가1 이름(The Awakening)과 겹치지 않게 세트 이름으로
  { t: 2, name: '깨어남', nameEn: 'Rise of the Eldrazi', years: '2010', button: '2010', sets: ['ROE'], periodLevel: 3 },
  { t: 3, name: '젠디카르 전투', nameEn: 'Battle for Zendikar', years: '2015', button: '2015', sets: ['BFZ'], periodLevel: 4 },
  // 울라목·코질렉이 쓰러지기까지 (OGW)
  { t: 4, name: '타이탄 이후', nameEn: 'After the Titans', years: '2016', button: '2016', sets: ['OGW'], periodLevel: 5 },
  // 하늘거주지가 떠오른 Zendikar Rising(2020) 무렵 — 이름은 사가3 처럼 공식 한국어판 세트 이름. 바탕은 단계 6(사가3 페이즈1 — 기본 지도와 같은 바탕).
  // 앞 시점에 그린 있는 것마다 2020년에 이어 그릴지·사라졌는지를 카드마다 정해(PER_CARD_FROM) 보인다
  { t: 5, name: '젠디카르 라이징', nameEn: 'Zendikar Rising', years: '2020', button: '2020', sets: ['ZNR'], periodLevel: 6 },
]

/** 모든 시점 (차례) — 숨긴 시점도. 검사·생성기는 이것을 돈다 */
export const TIME_POINTS: readonly TimePoint[] = TIMES.map((x) => x.t)

/** 보이는 시점 (차례) — 헤더 단추와 주소(?time=)는 이것만 */
export const SHOWN_TIMES: readonly TimeInfo[] = TIMES.filter((x) => !x.hidden)
export const SHOWN_TIME_POINTS: readonly TimePoint[] = SHOWN_TIMES.map((x) => x.t)

/**
 * 이 시점부터는 '있는 것은 이어 그린다'의 결정을 카드마다 데이터로 단다 — 앞 시점(t-1)에 그린 있는 것(주문·효과가 아닌 것)은 이 시점(t)을
 * time.at 에 넣어 이어 그리거나(그 시점의 자리는 같은 자리), time.gone 에 넣어 그리지 않는다(사라짐의 까닭은 basis·estimate). 둘 다 아니면 V11
 * (숨긴 시점이면 오류가 아니라 남은 일 — pendingDecisions). T1–T4 는 이 셈 전에 글(basis·estimate)이 있는지로 정했다 (unexplainedGaps)
 */
export const PER_CARD_FROM: TimePoint = 5

/** 이 지도가 쓰는 이름표 쪽 (phase1.ts 의 PhaseCard.label 과 같다) */
type LabelSide = 'below' | 'right' | 'left' | 'above'

/**
 * 카드마다의 시점 — PhaseCard.time (src/data/phase1.ts). 없으면 그 카드는 세트 시점 하나에만 그린다 (장면·주문, 그 세트 시점에 생겨난 것은 따로 적지 않는다).
 * 사가 보기는 이 필드를 읽지 않는다
 */
export interface CardTime {
  /** 그리는 시점 — 오름차순, 겹침 없이, 비지 않게. 이어지지 않아도 된다 (Anowon [1, 4]) */
  at: readonly TimePoint[]
  /** 세트 시점이 아닌 이 카드의 시점 (Sorin Markov·Day of Judgment → 2). 까닭은 basis 에 */
  home?: TimePoint
  /** 공식 근거 — 사가 보기가 그리지 않는 시점에도 있었다, 또는 그 시점에 생겨나거나 사라졌다고 공식 자료가 밝힌 것 (home·moved 의 까닭도) */
  basis?: string
  /** 이 지도의 판단 — 있는 것이라 그 시점에도 그렸다, 또는 그 시점에 생겨나거나 사라졌다고 보았다 (moved·aloft 의 까닭도). 패널에 '추정'으로 */
  estimate?: string
  /**
   * 그 시점에만 다른 자리 — 공식 자료가 그 시점에 다른 곳에 있었다고 밝혔거나, 그 시점의 바탕이 자리를 지웠거나, 그 시점의 다른 대상에 비켰다
   * (까닭은 basis·estimate). 크기는 바꾸지 않는다. childMap 은 그 시점에 다른 지역 상세(id)에 그린다 — null 이면 세계 지도 그림으로
   * (자리가 카드의 지역 상세 범위 밖일 때만 단다. 사가 보기와 그 카드의 지역 상세 그림 subjects 는 읽지 않는다)
   */
  moved?: Partial<Record<TimePoint, { at: Point; flip?: boolean; label?: LabelSide; childMap?: string | null }>>
  /**
   * 그 시점에만 다른 이름 쪽 — 자리는 그대로. 사가 보기에 없는 그 시점의 그림이 기본 쪽(카드의 label, 없으면 밑)을 먼저 차지해
   * 이름이 손그림에 얹힐 때 (옮긴 시점은 moved 의 label). 사가 보기는 읽지 않는다
   */
  label?: Partial<Record<TimePoint, LabelSide>>
  /** 같은 개체 묶음 id — 한 시점에 하나만 그린다 (Kalitas·Omnath·Dragonmaster Outcast …) */
  same?: string
  /** 곁에 상징으로 둔 그림의 카드 id — 그 그림이 그 시점에 없으면 이 카드도 그리지 않는다 */
  beside?: string
  /** 바뀐 바탕(죽은 숲 등) 위의 하늘에 떠 있어 그 바탕과 모순되지 않는다 — 까닭은 estimate */
  aloft?: true
  /**
   * 그리지 않기로 정한 시점 — 앞 시점에 그린 이 카드가 이 시점에 사라졌다(죽음·파괴, 젠디카르를 떠남, 그 자리와 함께 먹힘). PER_CARD_FROM 부터의 시점만,
   * 오름차순, at 과 겹치지 않게, 앞 시점(t-1)에 그린 카드에만. 까닭은 basis·estimate 에 (V2). 원본에만 있다 — 지도 조각(?map)에는 싣지 않는다
   */
  gone?: readonly TimePoint[]
}

/**
 * 지도 조각(?map)에 싣는 시점 — 글 없이. basis·estimate 는 있는지만 (vite/phaseData.ts — 글은 카드마다의 조각에).
 * group 은 세트 시점이 아닌 시점에 그리는 그림의 시점별 묶음(src/map/figures-time/<묶음>.ts — scripts/figures/to_ts.mjs 의 timeGroupOf)
 */
export type MapCardTime = Omit<CardTime, 'basis' | 'estimate' | 'gone'> & { basis?: true; estimate?: true; group?: string }

/** 시점 셈이 보는 카드 — 지도 조각(PhaseMapCard)이든 원본(PhaseCard)이든 */
export interface TimedCard {
  id: string
  name: string
  /** 세트 코드 (대소문자 상관없음 — 카드 원본은 소문자) */
  set: string
  until?: number
  /** 이름 쪽 (사가 보기) — time.label 이 그와 같은 쪽을 다시 적지 않는지 본다 */
  label?: LabelSide
  /** 사는 지역 상세 (사가 보기) — time.moved 의 childMap 이 그와 같은 값을 다시 적지 않는지 본다 */
  childMap?: string
  /** 카드 유형 줄 — 원본 카드(Node 도구)에만 있다. 있으면 V11 이 time 이 없는 카드와 until 로 끝난 카드도 본다 (지도 조각에는 없다) */
  typeLine?: string
  time?: CardTime | MapCardTime
}

/** 일어난 일(주문·효과) — 순간마법·집중마법·부여마법. 시점별 보기는 쌓지 않고 그 시점에만 그린다 (V11 이 빈 시점의 까닭을 묻지 않는다) */
export const isEffect = (c: Pick<TimedCard, 'typeLine'>): boolean => /\b(?:Instant|Sorcery|Enchantment)\b/.test(c.typeLine ?? '')

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

/** 그 시점에 그 카드를 그리는 지역 상세 — time.moved 의 childMap(null 이면 세계 지도 — undefined), 없으면 카드의 childMap */
export function childMapAt(c: Pick<TimedCard, 'time' | 'childMap'>, t: TimePoint): string | undefined {
  const m = movedAt(c, t)
  return m && m.childMap !== undefined ? (m.childMap ?? undefined) : c.childMap
}

/** 그 시점에 카드의 지역 상세를 떠나 다른 지역 상세나 세계 지도에 그리는가 (time.moved 의 childMap) */
export const leavesAt = (c: Pick<TimedCard, 'time'>, t: TimePoint): boolean => movedAt(c, t)?.childMap !== undefined

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
 * 세트 시점이 아닌 시점(시점별 보기에서 옮겨 그리는 시점) — 그 그림은 사가 보기의 묶음(세트의 페이즈) 대신 이 시점들을 이름에 단 시점별 묶음
 * (src/map/figures-time/<띠|지역 상세 id>-t<시점들>.ts)에서 받는다. 같은 시점들의 그림만 한 묶음이라 어느 시점에서든 받은 묶음의 그림을 모두 그린다
 */
export const extraTimesOf = (c: Pick<TimedCard, 'set' | 'time'>): TimePoint[] => timesOf(c).filter((t) => t !== timeOfSet(c.set))

/**
 * 시점 t 에 그 그림을 받는 묶음 — 세트 시점이면 사가 보기의 묶음(group, 그 세트의 그림은 그 시점에 거의 모두 그려진다), 아니면 시점별 묶음(time.group).
 * 시점별 묶음이 없으면(지도 조각에 실리지 않은 원본 카드) 사가 보기의 묶음
 */
export const figureGroupAt = (c: { set: string; group?: string; time?: CardTime | MapCardTime }, t: TimePoint): string | undefined =>
  t === timeOfSet(c.set) ? c.group : ((c.time as MapCardTime | undefined)?.group ?? c.group)

/**
 * 시점 데이터가 어긋난 것 (없으면 빈 목록) — 페이즈 카드 원본이나 지도 조각에. complete 면 모든 페이즈의 카드가 다 들어온 것이라 카드 사이의 검사(V4·V5)도 한다
 * - V1: time.at 은 시점(TIME_POINTS)의 오름차순·겹침 없는 목록이고 비지 않는다. home 을 달았으면 at 에 그 값이 있고 basis 가 있다. moved 의 시점은 at 안에 있고,
 *   moved 의 childMap 은 카드의 childMap 과 다르다. gone 은 PER_CARD_FROM 부터의 시점의 오름차순 목록이고, at 과 겹치지 않고, 앞 시점에 그린 카드에만 단다
 * - V2: 사가 보기가 그리지 않는 시점(sagaSpanOf 밖)이 있으면 basis 나 estimate 가 있다. moved·aloft·gone 에는 까닭(estimate·basis)이 있다.
 *   글은 밝힐 것이 있을 때만 단다 — 그런 시점·home·moved·aloft, 또는 그리지 않는 시점(생겨나기 전·사라진 뒤의 까닭)
 * - V3: until 이 있는 카드(사가 보기에서 다음 페이즈에는 그 자리·그 상태에 없다고 끝낸 것)를 그 뒤의 시점에도 그리면 그 시점에는 자리를 옮기거나(moved)
 *   그 하늘에 두고(aloft), 아니면 그 시점에도 그 자리에 있었다는 공식 근거(basis)가 있다
 * - V4: 같은 이름의 카드(재판)나 같은 same 묶음은 한 시점에 하나만
 * - V5: beside 가 가리키는 카드가 그 카드의 모든 시점에 그려진다
 * - V11: 이어 그린 대상의 빈 시점 — time.at 이 사가 보기가 그리는 시점을 빼거나(sagaSpanOf 안의 시점이 at 에 없다) 사이가 비면(at 의 첫 시점과 끝 시점 사이에
 *   빠진 시점) 그 까닭(사라짐·생겨남, basis 나 estimate)이 있다 — 까닭 없이 시점을 빼지 않는다. 카드 유형 줄(typeLine)이 있으면(원본 카드) time 이 없는 카드와
 *   until 로 사가 보기에서 끝난 카드도 본다 — 주문·효과(isEffect)가 아닌 있는 것이 시점 가운데 그리지 않는 시점(같은 개체·같은 이름의 재판이 맡는 시점은 빼고)이
 *   있으면 time.basis·time.estimate 에 그 까닭이 있다 (사가 보기의 basis 에만 적은 까닭은 시점별 보기의 패널에 실리지 않는다).
 *   이 글 셈은 PER_CARD_FROM 앞의 시점만 본다 — 그 뒤의 시점은 카드마다의 결정(time.at 이나 time.gone 에 그 시점)으로 본다: 앞 시점에 그린 있는 것이
 *   그 시점에 그리지 않으면(같은 개체·재판이 맡지 않고) gone 에 그 시점이 있어야 한다. 숨긴 시점(hidden — 내용을 채우는 중)이면 오류가 아니라 남은 일로
 *   pendingDecisions 가 센다 — 숨김을 풀면 오류가 된다
 */
export function timeProblems(cards: readonly TimedCard[], complete: boolean): string[] {
  const out: string[] = []
  for (const c of cards) {
    const time = c.time
    // V11 — 유형 줄이 있는 원본 카드: 있는 것(주문·효과가 아닌 것)이 그리지 않는 시점에 까닭이 있는가 (time 이 없는 카드도). 같은 개체·같은 이름의 재판이
    // 그 시점을 맡으면 넘어간다. PER_CARD_FROM 앞의 시점은 글이 있는지로, 그 뒤의 보이는 시점은 카드마다의 결정으로 (숨긴 시점은 pendingDecisions)
    const missing = unexplainedGaps(c, cards)
    if (missing.length)
      out.push(`V11: ${c.name}(${c.id}) — 있는 것인데 ${missing.join('·')} 에 그리지 않는 까닭(사라짐·생겨남)이 time.basis·time.estimate 에 없다 (사가 보기의 basis 는 시점별 보기의 까닭이 아니다)`)
    const open = undecidedAt(c, cards).filter((t) => !timeInfo(t).hidden)
    if (open.length)
      out.push(`V11: ${c.name}(${c.id}) — 앞 시점에 그린 있는 것인데 ${open.join('·')} 의 결정이 없다 — time.at 에 넣어 이어 그리거나, time.gone 에 넣고 사라진 까닭을 basis·estimate 에 단다`)
    if (!time) continue
    const at = time.at
    const tag = `${c.name}(${c.id}) 의 time`
    // V1
    if (!Array.isArray(at) || !at.length) {
      out.push(`V1: ${tag}.at 이 비었다 — 그리는 시점을 하나 이상 단다`)
      continue
    }
    if (at.some((t) => !TIME_POINTS.includes(t)) || at.some((t, i) => i > 0 && t <= at[i - 1])) out.push(`V1: ${tag}.at [${at.join(', ')}] — ${TIME_POINTS.join('·')} 의 오름차순, 겹침 없이`)
    if (time.home !== undefined) {
      if (!at.includes(time.home)) out.push(`V1: ${tag}.home ${time.home} 이 at [${at.join(', ')}] 에 없다`)
      if (time.home === timeOfSet(c.set)) out.push(`V1: ${tag}.home ${time.home} 은 세트 시점과 같다 — 달지 않는다`)
      if (!time.basis) out.push(`V1: ${tag}.home 을 단 까닭(basis)이 없다`)
    }
    for (const [k, m] of Object.entries(time.moved ?? {})) {
      if (!at.includes(Number(k) as TimePoint)) out.push(`V1: ${tag}.moved 의 시점 ${k} 가 at 에 없다`)
      if (m && m.childMap !== undefined && (m.childMap ?? undefined) === c.childMap) out.push(`V1: ${tag}.moved 의 시점 ${k} childMap 이 카드의 지역 상세와 같다 — 달지 않는다`)
    }
    const gone = goneOf(c)
    if (gone.some((t) => !TIME_POINTS.includes(t) || t < PER_CARD_FROM) || gone.some((t, i) => i > 0 && t <= gone[i - 1]))
      out.push(`V1: ${tag}.gone [${gone.join(', ')}] — ${TIME_POINTS.filter((t) => t >= PER_CARD_FROM).join('·')} 의 오름차순, 겹침 없이`)
    for (const t of gone) {
      if (at.includes(t)) out.push(`V1: ${tag}.gone 의 시점 ${t} 가 at 에도 있다 — 그리거나 빼거나 하나만`)
      else if (!at.includes((t - 1) as TimePoint)) out.push(`V1: ${tag}.gone 의 시점 ${t} — 앞 시점 ${t - 1} 에 그리지 않은 카드라 정할 것이 없다 (달지 않는다)`)
    }
    for (const [k, side] of Object.entries(time.label ?? {})) {
      if (!at.includes(Number(k) as TimePoint)) out.push(`V1: ${tag}.label 의 시점 ${k} 가 at 에 없다`)
      if (time.moved?.[Number(k) as TimePoint]) out.push(`V1: ${tag}.label 의 시점 ${k} 는 옮긴 시점이다 — moved 의 label 에 단다`)
      if (side === c.label) out.push(`V1: ${tag}.label 의 시점 ${k} 쪽 '${side}' 가 카드의 쪽과 같다 — 달지 않는다`)
    }
    // V2
    const span = sagaSpanOf(c)
    const outside = at.filter((t) => !span.includes(t))
    const text = Boolean(time.basis || time.estimate)
    if (outside.length && !text) out.push(`V2: ${tag} — 사가 보기가 그리지 않는 시점 ${outside.join('·')} 에도 그리니 근거(basis)나 추정(estimate)을 단다`)
    if (text && !outside.length && time.home === undefined && !time.moved && !time.aloft && at.length === TIME_POINTS.length)
      out.push(`V2: ${tag} — 모든 시점을 사가 보기 안에서 그리고 home·moved·aloft 도 없으니 basis·estimate 를 달지 않는다`)
    if ((time.moved || time.aloft) && !text) out.push(`V2: ${tag} — moved·aloft 의 까닭(estimate·basis)이 없다`)
    if (gone.length && !text) out.push(`V2: ${tag} — gone ${gone.join('·')} 에 사라진 까닭(basis·estimate)이 없다`)
    // 앞 시점의 글을 그대로 까닭으로 쓰지 않게, 사라진 시점의 해(단추 글)를 글에 적는다
    const said = `${time.basis ?? ''} ${time.estimate ?? ''}`
    const unsaid = gone.filter((t) => !said.includes(timeInfo(t).button))
    if (text && unsaid.length) out.push(`V2: ${tag} — gone ${unsaid.join('·')} 의 까닭이 basis·estimate 에 없다 — 그 해(${unsaid.map((t) => timeInfo(t).button).join('·')})를 적어 그 시점에 사라진 까닭을 쓴다`)
    // V3
    if (c.until !== undefined) {
      const last = Math.max(...span)
      const late = at.filter((t: TimePoint) => t > last && !time.moved?.[t] && !time.aloft && !time.basis)
      if (late.length)
        out.push(`V3: ${tag} — until ${c.until} 로 사가 보기에서 끝난 카드를 그 뒤의 시점 ${late.join('·')} 에도 같은 자리에 그린다 — 옮기거나(moved) 하늘에 두거나(aloft), 그 자리에 있었다는 공식 근거(basis)를 단다`)
    }
    // V11
    const gaps = TIME_POINTS.filter((t) => t > at[0] && t < at[at.length - 1] && !at.includes(t))
    const dropped = span.filter((t) => !at.includes(t))
    if ((gaps.length || dropped.length) && !text)
      out.push(`V11: ${tag} — ${[...new Set([...dropped, ...gaps])].sort().join('·')} 에 그리지 않는 까닭(사라짐·생겨남 — basis 나 estimate)이 없다 (까닭 없이 시점을 빼지 않는다)`)
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

/** 같은 개체(time.same)나 같은 이름의 재판 — 한 시점에 하나라 그 시점은 다른 카드가 맡는다 (V4) */
const kinOf = (c: TimedCard, cards: readonly TimedCard[]) =>
  cards.filter((o) => o !== c && (o.name === c.name || (c.time?.same !== undefined && o.time?.same === c.time.same)))

/** 원본 카드의 time.gone (지도 조각에는 없다) */
const goneOf = (c: Pick<TimedCard, 'time'>): readonly TimePoint[] => (c.time && 'gone' in c.time ? c.time.gone : undefined) ?? []

/** V11 이 보는 있는 것 — 유형 줄이 있는 원본 카드 가운데 주문·효과가 아닌 것 */
const isThing = (c: TimedCard): boolean => c.typeLine !== undefined && !isEffect(c)

/**
 * V11 의 빈 시점(PER_CARD_FROM 앞) — 유형 줄이 있는 원본 카드의 있는 것이 그리지 않는 시점(같은 개체·재판이 맡는 시점은 빼고)인데 time 에 까닭 글이 없는 것.
 * 글은 시점을 가리키지 않으니 PER_CARD_FROM 뒤의 시점은 이 셈이 아니라 undecidedAt 이 본다
 */
function unexplainedGaps(c: TimedCard, cards: readonly TimedCard[]): TimePoint[] {
  if (!isThing(c) || c.time?.basis || c.time?.estimate) return []
  const others = kinOf(c, cards)
  return TIME_POINTS.filter((t) => t < PER_CARD_FROM && !timesOf(c).includes(t) && !others.some((o) => drawnAt(o, t)))
}

/**
 * V11 의 정하지 않은 시점(PER_CARD_FROM 부터) — 있는 것이 앞 시점(t-1)에 그려졌는데 그 시점(t)에는 그리지 않고(같은 개체·재판도 맡지 않고)
 * time.gone 에도 t 가 없는 것. 숨긴 시점도 센다
 */
function undecidedAt(c: TimedCard, cards: readonly TimedCard[]): TimePoint[] {
  if (!isThing(c)) return []
  const gone = goneOf(c)
  const others = kinOf(c, cards)
  return TIME_POINTS.filter((t) => t >= PER_CARD_FROM && drawnAt(c, (t - 1) as TimePoint) && !drawnAt(c, t) && !gone.includes(t) && !others.some((o) => drawnAt(o, t)))
}

/**
 * 숨긴 시점(hidden)마다 아직 정하지 않은 카드 — 앞 시점에 그린 있는 것마다 그 시점에 이어 그릴지(time.at), 사라졌는지(time.gone 과 까닭)를 정할 일.
 * 오류가 아니라 남은 일로 센다 (scripts/qa/timeline-check.mjs 가 보인다). 숨김을 풀면 timeProblems 의 V11 오류가 된다
 */
export function pendingDecisions(cards: readonly TimedCard[]): Map<TimePoint, TimedCard[]> {
  const out = new Map<TimePoint, TimedCard[]>()
  for (const c of cards) for (const t of undecidedAt(c, cards)) if (timeInfo(t).hidden) out.set(t, [...(out.get(t) ?? []), c])
  return out
}

/** V1–V5·V11 — 어긋나면 모아 던진다 */
export function checkTimes(cards: readonly TimedCard[], complete: boolean): void {
  const p = timeProblems(cards, complete)
  if (p.length) throw new Error(p.map((x) => `timeline: ${x}`).join('\n'))
}

// ── 보기 — 지도가 지금 무엇을 그리는가 (App 의 상태 하나) ─────────────────────────────────────────────────────────────────────────
// 시점을 사가의 페이즈 뒤에 이어 센 번호로 끼워 넣지 않는다 — inPhase·periods.at·leadGroups·sagaStart 가 모두 사가의 페이즈 번호(1–6)만 안다

/** 끔(기본 지도, 2020년 이후) · 사가 보기의 이어 센 단계 · 시점별 보기의 시점 */
export type View = { kind: 'off' } | { kind: 'saga'; level: number } | { kind: 'time'; t: TimePoint }

export const VIEW_OFF: View = { kind: 'off' }

/** 그 보기의 바탕(그 무렵 모습)과 지역 상세 문의 단계 (이어 센 번호, 0 은 끔) — 시점은 그 시점의 periodLevel */
export const periodLevelOf = (v: View): number => (v.kind === 'saga' ? v.level : v.kind === 'time' ? timeInfo(v.t).periodLevel : 0)

/** 보기의 열쇠 — 'off' · 's<사가>p<페이즈>' · 't<시점>' (지도가 그 보기의 그림을 다 받았는지 알릴 때) */
export function viewKey(v: View): string {
  if (v.kind === 'time') return `t${v.t}`
  const slot = v.kind === 'saga' ? slotOf(v.level) : undefined
  return slot ? `s${slot.saga}p${slot.local}` : 'off'
}

/** 같은 보기인가 */
export const sameView = (a: View, b: View): boolean => viewKey(a) === viewKey(b)

/** 주소의 보기 — ?time=t(보이는 시점만 — 숨긴 시점은 없는 값처럼)가 ?saga=s&phase=p 보다 앞선다. saga 가 없으면 사가1 (예전 주소 ?phase=1|2|3) */
export function readView(search: string): View {
  const q = new URLSearchParams(search)
  const t = Number(q.get('time'))
  if (SHOWN_TIME_POINTS.includes(t as TimePoint)) return { kind: 'time', t: t as TimePoint }
  const saga = Number(q.get('saga') ?? 1)
  const local = Number(q.get('phase'))
  const level = PHASE_SLOTS.find((p) => p.saga === saga && p.local === local)?.level
  return level ? { kind: 'saga', level } : VIEW_OFF
}

/** 주소에 쓰는 보기의 값 (saga·phase·time 가운데 그 보기의 것만 — 나머지는 지운다) */
export function viewParams(v: View): string[] {
  if (v.kind === 'time') return [`time=${v.t}`]
  const slot = v.kind === 'saga' ? slotOf(v.level) : undefined
  return slot ? [`saga=${slot.saga}`, `phase=${slot.local}`] : []
}

/** 카드가 사가 보기에서 오르는 단계(phaseOf)와 끝나는 단계(lastOf, until) — PhaseData 의 조회표 */
export interface SagaLookup {
  phaseOf: ReadonlyMap<string, number>
  lastOf: ReadonlyMap<string, number>
}

/** 사가 보기의 단계 level 에서 그리는가 — 그 사가의 첫 페이즈부터 level 까지 오른 카드, until 이면 그 단계까지 (App 의 셈 그대로) */
export function sagaShownAt(id: string, level: number, d: SagaLookup): boolean {
  const p = d.phaseOf.get(id) ?? Infinity
  return p >= sagaStart(level) && p <= level && level <= (d.lastOf.get(id) ?? Infinity)
}

/** 그 보기에서 그리는 카드인가 — 사가 보기는 sagaShownAt, 시점별 보기는 drawnAt (같은 개체·곁의 상징은 V4·V5 가 맞춰 둔다), 끔은 없음 */
export function cardShown(v: View, c: Pick<TimedCard, 'id' | 'set' | 'time'>, d: SagaLookup): boolean {
  if (v.kind === 'saga') return sagaShownAt(c.id, v.level, d)
  if (v.kind === 'time') return drawnAt(c, v.t)
  return false
}

/** 앱이 그리는지 셈하는 카드 — 시점·지역 상세 (지도 조각이든 원본이든) */
export type DrawnCard = Pick<TimedCard, 'id' | 'set' | 'until' | 'time'> & { childMap?: string }

/**
 * 시점별 보기에서 앱이 그 카드를 그 시점에 그리는가 — 그 시점의 카드(drawnAt)이고, 곁의 상징(time.beside)은 그 그림도 그 시점에 그려질 때만.
 * 지역 상세에 사는 대상도 같다 — 지역 상세 그림은 시점마다 그 시점에 그리는 대상의 자리를 비워 둔다(빈터의 시점 열쇠, 손그림의 시점 문 —
 * scripts/childmaps/to_ts.mjs 의 [14]–[17] 이 맞춘다). App.tsx 의 shownAtTime 과 빈터의 시점 열쇠(forTimeGate)가 함께 쓴다 —
 * 빈터가 앱이 그리지 않는 대상의 자리를 비워 지형에 빈 구멍을 내지 않게
 */
export function shownAtTimeOf<C extends DrawnCard>(c: C, t: TimePoint, hostOf: (id: string) => C | undefined): boolean {
  if (!drawnAt(c, t)) return false
  if (!c.time?.beside) return true
  const host = hostOf(c.time.beside)
  return Boolean(host && drawnAt(host, t))
}

/** 카드 원본에서 셈한 사가 보기의 조회표 (phase.ts 의 PhaseData 와 같은 셈 — 오른 단계는 세트의 단계, 끝나는 단계는 until) — Node 도구가 쓴다 */
export function sagaLookupOf(cards: readonly Pick<TimedCard, 'id' | 'set' | 'until'>[]): SagaLookup {
  const phaseOf = new Map<string, number>()
  const lastOf = new Map<string, number>()
  for (const c of cards) {
    const first = levelOfSet(c.set)
    phaseOf.set(c.id, first)
    if (c.until !== undefined) lastOf.set(c.id, levelOf(slotOf(first)!.saga, c.until)!)
  }
  return { phaseOf, lastOf }
}

/**
 * 고른 카드를 보이려고 옮겨 갈 시점 — 지금 시점에 그리면 그대로, 아니면 세트 시점(home), 그것도 아니면 지금 시점에 가장 가까운 시점(같으면 앞).
 * shown 은 그 카드를 그리는 시점들 (비면 home)
 */
export function timeToShow(c: Pick<TimedCard, 'set' | 'time'>, now: TimePoint | undefined, shown: readonly TimePoint[]): TimePoint {
  if (now !== undefined && shown.includes(now)) return now
  const home = homeOf(c)
  if (shown.includes(home) || !shown.length) return home
  const from = now ?? home
  return [...shown].sort((a, b) => Math.abs(a - from) - Math.abs(b - from) || a - b)[0]
}

// ── 지역 상세의 문 — 시점별 보기 (sagas.ts 의 inView) ───────────────────────────────────────────────────────────────────────────────

/** 시점별 보기에서 지역 상세의 문을 셈하는 보기 — 그 시점의 바탕 단계와 시점 */
export const timeGateView = (t: TimePoint): GateView => ({ level: timeInfo(t).periodLevel, time: t })

/** 보기의 문 셈 — 끔은 단계 0, 사가 보기는 그 단계, 시점별 보기는 그 시점의 바탕 단계와 시점 */
export const gateViewOf = (v: View): GateView => (v.kind === 'time' ? timeGateView(v.t) : { level: periodLevelOf(v) })

/** 사가 보기가 이 카드를 그리는 단계 (이어 센 번호 — 오른 페이즈부터 그 사가의 끝, until 이면 그 페이즈까지) */
export function sagaLevelsOf(c: Pick<TimedCard, 'set' | 'until'>): number[] {
  const first = levelOfSet(c.set)
  const slot = slotOf(first)!
  const last = levelOf(slot.saga, c.until ?? SAGAS[slot.saga - 1].phases)!
  return Array.from({ length: last - first + 1 }, (_, i) => first + i)
}

/**
 * 카드에 매인 빈터(for — 그 빈터가 자리를 비운 카드 id)의 시점 열쇠 — 시점마다 for 의 카드 가운데 하나라도 그 시점에 그 자리에 그려지면 켠다
 * (drawsAt — 앱이 그 시점에 그 카드를 그리는가, shownAtTimeOf. 지역 상세 그림이 아직 맞추지 않은 대상은 앱이 그리지 않으니 꺼짐.
 * time.moved 로 옮긴 시점은 그 자리가 아니라 꺼짐). 다만 사가 보기가 그 시점의 바탕 단계에 그 카드를 그리면 사가 보기의 문을 그대로 따른다 —
 * 문이 카드가 그려지는 단계 가운데 일부만 켜는 빈터(물이 빠진 바닥 무늬만 비우는 할리마르·바다 관문의 Angelic Gift·Stone Haven Medic 등)는 나머지
 * 단계에 비울 기호가 없어서다. timeOnly 빈터는 사가 보기의 문이 없어 그려지면 켠다.
 * 돌려주는 것은 기본값(inView 가 열쇠 없이 셈하는 값)과 다른 시점만 — 다르지 않으면 undefined
 */
export function forTimeGate<C extends Pick<TimedCard, 'set' | 'until' | 'time'>>(g: Gated, cards: readonly C[], drawsAt: (c: C, t: TimePoint) => boolean): TimeGate | undefined {
  const out: TimeGate = {}
  for (const [k, t] of TIME_KEYS) {
    const level = timeInfo(t).periodLevel
    const want = cards.some((c) => drawsAt(c, t) && !movedAt(c, t) && (g.timeOnly || !sagaLevelsOf(c).includes(level) || inPhase(g, level)))
    const base = !g.timeOnly && inPhase(g, level)
    if (want !== base) out[k] = want
  }
  return Object.keys(out).length ? out : undefined
}

/**
 * 대상을 비킨 손그림 부분·지형 칸(dodge — 원본이 그 대상의 자리를 비우려고 그 대상이 그려지는 단계에 끈 것, 그 카드 id)의 시점 열쇠 — 시점마다
 * dodge 의 카드 가운데 하나라도 그 시점에 그 자리에 그려지면(drawsAt, 옮긴 시점은 그 자리가 아니다) 끈다. 하나도 그 자리에 그리지 않는데 사가 보기가
 * 그 시점의 바탕 단계에 그 가운데 하나를 그리면(그래서 원본이 그 단계에 끈 것이면) 켠다 — 시점별 보기가 그리지 않는 장면의 자리를 비워 두지 않게.
 * 나머지 시점은 원본의 문 그대로. 돌려주는 것은 기본값(inView 가 열쇠 없이 셈하는 값)과 다른 시점만 — 다르지 않으면 undefined
 */
export function dodgeTimeGate<C extends Pick<TimedCard, 'set' | 'until' | 'time'>>(g: Gated, cards: readonly C[], drawsAt: (c: C, t: TimePoint) => boolean): TimeGate | undefined {
  const out: TimeGate = {}
  for (const [k, t] of TIME_KEYS) {
    const level = timeInfo(t).periodLevel
    const base = !g.timeOnly && inPhase(g, level)
    const here = cards.some((c) => drawsAt(c, t) && !movedAt(c, t))
    const want = here ? false : cards.some((c) => sagaLevelsOf(c).includes(level)) ? true : base
    if (want !== base) out[k] = want
  }
  return Object.keys(out).length ? out : undefined
}

// 보기(끔·사가 단계·시점 — 지금 끔·1–5·T1–T5 의 11개)로 넓힌 문 셈 — Node 도구(scripts/childmaps)와 시험(gates-test)만 쓴다. 앱은 부르지 않아 첫 로딩에 셈하지 않는다

/** 문이 맞는 보기 — 사가 보기의 단계(0 과 데이터가 있는 페이즈)와 시점별 보기의 시점(숨긴 시점도) */
export function viewsOf(g: Gated): { levels: number[]; times: TimePoint[] } {
  const levels = [0, ...PHASE_SLOTS.map((p) => p.level)].filter((l) => inView(g, { level: l }))
  return { levels, times: TIME_POINTS.filter((t) => inView(g, timeGateView(t))) }
}

const VIEW_LEVELS = [0, ...PHASE_SLOTS.map((p) => p.level)]
/** 보기 집합의 비트 — 단계 l 은 l 번, 시점 t 는 (단계 수 + t - 1) 번 */
const viewMask = (levels: readonly number[], times: readonly TimePoint[]) =>
  levels.reduce((m, l) => m | (1 << VIEW_LEVELS.indexOf(l)), 0) | times.reduce((m, t) => m | (1 << (VIEW_LEVELS.length + t - 1)), 0)
const gateKeys = (g: Gated) => GATES.filter(([k]) => g[k] !== undefined).length + Object.keys(g.time ?? {}).length + (g.timeOnly ? 1 : 0)
let viewCovers: Map<number, readonly Gated[]> | undefined
function viewCoverTable(): Map<number, readonly Gated[]> {
  if (viewCovers) return viewCovers
  // 문 — 페이즈 열쇠 3^(문 수) × 시점 열쇠 3^(시점 수), 그리고 timeOnly(페이즈 열쇠는 셈에 들지 않는다 — 시점 열쇠 true 만) 2^(시점 수)
  let phases: Gated[] = [{}]
  for (const [k] of GATES) phases = phases.flatMap((g) => [g, { ...g, [k]: true }, { ...g, [k]: false }])
  let times: TimeGate[] = [{}]
  for (const [k] of TIME_KEYS) times = times.flatMap((t) => [t, { ...t, [k]: true }, { ...t, [k]: false }])
  const all: Gated[] = [
    ...phases.flatMap((g) => times.map((t) => (Object.keys(t).length ? { ...g, time: t } : g))),
    ...times.filter((t) => Object.values(t).every(Boolean) && Object.keys(t).length).map((t): Gated => ({ time: t, timeOnly: true })),
  ]
  const byMask = new Map<number, Gated>()
  for (const g of all) {
    const v = viewsOf(g)
    const m = viewMask(v.levels, v.times)
    const cur = byMask.get(m)
    if (m && (!cur || gateKeys(g) < gateKeys(cur))) byMask.set(m, g)
  }
  const unit = [...byMask].map(([m, g]) => ({ m, g, keys: gateKeys(g) }))
  // 너비 우선 — sagas.ts 의 coverTable 과 같은 셈 (문 하나씩 더해 닿는 집합마다 가장 적은 문, 같으면 열쇠 수 합이 가장 적은 것)
  const best = new Map<number, { gates: Gated[]; keys: number }>([[0, { gates: [], keys: 0 }]])
  let layer = [0]
  while (layer.length) {
    const next = new Map<number, { gates: Gated[]; keys: number }>()
    for (const m of layer) {
      const from = best.get(m)!
      for (const u of unit) {
        const nm = m | u.m
        if (best.has(nm)) continue
        const keys = from.keys + u.keys
        const cur = next.get(nm)
        if (!cur || keys < cur.keys) next.set(nm, { gates: [...from.gates, u.g], keys })
      }
    }
    for (const [m, v] of next) best.set(m, v)
    layer = [...next.keys()]
  }
  const low = (g: Gated) => {
    const v = viewsOf(g)
    return v.levels.length ? v.levels[0] : VIEW_LEVELS.length + v.times[0]
  }
  viewCovers = new Map([...best].map(([m, v]) => [m, [...v.gates].sort((a, b) => low(a) - low(b))]))
  return viewCovers
}

/**
 * 정확히 그 보기 집합(사가 단계와 시점)에서만 그리는 문들 — sagas.ts 의 gatesFor 를 보기 전체로 넓힌 것 (문 하나하나는 AND, 여럿이면 OR).
 * 가장 적은 문으로, 같으면 붙는 열쇠(페이즈 열쇠·시점 열쇠·timeOnly)가 가장 적게. 빈 집합이면 [].
 * 예: 단계 [4, 5] 와 시점 [3] → {phase4: true, time: {t4: false}}. 시점 [1] 만 → {time: {t1: true}, timeOnly: true}
 */
export function gatesForViews(views: { levels: readonly number[]; times: readonly TimePoint[] }): Gated[] {
  for (const l of views.levels) if (!VIEW_LEVELS.includes(l)) throw new Error(`gatesForViews: 모르는 단계 ${l} — ${VIEW_LEVELS.join('·')} 가운데`)
  for (const t of views.times) if (!TIME_POINTS.includes(t)) throw new Error(`gatesForViews: 모르는 시점 ${t}`)
  const hit = viewCoverTable().get(viewMask(views.levels, views.times))
  if (!hit) throw new Error(`gatesForViews: 단계 [${views.levels.join(', ')}]·시점 [${views.times.join(', ')}] 를 덮는 문이 없다`)
  return hit.map((g) => ({ ...g, ...(g.time ? { time: { ...g.time } } : {}) }))
}

