// 하늘 빌드 — 하늘의 HDR 등장방형 그림(Radiance .hdr)에서 장면의 빛을 뽑는다: 해(방향·빛)를 떼어 내고, 나머지 하늘을 작은 표로 줄인다.
// 라이트 베이커(app/lightbake)가 그 표로 하늘빛을, 떼어 낸 해로 그림자를 굽고, 게임의 셰이더도 같은 해를 쓴다 (해의 방향이 한 곳에서 나온다).
//
// 사용: node skyc.mjs <하늘 폴더> <out.zksky> <out.hpp>
//   <하늘 폴더>/sky.txt — 한 줄에 하나 (# 뒤는 주석):
//       hdr <파일>            빛을 뽑는 HDR (손질해 둔 작은 사본 — tools/art/prepare.mjs)
//       image <파일>          화면에 그리는 하늘 그림 (같은 HDR 을 톤매핑한 JPEG — 빌드는 읽지 않고 에셋 팩에 그대로 싣는다)
//       source <원본>         art-src 안의 원본 HDR (손질이 읽는다 — 빌드는 읽지 않는다)
//       sun_azimuth <도>      장면에서 해가 있는 쪽 — 북(-z)에서 동(+x)으로 잰 각. 하늘을 y 축으로 돌려 맞춘다 (해의 높이는 HDR 그대로)
//       sun_cut <도>          가장 밝은 곳에서 이 각 안을 해로 본다 (그 밖의 고리 cut…2·cut 의 평균이 그 자리의 하늘이 된다)
//       sun_radius <도>       그림자를 구울 때의 해 원반의 반지름 — 실제(0.27 도)보다 크게 잡아 반그림자를 부드럽게 한다
//       ground_light <값>     가리는 것 없는 수평면이 받는 빛(해 + 하늘, 밝기)이 이 값이 되게 HDR 전체를 곱한다 — 장면의 노출을 여기서 맞춘다
//       sky_gain <배>         하늘빛만 더 곱한다 (1 이면 HDR 의 해와 하늘의 비 그대로) — 그늘을 밝게 채우려는 연출. 화면용 하늘 그림에는 곱하지 않는다
//       tint_red <배> · tint_blue <배>   장면에 드는 빛(해와 하늘빛)의 빨강·파랑에 곱한다 (초록은 그대로) — 볕 든 돌이 따뜻한 흰빛으로 나오게 맞추는 흰색 균형.
//                             화면용 하늘 그림에는 곱하지 않는다 (하늘은 파랗게 남는다)
//       ground_albedo <값>    아래에서 되비치는 빛의 어림 — 구운 값이 없는 것(원경)의 아래쪽 빛 = 이 값 × 수평면이 받는 빛
//   빛의 단위: 겉면의 색 = albedo × 빛. 휘도가 L 로 고른 하늘 아래 열린 수평면의 빛이 L 이다 (조도 ÷ π).
//
// .zksky (리틀 엔디언): 'ZKSY' · u32 표 너비 · u32 높이 · f32 돌린 각(라디안) · f32 × 3 해의 방향(길이 1, 장면 좌표) · f32 × 3 해의 빛(해를 똑바로 보는 면이 받는 빛)
//   · f32 해 원반의 반지름(라디안) · 표 f32 × 3 × 너비 × 높이 (윗줄이 천정, 해를 떼어 낸 하늘의 휘도 — 빛의 단위)
//   표의 칸 (x, y) 의 방향: 극각 θ = π (y + ½) / 높이, 방위 φ = 2π ((x + ½) / 너비 − ½) + 돌린 각,  방향 = (sin θ sin φ, cos θ, −sin θ cos φ)
// .hpp: 게임이 쓰는 값 (namespace game::sky) — 해의 방향·빛, 가리는 것 없는 곳의 위·아래 빛, 돌린 각, 지평선의 색(안개)
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const TABLE_WIDTH = 64
export const TABLE_HEIGHT = 32
/** 밝기 (Rec. 709) */
export const luminance = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b

/** Radiance .hdr (RGBE, 줄마다 RLE 이거나 그대로) → { width, height, data(Float32Array rgb, 윗줄부터) } */
export function parseHdr(bytes) {
  let at = 0
  const line = () => {
    const end = bytes.indexOf(0x0a, at)
    if (end < 0) throw new Error('.hdr 의 머리가 잘렸다')
    const text = Buffer.from(bytes.subarray(at, end)).toString('latin1')
    at = end + 1
    return text
  }
  if (!line().startsWith('#?')) throw new Error('.hdr 파일이 아니다')
  let format = null
  for (let text = line(); text !== ''; text = line()) if (text.startsWith('FORMAT=')) format = text.slice(7)
  if (format !== '32-bit_rle_rgbe') throw new Error(`읽지 못하는 .hdr 형식이다 (${format})`)
  const size = /^-Y (\d+) \+X (\d+)$/.exec(line())
  if (!size) throw new Error('.hdr 의 크기 줄이 -Y 높이 +X 너비 꼴이 아니다')
  const [height, width] = [Number(size[1]), Number(size[2])]
  if (!(width > 0 && height > 0 && width <= 16384 && height <= 8192)) throw new Error('.hdr 의 크기가 터무니없다')
  const data = new Float32Array(width * height * 3)
  const row = new Uint8Array(width * 4)
  for (let y = 0; y < height; y++) {
    if (width >= 8 && width < 32768 && bytes[at] === 2 && bytes[at + 1] === 2 && ((bytes[at + 2] << 8) | bytes[at + 3]) === width) {
      // 새 RLE — 성분마다 따로 눌러 놓았다
      at += 4
      for (let channel = 0; channel < 4; channel++) {
        for (let x = 0; x < width; ) {
          let count = bytes[at++]
          if (count > 128) {
            count -= 128
            if (x + count > width || at >= bytes.length) throw new Error('.hdr 의 줄이 어긋났다')
            const value = bytes[at++]
            for (let i = 0; i < count; i++) row[(x + i) * 4 + channel] = value
          } else {
            if (count === 0 || x + count > width || at + count > bytes.length) throw new Error('.hdr 의 줄이 어긋났다')
            for (let i = 0; i < count; i++) row[(x + i) * 4 + channel] = bytes[at++]
          }
          x += count
        }
      }
    } else {
      if (at + width * 4 > bytes.length) throw new Error('.hdr 의 픽셀이 모자란다')
      row.set(bytes.subarray(at, at + width * 4))
      at += width * 4
    }
    for (let x = 0; x < width; x++) {
      const exponent = row[x * 4 + 3]
      // 지수 0 은 검정. 값 = 가수 × 2^(지수 − 136)
      const scale = exponent ? 2 ** (exponent - 136) : 0
      for (let c = 0; c < 3; c++) data[(y * width + x) * 3 + c] = row[x * 4 + c] * scale
    }
  }
  return { width, height, data }
}

/** { width, height, data } → 누르지 않은 RGBE .hdr 바이트 */
export function encodeHdr({ width, height, data }) {
  const head = Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${height} +X ${width}\n`, 'latin1')
  const bytes = new Uint8Array(head.length + width * height * 4)
  bytes.set(head)
  for (let i = 0; i < width * height; i++) {
    const [r, g, b] = [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]]
    const most = Math.max(r, g, b)
    if (most < 1e-32) continue
    // most = 가수(128…255) × 2^(지수 − 136)
    let exponent = Math.ceil(Math.log2(most)) + 128
    if (Math.floor(most * 2 ** (136 - exponent)) > 255) exponent++
    const scale = 2 ** (136 - exponent)
    bytes.set([Math.min(255, Math.floor(r * scale)), Math.min(255, Math.floor(g * scale)), Math.min(255, Math.floor(b * scale)), exponent], head.length + i * 4)
  }
  return bytes
}

/** 가로세로를 정수 배로 줄인다 (넓이 평균) */
export function shrink({ width, height, data }, toWidth, toHeight) {
  const [fx, fy] = [width / toWidth, height / toHeight]
  if (!Number.isInteger(fx) || !Number.isInteger(fy)) throw new Error(`${width}×${height} 를 ${toWidth}×${toHeight} 로 정수 배로 줄일 수 없다`)
  const out = new Float32Array(toWidth * toHeight * 3)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      for (let c = 0; c < 3; c++) out[((y / fy | 0) * toWidth + (x / fx | 0)) * 3 + c] += data[(y * width + x) * 3 + c] / (fx * fy)
  return { width: toWidth, height: toHeight, data: out }
}

/** 등장방형 칸 (x, y) 의 방향 (돌리기 전) 과 그 칸이 덮는 입체각 */
function cell(width, height, x, y) {
  const theta = (Math.PI * (y + 0.5)) / height
  const phi = 2 * Math.PI * ((x + 0.5) / width - 0.5)
  const direction = [Math.sin(theta) * Math.sin(phi), Math.cos(theta), -Math.sin(theta) * Math.cos(phi)]
  return { direction, solid: ((2 * Math.PI) / width) * (Math.PI / height) * Math.sin(theta) }
}

/** sky.txt → 설정 */
export function parseSkyText(text, name = 'sky.txt') {
  const sky = { hdr: null, image: null, source: null, sun_azimuth: 0, sun_cut: 4, sun_radius: 0.27, ground_light: 1, sky_gain: 1, tint_red: 1, tint_blue: 1, ground_albedo: 0.4 }
  text.split(/\r?\n/).forEach((raw, index) => {
    const [key, value, extra] = raw.replace(/#.*$/, '').trim().split(/\s+/)
    if (!key) return
    const fail = (message) => {
      throw new Error(`${name}:${index + 1}: ${message}`)
    }
    if (!(key in sky) || value === undefined || extra !== undefined) fail(`모르는 줄 '${raw.trim()}'`)
    if (sky[key] === null) sky[key] = value
    else if (typeof sky[key] === 'string') fail(`${key} 를 두 번 적었다`)
    else if (!Number.isFinite(Number(value))) fail(`${key} 에는 숫자가 와야 한다`)
    else sky[key] = Number(value)
  })
  if (!sky.hdr) throw new Error(`${name}: hdr 줄이 없다`)
  if (!(sky.sun_cut > 0 && sky.sun_radius > 0 && sky.ground_light > 0 && sky.sky_gain > 0 && sky.tint_red > 0 && sky.tint_blue > 0 && sky.ground_albedo >= 0)) throw new Error(`${name}: 값이 범위 밖이다`)
  return sky
}

/**
 * HDR 에서 해를 떼어 내고 장면의 빛을 낸다 — { yaw, sunDirection, sunLight, sunRadius, scale, table { width, height, data }, up, down, horizon }
 * 해: 가장 밝은 칸에서 sun_cut 도 안의 칸들. 그 둘레 고리(cut…2·cut)의 평균 휘도가 그 자리의 하늘이고, 그것을 넘는 몫이 해다.
 * 해의 빛 = Σ(넘는 몫 × 입체각) ÷ π, 방향은 그 몫으로 무게를 준 가운데. 모든 값은 scale 을 곱한 빛의 단위이고, 하늘에는 sky_gain 이, 빛 전체에 tint 가 더 곱해진다
 * (scale 만 곱한 것이 화면용 하늘 그림의 배율이다).
 * up 은 가리는 것 없는 수평면이 하늘에서 받는 빛(해 빼고), down 은 아래에서 되비치는 빛의 어림, horizon 은 지평선 바로 위 하늘의 평균 휘도
 */
export function analyzeSky(image, sky) {
  const { width, height, data } = image
  const at = (x, y) => (y * width + x) * 3
  let peak = [0, 0]
  let most = -1
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const value = luminance(data[at(x, y)], data[at(x, y) + 1], data[at(x, y) + 2])
      if (value > most) [most, peak] = [value, [x, y]]
    }
  const center = cell(width, height, ...peak).direction
  const [cut, ring] = [Math.cos((sky.sun_cut * Math.PI) / 180), Math.cos((2 * sky.sun_cut * Math.PI) / 180)]
  const around = [0, 0, 0]
  let aroundSolid = 0
  const inside = []
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const { direction, solid } = cell(width, height, x, y)
      const cosine = direction[0] * center[0] + direction[1] * center[1] + direction[2] * center[2]
      if (cosine >= cut) inside.push({ x, y, direction, solid })
      else if (cosine >= ring) {
        for (let c = 0; c < 3; c++) around[c] += data[at(x, y) + c] * solid
        aroundSolid += solid
      }
    }
  const base = aroundSolid > 0 ? around.map((v) => v / aroundSolid) : [0, 0, 0]
  // 해를 떼어 낸 하늘 — 해 자리는 둘레의 하늘로 메운다 (둘레보다 어두운 칸은 그대로)
  const rest = new Float32Array(data)
  const sun = [0, 0, 0]
  const toward = [0, 0, 0]
  for (const { x, y, direction, solid } of inside) {
    let weight = 0
    for (let c = 0; c < 3; c++) {
      const excess = Math.max(0, data[at(x, y) + c] - base[c])
      sun[c] += (excess * solid) / Math.PI
      weight += excess * solid
      rest[at(x, y) + c] = Math.min(data[at(x, y) + c], base[c])
    }
    for (let c = 0; c < 3; c++) toward[c] += direction[c] * weight
  }
  const length = Math.hypot(...toward)
  const found = length > 0 ? toward.map((v) => v / length) : center

  // 표 — 넓이 평균으로 줄인다 (칸의 입체각으로 무게를 준 평균은 줄마다 같은 무게라 그냥 평균과 같다)
  const table = shrink({ width, height, data: rest }, TABLE_WIDTH, TABLE_HEIGHT)
  // 수평면이 하늘에서 받는 빛 = Σ(휘도 × cos × 입체각) ÷ π (위쪽 반구), 지평선 = 수평선 위 6 도 안의 평균
  const up = [0, 0, 0]
  const horizon = [0, 0, 0]
  let horizonSolid = 0
  for (let y = 0; y < TABLE_HEIGHT / 2; y++)
    for (let x = 0; x < TABLE_WIDTH; x++) {
      const { direction, solid } = cell(TABLE_WIDTH, TABLE_HEIGHT, x, y)
      for (let c = 0; c < 3; c++) up[c] += (table.data[(y * TABLE_WIDTH + x) * 3 + c] * direction[1] * solid) / Math.PI
      if (y === TABLE_HEIGHT / 2 - 1) {
        for (let c = 0; c < 3; c++) horizon[c] += table.data[(y * TABLE_WIDTH + x) * 3 + c] * solid
        horizonSolid += solid
      }
    }
  // 노출 — 수평면이 받는 빛(해 + sky_gain × 하늘)의 밝기가 ground_light 가 되게
  const ground = luminance(...sun) * Math.max(0, found[1]) + sky.sky_gain * luminance(...up)
  const scale = ground > 0 ? sky.ground_light / ground : 1
  const skyScale = scale * sky.sky_gain
  const tint = [sky.tint_red, 1, sky.tint_blue]
  for (let i = 0; i < table.data.length; i++) table.data[i] *= skyScale * tint[i % 3]
  const sunLight = sun.map((v, c) => v * scale * tint[c])
  const upLight = up.map((v, c) => v * skyScale * tint[c])
  // 하늘을 y 축으로 돌려 해를 sun_azimuth 로 — 방위는 북(-z)에서 동(+x)으로
  const azimuth = (sky.sun_azimuth * Math.PI) / 180
  const yaw = azimuth - Math.atan2(found[0], -found[2])
  const flat = Math.hypot(found[0], found[2])
  const sunDirection = [flat * Math.sin(azimuth), found[1], -flat * Math.cos(azimuth)]
  const down = upLight.map((v, c) => sky.ground_albedo * (v + sunLight[c] * Math.max(0, sunDirection[1])))
  return {
    yaw,
    sunDirection,
    sunLight,
    sunRadius: (sky.sun_radius * Math.PI) / 180,
    scale,
    table,
    up: upLight,
    down,
    // 지평선의 색은 하늘 그림과 같은 배율로 (그림과 안개가 이어진다)
    horizon: horizon.map((v) => (v / horizonSolid) * scale),
  }
}

/** .zksky 바이트 */
export function encodeSky(light) {
  const bytes = new Uint8Array(44 + light.table.data.length * 4)
  const view = new DataView(bytes.buffer)
  bytes.set(Buffer.from('ZKSY'))
  view.setUint32(4, light.table.width, true)
  view.setUint32(8, light.table.height, true)
  ;[light.yaw, ...light.sunDirection, ...light.sunLight, light.sunRadius, ...light.table.data].forEach((value, i) => view.setFloat32(12 + i * 4, value, true))
  return bytes
}

/** 장면 셰이더의 노출과 톤 곡선 (engine/render/wgsl/include/color.wgsl 의 to_display) — 선형 빛 → 화면 값 0…1 */
export function toDisplay(light, exposure) {
  const x = light * exposure
  return Math.min(1, Math.max(0, (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14))) ** (1 / 2.2)
}

/** color.wgsl 에서 노출 값을 읽는다 (하늘 그림과 안개 색이 장면과 같은 노출을 쓴다) */
export function readExposure(wgsl) {
  const found = /const EXPOSURE = ([0-9.]+);/.exec(wgsl)
  if (!found) throw new Error('color.wgsl 에서 EXPOSURE 를 찾지 못했다')
  return Number(found[1])
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [folder, output, header] = process.argv.slice(2)
  if (!header) {
    console.error('usage: skyc.mjs <sky dir> <out.zksky> <out.hpp>')
    process.exit(2)
  }
  try {
    const sky = parseSkyText(readFileSync(join(folder, 'sky.txt'), 'utf8'), join(folder, 'sky.txt'))
    const light = analyzeSky(parseHdr(readFileSync(join(folder, sky.hdr))), sky)
    writeFileSync(output, encodeSky(light))
    const exposure = readExposure(readFileSync(fileURLToPath(new URL('../engine/render/wgsl/include/color.wgsl', import.meta.url)), 'utf8'))
    const f = (v) => `${Math.fround(v).toPrecision(9)}f`
    const vec = (v) => `{${v.map(f).join(', ')}}`
    writeFileSync(
      header,
      `// tools/skyc.mjs 가 content/sky 에서 만든 값 — 고치지 않는다 (sky.txt 를 고친다)
#pragma once

#include "engine/foundation/color.hpp"
#include "engine/foundation/math.hpp"

namespace game::sky {

/** 해가 있는 쪽 (길이 1) */
inline constexpr engine::Vec3 SUN_DIRECTION${vec(light.sunDirection)};
/** 해의 빛 — 해를 똑바로 보는 면이 받는 빛 (겉면의 색 = albedo × 빛) */
inline constexpr engine::Vec3 SUN_LIGHT${vec(light.sunLight)};
/** 가리는 것 없는 곳에서 위를 보는 면이 하늘에서 받는 빛, 아래를 보는 면이 되비친 빛에서 받는 빛 (구운 값이 없는 것 — 원경 — 에 쓴다) */
inline constexpr engine::Vec3 UP_LIGHT${vec(light.up)};
inline constexpr engine::Vec3 DOWN_LIGHT${vec(light.down)};
/** 하늘빛에 곱해 둔 배 (sky.txt 의 sky_gain) — UP_LIGHT 에는 이것이 곱해져 있다. 창으로 드는 빛을 키우는 연출이라, 바깥에 놓인 것(원경)은 이 배로 나눈 하늘빛을 쓴다 */
inline constexpr float SKY_GAIN = ${f(sky.sky_gain)};
/** 하늘 그림을 y 축으로 돌린 각 (라디안) — 그림의 방위 = 장면의 방위 − 이 값 */
inline constexpr float YAW = ${f(light.yaw)};
/** 지평선 바로 위 하늘의 색 (화면 값) — 먼 것이 잠기는 안개의 색 */
inline constexpr engine::Color HORIZON${vec(light.horizon.map((v) => toDisplay(v, exposure)))};

}  // namespace game::sky
`,
    )
  } catch (error) {
    console.error(`skyc: ${error.message}`)
    process.exit(1)
  }
}
