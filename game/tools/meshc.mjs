// 메시 빌드 — 도형을 조립해 적은 글(.mesh.txt)을 엔진이 읽는 바이너리(.meshbin)로 옮긴다.
// 모델은 도형을 차례로 적어 쌓는다. 길이는 미터, x 오른쪽 · y 위 · z 뒤쪽(-z 가 앞)이다. 면마다 평평하다.
//
//   color <이름> #rrggbb [glow|glass]        색. glow 는 스스로 빛나는 색 (조명·안개를 덜 받는다 — 화면에서는 박자에 맞춰 밝아진다).
//                                            glass 는 색유리 — 화면에서는 제 색으로 고르게 빛나고(뒤에서 하늘빛이 비치는 유리), 라이트 베이커는 지나는 빛에 그 색을 곱한다
//   material <이름> <텍스처> <타일 m> [#rrggbb] [glass]  텍스처를 입힌 겉. 텍스처는 content/textures/textures.txt 의 이름, 타일은 무늬 한 번이 덮는 길이,
//                                            색은 텍스처에 곱하는 색 (없으면 흰색). glass 는 텍스처를 입힌 색유리 — 텍스처의 유리 조각(금속성이 0 인 곳)이 제 색으로 빛나고
//                                            납선(금속)은 빛을 받는다. 라이트 베이커는 지나는 빛에 그 자리의 텍스처 색을 곱한다 (바닥에 유리 조각의 무늬가 떨어진다)
//   solid on|off                             이 뒤의 도형이 부딪히는 것인지 (처음에는 off)
//   block  cx cy cz  sx sy sz                충돌 상자만 (그리지 않는다) — 몰딩·벽감·조각처럼 모양이 복잡한 곳은 도형을 solid off 로 그리고 부딪히는 것은 단순한 상자로 따로 둔다
//   lightmap <텍셀/m>                        이 뒤의 도형이 라이트맵에서 차지하는 밀도 (처음에는 10). 가까이서 볼 일이 없는 면(섬의 밑)은 낮춰 아틀라스와 굽는 시간을 아낀다
//   box    <겉> cx cy cz  sx sy sz           상자 — 가운데와 크기. <겉> 은 색이나 재질의 이름
//   cyl    <겉> cx cy cz  r h                기둥 — 가운데, 반지름, 높이.  [sides n] 각 수(기본 12)  [top r] 윗면 반지름(0 이면 뿔)  [axis x|y|z]
//   ramp   <겉> cx cy cz  sx sy sz           경사 — -z 쪽이 높다 (가운데와 크기)
//   stairs <겉> cx cy cz  sx sy sz  n        계단 n 단 — -z 쪽이 높다
//   oct    <겉> cx cy cz  rx ry rz           팔면체 (헤드론)
//   prism  <겉> cx cy cz  길이  n  p0 q0 … p(n-1) q(n-1)   기둥꼴 — 다각형(꼭짓점 n 개, 3 이상 32 이하. 오목해도 되지만 변끼리 엇갈리면 안 된다)을 축을 따라 길이만큼 민 것.
//                                            몰딩의 단면, 모따기한 기둥, 쐐기, 각진 아치의 홍예돌, 창살이 모두 이 도형이다.
//                                            [axis x|y|z] 미는 축(기본 y). 단면의 (p, q) 는 axis y 면 (x, z), axis x 면 (z, y), axis z 면 (x, y)
//                                            [miter a0 b0 a1 b1] 두 끝을 비스듬히 자른다 — 꼭짓점 (p, q) 의 끝이 −길이/2 + a0·p + b0·q 와 +길이/2 + a1·p + b1·q 에 온다
//                                            (모퉁이에서 만나는 두 몰딩의 맞댄 이음: 단면의 깊이만큼 끝을 늘이거나 줄인다)
//   도형 뒤에 붙이는 것:  rot <yaw> <pitch> <roll>  (도, y → x → z 축 차례)
//                         lm <면> <텍셀/m>  (box 만 — 그 면만 라이트맵 밀도를 따로 준다. 면은 +x -x +y -y +z -z, 돌리기 전의 도형 좌표. 볼 일이 없는 면(벽의 바깥, 바닥의 밑)을 성기게)
//   light x y z #rrggbb <세기> <거리> [<크기>]  빛 — 라이트 베이커가 굽는 점광원 (실행 중에는 셈하지 않는다). 세기는 1 m 떨어져 마주 보는 면이 받는 빛,
//                                            거리는 빛이 닿는 끝(거기서 0 으로 잦아든다), 크기는 광원의 반지름(기본 0.15 — 클수록 그림자가 부드럽다)
//   waypoint x y z                           경유점 — 적이 플레이어가 곧게 보이지 않을 때 따라 걷는 길의 점 (발의 자리). 많아야 32 개.
//                                            서로 곧게 걸어갈 수 있는 점끼리(충돌 상자를 NAV_MARGIN 만큼 부풀려 가로막는 것이 없으면) 이어지고,
//                                            점이 상자 속이거나 이음이 한 덩어리가 아니면 빌드가 멈춘다
//   prop <소품> x y z  yaw scale             소품(content/props/props.txt 의 이름)을 놓는다 — 밑면 가운데가 그 자리, yaw 는 도 (rot 의 yaw 와 같은 방향).
//                                            solid 인 소품은 놓인 모양을 감싸는 상자(옆으로 조금 줄인 것)가 충돌 상자로 나간다
//   # 뒤는 주석
//
// solid on 인 도형은 충돌 상자도 낸다 (축에 나란한 상자). 그래서 돌릴 때는 yaw 90 도 단위만 되고,
// 기둥은 감싸는 상자로, 경사는 낮은 단 여러 개로, 계단은 단마다의 상자로 나간다.
//
// 재질(material)을 하나라도 쓴 글은 '겉면 메시'로 나간다 — 정점에 텍스처 좌표 둘이 실린다:
//   uv   면의 평면에 펼친 자리 ÷ 타일 (늘어나지 않는다). 돌리지 않은 도형은 세계 좌표를 그대로 써서 맞닿은 도형끼리 무늬가 이어진다.
//        기둥의 옆면은 둘레의 길이 × 높이.
//   라이트맵  평평한 면마다 조각(차트) 하나 — 1 m 에 LIGHTMAP_DENSITY 텍셀(lightmap 명령으로 바꾼다)로 아틀라스에 선반으로 채운다. 조각 사이는 1 텍셀을 띄우고,
//        좌표는 조각의 가장자리 텍셀의 가운데까지만 간다 (이웃 조각이 번져 들지 않는다). 굽는 것은 라이트 베이커(app/lightbake)이고 여기서는 자리만 낸다.
//
// 사용: node meshc.mjs <in.mesh.txt> <out.meshbin> [--textures <textures.txt>] [--props <props.txt> <소품 모델 폴더>]
// 바이너리 (리틀 엔디언) — 겉면 메시는 빌드에서 줄여 적은 꼴('ZKSC' — 아래 encodeCompactMesh 의 머리말)로 나간다:
//   색 메시 (engine/spatial/static_mesh.cpp):  'ZKMS' · u32 정점 수 · u32 충돌 상자 수
//     · 정점마다 f32 × 10: 위치 xyz, 법선 xyz, 색 rgb, 빛남(0 또는 1) — 셋씩 삼각형, 밖에서 볼 때 반시계 방향
//     · 상자마다 f32 × 6: 최소 xyz, 최대 xyz
//   겉면 메시 (engine/spatial/surface_mesh.cpp):  'ZKSF' · u32 정점 수 · u32 충돌 상자 수 · u32 놓인 소품 수 · u32 라이트맵 너비 · u32 높이 · u32 빛 수 · u32 경유점 수
//     · 정점마다 f32 × 15: 위치 xyz, 법선 xyz, uv, 라이트맵 uv(0..1), 색 rgb, 빛남, 텍스처 층(색만 칠한 면은 -1, 색유리는 -2)
//     · 상자마다 f32 × 6 · 소품마다 u32 소품 번호, f32 × 5: 자리 xyz, yaw(라디안), 배율
//     · 빛마다 f32 × 8: 자리 xyz, 1 m 에서의 빛 rgb(선형), 닿는 거리, 광원의 반지름 · 경유점마다 f32 × 3 자리, u32 이어진 점들(비트 i 가 i 번 점)
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodeModel } from './gltfc.mjs'
import { parsePropList, parseTextureList } from './packc.mjs'

const FLOATS_PER_VERTEX = 10
const FLOATS_PER_SURFACE_VERTEX = 15
/** 경사를 충돌 상자로 낼 때 한 단의 높이 상한 (걸어 오를 수 있는 턱보다 낮아야 한다) */
const RAMP_STEP = 0.25
/** 라이트맵의 텍셀 밀도 (1 m 에 몇 텍셀) — lightmap 명령이 없을 때 */
export const LIGHTMAP_DENSITY = 10
const LIGHTMAP_MAX_SIDE = 4096
/** 부딪히는 소품의 충돌 상자 — 감싸는 상자를 옆으로 이만큼 줄인다 (둥근 바위의 빈 귀에 걸리지 않게) */
const PROP_SOLID_SHRINK = 0.8
/** 색만 칠한 면과 색유리의 텍스처 층 (engine/render/wgsl/surface.wgsl 이 같은 값으로 가른다) */
const LAYER_COLOR = -1
const LAYER_GLASS = -2
/** 텍스처를 입힌 색유리 — 정점 색의 넷째 칸 (engine/spatial/surface_mesh.hpp 의 GLASS_PANE) */
const GLASS_PANE = 2
const PRISM_MAX = 32
/** 경유점의 이음을 볼 때 충돌 상자를 옆으로 부풀리는 양 (적의 몸 반폭 0.6 m), 가로막는다고 보는 높이의 띠(발에서) — 걸어 오르는 턱(0.5 m)은 막지 않는다 */
export const NAV_MARGIN = 0.6
const NAV_BAND = [0.55, 1.6]
const NAV_MAX = 32

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const normalize = (v) => {
  const length = Math.hypot(...v)
  return length > 0 ? v.map((c) => c / length) : v
}

/** yaw(y) → pitch(x) → roll(z) 차례로 돌리는 함수 (도) */
function rotation([yaw, pitch, roll]) {
  const [cy, sy] = [Math.cos((yaw * Math.PI) / 180), Math.sin((yaw * Math.PI) / 180)]
  const [cx, sx] = [Math.cos((pitch * Math.PI) / 180), Math.sin((pitch * Math.PI) / 180)]
  const [cz, sz] = [Math.cos((roll * Math.PI) / 180), Math.sin((roll * Math.PI) / 180)]
  return ([x, y, z]) => {
    ;[x, y] = [x * cz - y * sz, x * sz + y * cz]
    ;[y, z] = [y * cx - z * sx, y * sx + z * cx]
    ;[x, z] = [x * cy + z * sy, -x * sy + z * cy]
    return [x, y, z]
  }
}

/**
 * 법선이 n 인 면에 펼치는 두 축 — 면을 밖에서 볼 때 u 가 오른쪽, v 가 아래쪽이다 (그림의 윗줄이 위로 온다).
 * 눕힌 면(바닥·천장)은 u 가 +x 다
 */
function planeAxes(n) {
  const across = cross([0, 1, 0], n)
  const u = Math.hypot(...across) < 1e-6 ? [1, 0, 0] : normalize(across)
  return [u, cross(u, n)]
}

/** 단순 다각형(2D 점들)을 삼각형으로 가른다 (귀 자르기) — 꼭짓점 번호 셋씩. 변끼리 엇갈리거나 넓이가 없으면 null */
function triangulate(points) {
  const cross2 = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
  let area = 0
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length]
    area += p[0] * q[1] - q[0] * p[1]
  })
  if (Math.abs(area) < 1e-12) return null
  // 반시계 차례로 돈다
  const ring = points.map((_, i) => i)
  if (area < 0) ring.reverse()
  const out = []
  while (ring.length > 3) {
    let cut = -1
    for (let i = 0; i < ring.length && cut < 0; i++) {
      const [a, b, c] = [ring[(i + ring.length - 1) % ring.length], ring[i], ring[(i + 1) % ring.length]]
      if (cross2(points[a], points[b], points[c]) <= 1e-12) continue
      // 다른 꼭짓점이 이 귀 안에 들면 자르지 못한다
      const inside = ring.some((k) => k !== a && k !== b && k !== c && cross2(points[a], points[b], points[k]) >= -1e-12 && cross2(points[b], points[c], points[k]) >= -1e-12 && cross2(points[c], points[a], points[k]) >= -1e-12)
      if (!inside) cut = i
    }
    if (cut < 0) return null
    out.push([ring[(cut + ring.length - 1) % ring.length], ring[cut], ring[(cut + 1) % ring.length]])
    ring.splice(cut, 1)
  }
  out.push([ring[0], ring[1], ring[2]])
  return out
}

/** 조각들의 크기(텍셀)를 선반에 채운다 — 조각마다 { x, y } 를 적고 아틀라스의 크기를 돌려준다 */
function packCharts(charts) {
  if (!charts.length) return { width: 0, height: 0 }
  const area = charts.reduce((sum, c) => sum + (c.width + 1) * (c.height + 1), 0)
  const widest = Math.max(...charts.map((c) => c.width + 1))
  let width = 64
  while (width < widest || width * width < area) width *= 2
  const order = [...charts].sort((a, b) => b.height - a.height || b.width - a.width)
  let [x, y, shelf] = [0, 0, 0]
  for (const chart of order) {
    if (x + chart.width > width) {
      x = 0
      y += shelf + 1
      shelf = 0
    }
    chart.x = x
    chart.y = y
    x += chart.width + 1
    shelf = Math.max(shelf, chart.height)
  }
  return { width, height: y + shelf }
}

/**
 * 글을 읽어 { colors, vertices(Float32Array), solids(상자 배열) } 로. 재질을 쓴 글이면 surface 가 붙는다:
 * { vertices(정점마다 15), lightmap { width, height }, charts(조각마다 텍셀 칸 { x, y, width, height }), chartOf(삼각형마다 조각 번호), placements }
 * library: { textures: 텍스처 이름들(차례가 층 번호), props: 소품 이름 → { index, solid, positions(Float32Array xyz) } }
 */
export function parseMeshText(text, name = 'model', library = {}) {
  const colors = new Map()
  const materials = new Map()
  /** 삼각형마다 { corners(세계), normal(세계), uvs, chart, flat(조각 평면의 자리, m), skin } */
  const triangles = []
  const charts = []
  const solids = []
  const placements = []
  const lights = []
  const waypoints = []
  let solid = false
  let density = LIGHTMAP_DENSITY

  text.split(/\r?\n/).forEach((raw, index) => {
    const fail = (message) => {
      throw new Error(`${name}:${index + 1}: ${message}`)
    }
    const words = raw.replace(/#(?![0-9a-fA-F]{6}\b).*$/, '').trim().split(/\s+/).filter(Boolean)
    if (!words.length) return
    const [command, ...rest] = words
    const rgb = (hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255)

    if (command === 'color') {
      const [colorName, hex, flag] = rest
      if (!colorName || !/^#[0-9a-fA-F]{6}$/.test(hex ?? '')) fail('color <이름> #rrggbb [glow|glass]')
      if (flag !== undefined && flag !== 'glow' && flag !== 'glass') fail(`모르는 색 속성 '${flag}'`)
      if (colors.has(colorName) || materials.has(colorName)) fail(`색 '${colorName}' 을 두 번 정했다`)
      colors.set(colorName, { layer: flag === 'glass' ? LAYER_GLASS : LAYER_COLOR, tile: 1, color: [...rgb(hex), flag ? 1 : 0] })
      return
    }
    if (command === 'material') {
      const [materialName, texture, tileText, ...options] = rest
      const glass = options.at(-1) === 'glass' ? Boolean(options.pop()) : false
      const [hex = '#ffffff', extra] = options
      const tile = Number(tileText)
      if (!materialName || !texture || !(tile > 0) || !/^#[0-9a-fA-F]{6}$/.test(hex) || extra !== undefined) fail('material <이름> <텍스처> <타일 m> [#rrggbb] [glass]')
      if (colors.has(materialName) || materials.has(materialName)) fail(`재질 '${materialName}' 을 두 번 정했다`)
      const layer = (library.textures ?? []).indexOf(texture)
      if (layer < 0) fail(`텍스처 목록에 없는 '${texture}'`)
      materials.set(materialName, { layer, tile, color: [...rgb(hex), glass ? GLASS_PANE : 0] })
      return
    }
    if (command === 'block') {
      const numbers = rest.map(Number)
      if (numbers.length !== 6 || numbers.some((v) => !Number.isFinite(v)) || numbers.slice(3).some((v) => !(v > 0))) fail('block cx cy cz sx sy sz')
      const round = (v) => Math.round(v * 1e5) / 1e5
      solids.push([0, 1, 2].map((axis) => round(numbers[axis] - numbers[axis + 3] / 2)).concat([0, 1, 2].map((axis) => round(numbers[axis] + numbers[axis + 3] / 2))))
      return
    }
    if (command === 'solid') {
      if (rest[0] !== 'on' && rest[0] !== 'off') fail('solid on|off')
      solid = rest[0] === 'on'
      return
    }
    if (command === 'lightmap') {
      density = Number(rest[0])
      if (rest.length !== 1 || !(density > 0 && density <= 64)) fail('lightmap <텍셀/m> (0 보다 크고 64 이하)')
      return
    }
    if (command === 'light') {
      const [x, y, z] = rest.slice(0, 3).map(Number)
      const hex = rest[3] ?? ''
      const [power, reach, size = 0.15] = rest.slice(4).map(Number)
      if (rest.length < 6 || rest.length > 7 || ![x, y, z].every(Number.isFinite) || !/^#[0-9a-fA-F]{6}$/.test(hex) || !(power > 0) || !(reach > 0) || !(size >= 0 && size < reach))
        fail('light x y z #rrggbb <세기> <거리> [<크기>]')
      lights.push({ position: [x, y, z], light: rgb(hex).map((c) => c ** 2.2 * power), reach, size })
      return
    }
    if (command === 'waypoint') {
      const position = rest.map(Number)
      if (position.length !== 3 || !position.every(Number.isFinite)) fail('waypoint x y z')
      if (waypoints.length >= NAV_MAX) fail(`경유점은 ${NAV_MAX} 개까지다`)
      waypoints.push(position)
      return
    }
    if (command === 'prop') {
      const prop = library.props?.get(rest[0]) ?? fail(`소품 목록에 없는 '${rest[0]}'`)
      const numbers = rest.slice(1).map(Number)
      if (numbers.length !== 5 || numbers.some((v) => !Number.isFinite(v)) || !(numbers[4] > 0)) fail('prop <소품> x y z yaw scale')
      const [x, y, z, yaw, scale] = numbers
      placements.push({ model: prop.index, position: [x, y, z], yaw: (yaw * Math.PI) / 180, scale })
      if (prop.solid) {
        // 놓인 모양을 감싸는 상자 — 옆으로 줄이고, 밑은 놓인 높이에서
        const turn = rotation([yaw, 0, 0])
        const [low, high] = [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]]
        for (let at = 0; at < prop.positions.length; at += 3) {
          const p = turn([prop.positions[at] * scale, prop.positions[at + 1] * scale, prop.positions[at + 2] * scale])
          for (const axis of [0, 1, 2]) {
            low[axis] = Math.min(low[axis], p[axis])
            high[axis] = Math.max(high[axis], p[axis])
          }
        }
        const round = (v) => Math.round(v * 1e5) / 1e5
        const side = (axis, end) => round([x, y, z][axis] + (low[axis] + high[axis]) / 2 + (end * (high[axis] - low[axis]) * PROP_SOLID_SHRINK) / 2)
        solids.push([side(0, -1), round(y), side(2, -1), side(0, 1), round(y + high[1] * PROP_SOLID_SHRINK), side(2, 1)])
      }
      return
    }

    const counts = { box: 6, cyl: 5, ramp: 6, stairs: 7, oct: 6, prism: 5 }
    if (!(command in counts)) fail(`모르는 명령 '${command}'`)
    if (command === 'prism') {
      // 가운데 셋, 길이, 꼭짓점 수 뒤로 단면의 점들이 온다
      const corners = Number(rest[5])
      if (!Number.isInteger(corners) || corners < 3 || corners > PRISM_MAX) fail(`prism 의 꼭짓점은 3 개 이상 ${PRISM_MAX} 개 이하다`)
      counts.prism = 5 + corners * 2
    }
    const material = materials.get(rest[0])
    const skin = material ?? colors.get(rest[0]) ?? fail(`정하지 않은 색 '${rest[0]}'`)
    const numbers = rest.slice(1, 1 + counts[command]).map(Number)
    if (numbers.length !== counts[command] || numbers.some((v) => !Number.isFinite(v))) fail(`${command} 에는 숫자 ${counts[command]} 개가 와야 한다`)
    // 뒤에 붙는 것들
    const options = { rot: [0, 0, 0], sides: 12, top: null, axis: 'y', lm: new Map(), miter: [0, 0, 0, 0] }
    for (let at = 1 + counts[command]; at < rest.length; ) {
      const key = rest[at++]
      const take = (count) => {
        const values = rest.slice(at, at + count).map(Number)
        if (values.length !== count || values.some((v) => !Number.isFinite(v))) fail(`${key} 에는 숫자 ${count} 개가 와야 한다`)
        at += count
        return values
      }
      if (key === 'rot') options.rot = take(3)
      else if (key === 'lm' && command === 'box') {
        const side = rest[at++]
        if (!['+x', '-x', '+y', '-y', '+z', '-z'].includes(side)) fail('lm <+x|-x|+y|-y|+z|-z> <텍셀/m>')
        const [value] = take(1)
        if (!(value > 0 && value <= 64)) fail('lm 의 밀도는 0 보다 크고 64 이하다')
        options.lm.set(side, value)
      }
      else if (key === 'sides' && command === 'cyl') [options.sides] = take(1)
      else if (key === 'top' && command === 'cyl') [options.top] = take(1)
      else if (key === 'miter' && command === 'prism') options.miter = take(4)
      else if (key === 'axis' && (command === 'cyl' || command === 'prism')) {
        options.axis = rest[at++]
        if (!['x', 'y', 'z'].includes(options.axis)) fail('axis x|y|z')
      } else fail(`${command} 에 붙일 수 없는 '${key}'`)
    }
    const center = numbers.slice(0, 3)
    const rotate = rotation(options.rot)
    const place = (p) => {
      const r = rotate(p)
      return [r[0] + center[0], r[1] + center[1], r[2] + center[2]]
    }

    /** 평평한 면 하나의 라이트맵 조각을 연다 — 그 면의 법선(도형 좌표) */
    const openChart = (normal, texels = density) => {
      charts.push({ axes: planeAxes(normal), density: texels })
      return charts.length - 1
    }
    /**
     * 삼각형 하나 (도형 좌표). outward 가 있으면 그쪽을 보게 감는 방향을 맞춘다. chart 가 없으면 이 삼각형만의 조각을 연다.
     * uvOf 는 꼭짓점의 무늬 자리(m)를 따로 주는 함수 — 없으면 면의 평면에 펼친다
     */
    const triangle = (a, b, c, outward, chart, uvOf) => {
      let corners = [a, b, c]
      let normal = normalize(cross(sub(b, a), sub(c, a)))
      if (outward && dot(normal, outward) < 0) {
        corners = [a, c, b]
        normal = normal.map((v) => -v)
      }
      const id = chart ?? openChart(normal)
      const [u, v] = planeAxes(normal)
      // 무늬는 돌리기 전의 자리에서 — 돌리지 않은 도형은 세계 좌표와 같다
      const spread = (p) => {
        const q = [p[0] + center[0], p[1] + center[1], p[2] + center[2]]
        return [dot(q, u), dot(q, v)]
      }
      const [cu, cv] = charts[id].axes
      triangles.push({
        corners: corners.map(place),
        normal: rotate(normal),
        uvs: corners.map((p) => (uvOf ?? spread)(p).map((m) => m / skin.tile)),
        chart: id,
        flat: corners.map((p) => [dot(p, cu), dot(p, cv)]),
        skin,
      })
    }
    /** 볼록한 도형의 면 — 가운데(inside)의 반대쪽을 본다 */
    const face = (inside, ...points) => {
      const middle = points.reduce((sum, p) => [sum[0] + p[0], sum[1] + p[1], sum[2] + p[2]], [0, 0, 0]).map((v) => v / points.length)
      const outward = sub(middle, inside)
      let normal = normalize(cross(sub(points[1], points[0]), sub(points[2], points[0])))
      if (dot(normal, outward) < 0) normal = normal.map((v) => -v)
      // 면마다 따로 준 밀도 (lm) — 축에 나란한 면만 이름이 있다
      const axis = normal.findIndex((v) => Math.abs(v) > 0.999)
      const chart = openChart(normal, axis < 0 ? density : (options.lm.get(`${normal[axis] > 0 ? '+' : '-'}${'xyz'[axis]}`) ?? density))
      for (let i = 1; i + 1 < points.length; i++) triangle(points[0], points[i], points[i + 1], outward, chart)
    }
    /** 가운데가 c, 크기가 s 인 상자 (도형 좌표) */
    const boxAt = (c, s) => {
      const [hx, hy, hz] = s.map((v) => v / 2)
      const corner = (x, y, z) => [c[0] + x * hx, c[1] + y * hy, c[2] + z * hz]
      face(c, corner(-1, -1, 1), corner(1, -1, 1), corner(1, 1, 1), corner(-1, 1, 1))
      face(c, corner(-1, -1, -1), corner(1, -1, -1), corner(1, 1, -1), corner(-1, 1, -1))
      face(c, corner(1, -1, -1), corner(1, -1, 1), corner(1, 1, 1), corner(1, 1, -1))
      face(c, corner(-1, -1, -1), corner(-1, -1, 1), corner(-1, 1, 1), corner(-1, 1, -1))
      face(c, corner(-1, 1, -1), corner(1, 1, -1), corner(1, 1, 1), corner(-1, 1, 1))
      face(c, corner(-1, -1, -1), corner(1, -1, -1), corner(1, -1, 1), corner(-1, -1, 1))
    }
    /** 충돌 상자 — 도형 좌표의 (가운데, 크기)를 세계의 축 상자로. 90 도 단위 yaw 만 받는다 */
    const collide = (c, s) => {
      if (!solid) return
      const [yaw, pitch, roll] = options.rot
      if (pitch !== 0 || roll !== 0 || yaw % 90 !== 0) fail('solid 인 도형은 yaw 90 도 단위로만 돌릴 수 있다')
      const corners = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => place([c[0] + (x * s[0]) / 2, c[1] + (y * s[1]) / 2, c[2] + (z * s[2]) / 2]))))
      const round = (v) => Math.round(v * 1e5) / 1e5
      solids.push([0, 1, 2].map((axis) => round(Math.min(...corners.map((p) => p[axis])))).concat([0, 1, 2].map((axis) => round(Math.max(...corners.map((p) => p[axis]))))))
    }

    if (command === 'box') {
      const size = numbers.slice(3)
      if (size.some((v) => !(v > 0))) fail('box 의 크기는 0 보다 커야 한다')
      boxAt([0, 0, 0], size)
      collide([0, 0, 0], size)
    } else if (command === 'cyl') {
      const [radius, height] = numbers.slice(3)
      const top = options.top ?? radius
      const sides = options.sides
      if (!(radius > 0 && height > 0 && top >= 0) || !Number.isInteger(sides) || sides < 3 || sides > 64) fail('cyl 의 반지름·높이는 0 보다 크고, sides 는 3 이상 64 이하다')
      // y 축 기둥으로 만든 뒤 축에 맞춰 눕힌다
      const lay = options.axis === 'y' ? (p) => p : options.axis === 'x' ? ([x, y, z]) => [y, -x, z] : ([x, y, z]) => [x, -z, y]
      const ring = (r, y) => Array.from({ length: sides }, (_, i) => lay([r * Math.cos((2 * Math.PI * i) / sides), y, r * Math.sin((2 * Math.PI * i) / sides)]))
      const low = ring(radius, -height / 2)
      const high = ring(top, height / 2)
      // 옆면의 무늬 — 둘레를 따라 간 길이 × 높이 (윗면이 좁아도 밑면의 둘레로 잰다)
      const arc = (2 * Math.PI * radius) / sides
      for (let i = 0; i < sides; i++) {
        const j = (i + 1) % sides
        const outward = lay([Math.cos((2 * Math.PI * (i + 0.5)) / sides), 0, Math.sin((2 * Math.PI * (i + 0.5)) / sides)])
        const wrap = new Map([[low[i], [-i * arc, height / 2]], [low[j], [-(i + 1) * arc, height / 2]], [high[i], [-i * arc, -height / 2]], [high[j], [-(i + 1) * arc, -height / 2]]])
        const uvOf = (p) => wrap.get(p)
        const normal = normalize(cross(sub(low[j], low[i]), sub(high[j], low[i])))
        const chart = openChart(dot(normal, outward) < 0 ? normal.map((v) => -v) : normal)
        triangle(low[i], low[j], high[j], outward, chart, uvOf)
        if (top > 0) triangle(low[i], high[j], high[i], outward, chart, uvOf)
      }
      face([0, 0, 0], ...low)
      if (top > 0) face([0, 0, 0], ...high)
      if (options.axis === 'y' && top === radius) {
        // 선 기둥·원판 — 원 안에 드는 띠 여럿으로 (감싸는 상자 하나로 내면 원 밖의 네 귀에도 서게 된다)
        const strips = Math.min(24, Math.max(3, Math.ceil(radius * 2)))
        for (let i = 0; i < strips; i++) {
          const [near, far] = [-radius + (2 * radius * i) / strips, -radius + (2 * radius * (i + 1)) / strips]
          const reach = Math.max(Math.abs(near), Math.abs(far))
          const half = Math.sqrt(Math.max(0, radius * radius - reach * reach))
          if (half > 0) collide([0, 0, (near + far) / 2], [2 * half, height, far - near])
        }
      } else {
        const widest = 2 * Math.max(radius, top)
        collide([0, 0, 0], options.axis === 'y' ? [widest, height, widest] : options.axis === 'x' ? [height, widest, widest] : [widest, widest, height])
      }
    } else if (command === 'ramp') {
      const [sx, sy, sz] = numbers.slice(3)
      if (!(sx > 0 && sy > 0 && sz > 0)) fail('ramp 의 크기는 0 보다 커야 한다')
      const [hx, hy, hz] = [sx / 2, sy / 2, sz / 2]
      const inside = [0, -hy / 2, -hz / 2]
      const [a, b, c, d] = [[-hx, -hy, hz], [hx, -hy, hz], [hx, -hy, -hz], [-hx, -hy, -hz]]
      const [e, f] = [[hx, hy, -hz], [-hx, hy, -hz]]
      face(inside, a, b, c, d)
      face(inside, d, c, e, f)
      face(inside, a, b, e, f)
      face(inside, b, c, e)
      face(inside, a, d, f)
      // 낮은 단 여러 개로 — 위로 갈수록 -z 쪽
      const steps = Math.max(1, Math.ceil(sy / RAMP_STEP))
      for (let i = 0; i < steps; i++) {
        const rise = ((i + 1) * sy) / steps
        collide([0, -hy + rise / 2, hz - ((i + 0.5) * sz) / steps], [sx, rise, sz / steps])
      }
    } else if (command === 'stairs') {
      const [sx, sy, sz, steps] = numbers.slice(3)
      if (!(sx > 0 && sy > 0 && sz > 0) || !Number.isInteger(steps) || steps < 1 || steps > 64) fail('stairs 의 크기는 0 보다 크고, 단 수는 1 이상 64 이하다')
      for (let i = 0; i < steps; i++) {
        const rise = ((i + 1) * sy) / steps
        const c = [0, -sy / 2 + rise / 2, sz / 2 - ((i + 0.5) * sz) / steps]
        boxAt(c, [sx, rise, sz / steps])
        collide(c, [sx, rise, sz / steps])
      }
    } else if (command === 'prism') {
      const length = numbers[3]
      const profile = Array.from({ length: numbers[4] }, (_, i) => [numbers[5 + i * 2], numbers[6 + i * 2]])
      const cuts = triangulate(profile)
      if (!(length > 0) || !cuts) fail('prism 의 길이는 0 보다 크고, 단면은 넓이가 있고 변끼리 엇갈리지 않아야 한다')
      const [a0, b0, a1, b1] = options.miter
      const lay = options.axis === 'y' ? ([p, q], along) => [p, along, q] : options.axis === 'x' ? ([p, q], along) => [along, q, p] : ([p, q], along) => [p, q, along]
      const low = profile.map((point) => lay(point, -length / 2 + a0 * point[0] + b0 * point[1]))
      const high = profile.map((point) => lay(point, length / 2 + a1 * point[0] + b1 * point[1]))
      if (profile.some((point, i) => !(dot(sub(high[i], low[i]), lay([0, 0], 1)) > 1e-9))) fail('prism 의 두 끝이 엇갈린다 (miter 가 길이보다 크다)')
      // 옆면 — 변마다 평평한 넷모(끝을 비스듬히 잘라도 평평하다). 밖은 단면에서 변의 바깥쪽
      let area = 0
      profile.forEach((p, i) => {
        const q = profile[(i + 1) % profile.length]
        area += p[0] * q[1] - q[0] * p[1]
      })
      profile.forEach((p, i) => {
        const j = (i + 1) % profile.length
        const q = profile[j]
        if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-9) return
        const turn = area > 0 ? [q[1] - p[1], p[0] - q[0]] : [p[1] - q[1], q[0] - p[0]]
        const outward = sub(lay(turn, 0), lay([0, 0], 0))
        const normal = normalize(cross(sub(low[j], low[i]), sub(high[i], low[i])))
        const chart = openChart(dot(normal, outward) < 0 ? normal.map((v) => -v) : normal)
        triangle(low[i], low[j], high[j], outward, chart)
        triangle(low[i], high[j], high[i], outward, chart)
      })
      // 두 끝 — 단면을 삼각형으로 갈라
      for (const [ring, outward] of [[low, lay([0, 0], -1)], [high, lay([0, 0], 1)]]) {
        let normal = normalize(cross(sub(ring[cuts[0][1]], ring[cuts[0][0]]), sub(ring[cuts[0][2]], ring[cuts[0][0]])))
        if (dot(normal, outward) < 0) normal = normal.map((v) => -v)
        const chart = openChart(normal)
        for (const [a, b, c] of cuts) triangle(ring[a], ring[b], ring[c], outward, chart)
      }
      // 부딪히는 것은 감싸는 상자
      const all = [...low, ...high]
      const [least, most] = [[0, 1, 2].map((axis) => Math.min(...all.map((p) => p[axis]))), [0, 1, 2].map((axis) => Math.max(...all.map((p) => p[axis])))]
      collide(least.map((v, axis) => (v + most[axis]) / 2), most.map((v, axis) => v - least[axis]))
    } else if (command === 'oct') {
      const [rx, ry, rz] = numbers.slice(3)
      if (!(rx > 0 && ry > 0 && rz > 0)) fail('oct 의 반지름은 0 보다 커야 한다')
      const [px, nx, py, ny, pz, nz] = [[rx, 0, 0], [-rx, 0, 0], [0, ry, 0], [0, -ry, 0], [0, 0, rz], [0, 0, -rz]]
      for (const y of [py, ny]) for (const [a, b] of [[px, pz], [pz, nx], [nx, nz], [nz, px]]) face([0, 0, 0], a, b, y)
      collide([0, 0, 0], [2 * rx, 2 * ry, 2 * rz])
    }
  })

  const vertices = new Float32Array(triangles.length * 3 * FLOATS_PER_VERTEX)
  triangles.forEach((t, i) => t.corners.forEach((corner, k) => vertices.set([...corner, ...t.normal, ...t.skin.color], (i * 3 + k) * FLOATS_PER_VERTEX)))
  const mesh = { colors, vertices, solids }
  if (!materials.size && !placements.length) {
    if (lights.length || waypoints.length) throw new Error(`${name}: light·waypoint 는 재질을 쓴 메시(방의 조각)에만 쓴다`)
    return mesh
  }
  const nav = linkWaypoints(waypoints, solids, name)

  // 라이트맵 — 조각마다 펼친 크기를 텍셀로 바꿔 아틀라스에 채운다
  for (const chart of charts) chart.low = [Infinity, Infinity]
  for (const chart of charts) chart.high = [-Infinity, -Infinity]
  for (const t of triangles)
    for (const [u, v] of t.flat) {
      const chart = charts[t.chart]
      chart.low = [Math.min(chart.low[0], u), Math.min(chart.low[1], v)]
      chart.high = [Math.max(chart.high[0], u), Math.max(chart.high[1], v)]
    }
  for (const chart of charts) {
    chart.width = Math.max(1, Math.ceil((chart.high[0] - chart.low[0]) * chart.density - 1e-6))
    chart.height = Math.max(1, Math.ceil((chart.high[1] - chart.low[1]) * chart.density - 1e-6))
  }
  const lightmap = packCharts(charts)
  if (lightmap.width > LIGHTMAP_MAX_SIDE || lightmap.height > LIGHTMAP_MAX_SIDE) throw new Error(`${name}: 라이트맵이 ${lightmap.width}×${lightmap.height} 로 너무 크다`)
  const surface = new Float32Array(triangles.length * 3 * FLOATS_PER_SURFACE_VERTEX)
  triangles.forEach((t, i) => {
    const chart = charts[t.chart]
    // 조각의 양 끝이 가장자리 텍셀의 가운데에 온다
    const along = (value, axis, size) => {
      const span = chart.high[axis] - chart.low[axis]
      return 0.5 + (span > 0 ? ((value - chart.low[axis]) / span) * (size - 1) : 0)
    }
    t.corners.forEach((corner, k) => {
      const lu = (chart.x + along(t.flat[k][0], 0, chart.width)) / lightmap.width
      const lv = (chart.y + along(t.flat[k][1], 1, chart.height)) / lightmap.height
      const uv = t.skin.layer < 0 ? [0, 0] : t.uvs[k]
      surface.set([...corner, ...t.normal, ...uv, lu, lv, ...t.skin.color, t.skin.layer], (i * 3 + k) * FLOATS_PER_SURFACE_VERTEX)
    })
  })
  mesh.surface = {
    vertices: surface,
    lightmap,
    charts: charts.map(({ x, y, width, height }) => ({ x, y, width, height })),
    chartOf: triangles.map((t) => t.chart),
    placements,
    lights,
    nav,
  }
  return mesh
}

/**
 * 경유점들을 잇는다 — 두 점 사이를 곧게 걸어갈 수 있으면(NAV_MARGIN 만큼 부풀린 충돌 상자 가운데 몸 높이의 띠에 걸친 것이 선분을 가로막지 않으면) 이어진다.
 * [{ position, links(비트) }] 를 돌려준다. 점이 상자 속이거나, 이음이 한 덩어리가 아니면 던진다
 */
export function linkWaypoints(waypoints, solids, name = 'model') {
  /** 선분 a→b 가 띠에 걸친 상자(부풀린 것)를 지나는가 — 위에서 본 2D 판정 */
  const blocked = (a, b) => {
    const [low, high] = [Math.min(a[1], b[1]) + NAV_BAND[0], Math.max(a[1], b[1]) + NAV_BAND[1]]
    return solids.some(([x0, y0, z0, x1, y1, z1]) => {
      if (y1 <= low || y0 >= high) return false
      let [enter, leave] = [0, 1]
      for (const [from, to, min, max] of [[a[0], b[0], x0 - NAV_MARGIN, x1 + NAV_MARGIN], [a[2], b[2], z0 - NAV_MARGIN, z1 + NAV_MARGIN]]) {
        const span = to - from
        if (Math.abs(span) < 1e-9) {
          if (from <= min || from >= max) return false
          continue
        }
        const [t0, t1] = [(min - from) / span, (max - from) / span]
        enter = Math.max(enter, Math.min(t0, t1))
        leave = Math.min(leave, Math.max(t0, t1))
      }
      return enter < leave
    })
  }
  waypoints.forEach((p, i) => {
    if (blocked(p, p)) throw new Error(`${name}: 경유점 ${i} (${p.join(', ')}) 이 충돌 상자 속(또는 ${NAV_MARGIN} m 안)이다`)
  })
  const nav = waypoints.map((position) => ({ position, links: 0 }))
  for (let i = 0; i < nav.length; i++)
    for (let j = i + 1; j < nav.length; j++)
      if (!blocked(nav[i].position, nav[j].position)) {
        nav[i].links |= 1 << j
        nav[j].links |= 1 << i
      }
  // 한 덩어리인가 — 0 번에서 닿는 점들
  let reached = nav.length ? 1 : 0
  for (let grew = true; grew; ) {
    grew = false
    nav.forEach((node, i) => {
      if ((reached >>> i) & 1 && (node.links & ~reached) !== 0) {
        reached |= node.links
        grew = true
      }
    })
  }
  const lost = nav.findIndex((_, i) => !((reached >>> i) & 1))
  if (lost >= 0) throw new Error(`${name}: 경유점 ${lost} (${nav[lost].position.join(', ')}) 이 0 번 점과 이어지지 않는다`)
  return nav.map(({ position, links }) => ({ position, links: links >>> 0 }))
}

/**
 * 겉면 메시를 줄여 적은 .meshbin ('ZKSC' — engine/spatial/surface_mesh.cpp 가 'ZKSF' 로 펴서 읽는다). 삼각형마다 같은 값(법선, 색·빛남·층)은 한 번만 적는다:
 *   머리 32 바이트는 'ZKSF' 와 같다 (글자만 'ZKSC') · u32 겉 수 · 겉마다 f32 × 5 (색 rgb, 빛남, 층)
 *   · 삼각형마다 f32 × 3 법선, u32 겉 번호, 꼭짓점 셋마다 [f32 × 3 자리, f32 × 2 uv, u16 × 2 라이트맵 좌표 × 65535] — 삼각형 하나가 88 바이트 ('ZKSF' 는 180)
 *   · 그 뒤(충돌 상자, 소품, 빛, 경유점)는 'ZKSF' 와 같다
 * 묻히는 방 메시가 이 꼴이다 — 몰딩과 창살로 삼각형이 늘어도 WASM 이 그만큼 커지지 않는다
 */
export function encodeCompactMesh(mesh) {
  const { surface } = mesh
  if (!surface) return encodeMesh(mesh)
  const plain = encodeMesh(mesh)
  const [stride, count] = [FLOATS_PER_SURFACE_VERTEX, surface.vertices.length / FLOATS_PER_SURFACE_VERTEX]
  const skins = new Map()
  const skinOf = (at) => {
    const key = [...surface.vertices.subarray(at + 10, at + 15)].join(',')
    if (!skins.has(key)) skins.set(key, skins.size)
    return skins.get(key)
  }
  const triangleSkins = Array.from({ length: count / 3 }, (_, i) => skinOf(i * 3 * stride))
  const tail = plain.subarray(32 + count * stride * 4)
  const bytes = new Uint8Array(32 + 4 + skins.size * 20 + (count / 3) * 88 + tail.length)
  const view = new DataView(bytes.buffer)
  bytes.set(plain.subarray(0, 32), 0)
  bytes.set(Buffer.from('ZKSC'), 0)
  view.setUint32(32, skins.size, true)
  let at = 36
  for (const key of skins.keys())
    for (const value of key.split(',')) {
      view.setFloat32(at, Number(value), true)
      at += 4
    }
  for (let i = 0; i < count / 3; i++) {
    const first = i * 3 * stride
    for (let c = 3; c < 6; c++, at += 4) view.setFloat32(at, surface.vertices[first + c], true)
    view.setUint32(at, triangleSkins[i], true)
    at += 4
    for (let k = 0; k < 3; k++) {
      const v = first + k * stride
      for (const c of [0, 1, 2, 6, 7]) {
        view.setFloat32(at, surface.vertices[v + c], true)
        at += 4
      }
      for (const c of [8, 9]) {
        view.setUint16(at, Math.round(Math.min(Math.max(surface.vertices[v + c], 0), 1) * 65535), true)
        at += 2
      }
    }
  }
  bytes.set(tail, at)
  return bytes
}

/** .meshbin 바이트 — 재질을 쓴 메시는 겉면 메시('ZKSF'), 아니면 색 메시('ZKMS') */
export function encodeMesh({ vertices, solids, surface }) {
  const floats = surface ? surface.vertices : vertices
  const header = surface ? 32 : 12
  const bytes = new Uint8Array(header + floats.length * 4 + solids.length * 24 + (surface ? surface.placements.length * 24 + surface.lights.length * 32 + surface.nav.length * 16 : 0))
  const view = new DataView(bytes.buffer)
  for (let i = 0; i < 4; i++) view.setUint8(i, (surface ? 'ZKSF' : 'ZKMS').charCodeAt(i))
  view.setUint32(4, floats.length / (surface ? FLOATS_PER_SURFACE_VERTEX : FLOATS_PER_VERTEX), true)
  view.setUint32(8, solids.length, true)
  if (surface) {
    view.setUint32(12, surface.placements.length, true)
    view.setUint32(16, surface.lightmap.width, true)
    view.setUint32(20, surface.lightmap.height, true)
    view.setUint32(24, surface.lights.length, true)
    view.setUint32(28, surface.nav.length, true)
  }
  let at = header
  const float = (value) => {
    view.setFloat32(at, value, true)
    at += 4
  }
  floats.forEach(float)
  solids.flat().forEach(float)
  for (const placement of surface?.placements ?? []) {
    view.setUint32(at, placement.model, true)
    at += 4
    ;[...placement.position, placement.yaw, placement.scale].forEach(float)
  }
  for (const light of surface?.lights ?? []) [...light.position, ...light.light, light.reach, light.size].forEach(float)
  for (const node of surface?.nav ?? []) {
    node.position.forEach(float)
    view.setUint32(at, node.links, true)
    at += 4
  }
  return bytes
}

/** 소품 목록(props.txt)과 모델 폴더에서 parseMeshText 의 library.props 를 만든다 */
export function loadPropLibrary(listPath, modelDir) {
  const props = new Map()
  parsePropList(readFileSync(listPath, 'utf8'), listPath).props.forEach((prop, index) => {
    const model = decodeModel(readFileSync(join(modelDir, `${prop.name}.zkmodel`)))
    const positions = new Float32Array(model.vertexCount * 3)
    for (let i = 0; i < model.vertexCount; i++) positions.set(model.vertices.subarray(i * 9, i * 9 + 3), i * 3)
    props.set(prop.name, { index, solid: prop.solid, positions })
  })
  return props
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [input, output, ...flags] = process.argv.slice(2)
  if (!input || !output) {
    console.error('usage: meshc.mjs <in.mesh.txt> <out.meshbin> [--textures <textures.txt>] [--props <props.txt> <model dir>]')
    process.exit(2)
  }
  try {
    const library = {}
    for (let at = 0; at < flags.length; ) {
      const flag = flags[at++]
      if (flag === '--textures') {
        const path = flags[at++]
        library.textures = parseTextureList(readFileSync(path, 'utf8'), path).map((texture) => texture.name)
      } else if (flag === '--props') {
        const path = flags[at++]
        library.props = loadPropLibrary(path, flags[at++] ?? dirname(path))
      } else throw new Error(`모르는 옵션 '${flag}'`)
    }
    writeFileSync(output, encodeCompactMesh(parseMeshText(readFileSync(input, 'utf8'), input, library)))
  } catch (error) {
    console.error(`meshc: ${error.message}`)
    process.exit(1)
  }
}
