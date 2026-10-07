// 지점 마커 기호 — 지도와 범례가 같은 모양을 쓴다. 좌표는 화면 px (마커는 역배율로 크기 고정)
import type { LocationKind } from '../data/types'

export type PointKind = Exclude<LocationKind, 'region' | 'water'>

export const MARKER_PATHS: Record<PointKind, string> = {
  // 지붕 얹은 집
  settlement: 'M-3.8 -2.4H3.8V4H-3.8ZM-4.6 -2.2 0 -6.4 4.6 -2.2',
  // 무너진 아치
  ruin: 'M-4.2 4V-2.6Q0 -6.6 4.2 -2.6V0.4M-1.6 4V-0.6Q0 -2.2 1.6 -0.6V4M-5.4 4H5.4',
  // 마름모
  landmark: 'M0 -5 3.4 0 0 5-3.4 0Z',
  // 떠 있는 판석과 그 위 구름 선
  sky: 'M-5.4 -0.6H5.4L2.4 3.4H-2.4ZM-3.6 -3.6H3.6',
  // 땅속으로 열린 입구 (속이 빈 아치)
  underground: 'M-5 3.6V0Q-5 -4.6 0 -4.6Q5 -4.6 5 0V3.6ZM-2.2 3.6V1Q-2.2 -1.5 0 -1.5Q2.2 -1.5 2.2 1V3.6Z',
}

export const HEDRON_LEGEND_PATH = 'M0 -8 2.6 0.6 0 7.4-2.6 0.6Z'

/**
 * 접힌 지도 — 지역 지도(자식 지도)가 있다는 표시. 패널의 '지역 지도 보기' 단추, 페이즈1 세계 지도의 이름 뒤 아이콘, 범례가 같은 모양을 쓴다.
 * 좌표는 0~20 상자 (그림은 x 2.5~17.5, y 3~17)
 */
export const CHILD_MAP_ICON = 'M2.5 5 7.5 3 12.5 5 17.5 3V15L12.5 17 7.5 15 2.5 17ZM7.5 3V15M12.5 5V17'
/** 접힌 지도의 가운데 칸 — 작게 그릴 때 조금 어둡게 칠해 접힌 자리가 보이게 */
export const CHILD_MAP_ICON_FOLD = 'M7.5 3 12.5 5V17L7.5 15Z'
