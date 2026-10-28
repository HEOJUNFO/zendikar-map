// 페이즈 바탕 — guul-draz. 모양·규칙은 ./types.ts
// Lake of Dust 는 2009–10년(사가1)에 발라 게드와 굴 드라즈를 가르는 늪이었고, 엘드라지가 지나간 뒤(사가2)에는 백악 바위의 흉터와
// 먼지 찬 강바닥이 되었다. 이름은 어느 페이즈에서나 그대로 둔다 — 'Lake of Dust' 는 황폐해진 뒤 둘레 사람들(피난민 포함)이 붙인 이름이고,
// 늪이었다는 것과 함께 패널의 '이 무렵'에 적는다. 2009년 공식 가이드가 바로 그 늪을 묘사한 Bordermire(발라 게드 쪽 가장자리)도 그 늪에 넣는다.
// Guul Draz Skyclave 는 고대에 늪에 가라앉아 2020년에야 떠올랐다 — 사가1·2 에는 무너진 폐허로 그린다.
import type { PeriodSet } from './types.ts'

const PG = 'A Planeswalker\'s Guide to Zendikar: Bala Ged and Elves (2009-09-30)'
const ART = 'The Art of Magic: The Gathering – Zendikar (2016)'
const CHANGED = 'Zendikar: Things Have Changed (2020-09-01)'
const SCAR = `${ART}, 'The Lake of Dust': "It is a massive scar of barren, chalky rock where no vegetation will grow and dust-filled riverbeds where water refuses to flow." — 엘드라지가 지나간 뒤 식물이 자라지 않는 백악 바위의 거대한 흉터와 물이 흐르지 않는 먼지 찬 강바닥이 되었다.`

export const period: PeriodSet = {
  grounds: [
    {
      id: 'lake-of-dust-scar',
      op: 'lake-of-dust',
      levels: [4, 5],
      kind: 'chalk',
      clears: 'all',
      density: 1,
      label: '백악 흉터',
      location: 'lake-of-dust',
      shapes: [
        {
          // 북쪽은 해안 밖 바다까지, 동쪽은 발라 게드 경계를 4–5 단위 넘어(흰 가루 평원과 겹친다), 남동 끝은 남쪽 만의 머리까지 —
          // 칠은 땅으로 자르고 기호는 땅에만 두므로, 흉터와 해안·흰 가루 평원 사이에 굴 드라즈의 숲 기호가 띠로 남지 않게
          ring: [
            [1944.5, 908], [1952.5, 909], [1958.5, 907.5], [1968, 899.5], [1978, 903], [1992, 900.5], [2007.5, 900.5], [2016, 894], [2022, 889],
            [2022.5, 904], [2023.5, 915], [2027.5, 936], [2031, 958], [2034, 980], [2037.5, 999], [2036, 1006], [2030, 1006.5], [2022, 1002],
            [2014, 999], [1998, 990], [1982, 978], [1966, 964], [1954, 948], [1947, 930],
          ],
        },
      ],
      basis: SCAR,
      estimate: '흉터의 범위는 공식 자료에 없다. 이 지도가 Lake of Dust 자리(굴 드라즈 최북단, 발라 게드와 이어진 곳) 둘레에서 굴 드라즈 쪽 땅으로 골랐다 — 북쪽 해안과 남쪽 만의 머리까지, 동쪽은 발라 게드 경계를 조금 넘겨 발라 게드의 흰 가루 평원과 잇는다.',
    },
  ],
  reliefs: [
    {
      id: 'lake-of-dust-2009-marsh',
      op: 'lake-of-dust',
      levels: [1, 2, 3],
      kind: 'swamp',
      density: 1,
      clears: 'all',
      label: '발라 게드와 굴 드라즈 사이의 늪',
      location: 'lake-of-dust',
      alsoAt: ['bordermire'],
      shapes: [
        { place: 'bordermire' },
        {
          ring: [
            [1952, 915], [1968, 906.5], [1978, 909], [1992, 906.5], [2007, 906.5], [2015, 907.5], [2018, 922], [2022, 942], [2026, 962], [2024, 982],
            [2022, 995], [2018, 996], [2004, 986], [1990, 974], [1976, 962], [1963, 948], [1954, 932],
          ],
        },
      ],
      basis: `${PG}: "The subcontinent of Bala Ged, separated from the continent of Guul Draz by a miles-long marsh" — 2009년에는 발라 게드와 굴 드라즈 사이에 수 마일 길이의 늪이 있었다. 같은 글의 Kol Jofara 탐험 일지: "Tracked a bask of nema crocs through the densest reaches of the Bordermire. Lost a third of our rations to the grasping marsh, just before we hit the edge of Bala Ged." — 발라 게드 가장자리 바로 앞의 '움켜쥐는' 늪 Bordermire. ${ART}(locations.ts lake-of-dust 의 자리 근거): "The northernmost part of Guul Draz is connected to Bala Ged and shared in that region's utter destruction. The people who live nearby, including refugees who fled the area, now refer to the desolated swampland as the Lake of Dust." — 발라 게드와 함께 황폐해진 그 늪지를 둘레 사람들(그곳에서 달아난 피난민을 포함해)이 이제 Lake of Dust 라 부른다. 그래서 'Lake of Dust' 는 황폐해진 뒤의 이름이다(이 무렵에는 아직 늪이었다).`,
      estimate: '이 늪이 두 대륙을 잇는 땅의 늪이라는 것은 이 지도의 해석(docs/lore.md)이다. 늪의 범위는 이 지도가 Lake of Dust 자리 둘레에서 골랐고, 팬 지도의 발라 게드 숲 서쪽 끝과는 띄웠다. Bordermire 는 이 지도가 고른 그 자리의 범위(장소 bordermire 의 extent — 지금 모습을 알 수 없어 기본 지도에는 기호를 깔지 않는 곳)를 그대로 늪으로 넣었다. 두 늪이 같은 늪인지는 공식 서술이 없어 이어지는 범위로만 그렸다. 지도의 이름 Lake of Dust 는 어느 페이즈에서나 같은 자리에 그대로 둔다(이름은 황폐해진 뒤의 것).',
    },
  ],
  drains: [],
  rivers: [
    {
      id: 'lake-of-dust-dry-1',
      op: 'lake-of-dust',
      levels: [4, 5],
      dry: true,
      label: '먼지 찬 강바닥',
      location: 'lake-of-dust',
      course: [[2018, 985], [2010, 968], [2005, 950], [2004, 930], [2003, 906]],
      basis: SCAR,
      estimate: '강바닥의 수와 자리는 공식 자료에 없다. 이 지도가 흉터 안에서 북쪽 해안으로 빠지는 두 줄을 골랐다. 첫째 줄은 Lake of Dust 이름(자리 1988.6, 918.4) 동쪽을 지나 이름을 가로지르지 않게 했다.',
    },
    {
      id: 'lake-of-dust-dry-2',
      op: 'lake-of-dust',
      levels: [4, 5],
      dry: true,
      label: '먼지 찬 강바닥',
      location: 'lake-of-dust',
      course: [[1987, 972], [1983, 955], [1981, 940], [1977, 922], [1970, 907]],
      basis: SCAR,
      estimate: '강바닥의 수와 자리는 공식 자료에 없다. 이 지도가 흉터 안에서 북쪽 해안으로 빠지는 두 줄을 골랐다. 둘째 줄은 Blighted Fen 카드 표시와 그 이름(표시 서쪽)을 비켜 표시의 동쪽 7 단위 남짓으로 지난다.',
    },
  ],
  glyphs: [],
  hides: [],
  marks: [
    {
      id: 'mark-guul-draz-skyclave',
      op: 'skyclave-markers',
      place: 'guul-draz-skyclave',
      kind: 'ruin',
      levels: [1, 2, 3, 4, 5],
      basis: `${CHANGED}: "The Roil swallowed the Guul Draz outpost and drowned it in a swamp." / "Whatever their state of ruin and disrepair, all seven Skyclaves rose back up into the air and opened." — 고대에 탁류에 삼켜져 늪에 가라앉았고, 엘드라지가 쓰러진 뒤(2020)에야 다시 떠올랐다.`,
      estimate: '어느 늪에 가라앉았는지는 공식 자료에 없다. 2020년에 떠오른 자리(이 지도가 고른 하그라 늪 북쪽 하늘)와 같은 곳, 하그라 늪 위에 가라앉은 폐허로 둔다.',
    },
  ],
  labels: [],
}
