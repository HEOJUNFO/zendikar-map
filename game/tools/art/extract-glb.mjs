// GLB 하나를 gltfc·prepare 가 읽는 꼴(.gltf + .bin + 그림 파일)로 푼다 — 삼각형·UV·그림의 바이트는 그대로다.
// Tripo Studio 에서 받은 GLB(game/art-work/<작업>/generated/<소품>/<소품>.glb)를 같은 작업의 extracted/<소품>/ 에 풀 때 쓴다.
// 사용: node game/tools/art/extract-glb.mjs <glb> <출력 폴더> <이름>
//   → <이름>.gltf · <이름>.bin · textures/<이름>_{color,orm,normal}.<확장자> (재질의 색·ORM·법선 그림)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [input, outDir, name] = process.argv.slice(2)
if (!input || !outDir || !/^[a-z0-9_]+$/.test(name ?? '')) throw new Error('사용: extract-glb.mjs <glb> <출력 폴더> <이름>')
const bytes = readFileSync(input)
if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) throw new Error('GLB 2 가 아니다')
const jsonLength = bytes.readUInt32LE(12)
if (bytes.readUInt32LE(16) !== 0x4e4f534a) throw new Error('첫 조각이 JSON 이 아니다')
const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'))
const binAt = 20 + jsonLength
if (bytes.readUInt32LE(binAt + 4) !== 0x004e4942) throw new Error('둘째 조각이 BIN 이 아니다')
const bin = bytes.subarray(binAt + 8, binAt + 8 + bytes.readUInt32LE(binAt))
if (gltf.buffers?.length !== 1 || gltf.buffers[0].uri || gltf.materials?.length !== 1) throw new Error('버퍼 하나·재질 하나인 GLB 만 푼다')

const material = gltf.materials[0]
const roles = new Map([
  [material.pbrMetallicRoughness?.baseColorTexture?.index, 'color'],
  [material.pbrMetallicRoughness?.metallicRoughnessTexture?.index, 'orm'],
  [material.normalTexture?.index, 'normal'],
].filter(([index]) => index !== undefined).map(([index, role]) => [gltf.textures[index].source, role]))
mkdirSync(join(outDir, 'textures'), { recursive: true })
gltf.images = gltf.images.map((image, index) => {
  const role = roles.get(index)
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png' }[image.mimeType]
  if (!role || !extension || image.bufferView === undefined) throw new Error(`그림 ${index}: 재질이 쓰는 내장 JPEG·PNG 가 아니다`)
  const view = gltf.bufferViews[image.bufferView]
  const uri = `textures/${name}_${role}.${extension}`
  writeFileSync(join(outDir, uri), bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength))
  return { uri }
})
gltf.buffers = [{ uri: `${name}.bin`, byteLength: bin.length }]
gltf.nodes[gltf.scenes[gltf.scene ?? 0].nodes[0]].name = name
writeFileSync(join(outDir, `${name}.bin`), bin)
writeFileSync(join(outDir, `${name}.gltf`), JSON.stringify(gltf, null, 1) + '\n')
console.log(`${name}: ${gltf.images.map((image) => image.uri).join(', ')}, ${bin.length} B`)
