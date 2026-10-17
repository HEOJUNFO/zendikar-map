// 페이즈 바탕 — akoum. 모양·규칙은 ./types.ts
// 가시지대의 협곡(바탕 akoum-spikefields-chasm)은 엘드라지가 지나간 뒤 생겼다 — 엘드라지가 풀려나기 전(사가1 페이즈1·2)에는 지우고
// 그 자리를 둘레와 같은 결정 들판으로 메운다. 아쿰 하늘거주지는 2020년에야 떠올라 사가1·2 에는 무너진 폐허로 그린다.
import type { PeriodSet } from './types.ts'

const ART = 'The Art of Magic: The Gathering – Zendikar (2016)'
const CHANGED = 'Zendikar: Things Have Changed (2020-09-01)'

export const period: PeriodSet = {
  grounds: [],
  reliefs: [
    {
      id: 'spikefields-chasm-fill',
      op: 'spikefields-chasm',
      levels: [1, 2],
      kind: 'crystal',
      density: 0.75,
      through: ['akoum-spikefields-chasm'],
      label: '가시지대 결정 들판',
      location: 'spikefields',
      // 협곡 가운데 선(폭 7.2)을 둘레 2–6 단위 띠로 감싼다 — 바탕 결정 들판이 협곡 띠만 비워 두었으므로 그 띠를 메운다
      shapes: [
        {
          ring: [
            [1723.2, 445.5], [1732.2, 438], [1743, 440.4], [1753.7, 432], [1766.3, 434.5], [1777.3, 428.6], [1786.4, 435.4], [1798, 437.6], [1805.1, 445.1],
            [1812.5, 437.7], [1802.8, 428.4], [1790.4, 425.8], [1777.9, 418.2], [1764.9, 424.3], [1751.1, 422], [1740.2, 430.4], [1729.4, 428], [1716.8, 437.3],
          ],
        },
      ],
      basis: 'PG: Akoum(2010) \'the crystalline fields shimmer in every imaginable color beneath the sun\', \'the crystal fields on the surface and the spires of semi-reflective rock\' — 가시지대는 결정 들판이다(바탕 akoum-spikefields 와 같은 근거). 협곡은 엘드라지가 지나간 뒤에야 생겼다(가시지대의 협곡 항목).',
      estimate: '협곡이 생기기 전 그 자리의 모습은 공식 자료에 없어, 둘레(바탕 akoum-spikefields)와 같은 밀도의 결정 들판으로 메웠다. 메운 띠는 바탕 협곡 선을 감싸게 이 지도가 그었다.',
    },
  ],
  drains: [],
  rivers: [],
  glyphs: [],
  hides: [
    {
      id: 'spikefields-chasm-l12',
      op: 'spikefields-chasm',
      line: 'akoum-spikefields-chasm',
      levels: [1, 2],
      label: '가시지대의 협곡(아직 없음)',
      location: 'spikefields',
      basis: `${ART}: "The passage of the Eldrazi, while devastating to the land, sometimes leads to important revelations. Layers of volcanic rock crumble away at the Eldrazi's touch" / "In the midst of the Spike Fields, a string of ruined fortresses have been unearthed in what is now a chasm stretching for miles across the desiccated land." — 엘드라지가 지나가며 화산암 층이 무너져 생긴 협곡이다('what is now a chasm'). 협곡 안의 요새 폐허는 BFZ 무렵 피난처 Stone Havens 가 되었다(Ghostly Sentinel, BFZ #28 "Mystics of the Stone Havens call upon the spirits of fallen heroes to defend the refuges.").`,
      estimate: '언제 무너졌는지 원문이 밝히지 않는다. 엘드라지 타이탄은 2010년 아쿰에서 풀려났으므로, 풀려나기 전(사가1 페이즈1·2)에만 지웠다. 페이즈3(ROE) 은 이미 무너졌는지 가를 수 없어 지금 그림을 둔다.',
    },
  ],
  marks: [
    {
      id: 'mark-akoum-skyclave',
      op: 'skyclave-markers',
      place: 'akoum-skyclave',
      kind: 'ruin',
      levels: [1, 2, 3, 4, 5],
      basis: `${CHANGED}: "As the Empire crumbled, the Kargan tribes mastered the dragons of Akoum and rode them to victory against the kor, shattering the Akoum Skyclave." / "Whatever their state of ruin and disrepair, all seven Skyclaves rose back up into the air and opened." — 고대에 카르간 부족이 용을 타고 산산조각 냈고, 엘드라지가 쓰러진 뒤(2020)에야 다시 떠올랐다.`,
      estimate: '부서진 잔해가 어디에 떨어졌는지는 공식 자료에 없다. 2020년에 떠오른 자리(이 지도가 고른 초화산 동쪽 기슭의 용암 들판 하늘)와 같은 곳에 무너진 폐허로 둔다.',
    },
  ],
  labels: [],
}
