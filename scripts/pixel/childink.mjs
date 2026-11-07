// 지역 상세의 손그림 잉크 자리 (S16, docs/pixel-plan.md) — 가장 깊은 단계의 그림 이름이 손그림 건물·벼랑·물가 빗금 위에 앉지 않게.
// 구운 그림(childmaps.mjs 의 buildChildArt — 보기마다 몫 번호 그림)에서 선 몫(잉크·굵은 잉크·빗금·불 잉크·물 잉크)과 손그림 헤드론의 칸을
// 1 지도 단위 칸으로 모아, 칸마다 그 잉크가 있는 보기의 비트를 단다. 지도 칸에 맞춘 자리라 지역 상세끼리 같은 칸이면 비트를 합친다.
//   import { buildChildInk } from './childink.mjs'
//   buildChildInk(art) → { cell: 1, rows: [[cy, cx0, mask, len, mask, len, …], …] }
//   rows 는 잉크 칸이 있는 줄마다 — cx0 부터 (mask, len) 쌍으로 이어 간다 (mask 0 은 빈 칸)
import { FIG_CLASSES } from './figures.mjs'
import { CHILD_U, HEDRON_BODY, HEDRON_FACET } from './childmaps.mjs'

/** 잉크로 보는 몫 — 손그림 지형지물의 선 (칠은 그 선 안이라 따로 보지 않는다) */
const INK = new Set([...['ink', 'ink-bold', 'hatch', 'fire-ink', 'sea-ink'].map((c) => FIG_CLASSES.indexOf(c) + 1), HEDRON_BODY, HEDRON_FACET])
/** 칸 크기 (지도 단위) */
export const INK_CELL = 1

/** 몫 번호 그림의 RLE (figures.mjs 의 encodeIdx — [값, 길이] 바이트 쌍, base64 — child.ts 의 decodeChildImage 와 같다) 를 푼다 */
function decode(b64, n) {
  const bin = Buffer.from(b64, 'base64')
  const out = new Uint8Array(n)
  let k = 0
  for (let i = 0; i + 1 < bin.length; i += 2) {
    out.fill(bin[i], k, k + bin[i + 1])
    k += bin[i + 1]
  }
  return out
}

export function buildChildInk(art) {
  const per = Math.round(INK_CELL / CHILD_U)
  /** 칸 줄 → (cx → 보기 비트) */
  const cells = new Map()
  for (const m of art.maps) {
    const imgs = art.images[m.id]
    m.img.forEach((ii, vi) => {
      const idx = decode(imgs[ii], m.w * m.h)
      for (let y = 0; y < m.h; y++)
        for (let x = 0; x < m.w; x++) {
          if (!INK.has(idx[y * m.w + x])) continue
          const cx = Math.floor((m.gx0 + x) / per)
          const cy = Math.floor((m.gy0 + y) / per)
          let row = cells.get(cy)
          if (!row) cells.set(cy, (row = new Map()))
          row.set(cx, (row.get(cx) ?? 0) | (1 << vi))
        }
    })
  }
  const rows = []
  for (const cy of [...cells.keys()].sort((a, b) => a - b)) {
    const row = cells.get(cy)
    const xs = [...row.keys()].sort((a, b) => a - b)
    const out = [cy, xs[0]]
    let mask = row.get(xs[0])
    let len = 0
    for (let cx = xs[0]; cx <= xs[xs.length - 1] + 1; cx++) {
      const v = row.get(cx) ?? 0
      if (v === mask) {
        len++
        continue
      }
      out.push(mask, len)
      mask = v
      len = 1
    }
    rows.push(out)
  }
  return { cell: INK_CELL, rows }
}
