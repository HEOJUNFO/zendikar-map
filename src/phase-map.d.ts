// 페이즈 카드 원본에서 뽑는 조각 — vite/phaseData.ts 의 플러그인이 만든다
// 지도 조각 (`import('./phase1?map')`) — 모양은 src/data/phase.ts 의 PhaseMapCard
declare module '*?map' {
  export const CARDS: readonly unknown[]
}
// 카드 id → 그 카드 원본 하나 (`import('./phase1?cards')`) — 모양은 src/data/phase1.ts 의 PhaseCard
declare module '*?cards' {
  export const TEXT: Readonly<Record<string, () => Promise<{ CARD: unknown }>>>
}
