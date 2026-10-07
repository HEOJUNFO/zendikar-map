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
      ring: [[2078, 433], [2077, 448], [2057, 461], [2033, 472], [2002, 482], [1965, 483], [1928, 481], [1892, 475], [1869, 463], [1850, 449], [1843, 433], [1855, 418], [1869, 403], [1895, 392], [1930, 388], [1965, 384], [2001, 386], [2031, 394], [2061, 403], [2077, 418]],
      basis: `${TEETH_BASIS} 범위는 장소 teeth-of-akoum 의 범위(canon-hint)다.`,
      estimate: '줄기 사이 골짜기의 밀도는 공식 자료에 없어 이 지도가 골랐다 — 대륙 남쪽 기준(0.5)보다 낮추지 않고(0.7) 이빨 지역 어디도 남부보다 덜 험해 보이지 않게 했으며, 그 위의 더 빽빽한 줄기(0.95)로 여러 줄기의 산맥이 읽히게 했다.',
    },
    // 줄기마다 폭 40~55 단위 — 산 기호(폭 약 19, 높이 8~16)는 밑동 위 12 단위까지 같은 영역이어야 서므로, 두세 줄로 엇갈려 서려면 이만큼 넓어야 산줄기로 읽힌다
    {
      id: 'akoum-teeth-west',
      kind: 'mountain',
      density: 0.95,
      location: 'teeth-of-akoum',
      label: '아쿰의 이빨 산줄기',
      ring: [[1606, 424], [1618, 420], [1629, 414], [1640, 409], [1651, 403], [1660, 393], [1670, 385], [1681, 379], [1692, 370], [1701, 361], [1707, 349], [1717, 342], [1725, 332], [1731, 320], [1710, 297], [1698, 303], [1689, 312], [1677, 318], [1669, 327], [1659, 334], [1649, 340], [1640, 348], [1632, 359], [1621, 366], [1614, 375], [1604, 383], [1597, 394], [1590, 404]],
      basis: TEETH_BASIS,
      estimate: `${TEETH_ESTIMATE} 이 줄기는 대륙 북쪽 끝 가운데 하나인 북서쪽 곶의 등줄기를 따라 두었다.`,
    },
    {
      id: 'akoum-teeth-north',
      kind: 'mountain',
      density: 0.95,
      location: 'teeth-of-akoum',
      label: '아쿰의 이빨 산줄기',
      ring: [[1741, 392], [1752, 402], [1767, 409], [1781, 411], [1793, 414], [1811, 412], [1824, 407], [1828, 378], [1815, 373], [1802, 375], [1795, 374], [1783, 369], [1775, 370], [1760, 369]],
      basis: TEETH_BASIS,
      estimate: `${TEETH_ESTIMATE} 이 줄기는 탈 테리그 서쪽 북해안을 따라 두고, '아쿰의 분지에서 솟은'(PG: Akoum) 탈 테리그 앞에서 멈추게 했다.`,
    },
    {
      id: 'akoum-teeth-eye',
      kind: 'mountain',
      density: 0.95,
      location: 'teeth-of-akoum',
      label: '아쿰의 이빨 산줄기',
      ring: [[1874, 417], [1890, 420], [1899, 421], [1913, 422], [1922, 421], [1939, 399], [1928, 388], [1910, 382], [1893, 383], [1878, 388]],
      basis: TEETH_BASIS,
      estimate: `${TEETH_ESTIMATE} 이 줄기는 탈 테리그 동쪽에서 Eye of Ugin 서쪽까지 북해안을 따라 짧게 두었다.`,
    },
    {
      id: 'akoum-teeth-central',
      kind: 'mountain',
      density: 0.95,
      location: 'teeth-of-akoum',
      label: '아쿰의 이빨 산줄기',
      // 서쪽 끝은 League of Anowon 캠프(1914,463)를 감싸 내려와, 캠프가 줄기의 높은 곳에 놓이고 Windblast Gorge 가 아파에서 줄기 안으로 오른다
      ring: [[1918, 472], [1928, 466], [1938, 463], [1950, 460], [1957, 464], [1970, 466], [1984, 467], [1992, 470], [2004, 469], [2016, 474], [2026, 473], [2039, 477], [2059, 454], [2049, 445], [2038, 435], [2022, 431], [2012, 425], [2000, 423], [1983, 421], [1970, 420], [1954, 421], [1938, 423], [1925, 430], [1914, 439], [1907, 451], [1906, 463], [1910, 471]],
      basis: TEETH_BASIS,
      estimate: `${TEETH_ESTIMATE} 이 줄기는 Eye of Ugin 남쪽의 가운데 줄기로, '이빨 높은 곳'의 League of Anowon 캠프가 그 서쪽 끝 높은 곳에, '이빨 기슭'의 아파가 그 아래에 오게 했다(PG: Akoum). 아파로 흐르는 강이 이 줄기 남쪽 비탈에서 시작한다.`,
    },
    {
      id: 'akoum-teeth-northeast',
      kind: 'mountain',
      density: 0.95,
      location: 'teeth-of-akoum',
      label: '아쿰의 이빨 산줄기',
      ring: [[1978, 403], [1992, 402], [2005, 402], [2018, 401], [2029, 396], [2041, 395], [2053, 391], [2066, 387], [2081, 380], [2092, 370], [2073, 350], [2062, 351], [2049, 355], [2036, 357], [2023, 357], [2012, 363], [2000, 366], [1988, 372], [1976, 379]],
      basis: TEETH_BASIS,
      estimate: `${TEETH_ESTIMATE} 이 줄기는 Eye of Ugin 동쪽 북해안을 따라 카르간 부족 땅 북쪽까지 두고, 오라 온다르 숲(팬 지도) 앞에서 멈추게 했다.`,
    },
    {
      id: 'akoum-teeth-far-northeast',
      kind: 'mountain',
      density: 0.95,
      location: 'teeth-of-akoum',
      label: '아쿰의 이빨 산줄기',
      ring: [[2197, 305], [2211, 305], [2225, 300], [2238, 296], [2250, 287], [2262, 280], [2272, 270], [2255, 257], [2241, 261], [2230, 268], [2217, 273], [2206, 279], [2194, 286]],
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
      at: [1844, 452],
      extent: [72, 53],
      basis: 'PG: Akoum(2010) \'the crystalline fields shimmer in every imaginable color beneath the sun\', \'the crystal fields on the surface and the spires of semi-reflective rock\', \'Rising hundreds of feet high out of Akoum\'s basin is the ruin site known as Tal Terig\' — 아트북 The Art of Magic: Zendikar(2016)은 탈 테리그가 가시지대(the Spike Fields)에서 솟았다고 쓴다. ZNR(2020) 아쿰 지옥견 \'Hellhound packs roam the Spikefields\'와 가시지대 위험물 \'You\'ll only bring down more spikes\'로 지금도 머리 위에 가시가 매달린 결정 들판이다. 산맥은 PG가 북부의 이빨에 준 것이라 이곳은 산이 아닌 결정 들판으로 그린다. 범위는 장소 spikefields 의 범위(그 placementBasis)를 그대로 쓴다.',
    },
    {
      id: 'akoum-basin-east',
      kind: 'crystal',
      density: 0.6,
      label: '오라 온다르 아래 결정 분지',
      ring: [[2088, 503], [2104, 496], [2128, 501], [2152, 504], [2176, 499], [2194, 505], [2199, 519], [2186, 531], [2161, 536], [2134, 534], [2109, 530], [2093, 520]],
      basis: `${ORA_ONDAR_BASIS} PG: Akoum 첫머리도 아쿰의 땅을 'crystalline fields'와 'spires of semi-reflective rock'로 그린다.`,
      estimate: '오라 온다르가 솟은 \'결정질 분지\'의 범위는 공식 자료에 없어, 숲(팬 지도) 남쪽 기슭과 거울연못 사이의 트인 땅을 이 지도가 골랐다. 거울연못 곁에는 \'근처의 들쭉날쭉한 봉우리\'(PG: Akoum, Ior)가 있어 거울연못에 닿기 전에 멈춘다.',
    },
    // 초화산 동쪽 테두리에서 흘러내린 듯 동쪽으로 혀를 내민 용암 들판 — 영역은 다각형 그대로 칠하므로 점을 촘촘히 둔다
    {
      id: 'akoum-lava-field',
      kind: 'lava',
      label: '용암 들판',
      ring: [[1949, 523], [1955, 520], [1961, 520], [1968, 521], [1974, 520], [1981, 518], [1988, 517], [1994, 519], [2001, 522], [2006, 526], [2010, 531], [2013, 536], [2012, 541], [2009, 546], [2008, 551], [2011, 556], [2010, 561], [2005, 566], [2000, 567], [1993, 565], [1987, 566], [1980, 569], [1974, 570], [1967, 567], [1962, 564], [1959, 558], [1955, 554], [1950, 550], [1947, 545], [1944, 539], [1944, 533], [1945, 527]],
      basis: '공식 스토리 \'Episode 1: In the Heart of the Skyclave\'(2020) — 아쿰 하늘거주지 아래에서 \'A lava field was spread out before her feet\', \'bubbles rising from the lava again, heralding another earthquake from the Roil\'. PG(2009) 개요 \'Akoum is a mountainous continent where magma glows from crevasses in the earth\', PG: Akoum(2010) \'Magma flows constantly flood and clear tunnels\', \'Often a life bloom will end when a lava flow erupts nearby\'.',
      estimate: '그 용암 들판이 아쿰 어디인지는 공식 스토리에 없다. 장소 akoum-skyclave 의 추정과 같이 초화산 가까이로 보고, 초화산(대륙 한가운데) 동쪽 기슭 하늘거주지 표시 아래에 이 지도가 두었다.',
    },
  ],
  rivers: [
    {
      id: 'akoum-affa-river',
      label: '이빨에서 아파로 흐르는 강',
      course: [[1986, 457], [1979, 466], [1971, 474], [1964, 483], [1953, 489], [1943, 496], [1931, 502], [1919, 506], [1909, 504], [1902, 499]],
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
      line: [[1905, 493], [1910, 489], [1915, 486], [1919, 481], [1922, 475], [1926, 469], [1931, 465]],
      width: 6,
      basis: 'PG(2009) — 아쿰의 사치르가 찬드라에게(Journey to the Eye 1부에서는 아파에서) \'The spike fields are bad, but they\'re nothing compared to Windblast Gorge. A drake will rip you to shreds before you can bat an eyelash.\' 자리는 장소 windblast-gorge 의 canon-hint(Journey to the Eye 1부: 아파와 봉우리 위 아노원 캠프 사이의 오르막).',
      estimate: '협곡의 길이·방향은 공식 자료에 없어, 아파에서 League of Anowon 캠프로 오르는 길을 따라 북동쪽으로 짧게 이 지도가 그었다.',
    },
    // 무너진 화산암 층 사이로 갈라진 틈 — 매끈한 활이 아니라 들쭉날쭉 꺾인 선
    {
      id: 'akoum-spikefields-chasm',
      kind: 'gorge',
      label: '가시지대의 협곡',
      line: [[1790, 487], [1799, 480], [1808, 482], [1817, 475], [1828, 477], [1838, 472], [1847, 478], [1857, 480], [1864, 487]],
      width: 6,
      basis: '아트북 The Art of Magic: The Gathering – Zendikar(2016) — BFZ 시기 엘드라지가 지나간 자리에서 화산암 층이 무너지며 가시지대 아래 묻혀 있던 고대 요새 폐허가 드러났고, \'within a deep chasm stretching for miles across the desiccated terrain\' 그 폐허가 줄지어 있다(mtg.wiki \'Spikefields\'가 아트북을 옮겨 쓴 문장 — 책 원문은 확인하지 못했다). 코르 stoneforge mystic들이 이를 피난처 Stone Havens로 만들었다.',
      estimate: '협곡의 정확한 자리·방향은 공식 자료에 없어, 가시지대 가운데 부분에서 탈 테리그·지역 이름·카드 표시를 피해 조금 남쪽에 동서로 이 지도가 그었다. ZNR 이후의 상태는 알려지지 않았지만 메워졌다는 서술도 없다.',
    },
    // 오라 온다르의 다섯 단 바위 — 바깥 단부터. 화면에서 시계 반대 방향으로 돌아 빗금이 바깥(낮은 쪽)으로 떨어진다.
    // 바깥 단과 꼭대기 단만 닫힌 고리이고, 가운데 세 단은 북쪽 반만 — 남쪽에서는 바깥 단의 벽과 한 벽으로 합쳐져,
    // 남쪽은 가파른 벽, 북쪽은 계단처럼 드러난 단이 된다 (단 사이 9 단위 이상 — 빗금 7. 끝은 이웃 단으로 잦아든다).
    // 꼭대기 단은 나무가 들어설 만큼 넓게 두고, 오라 온다르 이름이 그 위에 놓인다
    {
      id: 'akoum-ora-ondar-tier-1',
      kind: 'cliff',
      closed: true,
      location: 'ora-ondar',
      label: '오라 온다르의 바위 단',
      line: [[2238, 398], [2234, 384], [2241, 371], [2235, 358], [2223, 346], [2212, 334], [2198, 331], [2184, 335], [2168, 330], [2152, 336], [2137, 336], [2125, 348], [2118, 363], [2127, 377], [2120, 388], [2112, 399], [2117, 414], [2130, 423], [2146, 429], [2160, 434], [2176, 431], [2192, 437], [2208, 433], [2222, 426], [2234, 414]],
      basis: ORA_ONDAR_BASIS,
      estimate: ORA_ONDAR_ESTIMATE,
    },
    {
      id: 'akoum-ora-ondar-tier-2',
      kind: 'cliff',
      location: 'ora-ondar',
      label: '오라 온다르의 바위 단',
      line: [[2230, 366], [2220, 357], [2209, 346], [2198, 341], [2184, 345], [2168, 340], [2153, 346], [2140, 347], [2132, 356], [2128, 366]],
      basis: ORA_ONDAR_BASIS,
      estimate: ORA_ONDAR_ESTIMATE,
    },
    {
      id: 'akoum-ora-ondar-tier-3',
      kind: 'cliff',
      location: 'ora-ondar',
      label: '오라 온다르의 바위 단',
      line: [[2223, 413], [2225, 404], [2222, 390], [2225, 377], [2217, 366], [2201, 355], [2184, 355], [2168, 350], [2153, 356], [2142, 362], [2137, 376], [2136, 392], [2136, 401], [2131, 413]],
      basis: ORA_ONDAR_BASIS,
      estimate: ORA_ONDAR_ESTIMATE,
    },
    {
      id: 'akoum-ora-ondar-tier-4',
      kind: 'cliff',
      location: 'ora-ondar',
      label: '오라 온다르의 바위 단',
      line: [[2214, 373], [2203, 369], [2189, 366], [2176, 364], [2162, 366], [2152, 371], [2147, 377]],
      basis: ORA_ONDAR_BASIS,
      estimate: ORA_ONDAR_ESTIMATE,
    },
    {
      id: 'akoum-ora-ondar-tier-5',
      kind: 'cliff',
      closed: true,
      location: 'ora-ondar',
      label: '오라 온다르의 바위 단',
      line: [[2213, 402], [2211, 388], [2203, 378], [2189, 376], [2176, 374], [2162, 377], [2151, 383], [2146, 395], [2150, 406], [2160, 412], [2172, 412], [2185, 410], [2197, 414], [2207, 410]],
      basis: ORA_ONDAR_BASIS,
      estimate: ORA_ONDAR_ESTIMATE,
    },
  ],
  glyphs: [
    {
      id: 'akoum-supervolcano',
      kind: 'caldera',
      label: '초화산',
      at: [1930, 530],
      size: 1.3,
      basis: 'PG: Akoum(2010) \'Geological Instability\' — \'At the center of the sprawling region is a massive supervolcano—not precisely dormant, but in the last millennial cycle, there have been few major eruptions.\' 공식 이름이 없어 지도에 이름을 달지 않는다(패널의 이름은 설명일 뿐이다).',
      estimate: '\'한가운데\'의 정확한 자리는 공식 자료에 없어 이 지도가 골랐다. 대륙 덩어리의 무게중심(약 [1929,468])은 공식 위치 단서가 있는 이빨 산맥·League of Anowon(이빨 높은 곳)·아파(이빨 기슭)가 차지하므로, 같은 가로 위치에서 대륙의 남북 폭 가운데쯤인 아파 남쪽에 두었다. 하늘거주지 아래 용암 들판(Episode 1, 2020)을 그 동쪽 기슭으로 본 것도 장소 akoum-skyclave·용암 들판과 같은 이 지도의 판단이다.',
    },
    { id: 'akoum-vent-lava', kind: 'geyser', label: '마그마 간헐천', at: [1992, 551], size: 0.8, basis: VENT_BASIS, estimate: `${VENT_ESTIMATE} 이곳은 용암 들판 안의 마그마 간헐천이다.` },
    { id: 'akoum-vent-basin', kind: 'geyser', label: VENT_LABEL, at: [2140, 516], size: 0.8, basis: VENT_BASIS, estimate: `${VENT_ESTIMATE} 이곳은 백 년 가까이 이어진 라이프 블룸인 오라 온다르 남쪽의 결정 분지다.` },
    { id: 'akoum-vent-west', kind: 'geyser', label: VENT_LABEL, at: [1700, 505], size: 0.8, basis: VENT_BASIS, estimate: `${VENT_ESTIMATE} 이곳은 서부 내륙의 트인 땅이다.` },
    { id: 'akoum-vent-south', kind: 'geyser', label: VENT_LABEL, at: [1835, 598], size: 0.8, basis: VENT_BASIS, estimate: `${VENT_ESTIMATE} 이곳은 남부 해안 가까운 땅이다.` },
    // 바다에서 솟은 화산 유리 첨탑 — 홀로 선 바늘은 돛단배처럼 읽혀, 크기가 다른 두세 개를 한 무리로 둔다.
    // 북쪽 만의 것은 Eye of Ugin 자식 지도와 같은 자리이고, 만이 좁아 하나만 둔다
    { id: 'akoum-glass-spire-north-bay', kind: 'spire', label: COAST_LABEL, at: [1950, 373], size: 0.8, basis: COAST_BASIS, estimate: `${COAST_ESTIMATE} 북쪽 만의 것은 Eye of Ugin 자식 지도의 첨탑과 같은 자리다.` },
    { id: 'akoum-glass-spire-north', kind: 'spire', label: COAST_LABEL, at: [1796, 336], size: 0.8, basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-glass-spire-north-2', kind: 'spire', label: COAST_LABEL, at: [1804, 340], size: 0.5, basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-glass-spire-northwest', kind: 'spire', label: COAST_LABEL, at: [1655, 305], size: 0.75, basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-glass-spire-northwest-2', kind: 'spire', label: COAST_LABEL, at: [1647, 310], size: 0.5, basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-glass-spire-west', kind: 'spire', label: COAST_LABEL, at: [1455, 418], size: 0.85, basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-glass-spire-west-2', kind: 'spire', label: COAST_LABEL, at: [1462, 422], size: 0.55, basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-glass-spire-west-3', kind: 'spire', label: COAST_LABEL, at: [1449, 424], size: 0.45, basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-glass-spire-south', kind: 'spire', label: COAST_LABEL, at: [1702, 646], size: 0.75, basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-glass-spire-south-2', kind: 'spire', label: COAST_LABEL, at: [1710, 649], size: 0.5, basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-glass-spire-southeast', kind: 'spire', label: COAST_LABEL, at: [1990, 674], size: 0.75, basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-glass-spire-southeast-2', kind: 'spire', label: COAST_LABEL, at: [1998, 678], size: 0.5, basis: COAST_BASIS, estimate: COAST_ESTIMATE },
  ],
  sea: [
    // 물밑 결정 초 — 해도의 암초 표시. 동쪽 해안(그나마 안전한 쪽)에는 두지 않는다
    { id: 'akoum-reef-north-bay', kind: 'reef', label: REEF_LABEL, at: [1945, 368], extent: [5, 3], basis: COAST_BASIS, estimate: `${COAST_ESTIMATE} 북쪽 만 어귀의 것은 Eye of Ugin 자식 지도의 암초와 같은 자리다.` },
    { id: 'akoum-reef-north', kind: 'reef', label: REEF_LABEL, at: [1812, 334], extent: [12, 4], basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-reef-northwest', kind: 'reef', label: REEF_LABEL, at: [1504, 376], extent: [10, 4], basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-reef-west', kind: 'reef', label: REEF_LABEL, at: [1470, 430], extent: [10, 5], basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-reef-southwest', kind: 'reef', label: REEF_LABEL, at: [1550, 546], extent: [12, 5], basis: COAST_BASIS, estimate: COAST_ESTIMATE },
    { id: 'akoum-reef-south', kind: 'reef', label: REEF_LABEL, at: [1760, 634], extent: [16, 5], basis: COAST_BASIS, estimate: COAST_ESTIMATE },
  ],
}
