// 페이즈 카드의 패널 글 (S7) — 카드 한 장의 원본을 받는다. 지금 지도의 src/data/phase.ts 의 loadCardText 와 같은 조각(./phaseN?cards → 카드마다 ./phaseN.ts?card=<id>)을
// 바로 부른다 (phase.ts 는 불러올 때 검사가 돌고 cards·childMaps 를 끌어온다). 시점의 까닭(이 시점 · …)은 지금 지도의 App.tsx 의 timeReasonOf 를 옮겼다 (App 은 부를 수 없다)
import type { PhaseCard } from '../../data/phase1'
import { drawnAt, goneOf, isCarriedOver, movedAt, sagaSetOf, sagaSpanOf, timeInfo, timeOfSet, type TimeInfo, type TimePoint } from '../../data/timeline'

type CardIndex = Record<string, () => Promise<{ CARD: unknown; EN?: Record<string, string> }>>
const INDEX: readonly (() => Promise<{ TEXT: CardIndex }>)[] = [
  () => import('../../data/phase1?cards') as Promise<{ TEXT: CardIndex }>,
  () => import('../../data/phase2?cards') as Promise<{ TEXT: CardIndex }>,
  () => import('../../data/phase3?cards') as Promise<{ TEXT: CardIndex }>,
  () => import('../../data/phase4?cards') as Promise<{ TEXT: CardIndex }>,
  () => import('../../data/phase5?cards') as Promise<{ TEXT: CardIndex }>,
  () => import('../../data/phase6?cards') as Promise<{ TEXT: CardIndex }>,
  () => import('../../data/phase7?cards') as Promise<{ TEXT: CardIndex }>,
  () => import('../../data/phase8?cards') as Promise<{ TEXT: CardIndex }>,
]

export interface PhaseCardText {
  card: PhaseCard
  en: Readonly<Record<string, string>>
}

const texts = new Map<string, Promise<PhaseCardText>>()

/** 카드 한 장의 원본 — phase 는 그 카드가 오르는 페이즈 파일 (1–8) */
export function loadPhaseCard(id: string, phase: number): Promise<PhaseCardText> {
  let p = texts.get(id)
  if (!p) {
    p = INDEX[phase - 1]()
      .then((m) => {
        const load = m.TEXT[id]
        if (!load) throw new Error(`phase${phase}.ts 에 카드 '${id}' 가 없다`)
        return load()
      })
      .then((m) => ({ card: m.CARD as PhaseCard, en: m.EN ?? {} }))
    texts.set(id, p)
    p.catch(() => texts.delete(id))
  }
  return p
}

export interface TimeReason {
  when: TimeInfo
  basis?: string
  estimate?: string
  notDrawn?: boolean
  never?: boolean
  replaced?: boolean
}

/** 시점별 보기의 패널에 싣는 까닭 — 지금 지도의 App.tsx 의 timeReasonOf 와 같다 */
export function timeReasonOf(card: PhaseCard, t: TimePoint): TimeReason | null {
  if (!card.time) return null
  if (!card.time.at.length) {
    const tm = card.time
    const home = timeInfo(timeOfSet(sagaSetOf(card)))
    const told = [tm.basis, tm.estimate].some((x) => typeof x === 'string' && x.includes(home.button))
    return told ? { when: home, basis: tm.basis, estimate: tm.estimate, notDrawn: true, never: true, replaced: isCarriedOver(card) } : null
  }
  if (!drawnAt(card, t)) {
    const tm = card.time
    const info = timeInfo(t)
    const gone = goneOf(card).includes(t)
    const told = [tm.basis, tm.estimate].some((x) => typeof x === 'string' && x.includes(info.button))
    return gone && told ? { when: info, basis: tm.basis, estimate: tm.estimate, notDrawn: true } : null
  }
  const tm = card.time
  const own = t === timeOfSet(sagaSetOf(card))
  const moved = Boolean(movedAt(card, t))
  const extended = !sagaSpanOf(card).includes(t) || tm.home === t
  if (!extended && !moved && !(tm.aloft && !own)) return null
  const basis = extended ? tm.basis : undefined
  if (!basis && !tm.estimate) return null
  return { when: timeInfo(t), basis, estimate: tm.estimate }
}

/** 카드 그림을 옆으로 눕혀 싣는 카드 (배틀·차원 — 지금 지도의 isSideways) */
export const isSideways = (typeLine: string) => /\b(Battle|Plane)\b/.test(typeLine)
