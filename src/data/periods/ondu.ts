// 페이즈 바탕 — ondu. 모양·규칙은 ./types.ts
// 온두 하늘거주지는 고대에 좌르 섬으로 떨어져 2020년에야 다시 떠올랐다 — 사가1·2(2009–2016)에는 떠 있지 않은 폐허로 그린다.
// 줄라포트 표시는 바꾸지 않는다(사용자 결정 2026-10-15) — 해일 뒤에도 떠 있는 공동체로 남았고, beyeen 지역 상세가 표시 바로 앞바다에 그 마을을 그린다.
import type { PeriodSet } from './types.ts'

const CHANGED = 'Zendikar: Things Have Changed (2020-09-01)'

export const period: PeriodSet = {
  grounds: [],
  reliefs: [],
  drains: [],
  rivers: [],
  glyphs: [],
  hides: [],
  marks: [
    {
      id: 'mark-ondu-skyclave',
      op: 'ondu-skyclave-jwar',
      place: 'ondu-skyclave',
      kind: 'ruin',
      levels: [1, 2, 3, 4, 5],
      basis: `${CHANGED}: "Then civil war tore the empire in half; the Ondu Skyclave turned against the capital at Makindi. The city was destroyed (and its lands transformed into the trenches), and the Skyclave fell onto Jwar Isle." / "Whatever their state of ruin and disrepair, all seven Skyclaves rose back up into the air and opened." — 고대 내전 때 좌르 섬으로 떨어졌고, 엘드라지가 쓰러진 뒤(2020)에야 다시 떠올랐다. Magic Story: Hunger(2020-09-25)는 떠오른 조각에 "Semicircular stone, still bearing the jagged red obsidian and pale striations of the earth it had fallen into" 가 남았다고 쓴다 — 그 전에는 섬의 땅에 박혀 있었다.`,
      estimate: '떨어져 박힌 잔해의 모습과 섬 안의 자리는 공식 자료에 없다. 좌르 섬이라는 것만 밝혀져 있어, 2020년에 떠오른 자리(섬의 돌 절벽 쪽)와 같은 곳에 무너진 폐허로 둔다.',
    },
  ],
  labels: [],
}
