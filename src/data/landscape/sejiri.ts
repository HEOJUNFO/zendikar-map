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
      ring: [[1392, -12], [1450, -14], [1510, -10], [1530, 10], [1522, 40], [1508, 66], [1490, 88], [1462, 114], [1432, 114], [1405, 126], [1388, 108], [1384, 78], [1388, 40]],
    },
    // 세지리 빙하 — 장소 sejiri-glacier 의 범위(extent [70,35]) 안에 빙원을 그린다
    {
      id: 'sejiri-glacier-ice',
      kind: 'ice',
      label: '세지리 빙하의 빙원',
      location: 'sejiri-glacier',
      basis: 'Sejiri Shelter // Sejiri Glacier (ZNR #37, 2020) — 대지 면 이름이 곧 세지리의 빙하다 (\'This place offers nothing and takes everything.\' —Enwor, Sea Gate Expeditionary House).',
      estimate: '공식 자료는 이 빙하가 세지리에 있다는 것만 알려 주고 위치·규모·모양은 말하지 않는다. 이 지도가 고른 장소 자리(세지리 서부의 빈 고원, 장소 패널의 \'추정\')와 범위를 따라, 그 동쪽 산 무리 바로 서쪽의 빈 고원을 메운 빙원으로 그렸다.',
      ring: [[612, 40], [628, 30], [652, 24], [676, 27], [700, 24], [724, 30], [742, 44], [740, 62], [732, 78], [714, 90], [690, 94], [664, 90], [640, 92], [618, 84], [606, 68], [608, 54]],
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
      course: [[1095, 158], [1090, 146], [1084, 134], [1080, 122], [1074, 110], [1075, 98], [1069, 86], [1061, 74], [1060, 62], [1060, 50], [1060, 40], [1057, 28], [1050, 14], [1044, 2], [1040, -10]],
    },
    {
      id: 'sejiri-benthidrix-river-west',
      label: '벤티드릭스 위를 흐르는 강의 지류',
      tributaryOf: 'sejiri-benthidrix-river',
      width: 1,
      basis: `${PG_SEJIRI} 'The Tundra Perilous': 'brittle ice bridges over rapidly-flowing rivers' — 세지리에는 강이 여럿 있다.`,
      estimate:
        '공식 자료는 세지리에 강이 여럿 있다고만 하고 어디를 흐르는지는 밝히지 않는다. 이 지도가 Benthidrix 위를 흐르는 강에 서남쪽, 절벽 테 안쪽 고지에서 솟아 북동쪽으로 흘러 합치는 지류 하나를 그렸다. 물길은 서쪽 산 무리의 남동쪽 기슭을 지나 산줄기를 가로지르지 않는다.',
      course: [[992, 142], [997, 130], [1004, 119], [1011, 108], [1021, 99], [1032, 91], [1043, 84], [1052, 79], [1061, 74]],
    },
  ],
  glyphs: [
    // 떠다니는 돌 '항아리' — 얼음과 눈사태를 쏟아낸다
    ...([
      ['sejiri-urn-central', [968, 96]],
      ['sejiri-urn-ridge', [1262, 42]],
      ['sejiri-urn-east', [1625, 22]],
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
      ['sejiri-sea-ice-west', [[0, -15], [120, -15], [250, -15], [372, -15], [384, 6], [398, 26], [404, 40], [376, 44], [342, 38], [312, 54], [282, 46], [250, 62], [222, 50], [190, 56], [158, 74], [130, 60], [96, 58], [62, 46], [30, 52], [0, 40]]],
      ['sejiri-sea-ice-east', [[2026, -15], [2200, -15], [2400, -15], [2400, 34], [2368, 44], [2336, 38], [2300, 56], [2268, 46], [2232, 52], [2196, 70], [2168, 54], [2134, 50], [2100, 52], [2068, 58], [2036, 56], [2004, 48], [2008, 36], [2014, 22], [2022, 8], [2030, -6]]],
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
