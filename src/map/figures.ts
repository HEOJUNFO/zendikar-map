// 페이즈 그림 — 판타지 지도처럼 지도 위에 그려 넣는 대상(바다 괴물·천사·짐승·인물…).
// 잉크 선과 양피지 채움으로 지도의 산·숲 기호와 같은 화풍을 쓰고, 지도 단위로 함께 확대·축소된다.
// 카드 그림을 베끼지 않은 지도용 그림이다. 자리·크기는 src/data/phase1.ts·phase2.ts 에 있다.
// 생성물 — scripts/figures/art/*.js 를 고친 뒤 `node scripts/figures/to_ts.mjs > src/map/figures.ts` 로 다시 만든다 (그림은 src/map/figures/<묶음>.ts 에 함께 쓴다).
import type { Point } from './geometry'

export type FigurePart = 'fill' | 'shade' | 'stone' | 'forest' | 'sea' | 'fire' | 'blood' | 'gold' | 'dark' | 'hatch' | 'ink' | 'ink-bold' | 'fire-ink' | 'sea-ink'

export interface FigureArt {
  /** 그림 자체의 좌표 상자 [x, y, 너비, 높이] */
  viewBox: readonly [number, number, number, number]
  /** 지도 위 자리에 놓이는 점 (발밑·몸 가운데) */
  anchor: Point
  /** 아래부터 차례로 그린다 — 채움, 해칭, 잉크 선 */
  parts: readonly { cls: FigurePart; d: string }[]
}

/**
 * 그림 묶음 — world(개관에서도 그려지는 세계 지도 그림), world-near(더 가까이에서 그려지는 세계 지도 그림)와 지역 상세 id (그 지역 상세에 사는 작은 대상).
 * 페이즈2부터의 세계 지도 그림은 world-2·world-near-2 … 에 따로 싣는다
 */
const FILES = import.meta.glob<{ default: Record<string, FigureArt> }>('./figures/*.ts')
export const FIGURE_GROUPS: readonly string[] = ['kazandu', 'world-2', 'glasspool', 'kabira', 'tal-terig', 'halimar', 'world-near', 'tangled-vales', 'world', 'malakir', 'zof-marsh', 'ikiral', 'skyfang-mountains', 'eye-of-ugin', 'turntimber', 'free-city-of-nimana', 'hagra-cistern', 'makindi-trenches', 'ora-ondar', 'the-sunspring', 'affa', 'jwar-isle']

/** 페이즈 phase 까지의 세계 지도 그림 묶음 (있는 것만) — kind 가 world 면 개관 그림, world-near 면 더 가까이에서 그려지는 그림 */
export function worldGroups(kind: 'world' | 'world-near', phase: number): string[] {
  const names: string[] = [kind]
  for (let p = 2; p <= phase; p++) names.push(`${kind}-${p}`)
  return names.filter((g) => FIGURE_GROUPS.includes(g))
}

/** 그림 묶음 하나를 불러온다 (카드 id → 그림) */
export function loadFigureGroup(group: string): Promise<Record<string, FigureArt>> {
  const file = FILES[`./figures/${group}.ts`]
  return file ? file().then((m) => m.default) : Promise.reject(new Error(`페이즈 그림 묶음 '${group}' 이 없다`))
}
