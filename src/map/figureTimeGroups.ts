// 시점별 보기(src/data/timeline.ts)의 그림 묶음 — 세트 시점이 아닌 시점에 옮겨 그리는 그림(오래 사는 대상)만 따로 실은 묶음
// src/map/figures-time/<띠|지역 상세 id>-t<시점들>.ts (scripts/figures/to_ts.mjs 가 만든다). 사가 보기의 묶음은 figures.ts 그대로이고,
// 이 파일은 두 가지 묶음을 하나처럼 다루게 한다 — 카드마다 어느 묶음에서 받는지는 timeline.ts 의 figureGroupAt.
// 시점별 묶음의 파일 목록(figureTimeFiles.ts)은 시점별 보기에서만 받는 조각이라, 여기서는 이름 꼴로만 가린다
import { TIMES } from '../data/timeline'
import { FIGURE_GROUPS, loadFigureGroup, type FigureArt } from './figures'

/** 시점별 묶음의 이름 꼴 — '<띠|지역 상세 id>-t<세트 시점이 아닌 시점들>' (시점 번호는 한 자리 — 1..시점 수, 숨긴 시점도) */
if (TIMES.length > 9) throw new Error('figureTimeGroups: 시점이 9개를 넘으면 묶음 이름의 시점을 한 자리로 읽을 수 없다')
const TIME_GROUP = new RegExp(`-t[1-${TIMES.length}]+$`)
const timeFiles = () => import('./figureTimeFiles')

/**
 * 개관에서 그려지는 큰 그림의 시점별 묶음(world-t<시점들> — 몇 개뿐이다)은 첫 조각에서 바로 부른다. 파일 목록(figureTimeFiles.ts)을 받은 뒤에
 * 부르면 그 조각을 기다리는 한 번이 더 늘어, 휴대폰 느린 망에서 세트 시점이 아닌 그림만 있는 시점(2023)의 첫 그림이 2020년보다 약 0.65초 늦었다
 * (2026-11-05). 같은 파일이라 figureTimeFiles 의 목록으로 다시 불러도 한 번만 받는다
 */
const LEAD_FILES = import.meta.glob<{ default: Record<string, FigureArt> }>('./figures-time/world-t[0-9]*.ts')
const LEAD_PREFIX = './figures-time/world-t'

/** 받을 수 있는 그림 묶음인가 — 사가 보기의 묶음이나 시점별 묶음 (시점별 묶음이 실제로 없으면 불러올 때 실패한다) */
export const isFigureGroup = (g: string): boolean => TIME_GROUP.test(g) || FIGURE_GROUPS.includes(g)

/** 그림 묶음 하나를 불러온다 (카드 id → 그림) — 시점별 묶음이면 figures-time 에서, 아니면 figures.ts 의 loadFigureGroup */
export function loadAnyFigureGroup(g: string): Promise<Record<string, FigureArt>> {
  if (!TIME_GROUP.test(g)) return loadFigureGroup(g)
  // 개관의 큰 그림 묶음은 파일 목록을 기다리지 않고 (LEAD_FILES)
  const lead = LEAD_FILES[`./figures-time/${g}.ts`]
  return lead ? lead().then((m) => m.default) : timeFiles().then((m) => m.loadTimeFigureGroup(g))
}

/**
 * 시점 t 에 개관에서 그려지는 큰 그림의 시점별 묶음(world-t<…t…>)을 미리 받는다 — 카드 데이터가 오기 전에.
 * 나머지 시점별 묶음의 파일 목록도 함께 — 지도가 그다음 묶음(world-mid-t…)을 청할 때 기다리지 않게
 */
export function prefetchLeadTimeGroups(t: number): void {
  timeFiles().catch(() => {})
  for (const [path, file] of Object.entries(LEAD_FILES))
    if (path.slice(LEAD_PREFIX.length, -'.ts'.length).includes(String(t))) file().catch(() => {})
}
