// 배율 단계와 지역 상세의 축척 셈 — 앱(useMapZoom.ts·childDetail.ts)과 Node 의 검사 도구(scripts/childmaps/to_ts.mjs·context.mjs)가 함께 쓴다.
// 아무것도 import 하지 않는다 (Node 가 .ts 를 그대로 읽는다)

/**
 * 화면 1px 당 지도 단위가 커질수록 더 많은 라벨을 보여 준다.
 * tier 경계는 "라벨 글자가 화면에서 읽을 만한 크기가 되는 배율"이다.
 * 0 단계(0.3 미만)는 휴대폰에서 세계 전체를 볼 때만 나온다.
 * 4 단계(2.6) 위로는 배율이 두 배가 될 때마다 한 단계 — 깊이 들어갈수록 작은 대상(사람만 한 그림)과 지역 상세의 이름이 자리를 받는다
 */
export const TIER_PX_PER_UNIT = [0, 0.3, 0.95, 1.6, 2.6, 5.2, 10.4, 20.8, 41.6, 83.2]

/**
 * 깊은 확대가 시작되는 tier — 여기부터 해안을 한 번 더 다듬어 그리고, 지형 기호를 잘게 다시 뿌리고(배율이 두 배가 될 때마다 반 크기),
 * 지역 상세(자식 지도였던 그림)가 나온다
 */
export const DEEP_TIER = 5

/** 지역 상세는 그림 1 단위가 화면에서 이만큼(px)은 될 때부터 — 따로 열던 지역 지도의 첫 보기(약 1px)보다 조금 앞서 */
export const SHOW_PX_PER_CHILD_UNIT = 0.6

/** 그림 단위 ÷ 세계 지도 단위가 s 인 지역 상세가 나오는 tier — 그림 1 단위가 화면 0.6px 이상이 되는 첫 tier (DEEP_TIER 보다 먼저는 아니다) */
export function detailTierOf(s: number): number {
  const need = SHOW_PX_PER_CHILD_UNIT * s
  const first = TIER_PX_PER_UNIT.findIndex((px) => px >= need)
  return Math.max(DEEP_TIER, first < 0 ? TIER_PX_PER_UNIT.length - 1 : first)
}

/**
 * 가장자리 섞는 띠의 폭 (지도 단위) — 범위 안쪽에 둔다. 짧은 변의 12%, 6~24 단위.
 * 이 띠에서 지역 상세의 그림은 바깥쪽으로 옅어지고 세계 지도(더 깊은 지역 상세면 부모 그림)의 선은 짙어지며, 지형 기호는 자리마다 섞어 맡는다
 */
export function detailBandOf(b: { x0: number; y0: number; x1: number; y1: number }): number {
  return Math.min(24, Math.max(6, 0.12 * Math.min(b.x1 - b.x0, b.y1 - b.y0)))
}
