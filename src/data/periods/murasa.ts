// 페이즈 바탕 — murasa. 모양·규칙은 ./types.ts
// 무라사 하늘거주지는 고대에 바다 괴수가 바닷속으로 끌어내려 2020년에야 다시 떠올랐다 — 사가1·2(2009–2016)에는 물에 잠긴 폐허로 그린다
// (물 위의 폐허 표시는 ula-temple 이 선례다).
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
      id: 'mark-murasa-skyclave',
      op: 'skyclave-markers',
      place: 'murasa-skyclave',
      kind: 'ruin',
      levels: [1, 2, 3, 4, 5],
      basis: `${CHANGED}: "An enormous sea monster—perhaps an ancestor of Lorthos, the Tidemaker, or maybe Lorthos itself—dragged the Murasa Skyclave into the sea." / "Whatever their state of ruin and disrepair, all seven Skyclaves rose back up into the air and opened." — 고대에 바다 괴수가 바닷속으로 끌어내렸고, 엘드라지가 쓰러진 뒤(2020)에야 다시 떠올랐다.`,
      estimate: '바닷속 어디로 끌려 들어갔는지는 공식 자료에 없다. 2020년에 떠오른 자리(산산조각난 만 상공)와 같은 곳에 물에 잠긴 폐허로 둔다.',
    },
  ],
  labels: [],
}
