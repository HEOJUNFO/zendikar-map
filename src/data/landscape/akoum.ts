// 바탕 지형 — akoum. 모양·규칙은 src/data/types.ts 의 Landscape
// 근거는 대부분 PG: Akoum(2010). 북부의 여러 줄기 산맥(아쿰의 이빨), 그 밖의 결정 들판과 분지, 대륙 한가운데의 초화산과 용암 들판,
// 이빨에서 아파로 흐르는 강, 화산 유리 첨탑과 물밑 결정 초가 도사린 해안을 그린다.
// 대륙 전체의 산 밀도(continents.ts relief)는 남쪽 기준이고, 북부가 더 험한 것은 아래 이빨 줄기 영역이 맡는다.
import type { Landscape } from '../types'

const TEETH_BASIS =
  'PG: Akoum(2010) \'The northern reaches of Akoum become more mountainous. The Teeth of Akoum are a series of mountain ranges that are essentially impassable without some means of flight or a very experienced and clever guide.\' — 북부로 갈수록 산이 많아지고, 아쿰의 이빨은 한 덩어리가 아니라 여러 줄기의 산맥이다. ZNR(2020) 대지 카드 아쿰의 이빨과 MH3(2024) Volcanic Fissure 플레이버(\'the volcanic teeth of Akoum\')로 지금도 험한 산맥이다.'
const TEETH_ESTIMATE = '공식 자료는 산맥이 여러 줄기라는 것과 북부에 있다는 것만 밝히고 줄기의 수·방향·자리는 밝히지 않아, 이 지도가 북부를 여섯 줄기로 나눠 그렸다.'

const COAST_BASIS =
  'PG: Akoum(2010) \'Deadly Coasts\' — \'Seismic activity and spires of volcanic glass make landing a ship onto the mainland a near impossibility. The eastern shores are safest, but never safe. … the hull torn apart on jagged underwater crystals, essentially invisible to a lookout\'s eye. There are no permanent ports.\' 아트북 The Art of Magic: The Gathering – Zendikar(2016)도 \'Spires of volcanic glass jut from the sea\'라고 쓴다.'
const COAST_ESTIMATE =
  '화산 유리 첨탑과 물밑 결정 초는 아쿰 해안 전체의 성격일 뿐 자리가 밝혀진 곳은 없고, 해안선도 해마다 크게 바뀐다(PG: Akoum). 이 지도가 몇 곳을 골라 바다 위에 표시했고, \'그나마 가장 안전한\' 동쪽 해안에는 두지 않았다.'

const VENT_BASIS =
  'PG(2009) 개요 \'Gases occasionally spew from the ground, and around these vents, bizarre trees and plant life have arisen in pockets of weird biome. … causing magma geysers to erupt unexpectedly\', Cinder Glade(BFZ #235) 플레이버 \'On the volcanic continent of Akoum, bizarre vegetation clusters around gas vents\', PG: Akoum(2010) \'gases from deep within the earth are thrust to the surface\'.'
const VENT_ESTIMATE =
  '가스 분출구와 마그마 간헐천은 아쿰 곳곳의 성격일 뿐 자리가 밝혀진 곳은 없고, 그 둘레에 피는 \'라이프 블룸\'도 1~2년이면 사라진다(PG: Akoum). 그래서 숲은 그리지 않고, 이 지도가 고른 몇 곳에 분출구 기호만 둔다.'

const ORA_ONDAR_BASIS =
  'PG: Akoum(2010) \'The settlers have built homes into the stone crannies of a five-tiered outgrowth of rock that juts dramatically out of the crystalline basin. Each layer is home to a different era\'s flora\' — 오라 온다르의 숲은 결정질 분지에서 솟은 다섯 단 바위 위에 층마다 자란다.'
const ORA_ONDAR_ESTIMATE =
  '바위의 크기·모양은 공식 자료에 없어, 오라 온다르 자리(팬 지도)를 꼭대기로 숲 안쪽에 두고, 다섯 단 가운데 남쪽은 한 벽으로 합쳐지고 북쪽에 단이 드러나게 이 지도가 모양을 골랐다. 단이 한가운데에 겹겹이 쌓인 과녁처럼 보이지 않도록 가운데 세 단은 북쪽에만 드러나는 단애로 그렸다.'

const COAST_LABEL = '화산 유리 첨탑'
const REEF_LABEL = '물밑 결정 초'
const VENT_LABEL = '가스 분출구'

export const landscape: Landscape = {
  areas: [
    // 이빨 지역(teeth-of-akoum 범위)을 먼저 골짜기 밀도로 덮고, 그 위에 줄기를 얹는다.
    // 골짜기도 대륙 남쪽 기준(relief.mountains 0.5)보다 빽빽하게 둬, 북부가 남부보다 덜 험해 보이는 곳이 없게 한다
    {
      id: 'akoum-teeth-valleys',
      kind: 'mountain',
      density: 0.7,
      location: 'teeth-of-akoum',
      label: '아쿰의 이빨 줄기 사이 골짜기',
      ring: [[2065.6, 376.6], [2064.4, 394.6], [2040.4, 410.2], [2011.6, 423.4], [1974.4, 435.4], [1930, 436.6], [1885.6, 434.2], [1842.4, 427], [1814.8, 412.6], [1792, 395.8], [1783.6, 376.6], [1798, 358.6], [1814.8, 340.6], [1846, 327.4], [1888, 322.6], [1930, 317.8], [1973.2, 320.2], [2009.2, 329.8], [2045.2, 340.6], [2064.4, 358.6]],
      basis: `${TEETH_BASIS} 범위는 장소 teeth-of-akoum 의 범위(canon-hint)다.`,
      estimate: '줄기 사이 골짜기의 밀도는 공식 자료에 없어 이 지도가 골랐다 — 대륙 남쪽 기준(0.5)보다 낮추지 않고(0.7) 이빨 지역 어디도 남부보다 덜 험해 보이지 않게 했으며, 그 위의 더 빽빽한 줄기(0.95)로 여러 줄기의 산맥이 읽히게 했다.',
    },
    // 줄기마다 폭 48~66 단위 — 산 기호(폭 약 19, 높이 8~16)는 밑동 위 12 단위까지 같은 영역이어야 서므로, 두세 줄로 엇갈려 서려면 이만큼 넓어야 산줄기로 읽힌다
    {
      id: 'akoum-teeth-west',
      kind: 'mountain',
      density: 0.95,
      location: 'teeth-of-akoum',
      label: '아쿰의 이빨 산줄기',
      ring: [[1499.2, 365.8], [1513.6, 361], [1526.8, 353.8], [1540, 347.8], [1553.2, 340.6], [1564, 328.6], [1576, 319], [1589.2, 311.8], [1602.4, 301], [1613.2, 290.2], [1620.4, 275.8], [1632.4, 267.4], [1642, 255.4], [1649.2, 241], [1624, 213.4], [1609.6, 220.6], [1598.8, 231.4], [1584.4, 238.6], [1574.8, 249.4], [1562.8, 257.8], [1550.8, 265], [1540, 274.6], [1530.4, 287.8], [1517.2, 296.2], [1508.8, 307], [1496.8, 316.6], [1488.4, 329.8], [1480, 341.8]],
      basis: TEETH_BASIS,
      estimate: `${TEETH_ESTIMATE} 이 줄기는 대륙 북쪽 끝 가운데 하나인 북서쪽 곶의 등줄기를 따라 두었다.`,
    },
    {
      id: 'akoum-teeth-north',
      kind: 'mountain',
      density: 0.95,
      location: 'teeth-of-akoum',
      label: '아쿰의 이빨 산줄기',
      ring: [[1661.2, 327.4], [1674.4, 339.4], [1692.4, 347.8], [1709.2, 350.2], [1723.6, 353.8], [1745.2, 351.4], [1760.8, 345.4], [1765.6, 310.6], [1750, 304.6], [1734.4, 307], [1726, 305.8], [1711.6, 299.8], [1702, 301], [1684, 299.8]],
      basis: TEETH_BASIS,
      estimate: `${TEETH_ESTIMATE} 이 줄기는 탈 테리그 서쪽 북해안을 따라 두고, '아쿰의 분지에서 솟은'(PG: Akoum) 탈 테리그 앞에서 멈추게 했다.`,
    },
    {
      id: 'akoum-teeth-eye',
      kind: 'mountain',
      density: 0.95,
      location: 'teeth-of-akoum',
      label: '아쿰의 이빨 산줄기',
      ring: [[1820.8, 357.4], [1840, 361], [1850.8, 362.2], [1867.6, 363.4], [1878.4, 362.2], [1898.8, 335.8], [1885.6, 322.6], [1864, 315.4], [1843.6, 316.6], [1825.6, 322.6]],
      basis: TEETH_BASIS,
      estimate: `${TEETH_ESTIMATE} 이 줄기는 탈 테리그 동쪽에서 Eye of Ugin 서쪽까지 북해안을 따라 짧게 두었다.`,
    },
    {
      id: 'akoum-teeth-central',
      kind: 'mountain',
      density: 0.95,
      location: 'teeth-of-akoum',
      label: '아쿰의 이빨 산줄기',
      // 서쪽 끝은 League of Anowon 캠프(1869,413)를 감싸 내려와, 캠프가 줄기의 높은 곳에 놓이고 Windblast Gorge 가 아파에서 줄기 안으로 오른다
      ring: [[1873.6, 423.4], [1885.6, 416.2], [1897.6, 412.6], [1912, 409], [1920.4, 413.8], [1936, 416.2], [1952.8, 417.4], [1962.4, 421], [1976.8, 419.8], [1991.2, 425.8], [2003.2, 424.6], [2018.8, 429.4], [2042.8, 401.8], [2030.8, 391], [2017.6, 379], [1998.4, 374.2], [1986.4, 367], [1972, 364.6], [1951.6, 362.2], [1936, 361], [1916.8, 362.2], [1897.6, 364.6], [1882, 373], [1868.8, 383.8], [1860.4, 398.2], [1859.2, 412.6], [1864, 422.2]],
      basis: TEETH_BASIS,
      estimate: `${TEETH_ESTIMATE} 이 줄기는 Eye of Ugin 남쪽의 가운데 줄기로, '이빨 높은 곳'의 League of Anowon 캠프가 그 서쪽 끝 높은 곳에, '이빨 기슭'의 아파가 그 아래에 오게 했다(PG: Akoum). 아파로 흐르는 강이 이 줄기 남쪽 비탈에서 시작한다.`,
    },
    {
      id: 'akoum-teeth-northeast',
      kind: 'mountain',
      density: 0.95,
      location: 'teeth-of-akoum',
      label: '아쿰의 이빨 산줄기',
      ring: [[1945.6, 340.6], [1962.4, 339.4], [1978, 339.4], [1993.6, 338.2], [2006.8, 332.2], [2021.2, 331], [2035.6, 326.2], [2051.2, 321.4], [2069.2, 313], [2082.4, 301], [2059.6, 277], [2046.4, 278.2], [2030.8, 283], [2015.2, 285.4], [1999.6, 285.4], [1986.4, 292.6], [1972, 296.2], [1957.6, 303.4], [1943.2, 311.8]],
      basis: TEETH_BASIS,
      estimate: `${TEETH_ESTIMATE} 이 줄기는 Eye of Ugin 동쪽 북해안을 따라 카르간 부족 땅 북쪽까지 두고, 오라 온다르 숲(팬 지도) 앞에서 멈추게 했다.`,
    },
    {
      id: 'akoum-teeth-far-northeast',
      kind: 'mountain',
      density: 0.95,
      location: 'teeth-of-akoum',
      label: '아쿰의 이빨 산줄기',
      ring: [[2208.4, 223], [2225.2, 223], [2242, 217], [2257.6, 212.2], [2272, 201.4], [2286.4, 193], [2298.4, 181], [2278, 165.4], [2261.2, 170.2], [2248, 178.6], [2232.4, 184.6], [2219.2, 191.8], [2204.8, 200.2]],
      basis: TEETH_BASIS,
      estimate: `${TEETH_ESTIMATE} 이 줄기는 대륙에서 가장 북쪽인 북동쪽 곶 끝에 두고, 오라 온다르 숲(팬 지도) 북쪽 가장자리에서 멈추게 했다.`,
    },
    // 가시지대 — 산이 아니라 결정 들판. 장소 범위(canon-hint)에서 산 대신 수정 첨탑을 흩뿌린다.
    // 대륙 전체에도 산 기호의 일부가 수정 첨탑(relief.crystal)이라, 들판으로 읽히도록 큰 무리로 빽빽하게 둔다
    {
      id: 'akoum-spikefields',
      kind: 'crystal',
      density: 0.75,
      location: 'spikefields',
      label: '가시지대 결정 들판',
      at: [1784.8, 399.4],
      extent: [86.4, 63.6],
      basis: 'PG: Akoum(2010) \'the crystalline fields shimmer in every imaginable color beneath the sun\', \'the crystal fields on the surface and the spires of semi-reflective rock\', \'Rising hundreds of feet high out of Akoum\'s basin is the ruin site known as Tal Terig\' — 아트북 The Art of Magic: Zendikar(2016)은 탈 테리그가 가시지대(the Spike Fields)에서 솟았다고 쓴다. ZNR(2020) 아쿰 지옥견 \'Hellhound packs roam the Spikefields\'와 가시지대 위험물 \'You\'ll only bring down more spikes\'로 지금도 머리 위에 가시가 매달린 결정 들판이다. 산맥은 PG가 북부의 이빨에 준 것이라 이곳은 산이 아닌 결정 들판으로 그린다. 범위는 장소 spikefields 의 범위(그 placementBasis)를 그대로 쓴다.',
    },
    {
      id: 'akoum-basin-east',
      kind: 'crystal',
      density: 0.6,
      label: '오라 온다르 아래 결정 분지',
      ring: [[2077.6, 460.6], [2096.8, 452.2], [2125.6, 458.2], [2154.4, 461.8], [2183.2, 455.8], [2204.8, 463], [2210.8, 479.8], [2195.2, 494.2], [2165.2, 500.2], [2132.8, 497.8], [2102.8, 493], [2083.6, 481]],
      basis: `${ORA_ONDAR_BASIS} PG: Akoum 첫머리도 아쿰의 땅을 'crystalline fields'와 'spires of semi-reflective rock'로 그린다.`,
      estimate: '오라 온다르가 솟은 \'결정질 분지\'의 범위는 공식 자료에 없어, 숲(팬 지도) 남쪽 기슭과 거울연못 사이의 트인 땅을 이 지도가 골랐다. 거울연못 곁에는 \'근처의 들쭉날쭉한 봉우리\'(PG: Akoum, Ior)가 있어 거울연못에 닿기 전에 멈춘다.',
    },
    // 초화산 동쪽 테두리에서 흘러내린 듯 동쪽으로 혀를 내민 용암 들판 — 영역은 다각형 그대로 칠하므로 점을 촘촘히 둔다
    {
      id: 'akoum-lava-field',
      kind: 'lava',
      label: '용암 들판',
      ring: [[1910.8, 484.6], [1918, 481], [1925.2, 481], [1933.6, 482.2], [1940.8, 481], [1949.2, 478.6], [1957.6, 477.4], [1964.8, 479.8], [1973.2, 483.4], [1979.2, 488.2], [1984, 494.2], [1987.6, 500.2], [1986.4, 506.2], [1982.8, 512.2], [1981.6, 518.2], [1985.2, 524.2], [1984, 530.2], [1978, 536.2], [1972, 537.4], [1963.6, 535], [1956.4, 536.2], [1948, 539.8], [1940.8, 541], [1932.4, 537.4], [1926.4, 533.8], [1922.8, 526.6], [1918, 521.8], [1912, 517], [1908.4, 511], [1904.8, 503.8], [1904.8, 496.6], [1906, 489.4]],
      basis: '공식 스토리 \'Episode 1: In the Heart of the Skyclave\'(2020) — 아쿰 하늘거주지 아래에서 \'A lava field was spread out before her feet\', \'bubbles rising from the lava again, heralding another earthquake from the Roil\'. PG(2009) 개요 \'Akoum is a mountainous continent where magma glows from crevasses in the earth\', PG: Akoum(2010) \'Magma flows constantly flood and clear tunnels\', \'Often a life bloom will end when a lava flow erupts nearby\'.',
      estimate: '그 용암 들판이 아쿰 어디인지는 공식 스토리에 없다. 장소 akoum-skyclave 의 추정과 같이 초화산 가까이로 보고, 초화산(대륙 한가운데) 동쪽 기슭 하늘거주지 표시 아래에 이 지도가 두었다.',
    },
  ],
  rivers: [
    {
      id: 'akoum-affa-river',
      label: '이빨에서 아파로 흐르는 강',
      course: [[1955.2, 405.4], [1946.8, 416.2], [1937.2, 425.8], [1928.8, 436.6], [1915.6, 443.8], [1903.6, 452.2], [1889.2, 459.4], [1874.8, 464.2], [1862.8, 461.8], [1854.4, 455.8]],
      width: 1.3,
      basis: 'PG: Akoum(2010) Affa — \'A river flows down from the Teeth of Akoum and provides the town with one of the few safe, reliable sources of fresh water in the continent.\' 공식 이름이 없어 지도에 이름을 달지 않는다(패널의 이름은 설명일 뿐이다).',
      estimate: '물길은 공식 자료에 없어, 이빨의 가운데 줄기 남쪽 비탈에서 시작해 Windblast Gorge 남쪽을 돌아 아파에 닿게 이 지도가 그었다. 아쿰의 물은 흔히 땅 밑으로 빠져 사라지므로(PG: Akoum \'drain away beneath the surface\') 아파 너머 바다까지는 잇지 않았다.',
    },
  ],
  lines: [
    {
      id: 'akoum-windblast-gorge',
      kind: 'gorge',
      location: 'windblast-gorge',
      label: '아파에서 오르는 협곡',
      line: [[1858, 448.6], [1864, 443.8], [1870, 440.2], [1874.8, 434.2], [1878.4, 427], [1883.2, 419.8], [1889.2, 415]],
      width: 7.2,
      basis: 'PG(2009) — 아쿰의 사치르가 찬드라에게(Journey to the Eye 1부에서는 아파에서) \'The spike fields are bad, but they\'re nothing compared to Windblast Gorge. A drake will rip you to shreds before you can bat an eyelash.\' 자리는 장소 windblast-gorge 의 canon-hint(Journey to the Eye 1부: 아파와 봉우리 위 아노원 캠프 사이의 오르막).',
      estimate: '협곡의 길이·방향은 공식 자료에 없어, 아파에서 League of Anowon 캠프로 오르는 길을 따라 북동쪽으로 짧게 이 지도가 그었다.',
    },
    // 무너진 화산암 층 사이로 갈라진 틈 — 매끈한 활이 아니라 들쭉날쭉 꺾인 선
    {
      id: 'akoum-spikefields-chasm',
      kind: 'gorge',
      label: '가시지대의 협곡',
      line: [[1720, 441.4], [1730.8, 433], [1741.6, 435.4], [1752.4, 427], [1765.6, 429.4], [1777.6, 423.4], [1788.4, 430.6], [1800.4, 433], [1808.8, 441.4]],
      width: 7.2,
      basis: '아트북 The Art of Magic: The Gathering – Zendikar(2016) — BFZ 시기 엘드라지가 지나간 자리에서 화산암 층이 무너지며 가시지대 아래 묻혀 있던 고대 요새 폐허가 드러났고, \'within a deep chasm stretching for miles across the desiccated terrain\' 그 폐허가 줄지어 있다(mtg.wiki \'Spikefields\'가 아트북을 옮겨 쓴 문장 — 책 원문은 확인하지 못했다). 코르 stoneforge mystic들이 이를 피난처 Stone Havens로 만들었다.',
      estimate: '협곡의 정확한 자리·방향은 공식 자료에 없어, 가시지대 가운데 부분에서 탈 테리그·지역 이름·카드 표시를 피해 조금 남쪽에 동서로 이 지도가 그었다. ZNR 이후의 상태는 알려지지 않았지만 메워졌다는 서술도 없다.',
    },
    // 오라 온다르의 다섯 단 바위 — 바깥 단부터. 화면에서 시계 반대 방향으로 돌아 빗금이 바깥(낮은 쪽)으로 떨어진다.
    // 바깥 단과 꼭대기 단만 닫힌 고리이고, 가운데 세 단은 북쪽 반만 — 남쪽에서는 바깥 단의 벽과 한 벽으로 합쳐져,
    // 남쪽은 가파른 벽, 북쪽은 계단처럼 드러난 단이 된다 (단 사이 11 단위 이상 — 빗금 7. 끝은 이웃 단으로 잦아든다).
    // 꼭대기 단은 나무가 들어설 만큼 넓게 두고, 오라 온다르 이름이 그 위에 놓인다
    {
      id: 'akoum-ora-ondar-tier-1',
      kind: 'cliff',
      closed: true,
      location: 'ora-ondar',
      label: '오라 온다르의 바위 단',
      line: [[2257.6, 334.6], [2252.8, 317.8], [2261.2, 302.2], [2254, 286.6], [2239.6, 272.2], [2226.4, 257.8], [2209.6, 254.2], [2192.8, 259], [2173.6, 253], [2154.4, 260.2], [2136.4, 260.2], [2122, 274.6], [2113.6, 292.6], [2124.4, 309.4], [2116, 322.6], [2106.4, 335.8], [2112.4, 353.8], [2128, 364.6], [2147.2, 371.8], [2164, 377.8], [2183.2, 374.2], [2202.4, 381.4], [2221.6, 376.6], [2238.4, 368.2], [2252.8, 353.8]],
      basis: ORA_ONDAR_BASIS,
      estimate: ORA_ONDAR_ESTIMATE,
    },
    {
      id: 'akoum-ora-ondar-tier-2',
      kind: 'cliff',
      location: 'ora-ondar',
      label: '오라 온다르의 바위 단',
      line: [[2248, 296.2], [2236, 285.4], [2222.8, 272.2], [2209.6, 266.2], [2192.8, 271], [2173.6, 265], [2155.6, 272.2], [2140, 273.4], [2130.4, 284.2], [2125.6, 296.2]],
      basis: ORA_ONDAR_BASIS,
      estimate: ORA_ONDAR_ESTIMATE,
    },
    {
      id: 'akoum-ora-ondar-tier-3',
      kind: 'cliff',
      location: 'ora-ondar',
      label: '오라 온다르의 바위 단',
      line: [[2239.6, 352.6], [2242, 341.8], [2238.4, 325], [2242, 309.4], [2232.4, 296.2], [2213.2, 283], [2192.8, 283], [2173.6, 277], [2155.6, 284.2], [2142.4, 291.4], [2136.4, 308.2], [2135.2, 327.4], [2135.2, 338.2], [2129.2, 352.6]],
      basis: ORA_ONDAR_BASIS,
      estimate: ORA_ONDAR_ESTIMATE,
    },
    {
      id: 'akoum-ora-ondar-tier-4',
      kind: 'cliff',
      location: 'ora-ondar',
      label: '오라 온다르의 바위 단',
      line: [[2228.8, 304.6], [2215.6, 299.8], [2198.8, 296.2], [2183.2, 293.8], [2166.4, 296.2], [2154.4, 302.2], [2148.4, 309.4]],
      basis: ORA_ONDAR_BASIS,
      estimate: ORA_ONDAR_ESTIMATE,
    },
    {
      id: 'akoum-ora-ondar-tier-5',
      kind: 'cliff',
      closed: true,
      location: 'ora-ondar',
      label: '오라 온다르의 바위 단',
      line: [[2227.6, 339.4], [2225.2, 322.6], [2215.6, 310.6], [2198.8, 308.2], [2183.2, 305.8], [2166.4, 309.4], [2153.2, 316.6], [2147.2, 331], [2152, 344.2], [2164, 351.4], [2178.4, 351.4], [2194, 349], [2208.4, 353.8], [2220.4, 349]],
      basis: ORA_ONDAR_BASIS,
      estimate: ORA_ONDAR_ESTIMATE,
    },
  ],
  glyphs: [
    {
      id: 'akoum-supervolcano',
      kind: 'caldera',
      label: '초화산',
      at: [1888, 493],
      size: 1.3,
      basis: 'PG: Akoum(2010) \'Geological Instability\' — \'At the center of the sprawling region is a massive supervolcano—not precisely dormant, but in the last millennial cycle, there have been few major eruptions.\' 공식 이름이 없어 지도에 이름을 달지 않는다(패널의 이름은 설명일 뿐이다).',
      estimate: '\'한가운데\'의 정확한 자리는 공식 자료에 없어 이 지도가 골랐다. 대륙 덩어리의 무게중심(약 [1887,419])은 공식 위치 단서가 있는 이빨 산맥·League of Anowon(이빨 높은 곳)·아파(이빨 기슭)가 차지하므로, 같은 가로 위치에서 대륙의 남북 폭 가운데쯤인 아파 남쪽에 두었다. 하늘거주지 아래 용암 들판(Episode 1, 2020)을 그 동쪽 기슭으로 본 것도 장소 akoum-skyclave·용암 들판과 같은 이 지도의 판단이다.',
    },
    { id: 'akoum-vent-lava', kind: 'geyser', label: '마그마 간헐천', at: [1962.4, 518.2], size: 0.8, basis: VENT_BASIS, estimate: `${VENT_ESTIMATE} 이곳은 용암 들판 안의 마그마 간헐천이다.` },
    { id: 'akoum-vent-basin', kind: 'geyser', label: VENT_LABEL, at: [2140, 476.2], size: 0.8, basis: VENT_BASIS, estimate: `${VENT_ESTIMATE} 이곳은 백 년 가까이 이어진 라이프 블룸인 오라 온다르 남쪽의 결정 분지다.` },
    { id: 'akoum-vent-west', kind: 'geyser', label: VENT_LABEL, at: [1612, 463], size: 0.8, basis: VENT_BASIS, estimate: `${VENT_ESTIMATE} 이곳은 서부 내륙의 트인 땅이다.` },
    { id: 'akoum-vent-south', kind: 'geyser', label: VENT_LABEL, at: [1774, 574.6], size: 0.8, basis: VENT_BASIS, estimate: `${VENT_ESTIMATE} 이곳은 남부 해안 가까운 땅이다.` },
    // 바다에서 솟은 화산 유리 첨탑 — 홀로 선 바늘은 돛단배처럼 읽혀, 크기가 다른 두세 개를 한 무리로 둔다.
    // 북쪽 만의 것은 Eye of Ugin 자식 지도와 같은 자리이고, 만이 좁아 하나만 둔다
    { id: 'akoum-glass-spire-north-bay', kind: 'spire', label: COAST_LABEL, at: [1912, 304.6], size: 0.8, basis: COAST_BASIS, estimate: `${COAST_ESTIMATE} 북쪽 만의 것은 Eye of Ugin 자식 지도의 첨탑과 같은 자리다.` },
    { id: 'akoum-glass-spire-north', kind: 'spire', label: COAST_LABEL, at: [1727.2, 260.2], size: 0.8, basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-glass-spire-north-2', kind: 'spire', label: COAST_LABEL, at: [1736.8, 265], size: 0.5, basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-glass-spire-northwest', kind: 'spire', label: COAST_LABEL, at: [1558, 223], size: 0.75, basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-glass-spire-northwest-2', kind: 'spire', label: COAST_LABEL, at: [1548.4, 229], size: 0.5, basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-glass-spire-west', kind: 'spire', label: COAST_LABEL, at: [1318, 358.6], size: 0.85, basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-glass-spire-west-2', kind: 'spire', label: COAST_LABEL, at: [1326.4, 363.4], size: 0.55, basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-glass-spire-west-3', kind: 'spire', label: COAST_LABEL, at: [1310.8, 365.8], size: 0.45, basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-glass-spire-south', kind: 'spire', label: COAST_LABEL, at: [1614.4, 632.2], size: 0.75, basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-glass-spire-south-2', kind: 'spire', label: COAST_LABEL, at: [1624, 635.8], size: 0.5, basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-glass-spire-southeast', kind: 'spire', label: COAST_LABEL, at: [1960, 665.8], size: 0.75, basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-glass-spire-southeast-2', kind: 'spire', label: COAST_LABEL, at: [1969.6, 670.6], size: 0.5, basis: COAST_BASIS, estimate: COAST_ESTIMATE },
  ],
  sea: [
    // 물밑 결정 초 — 해도의 암초 표시. 동쪽 해안(그나마 안전한 쪽)에는 두지 않는다
    { id: 'akoum-reef-north-bay', kind: 'reef', label: REEF_LABEL, at: [1906, 298.6], extent: [6, 3.6], basis: COAST_BASIS, estimate: `${COAST_ESTIMATE} 북쪽 만 어귀의 것은 Eye of Ugin 자식 지도의 암초와 같은 자리다.` },
    { id: 'akoum-reef-north', kind: 'reef', label: REEF_LABEL, at: [1746.4, 257.8], extent: [14.4, 4.8], basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-reef-northwest', kind: 'reef', label: REEF_LABEL, at: [1376.8, 308.2], extent: [12, 4.8], basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-reef-west', kind: 'reef', label: REEF_LABEL, at: [1336, 373], extent: [12, 6], basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-reef-southwest', kind: 'reef', label: REEF_LABEL, at: [1432, 512.2], extent: [14.4, 6], basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-reef-south', kind: 'reef', label: REEF_LABEL, at: [1684, 617.8], extent: [19.2, 6], basis: COAST_BASIS, estimate: COAST_ESTIMATE },
  ],
}
