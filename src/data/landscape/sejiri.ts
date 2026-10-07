// 바탕 지형 — sejiri. 모양·규칙은 src/data/types.ts 의 Landscape
// 세지리는 지도 위쪽 바깥으로 이어진다(북쪽 = y 작은 쪽). 둘레는 모두 절벽이라 강은 절벽 너머 바다로 떨어뜨리지 않고 북쪽으로 흘려 보낸다.
import type { Landscape } from '../types'

const PG_SEJIRI = 'A Planeswalker\'s Guide to Zendikar: Murasa and Sejiri (2010)'
const PG_2009 = 'A Planeswalker\'s Guide to Zendikar (2009)'

export const landscape: Landscape = {
  areas: [
    // 영구동토 스텝 — Sejiri Steppe 카드 표시 둘레. 대륙 전체의 툰드라 풀포기(continents.ts 의 relief.tundra)는 산 사이에도 깔리고,
    // 이 영역은 그 가운데 산이 없는 트인 스텝 하나를 Sejiri Steppe 카드 표시에 맞춰 보인다
    {
      id: 'sejiri-tundra-steppe',
      kind: 'tundra',
      label: '영구동토 스텝',
      location: 'sejiri-steppe',
      density: 1.3,
      basis:
        `${PG_2009}: 'This polar region is like an enormous mesa with permafrost steppes, wind-blasted mountains, and impossibly tall cliffs that encircle the continent.' ` +
        `${PG_SEJIRI} 'The Tundra Perilous': 'Sejiri is a vast, icy tundra'. 대지 카드 Sejiri Steppe(WWK #142)가 세지리의 스텝을 이름으로 쓴다.`,
      estimate:
        '공식 자료는 세지리에 영구동토 스텝과 바람에 깎인 산이 섞여 있다고만 하고, 어디가 스텝인지, Sejiri Steppe 가 어디인지는 밝히지 않는다. 이 지도가 Sejiri Steppe 카드 표시를 둔 고원 안쪽(장소 패널의 \'추정\')을 산이 없는 트인 스텝으로 감싸고, 그 범위도 이 지도가 정했다.',
      ring: [[1439.4, -14.4], [1509, -16.8], [1581, -12], [1605, 12], [1595.4, 48], [1578.6, 79.2], [1557, 105.6], [1523.4, 136.8], [1487.4, 136.8], [1455, 151.2], [1434.6, 129.6], [1429.8, 93.6], [1434.6, 48]],
    },
    // 세지리 빙하 — 장소 sejiri-glacier 의 범위(extent [70,35]) 안에 빙원을 그린다
    {
      id: 'sejiri-glacier-ice',
      kind: 'ice',
      label: '세지리 빙하의 빙원',
      location: 'sejiri-glacier',
      basis: 'Sejiri Shelter // Sejiri Glacier (ZNR #37, 2020) — 대지 면 이름이 곧 세지리의 빙하다 (\'This place offers nothing and takes everything.\' —Enwor, Sea Gate Expeditionary House).',
      estimate: '공식 자료는 이 빙하가 세지리에 있다는 것만 알려 주고 위치·규모·모양은 말하지 않는다. 이 지도가 고른 장소 자리(세지리 서부의 빈 고원, 장소 패널의 \'추정\')와 범위를 따라, 그 동쪽 산 무리 바로 서쪽의 빈 고원을 메운 빙원으로 그렸다.',
      ring: [[503.4, 48], [522.6, 36], [551.4, 28.8], [580.2, 32.4], [609, 28.8], [637.8, 36], [659.4, 52.8], [657, 74.4], [647.4, 93.6], [625.8, 108], [597, 112.8], [565.8, 108], [537, 110.4], [510.6, 100.8], [496.2, 81.6], [498.6, 64.8]],
    },
  ],
  rivers: [
    // Benthidrix 위를 흐르는 강 — Benthidrix 표시 바로 위를 지나고, 절벽 테 안쪽 고지에서 솟아 북쪽(지도 위쪽 바깥)으로 흐른다
    {
      id: 'sejiri-benthidrix-river',
      label: '벤티드릭스 위를 흐르는 강',
      width: 1.3,
      basis:
        `${PG_SEJIRI} 'The Tundra Perilous': 'Travelers here must contend with brittle ice bridges over rapidly-flowing rivers'; 'Benthidrix': 'If it does [exist], it lies under one of Sejiri's deep riverbeds'.`,
      estimate:
        '공식 자료는 세지리에 빠르게 흐르는 강들이 있고 Benthidrix 가 그 깊은 강바닥 가운데 하나 아래에 있다고만 하며, 강의 이름·수·물길은 밝히지 않는다. 이 지도가 Benthidrix 자리(이 역시 추정) 위로 강 하나를 지나게 했다. 세지리는 둘레 전체를 엄청나게 높은 절벽이 두르고 있어(PG: Murasa and Sejiri, 2010) 남쪽 바다로 떨어지는 폭포를 지어내지 않도록, 절벽 테 바로 안쪽 고지에서 솟아 북쪽, 곧 지도 위쪽 바깥으로 흘러가게 그렸다. 강 위의 얼음다리는 자리를 알 수 없어 그리지 않았다.',
      course: [[1083, 189.6], [1077, 175.2], [1069.8, 160.8], [1065, 146.4], [1057.8, 132], [1059, 117.6], [1051.8, 103.2], [1042.2, 88.8], [1041, 74.4], [1041, 60], [1041, 48], [1037.4, 33.6], [1029, 16.8], [1021.8, 2.4], [1017, -12]],
    },
    {
      id: 'sejiri-benthidrix-river-west',
      label: '벤티드릭스 위를 흐르는 강의 지류',
      tributaryOf: 'sejiri-benthidrix-river',
      width: 1,
      basis: `${PG_SEJIRI} 'The Tundra Perilous': 'brittle ice bridges over rapidly-flowing rivers' — 세지리에는 강이 여럿 있다.`,
      estimate:
        '공식 자료는 세지리에 강이 여럿 있다고만 하고 어디를 흐르는지는 밝히지 않는다. 이 지도가 Benthidrix 위를 흐르는 강에 서남쪽, 절벽 테 안쪽 고지에서 솟아 북동쪽으로 흘러 합치는 지류 하나를 그렸다. 물길은 서쪽 산 무리의 남동쪽 기슭을 지나 산줄기를 가로지르지 않는다.',
      course: [[959.4, 170.4], [965.4, 156], [973.8, 142.8], [982.2, 129.6], [994.2, 118.8], [1007.4, 109.2], [1020.6, 100.8], [1031.4, 94.8], [1042.2, 88.8]],
    },
  ],
  glyphs: [
    // 떠다니는 돌 '항아리' — 얼음과 눈사태를 쏟아낸다
    ...([
      ['sejiri-urn-central', [930.6, 115.2]],
      ['sejiri-urn-ridge', [1283.4, 50.4]],
      ['sejiri-urn-east', [1719, 26.4]],
    ] as const).map(([id, at]) => ({
      id,
      kind: 'urn' as const,
      label: '떠다니는 돌 항아리',
      at,
      size: 1.2,
      basis: `${PG_SEJIRI} 'The Tundra Perilous': 'enormous, floating stone "urns" that spill avalanches of ice and snow across the landscape'.`,
      estimate:
        '공식 자료는 떠다니는 돌 \'항아리\'가 세지리 툰드라 곳곳에 눈사태를 쏟아낸다고만 하고 자리와 수는 밝히지 않는다. 이 지도가 셋을 골라 Benthidrix 서쪽 산 무리 곁, Ikiral 서쪽 고원, Sejiri Steppe 동쪽 산 무리 북쪽 위에 띄웠다. 헤드론이라는 서술은 없어 헤드론으로 그리지 않고, 기울어진 돌 항아리 모양으로 그렸다.',
    })),
  ],
  sea: [
    // 북해의 얼음 — 세지리 양 끝 너머, 지도 위쪽 가장자리의 트인 바다
    ...([
      ['sejiri-sea-ice-west', [[-231, -18], [-87, -18], [69, -18], [215.4, -18], [229.8, 7.2], [246.6, 31.2], [253.8, 48], [220.2, 52.8], [179.4, 45.6], [143.4, 64.8], [107.4, 55.2], [69, 74.4], [35.4, 60], [-3, 67.2], [-41.4, 88.8], [-75, 72], [-115.8, 69.6], [-156.6, 55.2], [-195, 62.4], [-231, 48]]],
      ['sejiri-sea-ice-east', [[2200.2, -18], [2409, -18], [2649, -18], [2649, 40.8], [2610.6, 52.8], [2572.2, 45.6], [2529, 67.2], [2490.6, 55.2], [2447.4, 62.4], [2404.2, 84], [2370.6, 64.8], [2329.8, 60], [2289, 62.4], [2250.6, 69.6], [2212.2, 67.2], [2173.8, 57.6], [2178.6, 43.2], [2185.8, 26.4], [2195.4, 9.6], [2205, -7.2]]],
    ] as const).map(([id, ring]) => ({
      id,
      kind: 'sea-ice' as const,
      label: '북해의 얼음',
      ring,
      basis:
        'Cleric of Chill Depths (ZNR #51, 2020) 플레이버: \'Before my people turned to false gods, we built a glittering city beneath the northern sea ice.\' — 젠디카르 북쪽 바다에 바다 얼음이 있다.',
      estimate:
        '공식 자료는 \'북해의 얼음\'이 있다고만 하고 어느 바다인지, 어디까지인지는 밝히지 않는다. 이 지도는 극지 대륙 세지리를 위쪽(북쪽) 가장자리에 두었으므로, 세지리 양 끝 너머 지도 위쪽 가장자리의 트인 바다에 떠다니는 얼음을 그렸다. 세지리 빙붕(PG 2010)은 고원 위의 얼음을 말하는 것으로 읽혀 이 바다 얼음의 근거로 쓰지 않았고, 이 얼음이 Benthidrix 의 자리를 가리키지도 않는다.',
    })),
  ],
}
