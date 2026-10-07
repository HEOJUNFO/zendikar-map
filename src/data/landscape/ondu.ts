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
        [486, 1012], [522, 1000], [560, 1004], [596, 1016], [628, 1034], [654, 1046], [650, 1066], [624, 1080], [596, 1100],
        [572, 1124], [548, 1142], [522, 1150], [496, 1146], [476, 1128], [470, 1100], [474, 1060], [478, 1034],
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
        [409, 1002], [398, 1003], [389, 1008], [380, 1013], [377, 1020], [378, 1028], [381, 1035], [389, 1040], [398, 1045],
        [409, 1046], [420, 1043], [430, 1041], [438, 1035], [440, 1028], [441, 1020], [438, 1013], [429, 1008], [420, 1004],
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
        [408, 1016], [401, 1017], [397, 1021], [394, 1025], [397, 1029], [401, 1033],
        [408, 1034], [414, 1032], [420, 1030], [421, 1025], [420, 1021], [414, 1018],
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
        [300, 1488], [306, 1474], [316, 1458], [324, 1440], [334, 1434], [340, 1446], [348, 1450], [358, 1462],
        [368, 1466], [382, 1466], [384, 1482], [378, 1494], [366, 1495], [358, 1496], [350, 1496], [342, 1494],
        [334, 1493], [326, 1490], [318, 1488], [310, 1487],
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
      at: [470, 1505],
      extent: [8, 6],
      basis: `${PG_ONDU}: 'A ring of jagged, volcanic peaks rises from the center of the island, resembling a monarch's crown.'`,
      estimate: '공식 자료는 고리 안쪽을 서술하지 않는다. 봉우리가 왕관 같은 고리로 읽히도록 이 지도가 고리 안쪽에는 기호를 두지 않았다.',
    },
    {
      id: 'beyeen-rainforest',
      location: 'beyeen',
      label: '저지대 온대 우림',
      kind: 'forest',
      ring: [
        [449, 1514], [460, 1517], [471, 1518], [481, 1517], [487, 1512], [490, 1507], [497, 1505], [505, 1505],
        [512, 1508], [511, 1514], [503, 1517], [499, 1523], [488, 1524], [476, 1523], [462, 1523], [449, 1522],
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
        [440, 990], [442, 979], [443, 967], [440, 955], [449, 946], [453, 935], [454, 923], [453, 911], [458, 901],
        [465, 891], [467, 880],
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
        [320, 1012], [308, 1010], [296, 1011], [283, 1013], [272, 1005], [260, 1003], [247, 1003], [234, 1007],
        [223, 1002], [211, 998], [199, 996], [186, 1001], [174, 1001], [162, 995], [150, 991], [137, 993],
        [125, 995], [113, 993],
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
        [298, 924], [292, 934], [288, 945], [277, 951], [271, 961], [268, 972], [263, 983], [256, 992], [252, 1003],
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
        [690, 1046], [677, 1044], [666, 1048], [654, 1052], [646, 1065], [635, 1068], [619, 1063], [608, 1067],
        [595, 1070], [588, 1082], [583, 1097], [571, 1100], [560, 1105], [546, 1107], [533, 1112], [533, 1128],
        [529, 1140], [524, 1151], [518, 1160], [506, 1168], [505, 1181],
      ],
      width: 1.7,
      basis: '카드 Prairie Stream(BFZ #241) 플레이버: \'The continent of Ondu is a vast plateau crisscrossed by deep trenches and meandering rivers.\'',
      estimate: '공식 자료는 대륙 수준에서 \'고원을 가로지르는 굽이치는 강\'이라고만 한다. 물길은 이 지도가 골라, 협곡이 끝나는 동쪽 고원에서 굽이쳐 남동 해안의 긴 만 안쪽 끝으로 흘려보냈다.',
    },
    {
      id: 'ondu-west-plateau-river',
      label: '고원의 굽이치는 강',
      course: [
        [396, 1148], [384, 1151], [373, 1157], [361, 1163], [348, 1155], [335, 1150], [323, 1154], [311, 1156],
        [300, 1166], [288, 1173], [275, 1165], [263, 1162], [250, 1159], [238, 1157], [226, 1170], [214, 1175],
        [202, 1172], [190, 1171], [177, 1161], [165, 1162], [153, 1167],
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
        [409, 998], [397, 998], [388, 1004], [378, 1008], [373, 1016], [373, 1024], [373, 1032], [380, 1039], [386, 1046], [398, 1049],
        [409, 1049], [421, 1049], [432, 1046], [438, 1039], [445, 1032], [448, 1024], [443, 1016], [439, 1009], [431, 1002], [420, 1000],
      ],
      basis: `${PG_ONDU}: 'a real site on a high mesa of Ondu has been dubbed the Prison of Omnath' / 'the top of a soaring Onduan mesa'`,
      estimate: '메사의 자리는 팬 지도의 Prison of Omnath 점을 따랐고, 둘레와 크기는 이 지도가 정했다 — 꼭대기의 숲과 한가운데 늪이 장소 표시 둘레에 보이도록 넉넉히(동서 약 75, 남북 약 50 단위) 잡았다.',
    },
    {
      id: 'agadeem-ravine',
      location: 'agadeem',
      label: '헤드론 들판과 습지 사이의 깊은 협곡',
      kind: 'gorge',
      width: 5,
      line: [[304, 1491], [312, 1490], [320, 1492], [328, 1495], [336, 1497], [344, 1499], [352, 1500], [360, 1499], [366, 1497]],
      basis: `${JAVAD}: 'Tomorrow we journey into the deep ravine that separates the hedron fields from the marshlands' / 'the slimy cliffs of the ravine'`,
      estimate: '헤드론 들판과 습지 사이(공식)라 팬 지도의 카비라·헤드론 들판과 Crypt of Agadeem 사이에 두었고, 동서로 뻗은 길이와 물길은 이 지도가 정했다.',
    },
    {
      id: 'agadeem-crypt-canyon',
      location: 'crypt-of-agadeem',
      label: 'Crypt of Agadeem이 깃든 협곡',
      kind: 'gorge',
      width: 3.5,
      line: [[352, 1500], [355, 1494], [356, 1488], [354, 1482]],
      basis: `${PG_ONDU}: 'Nestled into the canyons on the island of Agadeem is the Crypt of Agadeem'`,
      estimate: 'Crypt가 협곡 속에 있다는 것(공식)에 따라, 큰 협곡에서 갈라져 팬 지도 Crypt 점 동쪽을 지나는 짧은 협곡 하나를 이 지도가 골랐다.',
    },
    {
      id: 'jwar-cliffs',
      location: 'jwar-isle',
      label: '돌 절벽',
      kind: 'cliff',
      // 서→동 — 빗금은 남쪽(상륙 해변 쪽)으로. 지역 지도 '좌르 섬' 의 절벽과 같은 자리
      line: [[198.2, 1448.3], [200, 1447.5], [201.9, 1447.1], [203.8, 1446.9], [205.6, 1446.9]],
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
      at: [475, 1495],
      size: 1,
      location: 'valakut',
      basis: `${PG_ONDU}: 'The Crown range is home to a number of volcanoes, including Valakut, the Molten Pinnacle, largest and most active peak of the Crown range.'`,
    },
    ...(
      [
        ['crown-of-talib-nw', [462, 1499]],
        ['crown-of-talib-w', [458, 1507]],
        ['crown-of-talib-sw', [461, 1514]],
        ['crown-of-talib-s', [471, 1513]],
        ['crown-of-talib-se', [482, 1512]],
        ['crown-of-talib-e', [485, 1503]],
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
      at: [494, 1501],
      size: 0.5,
      basis: `${PG_ONDU}: 'Other, smaller crags on Beyeen … hover in midair above the craggy mesas beneath … now these "piston" mountains fly up and smash down again unpredictably.'`,
      estimate: '공식 자료는 고리 산 밖의 \'다른 작은 바위산\'이라고만 한다. 이 지도는 고리 동쪽, 줄라포트 북쪽의 곶에 하나를 두었다.',
    },
    // ── 베이인: Boilbasin — 서쪽 산비탈을 계단처럼 내려가 바다에 닿는 김 나는 조수 웅덩이 ──
    ...(
      [
        ['boilbasin-pool-upper', [445, 1501], 0.5],
        ['boilbasin-pool-middle', [434, 1505], 0.45],
        ['boilbasin-pool-lower', [428, 1508], 0.4],
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
      at: [195, 1448],
      size: 0.45,
      basis: `${PG_ONDU}: 'a streak of bluish light radiates skyward from the center of Jwar. The phenomenon originates from a deep, seawater-filled pit on the island' / Hunger (2020): 'the faint blue glow of the Strand further off to the island's center'`,
    },
  ],

  sea: [
    // ── 좌르를 늘 에워싸는 소용돌이 해류 ──
    ...(
      [
        ['jwar-currents-n', [190, 1426]],
        ['jwar-currents-e', [226, 1449]],
        ['jwar-currents-s', [213, 1476]],
        ['jwar-currents-w', [162, 1447]],
      ] as const
    ).map(([id, at]) => ({
      id,
      kind: 'whirl' as const,
      at,
      extent: [6, 4] as const,
      location: 'jwar-isle',
      label: '섬을 에워싼 소용돌이 해류',
      basis: `${PG_ONDU}: 'Jwar has largely been written off by explorers due to the swirling Silundi Sea currents and territorial sea serpents that constantly encircle it'`,
    })),
    {
      id: 'serpents-maw-storms',
      label: '폭풍 치는 바다',
      kind: 'rough',
      at: [770, 1400],
      extent: [60, 32],
      location: 'serpents-maw',
      basis: `${PG_ONDU}: 'skirting the storms of Serpent's Maw' (Golden Manta 선장 Bara Mkede) / Magic Story: Hunger (2020): 'as they traversed the eager winds of the Serpent's Maw'`,
      estimate: 'Serpent\'s Maw 의 자리는 공식 서술이 없어 장소 데이터의 추정 자리(니마나에서 좌르 섬으로 가는 뱃길이 지날 만한 온두와 무라사 사이 바다)를 따랐고, 그 범위 안쪽에 거친 물결을 그렸다.',
    },
  ],
}
