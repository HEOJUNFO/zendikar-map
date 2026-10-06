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
  unplaced: '공식 설정은 어느 대륙인지까지만 밝힙니다. 자리를 지어내지 않으려고 지도에는 표시하지 않았습니다.',
}
