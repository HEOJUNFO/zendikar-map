// 시점별 보기의 그림 묶음 파일 목록 — src/map/figures-time/<띠|지역 상세 id>-t<시점들>.ts (scripts/figures/to_ts.mjs 가 만든다).
// 시점별 보기를 켰을 때만 받는 조각이다(figureTimeGroups.ts 가 동적으로 불러온다) — 사가 보기의 첫 조각에 이 목록을 싣지 않게
import type { FigureArt } from './figures'

const FILES = import.meta.glob<{ default: Record<string, FigureArt> }>('./figures-time/*.ts')
const PREFIX = './figures-time/'

/** 시점별 묶음의 이름 (world-small-t234, kazandu-t24 …) */
export const TIME_FIGURE_GROUPS: readonly string[] = Object.keys(FILES).map((p) => p.slice(PREFIX.length, -'.ts'.length))

/** 시점별 묶음 하나를 불러온다 (카드 id → 그림) */
export function loadTimeFigureGroup(g: string): Promise<Record<string, FigureArt>> {
  const file = FILES[`${PREFIX}${g}.ts`]
  return file ? file().then((m) => m.default) : Promise.reject(new Error(`시점별 그림 묶음 '${g}' 이 없다`))
}

/** 시점 t 에 개관에서 그려지는 큰 그림의 시점별 묶음 (world-t<…t…>) */
export const leadTimeGroups = (t: number): string[] => TIME_FIGURE_GROUPS.filter((g) => /^world-t\d+$/.test(g) && g.slice('world-t'.length).includes(String(t)))
