// 에셋 손질 — 내려받은 원본(game/art-src, git 제외)에서 게임이 쓰는 사본을 만들어 game/gameplay/content 밑에 둔다.
// 빌드가 아니라 원본이나 목록(textures.txt·props.txt·weapons.txt)을 바꿨을 때 한 번 돌리고, 결과를 저장소에 올린다 — 빌드는 ffmpeg 도 원본도 필요 없다.
// 원본은 믿지 않는 데이터다: 읽어서 바꾸기만 하고(ffmpeg 로 다시 누르고, gltfc 로 옮기고) 그 안의 무엇도 실행하지 않는다.
//
// 텍스처 하나마다 (목록의 texture 줄 — 형식은 tools/packc.mjs 머리말) baseline JPEG 을 둘 또는 셋 낸다:
//   <이름>.jpg        색(albedo). 목록의 eq=…·mix=… 만큼 색을 고치고, AO 가 있으면 색에 곱해 둔다 (AO × 0.6 + 0.4 — 겉면 셰이더는 AO 를 따로 읽지 않는다:
//                     방의 빛은 거의 다 구운 간접광이라 어디에나 곱해도 어긋나지 않고, 텍스처 읽기가 하나 준다)
//   <이름>.nar.jpg    NAR — 빨강·초록 = 법선 맵의 xy (OpenGL 식), 파랑 = 거칠기. 4:4:4 로 누른다 (법선이 색차 줄이기에 뭉개지지 않게).
//                     법선 맵이 없으면 평평하게(128, 128), 거칠기가 없으면 0.85 로 채운다
//   <이름>.metal.jpg  금속성 (회색, 흰 곳이 금속) — 목록에 metal=… 을 적은 텍스처만. 게임이 색 그림의 알파(1 − 금속성)로 올린다
//   <이름>.mask.jpg   잎의 잘라 낼 모양 (회색, 흰 곳이 잎) — 목록에 mask 를 적은 소품 텍스처만. 원본의 색 그림(JPG)에는 알파가 없어
//                     같은 묶음의 ARM 그림(빨강 = AO, 초록 = 거칠기)에서 잎 자리를 가려낸다: 빨강 > 128 이고 초록 < 245
//                     (잎 밖의 바탕이 fern_02 는 (255, 255, 0), shrub_03 은 빨강 0 으로 칠해져 있다).
//                     mask 에 색 그림 자신을 적으면 그 밝기에서 가려낸다 (바탕이 검은 묶음 — 가장 밝은 채널이 34 를 넘는 곳이 잎)
//   법선·AO·거칠기의 원본은 목록에 적은 것(nor=·arm=·rough=·ao=)이 먼저고, 없으면 색 그림의 이름에서 찾는다:
//     Poly Haven  …_diff_…  → …_nor_gl_… · …_arm_… (없으면 …_rough_…)        ambientCG  …_Color.jpg → …_NormalGL.jpg · …_Roughness.jpg · …_AmbientOcclusion.jpg
//     3dtextures  …_basecolor.jpg → …_normal.jpg · …_roughness.jpg · …_ambientOcclusion.jpg
//   크기: 타일 1024², 소품 512², 무기 1024² (눈앞에 크게 보인다). 무기의 색에는 AO 를 곱하지 않는다 (손에 든 것의 밝기는 따로 맞춰 둔 값이다).
// 소품 모델 → content/props/<이름>.zkmodel (tools/gltfc.mjs 가 노드를 떼어 줄이고 옮긴다), 무기의 부품 → content/weapons/<이름>.zkmodel (줄이지 않는다)
//
// 사용: node game/tools/art/prepare.mjs [ffmpeg 경로] [--only tiles|props|weapons]   (ffmpeg 가 없으면 FFMPEG 환경 변수, 그다음 PATH 의 ffmpeg)
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { convertProps, convertWeapons } from '../gltfc.mjs'
import { parsePropList, parseTextureList, parseWeaponList } from '../packc.mjs'

const game = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const source = join(game, 'art-src')
const content = join(game, 'gameplay', 'content')
const args = process.argv.slice(2)
const only = args.includes('--only') ? args.splice(args.indexOf('--only'), 2)[1] : null
const ffmpeg = args[0] ?? process.env.FFMPEG ?? 'ffmpeg'

const TILE_SIDE = 1024
const PROP_SIDE = 512
// ffmpeg 의 JPEG 품질 (2 가 가장 좋고 31 이 가장 나쁘다) — 돌의 잔무늬가 뭉개지지 않는 선. NAR 은 조금 더 누른다 (팩의 반이 NAR 이다)
const QUALITY = 4
const NAR_QUALITY = 5
const LEAF = "255*gt(r(X,Y),128)*lt(g(X,Y),245)"
const DARK_GROUND = "255*gt(max(r(X,Y),max(g(X,Y),b(X,Y))),34)"
// AO 를 색에 곱하는 세기, 거칠기가 없는 텍스처의 거칠기
const AO_STRENGTH = 0.6
const PLAIN_ROUGHNESS = 0.85

/** ffmpeg 를 한 번 — inputs 는 [ffmpeg 인자…] 들, graph 는 [out] 으로 끝나는 필터 그래프 */
function run(inputs, graph, output, pixelFormat, quality = QUALITY) {
  execFileSync(ffmpeg, ['-v', 'error', '-y', ...inputs.flat(), '-filter_complex', graph, '-map', '[out]', '-frames:v', '1', '-map_metadata', '-1', '-pix_fmt', pixelFormat, '-q:v', String(quality), output], {
    stdio: ['ignore', 'inherit', 'inherit'],
  })
  return statSync(output).size
}

/** 색 그림의 이름에서 짝이 되는 그림을 찾는다 — 있으면 art-src 기준 경로, 없으면 null */
function sibling(path, kind) {
  const rules = {
    nor: [[/_diff_/, '_nor_gl_'], [/_Color\.jpg$/, '_NormalGL.jpg'], [/_basecolor\.(jpg|png)$/, '_normal.$1'], [/_COLOR\.jpg$/, '_NORM.jpg']],
    arm: [[/_diff_/, '_arm_']],
    rough: [[/_diff_/, '_rough_'], [/_Color\.jpg$/, '_Roughness.jpg'], [/_basecolor\.(jpg|png)$/, '_roughness.$1']],
    ao: [[/_Color\.jpg$/, '_AmbientOcclusion.jpg'], [/_basecolor\.(jpg|png)$/, '_ambientOcclusion.$1']],
  }
  for (const [from, to] of rules[kind]) {
    if (!from.test(path)) continue
    const found = path.replace(from, to)
    if (existsSync(join(source, found))) return found
  }
  return null
}

/** 텍스처 하나를 손질한다 — dir 에 <이름>.jpg·.nar.jpg(·.metal.jpg·.mask.jpg) 를 적고 적은 것들을 알린다 */
function prepareTexture(texture, dir, side, label, shaded = true) {
  const at = (path) => join(source, path)
  const arm = texture.arm ?? sibling(texture.source, 'arm')
  const nor = texture.nor ?? sibling(texture.source, 'nor')
  const rough = texture.rough ?? (arm ? null : sibling(texture.source, 'rough'))
  const ao = texture.ao ?? (arm ? null : sibling(texture.source, 'ao'))
  const scale = `scale=${side}:${side}:flags=area`
  const report = []

  // 색 — 고치고, AO 를 곱한다 (잎은 AO 그림의 바탕이 잎 밖을 칠해 두어 곱하지 않는다)
  let color = `[0:v]${scale}${texture.adjust ? `,eq=${texture.adjust}` : ''},format=gbrp`
  if (texture.mix) {
    const [rr, rg, rb, gr, gg, gb, br, bg, bb] = texture.mix
    const row = (a, b, c) => `'clip(${a}*r(X,Y)+${b}*g(X,Y)+${c}*b(X,Y),0,255)'`
    color += `,geq=r=${row(rr, rg, rb)}:g=${row(gr, gg, gb)}:b=${row(br, bg, bb)}`
  }
  const shade = texture.mask || !shaded ? null : (arm ?? ao)
  if (shade) {
    const lift = Math.round(255 * (1 - AO_STRENGTH))
    report.push(run([['-i', at(texture.source)], ['-i', at(shade)]], `${color}[c];[1:v]${scale},format=gbrp,extractplanes=r,lut=y='val*${AO_STRENGTH}+${lift}',format=gbrp[ao];[c][ao]blend=all_mode=multiply[out]`, join(dir, `${texture.name}.jpg`), 'yuvj420p'))
  } else report.push(run([['-i', at(texture.source)]], `${color}[out]`, join(dir, `${texture.name}.jpg`), 'yuvj420p'))

  // NAR — 법선의 빨강·초록과 거칠기
  const flat = (hex) => ['-f', 'lavfi', '-i', `color=c=0x${hex}:s=${side}x${side}:d=1`]
  const gray = (value) => Math.round(Math.min(Math.max(value, 0), 1) * 255).toString(16).padStart(2, '0').repeat(3)
  const roughSource = arm ?? (typeof rough === 'string' ? rough : null)
  const roughPlane = arm ? 'g' : 'r'
  const constant = typeof rough === 'number' ? rough : PLAIN_ROUGHNESS
  report.push(
    run(
      [nor ? ['-i', at(nor)] : flat('8080ff'), roughSource ? ['-i', at(roughSource)] : flat(gray(constant))],
      `[0:v]${scale},format=gbrp,extractplanes=r+g[nr][ng];[1:v]${scale},format=gbrp,extractplanes=${roughPlane}[ro];[ng][ro][nr]mergeplanes=0x001020:gbrp[out]`,
      join(dir, `${texture.name}.nar.jpg`),
      'yuvj444p',
      NAR_QUALITY,
    ),
  )
  if (texture.metal) {
    const inverted = texture.metal.startsWith('!')
    const path = texture.metal === 'arm' ? arm : texture.metal.replace(/^!/, '')
    if (!path) throw new Error(`${label}: metal=arm 인데 ARM 그림이 없다`)
    const plane = texture.metal === 'arm' ? 'b' : 'r'
    report.push(run([['-i', at(path)]], `[0:v]${scale},format=gbrp,extractplanes=${plane}${inverted ? ',negate' : ''}[out]`, join(dir, `${texture.name}.metal.jpg`), 'gray'))
  }
  if (texture.mask) {
    // 잎 자리 — ARM 그림에서 가려내거나, mask 에 색 그림 자신을 적었으면 그 밝기에서 (바탕이 검게 칠해진 묶음: nettle_plant, weed_plant_02)
    const leaf = texture.mask === texture.source ? DARK_GROUND : LEAF
    report.push(run([['-i', at(texture.mask)]], `[0:v]format=gbrp,geq=r='${leaf}':g='${leaf}':b='${leaf}',${scale},format=gray[out]`, join(dir, `${texture.name}.mask.jpg`), 'gray'))
  }
  console.log(`${label}/${texture.name}  ${report.join(' + ')} B  (법선 ${nor ? '있음' : '평평'}, 거칠기 ${roughSource ? '그림' : constant}, AO ${shade ? '곱함' : '없음'}${texture.metal ? ', 금속성' : ''}${texture.mask ? ', 잎' : ''})`)
}

if (!only || only === 'tiles') {
  const textureList = join(content, 'textures', 'textures.txt')
  for (const texture of parseTextureList(readFileSync(textureList, 'utf8'), textureList)) prepareTexture(texture, join(content, 'textures'), TILE_SIDE, 'textures')
}

if (!only || only === 'props') {
  const propList = join(content, 'props', 'props.txt')
  const propText = readFileSync(propList, 'utf8')
  mkdirSync(join(content, 'props', 'textures'), { recursive: true })
  for (const texture of parsePropList(propText, propList).textures) prepareTexture(texture, join(content, 'props', 'textures'), PROP_SIDE, 'props/textures')
  for (const prop of convertProps(propText, source, join(content, 'props'), propList)) console.log(`props/${prop.name}.zkmodel  삼각형 ${prop.triangles} → ${prop.kept}, ${prop.bytes} B`)
}

if (!only || only === 'weapons') {
  const weaponList = join(content, 'weapons', 'weapons.txt')
  const weaponText = readFileSync(weaponList, 'utf8')
  mkdirSync(join(content, 'weapons', 'textures'), { recursive: true })
  for (const texture of parseWeaponList(weaponText, weaponList).textures) prepareTexture(texture, join(content, 'weapons', 'textures'), TILE_SIDE, 'weapons/textures', false)
  for (const part of convertWeapons(weaponText, source, join(content, 'weapons'), weaponList)) console.log(`weapons/${part.name}.zkmodel  삼각형 ${part.triangles}, ${part.bytes} B`)
}
