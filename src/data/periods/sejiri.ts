// 페이즈 바탕 — sejiri. 모양·규칙은 ./types.ts
// Sejiri Skyclave 는 엘드라지 타이탄에게 부서져 극지 얼음에 갇혔다가 2020년에야 다시 떠올랐다 — 사가1·2(2009–2016)에는 얼음에 갇힌 폐허로 그린다.
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
      id: 'mark-sejiri-skyclave',
      op: 'skyclave-markers',
      place: 'sejiri-skyclave',
      kind: 'ruin',
      levels: [1, 2, 3, 4, 5],
      basis: `${CHANGED}: "The last Skyclave to fall was the one over Sejiri. When Sorin, Nahiri, and Ugin lured the Eldrazi to Zendikar to trap them, one of the Eldrazi titans appeared in Sejiri and destroyed the Skyclave with a thoughtless flick of a tentacle. The shattered sphere was encased in polar ice." / "Whatever their state of ruin and disrepair, all seven Skyclaves rose back up into the air and opened." — 엘드라지를 가둘 때 부서져 극지 얼음에 갇혔고, 엘드라지가 쓰러진 뒤(2020)에야 다시 떠올랐다.`,
      estimate: '얼음에 갇힌 자리는 공식 자료에 없다. 2020년에 떠오른 자리(이 지도가 고른 세지리 동부 고원 하늘)와 같은 곳에 무너진 폐허로 둔다.',
    },
  ],
  labels: [],
}
