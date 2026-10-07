// 바탕 지형 — tazeem. 모양·규칙은 src/data/types.ts 의 Landscape
// 타짐은 2020 무렵(ZNR) 모습: 섬을 두른 Bulwark 고리 산맥(relief.ring) 안쪽에 오란리프 숲과 내해 할리마르가 있고,
// 우마라 강이 북쪽 고지에서 협곡을 지나 할리마르로 떨어진다. 장소 자리(우마라 협곡의 정착지들)는 locations.ts 를 따른다.
import type { Landscape } from '../types'

const PG_TAZEEM = '2009 가이드(A Planeswalker\'s Guide to Zendikar: Tazeem and Merfolk, 2009-12-02)'

// 할리마르 절벽 — 한 기슭을 강 어귀마다 끊어 여러 줄로 긋는다. 줄은 시계 방향(물이 오른쪽)
const HALIMAR_CLIFFS_BASIS = `${PG_TAZEEM} 'Halimar, the Inland Sea': 'Surrounded on three sides by rocky cliffs, the fourth side is enclosed by an ancient Sea Gate.' 바다 관문 쪽은 The Liberation of Sea Gate(2015): 'The Halimar side was a gentle slope down to a quiet beach'.`
const HALIMAR_CLIFFS_ESTIMATE =
  '세 면이 바위 절벽이라는 것만 공식 자료에 있다. 바다 관문 쪽 — 댐과 그리로 좁아지는 땅으로, 할리마르 쪽은 완만한 비탈과 해변이다 — 은 비우고, 북쪽 기슭은 우마라 강 어귀부터 바다 관문에서 약 96단위 떨어진 곳까지, 남쪽 기슭은 남쪽에서 흘러드는 강의 어귀부터 서쪽으로 그었다. 북쪽 기슭의 그 동쪽은 이 지도가 낮은 언덕으로 그린 바다 관문 가까이의 낮은 Bulwark 아래라 비웠다 — Slaughter at the Refuge(2015)는 그 낮은 능선에서 \'the land sloped gradually down to the Halimar\'라고 한다. 그 경계와, 강이 흘러드는 어귀에서 절벽을 끊은 자리는 이 지도가 골랐다.'

const MANY_RIVERS_BASIS =
  'Slaughter at the Refuge(2015): 할리마르는 \'the great inner sea, fed by Tazeem\'s many rivers\'이고, 같은 이야기는 \'Tazeem, with all its rushing rivers, tangled woods, and clear lakes\'라고 한다.'
const MEANDERING_BASIS =
  'Meandering River(OGW #173, 2016) 플레이버: \'The river split into many channels as it flowed to the Halimar Sea. Few travelers could follow the same one twice.\''

const PIT_CAVES_BASIS = `${PG_TAZEEM} 'Pit Caves': 'There are numerous pit caves all over Tazeem. These are deep vertical shafts that lead down to the swampy underground caves… The most dangerous pit caves are those that look innocuous but are actually geysers that blast boiling water into the air.'`
const PIT_CAVES_ESTIMATE =
  '\'타짐 곳곳\'이라고만 하고 자리는 밝히지 않는다. 이 지도가 Bulwark 안쪽 내륙에서 강과 장소를 비킨 몇 곳을 골라 본보기로 그렸다. 수는 공식 자료와 상관없다.'

const BULWARK_NORTH_BASIS =
  '아트북(The Art of Magic: Zendikar, 2016) \'The Bulwark\': 타짐을 고리처럼 두른 산맥으로 섬 북쪽 끝이 가장 높다. Red Route(2020): 마고시 폭포 위 협곡 둔덕에서 북쪽으로 \'low foothills and, eventually, the bruised darkness of the Bulwark\'.'
const BULWARK_NORTH_ESTIMATE =
  '산맥이 섬 전체를 두른다는 것과 북쪽 끝이 가장 높다는 것만 공식 자료에 있다. 이 지도는 협곡 위 평원·하늘폭포 아래 정글과 북쪽 해안 사이의 Bulwark 띠를 빽빽한 산으로 그렸다. 하다 북부(아트북 \'우마라 강 발원지 근처의 북쪽 고지\')가 이 띠 안에 있다.'

const BULWARK_LOW_BASIS =
  'Slaughter at the Refuge(2015): \'They stood at the crest of the Bulwark, the great ring of mountains that encircled Tazeem, though the ring was lower here, close to Sea Gate, than it was on the other side of the island.\''
const BULWARK_LOW_ESTIMATE =
  '얼마나 낮은지, 어디까지인지는 공식 자료에 없다. 이 지도가 바다 관문 양쪽, 댐에서 약 42~174단위 떨어진 Bulwark 띠를 산 대신 낮은 언덕으로 그렸다. 댐 바로 곁의 좁은 땅은 할리마르 쪽이 완만한 비탈과 해변, 대양 쪽이 절벽(The Liberation of Sea Gate)이라 비운다.'

const SEA_GATE_CLIFFS_BASIS =
  'The Liberation of Sea Gate(2015): \'The land that divided the Halimar Sea from the ocean outside narrowed quickly until it met the huge white dam of Sea Gate… The Halimar side was a gentle slope down to a quiet beach; while cliffs on the other side stretched down to the churning ocean below.\' Slaughter at the Refuge(2015)도 바다 관문 가까운 Bulwark 능선에서 \'a much sharper slope led down to the ocean\'이라고 한다.'
const SEA_GATE_CLIFFS_ESTIMATE =
  '이야기는 댐으로 좁아지는 땅의 대양 쪽이 절벽이라고만 하고, 어느 쪽 어깨인지와 길이는 밝히지 않는다. 이 지도가 댐 양쪽 어깨에서 할리마르와 대양 사이 땅이 좁아지는 구간의 대양 쪽에 그었다 — 북쪽 어깨는 댐에서 약 18~48단위, 남쪽 어깨는 약 18~78단위. 남쪽 어깨의 끝은 이 지도가 그린 낮은 Bulwark 곁까지 이어지는데, Slaughter at the Refuge가 그 능선에서 대양 쪽을 \'a much sharper slope\'이라고 하기 때문이다.'

export const landscape: Landscape = {
  // 뒤의 영역이 앞의 영역을 덮는다 — 북부 Bulwark 산 → 하늘폭포 아래 정글 → 협곡 북쪽 언덕 → 협곡 위 평원 순
  areas: [
    // 하다 북부 표시 둘레는 산을 놓지 않아 띠가 둘로 끊긴다 — 조각마다 따로 채우게 두 영역으로 나눈다.
    // 북쪽 가장자리는 해안선 바로 안쪽 (해안에서 14단위 안에는 원래 산을 놓지 않는다)
    {
      id: 'bulwark-north-heights-west',
      label: '섬 북쪽 끝의 높은 Bulwark',
      kind: 'mountain',
      ring: [[871.4, 449.8], [883.4, 454.6], [893, 458.2], [905, 449.8], [917, 443.8], [929, 427], [941, 431.8], [957.8, 430.6], [957.8, 471.4], [950.6, 471.4], [936.2, 472.6], [921.8, 475], [905, 476.2], [888.2, 476.2], [871.4, 475]],
      basis: BULWARK_NORTH_BASIS,
      estimate: BULWARK_NORTH_ESTIMATE,
      location: 'the-bulwark',
    },
    {
      id: 'bulwark-north-heights-east',
      label: '섬 북쪽 끝의 높은 Bulwark',
      kind: 'mountain',
      ring: [[957.8, 430.6], [967.4, 424.6], [977, 422.2], [989, 431.8], [1001, 445], [1013, 459.4], [1025, 460.6], [1029.8, 471.4], [1013, 476.2], [998.6, 473.8], [984.2, 471.4], [967.4, 471.4], [957.8, 471.4]],
      basis: BULWARK_NORTH_BASIS,
      estimate: BULWARK_NORTH_ESTIMATE,
      location: 'the-bulwark',
    },
    {
      id: 'umara-skyfalls-jungle',
      label: '하늘폭포 아래 정글',
      kind: 'forest',
      ring: [[936.2, 478.6], [926.6, 477.4], [917, 478.6], [907.4, 481], [900.2, 487], [901.4, 496.6], [906.2, 505], [914.6, 512.2], [924.2, 515.8], [933.8, 513.4], [941, 506.2], [943.4, 496.6], [943.4, 487]],
      basis: 'Umara Skyfalls(ZNR #86, 2020) 플레이버: \'The source of the Umara River sits high above Oran-Rief, ever weeping on the jungle below.\'',
      estimate: '정글의 범위는 공식 자료에 없다. 이 지도가 하늘폭포의 자리(이 지도의 추정) 아래, 북쪽 Bulwark 산줄기 바로 남쪽을 정글로 그렸다. Bulwark 띠의 안쪽 가장자리라 원래 산만 그려지던 곳이다.',
    },
    {
      id: 'umara-gorge-foothills',
      label: '협곡 북쪽의 낮은 언덕',
      kind: 'hills',
      ring: [[1008.2, 476.2], [998.6, 472.6], [984.2, 470.2], [967.4, 470.2], [953, 470.2], [939.8, 471.4], [933.8, 477.4], [941, 482.2], [953, 482.2], [967.4, 482.2], [981.8, 482.2], [996.2, 483.4], [1008.2, 482.2]],
      basis: 'Red Route(2020): 마고시 폭포 위 협곡 둔덕에서 본 풍경 — \'The plains atop the gorge stretched to the horizon, split only by jagged, spear-blade mountains rising in the distant north, where the planes gave way to low foothills and, eventually, the bruised darkness of the Bulwark.\'',
      estimate: '언덕의 자리와 폭은 공식 자료에 없다. 이 지도는 이야기의 순서 — 협곡 위 평원, 낮은 언덕, 그 너머 Bulwark — 를 지키되, 협곡과 북쪽 해안 사이가 48단위 남짓이라 그 순서를 좁게 줄여 평원과 북쪽 Bulwark 산줄기 사이에 얇은 언덕 띠로 그렸다. 이 해안선에서는 할리마르가 북쪽 해안 가까이 있어 Bulwark가 \'먼 북쪽\'에 있다는 거리는 나타내지 못한다.',
    },
    {
      id: 'umara-gorge-rim-plains',
      label: '우마라 협곡 위 평원',
      kind: 'plain',
      ring: [[953, 482.2], [945.8, 484.6], [947, 493], [942.2, 500.2], [943.4, 509.8], [948.2, 518.2], [945.8, 526.6], [951.8, 533.8], [960.2, 537.4], [969.8, 539.8], [978.2, 536.2], [984.2, 530.2], [992.6, 529], [1001, 524.2], [1009.4, 521.8], [1014.2, 514.6], [1020.2, 507.4], [1017.8, 497.8], [1022.6, 489.4], [1015.4, 484.6], [1005.8, 483.4], [996.2, 483.4], [986.6, 482.2], [977, 482.2], [967.4, 482.2], [959, 482.2]],
      basis: 'Red Route(2020): \'The plains atop the gorge stretched to the horizon…\' — 아키리 일행이 마고시 계단을 올라 \'atop the high rim of the gorge\'에서 야영하며 본 협곡 위의 평원.',
      estimate: '평원의 범위는 공식 자료에 없다. 이 지도가 그은 우마라 협곡 양쪽 둔덕을, 하늘폭포 밑에서 마고시 폭포까지의 위 협곡을 중심으로 폭포 조금 아래까지 평원으로 그렸다(Bulwark 띠의 산을 걷어 냄). 이야기에서 평원은 마고시 육로에서 이틀 가까이 더 올라간 둔덕에서 보이지만, 이 지도의 위 협곡은 48단위 남짓이라 그 거리는 나타내지 못한다. 하늘폭포 아래 정글과 협곡 아래쪽(산호투구 쪽)의 오란리프 숲은 남겼다.',
    },
    {
      id: 'bulwark-low-near-sea-gate-south',
      label: '바다 관문 가까이의 낮은 Bulwark',
      kind: 'hills',
      ring: [[1143.8, 592.6], [1139, 602.2], [1140.2, 613], [1143.8, 623.8], [1142.6, 634.6], [1143.8, 646.6], [1134.2, 651.4], [1131.8, 659.8], [1139, 668.2], [1147.4, 675.4], [1155.8, 682.6], [1165.4, 688.6], [1175, 694.6], [1184.6, 699.4], [1195.4, 704.2], [1205, 707.8], [1209.8, 701.8], [1206.2, 691], [1197.8, 683.8], [1189.4, 675.4], [1184.6, 665.8], [1177.4, 656.2], [1172.6, 646.6], [1171.4, 635.8], [1169, 625], [1167.8, 614.2], [1163, 603.4], [1153.4, 597.4]],
      basis: BULWARK_LOW_BASIS,
      estimate: BULWARK_LOW_ESTIMATE,
      location: 'the-bulwark',
    },
    {
      id: 'bulwark-low-near-sea-gate-north',
      label: '바다 관문 가까이의 낮은 Bulwark',
      kind: 'hills',
      ring: [[1047.8, 477.4], [1044.2, 487], [1043, 496.6], [1043, 507.4], [1046.6, 518.2], [1051.4, 526.6], [1061, 525.4], [1071.8, 521.8], [1081.4, 520.6], [1089.8, 513.4], [1089.8, 503.8], [1082.6, 495.4], [1077.8, 487], [1069.4, 479.8], [1058.6, 479.8]],
      basis: BULWARK_LOW_BASIS,
      estimate: BULWARK_LOW_ESTIMATE,
      location: 'the-bulwark',
    },
    {
      id: 'tazeem-southern-grassland',
      label: '타짐 남부의 헤드론 초원',
      kind: 'plain',
      ring: [[967.4, 771.4], [979.4, 778.6], [991.4, 784.6], [1003.4, 789.4], [1017.8, 790.6], [1032.2, 789.4], [1046.6, 785.8], [1058.6, 784.6], [1067, 793], [1074.2, 802.6], [1073, 812.2], [1063.4, 818.2], [1050.2, 821.8], [1034.6, 824.2], [1020.2, 824.2], [1005.8, 823], [991.4, 819.4], [979.4, 813.4], [971, 803.8], [966.2, 793], [965, 781]],
      basis: 'The Look of an Awakening World(Savor the Flavor, 2010): \'a hedron-laden grassland in southern Tazeem\'; Booster Quest: The Shaman\'s Orb(2010): \'the southern hedron-fields of Tazeem\'.',
      estimate: '\'타짐 남부\'라고만 해 자리와 범위는 이 지도가 골랐다 — 오란리프 숲 남쪽 끝(팬 지도 숲 가장자리) 바로 바깥에서 남쪽 Bulwark까지. 두 글은 2010년의 것으로, 지각판 하나가 그 일대를 가로지르고(칼럼) 땅에 묻혀 있던 헤드론들이 떠올라 모였다고(Booster Quest) 하며, 2020년 이후의 모습은 서술되지 않았다. 떠오른 헤드론은 타짐 하늘의 헤드론 무리가 그린다.',
    },
  ],
  rivers: [
    {
      id: 'umara-river',
      label: '우마라 강',
      // 하늘폭포 밑 → 마고시 육로 곁 → 마고시 폭포 → 우렌 동굴·티칼 정박지 곁 → Merfolk Enclave(강 위) → 할리마르 서쪽 끝
      course: [[941, 488.2], [948.2, 488.2], [955.4, 488.2], [961.4, 490.6], [963.8, 496.6], [967.4, 503.8], [967.4, 512.2], [963.8, 519.4], [961.4, 526.6], [963.8, 535], [968.6, 541], [971, 548.2], [968.6, 556.6], [967.4, 563.8], [968.6, 572.2], [974.6, 577], [983, 579.4], [991.4, 578.2]],
      width: 2.4,
      basis: `${PG_TAZEEM}: 'a great white-water river that bisects the continent' — 'runs through a deep gorge and drops over 800 feet over a series of waterfalls'. 아트북(The Art of Magic: Zendikar, 2016): Bulwark가 가장 높은 섬 북쪽 끝 둘레의 고지에서 발원해 할리마르로 떨어진다. Red Route(2020): 협곡 길은 '바다 관문이 건너편에 선 할리마르의 먼 기슭'에서 시작한다. Umara Skyfalls(ZNR, 2020): 'The source of the Umara River sits high above Oran-Rief'.`,
      estimate: '공식 자료가 밝힌 것은 두 끝 — 북쪽 고지의 발원(하늘폭포)과 바다 관문 맞은편 할리마르 서쪽 끝의 어귀 — 과 그 사이의 순서(할리마르 ← 산호투구 ← 마고시 폭포 ← 위 협곡)뿐이라, 그 사이 물길은 이 지도가 그 순서대로 놓인 장소들을 따라 그었다. 흐름 방향은 2016 아트북·2020 이야기를 따랐다(2009 가이드는 반대로 읽힌다). 이 해안선에서는 할리마르가 북동쪽에 있어 \'대륙을 가로지르는\' 길이는 나타내지 못했다.',
      location: 'umara-river',
    },
    {
      id: 'umara-west-tributary',
      label: '우마라 강의 지류',
      course: [[823.4, 554.2], [833, 560.2], [843.8, 559], [854.6, 555.4], [865.4, 560.2], [876.2, 561.4], [887, 556.6], [897.8, 561.4], [908.6, 562.6], [919.4, 557.8], [929, 553], [939.8, 548.2], [950.6, 543.4], [963.8, 535]],
      width: 1.1,
      tributaryOf: 'umara-river',
      basis: `${PG_TAZEEM}: 'Hundreds of tributaries branch out from Umara and wind through the Oran-Rief, and these smaller rivers tend to be less tumultuous than the Umara.'`,
      estimate: '지류의 수와 물길은 공식 자료에 없다. 이 지도가 그 가운데 하나만, 서쪽 Bulwark 안쪽 기슭에서 오란리프를 굽이쳐 지나 마고시 폭포 아래 협곡에서 우마라 강에 합류하게 그었다. 2009 가이드는 우마라가 할리마르에서 북쪽으로 흐른다고 읽혀 지류가 \'갈라져 나간다\'고 하지만, 이 지도는 2016·2020 자료의 흐름을 따라 본류로 흘러드는 물길로 그렸다.',
    },
    {
      id: 'halimar-west-river',
      label: '할리마르로 흘러드는 강',
      course: [[893, 656.2], [903.8, 649], [913.4, 643], [923, 635.8], [933.8, 628.6], [943.4, 620.2], [953, 614.2], [965, 609.4], [977, 607], [989, 604.6], [1001, 603.4], [1013, 603.4]],
      width: 1.3,
      basis: MANY_RIVERS_BASIS,
      estimate: '할리마르로 흘러드는 강이 여럿이라는 것만 공식 자료에 있고, 강의 수·이름·물길은 없다. 이 지도가 우마라 강 말고 두 줄기를 골라, 그 하나를 서쪽 오란리프에서 할리마르 남서쪽 기슭으로 흘러들게 그었다. 이름은 붙이지 않는다.',
    },
    {
      id: 'halimar-south-river',
      label: '할리마르로 흘러드는 강',
      course: [[1049, 821.8], [1053.8, 811], [1059.8, 800.2], [1059.8, 789.4], [1055, 778.6], [1059.8, 767.8], [1065.8, 758.2], [1070.6, 747.4], [1065.8, 736.6], [1069.4, 725.8], [1075.4, 716.2], [1079, 705.4], [1080.2, 693.4], [1083.8, 681.4], [1086.2, 670.6]],
      width: 1.5,
      basis: `${MANY_RIVERS_BASIS} ${MEANDERING_BASIS}`,
      estimate: '할리마르로 흘러드는 강이 여럿이라는 것만 공식 자료에 있고, 강의 수·이름·물길은 없다. 이 지도가 우마라 강 말고 두 줄기를 골라, 그 하나를 남쪽 Bulwark 안쪽 기슭에서 남쪽 초원과 오란리프를 지나 할리마르 남쪽 기슭으로 흘러들게 그었다. \'여러 갈래로 갈라져 할리마르로 흐르는 강\'(Meandering River)은 이 줄기의 가운데 구간에 갈래 물길로 나타냈다. 카드 이름은 지명이 아니라 이름을 붙이지 않는다.',
    },
    // 갈래 물길 — 본류에서 갈라졌다가 다시 본류로 돌아온다 (첫 점·끝 점 모두 본류 위)
    {
      id: 'halimar-south-river-east-channel',
      label: '여러 갈래로 갈라지는 물길',
      course: [[1059.8, 789.4], [1065.8, 785.8], [1070.6, 781], [1073, 773.8], [1075.4, 767.8], [1074.2, 760.6], [1073, 754.6], [1070.6, 747.4]],
      width: 0.9,
      tributaryOf: 'halimar-south-river',
      basis: MEANDERING_BASIS,
      estimate: '갈래의 수와 자리는 공식 자료에 없어 이 지도가 남쪽 강의 가운데 구간에 두 갈래를 골라 그었다.',
    },
    {
      id: 'halimar-south-river-west-channel',
      label: '여러 갈래로 갈라지는 물길',
      course: [[1065.8, 736.6], [1061, 730.6], [1058.6, 723.4], [1059.8, 716.2], [1064.6, 710.2], [1071.8, 707.8], [1079, 705.4]],
      width: 0.9,
      tributaryOf: 'halimar-south-river',
      basis: MEANDERING_BASIS,
      estimate: '갈래의 수와 자리는 공식 자료에 없어 이 지도가 남쪽 강의 가운데 구간에 두 갈래를 골라 그었다.',
    },
  ],
  lines: [
    {
      id: 'umara-gorge',
      label: '우마라 협곡',
      kind: 'gorge',
      // 우마라 강 물길을 그대로 따른다 — 하늘폭포 밑에서 할리마르 어귀까지
      line: [[948.2, 488.2], [955.4, 488.2], [961.4, 490.6], [963.8, 496.6], [967.4, 503.8], [967.4, 512.2], [963.8, 519.4], [961.4, 526.6], [963.8, 535], [968.6, 541], [971, 548.2], [968.6, 556.6], [967.4, 563.8], [968.6, 572.2], [974.6, 577]],
      width: 12,
      basis: `Red Route(2020): 'the Umara River Gorge, a long, stable, well-textured valley carved over millennia by the Umara River. With sheer walls plunging hundreds of feet from rim to river' — 'the stratified crimson-and-umber walls of the gorge'. ${PG_TAZEEM}: 'runs through a deep gorge'.`,
      estimate: '협곡은 이 지도가 그은 우마라 강 물길을 따라, 하늘폭포 밑에서 할리마르 어귀까지 그었다. 물길을 고른 까닭은 우마라 강에 적었다.',
      location: 'umara-river',
    },
    {
      id: 'halimar-cliffs-north',
      label: '할리마르를 두른 바위 절벽',
      kind: 'cliff',
      line: [[993.8, 569.8], [999.8, 567.4], [1003.4, 562.6], [1005.8, 557.8], [1007, 549.4], [1013, 544.6], [1014.2, 539.8], [1013, 535], [1015.4, 530.2], [1023.8, 527.8], [1031, 529], [1035.8, 527.8]],
      basis: HALIMAR_CLIFFS_BASIS,
      estimate: HALIMAR_CLIFFS_ESTIMATE,
    },
    {
      id: 'halimar-cliffs-south',
      label: '할리마르를 두른 바위 절벽',
      kind: 'cliff',
      line: [[1076.6, 669.4], [1071.8, 664.6], [1068.2, 662.2], [1064.6, 663.4], [1056.2, 663.4], [1051.4, 658.6], [1046.6, 658.6], [1039.4, 659.8], [1031, 658.6], [1023.8, 651.4], [1023.8, 644.2], [1022.6, 638.2], [1019, 632.2], [1016.6, 626.2], [1013, 621.4], [1007, 617.8]],
      basis: HALIMAR_CLIFFS_BASIS,
      estimate: HALIMAR_CLIFFS_ESTIMATE,
    },
    // 바다 관문 댐 양쪽 어깨의 대양 쪽 절벽 — 줄은 대양이 오른쪽이 되게 댐에서 멀어지거나 다가간다
    {
      id: 'sea-gate-ocean-cliffs-south',
      label: '바다 관문 대양 쪽 절벽',
      kind: 'cliff',
      line: [[1189.4, 601], [1187, 595], [1185.8, 590.2], [1183.4, 585.4], [1181, 581.8], [1177.4, 581.8], [1171.4, 579.4], [1166.6, 577], [1161.8, 573.4], [1155.8, 569.8], [1152.2, 565], [1149.8, 561.4], [1145, 559]],
      basis: SEA_GATE_CLIFFS_BASIS,
      estimate: SEA_GATE_CLIFFS_ESTIMATE,
    },
    {
      id: 'sea-gate-ocean-cliffs-north',
      label: '바다 관문 대양 쪽 절벽',
      kind: 'cliff',
      line: [[1121, 537.4], [1119.8, 532.6], [1117.4, 526.6], [1115, 520.6], [1115, 514.6], [1116.2, 508.6], [1117.4, 503.8]],
      basis: SEA_GATE_CLIFFS_BASIS,
      estimate: SEA_GATE_CLIFFS_ESTIMATE,
    },
  ],
  glyphs: [
    {
      id: 'umara-skyfalls-veil',
      label: '우마라 하늘폭포',
      kind: 'waterfall',
      at: [941, 482.2],
      angle: 0,
      basis: 'Umara Skyfalls(ZNR #86, 2020) 플레이버: \'The source of the Umara River sits high above Oran-Rief, ever weeping on the jungle below.\'',
      estimate: '자리는 장소 표시(이 지도의 추정) 곁을 따랐다. 물이 무엇에서 떨어지는지는 공식 자료에 없어, 하늘에서 떨어지는 물줄기만 그린다.',
      location: 'umara-skyfalls',
    },
    {
      id: 'magosi-falls-drop',
      label: '마고시 폭포',
      kind: 'waterfall',
      at: [961.4, 526.6],
      angle: 0,
      size: 1.2,
      basis: `${PG_TAZEEM}: 'Magosi is the largest waterfall along the river at almost 300 feet tall.' Red Route(2020): 'The tallest waterfall along the gorge, the Magosi Falls formed where the Umara River took a single, sheer step three hundred feet down.'`,
      estimate: '폭포의 자리는 카드 Magosi, the Waterveil 의 표시(이 지도의 추정)를 따랐다. 2009 가이드의 \'일련의 폭포\' 가운데 다른 폭포는 자리를 밝힌 자료가 없어 그리지 않는다.',
      location: 'magosi-falls',
    },
    {
      id: 'ruins-of-ysterid-pit',
      label: '유적이 있는 깊은 수직 동굴',
      kind: 'pit',
      at: [935, 530.2],
      basis: `${PG_TAZEEM}, Piqua(타짐 탐험 가문)의 말: 현자들은 Ruins of Ysterid가 'lie at the bottom of deep cave near Magosi Falls'인 줄 안다 — 'The pit will poison you, boil you, and regurgitate your body up to the surface'.`,
      estimate: '유적의 자리(이 지도의 추정) 곁에 그 수직 동굴을 그렸다.',
      location: 'ruins-of-ysterid',
    },
    {
      id: 'tazeem-pit-cave-west',
      label: '수직 동굴',
      kind: 'pit',
      at: [905, 589],
      basis: PIT_CAVES_BASIS,
      estimate: PIT_CAVES_ESTIMATE,
    },
    {
      id: 'tazeem-pit-cave-east',
      label: '수직 동굴',
      kind: 'pit',
      at: [1127, 733],
      basis: PIT_CAVES_BASIS,
      estimate: PIT_CAVES_ESTIMATE,
    },
    {
      id: 'tazeem-geyser-pit',
      label: '간헐천인 수직 동굴',
      kind: 'geyser',
      at: [947, 709],
      basis: PIT_CAVES_BASIS,
      estimate: PIT_CAVES_ESTIMATE,
    },
  ],
}
