import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import test from 'node:test'
import { Document, NodeIO } from '@gltf-transform/core'
import sharp from 'sharp'
import { inspectGlb, optimizeGlb } from './optimize-glb.mjs'

async function fixture(directory, { skin = false, size = 512 } = {}) {
  const document = new Document(), buffer = document.createBuffer()
  const positions = [], normals = [], uvs = [], indices = []
  // A 20 x 20 grid has exactly 800 triangles; expected counts do not come from the optimizer.
  for (let y = 0; y <= 20; y++) for (let x = 0; x <= 20; x++) {
    positions.push(x / 20, y / 20, 0); normals.push(0, 0, 1); uvs.push(x / 20, y / 20)
  }
  for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
    const a = y * 21 + x
    indices.push(a, a + 1, a + 21, a + 1, a + 22, a + 21)
  }
  const image = await sharp({ create: { width: size, height: size / 2, channels: 3, background: '#8080ff' } }).png().toBuffer()
  const texture = document.createTexture().setImage(image).setMimeType('image/png')
  const material = document.createMaterial().setBaseColorTexture(texture).setNormalTexture(texture).setMetallicRoughnessTexture(texture)
  const attribute = (type, array) => document.createAccessor().setType(type).setArray(array).setBuffer(buffer)
  const primitive = document.createPrimitive().setMaterial(material)
    .setAttribute('POSITION', attribute('VEC3', new Float32Array(positions)))
    .setAttribute('NORMAL', attribute('VEC3', new Float32Array(normals)))
    .setAttribute('TEXCOORD_0', attribute('VEC2', new Float32Array(uvs)))
    .setIndices(attribute('SCALAR', new Uint16Array(indices)))
  const node = document.createNode().setMesh(document.createMesh().addPrimitive(primitive))
  if (skin) node.setSkin(document.createSkin().addJoint(document.createNode()))
  document.createScene().addChild(node)
  const path = join(directory, 'source.glb')
  await writeFile(path, await new NodeIO().writeBinary(document))
  return path
}

async function temporary(t) {
  const root = fileURLToPath(new URL('../../build/tripo-studio-tests/', import.meta.url))
  await mkdir(root, { recursive: true })
  const directory = await mkdtemp(join(root, 'asset-'))
  assert.ok(directory.startsWith(root))
  t.after(() => rm(directory, { recursive: true, force: true }))
  return directory
}

test('reduces a static PBR asset within budgets and preserves source, maps, aspect and bounds', async t => {
  const directory = await temporary(t), source = await fixture(directory), output = join(directory, 'optimized.glb')
  const original = await readFile(source)
  const report = await optimizeGlb(source, output, { triangles: 300, textureSize: 256 })
  const actual = await inspectGlb(output)
  assert.equal(report.before.triangles, 800)
  assert.ok(actual.triangles > 0 && actual.triangles <= 300)
  assert.equal(actual.pbrMaterials, 1)
  assert.equal(actual.primitives, 1)
  assert.deepEqual(actual.textures.map(t => [t.width, t.height]), [[256, 128]])
  assert.deepEqual(actual.bounds, { min: [0, 0, 0], max: [1, 1, 0] })
  assert.equal(actual.sha256, report.output.sha256)
  assert.deepEqual(await readFile(source), original)
  await assert.rejects(optimizeGlb(source, output), /Output exists/)
  await optimizeGlb(source, output, { triangles: 300, textureSize: 256, overwrite: true })
})

test('leaves already small textures and geometry at their existing size', async t => {
  const directory = await temporary(t), source = await fixture(directory, { size: 128 })
  const output = join(directory, 'optimized.glb')
  await optimizeGlb(source, output)
  const actual = await inspectGlb(output)
  assert.equal(actual.triangles, 800)
  assert.deepEqual(actual.textures.map(t => [t.width, t.height]), [[128, 64]])
})

test('rejects animated asset paths, invalid budgets and destructive source replacement', async t => {
  const directory = await temporary(t), source = await fixture(directory, { skin: true }), output = join(directory, 'output.glb')
  await assert.rejects(optimizeGlb(source, output), /Skinned, animated/)
  await assert.rejects(optimizeGlb(source, source, { overwrite: true }), /Keep the source/)
  await assert.rejects(optimizeGlb(source, output, { textureSize: 8192 }), /Texture budget/)
  await assert.rejects(optimizeGlb(source, output, { triangles: 0 }), /Triangle budget/)
  await assert.rejects(promisify(execFile)(process.execPath, [
    fileURLToPath(new URL('./optimize-glb.mjs', import.meta.url)), source, output, '--report', source,
  ]), error => error.code === 1 && /Report must not overwrite/.test(error.stderr))
  await assert.rejects(readFile(output), { code: 'ENOENT' })
})

test('rejects external resources, unsupported extensions and truncated GLB before reading resources', async t => {
  const directory = await temporary(t), input = join(directory, 'bad.glb')
  const pack = json => {
    const text = Buffer.from(JSON.stringify(json)), padding = (4 - text.length % 4) % 4
    const data = Buffer.concat([Buffer.alloc(20), text, Buffer.alloc(padding, 0x20)])
    data.writeUInt32LE(0x46546c67, 0); data.writeUInt32LE(2, 4); data.writeUInt32LE(data.length, 8)
    data.writeUInt32LE(text.length + padding, 12); data.writeUInt32LE(0x4e4f534a, 16)
    return data
  }
  for (const resource of [{ images: [{ uri: 'https://example.invalid/secret.png' }] }, { buffers: [{ uri: '../private.bin' }] }]) {
    await writeFile(input, pack({ asset: { version: '2.0' }, ...resource }))
    await assert.rejects(inspectGlb(input), /External GLB resources/)
  }
  await writeFile(input, pack({ asset: { version: '2.0' }, extensionsUsed: ['KHR_materials_transmission'] }))
  await assert.rejects(inspectGlb(input), /Unsupported GLB extension/)
  await writeFile(input, Buffer.alloc(12))
  await assert.rejects(inspectGlb(input), /complete GLB 2/)
})
