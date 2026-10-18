// Public WebGPU shader regression. Uses production WGSL and reads actual GPU pixels.
// Run: node game/tests/creature-lighting.browser.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { launchChrome } from '../../scripts/qa/chrome.mjs'

const shaderPath = '../engine/render/wgsl/surface_animated.wgsl'
const expand = source => source.replace(/^#include "([\w]+\.wgsl)"$/gm, (_, name) => readFileSync(new URL(`../engine/render/wgsl/include/${name}`, import.meta.url), 'utf8'))

async function pixels(source) {
  const adapter = await navigator.gpu?.requestAdapter()
  if (!adapter) throw new Error('WebGPU adapter unavailable')
  const device = await adapter.requestDevice()
  const module = device.createShaderModule({ code: source })
  const errors = (await module.getCompilationInfo()).messages.filter(message => message.type === 'error')
  if (errors.length) throw new Error(errors.map(error => error.message).join('\n'))
  const attr = (shaderLocation, offset, format) => ({ shaderLocation, offset, format })
  const pipeline = await device.createRenderPipelineAsync({
    layout: 'auto',
    vertex: { module, entryPoint: 'vs_main', buffers: [
      { arrayStride: 60, attributes: [attr(0, 0, 'float32x3'), attr(1, 12, 'float32x3'), attr(2, 24, 'float32x2'), attr(3, 32, 'float32x2'), attr(4, 40, 'float32x4'), attr(5, 56, 'float32')] },
      { arrayStride: 84, stepMode: 'instance', attributes: [attr(6, 0, 'float32x4'), attr(7, 16, 'float32x4'), attr(8, 32, 'float32x4'), attr(9, 48, 'float32x4'), attr(10, 64, 'float32x4'), attr(11, 80, 'float32')] },
      { arrayStride: 60, attributes: [attr(12, 0, 'float32x3'), attr(13, 12, 'float32x3')] },
    ] },
    fragment: { module, entryPoint: 'fs_main', targets: [{ format: 'rgba8unorm' }] },
  })
  const buffer = (data, usage) => {
    const result = device.createBuffer({ size: data.byteLength, usage: usage | GPUBufferUsage.COPY_DST })
    device.queue.writeBuffer(result, 0, data)
    return result
  }
  // A textured monster with source colour alpha 1 must still use its PBR/probe path.
  // V is flipped exactly as the Blender ModelMesh exporters do (1 - source V).
  const vertices = buffer(new Float32Array([-1, -1, .5, 0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0, 3, -1, .5, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, -1, 3, .5, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0]), GPUBufferUsage.VERTEX)
  const uniforms = buffer(new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 260, 1, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 5, 0]), GPUBufferUsage.UNIFORM)
  const instance = device.createBuffer({ size: 84, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST })
  let normalMap
  const texture = (rgba, array = false, srgb = false) => {
    const result = device.createTexture({ size: [1, 1, 1], format: srgb ? 'rgba8unorm-srgb' : 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST })
    device.queue.writeTexture({ texture: result }, new Uint8Array(rgba), { bytesPerRow: 4 }, [1, 1, 1])
    if (array && rgba[2] === 217) normalMap = result
    return result.createView({ dimension: array ? '2d-array' : '2d' })
  }
  const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' })
  const bind = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [
    { binding: 0, resource: { buffer: uniforms } }, { binding: 1, resource: texture([128, 96, 64, 255], true, true) },
    { binding: 2, resource: sampler }, { binding: 3, resource: texture([0, 0, 0, 255]) }, { binding: 4, resource: sampler },
    { binding: 5, resource: texture([128, 128, 217, 255], true) }, { binding: 6, resource: texture([128, 128, 255, 0]) },
  ] })
  const target = device.createTexture({ size: [4, 4], format: 'rgba8unorm', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC })
  const readback = device.createBuffer({ size: 1024, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ })
  const draw = async (light, sun, flash = 0, normalXY = [128, 128], direction = [0, 0, 1]) => {
    const incident = light * (1 + flash * .85)
    device.queue.writeBuffer(uniforms, 96, new Float32Array([...direction, 0]))
    device.queue.writeTexture({ texture: normalMap }, new Uint8Array([...normalXY, 217, 255]), { bytesPerRow: 4 }, [1, 1, 1])
    device.queue.writeBuffer(instance, 0, new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, incident, incident, incident, sun, incident, incident, incident, 0, .5]))
    const encoder = device.createCommandEncoder()
    const pass = encoder.beginRenderPass({ colorAttachments: [{ view: target.createView(), clearValue: [0, 0, 0, 1], loadOp: 'clear', storeOp: 'store' }] })
    pass.setPipeline(pipeline)
    pass.setBindGroup(0, bind)
    pass.setVertexBuffer(0, vertices)
    pass.setVertexBuffer(1, instance)
    pass.setVertexBuffer(2, vertices)
    pass.draw(3)
    pass.end()
    encoder.copyTextureToBuffer({ texture: target }, { buffer: readback, bytesPerRow: 256 }, [4, 4])
    device.queue.submit([encoder.finish()])
    await readback.mapAsync(GPUMapMode.READ)
    const rgb = [...new Uint8Array(readback.getMappedRange()).slice(260, 263)]
    readback.unmap()
    return rgb
  }
  try {
    return { dark: await draw(0, 0), warningDark: await draw(0, 0, .55), hitDark: await draw(0, 0, .85),
      shadow: await draw(.04, 0), lit: await draw(.4, 0), sun: await draw(.4, 1), hitLit: await draw(.4, 0, .85),
      greenUp: await draw(.04, 1, 0, [128, 200], [0, 1, 0]), greenDown: await draw(.04, 1, 0, [128, 200], [0, -1, 0]),
      redRight: await draw(.04, 1, 0, [200, 128], [1, 0, 0]), redLeft: await draw(.04, 1, 0, [200, 128], [-1, 0, 0]) }
  } finally { device.destroy() }
}

const server = createServer((request, response) => { response.writeHead(200, { 'Content-Type': 'text/html' }); response.end('<!doctype html><title>Creature lighting probe</title>') })
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
let chrome
try {
  chrome = await launchChrome({ args: ['--enable-unsafe-webgpu'], maxMinutes: 2 })
  const { sessionId } = await chrome.newPage(`http://127.0.0.1:${server.address().port}`)
  const sample = async source => {
    const result = await chrome.send('Runtime.evaluate', { expression: `(${pixels})(${JSON.stringify(expand(source))})`, awaitPromise: true, returnByValue: true }, sessionId)
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const current = await sample(readFileSync(new URL(shaderPath, import.meta.url), 'utf8'))
  for (const name of ['dark', 'warningDark', 'hitDark']) assert.deepEqual(current[name], [0, 0, 0], `${name}: actor signals cannot bypass map darkness`)
  assert.ok(current.lit[0] > current.shadow[0] && current.sun[0] > current.lit[0], 'actual room fill and sun visibility brighten the same signalled actor')
  assert.ok(current.shadow[0] >= 24 && current.shadow[0] < current.lit[0] * .6,
    'the textured shadow fixture stays visible above near-black while retaining a clear lit/shadow contrast')
  assert.ok(current.hitLit[0] > current.lit[0], 'the brief hit signal strengthens actual incident light while retaining the authored textured material')
  assert.ok(current.greenUp[0] > current.greenDown[0] && current.redRight[0] > current.redLeft[0], 'Blender positive tangent X/Y normals face right/up after the actual export V flip')
  console.log(JSON.stringify({ status: 'PASS', current, source: 'game/engine/render/wgsl/surface_animated.wgsl' }))
} finally {
  if (chrome) await chrome.close()
  await new Promise(resolve => server.close(resolve))
}
