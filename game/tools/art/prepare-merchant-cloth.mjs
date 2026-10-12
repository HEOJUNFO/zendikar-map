// Authored draped cloth only; furniture geometry remains the original scans.
// Creates a reproducible glTF source using the licensed native 2K jacquard.
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const folder = resolve('game/gameplay/content/merchant-props/source/cloth')
mkdirSync(folder, { recursive: true })
const positions = [], normals = [], uvs = [], indices = [], rows = 60, cols = 24
const point = (u, v) => {
  const x = (u - .5) * .5
  if (v <= .66) return [x, .871 + .003 * Math.sin(u * Math.PI * 6) * Math.sin(v / .66 * Math.PI), -.44 - v / .66 * 1.03]
  const t = (v - .66) / .34
  return [x, .871 - .501 * t, -1.47 - .015 * Math.sin(u * Math.PI * 6) * Math.sin(t * Math.PI) - .01 * t]
}
for (let y = 0; y <= rows; y++) for (let x = 0; x <= cols; x++) {
  const u = x / cols, v = y / rows, p = point(u, v)
  const a = point(u + .0001, v), b = point(u, Math.min(1, v + .0001)), c = point(u, Math.max(0, v - .0001))
  const du = a.map((n, k) => n - p[k]), dv = b.map((n, k) => n - c[k])
  const n = [du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]], length = Math.hypot(...n)
  positions.push(...p); normals.push(...n.map(k => k / length)); uvs.push(u * 1.8, v * 5.5)
  if (x < cols && y < rows) { const i = y * (cols + 1) + x; indices.push(i, i + 1, i + cols + 2, i, i + cols + 2, i + cols + 1) }
}
const chunks = [new Float32Array(positions), new Float32Array(normals), new Float32Array(uvs), new Uint32Array(indices)]
let offset = 0
const bufferViews = chunks.map((chunk, i) => { const view = { buffer: 0, byteOffset: offset, byteLength: chunk.byteLength, target: i === 3 ? 34963 : 34962 }; offset += chunk.byteLength; return view })
writeFileSync(resolve(folder, 'merchant_cloth.bin'), Buffer.concat(chunks.map(chunk => Buffer.from(chunk.buffer))))
const min = [0, 1, 2].map(k => Math.min(...positions.filter((_, i) => i % 3 === k))), max = [0, 1, 2].map(k => Math.max(...positions.filter((_, i) => i % 3 === k)))
const gltf = { asset: { version: '2.0', generator: 'Zendikar authored draped jacquard; CC0 source weave preserved' },
  buffers: [{ uri: 'merchant_cloth.bin', byteLength: offset }], bufferViews,
  accessors: [
    { bufferView: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3', min, max },
    { bufferView: 1, componentType: 5126, count: normals.length / 3, type: 'VEC3' },
    { bufferView: 2, componentType: 5126, count: uvs.length / 2, type: 'VEC2' },
    { bufferView: 3, componentType: 5125, count: indices.length, type: 'SCALAR' },
  ], images: [{ uri: 'quatrefoil_jacquard_fabric_diff_2k.jpg' }], textures: [{ source: 0 }],
  materials: [{ name: 'woven_jacquard', doubleSided: true, pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: .85 } }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] }],
  nodes: [{ name: 'merchant_cloth', mesh: 0 }], scenes: [{ nodes: [0] }], scene: 0 }
writeFileSync(resolve(folder, 'merchant_cloth.gltf'), JSON.stringify(gltf, null, 2) + '\n')
console.log('merchant cloth', indices.length / 3, 'triangles', { min, max })
