// 자식 지도 그림 데이터의 모양 — 원본은 scripts/childmaps/art/<id>.js, 앱은 생성물 src/map/childmaps/<id>.ts 를 쓴다.
// 자식 지도 좌표는 세계 지도의 그 범위(PHASE1_CHILD_MAPS 의 bounds)를 size 로 늘린 것이다 — 해안·호수·숲과
// 장소 자리는 세계 지도에서 가져와 맞추고, 화가는 그 위에 지역의 지형·지형지물·이름과 작은 대상을 그린다.
// 지도 이름과 해석 안내는 머리말(세계 지도의 제목 상자)에 붙으므로 그림에는 넣지 않는다.
import type { FigurePart } from './figures'
import type { Point } from './geometry'
import type { Anchor } from './labels'

/**
 * 지형 기호 칸의 종류 — 세계 지도와 같은 기호를 세계 지도의 잘게 뿌린 크기로 흩뿌린다 (childDetail.ts 의 detailTerrain).
 * 세계 지도에 같은 종류가 이어지면(맹그로브 숲, 툰드라, 수정 들판…) 그 종류를 써야 가장자리 띠에서 기호가 바뀌지 않는다
 */
export type ChildTerrainKind = 'mountain' | 'snow' | 'hill' | 'forest' | 'swamp' | 'canyon' | 'mangrove' | 'tundra' | 'crystal' | 'ice' | 'lava' | 'mesa'

export interface ChildTerrainArea {
  kind: ChildTerrainKind
  /** 그림 단위의 다각형 */
  points: readonly Point[]
  /** 기호 밀도 배수 (1 = 기본). 수정은 0.7 아래면 낮은 기둥 무리로 */
  density?: number
  /**
   * 페이즈에 따라서만 — true 면 페이즈를 켰을 때만(페이즈1·2), false 면 껐을 때만 뿌린다.
   * 페이즈 그림 자리를 비워 둔 빈터는 true 인 칸으로 두고, 페이즈를 끄면 그 자리를 채울 칸을 false 로 둔다
   */
  phase?: boolean
  /** 페이즈2(WWK) 그림의 빈터 — true 면 페이즈2 에서만, false 면 페이즈2 가 아닐 때만 뿌린다 (phase 와 함께 있으면 둘 다 맞을 때) */
  phase2?: boolean
}

/** 페이즈 단계(0: 끔, 1, 2)에서 그리는가 — phase·phase2 가 붙은 칸·부분은 그 단계 이상인지가 맞을 때만 */
export const inPhase = (a: { phase?: boolean; phase2?: boolean }, level: number): boolean =>
  (a.phase === undefined || a.phase === level >= 1) && (a.phase2 === undefined || a.phase2 === level >= 2)

/**
 * 페이즈 그림의 빈터 — 이 다각형 안에 밑동이 떨어지는 지형 기호는 그리지 않는다 (phase·phase2 가 맞는 페이즈에서만, inPhase).
 * 칸을 바꾸지 않고 기호만 빼므로 다른 기호의 자리·모양은 어느 페이즈에서나 같다 — 나중에 더한 페이즈(페이즈2)의 대상 자리에 쓴다
 */
export interface ChildClearing {
  /** 그림 단위의 다각형 */
  points: readonly Point[]
  phase?: boolean
  phase2?: boolean
}

/** 자식 지도에 쓰는 이름 — 공식 이름만 (docs/reference.md 의 자식 지도 근거) */
export interface ChildLabel {
  text: string
  /** 공식 한국어판 카드에 인쇄된 이름이 있으면 */
  textKo?: string
  at: Point
  /** 글자 크기 (자식 지도 단위) — 화면에서는 11~34px 사이로 묶인다 */
  size: number
  /** place: 바로 선 글자, area: 기운 글자(지역), water: 물빛 기운 글자 */
  kind: 'place' | 'area' | 'water'
  rotate?: number
}

export interface ChildMapArt {
  id: string
  /** 자식 지도 좌표 크기 [너비, 높이] — 세계 지도 범위와 가로세로 비율이 같아야 한다 */
  size: readonly [number, number]
  /** 지형 기호를 흩뿌릴 다각형 (산·언덕·숲·늪·협곡) */
  terrain: readonly ChildTerrainArea[]
  /** 기호 크기 배수 — 세계 지도 기호 모양을 이만큼 키운다 */
  glyphScale: number
  /** 페이즈 그림 자리의 빈터 — 그 페이즈에서 이 안의 지형 기호만 뺀다 */
  clearings?: readonly ChildClearing[]
  /** 손으로 그린 지형지물 — 페이즈 그림과 같은 칠·잉크 계층. phase·phase2 가 있으면 그 페이즈에서만 (페이즈 그림의 받침 등, inPhase) */
  parts: readonly { cls: FigurePart; d: string; phase?: boolean; phase2?: boolean }[]
  labels: readonly ChildLabel[]
  /** 작은 대상의 자리 — 카드 id → 그림 기준점·크기(자식 지도 단위) */
  subjects: Readonly<Record<string, { at: Point; size: number; flip?: boolean }>>
  /** 세계 지도에서 온 장소·카드 표시의 이름을 둘 쪽 (장소 id 또는 'card:카드id' → 쪽) — 없으면 오른쪽 */
  markAnchors?: Readonly<Record<string, Anchor>>
  /** 휴대폰처럼 세로로 긴 화면의 첫 보기가 가운데에 둘 자리 — 없으면 작은 대상들의 가운데 */
  focus?: Point
  /** 해안 물결선을 그리지 않는다 (그림이 바다 물결을 따로 그릴 때) */
  ripples?: false
}
