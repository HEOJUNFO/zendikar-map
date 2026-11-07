// 지역 상세의 이름 배치 몫 (S9, docs/pixel-plan.md) — 가장 깊은 단계에서 지역 상세의 이름(지금 지도의 .child-label)을 그 자리에 두고,
// 세계 지도 지역 이름은 그 자리가 지역 상세 범위 안이거나 같은 이름의 지역 상세 이름이 가까우면 숨기며(한 이름은 한 번만 — 숨기는 셈은 layout.ts), 장소·카드 이름은 그 표시를 담은 가장 깊은 지역 상세가 정한 쪽을 먼저 본다
// (ZendikarMap.tsx 의 detailLabelHidden·detailLabelTexts·detailAnchor). DOM 이 없어 Node 시험도 부른다
import type { Anchor, DetailLabel, DetailLayout } from './labels/layout.ts'
import type { PixelMarks } from './marks/slim.ts'
import { LABEL_KIND_NAMES, type ChildMeta } from './raster/child.ts'

/** 지역 상세가 나오는 단계 (그림을 굽는 단계 — child.ts 의 ChildMeta.u) */
export const detailLevelOf = (meta: ChildMeta, levels: readonly number[]) => levels.indexOf(meta.u)

/** 같은 이름을 함께 두지 않는 거리 (지도 단위) */
const SAME_NAME_GAP = 200

const inside = (b: readonly number[], [x, y]: readonly number[]) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]

/** 보기(0 끔, t 시점)의 지역 상세 배치 몫 */
export function detailLayout(meta: ChildMeta, marks: PixelMarks, view: number, level: number): DetailLayout {
  const bit = 1 << view
  // 같은 글의 이름은 한 화면에 하나만 — 더 깊은 지역 상세의 것 (부모가 먼저 놓인 차례를 거꾸로). 지금 지도는 화면 가운데에 가까운 것을 남기지만
  // 픽셀 지도의 배치는 화면과 상관없이 단계마다 하나라, 가장 깊은 단계의 화면 폭(약 200 단위)보다 멀면 둘 다 둔다 (같은 화면에 함께 들지 않는다)
  const seen = new Map<string, [number, number][]>()
  const labels: DetailLabel[] = []
  for (const m of [...meta.maps].reverse())
    m.labels.forEach((r, i) => {
      if (!(r[7] & bit)) return
      const x = r[2] / 10
      const y = r[3] / 10
      const same = seen.get(r[0])
      if (same?.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < SAME_NAME_GAP)) return
      if (same) same.push([x, y])
      else seen.set(r[0], [[x, y]])
      const rot = Math.abs(r[6]) >= 60 ? (r[6] > 0 ? 90 : -90) : 0
      labels.push({ key: `${m.id}:${i}`, name: r[0], ...(r[1] ? { nameKo: r[1] } : {}), at: [r[2] / 10, r[3] / 10], size: r[4] / 10, kind: LABEL_KIND_NAMES[r[5]], rot })
    })
  // 표시를 담은 가장 깊은 지역 상세의 쪽
  const anchors = new Map<string, Anchor>()
  const deepest = [...meta.maps].reverse()
  for (const p of marks.points) {
    const m = deepest.find((d) => inside(d.b, p.at))
    const a = m?.anchors[p.id]
    if (a) anchors.set(p.id, a)
  }
  for (const c of marks.cards) {
    const m = deepest.find((d) => inside(d.b, c.at))
    const a = m?.anchors[`card:${c.id}`]
    if (a) anchors.set(c.id, a)
  }
  return { level, labels, bounds: meta.maps.map((m) => ({ x0: m.b[0], y0: m.b[1], x1: m.b[2], y1: m.b[3] })), anchors }
}
