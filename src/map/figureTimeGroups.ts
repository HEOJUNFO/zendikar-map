// 시점별 보기(src/data/timeline.ts)의 그림 묶음 — 세트 시점이 아닌 시점에 옮겨 그리는 그림(오래 사는 대상)만 따로 실은 묶음
// src/map/figures-time/<띠|지역 상세 id>-t<시점들>.ts (scripts/figures/to_ts.mjs 가 만든다). 사가 보기의 묶음은 figures.ts 그대로이고,
// 이 파일은 두 가지 묶음을 하나처럼 다루게 한다 — 카드마다 어느 묶음에서 받는지는 timeline.ts 의 figureGroupAt.
// 시점별 묶음의 파일 목록(figureTimeFiles.ts)은 시점별 보기에서만 받는 조각이라, 여기서는 이름 꼴로만 가린다
import { FIGURE_GROUPS, loadFigureGroup, type FigureArt } from './figures'

/** 시점별 묶음의 이름 꼴 — '<띠|지역 상세 id>-t<세트 시점이 아닌 시점들>' */
const TIME_GROUP = /-t[1-4]+$/
const timeFiles = () => import('./figureTimeFiles')

/** 받을 수 있는 그림 묶음인가 — 사가 보기의 묶음이나 시점별 묶음 (시점별 묶음이 실제로 없으면 불러올 때 실패한다) */
export const isFigureGroup = (g: string): boolean => TIME_GROUP.test(g) || FIGURE_GROUPS.includes(g)

/** 그림 묶음 하나를 불러온다 (카드 id → 그림) — 시점별 묶음이면 figures-time 에서, 아니면 figures.ts 의 loadFigureGroup */
export function loadAnyFigureGroup(g: string): Promise<Record<string, FigureArt>> {
  return TIME_GROUP.test(g) ? timeFiles().then((m) => m.loadTimeFigureGroup(g)) : loadFigureGroup(g)
}

/** 시점 t 에 개관에서 그려지는 큰 그림의 시점별 묶음(world-t<…t…>)을 미리 받는다 — 카드 데이터가 오기 전에 */
export function prefetchLeadTimeGroups(t: number): void {
  timeFiles()
    .then((m) => Promise.allSettled(m.leadTimeGroups(t).map(m.loadTimeFigureGroup)))
    .catch(() => {})
}
