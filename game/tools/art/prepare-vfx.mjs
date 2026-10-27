// 전투 효과의 그림 — 받아 둔 CC0 원본(git 밖의 game/vfx-src/)에서 1024² RGBA 층 넷을 QOI 로 적는다 (gameplay/content/vfx/). 에셋 팩이 vfx/<이름> 으로 묶고,
// presentation/scene_view 의 스프라이트(engine/render/sprite_batch)가 텍스처 배열의 층으로 쓴다. 층마다 칸(열 × 행)의 격자이고 칸 하나가 한 프레임이다.
//   explosion — Unity Labs 의 Explosion02 (5 × 5, 25 프레임 — 섬광 → 불덩이 → 불씨 → 연기), 알파가 있다
//   fireball  — Unity Labs 의 FireBall01 (8 × 8, 64 프레임 — 되풀이), 검은 바탕이라 알파는 밝기다 (더해 그린다)
//   smoke     — Unity Labs 의 WispySmoke01 (8 × 8, 64 프레임 — 되풀이), 알파가 있다
//   sprites   — Kenney Particle Pack 의 흰 스프라이트 열여섯 (4 × 4, 칸마다 256²) — 색은 그릴 때 입힌다. 차례는 SPRITES (scene_view 의 Sprite 번호와 같다)
// 받은 곳과 라이선스는 gameplay/content/vfx/CREDITS.md. 사용: node game/tools/art/prepare-vfx.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { encodeQoi } from '../imagec.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const source = join(root, 'vfx-src')
const out = join(root, 'gameplay/content/vfx')
const SIZE = 1024

// Kenney 스프라이트 — 아틀라스의 칸 차례 (scene_view.cpp 의 Sprite 와 같다)
export const SPRITES = ['circle_03', 'circle_05', 'dirt_02', 'light_02', 'magic_03', 'magic_05', 'flare_01', 'scorch_02', 'smoke_04', 'smoke_08', 'trace_01', 'star_01', 'star_04', 'twirl_02', 'fire_01', 'scorch_01']

/** 무압축 TGA(24·32 비트, 아래 줄부터)를 위 줄부터의 RGBA 로 */
function readTga(path, alphaFromLuma) {
  const bytes = readFileSync(path)
  const width = bytes.readUInt16LE(12), height = bytes.readUInt16LE(14), depth = bytes[16] / 8, start = 18 + bytes[0]
  if (bytes[2] !== 2 || (depth !== 3 && depth !== 4)) throw new Error(`${path}: 무압축 24·32 비트 TGA 가 아니다`)
  const topDown = (bytes[17] & 0x20) !== 0
  const rgba = Buffer.alloc(width * height * 4)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const from = start + ((topDown ? y : height - 1 - y) * width + x) * depth, to = (y * width + x) * 4
      const [b, g, r] = [bytes[from], bytes[from + 1], bytes[from + 2]]
      rgba[to] = r, rgba[to + 1] = g, rgba[to + 2] = b
      rgba[to + 3] = depth === 4 && !alphaFromLuma ? bytes[from + 3] : Math.max(r, g, b)
    }
  return { width, height, rgba }
}

async function writeLayer(name, rgba) {
  const qoi = encodeQoi({ width: SIZE, height: SIZE, rgba: new Uint8Array(rgba.buffer, rgba.byteOffset, rgba.length) })
  writeFileSync(join(out, `${name}.qoi`), qoi)
  console.log(name, qoi.length, 'bytes')
}

mkdirSync(out, { recursive: true })
for (const [name, file, luma] of [['explosion', 'Explosion02/Explosion02_5x5.tga', false], ['fireball', 'FireBall01/FireBall01_8x8.tga', true], ['smoke', 'WispySmoke01/WispySmoke01_8x8.tga', false]]) {
  const sheet = readTga(join(source, file), luma)
  if (sheet.width !== SIZE || sheet.height !== SIZE) throw new Error(`${file}: ${SIZE}² 가 아니다`)
  await writeLayer(name, sheet.rgba)
}
const CELL = SIZE / 4
const cells = await Promise.all(SPRITES.map(async (sprite, i) => ({
  input: await sharp(join(source, 'kenney_particle-pack/PNG (Transparent)', `${sprite}.png`)).resize(CELL, CELL).ensureAlpha().png().toBuffer(),
  left: (i % 4) * CELL,
  top: Math.floor(i / 4) * CELL,
})))
const atlas = await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(cells).raw().toBuffer()
await writeLayer('sprites', atlas)
