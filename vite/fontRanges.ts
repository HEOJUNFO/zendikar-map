// 고운바탕(@fontsource/gowun-batang)의 한국어 조각 범위에서 라틴 조각이 이미 그리는 글자를 뺀다.
// Google Fonts 의 한국어 나누기는 조각마다 공백·영문자·숫자·문장 부호 같은 아스키 글자를 몇 개씩 섞어 둔다(U+20-22, U+41-47 …).
// 브라우저는 글에 쓰인 글자를 범위에 담은 조각을 모두 받으므로, 영어 보기에서 고운바탕으로 쓴 영어 글(머리말·단추·패널)만으로도
// 한국어 조각을 몇 개씩 더 받아 그림 묶음과 망을 나눠 썼다 (2026-11-05). 같은 글꼴의 같은 글자라 라틴 조각의 것과 모양이 같다 —
// 범위에서만 빼고 파일은 그대로 둔다. 범위가 비는 조각은 @font-face 째 뺀다.
// 빼는 것은 라틴 조각이 범위에 담고 그 글꼴 파일(woff 의 cmap)에도 글자가 있는 것만이다 — 라틴 조각의 범위(U+2000-206F 등)는 실제 글자보다 넓어
// ※ ‥ ― ‰ † 같은 문장 부호 10개는 한국어 조각에만 있다. 범위로만 빼면 그 글자가 시스템 글꼴로 바뀌었다 (2026-11-05 검토)
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import type { Plugin } from 'vite'

type Range = [number, number]

const parseRanges = (s: string): Range[] =>
  s
    .split(',')
    .map((p) => p.trim().replace(/^U\+/i, ''))
    .filter(Boolean)
    .map((p) => {
      const [a, b] = p.split('-').map((x) => parseInt(x, 16))
      return [a, b ?? a] as Range
    })

const hex = (n: number) => n.toString(16).toUpperCase().padStart(4, '0')
const formatRanges = (rs: Range[]) => rs.map(([a, b]) => (a === b ? `U+${hex(a)}` : `U+${hex(a)}-${hex(b)}`)).join(',')

/** a 에서 cover 가 덮는 글자를 뺀다 */
function subtract(a: Range[], cover: Range[]): Range[] {
  let out = a
  for (const [c0, c1] of cover)
    out = out.flatMap(([a0, a1]): Range[] => {
      if (c1 < a0 || c0 > a1) return [[a0, a1]]
      const keep: Range[] = []
      if (a0 < c0) keep.push([a0, c0 - 1])
      if (a1 > c1) keep.push([c1 + 1, a1])
      return keep
    })
  return out
}

/** 글자 모음을 이어진 범위로 */
function toRanges(points: Iterable<number>): Range[] {
  const sorted = [...new Set(points)].sort((a, b) => a - b)
  const out: Range[] = []
  for (const p of sorted) {
    const last = out[out.length - 1]
    if (last && p === last[1] + 1) last[1] = p
    else out.push([p, p])
  }
  return out
}

/** WOFF(1.0) 글꼴 파일에 글자가 있는 코드 포인트 — cmap 의 형식 4·12 */
export function woffCodePoints(buf: Buffer): Set<number> {
  if (buf.toString('latin1', 0, 4) !== 'wOFF') throw new Error('fontRanges: WOFF 파일이 아니다')
  const numTables = buf.readUInt16BE(12)
  let cmap: Buffer | null = null
  for (let i = 0; i < numTables; i++) {
    const e = 44 + i * 20
    if (buf.toString('latin1', e, e + 4) !== 'cmap') continue
    const offset = buf.readUInt32BE(e + 4)
    const comp = buf.readUInt32BE(e + 8)
    const orig = buf.readUInt32BE(e + 12)
    const raw = buf.subarray(offset, offset + comp)
    cmap = comp < orig ? zlib.inflateSync(raw) : raw
  }
  if (!cmap) throw new Error('fontRanges: cmap 표가 없다')
  const out = new Set<number>()
  const n = cmap.readUInt16BE(2)
  for (let i = 0; i < n; i++) {
    const platform = cmap.readUInt16BE(4 + i * 8)
    const encoding = cmap.readUInt16BE(6 + i * 8)
    if (!(platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10)))) continue
    const t = cmap.readUInt32BE(8 + i * 8)
    const format = cmap.readUInt16BE(t)
    if (format === 12) {
      const groups = cmap.readUInt32BE(t + 12)
      for (let g = 0; g < groups; g++) {
        const s = cmap.readUInt32BE(t + 16 + g * 12)
        const e = cmap.readUInt32BE(t + 20 + g * 12)
        for (let c = s; c <= e; c++) out.add(c)
      }
    } else if (format === 4) {
      const segs = cmap.readUInt16BE(t + 6) / 2
      const ends = t + 14
      const starts = ends + segs * 2 + 2
      const deltas = starts + segs * 2
      const rangeOffsets = deltas + segs * 2
      for (let sgi = 0; sgi < segs; sgi++) {
        const end = cmap.readUInt16BE(ends + sgi * 2)
        const start = cmap.readUInt16BE(starts + sgi * 2)
        const delta = cmap.readInt16BE(deltas + sgi * 2)
        const ro = cmap.readUInt16BE(rangeOffsets + sgi * 2)
        for (let c = start; c <= end && c !== 0xffff; c++) {
          const glyph = ro === 0 ? (c + delta) & 0xffff : cmap.readUInt16BE(rangeOffsets + sgi * 2 + ro + (c - start) * 2)
          if (glyph !== 0) out.add(c)
        }
      }
    }
  }
  return out
}

const FACE = /\/\*\s*([^*]+?)\s*\*\/\s*@font-face\s*\{[^}]*\}/g
const RANGE = /unicode-range:\s*([^;]+);/
const WOFF = /url\(([^)]+\.woff)\)/

/**
 * fontsource CSS 하나 — 라틴 조각(…-latin-…)이 그리는 글자를 다른 조각의 범위에서 뺀다.
 * latinGlyphs(그 조각의 woff 상대 경로 → 글자가 있는 코드 포인트)로 범위 가운데 실제로 글자가 있는 것만 뺀다
 */
export function trimFontRanges(css: string, latinGlyphs: (woff: string) => Set<number>): string {
  const latin = [...css.matchAll(FACE)].find((m) => /-latin-\d+-/.test(m[1]))
  const latinRange = latin && RANGE.exec(latin[0])
  const latinWoff = latin && WOFF.exec(latin[0])
  if (!latinRange || !latinWoff) throw new Error('fontRanges: 라틴 조각의 unicode-range·woff 를 찾지 못했다')
  const glyphs = latinGlyphs(latinWoff[1])
  const cover = toRanges(
    parseRanges(latinRange[1]).flatMap(([a, b]) => {
      const out: number[] = []
      for (let c = a; c <= b; c++) if (glyphs.has(c)) out.push(c)
      return out
    }),
  )
  return css.replace(FACE, (face, name: string) => {
    if (/-latin-\d+-/.test(name)) return face
    const r = RANGE.exec(face)
    if (!r) return face
    const left = subtract(parseRanges(r[1]), cover)
    return left.length ? face.replace(RANGE, `unicode-range: ${formatRanges(left)};`) : ''
  })
}

export function fontRanges(): Plugin {
  return {
    name: 'zendikar-font-ranges',
    enforce: 'pre',
    transform(code, id) {
      const file = id.split('?')[0]
      if (!/@fontsource[\\/]gowun-batang[\\/]\d+\.css$/.test(file)) return null
      return { code: trimFontRanges(code, (woff) => woffCodePoints(fs.readFileSync(path.resolve(path.dirname(file), woff)))), map: null }
    },
  }
}
