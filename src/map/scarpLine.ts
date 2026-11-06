// 단애선의 위 선 — 세계 지도(terrain.ts 의 scarp)가 그리는 바로 그 꺾은선. 지역 상세 도구(scripts/childmaps/context.mjs)도
// 같은 셈으로 그 선을 그림 좌표로 내주어, 지역 상세가 다시 그린 단애가 가장자리 띠에서 세계 지도 선과 겹쳐 한 줄로 보이게 한다.
// geometry.ts 만 쓴다 (Node 가 .ts 를 그대로 읽는다)
import { chaikin, chaikinOpen, resample, rightNormals, type Point } from './geometry.ts'

/** 단애선의 빗금 길이 — 기본 7. 아주 짧은 선(Jwar 섬의 7 단위 절벽)은 선 길이에 맞춰 줄인다 */
export function cliffDepth(l: { readonly line: readonly Point[]; readonly closed?: boolean }): number {
  let len = 0
  for (let i = 1; i < l.line.length; i++) len += Math.hypot(l.line[i][0] - l.line[i - 1][0], l.line[i][1] - l.line[i - 1][1])
  return 7 * Math.max(0.2, Math.min(1, len / 35))
}

/** 빗금 쪽에 물이 있는 단애인가 — 물가 절벽은 물 칠 위 층에 그리고, 위 선을 물가에서 띄운다 (terrain.ts) */
export function scarpByWater(line: readonly Point[], closed: boolean, depth: number, wet: (x: number, y: number) => boolean): boolean {
  const pts = resample(line, 4, closed)
  const normals = rightNormals(pts, closed)
  return pts.some(([x, y], i) => wet(x + normals[i][0] * (depth + 2), y + normals[i][1] * (depth + 2)))
}

/**
 * 단애의 위 선 — 다듬고(chaikin 2) 빗금 간격으로 다시 찍은 점, 점마다의 법선, 빗금 쪽 물까지의 거리.
 * wet 을 주면 물까지의 틈이 모자란 자리에서 위 선을 뭍 쪽으로 민다 (민 거리는 이웃과 고르게 — 위 선이 꺾이지 않게)
 */
export function scarpTop(
  line: readonly Point[],
  closed: boolean,
  side: 1 | -1,
  depth: number,
  wet?: (x: number, y: number) => boolean,
): { pts: Point[]; normals: Point[]; gaps: number[] } {
  const step = 3.4 * Math.max(0.25, Math.min(1, depth / 7))
  let pts = resample(closed ? chaikin(line, 2) : chaikinOpen(line, 2), step, closed)
  const normals = rightNormals(pts, closed)
  if (pts.length < 2) return { pts, normals, gaps: [] }
  // 물까지의 거리 — 빗금 방향으로 depth 남짓까지 0.5 씩 걸어 본다
  const gaps = pts.map(([x, y], i) => {
    if (!wet) return Infinity
    for (let d = 0.5; d <= depth + 2; d += 0.5) if (wet(x + normals[i][0] * side * d, y + normals[i][1] * side * d)) return d
    return Infinity
  })
  if (wet) {
    const MIN_GAP = Math.min(4.5, depth * 0.7)
    const need = gaps.map((g) => (Number.isFinite(g) && g < MIN_GAP ? MIN_GAP - g : 0))
    const shift = need.map((_, i) => {
      let sum = 0
      let n = 0
      for (let k = -3; k <= 3; k++) {
        const j = closed ? (i + k + need.length) % need.length : i + k
        if (j < 0 || j >= need.length) continue
        let m = 0
        for (let q = -2; q <= 2; q++) {
          const r = closed ? (j + q + need.length) % need.length : j + q
          if (r >= 0 && r < need.length) m = Math.max(m, need[r])
        }
        sum += m
        n++
      }
      return sum / n
    })
    pts = pts.map(([x, y], i) => [x - normals[i][0] * side * shift[i], y - normals[i][1] * side * shift[i]] as const)
    shift.forEach((v, i) => (gaps[i] += v))
  }
  return { pts, normals, gaps }
}
