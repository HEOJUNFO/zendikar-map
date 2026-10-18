// glTF 변환 — 밖에서 받은 glTF 2.0 모델(.gltf + .bin)의 노드 하나를 엔진이 읽는 모델(.zkmodel)로 옮긴다.
// 방 소품(바위·식생)과 손에 드는 무기 같은 통짜 모델에 쓴다. 빌드가 아니라 손질(tools/art/prepare.mjs) 때 한 번 돌리고, 결과(.zkmodel)를 저장소에 둔다.
//
// 읽는 것: 노드의 변환(부모까지 합친 것), 삼각형 목록(인덱스 u8·u16·u32), POSITION·NORMAL·TEXCOORD_0(f32), 재질의 baseColorTexture·alphaMode·doubleSided.
// 읽지 않는 것(멈춘다): 확장(extensionsUsed·extensionsRequired), 스킨·모프, sparse·normalized accessor, 삼각형 목록이 아닌 것, 파일 밖을 가리키는 경로.
// 소품은 노드 여럿을 합쳐 하나로 옮길 수 있고(props.txt 의 노드 칸에 쉼표로, 또는 *), 그때 반투명 재질(alphaMode BLEND — 등의 유리, 불꽃)의 면은 뺀다.
// 받은 파일은 믿지 않는다 — accessor 가 버퍼를 벗어나면 멈춘다.
//
// 하는 일: ① 노드의 메시를 세계 좌표로 옮긴다 (노드의 자리 이동도 들어간다) ② 삼각형이 목표보다 많으면 줄인다 (simplify)
//         ③ 배율을 곱하고, 밑면이 y 0, 옆으로는 감싸는 상자의 가운데가 원점에 오게 옮긴다.
//
// .zkmodel (리틀 엔디언, engine/spatial/surface_mesh.cpp 의 ModelMesh 가 읽는다):
//   'ZKMD' · u32 정점 수 · u32 인덱스 수 · u32 표시(비트 0 = 양면을 다 그린다 — 재질이 doubleSided 이거나 alphaMode 가 MASK, 비트 1 = 알파로 잘라 낸다 — alphaMode 가 MASK.
//     Poly Haven 의 모델은 거의 다 doubleSided 다 — 잘라 내는 것(잎)과 그냥 양면인 것(불투명한 기물 — 텍스처의 알파가 금속성으로 쓰인다)을 갈라야 한다)
//   · 정점마다 f32 × 9: 위치 xyz, 법선 xyz, uv, 텍스처 층 · 인덱스마다 u32 (셋씩 삼각형, 밖에서 볼 때 반시계 방향)
//
// 사용: node gltfc.mjs <props.txt> <원본 폴더(art-src)> <out 폴더>   — props.txt 의 형식은 tools/packc.mjs 머리말
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parsePropList, parseWeaponList } from './packc.mjs'

const VERTEX_FLOATS = 9
const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }

const multiply = (a, b) => {
  // 열 우선 4×4 — a · b
  const out = new Array(16).fill(0)
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]
  return out
}

/** 노드의 제 변환 (열 우선 4×4) — matrix 가 있으면 그것, 없으면 자리·돌림(사원수)·크기 */
function localMatrix(node) {
  if (node.matrix) return node.matrix
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1]
  const [sx, sy, sz] = node.scale ?? [1, 1, 1]
  const [tx, ty, tz] = node.translation ?? [0, 0, 0]
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ]
}

/** accessor 를 숫자 배열로 — componentType 은 allowed 가운데 하나여야 한다 */
function readAccessor(gltf, buffers, index, type, allowed) {
  const accessor = gltf.accessors?.[index]
  if (!accessor || accessor.type !== type || !allowed.includes(accessor.componentType)) throw new Error(`accessor ${index} 의 형식이 ${type} 이 아니다`)
  if (accessor.sparse || accessor.normalized) throw new Error(`accessor ${index}: sparse·normalized 는 읽지 않는다`)
  const view = gltf.bufferViews?.[accessor.bufferView]
  const buffer = buffers[view?.buffer]
  if (!view || !buffer) throw new Error(`accessor ${index} 의 버퍼가 없다`)
  const width = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[accessor.componentType]
  const components = COMPONENTS[type]
  const stride = view.byteStride ?? width * components
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
  const count = accessor.count
  if (!Number.isInteger(count) || count < 0 || !Number.isInteger(start) || start < 0 || stride < width * components) throw new Error(`accessor ${index} 의 범위가 어긋났다`)
  if (count && start + (count - 1) * stride + width * components > buffer.length) throw new Error(`accessor ${index} 가 버퍼를 벗어난다`)
  const out = accessor.componentType === 5126 ? new Float32Array(count * components) : new Uint32Array(count * components)
  const data = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  for (let i = 0; i < count; i++)
    for (let c = 0; c < components; c++) {
      const at = start + i * stride + c * width
      out[i * components + c] =
        accessor.componentType === 5126 ? data.getFloat32(at, true) : accessor.componentType === 5125 ? data.getUint32(at, true) : accessor.componentType === 5123 ? data.getUint16(at, true) : data.getUint8(at)
    }
  return out
}

/**
 * 노드 하나의 메시를 세계 좌표의 삼각형으로 — { positions, normals, uvs, images(정점마다 baseColor 그림의 번호, 없으면 -1), indices, twoSided }.
 * gltf 는 읽은 JSON, buffers 는 gltf.buffers 차례의 바이트들
 */
/** 이름으로 찾은 노드의 번호와, 부모까지 합친 변환 (열 우선 4×4) */
function locateNode(gltf, nodeName) {
  if (gltf.asset?.version !== '2.0') throw new Error('glTF 2.0 이 아니다')
  if (gltf.extensionsUsed?.length || gltf.extensionsRequired?.length) throw new Error(`확장을 쓰는 glTF 는 읽지 않는다 (${[...(gltf.extensionsRequired ?? []), ...(gltf.extensionsUsed ?? [])].join(', ')})`)
  const nodes = gltf.nodes ?? []
  const index = nodes.findIndex((node) => node.name === nodeName)
  if (index < 0) throw new Error(`노드 '${nodeName}' 이 없다`)
  // 부모까지의 변환을 합친다
  const parent = new Map()
  nodes.forEach((node, i) => (node.children ?? []).forEach((child) => parent.set(child, i)))
  let matrix = localMatrix(nodes[index])
  for (let at = parent.get(index), guard = 0; at !== undefined; at = parent.get(at)) {
    if (guard++ > nodes.length) throw new Error('노드가 고리를 이룬다')
    matrix = multiply(localMatrix(nodes[at]), matrix)
  }
  return { index, matrix }
}

/** 노드의 원점이 세계에서 놓인 자리 [x, y, z] */
export function nodeOrigin(gltf, nodeName) {
  return locateNode(gltf, nodeName).matrix.slice(12, 15)
}

export function extractNode(gltf, buffers, nodeName, { skipBlend = false } = {}) {
  const { index, matrix } = locateNode(gltf, nodeName)
  const nodes = gltf.nodes
  const mesh = gltf.meshes?.[nodes[index].mesh]
  if (!mesh) throw new Error(`노드 '${nodeName}' 에 메시가 없다`)
  if (nodes[index].skin !== undefined) throw new Error('스킨이 걸린 메시는 읽지 않는다')
  const point = ([x, y, z]) => [matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12], matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13], matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]]
  // 법선은 돌림만 — 크기가 고르지 않은 변환은 받지 않는다 (법선이 틀어진다)
  const lengths = [0, 4, 8].map((c) => Math.hypot(matrix[c], matrix[c + 1], matrix[c + 2]))
  if (lengths.some((l) => !(l > 0) || Math.abs(l - lengths[0]) > 1e-4 * lengths[0])) throw new Error(`노드 '${nodeName}' 의 크기 변환이 축마다 다르다`)
  const direction = ([x, y, z]) => [matrix[0] * x + matrix[4] * y + matrix[8] * z, matrix[1] * x + matrix[5] * y + matrix[9] * z, matrix[2] * x + matrix[6] * y + matrix[10] * z].map((v) => v / lengths[0])

  const out = { positions: [], normals: [], uvs: [], images: [], indices: [], twoSided: false, cutout: false }
  for (const primitive of mesh.primitives ?? []) {
    if ((primitive.mode ?? 4) !== 4) throw new Error('삼각형 목록이 아닌 프리미티브는 읽지 않는다')
    if (primitive.targets) throw new Error('모프 타깃은 읽지 않는다')
    // 반투명 재질(등의 유리, 불꽃)의 면은 소품에서 뺀다 — 겉면 셰이더는 섞어 그리지 않는다 (불빛은 방 메시의 빛나는 도형이 낸다)
    if (skipBlend && gltf.materials?.[primitive.material]?.alphaMode === 'BLEND') continue
    const { POSITION, NORMAL, TEXCOORD_0 } = primitive.attributes ?? {}
    const positions = readAccessor(gltf, buffers, POSITION, 'VEC3', [5126])
    const normals = readAccessor(gltf, buffers, NORMAL, 'VEC3', [5126])
    const uvs = readAccessor(gltf, buffers, TEXCOORD_0, 'VEC2', [5126])
    const count = positions.length / 3
    if (normals.length !== count * 3 || uvs.length !== count * 2) throw new Error('정점 속성의 수가 서로 다르다')
    const indices = primitive.indices === undefined ? Uint32Array.from({ length: count }, (_, i) => i) : readAccessor(gltf, buffers, primitive.indices, 'SCALAR', [5121, 5123, 5125])
    if (indices.length % 3 !== 0 || indices.some((i) => i >= count)) throw new Error('인덱스가 정점을 벗어난다')
    const material = gltf.materials?.[primitive.material] ?? {}
    const alphaMode = material.alphaMode ?? 'OPAQUE'
    if (alphaMode !== 'OPAQUE' && alphaMode !== 'MASK') throw new Error(`alphaMode ${alphaMode} 는 읽지 않는다`)
    // 알파로 잘라 내는 잎과, 뒤가 열린 껍데기(절벽 면)처럼 재질이 양면이라고 한 것
    out.twoSided ||= alphaMode === 'MASK' || material.doubleSided === true
    out.cutout ||= alphaMode === 'MASK'
    const texture = gltf.textures?.[material.pbrMetallicRoughness?.baseColorTexture?.index]
    const image = texture?.source ?? -1
    const base = out.positions.length / 3
    for (let i = 0; i < count; i++) {
      const [p, n] = [point(positions.subarray(i * 3, i * 3 + 3)), direction(normals.subarray(i * 3, i * 3 + 3))]
      if ([...p, ...n, uvs[i * 2], uvs[i * 2 + 1]].some((v) => !Number.isFinite(v))) throw new Error('정점에 숫자가 아닌 값이 있다')
      out.positions.push(...p)
      out.normals.push(...n)
      out.uvs.push(uvs[i * 2], uvs[i * 2 + 1])
      out.images.push(image)
    }
    for (const i of indices) out.indices.push(base + i)
  }
  if (!out.indices.length && !skipBlend) throw new Error(`노드 '${nodeName}' 에 삼각형이 없다`)
  return out
}

/** 노드 여럿의 메시를 하나로 (세계 좌표 그대로). names 가 ['*'] 면 메시가 있는 노드 모두. 반투명 재질의 면은 뺀다 */
export function extractNodes(gltf, buffers, names) {
  if (names.length === 1 && names[0] === '*') names = (gltf.nodes ?? []).filter((node) => node.mesh !== undefined).map((node) => node.name)
  const out = { positions: [], normals: [], uvs: [], images: [], indices: [], twoSided: false, cutout: false }
  for (const name of names) {
    const mesh = extractNode(gltf, buffers, name, { skipBlend: true })
    const start = out.positions.length / 3
    for (const key of ['positions', 'normals', 'uvs', 'images']) for (const value of mesh[key]) out[key].push(value)
    for (const i of mesh.indices) out.indices.push(start + i)
    out.twoSided ||= mesh.twoSided
    out.cutout ||= mesh.cutout
  }
  if (!out.indices.length) throw new Error(`노드 '${names.join(',')}' 에 삼각형이 없다`)
  return out
}

/** 꼭짓점 둘이 같은 삼각형을 뺀 삼각형 수와 인덱스 */
function collapse(indices, clusterOf) {
  const kept = []
  const seen = new Set()
  for (let t = 0; t < indices.length; t += 3) {
    const [a, b, c] = [clusterOf[indices[t]], clusterOf[indices[t + 1]], clusterOf[indices[t + 2]]]
    if (a === b || b === c || a === c) continue
    // 같은 세 꼭짓점의 삼각형은 한 번만 (돌려 적은 것도 같다)
    const low = Math.min(a, b, c)
    const key = low === a ? `${a},${b},${c}` : low === b ? `${b},${c},${a}` : `${c},${a},${b}`
    if (seen.has(key)) continue
    seen.add(key)
    kept.push(a, b, c)
  }
  return kept
}

/**
 * 삼각형을 target 개 이하로 줄인다 — 격자 정점 군집화: 공간을 한 변이 cell 인 칸으로 나눠 같은 칸의 정점을 하나로 합치고, 꼭짓점이 겹친 삼각형을 버린다.
 * 칸의 크기는 삼각형 수가 target 이하가 되는 가장 작은 값을 이분 탐색으로 찾는다. 자리는 칸마다 하나(평균)라 이음매가 벌어지지 않고,
 * 법선·uv·그림은 (칸, uv 섬)마다 따로 평균한다 — 다른 섬의 uv 가 섞이면 무늬가 번진다. uv 섬은 정점을 함께 쓰는 삼각형들의 묶음이다.
 * ceiling: 군집화는 모양을 고르게 뭉갠다 (모서리·실루엣을 따로 지키지 않는다). 바위는 괜찮지만 날 선 모양(무기 등)이 무뎌지면
 * 목표를 올리거나 오차 기반 줄이기(quadric edge collapse)로 바꾼다
 */
export function simplify(mesh, target) {
  const count = mesh.positions.length / 3
  if (mesh.indices.length / 3 <= target) return mesh
  // uv 섬 — 인덱스로 이어진 정점들 (union-find)
  const island = Int32Array.from({ length: count }, (_, i) => i)
  const find = (i) => {
    while (island[i] !== i) i = island[i] = island[island[i]]
    return i
  }
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const [a, b, c] = [find(mesh.indices[t]), find(mesh.indices[t + 1]), find(mesh.indices[t + 2])]
    island[b] = a
    island[find(c)] = a
  }
  const low = [0, 1, 2].map((axis) => mesh.positions.reduce((m, v, i) => (i % 3 === axis ? Math.min(m, v) : m), Infinity))
  const high = [0, 1, 2].map((axis) => mesh.positions.reduce((m, v, i) => (i % 3 === axis ? Math.max(m, v) : m), -Infinity))
  const cluster = (cell) => {
    const cells = new Map()
    const groups = new Map()
    const cellOf = new Int32Array(count)
    const groupOf = new Int32Array(count)
    for (let i = 0; i < count; i++) {
      const key = [0, 1, 2].map((axis) => Math.floor((mesh.positions[i * 3 + axis] - low[axis]) / cell)).join(',')
      if (!cells.has(key)) cells.set(key, cells.size)
      cellOf[i] = cells.get(key)
      const group = `${cellOf[i]}:${find(i)}:${mesh.images[i]}`
      if (!groups.has(group)) groups.set(group, groups.size)
      groupOf[i] = groups.get(group)
    }
    return { cellOf, groupOf, cellCount: cells.size, groupCount: groups.size }
  }
  // 칸이 감싸는 상자만 하면 삼각형이 남지 않는다 — 그 사이에서 찾는다
  let [fine, coarse] = [0, Math.max(...high.map((v, axis) => v - low[axis]))]
  for (let step = 0; step < 24; step++) {
    const middle = (fine + coarse) / 2
    if (collapse(mesh.indices, cluster(middle).groupOf).length / 3 <= target) coarse = middle
    else fine = middle
  }
  const { cellOf, groupOf, cellCount, groupCount } = cluster(coarse)
  const cellSum = new Float64Array(cellCount * 4)
  const sums = new Float64Array(groupCount * 6)
  const out = { positions: new Array(groupCount * 3), normals: new Array(groupCount * 3), uvs: new Array(groupCount * 2), images: new Array(groupCount), indices: collapse(mesh.indices, groupOf), twoSided: mesh.twoSided, cutout: mesh.cutout }
  const groupCell = new Int32Array(groupCount)
  for (let i = 0; i < count; i++) {
    for (let axis = 0; axis < 3; axis++) {
      cellSum[cellOf[i] * 4 + axis] += mesh.positions[i * 3 + axis]
      sums[groupOf[i] * 6 + axis] += mesh.normals[i * 3 + axis]
    }
    cellSum[cellOf[i] * 4 + 3]++
    sums[groupOf[i] * 6 + 3] += mesh.uvs[i * 2]
    sums[groupOf[i] * 6 + 4] += mesh.uvs[i * 2 + 1]
    sums[groupOf[i] * 6 + 5]++
    groupCell[groupOf[i]] = cellOf[i]
    out.images[groupOf[i]] = mesh.images[i]
  }
  for (let g = 0; g < groupCount; g++) {
    const cell = groupCell[g]
    const normal = [sums[g * 6], sums[g * 6 + 1], sums[g * 6 + 2]]
    const length = Math.hypot(...normal) || 1
    for (let axis = 0; axis < 3; axis++) {
      out.positions[g * 3 + axis] = cellSum[cell * 4 + axis] / cellSum[cell * 4 + 3]
      out.normals[g * 3 + axis] = normal[axis] / length
    }
    out.uvs[g * 2] = sums[g * 6 + 3] / sums[g * 6 + 5]
    out.uvs[g * 2 + 1] = sums[g * 6 + 4] / sums[g * 6 + 5]
  }
  // 한 칸에 모인 다른 섬의 정점은 자리가 같다 — 그 사이의 삼각형은 넓이가 0 이라 버린다
  const sameSpot = Int32Array.from(groupCell)
  out.indices = out.indices.filter((_, i, all) => {
    const t = i - (i % 3)
    const [a, b, c] = [sameSpot[all[t]], sameSpot[all[t + 1]], sameSpot[all[t + 2]]]
    return a !== b && b !== c && a !== c
  })
  return out
}

/**
 * 배율을 곱하고 밑면을 y 0 에, 옆으로는 감싸는 상자의 가운데를 원점에 놓는다. layerOf(그림 번호) 가 정점의 텍스처 층을 정한다.
 * rest 가 false 면 옮기지 않는다 (자리가 이미 정해진 것 — 무기의 부품)
 */
export function settle(mesh, scale, layerOf, rest = true) {
  const count = mesh.positions.length / 3
  const range = (axis) => {
    let [low, high] = [Infinity, -Infinity]
    for (let i = axis; i < mesh.positions.length; i += 3) [low, high] = [Math.min(low, mesh.positions[i]), Math.max(high, mesh.positions[i])]
    return [low, high]
  }
  const [x, y, z] = [range(0), range(1), range(2)]
  const shift = rest ? [-(x[0] + x[1]) / 2, -y[0], -(z[0] + z[1]) / 2] : [0, 0, 0]
  // 삼각형이 쓰는 정점만 남긴다 (줄이고 나면 안 쓰는 정점이 생긴다)
  const slot = new Int32Array(count).fill(-1)
  const kept = []
  const indices = Uint32Array.from(mesh.indices, (i) => {
    if (slot[i] < 0) slot[i] = kept.push(i) - 1
    return slot[i]
  })
  const vertices = new Float32Array(kept.length * VERTEX_FLOATS)
  kept.forEach((i, at) =>
    vertices.set(
      [
        ...[0, 1, 2].map((axis) => (mesh.positions[i * 3 + axis] + shift[axis]) * scale),
        mesh.normals[i * 3], mesh.normals[i * 3 + 1], mesh.normals[i * 3 + 2],
        mesh.uvs[i * 2], mesh.uvs[i * 2 + 1],
        layerOf(mesh.images[i]),
      ],
      at * VERTEX_FLOATS,
    ),
  )
  return { vertexCount: kept.length, vertices, indices, twoSided: mesh.twoSided, cutout: Boolean(mesh.cutout) }
}

export function encodeModel({ vertices, indices, twoSided, cutout = false }) {
  const bytes = new Uint8Array(16 + vertices.length * 4 + indices.length * 4)
  const view = new DataView(bytes.buffer)
  bytes.set(Buffer.from('ZKMD'), 0)
  view.setUint32(4, vertices.length / VERTEX_FLOATS, true)
  view.setUint32(8, indices.length, true)
  view.setUint32(12, (twoSided ? 1 : 0) | (cutout ? 2 : 0), true)
  vertices.forEach((value, i) => view.setFloat32(16 + i * 4, value, true))
  indices.forEach((value, i) => view.setUint32(16 + vertices.length * 4 + i * 4, value, true))
  return bytes
}

export function decodeModel(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes.length < 16 || Buffer.from(bytes.subarray(0, 4)).toString('latin1') !== 'ZKMD') throw new Error('.zkmodel 의 머리가 어긋났다')
  const [vertexCount, indexCount] = [view.getUint32(4, true), view.getUint32(8, true)]
  if (bytes.length !== 16 + vertexCount * VERTEX_FLOATS * 4 + indexCount * 4) throw new Error('.zkmodel 의 길이가 어긋났다')
  const vertices = Float32Array.from({ length: vertexCount * VERTEX_FLOATS }, (_, i) => view.getFloat32(16 + i * 4, true))
  const indices = Uint32Array.from({ length: indexCount }, (_, i) => view.getUint32(16 + vertexCount * VERTEX_FLOATS * 4 + i * 4, true))
  const flags = view.getUint32(12, true)
  return { vertexCount, vertices, indices, twoSided: (flags & 1) === 1, cutout: (flags & 2) === 2 }
}

/** 원본 폴더 안의 파일만 읽는다 — glTF 가 적은 경로가 그 밖을 가리키면 멈춘다 */
function inside(root, ...parts) {
  const path = resolve(root, ...parts)
  const within = relative(resolve(root), path)
  if (!within || within.startsWith('..') || isAbsolute(within)) throw new Error(`원본 폴더 밖의 경로: ${parts.join('/')}`)
  return path
}

/** .gltf 파일과 그 버퍼들을 읽는다 — { gltf, buffers, imagePaths(그림마다 root 기준 경로, / 로) } */
export function loadGltf(root, path) {
  const file = inside(root, path)
  const gltf = JSON.parse(readFileSync(file, 'utf8'))
  const local = (uri) => {
    if (typeof uri !== 'string' || /^[a-z]+:/i.test(uri)) throw new Error(`파일 경로가 아닌 uri: ${String(uri).slice(0, 40)}`)
    return inside(root, dirname(path), decodeURIComponent(uri))
  }
  const buffers = (gltf.buffers ?? []).map((buffer) => readFileSync(local(buffer.uri)))
  const imagePaths = (gltf.images ?? []).map((image) => relative(resolve(root), local(image.uri)).split(sep).join('/'))
  return { gltf, buffers, imagePaths }
}

/** props.txt 의 소품을 모두 .zkmodel 로 — 소품마다 { name, triangles(원본), kept(줄인 뒤), bytes } 를 돌려준다 */
export function convertProps(listText, root, outDir, listName = 'props.txt') {
  const list = parsePropList(listText, listName)
  const loaded = new Map()
  mkdirSync(outDir, { recursive: true })
  return list.props.map((prop) => {
    if (!loaded.has(prop.gltf)) loaded.set(prop.gltf, loadGltf(root, prop.gltf))
    const { gltf, buffers, imagePaths } = loaded.get(prop.gltf)
    const mesh = extractNodes(gltf, buffers, prop.node.split(','))
    const reduced = simplify(mesh, prop.triangles)
    const model = settle(reduced, prop.scale, (image) => {
      const layer = list.textures.findIndex((texture) => texture.source === imagePaths[image])
      if (layer < 0) throw new Error(`소품 '${prop.name}' 의 그림(${imagePaths[image] ?? '없음'})이 props.txt 의 texture 에 없다`)
      return layer
    })
    const bytes = encodeModel(model)
    writeFileSync(join(outDir, `${prop.name}.zkmodel`), bytes)
    return { name: prop.name, triangles: mesh.indices.length / 3, kept: model.indices.length / 3, bytes: bytes.length }
  })
}

/**
 * 무기의 부품 하나 — 노드들의 메시를 합쳐 무기의 틀(손잡이가 원점, 총구가 -z, 위가 +y, 오른쪽이 +x)로 옮긴다. 삼각형은 줄이지 않는다 (군집화는 날 선 모서리를 뭉갠다).
 * 원본은 총구가 +x 라고 본다: y 축으로 돌려 (x, y, z) → (z, y, -x). base 는 틀이 되는 노드의 자리, origin 은 그 틀에서 손잡이 원점.
 * seated 면 노드의 제 자리를 버리고 틀의 원점에 놓는다 (총 옆에 진열된 탄창을 손잡이 속으로)
 */
export function extractWeaponPart(gltf, buffers, nodeNames, base, origin, seated) {
  const out = { positions: [], normals: [], uvs: [], images: [], indices: [], twoSided: false, cutout: false }
  for (const name of nodeNames) {
    const mesh = extractNode(gltf, buffers, name)
    const from = seated ? nodeOrigin(gltf, name) : base
    const start = out.positions.length / 3
    for (let i = 0; i < mesh.positions.length; i += 3) {
      const [x, y, z] = [0, 1, 2].map((axis) => mesh.positions[i + axis] - from[axis] - origin[axis])
      out.positions.push(z, y, -x)
      out.normals.push(mesh.normals[i + 2], mesh.normals[i + 1], -mesh.normals[i])
    }
    for (const value of mesh.uvs) out.uvs.push(value)
    for (const value of mesh.images) out.images.push(value)
    for (const i of mesh.indices) out.indices.push(start + i)
    out.twoSided ||= mesh.twoSided
    out.cutout ||= mesh.cutout
  }
  return out
}

/** weapons.txt 의 부품을 모두 .zkmodel 로 — 부품마다 { name, triangles, bytes, low, high(감싸는 상자의 두 끝) } 를 돌려준다 */
export function convertWeapons(listText, root, outDir, listName = 'weapons.txt') {
  const list = parseWeaponList(listText, listName)
  const loaded = new Map()
  mkdirSync(outDir, { recursive: true })
  return list.parts.map((part) => {
    if (!loaded.has(part.gltf)) loaded.set(part.gltf, loadGltf(root, part.gltf))
    const { gltf, buffers, imagePaths } = loaded.get(part.gltf)
    const mesh = extractWeaponPart(gltf, buffers, part.nodes, nodeOrigin(gltf, part.frame), part.origin, part.seated)
    const layerOf = (image) => {
      const layer = list.textures.findIndex((texture) => texture.source === imagePaths[image])
      if (layer < 0) throw new Error(`부품 '${part.name}' 의 그림(${imagePaths[image] ?? '없음'})이 weapons.txt 의 texture 에 없다`)
      return layer
    }
    const bytes = encodeModel(settle(mesh, 1, layerOf, false))
    writeFileSync(join(outDir, `${part.name}.zkmodel`), bytes)
    const low = [Infinity, Infinity, Infinity]
    const high = [-Infinity, -Infinity, -Infinity]
    mesh.positions.forEach((value, i) => {
      low[i % 3] = Math.min(low[i % 3], value)
      high[i % 3] = Math.max(high[i % 3], value)
    })
    return { name: part.name, triangles: mesh.indices.length / 3, bytes: bytes.length, low, high }
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [list, root, outDir] = process.argv.slice(2)
  if (!outDir) {
    console.error('usage: gltfc.mjs <props.txt> <source dir> <out dir>')
    process.exit(2)
  }
  try {
    for (const prop of convertProps(readFileSync(list, 'utf8'), root, outDir, list)) console.log(`${prop.name}: 삼각형 ${prop.triangles} → ${prop.kept}, ${prop.bytes} B`)
  } catch (error) {
    console.error(`gltfc: ${error.message}`)
    process.exit(1)
  }
}
