// 지역 상세(자식 지도) — 작은 대상이 모였거나 자리가 붐비는 지역을 큰 축척으로 따로 그린 그림. 세계 지도를 깊이 확대하면 그 자리에 나온다.
// 그림은 scripts/childmaps/art/<id>.js → src/map/childmaps/<id>.ts (node scripts/childmaps/to_ts.mjs). 이 파일이 원본이다 — 손으로 고친다.
// 그림 좌표는 bounds 를 그림 크기(size)로 늘린 것이라 해안·호수·숲, 장소·카드 표시의 자리가 세계 지도와 맞는다.
// 페이즈와 상관없이 나오고, 그 안의 작은 대상(페이즈1 카드의 childMap)만 페이즈1을 켰을 때 그린다.

export interface ChildMap {
  id: string
  /** 그 지역의 장소(locations.ts id) — 이름은 이 장소의 이름. 이름 뒤에 접힌 지도 아이콘이 붙고, 장소 패널의 '가까이 보기'가 이 범위로 간다 */
  place: string
  /** 지역 상세가 그리는 범위 (세계 지도 단위) — 이 범위의 해안·장소 자리를 가져와 늘려 그린다 */
  bounds: { x0: number; y0: number; x1: number; y1: number }
  /** 해석 안내 — 공식 서술 가운데 이 그림이 따른 것과 이 지도의 판단으로 그린 것 (장소 패널에 보인다) */
  note?: string
}

export const CHILD_MAPS: ChildMap[] = [
  {
    id: 'eye-of-ugin',
    place: 'eye-of-ugin',
    bounds: { x0: 1846, y0: 295, x1: 2014, y1: 427 },
    note: '구덩이는 2015–16년 공식 묘사를, 강·협곡은 세계 지도를 따랐고 산세·그림 자리는 지도의 해석입니다.',
  },
  {
    id: 'malakir',
    place: 'malakir',
    bounds: { x0: 1823, y0: 1036, x1: 1991, y1: 1156 },
    note: '구역의 방위·성벽·제방과 그림들의 자리는 해석이고, 문지기·함정·null은 2009년 모습입니다.',
  },
  {
    id: 'tangled-vales',
    place: 'tangled-vales',
    bounds: { x0: 2081, y0: 940, x1: 2243, y1: 1060 },
    note: '숲의 짙고 옅음, 빈터·헤드론·절벽 위 늪과 인물·짐승·나무의 자리는 이 지도의 해석입니다.',
  },
  {
    id: 'makindi-trenches',
    place: 'makindi-trenches',
    bounds: { x0: 269, y0: 898, x1: 437, y1: 1018 },
    note: '협곡 갈래·물길·거처·봉우리와 인물·짐승·무너지는 마을의 자리는 이 지도의 해석입니다.',
  },
  {
    id: 'jwar-isle',
    place: 'jwar-isle',
    bounds: { x0: 173, y0: 1486, x1: 254.6, y1: 1542.4 },
    note: '파둔·절벽·상륙 해변·바다뱀·탐험가·성직자의 자리와 하늘거주지 잔해의 모양은 이 지도의 해석입니다.',
  },
  {
    id: 'halimar',
    place: 'halimar',
    bounds: { x0: 869, y0: 433, x1: 1169, y1: 682.6 },
    note: '2020년 무렵을 그렸고, 등대·기념비·뱃길·인물과 짐승의 자리, 협곡과 섬의 모양은 이 지도의 해석입니다.',
  },
  {
    id: 'kabira',
    place: 'kabira',
    bounds: { x0: 290.6, y0: 1496.8, x1: 463.4, y1: 1640.8 },
    note: 'Crypt 협곡 갈래, 습지 범위, 카비라 건물·길, 헤드론·흙 원반, 그림 자리는 이 지도의 해석입니다.',
  },
  {
    id: 'tal-terig',
    place: 'tal-terig',
    bounds: { x0: 1674.4, y0: 250.6, x1: 1842.4, y1: 394.6 },
    note: '산줄기·결정 가시·골짜기·굴·길과 그림들의 자리는 이 지도의 해석입니다.',
  },
  {
    id: 'kazandu',
    place: 'kazandu',
    bounds: { x0: 1222, y0: 1338, x1: 1512, y1: 1585 },
    note: '벼랑·강·고원의 자리는 세계 지도를 따랐고, 자디 나무·굴 입구·돌기둥과 그림들의 자리는 이 지도의 해석입니다.',
  },
  {
    id: 'hagra-cistern',
    place: 'hagra-cistern',
    bounds: { x0: 1517, y0: 945, x1: 1717, y1: 1095 },
    note: '강·늪숲·카르스트는 세계 지도를 따랐고, 유적과 웅덩이·그림의 자리는 이 지도의 해석입니다.',
  },
  {
    id: 'turntimber',
    place: 'turntimber',
    bounds: { x0: 197, y0: 1313, x1: 440, y1: 1482 },
    note: '나선 나무·빈터·해시계 언덕의 모양과 자리, 여섯 그림의 자리는 이 지도의 해석입니다.',
  },
  {
    id: 'ora-ondar',
    place: 'ora-ondar',
    bounds: { x0: 2080, y0: 205, x1: 2316, y1: 405 },
    note: '폭포 속 꽃은 2016년 묘사를 따랐고, 단의 모양·식물·거처와 그림들의 자리는 이 지도의 해석입니다.',
  },
  {
    id: 'affa',
    place: 'affa',
    bounds: { x0: 1790, y0: 430, x1: 1920, y1: 520 },
    note: '2016년 이후 모습은 알려지지 않아 그 무렵을 그렸고, 건물·언덕·굴·길과 그림들의 자리는 이 지도의 해석입니다.',
  },
  {
    id: 'the-sunspring',
    place: 'the-sunspring',
    bounds: { x0: 680, y0: 505, x1: 868, y1: 664 },
    note: '샘 자리와 지류는 세계 지도의 추정을 따랐고, 샘·독수리 모양과 벼랑·성벽·노두·그림 자리는 이 지도의 해석입니다.',
  },
  {
    id: 'skyfang-mountains',
    place: 'skyfang-mountains',
    bounds: { x0: 920, y0: 1255, x1: 1220, y1: 1505 },
    note: '봉우리 배치, 협곡 길의 방향, 더 그린 이빨, 다섯 그림의 자리는 이 지도의 해석입니다.',
  },
  {
    id: 'glasspool',
    place: 'glasspool',
    bounds: { x0: 2095, y0: 460, x1: 2275, y1: 595 },
    note: '호수를 두른 산과 고갯길, 물속 유적의 꼴과 그림 자리는 이 지도의 해석입니다.',
  },
  {
    id: 'zof-marsh',
    place: 'zof-marsh',
    bounds: { x0: 1255, y0: 845, x1: 1465, y1: 1020 },
    note: '나선과 잠긴 구조물의 모양, 웅덩이, 타르 구덩이와 두 그림의 자리는 해석입니다.',
  },
  {
    id: 'free-city-of-nimana',
    place: 'free-city-of-nimana',
    bounds: { x0: 1442, y0: 1100, x1: 1740, y1: 1325 },
    note: '시가지·부두·배·시장 거리와 천막, Lulea 오두막, 그림의 자리는 이 지도의 해석입니다.',
  },
  {
    id: 'ikiral',
    place: 'ikiral',
    bounds: { x0: 1255, y0: 0, x1: 1510, y1: 215 },
    note: '헤드론의 크기와 돌집 배치, 배 대는 곳과 갈지자길의 자리는 이 지도의 해석입니다.',
  },
]
