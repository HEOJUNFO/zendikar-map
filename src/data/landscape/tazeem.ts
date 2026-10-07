// 바탕 지형 — tazeem. 모양·규칙은 src/data/types.ts 의 Landscape
// 타짐은 2020 무렵(ZNR) 모습: 섬을 두른 Bulwark 고리 산맥(relief.ring) 안쪽에 오란리프 숲과 내해 할리마르가 있고,
// 우마라 강이 북쪽 고지에서 협곡을 지나 할리마르로 떨어진다. 장소 자리(우마라 협곡의 정착지들)는 locations.ts 를 따른다.
import type { Landscape } from '../types'

const PG_TAZEEM = '2009 가이드(A Planeswalker\'s Guide to Zendikar: Tazeem and Merfolk, 2009-12-02)'

// 할리마르 절벽 — 한 기슭을 강 어귀마다 끊어 여러 줄로 긋는다. 줄은 시계 방향(물이 오른쪽)
const HALIMAR_CLIFFS_BASIS = `${PG_TAZEEM} 'Halimar, the Inland Sea': 'Surrounded on three sides by rocky cliffs, the fourth side is enclosed by an ancient Sea Gate.' 바다 관문 쪽은 The Liberation of Sea Gate(2015): 'The Halimar side was a gentle slope down to a quiet beach'.`
const HALIMAR_CLIFFS_ESTIMATE =
  '세 면이 바위 절벽이라는 것만 공식 자료에 있다. 바다 관문 쪽 — 댐과 그리로 좁아지는 땅으로, 할리마르 쪽은 완만한 비탈과 해변이다 — 은 비우고, 북쪽 기슭은 우마라 강 어귀부터 바다 관문에서 약 80단위 떨어진 곳까지, 남쪽 기슭은 남쪽에서 흘러드는 강의 어귀부터 서쪽으로 그었다. 북쪽 기슭의 그 동쪽은 이 지도가 낮은 언덕으로 그린 바다 관문 가까이의 낮은 Bulwark 아래라 비웠다 — Slaughter at the Refuge(2015)는 그 낮은 능선에서 \'the land sloped gradually down to the Halimar\'라고 한다. 그 경계와, 강이 흘러드는 어귀에서 절벽을 끊은 자리는 이 지도가 골랐다.'

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
  '얼마나 낮은지, 어디까지인지는 공식 자료에 없다. 이 지도가 바다 관문 양쪽, 댐에서 약 35~145단위 떨어진 Bulwark 띠를 산 대신 낮은 언덕으로 그렸다. 댐 바로 곁의 좁은 땅은 할리마르 쪽이 완만한 비탈과 해변, 대양 쪽이 절벽(The Liberation of Sea Gate)이라 비운다.'

const SEA_GATE_CLIFFS_BASIS =
  'The Liberation of Sea Gate(2015): \'The land that divided the Halimar Sea from the ocean outside narrowed quickly until it met the huge white dam of Sea Gate… The Halimar side was a gentle slope down to a quiet beach; while cliffs on the other side stretched down to the churning ocean below.\' Slaughter at the Refuge(2015)도 바다 관문 가까운 Bulwark 능선에서 \'a much sharper slope led down to the ocean\'이라고 한다.'
const SEA_GATE_CLIFFS_ESTIMATE =
  '이야기는 댐으로 좁아지는 땅의 대양 쪽이 절벽이라고만 하고, 어느 쪽 어깨인지와 길이는 밝히지 않는다. 이 지도가 댐 양쪽 어깨에서 할리마르와 대양 사이 땅이 좁아지는 구간의 대양 쪽에 그었다 — 북쪽 어깨는 댐에서 약 15~40단위, 남쪽 어깨는 약 15~65단위. 남쪽 어깨의 끝은 이 지도가 그린 낮은 Bulwark 곁까지 이어지는데, Slaughter at the Refuge가 그 능선에서 대양 쪽을 \'a much sharper slope\'이라고 하기 때문이다.'

export const landscape: Landscape = {
  // 뒤의 영역이 앞의 영역을 덮는다 — 북부 Bulwark 산 → 하늘폭포 아래 정글 → 협곡 북쪽 언덕 → 협곡 위 평원 순
  areas: [
    // 하다 북부 표시 둘레는 산을 놓지 않아 띠가 둘로 끊긴다 — 조각마다 따로 채우게 두 영역으로 나눈다.
    // 북쪽 가장자리는 해안선 바로 안쪽 (해안에서 14단위 안에는 원래 산을 놓지 않는다)
    {
      id: 'bulwark-north-heights-west',
      label: '섬 북쪽 끝의 높은 Bulwark',
      kind: 'mountain',
      ring: [[1132, 774], [1142, 778], [1150, 781], [1160, 774], [1170, 769], [1180, 755], [1190, 759], [1204, 758], [1204, 792], [1198, 792], [1186, 793], [1174, 795], [1160, 796], [1146, 796], [1132, 795]],
      basis: BULWARK_NORTH_BASIS,
      estimate: BULWARK_NORTH_ESTIMATE,
      location: 'the-bulwark',
    },
    {
      id: 'bulwark-north-heights-east',
      label: '섬 북쪽 끝의 높은 Bulwark',
      kind: 'mountain',
      ring: [[1204, 758], [1212, 753], [1220, 751], [1230, 759], [1240, 770], [1250, 782], [1260, 783], [1264, 792], [1250, 796], [1238, 794], [1226, 792], [1212, 792], [1204, 792]],
      basis: BULWARK_NORTH_BASIS,
      estimate: BULWARK_NORTH_ESTIMATE,
      location: 'the-bulwark',
    },
    {
      id: 'umara-skyfalls-jungle',
      label: '하늘폭포 아래 정글',
      kind: 'forest',
      ring: [[1186, 798], [1178, 797], [1170, 798], [1162, 800], [1156, 805], [1157, 813], [1161, 820], [1168, 826], [1176, 829], [1184, 827], [1190, 821], [1192, 813], [1192, 805]],
      basis: 'Umara Skyfalls(ZNR #86, 2020) 플레이버: \'The source of the Umara River sits high above Oran-Rief, ever weeping on the jungle below.\'',
      estimate: '정글의 범위는 공식 자료에 없다. 이 지도가 하늘폭포의 자리(이 지도의 추정) 아래, 북쪽 Bulwark 산줄기 바로 남쪽을 정글로 그렸다. Bulwark 띠의 안쪽 가장자리라 원래 산만 그려지던 곳이다.',
    },
    {
      id: 'umara-gorge-foothills',
      label: '협곡 북쪽의 낮은 언덕',
      kind: 'hills',
      ring: [[1246, 796], [1238, 793], [1226, 791], [1212, 791], [1200, 791], [1189, 792], [1184, 797], [1190, 801], [1200, 801], [1212, 801], [1224, 801], [1236, 802], [1246, 801]],
      basis: 'Red Route(2020): 마고시 폭포 위 협곡 둔덕에서 본 풍경 — \'The plains atop the gorge stretched to the horizon, split only by jagged, spear-blade mountains rising in the distant north, where the planes gave way to low foothills and, eventually, the bruised darkness of the Bulwark.\'',
      estimate: '언덕의 자리와 폭은 공식 자료에 없다. 이 지도는 이야기의 순서 — 협곡 위 평원, 낮은 언덕, 그 너머 Bulwark — 를 지키되, 협곡과 북쪽 해안 사이가 40단위 남짓이라 그 순서를 좁게 줄여 평원과 북쪽 Bulwark 산줄기 사이에 얇은 언덕 띠로 그렸다. 이 해안선에서는 할리마르가 북쪽 해안 가까이 있어 Bulwark가 \'먼 북쪽\'에 있다는 거리는 나타내지 못한다.',
    },
    {
      id: 'umara-gorge-rim-plains',
      label: '우마라 협곡 위 평원',
      kind: 'plain',
      ring: [[1200, 801], [1194, 803], [1195, 810], [1191, 816], [1192, 824], [1196, 831], [1194, 838], [1199, 844], [1206, 847], [1214, 849], [1221, 846], [1226, 841], [1233, 840], [1240, 836], [1247, 834], [1251, 828], [1256, 822], [1254, 814], [1258, 807], [1252, 803], [1244, 802], [1236, 802], [1228, 801], [1220, 801], [1212, 801], [1205, 801]],
      basis: 'Red Route(2020): \'The plains atop the gorge stretched to the horizon…\' — 아키리 일행이 마고시 계단을 올라 \'atop the high rim of the gorge\'에서 야영하며 본 협곡 위의 평원.',
      estimate: '평원의 범위는 공식 자료에 없다. 이 지도가 그은 우마라 협곡 양쪽 둔덕을, 하늘폭포 밑에서 마고시 폭포까지의 위 협곡을 중심으로 폭포 조금 아래까지 평원으로 그렸다(Bulwark 띠의 산을 걷어 냄). 이야기에서 평원은 마고시 육로에서 이틀 가까이 더 올라간 둔덕에서 보이지만, 이 지도의 위 협곡은 40단위 남짓이라 그 거리는 나타내지 못한다. 하늘폭포 아래 정글과 협곡 아래쪽(산호투구 쪽)의 오란리프 숲은 남겼다.',
    },
    {
      id: 'bulwark-low-near-sea-gate-south',
      label: '바다 관문 가까이의 낮은 Bulwark',
      kind: 'hills',
      ring: [[1359, 893], [1355, 901], [1356, 910], [1359, 919], [1358, 928], [1359, 938], [1351, 942], [1349, 949], [1355, 956], [1362, 962], [1369, 968], [1377, 973], [1385, 978], [1393, 982], [1402, 986], [1410, 989], [1414, 984], [1411, 975], [1404, 969], [1397, 962], [1393, 954], [1387, 946], [1383, 938], [1382, 929], [1380, 920], [1379, 911], [1375, 902], [1367, 897]],
      basis: BULWARK_LOW_BASIS,
      estimate: BULWARK_LOW_ESTIMATE,
      location: 'the-bulwark',
    },
    {
      id: 'bulwark-low-near-sea-gate-north',
      label: '바다 관문 가까이의 낮은 Bulwark',
      kind: 'hills',
      ring: [[1279, 797], [1276, 805], [1275, 813], [1275, 822], [1278, 831], [1282, 838], [1290, 837], [1299, 834], [1307, 833], [1314, 827], [1314, 819], [1308, 812], [1304, 805], [1297, 799], [1288, 799]],
      basis: BULWARK_LOW_BASIS,
      estimate: BULWARK_LOW_ESTIMATE,
      location: 'the-bulwark',
    },
    {
      id: 'tazeem-southern-grassland',
      label: '타짐 남부의 헤드론 초원',
      kind: 'plain',
      ring: [[1212, 1042], [1222, 1048], [1232, 1053], [1242, 1057], [1254, 1058], [1266, 1057], [1278, 1054], [1288, 1053], [1295, 1060], [1301, 1068], [1300, 1076], [1292, 1081], [1281, 1084], [1268, 1086], [1256, 1086], [1244, 1085], [1232, 1082], [1222, 1077], [1215, 1069], [1211, 1060], [1210, 1050]],
      basis: 'The Look of an Awakening World(Savor the Flavor, 2010): \'a hedron-laden grassland in southern Tazeem\'; Booster Quest: The Shaman\'s Orb(2010): \'the southern hedron-fields of Tazeem\'.',
      estimate: '\'타짐 남부\'라고만 해 자리와 범위는 이 지도가 골랐다 — 오란리프 숲 남쪽 끝(팬 지도 숲 가장자리) 바로 바깥에서 남쪽 Bulwark까지. 두 글은 2010년의 것으로, 지각판 하나가 그 일대를 가로지르고(칼럼) 땅에 묻혀 있던 헤드론들이 떠올라 모였다고(Booster Quest) 하며, 2020년 이후의 모습은 서술되지 않았다. 떠오른 헤드론은 타짐 하늘의 헤드론 무리가 그린다.',
    },
  ],
  rivers: [
    {
      id: 'umara-river',
      label: '우마라 강',
      // 하늘폭포 밑 → 마고시 육로 곁 → 마고시 폭포 → 우렌 동굴·티칼 정박지 곁 → Merfolk Enclave(강 위) → 할리마르 서쪽 끝
      course: [[1190, 806], [1196, 806], [1202, 806], [1207, 808], [1209, 813], [1212, 819], [1212, 826], [1209, 832], [1207, 838], [1209, 845], [1213, 850], [1215, 856], [1213, 863], [1212, 869], [1213, 876], [1218, 880], [1225, 882], [1232, 881]],
      width: 2.4,
      basis: `${PG_TAZEEM}: 'a great white-water river that bisects the continent' — 'runs through a deep gorge and drops over 800 feet over a series of waterfalls'. 아트북(The Art of Magic: Zendikar, 2016): Bulwark가 가장 높은 섬 북쪽 끝 둘레의 고지에서 발원해 할리마르로 떨어진다. Red Route(2020): 협곡 길은 '바다 관문이 건너편에 선 할리마르의 먼 기슭'에서 시작한다. Umara Skyfalls(ZNR, 2020): 'The source of the Umara River sits high above Oran-Rief'.`,
      estimate: '공식 자료가 밝힌 것은 두 끝 — 북쪽 고지의 발원(하늘폭포)과 바다 관문 맞은편 할리마르 서쪽 끝의 어귀 — 과 그 사이의 순서(할리마르 ← 산호투구 ← 마고시 폭포 ← 위 협곡)뿐이라, 그 사이 물길은 이 지도가 그 순서대로 놓인 장소들을 따라 그었다. 흐름 방향은 2016 아트북·2020 이야기를 따랐다(2009 가이드는 반대로 읽힌다). 이 해안선에서는 할리마르가 북동쪽에 있어 \'대륙을 가로지르는\' 길이는 나타내지 못했다.',
      location: 'umara-river',
    },
    {
      id: 'umara-west-tributary',
      label: '우마라 강의 지류',
      course: [[1092, 861], [1100, 866], [1109, 865], [1118, 862], [1127, 866], [1136, 867], [1145, 863], [1154, 867], [1163, 868], [1172, 864], [1180, 860], [1189, 856], [1198, 852], [1209, 845]],
      width: 1.1,
      tributaryOf: 'umara-river',
      basis: `${PG_TAZEEM}: 'Hundreds of tributaries branch out from Umara and wind through the Oran-Rief, and these smaller rivers tend to be less tumultuous than the Umara.'`,
      estimate: '지류의 수와 물길은 공식 자료에 없다. 이 지도가 그 가운데 하나만, 서쪽 Bulwark 안쪽 기슭에서 오란리프를 굽이쳐 지나 마고시 폭포 아래 협곡에서 우마라 강에 합류하게 그었다. 2009 가이드는 우마라가 할리마르에서 북쪽으로 흐른다고 읽혀 지류가 \'갈라져 나간다\'고 하지만, 이 지도는 2016·2020 자료의 흐름을 따라 본류로 흘러드는 물길로 그렸다.',
    },
    {
      id: 'halimar-west-river',
      label: '할리마르로 흘러드는 강',
      course: [[1150, 946], [1159, 940], [1167, 935], [1175, 929], [1184, 923], [1192, 916], [1200, 911], [1210, 907], [1220, 905], [1230, 903], [1240, 902], [1250, 902]],
      width: 1.3,
      basis: MANY_RIVERS_BASIS,
      estimate: '할리마르로 흘러드는 강이 여럿이라는 것만 공식 자료에 있고, 강의 수·이름·물길은 없다. 이 지도가 우마라 강 말고 두 줄기를 골라, 그 하나를 서쪽 오란리프에서 할리마르 남서쪽 기슭으로 흘러들게 그었다. 이름은 붙이지 않는다.',
    },
    {
      id: 'halimar-south-river',
      label: '할리마르로 흘러드는 강',
      course: [[1280, 1084], [1284, 1075], [1289, 1066], [1289, 1057], [1285, 1048], [1289, 1039], [1294, 1031], [1298, 1022], [1294, 1013], [1297, 1004], [1302, 996], [1305, 987], [1306, 977], [1309, 967], [1311, 958]],
      width: 1.5,
      basis: `${MANY_RIVERS_BASIS} ${MEANDERING_BASIS}`,
      estimate: '할리마르로 흘러드는 강이 여럿이라는 것만 공식 자료에 있고, 강의 수·이름·물길은 없다. 이 지도가 우마라 강 말고 두 줄기를 골라, 그 하나를 남쪽 Bulwark 안쪽 기슭에서 남쪽 초원과 오란리프를 지나 할리마르 남쪽 기슭으로 흘러들게 그었다. \'여러 갈래로 갈라져 할리마르로 흐르는 강\'(Meandering River)은 이 줄기의 가운데 구간에 갈래 물길로 나타냈다. 카드 이름은 지명이 아니라 이름을 붙이지 않는다.',
    },
    // 갈래 물길 — 본류에서 갈라졌다가 다시 본류로 돌아온다 (첫 점·끝 점 모두 본류 위)
    {
      id: 'halimar-south-river-east-channel',
      label: '여러 갈래로 갈라지는 물길',
      course: [[1289, 1057], [1294, 1054], [1298, 1050], [1300, 1044], [1302, 1039], [1301, 1033], [1300, 1028], [1298, 1022]],
      width: 0.9,
      tributaryOf: 'halimar-south-river',
      basis: MEANDERING_BASIS,
      estimate: '갈래의 수와 자리는 공식 자료에 없어 이 지도가 남쪽 강의 가운데 구간에 두 갈래를 골라 그었다.',
    },
    {
      id: 'halimar-south-river-west-channel',
      label: '여러 갈래로 갈라지는 물길',
      course: [[1294, 1013], [1290, 1008], [1288, 1002], [1289, 996], [1293, 991], [1299, 989], [1305, 987]],
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
      line: [[1196, 806], [1202, 806], [1207, 808], [1209, 813], [1212, 819], [1212, 826], [1209, 832], [1207, 838], [1209, 845], [1213, 850], [1215, 856], [1213, 863], [1212, 869], [1213, 876], [1218, 880]],
      width: 10,
      basis: `Red Route(2020): 'the Umara River Gorge, a long, stable, well-textured valley carved over millennia by the Umara River. With sheer walls plunging hundreds of feet from rim to river' — 'the stratified crimson-and-umber walls of the gorge'. ${PG_TAZEEM}: 'runs through a deep gorge'.`,
      estimate: '협곡은 이 지도가 그은 우마라 강 물길을 따라, 하늘폭포 밑에서 할리마르 어귀까지 그었다. 물길을 고른 까닭은 우마라 강에 적었다.',
      location: 'umara-river',
    },
    {
      id: 'halimar-cliffs-north',
      label: '할리마르를 두른 바위 절벽',
      kind: 'cliff',
      line: [[1234, 874], [1239, 872], [1242, 868], [1244, 864], [1245, 857], [1250, 853], [1251, 849], [1250, 845], [1252, 841], [1259, 839], [1265, 840], [1269, 839]],
      basis: HALIMAR_CLIFFS_BASIS,
      estimate: HALIMAR_CLIFFS_ESTIMATE,
    },
    {
      id: 'halimar-cliffs-south',
      label: '할리마르를 두른 바위 절벽',
      kind: 'cliff',
      line: [[1303, 957], [1299, 953], [1296, 951], [1293, 952], [1286, 952], [1282, 948], [1278, 948], [1272, 949], [1265, 948], [1259, 942], [1259, 936], [1258, 931], [1255, 926], [1253, 921], [1250, 917], [1245, 914]],
      basis: HALIMAR_CLIFFS_BASIS,
      estimate: HALIMAR_CLIFFS_ESTIMATE,
    },
    // 바다 관문 댐 양쪽 어깨의 대양 쪽 절벽 — 줄은 대양이 오른쪽이 되게 댐에서 멀어지거나 다가간다
    {
      id: 'sea-gate-ocean-cliffs-south',
      label: '바다 관문 대양 쪽 절벽',
      kind: 'cliff',
      line: [[1397, 900], [1395, 895], [1394, 891], [1392, 887], [1390, 884], [1387, 884], [1382, 882], [1378, 880], [1374, 877], [1369, 874], [1366, 870], [1364, 867], [1360, 865]],
      basis: SEA_GATE_CLIFFS_BASIS,
      estimate: SEA_GATE_CLIFFS_ESTIMATE,
    },
    {
      id: 'sea-gate-ocean-cliffs-north',
      label: '바다 관문 대양 쪽 절벽',
      kind: 'cliff',
      line: [[1340, 847], [1339, 843], [1337, 838], [1335, 833], [1335, 828], [1336, 823], [1337, 819]],
      basis: SEA_GATE_CLIFFS_BASIS,
      estimate: SEA_GATE_CLIFFS_ESTIMATE,
    },
  ],
  glyphs: [
    {
      id: 'umara-skyfalls-veil',
      label: '우마라 하늘폭포',
      kind: 'waterfall',
      at: [1190, 801],
      angle: 0,
      basis: 'Umara Skyfalls(ZNR #86, 2020) 플레이버: \'The source of the Umara River sits high above Oran-Rief, ever weeping on the jungle below.\'',
      estimate: '자리는 장소 표시(이 지도의 추정) 곁을 따랐다. 물이 무엇에서 떨어지는지는 공식 자료에 없어, 하늘에서 떨어지는 물줄기만 그린다.',
      location: 'umara-skyfalls',
    },
    {
      id: 'magosi-falls-drop',
      label: '마고시 폭포',
      kind: 'waterfall',
      at: [1207, 838],
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
      at: [1185, 841],
      basis: `${PG_TAZEEM}, Piqua(타짐 탐험 가문)의 말: 현자들은 Ruins of Ysterid가 'lie at the bottom of deep cave near Magosi Falls'인 줄 안다 — 'The pit will poison you, boil you, and regurgitate your body up to the surface'.`,
      estimate: '유적의 자리(이 지도의 추정) 곁에 그 수직 동굴을 그렸다.',
      location: 'ruins-of-ysterid',
    },
    {
      id: 'tazeem-pit-cave-west',
      label: '수직 동굴',
      kind: 'pit',
      at: [1160, 890],
      basis: PIT_CAVES_BASIS,
      estimate: PIT_CAVES_ESTIMATE,
    },
    {
      id: 'tazeem-pit-cave-east',
      label: '수직 동굴',
      kind: 'pit',
      at: [1345, 1010],
      basis: PIT_CAVES_BASIS,
      estimate: PIT_CAVES_ESTIMATE,
    },
    {
      id: 'tazeem-geyser-pit',
      label: '간헐천인 수직 동굴',
      kind: 'geyser',
      at: [1195, 990],
      basis: PIT_CAVES_BASIS,
      estimate: PIT_CAVES_ESTIMATE,
    },
  ],
}
