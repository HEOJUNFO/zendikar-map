// Focused exported-asset boundary; does not build or load the production pack.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { decodeModel } from '../gltfc.mjs'
import { parsePropList, parseTextureList } from '../packc.mjs'
import { parseMeshText, loadPropLibrary } from '../meshc.mjs'
const root = 'game/gameplay/content/merchant-props'
const list = parsePropList(readFileSync(join(root, 'merchant-props.txt'), 'utf8'))
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex')
const outputs = []
for (const texture of list.textures) for (const suffix of ['.jpg', '.nar.jpg', ...(texture.metal ? ['.metal.jpg'] : [])]) {
  const path = join(root, 'textures', texture.name + suffix), bytes = readFileSync(path)
  let at = 2, found
  while (at < bytes.length) {
    assert.equal(bytes[at++], 255, 'JPEG marker')
    const marker = bytes[at++]
    if (marker === 216 || marker === 217) continue
    const length = bytes.readUInt16BE(at)
    if (marker === 192 || marker === 194) { found = { baseline: marker === 192, height: bytes.readUInt16BE(at + 3), width: bytes.readUInt16BE(at + 5) }; break }
    at += length
  }
  assert.deepEqual(found, { baseline: true, height: 2048, width: 2048 }, path)
  outputs.push({ path, ...found, bytes: bytes.length, sha256: hash(path) })
}
for (const prop of list.props) {
  const path = join(root, prop.name + '.zkmodel'), bytes = readFileSync(path), model = decodeModel(bytes)
  for (let i = 0; i < model.vertexCount; i++) {
    const vertex = model.vertices.subarray(i * 9, i * 9 + 9)
    assert.ok([...vertex].every(Number.isFinite), `${path}: finite vertex`)
    assert.ok(Math.abs(Math.hypot(...vertex.subarray(3, 6)) - 1) < .002, `${path}: unit normal`)
    assert.ok(Number.isInteger(vertex[8]) && vertex[8] >= 0 && vertex[8] < 7, `${path}: material layer`)
  }
  outputs.push({ path, vertices: model.vertexCount, triangles: model.indices.length / 3, bytes: bytes.length, sha256: hash(path) })
}
const sources = JSON.parse(readFileSync(join(root, 'source', 'sources.json'), 'utf8'))
for (const asset of sources) for (const file of asset.files) {
  const path = join(root, 'source', asset.id === 'quatrefoil_jacquard_fabric' ? 'cloth' : asset.id, file.path)
  assert.equal(hash(path), file.sha256, `${path}: preserved original SHA256`)
  assert.equal(createHash('md5').update(readFileSync(path)).digest('hex'), file.md5, `${path}: publisher checksum`)
}
const roomPath = 'game/gameplay/content/meshes/room_shop.mesh.txt'
const library = { textures: parseTextureList(readFileSync('game/gameplay/content/textures/textures.txt', 'utf8')).map(t => t.name), props: loadPropLibrary('game/gameplay/content/props/props.txt', 'game/gameplay/content/props') }
const mesh = parseMeshText(readFileSync(roomPath, 'utf8'), 'shop', library)
for (const door of [[0, 0, -21], [0, 0, 21], [-21, 0, 0], [21, 0, 0]]) assert.ok(mesh.surface.nav.some(node => node.position.every((value, i) => value === door[i])), 'all four portal routes remain authored and connected')
const layout = JSON.parse(readFileSync(join(root, 'layout.json'), 'utf8'))
const inputPaths = [roomPath, join(root, 'merchant-props.txt'), join(root, 'layout.json'), join(root, 'layout.hpp'), join(root, 'source', 'sources.json'),
  'game/tools/art/prepare.mjs', 'game/tools/art/prepare-merchant-cloth.mjs', 'game/tools/art/prepare-merchant-layout.mjs', 'game/tools/art/make-rooms.mjs', 'game/tools/art/audit-merchant-assets.mjs']
let mipPixels = 0
for (let side = 2048; side; side >>= 1) mipPixels += side * side
const result = { status: 'PASS exported assets; production pack/viewer pending root integration', command: 'node game/tools/art/audit-merchant-assets.mjs', environment: { node: process.version, platform: process.platform },
  inputHashes: inputPaths.map(path => ({ path, sha256: hash(path) })), runtimeBytes: outputs.reduce((sum, file) => sum + file.bytes, 0), textureGpuBytes: mipPixels * 4 * 2 * list.textures.length,
  textureLayers: list.textures.map(t => t.name), modelNames: list.props.map(p => p.name), placements: layout.placements.length, measuredFurnitureSolidParts: layout.colliders.length,
  room: { vertices: mesh.surface.vertices.length / 15, solids: mesh.solids.length, nav: mesh.surface.nav, lightmap: mesh.surface.lightmap }, outputs }
writeFileSync('build/merchant-assets-audit.json', JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify({ status: result.status, runtimeBytes: result.runtimeBytes, textureGpuMiB: result.textureGpuBytes / 1024 ** 2, layers: result.textureLayers, models: result.modelNames, placements: result.placements, nav: result.room.nav.length, lightmap: result.room.lightmap }))
