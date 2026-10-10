// 페이즈 카드의 지도 조각 (`import('./phase1?map')`) — vite.config.ts 의 phaseMap 플러그인이 원본에서 뽑는다. 모양은 src/data/phase.ts 의 PhaseMapCard
declare module '*?map' {
  export const CARDS: readonly unknown[]
}
