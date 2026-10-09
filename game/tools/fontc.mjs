// 글꼴 빌드 — 글꼴 파일의 글자들을 그림(글리프 아틀라스) 한 장으로 구워 엔진이 읽는 바이너리(.fontbin)로 낸다.
// 엔진은 글꼴 파일을 읽지 않는다: 아틀라스의 칸을 사각형에 입혀 글자를 그린다 (engine/render/overlay).
// 한 .fontbin 에 면(face)을 여럿 굽는다 — 면마다 글꼴 파일(굵기), 구운 크기, 글자 묶음이 다르다. 엔진은 면을 번호로만 안다.
// 면마다 굽는 글자: 영문·숫자·기호(U+0020–007E)와 EXTRA 의 문장부호, 그리고
//   full — 완성형 한글 2,350 자(KS X 1001) / <글자 파일> — 그 파일(UTF-8)에 적힌 글자들 (줄바꿈·공백은 뺀다)
// 숫자는 글꼴의 고정 폭 숫자(OpenType tnum)로 굽는다 — 바뀌는 숫자(점수, 인원)가 흔들리지 않는다.
//
// 사용: node fontc.mjs <out.fontbin> --face <크기 px> <font.woff> <full|글자 파일> [--face …]
// 바이너리 (리틀 엔디언, engine/hud/font.cpp 가 읽는다):
//   'ZKFT' · u16 아틀라스 너비, 높이 · u32 면 수
//   · 면마다: f32 구운 크기(px) · f32 줄 높이 · f32 밑줄까지의 높이(ascent) · u32 글자 수
//   · 글자마다(면 차례, 면 안에서는 코드 순): u32 코드 · u16 x, y, w, h (아틀라스 칸) · f32 왼쪽 치우침, 위 치우침(줄 위에서 칸 위까지) · f32 나아감
//   · 아틀라스 — 한 픽셀 한 바이트 (덮인 정도 0..255). (0,0)–(1,1) 의 2×2 는 가득 찬 칸이다 (색 사각형이 쓴다)
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import opentype from 'opentype.js'

/** 영문·한글 밖에서 더 굽는 글자 */
const EXTRA = '·…—‘’“”×→←↑↓'
/** 한 줄을 세로로 몇 번 훑어 덮인 정도를 구하는가 */
const SUBSCANS = 5
const ATLAS_WIDTH = 1024
const PADDING = 1

/** 어느 면이나 갖는 글자 코드들 — 영문·숫자·기호와 EXTRA */
function baseCodepoints() {
  const codes = new Set()
  for (let c = 0x20; c <= 0x7e; c++) codes.add(c)
  for (const char of EXTRA) codes.add(char.codePointAt(0))
  return codes
}

/** 'full' 면이 굽는 글자 코드들 (오름차순) — 기본 글자와 완성형 한글 2,350 자 */
export function bakedCodepoints() {
  const codes = baseCodepoints()
  const ksx1001 = new TextDecoder('euc-kr')
  for (let high = 0xb0; high <= 0xc8; high++) for (let low = 0xa1; low <= 0xfe; low++) codes.add(ksx1001.decode(new Uint8Array([high, low])).codePointAt(0))
  return [...codes].sort((a, b) => a - b)
}

/** 글자 파일로 고른 면이 굽는 글자 코드들 (오름차순) — 기본 글자와 text 에 적힌 글자 (공백·줄바꿈은 뺀다) */
export function subsetCodepoints(text) {
  const codes = baseCodepoints()
  for (const char of text) if (!/\s/.test(char)) codes.add(char.codePointAt(0))
  return [...codes].sort((a, b) => a - b)
}

/** 윤곽(닫힌 꺾은선들)의 안쪽을 w×h 픽셀에 칠한다 — 값은 덮인 정도 0..255. 안팎은 감긴 수(0 이 아니면 안)로 가린다 */
export function rasterize(contours, width, height) {
  const coverage = new Float32Array(width * height)
  const edges = []
  for (const points of contours)
    for (let i = 0; i < points.length; i++) {
      const [x0, y0] = points[i]
      const [x1, y1] = points[(i + 1) % points.length]
      if (y0 !== y1) edges.push(y0 < y1 ? [x0, y0, x1, y1, 1] : [x1, y1, x0, y0, -1])
    }
  const crossings = []
  for (let row = 0; row < height; row++)
    for (let s = 0; s < SUBSCANS; s++) {
      const y = row + (s + 0.5) / SUBSCANS
      crossings.length = 0
      for (const [x0, y0, x1, y1, direction] of edges) if (y >= y0 && y < y1) crossings.push([x0 + ((y - y0) * (x1 - x0)) / (y1 - y0), direction])
      crossings.sort((a, b) => a[0] - b[0])
      let winding = 0
      for (let i = 0; i + 1 < crossings.length; i++) {
        winding += crossings[i][1]
        if (winding === 0) continue
        // 이 구간 [from, to) 이 걸친 픽셀마다 걸친 길이만큼
        const from = Math.max(0, crossings[i][0])
        const to = Math.min(width, crossings[i + 1][0])
        for (let x = Math.floor(from); x < to; x++) coverage[row * width + x] += (Math.min(to, x + 1) - Math.max(from, x)) / SUBSCANS
      }
    }
  return Uint8Array.from(coverage, (v) => Math.round(Math.min(1, v) * 255))
}

/** 글리프의 윤곽 명령(M·L·Q·C·Z)을 꺾은선들로 편다 */
function flatten(commands) {
  const STEPS = 8
  const contours = []
  let current = null
  let [px, py] = [0, 0]
  for (const c of commands) {
    if (c.type === 'M') {
      current = [[c.x, c.y]]
      contours.push(current)
    } else if (c.type === 'L') {
      current.push([c.x, c.y])
    } else if (c.type === 'Q') {
      for (let i = 1; i <= STEPS; i++) {
        const t = i / STEPS
        current.push([(1 - t) ** 2 * px + 2 * (1 - t) * t * c.x1 + t * t * c.x, (1 - t) ** 2 * py + 2 * (1 - t) * t * c.y1 + t * t * c.y])
      }
    } else if (c.type === 'C') {
      for (let i = 1; i <= STEPS; i++) {
        const t = i / STEPS
        const u = 1 - t
        current.push([
          u ** 3 * px + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t ** 3 * c.x,
          u ** 3 * py + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t ** 3 * c.y,
        ])
      }
    }
    if (c.type !== 'Z') [px, py] = [c.x, c.y]
  }
  return contours.filter((points) => points.length >= 3)
}

/** 숫자 글리프 번호 → 그 고정 폭 숫자(tnum)의 글리프 번호 */
function tabularDigits(font) {
  const singles = new Map(font.substitution.getSingle('tnum').map(({ sub, by }) => [sub, by]))
  const digits = new Map()
  for (let code = 0x30; code <= 0x39; code++) {
    const index = font.tables.cmap.glyphIndexMap[code]
    if (index !== undefined && !singles.has(index)) throw new Error(`글꼴에 '${String.fromCharCode(code)}' 의 고정 폭 숫자(tnum)가 없다`)
    digits.set(index, singles.get(index))
  }
  return digits
}

/**
 * 면들([{ font, size, codepoints }])을 한 아틀라스에 구워 { width, height, faces: [{ size, lineHeight, ascent, glyphs }], atlas } 로.
 * font 는 opentype.js 로 읽은 글꼴, size 는 구울 크기(px). 글꼴에 없는 글자는 glyphs 에서 빠진다
 */
export function bakeFont(specs) {
  const faces = specs.map(({ font, size, codepoints }) => {
    const scale = size / font.unitsPerEm
    const ascent = font.ascender * scale
    const lineHeight = (font.ascender - font.descender) * scale
    const digits = tabularDigits(font)
    const glyphs = []
    for (const code of codepoints) {
      const index = font.tables.cmap.glyphIndexMap[code]
      if (index === undefined) continue
      const glyph = font.glyphs.get(digits.get(index) ?? index)
      // 밑줄이 y 0, 위가 음수인 좌표
      const path = glyph.getPath(0, 0, size)
      const box = path.getBoundingBox()
      const empty = !path.commands.length || !(box.x2 > box.x1 && box.y2 > box.y1)
      const [left, top] = empty ? [0, 0] : [Math.floor(box.x1), Math.floor(box.y1)]
      const [w, h] = empty ? [0, 0] : [Math.ceil(box.x2) - left, Math.ceil(box.y2) - top]
      const pixels = empty ? new Uint8Array(0) : rasterize(flatten(path.commands).map((points) => points.map(([x, y]) => [x - left, y - top])), w, h)
      glyphs.push({ code, w, h, left, top: ascent + top, advance: glyph.advanceWidth * scale, pixels })
    }
    return { size, lineHeight, ascent, glyphs }
  })

  // 줄지어 채운다 — 높이가 비슷한 것끼리 한 줄에 놓이게 높이 순으로 (표는 면 차례, 코드 순으로 남는다)
  const order = faces.flatMap((face, index) => face.glyphs.map((glyph) => ({ glyph, index }))).sort((a, b) => b.glyph.h - a.glyph.h || a.index - b.index || a.glyph.code - b.glyph.code)
  let [x, y, rowHeight] = [2 + PADDING, 0, 2]
  for (const { glyph } of order) {
    if (x + glyph.w + PADDING > ATLAS_WIDTH) {
      y += rowHeight + PADDING
      x = 0
      rowHeight = 0
    }
    glyph.x = x
    glyph.y = y
    x += glyph.w + PADDING
    rowHeight = Math.max(rowHeight, glyph.h)
  }
  const height = y + rowHeight
  const atlas = new Uint8Array(ATLAS_WIDTH * height)
  // 가득 찬 칸
  for (const at of [0, 1, ATLAS_WIDTH, ATLAS_WIDTH + 1]) atlas[at] = 255
  for (const { glyph } of order) for (let row = 0; row < glyph.h; row++) atlas.set(glyph.pixels.subarray(row * glyph.w, (row + 1) * glyph.w), (glyph.y + row) * ATLAS_WIDTH + glyph.x)
  return { width: ATLAS_WIDTH, height, faces, atlas }
}

/** .fontbin 바이트 */
export function encodeFont({ width, height, faces, atlas }) {
  const [HEADER_BYTES, FACE_BYTES, GLYPH_BYTES] = [12, 16, 24]
  const glyphCount = faces.reduce((sum, face) => sum + face.glyphs.length, 0)
  const bytes = new Uint8Array(HEADER_BYTES + faces.length * FACE_BYTES + glyphCount * GLYPH_BYTES + atlas.length)
  const view = new DataView(bytes.buffer)
  for (let i = 0; i < 4; i++) view.setUint8(i, 'ZKFT'.charCodeAt(i))
  view.setUint16(4, width, true)
  view.setUint16(6, height, true)
  view.setUint32(8, faces.length, true)
  let at = HEADER_BYTES
  for (const face of faces) {
    view.setFloat32(at, face.size, true)
    view.setFloat32(at + 4, face.lineHeight, true)
    view.setFloat32(at + 8, face.ascent, true)
    view.setUint32(at + 12, face.glyphs.length, true)
    at += FACE_BYTES
  }
  for (const glyph of faces.flatMap((face) => face.glyphs)) {
    view.setUint32(at, glyph.code, true)
    view.setUint16(at + 4, glyph.x, true)
    view.setUint16(at + 6, glyph.y, true)
    view.setUint16(at + 8, glyph.w, true)
    view.setUint16(at + 10, glyph.h, true)
    view.setFloat32(at + 12, glyph.left, true)
    view.setFloat32(at + 16, glyph.top, true)
    view.setFloat32(at + 20, glyph.advance, true)
    at += GLYPH_BYTES
  }
  bytes.set(atlas, at)
  return bytes
}

/** 글꼴 파일(.woff)을 opentype.js 글꼴로 읽는다 */
export function loadFont(file) {
  const data = readFileSync(file)
  return opentype.parse(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [output, ...rest] = process.argv.slice(2)
  const specs = []
  for (let i = 0; i + 3 < rest.length && rest[i] === '--face'; i += 4) specs.push({ size: Number(rest[i + 1]), file: rest[i + 2], charset: rest[i + 3] })
  if (!output || !specs.length || specs.length * 4 !== rest.length || specs.some(({ size }) => !(size >= 8 && size <= 128))) {
    console.error('usage: fontc.mjs <out.fontbin> --face <크기 px> <font.woff> <full|글자 파일> [--face …]')
    process.exit(2)
  }
  try {
    const faces = specs.map(({ size, file, charset }) => ({
      font: loadFont(file),
      size,
      codepoints: charset === 'full' ? bakedCodepoints() : subsetCodepoints(readFileSync(charset, 'utf8')),
    }))
    const baked = bakeFont(faces)
    baked.faces.forEach((face, i) => {
      const missing = faces[i].codepoints.length - face.glyphs.length
      if (missing) throw new Error(`${specs[i].file} 에 없는 글자가 ${missing} 개 있다 (${specs[i].charset})`)
    })
    writeFileSync(output, encodeFont(baked))
  } catch (error) {
    console.error(`fontc: ${error.message}`)
    process.exit(1)
  }
}
