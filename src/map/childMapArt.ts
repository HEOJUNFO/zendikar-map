// 자식 지도 그림 데이터의 모양 — 원본은 scripts/childmaps/art/<id>.js, 앱은 생성물 src/map/childmaps/<id>.ts 를 쓴다.
// 자식 지도 좌표는 세계 지도의 그 범위(PHASE1_CHILD_MAPS 의 bounds)를 size 로 늘린 것이다 — 해안·호수·숲과
// 장소 자리는 세계 지도에서 가져와 맞추고, 화가는 그 위에 지역의 지형·지형지물·이름과 작은 대상을 그린다.
// 지도 이름과 해석 안내는 머리말(세계 지도의 제목 상자)에 붙으므로 그림에는 넣지 않는다.
import { sagaStart } from '../data/sagas'
import type { FigurePart } from './figures'
import type { Point } from './geometry'
import type { Anchor } from './labels'

/**
 * 지형 기호 칸의 종류 — 세계 지도와 같은 기호를 세계 지도의 잘게 뿌린 크기로 흩뿌린다 (childDetail.ts 의 detailTerrain).
 * 세계 지도에 같은 종류가 이어지면(맹그로브 숲, 툰드라, 수정 들판…) 그 종류를 써야 가장자리 띠에서 기호가 바뀌지 않는다
 */
export type ChildTerrainKind = 'mountain' | 'snow' | 'hill' | 'forest' | 'swamp' | 'canyon' | 'mangrove' | 'tundra' | 'crystal' | 'ice' | 'lava' | 'mesa'

/** 페이즈 문(PhaseGate)이 붙으면 그 페이즈에서만 뿌린다 */
export interface ChildTerrainArea extends PhaseGate {
  kind: ChildTerrainKind
  /** 그림 단위의 다각형 */
  points: readonly Point[]
  /** 기호 밀도 배수 (1 = 기본). 수정은 0.7 아래면 낮은 기둥 무리로 */
  density?: number
}

/**
 * 페이즈 문 — 붙은 칸·빈터·부분은 그 페이즈가 켜졌는지(이어 센 번호 n 이 켜졌다 = 같은 사가에서 페이즈 n 이상)가 값과 맞을 때만 그린다.
 * phase(1)·phase2·phase3 은 사가1(엘드라지의 깨어남), phase4·phase5 는 사가2(젠디카르 전투)의 페이즈1·2 — 다른 사가를 켜면 그 사가를 끈 것처럼 본다
 * (사가를 넘어가면 앞 사가의 그림 자리를 비우지 않는다). 페이즈 그림 자리를 비워 둔 빈터는 true, 페이즈를 끄면 그 자리를 채울 칸은 false 로 둔다.
 * 여럿이 붙으면 모두 맞을 때
 */
export interface PhaseGate {
  phase?: boolean
  phase2?: boolean
  phase3?: boolean
  phase4?: boolean
  phase5?: boolean
}
/** 페이즈 문의 이름과 그 페이즈 (이어 센 번호) */
export const GATES = [['phase', 1], ['phase2', 2], ['phase3', 3], ['phase4', 4], ['phase5', 5]] as const

/** 붙은 페이즈 문만 (세계 지도 단위로 옮길 때 그대로 넘긴다) */
export const gateOf = (a: PhaseGate): PhaseGate => Object.fromEntries(GATES.filter(([k]) => a[k] !== undefined).map(([k]) => [k, a[k]]))

/** 페이즈 단계(0: 끔, sagas.ts 의 이어 센 번호)에서 그리는가 */
export const inPhase = (a: PhaseGate, level: number): boolean =>
  GATES.every(([k, n]) => a[k] === undefined || a[k] === (sagaStart(level) <= n && n <= level))

/** 페이즈 문이 붙었나 (inPhase 가 페이즈마다 달라질 수 있다) */
export const gated = (a: PhaseGate) => GATES.some(([k]) => a[k] !== undefined)

/**
 * 페이즈 그림의 빈터 — 이 다각형 안에 밑동이 떨어지는 지형 기호는 그리지 않는다 (페이즈 문이 맞는 페이즈에서만, inPhase).
 * 칸을 바꾸지 않고 기호만 빼므로 다른 기호의 자리·모양은 어느 페이즈에서나 같다 — 나중에 더한 페이즈(페이즈2·3, 사가2)의 대상 자리에 쓴다
 */
export interface ChildClearing extends PhaseGate {
  /** 그림 단위의 다각형 */
  points: readonly Point[]
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
  /** 손으로 그린 지형지물 — 페이즈 그림과 같은 칠·잉크 계층. 페이즈 문이 있으면 그 페이즈에서만 (페이즈 그림의 받침 등, inPhase) */
  parts: readonly ({ cls: FigurePart; d: string } & PhaseGate)[]
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
