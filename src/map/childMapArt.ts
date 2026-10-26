// 자식 지도 그림 데이터의 모양 — 원본은 scripts/childmaps/art/<id>.js, 앱은 생성물 src/map/childmaps/<id>.ts 를 쓴다.
// 자식 지도 좌표는 세계 지도의 그 범위(PHASE1_CHILD_MAPS 의 bounds)를 size 로 늘린 것이다 — 해안·호수·숲과
// 장소 자리는 세계 지도에서 가져와 맞추고, 화가는 그 위에 지역의 지형·지형지물·이름과 작은 대상을 그린다.
// 지도 이름과 해석 안내는 머리말(세계 지도의 제목 상자)에 붙으므로 그림에는 넣지 않는다.
import type { Gated } from '../data/sagas'
import type { FigurePart } from './figures'
import type { Point } from './geometry'
import type { Anchor } from './labels'

/**
 * 지형 기호 칸의 종류 — 세계 지도와 같은 기호를 세계 지도의 잘게 뿌린 크기로 흩뿌린다 (childDetail.ts 의 detailTerrain).
 * 세계 지도에 같은 종류가 이어지면(맹그로브 숲, 툰드라, 수정 들판…) 그 종류를 써야 가장자리 띠에서 기호가 바뀌지 않는다
 */
export type ChildTerrainKind = 'mountain' | 'snow' | 'hill' | 'forest' | 'swamp' | 'canyon' | 'mangrove' | 'tundra' | 'crystal' | 'ice' | 'lava' | 'mesa' | PeriodTerrainKind

/**
 * 세계 지도의 페이즈 바탕(src/data/periods)을 옮겨 그리는 칸 — dust 흰 가루 평원, chalk 백악 흉터, drybed 물이 빠진 바닥, deadwood 죽은 숲.
 * 끔(0)에서는 그려지지 않는 페이즈 문을 붙이고, 시드 번호를 지키려 terrain 배열 끝에 붙인다. 기호와 몫(죽은 나무로 남기는 몫·마른 바닥의
 * 기하 무늬 몫)은 페이즈 조각이 늦게 준다(PeriodView.fine.kit) — 그 조각이 오기 전에는 detailTerrain 이 이 칸을 건너뛰고, 칸 열쇠(fineOverlay.keyFor)도
 * 그것을 갈라 조각이 오면 그 칸을 다시 만든다
 */
export type PeriodTerrainKind = 'dust' | 'chalk' | 'drybed' | 'deadwood'

/** 페이즈 문(PhaseGate)이 붙으면 그 페이즈에서만 뿌린다 (시점별 보기는 시점 열쇠 — sagas.ts 의 Gated·inView) */
export interface ChildTerrainArea extends Gated {
  kind: ChildTerrainKind
  /** 그림 단위의 다각형 */
  points: readonly Point[]
  /** 기호 밀도 배수 (1 = 기본). 수정은 0.7 아래면 낮은 기둥 무리로 */
  density?: number
}

/**
 * 페이즈 문(PhaseGate)과 그 셈(GATES·gateOf·inPhase·gated)은 src/data/sagas.ts 로 옮겼다 — 의존이 없어 Node 도구(scripts/childmaps)도 그대로 읽고,
 * 세계 지도의 페이즈 바탕(levels)을 문으로 옮기는 gatesFor·levelsOf 와 함께 둔다. 여기서는 다시 내보내기만 한다
 */
export { GATES, gateOf, gated, inPhase, inView, viewGated, viewGateOf, type Gated, type GateView, type PhaseGate, type TimeGate } from '../data/sagas'

/**
 * 페이즈 그림의 빈터 — 이 다각형 안에 밑동이 떨어지는 지형 기호는 그리지 않는다 (페이즈 문이 맞는 페이즈에서만, inPhase).
 * 칸을 바꾸지 않고 기호만 빼므로 다른 기호의 자리·모양은 어느 페이즈에서나 같다 — 나중에 더한 페이즈(페이즈2·3, 사가2)의 대상 자리에 쓴다
 */
export interface ChildClearing extends Gated {
  /** 그림 단위의 다각형 */
  points: readonly Point[]
  /**
   * 이 빈터가 자리를 비운 카드 id — 생성기가 원본의 끝 주석(`// card-id`)에서 읽는다. 시점 열쇠(time)는 이것으로 셈한다
   * (timeline.ts 의 forTimeGate). 앱은 읽지 않는다
   */
  for?: readonly string[]
  /**
   * 가장자리 띠에서도 바깥쪽(부모 그림·세계 지도)의 기호를 비운다 — 빈터가 이 그림의 띠에 걸치면 그 띠는 바깥쪽과 나눠 맡아 이 빈터가
   * 바깥쪽 기호에 닿지 않는다(띠 안 대상의 이름에 바깥쪽 나무가 얹힌다). 이 그림이 나와 있고 빈터가 켜진 보기에서만 (시점별 보기의 timeOnly 빈터와 같다)
   */
  outer?: true
}

/** 자식 지도에 쓰는 이름 — 공식 이름만 (docs/reference.md 의 자식 지도 근거). 페이즈 문이 있으면 그 페이즈에서만 (나중 페이즈의 큰 그림이 덮는 이름을 옮겨 달 때, inPhase) */
export interface ChildLabel extends Gated {
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
  /** 손으로 그린 지형지물 — 페이즈 그림과 같은 칠·잉크 계층. 페이즈 문이 있으면 그 페이즈에서만 (페이즈 그림의 받침 등, inPhase) */
  parts: readonly ({ cls: FigurePart; d: string } & Gated)[]
  labels: readonly ChildLabel[]
  /**
   * 작은 대상의 자리 — 카드 id → 그림 기준점·크기(자식 지도 단위).
   * label: 그 이름을 먼저 둘 쪽 — 이름은 그림 밑 → 오른쪽 → 왼쪽 차례로 빈 자리에 놓이는데 배치는 손그림(성벽·탑…)을 모른다.
   * 밑 이름이 손그림에 걸리면 비어 있는 쪽을 적는다: 그 쪽이 다른 이름·표시·그림에 막히지 않으면 어느 배율에서나 먼저 그 쪽에 둔다.
   * 세계 지도는 카드(phaseN.ts)의 label 로 배치하므로 둘은 같아야 한다 (to_ts.mjs 가 본다)
   */
  subjects: Readonly<Record<string, { at: Point; size: number; flip?: boolean; label?: Anchor }>>
  /** 세계 지도에서 온 장소·카드 표시의 이름을 둘 쪽 (장소 id 또는 'card:카드id' → 쪽) — 없으면 오른쪽 */
  markAnchors?: Readonly<Record<string, Anchor>>
  /** 휴대폰처럼 세로로 긴 화면의 첫 보기가 가운데에 둘 자리 — 없으면 작은 대상들의 가운데 */
  focus?: Point
  /** 해안 물결선을 그리지 않는다 (그림이 바다 물결을 따로 그릴 때) */
  ripples?: false
}
