import { createHash, randomUUID } from 'node:crypto'
import { access, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { NodeIO } from '@gltf-transform/core'
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions'
import { dequantize, getBounds, prune, simplify, weld } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'

export const BUDGETS = Object.freeze({
  prop: { triangles: 1500, textureSize: 512 },
  'large-prop': { triangles: 4000, textureSize: 1024 },
  weapon: { triangles: 5000, textureSize: 1024 },
  creature: { triangles: 6000, textureSize: 1024 },
  boss: { triangles: 12000, textureSize: 2048 },
})

function embeddedOnly(bytes) {
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== 0x46546c67 ||
      bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length ||
      bytes.readUInt32LE(16) !== 0x4e4f534a) throw new Error('Expected a complete GLB 2 file.')
  const length = bytes.readUInt32LE(12)
  if (length > 16 * 1024 * 1024 || 20 + length > bytes.length) throw new Error('Invalid GLB JSON boundary.')
  const json = JSON.parse(bytes.subarray(20, 20 + length).toString('utf8').trim())
  for (const resource of [...(json.buffers ?? []), ...(json.images ?? [])]) {
    if (resource.uri && !resource.uri.startsWith('data:')) throw new Error('External GLB resources are not accepted.')
  }
  const supported = new Set(['EXT_meshopt_compression', 'KHR_mesh_quantization'])
  if ([...(json.extensionsUsed ?? []), ...(json.extensionsRequired ?? [])].some(name => !supported.has(name))) {
    throw new Error('Unsupported GLB extension; refusing to drop rendering features.')
  }
  return json
}

async function metrics(document) {
  const root = document.getRoot()
  if (root.listScenes().length !== 1) throw new Error('Expected exactly one renderable scene.')
  let triangles = 0, vertices = 0, primitives = 0
  for (const mesh of root.listMeshes()) for (const primitive of mesh.listPrimitives()) {
    if (primitive.getMode() !== 4) throw new Error('Only triangle primitives are supported.')
    const position = primitive.getAttribute('POSITION')
    const count = primitive.getIndices()?.getCount() ?? position?.getCount() ?? 0
    if (!position || count % 3) throw new Error('Invalid triangle geometry.')
    triangles += count / 3
    vertices += position.getCount()
    primitives++
  }
  const textures = []
  for (const texture of root.listTextures()) {
    const image = texture.getImage()
    if (!image) throw new Error('A texture has no embedded image.')
    const info = await sharp(image).metadata()
    textures.push({ width: info.width, height: info.height, mimeType: texture.getMimeType(), bytes: image.byteLength })
  }
  const bounds = getBounds(root.listScenes()[0])
  if (!triangles || ![...bounds.min, ...bounds.max].every(Number.isFinite)) throw new Error('The GLB has no finite renderable geometry.')
  return {
    triangles, vertices, primitives, meshes: root.listMeshes().length,
    materials: root.listMaterials().length,
    pbrMaterials: root.listMaterials().filter(m => m.getBaseColorTexture() && m.getNormalTexture() && m.getMetallicRoughnessTexture()).length,
    bounds, textures,
  }
}

async function loadGlb(input) {
  const bytes = await readFile(input)
  const json = embeddedOnly(bytes)
  await MeshoptDecoder.ready
  const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
  return { bytes, json, io, document: await io.readBinary(bytes) }
}

export async function inspectGlb(input) {
  const { bytes, json, document } = await loadGlb(input)
  return {
    ...await metrics(document), skins: document.getRoot().listSkins().length,
    animations: document.getRoot().listAnimations().length,
    requiredExtensions: json.extensionsRequired ?? [],
    bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
  }
}

export async function optimizeGlb(input, output, options = {}) {
  const preset = options.preset ?? 'prop'
  if (!BUDGETS[preset]) throw new Error('Unknown asset budget preset.')
  const target = options.triangles ?? BUDGETS[preset].triangles
  const edge = options.textureSize ?? BUDGETS[preset].textureSize
  if (!Number.isInteger(target) || target < 1 || target > 20000) throw new Error('Triangle budget must be 1..20000.')
  if (![256, 512, 1024, 2048].includes(edge)) throw new Error('Texture budget must be 256, 512, 1024, or 2048.')
  input = resolve(input); output = resolve(output)
  if ((process.platform === 'win32' ? input.toLowerCase() === output.toLowerCase() : input === output)) {
    throw new Error('Keep the source GLB separate from the optimized output.')
  }
  const exists = await access(output).then(() => true, () => false)
  if (exists && !options.overwrite) throw new Error('Output exists; use --overwrite explicitly.')
  const { bytes, io, document } = await loadGlb(input)
  const root = document.getRoot()
  root.listExtensionsUsed().find(extension => extension.extensionName === 'EXT_meshopt_compression')?.dispose()
  await document.transform(dequantize())
  // ceiling: Static, embedded GLB only. Add a tested skin/morph-aware path before optimizing animated assets.
  if (root.listSkins().length || root.listAnimations().length ||
      root.listMeshes().some(m => m.listPrimitives().some(p => p.listTargets().length))) {
    throw new Error('Skinned, animated, and morph-target assets need a separate optimization path.')
  }
  const before = await metrics(document)
  if (before.triangles > target) {
    await MeshoptSimplifier.ready
    await document.transform(weld(), simplify({
      simplifier: MeshoptSimplifier, ratio: target / before.triangles, error: 0.002, lockBorder: true,
    }))
  }
  for (const texture of root.listTextures()) {
    const image = texture.getImage()
    const info = await sharp(image).metadata()
    if (Math.max(info.width, info.height) <= edge) continue
    let resize = sharp(image).resize(edge, edge, { fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' })
    if (texture.getMimeType() === 'image/jpeg') resize = resize.jpeg({ quality: 88, chromaSubsampling: '4:4:4' })
    else if (texture.getMimeType() === 'image/png') resize = resize.png({ compressionLevel: 9 })
    else throw new Error('Only JPEG and PNG texture resizing is supported.')
    texture.setImage(await resize.toBuffer())
  }
  await document.transform(prune({ keepSolidTextures: true }))
  const after = await metrics(document)
  const longest = Math.max(...before.bounds.max.map((value, i) => value - before.bounds.min[i]))
  const drift = Math.max(...after.bounds.min.map((v, i) => Math.abs(v - before.bounds.min[i])),
    ...after.bounds.max.map((v, i) => Math.abs(v - before.bounds.max[i]))) / longest
  if (after.triangles > target) throw new Error('Safe simplification could not meet the triangle budget.')
  if (after.materials !== before.materials || after.pbrMaterials !== before.pbrMaterials ||
      after.primitives !== before.primitives || !Number.isFinite(drift) || drift > 0.01) throw new Error('Geometry bounds or material bindings changed beyond the allowed limit.')
  if (after.textures.some(t => Math.max(t.width, t.height) > edge)) throw new Error('Texture budget was exceeded.')
  const optimized = await io.writeBinary(document)
  await mkdir(dirname(output), { recursive: true })
  const temporary = output + '.' + randomUUID() + '.tmp'
  try { await writeFile(temporary, optimized, { flag: 'wx' }); await rename(temporary, output) }
  finally { await rm(temporary, { force: true }) }
  return {
    preset, budget: { triangles: target, textureSize: edge }, before, after, boundsDriftRatio: drift,
    source: { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') },
    output: { bytes: optimized.length, sha256: createHash('sha256').update(optimized).digest('hex') },
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (process.argv[2] === '--inspect') {
      if (process.argv.length !== 4) throw new Error('Usage: node scripts/tripo-studio/optimize-glb.mjs --inspect model.glb')
      console.log(JSON.stringify(await inspectGlb(process.argv[3]), null, 2))
    } else {
      const args = process.argv.slice(2), input = args.shift(), output = args.shift(), options = {}
      let report
      if (!input || !output) throw new Error('Usage: node scripts/tripo-studio/optimize-glb.mjs source.glb output.glb --preset large-prop [--overwrite] [--report file.json]')
      while (args.length) {
        const flag = args.shift()
        if (flag === '--overwrite') options.overwrite = true
        else if (flag === '--preset') options.preset = args.shift()
        else if (flag === '--triangles') options.triangles = Number(args.shift())
        else if (flag === '--texture-size') options.textureSize = Number(args.shift())
        else if (flag === '--report') report = args.shift()
        else throw new Error('Unknown optimization option.')
      }
      if (report) {
        const paths = [report, input, output].map(p => process.platform === 'win32' ? resolve(p).toLowerCase() : resolve(p))
        if (paths[0] === paths[1] || paths[0] === paths[2]) throw new Error('Report must not overwrite an input or output GLB.')
      }
      const result = await optimizeGlb(input, output, options)
      if (report) { await mkdir(dirname(resolve(report)), { recursive: true }); await writeFile(report, JSON.stringify(result, null, 2) + '\n') }
      console.log(JSON.stringify(result, null, 2))
    }
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
