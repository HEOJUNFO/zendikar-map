// meshopt 로 누른 GLB(Tripo 의 리깅 결과 등)를 Blender 3.6 이 읽는 보통 GLB 로 푼다 — 스킨·애니메이션·그림은 그대로다.
// 사용: node game/tools/art/decompress-glb.mjs <입력.glb> <출력.glb>
import { NodeIO } from '@gltf-transform/core'
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions'
import { dequantize } from '@gltf-transform/functions'
import { MeshoptDecoder } from 'meshoptimizer'

const [input, output] = process.argv.slice(2)
if (!input || !output || input === output) throw new Error('사용: decompress-glb.mjs <입력.glb> <출력.glb>')
await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
const document = await io.read(input)
await document.transform(dequantize())
for (const extension of document.getRoot().listExtensionsUsed()) extension.dispose()
await io.write(output, document)
const root = document.getRoot()
console.log(`${output}: 메시 ${root.listMeshes().length}, 스킨 ${root.listSkins().length}, 애니메이션 ${root.listAnimations().length}`)
