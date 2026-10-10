// 그림 빌드 — PNG 한 장을 엔진이 읽는 QOI(qoiformat.org)로 옮긴다. 엔진은 PNG 를 읽지 않는다 (engine/hud/bitmap).
// 최대 크기보다 큰 그림은 비율을 지켜 그 안에 들게 줄인다 — 원본을 그대로 묻지 않는다.
//
// 사용: node imagec.mjs <in.png> <out.qoi> <최대 너비> <최대 높이>
// 읽는 PNG: 8 비트, 인터레이스 없음, 회색·RGB·팔레트(와 그 알파). 그 밖의 것(16 비트, 인터레이스)은 까닭을 적고 멈춘다.
// 내는 QOI: RGBA 4 채널 (알파가 없는 그림은 255).
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { inflateSync } from 'node:zlib'

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
/** 색 종류 → 픽셀 하나의 채널 수 (회색, RGB, 팔레트 번호, 회색+알파, RGBA) */
const PNG_CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }

/** PNG 바이트를 { width, height, rgba } 로 푼다 (rgba 는 윗줄부터, 픽셀마다 4 바이트) */
export function decodePng(bytes) {
  if (bytes.length < 8 || PNG_SIGNATURE.some((value, i) => bytes[i] !== value)) throw new Error('PNG 파일이 아니다')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let header = null
  let palette = null
  let transparency = null
  const data = []
  for (let at = 8; at + 12 <= bytes.length; ) {
    const length = view.getUint32(at)
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8))
    const body = bytes.subarray(at + 8, at + 8 + length)
    if (body.length !== length) throw new Error('PNG 가 잘렸다')
    if (type === 'IHDR') header = { width: view.getUint32(at + 8), height: view.getUint32(at + 12), depth: body[8], color: body[9], interlace: body[12] }
    else if (type === 'PLTE') palette = body
    else if (type === 'tRNS') transparency = body
    else if (type === 'IDAT') data.push(body)
    else if (type === 'IEND') break
    at += 12 + length
  }
  if (!header || !data.length) throw new Error('PNG 에 머리(IHDR)나 그림 데이터(IDAT)가 없다')
  const { width, height, depth, color, interlace } = header
  const channels = PNG_CHANNELS[color]
  if (depth !== 8 || !channels || interlace !== 0) throw new Error(`읽지 못하는 PNG 다 (비트 ${depth}, 색 종류 ${color}, 인터레이스 ${interlace}) — 8 비트, 인터레이스 없는 PNG 로 다시 저장한다`)
  if (color === 3 && !palette) throw new Error('팔레트 PNG 에 팔레트(PLTE)가 없다')

  // 줄마다 필터 종류 1 바이트 + 픽셀들 — 필터를 되돌린다 (왼쪽 a, 위 b, 왼쪽 위 c)
  const stride = width * channels
  const raw = inflateSync(Buffer.concat(data))
  if (raw.length !== (stride + 1) * height) throw new Error('PNG 의 그림 데이터 크기가 맞지 않는다')
  const pixels = new Uint8Array(stride * height)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    if (filter > 4) throw new Error(`PNG 의 줄 필터(${filter})를 모른다`)
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? pixels[y * stride + x - channels] : 0
      const b = y > 0 ? pixels[(y - 1) * stride + x] : 0
      const c = x >= channels && y > 0 ? pixels[(y - 1) * stride + x - channels] : 0
      let predicted = 0
      if (filter === 1) predicted = a
      else if (filter === 2) predicted = b
      else if (filter === 3) predicted = (a + b) >> 1
      else if (filter === 4) {
        // Paeth — a + b - c 에 가장 가까운 것 (같으면 a, b, c 차례)
        const [pa, pb, pc] = [Math.abs(b - c), Math.abs(a - c), Math.abs(a + b - 2 * c)]
        predicted = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      pixels[y * stride + x] = (raw[y * (stride + 1) + 1 + x] + predicted) & 0xff
    }
  }

  const rgba = new Uint8Array(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const from = pixels.subarray(i * channels, (i + 1) * channels)
    let pixel
    if (color === 0) pixel = [from[0], from[0], from[0], 255]
    else if (color === 2) pixel = [from[0], from[1], from[2], 255]
    else if (color === 3) {
      if (from[0] * 3 + 2 >= palette.length) throw new Error('PNG 의 픽셀이 팔레트 밖을 가리킨다')
      pixel = [palette[from[0] * 3], palette[from[0] * 3 + 1], palette[from[0] * 3 + 2], transparency?.[from[0]] ?? 255]
    } else if (color === 4) pixel = [from[0], from[0], from[0], from[1]]
    else pixel = [from[0], from[1], from[2], from[3]]
    rgba.set(pixel, i * 4)
  }
  return { width, height, rgba }
}

/**
 * 그림이 maxWidth × maxHeight 를 넘으면 비율을 지켜 그 안에 들게 줄인다 — 새 픽셀은 그 픽셀이 덮는 원본 넓이의 평균이다.
 * 넘지 않으면 그대로 돌려준다 (키우지 않는다)
 */
export function fitInside({ width, height, rgba }, maxWidth, maxHeight) {
  const scale = Math.min(maxWidth / width, maxHeight / height)
  if (scale >= 1) return { width, height, rgba }
  const [w, h] = [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))]
  const out = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    const [top, bottom] = [(y * height) / h, ((y + 1) * height) / h]
    for (let x = 0; x < w; x++) {
      const [left, right] = [(x * width) / w, ((x + 1) * width) / w]
      const sum = [0, 0, 0, 0]
      let area = 0
      for (let sy = Math.floor(top); sy < bottom; sy++) {
        const tall = Math.min(bottom, sy + 1) - Math.max(top, sy)
        for (let sx = Math.floor(left); sx < right; sx++) {
          const weight = tall * (Math.min(right, sx + 1) - Math.max(left, sx))
          for (let c = 0; c < 4; c++) sum[c] += rgba[(sy * width + sx) * 4 + c] * weight
          area += weight
        }
      }
      for (let c = 0; c < 4; c++) out[(y * w + x) * 4 + c] = Math.round(sum[c] / area)
    }
  }
  return { width: w, height: h, rgba: out }
}

/** QOI 바이트 — 머리 14 바이트, 픽셀 묶음들(RUN·INDEX·DIFF·LUMA·RGB·RGBA), 끝 표시 8 바이트 */
export function encodeQoi({ width, height, rgba }) {
  const out = new Uint8Array(14 + width * height * 5 + 8)
  const view = new DataView(out.buffer)
  out.set([0x71, 0x6f, 0x69, 0x66])
  view.setUint32(4, width)
  view.setUint32(8, height)
  // 4 채널, 색 공간 0 (sRGB, 알파는 선형)
  out[12] = 4
  out[13] = 0
  let at = 14
  const seen = new Uint8Array(64 * 4)
  let [pr, pg, pb, pa] = [0, 0, 0, 255]
  let run = 0
  const count = width * height
  for (let i = 0; i < count; i++) {
    const [r, g, b, a] = rgba.subarray(i * 4, i * 4 + 4)
    if (r === pr && g === pg && b === pb && a === pa) {
      run++
      if (run === 62 || i === count - 1) {
        out[at++] = 0xc0 | (run - 1)
        run = 0
      }
      continue
    }
    if (run) {
      out[at++] = 0xc0 | (run - 1)
      run = 0
    }
    const slot = (r * 3 + g * 5 + b * 7 + a * 11) % 64
    if (seen[slot * 4] === r && seen[slot * 4 + 1] === g && seen[slot * 4 + 2] === b && seen[slot * 4 + 3] === a) {
      out[at++] = slot
    } else {
      seen.set([r, g, b, a], slot * 4)
      // 차이는 256 을 넘어 도는 것으로 친다 (-128…127)
      const wrap = (value) => ((value + 128) & 0xff) - 128
      const [dr, dg, db] = [wrap(r - pr), wrap(g - pg), wrap(b - pb)]
      if (a !== pa) {
        out.set([0xff, r, g, b, a], at)
        at += 5
      } else if (dr >= -2 && dr <= 1 && dg >= -2 && dg <= 1 && db >= -2 && db <= 1) {
        out[at++] = 0x40 | ((dr + 2) << 4) | ((dg + 2) << 2) | (db + 2)
      } else if (dg >= -32 && dg <= 31 && dr - dg >= -8 && dr - dg <= 7 && db - dg >= -8 && db - dg <= 7) {
        out[at++] = 0x80 | (dg + 32)
        out[at++] = ((dr - dg + 8) << 4) | (db - dg + 8)
      } else {
        out.set([0xfe, r, g, b], at)
        at += 4
      }
    }
    ;[pr, pg, pb, pa] = [r, g, b, a]
  }
  out.set([0, 0, 0, 0, 0, 0, 0, 1], at)
  return out.subarray(0, at + 8)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [input, output, maxWidth, maxHeight] = process.argv.slice(2)
  if (!input || !output || !(Number(maxWidth) >= 1) || !(Number(maxHeight) >= 1)) {
    console.error('usage: imagec.mjs <in.png> <out.qoi> <최대 너비> <최대 높이>')
    process.exit(2)
  }
  try {
    writeFileSync(output, encodeQoi(fitInside(decodePng(readFileSync(input)), Number(maxWidth), Number(maxHeight))))
  } catch (error) {
    console.error(`imagec: ${input}: ${error.message}`)
    process.exit(1)
  }
}
