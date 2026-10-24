// 페이즈 카드 원본을 페이즈마다 — Node 도구(scripts/figures·scripts/childmaps·scripts/qa)가 함께 쓴다.
// 데이터가 있는 페이즈(src/data/sagas.ts 의 PHASE_SLOTS — 사가의 phases 합)의 src/data/phase<n>.ts 를 차례로 읽는다 (n 은 이어 센 번호).
// 아직 phases 에 들지 않은 사가의 파일(사가3 의 phase6.ts — phases: 0)은 읽지 않는다 — 그 세트는 페이즈 번호가 없어(levelOfSet) 셈할 수 없다
import { PHASE_SLOTS } from '../src/data/sagas.ts'

/** 페이즈마다의 카드 — [i] 가 이어 센 번호 i + 1 의 phase<i+1>.ts 의 PHASE<i+1>_CARDS */
export const BY_PHASE = await Promise.all(
  PHASE_SLOTS.map(async ({ level }) => {
    const m = await import(`../src/data/phase${level}.ts`)
    const cards = m[`PHASE${level}_CARDS`]
    if (!Array.isArray(cards)) throw new Error(`src/data/phase${level}.ts 가 PHASE${level}_CARDS 를 내보내지 않는다`)
    return cards
  }),
)

/** 원본 파일 범위의 이름 (메시지에 쓴다) — 'phase1.ts~phase5.ts' */
export const PHASE_FILES = `phase1.ts~phase${PHASE_SLOTS.length}.ts`
