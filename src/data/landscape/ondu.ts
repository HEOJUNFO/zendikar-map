// 바탕 지형 — ondu. 모양·규칙은 src/data/types.ts 의 Landscape
// 본토(마킨디 협곡의 급류·고원의 굽이치는 강·메사·Omnath의 감옥 메사)와 세 섬(아가딤·베이인·좌르), 좌르 둘레·Serpent's Maw 의 바다
import type { Landscape } from '../types'

const PG_ONDU = 'A Planeswalker\'s Guide to Zendikar: Ondu (2009)'
const JAVAD = 'The Journal of Javad Nasrin (2009)'

export const landscape: Landscape = {
  areas: [
    // ── 본토 ──────────────────────────────────────────────────────────────
    {
      id: 'makindi-mesas',
      location: 'makindi-trenches',
      label: '마킨디 메사',
      kind: 'mesa',
      ring: [
        [564.2, 990.4], [607.4, 976], [653, 980.8], [696.2, 995.2], [734.6, 1016.8], [765.8, 1031.2], [761, 1055.2], [729.8, 1072], [696.2, 1096],
        [667.4, 1124.8], [638.6, 1146.4], [607.4, 1156], [576.2, 1151.2], [552.2, 1129.6], [545, 1096], [549.8, 1048], [554.6, 1016.8],
      ],
      basis: `${PG_ONDU}: 'Throughout the canyons and plateaus of Makindi…'. 카드 Prairie Stream(BFZ): 'The continent of Ondu is a vast plateau crisscrossed by deep trenches…'. ZNR 대지면 카드 Makindi Mesas(마킨디 메사).`,
      estimate: '공식 자료는 마킨디에 협곡과 함께 고원·메사가 있다는 것까지만 밝힌다. 이 지도는 팬 지도 협곡 무늬가 성긴 마킨디 협곡 동남쪽 가장자리부터 동쪽 고원까지를 메사 지대로 골랐다 — 협곡이 빽빽한 서쪽·북쪽과 변화림은 그대로 둔다.',
    },
    {
      id: 'prison-of-omnath-forest',
      location: 'prison-of-omnath',
      label: '메사 꼭대기의 숲',
      kind: 'forest',
      ring: [
        [471.8, 978.4], [458.6, 979.6], [447.8, 985.6], [437, 991.6], [433.4, 1000], [434.6, 1009.6], [438.2, 1018], [447.8, 1024], [458.6, 1030],
        [471.8, 1031.2], [485, 1027.6], [497, 1025.2], [506.6, 1018], [509, 1009.6], [510.2, 1000], [506.6, 991.6], [495.8, 985.6], [485, 980.8],
      ],
      basis: `${PG_ONDU}: 'If one travels to the top of a soaring Onduan mesa, through the dense forest that crowns it, and into a murky mire at the grove's heart…' — Prison of Omnath 가 그 메사 위에 있다.`,
      estimate: '자리는 팬 지도의 Prison of Omnath 점을 따랐고, 숲의 크기는 이 지도가 정했다 (메사 가장자리 바로 안쪽까지).',
    },
    {
      id: 'prison-of-omnath-mire',
      location: 'prison-of-omnath',
      label: '숲 한가운데의 늪',
      kind: 'swamp',
      ring: [
        [470.6, 995.2], [462.2, 996.4], [457.4, 1001.2], [453.8, 1006], [457.4, 1010.8], [462.2, 1015.6],
        [470.6, 1016.8], [477.8, 1014.4], [485, 1012], [486.2, 1006], [485, 1001.2], [477.8, 997.6],
      ],
      basis: `${PG_ONDU}: '…into a murky mire at the grove's heart where shadows move and twist, one can find the binding circle that surrounds the entrance to Omnath's prison.'`,
      estimate: '늪은 메사 숲의 한가운데(공식)에 두었고, 크기는 이 지도가 정했다.',
    },

    // ── 아가딤 ────────────────────────────────────────────────────────────
    {
      id: 'agadeem-marsh',
      location: 'agadeem',
      label: 'Crypt of Agadeem을 둘러싼 습지',
      kind: 'swamp',
      // 협곡 북쪽 가장자리에서 북쪽 해안 밖까지 — 바다 쪽은 해안선이 잘라 낸다
      ring: [
        [341, 1561.6], [348.2, 1544.8], [360.2, 1525.6], [369.8, 1504], [381.8, 1496.8], [389, 1511.2], [398.6, 1516], [410.6, 1530.4],
        [422.6, 1535.2], [439.4, 1535.2], [441.8, 1554.4], [434.6, 1568.8], [420.2, 1570], [410.6, 1571.2], [401, 1571.2], [391.4, 1568.8],
        [381.8, 1567.6], [372.2, 1564], [362.6, 1561.6], [353, 1560.4],
      ],
      basis: `${JAVAD}: 'we march on almost due north, and should meet some of the marshlands that surround the famous Crypt soon, and then the northern coast' — 헤드론 들판 → 협곡 → 습지 → Crypt → 북쪽 해안 순서.`,
      estimate: '습지가 Crypt를 둘러싸고 협곡과 북쪽 해안 사이에 있다는 것(공식)에 따라, 팬 지도 Crypt of Agadeem 점을 가운데 두고 협곡 북쪽 가장자리부터 북쪽 해안까지를 이 지도가 습지로 골랐다.',
    },

    // ── 베이인 ────────────────────────────────────────────────────────────
    {
      id: 'beyeen-crown-basin',
      location: 'beyeen',
      label: '왕관 고리의 안쪽',
      kind: 'plain',
      at: [545, 1582],
      extent: [9.6, 7.2],
      basis: `${PG_ONDU}: 'A ring of jagged, volcanic peaks rises from the center of the island, resembling a monarch's crown.'`,
      estimate: '공식 자료는 고리 안쪽을 서술하지 않는다. 봉우리가 왕관 같은 고리로 읽히도록 이 지도가 고리 안쪽에는 기호를 두지 않았다.',
    },
    {
      id: 'beyeen-rainforest',
      location: 'beyeen',
      label: '저지대 온대 우림',
      kind: 'forest',
      ring: [
        [519.8, 1592.8], [533, 1596.4], [546.2, 1597.6], [558.2, 1596.4], [565.4, 1590.4], [569, 1584.4], [577.4, 1582], [587, 1582],
        [595.4, 1585.6], [594.2, 1592.8], [584.6, 1596.4], [579.8, 1603.6], [566.6, 1604.8], [552.2, 1603.6], [535.4, 1603.6], [519.8, 1602.4],
      ],
      basis: `${PG_ONDU}: 'The lowland valleys of Beyeen are a temperate rainforest, supporting black-furred apes, dappled jaguars, tapirs, and duikers.'`,
      estimate: '공식 자료는 \'저지대 계곡\'이라고만 한다. 이 지도는 고리 산(Crown of Talib) 바깥의 낮은 땅 가운데, 서해안의 \'산비탈\'(Boilbasin)을 뺀 남쪽 기슭과 줄라포트 둘레의 동쪽을 우림으로 골랐다.',
    },
  ],

  rivers: [
    // ── 마킨디 협곡 바닥의 급류 (PG: Ondu 'Raging rivers') ─────────────────────
    {
      id: 'makindi-north-river',
      location: 'makindi-trenches',
      label: '협곡 바닥의 급류',
      course: [
        [509, 964], [511.4, 950.8], [512.6, 936.4], [509, 922], [519.8, 911.2], [524.6, 898], [525.8, 883.6], [524.6, 869.2], [530.6, 857.2],
        [539, 845.2], [541.4, 832],
      ],
      width: 1.4,
      basis: `${PG_ONDU}: 'The canyons represent sheer drops down hundreds of feet, some terminating in whitewater rivers, others ending in bare rock.' / 'Fast-moving whitewater rivers course through many branches of the Trenches.'`,
      estimate: '공식 자료는 협곡 여러 갈래의 바닥에 급류가 흐른다고만 한다. 물길과 하구는 이 지도가 골라, Omnath의 감옥 메사 북쪽에서 협곡을 따라 북쪽 해안의 만으로 흘려보냈다.',
    },
    {
      id: 'makindi-west-river',
      location: 'makindi-trenches',
      label: '협곡 바닥의 급류',
      course: [
        [365, 990.4], [350.6, 988], [336.2, 989.2], [320.6, 991.6], [307.4, 982], [293, 979.6], [277.4, 979.6], [261.8, 984.4],
        [248.6, 978.4], [234.2, 973.6], [219.8, 971.2], [204.2, 977.2], [189.8, 977.2], [175.4, 970], [161, 965.2], [145.4, 967.6],
        [131, 970], [116.6, 967.6],
      ],
      width: 1.5,
      basis: `${PG_ONDU}: 'Fast-moving whitewater rivers course through many branches of the Trenches.' — 'the river has been a cool ribbon sparkling far below us'`,
      estimate: '물길과 하구는 이 지도가 골랐다 — 서쪽 협곡 무늬의 결을 따라 동서로 흘러 서해안의 만으로 나간다. 협곡 바닥 가운데 일부는 맨바위(공식)라 모든 갈래에 강을 두지는 않았다.',
    },
    {
      id: 'makindi-west-branch',
      location: 'makindi-trenches',
      label: '협곡 바닥의 급류',
      course: [
        [338.6, 884.8], [331.4, 896.8], [326.6, 910], [313.4, 917.2], [306.2, 929.2], [302.6, 942.4], [296.6, 955.6], [288.2, 966.4], [283.4, 979.6],
      ],
      width: 1.1,
      tributaryOf: 'makindi-west-river',
      basis: `${PG_ONDU}: 'Fast-moving whitewater rivers course through many branches of the Trenches.'`,
      estimate: '\'여러 갈래\'를 보이려고 이 지도가 고른 지류로, 북쪽 협곡에서 서쪽 급류로 합쳐진다.',
    },
    // ── 고원의 굽이치는 강 (Prairie Stream) ─────────────────────────────────
    {
      id: 'ondu-east-plateau-river',
      label: '고원의 굽이치는 강',
      course: [
        [809, 1031.2], [793.4, 1028.8], [780.2, 1033.6], [765.8, 1038.4], [756.2, 1054], [743, 1057.6], [723.8, 1051.6], [710.6, 1056.4],
        [695, 1060], [686.6, 1074.4], [680.6, 1092.4], [666.2, 1096], [653, 1102], [636.2, 1104.4], [620.6, 1110.4], [620.6, 1129.6],
        [615.8, 1144], [609.8, 1157.2], [602.6, 1168], [588.2, 1177.6], [587, 1193.2],
      ],
      width: 1.7,
      basis: '카드 Prairie Stream(BFZ #241) 플레이버: \'The continent of Ondu is a vast plateau crisscrossed by deep trenches and meandering rivers.\'',
      estimate: '공식 자료는 대륙 수준에서 \'고원을 가로지르는 굽이치는 강\'이라고만 한다. 물길은 이 지도가 골라, 협곡이 끝나는 동쪽 고원에서 굽이쳐 남동 해안의 긴 만 안쪽 끝으로 흘려보냈다.',
    },
    {
      id: 'ondu-west-plateau-river',
      label: '고원의 굽이치는 강',
      course: [
        [456.2, 1153.6], [441.8, 1157.2], [428.6, 1164.4], [414.2, 1171.6], [398.6, 1162], [383, 1156], [368.6, 1160.8], [354.2, 1163.2],
        [341, 1175.2], [326.6, 1183.6], [311, 1174], [296.6, 1170.4], [281, 1166.8], [266.6, 1164.4], [252.2, 1180], [237.8, 1186],
        [223.4, 1182.4], [209, 1181.2], [193.4, 1169.2], [179, 1170.4], [164.6, 1176.4],
      ],
      width: 1.7,
      basis: '카드 Prairie Stream(BFZ #241) 플레이버: \'The continent of Ondu is a vast plateau crisscrossed by deep trenches and meandering rivers.\'',
      estimate: '물길은 이 지도가 골랐다 — 마킨디 협곡 남쪽 고원에서 서쪽으로 굽이쳐, 팬 지도의 두 숲(변화림과 그 북쪽 숲) 사이 트인 땅을 지나 서해안으로 나간다.',
    },
  ],

  lines: [
    {
      id: 'prison-of-omnath-mesa',
      location: 'prison-of-omnath',
      label: '메사 절벽',
      kind: 'cliff',
      closed: true,
      // 반시계 방향(지도에서) — 빗금이 바깥쪽 아래로 떨어진다
      line: [
        [471.8, 973.6], [457.4, 973.6], [446.6, 980.8], [434.6, 985.6], [428.6, 995.2], [428.6, 1004.8], [428.6, 1014.4], [437, 1022.8], [444.2, 1031.2], [458.6, 1034.8],
        [471.8, 1034.8], [486.2, 1034.8], [499.4, 1031.2], [506.6, 1022.8], [515, 1014.4], [518.6, 1004.8], [512.6, 995.2], [507.8, 986.8], [498.2, 978.4], [485, 976],
      ],
      basis: `${PG_ONDU}: 'a real site on a high mesa of Ondu has been dubbed the Prison of Omnath' / 'the top of a soaring Onduan mesa'`,
      estimate: '메사의 자리는 팬 지도의 Prison of Omnath 점을 따랐고, 둘레와 크기는 이 지도가 정했다 — 꼭대기의 숲과 한가운데 늪이 장소 표시 둘레에 보이도록 넉넉히(동서 약 90, 남북 약 60 단위) 잡았다.',
    },
    {
      id: 'agadeem-ravine',
      location: 'agadeem',
      label: '헤드론 들판과 습지 사이의 깊은 협곡',
      kind: 'gorge',
      width: 6,
      line: [[345.8, 1565.2], [355.4, 1564], [365, 1566.4], [374.6, 1570], [384.2, 1572.4], [393.8, 1574.8], [403.4, 1576], [413, 1574.8], [420.2, 1572.4]],
      basis: `${JAVAD}: 'Tomorrow we journey into the deep ravine that separates the hedron fields from the marshlands' / 'the slimy cliffs of the ravine'`,
      estimate: '헤드론 들판과 습지 사이(공식)라 팬 지도의 카비라·헤드론 들판과 Crypt of Agadeem 사이에 두었고, 동서로 뻗은 길이와 물길은 이 지도가 정했다.',
    },
    {
      id: 'agadeem-crypt-canyon',
      location: 'crypt-of-agadeem',
      label: 'Crypt of Agadeem이 깃든 협곡',
      kind: 'gorge',
      width: 4.2,
      line: [[403.4, 1576], [407, 1568.8], [408.2, 1561.6], [405.8, 1554.4]],
      basis: `${PG_ONDU}: 'Nestled into the canyons on the island of Agadeem is the Crypt of Agadeem'`,
      estimate: 'Crypt가 협곡 속에 있다는 것(공식)에 따라, 큰 협곡에서 갈라져 팬 지도 Crypt 점 동쪽을 지나는 짧은 협곡 하나를 이 지도가 골랐다.',
    },
    {
      id: 'jwar-cliffs',
      location: 'jwar-isle',
      label: '돌 절벽',
      kind: 'cliff',
      // 서→동 — 빗금은 남쪽(상륙 해변 쪽)으로. 지역 지도 '좌르 섬' 의 절벽과 같은 자리
      line: [[218.84, 1513.96], [221, 1513], [223.28, 1512.52], [225.56, 1512.28], [227.72, 1512.28]],
      basis: 'Magic Story: Hunger (2020): \'Tarsa sent Anowon ahead, while the rest of the team … worked their way vertically through the stone cliffs.\' / \'The raised rocks from this cliff are nearest together and already cabled.\'',
      estimate: '어느 해안의 절벽인지는 공식 서술이 없다. 하늘거주지와 바위 발판이 절벽 위에서 \'위·북동쪽\'(Hunger)에 있다는 데 맞춰, 지역 지도(좌르 섬)의 해석과 같이 섬 동쪽 만에서 안쪽으로 남쪽을 향해 선 절벽으로 그렸다.',
    },
  ],

  glyphs: [
    // ── 베이인: Crown of Talib — 섬 가운데 화산 고리, 가장 크고 활발한 봉우리가 발라쿠트 ──
    {
      id: 'valakut-volcano',
      label: '발라쿠트 화산',
      kind: 'volcano',
      at: [551, 1570],
      size: 1,
      location: 'valakut',
      basis: `${PG_ONDU}: 'The Crown range is home to a number of volcanoes, including Valakut, the Molten Pinnacle, largest and most active peak of the Crown range.'`,
    },
    ...(
      [
        ['crown-of-talib-nw', [535.4, 1574.8]],
        ['crown-of-talib-w', [530.6, 1584.4]],
        ['crown-of-talib-sw', [534.2, 1592.8]],
        ['crown-of-talib-s', [546.2, 1591.6]],
        ['crown-of-talib-se', [559.4, 1590.4]],
        ['crown-of-talib-e', [563, 1579.6]],
      ] as const
    ).map(([id, at]) => ({
      id,
      kind: 'volcano' as const,
      at,
      size: 0.5,
      location: 'beyeen',
      label: '왕관 고리의 화산',
      basis: `${PG_ONDU}: 'A ring of jagged, volcanic peaks rises from the center of the island, resembling a monarch's crown. … The Crown range is home to a number of volcanoes'`,
      estimate: '고리가 섬 가운데에 있다는 것(공식)과 팬 지도의 발라쿠트 자리에 맞춰, 발라쿠트를 이어 섬 가운데를 두르는 봉우리 여섯을 이 지도가 골랐다.',
    })),
    {
      id: 'beyeen-piston-crag',
      location: 'beyeen',
      label: '피스톤 바위산',
      kind: 'floating-rock',
      at: [573.8, 1577.2],
      size: 0.5,
      basis: `${PG_ONDU}: 'Other, smaller crags on Beyeen … hover in midair above the craggy mesas beneath … now these "piston" mountains fly up and smash down again unpredictably.'`,
      estimate: '공식 자료는 고리 산 밖의 \'다른 작은 바위산\'이라고만 한다. 이 지도는 고리 동쪽, 줄라포트 북쪽의 곶에 하나를 두었다.',
    },
    // ── 베이인: Boilbasin — 서쪽 산비탈을 계단처럼 내려가 바다에 닿는 김 나는 조수 웅덩이 ──
    ...(
      [
        ['boilbasin-pool-upper', [515, 1577.2], 0.5],
        ['boilbasin-pool-middle', [501.8, 1582], 0.45],
        ['boilbasin-pool-lower', [494.6, 1585.6], 0.4],
      ] as const
    ).map(([id, at, size]) => ({
      id,
      kind: 'geyser' as const,
      at,
      size,
      location: 'boilbasin',
      label: '김 나는 조수 웅덩이',
      basis: `${PG_ONDU}: 'Near the western coast of the isle of Beyeen is a group of massive tide pools that stair-step down the mountainous slope toward the sea. … creating basins that seethe with steam.' — 'the second or third pool up from the sea … a hazy, sulfurous lagoon that must have been the springs' source'`,
      estimate: '서해안(공식)의 Boilbasin 점에서 서쪽 끝 바다까지 웅덩이가 계단처럼 내려가도록, 웅덩이 셋의 자리를 이 지도가 골랐다.',
    })),
    // ── 좌르: 섬 가운데의 바닷물 찬 깊은 구덩이 (Strand 의 근원) ──
    {
      id: 'jwar-strand-pit',
      location: 'jwar-isle',
      label: '바닷물 찬 깊은 구덩이',
      kind: 'pit',
      at: [215, 1513.6],
      size: 0.45,
      basis: `${PG_ONDU}: 'a streak of bluish light radiates skyward from the center of Jwar. The phenomenon originates from a deep, seawater-filled pit on the island' / Hunger (2020): 'the faint blue glow of the Strand further off to the island's center'`,
    },
  ],

  sea: [
    // ── 좌르를 늘 에워싸는 소용돌이 해류 ──
    ...(
      [
        ['jwar-currents-n', [209, 1487.2]],
        ['jwar-currents-e', [252.2, 1514.8]],
        ['jwar-currents-s', [236.6, 1547.2]],
        ['jwar-currents-w', [175.4, 1512.4]],
      ] as const
    ).map(([id, at]) => ({
      id,
      kind: 'whirl' as const,
      at,
      extent: [7.2, 4.8] as const,
      location: 'jwar-isle',
      label: '섬을 에워싼 소용돌이 해류',
      basis: `${PG_ONDU}: 'Jwar has largely been written off by explorers due to the swirling Silundi Sea currents and territorial sea serpents that constantly encircle it'`,
    })),
    {
      id: 'serpents-maw-storms',
      label: '폭풍 치는 바다',
      kind: 'rough',
      at: [748, 1472],
      extent: [72, 38.4],
      location: 'serpents-maw',
      basis: `${PG_ONDU}: 'skirting the storms of Serpent's Maw' (Golden Manta 선장 Bara Mkede) / Magic Story: Hunger (2020): 'as they traversed the eager winds of the Serpent's Maw'`,
      estimate: 'Serpent\'s Maw 의 자리는 공식 서술이 없어 장소 데이터의 추정 자리(니마나에서 좌르 섬으로 가는 뱃길이 지날 만한 온두와 무라사 사이 바다)를 따랐고, 그 범위 안쪽에 거친 물결을 그렸다.',
    },
  ],
}
