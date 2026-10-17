// 지도 SVG 두 장(svg.zendikar-map 의 outerHTML)을 요소 단위로 맞춰, 다른 것이 페이즈 바탕(src/data/periods)이 바꾼 것뿐인지 본다 (명세 §11.4).
//   node scripts/qa/svgdiff.mjs <기준.svg> <견줄.svg> [--level n] [--boxes 상자.json] [--margin 20] [--list 20] [--json 결과.json] [--quiet]
// 기준은 같은 트리·같은 화면의 ?noperiod=1(또는 페이즈를 끈 화면), 견줄 것은 페이즈를 켠 화면이다.
//
// 맞추기 전에 두 가지를 먼저 푼다 (페이즈 바탕과 상관없거나, 줄 맞추기가 가르지 못하는 것).
//   - 그림 이름 묶음(g.figure-caption)의 style(--inv-px) — 화면을 뜨는 때의 시점 경쟁이라 두 쪽 모두에서 지운다
//   - 장소 표시 바꿈 — --level 이 있으면 그 단계의 표시 바꿈(src/data/periods 의 marks: 숨김이면 그 표시 g 를 통째로 지우고, 폐허면 kind-ruin·폐허 기호·
//     aria-label 끝의 ' — 이 무렵 폐허')을 기준 쪽에 그대로 해 두고 견준다. 그래서 표시는 '정확히 그렇게 바뀌었나'를 본다 — 숨긴 표시 안의
//     지역 상세 아이콘처럼 같은 꼴 요소가 이웃 표시의 것과 엇갈려 짝지어지는 일이 없다 (--raw-marks 면 하지 않는다)
// 요소를 문서 차례로 펴 Myers diff(LCS)로 맞추고, 맞지 않은 요소(지운 것·더한 것, 같은 자리에서 바뀐 것은 한 쌍)를 넷으로 가른다.
// 넷에 들지 않는 차이가 하나라도 있으면 실패다(종료 코드 1).
//   (a) period — g.period-*·.period-*·#period-* 안의 요소, 또는 바뀐 속성의 값이 모두 #period-* 를 가리키는 요소 (forest-washes 의 mask 처럼)
//   (b) box    — path 의 바뀐 하위 경로(M 마다 하나, scripts/childmaps/paths.mjs 의 pathBox)와 다른 도형의 상자가,
//                지도 단위로 옮겨(조상의 transform, 확대 묶음 g[data-tier] 는 빼고) 켠 항목의 상자 + margin 안에 드는 것.
//                흩뿌린 기호 묶음(g.terrain-scatter·g.fine-terrain — 산 띠·칸 g 는 같은 꼴이 이어져 줄 맞추기가 다른 띠끼리 짝짓는다) 안의 차이는
//                요소 단위로 갈리지 않으면 문서 전체에서 기호 클래스마다 하위 경로 다중집합을 견줘, 늘거나 준 하위 경로가 모두 켠 상자 + margin 안이면 (b)
//   (c) mark   — 상자 JSON 의 marks 자리(at)에 선 장소 표시(.marker 와 그 자리를 잡는 g, 그 안의 깊이와 상관없이 모든 자손) 안의 요소
//   (d) label  — 상자 JSON 의 labels 이름 라벨(과 그 지역 상세 아이콘)에서 class 의 on-water 만 바뀐 것, 또는 이름(text·지역 상세 아이콘)의
//                class 에 그 무렵 칠 위 표시(on-dust·on-chalk)만 붙은 것 — 그 자리가 켠 항목 상자 + margin 안일 때
// text 는 (a)·(c)·(d) 가 아니면 늘 실패다 — 모든 text 의 x·y 가 같아야 한다(명세 §6). 내용 없는 g 를 더하거나 지운 것도 실패다.
//
// 상자 JSON (나중에 src/data/periods 가 이 모양으로 낼 수 있게 — 지금은 손으로 쓴다). levels 가 있으면 --level n 의 것을 쓴다:
//   { "margin": 20,
//     "levels": { "5": { "boxes":  [{ "id": "halimar-drained", "x0": 983, "y0": 518, "x1": 1143, "y1": 682 }],
//                        "marks":  [{ "place": "sea-gate", "at": [1068.6, 704.2] }],
//                        "labels": [{ "place": "halimar", "text": "Halimar" }] } } }
//   levels 없이 { "boxes": […], "marks": […], "labels": […] } 도 된다. 상자 JSON 이 없으면 (a) 만 가른다.
//   src/data/periods/qa.ts 의 periodQaLevel 이 이 모양을 낸다.
// 결정성(같은 단계를 두 번 새로 불러 같은가)은 cmp 로 본다.
import fs from 'node:fs'
import { pathBox } from '../childmaps/paths.mjs'

const argv = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  if (i < 0) return fallback
  const v = argv[i + 1]
  argv.splice(i, 2)
  return v
}
const has = (name) => {
  const i = argv.indexOf(`--${name}`)
  if (i < 0) return false
  argv.splice(i, 1)
  return true
}
const LEVEL = opt('level', null)
const BOXES = opt('boxes', null)
const MARGIN_ARG = opt('margin', null)
const LIST = Number(opt('list', 20))
const JSON_OUT = opt('json', null)
const QUIET = has('quiet')
const RAW_MARKS = has('raw-marks')
const [fileA, fileB] = argv
if (!fileA || !fileB) {
  console.error('사용법: node scripts/qa/svgdiff.mjs <기준.svg> <견줄.svg> [--level n] [--boxes 상자.json] [--margin 20] [--list 20] [--json 결과.json]')
  process.exit(2)
}

// ---- 켠 항목 -------------------------------------------------------------------------------------------------
let spec = { boxes: [], marks: [], labels: [] }
let margin = 20
if (BOXES) {
  const raw = JSON.parse(fs.readFileSync(BOXES, 'utf8'))
  if (raw.margin !== undefined) margin = Number(raw.margin)
  if (raw.levels) {
    if (LEVEL === null) throw new Error('상자 JSON 에 levels 가 있으니 --level n 을 주어야 한다')
    const at = raw.levels[LEVEL]
    if (!at) console.warn(`상자 JSON 에 단계 ${LEVEL} 이 없다 — 켠 항목이 없는 것으로 본다`)
    spec = { boxes: at?.boxes ?? [], marks: at?.marks ?? [], labels: at?.labels ?? [] }
  } else spec = { boxes: raw.boxes ?? [], marks: raw.marks ?? [], labels: raw.labels ?? [] }
}
if (MARGIN_ARG !== null) margin = Number(MARGIN_ARG)
const labelTexts = new Set(spec.labels.map((l) => l.text))

// ---- 먼저 푸는 것 ----------------------------------------------------------------------------------------------
/** 그림 이름 묶음의 style(--inv-px) — 화면을 뜨는 때의 시점 경쟁 */
const dropCaptionStyle = (src) => src.replace(/(<g class="figure-caption") style="[^"]*"/g, '$1')

/** 여는 태그 자리(start)에서 그 요소가 끝나는 곳 (같은 깊이의 닫는 태그 뒤) */
function elementEnd(src, start) {
  const re = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s=/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g
  re.lastIndex = start
  let depth = 0
  for (let m; (m = re.exec(src)); ) {
    if (m[1]) depth--
    else if (!m[4]) depth++
    if (depth === 0) return re.lastIndex
  }
  throw new Error('svgdiff: 닫는 태그가 없다')
}

/**
 * 그 단계의 장소 표시 바꿈을 기준 쪽(페이즈를 끈 화면)에 그대로 한다 — 앱(ZendikarMap 의 markers)이 하는 것과 같은 글자 바꿈.
 * 숨김(kind null)은 표시 g 를 통째로 지우고, 바꿈(ruin)은 class 의 kind-*·기호 path·aria-label 끝을 바꾼다. 그 화면에 없는 표시(화면 밖·배율)는 그대로
 */
async function applyMarks(src, level) {
  const [{ periodAt }, { locations }, { MARKER_PATHS }] = await Promise.all([
    import('../../src/data/periods/index.ts'),
    import('../../src/data/locations.ts'),
    import('../../src/map/glyphs.ts'),
  ])
  const log = []
  for (const m of periodAt(level).marks) {
    const l = locations.find((x) => x.id === m.place)
    if (!l?.position) continue
    const head = `<g transform="translate(${l.position[0]} ${l.position[1]})"><g class="marker kind-${l.kind} `
    const at = src.indexOf(head)
    if (at < 0) {
      log.push(`${m.place}: 기준 화면에 없음`)
      continue
    }
    const end = elementEnd(src, at)
    let el = src.slice(at, end)
    if (m.kind === null) el = ''
    else
      el = el
        .replace(`class="marker kind-${l.kind} `, `class="marker kind-${m.kind} `)
        .replace(`<path class="glyph" d="${MARKER_PATHS[l.kind]}">`, `<path class="glyph" d="${MARKER_PATHS[m.kind]}">`)
        .replace(/(aria-label="[^"]*)"/, '$1 — 이 무렵 폐허"')
    src = src.slice(0, at) + el + src.slice(end)
    log.push(`${m.place}: ${m.kind ?? '숨김'}`)
  }
  return { src, log }
}

// ---- SVG 읽기 ------------------------------------------------------------------------------------------------
const TOKEN = /<!--[\s\S]*?-->|<\/([\w:-]+)\s*>|<([\w:-]+)((?:\s+[^\s=/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)/g
const ATTR = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g

/** outerHTML → 요소 목록(문서 차례). 요소마다 tag·attrs(차례 그대로)·바로 아래 글자·부모·자식 */
function parse(src) {
  const root = { tag: '#root', attrs: [], text: '', parent: null, children: [] }
  const list = []
  let cur = root
  for (const m of src.matchAll(TOKEN)) {
    if (m[0].startsWith('<!--')) continue
    if (m[1]) {
      // 닫는 태그 — 이름이 맞는 조상까지 올라간다
      let n = cur
      while (n !== root && n.tag !== m[1]) n = n.parent
      if (n !== root) cur = n.parent
      continue
    }
    if (m[2]) {
      const attrs = []
      for (const a of (m[3] ?? '').matchAll(ATTR)) attrs.push([a[1], a[2] ?? a[3] ?? a[4] ?? ''])
      const node = { tag: m[2], attrs, text: '', parent: cur, children: [], i: list.length }
      cur.children.push(node)
      list.push(node)
      if (!m[4]) cur = node
      continue
    }
    if (m[5] !== undefined && cur !== root) cur.text += m[5]
  }
  for (const n of list) prepare(n)
  // id → 요소 (강 이름의 textPath 가 가리키는 밑선)
  const byId = new Map(list.flatMap((n) => (attr(n, 'id') ? [[attr(n, 'id'), n]] : [])))
  for (const n of list) n.byId = byId
  return list
}

const attr = (n, k) => {
  for (const [a, v] of n.attrs) if (a === k) return v
  return undefined
}
const classes = (n) => new Set((attr(n, 'class') ?? '').split(/\s+/).filter(Boolean))

// 2×3 행렬 [a b c d e f] (x' = a x + c y + e, y' = b x + d y + f)
const IDENT = [1, 0, 0, 1, 0, 0]
const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
]
function parseTransform(t) {
  let m = IDENT
  if (!t) return m
  for (const f of t.matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const v = f[2].split(/[\s,]+/).filter(Boolean).map(Number)
    let n
    switch (f[1]) {
      case 'translate':
        n = [1, 0, 0, 1, v[0] ?? 0, v[1] ?? 0]
        break
      case 'scale':
        n = [v[0], 0, 0, v[1] ?? v[0], 0, 0]
        break
      case 'rotate': {
        const r = ((v[0] ?? 0) * Math.PI) / 180
        const c = Math.cos(r)
        const s = Math.sin(r)
        n = [c, s, -s, c, 0, 0]
        if (v.length >= 3) n = mul(mul([1, 0, 0, 1, v[1], v[2]], n), [1, 0, 0, 1, -v[1], -v[2]])
        break
      }
      case 'matrix':
        n = v.slice(0, 6)
        break
      case 'skewX':
        n = [1, 0, Math.tan((v[0] * Math.PI) / 180), 1, 0, 0]
        break
      case 'skewY':
        n = [1, Math.tan((v[0] * Math.PI) / 180), 0, 1, 0, 0]
        break
      default:
        throw new Error(`모르는 transform: ${f[0]}`)
    }
    m = mul(m, n)
  }
  return m
}
const translateOf = (n) => {
  const m = /^\s*translate\(\s*([-\d.e]+)[\s,]+([-\d.e]+)\s*\)\s*$/.exec(attr(n, 'transform') ?? '')
  return m ? [Number(m[1]), Number(m[2])] : null
}

/** 조상에서 물려받는 것 — 지도 단위 행렬, period 안인가, 표시 자리, area-labels 안인가 */
function prepare(n) {
  const p = n.parent.tag === '#root' ? null : n.parent
  const cls = classes(n)
  n.cls = cls
  // 확대 묶음(g[data-tier])의 transform 은 빼고 지도 단위로 — 그 밖(defs 의 mask·clipPath)은 이미 지도 단위다
  n.matrix = attr(n, 'data-tier') !== undefined ? IDENT : mul(p ? p.matrix : IDENT, parseTransform(attr(n, 'transform')))
  n.period = (p?.period ?? false) || [...cls].some((c) => c.startsWith('period-')) || (attr(n, 'id') ?? '').startsWith('period-')
  n.areaLabels = (p?.areaLabels ?? false) || cls.has('area-labels')
  // 흩뿌린 기호 묶음 안인가 — 산 띠·칸 g 가 같은 꼴로 이어지는 곳 (깊이와 상관없이)
  n.band = (p?.band ?? false) || cls.has('terrain-scatter') || cls.has('fine-terrain')
  // 장소 표시의 자리 — .marker 는 부모 g 의 translate, 그 부모 g 도 같은 자리 (표시를 숨기면 둘 다 빠진다)
  n.anchor = p?.anchor ?? null
  if (cls.has('marker') && p) {
    const t = translateOf(p)
    if (t) {
      n.anchor = t
      p.markerAnchor = t
    }
  }
}

// ---- 맞추기 (Myers) ---------------------------------------------------------------------------------------------
const sigOf = (n) => `${n.tag}\u0001${n.attrs.map(([k, v]) => `${k}=${v}`).join('\u0002')}\u0001${n.text}`

/** a·b(정수 배열)의 최단 편집 — [['=', i, j] | ['-', i] | ['+', j]] */
function myers(a, b, limit = 6000) {
  const ops = []
  let s = 0
  while (s < a.length && s < b.length && a[s] === b[s]) s++
  let ea = a.length
  let eb = b.length
  while (ea > s && eb > s && a[ea - 1] === b[eb - 1]) {
    ea--
    eb--
  }
  for (let i = 0; i < s; i++) ops.push(['=', i, i])
  const A = a.slice(s, ea)
  const B = b.slice(s, eb)
  const N = A.length
  const M = B.length
  const MAX = N + M
  const off = MAX + 1
  const V = new Int32Array(2 * MAX + 3)
  const trace = []
  let done = N === 0 && M === 0
  for (let d = 0; d <= MAX && !done; d++) {
    if (d > limit) throw new Error(`차이가 너무 많다 (편집 거리 > ${limit}) — 같은 화면을 견준 것이 맞는가`)
    trace.push(V.slice(off - d - 1, off + d + 2))
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && V[off + k - 1] < V[off + k + 1]) ? V[off + k + 1] : V[off + k - 1] + 1
      let y = x - k
      while (x < N && y < M && A[x] === B[y]) {
        x++
        y++
      }
      V[off + k] = x
      if (x >= N && y >= M) {
        done = true
        break
      }
    }
  }
  const mid = []
  let x = N
  let y = M
  for (let d = trace.length - 1; d > 0; d--) {
    const snap = trace[d]
    const get = (k) => snap[k + d + 1]
    const k = x - y
    const pk = k === -d || (k !== d && get(k - 1) < get(k + 1)) ? k + 1 : k - 1
    const px = get(pk)
    const py = px - pk
    while (x > px && y > py) mid.push(['=', --x, --y])
    if (x === px) mid.push(['+', --y])
    else mid.push(['-', --x])
  }
  while (x > 0 && y > 0) mid.push(['=', --x, --y])
  for (const o of mid.reverse()) ops.push(o[0] === '=' ? ['=', o[1] + s, o[2] + s] : o[0] === '-' ? ['-', o[1] + s] : ['+', o[1] + s])
  for (let i = 0; i < a.length - ea; i++) ops.push(['=', ea + i, eb + i])
  return ops
}

// ---- 가르기 -------------------------------------------------------------------------------------------------------
const nearMark = (p) => p && spec.marks.find((m) => Math.abs(m.at[0] - p[0]) < 0.6 && Math.abs(m.at[1] - p[1]) < 0.6)
const markOf = (n) => nearMark(n.anchor) ?? nearMark(n.markerAnchor)
const boxOk = (b) =>
  spec.boxes.find((x) => b.x0 >= x.x0 - margin && b.y0 >= x.y0 - margin && b.x1 <= x.x1 + margin && b.y1 <= x.y1 + margin)
/** 지역 상자를 행렬로 옮긴 상자 */
function mapBox(m, b) {
  const pts = [
    [b.x0, b.y0],
    [b.x1, b.y0],
    [b.x0, b.y1],
    [b.x1, b.y1],
  ].map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]])
  return {
    x0: Math.min(...pts.map((p) => p[0])),
    y0: Math.min(...pts.map((p) => p[1])),
    x1: Math.max(...pts.map((p) => p[0])),
    y1: Math.max(...pts.map((p) => p[1])),
  }
}
const subpaths = (d) => (d ?? '').split(/(?=M)/).map((s) => s.trim()).filter(Boolean)
const num = (n, k) => Number(attr(n, k) ?? 0)
/** path 가 아닌 도형의 지역 상자 — 도형이 아니면 null */
function shapeBox(n) {
  switch (n.tag) {
    case 'circle': {
      const r = num(n, 'r')
      return { x0: num(n, 'cx') - r, y0: num(n, 'cy') - r, x1: num(n, 'cx') + r, y1: num(n, 'cy') + r }
    }
    case 'ellipse': {
      const rx = num(n, 'rx')
      const ry = num(n, 'ry')
      return { x0: num(n, 'cx') - rx, y0: num(n, 'cy') - ry, x1: num(n, 'cx') + rx, y1: num(n, 'cy') + ry }
    }
    case 'rect':
    case 'image':
    case 'use':
      return { x0: num(n, 'x'), y0: num(n, 'y'), x1: num(n, 'x') + num(n, 'width'), y1: num(n, 'y') + num(n, 'height') }
    case 'line':
      return {
        x0: Math.min(num(n, 'x1'), num(n, 'x2')),
        y0: Math.min(num(n, 'y1'), num(n, 'y2')),
        x1: Math.max(num(n, 'x1'), num(n, 'x2')),
        y1: Math.max(num(n, 'y1'), num(n, 'y2')),
      }
    case 'polygon':
    case 'polyline': {
      const v = (attr(n, 'points') ?? '').split(/[\s,]+/).filter(Boolean).map(Number)
      const xs = v.filter((_, i) => i % 2 === 0)
      const ys = v.filter((_, i) => i % 2 === 1)
      return xs.length ? { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) } : null
    }
    default:
      return null
  }
}
const GEOM_ATTRS = new Set(['d', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'x1', 'x2', 'y1', 'y2', 'points'])
const TEXT_TAGS = new Set(['text', 'tspan', 'textPath'])
const fmtBox = (b) => `(${b.x0.toFixed(1)},${b.y0.toFixed(1)})–(${b.x1.toFixed(1)},${b.y1.toFixed(1)})`

/** 하위 경로 묶음이 모두 켠 상자 안인가 — 아니면 그 밖의 첫 상자 */
function subpathsOk(n, list) {
  for (const sp of list) {
    const b = pathBox(sp)
    if (!Number.isFinite(b.x0)) continue
    const mb = mapBox(n.matrix, b)
    if (!boxOk(mb)) return { ok: false, why: `하위 경로 상자 ${fmtBox(mb)} 가 켠 항목 상자 밖`, box: mb }
  }
  return { ok: true }
}
/** 요소 하나의 도형이 모두 켠 상자 안인가 (지우거나 더한 요소) */
function geometryOk(n) {
  if (n.tag === 'path') return subpathsOk(n, subpaths(attr(n, 'd')))
  const b = shapeBox(n)
  if (!b) return null
  const mb = mapBox(n.matrix, b)
  return boxOk(mb) ? { ok: true } : { ok: false, why: `상자 ${fmtBox(mb)} 가 켠 항목 상자 밖`, box: mb }
}
const refsPeriod = (v) => v !== undefined && v.includes('#period-')
/** 그 무렵 칠 위 이름의 class (ZendikarMap 의 labelWash) */
const WASH_CLASSES = new Set(['on-dust', 'on-chalk'])
/**
 * 이름의 자리 (지도 단위) — 장소 표시 안이면 그 표시 자리, 물결 밑선을 따라 쓴 강 이름(textPath)이면 그 밑선 상자의 가운데,
 * 아니면 x·y 를 조상 transform 으로 옮긴 곳 (화면 크기 고정 이름은 그 기준점 둘레다)
 */
const labelAt = (n) => {
  if (n.anchor) return n.anchor
  const tp = n.children.find((c) => c.tag === 'textPath')
  const ref = tp && (attr(tp, 'href') ?? attr(tp, 'xlink:href'))
  const base = ref?.startsWith('#') ? n.byId?.get(ref.slice(1)) : undefined
  if (base) {
    const b = mapBox(base.matrix, pathBox(attr(base, 'd') ?? ''))
    return [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2]
  }
  const x = num(n, 'x')
  const y = num(n, 'y')
  const m = n.matrix
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
}
const labelKeyOf = (n) => {
  if (TEXT_TAGS.has(n.tag)) return n.text
  const title = n.children.find((c) => c.tag === 'title') ?? n.children.flatMap((c) => c.children).find((c) => c.tag === 'title')
  return title ? title.text.split(' — ')[0] : null
}

/** 지우거나 더한 요소 하나 — side 의 다른 요소들(같은 쪽 차이 집합)을 보고 */
function classifyOne(n, inDiff) {
  if (n.period) return { cat: 'a' }
  if (n.attrs.some(([, v]) => refsPeriod(v))) return { cat: 'a' }
  if (markOf(n)) return { cat: 'c' }
  if (TEXT_TAGS.has(n.tag)) return { cat: null, why: `text "${n.text.slice(0, 40)}" (${attr(n, 'x')},${attr(n, 'y')}) 가 생기거나 사라짐` }
  const g = geometryOk(n)
  if (g) return g.ok ? { cat: 'b' } : { cat: null, why: g.why }
  // 도형이 없는 요소(g·title·defs…) — 자손이 모두 같은 쪽 차이이고 모두 갈렸으면 그 갈래
  const desc = []
  const walk = (x) => {
    for (const c of x.children) {
      desc.push(c)
      walk(c)
    }
  }
  walk(n)
  if (!desc.length) return { cat: null, why: `내용 없는 <${n.tag}> 가 생기거나 사라짐` }
  if (desc.some((c) => !inDiff.has(c))) return { cat: null, why: `<${n.tag}> 가 생기거나 사라졌는데 그 안의 요소는 그대로` }
  let cat = null
  for (const c of desc) {
    const r = classifyOne(c, inDiff)
    if (!r.cat) return { cat: null, why: `<${n.tag}> 안: ${r.why}` }
    cat = cat ?? r.cat
  }
  return { cat }
}

/** 같은 자리에서 바뀐 한 쌍 */
function classifyPair(a, b) {
  if (a.period || b.period) return { cat: 'a' }
  const keys = new Set([...a.attrs.map(([k]) => k), ...b.attrs.map(([k]) => k)])
  const changed = [...keys].filter((k) => attr(a, k) !== attr(b, k))
  const textChanged = a.text !== b.text
  if (!textChanged && changed.length && changed.every((k) => refsPeriod(attr(a, k)) || refsPeriod(attr(b, k)))) return { cat: 'a' }
  if (markOf(a) || markOf(b)) return { cat: 'c' }
  if (!textChanged && changed.length === 1 && changed[0] === 'class') {
    const ca = classes(a)
    const cb = classes(b)
    const delta = [...ca].filter((c) => !cb.has(c)).concat([...cb].filter((c) => !ca.has(c)))
    if (delta.length && delta.every((c) => c === 'on-water') && (a.areaLabels || TEXT_TAGS.has(a.tag)) && labelTexts.has(labelKeyOf(a) ?? ''))
      return { cat: 'd' }
    // 그 무렵 칠 위의 이름 — 테두리만 칠 빛으로 (글자·자리는 그대로). 이름 자리가 켠 항목 상자 안이어야 한다
    if (delta.length && delta.every((c) => WASH_CLASSES.has(c)) && (TEXT_TAGS.has(a.tag) || ca.has('child-map-mark') || cb.has('child-map-mark'))) {
      const at = labelAt(b)
      if (boxOk({ x0: at[0], y0: at[1], x1: at[0], y1: at[1] })) return { cat: 'd' }
      return { cat: null, why: `이름 class 에 ${delta.join(',')} 가 붙었는데 자리 (${at[0].toFixed(1)},${at[1].toFixed(1)}) 가 켠 항목 상자 밖` }
    }
  }
  if (TEXT_TAGS.has(a.tag)) return { cat: null, why: `text "${a.text.slice(0, 40)}" 가 바뀜 (${changed.join(',') || '글자'})` }
  if (textChanged) return { cat: null, why: `<${a.tag}> 의 글자가 바뀜` }
  if (!changed.every((k) => GEOM_ATTRS.has(k))) return { cat: null, why: `속성 ${changed.filter((k) => !GEOM_ATTRS.has(k)).join(',')} 가 바뀜` }
  if (a.tag === 'path') {
    // 하위 경로를 여럿 모은 칸 path — 바뀐 하위 경로만 본다
    const count = new Map()
    for (const sp of subpaths(attr(a, 'd'))) count.set(sp, (count.get(sp) ?? 0) + 1)
    const added = []
    for (const sp of subpaths(attr(b, 'd'))) {
      const c = count.get(sp) ?? 0
      if (c > 0) count.set(sp, c - 1)
      else added.push(sp)
    }
    const removed = [...count.entries()].flatMap(([sp, c]) => Array(c).fill(sp))
    const r1 = subpathsOk(a, removed)
    if (!r1.ok) return { cat: null, why: `뺀 ${r1.why}` }
    const r2 = subpathsOk(b, added)
    if (!r2.ok) return { cat: null, why: `더한 ${r2.why}` }
    return { cat: 'b', removed: removed.length, added: added.length }
  }
  const ga = geometryOk(a)
  const gb = geometryOk(b)
  if (ga?.ok && gb?.ok) return { cat: 'b' }
  return { cat: null, why: ga && !ga.ok ? ga.why : gb ? gb.why : `<${a.tag}> 가 바뀜` }
}

// ---- 돌리기 -------------------------------------------------------------------------------------------------------
const rawA = fs.readFileSync(fileA, 'utf8')
const rawB = fs.readFileSync(fileB, 'utf8')
let srcA = dropCaptionStyle(rawA)
const srcB = dropCaptionStyle(rawB)
let markLog = []
if (LEVEL !== null && !RAW_MARKS) ({ src: srcA, log: markLog } = await applyMarks(srcA, Number(LEVEL)))
const A = parse(srcA)
const B = parse(srcB)
const ids = new Map()
const idOf = (s) => {
  let v = ids.get(s)
  if (v === undefined) ids.set(s, (v = ids.size))
  return v
}
const ops = myers(
  A.map((n) => idOf(sigOf(n))),
  B.map((n) => idOf(sigOf(n))),
)

// 이어진 '-'·'+' 무리마다 같은 자리에서 바뀐 요소를 차례로 짝짓는다 — 먼저 tag·class 가 같은 것끼리,
// 남은 것은 class 만 다르고 나머지 속성·글자가 같은 것끼리 (라벨의 on-water, 표시의 kind-* 처럼 class 만 바뀐 요소)
const restOf = (n) => `${n.tag}\u0001${n.attrs.filter(([k]) => k !== 'class').map(([k, v]) => `${k}=${v}`).join('\u0002')}\u0001${n.text}`
const pairs = []
const dels = []
const inss = []
let same = 0
for (let i = 0; i < ops.length; ) {
  if (ops[i][0] === '=') {
    same++
    i++
    continue
  }
  const hd = []
  const hi = []
  while (i < ops.length && ops[i][0] !== '=') {
    if (ops[i][0] === '-') hd.push(A[ops[i][1]])
    else hi.push(B[ops[i][1]])
    i++
  }
  const used = new Set()
  const left = []
  for (const a of hd) {
    const k = `${a.tag}|${attr(a, 'class') ?? ''}`
    const b = hi.find((x) => !used.has(x) && `${x.tag}|${attr(x, 'class') ?? ''}` === k)
    if (b) {
      used.add(b)
      pairs.push([a, b])
    } else left.push(a)
  }
  for (const a of left) {
    const k = restOf(a)
    const b = hi.find((x) => !used.has(x) && restOf(x) === k)
    if (b) {
      used.add(b)
      pairs.push([a, b])
    } else dels.push(a)
  }
  for (const b of hi) if (!used.has(b)) inss.push(b)
}
const delSet = new Set(dels)
const insSet = new Set(inss)
const counts = { a: 0, b: 0, c: 0, d: 0 }
const fails = []
const describe = (n) => {
  const chain = []
  for (let x = n; x && x.tag !== '#root' && chain.length < 4; x = x.parent) {
    const c = attr(x, 'class')
    chain.unshift(x.tag + (c ? '.' + c.trim().split(/\s+/).join('.') : ''))
  }
  return `#${n.i} ${chain.join(' > ')}`
}
let subRemoved = 0
let subAdded = 0
for (const [a, b] of pairs) {
  const r = classifyPair(a, b)
  if (r.cat) {
    counts[r.cat]++
    subRemoved += r.removed ?? 0
    subAdded += r.added ?? 0
  } else fails.push({ kind: '~', where: describe(b), why: r.why, box: r.box, node: b })
}
for (const n of dels) {
  const r = classifyOne(n, delSet)
  if (r.cat) counts[r.cat]++
  else fails.push({ kind: '-', where: describe(n), why: r.why, box: r.box, node: n })
}
for (const n of inss) {
  const r = classifyOne(n, insSet)
  if (r.cat) counts[r.cat]++
  else fails.push({ kind: '+', where: describe(n), why: r.why, box: r.box, node: n })
}

// 흩뿌린 기호 묶음 안의 남은 실패 — 산 띠에 봉우리를 더하거나 빼면 같은 꼴의 g·path 가 이어져 줄 맞추기가 다른 띠끼리 짝짓는다.
// 그 실패만 남았으면 문서 전체에서 기호 클래스마다 하위 경로 다중집합을 견주고, 늘거나 준 하위 경로가 모두 켠 상자 + margin 안이면 (b) 로 친다
const BAND_CLASSES = ['mtn-fill', 'mtn-hatch', 'mtn-ink', 'crystal-fill', 'crystal-hatch', 'crystal-ink', 'tree-crown', 'tree-ink', 'marsh', 'tundra', 'canyons', 'ice', 'lava', 'frost']
function bandSubpaths(list) {
  const out = new Map()
  for (const n of list) {
    if (n.tag !== 'path' || !n.band) continue
    const cls = BAND_CLASSES.find((c) => n.cls.has(c))
    if (!cls) continue
    for (const sp of subpaths(attr(n, 'd'))) {
      const key = `${cls}|${n.matrix.join(',')}|${sp}`
      const e = out.get(key)
      if (e) e.count++
      else out.set(key, { count: 1, cls, sp, n })
    }
  }
  return out
}
const bandFails = fails.filter((f) => f.node.band)
let bandMoved = 0
const bandResidual = []
if (bandFails.length) {
  const SA = bandSubpaths(A)
  const SB = bandSubpaths(B)
  const diffs = []
  for (const [k, e] of SA) if (e.count > (SB.get(k)?.count ?? 0)) diffs.push({ ...e, sign: '-', d: e.count - (SB.get(k)?.count ?? 0) })
  for (const [k, e] of SB) if (e.count > (SA.get(k)?.count ?? 0)) diffs.push({ ...e, sign: '+', d: e.count - (SA.get(k)?.count ?? 0) })
  bandMoved = diffs.length
  for (const x of diffs) {
    const r = subpathsOk(x.n, [x.sp])
    if (!r.ok) bandResidual.push({ kind: x.sign, where: describe(x.n), why: `하위 경로 ${x.sign}${x.d} ${x.cls}: ${r.why}`, box: r.box, node: x.n })
  }
  // 묶음 안의 요소 단위 실패는 띠가 엇갈려 짝지어진 것이라, 묶음 안은 하위 경로 다중집합으로만 가른다 — 모두 켠 상자 안이면 (b),
  // 아니면 상자 밖으로 늘거나 준 하위 경로만 실패로 적는다
  for (const f of bandFails) fails.splice(fails.indexOf(f), 1)
  if (!bandResidual.length) counts.b += bandFails.length
  else fails.push(...bandResidual)
}

const name = (f) => f.split('/').pop()
const total = pairs.length + dels.length + inss.length
const identical = rawA === rawB
if (!QUIET || fails.length) {
  console.log(
    `${name(fileA)} ↔ ${name(fileB)}${LEVEL !== null ? ` (단계 ${LEVEL})` : ''}: 요소 ${A.length} ↔ ${B.length}, 같은 ${same}` +
      (identical ? ' — 바이트가 같다' : `, 바뀐 ${pairs.length}·지운 ${dels.length}·더한 ${inss.length}`),
  )
  if (markLog.length) console.log(`  표시 바꿈(기준 쪽에 먼저): ${markLog.join(' · ')}`)
  if (total)
    console.log(
      `  (a) period ${counts.a}  (b) box ${counts.b}${subRemoved + subAdded ? ` [하위 경로 -${subRemoved} +${subAdded}]` : ''}${bandFails.length ? ` [흩뿌린 기호 묶음 ${bandFails.length} — 하위 경로 다중집합 차이 ${bandMoved}, 상자 밖 ${bandResidual.length}]` : ''}  (c) mark ${counts.c}  (d) label ${counts.d}  — 분류 밖 ${fails.length}`,
    )
  if (!BOXES && fails.length) console.log('  (상자 JSON 이 없어 (b)·(c)·(d) 는 가르지 않았다)')
  for (const f of fails.slice(0, LIST)) console.log(`  ✗ ${f.kind} ${f.where}: ${f.why}`)
  if (fails.length > LIST) console.log(`  … ${fails.length - LIST}개 더`)
}
if (JSON_OUT)
  fs.writeFileSync(
    JSON_OUT,
    JSON.stringify(
      {
        a: fileA,
        b: fileB,
        level: LEVEL,
        margin,
        marks: markLog,
        elements: [A.length, B.length],
        same,
        changed: pairs.length,
        removed: dels.length,
        added: inss.length,
        counts,
        band: { fails: bandFails.length, subpathDiffs: bandMoved, outside: bandResidual.length },
        fails: fails.map((f) => ({ kind: f.kind, where: f.where, why: f.why, box: f.box })),
      },
      null,
      1,
    ),
  )
process.exit(fails.length ? 1 : 0)
