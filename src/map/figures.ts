// 페이즈 그림 — 판타지 지도처럼 지도 위에 그려 넣는 대상(바다 괴물·천사·짐승·인물…).
// 잉크 선과 양피지 채움으로 지도의 산·숲 기호와 같은 화풍을 쓰고, 지도 단위로 함께 확대·축소된다.
// 카드 그림을 베끼지 않은 지도용 그림이다. 자리·크기는 src/data/phase1.ts~phase5.ts 에 있다.
// 생성물 — scripts/figures/art/*.js 를 고친 뒤 `node scripts/figures/to_ts.mjs > src/map/figures.ts` 로 다시 만든다 (그림은 src/map/figures/<묶음>.ts 에 함께 쓴다).
import { sagaLevels } from '../data/sagas'
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
 * 그림 묶음 — 세계 지도 그림은 크기 띠마다 world(개관 어디서나 그려지는 큰 그림)·world-mid·world-small, 더 가까이에서만 그려지는 작은 그림은
 * 자리 칸마다 world-near-x<칸>y<칸>, 지역 상세에 사는 작은 대상은 지역 상세 id. 페이즈2부터의 그림은 world-2·world-near-x1y2-2·<지역 상세 id>-2 … 에 따로 싣는다.
 * 그림마다의 묶음과 상자는 figures/frames.json — 페이즈 카드의 지도 조각(frame·group)에 붙어 온다
 */
const FILES = import.meta.glob<{ default: Record<string, FigureArt> }>('./figures/*.ts')
export const FIGURE_GROUPS: readonly string[] = ['kazandu-2', 'world-mid-2', 'glasspool', 'world-near-x4y2-4', 'kabira', 'world-near-x0y2-2', 'affa-3', 'kabira-2', 'world-near-x5y0-2', 'world-small-3', 'world-near-x4y1-4', 'world-mid-4', 'affa-4', 'halimar-4', 'tal-terig-2', 'world-near-x2y2-3', 'world-small-4', 'world-near-x3y1-3', 'eye-of-ugin-2', 'world-near-x5y2-2', 'tal-terig', 'halimar', 'world-small-2', 'world-near-x1y2', 'world-near-x5y2-3', 'world-mid-3', 'makindi-trenches-3', 'world-near-x5y1-3', 'tangled-vales', 'world-small', 'world-near-x4y1-2', 'world-near-x2y0-3', 'world-near-x4y1-3', 'affa-2', 'turntimber-3', 'tangled-vales-3', 'kazandu-4', 'malakir', 'world-near-x4y3', 'zof-marsh-4', 'world-near-x4y2', 'world-near-x3y2', 'world-near-x4y3-2', 'hagra-cistern-3', 'free-city-of-nimana-3', 'zof-marsh', 'ikiral', 'world-near-x2y1-4', 'world-near-x4y2-2', 'world-near-x5y2-4', 'kabira-3', 'malakir-2', 'zof-marsh-3', 'world-near-x2y2-2', 'world-near-x1y1', 'world-near-x2y3-2', 'skyfang-mountains', 'malakir-4', 'world-near-x2y1', 'world-near-x2y1-2', 'world-near-x2y1-3', 'eye-of-ugin', 'coralhelm-4', 'world-near-x1y3-2', 'world-near-x2y2-4', 'turntimber', 'world-near-x3y3-3', 'world-near-x4y2-3', 'skyfang-mountains-3', 'free-city-of-nimana', 'world-near-x0y2-3', 'world-near-x3y1-4', 'world-near-x4y3-3', 'world-near-x1y1-3', 'world-near-x3y2-2', 'world-near-x3y0-2', 'world-near-x0y2', 'world-near-x3y2-3', 'world-near-x2y3-3', 'hagra-cistern', 'makindi-trenches', 'ora-ondar', 'jwar-isle-2', 'world-near-x1y3-3', 'eye-of-ugin-4', 'malakir-3', 'world-near-x3y0-3', 'world-near-x1y2-3', 'world-3', 'halimar-2', 'world-near-x5y0-3', 'the-sunspring', 'free-city-of-nimana-4', 'world-near-x1y2-2', 'world-near-x4y0-3', 'world-mid', 'kabira-4', 'world-near-x1y3-4', 'kazandu', 'affa', 'world-near-x5y3-2', 'world-near-x0y2-4', 'world-near-x4y0-2', 'world-near-x3y3-4', 'hagra-cistern-4', 'glasspool-2', 'world-near-x3y4-2', 'world-near-x0y4-3', 'world-near-x4y0-4', 'ikiral-3', 'world-near-x2y3-4', 'world-near-x3y4', 'skyfang-mountains-2', 'jwar-isle-3', 'kazandu-3', 'makindi-trenches-4', 'world-near-x1y0-3', 'world-near-x1y3', 'glasspool-3', 'ora-ondar-2', 'world', 'world-near-x3y4-3', 'jwar-isle', 'free-city-of-nimana-2', 'world-near-x1y2-4', 'ikiral-2', 'world-near-x3y2-4', 'world-near-x0y3-3', 'world-near-x4y1', 'eye-of-ugin-3', 'sea-gate-4', 'tal-terig-3', 'world-near-x3y3-2', 'zof-marsh-2', 'skyfang-mountains-4', 'world-near-x3y1', 'tal-terig-4', 'world-near-x3y1-2', 'world-near-x2y2', 'world-near-x2y4-3', 'turntimber-2', 'world-near-x5y2', 'world-near-x3y0', 'world-near-x5y1-2', 'world-near-x5y1-4', 'world-4', 'world-near-x1y1-2', 'world-near-x3y0-4', 'world-near-x1y0-2', 'the-sunspring-4', 'world-2']

/** 페이즈마다 가장 큰 그림 묶음 (이어 센 페이즈 번호 → 묶음) */
const LEAD_GROUPS: Readonly<Record<number, string>> = { 1: 'world', 2: 'world-2', 3: 'world-3', 4: 'world-4' }

/** 페이즈 phase 의 가장 큰 그림 묶음 — 그 사가의 첫 페이즈부터 phase 까지. 어느 화면에서든 개관에 그려져, 페이즈를 켜면 카드 데이터와 함께 받기 시작한다 */
export const leadGroups = (phase: number): string[] => sagaLevels(phase).flatMap((p) => (LEAD_GROUPS[p] ? [LEAD_GROUPS[p]] : []))

/** 그림 묶음 하나를 불러온다 (카드 id → 그림) */
export function loadFigureGroup(group: string): Promise<Record<string, FigureArt>> {
  const file = FILES[`./figures/${group}.ts`]
  return file ? file().then((m) => m.default) : Promise.reject(new Error(`페이즈 그림 묶음 '${group}' 이 없다`))
}
