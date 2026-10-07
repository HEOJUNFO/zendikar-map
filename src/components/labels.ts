import type { LandscapeFeature } from '../data'
import type { LocationKind, Placement, Terrain } from '../data/types'

export const KIND_LABEL: Record<LocationKind, string> = {
  settlement: '정착지',
  ruin: '유적',
  landmark: '지형지물',
  sky: '하늘 폐허',
  underground: '지하 유적',
  region: '지역',
  water: '물길',
}

export const TERRAIN_LABEL: Record<Terrain, string> = {
  forest: '숲',
  mountain: '산지',
  swamp: '늪지',
  plain: '평원',
  plateau: '고원',
  canyon: '협곡',
  ice: '빙원',
  volcanic: '화산 지대',
  sea: '바다',
  river: '강',
}

export const PLACEMENT_NOTE: Record<Placement, string> = {
  'fan-map': '위치는 참고한 팬 지도의 표기를 따랐습니다. 공식 설정과 어긋나지 않는 것만 옮겼습니다.',
  'canon-hint': '공식 설정의 위치 서술을 근거로 자리를 잡은 추정 위치입니다.',
  estimate: '공식 설정은 정확한 자리를 밝히지 않아, 이 지도가 자리를 골랐습니다.',
  unplaced: '공식 설정은 어느 대륙인지까지만 밝힙니다. 자리를 지어내지 않으려고 지도에는 표시하지 않았습니다.',
}

/** 바탕 지형의 종류 이름 — 지형에 label 이 없을 때 패널에 쓴다 */
export const LANDSCAPE_KIND_LABEL: Record<LandscapeFeature['kind'], string> = {
  forest: '숲',
  swamp: '늪',
  mangrove: '물에 뿌리박은 숲',
  mountain: '산줄기',
  hills: '언덕',
  plain: '트인 땅',
  mesa: '대지(메사)',
  canyon: '협곡 지대',
  ice: '빙원',
  crystal: '수정 첨탑 들판',
  lava: '용암 들판',
  tundra: '툰드라',
  river: '강',
  cliff: '절벽',
  gorge: '협곡',
  volcano: '화산',
  caldera: '초화산 분화구',
  waterfall: '폭포',
  geyser: '간헐천·온천',
  pit: '수직 동굴',
  spire: '첨탑',
  'floating-rock': '떠 있는 바위',
  urn: '떠 있는 돌 항아리',
  'sea-ice': '유빙',
  whirl: '소용돌이',
  reef: '암초',
  rough: '거친 물결',
}
