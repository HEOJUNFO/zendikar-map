// Actual production DQS vertex shader, PBR fragment and GPU pixel readback.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { launchChrome } from '../../scripts/qa/chrome.mjs'

const shaderPath = '../engine/render/wgsl/surface_skin.wgsl'
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
    layout: 'auto', vertex: { module, entryPoint: 'vs_main', buffers: [
      { arrayStride: 60, attributes: [attr(0, 0, 'float32x3'), attr(1, 12, 'float32x3'), attr(2, 24, 'float32x2'), attr(3, 32, 'float32x2'), attr(4, 40, 'float32x4'), attr(5, 56, 'float32')] },
      { arrayStride: 84, stepMode: 'instance', attributes: [attr(6, 0, 'float32x4'), attr(7, 16, 'float32x4'), attr(8, 32, 'float32x4'), attr(9, 48, 'float32x4'), attr(10, 64, 'float32x4')] },
      { arrayStride: 64, attributes: [attr(12, 0, 'float32x4'), attr(13, 16, 'float32x4'), attr(14, 32, 'float32x4'), attr(15, 48, 'float32x4')] },
    ] }, fragment: { module, entryPoint: 'fs_main', targets: [{ format: 'rgba8unorm' }] }, primitive: { topology: 'triangle-list' },
  })
  const buffer = (data, usage) => { const result = device.createBuffer({ size: data.byteLength, usage: usage | GPUBufferUsage.COPY_DST }); device.queue.writeBuffer(result, 0, data); return result }
  const vertices = buffer(new Float32Array([[-.75, -.75, 0, 0], [.25, -.75, 1, 0], [-.75, .25, 0, 1]].flatMap(([x, y, u, v]) => [x, y, 0, 0, 0, 1, u, v, 0, 0, 1, 1, 1, 0, 0])), GPUBufferUsage.VERTEX)
  const weights = buffer(new Float32Array(Array.from({ length: 3 }, () => [0, 1, 0, 0, .5, .5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]).flat()), GPUBufferUsage.VERTEX)
  const instance = buffer(new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, .4, .4, .4, 0, .4, .4, .4, 0, 0]), GPUBufferUsage.VERTEX)
  const uniforms = buffer(new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 100, 1, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 3, 0]), GPUBufferUsage.UNIFORM)
  const palette = buffer(new Float32Array(32 * 8), GPUBufferUsage.UNIFORM)
  const texture = (rgba, array = false) => {
    const t = device.createTexture({ size: [1, 1, 1], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST })
    device.queue.writeTexture({ texture: t }, new Uint8Array(rgba), { bytesPerRow: 4 }, [1, 1, 1])
    return t.createView({ dimension: array ? '2d-array' : '2d' })
  }
  const sampler = device.createSampler()
  const bind = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [
    { binding: 0, resource: { buffer: uniforms } }, { binding: 1, resource: texture([128, 96, 64, 255], true) },
    { binding: 2, resource: sampler }, { binding: 3, resource: texture([0, 0, 0, 255]) }, { binding: 4, resource: sampler },
    { binding: 5, resource: texture([128, 128, 217, 255], true) }, { binding: 6, resource: texture([128, 128, 255, 0]) },
    { binding: 7, resource: { buffer: palette } },
  ] })
  const target = device.createTexture({ size: [32, 32], format: 'rgba8unorm', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC })
  const readback = device.createBuffer({ size: 32 * 256, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ })
  const draw = async (first, second) => {
    const data = new Float32Array(32 * 8)
    data.set(first); data.set(second, 8)
    device.queue.writeBuffer(palette, 0, data)
    const encoder = device.createCommandEncoder()
    const pass = encoder.beginRenderPass({ colorAttachments: [{ view: target.createView(), clearValue: [0, 0, 0, 1], loadOp: 'clear', storeOp: 'store' }] })
    pass.setPipeline(pipeline); pass.setBindGroup(0, bind)
    pass.setVertexBuffer(0, vertices); pass.setVertexBuffer(1, instance); pass.setVertexBuffer(2, weights); pass.draw(3); pass.end()
    encoder.copyTextureToBuffer({ texture: target }, { buffer: readback, bytesPerRow: 256 }, [32, 32]); device.queue.submit([encoder.finish()])
    await readback.mapAsync(GPUMapMode.READ)
    const raw = new Uint8Array(readback.getMappedRange()), image = [], points = []
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const rgb = [...raw.slice(y * 256 + x * 4, y * 256 + x * 4 + 3)]; image.push(...rgb)
      if (rgb.some(v => v > 0)) points.push([(x + .5) / 16 - 1, 1 - (y + .5) / 16])
    }
    readback.unmap()
    return { image, count: points.length, center: [0, 1].map(k => points.reduce((sum, p) => sum + p[k], 0) / points.length) }
  }
  const identity = [0, 0, 0, 1, 0, 0, 0, 0]
  // Independent literal: +90° around Z, then translation (+.25,0,0).
  const Q = Math.SQRT1_2, turn = [0, 0, Q, Q, Q / 8, -Q / 8, 0, 0]
  try {
    return { identity: await draw(identity, identity), turn: await draw(turn, turn), oppositeIdentity: await draw(identity, identity.map(v => -v)), oppositeTurn: await draw(turn.map(v => -v), turn) }
  } finally { device.destroy() }
}

const source = expand(readFileSync(new URL(shaderPath, import.meta.url), 'utf8'))
const server = createServer((_, response) => { response.writeHead(200, { 'Content-Type': 'text/html' }); response.end('<!doctype html><title>Ragdoll GPU probe</title>') })
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
let chrome
try {
  chrome = await launchChrome({ args: ['--enable-unsafe-webgpu'], maxMinutes: 2 })
  const { sessionId } = await chrome.newPage(`http://127.0.0.1:${server.address().port}`)
  const result = await chrome.send('Runtime.evaluate', { expression: `(${pixels})(${JSON.stringify(source)})`, awaitPromise: true, returnByValue: true }, sessionId)
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
  const sample = result.result.value
  assert.ok(sample.identity.count > 100 && sample.turn.count > 100)
  assert.ok(Math.abs(sample.identity.center[0] + 5 / 12) < .05 && Math.abs(sample.identity.center[1] + 5 / 12) < .05, 'rest identity preserves the independent triangle centroid')
  assert.ok(Math.abs(sample.turn.center[0] - 2 / 3) < .05 && Math.abs(sample.turn.center[1] + 5 / 12) < .05, 'rigid bone rotates ninety degrees then translates without applying actor placement twice')
  assert.deepEqual(sample.oppositeIdentity.image, sample.identity.image, 'opposite identity quaternions must not cancel')
  assert.deepEqual(sample.oppositeTurn.image, sample.turn.image, 'opposite rotated/translated quaternions must preserve the same pixels')
  const evidence = { command: 'node game/tests/ragdoll-skinning.browser.mjs', expandedShaderSha256: createHash('sha256').update(source).digest('hex'), fixtureSha256: createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'), samples: Object.fromEntries(Object.entries(sample).map(([key, value]) => [key, { count: value.count, center: value.center, pixelsSha256: createHash('sha256').update(Buffer.from(value.image)).digest('hex') }])), status: 'PASS' }
  writeFileSync('build/ragdoll-skinning-gpu.json', JSON.stringify(evidence, null, 2) + '\n')
  console.log('PASS ragdoll GPU:', JSON.stringify(evidence))
} finally { await chrome?.close(); await new Promise(resolve => server.close(resolve)) }
