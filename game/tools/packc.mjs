// 에셋 팩 빌드 — wasm 밖에 두는 에셋(타일 텍스처, 소품의 텍스처와 모델)을 한 파일(.zkpack)로 묶는다.
// 게임은 이 파일을 실행 중에 받아(engine/asset/fetch) 풀어 쓴다 (engine/asset/pack.cpp 가 읽는다 — 받은 파일은 믿지 않고 길이·범위를 본다).
// 묶기만 한다: 텍스처는 JPEG 바이트 그대로, 모델은 gltfc 가 만든 .zkmodel 그대로 들어간다.
//
// 목록 파일:
//   textures.txt (타일 텍스처)   texture <이름> <원본> [재질…]     — 차례가 텍스처 배열의 층 번호. 파일은 <텍스처 폴더>/<이름>.jpg (색) 과 <이름>.nar.jpg (법선·거칠기),
//                                금속성이 있으면 <이름>.metal.jpg
//   props.txt (소품)             texture <이름> <원본> [mask <원본>] [재질…] — 소품 텍스처, 차례가 층 번호. 파일은 <소품 폴더>/textures/<이름>.jpg·.nar.jpg (과 .mask.jpg 또는 .metal.jpg)
//                                prop <이름> <gltf> <노드>[,<노드>…|*] <목표 삼각형> <배율> [solid] — 소품, 차례가 소품 번호. 파일은 <소품 폴더>/<이름>.zkmodel.
//                                노드를 쉼표로 여럿 적으면 합쳐 한 소품으로, * 는 메시가 있는 노드 모두 (반투명 재질 — 유리·불꽃 — 의 면은 뺀다)
//   weapons.txt (손에 드는 무기) texture <이름> <원본> [재질…]     — 무기 텍스처, 차례가 층 번호. 파일은 <무기 폴더>/textures/<이름>.jpg·.nar.jpg
//   [재질…] — 손질(tools/art/prepare.mjs)이 읽는 것들, 차례 없이:
//     eq=saturation=0.6:contrast=0.9   색을 그만큼 고친다 (ffmpeg 의 eq 필터에 그대로 넘긴다)
//     mix=<수 9 개, 쉼표로>             색을 3×3 행렬로 섞는다 (줄마다 새 빨강·초록·파랑 — 유리 조각의 색을 다시 입힐 때)
//     nor=<원본>                        법선 맵 (OpenGL 식). 없으면 원본 이름의 _diff_ 를 _nor_gl_ 로 바꾼 파일을 찾고, 그것도 없으면 평평하다
//     arm=<원본>                        AO·거칠기·금속성이 빨강·초록·파랑에 든 그림. 없으면 _diff_ → _arm_ 을 찾는다
//     rough=<원본|수>  ao=<원본>         따로 있는 회색 그림 (arm 대신). rough 에 수를 적으면 고른 거칠기
//     metal=<원본>|metal=!<원본>|metal=arm  금속성 — 회색 그림(! 를 붙이면 뒤집어: 검은 곳이 금속 — 색유리의 납선), 또는 arm 의 파랑.
//                                        금속성이 있는 텍스처는 <이름>.metal.jpg 가 팩에 따라 들어간다 (mask 와 같이 쓰지 않는다)
//                                weapon <gltf> <틀 노드> <x> <y> <z> — 뒤따르는 part 들의 원본. 틀 노드의 자리가 총의 원점이고, x y z 는 거기서 손잡이(쥐는 자리)까지
//                                part <이름> <노드>[,<노드>…] [seated] — 따로 움직이는 부품, 차례가 부품 번호. 파일은 <무기 폴더>/<이름>.zkmodel.
//                                부품은 모두 같은 틀(손잡이가 원점, 총구가 -z)에 놓인다. seated 는 총 옆에 진열된 노드를 틀의 원점에 놓는다 (탄창)
//   <원본>·<gltf> 는 손질(tools/art/prepare.mjs)이 읽는 art-src 안의 경로다 — 빌드는 읽지 않는다. # 뒤는 주석
//
// 팩 (리틀 엔디언):
//   'ZKPK' · u32 판(1) · u32 항목 수 · u32 파일 전체의 바이트 수
//   · 항목마다: u8 이름 길이 · 이름(ASCII) · u32 데이터의 자리(파일 처음부터) · u32 데이터의 바이트 수
//   · 데이터들 (항목 차례대로 빈틈없이)
// 항목 이름: tile/<이름> · prop-texture/<이름> · prop-mask/<이름> · prop/<이름> · weapon-texture/<이름> · weapon/<이름> — 같은 종류 안의 차례가 층·소품·부품 번호다.
//   색 그림 바로 뒤에 그 금속성 그림(tile-metal/ · prop-metal/ · weapon-metal/<이름> — 있을 때만)이, 이어서 NAR(tile-nar/ · prop-nar/ · weapon-nar/<이름> — 늘)이 온다
//   그 뒤로 빌드가 만든 것들이 이름 그대로 붙는다: 하늘 그림 sky/image, 구운 빛 light/<틀> (gameplay/content/room_light.hpp)
//
// 사용: node packc.mjs <out.zkpack> <textures.txt> <텍스처 폴더> <props.txt> <소품 폴더> <weapons.txt> <무기 폴더> [<항목 이름>=<파일> …]
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PACK_VERSION = 1

function lines(text, name, each) {
  text.split(/\r?\n/).forEach((raw, index) => {
    const words = raw.replace(/#.*$/, '').trim().split(/\s+/).filter(Boolean)
    if (words.length)
      each(words, (message) => {
        throw new Error(`${name}:${index + 1}: ${message}`)
      })
  })
}
const NAME = /^[a-z0-9_]+$/
/** 손질 때의 색 고치기 — ffmpeg 의 eq 필터에 넘기는 값 (이름=값 을 : 로 잇는다) */
const ADJUST = /^eq=[a-z]+=-?[0-9.]+(:[a-z]+=-?[0-9.]+)*$/

const MIX = /^mix=-?[0-9.]+(,-?[0-9.]+){8}$/
/**
 * texture 줄의 재질 옵션들 → { adjust(eq 필터의 값), mix(수 9 개), nor, arm, rough(경로 또는 수), ao, metal(경로 · '!경로' · 'arm') } — 안 적은 것은 null.
 * 모르는 낱말이 있으면 null 을 돌려준다
 */
function materialOptions(options) {
  const out = { adjust: null, mix: null, nor: null, arm: null, rough: null, ao: null, metal: null }
  for (const option of options) {
    const cut = option.indexOf('=')
    const [key, value] = [option.slice(0, cut), option.slice(cut + 1)]
    if (cut <= 0 || !value) return null
    if (key === 'eq' && ADJUST.test(option)) out.adjust = value
    else if (key === 'mix' && MIX.test(option)) out.mix = value.split(',').map(Number)
    else if (['nor', 'arm', 'ao', 'metal'].includes(key)) out[key] = value
    else if (key === 'rough') out.rough = /^[0-9.]+$/.test(value) ? Number(value) : value
    else return null
  }
  return out
}

/** textures.txt → [{ name, source, adjust(eq 필터의 값 — 없으면 null), mix, nor, arm, rough, ao, metal }] */
export function parseTextureList(text, name = 'textures.txt') {
  const textures = []
  lines(text, name, ([command, textureName, source, ...options], fail) => {
    const material = materialOptions(options)
    if (command !== 'texture' || !NAME.test(textureName ?? '') || !source || !material) fail('texture <이름(소문자·숫자·_)> <원본> [eq=이름=값:…] [nor=…] [arm=…] [rough=…] [ao=…] [metal=…] [mix=…]')
    if (textures.some((t) => t.name === textureName)) fail(`텍스처 '${textureName}' 를 두 번 적었다`)
    textures.push({ name: textureName, source, ...material })
  })
  return textures
}

/** props.txt → { textures: [{ name, source, mask, adjust }], props: [{ name, gltf, node, triangles, scale, solid }] } */
export function parsePropList(text, name = 'props.txt') {
  const list = { textures: [], props: [] }
  lines(text, name, ([command, ...rest], fail) => {
    if (command === 'texture') {
      const [textureName, source, ...options] = rest
      const mask = options[0] === 'mask' ? options.splice(0, 2)[1] : null
      const material = materialOptions(options)
      if (!NAME.test(textureName ?? '') || !source || mask === undefined || !material || (mask && material.metal)) fail('texture <이름> <원본> [mask <원본>] [eq=이름=값:…] [nor=…] [arm=…] [rough=…] [ao=…] [metal=…]')
      if (list.textures.some((t) => t.name === textureName)) fail(`텍스처 '${textureName}' 를 두 번 적었다`)
      list.textures.push({ name: textureName, source, mask, ...material })
    } else if (command === 'prop') {
      const [propName, gltf, node, triangles, scale, flag, extra] = rest
      if (!NAME.test(propName ?? '') || !gltf || !node || !(Number.isInteger(Number(triangles)) && Number(triangles) > 0) || !(Number(scale) > 0) || (flag !== undefined && flag !== 'solid') || extra !== undefined)
        fail('prop <이름> <gltf> <노드> <목표 삼각형> <배율> [solid]')
      if (list.props.some((p) => p.name === propName)) fail(`소품 '${propName}' 을 두 번 적었다`)
      list.props.push({ name: propName, gltf, node, triangles: Number(triangles), scale: Number(scale), solid: flag === 'solid' })
    } else fail(`모르는 명령 '${command}'`)
  })
  return list
}

/**
 * weapons.txt → { textures: [{ name, source, adjust }], parts: [{ name, gltf, frame, origin: [x, y, z], nodes: [이름…], seated }] }
 * part 는 앞서 적은 weapon 줄(원본 glTF, 틀이 되는 노드, 그 틀에서 손잡이 원점)의 것이다
 */
export function parseWeaponList(text, name = 'weapons.txt') {
  const list = { textures: [], parts: [] }
  let weapon = null
  lines(text, name, ([command, ...rest], fail) => {
    if (command === 'texture') {
      const [textureName, source, ...options] = rest
      const material = materialOptions(options)
      if (!NAME.test(textureName ?? '') || !source || !material) fail('texture <이름> <원본> [eq=이름=값:…] [nor=…] [arm=…] [rough=…] [ao=…] [metal=…]')
      if (list.textures.some((t) => t.name === textureName)) fail(`텍스처 '${textureName}' 를 두 번 적었다`)
      list.textures.push({ name: textureName, source, ...material })
    } else if (command === 'weapon') {
      const [gltf, frame, ...origin] = rest
      if (!gltf || !frame || origin.length !== 3 || origin.some((v) => !Number.isFinite(Number(v)))) fail('weapon <gltf> <틀 노드> <원점 x> <y> <z>')
      weapon = { gltf, frame, origin: origin.map(Number) }
    } else if (command === 'part') {
      const [partName, nodes, flag, extra] = rest
      if (!weapon) fail('part 앞에 weapon 줄이 있어야 한다')
      if (!NAME.test(partName ?? '') || !nodes || (flag !== undefined && flag !== 'seated') || extra !== undefined) fail('part <이름> <노드>[,<노드>…] [seated]')
      if (list.parts.some((p) => p.name === partName)) fail(`부품 '${partName}' 을 두 번 적었다`)
      list.parts.push({ name: partName, ...weapon, nodes: nodes.split(','), seated: flag === 'seated' })
    } else fail(`모르는 명령 '${command}'`)
  })
  return list
}

/** [{ name, bytes }] → 팩의 바이트 */
export function encodePack(entries) {
  const names = entries.map((entry) => Buffer.from(entry.name, 'latin1'))
  if (names.some((n, i) => n.length === 0 || n.length > 255 || !/^[\x21-\x7e]+$/.test(entries[i].name))) throw new Error('항목 이름은 빈칸 없는 ASCII 1…255 자다')
  const table = names.reduce((sum, n) => sum + 1 + n.length + 8, 0)
  const total = 16 + table + entries.reduce((sum, entry) => sum + entry.bytes.length, 0)
  if (total > 0xffffffff) throw new Error('팩이 4 GB 를 넘는다')
  const bytes = new Uint8Array(total)
  const view = new DataView(bytes.buffer)
  bytes.set(Buffer.from('ZKPK'), 0)
  view.setUint32(4, PACK_VERSION, true)
  view.setUint32(8, entries.length, true)
  view.setUint32(12, total, true)
  let [at, data] = [16, 16 + table]
  entries.forEach((entry, i) => {
    bytes[at++] = names[i].length
    bytes.set(names[i], at)
    at += names[i].length
    view.setUint32(at, data, true)
    view.setUint32(at + 4, entry.bytes.length, true)
    at += 8
    bytes.set(entry.bytes, data)
    data += entry.bytes.length
  })
  return bytes
}

/** 팩의 바이트 → [{ name, bytes }] (검증용 — 게임은 engine/asset/pack.cpp 로 읽는다) */
export function decodePack(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes.length < 16 || Buffer.from(bytes.subarray(0, 4)).toString('latin1') !== 'ZKPK' || view.getUint32(4, true) !== PACK_VERSION || view.getUint32(12, true) !== bytes.length)
    throw new Error('팩의 머리가 어긋났다')
  const entries = []
  let at = 16
  for (let i = 0; i < view.getUint32(8, true); i++) {
    const length = bytes[at]
    const name = Buffer.from(bytes.subarray(at + 1, at + 1 + length)).toString('latin1')
    const [offset, size] = [view.getUint32(at + 1 + length, true), view.getUint32(at + 5 + length, true)]
    if (offset + size > bytes.length) throw new Error(`항목 '${name}' 이 팩을 벗어난다`)
    entries.push({ name, bytes: bytes.subarray(offset, offset + size) })
    at += 9 + length
  }
  return entries
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [output, textureList, textureDir, propList, propDir, weaponList, weaponDir, ...extras] = process.argv.slice(2)
  if (!weaponDir) {
    console.error('usage: packc.mjs <out.zkpack> <textures.txt> <texture dir> <props.txt> <prop dir> <weapons.txt> <weapon dir> [<name>=<file> …]')
    process.exit(2)
  }
  try {
    const jpeg = (path) => {
      const bytes = readFileSync(path)
      if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error(`${path} 는 JPEG 이 아니다`)
      return bytes
    }
    const entries = []
    /** 텍스처 하나의 항목들 — 색, (잘라 낼 모양 또는 금속성), NAR. kind 는 색 그림의 항목 이름 머리, family 는 딸린 것의 머리 */
    const texture = (t, dir, kind, family) => {
      entries.push({ name: `${kind}/${t.name}`, bytes: jpeg(join(dir, `${t.name}.jpg`)) })
      if (t.mask) entries.push({ name: `${family}-mask/${t.name}`, bytes: jpeg(join(dir, `${t.name}.mask.jpg`)) })
      if (t.metal) entries.push({ name: `${family}-metal/${t.name}`, bytes: jpeg(join(dir, `${t.name}.metal.jpg`)) })
      entries.push({ name: `${family}-nar/${t.name}`, bytes: jpeg(join(dir, `${t.name}.nar.jpg`)) })
    }
    for (const t of parseTextureList(readFileSync(textureList, 'utf8'), textureList)) texture(t, textureDir, 'tile', 'tile')
    const { textures, props } = parsePropList(readFileSync(propList, 'utf8'), propList)
    for (const t of textures) texture(t, join(propDir, 'textures'), 'prop-texture', 'prop')
    for (const p of props) entries.push({ name: `prop/${p.name}`, bytes: readFileSync(join(propDir, `${p.name}.zkmodel`)) })
    const weapons = parseWeaponList(readFileSync(weaponList, 'utf8'), weaponList)
    for (const t of weapons.textures) texture(t, join(weaponDir, 'textures'), 'weapon-texture', 'weapon')
    for (const p of weapons.parts) entries.push({ name: `weapon/${p.name}`, bytes: readFileSync(join(weaponDir, `${p.name}.zkmodel`)) })
    for (const extra of extras) {
      const cut = extra.indexOf('=')
      if (cut <= 0) throw new Error(`'${extra}' 는 <항목 이름>=<파일> 꼴이 아니다`)
      entries.push({ name: extra.slice(0, cut), bytes: readFileSync(extra.slice(cut + 1)) })
    }
    writeFileSync(output, encodePack(entries))
  } catch (error) {
    console.error(`packc: ${error.message}`)
    process.exit(1)
  }
}
