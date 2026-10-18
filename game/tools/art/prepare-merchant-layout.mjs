// One measured source of truth for rendering, baked furniture shadows, lights
// and room collision. Run after prepare.mjs --only merchant-props.
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { decodeModel } from '../gltfc.mjs'
import { parsePropList } from '../packc.mjs'
const folder = resolve('game/gameplay/content/merchant-props')
// 상점 방의 가구와 소품 — 이 프로젝트의 콘셉트에서 Tripo Studio 로 만든 메시들 (진행은 game/art-work/shop-room/STATUS.md).
// 목록과 차례는 merchant-props.txt 이고(소품마다 텍스처 하나·모델 하나, 같은 이름), 여기서는 방에 놓는다.
// 방(room_shop): 원점이 상인 자리, 북쪽(-z)이 문, 방은 x -7…7, z -10…6, 문까지의 회랑은 x -4…4, z -24…-10. 상인은 북쪽을 본다.
// 배치는 콘셉트 전경(game/art-work/shop-room/concepts/room)을 따른다 — 문에서 볼 때 왼쪽이 +x 다.
const catalog = parsePropList(readFileSync(join(folder, 'merchant-props.txt'), 'utf8'), 'merchant-props.txt')
const names = catalog.props.map((prop) => prop.name)
if (catalog.textures.length !== names.length || catalog.textures.some((texture, i) => texture.name !== names[i])) throw new Error('merchant-props.txt: 텍스처와 모델의 이름·차례가 같아야 한다')
const models = names.map((name, id) => {
  const model = decodeModel(readFileSync(join(folder, 'models', name + '.zkmodel'))), vertices = model.vertices
  const points = Array.from({ length: model.vertexCount }, (_, i) => [...vertices.subarray(i * 9, i * 9 + 3)])
  const bounds = { min: [0, 1, 2].map(k => Math.min(...points.map(p => p[k]))), max: [0, 1, 2].map(k => Math.max(...points.map(p => p[k]))) }
  return { id, name, pack: `merchant-prop/${name}`, bounds, size: [0, 1, 2].map(k => bounds.max[k] - bounds.min[k]), triangles: model.indices.length / 3, points }
})
const transform = (m, p) => [0, 1, 2].map(k => m[k] * p[0] + m[4 + k] * p[1] + m[8 + k] * p[2] + m[12 + k])
const placements = [], colliders = [], lights = []
// 빛을 내는 소품 — 놓을 때마다 수정 자리(모델 높이의 at 만큼 위)에 구운 점광원을 하나 두고, 제 몸은 그 빛으로 밝혀 그린다 (GLOW — 실시간 광원은 없다).
// power·reach 는 방 틀의 벽등(make-rooms.mjs 의 sconce)과 같은 단위다.
const GLOWING = {
  amber_crystal_lamp: { at: .68, color: '#ffb866', power: 1.5, reach: 6, radius: .08 },
  wall_sconce: { at: .55, color: '#ffc98a', power: 3.2, reach: 10, radius: .2 },
}
// Tripo 의 메시는 콘셉트의 앞면(front.png)이 +x 를 본다 (밑면이 y 0, 옆으로는 가운데가 원점 — gltfc 의 settle).
// facing 은 앞면이 볼 쪽: 'N'(-z, 문 쪽) 'S'(+z) 'E'(+x) 'W'(-x). 크기는 높이(height)나 긴 변(length)을 미터로 준다.
const YAW = { E: 0, S: Math.PI / 2, W: Math.PI, N: -Math.PI / 2 }
function place(name, [x, y, z], facing, measure, { solid = false } = {}) {
  const model = models[names.indexOf(name)]
  if (!model) throw new Error(`배치: '${name}' 이 목록에 없다`)
  const scale = measure.scale ?? (measure.height !== undefined ? measure.height / model.size[1] : measure.length / Math.max(...model.size))
  const yaw = YAW[facing], c = Math.cos(yaw) * scale, s = Math.sin(yaw) * scale
  const matrix = [c, 0, s, 0, 0, scale, 0, 0, -s, 0, c, 0, x, y, z, 1]
  const points = model.points.map(p => transform(matrix, p))
  const bounds = { min: [0, 1, 2].map(k => Math.min(...points.map(p => p[k]))), max: [0, 1, 2].map(k => Math.max(...points.map(p => p[k]))) }
  const placement = { model: model.id, matrix, bounds }
  placements.push(placement)
  if (solid) colliders.push({ name, ...bounds })
  const glow = GLOWING[name]
  if (glow) lights.push({ position: [(bounds.min[0] + bounds.max[0]) / 2, bounds.min[1] + (bounds.max[1] - bounds.min[1]) * glow.at, (bounds.min[2] + bounds.max[2]) / 2], color: glow.color, power: glow.power, reach: glow.reach, radius: glow.radius })
  return placement
}
/** 다른 가구의 윗면에 올린다 — x, z 는 방의 좌표 */
const on = (base, x, z) => [x, base.bounds.max[1], z]

// 메인 카운터 — 윗면이 0.863 m, 뒷변은 앉은 상인의 손끝 앞(z -0.438)
const COUNTER_TOP = .8627734065, COUNTER_REAR = -.4383572042
const counterModel = models[names.indexOf('counter')]
const counterScale = COUNTER_TOP / counterModel.size[1]
const counter = place('counter', [0, 0, COUNTER_REAR - counterModel.size[0] * counterScale / 2], 'N', { scale: counterScale }, { solid: true })
place('amber_crystal_lamp', on(counter, -1.25, -1.35), 'N', { height: .5 })
place('memory_card_spread', on(counter, .15, -1.45), 'N', { length: .62 })
place('memory_card_deck', on(counter, .85, -.95), 'N', { length: .2 })
place('memory_crystal', on(counter, 1.35, -1.55), 'N', { height: .42 })
place('ledger_books', on(counter, -.45, -.9), 'N', { length: .5 })

// 상인의 자리 — 등받이 높은 의자와 뒷벽의 벽감
place('merchant_chair', [0, 0, .62], 'N', { height: 1.6 }, { solid: true })
place('merchant_niche_arch', [0, 0, 5.2], 'N', { height: 4.4 }, { solid: true })
// 뒷벽 — 벽감 양옆의 선반과 깃발, 옆벽의 창
for (const side of [-1, 1]) {
  place('wall_shelf_alcove', [side * 4.45, 0, 5.4], 'N', { height: 3.0 }, { solid: true })
  place('hanging_banner', [side * 2.85, 2.5, 5.9], 'N', { height: 2.4 })
  // This is a wall bay, from floor to the archive ceiling. Its inner face
  // projects only 15 cm into the room; make-rooms leaves its masonry opening.
  const window = models[names.indexOf('kor_window_module')]
  const height = 6.45, halfDepth = window.size[0] * height / window.size[1] / 2
  place('kor_window_module', [side * (7 + halfDepth - .15), 0, 2.9], side > 0 ? 'W' : 'E', { height })
}
// 문에서 카운터까지의 러너 (모델의 긴 변이 x — 앞면을 북쪽으로 돌리면 z 를 따라 눕는다)
place('indigo_floor_runner', [0, .04, -6.3], 'N', { length: 7.0 })
// 입구 — 회랑 어귀 양옆의 룬 기둥과 그 안쪽 면의 깃발
for (const side of [-1, 1]) {
  place('rune_pillar', [side * 4.95, 0, -9.3], 'S', { height: 6.2 }, { solid: true })
  place('hanging_banner', [side * 4.95, 2.0, -8.62], 'S', { height: 2.4 })
}
// 왼쪽(+x) — 검수대와 그 위의 그릇·등·장부, 앞의 걸상
const exam = place('examination_table', [5.9, 0, -5.5], 'W', { height: .8 }, { solid: true })
place('bronze_bowl', on(exam, 5.9, -5.0), 'W', { length: .42 })
place('amber_crystal_lamp', on(exam, 6.0, -6.1), 'W', { height: .5 })
place('ledger_books', on(exam, 5.8, -4.3), 'W', { length: .5 })
place('low_stool', [4.4, 0, -5.2], 'W', { height: .46 })
// 오른쪽(-x) 입구 쪽 — 수정 진열대와 그 위의 수정·등·카드
const display = place('crystal_display_table', [-5.9, 0, -7.0], 'E', { height: .95 }, { solid: true })
place('amber_crystal_lamp', on(display, -6.1, -7.4), 'E', { height: .5 })
place('amber_crystal_lamp', on(display, -6.1, -6.6), 'E', { height: .5 })
place('memory_crystal', on(display, -5.6, -7.0), 'E', { height: .42 })
place('memory_card_single', on(display, -5.5, -6.45), 'E', { length: .3 })
// 구석의 기물 — 통, 궤, 항아리
place('supply_barrel', [6.25, 0, 1.4], 'W', { height: 1.0 }, { solid: true })
place('ceramic_urn', [6.2, 0, -.4], 'W', { height: .9 })
place('storage_chest', [-6.2, 0, 1.6], 'E', { length: 1.2 }, { solid: true })
place('ceramic_urn', [-6.2, 0, -.1], 'E', { height: .9 })
place('low_stool', [1.2, 0, -3.3], 'N', { height: .46 })
// 벽등 — 방 틀의 구운 빛 여섯 자리(make-rooms.mjs 의 room_shop)에 건다
for (const side of [-1, 1]) {
  place('wall_sconce', [side * 5, 2.25, -9.78], 'S', { height: .9 })
  place('wall_sconce', [side * 6.78, 2.25, .5], side > 0 ? 'W' : 'E', { height: .9 })
  place('wall_sconce', [side * 3.78, 2.25, -17], side > 0 ? 'W' : 'E', { height: .9 })
}
// 천장의 갈빗대 — 옆벽에서 가운데 쪽으로 (모델의 긴 변이 z — 앞면을 남·북으로 돌리면 x 를 따라 눕는다)
for (const side of [-1, 1]) for (const z of [-7, -1.5]) place('ceiling_rib', [side * 4.6, 5.45, z], side > 0 ? 'N' : 'S', { length: 4.6 })

const output = { version: 2, room: 'room_shop', anchor: 'room model origin; fixed independently of merchant corpse position',
  neutralMerchant: { position: [0, 0, 0], yaw: 0 }, models: models.map(({ points: _points, size: _size, ...model }) => model), placements, colliders, lights,
  fit: { counterTop: counter.bounds.max[1], counterRearEdge: counter.bounds.max[2], authoredHandsMinZ: -.32115182 } }
writeFileSync(join(folder, 'layout.json'), JSON.stringify(output, null, 2) + '\n')
const f = v => `${Math.abs(v) < 1e-10 ? '0.0' : Number(v.toPrecision(10)).toString().includes('.') || /e/i.test(v.toString()) ? Number(v.toPrecision(10)) : Number(v.toPrecision(10)) + '.0'}f`
const vec = p => `{${p.map(f).join(', ')}}`
let header = `#pragma once\n#include <array>\n#include <cstdint>\n#include <string_view>\n#include "engine/foundation/math.hpp"\n\n// Generated by tools/art/prepare-merchant-layout.mjs from merchant-props.txt and the exported meshes.\nnamespace game::merchant_art {\nstruct Placement { uint32_t model; engine::Mat4 matrix; };\n// 가구의 이름 — merchant-props.txt 의 차례 (텍스처 층과 모델 번호가 같다)\ninline constexpr std::array<std::string_view, ${models.length}> MODEL_NAMES{${models.map(m => '"' + m.name + '"').join(', ')}};\ninline constexpr std::array<std::string_view, ${models.length}> MODEL_ASSETS{${models.map(m => '"' + m.pack + '"').join(', ')}};\n// 스스로 빛나는 가구 (등) — 제 몸을 프로브 대신 제 빛으로 밝힌다
inline constexpr std::array<bool, ${models.length}> MODEL_GLOWS{${models.map(m => GLOWING[m.name] ? 'true' : 'false').join(', ')}};
inline constexpr std::array<Placement, ${placements.length}> PLACEMENTS{{\n`
for (const placement of placements) header += `  {${placement.model}, {.m = ${vec(placement.matrix)}}},\n`
header += `}};\ninline constexpr std::array<engine::Aabb, ${colliders.length}> COLLIDERS{{\n`
for (const collider of colliders) header += `  {${vec(collider.min)}, ${vec(collider.max)}}, // ${collider.name}\n`
header += `}};\n} // namespace game::merchant_art\n`
writeFileSync(join(folder, 'layout.hpp'), header)
console.log('MERCHANT-LAYOUT', placements.length, 'placements;', colliders.length, 'solid parts;', lights.length, 'baked lights')
