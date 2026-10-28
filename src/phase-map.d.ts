// 페이즈 카드 원본에서 뽑는 조각 — vite/phaseData.ts 의 플러그인이 만든다
// 지도 조각 (`import('./phase1?map')`) — 모양은 src/data/phase.ts 의 PhaseMapCard
declare module '*?map' {
  export const CARDS: readonly unknown[]
}
// 카드 id → 그 카드 원본 하나 (`import('./phase1?cards')`) — 모양은 src/data/phase1.ts 의 PhaseCard. EN 은 그 카드 글의 영어 문장 (src/i18n/units.ts 의 Dict)
declare module '*?cards' {
  export const TEXT: Readonly<Record<string, () => Promise<{ CARD: unknown; EN: Readonly<Record<string, string>> }>>>
}
// 양면 카드의 대지 면 목록 (`import { FACES } from './phase6?lands'`) — 모양은 src/data/landFace.ts 의 LandFaceEntry
declare module '*?lands' {
  export const FACES: readonly unknown[]
}
