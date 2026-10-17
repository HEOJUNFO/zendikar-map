// 페이즈 바탕 — bala-ged. 모양·규칙은 ./types.ts
// 사가1(2009–10): 뒤엉킨 계곡은 가파른 언덕 사이의 정글 골짜기였고, Umung River 가 계단처럼 내려와 절벽에서 폭포가 쏟아지는 Bojuka Bay 로 들었다.
// 사가2(2015–16): 엘드라지가 휩쓸어 발라 게드 땅은 흰 가루 평원이 되었다(숲·늪·언덕이 사라지고 강은 먼지가 되었다) — 숲은 2020년에야 되살아났다.
// Khalni Heart 의 새 꽃봉오리는 침공 뒤에 틔워 사가1 에는 표시하지 않고, 발라 게드 하늘거주지는 2020년에야 떠올라 사가1·2 에는 폐허로 그린다.
import type { PeriodSet } from './types.ts'

const PG = 'A Planeswalker\'s Guide to Zendikar: Bala Ged and Elves (2009-09-30)'
const ART = 'The Art of Magic: The Gathering – Zendikar (2016)'
const CHANGED = 'Zendikar: Things Have Changed (2020-09-01)'
const RESOLVE = 'Magic Story: Nissa\'s Resolve (2015-10-07)'
const STEPS = `${PG}: "The Umung River descends in steps from the interior to sea level as it passes through Bala Ged." — 내륙에서 바다 높이까지 계단처럼 내려가며, 단마다 급류와 폭포가 있어 작은 배를 들어 옮기거나 끌어 올렸다(같은 글). BFZ 무렵에는 먼지가 되었다 — Bane of Bala Ged(BFZ #1): "its lush jungles and cascading rivers reduced to dust", ${RESOLVE}: "She followed it down the path that the Umung River used to take through the Vales—now just more chalky corruption."`
const FALLS = `${PG}: "Fed by the Umung River and several waterfalls that cascade down the surrounding cliffs, Bojuka Bay is a watery marsh of vast proportions." — 2009년의 Bojuka Bay 는 Umung 강과 둘레 절벽에서 떨어지는 여러 폭포가 채우는 늪 만이었다. BFZ 무렵 발라 게드의 "cascading rivers" 는 먼지가 되었다(Bane of Bala Ged, BFZ #1).`

export const period: PeriodSet = {
  grounds: [
    {
      id: 'bala-ged-white-dust',
      op: 'bala-ged-white-dust',
      levels: [4, 5],
      kind: 'dust',
      clears: 'all',
      density: 1,
      label: '흰 가루 평원',
      location: 'guum-wilds',
      alsoAt: ['tangled-vales', 'umung-river', 'bojuka-bay', 'bordermire'],
      shapes: [{ continent: 'bala-ged' }, { forest: 0, expect: 'bala-ged' }],
      basis: `Bane of Bala Ged(BFZ #1) 플레이버: "The continent of Bala Ged was ravaged by massive Eldrazi of Ulamog's lineage, its lush jungles and cascading rivers reduced to dust." ${ART}: "much of the continent was leveled—swamps, forests, hills, and cities across Bala Ged were reduced to fine, powdery white sand". ${RESOLVE}: "There were no dead trees. There were not even vestiges of dead trees; the white landscape was completely flat, the trees had all disintegrated." / "Her knees instinctively braced themselves to climb a hill that didn't exist." Slaughter at the Refuge(2015-08-19): "Sea Gate has fallen, joining Sejiri and Bala Ged in annihilation in the wake of the Eldrazi." 숲은 2020년 이야기 끝에야 되살아났다 — Episode 5: Two Guardians(2020-09-30): "Bala Ged was blooming again, growing, the forest coming back at speeds that only magic could accomplish."`,
      estimate: '아트북은 대륙의 "많은 곳(much of the continent)"이라고만 하지만 남았다고 밝힌 곳은 Khalni Heart 를 찾은 surrakar 굴 어귀의 이끼("A delicate blanket of pale green moss … lined the crumbling opening", Nissa\'s Resolve)뿐이라, 발라 게드 땅 전체를 흰 가루 평원으로 그렸다. 팬 지도 숲이 굴 드라즈 경계 너머로 조금 넘는 곳도 넣었다. Bojuka Bay 의 물과 둘레 절벽은 남겼다 — 2009년 가이드는 이 만을 Umung 강과 둘레 절벽의 폭포들이 채우는 "watery marsh" 라 쓰고, 그 강과 폭포가 먼지가 되었다는 서술(Bane of Bala Ged 의 "cascading rivers reduced to dust", 이 지도가 이 만 둘레에 둔 Blighted Cataract 의 "Once, water ran here. Now only dust and ash fall from the clifftops.")과 아트북의 "swamps … reduced to fine, powdery white sand" 는 만의 물도 줄었으리라는 쪽의 근거다. 그러나 바다에 이어진 만의 물까지 말랐다는 서술은 없어, 이 지도는 만의 물을 끔 지도 그대로 두었다(절벽은 Blighted Cataract 가 남았다고 쓴다). 사가2 페이즈2(OGW, 2016) 는 회복했다는 서술이 없어 페이즈1 과 같다.',
    },
  ],
  reliefs: [
    {
      id: 'tangled-vales-2009-hills',
      op: 'tangled-vales-2009-hills',
      levels: [1, 2, 3],
      kind: 'hills',
      density: 0.55,
      clears: ['tree'],
      label: '뒤엉킨 계곡의 가파른 언덕',
      location: 'tangled-vales',
      shapes: [
        { ring: [[2086, 964], [2120, 960], [2160, 962], [2200, 958], [2228, 962], [2232, 972], [2205, 976], [2165, 980], [2125, 982], [2090, 979]] },
        { ring: [[2092, 1000], [2128, 996], [2170, 1002], [2210, 998], [2234, 1002], [2232, 1012], [2205, 1016], [2165, 1018], [2125, 1016], [2094, 1012]] },
        // 셋째 등성이의 남동 끝은 해안에 닿지 않게 (2219, 1042) — 남쪽 해안에서 4 단위 남짓
        { ring: [[2104, 1032], [2140, 1028], [2180, 1034], [2215, 1030], [2228, 1036], [2219, 1042], [2185, 1050], [2145, 1048], [2110, 1046]] },
      ],
      basis: `${PG}: "The Tangled Vales are a number of interconnected jungle valleys that run between steep hills that ripple across the southern portion of Bala Ged." — 2009–10년 뒤엉킨 계곡은 가파른 언덕 사이로 이어진 정글 골짜기였다. BFZ 무렵에는 언덕까지 사라졌다 — ${RESOLVE}: "Her knees instinctively braced themselves to climb a hill that didn't exist."`,
      estimate: '언덕의 수·자리·방향은 공식 자료에 없어, 이 지도가 계곡 범위 안에 동서로 물결치는 등성이 셋을 그리고 그 사이 골짜기에는 숲을 남겼다. ROE(2010) 무렵 발라 게드가 이미 무너졌다는 서술은 없어 사가1 페이즈3 까지 둔다.',
    },
  ],
  drains: [],
  rivers: [
    {
      id: 'umung-river-2009',
      op: 'umung-bojuka-2009-waters',
      levels: [1, 2, 3],
      width: 1.8,
      label: 'Umung River (2009)',
      location: 'umung-river',
      course: [
        [2082, 960], [2100, 953], [2122, 950], [2145, 949], [2166, 946], [2176, 932], [2183, 916], [2196, 899], [2211, 891], [2226, 896], [2238, 904],
        [2243.5, 914], [2245.5, 925], [2246, 934], [2246.5, 943.5],
      ],
      basis: STEPS,
      estimate: '물길은 공식 자료에 없다. 이 지도가 내륙(계곡 서쪽)에서 계곡 북쪽 골짜기를 지나, 팬 지도의 아래 물줄기를 따라 Bojuka Bay 북쪽 기슭의 절벽 없는 틈으로 들게 그었다 — 틈의 서쪽 끝으로 들여 만 이름(Bojuka Bay)을 가로지르지 않게 했다 — 둘레에 둔 사가1 그림(Mold Shambler·Feral Contest·Surrakar Banisher·Snapping Creeper·Bojuka Brigand)과는 겹치지 않게 비켰다. 2020년에 다시 흐른다는 서술이 없어 기본 지도에는 그리지 않는다.',
    },
  ],
  glyphs: [
    {
      id: 'umung-step-1',
      op: 'umung-bojuka-2009-waters',
      levels: [1, 2, 3],
      kind: 'waterfall',
      at: [2134, 949.5],
      angle: -90,
      size: 0.8,
      label: 'Umung 강의 단',
      location: 'umung-river',
      basis: STEPS,
      estimate: '단의 수와 자리는 공식 자료에 없어, 읽히는 최소인 둘만 이 지도가 그은 2009년 물길 위에 두었다 — 하나는 계곡 서쪽 골짜기에, 하나는 만으로 내려가는 굽이에.',
    },
    {
      id: 'umung-step-2',
      op: 'umung-bojuka-2009-waters',
      levels: [1, 2, 3],
      kind: 'waterfall',
      at: [2203.5, 895],
      angle: -118,
      size: 0.8,
      label: 'Umung 강의 단',
      location: 'umung-river',
      basis: STEPS,
      estimate: '단의 수와 자리는 공식 자료에 없어, 읽히는 최소인 둘만 이 지도가 그은 2009년 물길 위에 두었다 — 하나는 계곡 서쪽 골짜기에, 하나는 만으로 내려가는 굽이에.',
    },
    {
      id: 'bojuka-falls-2009-south',
      op: 'umung-bojuka-2009-waters',
      levels: [1, 2, 3],
      kind: 'waterfall',
      at: [2251, 984.5],
      angle: 180,
      size: 0.8,
      label: 'Bojuka Bay 절벽의 폭포',
      location: 'bojuka-bay',
      basis: FALLS,
      estimate: '폭포의 수와 자리는 공식 자료에 없어, 읽히는 최소인 둘만 Bojuka Bay 둘레 절벽(바탕 bojuka-cliffs 선) 위에 이 지도가 두었다 — 남쪽 기슭에 하나, 북쪽 팔에 하나. Umung 강이 드는 어귀는 절벽 없는 틈이라 폭포를 두지 않았다.',
    },
    {
      id: 'bojuka-falls-2009-north',
      op: 'umung-bojuka-2009-waters',
      levels: [1, 2, 3],
      kind: 'waterfall',
      at: [2282.5, 918],
      angle: -63,
      size: 0.8,
      label: 'Bojuka Bay 절벽의 폭포',
      location: 'bojuka-bay',
      basis: FALLS,
      estimate: '폭포의 수와 자리는 공식 자료에 없어, 읽히는 최소인 둘만 Bojuka Bay 둘레 절벽(바탕 bojuka-cliffs 선) 위에 이 지도가 두었다 — 남쪽 기슭에 하나, 북쪽 팔에 하나. Umung 강이 드는 어귀는 절벽 없는 틈이라 폭포를 두지 않았다.',
    },
  ],
  hides: [],
  marks: [
    {
      id: 'mark-khalni-heart',
      op: 'khalni-heart-marker',
      place: 'khalni-heart-bala-ged',
      kind: null,
      levels: [1, 2, 3],
      basis: `${RESOLVE}: "If the rumors were true—and they were, they must be—then the heart of Zendikar's power had come here to revive the land, growing a new bud somewhere on this continent." / "it was at the partially collapsed and corrupted mouth of a surrakar tunnel, where the Eldrazi tracks circled around, that she saw the first sign of life." — 엘드라지가 발라 게드를 휩쓴 뒤 땅을 되살리려 새로 틔운 꽃봉오리라, 사가1(2009–10)에는 아직 없었다.`,
    },
    {
      id: 'mark-bala-ged-skyclave',
      op: 'skyclave-markers',
      place: 'bala-ged-skyclave',
      kind: 'ruin',
      levels: [1, 2, 3, 4, 5],
      basis: `${CHANGED}: "The elves of Bala Ged, led by a pre-spirit Obuun, revolted against their kor rulers and toppled their Skyclave." / "Whatever their state of ruin and disrepair, all seven Skyclaves rose back up into the air and opened." — 고대에 엘프 반란으로 무너졌고, 엘드라지가 쓰러진 뒤(2020)에야 다시 떠올랐다.`,
      estimate: '무너진 잔해의 자리는 공식 자료에 없다. 2020년에 떠오른 자리(이 지도가 고른 Guum Wilds 북동쪽 하늘)와 같은 곳에 무너진 폐허로 둔다.',
    },
  ],
  labels: [],
}
